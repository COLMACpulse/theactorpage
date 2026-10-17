/* SPOTTED end to end, phone size, made-up people only. Needs a local server on :8811 at the repo root.
   NODE_PATH=... node spotted/tests/spotted_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const F=path.join(__dirname,'..','..','shared','fixtures'), fx=f=>fs.readFileSync(path.join(F,'spotted_'+f+'.txt'),'utf8');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844}}); await ctx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
const errs=[];
// the Hub on this device: two reads for Dana Pell, a booked commercial; NOTES: a class with her
const h=await ctx.newPage(); h.on('pageerror',e=>errs.push('hub '+e.message)); h.on('dialog',d=>d.accept());
await h.goto('http://localhost:8811/hub/index.html'); await h.waitForTimeout(900);
await h.evaluate(async()=>{ if(isDemo()) await dropDemoData();
 projects.push(newProject({aaid:'T1',project:'LOW TIDE',title:'LOW TIDE',role:'DOCK COP',casting_office:'Dana Pell Casting',kind:'audition',status:'Confirmed',date:'2026-03-01'}));
 projects.push(newProject({aaid:'T2',project:'DRY CREEK',title:'DRY CREEK',role:'DEPUTY',casting_office:'Dana Pell',kind:'audition',status:'Confirmed',date:'2026-06-10'}));
 saveProjects(); credits.push({title:'Morning Ride',role:'',character:'Cycling Dad',kind:'credit',medium:'Commercial',state:'archived'}); saveCredits();
 const s=Notes.addSession({date:'2026-03-12',room:'class',who:[{name:'Dana Pell',role:'casting'}],title:'LOW TIDE',part:'ANNA'}); Notes.addNote({sid:s.id,text:'Let the silence sit.'}); });
await h.waitForTimeout(500);
const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/spotted/index.html'); await p.evaluate(()=>{ localStorage.removeItem('theactorpage_spotted_v1'); localStorage.removeItem('spotted_ui_v1'); }); await p.reload(); await p.waitForTimeout(600);
// YOU: name, links, a rep, a conflict you hold
await p.click('#tabs [data-t="you"]');
want('YOU: reads the Hub on this device, never changes it', /Reading your Hub on this device: 2 auditions, 1 credits/.test(await p.innerText('#main'))&&/NOTES: 1 people/.test(await p.innerText('#main')), await p.innerText('#main'));
await p.fill('#yname','Sam Actor'); await p.dispatchEvent('#yname','change');
await p.fill('#yreel','https://example.com/sam/reel'); await p.dispatchEvent('#yreel','change');
await p.click('#addrep'); await p.fill('[data-rep="0|name"]','Pat Rep'); await p.dispatchEvent('[data-rep="0|name"]','change'); await p.fill('[data-rep="0|email"]','pat@example.com'); await p.dispatchEvent('[data-rep="0|email"]','change');
await p.click('#addheld'); await p.fill('[data-held="0|brand"]','Morning Brew Co'); await p.dispatchEvent('[data-held="0|brand"]','change'); await p.fill('[data-held="0|category"]','coffee'); await p.dispatchEvent('[data-held="0|category"]','change'); await p.fill('[data-held="0|until"]','2027-06-30'); await p.dispatchEvent('[data-held="0|until"]','change');
// SPOT: paste the notice
await p.click('#tabs [data-t="spot"]');
await p.evaluate(t=>navigator.clipboard.writeText(t),fx('northgate_notice')); await p.click('#paste'); await p.click('#read'); await p.waitForTimeout(300);
const m=await p.innerText('#main');
want('SPOT: the fields read from the notice', await p.inputValue('#cf_project')==='NORTHGATE COFFEE'&&await p.inputValue('#cf_role')==='BARISTA DAD'&&await p.inputValue('#cf_casting')==='Dana Pell');
want('SPOT: the musts, quoted', /Must be able to steam milk and pour latte art\./.test(m)&&/Must ride a bicycle\./.test(m)&&/Real people types only, no models\./.test(m), m);
want('SPOT: pay and conflicts as written', /Rate: \$600\/day \+ \$1,500 usage/.test(m)&&/Coffee, Quick Service Restaurants/.test(m));
want('SPOT: the Zoom link is kept private', /A private link .* is on this\. Kept here, left out of every note\./.test(m));
want('SPOT: your history, the NOTES line, your dad role, the conflict you hold', /You and Dana Pell: 2 reads before this/.test(m)&&/Dana Pell gave you a note/.test(m)&&/Roles of yours with "dad": 1 booked: Cycling Dad \(Morning Ride\)/.test(m)&&/You hold Morning Brew Co \(coffee\) through 2027-06-30/.test(m), m);
want('SPOT: no score, no verdict', !/\d+\s*\/\s*100|\bscore\b|right for you|you should/i.test(m));
await p.click('#keep'); await p.waitForTimeout(300);
// the kept one: three notes
const pa=await p.inputValue('#t_pa'), pt=await p.inputValue('#t_pt'), dn=await p.inputValue('#t_dn');
want('pass it along: "Just passing this along." with the facts', /^Just passing this along\.\n\nNORTHGATE COFFEE, Dana Pell casting\./.test(pa)&&/You hold Morning Brew Co/.test(pa)&&/\nSam Actor$/.test(pa), pa);
want('pitch: built from facts, reel link, "Love to hear from you."', /^Hi Dana,/.test(pt)&&/Sam Actor has been in front of you 2 times/.test(pt)&&/Morning Ride \(Cycling Dad\)/.test(pt)&&/Reel: https:\/\/example\.com\/sam\/reel/.test(pt)&&/Love to hear from you\.$/.test(pt), pt);
want('direct: your voice', /I'm Sam Actor\./.test(dn)&&/You've had me in 2 times/.test(dn), dn);
want('no Zoom link and no rep phone in any note', ![pa,pt,dn].some(t=>/zoom\.us|555-0100/.test(t)));
await p.fill('#mine','I grew up behind a coffee bar.'); await p.dispatchEvent('#mine','change'); await p.waitForTimeout(200);
want('your own line goes in the pass-along', /I grew up behind a coffee bar\./.test(await p.inputValue('#t_pa')));
const href=await p.evaluate(()=>{ const a=document.querySelector('[data-mail="pa"]'); a.addEventListener('click',e=>e.preventDefault(),{once:true}); a.click(); return a.getAttribute('href'); });
want('EMAIL YOUR REPS: to the rep, subject and body filled', /^mailto:pat%40example\.com\?subject=Just%20passing%20this%20along/.test(href)&&/I%20grew%20up%20behind/.test(href), href);
await p.waitForTimeout(400);
want('emailing it moves it to Passed along', await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')).items[0].status)==='passed');
await p.click('#t_pa'); await p.click('[data-copy="pa"]'); await p.waitForTimeout(200);
want('COPY puts the note on the clipboard', /^Just passing this along\./.test(await p.evaluate(()=>navigator.clipboard.readText())));
// two more: a trade story and an email
for(const f of ['drycreek_news','saltflats_email']){ await p.click('#tabs [data-t="spot"]'); await p.fill('#raw',fx(f)); await p.click('#read'); await p.waitForTimeout(200); await p.click('#keep'); await p.waitForTimeout(200); }
await p.click('#back'); await p.waitForTimeout(200);
want('LIST: three, newest first', (await p.$$eval('.it b',x=>x.map(y=>y.textContent))).join('|')==='Salt Flats Water · TRAIL RUNNER|Dry Creek|NORTHGATE COFFEE · BARISTA DAD', await p.$$eval('.it b',x=>x.map(y=>y.textContent)));
await p.fill('#q','dana'); await p.waitForTimeout(200);
want('LIST: find "dana" keeps the focus and finds one', (await p.$$eval('.it',x=>x.length))===1&&await p.evaluate(()=>document.activeElement.id)==='q');
await p.fill('#q',''); await p.waitForTimeout(150);
await p.click('[data-fst="passed"]'); await p.waitForTimeout(150);
want('LIST: filter by where it stands', (await p.$$eval('.it',x=>x.length))===1);
await p.click('[data-fst=""]'); await p.waitForTimeout(150);
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#lpage')]);
const page=fs.readFileSync(await dl.path(),'utf8');
want('SAVE AS A PAGE: a standalone searchable page with the story link, named for you', /^Spotted - Sam Actor - \d{4}-\d\d-\d\d\.html$/.test(dl.suggestedFilename())&&/id="q"/.test(page)&&/example\.com\/news\/dry-creek-pilot-order/.test(page)&&(page.match(/<article/g)||[]).length===3&&!/zoom\.us/.test(page), dl.suggestedFilename());
// shared in from another app
await p.goto('http://localhost:8811/spotted/index.html?title='+encodeURIComponent('Dry Creek pilot order')+'&url='+encodeURIComponent('https://example.com/news/dry-creek-pilot-order')); await p.waitForTimeout(400);
want('shared from another app: opens on SPOT with the link as the source', await p.inputValue('#cf_source')==='https://example.com/news/dry-creek-pilot-order'&&!/\?/.test(await p.evaluate(()=>location.search)));
// the Hub: a callback notice pasted as a request gets the musts on its checklist
await h.reload(); await h.waitForTimeout(800);
const r=await h.evaluate(t=>{ const r=withSpotted(HubReq.read(t),t); addRequestFrom(r,true); const a=projects[0]; return {title:r.title,role:r.role,cast:r.castingDirectors,items:reqChecklist(a),rows:reqRows(r).map(x=>x[0]+': '+x[1])}; },fx('northgate_notice'));
want('Hub: a callback notice fills project, role and casting', r.title==='NORTHGATE COFFEE'&&r.role==='BARISTA DAD'&&r.cast.join()==='Dana Pell', r);
want('Hub: the musts are on the checklist', r.items.includes('Must ride a bicycle.')&&r.items.includes('Must be able to steam milk and pour latte art.'), r.items);
want('Hub: pay and conflicts as written on the card', r.rows.some(x=>/^Pay as written: Rate: \$600/.test(x))&&r.rows.some(x=>x==='Conflicts: Coffee, Quick Service Restaurants'), r.rows);
await h.evaluate(()=>{ go('offices'); }); await h.waitForTimeout(300);
want('Hub: Casting has the way to SPOTTED', await h.evaluate(()=>!!document.querySelector('a[href="../spotted/"]')));
await p.screenshot({path:path.join(__dirname,'..','..','..','spotted_shot.png')}).catch(()=>{});
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
