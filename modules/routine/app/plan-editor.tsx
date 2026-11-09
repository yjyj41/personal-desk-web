'use client';
import {uiLabel} from '@/lib/ui-label';
import {useState} from 'react';
import type {Plan,MealPlan} from '@/lib/routine';
const exerciseKinds:[Plan['kind'],string][]=[['walking','걷기'],['running','러닝'],['swimming','수영'],['cycling','자전거'],['strength','근력'],['cardio','기타 유산소']];
export function ExercisePlanEditor({initial,day,busy,onSave}:{initial:Plan[];day:number;busy:boolean;onSave:(plans:Plan[])=>Promise<boolean>}){
 const [plans,setPlans]=useState(()=>structuredClone(initial));
 const patch=(index:number,value:Partial<Plan>)=>setPlans(plans.map((p,i)=>i===index?{...p,...value}:p));
 return <form onSubmit={e=>{e.preventDefault();void onSave(plans)}}><div className="plan-editor">{plans.length===0&&<p className="hint">Days without a plan are shown as recovery days.</p>}{plans.map((p,i)=><fieldset key={p.id} disabled={busy}><div className="row"><b>Exercise {i+1}</b><button type="button" className="textbutton danger" onClick={()=>setPlans(plans.filter((_,j)=>j!==i))}>Delete</button></div><div className="fields"><label className="full">Exercise name<input required maxLength={120} value={p.name} onChange={e=>patch(i,{name:e.target.value})}/></label><label>Type<select value={p.kind} onChange={e=>patch(i,{kind:e.target.value as Plan['kind']})}>{exerciseKinds.map(([value,label])=><option value={value} key={value}>{uiLabel(label)}</option>)}</select></label><label>Start time<input required type="time" value={p.time} onChange={e=>patch(i,{time:e.target.value})}/></label><label>Duration (minutes)<input required type="number" min={1} max={1440} value={p.minutes||''} onChange={e=>patch(i,{minutes:Number(e.target.value)})}/></label></div></fieldset>)}</div><button type="button" className="section wide" disabled={busy||plans.length>=20} onClick={()=>setPlans([...plans,{id:crypto.randomUUID(),day,name:'',time:'19:00',kind:'walking',minutes:40}])}>+ Add exercise</button><button className="primary wide section" disabled={busy}>Save daily plan</button></form>
}
export function MealPlanEditor({initial,busy,onSave}:{initial:MealPlan;busy:boolean;onSave:(plan:MealPlan)=>Promise<boolean>}){
 const [plan,setPlan]=useState({...initial});
 return <form onSubmit={e=>{e.preventDefault();void onSave(plan)}}><div className="fields">{(['아침','점심','저녁','영양제'] as const).map(slot=><label key={slot} className="full">{uiLabel(slot)}<textarea rows={2} maxLength={500} disabled={busy} value={plan[slot]} placeholder={slot==='영양제'?'Only if needed':'Meal or no plan'} onChange={e=>setPlan({...plan,[slot]:e.target.value})}/></label>)}</div><button className="primary wide section" disabled={busy}>Save daily plan</button></form>
}
