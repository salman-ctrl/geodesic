import { useEffect } from 'react';
import { startGame } from './app/start.js';
import Landing from './screens/Landing.jsx';
import Select from './screens/Select.jsx';
import Builder from './screens/Builder.jsx';
import Craft from './screens/Craft.jsx';
import Route from './screens/Route.jsx';
import GoNoGo from './screens/GoNoGo.jsx';
import Launch from './screens/Launch.jsx';
import Cruise from './screens/Cruise.jsx';
import Flyby from './screens/Flyby.jsx';
import Arrival from './screens/Arrival.jsx';
import Descent from './screens/Descent.jsx';
import Report from './screens/Report.jsx';
import PhysicsInsights from './screens/PhysicsInsights.jsx';
import PassDevice from './screens/PassDevice.jsx';
import Modal from './screens/Modal.jsx';
import Tutorial from './screens/Tutorial.jsx';
export default function App(){
useEffect(()=>{ startGame(); },[]);
return <>{"\n"}{"\n"}<canvas id="gl"></canvas>{"\n"}<div id="labels"></div>{"\n\n"}{"\n"}<Landing />{"\n\n"}{"\n"}<div id="ui">{"\n  "}<div id="topbar" style={{"display": "none"}}>{"\n    "}<button className="wm" id="wmHome"><i></i>{"GEODESIC"}</button>{"\n    "}<div className="right">{"\n      "}<span className="kicker" id="tbMission"></span>{"\n      "}<div id="steps"></div>{"\n      "}<button className="link" id="tbSound">{"Sound on"}</button>{"\n    "}</div>{"\n  "}</div>{"\n    "}{"\n  "}<Select />{"\n\n  "}{"\n  "}<Builder />{"\n\n  "}{"\n  "}<Craft />{"\n  "}{"\n  "}<Route />{"\n  "}{"\n  "}<GoNoGo />{"\n\n  "}{"\n  "}<Launch />{"\n  "}{"\n  "}<Cruise />{"\n\n  "}{"\n  "}<Flyby />{"\n  "}{"\n  "}<Arrival />{"\n\n  "}{"\n  "}<Descent />{"\n\n  "}{"\n  "}<Report />{"\n\n  "}{"\n  "}<PhysicsInsights />{"\n"}</div>{"\n"}<div id="fade"></div>{"\n"}{"\n"}<PassDevice />{"\n"}<Modal />{"\n"}<Tutorial />{"\n"}<div id="coachRing"></div>{"\n\n"}<div id="geoCursor" aria-hidden="true"><span className="geo-ring"></span><span className="geo-tick h"></span><span className="geo-tick v"></span><span className="geo-dot"></span><span className="geo-label">{"NAVIGATE"}</span></div>{"\n\n"}</>;
}
