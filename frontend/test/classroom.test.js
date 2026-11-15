import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createApiClient } from '../src/api/client.js';
import { scoreRun, classroomRun, LEADERBOARD_TABS } from '../src/core/scoring.js';
import { scoreRun as serverScore } from '../../backend/src/scoring.js';
import { validateRun } from '../../backend/src/validation.js';
import { moonRoute } from '../src/core/physics/route.js';
import { propFor } from '../src/core/physics/rocket.js';
import { REF_ISP } from '../src/core/data/missions.js';

const storage = () => { const values = new Map(); return { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) }; };
const design = { mission: 'moon', rocket: { segs: 3, engines: 3, boosters: 2, upper: 'S', fairing: 'S' }, craft: { bus: 'S', power: 'solar', powerN: 1, antenna: 'S', instruments: ['spec', 'probe'], tank: 1 } };
const result = { outcome: { ok: true, title: 'Landed on the Moon' }, science: { got: 65, max: 65 }, propellant: { used: 500, bestDirect: 1000 }, costMillion: 170, flightDays: 3, landing: { status: 'landed', v: 2 }, capture: { result: 'orbit', need: 1, best: 1 }, lesson: '' };
const payload = (team, clientRunId, overrides = {}) => ({ roomCode: team.roomCode, teamId: team.id, token: team.token, clientRunId, design: structuredClone(design), result: { ...structuredClone(result), ...overrides } });

test('classroom score matches the unchanged server at boundaries and for every mission', () => {
  for (const mission of ['moon', 'mars', 'jupiter', 'saturn', 'neptune']) for (const ok of [true, false]) for (const saved of [-1, 0, .5, 1, 2]) {
    const r = structuredClone(result); r.outcome.ok = ok; r.propellant.used = (1 - saved) * 1000;
    assert.deepEqual(scoreRun({ ...design, mission }, r), serverScore({ ...design, mission }, r));
  }
  assert.equal(scoreRun(design, result).bonus, 50);
  assert.equal(scoreRun(design, { ...result, outcome: { ok: false } }).score, null);
});

test('report payload uses the same dry mass and reference Isp, and is accepted by the existing backend', () => {
  const native = JSON.parse(fs.readFileSync(new URL('../../verification/playthroughs.json', import.meta.url)));
  const flight = native.missions.find(r => r.mission === 'moon' && r.result).result;
  const baseline = moonRoute(flight.rt.t0, 2.3), run = classroomRun(flight, baseline);
  assert.equal(run.result.propellant.used, propFor(flight.rt.dvTotal, REF_ISP, flight.dry));
  assert.equal(run.result.propellant.bestDirect, propFor(baseline.dvTotal, REF_ISP, flight.dry));
  assert.doesNotThrow(() => validateRun({ ...run, roomCode: 'ABCDEFGH', teamId: '1', token: 'a'.repeat(64), clientRunId: 'native_flight' }));
  assert.deepEqual(scoreRun(run.design, run.result), serverScore(run.design, run.result));
});

test('offline create/join/resume, durable flights, idempotent submissions and six actual rankings', async () => {
  const disk = storage(), client = createApiClient({ storage: disk });
  const room = await client.createRoom({ teacherName: 'Teacher', mission: 'moon' });
  assert.equal(room.mode, 'local'); assert.match(room.code, /^[A-Z2-9]{8}$/);
  const team = await client.joinRoom(room.code, 'Garuda');
  await client.submitRun(payload(team, 'one'));
  await client.submitRun(payload(team, 'one', { science: { got: 1, max: 65 } }));
  await client.submitRun(payload(team, 'failure', { outcome: { ok: false, title: 'Missed the Moon' }, lesson: 'Correct course early.' }));
  for (const tab of Object.keys(LEADERBOARD_TABS)) {
    const board = await client.leaderboard(room.code, tab);
    assert.equal(board.runs.length, 1); assert.equal(board.runs[0].clientRunId, tab === 'bestFailureLesson' ? 'failure' : 'one');
  }
  assert.equal((await client.leaderboard(room.code)).runs[0].science_points, 65);
  const second = await client.joinRoom(room.code, 'Komodo'); assert.notEqual(team.id, second.id);
  const reopened = createApiClient({ storage: disk });
  assert.equal((await reopened.joinRoom(room.code, 'garuda')).token, team.token);
  reopened.saveFlight({ clientRunId: 'history', design, result });
  assert.equal(createApiClient({ storage: disk }).session().history.length, 1);
  await assert.rejects(client.joinRoom('ZZZZZZZZ', 'Other'), /not saved on this device/);
  const wrong = payload(team, 'wrong'); wrong.design.mission = 'mars'; await assert.rejects(client.submitRun(wrong), /room mission/);
});

