/* YOUR VIEW: SHOW ME ACT / WRITE / FILM. Hidden is out of sight only; one always stays on; links into a hidden
   department go, everywhere, except inside the department you're in. Made-up script. Server on :8811.
   NODE_PATH=... node tests/view_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const shown=sel=>p.$eval(sel,e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)).catch(()=>false);
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_sigil','1'); }); await p.reload(); await p.waitForTimeout(700);
want('to start: all three on, SHOW ME row', (await p.$$eval('[data-view]',x=>x.map(y=>y.textContent+':'+y.getAttribute('aria-pressed')))).join()==='ACT:true,WRITE:true,FILM:true');
want('all three bands and footer columns show', await shown('.band.act')&&await shown('.door.w')&&await shown('.door.f')&&await shown('.fcol[data-dept="write"]'));
// WRITE off
await p.click('[data-view="write"]'); await p.waitForTimeout(200);
want('WRITE off: its band and footer column go, says nothing is deleted', !(await shown('.door.w'))&&!(await shown('.fcol[data-dept="write"]'))&&await shown('.band.act')&&/WRITE hidden\. Nothing is deleted/.test(await p.innerText('#vwhy')));
want('the typewriter link in YOU goes too', !(await p.$$eval('a[href="write/writers-blockage.html"]',x=>x.some(a=>a.offsetWidth>0))));
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(200);
want('practice scene: REWRITE IT goes, TAPE IT and LEARN stay', !(await shown('[data-pgo="write"]'))&&await shown('[data-pgo="tape"]')&&await shown('[data-pgo="learn"]'));
// drop a script: kept, but the card doesn't send you to WRITE
const fx=fs.readFileSync(path.join(__dirname,'..','shared','fixtures','low_tide.fountain'));
await p.setInputFiles('#dropfile',{name:'low_tide.fountain',mimeType:'text/plain',buffer:fx}); await p.waitForTimeout(1500);
const took=await p.innerText('#took');
want('a dropped script: kept on the shelf, no word of Paper Trail, its link gone', /On the sides shelf\./.test(took)&&!/Paper Trail|PAPER TRAIL/.test(took)&&/STORY STUDIO/.test(took), took.slice(0,500));
want('still kept for Paper Trail, if WRITE comes back', await p.evaluate(()=>Inbox.all('draft').length>=1));
// one stays on
await p.click('[data-view="film"]'); await p.waitForTimeout(100); await p.click('[data-view="act"]'); await p.waitForTimeout(150);
want('the last one can\'t go off', (await p.getAttribute('[data-view="act"]','aria-pressed'))==='true'&&/One has to stay on/.test(await p.innerText('#vwhy')));
await p.reload(); await p.waitForTimeout(700);
want('remembered after a reload: ACT only', (await p.$$eval('[data-view]',x=>x.map(y=>y.getAttribute('aria-pressed')))).join()==='true,false,false'&&!(await shown('.door.f'))&&!(await shown('.door.w')));
// in a tool: a link into a hidden department goes; links inside your own stay
await p.goto('http://localhost:8811/breakdown/'); await p.waitForTimeout(800);
const bd=await p.$$eval('a[href]',x=>x.map(a=>[a.getAttribute('href'),a.closest('[data-vhide]')?0:1]));
want('Breakdown (ACT): links to ACT tools stay', bd.filter(([h])=>/actor-os|memorizer/.test(h)).every(([,v])=>v===1), bd);
await p.goto('http://localhost:8811/filmhub/'); await p.waitForTimeout(800);
const fh=await p.$$eval('a[href]',x=>x.map(a=>[a.getAttribute('href'),a.closest('[data-vhide]')?0:1]));
want('Film Hub opened by link while FILM is hidden: still works, its own FILM links stay, ACT links stay', fh.filter(([h])=>/\.\.\/film\//.test(h)).every(([,v])=>v===1)&&fh.filter(([h])=>/actor-os/.test(h)).every(([,v])=>v===1), fh);
await p.evaluate(()=>{ View.set('film',true); View.set('act',false); }); await p.goto('http://localhost:8811/backlot/'); await p.waitForTimeout(700); await p.click('[data-t="drawer"]'); await p.waitForTimeout(400);
const bl=await p.$$eval('a[href]',x=>x.map(a=>[a.getAttribute('href'),a.closest('[data-vhide]')?0:1]));
want('FILM only: in Backlot, PAPER TRAIL (WRITE) goes, Story Studio (FILM) stays', bl.some(([h])=>/papertrail/.test(h))&&bl.filter(([h])=>/papertrail/.test(h)).every(([,v])=>v===0)&&bl.filter(([h])=>/\.\.\/film\//.test(h)).every(([,v])=>v===1), bl);
// script and style files are never hidden: only page links
want('deptOf: pages only, not files', await p.evaluate(()=>View.deptOf('../actor-os/')==='act'&&View.deptOf('../write/writers-blockage.html')==='write'&&View.deptOf('../actor-os/sides.js')===''&&View.deptOf('https://example.com/film/')===''&&View.deptOf('../filmhub/')==='film'&&View.deptOf('../hub/')==='act'&&View.deptOf('../actor-os/vendor/pdfjs-LICENSE')===''&&View.deptOf('../film/#open=3')==='film'));
await p.evaluate(()=>{ View.set('act',true); View.set('write',true); }); await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600);
want('all back on: everything shows again', await shown('.door.w')&&await shown('.door.f')&&!(await p.$('[data-vhide]'))&&(await p.innerText('#vwhy'))==='');
want('no em dashes in the row', !/—/.test(await p.innerText('#viewrow')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
