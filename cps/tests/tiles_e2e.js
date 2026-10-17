/* CPS: the front. MIC and CAMERA tiles at the top of CHARACTERS, with live OFF / RECORDING.
   MIC starts a new character and records its voice. CAMERA needs a character, and says so until there is one.
   Fake mic. Made-up character. Server on :8811 at the repo root.  NODE_PATH=... node cps/tests/tiles_e2e.js */
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/cps/'); await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('cps_v02'); q.onsuccess=q.onerror=q.onblocked=()=>r(); })); await p.reload();
await p.waitForFunction(()=>window.CPS&&document.querySelector('.kit'),null,{timeout:8000});
const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
const until=async(id,w)=>{ try{ await p.waitForFunction(([id,w])=>{ const t=document.querySelector('[data-kit="'+id+'"] [data-kst]'); return t&&t.textContent===w; },[id,w],{timeout:5000}); return true; }catch(e){ return false; } };
const noDash=async()=>!/[—–]/.test(await p.evaluate(()=>document.body.innerText));

// first screen, no character
want('first screen: MIC and CAMERA tiles, OFF; CAMERA off for now', (await tiles()).join()==='voice:OFF,look:OFF:off', await tiles());
let m=await p.innerText('#main');
want('they say what they do', /Record a voice/.test(m)&&/Starts a new character/.test(m)&&/Photo of the look/.test(m)&&/Pick or start a character first/.test(m), m.slice(0,500));
want('labels: MIC, CAMERA', (await p.$$eval('.kit .kt b',x=>x.map(y=>y.textContent))).join()==='MIC,CAMERA');
want('the old big record button is gone (the MIC tile is it now)', !(await p.$('[data-a="quickrec"]')));
want('the tiles sit under the intro, above the other starts', await p.evaluate(()=>{ const k=document.querySelector('.kit'), q=document.querySelector('[data-a="quickmemo"]'), h=document.querySelector('#main h1'); return !!(k&&q&&h&&(h.compareDocumentPosition(k)&4)&&(k.compareDocumentPosition(q)&4)); }));
want('nothing on at load', await p.evaluate(()=>Hot.status().state)==='off');
want('no em dashes on the first screen', await noDash());

let chose=false; p.once('filechooser',()=>{ chose=true; });
await p.click('[data-kit="look"]'); await p.waitForTimeout(400);
want('CAMERA with no character: stays here, says why, no camera', !chose&&await p.evaluate(()=>CPS.S.tab)==='chars'&&/Pick a character first/.test(await p.evaluate(()=>[...document.querySelectorAll('.toast')].map(t=>t.textContent).join())));
p.removeAllListeners('filechooser');

// MIC: a new character, recording its voice
await p.click('[data-kit="voice"]'); await p.waitForFunction(()=>CPS.S.rec,null,{timeout:5000}).catch(()=>{});
want('MIC tile: new character, on CAPTURE, recording the voice', await p.evaluate(()=>CPS.S.tab==='capture'&&CPS.S.rec&&CPS.S.rec.kind==='voice'&&CPS.S.lib.chars.length===1));
want('the camera and mic bar says RECORDING', await p.evaluate(()=>Hot.status().state)==='recording');
await p.waitForTimeout(1500); await p.click('[data-a="recstop"]');
await p.waitForFunction(()=>CPS.S.lib.chars[0].takes.length===1&&!CPS.S.busy,null,{timeout:10000}).catch(()=>{});
want('stop: the take is kept', await p.evaluate(()=>CPS.S.lib.chars[0].takes.length)===1);
await p.evaluate(()=>{ const n=document.getElementById('c_name'); n.value='Marla Voss'; n.dispatchEvent(new Event('input',{bubbles:true})); });
await p.click('[data-a="tab"][data-t="chars"]'); await p.waitForTimeout(300);
want('back on CHARACTERS: both OFF, CAMERA on now and names who', (await tiles()).join()==='voice:OFF,look:OFF'&&/For: Marla Voss/.test(await p.innerText('[data-kit="look"]')), [await tiles(),await p.innerText('[data-kit="look"]')]);

// MIC again: the chip state reads RECORDING while it runs
await p.click('[data-kit="voice"]'); await p.waitForFunction(()=>CPS.S.rec,null,{timeout:5000}).catch(()=>{});
want('the MIC chip reads RECORDING while it records', await p.evaluate(()=>Kit.state('mic'))==='RECORDING');
await p.waitForTimeout(800); await p.click('[data-a="recstop"]');
await p.waitForFunction(()=>CPS.S.lib.chars.length===2&&CPS.S.lib.chars[1].takes.length===1&&!CPS.S.busy,null,{timeout:10000}).catch(()=>{});
want('a second new character, with its voice', await p.evaluate(()=>CPS.S.lib.chars.length===2&&CPS.S.lib.chars[1].takes.length===1));
await p.click('[data-a="tab"][data-t="chars"]'); await p.waitForTimeout(300);
want('and the mic is OFF again', await until('voice','OFF')&&await p.evaluate(()=>Hot.status().state)==='off');

// CAMERA: the look, for the current character
const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:5000}),p.click('[data-kit="look"]')]);
want('CAMERA tile: to CAPTURE, asks the front camera for a photo', await p.evaluate(()=>CPS.S.tab)==='capture'&&await fc.element().getAttribute('capture')==='user');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
await fc.setFiles({name:'look.png',mimeType:'image/png',buffer:png}); await p.waitForTimeout(600);
want('the look is kept on that character', await p.evaluate(()=>{ const c=CPS.S.lib.chars.find(x=>x.id===CPS.S.lib.cur); return c.looks.length; })===1);
await p.click('[data-a="tab"][data-t="chars"]'); await p.waitForTimeout(300);
want('no em dashes anywhere we went', await noDash());
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
