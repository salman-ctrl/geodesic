import { Stage, renderer } from './renderer.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/picking.js
// layer   three · no game logic
// what    canvas click -> ray
// imports three, renderer
// ====================================================================================================

let ray, downAt;
function pickRay(e){ const W=innerWidth, Hh=innerHeight; ray.setFromCamera(new THREE.Vector2(((e.clientX+Stage.world.shift.x*W)/W)*2-1,-((e.clientY+Stage.world.shift.y*Hh)/Hh)*2+1),Stage.world.camera); return ray; }
function onCanvasClick(handler){
  renderer.domElement.addEventListener('pointerdown',e=>downAt=[e.clientX,e.clientY]);
  renderer.domElement.addEventListener('pointerup',e=>{ if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5) return; handler(pickRay(e)); });
}
export function initialize(){
(ray = new THREE.Raycaster());
(downAt = null);
}
export { ray, downAt, pickRay, onCanvasClick };
