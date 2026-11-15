import { Screens, go } from '../app/router.js';
import { newFlight, flight, endFlight } from '../game/flight.js';
import { ascentInit, ascentAuto, ascentStep, ASC } from '../core/physics/ascent.js';
import { S, Store } from '../state/store.js';
import { currentPlan } from '../state/selectors.js';
import { useWorld, pad, Stage, stopFly, V3 } from '../three/renderer.js';
import { setTheme, fadeThrough } from '../ui/theme.js';
import { heroSky, heroPlanets, heroStars, ground, rocketRig, craftRig, craftStand, padGroup, tower, platform } from '../three/worlds/padWorld.js';
import { site, earthBack, airGlow, buildLV, smokeP, LV, R0M, EK, skyAt, shed, boom, vapor, nextSmoke, SMOKE_N, _m4, _q, _s, smoke, _c1 } from '../three/launchSite.js';
import { $, $$ } from '../ui/dom.js';
import { tl, setTl } from '../ui/telemetry.js';
import { callout } from '../ui/callout.js';
import { Sound } from '../ui/sound.js';
import { wait, tween, ease } from '../ui/tween.js';
import { ROCKET } from '../core/data/parts.js';
import { clamp, lerp } from '../core/physics/math.js';
import { fmtN } from '../core/format.js';
import { BODIES } from '../core/data/bodies.js';
import { disposeGroup } from '../three/materials.js';

// ====================================================================================================
// MODULE  src/screens/launch.js
// layer   screens
// what    SCREEN 8 · launch (flight director controls)
// imports state/store, state/selectors, game/flight, app/router, three/launchSite, ui/*, core/physics/ascent
// ====================================================================================================


