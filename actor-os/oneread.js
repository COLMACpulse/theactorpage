/* ===== ONE READ =====
   Read the scene out loud once, straight through, and it cuts the reading into your reader lines.
   Pure: sound in, cut points out. No speech service: it listens for the pauses between lines, and the
   script says how many lines there are and about how long each one runs (from its words). A pause in the
   middle of a line is joined back up when the words say the line isn't over. A cough is left out.
   A line it can't find, or one that comes out far shorter or longer than its words, is flagged to check.
   OneRead.cut(pcm, sampleRate, lines:[{text}], opts) -> {cuts:[{i,start,end,ratio,flag}], spans, pause}
     flag: '' fine, 'check' the length is off, 'missing' not found. Times in seconds.
   OneRead.wav(pcm, sampleRate, start, end) -> Uint8Array (16-bit mono WAV) */
(function(g){
const O={};
O.FRAME=0.02;
O.words=t=>String(t||'').replace(/\([^)]*\)/g,' ').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;
/* about how long a line takes out loud: a natural read is near 2.7 words a second */
O.expect=t=>Math.max(0.45,O.words(t)/2.7+0.25);
/* loudness, 20 ms at a time, in dB */
O.levels=function(pcm,sr){
 const n=Math.max(1,Math.round(sr*O.FRAME)), out=new Float32Array(Math.floor(pcm.length/n));
 for(let f=0;f<out.length;f++){ let s=0; const o=f*n; for(let i=0;i<n;i++){ const v=pcm[o+i]; s+=v*v; } out[f]=10*Math.log10(s/n+1e-12); }
 return out;
};
const pct=(a,p)=>{ const s=Array.from(a).sort((x,y)=>x-y); return s.length?s[Math.min(s.length-1,Math.max(0,Math.floor(p*s.length)))]:0; };
/* where someone is talking: louder than the room by a margin set from this recording */
O.spans=function(db,minPause){
 const floor=pct(db,0.1), top=pct(db,0.95), th=floor+Math.max(6,(top-floor)*0.3), F=O.FRAME;
 const on=Array.from(db,v=>v>th), S=[];
 let i=0; while(i<on.length){ if(!on[i]){ i++; continue; } let j=i; while(j<on.length&&on[j]) j++; S.push([i*F,j*F]); i=j; }
 // gaps shorter than a pause are breaths inside the line
 const M=[]; S.forEach(s=>{ const l=M[M.length-1]; if(l&&s[0]-l[1]<minPause) l[1]=s[1]; else M.push(s.slice()); });
 return M.filter(s=>s[1]-s[0]>=0.12).map(s=>({start:s[0],end:s[1]}));
};
/* line j gets spans a..b in order; lines can be missed, stray sounds can be left out; the cheapest fit wins */
O.fit=function(spans,lines){
 const N=lines.length, M=spans.length, E=lines.map(l=>O.expect(l.text)), K=8, MISS=4, INF=1e9;
 const dp=Array.from({length:N+1},()=>new Float64Array(M+1).fill(INF)), how=Array.from({length:N+1},()=>new Array(M+1).fill(null));
 dp[0][0]=0;
 const skipCost=s=>{ const d=s.end-s.start; return d<0.35?0.2+1.5*d:0.6+3*d; };
 for(let j=0;j<=N;j++) for(let i=0;i<=M;i++){ const c=dp[j][i]; if(c>=INF) continue;
  if(i<M&&c+skipCost(spans[i])<dp[j][i+1]){ dp[j][i+1]=c+skipCost(spans[i]); how[j][i+1]={t:'skip'}; }
  if(j<N){
   if(c+MISS<dp[j+1][i]){ dp[j+1][i]=c+MISS; how[j+1][i]={t:'miss'}; }
   let inner=0;
   for(let k=i;k<Math.min(M,i+K);k++){
    if(k>i) inner+=spans[k].start-spans[k-1].end;
    const d=spans[k].end-spans[i].start, r=Math.log(d/E[j]), cost=c+r*r+1.5*inner;
    if(cost<dp[j+1][k+1]){ dp[j+1][k+1]=cost; how[j+1][k+1]={t:'take',a:i,b:k}; }
   } } }
 const got=new Array(N).fill(null); let j=N, i=M;
 while(j>0||i>0){ const h=how[j][i]; if(!h) break; if(h.t==='skip') i--; else if(h.t==='miss') j--; else { got[j-1]={a:h.a,b:h.b}; i=h.a; j--; } }
 return {got,cost:dp[N][M]};
};
O.cut=function(pcm,sr,lines,opts){
 opts=opts||{}; const db=O.levels(pcm,sr), total=pcm.length/sr, N=lines.length;
 let best=null;
 for(const p of opts.pauses||[0.35,0.25,0.18,0.12]){ const sp=O.spans(db,p), f=O.fit(sp,lines), found=f.got.filter(Boolean).length;
  if(!best||found>best.found||(found===best.found&&f.cost<best.f.cost)) best={sp,f,found,p};
  if(found===N&&sp.length>=N) break; }
 const sp=best.sp, got=best.f.got, cuts=[];
 got.forEach((x,i)=>{ if(!x){ cuts.push({i,start:null,end:null,ratio:null,flag:'missing'}); return; }
  const a=sp[x.a], b=sp[x.b], prev=x.a>0?sp[x.a-1]:null, next=x.b<sp.length-1?sp[x.b+1]:null;
  const start=Math.max(prev?(prev.end+a.start)/2:0,a.start-0.12), end=Math.min(next?(b.end+next.start)/2:total,b.end+0.25);
  const ratio=(b.end-a.start)/O.expect(lines[i].text);
  cuts.push({i,start:Math.round(start*1000)/1000,end:Math.round(end*1000)/1000,ratio:Math.round(ratio*100)/100,flag:ratio<0.45||ratio>2.2?'check':''}); });
 return {cuts,spans:sp,pause:best.p};
};
O.wav=function(pcm,sr,start,end){
 const a=Math.max(0,Math.floor((start||0)*sr)), b=Math.min(pcm.length,Math.ceil((end==null?pcm.length/sr:end)*sr)), n=Math.max(0,b-a);
 const buf=new ArrayBuffer(44+n*2), v=new DataView(buf), w=(o,s)=>{ for(let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
 w(0,'RIFF'); v.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
 v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,n*2,true);
 const fade=Math.min(n>>1,Math.round(sr*0.01));
 for(let i=0;i<n;i++){ let x=pcm[a+i]; if(i<fade) x*=i/fade; else if(i>n-fade) x*=(n-i)/fade; x=Math.max(-1,Math.min(1,x)); v.setInt16(44+i*2,x<0?x*0x8000:x*0x7fff,true); }
 return new Uint8Array(buf);
};
if(typeof module!=='undefined') module.exports=O;
g.OneRead=O;
})(typeof window!=='undefined'?window:globalThis);
