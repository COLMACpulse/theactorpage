/* BREAKDOWN: the front. Opened with nothing: the example reads a made-up page as you watch; YOUR SIDES and + BRING IN
   SIDES show their lists only when tapped. New sides from another tool wait in YOUR SIDES as NEW, not opened on you.
   ?sides=<id> opens them to your role; ?open=1 opens the newest. Your role comes first, SAY IT / MIC / CAMERA under it.
   Made-up sides. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/breakdown/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('breakdown_v03'); }); await p.reload(); await p.waitForTimeout(700);
const body=()=>p.innerText('body');
want('the words: your role, read off the page', /Your role, read off the page/.test(await body())&&/It does the highlighter work\. You make the choices\./.test(await body())&&!/Every line, cue and note stays tied/.test(await body()));
want('the header: the page icon, the sigil, the sticks', !!(await p.$('.bhead svg.bico'))&&(await p.getAttribute('.bhead img.bsig','alt'))==='THEACTORPAGE'&&!!(await p.$('.hstk')));
want('opened with nothing: the example, two buttons, no lists', /EXAMPLE · HOW IT WORKS/.test(await body())&&/YOUR SIDES\s*0/.test(await body())&&!(await p.$('.hpanel'))&&!(await p.$('#drop')));
const s1=await p.getAttribute('#example','data-step'); await p.waitForTimeout(2200); const s2=await p.getAttribute('#example','data-step');
want('the example moves: lines lit, then cues, then the rest', s1!==s2, [s1,s2]);
await p.waitForTimeout(6500);
want('it finds what the page holds for Mara', (await p.$$('#example .find.on')).length>=4&&/QUESTIONS PUT TO YOU/.test(await p.innerText('#example'))&&/WHAT THEY SAY ABOUT YOU/.test(await p.innerText('#example')));
want('the example is not your work', await p.evaluate(async()=>(await new Promise(r=>{ const q=indexedDB.open('breakdown_v03'); q.onsuccess=()=>{ try{ const t=q.result.transaction(q.result.objectStoreNames[0]).objectStore(q.result.objectStoreNames[0]).count(); t.onsuccess=()=>r(t.result); t.onerror=()=>r(0); }catch(e){ r(0); } }; q.onerror=()=>r(0); }))===0));
await p.click('[data-p="bring"]'); await p.waitForTimeout(200);
want('+ BRING IN SIDES: the drop, paste, a project file', !!(await p.$('#drop'))&&/Paste text instead/.test(await body())&&/Open a project file/.test(await body()));
await p.click('[data-p="bring"]'); await p.waitForTimeout(200);
want('tap again: gone', !(await p.$('#drop')));
const id=await p.evaluate(()=>Shelf.put({text:'INT. PIER - DAY\n\nKIT\nThe boat is late.\n\nLOU\nIt always is.\n\nKIT\nNot today.\n',file:'Pier_scene.txt',from:'Memorizer',tool:'memorizer',me:'KIT'}).id);
await p.goto('http://localhost:8811/breakdown/'); await p.waitForTimeout(900);
want('new sides from another tool: not opened on you', /EXAMPLE/.test(await body())&&!(await p.$('nav.tabs')));
await p.click('[data-p="sides"]'); await p.waitForTimeout(200);
want('YOUR SIDES: they wait there, marked NEW', /FROM YOUR OTHER ACT TOOLS/i.test(await p.innerText('.hpanel'))&&/Pier scene/i.test(await p.innerText('.hpanel'))&&/NEW/.test(await p.innerText('.hpanel')));
await p.click('[data-a="openshelf"]'); await p.waitForTimeout(900);
want('tap: open to your role', /KIT/.test(await p.innerText('main'))&&!!(await p.$('nav.tabs')));
const pos=await p.evaluate(()=>{ const r=[...document.querySelectorAll('.kicker')].find(k=>/Your role/i.test(k.textContent)), k=document.querySelector('.kit'); return r&&k?[r.getBoundingClientRect().top,k.getBoundingClientRect().top]:null; });
want('your role first, SAY IT / MIC / CAMERA under it', pos&&pos[0]<pos[1], pos);
await p.goto('http://localhost:8811/breakdown/?sides='+encodeURIComponent(id)); await p.waitForTimeout(900);
want('?sides=<id>: straight to your role', /KIT/.test(await p.innerText('main'))&&!!(await p.$('nav.tabs')));
await p.goto('http://localhost:8811/breakdown/?open=1'); await p.waitForTimeout(900);
want('?open=1: the newest opens', !!(await p.$('nav.tabs')));
want('no em dashes on the front', !/—/.test(await body()));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
