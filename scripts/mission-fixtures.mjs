import fs from 'node:fs';
import {moonRoute,optimizeRoute} from '../frontend/src/core/physics/route.js';
import {DATE_MIN,DATE_MAX} from '../frontend/src/core/game/rules.js';
import {craftStats} from '../frontend/src/core/physics/rocket.js';
import {ascentPlan} from '../frontend/src/core/physics/ascent.js';
import {runChecks} from '../frontend/src/core/game/checks.js';
const fixtures={};
for(const mission of ['moon','mars','jupiter']){
 let best=null;const chain=mission==='jupiter'?['earth','mars','jupiter']:['earth',mission];
 if(mission==='moon')best=moonRoute(DATE_MIN,4);
 else for(let d=DATE_MIN;d<DATE_MAX;d+=12){const r=optimizeRoute(chain,d,.10,12,false,mission==='mars'?1.6:7.5);if(r&&(!best||r.dvFly+r.dvCap+r.dvDep*.4<best.dvFly+best.dvCap+best.dvDep*.4))best=r;}
 if(mission==='jupiter')best=optimizeRoute(chain,11347,.10,0,true,7.5);
 else if(mission!=='moon')best=optimizeRoute(chain,best.t0,.10,0,true,1.6);
 const craft={bus:'S',power:'solar',powerN:mission==='jupiter'?2:1,antenna:mission==='moon'?'S':'M',instruments:mission==='moon'?['spec','probe']:mission==='mars'?['radar','probe']:['mag','spec'],tank:1};
 const cs=craftStats(craft,mission);let selected=null;
 for(const upper of ['S','M','L'])for(let segs=2;segs<=7;segs++)for(let engines=2;engines<=9;engines++)for(const boosters of [0,2,4]){
  const rocket={segs,engines,boosters,upper,fairing:craft.bus==='L'?'M':'S'};const plan=ascentPlan(rocket,cs.wet);
  if(plan.ok&&plan.dvLeft>=best.dvDep+.15){const design={mission,rocket,craft};const checks=runChecks(design,plan,best);const cost=checks.at(-1).why.match(/^\$([\d,]+)/)?.[1].replace(',','');if(!selected||+cost<selected.cost)selected={rocket,cost:+cost,plan,checks};}
 }
 const design={mission,crew:1,tutorialDone:true,sound:false,rocket:selected.rocket,craft,route:{flybys:chain.slice(1,-1),day:best.t0,priority:'balanced',moonTof:4,auto:false},last:null};
 fixtures[mission]=design;console.log(mission,{route:{day:best.t0,days:best.days,dep:best.dvDep,cap:best.dvCap,fly:best.dvFly},craft:cs,rocket:selected.rocket,checks:selected.checks});
}
fs.writeFileSync(new URL('../verification/mission-fixtures.json',import.meta.url),JSON.stringify(fixtures,null,2));
