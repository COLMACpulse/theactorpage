/* THE STUDIO, theactorpage.com's front page (Col, Oct 26). A computer, set up: three rooms of doors, Actor OS with a
   code for your phone, your backup. A first visit: Start here, your résumé and one headshot. A phone: Actor OS and
   Picture It, the studio one tap away. The old pitch is its own page, how.html. Made-up résumé (Sam Actor) and face.
   Computer light, computer dark, phone dark. Server on :8811.  NODE_PATH=... node tests/studio_e2e.js */
const {chromium}=require('playwright'); const path=require('path');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp', FX=path.join(__dirname,'..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[], clean=async p=>{ await p.goto('http://localhost:8811/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('theactorpage_you'); }); await p.reload(); await p.waitForTimeout(900); };
const plain=p=>p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)&&document.documentElement.scrollWidth<=innerWidth+1);
for(const [nm,cs] of [['desk',"light"],['deskdark','dark']]){
 const c=await b.newContext({viewport:{width:1280,height:860},colorScheme:cs,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await clean(p);
 let m=await p.innerText('#main');
 want(nm+': a first visit: Start here, two things', await p.evaluate(()=>document.body.dataset.view)==='first'&&/Start here\. Two things, then you're set\./.test(m)&&/1 · Your résumé/.test(m)&&/2 · One headshot/.test(m));
 want(nm+': light by day, dark at night, like the other tools', await p.evaluate(()=>getComputedStyle(document.body).backgroundColor)===(cs==='dark'?'rgb(18, 17, 16)':'rgb(236, 231, 220)'));
 if(nm==='desk'){
  await p.setInputFiles('#stRes',path.join(FX,'sam_actor_resume.txt')); await p.waitForTimeout(1200);
  m=await p.innerText('#main');
  want('your résumé: kept, your profile filled in, and still Start here for the headshot', /✓ sam_actor_resume\.txt/.test(m)&&await p.evaluate(()=>You.get().name.length>0&&!!You.get().resume)&&await p.evaluate(()=>document.body.dataset.view)==='first', await p.evaluate(()=>You.get().name));
  await p.screenshot({path:SHOTS+'/studio_first_'+nm+'.png',fullPage:true});
  await p.setInputFiles('#stShot',path.join(FX,'made_up_face.jpg')); await p.waitForTimeout(2600);
  want('both in: on to your studio', await p.evaluate(()=>document.body.dataset.view)==='studio'&&await p.evaluate(()=>You.get().photos.length===1));
  want('your name and headshot up top, a way to your page', /Sam/i.test(await p.innerText('.who'))&&await p.getAttribute('.who','href')==='hub/'&&!!(await p.$('.who img[src^="blob:"]')));
 } else { await p.click('#stSkip'); await p.waitForTimeout(400); want(nm+': skip it: the studio', await p.evaluate(()=>document.body.dataset.view)==='studio'); }
 m=await p.innerText('#main');
 const doors=await p.$$eval('.room',R=>R.map(r=>r.querySelector('.k').textContent+':'+[...r.querySelectorAll('a')].map(a=>a.getAttribute('href')).join(',')));
 want(nm+': three rooms, plain doors', doors.join('|')==='ACT:hub/,headshots/,contacts/,booth/,archbook/,footage/,notes/,picture/|WRITE:write/writers-blockage.html,papertrail/,characters/,setlist/|FILM:film/,filmhub/,footage/check.html', doors);
 want(nm+': Actor OS for your phone, with a code to point the camera at', !!(await p.$('#aosCard .code svg'))&&/Point your phone's camera here/.test(m)&&!!(await p.$('#aosCard a[href="actor-os/"]')));
 want(nm+': your backup, and the pitch on its own page', !!(await p.$('.yours a[href="device/"]'))&&!!(await p.$('.foot a[href="how.html"]'))&&!!(await p.$('.foot a[href="how.html#cost"]')));
 await p.screenshot({path:SHOTS+'/studio_'+nm+'.png',fullPage:true});
 want(nm+': nothing off the side, no em dashes, no "thing"', await plain(p));
 await p.goto('http://localhost:8811/how.html'); await p.waitForTimeout(800);
 want(nm+': How it works: the old front page, whole, with What it costs', /Everything an audition takes/.test(await p.innerText('body'))&&!!(await p.$('#cost')));
 await c.close(); }
{ const c=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',serviceWorkers:'block',isMobile:true,hasTouch:true}); const p=await c.newPage(); p.on('pageerror',e=>errs.push('phone '+e.message));
 await clean(p);
 const m=await p.innerText('#main');
 want('phone: Actor OS first, then Picture It', await p.evaluate(()=>document.body.dataset.view)==='phone'&&await p.getAttribute('#pAos','href')==='actor-os/'&&!!(await p.$('.plink[href="picture/"]'))&&m.indexOf('Actor OS')<m.indexOf('Picture It'));
 await p.screenshot({path:SHOTS+'/studio_phone.png',fullPage:true});
 want('phone: nothing off the side, no em dashes, no "thing"', await plain(p));
 await p.click('#pStudio'); await p.waitForTimeout(400);
 want('phone: the studio, one tap away', ['first','studio'].includes(await p.evaluate(()=>document.body.dataset.view)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
