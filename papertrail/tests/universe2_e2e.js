/* YOUR UNIVERSE (Col, Oct 25): every script you write in THEACTORPAGES (even before Paper Trail) and every draft
   kept here, with your acting roles (read for and booked, from Characters). Computer opens to the map with what you
   tap beside it; a phone opens to the list, project by project. Someone you joined as SAME PERSON in Characters:
   two dots and a solid gold line, no dashed one. Counts, not percents. Made-up data. Server on :8811.
   NODE_PATH=... node papertrail/tests/universe2_e2e.js */
const {chromium}=require('playwright'); const SEED=require('../../characters/tests/seed.js');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const R='Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs.\n\nVALE\nRope.\n\nHALE\nSure?\n\nINT. CABIN - NIGHT\n\nHale waits.\n\nHALE\nShe is gone.\n\nVALE\nNot yet.\n';
const D='Title: Dry Gulch\n\nINT. SALOON - NIGHT\n\nVALE\nWhiskey.\n\nJO PARK\nClosed.\n\nINT. CABIN - NIGHT\n\nJO PARK\nWho is there?\n\nVALE\nMe.\n';
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
 for(const t of [R,D]){ await p.click('#tabs [data-tab="add"]'); await p.fill('#paste',t); await p.click('#readit'); await p.waitForTimeout(450); }
 await p.evaluate(SEED);
 // VALE in both is one person: you said so
 await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('paper_trail_v1')); const ids=Object.values(d.projects).map(x=>x.id); d.people={same:[[ids[0]+'|VALE',ids[1]+'|VALE',Date.now()]],notes:{}}; localStorage.setItem('paper_trail_v1',JSON.stringify(d)); });
 await p.goto('http://localhost:8811/papertrail/?tab=universe'); await p.waitForTimeout(1500);
 if(nm==='desk'){
  want('computer: opens to the map', !!(await p.$('.umap svg'))&&!(await p.$('.ulist')));
  const t=await p.$$eval('.un',x=>x.map(g=>g.getAttribute('class').split(' ')[1]));
  want('your THEACTORPAGES script is on it, before Paper Trail', !!(await p.$('.un-project.uwb'))&&(await p.$$eval('.un-character text',x=>x.map(e=>e.textContent))).includes('JUNE'));
  want('your roles: the shows you read for, the role you booked', t.filter(x=>x==='un-aproject').length===3&&t.filter(x=>x==='un-role').length===3&&(await p.$$('.un-role.ubooked')).length===1, t);
  want('VALE, joined in Characters: a gold line, not a dashed one', (await p.$$('.ue-same')).length===1&&(await p.$$('.ue-samename')).length===0);
  await p.click('.un-character[data-un$=":VALE"]'); await p.waitForTimeout(200);
  want('tap VALE: one person with the other VALE, you said so', /One person with VALE in (Dry Gulch|Ridge Line)/.test(await p.innerText('#uinfo')), await p.innerText('#uinfo'));
  want('what you tap sits beside the map', await p.evaluate(()=>{ const a=document.querySelector('.umap').getBoundingClientRect(), b=document.getElementById('uinfo').getBoundingClientRect(); return b.left>=a.right-2; }));
  await p.$eval('.un-role.ubooked',g=>g.dispatchEvent(new MouseEvent('click',{bubbles:true}))); await p.waitForTimeout(200);
  want('tap a role: booked, and a way to Characters', /A role you booked/i.test(await p.innerText('#uinfo'))&&/DANA PELL/.test(await p.innerText('#uinfo'))&&!!(await p.$('#uinfo a[href^="../characters/"]')));
  await p.click('[data-uf="r"]'); await p.waitForTimeout(200);
  want('YOUR ROLES off: they leave the map', (await p.$$('.un-role')).length===0);
  await p.click('[data-uf="r"]'); await p.waitForTimeout(200);
 } else {
  want('phone: opens to the list', !!(await p.$('.ulist'))&&!(await p.$('.umap svg')));
  const m=await p.innerText('#main');
  want('the list, project by project: people, places, storylines', /Ridge Line[\s\S]*PEOPLE[\s\S]*VALE[\s\S]*PLACES[\s\S]*CABIN/i.test(m)&&/Gravel Road[\s\S]*in THEACTORPAGES/.test(m), m.slice(0,500));
  want('your roles in the list', /YOUR ROLES[\s\S]*Salt Road[\s\S]*DANA PELL[\s\S]*booked/i.test(m));
  await p.click('[data-uview="map"]'); await p.waitForTimeout(300);
  want('the map is a tap away', !!(await p.$('.umap svg')));
  await p.click('[data-uview="list"]'); await p.waitForTimeout(200);
 }
 const f=await p.innerText('#main');
 want(nm+': counts, not percents', /Night \d+ scenes?/.test(f)&&!/%/.test(f), f.slice(-400));
 await p.screenshot({path:SHOTS+'/universe_'+nm+'.png',fullPage:true});
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
