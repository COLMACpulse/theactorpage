/* SPOTTED: where it is is your call ("Not sure" until you pick), "same project?" when a new story looks like one on your
   list (asked, never joined), the other stories under it with their words and links, what changed on it, and those
   changes in FOR MY REPS' what's new. Made-up stories and names only. Server on :8811.
   NODE_PATH=... node spotted/tests/yours_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,500))); if(!c) ok=false; };
await p.goto('http://localhost:8811/spotted/index.html'); await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500);
const spot=async t=>{ await p.click('#tabs [data-t="spot"]'); await p.waitForTimeout(150); if(await p.$('#redo')) { await p.click('#redo'); await p.waitForTimeout(150); } await p.fill('#raw',t); await p.click('#read'); await p.waitForTimeout(300); };
const A='Published: October 2, 2026\n\nNetflix is developing the western series "Dust Road", set in 1880s Kansas. Canyon Casting is casting. https://example.com/dust-road-1';
await spot(A); want('the first story: no question, just KEEP IT', !!(await p.$('#keep'))&&!(await p.$('#sameask')));
await p.click('#keep'); await p.waitForTimeout(300);
let y=await p.innerText('#yours');
want('where it is, your call: Not sure until you say', /WHERE IT IS, YOUR CALL/i.test(y)&&/Not sure until you say/.test(y)&&!!(await p.$('#yours [data-ys=""].on')), y);
want('the story\'s own words still under it', /in development/.test(await p.innerText('#stagebox')));
await p.click('#yours [data-ys="casting"]'); await p.waitForTimeout(200);
want('you pick Casting: it says so', /You marked it casting\./.test(await p.innerText('#yours'))&&!!(await p.$('#yours [data-ys="casting"].on')));
want('what changed: your call, dated', /You marked it casting\./.test(await p.innerText('#changed')));
// another story, same show
const B='Posted October 12, 2026. "Dust Road" began filming this week outside Wichita. Mesa Casting is casting day players. https://example.com/dust-road-2';
await spot(B); const ask=await p.innerText('#sameask').catch(()=>'' );
want('same project? asked, with the one on your list', /SAME PROJECT\?/i.test(ask)&&/Dust Road/.test(ask)&&/Canyon/.test(ask)&&!(await p.$('#keep')), ask);
if(SHOTS) await p.screenshot({path:SHOTS+'/sp_same.png',fullPage:true});
await p.click('[data-addto]'); await p.waitForTimeout(400);
const D=await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')));
want('ADD TO IT: still one Dust Road, the story under it', D.items.length===1&&D.items[0].more.length===1, D.items.length);
const more=await p.innerText('#more');
want('the other story: its stage as written, its date, its link', /ANOTHER STORY ON THIS/i.test(more)&&/Stage, as written: filming/.test(more)&&/dated Oct 12, 2026/.test(more)&&/example\.com\/dust-road-2/.test(more), more);
const ch=await p.innerText('#changed');
want('what changed: the new story, the new office, your call', /Another story \(dated Oct 12, 2026\): stage as written: filming, casting as written\./.test(ch)&&/Casting named: Mesa/.test(ch)&&/You marked it casting\./.test(ch), ch);
want('your call stays yours after a new story', /You marked it casting\./.test(await p.innerText('#yours')));
const pa=await p.inputValue('#t_pa');
want('pass it along: the newer story with its link, and your read', /Newer story, dated Oct 12, 2026: stage as written: filming\. https:\/\/example\.com\/dust-road-2/.test(pa)&&/Where it is, my read: casting\./.test(pa), pa);
want('casting on the card now has both offices', /Canyon/.test(await p.inputValue('#cf_casting'))&&/Mesa/.test(await p.inputValue('#cf_casting')));
if(SHOTS) await p.screenshot({path:SHOTS+'/sp_more.png',fullPage:true});
// a different show: no question
await spot('Published: October 14, 2026\n\nHBO has greenlit "Salt Flat", a drama. Ridge Casting is casting.'); want('a different show: no question', !(await p.$('#sameask'))&&!!(await p.$('#keep'))); await p.click('#keep'); await p.waitForTimeout(300);
// same name, but you say it's its own
await spot('Published: October 15, 2026\n\nA documentary called "Dust Road" is in the works at PBS.'); want('same name again: asked', !!(await p.$('#sameask')));
await p.click('#keepsep'); await p.waitForTimeout(300);
want('KEEP IT SEPARATE: its own card', (await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')).items.length))===3);
await p.click('#tabs [data-t="list"]'); await p.waitForTimeout(300);
const rows=await p.$$eval('.it',x=>x.map(y=>y.innerText));
want('the list: your call shows on the row', rows.some(r=>/Dust Road/.test(r)&&/ · casting · /.test(r)&&/Canyon & Mesa/.test(r)), rows);
// FOR MY REPS: send, then a change, and only that shows as new
await p.goto('http://localhost:8811/hub/?tab=reps'); await p.waitForTimeout(1800);
await p.click('button:has-text("I sent it")'); await p.waitForTimeout(400);
await p.goto('http://localhost:8811/spotted/index.html'); await p.waitForTimeout(500);
await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('theactorpage_spotted_v1')); const u=JSON.parse(localStorage.getItem('spotted_ui_v1')||'{}'); u.tab='list'; u.open=d.items.find(x=>x.more&&x.more.length).id; localStorage.setItem('spotted_ui_v1',JSON.stringify(u)); }); await p.reload(); await p.waitForTimeout(500);
await p.waitForTimeout(1100); await p.click('#yours [data-ys="filming"]'); await p.waitForTimeout(200);
await p.goto('http://localhost:8811/hub/?tab=reps'); await p.waitForTimeout(1800);
const v=await p.innerText('#view');
const nw=(v.split(/What's new since/i)[1]||'').split(/Email my reps/)[0];
want('FOR MY REPS: what\'s new is only your new call, in your voice', /Dust Road: I marked it filming \(was casting\)\./.test(nw)&&!/Another story|marked it casting\./.test(nw), nw);
const t=await p.$eval('#view textarea',x=>x.value);
want('and the sheet leads with it', /WHAT'S NEW SINCE[^\n]*\n- Dust Road: I marked it filming \(was casting\)\./.test(t), t.slice(0,300));
want('no em dashes', !/—/.test(t+v+ch+more));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
