/* PAPER TRAIL: SAY IT, MIC and PHOTO tiles at the top of THE WORK (Boneyard, Research), not on the front (Col, Oct 24), with live OFF / LISTENING / RECORDING.
   No project: the tiles are off and say so. With projects: they land in the one you touched last.
   Fake mic, fake speech. Made-up scripts. Server on :8811 at the repo root.
   NODE_PATH=... node papertrail/tests/tiles_e2e.js */
const {chromium}=require('playwright');
const tabGo=async(pg,t)=>{ const sel='#tabs [data-tab="'+t+'"]'; if(!(await pg.$(sel))){ const g=await pg.$('#tabs [data-tabs~="'+t+'"]'); if(g){ await g.click(); await pg.waitForTimeout(150); } } await pg.click(sel); };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){}
 class FakeSR extends EventTarget{ constructor(){ super(); window.__sr=this; } start(){ this.on=true; } stop(){ this.on=false; setTimeout(()=>{ const e=new Event('end'); this.dispatchEvent(e); if(this.onend) this.onend(e); },10); } abort(){ this.stop(); } }
 window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
 window.__say=t=>{ const r=window.__sr; if(!r||!r.onresult) return; const res=[{transcript:t}]; res.isFinal=true; r.onresult({resultIndex:0,results:[res]}); }; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(600);
const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
const until=async(id,w)=>{ try{ await p.waitForFunction(([id,w])=>{ const t=document.querySelector('[data-kit="'+id+'"] [data-kst]'); return t&&t.textContent===w; },[id,w],{timeout:5000}); return true; }catch(e){ return false; } };
const onTab=t=>p.evaluate(t=>{ const x=document.querySelector('#tabs [data-tab="'+t+'"]'); return !!(x&&x.classList.contains('on')); },t);
const home=async()=>{ await tabGo(p,'bones'); await p.waitForTimeout(200); };
const noDash=async()=>!/[—–]/.test(await p.evaluate(()=>document.body.innerText));

// no project yet: the front is one drop box, no tiles
want('first screen, no project: no tiles, one drop box', !(await tiles()).length&&await p.isVisible('#drop')&&/Drop your drafts here/.test(await p.innerText('#main')), await tiles());
want('nothing on at load', await p.evaluate(()=>Hot.status().state)==='off');
want('no em dashes on the first screen', await noDash());
// two made-up projects; the second is the latest
const add=async(t,s)=>{ await tabGo(p,'add'); await p.fill('#ptitle',t); await p.fill('#paste',s); await p.click('#readit'); await p.waitForTimeout(500); };
await add('Gravel Road','EXT. GRAVEL ROAD - DAY\n\nJUNE\nYou missed the turn.\n\nPETE\nThere was no turn.\n');
await p.waitForTimeout(30);
await add('Night Ferry','INT. FERRY DECK - NIGHT\n\nIDA\nIs this the last one?\n\nMARCO\nIt is tonight.\n');
await p.click('[data-go="projects"]'); await p.waitForTimeout(300);
want('the front with projects: still no tiles', !(await tiles()).length);
want('then the projects', (await p.$$eval('[data-open]',x=>x.length))===2);
await p.click('[data-open]:has-text("Night Ferry")'); await p.waitForTimeout(200); await tabGo(p,'bones'); await p.waitForTimeout(200);
want('labels in THE WORK: SAY IT, MIC, PHOTO', (await p.$$eval('.kit .kt b',x=>x.map(y=>y.textContent))).join()==='SAY IT,MIC,PHOTO');
want('with projects: tiles on, chips OFF', (await tiles()).join()==='say:OFF,rec:OFF,photo:-', await tiles());
want('the tiles name the latest project', (await p.innerText('[data-kit="say"]')).includes('In: Night Ferry')&&(await p.innerText('[data-kit="rec"]')).includes('In: Night Ferry')&&(await p.innerText('[data-kit="photo"]')).includes('In: Night Ferry'));
want('SAY IT says where speech goes', /Speech goes via Google or Apple/.test(await p.innerText('[data-kit="say"]')));

// SAY IT
await p.click('[data-kit="say"]'); await p.waitForTimeout(300);
want('SAY IT tile: lands in the boneyard of Night Ferry, listening', await onTab('bones')&&/Night Ferry/i.test(await p.innerText('#crumb'))&&/STOP/.test(await p.innerText('#mic')));
await p.evaluate(()=>__say('A gull steals the ticket'));
want('what you say goes into the bones box', /A gull steals the ticket/.test(await p.inputValue('#bone')));
await home();
want('back on projects: SAY IT chip says LISTENING', await until('say','LISTENING'), await tiles());
await p.click('[data-kit="say"]'); await p.waitForTimeout(200);
want('tap again: back in the boneyard, still listening, not doubled', await onTab('bones')&&/STOP/.test(await p.innerText('#mic')));
await p.click('#mic'); await p.waitForTimeout(200); await home();
want('stopped: OFF', await until('say','OFF'), await tiles());

// MIC
await p.click('[data-kit="rec"]'); await p.waitForTimeout(800);
want('MIC tile: lands in research, recording', await onTab('research')&&/STOP RECORDING/.test(await p.innerText('#rrec')));
await p.waitForTimeout(800); await home();
want('back on projects: MIC chip RECORDING, tile says stop', await until('rec','RECORDING')&&/Stop recording/.test(await p.innerText('[data-kit="rec"]')), await tiles());
await p.click('[data-kit="rec"]');
await p.waitForFunction(()=>{ const d=JSON.parse(localStorage.getItem('paper_trail_v1')||'{}'); return Object.values(d.projects||{}).some(x=>(x.research||[]).length===1); },null,{timeout:8000}).catch(()=>{});
const kept=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('paper_trail_v1')); return Object.values(d.projects).map(x=>x.title+':'+(x.research||[]).length).sort().join(); });
want('tap again: stops, the memo is in Night Ferry research', kept==='Gravel Road:0,Night Ferry:1', kept);
await home(); want('MIC chip back to OFF', await until('rec','OFF'), await tiles());

// PHOTO
const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:5000}),p.click('[data-kit="photo"]')]);
want('PHOTO tile: lands in research and asks the camera for a photo', await onTab('research')&&!!fc&&await fc.element().getAttribute('capture')==='environment');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
await fc.setFiles({name:'ferry_rail.png',mimeType:'image/png',buffer:png}); await p.waitForTimeout(800);
want('the photo is kept in Night Ferry research', await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('paper_trail_v1')); return Object.values(d.projects).find(x=>x.title==='Night Ferry').research.length; })===2);

// the open project wins over the latest
await p.click('[data-go="projects"]'); await p.waitForTimeout(200);
await p.click('[data-open]:has-text("Gravel Road")').catch(()=>{});
const gp=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('paper_trail_v1')); return Object.values(d.projects).find(x=>x.title==='Gravel Road').id; });
if(!(await onTab('scenes'))){ await p.evaluate(id=>document.querySelector('[data-open="'+id+'"]').click(),gp); await p.waitForTimeout(200); }
await home();
want('with a project open, the tiles go to that one', (await p.innerText('[data-kit="rec"]')).includes('In: Gravel Road'), await p.innerText('[data-kit="rec"]'));
want('no em dashes anywhere we went', await noDash());
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
