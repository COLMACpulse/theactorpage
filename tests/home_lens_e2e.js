/* Home: the headshot. Your main headshot as an 8x10 with your name, develops in, tap for YOUR PROFILE. Made-up face. Needs a server on :8811.
   NODE_PATH=... node tests/home_lens_e2e.js */
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const S=require('path').join(__dirname,'..','shared','fixtures'); let ok=true; const want=(n,c,x)=>{console.log((c?'PASS ':'FAIL ')+n+(c?'':' '+JSON.stringify(x)));if(!c)ok=false;};
for(const [w,h,tag] of [[1400,900,'desk'],[390,844,'phone']]){
 const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{localStorage.clear(); indexedDB.deleteDatabase('theactorpage_you');}); await p.reload(); await p.waitForTimeout(800);
 const empty=await p.evaluate(()=>({why:!document.getElementById('lenswhy').hidden,img:document.getElementById('lensimg').classList.contains('on'),panel:document.getElementById('youpanel').innerHTML.length}));
 want(tag+': empty, it says "Your headshot goes here." and the panel is shut', empty.why&&!empty.img&&empty.panel===0, empty);
 await p.locator('#you').scrollIntoViewIfNeeded(); 
 await p.click('#lens'); await p.waitForTimeout(300);
 want(tag+': tap the lens with nothing in it: YOUR PROFILE opens anyway', await p.evaluate(()=>{const d=document.getElementById('ypd');return !!(d&&d.open);}));
 await p.setInputFiles('#dropfile',S+'/made_up_face.jpg'); await p.waitForTimeout(1500);
 const got=await p.evaluate(()=>({on:document.getElementById('lensimg').classList.contains('on'),pull:document.getElementById('lens').classList.contains('pull'),why:document.getElementById('lenswhy').hidden}));
 want(tag+': a headshot lands: it is in the lens, it pulls focus, the line goes', got.on&&got.pull&&got.why, got);
 want(tag+': no name yet: the print says "Your name"', await p.evaluate(()=>document.getElementById('lensname').textContent)==='Your name');
 await p.fill('[data-yf="name"]','Sam Actor'); await p.waitForTimeout(200);
 want(tag+': type your name: it is printed under the headshot', await p.evaluate(()=>document.getElementById('lensname').textContent)==='Sam Actor'&&await p.getAttribute('#lens','aria-label')==='Your profile, Sam Actor');
 const r=await p.evaluate(()=>{ const g=document.querySelector('#lens .glass').getBoundingClientRect(); return g.height/g.width; });
 want(tag+': an 8x10 (4 by 5)', Math.abs(r-1.25)<0.02, r);
 await p.screenshot({fullPage:true,path:require('path').join(require('os').tmpdir(),'headshot_'+tag+'.png'),clip:await p.evaluate(()=>{ const b=document.getElementById('you').getBoundingClientRect(); return {x:0,y:b.top+scrollY,width:innerWidth,height:Math.min(520,b.height)}; })});
 await p.waitForTimeout(1300); 
 await p.reload(); await p.waitForTimeout(1500);
 want(tag+': after a reload it is still there', await p.evaluate(()=>document.getElementById('lensimg').classList.contains('on')));
 want(tag+': no page errors', !errs.length, errs);
 await c.close(); }
await b.close(); console.log(ok?"ALL PASS":"SOME FAILED"); process.exit(ok?0:1);})();
