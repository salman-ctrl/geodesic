import { $ } from './dom.js';

// ====================================================================================================
// MODULE  src/ui/callout.js
// layer   ui
// what    big launch callouts (LIFTOFF, MAX-Q, ...)
// imports ui/dom
// ====================================================================================================


function callout(title, sub='', hold=2.4){ const el=$('#lCall'); el.querySelector('b').textContent=title; el.querySelector('span').textContent=sub; el.classList.add('on'); clearTimeout(el._h); el._h=setTimeout(()=>el.classList.remove('on'),hold*1000); }
export function initialize(){
}
export { callout };
