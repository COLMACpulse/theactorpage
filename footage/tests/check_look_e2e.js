/* CHECK THE COPY in the house look (Col, Oct 25): FILM blue like Story Studio, FILM's header and sticks, back to
   where you came from (Story Studio or Footage), YOUR CHECKS and HOW IT WORKS folded with one promise line open.
   Made-up card and drives. Phone dark, computer light. Server on :8811.
   NODE_PATH=... node footage/tests/check_look_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
for(const [nm,vp,cs] of [['phone',{width:390,height:844},'dark'],['desk',{width:1280,height:860},'light']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/footage/check.html'); await p.evaluate(()=>{ localStorage.clear(); CopyCheck.remember({card:'B002',label:'Pier day',files:12,size:5e9,safe:true,results:[{name:'SHUTTLE_A',ok:12,total:12,bad:[]},{name:'BACKUP_B',ok:12,total:12,bad:[]}]}); });
 await p.reload(); await p.waitForTimeout(400);
 const acc=await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--gold').trim());
 want(nm+': FILM blue, like Story Studio', acc===(cs==='dark'?'#6fa8d6':'#2f6fa8'), acc);
 want(nm+': FILM header and sticks', /FILM · CHECK THE COPY/.test(await p.innerText('h1'))&&/Before you erase a card/.test(await p.innerText('header'))&&await p.isVisible('.hstk')&&await p.isVisible('.hico'));
 want(nm+': from Footage, back goes to Footage', (await p.getAttribute('#back','href'))==='./'&&/Footage/.test(await p.innerText('#back')));
 const m=await p.innerText('main');
 want(nm+': one promise line open; your checks and how it works folded', /Nothing is uploaded\. It never erases anything\./.test(m)&&/Your checks\s*1 kept/.test(m)&&!/B002/.test(m)&&!/ON A COMPUTER/.test(m), m.slice(-400));
 await p.click('#histfold summary'); await p.waitForTimeout(100);
 want(nm+': tap your checks: the one you kept', /B002 · Pier day/.test(await p.innerText('#histfold'))&&/all copies match/.test(await p.innerText('#histfold')));
 want(nm+': words in Jost, file names stay in type', /Jost/.test(await p.$eval('.btn',e=>getComputedStyle(e).fontFamily))&&/Jost/.test(await p.$eval('.kick',e=>getComputedStyle(e).fontFamily)));
 await p.screenshot({path:SHOTS+'/check_pick_'+nm+'.png',fullPage:true});
 /* a quick made-up check, one copy off */
 await p.evaluate(()=>{ const F=(k,t)=>{ const f=new File([t],k,{type:'video/quicktime'}); Object.defineProperty(f,'webkitRelativePath',{value:'A001/'+k}); return f; };
  __copy.take('card',[F('C1.mov','aaaa'),F('C2.mov','bbbb')]); __copy.take(0,[F('C1.mov','aaaa'),F('C2.mov','bbbx')],'SHUTTLE_A'); });
 await p.click('#p_go'); await p.waitForSelector('.verdict',{timeout:20000}); await p.waitForTimeout(200);
 want(nm+': the answer reads in the house colors', /Don't erase the card yet\./.test(await p.innerText('.verdict'))&&await p.$eval('.verdict.stop',e=>getComputedStyle(e).backgroundColor)===(cs==='dark'?'rgb(42, 23, 18)':'rgb(247, 230, 224)'));
 await p.screenshot({path:SHOTS+'/check_result_'+nm+'.png',fullPage:true});
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await p.goto('http://localhost:8811/footage/check.html?from=film'); await p.waitForTimeout(200);
 want(nm+': from Story Studio, back goes to Story Studio', (await p.getAttribute('#back','href'))==='../film/'&&/Story Studio/.test(await p.innerText('#back')));
 await p.goto('http://localhost:8811/footage/check.html',{referer:'http://localhost:8811/film/'}); await p.waitForTimeout(200);
 want(nm+': came from Story Studio\'s page: back goes there', (await p.getAttribute('#back','href'))==='../film/');
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
