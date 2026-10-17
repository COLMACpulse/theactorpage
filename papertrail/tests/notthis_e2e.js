/* PAPER TRAIL: NOT THIS. Things you've said no to; where their words show up on a line of the current draft
   (a speech counts its speaker). On Setups, on the scene page, and when a draft comes in. A word match, worded so.
   Made-up story (RIDGE LINE: Vale, Hale). Server on :8811.  NODE_PATH=... node papertrail/tests/notthis_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
const d1='Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs the ridge. Hale follows.\n\nVALE\nHand me the rope.\n\nINT. CABIN - NIGHT\n\nHale sits by the fire.\n\nHALE\nI\'m not going anywhere.\n';
const d2=d1.replace('Hand me the rope.','Hand me the flintlock.').replace('Hale sits by the fire.','Hale dies by the fire.');
await p.click('#tabs [data-tab="add"]'); await p.fill('#ptitle','Ridge Line'); await p.fill('#paste',d1); await p.click('#readit'); await p.waitForTimeout(500);
await p.click('[data-open]'); await p.waitForTimeout(300);
await p.click('#tabs [data-tab="threads"]'); await p.waitForTimeout(200);
let m=await p.innerText('#main');
want('Setups has NOT THIS, and says it looks for words', /Not this/i.test(m)&&/It looks for words, so it can miss the same idea said another way/.test(m), m.slice(-600));
await p.fill('#ntx','Vale never uses a flintlock'); await p.click('#ntadd'); await p.waitForTimeout(150);
await p.fill('#ntx',"Hale doesn't die"); await p.click('#ntadd'); await p.waitForTimeout(150);
m=await p.innerText('#main');
want('each says what it looks for', /Looks for: vale, flintlock/.test(m)&&/Looks for: hale, die/.test(m), m.slice(-700));
want('draft 1: nothing together on a line', (m.match(/aren.t together on any line/g)||[]).length===2, m.slice(-700));
// the next draft comes in
await p.click('#tabs [data-tab="add"]'); await p.fill('#ptitle','Ridge Line'); await p.fill('#paste',d2); await p.click('#readit'); await p.waitForTimeout(600);
m=await p.innerText('#main');
want('a draft comes in: it says NOT THIS words show up, with both', /Words from NOT THIS show up in this draft: Vale never uses a flintlock; Hale doesn.t die/.test(m), m.slice(0,500));
await p.click('[data-ntgo]'); await p.waitForTimeout(300);
m=await p.innerText('#main');
want('SEE WHERE: the line, the scene; a speech counts its speaker', /Words from it in SC 1 EXT\. RIDGE - DAY: .VALE: Hand me the flintlock\../.test(m), m.slice(-800));
want('"dies" counts for "die"', /SC 2 INT\. CABIN - NIGHT: .Hale dies by the fire\../.test(m), m.slice(-800));
await p.click('[data-goscene="0"]'); await p.waitForTimeout(300);
m=await p.innerText('#main');
want('the scene page says it too', /Words from NOT THIS on this page/i.test(m)&&/Hand me the flintlock/.test(m));
await p.click('#tabs [data-tab="threads"]'); await p.waitForTimeout(200);
await p.click('[data-ntdel]'); await p.waitForTimeout(150);
want('remove one', (await p.$$eval('[data-ntdel]',x=>x.length))===1);
await p.reload(); await p.waitForTimeout(800);
want('kept after a reload', await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('paper_trail_v1')).projects)[0].notThis.length)===1);
want('no em dashes in NOT THIS', !/—/.test(await p.evaluate(()=>{ const e=document.getElementById('notthis'); return e?e.parentNode.innerText:''; })));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
