import { Screens, go } from '../app/router.js';
import { S, Store } from '../state/store.js';
import { roleOwner, currentRoute } from '../state/selectors.js';
import { handTo, roleTag } from '../ui/crew.js';
import { $ } from '../ui/dom.js';
import { tl, setTl } from '../ui/telemetry.js';
import { bindTray, slotChips, slotStep, slotGo } from '../ui/tray.js';
import { rocketRig, craftRig, rebuildCraft, platform, craftStand } from '../three/worlds/padWorld.js';
import { tween, ease } from '../ui/tween.js';
import { lerp, clamp } from '../core/physics/math.js';
import { COL } from '../three/materials.js';
import { Stage, pad, V3 } from '../three/renderer.js';
import { enterStudio, zoomBy } from './shared/stage.js';
import { CRAFT } from '../core/data/parts.js';
import { toast } from '../ui/toast.js';
import { Sound } from '../ui/sound.js';
import { MISSIONS } from '../core/data/missions.js';
import { craftStats } from '../core/physics/rocket.js';
import { fmtRate, fmtN } from '../core/format.js';

// ====================================================================================================
// MODULE  src/screens/craft.js
// layer   screens
// what    SCREEN 5 · spacecraft builder
// imports state/store, state/selectors, app/router, three/worlds/padWorld, screens/shared/stage, ui/*, core/physics/rocket
// ====================================================================================================


export function initialize(){
Screens.craft = {
  phase:'all',
  async enter(o){
    const split=S.crew>1&&roleOwner('power')!==roleOwner('sci'); this.phase=split? (o.phase||'power') : 'all';
    await handTo(this.phase==='sci'? 'sci' : 'power');
    $('#cKick').textContent='Step 3 · Spacecraft builder'+roleTag(this.phase==='sci'? 'sci' : 'power');
    $('#cHint').textContent=this.phase==='sci'? 'Fill the instrument slots. The science goal needs the right tool.' : 'Power for where you are going, a dish to phone home, instruments for the science.';
    if(!$('#cTele').children.length){ $('#cTele').innerHTML=tl('pw','Power at target','W')+tl('pn','Power needed','W')+tl('rate','Data rate home','')+tl('dv','ΔV on board','km/s')+tl('mass','Mass','kg')+tl('cost','Cost','$M')+'<p class="verdict" id="cVerdict"></p>';
      bindTray($('#cTray'),(k,v)=>this.act(k,v)); $('#cExplode').onclick=()=>this.toggleExplode(); $('#cBack').onclick=()=>go('builder'); }
    rocketRig.explode(false); tween(.7,k=>rocketRig.root.position.x=lerp(rocketRig.root.position.x,-70,k),ease.in).then(()=>{ if(Store.session.screen==='craft') rocketRig.setVisible(false); });
    craftRig.setVisible(true); craftRig.setInk(COL.ink); craftRig.explode(false); $('#cExplode').classList.remove('on'); $('#cTele').classList.remove('dim'); rebuildCraft(S,Stage.world!==pad); this.refresh();
    platform.visible=false; craftStand.visible=true;
    await enterStudio(new V3(7,8.8,this.dist()),new V3(0,6,0),1.3,-.07,-.02);
    pad.controls.minDistance=5; pad.controls.maxDistance=60;
  },
  dist(){ const c=S.craft, s=CRAFT.bus[c.bus].size; return 13+s*2+(c.power==='solar'? c.powerN*s*1.5 : 2)+(c.instruments.includes('radar')? 2:0); },
  act(k,v){ const c=S.craft, B=CRAFT.bus;
    if(k==='go'){ if(this.phase==='power') return go('craft',{ phase:'sci' }); return go('route'); }
    if(k==='bus'){ c.bus=v; c.instruments=c.instruments.slice(0,B[v].slots); } if(k==='tank') c.tank=clamp(c.tank+ +v*.25,.25,1);
    if(k==='power') c.power=v; if(k==='powerN') c.powerN=clamp(c.powerN+ +v,1,3); if(k==='antenna') c.antenna=v;
    if(k==='inst'){ const i=c.instruments.indexOf(v); if(i>=0) c.instruments.splice(i,1); else if(c.instruments.length<B[c.bus].slots) c.instruments.push(v); else { toast('Every instrument slot is full. Remove one or pick a bigger bus.'); Sound.bad(); return; } }
    Store.commit(); rebuildCraft(S); this.refresh(); },
  refresh(){
    const c=S.craft, m=MISSIONS[S.mission], st=craftStats(c,S.mission), T=$('#cTele'), rt=currentRoute(), needDv=rt? rt.dvFly+rt.dvCap : NaN;
    setTl(T,'pw',st.power,0,st.power>=st.need?'good':'bad'); setTl(T,'pn',st.need,0); setTl(T,'rate',fmtRate(st.rate),0,st.rate>=m.minRate?'good':'bad');
    setTl(T,'dv',st.dv,2,st.dv>=needDv?'good':'bad'); setTl(T,'mass',st.wet,0); setTl(T,'cost',st.cost,0);
    const miss=st.missing.map(k=>CRAFT.inst[k].name), V_=$('#cVerdict'); V_.className='verdict '+(miss.length?'bad':'good');
    V_.innerHTML=`Science goal: ${m.goal.toLowerCase()}. `+(miss.length? `<b>Still needs: ${miss.join(', ')}.</b>` : '<b>Instruments on board.</b>')+` Route burns need ${fmtN(needDv,2)} km/s. Home needs ${fmtRate(m.minRate)}.`;
    const P=this.phase, slots=CRAFT.bus[c.bus].slots, probeName=m.landing? 'Lander' : 'Probe';
    const a=slotChips('bus','Bus size','bus',['S','M','L'],c.bus)+slotStep('prop','Propellant','tank',Math.round(c.tank*100)+'<small>%</small>')
      +slotChips('power','Power','power',[['solar','Solar'],['rtg','RTG']],c.power)+slotStep('power',c.power==='rtg'? 'RTG units':'Wing pairs','powerN',c.powerN)+slotChips('antenna','Antenna','antenna',['S','M','L'],c.antenna);
    const b=slotChips('inst',`Instruments ${c.instruments.length}/${slots}`,'inst',[['cam','Camera'],['spec','Spectro'],['mag','Magneto'],['radar','Radar'],['probe',probeName]],c.instruments);
    $('#cTray').innerHTML=(P==='sci'? b : P==='power'? a : a+b)+slotGo('Next',P==='power'? 'Science' : 'Route');
  },
  onPick(r){ if(r.intersectObject(craftRig.root,true).length) this.toggleExplode(); },
  toggleExplode(){ const on=!craftRig.Et; craftRig.explode(on); if(!pad.flying) zoomBy(on?1.3:1/1.3); $('#cExplode').classList.toggle('on',on); $('#cTele').classList.toggle('dim',on); Sound.snap(); },
  update(dt){ craftRig.update(dt,pad.camera); rocketRig.update(dt,pad.camera); craftRig.root.rotation.y+=dt*(craftRig.Et? 0 : .12); craftRig.root.position.y=6+Math.sin(performance.now()*.0012)*.12; },
  exit(){ pad.controls.enabled=false; craftRig.explode(false); },
};
}

