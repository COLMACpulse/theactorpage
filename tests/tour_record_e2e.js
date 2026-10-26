/* RECORD THE TOUR (demo/record.html): one read of every stop, cut into one clip per stop.
   A made-up reading (shaped noise, no voice) timed to the tour's lines, sentence pauses inside lines and a two-count
   between them. Brought in as a file; then a short live take with the fake mic, and a single line redone.
   Then the tour plays those clips instead of the caption clock. Server on :8811. */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path');
const O=require('../actor-os/oneread.js'); const TS=require('../demo/stops.js'); const L=TS.S;
const SR=16000; let seed=11; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
function reading(lines,lead){ const parts=[]; let t=lead; const truth=[];
  lines.forEach(line=>{ const sents=line.split(/(?<=[.?!])\s+/), st=t;
    sents.forEach((x,k)=>{ const d=Math.max(0.4,O.words(x)/2.7*(0.85+0.3*rnd())); parts.push([t,t+d]); t+=d; if(k<sents.length-1) t+=0.5*(0.7+0.6*rnd()); });
    truth.push([st,t]); t+=1.6*(0.8+0.4*rnd()); });
  const pcm=new Float32Array(Math.ceil((t+1.5)*SR)); for(let i=0;i<pcm.length;i++) pcm[i]=(rnd()-.5)*0.002;
  parts.forEach(([a,b])=>{ for(let i=Math.floor(a*SR);i<b*SR;i++) pcm[i]+=(rnd()-.5)*0.5*(0.55+0.45*Math.sin(2*Math.PI*4*i/SR)); });
  return {pcm,truth}; }
