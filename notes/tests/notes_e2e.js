/* NOTES end to end, with a fake camera and mic and made-up people. Needs a local server on :8811 at the repo root.
   NODE_PATH=... node notes/tests/notes_e2e.js */
const {chromium}=require('playwright'); const path=require('path');
(async()=>{ const F=path.join(__dirname,'..','..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:390,height:844}}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,300))); if(!c) ok=false; };
const allow=async()=>{ if(await p.isVisible('#hotsheet button.p').catch(()=>false)) await p.click('#hotsheet button.p'); };
await p.goto('http://localhost:8811/notes/index.html'); await p.evaluate(()=>{ localStorage.removeItem('theactorpage_notes_v1'); localStorage.removeItem('notes_ui_v1'); }); await p.reload();
// a new session
await p.fill('[data-wn="0"]','Dana Pell'); await p.click('#addwho'); await p.fill('[data-wn="1"]','Ross Okafor'); await p.click('[data-wr="1|director"]');
await p.setInputFiles('#sf',path.join(F,'low_tide_sides.pdf')); await p.waitForTimeout(800);
want('sides go on the shelf for Actor OS and MEMORIZER', await p.evaluate(()=>!!(window.Shelf.current()&&/ANNA/.test(window.Shelf.current().text))));
await p.fill('#dp','ANNA'); await p.click('#start'); await p.waitForTimeout(200);
want('the session names who is in the room', /Dana Pell, Ross Okafor/.test(await p.innerText('#title')));
// zoom check
await p.click('#zcgo'); await p.waitForTimeout(400); await allow(); await p.waitForTimeout(1500);
want('zoom check: live picture and a word on the light', await p.evaluate(()=>{ const v=document.getElementById('zv'); return !!(v&&v.videoWidth); })&&(await p.innerText('#lw')).length>5, await p.innerText('#ov'));
want('the bar says camera and mic are on, not recording', await p.evaluate(()=>Hot.status().state)==='ready');
await p.click('#zcoff'); await p.waitForTimeout(300);
want('after the check the camera goes off', await p.evaluate(()=>Hot.status().state)==='off');
// tape it, two marks
await p.click('#tape'); await p.waitForTimeout(300); await allow(); await p.waitForTimeout(2000);
want('while taping the bar says recording', await p.evaluate(()=>Hot.status().state)==='recording');
await p.click('#mark'); await p.waitForTimeout(1500); await p.click('#mark'); await p.waitForTimeout(800);
await p.click('#tape'); await p.waitForFunction(()=>{ const s=Notes.session(__notes.U.cur); return s&&(s.tapes||[]).length===1; },null,{timeout:10000});
const marks=await p.evaluate(()=>Notes.session(__notes.U.cur).marks.map(m=>({take:!!m.takeId,at:Math.round(m.at*10)/10})));
want('both marks land on the tape at their moments', marks.length===2&&marks.every(m=>m.take)&&Math.abs(marks[0].at-2.3)<0.8&&Math.abs(marks[1].at-3.8)<0.8, marks);
want('the tape is on the takes shelf', await p.evaluate(()=>Takes.all('session').length)===1);
// note it
const slots=await p.evaluate(()=>[...document.querySelectorAll('[data-text]')].map(t=>t.dataset.text));
await p.fill('[data-text="'+slots[0]+'"]','Take your time before the last line.'); await p.click('[data-save="'+slots[0]+'"]'); await p.waitForTimeout(200);
const s2=await p.evaluate(()=>[...document.querySelectorAll('[data-text]')].map(t=>t.dataset.text));
await p.fill('[data-text="'+s2[0]+'"]','Slow down. Take your time with it.'); await p.selectOption('[data-giver="'+s2[0]+'"]','Ross Okafor'); await p.click('[data-save="'+s2[0]+'"]'); await p.waitForTimeout(200);
await p.click('[data-memo="new"]'); await p.waitForTimeout(400); await allow(); await p.waitForTimeout(1200); await p.click('[data-memo="new"]'); await p.waitForTimeout(800);
await p.fill('[data-text="new"]','Let the silence sit.'); await p.click('[data-save="new"]'); await p.waitForTimeout(300);
const notes=await p.evaluate(()=>Notes.notesOf(__notes.U.cur).map(n=>({g:n.giver,t:n.text,take:!!n.takeId,memo:!!n.memoId})));
want('three notes: two on the tape, one with a voice memo, each with who gave it', notes.length===3&&notes.filter(n=>n.take).length===2&&notes.some(n=>n.memo)&&notes.some(n=>n.g==='Ross Okafor')&&notes.some(n=>n.g==='Dana Pell'), notes);
await p.click('[data-play]'); await p.waitForTimeout(800);
want('watch the moment: the tape opens near the mark', await p.evaluate(()=>{ const v=document.getElementById('pv'); return !!v&&v.currentTime>=0; }));
await p.click('#pvx');
// people
await p.click('[data-t=people]'); await p.waitForTimeout(200);
const pt=await p.innerText('#main');
want('people: what more than one person told you', /"take your time"\s*2 people/.test(pt), pt.slice(0,400));
want('people: each person with their notes', /Dana Pell/.test(pt)&&/Ross Okafor/.test(pt));
want('no sideways scroll at phone width', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
want('camera off when you leave the session', await p.evaluate(()=>Hot.status().state)==='off');
// the Hub and home pick it up: Dana Pell has seen you; a request from her says what she told you
const eco=require('fs').readFileSync(path.join(__dirname,'..','..','hub','tests','request_tests.js'),'utf8').match(/const ECO = `([\s\S]*?)`;/)[1];
const h=await ctx.newPage(); h.on('pageerror',e=>errs.push('hub '+e.message)); h.on('dialog',d=>d.accept());
await h.goto('http://localhost:8811/hub/index.html'); await h.waitForTimeout(900); await h.evaluate(async()=>{ if(isDemo()) await dropDemoData(); });
want('Hub: a casting director from a session counts as "has seen me"', await h.evaluate(()=>officeGate('Dana Pell'))==='seen_you');
await h.evaluate(t=>{ addRequestFrom(HubReq.read(t),true); go('road'); },eco); await h.waitForTimeout(400);
want('Hub: the new request says what she told you', (await h.evaluate(()=>[...document.querySelectorAll('.audcard .offhist')].map(x=>x.textContent).join(' '))).includes('Dana Pell gave you 2 notes'));
want('no page errors', !errs.length, errs);
await b.close(); process.exit(ok?0:1); })();
