import { fmtN } from '../core/format.js';

// ====================================================================================================
// MODULE  src/ui/telemetry.js
// layer   ui
// what    telemetry lines (label ..... value unit) whose numbers ease toward their target
// imports core/format
// ====================================================================================================
// Numbers ease toward their new value instead of jumping.

let nums, tl;
function setNum(el, v, dec=2){ if(!el) return; el._to=v; el._dec=dec; if(el._v==null||!isFinite(el._v)||!isFinite(v)){ el._v=v; el.textContent=fmtN(v,dec); return; } nums.add(el); }
function runNums(dt){ for(const el of nums){ const d=el._to-el._v; if(Math.abs(d)<Math.pow(10,-el._dec)*0.5){ el._v=el._to; nums.delete(el); } else el._v+=d*Math.min(1,dt*10); el.textContent=fmtN(el._v,el._dec); } }
function setTl(root, k, v, dec=2, cls=''){ const row=root.querySelector(`[data-tl="${k}"]`); if(!row) return; const el=row.querySelector('.v');
  if(typeof v==='number') setNum(el,v,dec); else { nums.delete(el); el._v=null; el.textContent=v; }
  row.classList.toggle('bad',cls==='bad'); row.classList.toggle('good',cls==='good'); }
export function initialize(){
(nums = new Set());
(tl = (k,label,unit='')=>`<div class="tl" data-tl="${k}"><span class="k">${label}</span><span class="d"></span><span class="v">—</span><span class="u">${unit}</span></div>`);
}
export { nums, setNum, runNums, tl, setTl };
