/* ON THIS DEVICE, the front: when you last backed up, one big button, SEND IT TO MYSELF (share sheet) on a phone,
   what's here, restore that adds and never removes, and Project Hub's backup now goes here. The data the old
   backup missed is in the file. Computer (light) and phone (dark). Made-up names only. Server on :8811.
   NODE_PATH=... node device/tests/front_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), {execFileSync}=require('child_process');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
async function seed(p){ await p.evaluate(async()=>{ localStorage.clear();
  localStorage.setItem('theactorpage_notes_v1',JSON.stringify({sessions:[],notes:[{id:'n1',t:'A made-up note'}]}));
  localStorage.setItem('theactorpage_workedwith_v1',JSON.stringify({people:[{name:'Dana Pell'}]}));
  localStorage.setItem('hub_online_v1',JSON.stringify({host:'example.github.io/riley'}));
  localStorage.setItem('theactorpage_postcard_v1',JSON.stringify({keep:true,look:'slate'}));
  await new Promise(res=>{ const r=indexedDB.open('theactorpage_spotted_pics',1); r.onupgradeneeded=()=>r.result.createObjectStore('pics'); r.onsuccess=()=>{ const t=r.result.transaction('pics','readwrite'); t.objectStore('pics').put(new Blob(['made-up'],{type:'image/png'}),'s1'); t.oncomplete=()=>{ r.result.close(); res(); }; }; });
  await new Promise(res=>{ const r=indexedDB.open('memorizer_media',1); r.onupgradeneeded=()=>r.result.createObjectStore('m'); r.onsuccess=()=>{ const t=r.result.transaction('m','readwrite'); t.objectStore('m').put(new Blob(['take'],{type:'audio/webm'}),'t1'); t.oncomplete=()=>{ r.result.close(); res(); }; }; });
 }); }
// computer, light
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block',acceptDownloads:true}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/device/'); await p.waitForTimeout(500); await seed(p); await p.reload(); await p.waitForTimeout(1200);
let v=await p.innerText('main');
want('light: the theme, the house header', await p.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(236, 231, 220)'&&/YOU · ON THIS DEVICE/i.test(await p.innerText('header'))&&/Your backup/.test(await p.innerText('header h1')));
want('never backed up: says so, and that it lives only here', /LAST BACKUP\s*Never/i.test(v)&&/only here/.test(v), v.slice(0,300));
want('what\'s here: the tools, with OPEN', /WHAT.S HERE · \d+ TOOLS/i.test(v)&&/Notes/.test(v)&&(await p.$$('.li a.mini')).length>=3);
want('no byte sizes per tool, no "nothing here yet" list', !/\d+ B\b/.test(await p.innerText('.card.list'))&&!/Nothing here yet from/.test(v));
want('no share sheet on this computer: no SEND IT', !(await p.$('#send')));
await p.screenshot({path:SHOTS+'/device_desk_front.png',fullPage:true});
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#bk')]); const zip=await dl.path(); await p.waitForTimeout(600);
const T=fs.mkdtempSync(path.join(os.tmpdir(),'dv-')); execFileSync('unzip',['-q','-o',zip,'-d',T]); const m=JSON.parse(fs.readFileSync(path.join(T,'backup.json'),'utf8'));
const ls=Object.keys(m.ls), dbs=m.idb.map(d=>d.name);
want('the file now holds what the old one missed: worked with, your page address, the postcard, Spotted pictures, Memorizer takes', ['theactorpage_workedwith_v1','hub_online_v1','theactorpage_postcard_v1'].every(k=>ls.includes(k))&&dbs.includes('theactorpage_spotted_pics')&&dbs.includes('memorizer_media'), {ls,dbs});
v=await p.innerText('main');
want('after: today, and what was saved', /LAST BACKUP\s*Today/i.test(v)&&/Saved: theactorpage_backup_/.test(v), v.slice(0,300));
// restore: take one away, put it back
await p.evaluate(()=>localStorage.removeItem('theactorpage_workedwith_v1')); await p.reload(); await p.waitForTimeout(900);
await p.setInputFiles('#file',zip); await p.waitForTimeout(1200);
v=await p.innerText('main');
want('restore: what the file adds, plain', /This file adds 1 saved item this browser doesn.t have/.test(v)&&/YOUR BACKUP/.test(await p.innerText('.backbar')), v.slice(0,300));
await p.screenshot({path:SHOTS+'/device_desk_restore.png',fullPage:true});
await p.click('#go'); await p.waitForTimeout(1200);
want('restored: it\'s back, nothing removed', /Restored 1 saved item\. Nothing removed\./.test(await p.innerText('main'))&&await p.evaluate(()=>!!localStorage.getItem('theactorpage_workedwith_v1')));
await p.setInputFiles('#file',zip); await p.waitForTimeout(1000); await p.click('#cancel'); await p.waitForTimeout(500);
want('‹ YOUR BACKUP: back to the front', /LAST BACKUP/.test(await p.innerText('main')));
fs.rmSync(T,{recursive:true,force:true});
// Project Hub: one backup
await p.goto('http://localhost:8811/hub/index.html'); await p.waitForTimeout(1200); await p.evaluate(()=>go('home')); await p.waitForTimeout(400);
want('Project Hub: BACK UP EVERYTHING goes to On This Device; no Hub-only backup on the front', await p.getAttribute('#view a:has-text("BACK UP EVERYTHING")','href')==='../device/'&&!/BACK UP NOW/.test(await p.innerText('#view')));
await c.close();
// phone, dark, with a share sheet
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.addInitScript(()=>{ window.__shared=null; navigator.canShare=d=>!!(d&&d.files&&d.files.length); navigator.share=async d=>{ window.__shared={n:d.files.length,name:d.files[0].name,type:d.files[0].type,size:d.files[0].size}; }; });
await q.goto('http://localhost:8811/device/'); await q.waitForTimeout(500); await seed(q); await q.reload(); await q.waitForTimeout(1200);
want('phone: dark', await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(18, 17, 16)');
want('phone: SEND IT TO MYSELF, and what it does', !!(await q.$('#send'))&&/share sheet: save it to Files or Drive, or email it to yourself/.test(await q.innerText('main'))&&/isn.t this phone/.test(await q.innerText('main')));
await q.screenshot({path:SHOTS+'/device_phone_front.png',fullPage:true});
await q.click('#send'); await q.waitForTimeout(1500);
const sh=await q.evaluate(()=>window.__shared);
want('SEND IT: the share sheet gets the .zip', sh&&sh.n===1&&/^theactorpage_backup_.*\.zip$/.test(sh.name)&&sh.type==='application/zip'&&sh.size>100, sh);
want('sent: today, and says sent', /LAST BACKUP\s*Today/i.test(await q.innerText('main'))&&/Sent: /.test(await q.innerText('main')));
want('phone: nothing off the side', await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
want('no em dashes', !/—/.test(await q.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
