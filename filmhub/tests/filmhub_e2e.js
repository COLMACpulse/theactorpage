/* FILM HUB end to end, phone size, made-up film (LOW TIDE) and people. Needs a local server on :8811 at the repo root.
   NODE_PATH=... node filmhub/tests/filmhub_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
(async()=>{ const FX=path.join(__dirname,'..','..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
await p.goto('http://localhost:8811/filmhub/index.html'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('filmhub'); }); await p.reload(); await p.waitForTimeout(500);
want('from nothing: it says Story Studio fills it, and you can add a film', /Nothing in Story Studio yet/.test(await p.innerText('#main'))&&!!(await p.$('#addfilm')));
// Story Studio, with work in it (made up)
const text=fs.readFileSync(path.join(FX,'low_tide.fountain'),'utf8');
await p.evaluate(t=>{ const F=window.FilmOS, S=F.scenes(t), s1=S[0], s2=S[1];
 const sc={}; sc[s1.n]={way:'keep',where:'loc1',done:{},cont:{}}; F.shots(s1,'keep','ANNA').forEach(x=>sc[s1.n].done[x.id]=1); sc[s2.n]={way:'compress',where:'',done:{},cont:{}};
 const takes={}; takes[s1.n]=[{id:'t1',name:'A001.mov',use:true,in:2,out:42}];
 localStorage.setItem('film_os_v1',JSON.stringify({cur:'lt',scripts:{lt:{file:'low_tide.fountain',text:t,me:'ANNA',scenes:sc,cut:{target:600,fps:'24',takes},people:{actors:{'MR. DELL':'Ross Okafor'},me:'Sam Actor',crew:'Directed by: Sam Actor\nSound - Jo Park',contacts:'Jo Park 555-0101'}},
   other:{file:'Script',text:'',scenes:{}}}})); },text);
await p.reload(); await p.waitForTimeout(500);
const m=await p.innerText('#main');
want('Making now: the Story Studio film, stage Cutting, counted', /LOW TIDE/.test(m)&&/CUTTING/.test(m)&&/scenes: 2 planned, 1 at a place/.test(m), m);
want('a Story Studio project with no script is left off', (await p.$$('.fc')).length===1);
await p.click('.fc'); await p.waitForTimeout(200);
const d=await p.innerText('#main');
want('open it: where it stands, in counts', /Shots: \d+ of \d+ marked done; 1 scene fully shot\./.test(d)&&/Cut: 0:40 of a 10:00 target\./.test(d)&&/Cast: 2 of \d+ parts named; 2 crew\./.test(d), d);
want('no score anywhere', !/\d+\s*%|score|\/100|ready/i.test(d));
await p.fill('#ff_logline','A harbor cop takes one last call.'); await p.dispatchEvent('#ff_logline','change');
await p.fill('#ff_year','2026'); await p.dispatchEvent('#ff_year','change');
await p.fill('#ff_credit','Written and directed by Sam Actor'); await p.dispatchEvent('#ff_credit','change');
await p.click('#addlk'); await p.fill('[data-lk="0|url"]','https://example.com/lowtide'); await p.dispatchEvent('[data-lk="0|url"]','change');
await p.setInputFiles('#pf',path.join(FX,'made_up_face.jpg')); await p.waitForTimeout(800);
want('a poster, kept on this device', await p.evaluate(()=>{ const i=document.querySelector('img[data-poster]'); return !!(i&&!i.hidden&&i.src.startsWith('blob:')); }));
// open in Story Studio
const href=await p.getAttribute('a[href^="../film/#open="]','href');
want('OPEN IN STORY STUDIO goes to that film', href==='../film/#open=lt', href);
await p.click('#back');
// a film you made before
await p.click('#addfilm'); await p.waitForTimeout(200);
await p.fill('#ff_title','Dry Creek'); await p.dispatchEvent('#ff_title','change'); await p.waitForTimeout(100);
await p.fill('#ff_year','2024'); await p.dispatchEvent('#ff_year','change');
await p.fill('#ff_kind','Short'); await p.dispatchEvent('#ff_kind','change');
await p.fill('#ff_people','Gaffer: Jo Park\nWren Ashby'); await p.dispatchEvent('#ff_people','change');
await p.click('#done'); await p.waitForTimeout(100);
await p.click('#back'); await p.click('#addfilm'); await p.waitForTimeout(100); await p.fill('#ff_title','Hidden One'); await p.dispatchEvent('#ff_title','change'); await p.click('#show'); await p.waitForTimeout(100); await p.click('#back'); await p.waitForTimeout(100);
const list=await p.innerText('#main');
want('Films you\'ve made: Dry Creek (Done), Hidden One off the page', /Dry Creek/.test(list)&&/DONE/.test(list)&&/OFF THE PAGE/.test(list), list);
want('the count up top', /3 films · 1 done/.test(await p.innerText('#count')), await p.innerText('#count'));
// PEOPLE
await p.click('#tabs [data-t="people"]'); await p.waitForTimeout(200);
const pe=await p.innerText('#main');
want('PEOPLE: Jo Park on two films with the job on each, first', /^Jo Park/.test(pe.trim())&&/Sound/.test(pe)&&/Gaffer/.test(pe)&&/Ross Okafor/.test(pe)&&/plays MR\. DELL/.test(pe), pe);
want('PEOPLE: no phone numbers', !/555-0101/.test(pe));
// PAGE
await p.click('#tabs [data-t="page"]'); await p.waitForTimeout(200);
await p.fill('#pbanner','Salt Road Pictures'); await p.dispatchEvent('#pbanner','change');
await p.fill('#pname','Sam Actor'); await p.dispatchEvent('#pname','change');
await p.fill('#pabout','Westerns made on our own land.'); await p.dispatchEvent('#pabout','change');
await p.click('#pprev'); await p.waitForTimeout(800);
want('PREVIEW: the page in a sandboxed frame', await p.evaluate(()=>{ const f=document.querySelector('iframe.pv'); return !!(f&&f.hasAttribute('sandbox')&&/Salt Road Pictures/.test(f.srcdoc)); }));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#psave')]);
const html=fs.readFileSync(await dl.path(),'utf8');
want('SAVE AS A PAGE: named for your banner', dl.suggestedFilename()==='Salt Road Pictures - films.html', dl.suggestedFilename());
want('the page: banner, name, about, both films, poster inside, the link', /<h1>Salt Road Pictures<\/h1>/.test(html)&&/Sam Actor/.test(html)&&/A harbor cop takes one last call/.test(html)&&/Dry Creek/.test(html)&&/data:image\/jpeg;base64/.test(html)&&/href="https:\/\/example.com\/lowtide"/.test(html));
want('the page never has: the hidden film, the script, phone numbers, call times', !/Hidden One/.test(html)&&!/Pier nine|They found the boat/.test(html)&&!/555-0101/.test(html));
// Story Studio opens on that film
await p.evaluate(()=>{ const d=JSON.parse(localStorage.getItem('film_os_v1')); d.cur='other'; localStorage.setItem('film_os_v1',JSON.stringify(d)); });
await p.goto('http://localhost:8811/film/index.html#open=lt'); await p.waitForTimeout(900);
want('Story Studio opened from the hub is on that film, and the link is cleared', await p.evaluate(()=>JSON.parse(localStorage.getItem('film_os_v1')).cur)==='lt'&&await p.evaluate(()=>location.hash)==='');
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
