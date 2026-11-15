import { R_EARTH, TAU } from '../core/constants.js';
import { pad, V3 } from './renderer.js';
import { gradTex, M, cyl, disposeGroup, Toon } from './materials.js';
import { rng, clamp } from '../core/physics/math.js';
import { rocketSpec } from './models/rocket.js';
import { ROCKET } from '../core/data/parts.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/launchSite.js
// layer   three · no game logic
// what    launch site, Earth backdrop, smoke, flames, the flying launch vehicle, debris and explosions
// imports three, renderer, materials, models/rocket, three/worlds/padWorld, core/*
// ====================================================================================================
// World trick: the rocket never moves. The launch site, clouds and the Earth move past it, so the camera target is
// locked on the vehicle and it can never leave the frame. Earth is drawn as a scaled backdrop (1:400) behind everything.

let R0M, EK, site, groundToon, sandTone, sandDark, sandLite, rockTone, roadTone, seaTone, grassTone, sea, shoreline, greenBelt, terrain, plateau, apron, launchField, scorchRing, cloudMat, earthBack, airGlow, SMOKE_N, smoke, smokeP, smokeI, _m4, _q, _s, _c1, _c2, SKY, flameMatA, flameMatB, flameMatU, LV, vapor;
function addMound(x,z,rx,rz,h,col=sandDark){ const g=new THREE.SphereGeometry(1,18,12,0,TAU,0,Math.PI*.5); const m=M(g,col,{ p:[x,-8,z], s:[rx,h,rz], ol:0, mat:groundToon(col) }); terrain.add(m); return m; }
function addRoad(x,z,w,d,rot=0,col=roadTone){ terrain.add(M(new THREE.BoxGeometry(w,1.6,d),col,{ p:[x,-1.1,z], r:[0,rot,0], ol:0, mat:groundToon(col) })); }
function makeBuilding(x,z,w,d,h,col=0xeee4d3, roof=0x5a6877){
  const g=new THREE.Group();
  g.add(M(new THREE.BoxGeometry(w,h,d),col,{ p:[0,h*.5,0], ol:.05 }));
  g.add(M(new THREE.BoxGeometry(w*.96,h*.05,d*.96),roof,{ p:[0,h+.2,0], ol:0 }));
  const door = M(new THREE.BoxGeometry(w*.14,h*.45,.18),0x8aa7b2,{ p:[0,h*.24,d*.5+.12], ol:0 }); g.add(door);
  for(let i=0;i<Math.max(2,Math.round(w/7));i++){
    const wx=-w*.34 + (i/(Math.max(1,Math.round(w/7)-1)||1))*w*.68;
    const win=M(new THREE.BoxGeometry(w*.12,h*.16,.12),0xa9d2e0,{ p:[wx,h*.62,d*.5+.1], ol:0 }); g.add(win);
  }
  g.position.set(x,0,z); site.add(g); return g;
}
function makeHangar(x,z,w,d,h){
  const g=new THREE.Group();
  g.add(M(new THREE.BoxGeometry(w,h,d),0xe8dfcf,{ p:[0,h*.44,0], ol:.05 }));
  g.add(M(cyl(w*.18,w*.18,d,32,true),0x7aa3a8,{ p:[0,h*.9,0], r:[0,0,Math.PI*.5], s:[1,1,1] }));
  g.add(M(new THREE.BoxGeometry(w*.52,h*.5,.15),0xcedceb,{ p:[0,h*.24,d*.5+.09], ol:0 }));
  g.position.set(x,0,z); site.add(g); return g;
}
function makeTank(x,z,r=16,h=42){ const g=new THREE.Group(); g.add(M(cyl(r,r,h,28),0xf2eadb,{ p:[0,h*.5,0], ol:.04 })); g.add(M(new THREE.SphereGeometry(r,24,18,0,TAU,0,Math.PI*.5),0x6da8ab,{ p:[0,h,0], ol:0 })); g.position.set(x,0,z); site.add(g); return g; }
function makeDish(x,z,s=1){ const g=new THREE.Group(); g.add(M(cyl(.8,.8,8,10),0xe7ddcd,{ p:[0,4,0], ol:0 })); g.add(M(new THREE.SphereGeometry(10,26,16,0,TAU,0,Math.PI*.55),0xe7ddcd,{ p:[0,11,0], r:[-Math.PI*.58,0,0], s:[1.1*s,.55*s,1.1*s], ol:.03 })); g.add(M(new THREE.BoxGeometry(.5,6,2),0x56626f,{ p:[0,8.4,1.4], r:[-.72,0,0], ol:0 })); g.position.set(x,0,z); site.add(g); return g; }
function makeLightPole(x,z,h=24){ const g=new THREE.Group(); g.add(M(cyl(.7,.8,h,10),0xf5ebdc,{ p:[0,h*.5,0], ol:0 })); g.add(M(new THREE.SphereGeometry(2.1,14,12),0xfff0cf,{ p:[0,h+.8,0], ol:0 })); const glow=new THREE.PointLight(0xffd99e,.45,140,2); glow.position.set(0,h+.8,0); g.add(glow); g.position.set(x,0,z); site.add(g); return g; }
function makeTowerFrame(x,z,h=92){
  const g=new THREE.Group(), legGeo=new THREE.BoxGeometry(4,h,4), beamGeo=new THREE.BoxGeometry(24,3,4), beamGeoZ=new THREE.BoxGeometry(4,3,24);
  [[-10,-10],[10,-10],[-10,10],[10,10]].forEach(([lx,lz])=>g.add(M(legGeo,0xc85f3c,{ p:[lx,h*.5,lz], ol:0 })));
  for(let y=12;y<h;y+=16){ g.add(M(beamGeo,0xdf8154,{ p:[0,y,-10], ol:0 })); g.add(M(beamGeo,0xdf8154,{ p:[0,y,10], ol:0 })); g.add(M(beamGeoZ,0xdf8154,{ p:[-10,y,0], ol:0 })); g.add(M(beamGeoZ,0xdf8154,{ p:[10,y,0], ol:0 })); }
  g.position.set(x,0,z); site.add(g); return g;
}
function skyAt(hm, out){ for(let i=1;i<SKY.length;i++) if(hm<SKY[i][0]||i===SKY.length-1){ const a=SKY[i-1], b=SKY[i]; return out.lerpColors(_c1.set(a[1]),_c2.set(b[1]),clamp((hm-a[0])/(b[0]-a[0]),0,1)); } }
function mkFlame(r, L, upper){ const g=new THREE.Group(), geo=new THREE.ConeGeometry(1,1,18,1,true); geo.rotateX(Math.PI); geo.translate(0,-.5,0);
  const a=new THREE.Mesh(geo,upper? flameMatU : flameMatA), b=new THREE.Mesh(geo,flameMatB); a.scale.set(r,L,r); b.scale.set(r*.5,L*.55,r*.5); g.add(a,b); g.userData={ r, L }; g.visible=false; return g; }
