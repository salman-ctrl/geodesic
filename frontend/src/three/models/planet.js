import { BODIES } from '../../core/data/bodies.js';
import { rng, hex, tint } from '../../core/physics/math.js';
import { TAU } from '../../core/constants.js';
import { gradTex, outlineMat } from '../materials.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/models/planet.js
// layer   three · no game logic
// what    planet textures, planets, star fields
// imports three, materials, core/data/bodies, core/physics/math
// ====================================================================================================

let planetTexCache;
function planetTexture(key){
  const c=document.createElement('canvas'); c.width=256; c.height=128; const g=c.getContext('2d'), col=BODIES[key].col, r=rng(key.length*977+key.charCodeAt(0));
  g.fillStyle=hex(col); g.fillRect(0,0,256,128);
  if(['jupiter','saturn','uranus','neptune'].includes(key)){
    const n=key==='jupiter'?11:key==='saturn'?8:4; for(let i=0;i<n;i++){ const y=r()*128, hh=4+r()*12; g.fillStyle=tint(col,(r()-.55)*(key==='jupiter'?.5:.25)); g.fillRect(0,y,256,hh); }
    if(key==='jupiter'){ g.fillStyle='#c0553a'; g.beginPath(); g.ellipse(170,82,17,9,0,0,TAU); g.fill(); }
    if(key==='neptune'){ g.fillStyle=tint(col,-.3); g.beginPath(); g.ellipse(90,70,14,7,0,0,TAU); g.fill(); }
  } else if(key==='earth'){
    g.fillStyle='#78b86a'; for(let i=0;i<16;i++){ g.beginPath(); g.ellipse(r()*256,24+r()*80,10+r()*26,6+r()*16,r()*3,0,TAU); g.fill(); }
    g.fillStyle='#f4f1e8'; g.fillRect(0,0,256,9); g.fillRect(0,119,256,9); for(let i=0;i<10;i++){ g.beginPath(); g.ellipse(r()*256,r()*128,14+r()*18,3+r()*4,0,0,TAU); g.fill(); }
  } else {
    for(let i=0;i<26;i++){ g.fillStyle=tint(col,(r()-.6)*.4); g.beginPath(); g.ellipse(r()*256,r()*128,4+r()*16,3+r()*10,r()*3,0,TAU); g.fill(); }
    if(key==='mars'){ g.fillStyle='#f1e6da'; g.fillRect(0,0,256,7); }
  }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
function makePlanet(key, radius, seg=40){
  const g=new THREE.Group(); const tex=planetTexCache[key]||(planetTexCache[key]=planetTexture(key));
  const m=new THREE.Mesh(new THREE.SphereGeometry(radius,seg,seg*0.6|0), new THREE.MeshToonMaterial({ map:tex, gradientMap:gradTex }));
  const ol=new THREE.Mesh(m.geometry,outlineMat(radius*0.045)); ol.raycast=()=>{}; m.add(ol); g.add(m); g.userData.ball=m;
  if(key==='saturn'){ const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.3,radius*1.95,72), new THREE.MeshBasicMaterial({ color:0xd8c08a, side:THREE.DoubleSide, transparent:true, opacity:.92 }));
    ring.rotation.x=-Math.PI/2; const gap=new THREE.Mesh(new THREE.RingGeometry(radius*1.62,radius*1.68,72), new THREE.MeshBasicMaterial({ color:0x141b3a, side:THREE.DoubleSide, transparent:true, opacity:.55 })); gap.rotation.x=-Math.PI/2; gap.position.y=.01;
    const tilt=new THREE.Group(); tilt.add(ring,gap); tilt.rotation.set(.45,0,.3); g.add(tilt); }
  return g;
}
function makeStars(n, radius, size=1.6){
  const pos=new Float32Array(n*3), r=rng(42); for(let i=0;i<n;i++){ const u=r()*2-1, a=r()*TAU, s=Math.sqrt(1-u*u); pos[i*3]=radius*s*Math.cos(a); pos[i*3+1]=radius*u; pos[i*3+2]=radius*s*Math.sin(a); }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({ color:0xfbf6ec, size, sizeAttenuation:false, transparent:true, opacity:.85, depthWrite:false })); p.frustumCulled=false; return p;
}
export function initialize(){
(planetTexCache = {});
}
export { planetTexture, planetTexCache, makePlanet, makeStars };
