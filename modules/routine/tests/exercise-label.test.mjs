import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseLabel,cardio,fresh,validate,backup,parseBackup} from '../lib/routine.ts';
const record={id:'exercise',date:'2026-09-14',strength:true,strengthMinutes:30,strengthName:'스쿼트, 벤치프레스',note:'',segments:[{kind:'수영',minutes:20,intensity:'moderate'},{kind:'걷기',minutes:10,intensity:'low'},{kind:'수영',minutes:5,intensity:'high'},{kind:'휴식',minutes:3,intensity:'excluded'},{kind:'러닝',minutes:0,intensity:'moderate'}]};
test('종목별 실제 시간은 집계 대상 시간과 구분하고 중복 종목을 합친다',()=>{assert.equal(exerciseLabel(record),'스쿼트, 벤치프레스 30분 · 수영 25분 · 걷기 10분 · 휴식 3분');assert.equal(cardio(record),25)});
test('기존 근력 기록은 이름 없이 표시된다',()=>assert.equal(exerciseLabel({...record,strengthName:undefined,segments:[]}),'근력 30분'));
test('근력 이름은 백업 복원에도 보존되고 잘못된 값은 거절한다',()=>{const data=fresh();data.exercises=[record];assert.equal(parseBackup(backup(data)).data.exercises[0].strengthName,record.strengthName);for(const strengthName of [null,123,'x'.repeat(201)])assert.throws(()=>validate({...data,exercises:[{...record,strengthName}]}))});

test('distance appears next to activities, sums mixed units, and survives backup',()=>{
 const e={...record,strength:false,segments:[{kind:'러닝',minutes:30,intensity:'moderate',distance:5,distanceUnit:'km'},{kind:'러닝',minutes:5,intensity:'high',distance:500,distanceUnit:'m'},{kind:'수영',minutes:20,intensity:'moderate',distance:500,distanceUnit:'m'}]};
 assert.equal(exerciseLabel(e),'러닝 5.5 km / 35분 · 수영 500 m / 20분');assert.equal(cardio(e),55);
 const data=fresh();data.exercises=[e];assert.deepEqual(parseBackup(backup(data)).data.exercises,[e]);
 for(const patch of [{distance:-1},{distance:Infinity},{distance:'5'},{distanceUnit:'miles'},{distanceUnit:undefined}])assert.throws(()=>validate({...data,exercises:[{...e,segments:[{...e.segments[0],...patch}]}]}));
});
