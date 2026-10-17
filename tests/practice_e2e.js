/* PRACTICE SCENE (was Today's scene): out of the way until you tap it. Home: one small button under ACT; open, it says
   what it is, which part you play, what each button does. TAPE IT -> Actor OS with the scene and your part; Actor OS:
   folded, opens when the scene is loaded; LEARN THE LINES -> Memorizer; REWRITE IT -> Writer's Blockage. Old shelf
   names still count. Server on :8811.  NODE_PATH=... node tests/practice_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await p.waitForTimeout(700);
let body=await p.innerText('body');
want('home: no daily scene card in your face', !/TODAY.S SCENE/i.test(body)&&!(await p.$('#daily')));
want('one PRACTICE SCENE button under ACT, closed', (await p.$$eval('[data-practice] .spark-btn',x=>x.map(y=>y.textContent+':'+y.getAttribute('aria-expanded')))).join()==='PRACTICE SCENE:false'&&!(await p.$('.practice-card')));
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(150);
let card=await p.innerText('.practice-card');
want('open: what it is, in plain words', /A short scene written for this site, for two people\. Any actor can play either part\./.test(card), card);
want('works on, in plain words, not TRAINS', /works on /.test(card)&&!/TRAINS/i.test(card), card);
const parts=await p.$$eval('[data-pme]',x=>x.map(y=>y.dataset.pme));
want('YOU PLAY: both parts', parts.length===2, parts);
const other=await p.$eval('[data-pme][aria-pressed="false"]',x=>x.dataset.pme);
await p.click('[data-pme="'+other+'"]'); await p.waitForTimeout(100); card=await p.innerText('.practice-card');
want('pick the other part: it says so, and what each button does', new RegExp("You're playing "+other).test(card)&&new RegExp('Actor OS opens with the scene loaded and you as '+other).test(card)&&/Rewrite it: Writer.s Blockage opens it as a script/.test(card), card);
const title=await p.$eval('.practice-card b',x=>x.textContent);
await p.click('[data-pnext]'); await p.waitForTimeout(100);
want('ANOTHER SCENE: a different one', await p.$eval('.practice-card b',x=>x.textContent)!==title);
await p.click('[data-pclose]'); await p.waitForTimeout(100);
want('CLOSE: gone again', !(await p.$('.practice-card'))&&await p.getAttribute('[data-practice] .spark-btn','aria-expanded')==='false');
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(100);
const t2=await p.$eval('.practice-card b',x=>x.textContent), parts2=await p.$$eval('[data-pme]',x=>x.map(y=>y.dataset.pme));
await p.click('[data-pme="'+parts2[1]+'"]'); await p.waitForTimeout(100);
await p.click('[data-pgo="tape"]'); await p.waitForURL(/actor-os/); await p.waitForTimeout(1500);
const st=await p.evaluate(()=>({file:SIDES.file,me:SIDES.me}));
want('TAPE IT: Actor OS has the scene, with your part', st.file==='Practice scene - '+t2&&st.me===parts2[1], st);
const a=await p.evaluate(()=>{ const d=document.getElementById('dailySec'); return {tag:d.tagName,open:d.open,sum:d.querySelector('summary').innerText}; });
want('Actor OS: the practice scene is a fold, open because it is loaded', a.tag==='DETAILS'&&a.open&&/PRACTICE SCENE/i.test(a.sum)&&/nothing to tape\? try one/i.test(a.sum), a);
want('Actor OS: it says what loading does, and that it is loaded', /IT'S LOADED ABOVE/.test(await p.innerText('#dailyBox'))&&/it goes in as your sides/.test(await p.innerText('#dailyBox')), await p.innerText('#dailyBox'));
await p.evaluate(()=>{ localStorage.removeItem('actor_os_v5_shelf_seen'); }); await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ try{ SIDES.file=''; }catch(e){} });
await p.evaluate(()=>{ const k=Object.keys(localStorage).filter(k=>/shelf/i.test(k)); }); await p.reload(); await p.waitForTimeout(1200);
// fresh Actor OS with other sides: folded
await p.evaluate(()=>{ loadSides('INT. ROOM - DAY\n\nDANA PELL\nHi.\n\nROSS OKAFOR\nHey.\n','Salt Road sides'); renderDaily(); });
want('Actor OS with other sides: folded, out of the way', await p.evaluate(()=>!document.getElementById('dailySec').open||/LOAD IT TO TAPE/.test(document.getElementById('dailyBox').innerText)));
want('old sides named "Today\'s scene - ..." still count', await p.evaluate(t=>!!DailyScenes.fromFile("Today's scene - "+t)&&!!DailyScenes.fromFile('Practice scene - '+t)&&!DailyScenes.fromFile('Salt Road sides'),t2));
// learn
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(100);
const t3=await p.$eval('.practice-card b',x=>x.textContent), me3=await p.$eval('[data-pme][aria-pressed="true"]',x=>x.dataset.pme);
await p.click('[data-pgo="learn"]'); await p.waitForURL(/memorizer/); await p.waitForTimeout(1500);
want('LEARN THE LINES: Memorizer has it, your part picked', new RegExp(me3).test(await p.innerText('body'))&&await p.evaluate(t=>Shelf.all().some(x=>x.file==='Practice scene - '+t),t3));
// rewrite
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(100);
const t4=await p.$eval('.practice-card b',x=>x.textContent);
await p.click('[data-pgo="write"]'); await p.waitForURL(/writers-blockage/); await p.waitForTimeout(2000);
const wb=await p.evaluate(()=>document.body.innerText);
want('REWRITE IT: Writer\'s Blockage opens it as a script, the note says practice scene', /practice scene/i.test(wb)&&!/Today.s scene/i.test(wb), wb.slice(0,300));
want('no em dashes in the practice card copy', !/—/.test(card));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
