/* CHARACTER BANK: the bank. Empty: the example plays, with the ways to start. RECORD A VOICE starts a character and
   records it (fake mic), then KEEP opens on it, the voice open and the rest folded. The bank: every character a card,
   the look shown whole whatever its shape, HEAR THEN plays the take you go back to and lights its shape, filter by
   show. COME BACK: one step at a time. Three tabs: BANK, VOICES, PACK. Made-up characters, a test tone. :8811. */
const {chromium}=require('playwright'); const path=require('path'); const seed=require('./seed.js');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/cps/manifest.webmanifest'); await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('cps_v02'); q.onsuccess=q.onerror=q.onblocked=()=>r(); }));
await p.goto('http://localhost:8811/cps/'); await p.waitForFunction(()=>window.CPS&&CPS.S.lib,null,{timeout:8000}); await p.waitForTimeout(300);
const main=()=>p.innerText('#main');
want('the header: the card and its voice, the sigil, the sticks', !!(await p.$('.bhead svg.bico'))&&(await p.getAttribute('.bhead img.bsig','alt'))==='THEACTORPAGE'&&!!(await p.$('.hstk')));
want('three tabs: BANK, VOICES, PACK', (await p.$$eval('nav.tabs button span',x=>x.map(e=>e.textContent))).join()==='BANK,VOICES,PACK');
want('empty: the example and the ways to start', /EXAMPLE · HOW IT WORKS/.test(await main())&&/RECORD A VOICE/.test(await main())&&/START WITH A NAME/.test(await main()));
const e1=await p.$$eval('#example .exs.on',x=>x.map(e=>e.dataset.ex).join()); await p.waitForTimeout(2400); const e2=await p.$$eval('#example .exs.on',x=>x.map(e=>e.dataset.ex).join());
want('the example moves', e1!==e2, [e1,e2]);
await p.click('[data-a="quickrec"]'); await p.waitForFunction(()=>CPS.S.rec,null,{timeout:5000}).catch(()=>{});
want('RECORD A VOICE: recording, on KEEP', await p.evaluate(()=>!!CPS.S.rec&&CPS.S.tab==='capture'));
await p.waitForTimeout(1500); await p.click('[data-a="recstop"]'); await p.waitForFunction(()=>CPS.S.lib.chars[0]&&CPS.S.lib.chars[0].takes.length===1,null,{timeout:8000}).catch(()=>{});
want('the voice kept', await p.evaluate(()=>CPS.S.lib.chars[0].takes.length===1));
want('KEEP: the voice open, the rest folded until you want them', await p.$$eval('details.fold',x=>x.length===5&&x.every(d=>!d.open)));
await p.click('details.fold[data-fold="2"] summary'); await p.waitForTimeout(150);
want('a fold opens: the look', await p.$eval('details.fold[data-fold="2"]',d=>d.open)&&/Take a photo/.test(await main()));
// the bank, with made-up characters
await seed(p,path.join(__dirname,'hum100.wav')); await p.waitForTimeout(1200);
want('the bank: a card for each, the line on it', (await p.$$('.ccard')).length===4&&/"Get off my land\."/.test(await main())&&/Nana Pearl/.test(await main()));
want('a look of any shape is shown whole', await p.$$eval('.ccard .lfg',x=>x.length===3&&x.every(i=>getComputedStyle(i).objectFit==='contain')));
want('no look yet: says so', /NO LOOK YET/.test(await main()));
want('strained: on the card', await p.$$eval('.ccard.strained',x=>x.length)===1);
await p.waitForFunction(()=>document.querySelectorAll('.cw:not(.none)').length===4,null,{timeout:8000}).catch(()=>{});
want('each card: the shape of the take you go back to', (await p.$$('.cw:not(.none)')).length===4);
await p.click('[data-hear="a"]'); await p.waitForFunction(()=>document.querySelectorAll('[data-cw="a"] rect.on').length>0,null,{timeout:3000}).catch(()=>{});
want('HEAR THEN: plays, says so, the shape lights as it goes', /PLAYING/.test(await p.innerText('[data-hear="a"]'))&&(await p.$$('[data-cw="a"] rect.on')).length>0);
await p.click('[data-hear="a"]'); await p.waitForTimeout(100);
want('tap again (or it ends): stopped', /HEAR THEN/.test(await p.innerText('[data-hear="a"]'))&&await p.evaluate(()=>!document.querySelector('[data-hear="a"].on')));
await p.click('[data-a="proj"][data-p="Harbor Lights"]'); await p.waitForTimeout(200);
want('filter by show', (await p.$$('.ccard')).length===2);
await p.click('[data-a="proj"][data-p=""]'); await p.waitForTimeout(150);
await p.click('[data-a="comeback"][data-id="a"]'); await p.waitForTimeout(300);
want('COME BACK: one step at a time, the look beside it', (await p.$$('.bdot')).length===5&&/LOOK/.test(await p.innerText('.bdot.on'))&&!!(await p.$('.baside .lfg')));
await p.click('.bnav .btn.pri'); await p.waitForTimeout(200);
want('NEXT: listen to then', /LISTEN/.test(await p.innerText('.bdot.on'))&&!!(await p.$('#refaudio')));
await p.click('.bdot:has-text("THE LINE")'); await p.waitForTimeout(200);
want('jump to a step: the line, big', /Get off my land/.test(await p.innerText('#bstep')));
want('the clock and IT\'S BACK stay up', !!(await p.$('#backclock'))&&/It's back/.test(await main()));
await p.click('.seg button:has-text("KEEP")'); await p.waitForTimeout(200);
want('KEEP and COME BACK switch in the character bar', await p.evaluate(()=>CPS.S.tab==='capture'));
await p.click('.cbar [data-t="chars"]'); await p.waitForTimeout(200);
want('‹ THE BANK goes back', (await p.$$('.ccard')).length===4);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
