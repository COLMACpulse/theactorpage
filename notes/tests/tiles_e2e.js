/* NOTES: the front. CAMERA, MIC and SAY IT tiles on the first screen, with live OFF / RECORDING / LISTENING.
   A tap with no session starts one, then does the thing. Fake camera and mic, fake speech. Made-up people.
   Server on :8811 at the repo root.  NODE_PATH=... node notes/tests/tiles_e2e.js */
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){}
 class FakeSR extends EventTarget{ constructor(){ super(); window.__sr=this; } start(){ this.on=true; } stop(){ this.on=false; setTimeout(()=>{ const e=new Event('end'); this.dispatchEvent(e); if(this.onend) this.onend(e); },10); } abort(){ this.stop(); } }
 window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
 window.__say=t=>{ const r=window.__sr; if(!r||!r.onresult) return; const res=[{transcript:t}]; res.isFinal=true; r.onresult({resultIndex:0,results:[res]}); }; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let DIALOG='accept', asked=0; p.on('dialog',d=>{ asked++; DIALOG==='accept'?d.accept():d.dismiss(); });
await p.goto('http://localhost:8811/notes/'); await p.evaluate(()=>{ localStorage.removeItem('theactorpage_notes_v1'); localStorage.removeItem('notes_ui_v1'); }); await p.reload(); await p.waitForTimeout(500);
const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
const chip=id=>p.evaluate(id=>{ const t=document.querySelector('[data-kit="'+id+'"] [data-kst]'); return t?t.textContent:''; },id);
const until=async(id,w)=>{ try{ await p.waitForFunction(([id,w])=>{ const t=document.querySelector('[data-kit="'+id+'"] [data-kst]'); return t&&t.textContent===w; },[id,w],{timeout:5000}); return true; }catch(e){ return false; } };
const noDash=async()=>!/[—–]/.test(await p.evaluate(()=>document.body.innerText));

// first screen, no session yet
want('first screen: three tiles, all OFF', (await tiles()).join()==='tape:OFF,memo:OFF,say:OFF', await tiles());
let m=await p.innerText('#main');
want('each says what it does, and that it starts a session', /Tape the session/.test(m)&&/Voice memo/.test(m)&&/Say a note/.test(m)&&(m.match(/Starts a session/g)||[]).length===3, m.slice(0,400));
want('SAY IT says where speech goes', /Speech goes through your browser \(Chrome: Google, Safari: Apple\)/.test(m));
want('labels: CAMERA, MIC, SAY IT', (await p.$$eval('.kit .kt b',x=>x.map(y=>y.textContent))).join()==='CAMERA,MIC,SAY IT');
want('then the new session form', !!(await p.$('#start'))&&(await p.$$eval('.kit',x=>x.length))===1);
want('nothing on at load', await p.evaluate(()=>Hot.status().state)==='off'&&!(await p.$('#hotbar')));
want('no em dashes on the first screen', await noDash());

// SAY IT, privacy said no: nothing starts, no session made
DIALOG='dismiss'; await p.click('[data-kit="say"]'); await p.waitForTimeout(300);
want('SAY IT asks first; said no, nothing starts and no session is made', asked===1&&!(await p.evaluate(()=>__notes.U.cur))&&!(await p.evaluate(()=>__notes.U.stt))&&!!(await p.$('#start')));
DIALOG='accept';

// CAMERA: starts a session and the tape
await p.click('[data-kit="tape"]');
want('CAMERA tile: a session starts', !!(await p.evaluate(()=>__notes.U.cur))&&/Only you on the tape/.test(await p.innerText('#main')));
want('the tape rolls, the chip says RECORDING', await until('tape','RECORDING'), await tiles());
want('the tile says stop now, the button too', /Stop the tape/.test(await p.innerText('[data-kit="tape"]'))&&/STOP/.test(await p.innerText('#tape')));
await p.waitForTimeout(1200);
await p.click('[data-kit="tape"]'); await p.waitForFunction(()=>{ const s=Notes.session(__notes.U.cur); return s&&(s.tapes||[]).length===1; },null,{timeout:10000});
want('tap again: tape kept, camera OFF', await until('tape','OFF')&&await p.evaluate(()=>Takes.all('session').length)===1, await tiles());

// MIC: a voice memo
await p.click('[data-kit="memo"]');
want('MIC tile: memo recording, chip RECORDING, camera stays OFF', await until('memo','RECORDING')&&await chip('tape')==='OFF', await tiles());
want('the memo button in the note says stop', /STOP MEMO/.test(await p.innerText('[data-memo="new"]')));
await p.waitForTimeout(1000); await p.click('[data-kit="memo"]'); await p.waitForTimeout(1200);
want('tap again: memo kept, mic OFF', await until('memo','OFF')&&!!(await p.$('[data-pm]')), await tiles());

// SAY IT: speech, one privacy ask, into the note
asked=0; await p.click('[data-kit="say"]');
want('SAY IT: asks once, then LISTENING', asked===1&&await until('say','LISTENING'), await tiles());
await p.evaluate(()=>__say('Slow down on the second beat'));
want('what you say lands in the note', /Slow down on the second beat/.test(await p.inputValue('[data-text="new"]')));
await p.click('[data-kit="say"]');
want('tap again: stops, OFF', await until('say','OFF'), await tiles());
await p.click('[data-kit="say"]'); await p.waitForTimeout(200);
want('second time: no ask', asked===1&&await until('say','LISTENING')); await p.click('[data-kit="say"]'); await until('say','OFF');

// still a no-session front after DONE
await p.click('#endses'); await p.waitForTimeout(300);
want('done with the session: back to the tiles that start one', (await tiles()).join()==='tape:OFF,memo:OFF,say:OFF'&&/Starts a session/.test(await p.innerText('#main')));
want('no em dashes anywhere we went', await noDash());
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
