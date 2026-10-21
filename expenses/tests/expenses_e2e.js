/* EXPENSES: add one with a receipt photo, add miles (the rate said), the year's total by kind, change one, and the
   file for your tax preparer: a zip with the spreadsheet and the receipt. Made-up amounts. Server on :8811.
   NODE_PATH=... node expenses/tests/expenses_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let outside=[]; p.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/expenses/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
let v=await p.innerText('#view');
want('a first visit: add one, nothing yet, and it says it is a record, not tax advice', /ADD AN EXPENSE/.test(v)&&/Nothing for \d{4} yet/.test(v)&&/a record, not tax advice/.test(v)&&/W-2 or 1099/.test(v));
const y=String(new Date().getFullYear());
await p.selectOption('#e_cat','photos'); await p.fill('#e_date',y+'-03-02'); await p.fill('#e_amt','450'); await p.fill('#e_to','Made Up Studio'); await p.fill('#e_what','New headshots');
await p.setInputFiles('#e_rec',{name:'receipt.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')});
await p.click('#add'); await p.waitForTimeout(400);
v=await p.innerText('#view');
want('added, with the receipt kept', /Added: New headshots, \$450\.00\./.test(v)&&/receipt kept/.test(v), v.slice(0,300));
await p.selectOption('#e_cat','miles'); await p.waitForTimeout(200);
want('miles: it asks for miles and says the rate', !!(await p.$('#e_miles'))&&/cents a mile/.test(await p.innerText('#e_rate')));
await p.fill('#e_date',y+'-04-01'); await p.fill('#e_miles','24'); await p.fill('#e_what','To the callback and back'); await p.click('#add'); await p.waitForTimeout(300);
const rate=await p.evaluate(y=>Expenses.rate(y),y), exp=Math.round(24*rate);
v=await p.innerText('#sum');
want('the year: the total and each kind', v.includes(await p.evaluate(c=>Expenses.money(c),45000+exp))&&/Headshots and photos/.test(v)&&/Miles driven/.test(v)&&/24 miles/.test(v), v);
await p.click('[data-open]:has-text("New headshots")'); await p.fill('#e_amt','475'); await p.click('#save'); await p.waitForTimeout(300);
want('change one', /\$475\.00/.test(await p.innerText('#view')));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#export')]);
const T=fs.mkdtempSync(path.join(os.tmpdir(),'ex-')), Z=path.join(T,dl.suggestedFilename()); await dl.saveAs(Z);
global.Zip=require('../../shared/zipw.js'); const files=Zip.read(fs.readFileSync(Z));
const csv=Buffer.from(files.find(f=>/\.csv$/.test(f.name)).data).toString('utf8');
want('FOR YOUR TAX PREPARER: one zip, the spreadsheet and the receipt', dl.suggestedFilename()==='Expenses '+y+'.zip'&&files.length===2&&files.some(f=>/^receipts\/.*New_headshots.*\.png$/.test(f.name))&&/New headshots,Made Up Studio,475\.00/.test(csv)&&/receipts\/.*\.png/.test(csv)&&/Total /.test(csv), files.map(f=>f.name));
want('nothing went anywhere', outside.length===0, outside);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
