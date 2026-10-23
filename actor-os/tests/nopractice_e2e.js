/* Actor OS never opens on a practice scene you didn't ask for. An older version saved "Today's scene - ..." as your
   last sides; opening Actor OS now starts clean, or on your own sides. Asking for one (TAPE IT from home) still works,
   just for now. Made-up scene names. Server on :8811.  NODE_PATH=... node actor-os/tests/nopractice_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('actor_os_sides_last',JSON.stringify({file:"Today's scene - Made Up",text:'INT. ROOM - DAY\n\nAL\nHi.\n\nBO\nHey.\n'})); });
await p.reload(); await p.waitForTimeout(1500);
want('an old practice scene saved as last: Actor OS does not open on it', await p.evaluate(()=>!SIDES.script.length&&!/Today's scene/.test(document.body.innerText.split('Practice scene')[0])&&!localStorage.getItem('actor_os_sides_last')));
await p.evaluate(()=>localStorage.setItem('actor_os_sides_last',JSON.stringify({file:'my_sides.txt',text:'INT. ROOM - DAY\n\nAL\nHi.\n\nBO\nHey.\n'}))); await p.reload(); await p.waitForTimeout(1500);
want('your own last sides: offered, not opened', /Where you left off: my sides/.test(await p.innerText('#sidesOffer'))&&await p.evaluate(()=>!(SIDES.beats||[]).length&&!(SIDES.script||[]).length));
await p.click('#offerLast'); await p.waitForTimeout(600);
want('your own last sides: PICK UP opens them', await p.evaluate(()=>SIDES.file==='my_sides.txt'&&(SIDES.speakers||[]).length===2), await p.evaluate(()=>[SIDES.file,(SIDES.speakers||[]).length]));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