const T=fs.mkdtempSync(path.join(os.tmpdir(),'trec-'));
const full=reading(L.map(s=>s.line),1.0), FULL=path.join(T,'tour-read.wav'); fs.writeFileSync(FULL,Buffer.from(O.wav(full.pcm,SR)));
const one=reading([L[4].line],0.8), MIC=path.join(T,'mic.wav'); fs.writeFileSync(MIC,Buffer.from(O.wav(one.pcm,SR)));
const MICLEN=one.pcm.length/SR;
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-audio-capture='+MIC,'--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); await c.grantPermissions(['microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/demo/record.html'); await p.evaluate(()=>MyVoice.clear()); await p.reload(); await p.waitForTimeout(500);
const head=await p.innerText('main');
want('says what it is: one take, cut into one clip per stop, the two-count', /Read the whole tour, once/.test(head)&&/28 clips/.test(head)&&/slow two-count/.test(head)&&/redo any single line/.test(head));
want('the whole script is there, in order, numbered', (await p.$$eval('.ln',x=>x.length))===L.length&&/^1/.test(await p.innerText('.ln')));
want('nobody gets here from the site, and search engines are told to skip it', /noindex/.test(await p.getAttribute('meta[name=robots]','content')));

/* change the words on a line, before reading */
const NEW=L[0].line.replace(/^If you're an actor, you know the drill\./,"Actors, you know the drill.");
await p.click('.ln[data-id="O01"] [data-a="words"]'); await p.fill('.ln[data-id="O01"] textarea',NEW); await p.click('.ln[data-id="O01"] [data-e="save"]'); await p.waitForTimeout(300);
want('CHANGE THE WORDS: the line shows your words, marked CHANGED', (await p.innerText('.ln[data-id="O01"] .t'))===NEW&&/CHANGED/.test(await p.innerText('.ln[data-id="O01"]')));
await p.reload(); await p.waitForTimeout(500);
want('your words are kept after a reload', (await p.innerText('.ln[data-id="O01"] .t'))===NEW);
await p.click('.ln[data-id="A00"] [data-a="words"]'); await p.fill('.ln[data-id="A00"] textarea','Changed my mind.'); await p.click('.ln[data-id="A00"] [data-e="cancel"]'); await p.waitForTimeout(200);
want('CANCEL leaves the line as it was', (await p.innerText('.ln[data-id="A00"] .t'))===L.find(x=>x.id==='A00').line);
/* the whole read, brought in as a file */
await p.setInputFiles('#fileIn',FULL);
await p.waitForFunction(()=>!document.getElementById('cutsBox').classList.contains('hide'),null,{timeout:60000}).catch(()=>{});
const sum=await p.innerText('#sum');
want('all 28 clips cut, nothing missing, nothing to check', /^28 of 28 clips cut/.test(sum)&&!/not found|look off/i.test(sum), sum);
const meta=await p.evaluate(()=>MyVoice.get('cuts'));

const bad=meta.cuts.filter((x,i)=>x.start==null||Math.abs(x.start-full.truth[i][0])>0.4||Math.abs(x.end-full.truth[i][1])>0.6).map(x=>x.id);
want('every clip starts and ends where its line does', bad.length===0, bad);
want('the full take is kept too, so a reload loses nothing', !!(await p.evaluate(()=>MyVoice.get('take').then(x=>x&&x.size))));
await p.reload(); await p.waitForTimeout(600);
want('after a reload the clips are still there', /^28 of 28/.test(await p.innerText('#sum'))&&(await p.$$eval('.cut',x=>x.length))===28);
await p.click('.cut[data-id="O01"] [data-a="play"]'); await p.waitForTimeout(500);
want('PLAY plays a clip, and becomes STOP', (await p.innerText('.cut[data-id="O01"] [data-a="play"]'))==='STOP');
await p.click('.cut[data-id="O01"] [data-a="play"]');

/* a single line redone, live, with the mic */
const id=L[4].id;
await p.click('.cut[data-id="'+id+'"] [data-a="redo"]'); await p.waitForTimeout(300);
want('redo: recording that one line, the bar shows it', /Recording line 5/.test(await p.innerText('#msg'))&&/RECORDING/.test(await p.evaluate(()=>(document.getElementById('hotbar')||{}).innerText||'')));
await p.waitForTimeout(Math.min(MICLEN,30)*1000);
await p.click('.cut[data-id="'+id+'"] [data-a="redo"]');
await p.waitForFunction(()=>/redone/.test(document.getElementById('msg').innerText),null,{timeout:20000}).catch(()=>{});
want('the line is marked REDONE, the rest untouched', /REDONE/.test(await p.innerText('.cut[data-id="'+id+'"]'))&&(await p.$$eval('.tag.redo',x=>x.length))===1, await p.innerText('#msg'));
const rl=await p.evaluate(i=>MyVoice.clips().then(c=>c[i].size),id);
const exp=(one.truth[0][1]-one.truth[0][0]);
want('the redone clip is trimmed to the line', rl/2/32000>exp*0.8&&rl/2/32000<exp+1.5, [rl/64000,exp]);
want('mic off after', !(await p.evaluate(()=>Hot.peek().mic)));

/* the zip for the site */
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#saveBtn')]);
const zf=path.join(T,'z.zip'); await dl.saveAs(zf);
const names=require('child_process').execSync('unzip -Z1 '+zf).toString().trim().split('\n');
want('SAVE FOR THE SITE: one zip, a WAV per stop, cuts.json and the full read', dl.suggestedFilename()==='tour-voice.zip'&&names.filter(n=>/^vo\/[A-Z]\d\d\.wav$/.test(n)).length===28&&names.includes('cuts.json')&&names.some(n=>/^full-read\./.test(n)), names.slice(0,5));
const wj=JSON.parse(require('child_process').execSync('unzip -p '+zf+' words.json').toString());
want('the zip says which lines are in your words, what they were and what you said', Object.keys(wj).join()==='O01'&&wj.O01.was===L[0].line&&wj.O01.now===NEW);
const probe=require('child_process').execSync('unzip -p '+zf+' vo/O01.wav | ffprobe -v error -show_entries stream=sample_rate,channels -of csv=p=0 -i pipe:0').toString().trim();
want('the clips are mono, 32 kHz', probe==='32000,1', probe);

/* the tour plays them */
const q=await c.newPage(); q.on('pageerror',e=>errs.push(e.message));
await q.addInitScript(()=>{ window.__said=[]; const S={getVoices:()=>[],cancel(){},speak(u){ window.__said.push(u.text); setTimeout(()=>u.onend&&u.onend(),60); }}; Object.defineProperty(window,'speechSynthesis',{value:S,configurable:true}); });
await q.goto('http://localhost:8811/demo/'); await q.waitForFunction(()=>window.__tour&&window.__tour.mine===28,null,{timeout:8000}).catch(()=>{});
want('the tour on this device has your 28 clips', await q.evaluate(()=>window.__tour.mine)===28);
await q.click('#go'); await q.waitForFunction(()=>window.__tour.at==='O01',null,{timeout:30000}).catch(()=>{}); await q.waitForTimeout(1200);
want('and plays yours, not a computer voice', /^blob:/.test(await q.evaluate(()=>document.getElementById('vo').src))&&!(await q.evaluate(()=>window.__said.filter(s=>s.trim()).length)), await q.evaluate(()=>document.getElementById('vo').src));

want('the caption on the tour is your words', (await q.innerText('#cap'))===NEW, await q.innerText('#cap'));
/* start over */
await p.bringToFront(); await p.click('#againBtn'); await p.waitForTimeout(500);
want('START OVER puts the script back too', (await p.innerText('.ln[data-id="O01"] .t'))===L[0].line);
want('START OVER clears it, back to the start', !(await p.isHidden('#recBtn'))&&Object.keys(await p.evaluate(()=>MyVoice.clips())).length===0);
await p.click('#recBtn'); await p.waitForTimeout(400);
want('RECORD THE TOUR: the clock runs, the bar says recording', await p.isVisible('#live')&&/RECORDING/.test(await p.evaluate(()=>(document.getElementById('hotbar')||{}).innerText||'')));
await p.waitForTimeout(4000); await p.click('#stopBtn');
await p.waitForFunction(()=>!document.getElementById('cutsBox').classList.contains('hide'),null,{timeout:30000}).catch(()=>{});
const s2=await p.innerText('#sum');
want('STOP: it cuts what it heard and says which lines it did not find', /of 28 clips cut/.test(s2)&&/not found: redo those on their own/.test(s2)&&!(await p.evaluate(()=>Hot.peek().mic)), s2);
await p.click('#againBtn'); await p.waitForTimeout(300);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
