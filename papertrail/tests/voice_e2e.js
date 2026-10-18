/* PAPER TRAIL: SOUNDS LIKE YOU. A scene next to everything else kept here: the counts side by side, your closest lines,
   cited, by character or just the action, or something pasted. No score. Made-up scripts. Server on :8811.
   NODE_PATH=... node papertrail/tests/voice_e2e.js */
const {chromium}=require('playwright');
const tabGo=async(pg,t)=>{ const sel='#tabs [data-tab="'+t+'"]'; if(!(await pg.$(sel))){ const g=await pg.$('#tabs [data-tabs~="'+t+'"]'); if(g){ await g.click(); await pg.waitForTimeout(150); } } await pg.click(sel); };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
await tabGo(p,'voice'); await p.waitForTimeout(200);
want('nothing kept yet: it says what it compares with', /Nothing to compare with yet/.test(await p.innerText('#main'))&&/current draft of each project/.test(await p.innerText('#main')));
const add=async(title,text)=>{ await tabGo(p,'add'); await p.fill('#ptitle',title); await p.fill('#paste',text); await p.click('#readit'); await p.waitForTimeout(500); };
await add('Ridge Line','Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs the ridge. Wind. Nothing moves.\n\nVALE\nHand me the rope. Now.\n\nHALE\nYou sure about this?\n\nINT. CABIN - NIGHT\n\nHale sits by the cold stove. Waits.\n\nHALE\nShe isn\'t coming back -- not tonight.\n');
await add('Dry Gulch','Title: Dry Gulch\n\nINT. SALOON - NIGHT\n\nThe stove is cold. Hale stares at the empty rope hook by the door.\n\nVALE\nWhiskey.\n\nJO PARK\nWe\'re closed. Stove\'s out.\n');
await add('Salt Road','Title: Salt Road\n\nINT. CAR - NIGHT\n\nShe drove all night. The radio gave up somewhere past the salt flats... She did not.\n\nMorning came in grey. Coffee in a paper cup, cold before she finished it.\n');
await tabGo(p,'voice'); await p.waitForTimeout(300);
const opts=await p.$$eval('#vfrom option',x=>x.map(o=>o.textContent));
want('the scene picker: paste, or any scene of any project', opts[0]==='Paste a scene'&&opts.includes('SC 2 INT. CABIN - NIGHT')&&opts.includes('SC 1 INT. SALOON - NIGHT')&&await p.$$eval('#vfrom optgroup',x=>x.map(g=>g.label).sort().join())==='Dry Gulch,Ridge Line,Salt Road', opts);
const v=await p.evaluate(()=>[...document.querySelectorAll('#vfrom option')].find(o=>o.textContent==='SC 2 INT. CABIN - NIGHT').value);
await p.selectOption('#vfrom',v); await p.waitForTimeout(300);
let m=await p.innerText('#main');
want('Ridge Line SC 2, compared with the other three projects, this scene left out', /Ridge Line, SC 2/i.test(m)&&/from 3 projects, the current draft of each, this scene left out/.test(m)&&/not a lot to compare with/.test(m), m.slice(0,700));
const heads=await p.$$eval('#vnums th',x=>x.map(t=>t.textContent));
want('the counts side by side, and lowest to highest by project', heads.join('|')==='|This scene|Everything else you wrote here|Lowest to highest, project by project', heads);
const row=async k=>p.$$eval('#vnums tr',(rs,k)=>{ const r=rs.find(x=>x.cells[0].textContent===k); return r?[...r.cells].slice(1).map(c=>c.textContent):null; },k);
want('words: 13 here', (await row('Words'))[0]==='13', await row('Words'));
want('dashes counted here', (await row('Dashes per 1,000 words'))[0]!=='0'&&(await row('Dashes per 1,000 words'))[0]!=='–', await row('Dashes per 1,000 words'));
want('counts only, what they mean is yours', /Counts only, from the page\. What they mean is yours\./.test(m));
const close=await p.innerText('#vclose');
want('your closest line: the cold stove in Dry Gulch, cited, with the shared words, names left out', /The stove is cold/.test(close)&&/Dry Gulch · SC 1 INT\. SALOON - NIGHT/.test(close)&&/Shared: .*stove/.test(close)&&!/Shared:[^\n]*hale/i.test(close), close);
want('no score, no verdict', !/AUTHOR|probab|score|match rate|%\s*match/i.test(m));
await p.selectOption('#vwho','HALE'); await p.waitForTimeout(250);
want('one character: HALE here, HALE in the rest of Ridge Line, all your dialogue', (await p.$$eval('#vnums th',x=>x.map(t=>t.textContent))).join('|')==='|HALE here|HALE in the rest of Ridge Line|All the dialogue you wrote|Lowest to highest, project by project', await p.$$eval('#vnums th',x=>x.map(t=>t.textContent)));
want('HALE here: 6 words, all dialogue', (await row('Words'))[0]==='6'&&(await row('Words that are dialogue'))[0]==='100%', [await row('Words'),await row('Words that are dialogue')]);
await p.selectOption('#vwho','action'); await p.waitForTimeout(250);
want('just the action', (await p.$$eval('#vnums th',x=>x.map(t=>t.textContent)))[1]==='The action here'&&(await row('Words'))[0]==='7', await row('Words'));
const cite=await p.$eval('#vclose [data-vgo]',a=>a.textContent); await p.click('#vclose [data-vgo]'); await p.waitForTimeout(300);
want('tap the citation: that scene opens', /INT\. SALOON - NIGHT/.test(await p.innerText('#main'))&&/Dry Gulch/i.test(await p.innerText('#crumb')), [cite,await p.innerText('#crumb'),(await p.innerText('#main')).slice(0,200)]);
// paste
await tabGo(p,'voice'); await p.waitForTimeout(200); await p.selectOption('#vfrom',''); await p.waitForTimeout(200);
await p.fill('#vtext','The stove is cold. Hale stares at the empty rope hook by the door.\n\nThe radio quits past the salt flats. Coffee gone cold.');
await p.click('#vgo'); await p.waitForTimeout(300); m=await p.innerText('#main');
want('pasted prose: read, compared with all three', /What you pasted/i.test(m)&&/from 3 projects, the current draft of each\./.test(m), m.slice(0,600));
want('a line word for word in your drafts: said so, not shown as a match', /1 line here is word for word in your other drafts/.test(m)&&/Salt Road/.test(await p.innerText('#vclose')), [m.slice(-600)]);
// from a scene page
await tabGo(p,'projects'); await p.waitForTimeout(200);
const rid=await p.evaluate(()=>Object.values(window.__trail.DB().projects).find(x=>x.title==='Ridge Line').id);
await p.click('[data-open="'+rid+'"]'); await p.waitForTimeout(200); await p.click('[data-scene="0"]'); await p.waitForTimeout(200);
await p.click('[data-vfrom]'); await p.waitForTimeout(300);
want('SOUNDS LIKE YOU? on a scene: that scene, picked', /Ridge Line, SC 1/i.test(await p.innerText('#main'))&&await p.$eval('#vfrom',s=>s.options[s.selectedIndex].textContent)==='SC 1 EXT. RIDGE - DAY');
want('nothing runs off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), await p.evaluate(()=>document.documentElement.scrollWidth));
want('no em dashes', !/—/.test(await p.innerText('#main')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
