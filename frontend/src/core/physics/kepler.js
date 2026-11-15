import { V } from './math.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/kepler.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    Stumpff functions, universal-variable two-body propagation, hyperbola timing
// imports math
// ====================================================================================================
// ---- Stumpff functions, universal-variable Kepler propagation, Lambert ----
function stC(z){ if(z>1e-6){ return (1-Math.cos(Math.sqrt(z)))/z; } if(z<-1e-6){ return (Math.cosh(Math.sqrt(-z))-1)/(-z); } return 0.5-z/24; }
function stS(z){ if(z>1e-6){ const s=Math.sqrt(z); return (s-Math.sin(s))/(s*s*s); } if(z<-1e-6){ const s=Math.sqrt(-z); return (Math.sinh(s)-s)/(s*s*s); } return 1/6-z/120; }

// Two-body propagation of (R0,V0) by dt (any consistent units).
function kepProp(R0,V0,dt,mu){
  if(dt===0) return { r:R0.slice(), v:V0.slice() };
  const r0=V.len(R0), v0=V.len(V0), vr0=V.dot(R0,V0)/r0, al=2/r0-v0*v0/mu, sm=Math.sqrt(mu);
  let x=sm*Math.abs(al)*dt; if(al<=0) x=Math.sign(dt)*Math.sqrt(-1/al||1)*Math.log(Math.max(2,(-2*mu*al*dt)/(V.dot(R0,V0)+Math.sign(dt)*Math.sqrt(-mu/al)*(1-r0*al))));
  if(!isFinite(x)) x=sm*dt/r0;
  for(let i=0;i<80;i++){
    const z=al*x*x, C=stC(z), S=stS(z);
    const F=r0*vr0/sm*x*x*C+(1-al*r0)*x*x*x*S+r0*x-sm*dt;
    const dF=r0*vr0/sm*x*(1-al*x*x*S)+(1-al*r0)*x*x*C+r0;
    const dx=F/dF; x-=dx; if(Math.abs(dx)<1e-11*Math.max(1,Math.abs(x))) break;
  }
  const z=al*x*x, C=stC(z), S=stS(z), f=1-x*x/r0*C, g=dt-x*x*x/sm*S;
  const R=V.add(V.mul(R0,f),V.mul(V0,g)), r=V.len(R), fd=sm/(r*r0)*(al*x*x*x*S-x), gd=1-x*x/r*C;
  return { r:R, v:V.add(V.mul(R0,fd),V.mul(V0,gd)) };
}

// Time since periapsis -> radius on a hyperbola (for capture-burn timing).
function hyperbolaRadius(mu, rp, vinf, t){
  const a=mu/(vinf*vinf), e=1+rp/a, n=Math.sqrt(mu/(a*a*a)), M=n*Math.abs(t);
  let H=Math.asinh(M/e)||0; for(let i=0;i<30;i++){ const d=(e*Math.sinh(H)-H-M)/(e*Math.cosh(H)-1); H-=d; if(Math.abs(d)<1e-12) break; }
  return a*(e*Math.cosh(H)-1);
}

// ORIGINAL MODULE END
export { stC, stS, kepProp, hyperbolaRadius };
