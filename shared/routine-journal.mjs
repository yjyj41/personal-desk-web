import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,signInWithCredential,signInWithPopup,GoogleAuthProvider,onAuthStateChanged,signOut,setPersistence,indexedDBLocalPersistence} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore,doc,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {exerciseCards,sameGoogleUser} from './routine-records.mjs';
// Same app name and IndexedDB persistence as Routine. No record migration or token messages.
export function installRoutineJournal({auth,getDate,reauthorize,onChange=()=>{}}) {
  let routineAuth,db,off,records=[],state='운동 연결 확인 중…',generation=0,init;
  const hosts=[];
  for(const id of ['journalText','dailyEmpty']){const target=document.getElementById(id),host=document.createElement('section');host.className='routine-journal';target.after(host);hosts.push({host,id});}
  async function initialize(){
    if(!init)init=(async()=>{const response=await fetch(new URL('../modules/routine/firebase-config.json',import.meta.url));if(!response.ok)throw Error('운동 연결 설정을 불러오지 못했어요.');const config=await response.json();const app=getApps().find(a=>a.name==='routineShared')||initializeApp(config,'routineShared');routineAuth=getAuth(app);await setPersistence(routineAuth,indexedDBLocalPersistence);db=getFirestore(app);onAuthStateChanged(routineAuth,watch);})();
    return init;
  }
  function watch(){
    const epoch=++generation;off?.();records=[];
    if(!auth.currentUser){state='로그인하면 운동 기록이 표시됩니다.';render();return;}
    if(!sameGoogleUser(auth.currentUser,routineAuth?.currentUser)){state='같은 Google 계정으로 운동 기록을 연결하세요.';render();return;}
    state='운동 기록 불러오는 중…';render();
    off=onSnapshot(doc(db,'routine160',routineAuth.currentUser.uid),snap=>{
      if(epoch!==generation)return;
      try{const data=snap.exists()?JSON.parse(snap.data().payload):{exercises:[]};records=exerciseCards(data);state=records.length?'운동로그와 연결됨':'아직 기록한 운동이 없어요.';render();onChange(records);}
      catch{records=[];state='운동 기록 형식을 확인해 주세요.';render();}
    },()=>{if(epoch===generation){records=[];state='운동 기록을 읽지 못했어요. 연결을 다시 확인하세요.';render();}});
  }
  const NEEDS_ONCE='운동로그는 이 기기에서 한 번만 따로 연결하면 돼요. 아래 버튼을 눌러 주세요.';
  async function accept(result){await initialize();const credential=GoogleAuthProvider.credentialFromResult(result);if(!credential)throw Error('Google 계정 인증이 필요해요.');
    // Works only when the Routine project trusts the Journal OAuth client; otherwise fall back to a one-time popup.
    try{await signInWithCredential(routineAuth,GoogleAuthProvider.credential(null,credential.accessToken));}
    catch(e){console.warn('Routine shared sign-in failed',e);state=NEEDS_ONCE;render();return;}
    watch();
  }
  async function connectDirect(){await initialize();const provider=new GoogleAuthProvider();const email=auth.currentUser?.email;if(email)provider.setCustomParameters({login_hint:email,prompt:'select_account'});
    await signInWithPopup(routineAuth,provider);
    if(!sameGoogleUser(auth.currentUser,routineAuth.currentUser)){await signOut(routineAuth);throw Error('저널과 같은 Google 계정을 골라 주세요.');}
    watch();
  }
  function render(){for(const {host,id} of hosts){host.replaceChildren();const heading=document.createElement('h3');heading.textContent='이날의 운동';host.append(heading);const day=getDate(id),items=records.filter(n=>n.date===day);const info=document.createElement('p');info.textContent=state;host.append(info);
    for(const item of items){const p=document.createElement('p');p.textContent=(item.time?item.time+' · ':'')+item.text;host.append(p);if(item.note){const note=document.createElement('p');note.textContent=item.note;host.append(note);}}
    if(records.length&&!items.length){const p=document.createElement('p');p.textContent='이날 기록한 운동이 없어요.';host.append(p);}
    const open=document.createElement('a');open.textContent='운동로그 열기 →';open.href='../../index.html#routine';open.target='_top';host.append(open);
    if(auth.currentUser&&!sameGoogleUser(auth.currentUser,routineAuth?.currentUser)){const b=document.createElement('button');b.className='authbtn';b.textContent='운동로그 연결 (한 번만)';b.onclick=async()=>{b.disabled=true;try{await connectDirect();}catch(e){state=e.code==='auth/popup-closed-by-user'?NEEDS_ONCE:'연결하지 못했어요: '+e.message;render();}};host.append(b);}
  }}
  onAuthStateChanged(auth,()=>{initialize().then(watch).catch(e=>{state=e.message;render();});});
  return {accept,render,logout:async()=>{++generation;off?.();records=[];if(routineAuth)await signOut(routineAuth);render();}};
}
