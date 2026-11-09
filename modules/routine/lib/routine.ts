import {mergeSleep,sleepHours,type SleepInterval} from './sleep.ts';
export type Segment={kind:string;intensity:'low'|'moderate'|'high'|'excluded';minutes:number;distance?:number;distanceUnit?:'km'|'m'};
export type Exercise={id:string;date:string;startTime?:string;segments:Segment[];strength:boolean;strengthMinutes:number;strengthName?:string;note:string};
export const validTime=(v:unknown)=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function timeLabel(time?:string){if(!time)return '시각 미기록';const hour=Number(time.slice(0,2));return `${hour<6?'새벽':hour<12?'아침':hour<18?'오후':hour<21?'저녁':'밤'} ${time}`}
export function exerciseLabel(e:Exercise){
 const byKind=new Map<string,{minutes:number;meters:number;unit:'km'|'m'}>();
 for(const s of e.segments)if(s.minutes>0){
  const total=byKind.get(s.kind)??{minutes:0,meters:0,unit:s.distanceUnit??'m'};
  total.minutes+=s.minutes;
  if(s.distance&&s.distanceUnit){total.meters+=s.distance*(s.distanceUnit==='km'?1000:1);if(s.distanceUnit==='km')total.unit='km'}
  byKind.set(s.kind,total);
 }
 return [e.strength?`${e.strengthName?.trim()||'근력'} ${e.strengthMinutes}분`:'',...Array.from(byKind,([kind,{minutes,meters,unit}])=>`${kind}${meters>0?` ${Number((meters/(unit==='km'?1000:1)).toFixed(6))} ${unit} /`:''} ${Number(minutes.toFixed(2))}분`)].filter(Boolean).join(' · ');
}
export type Meal={id:string;date:string;slot:string;name:string;protein:number|null;kcal:number|null;plants:number|null;fish:boolean;beans:boolean;nuts:boolean;whole:boolean};
export type Life={id:string;date:string;sleep:number|null;sleepIntervals?:SleepInterval[];sleepQuality?:number|null;sleepNote?:string;weight:number|null;alcohol:string;pelvic:string;discomfort:string;relax:string};
export type PrivateRecord={id:string;date:string;ehs:string;maintenance:string;context:string;note:string};
export type Goal={minutes:number;sessions:number;strength:number};
export type PlanKind='cardio'|'walking'|'running'|'swimming'|'cycling'|'strength';
export type Plan={id:string;day:number;name:string;time:string;kind:PlanKind;minutes:number};
export const planKinds:PlanKind[]=['cardio','walking','running','swimming','cycling','strength'];
export type MealPlan=Record<'아침'|'점심'|'저녁'|'영양제',string>;
export type Data={version:2;exercisePlans?:Record<string,Plan[]>;mealPlans?:Record<string,MealPlan>;start:string;enabled:boolean;hidden:boolean;exercises:Exercise[];meals:Meal[];life:Life[];privateRecords:PrivateRecord[];goals:Record<string,Goal>;moves:Record<string,string>;templates:{effective:string;plans:Plan[]}[]};
export const KEY='routine160.v2';
export const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function addDays(date:string,n:number){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d)}
export function monday(date:string){const d=new Date(date+'T12:00:00');return addDays(date,-((d.getDay()+6)%7))}
export const days=['월','화','수','목','금','토','일'];
export const initialPlans:Plan[]=[{id:'a',day:1,name:'전신 근력 A',time:'07:00',kind:'strength',minutes:45},{id:'walk',day:1,name:'경사 걷기',time:'07:55',kind:'cardio',minutes:40},{id:'run',day:3,name:'러닝 + 빠른 걷기',time:'07:40',kind:'cardio',minutes:40},{id:'b',day:5,name:'전신 근력 B',time:'10:00',kind:'strength',minutes:45},{id:'sat',day:5,name:'러닝 / 빠른 걷기',time:'10:55',kind:'cardio',minutes:40},{id:'swim',day:6,name:'수영',time:'10:00',kind:'cardio',minutes:40}];
export const fresh=():Data=>({version:2,start:localDate(),enabled:false,hidden:true,exercises:[],meals:[],life:[],privateRecords:[],goals:{},moves:{},templates:[]});
export const goalFor=(d:Data,w:string):Goal=>d.goals[w]??{minutes:160,sessions:4,strength:2};
export const cardio=(e:Exercise)=>e.segments.filter(s=>s.intensity==='moderate'||s.intensity==='high').reduce((a,s)=>a+s.minutes,0);
export const inWeek=(date:string,w:string)=>date>=w&&date<addDays(w,7);
export function totals(es:Exercise[]){const long=es.filter(e=>cardio(e)>=40);return{minutes:es.reduce((a,e)=>a+cardio(e),0),sessions:long.length,dates:new Set(long.map(e=>e.date)).size,strength:es.filter(e=>e.strength&&e.strengthMinutes>0).length}}
export const upsert=<T extends {id:string}>(list:T[],r:T)=>[...list.filter(x=>x.id!==r.id),r];
export function avg(values:(number|null)[]){const v=values.filter((n):n is number=>n!==null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null}
export function scheduled(d:Data,w:string){const t=d.templates.filter(t=>t.effective<=w).sort((a,b)=>b.effective.localeCompare(a.effective))[0];const base=(t?.plans??initialPlans).map(p=>({...p,date:d.moves[w+'|'+p.id]??addDays(w,p.day)}));return days.flatMap((_,i)=>{const date=addDays(w,i);return d.exercisePlans?.[date]?.map(p=>({...p,date}))??base.filter(p=>p.date===date)})}
export function movePlan(d:Data,w:string,id:string,date:string,repeat:boolean):Data{if(!repeat)return{...d,moves:{...d.moves,[w+'|'+id]:date}};const plans=scheduled(d,w).map(({date:_,...p})=>p.id===id?{...p,day:(new Date(date+'T12:00:00').getDay()+6)%7}:p);const moves={...d.moves};delete moves[w+'|'+id];return{...d,moves,templates:[...d.templates.filter(t=>t.effective!==w),{effective:w,plans}]}}
export function privateStats(records:PrivateRecord[]){return{ehs:['0','1','2','3','4'].map(k=>({label:k,count:records.filter(r=>r.ehs===k).length})),maintenance:['충분히 유지','원치 않게 중간에 약해짐'].map(k=>({label:k,count:records.filter(r=>r.maintenance===k).length})),sample:records.filter(r=>['0','1','2','3','4'].includes(r.ehs)).length}}
const isObj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=(v:unknown)=>typeof v==='string'&&v.length<=5000;
export function validDate(v:unknown):v is string{return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&localDate(new Date(v+'T12:00:00'))===v}
const num=(v:unknown,min=0,max=10000)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const nullable=(v:unknown,max:number)=>v===null||num(v,0,max);
const bool=(v:unknown)=>typeof v==='boolean';
const base=(v:unknown):v is Record<string,unknown>=>isObj(v)&&str(v.id)&&!!v.id&&validDate(v.date);
const enumOf=(v:unknown,a:string[])=>typeof v==='string'&&a.includes(v);
function list(v:unknown,check:(v:any)=>boolean){return Array.isArray(v)&&v.length<=30000&&v.every(check)&&new Set(v.map(r=>r.id)).size===v.length}
export function validate(raw:unknown):Data{if(!isObj(raw)||raw.version!==2||!validDate(raw.start)||!bool(raw.enabled)||!bool(raw.hidden))throw Error('지원하지 않는 데이터 버전 또는 잘못된 기본 정보입니다. 원본 데이터는 유지됩니다.');
if(!list(raw.exercises,e=>base(e)&&(e.startTime===undefined||e.startTime===''||validTime(e.startTime))&&Array.isArray(e.segments)&&e.segments.length<=30&&e.segments.every((s:any)=>isObj(s)&&str(s.kind)&&enumOf(s.intensity,['low','moderate','high','excluded'])&&num(s.minutes,0,1440)&&(s.distance===undefined||(num(s.distance,0,10000000)&&enumOf(s.distanceUnit,['km','m'])))&&(s.distanceUnit===undefined||enumOf(s.distanceUnit,['km','m'])))&&(e.strengthName===undefined||(typeof e.strengthName==='string'&&e.strengthName.length<=200))&&bool(e.strength)&&num(e.strengthMinutes,0,1440)&&str(e.note)))throw Error('운동 기록 형식이 올바르지 않습니다.');
if(!list(raw.meals,m=>base(m)&&str(m.slot)&&str(m.name)&&nullable(m.protein,1000)&&nullable(m.kcal,20000)&&nullable(m.plants,100)&&[m.fish,m.beans,m.nuts,m.whole].every(bool)))throw Error('식사 기록 형식이 올바르지 않습니다.');
if(!list(raw.life,l=>base(l)&&(l.sleepQuality===undefined||l.sleepQuality===null||(num(l.sleepQuality,1,5)&&Number.isInteger(l.sleepQuality)))&&(l.sleepNote===undefined||(typeof l.sleepNote==='string'&&l.sleepNote.length<=200&&!/[\r\n]/.test(l.sleepNote)))&&nullable(l.sleep,24)&&(l.sleepIntervals===undefined||(Array.isArray(l.sleepIntervals)&&l.sleepIntervals.length<=100&&l.sleepIntervals.every((r:any)=>isObj(r)&&num(r.start,0,900)&&num(r.end,0,900)&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&Number(r.end)>Number(r.start))&&mergeSleep(l.sleepIntervals).length===l.sleepIntervals.length&&(l.sleepIntervals.length===0?l.sleep===null:Math.abs(Number(l.sleep)-sleepHours(String(l.date),l.sleepIntervals))<0.001)))&&nullable(l.weight,500)&&enumOf(l.alcohol,['미기록','마시지 않음','마심'])&&enumOf(l.pelvic,['미시작','수행','쉬기','불편으로 중단','전문가 상담 예정'])&&enumOf(l.discomfort,['미기록','없음','있음'])&&enumOf(l.relax,['미기록','가능','어려움'])))throw Error('생활 기록 형식이 올바르지 않습니다.');
if(!list(raw.privateRecords,r=>base(r)&&enumOf(r.ehs,['0','1','2','3','4','해당 없음','기억 안 남'])&&enumOf(r.maintenance,['충분히 유지','원치 않게 중간에 약해짐','해당 없음','기억 안 남'])&&enumOf(r.context,['미기록','파트너와','혼자'])&&str(r.note)))throw Error('개인 기록 형식이 올바르지 않습니다.');
if(!isObj(raw.goals)||!Object.entries(raw.goals).every(([w,g])=>validDate(w)&&monday(w)===w&&isObj(g)&&num(g.minutes,1,2000)&&num(g.sessions,1,30)&&num(g.strength,1,20)))throw Error('목표 형식이 올바르지 않습니다.');
if(!isObj(raw.moves)||!Object.entries(raw.moves).every(([k,v])=>/^\d{4}-\d{2}-\d{2}\|(a|b|walk|run|sat|swim)$/.test(k)&&validDate(v)&&inWeek(v,k.split('|')[0]))||!Array.isArray(raw.templates)||!raw.templates.every(t=>isObj(t)&&validDate(t.effective)&&monday(t.effective)===t.effective&&list(t.plans,p=>isObj(p)&&enumOf(p.id,['a','b','walk','run','sat','swim'])&&num(p.day,0,6)&&Number.isInteger(p.day)&&str(p.name)&&str(p.time)&&enumOf(p.kind,planKinds)&&num(p.minutes,1,1440))))throw Error('일정 형식이 올바르지 않습니다.');
if(raw.exercisePlans!==undefined&&(!isObj(raw.exercisePlans)||!Object.entries(raw.exercisePlans).every(([date,plans])=>validDate(date)&&Array.isArray(plans)&&plans.length<=20&&list(plans,p=>isObj(p)&&str(p.id)&&!!p.id&&num(p.day,0,6)&&Number.isInteger(p.day)&&str(p.name)&&!!String(p.name).trim()&&validTime(p.time)&&enumOf(p.kind,planKinds)&&num(p.minutes,1,1440)))))throw Error('운동 계획 형식이 올바르지 않습니다.');
if(raw.mealPlans!==undefined&&(!isObj(raw.mealPlans)||!Object.entries(raw.mealPlans).every(([date,p])=>validDate(date)&&isObj(p)&&['아침','점심','저녁','영양제'].every(k=>str(p[k])&&String(p[k]).length<=500))))throw Error('식사 계획 형식이 올바르지 않습니다.');
return structuredClone(raw) as Data}
export function backup(d:Data,include=false){const {privateRecords,enabled,...rest}=d;return{format:'routine160',version:2,includesPrivate:include,data:include?d:{...rest,enabled:false}}}
export function parseBackup(raw:unknown){if(!isObj(raw)||raw.format!=='routine160'||raw.version!==2||!bool(raw.includesPrivate)||!isObj(raw.data))throw Error('루틴 160 v2 백업 파일이 아닙니다.');const data=validate({...raw.data,privateRecords:raw.includesPrivate?raw.data.privateRecords:[]});return{data,includesPrivate:raw.includesPrivate as boolean}}
export function restore(current:Data,incoming:ReturnType<typeof parseBackup>,keep=true){return{...incoming.data,enabled:incoming.includesPrivate?true:keep?current.enabled:false,hidden:true,privateRecords:incoming.includesPrivate?incoming.data.privateRecords:keep?current.privateRecords:[]}}
export function save(storage:Pick<Storage,'setItem'>,d:Data){storage.setItem(KEY,JSON.stringify(validate(d)))}


