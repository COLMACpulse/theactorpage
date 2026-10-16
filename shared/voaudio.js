/* THEACTORPAGE VO SOUND: the Audacity step, for an audition read in a closet on a phone.
   Pure maths on the samples (Float32Array, one channel), so all of it runs in Node for the tests.
   - room(): how loud the closet is with you quiet (the bar most people use: -60 dB)
   - trim(): cut the dead air before and after a line, keep a short breath of room either side
   - loudness(): the standard loudness measure (LUFS, ITU BS.1770: K-weighted, gated)
   - build(): your kept takes in order, rumble cut, the gaps filled with your own room (not dead
     digital silence), one level for the whole read, peaks held under a ceiling
   - wav() / mp3(): the file. MP3 by LAME (shared/vendor/lame.min.js, LGPL, used unchanged).
   Nothing here touches your takes; it makes a new file. Nothing is uploaded. */
(function(g){
const A={};
const db=x=>20*Math.log10(Math.max(x,1e-9));
A.db=db;
/* the level of a stretch: RMS in dB (full scale = 0) */
A.rms=function(d,from,to){ from=Math.max(0,from|0); to=Math.min(d.length,to==null?d.length:to|0); let s=0; for(let i=from;i<to;i++) s+=d[i]*d[i]; return to>from?10*Math.log10(Math.max(s/(to-from),1e-18)):-180; };
A.peak=function(d){ let p=0; for(let i=0;i<d.length;i++){ const a=d[i]<0?-d[i]:d[i]; if(a>p)p=a; } return db(p); };
/* a biquad, run in place. c={b0,b1,b2,a1,a2} (a0 = 1) */
function run(d,c){ const o=new Float32Array(d.length); let x1=0,x2=0,y1=0,y2=0; for(let i=0;i<d.length;i++){ const x=d[i]; const y=c.b0*x+c.b1*x1+c.b2*x2-c.a1*y1-c.a2*y2; x2=x1; x1=x; y2=y1; y1=y; o[i]=y; } return o; }
function norm(b0,b1,b2,a0,a1,a2){ return {b0:b0/a0,b1:b1/a0,b2:b2/a0,a1:a1/a0,a2:a2/a0}; }
A.highpass=function(fc,q,rate){ const w=2*Math.PI*fc/rate, cs=Math.cos(w), al=Math.sin(w)/(2*q); return norm((1+cs)/2,-(1+cs),(1+cs)/2,1+al,-2*cs,1-al); };
A.highshelf=function(fc,q,gainDb,rate){ const Ag=Math.pow(10,gainDb/40), w=2*Math.PI*fc/rate, cs=Math.cos(w), al=Math.sin(w)/(2*q), s=2*Math.sqrt(Ag)*al;
 return norm(Ag*((Ag+1)+(Ag-1)*cs+s), -2*Ag*((Ag-1)+(Ag+1)*cs), Ag*((Ag+1)+(Ag-1)*cs-s), (Ag+1)-(Ag-1)*cs+s, 2*((Ag-1)-(Ag+1)*cs), (Ag+1)-(Ag-1)*cs-s); };
/* the K-weighting pair from the standard, for any sample rate (the same maths as libebur128) */
A.kShelf=function(rate){ const f0=1681.974450955533, G=3.999843853973347, Q=0.7071752369554196, K=Math.tan(Math.PI*f0/rate), Vh=Math.pow(10,G/20), Vb=Math.pow(Vh,0.4996667741545416), a0=1+K/Q+K*K;
 return {b0:(Vh+Vb*K/Q+K*K)/a0,b1:2*(K*K-Vh)/a0,b2:(Vh-Vb*K/Q+K*K)/a0,a1:2*(K*K-1)/a0,a2:(1-K/Q+K*K)/a0}; };
A.kHigh=function(rate){ const f0=38.13547087602444, Q=0.5003270373238773, K=Math.tan(Math.PI*f0/rate), a0=1+K/Q+K*K; return {b0:1,b1:-2,b2:1,a1:2*(K*K-1)/a0,a2:(1-K/Q+K*K)/a0}; };
/* rumble cut: two filters at 80 Hz (the same cut Actor OS uses on a self-tape) */
A.rumbleCut=function(d,rate){ const c=A.highpass(80,0.7071,rate); return run(run(d,c),c); };
/* loudness, LUFS (ITU-R BS.1770-4): K-weighting, 400 ms blocks with 75% overlap, gates at -70 and -10 */
A.loudness=function(d,rate){
 const k=run(run(d,A.kShelf(rate)),A.kHigh(rate));
 const n=Math.round(0.4*rate), hop=Math.round(0.1*rate), z=[];
 for(let i=0;i+n<=k.length;i+=hop){ let s=0; for(let j=i;j<i+n;j++) s+=k[j]*k[j]; z.push(s/n); }
 if(!z.length) return -70;
 const L=x=>-0.691+10*Math.log10(Math.max(x,1e-18));
 let g=z.filter(x=>L(x)>-70); if(!g.length) return -70;
 const rel=L(g.reduce((a,b)=>a+b,0)/g.length)-10; g=g.filter(x=>L(x)>rel);
 return Math.round(L(g.reduce((a,b)=>a+b,0)/g.length)*10)/10;
};
/* the closet check: you, quiet, for a few seconds. Skips the first 0.4 s (the tap). */
A.ROOM_OK=-60; A.ROOM_BAD=-50;
A.room=function(d,rate){
 const from=Math.min(d.length,Math.round(0.4*rate)), level=Math.round(A.rms(d,from)*10)/10;
 const verdict=level<=A.ROOM_OK?'quiet':level<=A.ROOM_BAD?'some':'loud';
 return {level,verdict};
};
A.roomWords=function(r){
 if(!r) return '';
 if(r.verdict==='quiet') return 'Quiet enough: '+r.level+' dB with you silent. The usual bar is -60.';
 if(r.verdict==='some') return 'A little noisy: '+r.level+' dB with you silent (the usual bar is -60). Close the door, turn off the fan or AC, hang a blanket behind you, and check again.';
 return 'Too noisy to send: '+r.level+' dB with you silent (the usual bar is -60). Something is running: a fan, a fridge, traffic. Find it and check again.';
};
/* where the voice starts and stops in a take: 10 ms frames over a line set from the take itself
   (35 dB under its loudest frame, never below -55 dB); keep 0.15 s of room before and 0.25 s after */
A.trim=function(d,rate){
 const f=Math.max(1,Math.round(0.01*rate)), lv=[]; let top=-180;
 for(let i=0;i<d.length;i+=f){ const v=A.rms(d,i,i+f); lv.push(v); if(v>top) top=v; }
 const thr=Math.max(-55,top-35); let a=-1,b=-1;
 for(let i=0;i<lv.length;i++) if(lv[i]>thr){ if(a<0) a=i; b=i; }
 if(a<0) return {start:0,end:0,silent:true};
 return {start:Math.max(0,a*f-Math.round(0.15*rate)),end:Math.min(d.length,(b+1)*f+Math.round(0.25*rate)),silent:false};
};
/* hold every sample under the ceiling: gain comes down just before a peak (5 ms ahead) and comes back over 80 ms */
A.limit=function(d,ceilingDb,rate){
 const c=Math.pow(10,ceilingDb/20), look=Math.max(1,Math.round(0.005*rate)), rel=Math.exp(-1/(0.08*rate)), n=d.length;
 const need=new Float32Array(n); for(let i=0;i<n;i++){ const a=d[i]<0?-d[i]:d[i]; need[i]=a>c?c/a:1; }
 // the lowest gain needed anywhere in the next `look` samples
 const ahead=new Float32Array(n); const q=[]; // deque of indices, increasing need
 for(let i=n-1;i>=0;i--){ while(q.length&&need[q[q.length-1]]>=need[i]) q.pop(); q.push(i); while(q[0]>i+look) q.shift(); ahead[i]=need[q[0]]; }
 const o=new Float32Array(n); let gn=1; let hits=0;
 for(let i=0;i<n;i++){ const t=ahead[i]; gn=t<gn?t:Math.min(t,1-(1-gn)*rel); if(gn<0.999) hits++; let y=d[i]*gn; if(y>c) y=c; else if(y<-c) y=-c; o[i]=y; }
 return {data:o,touched:Math.round(hits/rate*100)/100};
};
/* your room, to fill the gaps: loop it with short fades so the gap sounds like the room, not a hole */
function fill(room,len,rate){
 const o=new Float32Array(len); if(!room||room.length<rate*0.2) return o;
 const r=room.subarray(Math.round(0.4*rate)), fade=Math.round(0.02*rate); let p=0;
 while(p<len){ const n=Math.min(r.length,len-p); for(let i=0;i<n;i++){ let w=1; if(i<fade) w=i/fade; if(n-i<fade) w=Math.min(w,(n-i)/fade); o[p+i]=r[i]*w; } p+=n; }
 return o;
}
/* clips: [{data:Float32Array, rate, after:'line'|'spot'}] in reading order (rate must match).
   o: {target:-20 LUFS, ceiling:-3 dB, gap:0.6 s between lines, spotGap:1.5 s between spots, lead:0.5 s, room:Float32Array} */
A.TARGET=-20; A.CEILING=-3;
A.build=function(clips,o){
 o=Object.assign({target:A.TARGET,ceiling:A.CEILING,gap:0.6,spotGap:1.5,lead:0.5},o||{});
 if(!clips.length) return null;
 const rate=clips[0].rate, room=o.room?A.rumbleCut(o.room,rate):null, parts=[], marks=[];
 let at=0; const push=x=>{ parts.push(x); at+=x.length; };
 push(fill(room,Math.round(o.lead*rate),rate));
 clips.forEach((c,i)=>{
  const hp=A.rumbleCut(c.data,rate), t=A.trim(hp,rate), seg=t.silent?new Float32Array(0):hp.subarray(t.start,t.end);
  marks.push({start:at/rate,secs:seg.length/rate,silent:t.silent});
  push(seg);
  const last=i===clips.length-1, g=last?o.lead:(c.after==='spot'?o.spotGap:o.gap);
  push(fill(room,Math.round(g*rate),rate));
 });
 const all=new Float32Array(at); let p=0; parts.forEach(x=>{ all.set(x,p); p+=x.length; });
 const before=A.loudness(all,rate);
 let gainDb=before>-70?o.target-before:0; gainDb=Math.max(-12,Math.min(30,gainDb));
 const gl=Math.pow(10,gainDb/20); for(let i=0;i<all.length;i++) all[i]*=gl;
 const lim=A.limit(all,o.ceiling,rate);
 return {data:lim.data,rate,secs:Math.round(lim.data.length/rate*10)/10,gain:Math.round(gainDb*10)/10,before,lufs:A.loudness(lim.data,rate),peak:Math.round(A.peak(lim.data)*10)/10,limited:lim.touched,marks,room:room?Math.round(A.rms(room,Math.round(0.4*rate))+gainDb):null};
};
/* how long a spot reads: the kept main lines (not the ALTs) plus the gaps between them */
A.spotTime=function(secsList,gap){ if(!secsList.length) return 0; return Math.round((secsList.reduce((a,b)=>a+b,0)+gap*(secsList.length-1))*10)/10; };
A.timeWords=function(secs,target){
 if(!target) return secs+' s';
 const d=Math.round((secs-target)*10)/10;
 if(Math.abs(d)<=1) return secs+' s of :'+target+'. On time.';
 return secs+' s of :'+target+'. '+(d>0?Math.abs(d)+' s long: pick up the pace or tighten the pauses.':Math.abs(d)+' s short: room to breathe.');
};
/* 16-bit mono WAV */
A.wav=function(d,rate){
 const n=d.length, buf=new ArrayBuffer(44+n*2), v=new DataView(buf); let p=0;
 const s=t=>{ for(let i=0;i<t.length;i++) v.setUint8(p++,t.charCodeAt(i)); }, u32=x=>{ v.setUint32(p,x,true); p+=4; }, u16=x=>{ v.setUint16(p,x,true); p+=2; };
 s('RIFF'); u32(36+n*2); s('WAVE'); s('fmt '); u32(16); u16(1); u16(1); u32(rate); u32(rate*2); u16(2); u16(16); s('data'); u32(n*2);
 for(let i=0;i<n;i++){ const x=Math.max(-1,Math.min(1,d[i])); v.setInt16(p,x<0?x*32768:x*32767,true); p+=2; }
 return new Uint8Array(buf);
};
/* MP3, mono, by LAME. lame: the lamejs object (window.lamejs in a page) */
A.mp3=function(d,rate,kbps,lame){
 lame=lame||g.lamejs; if(!lame||!lame.Mp3Encoder) throw new Error('The MP3 maker did not load.');
 const enc=new lame.Mp3Encoder(1,rate,kbps||128), out=[], n=d.length, blk=1152*8, pcm=new Int16Array(blk);
 for(let i=0;i<n;i+=blk){ const m=Math.min(blk,n-i); for(let j=0;j<m;j++){ const x=Math.max(-1,Math.min(1,d[i+j])); pcm[j]=x<0?x*32768:x*32767; } const b=enc.encodeBuffer(m===blk?pcm:pcm.subarray(0,m)); if(b.length) out.push(b); }
 const f=enc.flush(); if(f.length) out.push(f);
 let len=0; out.forEach(b=>len+=b.length); const o=new Uint8Array(len); let p=0; out.forEach(b=>{ o.set(b,p); p+=b.length; });
 return o;
};
g.VOAudio=A;
if(typeof module!=='undefined') module.exports=A;
})(typeof window!=='undefined'?window:globalThis);
