import { MISSIONS } from '../../frontend/src/core/data/missions.js';
const unit=value=>Math.max(0,Math.min(1,value));
// GAME MODEL. This is classroom scoring, separate from the unchanged science score.
// Successful flights only: 1000 * (.35 science + .30 propellant efficiency
// + .20 budget left + .15 time left), +25 per precision objective, capped at 1000.
// Propellant efficiency = clamp(1 - referencePropellant / bestDirectReference, 0, 1).
// Both propellant figures must use the same dry mass and REF_ISP, as in the source report.
export function scoreRun(design,result){
  const m=MISSIONS[design.mission];
  const parts={
    science:unit(result.science.max?result.science.got/result.science.max:0),
    propellant:unit(result.propellant.bestDirect?1-result.propellant.used/result.propellant.bestDirect:0),
    budget:unit(1-result.costMillion/m.budget),
    time:unit(1-result.flightDays/(m.maxYears*365.25)),
  };
  const soft=result.landing?.status==='landed'&&result.landing.v<3;
  const peri=result.capture?.result==='orbit'&&result.capture.best>0&&result.capture.need<=result.capture.best*1.08;
  const bonus=(soft?25:0)+(peri?25:0);
  return {score:result.outcome.ok?Math.min(1000,Math.round(1000*(.35*parts.science+.30*parts.propellant+.20*parts.budget+.15*parts.time)+bonus)):null,parts,bonus};
}

export const LEADERBOARD_TABS={
  missionScore:{label:'Mission Score',success:true,order:'r.mission_score DESC'},
  fuelSaver:{label:'Fuel Saver',success:true,order:'r.propellant_saved DESC'},
  mostScience:{label:'Most Science',success:true,order:'r.science_points DESC'},
  cheapestSuccess:{label:'Cheapest Success',success:true,order:'r.cost_million ASC'},
  fastestArrival:{label:'Fastest Arrival',success:true,order:'r.flight_days ASC'},
  bestFailureLesson:{label:'Best failure lesson',success:false,order:'r.created_at DESC'},
};
