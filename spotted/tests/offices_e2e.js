/* SPOTTED: a trade roundup and an IMDbPro list pasted whole, your types, the OFFICES view, the report for your reps.
   Phone size, made-up people only. Needs a local server on :8811 at the repo root.
   NODE_PATH=... node spotted/tests/offices_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const F=path.join(__dirname,'..','..','shared','fixtures'), fx=f=>fs.readFileSync(path.join(F,'spotted_'+f+'.txt'),'utf8');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,500))); if(!c) ok=false; };
const errs=[];
// the Hub on this device: Wren Ashby has had you in three times (two through Actors Access, one by email)
const h=await ctx.newPage(); h.on('pageerror',e=>errs.push('hub '+e.message)); h.on('dialog',d=>d.accept());
await h.goto('http://localhost:8811/hub/index.html'); await h.waitForTimeout(900);
await h.evaluate(async()=>{ if(isDemo()) await dropDemoData();
 projects.push(newProject({aaid:'csv:t1',project:'LOW TIDE',title:'LOW TIDE',role:'DOCK COP',casting_office:'Wren Ashby Casting',kind:'audition',status:'Confirmed',date:'2026-03-01'}));
 projects.push(newProject({aaid:'csv:t2',project:'MORNING BREW CO',title:'MORNING BREW CO',role:'DAD',casting_office:'Wren Ashby',kind:'audition',status:'Confirmed',date:'2025-11-01'}));
 const p=newProject({aaid:'req:t3',project:'DRY GULCH',title:'DRY GULCH',role:'HAL',casting:'Wren Ashby',kind:'audition',status:'Received',date:'2026-05-02'}); p.request={contact:'wren@example.com'}; projects.push(p);
 saveProjects(); });
await h.waitForTimeout(500);
const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/spotted/index.html'); await p.evaluate(()=>{ localStorage.removeItem('theactorpage_spotted_v1'); localStorage.removeItem('spotted_ui_v1'); localStorage.removeItem('theactorpage_you_v1'); }); await p.reload(); await p.waitForTimeout(700);
want('four tabs: SPOT, LIST, OFFICES, YOU', (await p.$$eval('#tabs button',x=>x.map(y=>y.dataset.t))).join()==='spot,list,offices,you');
await p.click('#tabs [data-t="offices"]');
want('OFFICES with nothing spotted: says what to paste', /trade story, an IMDbPro list or a casting notice/.test(await p.innerText('#main')));
// YOU: name, a rep, your types
await p.click('#tabs [data-t="you"]');
await p.fill('#yname','Sam Actor'); await p.dispatchEvent('#yname','change');
await p.click('#addrep'); await p.fill('[data-rep="0|name"]','Pat Rep'); await p.dispatchEvent('[data-rep="0|name"]','change'); await p.fill('[data-rep="0|email"]','pat@example.com'); await p.dispatchEvent('[data-rep="0|email"]','change');
await p.fill('#ytypes','sheriff, rancher, small town'); await p.dispatchEvent('#ytypes','change');
want('your types are kept on your profile, for every tool', await p.evaluate(()=>JSON.stringify(You.get().types))==='["sheriff","rancher","small town"]');
// SPOT: the roundup, whole
await p.click('#tabs [data-t="spot"]');
want('LOOK: rows from your types, each opens a search in a new tab', (await p.$$eval('.lk b',x=>x.map(y=>y.textContent))).slice(0,3).join('|')==='sheriff|rancher|small town'&&await p.$$eval('.lk a',x=>x.every(a=>a.target==='_blank'&&/^https:\/\/news\.google\.com\/search\?q=/.test(a.href))));
want('LOOK says what you search goes to Google', /what you search goes to Google/.test(await p.innerText('#main')));
await p.fill('#raw',fx('trades_roundup')); await p.click('#read'); await p.waitForTimeout(300);
let m=await p.innerText('#main');
want('a roundup: 3 projects in this, each with who is casting', /3 projects in this/i.test(m)&&/Dry Creek/.test(m)&&/Dana Pell & Ross Okafor casting/.test(m)&&/Lena Marsh casting/.test(m), m);
want('your words show on the ones that have them', /Your words in it: sheriff, small town/.test(m)&&/Your words in it: rancher/.test(m), m);
await p.click('[data-pick="2"]'); await p.waitForTimeout(150);
want('untick one: KEEP 2', (await p.innerText('#keepmany')).trim()==='KEEP 2');
await p.click('[data-pick="2"]'); await p.click('#keepmany'); await p.waitForTimeout(400);
want('kept all three, and it goes to OFFICES', await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')).items.length)===3&&await p.evaluate(()=>document.querySelector('#tabs [data-t="offices"]').classList.contains('on')));
// the IMDbPro list: Dry Creek and Salt Road are already there, Low Tide is new
await p.click('#tabs [data-t="spot"]'); await p.fill('#raw',fx('imdbpro_list')); await p.click('#read'); await p.waitForTimeout(300);
m=await p.innerText('#main');
want('an IMDbPro list: 3 projects, kind and status as written', /3 projects in this/i.test(m)&&/TV Mini Series · Filming/.test(m), m);
want('the two already on your list say so, and start unticked', (m.match(/Already on your list/g)||[]).length===2&&await p.evaluate(()=>[...document.querySelectorAll('[data-pick]')].map(x=>x.checked).join())==='false,false,true');
await p.click('#keepmany'); await p.waitForTimeout(400);
// OFFICES
m=await p.innerText('#main');
want('OFFICES: never had you in, first', /Casting now, never had you in 3/i.test(m)&&m.toLowerCase().indexOf('never had you in')<m.toLowerCase().indexOf('has had you in'), m.slice(0,400));
want('Wren Ashby: has had you in, your history, how they reached you', /Wren Ashby\nHas had you in/i.test(m)&&/You and Wren Ashby: 3 reads before this/.test(m)&&/Came to me through Actors Access 2 times, straight from the office 1 time\./.test(m), m);
want('Dana Pell: casting Salt Road and Low Tide, never had you in, ask your reps how', /Dana Pell\nNever had you in/i.test(m)&&/Breakdowns or direct: ask your reps\./.test(m), m);
const rep=await p.inputValue('#t_rep');
want('the report: three parts, what fits first', /^Here's what I'm seeing\.\n\nCASTING NOW THAT FITS ME\n- Salt Road/.test(rep)&&/OFFICES THAT KNOW ME, CASTING NOW\n- Wren Ashby: Dry Creek\./.test(rep)&&/OFFICES I SHOULD BE GOING IN FOR AND AM NOT\n- Dana Pell: Low Tide, Salt Road\. My words: rancher\.\n  Never had me in\. Do they go through Breakdowns, or direct\?/.test(rep), rep);
want('the report: no contacts, no em dashes, signed', !/@/.test(rep)&&!/—/.test(rep)&&/Sam Actor$/.test(rep), rep);
await p.click('#rmail');
const href=await p.getAttribute('#rmail','href');
want('EMAIL YOUR REPS: to your rep, the report in it', /^mailto:pat%40example\.com\?subject=What's%20casting%20-%20Sam%20Actor/.test(href)&&decodeURIComponent(href).indexOf('OFFICES I SHOULD BE GOING IN FOR')>0, href.slice(0,120));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#rpage')]);
const html=fs.readFileSync(await dl.path(),'utf8');
want('SAVE AS A PAGE: a page with the report, links you can tap', /What's casting · Sam Actor/.test(dl.suggestedFilename().replace(' - ',' · ').replace(/ - .*$/,''))||/<title>What&#39;s casting · Sam Actor<\/title>/.test(html), dl.suggestedFilename());
want('the page: the parts in bold, the story link a link', /<b>OFFICES THAT KNOW ME, CASTING NOW<\/b>/.test(html)&&/<a href="https:\/\/example.com\/news\/pilot-orders">/.test(html));
// a kept one, opened from OFFICES
await p.click('[data-open]'); await p.waitForTimeout(300);
want('tap one: it opens, with your words next to it', /Your words in it:/.test(await p.innerText('#main'))||/Just passing this along/.test(await p.inputValue('#t_pa')), await p.innerText('#main'));
// one notice still reads as one
await p.click('#tabs [data-t="spot"]'); await p.fill('#raw',fx('northgate_notice')); await p.click('#read'); await p.waitForTimeout(300);
want('a single notice: the one card, as before (and "Northgate" on the list gets the same-project question, never joined)', /What it says/i.test(await p.innerText('#main'))&&!!(await p.$('#sameask'))&&/Northgate/.test(await p.innerText('#sameask'))&&!!(await p.$('#keepsep')));
// the home profile has your types too
const q=await ctx.newPage(); await q.goto('http://localhost:8811/index.html'); await q.waitForTimeout(800);
want('home YOUR PROFILE: Your types, filled', await q.evaluate(()=>{ const t=document.querySelector('[data-yl="types"]'); return t&&t.value; })==='sheriff, rancher, small town');
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
