/* BACKLOT end to end, phone size. Made-up spots, things, people and scripts only. Server on :8811 at the repo root.
   NODE_PATH=... node backlot/tests/backlot_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'..','..','shared','fixtures'), SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,500))); if(!c) ok=false; };
const tab=async t=>{ await p.click('#tabs [data-t="'+t+'"]'); await p.waitForTimeout(250); };
await p.goto('http://localhost:8811/backlot/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('film_os'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(400);
let m=await p.innerText('#main');
want('from nothing: what a spot is, a PHOTO tile, a way to type one', /Any place you can shoot/.test(m)&&!!(await p.$('.kit [data-kid="shoot"],.kit .kt'))&&!!(await p.$('#newspot')), m.slice(0,300));
// one photo, one spot
await p.setInputFiles('#shootin',path.join(FX,'made_up_barn.jpg')); await p.waitForTimeout(900);
want('a photo makes a spot and opens it, name next', !!(await p.$('#f_name'))&&(await p.$$('.ph img')).length===1&&await p.evaluate(()=>document.activeElement&&document.activeElement.id)==='f_name');
await p.fill('#f_name','Red barn'); await p.dispatchEvent('#f_name','change');
await p.fill('#f_plays','stable, jail, saloon back room'); await p.dispatchEvent('#f_plays','change');
for(const c of ['ie|both','when|morning','when|dusk','perm|yes','whose|mine','power|no']){ await p.click('[data-ch^="'+c+'|"]'); await p.waitForTimeout(80); }
await p.fill('#f_takes','hang a lantern, sweep the hay'); await p.dispatchEvent('#f_takes','change');
await p.click('#back'); await p.waitForTimeout(150);
await p.fill('#newspot','Kitchen'); await p.click('#addspot'); await p.waitForTimeout(150);
await p.fill('#f_plays','diner'); await p.dispatchEvent('#f_plays','change'); await p.click('[data-ch^="ie|in|"]'); await p.click('#back');
await p.fill('#newspot','Town park'); await p.press('#newspot','Enter'); await p.waitForTimeout(150); await p.click('[data-ch^="perm|no|"]'); await p.click('#back'); await p.waitForTimeout(150);
m=await p.innerText('#main');
want('three spots; the barn says what it passes for; the park says no', (await p.$$('.sc')).length===3&&/Inside and out · passes for stable, jail, saloon back room/.test(m)&&/Town park\s*\n?.*\n?NO/i.test(m), m.slice(0,600));
const add=async(k,n,c)=>{ await p.selectOption('#okind',k); await p.fill('#oname',n); if(c) await p.fill('#ocount',c); await p.click('#oadd'); await p.waitForTimeout(120); };
await add('prop','rope'); await add('vehicle','old pickup'); await add('person','Me'); await add('person','Jo and Dana','2'); await add('animal','two horses');
m=await p.innerText('#main');
want('on hand: props, vehicles, animals, people counted', /rope/.test(m)&&/old pickup/.test(m)&&/People you can get · 3/.test(m)&&/Jo and Dana \(2\)/.test(m), m.slice(-700));
const own=await p.evaluate(()=>JSON.parse(localStorage.getItem('film_os_v1')).owned);
want('it is Story Studio\'s list: 3 locations, 5 things, the barn\'s photo as a scout entry', own.filter(o=>o.kind==='location').length===3&&own.length===8&&own.find(o=>o.name==='Red barn').scout[0].photo&&own.find(o=>o.name==='Red barn').when.join()==='morning,dusk', own);
await p.screenshot({path:SHOTS+'/bl_spots.png',fullPage:true});
// Story Studio sees it
const s2=await ctx.newPage(); s2.on('pageerror',e=>errs.push('film: '+e.message)); await s2.goto('http://localhost:8811/film/'); await s2.waitForTimeout(500); await s2.click('#sub [data-t="own"]'); await s2.waitForTimeout(300);
const ow=await s2.innerText('#main');
want('Story Studio\'s OWNED tab: the same spots, vehicles and people', /Red barn/.test(ow)&&/Plays: stable, jail, saloon back room/.test(ow)&&/Vehicles/.test(ow)&&/People you can get/.test(ow), ow.slice(0,500));
// scripts: one in Story Studio, one in Paper Trail
const SS='Title: Dry Gulch\n\nEXT. CANYON - DAY\n\nVale ties the rope.\n\nVALE\nHold this.\n\nINT. JAIL - NIGHT\n\nDark.\n\nSHERIFF\nSit.\n\nINT. DINER - NIGHT\n\nVALE\nCoffee.\n';
await p.evaluate(t=>{ const d=JSON.parse(localStorage.getItem('film_os_v1')); d.scripts.dg={file:'dry_gulch.fountain',text:t,scenes:{}}; localStorage.setItem('film_os_v1',JSON.stringify(d)); },SS);
const pt=await ctx.newPage(); await pt.goto('http://localhost:8811/papertrail/'); await pt.waitForTimeout(600);
const tg=async t=>{ const sel='#tabs [data-tab="'+t+'"]'; if(!(await pt.$(sel))){ const g=await pt.$('#tabs [data-tabs~="'+t+'"]'); if(g){ await g.click(); await pt.waitForTimeout(150); } } await pt.click(sel); };
await tg('add'); await pt.fill('#ptitle','Salt Road'); await pt.fill('#paste','Title: Salt Road\n\nEXT. OCEAN PIER - NIGHT\n\nWaves.\n\nLENA\nThere.\n\nEXT. SPACESHIP - DAY\n\nROSS\nUp.\n'); await pt.click('#readit'); await pt.waitForTimeout(700); await pt.close();
await tab('drawer'); await p.waitForTimeout(700); m=await p.innerText('#main');
want('the drawer: both scripts, the one you could shoot first', (await p.$$eval('.dc b',x=>x.map(e=>e.textContent))).join()==='Dry Gulch,Salt Road'&&/2 of 3 scenes have a spot\. Story Studio/.test(m)&&/0 of 2 scenes have a spot\. Paper Trail/.test(m), m);
await p.click('.dc'); await p.waitForTimeout(200); m=await p.innerText('#main');
want('scene by scene: the jail is the red barn, at night, said; the canyon has none', /Red barn as jail/.test(m)&&/night isn't marked for this spot/.test(m)&&/Kitchen as diner/.test(m)&&/No spot yet: CANYON \(1 scene\)/.test(m)&&/Props in the action: rope\. On hand: rope\./.test(m), m);
want('no score', !/score|%|ready|you should/i.test(m));
await p.screenshot({path:SHOTS+'/bl_drawer.png',fullPage:true});
await p.click('#back'); await p.waitForTimeout(100); await p.click('.dc:nth-of-type(2)'); await p.waitForTimeout(200);
await p.click('#tofilm'); await p.waitForTimeout(800);
want('a Paper Trail script: PLAN IT IN STORY STUDIO opens it there', /film\/$/.test(p.url())&&/OCEAN PIER/.test(await p.innerText('#main')), [p.url(),(await p.innerText('#main')).slice(0,300)]);
await p.goto('http://localhost:8811/backlot/?tab=ground'); await p.waitForTimeout(500); m=await p.innerText('#main');
want('deal: your spots to pick from, never the park you can\'t use', /Red barn/.test(m)&&/Kitchen/.test(m)&&!(await p.$$eval('[data-gs]',x=>x.map(b=>b.textContent))).includes('Town park'));
await p.click('[data-gs]'); await p.click('[data-ch^="gp|2|"]'); await p.click('[data-ch^="gt|dusk|"]'); await p.selectOption('#gthing',{label:'rope'}); await p.selectOption('#gsit','1'); await p.click('#deal'); await p.waitForTimeout(200);
m=await p.innerText('.deal');
want('dealt: the barn at dusk, the rope, two people, a debt, headings, what it takes', /Red barn, at dusk: a debt comes due\. Rope matters\. 2 people\./.test(m)&&/(INT|EXT)\. RED BARN - DUSK/.test(m)&&/What it takes: Red barn: hang a lantern, sweep the hay/.test(m), m);
await p.click('#keep'); await p.waitForTimeout(150);
want('kept', /Kept · 1/i.test(await p.innerText('#main')));
await p.selectOption('#gsit',''); await p.click('[data-gs]'); await p.click('[data-ch^="gt||"]'); await p.click('[data-ch^="gp||"]'); await p.selectOption('#gthing','');
const seen=new Set(); for(let i=0;i<6;i++){ await p.click(i?'#again':'#deal'); await p.waitForTimeout(120); seen.add(await p.innerText('.deal .dl')); }
want('ANOTHER: let it pick, and it deals different starts', seen.size>=4, [...seen]);
await p.screenshot({path:SHOTS+'/bl_deal.png',fullPage:true});
await p.click('[data-hf="0"]'); await p.waitForTimeout(900);
want('PLAN THE SHOOT: Story Studio opens it as a new script, headings only', /film\/$/.test(p.url())&&/RED BARN - DUSK/.test(await p.innerText('#main')), (await p.innerText('#main')).slice(0,300));
const scr=await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('film_os_v1')); return Object.values(d.scripts).find(s=>/RED BARN/.test(s.text)); });
want('no dialogue in it, your line as a note', scr&&/\[\[From the ground: Red barn, at dusk: a debt comes due\./.test(scr.text)&&!/\n[A-Z ]+\n[^\n]/.test(scr.text.replace(/^Title:.*\n/,'').replace(/\[\[[\s\S]*?\]\]/,'').replace(/(INT|EXT)\.[^\n]*/g,'')), scr&&scr.text);
await p.goto('http://localhost:8811/backlot/?tab=ground'); await p.waitForTimeout(400);
await p.click('[data-hw="0"]'); await p.waitForTimeout(1500);
want('WRITE IT: Writer\'s Blockage opens it', /writers-blockage/.test(p.url())&&/RED BARN - DUSK/.test(await p.evaluate(()=>document.body.innerText+' '+[...document.querySelectorAll('textarea')].map(t=>t.value).join(' '))));
await p.goto('http://localhost:8811/backlot/?tab=list'); await p.waitForTimeout(400); m=await p.innerText('#main');
want('the list: every spot, a line each; the things by kind', /Red barn · inside and out · passes for stable, jail, saloon back room · light: morning, dusk · no power · mine · yes, i can use it · to make it pass: hang a lantern, sweep the hay/.test(m)&&/Vehicles · 1/i.test(m)&&/People you can get · 3/i.test(m), m.slice(0,600));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#savecsv')]); const csv=fs.readFileSync(await dl.path(),'utf8');
want('save as a spreadsheet: a row each, commas quoted', /^﻿type,name/.test(csv)&&/spot,Red barn,both,stable; jail; saloon back room,morning; dusk,,no,,mine,yes,"hang a lantern, sweep the hay"/.test(csv)&&csv.split('\r\n').filter(Boolean).length===9, csv);
await p.screenshot({path:SHOTS+'/bl_list.png',fullPage:true});
for(const t of ['spots','drawer','ground','list']){ await p.goto('http://localhost:8811/backlot/?tab='+t); await p.waitForTimeout(500);
 want(t+': nothing runs off the side, no em dashes', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!/—/.test(await p.innerText('body'))); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
