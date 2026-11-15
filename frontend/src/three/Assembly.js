import { COL, disposeGroup } from './materials.js';
import { V3, _o } from './renderer.js';
import { h } from '../ui/dom.js';
import { fmtMass } from '../core/format.js';
import { clamp } from '../core/physics/math.js';

import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
// ====================================================================================================
// MODULE  src/three/Assembly.js
// layer   three · no game logic
// what    assembly rig: springs parts into place, exploded view, leader lines and hover cards
// imports three, materials, ui/dom, core/format
// ====================================================================================================
// ---- assembly rig: springs parts into place, exploded view, leader lines + hover cards ----

let V3_UP;
class Assembly {
  constructor(w, unit=1){ this.w=w; this.unit=unit; this.root=new THREE.Group(); w.scene.add(this.root); this.parts=new Map(); this.E=0; this.Et=0; this.on=true;
    this.lineGeo=new THREE.BufferGeometry(); this.lineGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6*32),3));
    this.lineMat=new THREE.LineBasicMaterial({ color:COL.ink, transparent:true }); this.lines=new THREE.LineSegments(this.lineGeo,this.lineMat); this.lines.frustumCulled=false; w.scene.add(this.lines);
    this.arrowMat=new THREE.MeshBasicMaterial({ color:COL.ink, transparent:true }); this.arrowGeo=new THREE.ConeGeometry(.22*unit,.75*unit,10); }
  setInk(c){ this.lineMat.color.set(c); this.arrowMat.color.set(c); }
  drop(rec){ this.root.remove(rec.g); disposeGroup(rec.g); if(rec.labelObj){ rec.labelObj.removeFromParent(); rec.labelObj.element.remove(); this.w.scene.remove(rec.arrow); } }
  set(spec, instant=false){
    const seen=new Set(); let li=0; const labelled=[];
    for(const p of spec.parts){ seen.add(p.id); const old=this.parts.get(p.id);
      const rec={ ...p, pos: old? old.pos.clone() : instant? p.home.clone() : p.home.clone().add(p.spawn), vel:new V3() };
      if(old) this.drop(old); else if(!instant&&this.onSnap) this.onSnap();
      p.g.position.copy(rec.pos); this.root.add(p.g);
      if(p.label){ const L=p.label, el=h(`<div class="plabel"><div class="n">${L.name}</div><div class="card"><p>${L.fn}</p>${L.mass? `<div class="tl"><span class="k">Mass</span><span class="d"></span><span class="v">${fmtMass(L.mass)}</span></div>`:''}${L.prop? `<div class="tl"><span class="k">Propellant</span><span class="d"></span><span class="v">${fmtMass(L.prop)}</span></div>`:''}</div></div>`);
        rec.labelObj=new CSS2DObject(el); this.w.scene.add(rec.labelObj); rec.arrow=new THREE.Mesh(this.arrowGeo,this.arrowMat); this.w.scene.add(rec.arrow); labelled.push(rec); }
      this.parts.set(p.id,rec); }
    for(const [id,old] of this.parts) if(!seen.has(id)){ this.drop(old); this.parts.delete(id); }
    labelled.sort((a,b)=>a.home.y-b.home.y); for(const r of labelled){ r.side=r.label.side|| (li++%2? 1:-1); r.labelObj.center.set(r.side>0?0:1,0); r.labelObj.element.classList.toggle('l',r.side<0); }
    this.setVisible(this.on);
  }
  clear(){ for(const r of this.parts.values()) this.drop(r); this.parts.clear(); }
  setVisible(v){ this.on=v; this.root.visible=v; for(const r of this.parts.values()) if(r.labelObj){ r.labelObj.visible=v; r.arrow.visible=v; } this.lines.visible=v; }
  explode(v){ this.Et=v?1:0; }
  update(dt, cam){
    if(!this.on) return; this.E+=(this.Et-this.E)*Math.min(1,dt*5); const k=this.E, u=this.unit, arr=this.lineGeo.attributes.position.array; let li=0;
    const right=_o.setFromMatrixColumn(cam.matrixWorld,0).clone(), op=clamp((k-.35)/.5,0,1), tgt=new V3(), a=new V3(), e=new V3(), l=new V3();
    for(const p of this.parts.values()){
      tgt.copy(p.home).addScaledVector(p.ex,k); p.vel.addScaledVector(tgt.sub(p.pos),150*dt).multiplyScalar(Math.max(0,1-17*dt)); p.pos.addScaledVector(p.vel,dt); p.g.position.copy(p.pos);
      if(!p.labelObj) continue;
      a.copy(p.pos); a.y+=p.anchorY||0; this.root.localToWorld(a); const rr=(p.r||1)*this.root.scale.x+.25*u;
      e.copy(a).addScaledVector(right,p.side*rr); l.copy(a).addScaledVector(right,p.side*(rr+4.2*u));
      p.labelObj.position.copy(l); p.labelObj.element.style.opacity=op; p.labelObj.element.style.pointerEvents=op>.8?'auto':'none';
      arr[li*6]=l.x-right.x*p.side*.3*u; arr[li*6+1]=l.y; arr[li*6+2]=l.z-right.z*p.side*.3*u; arr[li*6+3]=e.x+right.x*p.side*.6*u; arr[li*6+4]=e.y; arr[li*6+5]=e.z+right.z*p.side*.6*u; li++;
      p.arrow.position.copy(e).addScaledVector(right,p.side*.35*u); p.arrow.quaternion.setFromUnitVectors(V3_UP,tgt.copy(right).multiplyScalar(-p.side)); p.arrow.visible=op>.02;
    }
    this.lineGeo.setDrawRange(0,li*2); this.lineGeo.attributes.position.needsUpdate=true; this.lineMat.opacity=this.arrowMat.opacity=op; this.lines.visible=op>.02;
  }
  settle(){ for(const p of this.parts.values()){ p.pos.copy(p.home).addScaledVector(p.ex,this.Et); p.vel.set(0,0,0); p.g.position.copy(p.pos); } this.E=this.Et; }
}
export function initialize(){
(V3_UP = new V3(0,1,0));
}
export { Assembly, V3_UP };
