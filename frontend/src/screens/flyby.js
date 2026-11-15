import { Screens, go } from '../app/router.js';
import { flight, craftDvLeft, endFlight, craftBurn } from '../game/flight.js';
import { BODIES } from '../core/data/bodies.js';
import { enterEncounter } from './shared/stage.js';
import { Enc, hypPoints, mkArrow, encGroup, setArrow, hypPoint } from '../three/encounter.js';
import { COL } from '../three/materials.js';
import { V, clamp, lerp } from '../core/physics/math.js';
import { V3, space } from '../three/renderer.js';
import { mkLabel } from '../three/solarView.js';
import { fmtN } from '../core/format.js';
import { $ } from '../ui/dom.js';
import { roleTag } from '../ui/crew.js';
import { tl, setTl } from '../ui/telemetry.js';
import { flybyPeri, flybyExit, flybyTurn } from '../core/physics/flyby.js';
import { D2R } from '../core/constants.js';
import { Store } from '../state/store.js';
import { Sound } from '../ui/sound.js';
import { wait, ease } from '../ui/tween.js';

// ====================================================================================================
// MODULE  src/screens/flyby.js
// layer   screens
// what    SCREEN 10 · flyby (aim the closest approach, then the slow-motion pass)
// imports state/store, game/flight, app/router, three/encounter, screens/shared/stage, ui/*, core/physics/flyby
// ====================================================================================================


