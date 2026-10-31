/* SAVE THE BACKUP CODE IN YOUR PASSWORDS (Col, Oct 31: "backup code might be challenging for some"). Where the code is
   shown (Footage, right after you claim your address; the Hub, Show backup code) there's SAVE IT IN MY PASSWORDS: the
   browser is asked to save your address and code, and then fills them in on Sign in. Sign in's code field is a password
   field with SHOW. Made-up actor (riley-hart). Computer light, phone dark. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const acct={name:'riley-hart',key:'k',backup:'MadeUpCode123',url:'https://riley-hart.theactorpage.com/',live:true};
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 /* the browser's password store, stood in for */
 await c.addInitScript(()=>{ window.__saved=[]; window.PasswordCredential=function(o){ Object.assign(this,o); }; try{ Object.defineProperty(navigator,'credentials',{value:{store:async c=>{ window.__saved.push({id:c.id,password:c.password}); return c; }}}); }catch(e){} });
 await p.goto('http://localhost:8811/hub/?tab=package'); await p.evaluate(a=>{ localStorage.clear(); localStorage.setItem('hub_online_v1',JSON.stringify(a)); },acct); await p.reload(); await p.waitForTimeout(1500);
 await p.evaluate(()=>{ ON.showBackup=true; render(); }); await p.waitForTimeout(300);
 want(nm+': Hub, Show backup code: SAVE IT IN MY PASSWORDS under the code', !!(await p.$('#online form.savecode .sc-go')));
 await p.click('#online form.savecode .sc-go'); await p.waitForTimeout(500);
 let sv=await p.evaluate(()=>window.__saved);
 want(nm+': the browser is asked to save your address and code', sv.length===1&&sv[0].id==='riley-hart'&&sv[0].password==='MadeUpCode123', sv);
 want(nm+': says so, and to keep it written down too', /it’s saved\. Keep it written down too/.test(await p.innerText('#online .savecode')));
 want(nm+': the page didn\'t go anywhere', /hub\//.test(p.url()));
 /* Footage, right after claiming */
 await p.goto('http://localhost:8811/footage/'); await p.waitForTimeout(1200);
 const hasBox=await p.evaluate(()=>!!document.getElementById('codebox'));
 if(hasBox){ await p.click('#codebox .sc-go'); await p.waitForTimeout(400); sv=await p.evaluate(()=>window.__saved);
  want(nm+': Footage, the code box: SAVE IT IN MY PASSWORDS works there too', sv.length===1&&sv[0].password==='MadeUpCode123', sv); }
 /* Sign in */
 await p.goto('http://localhost:8811/signin/'); await p.waitForTimeout(500);
 want(nm+': Sign in: the code is a password field, so a saved one fills in', await p.evaluate(()=>{ const n=document.getElementById('nm'), c=document.getElementById('code'); return c.type==='password'&&c.autocomplete==='current-password'&&n.autocomplete==='username'; }));
 await p.fill('#code','MadeUpCode123'); await p.click('#showCode');
 want(nm+': SHOW shows it, HIDE hides it', await p.evaluate(()=>document.getElementById('code').type==='text')&&(await p.innerText('#showCode'))==='HIDE');
 await p.fill('#nm','riley-hart.theactorpage.com'); await p.locator('#nm').blur(); await p.waitForTimeout(100);
 want(nm+': a saved full address becomes just the name', await p.inputValue('#nm')==='riley-hart');
 want(nm+': nothing sideways, no errors', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!errs.length, errs);
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
