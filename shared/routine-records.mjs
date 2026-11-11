export function sameGoogleUser(a,b){const google=u=>u?.providerData?.find(p=>p.providerId==='google.com')?.uid;return !!google(a)&&google(a)===google(b);}
export function exerciseCards(data){
  if(!Array.isArray(data.exercises))throw Error('운동 기록 형식 오류');
  return data.exercises.map(e=>{
    if(typeof e.id!=='string'||typeof e.date!=='string'||!Array.isArray(e.segments))throw Error('운동 기록 형식 오류');
    const parts=e.segments.map(s=>`${s.kind} · ${s.minutes}분${s.distance?' · '+s.distance+' '+s.distanceUnit:''}`);
    if(e.strength)parts.unshift(`${e.strengthName||'근력운동'} · ${e.strengthMinutes}분`);
    const minutes=e.segments.reduce((n,s)=>n+(Number(s.minutes)||0),0)+(e.strength?Number(e.strengthMinutes)||0:0);
    return {id:e.id,date:e.date,time:e.startTime||'',minutes,text:parts.join(' / '),note:typeof e.note==='string'?e.note:''};
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
}
