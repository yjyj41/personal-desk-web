import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, serverTimestamp} from 'firebase/firestore';
import {firebaseStore} from '../standalone/firebase-store.ts';
import {fresh, backup, parseBackup} from '../lib/routine.ts';
let env, db;
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-routine160', firestore:{host:'127.0.0.1',port:8088,rules:await readFile('firestore.rules','utf8')}});
  db = env.authenticatedContext('owner', {email:'owner@example.com',email_verified:true}).firestore();
});
after(async () => {await env?.cleanup();});
test('Google 계정의 기록만 접근하고 다른 사용자·익명·미검증 이메일을 거부',async () => {
  const own = doc(db,'routine160','owner');
  await setDoc(own,{payload:JSON.stringify(fresh()),revision:1,updatedAt:serverTimestamp()});
  assert.equal((await getDoc(own)).data().revision,1);
  for (const context of [env.unauthenticatedContext(),env.authenticatedContext('other',{email:'other@example.com',email_verified:true}),env.authenticatedContext('owner',{email:'owner@example.com',email_verified:false})]) {
    await assertFails(getDoc(doc(context.firestore(),'routine160','owner')));
    await assertFails(setDoc(doc(context.firestore(),'routine160','owner'),{payload:'{}',revision:2,updatedAt:serverTimestamp()}));
  }
  await assertFails(setDoc(doc(db,'routine160','other'),{payload:'{}',revision:1,updatedAt:serverTimestamp()}));
  await assertFails(setDoc(own,{payload:'{}',revision:1,updatedAt:serverTimestamp()}));
});
test('두 기기 동기화, 기존 백업 복원, 동시 저장 충돌 및 이전 revision 보호',async () => {
  const storeA=firebaseStore(db,{currentUser:{uid:'owner'}},'owner');
  const dbB=env.authenticatedContext('owner',{email:'owner@example.com',email_verified:true}).firestore();
  const storeB=firebaseStore(dbB,{currentUser:{uid:'owner'}},'owner');
  const initial=await storeA.load();
  const data=fresh();data.life=[{id:'sleep-test',date:'2026-09-09',sleep:7,sleepQuality:4,weight:null,alcohol:'미기록',pelvic:'미시작',discomfort:'미기록',relax:'미기록'}];
  const restored=parseBackup(backup(data)).data;
  const revision=await storeA.save(restored,initial.revision);
  assert.deepEqual((await storeB.load()).data.life,restored.life);
  const results=await Promise.allSettled([storeA.save({...restored,hidden:true},revision),storeB.save({...restored,hidden:false},revision)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await storeB.load()).revision,revision+1);
});
