/* PAPER TRAIL: a character's sheet (every line, what the page and the others say, scenes, who with) and ALL CHARACTERS
   (every character across projects; the same name in two projects listed, never merged). Made-up scripts. Server on :8811.
   NODE_PATH=... node papertrail/tests/chars_e2e.js */
const {chromium}=require('playwright');
const tabGo=async(pg,t)=>{ const sel='#tabs [data-tab="'+t+'"]'; if(!(await pg.$(sel))){ const g=await pg.$('#tabs [data-tabs~="'+t+'"]'); if(g){ await g.click(); await pg.waitForTimeout(150); } } await pg.click(sel); };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
const add=async(title,text)=>{ await tabGo(p,'add'); await p.fill('#ptitle',title); await p.fill('#paste',text); await p.click('#readit'); await p.waitForTimeout(500); };
await add('Ridge Line','Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs the ridge. Hale follows.\n\nVALE\nHand me the rope.\n\nHALE\nVale, wait.\n\nINT. CABIN - NIGHT\n\nHale sits by the fire.\n\nHALE\nShe\'s not coming back.\n');
await add('Dry Gulch','Title: Dry Gulch\n\nINT. SALOON - NIGHT\n\nVALE\nWhiskey.\n\nJO PARK\nWe\'re closed.\n');
await p.click('[data-open]'); await p.waitForTimeout(300);
let pid=await p.evaluate(()=>Object.values(window.__trail.DB().projects).find(x=>x.title==='Ridge Line').id);
await p.evaluate(id=>{ document.querySelector('[data-open="'+id+'"]')||0; },pid);
await tabGo(p,'projects'); await p.click('[data-open="'+pid+'"]'); await p.waitForTimeout(200);
await tabGo(p,'characters'); await p.waitForTimeout(200);
want('Characters: tap a name, it says so', /Tap a name for everything the script says about them/.test(await p.innerText('#main')));
await p.click('[data-char="VALE"]'); await p.waitForTimeout(200);
let m=await p.innerText('#main');
want('the sheet: lines, scenes, named, quoted', /VALE/.test(m)&&/1 line · in 1 of 2 scenes · named 2 times/.test(m)&&/Everything here is quoted from the draft/.test(m), m.slice(0,500));
want('shares scenes with HALE', /Shares scenes with\s*HALE \(1\)/i.test(m), m);
want('what the page says, and what HALE says', /Vale climbs the ridge\. Hale follows\./.test(m)&&/HALE: Vale, wait\.[\s\S]*HALE says it/.test(m), m);
want('every line, with its scene', /Hand me the rope\.\s*SC 1 EXT\. RIDGE - DAY/.test(m), m);
await p.click('[data-charback]'); await p.waitForTimeout(150);
want('back to the table', !!(await p.$('[data-char="HALE"]')));
await tabGo(p,'allchars'); await p.waitForTimeout(200);
m=await p.innerText('#main');
want('ALL CHARACTERS: across both projects', /3\s*NAMES/i.test(m)&&/2\s*PROJECTS/i.test(m)&&/1\s*NAMES IN MORE THAN ONE/i.test(m), m.slice(0,400));
want('the same name in two projects: listed, not merged', /The same name in different projects/i.test(m)&&/Same name, not the same person unless you say so/.test(m)&&/VALE\s*(Ridge Line \(1 line\) · Dry Gulch \(1 line\)|Dry Gulch \(1 line\) · Ridge Line \(1 line\))/.test(m), m);
await p.click('[data-charin$="|VALE"]'); await p.waitForTimeout(250);
want('tap a project: that one\'s sheet', /Hand me the rope|Whiskey/.test(await p.innerText('#main'))&&await p.evaluate(()=>document.querySelector('#tabs [data-tab="characters"]').classList.contains('on')));
want('no em dashes', !/—/.test(await p.innerText('#main')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
