/* THE STUDIO, the visual pass (Col, Oct 26: "bring back icons, bring back slate sticks"): every door has its house icon
   in a ring, colored by its room; the slate sticks run under the header and across the top of every card; nothing
   moves; it still fits about one screen on a computer. Computer light and dark, phone dark. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
for(const cs of ['light','dark']){
 const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>sessionStorage.setItem('tap_skip','1')); await p.reload(); await p.waitForTimeout(500);
 const doors=await p.$$eval('.room a',a=>a.map(x=>({n:x.querySelector('b').textContent,ic:!!x.querySelector('svg.ic use'),use:(x.querySelector('svg.ic use')||{}).getAttribute&&x.querySelector('svg.ic use').getAttribute('href')})));
 want(cs+': 9 doors, each with its icon', doors.length===9&&doors.every(d=>d.ic), doors.filter(d=>!d.ic));
 want(cs+': every icon is drawn (its symbol is on the page)', await p.evaluate(()=>[...document.querySelectorAll('.room svg.ic use')].every(u=>document.querySelector(u.getAttribute('href')))));
 const col=await p.$$eval('.room',r=>r.map(x=>getComputedStyle(x.querySelector('svg.ic')).color));
 want(cs+': icons colored by room (ACT gold, WRITE)', new Set(col).size===2, col);
 want(cs+': the sticks under the header and on every card', await p.$$eval('.sticks',s=>s.filter(x=>x.offsetHeight>=6).length)>=5);
 want(cs+': nothing moves', await p.evaluate(()=>[...document.querySelectorAll('svg.ic,.sticks')].every(e=>getComputedStyle(e).animationName==='none')));
 want(cs+': about one screen (a little more for the bigger Actor OS button)', await p.evaluate(()=>document.documentElement.scrollHeight)<=1180, await p.evaluate(()=>document.documentElement.scrollHeight));
 want(cs+': you first: a big headshot spot under the bar, above Your studio', await p.evaluate(()=>{ const m=document.querySelector('.me'), h=document.querySelector('.shead'), ph=document.querySelector('.mephoto'); return !!m&&!!h&&m.getBoundingClientRect().bottom<=h.getBoundingClientRect().top&&ph.getBoundingClientRect().height>=150; }));
 want(cs+': Actor OS card shows the four steps', /READ\s*LEARN\s*SHOOT\s*SEND/.test(await p.innerText('#aosCard')));
 want(cs+': no page errors', !errs.length, errs); await c.close(); }
const c=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true}); const p=await c.newPage();
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(500);
want('phone: the four steps with icons, and the sticks', (await p.$$('.psteps svg.ic')).length===4&&(await p.$$eval('.sticks',s=>s.filter(x=>x.offsetHeight>=10).length))>=2);
want('phone: no sideways scroll', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
