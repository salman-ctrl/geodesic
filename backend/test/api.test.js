import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDatabase,parseDatabaseUrl } from '../src/db.js';
import { createRepository } from '../src/repository.js';
import { scoreRun } from '../src/scoring.js';
import { createHash } from 'node:crypto';

const design={mission:'moon',rocket:{segs:4,engines:3,boosters:2,upper:'S',fairing:'S'},craft:{bus:'S',power:'solar',powerN:1,antenna:'S',instruments:['spec','probe'],tank:.75}};
const result={outcome:{ok:true,title:'Landed on the Moon'},science:{got:65,max:65},propellant:{used:500,bestDirect:1000},costMillion:170,flightDays:3,landing:{status:'landed',v:2},capture:{result:'orbit',need:1,best:1},lesson:''};
const token='a'.repeat(64);
function payload(){return structuredClone({roomCode:'ABCDEFGH',teamId:'1',token,clientRunId:'run_1',design,result});}
async function withApi(options,fn){
  const server=createApp(options).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try{await fn(async(path,body,extra={})=>{const res=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...extra.headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),...extra});return {status:res.status,headers:res.headers,body:res.status===204?null:await res.json()};});}
  finally{await new Promise(r=>server.close(r));}
}
function fakeDatabase(){
  const rooms=[],teams=[],runs=[],queries=[];
  return {rooms,teams,runs,queries,health:async()=>true,async execute(sql,a){
    queries.push({sql,args:a});
    if(sql.startsWith('INSERT INTO rooms')){rooms.push({id:'1',code:a[0],teacher_name:a[1],mission:a[2],created_at:'now'});return [{insertId:1}];}
    if(sql.startsWith('SELECT * FROM rooms'))return [rooms.filter(r=>r.code===a[0])];
    if(sql.startsWith('INSERT INTO teams')){if(teams.some(t=>t.room_id===a[0]&&t.name===a[1]))throw Object.assign(new Error(),{code:'ER_DUP_ENTRY'});teams.push({id:'1',room_id:a[0],name:a[1],token_hash:a[2],created_at:'now'});return [{insertId:1}];}
    if(sql.startsWith('SELECT * FROM teams'))return [teams.filter(t=>t.id===a[0]&&t.room_id===a[1])];
    if(sql.startsWith('INSERT INTO runs')){if(!runs.some(r=>r.team_id===a[1]&&r.client_run_id===a[2]))runs.push({id:'1',team_id:a[1],client_run_id:a[2],design:JSON.parse(a[3]),result:JSON.parse(a[4]),mission_score:a[6]});return [{insertId:1}];}
    if(sql.startsWith('SELECT id, mission_score FROM runs'))return [runs.filter(r=>r.team_id===a[0]&&r.client_run_id===a[1])];
    if(sql.startsWith('SELECT id, name, created_at FROM teams'))return [teams];
    if(sql.startsWith('SELECT r.id'))return [runs];
    throw new Error('Unexpected SQL: '+sql);
  }};
}

test('server stays healthy when DATABASE_URL is absent or database cannot connect',async()=>{
  const missing=createDatabase(undefined);
  await withApi({db:missing,repository:{}},async request=>{
    assert.deepEqual(await request('/api/health').then(r=>r.body),{ok:true,db:false});
    assert.equal((await request('/api/rooms',{teacherName:'Teacher',mission:'moon'})).status,503);
    assert.equal((await request('/api/rooms',{})).status,400);
  });
  const broken=createDatabase('mysql://root:password@127.0.0.1/test',{loadDriver:async()=>({createPool:()=>({query:async()=>{throw Object.assign(new Error(),{code:'ECONNREFUSED'});},end:async()=>{}})})});
  assert.equal(await broken.health(),false);await broken.close();
});

test('CORS allows only FRONTEND_URL and handles preflight',async()=>{
  await withApi({db:{health:async()=>false},repository:{},frontendUrl:'http://localhost:5173'},async request=>{
    const allowed=await request('/api/health',undefined,{headers:{Origin:'http://localhost:5173'}});assert.equal(allowed.headers.get('access-control-allow-origin'),'http://localhost:5173');
    assert.equal((await request('/api/health',undefined,{headers:{Origin:'https://other.example'}})).status,403);
    assert.equal((await request('/api/rooms',undefined,{method:'OPTIONS',headers:{Origin:'http://localhost:5173'}})).status,204);
  });
});

