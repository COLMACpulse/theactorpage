/* Home: the tools for keeping your work and the people who see it (Notes, Spotted, Contacts, Footage, Expenses,
   Press) sit under YOU, not ACT, the same as the footer. Clickable, closed until you open it. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:1440,height:900}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/'); await p.waitForTimeout(800);
const six=['notes/','spotted/','contacts/','footage/','expenses/','press/'];
const hrefs=sel=>p.$$eval(sel,x=>x.map(a=>a.getAttribute('href')));
const youCards=await hrefs('#you details.dept[data-d="you"] .toolfoot a.btn'), actCards=await hrefs('#act details.dept[data-d="act"] .toolfoot a.btn');
want('YOU: the six tools', six.every(h=>youCards.includes(h))&&youCards.length===6, youCards);
want('ACT: not there any more', six.every(h=>!actCards.includes(h)), actCards);
want('ACT keeps its own', ['actor-os/','breakdown/','memorizer/','cps/','booth/','headshots/','looks/','archbook/','resume/'].every(h=>actCards.includes(h)), actCards);
const yg=await hrefs('#you nav.deptgrid a'), ag=await hrefs('#act nav.deptgrid a');
want('the icon rows match', six.every(h=>yg.includes(h)&&!ag.includes(h))&&yg.length===6, [yg,ag]);
const fy=await p.$$eval('.ftools .fcol',c=>{ const f=c.find(x=>/YOURS/.test(x.querySelector('.froom').textContent)); return [...f.querySelectorAll('a')].map(a=>a.getAttribute('href')); });
want('the same as the footer', six.every(h=>fy.includes(h)), fy);
want('closed until you open it', await p.$eval('#you details.dept[data-d="you"]',d=>!d.open));
await p.click('#you details.dept[data-d="you"] summary'); await p.waitForTimeout(200);
want('open: every card shows', await p.$$eval('#you details.dept[data-d="you"] .tool',x=>x.filter(e=>e.offsetHeight>0).length)===6);
want('no em dashes in YOU', !/—/.test(await p.innerText('#you')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
