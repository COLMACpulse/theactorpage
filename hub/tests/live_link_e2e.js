/* YOUR LIVE PAGE, ONE TAP (Col, Oct 30: "where is the link to their actual page? i assumed when i click 'your page' and
   then 'see it', it would take me to my user.theactorpage.com"). Not online yet: Your page says NOT ONLINE YET, with a
   button to Publish. Online: LIVE, the address as a link, OPEN MY PAGE (a new tab), COPY LINK, UPDATE IT ONLINE; SEE IT
   is PREVIEW and says it's from this computer. The Hub home and the studio show the live address too.
   A made-up actor (Riley Hart), no host needed. Computer light, phone dark. Server on :8811. */
const {chromium}=require('playwright');
const SP='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const U='https://riley-hart.theactorpage.com/';
for(const [nm,vp,cs] of [['computer',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8811/hub/?tab=package'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('colmac_hub'); }); await p.reload(); await p.waitForTimeout(1500);
 let t=await p.innerText('#pagetop');
 want(nm+': not online yet: says so, one button to Publish, PREVIEW not SEE IT', /NOT ONLINE YET/.test(t)&&!!(await p.$('#gopub'))&&!(await p.$('#openpage'))&&/PREVIEW/.test(t)&&!/SEE IT/.test(t), t.slice(0,300));
 await p.click('#gopub'); await p.waitForTimeout(800);
 want(nm+': PUT IT ONLINE goes straight to Publish', await p.evaluate(()=>{ const r=document.getElementById('online').getBoundingClientRect(); return r.top<innerHeight&&r.bottom>0; }));
 await p.evaluate(u=>{ localStorage.setItem('hub_online_v1',JSON.stringify({name:'riley-hart',key:'k',url:u,live:true})); localStorage.setItem('you_v1',JSON.stringify({name:'Riley Hart'})); },U);
 await p.reload(); await p.waitForTimeout(1500); t=await p.innerText('#pagetop');
 const o=await p.evaluate(()=>{ const a=document.getElementById('openpage'), l=document.querySelector('#livebox .lurl'); return {href:a&&a.href,tg:a&&a.target,l:l&&l.href,copy:!!document.getElementById('copypage')}; });
 want(nm+': live: LIVE, your address as a link, OPEN MY PAGE in a new tab, COPY LINK, UPDATE IT ONLINE', /LIVE/.test(t)&&/riley-hart\.theactorpage\.com/.test(t)&&o.href===U&&o.tg==='_blank'&&o.l===U&&o.copy&&/UPDATE IT ONLINE/.test(t), o);
 want(nm+': PREVIEW says it is from this computer', /PREVIEW shows this page from the files on this computer/.test(t));
 await p.locator('#pagetop').screenshot({path:SP+'/live_top_'+nm+'.png'});
 await p.goto('http://localhost:8811/hub/'); await p.waitForTimeout(1500);
 want(nm+': the Hub home: LIVE and your address, OPEN MY PAGE', await p.evaluate(u=>{ const h=document.getElementById('homeurl'); const a=[...document.querySelectorAll('a.hbtn')].find(x=>/OPEN MY PAGE/.test(x.textContent)); return !!h&&h.href===u&&/LIVE · riley-hart\.theactorpage\.com/.test(h.textContent)&&!!a&&a.href===u&&a.target==='_blank'; },U));
 want(nm+': nothing sideways, no errors', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!errs.length, errs);
 await p.goto('http://localhost:8811/'); await p.waitForTimeout(1200); if(await p.$('#stSkip')){ await p.click('#stSkip'); await p.waitForTimeout(500); }
 want(nm+': the studio: LIVE and your address under your name, opens in a new tab', await p.evaluate(u=>{ const a=document.getElementById('meLive'); return !!a&&a.href===u&&a.target==='_blank'&&/riley-hart\.theactorpage\.com/.test(a.textContent); },U));
 await p.locator('.me').screenshot({path:SP+'/live_me_'+nm+'.png'}).catch(()=>{});
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
