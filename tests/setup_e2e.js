/* SET UP, 5 steps on the studio (Col, Oct 31: "how are we going to teach users how to navigate the site?"). The checklist
   ticks itself off from what's really there: résumé, a headshot, clips online, Your page visited, the page live. The next
   step is lit, each open step has DO IT to the right tool, HIDE THIS hides it for good, and it's gone for good once all
   five are done. Made-up actor (Sam Actor). Computer light, phone dark. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path');
const FX=path.join(__dirname,'..','shared','fixtures');
const SP='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['tablet',{width:820,height:1100},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8811/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear(); indexedDB.deleteDatabase('theactorpage_you'); }); await p.reload(); await p.waitForTimeout(1200);
 await p.setInputFiles('#stRes',path.join(FX,'sam_actor_resume.txt')); await p.waitForTimeout(1200);
 await p.setInputFiles('#stShot',path.join(FX,'made_up_face.jpg')); await p.waitForTimeout(2800);
 const st=()=>p.evaluate(()=>{ const s=document.getElementById('setup'); if(!s) return null; return {k:s.querySelector('.suk').textContent, done:[...s.querySelectorAll('li.done')].map(l=>l.dataset.step), next:(s.querySelector('li.next')||{}).dataset&&s.querySelector('li.next').dataset.step, go:[...s.querySelectorAll('a.sugo')].map(a=>a.getAttribute('href'))}; });
 let s=await st();
 want(nm+': on to the studio: SET UP · 2 OF 5, résumé and headshot ticked, clips next', s&&s.k==='SET UP · 2 OF 5'&&s.done.join()==='resume,head'&&s.next==='clips', s);
 want(nm+': each open step goes to its tool: Footage, Your page, Your page', s&&s.go.join()==='footage/,hub/?tab=package,hub/?tab=package', s);
 want(nm+': above Your studio, under your name', await p.evaluate(()=>{ const a=document.querySelector('.me'), s=document.getElementById('setup'), h=document.querySelector('.shead'); return !!(a&&s&&h)&&(a.compareDocumentPosition(s)&4)&&(s.compareDocumentPosition(h)&4); }));
 await p.screenshot({path:SP+'/setup_'+nm+'.png'});
 /* clips go up, Your page is visited, the page goes live */
 await p.evaluate(()=>localStorage.setItem('footcloud_v1',JSON.stringify({items:[{id:'a',name:'x.mp4',done:true}],bytes:1,cap:2}))); await p.evaluate(()=>FrontPage.render()); s=await st();
 want(nm+': clips online: 3 OF 5, Your page next, says how many and only you can see them', s&&s.k==='SET UP · 3 OF 5'&&s.next==='page'&&/1 clip online · only you can see them/.test(await p.innerText('#setup')), s);
 await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(1500); await p.goto('http://localhost:8811/'); await p.waitForTimeout(1000); s=await st();
 want(nm+': been to Your page: 4 OF 5, Put it online next', s&&s.k==='SET UP · 4 OF 5'&&s.next==='online', s);
 want(nm+': nothing sideways, no errors', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!errs.length, errs);
 if(nm==='computer'){
  await p.evaluate(()=>localStorage.setItem('hub_online_v1',JSON.stringify({name:'sam-actor',key:'k',url:'https://sam-actor.theactorpage.com/',live:true}))); await p.evaluate(()=>FrontPage.render());
  want('all five done: gone', !(await p.$('#setup')));
  await p.evaluate(()=>localStorage.setItem('hub_online_v1',JSON.stringify({name:'sam-actor',key:'k',live:false}))); await p.evaluate(()=>FrontPage.render());
  want('and gone for good, even if the page comes down later', !(await p.$('#setup')));
 } else {
  await p.click('#setupHide'); await p.waitForTimeout(300); await p.reload(); await p.waitForTimeout(1000);
  want(nm+': HIDE THIS: gone, and stays gone after a reload', !(await p.$('#setup'))&&!!(await p.$('.shead')));
 }
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
