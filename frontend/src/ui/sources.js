import { $$ } from './dom.js';

// ====================================================================================================
// MODULE  src/ui/sources.js
// layer   ui
// what    sources and game-model list (landing page and report modal)
// imports ui/dom
// ====================================================================================================
// f. sources + game-model list (shared by landing page and report)

let SOURCES_HTML;
export function initialize(){
(SOURCES_HTML = `
<h4>Real data</h4><ul>
<li><b>Planet positions.</b> JPL Solar System Dynamics, “Approximate Positions of the Planets”, Table 1 (Keplerian elements and rates, 1800–2050 AD). ssd.jpl.nasa.gov/planets/approx_pos.html. Earth uses the Earth–Moon barycentre row.</li>
<li><b>Gravitational parameters and radii.</b> JPL SSD planetary physical parameters; Sun GM = 1.32712440018 × 10¹¹ km³/s²; 1 au = 149 597 870.7 km.</li>
<li><b>Pluto aim point</b> (validation only). JPL Horizons, heliocentric ecliptic J2000 position on 2015-Jul-14 12:00 TDB.</li>
<li><b>Flight records</b> (validation only). <span class="gm">From Wikipedia</span>These encounter dates and closest-approach distances are currently copied from Wikipedia's Voyager 1, Voyager 2 and New Horizons articles. They have not yet been checked line by line against NASA/JPL primary records: Voyager 1 at Jupiter, 348 890 km from centre, 5 Mar 1979. Voyager 2 at Saturn, 161 000 km from centre, 26 Aug 1981. New Horizons at Jupiter, 2.3 million km, 28 Feb 2007.</li>
<li><b>New Horizons launch energy</b> (validation only). <span class="gm">To verify</span>C3 ≈ 158 km²/s² is the commonly quoted figure, usually attributed to Guo &amp; Farquhar, “New Horizons Mission Design” (2008). We have not yet confirmed the number in the paper itself.</li>
</ul>
<h4>Real methods</h4><ul>
<li><b>Rocket equation</b> for every stage and every burn (Isp, mass ratio).</li>
<li><b>Vis-viva</b> for departure, capture and periapsis burns (Oberth effect included).</li>
<li><b>Patched conics</b> with zero-radius spheres of influence; flyby turn angle from hyperbolic geometry.</li>
<li><b>Lambert solver</b> (universal variables, single revolution, prograde) for every transfer arc; universal-variable Kepler propagation for the craft.</li>
</ul>
<h4>Newton / Einstein laboratory</h4><ul>
<li><b>Newton tab.</b> Newton's inverse-square gravity and the existing Kepler two-body propagator; the mass and speed sliders describe hypothetical test cases, not actual planet ephemerides.</li>
<li><b>Einstein tab.</b> The static Schwarzschild gravitational clock factor √(1 − 2GM/rc²). The two ideal clocks are stationary at radii measured from the planet's centre; it excludes spacecraft velocity, planet spin, and other-body gravity. The grid and visibly different clock-hand speeds are explicitly exaggerated analogies, not numerical spacetime geometry.</li>
<li><b>Scientific scope.</b> In general relativity a free-falling spacecraft follows a geodesic, which gives the game its name. The mission flight paths are computed as Newtonian patched conics, because for these trajectories the relativistic correction is below one part in a million. They are not full N-body integrations either. Planet orbital data are embedded JPL approximate elements, not a live JPL Horizons feed.</li>
</ul>
<h4>Game model (simplified on purpose)</h4><ul>
<li><span class="gm">Game model</span>Rocket and spacecraft parts, masses, thrust, costs and budgets are invented. They are sized like real kerolox and hydrolox hardware but are not any real vehicle.</li>
<li><span class="gm">Game model</span>Ascent: 2-D point mass, exponential atmosphere, constant drag coefficient, no Earth rotation, scripted guidance after the gravity turn. Structural limit at 95 kPa dynamic pressure.</li>
<li><span class="gm">Game model</span>Parking orbit fixed at 200 km. “LEO needs about 9.3 km/s” is calibrated on our own ascent simulation.</li>
<li><span class="gm">Game model</span>The Moon moves on a circular, coplanar orbit (mean longitude only).</li>
<li><span class="gm">Game model</span>Clicking a planet twice means a 2:1 resonant return (two planet years). Other resonances and multi-revolution arcs are not modelled.</li>
<li><span class="gm">Game model</span>Minimum flyby altitudes, capture orbits (after MRO, Juno, Cassini) and mission time limits are our choices.</li>
<li><span class="gm">Game model</span>“Propellant saved” compares the burns after parking orbit using one reference engine (Isp 340 s) pushing your dry spacecraft, against the best direct launch window between 2028 and 2046.</li>
<li><span class="gm">Game model</span>Data rate = 21.5 kbps × dish² × RF watts ÷ distance², fitted to New Horizons at Jupiter (about 38 kbps). Solar power falls as 1/distance²; RTG output is constant.</li>
<li><span class="gm">Game model</span>Injection and aiming errors are exaggerated so that corrections matter. Signal delay uses true distance and the speed of light.</li>
<li><span class="gm">Game model</span>Landing is vertical only, with constant gravity. Mars entry and parachute phases are skipped.</li>
<li><span class="gm">Game model</span>In the route map, distances from the Sun are compressed (square-root scale) and planets are drawn far larger than life. Angles and dates are true.</li>
</ul>`);
SOURCES_HTML += `<section class="classroom-source"><h4>Classroom Mission Score</h4><ul>
<li><span class="gm">Game model</span>Successful flights receive round(1000 × (0.35 × science fraction + 0.30 × propellant saved fraction + 0.20 × budget left fraction + 0.15 × time left fraction) + bonus), capped at 1,000. Each fraction is clamped to 0–1.</li>
<li>Science fraction = returned points / maximum points. Propellant saved = 1 − reference propellant used / best direct reference propellant. Both propellant values use the report’s reference Isp of 340 s and the same dry spacecraft mass. Budget left = 1 − mission cost / mission budget. Time left = 1 − flight days / mission limit days.</li>
<li>Bonus: +25 for a landed touchdown below 3 m/s; +25 for a full capture whose burn is within 8% of the minimum capture burn. Failed flights have no Mission Score. Their written lessons appear newest first in the failure lesson board, without automatic quality grading.</li>
<li>The shared classroom server calculates submitted scores. It validates reported metrics but does not replay the flight. Offline practice uses the same formula and saves rooms, teams, flight reports and pending uploads in this browser. Local rooms cannot be joined from another device.</li>
</ul></section>`;
$$('[data-sources]').forEach(e=>e.innerHTML=SOURCES_HTML);
}
export { SOURCES_HTML };
