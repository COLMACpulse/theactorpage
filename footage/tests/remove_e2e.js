/* FOOTAGE: REMOVE, and why a clip won't play (Col, Oct 28: "i need to be able to erase/remove content", and "why did i
   get this message"). A clip a browser can't open says what it is, read from its own bytes: HEVC (an iPhone's High
   Efficiency) gets what to do about it. PICK TO REMOVE picks several, or the ones that don't play; one more tap on the
   page to be sure; their small copies come off this device. One piece: REMOVE FROM FOOTAGE. A take from another tool
   is only taken out of Footage and comes back from REMOVED. Made-up clips (Salt Road). Computer light, phone dark. :8811 */
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
const GOOD=fs.readFileSync(path.join(__dirname,'fixtures','map','Black SSD','SALT ROAD','DAY 2','SALT_ROAD_EP3_SC12_T04.webm'));
/* a made-up iPhone-style file: an MP4 box that says HEVC, nothing a browser can decode */
const HEVC=Buffer.concat([Buffer.from([0,0,0,20]),Buffer.from('ftypqt  '),Buffer.from([0,0,0,0]),Buffer.from('qt  '),Buffer.alloc(64),Buffer.from('moov....trak....stsd....hvc1'),Buffer.alloc(4096)]);
const SP='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>{ errs.push('a browser dialog: '+d.message()); d.dismiss(); });
 await p.goto('http://localhost:8811/footage/'); await p.evaluate(async()=>{ localStorage.clear(); for(const n of ['theactorpage_footage_lib','theactorpage_takes']) await new Promise(r=>{ const q=indexedDB.deleteDatabase(n); q.onsuccess=q.onerror=q.onblocked=r; }); }); await p.reload(); await p.waitForTimeout(500);
 await p.evaluate(async b64=>{ const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); await Takes.put(new Blob([u],{type:'video/webm'}),{kind:'video',mime:'video/webm',ext:'webm',name:'Salt Road self-tape',secs:1.5,for:{type:'selftape',title:'Salt Road'}}); },GOOD.toString('base64'));
 await p.reload(); await p.waitForTimeout(500);
 await p.setInputFiles('#addvids',[{name:'dock_scene.webm',mimeType:'video/webm',buffer:GOOD},{name:'the_car.webm',mimeType:'video/webm',buffer:GOOD},{name:'IMG_4471.MOV',mimeType:'video/quicktime',buffer:HEVC}]);
 await p.waitForFunction(()=>FOOTAGE.scan()&&!FOOTAGE.scan().busy,null,{timeout:30000}).catch(()=>{}); await p.waitForTimeout(200);
 want(nm+': the iPhone one is read as HEVC before anything is kept', /NEEDS WORK · 1/.test(await p.innerText('#view'))&&/IMG_4471\.MOV/.test(await p.innerText('#view'))&&/HEVC, what an iPhone records/.test(await p.innerText('#view')));
 for(const nm2 of ['dock_scene.webm','the_car.webm']) await p.check('[aria-label="'+nm2+'"]');
 await p.click('#sc_local');
 await p.waitForFunction(()=>FOOTAGE.state.view==='lib',null,{timeout:90000}).catch(()=>{}); await p.waitForTimeout(400);
 let v=await p.innerText('#view');
 want(nm+': brought in: the 2 that play', /2 clips in your library\./.test(v), v.slice(0,300));
 /* a file on a drive a browser can't play, already on the map from before */
 await p.evaluate(()=>{ const d=FootMap.read(), pl=d.places.find(x=>x.device); pl.files.push({p:'On this device/IMG_4471.MOV',s:4200,d:'2026-10-28'}); localStorage.setItem(FootMap.KEY,JSON.stringify(d)); FootMap.setMeta(FootMap.fkey(pl.id,'On this device/IMG_4471.MOV'),{cant:true,why:{c:'MOV',v:'HEVC'}}); FOOTAGE.go('lib'); }); await p.waitForTimeout(300);
 const keyOf=name=>p.evaluate(n=>FOOTAGE.pieces().find(x=>x.name===n).key,name);
 const kH=await keyOf('IMG_4471.MOV'), kD=await keyOf('dock_scene.webm'), kC=await keyOf('the_car.webm'), kT=await keyOf('Salt Road self-tape');

 /* why it won't play */
 await p.click('[data-piece="'+kH+'"]'); await p.waitForTimeout(400);
 v=await p.innerText('#nostage');
 want(nm+': why: it\'s HEVC, from an iPhone\'s High Efficiency setting, read from the file', /It.s HEVC, what an iPhone records on its default "High Efficiency" setting/.test(v), v);
 want(nm+': what to do: add it on the iPhone, or export H.264; Most Compatible for next time', /open Footage on the iPhone it came from and add it there/.test(v)&&/export H\.264/.test(v)&&/Most Compatible/.test(v));
 await p.click('#back'); await p.waitForTimeout(300);

 /* a put-together with two pieces, so a removal takes it out of there too */
 await p.evaluate(k=>{ const s=FootMap.addSet('Salt Road, the dock'); FootMap.toggleIn(s.id,k[0]); FootMap.toggleIn(s.id,k[1]); },[kD,kC]);
 await p.evaluate(()=>FOOTAGE.go('lib')); await p.waitForTimeout(300);

 /* PICK TO REMOVE */
 await p.click('#pick'); await p.waitForTimeout(200);
 want(nm+': PICK TO REMOVE: every piece gets a tick, nothing picked yet, REMOVE off', (await p.$$('.tile.picking .tick')).length===4&&await p.isDisabled('#rm_go')&&/Tap the pieces to remove/.test(await p.innerText('#selbar')));
 await p.click('#rm_bad'); await p.waitForTimeout(200);
 want(nm+': PICK THE 1 THAT DON\'T PLAY picks just the iPhone one', (await p.$$('.tile.picked')).length===1&&!!(await p.$('.tile.picked[data-piece="'+kH+'"]')));
 await p.click('[data-piece="'+kC+'"]'); await p.waitForTimeout(200);
 want(nm+': tap another to pick it too; tapping does not open it', (await p.$$('.tile.picked')).length===2&&await p.evaluate(()=>FOOTAGE.state.view==='lib'));
 await p.click('#rm_go'); await p.waitForTimeout(200);
 v=await p.innerText('#selbar');
 want(nm+': one more tap, on the page: what goes and what stays', /Remove 2 pieces from Footage\?/.test(v)&&/the originals stay where they are on your computer/.test(v)&&!!(await p.$('#rm_yes')));
 await p.click('#rm_no'); await p.waitForTimeout(200);
 want(nm+': KEEP THEM: nothing removed', await p.evaluate(()=>FOOTAGE.pieces().length)===4);
 await p.click('#rm_go'); await p.click('#rm_yes'); await p.waitForTimeout(500);
 const st=await p.evaluate(async k=>({n:FOOTAGE.pieces().length,names:FOOTAGE.pieces().map(x=>x.name).sort().join(','),copy:!!(await FootLib.proxy.get(k[0])),thumb:!!(await FootLib.thumb.get(k[0])),inSet:FootMap.sets()[0].items.indexOf(k[0])>=0,dev:FootMap.places().find(x=>x.device).files.length}),[kC]);
 want(nm+': removed: the two are gone, the rest stay', st.n===2&&st.names==='Salt Road self-tape,dock_scene.webm', st);
 want(nm+': its small copy and picture are off this device, and out of the put-together', !st.copy&&!st.thumb&&!st.inSet&&st.dev===1, st);
 v=await p.innerText('#view');
 want(nm+': it says so, and picking is over', /Removed 2 pieces from Footage\./.test(v)&&!(await p.$('#selbar')));

 /* one piece: a take from another tool, out of Footage only */
 await p.click('[data-piece="'+kT+'"]'); await p.waitForTimeout(400);
 await p.click('#rm1'); await p.waitForTimeout(200);
 v=await p.innerText('#rmone');
 want(nm+': REMOVE FROM FOOTAGE on a take: it stays in the tool it came from, can come back', /The take stays in the tool it came from/.test(v)&&/come back from REMOVED/.test(v));
 await p.click('#rm1_yes'); await p.waitForTimeout(500);
 want(nm+': out of the library; the take itself is still kept', await p.evaluate(()=>FOOTAGE.pieces().length)===1&&await p.evaluate(()=>Takes.all().length)===1);
 if(nm==='phone'){ const f=await p.$('#rmfold'); if(f) await f.evaluate(d=>d.open=true); }
 else await p.click('#rmfold summary');
 await p.waitForTimeout(200);
 want(nm+': REMOVED · 1, with BRING IT BACK', /REMOVED · 1/.test(await p.innerText('#rmfold'))&&!!(await p.$('[data-back="'+kT+'"]')));
 await p.screenshot({path:SP+'/remove_'+nm+'.png',fullPage:true});
 await p.click('[data-back="'+kT+'"]'); await p.waitForTimeout(300);
 want(nm+': BRING IT BACK: in the library again', await p.evaluate(()=>FOOTAGE.pieces().length)===2&&!(await p.$('#rmfold')));

 /* one piece you added: gone from here */
 await p.click('[data-piece="'+kD+'"]'); await p.waitForTimeout(400); await p.click('#rm1'); await p.waitForTimeout(200);
 want(nm+': on a clip you added: the original stays on your computer', /Your original stays where it is on your computer/.test(await p.innerText('#rmone')));
 await p.click('#rm1_yes'); await p.waitForTimeout(400);
 want(nm+': gone, and not in REMOVED', await p.evaluate(()=>FOOTAGE.pieces(true).filter(x=>x.name==='dock_scene.webm').length)===0&&!(await p.$('#rmfold')));
 want(nm+': nothing sideways, plain words, no browser pop-ups, no errors', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!/—/.test(await p.innerText('body'))&&!errs.length, errs);
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
