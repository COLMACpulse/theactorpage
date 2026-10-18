/* ACTOR OS · READING A TAKE, in the app: a made-up take (a WAV built here: room hiss, the partner, you) through
   take review and the CUT list. Made-up sides. Server on :8811.  NODE_PATH=... node actor-os/tests/takeread_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1000);
const SIDES_TXT='INT. DINER - NIGHT\n\nDANA PELL\nWe\'re closed.\n\nROSS OKAFOR\nI told you (beat) I would be here by nine, and I was here by nine.\n\nDANA PELL\nDoor was open.\n\nROSS OKAFOR\nThen where were you?\n';
const make=(loud,talk)=>p.evaluate(([txt,loud,talk])=>{ loadSides(txt,'Salt Road sides'); pickMe('ROSS OKAFOR');
 const rate=16000, secs=13; let seed=7; const rnd=()=>((seed=seed*16807%2147483647)/2147483647)*2-1;
 const x=new Float32Array(rate*secs); for(let i=0;i<x.length;i++) x[i]=0.001*rnd();
 talk.forEach(([a,b2])=>{ for(let i=Math.round(a*rate);i<Math.round(b2*rate);i++) x[i]+=loud*Math.sin(2*Math.PI*180*i/rate)*(0.6+0.4*Math.sin(2*Math.PI*4*i/rate)); });
 const pcm=new Int16Array(x.length); for(let i=0;i<x.length;i++) pcm[i]=Math.max(-32768,Math.min(32767,Math.round(x[i]*32767)));
 const buf=new ArrayBuffer(44+pcm.length*2), v=new DataView(buf), w=(o,s)=>{ for(let i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
 w(0,'RIFF'); v.setUint32(4,36+pcm.length*2,true); w(8,'WAVEfmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,rate,true); v.setUint32(28,rate*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,pcm.length*2,true); new Int16Array(buf,44).set(pcm);
 const blob=new Blob([buf],{type:'audio/wav'}); const run=SIDES.run||SIDES.script, mine=run.map(b=>!!b.mine);
 const marks=[0,2,6,8].map((at,i)=>({i,at,mine:mine[i],who:run[i].who,text:run[i].text.slice(0,80)}));
 state.takes=state.takes||[]; const n=state.takes.filter(t=>t.scene==='S1').length+1;
 const t={id:'t'+n+Date.now(),scene:'S1',n,status:'HOLD',bytes:blob.size,type:blob.type,url:URL.createObjectURL(blob),secs,marks,mode:'PARTNER',created:new Date().toISOString()};
 state.takes.push(t); window.__t=t; showTakeReview(t,blob); return {mine,run:run.map(b=>b.who)}; },[SIDES_TXT,loud,talk]);
const info=await make(0.1,[[0.2,1.9],[2.6,5.6],[6.1,7.9],[9.4,11.4]]); await p.waitForTimeout(1500);
want('made-up sides: ROSS has lines 2 and 4', info.mine.join()==='false,true,false,true', info);
let rv=await p.innerText('#rvread');
want('take review: your pace, your 19 words, talking time', /Your pace: \d+ words a minute \(19 words, 0:05 talking\)\./.test(rv), rv);
want('take review: pickups, slowest line named', /Pickups: 1\.0 s on average; slowest line 4 \(1\.4 s\)\./.test(rv), rv);
want('take review: no clipping, says how it was measured', /No clipping/.test(rv)&&/not checked against a stopwatch yet/.test(rv), rv);
want('kept with the take, so it isn\'t read twice', await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('actor_os_v5')||localStorage.getItem(Object.keys(localStorage).find(k=>/actor_os/.test(k)&&/takes/.test(localStorage.getItem(k)))||'{}')); return !!(window.__t.read&&window.__t.read.wpm); }));
await p.evaluate(()=>closeReview());
// take 2: slower pickups, and it clips
await make(1.6,[[0.2,1.9],[3.2,6.0],[6.1,7.9],[10.0,12.0]]); await p.waitForTimeout(1500);
rv=await p.innerText('#rvread');
want('take 2: compared with take 1', /Take 1 was \d+\./.test(rv), rv);
want('take 2: clipped, with when, and what to do', /Clipped in 3 places: 0:00 to 0:02, 0:03 to 0:08, 0:10 to 0:12\./.test(rv)&&/back the mic off or speak off it/.test(rv), rv);
await p.evaluate(()=>closeReview()); await p.evaluate(()=>{ try{ renderCut(); }catch(e){} });
const cut=await p.$eval('#cutTakes',e=>e.innerText).catch(()=>'');
want('CUT list: each take carries its line', /words a minute · pickups 1\.0 s · no clipping/.test(cut)&&/clipped in \d+ place/.test(cut), cut.slice(0,600));
// a take the phone can't read
await p.evaluate(()=>{ const t={id:'bad',scene:'S1',n:9,status:'HOLD',bytes:3,type:'video/mp4',url:'',secs:1,marks:[],mode:'PARTNER'}; state.takes.push(t); showTakeReview(t,new Blob([new Uint8Array([1,2,3])],{type:'video/mp4'})); });
await p.waitForTimeout(800);
want('a take that can\'t be read: says so, plainly', /couldn.t read the sound of this take/.test(await p.innerText('#rvread')), await p.innerText('#rvread'));
want('no em dashes', !/—/.test(rv+cut));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
