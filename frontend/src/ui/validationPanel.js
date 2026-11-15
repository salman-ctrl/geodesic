import { runValidation } from '../core/physics/validation.js';
import { fmtN } from '../core/format.js';
import { $$, $ } from './dom.js';
import { openModal } from './modal.js';
import { SOURCES_HTML } from './sources.js';

// ====================================================================================================
// MODULE  src/ui/validationPanel.js
// layer   ui
// what    validation table (landing page and report modal)
// imports core/physics/validation, core/format, ui/modal
// ====================================================================================================
// e. validation panel (shared by landing page and mission report)


function renderValidation(el){
  const rows=runValidation(), f=(r,v)=>r.unit==='km'? fmtN(v,0) : fmtN(v,1);
  el.innerHTML=`<table class="vtable"><thead><tr><th>Mission</th><th>Quantity</th><th class="num">Flight record</th><th class="num">Geodesic engine</th><th class="num">Difference</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${r.mission}</td><td>${r.what}</td><td class="num">${f(r,r.real)} ${r.unit}${r.verify? ' <span class="tv">to verify</span>':''}</td><td class="num">${f(r,r.ours)} ${r.unit}</td><td class="num diff">${r.diff>=0?'+':''}${fmtN(r.diff,1)} %</td></tr>`).join('')}</tbody></table>
  <p class="vnote">Method: planet positions from JPL approximate Keplerian elements at the real dates, Lambert arcs between encounters, then the flyby distance that bends the incoming path into the outgoing one (patched conics, planet treated as a point). Flight-record dates and distances are currently taken from Wikipedia's mission articles (see Sources), with distances measured from the planet's centre. New Horizons C3 ≈ 158 km²/s² is a commonly quoted figure that we still have to verify against the primary source. Its outbound aim point is Pluto's position from JPL Horizons. The remaining differences come from the approximate ephemeris, from ignoring the planet's moons and oblateness, and from small course corrections the real spacecraft made.</p>`;
}
function openValidation(){ openModal('<div class="kicker">Validation</div><h2>Our engine against missions that flew</h2><div id="mVal"></div><h2 style="margin-top:38px">Sources and game model</h2><div class="src">'+SOURCES_HTML+'</div>'); renderValidation($('#mVal')); }
export function initialize(){
$$('[data-validation]').forEach(renderValidation);
}
export { renderValidation, openValidation };
