import test from 'node:test';import assert from 'node:assert/strict';import {fresh} from '../lib/routine.ts';
const origin='http://127.0.0.1:8787',url=origin+'/api/state',user='test-'+crypto.randomUUID();
const headers={'oai-authenticated-user-id':user,'oai-authenticated-user-email':'test@example.invalid','Origin':origin,'Content-Type':'application/json'};
test('서버 인증·계정 격리·저장·재조회·동시 수정·검증',async()=>{
 assert.equal((await fetch(url)).status,401);
 let res=await fetch(url,{headers});assert.equal(res.status,200);const empty=await res.json();assert.equal(empty.data,null);assert.equal(empty.revision,0);
 const d=fresh();d.start='2026-09-08';d.life=[{id:'sleep-api',date:'2026-09-08',sleep:7,sleepIntervals:[{start:180,end:360},{start:420,end:660}],weight:63,alcohol:'미기록',pelvic:'미시작',discomfort:'미기록',relax:'미기록'}];
 res=await fetch(url,{method:'PUT',headers,body:JSON.stringify({revision:0,data:d})});assert.equal(res.status,200);assert.equal((await res.json()).revision,1);
 res=await fetch(url,{headers});const loaded=await res.json();assert.deepEqual(loaded.data,d);assert.equal(res.headers.get('cache-control'),'no-store, private');
 res=await fetch(url,{headers:{...headers,'oai-authenticated-user-id':user+'-other'}});assert.equal((await res.json()).data,null);
 res=await fetch(url,{method:'PUT',headers,body:JSON.stringify({revision:0,data:d})});assert.equal(res.status,409);
 res=await fetch(url,{method:'PUT',headers:{...headers,Origin:'https://untrusted.invalid'},body:JSON.stringify({revision:1,data:d})});assert.equal(res.status,403);
 res=await fetch(url,{method:'PUT',headers,body:JSON.stringify({revision:1,data:{...d,exercises:[{id:'broken'}]}})});assert.equal(res.status,400);
 res=await fetch(url,{headers});assert.deepEqual((await res.json()).data,d);
 const updated={...d,hidden:false};res=await fetch(url,{method:'PUT',headers,body:JSON.stringify({revision:1,data:updated})});assert.equal(res.status,200);assert.equal((await res.json()).revision,2);
 res=await fetch(url,{method:'PUT',headers,body:JSON.stringify({revision:1,data:d})});assert.equal(res.status,409);
});

