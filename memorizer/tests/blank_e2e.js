/* MEMORIZER opens blank, like Actor OS: the example plays in the middle, and two buttons, YOUR SCRIPTS and
   ON THE SHELF, show the lists only when tapped. Where you left off and new sides are offered, not opened. DONE takes
   one off the shelf; it stays in your scripts. ?open=1 and ?sides=<id> open them, and a practice scene you sent still opens. Made-up sides. :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const A='INT. DOCK - NIGHT\n\nRAY\nYou came back.\n\nMARA\nI never left.\n\nRAY\nThen why does it feel like you did?\n', B='INT. DINER - DAY\n\nJUNE\nCoffee?\n\nCAL\nBlack. Like my mood.\n';
const cur=()=>p.evaluate(()=>MEM._db().cur);
await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
await p.evaluate(()=>MEM.bring()); await p.waitForTimeout(200); await p.evaluate(s=>{ document.getElementById('paste').value=s; },A); await p.evaluate(()=>MEM.paste()); await p.waitForTimeout(300); await p.evaluate(()=>MEM.pickMe('RAY')); await p.waitForTimeout(300);
want('a script of yours, open', !!(await cur()));
await p.reload(); await p.waitForTimeout(800);
want('opened again: blank, nothing open, the example in the middle', !(await cur())&&!!(await p.$('#exline'))&&/EXAMPLE · HOW IT WORKS/.test(await p.innerText('#main')));
want('no lists in your face: just the buttons', !(await p.$('.panel'))&&!/Pasted sides/.test(await p.innerText('#main')));
await p.click('.tpill >> text=ON THE SHELF'); await p.waitForTimeout(200);
want('ON THE SHELF: where you left off, one tap', /WHAT YOU'RE WORKING ON NOW[\s\S]*RAY · Pasted sides[\s\S]*Where you left off/.test(await p.innerText('#main'))&&!!(await p.$('#pickup')), (await p.innerText('#main')).slice(0,300));
await p.click('.tpill >> text=ON THE SHELF'); await p.waitForTimeout(200);
want('tap it again: the list goes away', !(await p.$('.panel')));
await p.click('.tpill >> text=YOUR SCRIPTS'); await p.waitForTimeout(200);
want('YOUR SCRIPTS: all still there', /EVERY PROJECT[\s\S]*RAY · Pasted sides/.test(await p.innerText('#main')));
await p.click('#pickup'); await p.waitForTimeout(400);
want('PICK UP: it opens, on DRILL', !!(await cur())&&await p.evaluate(()=>MEM._db().tab==='drill'));
const id=await p.evaluate(s=>Shelf.put({text:s,file:'Diner_scene.txt',from:'Breakdown',tool:'breakdown',me:'CAL'}).id,B);
await p.goto('http://localhost:8811/memorizer/'); await p.waitForTimeout(800);
want('new sides from another tool: not opened, not shown until asked', !(await cur())&&!/Diner scene/i.test(await p.innerText('#main')));
await p.click('.tpill >> text=YOUR SCRIPTS'); await p.waitForTimeout(200);
want('YOUR SCRIPTS: new sides from your other tools, with OPEN', /FROM YOUR OTHER ACT TOOLS[\s\S]*Diner scene/i.test(await p.innerText('#main')));
await p.click('.tpill >> text=ON THE SHELF'); await p.waitForTimeout(200);
await p.click('.panel button:has-text("DONE")'); await p.waitForTimeout(200);
want('DONE: off the shelf, still in your scripts', await p.evaluate(()=>{ const d=MEM._db(); return (d.working||[]).length===0&&Object.keys(d.scripts).length===1; }));
await p.goto('http://localhost:8811/memorizer/?sides='+encodeURIComponent(id)); await p.waitForTimeout(800);
want('?sides=<id>: that set opens, as the character picked', await p.evaluate(()=>{ const d=MEM._db(), s=d.scripts[d.cur]; return !!s&&s.me==='CAL'; }));
await p.goto('http://localhost:8811/memorizer/'); await p.waitForTimeout(600);
await p.goto('http://localhost:8811/memorizer/?open=1'); await p.waitForTimeout(800);
want('?open=1: where you left off opens', !!(await cur()));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
