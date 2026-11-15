import { V3 } from './renderer.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/materials.js
// layer   three · no game logic
// what    toon materials, inverted-hull outlines, mesh factory
// imports three, renderer
// ====================================================================================================
// ---- toon materials + inverted-hull outlines ----

let COL, gradTex, cutPlane, matCache, Toon, cyl;
function toonMat(color, hull=false, extra){ const key=color+(hull?'h':'')+(extra?JSON.stringify(extra):''); let m=matCache.get(key);
  if(!m){ m=new THREE.MeshToonMaterial({ color, gradientMap:gradTex, ...(hull?{ clippingPlanes:[cutPlane], side:THREE.DoubleSide }:{}), ...extra }); matCache.set(key,m); } return m; }
function outlineMat(thick, hull=false){ const key='ol'+thick.toFixed(4)+(hull?'h':''); let m=matCache.get(key);
  if(!m){ m=new THREE.MeshBasicMaterial({ color:COL.ink, side:THREE.BackSide, ...(hull?{ clippingPlanes:[cutPlane] }:{}) });
    m.onBeforeCompile=s=>{ s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed += normalize(normal) * '+thick.toFixed(4)+';'); };
    m.customProgramCacheKey=()=>key; matCache.set(key,m); } return m; }
function M(geo, color, o={}){
  const m=new THREE.Mesh(geo, o.mat||toonMat(color,o.hull,o.extra));
  if(o.p) m.position.set(o.p[0],o.p[1],o.p[2]); if(o.r) m.rotation.set(o.r[0],o.r[1],o.r[2]); if(o.s) m.scale.set(o.s[0],o.s[1],o.s[2]);
  if(o.ol!==0){ const ol=new THREE.Mesh(geo,outlineMat(o.ol||Toon.outline,o.hull)); ol.raycast=()=>{}; ol.userData.outline=true; m.add(ol); }
  return m;
}
function disposeGroup(g){ g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
export function initialize(){
(COL = { hull:0xf6f1e6, band:0x1f6f6a, flame:0xe2772e, dark:0x3b3632, metal:0x9aa1a8, lox:0x8ecfe6, rp1:0xe6a352, lh2:0xbfe6cf, grain:0xb98b8b, gold:0xe3b352, panel:0x2a437e, ink:0x2b2622, paper:0xfbf6ec });
(gradTex = (()=>{ const t=new THREE.DataTexture(new Uint8Array([120,120,120,255, 190,190,190,255, 255,255,255,255]),3,1,THREE.RGBAFormat); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })());
(cutPlane = new THREE.Plane(new V3(0,0,-1), 1e6));
(matCache = new Map());
(Toon = { outline:0.07 });
(cyl = (rt,rb,ht,seg=32,open=false)=>new THREE.CylinderGeometry(rt,rb,ht,seg,1,open));
}
export { COL, gradTex, cutPlane, matCache, toonMat, outlineMat, Toon, M, cyl, disposeGroup };
