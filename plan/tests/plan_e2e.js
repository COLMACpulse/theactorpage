/* THE PLAN in the browser: say it (typed here; LISTEN with a stand-in recognizer), WHAT I HEARD, fix it, the plan,
   on your agenda (and on home), the office into Contacts, steps ticked off, from a request, delete.
   Made-up show, office and place only. Server on :8811. */
const {chromium}=require('playwright');
const NOTE="i got an audition for next thursday. ridgeline casting. recurring quest star. harbor lights. i've read for the office a bunch, they cast me in my last gig. same universe. coast guard captain. character is tall. i have a reader, want to get it done wed or early morning thursday. working next week in ohio. its due at 11:00am, direct submit to actorsaccess. see casting notice for additional info";
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});
await c.addInitScript(()=>{ /* a stand-in recognizer: hears one sentence */
 function R(){ this.start=()=>setTimeout(()=>{ this.onresult&&this.onresult({resultIndex:0,results:[Object.assign([{transcript:'my reader is free tuesday'}],{isFinal:true})]}); this.onend&&this.onend(); },50); this.stop=()=>{ this.onend&&this.onend(); }; }
 window.SpeechRecognition=R; window.webkitSpeechRecognition=R; });
/* pin "today" to a Thursday so the days are known */
await c.addInitScript(()=>{ const T=new Date('2026-10-22T09:00:00').getTime(), D=Date; class FD extends D{ constructor(...a){ super(...(a.length?a:[T])); } static now(){ return T; } } window.Date=FD; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/plan/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(300);
let t=await p.innerText('main');
want('start: say it or type it, the mic says where your voice goes, a voice note', /Say it or type it/i.test(t)&&/in Chrome that goes through Google/i.test(t)&&/keep a voice note/i.test(t)&&!/score|pressure|severity/i.test(t));
await p.click('#go'); await p.waitForTimeout(100);
want('nothing said: asks first', /Say or type it first/.test(await p.innerText('#msg')));
await p.fill('#t',NOTE); await p.click('#listen'); await p.waitForTimeout(300);
want('LISTEN adds what it heard to your words', /my reader is free tuesday\.$/.test(await p.inputValue('#t')));
await p.click('#go'); await p.waitForTimeout(300);
t=await p.innerText('main');
want('the plan: title, due Thursday 11 AM, direct submit on Actors Access, the role and the office', /Harbor Lights/i.test(await p.innerText('h2.pt'))&&/DUE Thursday, Oct 29, 11:00 AM · direct submit on Actors Access/.test(t)&&/Recurring guest star · Ridgeline Casting/.test(t), t.slice(0,400));
want('heads up: working in ohio, where will you and your reader be', /Working next week in ohio\./.test(t)&&/Your tape day is Wednesday\. Where will you and your reader be\?/.test(t));
const days=await p.$$eval('.steps .d',x=>x.map(e=>e.textContent));
want('the days: today, tomorrow, Saturday, Tuesday, Wednesday, Thu Oct 29', days.join()==='TODAY,TOMORROW,SATURDAY,TUESDAY,WEDNESDAY,THU, OCT 29', days);
want('each step opens its tool', (await p.$$eval('.steps a.go',x=>x.map(a=>a.getAttribute('href')))).join()==='../actor-os/?open=1,../breakdown/?open=1,../memorizer/?open=1,../actor-os/?open=1,../actor-os/?open=1,../actor-os/?open=1');
want('WHAT I HEARD is open to fix, nothing kept yet', await p.$eval('details.heard',e=>e.open)&&await p.evaluate(()=>Plan.all().length)===0);
want('what you said, kept as you said it', (await p.innerText('.said')).startsWith('i got an audition for next thursday.'));
/* fix one: the tape day moves to Tuesday */
await p.fill('#h_t1','2026-10-27'); await p.fill('#h_t2',''); await p.click('#redo'); await p.waitForTimeout(200);
want('fix the tape day: the plan follows', (await p.$$eval('.steps .d',x=>x.map(e=>e.textContent))).includes('TUESDAY')&&/TAPE IT\.$/.test((await p.$$eval('.steps .w',x=>x.map(e=>e.textContent))).find(w=>/TAPE IT/.test(w)).replace(/ OPEN$/,'')));
await p.fill('#h_t1','2026-10-28'); await p.fill('#h_t2','2026-10-29'); await p.click('#redo'); await p.waitForTimeout(200);
await p.click('#agenda'); await p.waitForTimeout(400);
t=await p.innerText('main');
want('PUT IT ON MY LIST: kept, says so, checkboxes to tick off', /On your list/.test(t)&&await p.evaluate(()=>Plan.all().length===1&&Plan.all()[0].agenda)&&(await p.$$eval('[data-done]',x=>x.length))===6);
want('the office goes in Contacts as casting, with how you know them', await p.evaluate(()=>{ const x=Contacts.find('Ridgeline Casting'); return !!x&&x.role==='casting'&&/Cast me before/.test(x.note); }));
want('YOUR WORDS: the character, you and the office, the rest', /THE CHARACTER\s+Coast guard captain\s+tall/i.test(t)&&/YOU AND RIDGELINE CASTING\s+They've cast me before/i.test(t)&&/same universe\./.test(t));
await p.click('[data-done="0"]'); await p.waitForTimeout(200);
want('tick a step off', await p.$eval('.steps li',e=>e.classList.contains('done')));
/* home */
await p.goto('http://localhost:8811/how.html'); await p.waitForTimeout(1200);
const w=await p.innerText('#week');
want('YOUR AGENDA on home: the plan\'s next steps on their days', /TOMORROW\s+Harbor Lights: Break it down/.test(w)&&/Harbor Lights: TAPE IT/.test(w)&&!/Harbor Lights: Read the sides/.test(w), w);
want('home, in YOU: THE PLAN, one tap', await p.getAttribute('#st_plan','href')==='plan/');
/* from a request you dropped in */
const rid=await p.evaluate(()=>Inbox.put('request',{raw:'NIGHT SHIFT #104\nRole: NURSE PELL\nCo-Star\nCasting Director: Dana Pell\nPlease submit by 10/30 at 5pm PT on Eco Cast.',title:'Night Shift #104',role:'NURSE PELL'}).id);
await p.goto('http://localhost:8811/plan/?req='+rid); await p.waitForTimeout(300);
want('from a request: its facts show, the box is yours', /From your request: Night Shift/i.test(await p.innerText('main'))&&(await p.inputValue('#t'))==='');
await p.fill('#t','need a reader. tape it wednesday.'); await p.click('#go'); await p.waitForTimeout(300);
t=await p.innerText('main');
want('the request fills what you didn\'t say: title, part, due, Actors Access', /Night Shift/i.test(await p.innerText('h2.pt'))&&/DUE Friday, Oct 30, 5:00 PM/.test(t)&&/Actors Access/.test(t)&&/Find a reader/.test(t), t.slice(0,500));
await p.click('#keep'); await p.waitForTimeout(300);
want('JUST KEEP IT: kept, not on your list', await p.evaluate(()=>Plan.all().length===2&&Plan.all().filter(x=>x.agenda).length===1));
await p.click('#del'); await p.waitForTimeout(300);
want('delete an audition', await p.evaluate(()=>Plan.all().length)===1&&/Your auditions/i.test(await p.innerText('main')));
want('your auditions: what\'s next', /HARBOR LIGHTS · RECURRING GUEST STAR/i.test(await p.innerText('main'))&&/Next: Break it down/.test(await p.innerText('main')));
/* everything else you have to do: today, this week, this month, in lanes */
await p.fill('#t','Today, call my agent and watch two episodes of the show, then rent a lens'); await p.click('#go'); await p.waitForTimeout(200);
want('not an audition: on today, split into three, said so', /Added 3 to today: Call my agent, Watch two episodes of the show, Rent a lens\./.test(await p.innerText('#msg')), await p.innerText('#msg'));
let col=await p.innerText('#col_today');
want('today: each with its lane, and the audition step due today alongside', /Call my agent\s+other/.test(col)&&/Watch two episodes of the show\s+research/.test(col)&&/Rent a lens\s+shoot/.test(col), col);
await p.fill('#t','This week: dialect class'); await p.click('#go'); await p.waitForTimeout(200);
want('this week, from what you said', /Dialect class\s+study/.test(await p.innerText('#col_week')));
await p.click('[data-lane="study"]'); await p.waitForTimeout(150);
want('a lane: only that lane', !/Call my agent/.test(await p.innerText('#board'))&&/Dialect class/.test(await p.innerText('#board')));
await p.click('[data-lane=""]'); await p.waitForTimeout(150);
await p.selectOption('#col_today .it:has-text("Call my agent") select','month'); await p.waitForTimeout(150);
want('move one to this month', /Call my agent/.test(await p.innerText('#col_month')));
await p.check('#col_today .it:has-text("Rent a lens") input'); await p.waitForTimeout(150);
want('tick it done: crossed off', await p.$eval('#col_today .it:has-text("Rent a lens")',e=>e.classList.contains('done')));
await p.click('#cleardone'); await p.waitForTimeout(150);
want('clear what\'s done', !/Rent a lens/.test(await p.innerText('#board')));
want('no scores, no pressure, no severity anywhere', !/score|pressure|severity|\bS[0-5]\b/i.test(await p.innerText('main')));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
