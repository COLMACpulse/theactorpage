/* Actor OS: POCKET RUN. Made-up sides, made-up reader recordings (a tone, no voice). The booth offers it once a line is
   in; the loop is one sound file in an audio player (what keeps going with the screen locked); the lock screen shows the
   line you're on; earbud buttons go back and forward a line and pause; hear-my-reading needs your own read; stop clears
   the lock screen. No computer voice: nothing calls speechSynthesis. Server on :8811.  NODE_PATH=... node actor-os/tests/pocket_e2e.js */
const {chromium}=require('playwright');
const SIDES='INT. DINER - NIGHT\n\nWREN ASHBY\nWe close at ten.\n\nHAL BRODY\nThen I have twenty minutes, and I am going to use every one of them.\n\nWREN ASHBY\nYou have five.\n\nHAL BRODY\nFive is plenty.\n';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} window.__acts={}; window.__tts=0;
 try{ if(window.speechSynthesis){ const s=window.speechSynthesis.speak.bind(window.speechSynthesis); window.speechSynthesis.speak=u=>{ window.__tts++; }; } }catch(e){}
 if(navigator.mediaSession){ const s=navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler=(a,f)=>{ window.__acts[a]=f; try{ s(a,f); }catch(e){} }; } });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ localStorage.removeItem('actor_os_pocket'); indexedDB.deleteDatabase('actor_os_reader'); }); await p.reload(); await p.waitForTimeout(1200);
await p.evaluate(t=>{ loadSides(t,'Dry Creek diner.txt'); pickMe('WREN ASHBY'); boothReady(); },SIDES); await p.waitForTimeout(600);
want('no reader line yet: no POCKET RUN', !(await p.$('#pocketBox')));
// a friend's memo for HAL's first line only (a made-up tone, 1.5 s)
await p.evaluate(async()=>{ const tone=s=>{ const sr=48000,a=new Float32Array(Math.round(s*sr)); for(let i=0;i<a.length;i++) a[i]=0.05*Math.sin(i/9); return new Blob([OneRead.wav(a,sr)],{type:'audio/wav'}); };
 const hal=activeScript().filter(b=>!b.mine); await ActorReader.putTakeFor(boothKey(hal[0]),tone(1.5),{dur:1.5,from:'file',name:'memo 1'}); await boothRefresh(); });
