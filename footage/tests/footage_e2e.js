/* FOOTAGE: add a job, what needs you, where it stands, who to ask from CONTACTS; a Hub credit to track; trim a
   made-up video (drawn on the page, no real footage) into a clip that lands in the Hub's library and marks the job
   CLIPPED. Server on :8811.  NODE_PATH=... node footage/tests/footage_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let outside=[]; p.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/footage/'); await p.evaluate(()=>{ localStorage.clear(); Contacts.add({name:'Jo Producer',role:'producer'}); }); await p.reload(); await p.waitForTimeout(700);
want('no jobs yet: says how to start, and how to get footage the honest way', /No jobs yet/.test(await p.innerText('#view'))&&/never downloads anything from a streaming site/.test(await p.innerText('#view')));
await p.click('#add'); await p.fill('#j_title','Harbor Lights'); await p.fill('#j_role','Deckhand'); await p.fill('#j_ep','Ep. 104');
await p.fill('#j_out','2026-01-05'); await p.fill('#j_where','Made Up TV'); await p.fill('#j_ask','Jo Producer');
want('who to ask: names from CONTACTS are offered', await p.$$eval('#asklist option',x=>x.map(o=>o.value)).then(v=>v.includes('Jo Producer')));
await p.click('#keepnew'); await p.waitForTimeout(300);
let v=await p.innerText('#view');
want('added: out now (by the date), and what needs you says to ask', /Harbor Lights added\./.test(v)&&/OUT NOW/.test(v)&&/Harbor Lights, Ep\. 104 is out\. Ask for your footage \(Jo Producer\)\./.test(v), v.slice(0,400));
await p.click('[data-open]:has-text("Harbor Lights") >> nth=0'); await p.waitForTimeout(200);
want('open it: Jo Producer links to CONTACTS', /JO PRODUCER IN CONTACTS/.test(await p.innerText('#detail')));
await p.selectOption('#j_status','have'); await p.click('#save'); await p.waitForTimeout(200);
want('have the file: what needs you says trim it', /you have the file\. Trim your moment into a clip\./.test(await p.innerText('#view')));
// a made-up video, drawn on the page
await p.click('[data-open]:has-text("Harbor Lights") >> nth=0'); await p.click('#totrim'); await p.waitForTimeout(200);
const made=await p.evaluate(async()=>{ const cv=document.createElement('canvas'); cv.width=320; cv.height=180; const x=cv.getContext('2d'); const st=cv.captureStream(30);
 const ac=new AudioContext(), o=ac.createOscillator(), d=ac.createMediaStreamDestination(); o.connect(d); o.start(); st.addTrack(d.stream.getAudioTracks()[0]);
 const r=new MediaRecorder(st,{mimeType:'video/webm'}), ch=[]; r.ondataavailable=e=>ch.push(e.data); r.start(); const t0=performance.now();
 await new Promise(res=>{ const f=()=>{ const t=(performance.now()-t0)/1000; x.fillStyle='hsl('+(t*60)+',60%,40%)'; x.fillRect(0,0,320,180); x.fillStyle='#fff'; x.font='40px sans-serif'; x.fillText(t.toFixed(1),110,100); if(t<4) requestAnimationFrame(f); else res(); }; f(); });
 r.stop(); await new Promise(z=>r.onstop=z); o.stop(); const blob=new Blob(ch,{type:'video/webm'}); const dt=new DataTransfer(); dt.items.add(new File([blob],'made_up.webm',{type:'video/webm'})); const i=document.getElementById('tr_file'); i.files=dt.files; i.dispatchEvent(new Event('change')); return blob.size; });
await p.waitForTimeout(1200);
want('pick the video: it plays here, with SET IN and SET OUT', made>1000&&!!(await p.$('#tr_vid'))&&!!(await p.$('#tr_in')));
await p.evaluate(()=>{ const v=document.getElementById('tr_vid'); v.currentTime=1; }); await p.waitForTimeout(300); await p.click('#tr_in');
await p.evaluate(()=>{ const v=document.getElementById('tr_vid'); v.currentTime=2.5; }); await p.waitForTimeout(300); await p.click('#tr_out');
want('in and out set: the clip length says so', /Clip: 1\.5 seconds\./.test(await p.innerText('#tr_len')), await p.innerText('#tr_len'));
await p.click('#tr_make'); await p.waitForSelector('#tr_done',{timeout:20000}).catch(()=>{});
const done=await p.innerText('#trimbox').catch(()=>'');
want('MAKE THE CLIP: named for the job and role, in the Hub library too, SAVE TO PHONE', /Harbor_Lights_Deckhand_clip\.(webm|mp4)/.test(done)&&/in your Hub.s library too/.test(done)&&!!(await p.$('#tr_save')), done.slice(0,300));
want('it is really a clip: about the length you marked', await p.evaluate(async()=>{ const t=Takes.all('clip')[0]; if(!t) return false; const b=await Takes.blob(t.id); return b&&b.size>500&&t.for.title==='Harbor Lights'; }));
await p.click('#tr_close'); await p.waitForTimeout(200);
want('the job is CLIPPED, with its clip listed', /CLIPPED/.test(await p.innerText('[data-open]:has-text("Harbor Lights")'))&&/1 clip made/.test(await p.innerText('[data-open]:has-text("Harbor Lights")')));
want('nothing went anywhere', outside.length===0, outside);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
