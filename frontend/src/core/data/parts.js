
// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/data/parts.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    rocket and spacecraft parts catalogue (GAME MODEL)
// imports —
// ====================================================================================================
// Rocket parts (GAME MODEL — sized like real kerolox / hydrolox hardware, not a specific vehicle).
const ROCKET = {
  seg:    { prop:58000, dry:3600, len:5.0, cost:11 },                       // one core tank segment
  eng:    { thrust:914e3, ispSL:282, ispVac:311, mass:470, cost:5.5 },      // "K-1" kerolox engine (vac thrust, N)
  boost:  { prop:62000, dry:7500, thrust:1700e3, ispSL:245, ispVac:275, cost:22 },
  upper:  { S:{ name:'Kestrel',   prop:14000, dry:1800, thrust:220e3, isp:345, len:4.0, cost:28, fuel:'RP-1' },
            M:{ name:'Heron',     prop:26000, dry:2600, thrust:400e3, isp:348, len:6.0, cost:42, fuel:'RP-1' },
            L:{ name:'Albatross', prop:46000, dry:4600, thrust:660e3, isp:460, len:9.5, cost:140, fuel:'LH2' } },
  fairing:{ S:{ mass:900,  r:1.85, len:6,  cost:5 }, M:{ mass:1700, r:2.3, len:8, cost:8 }, L:{ mass:2600, r:2.8, len:11, cost:12 } },
  thrustStruct:1500, interstage:900, integration:18, coreR:1.85,
  limits:{ segs:[2,7], engines:[1,9] },
};

// Spacecraft parts (GAME MODEL).
const CRAFT = {
  bus:  { S:{ dry:350, tank:500, slots:2, cost:45, base:80,  size:1.2 },
          M:{ dry:700, tank:1400, slots:3, cost:80, base:120, size:1.7 },
          L:{ dry:1200, tank:3200, slots:5, cost:130, base:180, size:2.3 } },
  isp: 320,
  solar:{ w1au:5000, mass:110, cost:12 },      // per wing pair, W at 1 AU
  rtg:  { w:110, mass:45, cost:70 },           // per unit, constant output
  ant:  { S:{ d:0.6, rf:10, dc:30, mass:12, cost:5 }, M:{ d:1.5, rf:25, dc:75, mass:35, cost:12 }, L:{ d:3.0, rf:60, dc:180, mass:80, cost:25 } },
  rateK: 21.5,                                  // kbps · AU² / (m² · W) — calibrated: New Horizons at Jupiter ≈ 38 kbps
  inst: {
    cam:  { name:'Camera',        mass:15,  w:15, cost:20, pts:20, fn:'Takes colour images of the surface and clouds.' },
    spec: { name:'Spectrometer',  mass:20,  w:20, cost:28, pts:25, fn:'Reads what things are made of from their light.' },
    mag:  { name:'Magnetometer',  mass:8,   w:5,  cost:12, pts:15, fn:'Measures the magnetic field from a long boom.' },
    radar:{ name:'Sounding radar',mass:40,  w:60, cost:40, pts:30, fn:'Looks under the surface for ice and rock layers.' },
    probe:{ name:'Lander',        mass:320, w:10, cost:90, pts:40, fn:'Separates at the target and descends to the surface.' },
  },
};

// ORIGINAL MODULE END
export { ROCKET, CRAFT };