export function initialize(){
Screens.launch = {
  async enter(o){
    this.ready=false; newFlight(); const s=this.sim=ascentInit(S.rocket,flight().dry+flight().prop); Store.session.launchSim=s; this.plan=currentPlan(); this.auto=!!o.auto; this.acc=0; this.done=false; this.cmd={}; this.prompt=''; this.shake=0; this.seenQ=false; this.tReal=0; this.zoomTo=0; this.depBurn=0; this.az=.55; this.token=(this.token||0)+1;
    const setup=()=>{ useWorld(pad); setTheme('paper'); pad.scene.background.set(0x8ec9ea); heroSky.visible=true; for(const p of heroPlanets) p.g.visible=false; heroStars.material.opacity=0; ground.visible=false; rocketRig.setVisible(false); craftRig.setVisible(false); craftStand.visible=false;
      site.visible=true; site.add(padGroup); padGroup.visible=true; tower.visible=true; platform.visible=true; earthBack.visible=airGlow.visible=true; buildLV(S); for(const p of smokeP) p.life=0; this.place(); this.ready=true; };
    if(Store.session.screen==='launch'&&Stage.world===pad&&!ground.visible) setup(); else if(Stage.world!==pad||!o.fromPoll){ await fadeThrough(setup,'#8ec9ea'); } else setup();
    if(!$('#lTele').children.length){ $('#lTele').innerHTML=tl('t','Mission time','')+tl('alt','Altitude','km')+tl('spd','Speed','m/s')+tl('apo','Apoapsis','km')+tl('q','Air pressure','kPa')
        +['Boosters','Core','Upper'].map((n,i)=>`<div class="tl" data-bar="${i}"><span class="k">${n}</span><span class="bar"><i></i></span><span class="u" style="min-width:2.6em;text-align:right"></span></div>`).join('');
      $('#lAuto').onclick=()=>{ this.auto=!this.auto; this.syncAuto(); }; }
    this.syncAuto(); $('#lPrompt').innerHTML=''; $('#lCall').classList.remove('on');
    stopFly(pad); const c=pad.controls, hgt=LV.height; c.target.set(0,0,0); pad.shift.x=pad.shift.y=0; if(o.fromPoll) pad.camera.position.set(30,6-LV.pivot,hgt*1.9+30); else pad.camera.position.set(hgt*.7,-hgt*.25,hgt*3.1); pad.camera.lookAt(0,0,0);
    c.enabled=true; c.minDistance=hgt*.8; c.maxDistance=hgt*7; c.minPolarAngle=.5; c.maxPolarAngle=2.1; c.autoRotate=true; c.autoRotateSpeed=.3;
    callout('IGNITION',this.auto? 'Autopilot has the vehicle' : 'You are flight director',2); Sound.rumble(.8); await wait(1.1); s.ignited=true;
  },
  syncAuto(){ const b=$('#lAuto'); b.textContent=this.auto? 'Autopilot on' : 'Autopilot off'; b.classList.toggle('on',this.auto); },
  key(code){ if(this.done) return false; if(code==='KeyG'){ this.press('turn'); return true; } if(code==='Space'){ this.press('stage'); return true; } if(code==='KeyF'){ this.press('fairing'); return true; } return false; },
  press(what){ const s=this.sim, hm=s.r-R0M;
    if(what==='turn'&&s.liftoff&&!s.turn) this.cmd.turn=true;
    if(what==='stage'){ if(s.boosters&&s.bProp<=ROCKET.boost.prop*.04) this.cmd.sepBoost=true; else if(s.coreOn&&!s.boosters&&s.cProp<=S.rocket.segs*ROCKET.seg.prop*.04) this.cmd.sepCore=true; else if(s.coreOn&&s.boosters&&s.cProp<=0) this.cmd.sepCore=true; }
    if(what==='fairing'&&s.fairingOn&&hm>80e3) this.cmd.sepFairing=true; },
  // Put the moving world where the simulation says it is, relative to the fixed rocket.
  place(){ const s=this.sim, hm=s.r-R0M, cam=pad.camera.position;
    site.position.set(-R0M*Math.sin(s.th),R0M*Math.cos(s.th)-s.r-LV.pivot,0); site.rotation.z=s.th; site.visible=hm<52e3;
    const cy=-s.r-LV.pivot; earthBack.position.set(cam.x*(1-EK),cam.y+(cy-cam.y)*EK,cam.z*(1-EK)); earthBack.rotation.z=s.th+.35; airGlow.position.copy(earthBack.position); airGlow.material.opacity=clamp((hm-25e3)/60e3,0,.5);
    skyAt(hm,pad.scene.background); heroStars.material.opacity=clamp((hm-35e3)/60e3,0,.9); LV.root.rotation.z=-s.pitch; },
  events(prev){ const s=this.sim, hm=s.r-R0M;
    if(prev.boosters&&!s.boosters){ const ax=new V3(0,1,0).applyQuaternion(LV.root.quaternion); shed(LV.boosters,g=>g.getWorldPosition(new V3()).setY(0).normalize().multiplyScalar(9).addScaledVector(ax,-26),1.2); callout('BOOSTER SEPARATION'); Sound.snap(); }
    if(prev.coreOn&&!s.coreOn){ const ax=new V3(0,1,0).applyQuaternion(LV.root.quaternion); shed([LV.core],()=>ax.clone().multiplyScalar(-34),.25); if(prev.boosters) shed(LV.boosters,g=>ax.clone().multiplyScalar(-30),1); callout('STAGE SEPARATION','Upper stage ignition in 2.5 s'); Sound.snap(); tween(1.4,k=>LV.focusY=lerp(LV.focusY,(LV.upY+LV.height)/2-LV.pivot,k)); pad.controls.minDistance=12; this.zoomTo=Math.max(38,(LV.height-LV.upY)*2.4); }
    if(prev.fairingOn&&!s.fairingOn&&s.status==='flight'){ shed(LV.fair,g=>new V3(0,0,g.children[0].geometry.parameters.phiStart? -14:14).applyQuaternion(LV.root.quaternion),.9); callout('FAIRING JETTISON',Math.round(hm/1000)+' km'); Sound.snap(); }
    if(!prev.turn&&s.turn){ const b=this.plan.band; callout('GRAVITY TURN',s.kickV<b[0]*.9? 'Early: watch the air pressure' : s.kickV>b[1]*1.25? 'Late: you are fighting gravity' : 'Right in the window'); }
    if(!prev.liftoff&&s.liftoff){ callout('LIFTOFF'); }
    if(!this.seenQ&&s.liftoff&&s.t-s.maxQt>3&&s.maxQ>8e3&&hm<40e3){ this.seenQ=true; callout('MAX-Q',fmtN(s.maxQ/1000,0)+' kPa · highest air pressure'); } },
  finish(){ const s=this.sim, rt=flight().rt, tk=this.token; this.done=true; if(Store.session.tutorialActive){ $('#lPrompt').innerHTML=''; Sound.rumble(0); return; } $('#lPrompt').innerHTML=''; Sound.rumble(0); flight().launch={ status:s.status, dvLeft:s.dvLeft, need:rt? rt.dvDep:0, kickV:s.kickV, band:this.plan.band, maxQ:s.maxQ, events:s.events.slice(), auto:this.auto, t:s.t };
    const end=async(out,delay)=>{ await wait(delay); if(tk===this.token&&Store.session.screen==='launch') endFlight(out); };
    if(s.status==='orbit'){ callout('ORBIT',`${Math.round(s.peri/1000)} × ${Math.round(s.apo/1000)} km`,3);
      (async()=>{ await wait(2.6); if(tk!==this.token) return; const need=rt.dvDep;
        if(s.dvLeft>=need){ callout('DEPARTURE BURN',`${fmtN(need,2)} km/s toward ${BODIES[rt.chain[1]].name}`,3.4); this.depBurn=3.4; Sound.rumble(.5); flight().burns.push({ t:rt.t0, label:'Departure burn (upper stage)', dv:need, free:true }); await wait(3.6); Sound.rumble(0); if(tk===this.token&&Store.session.screen==='launch') go('cruise'); }
        else { callout('DEPARTURE BURN SHORT',`${fmtN(s.dvLeft,2)} of ${fmtN(need,2)} km/s`,4); end({ ok:false, phase:'launch', title:'Stuck in Earth orbit', why:`The rocket reached orbit with ${fmtN(s.dvLeft,2)} km/s left in the upper stage. Leaving Earth on this route needs ${fmtN(need,2)} km/s. The spacecraft is healthy, but it is not going anywhere.`, tip:'Add tank segments or boosters, lighten the spacecraft, or pick a route with a smaller departure burn.' },3.6); } })(); }
    else if(s.status==='crash'){ boom(new V3(0,-LV.pivot*.3,0),LV.height*.7); Sound.boom(); LV.root.visible=false; this.shake=1; callout('IMPACT',Math.round(s.impactV)+' m/s',3);
      const noTurn=!s.turn, dry=s.uProp<=0&&s.cProp<=0; end({ ok:false, phase:'launch', title:'Fell back to Earth', why:noTurn? 'The gravity turn never started. The rocket climbed straight up, ran out of propellant and came straight back down.' : dry? 'The tanks ran dry before orbital speed. With no thrust left, the rocket followed its arc back into the atmosphere and hit the surface.' : 'The rocket could not hold its climb and fell back.', tip:noTurn? 'Start the gravity turn soon after liftoff (G), inside the green band.' : 'More ΔV (tanks, a better upper stage) or more thrust at liftoff. Check thrust-to-weight is above 1.2.' },3.4); }
    else if(s.status==='breakup'){ boom(new V3(0,0,0),LV.height*.8); Sound.boom(); LV.root.visible=false; this.shake=1; callout('VEHICLE LOST',fmtN(s.q/1000,0)+' kPa on the airframe',3);
      end({ ok:false, phase:'launch', title:'Broke up at max-Q', why:`Air pressure on the rocket reached ${fmtN(s.q/1000,0)} kPa while it was still deep in the atmosphere, more than the structure can take.`, tip:'Turn a little later, or use fewer boosters so the rocket is slower in thick air.' },3.4); }
    else { callout('NO LIFTOFF','Thrust never exceeded weight',3); end({ ok:false, phase:'launch', title:'Never left the pad', why:'Thrust stayed below the weight of the rocket until the tanks were empty. Nothing exploded. Nothing moved either.', tip:'Add engines or boosters until thrust-to-weight is above 1.2.' },3.4); } },
  update(dt){
    if(!this.ready) return; const s=this.sim; this.tReal+=dt;
    if(!this.done){
      const hm0=s.r-R0M, thrusting=s.thrust>0;
      let warp=s.t<9? 1.6 : s.t<45? lerp(1.6,6.5,(s.t-9)/36) : 7.5; if(!thrusting&&s.liftoff&&s.t>20) warp=hm0>90e3? 40 : 16; if(!s.liftoff&&s.t>12) warp=14;
      this.acc+=dt*warp; let n=0;
      while(this.acc>=.05&&n<900&&(s.status==='pad'||s.status==='flight')){ const prev={ boosters:s.boosters, coreOn:s.coreOn, fairingOn:s.fairingOn, turn:s.turn, liftoff:s.liftoff };
        const ctl=this.auto? ascentAuto(s,this.plan.kickV) : this.cmd; ascentStep(s,.05,ctl); this.cmd={}; this.acc-=.05; n++; this.events(prev); }
      if(s.status!=='pad'&&s.status!=='flight') this.finish();
    }
    const hm=s.r-R0M, speed=Math.hypot(s.vr,s.vt), T=$('#lTele'), live=!this.done;
    // exact placement, then camera (target is the rocket itself: no lag)
    pad.controls.target.set(0,0,0).add(new V3(0,LV.focusY,0).applyQuaternion(LV.root.quaternion)); this.place();
    { const c=pad.controls, az=c.getAzimuthalAngle(); if(az>.75) c.autoRotateSpeed=.3; else if(az<-.55) c.autoRotateSpeed=-.3;
      if(this.zoomTo){ const o=pad.camera.position.clone().sub(c.target), d=o.length(), nd=lerp(d,this.zoomTo,Math.min(1,dt*1.6)); pad.camera.position.copy(c.target).addScaledVector(o,nd/d); if(Math.abs(nd-this.zoomTo)<.5) this.zoomTo=0; } }
    if(this.shake>0){ this.shake=Math.max(0,this.shake-dt*.9); pad.camera.position.x+=(Math.random()-.5)*this.shake*3; pad.camera.position.y+=(Math.random()-.5)*this.shake*3; }
    setTheme(hm>16e3? 'night':'paper');
    // flames, vapour, smoke
    const fl=(f,on,k=1)=>{ if(!f) return; f.visible=on; if(on){ const j=.9+Math.random()*.22, wide=1+clamp(hm/60e3,0,1.6); f.children[0].scale.set(f.userData.r*wide,f.userData.L*j*k,f.userData.r*wide); f.children[1].scale.set(f.userData.r*.5,f.userData.L*.55*j*k,f.userData.r*.5); } };
    const coreOn=live&&s.ignited&&s.coreOn&&s.cProp>0, bOn=live&&s.ignited&&s.boosters>0&&s.bProp>0, uOn=(live&&!s.coreOn&&s.t>=s.upperIgnT&&s.uProp>0&&!s.cutoff)||this.depBurn>0;
    fl(LV.fCore,coreOn); LV.fBoost.forEach(f=>fl(f,bOn)); fl(LV.fUpper,uOn,this.depBurn>0? 1.5:1); if(this.depBurn>0) this.depBurn-=dt;
    if(live) Sound.rumble(coreOn||bOn? clamp(1-hm/70e3,.12,1) : uOn? .12 : 0);
    const mach=speed/320, vq=clamp((s.q-9e3)/14e3,0,1)*Math.exp(-Math.pow((mach-1.15)/.45,2)); vapor.material.opacity=live&&s.fairingOn? vq*(.35+Math.random()*.25) : 0;
    if((coreOn||bOn)&&hm<60e3&&site.visible){ const base=LV.core.localToWorld(new V3(0,-3,0)); site.worldToLocal(base); const nE=hm<60? 3 : 2;
      for(let i=0;i<nE;i++){ const p=smokeP[nextSmoke()]; p.p.copy(base); const gr=hm<45; p.v.set((Math.random()-.5)*(gr?38:8),gr? Math.random()*3 : -8-Math.random()*10,(Math.random()-.5)*(gr?38:8)); p.life=p.max=gr? 2.6+Math.random()*1.8 : 1.6+Math.random()*1.4; p.s=gr? 2.4+Math.random()*2.6 : 2+Math.random()*2; } }
    const skyC=pad.scene.background; for(let i=0;i<SMOKE_N;i++){ const p=smokeP[i]; if(p.life>0){ p.life-=dt; p.p.addScaledVector(p.v,dt); p.v.multiplyScalar(1-dt*.9); const a=1-p.life/p.max, sc=p.s*(.5+a*2.4)*Math.min(1,p.life*2.5);
        _m4.compose(p.p,_q,_s.setScalar(Math.max(sc,.001))); smoke.setMatrixAt(i,_m4); smoke.setColorAt(i,_c1.set(a<.05? 0xffe2b8 : 0xffffff).lerp(skyC,clamp((a-.35)*1.5,0,.9))); } else { _m4.compose(p.p,_q,_s.setScalar(.0001)); smoke.setMatrixAt(i,_m4); } }
    smoke.instanceMatrix.needsUpdate=true; if(smoke.instanceColor) smoke.instanceColor.needsUpdate=true;
    for(let i=LV.debris.length-1;i>=0;i--){ const d=LV.debris[i]; d.life-=dt; d.g.position.addScaledVector(d.v,dt); d.v.y-=dt*4; d.g.rotation.x+=d.w.x*dt; d.g.rotation.y+=d.w.y*dt; d.g.rotation.z+=d.w.z*dt; if(d.life<=0){ pad.scene.remove(d.g); disposeGroup(d.g); LV.debris.splice(i,1); } }
    for(let i=LV.booms.length-1;i>=0;i--){ const b=LV.booms[i]; b.t+=dt; if(b.t>0){ const k=b.t/1.6; b.m.scale.setScalar(Math.max(.01,b.size*ease.out(Math.min(1,k*1.6))*(k>.6? 1-(k-.6)/.4 : 1))); b.m.position.addScaledVector(b.d,dt*.5); if(k>=1){ pad.scene.remove(b.m); b.m.geometry.dispose(); LV.booms.splice(i,1); } } }
    // telemetry
    const mm=Math.floor(s.t/60), ss=Math.floor(s.t%60); setTl(T,'t',`T+ ${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`); setTl(T,'alt',hm/1000,1); setTl(T,'spd',speed,0); setTl(T,'apo',isFinite(s.apo)? Math.max(0,s.apo/1000) : NaN,0,s.apo>=ASC.orbitAlt?'good':''); setTl(T,'q',s.q/1000,1,s.q>70e3?'bad':'');
    const fr=[S.rocket.boosters? (s.boosters? s.bProp/ROCKET.boost.prop : 0) : -1, s.coreOn? s.cProp/(S.rocket.segs*ROCKET.seg.prop) : 0, s.uProp/ROCKET.upper[S.rocket.upper].prop];
    $$('#lTele [data-bar]').forEach((row,i)=>{ row.style.display=fr[i]<0?'none':''; row.querySelector('i').style.width=(clamp(fr[i],0,1)*100).toFixed(1)+'%'; row.querySelector('.u').textContent=(i===0&&!s.boosters)||(i===1&&!s.coreOn)? 'gone' : Math.round(clamp(fr[i],0,1)*100)+'%'; });
    // prompts appear only when the decision is live
    let pr=''; if(live&&!this.auto){ const b=this.plan.band;
      if(s.liftoff&&!s.turn) pr='turn'; else if(s.boosters&&s.bProp<=ROCKET.boost.prop*.04) pr='boost'; else if(s.coreOn&&((!s.boosters&&s.cProp<=S.rocket.segs*ROCKET.seg.prop*.04)||s.cProp<=0)) pr='core'; else if(s.fairingOn&&hm>100e3&&!s.coreOn) pr='fair'; }
    if(pr!==this.prompt){ this.prompt=pr; const P=$('#lPrompt'), b=this.plan.band, mx=Math.max(b[1]*2.2,120);
      P.innerHTML=pr==='turn'? `<button class="btn" data-p="turn">Start gravity turn <kbd>G</kbd></button><div class="gauge"><div class="kicker">Speed · turn inside the green band</div><div class="trk"><div class="band" style="left:${b[0]/mx*100}%;width:${Math.max(4,(b[1]-b[0])/mx*100)}%"></div><div class="mk" id="lMk"></div></div></div>`
        : pr==='boost'? `<button class="btn" data-p="stage">Drop boosters <kbd>Space</kbd></button><div class="kicker">Empty boosters are dead weight</div>` : pr==='core'? `<button class="btn" data-p="stage">Stage separation <kbd>Space</kbd></button><div class="kicker">Core is empty: every second coasting costs speed</div>`
        : pr==='fair'? `<button class="btn calm" data-p="fairing">Jettison fairing <kbd>F</kbd></button><div class="kicker">Above the air: drop the shield</div>` : '';
      const btn=P.querySelector('[data-p]'); if(btn) btn.onclick=()=>this.press(btn.dataset.p); }
    if(pr==='turn'){ const mk=$('#lMk'), mx=Math.max(this.plan.band[1]*2.2,120); if(mk) mk.style.left=clamp(speed/mx*100,0,100)+'%'; }
  },
  exit(){ this.token++; this.done=true; Sound.rumble(0); const c=pad.controls; c.autoRotate=false; c.enabled=false; c.minPolarAngle=0; site.visible=false; earthBack.visible=airGlow.visible=false; LV.root.visible=false; pad.scene.add(padGroup); ground.visible=true; for(const p of heroPlanets) p.g.visible=true; heroStars.material.opacity=.85;
    for(const d of LV.debris) pad.scene.remove(d.g); LV.debris=[]; for(const b of LV.booms) pad.scene.remove(b.m); LV.booms=[]; this.depBurn=0; $('#lCall').classList.remove('on'); },
};
}

