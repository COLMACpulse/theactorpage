/* PICTURE IT, the look: the house header, the wall in a frame, kind-colored posters when there's no picture,
   the trail as three steps, the edit fields folded. Computer (light) and phone (dark). Made-up names only.
   Server on :8811.  NODE_PATH=... node picture/tests/front_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[], A=fs.readFileSync(__dirname+'/poster_a.jpg').toString('base64');
async function seed(p){ await p.evaluate(async A=>{ localStorage.removeItem('theactorpage_viz_v1');
  const f=s=>new File([Uint8Array.from(atob(s),c=>c.charCodeAt(0))],'p.jpg',{type:'image/jpeg'});
  const a=Viz.add({title:'Harbor Lights',kind:'show'}); await Viz.setPic(a.id,f(A));
  Viz.add({title:'Dana Wolfe',kind:'person'}); Viz.add({title:'Union card',kind:'milestone'});
  const d=Viz.add({title:'Low Tide',kind:'show'}); Viz.mark(d.id,'room'); Viz.mark(d.id,'booked'); },A); }
for(const [nm,vp,cs] of [['desk',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
  const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
  await p.goto('http://localhost:8811/picture/'); await p.waitForTimeout(500); await seed(p);
  await p.goto('http://localhost:8811/picture/'); await p.waitForTimeout(800);
  const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
  want(nm+': the theme', bg===(cs==='dark'?'rgb(18, 17, 16)':'rgb(236, 231, 220)'), bg);
  want(nm+': the house header, the sticks', /YOU · PICTURE IT/i.test(await p.innerText('header'))&&/What you want, where you see it/.test(await p.innerText('header h1'))&&!!(await p.$('.hstk'))&&!!(await p.$('img.bsig')));
  want(nm+': the two tabs kept', /THE WALL/.test(await p.innerText('.tabsrow'))&&/SHAMELESS PLUG/.test(await p.innerText('.tabsrow')));
  want(nm+': the wall in its frame, with counts', (await p.$$('.wallbox')).length===2&&/WANT IT\s*3/.test(await p.innerText('#view'))&&/GOT IT\s*1/.test(await p.innerText('#view')));
  want(nm+': no picture: its name and its kind, colored by kind', await p.$eval('.poster[data-kind=person] .type',e=>/DANA WOLFE/.test(e.innerText)&&/PERSON/.test(e.innerText)&&getComputedStyle(e).backgroundColor!==getComputedStyle(document.querySelector('.poster[data-kind=milestone] .type')).backgroundColor));
  want(nm+': under each poster: the name, the kind, the step and the date', /Harbor Lights\s*A SHOW · WANT IT [A-Z][a-z]{2} \d+, 20\d\d/i.test(await p.innerText('.wish:first-child')));
  want(nm+': booked: stamped and ringed', !!(await p.$('.wish.got .stamp'))&&/BOOKED/.test(await p.innerText('.wish.got')));
  const tops=await p.evaluate(()=>[...document.querySelectorAll('.wallbox')[0].querySelectorAll('.poster')].map(e=>Math.round(e.getBoundingClientRect().top)));
  want(nm+': the posters line up', nm==='phone'?tops[0]===tops[1]:new Set(tops).size===1, tops);
  want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:SHOTS+'/picture_'+nm+'_wall.png',fullPage:true});
  await p.click('.wish'); await p.waitForTimeout(500);
  want(nm+': one: back to the wall, the title big, the trail as steps', /THE WALL/.test(await p.innerText('.backbar'))&&/Harbor Lights/.test(await p.innerText('.wtitle'))&&(await p.$$('.trail li')).length===3&&(await p.$$('.trail li.on')).length===1);
  want(nm+': the name, kind and why are folded', !(await p.evaluate(()=>document.getElementById('editfold').open))&&!(await p.isVisible('#o_t')));
  await p.click('#editfold summary'); await p.fill('#o_n','A made-up reason.'); await p.click('#o_save'); await p.waitForTimeout(300);
  want(nm+': why, in your words, shows under the title', /A made-up reason\./.test(await p.innerText('.one')));
  await p.click('[data-today="room"]'); await p.waitForTimeout(300);
  want(nm+': tap TODAY: that step lights', (await p.$$('.trail li.on')).length===2);
  want(nm+': nothing off the side, one', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:SHOTS+'/picture_'+nm+'_one.png',fullPage:true});
  await p.goto('http://localhost:8811/picture/?lock'); await p.waitForTimeout(400); await p.click('#l_go'); await p.waitForTimeout(1500);
  if(nm==='phone') await p.screenshot({path:SHOTS+'/picture_phone_lock.png',fullPage:true});
  const t=await p.innerText('body');
  want(nm+': no em dashes, no arrows', !/—|←/.test(t));
  await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
