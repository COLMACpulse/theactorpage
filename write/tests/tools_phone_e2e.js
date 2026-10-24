/* THEACTORPAGES on a phone: the side rail (Outline, Cast, Stats, Tools) comes in with TOOLS, goes with CLOSE,
   a tap outside, or GO. Made-up script. Server on :8811.  NODE_PATH=... node write/tests/tools_phone_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.waitForTimeout(800);
await p.evaluate(()=>WB.openText("INT. DINER - NIGHT\n\nDANA PELL\nWe're closed.\n\n.THE ROOF\n\nWind.\n",'x.fountain')); await p.waitForTimeout(500);
const vis=sel=>p.$eval(sel,e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).display!=='none'; }).catch(()=>false);
await p.click('#mTools summary'); await p.waitForTimeout(200);
want('phone: the rail is out of the way; OUTLINE, CAST, IDEAS is in the Tools menu', !(await vis('#rail'))&&await vis('#btnRail'));
await p.click('#btnRail'); await p.waitForTimeout(300);
want('TOOLS: the rail comes in, on the Tools tab, with CLOSE', await vis('#rail')&&await vis('[id="pane-panel:tools"]')&&await vis('#railclose'));
await p.click('[id="pane-panel:tools"] [data-wt="fmt"]'); await p.waitForTimeout(200);
await p.click('[id="pane-panel:tools"] [data-go]'); await p.waitForTimeout(300);
want('GO: the rail goes, the cursor is on the spot', !(await vis('#rail'))&&/THE ROOF/.test(await p.evaluate(()=>WB.api.block(WB.api.activeId()).text)));
await p.click('#mTools summary'); await p.waitForTimeout(150); await p.click('#btnRail'); await p.waitForTimeout(200); await p.click('#railclose'); await p.waitForTimeout(200);
want('CLOSE puts it away', !(await vis('#rail')));
await p.click('#mTools summary'); await p.waitForTimeout(150); await p.click('#btnRail'); await p.waitForTimeout(200); await p.mouse.click(385,500); await p.waitForTimeout(200);
want('a tap outside puts it away', !(await vis('#rail')));
const d=await (await b.newContext({viewport:{width:1280,height:860}})).newPage(); await d.goto('http://localhost:8811/write/writers-blockage.html'); await d.waitForTimeout(600);
want('desk: the rail is always there, no TOOLS button', await d.$eval('#rail',e=>e.offsetWidth>0)&&await d.$eval('#btnRail',e=>getComputedStyle(e).display==='none'));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
