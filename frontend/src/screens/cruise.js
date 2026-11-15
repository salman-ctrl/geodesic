import { Screens, go } from '../app/router.js';
import { flight, endFlight, craftBurn, craftDvLeft } from '../game/flight.js';
import { legMu, legVelToKms, legLenToKm, legState } from '../core/physics/route.js';
import { kepProp } from '../core/physics/kepler.js';
import { V, lerp } from '../core/physics/math.js';
import { TAU, AU_KM, C_KMS } from '../core/constants.js';
import { BODIES } from '../core/data/bodies.js';
import { Sol, craftMark, predLine, missLabel, mapFrame } from '../three/solarView.js';
import { S, Store } from '../state/store.js';
import { Stage, space, useWorld } from '../three/renderer.js';
import { solarGroup, selGroup } from '../three/worlds/spaceWorld.js';
import { setTheme, fadeThrough } from '../ui/theme.js';
import { encGroup } from '../three/encounter.js';
import { $, $$ } from '../ui/dom.js';
import { tl, setTl } from '../ui/telemetry.js';
import { lambert } from '../core/physics/lambert.js';
import { fmtN, fmtDelay } from '../core/format.js';
import { Sound } from '../ui/sound.js';
import { toast } from '../ui/toast.js';
import { fmtDate } from '../core/physics/time.js';
import { planetState } from '../core/physics/ephemeris.js';

// ====================================================================================================
// MODULE  src/screens/cruise.js
// layer   screens
// what    SCREEN 9 · cruise and course corrections
// imports state/store, game/flight, app/router, three/solarView, screens/shared/stage, ui/*, core/physics/*
// ====================================================================================================


