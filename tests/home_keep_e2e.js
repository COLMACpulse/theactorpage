/* Home: keeping your things. No outside requests; the keep line (this device, last backup, privacy) once there is
   something; the iPhone Home Screen note only on an iPhone outside the Home Screen; the browser asked to keep things
   the first time something goes in. And the privacy page: its links resolve. Server on :8811.
   NODE_PATH=... node tests/home_keep_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1300,height:900}});
await c.addInitScript(()=>{ window.__persist=0; try{ if(navigator.storage){ navigator.storage.persist=()=>{ window.__persist++; return Promise.resolve(true); }; navigator.storage.persisted=()=>Promise.resolve(false); } }catch(e){} });
const p=await c.newPage(); const errs=[], outside=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('request',r=>{ const u=new URL(r.url()); if(!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)&&!/^(data|blob):/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(1200);
want('home asks nobody else for anything (no Google fonts)', !outside.length, outside);
want('the fonts are this site\'s own and they load', await p.evaluate(async()=>{ await document.fonts.ready; return document.fonts.check('300 16px Jost')&&document.fonts.check('700 16px "Courier Prime"'); }));
want('nothing in yet: no keep line', await p.evaluate(()=>document.getElementById('keepline').hidden));
await p.setInputFiles('#dropfile',path.join(FX,'made_up_face.jpg')); await p.waitForTimeout(1500);
const kl=await p.innerText('#keepline');
want('something in: the keep line says where it is, no backup yet, with BACK UP and Privacy', /kept on this device, not online/.test(kl)&&/No backup yet\./.test(kl)&&/BACK UP/.test(kl)&&/Privacy/.test(kl), kl);
want('no iPhone note on a computer', !/Home Screen/.test(kl));
want('the browser was asked to keep things, once', await p.evaluate(()=>window.__persist)===1);
await p.setInputFiles('#dropfile',path.join(FX,'sam_actor_resume.pdf')); await p.waitForTimeout(1500);
want('not asked again the same day', await p.evaluate(()=>window.__persist)===1);
await p.evaluate(()=>{ localStorage.setItem('theactorpage_device_v1',JSON.stringify({lastBackup:Date.now()-21*86400000})); }); await p.reload(); await p.waitForTimeout(900);
want('after a backup: "Last backup: 3 weeks ago."', /Last backup: 3 weeks ago\./.test(await p.innerText('#keepline')), await p.innerText('#keepline'));
want('footer links On This Device and Privacy', await p.evaluate(()=>!!document.querySelector('footer a[href="privacy/"]')&&!!document.querySelector('footer a[href="device/"]')));
await c.close();
// an iPhone, in Safari (not on the Home Screen)
const ci=await b.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'});
const q=await ci.newPage(); await q.goto('http://localhost:8811/index.html'); await q.evaluate(()=>localStorage.clear()); await q.reload(); await q.waitForTimeout(700);
await q.setInputFiles('#dropfile',path.join(FX,'made_up_face.jpg')); await q.waitForTimeout(1500);
const ik=await q.innerText('#keepline');
want('iPhone in Safari: the Home Screen note, in plain words', /add this site to your Home Screen \(Share, then Add to Home Screen\)/.test(ik), ik);
await q.click('#iosx'); await q.waitForTimeout(200);
want('hide it: it stays hidden', !/Home Screen/.test(await q.innerText('#keepline'))&&await q.evaluate(()=>localStorage.getItem('theactorpage_ios_note'))==='off');
await ci.close();
// the privacy page
const c3=await b.newContext(); const r=await c3.newPage(); const out2=[]; r.on('request',x=>{ const u=new URL(x.url()); if(!/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) out2.push(x.url()); });
const resp=await r.goto('http://localhost:8811/privacy/'); await r.waitForTimeout(500);
const txt=await r.innerText('main');
want('privacy page loads, asks nobody else for anything', resp.ok()&&!out2.length, out2);
want('it names the speech places, Google and Apple, and LISTENING staying on the device', /Six places/.test(txt)&&/Google/.test(txt)&&/Apple/.test(txt)&&/LISTENING/.test(txt));
want('no em dashes', !/—/.test(await r.content()));
const links=await r.$$eval('main a',x=>x.map(a=>a.getAttribute('href')).filter(h=>!/^https?:/.test(h)));
const bad=[]; for(const h of links){ const u=new URL(h,'http://localhost:8811/privacy/').href; const s=await (await r.request.get(u)).status(); if(s!==200) bad.push(h+' '+s); }
want('every link on it resolves ('+links.length+')', !bad.length, bad);
await c3.close();
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
