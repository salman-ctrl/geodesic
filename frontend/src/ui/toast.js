import { $, h } from './dom.js';

// ====================================================================================================
// MODULE  src/ui/toast.js
// layer   ui
// what    one-line transient message
// imports ui/dom
// ====================================================================================================


function toast(msg){ let t=$('#toast'); if(!t){ t=h('<div id="toast" class="mono" style="position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:60;background:#2b2622;color:#fbf6ec;font-size:11.5px;letter-spacing:.1em;padding:.8em 1.3em;border-radius:999px;opacity:0;transition:opacity .3s;pointer-events:none"></div>'); document.body.append(t); }
  t.textContent=msg; t.style.opacity=1; clearTimeout(t._h); t._h=setTimeout(()=>t.style.opacity=0,2200); }
export function initialize(){
}
export { toast };
