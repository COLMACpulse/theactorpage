/* ONE PAGE: Film Hub and Virtual Résumé say their work also goes on your page in the Hub, and take you there. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/filmhub/?tab=page'); await p.waitForTimeout(800);
want('Film Hub PAGE: on your actor page too, with the way there', /On your actor page too/i.test(await p.innerText('#actorpage'))&&/hub\/\?tab=package#publish$/.test(await p.getAttribute('#actorpage a','href')));
await p.goto('http://localhost:8811/resume/'); await p.waitForTimeout(800); await p.click('[data-a="tab"][data-t="send"]'); await p.waitForTimeout(300);
want('Virtual Résumé SEND: your page, all in one, with the way there', /Your page, all in one/i.test(await p.innerText('#yourpage'))&&/hub\/\?tab=package#publish$/.test(await p.getAttribute('#yourpage a','href')));
const words=(await p.innerText('#yourpage'));
want('no em dashes', !/—/.test(words));
await p.click('#yourpage a'); await p.waitForURL(/hub\//); await p.waitForTimeout(1200);
want('it lands on the Hub page builder', await p.evaluate(()=>tab==='package'));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
