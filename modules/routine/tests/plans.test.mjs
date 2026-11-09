import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,scheduled,validate,backup,parseBackup} from '../lib/routine.ts';
const week='2026-09-07';
const plan={id:'custom-1',day:0,name:'소고기 먹기 전 걷기',time:'19:30',kind:'cardio',minutes:30};
test('날짜별 계획은 해당 날짜에만 적용하고 빈 배열은 휴식일로 유지',()=>{const d=fresh();d.exercisePlans={'2026-09-07':[plan],'2026-09-08':[]};const ps=scheduled(validate(d),week);assert.equal(ps.filter(p=>p.date==='2026-09-07')[0].time,'19:30');assert.equal(ps.filter(p=>p.date==='2026-09-08').length,0);assert.equal(scheduled(d,'2026-09-14').length,6);assert.equal(d.exercises.length,0)});
test('식사·운동 계획은 백업과 웹 상태 검증을 통과해 보존',()=>{const d=fresh();d.exercisePlans={'2026-09-07':[plan]};d.mealPlans={'2026-09-07':{'아침':'달걀','점심':'돼지고기','저녁':'생선','영양제':''}};const restored=parseBackup(backup(validate(d))).data;assert.deepEqual(restored.exercisePlans,d.exercisePlans);assert.deepEqual(restored.mealPlans,d.mealPlans)});
test('잘못된 계획의 날짜·시각·종류·분량·식사 형식 거부',()=>{for(const edit of [{time:'29:00'},{minutes:0},{kind:'other'},{name:''}]){const d=fresh();d.exercisePlans={'2026-09-07':[{...plan,...edit}]};assert.throws(()=>validate(d))}const d=fresh();d.mealPlans={'bad':{'아침':'','점심':'','저녁':'','영양제':''}};assert.throws(()=>validate(d));d.mealPlans={'2026-09-07':{'아침':3,'점심':'','저녁':'','영양제':''}};assert.throws(()=>validate(d))});
test('계획에서 실제 기록과 같은 운동 종류를 보존',()=>{for(const kind of ['walking','running','swimming','cycling','strength','cardio']){const d=fresh();d.exercisePlans={'2026-09-07':[{...plan,kind}]};assert.equal(validate(d).exercisePlans['2026-09-07'][0].kind,kind)}});
