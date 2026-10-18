/* ON SET · TOOLS · CHECK THE TOOLS: this phone against real instruments. Made-up readings only.
   Server on :8811.  NODE_PATH=... node film/tests/check_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
await p.click('#tabs [data-r="set"]'); await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(200);
await p.click('[data-ktool="focus"]'); await p.waitForTimeout(100);
want('a quiet link under every tool', /Check these tools against real ones/.test(await p.innerText('#tochk')));
await p.click('#tochk'); await p.waitForTimeout(150);
let m=await p.innerText('#main');
want('the sheet: says 30 or it won\'t say, kept on this phone', /30 pairs, or it won.t say either way\. Kept on this phone\./.test(m)&&(await p.$$('[data-chk]')).length===4, m.slice(0,300));
await p.fill('#chkdev','Made-up Phone 1'); await p.dispatchEvent('#chkdev','change'); await p.waitForTimeout(100);
await p.fill('#chkref','4'); await p.click('#chkuse'); await p.waitForTimeout(200);
await p.evaluate(()=>{ for(let i=0;i<40;i++) window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{beta:86,gamma:90})); }); await p.waitForTimeout(900);
want('TAKE THE PHONE\'S: starts the tilt sensor, says so, fills it in, keeps what you typed', /TILT SENSOR ON/.test(await p.innerText('.sensor'))&&(await p.inputValue('#chkobs'))==='4'&&(await p.inputValue('#chkref'))==='4', [await p.inputValue('#chkref'),await p.inputValue('#chkobs')]);
await p.click('#chkadd'); await p.waitForTimeout(150);
want('one reading: NOT ENOUGH, 1 of the 30', /NOT ENOUGH/.test(await p.innerText('.chkres'))&&/1 reading of the 30 it needs/.test(await p.innerText('#main')));
await p.fill('#chkref',''); await p.click('#chkadd'); await p.waitForTimeout(100);
want('a missing number: refused, says why', /two numbers/.test(await p.innerText('#toast')));
// bring in 29 more as CSV (this sheet's format), a steady 0.8° high
const csv='instrument,device,unit,reference,observed,note,when\n'+Array.from({length:29},(_,i)=>'level,Made-up Phone 1,°,'+(i%15)+','+((i%15)+0.8).toFixed(1)+',bench,'+new Date(Date.UTC(2026,9,18,15,i)).toISOString()).join('\n');
await p.setInputFiles('#chkfile',{name:'check.csv',mimeType:'text/csv',buffer:Buffer.from(csv)}); await p.waitForTimeout(300);
m=await p.innerText('#main');
want('30 readings: PASS, with the numbers', /PASS/.test(await p.innerText('.chkres'))&&/30 readings\./.test(m)&&/Off by 0\.77° on average/.test(m), m.slice(0,900));
want('a steady lean: says it reads high, and that zero takes it out', /reads 0\.77° high on average: ZERO ON THE RIG takes that out/.test(m));
await p.click('details summary'); await p.fill('[data-tgt="mae"]','0.5'); await p.dispatchEvent('[data-tgt="mae"]','change'); await p.waitForTimeout(150);
want('your own target: now FAIL', /FAIL/.test(await p.innerText('.chkres')));
await p.setInputFiles('#chkfile',{name:'check.csv',mimeType:'text/csv',buffer:Buffer.from(csv)}); await p.waitForTimeout(200);
want('the same readings twice: kept once', /0 readings brought in, 29 already here/.test(await p.innerText('#toast')), await p.innerText('#toast'));
// CINEKNIFE JSON, and a bad one
await p.setInputFiles('#chkfile',{name:'ck.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{instrument:'incline',device:'Made-up Phone 2',unit:'deg',reference:5,observed:5.2}]))}); await p.waitForTimeout(200);
want('CINEKNIFE JSON comes in', /1 reading brought in/.test(await p.innerText('#toast')));
await p.setInputFiles('#chkfile',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{instrument:'audio',device:'X',unit:'dBFS',reference:60,observed:-40}]))}); await p.waitForTimeout(200);
want('dBFS against SPL: refused, says why', /Reading 1: .*can.t be compared directly/.test(await p.innerText('#toast')), await p.innerText('#toast'));
// sound: the change between the last two room tones
await p.click('[data-chk="sound"]'); await p.waitForTimeout(100);
await p.click('#chkuse'); await p.waitForTimeout(100);
want('sound with no room tones yet: says to run two', /Run two room tones/.test(await p.innerText('#toast')));
await p.evaluate(()=>{ const D=JSON.parse(localStorage.getItem('film_os_v1')); D.kit=D.kit||{delays:[],read:{}}; D.kit.tones=[{at:1,secs:30,avg:-52},{at:2,secs:30,avg:-45.5}]; localStorage.setItem('film_os_v1',JSON.stringify(D)); });
await p.reload(); await p.waitForTimeout(500); await p.click('#tabs [data-r="set"]'); await p.click('#sub [data-t="tools"]'); await p.waitForTimeout(200);
want('back on the sheet after a reload', !!(await p.$('#chkadd')));
await p.click('#chkuse'); await p.waitForTimeout(100);
want('sound: the phone\'s change is 6.5 dB', (await p.inputValue('#chkobs'))==='6.5', await p.inputValue('#chkobs'));
// out
const [d]=await Promise.all([p.waitForEvent('download'),p.click('#chkcsv')]); const txt=require('fs').readFileSync(await d.path(),'utf8');
want('SAVE AS CSV: every reading, opens in a spreadsheet', /^instrument,device,unit,reference,observed,note,when\n/.test(txt)&&txt.trim().split('\n').length===32, txt.split('\n').length);
await p.click('#chkback'); await p.waitForTimeout(150);
want('back to the tools: the one you came from', /Depth of field/i.test(await p.innerText('#main')));
want('no em dashes', !/—/.test(m));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
