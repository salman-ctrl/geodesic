import { J2000 } from '../constants.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/physics/time.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    calendar <-> days from J2000
// imports constants
// ====================================================================================================
// ---- calendar ------------------------------------------------
function dayFromDate(y,m,d,h=0){ return Date.UTC(y,m-1,d)/86400000 + h/24 + 2440587.5 - J2000; }   // days from J2000
function dateFromDay(d){ return new Date((d + J2000 - 2440587.5) * 86400000); }
function fmtDate(d){ const t=dateFromDay(d); return t.getUTCFullYear()+'-'+String(t.getUTCMonth()+1).padStart(2,'0')+'-'+String(t.getUTCDate()).padStart(2,'0'); }

// ORIGINAL MODULE END
export { dayFromDate, dateFromDay, fmtDate };
