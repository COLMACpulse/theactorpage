/* The three lights, on every tool: CAMERA, MIC, TYPEWRITER. Dim when off, amber when on, red when recording or
   listening. Fake camera and mic; a stand-in speech service. Server on :8811.
   NODE_PATH=... node tests/hot_lights_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), os=require('os');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ class FakeSR extends EventTarget{ start(){} stop(){ this.dispatchEvent(new Event('end')); } abort(){ this.stop(); } }; window.webkitSpeechRecognition=FakeSR; window.SpeechRecognition=FakeSR; });
const errs=[];
const TOOLS=['index.html','actor-os/','hub/','booth/','memorizer/','notes/','spotted/','slate/','film/','filmhub/','papertrail/','setlist/','cps/','headshots/','resume/','breakdown/','archbook/','device/','write/writers-blockage.html','act/character-preservation.html','act/integrator.html'];
const p=await c.newPage(); p.on('pageerror',e=>errs.push(p.url()+' '+e.message)); p.on('dialog',d=>d.accept());
const lit=()=>p.evaluate(()=>{ const t=document.getElementById('hottray'); return t?[...t.querySelectorAll('span')].map(s=>s.dataset.l+':'+(s.className||'off')).join(' '):null; });
const missing=[];
for(const t of TOOLS){ await p.goto('http://localhost:8811/'+t); await p.waitForTimeout(500); const l=await lit(); if(l!=='camera:off mic:off typewriter:off') missing.push(t+' '+l); }
want('every tool shows the three lights, all off, on open ('+TOOLS.length+')', !missing.length, missing);
await p.goto('http://localhost:8811/booth/'); await p.waitForTimeout(500);
await p.click('#hottray'); await p.waitForTimeout(100);
want('tap them: plain words for each', /CAMERA off\.\s*MIC off\.\s*TYPEWRITER off\. Nothing is turning what you say into words\./.test(await p.innerText('#hotsays')), await p.innerText('#hotsays'));
await p.evaluate(async()=>{ window.__s=await navigator.mediaDevices.getUserMedia({audio:true}); }); await p.waitForTimeout(150);
want('mic on: MIC amber, the others dim', await lit()==='camera:off mic:on typewriter:off', await lit());
want('the words follow', /MIC on, not recording\./.test(await p.innerText('#hotsays')));
want('with the bar up, the lights sit under it', await p.evaluate(()=>{ const a=document.getElementById('hotbar').getBoundingClientRect(), t=document.getElementById('hottray').getBoundingClientRect(); return t.top>=a.bottom; }));
await p.evaluate(()=>{ window.__r=new MediaRecorder(window.__s); window.__r.start(); }); await p.waitForTimeout(150);
want('recording: MIC red', await lit()==='camera:off mic:hot typewriter:off', await lit());
await p.evaluate(()=>{ window.__r.stop(); window.__s.getTracks().forEach(t=>t.stop()); }); await p.waitForTimeout(200);
want('off again: all dim', await lit()==='camera:off mic:off typewriter:off', await lit());
await p.evaluate(async()=>{ window.__v=await navigator.mediaDevices.getUserMedia({video:true}); }); await p.waitForTimeout(150);
want('camera on: CAMERA amber', await lit()==='camera:on mic:off typewriter:off', await lit());
await p.evaluate(()=>window.__v.getTracks().forEach(t=>t.stop())); await p.waitForTimeout(150);
await p.evaluate(()=>{ window.__e=new webkitSpeechRecognition(); window.__e.start(); }); await p.waitForTimeout(150);
want('speech to words: TYPEWRITER and MIC red', await lit()==='camera:off mic:hot typewriter:hot', await lit());
want('and it says who does the typing', /TYPEWRITER on\. What you say is being turned into words by your browser's speech service \(Chrome: Google, Safari: Apple\)\./.test(await p.innerText('#hotsays')));
await p.evaluate(()=>window.__e.stop()); await p.waitForTimeout(150);
want('speech stops: all dim', await lit()==='camera:off mic:off typewriter:off', await lit());
// does it sit clear of each tool's own top-right controls? A picture of each, phone size, for a look.
for(const t of ['booth/','actor-os/','hub/','spotted/','memorizer/','notes/']){ await p.goto('http://localhost:8811/'+t); await p.waitForTimeout(500); await p.screenshot({path:path.join(os.tmpdir(),'lights_'+t.replace(/\W/g,'')+'.png'),clip:{x:0,y:0,width:390,height:120}}); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
