/* YOUR PAGE from the Hub: the made-up actor, plus work made in other tools (a Film Hub film with a poster, a Story Studio
   film marked done, a Paper Trail script with a logline) and video links. Build the website zip, open the page, check it.
   Made-up names and files only. Server on :8811.  NODE_PATH=... node tests/hub_page_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), {execSync}=require('child_process');
const FX=path.join(__dirname,'..','shared','fixtures');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/hub/'); await p.evaluate(()=>{ localStorage.clear(); });
const face=fs.readFileSync(path.join(FX,'made_up_face.jpg')).toString('base64'), clip=fs.readFileSync(path.join(FX,'made_up_clip.mp4')).toString('base64'), barn=fs.readFileSync(path.join(FX,'made_up_barn.jpg')).toString('base64');
// the other tools' work, as they save it
await p.evaluate(async barn=>{ localStorage.setItem('film_os_v1',JSON.stringify({cur:'a',scripts:{a:{text:'Title: Salt Road\n\nINT. DINER - NIGHT\n\nSAM\nWe close at nine.\n',file:'salt_road.fountain'},b:{text:'INT. SHED - DAY\n',file:'shed.fountain'}}}));
 localStorage.setItem('filmhub_v1',JSON.stringify({films:[{id:'f1',title:'Dry Creek',year:'2024',kind:'Short',runtime:'9 min',logline:'Two brothers, one well, no rain.',credit:'Written and directed by Riley Hart',links:[{label:'Watch',url:'https://vimeo.com/76979871'}]}],studio:{a:{mark:'done',year:'2026',kind:'Short',logline:'A cook keeps the diner open one night too long.'}},me:{}}));
 localStorage.setItem('paper_trail_v1',JSON.stringify({projects:{p1:{id:'p1',title:'Low Water',package:{kind:'feature',genre:'Western',logline:'A town runs dry and a sheriff has to choose who drinks.'}},p2:{id:'p2',title:'Untitled Draft',package:{kind:'short'}}}}));
 const s=atob(barn),u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i);
 await new Promise(r=>{ const q=indexedDB.open('filmhub',2); q.onupgradeneeded=()=>{ q.result.createObjectStore('posters'); q.result.createObjectStore('notes'); }; q.onsuccess=()=>{ const t=q.result.transaction('posters','readwrite'); t.objectStore('posters').put(new Blob([u],{type:'image/jpeg'}),'f1'); t.oncomplete=()=>{ q.result.close(); r(); }; }; }); },barn);
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(async([face,clip])=>{ const bl=(b64,t)=>{ const s=atob(b64),u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return new Blob([u],{type:t}); };
 const add=async(cat,name,blob)=>{ const rec={id:'a'+Math.random().toString(36).slice(2,9),scope:'library',category:cat,label:name,filename:name+'.'+(blob.type.split('/')[1]),type:blob.type,size:blob.size,added:new Date().toISOString(),blob}; await DB.put(rec); ARTS.push(rec); return rec; };
 const h=await add('headshot','Riley Hart',bl(face,'image/jpeg')); profile.primaryHeadshot=h.id; await add('clip','The diner scene',bl(clip,'video/mp4')); pkgSel.headshot=null; go('package'); },[face,clip]);
await p.waitForFunction(()=>/From your other tools · 3/i.test(document.getElementById('view').innerText),null,{timeout:8000}).catch(()=>{});
const v=await p.innerText('#view');
want('the Hub finds your own work: two films and a script with a logline', /From your other tools · 3/i.test(v)&&/Dry Creek/.test(v)&&/Salt Road/.test(v)&&/Low Water/.test(v)&&!/Untitled Draft|Shed/i.test(v), v.slice(v.search(/From your other tools/i),v.search(/From your other tools/i)+300));
// video links
await p.fill('#vlurl','https://youtu.be/dQw4w9WgXcQ'); await p.fill('#vllabel','Cold open, full length'); await p.selectOption('#vlas','clip'); await p.click('button:has-text("Add")'); await p.waitForTimeout(200);
await p.fill('#vlurl','not a link'); await p.click('button:has-text("Add")'); await p.waitForTimeout(200);
want('a bad link: says so, adds nothing', /starting with https/.test(await p.innerText('body'))&&/Video links · 1/i.test(await p.innerText('#view')));
await p.fill('#vlurl','https://example.com/my-showreel'); await p.fill('#vllabel','Showreel'); await p.selectOption('#vlas','reel'); await p.click('button:has-text("Add")'); await p.waitForTimeout(200);
want('a link that isn\'t YouTube or Vimeo: kept as a plain link, and it says so', /Video links · 2/i.test(await p.innerText('#view'))&&/plain link/.test(await p.innerText('body')));
// leave one off
await p.click('.reelrow:has-text("Salt Road")'); await p.waitForTimeout(200);
want('tap to leave one off; it is remembered', await p.evaluate(()=>profile.pageOff.includes('s:a')));
const dl=p.waitForEvent('download',{timeout:30000});
await p.evaluate(()=>{ pkgSel.site='https://rileyhart.example'; pkgSel.clips=ARTS.filter(a=>a.category==='clip').map(a=>a.id); return buildSiteZip(); });
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'page-')); const d=await dl; await d.saveAs(path.join(tmp,'site.zip')); execSync('unzip -q site.zip -d site',{cwd:tmp});
const html=fs.readFileSync(path.join(tmp,'site','index.html'),'utf8');
const q=await (await c.newPage()); await q.goto('file://'+path.join(tmp,'site','index.html')); await q.waitForTimeout(800);
if(process.env.SHOTS){ await q.screenshot({path:process.env.SHOTS+'/page_made_desk.png',fullPage:true}); await q.setViewportSize({width:390,height:844}); await q.screenshot({path:process.env.SHOTS+'/page_made_phone.png',fullPage:true}); await q.setViewportSize({width:1280,height:900}); }
const hs=await q.$eval('img.hs',i=>i.getBoundingClientRect().width);
want('the headshot shows full size, not as a dot ('+Math.round(hs)+' px)', hs>150);
const t=await q.evaluate(()=>document.body.innerText);
want('MADE BY ME on the page: the film you added, with its poster, logline and link', /MADE BY ME/i.test(t)&&/Dry Creek/.test(t)&&/Two brothers, one well/.test(t)&&(await q.$$eval('.made .cart img',x=>x.length))===1&&/vimeo\.com\/76979871/.test(html));
want('the script, with its logline', /Low Water/.test(t)&&/Feature · Western/.test(t)&&/sheriff has to choose/.test(t));
want('the one you left off is not there', !/Salt Road/.test(t));
want('the YouTube link plays in place (no-cookie player), in Selected work', (await q.$$eval('.well iframe',x=>x.map(f=>f.src))).some(s=>/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(s))&&/Cold open, full length/.test(t));
want('the other link is a plain link in the Reel section', /Showreel/.test(await q.$eval('section:has(.lbl)',e=>e.closest('main').innerText))&&(await q.$$eval('.well.vl a',x=>x.map(a=>a.href))).includes('https://example.com/my-showreel'));
want('contact sits in one line', await q.$eval('.reachrow',e=>getComputedStyle(e).display==='flex'));
want('no hub screen styles in the page', !/\.offlist|\.audcard|\.hrow\{/.test(html));
want('no em dashes in what the page says', !/—/.test(t));
want('no page errors', !errs.length, errs);
await b.close(); fs.rmSync(tmp,{recursive:true,force:true}); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
