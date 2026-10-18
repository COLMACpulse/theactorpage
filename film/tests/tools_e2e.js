/* Story Studio ON SET · TOOLS: level (fake tilt readings), sun and shadows, exposure and ND, depth of field, delays,
   and the angle and delays in the wrap report. Made-up script (LOW TIDE). Server on :8811.
   NODE_PATH=... node film/tests/tools_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:390,height:844},locale:'en-US',timezoneId:'America/Chicago'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const tilt=(beta,gamma)=>p.evaluate(([x,y])=>{ for(let i=0;i<40;i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:x,gamma:y,alpha:0})); },[beta,gamma]);
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(200);
want('ON SET has TODAY and TOOLS', (await p.$$eval('#sub [data-t]',x=>x.map(y=>y.textContent))).join()==='TODAY,TOOLS');
await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(200);
want('TOOLS work with no script in', /Camera level/i.test(await p.innerText('#main'))&&(await p.$$eval('[data-ktool]',x=>x.map(y=>y.textContent))).join()==='LEVEL,SUN,EXPOSURE,FOCUS,FRAME,LIGHT,SOUND,DELAYS');
want('level is off until START, nothing on', /Off/.test(await p.innerText('#lvroll'))&&!(await p.$('.sensor')));
await p.click('#lvstart'); await p.waitForTimeout(150);
want('START: says the tilt sensor is on', /TILT SENSOR ON/.test(await p.innerText('.sensor')));
await tilt(90,0); await p.waitForTimeout(200);
want('upright and straight: LEVEL', (await p.innerText('#lvroll'))==='LEVEL'&&/Upright · looking straight ahead/.test(await p.innerText('#lvpitch')), [await p.innerText('#lvroll'),await p.innerText('#lvpitch')]);
await tilt(86,90); await p.waitForTimeout(250);
want('turned clockwise 4° (reads 86/90 at the edge): top leans right 4.0°', /Top leans right 4\.0°/.test(await p.innerText('#lvroll')), await p.innerText('#lvroll'));
await tilt(94,-90); await p.waitForTimeout(250);
want('the same tilt read the other way round (94/-90): still right 4.0°', /Top leans right 4\.0°/.test(await p.innerText('#lvroll')), await p.innerText('#lvroll'));
await tilt(2,0); await p.waitForTimeout(300);
want('flat on the rig, front up 2°', /Flat, screen up · front up 2\.0°/.test(await p.innerText('#lvpitch')), await p.innerText('#lvpitch'));
await p.click('#lvstop'); await p.waitForTimeout(100);
want('STOP: sensor off, says so', !(await p.$('.sensor'))&&/Off/.test(await p.innerText('#lvroll')));
// sun
await p.click('[data-ktool="sun"]'); await p.waitForTimeout(150);
want('sun: asks where, offers where I am, says it isn\'t kept', /Where are you shooting/.test(await p.innerText('#main'))&&/not kept/.test(await p.innerText('#main')));
await p.fill('#sunll','38.84, -97.61'); await p.click('#sunset'); await p.waitForTimeout(150);
await p.fill('#suntime','13:30'); await p.dispatchEvent('#suntime','change'); await p.waitForTimeout(150);
let m=await p.innerText('#main');
want('sun at 1:30 in Kansas: up high in the south, shadows north, the day\'s light, an hour table', /Sun \d+° up, in the (south|southwest|southeast)/.test(m)&&/Shadows fall north/.test(m)&&/Sunrise .* Golden hour .* Sunset/.test(m)&&(await p.$$('.ktab tr')).length>2, m.slice(0,600));
await p.click('#cpstart'); await p.waitForTimeout(100);
await p.evaluate(()=>{ const e=new DeviceOrientationEvent('deviceorientationabsolute',{alpha:360-90,beta:0,gamma:0,absolute:true}); window.dispatchEvent(e); const f=new DeviceOrientationEvent('deviceorientation',{alpha:360-90,beta:0,gamma:0,absolute:true}); window.dispatchEvent(f); });
await p.waitForTimeout(150);
want('compass on, says so, says which way to turn', /COMPASS ON/.test(await p.innerText('.sensor'))&&/Turn right \d+° to face the sun|straight ahead/.test(await p.innerText('#cpword')), await p.innerText('#cpword'));
await p.click('#cpstop');
// exposure
await p.click('[data-ktool="expo"]'); await p.waitForTimeout(150);
await p.selectOption('[data-kset="ev"]','15'); await p.waitForTimeout(80); await p.selectOption('[data-kset="N"]','2.8'); await p.waitForTimeout(80); await p.selectOption('[data-kset="iso"]','800'); await p.waitForTimeout(80);
m=await p.innerText('#main');
want('f/2.8, ISO 800, 24 fps 180° in full sun: 1/48, 9.4 over, ND 2.7', /1\/48/.test(m)&&/9\.4 stops too bright/.test(m)&&/ND 2\.7 \(9 stops, ND512\)/.test(m)&&/sunny 16/.test(m), m.slice(0,500));
// focus
await p.click('[data-ktool="focus"]'); await p.waitForTimeout(150);
want('feet first for en-US', /Focused at \(feet\)/.test(await p.innerText('#main')));
await p.click('[data-kunit="m"]'); await p.waitForTimeout(100);
await p.selectOption('[data-kset="c"]','0.03'); await p.waitForTimeout(80); await p.fill('[data-kset="f"]','50'); await p.fill('[data-kset="dist"]','3'); await p.waitForTimeout(150);
m=await p.innerText('#main');
want('50mm f/2.8 full frame at 3 m: 2.73 to 3.33 m, hyperfocal', /Sharp from 2\.73 m to 3\.33 m/.test(m)&&/Hyperfocal 29\.81 m/.test(m), m.slice(0,500));
// delays, before there's a script
await p.click('[data-ktool="delay"]'); await p.waitForTimeout(150);
await p.click('[data-dl="sound"]'); await p.waitForTimeout(100);
want('a delay running: what, since when', /WAITING ON · SINCE/.test(await p.innerText('#main'))&&/Sound/.test(await p.innerText('.nowcard h2')));
await p.fill('#dlnote','plane overhead'); await p.evaluate(()=>{ const D=JSON.parse(localStorage.getItem('film_os_v1')); D.kit.delays[0].at-=7*60000; localStorage.setItem('film_os_v1',JSON.stringify(D)); }); await p.reload(); await p.waitForTimeout(500);
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(150); await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(150);
want('still running after a reload, minutes counted', /7 MIN/.test(await p.innerText('#dlmins')), await p.innerText('#main'));
await p.click('#dlend'); await p.waitForTimeout(150);
want('back to work: logged, minutes lost', /1 delay, 7 minutes lost/.test(await p.innerText('#main'))&&/plane overhead/.test(await p.innerText('#main')));
// now a script and a day
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'))}); await p.waitForTimeout(800);
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(200); await p.click('#sub [data-t="set"]'); await p.waitForTimeout(150); await p.click('[data-allway="crew"]'); await p.waitForTimeout(300);
await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(150); await p.click('[data-ktool="level"]'); await p.waitForTimeout(150);
want('with a day running: names the shot, offers SAVE', /This shot: scene \d+, shot 1/.test(await p.innerText('#main'))&&!!(await p.$('#lvsave')));
await p.click('#lvstart'); await p.waitForTimeout(100); await tilt(84,90); await p.waitForTimeout(250);
await p.click('#lvsave'); await p.waitForTimeout(200); await tilt(87,90); await p.waitForTimeout(250);
want('saved for this shot; later it says how to match', /Saved for this shot|To match/.test(await p.innerText('#lvmatch'))&&/To match: turn right 3\.0°\./.test(await p.innerText('#lvmatch')), await p.innerText('#lvmatch'));
await p.click('#lvstop'); await p.click('#sub [data-t="set"]'); await p.waitForTimeout(200);
want('TODAY shows the saved angle on the shot', /Saved angle: top leans right 6\.0°/.test(await p.innerText('.nowcard')), await p.innerText('.nowcard'));
await p.click('#wrapit'); await p.waitForTimeout(200);
const w=await p.innerText('pre.wrap');
want('wrap report: the angle under the shot, the delay from before the script', /angle: top leans right 6\.0°, looking straight ahead/.test(w)&&/DELAYS · 1, 7 minutes lost/.test(w)&&/Sound, 7 min: plane overhead/.test(w), w);
want('no em dashes on any tool screen', !/—/.test(m+w));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
