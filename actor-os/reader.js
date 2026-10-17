/* ===== READER BOOTH =====
   The actor is the machine. You record every line that is not yours - in your own
   voice, at your own pace - and the system strings them together during the take.

   No synthetic voice. A robot reader gives you nothing to play against; your own
   reading carries the rhythm and the intention you actually want to work off.

   Clips live in IndexedDB keyed to the line, so they survive a reload. */
(function(g){
const A={}, DBN='actor_os_reader', STORE='clips', TAKES='takes';
let _db=null;

function open(){
 if(_db)return Promise.resolve(_db);
 return new Promise((res,rej)=>{
  const r=indexedDB.open(DBN,2);
  r.onupgradeneeded=e=>{const d=e.target.result;
   if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});
   if(!d.objectStoreNames.contains(TAKES))d.createObjectStore(TAKES,{keyPath:'id'});};
  r.onsuccess=e=>{_db=e.target.result;res(_db)};
  r.onerror=()=>rej(r.error);
 });
}
/* key on the content, so re-uploading the same sides keeps your recordings */
A.keyFor=function(scriptId,who,text){
 let h=0; const s=(who||'')+'|'+(text||'');
 for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}
 return (scriptId||'sides')+':'+(h>>>0).toString(36);
};
A.putTakeFor=async function(lineId,blob,meta){
 const db=await open();
 const id=lineId+'#'+Date.now().toString(36);
 return new Promise((res,rej)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(Object.assign({id,line:lineId,blob,at:Date.now()},meta||{}));
  tx.oncomplete=()=>res(id); tx.onerror=()=>rej(tx.error);
 });
};
A.takesFor=async function(lineId){
 const all=await A.all();
 return all.filter(c=>c.line===lineId).sort((a,b)=>a.at-b.at);
};
A.put=async function(id,blob,meta){
 const db=await open();
 return new Promise((res,rej)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(Object.assign({id,blob,at:Date.now()},meta||{}));
  tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error);
 });
};
A.get=async function(id){
 const db=await open();
 return new Promise(res=>{
  const q=db.transaction(STORE,'readonly').objectStore(STORE).get(id);
  q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null);
 });
};
A.del=async function(id){
 const db=await open();
 return new Promise(res=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(id); tx.oncomplete=()=>res(true); tx.onerror=()=>res(false);
 });
};
A.all=async function(){
 const db=await open();
 return new Promise(res=>{
  const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
  q.onsuccess=()=>res(q.result||[]); q.onerror=()=>res([]);
 });
};

/* --- capture one line --- */
let mic=null, rec=null, chunks=[];
A.armed=function(){return !!mic;};
/* Lines are recorded on camera by default: you, playing the other character, looking into the lens.
   During the take that clip plays in a small window by the lens, so you play opposite yourself.
   If there is no camera, or you turn it off, the line is sound only, as before. */
