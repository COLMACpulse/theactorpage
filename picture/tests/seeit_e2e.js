/* PICTURE IT · SEE IT (Col, Oct 27: "a vision board works for me"): a wish on the wall as 30 seconds of you, on it.
   SEE IT on each wish you still want; six beats made from your name, headshot, the title and your role; your words
   and a picture per beat, folded; the mirror (your headshot, or the camera live, which asks first, shows the bar
   and goes off at the end); a sound you pick; 30, 45 or 60 seconds; SAVE THE VIDEO never has the camera in it.
   Made-up actor (Sam Actor), made-up show (Harbor Lights). Computer light, phone dark. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), os=require('os');
const FX=path.join(__dirname,'..','..','shared','fixtures');
function wav(){ const n=8000, b=Buffer.alloc(44+n*2); b.write('RIFF',0); b.writeUInt32LE(36+n*2,4); b.write('WAVE',8); b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(8000,24); b.writeUInt32LE(16000,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*2,40); for(let i=0;i<n;i++) b.writeInt16LE(Math.round(3000*Math.sin(i/6)),44+i*2); return b; }
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const SND=path.join(os.tmpdir(),'seeit_voice_'+Date.now()+'.wav'); fs.writeFileSync(SND,wav());
const c=await b.newContext({viewport:{width:1280,height:860},colorScheme:'light',acceptDownloads:true}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ window.__gum=0; if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){ const g=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getUserMedia=(o)=>{ window.__gum++; return g(o); }; } window.__seeNoFull=1; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/picture/');
await p.evaluate(async()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); You.set('name','Sam Actor');
 const r=await fetch('../shared/fixtures/made_up_face.jpg'); await You.addPhoto(new File([await r.blob()],'face.jpg',{type:'image/jpeg'}));
 window.__w=Viz.add({title:'Harbor Lights',kind:'show',role:'Deputy Ray Cole'}).id; const g=Viz.add({title:'My union card',kind:'milestone'}); Viz.mark(g.id,'got'); });
await p.reload(); await p.waitForTimeout(900);
const id=await p.evaluate(()=>Viz.all().find(w=>w.title==='Harbor Lights').id);
want('the wall: SEE IT under a wish you still want, not under one you got', (await p.$$eval('[data-see]',x=>x.length))===1&&/SEE IT/.test(await p.innerText('[data-see]')));
await p.click('[data-w="'+id+'"]'); await p.waitForTimeout(500);
want('the wish page: SEE IT · 30 SECONDS up top', /SEE IT · 30 SECONDS/.test(await p.innerText('#o_see')));
await p.click('#o_see'); await p.waitForTimeout(1500);
let v=await p.innerText('#view');
want('See It: the title and your role, the stage, SEE IT and SAVE THE VIDEO', /Harbor Lights, as Deputy Ray Cole/.test(v)&&!!(await p.$('#seeCv'))&&/SEE IT/.test(await p.innerText('#seePlay'))&&/SAVE THE VIDEO/.test(v));
const drawn=()=>p.evaluate(()=>{ const c=document.getElementById('seeCv'), d=c.getContext('2d').getImageData(0,0,c.width,c.height).data; let lit=0; for(let i=0;i<d.length;i+=4*97) if(d[i]+d[i+1]+d[i+2]>120) lit++; return lit; });
want('the first beat is drawn on the stage', (await drawn())>50, await drawn());
want('six beats, each with ADD A PICTURE and a place for your words, none erased yet', (await p.$$eval('.beat',x=>x.length))===6&&(await p.$$eval('.beat input[data-pic]',x=>x.length))===6&&(await p.$$eval('.beat input[data-words]',x=>x.length))===6&&!(await p.$('[data-nopic]'))&&!(await p.$('#seeEraseAll')));
want('the mirror is your headshot, the sound is quiet, 30 seconds', await p.evaluate(()=>['[data-mirror="shot"]','[data-sound="quiet"]','[data-secs="30"]'].every(s=>document.querySelector(s).classList.contains('on'))));
want('nothing is written for you: no sentence on any beat', await p.evaluate(()=>{ const F=SeeIt.facts(Viz.all().find(w=>w.title==='Harbor Lights'),You.get()); return SeeIt.BEATS.every((b,i)=>{ const t=SeeIt.text(i,F,''); return !t.say&&!/got it|booked|congrat|you are/i.test(JSON.stringify(t)); }); }));

/* your words on the call */
await p.fill('#sw0','We got it. They want you.'); await p.press('#sw0','Tab'); await p.waitForTimeout(400);
want('your words: kept for that beat', await p.evaluate(id=>Viz.see(id).words[0]==='We got it. They want you.',id));
/* a picture on the script beat */
const before=await p.evaluate(()=>{ __see.frame(7.5); return document.getElementById('seeCv').toDataURL().length; });
await p.setInputFiles('input[data-pic="1"]',path.join(__dirname,'poster_a.jpg')); await p.waitForTimeout(1500);
want('a picture: kept for that beat, its thumbnail and ERASE right on the row', await p.evaluate(id=>!!Viz.see(id).pics[1],id)&&/^blob:/.test(await p.$eval('img[data-thumb="1"]',i=>i.src))&&!!(await p.$('[data-nopic="1"]'))&&/CHANGE/.test(await p.innerText('.beat[data-beat="1"]')));
want('it fills the whole frame for that beat, your line under it', await p.evaluate(()=>{ __see.frame(7.5); const c=document.getElementById('seeCv'), d=c.getContext('2d').getImageData(40,40,1,1).data; return d[0]+d[1]+d[2]>0; })&&(await p.evaluate(()=>SeeIt.caption(1,SeeIt.facts(Viz.all().find(w=>w.title==='Harbor Lights'),You.get()),'')))==='Sam Actor as Deputy Ray Cole · Harbor Lights');
await p.setInputFiles('input[data-pic="4"]',path.join(__dirname,'poster_b.jpg')); await p.waitForTimeout(1500);
want('ERASE ALL: shows once there are pictures, with the count', /ERASE ALL 2 PICTURES/.test(await p.innerText('#seeEraseAll')));
await p.click('#seeEraseAll'); await p.waitForTimeout(300);
want('ERASE ALL asks once, on the page, and says the wall picture stays', /YES, ERASE THEM ALL/.test(await p.innerText('#seeEraseAll'))&&/wall.s picture stays/.test(await p.innerText('#seeSure'))&&await p.evaluate(id=>Object.keys(Viz.see(id).pics).length===2,id));
await p.click('#seeEraseAll'); await p.waitForTimeout(900);
want('then every beat picture is gone, from the device too', await p.evaluate(id=>Object.keys(Viz.see(id).pics).length===0,id)&&!(await p.$('#seeEraseAll'))&&/Erased/.test(await p.innerText('#msg')));
await p.setInputFiles('input[data-pic="1"]',path.join(__dirname,'poster_a.jpg')); await p.waitForTimeout(1500);
await p.click('[data-nopic="1"]'); await p.waitForTimeout(700);
want('TAKE IT OFF: gone, and from the device', await p.evaluate(async id=>!Viz.see(id).pics[1],id));
/* length and sound */
await p.click('[data-secs="45"]'); await p.waitForTimeout(700);
want('45 SECONDS: kept, the clock says 0:45', await p.evaluate(id=>Viz.see(id).secs===45,id)&&/\/ 0:45/.test(await p.innerText('#seeClock')));
await p.click('[data-secs="30"]'); await p.waitForTimeout(600);
await p.setInputFiles('#seeSnd',SND); await p.waitForTimeout(900);
want('your voice or a song: kept, named on the chip', await p.evaluate(id=>!!Viz.see(id).sound,id)&&/SEEIT_VOICE/i.test(await p.innerText('.seeopts')));
await p.click('[data-sound="quiet"]'); await p.waitForTimeout(600);
want('QUIET: the sound is gone', await p.evaluate(id=>!Viz.see(id).sound,id));
await p.setInputFiles('#seeSnd',SND); await p.waitForTimeout(800);

