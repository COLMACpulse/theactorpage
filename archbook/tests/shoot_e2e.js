/* ARCHBOOK: SHOOT A CLIP. The camera tile on CLIPS; record, stop, KEEP IT: in your footage, kept in this app (the
   only copy), plays after a reload; SAVE TO PHONE; the camera off after. Fake camera. Server on :8811.
   NODE_PATH=... node archbook/tests/shoot_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/archbook/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('archbook_v03'); }); await p.reload(); await p.waitForTimeout(800);
want('CLIPS: a CAMERA tile, shoot a clip', (await p.$$eval('.kit .kt',x=>x.map(t=>t.dataset.kit))).join()==='shoot'&&/Shoot a clip/.test(await p.innerText('.kit'))&&/save it to the phone too/.test(await p.innerText('.kit')));
await p.click('[data-kit="shoot"]'); await p.waitForTimeout(1500);
want('open: the camera on, the bar says so', /CAMERA/.test(await p.innerText('#hotbar'))&&await p.evaluate(()=>document.getElementById('abv').videoWidth>0));
await p.click('#abgo'); await p.waitForTimeout(2300);
want('recording: the clock runs, the bar says RECORDING', /0:0[1-3]/.test(await p.innerText('#abc'))&&/RECORDING/.test(await p.innerText('#hotbar')), await p.innerText('#abc'));
await p.click('#abstop'); await p.waitForTimeout(900);
want('stopped: it plays back, not kept yet, the camera off', /Not kept yet/.test(await p.innerText('#abm'))&&(!(await p.$('#hotbar'))||!/CAMERA/.test(await p.innerText('#hotbar'))));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#absave')]);
want('SAVE TO PHONE (a computer here): it downloads, named Shot and the time', /^Shot \d{4}-\d\d-\d\d \d\d\.\d\d\.(mp4|webm)$/.test(dl.suggestedFilename()), dl.suggestedFilename());
await p.click('#abkeep'); await p.waitForTimeout(2500);
const L=await p.evaluate(()=>{ const r=indexedDB.open('archbook_v03'); return new Promise(res=>{ r.onsuccess=()=>{ const d=r.result; const t=d.transaction(['lib','media']); const g=t.objectStore('lib').get('main'); const k=t.objectStore('media').getAllKeys(); t.oncomplete=()=>res({clips:(g.result&&g.result.clips||[]).map(c=>({name:c.name,kept:c.kept,shot:c.shot,id:c.id})),media:k.result}); }; r.onerror=()=>res(null); }); });
want('KEEP IT: in your footage, kept in this app', L&&L.clips.length===1&&/^Shot /.test(L.clips[0].name)&&L.clips[0].kept&&L.media.includes(L.clips[0].id), L);
want('the clip shows on CLIPS', /Shot \d{4}/.test(await p.innerText('#main')));
await p.reload(); await p.waitForTimeout(1500);
want('after a reload: still linked (the copy here), no re-link needed', /Shot \d{4}/.test(await p.innerText('#main'))&&!/not linked on this device/.test(await p.innerText('#main')), (await p.innerText('#main')).slice(0,400));
await p.click('[data-kit="shoot"]'); await p.waitForTimeout(1200); await p.click('#abx'); await p.waitForTimeout(300);
want('CLOSE: the camera off, nothing added', (!(await p.$('#hotbar'))||!/CAMERA/.test(await p.innerText('#hotbar')))&&(await p.$$eval('.clip',x=>x.length))===1);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