const VKEY='actor_os_reader_video', PVKEY='actor_os_partner_view', PPKEY='actor_os_partner_pos';
A.wantVideo=function(){ try{ return localStorage.getItem(VKEY)!=='0'; }catch(e){ return true; } };
A.setWantVideo=function(on){ try{ localStorage.setItem(VKEY,on?'1':'0'); }catch(e){} if(mic&&!A.recording()) A.disarm(); };
A.arm=async function(){
 if(mic)return mic;
 const au={echoCancellation:false,noiseSuppression:false,autoGainControl:false};
 if(A.wantVideo()){
  try{ mic=await navigator.mediaDevices.getUserMedia({audio:au,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}}); return mic; }catch(e){}
 }
 mic=await navigator.mediaDevices.getUserMedia({audio:au});
 return mic;
};
A.stream=function(){ return mic; };
A.hasVideo=function(){ try{ return !!(mic&&mic.getVideoTracks().some(t=>t.readyState==='live')); }catch(e){ return false; } };
A.isVideo=b=>!!(b&&/^video\//i.test(b.type||''));
A.disarm=function(){ if(mic){mic.getTracks().forEach(t=>t.stop());mic=null;} };
A.mime=function(){
 const L=A.hasVideo()?['video/mp4','video/webm;codecs=vp8,opus','video/webm;codecs=vp9,opus','video/webm']:['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
 for(const m of L){
  try{ if(MediaRecorder.isTypeSupported(m))return m; }catch(e){}
 }
 return '';
};
A.start=async function(){
 await A.arm(); chunks=[];
 const m=A.mime();
 rec = m ? new MediaRecorder(mic,{mimeType:m,videoBitsPerSecond:1200000}) : new MediaRecorder(mic);
 rec.ondataavailable=e=>{ if(e.data.size)chunks.push(e.data); };
 rec.start();
 return true;
};
A.stop=function(opts){
 const keep=opts&&opts.keepMic;
 return new Promise(res=>{
  const done=b=>{ if(!keep)A.disarm(); res(b); };
  if(!rec||rec.state==='inactive')return done(null);
  const vid=A.hasVideo(); rec.onstop=()=>done(new Blob(chunks,{type:(rec.mimeType||(vid?'video/webm':'audio/webm')).split(';')[0]}));
  rec.stop();
 });
};
A.micOpen=function(){ return !!mic; };
A.recording=function(){ return !!rec && rec.state==='recording'; };

/* --- playback during a take ---
   A plain <audio> element cannot go above 1.0, and the booth records with
   auto-gain off on purpose, so a quiet reading plays back near silent. Route it
   through Web Audio instead: normalise to a target peak, add a little compression
   so quiet lines come up, and allow real gain above unity.
   iOS also routes audio to the earpiece while a mic stream is open, so the mic is
   released before playback. */
let el=null, actx=null, curSrc=null, curGain=null;
let curPos=null;   // {ctx,t0,dur} for Web Audio, or {el} for the fallback element
let USER_GAIN=1.6;
A.setGain=function(g){ USER_GAIN=Math.max(0.5,Math.min(6,g||1)); try{localStorage.setItem('actor_os_readergain',String(USER_GAIN));}catch(e){} };
A.getGain=function(){ try{const v=parseFloat(localStorage.getItem('actor_os_readergain'));if(v)USER_GAIN=v;}catch(e){} return USER_GAIN; };

function ctx(){
 if(!actx){ const C=window.AudioContext||window.webkitAudioContext; actx=new C(); }
 if(actx.state==='suspended'){ try{actx.resume();}catch(e){} }
 return actx;
}
/* peak of the decoded audio, so normalising cannot clip */
A.peak=async function(blob){
 try{
  const buf=await ctx().decodeAudioData(await blob.arrayBuffer());
  let pk=0;
  for(let c=0;c<buf.numberOfChannels;c++){
   const d=buf.getChannelData(c);
   for(let i=0;i<d.length;i+=64){ const v=Math.abs(d[i]); if(v>pk)pk=v; }
  }
  return pk||0;
 }catch(e){ return 0; }
};
/* --- how a reader character sounds ---
   You record every other part yourself, in one room, in one voice. A sound per
   character tells them apart and puts the phone call on a phone. Real filters on
   your own recording; the speed and pitch are never touched. */
A.SOUNDS=[
 {id:'room',  label:'As recorded'},
 {id:'phone', label:'Phone'},
 {id:'radio', label:'Radio'},
 {id:'next',  label:'Next room'},
 {id:'far',   label:'Far'},
 {id:'close', label:'Close'}
];
function bq(c,type,f,q,g){ const b=c.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q!=null)b.Q.value=q; if(g!=null)b.gain.value=g; return b; }
function series(nodes){ for(let i=0;i<nodes.length-1;i++) nodes[i].connect(nodes[i+1]); return {in:nodes[0],out:nodes[nodes.length-1]}; }
A.soundChain=function(c,id){
 if(id==='phone'){   // a phone line: nothing under 300 Hz or over 3.4 kHz, a bit of honk
  return series([bq(c,'highpass',300,0.7),bq(c,'highpass',300,0.7),bq(c,'lowpass',3400,0.7),bq(c,'lowpass',3400,0.7),bq(c,'peaking',1500,1,6)]);
 }
 if(id==='radio'){   // narrower than a phone, and a little crunch
  const sh=c.createWaveShaper(), n=1024, cv=new Float32Array(n);
  for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; cv[i]=Math.tanh(2.2*x)/Math.tanh(2.2); }
  sh.curve=cv;
  return series([bq(c,'highpass',500,0.7),bq(c,'highpass',500,0.7),bq(c,'lowpass',3000,0.7),bq(c,'lowpass',3000,0.7),sh,(()=>{const g=c.createGain();g.gain.value=0.8;return g;})()]);
 }
 if(id==='next'){    // through a wall: the highs gone, quieter
  const g=c.createGain(); g.gain.value=0.5;
  return series([bq(c,'lowpass',700,0.7),bq(c,'lowpass',700,0.7),g]);
 }
 if(id==='far'){     // across a room: thinner, quieter, a short echo off the walls
  const inG=c.createGain(), out=c.createGain(), dry=c.createGain(), wet=c.createGain(), dl=c.createDelay(0.5), fb=c.createGain(), hp=bq(c,'highpass',180,0.7), lp=bq(c,'lowpass',3500,0.7);
  dry.gain.value=0.55; wet.gain.value=0.3; dl.delayTime.value=0.075; fb.gain.value=0.32; out.gain.value=0.9;
  inG.connect(hp); hp.connect(lp); lp.connect(dry); dry.connect(out);
  lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(out);
  return {in:inG,out:out};
 }
 if(id==='close'){   // right in your ear: a little more body, a little more level
  const g=c.createGain(); g.gain.value=1.12;
  return series([bq(c,'lowshelf',220,null,4),g]);
 }
 return null;
};
/* A different voice for a character: your own recording, higher or lower, same timing.
   Each short grain is read at the new speed around the moment it belongs to, so the words stay where they were.
   Big changes sound processed; it's an effect, not a new actor. No computer voice. */
