import { D2R } from '../../core/constants.js';
import { CRAFT } from '../../core/data/parts.js';
import { craftStats } from '../../core/physics/rocket.js';
import { V3 } from '../renderer.js';
import { M, cyl, COL } from '../materials.js';
import { MISSIONS } from '../../core/data/missions.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/models/spacecraft.js
// layer   three · no game logic
// what    spacecraft parts for the assembly rig
// imports three, materials, core/data/*, core/physics/rocket
// ====================================================================================================
// ---- spacecraft: returns { parts:[{ id, g, home, ex, spawn, label, anchorY, r }] } ----

let INST_AZ;
function craftSpec(c, missionKey, stowed=false){
  const B=CRAFT.bus[c.bus], A=CRAFT.ant[c.antenna], s=B.size, hh=s*1.1, rB=s*.62, parts=[], o=.022, st=craftStats(c,missionKey);
  const P=(id,g,home,ex,label,extra={})=>parts.push({ id, g, home:new V3(...home), ex:new V3(...ex), spawn:new V3(ex[0]*2.2,ex[1]*2.2+(ex[0]||ex[2]?0:3),ex[2]*2.2), label, r:rB, ...extra });
  { const g=new THREE.Group(); g.add(M(cyl(rB,rB,hh,8),COL.gold,{ ol:o, r:[0,Math.PI/8,0] }));
    g.add(M(cyl(rB*1.04,rB*1.04,hh*.12,8),COL.dark,{ ol:o, p:[0,hh*.5,0], r:[0,Math.PI/8,0] }), M(cyl(rB*1.04,rB*1.04,hh*.1,8),COL.dark,{ ol:o, p:[0,-hh*.5,0], r:[0,Math.PI/8,0] }));
    g.add(M(new THREE.SphereGeometry(rB*.62,20,14),COL.metal,{ ol:0 }));                                          // propellant tank, seen in exploded view
    P('bus'+c.bus,g,[0,0,0],[0,0,0],{ name:'Bus '+c.bus, fn:'The body: computer, batteries, heaters and the propellant tank.', mass:B.dry, prop:B.tank*c.tank, side:-1 },{ anchorY:-hh*.38 }); }
  { const g=new THREE.Group(); g.add(M(cyl(s*.1,s*.26,s*.42,20),COL.dark,{ ol:o, p:[0,-s*.21,0] }));
    P('eng',g,[0,-hh*.55,0],[0,-1.5,0],{ name:'Main engine', fn:'Isp 320 s. Course corrections, deep-space burns and the capture burn.', mass:0, side:1 },{ r:s*.3, anchorY:-s*.2 }); }
  { const g=new THREE.Group(), rd=A.d/2, pts=[]; for(let i=0;i<=10;i++){ const x=rd*i/10; pts.push(new THREE.Vector2(x,x*x/(rd*2.2))); }
    g.add(M(new THREE.LatheGeometry(pts,32),COL.hull,{ ol:o, p:[0,s*.18,0], extra:{ side:THREE.DoubleSide } }), M(cyl(.03*s,.03*s,rd*.75+s*.18,8),COL.dark,{ ol:0, p:[0,(rd*.75+s*.18)/2,0] }),
          M(new THREE.SphereGeometry(.07*s,10,8),COL.flame,{ ol:o, p:[0,rd*.75+s*.18,0] }));
    P('ant'+c.antenna,g,[0,hh*.56,0],[0,1.5,0],{ name:`Antenna ${A.d} m`, fn:'Talks to Earth. A bigger dish sends more data per second.', mass:A.mass },{ r:rd, anchorY:s*.25 }); }
  if(c.power==='solar'){ for(const sd of [1,-1]){ const g=new THREE.Group(), n=c.powerN, pw=stowed? .1 : s*1.05, ph=s*1.25;
      if(!stowed) g.add(M(cyl(.03*s,.03*s,s*.3,6),COL.dark,{ ol:0, r:[0,0,Math.PI/2], p:[sd*s*.15,0,0] }));
      for(let i=0;i<n;i++){ const x=stowed? sd*(.05+i*.11) : sd*(s*.3+pw*(i+.5)+i*.06);
        g.add(M(new THREE.BoxGeometry(stowed?.07:pw,ph,stowed?s*.9:.05),COL.panel,{ ol:o, p:[x,0,0] }));
        if(!stowed) for(let k=1;k<4;k++) g.add(M(new THREE.BoxGeometry(pw*.96,.02,.06),0x5f7fc4,{ ol:0, p:[x,ph*(k/4-.5),0] })); }
      P('sol'+sd+c.powerN+(stowed?'s':''),g,[sd*rB,0,0],[sd*1.6,0,0], sd>0?{ name:`Solar wings × ${n}`, fn:'Free power near the Sun. It falls with the square of distance.', mass:n*CRAFT.solar.mass, side:1 }:null,{ r:stowed?.3:s*.3+n*pw }); } }
  else { for(let k=0;k<c.powerN;k++){ const g=new THREE.Group(), sd=k===1?1:-1, up=k===2? .7:0, L=s*.9;
      g.add(M(cyl(.035*s,.035*s,L,6),COL.dark,{ ol:0, r:[0,0,Math.PI/2], p:[sd*L/2,0,0] }), M(cyl(.16*s,.16*s,s*.75,12),COL.dark,{ ol:o, r:[0,0,Math.PI/2], p:[sd*(L+s*.3),0,0] }));
      for(let f=0;f<6;f++) g.add(M(new THREE.BoxGeometry(s*.7,.03,s*.56),COL.flame,{ ol:0, p:[sd*(L+s*.3),0,0], r:[f*Math.PI/6,0,0] }));
      g.rotation.z=sd*-up*-1; if(stowed) g.scale.setScalar(.55);
      P('rtg'+k,g,[sd*rB*.9,up?hh*.3:-hh*.1,0],[sd*1.3,up*1.2,0], k===0?{ name:`RTG × ${c.powerN}`, fn:'Heat from decaying plutonium becomes electricity. Works anywhere. Costs a lot.', mass:c.powerN*CRAFT.rtg.mass, side:-1 }:null,{ r:L+s*.7 }); } }
  c.instruments.forEach((k,i)=>{ const I=CRAFT.inst[k]; if(!I) return; const az=INST_AZ[i%5], dx=Math.cos(az), dz=Math.sin(az), g=new THREE.Group(); let rr=s*.3, y=hh*.12;
    if(k==='cam'){ g.add(M(new THREE.BoxGeometry(s*.3,s*.26,s*.3),COL.hull,{ ol:o }), M(cyl(s*.1,s*.12,s*.26,14),COL.dark,{ ol:o, r:[Math.PI/2,0,0], p:[0,0,s*.26] }), M(cyl(s*.07,s*.07,.02,12),0x8ecfe6,{ ol:0, r:[Math.PI/2,0,0], p:[0,0,s*.4] })); }
    if(k==='spec'){ g.add(M(new THREE.BoxGeometry(s*.36,s*.3,s*.42),COL.band,{ ol:o, p:[0,0,s*.1] }), M(new THREE.BoxGeometry(s*.24,s*.05,.03),COL.ink,{ ol:0, p:[0,0,s*.32] })); }
    if(k==='mag'){ const L=stowed? s*.5 : s*2.1; g.add(M(cyl(.025*s,.025*s,L,6),COL.metal,{ ol:o*.6, r:[Math.PI/2,0,0], p:[0,0,L/2] }), M(new THREE.BoxGeometry(s*.14,s*.14,s*.2),COL.flame,{ ol:o, p:[0,0,L] })); rr=L; y=hh*.3; }
    if(k==='radar'){ const L=stowed? s*.9 : s*3.2; g.add(M(new THREE.BoxGeometry(s*.2,s*.16,s*.2),COL.dark,{ ol:o }), M(cyl(.02*s,.02*s,L,6),COL.hull,{ ol:o*.6, r:[0,0,Math.PI/2], p:[0,0,s*.12] })); y=-hh*.3; }
    if(k==='probe'){ g.add(M(new THREE.ConeGeometry(s*.42,s*.3,24),COL.flame,{ ol:o, r:[Math.PI/2,0,0], p:[0,0,s*.36] }), M(cyl(s*.42,s*.3,s*.22,24),COL.hull,{ ol:o, r:[Math.PI/2,0,0], p:[0,0,s*.1] })); rr=s*.45; y=-hh*.12; }
    g.rotation.y=Math.atan2(dx,dz);
    P('inst'+i+k,g,[dx*rB*.93,y,dz*rB*.93],[dx*1.4,0,dz*1.4],{ name:(k==='probe'&&!MISSIONS[missionKey].landing)? 'Atmosphere probe' : I.name, fn:I.fn, mass:I.mass },{ r:rr }); });
  return { parts, stats:st, size:s };
}
export function initialize(){
(INST_AZ = [90,270,35,325,145].map(a=>a*D2R));
}
export { INST_AZ, craftSpec };
