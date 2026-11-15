import { BODIES } from '../core/data/bodies.js';
import { hex, lerp } from '../core/physics/math.js';
import { dateFromDay } from '../core/physics/time.js';

// ====================================================================================================
// MODULE  src/ui/patch.js
// layer   ui
// what    mission patch (SVG string)
// imports core/data/bodies, core/physics/time, core/physics/math
// ====================================================================================================


function patchSVG(F, name, crew){
  const b=BODIES[F.mission], col=hex(b.col), chain=F.rt? F.rt.chain : ['earth',F.mission], nf=chain.length-2, yr=F.rt&&F.rt.frame==='helio'? dateFromDay(F.rt.t0).getUTCFullYear() : 2028;
  let dots=''; for(let i=0;i<nf;i++){ const t=(i+1)/(nf+1), x=lerp(98,190,t)+Math.sin(t*Math.PI)*-34, y=lerp(196,124,t)+Math.sin(t*Math.PI)*34; dots+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="${hex(BODIES[chain[i+1]].col)}" stroke="#2b2622" stroke-width="2"/>`; }
  const stars=Array.from({ length:crew },(_,i)=>`<path transform="translate(${150+(i-(crew-1)/2)*20},78) scale(.62)" d="M0,-10 L2.9,-3.1 10,-3.1 4.3,1.6 6.2,9 0,4.6 -6.2,9 -4.3,1.6 -10,-3.1 -2.9,-3.1Z" fill="#fbf6ec"/>`).join('');
  return `<svg class="patch" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mission patch ${name}">
  <defs><path id="ptop" d="M 44,150 A 106,106 0 0 1 256,150"/><path id="pbot" d="M 34,150 A 116,116 0 0 0 266,150"/><clipPath id="pc"><circle cx="150" cy="150" r="92"/></clipPath></defs>
  <circle cx="150" cy="150" r="145" fill="#141b3a" stroke="#2b2622" stroke-width="4"/><circle cx="150" cy="150" r="136" fill="none" stroke="#e2772e" stroke-width="3"/>
  <circle cx="150" cy="150" r="92" fill="#1d2756" stroke="#fbf6ec" stroke-width="1.5"/>
  <g clip-path="url(#pc)"><circle cx="206" cy="112" r="40" fill="${col}" stroke="#2b2622" stroke-width="3"/><path d="M172,96 A40,40 0 0 0 232,142" fill="none" stroke="rgba(43,38,34,.25)" stroke-width="9"/>
  ${F.mission==='saturn'? '<ellipse cx="206" cy="112" rx="62" ry="13" fill="none" stroke="#d8c08a" stroke-width="6" transform="rotate(-18 206 112)"/>':''}
  <path d="M98,196 C70,150 150,210 ${nf? '150,150 C150,110 185,150':'140,150 C150,130 170,140'} 196,122" fill="none" stroke="#e2772e" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="92" cy="200" r="15" fill="#3d8fcf" stroke="#2b2622" stroke-width="3"/><path d="M84,196 q6,-7 13,0 q-4,7 -13,0" fill="#78b86a"/>${dots}</g>${stars}
  <text font-family="Fraunces,serif" font-weight="900" font-size="25" fill="#fbf6ec" letter-spacing="3"><textPath href="#ptop" startOffset="50%" text-anchor="middle">${name.toUpperCase()}</textPath></text>
  <text font-family="JetBrains Mono,monospace" font-weight="500" font-size="11.5" fill="#e2772e" letter-spacing="3.5"><textPath href="#pbot" startOffset="50%" text-anchor="middle">GEODESIC · ${b.name.toUpperCase()} · ${yr}</textPath></text></svg>`;
}
export function initialize(){
}
export { patchSVG };
