import { HttpError } from './errors.js';
import { MISSIONS } from '../../frontend/src/core/data/missions.js';
import { CRAFT } from '../../frontend/src/core/data/parts.js';
function invalid(message){throw new HttpError(400,'invalid_input',message);}
export function object(value,label='body'){
  if(!value||typeof value!=='object'||Array.isArray(value))invalid(label+' must be an object');return value;
}
export function text(value,label,max=80){
  if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u001f]/u.test(value))invalid(label+' must contain 1–'+max+' characters');return value.trim();
}
export function number(value,label,min=0,max=1e12){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)invalid(label+' is outside its allowed range');return value;
}
function integer(value,label,min,max){number(value,label,min,max);if(!Number.isInteger(value))invalid(label+' must be an integer');return value;}
function choice(value,choices,label){if(!choices.includes(value))invalid(label+' is not supported');return value;}
export function mission(value){return choice(value,Object.keys(MISSIONS),'mission');}
export function roomCode(value){const code=text(value,'room code',10).toUpperCase();if(!/^[A-Z2-9]{6,10}$/.test(code))invalid('Invalid room code');return code;}
export function teamId(value){const id=String(value);if(!/^[1-9]\d{0,17}$/.test(id))invalid('Invalid team id');return id;}
export function credential(value){if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))invalid('Invalid team token');return value;}
// Enforce in application code: TiDB does not enforce the schema's CHECK constraint.
export function validateMissionScore(value,successful){
  if(typeof successful!=='boolean')invalid('successful must be a boolean');
  if(successful)integer(value,'mission_score',0,1000);
  else if(value!==null)invalid('mission_score must be null when the run is not successful');
  return value;
}
export function validateDesign(value){
  const d=object(value,'design');mission(d.mission);const r=object(d.rocket,'rocket'),c=object(d.craft,'craft');
  integer(r.segs,'tank segments',2,7);integer(r.engines,'engines',1,9);choice(r.boosters,[0,2,4],'boosters');choice(r.upper,['S','M','L'],'upper stage');choice(r.fairing,['S','M','L'],'fairing');
  choice(c.bus,['S','M','L'],'bus');choice(c.power,['solar','rtg'],'power');integer(c.powerN,'power units',1,3);choice(c.antenna,['S','M','L'],'antenna');choice(c.tank,[.25,.5,.75,1],'tank fraction');
  if(!Array.isArray(c.instruments)||c.instruments.length>CRAFT.bus[c.bus].slots||new Set(c.instruments).size!==c.instruments.length)invalid('Invalid instrument list');
  c.instruments.forEach(k=>choice(k,Object.keys(CRAFT.inst),'instrument'));
  return d;
}
export function validateResult(value){
  const r=object(value,'result'),outcome=object(r.outcome,'outcome');
  if(typeof outcome.ok!=='boolean')invalid('outcome.ok must be a boolean');text(outcome.title,'outcome title',200);
  const science=object(r.science,'science');number(science.got,'science return',0,130);number(science.max,'science maximum',0,130);if(science.got>science.max)invalid('Science return exceeds maximum');
  const propellant=object(r.propellant,'propellant');number(propellant.used,'reference propellant',0);number(propellant.bestDirect,'best direct reference propellant',0);
  number(r.costMillion,'cost',0,100000);number(r.flightDays,'flight time',0,100000);
  if(r.lesson!==undefined&&r.lesson!=='')text(r.lesson,'lesson',1000);
  if(r.landing!=null){object(r.landing,'landing');choice(r.landing.status,['landed','hard','crash'],'landing status');number(r.landing.v,'touchdown speed',0,100000);}
  if(r.capture!=null){object(r.capture,'capture');choice(r.capture.result,['orbit','loose','past'],'capture result');number(r.capture.need,'capture delta-v',0,10000);number(r.capture.best,'best capture delta-v',0,10000);}
  return r;
}
export function validateRun(body){
  object(body);const code=roomCode(body.roomCode),id=teamId(body.teamId),token=credential(body.token);
  const clientRunId=text(body.clientRunId,'client run id',64);if(!/^[a-zA-Z0-9_-]+$/.test(clientRunId))invalid('Invalid client run id');
  return {code,teamId:id,token,clientRunId,design:validateDesign(body.design),result:validateResult(body.result)};
}
