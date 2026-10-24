/* THEACTORPAGES · VOICE ON THE PAGE: talk the script out and see where your words are going. The real page stays up,
   the mic bar sits at the bottom, what you're saying shows on the page where it will land (in that line's place,
   with a tag for what it is), and what landed glows. The full-screen Voice is still a tap away. The speech service
   is a stand-in here. Made-up script. Server on :8811.  NODE_PATH=... node write/tests/voicepage_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
for(const [nm,vp,cs] of [['desk',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'});
 await c.addInitScript(()=>{ window.SpeechRecognition=function(){ this.start=()=>{ window.__started=(window.__started||0)+1; setTimeout(()=>this.onstart&&this.onstart(),5); }; this.stop=()=>{ setTimeout(()=>this.onend&&this.onend(),5); }; }; });
 const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>{ Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(900);
 await p.evaluate(()=>WB.openText("INT. DINER - NIGHT\n\nRain on the glass.\n\nDANA PELL\nWe're closed. Go home.\n",'salt_road.fountain')); await p.waitForTimeout(500);
 await p.evaluate(()=>{ const B=WB.api.blocks(); WB.api.goTo(B[B.length-1].id); });
 await p.click('#btnVoice'); await p.waitForTimeout(300);
 want(nm+': VOICE: the bar at the bottom, the page above it', await p.isVisible('#vdock')&&await p.isVisible('.stack')&&!(await p.isVisible('#vw')));
 await p.click('#vdMic'); await p.waitForTimeout(150);
 want(nm+': tap to talk: the mic goes red and says so', await p.evaluate(()=>window.__started>=1)&&(await p.getAttribute('#vdMic','aria-label'))==='Stop listening'&&await p.$eval('#vdMic',e=>e.classList.contains('live')));
 await p.evaluate(()=>__voice.handle('Ross says door was open')); await p.waitForTimeout(300);
 const B=await p.evaluate(()=>WB.api.blocks().map(b=>b.type+':'+b.text));
 want(nm+': what you said lands in the script, as a speech', B.includes('Character:ROSS')&&B.some(x=>/^Dialogue:Door was open/i.test(x)), B);
 want(nm+': it glows on the page where it landed', await p.evaluate(()=>!!document.querySelector('.stack .b.vjust')));
 want(nm+': next: Ross still speaking', /ROSS speaking/i.test(await p.innerText('#vdNext')));
 await p.evaluate(()=>__voice.hear('I saw the light on')); await p.waitForTimeout(200);
 const g=await p.evaluate(()=>{ const gh=document.getElementById('vghost'), last=[...document.querySelectorAll('.stack .b.dialogue')].pop(), a=gh.getBoundingClientRect(), r=last.getBoundingClientRect(); return {show:getComputedStyle(gh).display!=='none', text:gh.textContent, below:a.top>=r.bottom-2, sameLeft:Math.abs(a.left-r.left)<3}; });
 want(nm+': while you talk, your words show on the page, under the line, where dialogue goes', g.show&&g.text==='I saw the light on'&&g.below&&g.sameLeft, g);
 if(nm==='desk') want('desk: a tag in the margin says what it is', /ROSS · DIALOGUE/.test(await p.innerText('#vtag'))&&await p.isVisible('#vtag'));
 want(nm+': the bar says it too', /I saw the light on/.test(await p.innerText('#vdHeard')));
 await p.screenshot({path:SHOTS+'/voicepage_'+nm+'.png'});
 await p.evaluate(()=>__voice.hear('')); await p.click('#vdUndo'); await p.waitForTimeout(200);
 want(nm+': undo takes it back', !(await p.evaluate(()=>WB.api.blocks().some(b=>/Door was open/i.test(b.text)))));
 await p.click('#vdFull'); await p.waitForTimeout(250);
 want(nm+': FULL SCREEN: the full-screen Voice, still there', await p.isVisible('#vw')&&!(await p.isVisible('#vdock')));
 await p.click('#vwClose'); await p.waitForTimeout(150);
 await p.click('#btnVoice'); await p.waitForTimeout(150); await p.click('#vdDone'); await p.waitForTimeout(150);
 want(nm+': DONE: the bar goes, the mic is off', !(await p.isVisible('#vdock'))&&!(await p.evaluate(()=>__voice.state().WANT)));
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
