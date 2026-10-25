/* STORY STUDIO tidy (Col, Oct 25): FINISH leads with your cut (how long it runs, each scene's take) and Watch it first;
   bringing in takes and handing it to your editor are folded and stay as you left them. YOUR FILMS and + START A FILM
   sit on the front only; with a film open, "Your films" is a link in the header. Computer light, phone dark.
   Made-up script. Server on :8811.  NODE_PATH=... node film/tests/finish_e2e.js */
const {chromium}=require('playwright');
const SCRIPT='INT. KITCHEN - NIGHT\n\nJune sets the keys on the table.\n\nJUNE\nYou took the truck.\n\nWES\nI brought it back.\n\nEXT. SALT ROAD - DAWN\n\nWES\nIt ran fine.\n\nJUNE\nWith no gas in it.\n';
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(700);
 want(nm+': the front: YOUR FILMS and + START A FILM', !!(await p.$('#yourfilms'))&&!!(await p.$('#startfilm')));
 await p.click('#startfilm'); await p.waitForTimeout(150); await p.click('[data-kind="short"]'); await p.fill('#paste',SCRIPT); await p.click('#readit'); await p.waitForTimeout(500);
 want(nm+': a film open: no films bar in the room, a link in the header', !(await p.$('#yourfilms'))&&/Your films · 1/.test(await p.innerText('#hfilms')));
 await p.click('#hfilms'); await p.waitForTimeout(200);
 want(nm+': the header link opens your films', /Every film you.ve started here/i.test(await p.innerText('#main')));
 await p.click('#hfilms'); await p.waitForTimeout(150);
 await p.click('#tabs [data-r="post"]'); await p.waitForTimeout(300);
 const m=await p.innerText('#main');
 want(nm+': FINISH leads with your cut: the time, each scene, watch it first', /^YOUR CUT/i.test(m.trim())&&/0:00/.test(m)&&(await p.$$('.cutsum .csrow')).length===2&&/no take yet/.test(m)&&/WATCH IT FIRST/i.test(m));
 const ff=await p.$$eval('details.ffold',x=>x.map(d=>d.dataset.ff+(d.open?':open':'')));
 want(nm+': bringing in takes and the editor hand-off are folded', ff.join()==='bring,hand', ff);
 want(nm+': nine boxes no more: Log the day, Footage check, Editor pack out of sight', !(await p.isVisible('#daycard'))&&!(await p.isVisible('#packcard')));
 await p.click('[data-ff="hand"] summary'); await p.waitForTimeout(150);
 await p.fill('#ctarget','4:00'); await p.dispatchEvent('#ctarget','change'); await p.waitForTimeout(300);
 want(nm+': a fold you opened stays open when the page redraws', await p.$eval('[data-ff="hand"]',d=>d.open)&&await p.isVisible('#packcard'));
 await p.screenshot({path:SHOTS+'/finish_'+nm+'.png',fullPage:true});
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
