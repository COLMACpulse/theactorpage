/* VO BOOTH opened ready (Col, Oct 26: "it was blank... I'd like VO to be loaded, with a breathing wave that gets
   activated when the user clicks mic"). First open: a made-up spot is in, marked EXAMPLE; the wave breathes with the
   mic off; TURN ON THE MIC goes to READ and records the first line, and the bars go live; stop, and the take is kept.
   Your own copy takes the example's place and clears its takes. Reduced motion: the wave holds still.
   Fake mic. Made-up copy. Server on :8811.  NODE_PATH=... node booth/tests/example_e2e.js */
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['phone',{width:390,height:844},'dark'],['computer',{width:1280,height:900},'light']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); await c.grantPermissions(['microphone'],{origin:'http://localhost:8811'});
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/booth/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('booth_media'); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(600);
 const m=await p.innerText('#main');
 want(nm+': opened ready: the example spot is in, marked EXAMPLE', /EXAMPLE · A MADE-UP SPOT/.test(m)&&/HARBOR COFFEE/.test(m)&&/Up before the tide/.test(m)&&(await p.evaluate(()=>window.__booth.job().spots.length))===1, m.slice(0,200));
 want(nm+': the header says it is an example, not a job', (await p.innerText('#title'))==='Voice over'&&/example/.test(await p.innerText('#count')));
 const br=await p.evaluate(()=>{ const i=document.querySelector('.exfront .breath i'); return i?getComputedStyle(i).animationName:''; });
 want(nm+': the wave breathes while the mic is off', br==='breathe'&&(await p.$$('.exfront .breath i')).length>=40, br);
 want(nm+': nothing on at load', !(await p.$('#hotbar'))&&await p.evaluate(()=>!Hot.status().mic));
 want(nm+': it says it asks first and shows when on; no em dashes', /asks first/.test(m)&&!/—/.test(m));
 await p.click('#exmic'); await p.waitForTimeout(900);
 want(nm+': TURN ON THE MIC: to READ, recording the first line, the bar says so', await p.evaluate(()=>document.querySelector('#tabs [data-t="read"]').classList.contains('on'))&&await p.evaluate(()=>Hot.status().mic)&&/RECORDING/.test(await p.innerText('#hotbar').catch(()=>''))&&!!(await p.$('.line.rec canvas[data-live]')));
 if(nm==='computer') want(nm+': the big wave is live now (the breathing one is gone)', !!(await p.$('.bbig canvas[data-live]'))&&!(await p.$('.bbig .breath')));
 await p.waitForTimeout(1500); await p.click('.line.rec [data-rec]'); await p.waitForTimeout(1500);
 const k=await p.evaluate(()=>Object.keys(window.__booth.S.kept).length);
 want(nm+': stop: the take is kept on the example line', k===1, k);
 await p.click('#micoff').catch(()=>{}); await p.waitForTimeout(300);
 if(nm==='computer') want(nm+': mic off: the big wave breathes again', !!(await p.$('.bbig .breath'))&&!(await p.evaluate(()=>Hot.status().mic)));
 await p.click('#tabs [data-t="copy"]'); await p.waitForTimeout(300);
 await p.fill('#paste','SALT FLATS :15\nVO: The road goes on.\nVO: So do we.'); await p.click('#pastego'); await p.waitForTimeout(800);
 const S=await p.evaluate(()=>({sp:window.__booth.job().spots.map(s=>s.title),ex:window.__booth.S.example,t:Object.keys(window.__booth.S.takes).length}));
 want(nm+': your copy takes the example\'s place, its takes gone', S.sp.join()==='SALT FLATS'&&!S.ex&&S.t===0&&!(await p.$('.exfront')), S);
 await p.reload(); await p.waitForTimeout(500);
 want(nm+': and the example does not come back', !(await p.$('.exfront'))&&/SALT FLATS/.test(await p.innerText('#main')));
 want(nm+': no page errors', !errs.length, errs);
 await c.close(); }
const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}); const p=await c.newPage();
await p.goto('http://localhost:8811/booth/'); await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500);
want('reduced motion: the wave holds still', await p.evaluate(()=>getComputedStyle(document.querySelector('.exfront .breath i')).animationName)==='none');
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
