import { Screens, go } from '../app/router.js';
import { flight, craftDvLeft } from '../game/flight.js';
import { useWorld, Stage } from '../three/renderer.js';
import { setTheme } from '../ui/theme.js';
import { $ } from '../ui/dom.js';
import { MISSIONS, REF_ISP } from '../core/data/missions.js';
import { missionName, scienceScore, debrief } from '../core/game/scoring.js';
import { rocketStats, propFor, craftStats } from '../core/physics/rocket.js';
import { fmtN, fmtMass, fmtDur } from '../core/format.js';
import { moonRoute } from '../core/physics/route.js';
import { bestDirect } from '../state/selectors.js';
import { fmtDate } from '../core/physics/time.js';
import { patchSVG } from '../ui/patch.js';
import { S } from '../state/store.js';
import { tl, setTl } from '../ui/telemetry.js';
import { renderPhysicsReport } from '../ui/physicsReport.js';
import { openValidation } from '../ui/validationPanel.js';
import { toast } from '../ui/toast.js';
import { Sound } from '../ui/sound.js';

// ====================================================================================================
// MODULE  src/screens/report.js
// layer   screens
// what    SCREEN 12 · mission report
// imports state/store, state/selectors, game/flight, app/router, core/game/scoring, ui/*
// ====================================================================================================


export function initialize(){
Screens.report = {
  enter(){
    const F=flight(); useWorld(Stage.world); setTheme('paper'); Stage.renderOn=false; if(!F){ $('#repScroll').innerHTML='<div class="rep"><div></div><div><h1>No flight yet</h1><p class="why">Fly a mission first.</p><button class="btn" id="rpBuild">Build a rocket</button></div></div>'; $('#rpBuild').onclick=()=>go('builder'); return; }
    const m=MISSIONS[F.mission], o=F.outcome, rt=F.rt, name=missionName(F), sc=scienceScore(F), db=debrief(F), rs=rocketStats(F.rocket,F.dry+F.prop0), n=fmtN;
    const base=rt? (F.mission==='moon'? moonRoute(rt.t0,2.3) : bestDirect(F.mission)) : null, p=rt? propFor(rt.dvTotal,REF_ISP,F.dry) : 0, p0=base? propFor(base.dvTotal,REF_ISP,F.dry) : 0, pct=p0? (1-p/p0)*100 : 0, gain=F.gains.reduce((a,g)=>a+g.gain,0), nf=rt? rt.flybys.length : 0;
    const launched=F.launch&&F.launch.status!=='nolift', usedKg=F.prop0-F.prop;
    const ev=(F.launch? F.launch.events.map(e=>`<div class="tl tlt"><span class="k">T+ ${String(Math.floor(e.t/60)).padStart(2,'0')}:${String(Math.floor(e.t%60)).padStart(2,'0')}</span><span class="n">${e.e}</span><span class="d"></span><span class="v">${e.note||''}</span></div>`) : [])
      .concat(F.burns.map(b=>`<div class="tl tlt"><span class="k">${rt&&rt.frame==='helio'? fmtDate(b.t) : 'Day '+n(b.t-(rt? rt.t0:0),1)}</span><span class="n">${b.label}</span><span class="d"></span><span class="v">${b.dv? n(b.dv,b.dv<.1?3:2)+' km/s'+(b.free&&!b.gain? ' · rocket':'') : 'free'}</span></div>`)).join('');
    $('#repScroll').innerHTML=`<div class="rep">
      <div>${patchSVG(F,name,S.crew)}<div class="acts"><button class="btn" id="rpRetry">Fly it again</button><button class="btn teal" id="rpDesign">Change the design</button><button class="btn ink" id="rpShare">Share challenge link</button><button class="link" id="rpVal" style="align-self:center;margin-top:6px">Validation and sources</button></div></div>
      <div><div class="kicker">${o.ok? 'Mission complete' : 'Mission ended'} · ${name} · ${m.name}</div><h1 class="${o.ok?'':'fail'}">${o.title}</h1><p class="why">${o.why}</p>
        <h3>Propellant</h3><div class="cols2"><div>${tl('rk','Rocket burned','t')+tl('sc','Spacecraft used','kg')+tl('left','ΔV left on board','km/s')}</div><div>${tl('saved',nf? 'Saved by slingshots' : F.mission==='moon'? 'Saved vs fastest route' : 'Vs best direct window','%')+tl('gain','Net speed change at flybys','km/s')+tl('dv','Burns after orbit','km/s')}</div></div>
        <h3>Science, cost, time</h3><div class="cols2"><div>${tl('sci','Science return','pts')+tl('goal','Goal','')}</div><div>${tl('cost','Cost','$M')+tl('time','Flight time','')}</div></div>
        <h3>Burn timeline</h3>${ev||'<p class="why" style="font-size:14px">No burns.</p>'}
        ${renderPhysicsReport(F)}
        <div class="cols2"><div><h3>What went right</h3><ul>${db.good.map(x=>`<li>${x}</li>`).join('')||'<li>Nothing yet. That is what the retry button is for.</li>'}</ul></div><div><h3>What to fix</h3><ul class="bad">${db.bad.map(x=>`<li>${x}</li>`).join('')||'<li>Nothing. Try a harder destination.</li>'}</ul></div></div>
      </div></div>`;
    const R=$('#repScroll'); R.scrollTop=0; setTl(R,'rk',launched? rs.propTotal/1000 : 0,0); setTl(R,'sc',`${n(usedKg,0)} of ${n(F.prop0,0)}`); setTl(R,'left',craftDvLeft(),2);
    setTl(R,'saved',rt? (Math.abs(pct)<.5? '0' : (pct>0?'':'−')+n(Math.abs(pct),0))+(nf&&pct>0? ` · ${fmtMass(p0-p)}` : '') : '—',0,pct>.5?'good':pct<-.5?'bad':''); setTl(R,'gain',nf? (gain>=0?'+':'')+n(gain,1) : 'no flybys'); setTl(R,'dv',rt? rt.dvTotal : NaN,2);
    setTl(R,'sci',`${sc.got} of ${sc.max}`,0,o.ok&&sc.got>=sc.max*.8?'good':''); setTl(R,'goal',o.ok? (craftStats(F.craft,F.mission).missing.length? 'instrument missing' : 'met') : 'not reached',0,o.ok?'good':'bad');
    setTl(R,'cost',`${n(F.cost.total,0)} of ${m.budget}`,0,F.cost.total<=m.budget?'good':'bad'); setTl(R,'time',rt? fmtDur(rt.days) : '—');
    $('#rpRetry').onclick=()=>go('gonogo'); $('#rpDesign').onclick=()=>go('builder'); $('#rpVal').onclick=openValidation;
    $('#rpShare').onclick=()=>{ const link=location.origin+location.pathname+'#c='+btoa(JSON.stringify({ m:S.mission, r:S.rocket, c:S.craft, f:S.route.flybys, d:Math.round(S.route.day), p:S.route.priority }));
      (navigator.clipboard? navigator.clipboard.writeText(link) : Promise.reject()).then(()=>toast('Challenge link copied. Mockup: nothing is uploaded, the design is in the link.'),()=>toast('Challenge link: '+link.slice(0,60)+'…')); };
    o.ok? Sound.ok() : Sound.bad();
  },
  exit(){ Stage.renderOn=true; },
};
}

