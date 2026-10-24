/* REEL ROOM front: start from the role. Made-up moments and a made-up clip. Server on :8811.
   The front (role box, your moments by your words, your reels, your shoot list, KEEP IT SAFE); paste a role: what you have
   footage for (lit in the role) and what you don't, each with MY WORD COVERS IT / ADD TO SHOOT LIST / A SCENE TO SHOOT;
   BUILD a cut; FROM YOUR FOOTAGE uses a clip from Footage where it is, not copied again.
   NODE_PATH=$(npm root -g) node archbook/tests/front_e2e.js [shots-dir] */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'); const SHOTS=process.argv[2]||'';
const ROLE='[SHERIFF] 40s-50s. Weathered small-town sheriff with quiet authority and a dry sense of humor. Menacing when pushed.';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const clip=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','made_up_clip.mp4')).toString('base64');
const run=async(vw,vh,scheme,tag)=>{
 const c=await b.newContext({viewport:{width:vw,height:vh},colorScheme:scheme}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 const shot=async n=>{ if(SHOTS) await p.screenshot({path:SHOTS+'/rr_'+tag+'_'+n+'.png',fullPage:true}); };
 await p.goto('http://localhost:8811/archbook/sw.js'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('archbook_v03'); indexedDB.deleteDatabase('theactorpage_takes'); });
 await p.goto('http://localhost:8811/archbook/'); await p.waitForFunction(()=>window.ARCHBOOK&&ARCHBOOK.S.lib,null,{timeout:8000}); await p.waitForTimeout(300);
 const t0=await p.innerText('#main');
 want(tag+' the front starts from the role, says how it works, no tabs', /A ROLE CAME IN/.test(t0)&&/What do you have for it\?/.test(t0)&&!!(await p.$('.how'))&&!(await p.$('nav.tabs'))&&/REEL ROOM/.test(await p.innerText('header')));
 want(tag+' the header icon does not move', await p.evaluate(()=>[...document.querySelectorAll('.hico *')].every(e=>getComputedStyle(e).animationName==='none')));
 want(tag+' no old words: archetype, opener, button, PACK', !/archetype|opener|\bbutton\b|\bPACK\b/i.test(await p.innerText('body')));
 await shot('empty');
 // made-up moments
 await p.evaluate(()=>{ const L=ARCHBOOK.S.lib, cv=document.createElement('canvas'); cv.width=160; cv.height=90; const x=cv.getContext('2d');
  const th=col=>{ x.fillStyle=col; x.fillRect(0,0,160,90); x.fillStyle='#fff'; x.fillRect(60,20,40,50); return cv.toDataURL('image/jpeg',.7); };
  L.clips.push({id:'c1',name:'made_up_scene.mp4',size:1000,dur:120,w:1280,h:720,playable:true,thumb:th('#556')});
  const add=(lab,col)=>{ const k=ARCHBOOK.E.addTag(L.tags,lab); return k; };
  const m=(i,o,tags,col,extra)=>L.moments.push(Object.assign({id:'m'+i,clip:'c1',in:i,out:o,tags:tags.map(t=>add(t)),open:false,button:false,label:'Moment '+i,thumb:th(col)},extra||{}));
  m(1,9,['Lawman','authority'],'#835',{open:true}); m(10,19,['Lawman'],'#358'); m(20,31,['Dad, worn out','weathered'],'#583'); m(32,40,['Dad, worn out'],'#538',{button:true}); m(41,48,[],'#333');
  ARCHBOOK.save(); ARCHBOOK.act('tab',{t:'home'}); });
 await p.waitForTimeout(400);
 const lanes=await p.$$eval('.lanerow .ln',x=>x.map(e=>e.firstChild.textContent.trim()));
 want(tag+' your moments by your words, the untagged last', lanes[0]==='Lawman'&&lanes.includes('Dad, worn out')&&lanes[lanes.length-1]==='Not tagged yet', lanes);
 await shot('front');
 await p.click('.lanerow[data-v="lawman"], .lanerow >> nth=0'); await p.waitForTimeout(300);
 want(tag+' a lane opens those moments, with the way back', /YOUR MOMENTS/.test(await p.innerText('.backbar'))&&(await p.$$('.moment')).length===2&&/A good first moment/.test(await p.innerText('#main')));
 await p.click('.backbar [data-t="home"]'); await p.waitForTimeout(200);
 await p.click('[data-a="domatch"]'); await p.waitForTimeout(300); want(tag+' nothing pasted: it asks', await p.evaluate(()=>ARCHBOOK.S.tab==='home'));
 await p.fill('#bdtext',ROLE); await p.click('[data-a="domatch"]'); await p.waitForTimeout(500);
 const lit=await p.$$eval('.roletext .hi',x=>x.map(e=>e.textContent.toLowerCase())), no=await p.$$eval('.roletext .no',x=>x.map(e=>e.textContent.toLowerCase()));
 want(tag+' FOR A ROLE: the role with what you have lit', lit.some(t=>/authority/.test(t))&&lit.some(t=>/weathered/.test(t)), {lit,no});
 const mt=await p.innerText('#main');
 want(tag+' what you have, with your words; what you don\'t, with three ways', /YOU HAVE FOOTAGE FOR/.test(mt)&&/your word/.test(mt)&&/NO FOOTAGE YET/.test(mt)&&/MY WORD COVERS IT/.test(mt)&&/ADD TO SHOOT LIST/.test(mt)&&/A SCENE TO SHOOT/.test(mt)&&!/%/.test(mt), mt.slice(0,600));
 await shot('role');
 const miss=await p.$$eval('.mrow.miss [data-a="want"]',x=>x.map(e=>e.dataset.k));
 await p.click('.mrow.miss [data-a="want"] >> nth=0'); await p.waitForTimeout(300);
 want(tag+' ADD TO SHOOT LIST', await p.evaluate(k=>ARCHBOOK.S.lib.wants.some(w=>w.key===k),miss[0])&&/ON YOUR SHOOT LIST/.test(await p.innerText('.mrow.miss >> nth=0')));
 await p.click('.mrow.miss [data-a="scenefor"] >> nth=1'); await p.waitForTimeout(400);
 want(tag+' A SCENE TO SHOOT: a premise sheet, and it goes on your shoot list', !!(await p.$('.sheet.on'))&&/make it yours/i.test(await p.innerText('.sheet'))&&await p.evaluate(()=>ARCHBOOK.S.lib.wants.length===2));
 await p.click('.sheet [data-a="closesheet"] >> nth=0'); await p.waitForTimeout(300);
 await p.click('[data-a="buildreel"][data-s="90"]'); await p.waitForTimeout(500);
 want(tag+' BUILD 1:30: the cut, PLAY IT and MAKE THE FILE', await p.evaluate(()=>ARCHBOOK.S.tab==='reel')&&/PLAY IT/.test(await p.innerText('#main'))&&/MAKE THE FILE/.test(await p.innerText('#main')));
 await p.click('[aria-label="Back to the Reel Room"]'); await p.waitForTimeout(300);
 const fr=await p.innerText('#main');
 want(tag+' back on the front: the reel, the shoot list', (await p.$$('.reelmini')).length===1&&/A SCENE TO SHOOT/.test(await p.innerText('.hr')));
 // FROM YOUR FOOTAGE
 await p.evaluate(async clip=>{ const s=atob(clip),u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); await Takes.put(new Blob([u],{type:'video/mp4'}),{kind:'video',mime:'video/mp4',ext:'mp4',name:'Dust_Road_Sheriff_clip.mp4',secs:6,for:{type:'clip',title:'Dust Road',role:'Sheriff'}}); },clip);
 await p.click('.lhead [data-a="fromfootage"]'); await p.waitForTimeout(400);
 want(tag+' FROM YOUR FOOTAGE: your clips from Footage', /Dust Road/.test(await p.innerText('.sheet'))&&!!(await p.$('.sheet [data-a="usetake"]')));
 await p.click('.sheet [data-a="usetake"]'); await p.waitForFunction(()=>ARCHBOOK.S.lib.clips.some(c=>c.take),null,{timeout:8000}); await p.waitForTimeout(500);
 const media=await p.evaluate(()=>new Promise(res=>{ const r=indexedDB.open('archbook_v03'); r.onsuccess=()=>{ const t=r.result.transaction('media'); const q=t.objectStore('media').getAllKeys(); q.onsuccess=()=>res(q.result); }; }));
 const tk=await p.evaluate(()=>ARCHBOOK.S.lib.clips.find(c=>c.take));
 want(tag+' used where it is: not copied again', !media.includes(tk.id)&&tk.from==='footage', {media,tk:tk.id});
 await p.reload(); await p.waitForFunction(()=>window.ARCHBOOK&&ARCHBOOK.S.lib,null,{timeout:8000}); await p.waitForTimeout(600);
 await p.click('[data-t="clips"]'); await p.waitForTimeout(300);
 { const tx=await p.textContent('#main'), lk=await p.evaluate(()=>{ const c=ARCHBOOK.S.lib.clips.find(x=>x.take); return !!ARCHBOOK.S.urls[c.id]; }); want(tag+' after a reload: it plays from Footage, no re-link', /from your footage/.test(tx)&&lk, tx.slice(0,300)); }
 await p.click('.backbar [data-t="home"]'); await p.click('[data-t="pack"]'); await p.waitForTimeout(300);
 want(tag+' KEEP IT SAFE', /Keep it safe/.test(await p.innerText('#main'))&&/REEL ROOM \d/.test(await p.innerText('#main')));
 want(tag+' no sideways scroll', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
 want(tag+' no em dashes', !/—/.test(await p.innerText('body')));
 want(tag+' no page errors', !errs.length, errs);
 await c.close();
};
await run(390,844,'dark','phone'); await run(1280,900,'light','computer');
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
