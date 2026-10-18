/* ACTOR OS · READING A TAKE: your pace, your cue pickups, and where the sound clipped. Numbers from the take
   itself, no verdict. Mined from ACTORKNIFE (speech pace, cue timer, voice level and clipping) and fixed:
   - pace counts the words you say (your lines only, not names, (beats) or dashes), over the time you're talking
   - pickup is from the moment your partner's line ends to the first sound of you
   - clipped means the sound hit the top for at least three samples running
   How: the take's sound, in 20 ms steps. The room's floor is measured from the take; you're "talking" when you're
   clearly over it. Each of your lines runs from its marker (the moment the scene moved to it) to the next one.
   Phone speaker and room echo can sit in that window, and the phone's audio delay adds a little: pickups are good
   to about a tenth of a second, not to the frame. Not checked against a stopwatch yet. */
(function(g){
const T={}, HOP=0.02;
T.WORD=/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
/* the words you say: no parentheticals, no stage directions in brackets */
T.words=s=>(String(s||'').replace(/\([^)]*\)/g,' ').replace(/\[[^\]]*\]/g,' ').match(T.WORD)||[]).length;
/* loudness every 20 ms, in dBFS */
T.frames=function(x,rate){ const n=Math.max(1,Math.round(rate*HOP)), out=new Float32Array(Math.floor(x.length/n));
 for(let f=0;f<out.length;f++){ let s=0; for(let i=f*n;i<(f+1)*n;i++) s+=x[i]*x[i]; const r=Math.sqrt(s/n); out[f]=r>0?20*Math.log10(r):-120; } return out; };
/* talking or not, each step: clearly over the room (12 dB), for 60 ms to start, holding through 200 ms gaps */
T.voice=function(fr){ const a=Array.from(fr).sort((p,q)=>p-q), floor=a.length?a[Math.floor(a.length*0.1)]:-120, thr=Math.max(floor+12,-60);
 const on=new Uint8Array(fr.length); let run=0;
 for(let i=0;i<fr.length;i++){ if(fr[i]>thr){ run++; if(run>=3) for(let k=i-run+1;k<=i;k++) on[k]=1; } else run=0; }
 let last=-1; for(let i=0;i<on.length;i++){ if(on[i]){ if(last>=0&&i-last>1&&i-last<=10) for(let k=last+1;k<i;k++) on[k]=1; last=i; } }
 return {on,floor:Math.round(floor),thr:Math.round(thr)}; };
/* first and last sound in a stretch of the take, in seconds */
T.span=function(v,t0,t1){ const a=Math.max(0,Math.floor(t0/HOP)), b=Math.min(v.on.length,Math.ceil(t1/HOP)); let s=-1,e=-1;
 for(let i=a;i<b;i++) if(v.on[i]){ if(s<0) s=i; e=i; } return s<0?null:{on:Math.round(s*HOP*100)/100,off:Math.round((e+1)*HOP*100)/100}; };
/* clipped: three samples running at the top; one place per half second */
T.clips=function(x,rate){ const out=[]; let run=0;
 for(let i=0;i<x.length;i++){ if(Math.abs(x[i])>=0.99){ run++; if(run===3){ const at=(i-2)/rate; if(!out.length||at-out[out.length-1]>0.5) out.push(Math.round(at*10)/10); } } else run=0; }
 return out; };
/* clips a second or less apart are one stretch */
T.spans=c=>{ const out=[]; (c||[]).forEach(t=>{ const l=out[out.length-1]; if(l&&t-l[1]<=1) l[1]=t; else out.push([t,t]); }); return out; };
T.peak=x=>{ let p=0; for(let i=0;i<x.length;i++){ const a=Math.abs(x[i]); if(a>p) p=a; } return p>0?Math.round(20*Math.log10(p)*10)/10:-120; };
/* the whole read. marks: [{i,at,mine,who}] from the take; text(i): the full words of line i; pickups only when the
   partner was played (PARTNER mode), since that's when the line ending is the phone's own */
