
// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/format.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    number, mass, duration, data-rate and delay formatting (strings only)
// imports —
// ====================================================================================================
const fmtN = (v,dec=2)=>isFinite(v)? v.toLocaleString('en-US',{ minimumFractionDigits:dec, maximumFractionDigits:dec }) : '—';
const fmtMass = kg=>kg>=1000? fmtN(kg/1000,kg>=100000?0:1)+' t' : fmtN(kg,0)+' kg';
const fmtRate = k=>k>=1e6? fmtN(k/1e6,1)+' Gbps' : k>=1000? fmtN(k/1000,1)+' Mbps' : fmtN(k,k<10?2:1)+' kbps';
const fmtDur = d=>d<40? fmtN(d,1)+' days' : d<730? Math.round(d/30.44)+' months' : fmtN(d/365.25,1)+' years';
const fmtDelay = s=>s>=3600? `${Math.floor(s/3600)} h ${Math.round(s%3600/60)} min` : s>=60? `${Math.floor(s/60)} min ${String(Math.round(s%60)).padStart(2,'0')} s` : fmtN(s,1)+' s';

// ORIGINAL MODULE END
export { fmtN, fmtMass, fmtRate, fmtDur, fmtDelay };
