import test from 'node:test';
import assert from 'node:assert/strict';
import {allNotes,setTag,replaceTag,visibleByTags,links} from '../modules/journal/notebook.mjs';
import {emptyJournal,validateJournal,mergeJournal,journalEntryDates} from '../modules/journal/journal-core.mjs';
import {reconcile,payload,fingerprint} from '../modules/journal/google-calendar.mjs';
import {exerciseCards,sameGoogleUser} from '../shared/routine-records.mjs';
test('legacy backup and multiple notes survive roundtrip without rewriting daily prose',()=>{
 const d=emptyJournal();d.journal['2026-11-04']='Original';d.entries={n:{date:'2026-11-05',title:'Trade',body:'Reason',tags:[]}};
 const restored=validateJournal(JSON.parse(JSON.stringify(d)));assert.equal(restored.journal['2026-11-04'],'Original');assert.equal(allNotes(restored).length,2);assert.deepEqual(journalEntryDates(restored),['2026-11-04','2026-11-05']);
});
test('duplicate normalized tags rejected; merge and deletion preserve records and all references',()=>{
 const d=emptyJournal();setTag(d,'a',' #Finance ');setTag(d,'b','Trading');assert.throws(()=>setTag(d,'c','finance'));
 d.entries={n:{date:'2026-11-04',title:'T',body:'B',tags:['a','b']}};d.dayTags={'2026-11-04':['a']};d.sched={'2026-11-04':[{tags:['a']}]};d.googleEventTags={'cal|event':['a']};d.tagView={hidden:['a'],hideUntagged:false};
 replaceTag(d,'a','b');assert.deepEqual(d.entries.n.tags,['b']);assert.deepEqual(d.dayTags['2026-11-04'],['b']);assert.deepEqual(d.googleEventTags['cal|event'],['b']);assert.deepEqual(d.sched['2026-11-04'][0].tags,['b']);replaceTag(d,'b');assert.equal(d.entries.n.body,'B');assert.deepEqual(d.entries.n.tags,[]);
});
test('tag visibility is OR across enabled tags and never changes sync flags',()=>{
 const d={tagView:{hidden:['finance'],hideUntagged:true}};assert.equal(visibleByTags(d,['finance']),false);assert.equal(visibleByTags(d,['finance','personal']),true);assert.equal(visibleByTags(d,[]),false);
});
test('links resolve stable IDs and names; independent notes merge',()=>{
 const d=emptyJournal();d.entries={a:{date:'2026-11-04',title:'A',body:'[[b]]',tags:[]},b:{date:'2026-11-04',title:'B',body:'',tags:[]}};
 assert.equal(links(d.entries.a.body,allNotes(d))[0].matches[0].id,'b');const l=structuredClone(d),r=structuredClone(d);l.entries.a.body='left';r.entries.b.body='right';const merged=mergeJournal(d,l,r);assert.equal(merged.conflicts.length,0);assert.equal(merged.value.entries.b.body,'right');
});
test('invalid notebook backup rejected',()=>{const d=emptyJournal();d.entries={n:{date:'2026-11-04',title:'T',body:'B',tags:'bad'}};assert.throws(()=>validateJournal(d));});
function event(id='remote'){return {id,etag:'v1',summary:'Existing',start:{dateTime:'2026-11-04T09:00:00Z'},end:{dateTime:'2026-11-04T10:00:00Z'}};}
test('Google listing never imports or writes unselected events',async()=>{
 const d=emptyJournal();let writes=0;const result=await reconcile({api:{events:async()=>[event()],insert:async()=>writes++,patch:async()=>writes++,remove:async()=>writes++},uid:'u',calendar:'c',zone:'UTC',min:'',max:'',getData:()=>d,update:fn=>fn(d),persist:async()=>true});assert.deepEqual(d.sched,{});assert.equal(writes,0);assert.equal(result.extras.length,1);
});
test('disconnected events are never pushed or deleted; reconnect reuses identity',async()=>{
 const e=event(),d=emptyJournal(),b={id:'b',s:6,e:7,text:'Existing',google:false,gc:{calendar:'c',eventId:e.id,etag:e.etag,base:fingerprint(e)}};d.sched['2026-11-04']=[b];let gets=0,inserts=0;
 const args={api:{get:async()=>{gets++;return e;},events:async()=>[e],insert:async()=>{inserts++;}},uid:'u',calendar:'c',zone:'UTC',min:'',max:'',getData:()=>d,update:fn=>fn(d),persist:async()=>true};await reconcile(args);assert.equal(gets,0);b.google=true;await reconcile(args);assert.equal(gets,1);assert.equal(inserts,0);assert.equal(b.gc.eventId,'remote');
});
test('per-event calendar prevents export into the default destination',async()=>{
 const d=emptyJournal();d.sched['2026-11-04']=[{id:'b',s:6,e:7,text:'T',google:true,googleCalendar:'other'}];let called=false;await reconcile({api:{events:async()=>[],get:async()=>{called=true;}},uid:'u',calendar:'default',zone:'UTC',min:'',max:'',getData:()=>d,update:fn=>fn(d),persist:async()=>true});assert.equal(called,false);
});
test('routine cards use the current source snapshot and exclude unrelated private records',()=>{
 const exercise={id:'e',date:'2026-11-04',segments:[{kind:'달리기',minutes:30}],strength:false,note:'Good'};
 const d={exercises:[exercise],privateRecords:[{secret:'not for journal'}]};assert.equal(exerciseCards(d).length,1);exercise.segments[0].minutes=40;assert.match(exerciseCards(d)[0].text,/40/);d.exercises=[];assert.deepEqual(exerciseCards(d),[]);
});
test('routine ownership checks Google subject rather than project-local UID or email',()=>{
 const user=(uid,subject)=>({uid,providerData:[{providerId:'google.com',uid:subject}]});assert.equal(sameGoogleUser(user('j','g'),user('r','g')),true);assert.equal(sameGoogleUser(user('j','g'),user('j','other')),false);assert.equal(sameGoogleUser(null,user('r','g')),false);
});
