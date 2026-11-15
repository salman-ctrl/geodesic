import { BODIES } from '../core/data/bodies.js';
import { fmtN } from '../core/format.js';

// ====================================================================================================
// MODULE  src/ui/physicsReport.js
// layer   ui
// what    physics breakdown block of the report
// imports core/format, core/data/bodies
// ====================================================================================================


function renderPhysicsReport(F){const rt=F.rt;if(!rt)return '';
  const row=(name,value)=>`<div class="pr-row"><span>${name}</span><b>${value}</b></div>`;
  const fbRows=rt.flybys.map((fb,i)=>{const actual=F.gains[i];      // gains are pushed in flyby order, so index i is flyby i (a planet can appear twice)
    return row(`Flyby ${i+1}: ${BODIES[fb.body].name} (${fmtN(fb.rp/BODIES[fb.body].R,2)} R planned)`,
      `planned ${fmtN(fb.dv,2)} km/s`+(actual?` · used ${fmtN(actual.applied,2)}`:''));}).join('');
  const c=F.capture;
  return `<details class="physics-report"><summary>Physics breakdown · inspect the calculations</summary>
    <p>GEODESIC records the physics behind your decisions, not just a final score. The flight dynamics are Newtonian two-body/heliocentric patched conics with modelled burns.</p>
    <div class="pr-eq">Rocket equation: Δv = Isp · g₀ · ln(m₀/m₁)<br>Transfer energy: v² = μ(2/r − 1/a)</div>
    ${row('Planned departure burn',fmtN(rt.dvDep,2)+' km/s')}
    ${row('Planned flyby steering',fmtN(rt.dvFly,2)+' km/s')}
    ${row('Planned arrival capture',fmtN(rt.dvCap,2)+' km/s')}
    ${row('Planned burn budget',fmtN(rt.dvTotal,2)+' km/s')}
    ${fbRows||row('Flyby encounters','none')}
    ${F.gains.map(g=>row(BODIES[g.body].name+' actual gravity gain',(g.gain>=0?'+':'')+fmtN(g.gain,2)+' km/s')).join('')}
    ${c?row('Actual capture burn required',fmtN(c.need,2)+' km/s (best '+fmtN(c.best,2)+')'):''}
    <p>Newtonian gravity accelerates the spacecraft; flyby geometry changes the direction of its planet-relative velocity. The planet's orbital motion can change its Sun-relative speed. Explore the Newton / Einstein laboratory on the landing page for a separate gravitational clock demonstration.</p>
    <div class="pr-eq">Einstein laboratory: dτ/dt = √(1 − 2GM/(rc²))<br>Educational stationary-clock calculation only — not used to navigate this flight.</div>
  </details>`;
}
export function initialize(){
}
export { renderPhysicsReport };
