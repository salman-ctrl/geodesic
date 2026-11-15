import { S, Store } from '../state/store.js';
import { rocketRig } from '../three/worlds/padWorld.js';
import { DATE_MIN, DATE_MAX } from '../core/game/rules.js';
import { optimizeRoute } from '../core/physics/route.js';
import { PRIORITY } from '../core/data/missions.js';
import { $ } from './dom.js';
import { go, Screens } from '../app/router.js';
import { Sound } from './sound.js';
import { invalidateDesignCache } from '../state/selectors.js';

// ====================================================================================================
// MODULE  src/ui/tutorial.js
// layer   ui
// what    SCREEN 3 · tutorial (about 60 seconds, by doing)
// imports state/store, state/selectors, app/router, three/worlds/padWorld, core/physics/route, ui/*
// ====================================================================================================

let Tutorial;
export function initialize(){
(Tutorial = {
  active:false, step:0, saved:null, timer:0, lingerT:0, base:null,
  steps:[
    { screen:'builder', text:'This rocket can reach orbit, but it cannot leave Earth. Add a tank segment for more ΔV.', target:'#bTray [data-a="segs:1"]', done:()=>S.rocket.segs>Tutorial.base.segs },
    { screen:'builder', text:'More propellant is more weight: thrust-to-weight just dropped. Add an engine.', target:'#bTray [data-a="engines:1"]', done:()=>S.rocket.engines>Tutorial.base.engines },
    { screen:'builder', text:'Take it apart. Click the rocket, then hover a label to see what each part does.', target:'#bExplode', done:()=>rocketRig.Et===1, linger:3.2 },
    { screen:'route', text:'Saturn is far. Click Jupiter to fly past it and borrow some of its speed.', target:'.wlabel[data-k="jupiter"]', done:()=>S.route.flybys.includes('jupiter')&&Store.session.screen==='route'&&Store.session.routeCaption.startsWith('Propellant saved'), linger:3.2 },
    { screen:'launch', opts:{ auto:true }, text:'Launch. The autopilot flies this one. In a real flight the gravity turn and staging calls are yours.', done:()=>Store.session.screen==='launch'&&Store.session.launchSim&&Store.session.launchSim.t>34 },
  ],
  start(){ this.saved=JSON.stringify(S); this.active=true; Store.pausePersist(true); Store.session.tutorialActive=true; this.step=0; this.lingerT=0; S.mission='saturn'; S.crew=1; Object.assign(S.rocket,{ segs:3, engines:4, boosters:0, upper:'L', fairing:'S' }); Object.assign(S.craft,{ bus:'S', power:'rtg', powerN:2, antenna:'M', instruments:['cam','spec'], tank:.5 });
    S.route.flybys=[]; S.route.priority='balanced'; let best=null; for(let d=DATE_MIN; d<DATE_MAX; d+=25){ const r=optimizeRoute(['earth','jupiter','saturn'],d,PRIORITY.balanced,8,false,11); if(r&&(!best||r.cost<best.cost)) best=r; } S.route.day=best? best.t0 : S.route.day;
    this.base={ ...S.rocket }; $('#coach').classList.add('on'); $('#coachGo').style.display='none'; $('#coachSkip').style.display=''; $('#coachSkip').onclick=()=>this.finish(); $('#coachGo').onclick=()=>this.finish();
    clearInterval(this.timer); this.timer=setInterval(()=>this.tick(),120); this.show(); go('builder'); },
  show(){ const st=this.steps[this.step]; $('#coachStep').textContent=`Tutorial · step ${this.step+1} of ${this.steps.length}`; $('#coachText').textContent=st.text; $('#coachBar').style.width=(this.step/this.steps.length*100)+'%'; },
  tick(){ if(!this.active) return; const st=this.steps[this.step], ring=$('#coachRing');
    if(!st){ ring.style.display='none'; return; }
    const el=st.target&&Store.session.screen===st.screen? $(st.target) : null; if(el&&!this.lingerT){ const r=el.getBoundingClientRect(); ring.style.display='block'; ring.style.left=r.left-7+'px'; ring.style.top=r.top-7+'px'; ring.style.width=r.width+14+'px'; ring.style.height=r.height+14+'px'; } else ring.style.display='none';
    if(st.done()){ if(st.linger&&!this.lingerT){ this.lingerT=performance.now()+st.linger*1000; Sound.ok(); $('#coachText').textContent='Good.'; }
      if(!st.linger||performance.now()>=this.lingerT){ this.lingerT=0; this.step++; const nx=this.steps[this.step];
        if(!nx){ $('#coachStep').textContent='Tutorial complete'; $('#coachText').textContent='That is the whole loop: build, plan a route, fly. Now design your own mission.'; $('#coachBar').style.width='100%'; $('#coachGo').style.display=''; $('#coachSkip').style.display='none'; Sound.ok(); return; }
        this.show(); if(Store.session.screen!==nx.screen) go(nx.screen,nx.opts); } } },
  finish(){ clearInterval(this.timer); const keep=JSON.parse(this.saved||'null'); this.active=false; Store.pausePersist(false); Store.session.tutorialActive=false; if(keep) Store.replace(keep); S.tutorialDone=true; invalidateDesignCache(); Store.commit();
    $('#coach').classList.remove('on'); $('#coachRing').style.display='none'; go('builder'); },
});
Screens.tutorial = { enter(){ Tutorial.start(); } };
}
export { Tutorial };
