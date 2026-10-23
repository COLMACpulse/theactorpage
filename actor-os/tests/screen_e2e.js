/* ACTOR OS · LINK A SCREEN: the other screen as monitor, controller and playback. Two pages, two codes; ROLL and
   CUT from the other screen, the take comes over and plays there, KEEP and ERASE from there; unlink when you leave.
   A made-up picture from the fake camera. Server on :8811.  NODE_PATH=... node actor-os/tests/screen_e2e.js */
const {chromium}=require('playwright'); const path=require('path');
(async()=>{ const FX=path.join(__dirname,'..','..','film','tests','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+FX+'/two_tone.y4m','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:900,height:800}}); await ctx.grantPermissions(['camera','microphone','clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('P '+e.message+' '+(e.stack||'').slice(0,300))); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
await p.evaluate(()=>startMode('READER')); await p.waitForTimeout(1500);
want('the stage has a SCREEN button', await p.isVisible('#sScreen'));
await p.click('#sScreen'); await p.waitForTimeout(400);
let t=await p.innerText('#linkBox');
want('LINK A SCREEN says what it does: monitor, controller, playback; same Wi-Fi, no server, the take stays here', /monitor/.test(t)&&/controller/.test(t)&&/playback/.test(t)&&/same Wi-Fi/.test(t)&&/Nothing goes through a server/.test(t)&&/stays on this phone/.test(t), t);
await p.click('[data-l="start"]'); await p.waitForFunction(()=>ScreenLink.stage==='code',null,{timeout:10000});
const url=await p.evaluate(()=>ScreenLink.url);
want('a code and a link for the other screen', !!(await p.$('#linkBox svg.qr'))&&/\/actor-os\/screen\.html#o=[A-Za-z0-9_-]+$/.test(url), url.slice(0,90));
const m=await ctx.newPage(); const merrs=[]; m.on('pageerror',e=>merrs.push('M '+e.message+' '+(e.stack||'').slice(0,300))); m.on('dialog',d=>d.accept());
await m.goto(url); await m.waitForSelector('#qrbox svg.qr',{timeout:10000});
want('the other screen: shows its code back, the handshake wiped from the address', /Now show this to the phone/.test(await m.innerText('#app'))&&!/#o=/.test(m.url()));
const ans=await m.evaluate(()=>window.__screen.answer);
await p.evaluate(()=>document.querySelector('#linkBox details').open=true); await p.fill('#lkpaste',ans); await p.click('[data-l="use"]');
await p.waitForFunction(()=>ScreenLink.stage==='live',null,{timeout:15000}).catch(()=>{});
want('linked: the phone says so, the SCREEN button lights', (await p.evaluate(()=>ScreenLink.stage))==='live'&&/● SCREEN/.test(await p.innerText('#sScreen'))&&/Linked\./.test(await p.innerText('#linkBox')));
await m.waitForFunction(()=>{ const v=document.getElementById('v'); return v&&v.videoWidth>0&&v.currentTime>0.3; },null,{timeout:15000}).catch(()=>{});
want('MONITOR: the phone\'s camera plays on the other screen, no sound', await m.evaluate(()=>{ const v=document.getElementById('v'); return v&&v.videoWidth===160&&!(v.srcObject&&v.srcObject.getAudioTracks().length); })&&/NO SOUND/.test(await m.innerText('#app')));
await p.click('[data-l="close"]');
/* controller */
await m.click('#roll'); await p.waitForFunction(()=>sRecOn===true,null,{timeout:8000}).catch(()=>{});
want('ROLL on the other screen: the phone counts in and records', await p.evaluate(()=>sRecOn===true));
await m.waitForFunction(()=>/RECORDING/.test(document.getElementById('st').textContent),null,{timeout:4000}).catch(()=>{});
want('the other screen shows RECORDING and the button turns to CUT', /RECORDING/.test(await m.innerText('#st'))&&/CUT/.test(await m.innerText('#roll')));
await m.waitForTimeout(2200); await m.click('#roll');
await p.waitForSelector('#takeReview',{timeout:8000}).catch(()=>{});
want('CUT: the phone stops and shows the take', await p.evaluate(()=>sRecOn===false&&!!document.getElementById('takeReview')));
/* playback */
await m.waitForSelector('#pv',{timeout:20000}).catch(()=>{});
await m.waitForFunction(()=>{ const v=document.getElementById('pv'); return v&&v.readyState>=1&&(v.duration>1||v.duration===Infinity); },null,{timeout:10000}).catch(()=>{});
const pv=await m.evaluate(()=>{ const v=document.getElementById('pv'); return v?{src:v.src.slice(0,5),d:v.duration}:null; });
want('PLAYBACK: the take comes over and plays on the other screen', pv&&pv.src==='blob:', pv);
want('the take size matches the phone\'s', await p.evaluate(()=>state.takes.slice(-1)[0].bytes)===await m.evaluate(()=>fetch(document.getElementById('pv').src).then(r=>r.blob()).then(b=>b.size)));
await m.waitForSelector('#pbbtns:not([hidden])',{timeout:4000}).catch(()=>{});
want('KEEP, GO AGAIN, ERASE on the other screen while the take waits', await m.isVisible('#keep')&&await m.isVisible('#again')&&await m.isVisible('#erase'));
await m.click('#keep'); await p.waitForFunction(()=>!document.getElementById('takeReview'),null,{timeout:5000}).catch(()=>{});
want('KEEP from there: the phone keeps it', await p.evaluate(()=>!document.getElementById('takeReview')&&state.takes.slice(-1)[0].status==='SURVIVOR'), await p.evaluate(()=>state.takes.map(x=>x.status)));
/* a second take: the space bar on the other screen, then ERASE */
await m.waitForTimeout(800); await m.keyboard.press(' '); await p.waitForFunction(()=>sRecOn===true,null,{timeout:8000}).catch(()=>{});
want('the space bar (or a clicker paired to the other screen) rolls too', await p.evaluate(()=>sRecOn===true));
await m.waitForTimeout(1600); await m.keyboard.press(' '); await p.waitForSelector('#takeReview',{timeout:8000}).catch(()=>{});
await m.waitForSelector('#erase:visible',{timeout:20000}).catch(()=>{});
const before=await p.evaluate(()=>state.takes.length);
await m.click('#erase'); await p.waitForFunction(()=>!document.getElementById('takeReview'),null,{timeout:5000}).catch(()=>{});
want('ERASE from there: the take is gone on the phone', await p.evaluate(()=>state.takes.length)===before-1, [before, await p.evaluate(()=>state.takes.length)]);
/* playback off */
await p.click('#sScreen'); await p.uncheck('#lksend'); await p.click('[data-l="close"]');
await m.click('#roll'); await p.waitForFunction(()=>sRecOn===true,null,{timeout:8000}).catch(()=>{}); await m.waitForTimeout(1400); await m.click('#roll'); await p.waitForSelector('#takeReview',{timeout:8000}).catch(()=>{}); await m.waitForTimeout(1500);
const lastId=await p.evaluate(()=>state.takes.slice(-1)[0].id);
want('playback off: the take stays on the phone only', (await m.evaluate(()=>window.__screen.take&&window.__screen.take.id))!==lastId&&(await m.evaluate(()=>!window.__screen.take.loading)));
await p.evaluate(()=>reviewAgain());
/* leaving */
await p.evaluate(()=>exitStage()); await m.waitForFunction(()=>/Unlinked/.test(document.getElementById('app').innerText),null,{timeout:20000}).catch(()=>{});
want('DONE on the phone: unlinked on both', (await p.evaluate(()=>ScreenLink.stage))===''&&/Unlinked/.test(await m.innerText('#app')));
want('no page errors', errs.length===0&&merrs.length===0, errs.concat(merrs));
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