test('local leaderboard sorts independently by each metric and excludes failed and lessonless flights', async () => {
  const client = createApiClient({ storage: storage() });
  const room = await client.createRoom({ teacherName: 'T', mission: 'moon' }), team = await client.joinRoom(room.code, 'A');
  await client.submitRun(payload(team, 'slow', { costMillion: 300, flightDays: 4, science: { got: 65, max: 65 }, propellant: { used: 900, bestDirect: 1000 } }));
  await client.submitRun(payload(team, 'fast', { costMillion: 100, flightDays: 2, science: { got: 30, max: 65 }, propellant: { used: 100, bestDirect: 1000 } }));
  await client.submitRun(payload(team, 'failure', { outcome: { ok: false, title: 'Failed' } }));
  for (const tab of ['fuelSaver', 'cheapestSuccess', 'fastestArrival']) assert.equal((await client.leaderboard(room.code, tab)).runs[0].clientRunId, 'fast');
  assert.equal((await client.leaderboard(room.code, 'mostScience')).runs[0].clientRunId, 'slow');
  assert.equal((await client.leaderboard(room.code, 'bestFailureLesson')).runs.length, 0);
});

test('remote failures queue one durable run, replay with the same id, and never hide validation/auth errors', async () => {
  let down = false, failure = 0; const submitted = [];
  const team = { id: '1', name: 'Garuda', roomCode: 'ABCDEFGH', mission: 'moon', token: 'a'.repeat(64) };
  const fetcher = async (url, options) => {
    if (down) throw new TypeError('Network down');
    if (failure) return new Response(JSON.stringify({ message: 'Rejected input' }), { status: failure });
    if (url.includes('/join')) return Response.json(team);
    if (url.endsWith('/api/runs')) { const body = JSON.parse(options.body); submitted.push(body); return Response.json({ id: '42', score: serverScore(body.design, body.result).score }); }
    return Response.json({ room: { code: team.roomCode, mission: 'moon' }, teams: [team], runs: [], tab: 'missionScore' });
  };
  const disk = storage(), client = createApiClient({ baseUrl: 'http://classroom', fetcher, storage: disk });
  await client.joinRoom(team.roomCode, team.name); await client.leaderboard(team.roomCode);
  down = true; const run = payload(team, 'retry_id');
  assert.equal((await client.submitRun(run)).mode, 'queued'); await client.submitRun(run);
  assert.equal(client.session().pending, 1);
  assert.equal((await client.leaderboard(team.roomCode)).runs.length, 1);
  const reopened = createApiClient({ baseUrl: 'http://classroom', fetcher, storage: disk });
  down = false; assert.equal((await reopened.syncPending()).synced, 1);
  assert.equal(reopened.session().pending, 0); assert.equal(submitted[0].clientRunId, 'retry_id');
  for (const status of [400, 403, 404, 409]) { failure = status; await assert.rejects(client.createRoom({ teacherName: 'T', mission: 'moon' }), /Rejected input/); }
  failure = 403; await assert.rejects(client.submitRun(payload(team, 'forbidden')), /Rejected input/); assert.equal(client.session().pending, 0);
});

test('unavailable storage leaves a playable in-memory session with a visible warning', async () => {
  const client = createApiClient({ storage: { getItem() { throw new Error(); }, setItem() { throw new Error(); } } });
  const room = await client.createRoom({ teacherName: 'T', mission: 'moon' }); await client.joinRoom(room.code, 'A');
  assert.equal(client.session().room.code, room.code); assert.match(client.storageWarning, /storage is unavailable/);
});

test('a background leaderboard response cannot switch the selected room', async () => {
  let created = 0;
  const client = createApiClient({ storage: storage(), baseUrl: 'http://classroom', fetcher: async url => {
    if (url.endsWith('/api/rooms')) return Response.json({ code: created++ ? 'KLMNPQRS' : 'ABCDEFGH', mission: 'moon', teacherName: 'T' });
    return Response.json({ room: { code: 'ABCDEFGH', mission: 'moon' }, teams: [], runs: [], tab: 'missionScore' });
  } });
  const old = await client.createRoom({ teacherName: 'T', mission: 'moon' });
  const current = await client.createRoom({ teacherName: 'T', mission: 'moon' });
  await client.leaderboard(old.code);
  assert.equal(client.session().room.code, current.code);
  client.leaveRoom(); await client.leaderboard(old.code); assert.equal(client.session().room, null);
});

test('a storage quota failure keeps the latest session playable without reading stale disk data', async () => {
  const disk = storage(), client = createApiClient({ storage: disk });
  const room = await client.createRoom({ teacherName: 'T', mission: 'moon' });
  disk.setItem = () => { throw new Error('Quota exceeded'); };
  const team = await client.joinRoom(room.code, 'Garuda');
  await client.submitRun(payload(team, 'quota'));
  assert.equal(client.session().team.name, 'Garuda');
  assert.equal((await client.leaderboard(room.code)).runs.length, 1);
  assert.match(client.storageWarning, /Keep this page open/);
  await assert.rejects(client.leaderboard(room.code, 'constructor'), /Unknown leaderboard tab/);
});
