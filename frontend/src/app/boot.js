import { rocketRig, craftRig } from '../three/worlds/padWorld.js';
import { Sound } from '../ui/sound.js';
import { setTheme } from '../ui/theme.js';
import { resize, useWorld, pad, space } from '../three/renderer.js';
import { go, Screens } from './router.js';
import { frame, fps } from './loop.js';
import { S, Store } from '../state/store.js';
import { bestDirect, currentRoute } from '../state/selectors.js';
import { dayFromDate } from '../core/physics/time.js';
import { TheoryLab } from '../screens/landing/TheoryLab.js';

// ====================================================================================================
// MODULE  src/main.js
// layer   app
// what    boot
// imports everything above
// ====================================================================================================


export function initialize(){
rocketRig.onSnap = craftRig.onSnap = ()=>Sound.snap();
setTheme('night');
resize();
useWorld(pad);
go('landing');
requestAnimationFrame(frame);
window.GEO = { S, store:Store, go, pad, space, rocketRig, craftRig, get fps(){ return fps; }, launchSim:()=>Store.session.launchSim, bestDirect, dayOf:dayFromDate, route:()=>currentRoute(), screen:()=>Store.session.screen, get flight(){ return Store.session.flight; }, Screens, TheoryLab };
}

