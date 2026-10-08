import {dateKey,validDate,shiftDay,mondayOf} from './shared/dates.mjs';
import {parseRoute,journalViews} from './shared/navigation.mjs';
const $=id=>document.getElementById(id),modules=['journal','routine','spending'];
const labels={today:['Today','Your daily log, with the week and month alongside.'],journal:['Journal','Your complete notebook. Eight views, the same records.'],routine:['Routine','Exercise, meals and sleep. Plan it, then log it.'],spending:['Spending','Transactions, budgets and the month in view.'],settings:['Settings','Connections, storage and backups.']};
let selected=dateKey(),view='today',journalTab='daily',pendingAction=null,routineInteractive=false,lastRoutine=null;
const ready=new Set();
function send(module,action){if(ready.has(module))$(module+'-frame').contentWindow.postMessage({channel:'personal-desk',type:'context',date:selected,view,action:module==='journal'&&view==='journal'?journalTab:action},location.origin);}
function setDate(value){
 if(!validDate(value)){$('date').value=selected;return;} selected=value;$('date').value=value;
 const date=new Date(value+'T12:00:00');
 $('period').textContent=date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 $('footer-date').textContent=value.replaceAll('-',' / ');
 $('stamp-month').textContent=date.toLocaleDateString('en-GB',{month:'short'}).toUpperCase();$('stamp-day').textContent=date.getDate();$('stamp-weekday').textContent=date.toLocaleDateString('en-GB',{weekday:'short'}).toUpperCase();
 $('spending-label').textContent='03 / '+date.toLocaleDateString('en-GB',{month:'long'}).toUpperCase();
 $('week-strip').replaceChildren();
 for(let i=0;i<7;i++){const key=shiftDay(mondayOf(value),i),day=new Date(key+'T12:00:00'),button=document.createElement('button');button.type='button';button.setAttribute('aria-label',day.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}));button.setAttribute('aria-pressed',String(key===selected));const label=document.createElement('span'),num=document.createElement('b');label.textContent=day.toLocaleDateString('en-GB',{weekday:'short'}).slice(0,2).toUpperCase();num.textContent=day.getDate();button.append(label,num);button.onclick=()=>setDate(key);$('week-strip').append(button);}
 if(lastRoutine?.week!==mondayOf(value)){$('routine-value').textContent='—';$('routine-note').textContent='Open Routine to see this week’s activity.';}
 modules.forEach(m=>send(m));
}
function updateNavigation(){
 document.querySelectorAll('[data-view]').forEach(a=>{if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('journal-nav').hidden=view!=='journal';
 document.querySelectorAll('[data-journal]').forEach(a=>{if(view==='journal'&&a.dataset.journal===journalTab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('breadcrumb').textContent='PERSONAL DESK / '+labels[view][0].toUpperCase()+(view==='journal'?' / '+journalViews[journalTab].toUpperCase():'');
 $('journal-heading').textContent=view==='today'?'Daily log':journalViews[journalTab];
}
function route(){
 window.scrollTo({top:0,behavior:'instant'});
 const route=parseRoute(location.hash);view=route.view;journalTab=route.tab;
 document.body.dataset.view=view;document.title=labels[view][0]+' · Personal desk';
 $('title').replaceChildren(document.createTextNode(labels[view][0]));const dot=document.createElement('span');dot.className='title-dot';dot.textContent='.';$('title').append(dot);$('subtitle').textContent=labels[view][1];updateNavigation();
 $('period').textContent=view==='spending'?'MONTHLY OVERVIEW':new Date(selected+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
 $('today-layout').hidden=!['today','journal'].includes(view);$('today-layout').classList.toggle('full',view==='journal');$('overview').hidden=view!=='today';
 for(const m of ['routine','spending','settings'])$(m+'-panel').hidden=view!==m;
 if(view==='routine'&&!$('routine-frame').getAttribute('src'))$('routine-frame').src='./modules/routine/index.html';
 send('journal');send('spending');send('routine',view==='routine'&&routineInteractive?pendingAction:undefined);
 if(view==='routine'&&routineInteractive)pendingAction=null;
}
window.addEventListener('message',event=>{
 const d=event.data;if(event.origin!==location.origin||d?.channel!=='personal-desk'||!modules.includes(d.module)||event.source!==$(d.module+'-frame').contentWindow)return;
 if(d.type==='ready'){if(d.interactive)routineInteractive=true;ready.add(d.module);send(d.module,d.module==='routine'&&routineInteractive?pendingAction:undefined);if(d.module==='routine'&&routineInteractive)pendingAction=null;if(d.module==='journal'){$('journal-loading').hidden=true;$('journal-fallback').hidden=true;}}
 if(d.type==='height'&&Number.isFinite(d.height))$(d.module+'-frame').style.height=Math.max(260,Math.min(30000,d.height))+'px';
 if(d.type==='auth-state')document.body.dataset[d.module+'Connected']=String(!!d.signedIn);
 if(d.type==='navigate'&&d.module==='journal'&&Object.hasOwn(journalViews,d.tab)){
  if(view==='today'&&d.tab!=='daily'){location.hash='journal/'+d.tab;}
  else if(view==='journal'){journalTab=d.tab;history.replaceState(null,'','#journal/'+d.tab);updateNavigation();send('journal');}
 }
 if(d.type==='signedout'){routineInteractive=false;lastRoutine=null;$('routine-value').textContent='—';$('routine-note').textContent='Connect Routine to see your logged activity.';}
 if(d.type==='busy'){$('notice').textContent='A Routine editor is open. Save or close it before changing the date.';$('notice').hidden=false;}
 if(d.type==='summary'&&d.module==='spending'&&d.month===selected.slice(0,7)){
  const has=d.count>0;$('spending-value').textContent=has?d.currency+Number(d.total).toLocaleString('en-GB',{maximumFractionDigits:2}):'—';$('spending-note').textContent=has?d.count+' imported transactions':'No transactions for this month.';
  $('budget-fill').style.width=d.budget>0?Math.min(100,d.total/d.budget*100)+'%':'0%';$('budget-note').textContent=d.budget>0?'BUDGET '+d.currency+Number(d.budget).toLocaleString('en-GB'):'NO BUDGET SET';
 }
 if(d.type==='summary'&&d.module==='routine'&&d.ready&&d.week===mondayOf(selected)){lastRoutine=d;$('routine-value').replaceChildren(document.createTextNode(d.minutes+' '));const unit=document.createElement('small');unit.textContent='min';$('routine-value').append(unit);$('routine-note').textContent='Logged aerobic activity this week.';}
});
$('previous').onclick=()=>setDate(shiftDay(selected,-1));$('next').onclick=()=>setDate(shiftDay(selected,1));$('now').onclick=()=>setDate(dateKey());$('date').onchange=e=>setDate(e.target.value);
document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>{pendingAction=button.dataset.action;location.hash='routine';if(view==='routine')route();});
$('journal-retry').onclick=()=>{$('journal-frame').src='./modules/journal/index.html';$('journal-fallback').hidden=true;};
setTimeout(()=>{if(!ready.has('journal')){$('journal-loading').hidden=true;$('journal-fallback').hidden=false;}},12000);
window.addEventListener('hashchange',route);setDate(selected);route();
