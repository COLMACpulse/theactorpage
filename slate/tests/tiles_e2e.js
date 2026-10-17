/* Slate Maker: the front of TAKE. CAMERA (record the slate here) as a tile with a live OFF / ON chip, and on a
   phone CAMERA (use the phone camera). Tap: straight to it. Gone once there's a take.
   Fake camera and mic. Server on :8811 at the repo root.
   NODE_PATH=... node slate/tests/tiles_e2e.js */
const {chromium}=require('playwright');
const SHOT='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/tiles_slate.png';
const PHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const open=async(ua)=>{ const c=await b.newContext(Object.assign({viewport:{width:390,height:844}},ua?{userAgent:ua}:{})); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
 const p=await c.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/slate/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(800); return p; };
const tiles=p=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
const dashes=p=>p.evaluate(()=>/—/.test(document.getElementById('main').innerText));

// computer
let p=await open();
want('computer: nothing on at page load', await p.evaluate(()=>{ const s=Hot.peek(); return !s.camera&&!s.mic; }));
want('computer: one tile, CAMERA, OFF', (await tiles(p)).join()==='recordhere:OFF', await tiles(p));
let m=await p.innerText('#main');
want('it says what it does', /Record the slate here/.test(m)&&/Camera and mic/.test(m), m.slice(0,300));
const r=await p.evaluate(()=>document.querySelector('.kit .kt').getBoundingClientRect().bottom);
want('on the first screen', r>0&&r<=844, r);
want('the old record button is gone (no doubles)', !(await p.$('button[data-a="recordhere"]'))&&!/Record with this/.test(m));
want('still: choose a take', /Choose a take/.test(m));
await p.click('[data-kit="recordhere"]'); await p.waitForTimeout(1800);
want('tap: the recorder opens with the camera on', await p.evaluate(()=>{ const v=document.querySelector('.recbox video'); return !!(v&&v.videoWidth); })&&/Record/.test(await p.innerText('.recbox')));
want('the chip says ON', (await tiles(p)).join()==='recordhere:ON', await tiles(p));
await p.click('#rcancel'); await p.waitForTimeout(1800);
want('cancel: camera off, chip back to OFF', await p.evaluate(()=>!Hot.peek().camera)&&(await tiles(p)).join()==='recordhere:OFF', await tiles(p));
want('computer: no em dashes', !(await dashes(p)));
want('computer: no page errors', !p.errs.length, p.errs);
await p.context().close();

// phone
p=await open(PHONE);
want('phone: two tiles, both CAMERA, OFF', (await tiles(p)).join()==='recordhere:OFF,shoot:OFF', await tiles(p));
m=await p.innerText('#main');
want('phone: the second says it opens the camera app', /Use the phone camera/.test(m)&&/Opens your camera app/.test(m));
want('phone: the old shoot button is gone', !(await p.$('button[data-a="shoot"]'))&&!/Shoot it now/.test(m));
const rows=await p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>Math.round(t.getBoundingClientRect().top)));
want('phone: side by side, on the first screen', rows.length===2&&rows[0]===rows[1]&&rows[0]<844, rows);
await p.screenshot({path:SHOT});
const fc=p.waitForEvent('filechooser',{timeout:3000}).catch(()=>null);
await p.click('[data-kit="shoot"]'); const ch=await fc;
want('phone tile: opens the camera input', !!ch&&(await ch.element().getAttribute('id'))==='shootin');
want('phone: no em dashes', !(await dashes(p)));
want('phone: no page errors', !p.errs.length, p.errs);
// with a take: no tiles
await p.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=320; c.height=180; const g=c.getContext('2d'); const s=c.captureStream(15); const rec=new MediaRecorder(s,{mimeType:'video/webm'}); const ch=[]; rec.ondataavailable=e=>ch.push(e.data);
 let i=0; const tm=setInterval(()=>{ g.fillStyle='hsl('+(i++*20)+',60%,50%)'; g.fillRect(0,0,320,180); },60); rec.start(); await new Promise(r=>setTimeout(r,1200)); rec.stop(); await new Promise(r=>rec.onstop=r); clearInterval(tm);
 const f=new File([new Blob(ch,{type:'video/webm'})],'made_up_take.webm',{type:'video/webm'}); const dt=new DataTransfer(); dt.items.add(f); const inp=document.getElementById('takein'); inp.files=dt.files; inp.dispatchEvent(new Event('change')); });
await p.waitForTimeout(2500);
await p.click('nav.tabs [data-t="take"]'); await p.waitForTimeout(500);
m=await p.innerText('#main');
want('with a take: TAKE shows the take, no tiles', /made_up_take/.test(m)&&!(await p.$('.kit')), m.slice(0,200));
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
