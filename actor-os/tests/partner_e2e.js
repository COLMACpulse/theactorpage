/* Actor OS: play opposite yourself. Reader lines recorded on camera; during the take each one plays in a window
   by the lens, or a mark sits there, or nothing. Fake camera and mic, made-up sides (LOW TIDE).
   Needs a local server on :8811 at the repo root.  NODE_PATH=... node actor-os/tests/partner_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844}}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ ['actor_os_reader_video','actor_os_partner_view','actor_os_partner_pos'].forEach(k=>localStorage.removeItem(k)); indexedDB.deleteDatabase('actor_os_reader'); });
await p.reload(); await p.waitForTimeout(1200);
const sides=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.evaluate(t=>{ loadSides(t,'low_tide.fountain'); if(!SIDES.me) pickMe('ANNA'); boothReady(); },sides); await p.waitForTimeout(600);
const k=await p.evaluate(()=>{ const o=activeScript().find(b=>!b.mine); return o?boothKey(o):''; });
want('the sides load, with a line that is not yours', !!k);
want('lines are recorded on camera by default', await p.evaluate(()=>ActorReader.wantVideo())&&/LINES ON CAMERA/.test(await p.evaluate(()=>(document.getElementById('boothVid')||{}).textContent||'')));
// record MR. DELL's first line, on camera
await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(2500);
const live=await p.evaluate(()=>{ const v=document.getElementById('boothCam'); return {cam:!!(v&&v.srcObject&&v.srcObject.getVideoTracks().length),flag:(document.getElementById('liveDot')||{}).textContent}; });
want('while you record the line you see yourself, and the flag says camera and mic', live.cam&&live.flag==='CAMERA + MIC ON', live);
await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(1200);
const took=await p.evaluate(async k=>{ const a=(await ActorReader.takesFor(k))||[]; const c=a[a.length-1]; return {n:a.length,type:c&&c.blob.type,size:c&&c.blob.size,pill:document.getElementById('boothList').innerText.includes('video')}; },k);
want('the line is kept as video (with its sound)', took.n===1&&/^video\//.test(took.type)&&took.size>5000&&took.pill, took);
want('after the line the camera is off', await p.evaluate(()=>!ActorReader.micOpen()));
// sound only still works
await p.evaluate(()=>{ ActorReader.setWantVideo(false); boothRefresh(); }); await p.waitForTimeout(300);
await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(1500); await p.evaluate(k=>boothToggle(k),k); await p.waitForTimeout(800);
const snd=await p.evaluate(async k=>{ const a=await ActorReader.takesFor(k); return a.map(c=>c.blob.type.split('/')[0]); },k);
want('LINES: SOUND ONLY records sound, as before', snd.join()==='video,audio', snd);
await p.evaluate(k=>{ ActorReader.setWantVideo(true); const a=TAKESBY[k]||[]; },k);
// pick the video take, run the scene as Scene partner
await p.evaluate(async k=>{ const a=await ActorReader.takesFor(k); SIDES.pick=SIDES.pick||{}; SIDES.pick[k]=a[0].id; await boothRefresh(); },k);
await p.evaluate(()=>startMode('PARTNER')); await p.waitForTimeout(1800);
want('Scene partner: the reader button is there, set to you', /READERYOU/.test(await p.evaluate(()=>document.getElementById('sView').textContent)));
const idx=await p.evaluate(()=>{ const r=SIDES.run||activeScript(); return r.findIndex(b=>!b.mine); });
await p.evaluate(i=>{ sIdx=i; drawStage(); speakPartner(); },idx);
await p.waitForTimeout(700);
const during=await p.evaluate(()=>{ const v=document.getElementById('sPartner'), r=v.getBoundingClientRect(); return {on:v.classList.contains('on'),t:v.currentTime,muted:v.muted,top:Math.round(r.top),cx:Math.round(r.left+r.width/2),w:Math.round(r.width)}; });
want('while their line plays, you are on screen as them, near the top middle (the lens)', during.on&&during.t>0&&during.muted&&during.top<260&&Math.abs(during.cx-195)<20&&during.w>60, during);
await p.waitForFunction(()=>!document.getElementById('sPartner').classList.contains('on'),null,{timeout:8000}).catch(()=>{});
want('when the line ends the window goes away', await p.evaluate(()=>!document.getElementById('sPartner').classList.contains('on')));
// drag it next to the lens somewhere else (landscape, lens at the side): it stays there
await p.evaluate(i=>{ sIdx=i; speakPartner(); },idx); await p.waitForTimeout(500);
const box=await p.evaluate(()=>{ const r=document.getElementById('sPartner').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
await p.mouse.move(box.x,box.y); await p.mouse.down(); await p.mouse.move(330,330,{steps:6}); await p.mouse.up(); await p.waitForTimeout(200);
const moved=await p.evaluate(()=>({pos:ActorReader.pos(),idx:sIdx}));
want('drag the window: it moves and remembers, and the drag does not push the scene on', moved.pos&&moved.pos.x>0.75&&moved.idx===idx, moved);
await p.evaluate(()=>ActorReader.stopPlay());
// a mark instead of yourself
await p.click('#sView'); await p.waitForTimeout(200);
const mark=await p.evaluate(()=>({label:document.getElementById('sView').textContent,mark:document.getElementById('sMark').classList.contains('on')}));
want('READER MARK shows a mark where the window was', /READERMARK/.test(mark.label)&&mark.mark, mark);
await p.evaluate(i=>{ sIdx=i; speakPartner(); },idx); await p.waitForTimeout(600);
want('with the mark, their line plays as sound and no video shows', await p.evaluate(()=>!document.getElementById('sPartner').classList.contains('on')&&!!ActorReader.playPos()));
await p.evaluate(()=>ActorReader.stopPlay());
await p.click('#sView'); await p.waitForTimeout(150);
want('READER OFF shows nothing', await p.evaluate(()=>/READEROFF/.test(document.getElementById('sView').textContent)&&!document.getElementById('sMark').classList.contains('on')));
await p.click('#sView');
// the take records the camera, not the screen
want('the take records the camera stream, not the screen', await p.evaluate(()=>{ const s=document.getElementById('stageVid').srcObject; return !!(s&&s.getVideoTracks().length&&!s.getVideoTracks().some(t=>/screen|window|tab/i.test(t.label))); }));
await p.evaluate(()=>exitStage()); await p.waitForTimeout(300);
want('leaving the take: no window, no mark', await p.evaluate(()=>!document.getElementById('sPartner').classList.contains('on')&&!document.getElementById('stage').classList.contains('on')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
