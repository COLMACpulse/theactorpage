/* ACTOR OS opens on what you asked for: a practice scene, from home or left over from an older version, never comes
   back as your job or your sides. HOW THIS WORKS sits top left, under the mark, in the slate's blue. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>{ localStorage.clear();
 localStorage.setItem('actor_os_wired_v06',JSON.stringify({job:{project:'Untitled Performance',title:"Today's scene Discharge",role:'',due:'',instructions:'',research:''},takes:[]}));
 localStorage.setItem('actor_os_sides_last',JSON.stringify({file:"Today's scene - Discharge",text:'CHARLIE\nYou signed it.\n\nDANA\nI did.\n'})); });
await p.reload(); await p.waitForTimeout(1500);
want('an old practice scene left as the job: gone', await p.evaluate(()=>jobName()==='')&&!/discharge/i.test(await p.innerText('body'))&&await p.evaluate(()=>!SIDES.script||!SIDES.script.length));
await p.goto('http://localhost:8811/'); await p.waitForTimeout(700);
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(300); await p.click('[data-practice] [data-pgo="tape"]'); await p.waitForTimeout(1800);
const nm=await p.evaluate(()=>SIDES.file);
want('asked for a practice scene from home: it opens, just for now, and is not made the job', /^Practice scene - /.test(nm)&&await p.evaluate(()=>jobName()===''), [nm, await p.evaluate(()=>jobName())]);
for(const step of ['RUN','TAPE','SEND']){ await p.goto('http://localhost:8811/'); await p.waitForTimeout(500); await p.goto('http://localhost:8811/actor-os/'); await p.waitForTimeout(1400);
 want(step+' IT, then open the studio: nothing you did not ask for', await p.evaluate(()=>(!SIDES.script||!SIDES.script.length)&&jobName()==='')&&!/Practice scene -|Today.s scene/i.test(await p.innerText('body'))); }
const hb=await p.$eval('#howBtn',e=>{ const r=e.getBoundingClientRect(), s=e.closest('header').querySelector('.sig').getBoundingClientRect(); return {x:r.left,top:r.top,sigBottom:s.bottom,sigLeft:s.left,bg:getComputedStyle(e).backgroundColor,txt:e.textContent}; });
want('HOW THIS WORKS: top left, under the mark, slate blue', hb.txt==='HOW THIS WORKS'&&Math.abs(hb.x-hb.sigLeft)<4&&hb.top>=hb.sigBottom-2&&hb.bg==='rgb(42, 95, 168)', hb);
await p.click('#howBtn'); await p.waitForTimeout(300);
want('and it opens', await p.isVisible('#howSheet'));
const q=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); await q.goto('http://localhost:8811/actor-os/'); await q.waitForTimeout(600);
const hm=await q.$eval('#howBtn',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,w:r.width,vis:r.width>0}; });
want('on a phone too: on the left, visible', hm.vis&&hm.x<30, hm);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
