/* HOME: ACT is the front door; WRITE and FILM sit under MAKE YOUR OWN, for the actor making their own work.
   The heading goes when both are hidden in SHOW ME, and only shows the steps you have on. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
const order=await p.$$eval('section.band',x=>x.map(s=>s.id||s.dataset.dept||'').filter(Boolean));
want('ACT first, then MAKE YOUR OWN, with WRITE and FILM under it', order.indexOf('act')<order.indexOf('own')&&order.indexOf('own')+1===order.indexOf('write')&&order.indexOf('write')+1===order.indexOf('film'), order);
want('the heading says what it is for', /NO AUDITION THIS WEEK\?/.test(await p.innerText('#own'))&&/MAKE YOUR OWN/.test(await p.innerText('#ownname'))&&/already your sides in ACT/.test(await p.innerText('#own')));
want('WRITE and FILM are steps 1 and 2 of it', /MAKE YOUR OWN · 1/.test(await p.innerText('#write'))&&/MAKE YOUR OWN · 2/.test(await p.innerText('#film')));
await p.click('#own .own-path .f a'); await p.waitForTimeout(400);
want('2 · SHOOT IT jumps to FILM', /#film$/.test(p.url()));
await p.click('[data-view="write"]'); await p.waitForTimeout(150);
want('WRITE hidden: only SHOOT IT is left in the steps', await p.$$eval('#own .own-path li',x=>x.filter(y=>getComputedStyle(y).display!=='none').length)===1);
await p.click('[data-view="film"]'); await p.waitForTimeout(150);
want('WRITE and FILM both hidden: MAKE YOUR OWN goes too', await p.$eval('#own',e=>getComputedStyle(e).display==='none'));
want('SHOW ME groups WRITE and FILM under MAKE YOUR OWN', /SHOW ME\s*ACT\s*MAKE YOUR OWN\s*WRITE\s*FILM/.test(await p.innerText('#viewrow')));
want('no em dashes', !/—/.test(await p.innerText('#own')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
