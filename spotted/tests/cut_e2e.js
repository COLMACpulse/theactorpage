/* A CUT FOR THIS: a kept card in SPOTTED hands its role to ARCHBOOK (BUILD A CUT); Archbook opens on FOR A ROLE with
   the role's words, builds a cut from your tagged footage, and the card shows it; the notes to your reps say it's
   ready; FOR MY REPS lists it as new. A card with no role description builds from the project's kind and your types,
   and says so. Made-up footage marks and names only. Server on :8811.  NODE_PATH=... node spotted/tests/cut_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
// your footage in Archbook: three tagged moments (no video needed to match and build)
await p.goto('http://localhost:8811/archbook/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.ARCHBOOK&&ARCHBOOK.S.lib,null,{timeout:8000});
await p.evaluate(()=>{ const L=ARCHBOOK.S.lib; L.clips.push({id:'c1',name:'made_up_scene.mp4',size:1000,dur:120});
 L.tags={authority:{label:'authority',n:2},weathered:{label:'weathered',n:1},menace:{label:'menace',n:1},horse:{label:'horse',n:1}};
 L.moments.push({id:'m1',clip:'c1',in:0,out:20,tags:['authority','weathered'],open:true},{id:'m2',clip:'c1',in:30,out:55,tags:['menace']},{id:'m3',clip:'c1',in:60,out:80,tags:['authority','horse']});
 ARCHBOOK.save(); }); await p.waitForTimeout(600);
// a kept card in Spotted, from a casting notice with the role's own words
await p.goto('http://localhost:8811/spotted/index.html'); await p.waitForTimeout(500);
await p.evaluate(()=>{ const card=Spotted.read('Project: Dust Road\nRole: SHERIFF COLE\nCasting: Canyon Casting\n\n[SHERIFF COLE] 40s-50s. Weathered small-town sheriff with quiet authority. Menacing when pushed. Must ride a horse.');
 localStorage.setItem('theactorpage_spotted_v1',JSON.stringify({items:[{id:'s1',at:Date.now(),raw:'',card,status:'spotted',history:[{s:'spotted',at:Date.now()}],note:'',mine:''}],me:{reel:'',resume:'',site:'',reps:[{name:'Agent A',email:'agent@example.com'}]},held:[]}));
 localStorage.setItem('spotted_ui_v1',JSON.stringify({tab:'list',open:'s1'})); You.set('name','Riley Hart'); });
await p.reload(); await p.waitForTimeout(800);
let box=await p.innerText('#cutbox');
want('the card: A CUT FOR THIS, from the role\'s own words', /A CUT FOR THIS/i.test(box)&&/from the role's own words/.test(box)&&!!(await p.$('#buildcut')), box);
await p.click('#buildcut'); await p.waitForURL(/archbook/); await p.waitForFunction(()=>window.ARCHBOOK&&ARCHBOOK.S.lib,null,{timeout:8000}); await p.waitForTimeout(500);
const fb=await p.innerText('#forspotted');
want('Reel Room opens on FOR A ROLE, for Dust Road, read from the role', /For Dust Road · SHERIFF COLE/i.test(fb)&&/from Spotted/.test(fb)&&/role's own words/.test(fb)&&/WEATHERED|Weathered/.test(await p.evaluate(()=>ARCHBOOK.S.lib.lastBreakdown)), fb);
want('it sees the footage you have for the role', /YOU HAVE FOOTAGE FOR/.test(await p.innerText('#main'))&&(await p.$$('[data-a="showrow"]')).length>=2);
await p.click('[data-a="buildreel"][data-s="90"]'); await p.waitForTimeout(700);
const cf=await p.innerText('#cutfor');
want('build: a cut named for the project and role, tied to the card', /A cut for Dust Road/.test(cf)&&(await p.inputValue('[data-f="reelname"]'))==='Dust Road · SHERIFF COLE cut', [cf, await p.inputValue('[data-f="reelname"]')]);
const rec=await p.evaluate(()=>JSON.parse(localStorage.getItem('theactorpage_cuts_v1')||'[]'));
want('the cut is on record for the card, with its length', rec.length===1&&rec[0].spotted==='s1'&&rec[0].secs>=60&&rec[0].from==='role', rec);
await p.click('#cutfor [data-a="tospotted"]'); await p.waitForURL(/spotted/); await p.waitForTimeout(800);
box=await p.innerText('#cutbox');
want('back in Spotted, on the card: the cut, its length, OPEN IN REEL ROOM', /Dust Road · SHERIFF COLE cut/.test(box)&&/1:\d\d|2:00/.test(box)&&/OPEN IN REEL ROOM/.test(box), box);
const pa=await p.inputValue('#t_pa'), pt=await p.inputValue('#t_pt');
want('the notes to your reps say it\'s ready', /I put together a \d:\d\d cut for this role\. Say the word and I'll send it\./.test(pa)&&/There's a \d:\d\d cut for this role, ready to send\./.test(pt), [pa.slice(-160),pt.slice(-160)]);
want('what changed: the cut, logged once', (await p.innerText('#changed')).match(/Built a \d:\d\d cut in Reel Room\./g).length===1);
await p.reload(); await p.waitForTimeout(600);
want('still logged once after a reload', (await p.innerText('#changed')).match(/Built a \d:\d\d cut in Reel Room\./g).length===1);
const href=await p.getAttribute('#cutbox a','href'); await p.click('#cutbox a'); await p.waitForURL(/archbook/); await p.waitForTimeout(800);
want('OPEN IN REEL ROOM: straight to that cut', /reel=/.test(href)&&(await p.inputValue('[data-f="reelname"]'))==='Dust Road · SHERIFF COLE cut');
// FOR MY REPS
await p.goto('http://localhost:8811/hub/?tab=reps'); await p.waitForTimeout(1500);
await p.evaluate(()=>{ repsState().last={at:Date.now()-86400000*3,snap:{at:Date.now()-86400000*3,offices:{},want:[],rightFor:[],wantMore:[],wantSeen:[],fits:[],nets:[]}}; saveProfile(); render(); }); await p.waitForTimeout(400);
{ const rv=await p.innerText('#view'); want('FOR MY REPS what\'s new: the cut, in your voice', /Dust Road: I built a \d:\d\d cut for it\./.test(rv), rv.slice(rv.search(/What's new since/i),rv.search(/What's new since/i)+400)); }
// a card with no role description: built from the project's kind and your types, said
await p.goto('http://localhost:8811/spotted/index.html'); await p.evaluate(()=>{ You.setList('types',['rancher','authority']); const d=JSON.parse(localStorage.getItem('theactorpage_spotted_v1')); d.items.push({id:'s2',at:Date.now(),raw:'',card:Spotted.read('Netflix orders western series "Salt Flat".'),status:'spotted',history:[],note:'',mine:''}); localStorage.setItem('theactorpage_spotted_v1',JSON.stringify(d)); localStorage.setItem('spotted_ui_v1',JSON.stringify({tab:'list',open:'s2'})); }); await p.reload(); await p.waitForTimeout(700);
want('no role description: it says the cut is built from the project and your types', /from the project's kind and your types \(there's no role description on this one\)/.test(await p.innerText('#cutbox')));
await p.click('#buildcut'); await p.waitForURL(/archbook/); await p.waitForFunction(()=>window.ARCHBOOK&&ARCHBOOK.S.lib,null,{timeout:8000}); await p.waitForTimeout(500);
want('Reel Room says so too, and asks for the breakdown if your reps have it', /no role description on this one/.test(await p.innerText('#forspotted'))&&/Paste the breakdown if your reps have it/.test(await p.innerText('#forspotted'))&&/Right for: rancher, authority/.test(await p.evaluate(()=>ARCHBOOK.S.lib.lastBreakdown)));
want('the handoff is used once, then gone', await p.evaluate(()=>!localStorage.getItem('theactorpage_handoff_cut')));
want('no em dashes', !/—/.test(pa+pt+box));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
