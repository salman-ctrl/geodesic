import { space, V3 } from '../renderer.js';
import { makeStars, makePlanet } from '../models/planet.js';
import { MISSION_ORDER } from '../../core/data/missions.js';

import * as THREE from 'three';
// ====================================================================================================
// MODULE  src/three/worlds/spaceWorld.js
// layer   three · no game logic
// what    the space world: lights, stars, mission-select planets, the solar-system group
// imports three, renderer, models/planet, core/data/missions
// ====================================================================================================

let spaceSun, spaceStars, selGroup, solarGroup, selPlanets;
function screenToWorld(w, sx, sy, dist){ w.camera.updateMatrixWorld(); const v=new V3(sx/innerWidth*2-1,-(sy/innerHeight)*2+1,.5).unproject(w.camera).sub(w.camera.position).normalize(); return w.camera.position.clone().addScaledVector(v,dist); }
export function initialize(){
space.scene.add(new THREE.HemisphereLight(0xffffff,0x39406a,1.15));
(spaceSun = new THREE.DirectionalLight(0xffffff,1.9));
spaceSun.position.set(-40,60,50);
space.scene.add(spaceSun);
(spaceStars = makeStars(1800, 9000, 1.4));
space.scene.add(spaceStars);
(selGroup = new THREE.Group());
(solarGroup = new THREE.Group());
space.scene.add(selGroup, solarGroup);
solarGroup.visible=false;
(selPlanets = MISSION_ORDER.map((k,i)=>{ const g=makePlanet(k,[1.05,1.15,1.6,1.1,1.3][i]); g.scale.setScalar(.01); selGroup.add(g); return g; }));
}
export { spaceSun, spaceStars, selGroup, solarGroup, selPlanets, screenToWorld };
