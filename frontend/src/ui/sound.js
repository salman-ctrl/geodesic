import { S } from '../state/store.js';

// ====================================================================================================
// MODULE  src/ui/sound.js
// layer   ui
// what    synthesised sound (WebAudio, no files)
// imports state/store
// ====================================================================================================
// Subtle synthesised sound (WebAudio). No audio files.

let Sound;
export function initialize(){
(Sound = {
  ctx:null, rumbleGain:null,
  ensure(){ if(!this.ctx){ try{ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(this.ctx&&this.ctx.state==='suspended') this.ctx.resume(); return this.ctx; },
  blip(f=620,d=.07,type='triangle',vol=.04){ if(!S.sound||!this.ensure()) return; const c=this.ctx, o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.value=f;
    g.gain.setValueAtTime(vol,c.currentTime); g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+d+.02); },
  snap(){ this.blip(240,.05,'square',.025); setTimeout(()=>this.blip(480,.06,'triangle',.03),40); },
  ok(){ this.blip(660,.09); setTimeout(()=>this.blip(990,.14),90); }, bad(){ this.blip(200,.22,'sawtooth',.03); },
  boom(){ this.rumble(1); setTimeout(()=>this.rumble(0),900); },
  rumble(level){ if(!this.ensure()) return; const c=this.ctx;
    if(!this.rumbleGain){ const n=c.sampleRate*2, buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0); let b=0; for(let i=0;i<n;i++){ b=(b+0.04*(Math.random()*2-1))/1.04; d[i]=b*3; }
      const src=c.createBufferSource(); src.buffer=buf; src.loop=true; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=320; this.rumbleGain=c.createGain(); this.rumbleGain.gain.value=0; src.connect(f).connect(this.rumbleGain).connect(c.destination); src.start(); }
    this.rumbleGain.gain.setTargetAtTime(S.sound? level*.35:0, c.currentTime, .15); },
});
document.addEventListener('click', e=>{ if(e.target.closest('button,.slot.go')) Sound.blip(520,.045,'triangle',.025); }, true);
}
export { Sound };
