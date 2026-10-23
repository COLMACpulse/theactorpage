/* Story Studio: the front (CAMERA, CAMERA, MIC, PHOTO tiles with live OFF / ON / RECORDING) and SHOOT A TAKE:
   picture and sound, named for the scene and take, straight into CUT, still there after a reload.
   Fake camera and mic. Made-up script (LOW TIDE). Server on :8811.
   NODE_PATH=... node film/tests/shoot_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_takes'); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.goto('http://localhost:8811/film/?open=1'); await p.waitForTimeout(600);
const text=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:Buffer.from(text)}); await p.waitForTimeout(800);
want('a script in: PREP, on its scenes', /PLAN/.test(await p.innerText('#roomname'))&&!!(await p.$('#sub [data-t="scenes"].on')));
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(300);
const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')));
want('the front: four tiles, the camera and mic say OFF', (await tiles()).join()==='shoot:OFF,match:OFF,adr:OFF,scout:-', await tiles());
let m=await p.innerText('#main');
want('each says what it does here', /Shoot a take/.test(m)&&/Scene 1, take 1/.test(m)&&/Match a shot/.test(m)&&/Re-record a line/.test(m)&&/Shoot or add a take first/.test(m)&&/Scout a place/.test(m), m.slice(0,500));
want('ON SET: no way picked yet, so it says so, with the tiles under it', /SHOOT/.test(await p.innerText('#roomname'))&&/Nothing on the list yet/i.test(m)&&(await p.$$('[data-allway]')).length===4, m.slice(0,400));
// shoot
await p.click('[data-kit="shoot"]'); await p.waitForTimeout(1500);
want('SHOOT A TAKE: the camera opens, slate says scene 1, take 1', await p.evaluate(()=>{ const v=document.getElementById('shvid'); return !!(v&&v.videoWidth); })&&/SCENE 1 · TAKE 1/.test(await p.innerText('#shslate')), await p.innerText('#shslate'));
want('the camera and mic bar says on, not recording', /CAMERA AND MIC ON · NOT RECORDING/.test(await p.innerText('#hotbar')));
await p.click('#shrec'); await p.waitForTimeout(1600);
want('recording: the slate counts, the bar says RECORDING', /● 0:0[1-9]/.test(await p.innerText('#shslate'))&&/RECORDING/.test(await p.innerText('#hotbar')), await p.innerText('#shslate'));
await p.click('#shrec'); await p.waitForTimeout(1200);
want('stop: kept, named, in CUT', /Scene 1, take 1 kept \(0:0\d\)\. It's in CUT\./.test(await p.innerText('#shsaid')), await p.innerText('#shsaid'));
want('the next one is take 2', /TAKE 2/.test(await p.innerText('#shslate')));
await p.click('#shrec'); await p.waitForTimeout(1200); await p.click('#shrec'); await p.waitForTimeout(1200);
await p.click('#shx'); await p.waitForTimeout(500);
want('closed: the camera is off', !(await p.$('#hotbar')));
const k=await p.evaluate(()=>{ const d=window.__film.DB(), c=d.scripts[d.cur]; return (c.cut.takes[1]||[]).map(t=>({name:t.name,dur:t.dur,use:t.use,shot:t.shot})); });
want('two takes on scene 1, named for the film, scene and take; the first one used', k.length===2&&/^low_tide_Sc1_take1_\d{4}-\d\d-\d\d\.(mp4|webm)$/.test(k[0].name)&&/_Sc1_take2_/.test(k[1].name)&&k[0].use&&!k[1].use&&k[0].dur>0, k);
m=await p.innerText('#main');
want('the front: take count, scene 1 take 3 next, MIC ready now', /2 takes so far\. They're in CUT\./.test(m)&&/Scene 1, take 3/.test(m)&&/Over a take, in CUT/.test(m), m.slice(0,400));
await p.click('#tabs [data-r="post"]'); await p.waitForTimeout(500);
want('CUT: the takes play, and SHOOT A TAKE is on every scene', await p.$$eval('video[data-tvid]',x=>x.length)===2&&await p.$$eval('[data-shoot]',x=>x.length)===await p.evaluate(()=>window.__film.SCENES().length));
await p.goto('http://localhost:8811/film/?open=1'); await p.waitForTimeout(1500); await p.click('#tabs [data-r="post"]'); await p.waitForTimeout(800);
want('after a reload: still there, still plays', await p.$$eval('video[data-tvid]',x=>x.length)===2);
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(300);
await p.click('[data-kit="adr"]'); await p.waitForTimeout(400);
want('MIC tile: to CUT, at the ADR on a take', await p.evaluate(()=>document.querySelector('#tabs [data-r="post"]').classList.contains('on')));
await p.click('#tabs [data-r="set"]'); await p.click('[data-kit="scout"]'); await p.waitForTimeout(300);
want('PHOTO tile: to OWNED, where scouting is', await p.evaluate(()=>document.querySelector('#sub [data-t="own"]').classList.contains('on')));
await p.click('#tabs [data-r="set"]'); await p.click('[data-kit="match"]'); await p.waitForTimeout(400);
want('MATCH tile: into the scene, at match camera', await p.evaluate(()=>!!document.querySelector('[data-match]')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
