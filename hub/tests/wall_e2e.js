/* YOUR PAGE, POSTER WALL (Col, Oct 28: "like brendanmccarthyactor.com"). New pages start on the wall: your name and a
   strip of headshots up top, the reel next, then your work as big posters. Tap a poster and its clip opens over the
   page. A credit with no clip sits on the wall the same size, with no play mark. RÉSUMÉ is one tap away and brings
   back the credits list. SEE IT shows a credit's clips from the files here; the saved file carries them only for
   EVERYTHING. A made-up site (shared/fixtures/site_sample, Riley Hart). Computer light, phone dark. Server on :8811. */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), {execSync}=require('child_process');
const DIR=path.join(__dirname,'..','..','shared','fixtures'), T=fs.mkdtempSync(path.join(os.tmpdir(),'wall-')), Z=path.join(T,'riley-site-main.zip');
const SP='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
execSync(`cd "${DIR}" && python3 -c "import zipfile,os
z=zipfile.ZipFile('${Z}','w',zipfile.ZIP_DEFLATED)
for r,d,f in os.walk('site_sample'):
  for x in f: z.write(os.path.join(r,x),os.path.join('riley-site-main',os.path.relpath(os.path.join(r,x),'site_sample')))
z.close()"`);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/hub/?tab=intake'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('colmac_hub'); }); await p.reload(); await p.waitForTimeout(1500);
 /* already in the Hub from a résumé, the same project under another character: it should end up one credit */
 await p.evaluate(()=>{ credits.push({cid:'old1',title:'Harbor Lights',character:'Mara',role:'Guest Star',kind:'credit',state:'archived',from:'resume'}); saveCredits(); });
 await p.setInputFiles('#sizip',Z); await p.waitForFunction(()=>window.__siteIn.plan,null,{timeout:10000}).catch(()=>{});
 await p.click('#sigo'); await p.waitForFunction(()=>!window.__siteIn.busy&&window.__siteIn.report,null,{timeout:30000}).catch(()=>{});
 want(nm+': a credit already in the Hub under the same project: one credit, and it says so', await p.evaluate(()=>credits.filter(c=>normTitle(c.title)===normTitle('Harbor Lights')).length)===1&&/1 credit was already in your Hub under the same project/.test(await p.innerText('#siteImport')), await p.innerText('#siteImport'));
 await p.evaluate(()=>{ profile.email='riley@example.com'; saveProfile(); });
 await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(2000);

 /* the picker */
 const pk=await p.evaluate(()=>({wall:!!document.querySelector('#lay_wall.on[aria-checked="true"]'),res:!!document.querySelector('#lay_resume[aria-checked="false"]'),t:(document.querySelector('.layrow')||{}).innerText||''}));
 want(nm+': HOW IT LOOKS: a new page starts on POSTER WALL, RÉSUMÉ one tap away, says what each is', pk.wall&&pk.res&&/Reel first, then your work as big posters/.test(pk.t)&&/your credits as a list/.test(pk.t), pk);

 /* the wall, as it goes online */
 const H=await p.evaluate(async()=>{ await loadMade(); const e=await siteEntries('https://riley.example.com'); return new TextDecoder().decode(e[0].data); });
 const iHead=H.indexOf('class="slate wallhd"'), iReel=H.indexOf('<span class="lbl">Reel</span>'), iWork=H.indexOf('<span class="lbl">Work</span>'), iPh=H.indexOf('<span class="lbl">Photographs</span>');
 want(nm+': in order: your name and headshots, the reel, your work, then photographs', iHead>0&&iHead<iReel&&iReel<iWork&&iWork<iPh, [iHead,iReel,iWork,iPh]);
 want(nm+': the headshot strip: both headshots, each opens big; no More headshots under it', (H.match(/<div class="hstrip">([\s\S]*?)<\/div>/)||['',''])[1].split('<a href="#p').length-1===2&&!/More headshots/.test(H));
 want(nm+': union, rep, IMDb and email up top', /wallhd[\s\S]*<dt>Rep<\/dt><dd>Northgate Talent[\s\S]*<dt>IMDb<\/dt>[\s\S]*<dt>Email<\/dt><dd><a href="mailto:riley@example\.com">/.test(H.slice(iHead,iReel)));
 want(nm+': WORK: all 3 credits as posters, says to tap one', /<span class="lbl">Work<\/span><span class="ct">3/.test(H)&&(H.match(/<article class="wcard">/g)||[]).length===3&&/Tap a poster to play the clip/.test(H));
 want(nm+': a poster with a clip opens it over the page', /<a class="wpo" href="#v\d+" aria-label="Play Harbor Lights · DET\. MARA KEYS"><img src="data:image/.test(H)&&/<div class="lbx" id="v\d+" role="dialog" aria-label="Harbor Lights · DET\. MARA KEYS">/.test(H));
 const noClip=(H.match(/<article class="wcard"><div class="wpo">/g)||[]).length;
 want(nm+': the credit with no clip: same poster, no play mark', noClip===1&&(H.match(/<a class="wpo"/g)||[]).length===2, noClip);
 want(nm+': no credits list on the wall', !/<span class="lbl">Credits<\/span>/.test(H)&&!/class="credlist">\s*<article class="crow" id="c-harbor/.test(H));
 want(nm+': plain words', !/—/.test(H.slice(iHead,iPh)));

 /* look at it, tap a poster */
 const site=path.join(T,nm); fs.mkdirSync(path.join(site,'media'),{recursive:true});
 const files=await p.evaluate(async()=>{ const e=await siteEntries('https://riley.example.com'); return e.map(x=>({n:x.name,d:Array.from(x.data)})); });
 files.forEach(f=>fs.writeFileSync(path.join(site,f.n),Buffer.from(f.d)));
 const q=await c.newPage(); const qerr=[]; q.on('pageerror',e=>qerr.push(e.message));
 await q.goto('file://'+path.join(site,'index.html')); await q.waitForTimeout(800);
 const cols=await q.evaluate(()=>getComputedStyle(document.querySelector('.wgrid')).gridTemplateColumns.split(' ').length);
 want(nm+': '+(nm==='phone'?'2':'5')+' posters across', cols===(nm==='phone'?2:5), cols);
 await q.click('a.wpo'); await q.waitForTimeout(500);
 const lb=await q.evaluate(()=>{ const t=document.querySelector('.lbx:target'); return t?{cap:t.getAttribute('aria-label'),vid:!!t.querySelector('video'),vis:getComputedStyle(t).display!=='none'}:null; });
 want(nm+': tap a poster: the clip opens big over the page', lb&&lb.vid&&lb.vis&&/Harbor Lights/.test(lb.cap), lb);
 await q.goto('file://'+path.join(site,'index.html')); await q.waitForTimeout(500);
 want(nm+': nothing sideways', await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': photographs whole, not cropped', await q.evaluate(()=>{ const i=document.querySelector('.pgrid img'); return !!i&&getComputedStyle(i).objectFit==='contain'&&Math.abs(i.getBoundingClientRect().width/i.getBoundingClientRect().height-i.naturalWidth/i.naturalHeight)<0.05; }));
 await q.screenshot({path:SP+'/wall_'+nm+'.png',fullPage:true});
 want(nm+': the page has no errors', !qerr.length, qerr);

 /* SEE IT and the saved file */
 const see=await p.evaluate(async()=>{ const s=await pkgDoc({see:true}); pkgSel.preset='submission'; const f=await pkgDoc(); pkgSel.preset='full'; const g=await pkgDoc(); pkgSel.preset='submission';
   return {see:/<a class="wpo" href="#v\d+"/.test(s)&&/<video src="blob:/.test(s), sub:!/<a class="wpo" href/.test(f)&&/<article class="wcard">/.test(f), full:/<a class="wpo" href="#v\d+"/.test(g)&&/<video src="data:video/.test(g)}; });
 want(nm+': SEE IT plays each credit\'s clip from the files here', see.see, see);
 want(nm+': the saved file: posters only (a rep submission stays small), clips with EVERYTHING', see.sub&&see.full, see);

 /* RÉSUMÉ */
 await p.click('#lay_resume'); await p.waitForTimeout(300);
 const R=await p.evaluate(async()=>({k:profile.pageLayout,on:!!document.querySelector('#lay_resume.on'),h:new TextDecoder().decode((await siteEntries('https://riley.example.com'))[0].data)}));
 want(nm+": RÉSUMÉ: kept, the credits list and More headshots come back, no wall", R.k==="resume"&&R.on&&/<span class="lbl">Credits<\/span>/.test(R.h)&&/More headshots/.test(R.h)&&!/class="wgrid"/.test(R.h)&&!/class="slate wallhd"/.test(R.h), {k:R.k,on:R.on,cr:/<span class="lbl">Credits<\/span>/.test(R.h),mh:/More headshots/.test(R.h),wg:/class="wgrid"/.test(R.h),wh:/wallhd/.test(R.h)});
 await p.reload(); await p.waitForTimeout(1500);
 want(nm+': still RÉSUMÉ after a reload', !!(await p.$('#lay_resume.on')));
 await p.click('#lay_wall'); await p.waitForTimeout(300);
 want(nm+': back to POSTER WALL', await p.evaluate(()=>profile.pageLayout==='wall'));
 want(nm+': the Hub: nothing sideways, no errors', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!errs.length, errs);
 await p.locator('#pagetop').screenshot({path:SP+'/wall_pick_'+nm+'.png'}).catch(()=>{});
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
