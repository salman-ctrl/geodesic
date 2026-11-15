import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { createDatabase } from './db.js';
import { createRepository } from './repository.js';
const envFile=path.resolve(import.meta.dirname,'../.env');
if(fs.existsSync(envFile))process.loadEnvFile(envFile);
const port=Number(process.env.PORT||3001);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer from 1 to 65535');
const frontendUrl=process.env.FRONTEND_URL||'http://localhost:5173';
const allowed=new URL(frontendUrl);
if(!['http:','https:'].includes(allowed.protocol)||allowed.origin!==frontendUrl)throw new Error('FRONTEND_URL must be an exact HTTP(S) origin, without a trailing slash');
const db=createDatabase(process.env.DATABASE_URL,{ssl:process.env.DB_SSL?.toLowerCase()==='true'});
const app=createApp({db,repository:createRepository(db),frontendUrl});
const server=app.listen(port,()=>console.log(`Geodesic API listening on http://localhost:${port}`));
async function shutdown(){server.close(async()=>{await db.close();process.exit(0);});}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
