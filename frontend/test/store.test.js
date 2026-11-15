import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { modules } from '../../scripts/extract-core.mjs';
import { dayFromDate } from '../src/core/physics/time.js';
import { initialize,Store,S,SAVE_KEY,defaultState } from '../src/state/store.js';

test('one store preserves the source shape, storage key, notifications and tutorial persistence',()=>{
  const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  const source=modules.find(m=>m.name==='src/state/store.js').body;
  const original=vm.runInNewContext(source+'\n({defaultState,Store,SAVE_KEY})',{localStorage,dayFromDate});
  initialize();assert.equal(SAVE_KEY,'geodesic.v1');assert.equal(Store.state,S);
  assert.deepEqual(JSON.parse(JSON.stringify(defaultState())),JSON.parse(JSON.stringify(original.defaultState())));
  assert.deepEqual(JSON.parse(JSON.stringify(Store.session)),JSON.parse(JSON.stringify(original.Store.session)));
  const changes=[];const unsubscribe=Store.subscribe((k,v)=>changes.push([k,v]));
  Store.commit();assert.equal(data.get(SAVE_KEY),JSON.stringify(S));
  Store.set('screen','builder');assert.equal(changes.at(-1)[0],'screen');
  Store.pausePersist(true);S.mission='moon';Store.commit();assert.equal(JSON.parse(data.get(SAVE_KEY)).mission,'mars');
  Store.pausePersist(false);Store.commit();assert.equal(JSON.parse(data.get(SAVE_KEY)).mission,'moon');
  Store.replace(defaultState());assert.equal(Store.state,S);assert.equal(S.mission,'mars');unsubscribe();delete globalThis.localStorage;
});
