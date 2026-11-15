import { dayFromDate } from '../physics/time.js';

// ORIGINAL MODULE BEGIN
// ====================================================================================================
// MODULE  src/core/game/rules.js
// layer   core · pure (no DOM, no Three.js, no store)
// what    game rules that are not physics: date window, crew roles, failure wording
// imports time
// ====================================================================================================
// Playable launch-date range [days from J2000].
const DATE_MIN = dayFromDate(2028,1,1), DATE_MAX = dayFromDate(2046,1,1);
// Hot-seat crew: which player owns which console, by crew size.
const ROLES = { lead:'Mission Lead', prop:'Propulsion', power:'Power & Comms', sci:'Science' };
const ROLE_MAP = { 2:{ lead:0, sci:0, prop:1, power:1 }, 3:{ lead:0, prop:1, power:2, sci:2 }, 4:{ lead:0, prop:1, power:2, sci:3 } };
// Why the autopilot ascent check failed, in words.
const SIM_FAIL = { nolift:'never leaves the pad', crash:'falls back before reaching orbit', breakup:'breaks up at max-Q', flight:'does not reach a stable orbit', pad:'never leaves the pad' };

// ORIGINAL MODULE END
export { DATE_MIN, DATE_MAX, ROLES, ROLE_MAP, SIM_FAIL };
