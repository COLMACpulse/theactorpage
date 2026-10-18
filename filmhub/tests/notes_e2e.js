/* Video and voice notes: FILM HUB (on a film, by scene, a frame from it on the card, SAVE TO PHONE, words if you turn
   them on) and Paper Trail Research (SHOOT A NOTE, pinned to a scene, its words searchable). Fake camera and mic,
   a stand-in speech service. Made-up films. Server on :8811.  NODE_PATH=... node filmhub/tests/notes_e2e.js */
const {chromium}=require('playwright');
const tabGo=async(pg,t)=>{ const sel='#tabs [data-tab="'+t+'"]'; if(!(await pg.$(sel))){ const g=await pg.$('#tabs [data-tabs~="'+t+'"]'); if(g){ await g.click(); await pg.waitForTimeout(150); } } await pg.click(sel); };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){}
 class FakeSR extends EventTarget{ constructor(){ super(); window.__sr=this; } start(){ this.on=true; } stop(){ this.on=false; const e=new Event('end'); this.dispatchEvent(e); if(this.onend) this.onend(e); } abort(){ this.stop(); } };
 window.SpeechRecognition=FakeSR; window.webkitSpeechRecognition=FakeSR;
 window.__say=t=>{ const r=window.__sr; if(!r||!r.onresult) return; const res=[{transcript:t}]; res.isFinal=true; r.onresult({resultIndex:0,results:[res]}); }; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/filmhub/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('filmhub'); }); await p.reload(); await p.waitForTimeout(600);
want('FILMS: CAMERA and MIC tiles, off with no film', (await p.$$eval('.kit .kt',x=>x.map(t=>t.dataset.kit+(t.classList.contains('off')?':off':'')))).join()==='vnote:off,anote:off');
await p.click('#addfilm'); await p.fill('#ff_title','Salt Road'); await p.dispatchEvent('#ff_title','change'); await p.click('#back'); await p.waitForTimeout(200);
await p.click('[data-kit="vnote"]'); await p.waitForTimeout(1500);
want('the note camera opens, for Salt Road', await p.evaluate(()=>{ const s=document.getElementById('ncfor'); return !!s&&s.options[s.selectedIndex].text==='Salt Road'; })&&/CAMERA AND MIC ON/.test(await p.innerText('#hotbar')));
want('WORDS is off until you turn it on, and says where it goes', /WORDS OFF/.test(await p.innerText('#ncwords'))&&/Google/.test(await p.getAttribute('#ncwords','title')));
await p.click('#ncwords'); want('WORDS on: it says Google and Apple', /Chrome sends it to Google, Safari to Apple/.test(await p.innerText('#ncsay')));
await p.click('#ncgo'); await p.waitForTimeout(1200); await p.evaluate(()=>window.__say('the truck has to be red in every scene'));
await p.waitForTimeout(400);
want('recording: the clock runs, the words show, the bar says RECORDING', /● 0:0\d/.test(await p.innerText('#ncclock'))&&/truck has to be red/.test(await p.innerText('#ncheard'))&&/RECORDING/.test(await p.innerText('#hotbar')));
await p.click('#ncgo'); await p.waitForTimeout(1500);
want('stop: kept, on Salt Road, words written down', /Kept, 0:0\d, on Salt Road\. Words written down\./.test(await p.innerText('#ncsay')), await p.innerText('#ncsay'));
want('the camera is off once it stops', !(await p.$('#hotbar'))||!/CAMERA/.test(await p.innerText('#hotbar')));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#ncphone')]);
want('SAVE TO PHONE (a computer here): the video downloads, named for the film', /^Salt_Road_note_\d{4}-\d\d-\d\d_\d{4}\.(mp4|webm)$/.test(dl.suggestedFilename()), dl.suggestedFilename());
await p.click('#ncdone'); await p.waitForTimeout(600);
let m=await p.innerText('#main');
want('the card: 1 note, and a frame from it where the poster goes', /1 note, last/.test(m)&&await p.evaluate(()=>{ const i=document.querySelector('.fc img.po'); return !!i&&!i.hidden&&/^blob:/.test(i.src); }), m.slice(0,300));
await p.click('[data-open]'); await p.waitForTimeout(800);
m=await p.innerText('#main');
want('the film: the note plays, with its words, under The whole film', /Notes/i.test(m)&&/The whole film/i.test(m)&&/truck has to be red/.test(m)&&await p.evaluate(()=>{ const v=document.querySelector('video[data-note]'); return !!v&&/^blob:/.test(v.src); }), m.slice(-500));
await p.click('[data-anote]'); await p.waitForTimeout(1200);
want('SAY A NOTE: mic only', !!(await p.$('#notecam .aud'))&&!(await p.$('#ncv'))&&/MIC ON/.test(await p.innerText('#hotbar').catch(()=>'')), [!!(await p.$('#notecam .aud')),await p.innerText('#hotbar').catch(()=>'none'),await p.innerText('#ncsay')]);
await p.click('#ncgo'); await p.waitForTimeout(1000); await p.click('#ncgo'); await p.waitForTimeout(1200); await p.click('#ncdone'); await p.waitForTimeout(500);
want('two notes now, the voice one plays as audio', await p.$$eval('[data-note]',x=>x.length)===2&&await p.$$eval('audio[data-note]',x=>x.length)===1);
await p.reload(); await p.waitForTimeout(900); if(await p.$('#back')){ await p.click('#back'); await p.waitForTimeout(300); }
want('after a reload: still there', /2 notes, last/.test(await p.innerText('#main')));
await p.click('[data-open]'); await p.waitForTimeout(500); await p.click('[data-ndel]'); await p.waitForTimeout(300);
want('delete one', await p.$$eval('[data-note]',x=>x.length)===1);
// Paper Trail
const q=await c.newPage(); q.on('pageerror',e=>errs.push(e.message)); q.on('dialog',d=>d.accept());
await q.goto('http://localhost:8811/papertrail/'); await q.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await q.reload(); await q.waitForTimeout(700);
await tabGo(q,'add'); await q.fill('#ptitle','Ridge Line'); await q.fill('#paste','Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs.\n\nVALE\nRope.\n\nINT. CABIN - NIGHT\n\nHale sits.\n'); await q.click('#readit'); await q.waitForTimeout(500);
await q.click('[data-open]'); await q.waitForTimeout(300); await tabGo(q,'research'); await q.waitForTimeout(300);
await q.click('#rnote'); await q.waitForTimeout(1500);
want('Paper Trail: SHOOT A NOTE, with the scenes to pin it to', await q.evaluate(()=>[...document.querySelectorAll('#ncsc option')].map(o=>o.text).join('|'))==='No scene|SC 1 EXT. RIDGE - DAY|SC 2 INT. CABIN - NIGHT');
await q.selectOption('#ncsc','1'); await q.click('#ncgo'); await q.waitForTimeout(900); await q.evaluate(()=>window.__say('the cabin needs a stove'));
await q.click('#ncgo'); await q.waitForTimeout(1500); await q.click('#ncdone'); await q.waitForTimeout(600);
const r=await q.evaluate(()=>{ const P=Object.values(window.__trail.DB().projects)[0]; return P.research.map(x=>({kind:x.kind,note:x.note,scene:x.scene})); });
want('kept as a video in Research, its words as the note, pinned to scene 2', r.length===1&&r[0].kind==='video'&&r[0].note==='the cabin needs a stove'&&!!r[0].scene, r);
await q.fill('#rq','stove').catch(()=>{});
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
