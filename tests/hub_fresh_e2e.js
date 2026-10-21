/* PROJECT HUB on a first visit: no made-up actor, a first step instead. The tour (and a test that asks) still gets
   RILEY HART. A Hub that already holds the made-up actor from before loses it, and keeps anything you added.
   Server on :8811.  NODE_PATH=... node tests/hub_fresh_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const errs=[];
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/hub/'); await p.waitForTimeout(1500);
let t=await p.innerText('body');
want('a first visit: no made-up actor, no demo banner', !/RILEY HART/.test(t)&&!/demo data/i.test(t));
want('a first step instead', /Start with your name and a headshot on Profile/.test(t));
want('the tab title is THEACTORPAGE, not COLMAC', (await p.title())==='PROJECT HUB · THEACTORPAGE');
// the tour
const d=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const q=await d.newPage(); q.on('pageerror',e=>errs.push(e.message));
await q.goto('http://localhost:8811/hub/'); await q.evaluate(()=>{ sessionStorage.setItem('tapdemo_on','1'); }); await q.reload(); await q.waitForTimeout(1500);
want('in the tour: RILEY HART is there, labeled', /RILEY HART/.test(await q.innerText('body'))&&/demo data/i.test(await q.innerText('body')));
// a Hub from before, with the made-up actor and one credit of your own
const e2=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); await e2.addInitScript(()=>{ if(!sessionStorage.getItem('once')){ sessionStorage.setItem('once','1'); localStorage.setItem('hub_demo','1'); } });
const r=await e2.newPage(); r.on('pageerror',x=>errs.push(x.message));
await r.goto('http://localhost:8811/hub/'); await r.waitForTimeout(1500);
await r.evaluate(async()=>{ credits.push({title:'My Own Short',role:'Lead',kind:'credit',medium:'Film',state:'archived'}); await saveCredits(); localStorage.removeItem('hub_demo'); });
await r.reload(); await r.waitForTimeout(1800);
const st=await r.evaluate(()=>({name:profile.name,titles:credits.map(x=>x.title),demo:isDemo()}));
want('a Hub from before: the made-up actor is gone, your own credit stays', st.name===''&&!st.demo&&st.titles.join()==='My Own Short', st);
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
