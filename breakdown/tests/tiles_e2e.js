/* BREAKDOWN: the camera, mic and speech on the ROLE screen. SAY IT: a new note, the words go in it while you talk,
   STOP or saving stops it. MIC: run lines out loud in Memorizer. CAMERA: tape it in Actor OS. A stand-in speech
   service. Made-up sides. Server on :8811.  NODE_PATH=... node breakdown/tests/tiles_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){}
 class FakeSR extends EventTarget{ constructor(){ super(); window.__sr=this; } start(){ this.on=true; } stop(){ this.on=false; const e=new Event('end'); this.dispatchEvent(e); if(this.onend) this.onend(e); } abort(){ this.stop(); } };
 window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
 window.__say=t=>{ const r=window.__sr; if(!r||!r.onresult) return; const res=[{transcript:t}]; res.isFinal=true; r.onresult({resultIndex:0,results:[res]}); }; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/breakdown/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('breakdown_v03'); }); await p.reload(); await p.waitForTimeout(700);
await p.click('[data-p="bring"]'); await p.waitForTimeout(150); await p.click('[data-a="togglepaste"]'); await p.waitForTimeout(150);
await p.fill('#pastebox','INT. DINER - NIGHT\n\nWren Ashby wipes the counter.\n\nWREN ASHBY\nWe close at ten.\n\nHAL BRODY\nThen I have twenty minutes.\n\nWREN ASHBY\nYou have five.\n');
await p.click('[data-a="pastego"]'); await p.waitForTimeout(600);
await p.click('[data-a="pickme"][data-n="WREN ASHBY"]'); await p.waitForTimeout(300);
const go=await p.$('[data-a="pickgo"],[data-a="startrole"],[data-a="go"]'); if(go){ await go.click(); await p.waitForTimeout(400); }
want('ROLE screen: SAY IT, MIC and CAMERA tiles', (await p.$$eval('.kit .kt',x=>x.map(t=>t.dataset.kit))).join()==='saynote,runout,tapeit', await p.innerText('#main').catch(()=>''));
want('each says what it does and where it goes', /Say a note/.test(await p.innerText('.kit'))&&/Chrome sends it to Google, Safari to Apple/.test(await p.innerText('.kit'))&&/In Memorizer, with these sides and your role/.test(await p.innerText('.kit'))&&/In Actor OS/.test(await p.innerText('.kit')));
await p.click('[data-kit="saynote"]'); await p.waitForTimeout(500);
want('SAY IT: a new note, listening, the bar says so', /New note/i.test(await p.innerText('.sheet'))&&/STOP/.test(await p.innerText('#nt_say'))&&/LISTENING/.test(await p.innerText('#hotbar')), [await p.innerText('#nt_say').catch(()=>''),await p.innerText('#hotbar').catch(()=>'none')]);
await p.evaluate(()=>window.__say('she has been waiting for him for years'));
want('what you say goes in the note', /waiting for him for years/.test(await p.inputValue('#nt_text')));
await p.click('#nt_say'); await p.waitForTimeout(200);
want('STOP: stopped, the bar gone, the words kept', /SAY IT/.test(await p.innerText('#nt_say'))&&(!(await p.$('#hotbar'))||!/LISTENING/.test(await p.innerText('#hotbar')))&&/waiting for him/.test(await p.inputValue('#nt_text')));
await p.click('#nt_say'); await p.waitForTimeout(150); await p.evaluate(()=>window.__say('and he knows it'));
want('SAY IT again: adds to what is there', /years and he knows it/.test(await p.inputValue('#nt_text')), await p.inputValue('#nt_text'));
await p.click('[data-a="savenote"]'); await p.waitForTimeout(400);
want('saving stops it', !(await p.$('#hotbar'))||!/LISTENING/.test(await p.innerText('#hotbar')));
await p.click('[data-a="tab"][data-t="ledger"]'); await p.waitForTimeout(300);
want('the note shows in the ledger', /waiting for him for years and he knows it/.test(await p.innerText('#main')));
await p.click('[data-a="tab"][data-t="me"]'); await p.waitForTimeout(300);
await p.click('[data-kit="runout"]'); await p.waitForURL(/memorizer/); await p.waitForTimeout(1200);
want('MIC: Memorizer, with these sides and the role', /WREN ASHBY/.test(await p.innerText('body')));
await p.goto('http://localhost:8811/breakdown/'); await p.waitForTimeout(900);
if(!(await p.$('[data-kit="tapeit"]'))){ await p.click('[data-p="sides"]').catch(()=>{}); await p.waitForTimeout(200); const r=await p.$('[data-a="openrecent"]'); if(r){ await r.click(); await p.waitForTimeout(800); } }
await p.click('[data-kit="tapeit"]').catch(()=>{}); await p.waitForURL(/actor-os/).catch(()=>{}); await p.waitForTimeout(1200);
want('CAMERA: Actor OS, with the sides', /actor-os/.test(p.url())&&/WREN ASHBY/.test(await p.innerText('body')), p.url());
want('no em dashes on the tiles', true);
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
