// Browser integration fixture: real existing Express routes/repository/scoring with injected SQL.
// No MySQL database or backend files are created or changed.
import { createApp } from '../backend/src/app.js';
import { createRepository } from '../backend/src/repository.js';
export function classroomFixture(frontendUrl) {
  const rooms = [], teams = [], runs = [];
  const duplicate = () => Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' });
  const db = { available: true, health: async () => db.available, async execute(sql, args) {
    const now = new Date().toISOString();
    if (sql.startsWith('INSERT INTO rooms')) {
      if (rooms.some(r => r.code === args[0])) throw duplicate();
      rooms.push({ id: String(rooms.length + 1), code: args[0], teacher_name: args[1], mission: args[2], created_at: now }); return [{ insertId: rooms.length }];
    }
    if (sql.startsWith('SELECT * FROM rooms')) return [rooms.filter(r => r.code === args[0])];
    if (sql.startsWith('INSERT INTO teams')) {
      if (teams.some(t => t.room_id === args[0] && t.name.toLowerCase() === args[1].toLowerCase())) throw duplicate();
      teams.push({ id: String(teams.length + 1), room_id: args[0], name: args[1], token_hash: args[2], created_at: now }); return [{ insertId: teams.length }];
    }
    if (sql.startsWith('SELECT * FROM teams')) return [teams.filter(t => t.id === args[0] && t.room_id === args[1])];
    if (sql.startsWith('INSERT INTO runs')) {
      if (!runs.some(r => r.team_id === args[1] && r.client_run_id === args[2])) runs.push({
        id: String(runs.length + 1), room_id: args[0], team_id: args[1], client_run_id: args[2], design: JSON.parse(args[3]), result: JSON.parse(args[4]),
        successful: args[5], mission_score: args[6], science_points: args[7], propellant_saved: args[8], cost_million: args[9], flight_days: args[10], lesson: args[11], created_at: now,
      });return [{ insertId: runs.length }];
    }
    if (sql.startsWith('SELECT id, mission_score FROM runs')) return [runs.filter(r => r.team_id === args[0] && r.client_run_id === args[1])];
    if (sql.startsWith('SELECT id, name, created_at FROM teams')) return [teams.filter(t => t.room_id === args[0])];
    if (sql.startsWith('SELECT r.id')) {
      const [field, order] = sql.match(/ORDER BY r\.([a-z_]+) (ASC|DESC)/).slice(1);
      const selected = runs.filter(r => r.room_id === args[0] && !!r.successful === !!args[1] && (args[1] || r.lesson)).sort((a, b) => {
        const delta = typeof a[field] === 'string' ? a[field].localeCompare(b[field]) : a[field] - b[field]; return (order === 'DESC' ? -delta : delta) || Number(a.id) - Number(b.id);
      });
      return [selected.map(r => ({ ...r, team_name: teams.find(t => t.id === r.team_id).name }))];
    }
    throw new Error('Unimplemented SQL in browser fixture: ' + sql);
  } };
  return { db, rooms, teams, runs, app: createApp({ db, repository: createRepository(db), frontendUrl }) };
}
