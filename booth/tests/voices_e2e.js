/* VO BOOTH · VOICES: your Character Bank voices in the booth. Read where they live, never changed: the picture, the
   take to listen to, the line that drops you back in. Pin one to the job and it sits on READ; the links open it in
   Character Bank. Made-up voices, a tone for sound. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), os=require('os');
(async()=>{ const A=require('../../shared/voaudio.js'), SR=44100;
const tone=(f,secs)=>{ const n=Math.round(secs*SR), x=new Float32Array(n); for(let i=0;i<n;i++) x[i]=0.2*Math.sin(2*Math.PI*f*i/SR); return Buffer.from(A.wav(x,SR)); };
const RUSK=tone(140,2).toString('base64'), PIC=fs.readFileSync(path.join(__dirname,'..','..','looks','tests','look_a.jpg')).toString('base64');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
/* no Character Bank on this device: VOICES says where they come from, and creates nothing */
await p.goto('http://localhost:8811/booth/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('cps_v02'); }); await p.reload(); await p.waitForTimeout(500);
want('six tabs, VOICES before READ', (await p.$$eval('#tabs button',x=>x.map(e=>e.dataset.t))).join()==='copy,room,voices,read,send,demo');
await p.click('[data-t=voices]'); await p.waitForTimeout(500);
want('no voices yet: says Character Bank keeps them, one way there', /No voices yet\. Character Bank keeps them/.test(await p.innerText('#main'))&&!!(await p.$('#main a[href="../cps/"]')));
want('and it made no Character Bank of its own', !(await p.evaluate(async()=>(await indexedDB.databases()).some(d=>d.name==='cps_v02'))));
/* two made-up voices in Character Bank */
await p.goto('http://localhost:8811/cps/'); await p.waitForTimeout(800);
await p.evaluate(async([wav,jpg])=>{ const bl=(b64,t)=>new Blob([Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0))],{type:t});
 const db=await new Promise(r=>{ const q=indexedDB.open('cps_v02',1); q.onupgradeneeded=()=>{ q.result.createObjectStore('lib'); q.result.createObjectStore('media'); }; q.onsuccess=()=>r(q.result); });
 const lib=Object.assign({},CPS.S.lib,{chars:[{id:'me1',name:'Me',me:true,takes:[],looks:[]},
  {id:'c1',name:'Captain Rusk',project:'Harbor Lights (game)',anchorLine:'Hold the line, sailor.',notes:'Low, slow, gravel in the back.',takes:[{id:'t0',kind:'voice',at:Date.parse('2026-03-02'),name:'First try'},{id:'t1',kind:'voice',at:Date.parse('2026-03-04'),name:'Hold the line'}],looks:[{id:'l1',kind:'photo',at:Date.now(),type:'image/jpeg'}],refId:'t1'},
  {id:'c2',name:'Pip the Gull',project:'',anchorLine:'',takes:[],looks:[]}]});
 await new Promise(r=>{ const t=db.transaction(['lib','media'],'readwrite'); t.objectStore('lib').put(JSON.parse(JSON.stringify(lib)),'main'); t.objectStore('media').put(bl(wav,'audio/wav'),'t1'); t.objectStore('media').put(bl(wav,'audio/wav'),'t0'); t.objectStore('media').put(bl(jpg,'image/jpeg'),'l1'); t.oncomplete=r; }); db.close(); },[RUSK,PIC]);
