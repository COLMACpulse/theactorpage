/* PROJECT HUB, the front: what's due and your page. Paste a request, READ IT, add it; it's due with the days left,
   TAPE IT opens it, SENT moves it to what you've sent. Your page: what's on it, one tap each, SEE IT in a new tab.
   Your material shows only what you have, masters are in Reel Room, and Masters and clips goes back to Reel Room.
   Computer (light) and phone (dark). Made-up names only. Server on :8811.  NODE_PATH=... node hub/tests/front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const errs=[];
const day=new Date(Date.now()+3*864e5), MON=['January','February','March','April','May','June','July','August','September','October','November','December'], WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const REQ=`Eco Cast Invitation Details
Eco Cast Title	DRY GULCH #102 Self Tapes
Breakdown Title	DRY GULCH #102 "SALT"
Casting Director: Wren Ashby
Role Name	DEPUTY HALE
Role Description	A small-town deputy, 40s.
Audition Instructions
DIRECTIONS:
- Include Full-Body Slate with Name, Height, and Current Location
- Two takes of scene 1
Audition Deadline	${WD[day.getDay()]} ${MON[day.getMonth()]} ${day.getDate()}, ${day.getFullYear()} @ 5:00 PM (PDT)`;
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/hub/index.html'); await p.waitForTimeout(1200);
await p.evaluate(async()=>{ if(isDemo()) await dropDemoData(); projects=projects.filter(x=>!/^(req:|T\d)/.test(x.aaid||'')); saveProjects();
 projects.push(newProject({aaid:'T9',project:'LOW TIDE',title:'LOW TIDE',role:'DOCK COP',casting:'Dana Pell Casting',kind:'audition',status:'Submitted',date:'2026-03-01'})); saveProjects();
 profile.name='Riley Hart'; profile.union='SAG-AFTRA'; profile.rep='Made Up Talent'; profile.email='riley@example.com'; saveProfile();
 const cv=document.createElement('canvas'); cv.width=80; cv.height=100; cv.getContext('2d').fillRect(0,0,80,100); const bl=await new Promise(r=>cv.toBlob(r,'image/jpeg'));
 const rec={id:'hsF',scope:'library',category:'headshot',type:'image/jpeg',blob:bl,filename:'made_up_head.jpg',label:'head',added:Date.now()}; await DB.put(rec); ARTS=ARTS.filter(a=>a.id!=='hsF').concat([rec]); profile.primaryHeadshot='hsF'; saveProfile();
 if(!credits.some(x=>x.cid==='cF')){ credits.push({cid:'cF',title:'Harbor Lights',role:'Guest star',character:'Deckhand',kind:'credit',medium:'TV'}); saveCredits(); }
 pkgSel.headshot=null; pkgSel.credits=null; go('home'); });
await p.waitForTimeout(500);
let v=await p.innerText('#view');
want('the front: no tab bar, the header says what it is', !(await p.$('#nav button:not(.back)'))&&/What.s due, and your page/.test(await p.innerText('header')));
want('the front: an audition came in, due, your page, the rows', /An audition came in/i.test(v)&&/Due/i.test(v)&&/Your page/i.test(v)&&/Offices to go in for/i.test(v)&&/Your material/i.test(v)&&/For my reps/i.test(v)&&/Credits and key art/i.test(v)&&/Setup and backup/i.test(v), v.slice(0,500));
want('nothing due yet: says so; what you\'ve sent: 1', /Nothing due/.test(v)&&/What you.ve sent[^\d]{0,60}1/i.test(v));
want('your page: your name, what\'s on it', /Riley Hart/.test(v)&&/headshot · 1 credit/.test(v), v);
await p.fill('#reqtext',REQ); await p.click('#reqbox button:has-text("READ IT")'); await p.waitForTimeout(300);
const pre=await p.innerText('#reqout');
want('READ IT: who, the role, and the due time', /Tape due/i.test(pre)&&/5:00 PM PDT/.test(pre), pre.slice(0,300));
await p.click('#reqout button:has-text("Add")'); await p.waitForTimeout(400);
v=await p.innerText('#view');
want('added: it\'s due, with the office, their time and yours, and the days left', /DRY GULCH/.test(v)&&/DEPUTY HALE/.test(v)&&/Wren Ashby/.test(v)&&/\d days?/.test(await p.innerText('#duelist')), await p.innerText('#duelist').catch(()=>v.slice(0,400)));
want('no risk words or scores on the front', !/\b(HIGH|MEDIUM|LOW) risk|\brisk\b|score/i.test(v));
await p.screenshot({path:SHOTS+'/hub_desk_front.png'});
await p.click('#duelist button:has-text("TAPE IT")'); await p.waitForTimeout(400);
want('TAPE IT: opens that audition', await p.evaluate(()=>tab==='road'&&!!openId&&/DRY GULCH/.test(projects.find(x=>x.id===openId).title)));
await p.evaluate(()=>go('home')); await p.waitForTimeout(200);
await p.click('#duelist button:has-text("SENT")'); await p.waitForTimeout(300);
v=await p.innerText('#view');
want('SENT: off the due list, into what you\'ve sent', /Nothing due/.test(v)&&/What you.ve sent[^\d]{0,60}2/i.test(v));
// your page
await p.click('button.ppc'); await p.waitForTimeout(600);
let on=await p.innerText('#onit');
want('your page: what\'s on it, each from its tool', /Your headshot[\s\S]*from HEADSHOTS/.test(on)&&/Credits 1 of 1/.test(on)&&/How to reach you/.test(on), on);
want('the details are folded away', !(await p.evaluate(()=>document.getElementById('pkgdetails').open)));
await p.click('#onit .onrow:has-text("Your headshot") .tick'); await p.waitForTimeout(300);
want('tap: the headshot is left off', await p.evaluate(()=>pkgSel.headOff===true)&&/left off/.test(await p.getAttribute('#onit .onrow:has-text("Your headshot") .tick','aria-label')));
await p.click('#onit .onrow:has-text("Your headshot") .tick'); await p.waitForTimeout(300);
want('tap again: back on', await p.evaluate(()=>!pkgSel.headOff&&pkgSel.headshot==='hsF'));
await p.click('#onit .onrow:has-text("Credits") button.lnk'); await p.waitForTimeout(400);
want('change: opens the details at that piece', await p.evaluate(()=>document.getElementById('pkgdetails').open));
const [pop]=await Promise.all([c.waitForEvent('page'),p.click('#seeit')]); await pop.waitForLoadState().catch(()=>{}); await p.waitForTimeout(1500);
const html=await pop.content().catch(()=>'');
want('SEE IT: your page in a new tab, your name and the credit on it', /Riley Hart/.test(html)&&/Harbor Lights/.test(html), html.slice(0,200));
await pop.close();
want('put it online: not switched on yet, no Publish button, the file instead', /isn.t switched on yet/.test(await p.innerText('#online'))&&!(await p.$('#onpub')));
await p.screenshot({path:SHOTS+'/hub_desk_page.png'});
// your material: only what you have; masters in Reel Room
await p.evaluate(()=>go('profile')); await p.waitForTimeout(500);
v=await p.innerText('#view');
want('your material: empty kinds are one line of ADD buttons, masters point to Reel Room', /Add another kind/i.test(v)&&/\+ About Me/.test(v)&&/are in Reel Room/.test(v)&&!/No headshots yet. Add a couple|Add Master Reel/.test(v), v.slice(v.search(/Your material/i),v.search(/Your material/i)+400));
// masters and clips: back goes to Reel Room
await p.evaluate(()=>go('reels')); await p.waitForTimeout(300);
want('masters and clips: the way back is Reel Room', /REEL ROOM/.test(await p.innerText('#nav'))&&/Masters and clips/i.test(await p.innerText('#nav')));
await p.goto('http://localhost:8811/archbook/'); await p.waitForTimeout(900);
want('Reel Room has MASTERS AND CLIPS', (await p.getAttribute('#tomasters','href'))==='../hub/?tab=reels');
// phone, dark
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.goto('http://localhost:8811/hub/index.html'); await q.waitForTimeout(1200);
want('phone: dark, nothing off the side', await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(18, 17, 16)'&&await q.evaluate(()=>document.documentElement.scrollWidth<=391));
await q.screenshot({path:SHOTS+'/hub_phone_front.png',fullPage:true});
await q.evaluate(()=>go('package')); await q.waitForTimeout(600);
want('phone: your page, nothing off the side', await q.evaluate(()=>document.documentElement.scrollWidth<=391), await q.evaluate(()=>document.documentElement.scrollWidth));
const all=await p.innerText('body')+await q.innerText('body');
want('no em dashes on the new parts', !/—/.test(await q.innerText('#pagetop')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
