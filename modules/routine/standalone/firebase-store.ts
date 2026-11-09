import {doc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, type Firestore} from 'firebase/firestore';
import {signOut, type Auth} from 'firebase/auth';
import {validate} from '../lib/routine.ts';
import {conflictMessage, type StateStore} from '../lib/state-store.ts';

export function firebaseStore(db: Firestore, auth: Auth, uid: string): StateStore {
  const ref = doc(db, 'routine160', uid);
  return {
    accountLabel: 'Google',
    async load() {
      const snapshot = await getDocFromServer(ref);
      if (!snapshot.exists()) return {data: null, revision: 0};
      const value = snapshot.data();
      return {data: validate(JSON.parse(value.payload)), revision: value.revision};
    },
    async save(data, revision) {
      if (auth.currentUser?.uid !== uid) throw Error('다시 로그인한 뒤 저장하세요.');
      const checked = validate(data);
      if (!checked.enabled && checked.privateRecords.length) throw Error('개인 기록 저장 동의가 필요합니다.');
      const payload = JSON.stringify(checked);
      if (new TextEncoder().encode(payload).length > 900000) throw Error('저장 가능한 기록 크기를 넘었습니다. 백업 후 기록을 정리하세요. 저장된 기록은 그대로 유지됩니다.');
      return runTransaction(db, async transaction => {
        const previous = await transaction.get(ref);
        if ((previous.exists() ? previous.data().revision : 0) !== revision) throw Error(conflictMessage);
        transaction.set(ref, {payload, revision: revision + 1, updatedAt: serverTimestamp()});
        return revision + 1;
      });
    },
    logout: () => signOut(auth),
    subscribe: (changed, failed) => onSnapshot(ref, snapshot => {
      if (!snapshot.metadata.hasPendingWrites && !snapshot.metadata.fromCache) changed(snapshot.exists() ? snapshot.data().revision : 0);
    }, failed),
  };
}
