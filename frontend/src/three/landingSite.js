import { pad } from './renderer.js';
import { disposeGroup, Toon, M, cyl, COL } from './materials.js';
import { rng, tint } from '../core/physics/math.js';
import { TAU } from '../core/constants.js';
import { mkFlame } from './launchSite.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/landingSite.js
// layer   three · no game logic
// what    landing site and lander
// imports three, renderer, materials, three/launchSite (flame), core/physics/math
// ====================================================================================================

let landGroup, Lander;
function buildLanding(key){
  for(const o of [...landGroup.children]){ landGroup.remove(o); disposeGroup(o); } const moon=key==='moon', gc=moon? 0x7f7b75 : 0xc46a45, r=rng(moon?5:9);
  const gnd=new THREE.Mesh(new THREE.CircleGeometry(9000,72),new THREE.MeshBasicMaterial({ color:gc })); gnd.rotation.x=-Math.PI/2; landGroup.add(gnd);
  for(let i=0;i<70;i++){ const a=r()*TAU, d=30+r()*r()*3800, s=12+r()*r()*260, x=Math.cos(a)*d, z=Math.sin(a)*d;
    const rim=new THREE.Mesh(new THREE.CircleGeometry(s*1.14,28),new THREE.MeshBasicMaterial({ color:new THREE.Color(tint(gc,.16)) })), pit=new THREE.Mesh(new THREE.CircleGeometry(s,28),new THREE.MeshBasicMaterial({ color:new THREE.Color(tint(gc,-.2)) }));
    rim.rotation.x=pit.rotation.x=-Math.PI/2; rim.position.set(x,.04,z); pit.position.set(x+s*.06,.08,z+s*.04); landGroup.add(rim,pit); }
  Toon.outline=.05; for(let i=0;i<46;i++){ const a=r()*TAU, d=9+r()*170, s=.4+r()*r()*3.4; landGroup.add(M(new THREE.IcosahedronGeometry(s,0),gc,{ p:[Math.cos(a)*d,s*.3,Math.sin(a)*d], r:[r()*3,r()*3,0] })); }
  const g=new THREE.Group(); g.add(M(cyl(1.25,1.5,1.3,8),COL.gold,{ p:[0,2,0] }), M(cyl(1.3,1.3,.2,8),COL.dark,{ p:[0,2.7,0] }), M(cyl(.25,.6,.8,14),COL.dark,{ p:[0,1.05,0] }), M(new THREE.SphereGeometry(.5,14,10),COL.hull,{ p:[0,3.1,0] }));
  for(let i=0;i<4;i++){ const a=i*Math.PI/2+Math.PI/4, cx=Math.cos(a), cz=Math.sin(a); const leg=M(cyl(.07,.07,2.5,6),COL.metal,{ p:[cx*1.75,1.05,cz*1.75], ol:.03 }); leg.rotation.set(cz*.62,0,-cx*.62); g.add(leg, M(cyl(.42,.42,.1,12),COL.dark,{ p:[cx*2.45,.05,cz*2.45], ol:.03 })); }
  const fl=mkFlame(.55,4.5); fl.position.y=.7; g.add(fl); Toon.outline=.07; landGroup.add(g); Lander.g=g; Lander.flame=fl;
}
export function initialize(){
(landGroup = new THREE.Group());
landGroup.visible=false;
pad.scene.add(landGroup);
(Lander = { g:null });
}
export { landGroup, Lander, buildLanding };
