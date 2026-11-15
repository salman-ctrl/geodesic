import { BODIES, CAPTURE } from '../data/bodies.js';
import { MU_SUN, TAU, AUD, MU_SUN_KM, AU_KM, MU_EARTH, R_EARTH, LEO_ALT, DAY_S } from '../constants.js';
import { V, clamp } from './math.js';
import { flybySolve } from './flyby.js';
import { planetState, moonState } from './ephemeris.js';
import { lambert } from './lambert.js';
import { departDV, captureDV } from './capture.js';
import { kepProp } from './kepler.js';
import { PRIORITY, REF_ISP } from '../data/missions.js';
import { propFor } from './rocket.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/route.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    route evaluation and optimiser, resonant returns, Earth-Moon transfer, leg helpers
// imports constants, data/*, math, ephemeris, kepler, lambert, capture, flyby, rocket
// ====================================================================================================
// ---- route evaluation & optimiser ------------------------------
function semiMajor(key){ return BODIES[key].el[0]; }
function hohmannDays(a,b){ const ra=semiMajor(a), rb=semiMajor(b); return Math.PI*Math.sqrt(Math.pow((ra+rb)/2,3)/MU_SUN); }
function legRange(a,b){ const h=hohmannDays(a,b); return [Math.max(35,0.14*h), 1.9*h]; }

// A planet clicked twice in a row = 2:1 resonant return (two planet years, one craft orbit), as on Galileo's VEEGA.
function resPeriodDays(key){ const a=semiMajor(key); return 2*TAU*Math.sqrt(a*a*a/MU_SUN); }
// Pick the craft's excess velocity between the two encounters: same speed as it arrived with, on the cone that
// gives a two-planet-year orbit, turned so both flybys need the least help.
function resonantPair(key, vin, st1, vout){
  const vP=V.mul(st1.v,AUD), vi=V.len(vin), vp=V.len(vP), r=V.len(st1.r), aRes=semiMajor(key)*Math.pow(2,2/3);
  const vt2=MU_SUN_KM/AU_KM*(2/r-1/aRes), cosT=(vt2-vp*vp-vi*vi)/(2*vp*vi);
  if(Math.abs(cosT)>1) return null;
  const sinT=Math.sqrt(1-cosT*cosT), u=V.unit(vP), n=V.unit(V.cross(st1.r,vP)), w=V.cross(n,u);
  let best=null;
  const tryPhi=phi=>{ const vres=V.add(V.mul(u,vi*cosT),V.add(V.mul(w,vi*sinT*Math.cos(phi)),V.mul(n,vi*sinT*Math.sin(phi))));
    const f1=flybySolve(key,vin,vres), f2=flybySolve(key,vres,vout), dv=f1.dv+f2.dv; if(!best||dv<best.dv) best={ dv, vres, f1, f2, phi }; };
  for(let k=0;k<16;k++) tryPhi(k*TAU/16);
  const p0=best.phi; for(const d of [-0.2,-0.1,0.1,0.2]) tryPhi(p0+d);
  return best;
}
const isResLeg = (chain,i)=>chain[i]===chain[i+1];
function chainValid(chain){ const n=chain.length-1; for(let i=0;i<n;i++) if(isResLeg(chain,i)&&(i===0||i===n-1||isResLeg(chain,i-1))) return false; return n>=1; }

