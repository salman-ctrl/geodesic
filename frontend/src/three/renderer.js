import { $ } from '../ui/dom.js';
import { tween } from '../ui/tween.js';
import { TAU } from '../core/constants.js';
import { lerp } from '../core/physics/math.js';

// ====================================================================================================
// MODULE  src/three/renderer.js
// layer   three · no game logic
// what    renderer, the two worlds (pad, space), camera moves, colour tweens
// imports three, ui/dom, ui/tween, core/physics/math
// ====================================================================================================

let V3, renderer, worlds, pad, space, Stage, _sa, _sb, _o, colorTo;
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
function mkWorld(fov, near, far){
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(fov,1,near,far);
  scene.background=new THREE.Color(0x141b3a);
  const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.08; controls.enablePan=false; controls.enabled=false;
  const labelR=new CSS2DRenderer(); labelR.domElement.style.cssText='position:absolute;inset:0;pointer-events:none'; $('#labels').append(labelR.domElement);
  const w={ scene, camera, controls, labelR, shift:{ x:0, y:0 } }; worlds.push(w); return w;
}
function useWorld(w){ Stage.world=w; for(const o of worlds){ o.labelR.domElement.style.display=o===w?'':'none'; if(o!==w) o.controls.enabled=false; } }
function resize(){ const W=innerWidth, H=innerHeight; renderer.setSize(W,H,false); for(const w of worlds){ w.camera.aspect=W/H; w.labelR.setSize(W,H); } }
function applyShift(w){ const W=innerWidth, H=innerHeight; w.camera.setViewOffset(W,H,-w.shift.x*W,-w.shift.y*H,W,H); }
function bgTo(w, c, sec=1){ const a=w.scene.background.clone(), b=new THREE.Color(c); return tween(sec,k=>w.scene.background.lerpColors(a,b,k)); }
function flyTo(w, pos, tgt, sec=1.5, shiftX=0, shiftY=0){
  const t0=w.controls.target.clone(), s0=w.shift.x, sy0=w.shift.y; _sa.setFromVector3(_o.copy(w.camera.position).sub(t0)); _sb.setFromVector3(_o.copy(pos).sub(tgt));
  const a={ r:_sa.radius, p:_sa.phi, t:_sa.theta }, b={ r:_sb.radius, p:_sb.phi, t:_sb.theta }; let dth=b.t-a.t; while(dth>Math.PI) dth-=TAU; while(dth<-Math.PI) dth+=TAU;
  const en=w.controls.enabled, id=w.flyId=(w.flyId||0)+1; w.controls.enabled=false; w.flying=true;
  return tween(sec,k=>{ if(w.flyId!==id) return; w.controls.target.lerpVectors(t0,tgt,k); _sa.set(lerp(a.r,b.r,k),lerp(a.p,b.p,k),a.t+dth*k);
    w.camera.position.setFromSpherical(_sa).add(w.controls.target); w.camera.lookAt(w.controls.target); w.shift.x=lerp(s0,shiftX,k); w.shift.y=lerp(sy0,shiftY,k); }).then(()=>{ if(w.flyId!==id) return; w.flying=false; w.controls.enabled=en; });
}
function stopFly(w){ w.flyId=(w.flyId||0)+1; w.flying=false; }
export function initialize(){
(V3 = THREE.Vector3);
(renderer = new THREE.WebGLRenderer({ canvas:$('#gl'), antialias:true, powerPreference:'high-performance' }));
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.localClippingEnabled = true;
(worlds = []);
(pad = mkWorld(35, 0.5, 60000));
(space = mkWorld(40, 0.5, 60000));
(Stage = { world:pad, renderOn:true });
addEventListener('resize', resize);
(_sa = new THREE.Spherical());
(_sb = new THREE.Spherical());
(_o = new V3());
(colorTo = (col,hexv,sec=1)=>{ const a=col.clone(), b=new THREE.Color(hexv); return tween(sec,k=>col.lerpColors(a,b,k)); });
}
export { V3, renderer, worlds, mkWorld, pad, space, Stage, useWorld, resize, applyShift, bgTo, _sa, _sb, _o, flyTo, stopFly, colorTo };
