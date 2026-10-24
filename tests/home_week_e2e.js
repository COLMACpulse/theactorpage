/* HOME, YOUR AGENDA: hidden on a first visit; with made-up work in the tools, one list of what needs you, each line to
   its tool; your goal in your words with its date. Server on :8811.  NODE_PATH=... node tests/home_week_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
want('a first visit: no agenda', await p.$eval('#week',e=>e.hidden));
await p.evaluate(()=>{ const d=n=>{ const x=new Date(Date.now()+n*864e5); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
 const r=Contacts.add({name:'Morgan Lee',role:'agent'}); Contacts.setRep(r.id,{step:'submitted',next:d(-2)});
 Footage.add({title:'Dust Road',role:'Sheriff',out:d(-10)});
 const s=Contacts.add({name:'Sam Writer',role:'press'}); const c=Press.add({title:'Low Tide',date:d(9)}); Press.addOutlet(c.id,s.id);
 Inbox.put?Inbox.put('request',{title:'Harbor Lights',role:'Deckhand',due:d(2)+'T12:00'}):null; });
await p.reload(); await p.waitForTimeout(1200);
let v=await p.innerText('#week').catch(()=>'');
want('YOUR AGENDA: the follow-up and the press, each a line; footage never nags', /YOUR AGENDA/.test(v)&&/Follow up with Morgan Lee/.test(v)&&!/Ask for your footage/.test(v)&&/Low Tide: your news is/.test(v)&&!/on your press list not reached yet/.test(v), v);
want('COMING UP on a timeline, earliest first: still open, then by day; press on its day', /COMING UP\n+STILL OPEN\n+Follow up with Morgan Lee[^\n]*\n+[A-Z]+\n+Tape due[\s\S]*Low Tide: your news is/.test(v)&&!/Nothing needs you/.test(v), v);
const hrefs=await p.$$eval('#week a',x=>x.map(a=>a.getAttribute('href')));
want('each line goes to its tool', hrefs.some(h=>/^contacts\//.test(h))&&hrefs.some(h=>/^press\//.test(h)), hrefs);
await p.click('#wkgoal'); await p.fill('#wk_g','Book a co-star'); await p.fill('#wk_d','2027-06-01'); await p.click('#wk_save'); await p.waitForTimeout(500);
v=await p.innerText('#week');
want('your goal, in your words, with its date, on top', /Your goal Book a co-star · by Jun 1, 2027/.test(v)&&v.indexOf('Book a co-star')<v.indexOf('Follow up'), v.slice(0,200));
await p.reload(); await p.waitForTimeout(1000);
want('it stays', /Book a co-star/.test(await p.innerText('#week')));
want('no score, no "thing", no em dashes', !/score|%|\bthings?\b|—/.test(await p.innerText('#week')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