test('create, join, submit, duplicate retry and all six leaderboard routes use the repository',async()=>{
  const db=fakeDatabase(),repository=createRepository(db);
  await withApi({db,repository},async request=>{
    const created=await request('/api/rooms',{teacherName:'Teacher',mission:'moon'});assert.equal(created.status,201);const code=created.body.code;assert.match(code,/^[A-Z2-9]{8}$/);
    const joined=await request(`/api/rooms/${code}/join`,{name:'Garuda'});assert.equal(joined.status,201);assert.equal(joined.body.token.length,64);assert.notEqual(db.teams[0].token_hash,joined.body.token);
    assert.equal((await request(`/api/rooms/${code}/join`,{name:'Garuda'})).status,409);
    const body=payload();body.roomCode=code;body.token=joined.body.token;
    const submitted=await request('/api/runs',body);assert.equal(submitted.status,201);assert.equal(submitted.body.score,scoreRun(design,result).score);
    assert.equal((await request('/api/runs',body)).body.id,submitted.body.id);assert.equal(db.runs.length,1);assert.deepEqual(db.runs[0].design,design);assert.deepEqual(db.runs[0].result,result);
    for(const tab of ['missionScore','fuelSaver','mostScience','cheapestSuccess','fastestArrival','bestFailureLesson'])assert.equal((await request(`/api/rooms/${code}/leaderboard?tab=${tab}`)).status,200);
    body.token='b'.repeat(64);assert.equal((await request('/api/runs',body)).status,403);
    body.token=joined.body.token;body.design.mission='mars';assert.equal((await request('/api/runs',body)).status,400);
    assert.equal((await request('/api/rooms/ZZZZZZZZ/leaderboard')).status,404);
  });
});

test('bad input, malformed JSON, oversized bodies and SQL-like tabs are rejected before database calls',async()=>{
  const db=fakeDatabase();await withApi({db,repository:createRepository(db)},async request=>{
    const bad=payload();bad.result.science.got=999;assert.equal((await request('/api/runs',bad)).status,400);
    assert.equal((await request('/api/rooms','{')).status,400);
    assert.equal((await request('/api/rooms',{teacherName:'x'.repeat(300000),mission:'moon'})).status,413);
    assert.equal((await request('/api/rooms',{teacherName:'Teacher',mission:'pluto'})).status,400);
    assert.equal((await request('/api/rooms/ABCDEFGH/leaderboard?tab=mission_score%20DESC')).status,400);
    assert.equal((await request('/api/runs',[])).status,400);assert.equal(db.queries.length,0);
  });
});

test('MySQL URL decoding, query parameters and server-owned score bounds',()=>{
  assert.deepEqual(Object.fromEntries(Object.entries(parseDatabaseUrl('mysql://a%40b:p%3Aa@localhost:3307/geo%20test')).filter(([k])=>['user','password','host','port','database'].includes(k))),{host:'localhost',port:3307,user:'a@b',password:'p:a',database:'geo test'});
  assert.throws(()=>parseDatabaseUrl('postgres://localhost/game'));
  const s=scoreRun(design,result);assert.equal(s.bonus,50);assert.equal(s.score,Math.round(350+150+100+150*(1-3/(.03*365.25))+50));
  const failure=structuredClone(result);failure.outcome.ok=false;assert.equal(scoreRun(design,failure).score,null);
  const ideal=structuredClone(result);ideal.costMillion=0;ideal.flightDays=0;ideal.propellant.used=0;assert.equal(scoreRun(design,ideal).score,1000);
  const hash=createHash('sha256').update(token).digest('hex');assert.equal(hash.length,64);
});

test('repository validates the computed score before INSERT even without a database CHECK',async()=>{
  const db=fakeDatabase();
  db.rooms.push({id:'1',code:'ABCDEFGH',teacher_name:'Teacher',mission:'moon'});
  db.teams.push({id:'1',room_id:'1',name:'Garuda',token_hash:createHash('sha256').update(token).digest('hex')});
  const run=payload();run.code=run.roomCode;run.result.science.got=NaN;
  await assert.rejects(createRepository(db).submitRun(run),e=>e.status===400&&e.message.includes('mission_score'));
  assert.ok(!db.queries.some(q=>q.sql.startsWith('INSERT INTO runs')));
});
