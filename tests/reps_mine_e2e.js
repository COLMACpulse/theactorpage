/* YOUR REPS on Your page (Col, Oct 26: Contacts is gone). Add your agent on FOR MY REPS; the sheet's email goes to
   them; Spotted lists them; the old Contacts address lands here. Made-up names. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/hub/?tab=reps'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
 want(nm+': Your reps on FOR MY REPS, none yet', /Your reps/i.test(await p.innerText('#myreps'))&&/No agent or manager here yet/.test(await p.innerText('#myreps')));
 await p.click('#addrep'); await p.fill('#rp_name','Robin Vale'); await p.fill('#rp_co','Made Up Talent'); await p.fill('#rp_email','robin@example.com'); await p.click('#myreps button.act:not(.ghost)'); await p.waitForTimeout(400);
 want(nm+': added: listed, and the sheet emails them', /Robin Vale/.test(await p.innerText('#myreps'))&&/Made Up Talent/.test(await p.innerText('#myreps'))&&(await p.evaluate(()=>repsEmails())).includes('robin@example.com'));
 await p.goto('http://localhost:8811/spotted/'); await p.waitForTimeout(500);
 want(nm+': Spotted sends to them too', /Robin Vale/.test(await p.innerText('body')));
 await p.goto('http://localhost:8811/contacts/'); await p.waitForURL(/hub\/\?tab=reps/,{timeout:8000}).catch(()=>{});
 want(nm+': the old Contacts address lands on Your reps', /hub\/\?tab=reps/.test(p.url()));
 await p.click('#myreps button.ghost'); await p.waitForTimeout(300);
 want(nm+': REMOVE takes them off', !/Robin Vale/.test(await p.innerText('#myreps')));
 want(nm+': no sideways scroll, no page errors', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!errs.length, errs);
 await c.close(); }
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
