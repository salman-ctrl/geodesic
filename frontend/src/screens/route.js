import { Screens, go } from '../app/router.js';
import { handTo, roleTag } from '../ui/crew.js';
import { S, Store } from '../state/store.js';
import { $, $$ } from '../ui/dom.js';
import { Sol } from '../three/solarView.js';
import { enterSpace } from './shared/stage.js';
import { space } from '../three/renderer.js';
import { PRIORITY, MISSIONS, REF_ISP } from '../core/data/missions.js';
import { PhysicsDock } from '../ui/physicsDock.js';
import { lerp, clamp } from '../core/physics/math.js';
import { DATE_MIN, DATE_MAX } from '../core/game/rules.js';
import { fmtN, fmtDur } from '../core/format.js';
import { fmtDate } from '../core/physics/time.js';
import { BODIES, PLANET_ORDER } from '../core/data/bodies.js';
import { chainValid, moonRoute, optimizeRoute } from '../core/physics/route.js';
import { toast } from '../ui/toast.js';
import { Sound } from '../ui/sound.js';
import { currentRoute, bestDirect } from '../state/selectors.js';
import { nums, setNum, tl, setTl } from '../ui/telemetry.js';
import { craftStats, propFor } from '../core/physics/rocket.js';

// ====================================================================================================
// MODULE  src/screens/route.js
// layer   screens
// what    SCREEN 6 · route planner
// imports state/store, state/selectors, app/router, three/solarView, screens/shared/stage, ui/*, core/physics/route
// ====================================================================================================


