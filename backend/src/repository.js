import { randomBytes,createHash,timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors.js';
import { scoreRun,LEADERBOARD_TABS } from './scoring.js';
import { validateMissionScore } from './validation.js';
const hash=token=>createHash('sha256').update(token).digest('hex');
const publicRoom=r=>({code:r.code,mission:r.mission,teacherName:r.teacher_name,createdAt:r.created_at});
const publicTeam=t=>({id:String(t.id),name:t.name,createdAt:t.created_at});
export function createRepository(db){
  async function room(code){const [rows]=await db.execute('SELECT * FROM rooms WHERE code = ?',[code]);if(!rows[0])throw new HttpError(404,'room_not_found','Room not found');return rows[0];}
  return {
    async createRoom({teacherName,mission}){
      for(let attempt=0;attempt<5;attempt++){
        const code=[...randomBytes(8)].map(n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
        try{await db.execute('INSERT INTO rooms (code, teacher_name, mission) VALUES (?, ?, ?)',[code,teacherName,mission]);return {...publicRoom(await room(code)),teams:[]};}
        catch(e){if(e.code!=='ER_DUP_ENTRY')throw e;}
      }
      throw new HttpError(503,'code_unavailable','Could not allocate a room code. Try again.');
    },
    async joinRoom(code,name){
      const r=await room(code),token=randomBytes(32).toString('hex');
      try{const [row]=await db.execute('INSERT INTO teams (room_id, name, token_hash) VALUES (?, ?, ?)',[r.id,name,hash(token)]);return {id:String(row.insertId),name,roomCode:code,mission:r.mission,token};}
      catch(e){if(e.code==='ER_DUP_ENTRY')throw new HttpError(409,'team_exists','That team name is already in this room');throw e;}
    },
    async submitRun(run){
      const r=await room(run.code);
      const [teams]=await db.execute('SELECT * FROM teams WHERE id = ? AND room_id = ?',[run.teamId,r.id]);
      const team=teams[0],candidate=hash(run.token);
      if(!team||!timingSafeEqual(Buffer.from(team.token_hash),Buffer.from(candidate)))throw new HttpError(403,'invalid_team','Team credentials do not match this room');
      if(run.design.mission!==r.mission)throw new HttpError(400,'mission_mismatch','The run must use the room mission');
      const {score,parts}=scoreRun(run.design,run.result);
      validateMissionScore(score,run.result.outcome.ok);
      const args=[r.id,run.teamId,run.clientRunId,JSON.stringify(run.design),JSON.stringify(run.result),run.result.outcome.ok,score,run.result.science.got,parts.propellant,run.result.costMillion,run.result.flightDays,run.result.lesson||''];
      // A repeated request returns the first stored run and never overwrites it.
      await db.execute('INSERT INTO runs (room_id, team_id, client_run_id, design, result, successful, mission_score, science_points, propellant_saved, cost_million, flight_days, lesson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',args);
      const [rows]=await db.execute('SELECT id, mission_score FROM runs WHERE team_id = ? AND client_run_id = ?',[run.teamId,run.clientRunId]);
      return {id:String(rows[0].id),score:rows[0].mission_score};
    },
    async getLeaderboard(code,tab){
      const r=await room(code),spec=LEADERBOARD_TABS[tab];
      const [teams]=await db.execute('SELECT id, name, created_at FROM teams WHERE room_id = ? ORDER BY created_at, id',[r.id]);
      // ORDER BY is selected exclusively from the constant whitelist, never user SQL.
      const [runs]=await db.execute(`SELECT r.id, r.team_id, t.name AS team_name, r.mission_score, r.science_points, r.propellant_saved, r.cost_million, r.flight_days, r.lesson, r.created_at FROM runs r JOIN teams t ON t.id = r.team_id WHERE r.room_id = ? AND r.successful = ?${spec.success?'':" AND r.lesson <> ''"} ORDER BY ${spec.order}, r.id ASC LIMIT 100`,[r.id,spec.success?1:0]);
      return {room:publicRoom(r),teams:teams.map(publicTeam),tab,label:spec.label,runs:runs.map(x=>({...x,id:String(x.id),team_id:String(x.team_id)}))};
    },
  };
}
