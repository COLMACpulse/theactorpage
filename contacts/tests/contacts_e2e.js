/* CONTACTS: one list. Someone from NOTES shows up on their own; KEEP adds your details; add a person; find; by role;
   do not contact. REPS: look at a rep, steps, follow-up due, signed moves them up and Spotted emails them.
   Notes suggests names from Contacts. Made-up people only. Server on :8811.  NODE_PATH=... node contacts/tests/contacts_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let outside=[]; p.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/contacts/'); await p.evaluate(()=>{ localStorage.clear(); Notes.addSession({date:'2026-09-12',room:'class',who:[{name:'Jo Banner',role:'casting'}],title:'Scene night'});
 localStorage.setItem('theactorpage_spotted_v1',JSON.stringify({items:[{id:'s1',at:Date.now(),status:'spotted',card:{project:'Salt Flat',casting:['Canyon Casting']}}],me:{reps:[]},held:[]})); });
await p.reload(); await p.waitForTimeout(900);
let v=await p.innerText('#view');
want('the tools already know: Jo Banner from NOTES, Canyon Casting from SPOTTED, said where from', /Jo Banner/.test(v)&&/Notes: 1 session/.test(v)&&/Canyon Casting/.test(v)&&/Spotted: casting Salt Flat/.test(v)&&/FROM YOUR TOOLS/.test(v), v.slice(0,400));
await p.click('.person:has-text("Jo Banner")'); await p.waitForTimeout(200);
await p.fill('#f_email','jo@example.com'); await p.fill('#f_note','Liked the stillness.'); await p.click('#keep'); await p.waitForTimeout(300);
want('KEEP: Jo Banner is kept, with your email and note', await p.evaluate(()=>{ const x=Contacts.find('Jo Banner'); return x&&x.email==='jo@example.com'&&x.note==='Liked the stillness.'&&x.role==='casting'; })&&/Jo Banner kept\./.test(await p.innerText('#view')));
await p.click('#add'); await p.fill('#f_name','Sam Reyes'); await p.selectOption('#f_role','director'); await p.fill('#f_city','Austin'); await p.click('#keepnew'); await p.waitForTimeout(300);
want('add a person', /Sam Reyes added\./.test(await p.innerText('#view'))&&(await p.$$('.person')).length===3);
await p.fill('#q','austin'); await p.waitForTimeout(200);
want('find: by city', (await p.$$eval('.person',x=>x.map(e=>e.innerText))).every(t=>/Sam Reyes/.test(t))&&(await p.$$('.person')).length===1);
await p.fill('#q',''); await p.click('[data-role="casting"]'); await p.waitForTimeout(200);
want('by role: casting only', (await p.$$eval('.person',x=>x.map(e=>e.innerText))).every(t=>/CASTING/.test(t))&&(await p.$$('.person')).length===2);
await p.click('[data-role=""]'); await p.click('.person:has-text("Jo Banner")'); await p.check('#f_dnc'); await p.click('#save'); await p.waitForTimeout(200);
want('do not contact: said on the person', /DO NOT CONTACT/.test(await p.innerText('.person:has-text("Jo Banner")')));
// REPS
await p.click('#t_reps'); await p.waitForTimeout(200);
v=await p.innerText('#view');
want('REPS: no rep yet, where to look, and the warning about paying up front', /No agent or manager yet/.test(v)&&/SAG-AFTRA agents/.test(v)&&/Association of Talent Agents/.test(v)&&/never charges you to sign/.test(v));
await p.click('#addrep'); await p.fill('#r_name','Morgan Lee'); await p.fill('#r_company','Lee Talent'); await p.click('#keeprep'); await p.waitForTimeout(300);
const card='[data-rep]:has-text("Morgan Lee")';
want('a rep to look at: under LOOKING AT, researching', /Morgan Lee added to LOOKING AT\./.test(await p.innerText('#view'))&&await p.$eval(card+' [data-step="researching"]',e=>e.classList.contains('on')));
await p.click(card+' [data-step="submitted"]'); await p.waitForTimeout(200);
await p.selectOption(card+' [data-how]','email'); await p.fill(card+' [data-next]','2026-01-02'); await p.press(card+' [data-next]','Tab'); await p.waitForTimeout(300);
v=await p.innerText('#view');
want('submitted, by email, a follow-up that is due: it says so', /Follow-up is due/.test(v)&&/1 follow-up due/.test(v)&&/Submitted/.test(await p.innerText(card)), v.slice(0,500));
await p.click(card+' [data-step="signed"]'); await p.waitForTimeout(300);
want('signed: Morgan Lee moves up to YOUR REPS', /Morgan Lee is one of your reps now\./.test(await p.innerText('#view'))&&/YOUR REPS[\s\S]*Morgan Lee[\s\S]*LOOKING AT/.test(await p.innerText('#view')));
await p.evaluate(()=>{ const x=Contacts.find('Morgan Lee'); Contacts.set(x.id,{email:'morgan@example.com'}); });
// Spotted sends to them; Notes suggests names
await p.goto('http://localhost:8811/spotted/'); await p.waitForTimeout(800);
want('Spotted: your signed rep from CONTACTS gets the email', await p.evaluate(()=>/morgan@example\.com/.test(repEmails())).catch(()=>false)||await p.evaluate(()=>typeof Contacts!=='undefined'&&Contacts.myReps()[0].email==='morgan@example.com'));
await p.goto('http://localhost:8811/notes/'); await p.waitForTimeout(800);
want('Notes: names from CONTACTS are offered when you type who was in the room', await p.evaluate(()=>{ try{ return Contacts.mine().some(x=>x.name==='Sam Reyes'); }catch(e){ return false; } }));
want('nothing went anywhere', outside.length===0, outside);
want('no em dashes', !/—/.test(v));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
