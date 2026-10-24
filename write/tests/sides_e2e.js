/* THEACTORPAGES · SIDES FOR THE SHOOT DAY: half-letter (5.5 x 8.5) pages for actors on set. The day's scenes in shooting
   order (not script order), each scene's script pages shrunk to fit with whatever else is on them crossed out, the call
   sheet on the front with the cast from those scenes, or two to a letter page to cut. What you type keeps with the
   script. Made-up script. Server on :8811.  NODE_PATH=... node write/tests/sides_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const SCRIPT="INT. DINER - NIGHT\n\nRain on the glass.\n\nDANA PELL\nWe're closed. Go home.\n\nEXT. SALT ROAD - LATER\n\nRoss walks the shoulder.\n\nROSS\nShe was right.\n\nINT. MOTEL ROOM - NIGHT\n\nA neon sign hums.\n\nMAE\nYou're late.\n\nROSS\nI walked.\n";
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block',acceptDownloads:true}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>{ Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(900);
await p.evaluate(t=>WB.openText(t,'salt_road.fountain'),SCRIPT); await p.waitForTimeout(600);
await p.click('#mScript summary'); await p.click('#btnSides'); await p.waitForTimeout(250);
want('SIDES: from Script, every scene to pick', await p.evaluate(()=>document.getElementById('dlgSides').open)&&(await p.$$('#sdAll [data-sd]')).length===3);
// shooting order: the motel first, then the diner
await p.click('#sdAll [data-sd]:has-text("MOTEL")'); await p.click('#sdAll [data-sd]:has-text("DINER")'); await p.waitForTimeout(150);
let order=await p.$$eval('#sdOrder .sdo span',x=>x.map(e=>e.textContent));
want('the order is the order you shoot them, not the script\'s', /MOTEL/.test(order[0])&&/DINER/.test(order[1]), order);
await p.click('#sdOrder [data-down="0"]'); await p.waitForTimeout(100);
order=await p.$$eval('#sdOrder .sdo span',x=>x.map(e=>e.textContent));
want('↓ moves a scene later', /DINER/.test(order[0])&&/MOTEL/.test(order[1]), order);
await p.click('#sdOrder [data-down="0"]'); await p.waitForTimeout(100);
const cast=await p.$$eval('#sdCast .sdcast span',x=>x.map(e=>e.textContent));
want('the cast for the day, from who speaks in those scenes', cast.join()==='DANA PELL,MAE,ROSS'||cast.sort().join()==='DANA PELL,MAE,ROSS', cast);
await p.fill('#sdDate','2026-11-03'); await p.fill('#sdDay','3'); await p.fill('#sdOf','12'); await p.fill('#sdCallT','06:30'); await p.fill('#sdLoc','The Blue Moon Motel, Rt 9'); await p.fill('#sdCast [data-ct="MAE"]','07:15');
await p.dispatchEvent('#sdLoc','change'); await p.dispatchEvent('#sdCast [data-ct="MAE"]','change');
await p.screenshot({path:SHOTS+'/sides_dialog.png'});
let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#sdGo')]); let pdf=fs.readFileSync(await dl.path(),'latin1');
const boxes=[...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m=>m[1]+'x'+m[2]);
want('half-letter pages: 5.5 x 8.5 inches', boxes.length>=2&&boxes.every(x=>x==='396x612'), boxes);
want('named for the day', /_sides_day3\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
const iCall=pdf.indexOf('(CALL SHEET)'), iMotel=pdf.indexOf('MOTEL ROOM'), iDiner=pdf.lastIndexOf('(SC 1');
want('the call sheet is the front page, with the day, the call and the cast', iCall>0&&iCall<pdf.indexOf('(SIDES ')&&/DAY 3 OF 12/.test(pdf)&&/CREW CALL  6:30/.test(pdf)&&/MAE\s+7:15/.test(pdf)&&/Staple once, top left/.test(pdf));
const heads=[...pdf.matchAll(/\(SC (\d)/g)].map(m=>m[1]);
want('the scenes in shooting order on the pages after it', heads.join('').indexOf('3')>=0&&heads.indexOf('3')<heads.lastIndexOf('1'), heads);
want('the script page shrunk to fit, with the other scenes on it crossed out', /cm\n/.test(pdf)&&/0\.45 0\.42 0\.38 RG 1\.4 w/.test(pdf));
// two to a page
await p.click('#mScript summary'); await p.click('#btnSides'); await p.waitForTimeout(200);
want('what you typed for the day is kept', (await p.inputValue('#sdLoc'))==='The Blue Moon Motel, Rt 9'&&(await p.$$('#sdOrder .sdo')).length===2);
await p.check('input[name="sdPaper"][value="two"]');
[dl]=await Promise.all([p.waitForEvent('download'),p.click('#sdGo')]); pdf=fs.readFileSync(await dl.path(),'latin1');
const b2=[...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map(m=>m[1]+'x'+m[2]);
want('two to a letter page, with a line to cut', b2.length>=1&&b2.every(x=>x==='792x612')&&/\[4 4\] 0 d 396 0 m 396 612 l S/.test(pdf), b2);
await p.waitForTimeout(1800); await p.reload(); await p.waitForTimeout(1200);
want('the day keeps with the script', await p.evaluate(()=>!!(doc.sidesDay&&doc.sidesDay.order.length===2&&doc.sidesDay.day==='3')));
await c.close();
// phone
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.goto('http://localhost:8811/write/writers-blockage.html'); await q.waitForTimeout(900); await q.evaluate(t=>WB.openText(t,'x.fountain'),SCRIPT); await q.waitForTimeout(500);
await q.click('#mScript summary'); await q.click('#btnSides'); await q.waitForTimeout(250);
want('phone: the sides screen fits', await q.evaluate(()=>{ const d=document.getElementById('dlgSides').getBoundingClientRect(); return d.left>=0&&d.right<=391; }));
await q.screenshot({path:SHOTS+'/sides_phone.png'});
await ph.close();
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
