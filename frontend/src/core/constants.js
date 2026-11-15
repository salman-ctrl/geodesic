
// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/constants.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    physical constants and unit conversions
// imports —
// ====================================================================================================
const AU_KM = 149597870.7, DAY_S = 86400, G0 = 9.80665, C_KMS = 299792.458;
const MU_SUN_KM = 1.32712440018e11;                         // km^3/s^2
const MU_SUN = MU_SUN_KM * DAY_S * DAY_S / (AU_KM ** 3);    // AU^3/day^2
const AUD = AU_KM / DAY_S;                                  // 1 AU/day in km/s
const R_EARTH = 6378.137, MU_EARTH = 398600.4418, LEO_ALT = 200;
const J2000 = 2451545.0;
const D2R = Math.PI / 180, TAU = Math.PI * 2;

// ORIGINAL MODULE END
export { AU_KM, DAY_S, G0, C_KMS, MU_SUN_KM, MU_SUN, AUD, R_EARTH, MU_EARTH, LEO_ALT, J2000, D2R, TAU };
