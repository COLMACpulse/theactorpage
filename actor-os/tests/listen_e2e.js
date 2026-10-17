/* Actor OS: hearing when your line ends, on this phone. And a different voice for a character, same timing.
   Fake mic: actor-os/tests/talk_then_quiet.wav (1 s quiet, 1.5 s talking, 1.5 s quiet, looped). Made-up sides (LOW TIDE).
   Needs a local server on :8811 at the repo root.  NODE_PATH=... node actor-os/tests/listen_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{
const wav=path.join(__dirname,'talk_then_quiet.wav');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-audio-capture='+wav,'--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844}}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
// count every time the page builds a speech recogniser: it must not, unless you choose it
await ctx.addInitScript(()=>{ window.__recs=0; const R=function(){ window.__recs++; this.start=()=>{}; this.stop=()=>{}; }; window.SpeechRecognition=R; window.webkitSpeechRecognition=R; });
const p=await ctx.newPage(); const errs=[], dialogs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{ dialogs.push(d.message()); d.accept(); });
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ localStorage.removeItem('actor_os_words_ok'); indexedDB.deleteDatabase('actor_os_reader'); }); await p.reload(); await p.waitForTimeout(1200);
const sides=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.evaluate(t=>{ loadSides(t,'low_tide.fountain'); if(!SIDES.me) pickMe('ANNA'); boothReady(); },sides); await p.waitForTimeout(500);
// a reader line recorded (fake mic), with a lower voice set for MR. DELL
const k=await p.evaluate(()=>boothKey(activeScript().find(b=>!b.mine)));
await p.evaluate(()=>ActorReader.setWantVideo(false));
await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(2200); await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(800);
const sel=await p.$('select[aria-label="Pitch for MR. DELL"]');
want('each voice has a pitch choice, "As you read it" to start', !!sel&&await sel.evaluate(s=>s.options[s.selectedIndex].text)==='As you read it');
await sel.selectOption('-4'); await p.waitForTimeout(300);
want('the choice sticks with the sides', await p.evaluate(()=>pitchFor('MR. DELL'))===-4&&/"vp":\{"MR. DELL":-4\}/.test(await p.evaluate(()=>localStorage.getItem('actor_os_range_low_tide.fountain'))));
const dur=await p.evaluate(async k=>{ const a=await ActorReader.takesFor(k); const c=a[a.length-1]; const plain=await new Promise(r=>{ ActorReader.play(c.blob,null,{}).then(()=>{ setTimeout(()=>{ const q=ActorReader.playPos(); ActorReader.stopPlay(); r(q&&q.dur); },300); }); });
  const low=await new Promise(r=>{ ActorReader.play(c.blob,null,{pitch:-4}).then(()=>{ setTimeout(()=>{ const q=ActorReader.playPos(); ActorReader.stopPlay(); r(q&&q.dur); },300); }); }); return {plain,low}; },k);
want('lower voice: the line is the same length', dur.plain>1&&Math.abs(dur.plain-dur.low)<0.02, dur);
// Scene partner: listening is on, on this phone, no speech service
await p.evaluate(()=>startMode('PARTNER')); await p.waitForTimeout(1500);
want('Scene partner opens LISTENING, and builds no speech recogniser', await p.textContent('#listenBtn')==='LISTENING'&&await p.evaluate(()=>window.__recs)===0, [await p.textContent('#listenBtn'),await p.evaluate(()=>window.__recs)]);
const mine=await p.evaluate(()=>{ const r=SIDES.run||activeScript(); const i=r.findIndex(b=>b.mine); sIdx=i; drawStage(); return i; });
await p.waitForFunction(i=>sIdx>i,mine,{timeout:9000}).catch(()=>{});
want('you talk, you go quiet: the scene moves on to their line', await p.evaluate(i=>sIdx>i,mine), await p.evaluate(()=>sIdx));
// a line moves on only after you have talked; silence alone does nothing
await p.evaluate(()=>{ const r=SIDES.run||activeScript(); const i=r.findIndex((b,j)=>b.mine&&j>sIdx); if(i>=0){ sIdx=i; drawStage(); } window.__at=sIdx; });
const held=await p.evaluate(()=>new Promise(r=>{ const at=window.__at; setTimeout(()=>r(sIdx===at),600); }));
want('in the first beat of your line it waits', held);
// tap: MATCHING WORDS asks first, says where your voice goes
await p.click('#listenBtn'); await p.waitForTimeout(300);
want('tap LISTENING: it asks before matching words, and says Google and Apple', dialogs.length===1&&/Google/.test(dialogs[0])&&/Apple/.test(dialogs[0]), dialogs);
want('then MATCHING WORDS, and only now a recogniser', await p.textContent('#listenBtn')==='MATCHING WORDS'&&await p.evaluate(()=>window.__recs)===1);
await p.click('#listenBtn'); await p.waitForTimeout(200);
want('tap again: off', await p.textContent('#listenBtn')==='LISTEN FOR MY CUE');
await p.click('#listenBtn'); await p.waitForTimeout(200); await p.click('#listenBtn'); await p.waitForTimeout(200);
want('it asks only the first time', dialogs.length===1&&await p.textContent('#listenBtn')==='MATCHING WORDS');
await p.evaluate(()=>exitStage()); await p.waitForTimeout(300);
await p.evaluate(()=>startMode('PARTNER')); await p.waitForTimeout(1200);
want('next time Scene partner opens, it is LISTENING again, never words by itself', await p.textContent('#listenBtn')==='LISTENING'&&await p.evaluate(()=>window.__recs)===2);
await p.evaluate(()=>exitStage());
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
