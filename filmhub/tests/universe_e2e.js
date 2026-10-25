/* FILM HUB · YOUR UNIVERSE (Col, Oct 25), like Paper Trail's: a computer opens to the map with what you tap beside
   it, a phone to the list, film by film. A color, a patch and initials per film. You are not a dot (you're on every
   film). What ties your films together and who you work with most, said plainly; the counts and your words folded.
   Made-up films and names. Server on :8811.  NODE_PATH=... node filmhub/tests/universe_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
const A='Title: Salt Road\n\nINT. DINER - NIGHT\n\nRain.\n\nLENA\nCoffee.\n\nROSS\nCold.\n\nEXT. PIER - DAY\n\nGulls.\n\nLENA\nThere.\n';
const B='Title: Dry Creek\n\nINT. DINER - NIGHT\n\nEmpty.\n\nHAL BRODY\nClosed.\n\nINT. BARN - NIGHT\n\nDark.\n\nHAL BRODY\nWho?\n\nWREN\nMe.\n';
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/filmhub/index.html');
 await p.evaluate(([A,B])=>{ localStorage.clear(); localStorage.setItem('film_os_v1',JSON.stringify({cur:'a',scripts:{a:{file:'a.fountain',text:A,me:'LENA',scenes:{},people:{actors:{ROSS:'Dana Pell'},me:'Sam Actor',crew:'Sound: Jo Park'}},b:{file:'b.fountain',text:B,scenes:{},people:{actors:{WREN:'Dana Pell'},crew:'Sound: Jo Park'}}}}));
  localStorage.setItem('filmhub_v1',JSON.stringify({films:[{id:'h1',title:'The Watch',year:'2019',kind:'Pilot',runtime:'22 min',links:[],people:'Directed by: Sam Actor\nSound: Jo Park'}],studio:{a:{kind:'Short',year:'2025'},b:{kind:'Short',year:'2026'}},notes:[],me:{into:['westerns'],want:[]}})); },[A,B]);
 await p.goto('http://localhost:8811/filmhub/?tab=you'); await p.waitForTimeout(800);
 if(nm==='desk'){
  want('computer: opens to the map', !!(await p.$('.umap svg'))&&!(await p.$('.ulist')));
  want('a color, a patch and initials per film', (await p.$$('.upatch')).length===3&&new Set(await p.$$eval('.un-film .ush',x=>x.map(e=>e.style.fill))).size===3&&(await p.$$eval('.uini',x=>x.map(t=>t.textContent))).sort().join()==='DC,SR,W');
  want('you are not a dot', !(await p.$('[data-un="p:samactor"]'))&&(await p.$$('.un-person')).length===2);
  want('on more than one film: marked', !!(await p.$('.un-person.umany[data-un="p:jopark"]'))&&!!(await p.$('.un-place.umany[data-un="l:DINER"]')));
  await p.$eval('[data-un="p:jopark"]',g=>g.dispatchEvent(new MouseEvent('click',{bubbles:true}))); await p.waitForTimeout(200);
  want('tap Jo Park: on 3 of your films, beside the map', /ON 3 OF YOUR FILMS[\s\S]*Jo Park[\s\S]*The Watch \(Sound\)/i.test(await p.innerText('#uinfo'))&&await p.evaluate(()=>document.getElementById('uinfo').getBoundingClientRect().left>=document.querySelector('.umap').getBoundingClientRect().right-2), await p.innerText('#uinfo'));
  await p.click('[data-ufl="p"]'); await p.waitForTimeout(200);
  want('PEOPLE off: they leave the map', (await p.$$('.un-person')).length===0&&(await p.$$('.un-place')).length>0);
  await p.click('[data-ufl="p"]'); await p.waitForTimeout(200);
  await p.click('[data-uview="list"]'); await p.waitForTimeout(200);
  want('the list is a tap away', !!(await p.$('.ulist')));
  await p.click('[data-uview="map"]'); await p.waitForTimeout(200);
 } else {
  want('phone: opens to the list', !!(await p.$('.ulist'))&&!(await p.$('.umap svg')));
  const m=await p.innerText('#main');
  want('film by film: who, with the job, and who it shares', /Salt Road[\s\S]*PEOPLE[\s\S]*Jo Park \(Sound\) also on Dry Creek, The Watch/i.test(m)&&/PLACES[\s\S]*DINER 2 also in Dry Creek/i.test(m), m.slice(0,600));
  want('the counts and your words are folded until you ask', !(await p.isVisible('#uadd_into'))&&!/3 films: 2 shorts/.test(m)&&/In your words\s*1 kept/.test(m));
  await p.click('#uwords summary'); await p.waitForTimeout(150);
  want('tap: your words open', await p.isVisible('#uadd_into')&&/westerns/.test(await p.innerText('#uwords')));
  await p.click('[data-uview="map"]'); await p.waitForTimeout(300);
  want('the map is a tap away', !!(await p.$('.umap svg')));
 }
 const m=await p.innerText('#main');
 want(nm+': what ties your films together, never you', /Jo Park is on Salt Road, Dry Creek and The Watch\./.test(m)&&/Dana Pell is on Salt Road and Dry Creek\./.test(m)&&/DINER is in Salt Road and Dry Creek: 2 scenes\./.test(m)&&!/Sam Actor/.test(m));
 want(nm+': who you work with most', /Jo Park · 3 films · Sound/.test(m)&&/Dana Pell · 2 films/.test(m));
 await p.click('#ufacts summary'); await p.waitForTimeout(150);
 want(nm+': the counts, on tap, never percents', /3 films: 2 shorts, 1 pilot\./.test(await p.innerText('#ufacts'))&&!/%/.test(await p.innerText('#main')));
 await p.screenshot({path:SHOTS+'/filmhub_universe_'+nm+'.png',fullPage:true});
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
