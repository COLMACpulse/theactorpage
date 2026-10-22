/* CONTACTS, BRING IN A LIST: a made-up workshop list as a CSV. A preview first (new, already here, by role, rows with
   no name left out), then in: new people added as not confirmed, someone already here only gets blanks filled.
   Server on :8811.  NODE_PATH=... node contacts/tests/list_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/contacts/'); await p.evaluate(()=>{ localStorage.clear(); Contacts.add({name:'Dana Pell',role:'casting',phone:'555-0100'}); }); await p.reload(); await p.waitForTimeout(700);
const CSV='Workshop list, October\n\nFirst Name,Last Name,Office,Title,Email,Notes\nDana,Pell,Pell Casting,Casting Director,dana@example.com,\nJo,Banner,Banner Casting,Casting Associate,jo@example.com,"Liked the stillness, said call back"\n,,,,,just a note\nSam,Writer,Made Up Weekly,Reporter,,\nLee,Coach,,,,\n';
await p.setInputFiles('#listfile',{name:'workshop.csv',mimeType:'text/csv',buffer:Buffer.from(CSV)}); await p.waitForTimeout(400);
const box=await p.innerText('#listbox');
want('a preview first: how many, new and already here, by role, the row with no name left out', /4 people: 3 new, 1 already here/.test(box)&&/1 row had no name and stay out/.test(box)&&/2 casting/.test(box)&&/1 press/.test(box)&&/1 other/.test(box), box);
await p.selectOption('#l_role','coach'); await p.waitForTimeout(200);
want('anyone the list doesn\'t say: you pick, and the count follows', /1 coach/.test(await p.innerText('#listbox')));
await p.click('#listin'); await p.waitForTimeout(300);
want('in: 3 added, Dana Pell already here got her blanks filled', /3 added from workshop\.csv, 1 already here got their blanks filled in\./.test(await p.innerText('#view')), await p.innerText('#view').then(t=>t.slice(0,200)));
const r=await p.evaluate(()=>({dana:Contacts.find('Dana Pell'),jo:Contacts.find('Jo Banner'),sam:Contacts.find('Sam Writer'),lee:Contacts.find('Lee Coach'),n:Contacts.mine().length}));
want('Dana Pell: phone kept, email and office filled in, not doubled', r.n===4&&r.dana.phone==='555-0100'&&r.dana.email==='dana@example.com'&&r.dana.company==='Pell Casting');
want('Jo Banner: casting, with the note from the list and where it came from', r.jo.role==='casting'&&/Liked the stillness, said call back/.test(r.jo.note)&&/From your list: workshop\.csv/.test(r.jo.note));
want('Sam Writer: press, not confirmed', r.sam.role==='press'&&r.sam.checked===false&&/NOT CONFIRMED YET/.test(await p.innerText('.person:has-text("Sam Writer")')));
want('Lee Coach: the role you picked for anyone the list didn\'t say', r.lee.role==='coach');
await p.setInputFiles('#listfile',{name:'junk.csv',mimeType:'text/csv',buffer:Buffer.from('a,b,c\n1,2,3\n')}); await p.waitForTimeout(300);
want('a list with no name column: says what it needs', /needs a column called Name, or First and Last name/.test(await p.innerText('#listbox')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
