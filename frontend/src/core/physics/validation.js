import { VALIDATION_CASES } from '../data/missions.js';
import { dayFromDate } from './time.js';
import { planetState } from './ephemeris.js';
import { lambert } from './lambert.js';
import { MU_SUN, AUD } from '../constants.js';
import { V, clamp } from './math.js';
import { BODIES } from '../data/bodies.js';
import { flybyTurn } from './flyby.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/validation.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    the engine against real missions
// imports data/missions, data/bodies, time, ephemeris, lambert, flyby, math
// ====================================================================================================
// ---- validation: our engine vs real missions --------------------
function runValidation(){
  return VALIDATION_CASES.map(c=>{
    const st=c.legs.map(([k,dt])=>({ k, t:dayFromDate(...dt), s:planetState(k,dayFromDate(...dt)) }));
    const L=[]; for(let i=0;i<st.length-1;i++) L.push(lambert(st[i].s.r,st[i+1].s.r,st[i+1].t-st[i].t,MU_SUN));
    let ours=NaN;
    if(L.every(Boolean)){
      if(c.c3){ const v=V.len(V.sub(L[0].v1,st[0].s.v))*AUD; ours=v*v; }
      else { const p=st[c.at], vin=V.mul(V.sub(L[c.at-1].v2,p.s.v),AUD), vout=V.mul(V.sub(L[c.at].v1,p.s.v),AUD);
        const b=BODIES[p.k], vi=V.len(vin), vo=V.len(vout), delta=Math.acos(clamp(V.dot(vin,vout)/(vi*vo),-1,1));
        let lo=Math.log(b.R*0.2), hi=Math.log(b.R*4000); for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(flybyTurn(b.gm,Math.exp(m),vi,vo)>delta) lo=m; else hi=m; } ours=Math.exp((lo+hi)/2); }
    }
    return { ...c, ours, diff:(ours-c.real)/c.real*100 };
  });
}

// ORIGINAL MODULE END
export { runValidation };
