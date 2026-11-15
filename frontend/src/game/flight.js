import { Store, S } from '../state/store.js';
import { craftStats, rocketDV } from '../core/physics/rocket.js';
import { currentRoute } from '../state/selectors.js';
import { missionCost } from '../core/game/scoring.js';
import { CRAFT } from '../core/data/parts.js';
import { G0 } from '../core/constants.js';
import { go } from '../app/router.js';
import { MISSIONS } from '../core/data/missions.js';
import { fmtDur, fmtN } from '../core/format.js';

// ====================================================================================================
// MODULE  src/game/flight.js
// layer   game · stateful
// what    the flight record: created at launch, spent by burns, closed by endFlight()
// imports state/store, state/selectors, app/router, core/physics/rocket, core/game/scoring
// ====================================================================================================

let flight, craftDvLeft;
function newFlight(){ const cs=craftStats(S.craft,S.mission), rt=currentRoute();
  const F={ mission:S.mission, rt, dry:cs.dry, prop:cs.prop, prop0:cs.prop, pts:cs.pts, hasProbe:cs.hasProbe, cost:missionCost(S,rt), rocket:{ ...S.rocket }, craft:JSON.parse(JSON.stringify(S.craft)),
    burns:[], notes:[], used:{ tcm:0, fly:0, cap:0 }, gains:[], launch:null, outcome:null, landing:null, t:rt? rt.t0 : 0 }; Store.set('flight',F); return F; }
function craftBurn(dv, kind, label){ const have=craftDvLeft(), done=Math.min(dv,have), m0=flight().dry+flight().prop, m1=m0/Math.exp(done*1000/(CRAFT.isp*G0)); flight().prop=Math.max(0,flight().prop-(m0-m1)); if(done>=have-1e-9) flight().prop=dv>have? 0 : flight().prop;
  flight().used[kind]=(flight().used[kind]||0)+done; if(label&&done>1e-4) flight().burns.push({ t:flight().t, label, dv:done }); return done; }
function endFlight(outcome){ flight().outcome=outcome; S.last={ mission:flight().mission, ok:outcome.ok, title:outcome.title, when:Date.now() }; Store.commit(); go('report'); }
function completeMission(){ const F=flight(), m=MISSIONS[F.mission], c=F.capture, L=F.landing, where=F.mission==='moon'? 'the Moon' : m.name; let title=`In orbit at ${where}`, why=`The spacecraft is in ${c.result==='loose'? 'a long, loose' : 'its planned'} orbit around ${where} after ${fmtDur(F.rt.days)} of flight, with ${fmtN(craftDvLeft(),2)} km/s still in the tank.`;
  if(L){ if(L.status==='landed'){ title=`Landed on ${where}`; why=`Touchdown at ${fmtN(L.v,1)} m/s. The orbiter is overhead relaying data, and the lander is on the surface after ${fmtDur(F.rt.days)} of flight.`; } else if(L.status==='hard') why+=` The lander came down hard at ${fmtN(L.v,1)} m/s and is damaged, but the orbiter is doing its job.`; else why+=` The lander hit the surface at ${fmtN(L.v,0)} m/s and was lost. The orbiter carries on alone.`; }
  endFlight({ ok:true, phase:'done', title, why }); }
export function initialize(){
(flight = ()=>Store.session.flight);
(craftDvLeft = ()=>rocketDV(CRAFT.isp,flight().dry+flight().prop,flight().dry));
}
export { flight, newFlight, craftDvLeft, craftBurn, endFlight, completeMission };
