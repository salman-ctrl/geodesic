import { Screens, go } from '../app/router.js';
import { flight, craftDvLeft, craftBurn, endFlight, completeMission } from '../game/flight.js';
import { BODIES } from '../core/data/bodies.js';
import { captureOrbit, captureDV } from '../core/physics/capture.js';
import { hyperbolaRadius } from '../core/physics/kepler.js';
import { hypPoints, Enc, encGroup, hypAtTime, hypPoint } from '../three/encounter.js';
import { enterEncounter } from './shared/stage.js';
import { COL } from '../three/materials.js';
import { mkFlame } from '../three/launchSite.js';
import { $ } from '../ui/dom.js';
import { roleTag } from '../ui/crew.js';
import { tl, setTl } from '../ui/telemetry.js';
import { lerp, clamp } from '../core/physics/math.js';
import { Sound } from '../ui/sound.js';
import { fmtN, fmtDur } from '../core/format.js';
import { wait } from '../ui/tween.js';
import { Store } from '../state/store.js';
import { TAU } from '../core/constants.js';
import { V3, space } from '../three/renderer.js';
import { MISSIONS } from '../core/data/missions.js';

// ====================================================================================================
// MODULE  src/screens/arrival.js
// layer   screens
// what    SCREEN 11 · arrival (capture-burn timing)
// imports state/store, game/flight, app/router, three/encounter, three/launchSite (flame), screens/shared/stage, ui/*, core/physics/*
// ====================================================================================================


