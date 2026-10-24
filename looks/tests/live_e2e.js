/* LOOKS front and LIVE LOOKS, made-up looks and a fake camera. Server on :8811.
   Your looks as cards (an example when there are none); one look with STILL | LIVE; SHOOT A LIVE ONE (shared/liveshot.js),
   a frame kept on the look and with your headshots; the look book plays it, with a SOUND button when it has sound,
   and prints the still; your page plays it too.  NODE_PATH=$(npm root -g) node looks/tests/live_e2e.js [shots-dir] */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), os=require('os');
const A=path.join(__dirname,'look_a.jpg'), B=path.join(__dirname,'look_b.jpg'); const SHOTS=process.argv[2]||'';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const run=async(vw,vh,scheme,tag)=>{
 const c=await b.newContext({viewport:{width:vw,height:vh},colorScheme:scheme,acceptDownloads:true}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
 await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 const shot=async n=>{ if(SHOTS) await p.screenshot({path:SHOTS+'/lk_'+tag+'_'+n+'.png',fullPage:true}); };
 await p.goto('http://localhost:8811/looks/sw.js'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_looks'); indexedDB.deleteDatabase('theactorpage_you'); });
 await p.goto('http://localhost:8811/looks/'); await p.waitForTimeout(500);
 want(tag+' nothing yet: one way in, an example, no book', !!(await p.$('#example'))&&!!(await p.$('#addOpen'))&&!(await p.$('#bookGo')));
 want(tag+' the header icon does not move', await p.evaluate(()=>[...document.querySelectorAll('.lico *')].every(e=>getComputedStyle(e).animationName==='none')));
 await shot('empty');
 await p.evaluate(()=>{ You.set('name','Riley Hart'); You.set('rep','Northgate Talent'); });
 await p.click('#addOpen'); await p.fill('#a_n','Dad on a Saturday'); await p.click('#a_go'); await p.waitForTimeout(400);
 want(tag+' a new look: no STILL | LIVE until there is a live one; live is optional', !(await p.$('[data-lead]'))&&/Live is optional/.test(await p.innerText('main')));
 await p.setInputFiles('#l_pic',[A,B]); await p.waitForTimeout(800); await p.fill('#l_spots','Cereal, minivans, insurance'); await p.press('#l_spots','Tab');
 await p.fill('#sk_n','Riding a bike, no hands'); await p.click('#sk_go'); await p.waitForTimeout(300);
 const id=await p.evaluate(()=>Looks.all()[0].id);
 await p.click('#shoot'); await p.waitForTimeout(1400);
 want(tag+' SHOOT A LIVE ONE: the camera on, says so, sound off to start', /CAMERA ON · NOT RECORDING/.test(await p.innerText('#hotbar'))&&await p.evaluate(()=>LiveShot.cur&&LiveShot.cur.sound===false&&LiveShot.cur.len>=3)&&/LOOKS · DAD ON A SATURDAY/.test(await p.textContent('#lsov')));
 await p.click('[data-o="len"][data-v="3"]'); await p.click('[data-o="timer"][data-v="0"]'); await p.click('[data-o="sound"][data-v="true"]'); await p.waitForTimeout(1200);
 want(tag+' sound on: the mic too', /CAMERA AND MIC/.test(await p.innerText('#hotbar')));
 await p.click('#shgo'); await p.waitForFunction(()=>LiveShot.cur&&LiveShot.cur.stage==='review',null,{timeout:9000}); await p.waitForTimeout(500);
 await p.click('[data-f="3"]'); if(SHOTS) await p.screenshot({path:SHOTS+'/lk_'+tag+'_review.png'});
 want(tag+' nothing kept before KEEP', await p.evaluate(i=>!Looks.get(i).live,id));
 await p.click('#shkeep'); await p.waitForFunction(i=>!!Looks.get(i).live,id,{timeout:6000}); await p.waitForTimeout(900);
 const st=await p.evaluate(i=>{ const l=Looks.get(i), y=You.get(), ph=y.photos.find(x=>'you:'+x.id===l.photos[2]); return {lead:l.lead,sound:l.live.sound,photos:l.photos.length,fromLive:!!ph&&ph.fromLive,you:y.photos.length}; },id);
 want(tag+' KEEP: the live one leads, with sound; the frame on the look and with your headshots', st.lead==='live'&&st.sound===true&&st.photos===3&&st.fromLive&&st.you===1, st);
 want(tag+' the camera off after', await p.evaluate(()=>!LiveShot.cur&&!(document.getElementById('hotbar')&&/CAMERA/.test(document.getElementById('hotbar').textContent))));
 want(tag+' the look plays it, a LIVE badge, SOUND OFF to start', await p.evaluate(()=>{ const v=document.querySelector('.hero video'); return !!v&&v.loop&&v.muted&&/^blob:/.test(v.src); })&&/LIVE · 0:0\d LOOP/.test(await p.innerText('.hero'))&&(await p.innerText('#hear'))==='SOUND OFF');
 await p.click('#hear'); want(tag+' SOUND ON', await p.evaluate(()=>!document.querySelector('.hero video').muted)&&(await p.innerText('#hear'))==='SOUND ON');
 await p.waitForTimeout(500); await shot('look');
 await p.click('[data-lead="still"]'); await p.waitForTimeout(300); want(tag+' STILL: the main photo leads', await p.evaluate(i=>Looks.get(i).lead==='still',id)&&!!(await p.$('.hero img.hv'))&&!(await p.$('.hero video')));
 await p.click('[data-lead="live"]'); await p.waitForTimeout(300);
 await p.click('#livepic'); want(tag+' tap the live one: save, shoot new, take it off', !(await p.$eval('#liveAct',e=>e.classList.contains('hide')))&&/with sound/.test(await p.innerText('#liveAct')));
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lsave')]);
 want(tag+' SAVE THE FILE', /^Riley_Hart_live_look_Dad_on_a_Saturday_\d{4}-\d\d-\d\d\.(webm|mp4)$/.test(dl.suggestedFilename()), dl.suggestedFilename());
 await p.click('#save'); await p.waitForTimeout(600);
 want(tag+' your looks: the card plays it, LIVE', await p.evaluate(()=>!!document.querySelector('.lk .lpic video'))&&/LIVE/.test(await p.innerText('.lk .lpic'))&&/A LIVE ONE/.test(await p.innerText('.lk')));
 want(tag+' the book preview, beside your looks', (await p.$$('.btiles .bt video')).length===1);
 await p.waitForTimeout(400); await shot('list');
 await p.click('#bookGo'); await p.waitForTimeout(1200);
 const html=await p.$eval('#bookf',f=>f.srcdoc);
 want(tag+' THE LOOK BOOK: it plays, the main photo as its poster, a SOUND button', /<video class="main" src="blob:[^"]+" poster="blob:[^"]+" autoplay muted loop playsinline/.test(html)&&/class="snd"[^>]*>SOUND OFF</.test(html));
 want(tag+' printed: the still', /@media print\{[^}]*\.lv\{|\.lv\{display:none!important\}|\.lbx,\.dot,\.lv\{display:none!important\}/.test(html)&&/<img class="main pr" src="blob:/.test(html));
 const [zd]=await Promise.all([p.waitForEvent('download'),p.click('#zip')]); const zp=path.join(os.tmpdir(),'lk_live_'+tag+'.zip'); await zd.saveAs(zp);
 const z=require(path.join(__dirname,'../../shared/zipw.js')); const files=z.read(new Uint8Array(fs.readFileSync(zp))); const page=new TextDecoder().decode(files.find(x=>x.name==='lookbook/lookbook.html').data);
 want(tag+' saved: the live one goes in the folder as a file', /<video class="main" src="media\/\d+\.(webm|mp4)"/.test(page)&&files.some(x=>/media\/\d+\.(webm|mp4)$/.test(x.name)), files.map(x=>x.name));
 // your page
 if(tag==='computer'){ const hp=await c.newPage(); hp.on('pageerror',e=>errs.push('hub '+e.message)); await hp.goto('http://localhost:8811/hub/'); await hp.waitForTimeout(1500);
  const h2=await hp.evaluate(async()=>packageHTML(Object.assign({profile:{name:'Riley Hart'},credits:[]},await pkgExtras())));
  want(tag+' YOUR PAGE: the look plays there too, with SOUND', /<video class="lkmain" src="data:video\/[a-z0-9]+;base64,[^"]+" poster="data:image/.test(h2)&&/class="hssound"/.test(h2)); await hp.close(); }
 await p.goto('http://localhost:8811/looks/?l='+id); await p.waitForTimeout(800);
 await p.click('#livepic'); await p.click('#lrm'); await p.waitForTimeout(600);
 want(tag+' take the live one off: the still, no switch; the frame stays a photo', await p.evaluate(i=>!Looks.get(i).live&&Looks.get(i).lead==='still'&&Looks.get(i).photos.length===3,id)&&!(await p.$('[data-lead]')));
 want(tag+' no sideways scroll', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
 want(tag+' no em dashes', !/—/.test(await p.innerText('body')));
 want(tag+' no page errors', !errs.length, errs);
 await c.close();
};
await run(390,844,'dark','phone'); await run(1280,900,'light','computer');
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
