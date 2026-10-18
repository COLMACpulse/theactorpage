/* ON SET · TOOLS, camera and mic: FRAME, LIGHT (two spots), SOUND (level, hum, room tone), and the level's zero.
   Made-up media fed in as the camera and mic: a picture bright on the left, dark on the right; a 60 Hz hum.
   Server on :8811.  NODE_PATH=... node film/tests/tools2_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+FX+'/two_tone.y4m','--use-file-for-fake-audio-capture='+FX+'/hum60.wav','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:390,height:844},locale:'en-US',timezoneId:'America/Chicago'}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
await p.click('#tabs [data-r="set"]'); await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(200);
want('eight tools, two rows of four', (await p.$$eval('[data-ktool]',x=>x.map(y=>y.textContent))).join()==='LEVEL,SUN,EXPOSURE,FOCUS,FRAME,LIGHT,SOUND,DELAYS');
// zero
await p.click('#lvstart'); await p.evaluate(()=>{ for(let i=0;i<40;i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:88.5,gamma:90})); }); await p.waitForTimeout(250);
want('before zero: the phone sits 1.5° off', /Top leans right 1\.5°/.test(await p.innerText('#lvroll')), await p.innerText('#lvroll'));
await p.click('#lvzero'); await p.waitForTimeout(250); await p.evaluate(()=>{ for(let i=0;i<40;i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:88.5,gamma:90})); }); await p.waitForTimeout(250);
want('ZERO ON THE RIG: now that reads LEVEL, says zeroed', (await p.innerText('#lvroll'))==='LEVEL'&&/zeroed/.test(await p.innerText('#lvpitch')), [await p.innerText('#lvroll'),await p.innerText('#lvpitch')]);
await p.evaluate(()=>{ for(let i=0;i<60;i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:85.5,gamma:90})); }); await p.waitForTimeout(250);
want('then the camera turns 3° more: reads 3°, from the zero', /Top leans right 3\.0°/.test(await p.innerText('#lvroll')), await p.innerText('#lvroll'));
await p.click('#lvunzero'); await p.waitForTimeout(100); await p.click('#lvstop');
// frame
await p.click('[data-ktool="frame"]'); await p.waitForTimeout(150);
want('frame: no camera until START', !(await p.$('#camv'))&&!!(await p.$('#camstart')));
await p.click('#camstart'); await p.waitForTimeout(1200);
want('START: CAMERA ON shows, the picture plays', /CAMERA ON/.test(await p.innerText('.sensor'))&&await p.$eval('#camv',v=>v.videoWidth===160&&!v.paused));
const fr=await p.$eval('#camo .fline',r=>({w:+r.getAttribute('width'),h:+r.getAttribute('height')}));
want('2.39 frame lines on a 16:9 picture: letterboxed', Math.abs(fr.w-160)<0.5&&Math.abs(fr.h-160/2.39)<0.5, fr);
await p.click('[data-aspect="0.5625"]'); await p.waitForTimeout(100);
const fv=await p.$eval('#camo .fline',r=>({w:+r.getAttribute('width'),h:+r.getAttribute('height')}));
want('9:16: pillarboxed', Math.abs(fv.h-90)<0.5&&Math.abs(fv.w-90*0.5625)<0.5, fv);
want('thirds lines on', (await p.$$('#camo .grid')).length===4);
// light: same camera, no new ask
await p.click('[data-ktool="light"]'); await p.waitForTimeout(600);
want('to LIGHT: the camera stays on', /CAMERA ON/.test(await p.innerText('.sensor')));
await p.$eval('#camv',v=>v.scrollIntoView({block:'center'})); await p.waitForTimeout(200);
const box=await p.$eval('#camv',v=>{ const b=v.getBoundingClientRect(); return {x:b.left,y:b.top,w:b.width,h:b.height}; });
const vh=box.w*90/160, oy=(box.h-vh)/2;
await p.mouse.click(box.x+box.w*0.25,box.y+oy+vh*0.5); await p.waitForTimeout(400);
want('one spot: asks for the other', /Now tap the dark side/.test(await p.innerText('#ltword')));
await p.mouse.click(box.x+box.w*0.75,box.y+oy+vh*0.5); await p.waitForTimeout(700);
const lw=await p.innerText('#ltword'), st=await p.evaluate(()=>__film.CAM.last&&__film.CAM.last.stops);
want('two spots: A about 2.5 stops brighter (made-up picture: Y 200 vs 100)', /^A is \d\.\d stops brighter\. About [\d.]+:1\./.test(lw)&&st>2.1&&st<2.9, [lw,st]);
await p.click('#hotbar button'); await p.waitForTimeout(700);
want('TURN OFF in the bar at the top: this screen turns off too', !(await p.$('.sensor'))&&!!(await p.$('#camstart')), await p.innerText('#main'));
await p.click('#camstart'); await p.waitForTimeout(800); await p.click('#camstop'); await p.waitForTimeout(150);
want('STOP: camera off, the light is off', !(await p.$('.sensor'))&&await p.evaluate(()=>!__film.CAM.stream));
// sound
await p.click('[data-ktool="sound"]'); await p.waitForTimeout(150);
want('sound: no mic until START, says nothing is recorded', !!(await p.$('#micstart'))&&/Nothing is recorded/.test(await p.innerText('#main')));
await p.click('#micstart'); await p.waitForTimeout(2500);
want('START: MIC ON shows', /MIC ON/.test(await p.innerText('.sensor')));
const dbt=await p.innerText('#snddb'); const dbv=parseFloat(dbt);
want('the level: about -13 dBFS for a 0.3 sine', /dBFS/.test(dbt)&&dbv>-17&&dbv<-10, dbt);
want('the hum: 60 Hz, names the power frequency', /A steady hum at (59|60|61) Hz/.test(await p.innerText('#sndhum'))&&/power frequency/.test(await p.innerText('#sndhum')), await p.innerText('#sndhum'));
await p.click('[data-rt="30"]'); await p.waitForTimeout(200);
want('room tone: QUIET, a countdown', /ROOM TONE · QUIET, EVERYONE/.test(await p.innerText('.nowcard'))&&/\d+ s/.test(await p.innerText('#rtleft')));
await p.evaluate(()=>{ __film.MIC.run.end=Date.now()+3500; }); await p.waitForTimeout(4500);
const T=await p.evaluate(()=>{ const D=JSON.parse(localStorage.getItem('film_os_v1')); return (D.kit&&D.kit.tones)||{run:!!__film.MIC.run,keys:Object.keys(D),txt:document.getElementById('main').innerText.slice(0,300)}; });
want('room tone logged: seconds, average, the hum', T.length===1&&T[0].secs>=1&&T[0].avg<-10&&T[0].avg>-17&&Math.abs(T[0].hum-60)<=1, T);
want('listed under Today', /Today · 1/.test(await p.innerText('#main')));
// leaving the tab stops the mic
await p.click('#sub [data-t="set"]'); await p.waitForTimeout(200);
want('leave TOOLS: the mic stops', await p.evaluate(()=>!__film.MIC.stream));
// wrap report gets the room tone once there's a script
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'))}); await p.waitForTimeout(800);
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(200); await p.click('#sub [data-t="set"]'); await p.waitForTimeout(150); await p.click('[data-allway="crew"]'); await p.waitForTimeout(300);
await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(150); await p.click('#sub [data-t="set"]'); await p.waitForTimeout(150);
await p.click('#wrapit'); await p.waitForTimeout(200);
want('wrap report: ROOM TONE with the hum', /ROOM TONE · 1/.test(await p.innerText('pre.wrap'))&&/hum at (59|60|61) Hz/.test(await p.innerText('pre.wrap')), await p.innerText('pre.wrap'));
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