const before=await p.evaluate(async()=>{ const db=await new Promise(r=>{ const q=indexedDB.open('cps_v02'); q.onsuccess=()=>r(q.result); }); const v=await new Promise(r=>{ const q=db.transaction('lib').objectStore('lib').get('main'); q.onsuccess=()=>r(JSON.stringify(q.result)); }); db.close(); return v; });
await p.goto('http://localhost:8811/booth/'); await p.waitForTimeout(500); await p.click('[data-t=voices]'); await p.waitForTimeout(800);
const cards=await p.$$eval('.vcard',x=>x.map(e=>e.innerText.replace(/\s+/g,' ').trim()));
await p.waitForTimeout(1200);
want('the voice card shows the shape of the take you go back to', (await p.$$('[data-v="c1"] .vwv svg.wv')).length===1&&(await p.$$('[data-v="c2"] .vwv')).length===0);
want('your voices, not you: Captain Rusk with his picture, Pip with no recording yet', cards.length===2&&/Captain Rusk Harbor Lights \(game\)/.test(cards[0])&&/Pip the Gull No recording yet/.test(cards[1])&&(await p.$$('.vcard img')).length===1, cards);
await p.click('[data-v="c1"]'); await p.waitForTimeout(700);
const t=await p.innerText('#main');
want('one voice: its picture, the take you marked (not the first), your notes, the line', !!(await p.$('img.vhero'))&&/Hold the line · recorded Mar 4, 2026/.test(t)&&/Low, slow, gravel in the back\./.test(t)&&/The line that drops you back in\s+Hold the line, sailor\./i.test(t), t.slice(0,500));
await p.waitForTimeout(1200);
want('one voice: THEN (the take you go back to) and NOW, each drawn, with what the colours mean', (await p.$$('#main .vwv svg.wv')).length===2&&/Gold: then, Mar 4, 2026\. Blue: your latest, Mar 2, 2026\./.test(await p.innerText('#main')), await p.$$eval('#main .vwv',x=>x.map(e=>e.innerHTML.length)));
want('the shape kept here, not in Character Bank', await p.evaluate(()=>{ const c=JSON.parse(localStorage.getItem('theactorpage_wave_v1')||'{}'); return !!(c.t1&&c.t1.w.length===56&&c.t0); }));
want('the take plays: a real sound', await p.$eval('#vref',a=>new Promise(r=>{ if(a.readyState>=1) return r(a.duration>1.5); a.onloadedmetadata=()=>r(a.duration>1.5); a.onerror=()=>r(false); })));
want('the links open it in Character Bank: come back the whole way, record a new take', (await p.getAttribute('#vback2','href'))==='../cps/?c=c1&tab=back'&&(await p.getAttribute('#vrec','href'))==='../cps/?c=c1&tab=capture');
await p.click('#vpin'); await p.waitForTimeout(400);
want('USE IT ON THIS JOB: kept on the job', await p.evaluate(()=>__booth.S.job.voice==='c1')&&/ON THIS JOB ✓/.test(await p.innerText('#main')));
/* READ, with some copy */
await p.click('[data-t=copy]'); await p.waitForTimeout(200); await p.setInputFiles('#files',[path.join(__dirname,'..','..','shared','fixtures','dry_creek_vo_copy.txt')]); await p.waitForTimeout(800);
await p.click('[data-t=read]'); await p.waitForTimeout(800);
want('on READ: the voice you pinned at the top, its line and its take', /THE VOICE · CAPTAIN RUSK/.test(await p.innerText('#rvoice'))&&/Hold the line, sailor\./.test(await p.innerText('#rvoice'))&&!!(await p.$('#vstripaudio')));
await p.click('[data-t=voices]'); await p.waitForTimeout(500);
want('back on VOICES: the pinned voice first, marked', /ON THIS JOB/.test((await p.$$eval('.vcard',x=>x.map(e=>e.innerText)))[0]||''));
await p.click('[data-v="c1"]'); await p.waitForTimeout(400); await p.click('#vunpin'); await p.waitForTimeout(300);
await p.click('[data-t=read]'); await p.waitForTimeout(500);
want('TAKE IT OFF: gone from READ', (await p.innerText('#rvoice')).trim()==='');
await p.click('[data-t=voices]'); await p.waitForTimeout(400); await p.click('[data-v="c1"]'); await p.waitForTimeout(400); await p.click('#vpage'); await p.waitForTimeout(700);
want('ON YOUR PAGE: the same voice in DEMO', await p.evaluate(()=>__booth.S.tab==='demo')&&/Captain Rusk/.test(await p.innerText('#main')));
const after=await p.evaluate(async()=>{ const db=await new Promise(r=>{ const q=indexedDB.open('cps_v02'); q.onsuccess=()=>r(q.result); }); const v=await new Promise(r=>{ const q=db.transaction('lib').objectStore('lib').get('main'); q.onsuccess=()=>r(JSON.stringify(q.result)); }); db.close(); return v; });
want('Character Bank unchanged: read only', before===after);
await p.click('[data-t=voices]'); await p.waitForTimeout(400); await p.screenshot({path:path.join(os.tmpdir(),'voices_tab.png'),fullPage:true});
await p.click('[data-v="c1"]'); await p.waitForTimeout(1500); await p.screenshot({path:path.join(os.tmpdir(),'voices_one.png'),fullPage:true});
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
