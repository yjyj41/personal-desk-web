import test from 'node:test';
import assert from 'node:assert/strict';
import {moveZone} from '../google-calendar-ui.mjs';

test('changing the sync zone keeps your own blocks and moves Google copies to their real time',()=>{
 // 11:30 block you made (slot 11), Google copy shown at Seoul 03:30 next day is out of grid; Seoul 20:00 = London 11:00 (GMT from 25 Oct); Seoul 06:00 on 27th = London 21:00 on 26th.
 const data={sched:{'2026-10-26':[{id:'mine',s:11,e:12,text:'mine',gc:{eventId:'x'}},{id:'gabc',s:28,e:29,text:'seoul 20:00',gc:{eventId:'y'}}],'2026-10-27':[{id:'gdef',s:0,e:1,text:'seoul 06:00',gc:{eventId:'z'}}]}};
 const moved=moveZone(data,'Asia/Seoul','Europe/London');
 assert.equal(moved,2);
 assert.deepEqual(data.sched['2026-10-26'].map(b=>[b.id,b.s,b.e]),[['mine',11,12],['gabc',10,11],['gdef',30,31]]);
 assert.equal(data.sched['2026-10-27'],undefined);
 // A copy that would land before 06:00 is dropped from the journal (the Google original is untouched).
 const early={sched:{'2026-10-26':[{id:'gq',s:14,e:15,text:'seoul 13:00 = london 04:00',gc:{eventId:'q'}}]}};
 moveZone(early,'Asia/Seoul','Europe/London');
 assert.deepEqual(early.sched,{});
});
