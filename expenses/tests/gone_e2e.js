/* EXPENSES is no longer a tool. Its page stays so nothing you kept is stranded: save it all as a file, then clear it.
   Made-up lines only. Server on :8811.  NODE_PATH=... node expenses/tests/gone_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/expenses/'); await p.evaluate(async()=>{ localStorage.clear(); const x=Expenses.add({date:'2026-03-02',cat:'photos',what:'Made-up headshot session',amount:'350'}); await Expenses.putReceipt(x.id,new Blob(['made up'],{type:'image/jpeg'})); Expenses.add({date:'2025-06-01',cat:'training',what:'Made-up class',amount:'120'}); });
await p.reload(); await p.waitForTimeout(500);
want('says it is no longer here, and what is still on this device', /Expenses is no longer here/.test(await p.innerText('header'))&&/2 lines you kept here/.test(await p.innerText('#view')));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#save')]);
const buf=require('fs').readFileSync(await dl.path());
want('SAVE IT ALL: one zip, both years and the receipt', dl.suggestedFilename()==='Expenses.zip'&&/Expenses 2026\.csv/.test(buf.toString('latin1'))&&/Expenses 2025\.csv/.test(buf.toString('latin1'))&&/receipts\//.test(buf.toString('latin1')));
await p.click('#clear'); await p.waitForTimeout(300);
want('CLEAR: gone from this device', /Nothing from Expenses is on this device/.test(await p.innerText('#view'))&&!(await p.evaluate(()=>localStorage.getItem(Expenses.KEY))));
const home=await (await b.newContext()).newPage(); await home.goto('http://localhost:8811/how.html'); await home.waitForTimeout(700);
want('home: no link to Expenses anywhere', !(await home.$('a[href^="expenses/"]')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
