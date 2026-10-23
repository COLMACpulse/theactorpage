/* MEMORIZER: the top and the middle. Opened with nothing: the example plays in the work card, and three buttons
   (YOUR SCRIPTS, ON THE SHELF, + BRING IN SIDES), no lists until tapped. SAY THEM OUT LOUD is under BRING IN SIDES.
   Leaving DRILL stops listening. A browser that can't hear: no SAY buttons, SHOW THE LINE alone. Fake speech.
   Made-up script (LOW TIDE). Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
const FAKE=()=>{ class FakeRec extends EventTarget{ constructor(){ super(); this.onend=null; this.onresult=null; window.__rec=this; } start(){ this.on=true; }
  stop(){ if(!this.on) return; this.on=false; setTimeout(()=>{ if(this.onend) this.onend(new Event('end')); },0); } }
 window.SpeechRecognition=FakeRec; window.webkitSpeechRecognition=FakeRec; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const text=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
async function open(fake,vp){
 const c=await b.newContext({viewport:vp||{width:390,height:844}});
 if(fake) await c.addInitScript(FAKE); else await c.addInitScript(()=>{ window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined; });
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(500);
 return {c,p,errs};
}
let {c,p,errs}=await open(true);
const t0=await p.innerText('#main');
want('nothing open: the three buttons and the example', /YOUR SCRIPTS\s*0/.test(t0)&&/ON THE SHELF\s*0/.test(t0)&&/\+ BRING IN SIDES/.test(t0)&&/EXAMPLE · HOW IT WORKS/.test(t0), t0.slice(0,300));
want('no SIDES tab: DRILL, SCENE, LINES', (await p.$$eval('#tabs button',x=>x.map(e=>e.dataset.t))).join()==='drill,scene,lines');
const a=await p.innerText('#exline'); await p.waitForTimeout(2100); const z=await p.innerText('#exline'), h=await p.innerText('#exheard');
want('the example moves: first letters, then your words, then the line', a!==z||h.length>0, [a,z,h]);
const cap=await p.evaluate(()=>{ const s=new Set(); return new Promise(r=>{ let n=0; const t=setInterval(()=>{ s.add(document.getElementById('exw').textContent); if(++n>60){ clearInterval(t); r([...s]); } },200); }); });
want('each step says what it shows', cap.some(x=>/First letters/.test(x))&&cap.some(x=>/Say it out loud/.test(x))&&cap.some(x=>/Show the line/.test(x)), cap);
want('the example is not your material: no scripts made', await p.evaluate(()=>Object.keys(MEM._db().scripts).length===0));
want('the example level buttons do nothing', await p.$$eval('[data-exl]',x=>x.every(e=>e.tabIndex===-1)));
await p.click('.tpill.add'); await p.waitForTimeout(200);
want('+ BRING IN SIDES: the drop, paste, and say them out loud', !!(await p.$('#drop'))&&!!(await p.$('#paste'))&&!!(await p.$('#sayfirst')));
await p.click('#sayfirst'); await p.waitForTimeout(200);
want('SAY THEM OUT LOUD: listening, your words go here', !!(await p.$('#sayall'))&&/LISTENING/.test(await p.innerText('.sayall')));
await p.evaluate(()=>MEM.sayAll()); await p.evaluate(()=>MEM.sayClear()); await p.waitForTimeout(200);
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:Buffer.from(text)}); await p.waitForTimeout(600);
want('sides in: pick the character', /Which character/.test(await p.innerText('#main')));
await p.click('text=ANNA'); await p.waitForTimeout(500);
want('DRILL: in the work card, the top bar above, counts up', !!(await p.$('main .work .levels'))&&/YOUR SCRIPTS\s*1/.test(await p.innerText('.tops'))&&/ON THE SHELF\s*1/.test(await p.innerText('.tops')));
want('I SPEAK under SAY IT', !!(await p.$('.work [data-klang]')));
await p.click('#sayBtn'); await p.waitForTimeout(200);
want('SAY IT: listening, STOP', /STOP/.test(await p.innerText('#sayBtn')));
await p.click('#tabs [data-t="scene"]'); await p.waitForTimeout(300);
await p.click('#tabs [data-t="drill"]'); await p.waitForTimeout(300);
want('leave DRILL: listening stops', /SAY IT/.test(await p.innerText('#sayBtn')));
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await c.close();
({c,p,errs}=await open(false));
await p.click('.tpill.add'); await p.waitForTimeout(200);
want('can\'t hear here: no SAY THEM OUT LOUD', !(await p.$('#sayfirst')));
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:Buffer.from(text)}); await p.waitForTimeout(600);
await p.click('text=ANNA'); await p.waitForTimeout(500);
want('can\'t hear here: no SAY IT, SAID IT. SHOW THE LINE', !(await p.$('#sayBtn'))&&/SAID IT\. SHOW THE LINE/.test(await p.innerText('#main')));
want('no page errors', !errs.length, errs);
await c.close();
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
