import { MISSIONS } from '../core/data/missions.js';
import { scoreRun, LEADERBOARD_TABS } from '../core/scoring.js';

const KEY = 'geodesic.classroom.v1';
const copy = value => structuredClone(value);
const fresh = () => ({ rooms: {}, teams: {}, memberships: {}, history: [], pending: [], activeRoom: null });
export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}
const identifier = () => globalThis.crypto.randomUUID();
const timestamp = () => new Date().toISOString();
const token = () => [...globalThis.crypto.getRandomValues(new Uint8Array(32))].map(v => v.toString(16).padStart(2, '0')).join('');
function name(value, label) {
  const text = String(value || '').trim();
  if (!text || text.length > 80 || /[\u0000-\u001f]/u.test(text)) throw new ApiError(`${label} must contain 1–80 characters.`, 400);
  return text;
}
function code(value) {
  const text = String(value || '').trim().toUpperCase();
  if (!/^[A-Z2-9]{6,10}$/.test(text)) throw new ApiError('Enter a room code with 6–10 letters or digits 2–9.', 400);
  return text;
}

export function createApiClient({ baseUrl = '', fetcher = globalThis.fetch, storage = globalThis.localStorage, timeout = 5000 } = {}) {
  const base = baseUrl.trim().replace(/\/+$/, '');
  let storageWarning = '';
  let memory = fresh();
  let memoryOnly = false;
  function read() {
    if (memoryOnly) return copy(memory);
    try {
      const saved = JSON.parse(storage?.getItem(KEY) || 'null');
      if (saved?.rooms && saved?.teams && Array.isArray(saved.history) && Array.isArray(saved.pending)) {
        saved.memberships ||= {};
        for (const team of Object.values(saved.teams)) saved.memberships[team.roomCode + ':' + team.id] ||= team;
        memory = copy(saved); return saved;
      }
    } catch { memoryOnly = true; storageWarning = 'Browser storage is unavailable. Keep this page open.'; }
    return copy(memory);
  }
  function write(next) {
    memory = copy(next);
    try { if (!storage) throw new Error(); storage.setItem(KEY, JSON.stringify(next)); }
    catch { memoryOnly = true; storageWarning = 'Browser storage is unavailable. Keep this page open.'; }
  }
  async function request(path, body) {
    if (!base) throw new ApiError('Local practice mode');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeout);
    try {
      const response = await fetcher(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new ApiError(data.message || 'The classroom request failed.', response.status);
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('The classroom service is unavailable.');
    } finally { clearTimeout(timer); }
  }
  const unavailable = error => error instanceof ApiError && (!error.status || error.status >= 500);
  function cachedRoom(state, roomCode) {
    const cached = state.rooms[roomCode];
    if (!cached) throw new ApiError('This room is not saved on this device. Reconnect to join a shared room, or create a local practice room.', 404);
    return cached;
  }
  function cacheRoom(state, room, mode) {
    const current = state.rooms[room.code];
    state.rooms[room.code] = { room: copy(room), mode, teams: current?.teams || [], runs: current?.runs || [], boards: current?.boards || {} };
    return state.rooms[room.code];
  }
  function localRow(payload, state, id = 'local_' + identifier()) {
    const computed = scoreRun(payload.design, payload.result);
    return {
      id, clientRunId: payload.clientRunId, team_id: payload.teamId,
      team_name: state.rooms[payload.roomCode]?.teams.find(t => t.id === payload.teamId)?.name || state.teams[payload.roomCode]?.name || 'Team',
      successful: payload.result.outcome.ok, mission_score: computed.score,
      science_points: payload.result.science.got, propellant_saved: computed.parts.propellant,
      cost_million: payload.result.costMillion, flight_days: payload.result.flightDays,
      lesson: payload.result.lesson || '', created_at: timestamp(),
    };
  }
  function rememberRow(state, payload, id) {
    const cached = cachedRoom(state, payload.roomCode);
    const existing = cached.runs.find(r => r.clientRunId === payload.clientRunId && r.team_id === payload.teamId);
    if (!existing) cached.runs.push(localRow(payload, state, id));
    else if (id) existing.id = id;
  }
  async function submitRun(payload) {
    const roomCode = code(payload.roomCode), state = read(), room = cachedRoom(state, roomCode);
    const team = state.memberships[roomCode + ':' + payload.teamId] || state.teams[roomCode];
    if (!team || team.id !== payload.teamId || team.token !== payload.token) throw new ApiError('Join this room on this device before submitting.', 403);
    if (payload.design.mission !== room.room.mission) throw new ApiError('The flight must use the room mission.', 400);
    if (room.mode === 'local') {
      rememberRow(state, payload); write(state);
      const row = state.rooms[roomCode].runs.find(r => r.clientRunId === payload.clientRunId && r.team_id === payload.teamId);
      return { id: row.id, score: row.mission_score, mode: 'local' };
    }
    try {
      const saved = await request('/api/runs', payload);
      const next = read(); rememberRow(next, payload, saved.id);
      next.pending = next.pending.filter(r => !(r.clientRunId === payload.clientRunId && r.teamId === payload.teamId)); write(next);
      return { ...saved, mode: 'online' };
    } catch (error) {
      if (!unavailable(error)) throw error;
      const next = read(); rememberRow(next, payload);
      if (!next.pending.some(r => r.clientRunId === payload.clientRunId && r.teamId === payload.teamId)) next.pending.push(copy(payload));
      write(next); return { id: payload.clientRunId, score: scoreRun(payload.design, payload.result).score, mode: 'queued' };
    }
  }
  return {
    get storageWarning() { return storageWarning; },
    get configured() { return !!base; },
    session() {
      const state = read(), cached = state.rooms[state.activeRoom];
      return { room: cached?.room || null, team: state.teams[state.activeRoom] || null, mode: cached?.mode || (base ? 'api' : 'local'), pending: state.pending.length, history: copy(state.history) };
    },
    async health() {
      try { const result = await request('/api/health'); return { ...result, online: !!(result.ok && result.db) }; }
      catch (error) { return { ok: false, db: false, online: false, message: error.message }; }
    },
    async createRoom(input) {
      const body = { teacherName: name(input.teacherName, 'Teacher name'), mission: input.mission };
      if (!Object.hasOwn(MISSIONS, body.mission)) throw new ApiError('Choose a supported mission.', 400);
      let room, mode;
      try { room = await request('/api/rooms', body); mode = 'api'; }
      catch (error) {
        if (!unavailable(error)) throw error;
        const state = read(); let roomCode;
        do { roomCode = [...crypto.getRandomValues(new Uint8Array(8))].map(v => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v % 32]).join(''); } while (state.rooms[roomCode]);
        room = { code: roomCode, ...body, createdAt: timestamp() }; mode = 'local';
      }
      const next = read(); cacheRoom(next, room, mode); next.activeRoom = room.code; write(next);
      return { ...room, mode };
    },
    async joinRoom(roomCode, teamName) {
      roomCode = code(roomCode); teamName = name(teamName, 'Team name');
      let state = read(), cached = state.rooms[roomCode], team = Object.values(state.memberships).find(t => t.roomCode === roomCode && t.name.toLocaleLowerCase() === teamName.toLocaleLowerCase());
      if (team) {
        state.activeRoom = roomCode; state.teams[roomCode] = team; write(state); return { ...team, mode: cached.mode, resumed: true };
      }
      if (cached?.mode !== 'local') {
        try {
          team = await request(`/api/rooms/${roomCode}/join`, { name: teamName });
          state = read(); cached = cacheRoom(state, { ...(state.rooms[roomCode]?.room || {}), code: roomCode, mission: team.mission }, 'api');
          cached.teams.push({ id: team.id, name: team.name, createdAt: timestamp() }); state.teams[roomCode] = team; state.memberships[roomCode + ':' + team.id] = team; state.activeRoom = roomCode; write(state);
          return { ...team, mode: 'api' };
        } catch (error) { if (!unavailable(error)) throw error; }
      }
      state = read(); cached = cachedRoom(state, roomCode);
      if (cached.mode !== 'local') throw new ApiError('Reconnect to join a shared room. Your saved team can still resume on this device.', 503);
      if (cached.teams.some(t => t.name.toLocaleLowerCase() === teamName.toLocaleLowerCase())) throw new ApiError('That team name is already in this room.', 409);
      team = { id: String(cached.teams.length + 1), name: teamName, token: token(), roomCode, mission: cached.room.mission };
      cached.teams.push({ id: team.id, name: team.name, createdAt: timestamp() }); state.teams[roomCode] = team; state.memberships[roomCode + ':' + team.id] = team; state.activeRoom = roomCode; write(state);
      return { ...team, mode: 'local' };
    },
    async leaderboard(roomCode, tab = 'missionScore') {
      roomCode = code(roomCode);
      if (!Object.hasOwn(LEADERBOARD_TABS, tab)) throw new ApiError('Unknown leaderboard tab.', 400);
      const spec = LEADERBOARD_TABS[tab];
      let state = read(), cached = state.rooms[roomCode];
      if (cached?.mode !== 'local') {
        try {
          const board = await request(`/api/rooms/${roomCode}/leaderboard?tab=${tab}`);
          state = read(); cached = cacheRoom(state, board.room, 'api');cached.teams = copy(board.teams); cached.boards[tab] = copy(board); write(state);
          return { ...board, mode: 'online' };
        } catch (error) { if (!unavailable(error)) throw error; }
      }
      state = read(); cached = cachedRoom(state, roomCode);
      const own = cached.runs.filter(r => spec.failure ? !r.successful && r.lesson.trim() : r.successful);
      const merged = new Map([...(cached.boards[tab]?.runs || []), ...own].map(r => [r.id, r]));
      const runs = [...merged.values()].sort((a, b) => {
        const delta = typeof a[spec.field] === 'string' ? a[spec.field].localeCompare(b[spec.field]) : a[spec.field] - b[spec.field];
        return (spec.descending ? -delta : delta) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
      }).slice(0, 100);
      return { room: copy(cached.room), teams: copy(cached.teams), tab, label: spec.label, runs: copy(runs), mode: cached.mode === 'local' ? 'local' : 'cached' };
    },
    submitRun,
    async syncPending() {
      const pending = read().pending;
      let synced = 0; const errors = [];
      for (const payload of pending) {
        try { const result = await submitRun(payload); if (result.mode === 'online') synced++; else break; }
        catch (error) { errors.push({ clientRunId: payload.clientRunId, message: error.message }); }
      }
      return { synced, pending: read().pending.length, errors };
    },
    saveFlight(run) {
      const state = read(), existing = state.history.find(r => r.clientRunId === run.clientRunId);
      if (existing) Object.assign(existing, copy(run));else state.history.push({ ...copy(run), savedAt: timestamp() });
      state.history = state.history.slice(-100); write(state); return run;
    },
    newRunId: identifier,
    leaveRoom() { const state = read(); state.activeRoom = null; write(state); },
  };
}

export const api = createApiClient({ baseUrl: import.meta.env?.VITE_API_URL || '' });
