import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithCredential,setPersistence,indexedDBLocalPersistence} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {journalConfig} from './journal-config.mjs';
// Called directly from the Routine sign-in result; credentials never cross postMessage or storage.
export async function connectJournalFromRoutine(accessToken){
  if(!accessToken)throw Error('Google 인증이 필요해요.');
  const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(journalConfig);
  const auth=getAuth(app);await setPersistence(auth,indexedDBLocalPersistence);
  await signInWithCredential(auth,GoogleAuthProvider.credential(null,accessToken));
}
