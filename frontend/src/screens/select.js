import { Screens, go } from '../app/router.js';
import { useWorld, space, stopFly, Stage } from '../three/renderer.js';
import { setTheme, fadeThrough } from '../ui/theme.js';
import { solarGroup, selGroup, spaceStars, selPlanets, screenToWorld } from '../three/worlds/spaceWorld.js';
import { $, $$ } from '../ui/dom.js';
import { MISSION_ORDER, MISSIONS } from '../core/data/missions.js';
import { S, Store } from '../state/store.js';
import { Sound } from '../ui/sound.js';
import { ROLES } from '../core/game/rules.js';
import { roleOwner, currentRoute, bestDirect } from '../state/selectors.js';
import { CRAFT } from '../core/data/parts.js';

// ====================================================================================================
// MODULE  src/screens/select.js
// layer   screens
// what    SCREEN 2 · mission select + crew
// imports state/store, state/selectors, app/router, three/worlds/spaceWorld, ui/*
// ====================================================================================================


export function initialize(){
Screens.select = {
  async enter(){
    const setup=()=>{ useWorld(space); setTheme('night'); space.scene.background.set(0x141b3a); solarGroup.visible=false; selGroup.visible=true; spaceStars.visible=true;
      stopFly(space); space.controls.enabled=false; space.camera.position.set(0,0,22); space.camera.up.set(0,1,0); space.camera.lookAt(0,0,0); space.shift.x=space.shift.y=0; };
    if(Stage.world!==space) await fadeThrough(setup); else setup();
    $('#mCols').innerHTML=MISSION_ORDER.map(k=>{ const m=MISSIONS[k]; return `<div class="mcol" data-m="${k}"><h3>${m.name}</h3><div class="kicker">${m.level}</div><div class="goal">${m.goal}</div>
      <div class="tl"><span class="k">Budget</span><span class="d"></span><span class="v">$${m.budget}M</span></div><div class="tl"><span class="k">Flight</span><span class="d"></span><span class="v">${m.duration}</span></div></div>`; }).join('');
    $$('.mcol').forEach(c=>c.onclick=()=>{ S.mission=c.dataset.m; Sound.blip(700,.06); this.sync(); });
    $('#crewChips').innerHTML=[1,2,3,4].map(n=>`<button class="chip" data-c="${n}">${n}</button>`).join('');
    $$('#crewChips .chip').forEach(c=>c.onclick=()=>{ S.crew=+c.dataset.c; this.sync(); });
    $('#selGo').onclick=()=>this.next(); $('#selTut').onclick=()=>{ Store.commit(); go('tutorial'); }; this.sync();
  },
  sync(){ $$('.mcol').forEach(c=>c.classList.toggle('on',c.dataset.m===S.mission)); $$('#crewChips .chip').forEach(c=>c.classList.toggle('on',+c.dataset.c===S.crew));
    $('#crewRoles').textContent=S.crew===1? 'Solo: you hold every console' : Object.keys(ROLES).map(r=>`P${roleOwner(r)+1} ${ROLES[r]}`).join(' · '); },
  next(){
    if(this.prevMission!==S.mission||S.route.auto||!currentRoute()){ if(this.prevMission!==S.mission) S.route.flybys=[]; if(S.mission!=='moon'&&!S.route.flybys.length){ S.route.day=bestDirect(S.mission).t0; S.route.auto=true; } }
    this.prevMission=S.mission; const need=MISSIONS[S.mission].need; S.craft.instruments=S.craft.instruments.filter(k=>CRAFT.inst[k]); Store.session.holder=0; Store.commit();
    go(S.tutorialDone? 'builder' : 'tutorial');
  },
  update(dt){ const cols=$$('.mcol'); if(!cols.length) return;
    cols.forEach((c,i)=>{ const r=c.getBoundingClientRect(), g=selPlanets[i], on=c.dataset.m===S.mission; g.position.copy(screenToWorld(space,r.left+r.width/2,r.top+108,22));
      const s=g.scale.x+((on?1.14:.88)-g.scale.x)*Math.min(1,dt*6); g.scale.setScalar(s); g.userData.ball.rotation.y+=dt*(on?.5:.12); }); },
  exit(){ selGroup.visible=false; },
};
Screens.select.prevMission = S.mission;
}

