/* MEMORIZER at a desk: keys for the buttons on screen. SPACE shows the line, 1 2 3 mark it, and in a scene run
   SPACE shows it, 1 got it, 2 dropped it. Never while you're typing. The key line shows with a mouse, not on a
   phone. Made-up sides. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), os=require('os');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const SIDES='INT. DOCK - NIGHT\n\nRAY\nYou came back.\n\nMARA\nI never left.\n\nRAY\nThen why does it feel like you did?\n\nMARA\nBecause you stopped looking.\n';
for(const [nm,vp,scheme] of [['desk',{width:1440,height:900},'light'],['deskdark',{width:1280,height:820},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:scheme}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(600);
 await p.evaluate(()=>MEM.bring()); await p.waitForTimeout(200); await p.evaluate(s=>{ document.getElementById('paste').value=s; MEM.paste(); },SIDES); await p.waitForTimeout(300); await p.evaluate(()=>MEM.pickMe('RAY')); await p.waitForTimeout(400);
 await p.evaluate(()=>MEM.tab('drill')); await p.waitForTimeout(300);
 want(nm+': the key line shows on a computer', await p.$eval('.keys',e=>e.offsetHeight>0&&/SPACE/.test(e.innerText)&&/1/.test(e.innerText)).catch(()=>false));
 await p.mouse.click(5,vp.height/2); await p.keyboard.press('Space'); await p.waitForTimeout(250);
 want(nm+': SPACE shows the line', !!(await p.$('.reveal .full'))&&!!(await p.$(`button[onclick="MEM.mark('got')"]`)));
 if(nm==='desk') await p.screenshot({path:path.join(os.tmpdir(),'mem_keys_'+nm+'.png')});
 await p.keyboard.press('1'); await p.waitForTimeout(300);
 want(nm+': 1 marks it GOT IT and moves on', !(await p.$('.reveal .full'))&&!!(await p.$('button[onclick="MEM.reveal()"]')));
 await p.click('text=Type it instead').catch(()=>{}); await p.waitForTimeout(200);
 const ta=await p.$('#typed'); if(ta){ await ta.click(); await p.keyboard.type('You came 1 back'); await p.waitForTimeout(150); }
 want(nm+': typing a 1 or a space types, it never marks', !!ta&&(await p.$eval('#typed',t=>t.value))==='You came 1 back'&&!(await p.$('.reveal .full')));
 await p.evaluate(()=>MEM.tab('scene')); await p.waitForTimeout(250); await p.evaluate(()=>MEM.scene('top')); await p.waitForTimeout(300);
 await p.mouse.click(5,vp.height/2);
 const sk=await p.$('button[onclick="MEM.sceneShow()"]');
 if(sk){ await p.keyboard.press('Enter'); await p.waitForTimeout(250); }
 want(nm+': scene run: ENTER shows it, then 1 or 2', !!sk&&!!(await p.$(`button[onclick="MEM.sceneMark('got')"]`)));
 await p.keyboard.press('2'); await p.waitForTimeout(250);
 want(nm+': 2 is DROPPED IT', !!(await p.$('button[onclick="MEM.sceneRetry()"]')));
 want(nm+': no errors', errs.length===0, errs);
 await c.close();
}
const m=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const q=await m.newPage();
await q.goto('http://localhost:8811/memorizer/'); await q.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await q.reload(); await q.waitForTimeout(500);
await q.evaluate(()=>MEM.bring()); await q.waitForTimeout(200); await q.evaluate(s=>{ document.getElementById('paste').value=s; MEM.paste(); },SIDES); await q.waitForTimeout(300); await q.evaluate(()=>MEM.pickMe('RAY')); await q.waitForTimeout(300); await q.evaluate(()=>MEM.tab('drill')); await q.waitForTimeout(300);
want('phone: no key line', await q.$eval('.keys',e=>e.offsetHeight===0).catch(()=>true));
await b.close(); console.log(ok?'ALL PASSED':'SOME FAILED'); process.exit(ok?0:1); })();
