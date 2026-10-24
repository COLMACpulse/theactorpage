/* YOURS on home: nothing until you've added your own (made-up here); then a tile for each tool with yours in it,
   your newest. Read on this device only: the page makes no request to anywhere for it. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), os=require('os');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1300,height:900}}); const p=await c.newPage(); const errs=[], out=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('request',r=>{ const u=r.url(); if(!/^http:\/\/localhost:8811\//.test(u)&&!/^(data|blob):/.test(u)) out.push(u); });
await p.goto('http://localhost:8811/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
want('nothing of yours yet: no YOURS section at all, no samples', await p.evaluate(()=>document.getElementById('yours').hidden&&!document.querySelector('#yours .ytile.mine')));
want('the footer stays a list', !(await p.$('footer .ytile')));
await p.evaluate(()=>{
 const s=Notes.addSession({title:'Low Tide',who:[{name:'Pat Coach'}]}); Notes.addNote({sid:s.id,text:'Take the pause before the door.',giver:'Pat Coach'});
 Viz.add({title:'Harbor Lights',kind:'show'});
 localStorage.setItem('theactorpage_spotted_v1',JSON.stringify({items:[{id:'i1',at:Date.now(),card:{project:'Dry Creek',role:'Series regular',where:'Austin',casting:['Pell Casting'],source:'https://example.com/story'}}],me:{},held:[]}));
 Contacts.add({name:'Morgan Lee',role:'agent'});
 Viz.plugAdd({kind:'airing',title:'Harbor Lights',text:'Harbor Lights is on next Friday. Tune in.'});
 const day=new Date().toISOString().slice(0,10), due=new Date(Date.now()+5*864e5).toISOString().slice(0,10); const h=Plan.hear('Audition for Ferro, the role of Ray, due '+due,day,{}); Plan.save(Plan.make('x',Object.assign(h,{title:'Ferro',due}),day));
});
await p.reload(); await p.waitForTimeout(1200);
const t1=await p.$$eval('#yours .ytile',x=>x.map(e=>({k:e.dataset.y,tag:e.classList.contains('mine')?'YOURS':'SAMPLE',t:e.querySelector('.yart').innerText.replace(/\s+/g,' ')})));
want('with yours: the section shows, Footage a plain link, no Expenses', await p.evaluate(()=>!document.getElementById('yours').hidden)&&!/Expenses/.test(await p.innerText('#yours .yrow'))&&/Footage/.test(await p.innerText('#yours .yrow')));
const by=k=>t1.find(x=>x.k===k)||{};
want('Notes: no tile, a plain link', !t1.some(x=>x.k==='notes')&&/Notes/.test(await p.innerText('#yours .yrow')));
want('Spotted: the last thing you spotted, where it came from', by('spotted').tag==='YOURS'&&/Dry Creek/.test(by('spotted').t)&&/EXAMPLE\.COM/.test(by('spotted').t), by('spotted'));
want('Contacts: your people first, each its own link to that person', by('contacts').tag==='YOURS'&&/Morgan Lee/.test(by('contacts').t)&&(await p.getAttribute('#yours .ypeople a','href'))==='contacts/?who=Morgan%20Lee', by('contacts'));
want('Picture It: your wall', by('picture').tag==='YOURS'&&/HARBOR LIGHTS|Harbor Lights/i.test(by('picture').t)&&/WANT IT/.test(by('picture').t), by('picture'));
want('Press: your last plug, in your words', by('press').tag==='YOURS'&&/Tune in/.test(by('press').t), by('press'));
want('The Plan: your days', by('plan').tag==='YOURS'&&/Ferro/.test(by('plan').t), by('plan'));
want('no Hub on this device: no Hub tile, no sample in its place', !t1.some(x=>x.k==='hub')&&t1.every(x=>x.tag==='YOURS'), t1.map(x=>x.k));
want('nothing goes anywhere: no request leaves this site for it', out.length===0, out);
const e=await p.$('#yours'); await e.scrollIntoViewIfNeeded(); await e.screenshot({path:path.join(os.tmpdir(),'yours_home.png')});
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
