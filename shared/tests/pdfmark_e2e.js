/* MARK UP A PDF (shared/pdfmark.js): the sides from casting, or a PDF someone sent. The real pages on screen, pen,
   highlight, cross out and erase on top, REVISE types your words onto the page, the marks keep for that file, and
   SAVE makes a new PDF with your marks in while the original stays as it was. From THEACTORPAGES (computer, light),
   Breakdown and Actor OS (phone, dark). Made-up two-page sides. Server on :8811.
   NODE_PATH=... node shared/tests/pdfmark_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'); const os=require('os'); const path=require('path');
function makePdf(pages){ // pages: arrays of [x,y,text]
  const objs=[]; const add=s=>{ objs.push(s); return objs.length; };
  const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  const kids=[]; const pagesId=pages.length*2+2;
  pages.forEach(lines=>{ const body='BT /F1 12 Tf '+lines.map(([x,y,t])=>`1 0 0 1 ${x} ${y} Tm (${t}) Tj`).join(' ')+' ET';
    const c=add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${c} 0 R >>`)); });
  if(add(`<< /Type /Pages /Count ${kids.length} /Kids [${kids.map(k=>k+' 0 R').join(' ')}] >>`)!==pagesId) throw new Error('ids');
  const cat=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let out='%PDF-1.4\n'; const offs=[]; objs.forEach((o,i)=>{ offs.push(out.length); out+=`${i+1} 0 obj\n${o}\nendobj\n`; });
  const x=out.length; out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(out,'latin1'); }
const P1=[[108,700,'INT. LAUNDROMAT - NIGHT'],[108,672,'Dryers turn. TESS folds a shirt.'],[252,640,'TESS'],[180,626,'You came back for the sock.'],[252,598,'OWEN'],[180,584,'I came back for you.'],[252,556,'TESS'],[180,542,'Same thing, tonight.']];
const P2=[[108,700,'EXT. LAUNDROMAT - CONTINUOUS'],[108,672,'Owen holds the door.'],[252,640,'OWEN'],[180,626,'Walk you home?'],[252,598,'TESS'],[180,584,'Carry the basket and we will see.']];
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pmk-')); const FILE=path.join(dir,'laundromat_sides.pdf'); fs.writeFileSync(FILE,makePdf([P1,P2]));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const stored=pg=>pg.evaluate(()=>{ const a=JSON.parse(localStorage.getItem('theactorpage_pdfmarks_v1')||'{}'); const k=Object.keys(a)[0]; return k?{k,marks:a[k].marks}:{k:null,marks:[]}; });
// ---- computer, light: THEACTORPAGES, Script menu
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block',acceptDownloads:true}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>localStorage.removeItem('theactorpage_pdfmarks_v1')); await p.waitForTimeout(800);
await p.click('#mScript summary');
want('THEACTORPAGES: "Mark up a PDF someone sent" is in the Script menu', await p.isVisible('#btnPdfMark'));
await p.setInputFiles('#pdfMarkIn',FILE);
await p.waitForSelector('#pmk .pm-page canvas'); await p.waitForTimeout(500);
want('the real pages, both of them, drawn on the screen', (await p.$$('#pmk .pm-page')).length===2&&await p.$eval('#pmk .pm-page canvas',cv=>{ const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data; let dark=0; for(let i=0;i<d.length;i+=4) if(d[i]<100) dark++; return dark>200; }));
want('the same tools as on your script', (await p.$$('#pmBar [data-mk-tool]')).length===6&&(await p.$$('#pmBar [data-mk-color]')).length===4);
const pg1=await p.$eval('#pmk .pm-page',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; });
const k=pg1.w/612, at=(x,y)=>[pg1.x+x*k, pg1.y+(792-y)*k];
// highlight a line
await p.click('#pmBar [data-mk-tool="highlight"]'); let [x0,y0]=at(180,630); await p.mouse.move(x0,y0); await p.mouse.down(); await p.mouse.move(x0+200*k,y0,{steps:6}); await p.mouse.up();
// cross out the line after it
await p.click('#pmBar [data-mk-tool="cross"]'); [x0,y0]=at(180,588); await p.mouse.move(x0,y0); await p.mouse.down(); await p.mouse.move(x0+170*k,y0+2,{steps:6}); await p.mouse.up();
// pen, red
await p.click('#pmBar [data-mk-tool="pen"]'); await p.click('#pmBar [data-mk-color="#c0392b"]'); [x0,y0]=at(420,620); await p.mouse.move(x0,y0); await p.mouse.down(); for(let i=1;i<=6;i++) await p.mouse.move(x0+i*8,y0+(i%2?6:-6)); await p.mouse.up();
await p.waitForTimeout(150);
let S=await stored(p);
want('HIGHLIGHT, CROSS OUT, PEN: kept for this file, on page one', S.marks.length===3&&S.marks.map(m=>m.tool).join()==='highlight,cross,pen'&&S.marks.every(m=>m.a==='p1')&&/laundromat_sides\.pdf\|\d+/.test(S.k), S.marks.map(m=>m.tool+":"+m.a+":"+m.color));
// revise: type new words onto the page
await p.click('#pmBar [data-mk-tool="revise"]'); [x0,y0]=at(180,568); await p.mouse.click(x0,y0); await p.waitForTimeout(150);
want('REVISE: tap the page, a box to type in', await p.isVisible('#pmk .pm-type textarea'));
await p.fill('#pmk .pm-type textarea','I came back for the dryer.'); await p.click('#pmk .pm-type button'); await p.waitForTimeout(150);
S=await stored(p);
want('your words go on the page where you tapped', S.marks.some(m=>m.tool==='text'&&m.text==='I came back for the dryer.'&&m.a==='p1')&&/I came back for the dryer\./.test(await p.$eval('#pmk .mk-layer',e=>e.textContent)));
await p.screenshot({path:SHOTS+'/pdfmark_desk.png'});
// erase, undo
await p.click('#pmBar [data-mk-tool="erase"]'); [x0,y0]=at(250,588); await p.mouse.click(x0,y0+1); await p.waitForTimeout(120);
S=await stored(p); want('ERASE: tap a mark, it comes off', !S.marks.some(m=>m.tool==='cross'), S.marks.map(m=>m.tool+JSON.stringify(m.pts.slice(0,2))));
// save
let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#pmSave')]); const out=fs.readFileSync(await dl.path(),'latin1');
want('SAVE: a new PDF with your marks, named _marked', /laundromat_sides_marked\.pdf$/.test(dl.suggestedFilename())&&(out.match(/\/Type \/Page /g)||[]).length===2&&/\/DCTDecode/.test(out)&&/\/MediaBox \[0 0 612 792\]/.test(out), dl.suggestedFilename());
want('the original file is unchanged', fs.readFileSync(FILE).equals(makePdf([P1,P2])));
want('it says so', /original file is unchanged/.test(await p.innerText('#pmMsg')));
await p.click('#pmClose'); await p.reload(); await p.waitForTimeout(700);
await p.click('#mScript summary'); await p.setInputFiles('#pdfMarkIn',FILE); await p.waitForSelector('#pmk .pm-page canvas'); await p.waitForTimeout(500);
want('open the same file again: your marks are there', (await p.$$('#pmk .mk-layer path')).length>=2&&/I came back for the dryer\./.test(await p.$eval('#pmk .mk-layer',e=>e.textContent)));
await c.close();
// ---- phone, dark: Breakdown, then Actor OS
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.goto('http://localhost:8811/breakdown/'); await q.waitForTimeout(900);
await q.setInputFiles('#filein',FILE); await q.waitForTimeout(1500); await q.click('button:has-text("TESS")'); await q.waitForTimeout(400);
await q.evaluate(()=>{ const t=document.querySelector('[data-a="tab"][data-t="pack"]'); if(t) t.click(); }); await q.waitForTimeout(400);
want('Breakdown: "Mark up the sides" for a PDF you brought in', await q.isVisible('[data-a="markpdf"]'));
await q.click('[data-a="markpdf"]'); await q.waitForSelector('#pmk .pm-page canvas'); await q.waitForTimeout(400);
want('phone: the pages fit the screen, nothing off the side', await q.evaluate(()=>{ const r=document.querySelector('#pmk .pm-page').getBoundingClientRect(); return r.left>=0&&r.right<=391&&document.documentElement.scrollWidth<=innerWidth+1; }));
want('phone: the tool bar fits', await q.evaluate(()=>{ const r=document.getElementById('pmBar').getBoundingClientRect(); return r.right<=391; }));
const pr=await q.$eval('#pmk .pm-page',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width}; });
const kk=pr.w/612; await q.touchscreen.tap(pr.x+200*kk,pr.y+(792-626)*kk);
await q.click('#pmBar [data-mk-tool="pen"]').catch(()=>{});
await q.mouse.move(pr.x+100,pr.y+120); await q.mouse.down(); await q.mouse.move(pr.x+200,pr.y+130,{steps:5}); await q.mouse.up(); await q.waitForTimeout(150);
want('phone: a pen line keeps', (await stored(q)).marks.length>=1);
await q.screenshot({path:SHOTS+'/pdfmark_phone.png'});
await q.click('#pmClose');
await q.goto('http://localhost:8811/actor-os/'); await q.waitForTimeout(1200);
const buf=fs.readFileSync(FILE).toString('base64');
await q.evaluate(async b64=>{ const by=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); await ActorReader.putDoc('laundromat_sides.pdf',new Blob([by],{type:'application/pdf'})); window.SIDES_DOC='laundromat_sides.pdf'; await markUpSides(); },buf);
await q.waitForSelector('#pmk .pm-page canvas'); await q.waitForTimeout(400);
want('Actor OS: MARK UP THE SIDES opens the same viewer', (await q.$$('#pmk .pm-page')).length===2&&await q.isVisible('#pmSave'));
await ph.close();
want('no page errors', !errs.length, errs);
fs.rmSync(dir,{recursive:true,force:true}); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
