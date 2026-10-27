/* FOOTAGE: add, cut, send (Col, Oct 27: "click several clips on my machine... available to view, to clip, to string
   together, and to send"). A first visit leads with ADD YOUR CLIPS and says nothing is uploaded; several at once, a
   row each, what they're from if you say; MAKE IT ONE FILE for a put-together (straight cuts, 540p, FULL QUALITY only
   when every original is linked, your name at the start only when you switch it on); SEND IT opens the share sheet
   with the file, or saves it where there is none. Made-up clips (Salt Road), made-up actor (Sam Actor).
   Computer light (no share sheet: saves), phone dark (a share sheet). Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs'), os=require('os');
const GOOD=path.join(__dirname,'fixtures','map','Black SSD','SALT ROAD','DAY 2','SALT_ROAD_EP3_SC12_T04.webm'), BUF=fs.readFileSync(GOOD);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs,share] of [['computer',{width:1280,height:900},'light',false],['phone',{width:390,height:844},'dark',true]]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,acceptDownloads:true});
 await c.addInitScript(sh=>{ try{ window.showDirectoryPicker=undefined; }catch(e){}
   window.__shared=[];
   if(sh){ navigator.canShare=o=>!!(o&&o.files&&o.files.length); navigator.share=async o=>{ window.__shared.push(o.files.map(f=>f.name+':'+f.size+':'+f.type)); }; }
   else { try{ Object.defineProperty(navigator,'canShare',{value:undefined,configurable:true}); Object.defineProperty(navigator,'share',{value:undefined,configurable:true}); }catch(e){} } }, share);
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/footage/'); await p.evaluate(async()=>{ localStorage.clear(); await new Promise(r=>{ const q=indexedDB.deleteDatabase('theactorpage_footage_lib'); q.onsuccess=q.onerror=q.onblocked=r; }); You.set('name','Sam Actor'); You.set('rep','North Star Talent'); }); await p.reload(); await p.waitForTimeout(500);
 let v=await p.innerText('#view');
 want(nm+': a first visit leads with ADD YOUR CLIPS, as many as you want; nothing uploaded', !!(await p.$('.card.first #addvids0'))&&/Bring in your clips\. Pick as many as you want\./.test(v)&&/Nothing is uploaded anywhere/.test(v)&&/make it one file and send it/.test(v), v.slice(0,300));
 await p.setInputFiles('#addvids0',[{name:'dock_scene.webm',mimeType:'video/webm',buffer:BUF},{name:'the_car.webm',mimeType:'video/webm',buffer:BUF},{name:'notes.webm',mimeType:'video/webm',buffer:Buffer.from('not a video')}]);
 await p.waitForSelector('#batchrows',{timeout:5000}).catch(()=>{});
 v=await p.innerText('#view');
 want(nm+': several at once: a row each, says it is making small copies, kept here', /Bringing in 3 clips/i.test(v)&&(await p.$$eval('.brow',x=>x.length))===3&&/Kept on this device\. Nothing is uploaded\./.test(v), v.slice(0,300));
 await p.fill('#b_title','Salt Road');
 await p.waitForFunction(()=>FOOTAGE.state.view==='lib',null,{timeout:60000}).catch(()=>{}); await p.waitForTimeout(400);
 v=await p.innerText('#view');
 want(nm+': done: two in the library, the one a browser can\'t play says so', /2 clips in your library; 1 a browser can.t play/.test(v), v.slice(0,300));
 want(nm+': what they are from goes on them', /Salt Road[\s\S]*dock_scene\.webm/.test(v)&&/Salt Road[\s\S]*the_car\.webm/.test(v));
 const keys=await p.evaluate(()=>FOOTAGE.pieces().filter(x=>x.proxy).map(x=>x.key));
 want(nm+': both play here', keys.length===2, keys);

 /* SEND IT a piece */
 await p.click('[data-piece="'+keys[0]+'"]'); await p.waitForTimeout(600);
 if(share){ await p.click('#sendit'); await p.waitForTimeout(500);
   const sh=await p.evaluate(()=>window.__shared); want(nm+': SEND IT on a piece: the share sheet, with the file', sh.length===1&&/\.webm:\d+:video\/webm/.test(sh[0][0])&&/Sent from your share sheet/.test(await p.innerText('#view')), sh); }
 else { const dl=p.waitForEvent('download',{timeout:8000}); await p.click('#sendit'); const d=await dl;
   want(nm+': SEND IT with no share sheet: saves the file and says to attach it', /\.webm$/.test(d.suggestedFilename())&&/Saved to this device\. Attach it/.test(await p.innerText('#view')), d.suggestedFilename()); }

 /* a put-together */
 await p.evaluate(k=>{ const s=FootMap.addSet('Salt Road, the dock'); FootMap.toggleIn(s.id,k[0]); FootMap.toggleIn(s.id,k[1]); FOOTAGE.go('set',{set:s.id}); },keys); await p.waitForTimeout(500);
 v=await p.innerText('#view');
 want(nm+': a put-together: MAKE IT ONE FILE, two in this order, straight cuts', /Make it one file/i.test(v)&&/2 pieces in this order/.test(v)&&/straight cuts/.test(v)&&!!(await p.$('#one_go')));
 want(nm+': 540P picked; FULL QUALITY off, and says when it works', await p.evaluate(()=>document.querySelector('[data-oq="540"]').classList.contains('on')&&document.querySelector('[data-oq="full"]').disabled)&&/Full quality works when every original is linked/.test(v));
 want(nm+': your name at the start: off, and says what it would show', !(await p.isChecked('#one_cardon'))&&/Your name at the start \(Sam Actor, North Star Talent\)/.test(v));
 await p.click('#one_go'); await p.waitForTimeout(400);
 want(nm+': making it: plays through once, keep the page open', /plays through once while it records/.test(await p.innerText('#onecard'))&&!!(await p.$('#one_bar')));
 await p.waitForFunction(()=>{ const o=FOOTAGE.one(); return o&&o.made; },null,{timeout:30000}).catch(()=>{});
 v=await p.innerText('#view');
 const m1=await p.evaluate(()=>{ const m=FOOTAGE.one().made; return {name:m.name,secs:m.secs,h:m.h,size:m.blob.size,type:m.blob.type}; });
 want(nm+': one file: named for the put-together, about the length of both, 540p', m1.name==='Salt Road, the dock.webm'&&m1.secs>=3.5&&m1.secs<=4.6&&m1.h<=540&&m1.size>2000, m1);
 const real=await p.evaluate(async()=>{ const b=FOOTAGE.one().made.blob, v=document.createElement('video'); v.src=URL.createObjectURL(b); v.muted=true; await new Promise(r=>{ v.onloadedmetadata=r; v.onerror=r; setTimeout(r,5000); }); if(!isFinite(v.duration)){ v.currentTime=1e6; await new Promise(r=>{ v.ontimeupdate=r; setTimeout(r,3000); }); } return {d:v.duration,w:v.videoWidth,h:v.videoHeight}; });
 want(nm+': it really is one video that plays, both clips long', real.d>3&&real.d<6&&real.w>0, real);
 want(nm+': SEND IT and SAVE IT right there', /SEND IT/.test(v)&&/SAVE IT/.test(v)&&/opens your share sheet/.test(v));
 if(share){ await p.click('#one_send'); await p.waitForTimeout(500); const sh=await p.evaluate(()=>window.__shared);
   want(nm+': SEND IT: the share sheet, with the one file', sh.length===2&&/^Salt Road, the dock\.webm:\d+:video\/webm/.test(sh[1][0]), sh); }
 else { const dl=p.waitForEvent('download',{timeout:8000}); await p.click('#one_save'); const d=await dl; const f=path.join(os.tmpdir(),'one_'+Date.now()+'.webm'); await d.saveAs(f); const sz=fs.statSync(f).size; fs.unlinkSync(f);
   want(nm+': SAVE IT: the file, whole', d.suggestedFilename()==='Salt Road, the dock.webm'&&sz===m1.size, [d.suggestedFilename(),sz,m1.size]); }
 /* again, with your name at the start */
 await p.click('#one_again'); await p.waitForTimeout(300); await p.check('#one_cardon'); await p.click('#one_go');
 await p.waitForFunction(()=>{ const o=FOOTAGE.one(); return o&&o.made; },null,{timeout:30000}).catch(()=>{});
 const m2=await p.evaluate(()=>FOOTAGE.one().made.secs);
 want(nm+': your name at the start: a 2.5 second card, only when switched on', Math.abs(m2-(m1.secs+2.5))<0.3, [m1.secs,m2]);
 want(nm+': nothing sideways, plain words', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!/—/.test(await p.innerText('#view')));
 want(nm+': no page errors', !errs.length, errs);
 await p.screenshot({path:'/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/send_'+nm+'.png',fullPage:true});
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