A.PITCHES=[-6,-4,-2,0,2,4,6];
A.shiftPitch=function(x,semis,sr){
 if(!semis) return x;
 sr=sr||48000; const r=Math.pow(2,semis/12), L=x.length;
 // 1. play it faster or slower: the pitch moves, and so does the length
 const M=Math.max(2,Math.floor(L/r)), y=new Float32Array(M);
 for(let i=0;i<M;i++){ const sp=i*r, k=Math.floor(sp), f=sp-k; y[i]=k+1<L?x[k]+(x[k+1]-x[k])*f:(k<L?x[k]:0); }
 // 2. stretch it back to the original length, piece by piece, each piece slid to where its waveform lines up (WSOLA)
 const N=Math.round(sr*0.03)&~1, Hs=N>>1, tol=Math.round(sr*0.012), Ha=Hs*(M/L), out=new Float32Array(L), ws=new Float32Array(L), win=new Float32Array(N);
 for(let k=0;k<N;k++) win[k]=0.5-0.5*Math.cos(2*Math.PI*k/N);
 let prev=0;
 for(let m=0, o=0; o<L; m++, o+=Hs){
  const nom=Math.round(m*Ha); let best=nom;
  if(m>0){ const want=prev+Hs; let bc=-Infinity;
   for(let d=-tol; d<=tol; d+=2){ const q=nom+d; if(q<0||q+N>=M) continue; let c=0; for(let k=0;k<N;k+=4) c+=y[q+k]*(want+k<M?y[want+k]:0); if(c>bc){ bc=c; best=q; } } }
  best=Math.max(0,Math.min(M-1,best)); prev=best;
  for(let k=0;k<N;k++){ const oi=o+k, si=best+k; if(oi>=L) break; const v=si<M?y[si]:0; out[oi]+=v*win[k]; ws[oi]+=win[k]; } }
 for(let i=0;i<L;i++) if(ws[i]>1e-3) out[i]/=ws[i];
 return out;
};
/* The window by the lens. 'partner' plays the line's video there, 'mark' shows a still mark for your eyes, 'off' shows nothing.
   It is on the screen only. The take records the camera, never the screen. */
