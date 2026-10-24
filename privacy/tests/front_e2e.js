/* PRIVACY: the short version, then each time something can leave (when you, what goes, who sees it), the full
   wording one tap under each row, the rest folded. True to the site today: eleven speech places with Story Studio,
   the news in Picture It, video on your page. Computer (light) and phone (dark). Server on :8811.
   NODE_PATH=... node privacy/tests/front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
for(const [nm,vp,cs] of [['desk',{width:1280,height:900},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 const out=[]; p.on('request',r=>{ if(!/^http:\/\/localhost:8811\//.test(r.url())) out.push(r.url()); });
 await p.goto('http://localhost:8811/privacy/'); await p.waitForTimeout(700);
 const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 want(nm+': the theme', bg===(cs==='dark'?'rgb(18, 17, 16)':'rgb(236, 231, 220)'), bg);
 want(nm+': the house header', /YOU · PRIVACY/i.test(await p.innerText('header'))&&/Your work stays with you/.test(await p.innerText('header h1'))&&!!(await p.$('.hstk')));
 const facts=await p.$$eval('.fact b',x=>x.map(e=>e.textContent));
 want(nm+': the short version, four lines', facts.join('|')==='No account|Kept on this device|Nothing leaves on its own|You hold the backup', facts);
 const rows=await p.$$eval('.lv>summary b',x=>x.map(e=>e.textContent));
 want(nm+': each time something can leave', rows.length===9&&['Send it','Speak to a tool that types','Put your page online','Put a video on your page','Check the news','Search for your press','Ask a friend to read in','Look up a credit in the Hub','Open a link'].every(r=>rows.includes(r)), rows);
 want(nm+': the full wording is folded under each row', await p.$$eval('.lv',x=>x.every(d=>!d.open)));
 await p.click('.lv:has-text("Speak to a tool") summary'); await p.waitForTimeout(200);
 const sp=await p.innerText('.lv:has-text("Speak to a tool") .more');
 want(nm+': one tap: the eleven speech places, Story Studio in it, LISTENING stays here', /Eleven places/.test(sp)&&/Story Studio/.test(sp)&&/THE PLAN/.test(sp)&&/LISTENING/.test(sp)&&/stays on the device/.test(sp), sp);
 await p.click('.lv:has-text("Check the news") summary'); await p.waitForTimeout(200);
 want(nm+': the news is Picture It now, nothing about you', /CHECK THE NEWS in Picture It/.test(await p.innerText('.lv:has-text("Check the news") .more'))&&!/postcard/i.test(await p.innerText('body')));
 want(nm+': your page online: says it isn\'t switched on yet', /Not switched on yet/.test(await p.innerText('.lv:has-text("Put your page online") summary')));
 want(nm+': the rest folded', (await p.$$('details.fold')).length===5&&await p.$$eval('details.fold',x=>x.every(d=>!d.open)));
 const t=await p.evaluate(()=>document.body.textContent);
 want(nm+': no em dashes, never "thing"', !/—/.test(t)&&!/\bthings?\b/i.test(t));
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': asks nobody else for anything', !out.length, out);
 await p.screenshot({path:SHOTS+'/privacy_'+nm+'.png',fullPage:true});
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
