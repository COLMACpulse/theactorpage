/* THEACTORPAGES: a practice scene (home's Practice scene, REWRITE IT) opens when you ask for it and never on its own:
   the next time you open THEACTORPAGES it's your own script, or a blank page. Made-up script. Server on :8811.
   NODE_PATH=... node write/tests/practice_dormant_e2e.js */
const {chromium}=require('playwright');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await (await b.newContext()).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/write/writers-blockage.html');await p.evaluate(()=>{Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k));});await p.reload();await p.waitForTimeout(800);
await p.evaluate(()=>WB.openText("INT. DINER - NIGHT\n\nRain.\n",'mine.fountain'));await p.waitForTimeout(2200);
// a practice scene handed over, like REWRITE IT
await p.evaluate(()=>localStorage.setItem('theactorpage_handoff_premise',JSON.stringify({from:'daily',title:'The Ferry',fountain:'[[Practice scene: The Ferry. Works on listening.]]\n\nEXT. DOCK - DAY\n\nGulls.\n',at:Date.now()})));
await p.reload();await p.waitForTimeout(1500);
want('asked for: the practice scene opens', await p.evaluate(()=>WB.api.blocks().map(b=>b.text).join('|')).then(t=>/DOCK/.test(t)));
await p.waitForTimeout(2000);
await p.reload();await p.waitForTimeout(1500);
const t=await p.evaluate(()=>WB.api.blocks().map(b=>b.text).join('|'));
want('next open: your own script, not the practice scene', /DINER/.test(t)&&!/DOCK/.test(t), t.slice(0,80));
await p.evaluate(()=>{ Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k)); localStorage.setItem('theactorpage_handoff_premise',JSON.stringify({from:'daily',title:'The Ferry',fountain:'[[Practice scene: The Ferry.]]\n\nEXT. DOCK - DAY\n\nGulls.\n',at:Date.now()})); }); await p.reload(); await p.waitForTimeout(2600);
await p.reload(); await p.waitForTimeout(1500);
const t2=await p.evaluate(()=>WB.api.blocks().map(b=>b.text).join('|'));
want('only a practice scene saved: the next open is a blank page', !/DOCK/.test(t2), t2);
want('it is still there in Your scripts, marked', await p.evaluate(()=>{ const L=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>/index/i.test(k)&&/wb|writers/.test(k)))||'[]'); return L.some(r=>r.practice); }));
want('no page errors', !errs.length, errs); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
