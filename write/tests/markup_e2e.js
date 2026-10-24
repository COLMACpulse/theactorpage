/* THEACTORPAGES · MARK UP: draw, highlight, cross out and revise on your script. Marks hang off their line and go
   with it when the script moves; they keep with the script; REVISE changes the line right away with the old words
   beside it, crossed out; ERASE and UNDO take marks off; the PDF carries them only when you tick it.
   Made-up script. Server on :8811.  NODE_PATH=... node write/tests/markup_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block',acceptDownloads:true}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>{ Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(900);
await p.evaluate(()=>WB.openText("INT. DINER - NIGHT\n\nRain on the glass. The lights flicker.\n\nDANA PELL\nWe're closed. Go home.\n\nROSS\nDoor was open.\n",'salt_road.fountain')); await p.waitForTimeout(600);
const box=async txt=>p.evaluate(t=>{ const e=[...document.querySelectorAll('.stack [data-bid]')].find(x=>x.textContent.trim()===t); const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,id:e.dataset.bid}; },txt);
await p.click('#mTools summary'); await p.click('#btnMark'); await p.waitForTimeout(250);
want('MARK UP: from Tools, the tool bar comes up', await p.isVisible('#mkbar')&&(await p.$$('#mkbar [data-mk-tool]')).length===6&&(await p.$$('#mkbar [data-mk-color]')).length===4);
// pen, in blue, over the action line
await p.click('#mkbar [data-mk-color="#2a5fa8"]');
let a=await box('Rain on the glass. The lights flicker.');
await p.mouse.move(a.x+20,a.y+a.h+6); await p.mouse.down(); for(let k=1;k<=8;k++) await p.mouse.move(a.x+20+k*15,a.y+a.h+6+(k%2?4:-4)); await p.mouse.up(); await p.waitForTimeout(150);
let M=await p.evaluate(()=>doc.marks);
want('PEN: a stroke, in blue, on the line it was drawn on', M.length===1&&M[0].tool==='pen'&&M[0].color==='#2a5fa8'&&M[0].a===a.id, M);
// highlight
await p.click('#mkbar [data-mk-tool="highlight"]'); await p.mouse.move(a.x+2,a.y+a.h/2); await p.mouse.down(); await p.mouse.move(a.x+120,a.y+a.h/2,{steps:6}); await p.mouse.up(); await p.waitForTimeout(100);
// cross out the dialogue
await p.click('#mkbar [data-mk-tool="cross"]'); const d=await box("We're closed. Go home.");
await p.mouse.move(d.x+2,d.y+d.h/2); await p.mouse.down(); await p.mouse.move(d.x+d.w-4,d.y+d.h/2+3,{steps:8}); await p.mouse.up(); await p.waitForTimeout(100);
M=await p.evaluate(()=>doc.marks);
want('HIGHLIGHT and CROSS OUT: kept, the cross-out a straight line on its line', M.length===3&&M[1].tool==='highlight'&&M[2].tool==='cross'&&M[2].pts.length===2&&M[2].a===d.id, M.map(m=>m.tool));
want('the marks are drawn on the page', await p.$$eval('.mk-layer path',x=>x.length)===3);
await p.screenshot({path:SHOTS+'/markup_desk.png'});
// revise: changes the line now
await p.click('#mkbar [data-mk-tool="revise"]'); const r=await box('Door was open.'); await p.mouse.click(r.x+10,r.y+r.h/2); await p.waitForTimeout(200);
want('REVISE: tap a line, it opens with what it says', await p.evaluate(()=>document.getElementById('dlgRevise').open)&&(await p.inputValue('#rvNew'))==='Door was open.');
await p.fill('#rvNew','The door was wide open.'); await p.click('#rvGo'); await p.waitForTimeout(300);
want('it changes the line right away', await p.evaluate(()=>doc.blocks.some(b=>b.text==='The door was wide open.'))&&!(await p.evaluate(()=>doc.blocks.some(b=>b.text==='Door was open.'))));
want('the old words stay beside it, crossed out', await p.evaluate(()=>doc.marks.some(m=>m.tool==='was'&&m.text==='Door was open.'))&&/Door was open\./.test(await p.$eval('.mk-layer',e=>e.textContent)));
want('and the change trail has it', await p.evaluate(()=>WB.api.ledger().some(e=>e.tool==='Mark up'&&e.raw==='Door was open.')));
await p.screenshot({path:SHOTS+'/markup_revise.png'});
// the script moves: marks go with their lines
const before=await p.$eval('.mk-layer path',e=>e.getBBox().y);
await p.click('#mkbar [data-mk-tool="move"]');
await p.evaluate(()=>{ const B=WB.api.blocks(); WB.api.insertAfter(B[0].id,[{type:'Action',text:'A new line up top.'},{type:'Action',text:'And another one, to push everything down the page.'}]); }); await p.waitForTimeout(400);
const after=await p.$eval('.mk-layer path',e=>e.getBBox().y);
want('a line goes in above: the marks move down with their lines', after>before+20, {before,after});
// erase and undo
await p.click('#mkbar [data-mk-tool="erase"]'); const d2=await box("We're closed. Go home."); await p.mouse.click(d2.x+d2.w/2,d2.y+d2.h/2+2); await p.waitForTimeout(150);
want('ERASE: tap a mark, it comes off', await p.evaluate(()=>!doc.marks.some(m=>m.tool==='cross')));
await p.click('#mkbar [data-mk-undo]'); await p.waitForTimeout(100);
want('UNDO: the last mark comes off', await p.evaluate(()=>doc.marks.length)===2);
// keep, reload
await p.waitForTimeout(1800); await p.reload(); await p.waitForTimeout(1400);
const kept=await p.evaluate(()=>({n:doc.marks.length,tools:doc.marks.map(m=>m.tool),paths:document.querySelectorAll('.mk-layer path').length,first:doc.blocks.slice(0,3).map(b=>b.text)}));
want('the marks keep with the script', kept.n===2&&kept.paths>=1, kept);
// export
await p.click('#mScript summary'); await p.click('#btnExport'); await p.waitForTimeout(200);
want('EXPORT: a tick for your marks', await p.isVisible('#xMarksRow')&&!(await p.isChecked('#xMarks')));
let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#xPdf')]); let pdf=fs.readFileSync(await dl.path(),'latin1');
want('without the tick: the clean page', !/ RG [\d.]+ w /.test(pdf)&&!/_marked/.test(dl.suggestedFilename()));
await p.click('#mScript summary'); await p.click('#btnExport'); await p.check('#xMarks');
[dl]=await Promise.all([p.waitForEvent('download'),p.click('#xPdf')]); pdf=fs.readFileSync(await dl.path(),'latin1');
want('with it: your marks on the PDF', / RG 1\.8 w /.test(pdf)&&/_marked\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
await c.close();
// phone
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.goto('http://localhost:8811/write/writers-blockage.html'); await q.waitForTimeout(900);
await q.evaluate(()=>WB.openText("INT. DINER - NIGHT\n\nRain on the glass.\n",'x.fountain')); await q.waitForTimeout(500);
await q.click('#mTools summary'); await q.click('#btnMark'); await q.waitForTimeout(250);
want('phone: the tool bar fits', await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&await q.isVisible('#mkbar'));
await q.screenshot({path:SHOTS+'/markup_phone.png'});
await ph.close();
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