let SCREEN=null, SCREENURL='';
A.VIEWS=[['partner','You'],['mark','Mark'],['off','Off']];
A.view=function(){ try{ const v=localStorage.getItem(PVKEY); return A.VIEWS.some(x=>x[0]===v)?v:'partner'; }catch(e){ return 'partner'; } };
A.setView=function(v){ try{ localStorage.setItem(PVKEY,v); }catch(e){} };
A.pos=function(){ try{ const p=JSON.parse(localStorage.getItem(PPKEY)||'null'); if(p&&isFinite(p.x)&&isFinite(p.y)) return p; }catch(e){} return null; };
A.setPos=function(p){ try{ localStorage.setItem(PPKEY,JSON.stringify(p)); }catch(e){} };
A.setScreen=function(el){ SCREEN=el||null; };
function screenOff(){ if(!SCREEN) return; try{ SCREEN.pause(); }catch(e){} SCREEN.classList.remove('on'); SCREEN.removeAttribute('src'); try{ SCREEN.load(); }catch(e){} if(SCREENURL){ try{URL.revokeObjectURL(SCREENURL);}catch(e){} SCREENURL=''; } }
function screenLoad(blob){
 if(!SCREEN||A.view()!=='partner'||!A.isVideo(blob)) return Promise.resolve(false);
 SCREENURL=URL.createObjectURL(blob); SCREEN.muted=true; SCREEN.playsInline=true; SCREEN.src=SCREENURL;
 return new Promise(res=>{ let done=false; const go=v=>{ if(!done){ done=true; res(v); } };
  SCREEN.oncanplay=()=>go(true); SCREEN.onerror=()=>go(false); setTimeout(()=>go(true),900); });
}
function screenGo(){ if(!SCREEN||!SCREENURL) return; SCREEN.classList.add('on'); try{ SCREEN.currentTime=0; }catch(e){} const p=SCREEN.play(); if(p&&p.catch) p.catch(()=>{}); }
A.screenOn=function(){ return !!(SCREEN&&SCREEN.classList.contains('on')); };
A.play=async function(blob,onended,opts){
 A.stopPlay();
 const vidReady=screenLoad(blob);
 // the mic holds the route to the earpiece on iOS - let it go before playing
 try{ if(mic && !A.recording()) A.disarm(); }catch(e){}
 A.getGain();
 try{
  const c=ctx();
  let [buf]=await Promise.all([c.decodeAudioData(await blob.arrayBuffer()),vidReady]);
  const semis=opts&&+opts.pitch||0;
  if(semis){ const nb=c.createBuffer(buf.numberOfChannels,buf.length,buf.sampleRate); for(let ch=0;ch<buf.numberOfChannels;ch++) nb.getChannelData(ch).set(A.shiftPitch(buf.getChannelData(ch),semis,buf.sampleRate)); buf=nb; }
  let pk=0;
  const d0=buf.getChannelData(0);
  for(let i=0;i<d0.length;i+=64){ const v=Math.abs(d0[i]); if(v>pk)pk=v; }
  // bring the loudest point up to about -1.5 dBFS, then apply the user's gain
  const norm = pk>0.0001 ? Math.min(12, 0.84/pk) : 1;
  const src=c.createBufferSource(); src.buffer=buf;
  const g=c.createGain(); g.gain.value=norm*USER_GAIN;
  const comp=c.createDynamicsCompressor();
  comp.threshold.value=-18; comp.knee.value=12; comp.ratio.value=3;
  comp.attack.value=0.004; comp.release.value=0.18;
  src.connect(g); g.connect(comp);
  const ch=(opts&&opts.sound)?A.soundChain(c,opts.sound):null;
  if(ch){ comp.connect(ch.in); ch.out.connect(c.destination); } else comp.connect(c.destination);
  src.onended=()=>{ curSrc=null; curPos=null; screenOff(); if(onended)onended(); };
  screenGo(); src.start(0);
  curSrc=src; curGain=g;
  /* Where the playback actually is, read from the audio clock rather than a timer.
     A timer drifts against the sound; the context clock IS the sound. */
  curPos={ctx:c, t0:c.currentTime, dur:buf.duration};
  return src;
 }catch(e){
  // fall back to the element if Web Audio cannot decode this container
  el=new Audio(URL.createObjectURL(blob));
  el.volume=1;
  curPos={el};
  el.onended=()=>{ curPos=null; screenOff(); try{URL.revokeObjectURL(el.src)}catch(e2){}; if(onended)onended(); };
  el.onerror=()=>{ screenOff(); if(onended)onended(); };
  await vidReady; screenGo();
  el.play().catch(()=>{ screenOff(); if(onended)onended(); });
  return el;
 }
};
/* How far into the line the voice has got, or null when nothing is playing. This is
   what lets the words on the screen keep up with the words in the room. */
