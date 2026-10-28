/* BRING IN MY SITE in the Hub, then the page it builds: credits with PLAY over the page, clips as cards, photographs,
   films and writing with posters, IMDb in the header. A made-up site (shared/fixtures/site_sample), as GitHub's zip.
   Server on :8811.  NODE_PATH=... node hub/tests/siteimport_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), {execSync}=require('child_process');
const DIR=path.join(__dirname,'..','..','shared','fixtures'), T=fs.mkdtempSync(path.join(os.tmpdir(),'sie-')), Z=path.join(T,'riley-site-main.zip');
execSync(`cd "${DIR}" && python3 -c "import zipfile,os
z=zipfile.ZipFile('${Z}','w',zipfile.ZIP_DEFLATED)
for r,d,f in os.walk('site_sample'):
  for x in f: z.write(os.path.join(r,x),os.path.join('riley-site-main',os.path.relpath(os.path.join(r,x),'site_sample')))
z.close()"`);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1200,height:900},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/hub/?tab=intake'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('colmac_hub'); }); await p.reload(); await p.waitForTimeout(1500);
let t=await p.innerText('#siteImport');
want('Setup: BRING IN MY SITE says what it does, folder or GitHub zip, the site untouched', /Bring in my site/i.test(t)&&/Download ZIP/.test(t)&&/your site itself isn't touched/.test(t)&&/nothing leaves this device/.test(t));
await p.setInputFiles('#sizip',Z); await p.waitForFunction(()=>window.__siteIn.plan,null,{timeout:10000}).catch(()=>{});
t=await p.innerText('#siteImport');
want('what it found: 3 credits (2 clips, 3 posters), 2 headshots, 1 photo, a reel, 1 film, 1 piece of writing', /Riley Hart: 3 credits \(2 clips, 3 posters\), 2 headshots, 1 photos, a reel, 1 films, 1 pieces of writing/.test(t), t);
want('it says what was moved and what is missing', /1 file wasn't where the page says/.test(t)&&/1 file the page names isn't there/.test(t));
await p.click('#sigo'); await p.waitForFunction(()=>!window.__siteIn.busy&&window.__siteIn.report,null,{timeout:30000}).catch(()=>{});
t=await p.innerText('#siteImport');
want('brought in: the counts, plainly', /Brought in: 3 credits, 2 clips, 3 posters, 2 headshots, 1 photos, your reel, 1 films, 1 pieces of writing\./.test(t), t);
const st=await p.evaluate(()=>({name:profile.name,rep:profile.rep,imdb:profile.imdb,cred:credits.map(c=>c.title+'|'+c.character+'|'+c.role+'|'+c.net).join(';'),clips:ARTS.filter(a=>a.category==='clip').map(a=>a.scope.slice(0,7)+a.label).join(';'),heads:ARTS.filter(a=>a.category==='headshot').length,stills:ARTS.filter(a=>a.category==='still').length,reel:ARTS.filter(a=>a.category==='reel').length,made:(profile.madeHub.films.length+'/'+profile.madeHub.writing.length),primary:!!profile.primaryHeadshot}));
want('in the Hub: you, credits, clips on their credits, headshots, photos, reel, films and writing', st.name==='Riley Hart'&&st.rep==='Northgate Talent'&&/nm0000000/.test(st.imdb)&&/Harbor Lights\|DET\. MARA KEYS\|Guest Star\|FX/.test(st.cred)&&st.clips==='credit:Harbor Lights;credit:Night Shift'&&st.heads===2&&st.stills===1&&st.reel===1&&st.made==='1/1'&&st.primary, st);
await p.click('#sigo').catch(()=>{});
await p.setInputFiles('#sizip',Z); await p.waitForFunction(()=>window.__siteIn.plan,null,{timeout:10000}).catch(()=>{}); await p.click('#sigo'); await p.waitForFunction(()=>!window.__siteIn.busy&&window.__siteIn.report,null,{timeout:30000}).catch(()=>{});
want('bring it in again: nothing doubled', /Brought in: 0 credits, 0 clips, 0 posters, 0 headshots, 0 photos, 0 films, 0 pieces of writing\. \d+ already here, left alone\./.test(await p.innerText('#siteImport'))&&await p.evaluate(()=>credits.length===3&&ARTS.filter(a=>a.category==='clip').length===2), await p.innerText('#siteImport'));
/* the page, RÉSUMÉ layout (the POSTER WALL has its own test: wall_e2e.js) */
await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(2000);
const html=await p.evaluate(async()=>{ await loadMade(); profile.pageLayout='resume'; pkgInit(); const e=await siteEntries('https://riley.example.com'); const dec=new TextDecoder(); return {html:dec.decode(e[0].data),files:e.map(x=>x.name)}; });
const h=html.html;
want('the page: your name, IMDb in the header', /<h1 class="name">Riley Hart<\/h1>/.test(h)&&/<dt>IMDb<\/dt><dd><a href="https:\/\/www\.imdb\.com\/name\/nm0000000\/"/.test(h));
want('credits with PLAY that opens the clip over the page', (h.match(/class="cplay" href="#v\d+"/g)||[]).length===2&&/<div class="lbx" id="v\d+" role="dialog" aria-label="Harbor Lights · DET\. MARA KEYS"><a class="lbclose" href="#close"/.test(h));
want('the clips go out as files in media/, not inside the page', html.files.filter(f=>/^media\/.*\.webm$/.test(f)).length>=3&&!/src="data:video/.test(h), html.files);
want('your second headshot under More headshots', /More headshots<\/span><span class="ct">1/.test(h)&&/media\/headshot_headshot2\.jpg/.test(h), html.files);
want('PHOTOGRAPHS: your photo, opening big', /rule"><span class="lbl">Photographs<\/span><span class="ct">1/.test(h)&&/<div class="pgrid"><a href="#p\d+"><img src="media\/photo_still-dock/.test(h));
want('MADE BY ME: the film with its poster and Watch on YouTube; the writing with its poster, logline, genre', /Low Tide/.test(h)&&/Watch on YouTube &rarr;/.test(h)&&/class="wrow wposter"><img class="wart" src="data:image\/jpeg/.test(h)&&/The Night Ferry/.test(h)&&/Feature &middot; Thriller &middot; In development/.test(h));
want('a clip under its credit isn\'t shown twice in Selected work', !(/Selected work/.test(h)&&/<figure class="tile"><a class="tl"[^>]*>[^]*?<figcaption>Harbor Lights/.test(h)));
want('the reel still plays right on the page', /rule"><span class="lbl">Reel/.test(h)&&/<figure class="well solo"><video src="media\//.test(h));
/* look at it */
fs.writeFileSync(path.join(T,'index.html'),h); 
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
