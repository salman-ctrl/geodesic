import { MISSIONS, REF_ISP } from './data/missions.js';
import { scienceScore } from './game/scoring.js';
import { propFor } from './physics/rocket.js';

const unit = value => Math.max(0, Math.min(1, value));
// Classroom GAME MODEL, matching backend/src/scoring.js. Original science scoring is unchanged.
export function scoreRun(design, result) {
  const mission = MISSIONS[design.mission];
  const parts = {
    science: unit(result.science.max ? result.science.got / result.science.max : 0),
    propellant: unit(result.propellant.bestDirect ? 1 - result.propellant.used / result.propellant.bestDirect : 0),
    budget: unit(1 - result.costMillion / mission.budget),
    time: unit(1 - result.flightDays / (mission.maxYears * 365.25)),
  };
  const soft = result.landing?.status === 'landed' && result.landing.v < 3;
  const peri = result.capture?.result === 'orbit' && result.capture.best > 0 && result.capture.need <= result.capture.best * 1.08;
  const bonus = (soft ? 25 : 0) + (peri ? 25 : 0);
  return { score: result.outcome.ok ? Math.min(1000, Math.round(1000 * (.35 * parts.science + .30 * parts.propellant + .20 * parts.budget + .15 * parts.time) + bonus)) : null, parts, bonus };
}

export const LEADERBOARD_TABS = {
  missionScore: { label: 'Mission Score', field: 'mission_score', descending: true },
  fuelSaver: { label: 'Fuel Saver', field: 'propellant_saved', descending: true },
  mostScience: { label: 'Most Science', field: 'science_points', descending: true },
  cheapestSuccess: { label: 'Cheapest Success', field: 'cost_million', descending: false },
  fastestArrival: { label: 'Fastest Arrival', field: 'flight_days', descending: false },
  bestFailureLesson: { label: 'Best failure lesson', field: 'created_at', descending: true, failure: true },
};

// Use exactly the report's reference Isp and the SAME flight dry mass for both comparisons.
export function classroomRun(flight, baseline, lesson = '') {
  const route = flight.rt;
  return {
    design: {
      mission: flight.mission,
      rocket: structuredClone(flight.rocket),
      craft: structuredClone(flight.craft),
      route: route ? { chain: route.chain.slice(), day: route.t0, days: route.days } : null,
    },
    result: {
      outcome: structuredClone(flight.outcome),
      science: scienceScore(flight),
      propellant: {
        used: route ? propFor(route.dvTotal, REF_ISP, flight.dry) : 0,
        bestDirect: baseline ? propFor(baseline.dvTotal, REF_ISP, flight.dry) : 0,
      },
      costMillion: flight.cost.total,
      flightDays: route?.days || 0,
      landing: flight.landing ? structuredClone(flight.landing) : null,
      capture: flight.capture ? { result: flight.capture.result, need: flight.capture.need, best: flight.capture.best } : null,
      launch: flight.launch ? structuredClone(flight.launch) : null,
      gains: structuredClone(flight.gains),
      lesson: lesson.trim(),
    },
  };
}
