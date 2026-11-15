import { space, _o, V3 } from './renderer.js';
import { Toon, M, COL, cyl } from './materials.js';
import { V3_UP } from './Assembly.js';
import { lerp, V } from '../core/physics/math.js';
import { BODIES } from '../core/data/bodies.js';
import { makePlanet } from './models/planet.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/encounter.js
// layer   three · no game logic
// what    encounter stage shared by flyby and arrival: planet, hyperbola tubes, arrows, craft icon
// imports three, renderer, materials, models/planet, core/data/bodies
// ====================================================================================================

let encGroup, Enc, rotAbout;
function mkCraftIcon(){ const g=new THREE.Group(); Toon.outline=.1; g.add(M(new THREE.BoxGeometry(1,1,1),COL.gold,{}), M(new THREE.BoxGeometry(3.6,.12,.85),COL.panel,{}), M(new THREE.ConeGeometry(.55,.5,14),COL.hull,{ p:[0,.75,0] })); Toon.outline=.07; return g; }
function mkArrow(color){ const g=new THREE.Group(), mat=new THREE.MeshBasicMaterial({ color }), sh=new THREE.Mesh(cyl(1,1,1,8),mat), hd=new THREE.Mesh(new THREE.ConeGeometry(1,1,12),mat); g.add(sh,hd); g.userData={ sh, hd }; return g; }
function setArrow(g, from, dir, len, w=.4){ g.position.copy(from); g.quaternion.setFromUnitVectors(V3_UP,_o.copy(dir).normalize()); const { sh, hd }=g.userData, L=Math.max(.01,len-w*4.5); sh.scale.set(w,L,w); sh.position.y=L/2; hd.scale.set(w*2.6,w*4.5,w*2.6); hd.position.y=L+w*2.25; }
function hypGeom(mu, rp, vinf){ const a=mu/(vinf*vinf), e=1+rp/a, nuInf=Math.acos(-1/e); return { a, e, b:a*Math.sqrt(e*e-1), nuInf, om:nuInf+Math.PI, delta:2*nuInf-Math.PI }; }
function hypPoint(hg, y, R){ const F=Math.asinh(y/hg.b), x=hg.a*(hg.e-Math.cosh(F)), c=Math.cos(hg.om), sn=Math.sin(hg.om), k=10/R; return new V3((x*c-y*sn)*k,0,-(x*sn+y*c)*k); }
function hypPoints(mu, rp, vinf, R, rMaxKm, n=120){ const hg=hypGeom(mu,rp,vinf), yMax=hg.b*Math.sinh(Math.acosh(Math.max(1.0001,(rMaxKm/hg.a+1)/hg.e))), pts=[]; for(let i=0;i<=n;i++) pts.push(hypPoint(hg,lerp(-yMax,yMax,i/n),R)); return { pts, hg, yMax }; }
function hypAtTime(hg, mu, t){ const n=Math.sqrt(mu/(hg.a*hg.a*hg.a)), Mh=n*t; let F=Math.asinh(Mh/hg.e); for(let i=0;i<25;i++){ const d=(hg.e*Math.sinh(F)-F-Mh)/(hg.e*Math.cosh(F)-1); F-=d; if(Math.abs(d)<1e-12) break; } return hg.b*Math.sinh(F); }
export function initialize(){
(encGroup = new THREE.Group());
encGroup.visible=false;
space.scene.add(encGroup);
(Enc = {
  objs:[], key:'',
  setup(key){ for(const o of [...encGroup.children]){ encGroup.remove(o); o.traverse(x=>{ if(x.geometry) x.geometry.dispose(); if(x.isCSS2DObject) x.element.remove(); }); } this.key=key; this.R=BODIES[key].R; this.planet=makePlanet(key,10,48); encGroup.add(this.planet); this.craft=mkCraftIcon(); encGroup.add(this.craft); return this; },
  tube(pts, color, rad, old){ if(old){ encGroup.remove(old); old.geometry.dispose(); } const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),Math.max(40,pts.length*2),rad,6),new THREE.MeshBasicMaterial({ color })); encGroup.add(m); return m; },
  ring(r0, r1, color, op){ const m=new THREE.Mesh(new THREE.RingGeometry(r0,r1,64),new THREE.MeshBasicMaterial({ color, transparent:true, opacity:op, side:THREE.DoubleSide, depthWrite:false })); m.rotation.x=-Math.PI/2; encGroup.add(m); return m; },
});
(rotAbout = (v,n,th)=>{ const c=Math.cos(th), s=Math.sin(th), d=V.dot(n,v), x=V.cross(n,v); return [v[0]*c+x[0]*s+n[0]*d*(1-c), v[1]*c+x[1]*s+n[1]*d*(1-c), v[2]*c+x[2]*s+n[2]*d*(1-c)]; });
}
export { encGroup, mkCraftIcon, mkArrow, setArrow, hypGeom, hypPoint, hypPoints, Enc, rotAbout, hypAtTime };
