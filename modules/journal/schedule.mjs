import {visibleByTags} from './notebook.mjs';
export const SLOT_COUNT=36, SLOT_HEIGHT=26;
export const scheduleKind=block=>block.kind === 'plan' ? 'plan' : 'actual';
export function randomScheduleColor(random=Math.random) {
  const value=Number(random());
  if(!Number.isFinite(value))return 0;
  return Math.max(0,Math.min(4,Math.floor(value*5)));
}
export function weekDates(date) {
  const monday=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  return Array.from({length:7},(_,i)=>new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i));
}
export function scheduleItems(data,key,kind) {
  return (data.sched[key] || []).filter(block=>(kind==='all'||scheduleKind(block)===kind)&&visibleByTags(data,block.tags)).sort((a,b)=>a.s-b.s);
}
// In the one-lane week view, a plan and an actual at the same time share the width:
// plan on the left half, actual on the right. Everything else uses the full width.
export function blockSide(list,block) {
  const kind=scheduleKind(block);
  return list.some(other=>other!==block&&scheduleKind(other)!==kind&&other.s<=block.e&&block.s<=other.e)?kind:'full';
}
export function slotTime(slot) {
  const minutes=360+slot*30;
  return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
}
export function saveSchedule(data,key,block) {
  if(!['plan','actual'].includes(block.kind) || !Number.isInteger(block.s) || !Number.isInteger(block.e) || block.s<0 || block.e>=SLOT_COUNT || block.s>block.e) throw new Error('시간 범위를 확인해 주세요.');
  const list=data.sched[key] ||= [], index=list.findIndex(item=>item.id===block.id);
  if(index<0)list.push({...block});else list[index]={...block};
}

