import { Screens, go } from '../app/router.js';
import { handTo, roleTag } from '../ui/crew.js';
import { $ } from '../ui/dom.js';
import { tl, setTl } from '../ui/telemetry.js';
import { bindTray, slotStep, slotChips, slotGo } from '../ui/tray.js';
import { craftRig, rocketRig, rebuildRocket, platform, craftStand } from '../three/worlds/padWorld.js';
import { COL, cutPlane } from '../three/materials.js';
import { S, Store } from '../state/store.js';
import { tween, ease } from '../ui/tween.js';
import { lerp, clamp } from '../core/physics/math.js';
import { enterStudio, zoomBy } from './shared/stage.js';
import { V3, pad } from '../three/renderer.js';
import { ROCKET } from '../core/data/parts.js';
import { craftStats, rocketStats, LEO_DV, payloadCapacity, fairingFits } from '../core/physics/rocket.js';
import { currentRoute, currentPlan } from '../state/selectors.js';
import { fmtN } from '../core/format.js';
import { SIM_FAIL } from '../core/game/rules.js';
import { Sound } from '../ui/sound.js';

// ====================================================================================================
// MODULE  src/screens/builder.js
// layer   screens
// what    SCREEN 4 · rocket builder
// imports state/store, state/selectors, app/router, three/worlds/padWorld, screens/shared/stage, ui/*, core/physics/rocket
// ====================================================================================================


export function initialize(){
Screens.builder = {
  xray:false, simT:0,
  async enter(){
    await handTo('prop'); $('#bKick').textContent='Step 2 · Rocket builder'+roleTag('prop');
    if(!$('#bTele').children.length){ $('#bTele').innerHTML=tl('dv','ΔV','km/s')+tl('need','Needed','km/s')+tl('twr','Thrust / weight','')+tl('mass','Mass','t')+tl('cost','Cost','$M')+tl('cap','Payload capacity','kg')+tl('pay','Spacecraft','kg')+'<p class="verdict" id="bVerdict"></p>';
      bindTray($('#bTray'),(k,v)=>this.act(k,v)); $('#bExplode').onclick=()=>this.toggleExplode(); $('#bXray').onclick=()=>this.toggleXray(); }
    craftRig.setVisible(false); rocketRig.setVisible(true); rocketRig.setInk(COL.ink); rocketRig.explode(false); $('#bExplode').classList.remove('on'); $('#bTele').classList.remove('dim');
    rebuildRocket(S,true); tween(.8,k=>rocketRig.root.position.x=lerp(rocketRig.root.position.x,0,k),ease.out); this.refresh();
    platform.visible=true; craftStand.visible=false;
    const hgt=rocketRig.info.height; await enterStudio(new V3(30,hgt*.56,hgt*1.5+38),new V3(0,hgt*.47,0),1.5,0,-.055);
    pad.controls.minDistance=22; pad.controls.maxDistance=230;
  },
  act(k,v){ const r=S.rocket, L=ROCKET.limits;
    if(k==='go') return go('craft');
    if(k==='segs') r.segs=clamp(r.segs+ +v,L.segs[0],L.segs[1]); if(k==='engines') r.engines=clamp(r.engines+ +v,L.engines[0],L.engines[1]);
    if(k==='boosters') r.boosters=+v; if(k==='upper') r.upper=v; if(k==='fairing') r.fairing=v;
    Store.commit(); rebuildRocket(S); this.refresh(); },
  refresh(){
    const r=S.rocket, cs=craftStats(S.craft,S.mission), st=rocketStats(r,cs.wet), rt=currentRoute(), dep=rt? rt.dvDep : NaN, need=LEO_DV+dep, cap=isFinite(dep)? payloadCapacity(r,dep) : NaN, T=$('#bTele');
    setTl(T,'dv',st.dv,2,st.dv>=need?'good':'bad'); setTl(T,'need',need,2); setTl(T,'twr',st.twr,2,st.twr>=1.2?'good':'bad'); setTl(T,'mass',st.mass/1000,0); setTl(T,'cost',st.cost,0);
    setTl(T,'cap',cap,0,cap>=cs.wet?'good':'bad'); setTl(T,'pay',cs.wet,0);
    $('#bTray').innerHTML=slotStep('tank','Core tanks','segs',r.segs)+slotStep('engine','Engines','engines',r.engines)+slotChips('booster','Side boosters','boosters',[0,2,4],r.boosters)
      +slotChips('upper','Upper stage','upper',['S','M','L'],r.upper)+slotChips('fairing','Fairing','fairing',['S','M','L'],r.fairing)+slotGo('Next','Spacecraft');
    clearTimeout(this.simT); const V_=$('#bVerdict'); V_.className='verdict'; V_.innerHTML='Autopilot check: running…';
    this.simT=setTimeout(()=>{ const pl=currentPlan(); if(pl.ok){ const ok=pl.dvLeft>=dep; V_.className='verdict '+(ok?'good':'bad');
        V_.innerHTML=`Autopilot check: <b>reaches orbit</b> with <b>${fmtN(pl.dvLeft,2)} km/s</b> left. Leaving Earth needs ${fmtN(dep,2)}.`+(fairingFits(S.craft,r.fairing)? '' : ' <b>Spacecraft does not fit this fairing.</b>'); }
      else { V_.className='verdict bad'; V_.innerHTML=`Autopilot check: <b>${SIM_FAIL[pl.status]||'fails'}</b>.`+(st.twr<1? ' Thrust is below weight.':''); } },260);
  },
  onPick(r){ if(r.intersectObject(rocketRig.root,true).length) this.toggleExplode(); },
  toggleExplode(){ const on=!rocketRig.Et; rocketRig.explode(on); if(!pad.flying) zoomBy(on?1.5:1/1.5); $('#bExplode').classList.toggle('on',on); $('#bTele').classList.toggle('dim',on); Sound.snap(); },
  toggleXray(force){ this.xray=force!=null? force : !this.xray; $('#bXray').classList.toggle('on',this.xray); const a=Math.min(cutPlane.constant,7), b=this.xray? 0 : 7;
    tween(.9,k=>cutPlane.constant=lerp(a,b,k),ease.io).then(()=>{ if(!this.xray) cutPlane.constant=1e6; }); },
  update(dt){ rocketRig.update(dt,pad.camera); if(!pad.flying){ const ty=rocketRig.info.height*.47+(rocketRig.E*(S.rocket.segs*1.3+3)); pad.controls.target.y+=(ty-pad.controls.target.y)*Math.min(1,dt*3); } },
  exit(){ pad.controls.enabled=false; rocketRig.explode(false); if(this.xray) this.toggleXray(false); },
};
}

