import { clamp } from './math.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/landing.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    powered landing (1-D, fixed substeps, GAME MODEL)
// imports math
// ====================================================================================================
// ---- powered landing (1-D, fixed substeps; GAME MODEL) ----------
const LANDING = { moon:{ g:1.62, h0:1300, v0:-48, aMax:5.4, burn:34 }, mars:{ g:3.71, h0:1500, v0:-72, aMax:11.5, burn:27 } };
function landingInit(key){ const L=LANDING[key]; return { key, h:L.h0, v:L.v0, fuel:1, t:0, thr:0, status:'descent', touchV:0 }; }
function landingStep(s, dt, throttle){
  if(s.status!=='descent') return s; const L=LANDING[s.key];
  const thr=s.fuel>0? clamp(throttle,0,1):0; s.thr=thr; s.fuel=Math.max(0,s.fuel-thr*dt/L.burn);
  s.v+=(thr*L.aMax-L.g)*dt; s.h+=s.v*dt; s.t+=dt;
  if(s.h<=0){ s.h=0; s.touchV=-s.v; s.status=s.touchV<=3? 'landed' : s.touchV<=8? 'hard' : 'crash'; }
  return s;
}
// Assisted mode: follow a braking curve that reaches 1.5 m/s at the surface using 80% of the engine.
function landingAssist(s){ const L=LANDING[s.key], aNet=L.aMax*0.8-L.g, vT=-(1.5+Math.sqrt(2*aNet*Math.max(0,s.h-2))); return clamp((vT-s.v)*0.9+L.g/L.aMax,0,1); }

// ORIGINAL MODULE END
export { LANDING, landingInit, landingStep, landingAssist };
