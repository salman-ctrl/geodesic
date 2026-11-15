import { lerp } from '../core/physics/math.js';
import { runTweens } from '../ui/tween.js';
import { runNums } from '../ui/telemetry.js';
import { cur } from './router.js';
import { Stage, applyShift, renderer } from '../three/renderer.js';

// ====================================================================================================
// MODULE  src/app/loop.js
// layer   app
// what    the frame loop: tweens, numbers, active screen, render
// imports app/router, ui/tween, ui/telemetry, three/renderer
// ====================================================================================================

let lastT, fps;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-lastT)/1000); lastT=now; fps=lerp(fps,1/Math.max(dt,1e-3),.05);
  runTweens(dt); runNums(dt);
  if(cur&&cur.update) cur.update(dt);
  if(Stage.world.controls.enabled&&!Stage.world.flying) Stage.world.controls.update();
  if(Stage.renderOn){ applyShift(Stage.world); renderer.render(Stage.world.scene,Stage.world.camera); Stage.world.labelR.render(Stage.world.scene,Stage.world.camera); }
}
export function initialize(){
(lastT = performance.now());
(fps = 60);
}
export { lastT, fps, frame };
