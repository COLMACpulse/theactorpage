/* YOUR PAGE, fed by the ACT tools: a reel sent from Archbook, your own short and a monologue from Virtual Résumé,
   a headshot you marked Keep in Headshots (and one marked Retire, which never goes up). Website zip, opened.
   Made-up names and files only. Server on :8811.  NODE_PATH=... node tests/hub_page2_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), {execSync}=require('child_process');
const FX=path.join(__dirname,'..','shared','fixtures');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const B=f=>fs.readFileSync(path.join(FX,f)).toString('base64');
await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{ localStorage.clear(); });
await p.evaluate(async([face,barn,clip])=>{ const bl=(b64,t)=>{ const s=atob(b64),u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return new Blob([u],{type:t}); };
 You.fill({name:'Riley Hart',phone:'(555) 010-0142'},'test');
 const k=await You.addPhoto(new File([bl(face,'image/jpeg')],'riley_main.jpg',{type:'image/jpeg'}));
 const g=await You.addPhoto(new File([bl(barn,'image/jpeg')],'riley_western.jpg',{type:'image/jpeg'})); You.setPhoto(g.photo.id,{status:'keeper',roles:['Western / period']});
 const r=await You.addPhoto(new File([bl(barn,'image/jpeg')].concat(['x']),'riley_old.jpg',{type:'image/jpeg'})); You.setPhoto(r.photo.id,{status:'retire'});
 // Archbook: a reel sent to your page
 await Takes.put(bl(clip,'video/mp4'),{kind:'video',mime:'video/mp4',ext:'mp4',name:'riley_westerns.mp4',for:{type:'reel',title:'Westerns'}});
 // Virtual Résumé: a finished short that counts, a monologue clip, and a half-done piece that doesn't count
 await new Promise(res=>{ const q=indexedDB.open('vresume_v03',1); q.onupgradeneeded=()=>{ q.result.createObjectStore('lib'); q.result.createObjectStore('media'); };
  q.onsuccess=()=>{ const t=q.result.transaction(['lib','media'],'readwrite');
   t.objectStore('lib').put({schema:'ACT.RESUME/0.3',me:{},pieces:[{id:'p1',type:'short',title:'Barn Door',finished:true,company:'Ridge Films',shownAt:'Valley screening',roleType:'Lead',character:'Hank',year:'2025'},{id:'p2',type:'monologue',title:'Porch monologue'},{id:'p3',type:'short',title:'Half Done'}],training:[],skills:[]},'main');
   t.objectStore('media').put(bl(clip,'video/mp4'),'p1'); t.objectStore('media').put(bl(clip,'video/mp4'),'p2');
   t.oncomplete=()=>{ q.result.close(); res(); }; }; }); },[B('made_up_face.jpg'),B('made_up_barn.jpg'),B('made_up_clip.mp4')]);
await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(2500);
await p.evaluate(()=>{ PKGOPEN=true; render(); }).catch(()=>{});
await p.waitForFunction(()=>{ if(!PKGOPEN){ PKGOPEN=true; render(); } return true; }).catch(()=>{});
await p.waitForFunction(()=>/From your other tools · \d/i.test(document.getElementById('view').innerText),null,{timeout:10000}).catch(()=>{});
const v=await p.innerText('#view');
const sec=v.slice(v.search(/From your other tools/i),v.search(/From your other tools/i)+700);
want('the Hub lists your short (counts), your monologue, your kept headshot', /Barn Door/.test(sec)&&/Virtual Résumé · Short film · 2025 · video/i.test(sec)&&/Porch monologue/.test(sec)&&/riley_western/.test(sec), sec);
want('not the piece that doesn\'t count yet, not the retired headshot, not your main one twice', !/Half Done|riley_old|riley_main/.test(sec), sec);
want('the reel from Archbook is in the Hub, as a reel', await p.evaluate(()=>ARTS.some(a=>a.category==='reel'&&/riley_westerns/.test(a.filename))));
const dl=p.waitForEvent('download',{timeout:30000});
await p.evaluate(()=>{ pkgSel.site='https://rileyhart.example'; pkgSel.reel=ARTS.find(a=>a.category==='reel').id; return buildSiteZip(); });
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'page2-')); await (await dl).saveAs(path.join(tmp,'site.zip')); execSync('unzip -q site.zip -d site',{cwd:tmp});
const files=execSync('find site -type f',{cwd:tmp}).toString();
want('the website zip carries the videos and photo as files, not baked in', /media\/made_Barn_Door\.mp4/.test(files)&&/media\/clip_Porch_monologue\.mp4/.test(files)&&/media\/headshot_riley_western\.jpg/.test(files)&&fs.statSync(path.join(tmp,'site','index.html')).size<400000, files);
const q=await c.newPage(); await q.goto('file://'+path.join(tmp,'site','index.html')); await q.waitForTimeout(800);
const t=await q.evaluate(()=>document.body.innerText);
want('your page: the Archbook reel in Reel', await q.$$eval('section',S=>S.some(s=>/REEL/.test(s.innerText)&&s.querySelector('video'))));
want('your short under MADE BY ME, with its credit line and its video', /Barn Door/.test(t)&&/Lead \(Hank\), Ridge Films/i.test(t)&&(await q.$$eval('.made video',x=>x.length))===1);
want('the monologue in Selected work', await q.$$eval('section',S=>S.some(s=>/SELECTED WORK/i.test(s.innerText)&&/Porch monologue/.test(s.innerText)&&s.querySelector('video'))));
want('MORE HEADSHOTS: the one you kept, no role words unless you say so', /MORE HEADSHOTS/i.test(t)&&(await q.$$eval('.hgrid img',x=>x.length))===1&&!/Western \/ period/.test(t));
want('the main headshot is still up top', (await q.$eval('img.hs',i=>i.getBoundingClientRect().width))>150);
await p.evaluate(()=>{ profile.pageRoles=true; madeToggle('v:p2'); });
const dl2=p.waitForEvent('download',{timeout:30000}); await p.evaluate(()=>buildSiteZip());
fs.rmSync(path.join(tmp,'site'),{recursive:true,force:true}); await (await dl2).saveAs(path.join(tmp,'site.zip')); execSync('unzip -oq site.zip -d site',{cwd:tmp});
await q.goto('file://'+path.join(tmp,'site','index.html')); await q.waitForTimeout(600); const t2=await q.evaluate(()=>document.body.innerText);
want('say what each headshot is for: on; leave the monologue off: gone', /Western \/ period/.test(t2)&&!/Porch monologue/.test(t2));
want('no page errors', !errs.length, errs);
await b.close(); fs.rmSync(tmp,{recursive:true,force:true}); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
