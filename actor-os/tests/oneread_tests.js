/* ONE READ: cutting one straight-through reading into lines. Made-up lines, made-up sound (no voices).
   node actor-os/tests/oneread_tests.js */
const O=require('../oneread.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };
const SR=16000; let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
/* a fake read: talking is noise shaped into syllables; the room is a little hiss */
function read(parts){ const out=[]; let t=0, marks=[];
 parts.forEach(p=>{ const n=Math.round(p.sec*SR);
  for(let i=0;i<n;i++){ const s=i/SR; out.push(p.talk?(rnd()*2-1)*0.3*(0.55+0.45*Math.sin(2*Math.PI*4*s)):(rnd()*2-1)*0.003); }
  if(p.line!=null) marks[p.line]=marks[p.line]||{start:t,end:t+p.sec}; if(p.line!=null) marks[p.line].end=t+p.sec; t+=p.sec; });
 return {pcm:Float32Array.from(out),marks}; }
const L=['Hand me the rope.','You sure about this?','I am not sure about anything at all, Vale, not one thing since the river took the bridge out.','Then we ride at first light.','Fine.','She is not coming back, not tonight, not ever, and you know it as well as I do.'].map(text=>({text}));
const say=(i,f)=>({talk:true,sec:O.expect(L[i].text)*(f||1),line:i}), gap=s=>({talk:false,sec:s});
const near=(cut,m,tol)=>cut&&cut.start!=null&&Math.abs(cut.start-m.start)<(tol||0.3)&&Math.abs(cut.end-m.end)<(tol||0.4);
// 1 clean read
let r=read([gap(0.8),say(0,1.1),gap(0.7),say(1,0.9),gap(0.8),say(2,1),gap(0.6),say(3,1.2),gap(0.9),say(4),gap(0.7),say(5,0.95),gap(1)]);
let c=O.cut(r.pcm,SR,L);
ok('a clean read: six lines, six cuts, each where the line is', c.cuts.length===6&&c.cuts.every((x,i)=>near(x,r.marks[i])&&!x.flag), c.cuts);
// 2 a dramatic pause inside the long line
r=read([gap(0.6),say(0),gap(0.7),say(1),gap(0.7),{talk:true,sec:2.2,line:2},gap(0.65),{talk:true,sec:O.expect(L[2].text)-2.2,line:2},gap(0.8),say(3),gap(0.7),say(4),gap(0.8),say(5),gap(0.8)]);
c=O.cut(r.pcm,SR,L);
ok('a pause in the middle of a line: joined back up, the line after still lands', near(c.cuts[2],r.marks[2])&&near(c.cuts[3],r.marks[3])&&c.cuts.filter(x=>x.flag).length===0, c.cuts.map(x=>[x.start,x.end,x.flag]));
// 3 a cough between lines
r=read([gap(0.6),say(0),gap(0.5),{talk:true,sec:0.18},gap(0.5),say(1),gap(0.7),say(2),gap(0.7),say(3),gap(0.7),say(4),gap(0.7),say(5),gap(0.8)]);
c=O.cut(r.pcm,SR,L);
ok('a cough between lines is left out', near(c.cuts[0],r.marks[0])&&near(c.cuts[1],r.marks[1])&&c.cuts.every(x=>!x.flag), c.cuts.map(x=>[x.start,x.end,x.flag]));
// 4 two lines run together with a short gap
r=read([gap(0.6),say(0),gap(0.7),say(1),gap(0.2),say(2),gap(0.7),say(3),gap(0.7),say(4),gap(0.7),say(5),gap(0.8)]);
c=O.cut(r.pcm,SR,L);
ok('two lines run together: still told apart', near(c.cuts[1],r.marks[1],0.3)&&near(c.cuts[2],r.marks[2],0.3), c.cuts.map(x=>[x.start,x.end,x.flag]));
// 5 a line left out
r=read([gap(0.6),say(0),gap(0.7),say(1),gap(0.7),say(3),gap(0.7),say(4),gap(0.7),say(5),gap(0.8)]);
c=O.cut(r.pcm,SR,L);
ok('a line left out: flagged missing, the rest still right', c.cuts[2].flag==='missing'&&near(c.cuts[3],r.marks[3])&&near(c.cuts[5],r.marks[5]), c.cuts.map(x=>[x.start,x.end,x.flag]));
// 6 read far too fast: flagged to check
const L2=[{text:'One two three four five six seven eight nine ten eleven twelve.'},{text:'Yes.'}];
r=read([gap(0.5),{talk:true,sec:0.9,line:0},gap(0.7),{talk:true,sec:0.6,line:1},gap(0.6)]);
c=O.cut(r.pcm,SR,L2);
ok('a line far shorter than its words: flagged to check', c.cuts[0].flag==='check'&&c.cuts[1].flag==='', c.cuts);
// 7 words and expected time
ok('words: stage directions in brackets do not count', O.words('(quiet) Not tonight.')===2&&O.expect('Fine.')>=0.45);
// 8 wav
const w=O.wav(Float32Array.from({length:SR},(_,i)=>Math.sin(i/10)*0.5),SR,0.25,0.75), dv=new DataView(w.buffer);
ok('the cut as a WAV: right header, half a second of sound', String.fromCharCode(...w.slice(0,4))==='RIFF'&&dv.getUint32(24,true)===SR&&dv.getUint32(40,true)===SR*0.5*2, [dv.getUint32(40,true)]);
// 9 speed
r=read(Array.from({length:60},(_,i)=>[gap(0.6),{talk:true,sec:3.4,line:i}]).flat()); const t0=Date.now();
c=O.cut(r.pcm,SR,Array.from({length:60},()=>({text:'one two three four five six seven eight nine'}))); 
ok('a long scene (60 lines, about 4 minutes) cuts fast', Date.now()-t0<3000&&c.cuts.every(x=>!x.flag), Date.now()-t0);
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
