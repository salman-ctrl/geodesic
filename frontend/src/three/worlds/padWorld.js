import { pad } from '../renderer.js';
import { M, cyl, COL, Toon } from '../materials.js';
import { makeStars, makePlanet } from '../models/planet.js';
import { Assembly } from '../Assembly.js';
import { rocketSpec } from '../models/rocket.js';
import { craftSpec } from '../models/spacecraft.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/worlds/padWorld.js
// layer   three · no game logic
// what    the pad world: ground, platform, tower, hero sky, the rocket and spacecraft rigs
// imports three, renderer, materials, models/*, Assembly
// ====================================================================================================
// ---- the pad world: ground, platform, tower, sky dressing ----

let padSun, ground, shadowBlob, padGroup, platform, tower, heroSky, heroStars, heroPlanets, craftStand, rocketRig, craftRig;
function setTowerHeight(hgt){ tower.scale.y=hgt*1.06; }
function rebuildRocket(d, instant=false){ Toon.outline=.07; const sp=rocketSpec(d.rocket,d.craft,d.mission); rocketRig.info=sp; rocketRig.set(sp,instant); setTowerHeight(sp.height); shadowBlob.scale.setScalar(9+d.rocket.boosters*2); return sp; }
function rebuildCraft(d, instant=false){ const sp=craftSpec(d.craft,d.mission); craftRig.set(sp,instant); return sp; }
export function initialize(){
pad.scene.add(new THREE.HemisphereLight(0xffffff,0x9a8f80,1.25));
(padSun = new THREE.DirectionalLight(0xffffff,1.9));
padSun.position.set(50,90,70);
pad.scene.add(padSun);
(ground = new THREE.Mesh(new THREE.CircleGeometry(900,96), new THREE.MeshBasicMaterial({ color:0x1b2448 })));
ground.rotation.x=-Math.PI/2;
ground.position.y=-1.6;
pad.scene.add(ground);
(shadowBlob = (()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), gr=g.createRadialGradient(64,64,4,64,64,62); gr.addColorStop(0,'rgba(20,18,16,.42)'); gr.addColorStop(1,'rgba(20,18,16,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128);
  const m=new THREE.Mesh(new THREE.CircleGeometry(1,40), new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false })); m.rotation.x=-Math.PI/2; m.position.y=.03; m.scale.setScalar(16); return m; })());
(padGroup = new THREE.Group());
pad.scene.add(padGroup);
(platform = new THREE.Group());
platform.add(M(cyl(10,11,1.6,48),0xd9cfbb,{ p:[0,-.8,0] }), M(cyl(4.2,4.2,.3,40),COL.dark,{ p:[0,-.12,0], ol:0 }), shadowBlob);
padGroup.add(platform);
(tower = new THREE.Group());
{ tower.add(M(new THREE.BoxGeometry(2.6,1,2.6),0x55606e,{ p:[-8.2,.5,0], s:[1,1,1] }));
  for(let i=0;i<8;i++) tower.add(M(new THREE.BoxGeometry(2.9,.016,2.9),i%4===3? COL.flame : 0x3d4652,{ p:[-8.2,.11+i*.111,0], ol:0 }));
  for(const yy of [.3,.6,.86]) tower.add(M(new THREE.BoxGeometry(5,.045,.7),0x55606e,{ p:[-5.2,yy,0], ol:.03 }));
  tower.add(M(cyl(.07,.07,.16,6),COL.dark,{ p:[-8.2,1.08,0], ol:0 })); padGroup.add(tower); }
(heroSky = new THREE.Group());
pad.scene.add(heroSky);
(heroStars = makeStars(1400, 9000));
heroSky.add(heroStars);
(heroPlanets = [['saturn',60,900,.016,.6,260],['jupiter',95,1400,-.011,2.6,420],['mars',26,620,.028,4.4,150],['neptune',48,1150,.014,1.5,560],['moon',34,760,-.021,5.6,330]].map(([k,r,R,w,ph,y])=>{
  const g=makePlanet(k,r,36); heroSky.add(g); return { g, R, w, ph, y }; }));
(craftStand = new THREE.Group());
craftStand.add(M(cyl(2.2,2.5,.3,40),0xd9cfbb,{ p:[0,-1.45,0], ol:.04 }), M(cyl(1.2,1.2,.06,32),COL.dark,{ p:[0,-1.28,0], ol:0 }));
craftStand.visible=false;
pad.scene.add(craftStand);
(rocketRig = new Assembly(pad,1));
(craftRig = new Assembly(pad,.26));
craftRig.root.position.set(0,6,0);
rocketRig.info = { height:38 };
}
export { padSun, ground, shadowBlob, padGroup, platform, tower, setTowerHeight, heroSky, heroStars, heroPlanets, craftStand, rocketRig, craftRig, rebuildRocket, rebuildCraft };
