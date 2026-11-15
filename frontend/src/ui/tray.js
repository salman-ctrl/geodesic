
// ====================================================================================================
// MODULE  src/ui/tray.js
// layer   ui
// what    parts tray: slot HTML and click binding
// imports —
// ====================================================================================================

let ICON, slotStep, slotChips, slotGo;
function bindTray(el, fn){ el.addEventListener('click',e=>{ const b=e.target.closest('[data-a]'); if(!b) return; const [k,v]=b.dataset.a.split(':'); fn(k,v); }); }
export function initialize(){
(ICON = {
  tank:'<rect x="7" y="3" width="10" height="18" rx="5"/>', engine:'<path d="M9 4h6l1 6 3 10H5l3-10z"/>', booster:'<path d="M12 2l3 5v12H9V7z"/><path d="M9 19l-2 3h10l-2-3"/>',
  upper:'<rect x="7" y="5" width="10" height="10" rx="2"/><path d="M10 15l-2 6h8l-2-6"/>', fairing:'<path d="M12 2c4 3 5 8 5 12v7H7v-7c0-4 1-9 5-12z"/>', bus:'<path d="M12 3l7 4v10l-7 4-7-4V7z"/>',
  prop:'<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/>', power:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  antenna:'<path d="M4 7a8 8 0 0016 0"/><path d="M12 15v6M8 21h8M12 7v4"/>', inst:'<rect x="4" y="6" width="16" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
});
(slotStep = (icon,title,key,val)=>`<div class="slot"><h4><svg viewBox="0 0 24 24">${ICON[icon]}</svg>${title}</h4><div class="ctl"><button class="step" data-a="${key}:-1">−</button><span class="val">${val}</span><button class="step" data-a="${key}:1">+</button></div></div>`);
(slotChips = (icon,title,key,opts,cur,dis=[])=>`<div class="slot"><h4><svg viewBox="0 0 24 24">${ICON[icon]}</svg>${title}</h4><div class="chips">${opts.map(o=>{ const [v,l]=Array.isArray(o)? o:[o,o]; return `<button class="chip ${String(v)===String(cur)||(Array.isArray(cur)&&cur.includes(v))?'on':''}" data-a="${key}:${v}" ${dis.includes(v)?'disabled':''}>${l}</button>`; }).join('')}</div></div>`);
(slotGo = (label,small,key='go')=>`<button class="slot go" data-a="${key}:1"><span>${label} →</span><small>${small}</small></button>`);
}
export { ICON, slotStep, slotChips, slotGo, bindTray };
