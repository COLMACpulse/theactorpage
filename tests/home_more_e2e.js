/* Home: each tool is one line, an Open button and More (the full description, folded). The footer: every tool by
   room, Characters under WRITE opens Paper Trail's All characters. Server on :8811.  NODE_PATH=... node tests/home_more_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(900);
const T=await p.$$eval('.tool',x=>x.map(t=>({one:(t.querySelector('p.one')||{}).textContent||'',more:!!t.querySelector('details.more'),open:t.querySelector('details.more')&&t.querySelector('details.more').open})));
want('17 tools (Slate Maker inside Actor OS, Backlot inside Story Studio), each one line (under 110 characters) and a folded More', T.length===17&&T.every(t=>t.one&&t.one.length<110&&t.more&&!t.open), T.filter(t=>!t.one||t.one.length>=110));
const OP=await p.$$eval('.tool',x=>x.map(t=>({n:t.querySelector('.tool-name').textContent.trim(),a:[...t.querySelectorAll('.actions a')].map(a=>a.textContent.trim()),loose:[...t.children].filter(c=>c.tagName==='P'&&!c.classList.contains('one')).length,icon:!!t.querySelector('.tool-name svg')})));
const nm=s=>s.toLowerCase().replace(/[^a-z]/g,'');
want('every tool: its own Open button (one), an icon, nothing loose outside More', OP.every(t=>t.a.length===1&&nm(t.a[0]).includes(nm(t.n).slice(0,6))&&!t.loose&&t.icon), OP.filter(t=>!(t.a.length===1&&nm(t.a[0]).includes(nm(t.n).slice(0,6))&&!t.loose&&t.icon)));
want('the rooms keep their tools in the right column (on a wide screen)', await p.evaluate(()=>innerWidth<900||[...document.querySelectorAll('.tool')].every(t=>t.getBoundingClientRect().left>innerWidth*0.3)));
const SC=await p.$$eval('.tool',x=>x.map(t=>{ const sec=t.closest('section').className.match(/\b(act|write|film)\b/); return [sec?sec[1]:'',getComputedStyle(t.querySelector('.tool-name svg')).stroke]; }));
const want_={act:'rgb(224, 162, 60)',write:'rgb(247, 245, 240)',film:'rgb(111, 168, 214)'};
want('each icon is drawn in its section color: ACT gold, WRITE white, FILM blue', SC.every(([k,c])=>!want_[k]||c===want_[k]), SC.filter(([k,c])=>want_[k]&&c!==want_[k]));
{ const w=await (await b.newContext({viewport:{width:1386,height:900}})).newPage(); await w.goto('http://localhost:8811/'); await w.waitForTimeout(600); want('wide screen: every tool in the right column', await w.evaluate(()=>[...document.querySelectorAll('.tool')].every(t=>t.getBoundingClientRect().left>innerWidth*0.3))); await w.close(); }
await p.click('.tool details.more summary'); await p.waitForTimeout(150);
want('More: the full description', await p.evaluate(()=>{ const d=document.querySelector('.tool details.more'); return d.open&&d.querySelector('p').textContent.length>150; }));
want('the VO Booth mic is still there, outside the fold', await p.evaluate(()=>{ const m=document.getElementById('mic'); return !!m&&!m.closest('details'); }));
const F=await p.$$eval('.fcol',x=>x.map(c=>c.querySelector('.froom').textContent+':'+c.querySelectorAll('.ftool').length));
want('the footer: every tool, by room, WRITE and FILM marked make your own, Characters and Set List under WRITE', F.join()==='ACT:8,WRITE · make your own:5,FILM · make your own:3,YOURS:6'&&!!(await p.$('.fcol:nth-child(2) a[href="papertrail/?tab=allchars"]')), F);
await p.click('footer a[href="papertrail/?tab=allchars"]'); await p.waitForURL(/papertrail/); await p.waitForTimeout(900);
want('Characters opens Paper Trail on All characters', await p.$eval('#tabs .tsub .on',x=>x.textContent).catch(()=>'')==='All characters');
want('no em dashes in the one-liners', !T.some(t=>/—/.test(t.one)));
{ await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(600); const hb=await p.evaluate(()=>document.body.textContent.replace(/\s+/g,' '));
  want('JUICE is on home, on the Spotted card', /JUICE checks the trades for what fits you/.test(hb));
  want('FOR MY REPS is on home, in YOUR PAGE, with its own button to the Hub', /FOR MY REPS: one sheet for your agent and your manager/.test(hb)&&(await p.getAttribute('#yp-reps','href'))==='hub/?tab=reps');
  want('Slate Maker and Backlot are no longer their own tools on home; Set List only under WRITE', !(await p.$('a[href="slate/"]'))&&!(await p.$('a[href="backlot/"]'))&&(await p.$$('.fcol[data-dept="act"] a[href="setlist/"]')).length===0); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
