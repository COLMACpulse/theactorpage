/* ADD TO MY CALENDAR (THE PLAN and YOUR AGENDA), the backup line, and SEND's site limits. Made-up names only.
   Server on :8811.  NODE_PATH=... node tests/calendar_backup_send_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const d=n=>{ const x=new Date(Date.now()+n*864e5); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
await p.goto('http://localhost:8811/plan/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
await p.fill('#t','ridgeline casting. guest star. harbor lights. i have a reader. tape it '+d(3)+'... due '+d(4).slice(5).replace('-','/')+' at 11am, direct submit on actors access.');
await p.click('#go'); await p.waitForTimeout(300); await p.click('#agenda'); await p.waitForTimeout(400);
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#cal')]);
const ics=fs.readFileSync(await dl.path(),'utf8');
want('THE PLAN: ADD TO MY CALENDAR makes one calendar file', /\.ics$/.test(dl.suggestedFilename())&&/^BEGIN:VCALENDAR/.test(ics)&&/Open it and your calendar adds the steps/.test(await p.innerText('#msg')), dl.suggestedFilename());
want('every step on its day, the deadline at 11, send at 10, reminders on', (ics.match(/BEGIN:VEVENT/g)||[]).length>=6&&ics.includes('DTSTART:'+d(4).replace(/-/g,'')+'T110000')&&ics.includes('DTSTART:'+d(4).replace(/-/g,'')+'T100000')&&(ics.match(/BEGIN:VALARM/g)||[]).length>=6&&/SUMMARY:DUE: Harbor Lights \(Guest star\)/.test(ics));
want('each event links back to the plan', /URL:http:\/\/localhost:8811\/plan\/\?p=p/.test(ics.replace(/\r\n /g,'')));
/* home: YOUR AGENDA to the calendar, and the backup line */
await p.goto('http://localhost:8811/'); await p.waitForTimeout(1200);
const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#wkcal')]);
const ics2=fs.readFileSync(await dl2.path(),'utf8');
want('YOUR AGENDA: ADD TO MY CALENDAR, the dated lines', /your_agenda\.ics$/.test(dl2.suggestedFilename())&&(ics2.match(/BEGIN:VEVENT/g)||[]).length>=4&&/SUMMARY:Harbor Lights: /.test(ics2)&&/MADE/.test(await p.innerText('#wkcal')));
want('no backup line on the first day', !/backup/i.test(await p.innerText('#week')));
await p.evaluate(()=>localStorage.setItem('theactorpage_backup_since','2026-01-01')); await p.reload(); await p.waitForTimeout(1200);
want('after a few days with work and no backup: the line, to On This Device', /Your work lives only on this phone\. Make a backup/.test(await p.innerText('#week'))&&await p.$$eval('#week a',x=>x.some(a=>a.getAttribute('href')==='device/')));
await p.evaluate(()=>localStorage.setItem('theactorpage_device_v1',JSON.stringify({lastBackup:Date.now()-3*864e5}))); await p.reload(); await p.waitForTimeout(1200);
want('backed up 3 days ago: no line', !/backup/i.test(await p.innerText('#week')));
await p.evaluate(()=>localStorage.setItem('theactorpage_device_v1',JSON.stringify({lastBackup:Date.now()-20*864e5}))); await p.reload(); await p.waitForTimeout(1200);
want('20 days: says how long', /Back up your work: it’s been (19|20) days\./.test(await p.innerText('#week')));
/* SEND: the sites and their limits */
await p.goto('http://localhost:8811/actor-os/'); await p.waitForTimeout(900);
await p.evaluate(()=>goTab('send')); await p.waitForTimeout(300);
const dest=await p.innerText('#destBox');
want('SEND: where is it going: Actors Access (Eco Cast, 100 MB a clip, 5 clips), Casting Networks (300 MB), Backstage (2 GB), your rep', /Eco Cast: up to 100 MB a clip, 5 clips/.test(dest)&&/Casting Networks\s*Up to 300 MB: MP4, MOV, M4V/.test(dest)&&/Backstage\s*Up to 2 GB/.test(dest)&&/Agent or manager/.test(dest), dest);
await p.click('[data-dest="ACTORS_ACCESS"]'); await p.waitForTimeout(200);
want('picked: it says the size it fits to, and where that came from', /Takes are fit under 100 MB in CUT for Actors Access/.test(await p.innerText('#destWhy'))&&/checked 2026-10-22/.test(await p.innerText('#destWhy'))&&await p.$eval('[data-dest="ACTORS_ACCESS"]',e=>e.classList.contains('picked')));
want('going to Actors Access: CUT lands under 100 MB unless the office says otherwise', await p.evaluate(()=>fitCap())==='100'&&await p.evaluate(()=>sizePill(120*1048576))==='<span class="pill" style="color:#d9694e;border-color:#d9694e">OVER 100 MB · ACTORS ACCESS</span>'&&/UNDER 100 MB/.test(await p.evaluate(()=>sizePill(80*1048576))));
const warn=await p.evaluate(()=>{ for(let i=0;i<6;i++) state.takes.push({id:'t'+i,scene:'Scene 1',n:i+1,status:'SURVIVOR',bytes:(i?40:150)*1048576,secs:60,savedToDevice:true,type:'video/mp4'}); renderSend(); return document.getElementById('sendList').innerText; });
want('over the limit, or too many files for Eco Cast: it says so before you upload', /1 file is over 100 MB\. Fit it in CUT first/.test(warn)&&/Actors Access \(Eco Cast\) takes 5 files\. You have 6/.test(warn), warn);
await p.evaluate(()=>{ state.takes=[]; renderSend(); });
await p.evaluate(()=>{ state.job.fitMB=50; });
want('the office\'s own words win: 50 MB', await p.evaluate(()=>fitCap())==='50'&&/UNDER 50 MB/.test(await p.evaluate(()=>sizePill(40*1048576))));
await p.evaluate(()=>{ state.job.fitMB=0; chooseDest('REPRESENTATION'); });
want('to your rep: no size forced', await p.evaluate(()=>fitCap())==='');
const home=await (await c.newPage()).goto('http://localhost:8811/').then(r=>r.text());
want('home says the real Eco Cast limit, not 500 MB', /Eco Cast on Actors Access takes up to 100 MB a clip/.test(home)&&!/500 MB/.test(home));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
