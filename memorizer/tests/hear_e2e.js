/* MEMORIZER: record yourself saying a line and hear it back. One recording a line (a new one replaces it), its
   shape beside it, on DRILL and LINES; HEAR ALL YOUR LINES plays them in order; removing the script takes them
   with it. The slate sticks match the home page's. Fake mic. Made-up sides. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['microphone'],{origin:'http://localhost:8811'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); indexedDB.deleteDatabase('memorizer_media'); }); await p.reload(); await p.waitForTimeout(500);
want('the slate sticks: as tall as the home page\'s', await p.$eval('.hstk',e=>e.getBoundingClientRect().height)===26);
await p.evaluate(()=>{ document.getElementById('paste').value='INT. DOCK - NIGHT\n\nRAY\nYou came back.\n\nMARA\nI never left.\n\nRAY\nThen why does it feel like you did?\n'; MEM.paste(); }); await p.waitForTimeout(300); await p.evaluate(()=>MEM.pickMe('RAY')); await p.waitForTimeout(400);
want('DRILL: RECORD YOURSELF', /RECORD YOURSELF/.test(await p.innerText('#main')));
await p.click('text=● RECORD YOURSELF'); await p.waitForTimeout(400); if(await p.isVisible('#hotsheet button.p').catch(()=>false)) { await p.click('#hotsheet button.p'); await p.waitForTimeout(300); }
await p.waitForTimeout(1500);
want('recording: the mic drawn as you speak, the time', !!(await p.$('.recyou.on canvas[data-live]'))&&/\d\.\d s/.test(await p.innerText('.recyou.on')));
await p.click('text=■ STOP'); await p.waitForTimeout(1500);
const k1=await p.evaluate(()=>{ const d=MEM._db(), s=d.scripts[d.cur]; return Object.keys(s.recs||{})[0]; });
const r1=await p.evaluate(k=>{ const d=MEM._db(); return d.scripts[d.cur].recs[k]; },k1);
want('kept: one recording for the line, its length and its shape', !!r1&&r1.secs>1&&Array.isArray(r1.wave)&&r1.wave.length===56, r1);
want('HEAR YOURSELF, the shape beside it', /HEAR YOURSELF/.test(await p.innerText('#main'))&&!!(await p.$('.recyou svg.wv')));
const played=await p.evaluate(async()=>{ let n=0; const P=HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play=function(){ n++; return P.call(this); }; [...document.querySelectorAll('button')].find(x=>/HEAR YOURSELF/.test(x.textContent)).click(); await new Promise(r=>setTimeout(r,500)); return n; });
want('it plays back', played===1);
/* again: replaces it */
await p.click('text=● RECORD YOURSELF'); await p.waitForTimeout(1300); await p.click('text=■ STOP'); await p.waitForTimeout(1500);
const st=await p.evaluate(async k=>{ const d=MEM._db(), r=d.scripts[d.cur].recs[k]; const db=await new Promise(res=>{ const q=indexedDB.open('memorizer_media'); q.onsuccess=()=>res(q.result); }); const n=await new Promise(res=>{ const q=db.transaction('b').objectStore('b').count(); q.onsuccess=()=>res(q.result); }); return {id:r.id,n}; },k1);
want('again: the new one replaces the old, one kept', st.n===1&&st.id!==r1.id, st);
/* LINES */
await p.click('#tabs [data-t="lines"]'); await p.waitForTimeout(400);
want('LINES: HEAR ALL YOUR LINES, 1 of 2 recorded, ▶ on that line', /HEAR ALL YOUR LINES/.test(await p.innerText('#main'))&&/1 of 2 recorded/.test(await p.innerText('#main'))&&(await p.$$('.li .recyou')).length===1);
await p.click('text=▶ HEAR ALL YOUR LINES'); await p.waitForTimeout(400);
want('playing them in order: the line lit, STOP', (await p.$$('.li.playing')).length===1&&/■ STOP/.test(await p.innerText('#main')));
await p.click('text=■ STOP'); await p.waitForTimeout(300);
want('stopped', (await p.$$('.li.playing')).length===0);
/* remove the script: the recordings go with it */
await p.click('#tabs [data-t="sides"]'); await p.waitForTimeout(300);
await p.click('.quick button[aria-label^="Remove"]'); await p.waitForTimeout(500);
const n2=await p.evaluate(async()=>{ const db=await new Promise(res=>{ const q=indexedDB.open('memorizer_media'); q.onsuccess=()=>res(q.result); }); return await new Promise(res=>{ const q=db.transaction('b').objectStore('b').count(); q.onsuccess=()=>res(q.result); }); });
want('remove the script: its recordings go too', n2===0, n2);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
