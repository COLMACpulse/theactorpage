/* VO BOOTH: the front. Two MIC tiles on COPY (check the room, record the reads) with live OFF / ON / RECORDING.
   Record the reads is off until there's copy. Tap: straight to ROOM (checking) or READ (at the first line).
   Fake mic. Made-up copy (DRY CREEK). Server on :8811.
   NODE_PATH=... node booth/tests/tiles_e2e.js */
const {chromium}=require('playwright'); const path=require('path');
const SHOT='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/tiles_booth.png';
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/booth/'); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('booth_v1',JSON.stringify({exGone:true})); indexedDB.deleteDatabase('booth_media'); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(500);
const tiles=()=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
const tileText=()=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.innerText).join(' | '));
const onTab=t=>p.evaluate(t=>document.querySelector('#tabs [data-t="'+t+'"]').classList.contains('on'),t);
const atTop=()=>p.evaluate(()=>{ const m=document.getElementById('main'); return !!(m.firstElementChild&&m.firstElementChild.classList.contains('kit')); });

// nothing in yet (the example put away: booth_example_e2e covers it)
want('first screen is COPY, two MIC tiles on top, both OFF, reads greyed', await onTab('copy')&&await atTop()&&(await tiles()).join()==='room:OFF,read:OFF:off', await tiles());
let tt=await tileText();
want('the words: check the room, record the reads, add the copy first', /MIC/.test(tt)&&/Check the room/.test(tt)&&/Hear your room before you read/.test(tt)&&/Record the reads/.test(tt)&&/Add the copy first/.test(tt), tt);
want('no em dashes in the tiles', !/—/.test(tt));
want('nothing on at load', !(await p.$('#hotbar'))&&await p.evaluate(()=>!Hot.status().mic));
await p.click('[data-kit="read"]'); await p.waitForTimeout(300);
want('tap reads with no copy: stays on COPY, says add the copy', await onTab('copy')&&/Add the copy first/.test(await p.innerText('#toast'))&&!(await p.$('#hotbar')));
// copy in
await p.setInputFiles('#files',[path.join(__dirname,'..','..','shared','fixtures','dry_creek_vo_copy.txt')]); await p.waitForTimeout(800);
const n=await p.evaluate(()=>window.__booth.job().spots.length);
tt=await tileText();
want('copy in: reads tile on, says how many spots', n>0&&(await tiles()).join()==='room:OFF,read:OFF'&&new RegExp(n+' spots? ready').test(tt), [n,await tiles(),tt]);
await p.screenshot({path:SHOT});
// room
await p.click('[data-kit="room"]'); await p.waitForTimeout(700);
want('tap room: to ROOM, it is checking, the mic is on', await onTab('room')&&/Quiet now/.test(await p.innerText('#roomnow'))&&await p.evaluate(()=>Hot.status().mic));
want('the bar says the mic is recording', /RECORDING/.test(await p.innerText('#hotbar').catch(()=>'')));
await p.waitForSelector('#main .msg',{timeout:15000});
want('room check done', !!(await p.evaluate(()=>window.__booth.S.room)));
// back to COPY by the tab: the mic goes off, tiles say OFF
await p.click('#tabs [data-t="copy"]'); await p.waitForTimeout(400);
want('leave ROOM: the mic is off, tiles OFF', !(await p.evaluate(()=>Hot.status().mic))&&(await tiles()).join()==='room:OFF,read:OFF', await tiles());
// reads
await p.click('[data-kit="read"]'); await p.waitForTimeout(400);
want('tap reads: to READ, at the first record button, not recording', await onTab('read')&&!!(await p.$('[data-rec]'))&&!(await p.evaluate(()=>Hot.status().recording))&&!(await p.$('#hotbar')));
want('the first record button is on screen', await p.evaluate(()=>{ const r=document.querySelector('[data-rec]').getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight; }));
// record one, then leave by the tab: the mic goes off
await p.click('[data-rec]'); await p.waitForTimeout(800);
want('recording: bar says RECORDING', /RECORDING/.test(await p.innerText('#hotbar').catch(()=>'')));
await p.click('#tabs [data-t="copy"]'); await p.waitForTimeout(800);
want('leave READ while recording: mic off, tiles OFF', !(await p.evaluate(()=>Hot.status().mic))&&(await tiles()).join()==='room:OFF,read:OFF'&&!(await p.$('#hotbar')), await tiles());
// tile into READ, start, then the tab back: still goes off (one path)
await p.click('[data-kit="read"]'); await p.waitForTimeout(300); await p.click('[data-rec]'); await p.waitForTimeout(600); await p.click('[data-rec]'); await p.waitForTimeout(800);
want('take kept after a tile trip', await p.evaluate(()=>Object.values(window.__booth.S.takes).some(L=>L.length>0)));
await p.click('#tabs [data-t="send"]'); await p.waitForTimeout(500);
want('leave READ to SEND: mic off', !(await p.evaluate(()=>Hot.status().mic)));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
