/* THEACTORPAGES, the look: the house colors (light and dark), the page first, the writing controls up front, everything
   else in Script and Tools; on a phone the lines fill the screen and nothing runs off the side. VOICE takes in
   SignalScript as PASTE: the ums out, never other words, your exact words in the change trail. No scores in the panels.
   Made-up script. Server on :8811.  NODE_PATH=... node write/tests/front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const SCRIPT="INT. DINER - NIGHT\n\nRain on the glass. The lights flicker.\n\nDANA PELL\nWe're closed. Go home.\n\nROSS\n(wet)\nDoor was open.\n\nEXT. SALT ROAD - LATER\n\nRoss walks the shoulder. Headlights behind him.\n";
const open=async(p)=>{ await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>{ Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(900);
  await p.evaluate(t=>WB.openText(t,'salt_road.fountain'),SCRIPT); await p.waitForTimeout(600); };
// computer, light
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await open(p);
want('light: the house colors around a paper page', await p.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(236, 231, 220)'&&await p.evaluate(()=>getComputedStyle(document.querySelector('.stack')).backgroundColor)==='rgb(255, 253, 248)');
const top=await p.$$eval('#top > button, #top > .tools button, #top > select',x=>x.filter(e=>e.offsetWidth>0).map(e=>e.id));
want('up front: the line type, B I U, side by side, GO and Voice; nothing else', JSON.stringify(top)===JSON.stringify(['elpick','bB','bI','bU','bD','btnGo','btnVoice']), top);
want('GO-MODE and VOICE: big, with icons', await p.$eval('#btnGo',e=>e.getBoundingClientRect().height>=46&&!!e.querySelector('svg')&&/GO-MODE/.test(e.textContent))&&await p.$eval('#btnVoice',e=>e.getBoundingClientRect().height>=46&&!!e.querySelector('svg')));
want('GO-MODE is gold', await p.$eval('#btnGo',e=>getComputedStyle(e).backgroundColor)==='rgb(224, 162, 60)');
const inScript=await p.$$eval('#mScript .tmpanel button',x=>x.map(e=>e.id)), inTools=await p.$$eval('#mTools .tmpanel button',x=>x.map(e=>e.id));
want('Script holds your scripts, new, open, save, export, title page, page setup', ['btnProjects','btnNew','btnOpen','btnSave','btnExport','btnTitle','btnPage'].every(i=>inScript.includes(i)), inScript);
want('Tools holds find, cards, dialogue, reports, compare, panels, focus, keys, zoom', ['btnFind','btnCards','btnBook','btnReports','btnDiff','btnPanels','btnFocus','btnKeys'].every(i=>inTools.includes(i))&&!!(await p.$('#mTools #zoom')), inTools);
want('menus start closed', !(await p.isVisible('#btnExport')));
await p.click('#mScript summary'); await p.waitForTimeout(150);
want('Script opens', await p.isVisible('#btnExport'));
await p.click('#btnExport'); await p.waitForTimeout(300);
want('a pick closes the menu and does its job (Export)', !(await p.evaluate(()=>document.getElementById('mScript').open))&&await p.evaluate(()=>document.getElementById('dlgExport').open));
await p.evaluate(()=>document.getElementById('dlgExport').close());
await p.click('#mTools summary'); await p.waitForTimeout(100); await p.mouse.click(700,500); await p.waitForTimeout(150);
want('a tap outside closes it', !(await p.evaluate(()=>document.getElementById('mTools').open)));
await p.waitForTimeout(800);
want('the bar says it saved, and how many pages', /page/.test(await p.innerText('#saveinfo2')), await p.innerText('#saveinfo2'));
const tabs=await p.$$eval('#railtabs button',x=>x.map(e=>e.textContent));
want('no SignalScript tab: it lives in Voice now', !tabs.some(t=>/SignalScript/i.test(t)), tabs);
await p.screenshot({path:SHOTS+'/write_desk_light.png'});
// voice: paste what you said
await p.click('#btnVoice'); await p.waitForTimeout(300);
want('VOICE opens on the page: the mic bar at the bottom, the page still there', await p.isVisible('#vdock')&&await p.isVisible('.stack')&&await p.isVisible('#vdMic'));
await p.click('#vdFull'); await p.waitForTimeout(300);
want('FULL SCREEN: the full-screen Voice is still there', await p.isVisible('#vw')&&!(await p.isVisible('#vdock')));
await p.click('#vwPasteOpen'); await p.waitForTimeout(150);
await p.fill('#vwPasteIn','um so Ross, you know, walks to the the car and uh opens the door'); await p.click('#vwPasteGo'); await p.waitForTimeout(200);
const clean=await p.innerText('#vwPasteClean');
want('PASTE: the ums and the repeat out, the rest your words in your order', !/\bum\b|\buh\b|you know|the the/i.test(clean)&&/Ross/.test(clean)&&/walks to the car/.test(clean)&&/opens the door/.test(clean), clean);
want('PASTE: no other words offered for yours', !/severity|instead|suggest/i.test(await p.innerText('#vwPaste')));
await p.click('#vwPasteIns'); await p.waitForTimeout(300);
const inScriptNow=await p.evaluate(()=>WB.api.blocks().map(b=>b.text).join('\n'));
want('PUT IT IN THE SCRIPT: it lands', /walks to the car/.test(inScriptNow), inScriptNow.slice(-200));
want('and the exact words are in the change trail', await p.evaluate(()=>WB.api.ledger().some(e=>/um so Ross/.test(e.raw||''))));
await p.click('#vwClose'); await p.waitForTimeout(200);
// panels: no scores
const capsule=await p.evaluate(()=>{ const P=WB.panels.find(x=>x.id==='capsule'||/capsule/i.test(x.name)); return P?P.name:''; });
const forge=await p.evaluate(()=>{ const host=document.createElement('div'); const P=WB.panels.find(x=>/storyforge/i.test(x.id)); if(!P) return 'none';
  localStorage.setItem('storyforge_wb_genome',JSON.stringify({genome:{title:'Salt Road',mainCharacter:{name:'ROSS',raw:'ROSS'},ethos:'Keep walking.',genre:'Drama',world:'A salt road.',cast:[{name:'DANA PELL'}]},episodes:[],refs:[]}));
  P.mount(host,WB.api); return host.innerText; });
want('StoryForge: no score, no episode skeleton, no AI prompt', forge!=='none'&&!/score|skeleton|prompt|novelty|gold zone|risk|confidence/i.test(forge), forge.slice(0,300));
await c.close();
// phone, dark
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await open(q); await q.waitForTimeout(400);
want('phone: dark', await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(18, 17, 16)');
want('phone: nothing runs off the side (the paper margins are trimmed, not scrolled)', await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&getComputedStyle(document.getElementById('scroll')).overflowX==='hidden'));
const fit=await q.evaluate(()=>{ const r=[...document.querySelectorAll('.stack .b')].map(e=>e.getBoundingClientRect()), fs=parseFloat(getComputedStyle(document.querySelector('.stack .b')).fontSize); return {left:Math.min(...r.map(x=>x.left)),right:Math.max(...r.map(x=>x.right)),fs}; });
want('phone: the lines fill the screen and read at a real size', fit.left>=0&&fit.right<=390&&fit.fs>=9, fit);
want('phone: one bar, the title, GO and the two menus', await q.isVisible('#docname')&&await q.isVisible('#btnGo')&&await q.isVisible('#mScript summary')&&await q.isVisible('#mTools summary')&&await q.$eval('#top',e=>e.getBoundingClientRect().height<130));
await q.screenshot({path:SHOTS+'/write_phone_dark.png'});
await q.click('#mScript summary'); await q.waitForTimeout(200);
want('phone: the menu fits the screen', await q.$eval('#mScript .tmpanel',e=>{ const r=e.getBoundingClientRect(); return r.left>=0&&r.right<=390; }));
await q.screenshot({path:SHOTS+'/write_phone_menu.png'});
const t=await q.evaluate(()=>document.body.innerText);
want('no em dashes on screen', !/—/.test(t));
await ph.close();
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
