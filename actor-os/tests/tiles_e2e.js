/* Actor OS: the front of PREP. CAMERA (tape it), CAMERA (read with yourself), MIC (record the other lines) as tiles
   with a live OFF / ON chip. Off until there are sides and a part; each tap lands where that thing is.
   Fake camera and mic, made-up sides (LOW TIDE). Server on :8811 at the repo root.
   NODE_PATH=... node actor-os/tests/tiles_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
const SHOT='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/tiles_actoros.png';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/index.html');
await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('actor_os_reader'); sessionStorage.setItem('theactorpage_hot_ok','1'); });
await p.reload(); await p.waitForTimeout(1200);
const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('#aosKit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
want('nothing on at page load', await p.evaluate(()=>{ const s=Hot.peek(); return !s.camera&&!s.mic; }));
want('first screen: three tiles, all OFF, no sides yet so two are off', (await tiles()).join()==='tape:OFF,partner:OFF:off,lines:OFF:off', await tiles());
const top=await p.evaluate(()=>[...document.querySelectorAll('#aosKit .kt')].map(t=>{ const r=t.getBoundingClientRect(); return r.bottom; }));
want('the tiles are on the first screen', top.length===3&&top.every(y=>y>0&&y<=844), top);
let m=await p.innerText('#aosKit');
want('each says what it does', /Tape it/.test(m)&&/Your self-tape/.test(m)&&/Read with yourself/.test(m)&&/Record the other lines/.test(m)&&/Bring in your sides first/.test(m), m);
await p.screenshot({path:SHOT});
// off tile with no sides: no stage, back to the sides
await p.click('[data-kit="partner"]'); await p.waitForTimeout(400);
want('off PARTNER tile does not open the stage', await p.evaluate(()=>!document.getElementById('stage').classList.contains('on')));
// sides in, part picked
const sides=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.evaluate(t=>{ loadSides(t,'low_tide.fountain'); },sides); await p.waitForTimeout(300);
await p.evaluate(()=>{ SIDES.me=''; SIDES.script=[]; renderSides(); }); await p.waitForTimeout(200);
m=await p.innerText('#aosKit');
want('sides in, no part: the tiles say pick your part', /Pick your part first/.test(m), m);
await p.evaluate(()=>{ pickMe('ANNA'); boothReady(); }); await p.waitForTimeout(600);
const n=await p.evaluate(()=>aosOthers().length);
want('part picked: all three on, MIC says how many lines', (await tiles()).join()==='tape:OFF,partner:OFF,lines:OFF'&&new RegExp(n+' lines? to read').test(await p.innerText('#aosKit'))&&/Your partner on screen/.test(await p.innerText('#aosKit')), {t:await tiles(),m:await p.innerText('#aosKit')});
// MIC tile: to the reader booth
await p.evaluate(()=>window.scrollTo(0,0));
await p.click('[data-kit="lines"]'); await p.waitForTimeout(900);
const bw=await p.evaluate(()=>{ const r=document.getElementById('boothWrap').getBoundingClientRect(); return {shown:document.getElementById('boothWrap').style.display!=='none',top:Math.round(r.top)}; });
want('MIC tile: to the reader booth, in view', bw.shown&&bw.top>=-5&&bw.top<400, bw);
want('MIC tile does not turn the mic on by itself', await p.evaluate(()=>!Hot.peek().mic));
// CAMERA tile: SHOOT, camera on, chip says ON
await p.evaluate(()=>window.scrollTo(0,0));
await p.click('[data-kit="tape"]'); await p.waitForTimeout(2000);
want('CAMERA tile: to SHOOT, the camera is on', await p.evaluate(()=>document.getElementById('shoot').classList.contains('on')&&!!document.getElementById('prevVid').videoWidth));
await p.waitForTimeout(1600);
want('the CAMERA chips say ON while it is on', /^tape:ON,partner:ON/.test((await tiles()).join()), await tiles());
await p.click('nav button[data-tab="prep"]'); await p.waitForTimeout(1800);
want('back in PREP the camera is off again, chips say OFF', /^tape:OFF,partner:OFF/.test((await tiles()).join()), await tiles());
// PARTNER tile: the stage, in scene partner
await p.click('[data-kit="partner"]'); await p.waitForTimeout(1500);
want('PARTNER tile: the stage opens in scene partner', await p.evaluate(()=>document.getElementById('stage').classList.contains('on')&&MODE==='PARTNER'));
await p.evaluate(()=>exitStage()); await p.waitForTimeout(500);
const all=await p.evaluate(()=>document.getElementById('aosKit').innerText+[...document.querySelectorAll('#aosKit [title],#aosKit [aria-label]')].map(x=>x.title+x.getAttribute('aria-label')).join(''));
want('no em dashes in the tiles', !/—/.test(all), all);
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
