/* Home: your résumé in YOUR PROFILE. Add it there or drop it: it fills the profile and the file is kept to send.
   Made-up résumé (Sam Actor). Needs a server on :8811.  NODE_PATH=... node tests/home_resume_e2e.js */
const {chromium}=require('playwright'); const path=require('path');
(async()=>{ const FX=path.join(__dirname,'..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const c=await b.newContext({viewport:{width:1300,height:900}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_you'); }); await p.reload(); await p.waitForTimeout(700);
await p.click('#lens'); await p.waitForTimeout(300);
const t0=await p.innerText('#youpanel');
want('empty profile: "Have a résumé?" with ADD YOUR RÉSUMÉ, ADD A HEADSHOT, and VIRTUAL RÉSUMÉ for when you have none', /Have a résumé\?/.test(t0)&&/ADD YOUR RÉSUMÉ/.test(t0)&&/ADD A HEADSHOT/.test(t0)&&/VIRTUAL RÉSUMÉ/.test(t0), t0);
await p.setInputFiles('#yresfile',path.join(FX,'sam_actor_resume.pdf')); await p.waitForTimeout(2000);
const y=await p.evaluate(()=>{ const d=You.get(); return {name:d.name,credits:d.credits.length,resume:d.resume&&d.resume.name}; });
want('ADD YOUR RÉSUMÉ: it fills the profile', y.name&&y.credits>0, y);
want('and the file is kept', y.resume==='sam_actor_resume.pdf', y);
want('the blob is the real file', await p.evaluate(async()=>{ const b=await You.resumeBlob(); return !!(b&&b.size>1000); }));
const t1=await p.innerText('#youpanel');
want('the panel shows Your résumé with OPEN, REPLACE and remove; no Virtual Résumé nudge', /Your résumé/.test(t1)&&/sam_actor_resume\.pdf/.test(t1)&&/OPEN/.test(t1)&&/REPLACE/.test(t1)&&!/No résumé yet/.test(t1), t1);
const [pop]=await Promise.all([c.waitForEvent('page').catch(()=>null),p.click('#yresopen')]);
want('OPEN opens it', !!pop);
if(pop) await pop.close();
await p.click('#yresx'); await p.waitForTimeout(400);
want('remove: the file goes, what it filled in stays', await p.evaluate(()=>{ const d=You.get(); return !d.resume&&d.credits.length>0; }));
// dropped on the drop box: kept too
await p.setInputFiles('#dropfile',path.join(FX,'sam_actor_resume.pdf')); await p.waitForTimeout(2000);
want('dropped on the drop box: kept as your résumé too', await p.evaluate(()=>!!(You.get().resume&&You.get().resume.name==='sam_actor_resume.pdf')));
want('and the card says so', /The file is kept there too, to send\./.test(await p.innerText('#took')), await p.innerText('#took'));
// a headshot from the profile button
await p.setInputFiles('#yphfile',path.join(FX,'made_up_face.jpg')); await p.waitForTimeout(1500);
want('ADD A HEADSHOT: in your headshots and in the lens', await p.evaluate(()=>You.get().photos.length===1&&document.getElementById('lensimg').classList.contains('on')));
await p.reload(); await p.waitForTimeout(800);
want('after a reload the résumé is still there', await p.evaluate(()=>!!You.get().resume));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