export function initialize(){
Screens.arrival = {
  async enter(){
    this.ready=false; const F=flight(), key=this.bodyKey=F.mission, b=this.b=BODIES[key], o=this.orb=captureOrbit(key), vinf=this.vinf=F.rt.vinfArr, mu=b.gm; F.t=F.rt.t0+F.rt.days;
    const vp=Math.sqrt(vinf*vinf+2*mu/o.rp); this.tau=o.rp/vp; this.T=6*this.tau; this.k=0; this.state='approach'; this.have=craftDvLeft(); this.best=captureDV(key,vinf);
    const rMax=hyperbolaRadius(mu,o.rp,vinf,this.T)*1.03; this.hp=hypPoints(mu,o.rp,vinf,b.R,rMax,140); this.dist=Math.max(90,rMax/b.R*10*1.25);
    await enterEncounter(key,this.dist); const u=this.u=this.dist/100; this.path=Enc.tube(this.hp.pts,COL.flame,.28*u); this.flame=mkFlame(.5,3.2); this.flame.rotation.x=Math.PI/2; Enc.craft.add(this.flame); this.orbitTube=null;
    $('#aKick').textContent='Arrival'+roleTag('lead'); $('#aTitle').textContent=`Capture at ${key==='moon'? 'the Moon' : b.name}`; $('#aBig').className='bigcall'; $('#aBarWrap').style.display=''; $('#aChoice').style.display='none'; $('#aTele').style.opacity=1;
    if(!$('#aTele').children.length){ $('#aTele').innerHTML=tl('vinf','Arrival speed v∞','km/s')+tl('best','Burn at closest approach','km/s')+tl('now','Burn if you fire now','km/s')+tl('have','ΔV in the tank','km/s')+'<p class="verdict" id="aVerdict"></p>'; $('#aFire').onclick=()=>this.ignite(); }
    // green = full capture possible, pale = loose capture only
    const need=t=>captureDV(key,vinf,hyperbolaRadius(mu,o.rp,vinf,t)), loose=t=>{ const r=hyperbolaRadius(mu,o.rp,vinf,t); return Math.sqrt(vinf*vinf+2*mu/r)-Math.sqrt(2*mu/r)+.01; }; this.need=need; this.loose=loose;
    const span=fn=>{ let a=null, z=null; for(let i=0;i<=240;i++){ const t=lerp(-this.T,this.T,i/240); if(fn(t)<=this.have){ if(a===null) a=i/240; z=i/240; } } return a===null? null : [a,z]; }, ok=span(need), lo=span(loose);
    $('#aTrack').innerHTML=(lo? `<i class="loose" style="left:${lo[0]*100}%;width:${(lo[1]-lo[0])*100}%"></i>`:'')+(ok? `<i class="ok" style="left:${ok[0]*100}%;width:${Math.max(.6,(ok[1]-ok[0])*100)}%"></i>`:'')+'<i class="peri"></i><i class="mk" id="aMk"></i>';
    const T_=$('#aTele'); setTl(T_,'vinf',vinf,2); setTl(T_,'best',this.best,2,this.have>=this.best?'good':'bad'); setTl(T_,'have',this.have,2);
    $('#aVerdict').innerHTML=ok? 'Fire inside the <b>green window</b>.' : lo? '<b>Not enough ΔV for the planned orbit.</b> A burn in the pale window still captures, loosely.' : '<b>The tank cannot stop you at any point of this pass.</b> You will fly past whatever you do.'; $('#aVerdict').className='verdict '+(ok?'good':'bad');
    this.ready=true;
  },
  key(code){ if(code==='Space'||code==='Enter'){ this.ignite(); return true; } return false; },
  ignite(){ if(this.state!=='approach'||!this.ready) return; const F=flight(), b=this.b, t=lerp(-this.T,this.T,this.k), need=this.need(t), loose=this.loose(t), have=this.have; let result;
    if(have>=need){ craftBurn(need,'cap',`Capture burn at ${b.name}`); result='orbit'; } else { craftBurn(have,'cap',`Capture burn at ${b.name} (tank emptied)`); result=have>=loose? 'loose' : 'past'; }
    F.capture={ result, tb:t, tau:this.tau, need, best:this.best, have }; this.state='burn'; this.burnT=1.5; $('#aBarWrap').style.display='none'; Sound.rumble(.4); },
  after(){ const F=flight(), c=F.capture, b=this.b, o=this.orb, big=$('#aBig'), where=this.bodyKey==='moon'? 'the Moon' : b.name; Sound.rumble(0); $('#aTele').style.opacity=.25;
    if(c.result==='past'){ this.state='leaving'; big.className='bigcall bad on'; big.querySelector('b').textContent='No capture'; big.querySelector('span').textContent=c.have<=0||!isFinite(c.tb)? 'No burn. The spacecraft sails past.' : `That moment needed ${fmtN(c.need,2)} km/s. The tank had ${fmtN(c.have,2)}.`; Sound.bad();
      wait(3.6).then(()=>{ if(Store.session.screen==='arrival') endFlight({ ok:false, phase:'arrival', title:`Flew past ${where}`, why:(c.never? `The capture burn never fired. ` : `The capture burn came ${Math.abs(c.tb)<this.tau? 'close to' : c.tb<0? fmtDur(-c.tb/86400)+' before' : fmtDur(c.tb/86400)+' after'} closest approach, where braking into orbit needed ${fmtN(c.need,2)} km/s. The spacecraft had ${fmtN(c.have,2)} km/s. `)+`It arrived at ${fmtN(this.vinf,1)} km/s relative to ${where} and left at the same speed, into deep space. Nothing exploded. It is simply gone.`, tip:`At closest approach the burn would have been ${fmtN(c.best,2)} km/s. Fire at the centre of the bar, carry more propellant, or pick a slower arrival.` }); }); return; }
    this.state='orbit'; const ac=o.a*(c.result==='loose'? 3:1), ec=1-o.rp/ac, hg=this.hp.hg, pts=[]; for(let i=0;i<=200;i++){ const nu=i/200*TAU, r=ac*(1-ec*ec)/(1+ec*Math.cos(nu)), an=nu+hg.om, k=10/b.R; pts.push(new V3(Math.cos(an)*r*k,0,-Math.sin(an)*r*k)); }
    this.orbitTube=Enc.tube(pts,0x7fd6cd,.22*this.u); this.ell={ ac, ec, nu:Math.atan2(this.yNow,hg.a*(hg.e-Math.sqrt(1+(this.yNow/hg.b)**2))) }; encGroup.remove(this.path);
    big.className='bigcall on'; big.querySelector('b').textContent=c.result==='loose'? 'Captured, barely' : `Captured at ${where}`; big.querySelector('span').textContent=`Burn ${fmtN(Math.min(c.need,c.have),2)} km/s · ${fmtN(o.rp-b.R,0)} × ${fmtN(2*ac-o.rp-b.R,0)} km orbit · ${Math.abs(c.tb)<this.tau*.6? 'right at closest approach' : c.tb<0? 'a little early' : 'a little late'}`; Sound.ok();
    const land=MISSIONS[F.mission].landing&&F.hasProbe, C=$('#aChoice'); C.style.display='';
    C.innerHTML=land? `<button class="btn" data-l="0">Land: you fly it</button><button class="btn teal" data-l="1">Land: assisted</button><button class="btn ghost" data-l="x">Stay in orbit</button>` : `<button class="btn" data-l="x">Mission report →</button>`;
    C.querySelectorAll('button').forEach(bn=>bn.onclick=()=>{ bn.dataset.l==='x'? completeMission() : go('descent',{ assist:bn.dataset.l==='1' }); }); },
  update(dt){
    if(!this.ready) return; Store.set('insight',{ kind:'arrival', vinf:this.vinf, best:this.best, needNow:this.need(lerp(-this.T,this.T,clamp(this.k||0,0,1))), have:this.have }); Enc.planet.userData.ball.rotation.y+=dt*.2; const b=this.b, hg=this.hp.hg, u=this.u, T_=$('#aTele');
    if(this.state==='approach'||this.state==='burn'||this.state==='leaving'){ this.k+=dt/(this.state==='leaving'? 5 : 12); const t=lerp(-this.T,this.T,Math.min(this.k,1.6)), y=this.yNow=hypAtTime(hg,b.gm,t), p=hypPoint(hg,y,b.R), p2=hypPoint(hg,y+this.hp.yMax*.004,b.R);
      Enc.craft.position.copy(p); Enc.craft.lookAt(p2); Enc.craft.scale.setScalar(1.5*u); const mk=$('#aMk'); if(mk) mk.style.left=clamp(this.k,0,1)*100+'%';
      if(this.state==='approach'){ setTl(T_,'now',this.need(t),2,this.need(t)<=this.have?'good':'bad'); if(this.k>=1){ flight().capture={ result:'past', tb:this.T, tau:this.tau, need:this.need(this.T), best:this.best, have:this.have, never:true }; $('#aBarWrap').style.display='none'; this.after(); } }
      if(this.state==='burn'){ this.burnT-=dt; this.flame.visible=true; const j=.8+Math.random()*.4; this.flame.children[0].scale.set(.5,3.2*j,.5); if(this.burnT<=0){ this.flame.visible=false; this.after(); } } }
    else if(this.state==='orbit'){ const e=this.ell; e.nu+=dt*.5*Math.pow(1+e.ec*Math.cos(e.nu),2)/Math.pow(1+e.ec,2)+dt*.02; const r=e.ac*(1-e.ec*e.ec)/(1+e.ec*Math.cos(e.nu)), an=e.nu+hg.om, k=10/b.R; Enc.craft.position.set(Math.cos(an)*r*k,0,-Math.sin(an)*r*k); Enc.craft.rotation.set(0,an,0);
      const d=space.camera.position.length(), nd=lerp(d,this.dist*1.7,Math.min(1,dt*.8)); space.camera.position.multiplyScalar(nd/d); }
  },
  exit(){ encGroup.visible=false; $('#aBig').className='bigcall'; Sound.rumble(0); },
};
}

