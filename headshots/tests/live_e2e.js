/* HEADSHOTS front and THE LIVE ONE, on made-up photos and a fake camera. Server on :8811.
   The front opens on your own headshots (or an example when there are none); tap a card for its details;
   SHOOT A LIVE ONE: options, sound off unless you turn it on, a timer, it records the length you picked, a loop to review,
   a frame kept as a still if you tap one, KEEP; STILL | LIVE; the plan and the brief folded.
   NODE_PATH=$(npm root -g) node headshots/tests/live_e2e.js [shots-dir] */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
const SHOTS=process.argv[2]||'';
(async()=>{ const T=fs.mkdtempSync(path.join(os.tmpdir(),'hsl-'));
cp.execSync(`python3 -c "
from PIL import Image,ImageDraw
def shot(name,bg,face,size=(1200,1500)):
    im=Image.new('RGB',size,bg); d=ImageDraw.Draw(im); W,H=size
    d.ellipse([W*.3,H*.16,W*.7,H*.56],fill=face); d.rectangle([W*.14,H*.64,W*.86,H],fill=tuple(int(c*.55) for c in face))
    im.save('${T}/'+name,quality=90)
shot('grey_crew.jpg',(40,44,52),(196,168,148))
shot('denim_jacket.jpg',(150,160,170),(180,150,130))
shot('suit_dark.jpg',(24,22,26),(205,178,158))
"`);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const run=async(vw,vh,scheme,tag)=>{
 const c=await b.newContext({viewport:{width:vw,height:vh},colorScheme:scheme,acceptDownloads:true}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
 await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/headshots/manifest.webmanifest'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_you'); indexedDB.deleteDatabase('theactorpage_headshot_refs'); });
 await p.goto('http://localhost:8811/headshots/'); await p.waitForTimeout(600);
 const shot=async n=>{ if(SHOTS) await p.screenshot({path:SHOTS+'/'+tag+'_'+n+'.png',fullPage:n!=='shoot'&&n!=='review'}); };
 want(tag+' nothing yet: the example and the two ways in', !!(await p.$('#example'))&&!!(await p.$('#shoot'))&&!!(await p.$('#hf'))&&/EXAMPLE · HOW IT WORKS/.test(await p.innerText('#main')));
 want(tag+' your looks, the plan and the brief are folded, not open', (await p.$$('.fold')).length===3&&!(await p.$('[data-want]')));
 await shot('empty');
 await p.setInputFiles('#hf',['grey_crew.jpg','denim_jacket.jpg','suit_dark.jpg'].map(f=>T+'/'+f));
 await p.waitForFunction(()=>You.get().photos.length===3&&You.get().photos.every(x=>x.check),null,{timeout:15000}); await p.waitForTimeout(300);
 want(tag+' the one you lead with, and a card for each', !!(await p.$('.hero img.hv'))&&(await p.$$('.shot')).length===3&&!(await p.$('.seg [data-lead]')));
 const ids=await p.evaluate(()=>You.get().photos.map(x=>x.id));
 want(tag+' no details until you tap a card', !(await p.$('#detail')));
 await p.click(`[data-open="${ids[1]}"]`); await p.click(`[data-st="${ids[1]}|keeper"]`); await p.click(`[data-role="${ids[1]}|Working class"]`);
 want(tag+' tap a card: its details; your words show on the card', !!(await p.$('#detail'))&&/Working class/.test(await p.innerText(`.shot[data-open="${ids[1]}"]`))&&/KEEP/.test(await p.innerText(`.shot[data-open="${ids[1]}"]`)));
 await p.click(`#detail [data-main="${ids[1]}"]`); want(tag+' LEAD WITH THIS ONE', await p.evaluate(i=>You.get().primary===i,ids[1]));
 await shot('front');
 await p.click('#detail [data-open]'); want(tag+' CLOSE folds it away', !(await p.$('#detail')));
 // shoot
 await p.click('#shoot'); await p.waitForTimeout(1500);
 want(tag+' the camera on, and it says so', /CAMERA ON · NOT RECORDING/.test(await p.innerText('#hotbar'))&&await p.evaluate(()=>!!__hs.SH.stream&&!__hs.SH.stream.getAudioTracks().length));
 want(tag+' 5 seconds and sound off to start', await p.evaluate(()=>__hs.SH.len===5&&__hs.SH.sound===false&&__hs.SH.timer===3));
 await shot('shoot');
 await p.click('[data-o="len"][data-v="3"]'); await p.click('[data-o="timer"][data-v="0"]');
 await p.click('[data-o="sound"][data-v="true"]'); await p.waitForTimeout(1200);
 want(tag+' sound on: the mic on too, and it says so', await p.evaluate(()=>__hs.SH.stream.getAudioTracks().length===1)&&/CAMERA AND MIC/.test(await p.innerText('#hotbar')));
 await p.click('[data-o="sound"][data-v="false"]'); await p.waitForTimeout(1200);
 want(tag+' sound off again: the mic off', await p.evaluate(()=>__hs.SH.stream.getAudioTracks().length===0));
 await p.click('#shgo'); await p.waitForTimeout(700);
 want(tag+' recording, and it says so', /RECORDING/.test(await p.innerText('#hotbar'))&&!/NOT RECORDING/.test(await p.innerText('#hotbar'))&&!(await p.$eval('#shclock',e=>e.hidden)));
 await p.waitForFunction(()=>__hs.SH&&__hs.SH.stage==='review',null,{timeout:8000}); await p.waitForTimeout(600);
 const rv=await p.evaluate(()=>({secs:__hs.SH.secs,frames:__hs.SH.frames.length,loop:document.getElementById('shr').loop,on:!!__hs.SH.stream}));
 want(tag+' it stops by itself at 3 s, plays on a loop, the camera off', rv.secs<=3.6&&rv.secs>=2.5&&rv.loop&&!rv.on&&!(await p.evaluate(()=>{ const h=document.getElementById('hotbar'); return !!h&&/CAMERA/.test(h.textContent); })), rv);
 want(tag+' ten frames to pick from', rv.frames>=9, rv);
 await p.click('[data-f="4"]'); want(tag+' a frame picked', /Frame 5 is kept as a still/.test(await p.innerText('#shpicked')));
 await shot('review');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#shfile')]);
 want(tag+' SAVE THE FILE', /live_headshot_\d{4}-\d\d-\d\d\.(webm|mp4)$/.test(dl.suggestedFilename()), dl.suggestedFilename());
 want(tag+' nothing kept before KEEP', await p.evaluate(()=>!You.get().live&&You.get().photos.length===3));
 await p.click('#shkeep'); await p.waitForFunction(()=>!!You.get().live,null,{timeout:5000}); await p.waitForTimeout(900);
 const y=await p.evaluate(()=>{ const d=You.get(); const st=d.photos.find(x=>x.id===d.live.still); return {lead:d.lead,sound:d.live.sound,still:!!st&&st.fromLive,n:d.photos.length,primary:d.primary}; });
 want(tag+' KEEP: the live one leads, no sound, the frame with your headshots', y.lead==='live'&&y.sound===false&&y.still&&y.n===4&&y.primary===ids[1], y);
 want(tag+' the overlay closed, the camera off', await p.evaluate(()=>!document.getElementById('lsov')||document.getElementById('lsov').hidden)&&await p.evaluate(()=>!__hs.SH));
 await p.waitForFunction(()=>{ const v=document.querySelector('.hero video'); return v&&v.readyState>=2; },null,{timeout:5000}).catch(()=>{});
 want(tag+' the hero plays it on a loop, with the badge', await p.evaluate(()=>{ const v=document.querySelector('.hero video'); return !!v&&v.loop&&v.muted&&/^blob:/.test(v.src); })&&/LIVE · 0:0\d LOOP/.test(await p.innerText('.hero')));
 want(tag+' the still kept from it, marked', /FROM THE LIVE ONE/.test(await p.innerText('.shots')));
 want(tag+' the live one row', /The live one/.test(await p.innerText('#liverow'))&&/no sound/.test(await p.innerText('#liverow')));
 await p.waitForTimeout(500); await shot('live');
 await p.click('[data-lead="still"]'); want(tag+' STILL: your still leads', await p.evaluate(()=>You.get().lead==='still')&&!!(await p.$('.hero img.hv')));
 await p.click('[data-lead="live"]'); want(tag+' LIVE again', await p.evaluate(()=>You.leadsLive()));
 if(tag==='computer'){
  // your page plays it where your headshot shows
  const hp=await c.newPage(); hp.on('pageerror',e=>errs.push('hub '+e.message)); await hp.goto('http://localhost:8811/hub/'); await hp.waitForTimeout(1500);
  const html=await hp.evaluate(async()=>packageHTML(Object.assign({profile:{name:'Riley Hart'},credits:[],head:{u:'data:image/jpeg;base64,AAAA',t:'image/jpeg'}},await pkgExtras())));
  want(tag+' YOUR PAGE: the live one plays where your headshot shows, the still as its poster', /<video class="hs" src="data:video\/[a-z0-9]+;base64,[^"]+" poster="data:image\/jpeg;base64,AAAA" autoplay muted loop playsinline/.test(html)&&!/class="hssound"/.test(html), html.slice(html.indexOf('class="port"'),html.indexOf('class="port"')+200));
  await hp.evaluate(()=>You.setLead('still')); const h2=await hp.evaluate(async()=>packageHTML(Object.assign({profile:{name:'Riley Hart'},credits:[],head:{u:'data:image/jpeg;base64,AAAA',t:'image/jpeg'}},await pkgExtras())));
  want(tag+' STILL: your page gets the still', !/<video class="hs"/.test(h2)&&/<img class="hs"/.test(h2)); await hp.evaluate(()=>You.setLead('live')); await hp.close();
  // the postcard: the still, or moving
  const pc=await c.newPage(); pc.on('pageerror',e=>errs.push('picture '+e.message));
  await pc.addInitScript(()=>{ const o=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(this.download){ (window.__dl=window.__dl||[]).push(this.download); return; } return o.call(this); }; });
  await pc.goto('http://localhost:8811/picture/'); const qid=await pc.evaluate(i=>{ You.set('name','Riley Hart'); const q=Viz.plugAdd({kind:'headshot',title:'New headshot',text:'A new headshot. Same me.'}); Viz.plugSet(q.id,{you:i}); return q.id; },ids[1]);
  await pc.goto('http://localhost:8811/picture/?card='+qid); await pc.waitForTimeout(1500);
  want(tag+' THE POSTCARD: Moving, ticked because the live one leads', !!(await pc.$('[data-moving]'))&&await pc.isChecked('[data-moving]'));
  const px=async()=>pc.$eval('#c_cv',cv=>{ const x=cv.getContext('2d'), d=x.getImageData(0,0,cv.width,cv.height).data; let s=0; for(let i=0;i<d.length;i+=4000) s+=d[i]+d[i+1]*3+d[i+2]*7; return s; });
  const f1=await px(); await pc.waitForTimeout(700); const f2=await px();
  want(tag+' the card moves in the preview', f1!==f2, [f1,f2]);
  if(SHOTS) await pc.screenshot({path:SHOTS+'/'+tag+'_postcard.png'});
  await pc.click('#c_save'); await pc.waitForFunction(()=>(window.__dl||[]).length>0,null,{timeout:15000}).catch(()=>{});
  want(tag+' SAVE THE CARD: a short video', /^card-new-headshot-square\.(mp4|webm)$/.test((await pc.evaluate(()=>window.__dl||[]))[0]||''), await pc.evaluate(()=>window.__dl));
  await pc.uncheck('[data-moving]'); await pc.waitForTimeout(600); await pc.evaluate(()=>window.__dl=[]); await pc.click('#c_save'); await pc.waitForTimeout(800);
  want(tag+' untick Moving: the still, as a picture', /^card-new-headshot-square\.png$/.test((await pc.evaluate(()=>window.__dl||[]))[0]||''), await pc.evaluate(()=>window.__dl));
  await pc.close();
 }
 // folded plan
 await p.click('.fold[data-t="plan"]'); want(tag+' THE PLAN opens, with the way back', !!(await p.$('[data-want]'))&&!!(await p.$('.backbar [data-t="photos"]')));
 await shot('plan');
 await p.click('.backbar [data-t="brief"]'); want(tag+' FOR THE PHOTOGRAPHER', !!(await p.$('#bdl')));
 await p.click('.backbar [data-t="photos"]'); want(tag+' back to your headshots', !!(await p.$('.hero')));
 want(tag+' no sideways scroll', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
 want(tag+' no em dashes', !/—/.test(await p.innerText('body')));
 await p.click('#lrm'); await p.waitForTimeout(300); want(tag+' remove the live one: the still leads', await p.evaluate(()=>!You.get().live&&You.get().lead==='still')&&!(await p.$('#liverow')));
 want(tag+' no page errors', !errs.length, errs);
 await c.close();
};
await run(390,844,'dark','phone'); await run(1280,900,'light','computer');
await b.close(); fs.rmSync(T,{recursive:true,force:true}); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
