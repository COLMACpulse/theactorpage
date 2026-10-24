/* PRESS, what's been written about you: the search (your name in quotes and the words you pick, opened in Google),
   a Google Alert, keep a hit (or NOT ME), your press list, ON YOUR PAGE into the Hub page's In the press, send to your
   reps, shared in from a browser, and the press kit folded away. Computer (light) and phone (dark). Made-up people
   and links only. Server on :8811.  NODE_PATH=... node press/tests/press_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900},colorScheme:'light',serviceWorkers:'block',acceptDownloads:true}); await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let outside=[]; p.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/press/'); await p.evaluate(()=>{ localStorage.clear(); You.set('name','Riley Hart'); You.setList('credits',[]); const y=You.get(); y.credits=[{title:'Salt Road',role:'Sheriff'}]; localStorage.setItem(You.KEY||'theactorpage_you_v1',JSON.stringify(y));
 const r=Contacts.add({name:'Pat Agent',role:'agent',email:'pat@example.com'}); Contacts.setRep(r.id,{step:'signed'}); });
await p.reload(); await p.waitForTimeout(700);
let v=await p.innerText('#view');
want('header: what\'s been written about you', /YOU · PRESS/i.test(await p.textContent('header'))&&/What.s been written about you/.test(await p.innerText('header')));
want('no campaigns up front, no pitches, no outlets', !/CAMPAIGN|YOUR PITCH|WHO COVERS IT/i.test(v));
want('the search: your name in quotes and "actor"', await p.textContent('#qline')==='"Riley Hart" actor', await p.textContent('#qline'));
want('SEARCH THE NEWS opens Google News with it, in a new tab', await p.getAttribute('#s_news','href')==='https://news.google.com/search?q=%22Riley%20Hart%22%20actor'&&await p.getAttribute('#s_news','target')==='_blank');
const proj=await p.$('[data-p="Salt Road"]');
want('your projects are there to add, off until you tap', !!proj&&await proj.getAttribute('aria-pressed')==='false');
await p.click('[data-p="Salt Road"]'); await p.fill('#addw','Austin'); await p.press('#addw','Enter'); await p.waitForTimeout(150);
want('a project and a word: in the search', await p.textContent('#qline')==='"Riley Hart" actor Austin "Salt Road"', await p.textContent('#qline'));
want('SEARCH THE WEB and the Google Alert carry it', /^https:\/\/www\.google\.com\/search\?q=%22Riley%20Hart%22/.test(await p.getAttribute('#s_web','href'))&&/^https:\/\/www\.google\.com\/alerts\?q=%22Riley%20Hart%22%20actor%20Austin%20%22Salt%20Road%22$/.test(await p.getAttribute('#s_alert','href')));
await p.click('[data-w="Austin"]'); await p.waitForTimeout(100);
want('tap a word to leave it out', await p.textContent('#qline')==='"Riley Hart" actor "Salt Road"');
// keep a hit
await p.fill('#h_url','https://example.com/news/salt-road-review'); await p.click('#h_keep'); await p.waitForTimeout(200);
want('kept: check it\'s you, the outlet from the link', /Kept\. Check it.s you/i.test(await p.innerText('#hitform'))&&await p.inputValue('#h_outlet')==='example.com');
await p.fill('#h_title','A made-up review of Salt Road'); await p.fill('#h_date','2026-03-04'); await p.fill('#h_project','Salt Road'); await p.fill('#h_line','Hart is quietly devastating as the sheriff.');
await p.click('#h_save'); await p.waitForTimeout(200);
v=await p.innerText('#hits');
want('your press: headline, outlet, date, project, the line', /A made-up review of Salt Road/.test(v)&&/example\.com · March 4, 2026 · Salt Road/.test(v)&&/Hart is quietly devastating as the sheriff\./.test(v), v);
want('private by default', /NOT ON YOUR PAGE/.test(v)&&!(await p.evaluate(()=>Press.onPage().length)));
await p.fill('#h_url','https://example.org/someone-else'); await p.click('#h_keep'); await p.waitForTimeout(150); await p.click('#h_notme'); await p.waitForTimeout(150);
want('NOT ME: taken off', (await p.evaluate(()=>Press.hits().length))===1&&/Not you/.test(await p.innerText('#view')));
await p.fill('#h_url','not a link'); await p.click('#h_keep'); await p.waitForTimeout(100);
want('not a link: says so', /That isn.t a link/.test(await p.innerText('#view')));
await p.click('[data-onpage]'); await p.waitForTimeout(150);
want('ON YOUR PAGE: switched on', /On your page, under In the press/.test(await p.innerText('#view'))&&(await p.evaluate(()=>Press.onPage().length))===1);
const href=await p.evaluate(()=>{ const a=document.getElementById('toreps'); a.addEventListener('click',e=>e.preventDefault(),{once:true}); a.click(); return a.getAttribute('href'); });
want('SEND IT TO YOUR REPS: mail to your rep with the list', /^mailto:pat%40example\.com\?subject=Press%3A%20Riley%20Hart&body=/.test(href)&&/salt-road-review/.test(decodeURIComponent(href)), href);
await p.click('#copylist'); await p.waitForTimeout(150);
want('COPY THE LIST', /example\.com, March 4, 2026: A made-up review of Salt Road\n"Hart is quietly devastating/.test(await p.evaluate(()=>navigator.clipboard.readText())));
await p.screenshot({path:SHOTS+'/pr_desk_front.png'});
// the press kit, folded away
want('the press kit: folded away', !(await p.isVisible('#start')));
await p.click('#kitfold summary'); await p.click('#start'); await p.fill('#n_title','Salt Road'); await p.fill('#n_date','2026-11-02'); await p.click('#startit'); await p.waitForTimeout(200);
await p.fill('#c_hook','Salt Road premieres at a made-up festival.'); await p.dispatchEvent('#c_hook','change'); await p.fill('#c_bio','Riley Hart is an actor.'); await p.dispatchEvent('#c_bio','change');
for(const k of ['facts','rights','credits','reel']) await p.check('[data-check="'+k+'"]');
await p.waitForTimeout(150);
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#kit')]);
want('SAVE THE PRESS KIT: one zip, your words', dl.suggestedFilename()==='Salt Road press kit.zip'&&/Press kit\.txt/.test(JSON.stringify(await p.evaluate(()=>window.__lastKit))));
await p.click('[data-back]'); await p.waitForTimeout(150);
want('back: the kit is listed under the fold', /Salt Road/.test(await p.innerText('#kitfold')));
// the Hub page: In the press, only what you switched on
await p.goto('http://localhost:8811/hub/index.html'); await p.waitForTimeout(1200);
const hub=await p.evaluate(async()=>{ const x=await pkgExtras(); const doc=packageHTML(Object.assign({profile:{name:'Riley Hart'},credits:[],clips:[],auds:[],monos:[]},x)); return {n:x.press.length,doc}; }).catch(e=>({err:String(e)}));
want('your Hub page: In the press, with the headline, the outlet and the line', hub.n===1&&/In the press/.test(hub.doc)&&/A made-up review of Salt Road/.test(hub.doc)&&/Hart is quietly devastating/.test(hub.doc), hub.err||String(hub.doc||'').slice(0,200));
await p.goto('http://localhost:8811/press/'); await p.evaluate(()=>{ Press.setHit(Press.hits()[0].id,{onPage:false}); });
await p.goto('http://localhost:8811/hub/index.html'); await p.waitForTimeout(1000);
want('switched off: not on your page', await p.evaluate(async()=>(await pkgExtras()).press.length)===0);
// the phone: shared in from a browser
const ph=await b.newContext({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true,serviceWorkers:'block'}); const q=await ph.newPage(); q.on('pageerror',e=>errs.push('phone '+e.message));
await q.goto('http://localhost:8811/press/?title='+encodeURIComponent('Made-up festival lineup')+'&url='+encodeURIComponent('https://example.net/festival-lineup')); await q.waitForTimeout(700);
want('shared from a browser: kept, the headline filled in, NOT ME there', await q.inputValue('#h_title')==='Made-up festival lineup'&&await q.inputValue('#h_outlet')==='example.net'&&!!(await q.$('#h_notme'))&&!/\?/.test(await q.evaluate(()=>location.search)));
want('phone: dark, nothing off the side', await q.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(18, 17, 16)'&&await q.evaluate(()=>document.documentElement.scrollWidth<=390));
await q.screenshot({path:SHOTS+'/pr_phone_found.png'});
want('phone: the form is in view', await q.evaluate(()=>{ const r=document.getElementById('hitform').getBoundingClientRect(); return r.top<844&&r.bottom>0; }));
await q.evaluate(()=>{ localStorage.removeItem('theactorpage_you_v1'); }); await q.goto('http://localhost:8811/press/'); await q.waitForTimeout(400);
want('no name yet: no search goes out', await q.getAttribute('#s_news','href')==='#'&&/Add your name first/.test(await q.textContent('#qline')));
// Contacts still opens a press contact from a story
await p.goto('http://localhost:8811/contacts/?press='+encodeURIComponent('Made Up Weekly')+'&link='+encodeURIComponent('https://example.com/story')+'&story='+encodeURIComponent('A made-up story')); await p.waitForTimeout(800);
want('Contacts: a press contact, the outlet filled in', await p.inputValue('#f_role')==='press'&&await p.inputValue('#f_company')==='Made Up Weekly');
want('nothing went anywhere on its own', outside.length===0, outside);
const all=await p.innerText('body');
want('no em dashes', !/—/.test(v+all));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
