
// ====================================================================================================
// MODULE  src/ui/dom.js
// layer   ui
// what    query and element helpers
// imports —
// ====================================================================================================

let $, $$, h;
export function initialize(){
($ = (s,r=document)=>r.querySelector(s));
($$ = (s,r=document)=>[...r.querySelectorAll(s)]);
(h = html=>{ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; });
}
export { $, $$, h };
