import { MISSIONS } from '../core/data/missions.js';
import { S } from '../state/store.js';
import { toast } from '../ui/toast.js';

// ====================================================================================================
// MODULE  src/app/challengeLink.js
// layer   app
// what    a shared challenge link carries a design in the URL hash; load it into the store at start-up
// imports state/store, core/data/missions, ui/toast
// ====================================================================================================
// A shared challenge link carries the design in the URL hash.


export function initialize(){
try{ if(location.hash.startsWith('#c=')){ const d=JSON.parse(atob(location.hash.slice(3))); if(MISSIONS[d.m]){ S.mission=d.m; Object.assign(S.rocket,d.r); Object.assign(S.craft,d.c); S.route.flybys=d.f||[]; S.route.day=d.d; S.route.priority=d.p||'balanced'; S.tutorialDone=true; setTimeout(()=>toast('Challenge design loaded. Can you fly it better?'),800); } } }catch(e){}
}

