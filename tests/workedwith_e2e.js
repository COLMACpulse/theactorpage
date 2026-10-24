/* WORKED WITH in the browser: the director on your credits; with a TMDb key (a made-up TMDb answered here), the DP,
   writer, producer and casting on a film; Contacts shows them; a breakdown that names one says so on its card, and
   FOR MY REPS puts one line on the reps sheet; Spotted says so too. Made-up people and shows. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1100,height:900}}); let calls=0;
await c.route('https://api.themoviedb.org/**',r=>{ calls++; const u=r.request().url();
 if(/search\/movie/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[{id:11,title:'Harbor Lights',poster_path:'/x.jpg',popularity:5}]})});
 if(/search\/tv/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[]})});
 if(/movie\/11\/credits/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({crew:[{name:'Dana Wolfe',job:'Director',department:'Directing'},{name:'Kit Moreno',job:'Director of Photography',department:'Camera'},{name:'Ana Bell',job:'Screenplay',department:'Writing'},{name:'Rob Vance',job:'Producer',department:'Production'},{name:'Jen Holt',job:'Casting',department:'Production'},{name:'Ty Gaffer',job:'Gaffer',department:'Lighting'}]})});
 return r.fulfill({status:404,body:'{}'}); });
await c.route('https://image.tmdb.org/**',r=>r.fulfill({status:404,body:''}));
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/hub/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(()=>{ credits=credits.filter(x=>x.kind!=='credit'); credits.push({cid:newCid(),kind:'credit',medium:'Film',title:'Harbor Lights',director:'Dana Wolfe',role:'Lead',net:''}); saveCredits(); render(); });
want('the director your credit names: in, from your résumé, no key needed', await p.evaluate(()=>{ const x=WorkedWith.all(); return x.length===1&&x[0].name==='Dana Wolfe'&&x[0].on[0].from==='resume'; }));
await p.evaluate(()=>{ TMDB_KEY='made-up-key'; wwFind(); }); await p.waitForFunction(()=>!WWST.busy&&WWST.done===1,null,{timeout:8000}).catch(()=>{});
const all=await p.evaluate(()=>WorkedWith.all().map(x=>x.name+':'+x.on.map(o=>o.job+'/'+o.from).join(',')));
want('with a TMDb key: DP, writer, producer, casting on that film; the director once; not the gaffer', all.length===5&&all.includes('Kit Moreno:dp/tmdb')&&all.includes('Dana Wolfe:director/resume')&&!all.some(x=>/Gaffer/.test(x)), all);
await p.evaluate(()=>{ tab='intake'; render(); }); await p.waitForTimeout(300);
const panel=await p.evaluate(()=>document.getElementById('view').innerHTML);
want('the Hub panel: counts by job, every credit looked up', /Who you've worked with · 5/.test(panel)&&/EVERY CREDIT LOOKED UP/.test(panel)&&/Director of photography 1/.test(panel), (panel.match(/Who you've worked with[\s\S]{0,300}/)||[''])[0]);
const n0=calls; await p.evaluate(()=>wwFind()); await p.waitForTimeout(500);
want('looked up once: asking again calls TMDb for nothing', calls===n0);
/* a breakdown that names Kit Moreno */
await p.evaluate(()=>{ const r=HubReq.read('Due: Friday 10/30, 5pm PST'); r.title='Salt Flats'; r.role='Deckhand'; r.director='Kit Moreno'; addRequestFrom(r,true); tab='road'; render(); });
await p.waitForTimeout(400);
const card=await p.evaluate(()=>{ const a=projects.find(x=>x.title==='Salt Flats'); return wwLine(a); });
want('the audition card: you have worked with Kit Moreno (DP on Harbor Lights)', /Kit Moreno \(DP on Harbor Lights\)/.test(card)&&/FOR MY REPS/.test(card), card.replace(/<[^>]+>/g,' ').slice(0,200));
await p.evaluate(()=>{ const a=projects.find(x=>x.title==='Salt Flats'); wwPitch(WorkedWith.key('Kit Moreno'),a.id); });
const sheet=await p.evaluate(()=>RepSheet.text(repsNow().m,null));
want('FOR MY REPS: one line on the reps sheet, in plain words', /SOMEONE I'VE WORKED WITH IS ON IT\n- Kit Moreno \(DP on Harbor Lights\) is on Salt Flats\./.test(sheet), sheet.slice(0,500));
want('the card says it is on your reps sheet now', /on your reps sheet/.test(await p.evaluate(()=>wwLine(projects.find(x=>x.title==='Salt Flats')))));
/* Contacts */
await p.goto('http://localhost:8811/contacts/'); await p.waitForTimeout(800);
const ct=await p.innerText('main');
want('Contacts: the people you worked with, each with the credit and where it came from', /Kit Moreno/.test(ct)&&/Jen Holt/.test(ct)&&/Dana Wolfe/.test(ct), ct.slice(0,400));
want('…with the credit and where it came from', await p.evaluate(()=>{ const x=Contacts.everyone({worked:Object.values(JSON.parse(localStorage.getItem('theactorpage_workedwith_v1')).people)}).find(y=>y.name==='Kit Moreno'); return x&&x.from.some(f=>f==='Worked with: DP on Harbor Lights, from TMDb')&&x.role==='crew'; }));
/* Spotted */
await p.goto('http://localhost:8811/spotted/'); await p.waitForTimeout(600);
await p.click('#wwords'); await p.fill('#raw','NOW CASTING: DRY CREEK\nDirector: Ana Bell\nCasting: Pell Casting\nSeries regular, shoots in Austin.'); await p.click('#read'); await p.waitForTimeout(300); await p.click('#later'); await p.waitForTimeout(300); await p.click('[data-open]'); await p.waitForTimeout(400);
const st=await p.innerText('main');
want('Spotted: you have worked with Ana Bell (writer on Harbor Lights), FOR MY REPS there too', /YOU'VE WORKED WITH|You've worked with/i.test(st)&&/Ana Bell \(writer on Harbor Lights\)/.test(st)&&/FOR MY REPS/.test(st), st.slice(0,500));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
