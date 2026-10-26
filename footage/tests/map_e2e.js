/* FOOTAGE, a map of what you have and where it is (Col, Oct 26). No chasing. A folder you pick goes on the map as a
   place (video files only, nothing copied); names say which project a file is, you fix the rest; a place you name holds
   what you say; FIND across them; TRIM opens on any file; LOOK AGAIN keeps your fixes; it all stays after a reload.
   Made-up folder (footage/tests/fixtures/map/Black SSD) and a made-up project (Salt Road). Server on :8811. */
const {chromium}=require('playwright'); const path=require('path');
const DIR=path.join(__dirname,'fixtures','map','Black SSD');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/footage/'); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('film_os_v1',JSON.stringify({scripts:{a:{title:'Salt Road',text:'x'}},cur:'a'})); }); await p.reload(); await p.waitForTimeout(400);
 let v=await p.innerText('#view');
 want(nm+': empty: says what it is, ADD A DRIVE OR FOLDER and NAME A PLACE; no chasing', /Nothing on the map yet/.test(v)&&/ADD A DRIVE OR FOLDER/.test(v)&&/NAME A PLACE/.test(v)&&!/ASK|ADD A JOB|who to ask/i.test(v), v.slice(0,200));
 want(nm+': the header says it: what you have, and where it is', /What you have, and where it is/.test(await p.innerText('header')));
 await p.setInputFiles('#adddrive',DIR); await p.waitForTimeout(500);
 v=await p.innerText('#view');
 want(nm+': a folder in: its place opens, 2 videos (the .txt left out)', /Black SSD/.test(v)&&/2 videos/.test(v)&&/SALT_ROAD_EP3_SC12_T04\.mov/.test(v)&&/C0041\.MP4/.test(v)&&!/notes\.txt/.test(v), v.slice(0,300));
 want(nm+': the name says the project; the other is NOT MATCHED', await p.evaluate(()=>{ const r=[...document.querySelectorAll('.frow')].map(x=>x.innerText); return r.some(x=>/SALT_ROAD/.test(x)&&/Salt Road/.test(x))&&r.some(x=>/C0041/.test(x)&&/NOT MATCHED/.test(x)); }));
 await p.click('#back'); await p.waitForTimeout(200); v=await p.innerText('#view');
 want(nm+': the map: Salt Road on Black SSD, and one not matched', /Salt Road[\s\S]*Black SSD · 1 file/.test(v)&&/Not matched[\s\S]*Black SSD · 1 file/.test(v), v.slice(0,400));
 await p.click('.colB [data-place]'); await p.waitForTimeout(200);
 const sel=await p.$$('[data-dir]'); const misc=await p.evaluate(()=>[...document.querySelectorAll('.fhead b')].findIndex(x=>/misc/.test(x.textContent)));
 await p.selectOption('[data-dir="'+misc+'"]','Salt Road'); await p.waitForTimeout(300);
 await p.click('#back'); await p.waitForTimeout(200); v=await p.innerText('#view');
 want(nm+': you say what a folder is: both files are Salt Road, nothing unmatched', /Black SSD · 2 files/.test(v)&&!/Not matched/.test(v), v.slice(0,300));
 await p.click('#name'); await p.fill('#n_name','Dropbox'); await p.fill('#n_note','the cut, from production'); await p.check('[data-holds="0"]'); await p.click('#n_keep'); await p.waitForTimeout(200);
 v=await p.innerText('#view');
 want(nm+': a place you named holds what you said', /Dropbox · the cut, from production/.test(v)&&!!(await p.$('.pchip.named')), v.slice(0,300));
 await p.fill('#find','c0041'); await p.waitForTimeout(200);
 want(nm+': FIND: a file by its name, and where it is', /C0041\.MP4/.test(await p.innerText('#found'))&&/Black SSD · misc/.test(await p.innerText('#found')));
 await p.fill('#find',''); await p.click('.colB [data-place]'); await p.waitForTimeout(200);
 await p.click('[data-trimf]'); await p.waitForTimeout(200);
 want(nm+': TRIM on a file: pick it from where it is', /Trim your moment/i.test(await p.innerText('#view'))&&/PICK THIS FILE/.test(await p.innerText('#view')));
 await p.click('#tr_close'); await p.waitForTimeout(200);
 await p.setInputFiles('#relook',DIR); await p.waitForTimeout(400);
 want(nm+': LOOK AGAIN keeps your fixes', /Your fixes are kept/.test(await p.innerText('#view'))&&!(await p.evaluate(()=>[...document.querySelectorAll('.frow')].some(x=>/NOT MATCHED/.test(x.innerText)))));
 await p.reload(); await p.waitForTimeout(400); v=await p.innerText('#view');
 want(nm+': after a reload the map is all still there', /Salt Road/.test(v)&&/Black SSD · 2 files/.test(v)&&/Dropbox/.test(v));
 want(nm+': kept under the backup\'s Footage key', await p.evaluate(()=>!!localStorage.getItem('theactorpage_footage_map_v1')));
 want(nm+': no sideways scroll, no em dashes', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&!/—/.test(v));
 await p.click('.colB [data-place]'); await p.waitForTimeout(200); await p.click('#forget'); await p.waitForTimeout(200);
 const pl=await p.$$eval('.colB [data-place]',x=>x.map(e=>e.textContent).join('|'));
 want(nm+': FORGET IT: off the map, the rest stays', !/Black SSD/.test(pl)&&/Dropbox/.test(pl)&&/is off the map/.test(await p.innerText('#view')), pl);
 want(nm+': no page errors', !errs.length, errs); await c.close(); }
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
