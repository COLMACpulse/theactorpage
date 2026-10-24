/* DEMO SANDBOX: your real work is never read, shown or changed while the demo is on in a tab.
   A made-up "real" script sits on the shelf; the demo tab opens every tool and sees none of it; the tools write
   in the demo; END DEMO; the real one is untouched and the demo copies are gone. Made-up names only.
   Server on :8811.  NODE_PATH=... node tests/demo_sandbox_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(p.url()+' '+e.message)); p.on('dialog',d=>d.accept());
const H='http://localhost:8811/';
await p.goto(H); await p.evaluate(()=>localStorage.clear());
// the "real" world: a script on the shelf and a database row
await p.evaluate(async()=>{ Shelf.put({text:'RIVA\nThe gate is locked.\n\nMOSS\nThen climb it.\n',file:'real_gate.fountain',me:'RIVA'}); await Shelf.putFile(Shelf.current().id,new File(['%PDF real'],'real_gate.pdf',{type:'application/pdf'})); });
const realBefore=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
const realFile=async()=>p.evaluate(async()=>{ const f=await Shelf.getFile(Shelf.current()&&Shelf.current().id); return f?f.name:null; });
want('the real world: a script on the shelf, its file kept', /real_gate/.test(realBefore)&&(await realFile())==='real_gate.pdf');
// demo on in this tab
await p.evaluate(()=>TapDemo.start([])); await p.reload(); await p.waitForTimeout(400);
want('demo on: localStorage and IndexedDB both swapped', await p.evaluate(()=>TapDemo.on&&TapDemo.lsOk&&TapDemo.idbOk));
want('demo: the shelf is empty', await p.evaluate(()=>Shelf.all().length===0));
want('demo: the real file is not there either', (await p.evaluate(async()=>{ const db=await new Promise(r=>{ const q=indexedDB.open('theactorpage_shelf',1); q.onupgradeneeded=()=>q.result.createObjectStore('files'); q.onsuccess=()=>r(q.result); }); return new Promise(r=>{ const q=db.transaction('files').objectStore('files').getAllKeys(); q.onsuccess=()=>r(q.result.length); }); }))===0);
await p.evaluate(()=>{ Shelf.put({text:'ANNA\nVoss.\n\nMR. DELL (V.O.)\nThey found the boat.\n',file:'low_tide.fountain',me:'ANNA'}); localStorage.demoProp='x'; });
want('demo writes work like normal, and Object.keys sees them', await p.evaluate(()=>Shelf.current().file==='low_tide.fountain'&&Object.keys(localStorage).includes('demoProp')&&localStorage.demoProp==='x'&&('demoProp' in localStorage)));
const pages=['actor-os/','breakdown/','memorizer/','cps/','write/writers-blockage.html','papertrail/','film/','hub/','device/','booth/','notes/','spotted/','headshots/','slate/','archbook/','resume/','setlist/','backlot/','filmhub/','privacy/'];
const leaks=[];
for(const pg of pages){ await p.goto(H+pg); await p.waitForTimeout(700); const t=await p.evaluate(()=>document.body.innerText); if(/real_gate|\bRIVA\b|\bMOSS\b/.test(t)) leaks.push(pg); if(!(await p.evaluate(()=>window.TapDemo&&TapDemo.on&&TapDemo.lsOk))) leaks.push(pg+' (not sandboxed)'); }
want('every tool in the demo: nothing from the real shelf shows ('+pages.length+' pages)', !leaks.length, leaks);
want('outside the player, a page says it is the demo, with END DEMO', /DEMO · your own work is put away/.test(await p.innerText('#tapdemobar')));
const realDuring=await p.evaluate(()=>TapDemo.realGet('theactorpage_shelf_v1'));
want('the real shelf, read under the demo: still only the real script', /real_gate/.test(realDuring)&&!/low_tide/.test(realDuring));
const twins=await p.evaluate(async()=>(await indexedDB.databases()).length);
want('the demo made its own databases ('+twins+')', twins>=1);
// END DEMO
await p.click('#tapdemobar button'); await p.waitForURL(/index\.html$/); await p.waitForTimeout(500);
want('END DEMO: back home, demo off', await p.evaluate(()=>!TapDemo.on));
const realAfter=await p.evaluate(()=>Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])));
const was=Object.fromEntries(JSON.parse(realBefore));
want('your real storage: every key you had, exactly as it was', Object.keys(was).filter(k=>k!=='tapdemo_alive').every(k=>realAfter[k]===was[k]), Object.keys(was));
want('and nothing from the demo landed in it', !Object.values(realAfter).some(v=>/low_tide|demoProp|\bANNA\b/.test(v))&&!('demoProp' in realAfter));
want('your real file: still there', (await realFile())==='real_gate.pdf');
const left=await p.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name).filter(n=>/__tapdemo$/.test(n)));
want('the demo databases: gone', !left.length, left);
want('nothing in sessionStorage left over', await p.evaluate(()=>!Object.keys(sessionStorage).some(k=>/^tapdemo/.test(k))));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
