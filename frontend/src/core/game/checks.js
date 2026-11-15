import { MISSIONS } from '../data/missions.js';
import { craftStats, rocketStats, fairingFits } from '../physics/rocket.js';
import { fmtN, fmtRate, fmtDur } from '../format.js';
import { SIM_FAIL } from './rules.js';
import { CRAFT } from '../data/parts.js';
import { BODIES } from '../data/bodies.js';
import { missionCost } from './scoring.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/game/checks.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    Go / No-Go: every console's call for a design, an ascent plan and a route
// imports data/*, format, rocket, game/rules, game/scoring
// ====================================================================================================
// Every console's call, with the reason and the screen that fixes it.
function runChecks(des, pl, rt){
  const m=MISSIONS[des.mission], cs=craftStats(des.craft,des.mission), rs=rocketStats(des.rocket,cs.wet), out=[], n=(v,d=2)=>fmtN(v,d);
  { let ok=true, why;
    if(!rt){ ok=false; why='There is no route to size the rocket against.'; }
    else if(!pl.ok){ ok=false; why=`Autopilot sim: the rocket ${SIM_FAIL[pl.status]||'fails'}.`+(rs.twr<1.15? ` Thrust-to-weight is only ${n(rs.twr)}.`:''); }
    else if(pl.dvLeft<rt.dvDep){ ok=false; why=`It reaches orbit with ${n(pl.dvLeft)} km/s left, but leaving Earth needs ${n(rt.dvDep)} km/s.`; }
    else if(!fairingFits(des.craft,des.rocket.fairing)){ ok=false; why='The spacecraft does not fit inside this fairing.'; }
    else why=`Orbit with ${n(pl.dvLeft)} km/s in hand. Leaving Earth needs ${n(rt.dvDep)}.`;
    out.push({ id:'prop', role:'prop', name:'Propulsion', ok, why, fix:'builder' }); }
  { const pOk=cs.power>=cs.need, rOk=cs.rate>=m.minRate; let why=pOk&&rOk? `${n(cs.power,0)} W at ${m.name} for a ${n(cs.need,0)} W load. Downlink ${fmtRate(cs.rate)}.` : !pOk? `Only ${n(cs.power,0)} W at ${m.name}. The spacecraft needs ${n(cs.need,0)} W.`+(des.craft.power==='solar'&&m.dist>6? ' Sunlight is too weak out there.':'') : `Downlink is ${fmtRate(cs.rate)}. The science needs ${fmtRate(m.minRate)}.`;
    out.push({ id:'power', role:'power', name:'Power & Comms', ok:pOk&&rOk, why, fix:'craft' }); }
  { const miss=cs.missing.map(k=>CRAFT.inst[k].name); out.push({ id:'sci', role:'sci', name:'Science', ok:!miss.length, why:miss.length? `The goal needs ${miss.join(' and ').toLowerCase()} on board.` : `${des.craft.instruments.length} instrument${des.craft.instruments.length===1?'':'s'} ready: ${m.goal.toLowerCase()}.`, fix:'craft', fixOpts:{ phase:'sci' } }); }
  { let ok=true, why;
    if(!rt){ ok=false; why='No ballistic path on this launch date.'; }
    else { const need=rt.dvFly+rt.dvCap, late=rt.years>m.maxYears;
      if(late){ ok=false; why=`Flight takes ${fmtDur(rt.days)}. The mission limit is ${fmtDur(m.maxYears*365.25)}.`; }
      else if(cs.dv<need+.05){ ok=false; why=`Route burns need ${n(need)} km/s plus corrections. The spacecraft carries ${n(cs.dv)} km/s. Add propellant or change the route.`; }
      else why=`${rt.chain.map(k=>BODIES[k].name).join(' → ')}, ${fmtDur(rt.days)}. Burns ${n(need)} of ${n(cs.dv)} km/s on board.`; }
    out.push({ id:'route', role:'lead', name:'Route', ok, why, fix:ok||!rt||rt.years>m.maxYears? 'route':'craft' }); }
  { const c=missionCost(des,rt), ok=c.total<=m.budget; out.push({ id:'budget', role:'lead', name:'Budget', ok, why:`$${n(c.total,0)}M of $${m.budget}M: rocket ${n(c.rocket,0)}, spacecraft ${n(c.craft,0)}, operations ${n(c.ops,0)}.`, fix:c.rocket>c.craft? 'builder':'craft' }); }
  return out;
}

// ORIGINAL MODULE END
export { runChecks };
