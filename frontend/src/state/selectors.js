import { S } from './store.js';
import { ROLE_MAP, DATE_MIN, DATE_MAX } from '../core/game/rules.js';
import { moonRoute, optimizeRoute } from '../core/physics/route.js';
import { PRIORITY, MISSIONS } from '../core/data/missions.js';
import { craftStats } from '../core/physics/rocket.js';
import { ascentPlan } from '../core/physics/ascent.js';

// ====================================================================================================
// MODULE  src/state/selectors.js
// layer   state
// what    derived values of the current design: route, ascent plan, best direct window, role owner
// imports state/store, core/physics/*, core/game/rules
// ====================================================================================================

let roleOwner, routeCache, routeKey, planCache, directCache;
function computeRoute(){ if(S.mission==='moon') return moonRoute(S.route.day,S.route.moonTof);
  return optimizeRoute(['earth',...S.route.flybys,S.mission],S.route.day,PRIORITY[S.route.priority],0,true,MISSIONS[S.mission].maxYears); }
function currentRoute(){ const k=routeKey(); if(routeCache.key!==k) routeCache={ key:k, r:computeRoute() }; return routeCache.r; }
function currentPlan(){ const pay=craftStats(S.craft,S.mission).wet, k=JSON.stringify(S.rocket)+pay; if(planCache.key!==k) planCache={ key:k, pl:ascentPlan(S.rocket,pay) }; return planCache.pl; }
function bestDirect(mission, pri=S.route.priority){
  const k=mission+pri; if(directCache[k]) return directCache[k];
  if(mission==='moon') return directCache[k]=moonRoute(S.route.day,2.3);
  let best=null; const lam=PRIORITY[pri], cap=MISSIONS[mission].maxYears;
  for(let d=DATE_MIN; d<DATE_MAX; d+=12){ const r=optimizeRoute(['earth',mission],d,lam,12,false,cap); if(r&&(!best||r.cost<best.cost)) best=r; }
  return directCache[k]=optimizeRoute(['earth',mission],best.t0,lam,0,true,cap);
}
function invalidateDesignCache(){ routeCache.key=''; planCache.key=''; }
export function initialize(){
(roleOwner = r=>S.crew===1? 0 : ROLE_MAP[S.crew][r]);
(routeCache = { key:'', r:null });
(routeKey = ()=>[S.mission,S.route.flybys.join('>'),Math.round(S.route.day),S.route.priority,S.route.moonTof].join('|'));
(planCache = { key:'', pl:null });
(directCache = {});
}
export { roleOwner, routeCache, routeKey, computeRoute, currentRoute, planCache, currentPlan, directCache, bestDirect, invalidateDesignCache };
