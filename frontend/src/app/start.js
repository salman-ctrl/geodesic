import { initialize as init0 } from '../state/store.js';
import { initialize as init1 } from '../ui/dom.js';
import { initialize as init2 } from '../ui/tween.js';
import { initialize as init3 } from '../ui/telemetry.js';
import { initialize as init4 } from '../ui/toast.js';
import { initialize as init5 } from '../ui/sound.js';
import { initialize as init6 } from '../ui/theme.js';
import { initialize as init7 } from '../ui/callout.js';
import { initialize as init8 } from '../ui/modal.js';
import { initialize as init9 } from '../ui/tray.js';
import { initialize as init10 } from '../three/renderer.js';
import { initialize as init11 } from '../three/materials.js';
import { initialize as init12 } from '../three/models/planet.js';
import { initialize as init13 } from '../three/models/spacecraft.js';
import { initialize as init14 } from '../three/models/rocket.js';
import { initialize as init15 } from '../three/Assembly.js';
import { initialize as init16 } from '../three/worlds/padWorld.js';
import { initialize as init17 } from '../three/picking.js';
import { initialize as init18 } from './router.js';
import { initialize as init19 } from './loop.js';
import { initialize as init20 } from '../state/selectors.js';
import { initialize as init21 } from '../ui/crew.js';
import { initialize as init22 } from '../screens/shared/stage.js';
import { initialize as init23 } from '../screens/landing.js';
import { initialize as init24 } from '../ui/cursor.js';
import { initialize as init25 } from '../ui/validationPanel.js';
import { initialize as init26 } from '../ui/sources.js';
import { initialize as init27 } from '../screens/landing/TheoryLab.js';
import { initialize as init28 } from '../screens/landing/gaDiagram.js';
import { initialize as init29 } from '../screens/landing/classroom.js';
import { initialize as init30 } from '../three/worlds/spaceWorld.js';
import { initialize as init31 } from '../screens/select.js';
import { initialize as init32 } from '../screens/builder.js';
import { initialize as init33 } from '../screens/craft.js';
import { initialize as init34 } from '../three/solarView.js';
import { initialize as init35 } from '../screens/route.js';
import { initialize as init36 } from '../screens/gonogo.js';
import { initialize as init37 } from '../game/flight.js';
import { initialize as init38 } from '../three/launchSite.js';
import { initialize as init39 } from '../screens/launch.js';
import { initialize as init40 } from '../three/encounter.js';
import { initialize as init41 } from '../screens/cruise.js';
import { initialize as init42 } from '../screens/flyby.js';
import { initialize as init43 } from '../screens/arrival.js';
import { initialize as init44 } from '../three/landingSite.js';
import { initialize as init45 } from '../screens/descent.js';
import { initialize as init46 } from '../ui/patch.js';
import { initialize as init47 } from '../ui/physicsReport.js';
import { initialize as init48 } from '../screens/report.js';
import { initialize as init49 } from './challengeLink.js';
import { initialize as init50 } from '../ui/physicsDock.js';
import { initialize as init51 } from '../ui/tutorial.js';
import { initialize as init52 } from './boot.js';
import { installClassroomReport } from '../classroom/mount.jsx';

let started=false;
export function startGame(){
  if(started)return;
  started=true;
  init0(); // src/state/store.js
  init1(); // src/ui/dom.js
  init2(); // src/ui/tween.js
  init3(); // src/ui/telemetry.js
  init4(); // src/ui/toast.js
  init5(); // src/ui/sound.js
  init6(); // src/ui/theme.js
  init7(); // src/ui/callout.js
  init8(); // src/ui/modal.js
  init9(); // src/ui/tray.js
  init10(); // src/three/renderer.js
  init11(); // src/three/materials.js
  init12(); // src/three/models/planet.js
  init13(); // src/three/models/spacecraft.js
  init14(); // src/three/models/rocket.js
  init15(); // src/three/Assembly.js
  init16(); // src/three/worlds/padWorld.js
  init17(); // src/three/picking.js
  init18(); // src/app/router.js
  init19(); // src/app/loop.js
  init20(); // src/state/selectors.js
  init21(); // src/ui/crew.js
  init22(); // src/screens/shared/stage.js
  init23(); // src/screens/landing.js
  init24(); // src/ui/cursor.js
  init25(); // src/ui/validationPanel.js
  init26(); // src/ui/sources.js
  init27(); // src/screens/landing/TheoryLab.js
  init28(); // src/screens/landing/gaDiagram.js
  init29(); // src/screens/landing/classroom.js
  init30(); // src/three/worlds/spaceWorld.js
  init31(); // src/screens/select.js
  init32(); // src/screens/builder.js
  init33(); // src/screens/craft.js
  init34(); // src/three/solarView.js
  init35(); // src/screens/route.js
  init36(); // src/screens/gonogo.js
  init37(); // src/game/flight.js
  init38(); // src/three/launchSite.js
  init39(); // src/screens/launch.js
  init40(); // src/three/encounter.js
  init41(); // src/screens/cruise.js
  init42(); // src/screens/flyby.js
  init43(); // src/screens/arrival.js
  init44(); // src/three/landingSite.js
  init45(); // src/screens/descent.js
  init46(); // src/ui/patch.js
  init47(); // src/ui/physicsReport.js
  init48(); // src/screens/report.js
  init49(); // src/app/challengeLink.js
  init50(); // src/ui/physicsDock.js
  init51(); // src/ui/tutorial.js
  init52(); // src/app/boot.js
  installClassroomReport();
}
