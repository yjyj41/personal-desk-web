import test from 'node:test';import assert from 'node:assert/strict';
import {mergeSleep,sleepHours,sleepClock,sleepOffset} from '../lib/sleep.ts';
import {fresh,validate,parseBackup,backup,avg} from '../lib/routine.ts';
const life=(ranges)=>({id:'sleep-test',date:'2026-09-08',sleep:sleepHours('2026-09-08',ranges),sleepIntervals:ranges,weight:63,alcohol:'미기록',pelvic:'미시작',discomfort:'미기록',relax:'미기록'});
test('수면의 질은 선택 사항이며 웹 저장과 백업에 보존',()=>{const d=fresh();for(const quality of [undefined,null,1,2,3,4,5]){d.life=[{...life([]),sleep:null,sleepQuality:quality}];assert.equal(parseBackup(backup(validate(d))).data.life[0].sleepQuality,quality)}for(const quality of [0,6,1.5,'좋음']){d.life=[{...life([]),sleep:null,sleepQuality:quality}];assert.throws(()=>validate(d))}});
test('시간표의 전날 20시와 당일 11시',()=>{assert.equal(sleepClock(0),'20:00');assert.equal(sleepClock(900),'11:00');assert.equal(sleepOffset('23:00'),180);assert.equal(sleepOffset('07:00'),660)});
test('자정을 넘긴 실제 수면',()=>assert.equal(sleepHours('2026-09-08',[{start:180,end:660}]),8));
test('하루 여러 구간을 합산하고 깨어 있던 시간 제외',()=>assert.equal(sleepHours('2026-09-08',[{start:180,end:360},{start:390,end:660}]),7.5));
test('겹친 구간 중복 합산 방지',()=>assert.deepEqual(mergeSleep([{start:300,end:600},{start:180,end:400}]),[{start:180,end:600}]));
test('역전·시간범위 외·비정상 입력 거부',()=>{for(const r of [{start:100,end:100},{start:500,end:100},{start:-1,end:300},{start:0,end:901},{start:NaN,end:60}])assert.throws(()=>mergeSleep([r]))});
test('웹 데이터와 백업에 여러 구간 보존',()=>{const d=fresh();d.life=[life([{start:120,end:300},{start:400,end:660}])];assert.deepEqual(parseBackup(backup(validate(d))).data.life,d.life)});
test('기존 총 시간만 있는 수면 기록 호환',()=>{const d=fresh();const r=life([]);delete r.sleepIntervals;r.sleep=7.5;d.life=[r];assert.equal(validate(d).life[0].sleep,7.5)});
test('구간과 총 시간 불일치·중복 구간 거부',()=>{const d=fresh();d.life=[{...life([{start:180,end:660}]),sleep:1}];assert.throws(()=>validate(d));d.life=[life([{start:180,end:660},{start:300,end:400}])];assert.throws(()=>validate(d))});
test('모든 구간 삭제는 미기록, 체중 보존',()=>{const d=fresh();d.life=[{...life([]),sleep:null}];assert.equal(validate(d).life[0].weight,63);assert.equal(avg(d.life.map(l=>l.sleep)),null)});

test('sleep notes survive backup, clearing, and legacy hours without intervals',()=>{
 const d=fresh();const r=life([]);delete r.sleepIntervals;r.sleep=7.5;
 for(const sleepNote of [undefined,'','중간에 한 번 깼지만 아침엔 개운함']){d.life=[{...r,sleepNote}];const result=parseBackup(backup(d)).data.life[0];assert.equal(result.sleepNote,sleepNote);assert.equal(result.sleep,7.5);assert.equal(result.weight,63)}
 for(const sleepNote of [null,123,'x'.repeat(201),'first\nsecond']){d.life=[{...r,sleepNote}];assert.throws(()=>validate(d))}
});
