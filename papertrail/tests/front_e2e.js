/* PAPER TRAIL in the house look (Col, Oct 24): the front is your projects, or one drop box when there are none.
   No counts, no tiles, no language picker up front (mic and photo live in THE WORK). Each project says what changed
   since the draft before. Scene cards show what's on file as plain dots, no red "Missing", and tag what changed.
   A scene leads with the scene and what changed, and what it's for; the rest is folded and stays as you left it.
   Computer light, phone dark. Made-up scripts. Server on :8811.  NODE_PATH=... node papertrail/tests/front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const D1='Title: Salt Road\n\nINT. DINER - NIGHT\n\nRain on the glass.\n\nDANA\nWe\'re closed.\n\nROSS\nDoor was open.\n\nEXT. SALT ROAD - LATER\n\nRoss walks the shoulder.\n\nROSS\nShe was right.\n\nEXT. GAS STATION - NIGHT\n\nA pump clicks off.\n';
const D2='Title: Salt Road\n\nINT. DINER - NIGHT\n\nRain on the glass.\n\nDANA\nWe\'re closed.\n\nROSS\nThe door was wide open.\n\nEXT. SALT ROAD - LATER\n\nRoss walks the shoulder.\n\nROSS\nShe was right.\n\nINT. MOTEL - NIGHT\n\nNeon hums.\n\nMAE\nYou\'re late.\n';
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
 const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 want(nm+': the house palette, '+cs, cs==='light'?bg==='rgb(236, 231, 220)':bg==='rgb(18, 17, 16)', bg);
 want(nm+': the house header, with the sticks', await p.isVisible('header .bhead .hico')&&await p.isVisible('header .hstk')&&/Every draft, kept/.test(await p.innerText('header h1')));
 let m=await p.innerText('#main');
 want(nm+': empty: one drop box, PICK FILES and Paste one', await p.isVisible('#drop')&&/Drop your drafts here/.test(m)&&/PICK FILES/i.test(m)&&/Paste one/i.test(m));
 want(nm+': no counts, no tiles, no language picker on the front', !(await p.$('.stats'))&&!(await p.$('.kit'))&&!/I SPEAK/i.test(m)&&!/drafts kept/i.test(m));
 want(nm+': across projects and your copy are folded', !(await p.$eval('#fAcross',e=>e.open))&&!(await p.$eval('#fCopy',e=>e.open))&&!(await p.isVisible('#exp')));
 const [fc]=await Promise.all([p.waitForEvent('filechooser',{timeout:4000}).catch(()=>null),p.click('#drop .btn.pri')]);
 want(nm+': PICK FILES opens the file picker', !!fc);
 for(const t of [D1,D2]){ await p.click('#tabs [data-tab="add"]'); await p.fill('#paste',t); await p.click('#readit'); await p.waitForTimeout(500); }
 await p.click('#tabs [data-tab="projects"]'); await p.waitForTimeout(300);
 m=await p.innerText('#main');
 want(nm+': a project card says what changed since the draft before', /Salt Road/.test(m)&&/Draft 2 is current/.test(m)&&/Since Draft 1: 1 scene rewritten, 1 new, 1 cut\./.test(m), m.slice(0,400));
 await p.screenshot({path:SHOTS+'/pt_front_'+nm+'.png'});
 await p.click('[data-open]'); await p.waitForTimeout(300);
 m=await p.innerText('#main');
 want(nm+': scene cards: plain dots, no red "Missing"', (await p.$$('.frame .dots')).length===3&&!/Missing/i.test(m)&&(await p.$$('.frame .dots .y')).length>=6);
 want(nm+': tags: REWRITTEN, NEW, and the cut scene', (await p.$$eval('.chg',x=>x.map(e=>e.textContent))).sort().join()==='NEW,REWRITTEN'&&/CUT IN DRAFT 2/.test(m)&&/GAS STATION/.test(m));
 await p.screenshot({path:SHOTS+'/pt_scenes_'+nm+'.png'});
 await p.click('[data-scene="0"]'); await p.waitForTimeout(300);
 want(nm+': a scene leads with the scene and what changed', await p.isVisible('.scenetx')&&/The door was wide open/.test(await p.innerText('.scenetx'))&&(await p.$$('.scenetx .rl.cut')).length===1);
 want(nm+': and what it\'s for, in your words', await p.isVisible('[data-card="purpose"]'));
 const folds=await p.$$eval('details.fold[data-f]',x=>x.map(e=>e.dataset.f+(e.open?':open':'')));
 want(nm+': the rest folded', folds.length>=8&&folds.every(f=>!/open/.test(f))&&!(await p.isVisible('#dec')), folds);
 await p.click('[data-f="cast"] summary'); await p.waitForTimeout(100);
 p.once('dialog',d=>d.accept('menu'));
 await p.click('[data-addto="props"]'); await p.waitForTimeout(300);
 want(nm+': a fold you opened stays open when the page redraws', await p.$eval('[data-f="cast"]',e=>e.open)&&/menu/.test(await p.innerText('[data-f="cast"]')));
 await p.screenshot({path:SHOTS+'/pt_scene_'+nm+'.png',fullPage:true});
 await p.click('#tabs [data-grp="work"]'); await p.waitForTimeout(200);
 if(!(await p.$('#tabs [data-tab="bones"].on'))) await p.click('#tabs [data-tab="bones"]');
 await p.waitForTimeout(200);
 want(nm+': mic and photo live in THE WORK', (await p.$$('.kit .kt')).length===3);
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
