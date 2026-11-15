import express from 'express';
import { HttpError } from './errors.js';
import { object,text,mission,roomCode,validateRun } from './validation.js';
import { LEADERBOARD_TABS } from './scoring.js';
export function createApp({db,repository,frontendUrl='http://localhost:5173'}){
  const app=express();app.disable('x-powered-by');
  app.use((req,res,next)=>{
    res.vary('Origin');
    if(req.headers.origin){
      if(req.headers.origin!==frontendUrl)return res.status(403).json({error:'origin_not_allowed',message:'Origin is not allowed'});
      res.set('Access-Control-Allow-Origin',frontendUrl);
      res.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers','Content-Type');
    }
    if(req.method==='OPTIONS')return res.sendStatus(204);next();
  });
  app.use(express.json({limit:'256kb',strict:true}));
  app.get('/api/health',async(req,res)=>res.json({ok:true,db:await db.health()}));
  const requireDb=async(req,res,next)=>{if(!await db.health())return next(new HttpError(503,'database_unavailable','Database is unavailable'));next();};
  app.post('/api/rooms',(req,res,next)=>{try{object(req.body);req.input={teacherName:text(req.body.teacherName,'teacher name'),mission:mission(req.body.mission)};next();}catch(e){next(e);}},requireDb,async(req,res)=>res.status(201).json(await repository.createRoom(req.input)));
  app.post('/api/rooms/:code/join',(req,res,next)=>{try{object(req.body);req.input={code:roomCode(req.params.code),name:text(req.body.name,'team name')};next();}catch(e){next(e);}},requireDb,async(req,res)=>res.status(201).json(await repository.joinRoom(req.input.code,req.input.name)));
  app.post('/api/runs',(req,res,next)=>{try{req.input=validateRun(req.body);next();}catch(e){next(e);}},requireDb,async(req,res)=>res.status(201).json(await repository.submitRun(req.input)));
  app.get('/api/rooms/:code/leaderboard',(req,res,next)=>{try{const code=roomCode(req.params.code),tab=req.query.tab||'missionScore';if(!Object.hasOwn(LEADERBOARD_TABS,tab))throw new HttpError(400,'invalid_tab','Unknown leaderboard tab');req.input={code,tab};next();}catch(e){next(e);}},requireDb,async(req,res)=>res.json(await repository.getLeaderboard(req.input.code,req.input.tab)));
  app.use((req,res)=>res.status(404).json({error:'not_found',message:'Route not found'}));
  app.use((err,req,res,next)=>{
    if(res.headersSent)return next(err);
    if(err.type==='entity.parse.failed')return res.status(400).json({error:'invalid_json',message:'Body must be valid JSON'});
    if(err.type==='entity.too.large')return res.status(413).json({error:'body_too_large',message:'Body exceeds 256 KB'});
    if(err instanceof HttpError)return res.status(err.status).json({error:err.code,message:err.message});
    const databaseError=['ECONNREFUSED','ETIMEDOUT','ENOTFOUND','ER_ACCESS_DENIED_ERROR','ER_BAD_DB_ERROR','ER_NO_SUCH_TABLE','POOL_CLOSED','PROTOCOL_CONNECTION_LOST'].includes(err.code);
    console.error(databaseError?'Database request failed':'API request failed',err.code||err.name);
    res.status(databaseError?503:500).json({error:databaseError?'database_unavailable':'internal_error',message:databaseError?'Database is unavailable':'Unexpected server error'});
  });
  return app;
}
