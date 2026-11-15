import { Screens } from '../app/router.js';
import { flight, completeMission } from '../game/flight.js';
import { landingInit, LANDING, landingStep, landingAssist } from '../core/physics/landing.js';
import { fadeThrough, setTheme } from '../ui/theme.js';
import { useWorld, pad, stopFly, V3 } from '../three/renderer.js';
import { heroSky, heroPlanets, heroStars, ground, padGroup, rocketRig, craftRig, craftStand } from '../three/worlds/padWorld.js';
import { buildLanding, landGroup, Lander } from '../three/landingSite.js';
import { $ } from '../ui/dom.js';
import { roleTag } from '../ui/crew.js';
import { tl, setTl } from '../ui/telemetry.js';
import { Sound } from '../ui/sound.js';
import { boom, LV } from '../three/launchSite.js';
import { fmtN } from '../core/format.js';
import { wait, ease } from '../ui/tween.js';
import { Store } from '../state/store.js';
import { lerp, clamp } from '../core/physics/math.js';

// ====================================================================================================
// MODULE  src/screens/descent.js
// layer   screens
// what    SCREEN 11b · landing (fixed 120 Hz physics). The screen is named 'descent': 'landing' is the landing page.
// imports state/store, game/flight, app/router, three/landingSite, three/launchSite (booms), ui/*, core/physics/landing
// ====================================================================================================


