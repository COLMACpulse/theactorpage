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

   Where it's going sets the size to land under (shared/delivery.js SITES): Eco Cast on Actors Access takes up
   to 100 MB a clip, Casting Networks 300 MB, Backstage 2 GB. A 2-minute take at 8 Mbps is about 120 MB, so for
   Eco Cast it has to come down. */
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
 /* a clip of another shape sits whole on black (never stretched) */
 const fitDraw=v=>{ const vw=v.videoWidth||outW, vh=v.videoHeight||outH;
  if(Math.abs(vw/vh-outW/outH)<0.01){ ctx.drawImage(v,0,0,outW,outH); return; }
  const k=Math.min(outW/vw,outH/vh), w=vw*k, h=vh*k; ctx.fillStyle='#000'; ctx.fillRect(0,0,outW,outH); ctx.drawImage(v,(outW-w)/2,(outH-h)/2,w,h); };
 /* opts.card {lines:[big, small...], secs}: a plain card first, your name from Your page (Footage, Oct 27) */
 if(o.card&&o.card.lines&&o.card.lines.length){
  const secs=o.card.secs||2.5, t0=performance.now();
  await new Promise(resolve=>{ const tick=()=>{ if(performance.now()-t0>=secs*1000){ resolve(); return; }
    ctx.fillStyle='#000'; ctx.fillRect(0,0,outW,outH); ctx.fillStyle='#f2efe8'; ctx.textAlign='center'; ctx.textBaseline='middle';
    o.card.lines.forEach((l,k)=>{ const z=k?Math.round(outH/20):Math.round(outH/10); ctx.font=(k?'500 ':'600 ')+z+'px Jost, system-ui, sans-serif'; ctx.fillText(String(l),outW/2,outH/2+(k?Math.round(outH/14)+ (k-1)*Math.round(outH/16):-Math.round(outH/30))); });
    requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
 }
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
    fitDraw(v);
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
  const out=A.levelOf(r.getChannelData(0),r.sampleRate);
  // read off the decoded file itself, before any filter: distortion and a dead side
  const ch=[]; for(let i=0;i<buf.numberOfChannels;i++) ch.push(buf.getChannelData(i));
  out.clip=A.clipsOf(ch,buf.sampleRate);
  out.side=A.sideOf(ch,buf.sampleRate);
  return out;
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
/* Distortion: the waveform held flat at full volume. 4 or more samples in a row at
   99% of full scale, on any channel; hits closer than half a second count as one
   place. A loud take that only touches the top once is not flagged. Pure. */
A.CLIP_AT=0.99; A.CLIP_RUN=4;
A.clipsOf=function(chans,rate){
 const hits=[]; let ms=0;
 chans.forEach(d=>{
  let run=0;
  for(let i=0;i<=d.length;i++){
   const x=i<d.length?d[i]:0, a=x<0?-x:x;
   if(a>=A.CLIP_AT){ run++; continue; }
   if(run>=A.CLIP_RUN){ hits.push((i-run)/rate); ms+=run*1000/rate; }
   run=0;
  }
 });
 if(!hits.length) return null;
 hits.sort((a,b)=>a-b);
 const at=[]; hits.forEach(t=>{ if(!at.length||t-at[at.length-1].end>0.5) at.push({t:t,end:t}); else at[at.length-1].end=t; });
 return {places:at.map(x=>Math.round(x.t*10)/10), ms:Math.max(1,Math.round(ms/chans.length))};
};
/* One ear only: two channels, the voice on one and nothing (or 30 dB less) on the
   other. Returns 'left', 'right' or null. Pure. */
A.sideOf=function(chans,rate){
 if(chans.length!==2) return null;
 const l=A.levelOf(chans[0],rate), r=A.levelOf(chans[1],rate);
 if(l.silent&&r.silent) return null;
 const lv=l.silent?-120:l.level, rv=r.silent?-120:r.level;
 if(rv<=lv-30) return 'left';
 if(lv<=rv-30) return 'right';
 return null;
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
 // sound in one ear only: fold it to one channel so it plays in both
 if(sound&&sound.side){ hp.in.channelCount=1; hp.in.channelCountMode='explicit'; hp.in.channelInterpretation='speakers'; }
 const g=ac.createGain(); g.gain.value=Math.pow(10,((sound&&sound.gain)||0)/20);
 src.connect(hp.in); hp.out.connect(g); g.connect(into);
 return g;
};
A.soundLine=function(sound){
 if(!sound) return 'Rumble cut. Level left as it was.';
 if(sound.skipped) return 'Rumble cut. Level left as it was ('+sound.skipped+').';
 if(sound.silent) return 'Rumble cut. No voice found to level.';
 const both=sound.side?' Sound was only in your '+sound.side+' ear; now it\'s in both.':'';
 const clip=sound.clip?' Distorted in '+sound.clip.places.length+' place'+(sound.clip.places.length===1?'':'s')+': that can\'t be fixed here, only re-recorded.':'';
 if(!sound.gain) return 'Rumble cut. Level was already right.'+both+clip;
 return 'Rumble cut. '+(sound.gain>0?'Brought up ':'Brought down ')+Math.round(Math.abs(sound.gain))+' dB.'+both+clip;
};
A.clipLine=function(clip){
 const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
 const p=clip.places, show=p.slice(0,3).map(mm);
 const where=show.length===1?show[0]:show.slice(0,-1).join(', ')+(p.length>3?', '+show[show.length-1]+' and '+(p.length-3)+' more':' and '+show[show.length-1]);
 return 'Distorted at '+where+' ('+clip.ms+' ms in all). The sound hit full volume and went flat. Re-record that part lower or further from the mic.';
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

/* ===== BEFORE YOU SEND =====
   Mined from ACTOR CUTROOM, which trusted the file name and called a silent track
   "audio measured". Everything here is read from the file itself:
   - the container and codecs from the file's own bytes (not its name)
   - sound from the decoded audio level (a silent track is caught, not just a missing one)
   - length, picture size and bytes from the file
   It reports. It never says "ready". */
async function bytesAt(blob,start,len){ try{ return new Uint8Array(await blob.slice(start,start+len).arrayBuffer()); }catch(e){ return new Uint8Array(0); } }
function has(u8,str){ const n=str.length; outer: for(let i=0;i+n<=u8.length;i++){ for(let j=0;j<n;j++) if(u8[i+j]!==str.charCodeAt(j)) continue outer; return true; } return false; }
A.sniff=async function(blob){
 const head=await bytesAt(blob,0,262144);
 const tail=blob.size>524288?await bytesAt(blob,blob.size-262144,262144):new Uint8Array(0);
 const any=str=>has(head,str)||has(tail,str);
 const out={container:'unknown',video:'',audio:''};
 if(head[0]===0x1A&&head[1]===0x45&&head[2]===0xDF&&head[3]===0xA3){
  out.container='WebM';
  out.video=any('V_VP9')?'VP9':any('V_VP8')?'VP8':any('V_AV1')?'AV1':any('V_MPEG4/ISO/AVC')?'H.264':'';
  out.audio=any('A_OPUS')?'Opus':any('A_VORBIS')?'Vorbis':any('A_AAC')?'AAC':'';
 } else if(head.length>11&&String.fromCharCode(head[4],head[5],head[6],head[7])==='ftyp'){
  const brand=String.fromCharCode(head[8],head[9],head[10],head[11]);
  out.container=brand==='qt  '?'MOV':'MP4';
  // moov can be at the end of the file (phones often put it there)
  out.video=any('avc1')||any('avc3')?'H.264':(any('hvc1')||any('hev1'))?'HEVC':any('vp09')?'VP9':any('av01')?'AV1':'';
  out.audio=any('mp4a')?'AAC':any('Opus')?'Opus':any('ac-3')?'AC-3':'';
  // length and picture size straight from the boxes, for when this browser can't open the video
  const box=(u8,name)=>{ const n=name.length; for(let i=4;i+n<=u8.length;i++){ let k=0; while(k<n&&u8[i+k]===name.charCodeAt(k))k++; if(k===n) return i; } return -1; };
  const u32=(u8,i)=>((u8[i]<<24)>>>0)+(u8[i+1]<<16)+(u8[i+2]<<8)+u8[i+3];
  for(const u8 of [head,tail]){
   const mv=box(u8,'mvhd'); if(mv>0&&!out.secs){ const v=u8[mv+4], b=mv+8;
    const ts=v===1?u32(u8,b+16):u32(u8,b+8), du=v===1?(u32(u8,b+20)*4294967296+u32(u8,b+24)):u32(u8,b+12);
    if(ts>0&&du>0) out.secs=du/ts; }
   let at=0; while(!out.w){ const i=box(u8.subarray(at),'tkhd'); if(i<0)break; const t=at+i, v=u8[t+4], b=t+8+(v===1?84:72);
    const w=u32(u8,b)/65536, h=u32(u8,b+4)/65536; if(w>0&&h>0){ out.w=Math.round(w); out.h=Math.round(h); } at=t+4; }
  }
 }
 return out;
};
function meta(blob){
 return new Promise(res=>{
  const v=document.createElement('video'); v.preload='metadata'; v.muted=true;
  const url=URL.createObjectURL(blob); let done=false;
  const fin=r=>{ if(done)return; done=true; try{URL.revokeObjectURL(url);}catch(e){} res(r); };
  v.onloadedmetadata=()=>{
   const out={w:v.videoWidth,h:v.videoHeight,secs:isFinite(v.duration)?v.duration:0};
   if(out.secs) return fin(out);
   // recordings from Chrome report no length until you seek to the end
   v.ontimeupdate=()=>{ v.ontimeupdate=null; out.secs=isFinite(v.duration)?v.duration:0; fin(out); };
   try{ v.currentTime=1e9; }catch(e){ fin(out); }
   setTimeout(()=>fin(out),3000);
  };
  v.onerror=()=>fin({w:0,h:0,secs:0});
  v.src=url; setTimeout(()=>fin({w:0,h:0,secs:0}),8000);
 });
}
A.check=async function(blob,opts){
 const o=opts||{};
 const [fmt,m,snd]=await Promise.all([A.sniff(blob),meta(blob),A.measure(blob)]);
 const secs=m.secs||fmt.secs||o.secs||0;
 return {fmt:fmt,secs:secs,w:m.w||fmt.w||0,h:m.h||fmt.h||0,bytes:blob.size,sound:snd,limit:o.limit||0};
};
/* the list, in plain words. bad = something you'd want to fix before sending */
A.checkLines=function(c){
 const L=[], mm=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
 // sound
 const sd=c.sound, f0=c.fmt||{};
 if(f0.container!=='unknown'&&!f0.audio&&(!sd||sd.skipped)) L.push({ok:false,t:'No sound track in this file.'});
 else if(!sd||sd.skipped) L.push({ok:null,t:"Sound: couldn't check it on this "+((sd&&/too big/.test(sd.skipped||''))?'file (too big to measure here)':'phone')+'. Play it through once before you send.'});
 else if(sd.silent) L.push({ok:false,t:'No sound in this file. The track is there but it\'s silent.'});
 else if(sd.level!=null&&sd.level<-42) L.push({ok:false,t:'Sound is very quiet ('+Math.round(sd.level)+' dB). Check it before you send.'});
 else L.push({ok:true,t:'Sound: yes'+(sd.level!=null?' (voice around '+Math.round(sd.level)+' dB)':'')+'.'});
 if(sd&&!sd.skipped&&!sd.silent){
  if(sd.clip) L.push({ok:false,t:A.clipLine(sd.clip)});
  if(sd.side) L.push({ok:false,t:'Sound is only in your '+sd.side+' ear. Casting will hear you on one side. CUT with "Clean up the sound" on puts it in both.'});
 }
 // format
 const f=c.fmt||{};
 if(f.container==='unknown') L.push({ok:null,t:"Format: couldn't read it from the file."});
 else {
  const desc=f.container+(f.video?', '+f.video:'')+(f.audio?' / '+f.audio:'');
  if(f.container==='WebM') L.push({ok:false,t:desc+'. iPhones, Macs and some casting sites may not play WebM.'});
  else if(f.video==='HEVC') L.push({ok:false,t:desc+'. HEVC (H.265) won\'t play on some computers. H.264 is the safe one.'});
  else if(f.video&&f.video!=='H.264') L.push({ok:false,t:desc+'. Casting sites expect H.264.'});
  else L.push({ok:true,t:desc+'.'});
 }
 // length
 if(c.secs){
  if(c.limit&&c.secs>c.limit+0.5) L.push({ok:false,t:'Length '+mm(c.secs)+', over your '+mm(c.limit)+' limit by '+Math.round(c.secs-c.limit)+' s.'});
  else L.push({ok:true,t:'Length '+mm(c.secs)+(c.limit?', under your '+mm(c.limit)+' limit.':'.')});
 } else L.push({ok:null,t:"Length: couldn't read it."});
 // picture + size
 if(c.w&&c.h) L.push({ok:c.h>=720||c.w>=720?true:null,t:'Picture '+c.w+'\u00d7'+c.h+(c.h<720&&c.w<720?'. Small for a self-tape.':'.')});
 const mb=c.bytes/1048576;
 L.push({ok:mb<500,t:mb.toFixed(1)+' MB'+(mb<500?', under 500 MB.':'. Over 500 MB: most sites will refuse it. Use CUT to make it smaller.')});
 return L;
};
A.checkHtml=function(c,title){
 const e=x=>String(x).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
 const L=A.checkLines(c), bad=L.filter(x=>x.ok===false).length;
 return '<div class="sendcheck">'+(title?'<div class="sch">'+e(title)+'</div>':'')+
  '<div class="schs">'+(bad?bad+' thing'+(bad===1?'':'s')+' to look at before you send.':'Nothing wrong found in the file.')+'</div>'+
  L.map(x=>'<div class="sc '+(x.ok===false?'bad':x.ok?'ok':'unk')+'"><i></i>'+e(x.t)+'</div>').join('')+'</div>';
};

/* What the file really is, so the name and the warning tell the truth. */
A.kind=function(type){
 const t=String(type||'').toLowerCase();
 const h264=/avc1|h264/.test(t)||(/^video\/mp4/.test(t)&&!/vp9|vp8|av01/.test(t));
 return {ext:/webm/.test(t)?'webm':'mp4', h264:h264};
};
g.ActorCompress=A;
})(window);
