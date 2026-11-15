import { craftStats, rocketStats } from '../physics/rocket.js';
import { OPS_COST_PER_YEAR, MISSIONS } from '../data/missions.js';
import { fmtN } from '../format.js';
import { BODIES } from '../data/bodies.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/game/scoring.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    cost, mission name, science score, debrief
// imports data/*, format, rocket
// ====================================================================================================
// Mission cost [$M] of a design flown on a route (rocket + spacecraft + operations per year of flight).
function missionCost(des, rt){ const cs=craftStats(des.craft,des.mission), rs=rocketStats(des.rocket,cs.wet), ops=rt? rt.years*OPS_COST_PER_YEAR : 0; return { rocket:rs.cost, craft:cs.cost, ops, total:rs.cost+cs.cost+ops }; }
// Deterministic mission name from the design (same design, same name).
function missionName(F){ const names=['Garuda','Merapi','Komodo','Rinjani','Toba','Bromo','Krakatau','Sriwijaya','Majapahit','Nusantara','Halmahera','Cendrawasih'], num=['I','II','III','IV','V','VI','VII','VIII','IX'], str=JSON.stringify([F.mission,F.rocket,F.craft,F.rt? F.rt.chain:0]); let hh=7; for(const c of str) hh=(hh*31+c.charCodeAt(0))>>>0; return names[hh%names.length]+' '+num[(hh>>>5)%num.length]; }
// Science points returned by a finished flight record F, and the debrief lists.
function scienceScore(F){ if(!F.outcome.ok) return { got:0, max:F.pts }; const cs=craftStats(F.craft,F.mission), m=MISSIONS[F.mission]; let pts=F.pts; if(F.hasProbe){ const L=F.landing; if(!L||L.status==='crash') pts-=40; else if(L.status==='hard') pts-=20; }
  for(const k of cs.missing) pts-=10; let f=F.capture&&F.capture.result==='loose'? .6 : 1; if(cs.power<cs.need) f*=.5; f*=Math.min(1,cs.rate/m.minRate); return { got:Math.max(0,Math.round(pts*f)), max:F.pts }; }
function debrief(F){ const good=[], bad=[], L=F.launch, n=fmtN;
  if(L){ if(L.auto) good.push('The autopilot flew the ascent.'); else if(L.kickV){ const [a,b]=L.band; (L.kickV>=a*.85&&L.kickV<=b*1.2? good : bad).push(`Gravity turn started at ${Math.round(L.kickV)} m/s. The efficient window was ${a}–${b} m/s.`); }
    for(const e of L.events) if(e.note&&e.note.includes('unburnt')) bad.push(`${e.e} with ${e.note}: propellant thrown away.`);
    if(L.status==='orbit') (L.dvLeft>=L.need? good : bad).push(`Reached orbit with ${n(L.dvLeft,2)} km/s in the upper stage. Leaving Earth needed ${n(L.need,2)}.`); }
  if(F.used.tcm>0) (F.used.tcm<.05? good : bad).push(`Course corrections cost ${n(F.used.tcm*1000,0)} m/s in total.`+(F.used.tcm<.05? ' Fixing errors early kept them cheap.' : ' The first correction window is always the cheapest.'));
  for(const g of F.gains) {
    const ok=g.fix<.08 && g.extra<.08;
    (ok?good:bad).push(ok?
      `${BODIES[g.body].name} flyby followed the plan: net ${g.gain>=0?'+':''}${n(g.gain,1)} km/s heliocentric speed change, with ${n(g.applied,2)} km/s of powered steering.` :
      `${BODIES[g.body].name} flyby needed ${n(g.required,2)} km/s steering (${n(g.extra,2)} extra vs plan); ${n(g.applied,2)} was delivered. Residual outbound mismatch ${n(g.fix,2)} km/s.`);
  }
  const c=F.capture; if(c&&c.result!=='past') (c.need<=c.best*1.08? good : bad).push(c.need<=c.best*1.08? `Capture burn right at closest approach: ${n(c.need,2)} km/s, the least it could be.` : `Capture burn was ${c.tb<0?'early':'late'}: ${n(c.need,2)} km/s instead of ${n(c.best,2)} at closest approach.`);
  if(c&&c.result==='loose') bad.push('Not enough ΔV for the planned orbit. The loose orbit returns less science.');
  if(F.landing) (F.landing.status==='landed'? good : bad).push(F.landing.status==='landed'? `Soft landing at ${n(F.landing.v,1)} m/s${F.landing.assist? ' with the computer on the throttle':''}.` : F.landing.status==='hard'? `Hard landing at ${n(F.landing.v,1)} m/s.` : `The lander hit at ${n(F.landing.v,0)} m/s.`);
  if(F.prop<=0&&F.prop0>0) bad.push('The spacecraft tank ran dry.'); if(F.cost.total>MISSIONS[F.mission].budget) bad.push(`Over budget by $${n(F.cost.total-MISSIONS[F.mission].budget,0)}M.`);
  if(F.outcome.tip) bad.push(F.outcome.tip); return { good, bad }; }
// ORIGINAL MODULE END
export { missionCost, missionName, scienceScore, debrief };
