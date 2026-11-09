import {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {initializeApp, type FirebaseOptions} from 'firebase/app';
import {getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut, setPersistence, indexedDBLocalPersistence, type Auth, type User} from 'firebase/auth';
import {getFirestore, type Firestore} from 'firebase/firestore';
import Dashboard from '../app/dashboard';
import {firebaseStore} from './firebase-store';
import '../app/globals.css';
import './desk.css';
import {authErrorMessage} from '../../../shared/auth-errors.mjs';
import {installFrame} from '../../../shared/frame.mjs';
const deskFrame=installFrame('routine');

function Session({auth, db}: {auth: Auth; db: Firestore}) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => onAuthStateChanged(auth, current => {setUser(current); setLoading(false);deskFrame.send('auth-state',{signedIn:!!current});}), [auth]);
  const store = useMemo(() => user ? firebaseStore(db, auth, user.uid) : null, [db, auth, user]);
  async function login() {
    setBusy(true); setError('');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      // One sign-in for both apps: hand the in-memory Google token to the Journal project.
      // Loaded at runtime from the published shared/ folder, so it stays out of this bundle.
      try {
        const here = import.meta.url, path = '../../../shared/journal-login.mjs';
        const {connectJournalFromRoutine} = await import(/* @vite-ignore */ new URL(path, here).href);
        await connectJournalFromRoutine(GoogleAuthProvider.credentialFromResult(result)?.accessToken);
      } catch {/* Journal can still be connected from its own page. */}
    }
    catch (error) {setError(authErrorMessage(error));}
    finally {setBusy(false);}
  }
  if (loading) return <Gate><p role="status">Checking your account…</p></Gate>;
  if (user && store) return <><div style={{textAlign:'right',color:'#666',padding:'8px 24px',fontSize:14}}>{user.email} <button onClick={() => void signOut(auth)}>Sign out</button></div><Dashboard key={user.uid} store={store}/></>;
  return <Gate><h1>A week in motion.</h1><p>Sign in with your Routine160 account to open your exercise, meals and sleep records.</p><button className="primary wide" disabled={busy} onClick={() => void login()}>{busy ? 'Signing in…' : 'Continue with Google ↗'}</button>{error && <p role="alert">{error}</p>}<p className="hint section">Use the same Google account as your original Routine app.</p></Gate>;
}
function Gate({children}: {children: React.ReactNode}) {return <main className="desk-gate">{children}</main>;}
async function start() {
  
  const root = createRoot(document.getElementById('root')!);
  root.render(<Gate><p role="status">Connecting…</p></Gate>);
  try {
    // Firebase Hosting provides public web configuration; no service-account key is shipped.
    const response = await fetch('./firebase-config.json', {cache:'no-store'});
    if (!response.ok) throw Error();
    const config: FirebaseOptions = await response.json();
    // Same app name and persistence as shared/routine-journal.mjs, so a Journal sign-in also opens Routine.
    const app = initializeApp(config, 'routineShared'), auth = getAuth(app);
    await setPersistence(auth, indexedDBLocalPersistence);
    await getRedirectResult(auth);
    root.render(<Session auth={auth} db={getFirestore(app)}/>);
  } catch {root.render(<Gate><h1>루틴 연결을 확인해 주세요</h1><p>저장소에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도하세요.</p><button onClick={() => window.location.reload()}>다시 시도</button></Gate>);}
}
void start();
