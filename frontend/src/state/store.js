import { dayFromDate } from '../core/physics/time.js';

// ====================================================================================================
// MODULE  src/state/store.js
// layer   state · the single source of truth
// what    design state (saved) + session state (not saved) + load/save + subscribe(listener)
// imports core/physics/time
// ====================================================================================================

let SAVE_KEY, defaultState, Store, S;
function loadState(){ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s&&s.rocket&&s.craft&&s.route) return Object.assign(defaultState(),s); }catch(e){} return defaultState(); }
export function initialize(){
(SAVE_KEY = 'geodesic.v1');
(defaultState = () => ({
  mission:'mars', crew:1, tutorialDone:false, sound:true,
  rocket:{ segs:4, engines:5, boosters:0, upper:'M', fairing:'M' },
  craft:{ bus:'M', power:'solar', powerN:2, antenna:'M', instruments:['cam'], tank:0.5 },
  route:{ flybys:[], day:dayFromDate(2031,1,1), priority:'balanced', moonTof:4, auto:true },
  last:null,
}));
(Store = (() => {
  const state = loadState();
  const hadSave = !!localStorage.getItem(SAVE_KEY);
  // Session state: lives for one page load, never saved. Screens publish here instead of reaching into each other.
  const session = {
    screen:'',            // name of the active screen
    flight:null,          // flight record, from launch to report (src/game/flight.js)
    route:null,           // last route solved by the route planner
    routeCaption:'',      // headline under the route planner's big number
    insight:null,         // live numbers for the physics dock: { kind:'flyby'|'cruise'|'arrival', ... }
    launchSim:null,       // ascent simulation state of the current launch
    holder:0,             // which player holds the device (hot-seat crew)
    tutorialActive:false,
  };
  const listeners = new Set(); let persistPaused = false;
  const notify = (key,value)=>{ for(const fn of [...listeners]) fn(key,value); };
  return {
    state, session, hadSave,
    // Call after changing Store.state: saves it and tells subscribers ('state', state).
    commit(){ if(!persistPaused){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){} } notify('state',state); },
    // Set one session value and tell subscribers (key, value).
    set(key, value){ session[key]=value; notify(key,value); },
    // Swap the whole design state in place (object identity is kept, so existing references stay valid).
    replace(next){ for(const k of Object.keys(state)) delete state[k]; Object.assign(state,next); },
    // The tutorial plays on a throwaway design: nothing is written to storage while paused.
    pausePersist(v){ persistPaused=!!v; },
    // listener(key, value). Returns an unsubscribe function.
    subscribe(listener){ listeners.add(listener); return ()=>listeners.delete(listener); },
  };
})());
(S = Store.state);
}
export { SAVE_KEY, defaultState, loadState, Store, S };
