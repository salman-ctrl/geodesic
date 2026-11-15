// Controlled frames are used ONLY for still screenshots. Flight tests use native browser time.
import fs from 'node:fs';
import {baselineServer,chromium,openGame,frames,go,launchOptions} from './browser-harness.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('../verification/mission-fixtures.json',import.meta.url)));
const server=await baselineServer(),browser=await chromium.launch(launchOptions);
fs.mkdirSync('verification/screenshots',{recursive:true});
const flybyOnly=process.argv.includes('--flyby-only');
const evidence=flybyOnly?JSON.parse(fs.readFileSync('verification/visual-parity.json')):{browser:await browser.version(),viewport:[1440,1000],mode:'Fixed animation frames for screenshots only; original source file is served unchanged.',screens:[]};
if(flybyOnly)evidence.screens=evidence.screens.filter(s=>!s.name.startsWith('flyby'));
const games=[];
try{
 for(const name of ['source','react'])games.push(await openGame(browser,name,fixtures.moon,{controlled:true}));
 async function both(fn){for(const g of games)await fn(g.page);}
 async function capture(name){
  const layouts=[];
  for(const g of games){
   await g.page.mouse.move(0,0);
   await g.page.screenshot({path:`verification/screenshots/${name}-${g.name}.png`,animations:'disabled'});
   layouts.push(await g.page.evaluate(()=>{
    const props=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','borderColor','borderRadius','padding','margin','display','position','gap','textTransform'];
    const visible=[...document.querySelectorAll('#landing *, .screen.active *, #topbar *, #coach *, #pass *, #modal *, #physicsDock *')].filter(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.visibility!=='hidden'&&s.display!=='none'&&e.checkVisibility({checkVisibilityCSS:true,checkOpacity:true});});
    return visible.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,cls:e.className?.baseVal??e.className,rect:[r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100),style:props.map(p=>s[p]),text:e.children.length?'':e.textContent};});
   }));
  }
  const differences=[];for(let i=0;i<Math.max(...layouts.map(x=>x.length));i++)if(JSON.stringify(layouts[0][i])!==JSON.stringify(layouts[1][i]))differences.push({index:i,source:layouts[0][i],react:layouts[1][i]});
  const row={name,elements:layouts.map(x=>x.length),differences};evidence.screens.push(row);console.log(name,row.elements,differences.length?'DIFF '+differences.length:'MATCH');
  fs.writeFileSync('verification/visual-parity.json',JSON.stringify(evidence,null,2));
 }
 if(!flybyOnly){
 await both(p=>frames(p));await capture('landing-hero');
 for(const id of ['sec-problem','sec-theories','sec-assist','sec-missions','sec-science','sec-validation','sec-sources','sec-class','sec-how']){
  await both(async p=>{await p.locator('#'+id).evaluate(e=>e.scrollIntoView({block:'start'}));await frames(p,60);});await capture('landing-'+id);
  if(id==='sec-theories'){
   await both(async p=>{await p.locator('#einsteinTab').click();await frames(p,90);});await capture('two-minds-einstein');
   await both(async p=>{await p.locator('#theoryMath').evaluate(e=>e.open=true);});await capture('einstein-maths');
  }
 }
 await both(p=>go(p,'select'));await capture('select');
 await both(p=>go(p,'tutorial'));await capture('tutorial');
 await both(async p=>{await p.locator('#coachSkip').click();await frames(p);});await capture('builder');
 await both(async p=>{await p.locator('#bExplode').click();await frames(p);});await capture('builder-exploded');
 await both(async p=>{await p.locator('#bExplode').click();await p.locator('#bXray').click();await frames(p);});await capture('builder-xray');
 await both(p=>go(p,'craft'));await capture('craft');
 await both(p=>go(p,'craft',{phase:'sci'}));await capture('craft-science');
 await both(p=>go(p,'route'));await capture('route');
 await both(async p=>{await p.locator('#rDet').click();await frames(p,10);});await capture('route-details');
 await both(async p=>{await p.locator('#physicsToggle').click();await frames(p,10);});await capture('physics-insights');
 await both(async p=>{await p.evaluate(()=>{GEO.S.crew=4;GEO.store.session.holder=0;GEO.go('craft');});await frames(p,10);});await capture('pass-device');
 await both(async p=>{if(await p.locator('#pass.on').count())await p.locator('#passOk').click();await frames(p);await p.evaluate(()=>GEO.S.crew=1);});
 await both(p=>go(p,'gonogo'));await both(p=>frames(p,480));await capture('gonogo');
 await both(p=>go(p,'launch',{auto:true}));await capture('launch');
 // Live, unmodified screen controllers generate the flight's own records.
 await both(async p=>{for(let i=0;i<45&&await p.evaluate(()=>GEO.screen()==='launch');i++)await frames(p,180);});
 await both(p=>go(p,'cruise',{err:[.003,0,0]}));await capture('cruise');
 await both(async p=>{await p.evaluate(()=>GEO.Screens.cruise.burning=true);await frames(p,240);await p.evaluate(()=>GEO.Screens.cruise.burning=false);});
 await both(async p=>{if(await p.evaluate(()=>GEO.Screens.cruise.paused==='tcm'))await p.locator('#kGo').click();for(let i=0;i<16&&await p.evaluate(()=>GEO.Screens.cruise.paused!=='enc');i++)await frames(p,180);});await capture('cruise-approach');
 await both(async p=>{await p.locator('#kGo').click();await frames(p,130);if(await p.evaluate(()=>GEO.screen()!=='arrival'))throw new Error('Arrival not reached');});await capture('arrival');
 await both(async p=>{while(await p.evaluate(()=>GEO.Screens.arrival.k<.49))await frames(p,1);await p.locator('#aFire').click();await frames(p,120);});await capture('arrival-captured');
 await both(async p=>{await p.locator('[data-l="1"]').click();await frames(p,90);});await capture('descent');
 await both(async p=>{for(let i=0;i<80&&await p.evaluate(()=>GEO.screen()==='descent');i++)await frames(p,180);});await capture('report');
 await both(async p=>{await p.locator('#rpVal').click();});await capture('validation-sources');
 await both(async p=>{await p.locator('#modalBody').evaluate(e=>e.scrollTop=e.scrollHeight);});await capture('validation-sources-bottom');
 }
 for(const g of games)await g.page.close();games.length=0;
 for(const name of ['source','react'])games.push(await openGame(browser,name,fixtures.jupiter,{controlled:true}));
 if(!flybyOnly){await both(p=>go(p,'route'));await both(async p=>{await p.locator('#rDet').click();await frames(p);});await capture('jupiter-route');}
 await both(p=>go(p,'launch',{auto:true}));
 await both(p=>go(p,'flyby',{i:0}));
 await both(async p=>{await p.evaluate(()=>{const f=GEO.Screens.flyby;f.setRp(f.fb.rp*2.1);document.querySelector('#fSlider').value=f.toX(f.rp);});await frames(p,90);});
 await capture('flyby');
 await both(async p=>{await p.locator('#fPlanAim').click();await frames(p,90);});await capture('flyby-on-plan');
 evidence.errors=games.map(g=>({name:g.name,errors:g.errors}));
 fs.writeFileSync('verification/visual-parity.json',JSON.stringify(evidence,null,2));
}catch(e){evidence.error=e.stack;fs.writeFileSync('verification/visual-parity.json',JSON.stringify(evidence,null,2));throw e;}
finally{await browser.close();server.close();}