// Both surfaces read the same dated records; the renderer never owns a second copy.
export function renderSchedule(host,{dates,keyOf,getData,onEdit,onMove,onDone,onGoogle,compact=false,onDay}) {
  host.textContent='';
  const grid=document.createElement('div');grid.className='schedule-grid'+(compact?' weekly-grid':'');
  grid.style.setProperty('--day-count',String(dates.length));
  const corner=document.createElement('div');corner.className='schedule-corner';corner.textContent='';grid.append(corner);
  const today=keyOf(new Date());
  for(const date of dates){
    const head=document.createElement('div');head.className='schedule-day-head'+(keyOf(date)===today?' is-today':'');
    const title=document.createElement(compact?'button':'div');title.className='schedule-date';
    title.textContent=compact?['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()]+' '+String(date.getDate()).padStart(2,'0'):'Schedule';
    if(compact){title.type='button';title.setAttribute('aria-label',keyOf(date)+' 오늘 탭에서 열기');title.onclick=()=>onDay(date);}
    const labels=document.createElement('div');labels.className='schedule-labels';
    for(const kind of ['plan','actual']){const button=document.createElement('button');button.type='button';button.textContent=(kind==='plan'?'Plan':'Done')+' +';button.setAttribute('aria-label',(kind==='plan'?'계획':'한 일')+' 추가');button.onclick=()=>onEdit(keyOf(date),{kind,s:0,e:1,text:'',color:kind==='plan'?2:randomScheduleColor()});labels.append(button);}
    head.append(title,labels);grid.append(head);
  }
  const ruler=document.createElement('div');ruler.className='schedule-ruler';
  for(let slot=0;slot<SLOT_COUNT;slot+=2){const label=document.createElement('span');label.style.top=slot*SLOT_HEIGHT+'px';label.textContent=slotTime(slot);ruler.append(label);}
  grid.append(ruler);
  for(const date of dates){
    const day=document.createElement('div');day.className='schedule-day';
    // Week view: one lane per day, plans light and actuals dark. Day view keeps two lanes.
    for(const laneKind of compact?['all']:['plan','actual']){
      const kind=laneKind==='all'?'plan':laneKind;
      const key=keyOf(date),lane=document.createElement('div');lane.className='schedule-lane '+laneKind;
      lane.setAttribute('aria-label',key+' '+(laneKind==='all'?'일정':kind==='plan'?'계획':'실제'));lane.dataset.day=key;lane.dataset.kind=laneKind;
      let selection=null;
      const slotAt=e=>Math.max(0,Math.min(SLOT_COUNT-1,Math.floor((e.clientY-lane.getBoundingClientRect().top)/SLOT_HEIGHT)));
      lane.addEventListener('pointerdown',event=>{
        if(event.target!==lane || event.button!==0)return;
        const marker=document.createElement('div');marker.className='schedule-selection';lane.append(marker);
        selection={start:slotAt(event),end:slotAt(event),y:event.clientY,touch:event.pointerType==='touch',marker};
        if(!selection.touch){lane.setPointerCapture(event.pointerId);event.preventDefault();}
        marker.style.top=selection.start*SLOT_HEIGHT+'px';marker.style.height=SLOT_HEIGHT+'px';
      });
      lane.addEventListener('pointermove',event=>{
        if(!selection)return;
        if(selection.touch && Math.abs(event.clientY-selection.y)>5){selection.marker.remove();selection=null;return;}
        selection.end=slotAt(event);selection.marker.style.top=Math.min(selection.start,selection.end)*SLOT_HEIGHT+'px';selection.marker.style.height=(Math.abs(selection.end-selection.start)+1)*SLOT_HEIGHT+'px';
      });
      lane.addEventListener('pointerup',()=>{
        if(!selection)return;const {start,end,marker}=selection;marker.remove();selection=null;
        onEdit(key,{kind,s:Math.min(start,end),e:start===end?Math.min(start+1,SLOT_COUNT-1):Math.max(start,end),text:'',color:kind==='plan'?2:randomScheduleColor()});
      });
      lane.addEventListener('pointercancel',()=>{selection?.marker.remove();selection=null;});
      const blocks=scheduleItems(getData(),key,laneKind);
      for(const block of blocks){
        const kind=scheduleKind(block);
        const card=document.createElement('div');card.className='schedule-block color-'+((block.color || 0)%5)+' kind-'+kind;
        if(laneKind==='all')card.classList.add('side-'+blockSide(blocks,block));
        card.style.top=block.s*SLOT_HEIGHT+'px';card.style.height=(block.e-block.s+1)*SLOT_HEIGHT-2+'px';
        const edit=document.createElement('button');edit.type='button';edit.className='schedule-block-edit';
        edit.title=slotTime(block.s)+'–'+slotTime(block.e+1)+' '+block.text;
        edit.setAttribute('aria-label',key+' '+(kind==='plan'?'계획':'한 일')+' '+edit.title+' 편집');
        if(block.e>block.s){const time=document.createElement('small');time.textContent=slotTime(block.s)+'–'+slotTime(block.e+1);edit.append(time);}
        const text=document.createElement('span');text.textContent=((block.google&&!onGoogle)?'G · ':'')+(block.text || '내용 입력');edit.append(text);
        edit.onclick=()=>onEdit(key,{...block,kind});
        card.append(edit);
        // One tap turns a plan into what you did, at the same time.
        if(kind==='plan'&&onDone){const done=document.createElement('button');done.type='button';done.className='schedule-done';done.textContent='✓';done.title='했어요 — 한 일로 바꾸기';done.setAttribute('aria-label',(block.text||'계획')+' 했어요, 한 일로 바꾸기');done.onclick=event=>{event.stopPropagation();onDone(key,{...block});};card.append(done);}
        // “G”: this block alone syncs with Google Calendar. Filled when on.
        if(onGoogle){const g=document.createElement('button');g.type='button';g.className='schedule-google'+(block.google?' on':'')+(kind==='plan'&&onDone?'':' solo');g.textContent='G';g.setAttribute('aria-pressed',String(!!block.google));g.title=block.google?'Google 연동 중 — 누르면 끄기':'Google에도 저장';g.setAttribute('aria-label',(block.text||'일정')+' '+g.title);g.onclick=event=>{event.stopPropagation();onGoogle(key,{...block});};card.append(g);}
        for(const mode of ['move','top','bottom']){
          const grip=document.createElement('div');grip.className='schedule-grip '+mode;grip.textContent=mode==='move'?'⠿':'';grip.title=mode==='move'?'시간 이동':'길이 조절';
          grip.addEventListener('pointerdown',event=>{
            event.preventDefault();event.stopPropagation();grip.setPointerCapture(event.pointerId);
            const y=event.clientY,oldS=block.s,oldE=block.e;let s=oldS,e=oldE;
            function move(ev){const delta=Math.round((ev.clientY-y)/SLOT_HEIGHT);
              if(mode==='move'){s=Math.min(Math.max(0,oldS+delta),SLOT_COUNT-1-(oldE-oldS));e=s+oldE-oldS;}
              else if(mode==='top')s=Math.max(0,Math.min(oldE,oldS+delta));
              else e=Math.min(SLOT_COUNT-1,Math.max(oldS,oldE+delta));
              card.style.top=s*SLOT_HEIGHT+'px';card.style.height=(e-s+1)*SLOT_HEIGHT-2+'px';
            }
            function finish(ev){grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',finish);grip.removeEventListener('pointercancel',finish);
              if(ev.type==='pointercancel'){card.style.top=oldS*SLOT_HEIGHT+'px';card.style.height=(oldE-oldS+1)*SLOT_HEIGHT-2+'px';return;}
              if(s!==oldS || e!==oldE)onMove(key,{...block,kind,s,e},{...block});
            }
            grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',finish);grip.addEventListener('pointercancel',finish);
          });card.append(grip);
        }
        lane.append(card);
      }
      day.append(lane);
    }
    grid.append(day);
  }
  host.append(grid);
}
