import { useEffect, useState, useSyncExternalStore } from 'react';
import { api } from '../api/client.js';
import { Store, S } from '../state/store.js';
import { MISSIONS } from '../core/data/missions.js';
import { LEADERBOARD_TABS, scoreRun } from '../core/scoring.js';
import { go } from '../app/router.js';
import './styles.css';

export const refreshSession = () => Store.set('classroom', api.session());
const subscribe = listener => Store.subscribe(key => { if (key === 'classroom') listener(); });
function useRoom() { return useSyncExternalStore(subscribe, () => Store.session.classroom); }
const modeText = mode => mode === 'local' ? 'Local practice · this browser only' : mode === 'cached' ? 'Offline · saved leaderboard' : 'Shared classroom · online';
const number = (value, digits = 0) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
function metric(row, tab) {
  if (tab === 'fuelSaver') return number(row.propellant_saved * 100, 1) + '%';
  if (tab === 'mostScience') return number(row.science_points) + ' pts';
  if (tab === 'cheapestSuccess') return '$' + number(row.cost_million, 1) + 'M';
  if (tab === 'fastestArrival') return number(row.flight_days, 1) + ' days';
  if (tab === 'bestFailureLesson') return row.lesson;
  return number(row.mission_score) + ' / 1,000';
}

export function Classroom() {
  const session = useRoom();
  const [teacher, setTeacher] = useState(session.room?.teacherName || '');
  const [mission, setMission] = useState(session.room?.mission || S.mission);
  const [roomCode, setCode] = useState(new URLSearchParams(location.hash.slice(1)).get('room') || session.room?.code || '');
  const [team, setTeam] = useState(session.team?.name || '');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [tab, setTab] = useState('missionScore'), [board, setBoard] = useState(null), [version, setVersion] = useState(0);
  const [online, setOnline] = useState(false), [loading, setLoading] = useState(false);
  useEffect(() => { let active = true; api.health().then(h => { if (active) setOnline(h.online); }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true, running = false;
    const refresh = async () => {
      if (!session.room || running) return; running = true; if (active) setLoading(true);
      try {
        const sync = await api.syncPending();
        const next = await api.leaderboard(session.room.code, tab);
        if (active) { setBoard(next); setOnline(next.mode === 'online'); refreshSession(); if (sync.errors.length) setError(sync.errors[0].message); }
      } catch (e) { if (active) setError(e.message); }
      finally { running = false; if (active) setLoading(false); }
    };
    setBoard(null); refresh();
    const timer = setInterval(refresh, 5000); addEventListener('online', refresh); addEventListener('storage', refresh);
    return () => { active = false; clearInterval(timer); removeEventListener('online', refresh); removeEventListener('storage', refresh); };
  }, [session.room?.code, tab, version]);
  async function perform(fn) {
    setBusy(true); setError(''); setNotice('');
    try { await fn(); refreshSession(); setVersion(v => v + 1); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const create = event => { event.preventDefault(); perform(async () => {
    const room = await api.createRoom({ teacherName: teacher, mission }); setCode(room.code);
    setNotice(room.mode === 'local' ? 'Room saved on this browser. Shared room codes need the classroom service.' : 'Room created. Students can join from their own devices.');
  }); };
  const join = event => { event.preventDefault(); perform(async () => {
    const joined = await api.joinRoom(roomCode, team);
    setNotice(`${joined.resumed ? 'Resumed' : 'Joined'} ${joined.name}. Mission: ${MISSIONS[joined.mission].name}.`);
  }); };
  const start = () => { S.mission = session.room.mission; Store.commit(); go('select'); };
  const teams = board?.teams || [];
  return <>
    <div className="cm-card classroom-panel">
      <div className="kicker">Teacher · create a classroom</div>
      <form onSubmit={create} className="classroom-form">
        <label htmlFor="teacherName">Teacher name<input id="teacherName" required maxLength={80} value={teacher} onChange={e => setTeacher(e.target.value)} autoComplete="name" /></label>
        <label htmlFor="roomMission">Mission<select id="roomMission" value={mission} onChange={e => setMission(e.target.value)}>{Object.entries(MISSIONS).map(([key, m]) => <option key={key} value={key}>{m.name}</option>)}</select></label>
        <button className="btn sm teal" id="cmNew" disabled={busy}>Create room</button>
      </form>
      <div className="cm-code" id="cmCode" aria-label="Room code">{session.room?.code || '—'}</div>
      {session.room && <p className="classroom-caption">{MISSIONS[session.room.mission].name} · {modeText(board?.mode || session.mode)}</p>}
      <div id="cmTeams">{teams.map(t => <div className="cm-team" key={t.id}><i />{t.name}<span>{session.room && MISSIONS[session.room.mission].name}</span></div>)}</div>
      <p className="kicker" id="cmCount">{teams.length} team{teams.length === 1 ? '' : 's'} joined</p>
      {session.room && <div className="classroom-actions">
        <button className="link" disabled={session.mode === 'local'} onClick={() => perform(async () => { const url = new URL(location.href); url.hash = 'room=' + session.room.code; await navigator.clipboard.writeText(url.href); setNotice('Room link copied.'); })}>Copy room link</button>
        <button className="link" onClick={() => { api.leaveRoom(); refreshSession(); setBoard(null); }}>Leave room</button>
      </div>}
    </div>
    <div className="cm-card cm-phone classroom-panel">
      <div className="kicker">Student · join your team</div>
      <form onSubmit={join} className="classroom-form">
        <label htmlFor="cmInput">Room code<input id="cmInput" required maxLength={10} placeholder="ROOM CODE" autoComplete="off" value={roomCode} onChange={e => setCode(e.target.value.toUpperCase())} /></label>
        <label htmlFor="teamName">Team name<input id="teamName" required maxLength={80} placeholder="Team Garuda" autoComplete="off" value={team} onChange={e => setTeam(e.target.value)} /></label>
        <button className="btn sm" id="cmJoin" disabled={busy}>Join mission</button>
      </form>
      {session.team && session.room && <div className="classroom-joined"><b>{session.team.name}</b><p>Room {session.room.code} · {MISSIONS[session.room.mission].name}</p><button className="btn sm teal" id="roomStart" onClick={start}>Start room mission →</button></div>}
      <p className="classroom-caption">{online ? 'Teams on other devices can join shared rooms with this code.' : 'Local practice works without a connection. Local rooms and results stay in this browser.'}</p>
      <p id="cmMsg" role="status" className="classroom-notice">{busy ? 'Working…' : notice || (session.pending ? `${session.pending} result(s) saved, waiting to upload.` : '')}</p>
      {error && <p role="alert" className="classroom-error">{error}</p>}
      {api.storageWarning && <p role="status" className="classroom-error">{api.storageWarning}</p>}
    </div>
    {session.room && <section className="classroom-board" aria-label="Classroom leaderboard">
      <div className="classroom-board-head"><div><div className="kicker">Room {session.room.code} · {MISSIONS[session.room.mission].name}</div><h3>Classroom leaderboard</h3></div><button className="pill" id="leaderboardRefresh" disabled={loading} onClick={() => { setError(''); setLoading(true); setVersion(v => v + 1); }}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
      <p className="classroom-caption" role="status">{modeText(board?.mode || session.mode)}{session.pending ? ` · ${session.pending} upload(s) pending` : ''}. Refreshes every 5 seconds.</p>
      <div className="classroom-tabs" role="tablist" aria-label="Leaderboard ranking">{Object.entries(LEADERBOARD_TABS).map(([key, spec]) => <button className={'chip ' + (tab === key ? 'on' : '')} type="button" role="tab" id={'tab-' + key} key={key} aria-selected={tab === key} aria-controls="classroomRankings" tabIndex={tab === key ? 0 : -1} onClick={() => { if (tab !== key) { setLoading(true); setTab(key); } }} onKeyDown={e => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const keys = Object.keys(LEADERBOARD_TABS), i = keys.indexOf(key), next = e.key === 'Home' ? 0 : e.key === 'End' ? keys.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length;
        if (keys[next] !== tab) { setLoading(true); setTab(keys[next]); } document.getElementById('tab-' + keys[next]).focus();
      }}>{spec.label}</button>)}</div>
      <div role="tabpanel" id="classroomRankings" aria-labelledby={'tab-' + tab} aria-busy={loading}>
        {board?.tab === tab && board.runs.length ? <table className="classroom-table"><thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">{board.label}</th></tr></thead><tbody>{board.runs.map((row, i) => <tr key={row.id}><td>{i + 1}</td><th scope="row">{row.team_name}</th><td>{metric(row, tab)}</td></tr>)}</tbody></table> : <p className="classroom-empty">{loading ? 'Loading results…' : tab === 'bestFailureLesson' ? 'No failure lessons yet. Submit a failed flight with a lesson from its report.' : 'No successful flights yet. Fly the room mission and submit its report.'}</p>}
      </div>
      {tab === 'bestFailureLesson' && <p className="classroom-caption">Lessons are shown newest first. Discuss their quality as a class; they are not automatically graded.</p>}
    </section>}
  </>;
}

export function ClassroomReport({ record }) {
  const session = useRoom(), [lesson, setLesson] = useState(record.run.result.lesson || '');
  const [sent, setSent] = useState(record.sent), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const computed = scoreRun(record.run.design, record.run.result);
  const matches = session.room?.mission === record.run.design.mission;
  useEffect(() => { record.run.result.lesson = lesson; api.saveFlight(record.run); }, [lesson, record]);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const saved = await api.submitRun({ ...record.run, roomCode: session.room.code, teamId: session.team.id, token: session.team.token });
      record.sent = saved; setSent(saved); refreshSession();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section className="classroom-report" aria-labelledby="classroomScoreTitle">
    <div className="kicker">Classroom game model</div><h3 id="classroomScoreTitle">Mission Score</h3>
    <div className="classroom-score">{computed.score === null ? '—' : number(sent?.score ?? computed.score)}<small>{computed.score === null ? 'Failure · lesson eligible' : '/ 1,000'}</small></div>
    <p>35% science · 30% propellant saved · 20% budget left · 15% time left. +25 for a soft landing, +25 for a capture within 8% of the minimum burn; capped at 1,000. Successful flights qualify for a Mission Score.</p>
    <p className="classroom-caption">Saved on this device. This is a classroom game score. The original science return and flight report are above.</p>
    {session.team && session.room && matches ? <form onSubmit={submit} className="classroom-form">
      <label htmlFor="flightLesson">{computed.score === null ? 'What did you learn? Required for the failure lesson board.' : 'What would you try next? Optional lesson.'}<textarea id="flightLesson" maxLength={1000} required={computed.score === null} rows={3} value={lesson} disabled={!!sent} onChange={e => setLesson(e.target.value)} /></label>
      <button className="btn sm teal" id="submitClassroomRun" disabled={busy || !!sent}>{busy ? 'Saving…' : sent ? 'Result saved' : `Submit to ${session.room.code}`}</button>
      {sent && <p role="status" id="runSubmissionStatus">{sent.mode === 'queued' ? 'Saved on this device. Upload will retry when the classroom reconnects.' : sent.mode === 'local' ? 'Added to this browser’s local leaderboard.' : 'Submitted to the shared classroom leaderboard.'}</p>}
    </form> : <p>{session.room && !matches ? `This room flies ${MISSIONS[session.room.mission].name}. Join a room for this flight’s mission to submit.` : 'Join a team in Play in class to submit this result.'}</p>}
    <button className="link" onClick={() => { go('landing'); requestAnimationFrame(() => document.getElementById('sec-class').scrollIntoView()); }}>Open classroom leaderboard →</button>
    {error && <p role="alert" className="classroom-error">{error}</p>}
    {api.storageWarning && <p role="status" className="classroom-error">{api.storageWarning}</p>}
  </section>;
}
