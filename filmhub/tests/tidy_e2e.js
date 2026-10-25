/* FILM HUB tidy (Col, Oct 25): FILM blue like Story Studio; no empty poster box; PAGE leads with your page, the
   actor-page note is one line at the bottom; PEOPLE marks YOU and reads "Directed by" as Director; YOU counts, never
   percents, and "who you keep working with" is 2+ films and never you. Made-up films and names. Server on :8811.
   NODE_PATH=... node filmhub/tests/tidy_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[], t=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
for(const [nm,vp,cs] of [['phone',{width:390,height:844},'dark'],['desk',{width:1280,height:860},'light']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/filmhub/'); await p.evaluate(t=>{ localStorage.clear(); const F=window.FilmOS,S=F.scenes(t),sc={}; sc[S[0].n]={way:'keep',where:'loc1',done:{},cont:{}};
  localStorage.setItem('film_os_v1',JSON.stringify({cur:'lt',scripts:{lt:{file:'low_tide.fountain',text:t,me:'ANNA',scenes:sc,cut:{target:600,fps:'24',takes:{}},people:{actors:{'MR. DELL':'Ross Okafor'},me:'Sam Actor',crew:'Sound - Jo Park'}}}}));
  localStorage.setItem('filmhub_v1',JSON.stringify({films:[{id:'h1',title:'Dry Creek',year:'2023',kind:'Short',runtime:'11 min',links:[],people:'Directed by: Sam Actor\nSound: Jo Park'}],studio:{},notes:[],me:{banner:'',about:'',email:'',into:[],want:[]}})); },t);
 await p.reload(); await p.waitForTimeout(600);
 const acc=await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--tung').trim());
 want(nm+': FILM blue, like Story Studio', acc===(cs==='dark'?'#6fa8d6':'#2f6fa8'), acc);
 want(nm+': no poster, no empty box', (await p.$$eval('.fc .po',x=>x.filter(e=>e.getBoundingClientRect().width>0).length))===0);
 want(nm+': a film you made says its runtime', /2023 · Short · 11 min/.test(await p.innerText('#main')));
 await p.click('#tabs [data-t="page"]'); await p.waitForTimeout(300);
 const pg=await p.innerText('#main');
 want(nm+': PAGE leads with your page; the actor page is one line at the bottom', /^YOUR PAGE/i.test(pg.trim())&&/actor page too[\s\S]*Open it/.test(pg)&&pg.indexOf('actor page too')>pg.indexOf('SAVE AS A PAGE'), pg.slice(0,200));
 await p.click('#tabs [data-t="people"]'); await p.waitForTimeout(300);
 const pe=await p.innerText('#main');
 want(nm+': PEOPLE marks you, and "Directed by" reads Director', /Sam Actor\s*YOU/.test(pe)&&/Dry Creek \(Director\)/.test(pe)&&!/Directed by/.test(pe), pe);
 await p.click('#tabs [data-t="you"]'); await p.waitForTimeout(400);
 const yu=await p.innerText('#ufacts');
 want(nm+': YOU counts, never percents', !/%/.test(yu)&&/Night: all \d+ scenes\./.test(yu), yu);
 want(nm+': who you keep working with: Jo Park on 2 films, never you', /Who you keep working with: Jo Park \(2 films/.test(yu)&&!/working with:[^.]*Sam Actor/.test(yu), yu);
 await p.screenshot({path:SHOTS+'/filmhub_tidy_'+nm+'.png',fullPage:true});
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 for(const tab of ['films','page','people','you']){ await p.click('#tabs [data-t="'+tab+'"]'); await p.waitForTimeout(200);
  if(!(await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)))) want(nm+' '+tab+': no em dashes, no "thing"',false); }
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
