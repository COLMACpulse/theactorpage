/* HOME, the front: what it is in one line, one main button (try it on a sample scene), the casting sites line,
   six steps as tabs with a real screen each, why it's different, and a try-it at the bottom. Try it opens the
   demo on Low Tide with no voice, your own work put away. Server on :8811.  NODE_PATH=... node tests/home_front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/'); await p.waitForTimeout(800);
const hero=await p.innerText('header.titlecard');
want('the front says what it is, for actors, in one line', /FOR ACTORS/.test(hero)&&/Everything an audition takes, from the sides to the send\./.test(hero)&&/No account\. No card\. Nothing uploaded\./.test(hero));
want('one main button: try it on a sample scene', /Try it on a sample scene/.test(await p.innerText('#trygo'))&&(await p.getAttribute('#trygo','href'))==='demo/?try');
want('where it fits: alongside the casting sites', /Works alongside Actors Access, Casting Networks and Backstage\. They get you the audition\. This is where you do it\./.test(await p.innerText('.band.fits')));
const tabs=await p.$$eval('.steptab',x=>x.map(t=>t.textContent.replace(/^\d/,'')));
want('six steps, in order', tabs.join('|')==='GET IT|LEARN IT|RUN IT|TAPE IT|SEND IT|STAY ON THEIR RADAR', tabs);
want('one step shows at a time, with a real screen', (await p.$$eval('.steppanel',x=>x.filter(e=>!e.hidden).length))===1&&await p.$eval('#sp-get img',i=>i.complete&&i.naturalWidth>100));
await p.click('#st-run'); await p.waitForTimeout(200);
const run=await p.innerText('#sp-run');
want('tap RUN IT: the reader, never a computer voice, and the tool by what it does', /A reader who waits for you/.test(run)&&/never a computer voice/.test(run)&&/Reader booth and Pocket run/.test(run)&&!(await p.isVisible('#sp-get')));
await p.focus('#st-run'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
want('arrow keys move between steps', await p.$eval('#st-tape',t=>t.getAttribute('aria-selected')==='true'&&document.activeElement===t));
const imgs=await p.$$eval('.steppanel img',x=>x.map(i=>i.getAttribute('src')));
want('every step has its screen', imgs.length===6&&imgs.every(s=>/^img\/steps\/\w+\.webp$/.test(s)));
const why=await p.innerText('#why');
want('why it\'s different: free, a real reader, stays yours, no signal; and what it costs elsewhere', /Free, with no limit/.test(why)&&/A real reader/.test(why)&&/It stays yours/.test(why)&&/Works with no signal/.test(why)&&/\$5 to \$15 a month/.test(why));
want('ACT tools are one tap away, folded', /SEE EVERY ACT TOOL/.test(await p.innerText('.band.act'))&&!(await p.$eval('.dept[data-d="act"]',d=>d.open)));
want('the stale bits are gone: no "three rooms", no sign-in account, no "folder on your disk"', await p.evaluate(()=>!/three rooms|Sign in once|A folder on your disk is the record|All three tools/.test(document.body.innerText)));
want('try it, again at the bottom', /Start with a scene we wrote/.test(await p.innerText('#try')));
want('no em dashes, no "thing"', await p.evaluate(()=>!/—/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
// TRY IT: the demo on Low Tide, no voice
let spoke=0; await c.exposeFunction('__spoke',()=>{ spoke++; });
await c.addInitScript(()=>{ try{ const s=speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak=u=>{ window.__spoke&&window.__spoke(); }; }catch(e){} });
await p.goto('http://localhost:8811/demo/?try'); await p.waitForFunction(()=>window.__tour&&window.__tour.tried,null,{timeout:20000}).catch(()=>{});
const fr=p.frame({url:/localhost:8811\/(index\.html)?$/})||p.frames()[1];
want('TRY IT: the site in the demo, Low Tide in, you\'re ANNA, no tour', await p.evaluate(()=>window.__tour.tried&&!document.getElementById('start').offsetParent&&/DEMO/.test(document.getElementById('where').textContent))&&/ANNA/.test(await fr.innerText('#took')), await p.evaluate(()=>document.getElementById('cap').textContent));
want('it never talks', spoke===0);
want('END DEMO is there', await p.isVisible('#end'));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