// Evaluate a heliocentric chain (e.g. ['earth','venus','earth','earth','jupiter']) launched at day t0 with leg times tofs [days].
function evalRoute(chain, t0, tofsIn){
  if(!chainValid(chain)) return null;
  const n=chain.length-1, tofs=tofsIn.slice(), st=[planetState(chain[0],t0)], times=[t0], legs=[]; let t=t0;
  for(let i=0;i<n;i++){
    const res=isResLeg(chain,i); if(res) tofs[i]=resPeriodDays(chain[i]);
    t+=tofs[i]; times.push(t); st.push(planetState(chain[i+1],t));
    const leg={ from:chain[i], to:chain[i+1], t0:times[i], tof:tofs[i], r0:st[i].r, frame:'helio', res };
    if(!res){ const L=lambert(st[i].r,st[i+1].r,tofs[i],MU_SUN); if(!L) return null; leg.v0=L.v1; leg.v1=L.v2; }
    legs.push(leg);
  }
  const rel=(v,i)=>V.mul(V.sub(v,st[i].v),AUD);
  const vinfDepVec=rel(legs[0].v0,0), vinfDep=V.len(vinfDepVec), dvDep=departDV(vinfDep);
  const flybys=[]; let dvFly=0;
  const push=(fb,i,vin,vout)=>{ fb.body=chain[i]; fb.t=times[i]; fb.vin=vin; fb.vout=vout; fb.vPlanet=V.mul(st[i].v,AUD);
    fb.gain=V.len(V.add(fb.vPlanet,vout))-V.len(V.add(fb.vPlanet,vin)); flybys.push(fb); dvFly+=fb.dv; };
  for(let i=1;i<n;i++){
    if(legs[i].res){
      const vin=rel(legs[i-1].v1,i), vout=rel(legs[i+1].v0,i+1), P=resonantPair(chain[i],vin,st[i],vout); if(!P) return null;
      legs[i].v0=V.add(st[i].v,V.mul(P.vres,1/AUD)); legs[i].v1=V.add(st[i+1].v,V.mul(P.vres,1/AUD));
      push(P.f1,i,vin,P.vres); push(P.f2,i+1,P.vres,vout); i++;
    } else push(flybySolve(chain[i],rel(legs[i-1].v1,i),rel(legs[i].v0,i)),i,rel(legs[i-1].v1,i),rel(legs[i].v0,i));
  }
  const last=chain[n], vinfArrVec=rel(legs[n-1].v1,n), vinfArr=V.len(vinfArrVec);
  const dvCap=CAPTURE[last]? captureDV(last,vinfArr) : 0, days=t-t0;
  for(const L of legs) L.rEnd=kepProp(L.r0,L.v0,L.tof,MU_SUN).r;
  return { ok:true, chain:chain.slice(), t0, tofs, legs, flybys, vinfDep, vinfDepVec, c3:vinfDep*vinfDep, dvDep, dvFly, vinfArr, vinfArrVec, dvCap,
           dvTotal:dvDep+dvFly+dvCap, days, years:days/365.25, frame:'helio' };
}
// Grid search with pruning + pattern-search polish over the free leg times.
// lambda = km/s of ΔV traded per year of flight; capYears = mission time limit (soft wall).
function optimizeRoute(chain, t0, lambda=PRIORITY.balanced, N=0, polish=true, capYears=0){
  if(!chainValid(chain)) return null;
  const n=chain.length-1; let nFree=0; for(let i=0;i<n;i++) if(!isResLeg(chain,i)) nFree++;
  if(!N) N=[0,18,12,9,7][nFree]||6;
  const grids=[]; for(let i=0;i<n;i++){ if(isResLeg(chain,i)){ grids.push([resPeriodDays(chain[i])]); continue; }
    const [a,b]=legRange(chain[i],chain[i+1]), g=[]; for(let k=0;k<N;k++) g.push(a*Math.pow(b/a,k/(N-1))); grids.push(g); }
  const timeCost=y=>lambda*y+(capYears? Math.max(0,y-capYears)*3:0);
  let best=Infinity, bestT=null; const cur=new Array(n), stA=[planetState(chain[0],t0)], Ls=new Array(n);
  const rel=(v,i)=>V.mul(V.sub(v,stA[i].v),AUD);
  (function rec(i,t,cost){
    for(const tof of grids[i]){
      const t2=t+tof, st2=planetState(chain[i+1],t2); let c=cost;
      if(isResLeg(chain,i)) Ls[i]=null;
      else {
        const L=lambert(stA[i].r,st2.r,tof,MU_SUN); if(!L) continue; Ls[i]=L;
        if(i===0) c+=departDV(V.len(rel(L.v1,0)));
        else if(isResLeg(chain,i-1)){ const P=resonantPair(chain[i],rel(Ls[i-2].v2,i-1),stA[i-1],rel(L.v1,i)); if(!P) continue; c+=P.dv; }
        else c+=flybySolve(chain[i],rel(Ls[i-1].v2,i),rel(L.v1,i)).dv;
      }
      const yrs=(t2-t0)/365.25; if(c+timeCost(yrs)>=best) continue;
      cur[i]=tof; stA[i+1]=st2;
      if(i===n-1){ c+=(CAPTURE[chain[n]]? captureDV(chain[n],V.len(V.sub(Ls[i].v2,st2.v))*AUD):0)+timeCost(yrs); if(c<best){ best=c; bestT=cur.slice(); } }
      else rec(i+1,t2,c);
    }
  })(0,t0,0);
  if(!bestT) return null;
  const costOf=tf=>{ const r=evalRoute(chain,t0,tf); return r? r.dvTotal+timeCost(r.years) : Infinity; };
  if(polish){ let step=0.5/N+0.04;
    for(let it=0;it<40&&step>0.002;it++){ let improved=false;
      for(let i=0;i<n;i++){ if(isResLeg(chain,i)) continue;
        for(const s of [1+step,1/(1+step)]){ const tf=bestT.slice(); tf[i]*=s; if(tf[i]<20) continue; const c=costOf(tf); if(c<best-1e-6){ best=c; bestT=tf; improved=true; } } }
      if(!improved) step*=0.5; } }
  const r=evalRoute(chain,t0,bestT); if(r) r.cost=best; return r;
}

