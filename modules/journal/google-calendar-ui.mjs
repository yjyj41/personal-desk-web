import {SCOPES,copy,same,createCalendarAPI,reconcile,instant,parts,importable,fingerprint,exportEventId} from './google-calendar.mjs?v=20261109d';

const ZONES=['Europe/London','Asia/Seoul','Europe/Paris','America/New_York','UTC'];
// Change the sync time zone. Blocks you made keep their clock time (and are re-sent);
// copies of Google events keep their real moment, so their slots move. Copies that no
// longer fit the 06–24 grid are dropped from the journal; the Google originals stay.
export function moveZone(data,from,to){
  if(!from||from===to)return 0;const moves=[];
  for(const [key,list] of Object.entries(data.sched||{}))for(const b of list)if(b.gc&&String(b.id).startsWith('g'))moves.push({key,b});
  for(const {key,b} of moves){
    const list=data.sched[key];list.splice(list.indexOf(b),1);if(!list.length)delete data.sched[key];
    const start=parts(instant(key,360+b.s*30,from),to),len=b.e-b.s;
    if(start.minute>=360&&start.minute%30===0&&start.second===0&&(start.minute-360)/30+len<=35){b.s=(start.minute-360)/30;b.e=b.s+len;(data.sched[start.key]||=[]).push(b);}
  }
  return moves.length;
}

