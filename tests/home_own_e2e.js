/* HOME: ACT is the front door; WRITE and FILM sit under MAKE YOUR OWN, for the actor making their own work.
   The heading goes when both are hidden in SHOW ME, and only shows the steps you have on. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
const order=await p.$$eval('section.band',x=>x.map(s=>s.id||s.dataset.dept||'').filter(Boolean));
want('the six steps, ACT, then YOU, YOUR PAGE, MAKE YOUR OWN with WRITE and FILM under it, then why, then try', order.indexOf('how')<order.indexOf('act')&&order.indexOf('act')<order.indexOf('you')&&order.indexOf('you')<order.indexOf('yourpage')&&order.indexOf('yourpage')<order.indexOf('own')&&order.indexOf('film')<order.indexOf('why')&&order.indexOf('why')<order.indexOf('try')&&order.indexOf('own')+1===order.indexOf('write')&&order.indexOf('write')+1===order.indexOf('film'), order);
want('the heading says what it is for', /NO AUDITION THIS WEEK\?/.test(await p.innerText('#own'))&&/MAKE YOUR OWN/.test(await p.innerText('#ownname'))&&/already your sides in ACT/.test(await p.innerText('#own')));
want('WRITE and FILM are steps 1 and 2 of it', /MAKE YOUR OWN · 1/.test(await p.innerText('#write'))&&/MAKE YOUR OWN · 2/.test(await p.innerText('#film')));
want('YOUR PAGE: the Hub is where it all lands, mine and made-by-me', /WHERE IT ALL LANDS/.test(await p.innerText('#yourpage'))&&/films from Film Hub, scripts from Paper Trail/.test(await p.innerText('#yourpage'))&&!!(await p.$('#yourpage .tool:has-text("PROJECT HUB")'))&&!(await p.$('.band.act .tool:has-text("PROJECT HUB")')));
await p.click('#yourpage .yp-go a'); await p.waitForURL(/hub\/\?tab=package#online$/); await p.waitForTimeout(1500);
want('Build your page: the Hub opens on the page builder, at Put it online', await p.evaluate(()=>tab==='package'&&!!document.getElementById('online')&&Math.abs(document.getElementById('online').getBoundingClientRect().top)<200));
await p.goto('http://localhost:8811/'); await p.waitForTimeout(400);
want('SPARK and PRACTICE SCENE, each said in a line', /SPARK\s+A five-minute nudge to get you working/.test(await p.innerText('.band.act'))&&/Practice scene\s+A short two-person scene to tape or learn when there's no audition/.test(await p.innerText('.band.act')));
await p.click('.door[data-door="film"]'); await p.waitForTimeout(400);
want('the FILM door opens FILM', await p.isVisible('#film a[href="filmhub/"]'));
await p.goto('http://localhost:8811/#write'); await p.reload(); await p.waitForTimeout(600);
want('a link to #write opens WRITE', await p.isVisible('#write a[href="papertrail/"]'));
await p.click('[data-view="write"]'); await p.waitForTimeout(150);
want('WRITE hidden in SHOW ME: only the FILM door is left', await p.$$eval('#own .door',x=>x.filter(y=>getComputedStyle(y).display!=='none').length)===1);
await p.click('[data-view="film"]'); await p.waitForTimeout(150);
want('WRITE and FILM both hidden: MAKE YOUR OWN goes too', await p.$eval('#own',e=>getComputedStyle(e).display==='none'));
want('SHOW ON THIS SITE, in the footer, groups WRITE and FILM under MAKE YOUR OWN', /SHOW ON THIS SITE\s*ACT\s*MAKE YOUR OWN\s*WRITE\s*FILM/.test(await p.innerText('#viewrow')));
want('no em dashes', !/—/.test(await p.innerText('#own')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
