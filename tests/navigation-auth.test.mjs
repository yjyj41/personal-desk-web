import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoute,journalViews} from '../shared/navigation.mjs';
import {authErrorMessage} from '../shared/auth-errors.mjs';
import {hasLocalRecords} from '../shared/local-host.mjs';

test('notebook deep links cover the seven views and old tracker links',()=>{
 assert.deepEqual(parseRoute('#journal/habit'),{view:'journal',tab:'monthly'});
 for(const tab of ['daily','weekly','monthly','future','journal','index','key'])assert.deepEqual(parseRoute('#journal/'+tab),{view:'journal',tab});
 assert.equal(Object.keys(journalViews).length,7);
});
test('today remains distinct and invalid notebook destinations fall back safely',()=>{
 assert.deepEqual(parseRoute('#today'),{view:'today',tab:'daily'});
 assert.deepEqual(parseRoute('#journal'),{view:'journal',tab:'daily'});
 assert.deepEqual(parseRoute('#journal/__proto__'),{view:'journal',tab:'daily'});
 assert.deepEqual(parseRoute('#missing'),{view:'today',tab:'daily'});
});
test('switching local hosts preserves ledgers and unsynced drafts',()=>{
 const storage=keys=>({length:keys.length,key:i=>keys[i]});
 assert.equal(hasLocalRecords(storage([])),false);
 assert.equal(hasLocalRecords(storage(['theme'])),false);
 assert.equal(hasLocalRecords(storage(['personal_desk_spending_v1'])),true);
 assert.equal(hasLocalRecords(storage(['bujo_draft_v3:user'])),true);
});
test('sign-in failures distinguish configuration, blocked popups and cancellation',()=>{
 assert.match(authErrorMessage({code:'auth/unauthorized-domain'},'127.0.0.1'),/http:\/\/localhost:4173/);
 const hosted=authErrorMessage({code:'auth/unauthorized-domain'},'yjyj41.github.io');
 assert.match(hosted,/yjyj41\.github\.io/);
 assert.doesNotMatch(hosted,/localhost|local preview/);
 assert.match(authErrorMessage({code:'auth/popup-blocked'}),/Allow pop-ups/);
 assert.match(authErrorMessage({code:'auth/popup-closed-by-user'}),/cancelled/);
 assert.match(authErrorMessage({code:'auth/network-request-failed'}),/connection/);
 assert.equal(authErrorMessage({message:'private provider details'}).includes('private provider details'),false);
});