function buildLV(d){
  for(const o of [...LV.inner.children]){ LV.inner.remove(o); disposeGroup(o); } for(const d of LV.debris) pad.scene.remove(d.g); LV.debris=[];
  Toon.outline=.07; const sp=rocketSpec(d.rocket,d.craft,d.mission), core=new THREE.Group(), upper=new THREE.Group(), payload=new THREE.Group(), boosters=[], fair=[];
  for(const p of sp.parts){ p.g.position.copy(p.home); if(p.id.startsWith('boost')) boosters.push(p.g); else if(p.id.startsWith('fair')) fair.push(p.g); else if(p.id.startsWith('upper')) upper.add(p.g); else if(p.id==='payload') payload.add(p.g); else core.add(p.g); }
  const U=ROCKET.upper[d.rocket.upper], upY=sp.stageY-U.len;
  LV.fCore=mkFlame(1.5,13+d.rocket.engines*.9); core.add(LV.fCore); LV.fBoost=boosters.map(b=>{ const f=mkFlame(.95,15); b.add(f); return f; });
  LV.fUpper=mkFlame(1.1,9,true); LV.fUpper.position.y=upY-1.5; upper.add(LV.fUpper);
  vapor.scale.set(ROCKET.fairing[d.rocket.fairing].r*2.4,7,ROCKET.fairing[d.rocket.fairing].r*2.4); vapor.position.y=sp.height-ROCKET.fairing[d.rocket.fairing].len*.42; vapor.material.opacity=0; payload.add(vapor);
  LV.inner.add(core,upper,payload,...boosters,...fair); Object.assign(LV,{ core, upper, payload, boosters, fair, height:sp.height, stageY:sp.stageY, upY, pivot:sp.height*.42 });
  LV.inner.position.y=-LV.pivot; LV.root.rotation.set(0,0,0); LV.root.visible=true; LV.focusY=0;
}
function shed(objs, vel, spin){ for(const g of objs){ pad.scene.attach(g); LV.debris.push({ g, v:vel(g), w:new V3((Math.random()-.5)*spin,(Math.random()-.5)*spin,(Math.random()-.5)*spin), life:7 }); } }
function boom(pos, size){ const cols=[0xfff0c2,0xffa53d,0xe2772e,0x3b3632,0xffa53d,0xfff0c2,0x3b3632,0xe2772e];
  cols.forEach((c,i)=>{ const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({ color:c })); const d=new V3(Math.random()-.5,Math.random()*.9,Math.random()-.5).multiplyScalar(size*.9); m.position.copy(pos).add(d); m.scale.setScalar(.01); pad.scene.add(m); LV.booms.push({ m, t:-i*.06, size:size*(.5+Math.random()*.7), d }); }); }
