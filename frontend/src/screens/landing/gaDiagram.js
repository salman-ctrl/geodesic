import { $ } from '../../ui/dom.js';
import { D2R, TAU } from '../../core/constants.js';
import { fmtN } from '../../core/format.js';
import { landingEl } from '../landing.js';
import { lerp, clamp } from '../../core/physics/math.js';
import { ease } from '../../ui/tween.js';

// ====================================================================================================
// MODULE  src/screens/landing/gaDiagram.js
// layer   screens · landing
// what    gravity-assist diagram (2-D canvas)
// imports core/format, ui/dom, ui/tween
// ====================================================================================================
// b. gravity-assist diagram: a real hyperbola in the planet frame, drawn in the Sun frame


export function initialize(){
(function gaDiagram(){
  const cv=$('#gaDiagram'), g=cv.getContext('2d'), W=cv.width, H=cv.height;
  const U=13.1, vinf=10.5, e=1.55, b=Math.sqrt(e*e-1), K=U/vinf, Fmax=2.45, sc=27;      // lengths in units of a; speeds in units of vinf
  const tOf=F=>e*Math.sinh(F)-F, T=tOf(Fmax); let rot=0;
  const rel=F=>{ const x=e-Math.cosh(F), y=b*Math.sinh(F), c=Math.cos(rot), s=Math.sin(rot); return [x*c-y*s, x*s+y*c]; };
  const relV=F=>{ const d=1e-3, p=rel(F+d), q=rel(F-d), dt=tOf(F+d)-tOf(F-d); return [(p[0]-q[0])/dt,(p[1]-q[1])/dt]; };
  { const vo=relV(Fmax); rot=-28*D2R-Math.atan2(vo[1],vo[0]); }                         // leave 28° off the planet's direction of travel
  const vin=relV(-Fmax), vout=relV(Fmax);
  $('#gaIn').textContent=fmtN(Math.hypot(vin[0]*vinf+U,vin[1]*vinf),1); $('#gaOut').textContent=fmtN(Math.hypot(vout[0]*vinf+U,vout[1]*vinf),1);
  let t0=performance.now(), vis=false; new IntersectionObserver(en=>{ vis=en[0].isIntersecting; if(vis) requestAnimationFrame(draw); }).observe(cv);
  function solveF(t){ let F=Math.asinh(t/e); for(let i=0;i<20;i++) F-=(e*Math.sinh(F)-F-t)/(e*Math.cosh(F)-1); return F; }
  const X=(t,p)=>W*.5+(K*t+p[0])*sc, Y=p=>H*.5-p[1]*sc;
  function draw(now){ if(!vis||landingEl.classList.contains('gone')) return; requestAnimationFrame(draw);
    const cyc=((now-t0)/1000%9)/9, t=lerp(-T,T,ease.io(Math.min(1,cyc*1.2))), px=W*.5+K*t*sc, py=H*.5;
    g.fillStyle='#141b3a'; g.fillRect(0,0,W,H);
    g.strokeStyle='rgba(251,246,236,.16)'; g.lineWidth=1.5; g.setLineDash([3,8]); g.beginPath(); g.moveTo(0,py); g.lineTo(W,py); g.stroke(); g.setLineDash([]);
    g.lineWidth=3.5; g.lineJoin='round'; g.strokeStyle='#e2772e'; g.beginPath();
    for(let i=0;i<=140;i++){ const tt=lerp(-T,t,i/140), p=rel(solveF(tt)); i? g.lineTo(X(tt,p),Y(p)) : g.moveTo(X(tt,p),Y(p)); } g.stroke();
    const F=solveF(t), p=rel(F), cx=X(t,p), cy=Y(p);
    g.fillStyle='#d9a066'; g.strokeStyle='#2b2622'; g.lineWidth=2.5; g.beginPath(); g.arc(px,py,11,0,TAU); g.fill(); g.stroke();
    const v=relV(F), vx=v[0]*vinf+U, vy=v[1]*vinf, sp=Math.hypot(vx,vy);
    const arrow=(x,y,dx,dy,col)=>{ g.strokeStyle=g.fillStyle=col; g.lineWidth=2.5; g.beginPath(); g.moveTo(x,y); g.lineTo(x+dx,y+dy); g.stroke(); const an=Math.atan2(dy,dx); g.beginPath(); g.moveTo(x+dx,y+dy); g.lineTo(x+dx-11*Math.cos(an-.4),y+dy-11*Math.sin(an-.4)); g.lineTo(x+dx-11*Math.cos(an+.4),y+dy-11*Math.sin(an+.4)); g.fill(); };
    arrow(cx,cy,vx*3.4,-vy*3.4,'#fbf6ec'); arrow(px,py+30,U*3.4,0,'#6fb7b1');
    g.fillStyle='#fbf6ec'; g.strokeStyle='#2b2622'; g.beginPath(); g.arc(cx,cy,6.5,0,TAU); g.fill(); g.stroke();
    g.font='400 19px "JetBrains Mono"'; g.fillStyle='#fbf6ec'; g.fillText(fmtN(sp,1)+' km/s',clamp(cx+16,10,W-130),clamp(cy-16,60,H-20));
    g.font='300 14px "JetBrains Mono"'; g.fillStyle='#6fb7b1'; g.fillText('planet '+fmtN(U,1)+' km/s',clamp(px-60,10,W-170),py+58);
    g.fillStyle='rgba(251,246,236,.5)'; g.font='300 13px "JetBrains Mono"'; g.fillText('SUN FRAME · SPEED OF THE SPACECRAFT',28,40);
  }
})();
}

