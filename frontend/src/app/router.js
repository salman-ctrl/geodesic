import { $$, $ } from '../ui/dom.js';
import { Store, S } from '../state/store.js';
import { MISSIONS } from '../core/data/missions.js';
import { onCanvasClick } from '../three/picking.js';

// ====================================================================================================
// MODULE  src/app/router.js
// layer   app
// what    screen registry and go(name): one screen is active, it gets enter / update / exit, clicks and keys
// imports state/store, ui/dom, three/picking, core/data/missions
// ====================================================================================================

let Screens, cur, STEP_ORDER, STEP_OF;
async function go(name, opts){
  if(cur&&cur.exit) cur.exit(name);
  $$('.screen').forEach(s=>s.classList.toggle('active', s.id==='s-'+name));
  if(!Screens[name]){ console.warn('GEO: no screen '+name); return; }
  cur=Screens[name]; Store.session.insight=null; Store.set('screen',name); const stp=STEP_OF[name]||name, idx=STEP_ORDER.indexOf(stp);
  $('#steps').innerHTML=STEP_ORDER.map((s,i)=>`<i class="${i===idx?'on':i<idx?'done':''}" title="${s}"></i>`).join('');
  $('#tbMission').textContent=name==='select'? '' : MISSIONS[S.mission].name+' mission'+(S.crew>1? ' · crew of '+S.crew:'');
  if(cur&&cur.enter) await cur.enter(opts||{});
}
export function initialize(){
(Screens = {});
(cur = null);
(STEP_ORDER = ['select','builder','craft','route','gonogo','launch','cruise','report']);
(STEP_OF = { tutorial:'builder', flyby:'cruise', arrival:'cruise', descent:'cruise' });
onCanvasClick(r=>{ if(cur&&cur.onPick) cur.onPick(r); });
addEventListener('keydown',e=>{ if(e.repeat) return; if(cur&&cur.key&&cur.key(e.code)) e.preventDefault(); });
addEventListener('keyup',e=>{ if(cur&&cur.keyUp) cur.keyUp(e.code); });
}
export { Screens, cur, STEP_ORDER, STEP_OF, go };
