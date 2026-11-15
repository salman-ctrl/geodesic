
// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/data/bodies.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    planets and the Moon: JPL elements, GM, radii, capture orbits, the Pluto aim point
// imports —
// ====================================================================================================
// JPL "Approximate Positions of the Planets", Table 1 (valid 1800–2050 AD).
// el  = a [au], e, I [deg], L [deg], long.peri [deg], long.node [deg]
// rt  = rates per Julian century.   Source: ssd.jpl.nasa.gov/planets/approx_pos.html
// gm [km^3/s^2], R = equatorial radius [km]: JPL SSD planetary physical parameters.
// minAlt (lowest allowed flyby altitude), col, draw (display radius) are GAME MODEL values.
const BODIES = {
  mercury:{ name:'Mercury', el:[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593],
            rt:[0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081], gm:22032, R:2439.7, minAlt:200, col:0xa39a8f, draw:2.2 },
  venus:  { name:'Venus',   el:[0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255],
            rt:[0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418], gm:324859, R:6051.8, minAlt:300, col:0xe8c583, draw:3.4 },
  earth:  { name:'Earth',   el:[1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0],
            rt:[0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0], gm:398600.4418, R:6378.137, minAlt:300, col:0x3d8fcf, draw:3.6 },
  mars:   { name:'Mars',    el:[1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],
            rt:[0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343], gm:42828.4, R:3396.2, minAlt:200, col:0xc9573f, draw:2.8 },
  jupiter:{ name:'Jupiter', el:[5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909],
            rt:[-0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106], gm:126686534, R:71492, minAlt:14000, col:0xd9a066, draw:8.5 },
  saturn: { name:'Saturn',  el:[9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448],
            rt:[-0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794], gm:37931187, R:60268, minAlt:12000, col:0xe3c98f, draw:7.2 },
  uranus: { name:'Uranus',  el:[19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503],
            rt:[-0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589], gm:5793939, R:25559, minAlt:5000, col:0x9fd9d6, draw:5.4 },
  neptune:{ name:'Neptune', el:[30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],
            rt:[0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664], gm:6836529, R:24764, minAlt:5000, col:0x4f6fd8, draw:5.2 },
  // The Moon is not in Table 1. GAME MODEL: circular, coplanar orbit; mean longitude L = 218.316° + 13.176396°·d.
  moon:   { name:'Moon', gm:4902.8, R:1737.4, minAlt:50, col:0xcfc8bb, draw:3.0, aKm:384400 },
};
const PLANET_ORDER = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

// Capture orbits (GAME MODEL, loosely after MRO / Juno / Cassini insertion orbits).
const CAPTURE = {
  moon:{ alt:100, circular:true }, mars:{ alt:300, periodH:35 },
  jupiter:{ rpR:1.06, periodH:53.5*24 }, saturn:{ rpR:1.3, periodH:120*24 }, neptune:{ rpR:1.1, periodH:50*24 },
};

// Pluto is not in JPL Table 1. One fixed heliocentric J2000-ecliptic position (AU) from JPL Horizons
// (target 999, centre Sun, 2015-Jul-14 12:00 TDB) is used only as the outbound aim point for New Horizons.
const PLUTO_2015 = [8.002849452503835, -31.90164025746010, 1.097896741396346];

// ORIGINAL MODULE END
export { BODIES, PLANET_ORDER, CAPTURE, PLUTO_2015 };
