/* PAPER TRAIL: the tabs in rooms. Never more than a handful in sight: Projects, Add drafts, Across projects; with a
   project open its three rooms (The script, The work, Send it) and the tabs of the room you're in. A room remembers
   the tab you were on. Made-up script. Server on :8811.  NODE_PATH=... node papertrail/tests/tabs_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
const bar=()=>p.$$eval('#tabs button',x=>x.map(b=>b.textContent));
want('no project: three in sight', (await bar()).join('|')==='Projects|Add drafts|Across projects', await bar());
await p.click('#tabs [data-grp="all"]'); await p.waitForTimeout(150);
want('Across projects: its four tabs under it', (await bar()).join('|')==='Projects|Add drafts|Across projects|Your universe|All characters|Sounds like you|All sent out', await bar());
await p.click('#tabs [data-tab="add"]'); await p.fill('#ptitle','Ridge Line'); await p.fill('#paste','Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs.\n\nVALE\nRope.\n'); await p.click('#readit'); await p.waitForTimeout(500);
await p.click('[data-open]'); await p.waitForTimeout(300);
let B=await bar();
want('a project open: its name, three rooms, the script room\'s four tabs: 10 buttons, not 14', B.join('|')==='Projects|Add drafts|Across projects|The script|The work|Send it|Scenes|Table read|Characters|Setups'&&/Ridge Line/.test(await p.innerText('#tabs .tproj')), B);
await p.click('#tabs [data-grp="send"]'); await p.waitForTimeout(150);
want('Send it: Package and Sent out', (await bar()).slice(6).join('|')==='Package|Sent out'&&(await p.$eval('#tabs .tsub .on',x=>x.textContent))==='Package', [await bar()]);
await p.click('#tabs [data-tab="sent"]'); await p.waitForTimeout(150); await p.click('#tabs [data-grp="work"]'); await p.waitForTimeout(150); await p.click('#tabs [data-grp="send"]'); await p.waitForTimeout(150);
want('a room remembers the tab you were on', await p.$eval('#tabs .tsub .on',x=>x.textContent)==='Sent out');
want('the room you are in is marked', await p.$eval('#tabs .grp.on',x=>x.textContent)==='Send it');
want('nothing runs off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
