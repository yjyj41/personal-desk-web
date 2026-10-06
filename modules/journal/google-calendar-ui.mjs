import {SCOPES,copy,same,createCalendarAPI,reconcile,instant,importable,fingerprint,exportEventId} from './google-calendar.mjs';

export function installCalendar({getData,mutate,persist,ready,getUid,authorize,render,range}){
  let token=null,expires=0,owner=null,generation=0,timer,busy=false,problem=false,issues=[],extras=[],calendars=[];
  const host=document.getElementById('googleCalendarPanel');
  host.innerHTML=`<details class="fold"><summary>Google Calendar 연동</summary>
    <p class="hint">연결한 캘린더의 일정을 가져오고, ‘Google에 표시’를 켠 시간별 기록만 보냅니다. 할 일·일기·사진은 보내지 않습니다.</p>
    <div class="backup-actions" style="justify-content:flex-start"><button type="button" class="authbtn" id="gcConnect">Google 연결 / 재인증</button><button type="button" class="authbtn" id="gcSync">지금 동기화</button><button type="button" class="authbtn" id="gcDisconnect">이 기기 연결 해제</button></div>
    <label class="schedule-field">연결할 캘린더<select id="gcCalendar"><option value="">연결 후 선택</option></select></label>
    <label class="schedule-field">시간대<input id="gcZone" readonly></label>
    <label class="hint"><input type="checkbox" id="gcDefault"> 새 ‘계획’은 기본적으로 Google에 표시 (기존 기록·실제 기록에는 적용 안 함)</label>
    <p class="hint" id="gcStatus" role="status" aria-live="polite">연결하지 않음 · 기존 기록은 그대로 유지됩니다.</p>
    <p class="hint">앱이 열려 있을 때 약 1분마다 갱신합니다. 브라우저를 다시 열거나 인증이 만료되면 다시 연결하세요. 현재 보는 달/주의 일정과 연결된 기록을 동기화합니다. 종일·초대 일정·06시 이전·30분 단위가 아닌 일정은 아래 목록에서 원본을 확인합니다.</p>
    <div id="gcIssues"></div><div id="gcExtras"></div>
    <p class="hint"><a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=bullet-journal-b359c" target="_blank" rel="noopener">Calendar API 설정</a> · 연결 권한은 본인 Google 계정에서 직접 승인해 주세요.</p>
  </details>`;
  const el=id=>document.getElementById(id),status=text=>el('gcStatus').textContent=text;
  const config=()=>getData().googleCalendar||{};
  const connected=()=>token&&Date.now()<expires&&owner===getUid();
  const api=createCalendarAPI(()=>connected()?token:null);
  const flush=async()=>{if(!ready()||!await persist())throw new Error('먼저 Firebase 저장·충돌 해결을 완료해 주세요.');};
  function setBusy(value){busy=value;for(const id of ['gcConnect','gcSync','gcDisconnect','gcCalendar','gcDefault'])el(id).disabled=value;}
  function draw(){
    el('gcDefault').checked=!!config().defaultSend;el('gcZone').value=config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone;
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
      if(event.htmlLink&&new URL(event.htmlLink).origin==='https://www.google.com'){const a=document.createElement('a');a.href=event.htmlLink;a.target='_blank';a.rel='noopener';a.textContent='열기';row.append(a);}el('gcExtras').append(row);
    }
  }
  async function run(){
    clearTimeout(timer);if(busy||problem||!ready())return;
    if(!connected()){status('Google 연결 / 재인증이 필요해요. 변경은 Firebase에 보관됩니다.');return;}
    if(!config().calendar){status('연결할 캘린더를 선택해 주세요.');return;}
    if(document.getElementById('scheduleDialog').open)return;
    setBusy(true);status('Google 동기화 중…');const epoch=generation,uid=getUid(),c=copy(config());
    try{
      await flush();const [start,end]=range();
      const result=await reconcile({api,uid,calendar:c.calendar,zone:c.zone,min:instant(start,0,c.zone),max:instant(end,0,c.zone),getData,
        update:mutate,persist,valid:()=>epoch===generation&&uid===getUid()&&ready()&&config().calendar===c.calendar});
      if(epoch!==generation)return;
      issues=result.issues;extras=result.extras;render();draw();status(issues.length?'동기화 완료 · 아래 확인 사항 '+issues.length+'개':'Google 동기화 완료 · '+new Date().toLocaleTimeString());
    }catch(error){if(epoch===generation){problem=true;status(error.message);if(error.status===401){token=null;expires=0;}}}
    finally{if(epoch===generation)setBusy(false);}
  }
  el('gcConnect').onclick=async()=>{
    if(!ready()){status('불렛저널 기록을 먼저 불러와야 합니다. 상단 저장 상태나 기록 충돌을 확인해 주세요.');return;}problem=false;setBusy(true);status('Google 권한 확인 중…');const epoch=generation;
    try{const result=await authorize(SCOPES);if(epoch!==generation)return;token=result;expires=Date.now()+50*60*1000;owner=getUid();
      calendars=(await api.calendars()).filter(c=>['owner','writer'].includes(c.accessRole));
      if(epoch!==generation)return;
      el('gcCalendar').textContent='';const blank=document.createElement('option');blank.value='';blank.textContent='캘린더를 선택하세요';el('gcCalendar').append(blank);
      for(const c of calendars){const option=document.createElement('option');option.value=c.id;option.textContent=c.summary+(c.primary?' (기본)':'');el('gcCalendar').append(option);}
      draw();if(!calendars.length){problem=true;status('연결은 됐지만 수정 가능한 캘린더가 없어요. 승인한 권한과 Google 계정을 확인해 주세요.');return;}status('Google 연결됨 · 캘린더를 선택하세요.');
    }catch(e){if(epoch===generation){problem=true;token=null;expires=0;status('Google Calendar 연결 실패: '+e.message);}}
    finally{if(epoch===generation)setBusy(false);}if(epoch===generation&&!problem)await run();
  };
  el('gcCalendar').onchange=async()=>{
    const calendar=el('gcCalendar').value;if(!calendar)return;
    if(!confirm('이 캘린더의 일정을 불렛저널로 가져오고, 표시를 켠 기록을 여기에 저장할까요? 기존에 연결된 다른 캘린더 일정은 옮기지 않습니다.')){draw();return;}
    mutate(data=>{data.googleCalendar={...config(),calendar,zone:config().zone||Intl.DateTimeFormat().resolvedOptions().timeZone,defaultSend:!!config().defaultSend};});draw();await run();
  };
  el('gcDefault').onchange=()=>{mutate(data=>{data.googleCalendar={...config(),defaultSend:el('gcDefault').checked};});};
  el('gcSync').onclick=()=>{problem=false;return run();};
  function reset(){generation++;token=null;expires=0;owner=null;clearTimeout(timer);busy=false;problem=false;issues=[];extras=[];calendars=[];el('gcCalendar').innerHTML='<option value="">연결 후 선택</option>';setBusy(false);status('이 기기 연결 해제됨 · 기록과 Google 일정은 유지됩니다.');draw();}
  el('gcDisconnect').onclick=reset;
  const interval=setInterval(()=>{if(document.visibilityState==='visible')run();},60000);
  window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')run();});
  async function beforeSave(key,before,updated){
    if(busy)throw new Error('Google 동기화가 끝난 뒤 다시 저장해 주세요.');
    if(updated.google&&!config().calendar)throw new Error('먼저 Google 연결 후 캘린더를 선택해 주세요.');
    if(before?.google&&!updated.google){
      if(!connected())throw new Error('Google 쪽 일정을 제거하려면 먼저 재연결해 주세요.');
      if(!confirm('Google 캘린더의 이 일정을 삭제하고 불렛저널에만 남길까요? Google에서 가져온 일정도 원본이 삭제됩니다.'))return false;
      const epoch=generation,uid=getUid();await flush();
      const calendar=before.gc?.calendar||config().calendar,id=before.gc?.eventId||await exportEventId(uid,before);
      setBusy(true);
      try{
        const event=await api.get(calendar,id);if(epoch!==generation)throw new Error('계정이 변경됐어요.');
        if(event&&event.status!=='cancelled'){
          if(before.gc&&event.etag!==before.gc.etag)throw new Error('Google에서 변경된 일정이에요. 먼저 동기화 후 다시 시도해 주세요.');
          if(event.attendees?.length)throw new Error('참석자가 있는 일정은 Google에서 직접 삭제해 주세요.');
          if(!before.gc&&event.extendedProperties?.private?.bujoId!==before.id)throw new Error('연결된 일정인지 확인할 수 없어요.');
          await api.remove(calendar,id,event.etag);
        }
        if(epoch!==generation)throw new Error('계정이 변경됐어요.');
        delete updated.gc;updated.googleVersion=(before.googleVersion||0)+1;
      }finally{if(epoch===generation)setBusy(false);}
    }return true;
  }
  return {reset,draw,run,beforeSave,isBusy:()=>busy,defaultSend:()=>!!config().calendar&&!!config().defaultSend,
    changed(){draw();clearTimeout(timer);if(connected())timer=setTimeout(run,2000);}};
}
