/* Hub front tiles, phone size, made-up auditions only. Needs a local server on :8811 at the repo root.
   NODE_PATH=... node hub/tests/tiles_e2e.js [screenshot.png] */
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const ctx=await b.newContext({viewport:{width:390,height:844}}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
let ok=true, n=0, f=0; const want=(t,c,x)=>{ n++; if(!c){ f++; ok=false; } console.log((c?'PASS ':'FAIL ')+t+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); };
const errs=[]; const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/hub/index.html'); await p.waitForTimeout(900);
await p.evaluate(async()=>{ if(isDemo()) await dropDemoData(); projects=projects.filter(x=>!/^T\d/.test(x.aaid||'')); saveProjects(); go('profile'); });
await p.waitForTimeout(300);
const tiles=()=>p.$$eval('#view .kit [data-kit]',x=>x.map(b=>({id:b.dataset.kit,text:b.innerText.replace(/\s+/g,' ').trim(),chip:(b.querySelector('[data-kst]')||{}).textContent||'',off:b.classList.contains('off')})));
let t=await tiles();
want('PROFILE: two camera tiles on top, both OFF', t.length===2&&t.every(x=>x.chip==='OFF')&&/Tape your audition/.test(t[0].text)&&/Check your frame/.test(t[1].text), t);
want('PROFILE: tiles come first in the view', await p.evaluate(()=>document.querySelector('#view').firstElementChild.matches('style')&&!!document.querySelector('#view > .kit')&&document.querySelector('#view > .kit').previousElementSibling.matches('style')));
want('no audition in: tiles off, say so', t.every(x=>x.off&&/No audition in yet/.test(x.text)), t);
await p.click('#view [data-kit="tape"]'); await p.waitForTimeout(300);
want('no audition in: tap goes to Auditions, camera stays off', await p.evaluate(()=>tab==='road'&&!openId&&!Hot.peek().camera));
want('AUDITIONS: tiles on top of the list too', (await tiles()).length===2);
// two live auditions: the later deadline first in the list, a passed one, an archived one
await p.evaluate(()=>{ const day=new Date().toISOString().slice(0,10), h=x=>new Date(Date.now()+x*3600e3).toISOString();
 projects.push(newProject({aaid:'T1',project:'DRY CREEK',title:'DRY CREEK',role:'DEPUTY',casting:'Dana Pell',kind:'audition',status:'Received',date:day,deadline:h(72)}));
 projects.push(newProject({aaid:'T2',project:'LOW TIDE',title:'LOW TIDE',role:'ANNA VOSS',casting:'Dana Pell',kind:'audition',status:'Received',date:day,deadline:h(20)}));
 projects.push(newProject({aaid:'T3',project:'SALT FLATS',title:'SALT FLATS',role:'RUNNER',kind:'audition',status:'Received',date:day,deadline:h(-5)}));
 projects.push(newProject({aaid:'T4',project:'OLD PIER',title:'OLD PIER',role:'COOK',kind:'audition',status:'Submitted',date:day,deadline:h(2)}));
 saveProjects(); go('profile'); });
await p.waitForTimeout(300);
t=await tiles();
want('with auditions: the tile names the soonest one due', /LOW TIDE, ANNA VOSS/.test(t[0].text)&&!t[0].off&&/LOW TIDE/.test(t[1].text), t);
if(process.argv[2]){ await p.mouse.move(380,830); await p.evaluate(()=>{ window.scrollTo(0,0); $('toast').className='toast'; }); await p.waitForTimeout(300); await p.screenshot({path:process.argv[2]}); }
await p.click('#view [data-kit="tape"]'); await p.waitForTimeout(400);
let v=await p.innerText('#view');
want('tap TAPE: lands on LOW TIDE, step 7 Record', /LOW TIDE/.test(v)&&/TAPE DAY · Record \(7\/11\)/i.test(v)&&/tape a take/i.test(v), v.slice(0,600));
want('tap TAPE: the camera is not on yet', await p.evaluate(()=>!Hot.peek().camera&&tapePhase==='off'));
t=await tiles(); want('open audition: tiles there, OFF', t.length===2&&t.every(x=>x.chip==='OFF'), t);
await p.click('#view button:has-text("tape a take")'); await p.waitForTimeout(1200);
t=await tiles(); want('press tape a take: chip ON', t[0].chip==='ON', t);
await p.click('#view button:has-text("record")'); await p.waitForTimeout(1500);
t=await tiles(); want('press record: chip RECORDING', t[0].chip==='RECORDING', t);
await p.click('#view button:has-text("stop")'); await p.waitForTimeout(800);
want('stop: the take is saved on LOW TIDE', await p.evaluate(()=>projectTakes(projects.find(x=>x.aaid==='T2')).length===1));
await p.click('#view button:has-text("done")'); await p.waitForTimeout(500);
t=await tiles(); want('done: chip back to OFF', t[0].chip==='OFF', t);
await p.click('#view button:has-text("All auditions")'); await p.waitForTimeout(300);
want('All auditions: back to the list', await p.evaluate(()=>tab==='road'&&!openId&&/In flight/i.test(document.querySelector('#view').innerText)));
await p.click('#view [data-kit="frame"]'); await p.waitForTimeout(400);
v=await p.innerText('#view');
want('tap FRAME: lands on LOW TIDE, step 6 Set up the shot, camera not on yet', /LOW TIDE/.test(v)&&/Set up the shot \(6\/11\)/i.test(v)&&/open camera/i.test(v)&&await p.evaluate(()=>!Hot.peek().camera), v.slice(0,600));
await p.click('#view button:has-text("open camera")'); await p.waitForTimeout(1200);
t=await tiles(); want('open camera: chip ON', t.every(x=>x.chip==='ON'), t);
await p.click('#nav button:has-text("Profile")'); await p.waitForTimeout(500);
want('leaving the audition turns the camera off', await p.evaluate(()=>!Hot.peek().camera&&!camOpen)&&(await tiles())[0].chip==='OFF');
const kitText=await p.$$eval('.kit',x=>x.map(y=>y.innerText).join(' '));
want('no em dashes on the tiles', !/—/.test(kitText), kitText);
want('no page errors', !errs.length, errs);
console.log(n-f+' passed, '+f+' failed'); console.log(ok?'ALL PASS':'SOME FAIL');
await b.close(); process.exit(ok?0:1);
})();
