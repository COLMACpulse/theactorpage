/* CHARACTERS (Col, Oct 25): one card each, every project. Each card: the name, its projects, the counts in words, their
   first line quoted from the page. The same name in two projects is two people until you tap SAME PERSON; NOT THE SAME
   PERSON takes it back. A blank note on each character, yours alone, kept and on the card. The count tables folded.
   Computer light, phone dark. Made-up scripts. Server on :8811.  NODE_PATH=... node papertrail/tests/characters_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const A="Title: Salt Road\n\nINT. DINER - NIGHT\n\nRain. DANA wipes the counter.\n\nDANA\nWe're closed.\n\nROSS\nDoor was open.\n\nINT. MOTEL - NIGHT\n\nMAE\nYou're late. Dana called.\n\nROSS\nI walked.\n";
const B="Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVALE climbs. MAE holds the rope.\n\nVALE\nRope.\n\nMAE\nYou said that already.\n";
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
 for(const t of [A,B]){ await p.click('#tabs [data-tab="add"]'); await p.fill('#paste',t); await p.click('#readit'); await p.waitForTimeout(450); }
 await p.goto('http://localhost:8811/papertrail/?tab=allchars'); await p.waitForTimeout(800);
 const cards=()=>p.$$eval('.ccard',x=>x.map(e=>e.querySelector('.cname').textContent+':'+[...e.querySelectorAll('.pchip')].map(a=>a.textContent).join('+')));
 let C=await cards();
 want(nm+': a card for each character, with its project', C.length===5&&C.includes('ROSS:Salt Road')&&C.includes('VALE:Ridge Line'), C);
 const ross=await p.$eval('.ccard:has(.cname:text-is("ROSS"))',e=>e.innerText);
 want(nm+': the counts in words, the first line quoted, from the page', /2 lines · in 2 of 2 scenes/.test(ross)&&/Door was open\./.test(ross)&&/First line, from the page/.test(ross), ross);
 want(nm+': no count boxes, no score', !(await p.$('.stats'))&&!/%/.test(await p.innerText('#main')));
 want(nm+': MAE in two projects: two cards, marked, until you say', (await p.$$('.ccard.twin')).length===2);
 await p.click('[data-cf]:has-text("Ridge Line")'); await p.waitForTimeout(150);
 want(nm+': a project chip filters', (await cards()).length===2);
 await p.click('[data-cf=""]'); await p.fill('#cq','va'); await p.waitForTimeout(150);
 want(nm+': find a character, and the box keeps your typing', (await cards()).join()==='VALE:Ridge Line'&&(await p.inputValue('#cq'))==='va');
 await p.fill('#cq',''); await p.waitForTimeout(150);
 await p.click('.ccard.twin [data-same]'); await p.waitForTimeout(200);
 C=await cards();
 want(nm+': SAME PERSON: one card, both projects', C.length===4&&C.some(x=>/^MAE:/.test(x)&&/Salt Road/.test(x)&&/Ridge Line/.test(x))&&/Joined by you/.test(await p.innerText('#main')), C);
 await p.click('.ccard:has(.cname:text-is("MAE")) .cname'); await p.waitForTimeout(300);
 want(nm+': their page says where else they are', /Also in/.test(await p.innerText('#main'))&&await p.isVisible('[data-unsame]'));
 await p.fill('#cnote','Runs the motel. Wants Ross gone.'); await p.waitForTimeout(700);
 const folds=await p.$$eval('details.fold[data-f]',x=>x.map(e=>e.dataset.f+(e.open?':open':'')));
 want(nm+': every line shown, the rest folded', /You.re late|You said that already/.test(await p.innerText('#main'))&&folds.length>=2&&folds.every(f=>!/open/.test(f)), folds);
 await p.screenshot({path:SHOTS+'/chars_page_'+nm+'.png',fullPage:true});
 await p.click('#tabs [data-tab="allchars"]').catch(async()=>{ await p.click('#tabs [data-grp="all"]'); await p.click('#tabs [data-tab="allchars"]'); }); await p.waitForTimeout(300);
 want(nm+': your note is on the card', /Runs the motel\. Wants Ross gone\./.test(await p.innerText('.ccard:has(.cname:text-is("MAE"))')));
 await p.screenshot({path:SHOTS+'/chars_all_'+nm+'.png',fullPage:true});
 await p.reload(); await p.waitForTimeout(800);
 want(nm+': joined and the note kept after reopening', (await cards()).length===4&&/Runs the motel/.test(await p.innerText('#main')));
 await p.click('.ccard:has(.cname:text-is("MAE")) .cname'); await p.waitForTimeout(300);
 await p.click('[data-unsame]'); await p.waitForTimeout(200);
 await p.click('#tabs [data-tab="allchars"]').catch(async()=>{ await p.click('#tabs [data-grp="all"]'); await p.click('#tabs [data-tab="allchars"]'); }); await p.waitForTimeout(300);
 want(nm+': NOT THE SAME PERSON: two cards again', (await cards()).length===5&&(await p.$$('.ccard.twin')).length===2);
 // the project tab: same cards, the tables folded
 await p.click('#tabs [data-tab="projects"]'); await p.click('[data-open]:has-text("Salt Road")'); await p.waitForTimeout(200);
 await p.click('#tabs [data-tab="characters"]'); await p.waitForTimeout(300);
 want(nm+': in a project: its characters as cards, the tables folded', (await p.$$('.ccard')).length===3&&!(await p.$eval('[data-f="ctable"]',e=>e.open))&&!(await p.$eval('[data-f="cnums"]',e=>e.open)));
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
