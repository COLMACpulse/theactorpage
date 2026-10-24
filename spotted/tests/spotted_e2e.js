/* SPOTTED, the polite nudge. Phone (dark) and computer (light), made-up people only. Server on :8811 at the repo root.
   NODE_PATH=... node spotted/tests/spotted_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp', F=path.join(__dirname,'..','..','shared','fixtures'), fx=f=>fs.readFileSync(path.join(F,'spotted_'+f+'.txt'),'utf8');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
const errs=[];
// a made-up screenshot: a PNG drawn here
const png=async p=>p.evaluate(async()=>{ const c=document.createElement('canvas'); c.width=300; c.height=400; const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,300,400); g.fillStyle='#000'; g.font='20px sans-serif'; g.fillText('SHERIFF BEN',20,40); const bl=await new Promise(r=>c.toBlob(r,'image/png')); return Array.from(new Uint8Array(await bl.arrayBuffer())); });

/* ---- computer, light ---- */
const cx=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light'}); await cx.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
const p=await cx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/spotted/index.html'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_spotted_pics'); You.set('name','Riley Hart'); }); await p.reload(); await p.waitForTimeout(600);
let m=await p.innerText('#main');
want('front: the header says what it is', /YOU · SPOTTED/i.test(await p.textContent('header'))&&/Something your reps should see/.test(await p.innerText('header')));
want('front: three ways in', /A screenshot/.test(m)&&/The words or the link/.test(m)&&/Just say it/.test(m), m);
want('front: no tabs, no JUICE, no OFFICES', !(await p.$('#tabs'))&&!/JUICE|OFFICES|THE WIRE/i.test(m));
want('front: static header icon', await p.evaluate(()=>!document.querySelector('header animate, header .pulse')&&getComputedStyle(document.querySelector('.hico')).animationName==='none'));
want('front: light theme', await p.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(236, 231, 220)');
// a rep
await p.fill('[data-rep="0|name"]','Pat Agent'); await p.dispatchEvent('[data-rep="0|name"]','change'); await p.waitForTimeout(100);
await p.fill('[data-rep="0|email"]','pat@example.com'); await p.dispatchEvent('[data-rep="0|email"]','change'); await p.waitForTimeout(150);
want('your reps: the rep shows', /Pat Agent/.test(await p.innerText('#repsbox')));
// a screenshot
const bytes=await png(p);
await p.setInputFiles('#shotin',{name:'shot.png',mimeType:'image/png',buffer:Buffer.from(bytes)}); await p.waitForTimeout(500);
want('screenshot: the nudge opens with your picture and the role box first', !!(await p.$('#bigpic'))&&await p.evaluate(()=>document.activeElement.id)==='cf_role'&&await p.evaluate(()=>document.getElementById('bigpic').naturalWidth)===300);
let note=await p.inputValue('#t_pa');
want('the note: short, polite, signed', note==='Hi Pat,\n\nJust passing this along. This looks interesting.\n\nRiley Hart', note);
await p.fill('#cf_role','SHERIFF BEN'); await p.dispatchEvent('#cf_role','change'); await p.waitForTimeout(150);
note=await p.inputValue('#t_pa');
want('the role goes in: "SHERIFF BEN looks interesting."', /Just passing this along\. SHERIFF BEN looks interesting\./.test(note)&&await p.inputValue('#subj')==='Just passing this along: SHERIFF BEN', [note,await p.inputValue('#subj')]);
want('to your reps, by name', /TO YOUR REPS · PAT AGENT/i.test(await p.innerText('.card.note')));
want('the extra notes are folded away', !(await p.isVisible('#t_pt'))&&!(await p.isVisible('#t_dn'))&&/MORE WAYS TO SEND/i.test(await p.innerText('#main')));
want('no status picks, no tracking words', !(await p.$('[data-st],[data-ys]'))&&!/THEY'RE ON IT|SUBMITTED|where it is, your call/i.test(await p.innerText('#main')));
await p.screenshot({path:SHOTS+'/sp_desk_nudge.png'});
// send on a computer: the screenshot copied, mail opened
const href=await p.evaluate(()=>{ const a=document.getElementById('send'); a.addEventListener('click',e=>e.preventDefault(),{once:false}); a.click(); return a.getAttribute('href'); });
await p.waitForTimeout(800);
want('SEND: mail to your rep with the subject and the note', /^mailto:pat%40example\.com\?subject=Just%20passing%20this%20along%3A%20SHERIFF%20BEN&body=Hi%20Pat%2C/.test(href), href);
want('SEND: the screenshot is on the clipboard', await p.evaluate(async()=>{ try{ const it=await navigator.clipboard.read(); return it.some(x=>x.types.includes('image/png')); }catch(e){ return 'err '+e.message; } })===true);
const d=await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')));
want('kept, with a sent date and the screenshot on this device', d.items.length===1&&!!d.items[0].sentAt&&d.items[0].pic===true&&d.items[0].card.role==='SHERIFF BEN', d.items);
want('the screenshot is in its own store', await p.evaluate(async id=>{ const db=await new Promise(r=>{ const q=indexedDB.open('theactorpage_spotted_pics'); q.onsuccess=()=>r(q.result); }); return await new Promise(r=>{ const q=db.transaction('pics').objectStore('pics').get(id); q.onsuccess=()=>r(!!q.result&&q.result.size>100); }); },d.items[0].id));
await p.click('#back'); await p.waitForTimeout(300);
m=await p.innerText('#main');
want('front: what you passed along, with "sent" and a date', /SHERIFF BEN/.test(m)&&/screenshot · sent [A-Z][a-z]{2} \d+/.test(m), m);
await p.waitForTimeout(300); want('front: the thumbnail loads', await p.evaluate(()=>{ const i=document.querySelector('img.shot'); return !!i&&i.naturalWidth===300; }));
// the words: a notice, with "add what it says"
await p.click('#wwords'); await p.fill('#raw',fx('northgate_notice')); await p.click('#read'); await p.waitForTimeout(300);
want('the words: role and project read from it', await p.inputValue('#cf_project')==='NORTHGATE COFFEE'&&await p.inputValue('#cf_role')==='BARISTA DAD');
note=await p.inputValue('#t_pa');
want('the words: the note stays short by default', /Just passing this along\. BARISTA DAD \(NORTHGATE COFFEE\) looks interesting\.\n\nRiley Hart$/.test(note), note);
await p.check('#addsaid'); await p.waitForTimeout(150); note=await p.inputValue('#t_pa');
want('add what it says: casting and the facts go in', /NORTHGATE COFFEE, Dana Pell casting\./.test(note)&&/Riley Hart$/.test(note)&&!/zoom\.us/.test(note), note);
await p.click('#saysfold summary'); await p.waitForTimeout(100);
want('what it says: the musts, as written', /Must ride a bicycle\./.test(await p.innerText('#saysfold')));
await p.click('#morefold summary'); await p.waitForTimeout(100);
want('more ways: the pitch and the note to the office', /^Hi Dana,/.test(await p.inputValue('#t_pt'))&&/^Hi Dana,/.test(await p.inputValue('#t_dn')));
// your edit stays
await p.fill('#t_pa','Hi Pat,\n\nThis one, if you can.\n\nRiley'); await p.waitForTimeout(100);
await p.click('#later'); await p.waitForTimeout(300);
m=await p.innerText('#main');
want('SAVE FOR LATER: on the front, not sent yet, with PASS IT ALONG', /BARISTA DAD · NORTHGATE COFFEE/.test(m)&&/the words · not sent yet/.test(m)&&/PASS IT ALONG/.test(m), m);
await p.click('.sp button.btn[data-open]'); await p.waitForTimeout(200);
want('your words kept', await p.inputValue('#t_pa')==='Hi Pat,\n\nThis one, if you can.\n\nRiley'&&/Your words now/.test(await p.innerText('.card.note')));
await p.click('#resetnote'); await p.waitForTimeout(100);
want('start the note over', /^Hi Pat,\n\nJust passing this along\./.test(await p.inputValue('#t_pa')));
await p.click('#back'); await p.waitForTimeout(150);
// just say it
await p.click('#wsay'); await p.fill('#sayrole','DOCK COP'); await p.fill('#sayproj','Low Tide'); await p.click('#saygo'); await p.waitForTimeout(200);
want('just say it: straight to the note', /Just passing this along\. DOCK COP \(Low Tide\) looks interesting\./.test(await p.inputValue('#t_pa'))&&!!(await p.$('.addshot')));
await p.click('#del'); await p.waitForTimeout(150);
want('never mind: nothing kept', (await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')).items.length))===2);
// pasting an image on the front page
await p.evaluate(async b=>{ const f=new File([new Uint8Array(b)],'x.png',{type:'image/png'}), dt=new DataTransfer(); dt.items.add(f); document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true})); },bytes); await p.waitForTimeout(400);
want('paste a screenshot on the front: the nudge opens', !!(await p.$('#bigpic')));
await p.click('#back'); await p.waitForTimeout(150);
// a list with several projects
await p.click('#wwords'); await p.fill('#raw',fx('imdbpro_list')); await p.click('#read'); await p.waitForTimeout(300);
const n=(await p.$$('[data-pick]')).length;
want('a list: pick which to keep', n>=2, n);
await p.click('#keepmany'); await p.waitForTimeout(200);
want('kept them, on the front', (await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')).items.length))===2+n);
await p.screenshot({path:SHOTS+'/sp_desk_front.png'});
// shared in from another app
await p.goto('http://localhost:8811/spotted/index.html?title='+encodeURIComponent('Dry Creek pilot order')+'&url='+encodeURIComponent('https://example.com/news/dry-creek-pilot-order')); await p.waitForTimeout(500);
await p.click('#saysfold summary');
want('shared from another app: the nudge, with the link', await p.inputValue('#cf_source')==='https://example.com/news/dry-creek-pilot-order'&&!/\?/.test(await p.evaluate(()=>location.search)));

/* ---- phone, dark: the share sheet ---- */
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',hasTouch:true,isMobile:true});
const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.addInitScript(()=>{ window.__shared=null; Object.defineProperty(navigator,'canShare',{value:d=>!!(d&&d.files&&d.files.length),configurable:true}); Object.defineProperty(navigator,'share',{value:async d=>{ window.__shared={n:d.files.length,type:d.files[0].type,name:d.files[0].name,title:d.title,text:d.text}; },configurable:true}); });
await q.goto('http://localhost:8811/spotted/index.html'); await q.evaluate(()=>{ localStorage.clear(); You.set('name','Riley Hart'); localStorage.setItem('theactorpage_spotted_v1',JSON.stringify({items:[],me:{reel:'',resume:'',site:'',reps:[{name:'Pat Agent',email:'pat@example.com'},{name:'Sam Manager',email:'sam@example.com'}]},held:[]})); }); await q.reload(); await q.waitForTimeout(500);
want('phone: dark theme', await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(18, 17, 16)');
want('phone: no page scroll sideways', await q.evaluate(()=>document.documentElement.scrollWidth<=390));
await q.screenshot({path:SHOTS+'/sp_phone_front.png'});
await q.setInputFiles('#shotin',{name:'shot.png',mimeType:'image/png',buffer:Buffer.from(bytes)}); await q.waitForTimeout(500);
await q.fill('#cf_role','SHERIFF BEN'); await q.dispatchEvent('#cf_role','change'); await q.waitForTimeout(400);
want('phone: both reps, by first name', /^Hi Pat and Sam,/.test(await q.inputValue('#t_pa')));
want('phone: no page scroll sideways on the nudge', await q.evaluate(()=>document.documentElement.scrollWidth<=390));
await q.screenshot({path:SHOTS+'/sp_phone_nudge.png'});
await q.tap('#send'); await q.waitForTimeout(500);
const sh=await q.evaluate(()=>window.__shared);
want('phone: the share sheet gets the screenshot and the note', sh&&sh.n===1&&sh.type==='image/png'&&/SHERIFF BEN/.test(sh.name)&&sh.title==='Just passing this along: SHERIFF BEN'&&/SHERIFF BEN looks interesting\./.test(sh.text), sh);
want('phone: sent, with the date', !!(await q.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')).items[0].sentAt))&&/Sent to your reps/.test(await q.innerText('#main')));
const all=await p.innerText('body')+await q.innerText('body');
want('no em dashes, no "thing", no scores', !/—/.test(all)&&!/\bthing\b/i.test(all)&&!/\bscores?\b|castability/i.test(all));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