await p.waitForTimeout(400);
const pb=await p.innerText('#pocketBox');
want('one line in: the booth offers POCKET RUN, and says it works with the screen locked and with earbuds', /POCKET RUN/.test(pb)&&/screen locked/.test(pb)&&/Earbud buttons work/.test(pb), pb);
await p.click('#pkOpen'); await p.waitForTimeout(500);
let sh=await p.innerText('#pocketSheet');
want('the sheet: your lines as a silence, your time, how many times, the words', /A SILENCE TO SAY THEM/.test(sh)&&/AS WRITTEN/.test(sh)&&/UNTIL I STOP/.test(sh)&&/HIDDEN, TEST ME/.test(sh), sh.slice(0,400));
want('it says what\'s in it, plainly, with the line not recorded yet', /1 reader line, 2 silences for your lines, 1 reader line not recorded yet, left as a silence\./.test(sh), sh);
want('hear-my-reading is off until you read the whole scene once, and it says how', await p.$eval('[data-pk="mine"][data-v="heard"]',e=>e.disabled)&&/READ IT ALL in ONE READ/.test(sh));
want('no computer voice, said', /No computer voice/.test(sh));
await p.click('[data-pk="rep"][data-v="3"]'); await p.waitForTimeout(200);
await p.click('#pkGo'); await p.waitForFunction(()=>{ const a=document.getElementById('pocketAudio'); return a&&!a.paused&&a.currentTime>0.2; },null,{timeout:10000});
const info=await p.evaluate(()=>{ const a=PocketUI.audio(), T=PocketUI.track(); return {dur:a.duration,loop:a.loop,pass:T.pass,marks:T.marks.length,src:/^blob:/.test(a.src)}; });
want('playing: one sound file, three times through, in the audio player', info.src&&!info.loop&&Math.abs(info.dur-3*info.pass)<0.1&&info.marks===12, info);
let ln=await p.innerText('#pkLine');
want('on screen: the scene opens on your line, a silence for you, with the words', /YOUR LINE/.test(ln)&&/We close at ten\./.test(ln), ln);
want('the lock screen shows the line, and the earbud buttons are hooked up', await p.evaluate(()=>!!navigator.mediaSession.metadata&&/Pocket run/.test(navigator.mediaSession.metadata.artist)&&['play','pause','nexttrack','previoustrack','stop'].every(a=>typeof window.__acts[a]==='function')));
// next line (earbud): the playhead jumps to the next line, the screen and lock screen follow
await p.evaluate(()=>window.__acts.nexttrack()); await p.waitForTimeout(400);
let at=await p.evaluate(()=>{ const T=PocketUI.track(), t=PocketUI.audio().currentTime; return PocketRun.at(T.marks,t); });
ln=await p.innerText('#pkLine');
want('next line (earbud): HAL\'s line, your friend\'s memo, on screen and on the lock screen', at&&at.kind==='reader'&&/HAL BRODY/.test(ln)&&/twenty minutes/.test(ln)&&await p.evaluate(()=>/^HAL BRODY: Then I have/.test(navigator.mediaSession.metadata.title)), [at,ln]);
await p.evaluate(()=>window.__acts.nexttrack()); await p.waitForTimeout(400);
at=await p.evaluate(()=>{ const T=PocketUI.track(), t=PocketUI.audio().currentTime; return PocketRun.at(T.marks,t); });
want('next again: your line, and the lock screen says YOUR LINE', at&&at.kind==='yours'&&at.i===2&&await p.evaluate(()=>/^YOUR LINE: You have five\./.test(navigator.mediaSession.metadata.title)), at);
await p.evaluate(()=>window.__acts.pause()); await p.waitForTimeout(300);
want('pause from the earbud: paused, and it says so', await p.evaluate(()=>PocketUI.audio().paused)&&/paused/.test(await p.innerText('#pkPass'))&&(await p.innerText('#pkToggle'))==='PLAY');
await p.evaluate(()=>window.__acts.previoustrack()); await p.waitForTimeout(300);
at=await p.evaluate(()=>{ const T=PocketUI.track(); return PocketRun.at(T.marks,PocketUI.audio().currentTime); });
want('back a line', at&&at.i===1, at);
// words hidden: your line shows as a pause, not the words
await p.click('#pkStop'); await p.waitForTimeout(300);
want('stop: the audio stops, the lock screen is cleared, the earbud buttons let go', await p.evaluate(()=>{ const a=PocketUI.audio(); return a.paused&&!PocketUI.track()&&navigator.mediaSession.metadata===null; })&&!/PAUSE/.test(await p.innerText('#pocketSheet')));
await p.click('[data-pk="words"][data-v="0"]'); await p.click('[data-pk="rep"][data-v="0"]'); await p.waitForTimeout(200);
await p.click('#pkGo'); await p.waitForFunction(()=>{ const a=document.getElementById('pocketAudio'); return a&&!a.paused; },null,{timeout:10000});
want('until I stop: it loops', await p.evaluate(()=>PocketUI.audio().loop));
await p.waitForTimeout(300); ln=await p.innerText('#pkLine');
want('words hidden: your line on screen is a pause, not the words', /YOUR LINE/.test(ln)&&!/close at ten/.test(ln)&&await p.evaluate(()=>!/close at ten/.test(navigator.mediaSession.metadata.title)), ln);
await p.click('#pkStop'); await p.waitForTimeout(200);
// your own reading (as ONE READ READ IT ALL keeps it): hear-my-reading opens
await p.evaluate(async()=>{ const tone=s=>{ const sr=48000,a=new Float32Array(Math.round(s*sr)); for(let i=0;i<a.length;i++) a[i]=0.05*Math.sin(i/5); return new Blob([OneRead.wav(a,sr)],{type:'audio/wav'}); };
 const me=activeScript().filter(b=>b.mine); for(const x of me) await ActorReader.putTakeFor('mine:'+boothKey(x),tone(1),{dur:1,from:'oneread',mine:true}); });
await p.click('[data-pa="close"]'); await p.click('#pkOpen'); await p.waitForTimeout(400);
want('with your own reading in: HEAR MY READING is on offer', !(await p.$eval('[data-pk="mine"][data-v="heard"]',e=>e.disabled)));
await p.click('[data-pk="mine"][data-v="heard"]'); await p.waitForTimeout(200);
want('and it says your lines play in your voice', /2 of your lines, in your voice/.test(await p.innerText('#pkWhat')), await p.innerText('#pkWhat'));
want('your own lines never show up as reader lines in the booth', !/memo|One read/.test((await p.innerText('#boothList')).split('HOW EACH VOICE')[1]||'')||(await p.evaluate(()=>activeScript().filter(b=>!b.mine).length))===2);
want('no computer voice used, ever', await p.evaluate(()=>window.__tts===0));
want('no em dashes', !/—/.test(await p.innerText('#pocketSheet')+pb));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
