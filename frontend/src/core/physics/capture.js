import { R_EARTH, LEO_ALT, MU_EARTH } from '../constants.js';
import { BODIES, CAPTURE } from '../data/bodies.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/capture.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    patched conics: departure burn from parking orbit, capture orbit and capture burn
// imports constants, data/bodies
// ====================================================================================================
// ---- patched conics: departure, flyby, capture ----------------
// ΔV from a circular parking orbit to a hyperbola with excess speed vinf (vis-viva / Oberth).
function departDV(vinf){ const r=R_EARTH+LEO_ALT; return Math.sqrt(vinf*vinf+2*MU_EARTH/r)-Math.sqrt(MU_EARTH/r); }
function captureOrbit(key){
  const b=BODIES[key], c=CAPTURE[key], rp=c.alt!=null? b.R+c.alt : b.R*c.rpR;
  const a=c.circular? rp : Math.cbrt(b.gm*Math.pow(c.periodH*3600,2)/(4*Math.PI*Math.PI));
  return { rp, a, mu:b.gm };
}
function captureDV(key, vinf, rBurn){
  const o=captureOrbit(key), r=rBurn||o.rp;
  return Math.sqrt(vinf*vinf+2*o.mu/r)-Math.sqrt(Math.max(0,o.mu*(2/r-1/Math.max(o.a,r*0.5001))));
}

// ORIGINAL MODULE END
export { departDV, captureOrbit, captureDV };
