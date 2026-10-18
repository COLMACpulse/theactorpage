/* Actor OS: ONE READ. Read the scene once, straight through; it cuts the reading into the reader lines.
   The mic is fed a made-up reading (shaped noise, no voice) timed to the lines; the camera is the fake one.
   Made-up sides. Server on :8811.  NODE_PATH=... node actor-os/tests/oneread_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path');
const O=require('../oneread.js');
const SIDES='INT. DINER - NIGHT\n\nWREN ASHBY\nWe close at ten.\n\nHAL BRODY\nThen I have twenty minutes, and I am going to use every one of them.\n\nWREN ASHBY\nYou have five.\n\nHAL BRODY\nFive is plenty.\n\nWREN ASHBY\nSit down, then.\n\nHAL BRODY\nI would rather stand where I can see the door, if it is all the same to you.\n';
const LINES=['We close at ten.','Then I have twenty minutes, and I am going to use every one of them.','You have five.','Five is plenty.','Sit down, then.','I would rather stand where I can see the door, if it is all the same to you.'];
const SR=48000; let seed=3; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
const pcm=[], marks=[]; let t=0; const push=(talk,sec)=>{ const n=Math.round(sec*SR); for(let i=0;i<n;i++){ const s=i/SR; pcm.push(talk?(rnd()*2-1)*0.3*(0.55+0.45*Math.sin(2*Math.PI*4*s)):(rnd()*2-1)*0.003); } t+=sec; };
push(false,1.2); LINES.forEach(l=>{ const d=O.expect(l); marks.push({start:t,end:t+d}); push(true,d); push(false,0.75); }); push(false,6);
const T=fs.mkdtempSync(path.join(os.tmpdir(),'or-')), WAV=path.join(T,'read.wav'); fs.writeFileSync(WAV,Buffer.from(O.wav(Float32Array.from(pcm),SR)));
const READ=marks[marks.length-1].end+1.2;
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-audio-capture='+WAV,'--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ indexedDB.deleteDatabase('actor_os_reader'); }); await p.reload(); await p.waitForTimeout(1200);
await p.evaluate(t=>{ loadSides(t,'Dry Creek diner.txt'); pickMe('WREN ASHBY'); boothReady(); },SIDES); await p.waitForTimeout(600);
let box=await p.innerText('#orBox');
want('the booth offers ONE READ, and says what it does', /ONE READ/.test(box)&&/Read the scene out loud once, straight through/.test(box)&&/READ IT ALL/.test(box)&&/JUST THE OTHER PARTS/.test(box), box);
await p.click('#orAll'); await p.waitForTimeout(400);
box=await p.innerText('#orBox');
want('reading: the whole scene to read from, yours marked, the bar says recording', /READING/.test(box)&&/WREN ASHBY \(YOU\)/.test(box)&&/see the door/.test(box)&&/RECORDING/.test(await p.innerText('#hotbar')), [box.slice(0,200),await p.innerText('#hotbar').catch(()=>'')]);
await p.waitForTimeout(READ*1000);
await p.click('#orStop'); await p.waitForFunction(()=>/One read:/.test((document.getElementById('boothList')||{}).innerText||''),null,{timeout:20000}).catch(()=>{});
const list=await p.innerText('#boothList');
want('cut: three reader lines in, nothing to check', /One read: 3 lines cut and in\./.test(list)&&!/CHECK|NOT FOUND/.test(list), list.slice(0,300));
want('the reader is ready', /Reader is ready/i.test(list));
want('the camera and mic are off after', !(await p.evaluate(()=>ActorReader.micOpen()))&&(!(await p.$('#hotbar'))||!/ON|RECORDING/.test(await p.innerText('#hotbar'))));
const clips=await p.evaluate(async()=>{ const all=await ActorReader.all(); return all.map(x=>({line:x.line,from:x.from,type:x.blob&&x.blob.type,s:x.mstart,e:x.mend,master:x.master,kind:x.kind})); });
const lines=clips.filter(x=>x.from==='oneread'), master=clips.find(x=>x.kind==='master');
want('one reading kept once, as video; each line its own sound, cut from it', !!master&&/^video\//.test(master.type)&&lines.length===3&&lines.every(x=>x.type==='audio/wav'&&x.master), clips);
// the cuts land on HAL's lines (2nd, 4th, 6th); the recording starts a beat after the fake mic does, so check the lengths and order
const exp=[1,3,5].map(i=>marks[i].end-marks[i].start), got=lines.sort((a,b)=>a.s-b.s).map(x=>x.e-x.s);
want('each cut about as long as its line (start a little before, end a little after)', got.every((g,i)=>g>exp[i]-0.2&&g<exp[i]+0.9), {exp,got});
want('in order, with gaps where your lines were', lines[1].s-lines[0].e>0.9&&lines[2].s-lines[1].e>0.9, lines);
want('each line says One read, video', (list.match(/One read · video/g)||[]).length===3, list);
// the partner plays the cut, the window by the lens shows the reading from where that line starts
await p.evaluate(()=>startMode('PARTNER')); await p.waitForTimeout(1500);
const idx=await p.evaluate(()=>{ const r=SIDES.run||activeScript(); return r.findIndex(b=>!b.mine); });
await p.evaluate(i=>{ sIdx=i; drawStage(); speakPartner(); },idx); await p.waitForTimeout(500);
const during=await p.evaluate(()=>{ const v=document.getElementById('sPartner'); return {on:v.classList.contains('on'),t:v.currentTime}; });
want('in the take: HAL\'s line plays, and you are by the lens as HAL, from that point in the reading', during.on&&during.t>=lines[0].s-0.05, [during,lines[0].s]);
want('no page errors', !errs.length, errs);
fs.rmSync(T,{recursive:true,force:true}); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
