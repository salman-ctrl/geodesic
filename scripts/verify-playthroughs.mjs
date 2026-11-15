// Uses native requestAnimationFrame, original dt/warp, original physics and real UI inputs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {baselineServer,chromium,openGame,launchOptions} from './browser-harness.mjs';
process.env.SOURCE_URL='http://127.0.0.1:5175';
const server=await baselineServer(5175),browser=await chromium.launch(launchOptions);
const fixtures=JSON.parse(fs.readFileSync('verification/mission-fixtures.json'));
const evidence={browser:await browser.version(),timing:'Native browser rAF and original dt limits. Default cruise warp 10; ascent autopilot and assisted descent are original UI controls. No clock overrides, frame injection, skipped phases or 100× cruise.',missions:[]};
fs.mkdirSync('verification/playthroughs',{recursive:true});
const save=()=>fs.writeFileSync('verification/playthroughs.json',JSON.stringify(evidence,null,2));
try{
 for(const mission of ['moon','mars','jupiter']){
  const runs=await Promise.all(['source','react'].map(async name=>{
   const g=await openGame(browser,name,fixtures[mission]);const p=g.page;
   const record={mission,name,startedAt:new Date().toISOString(),events:[],errors:g.errors};evidence.missions.push(record);save();
   const start=Date.now();let previous='',burning=false,lastPause='',armed=false,flybyAimed=false,launched=false;
   await p.locator('[data-start]').first().click();await p.waitForSelector('.mcol');await p.locator('#selGo').click();
   await p.waitForSelector('#bTray [data-a="go:1"]');await p.locator('#bTray [data-a="go:1"]').click();
   await p.waitForSelector('#cTray [data-a="go:1"]');await p.locator('#cTray [data-a="go:1"]').click();
   await p.waitForFunction(()=>GEO.screen()==='route'&&GEO.store.session.route!==null);
   await p.locator('#rGo').click();
   while(Date.now()-start<720000){
    const s=await p.evaluate(()=>{
     const G=GEO,k=G.screen(),c=G.Screens[k],F=G.flight;
     return {screen:k,ready:c?.ready,auto:c?.auto,paused:c?.paused,need:c?.need,miss:c?.miss,k:c?.k,state:c?.state,locked:c?.locked,leg:c?.i,warp:c?.warp,
      launch:F?.launch,landing:F?.landing,capture:F?.capture,outcome:F?.outcome,
      design:G.S,route:F?.rt&&{chain:F.rt.chain,days:F.rt.days,dep:F.rt.dvDep,fly:F.rt.dvFly,cap:F.rt.dvCap},
      result:k==='report'?JSON.parse(JSON.stringify(F)):null};
    });
    if(s.screen!==previous){
     record.events.push({screen:s.screen,elapsedSeconds:+((Date.now()-start)/1000).toFixed(2)});console.log(mission,name,s.screen,record.events.at(-1).elapsedSeconds);save();previous=s.screen;
     await p.screenshot({path:`verification/playthroughs/${mission}-${name}-${s.screen}.png`});
    }
    if(s.screen==='gonogo'&&!launched&&await p.locator('#gLaunch').isVisible()){await p.locator('#gLaunch').click();launched=true;}
    if(s.screen==='launch'&&s.ready&&!s.auto)await p.locator('#lAuto').click();
    if(s.screen==='cruise'&&s.ready){
     assert.equal(s.warp,10,'Cruise must retain the default speed');
     const pause=s.leg+':'+s.paused;
     if(s.paused&&s.paused!=='done'){
      if(lastPause!==pause){record.events.push({action:'correction-window',leg:s.leg,type:s.paused,miss:s.miss,need:s.need});lastPause=pause;}
      if(s.need>.0003){if(!burning){await p.keyboard.down('KeyB');burning=true;}}
      else {if(burning){await p.keyboard.up('KeyB');burning=false;}await p.keyboard.press('Enter');}
     }
    }
    if(s.screen==='flyby'&&s.ready&&!s.locked&&!flybyAimed){await p.locator('#fPlanAim').click();await p.locator('#fLock').click();flybyAimed=true;record.events.push({action:'aim-planned-flyby'});save();}
    if(s.screen==='arrival'&&s.ready&&s.state==='approach'&&s.k>=.495&&!armed){await p.locator('#aFire').click();armed=true;record.events.push({action:'capture-burn',position:s.k});save();}
    if(s.screen==='arrival'&&s.state==='orbit'){
     if(mission==='jupiter')await p.locator('[data-l="x"]').click();else await p.locator('[data-l="1"]').click();
    }
    if(s.screen==='report'){
     record.finishedAt=new Date().toISOString();record.elapsedSeconds=(Date.now()-start)/1000;record.result=s.result;record.passed=!!s.outcome?.ok;save();
     assert.equal(g.errors.length,0,JSON.stringify(g.errors));assert.equal(s.outcome.ok,true,JSON.stringify(s.outcome));
     if(mission!=='jupiter')assert.equal(s.landing.status,'landed');else assert.equal(s.result.gains.length,1);
     await p.close();return record;
    }
    await p.waitForTimeout(s.screen==='arrival'?45:180);
   }
   throw new Error(mission+' '+name+' flight timed out');
  }));
  const [a,b]=runs.map(r=>r.result);
  assert.deepEqual(a.rocket,b.rocket);assert.deepEqual(a.craft,b.craft);assert.deepEqual(a.outcome,b.outcome);assert.deepEqual(a.launch,b.launch);assert.deepEqual(a.landing,b.landing);assert.deepEqual(a.cost,b.cost);assert.equal(a.rt.days,b.rt.days);
  console.log(mission,'PAIR PASS');
 }
 evidence.passed=true;save();
}catch(e){evidence.error=e.stack;save();throw e;}finally{await browser.close();server.close();}