// Earth -> Moon (GAME MODEL: coplanar patched conic from a 200 km parking orbit; tof in days).
function moonRoute(t0, tofDays){
  const mu=MU_EARTH, r1=R_EARTH+LEO_ALT, rM=BODIES.moon.aKm;
  const tofOf=ra=>{ const a=(r1+ra)/2, e=(ra-r1)/(ra+r1), E=Math.acos(clamp((1-rM/a)/e,-1,1)); return Math.sqrt(a*a*a/mu)*(E-e*Math.sin(E))/DAY_S; };
  const hoh=tofOf(rM); let ra=rM; const tof=clamp(tofDays,2.2,hoh);
  if(tof<hoh-1e-4){ let lo=Math.log(rM), hi=Math.log(rM*400); for(let i=0;i<50;i++){ const m=(lo+hi)/2; if(tofOf(Math.exp(m))>tof) lo=m; else hi=m; } ra=Math.exp((lo+hi)/2); }
  const a=(r1+ra)/2, e=(ra-r1)/(ra+r1), vp=Math.sqrt(mu*(2/r1-1/a)), dvDep=vp-Math.sqrt(mu/r1);
  const vt=r1*vp/rM, v=Math.sqrt(mu*(2/rM-1/a)), vr=Math.sqrt(Math.max(0,v*v-vt*vt)), vMoon=Math.sqrt(mu/rM);
  const vinfArr=Math.hypot(vt-vMoon,vr), dvCap=captureDV('moon',vinfArr);
  const nu=Math.acos(clamp((a*(1-e*e)/rM-1)/e,-1,1));
  const mArr=moonState(t0+tof), LM=Math.atan2(mArr.r[1],mArr.r[0]), al=LM-nu;
  const leg={ from:'earth', to:'moon', t0, tof, frame:'geo', r0:[r1*Math.cos(al),r1*Math.sin(al),0], v0:[-vp*Math.sin(al)*DAY_S,vp*Math.cos(al)*DAY_S,0] };
  return { ok:true, chain:['earth','moon'], t0, tofs:[tof], legs:[leg], flybys:[], vinfDep:0, c3:-2*mu/(r1+ra)*1, dvDep, dvFly:0, vinfArr, dvCap, dvTotal:dvDep+dvCap,
           days:tof, years:tof/365.25, frame:'geo', hohmannDays:hoh };
}
const MU_EARTH_DAY = MU_EARTH*DAY_S*DAY_S;     // km^3/day^2, for geocentric legs
const legMu = leg=>leg.frame==='geo'? MU_EARTH_DAY : MU_SUN;
const legVelToKms = leg=>leg.frame==='geo'? 1/DAY_S : AUD;
const legLenToKm = leg=>leg.frame==='geo'? 1 : AU_KM;
function legState(leg, t){ return kepProp(leg.r0, leg.v0, clamp(t-leg.t0,0,leg.tof*1.5), legMu(leg)); }
function bodyState(key, d, frame){ return frame==='geo'? (key==='moon'? moonState(d) : { r:[0,0,0], v:[0,0,0] }) : planetState(key,d); }

// "Propellant" for the post-parking-orbit burns of a route, for a reference craft (GAME MODEL comparison).
function routePropellant(route, craftDryKg){ return propFor(route.dvTotal, REF_ISP, craftDryKg); }

// ORIGINAL MODULE END
export { semiMajor, hohmannDays, legRange, resPeriodDays, resonantPair, isResLeg, chainValid, evalRoute, optimizeRoute, moonRoute, MU_EARTH_DAY, legMu, legVelToKms, legLenToKm, legState, bodyState, routePropellant };
