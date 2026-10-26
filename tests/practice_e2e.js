/* PRACTICE SCENE: a quiet link, only when you tap it. Says it's AI-written prompts, not plays. Its own lane:
   never on the sides shelf, never replaces your real sides. TAPE IT -> Actor OS for that session; LEARN -> Memorizer;
   REWRITE -> THEACTORPAGES. Made-up sides only. Server on :8811.  NODE_PATH=... node tests/practice_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const REAL='INT. ROOM - DAY\n\nDANA PELL\nHi.\n\nROSS OKAFOR\nHey.\n';
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await p.waitForTimeout(700);
// an old practice entry on the shelf, from before: gets cleaned
await p.evaluate(()=>{ Shelf.put({text:'A\nHi.\n',file:"Today's scene - Old One",from:'Practice scene',tool:'daily'}); Shelf.put({text:'B\nYo.\n',file:'Salt Road sides',from:'Paste'}); });
await p.reload(); await p.waitForTimeout(700);
let body=await p.innerText('body');
want('home: no scene card in your face', !/TODAY.S SCENE/i.test(body)&&!(await p.$('.practice-card')));
const link=await p.$eval('[data-practice] .spark-btn',x=>({t:x.textContent,cls:x.className,ex:x.getAttribute('aria-expanded'),border:getComputedStyle(x).borderTopWidth}));
want('one quiet Practice scene link, closed', link.t==='Practice scene'&&/pr-link/.test(link.cls)&&link.ex==='false'&&link.border==='0px', link);
want('old practice entries cleaned off the shelf, real sides kept', await p.evaluate(()=>!Shelf.all().some(x=>DailyScenes.isPractice(x.file))&&Shelf.all().some(x=>x.file==='Salt Road sides')));
want('IN PLAY never lists a practice scene', !/Old One/.test(await p.innerText('body')));
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(150);
let card=await p.innerText('.practice-card');
want('the note: AI-written, not by me, not from anything real', card.includes(await p.evaluate(()=>Practice.NOTE))&&/Written by AI, not by me/.test(card), card);
want('no done count, no "today"', !/done|today/i.test(card), card);
want('says it stays out of your real work', /never goes on your sides shelf/.test(card), card);
const title=await p.$eval('.practice-card b',x=>x.textContent);
await p.click('[data-pnext]'); await p.waitForTimeout(100);
want('ANOTHER ONE: a different scene', await p.$eval('.practice-card b',x=>x.textContent)!==title);
await p.click('[data-pclose]'); await p.waitForTimeout(100);
want('CLOSE: gone again', !(await p.$('.practice-card')));
// real sides saved in Actor OS first
await p.goto('http://localhost:8811/actor-os/index.html'); await p.waitForTimeout(1000);
await p.evaluate(r=>loadSides(r,'Salt Road sides'),REAL); await p.waitForTimeout(300);
const lastBefore=await p.evaluate(()=>localStorage.getItem('actor_os_sides_last'));
// TAPE IT from home
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(100);
const t2=await p.$eval('.practice-card b',x=>x.textContent), parts2=await p.$$eval('[data-pme]',x=>x.map(y=>y.dataset.pme));
await p.click('[data-pme="'+parts2[1]+'"]'); await p.waitForTimeout(100);
await p.click('[data-pgo="tape"]'); await p.waitForURL(/actor-os/); await p.waitForTimeout(1500);
const st=await p.evaluate(()=>({file:SIDES.file,me:SIDES.me}));
want('TAPE IT: Actor OS has the scene, with your part', st.file==='Practice scene - '+t2&&st.me===parts2[1], st);
want('not on the shelf, your saved sides untouched', await p.evaluate(l=>!Shelf.all().some(x=>DailyScenes.isPractice(x.file))&&localStorage.getItem('actor_os_sides_last')===l,lastBefore));
want('the hand-off is used once', await p.evaluate(()=>!localStorage.getItem('theactorpage_handoff_practice')));
await p.goto('http://localhost:8811/actor-os/?open=1'); await p.waitForTimeout(1500);
want('reopen Actor OS asking for them: your real sides are back', await p.evaluate(()=>SIDES.file)==='Salt Road sides', await p.evaluate(()=>SIDES.file));
// the fold in Actor OS, TAPE IT in place
const a=await p.evaluate(()=>{ const d=document.getElementById('dailySec'); return {tag:d.tagName,open:d.open}; });
want('Actor OS: the practice scene is a closed fold', a.tag==='DETAILS'&&!a.open, a);
await p.evaluate(()=>{ AosFront.details(true); document.getElementById('dailySec').open=true; }); await p.waitForTimeout(100);
want('Actor OS fold: same note', /Written by AI, not by me/.test(await p.innerText('#dailyBox')));
const t5=await p.$eval('#dailyBox .practice-card b',x=>x.textContent);
await p.click('#dailyBox [data-pgo="tape"]'); await p.waitForTimeout(800);
want('Actor OS TAPE IT: loads here, no page change, not shelved', /actor-os/.test(p.url())&&await p.evaluate(t=>SIDES.file==='Practice scene - '+t&&!Shelf.all().some(x=>DailyScenes.isPractice(x.file))&&JSON.parse(localStorage.getItem('actor_os_sides_last')).file==='Salt Road sides',t5));
// LEARN
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(100);
const t3=await p.$eval('.practice-card b',x=>x.textContent), me3=await p.$eval('[data-pme][aria-pressed="true"]',x=>x.dataset.pme);
await p.click('[data-pgo="learn"]'); await p.waitForURL(/memorizer/); await p.waitForTimeout(1500);
want('LEARN: Memorizer has it, your part, not on the shelf', await p.evaluate(([t,m])=>{ const DB=JSON.parse(localStorage.getItem('memorizer_v1')), s=DB.scripts[DB.cur]; return s&&s.file==='Practice scene - '+t&&s.me===m&&!Shelf.all().some(x=>DailyScenes.isPractice(x.file)); },[t3,me3]));
// REWRITE
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(100);
await p.click('[data-pgo="write"]'); await p.waitForURL(/writers-blockage/); await p.waitForTimeout(2000);
const wb=await p.evaluate(()=>document.body.innerText);
want('REWRITE: THEACTORPAGES opens it, note says AI practice prompt', /Written by AI as a practice prompt/.test(wb), wb.slice(0,300));
want('no em dashes in the card copy', !/—/.test(card));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
