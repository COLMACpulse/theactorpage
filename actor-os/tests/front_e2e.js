/* ACTOR OS, the phone app (Col, Oct 26): four steps, READ LEARN SHOOT SEND. The front: nothing due leads with PASTE
   THE EMAIL; an audition open shows the role, the show, who's casting, when it's due, what they asked for, and the next
   step. READ and LEARN are Breakdown and Memorizer inside Actor OS, on the same sides. Made-up email, show and names.
   Phone dark, computer light. Server on :8811.  NODE_PATH=... node actor-os/tests/front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const EMAIL=`Hi Sam,\n\nYou have a self-tape for SALT ROAD. Role: DANA PELL. Casting: Tara Vance.\nTape due Tuesday, November 3rd at 10am PST.\nPlease slate with your name and height, then both scenes. One file, MP4, under 3 minutes.\n\nINT. FERRY OFFICE - NIGHT\n\nLEO\nYou're still here.\n\nDANA PELL\nSomebody has to be.\n\nLEO\nShe always stays late. Never says why.\n\nDANA PELL\nAre you asking me something?\n`;
for(const [nm,vp,cs] of [['phone',{width:390,height:844},'dark'],['desk',{width:1280,height:860},'light']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('actor_os_reader'); }); await p.reload(); await p.waitForTimeout(1300);
 want(nm+': four steps, READ LEARN SHOOT SEND, nothing else', (await p.$$eval('nav button',x=>x.map(b=>b.dataset.tab))).join()==='read,learn,shoot,send');
 let m=await p.innerText('#aosHome');
 want(nm+': nothing due: bring it in, PASTE THE EMAIL first', /NO AUDITION OPEN/.test(m)&&/Got an audition\? Bring it in\./.test(m)&&(await p.$eval('#aosHome .fgo',e=>e.textContent))==='PASTE THE EMAIL', m.slice(0,200));
 want(nm+': the details stay folded until you ask', !(await p.isVisible('#prep')));
 want(nm+': your pocket: VO Booth, Read In, Spotted, a note', (await p.$$eval('#aosHome .fpk a',x=>x.map(a=>a.getAttribute('href')))).join()==='../booth/,../read/,../spotted/,../notes/');
 await p.screenshot({path:SHOTS+'/aos_front_'+nm+'.png',fullPage:true});
 await p.click('#fPaste'); await p.fill('#fPasteText',EMAIL); await p.click('#fRead'); await p.waitForTimeout(900);
 m=await p.innerText('#aosHome');
 want(nm+': the email read: the role, the show, who is casting, when it is due', /DANA PELL/.test(m)&&/SALT ROAD · Tara Vance Casting/.test(m)&&/DUE TUE, NOV 3/.test(m), m.slice(0,300));
 want(nm+': what they asked for, from their own words', /THEY ASKED FOR[\s\S]*One file/i.test(m));
 want(nm+': the sides from the email, you picked by the role they named, the email itself left out', await p.evaluate(()=>SIDES.me==='DANA PELL'&&!SIDES.beats.some(x=>/self-tape/i.test(JSON.stringify(x)))));
 want(nm+': read is done, the next step is LEARN IT', /✓\s+Read your role/.test(m)&&(await p.$eval('#aosHome .fgo',e=>e.textContent))==='LEARN IT');
 await p.screenshot({path:SHOTS+'/aos_due_'+nm+'.png',fullPage:true});
 await p.click('#fDet'); await p.waitForTimeout(200);
 want(nm+': THE DETAILS opens your name, due, sides, reader and slate', await p.isVisible('#prep')&&await p.isVisible('#actorName'));
 await p.click('#fDet'); await p.waitForTimeout(200);
 await p.click('nav button[data-tab="read"]'); await p.waitForTimeout(2200);
 const rf=await p.$eval('#readStep iframe',f=>f.getAttribute('src'));
 want(nm+': READ is Breakdown on these sides, inside Actor OS', /^\.\.\/breakdown\/\?sides=[^&]+&embed=1$/.test(rf), rf);
 const fr=p.frames().find(f=>/breakdown/.test(f.url()));
 want(nm+': inside, its own header is gone and your role is open', !!fr&&await fr.evaluate(()=>{ const h=document.querySelector('header.top'); return document.documentElement.classList.contains('embed')&&(!h||getComputedStyle(h).display==='none'); })&&/DANA PELL/.test(await fr.innerText('body')));
 await p.click('nav button[data-tab="learn"]'); await p.waitForTimeout(2200);
 want(nm+': LEARN is Memorizer on the same sides', /^\.\.\/memorizer\/\?sides=[^&]+&embed=1$/.test(await p.$eval('#learnStep iframe',f=>f.getAttribute('src'))));
 await p.screenshot({path:SHOTS+'/aos_learn_'+nm+'.png'});
 await p.click('#fGotIt'); await p.waitForTimeout(400);
 want(nm+': I\'VE GOT IT goes to SHOOT, with the takes to keep under the camera', await p.evaluate(()=>CURTAB==='shoot'&&document.getElementById('shoot').classList.contains('on')&&document.getElementById('cut').classList.contains('on')&&!document.getElementById('prep').classList.contains('on')));
 await p.click('nav button[data-tab="send"]'); await p.waitForTimeout(300);
 want(nm+': SEND saves and sends', await p.evaluate(()=>document.getElementById('save').classList.contains('on')&&document.getElementById('send').classList.contains('on')));
 await p.evaluate(()=>goTab('cut')); await p.waitForTimeout(200);
 want(nm+': an old CUT link lands in SHOOT', await p.evaluate(()=>CURTAB==='shoot'));
 await p.click('#aosFrontBtn'); await p.waitForTimeout(400);
 m=await p.innerText('#aosHome');
 want(nm+': back on the front: learned, the next step is SHOOT IT', /✓\s+Learn it/.test(m)&&(await p.$eval('#aosHome .fgo',e=>e.textContent))==='SHOOT IT', m.slice(0,400));
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing" on the front', await p.evaluate(()=>{ const t=document.getElementById('aosHome').innerText; return !/[—]/.test(t)&&!/\bthings?\b/i.test(t); }));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