export function initialize(){
Screens.cruise = {
  warp:10,
  async enter(o){
    this.ready=false; const F=flight(), rt=F.rt, i=this.i=o.leg||0, leg=this.leg=rt.legs[i], mu=this.mu=legMu(leg); this.kv=legVelToKms(leg); this.kl=legLenToKm(leg);
    if(!leg.rEnd) leg.rEnd=kepProp(leg.r0,leg.v0,leg.tof,mu).r;
    let err=o.err; if(!err){ if(i===0){ const mag=(leg.frame==='geo'? 2+Math.random()*2 : 13+Math.random()*13)/1000, u=V.unit(leg.v0), rad=V.unit(leg.r0), a=Math.random()*TAU; err=V.add(V.mul(u,Math.cos(a)*mag),V.mul(rad,Math.sin(a)*mag)); } else err=[0,0,0]; }
    this.err0=V.len(err); this.r=leg.r0.slice(); this.v=V.add(leg.v0,V.mul(err,1/this.kv)); this.t=leg.t0; this.tEnd=leg.t0+leg.tof; F.t=this.t;
    this.marks=[{ at:leg.t0+leg.tof*.07, type:'tcm' },{ at:leg.t0+leg.tof*.88, type:'enc' }]; if(this.err0<2e-4) this.marks.shift();
    this.paused=null; this.burning=false; this.legDv=0; this.need=0; this.needVec=[0,0,0]; this.miss=0; this.rate0=0; this.dry=false;
    this.corridor=leg.frame==='geo'? 4000 : Math.max(15*BODIES[leg.to].R,6e4);
    const vr=Sol.viewRadiusFor(S.mission,S.route.flybys), fresh=Stage.world!==space||!solarGroup.visible, setup=()=>{ useWorld(space); setTheme('night'); space.scene.background.set(0x141b3a); selGroup.visible=false; encGroup.visible=false; solarGroup.visible=true; space.camera.up.set(0,1,0);
      Sol.setFrame(leg.frame); Sol.viewR=vr; Sol.setDate(this.t); Sol.setRoute(rt,false); craftMark.visible=predLine.visible=missLabel.visible=true; craftMark.scale.setScalar(vr*.012);
      if(fresh){ space.controls.target.set(0,0,0); space.camera.position.set(0,vr*3,vr*2.6); space.camera.lookAt(0,0,0); } };
    if(fresh) await fadeThrough(setup); else setup();
    if(!$('#kTele').children.length){ $('#kTele').innerHTML=tl('date','Date','')+tl('miss','Predicted miss','km')+tl('need','Correction needed','m/s')+tl('delay','Signal delay to Earth','')+tl('dv','ΔV in the tank','km/s')+`<div class="tl" data-bar="p"><span class="k">Propellant</span><span class="bar"><i></i></span><span class="u" style="min-width:2.8em;text-align:right"></span></div>`;
      $('#kWarp').innerHTML=[1,10,100].map(w=>`<button class="chip" data-w="${w}">${w}×</button>`).join(''); $$('#kWarp .chip').forEach(c=>c.onclick=()=>{ this.warp=+c.dataset.w; this.sync(); });
      const b=$('#kBurn'), dn=e=>{ this.burning=true; b.classList.add('down'); e.preventDefault(); }, up=()=>{ this.burning=false; b.classList.remove('down'); }; b.addEventListener('pointerdown',dn); b.addEventListener('pointerup',up); b.addEventListener('pointerleave',up); b.addEventListener('pointercancel',up); }
    $('#kKick').textContent=`Cruise · leg ${i+1} of ${rt.legs.length}`; $('#kTitle').textContent=`${BODIES[leg.from].name} → ${BODIES[leg.to].name}`;
    $('#kHint').textContent=`Solid: the planned transfer. Dashed: the true predicted spacecraft trajectory (no exaggerated displacement). Hold to burn when you need a correction. ${leg.frame==='geo'? '1× is one hour per second.' : '1× is one day per second.'}`;
    $('#kPause').classList.remove('on'); this.sync(); this.compute(); this.ready=true;
    await Sol.view(vr,1.4,.04); const c=space.controls; c.enabled=true; c.minDistance=vr*.4; c.maxDistance=vr*5; c.maxPolarAngle=1.45; c.minPolarAngle=.05;
  },
  sync(){ $$('#kWarp .chip').forEach(c=>c.classList.toggle('on',+c.dataset.w===this.warp)); },
  key(code){ if(code==='KeyB'||code==='Space'){ this.burning=true; $('#kBurn').classList.add('down'); return true; } if(code==='Enter'&&this.paused){ this.resume(); return true; } return false; },
  keyUp(code){ if(code==='KeyB'||code==='Space'){ this.burning=false; $('#kBurn').classList.remove('down'); } },
  compute(){ const leg=this.leg, rem=this.tEnd-this.t, end=kepProp(this.r,this.v,rem,this.mu).r; this.miss=V.len(V.sub(end,leg.rEnd))*this.kl;
    if(rem>leg.tof*.03){ const L=lambert(this.r,leg.rEnd,rem,this.mu); this.needVec=L? V.mul(V.sub(L.v1,this.v),this.kv) : [0,0,0]; } this.need=V.len(this.needVec); },
  onPause(){ const leg=this.leg, name=BODIES[leg.to].name, last=this.i===flight().rt.legs.length-1, T=$('#kPauseT'), P=$('#kPauseP'), B=$('#kPauseB'), off=this.miss>this.corridor, hold=`<span class="kicker">Hold <kbd>B</kbd> to burn</span>`;
    if(this.paused==='tcm'){ T.textContent='Correction window'; P.innerHTML=`${this.i===0? 'The departure burn was not perfect.' : 'The flyby left a small error.'} Right now you would miss ${name} by <b style="display:inline;font:inherit;color:var(--fg)">${fmtN(this.miss,0)} km</b>. Fixing it today costs about ${fmtN(this.need*1000,1)} m/s. The same fix later costs more.`; B.innerHTML=hold+`<button class="btn sm teal" id="kGo">Continue cruise</button>`; }
    else { T.textContent=`Final approach to ${name}`; P.innerHTML=off? `You are heading ${fmtN(this.miss,0)} km wide of ${name}. The corridor is ${fmtN(this.corridor,0)} km. A fix now costs ${fmtN(this.need*1000,0)} m/s. Without it you fly past.` : `On course, ${fmtN(this.miss,0)} km from the aim point. ${last? 'Next: time the capture burn.' : 'Next: aim the closest approach.'}`;
      B.innerHTML=(off? hold : '')+`<button class="btn sm ${off?'ghost':''}" id="kGo">${off? 'Continue anyway' : last? 'Begin capture approach' : 'Aim the flyby'} →</button>`; }
    $('#kGo').onclick=()=>this.resume(); $('#kPause').classList.add('on'); Sound.blip(880,.12); this.pauseOff=off; },
  resume(){ const type=this.paused, leg=this.leg, name=BODIES[leg.to].name; if(!type) return; $('#kPause').classList.remove('on');
    if(type==='tcm'){ this.paused=null; return; }
    if(this.legDv>1e-4) flight().burns.push({ t:this.t, label:`Course corrections, ${BODIES[leg.from].name} → ${name}`, dv:this.legDv }); this.legDv=0; this.paused='done';
    if(this.miss>this.corridor) return endFlight({ ok:false, phase:'cruise', title:`Missed ${name}`, why:`The spacecraft passed ${fmtN(this.miss,0)} km from ${name}, outside the ${fmtN(this.corridor,0)} km approach corridor. `+(flight().prop<=0? 'The tank was dry, so there was nothing left to correct with. ' : '')+'Nothing broke. It is now coasting around '+(leg.frame==='geo'? 'the Earth' : 'the Sun')+' on its own orbit, with no way to reach the target.', tip:'Correct early: the first window is always the cheapest. Carry a little more propellant than the plan needs.' });
    if(this.i===flight().rt.legs.length-1) go('arrival'); else go('flyby',{ i:this.i });
  },
  update(dt){
    if(!this.ready) return; Sol.update(dt); const leg=this.leg, F=flight();
    if(!this.paused){ let adv=dt*(leg.frame==='geo'? 1/24 : 1)*this.warp; const mk=this.marks[0]; if(mk&&this.t+adv>=mk.at){ adv=Math.max(0,mk.at-this.t); this.paused=mk.type; this.marks.shift(); }
      if(adv>0){ const st=kepProp(this.r,this.v,adv,this.mu); this.r=st.r; this.v=st.v; this.t+=adv; F.t=this.t; } if(this.paused){ this.compute(); this.onPause(); } }
    const can=this.burning&&this.paused!=='done'&&this.need>2e-4;
    if(can&&F.prop>0){ if(!this.rate0) this.rate0=Math.max(.004,this.need*.45); const requested=Math.min(this.rate0*dt,this.need); const delivered=craftBurn(requested,'tcm'); this.v=V.add(this.v,V.mul(V.unit(this.needVec),delivered/this.kv)); this.legDv+=delivered; Sound.rumble(.22); if(F.prop<=0&&!this.dry){ this.dry=true; toast('Tank dry. No more corrections.'); Sound.bad(); } }
    else { this.rate0=0; if(this.wasBurn) Sound.rumble(0); } this.wasBurn=can&&F.prop>0;
    this.compute(); Sol.setDate(this.t);
    // Craft position and dashed prediction are in real map coordinates, never multiplied.
    const EX=1, pos=predLine.geometry.attributes.position, n=40; let lastP=null;
    for(let j=0;j<=n;j++){ const tj=lerp(this.t,this.tEnd,j/n), pa=kepProp(this.r,this.v,tj-this.t,this.mu).r, pn=legState(leg,tj).r, p=mapFrame(leg.frame,[pn[0]+(pa[0]-pn[0])*EX,pn[1]+(pa[1]-pn[1])*EX,pn[2]+(pa[2]-pn[2])*EX]); pos.setXYZ(j,p.x,p.y,p.z); if(j===0) craftMark.position.copy(p); if(j===1) craftMark.lookAt(p); lastP=p; }
    pos.needsUpdate=true; predLine.computeLineDistances(); predLine.material.dashSize=Sol.viewR*.016; predLine.material.gapSize=Sol.viewR*.011;
    const onT=this.need<=3e-4; missLabel.position.copy(lastP); missLabel.element.textContent=onT? 'ON TARGET' : 'MISS '+fmtN(this.miss,0)+' KM'; missLabel.element.style.color=this.miss>this.corridor? '#f0a36b' : '#7fd6cd';
    // telemetry
    const T=$('#kTele'); setTl(T,'date',leg.frame==='geo'? 'T+ '+fmtN((this.t-leg.t0)*24,1)+' h' : fmtDate(this.t)); setTl(T,'miss',this.miss,0,this.miss>this.corridor?'bad':'good'); setTl(T,'need',onT? 0 : this.need*1000,1,onT?'good':'');
    const dE=leg.frame==='geo'? V.len(this.r) : V.len(V.sub(this.r,planetState('earth',this.t).r))*AU_KM; setTl(T,'delay',fmtDelay(dE/C_KMS)); setTl(T,'dv',craftDvLeft(),2,F.prop<=0?'bad':'');
    const br=T.querySelector('[data-bar="p"]'), fr=F.prop0? F.prop/F.prop0 : 0; br.querySelector('i').style.width=(fr*100).toFixed(1)+'%'; br.querySelector('.u').textContent=Math.round(fr*100)+'%';
    $('#kBurn').disabled=F.prop<=0||onT;
    Store.set('insight',{ kind:'cruise', miss:this.miss, need:this.need, dvLeft:craftDvLeft() });
  },
  exit(){ space.controls.enabled=false; craftMark.visible=predLine.visible=missLabel.visible=false; $('#kPause').classList.remove('on'); this.burning=false; Sound.rumble(0); },
};
}

