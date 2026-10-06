// Calendar transport and reconciliation. OAuth tokens are memory-only, never journal data.
export const SCOPES=['https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
export const copy=x=>JSON.parse(JSON.stringify(x));
export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function parts(iso,zone){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));
  return {key:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute),second:Number(p.second)};
}
export function instant(key,minutes,zone){
  const [y,m,d]=key.split('-').map(Number), target=Date.UTC(y,m-1,d,0,minutes);
  let value=target;
  for(let i=0;i<4;i++){
    const p=parts(value,zone),[yy,mm,dd]=p.key.split('-').map(Number);
    const delta=target-Date.UTC(yy,mm-1,dd,0,p.minute,p.second);value+=delta;if(!delta)break;
  }
  const p=parts(value,zone), normalized=new Date(target).toISOString();
  if(p.key!==normalized.slice(0,10)||p.minute!==new Date(target).getUTCHours()*60+new Date(target).getUTCMinutes())throw new Error('서머타임 전환으로 존재하지 않는 시간이에요. Google에서 조정해 주세요.');
  return new Date(value).toISOString();
}
export function payload(key,block,zone){return {summary:block.text||'(제목 없음)',start:{dateTime:instant(key,360+block.s*30,zone),timeZone:zone},end:{dateTime:instant(key,360+(block.e+1)*30,zone),timeZone:zone}};}
export function fingerprint(event){return JSON.stringify([event.summary||'(제목 없음)',event.start?.dateTime?new Date(event.start.dateTime).toISOString():event.start?.date,event.end?.dateTime?new Date(event.end.dateTime).toISOString():event.end?.date]);}
export function importable(event,zone){
  if(event.status==='cancelled'||!event.start?.dateTime||!event.end?.dateTime||event.attendees?.length||event.eventType&&event.eventType!=='default')return null;
  const start=parts(event.start.dateTime,zone),end=parts(event.end.dateTime,zone);
  const next=new Date(start.key+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);
  const stop=end.key===start.key?end.minute:end.key===next.toISOString().slice(0,10)&&end.minute===0?1440:-1;
  if(start.minute<360||stop<=start.minute||start.minute%30||stop%30||start.second||end.second)return null;
  return {key:start.key,s:(start.minute-360)/30,e:(stop-360)/30-1,text:event.summary||'(제목 없음)'};
}
export function decision(key,block,event,zone){
  if(!event||event.status==='cancelled')return 'deleted';
  const local=fingerprint(payload(key,block,zone)),remote=fingerprint(event),base=block.gc?.base;
  if(local===remote)return 'same';
  if(!base)return 'conflict';
  if(local!==base&&remote!==base)return 'conflict';
  return remote!==base?'pull':'push';
}
export async function stableEventId(uid,id){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uid+':'+id));
  return 'b'+[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createCalendarAPI(getToken,fetcher=fetch){
  async function request(path,{method='GET',body,etag}={}){
    const token=getToken();if(!token)throw new Error('Google 연결이 필요해요. 연결 버튼을 눌러 주세요.');
    const response=await fetcher('https://www.googleapis.com/calendar/v3/'+path,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{}),...(etag?{'If-Match':etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(response.status===204)return null;
    const value=await response.json();
    if(!response.ok){const error=new Error(response.status===401?'Google 인증이 만료됐어요. 다시 연결해 주세요.':response.status===412?'Google 일정이 변경되어 덮어쓰지 않았어요. 다시 동기화해 주세요.':response.status===403?'Calendar API 활성화 또는 캘린더 권한을 확인해 주세요.':value.error?.message||'Google 연결 실패');error.status=response.status;throw error;}
    return value;
  }
  async function list(path,params={}){let pageToken,items=[];do{const query=new URLSearchParams({...params,...(pageToken?{pageToken}:{})});const page=await request(path+'?'+query);items.push(...(page.items||[]));pageToken=page.nextPageToken;}while(pageToken);return items;}
  const path=(calendar,id)=>'calendars/'+encodeURIComponent(calendar)+'/events'+(id?'/'+encodeURIComponent(id):'');
  return {calendars:()=>list('users/me/calendarList'),events:(calendar,min,max)=>list(path(calendar),{timeMin:min,timeMax:max,singleEvents:'true',showDeleted:'false',maxResults:'2500'}),
    get:async(calendar,id)=>{try{return await request(path(calendar,id));}catch(e){if(e.status===404||e.status===410)return null;throw e;}},
    insert:(calendar,event)=>request(path(calendar),{method:'POST',body:event}),
    patch:(calendar,id,event,etag)=>request(path(calendar,id),{method:'PATCH',body:event,etag}),
    remove:(calendar,id,etag)=>request(path(calendar,id),{method:'DELETE',etag})};
}
export const exportEventId=(uid,block)=>stableEventId(uid,block.id+':'+(block.googleVersion||0));

// Only explicit opt-ins are exported. Missing local blocks never imply remote deletion.
export async function reconcile({api,uid,calendar,zone,min,max,getData,update,persist,valid=()=>true}){
  const issues=[],extras=[];const assert=()=>{if(!valid())throw new Error('계정 또는 기록이 변경되어 동기화를 중단했어요.');};
  const current=id=>Object.entries(getData().sched||{}).flatMap(([key,list])=>list.filter(b=>b.id===id).map(block=>({key,block})))[0];
  const unchanged=before=>{assert();if(!same(current(before.block.id),before))throw new Error('동기화 중 기록이 변경됐어요. 다시 시도해 주세요.');};
  const set=async(before,fn)=>{assert();const now=current(before.block.id);if(!same(now,before))throw new Error('동기화 중 기록이 변경됐어요. 다시 시도해 주세요.');update(fn);if(!await persist())throw new Error('Firebase 저장을 먼저 완료해 주세요.');assert();};
  const snapshot=Object.entries(getData().sched||{}).flatMap(([key,list])=>list.map(block=>({key,block:copy(block)})));
  for(const before of snapshot){
    assert();let {key,block}=before;if(!block.google||block.gc&&block.gc.calendar!==calendar)continue;
    let event;
    if(!block.gc){
      const id=await exportEventId(uid,block);assert();event=await api.get(calendar,id);
      if(!event){unchanged(before);try{event=await api.insert(calendar,{...payload(key,block,zone),id,extendedProperties:{private:{bujoId:block.id}}});}catch(e){if(e.status!==409)throw e;event=await api.get(calendar,id);}}
      if(!event||event.status==='cancelled'){issues.push({id:block.id,message:'이 일정은 Google에서 삭제된 이력이 있어요. 새 블록으로 다시 등록해 주세요.'});continue;}
      if(event.extendedProperties?.private?.bujoId!==block.id){issues.push({id:block.id,message:'Google 일정 ID가 이미 사용 중이에요.'});continue;}
      // An earlier insert may have succeeded before a lost response. Preserve either edit.
      if(fingerprint(event)!==fingerprint(payload(key,block,zone))){issues.push({id:block.id,message:'이전 등록 내용과 달라요. Google 일정을 먼저 확인해 주세요.'});continue;}
      await set(before,data=>{const b=data.sched[key].find(b=>b.id===block.id);b.gc={calendar,eventId:event.id,etag:event.etag,base:fingerprint(event)};});continue;
    }
    event=await api.get(calendar,block.gc.eventId);assert();
    const action=decision(key,block,event,zone);
    if(action==='deleted'){
      await set(before,data=>{const b=data.sched[key].find(b=>b.id===block.id);b.google=false;b.googleVersion=(b.googleVersion||0)+1;delete b.gc;});
      issues.push({id:block.id,message:'Google에서 삭제된 일정은 불렛저널에만 남겼어요.'});continue;
    }
    if(!importable(event,zone)){extras.push(event);issues.push({id:block.id,message:'종일·초대·시간 범위가 변경된 일정은 Google에서 확인해 주세요. 자동 수정하지 않았어요.'});continue;}
    if(action==='conflict'){issues.push({id:block.id,event:copy(event),before,message:'양쪽에서 수정됨: 사용할 내용을 선택해 주세요.'});continue;}
    if(action==='push'){unchanged(before);event=await api.patch(calendar,event.id,payload(key,block,zone),event.etag);}
    const imported=importable(event,zone);
    await set(before,data=>{
      const list=data.sched[key],i=list.findIndex(b=>b.id===block.id),b=list[i];
      if(action==='pull'){
        Object.assign(b,{s:imported.s,e:imported.e,text:imported.text});
        if(imported.key!==key){list.splice(i,1);(data.sched[imported.key]||=[]).push(b);}
      }
      b.gc={calendar,eventId:event.id,etag:event.etag,base:fingerprint(event)};
    });
  }
  assert();const events=await api.events(calendar,min,max);assert();
  for(const event of events){
    const linked=Object.values(getData().sched||{}).flat().some(b=>b.gc?.calendar===calendar&&b.gc.eventId===event.id);
    if(linked)continue;
    const item=importable(event,zone);if(!item){extras.push(event);continue;}
    const pending=event.extendedProperties?.private?.bujoId&&current(event.extendedProperties.private.bujoId);
    if(pending?.block.google&&!pending.block.gc){
      if(event.id===await exportEventId(uid,pending.block)){
        if(fingerprint(event)===fingerprint(payload(pending.key,pending.block,zone)))await set(copy(pending),data=>{data.sched[pending.key].find(b=>b.id===pending.block.id).gc={calendar,eventId:event.id,etag:event.etag,base:fingerprint(event)};});
        else issues.push({id:pending.block.id,message:'다른 기기에서 등록한 일정과 달라요. Google 원본을 확인해 주세요.'});
        continue;
      }
    }
    const id='g'+await stableEventId(calendar,event.id);assert();
    if(current(id))continue;
    update(data=>{(data.sched[item.key]||=[]).push({id,s:item.s,e:item.e,text:item.text,kind:'plan',color:2,google:true,gc:{calendar,eventId:event.id,etag:event.etag,base:fingerprint(event)}});});
  }
  if(!await persist())throw new Error('불러온 일정을 Firebase에 저장하지 못했어요.');assert();
  return {issues,extras};
}
