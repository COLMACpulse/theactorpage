/* SET LIST: the first screen leads with the paper bag man (Col, Oct 25): Funny is funny, GO · 30 SECONDS tapes a joke
   (a new joke, 30 seconds, kept with it), Voice only says one. On a set: MIC, record the whole set, voice only, no limit, kept with the set.
   Fake camera and mic. Made-up material. Server on :8811.  NODE_PATH=... node setlist/tests/tiles_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/setlist/'); await p.evaluate(()=>{ localStorage.removeItem('setlist_v1'); indexedDB.deleteDatabase('setlist_media'); }); await p.reload(); await p.waitForTimeout(600);
want('first screen: the paper bag man, Funny is funny, GO · 30 SECONDS and Voice only', await p.isVisible('.hero .banner img')&&/Funny is funny\./.test(await p.innerText('.hero'))&&/Nobody cares who you are\. Be funny\./.test(await p.innerText('.hero'))&&await p.isVisible('.hero [data-a="vjoke"]')&&await p.isVisible('.hero [data-a="ajoke"]'));
await p.click('.hero [data-a="vjoke"]'); await p.waitForTimeout(1500);
want('CAMERA: a new joke, the camera open, 0:30 on the clock, the bar says camera on', await p.evaluate(()=>window.__setlist.DB().pieces.length)===1&&!!(await p.$('#recov video#rv'))&&/0:30/.test(await p.innerText('#rc'))&&/CAMERA/.test(await p.innerText('#hotbar')));
await p.click('[data-a="rgo"]'); await p.waitForTimeout(1600); await p.click('[data-a="rstop"]'); await p.waitForTimeout(800); await p.click('[data-a="rkeep"]'); await p.waitForTimeout(600);
want('kept with the joke, plays as video', await p.evaluate(()=>{ const q=window.__setlist.DB().pieces[0]; return !!q.repId&&/^video/.test(q.repType); })&&!!(await p.$('video[data-take]')));
await p.click('[data-a="back"]'); await p.waitForTimeout(200);
await p.click('.hero [data-a="ajoke"]'); await p.waitForTimeout(1200);
want('MIC: voice only, no camera', !!(await p.$('#recov #raud'))&&!(await p.$('#recov video'))&&/MIC ON/.test(await p.innerText('#hotbar')), await p.innerText('#hotbar').catch(()=>''));
await p.click('[data-a="rgo"]'); await p.waitForTimeout(1300); await p.click('[data-a="rstop"]'); await p.waitForTimeout(800);
want('after: it plays back as audio', !!(await p.$('#recov audio#rv')));
await p.click('[data-a="rkeep"]'); await p.waitForTimeout(600);
want('a second joke, its take is audio', await p.evaluate(()=>{ const P=window.__setlist.DB().pieces; return P.length===2&&P.some(q=>/^audio/.test(q.repType||'')); })&&!!(await p.$('audio[data-take]')));
want('the camera and mic are off once it is kept', !(await p.$('#hotbar'))||!/ON|RECORDING/.test(await p.innerText('#hotbar')));
// a set
await p.click('#tabs button[data-t="sets"]'); await p.waitForTimeout(200); await p.click('[data-a="newset"]'); await p.waitForTimeout(200); await p.fill('#s_name','Open mic, Thursday');
want('on a set: MIC, record the set', /Record the set/.test(await p.innerText('.kit'))&&/no time limit/.test(await p.innerText('.kit')));
await p.click('[data-kit="aset"]'); await p.waitForTimeout(1200);
want('the set recorder counts up from 0:00, no limit', /0:00/.test(await p.innerText('#rc'))&&/No time limit/.test(await p.innerText('#rm')));
await p.click('[data-a="rgo"]'); await p.waitForTimeout(2300);
want('counting up', /0:0[1-3]/.test(await p.innerText('#rc')), await p.innerText('#rc'));
await p.click('[data-a="rstop"]'); await p.waitForTimeout(800); await p.click('[data-a="rkeep"]'); await p.waitForTimeout(600);
want('kept with the set, listed with its day and length', await p.evaluate(()=>(window.__setlist.DB().sets[0].recs||[]).length)===1&&/Recordings of this set/i.test(await p.innerText('#main'))&&!!(await p.$('audio[data-take]')));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-a="savesetrec"]')]);
want('SAVE TO PHONE (a computer here): it downloads, named for the set', /Open_mic_Thursday/.test(dl.suggestedFilename()), dl.suggestedFilename());
await p.reload(); await p.waitForTimeout(700); await p.click('#tabs button[data-t="sets"]'); await p.waitForTimeout(200); await p.click('[data-a="openset"]'); await p.waitForTimeout(500);
want('after a reload: still there, still plays', !!(await p.$('audio[data-take]'))&&await p.$eval('audio[data-take]',a=>/^blob:/.test(a.src)));
await p.click('[data-a="rmsetrec"]'); await p.waitForTimeout(300);
want('remove it', await p.evaluate(()=>(window.__setlist.DB().sets[0].recs||[]).length)===0);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
