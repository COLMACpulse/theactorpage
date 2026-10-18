/* Home: each tool is one line, an Open button and More (the full description, folded). The footer: every tool by
   room, Characters under WRITE opens Paper Trail's All characters. Server on :8811.  NODE_PATH=... node tests/home_more_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(900);
const T=await p.$$eval('.tool',x=>x.map(t=>({one:(t.querySelector('p.one')||{}).textContent||'',more:!!t.querySelector('details.more'),open:t.querySelector('details.more')&&t.querySelector('details.more').open})));
want('18 tools, each one line (under 110 characters) and a folded More', T.length===18&&T.every(t=>t.one&&t.one.length<110&&t.more&&!t.open), T.filter(t=>!t.one||t.one.length>=110));
await p.click('.tool details.more summary'); await p.waitForTimeout(150);
want('More: the full description', await p.evaluate(()=>{ const d=document.querySelector('.tool details.more'); return d.open&&d.querySelector('p').textContent.length>150; }));
want('the VO Booth mic is still there, outside the fold', await p.evaluate(()=>{ const m=document.getElementById('mic'); return !!m&&!m.closest('details'); }));
const F=await p.$$eval('.fcol',x=>x.map(c=>c.querySelector('.froom').textContent+':'+c.querySelectorAll('.ftool').length));
want('the footer: every tool, by room, Characters under WRITE', F.join()==='ACT:10,WRITE:3,FILM:2,YOURS:6'&&!!(await p.$('.fcol:nth-child(2) a[href="papertrail/?tab=allchars"]')), F);
await p.click('footer a[href="papertrail/?tab=allchars"]'); await p.waitForURL(/papertrail/); await p.waitForTimeout(900);
want('Characters opens Paper Trail on All characters', await p.$eval('#tabs .tsub .on',x=>x.textContent).catch(()=>'')==='All characters');
want('no em dashes in the one-liners', !T.some(t=>/—/.test(t.one)));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
