/* PRESS: from a JUICE story, PRESS notes the outlet in CONTACTS (not confirmed yet); a campaign on real news; who
   covers it; reached and what came back; your pitch in your words with your facts beside it; EMAIL IT opens your mail;
   the press kit zip has only your facts and the photo you picked, never the checklist. Made-up names only.
   Server on :8811.  NODE_PATH=... node press/tests/press_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true}); await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let outside=[]; p.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) outside.push(r.url()); });
const WURL='http://localhost:8811/tests/fixtures/wire_madeup.json';
await p.goto('http://localhost:8811/spotted/'); await p.evaluate(u=>{ localStorage.clear(); localStorage.setItem('tap_wire',u); You.set('name','Riley Hart'); You.set('email','riley@example.com'); You.set('union','SAG-AFTRA'); },WURL);
await p.reload(); await p.waitForTimeout(600); await p.click('#tabs [data-t="juice"]'); await p.click('#jcheck'); await p.waitForSelector('#receipt');
if(!(await p.$eval('#jnews',d=>d.open))) await p.click('#jnews summary');
const pr=await p.$('[data-wpress]');
want('a JUICE story has PRESS: note this outlet for when you have news', !!pr&&/contacts\/\?press=/.test(await pr.getAttribute('href')));
await pr.click(); await p.waitForURL(/contacts/); await p.waitForTimeout(900);
const outlet=await p.inputValue('#f_company'), role=await p.inputValue('#f_role');
want('CONTACTS opens a press contact, the outlet and the story filled in, the writer left to you', role==='press'&&!!outlet&&/^https:/.test(await p.inputValue('#f_site'))&&/^Saw: /.test(await p.inputValue('#f_note'))&&!(await p.inputValue('#f_name'))&&await p.isVisible('#f_beat'), [role,outlet]);
await p.fill('#f_name','Sam Writer'); await p.fill('#f_beat','Indie film, festivals'); await p.fill('#f_email','sam@example.com'); await p.click('#keepnew'); await p.waitForTimeout(300);
want('kept, and marked NOT CONFIRMED YET until you check their own work', /NOT CONFIRMED YET/.test(await p.innerText('.person:has-text("Sam Writer")')));
// a headshot to pick
await p.goto('http://localhost:8811/press/'); await p.evaluate(async()=>{ const cv=document.createElement('canvas'); cv.width=40; cv.height=50; cv.getContext('2d').fillRect(0,0,40,50); const bl=await new Promise(r=>cv.toBlob(r,'image/jpeg')); await You.addPhoto(new File([bl],'head.jpg',{type:'image/jpeg'})); });
await p.reload(); await p.waitForTimeout(600);
want('no campaigns: it says press starts from real news, and how to find who covers your beat', /real news/.test(await p.innerText('#view'))&&/tap PRESS on a story/.test(await p.innerText('#view')));
await p.click('#start'); await p.click('[data-ms="festival"]'); await p.fill('#n_title','Low Tide'); await p.fill('#n_date','2026-11-14'); await p.fill('#n_where','Made Up Film Festival'); await p.click('#startit'); await p.waitForTimeout(300);
let v=await p.innerText('#view');
want('a campaign on the news: what, where, when, and what is not done', /A FESTIVAL/.test(v)&&/Low Tide/.test(v)&&/November 14, 2026/.test(v)&&/Nobody on the list yet/.test(v)&&/Not done yet:/.test(v));
await p.fill('#c_hook','Low Tide plays its first festival, two shows.'); await p.press('#c_hook','Tab');
await p.selectOption('#pickpress',{label:'Sam Writer, '+outlet+' (not confirmed yet)'}); await p.click('#addpick'); await p.waitForTimeout(300);
const row='[data-outlet]';
want('who covers it: Sam Writer, not confirmed yet', /Sam Writer/.test(await p.innerText(row))&&/NOT CONFIRMED YET/.test(await p.innerText(row)));
await p.fill('#c_pitch','Hi Sam. My short Low Tide plays Made Up Film Festival on Nov 14. You covered festival shorts last month, so I thought of you.'); await p.press('#c_pitch','Tab'); await p.waitForTimeout(200);
const facts=await p.innerText('#facts');
want('your facts beside the pitch: the news, your name and union, your contact', /A festival: Low Tide, Made Up Film Festival, November 14, 2026/.test(facts)&&/Name: Riley Hart \(SAG-AFTRA\)/.test(facts)&&/Contact: riley@example\.com/.test(facts), facts);
want('the pitch is only your words: nothing written for you', (await p.inputValue('#c_pitch')).startsWith('Hi Sam. My short'));
const mail=await p.getAttribute(row+' [data-mail]','href');
want('EMAIL IT: your mail app, to Sam, your words, nothing sent from here', /^mailto:sam%40example\.com\?subject=Low%20Tide&body=Hi%20Sam\.%20My%20short/.test(mail), mail);
await p.click(row+' [data-reply="covering"]'); await p.waitForTimeout(300);
want('what came back: covering it, and the count says so', /1 on the list, 1 reached, 1 covering it\./.test(await p.innerText('#view')));
await p.fill('#c_bio','Riley Hart is a made-up actor.'); await p.press('#c_bio','Tab');
await p.click('[data-ph]'); await p.waitForTimeout(300); await p.fill('[data-credit]','Made Up Photo'); await p.press('[data-credit]','Tab');
for(const k of ['facts','rights','credits','reel']){ await p.check('[data-check="'+k+'"]'); await p.waitForTimeout(150); }
want('all done: Ready', /Ready\./.test(await p.innerText('#notyet')), await p.innerText('#notyet').catch(()=>''));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#kit')]);
const T=fs.mkdtempSync(path.join(os.tmpdir(),'pk-')), Z=path.join(T,dl.suggestedFilename()); await dl.saveAs(Z);
global.Zip=require('../../shared/zipw.js'); const files=Zip.read(fs.readFileSync(Z)); const kit=Buffer.from(files.find(f=>f.name==='Press kit.txt').data).toString('utf8');
want('the press kit: the text and the photo you picked; your words and facts only; no checklist', dl.suggestedFilename()==='Low Tide press kit.zip'&&files.length===2&&files.some(f=>f.name==='Low_Tide_photo_1.jpg'&&f.data.length>100)&&/THE NEWS\nLow Tide plays its first festival, two shows\./.test(kit)&&/photo by Made Up Photo/.test(kit)&&!/rights|checked/i.test(kit), [files.map(f=>f.name),kit.slice(0,200)]);
want('nothing went anywhere', outside.length===0, outside);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
