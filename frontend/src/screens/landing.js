import { $, $$ } from '../ui/dom.js';
import { clamp, hex } from '../core/physics/math.js';
import { Store, S } from '../state/store.js';
import { Screens, go } from '../app/router.js';
import { useWorld, pad, Stage } from '../three/renderer.js';
import { setTheme } from '../ui/theme.js';
import { ground, heroSky, tower, padGroup, platform, craftStand, rocketRig, craftRig, rebuildRocket, heroPlanets, heroStars } from '../three/worlds/padWorld.js';
import { cutPlane } from '../three/materials.js';
import { TheoryLab } from './landing/TheoryLab.js';
import { Sound } from '../ui/sound.js';
import { MISSION_ORDER, MISSIONS } from '../core/data/missions.js';
import { BODIES } from '../core/data/bodies.js';

// ====================================================================================================
// MODULE  src/screens/landing.js
// layer   screens
// what    SCREEN 1 · landing page: interactive hero rocket, start buttons, mission rows
// imports state/store, app/router, three/worlds/padWorld, ui/*, screens/landing/TheoryLab
// ====================================================================================================

let landingEl, heroZone, heroMotionReduced, heroOrbit, syncSound;
function heroPointerNorm(e){
  const r=heroZone.getBoundingClientRect();
  heroOrbit.nx=clamp(((e.clientX-r.left)/Math.max(1,r.width)) * 2-1,-1,1);
  heroOrbit.ny=clamp(((e.clientY-r.top)/Math.max(1,r.height))*2-1,-1,1);
}
function heroEndDrag(e){
  if(e.pointerId!==heroOrbit.pointerId) return;
  heroOrbit.dragging=false; heroOrbit.pointerId=null; heroOrbit.lastActivity=performance.now();
  heroZone.classList.remove('dragging');
  if(heroZone.hasPointerCapture(e.pointerId)) heroZone.releasePointerCapture(e.pointerId);
}
function startGame(cont){ Sound.ensure(); Sound.ok(); go(cont? 'builder' : 'select'); }
export function initialize(){
(landingEl = $('#landing'));
(heroZone = $('#heroOrbitZone'));
(heroMotionReduced = matchMedia('(prefers-reduced-motion: reduce)').matches);
(heroOrbit = {
  yaw:0, wantYaw:0, pitch:-.08, wantPitch:-.08, basePitch:-.08,
  dragging:false, pointerId:null, over:false, nx:0, ny:0, lastX:0, lastY:0,
  lastActivity:0,
});
heroZone.addEventListener('pointerenter',e=>{
  if(Store.session.screen!=='landing') return;
  heroOrbit.over=true; heroPointerNorm(e);
});
heroZone.addEventListener('pointerleave',()=>{
  if(!heroOrbit.dragging){ heroOrbit.over=false; heroOrbit.nx=heroOrbit.ny=0; }
});
heroZone.addEventListener('pointerdown',e=>{
  if(Store.session.screen!=='landing'||(e.pointerType==='mouse'&&e.button!==0)) return;
  heroOrbit.dragging=true; heroOrbit.pointerId=e.pointerId; heroOrbit.over=true;
  heroOrbit.lastX=e.clientX; heroOrbit.lastY=e.clientY; heroOrbit.lastActivity=performance.now();
  heroPointerNorm(e); heroZone.classList.add('dragging'); heroZone.setPointerCapture(e.pointerId);
  e.preventDefault();
});
heroZone.addEventListener('pointermove',e=>{
  if(Store.session.screen!=='landing') return;
  heroPointerNorm(e);
  if(heroOrbit.dragging&&e.pointerId===heroOrbit.pointerId){
    const dx=e.clientX-heroOrbit.lastX, dy=e.clientY-heroOrbit.lastY;
    heroOrbit.wantYaw-=dx*.008;
    heroOrbit.wantPitch=clamp(heroOrbit.wantPitch+dy*.004,-.12,.42);
    heroOrbit.lastX=e.clientX; heroOrbit.lastY=e.clientY;
    heroOrbit.lastActivity=performance.now();
    e.preventDefault();
  }
});
heroZone.addEventListener('pointerup',heroEndDrag);
heroZone.addEventListener('pointercancel',heroEndDrag);
heroZone.addEventListener('lostpointercapture',heroEndDrag);
heroZone.addEventListener('keydown',e=>{
  if(Store.session.screen!=='landing') return;
  const k=e.key;
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(k)) return;
  if(k==='ArrowLeft') heroOrbit.wantYaw-=.22;
  if(k==='ArrowRight') heroOrbit.wantYaw+=.22;
  if(k==='ArrowUp') heroOrbit.wantPitch=clamp(heroOrbit.wantPitch+.08,-.12,.42);
  if(k==='ArrowDown') heroOrbit.wantPitch=clamp(heroOrbit.wantPitch-.08,-.12,.42);
  if(k==='Home') {heroOrbit.wantYaw=0; heroOrbit.wantPitch=heroOrbit.basePitch;}
  heroOrbit.lastActivity=performance.now(); e.preventDefault();
});
Screens.landing = {
  enter(){ useWorld(pad); setTheme('night'); landingEl.classList.remove('gone'); $('#topbar').style.display='none';
    pad.scene.background.set(0x141b3a); ground.material.color.set(0x1b2448); ground.visible=true; heroSky.visible=true; tower.visible=true; padGroup.visible=true; platform.visible=true; craftStand.visible=false; rocketRig.root.position.x=0;
    cutPlane.constant=1e6; rocketRig.setVisible(true); rocketRig.explode(false); craftRig.setVisible(false); rebuildRocket(S,true); for(const p of heroPlanets) p.g.visible=true; heroStars.material.opacity=.85;
    pad.controls.enabled=false; pad.controls.target.set(0,rocketRig.info.height*.5,0); pad.shift.x=.2; pad.shift.y=0;
    heroOrbit.yaw=heroOrbit.wantYaw=0;
    heroOrbit.basePitch=Math.asin(clamp((9-pad.controls.target.y)/118,-.12,.42));
    heroOrbit.pitch=heroOrbit.wantPitch=heroOrbit.basePitch;
    heroOrbit.dragging=false; heroOrbit.pointerId=null; heroOrbit.over=false; heroOrbit.nx=heroOrbit.ny=0;
    heroOrbit.lastActivity=performance.now(); heroZone.classList.remove('dragging');
  },
  update(dt){
    Stage.renderOn=landingEl.scrollTop<innerHeight*1.05;
    if(!heroOrbit.dragging&&(!heroOrbit.over||performance.now()-heroOrbit.lastActivity>1700)&&!heroMotionReduced)
      heroOrbit.wantYaw+=dt*.035;
    const smooth=Math.min(1,dt*(heroOrbit.dragging?11:4.2));
    heroOrbit.yaw+= (heroOrbit.wantYaw-heroOrbit.yaw)*smooth;
    heroOrbit.pitch+=(heroOrbit.wantPitch-heroOrbit.pitch)*smooth;
    const parallax=heroOrbit.over&&!heroOrbit.dragging;
    const az=heroOrbit.yaw+(parallax?heroOrbit.nx*.035:0);
    const el=clamp(heroOrbit.pitch+(parallax?-heroOrbit.ny*.017:0),-.12,.42);
    const r=118, t=pad.controls.target, flat=r*Math.cos(el);
    pad.camera.position.set(Math.sin(az)*flat, t.y+Math.sin(el)*r, Math.cos(az)*flat);
    pad.camera.lookAt(t);
    for(const p of heroPlanets){ const a=p.ph+performance.now()*.001*p.w; p.g.position.set(Math.cos(a)*p.R, p.y+Math.sin(a*1.3)*18, Math.sin(a)*p.R); p.g.userData.ball.rotation.y+=dt*.05; }
    rocketRig.update(dt,pad.camera); TheoryLab.update(dt);
  },
  exit(){ Stage.renderOn=true; landingEl.classList.add('gone'); $('#topbar').style.display='';
    heroOrbit.dragging=false; heroOrbit.over=false; heroZone.classList.remove('dragging'); },
};
$('#heroTitle').innerHTML=[...'GEODESIC'].map((c,i)=>`<span style="animation-delay:${.15+i*.06}s">${c}</span>`).join('');
if(Store.hadSave){ const b=$('#heroContinue'); b.style.display=''; b.onclick=()=>startGame(true); }
$$('[data-start]').forEach(b=>b.onclick=()=>startGame(false));
$('#wmHome').onclick=()=>{ landingEl.scrollTop=0; go('landing'); };
(syncSound = ()=>$('#tbSound').textContent=S.sound? 'Sound on' : 'Sound off');
syncSound();
$('#tbSound').onclick=()=>{ S.sound=!S.sound; Store.commit(); syncSound(); if(!S.sound) Sound.rumble(0); };
$('#missionRows').innerHTML=MISSION_ORDER.map(k=>{ const m=MISSIONS[k]; return `<div class="mrow"><div class="dot" style="background:${hex(BODIES[k].col)}"></div>
  <div><h3>${m.name}</h3><div class="kicker" style="margin-top:6px">${m.level}</div></div><p><b style="color:var(--ink)">${m.goal}.</b> ${m.blurb}</p>
  <div style="min-width:200px"><div class="tl"><span class="k">Budget</span><span class="d"></span><span class="v">$${m.budget}M</span></div><div class="tl"><span class="k">Flight</span><span class="d"></span><span class="v">${m.duration}</span></div></div></div>`; }).join('');
}
export { landingEl, heroZone, heroMotionReduced, heroOrbit, heroPointerNorm, heroEndDrag, startGame, syncSound };
