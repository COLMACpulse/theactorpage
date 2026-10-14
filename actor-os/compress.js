/* ===== TRIM + COMPRESS =====
   Replaces the third-party compressor step. Plays the source through a canvas at
   a chosen size and re-records it at a chosen bitrate, trimming as it goes.

   HONEST LIMITS, because they matter:
   - This is a real re-encode, not a container rewrite. It takes as long as the
     clip runs. A 90 second take takes 90 seconds.
   - Quality comes from the bitrate you pick, and the browser's encoder is not as
     good as a dedicated one. It is good enough for a self-tape and it is one step
     instead of another app.
   - Audio is carried through from the source track.
   - Nothing is upscaled. If you ask for a size larger than the source it clamps.

   Actors Access accepts up to 1 GB and asks for under 500 MB. The targets here are
   built around landing well under that without visible damage. */
(function(g){
const A={};

A.PRESETS=[
 {id:'CASTING', label:'Casting standard', h:1080, mbps:8,
  note:'1080p, high bitrate. What most offices expect.'},
 {id:'LIGHT',   label:'Smaller file',     h:1080, mbps:4,
  note:'1080p at half the bitrate. Uploads faster, still clean.'},
 {id:'SMALL',   label:'720p',             h:720,  mbps:2.5,
  note:'When the upload keeps failing or the connection is bad.'}
];
A.estimate=function(seconds,mbps){ return Math.round(seconds*mbps*1000000/8); };

A.mime=function(){
 const list=['video/mp4;codecs=avc1.4d002a,mp4a.40.2','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4;codecs=avc1,opus','video/mp4;codecs=avc1'];
 // Safari's plain video/mp4 is H.264. Chrome's is not, so only trust it where WebM is missing.
 let webm=false; try{ webm=MediaRecorder.isTypeSupported('video/webm'); }catch(e){}
 if(!webm) list.push('video/mp4');
 list.push('video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm');
 for(const m of list){ try{ if(MediaRecorder.isTypeSupported(m))return m; }catch(e){} }
 return '';
};

/* trimStart / trimEnd in seconds. h = target height. */
A.process=async function(blob,opts){
 const o=Object.assign({h:1080,mbps:8,trimStart:0,trimEnd:0,onProgress:null},opts||{});
 const v=document.createElement('video');
 v.src=URL.createObjectURL(blob); v.muted=false; v.playsInline=true; v.preload='auto';
 await new Promise((res,rej)=>{ v.onloadedmetadata=res; v.onerror=()=>rej(new Error('cannot read that take')); });
 const SW=v.videoWidth, SH=v.videoHeight, dur=v.duration;
 if(!SW||!isFinite(dur)) throw new Error('that take has no usable video');

 const start=Math.max(0,Math.min(o.trimStart,dur-0.2));
 const end=Math.max(start+0.2,Math.min(dur-(o.trimEnd||0),dur));
 const span=end-start;

 // never upscale
 const outH=Math.min(o.h,SH), outW=Math.round(SW*(outH/SH)/2)*2;
 const cvs=document.createElement('canvas'); cvs.width=outW; cvs.height=outH;
 const ctx=cvs.getContext('2d');
 const stream=cvs.captureStream(30);
 /* Sound goes through Web Audio, not video.captureStream: Safari does not have
    captureStream on a video, so on an iPhone the old route made a silent file. */
 let ac=null;
 let sound=null;
 if(o.clean){ if(o.onProgress)o.onProgress(0,'Measuring the sound'); sound=await A.measure(blob); }
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  ac=new AC(); if(ac.state==='suspended') await ac.resume().catch(()=>{});
  const dest=ac.createMediaStreamDestination();
  const srcNode=ac.createMediaElementSource(v);
  if(o.clean){ const lim=A.limiter(ac); lim.connect(dest); A.chain(ac,srcNode,sound,lim); }
  else srcNode.connect(dest);
  dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
 }catch(e){ ac=null; }

 const m=A.mime();
 const rec = m ? new MediaRecorder(stream,{mimeType:m,
                   videoBitsPerSecond:Math.round(o.mbps*1000000), audioBitsPerSecond:128000})
               : new MediaRecorder(stream);
 const chunks=[];
 rec.ondataavailable=e=>{ if(e.data.size)chunks.push(e.data); };
 const done=new Promise(res=>{ rec.onstop=()=>res(new Blob(chunks,{type:rec.mimeType||'video/mp4'})); });

 v.currentTime=start;
 await new Promise(r=>{ const h2=()=>{v.removeEventListener('seeked',h2);r();}; v.addEventListener('seeked',h2); });
 rec.start();
 await v.play().catch(()=>{});
 await new Promise(resolve=>{
  const tick=()=>{
   if(v.currentTime>=end||v.ended){ resolve(); return; }
   ctx.drawImage(v,0,0,outW,outH);
   if(o.onProgress)o.onProgress(Math.min(1,(v.currentTime-start)/span));
   requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
 });
 try{ v.pause(); }catch(e){}
 rec.stop();
 const out=await done;
 URL.revokeObjectURL(v.src);
 try{ if(ac)ac.close(); }catch(e){}
 return {blob:out, width:outW, height:outH, seconds:Math.round(span*10)/10,
         from:blob.size, to:out.size,
         saved:Math.round((1-out.size/Math.max(1,blob.size))*100),
         sound:o.clean?A.soundLine(sound):''};
};
/* ===== STITCH =====
   Some offices want every take as its own file; some want one file with the slate
   on the front. This plays each clip through a canvas in sequence and records the
   whole run as a single video.

   It re-encodes in real time, so the cost is the sum of the clips - three ninety
   second takes plus a slate is about five minutes. There is no faster path in a
   browser without a native encoder.

   Hard cuts only. Casting instructions routinely say no cross-fades, so the join
   is either a straight cut or a beat of black, never a dissolve. */
A.stitch=async function(items,opts){
 const o=Object.assign({h:1080,mbps:8,gapMs:0,onProgress:null},opts||{});
 if(!items.length)throw new Error('nothing to join');
 // measure first so the canvas is sized once and never rescales mid-run
 const vids=[];
 for(const it of items){
  const v=document.createElement('video');
  v.src=URL.createObjectURL(it.blob); v.preload='auto'; v.playsInline=true;
  await new Promise((res,rej)=>{ v.onloadedmetadata=res; v.onerror=()=>rej(new Error('cannot read '+(it.name||'a clip'))); });
  vids.push({v:v,name:it.name});
 }
 const src=vids[0].v;
 const outH=Math.min(o.h,src.videoHeight||o.h);
 const outW=Math.round((src.videoWidth/src.videoHeight)*outH/2)*2;
 const cvs=document.createElement('canvas'); cvs.width=outW; cvs.height=outH;
 const ctx=cvs.getContext('2d');
 const stream=cvs.captureStream(30);

 // one audio destination the whole run mixes into, so the track never stops
 const AC=window.AudioContext||window.webkitAudioContext;
 const ac=new AC(); const dest=ac.createMediaStreamDestination();
 dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
 // clean sound: every clip measured on its own and brought to the same level
 let lim=null;
 if(o.clean){
  lim=A.limiter(ac); lim.connect(dest);
  for(let i=0;i<items.length;i++){
   if(o.onProgress)o.onProgress(0,'Measuring the sound '+(i+1)+' of '+items.length);
   vids[i].sound=await A.measure(items[i].blob);
  }
 }

 const m=A.mime();
 const rec = m ? new MediaRecorder(stream,{mimeType:m,videoBitsPerSecond:Math.round(o.mbps*1000000),audioBitsPerSecond:128000})
               : new MediaRecorder(stream);
 const chunks=[]; rec.ondataavailable=e=>{ if(e.data.size)chunks.push(e.data); };
 const done=new Promise(res=>{ rec.onstop=()=>res(new Blob(chunks,{type:rec.mimeType||'video/mp4'})); });
 rec.start();

 const total=vids.reduce((n,x)=>n+(isFinite(x.v.duration)?x.v.duration:0),0)||1;
 let elapsed=0;
 for(let i=0;i<vids.length;i++){
  const v=vids[i].v;
  let node=null;
  let tail=null;
  try{ node=ac.createMediaElementSource(v);
       if(lim) tail=A.chain(ac,node,vids[i].sound,lim); else node.connect(dest); }catch(e){}
  v.currentTime=0;
  await new Promise(r=>{ const h=()=>{v.removeEventListener('seeked',h);r();}; v.addEventListener('seeked',h); });
  await v.play().catch(()=>{});
  await new Promise(resolve=>{
   const tick=()=>{
    if(v.ended||v.currentTime>=(v.duration-0.05)){ resolve(); return; }
    ctx.drawImage(v,0,0,outW,outH);
    if(o.onProgress)o.onProgress(Math.min(1,(elapsed+v.currentTime)/total), vids[i].name);
    requestAnimationFrame(tick);
   };
   requestAnimationFrame(tick);
  });
  try{ v.pause(); }catch(e){}
  elapsed+=isFinite(v.duration)?v.duration:0;
  try{ if(node)node.disconnect(); if(tail)tail.disconnect(); }catch(e){}
  // a beat of black between clips, never a dissolve
  if(o.gapMs && i<vids.length-1){
   const t0=performance.now();
   await new Promise(resolve=>{
    const tick=()=>{
     if(performance.now()-t0>=o.gapMs){ resolve(); return; }
     ctx.fillStyle='#000'; ctx.fillRect(0,0,outW,outH);
     requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
   });
  }
 }
 rec.stop();
 const out=await done;
 vids.forEach(x=>{ try{URL.revokeObjectURL(x.v.src);}catch(e){} });
 try{ ac.close(); }catch(e){}
 return {blob:out,width:outW,height:outH,seconds:Math.round(total*10)/10,count:items.length,
         sound:lim?vids.map(x=>({name:x.name,line:A.soundLine(x.sound)})):null};
};
/* ===== CLEAN SOUND =====
   Two things, both plain:
   1. Cut everything under 80 Hz. That band is air conditioning, traffic, the
      fridge and mic handling. A voice has almost nothing down there.
   2. Bring the whole take to one level. The take is measured first, then a single
      fixed amount of gain is applied to all of it. The quiet moments stay quieter
      than the loud ones, exactly as played. Nothing rides the volume up and down.
      A limiter only touches the rare peak that would otherwise distort.

   Measuring means decoding the take's sound, which needs the whole file in memory.
   Past MEASURE_MAX, or if the phone can't decode it, the rumble cut still runs
   and the level is left alone, and the result says so. */
A.TARGET=-18;          // dB, average level of the voice, ignoring silence
A.MEASURE_MAX=700*1048576;
A.measure=async function(blob){
 if(!blob||!blob.size) return null;
 if(blob.size>A.MEASURE_MAX) return {skipped:'too big to measure here'};
 let ac=null;
 try{
  const ab=await blob.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;
  ac=new AC();
  const buf=await new Promise((res,rej)=>{ const p=ac.decodeAudioData(ab,res,rej); if(p&&p.then)p.then(res,rej); });
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const off=new OAC(1,buf.length,buf.sampleRate);
  const s=off.createBufferSource(); s.buffer=buf;
  const hp=A.rumbleCut(off);
  s.connect(hp.in); hp.out.connect(off.destination); s.start(0);
  const r=await new Promise((res,rej)=>{ off.oncomplete=e=>res(e.renderedBuffer); const p=off.startRendering(); if(p&&p.then)p.then(res,rej); });
  return A.levelOf(r.getChannelData(0),r.sampleRate);
 }catch(e){ return {skipped:"this phone couldn't read the sound to measure it"}; }
 finally{ try{ if(ac)ac.close(); }catch(e){} }
};
/* Average level of the voice: 400 ms blocks, silence ignored (anything under
   -60 dB, then anything 10 dB under the average of what's left). Pure, so it
   runs in Node for the tests. */
A.levelOf=function(d,rate){
 const n=Math.max(1,Math.round(rate*0.4)), ms=[]; let peak=0;
 for(let i=0;i<d.length;i+=n){
  let sum=0; const e=Math.min(d.length,i+n);
  for(let j=i;j<e;j++){ const x=d[j]; sum+=x*x; const a=x<0?-x:x; if(a>peak)peak=a; }
  ms.push(sum/Math.max(1,e-i));
 }
 const db=x=>10*Math.log10(Math.max(x,1e-12));
 let keep=ms.filter(x=>db(x)>-60);
 if(!keep.length) return {level:null,peak:20*Math.log10(Math.max(peak,1e-6)),silent:true,gain:0};
 const avg=keep.reduce((a,b)=>a+b,0)/keep.length;
 const keep2=keep.filter(x=>db(x)>db(avg)-10);
 const lvl=db(keep2.reduce((a,b)=>a+b,0)/keep2.length);
 return {level:Math.round(lvl*10)/10, peak:Math.round(20*Math.log10(Math.max(peak,1e-6))*10)/10, gain:A.gainFor(lvl)};
};
A.gainFor=function(level){
 const g=A.TARGET-level;
 if(Math.abs(g)<1) return 0;                 // already there: leave it alone
 return Math.round(Math.max(-12,Math.min(24,g))*10)/10;
};
/* Two filters in a row: steep below 80 Hz, untouched above about 100 Hz. */
A.rumbleCut=function(ac){
 const a=ac.createBiquadFilter(), b=ac.createBiquadFilter();
 [a,b].forEach(f=>{ f.type='highpass'; f.frequency.value=80; f.Q.value=0.707; });
 a.connect(b); return {in:a,out:b};
};
A.limiter=function(ac){
 const c=ac.createDynamicsCompressor();
 c.threshold.value=-2; c.knee.value=0; c.ratio.value=20; c.attack.value=0.002; c.release.value=0.15;
 return c;
};
/* source -> rumble cut -> fixed gain -> into (limiter). Returns the last node. */
A.chain=function(ac,src,sound,into){
 const hp=A.rumbleCut(ac);
 const g=ac.createGain(); g.gain.value=Math.pow(10,((sound&&sound.gain)||0)/20);
 src.connect(hp.in); hp.out.connect(g); g.connect(into);
 return g;
};
A.soundLine=function(sound){
 if(!sound) return 'Rumble cut. Level left as it was.';
 if(sound.skipped) return 'Rumble cut. Level left as it was ('+sound.skipped+').';
 if(sound.silent) return 'Rumble cut. No voice found to level.';
 if(!sound.gain) return 'Rumble cut. Level was already right.';
 return 'Rumble cut. '+(sound.gain>0?'Brought up ':'Brought down ')+Math.round(Math.abs(sound.gain))+' dB.';
};

/* ===== FIT UNDER A SIZE =====
   Works back from a size limit to a bitrate. The browser's encoder lands near
   the bitrate it's asked for, not on it, so this aims 15% under the limit and the
   result always reports the real size against the limit. */
A.AUDIO_MBPS=0.128;
A.MIN_MBPS=0.4;
A.fit=function(seconds,capMB){
 const s=Math.max(1,seconds), cap=Number(capMB);
 if(!(cap>0)) return {ok:false,reason:'Type a size in MB.'};
 const mbps=(cap*1048576*8/1e6)/s*0.85 - A.AUDIO_MBPS;
 if(mbps<A.MIN_MBPS){
  const need=Math.ceil((A.MIN_MBPS+A.AUDIO_MBPS)*s*1e6/8/1048576/0.85);
  return {ok:false,reason:'Too long to fit under '+cap+' MB and still look like a tape. It needs about '+need+' MB.'};
 }
 const m=Math.min(8,Math.round(mbps*100)/100);
 return {ok:true,mbps:m,h:m>=3?1080:(m>=1.2?720:480)};
};

/* What the file really is, so the name and the warning tell the truth. */
A.kind=function(type){
 const t=String(type||'').toLowerCase();
 const h264=/avc1|h264/.test(t)||(/^video\/mp4/.test(t)&&!/vp9|vp8|av01/.test(t));
 return {ext:/webm/.test(t)?'webm':'mp4', h264:h264};
};
g.ActorCompress=A;
})(window);
