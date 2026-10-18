/* PAPER TRAIL: WHO TALKS on each scene, and REPEATS. Counts only; the script is never changed. Made-up script.
   Server on :8811.  NODE_PATH=... node papertrail/tests/repeats_e2e.js */
const {chromium}=require('playwright');
const tabGo=async(pg,t)=>{ const sel='#tabs [data-tab="'+t+'"]'; if(!(await pg.$(sel))){ const g=await pg.$('#tabs [data-tabs~="'+t+'"]'); if(g){ await g.click(); await pg.waitForTimeout(150); } } await pg.click(sel); };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
const SCRIPT='Title: Salt Road\n\nINT. DINER - NIGHT\n\nRain on the glass. Suddenly the lights flicker.\n\nDANA PELL\nWe\'re closed. Go home. Read the sign on the door.\n\nROSS\nDoor was open.\n\nEXT. LOT - NIGHT\n\nQuiet.\n\nINT. KITCHEN - NIGHT\n\nSuddenly a crash. Suddenly a scream from the back.\n\nDANA PELL\nYou liar. You liar.\n\nINT. FREEZER - NIGHT\n\nSuddenly she runs. Suddenly she stops.\n\nROSS\nYou liar. Liar.\n\nEXT. ROAD - DAWN\n\nSuddenly, silence.\n';
await tabGo(p,'add'); await p.fill('#ptitle','Salt Road'); await p.fill('#paste',SCRIPT); await p.click('#readit'); await p.waitForTimeout(600);
const before=await p.evaluate(async()=>{ const D=window.__trail.DB(); const d=Object.values(D.drafts)[0]; return d.hash||''; });
const pid=await p.evaluate(()=>Object.values(window.__trail.DB().projects)[0].id);
await tabGo(p,'projects'); await p.click('[data-open="'+pid+'"]'); await p.waitForTimeout(200); await tabGo(p,'scenes'); await p.waitForTimeout(200);
want('scene cards: the top two talkers, by share', /DANA PELL 77% · ROSS 23%/.test(await p.innerText('.grid')), (await p.innerText('.grid')).slice(0,300));
await p.click('[data-scene="0"]'); await p.waitForTimeout(200);
const m=await p.innerText('#main');
want('in the scene: WHO TALKS, share, speeches, words, counts only', /Who talks/i.test(m)&&/DANA PELL\s*77% · 1 speech, 10 words/.test(m)&&/ROSS\s*23% · 1 speech, 3 words/.test(m)&&/Counts only/.test(m), m.slice(0,900));
await tabGo(p,'repeats'); await p.waitForTimeout(200);
const r=await p.innerText('#main');
want('REPEATS: "suddenly", where it bunches', /suddenly\s*6 times, 5 in scenes 3 to 5/i.test(r), r.slice(0,700));
want('REPEATS: dialogue apart: "liar"', /In the dialogue[\s\S]*liar/i.test(r));
want('says names and everyday words don\'t count, nothing is changed', /Names and everyday words aren.t counted/.test(r)&&/Nothing here changes your script/.test(r));
await p.click('[data-tab-go="scenes"]'); await p.waitForTimeout(200);
want('SCENE button: goes to where it bunches', /INT\. KITCHEN - NIGHT/.test(await p.innerText('#main'))&&/Who talks/i.test(await p.innerText('#main')));
want('the draft is untouched', (await p.evaluate(()=>Object.values(window.__trail.DB().drafts)[0].hash||''))===before);
want('no em dashes', !/—/.test(m+r));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
