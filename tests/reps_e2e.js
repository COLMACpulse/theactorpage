/* FOR MY REPS in the Hub: the made-up actor's offices and credits, plus things spotted (SPOTTED), people from a class
   your words (YOU) and the roles you want (HEADSHOTS). The first sheet; I SENT IT; then a new read and a
   callback come in, and only those show as new. The rhythm you pick sticks. Made-up names only. Server on :8811. */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('hub_demo','1');
 localStorage.setItem('theactorpage_spotted_v1',JSON.stringify({items:[
  {id:'s1',at:Date.now()-86400000,status:'spotted',card:{project:'Dust Road',network:'Netflix',role:'Sheriff Cole',casting:['Canyon Casting'],type:'Series, western',source:'https://deadline.com/dust-road'}},
  {id:'s2',at:Date.now()-3600000,status:'passed',card:{project:'Zoom Room',casting:['Canyon Casting'],source:'https://zoom.us/j/123'}}],me:{reps:[{name:'Agent A',email:'agent@example.com'},{name:'Manager M',email:'manager@example.com'}]},held:[]}));
 localStorage.setItem('theactorpage_headshots_v1',JSON.stringify({called:['Law enforcement'],want:['Western / period']}));
});
await p.goto('http://localhost:8811/hub/?tab=reps'); await p.waitForTimeout(1800);
want('FOR MY REPS in the Hub: its own page, back to the front', /For my reps/i.test(await p.innerText('#nav'))&&/YOUR PAGE/.test(await p.innerText('#nav')));
let v=await p.innerText('#view');
want('says what it is: one sheet, both reps, only what\'s new after the first, nothing sends itself', /agent and your manager/.test(v)&&/only says what's new/.test(v)&&/Nothing sends itself/.test(v));
want('not sent yet: due', /Not sent yet/i.test(v)&&/haven't had this yet/.test(v));
await p.fill('.form input >> nth=0','cop, dad, rancher, western'); await p.press('.form input >> nth=0','Tab'); await p.waitForTimeout(300);
await p.fill('.form input >> nth=1','westerns, dark drama'); await p.press('.form input >> nth=1','Tab'); await p.waitForTimeout(300);
const sheet=()=>p.$eval('#view textarea',t=>t.value);
let t=await sheet();
want('the sheet: where I stand from the Hub\'s offices', /WHERE I STAND/.test(t)&&/reads? in all|read/.test(t), t.slice(0,600));
want('networks from your credits', /NETWORKS I'VE WORKED FOR\n- /.test(t), t);
want('on my radar: an office casting now that never had me in (from SPOTTED)', /Canyon Casting: casting Zoom Room, Dust Road\. Never had me in\./.test(t), t);
want('your words: right for (with the roles you\'re called in for), want more of, want to be seen for', /cop, dad, rancher, western, Law enforcement/.test(t)&&/westerns, dark drama/.test(t)&&/Roles I want to be seen for: Western \/ period/.test(t));
want('casting that fits: the western, with its link; never the Zoom link', /Dust Road \(Netflix\)\. Canyon Casting casting\. Role: Sheriff Cole\. My words: western\./.test(t)&&!/Zoom Room \(/.test(t.split('CASTING NOW THAT FITS ME')[1]||'')&&/deadline\.com\/dust-road/.test(t)&&!/zoom\.us/.test(t));
want('no phone numbers or emails on it', !/@|\(555\)/.test(t), (t.match(/.*(@|\(555\)).*/)||[''])[0]);
const e=await p.evaluate(()=>{ const {m,ch}=repsNow(); return RepSheet.email(m,ch); });
want('Email my reps: to both reps, the short note', /agent@example\.com, manager@example\.com/.test(await p.innerText('#view'))&&/I'll only send what's changed/.test(e.short));
const dl=p.waitForEvent('download'); await p.click('button:has-text("Save the sheet")'); const d=await dl; const tmp=path.join(os.tmpdir(),'reps_'+Date.now()+'.html'); await d.saveAs(tmp);
const html=fs.readFileSync(tmp,'utf8'); fs.unlinkSync(tmp);
want('Save the sheet: a page to attach, no scripts', /<title>For my reps · RILEY HART<\/title>/.test(html)&&!/<script/i.test(html)&&/Where I stand/.test(html), d.suggestedFilename());
await p.click('button:has-text("I sent it")'); await p.waitForTimeout(400); v=await p.innerText('#view');
want('I SENT IT: last sent today, nothing new yet', /Last sent/i.test(v)&&/Nothing new/.test(v));
// a new read, and a callback, after that
await p.evaluate(()=>{ const off=officeIndex().find(o=>o.reads.length); window.__off=off.name; projects.push(newProject({aaid:'man'+Date.now().toString(36),title:'Red Ridge',role:'Deputy',casting:off.name,office:off.name,kind:'audition',state:'archived',status:'Submitted',when:'Oct 21'}));
 const p0=projects.find(p=>(p.casting_office||p.casting_director||p.casting)===off.name&&p.title!=='Red Ridge'); p0.outcome=Object.assign({},p0.outcome||{},{callback:'2026-10-21'}); saveProjects(); render(); });
await p.waitForTimeout(500); v=await p.innerText('#view'); const off=await p.evaluate(()=>window.__off);
want('what\'s new: only the new read and the callback', v.includes('1 new read: '+off+'.')&&v.includes('Callback: '+off+'.'), v.slice(v.search(/What's new since/i),v.search(/What's new since/i)+300));
t=await sheet(); want('the sheet now leads with what\'s new', /WHAT'S NEW SINCE/.test(t.split('\n').slice(0,5).join('\n')));
await p.click('button:has-text("Every 2 weeks")'); await p.waitForTimeout(300);
want('pick the rhythm: every 2 weeks, next one in 14 days', /Next one in 14 days/.test(await p.innerText('#view'))&&await p.evaluate(()=>profile.reps.rhythm==='2weeks'));
await p.reload(); await p.waitForTimeout(1500);
want('it sticks after a reload', await p.evaluate(()=>tab==='reps'&&profile.reps.rhythm==='2weeks'&&!!profile.reps.last));
want('Casting\'s old "For your rep" button now opens this tab', await p.evaluate(()=>{ go('offices'); return /For my reps/.test(document.getElementById('view').innerText); }));
if(process.env.SHOTS){ await p.evaluate(()=>{ go('reps'); window.scrollTo(0,0); }); await p.waitForTimeout(400); await p.screenshot({path:process.env.SHOTS+'/reps_tab.png',fullPage:true}); }
want('no em dashes', !/—/.test(t+html));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
