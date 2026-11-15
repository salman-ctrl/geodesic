import { Screens, go } from '../app/router.js';
import { handTo, roleTag } from '../ui/crew.js';
import { $, $$ } from '../ui/dom.js';
import { runChecks } from '../core/game/checks.js';
import { S } from '../state/store.js';
import { currentPlan, currentRoute } from '../state/selectors.js';
import { rocketRig, ground, heroStars, heroPlanets } from '../three/worlds/padWorld.js';
import { enterPadNight } from './shared/stage.js';
import { V3, flyTo, pad, bgTo, colorTo } from '../three/renderer.js';
import { wait, tween } from '../ui/tween.js';
import { Sound } from '../ui/sound.js';
import { setTheme } from '../ui/theme.js';

// ====================================================================================================
// MODULE  src/screens/gonogo.js
// layer   screens
// what    SCREEN 7 · Go / No-Go poll and countdown
// imports state/store, state/selectors, app/router, core/game/checks, three/worlds/padWorld, screens/shared/stage, ui/*
// ====================================================================================================


export function initialize(){
Screens.gonogo = {
  async enter(){
    await handTo('lead'); $('#gKick').textContent='Step 5 · Go / No-Go poll'+roleTag('lead'); const checks=this.checks=runChecks(S,currentPlan(),currentRoute()); this.token=(this.token||0)+1; const tk=this.token;
    $('#gCount').className=''; $('#gFoot').innerHTML='';
    $('#gLines').innerHTML=checks.map(c=>`<div class="gline" data-id="${c.id}"><div class="tl"><span class="k">${c.name}</span><span class="d"></span><span class="v call">…</span></div><div class="why"><span></span></div></div>`).join('');
    const hgt=rocketRig.info.height; await enterPadNight(new V3(58,hgt*.28,hgt*1.6+58),new V3(0,hgt*.47,0),.22); if(tk!==this.token) return;
    for(const c of checks){
      if(S.crew>1){ await handTo(c.role); if(tk!==this.token) return; await new Promise(res=>{ $('#gFoot').innerHTML=`<button class="btn teal">${c.name}: make your call</button>`; $('#gFoot button').onclick=res; }); $('#gFoot').innerHTML=''; }
      else await wait(.75);
      if(tk!==this.token) return; const el=$(`.gline[data-id="${c.id}"]`); el.classList.add('lit',c.ok?'go':'nogo'); el.querySelector('.call').textContent=c.ok?'GO':'NO-GO';
      el.querySelector('.why').innerHTML=`<span>${c.why}</span>`+(c.ok? '' : `<button class="link" data-fix="${c.id}">Fix →</button>`); c.ok? Sound.ok() : Sound.bad();
    }
    await handTo('lead'); if(tk!==this.token) return; const allGo=checks.every(c=>c.ok);
    $('#gFoot').innerHTML=allGo? `<button class="btn" id="gLaunch">All consoles GO · start countdown</button>` : `<span class="kicker" style="color:var(--flame)">${checks.filter(c=>!c.ok).length} console${checks.filter(c=>!c.ok).length>1?'s':''} NO-GO</span><button class="link" id="gLaunch">Override and launch anyway</button>`;
    $$('[data-fix]').forEach(b=>b.onclick=()=>{ const c=checks.find(x=>x.id===b.dataset.fix); go(c.fix,c.fixOpts); });
    $('#gLaunch').onclick=()=>this.countdown();
  },
  async countdown(){ const tk=this.token; $('#gPoll').style.opacity=0; const C=$('#gCount');
    flyTo(pad,new V3(30,6,rocketRig.info.height*1.9+30),new V3(0,rocketRig.info.height*.48,0),4.7,0,0); bgTo(pad,0x8ec9ea,5.2); colorTo(ground.material.color,0x9cc37c,5.2); tween(5.2,k=>heroStars.material.opacity=.85*(1-k));
    for(let i=5;i>=1;i--){ if(tk!==this.token) return; C.textContent=i; C.className=''; void C.offsetWidth; C.className='tick'; Sound.blip(i===1?880:440,.12,'square',.03); if(i===3) setTheme('paper'); await wait(1); }
    if(tk!==this.token) return; go('launch',{ fromPoll:true }); },
  update(dt){ rocketRig.update(dt,pad.camera); for(const p of heroPlanets){ const a=p.ph+performance.now()*.001*p.w; p.g.position.set(Math.cos(a)*p.R,p.y+Math.sin(a*1.3)*18,Math.sin(a)*p.R); } },
  exit(){ this.token++; $('#gPoll').style.opacity=''; heroStars.material.opacity=.85; },
};
}

