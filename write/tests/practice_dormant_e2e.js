/* THEACTORPAGES opens blank. Nothing you didn't ask for: not a practice scene, not your last script. Your scripts
   are one tap away in Your scripts. Only a reload of the same tab keeps the script you had open, so a refresh never
   loses your place. A practice scene (REWRITE IT) opens when you ask for it. Made-up scripts. Server on :8811.
   NODE_PATH=... node write/tests/practice_dormant_e2e.js */
const {chromium}=require('playwright');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const URL='http://localhost:8811/write/writers-blockage.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const c=await b.newContext({serviceWorkers:'block'});const errs=[];
const text=pg=>pg.evaluate(()=>WB.api.blocks().map(b=>b.text).join('|'));
let p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL);await p.evaluate(()=>{Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k));sessionStorage.clear();});await p.reload();await p.waitForTimeout(800);
await p.evaluate(()=>WB.openText("INT. DINER - NIGHT\n\nRain.\n",'mine.fountain'));await p.waitForTimeout(2200);
await p.reload();await p.waitForTimeout(1200);
want('a reload of the same tab keeps the script you had open', /DINER/.test(await text(p)));
await p.close();
// a new visit: blank
p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(1200);
let t=await text(p);
want('a new visit: a blank page, your last script does not open on its own', !/DINER/.test(t)&&!t.replace(/\|/g,'').trim(), t.slice(0,80));
want('no "picked up where you left off" note', !/Picked up where/.test(await p.evaluate(()=>document.body.innerText)));
await p.click('#mScript summary');
want('your script is one tap away in Your scripts', /Your scripts\s*\(?1/.test(await p.innerText('#btnProjects')), await p.innerText('#btnProjects'));
await p.keyboard.press('Escape'); await p.close();
// a practice scene handed over, like REWRITE IT
p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(600);
await p.evaluate(()=>localStorage.setItem('theactorpage_handoff_premise',JSON.stringify({from:'daily',title:'The Ferry',fountain:'[[Practice scene: The Ferry. Works on listening.]]\n\nEXT. DOCK - DAY\n\nGulls.\n',at:Date.now()})));
await p.reload();await p.waitForTimeout(1500);
want('asked for: the practice scene opens', /DOCK/.test(await text(p)));
await p.waitForTimeout(2000); await p.close();
p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto(URL); await p.waitForTimeout(1200);
t=await text(p);
want('next visit: blank again, no practice scene', !/DOCK/.test(t)&&!/DINER/.test(t), t.slice(0,80));
want('both are still in Your scripts, the practice one marked', await p.evaluate(()=>{ const L=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/index/i.test(k)&&/wb|writers/.test(k)))||'[]'); return L.length>=2&&L.some(r=>r.practice); }));
want('no page errors', !errs.length, errs); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
