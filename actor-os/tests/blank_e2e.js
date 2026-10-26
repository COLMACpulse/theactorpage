/* ACTOR OS opens blank. Sides open only when you ask: from another tool (?open=1, ?sides=<id>) or with a button here.
   The last sides you had, and new sides another tool left, are offered, not opened. Made-up sides. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const SIDES1='INT. DOCK - NIGHT\n\nRAY\nYou came back.\n\nMARA\nI never left.\n\nRAY\nThen why does it feel like you did?\n';
const SIDES2='INT. DINER - DAY\n\nJUNE\nCoffee?\n\nCAL\nBlack. Like my mood.\n';
const loaded=()=>p.evaluate(()=>!!((SIDES.script&&SIDES.script.length)||(SIDES.beats&&SIDES.beats.length)));
await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1300);
want('nothing kept: blank, nothing offered', !(await loaded())&&!(await p.isVisible('#sidesOffer')));
await p.evaluate(s=>localStorage.setItem('actor_os_sides_last',JSON.stringify({file:'Harbor_Lights sides.pdf',text:s})),SIDES1);
await p.reload(); await p.waitForTimeout(1300);
want('your last sides: not opened, offered', !(await loaded())&&/Where you left off: Harbor Lights sides/.test(await p.innerText('#sidesOffer'))&&!/RAY/.test(await p.innerText('#prep')), await p.innerText('#sidesOffer'));
await p.click('#offerLast'); await p.waitForTimeout(600);
want('PICK UP: they open', await loaded()&&await p.evaluate(()=>SIDES.speakers.some(x=>x.name==='RAY'))&&!(await p.isVisible('#sidesOffer')));
/* new sides from another tool */
const id=await p.evaluate(s=>Shelf.put({text:s,file:'Diner_scene.txt',from:'Breakdown',tool:'breakdown'}).id,SIDES2);
await p.goto('http://localhost:8811/actor-os/'); await p.waitForTimeout(1300);
const o=await p.innerText('#sidesOffer');
want('new sides waiting: offered with where they came from, and your last ones too', !(await loaded())&&/New sides from Breakdown: Diner scene/.test(o)&&/Where you left off: Harbor Lights sides/.test(o), o);
await p.click('#offerNew'); await p.waitForTimeout(600);
want('OPEN THEM: they open', await loaded()&&await p.evaluate(()=>SIDES.speakers.some(x=>x.name==='CAL')));
await p.goto('http://localhost:8811/actor-os/?open=1'); await p.waitForTimeout(1300);
want('asked from another tool (?open=1): the last sides open', await loaded()&&await p.evaluate(()=>SIDES.speakers.some(x=>x.name==='JUNE'||x.name==='RAY')));
const id2=await p.evaluate(s=>Shelf.put({text:s,file:'Dock_again.txt',from:'Memorizer',tool:'memorizer'}).id,SIDES1.replace('DOCK','PIER'));
await p.goto('http://localhost:8811/actor-os/?sides='+encodeURIComponent(id)); await p.waitForTimeout(1300);
want('?sides=<id>: that set opens, not the newest', await loaded()&&await p.evaluate(()=>SIDES.speakers.some(x=>x.name==='CAL')));
/* the links that ask */
await p.goto('http://localhost:8811/how.html'); await p.waitForTimeout(900);
const links=await p.evaluate(()=>[...document.querySelectorAll('a[href^="actor-os/?"]')].map(a=>a.getAttribute('href')));
want('home: READ on sides in play asks for that set', links.some(h=>/^actor-os\/\?sides=/.test(h)), links);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