export function initialize(){
Screens.route = {
  strip:{ key:'', vals:null, i:0, n:0, min:Infinity, max:-Infinity, minDay:0 }, recT:0, details:false, drag:false,
  async enter(){
    await handTo('lead'); const moon=S.mission==='moon'; $('#rKick').textContent='Step 4 · Route planner'+roleTag('lead');
    $('#rHint').textContent=moon? 'The Moon is a direct trip. Choose how fast you want to get there.' : 'Click a planet to add a flyby. Click a planet twice for a resonant return. Slide the launch date to find a window.';
    const vr=Sol.viewRadiusFor(S.mission,S.route.flybys);
    await enterSpace(()=>{ Sol.setFrame(moon?'geo':'helio'); Sol.setDate(S.route.day); Sol.clearRoute(); if(space.camera.position.length()<10||Store.session.screen) { space.camera.position.set(0,vr*3.4,vr*2.6); space.controls.target.set(0,0,0); space.camera.lookAt(0,0,0); } });
    if(!this.bound){ this.bound=true;
      const sl=$('#rSlider'); sl.oninput=()=>{ if(S.mission==='moon') S.route.moonTof=+sl.value; else S.route.day=+sl.value; S.route.auto=false; this.syncDate(); this.recompute(false); };
      $('#rPri').innerHTML=Object.keys(PRIORITY).map(k=>`<button class="chip" data-p="${k}">${k[0].toUpperCase()+k.slice(1)}</button>`).join('');
      $$('#rPri .chip').forEach(c=>c.onclick=()=>{ S.route.priority=c.dataset.p; this.syncUI(); this.recompute(true); });
      $('#rDet').onclick=()=>{ this.details=!this.details; $('#rDet').classList.toggle('on',this.details); $('#rDetails').classList.toggle('on',this.details); PhysicsDock.place(); };
      $('#rBest').onclick=()=>{ const s=this.strip; if(S.mission!=='moon'&&isFinite(s.min)){ S.route.auto=false; S.route.day=s.minDay; this.syncUI(); this.recompute(true); } };
      $('#rGo').onclick=()=>go('gonogo');
      const cv=$('#rStrip'), pick=e=>{ if(S.mission==='moon') return; const r=cv.getBoundingClientRect(); S.route.day=Math.round(lerp(DATE_MIN,DATE_MAX,clamp((e.clientX-r.left)/r.width,0,1))); S.route.auto=false; this.syncUI(); this.recompute(false); };
      cv.addEventListener('pointerdown',e=>{ this.drag=true; pick(e); cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove',e=>{ if(this.drag) pick(e); }); cv.addEventListener('pointerup',()=>this.drag=false);
    }
    this.syncUI(); this.recompute(true);
    await Sol.view(vr,1.6); const c=space.controls; c.enabled=true; c.minDistance=vr*.5; c.maxDistance=vr*5; c.maxPolarAngle=1.45; c.minPolarAngle=.05;
  },
  syncDate(){ const moon=S.mission==='moon'; $('#rDate').textContent=moon? fmtN(S.route.moonTof,1)+' days' : fmtDate(S.route.day); if(!moon) Sol.setDate(S.route.day); },
  syncUI(){ const moon=S.mission==='moon', sl=$('#rSlider');
    if(moon){ sl.min=2.3; sl.max=5; sl.step=.1; sl.value=S.route.moonTof; } else { sl.min=DATE_MIN; sl.max=DATE_MAX; sl.step=1; sl.value=S.route.day; }
    $('#rSlLabel').textContent=moon? 'Transfer time' : 'Launch date'; $('#rStrip').style.visibility=$('#rBest').style.visibility=moon? 'hidden':'visible'; $('#rPri').parentElement.style.display=moon? 'none':'';
    $$('#rPri .chip').forEach(c=>c.classList.toggle('on',c.dataset.p===S.route.priority));
    $('#rChain').innerHTML=['earth',...S.route.flybys,S.mission].map((k,i,a)=>{ const fb=i>0&&i<a.length-1; return `<span class="cnode ${fb?'fb':''}" ${fb?`data-i="${i-1}"`:''}>${BODIES[k].name}</span>`; }).join('<i>→</i>');
    $$('#rChain .fb').forEach(n=>n.onclick=()=>{ S.route.flybys.splice(+n.dataset.i,1); if(!chainValid(['earth',...S.route.flybys,S.mission])) S.route.flybys=[]; Store.commit(); this.afterChain(); });
    this.syncDate(); },
  afterChain(){ if(S.route.auto) this.autoJump=true; this.syncUI(); this.recompute(true); const vr=Sol.viewRadiusFor(S.mission,S.route.flybys); if(Math.abs(vr-Sol.viewR)>1&&!space.flying){ Sol.view(vr,1); space.controls.minDistance=vr*.5; space.controls.maxDistance=vr*5; } },
  addFlyby(k){ if(S.mission==='moon') return; const fb=[...S.route.flybys,k], chain=['earth',...fb,S.mission];
    if(k===S.mission){ toast('That is your destination.'); return; }
    if(fb.length>4){ toast('Four flybys is the limit.'); Sound.bad(); return; }
    if(!chainValid(chain)){ toast(fb.length===1&&k==='earth'? 'You launch from Earth. Fly past another planet first.' : 'A repeat visit only works once, between two other planets.'); Sound.bad(); return; }
    S.route.flybys=fb; Store.commit(); Sound.ok(); this.afterChain(); },
  onPick(r){ const hit=r.intersectObjects(PLANET_ORDER.map(k=>Sol.planets[k]),true)[0]; if(hit&&hit.object.userData.key) this.addFlyby(hit.object.userData.key); },
  recompute(animate){ clearTimeout(this.recT); if(animate){ $('#rSub').innerHTML='Solving Lambert arcs…'; }
    this.recT=setTimeout(()=>{ const moon=S.mission==='moon', rt=currentRoute(), base=moon? moonRoute(S.route.day,2.3) : bestDirect(S.mission), m=MISSIONS[S.mission], has=S.route.flybys.length>0;
      Sol.setRoute(rt,animate); Store.commit(); Store.set('route',rt); const big=$('#rBig'), wrap=$('#rBigWrap');
      if(!rt){ nums.delete(big); big._v=null; big.textContent='—'; wrap.className='bignum'; $('#rCap').textContent='No ballistic path on this date'; Store.session.routeCaption=$('#rCap').textContent; $('#rSub').innerHTML='Slide the launch date, or change the chain.'; $('#rDetails').innerHTML=''; return; }
      const dry=craftStats(S.craft,S.mission).dry, p=propFor(rt.dvTotal,REF_ISP,dry), p0=propFor(base.dvTotal,REF_ISP,dry), pct=(1-p/p0)*100; this.pct=pct; this.base=base;
      setNum(big,Math.abs(pct)<.5? 0 : Math.abs(pct),0); wrap.className='bignum '+(pct<-.5? 'neg' : pct>.5? 'pos':'');
      $('#rCap').textContent=moon? (pct>.5? 'Propellant saved vs the fastest route' : 'Fastest route · nothing saved') : pct<-.5? (has? 'More propellant than the direct route' : 'More propellant than the best launch window') : has? 'Propellant saved vs direct route' : 'Direct route · best launch window'; Store.session.routeCaption=$('#rCap').textContent;
      const late=rt.years>m.maxYears;
      const powered=rt.flybys.filter(f=>f.dv>.1);
      $('#rSub').innerHTML=`Flight time <b class="${late?'bad':''}">${fmtDur(rt.days)}</b>${late? ' <span class="bad">(limit '+fmtDur(m.maxYears*365.25)+')</span>':''} · burns after orbit <b>${fmtN(rt.dvTotal,2)} km/s</b>`+
        (powered.length? `<div style="margin-top:6px;color:#f0a36b;font-size:11px">Powered flyby required: ${powered.map(f=>BODIES[f.body].name+' '+fmtN(f.dv,2)+' km/s').join(' · ')}. Gravity alone cannot make this turn.</div>` : '');
      let d=tl('dep','Departure ΔV','km/s')+(moon? '' : tl('c3','Launch C3','km²/s²'))+(has? tl('fly','Flyby burns','km/s'):'')+tl('cap','Capture ΔV','km/s')+tl('tot','Total','km/s')+tl('dir',moon?'Fastest route':'Best direct','km/s')+tl('arr','Arrival','');
      rt.flybys.forEach((f,i)=>{ d+=tl('f'+i,BODIES[f.body].name+' pass',''); });
      const D=$('#rDetails'); D.innerHTML=d; setTl(D,'dep',rt.dvDep,2); if(!moon) setTl(D,'c3',rt.c3,1); if(has) setTl(D,'fly',rt.dvFly,2,rt.dvFly>.05?'bad':'good'); setTl(D,'cap',rt.dvCap,2); setTl(D,'tot',rt.dvTotal,2); setTl(D,'dir',base.dvTotal,2);
      setTl(D,'arr',moon? '+'+fmtN(rt.days,1)+' d' : fmtDate(rt.t0+rt.days)); rt.flybys.forEach((f,i)=>setTl(D,'f'+i,`${fmtN(f.rp/BODIES[f.body].R,2)} R · ${f.gain>=0?'+':''}${fmtN(f.gain,1)} km/s`,0,f.free?'good':'bad'));
      const key=[S.mission,S.route.flybys.join('>'),S.route.priority].join('|'), s=this.strip; if(!moon&&s.key!==key){ const nf=S.route.flybys.length+1; s.key=key; s.n=nf<=2? 320 : nf===3? 200 : 160; s.vals=new Float32Array(s.n).fill(NaN); s.i=0; s.min=Infinity; s.max=-Infinity; }
      this.drawStrip();
    }, animate? 40 : 70); },
  // Launch-window strip: total cost (ΔV + time weight) for every launch date, filled in a few samples per frame.
  stepStrip(){ const s=this.strip; if(S.mission==='moon'||!s.vals||s.i>=s.n) return; const t0=performance.now(), chain=['earth',...S.route.flybys,S.mission], nf=chain.length-1, N=[0,12,8,6,5,5][nf]||5, lam=PRIORITY[S.route.priority], cap=MISSIONS[S.mission].maxYears;
    while(s.i<s.n&&performance.now()-t0<7){ const d=lerp(DATE_MIN,DATE_MAX,s.i/(s.n-1)), r=optimizeRoute(chain,d,lam,N,false,cap); if(r){ s.vals[s.i]=r.cost; if(r.cost<s.min){ s.min=r.cost; s.minDay=Math.round(d); } s.max=Math.max(s.max,r.cost); } s.i++; }
    if(s.i>=s.n&&this.autoJump){ this.autoJump=false; if(isFinite(s.min)&&S.route.auto&&S.route.day!==s.minDay){ S.route.day=s.minDay; this.syncUI(); this.recompute(true); toast('Launch date moved to the best window for this chain.'); } }
    this.drawStrip(); },
  drawStrip(){ const cv=$('#rStrip'), s=this.strip, w=cv.clientWidth||900; if(cv.width!==w) cv.width=w; const g=cv.getContext('2d'), H=cv.height; g.clearRect(0,0,w,H); if(S.mission==='moon'||!s.vals) return;
    const span=Math.max(.5,Math.min(s.max-s.min,6)), bw=w/s.n;
    for(let i=0;i<s.i;i++){ const v=s.vals[i]; if(!(v===v)) continue; const k=clamp(1-(v-s.min)/span,0,1), hh=2+k*k*(H-4); g.fillStyle=k>.85? '#e2772e' : `rgba(127,214,205,${.25+k*.6})`; g.fillRect(i*bw,H-hh,Math.max(1,bw-.6),hh); }
    if(s.i<s.n){ g.fillStyle='rgba(251,246,236,.5)'; g.fillRect(s.i*bw,H-2,w,1); }
    const x=(S.route.day-DATE_MIN)/(DATE_MAX-DATE_MIN)*w; g.fillStyle='#fbf6ec'; g.fillRect(x-.5,0,1.5,H); },
  update(dt){ Sol.update(dt); this.stepStrip(); },
  exit(){ this.autoJump=false; space.controls.enabled=false; $('#rDetails').classList.remove('on'); $('#rDet').classList.remove('on'); this.details=false; },
};
Sol.onPlanetClick = k=>{ if(Store.session.screen==='route') Screens.route.addFlyby(k); };
}

