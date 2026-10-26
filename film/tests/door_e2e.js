/* STORY STUDIO: the front door. Opened with nothing: the example plays, YOUR FILMS and + START A FILM, no lists until
   tapped. START A FILM: what, who, the script; with a crew, every scene starts as a crew scene. Opened again: blank,
   PICK UP one tap; ?open=1 opens it. The four steps (PLAN, SHOOT, FINISH, OUT) count on the tabs. OUT: bring in the
   finished film, then each place is one tap: Footage, a reel clip, your page (through Film Hub), a postcard (Picture
   It, your words), the file. Made-up script and a test-pattern video. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path');
const CUT=path.join(__dirname,'fixtures','test_cut.webm');
const SCRIPT='INT. KITCHEN - NIGHT\n\nJune sets the keys on the table.\n\nJUNE\nYou took the truck.\n\nWES\nI brought it back.\n\nEXT. SALT ROAD - DAWN\n\nWES\nIt ran fine.\n\nJUNE\nWith no gas in it.\n';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
const main=()=>p.innerText('#main'), db=()=>p.evaluate(()=>__film.DB());
want('opened with nothing: the example, the two buttons', /EXAMPLE · HOW IT WORKS/.test(await main())&&/YOUR FILMS\s*0/.test(await main())&&/START A FILM/.test(await main()));
want('the header: the slate on the left, the sigil on the right, the sticks', !!(await p.$('header.top svg.hico'))&&(await p.getAttribute('header.top img.hsig','alt'))==='THEACTORPAGE'&&!!(await p.$('.hstk')));
want('the four steps, in order', (await p.$$eval('#tabs button span',x=>x.map(e=>e.textContent))).join()==='PLAN,SHOOT,FINISH,OUT');
const c1=await p.innerText('#excap'); await p.waitForTimeout(2400); const c2=await p.innerText('#excap');
want('the example moves: one step lit, then the next', c1!==c2&&(await p.$$('#exsteps .step.on')).length===1, [c1,c2]);
want('the example is not your work', Object.keys((await db()).scripts).length===0);
await p.click('#startfilm'); await p.waitForTimeout(200);
want('START A FILM: what, who, the script', /WHAT ARE YOU MAKING/i.test(await main())&&/WHO.S MAKING IT/i.test(await main())&&!!(await p.$('#drop'))&&!!(await p.$('#paste')));
await p.click('[data-kind="short"]'); await p.click('[data-who="crew"]'); await p.waitForTimeout(100);
want('the answers show', /A short, with a crew/.test(await p.innerText('#startsum')));
await p.fill('#paste',SCRIPT); await p.click('#readit'); await p.waitForTimeout(500);
let d=await db(), c=d.scripts[d.cur];
want('started: open on PLAN, a short, with a crew', !!c&&c.kind==='short'&&c.who==='crew'&&await p.evaluate(()=>document.querySelector('#tabs [data-r="prep"]').classList.contains('on')));
want('with a crew: every scene starts as a crew scene', Object.values(c.scenes||{}).length===2&&Object.values(c.scenes).every(s=>s.way==='crew'));
want('the tabs count: PLAN done, SHOOT 0 of the shots, OUT 0 of 5', (await p.innerText('[data-rs="prep"]'))==='✓'&&/^0\/\d+$/.test(await p.innerText('[data-rs="set"]'))&&(await p.innerText('[data-rs="out"]'))==='0 of 5');
await p.reload(); await p.waitForTimeout(700);
want('opened again: blank, not pushed on you', !(await db()).cur&&/EXAMPLE/.test(await main()));
await p.click('#yourfilms'); await p.waitForTimeout(200);
want('YOUR FILMS: where you left off, its steps, PICK UP', /Pasted script/.test(await main())&&/where you left off/.test(await main())&&/SHOOT · 0 of \d+ shots/.test(await main())&&!!(await p.$('#pickup')));
await p.click('#pickup'); await p.waitForTimeout(300);
want('PICK UP: it opens', !!(await db()).cur&&/KITCHEN/.test(await main()));
await p.goto('http://localhost:8811/film/?open=1'); await p.waitForTimeout(700);
want('?open=1: where you left off opens', !!(await db()).cur);
await p.click('#tabs [data-r="out"]'); await p.waitForTimeout(200);
want('OUT with no cut: make the rough cut, or bring in the finished film', /MAKE THE ROUGH CUT/.test(await main())&&/BRING IN THE FINISHED FILM/.test(await main()));
await p.setInputFiles('#outfile',CUT); await p.waitForTimeout(1500);
d=await db(); c=d.scripts[d.cur];
want('the finished film is in: kept, its length read', c.cut&&c.cut.final&&c.cut.final.from==='file'&&c.cut.final.secs>=2&&/Where does it go/.test(await main()), c.cut&&c.cut.final);
want('nothing sent yet', Object.keys(c.out||{}).length===0&&!(await p.evaluate(()=>localStorage.getItem('filmhub_v1'))));
await p.click('[data-dest="footage"]'); await p.waitForTimeout(300);
want('FOOTAGE: the film in your list, with the clip', await p.evaluate(()=>{ const j=Footage.jobs().find(x=>x.title==='Pasted script'); return !!j&&j.clips.length===1&&j.kind==='short'; }));
await p.click('[data-dest="reel"]'); await p.waitForTimeout(600);
want('YOUR REEL: a reel clip for the Project Hub', await p.evaluate(()=>Takes.all('clip').some(x=>x.for.title==='Pasted script')));
await p.click('[data-dest="page"]'); await p.waitForTimeout(300);
want('YOUR PAGE: done and on the page in Film Hub', await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('filmhub_v1')), id=__film.DB().cur; return d.studio[id].mark==='done'&&d.studio[id].show===true; }));
want('the tab counts it: 3 of 5', (await p.innerText('[data-rs="out"]'))==='✓ 3 of 5');
want('A PACKAGE: a way to the Hub', !!(await p.$('[data-dest="package"]')));
await p.click('[data-dest="postcard"]'); await p.waitForURL(/picture\/\?plug=/); await p.waitForTimeout(500);
want('A POSTCARD: Picture It, the facts in, your words to write', await p.evaluate(()=>{ const q=Viz.plugs()[0]; return !!q&&q.kind==='worked'&&q.title==='Pasted script'; })&&/picture\/\?plug=/.test(p.url()));
await p.goto('http://localhost:8811/filmhub/'); await p.waitForTimeout(700);
want('Film Hub: the film, done, its four steps, PUT IT OUT', /Pasted script/.test(await p.innerText('#main'))&&/DONE/i.test(await p.innerText('#main'))&&/PUT IT OUT/.test(await p.innerText('#main')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
