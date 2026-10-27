/* Actor OS · USE A REMOTE: a Bluetooth clicker starts and stops the take with the camera open.
   Simulated presses: the keys clickers send (space, enter, page up/down, arrows, volume, play/pause) and the
   phone's media buttons (play, pause, next) through the media session. Off until you turn it on; never while
   you type; nothing with the camera closed; a double press (clickers bounce) counts once; a press during
   the 3-count stops it. A real clicker on a real phone is still a hand check (the Phone Check list).
   Fake camera and mic. Server on :8811.  NODE_PATH=... node actor-os/tests/remote_e2e.js */
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['phone',{width:390,height:844},'dark'],['desk',{width:1280,height:820},'light']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,hasTouch:nm==='phone'}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
 await c.addInitScript(()=>{ window.__acts={}; if(navigator.mediaSession){ const s=navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler=(a,f)=>{ window.__acts[a]=f; try{ s(a,f); }catch(e){} }; } });
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{ errs.push('dialog: '+d.message()); d.accept(); });
 await p.goto('http://localhost:8811/actor-os/index.html');
 await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(1200);
 const st=()=>p.evaluate(()=>({on:sRecOn,count:!!sCount,mode:MODE,remote:REMOTE_ON}));
 const SENT=new Set(['AudioVolumeUp','AudioVolumeDown','MediaPlayPause']);  // keys Playwright can't type: sent the way a clicker's key arrives
 const press=async k=>{ if(SENT.has(k)) await p.evaluate(k=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true})),k); else await p.keyboard.press(k); await p.waitForTimeout(80); };
 const gap=()=>p.waitForTimeout(500);                         // past the 450 ms bounce guard
 const rolled=()=>p.waitForFunction(()=>sRecOn===true,null,{timeout:12000}).then(()=>true).catch(()=>false);
 const coach=()=>p.evaluate(()=>(document.getElementById('sCoach')||{}).textContent||'');
 const shut=()=>p.evaluate(()=>{ const r=document.getElementById('takeReview'); if(r) r.remove(); });

 /* off: the camera open, a clicker press does nothing */
 await p.evaluate(()=>startMode('READER')); await p.waitForFunction(()=>!!document.getElementById('stageVid').srcObject,null,{timeout:6000}).catch(()=>{});
 await press('Space'); await p.waitForTimeout(300);
 want(nm+': REMOTE off: a press does nothing', !(await st()).on&&!(await st()).count, await st());
 await p.evaluate(()=>exitStage()); await p.waitForTimeout(300);

 /* on */
 await p.evaluate(()=>remoteEnable()); await p.waitForTimeout(300);
 want(nm+': on: the button says REMOTE ON and what works', (await p.evaluate(()=>document.getElementById('remoteBtn').textContent))==='REMOTE ON'&&/Volume, shutter, play\/pause and space all work/.test(await p.evaluate(()=>document.getElementById('remoteState').textContent)));
 want(nm+': on: the media buttons are hooked up (play, pause, stop, next, previous)', await p.evaluate(()=>['play','pause','stop','nexttrack','previoustrack'].every(a=>typeof __acts[a]==='function')&&navigator.mediaSession.playbackState==='playing'));
 want(nm+': on: a muted loop keeps the media buttons coming to this page', await p.evaluate(()=>{ const a=[...document.querySelectorAll('audio')].concat(typeof remoteAudio!=='undefined'&&remoteAudio?[remoteAudio]:[]).find(x=>x&&x.loop&&x.muted); return !!a&&!a.paused; }));

 /* camera closed: nothing */
 await press('Space'); await p.waitForTimeout(300);
 want(nm+': camera closed: a press does nothing', !(await st()).on&&!(await st()).count, await st());

 /* camera open: volume up (the shutter remotes) starts the 3-count, then it rolls */
 await p.evaluate(()=>startMode('READER')); await p.waitForFunction(()=>!!document.getElementById('stageVid').srcObject,null,{timeout:6000}).catch(()=>{});
 await press('AudioVolumeUp');
 want(nm+': volume up: the 3-count starts', (await st()).count, await st());
 want(nm+': it says so on screen, plainly', /Rolling in 3 · from your remote/.test(await coach())&&!/—/.test(await coach()), await coach());
 want(nm+': then it rolls', await rolled());
 await p.evaluate(()=>{ for(let i=0;i<2;i++) document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'AudioVolumeUp',bubbles:true,cancelable:true})); }); await p.waitForTimeout(150);   // a bounce: two presses at once
 want(nm+': a double press counts once (the take stops, it does not start again)', !(await st()).on&&!(await st()).count, await st());
 await p.waitForTimeout(400); await shut(); await gap();

 /* every key a clicker sends: one press starts, one stops */
 const keys=['Space','Enter','PageDown','PageUp','ArrowDown','ArrowUp','AudioVolumeDown','MediaPlayPause'];
 const bad=[];
 for(const k of keys){
  await press(k); if(!(await rolled())){ bad.push(k+' did not start'); await gap(); continue; }
  await gap(); await press(k); await p.waitForTimeout(250);
  if((await st()).on) bad.push(k+' did not stop');
  await shut(); await gap();
 }
 want(nm+': space, enter, page down/up, arrows, volume down, play/pause: each starts and stops', bad.length===0, bad);

 /* the phone's media buttons (earbuds, a camera remote that shows up as one) */
 await p.evaluate(()=>__acts.play()); want(nm+': media play: rolls', await rolled());
 await gap(); await p.evaluate(()=>__acts.pause()); await p.waitForTimeout(250);
 want(nm+': media pause: stops', !(await st()).on, await st());
 await shut(); await gap();
 await p.evaluate(()=>__acts.nexttrack()); want(nm+': next track works too', await rolled());
 await gap(); await p.evaluate(()=>__acts.nexttrack()); await p.waitForTimeout(250); await shut(); await gap();

 /* a press during the 3-count stops it */
 await press('Space'); await p.waitForTimeout(200);
 const mid=await st(); await gap(); await press('Space'); await p.waitForTimeout(300);
 want(nm+': a press during the 3-count stops it, nothing rolls', mid.count&&!(await st()).on&&!(await st()).count, [mid,await st()]);
 await p.waitForTimeout(3500);
 want(nm+': and it stays stopped', !(await st()).on, await st());

 /* typing in a box is never a press */
 await p.evaluate(()=>{ const i=document.createElement('input'); i.id='__typer'; i.style.cssText='position:fixed;top:0;left:0;z-index:99999'; document.body.appendChild(i); i.focus(); });
 await p.keyboard.type('p p', {delay:120}); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
 want(nm+': typing in a box (space, p, enter) is never counted', !(await st()).on&&!(await st()).count&&(await p.$eval('#__typer',i=>i.value))==='p p', await st());
 await p.evaluate(()=>document.getElementById('__typer').remove());

 /* off again: nothing, and the media buttons let go */
 await p.evaluate(()=>remoteEnable()); await p.waitForTimeout(250);
 await press('Space'); await p.waitForTimeout(300);
 want(nm+': turned off: a press does nothing, the button says USE A REMOTE', !(await st()).on&&!(await st()).count&&(await p.evaluate(()=>document.getElementById('remoteBtn').textContent))==='USE A REMOTE', await st());
 want(nm+': turned off: the media buttons let go', await p.evaluate(()=>['play','pause','stop','nexttrack','previoustrack'].every(a=>__acts[a]===null)&&navigator.mediaSession.playbackState==='none'));
 want(nm+': no page errors, no alerts', errs.length===0, errs);
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
