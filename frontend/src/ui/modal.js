import { $ } from './dom.js';

// ====================================================================================================
// MODULE  src/ui/modal.js
// layer   ui
// what    modal card
// imports ui/dom
// ====================================================================================================


function openModal(html){ $('#modalBody').innerHTML=html; $('#modal').classList.add('on'); }
export function initialize(){
$('#modalX').onclick=()=>$('#modal').classList.remove('on');
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal') $('#modal').classList.remove('on'); });
}
export { openModal };
