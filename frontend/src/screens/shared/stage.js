import { pad, flyTo, useWorld, Stage, bgTo, colorTo, space, stopFly } from '../../three/renderer.js';
import { setTheme, fadeThrough } from '../../ui/theme.js';
import { heroSky, tower, padGroup, ground, platform, craftStand, craftRig, rocketRig, rebuildRocket } from '../../three/worlds/padWorld.js';
import { selGroup, solarGroup } from '../../three/worlds/spaceWorld.js';
import { cutPlane } from '../../three/materials.js';
import { S } from '../../state/store.js';
import { encGroup, Enc } from '../../three/encounter.js';

// ====================================================================================================
// MODULE  src/screens/shared/stage.js
// layer   screens · shared
// what    scene changes shared by several screens (studio, night pad, solar system, encounter)
// imports three/*, ui/theme, ui/tween, state/store
// ====================================================================================================


function zoomBy(f){ const t=pad.controls.target.clone(), p=pad.camera.position.clone().sub(t).multiplyScalar(f).add(t); return flyTo(pad,p,t,.8,pad.shift.x,pad.shift.y); }
async function enterStudio(camPos, tgt, sec, sx=0, sy=0){
  const setup=()=>{ useWorld(pad); setTheme('paper'); heroSky.visible=false; tower.visible=false; padGroup.visible=true; ground.visible=true; };
  if(Stage.world!==pad){ await fadeThrough(()=>{ setup(); pad.scene.background.set(0xfbf6ec); ground.material.color.set(0xf1e8d6); pad.camera.position.copy(camPos).multiplyScalar(1.5); pad.controls.target.copy(tgt); pad.camera.lookAt(tgt); pad.shift.x=sx; pad.shift.y=sy; },'#fbf6ec'); }
  else { setup(); bgTo(pad,0xfbf6ec,sec*.7); colorTo(ground.material.color,0xf1e8d6,sec*.7); }
  await flyTo(pad,camPos,tgt,sec,sx,sy);
  const c=pad.controls; c.enabled=true; c.maxPolarAngle=Math.PI*.53; c.minPolarAngle=.25;
}
async function enterSpace(setup){ const run=()=>{ useWorld(space); setTheme('night'); space.scene.background.set(0x141b3a); selGroup.visible=false; solarGroup.visible=true; space.camera.up.set(0,1,0); setup&&setup(); };
  if(Stage.world!==space) await fadeThrough(run); else run(); }
async function enterPadNight(camPos, tgt, sx){
  const setup=()=>{ useWorld(pad); setTheme('night'); heroSky.visible=true; tower.visible=true; padGroup.visible=true; platform.visible=true; craftStand.visible=false; ground.visible=true; pad.scene.add(padGroup); padGroup.position.set(0,0,0); padGroup.rotation.set(0,0,0);
    craftRig.setVisible(false); rocketRig.setVisible(true); rocketRig.explode(false); rocketRig.root.position.x=0; cutPlane.constant=1e6; rebuildRocket(S,true); rocketRig.settle(); pad.controls.enabled=false; };
  if(Stage.world!==pad){ await fadeThrough(()=>{ setup(); pad.scene.background.set(0x141b3a); ground.material.color.set(0x1b2448); pad.camera.position.copy(camPos).multiplyScalar(1.3); pad.controls.target.copy(tgt); pad.camera.lookAt(tgt); pad.shift.x=sx; pad.shift.y=0; }); }
  else { setup(); bgTo(pad,0x141b3a,1); colorTo(ground.material.color,0x1b2448,1); }
  await flyTo(pad,camPos,tgt,1.6,sx,0);
}
async function enterEncounter(key, dist){ const run=()=>{ useWorld(space); setTheme('night'); space.scene.background.set(0x0f1533); selGroup.visible=false; solarGroup.visible=false; encGroup.visible=true; Enc.setup(key);
    stopFly(space); space.controls.enabled=false; space.controls.target.set(0,0,0); space.camera.up.set(0,1,0); space.camera.position.set(0,dist*1.15,dist*.62); space.camera.lookAt(0,0,0); space.shift.x=0; space.shift.y=.03; };
  await fadeThrough(run,'#0f1533'); }
export function initialize(){
}
export { zoomBy, enterStudio, enterSpace, enterPadNight, enterEncounter };
