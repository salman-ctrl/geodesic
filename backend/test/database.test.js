import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createDatabase } from '../src/db.js';
import { validateMissionScore } from '../src/validation.js';

test('TLS requires TLSv1.2 and certificate verification without changing DATABASE_URL parsing',async()=>{
  for(const enabled of [false,true]){
    let configured;
    const db=createDatabase('mysql://user%40tenant:p%3Aword@database.example:4000/geo%20test?ssl=false',{
      ssl:enabled,
      loadDriver:async()=>({createPool:config=>{
        configured=config;
        return {query:async()=>[[{one:1}]],end:async()=>{}};
      }}),
    });
    assert.equal(await db.health(),true);
    assert.equal(configured.user,'user@tenant');assert.equal(configured.password,'p:word');
    assert.equal(configured.host,'database.example');assert.equal(configured.port,4000);assert.equal(configured.database,'geo test');
    if(enabled)assert.deepEqual(configured.ssl,{minVersion:'TLSv1.2',rejectUnauthorized:true});
    else assert.equal(Object.hasOwn(configured,'ssl'),false);
    await db.close();
  }
});

test('mission_score is an integer in 0–1000 for success and exactly null for failure',()=>{
  for(const score of [0,1,500,1000])assert.equal(validateMissionScore(score,true),score);
  assert.equal(validateMissionScore(null,false),null);
  for(const score of [-1,1001,.5,NaN,Infinity,-Infinity,null,undefined,'500'])assert.throws(()=>validateMissionScore(score,true),e=>e.status===400);
  for(const score of [0,1000,undefined,NaN,'null'])assert.throws(()=>validateMissionScore(score,false),e=>e.status===400);
  assert.throws(()=>validateMissionScore(50,1),e=>e.status===400);
});

test('the root ignore file protects backend/.env without ignoring the example',()=>{
  const ignored=fs.readFileSync(new URL('../../.gitignore',import.meta.url),'utf8').split(/\r?\n/);
  assert.ok(ignored.includes('backend/.env'));
  assert.ok(!ignored.includes('backend/.env.example'));
});
