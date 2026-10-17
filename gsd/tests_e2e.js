/* GSD on THEACTORPAGE: the home tile opens it, it works, the free download is one file that works on its own,
   from a file, with nothing from the site. Made-up tasks. Server on :8811.  NODE_PATH=... node gsd/tests_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600);
want('home: four tiles, GSD the fourth', (await p.$$eval('.tools3 .t3 b',x=>x.map(y=>y.textContent))).join()==='CAMERA,MIC,TYPEWRITER,GSD');
want('phone: the four fit in one row, no sideways scroll', await p.evaluate(()=>{ const t=[...document.querySelectorAll('.tools3 .t3')].map(e=>e.getBoundingClientRect().top); return Math.max(...t)-Math.min(...t)<2&&document.documentElement.scrollWidth<=390; }));
await p.click('#stgsd'); await p.waitForTimeout(600);
want('the tile opens GSD', /\/gsd\/$/.test(p.url())&&/GET SHIT DONE/.test(await p.innerText('h1')));
want('a way back, and the free download offered', !!(await p.$('.gsdnav a[href="../"]'))&&/DOWNLOAD IT FREE/.test(await p.innerText('.gsdnav')));
await p.fill('#taskInput','Shit I need done today: tape the audition, call my agent'); await p.click('#addBtn');
want('it works here', (await p.$$eval('#todayList .task-title',x=>x.length))===2);
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.gsdnav a.dl')]);
want('the download is GSD-Get-Shit-Done.html', dl.suggestedFilename()==='GSD-Get-Shit-Done.html');
const file=await dl.path(); const html=fs.readFileSync(file,'utf8');
want('one file: nothing from the site in it', !/src="app\.js"|styles\.css|\.\.\/shared|class="gsdnav"/.test(html)&&/Free from <a href="https:\/\/colmacpulse\.github\.io\/theactorpage\/">THEACTORPAGE<\/a>/.test(html));
const dir=fs.mkdtempSync(path.join(require('os').tmpdir(),'gsd-')); const f=path.join(dir,'GSD-Get-Shit-Done.html'); fs.copyFileSync(file,f);
const q=await c.newPage(); const errs2=[]; const asked=[]; q.on('pageerror',e=>errs2.push(e.message)); q.on('request',r=>{ if(!/^file:/.test(r.url())) asked.push(r.url()); });
await q.goto('file://'+f); await q.fill('#taskInput','stuff I want to do this week: finish the draft'); await q.click('#addBtn');
want('opened from the file: it works on its own', (await q.$$eval('#weekList .task-title',x=>x.map(y=>y.textContent))).join()==='finish the draft');
want('opened from the file: asks nobody for anything', !asked.length, asked);
want('no page errors', !errs.length&&!errs2.length, errs.concat(errs2));
const same=fs.readFileSync(path.join(__dirname,'GSD-Get-Shit-Done.html'),'utf8')===html; want('the download is built from the site copy (run make_download.py after changes)', same);
fs.rmSync(dir,{recursive:true,force:true}); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
