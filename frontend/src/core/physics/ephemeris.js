import { BODIES, PLUTO_2015 } from '../data/bodies.js';
import { D2R, TAU, MU_SUN } from '../constants.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/ephemeris.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    planet and Moon positions from Keplerian elements
// imports constants, data/bodies, math
// ====================================================================================================
// ---- planet ephemeris: JPL approximate Keplerian elements ----
function elementsAt(key, d){
  const b=BODIES[key], T=d/36525, o=[]; for(let i=0;i<6;i++) o.push(b.el[i]+b.rt[i]*T);
  return { a:o[0], e:o[1], I:o[2]*D2R, L:o[3]*D2R, wp:o[4]*D2R, Om:o[5]*D2R };
}
function solveKepler(M,e){ let E=M+e*Math.sin(M); for(let i=0;i<12;i++){ const dE=(M-(E-e*Math.sin(E)))/(1-e*Math.cos(E)); E+=dE; if(Math.abs(dE)<1e-12) break; } return E; }
// Heliocentric J2000-ecliptic state. r [AU], v [AU/day].
function planetState(key, d){
  if(key==='pluto2015') return { r:PLUTO_2015.slice(), v:[0,0,0] };
  const k=elementsAt(key,d), w=k.wp-k.Om;
  let M=(k.L-k.wp)%TAU; if(M>Math.PI) M-=TAU; if(M<-Math.PI) M+=TAU;
  const E=solveKepler(M,k.e), cE=Math.cos(E), sE=Math.sin(E), b=k.a*Math.sqrt(1-k.e*k.e);
  const xp=k.a*(cE-k.e), yp=b*sE;
  const n=Math.sqrt(MU_SUN/(k.a*k.a*k.a)), Ed=n/(1-k.e*cE), vxp=-k.a*sE*Ed, vyp=b*cE*Ed;
  const cw=Math.cos(w), sw=Math.sin(w), cO=Math.cos(k.Om), sO=Math.sin(k.Om), cI=Math.cos(k.I), sI=Math.sin(k.I);
  const m11=cw*cO-sw*sO*cI, m12=-sw*cO-cw*sO*cI, m21=cw*sO+sw*cO*cI, m22=-sw*sO+cw*cO*cI, m31=sw*sI, m32=cw*sI;
  return { r:[m11*xp+m12*yp, m21*xp+m22*yp, m31*xp+m32*yp], v:[m11*vxp+m12*vyp, m21*vxp+m22*vyp, m31*vxp+m32*vyp] };
}
// Geocentric Moon (GAME MODEL: circular, coplanar). r [km], v [km/day].
function moonState(d){
  const L=(218.316+13.176396*d)*D2R, a=BODIES.moon.aKm, n=13.176396*D2R;
  return { r:[a*Math.cos(L),a*Math.sin(L),0], v:[-a*n*Math.sin(L),a*n*Math.cos(L),0] };
}

// ORIGINAL MODULE END
export { elementsAt, solveKepler, planetState, moonState };
