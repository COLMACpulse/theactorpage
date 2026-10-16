/* THEACTORPAGE CAPTURE: one camera and one mic for every tool.
   Before this, seven tools each opened the camera or mic their own way (different formats, different
   fallbacks, plain-words errors in one of them). This is the best of each:
   - from Actor OS's performer camera: a chosen device wins, a missing one falls back to whatever is
     there; the mic raw (no echo cancelling, no noise gate, no auto gain), which is what casting hears
   - from Slate Maker and Story Studio's rough cut: MP4 first (plays on iPhone, QuickTime, casting
     sites), WebM when the browser can't; the screen kept awake while recording
   - from Story Studio's Match Camera: plain words for every way the camera can refuse, and the camera
     released when you leave the page
   Nothing uploaded. The takes go on the takes shelf (shared/takes.js). */
(function(g){
const C={};
C.VIDEO=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
C.AUDIO=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
/* isSupported: (mime)=>bool. Pure, so it can be tested. */
C.pickMime=function(kind,isSupported){ const L=kind==='audio'?C.AUDIO:C.VIDEO; for(const m of L){ try{ if(isSupported(m)) return m; }catch(e){} } return ''; };
C.ext=m=>/mp4/.test(m||'')?(/^audio/.test(m)?'m4a':'mp4'):/ogg/.test(m||'')?'ogg':'webm';
C.errorWords=function(e,kind){
 const n=e&&e.name||'', what=kind==='audio'?'mic':'camera';
 if(e&&e.hot==='notnow') return 'Not now. Tap again when you are ready.';
 if(e&&e.hot==='blocked') return 'The '+what+' is blocked for this site. The steps to allow it are above; then try again.';
 if(n==='NotAllowedError'||n==='SecurityError') return 'The '+what+' is blocked for this site. Allow it in the browser\'s site settings (the icon by the address), then try again.';
 if(n==='NotFoundError'||n==='DevicesNotFoundError') return 'No '+what+' found on this device.';
 if(n==='NotReadableError'||n==='TrackStartError') return 'Another app is using the '+what+'. Close it (FaceTime, Zoom, the Camera app) and try again.';
 if(n==='OverconstrainedError') return 'That '+what+' can\'t do what was asked. Pick another one.';
 if(n==='insecure') return 'The '+what+' only works on a secure page (https).';
 if(n==='noapi') return 'This browser can\'t use the '+what+'. Try Safari or Chrome.';
 return 'The '+what+' didn\'t start'+(e&&e.message?': '+e.message:'.');
};
/* Open the camera and/or mic. o: {video:true, audio:true, facing:'user'|'environment', deviceId, micId, w, h} */
C.open=async function(o){
 o=o||{};
 if(typeof location!=='undefined'&&!g.isSecureContext&&!/^(localhost|127\.)/.test(location.hostname)) { const e=new Error('insecure'); e.name='insecure'; throw e; }
 if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){ const e=new Error('noapi'); e.name='noapi'; throw e; }
 const raw={echoCancellation:false,noiseSuppression:false,autoGainControl:false};
 const vid=dev=>({width:{ideal:o.w||1920},height:{ideal:o.h||1080},frameRate:{ideal:30},...(dev&&o.deviceId?{deviceId:{exact:o.deviceId}}:{facingMode:{ideal:o.facing||'user'}})});
 const aud=dev=>Object.assign({},raw,dev&&o.micId?{deviceId:{exact:o.micId}}:{});
 const want=dev=>({video:o.video===false?false:vid(dev),audio:o.audio===false?false:aud(dev)});
 try{ return await navigator.mediaDevices.getUserMedia(want(true)); }
 catch(e){
  // a remembered camera or mic that's gone: open whatever is there
  if((o.deviceId||o.micId)&&e.name!=='NotAllowedError') return await navigator.mediaDevices.getUserMedia(want(false));
  // a phone that won't do raw audio: let it process the sound rather than not record at all
  if(e.name==='OverconstrainedError'&&o.audio!==false) return await navigator.mediaDevices.getUserMedia({video:want(false).video,audio:true});
  throw e;
 }
};
C.devices=async function(){ try{ const L=await navigator.mediaDevices.enumerateDevices(); return {cams:L.filter(d=>d.kind==='videoinput'),mics:L.filter(d=>d.kind==='audioinput')}; }catch(e){ return {cams:[],mics:[]}; } };
C.stop=function(stream){ try{ stream&&stream.getTracks().forEach(t=>t.stop()); }catch(e){} };
/* Record a stream. Returns {stop:()=>Promise<{blob,mime,ext,secs}>, cancel, secs()} */
C.record=function(stream,kind){
 if(typeof MediaRecorder==='undefined') throw new Error('This browser can\'t record. Try Safari or Chrome.');
 const mime=C.pickMime(kind||(stream.getVideoTracks().length?'video':'audio'),m=>MediaRecorder.isTypeSupported(m));
 const rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:8e6,audioBitsPerSecond:192000}:{});
 const chunks=[]; let t0=Date.now(), wl=null;
 rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
 rec.start(1000);
 if(navigator.wakeLock) navigator.wakeLock.request('screen').then(w=>{ wl=w; }).catch(()=>{});
 const done=new Promise(res=>{ rec.onstop=()=>{ try{ wl&&wl.release(); }catch(e){} const m=(rec.mimeType||mime||'video/webm'); res({blob:new Blob(chunks,{type:m.split(';')[0]}),mime:m,ext:C.ext(m),secs:Math.round((Date.now()-t0)/100)/10}); }; });
 return { stop:()=>{ if(rec.state!=='inactive') rec.stop(); return done; }, cancel:()=>{ chunks.length=0; try{ rec.stop(); }catch(e){} }, secs:()=>Math.round((Date.now()-t0)/1000), mime:()=>rec.mimeType||mime };
};
/* A still from the live video, as JPEG */
C.snap=async function(video,mirror){
 const c=document.createElement('canvas'); c.width=video.videoWidth; c.height=video.videoHeight; const x=c.getContext('2d');
 if(mirror){ x.translate(c.width,0); x.scale(-1,1); } x.drawImage(video,0,0);
 return await new Promise(r=>c.toBlob(r,'image/jpeg',0.92));
};
/* File name the way casting reads it: NAME_ROLE_take1_2026-10-16.mp4 */
C.fileName=function(o){ const s=x=>String(x||'').trim().replace(/[^\w ]+/g,' ').trim().replace(/\s+/g,'_'); return [s(o.name),s(o.role),o.n?'take'+o.n:'',o.date||new Date().toISOString().slice(0,10)].filter(Boolean).join('_')+'.'+(o.ext||'mp4'); };
g.Capture=C;
if(typeof module!=='undefined') module.exports=C;
})(typeof window!=='undefined'?window:globalThis);
