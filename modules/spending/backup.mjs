import {validDate} from '../../shared/dates.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function validateBackup(input){
 if(!input||!Array.isArray(input.tx)||input.tx.length>100000||!input.budgets||typeof input.budgets!=='object'||Array.isArray(input.budgets))throw Error('지출 백업 형식이 아닙니다.');
 if(!['£','₩','$','€'].includes(input.currency))throw Error('지원하지 않는 통화입니다.');
 if(input.totalBudget!==null&&(!finite(input.totalBudget)||input.totalBudget<0))throw Error('예산 형식이 올바르지 않습니다.');
 const seen=new Set();
 const tx=input.tx.map(t=>{
   if(!t||!validDate(t.date)||!finite(t.amount)||typeof t.name!=='string'||typeof t.category!=='string'||typeof t.key!=='string'||seen.has(t.key))throw Error('거래 날짜·금액·ID를 확인해 주세요.');
   seen.add(t.key);return {...t};
 });
 const budgets=Object.create(null);
 for(const [k,v] of Object.entries(input.budgets)){if(['__proto__','constructor','prototype'].includes(k)||!finite(v)||v<0)throw Error('카테고리 예산이 올바르지 않습니다.');budgets[k]=v;}
 const goals=(input.goals??[]).map(g=>{if(!g||typeof g.name!=='string'||!finite(g.target)||g.target<=0||!finite(g.current))throw Error('저축 목표가 올바르지 않습니다.');return {...g};});
 return {tx,budgets,totalBudget:input.totalBudget,currency:input.currency,goals};
}
