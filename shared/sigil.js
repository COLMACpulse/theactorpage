/* THEACTORPAGE OPENING: the sigil puts itself together. ACT, WRITE, FILM, then the whole thing.
   ACT    the triangle's sticks slam shut, like a slate.            a clap
   WRITE  the head strikes in, like a typewriter key.               a key
   FILM   the strip feeds up into the ring, a frame at a time.      a reel
   Plays once a visit, silent (no browser lets a page make sound before you touch it). Tap the sigil or ROLL
   to run it again with sound. Set to reduce motion: the sigil just sits there, finished.
   The sounds are made here, in the page. Nothing is downloaded for them. */
(function(){
const sig=document.querySelector('.sigil'); if(!sig) return;
const head=document.querySelector('.titlecard');
const calm=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
const BEATS={act:.6,write:1.25,film:[1.5,2.4]};
function play(withSound){
 if(calm()) return;
 head.classList.remove('sgplay'); void head.offsetWidth; head.classList.add('sgplay');
 clearTimeout(play.t); play.t=setTimeout(()=>head.classList.remove('sgplay'),3600);
 if(withSound) sound();
}
/* ---------- the sounds ---------- */
let AC=null;
function ctx(){ if(!AC){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; AC=new C(); } if(AC.state==='suspended') AC.resume(); return AC; }
function noise(c,len){ const b=c.createBuffer(1,Math.ceil(c.sampleRate*len),c.sampleRate), d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; return b; }
function burst(c,out,t,o){ // a filtered noise hit
 const s=c.createBufferSource(); s.buffer=noise(c,o.len||.1); const f=c.createBiquadFilter(); f.type=o.type||'bandpass'; f.frequency.value=o.f||1500; f.Q.value=o.q||1;
 const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(o.v||.8,t+.002); g.gain.exponentialRampToValueAtTime(.0008,t+(o.d||.08));
 s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t+(o.len||.1)+.02); }
function tone(c,out,t,o){ // a short pitched body
 const s=c.createOscillator(); s.type=o.type||'triangle'; s.frequency.setValueAtTime(o.f,t); if(o.to) s.frequency.exponentialRampToValueAtTime(o.to,t+(o.d||.08));
 const g=c.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(o.v||.4,t+.003); g.gain.exponentialRampToValueAtTime(.0008,t+(o.d||.08));
 let n=s; if(o.lp){ const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=o.lp; s.connect(f); n=f; } n.connect(g); g.connect(out); s.start(t); s.stop(t+(o.d||.08)+.03); }
function sound(given){
 const c=given||ctx(); if(!c) return;
 const out=c.createDynamicsCompressor(), m=c.createGain(); m.gain.value=.7; out.connect(m); m.connect(c.destination);
 const t0=c.currentTime+.04;
 // ACT: the clap. A crack, the wood, a little room.
 const a=t0+BEATS.act;
 burst(c,out,a,{type:'highpass',f:2600,len:.03,d:.025,v:.9});
 burst(c,out,a,{type:'bandpass',f:1250,q:.9,len:.14,d:.11,v:.85});
 tone(c,out,a,{f:210,to:120,d:.09,v:.45});
 burst(c,out,a+.012,{type:'bandpass',f:700,q:4,len:.2,d:.18,v:.12});
 // WRITE: the key. A click, then the type bar landing.
 const w=t0+BEATS.write;
 burst(c,out,w-.035,{type:'highpass',f:4200,len:.012,d:.01,v:.35});
 burst(c,out,w,{type:'highpass',f:2400,len:.02,d:.018,v:.8});
 tone(c,out,w+.004,{type:'square',f:140,to:90,d:.06,v:.3,lp:700});
 burst(c,out,w+.004,{type:'bandpass',f:900,q:6,len:.08,d:.06,v:.18});
 // FILM: the reel. A motor under it, a tick for every frame, a last one when it locks.
 const [f0,f1]=BEATS.film.map(x=>t0+x);
 const mo=c.createOscillator(); mo.type='sawtooth'; mo.frequency.setValueAtTime(42,f0); mo.frequency.linearRampToValueAtTime(52,f1);
 const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=380;
 const mg=c.createGain(); mg.gain.setValueAtTime(0,f0); mg.gain.linearRampToValueAtTime(.14,f0+.12); mg.gain.setValueAtTime(.14,f1-.1); mg.gain.linearRampToValueAtTime(0,f1+.08);
 const lfo=c.createOscillator(); lfo.frequency.value=18; const lg=c.createGain(); lg.gain.value=.035; lfo.connect(lg); lg.connect(mg.gain);
 mo.connect(lp); lp.connect(mg); mg.connect(out); mo.start(f0); mo.stop(f1+.12); lfo.start(f0); lfo.stop(f1+.12);
 for(let t=f0+.03,i=0;t<f1;t+=.055,i++) burst(c,out,t+(Math.random()-.5)*.006,{type:'bandpass',f:3300+(i%2)*500,q:3,len:.012,d:.01,v:.36+(i%9===0?.14:0)});
 burst(c,out,f1,{type:'bandpass',f:1800,q:2,len:.04,d:.035,v:.65});
 tone(c,out,f1,{f:160,to:110,d:.05,v:.2});
}
/* once a visit, silent; then tap for sound */
let seen=false; try{ seen=sessionStorage.getItem('theactorpage_sigil')==='1'; sessionStorage.setItem('theactorpage_sigil','1'); }catch(e){}
if(!seen) play(false);
sig.addEventListener('click',()=>play(true));
const roll=document.querySelector('.scrollcue'); if(roll) roll.addEventListener('click',()=>play(true));
window.__sigil={play,BEATS,sound};
})();
