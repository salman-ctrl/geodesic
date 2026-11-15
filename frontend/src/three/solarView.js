import { V3, flyTo, space } from './renderer.js';
import { solarGroup } from './worlds/spaceWorld.js';
import { h } from '../ui/dom.js';
import { outlineMat, COL } from './materials.js';
import { PLANET_ORDER, BODIES } from '../core/data/bodies.js';
import { makePlanet } from './models/planet.js';
import { elementsAt, moonState, planetState } from '../core/physics/ephemeris.js';
import { dayFromDate, fmtDate } from '../core/physics/time.js';
import { TAU } from '../core/constants.js';
import { legState } from '../core/physics/route.js';
import { lerp, clamp } from '../core/physics/math.js';
import { mkCraftIcon } from './encounter.js';

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
// ====================================================================================================
// MODULE  src/three/solarView.js
// layer   three · no game logic
// what    solar-system view shared by route planner and cruise: planets, orbits, route tubes, craft marker
// imports three, renderer, models/planet, three/encounter (craft icon), core/physics/*, ui/dom
// ====================================================================================================

let SCALE, GEO_K, mapHelio, mapGeo, mapFrame, helioGroup, geoGroup, routeGroup, mkLabel, Sol, craftMark, predLine, missLabel;
export function initialize(){
(SCALE = 60);
(GEO_K = 150/384400);
(mapHelio = p=>{ const r=Math.hypot(p[0],p[1],p[2])||1e-9, f=SCALE/Math.sqrt(r); return new V3(p[0]*f,p[2]*f,-p[1]*f); });
(mapGeo = p=>new V3(p[0]*GEO_K,p[2]*GEO_K,-p[1]*GEO_K));
(mapFrame = (frame,p)=>frame==='geo'? mapGeo(p) : mapHelio(p));
(helioGroup = new THREE.Group());
(geoGroup = new THREE.Group());
(routeGroup = new THREE.Group());
solarGroup.add(helioGroup,geoGroup,routeGroup);
(mkLabel = (text,cls='')=>{ const o=new CSS2DObject(h(`<div class="wlabel ${cls}">${text}</div>`)); o.center.set(.5,1); return o; });
(Sol = {
  planets:{}, frame:'helio', day:0, viewR:120, legs:[], reveal:1,
  onPlanetClick:null,          // hook: set by whichever screen wants planet-label clicks
  build(){
    const sun=new THREE.Mesh(new THREE.SphereGeometry(5.2,32,20),new THREE.MeshBasicMaterial({ color:0xf6b545 })); sun.add(new THREE.Mesh(sun.geometry,outlineMat(.28)));
    const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'), gr=g.createRadialGradient(64,64,6,64,64,64); gr.addColorStop(0,'rgba(246,181,69,.75)'); gr.addColorStop(.35,'rgba(226,119,46,.28)'); gr.addColorStop(1,'rgba(226,119,46,0)'); g.fillStyle=gr; g.fillRect(0,0,128,128);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false })); glow.scale.setScalar(44); helioGroup.add(glow,sun);
    for(const k of PLANET_ORDER){ const b=BODIES[k], g=makePlanet(k,b.draw,28); g.userData.key=k; g.traverse(o=>o.userData.key=k); helioGroup.add(g);
      const lab=mkLabel(b.name); lab.element.dataset.k=k; lab.position.set(0,b.draw*1.5+1,0); g.add(lab); lab.element.addEventListener('click',()=>{ if(Sol.onPlanetClick) Sol.onPlanetClick(k); });
      const el=elementsAt(k,dayFromDate(2035,1,1)), pts=[]; for(let i=0;i<180;i++){ const E=i/180*TAU, w=el.wp-el.Om, x=el.a*(Math.cos(E)-el.e), y=el.a*Math.sqrt(1-el.e*el.e)*Math.sin(E), cw=Math.cos(w), sw=Math.sin(w), cO=Math.cos(el.Om), sO=Math.sin(el.Om), cI=Math.cos(el.I), sI=Math.sin(el.I);
        pts.push(mapHelio([(cw*cO-sw*sO*cI)*x+(-sw*cO-cw*sO*cI)*y,(cw*sO+sw*cO*cI)*x+(-sw*sO+cw*cO*cI)*y,(sw*sI)*x+(cw*sI)*y])); }
      helioGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({ color:0xfbf6ec, transparent:true, opacity:.2 })));
      this.planets[k]=g; }
    const earth=makePlanet('earth',6378.137*GEO_K,36), moon=makePlanet('moon',2.1,28), ring=[]; for(let i=0;i<160;i++){ const a=i/160*TAU; ring.push(new V3(Math.cos(a)*150,0,Math.sin(a)*150)); }
    const le=mkLabel('Earth','static'); le.position.y=5; earth.add(le); const lm=mkLabel('Moon','static'); lm.position.y=5; moon.add(lm);
    geoGroup.add(earth,moon,new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring),new THREE.LineBasicMaterial({ color:0xfbf6ec, transparent:true, opacity:.2 }))); this.earthG=earth; this.moonG=moon;
  },
  setFrame(f){ this.frame=f; helioGroup.visible=f==='helio'; geoGroup.visible=f==='geo'; },
  setDate(d){ this.day=d; if(this.frame==='geo') this.moonG.position.copy(mapGeo(moonState(d).r)); else for(const k of PLANET_ORDER) this.planets[k].position.copy(mapHelio(planetState(k,d).r)); },
  bodyPos(key,d){ return this.frame==='geo'? (key==='moon'? mapGeo(moonState(d).r) : new V3()) : mapHelio(planetState(key,d).r); },
  legPoints(leg, n=72, t0=leg.t0, t1=leg.t0+leg.tof){ const pts=[]; for(let i=0;i<=n;i++) pts.push(mapFrame(leg.frame,legState(leg,lerp(t0,t1,i/n)).r)); return pts; },
  clearRoute(){ for(const o of [...routeGroup.children]){ routeGroup.remove(o); o.traverse(x=>{ if(x.geometry) x.geometry.dispose(); if(x.isCSS2DObject) x.element.remove(); }); } this.legs=[]; },
  // Draw the legs as flame-coloured tubes with a ghost marker where each planet will be at encounter time.
  setRoute(rt, animate=true){
    this.clearRoute(); if(!rt) return; const rad=this.viewR*.0042;
    rt.legs.forEach((leg,i)=>{ const pts=this.legPoints(leg, leg.res? 120:72), geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*2,rad,6);
      const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({ color:i%2? 0xf0a36b : COL.flame })); m.userData.count=geo.index.count; routeGroup.add(m); this.legs.push(m);
      const end=pts[pts.length-1], last=i===rt.legs.length-1, b=BODIES[leg.to], gh=new THREE.Mesh(new THREE.SphereGeometry(Math.max(rad*2.2,this.frame==='geo'? 1.2 : b.draw*.45),16,12),new THREE.MeshBasicMaterial({ color:b.col, transparent:true, opacity:.55 })); gh.position.copy(end);
      const lab=mkLabel(`${last?'Arrive':b.name+' flyby'} · ${fmtDate(leg.t0+leg.tof)}`,'ghost'), dn=i%2===0; lab.position.y=(dn?-1:1)*(this.frame==='geo'? 4 : b.draw*.45+2); lab.center.set(.5,dn?0:1); gh.add(lab); routeGroup.add(gh); });
    this.reveal=animate? 0 : 1; this.applyReveal();
  },
  applyReveal(){ const n=this.legs.length; this.legs.forEach((m,i)=>{ const k=clamp(this.reveal*n-i,0,1); m.geometry.setDrawRange(0,Math.floor(m.userData.count*k/3)*3); }); },
  update(dt){ if(this.reveal<1){ this.reveal=Math.min(1,this.reveal+dt/(.45*Math.max(1,this.legs.length))); this.applyReveal(); }
    if(this.frame==='helio') for(const k of PLANET_ORDER) this.planets[k].userData.ball.rotation.y+=dt*.2; else { this.earthG.userData.ball.rotation.y+=dt*.2; } },
  view(viewR, sec=1.5, shiftY=.13){ this.viewR=viewR; return flyTo(space,new V3(0,viewR*1.95,viewR*1.7),new V3(0,0,0),sec,0,shiftY); },
  viewRadiusFor(mission, flybys=[]){ if(mission==='moon') return 175; const a=Math.max(...['earth',mission,...flybys].map(k=>BODIES[k].el[0])); return SCALE*Math.sqrt(a)*1.22; },
});
Sol.build();
(craftMark = mkCraftIcon());
craftMark.visible=false;
solarGroup.add(craftMark);
(predLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(41*3),3)),new THREE.LineDashedMaterial({ color:0xfbf6ec, dashSize:2.2, gapSize:1.5 })));
predLine.frustumCulled=false;
predLine.visible=false;
solarGroup.add(predLine);
(missLabel = mkLabel('', 'ghost'));
missLabel.element.style.color='#fbf6ec';
missLabel.visible=false;
solarGroup.add(missLabel);
}
export { SCALE, GEO_K, mapHelio, mapGeo, mapFrame, helioGroup, geoGroup, routeGroup, mkLabel, Sol, craftMark, predLine, missLabel };
