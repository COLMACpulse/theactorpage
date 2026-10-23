/* ACTOR OS · LINK A SCREEN, round two: SIDES on the other screen (the line you're on lit up), READER PLAYS HERE
   (your recorded reader line plays from the other screen, the scene moves on when it ends), 2ND CAMERA (the other
   screen films its own angle from ROLL to CUT, it comes back to the phone, a copy stays there, KEEP saves it).
   Fake camera and mic, made-up sides (LOW TIDE). Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'..','..','film','tests','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+FX+'/two_tone.y4m','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:900,height:800},acceptDownloads:true}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('P '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('actor_os_reader'); indexedDB.deleteDatabase('actor_os_angles'); }); await p.reload(); await p.waitForTimeout(1000);
const sides=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.evaluate(t=>{ loadSides(t,'low_tide.fountain'); if(!SIDES.me) pickMe('ANNA'); boothReady(); ActorReader.setWantVideo(false); },sides); await p.waitForTimeout(600);
/* record the reader's first line, sound only */
const k=await p.evaluate(()=>{ const o=activeScript().find(b=>!b.mine); return boothKey(o); });
await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(1500); await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(900); await p.evaluate(()=>boothRefresh()); await p.waitForTimeout(300);
want('a reader line recorded', await p.evaluate(()=>{ const o=activeScript().find(b=>!b.mine); return !!partnerClip(o); }));
await p.evaluate(()=>startMode('PARTNER')); await p.waitForTimeout(1500);
await p.evaluate(()=>{ const r=SIDES.run||activeScript(); sIdx=r.findIndex(b=>b.mine); drawStage(); });
/* link */
await p.click('#sScreen'); await p.waitForTimeout(300);
want('LINK A SCREEN mentions sides, reader, second camera', /sides/.test(await p.innerText('#linkBox'))&&/reader/.test(await p.innerText('#linkBox'))&&/second camera/.test(await p.innerText('#linkBox')));
await p.click('[data-l="start"]'); await p.waitForFunction(()=>ScreenLink.stage==='code',null,{timeout:10000});
const url=await p.evaluate(()=>ScreenLink.url);
const m=await ctx.newPage(); const merrs=[]; m.on('pageerror',e=>merrs.push('M '+e.message)); m.on('dialog',d=>d.accept());
await m.goto(url); await m.waitForSelector('#qrbox svg.qr',{timeout:10000});
const ans=await m.evaluate(()=>window.__screen.answer);
await p.evaluate(()=>document.querySelector('#linkBox details').open=true); await p.fill('#lkpaste',ans); await p.click('[data-l="use"]');
await p.waitForFunction(()=>ScreenLink.stage==='live',null,{timeout:15000}).catch(()=>{});
want('linked', (await p.evaluate(()=>ScreenLink.stage))==='live');
await m.waitForSelector('.tabs',{timeout:8000});
want('the other screen: MONITOR, SIDES, 2ND CAMERA and the reader button; monitor first', /MONITOR/.test(await m.innerText('.tabs'))&&/SIDES/.test(await m.innerText('.tabs'))&&/2ND CAMERA/.test(await m.innerText('.tabs'))&&/PLAY THE READER HERE/.test(await m.innerText('.tabs'))&&!!(await m.$('#v')));
/* SIDES */
await m.click('[data-v="sides"]'); await m.waitForTimeout(800);
const sd=await m.evaluate(()=>({n:document.querySelectorAll('.ln').length,on:(document.querySelector('.ln.on')||{}).innerText||'',mine:document.querySelectorAll('.ln.mine').length}));
const cur=await p.evaluate(()=>{ const r=SIDES.run||activeScript(); return {n:r.length,text:r[sIdx].text}; });
want('SIDES: every line, yours marked, the line you\'re on lit up', sd.n===cur.n&&sd.mine>0&&sd.on.includes(cur.text.slice(0,20)), [sd,cur]);
await m.screenshot({path:require('os').tmpdir()+'/screen2_sides.png'});
want('the phone knows the other screen shows the sides', await p.evaluate(()=>ScreenLink.peer.view)==='sides');
await p.evaluate(()=>stageStep(1)); await m.waitForTimeout(700);
const cur2=await p.evaluate(()=>{ const r=SIDES.run||activeScript(); ActorReader.stopPlay(); return r[sIdx].text; });
want('step on the phone: the lit line follows', (await m.innerText('.ln.on')).includes(cur2.slice(0,20)));
/* READER PLAYS HERE */
await m.evaluate(()=>{ window.__played=0; const o=ActorReader.play; ActorReader.play=function(){ window.__played++; return o.apply(this,arguments); }; });
await m.click('#spk'); await m.waitForTimeout(600);
want('READER PLAYS HERE: the phone hands the reader over', await p.evaluate(()=>ScreenLink.peer.speaker===true)&&/READER PLAYS HERE/.test(await m.innerText('#spk')));
await m.waitForFunction(()=>window.__screen.clips.size>0,null,{timeout:8000}).catch(()=>{});
want('the reader line goes over before it is needed', await m.evaluate(()=>window.__screen.clips.size)>=1);
await p.evaluate(()=>{ window.__phonePlayed=0; window.__origPlay=ActorReader.play; ActorReader.play=function(){ window.__phonePlayed++; return window.__origPlay.apply(this,arguments); }; });
const before=await p.evaluate(()=>{ const r=SIDES.run||activeScript(); const i=r.findIndex(b=>!b.mine&&partnerClip(b)); sIdx=i; drawStage(); speakPartner(); return i; });
await m.waitForFunction(()=>window.__played>0,null,{timeout:6000}).catch(()=>{});
want('the reader line plays on the other screen, not on the phone', await m.evaluate(()=>window.__played)===1&&await p.evaluate(()=>window.__phonePlayed)===0, [await m.evaluate(()=>window.__played), await p.evaluate(()=>window.__phonePlayed)]);
await p.waitForFunction(i=>sIdx!==i,before,{timeout:8000}).catch(()=>{});
want('when it ends, the scene moves on, on the phone', await p.evaluate(i=>sIdx===i+1,before), [before, await p.evaluate(()=>sIdx)]);
await m.click('#spk'); await m.waitForTimeout(500);
want('turn it off: the reader plays from the phone again', await p.evaluate(()=>ScreenLink.peer.speaker===false));
/* 2ND CAMERA */
await m.click('[data-v="cam"]'); await m.waitForTimeout(400);
const ct=await m.innerText('#camv');
want('2ND CAMERA: says what it does, asks first, camera not on yet', /films its own angle/.test(ct)&&/asks for this camera first/.test(ct)&&!(await m.$('.camon')));
await m.click('#camgo'); await m.waitForSelector('.camon',{timeout:8000}).catch(()=>{});
want('camera on: the other screen shows it is on', /CAMERA \+ MIC ON/.test(await m.innerText('.camon'))&&await p.evaluate(()=>ScreenLink.peer.cam===true));
await m.click('#roll'); await p.waitForFunction(()=>sRecOn===true,null,{timeout:8000}).catch(()=>{});
await m.waitForFunction(()=>!!window.__screen.rec,null,{timeout:4000}).catch(()=>{});
want('ROLL: both roll', await p.evaluate(()=>sRecOn===true)&&await m.evaluate(()=>!!window.__screen.rec)&&/ROLLING HERE/.test(await m.innerText('#camv')));
await m.waitForTimeout(2200); await m.click('#roll');
await p.waitForSelector('#takeReview',{timeout:8000}).catch(()=>{});
await p.waitForSelector('#rvAngleSave',{timeout:20000}).catch(()=>{});
const tid=await p.evaluate(()=>state.takes.slice(-1)[0].id);
const sz=await p.evaluate(async id=>{ const a=await ScreenLink.angle(id); return a&&a.blob?a.blob.size:0; },tid);
const msz=await m.evaluate(()=>window.__screen.angles.map(a=>a.blob.size+':'+a.take));
want('CUT: the second angle comes back to the phone, with the take', sz>1000&&msz.length===1&&msz[0]===sz+':'+tid&&/SECOND ANGLE · take/.test(await p.innerText('#rvAngle')), [sz,msz]);
await m.screenshot({path:require('os').tmpdir()+'/screen2_cam.png'}); await p.screenshot({path:require('os').tmpdir()+'/screen2_phone.png'});
want('a copy stays on the other screen, with SAVE', /sent to the phone/.test(await m.innerText('#camv'))&&!!(await m.$('[data-save="0"]')));
const dls=[]; p.on('download',d=>dls.push(d.suggestedFilename()));
await p.evaluate(id=>reviewKeep(id),tid); await p.waitForTimeout(2500);
want('KEEP on the phone saves the second angle too', dls.some(n=>/second-angle/.test(n)), dls);
await m.click('#camoff'); await m.waitForTimeout(400);
want('turn the camera off there: it says so on the phone', await p.evaluate(()=>ScreenLink.peer.cam===false)&&!(await m.$('.camon')));
await p.evaluate(()=>exitStage()); await m.waitForFunction(()=>/Unlinked/.test(document.getElementById('app').innerText),null,{timeout:20000}).catch(()=>{});
want('unlinked: the angle kept on the other screen is still there to save', /Unlinked/.test(await m.innerText('#app'))&&!!(await m.$('[data-save="0"]')));
want('no page errors', errs.length===0&&merrs.length===0, errs.concat(merrs));
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
