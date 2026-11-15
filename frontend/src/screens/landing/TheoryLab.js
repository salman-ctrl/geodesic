import { $, $$ } from '../../ui/dom.js';
import { rng, V, clamp } from '../../core/physics/math.js';
import { TAU, MU_EARTH, R_EARTH, C_KMS, DAY_S } from '../../core/constants.js';
import { kepProp } from '../../core/physics/kepler.js';
import { fmtN } from '../../core/format.js';
import { Store } from '../../state/store.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/screens/landing/TheoryLab.js
// layer   screens · landing
// what    Newton / Einstein laboratory (its own small Three.js viewport)
// imports three, core/physics/kepler, core/constants, core/format, state/store, ui/dom
// ====================================================================================================

let TheoryLab;
export function initialize(){
(TheoryLab = (() => {
  const section=$('#sec-theories'), canvas=$('#theoryCanvas'), stage=$('#theoryStage');
  const vals={ newton:{mass:1,distance:2.8,velocity:1.05}, einstein:{mass:1,distance:1.5} };
  let mode='newton', playing=true, intersecting=false, drag=false, pid=-1, px=0, py=0;
  let yaw=.30, pitch=.59, wantYaw=.30, wantPitch=.59, zoom=14.8, wantZoom=14.8;
  let simT=0, tClock=0, tNear=0, tFar=0, lastRender=0, lastMetric=0, ellipsePeriod=9000, currentNewton=null;
  const rendererLab=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  rendererLab.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
  rendererLab.setClearColor(0x101936,1);
  rendererLab.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x101936,.014);
  const camera=new THREE.PerspectiveCamera(42,1,.1,140);
  const centre=new THREE.Vector3(0,0,0);
  scene.add(new THREE.HemisphereLight(0xbadbf4,0x14203e,2));
  const keyLight=new THREE.PointLight(0xf8c89f,95);keyLight.position.set(7,7,10);scene.add(keyLight);
  const fillLight=new THREE.PointLight(0x5aabde,45);fillLight.position.set(-7,4,-10);scene.add(fillLight);
  const stars=(()=>{const pts=[],random=rng(731);
    for(let i=0;i<480;i++){const a=random()*TAU,u=random()*2-1,R=22+random()*38,s=Math.sqrt(1-u*u);
      pts.push(R*s*Math.cos(a),R*u,R*s*Math.sin(a));}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    return new THREE.Points(g,new THREE.PointsMaterial({color:0xd8e8fa,size:.065,transparent:true,opacity:.65,sizeAttenuation:true,depthWrite:false}));})();
  scene.add(stars);
  const makePlanet=(color,rad)=>{
    const group=new THREE.Group(), base=new THREE.Mesh(new THREE.SphereGeometry(rad,48,32),new THREE.MeshStandardMaterial({color,roughness:.92,metalness:0,emissive:color,emissiveIntensity:.06}));group.add(base);
    const atmos=new THREE.Mesh(new THREE.SphereGeometry(rad*1.052,40,28),new THREE.MeshBasicMaterial({color:0x77d8ed,transparent:true,opacity:.085,side:THREE.BackSide,depthWrite:false}));group.add(atmos);
    const equator=new THREE.Mesh(new THREE.TorusGeometry(rad*1.015,.009,4,120),new THREE.MeshBasicMaterial({color:0x9bd7f1,transparent:true,opacity:.25}));equator.rotation.x=Math.PI/2;group.add(equator);
    return {group,base};
  };
  const newton=new THREE.Group();scene.add(newton);
  const newtonPlanet=makePlanet(0x2c81b3,1);newton.add(newtonPlanet.group);
  const orbitDisk=new THREE.Mesh(new THREE.RingGeometry(1.03,1.065,120),new THREE.MeshBasicMaterial({color:0x7ec5d8,transparent:true,opacity:.13,side:THREE.DoubleSide}));orbitDisk.rotation.x=Math.PI/2;newton.add(orbitDisk);
  const craft=new THREE.Group(); const core=new THREE.Mesh(new THREE.OctahedronGeometry(.19,0),new THREE.MeshStandardMaterial({color:0xf7e4bc,emissive:0xe2772e,emissiveIntensity:.35,roughness:.4}));craft.add(core);
  for(const side of [-1,1]){const pan=new THREE.Mesh(new THREE.BoxGeometry(.39,.028,.24),new THREE.MeshStandardMaterial({color:0x4b9fd2,emissive:0x175480,emissiveIntensity:.16}));pan.position.set(side*.42,0,0);craft.add(pan);}
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.07,.25,6),new THREE.MeshStandardMaterial({color:0xf0a36b}));nose.rotation.x=Math.PI/2;nose.position.z=-.22;craft.add(nose);
  newton.add(craft);
  const forceArrow=new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(2,0,0),.7,0x83e0d3,.16,.12);newton.add(forceArrow);
  const orbitMaterial=new THREE.LineBasicMaterial({color:0xe58a4c,transparent:true,opacity:.95});
  const orbitLine=new THREE.Line(new THREE.BufferGeometry(),orbitMaterial);orbitLine.frustumCulled=false;newton.add(orbitLine);
  const circularMaterial=new THREE.LineDashedMaterial({color:0x8bd3d3,transparent:true,opacity:.20,dashSize:.11,gapSize:.10});
  const circleGuide=new THREE.Line(new THREE.BufferGeometry(),circularMaterial);newton.add(circleGuide);
  const einstein=new THREE.Group();einstein.visible=false;scene.add(einstein);
  const einPlanet=makePlanet(0xd0a073,.8);einPlanet.group.position.y=-.05;einstein.add(einPlanet.group);
  const well=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x6b98cf,transparent:true,opacity:.46,depthWrite:false}));einstein.add(well);
  const wellRim=new THREE.Mesh(new THREE.TorusGeometry(3.2,.014,4,130),new THREE.MeshBasicMaterial({color:0x79c9d4,transparent:true,opacity:.32}));wellRim.rotation.x=Math.PI/2;wellRim.position.y=-.2;einstein.add(wellRim);
  function clock(color){const g=new THREE.Group();
    const face=new THREE.Mesh(new THREE.CircleGeometry(.34,40),new THREE.MeshBasicMaterial({color:0x0e1833,side:THREE.DoubleSide}));g.add(face);
    const bezel=new THREE.Mesh(new THREE.TorusGeometry(.36,.027,8,60),new THREE.MeshBasicMaterial({color}));g.add(bezel);
    for(let i=0;i<12;i++){const a=i*TAU/12,tick=new THREE.Mesh(new THREE.BoxGeometry(.014,i%3===0?.075:.035,.005),new THREE.MeshBasicMaterial({color:0xe5f3f8}));tick.position.set(Math.sin(a)*.282,Math.cos(a)*.282,.01);tick.rotation.z=-a;g.add(tick);}
    const hand=new THREE.Group(),bar=new THREE.Mesh(new THREE.BoxGeometry(.025,.22,.012),new THREE.MeshBasicMaterial({color}));bar.position.y=.10;hand.add(bar);hand.position.z=.03;g.add(hand);
    const hub=new THREE.Mesh(new THREE.CircleGeometry(.035,12),new THREE.MeshBasicMaterial({color:0xfbf6ec}));hub.position.z=.055;g.add(hub);
    einstein.add(g);return {g,hand}; }
  const nearClock=clock(0xf0a36b), farClock=clock(0x8acbd4);
  function updateGrid(){const mass=vals.einstein.mass, arr=[],max=8,div=23;
    const depression=(x,z)=>-1.05-1.15*Math.sqrt(mass)*Math.exp(-(x*x+z*z)/(13+mass*1.8));
    for(let j=0;j<=div;j++){const fixed=-max+2*max*j/div;
      for(let i=0;i<div;i++){
        let a=-max+2*max*i/div,b=-max+2*max*(i+1)/div;
        arr.push(a,depression(a,fixed),fixed,b,depression(b,fixed),fixed);
        arr.push(fixed,depression(fixed,a),a,fixed,depression(fixed,b),b);
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    well.geometry.dispose();well.geometry=geo;wellRim.position.y=depression(3.2,0)+.02;
    einPlanet.group.position.y=depression(0,0)+.66;
    nearClock.g.position.set(vals.einstein.distance,1.15,.4);
    farClock.g.position.set(-6,1.35,-2.8);
  }
  function clockPhysics(){const e=vals.einstein,mu=MU_EARTH*e.mass,rs=R_EARTH,ref=12*rs,r=e.distance*rs;
    const lapse=x=>Math.sqrt(Math.max(0,1-2*mu/(x*C_KMS*C_KMS)));
    const near=lapse(r),far=lapse(ref),delta=(far-near)*DAY_S*1e6;
    return {near,far,delta,rateDiff:far-near};
  }
  function newtonPhysics(){const p=vals.newton,mu=MU_EARTH*p.mass,r0=R_EARTH*p.distance,vC=Math.sqrt(mu/r0),v0=vC*p.velocity;
    const eps=v0*v0/2-mu/r0,ec=Math.abs(1-p.velocity*p.velocity),a=eps<0?-mu/(2*eps):Infinity;
    const peri=eps<0?a*(1-ec):r0;
    const state=peri<R_EARTH?'impact':eps>=0?'escape':ec<.015?'circular':'ellipse';
    const tCircle=TAU*Math.sqrt(r0*r0*r0/mu),period=isFinite(a)?TAU*Math.sqrt(a*a*a/mu):tCircle;
    return {mu,r0,v0,vC,acc:mu/(r0*r0)*1000,ec,a,peri,state,tCircle,period,R:[r0,0,0],V:[0,v0,0]};
  }
  function refreshNewton(){currentNewton=newtonPhysics();simT=0;
    const p=currentNewton,pts=[],circle=[],cap=p.state==='escape'?1.18*p.tCircle:p.state==='impact'?1.2*p.tCircle:Math.min(p.period*1.005,4*p.tCircle);
    ellipsePeriod=cap;
    for(let i=0;i<=280;i++){
      const t=cap*i/280,st=kepProp(p.R,p.V,t,p.mu),r=V.len(st.r);if(!Number.isFinite(r)||r>R_EARTH*14||r<R_EARTH*.995) break;
      pts.push(new THREE.Vector3(st.r[0]/R_EARTH,.035,st.r[1]/R_EARTH));
    }
    for(let i=0;i<=160;i++){const a=TAU*i/160,c=vals.newton.distance;circle.push(new THREE.Vector3(c*Math.cos(a),.015,c*Math.sin(a)));}
    orbitLine.geometry.dispose(); orbitLine.geometry=new THREE.BufferGeometry().setFromPoints(pts);
    circleGuide.geometry.dispose();circleGuide.geometry=new THREE.BufferGeometry().setFromPoints(circle);circleGuide.computeLineDistances();
  }
  const fields={
    newton:{ eyebrow:'Classical mechanics · 1687',title:'Gravity is a force.',description:'Every mass attracts every other mass. Move a spacecraft farther away, change its launch speed, and watch gravity reshape the orbit. The orange path is computed by the same two-body propagator used in GEODESIC missions.',formula:'a = GM / r²',metric:'Gravitational acceleration',caption:'Live acceleration at the spacecraft’s current radius; varies along eccentric orbits.',live:'Live orbit simulation',frame:'Newtonian · two-body',
      maths:'<p>Universal gravitation: F = GMm / r². Dividing by the spacecraft mass m gives the local gravitational acceleration. μ = GM is the standard gravitational parameter.</p><div class="deriv">a = μ / r²<br>v<sub>circular</sub> = √(μ / r)<br>ε = v²/2 − μ/r</div><p>Specific orbital energy ε determines a bound orbit (ε &lt; 0) or escape (ε ≥ 0). Trajectory positions are computed from the two-body Kepler equations; the visual orbit is not hand-drawn.</p>'},
    einstein:{eyebrow:'General relativity · 1915',title:'Gravity changes time.',description:'In Einstein’s theory gravity is not a force. A free-falling spacecraft follows a geodesic, the straightest possible path through curved spacetime. That is where this game gets its name. Mission navigation here stays Newtonian because, at these speeds and distances, the two descriptions differ by less than one part in a million. What relativity does change measurably is time: compare two clocks held stationary at different distances from a hypothetical spherical planet. Closer to the mass, proper time passes more slowly.',formula:'dτ/dt = √(1 − 2GM/rc²)',metric:'Clock difference over one day',caption:'Far stationary clock at 12 Earth radii minus near stationary clock. Real calculation; microseconds per 24 h of Schwarzschild coordinate time.',live:'Curved-space analogy + two clocks',frame:'Schwarzschild · stationary clocks',
      maths:'<p>For a stationary clock outside an ideal, non-rotating spherical mass, the Schwarzschild gravitational time factor is:</p><div class="deriv">dτ/dt = √(1 − 2GM/(rc²))<br>Δτ/day = (rate<sub>far</sub> − rate<sub>near</sub>) × 86,400 s</div><p>The calculation is relativistic. The curved grid is only an illustrative spatial analogy; its shape, distance compression, and the visible difference between spinning clock hands are exaggerated. Actual differences at planetary distances are far too small to see directly. Moving spacecraft require additional velocity-dependent effects.</p>'}
  };
  function refreshText(){const f=fields[mode];
    $('#theoryEyebrow').textContent=f.eyebrow;$('#theoryTitle').textContent=f.title;$('#theoryDescription').textContent=f.description;
    $('#theoryMetricName').textContent=f.metric;$('#theoryFormula').textContent=f.formula;$('#theoryFormulaCaption').textContent=f.caption;
    $('#theoryLiveLabel').textContent=f.live;$('#theoryFrameLabel').textContent=f.frame;$('#theoryDerivation').innerHTML=f.maths;
    $('[data-theory-controls="newton"]').hidden=mode!=='newton';$('[data-theory-controls="einstein"]').hidden=mode!=='einstein';
    $('#theoryClockHud').hidden=mode!=='einstein';
    newton.visible=mode==='newton';einstein.visible=mode==='einstein';
    for(const b of $$('[data-theory-tab]')) {const active=b.dataset.theoryTab===mode;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
    $('#theoryPanel').setAttribute('aria-labelledby',mode==='newton'?'newtonTab':'einsteinTab');
    $('#theoryMath').open=false;
    refreshNumbers();
  }
  function refreshNumbers(){const n=vals.newton,e=vals.einstein;
    $('#nMassOut').textContent=n.mass.toFixed(1)+' × Earth';$('#nDistanceOut').textContent=n.distance.toFixed(1)+' R⊕';
    $('#nVelocityOut').textContent=n.velocity.toFixed(2)+' × circular';
    $('#eMassOut').textContent=e.mass.toFixed(1)+' × Earth';$('#eDistanceOut').textContent=e.distance.toFixed(1)+' R⊕';
    if(mode==='newton'){
      const p=currentNewton||newtonPhysics(), stateNames={impact:'Impact trajectory',ellipse:'Elliptical orbit',circular:'Nearly circular orbit',escape:'Escape trajectory'};
      $('#theoryMetric').innerHTML=fmtN(p.acc,3)+' <span>m/s²</span>';
      $('#theoryStateTitle').textContent=stateNames[p.state];
      $('#theoryStateDetail').textContent=`Circular speed ${fmtN(p.vC,2)} km/s · launched at ${fmtN(p.v0,2)} km/s`+(p.state==='impact'?' · path intersects the surface':p.state==='escape'?' · positive orbital energy':' · eccentricity '+p.ec.toFixed(2));
    }else{
      const c=clockPhysics();$('#theoryMetric').innerHTML=fmtN(c.delta,2)+' <span>µs / day</span>';
      $('#clockNear').textContent=c.near.toFixed(12)+' ×';$('#clockFar').textContent=c.far.toFixed(12)+' ×';
      $('#theoryStateTitle').textContent='Closer clock runs slower';
      $('#theoryStateDetail').textContent=`Near clock: ${e.distance.toFixed(1)} R⊕ · far clock: 12.0 R⊕. Clock-hand difference magnified ×10⁹ for visibility.`;
    }
  }
  function updateParams(which){if(which==='newton')refreshNewton();else updateGrid();refreshNumbers();}
  for(const b of $$('[data-theory-tab]')){b.addEventListener('click',()=>setMode(b.dataset.theoryTab));
    b.addEventListener('keydown',ev=>{if(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight'&&ev.key!=='Home'&&ev.key!=='End')return;
      const m=(ev.key==='ArrowLeft'||ev.key==='Home')?'newton':'einstein';setMode(m);$(`[data-theory-tab="${m}"]`).focus();ev.preventDefault();});}
  function setMode(m){if(mode===m)return;mode=m;wantYaw=.30;wantPitch=m==='newton'?.59:.78;wantZoom=m==='newton'?14.8:18.6;
    refreshText();}
  for(const [sel,key,modeKey] of [['#nMass','mass','newton'],['#nDistance','distance','newton'],['#nVelocity','velocity','newton'],['#eMass','mass','einstein'],['#eDistance','distance','einstein']]){
    $(sel).addEventListener('input',ev=>{vals[modeKey][key]=+ev.target.value;updateParams(modeKey);});}
  const togglePlay=()=>{playing=!playing;$('#theoryPlay').textContent=playing?'Ⅱ Pause motion':'▶ Resume motion';$('#theoryPlay').setAttribute('aria-pressed',String(!playing));};
  $('#theoryPlay').onclick=togglePlay;
  $('#theoryReset').onclick=()=>{Object.assign(vals.newton,{mass:1,distance:2.8,velocity:1.05});Object.assign(vals.einstein,{mass:1,distance:1.5});
    for(const [id,k] of [['nMass','mass'],['nDistance','distance'],['nVelocity','velocity']])$('#'+id).value=vals.newton[k];
    for(const [id,k] of [['eMass','mass'],['eDistance','distance']])$('#'+id).value=vals.einstein[k];
    simT=0;tClock=0;tNear=0;tFar=0;refreshNewton();updateGrid();refreshNumbers();};
  $('#theoryView').onclick=()=>{wantYaw=.3;wantPitch=mode==='newton'?.59:.78;wantZoom=mode==='newton'?14.8:18.6;};
  const pointerPos=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/Math.max(1,r.width),(e.clientY-r.top)/Math.max(1,r.height)];};
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag=true;pid=e.pointerId;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pid)return;wantYaw-=(e.clientX-px)*.008;wantPitch=clamp(wantPitch+(e.clientY-py)*.006,-.08,1.45);px=e.clientX;py=e.clientY;e.preventDefault();});
  const endDrag=e=>{if(e.pointerId!==pid)return;drag=false;pid=-1;canvas.classList.remove('dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('wheel',e=>{wantZoom=clamp(wantZoom+Math.sign(e.deltaY)*1.0,9.5,25);e.preventDefault();},{passive:false});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home',' '].includes(e.key))return;
    if(e.key==='ArrowLeft')wantYaw+=.18;if(e.key==='ArrowRight')wantYaw-=.18;
    if(e.key==='ArrowUp')wantPitch=clamp(wantPitch+.13,-.08,1.45);
    if(e.key==='ArrowDown')wantPitch=clamp(wantPitch-.13,-.08,1.45);
    if(e.key==='Home'){wantYaw=.3;wantPitch=mode==='newton'?.59:.78;wantZoom=mode==='newton'?14.8:18.6;}
    if(e.key===' ')togglePlay();e.preventDefault();});
  function updateNewtonPosition(dt){if(!currentNewton)return;const p=currentNewton;
    if(playing)simT+=dt*(ellipsePeriod/14);
    if(simT>ellipsePeriod)simT=0;
    let st=kepProp(p.R,p.V,simT,p.mu),r=V.len(st.r);
    if(!Number.isFinite(r)||r<R_EARTH||r>R_EARTH*14){simT=0;st={r:p.R,v:p.V};}
    craft.position.set(st.r[0]/R_EARTH,.09,st.r[1]/R_EARTH);
    const tangent=new THREE.Vector3(st.v[0],0,st.v[1]).normalize();
    if(tangent.lengthSq()>.01)craft.rotation.y=Math.atan2(-tangent.x,-tangent.z);
    const gravDir=craft.position.clone().multiplyScalar(-1);gravDir.y=0;gravDir.normalize();
    forceArrow.position.copy(craft.position);forceArrow.setDirection(gravDir);
    const g0=p.mu/(r*r)*1000;forceArrow.setLength(clamp(.35+g0*.30,.36,2.6),.22,.13);
    if(performance.now()-lastMetric>130){lastMetric=performance.now();$('#theoryMetric').innerHTML=fmtN(g0,3)+' <span>m/s²</span>';}
    if(playing)newtonPlanet.base.rotation.y+=dt*.035;
  }
  function updateEinsteinPosition(dt){const c=clockPhysics();if(playing)tClock+=dt;
    nearClock.g.quaternion.copy(camera.quaternion);farClock.g.quaternion.copy(camera.quaternion);
    // Only a teaching animation: amplify the near/far fractional rate difference by 10^9.
    const nearSpeed=Math.max(.13,1-Math.min(.87,c.rateDiff*1e9));
    if(playing){tFar+=dt*.75;tNear+=dt*.75*nearSpeed;einPlanet.base.rotation.y+=dt*.025;}
    farClock.hand.rotation.z=-tFar;
    nearClock.hand.rotation.z=-tNear;
  }
  function size(){const r=stage.getBoundingClientRect(),w=Math.max(10,Math.round(r.width)),h=Math.max(10,Math.round(r.height));
    rendererLab.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(size).observe(stage);
  new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting&&entries[0].intersectionRatio>.035;},{threshold:[0,.05,.2,.5]}).observe(section);
  function update(dt){if(Store.session.screen!=='landing'||!intersecting||document.hidden)return;
    yaw+= (wantYaw-yaw)*Math.min(1,dt*7);pitch+=(wantPitch-pitch)*Math.min(1,dt*7);zoom+=(wantZoom-zoom)*Math.min(1,dt*6);
    camera.position.set(Math.sin(yaw)*Math.cos(pitch)*zoom,Math.sin(pitch)*zoom,Math.cos(yaw)*Math.cos(pitch)*zoom);
    camera.lookAt(centre);
    if(mode==='newton')updateNewtonPosition(dt);else updateEinsteinPosition(dt);
    lastRender+=dt;if(lastRender>1/45){lastRender=0;rendererLab.render(scene,camera);}
  }
  size();refreshNewton();updateGrid();refreshText();
  return { update, setMode, clockPhysics, newtonPhysics };
})());
}
export { TheoryLab };
