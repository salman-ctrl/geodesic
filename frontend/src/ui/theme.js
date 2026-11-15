import { $ } from './dom.js';
import { wait } from './tween.js';

// ====================================================================================================
// MODULE  src/ui/theme.js
// layer   ui
// what    paper / night theme and the fade-through-colour transition
// imports ui/dom, ui/tween
// ====================================================================================================


function setTheme(t){ document.body.classList.toggle('night',t==='night'); document.body.classList.toggle('paper',t!=='night'); }
async function fadeThrough(fn, color='#141b3a'){ const f=$('#fade'); f.style.background=color; f.classList.add('on'); await wait(.42); await fn(); await wait(.05); f.classList.remove('on'); }
export function initialize(){
}
export { setTheme, fadeThrough };
