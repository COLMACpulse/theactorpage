/* THE MERGES (Col, Oct 26): one door each, the other tool a tab inside it; each keeps its own page.
   Headshots holds Your looks. Your page (Project Hub) holds Your résumé and Press. Characters holds Character Bank.
   Story Studio holds Backlot, folded. Actor OS lays out your days to the deadline by The Plan's rules, folded.
   Made-up email, show and names. Computer light, phone dark. Server on :8811.  NODE_PATH=... node tests/merges_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[], H='http://localhost:8811/';
const embedded=async(p,re)=>{ const f=p.frames().find(f=>re.test(f.url())); if(!f) return false; await f.waitForLoadState('load'); return f.evaluate(()=>{ const h=document.querySelector('header.top,header.bhead'); return document.documentElement.classList.contains('embed')&&(!h||getComputedStyle(h).display==='none'); }); };
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+p.url()+' '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto(H+'headshots/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
 await p.click('[data-t="looks"]'); await p.waitForTimeout(1200);
 want(nm+': Headshots holds Your looks, inside, its header gone', /looks\/\?embed=1$/.test(await p.$eval('iframe.embedtool',f=>f.getAttribute('src')))&&await embedded(p,/looks\//));
 await p.screenshot({path:SHOTS+'/merge_looks_'+nm+'.png'});
 await p.goto(H+'hub/'); await p.waitForTimeout(1000);
 want(nm+': Your page lists Your résumé and Press', /Your résumé/i.test(await p.innerText('#view'))&&/Press/i.test(await p.innerText('#view')));
 await p.goto(H+'hub/?tab=resume'); await p.waitForTimeout(1300);
 want(nm+': Your résumé opens inside Your page', /resume\/\?embed=1$/.test(await p.$eval('iframe.embedtool',f=>f.getAttribute('src')))&&await embedded(p,/resume\//)&&/Your résumé/i.test(await p.innerText('#nav')));
 await p.goto(H+'hub/?tab=press'); await p.waitForTimeout(1300);
 want(nm+': Press opens inside Your page', await embedded(p,/press\//));
 await p.goto(H+'characters/'); await p.waitForTimeout(800);
 await p.click('#bank'); await p.waitForTimeout(1300);
 want(nm+': Characters holds Character Bank', /cps\/\?embed=1$/.test(await p.$eval('iframe.embedtool',f=>f.getAttribute('src')))&&await embedded(p,/cps\//));
 await p.click('#back'); await p.waitForTimeout(300);
 want(nm+': and back to your characters', !!(await p.$('.tiles')));
 await p.goto(H+'film/'); await p.waitForTimeout(700);
 await p.evaluate(()=>{ localStorage.setItem('film_os_v1',JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('film_os_v1')||'{}'),{owned:[{id:'o1',kind:'location',name:'Barn'}]}))); }); await p.reload(); await p.waitForTimeout(700);
 await p.click('#tabs [data-r="prep"]'); await p.waitForTimeout(200); await p.click('#sub [data-t="own"]'); await p.waitForTimeout(400);
 want(nm+': Story Studio holds Backlot, folded until you ask', !!(await p.$('details#blfold:not([open]) iframe[src="../backlot/?embed=1"]')));
 await p.click('#blfold summary'); await p.waitForTimeout(1500);
 want(nm+': open it: Backlot, inside', await embedded(p,/backlot\//));
 await p.goto(H+'actor-os/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
 await p.evaluate(()=>{ const d=new Date(); d.setDate(d.getDate()+4); window.__due=d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}); });
 const due=await p.evaluate(()=>window.__due);
 await p.click('#fPaste'); await p.fill('#fPasteText','You have a self-tape for SALT ROAD. Role: DANA PELL. Casting: Tara Vance.\nTape due '+due+' at 10am PST.\n\nLEO\nYou are still here.\n\nDANA PELL\nSomebody has to be.\n'); await p.click('#fRead'); await p.waitForTimeout(900);
 want(nm+': Actor OS: your days to the deadline, folded', /Your days\s*\d+ days? to the deadline/.test(await p.innerText('#aosHome'))&&!(await p.$('.fdays')));
 await p.click('#fDays'); await p.waitForTimeout(200);
 const dm=await p.innerText('.fdays');
 want(nm+': tap: the days, by The Plan\'s rules, today first, ending on the send', /^Today/.test(dm.trim())&&/SEND IT/.test(dm), dm);
 await p.click('.fdays .fstep:last-child'); await p.waitForTimeout(300);
 want(nm+': a day goes to its step', await p.evaluate(()=>CURTAB==='send'));
 await p.goto(H+'looks/'); await p.waitForTimeout(500);
 want(nm+': each still opens on its own page', !(await p.evaluate(()=>document.documentElement.classList.contains('embed')))&&await p.isVisible('header'));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