/* play it, headshot in the mirror: no camera */
await p.evaluate(()=>{ window.__seeSecs=2; }); const gum0=await p.evaluate(()=>__gum);
await p.click('#seePlay'); await p.waitForTimeout(500);
want('SEE IT: it plays big (full screen, or the whole window where full screen is not offered)', await p.evaluate(()=>document.getElementById('stage').classList.contains('full')||!!document.fullscreenElement)&&/STOP/.test(await p.innerText('#seePlay')));
want('the sound plays under it', await p.evaluate(()=>{ const s=__see.state(); return !!s.audio&&!s.audio.paused; }));
await p.waitForTimeout(2300);
want('the end: back on the page, on the mirror, AGAIN', await p.evaluate(()=>!document.getElementById('stage').classList.contains('full')&&__see.state().i===5)&&/AGAIN/.test(await p.innerText('#seePlay'))&&/That's you/.test(await p.innerText('#msg')));
want('the headshot mirror never turns the camera on', (await p.evaluate(()=>__gum))===gum0);

/* the camera, live */
await p.click('[data-mirror="live"]'); await p.waitForTimeout(700);
want('THE CAMERA, LIVE: says when it comes on and goes off', /comes on when you press SEE IT, and goes off at the end/.test(await p.innerText('.seeopts')));
await p.click('#seePlay'); await p.waitForTimeout(800);
want('playing: the camera is on, and the bar says so', await p.evaluate(()=>{ const s=__see.state(); return !!s.cam&&s.cam.getVideoTracks().some(t=>t.readyState==='live'); })&&/CAMERA/i.test(await p.evaluate(()=>(document.getElementById('hotbar')||{}).innerText||'')));
await p.waitForTimeout(2000);
want('the end: the camera is off, the bar is gone', await p.evaluate(()=>!__see.state().cam)&&!(await p.evaluate(()=>{ const h=document.getElementById('hotbar'); return !!h&&h.offsetHeight>0&&/CAMERA ON/.test(h.innerText); })));

/* SAVE THE VIDEO: the camera is never in it */
const gum1=await p.evaluate(()=>__gum);
const dl=p.waitForEvent('download',{timeout:15000}); await p.click('#seeSave'); const d=await dl;
const f=path.join(os.tmpdir(),'seeit_'+Date.now()+'_'+d.suggestedFilename()); await d.saveAs(f); const sz=fs.statSync(f).size; fs.unlinkSync(f);
want('SAVE THE VIDEO: a video named for it, with something in it', /^See it - Harbor Lights\.(webm|mp4)$/.test(d.suggestedFilename())&&sz>2000, [d.suggestedFilename(),sz]);
want('the saved video never turned the camera on, even with the live mirror picked', (await p.evaluate(()=>__gum))===gum1);
await p.waitForTimeout(400);
want('it says where it went', /Saved: See it - Harbor Lights/.test(await p.innerText('#msg')));
v=await p.innerText('#view');
want('plain words: no em dashes', !/—/.test(v));

/* off the wall: its See It pictures and sound go too */
await p.evaluate(async id=>{ await Viz.seePic(id,2,new File([await (await fetch('tests/poster_b.jpg')).blob()],'b.jpg',{type:'image/jpeg'})); },id); await p.waitForTimeout(400);
const keys=await p.evaluate(async id=>{ const s=Viz.see(id); return [s.pics[2],s.sound]; },id);
await p.evaluate(async id=>{ await Viz.removeAll(id); },id);
const left=await p.evaluate(async k=>{ const r=await Promise.all(k.map(x=>Viz.picBlob(x))); return r.map(x=>x instanceof Blob); },keys);
want('off the wall: its pictures and sound are deleted from the device', keys.every(Boolean)&&left.every(x=>!x), [keys,left]);
want('no page errors (computer)', !errs.length, errs);
await p.screenshot({path:path.join(os.tmpdir(),'seeit_desk.png'),fullPage:true});

/* phone, dark */
const q=await (await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true})).newPage(); const e2=[]; q.on('pageerror',e=>e2.push(e.message));
await q.goto('http://localhost:8811/picture/'); const qid=await q.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); You.set('name','Sam Actor'); return Viz.add({title:'Harbor Lights',kind:'show',role:'Deputy Ray Cole'}).id; });
await q.goto('http://localhost:8811/picture/?see='+qid); await q.waitForTimeout(1500);
want('phone: the stage first, the beats under, nothing sideways', await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await q.evaluate(()=>document.getElementById('stage').getBoundingClientRect().top<document.querySelector('.seebeats').getBoundingClientRect().top));
want('phone: no page errors', !e2.length, e2);
await q.screenshot({path:path.join(os.tmpdir(),'seeit_phone.png'),fullPage:true});
fs.unlinkSync(SND);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