export function initialize(){
(R0M = R_EARTH*1000);
(EK = 1/400);
(site = new THREE.Group());
site.visible=false;
pad.scene.add(site);
(groundToon = color=>new THREE.MeshToonMaterial({ color, gradientMap:gradTex }));
(sandTone = 0xe4d1b3);
(sandDark = 0xd4bb95);
(sandLite = 0xefe1ca);
(rockTone = 0xc8b18e);
(roadTone = 0xb39d7d);
(seaTone = 0x5da7d9);
(grassTone = 0xa4c88a);
(sea = new THREE.Mesh(new THREE.CircleGeometry(54000,96),groundToon(seaTone)));
sea.rotation.x=-Math.PI/2;
sea.position.y=-10;
site.add(sea);
(shoreline = new THREE.Mesh(new THREE.RingGeometry(7600,11000,72),groundToon(sandLite)));
shoreline.rotation.x=-Math.PI/2;
shoreline.position.set(-4000,-8.6,0);
site.add(shoreline);
(greenBelt = new THREE.Mesh(new THREE.CircleGeometry(7200,60),groundToon(grassTone)));
greenBelt.rotation.x=-Math.PI/2;
greenBelt.position.set(-4000,-8.2,0);
site.add(greenBelt);
(terrain = new THREE.Group());
site.add(terrain);
(plateau = M(cyl(14500,16200,240,84),sandTone,{ p:[0,-130,0], ol:0, mat:groundToon(sandTone) }));
terrain.add(plateau);
(apron = M(cyl(6200,6600,20,72),sandLite,{ p:[0,-10,0], ol:0, mat:groundToon(sandLite) }));
terrain.add(apron);
(launchField = M(cyl(1280,1360,10,48),0xd8d0c2,{ p:[0,-2,0], ol:0, mat:groundToon(0xd8d0c2) }));
terrain.add(launchField);
(scorchRing = new THREE.Mesh(new THREE.RingGeometry(360,980,48), groundToon(0xbbab8f)));
scorchRing.rotation.x=-Math.PI/2;
scorchRing.position.set(0,.02,0);
terrain.add(scorchRing);
[[2200,1600,1400,1200,150],[-2600,2100,1900,1500,190],[3400,-1800,1700,1200,170],[-4200,-1400,2200,1500,220],[5400,900,1200,900,110],[7600,-900,1800,1200,180]].forEach(v=>addMound(...v));
addRoad(-900,0,1800,70,0);
addRoad(-2300,0,900,52,0);
addRoad(0,1180,70,2360,Math.PI/2);
addRoad(1700,-760,1600,58,-.42);
makeBuilding(-1580,-220,170,70,48);
makeBuilding(-1780,240,138,62,36,0xf3e8d6,0x6f8f94);
makeBuilding(-1300,280,112,54,28,0xf0e5d1,0x6f8f94);
makeHangar(-2240,-460,250,130,62);
makeHangar(-2520,540,220,110,54);
makeHangar(1960,-980,210,118,46);
makeTank(-1060,640,18,52);
makeTank(-980,720,14,38);
makeTank(980,980,16,44);
makeDish(1260,830,.9);
makeDish(-880,-980,1.05);
makeTowerFrame(760,-180,100);
makeTowerFrame(-640,1240,84);
[[350,350],[350,-350],[-350,350],[-350,-350],[980,220],[-960,-240],[-1860,-680],[-2380,660],[1760,-990],[1260,860],[-1120,720]].forEach(([x,z],i)=>makeLightPole(x,z,22+(i%3)*3));
(cloudMat = new THREE.MeshToonMaterial({ color:0xffffff, gradientMap:gradTex }));
{ const r=rng(7), geo=new THREE.IcosahedronGeometry(1,1);
  for(let i=0;i<26;i++){
    const c=new THREE.Group(), s=80+r()*150, ang=r()*TAU, rad=3600+r()*12000;
    for(let k=0;k<5;k++){ const m=new THREE.Mesh(geo,cloudMat); m.position.set((k-2)*.78+r()*.35,r()*.28,r()*.7-.35); m.scale.set(1+r()*.42,.48+r()*.24,.85+r()*.28); c.add(m); }
    c.scale.setScalar(s); c.position.set(Math.cos(ang)*rad,900+r()*2600,Math.sin(ang)*rad); site.add(c);
  }
}
(earthBack = new THREE.Mesh(new THREE.SphereGeometry(R0M*EK,96,64),new THREE.MeshToonMaterial({ gradientMap:gradTex, depthTest:false, depthWrite:false })));
{ const c=document.createElement('canvas'); c.width=1024; c.height=512; const g=c.getContext('2d'), r=rng(11); g.fillStyle='#4f9bd6'; g.fillRect(0,0,1024,512);
  for(let i=0;i<70;i++){ g.fillStyle=r()<.7? '#9cc37c' : '#d9c58f'; g.beginPath(); g.ellipse(r()*1024,40+r()*440,18+r()*70,10+r()*40,r()*3,0,TAU); g.fill(); }
  g.fillStyle='#4f9bd6'; g.fillRect(0,0,1024,14); g.fillStyle='rgba(255,255,255,.85)'; for(let i=0;i<90;i++){ g.beginPath(); g.ellipse(r()*1024,r()*512,20+r()*60,4+r()*9,r()*.6-.3,0,TAU); g.fill(); }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; earthBack.material.map=t; }
earthBack.renderOrder=-5;
earthBack.frustumCulled=false;
earthBack.visible=false;
pad.scene.add(earthBack);
(airGlow = new THREE.Mesh(new THREE.SphereGeometry(R0M*EK*1.012,96,64),new THREE.MeshBasicMaterial({ color:0x8fd0ff, side:THREE.BackSide, transparent:true, opacity:0, depthTest:false, depthWrite:false, blending:THREE.AdditiveBlending })));
airGlow.renderOrder=-6;
airGlow.frustumCulled=false;
airGlow.visible=false;
pad.scene.add(airGlow);
(SMOKE_N = 170);
(smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({ color:0xffffff }),SMOKE_N));
smoke.frustumCulled=false;
smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
site.add(smoke);
(smokeP = Array.from({ length:SMOKE_N },()=>({ p:new V3(), v:new V3(), life:0, max:1, s:1 })));
(smokeI = 0);
{ const c=new THREE.Color(1,1,1); for(let i=0;i<SMOKE_N;i++) smoke.setColorAt(i,c); }
(_m4 = new THREE.Matrix4());
(_q = new THREE.Quaternion());
(_s = new V3());
(_c1 = new THREE.Color());
(_c2 = new THREE.Color());
(SKY = [[0,0x8ec9ea],[11e3,0x5fa5dc],[28e3,0x2f549f],[55e3,0x18234f],[100e3,0x0c122e]]);
(flameMatA = new THREE.MeshBasicMaterial({ color:0xffa53d, transparent:true, opacity:.95 }));
(flameMatB = new THREE.MeshBasicMaterial({ color:0xfff0c2 }));
(flameMatU = new THREE.MeshBasicMaterial({ color:0xbfe4ff, transparent:true, opacity:.8 }));
(LV = { root:new THREE.Group(), inner:new THREE.Group(), debris:[], booms:[] });
LV.root.add(LV.inner);
LV.root.visible=false;
pad.scene.add(LV.root);
(vapor = new THREE.Mesh(new THREE.ConeGeometry(1,1,28,1,true),new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0, side:THREE.DoubleSide, depthWrite:false })));
}
export { R0M, EK, site, groundToon, sandTone, sandDark, sandLite, rockTone, roadTone, seaTone, grassTone, sea, shoreline, greenBelt, terrain, plateau, apron, launchField, scorchRing, addMound, addRoad, makeBuilding, makeHangar, makeTank, makeDish, makeLightPole, makeTowerFrame, cloudMat, earthBack, airGlow, SMOKE_N, smoke, smokeP, smokeI, _m4, _q, _s, _c1, _c2, SKY, skyAt, flameMatA, flameMatB, flameMatU, mkFlame, LV, vapor, buildLV, shed, boom };

export function nextSmoke(){ return smokeI=(smokeI+1)%SMOKE_N; }
