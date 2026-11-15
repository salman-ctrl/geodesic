
// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/math.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    3-vectors, clamp, lerp, seeded random, colour maths
// imports —
// ====================================================================================================
const V = {
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s], dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]), unit:a=>{ const l=Math.hypot(a[0],a[1],a[2])||1; return [a[0]/l,a[1]/l,a[2]/l]; },
};
const clamp = (x,a,b)=>Math.min(b,Math.max(a,x));
const lerp = (a,b,t)=>a+(b-a)*t;
const hex = c=>'#'+c.toString(16).padStart(6,'0');
function tint(c, a){ const r=c>>16&255, g=c>>8&255, b=c&255, t=a>0?255:0, k=Math.abs(a); return `rgb(${Math.round(lerp(r,t,k))},${Math.round(lerp(g,t,k))},${Math.round(lerp(b,t,k))})`; }
function rng(seed){ return ()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ORIGINAL MODULE END
export { V, clamp, lerp, hex, tint, rng };
