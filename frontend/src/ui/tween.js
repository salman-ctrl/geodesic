
// ====================================================================================================
// MODULE  src/ui/tween.js
// layer   ui
// what    easing curves and promise-based tweens, stepped by the main loop
// imports —
// ====================================================================================================

let ease, tweens, wait;
function tween(sec, fn, e=ease.io){ return new Promise(res=>{ tweens.add({ t:0, sec, fn, e, res }); }); }
function runTweens(dt){ for(const tw of tweens){ tw.t+=dt; const k=Math.min(1,tw.t/tw.sec); tw.fn(tw.e(k)); if(k>=1){ tweens.delete(tw); tw.res(); } } }
export function initialize(){
(ease = { io:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, out:t=>1-Math.pow(1-t,3), in:t=>t*t*t, lin:t=>t,
               back:t=>{ const c=1.70158; return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2); } });
(tweens = new Set());
(wait = s=>tween(s,()=>{}));
}
export { ease, tweens, tween, runTweens, wait };
