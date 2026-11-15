// Explicit integration check against backend/.env. Creates only a uniquely named
// verification room, and removes that room's own rows after checking every route.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabase } from '../backend/src/db.js';
import { scoreRun, LEADERBOARD_TABS } from '../backend/src/scoring.js';
import { validateMissionScore } from '../backend/src/validation.js';
import { classroomRun } from '../frontend/src/core/scoring.js';
import { moonRoute } from '../frontend/src/core/physics/route.js';

if (!process.argv.includes('--real-database')) throw new Error('Use --real-database to run the real database API checks.');
const root = new URL('../', import.meta.url);
process.loadEnvFile(new URL('backend/.env', root));
assert.equal(process.env.DB_SSL?.toLowerCase(), 'true', 'Real TiDB verification requires DB_SSL=true');
const base = `http://127.0.0.1:${process.env.PORT || 3001}`;
const db = createDatabase(process.env.DATABASE_URL, { ssl: true });
const teacherName = 'TiDB API verification ' + randomUUID();
const evidence = { startedAt: new Date().toISOString(), database: 'Real configured TiDB Cloud database', api: base, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true }, checks: [], cleanup: { completed: false } };
const stamp = randomUUID();
let roomCode;

async function request(method, path, body, expected, extra = {}) {
  const response = await fetch(base + path, {
    method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra.headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(20000),
  });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${path.split('?')[0]}: expected HTTP ${expected}`);
  evidence.checks.push({ method, route: path.replace(roomCode || /$^/, ':code'), status: response.status });
  return { response, data };
}

try {
  const health = await request('GET', '/api/health', undefined, 200);
  assert.deepEqual(health.data, { ok: true, db: true }); evidence.health = health.data;
  const [version] = await db.execute("SHOW SESSION STATUS LIKE 'Ssl_version'");
  evidence.tls.negotiatedVersion = version[0]?.Value;
  assert.match(evidence.tls.negotiatedVersion || '', /^TLSv1\.[23]$/, 'TiDB session must negotiate TLS 1.2 or newer');
  const [cipher] = await db.execute("SHOW SESSION STATUS LIKE 'Ssl_cipher'"); evidence.tls.cipher = cipher[0]?.Value;
  const created = await request('POST', '/api/rooms', { teacherName, mission: 'moon' }, 201);
  roomCode = created.data.code; assert.match(roomCode, /^[A-Z2-9]{8}$/); assert.equal(created.data.teacherName, teacherName);
  assert.equal(created.data.mission, 'moon');
  const { data: team } = await request('POST', `/api/rooms/${roomCode}/join`, { name: 'Verification Garuda' }, 201);
  assert.equal(team.token.length, 64); assert.equal(team.roomCode, roomCode); assert.equal(team.mission, 'moon');
  const { data: other } = await request('POST', `/api/rooms/${roomCode}/join`, { name: 'Verification Komodo' }, 201);
  assert.notEqual(team.id, other.id);
  await request('POST', `/api/rooms/${roomCode}/join`, { name: team.name }, 409);

  const sourceFlight = JSON.parse(fs.readFileSync(new URL('verification/playthroughs.json', root))).missions.find(r => r.name === 'react' && r.mission === 'moon').result;
  const native = classroomRun(sourceFlight, moonRoute(sourceFlight.rt.t0, 2.3));
  const makeRun = (joined, suffix, changes = {}) => ({
    roomCode, teamId: joined.id, token: joined.token, clientRunId: `${stamp}_${suffix}`,
    design: structuredClone(native.design), result: { ...structuredClone(native.result), ...changes },
  });
  const actual = makeRun(team, 'native'); actual.mission_score = 1001;
  const accepted = await request('POST', '/api/runs', actual, 201);
  assert.equal(accepted.data.score, scoreRun(actual.design, actual.result).score);
  validateMissionScore(accepted.data.score, true);
  const changedRetry = structuredClone(actual); changedRetry.result.science.got = 0;
  const retry = await request('POST', '/api/runs', changedRetry, 201);
  assert.deepEqual(retry.data, accepted.data, 'Retries must return the first saved run, not overwrite it');

  const minimum = makeRun(team, 'minimum', {
    science: { got: 0, max: 65 }, propellant: { used: 1000, bestDirect: 1000 }, costMillion: 340,
    flightDays: .03 * 365.25, landing: null, capture: null,
  });
  assert.equal((await request('POST', '/api/runs', minimum, 201)).data.score, 0);
  const maximum = makeRun(other, 'maximum', {
    science: { got: 65, max: 65 }, propellant: { used: 0, bestDirect: 1000 }, costMillion: 0, flightDays: 0,
  });
  assert.equal((await request('POST', '/api/runs', maximum, 201)).data.score, 1000);
  const middle = makeRun(other, 'middle', {
    science: { got: 30, max: 65 }, propellant: { used: 100, bestDirect: 1000 }, costMillion: 100, flightDays: 2,
  });
  await request('POST', '/api/runs', middle, 201);
  const failed = makeRun(team, 'failure', {
    outcome: { ok: false, title: 'API verification failure fixture' },
    lesson: 'Verification fixture: correct the trajectory at the first window.',
  });
  assert.equal((await request('POST', '/api/runs', failed, 201)).data.score, null);
  const fields = { missionScore: 'mission_score', fuelSaver: 'propellant_saved', mostScience: 'science_points', cheapestSuccess: 'cost_million', fastestArrival: 'flight_days' };
  for (const [tab, spec] of Object.entries(LEADERBOARD_TABS)) {
    const { data: board } = await request('GET', `/api/rooms/${roomCode}/leaderboard?tab=${tab}`, undefined, 200);
    assert.equal(board.room.code, roomCode); assert.equal(board.teams.length, 2); assert.equal(board.tab, tab);
    assert.equal(board.runs.length, spec.success ? 4 : 1);
    if (spec.success) {
      for (const row of board.runs) validateMissionScore(row.mission_score, true);
      const values = board.runs.map(r => Number(r[fields[tab]])), sorted = [...values].sort((a, b) => spec.order.endsWith('DESC') ? b - a : a - b);
      assert.deepEqual(values, sorted, `Wrong ranking for ${tab}`);
    } else { assert.equal(board.runs[0].mission_score, null); assert.equal(board.runs[0].lesson, failed.result.lesson); }
  }
  const defaultBoard = await request('GET', `/api/rooms/${roomCode}/leaderboard`, undefined, 200); assert.equal(defaultBoard.data.tab, 'missionScore');

  const forbidden = makeRun(team, 'forbidden'); forbidden.token = (team.token[0] === 'a' ? 'b' : 'a').repeat(64);
  await request('POST', '/api/runs', forbidden, 403);
  const mismatch = makeRun(team, 'mission'); mismatch.design.mission = 'mars'; await request('POST', '/api/runs', mismatch, 400);
  const badMetrics = makeRun(team, 'invalid'); badMetrics.result.science.got = 999; await request('POST', '/api/runs', badMetrics, 400);
  await request('POST', '/api/rooms', { teacherName, mission: 'pluto' }, 400);
  await request('POST', '/api/rooms', '{', 400);
  await request('GET', `/api/rooms/${roomCode}/leaderboard?tab=constructor`, undefined, 400);
  const unknown = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase().replace(/[01]/g, 'Z');
  await request('GET', `/api/rooms/${unknown}/leaderboard`, undefined, 404);
  await request('POST', `/api/rooms/${unknown}/join`, { name: 'Missing room test' }, 404);
  await request('GET', '/api/nonexistent', undefined, 404);
  const preflight = await request('OPTIONS', '/api/rooms', undefined, 204, { headers: { Origin: process.env.FRONTEND_URL || 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' } });
  assert.equal(preflight.response.headers.get('access-control-allow-origin'), process.env.FRONTEND_URL || 'http://localhost:5173');
  await request('GET', '/api/health', undefined, 403, { headers: { Origin: 'https://not-allowed.invalid' } });

  const [persisted] = await db.execute('SELECT r.successful, r.mission_score, r.client_run_id FROM runs r JOIN rooms room ON room.id = r.room_id WHERE room.code = ? AND room.teacher_name = ?', [roomCode, teacherName]);
  assert.equal(persisted.length, 5);
  for (const row of persisted) validateMissionScore(row.mission_score, !!row.successful);
  evidence.persistedScores = persisted.map(row => ({ successful: !!row.successful, mission_score: row.mission_score }));
  assert.deepEqual((await request('GET', '/api/health', undefined, 200)).data, { ok: true, db: true });
  evidence.passed = true;
} catch (error) {
  evidence.passed = false;
  evidence.error = { type: error.name, code: error.code, message: error.name === 'AssertionError' ? error.message : 'Real API verification failed; inspect the failing check and server status.' };
  process.exitCode = 1;
} finally {
  try {
    if (roomCode) {
      // Every deletion is restricted to the exact code AND unique teacher label created here.
      const ownRoom = 'SELECT id FROM rooms WHERE code = ? AND teacher_name = ?';
      const [runs] = await db.execute(`DELETE FROM runs WHERE room_id IN (${ownRoom})`, [roomCode, teacherName]);
      const [teams] = await db.execute(`DELETE FROM teams WHERE room_id IN (${ownRoom})`, [roomCode, teacherName]);
      const [rooms] = await db.execute('DELETE FROM rooms WHERE code = ? AND teacher_name = ?', [roomCode, teacherName]);
      evidence.cleanup = { completed: rooms.affectedRows === 1, runs: runs.affectedRows, teams: teams.affectedRows, rooms: rooms.affectedRows };
      assert.equal(rooms.affectedRows, 1);
    } else evidence.cleanup = { completed: true, createdRoom: false };
  } catch (error) { evidence.cleanup = { completed: false, code: error.code, verificationRoomCode: roomCode }; process.exitCode = 1; }
  await db.close();
  evidence.finishedAt = new Date().toISOString();
  fs.mkdirSync(new URL('verification/', root), { recursive: true });
  fs.writeFileSync(new URL('verification/backend-real-api.json', root), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
}