export function initialize(){
Screens.descent = {
  async enter(o){
    this.ready=false; const key=flight().mission, moon=key==='moon'; this.assist=!!o.assist; this.s=landingInit(key); this.acc=0; this.thr=0; this.hold=false; this.done=false; this.camD=110;
    await fadeThrough(()=>{ useWorld(pad); setTheme(moon?'night':'paper'); pad.scene.background.set(moon? 0x0c122e : 0xdcae84); heroSky.visible=moon; for(const p of heroPlanets) p.g.visible=false; heroStars.material.opacity=.85; ground.visible=false; padGroup.visible=false; rocketRig.setVisible(false); craftRig.setVisible(false); craftStand.visible=false;
      stopFly(pad); buildLanding(key); landGroup.visible=true; pad.controls.enabled=false; pad.shift.x=-.06; pad.shift.y=0; },moon? '#0c122e' : '#dcae84');
    $('#dKick').textContent='Landing'+roleTag('sci'); $('#dTitle').textContent=`Descent to ${moon? 'the Moon' : 'Mars'}`; $('#dBig').className='bigcall';
    if(!$('#dTele').children.length){ $('#dTele').innerHTML=tl('h','Altitude','m')+tl('v','Descent rate','m/s')+tl('thr','Throttle','%')+`<div class="tl" data-bar="f"><span class="k">Fuel</span><span class="bar"><i></i></span><span class="u" style="min-width:2.8em;text-align:right"></span></div><p class="verdict" id="dCue"></p>`;
      const b=$('#dFire'), dn=e=>{ this.hold=true; b.classList.add('down'); e.preventDefault(); }, up=()=>{ this.hold=false; b.classList.remove('down'); }; b.addEventListener('pointerdown',dn); b.addEventListener('pointerup',up); b.addEventListener('pointerleave',up); b.addEventListener('pointercancel',up);
      $('#dAssist').onclick=()=>{ this.assist=!this.assist; this.sync(); }; }
    this.sync(); this.ready=true;
  },
  sync(){ const b=$('#dAssist'); b.textContent=this.assist? 'Assisted on' : 'Assisted off'; b.classList.toggle('on',this.assist); $('#dFire').disabled=this.assist; },
  key(code){ if(code==='Space'){ this.hold=true; $('#dFire').classList.add('down'); return true; } return false; },
  keyUp(code){ if(code==='Space'){ this.hold=false; $('#dFire').classList.remove('down'); } },
  finish(){ const s=this.s, big=$('#dBig'); this.done=true; flight().landing={ status:s.status, v:s.touchV, fuel:s.fuel, assist:this.assist, t:s.t }; Sound.rumble(0);
    if(s.status==='crash'){ boom(Lander.g.position.clone().add(new V3(0,2,0)),9); Sound.boom(); Lander.g.visible=false; big.className='bigcall bad on'; big.querySelector('b').textContent='Impact'; big.querySelector('span').textContent=`${fmtN(s.touchV,0)} m/s · ${s.fuel<=0? 'the fuel ran out' : 'too fast'}`; }
    else { big.className='bigcall on'+(s.status==='hard'?' bad':''); big.querySelector('b').textContent=s.status==='hard'? 'Hard landing' : 'Touchdown'; big.querySelector('span').textContent=`${fmtN(s.touchV,1)} m/s · ${Math.round(s.fuel*100)}% fuel left · ${fmtN(s.t,0)} s descent`; s.status==='hard'? Sound.bad() : Sound.ok(); }
    wait(3.2).then(()=>{ if(Store.session.screen==='descent') completeMission(); }); },
  update(dt){
    if(!this.ready) return; const s=this.s, L=LANDING[s.key];
    if(!this.done){ this.thr=this.hold? Math.min(1,this.thr+dt*4) : Math.max(0,this.thr-dt*6); this.acc+=dt; let n=0;
      while(this.acc>=1/120&&n<12&&s.status==='descent'){ landingStep(s,1/120,this.assist? landingAssist(s) : this.thr); this.acc-=1/120; n++; }
      if(s.status!=='descent') this.finish(); }
    const g=Lander.g; g.position.y=s.h; const on=s.thr>.02&&!this.done; Lander.flame.visible=on; if(on){ const j=.85+Math.random()*.3; Lander.flame.children[0].scale.set(.55,4.5*s.thr*j,.55); Lander.flame.children[1].scale.set(.28,2.4*s.thr*j,.28); } if(!this.done) Sound.rumble(s.thr*.45);
    for(let i=LV.booms.length-1;i>=0;i--){ const b=LV.booms[i]; b.t+=dt; if(b.t>0){ const k=b.t/1.6; b.m.scale.setScalar(Math.max(.01,b.size*ease.out(Math.min(1,k*1.6))*(k>.6? 1-(k-.6)/.4 : 1))); if(k>=1){ pad.scene.remove(b.m); b.m.geometry.dispose(); LV.booms.splice(i,1); } } }
    // camera: target is the lander itself (no lag); only distance and tilt are eased
    const el=lerp(.1,.62,clamp(s.h/800,0,1)), wantD=17+s.h*.075; this.camD+=(wantD-this.camD)*Math.min(1,dt*2.5); const t=new V3(0,s.h+1.8,0), az=.6;
    pad.camera.position.set(t.x+Math.sin(az)*Math.cos(el)*this.camD,t.y+Math.sin(el)*this.camD,t.z+Math.cos(az)*Math.cos(el)*this.camD); pad.camera.lookAt(t);
    const T=$('#dTele'), stop=s.v<0? s.v*s.v/(2*(L.aMax-L.g)) : 0, brake=!this.done&&stop>s.h*.82&&s.h>4; setTl(T,'h',s.h,0); setTl(T,'v',Math.max(0,-s.v),1,-s.v<=3?'good':brake?'bad':''); setTl(T,'thr',s.thr*100,0);
    const br=T.querySelector('[data-bar="f"]'); br.querySelector('i').style.width=(s.fuel*100).toFixed(1)+'%'; br.querySelector('.u').textContent=Math.round(s.fuel*100)+'%';
    const cue=$('#dCue'); cue.className='verdict '+(brake?'bad':'good'); cue.innerHTML=this.done? '' : this.assist? 'The computer is holding the braking curve.' : brake? '<b>BRAKE NOW.</b> Full thrust barely stops you from here.' : s.h>60? 'Falling. Save fuel, but do not wait too long.' : '<b>Easy.</b> Under 3 m/s at the surface.';
  },
  exit(){ landGroup.visible=false; padGroup.visible=true; ground.visible=true; for(const p of heroPlanets) p.g.visible=true; pad.shift.x=0; Sound.rumble(0); for(const b of LV.booms) pad.scene.remove(b.m); LV.booms=[]; $('#dBig').className='bigcall'; },
};
}

