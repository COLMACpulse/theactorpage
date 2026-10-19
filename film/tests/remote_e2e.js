/* ON SET with a clicker (keys and the phone's media buttons: 1 logs, 2 circles, 3 shot done) and FRAME's
   WATCH ON ANOTHER PHONE (two pages, two codes, the picture plays on the second).
   The codes are read back from the pixels on screen with the same reader the phone uses.
   Made-up script (LOW TIDE) and a made-up picture. Server on :8811.  NODE_PATH=... node film/tests/remote_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+FX+'/two_tone.y4m','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:390,height:844},locale:'en-US',timezoneId:'America/Chicago'}); await ctx.grantPermissions(['camera','clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
await ctx.addInitScript(()=>{ window.__acts={}; if(navigator.mediaSession){ const s=navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler=(a,f)=>{ window.__acts[a]=f; try{ s(a,f); }catch(e){} }; } });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'))}); await p.waitForTimeout(800);
await p.click('#tabs [data-r="set"]'); await p.waitForTimeout(300); await p.click('[data-allway="crew"]'); await p.waitForTimeout(300);
const vol=()=>p.evaluate(()=>(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'AudioVolumeUp',bubbles:true,cancelable:true})));
const takes=()=>p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('film_os_v1')), c=d.scripts[d.cur]; return (c.set&&c.set.log||[]).map(t=>t.take+':'+(t.mark||'-')).join(' '); }).catch(()=>'');
want('ON SET: USE A REMOTE, off until you turn it on', /USE A REMOTE/.test(await p.innerText('#clickon')));
await vol(); await p.waitForTimeout(900);
want('off: a click does nothing', /TAKE 1/.test(await p.innerText('.takeno')));
await p.click('#clickon'); await p.waitForTimeout(200);
want('on: says so, and what each count does', /REMOTE ON/.test(await p.innerText('#clickon'))&&/1 press\s*logs the take\. 2\s*circles it\. 3\s*marks the shot done/.test(await p.innerText('.clicklegend')), await p.innerText('#main'));
await p.click('body',{position:{x:5,y:5}}).catch(()=>{});
await vol(); await p.waitForTimeout(900);
want('1 press: take 1 logged, no mark; LOGGED on screen', /TAKE 2/.test(await p.innerText('.takeno'))&&/LOGGED/.test(await p.innerText('#clickflash')), await p.innerText('.takeno'));
await p.keyboard.press('Enter'); await p.waitForTimeout(280); await p.keyboard.press('Enter'); await p.waitForTimeout(900);
want('2 presses: take 2 CIRCLED', /TAKE 2\s*CIRCLE/.test(await p.innerText('.tklist'))&&/CIRCLED/.test(await p.innerText('#clickflash')), await p.innerText('.tklist'));
await p.keyboard.press('PageDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(900);
want('a remote sending two keys at once counts once', (await takes())==='1:- 2:gold 3:-', await takes());
const shot1=await p.innerText('.nowcard .nk');
await p.evaluate(async()=>{ const f=window.__acts.play; f(); await new Promise(r=>setTimeout(r,250)); window.__acts.pause(); await new Promise(r=>setTimeout(r,250)); window.__acts.play(); }); await p.waitForTimeout(500);
want('3 presses from the phone\'s media buttons: shot done, on to shot 2', /SHOT 1 OF/.test(shot1)&&/SHOT 2 OF/.test(await p.innerText('.nowcard .nk'))&&/SHOT DONE/.test(await p.innerText('#clickflash')), await p.innerText('.nowcard .nk'));
await p.fill('#setnote','first'); await p.keyboard.press('Enter'); await p.keyboard.press(' '); await p.waitForTimeout(900);
want('typing in the note box is never a click', (await p.inputValue('#setnote'))==='first '&&/TAKE 1/.test(await p.innerText('.takeno')));
await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(200); await vol(); await p.waitForTimeout(900);
want('away from TODAY: it says where it works, logs nothing', /works on TODAY/.test(await p.innerText('#toast')));
await p.click('#sub [data-t="set"]'); await p.waitForTimeout(200); await p.click('#clickon'); await p.waitForTimeout(150);
want('turn it off', /USE A REMOTE/.test(await p.innerText('#clickon'))&&!(await p.$('.clicklegend')));

// ---- watch on another phone
await p.click('#sub [data-t="tools"]'); await p.click('[data-ktool="frame"]'); await p.waitForTimeout(150);
want('no WATCH ON ANOTHER PHONE until the camera is on', !(await p.$('#monstart')));
await p.click('#camstart'); await p.waitForTimeout(1000);
await p.click('#monstart'); await p.waitForFunction(()=>window.__film.MON.stage==='code',null,{timeout:8000});
const url=await p.evaluate(()=>window.__film.MON.url);
want('a code for the other phone, and a link to send ('+url.length+' chars)', !!(await p.$('.mon svg.qr'))&&/\/film\/monitor\.html#o=[A-Za-z0-9_-]+$/.test(url)&&url.length<1400, url.slice(0,80));
const readSvg=(pg,sel)=>pg.evaluate(async sel=>{ const s=document.querySelector(sel), x=new XMLSerializer().serializeToString(s), im=new Image(); im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x); await im.decode();
  const c=document.createElement('canvas'); c.width=c.height=800; const g=c.getContext('2d'); g.drawImage(im,0,0,800,800); return [...g.getImageData(0,0,800,800).data]; },sel);
const pxA=await readSvg(p,'.mon svg.qr');
const readA=await p.evaluate(async px=>{ const L=window.MonitorLink; await L.reader(''); return L.readImage({data:new Uint8ClampedArray(px),width:800,height:800}); },pxA);
want('the code on screen reads back as the link', readA===url, readA.slice(0,80));
const m=await ctx.newPage(); const merrs=[]; m.on('pageerror',e=>merrs.push(e.message));
await m.goto(readA); await m.waitForSelector('#qrbox svg.qr',{timeout:8000});
want('the other phone: the link opens the monitor, it shows its code back', /Now show this to the camera phone/.test(await m.innerText('#app')));
want('the handshake is wiped from its address bar', !/#o=/.test(m.url()), m.url());
const pxB=await readSvg(m,'#qrbox svg.qr');
const scanned=await p.evaluate(async px=>{ const L=window.MonitorLink, read=await L.reader(''), c=document.createElement('canvas'); c.width=c.height=800; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px),800,800),0,0); return read(c); },pxB);
want('the camera phone\'s reader gets the answer code off the screen', scanned.startsWith('TPA1.')&&scanned===await m.evaluate(()=>window.__mon.answer), scanned.slice(0,40));
await p.evaluate(()=>document.querySelector('.mon details').open=true); await p.fill('#monpaste','not a code'); await p.click('#monuse'); await p.waitForTimeout(200);
want('a wrong code: says so, still waiting', /isn't the code/.test(await p.innerText('#toast'))&&(await p.evaluate(()=>window.__film.MON.stage))==='code');
await p.fill('#monpaste',scanned); await p.click('#monuse');
await p.waitForFunction(()=>window.__film.MON.stage==='live',null,{timeout:15000}).catch(()=>{});
want('the camera phone: SENDING TO 1 SCREEN, with STOP SENDING', /SENDING TO 1 SCREEN/.test(await p.innerText('#monlive').catch(()=>''))&&/CAMERA ON/.test(await p.innerText('#main')), await p.innerText('#main').then(t=>t.slice(0,300)));
await m.waitForFunction(()=>{ const v=document.getElementById('v'); return v&&v.videoWidth>0&&!v.paused&&v.currentTime>0.3; },null,{timeout:15000}).catch(()=>{});
const mv=await m.evaluate(()=>{ const v=document.getElementById('v'); return v?{w:v.videoWidth,h:v.videoHeight,t:v.currentTime}:null; });
want('the other phone plays the picture (same size as the camera\'s)', mv&&mv.w===160&&mv.h===90&&mv.t>0.3, mv);
want('it says whose camera it is, and that nothing records', /CAMERA FROM THE OTHER PHONE · NOT RECORDING/.test(await m.innerText('#app')));
const fl=await m.$eval('#ov .fline',r=>({w:+r.getAttribute('width'),h:+r.getAttribute('height')}));
want('the camera phone\'s frame comes along: 2.39 lines', Math.abs(fl.w-160)<0.5&&Math.abs(fl.h-160/2.39)<0.5, fl);
// the left half of the made-up picture is bright, the right dark: check the picture really arrived
const lr=await m.evaluate(()=>{ const v=document.getElementById('v'), c=document.createElement('canvas'); c.width=160; c.height=90; const g=c.getContext('2d'); g.drawImage(v,0,0); const L=g.getImageData(20,40,10,10).data, R=g.getImageData(130,40,10,10).data, av=d=>{ let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return s/(d.length/4)/3; }; return [Math.round(av(L)),Math.round(av(R))]; });
want('the real picture: bright left, dark right ('+lr.join(' vs ')+')', lr[0]>lr[1]+60, lr);
await m.click('[data-a="1.78"]'); await m.click('#mir'); await m.click('#frz'); await m.waitForTimeout(200);
want('the monitor\'s own frame, mirror and freeze', (await m.$eval('#ov .fline',r=>Math.abs(+r.getAttribute('height')-90)<0.5))&&await m.$eval('#scr',s=>s.classList.contains('mirror')&&s.classList.contains('frozen'))&&/FROZEN/.test(await m.innerText('#ov').catch(()=>''))||(await m.$eval('#ov',o=>/FROZEN/.test(o.innerHTML))));
await m.click('#frz');
await p.click('#monstop'); await p.waitForTimeout(300);
want('STOP SENDING: the camera stays on, the sending light goes', !(await p.$('#monlive'))&&/CAMERA ON/.test(await p.innerText('#main'))&&!!(await p.$('#monstart')));
await m.waitForFunction(()=>/The picture stopped/.test(document.getElementById('app').innerText),null,{timeout:20000}).catch(()=>{});
want('the other phone says the picture stopped', /The picture stopped/.test(await m.innerText('#app')), await m.innerText('#app'));
// again, then leave: leaving the tool stops it too
await p.click('#monstart'); await p.waitForFunction(()=>window.__film.MON.stage==='code',null,{timeout:8000});
await p.click('[data-ktool="light"]'); await p.waitForTimeout(200);
want('switching tools drops the code, the camera stays', (await p.evaluate(()=>window.__film.MON.stage))===''&&!(await p.evaluate(()=>window.__film.MON.pc))&&/CAMERA ON/.test(await p.innerText('#main')));
await p.click('[data-ktool="frame"]'); await p.waitForTimeout(150); await p.click('#camstop'); await p.waitForTimeout(150);
want('camera off: no sending option', !(await p.$('#monstart')));
// a monitor page with no code
const m2=await ctx.newPage(); await m2.goto('http://localhost:8811/film/monitor.html'); await m2.waitForTimeout(300);
want('the monitor on its own: says how to get there, takes a pasted link', /ON SET, TOOLS, FRAME/.test(await m2.innerText('#app'))&&!!(await m2.$('#paste')));
await m2.fill('#paste','http://x/film/monitor.html#o=AAAA'); await m2.click('#go'); await m2.waitForTimeout(400);
want('a broken code: plain words, try again', /didn't work|isn't from Story Studio/.test(await m2.innerText('#app')), await m2.innerText('#app'));
const all=(await p.innerText('body'))+(await m.innerText('body'))+(await m2.innerText('body'));
want('no em dashes', !/—/.test(all));
want('no page errors', !errs.length&&!merrs.length, errs.concat(merrs));
await m.screenshot({path:'/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/mon_after.png'});
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
