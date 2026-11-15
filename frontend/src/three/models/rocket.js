import { TAU } from '../../core/constants.js';
import { ROCKET, CRAFT } from '../../core/data/parts.js';
import { V3 } from '../renderer.js';
import { M, cyl, COL } from '../materials.js';
import { craftSpec } from './spacecraft.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/models/rocket.js
// layer   three · no game logic
// what    rocket parts for the assembly rig
// imports three, materials, models/spacecraft, core/data/parts
// ====================================================================================================
// ---- rocket: returns { parts, height, stageY } ----


function engineLayout(n){ if(n===1) return { pos:[[0,0]], s:1.55 }; const pos=[], ring=n<=4? n : n-1, rr=n<=4? .95 : 1.22; if(n>4) pos.push([0,0]);
  for(let i=0;i<ring;i++){ const a=i/ring*TAU+Math.PI/ring; pos.push([Math.cos(a)*rr,Math.sin(a)*rr]); } return { pos, s:n<=2?1.25:n<=4?1.05:n<=7?.82:.72 }; }
function rocketSpec(d, craft, missionKey){
  const R=ROCKET.coreR, SG=ROCKET.seg, U=ROCKET.upper[d.upper], F=ROCKET.fairing[d.fairing], Bo=ROCKET.boost, parts=[], gap=2.6;
  const P=(id,g,home,ex,spawn,label,extra={})=>parts.push({ id, g, home:new V3(...home), ex:new V3(...ex), spawn:new V3(...spawn), label, r:R, ...extra });
  // engines + thrust structure
  { const g=new THREE.Group(), L=engineLayout(d.engines);
    g.add(M(cyl(R,R,1.0,40,true),COL.dark,{ hull:true, p:[0,1.7,0] }), M(cyl(R-.08,R-.08,.12,40),COL.dark,{ ol:0, p:[0,1.25,0] }));
    for(const [x,z] of L.pos){ g.add(M(cyl(.16*L.s,.5*L.s,1.25,20),COL.dark,{ p:[x,.62,z], ol:.05 }), M(cyl(.3*L.s,.22*L.s,.55,14),COL.metal,{ p:[x,1.5,z], ol:.04 })); }
    for(let i=0;i<4;i++){ const a=i*Math.PI/2+Math.PI/4; g.add(M(new THREE.BoxGeometry(1.7,2.6,.14),COL.band,{ p:[Math.cos(a)*(R+.6),1.9,Math.sin(a)*(R+.6)], r:[0,-a,0], ol:.05 })); }
    P('eng'+d.engines,g,[0,0,0],[0,0,0],[0,-9,0],{ name:`${d.engines} × K-1 engine`, fn:'Burns kerosene with liquid oxygen. More engines lift more, and empty the tanks faster.', mass:d.engines*ROCKET.eng.mass+ROCKET.thrustStruct },{ anchorY:.9 }); }
  // core tank segments (kerosene below, liquid oxygen above)
  let y=2.2; const nFuel=Math.max(1,Math.round(d.segs*.36)), mid=Math.floor(d.segs/2);
  for(let i=0;i<d.segs;i++){ const g=new THREE.Group(), fuel=i<nFuel;
    g.add(M(cyl(R,R,SG.len,48,true),COL.hull,{ hull:true, p:[0,SG.len/2,0] }), M(cyl(R+.035,R+.035,.16,48,true),i===d.segs-1? COL.flame : COL.dark,{ hull:true, ol:0, p:[0,SG.len-.12,0] }));
    if(i===mid) g.add(M(cyl(R+.03,R+.03,1.1,48,true),COL.band,{ hull:true, ol:0, p:[0,SG.len*.5,0] }));
    const tr=fuel? R-.5 : R-.2; g.add(M(new THREE.CapsuleGeometry(tr,SG.len-.4-2*tr,8,28),fuel? COL.rp1 : COL.lox,{ p:[0,SG.len/2,0], ol:.04 }));
    if(fuel) g.add(M(cyl(.15,.15,SG.len,10),COL.lox,{ p:[-(R-.24),SG.len/2,0], ol:.03 }));
    P('seg'+i,g,[0,y+i*SG.len,0],[0,i*gap+3.2,0],[16,0,0], i===mid?{ name:`Core tank × ${d.segs}`, fn:'Liquid oxygen above, kerosene below. Longer tanks give more ΔV, and more weight to lift.', mass:d.segs*SG.dry, prop:d.segs*SG.prop }:null,{ anchorY:SG.len/2 }); }
  y+=d.segs*SG.len; const topEx=d.segs*gap+2.2;
  { const g=new THREE.Group(); g.add(M(cyl(R,R,2,48,true),COL.dark,{ hull:true, p:[0,1,0] }));
    P('inter',g,[0,y,0],[0,topEx+1.5,0],[-16,0,0],{ name:'Interstage', fn:'A hollow ring that joins the stages and shelters the upper engine until separation.', mass:ROCKET.interstage },{ anchorY:1 }); }
  y+=2;
  { const g=new THREE.Group(), L=U.len, c2=U.fuel==='LH2'? COL.lh2 : COL.rp1, tr=R-.3;
    g.add(M(cyl(R,R,L,48,true),COL.hull,{ hull:true, p:[0,L/2,0] }), M(cyl(R+.035,R+.035,.5,48,true),COL.flame,{ hull:true, ol:0, p:[0,L-.6,0] }), M(cyl(R-.05,R-.05,.1,40),COL.dark,{ ol:0, p:[0,.05,0] }));
    const l1=Math.max(.01,L*.36-2*tr*.6), l2=Math.max(.01,L*.56-2*tr*.6);
    g.add(M(new THREE.CapsuleGeometry(tr,l1,8,28),COL.lox,{ p:[0,L*.2,0], s:[1,.6,1], ol:.04 }), M(new THREE.CapsuleGeometry(tr,l2,8,28),c2,{ p:[0,L*.68,0], s:[1,.6,1], ol:.04 }));
    g.add(M(cyl(.2,.78,1.5,24),COL.dark,{ p:[0,-.8,0], ol:.05 }), M(cyl(.34,.26,.4,14),COL.metal,{ p:[0,-.05,0], ol:.04 }));
    P('upper'+d.upper,g,[0,y,0],[0,topEx+4.6,0],[-18,0,0],{ name:`${U.name} upper stage`, fn:U.fuel==='LH2'? 'Hydrogen engine: gentle thrust, very high Isp. It finishes the climb and does the departure burn.' : 'Finishes the climb to orbit, then fires again to leave Earth.', mass:U.dry, prop:U.prop },{ anchorY:L/2 }); }
  y+=U.len; const stageY=y;
  { const g=new THREE.Group(); g.add(M(cyl(.75,R-.2,.8,28),COL.dark,{ p:[0,.4,0], ol:.05 }));
    const cs=craftSpec(craft,missionKey,true), cg=new THREE.Group(), f=Math.min(1,(F.r-.4)/Math.max(cs.size*.72,CRAFT.ant[craft.antenna].d/2));
    for(const p of cs.parts){ p.g.position.copy(p.home); cg.add(p.g); } cg.scale.setScalar(f); cg.position.y=.8+(cs.size*.55+cs.size*.45)*f; g.add(cg);
    P('payload',g,[0,y,0],[0,topEx+8.2,0],[0,14,0],{ name:'Spacecraft', fn:'Your payload. Everything underneath exists to throw this.', mass:cs.stats.wet },{ anchorY:1.6, r:1.3 }); }
  { const pts=[], n=18, L=F.len, rr=F.r; pts.push(new THREE.Vector2(R,0)); pts.push(new THREE.Vector2(rr,1.1)); pts.push(new THREE.Vector2(rr,L*.5));
    for(let i=1;i<=n;i++){ const t=i/n; pts.push(new THREE.Vector2(rr*Math.cos(t*Math.PI/2)**.72+.02*(1-t), L*.5+L*.5*Math.sin(t*Math.PI/2))); }
    for(const sd of [1,-1]){ const g=new THREE.Group(); g.add(M(new THREE.LatheGeometry(pts,26,sd>0?0:Math.PI,Math.PI),COL.hull,{ hull:true }));
      const band=[new THREE.Vector2(rr+.03,L*.38),new THREE.Vector2(rr+.03,L*.46)]; g.add(M(new THREE.LatheGeometry(band,26,sd>0?0:Math.PI,Math.PI),sd>0? COL.flame : COL.band,{ hull:true, ol:0 }));
      P('fair'+sd+d.fairing,g,[0,y,0],[sd*5.5,topEx+9,0],[sd*18,4,0], sd>0?{ name:'Payload fairing', fn:'Shields the spacecraft from the air on the way up. Dropped above 100 km.', mass:F.mass, side:1 }:null,{ anchorY:L*.45, r:rr }); } }
  const height=y+F.len;
  // side boosters
  const angs=d.boosters===2? [0,Math.PI] : d.boosters===4? [0,Math.PI,Math.PI/2,-Math.PI/2] : [];
  angs.forEach((a,k)=>{ const g=new THREE.Group(), rb=1.0, L=Math.min(14,d.segs*SG.len+1), dx=Math.cos(a), dz=Math.sin(a), rr=R+rb+.14;
    g.add(M(cyl(rb,rb,L,32,true),COL.hull,{ hull:true, p:[0,1.2+L/2,0] }), M(new THREE.ConeGeometry(rb,2.6,32),COL.flame,{ hull:true, p:[0,1.2+L+1.3,0] }),
          M(cyl(.3,.8,1.3,20),COL.dark,{ p:[0,.62,0], ol:.05 }), M(cyl(rb-.2,rb-.2,L-.5,20),COL.grain,{ p:[0,1.2+L/2,0], ol:.03 }), M(cyl(rb+.03,rb+.03,.3,32,true),COL.dark,{ hull:true, ol:0, p:[0,1.2+L*.75,0] }));
    P('boost'+k,g,[dx*rr,0,dz*rr],[dx*6.5,1.5,dz*6.5],[dx*20,0,dz*20], k===0?{ name:`Side booster × ${d.boosters}`, fn:'Solid rocket: huge thrust for about 100 seconds, then dead weight. Drop it.', mass:d.boosters*Bo.dry, prop:d.boosters*Bo.prop, side:1 }:null,{ anchorY:L*.55, r:rb }); });
  return { parts, height, stageY };
}
export function initialize(){
}
export { engineLayout, rocketSpec };
