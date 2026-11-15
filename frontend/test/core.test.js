import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../src/core/index.js';

const html=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8').replaceAll('\r\n','\n');
const pure=html.split('// [PURE:BEGIN]')[1].split('\n').slice(1).join('\n').split('// [PURE:END]')[0];
const original=vm.runInNewContext(pure+'\n({'+Object.keys(core).join(',')+'})');
const plain=value=>JSON.parse(JSON.stringify(value));

test('runValidation returns exactly the source HTML numbers',()=>{
  assert.deepEqual(plain(core.runValidation()),plain(original.runValidation()));
  const expected=JSON.parse(fs.readFileSync(new URL('./validation.expected.json',import.meta.url)));
  assert.deepEqual(core.runValidation().map(r=>({id:r.id,ours:r.ours,diff:r.diff})),expected);
});

test('physics, routes, ascent, landing and original scoring retain numerical parity',()=>{
  function battery(p){
    const day=p.dayFromDate(2031,1,1), earth=p.planetState('earth',day),mars=p.planetState('mars',day+210);
    const design={segs:6,engines:5,boosters:2,upper:'S',fairing:'S'};
    const craft={bus:'S',power:'solar',powerN:1,antenna:'M',instruments:['radar','probe'],tank:.75};
    const stats=p.craftStats(craft,'mars');
    return {
      planets:Object.keys(p.BODIES).filter(k=>p.BODIES[k].el).map(k=>p.planetState(k,day+1234.5)),
      moon:p.moonState(day+3.3), propagation:p.kepProp(earth.r,earth.v,400,p.MU_SUN),lambert:p.lambert(earth.r,mars.r,210,p.MU_SUN),
      routes:[[['earth','mars'],15267],[['earth','mars','jupiter'],11347],[['earth','jupiter','saturn'],13000]].map(([chain,t])=>p.optimizeRoute(chain,t,p.PRIORITY.balanced,0,true,17)),
      lunar:[2.3,3,4,5].map(t=>p.moonRoute(day,t)),craft:stats,rocket:p.rocketStats(design,stats.wet),ascent:p.ascentPlan(design,stats.wet),
      landing:['moon','mars'].map(k=>{const s=p.landingInit(k);let i=0;while(s.status==='descent'&&i++<100000)p.landingStep(s,1/120,p.landingAssist(s));return s;}),
      flyby:['venus','earth','mars','jupiter'].map(k=>p.flybySolve(k,[3.1,-2.2,.4],[1.9,3.3,-.2])),
      capture:['moon','mars','jupiter','saturn','neptune'].map(k=>[p.captureOrbit(k),p.captureDV(k,4.2)]),
      cost:p.missionCost({mission:'mars',rocket:design,craft},null),
    };
  }
  assert.deepEqual(plain(battery(core)),plain(battery(original)));
});

test('each extracted pure module body is unchanged',()=>{
  const fences=[...pure.matchAll(/^\/\/ ={20,}\n\/\/ MODULE  (.+)\n/gm)];
  for(let i=0;i<fences.length;i++){
    const name=fences[i][1];const body=pure.slice(fences[i].index,fences[i+1]?.index??pure.length);
    const file=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8').replaceAll('\r\n','\n');
    assert.equal(file.split('// ORIGINAL MODULE BEGIN\n')[1].split('// ORIGINAL MODULE END')[0],body,name);
  }
});
