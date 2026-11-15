import { V, clamp } from './math.js';
import { TAU } from '../constants.js';
import { stS, stC } from './kepler.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/lambert.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    Lambert solver (single revolution, prograde)
// imports math, kepler
// ====================================================================================================
// Lambert's problem, single revolution, prograde (counter-clockwise seen from ecliptic north).
// Universal variables with bisection on z (slow but unconditionally stable). Returns { v1, v2 } or null.
function lambert(R1,R2,dt,mu){
  const r1=V.len(R1), r2=V.len(R2); if(dt<=0) return null;
  const cosd=clamp(V.dot(R1,R2)/(r1*r2),-1,1);
  let dth=Math.acos(cosd); if(R1[0]*R2[1]-R1[1]*R2[0]<0) dth=TAU-dth;
  const A=Math.sin(dth)*Math.sqrt(r1*r2/(1-cosd)); if(!isFinite(A)||Math.abs(A)<1e-12) return null;
  const sm=Math.sqrt(mu);
  const yf=z=>r1+r2+A*(z*stS(z)-1)/Math.sqrt(stC(z));
  const Ff=z=>{ const y=yf(z); if(!(y>0)) return -1; const C=stC(z); return Math.pow(y/C,1.5)*stS(z)+A*Math.sqrt(y)-sm*dt; };
  let lo=-64, hi=39.4;
  while(Ff(lo)>0){ lo*=4; if(lo<-70000) return null; }
  if(Ff(hi)<0) return null;
  for(let i=0;i<46;i++){ const mid=(lo+hi)/2; if(Ff(mid)>0) hi=mid; else lo=mid; }
  const z=(lo+hi)/2, y=yf(z); if(!(y>0)) return null;
  const f=1-y/r1, g=A*Math.sqrt(y/mu), gd=1-y/r2;
  return { v1:V.mul(V.sub(R2,V.mul(R1,f)),1/g), v2:V.mul(V.sub(V.mul(R2,gd),R1),1/g) };
}

// ORIGINAL MODULE END
export { lambert };
