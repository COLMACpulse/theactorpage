/* Story Studio: through the script (a thing or place in more than one scene) and "said with a no". Made-up script.
   Server on :8811.  NODE_PATH=... node film/tests/through_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
const T="EXT. DUST ROAD - DAWN\n\nCOLE rides in on a horse. He has no gun. A lantern swings from the saddle.\n\nCOLE\nWhere's the rifle?\n\nINT. BARN - NIGHT\n\nCOLE hangs the lantern. He pulls on his gloves and grabs two rifles.\n\nMAE\nYou forgot your hat.\n\nEXT. DUST ROAD - DAY\n\nCOLE walks the horse. Thunder.\n";
await p.setInputFiles('#file',{name:'dust_road.fountain',mimeType:'text/plain',buffer:Buffer.from(T)}); await p.waitForTimeout(800);
await p.evaluate(()=>{ const b=document.querySelector('[data-go="scenes"],[data-t="scenes"]'); if(b) b.click(); }); await p.waitForTimeout(400);
const th=await p.innerText('#through').catch(()=>'');
want('through the script: the lantern, the horse, and DUST ROAD, with their scenes', /lantern scenes 1, 2/.test(th)&&/horse scenes 1, 3/.test(th)&&/DUST ROAD place · scenes 1, 3/.test(th), th);
await p.click('[data-scene="1"]'); await p.waitForTimeout(300);
want('scene 1: the gun said with a no, kept off the list', /Said with a no, so not on the list: gun\./.test(await p.innerText('#propsnot').catch(()=>'')));
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
