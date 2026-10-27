/* NOTES front: what they told you. Made-up people. Server on :8811.
   Empty: one way in and how it works, no camera tiles. A room: who, then WHAT DID THEY SAY? first, KEEP IT; taping folded.
   The front after a few rooms: MORE THAN ONE OF THEM SAID IT, LATELY, THE PEOPLE YOU'VE MET.
   NODE_PATH=$(npm root -g) node notes/tests/front_e2e.js [shots-dir] */
const {chromium}=require('playwright'); const SHOTS=process.argv[2]||'';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const run=async(vw,vh,scheme,tag)=>{
 const c=await b.newContext({viewport:{width:vw,height:vh},colorScheme:scheme}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 const shot=async n=>{ if(SHOTS) await p.screenshot({path:SHOTS+'/nt_'+tag+'_'+n+'.png',fullPage:true}); };
 await p.goto('http://localhost:8811/notes/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
 want(tag+' empty: one way in, how it works, no camera tiles, nothing on', !!(await p.$('#newroom'))&&!!(await p.$('.how'))&&!(await p.$('.kit'))&&!(await p.$('nav.tabs'))&&await p.evaluate(()=>Hot.status().state)==='off');
 want(tag+' the header: What they told you; the icon does not move', /What they told you/.test(await p.innerText('header'))&&await p.evaluate(()=>[...document.querySelectorAll('.hico *')].every(e=>getComputedStyle(e).animationName==='none')));
 await shot('empty');
 const room=async(names,notes)=>{ await p.click('#newroom'); await p.waitForTimeout(150);
  for(let i=0;i<names.length;i++){ if(i) { await p.click('#addwho'); await p.waitForTimeout(100); } await p.fill('[data-wn="'+i+'"]',names[i][0]); await p.click('[data-wr="'+i+'|'+names[i][1]+'"]'); }
  await p.click('#start'); await p.waitForTimeout(200);
  for(const [who,t] of notes){ await p.fill('[data-text="new"]',t); await p.selectOption('[data-giver="new"]',who); await p.click('[data-save="new"]'); await p.waitForTimeout(120); } };
 await room([['Dana Pell','casting']],[['Dana Pell','Slow down at the top.'],['Dana Pell','Look at her, not the floor.']]);
 want(tag+' in the room: the names, then WHAT DID THEY SAY? first, taping folded', /Dana Pell/.test(await p.innerText('#title'))&&(await p.innerText('#main')).indexOf('WHAT DID THEY SAY?')<(await p.innerText('#main')).indexOf('TAPE IT')&&!(await p.$eval('#tapebox',d=>d.open)));
 want(tag+' KEEP IT: from this room, 2', /FROM THIS ROOM · 2/.test(await p.innerText('#main')));
 await shot('room');
 await p.click('#endses'); await p.waitForTimeout(200);
 await room([['Sam Ortiz','coach']],[['Sam Ortiz','You rush. Slow down.']]);
 await p.click('.backbar [data-t="home"]'); await p.waitForTimeout(200);
 want(tag+' leaving a room open: BACK TO THE ROOM', /BACK TO THE ROOM/.test(await p.innerText('#main')));
 await p.evaluate(()=>{ if(window.Contacts) Contacts.add({name:'Dana Pell',role:'casting'}); }); await p.reload(); await p.waitForTimeout(400);
 const m=await p.innerText('#main');
 want(tag+' MORE THAN ONE OF THEM SAID IT: "slow down", said by 2', /MORE THAN ONE OF THEM SAID IT/.test(m)&&/"slow down"/i.test(m)&&/said by 2/.test(m), m.slice(0,500));
 want(tag+' LATELY: the notes, with who said them', /LATELY/.test(m)&&/You rush\. Slow down\./.test(m)&&/Sam Ortiz/.test(m));
 want(tag+' THE PEOPLE YOU\'VE MET: both', /Dana Pell/.test(await p.innerText('.hr'))&&/Sam Ortiz/.test(await p.innerText('.hr')));
 want(tag+' no scores', !/\bscores?\b|%/i.test(m.replace(/scored/g,'')));
 await shot('front');
 await p.click('[data-t="people"]'); await p.waitForTimeout(200);
 want(tag+' EVERYONE: each person and what they told you', /Everyone/i.test(await p.innerText('#main')));
 await p.click('.backbar [data-t="home"]'); await p.click('[data-t="notes"]'); await p.waitForTimeout(200);
 want(tag+' ALL YOUR NOTES', (await p.$$('.note')).length===3);
 await p.click('.backbar [data-t="home"]'); await p.waitForTimeout(200);
 want(tag+' no sideways scroll', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
 want(tag+' no em dashes', !/—/.test(await p.innerText('body')));
 want(tag+' no page errors', !errs.length, errs);
 await c.close();
};
await run(390,844,'dark','phone'); await run(1280,900,'light','computer');
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