T.read=function(x,rate,marks,text,o){ o=o||{}; const fr=T.frames(x,rate), v=T.voice(fr), total=x.length/rate, M=(marks||[]).slice().sort((a,b)=>a.at-b.at);
 const lines=[];
 M.forEach((m,k)=>{ if(!m.mine) return; const end=k+1<M.length?M[k+1].at:total, sp=T.span(v,m.at,end), w=T.words(text?text(m.i):m.text);
  const L={i:m.i,at:m.at,end:Math.round(end*100)/100,words:w};
  if(sp){ L.on=sp.on; L.off=sp.off; L.secs=Math.round((sp.off-sp.on)*100)/100; if(L.secs>0.2&&w) L.wpm=Math.round(w/L.secs*60);
   if(o.partner&&k>0&&!M[k-1].mine) L.pickup=Math.round((sp.on-m.at)*100)/100; }
  lines.push(L); });
 const said=lines.filter(l=>l.secs>0.2&&l.words), words=said.reduce((a,l)=>a+l.words,0), secs=said.reduce((a,l)=>a+l.secs,0);
 const P=lines.filter(l=>l.pickup!=null);
 return {lines,words,secs:Math.round(secs*10)/10,wpm:secs>0?Math.round(words/secs*60):null,
  pickup:P.length?Math.round(P.reduce((a,l)=>a+l.pickup,0)/P.length*100)/100:null, slow:P.slice().sort((a,b)=>b.pickup-a.pickup).slice(0,2).filter(l=>l.pickup>=0.8),
  silent:lines.filter(l=>!l.secs).length, clips:T.clips(x,rate), peak:T.peak(x), floor:v.floor, at:Date.now()}; };
const mm=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
T.mm=mm;
/* in words, against the other takes of the scene */
T.words4=function(r,prev,n){ if(!r) return []; const W=[];
 if(r.wpm) W.push('Your pace: '+r.wpm+' words a minute ('+r.words+' words, '+mm(r.secs)+' talking)'+(prev&&prev.wpm?'. Take '+prev.n+' was '+prev.wpm+'.':'.'));
 else if(r.lines.length) W.push('No words of yours were heard in this take.');
 if(r.pickup!=null) W.push('Pickups: '+r.pickup.toFixed(1)+' s on average'+(r.slow.length?'; slowest '+r.slow.map(l=>'line '+(l.i+1)+' ('+l.pickup.toFixed(1)+' s)').join(', '):'')+'.');
 if(r.silent) W.push(r.silent+' of your lines had no sound of you in them.');
 const sp=T.spans(r.clips), say=x=>mm(x[0])===mm(x[1])?mm(x[0]):mm(x[0])+' to '+mm(x[1]);
 W.push(sp.length?'Clipped '+(sp.length===1?'in one place':'in '+sp.length+' places')+': '+sp.slice(0,4).map(say).join(', ')+(sp.length>4?' and more':'')+'. The sound hit the top there; back the mic off or speak off it.':'No clipping (loudest '+r.peak.toFixed(0)+' dBFS).');
 return W; };
/* a take's sound, from its file */
T.fromBlob=async function(blob){ const C=g.AudioContext||g.webkitAudioContext; if(!C) throw Error('no audio');
 const ac=new C(), buf=await new Promise((res,rej)=>{ blob.arrayBuffer().then(ab=>{ const p=ac.decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); },rej); });
 const ch=buf.numberOfChannels, n=buf.length, x=new Float32Array(n);
 const D=[]; for(let c=0;c<ch;c++) D.push(buf.getChannelData(c));
 for(let i=0;i<n;i++){ let v=D[0][i]; for(let c=1;c<ch;c++) if(Math.abs(D[c][i])>Math.abs(v)) v=D[c][i]; x[i]=v; } // the louder channel, so a clip on one side counts
 try{ ac.close(); }catch(e){} return {x,rate:buf.sampleRate}; };
g.TakeRead=T;
if(typeof module!=='undefined') module.exports=T;
})(typeof window!=='undefined'?window:globalThis);
