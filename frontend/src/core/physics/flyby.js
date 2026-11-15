import { BODIES } from '../data/bodies.js';
import { V, clamp } from './math.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/flyby.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    flyby turn angle, powered periapsis impulse, exit velocity, flyby solver
// imports data/bodies, math
// ====================================================================================================
// Turn angle of a flyby with periapsis radius rp (incoming speed vi, outgoing vo; equal for a free flyby).
function flybyTurn(mu,rp,vi,vo){ return Math.asin(1/(1+rp*vi*vi/mu))+Math.asin(1/(1+rp*(vo||vi)*(vo||vi)/mu)); }
// A powered flyby is an impulse at periapsis. Its incoming and outgoing hyperbolas
// share a closest-approach radius; the required turn beyond what gravity supplies
// costs an actual vector impulse at that point (not an unspent post-flyby "fix").
function flybyPeri(key, rp, vi, vo, delta){
  const mu=BODIES[key].gm;
  const alphaIn=Math.asin(1/(1+rp*vi*vi/mu));
  const alphaOut=Math.asin(1/(1+rp*vo*vo/mu));
  const naturalTurn=alphaIn+alphaOut;
  const beta=delta-naturalTurn; // powered plane steering at periapsis, signed
  const vpIn=Math.sqrt(vi*vi+2*mu/rp), vpOut=Math.sqrt(vo*vo+2*mu/rp);
  const burn=Math.sqrt(Math.max(0,(vpOut-vpIn)**2+4*vpIn*vpOut*Math.sin(beta/2)**2));
  return { alphaIn, alphaOut, naturalTurn, beta, vpIn, vpOut, burn };
}
function rotate3(v,n,th){
  const c=Math.cos(th), si=Math.sin(th), d=V.dot(n,v), x=V.cross(n,v);
  return [v[0]*c+x[0]*si+n[0]*d*(1-c),v[1]*c+x[1]*si+n[1]*d*(1-c),v[2]*c+x[2]*si+n[2]*d*(1-c)];
}
// Actual exit velocity if only part of the necessary periapsis impulse is available.
// At full burn this returns the planned Lambert outbound v-infinity; at zero burn,
// it returns the unpowered gravitational deflection at the chosen periapsis.
function flybyExit(key, rp, vin, desiredVout, dvDelivered){
  const vi=V.len(vin), vo=V.len(desiredVout), mu=BODIES[key].gm;
  const delta=Math.acos(clamp(V.dot(vin,desiredVout)/(vi*vo),-1,1));
  const g=flybyPeri(key,rp,vi,vo,delta), frac=g.burn>1e-9? clamp(dvDelivered/g.burn,0,1):1;
  const px=g.vpIn+frac*(g.vpOut*Math.cos(g.beta)-g.vpIn), py=frac*g.vpOut*Math.sin(g.beta);
  const vp=Math.hypot(px,py), vInf=Math.sqrt(Math.max(0,vp*vp-2*mu/rp));
  const alphaOutActual=Math.asin(1/(1+rp*vInf*vInf/mu));
  const turn=g.alphaIn+alphaOutActual+Math.atan2(py,px);
  let normal=V.cross(vin,desiredVout);
  if(V.len(normal)<1e-10){ normal=V.cross(vin,[0,0,1]); if(V.len(normal)<1e-10) normal=V.cross(vin,[0,1,0]); }
  normal=V.unit(normal);
  return { vout:V.mul(rotate3(V.unit(vin),normal,turn),vInf), turn, bound:vp*vp<2*mu/rp };
}
// Flyby that must rotate vin into vout (planet frame, km/s). Returns radius and
// the actual powered correction required in km/s, including any plane steering.
function flybySolve(key, vin, vout){
  const b=BODIES[key], vi=V.len(vin), vo=V.len(vout);
  const delta=Math.acos(clamp(V.dot(vin,vout)/(vi*vo),-1,1)), rpMin=b.R+b.minAlt, dMax=flybyTurn(b.gm,rpMin,vi,vo);
  let rp=rpMin;
  if(delta<dMax){ let lo=Math.log(rpMin), hi=Math.log(b.R*4000);
    for(let i=0;i<34;i++){ const m=(lo+hi)/2; if(flybyTurn(b.gm,Math.exp(m),vi,vo)>delta) lo=m; else hi=m; } rp=Math.exp((lo+hi)/2); }
  const g=flybyPeri(key,rp,vi,vo,delta);
  return { rp, rpMin, delta, dMax, vi, vo, dv:g.burn,
           naturalTurn:g.naturalTurn, poweredTurn:g.beta, free:g.burn<1e-3 };
}

// ORIGINAL MODULE END
export { flybyTurn, flybyPeri, rotate3, flybyExit, flybySolve };
