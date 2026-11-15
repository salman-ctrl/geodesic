import { G0 } from '../constants.js';
import { ROCKET, CRAFT } from '../data/parts.js';
import { MISSIONS } from '../data/missions.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/rocket.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    rocket equation, launch-vehicle stats, payload capacity, spacecraft stats, fairing fit
// imports constants, data/parts, data/missions
// ====================================================================================================
// Rocket equation helpers.
const rocketDV = (isp,m0,m1)=>isp*G0*Math.log(m0/m1)/1000;                 // km/s
const propFor  = (dvKms,isp,mFinal)=>mFinal*(Math.exp(dvKms*1000/(isp*G0))-1); // kg of propellant to give mFinal a ΔV

// ---- rocket: mass, thrust, ideal ΔV ---------------------------
function rocketStats(d, payload){
  const S=ROCKET.seg, E=ROCKET.eng, B=ROCKET.boost, U=ROCKET.upper[d.upper], F=ROCKET.fairing[d.fairing];
  const nE=d.engines, nB=d.boosters;
  const coreProp=d.segs*S.prop, coreDry=d.segs*S.dry+nE*E.mass+ROCKET.thrustStruct+ROCKET.interstage;
  const m0=payload+F.mass+U.prop+U.dry+coreProp+coreDry+nB*(B.prop+B.dry);
  const thrust0=nE*E.thrust*E.ispSL/E.ispVac+nB*B.thrust*B.ispSL/B.ispVac;
  const mdC=nE*E.thrust/(G0*E.ispVac), mdB=B.thrust/(G0*B.ispVac), tC=coreProp/mdC, tB=nB? B.prop/mdB : 0;
  const ispC1=(E.ispSL+E.ispVac)/2, ispB=(B.ispSL+B.ispVac)/2;
  let m=m0, dv1=0, dv2=0;
  if(nB){
    const t1=Math.min(tB,tC), md=mdC+nB*mdB, ve=(mdC*ispC1+nB*mdB*ispB)*G0/md, m1=m-md*t1;
    dv1=ve*Math.log(m/m1)/1000; m=m1;
    if(tB<=tC){ m-=nB*B.dry; const rem=coreProp-mdC*t1; dv2=rocketDV(E.ispVac,m,m-rem); m-=rem; }
    else { const rem=nB*(B.prop-mdB*t1); dv2=rocketDV(B.ispVac,m,m-rem); m-=rem; }
  } else { dv1=rocketDV((ispC1+E.ispVac)/2,m,m-coreProp); m-=coreProp; }
  const mU0=payload+U.prop+U.dry, dvU=rocketDV(U.isp,mU0,payload+U.dry);
  const cost=d.segs*S.cost+nE*E.cost+nB*B.cost+U.cost+F.cost+ROCKET.integration;
  const height=2.2+d.segs*S.len+2+U.len+F.len;
  return { dv:dv1+dv2+dvU, dvBoost:dv1, dvCore:dv2, dvUpper:dvU, twr:thrust0/(m0*G0), mass:m0, thrust0, cost, coreProp, coreDry, tCore:tC, tBoost:tB, height,
           upperWet:U.prop+U.dry, propTotal:coreProp+U.prop+nB*B.prop };
}
const LEO_DV = 9.3;       // km/s of ideal ΔV to reach the 200 km parking orbit incl. gravity + drag losses (calibrated on the ascent sim below)
// Largest payload [kg] the rocket can push to parking orbit plus a departure burn of dvDep km/s (ideal-ΔV estimate).
function payloadCapacity(d, dvDep){
  const need=LEO_DV+dvDep; if(rocketStats(d,50).dv<need) return 0;
  let lo=50, hi=120000; for(let i=0;i<28;i++){ const m=(lo+hi)/2; if(rocketStats(d,m).dv>=need) lo=m; else hi=m; } return lo;
}

// ---- spacecraft ------------------------------------------------
function craftStats(c, missionKey){
  const B=CRAFT.bus[c.bus], A=CRAFT.ant[c.antenna], M=MISSIONS[missionKey], dist=Math.max(1,M.dist);
  const sunDist=missionKey==='moon'? 1 : M.dist;
  let dry=B.dry+A.mass, cost=B.cost+A.cost, need=B.base+A.dc, pts=0;
  const power=c.power==='rtg'? c.powerN*CRAFT.rtg.w : c.powerN*CRAFT.solar.w1au/(sunDist*sunDist);
  dry+=c.powerN*(c.power==='rtg'? CRAFT.rtg.mass:CRAFT.solar.mass); cost+=c.powerN*(c.power==='rtg'? CRAFT.rtg.cost:CRAFT.solar.cost);
  for(const k of c.instruments){ const I=CRAFT.inst[k]; if(!I) continue; dry+=I.mass; cost+=I.cost; need+=I.w; pts+=I.pts; }
  const prop=B.tank*c.tank, wet=dry+prop, hasProbe=c.instruments.includes('probe');
  const commDist=missionKey==='moon'? M.dist : dist;
  const rate=CRAFT.rateK*A.d*A.d*A.rf/(commDist*commDist);       // kbps
  return { dry, prop, wet, cost, power, need, rate, pts, dv:rocketDV(CRAFT.isp,wet,dry), hasProbe, slots:B.slots,
           missing:M.need.filter(k=>!c.instruments.includes(k)) };
}

// Stowed width decides which fairing the craft fits in (GAME MODEL).
function craftWidth(c){ const B=CRAFT.bus[c.bus]; return Math.max(B.size*.7+(c.power==='solar'? .15*c.powerN : .25), CRAFT.ant[c.antenna].d/2+.1); }
const fairingFits = (c,f)=>craftWidth(c)<=ROCKET.fairing[f].r-.45;

// ORIGINAL MODULE END
export { rocketDV, propFor, rocketStats, LEO_DV, payloadCapacity, craftStats, craftWidth, fairingFits };