A.playPos=function(){
 try{
  if(!curPos) return null;
  if(curPos.el){ const d=curPos.el.duration;
   if(!isFinite(d)||d<=0) return null;
   return {t:curPos.el.currentTime, dur:d}; }
  return {t:Math.max(0,curPos.ctx.currentTime-curPos.t0), dur:curPos.dur};
 }catch(e){ return null; }
};
A.stopPlay=function(){ curPos=null; screenOff();
 if(curSrc){ try{curSrc.onended=null;curSrc.stop();}catch(e){} curSrc=null; }
 if(el){ try{el.pause();URL.revokeObjectURL(el.src);}catch(e){} el=null; }
};
A.duration=function(blob){
 return new Promise(res=>{
  const a=document.createElement(A.isVideo(blob)?'video':'audio'); a.preload='metadata'; a.src=URL.createObjectURL(blob);
  a.onloadedmetadata=()=>{const d=a.duration;URL.revokeObjectURL(a.src);res(isFinite(d)?d:0)};
  a.onerror=()=>res(0);
 });
};
/* --- takes: the video itself, so it survives a reload --- */
A.putTake=async function(id,blob){
 const db=await open();
 return new Promise((res,rej)=>{
  const tx=db.transaction(TAKES,'readwrite');
  tx.objectStore(TAKES).put({id,blob,at:Date.now()});
  tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error);
 });
};
A.getTake=async function(id){
 const db=await open();
 return new Promise(res=>{
  const q=db.transaction(TAKES,'readonly').objectStore(TAKES).get(id);
  q.onsuccess=()=>res(q.result?q.result.blob:null); q.onerror=()=>res(null);
 });
};
A.delTake=async function(id){
 const db=await open();
 return new Promise(res=>{
  const tx=db.transaction(TAKES,'readwrite');
  tx.objectStore(TAKES).delete(id); tx.oncomplete=()=>res(true); tx.onerror=()=>res(false);
 });
};
/* the original sides, kept so you can look at the real page - the handwritten
   START/END marks are ink and never appear in the extracted text */
A.putDoc=async function(name,blob){
 const db=await open();
 return new Promise((res,rej)=>{
  const tx=db.transaction(TAKES,'readwrite');
  tx.objectStore(TAKES).put({id:'doc:'+name,blob,at:Date.now()});
  tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error);
 });
};
A.getDoc=async function(name){
 const db=await open();
 return new Promise(res=>{
  const q=db.transaction(TAKES,'readonly').objectStore(TAKES).get('doc:'+name);
  q.onsuccess=()=>res(q.result?q.result.blob:null); q.onerror=()=>res(null);
 });
};
g.ActorReader=A;
})(window);
