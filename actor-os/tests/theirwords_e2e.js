/* Actor OS SEND: THEIR WORDS. Paste the office's instructions (or use a request dropped on home) and SEND is set:
   one file or separate, slate first or last, a size cap (CUT's fit-under), a length limit. Each with the line it came
   from. You can still change it. Made-up instructions. Server on :8811.  NODE_PATH=... node actor-os/tests/theirwords_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ localStorage.removeItem('theactorpage_inbox_v1'); Object.keys(localStorage).filter(k=>/^actor_os/.test(k)).forEach(k=>localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(1000);
await p.evaluate(()=>goTab('send')); await p.waitForTimeout(300);
let box=await p.innerText('#offBox');
want('SEND: THEIR WORDS, says what it does', /THEIR WORDS/.test(box)&&/Paste the office.s instructions/.test(box)&&/shows the line it came from/.test(box), box);
await p.fill('#offText','Thanks for coming in! Please put both scenes in one file. Slate at the end with your name and height. Files must be under 100MB. Keep the whole tape under 4 minutes.');
await p.click('#offGo'); await p.waitForTimeout(300);
box=await p.innerText('#offBox');
want('read: one file, slate last, under 100 MB, no longer than 4:00', /From their words: One file, slate last, under 100 MB, no longer than 4:00\./.test(box), box);
want('each with the line it came from', /One file “Please put both scenes in one file\.”/.test(box)&&/Slate at the end “Slate at the end with your name and height\.”/.test(box)&&/Under 100 MB “Files must be under 100MB\.”/.test(box), box);
want('SEND is set: One file, slate last is picked', await p.evaluate(()=>sendMode())==='SLATE_LAST'&&/One file, slate last/.test(await p.innerText('#sendModes .picked')));
want('CUT\'s fit-under is 100 MB, the length limit 4:00', await p.evaluate(()=>fitCap())==='100'&&await p.evaluate(()=>state.job.limit)==='4:00');
await p.click('#sendModes .mode:first-child'); await p.waitForTimeout(200);
box=await p.innerText('#offBox');
want('you can still change it, and it says what their words said', await p.evaluate(()=>sendMode())==='SEPARATE'&&/You picked Separate files\. Their words say One file, slate last\./.test(box), box);
await p.reload(); await p.waitForTimeout(900); await p.evaluate(()=>goTab('send')); await p.waitForTimeout(300);
want('kept after a reload', /From their words: One file, slate last/.test(await p.innerText('#offBox'))&&await p.evaluate(()=>sendMode())==='SEPARATE');
// editing the project name used to wipe the job's other settings
await p.evaluate(()=>{ const f=document.getElementById('project'); f.value='Low Tide'; f.dispatchEvent(new Event('input')); }); await p.waitForTimeout(200);
want('editing the project name keeps the send settings', await p.evaluate(()=>state.job.limit==='4:00'&&state.job.fitMB===100&&state.job.sendMode==='SEPARATE'&&!!state.job.delivery), await p.evaluate(()=>state.job));
// nothing in there
await p.fill('#offText','Self tapes due Thursday 5 PM PT. SAG-AFTRA. Wear something casual.'); await p.click('#offGo'); await p.waitForTimeout(200);
want('nothing about sending: says so, changes nothing', /Nothing in there about how to send it\. Pick below\./.test(await p.innerText('#offBox'))&&await p.evaluate(()=>sendMode())==='SEPARATE');
// a request dropped on home
await p.evaluate(()=>{ Inbox.put('request',{raw:'LOW TIDE\nAudition Instructions\nUpload one file per scene. Slate as a separate file. Max file size 250 MB.',title:'LOW TIDE',role:'ANNA VOSS'},'r1'); renderSend(); }); await p.waitForTimeout(200);
want('a request you dropped on home is offered', /USE: LOW TIDE · ANNA VOSS/.test(await p.innerText('#offBox')));
await p.click('[data-offreq]'); await p.waitForTimeout(300);
want('USE it: separate files, the slate on its own, 250 MB', /From their words: Separate files, under 250 MB\./.test(await p.innerText('#offBox'))&&await p.evaluate(()=>sendMode())==='SEPARATE'&&await p.evaluate(()=>fitCap())==='250', await p.innerText('#offBox'));
// the Hub says it too
const h=await c.newPage(); h.on('pageerror',e=>errs.push(e.message));
await h.goto('http://localhost:8811/hub/'); await h.waitForTimeout(1200);
const hub=await h.evaluate(()=>{ const r=HubReq.read('Audition Instructions\nPlease put both scenes in one file. Slate at the end.\n'); return r.delivery&&Delivery.words(r.delivery); });
want('the Hub reads it the same way', hub==='One file, slate last.', hub);
want('no em dashes', !/—/.test(await p.innerText('#offBox')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
