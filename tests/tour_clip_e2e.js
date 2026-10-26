/* THE TOUR with a recorded clip: vo/O01.mp3 there (a made-up tone), so it plays instead of the caption clock. Server on :8811. */
const {chromium}=require('playwright'); const fs=require('fs'); const CLIP=fs.readFileSync(require('path').join(__dirname,'fixtures','tone.mp3'));
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({viewport:{width:390,height:844}});
await c.route('**/demo/vo/O01.mp3',r=>r.fulfill({status:200,contentType:'audio/mpeg',body:CLIP}));
await c.addInitScript(()=>{ if(!/\/demo\//.test(location.pathname)) return; window.__said=[]; const S={getVoices:()=>[],cancel(){},speak(u){ window.__said.push(u.text); setTimeout(()=>u.onend&&u.onend(),60); }}; Object.defineProperty(window,'speechSynthesis',{value:S,configurable:true}); window.SpeechSynthesisUtterance=function(t){this.text=t;}; });
const p=await c.newPage(); await p.goto('http://localhost:8811/demo/'); await p.click('#go');
await p.waitForFunction(()=>window.__tour.at==='O02',null,{timeout:30000});
const said=await p.evaluate(()=>window.__said.filter(s=>s.trim()));
const ok=!said.some(s=>/the actor page/.test(s)); console.log((!said.some(s=>/the actor page/.test(s))?'PASS':'FAIL')+' a recorded clip plays instead of the caption clock', said.length);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
