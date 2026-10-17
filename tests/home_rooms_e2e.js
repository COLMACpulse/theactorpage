/* Home: the object on each band. Slate (ACT), typewriter (WRITE), camera (FILM), ON THE AIR mic (VO BOOTH).
   Filled from what you put in; blank until then; tap for that room's main tool. Made-up names. Server on :8811.
   NODE_PATH=... node tests/home_rooms_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1300,height:900}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('filmhub'); }); await p.reload(); await p.waitForTimeout(800);
const T=id=>p.evaluate(i=>{ const e=document.getElementById(i); return e?e.textContent:null; },id);
const vis=id=>p.evaluate(i=>{ const e=document.getElementById(i); return !!(e&&!e.hidden); },id);
want('from nothing: a blank slate, a blank page, an empty camera, each with its line', await vis('sl_why')&&await vis('tw_why')&&await vis('cam_why')&&!(await T('sl_prod'))&&!(await T('tw_title'))&&/next audition/.test(await T('sl_why'))&&/page goes here/.test(await T('tw_why'))&&/film goes here/.test(await T('cam_why')));
want('the slate has today\'s date even when blank', /^\d{1,2}\.\d{1,2}\.\d\d$/.test(await T('sl_date')));
want('each opens its room: Actor OS, Writer\'s Blockage, Story Studio, VO Booth', await p.evaluate(()=>['slate','tw','cam','mic'].map(i=>document.getElementById(i).getAttribute('href')).join('|'))==='actor-os/|write/writers-blockage.html|film/|booth/');
want('nothing is made on this device just to look (no FILM HUB database)', await p.evaluate(async()=>{ const L=indexedDB.databases?await indexedDB.databases():[]; return !L.some(d=>d.name==='filmhub'); }));
// fill it
const text=fs.readFileSync(path.join(FX,'low_tide.fountain'),'utf8');
await p.evaluate(t=>{ Inbox.put('request',{title:'LOW TIDE',role:'ANNA VOSS',file:'x'},'req|lt'); You.set('name','Sam Actor');
 localStorage.setItem('paper_trail_v1',JSON.stringify({projects:{p1:{id:'p1',title:'Dry Creek',updated:Date.now(),current:'d1'}},drafts:{d1:{id:'d1',project:'p1',label:'Draft 3',added:Date.now()}}}));
 localStorage.setItem('film_os_v1',JSON.stringify({cur:'lt',scripts:{lt:{file:'low_tide.fountain',text:t}}}));
 localStorage.setItem('booth_v1',JSON.stringify({job:{client:'Northgate Coffee'}})); Rooms.draw(); },text);
await p.waitForTimeout(400);
want('slate: the request, the role, take 1, you', await T('sl_prod')==='LOW TIDE'&&await T('sl_role')==='ANNA VOSS'&&await T('sl_take')==='1'&&await T('sl_name')==='Sam Actor'&&!(await vis('sl_why')));
want('a new request: the sticks clap', await p.evaluate(()=>document.getElementById('slate').classList.contains('clap')));
await p.waitForTimeout(2000);
want('typewriter: the title page of your latest draft, typed on', await T('tw_title')==='DRY CREEK'&&await T('tw_by')==='written by'&&await T('tw_name')==='Sam Actor'&&/^Draft 3 · /.test(await T('tw_date')));
want('camera: the film\'s own Title line, in the viewfinder too (no poster yet)', await T('cam_title')==='LOW TIDE'&&await T('cam_vf1')==='LOW TIDE'&&await p.evaluate(()=>document.getElementById('cam_img').style.display==='none'));
want('a new film: the reels turn', await p.evaluate(()=>document.getElementById('cam').classList.contains('roll')));
// a FILM HUB poster for it
await p.evaluate(async()=>{ const blob=await (await fetch('shared/fixtures/made_up_face.jpg')).blob(); await new Promise(res=>{ const r=indexedDB.open('filmhub',1); r.onupgradeneeded=()=>r.result.createObjectStore('posters'); r.onsuccess=()=>{ const t=r.result.transaction('posters','readwrite'); t.objectStore('posters').put(blob,'s:lt'); t.oncomplete=()=>{ r.result.close(); res(); }; }; }); Rooms.draw(); });
await p.waitForTimeout(600);
want('with a FILM HUB poster: the poster in the viewfinder, the title text gone', await p.evaluate(()=>{ const i=document.getElementById('cam_img'); return /^blob:/.test(i.getAttribute('href')||'')&&i.style.display!=='none'&&document.getElementById('cam_vf').style.display==='none'; }));
want('mic: the client on the plate, sign dark', /^NORTHGATE COF/.test(await T('mic_plate'))&&await p.evaluate(()=>!document.getElementById('mic').classList.contains('air')));
await p.evaluate(()=>{ const d=document.createElement('div'); d.id='hotbar'; d.textContent='MIC ON · NOT RECORDING'; document.body.appendChild(d); }); await p.waitForTimeout(150);
want('a mic goes live: ON THE AIR lights, and says so for a screen reader', await p.evaluate(()=>document.getElementById('mic').classList.contains('air'))&&await T('mic_sr')==='Mic is on');
await p.evaluate(()=>document.getElementById('hotbar').remove()); await p.waitForTimeout(150);
want('the mic goes off: the sign goes dark', await p.evaluate(()=>!document.getElementById('mic').classList.contains('air')));
await p.reload(); await p.waitForTimeout(1000);
want('after a reload: no clap, no roll (nothing new)', await p.evaluate(()=>!document.getElementById('slate').classList.contains('clap')&&!document.getElementById('cam').classList.contains('roll'))&&await T('tw_title')==='DRY CREEK');
want('no page errors', !errs.length, errs);
await c.close();
// reduced motion: no clap even when new
const c2=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}); const q=await c2.newPage();
await q.goto('http://localhost:8811/index.html'); await q.evaluate(()=>localStorage.clear()); await q.reload(); await q.waitForTimeout(600);
await q.evaluate(()=>{ Inbox.put('request',{title:'SALT FLATS',role:'HAL',file:'y'},'req|sf'); Rooms.draw(); }); await q.waitForTimeout(200);
want('reduced motion: filled, but no clap', await q.evaluate(()=>document.getElementById('sl_prod').textContent==='SALT FLATS'&&!document.getElementById('slate').classList.contains('clap')));
want('phone: the slate sits beside ACT', await q.evaluate(()=>{ const s=document.getElementById('slate').getBoundingClientRect(), h=document.querySelector('.band.act .disc-name').getBoundingClientRect(); return s.left>h.right&&s.width<140; }));
await c2.close(); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
