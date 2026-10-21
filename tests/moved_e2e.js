/* Where things moved: the solo slate (Slate Maker) opens from Actor OS and goes back to it; Backlot opens from Story
   Studio's OWN tab and goes back to it. Server on :8811.  NODE_PATH=... node tests/moved_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/actor-os/'); await p.waitForTimeout(900);
want('Actor OS: SOLO SLATE next to + SLATE, and in the slate options', (await p.$$eval('a[href="../slate/?from=actoros"]',x=>x.length))===2&&/Solo slate\./.test(await p.$eval('#soloSlate',e=>e.textContent)));
want('Actor OS: the tab title says what it is', (await p.title())==='ACTOR OS · Self-tape studio');
await p.goto('http://localhost:8811/slate/?from=actoros'); await p.waitForTimeout(700);
want('the solo slate names itself part of Actor OS and goes back to it', /SOLO SLATE · ACTOR OS/.test(await p.innerText('header'))&&(await p.getAttribute('header a[aria-label="Back to Actor OS"]','href'))==='../actor-os/');
await p.goto('http://localhost:8811/film/'); await p.waitForTimeout(700);
await p.evaluate(()=>{ localStorage.setItem('film_os_v1',JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('film_os_v1')||'{}'),{owned:[{id:'o1',kind:'location',name:'Barn'}]}))); }); await p.reload(); await p.waitForTimeout(700);
await p.click('#tabs [data-r="prep"]'); await p.waitForTimeout(200); await p.click('#sub [data-t="own"]'); await p.waitForTimeout(400);
want('Story Studio OWN: Backlot is one tap away', (await p.getAttribute('#tobacklot','href').catch(()=>null))==='../backlot/');
await p.goto('http://localhost:8811/backlot/'); await p.waitForTimeout(600);
want('Backlot goes back to Story Studio', (await p.getAttribute('header a[aria-label="Back to Story Studio"]','href'))==='../film/');
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
