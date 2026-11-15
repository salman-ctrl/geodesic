
// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/data/missions.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    the five missions, optimiser priorities, real missions used for validation
// imports —
// ====================================================================================================
// Missions (budgets, limits and science goals are GAME MODEL).
const MISSIONS = {
  moon:   { name:'Moon',    level:'Beginner',     budget:340, goal:'Map water ice at the lunar south pole', need:['spec'],       maxYears:0.03, minRate:100, landing:true,  duration:'3–5 days',   dist:0.00257, blurb:'Three days away. Learn the rocket equation.' },
  mars:   { name:'Mars',    level:'Intermediate', budget:410, goal:'Find buried ice with a sounding radar',  need:['radar'],      maxYears:1.6,  minRate:50,  landing:true,  duration:'7–10 months',dist:1.52,    blurb:'Launch windows open every 26 months.' },
  jupiter:{ name:'Jupiter', level:'Advanced',     budget:420, goal:'Chart the giant magnetic field',          need:['mag','spec'],        maxYears:7.5,  minRate:10,  landing:false, duration:'2–7 years',  dist:5.2,     blurb:'A direct shot needs a giant rocket. Borrow speed instead.' },
  saturn: { name:'Saturn',  level:'Expert',       budget:690, goal:'Image the rings and read their makeup',   need:['cam','spec'], maxYears:11,   minRate:5,   landing:false, duration:'4–10 years', dist:9.54,    blurb:'Sunlight is 1% of Earth’s. Mind your power.' },
  neptune:{ name:'Neptune', level:'Expert',       budget:740, goal:'First orbiter at an ice giant',           need:['cam','mag'],  maxYears:17,   minRate:1,   landing:false, duration:'10–16 years',dist:30.07,   blurb:'Thirty times farther than the Sun. Chain your flybys.' },
};
const MISSION_ORDER = ['moon','mars','jupiter','saturn','neptune'];
const OPS_COST_PER_YEAR = 6;                 // $M per year of flight (GAME MODEL)
const REF_ISP = 340;                         // reference Isp for the "propellant saved" comparison (GAME MODEL)
const PRIORITY = { economy:0.03, balanced:0.10, fast:0.30 };   // km/s of ΔV the optimiser trades per year of flight

// Real missions used by the Validation panel.
// SOURCE STATUS: encounter dates and distances are currently copied from Wikipedia's mission articles, not yet
// checked against NASA/JPL primary records (Voyager closest-approach distances are from the planet's centre of mass).
// `verify:true` marks a figure that still has to be confirmed in the primary source.
const VALIDATION_CASES = [
  { id:'v1j', mission:'Voyager 1', what:'Jupiter flyby distance', unit:'km', real:348890,
    legs:[['earth',[1977,9,5,12.93]],['jupiter',[1979,3,5,12.09]],['saturn',[1980,11,12,23.77]]], at:1 },
  { id:'v2s', mission:'Voyager 2', what:'Saturn flyby distance', unit:'km', real:161000,
    legs:[['jupiter',[1979,7,9,22.48]],['saturn',[1981,8,26,3.4]],['uranus',[1986,1,24,18]]], at:1 },
  { id:'nhc3', mission:'New Horizons', what:'Launch energy C3', unit:'km²/s²', real:158, c3:true, verify:true,
    legs:[['earth',[2006,1,19,19]],['jupiter',[2007,2,28,5.73]]] },
  { id:'nhj', mission:'New Horizons', what:'Jupiter flyby distance', unit:'km', real:2300000,
    legs:[['earth',[2006,1,19,19]],['jupiter',[2007,2,28,5.73]],['pluto2015',[2015,7,14,12]]], at:1 },
];

// ORIGINAL MODULE END
export { MISSIONS, MISSION_ORDER, OPS_COST_PER_YEAR, REF_ISP, PRIORITY, VALIDATION_CASES };
