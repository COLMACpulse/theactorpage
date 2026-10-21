/* JUICE in Spotted, with a made-up WIRE (tests/fixtures/wire_madeup.json) served locally. It never goes online on
   its own; CHECK shows the ONLINE bar and a receipt; what fits says why in words; KEEP opens a card to check with the
   site's tags; NOT FOR ME stays gone; "new" means new since your last look; daily checks once a day when Spotted
   opens; a failure says so plainly. Made-up names only. Server on :8811.  NODE_PATH=... node spotted/tests/juice_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,500))); if(!c) ok=false; };
const WURL='http://localhost:8811/tests/fixtures/wire_madeup.json'; let hits=0, slow=0, fail=false;
await ctx.route('**/wire_madeup.json*',async r=>{ hits++; if(fail) return r.fulfill({status:503,body:'down'}); if(slow) await new Promise(z=>setTimeout(z,slow)); return r.continue(); });
let outside=[]; p.on('request',r=>{ if(!/^http:\/\/localhost:8811\//.test(r.url())&&!/^data:/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/spotted/index.html'); await p.evaluate(u=>{ localStorage.clear(); localStorage.setItem('tap_wire',u);
 You.setList('types',['western','cop','rancher']); You.set('locations','Kansas, Los Angeles'); Notes.addSession({date:'2026-09-12',room:'class',who:[{name:'Jo Banner',role:'director'}],title:'Scene night'}); },WURL);
await p.reload(); await p.waitForTimeout(900);
want('opening Spotted: JUICE never goes online on its own', hits===0);
await p.click('#tabs [data-t="juice"]'); await p.waitForTimeout(300);
let v=await p.innerText('#main');
want('the JUICE tab says what it gets, that it\'s the same file for everyone, and that matching is on the phone', /only when you say/.test(v)&&/same file/.test(v)&&/worked out here, on your phone/.test(v));
want('starts on "only when I tap CHECK"', await p.$eval('[data-jmode="manual"]',e=>e.classList.contains('on')));
want('still nothing fetched after opening the tab', hits===0);
slow=700; await p.click('#jcheck'); await p.waitForTimeout(250);
want('CHECK: the ONLINE bar shows while it gets THE WIRE', await p.$eval('#online',e=>!e.hidden&&/ONLINE/.test(e.textContent)));
await p.waitForTimeout(1200); slow=0;
want('and goes away after', await p.$eval('#online',e=>e.hidden));
const rc=await p.innerText('#receipt');
want('the receipt: each source, a failure in plain words, how many new', /California Film Commission: 3 productions on the list\./.test(rc)&&/Down Trade: not read this time\. connection refused/.test(rc)&&/7 new since you last looked\./.test(rc), rc);
const fits=await p.$$eval('.wi',x=>x.map(e=>e.innerText));
const dust=fits.find(t=>/Dust Road/.test(t));
want('fits you: the western, with what matched in words, no score', !!dust&&/Your words: western/.test(dust)&&/Your places: Kansas/.test(dust)&&!/\d+ ?(%|\/100)/.test(dust), dust);
want('never inside another word: the Southwestern / Arkansas story is not in "fits you"', !(await p.innerText('#main')).split('THE CALIFORNIA TAX-CREDIT LIST')[0].includes('Southwestern'));
want('a person from your NOTES, by name', fits.some(t=>/Harbor Lights/.test(t)&&/People you know: Jo Banner/.test(t)));
await p.click('#jlist summary'); await p.waitForTimeout(200);
const lt=await p.innerText('#jlist');
want('the state list: approved isn\'t casting, said; the plans in words; animation means voice cast', /Approved isn't casting/.test(lt)&&/33 filming days in California, 50 cast hired, 1,310 background days/.test(lt)&&/animation, so voice cast/.test(lt)&&/a working title/.test(lt), lt.slice(0,600));
if(SHOTS) await p.screenshot({path:SHOTS+'/juice.png',fullPage:true});
// KEEP the Harbor Lights story: a card to check, with the site's tags
await p.click('.wi:has-text("Harbor Lights") [data-wkeep]'); await p.waitForTimeout(300);
v=await p.innerText('#main');
want('KEEP: opens a card to check first, says where it came from, offers the site\'s tags', /From JUICE: Made Up Trade\. Check the project name/.test(v)&&!!(await p.$('[data-tag="Riley Hart"]'))&&(await p.inputValue('#cf_project'))==='Harbor Lights', v.slice(0,300));
await p.click('[data-tag="Riley Hart"]'); await p.waitForTimeout(150); want('tap a tag: it becomes the project', (await p.inputValue('#cf_project'))==='Riley Hart');
await p.click('[data-tag="Harbor Lights"]'); await p.waitForTimeout(150);
await p.click('#keep'); await p.waitForTimeout(300);
const D=await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_spotted_v1')));
want('kept: on your list, with the link, and what changed says it came from JUICE', D.items.length===1&&D.items[0].card.project==='Harbor Lights'&&D.items[0].card.source==='https://trade.example.com/harbor'&&/From JUICE: Made Up Trade\./.test(await p.innerText('#changed')));
// keep one from the state list
await p.click('#tabs [data-t="juice"]'); await p.waitForTimeout(300);
want('kept ones are gone from THE WIRE', !(await p.innerText('#main')).includes('Riley Hart Joins Harbor Lights'));
want('the list you opened stays open', await p.$eval('#jlist',d=>d.open));
await p.click('#jlist .wi:has-text("Salt Flat") [data-wkeep]'); await p.waitForTimeout(300);
want('a state-list card: company, kind, California, the approval and the plans', (await p.inputValue('#cf_network'))==='Mesa Films LLC'&&/California tax credit, Sep 21, 2026/.test(await p.innerText('#main'))&&/50 cast hired/.test(await p.innerText('#main')));
await p.click('#keep'); await p.waitForTimeout(300);
const pa=await p.inputValue('#t_pa');
want('pass it along carries the state list facts to your reps', /California tax credit, Sep 21, 2026/.test(pa)&&/33 filming days in California/.test(pa), pa);
// NOT FOR ME
await p.click('#tabs [data-t="juice"]'); await p.waitForTimeout(300);
if(!(await p.$eval('#jnews',d=>d.open))) { await p.click('#jnews summary'); await p.waitForTimeout(150); }
await p.click('#jnews .wi:has-text("Box Office") [data-wgone]'); await p.waitForTimeout(200);
want('NOT FOR ME: gone', !(await p.innerText('#main')).includes('Box Office Weekend'));
// leave and come back: nothing new
await p.click('#tabs [data-t="list"]'); await p.waitForTimeout(200); await p.click('#tabs [data-t="juice"]'); await p.waitForTimeout(200);
await p.click('#jcheck'); await p.waitForTimeout(900);
want('a second check after looking: nothing new', /Nothing new since you last looked\./.test(await p.innerText('#receipt')), await p.innerText('#receipt'));
want('nothing shows as NEW now', !(await p.$$eval('.nw',x=>x.length)));
// daily
await p.click('[data-jmode="daily"]'); await p.waitForTimeout(200);
await p.evaluate(()=>{ const s=Wire.load(); s.day='2000-01-01'; Wire.save(s); });
let h0=hits; await p.reload(); await p.waitForTimeout(1600);
want('daily: the first open of the day checks by itself', hits===h0+1);
h0=hits; await p.reload(); await p.waitForTimeout(1400);
want('daily: not again the same day', hits===h0);
// failure
fail=true; await p.click('#tabs [data-t="juice"]'); await p.waitForTimeout(200); await p.click('#jcheck'); await p.waitForTimeout(800);
want('THE WIRE down: says so plainly, the ONLINE bar goes', /THE WIRE didn't answer \(503\)\. Try again later\./.test(await p.innerText('#main'))&&await p.$eval('#online',e=>e.hidden));
want('nothing about you went anywhere but the one file', outside.length===0, outside);
want('no em dashes', !/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
