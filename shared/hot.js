/* THEACTORPAGE HOT: you always know when the camera or mic is on.
   Load first on any page that can use the camera or mic. It watches every way a page can open them
   (getUserMedia, MediaRecorder, speech listening), so every tool gets it without changing the tool:
   - asks first, in plain words, before the browser's own permission box; says how to fix it when blocked
   - shows a bar while anything is on:
       CAMERA ON · NOT RECORDING   (amber)   ready, nothing being kept; TURN OFF stops it
       ● RECORDING                (red)     a camera or mic take is being recorded
       ● LISTENING                (red)     the mic is hearing you (say it, speech to text)
   Recording a picture made on the page (a rough cut, a reel) is not the camera and does not show.
   Nothing here records, keeps or sends anything. */
(function(g){
if(g.Hot||typeof navigator==='undefined') return;
const H={}; g.Hot=H;
const live=new Set();          // camera / mic tracks that are on
const recs=new Set();          // recorders recording a camera / mic track
const ears=new Set();          // speech recognisers listening
let bar=null, sheet=null;
const md=navigator.mediaDevices;
const kinds=()=>{ const k={video:false,audio:false}; live.forEach(t=>{ if(t.readyState==='live') k[t.kind]=true; else live.delete(t); }); return k; };
const words=k=>k.video&&k.audio?'CAMERA AND MIC':k.video?'CAMERA':k.audio?'MIC':'';
function css(){ if(document.getElementById('hotcss')) return; const s=document.createElement('style'); s.id='hotcss';
 s.textContent='#hotbar{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 6px);transform:translateX(-50%);z-index:2147483646;display:flex;align-items:center;gap:10px;padding:6px 6px 6px 12px;border-radius:999px;font:600 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.03em;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,.35);max-width:calc(100vw - 16px)}'
 +'#hotbar.ready{background:#3a2a08;color:#ffd58a;border:1px solid #e0a23c}#hotbar.rec{background:#5a0f0a;color:#fff;border:1px solid #ff5a4a}'
 +'#hotbar i{width:10px;height:10px;border-radius:50%;flex:none;background:#e0a23c}#hotbar.rec i{background:#ff3b30;animation:hotp 1s ease-in-out infinite}@keyframes hotp{50%{opacity:.25}}'
 +'#hotbar button{border:1px solid currentColor;background:transparent;color:inherit;border-radius:999px;padding:4px 9px;font:inherit;font-size:11px;cursor:pointer;flex:none}@media (max-width:360px){#hotbar{white-space:normal}}'
 +'#hotsheet{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}'
 +'#hotsheet .b{background:#1b1916;color:#ece7dc;border:1px solid #2f2b26;border-radius:16px 16px 0 0;padding:20px 18px calc(env(safe-area-inset-bottom) + 18px);width:100%;max-width:520px;font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}'
 +'#hotsheet h2{margin:0 0 8px;font-size:18px}#hotsheet p{margin:0 0 10px;color:#c9c2b4}#hotsheet .r{display:flex;gap:8px;margin-top:14px}'
 +'#hotsheet button{flex:1;min-height:48px;border-radius:10px;border:1px solid #2f2b26;background:#24211d;color:inherit;font:600 16px system-ui,sans-serif;cursor:pointer}#hotsheet button.p{background:#e0a23c;color:#1a1206;border-color:#e0a23c}';
 (document.head||document.documentElement).appendChild(s); }
function paint(){
 if(!document.body){ document.addEventListener('DOMContentLoaded',paint,{once:true}); return; }
 const k=kinds(); [...recs].forEach(r=>{ if(r.state!=='recording') recs.delete(r); });
 const rec=recs.size>0, ear=ears.size>0, on=k.video||k.audio||ear;
 if(!on){ if(bar){ bar.remove(); bar=null; } H.state='off'; return; }
 css();
 if(!bar){ bar=document.createElement('div'); bar.id='hotbar'; bar.setAttribute('role','status'); bar.setAttribute('aria-live','polite'); document.body.appendChild(bar); }
 let cls, text, off=false;
 if(rec){ cls='rec'; text='RECORDING · '+(words(k)||'MIC'); H.state='recording'; }
 else if(ear){ cls='rec'; text='LISTENING · MIC'; H.state='listening'; }
 else { cls='ready'; text=words(k)+' ON · NOT RECORDING'; off=true; H.state='ready'; }
 bar.className=cls; bar.innerHTML='<i></i><span>'+text+'</span>'+(off?'<button type="button">TURN OFF</button>':'');
 if(off) bar.querySelector('button').onclick=()=>H.off();
}
H.off=function(){ live.forEach(t=>{ try{ t.stop(); }catch(e){} }); live.clear(); paint(); };
H.status=()=>({state:(paint(),H.state),camera:kinds().video,mic:kinds().audio,recording:recs.size>0,listening:ears.size>0});
function watch(stream){ if(!stream||!stream.getTracks) return stream; stream.getTracks().forEach(t=>{ if(live.has(t)) return; live.add(t); t.__hot=true; t.addEventListener('ended',paint); }); paint(); return stream; }
/* the plain-words ask, before the browser's own box; and what to do when it's blocked */
function ask(want,blocked){
 return new Promise(res=>{ css(); if(sheet) sheet.remove();
  const what=want.video&&want.audio?'camera and mic':want.video?'camera':'mic';
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent), how=ios?'On iPhone: tap aA in the address bar, then Website Settings, then set Camera and Microphone to Allow. Then try again.':'Tap the icon next to the address (the lock or the sliders), then Permissions or Site settings, and allow the '+what+'. Then try again.';
  sheet=document.createElement('div'); sheet.id='hotsheet';
  sheet.innerHTML='<div class="b" role="dialog" aria-modal="true" aria-labelledby="hoth"><h2 id="hoth">'+(blocked?'The '+what+(want.video&&want.audio?' are':' is')+' blocked':'Use your '+what+'?')+'</h2>'
   +(blocked?'<p>This browser was told not to let this site use the '+what+'.</p><p>'+how+'</p>'
    :'<p>To record, this needs your '+what+'. Your browser will ask next.</p><p>It is only on while you use it, a bar at the top says so, and TURN OFF stops it. Nothing you record leaves this device unless you send it.</p>')
   +'<div class="r">'+(blocked?'<button type="button" class="p" data-v="0">OK</button>':'<button type="button" data-v="0">NOT NOW</button><button type="button" class="p" data-v="1">ALLOW</button>')+'</div></div>';
  (document.body||document.documentElement).appendChild(sheet);
  sheet.querySelectorAll('button').forEach(b=>b.onclick=()=>{ sheet.remove(); sheet=null; res(b.dataset.v==='1'); });
  const p=sheet.querySelector('button.p'); if(p) p.focus();
 });
}
async function perm(name){ try{ if(navigator.permissions&&navigator.permissions.query){ const r=await navigator.permissions.query({name}); return r.state; } }catch(e){} return 'unknown'; }
const okKey='theactorpage_hot_ok';
const said=()=>{ try{ return sessionStorage.getItem(okKey)==='1'; }catch(e){ return false; } };
if(md&&md.getUserMedia){
 const raw=md.getUserMedia.bind(md);
 H.rawGetUserMedia=raw;
 md.getUserMedia=async function(c){
  c=c||{}; const want={video:!!c.video,audio:!!c.audio};
  const st=await Promise.all([want.video?perm('camera'):'granted',want.audio?perm('microphone'):'granted']);
  if(st.includes('denied')){ await ask(want,true); const e=new Error('The '+(want.video?'camera':'mic')+' is blocked for this site.'); e.name='NotAllowedError'; e.hot='blocked'; throw e; }
  const need=st.some(s=>s==='prompt')||(st.some(s=>s==='unknown')&&!said());
  if(need){ const yes=await ask(want,false); if(!yes){ const e=new Error('Not now.'); e.name='NotAllowedError'; e.hot='notnow'; throw e; } try{ sessionStorage.setItem(okKey,'1'); }catch(e){} }
  return watch(await raw(c));
 };
}
if(typeof MediaStreamTrack!=='undefined'){ const stop=MediaStreamTrack.prototype.stop; MediaStreamTrack.prototype.stop=function(){ const r=stop.apply(this,arguments); if(this.__hot){ live.delete(this); setTimeout(paint,0); } return r; }; }
if(typeof MediaRecorder!=='undefined'){
 const MR=MediaRecorder, start=MR.prototype.start;
 MR.prototype.start=function(){ const r=start.apply(this,arguments);
  let hot=false; try{ hot=this.stream&&this.stream.getTracks().some(t=>t.__hot||live.has(t)); }catch(e){}
  if(hot){ recs.add(this); const done=()=>{ recs.delete(this); paint(); }; this.addEventListener('stop',done); this.addEventListener('error',done); paint(); }
  return r; };
}
['SpeechRecognition','webkitSpeechRecognition'].forEach(n=>{ const SR=g[n]; if(!SR||!SR.prototype||SR.prototype.__hot) return; SR.prototype.__hot=true;
 const start=SR.prototype.start;
 SR.prototype.start=function(){ const r=start.apply(this,arguments); ears.add(this); const done=()=>{ ears.delete(this); paint(); };
  if(!this.__hotw){ this.__hotw=true; this.addEventListener('end',done); this.addEventListener('error',done); } paint(); return r; };
});
document.addEventListener('visibilitychange',()=>setTimeout(paint,50));
H.paint=paint;
})(typeof window!=='undefined'?window:globalThis);
