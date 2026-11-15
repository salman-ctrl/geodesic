import { $ } from './dom.js';
import { Store } from '../state/store.js';
import { heroOrbit } from '../screens/landing.js';

// ====================================================================================================
// MODULE  src/ui/cursor.js
// layer   ui
// what    orbital reticle cursor, landing page only
// imports state/store, ui/dom
// ====================================================================================================
// Small game-themed orbital reticle. Keep native text-caret behavior in input fields.

let cursorEl, cursorLabel, finePointer, cursorVisible;
function syncCursorScope(){ const on=finePointer&&Store.session.screen==='landing'; document.documentElement.classList.toggle('geo-cursor-on',on); if(!on){ cursorEl.className=''; cursorVisible=false; } }
export function initialize(){
(cursorEl = $('#geoCursor'));
(cursorLabel = cursorEl.querySelector('.geo-label'));
(finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches);
(cursorVisible = false);
Store.subscribe(key=>{ if(key==='screen') syncCursorScope(); });
if(finePointer){
  document.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||Store.session.screen!=='landing') return;
    const input=e.target.closest('input:not([type="range"]), textarea, [contenteditable="true"]');
    if(input){cursorEl.className=''; cursorVisible=false; return;}
    cursorEl.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
    const orbit=e.target.closest('#heroOrbitZone');
    const scienceCanvas=e.target.closest('#theoryCanvas');
    const action=e.target.closest('button,a,[role="button"]');
    const range=e.target.closest('input[type="range"]');
    let mode='', label='';
    if(orbit&&Store.session.screen==='landing'){mode=heroOrbit.dragging?'dragging':'orbit';label=heroOrbit.dragging?'ORBITING':'DRAG TO ROTATE';}
    else if(scienceCanvas&&Store.session.screen==='landing'){mode=scienceCanvas.classList.contains('dragging')?'dragging':'orbit';label=mode==='dragging'?'EXPLORING':'DRAG TO ROTATE';}
    else if(range){mode='action';label='ADJUST';}
    else if(action){mode='action';label='SELECT';}
    cursorEl.className='visible '+mode;
    cursorLabel.textContent=label;
    cursorVisible=true;
  },{passive:true});
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&Store.session.screen==='landing'&&e.target.closest('#heroOrbitZone,#theoryCanvas')){
      cursorEl.className='visible dragging'; cursorLabel.textContent='ORBITING';
    }
  });
  document.addEventListener('pointerup',e=>{
    if(e.pointerType==='mouse'&&Store.session.screen==='landing'&&e.target.closest('#heroOrbitZone,#theoryCanvas')){
      cursorEl.className='visible orbit'; cursorLabel.textContent='DRAG TO ROTATE';
    }
  });
  document.addEventListener('mouseout',e=>{if(!e.relatedTarget){cursorEl.className='';cursorVisible=false;}});
  window.addEventListener('blur',()=>{cursorEl.className='';cursorVisible=false;});
}
}
export { cursorEl, cursorLabel, finePointer, cursorVisible, syncCursorScope };
