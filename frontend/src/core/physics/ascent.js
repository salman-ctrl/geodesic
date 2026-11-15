import { D2R, R_EARTH, MU_EARTH, G0 } from '../constants.js';
import { ROCKET } from '../data/parts.js';
import { lerp, clamp } from './math.js';
import { rocketDV } from './rocket.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/ascent.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    ascent simulation and autopilot (2-D point mass, GAME MODEL atmosphere and guidance)
// imports constants, data/parts, math, rocket
// ====================================================================================================
// ---- ascent simulation (2-D polar point mass; GAME MODEL atmosphere and guidance) ----
const ASC = { H:7500, rho0:1.225, cd:0.35, kick:4*D2R, HT:200e3, hLoop:45e3, qBreak:95e3, orbitAlt:140e3 };
function ascentInit(d, payload){
  const U=ROCKET.upper[d.upper];
  return { d, payload, t:0, r:R_EARTH*1000, th:0, vr:0, vt:0, pitch:0, status:'pad', ignited:false, liftoff:false,
    boosters:d.boosters, bProp:d.boosters? ROCKET.boost.prop:0, cProp:d.segs*ROCKET.seg.prop, uProp:U.prop,
    coreOn:true, fairingOn:true, upperIgnT:-1, turn:false, turnT:0, kickV:0, q:0, maxQ:0, maxQt:0, thrust:0, acc:0, mass:0,
    apo:0, peri:0, impactV:0, events:[], dvLeft:0, tLiftoff:0 };
}
function ascentMass(s){
  const d=s.d, U=ROCKET.upper[d.upper], F=ROCKET.fairing[d.fairing];
  let m=s.payload+U.dry+s.uProp; if(s.fairingOn) m+=F.mass;
  if(s.coreOn) m+=d.segs*ROCKET.seg.dry+d.engines*ROCKET.eng.mass+ROCKET.thrustStruct+ROCKET.interstage+s.cProp;
  if(s.boosters) m+=s.boosters*(ROCKET.boost.dry+s.bProp);
  return m;
}
// ctl: { turn, sepBoost, sepCore, sepFairing } — one-shot commands for this step.
function ascentStep(s, dt, ctl){
  if(s.status!=='pad'&&s.status!=='flight') return s;
  const d=s.d, E=ROCKET.eng, B=ROCKET.boost, U=ROCKET.upper[d.upper], F=ROCKET.fairing[d.fairing], mu=MU_EARTH*1e9, R0=R_EARTH*1000;
  const h=s.r-R0, speed=Math.hypot(s.vr,s.vt);
  if(ctl){
    if(ctl.turn&&!s.turn&&s.liftoff){ s.turn=true; s.turnT=s.t; s.kickV=speed; s.events.push({t:s.t,e:'Gravity turn',note:Math.round(speed)+' m/s'}); }
    if(ctl.sepBoost&&s.boosters){ s.events.push({t:s.t,e:'Booster separation',note:s.bProp>50? Math.round(s.bProp*s.boosters/1000)+' t unburnt':''}); s.boosters=0; }
    if(ctl.sepCore&&s.coreOn){ s.events.push({t:s.t,e:'Stage separation',note:s.cProp>50? Math.round(s.cProp/1000)+' t unburnt':''}); s.coreOn=false; s.boosters=0; s.upperIgnT=s.t+2.5; }
    if(ctl.sepFairing&&s.fairingOn){ s.fairingOn=false; s.events.push({t:s.t,e:'Fairing jettison',note:Math.round(h/1000)+' km'}); }
  }
  const pr=Math.exp(-Math.max(0,h)/ASC.H), rho=ASC.rho0*pr;
  // thrust & mass flow
  let T=0, md=0;
  if(s.ignited){
    if(s.boosters&&s.bProp>0){ const mdb=B.thrust/(G0*B.ispVac)*s.boosters; T+=mdb*G0*lerp(B.ispVac,B.ispSL,pr); md+=mdb; s.bProp=Math.max(0,s.bProp-mdb/s.boosters*dt); }
    if(s.coreOn&&s.cProp>0){ const mdc=d.engines*E.thrust/(G0*E.ispVac); T+=mdc*G0*lerp(E.ispVac,E.ispSL,pr); md+=mdc; s.cProp=Math.max(0,s.cProp-mdc*dt); }
    if(!s.coreOn&&s.t>=s.upperIgnT&&s.uProp>0&&!s.cutoff){ const mdu=U.thrust/(G0*U.isp); T+=U.thrust; md+=mdu; s.uProp=Math.max(0,s.uProp-mdu*dt); }
  }
  const m=ascentMass(s), aT=T/m; s.thrust=T; s.mass=m;
  // guidance: vertical -> kick + zero-lift gravity turn -> closed-loop altitude targeting
  let cmd=s.pitch;
  if(!s.turn) cmd=0;
  else if(h<ASC.hLoop&&s.coreOn){ const va=Math.atan2(s.vt,s.vr), k=ASC.kick*Math.min(1,(s.t-s.turnT)/3); cmd=Math.max(k,va); }
  else if(aT>0){
    // time-to-go across the remaining stages (rocket equation), then a quadratic law that arrives level at HT
    const vc=Math.sqrt(mu/(R0+ASC.HT)), ve=T/md, need=Math.max(0,vc-s.vt)*1.03; let tgo;
    if(s.coreOn){ const prop=s.cProp+(s.boosters? s.bProp*s.boosters:0), dvC=ve*Math.log(m/Math.max(1,m-prop));
      if(need>dvC){ const mU=s.payload+U.dry+s.uProp; tgo=prop/md+2.5+mU*G0*U.isp/U.thrust*(1-Math.exp(-(need-dvC)/(G0*U.isp))); }
      else tgo=m/md*(1-Math.exp(-need/ve)); }
    else tgo=m/md*(1-Math.exp(-need/ve));
    tgo=Math.max(8,tgo);
    const gEff=mu/(s.r*s.r)-s.vt*s.vt/s.r, hPred=h+s.vr*tgo/2, hAim=clamp(hPred,ASC.HT-25e3,ASC.HT+130e3), aCmd=-s.vr/tgo+6*(hAim-hPred)/(tgo*tgo);
    cmd=Math.PI/2-Math.asin(clamp((aCmd+gEff)/aT,-0.3,0.9));
  }
  const rate=3*D2R*dt; s.pitch+=clamp(cmd-s.pitch,-rate,rate);
  // forces
  const area=Math.PI*Math.pow(Math.max(ROCKET.coreR,s.fairingOn?F.r:0),2)+(s.boosters||0)*3.2;
  const q=0.5*rho*speed*speed, D=q*ASC.cd*area/m; s.q=q; if(q>s.maxQ){ s.maxQ=q; s.maxQt=s.t; }
  const g=mu/(s.r*s.r);
  let ar=aT*Math.cos(s.pitch)-g+s.vt*s.vt/s.r, at=aT*Math.sin(s.pitch)-s.vr*s.vt/s.r;
  if(speed>0.01){ ar-=D*s.vr/speed; at-=D*s.vt/speed; }
  if(!s.liftoff){ if(ar>0&&s.ignited){ s.liftoff=true; s.status='flight'; s.tLiftoff=s.t; s.events.push({t:s.t,e:'Liftoff',note:''}); } else { ar=0; at=0; if(s.ignited&&T===0){ s.status='nolift'; } } }
  s.acc=Math.hypot(ar+g,at);
  s.vr+=ar*dt; s.vt+=at*dt; s.r+=s.vr*dt; s.th+=s.vt/s.r*dt; s.t+=dt;
  // orbit bookkeeping
  const v2=s.vr*s.vr+s.vt*s.vt, eps=v2/2-mu/s.r, hm=s.r*s.vt;
  if(eps<0){ const a=-mu/(2*eps), ec=Math.sqrt(Math.max(0,1+2*eps*hm*hm/(mu*mu))); s.apo=a*(1+ec)-R0; s.peri=a*(1-ec)-R0; } else { s.apo=Infinity; s.peri=hm*hm/mu/2-R0; }
  if(s.liftoff){
    const spent=T===0&&(s.cutoff||(s.uProp<=0&&!s.coreOn));
    if(!s.cutoff&&!s.coreOn&&eps>=-mu/(2*(R0+Math.max(ASC.HT,h)+20e3))){ s.cutoff=true; }      // never burn past the parking-orbit energy
    if(q>ASC.qBreak&&T>0){ s.status='breakup'; s.events.push({t:s.t,e:'Structural breakup',note:Math.round(q/1000)+' kPa'}); }
    else if(s.r<=R0){ s.r=R0; s.impactV=Math.sqrt(v2); s.status='crash'; s.events.push({t:s.t,e:'Impact',note:Math.round(s.impactV)+' m/s'}); }
    else if(eps<0&&!s.coreOn&&((s.peri>=ASC.orbitAlt&&h>=ASC.orbitAlt)||(spent&&s.peri>=110e3))){ s.status='orbit'; s.fairingOn=false;
      s.dvLeft=rocketDV(U.isp,s.payload+U.dry+s.uProp,s.payload+U.dry); s.events.push({t:s.t,e:'Orbit insertion',note:Math.round(s.peri/1000)+' × '+Math.round(s.apo/1000)+' km'}); }
  }
  return s;
}
// Autopilot command for the current step (kick at kickV m/s; stage at depletion; fairing above 110 km).
function ascentAuto(s, kickV){
  return { turn:!s.turn&&s.liftoff&&Math.hypot(s.vr,s.vt)>=kickV, sepBoost:s.boosters>0&&s.bProp<=0,
           sepCore:s.coreOn&&s.cProp<=0, sepFairing:s.fairingOn&&(s.r-R_EARTH*1000)>110e3 };
}
function ascentRun(d, payload, kickV, dt=0.1){
  const s=ascentInit(d,payload); s.ignited=true;
  while((s.status==='pad'||s.status==='flight')&&s.t<3000) ascentStep(s,dt,ascentAuto(s,kickV));
  return s;
}
// Scan kick speeds; returns the best one, the "green band" of good kick speeds and the outcome.
function ascentPlan(d, payload){
  const speeds=[20,27,35,45,55,65,80,95,115,140,170,210,260], res=speeds.map(k=>{ const s=ascentRun(d,payload,k); return { k, ok:s.status==='orbit', dv:s.status==='orbit'? s.dvLeft:-1, status:s.status, maxQ:s.maxQ }; });
  let best=res[0]; for(const r of res) if(r.dv>best.dv) best=r;
  const good=res.filter(r=>r.ok&&r.dv>=best.dv-0.3).map(r=>r.k);
  return { ok:best.ok, kickV:best.k, dvLeft:Math.max(0,best.dv), band:good.length? [good[0],good[good.length-1]]:[best.k,best.k], status:best.status, maxQ:best.maxQ, scan:res };
}

// ORIGINAL MODULE END
export { ASC, ascentInit, ascentMass, ascentStep, ascentAuto, ascentRun, ascentPlan };
