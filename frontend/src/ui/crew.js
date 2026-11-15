import { S, Store } from '../state/store.js';
import { roleOwner } from '../state/selectors.js';
import { $ } from './dom.js';
import { ROLES } from '../core/game/rules.js';

// ====================================================================================================
// MODULE  src/ui/crew.js
// layer   ui
// what    pass-the-device card for hot-seat crews
// imports state/store, state/selectors, ui/dom, core/game/rules
// ====================================================================================================
// Shows the "pass the device" card when the next screen belongs to another player. Resolves when they tap.

let roleTag;
function handTo(role){
  if(S.crew===1) return Promise.resolve(); const p=roleOwner(role); if(p===Store.session.holder) return Promise.resolve(); Store.session.holder=p;
  return new Promise(res=>{ $('#passRole').textContent=ROLES[role]; $('#passWho').textContent='Player '+(p+1); $('#pass').classList.add('on'); $('#passOk').onclick=()=>{ $('#pass').classList.remove('on'); res(); }; });
}
export function initialize(){
(roleTag = role=>S.crew===1? '' : ` · ${ROLES[role]} · Player ${roleOwner(role)+1}`);
}
export { handTo, roleTag };