export function initialize(){
Screens.flyby = {
  async enter(o){
    this.ready=false; const F=flight(), rt=F.rt, i=this.i=o.i, fb=this.fb=rt.flybys[i], b=this.b=BODIES[fb.body]; this.nextName=BODIES[rt.chain[i+2]].name; this.locked=false; this.clock=32; this.playing=null;
    this.lo=b.R*.82; this.hi=Math.max(fb.rp*3.4,b.R*6); this.rMax=Math.max(fb.rp*7,b.R*24); this.dist=Math.max(fb.rp/b.R*10*4.2,105);
    await enterEncounter(fb.body,this.dist); const u=this.dist/100;
    this.crashRing=Enc.ring(10,(b.R+b.minAlt)/b.R*10,COL.flame,.4);
    this.ghost=Enc.tube(hypPoints(b.gm,fb.rp,fb.vi,b.R,this.rMax).pts,0x7fd6cd,.16*u); this.path=null;
    this.aIn=mkArrow(0xfbf6ec); this.aOut=mkArrow(COL.flame); this.aPl=mkArrow(0x6fb7b1); encGroup.add(this.aIn,this.aOut,this.aPl); this.aOut.visible=false;
    // encounter-plane basis from the real 3-D velocity vectors
    const e1=V.unit(fb.vin); let nrm=V.cross(fb.vin,fb.vout); if(V.len(nrm)<1e-6) nrm=[0,0,1]; nrm=V.unit(nrm); const e2=V.cross(nrm,e1); this.basis={ e1, e2, nrm };
    const vp=fb.vPlanet, pd=new V3(V.dot(vp,e1),0,-V.dot(vp,e2)).normalize(); setArrow(this.aPl,pd.clone().multiplyScalar(13),pd,22*u,.4*u);
    this.lPl=mkLabel(`${b.name} moves this way · ${fmtN(V.len(vp),1)} km/s`,'static'); this.lPl.element.style.color='#6fb7b1'; this.lPl.position.copy(pd).multiplyScalar(13+26*u); encGroup.add(this.lPl);
    this.lIn=mkLabel(`in · ${fmtN(fb.vi,1)} km/s`,'static'); this.lOut=mkLabel('','static'); this.lOut.element.style.color='#f0a36b'; encGroup.add(this.lIn,this.lOut); this.lOut.visible=false; this.yVis=this.dist*.05*b.R;
    $('#fKick').textContent=`Flyby ${i+1} of ${rt.flybys.length}`+roleTag('lead'); $('#fTitle').textContent=`Aim at ${b.name}`; $('#fHint').textContent=fb.dv>.1? `${b.name}'s gravity alone cannot bend the path enough for the next leg to ${this.nextName}. This route budgets a ${fmtN(fb.dv,2)} km/s powered burn at closest approach. Use the planned marker to stay on course.` : 'Move the slider to the planned closest approach. Too close is unsafe; too far needs additional correction fuel.'; $('#fBig').className='bigcall';
    if(!$('#fTele').children.length){ $('#fTele').innerHTML=tl('rp','Closest approach','R')+tl('alt','Altitude','km')+tl('turn','Path bends by','°')+tl('want','Plan needs','°')+tl('gain','Gravity-only speed gain','km/s')+tl('fix','Extra burn vs plan','km/s')+'<p class="verdict" id="fVerdict"></p>';
      $('#fSlider').oninput=()=>this.setRp(this.fromX(+$('#fSlider').value)); $('#fPlanAim').onclick=()=>{ this.setRp(this.fb.rp); $('#fSlider').value=this.toX(this.rp); }; $('#fLock').onclick=()=>this.lock(); }
    $('#fAim').style.display=''; $('#fTele').style.opacity=1; $('#fCrash').style.width=this.toX(b.R+b.minAlt)/10+'%'; $('#fPlan').style.left=this.toX(fb.rp)/10+'%';
    this.setRp(Math.min(this.hi*.92,fb.rp*(1.9+Math.random()*.5))); $('#fSlider').value=this.toX(this.rp); this.ready=true;
  },
  toX(rp){ return clamp(Math.log(rp/this.lo)/Math.log(this.hi/this.lo),0,1)*1000; }, fromX(x){ return this.lo*Math.pow(this.hi/this.lo,x/1000); },
  // A naturally weak flyby needs a powered vector impulse to reach the next Lambert leg.
  // Calculate that impulse at the chosen periapsis, not just the change in speed.
  solve(rp){ const fb=this.fb, b=this.b, g=flybyPeri(fb.body,rp,fb.vi,fb.vo,fb.delta);
    const natural=flybyExit(fb.body,rp,fb.vin,fb.vout,0).vout;
    const gain=V.len(V.add(fb.vPlanet,natural))-V.len(V.add(fb.vPlanet,fb.vin));
    return { turn:g.naturalTurn, burn:g.burn, fix:Math.max(0,g.burn-fb.dv), gain,
             crash:rp<b.R+b.minAlt, powered:Math.abs(g.beta)>1e-4 }; },
  setRp(rp){ this.rp=clamp(rp,this.lo,this.hi); const fb=this.fb, b=this.b, s=this.sol=this.solve(this.rp), u=this.dist/100, T=$('#fTele');
    const hp=hypPoints(b.gm,Math.max(this.rp,b.R*.5),fb.vi,b.R,this.rMax); this.hp=hp; this.path=Enc.tube(hp.pts,s.crash? 0xc8553d : COL.flame,.3*u,this.path);
    { const y0=-Math.min(hp.yMax*.96,this.yVis), p0=hypPoint(hp.hg,y0,b.R), d0=hypPoint(hp.hg,y0+hp.yMax*.01,b.R).sub(p0); setArrow(this.aIn,p0.clone().add(new V3(0,0,-3.5*u)),d0,16*u,.4*u); this.lIn.position.copy(p0).add(new V3(4*u,0,-9*u)); }
    setTl(T,'rp',this.rp/b.R,2,s.crash?'bad':''); setTl(T,'alt',this.rp-b.R,0,s.crash?'bad':''); setTl(T,'turn',s.turn/D2R,1); setTl(T,'want',fb.delta/D2R,1); setTl(T,'gain',(s.gain>=0?'+':'')+fmtN(s.gain,2)); setTl(T,'fix',s.fix,2,s.fix>.08?'bad':'good');
    Store.set('insight',{ kind:'flyby', body:b.name, rp:this.rp, accel:b.gm/(this.rp*this.rp)*1000, naturalTurn:flybyTurn(b.gm,this.rp,fb.vi,fb.vo), demand:fb.delta, burn:s.burn });
    const V_=$('#fVerdict'), have=craftDvLeft(), reserve=flight().rt.dvCap;
    V_.className='verdict '+(s.crash||s.burn+reserve>have?'bad':s.fix<.08?'good':'');
    V_.innerHTML=s.crash? `<b>Too close.</b> Below ${fmtN(b.minAlt,0)} km you are inside ${b.name}'s atmosphere.` :
      s.burn+reserve>have? `<b>Not enough ΔV.</b> This aim needs ${fmtN(s.burn,2)} km/s for the powered flyby, plus about ${fmtN(reserve,2)} km/s for capture. You have ${fmtN(have,2)} km/s.` :
      s.fix<.08? `<b>On the plan.</b> Periapsis steering ${fmtN(s.burn,2)} km/s (included in the route budget). Gravity alone bends the path by ${fmtN(s.turn/D2R,1)}°.` :
      `The aim is off the planned radius. Steering here costs <b>${fmtN(s.burn,2)} km/s</b> (${fmtN(s.fix,2)} extra), leaving less fuel to reach ${this.nextName}. Planned steering: ${fmtN(fb.dv,2)} km/s.`; },
  key(code){ if(this.locked) return false; const st=code==='ArrowLeft'? -1 : code==='ArrowRight'? 1 : 0; if(st){ const x=clamp(+$('#fSlider').value+st,0,1000); $('#fSlider').value=x; this.setRp(this.fromX(x)); return true; } if(code==='Enter'||code==='Space'){ this.lock(); return true; } return false; },
  lock(){ if(this.locked||!this.ready) return; this.locked=true; Sound.ok(); $('#fAim').style.display='none'; this.playing={ t:0, done:false }; },
  finishPass(){ const F=flight(), fb=this.fb, b=this.b, s=this.sol, big=$('#fBig'); F.t=fb.t;
    if(s.crash){ big.className='bigcall bad on'; big.querySelector('b').textContent=`Lost at ${b.name}`; big.querySelector('span').textContent=`Closest approach ${fmtN(this.rp-b.R,0)} km: inside the atmosphere`;
      return wait(2.8).then(()=>{ if(Store.session.screen==='flyby') endFlight({ ok:false, phase:'flyby', title:`Crashed into ${b.name}`, why:`The aim point was ${fmtN(Math.max(0,this.rp-b.R),0)} km above ${b.name}. Anything below ${fmtN(b.minAlt,0)} km is atmosphere at ${fmtN(fb.vi,1)} km/s. The spacecraft did not come out the other side.`, tip:'Stay outside the red ring. The teal line is the planned pass.' }); }); }
    const delivered=s.burn>1e-4? craftBurn(s.burn,'fly',`Powered flyby at ${b.name}`) : 0;
    const exit=flybyExit(fb.body,this.rp,fb.vin,fb.vout,delivered), err=V.sub(exit.vout,fb.vout);
    const gain=V.len(V.add(fb.vPlanet,exit.vout))-V.len(V.add(fb.vPlanet,fb.vin));
    const fix=V.len(err);
    F.gains.push({ body:fb.body, gain, rp:this.rp, turn:exit.turn, fix, required:s.burn, applied:delivered, extra:s.fix });
    F.burns.push({ t:fb.t, label:`${b.name} gravity-only speed gain ${s.gain>=0?'+':''}${fmtN(s.gain,2)} km/s`, dv:0, free:true, gain:s.gain });
    big.className='bigcall on'+(fix>.1?' bad':''); big.querySelector('b').textContent=fix>.1? `${fmtN(fix,2)} km/s off the outbound plan` : `Outbound trajectory toward ${BODIES[F.rt.chain[this.i+2]].name}`;
    big.querySelector('span').textContent=`Net heliocentric speed ${fmtN(V.len(V.add(fb.vPlanet,fb.vin)),1)} → ${fmtN(V.len(V.add(fb.vPlanet,exit.vout)),1)} km/s · powered burn ${fmtN(delivered,2)} / ${fmtN(s.burn,2)} km/s`;
    fix>.1? Sound.bad() : Sound.ok();
    return wait(3.4).then(()=>{ if(Store.session.screen==='flyby') go('cruise',{ leg:this.i+1, err }); }); },
  update(dt){
    if(!this.ready) return; this.planetSpin=(this.planetSpin||0)+dt; Enc.planet.userData.ball.rotation.y+=dt*.25; const u=this.dist/100, P=this.playing;
    if(!this.locked){ this.clock-=dt; $('#fClock').textContent='Encounter in '+Math.max(0,Math.ceil(this.clock))+' s'; if(this.clock<=0) this.lock(); Enc.craft.position.copy(this.hp.pts[0]); Enc.craft.scale.setScalar(1.6*u); return; }
    if(P&&!P.done){ P.t+=dt/7; const b=this.b, hg=this.hp.hg, s=this.sol; let yEnd=this.hp.yMax; if(s.crash) yEnd=this.rp<b.R? -hg.b*Math.sinh(Math.acosh(Math.max(1,(b.R/hg.a+1)/hg.e))) : 0;
      const k=ease.io(Math.min(1,P.t)), yy=lerp(-this.hp.yMax,yEnd,k), p=hypPoint(hg,yy,b.R), p2=hypPoint(hg,yy+this.hp.yMax*.004,b.R); Enc.craft.position.copy(p); Enc.craft.lookAt(p2); Enc.craft.scale.setScalar(1.6*u);
      const a=.5*Math.sin(k*Math.PI); space.camera.position.set(Math.sin(a)*this.dist*.62,this.dist*(1.15-.35*Math.sin(k*Math.PI)),Math.cos(a)*this.dist*.62); space.camera.lookAt(0,0,0);
      if(k>.55&&!s.crash){ this.aOut.visible=this.lOut.visible=true; const y1=Math.min(this.hp.yMax*.96,this.yVis), p1=hypPoint(hg,y1,b.R), d=hypPoint(hg,y1+this.hp.yMax*.01,b.R).sub(p1); setArrow(this.aOut,p1.clone().add(new V3(0,0,-3.5*u)),d,16*u,.4*u); this.lOut.position.copy(p1).add(new V3(4*u,0,-9*u)); this.lOut.element.textContent=`out · ${fmtN(this.fb.vo,1)} km/s · same speed, new direction`; }
      if(P.t>=1){ P.done=true; if(s.crash){ Sound.bad(); Enc.craft.visible=false; } $('#fTele').style.opacity=.25; this.finishPass(); } }
  },
  exit(){ encGroup.visible=false; $('#fBig').className='bigcall'; },
};
}