export function installCalendar({getData,mutate,persist,ready,getUid,authorize,render,range,onExtras=()=>{},onConnected=()=>{}}){
  let token=null,expires=0,owner=null,generation=0,timer,busy=false,problem=false,issues=[],extras=[],calendars=[],allCalendars=[];
  const host=document.getElementById('googleCalendarPanel');
  host.innerHTML=`<details class="fold gc-sync" id="gcSettings"><summary>Google Calendar 설정</summary>
    <p class="hint" id="gcStatus" role="status" aria-live="polite">연결 안 됨 · 기록은 그대로 있어요.</p>
    <ol class="gc-steps">
      <li><b>보기</b> — 연결되면 이 달력에 Google 일정이 함께 보여요. 보기만 하고 바꾸지 않아요.</li>
      <li><b>올리기</b> — 시간표 블록 편집에서 “Google에도 저장”을 켜면 그 블록만 아래 캘린더에 올라가요. 이후 어느 쪽에서 고쳐도 서로 맞춰져요.</li>
      <li><b>가져오기</b> — 달력에서 날짜를 눌러 Google 일정의 “시간표로 가져오기”를 누르면 그 일정이 시간표 블록이 돼요.</li>
    </ol>
    <div class="backup-actions" style="justify-content:flex-start"><button type="button" class="authbtn" id="gcConnect">Google 연결</button><button type="button" class="authbtn" id="gcSync">지금 맞추기</button><button type="button" class="authbtn" id="gcDisconnect">연결 끊기</button></div>
    <label class="schedule-field">올릴 캘린더<select id="gcCalendar"><option value="">연결 후 선택</option></select></label>
    <label class="schedule-field">시간대<select id="gcZone"></select></label>
    <input type="checkbox" id="gcDefault" disabled hidden>
    <p class="hint">연결은 이 탭에서 약 50분 유지돼요. 끊기면 “Google 연결”을 다시 누르세요. 할 일·일기·사진은 Google로 보내지 않아요.</p>
    <div id="gcIssues"></div>
    <details class="fold gc-extras-fold"><summary>아직 시간표에 없는 Google 일정</summary><p class="hint">종일·초대·06시 이전·30분 단위가 아닌 일정은 가져올 수 없어 Google에서만 관리해요.</p><div id="gcExtras"></div></details>
  </details>`;
  const el=id=>document.getElementById(id),status=text=>el('gcStatus').textContent=text;
  const config=()=>getData().googleCalendar||{};
  const connected=()=>token&&Date.now()<expires&&owner===getUid();
  const api=createCalendarAPI(()=>connected()?token:null);
  const flush=async()=>{if(!ready()||!await persist())throw new Error('먼저 Firebase 저장·충돌 해결을 완료해 주세요.');};
  function setBusy(value){busy=value;for(const id of ['gcConnect','gcSync','gcDisconnect','gcCalendar'])el(id).disabled=value;}
  function draw(){
    el('gcDefault').checked=false;{const z=el('gcZone'),cur=config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone,list=[...new Set([cur,...ZONES,Intl.DateTimeFormat().resolvedOptions().timeZone])];if(z.options.length!==list.length||[...z.options].some((o,i)=>o.value!==list[i])){z.textContent='';for(const v of list){const o=document.createElement('option');o.value=v;o.textContent=v;z.append(o);}}z.value=cur;}
    if(calendars.length)el('gcCalendar').value=config().calendar||'';
    el('gcIssues').textContent='';
    for(const issue of issues){
      const row=document.createElement('p');row.className='hint';row.textContent=issue.message;
      const found=Object.entries(getData().sched||{}).flatMap(([key,list])=>list.filter(b=>b.id===issue.id).map(block=>({key,block})))[0];
      if(found)row.prepend(document.createTextNode(found.block.text+' — '));
      if(issue.event&&issue.before){
        const googleText=document.createElement('p');googleText.textContent='Google: '+(issue.event.summary||'(제목 없음)')+' · '+issue.event.start.dateTime+' / 불렛저널: '+issue.before.block.text;row.append(googleText);
        for(const choice of ['google','journal']){const button=document.createElement('button');button.className='authbtn';button.textContent=choice==='google'?'Google 내용 사용':'불렛저널 내용 사용';button.onclick=async()=>{
          if(busy)return;
          if(!same(found,issue.before)){status('기록이 바뀌었어요. 다시 동기화해 주세요.');return;}
          if(!confirm(button.textContent+' — 다른 쪽의 제목과 시간을 바꿀까요?'))return;
          mutate(data=>{
            const current=data.sched[found.key]?.find(b=>b.id===issue.id);if(!same(current,found.block))return;
            if(choice==='google'){const item=importable(issue.event,config().zone);if(!item)return;Object.assign(current,{text:item.text,s:item.s,e:item.e});if(item.key!==found.key){data.sched[found.key]=data.sched[found.key].filter(b=>b.id!==current.id);(data.sched[item.key]||=[]).push(current);}}
            current.gc.base=fingerprint(issue.event);current.gc.etag=issue.event.etag;
          });render();await run();};row.append(button);}
      }el('gcIssues').append(row);
    }
    el('gcExtras').textContent='';
    for(const event of [...new Map(extras.map(e=>[e.id,e])).values()]){
      const row=document.createElement('p');row.className='hint';
      row.textContent=(event.summary||'(제목 없음)')+' · '+(event.start?.date||event.start?.dateTime||'')+' (Google 원본) ';
      if(event.htmlLink&&new URL(event.htmlLink).origin==='https://www.google.com'){const a=document.createElement('a');a.href=event.htmlLink;a.target='_blank';a.rel='noopener';a.textContent='열기';row.append(a);}if(importable(event,config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone)){const link=document.createElement('button');link.className='authbtn';link.textContent='시간표로 가져오기';link.onclick=()=>linkEvent(event,event._calendar||config().calendar).catch(e=>status(e.message));row.append(link);}el('gcExtras').append(row);
    }
  }
  async function run(){
    clearTimeout(timer);if(busy||problem||!ready())return;
    if(token&&Date.now()>=expires){token=null;expires=0;onConnected(false);status('연결 시간이 지났어요 · “Google 연결”을 다시 누르세요. 기록은 그대로예요.');return;}
    if(!connected()){if(!token)status('연결 안 됨 · “Google 연결”을 누르세요. 기록은 그대로예요.');return;}
    if(!config().calendar&&!Object.values(getData().sched||{}).flat().some(b=>b.google&&(b.gc?.calendar||b.googleCalendar))){status('연결됨 · 달력에 Google 일정이 보여요. 블록을 올리려면 “올릴 캘린더”를 고르세요.');return;}
    if(document.getElementById('scheduleDialog').open)return;
    setBusy(true);status('Google 동기화 중…');const epoch=generation,uid=getUid(),c=copy(config());
    try{
      await flush();const [start,end]=range();
      const results=[];const targets=[...new Set([c.calendar,...Object.values(getData().sched||{}).flat().filter(b=>b.google).map(b=>b.gc?.calendar||b.googleCalendar)].filter(Boolean))];
      for(const target of targets)results.push(await reconcile({api,uid,calendar:target,zone:c.zone,min:instant(start,0,c.zone),max:instant(end,0,c.zone),getData,
        update:mutate,persist,valid:()=>epoch===generation&&uid===getUid()&&ready()&&config().calendar===c.calendar}));
      const result={issues:results.flatMap(r=>r.issues),extras:results.flatMap(r=>r.extras)};
      if(epoch!==generation)return;
      issues=result.issues;extras=result.extras;render();draw();onExtras(extras);status(issues.length?'동기화 완료 · 아래 확인 사항 '+issues.length+'개':'Google 동기화 완료 · '+new Date().toLocaleTimeString());
    }catch(error){if(epoch===generation){problem=true;status(error.message);if(error.status===401){token=null;expires=0;}}}
    finally{if(epoch===generation)setBusy(false);}
  }
  // getToken asks Google (popup) or hands over a token already granted at sign-in.
  async function connectWith(getToken){
    problem=false;setBusy(true);status('Google 권한 확인 중…');const epoch=generation;
    try{const result=await getToken();if(epoch!==generation||!result)return;token=result;expires=Date.now()+50*60*1000;owner=getUid();
      allCalendars=await api.calendars();calendars=allCalendars.filter(c=>['owner','writer'].includes(c.accessRole));onConnected(true);
      if(epoch!==generation)return;
      el('gcCalendar').textContent='';const blank=document.createElement('option');blank.value='';blank.textContent='고르지 않음 (보기만)';el('gcCalendar').append(blank);
      for(const c of calendars){const option=document.createElement('option');option.value=c.id;option.textContent=c.summary+(c.primary?' (기본)':'');el('gcCalendar').append(option);}
      draw();status('연결됨 · 달력에 Google 일정이 보여요.');
    }catch(e){if(epoch===generation){problem=true;token=null;expires=0;onConnected(false);status('Google Calendar 연결 실패: '+e.message);}}
    finally{if(epoch===generation)setBusy(false);}if(epoch===generation&&!problem)await run();
  }
  el('gcConnect').onclick=()=>{
    if(!ready()){status('저널 기록을 먼저 불러와야 해요. 잠시 후 다시 눌러 주세요.');return;}
    return connectWith(()=>authorize(SCOPES));
  };
  // Called right after Google sign-in: the sign-in already granted calendar access.
  async function adopt(granted){
    if(!granted)return;const epoch=generation;
    for(let i=0;i<60&&!ready();i++)await new Promise(r=>setTimeout(r,250));
    if(epoch!==generation||!ready()||connected())return;
    await connectWith(async()=>granted);
  }
  el('gcCalendar').onchange=async()=>{
    const calendar=el('gcCalendar').value;if(!calendar)return;
    if(!confirm('“Google에도 저장”을 켠 블록을 이 캘린더에 올릴까요? 다른 일정은 자동으로 보내거나 가져오지 않아요.')){draw();return;}
    mutate(data=>{data.googleCalendar={...config(),calendar,zone:config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone,defaultSend:false};});draw();await run();
  };
  el('gcZone').onchange=async()=>{
    const from=config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone,to=el('gcZone').value;
    if(from===to)return;
    if(busy||!ready()){status('잠시 후 다시 바꿔 주세요.');draw();return;}
    if(!confirm('시간대를 '+from+' → '+to+'로 바꿀까요?\n\n직접 만든 시간표 블록은 같은 시각(예: 11:30)으로 유지되고, Google에 올린 일정은 새 시간대 기준으로 다시 맞춰집니다.')){draw();return;}
    mutate(data=>{moveZone(data,from,to);data.googleCalendar={...(data.googleCalendar||{}),zone:to};});
    render();draw();problem=false;await run();onConnected(connected());
  };
  el('gcDefault').onchange=()=>{mutate(data=>{data.googleCalendar={...config(),defaultSend:el('gcDefault').checked};});};
  el('gcSync').onclick=()=>{problem=false;return run();};
  function reset(){generation++;token=null;expires=0;owner=null;clearTimeout(timer);busy=false;problem=false;issues=[];extras=[];onExtras([]);onConnected(false);calendars=[];allCalendars=[];el('gcCalendar').innerHTML='<option value="">연결 후 선택</option>';setBusy(false);status('연결 안 됨 · “Google 연결”을 누르세요. 기록은 그대로예요.');draw();}
  el('gcDisconnect').onclick=()=>{reset();status('연결 끊음 · 기록과 Google 일정은 그대로예요.');};
  const interval=setInterval(()=>{if(document.visibilityState==='visible')run();},60000);
  window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')run();});
  async function beforeSave(key,before,updated){
    if(busy)throw new Error('Google 동기화가 끝난 뒤 다시 저장해 주세요.');
    if(updated.google&&!updated.googleCalendar&&!before?.gc?.calendar&&!config().calendar)throw new Error('먼저 Google 연결 후 캘린더를 선택해 주세요.');
    // Keep the remote identity to reconnect without creating a duplicate. No API deletion.
    if(updated.google&&!updated.googleCalendar)updated.googleCalendar=before?.gc?.calendar||config().calendar;
    if(before?.gc)updated.gc=copy(before.gc);
    return true;
  }
  async function deleteRemote(before){
    if(busy)throw new Error('동기화가 끝난 뒤 다시 시도하세요.');
    if(!connected())throw new Error('Google 재연결이 필요해요.');
    if(!confirm('Google 원본도 삭제할까요? Desk의 기록은 연결을 해제하고 남깁니다.'))return false;
    const epoch=generation;await flush();setBusy(true);
    try{const calendar=before.gc?.calendar||before.googleCalendar||config().calendar,id=before.gc?.eventId||await exportEventId(getUid(),before);
      const event=await api.get(calendar,id);if(epoch!==generation)throw new Error('계정이 변경됐어요.');
      if(event&&event.status!=='cancelled'){
        if(event.attendees?.length)throw new Error('참석자가 있는 일정은 Google에서 직접 관리하세요.');
        if(before.gc&&event.etag!==before.gc.etag)throw new Error('Google 일정이 변경됐어요. 먼저 동기화하세요.');
        if(!before.gc&&event.extendedProperties?.private?.bujoId!==before.id)throw new Error('연결된 일정인지 확인할 수 없어요.');
        await api.remove(calendar,id,event.etag);
      }return true;
    }finally{if(epoch===generation)setBusy(false);}
  }
  async function linkEvent(event,calendarId){
    if(busy||!connected())throw new Error('Google 연결 상태를 확인하세요.');
    if(!calendars.some(c=>c.id===calendarId))throw new Error('수정 권한이 없는 캘린더는 보기만 가능합니다.');
    const item=importable(event,config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone);
    if(!item)throw new Error('종일·초대 일정 또는 시간표 범위 밖 일정은 읽기 전용으로 표시합니다.');
    const epoch=generation;setBusy(true);
    try{await flush();if(epoch!==generation)throw new Error('계정이 변경됐어요.');
      const existing=Object.values(getData().sched||{}).flat().find(b=>b.gc?.calendar===calendarId&&b.gc?.eventId===event.id);
      mutate(data=>{if(existing)existing.google=true;else(data.sched[item.key]||=[]).push({id:crypto.randomUUID(),s:item.s,e:item.e,text:item.text,kind:'plan',color:2,tags:[...(data.googleEventTags?.[calendarId+'|'+event.id]||[])],google:true,googleCalendar:calendarId,gc:{calendar:calendarId,eventId:event.id,etag:event.etag,base:fingerprint(event)}});});
      if(!await persist())throw new Error('연결 설정 저장을 다시 시도해 주세요.');if(epoch===generation){render();draw();}
    }finally{if(epoch===generation)setBusy(false);}
  }

  // Read-only view of every calendar shown in Google Calendar, for the Monthly page.
  async function monthEvents(startKey,endKey){
    if(!connected())return null;
    const zone=config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone,min=instant(startKey,0,zone),max=instant(endKey,0,zone);
    const shown=allCalendars.filter(c=>c.selected!==false&&c.accessRole!=='freeBusyReader');
    const results=await Promise.allSettled(shown.map(c=>api.events(c.id,min,max).then(items=>items.filter(e=>e.status!=='cancelled').map(e=>({...e,_cal:{id:c.id,summary:c.summaryOverride||c.summary,color:c.backgroundColor||'#6B6B67'}})))));
    const failed=results.filter(r=>r.status==='rejected');
    if(failed.length===results.length&&failed.length)throw failed[0].reason;
    return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
  }
  function open(){const d=el('gcSettings');d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}
  return {reset,draw,run,adopt,open,beforeSave,deleteRemote,linkEvent,writableCalendars:()=>calendars,monthEvents,connected:()=>!!connected(),zone:()=>config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone,calendarList:()=>allCalendars.filter(c=>c.selected!==false&&c.accessRole!=='freeBusyReader').map(c=>({id:c.id,summary:c.summaryOverride||c.summary,color:c.backgroundColor||'#6B6B67',primary:!!c.primary})),connect:()=>el('gcConnect').click(),isBusy:()=>busy,defaultSend:()=>false,
    changed(){draw();clearTimeout(timer);if(connected())timer=setTimeout(run,2000);}};
}
