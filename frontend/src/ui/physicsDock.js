import { Store } from '../state/store.js';
import { $, $$ } from './dom.js';
import { fmtN, fmtDur } from '../core/format.js';
import { D2R } from '../core/constants.js';

// ====================================================================================================
// MODULE  src/ui/physicsDock.js
// layer   ui
// what    contextual physics insights. Reads Store.session only (screen, route, insight); never a screen object.
// imports state/store, ui/dom, core/format, core/constants
// ====================================================================================================

let PhysicsDock;
export function initialize(){
(PhysicsDock = (() => {
let open=false, lastLive=0; const LIVE_MS={ cruise:200, arrival:250 };   // live screens publish every frame; redraw at most this often
function physicsDockVisible(){return ['route','cruise','flyby','arrival'].includes(Store.session.screen);}
function syncPhysicsDock(){const box=$('#physicsDock');box.hidden=!physicsDockVisible();if(box.hidden){open=false;$('#physicsPanel').hidden=true;return;}
  $('#physicsToggle').setAttribute('aria-expanded',String(open));
  $('#physicsPanel').hidden=!open;
  if(open)renderPhysicsDock();}
// The open panel never covers the right-hand telemetry of the active screen (elements marked data-dock-avoid:
// #rDetails, #fTele, #aTele). If there is room it stays under its button and ends above the telemetry;
// otherwise it opens to the left of the telemetry column.
function placePhysicsPanel(){const panel=$('#physicsPanel'),dock=$('#physicsDock');panel.style.right='';panel.style.maxHeight='';if(panel.hidden||dock.hidden)return;
  const tele=$$('.screen.active [data-dock-avoid]').find(el=>el.dataset.dockAvoid!=='when-on'||el.classList.contains('on'));if(!tele)return;
  const t=tele.getBoundingClientRect(),p=panel.getBoundingClientRect(),dk=dock.getBoundingClientRect(),gap=14;
  if(!t.width||p.right<=t.left||p.left>=t.right||p.bottom<=t.top-gap)return;
  const room=t.top-p.top-gap,shift=dk.right-t.left+gap;
  if(room>=260){panel.style.maxHeight=room+'px';return;}
  if(dk.right-shift-p.width>=12){panel.style.right=shift+'px';return;}
  panel.style.maxHeight=Math.max(120,room)+'px';}
addEventListener('resize',()=>placePhysicsPanel());
function pdRow(label,value){return `<div class="pd-data"><span>${label}</span><b>${value}</b></div>`;}
function renderPhysicsDock(){if(!open||!physicsDockVisible())return;
  const ins=Store.session.insight; let html='';
  if(Store.session.screen==='route'){
    const r=Store.session.route;
    if(!r){html='<div class="pd-head">Trajectory solver</div><p class="pd-lead">Choose a feasible route and launch date. The engine will solve the planetary transfer arcs.</p>';}
    else html=`<div class="pd-head">01 / Transfer design · Newton</div>
      <p class="pd-lead">Lambert's problem connects the planet positions at two dates. Kepler propagation describes the resulting Sun-centred coast. Planned burns are priced in ΔV.</p>
      ${pdRow('Departure burn',fmtN(r.dvDep,2)+' km/s')}
      ${pdRow('Flyby steering',fmtN(r.dvFly,2)+' km/s')}
      ${pdRow('Arrival capture',fmtN(r.dvCap,2)+' km/s')}
      ${pdRow('Flight time',fmtDur(r.days))}
      <div class="pd-eq">v² = μ(2/r − 1/a)<br>ΔV total = departure + flybys + capture</div>
      <div class="pd-foot">This is a Newtonian patched-conic calculation, not an Einstein geodesic. Powered flybys consume fuel; passive gravity assists do not.</div>`;
  }else if(Store.session.screen==='flyby'){
    if(!ins||ins.kind!=='flyby')return;
    const rp=ins.rp,acc=ins.accel,turn=ins.naturalTurn/D2R;
    html=`<div class="pd-head">02 / ${ins.body} encounter · Newton</div>
      <p class="pd-lead">A close pass increases gravitational acceleration and allows a larger natural deflection. If the next Lambert arc needs more turning, the spacecraft must burn propellant.</p>
      ${pdRow('Periapsis radius',fmtN(rp,0)+' km')}
      ${pdRow('Gravity acceleration',fmtN(acc,4)+' m/s²')}
      ${pdRow('Natural turning angle',fmtN(turn,2)+'°')}
      ${pdRow('Transfer demands',fmtN(ins.demand/D2R,2)+'°')}
      ${pdRow('Powered burn at this aim',fmtN(ins.burn,2)+' km/s')}
      <div class="pd-eq">a = μ/r²<br>δ = asin[1/(1+rₚv∞,in²/μ)]<br>　+ asin[1/(1+rₚv∞,out²/μ)]</div>
      <div class="pd-foot">Natural deflection is the sum of incoming and outgoing hyperbolic half-angles. The full game flyby solver also handles the required velocity-vector impulse.</div>`;
  }else if(Store.session.screen==='cruise'){
    if(!ins||ins.kind!=='cruise')return;const c=ins;
    html=`<div class="pd-head">03 / Cruise correction · Newton</div>
      <p class="pd-lead">Your actual trajectory and the planned Lambert arc can separate. GEODESIC predicts your arrival using Kepler propagation, then solves a new Lambert transfer for the cheapest correction now.</p>
      ${pdRow('Predicted miss',fmtN(c.miss||0,0)+' km')}
      ${pdRow('Velocity correction',fmtN((c.need||0)*1000,1)+' m/s')}
      ${pdRow('ΔV remaining',fmtN(c.dvLeft,2)+' km/s')}
      <div class="pd-eq">r(t) = Kepler(r₀, v₀, Δt)<br>Δv = |v<sub>Lambert</sub> − v<sub>now</sub>|</div>
      <div class="pd-foot">Earlier corrections are generally less expensive. The displayed values come from the same actual velocity and propagated position used by the spacecraft.</div>`;
  }else if(Store.session.screen==='arrival'){
    if(!ins||ins.kind!=='arrival')return;const a=ins, need=a.needNow;
    html=`<div class="pd-head">04 / Capture burn · Oberth effect</div>
      <p class="pd-lead">At the closest approach, the spacecraft is moving fastest. Burning there changes its orbital energy most effectively; missing the timing window usually costs extra fuel.</p>
      ${pdRow('Arrival excess speed',fmtN(a.vinf,2)+' km/s')}
      ${pdRow('Required at periapsis',fmtN(a.best,2)+' km/s')}
      ${pdRow('Required at current moment',fmtN(need,2)+' km/s')}
      ${pdRow('Fuel available',fmtN(a.have,2)+' km/s')}
      <div class="pd-eq">Δv = √(v∞²+2μ/r) − v<sub>capture</sub>(r)</div>
      <div class="pd-foot">The capture orbit is a simplified game model. The Oberth explanation applies to this Newtonian energy calculation, not to a full relativistic orbit.</div>`;
  }
  $('#physicsContent').innerHTML=html; placePhysicsPanel();
}
$('#physicsToggle').onclick=()=>{open=!open;syncPhysicsDock();};
Store.subscribe((key,val)=>{
  if(key==='screen'){ open=false; syncPhysicsDock(); }
  else if(key==='route') syncPhysicsDock();
  else if(key==='insight'&&open&&val){ const gap=LIVE_MS[val.kind]||0, now=performance.now(); if(!gap||now-lastLive>gap){ lastLive=now; renderPhysicsDock(); } }
});
return { sync:syncPhysicsDock, render:renderPhysicsDock, place:placePhysicsPanel };
})());
}
export { PhysicsDock };
