import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copy,instant,parts,payload,importable,decision,fingerprint,reconcile,createCalendarAPI,exportEventId} from '../google-calendar.mjs';
import {emptyJournal,validateJournal} from '../journal-core.mjs';
const zone='Asia/Seoul',key='2026-09-20';
const block=()=>({id:'test1',s:6,e:7,kind:'plan',text:'독서',color:2,google:true});
const ev=(b=block(),day=key)=>({...payload(day,b,zone),id:'event1',etag:'"1"',status:'confirmed'});
function rig(b=block(),event){
  const data=emptyJournal();data.sched[key]=[b];const remote=new Map(event?[[event.id,copy(event)]]:[]),writes=[];
  const api={get:async(c,id)=>copy(remote.get(id)||null),events:async()=>[...remote.values()].filter(e=>e.status!=='cancelled').map(copy),
    insert:async(c,value)=>{writes.push(['insert',copy(value)]);const e={...copy(value),etag:'"1"'};remote.set(e.id,e);return copy(e);},
    patch:async(c,id,p,etag)=>{assert.equal(etag,remote.get(id).etag);writes.push(['patch',copy(p)]);const e={...remote.get(id),...copy(p),etag:'"2"'};remote.set(id,e);return copy(e);},remove:async()=>{throw Error('Unexpected automatic delete');}};
  const args={api,uid:'user',calendar:'calendar',zone,min:'2026-09-01T00:00:00Z',max:'2026-10-01T00:00:00Z',getData:()=>data,update:fn=>fn(data),persist:async()=>true};
  return {data,remote,writes,api,args,run:()=>reconcile(args)};
}
function linked(){const b=block(),e=ev(b);b.gc={calendar:'calendar',eventId:e.id,etag:e.etag,base:fingerprint(e)};return {b,e};}
test('Korean timezone conversion, midnight and DST dates preserve exact instants',()=>{
  assert.equal(instant(key,540,zone),'2026-09-20T00:00:00.000Z');
  assert.equal(instant(key,1440,zone),'2026-09-20T15:00:00.000Z');
  assert.equal(instant('2026-03-08',540,'America/New_York'),'2026-03-08T13:00:00.000Z');
  assert.throws(()=>instant('2026-03-08',150,'America/New_York'));
  assert.equal(parts('2026-09-20T15:00:00Z',zone).key,'2026-09-21');
});
test('import never rounds 15-minute times or truncates all-day, overnight, guests',()=>{
  assert.equal(importable({...ev(),start:{date:'2026-09-20'},end:{date:'2026-09-21'}},zone),null);
  assert.equal(importable({...ev(),attendees:[{email:'guest@example.com'}]},zone),null);
  assert.equal(importable({...ev(),start:{dateTime:'2026-09-20T09:15:00+09:00'}},zone),null);
  assert.equal(importable(ev({...block(),s:0,e:35}),zone).e,35);
  assert.equal(importable({...ev(),end:{dateTime:'2026-09-21T01:00:00+09:00'}},zone),null);
});
test('same, local, remote and concurrent changes are distinguished',()=>{
  const {b,e}=linked();assert.equal(decision(key,b,e,zone),'same');
  assert.equal(decision(key,{...b,text:'local'},e,zone),'push');
  assert.equal(decision(key,b,{...e,summary:'remote'},zone),'pull');
  assert.equal(decision(key,{...b,text:'local'},{...e,summary:'remote'},zone),'conflict');
});
test('unchecked and legacy records never export',async()=>{
  const r=rig({...block(),google:false});r.data.sched[key].push({...block(),id:'legacy',google:undefined});
  await r.run();assert.equal(r.writes.length,0);
});
test('opt-in creates one event, repeated sync does not duplicate; no notes leaked',async()=>{
  const r=rig();r.data.journal[key]='private diary';await r.run();await r.run();
  assert.equal(r.writes.length,1);assert.equal(r.data.sched[key].length,1);
  assert.equal(JSON.stringify(r.writes).includes('private diary'),false);
  assert.ok(r.data.sched[key][0].gc);assert.equal(r.writes[0][1].id,await exportEventId('user',block()));
});
test('lost POST response reconciles existing deterministic event without duplicate',async()=>{
  const r=rig(),original=r.api.insert;r.api.insert=async(...args)=>{await original(...args);throw Error('network lost');};
  await assert.rejects(r.run());r.api.insert=original;await r.run();assert.equal(r.writes.length,1);assert.ok(r.data.sched[key][0].gc);
});
test('failed Firebase acknowledgement does not create duplicate events',async()=>{
  const r=rig();r.args.persist=async()=>false;await assert.rejects(r.run());r.args.persist=async()=>true;await r.run();assert.equal(r.writes.length,1);
});
test('local drag and title change PATCH only edited fields with current etag',async()=>{
  const {b,e}=linked(),r=rig(b,{...e,description:'retain me',location:'retain here'});b.s=8;b.e=9;b.text='new';await r.run();
  assert.equal(r.writes[0][0],'patch');assert.equal(r.remote.get(e.id).description,'retain me');assert.equal(r.remote.get(e.id).location,'retain here');
});
test('Google time/date/title changes move same block instead of duplicating',async()=>{
  const {b,e}=linked(),r=rig(b,{...e,...payload('2026-09-21',{...b,s:10,e:11,text:'Google edit'},zone),etag:'"2"'});
  await r.run();assert.equal(r.data.sched[key].length,0);assert.equal(r.data.sched['2026-09-21'][0].id,b.id);assert.equal(r.data.sched['2026-09-21'][0].text,'Google edit');assert.equal(r.writes.length,0);
});
test('two-sided conflict never overwrites either side',async()=>{
  const {b,e}=linked(),r=rig(b,{...e,summary:'Google edit'});b.text='local edit';
  const result=await r.run();assert.equal(result.issues.length,1);assert.equal(r.writes.length,0);assert.equal(b.text,'local edit');
});
test('remote deletion retains local record privately and advances id generation',async()=>{
  const {b}=linked(),r=rig(b);await r.run();assert.equal(b.google,false);assert.equal(b.googleVersion,1);assert.equal(b.gc,undefined);assert.equal(r.writes.length,0);
  assert.notEqual(await exportEventId('user',b),await exportEventId('user',block()));
});
test('foreign calendar links are not pushed to newly selected calendar',async()=>{
  const {b}=linked();b.gc.calendar='other';const r=rig(b);await r.run();assert.equal(r.writes.length,0);
});
test('Google imported events include recurring instances with distinct IDs',async()=>{
  const r=rig({...block(),google:false});r.remote.set('first',{...ev(),id:'first',recurringEventId:'series'});r.remote.set('second',{...ev(),id:'second',recurringEventId:'series'});
  await r.run();await r.run();assert.equal(r.data.sched[key].length,3);assert.equal(new Set(r.data.sched[key].map(b=>b.id)).size,3);
});
test('account change during GET prevents local mutation and all writes',async()=>{
  const {b,e}=linked(),r=rig(b,e);let valid=true;r.args.valid=()=>valid;
  r.api.get=async()=>{valid=false;return e;};await assert.rejects(r.run());assert.equal(r.writes.length,0);
});
test('local concurrent edit is not clobbered by returning remote response',async()=>{
  const {b,e}=linked(),r=rig(b,e);r.api.get=async()=>{b.text='in-flight change';return {...e,summary:'remote'};};await assert.rejects(r.run());assert.equal(b.text,'in-flight change');
});
test('API follows pagination, escapes IDs and uses If-Match; access token never in URL',async()=>{
  const calls=[];const api=createCalendarAPI(()=> 'test-token',async(url,options)=>{
    calls.push([url,options]);return new Response(JSON.stringify(calls.length===1?{items:[{id:'a'}],nextPageToken:'next'}:{items:[{id:'b'}]}),{status:200});
  });
  assert.equal((await api.events('name@example.com','min','max')).length,2);assert.ok(calls[1][0].includes('pageToken=next'));assert.ok(calls[0][0].includes('name%40example.com'));assert.ok(!calls[0][0].includes('test-token'));
  await api.patch('c','e',{summary:'x'},'"tag"');assert.equal(calls[2][1].headers['If-Match'],'"tag"');
});
test('401 and 412 surface without unsafe retry',async()=>{
  for(const code of [401,412]){const api=createCalendarAPI(()=> 'token',async()=>new Response('{"error":{"message":"failed"}}',{status:code}));await assert.rejects(api.patch('c','e',{},'tag'),e=>e.status===code);}
});
test('backup round-trip preserves opt-in metadata and rejects invalid fields',()=>{
  const {b}=linked(),data=emptyJournal();data.sched[key]=[b];data.googleCalendar={calendar:'c',zone,defaultSend:false};
  assert.deepEqual(validateJournal(copy(data)).sched,data.sched);data.sched[key][0].google='yes';assert.throws(()=>validateJournal(data));
});
