import fs from 'node:fs';
import http from 'node:http';
import {createRequire} from 'node:module';
export const require=createRequire(new URL('../frontend/package.json',import.meta.url));
export const {chromium}=require('playwright');
export const root=new URL('../',import.meta.url);
export async function baselineServer(port=5174){
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(new URL('index.html',root)));});
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));return server;
}
export async function openGame(browser,name,design,{controlled=false}={}){
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
 await page.addInitScript(({design,controlled})=>{
  if(design)localStorage.setItem('geodesic.v1',JSON.stringify(design));
  let seed=712361;Math.random=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  if(controlled){
   let time=1000,id=0;const callbacks=new Map(),intervals=new Map();
   performance.now=()=>time;
   window.requestAnimationFrame=fn=>{callbacks.set(++id,fn);return id;};window.cancelAnimationFrame=i=>callbacks.delete(i);
   window.setInterval=(fn,ms)=>{intervals.set(++id,{fn,ms,next:time+ms});return id;};window.clearInterval=i=>intervals.delete(i);
   window.advanceFrames=async n=>{for(let i=0;i<n;i++){time+=1000/60;for(const v of intervals.values())if(time>=v.next){v.next+=v.ms;v.fn();}const batch=[...callbacks.values()];callbacks.clear();for(const fn of batch)fn(time);await Promise.resolve();}};
  }
 },{design,controlled});
 await page.goto(name==='source'?(process.env.SOURCE_URL||'http://127.0.0.1:5174'):(process.env.REACT_URL||'http://127.0.0.1:5173'));
 await page.waitForFunction(()=>!!window.GEO && document.fonts.status==='loaded',null,{polling:100});
 return {name,page,errors};
}
export async function frames(page,n=180){await page.evaluate(n=>window.advanceFrames(n),n);await page.waitForTimeout(350);await page.evaluate(()=>window.advanceFrames(2));}
export async function go(page,name,opts){await page.evaluate(({name,opts})=>{window.pendingTransition=GEO.go(name,opts);},{name,opts});await frames(page);}
export const launchOptions={channel:'chrome',headless:true,args:['--no-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']};
