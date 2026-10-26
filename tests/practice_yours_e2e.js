/* PRACTICE FROM YOUR MATERIAL, end to end. Made-up scripts in every place material lives: sides on the shelf,
   THEACTORPAGES, Paper Trail (IndexedDB), Memorizer, Story Studio. Server on :8811.
   NODE_PATH=... node tests/practice_yours_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
const two=(a,b,head,tag)=>head+'\n\n'+[1,2,3,4,5,6].map(i=>(i%2?a:b)+'\n'+tag+' line '+i+'.').join('\n\n')+'\n';
await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await p.waitForTimeout(600);
// nothing yet: the AI prompt, and no "from your material" button
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(400);
want('no material: the AI prompt, plain', /Written by AI, not by me/.test(await p.innerText('.practice-card'))&&!(await p.$('[data-pmode]')));
await p.click('[data-pclose]');
await p.evaluate(([s1,wb,pt,mz,ai])=>{
 Shelf.put({text:s1,file:'Glass Harbor sides.pdf',from:'Actors Access'});
 localStorage.setItem('writers-blockage-index',JSON.stringify([{id:'p1',title:'Low Tide'},{id:'p2',title:'Spare Key'}]));
 localStorage.setItem('wb-proj:p1',JSON.stringify({format:'writers-blockage-screenplay',title:'Low Tide',blocks:wb}));
 localStorage.setItem('wb-proj:p2',JSON.stringify({format:'writers-blockage-screenplay',title:'Spare Key',blocks:[{type:'Action',text:ai}]}));
 localStorage.setItem('paper_trail_v1',JSON.stringify({projects:{pr1:{id:'pr1',title:'Copper Hill'}},drafts:{d1:{id:'d1',project:'pr1',kind:'script',added:1,file:'copper.fountain'}}}));
 localStorage.setItem('memorizer_v1',JSON.stringify({scripts:{m1:{id:'m1',file:'Night Bus.txt',text:mz,me:'IVY'}}}));
 return new Promise(res=>{ const r=indexedDB.open('paper_trail',2); r.onupgradeneeded=()=>{ r.result.createObjectStore('texts'); r.result.createObjectStore('research'); };
  r.onsuccess=()=>{ const t=r.result.transaction('texts','readwrite'); t.objectStore('texts').put(pt,'d1'); t.oncomplete=()=>{ r.result.close(); res(); }; }; });
},[two('MAE','TOBIAS','INT. FERRY - DAY','Harbor'),
  [{type:'Scene Heading',text:'EXT. PIER - DAWN'},...[1,2,3,4,5].flatMap(i=>[{type:'Character',text:i%2?'RAFE':'NELL'},{type:'Dialogue',text:'Tide line '+i+'.'}])],
  two('OWEN','PRIYA','INT. MINE OFFICE - NIGHT','Copper'), two('IVY','SAUL','INT. BUS - NIGHT','Bus'),
  '[[Practice scene: Spare Key. Written by AI as a practice prompt, not from anything real.]]\n\nCASEY\nHi.']);
const src=await p.evaluate(async()=>{ const s=await YourScenes.gather(); const all=await YourScenes.load(); return {s:s.map(x=>x.from+':'+x.title), cuts:all.map(x=>x.src)}; });
want('found in every place: shelf, THEACTORPAGES, Paper Trail, Memorizer', ['Glass Harbor sides','Low Tide','Copper Hill','Night Bus'].every(t=>src.cuts.includes(t)), src);
want('the AI practice scene you rewrote is not "your material"', !src.s.some(x=>/Spare Key/.test(x)), src.s);
await p.reload(); await p.waitForTimeout(600);
await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(600);
let card=await p.innerText('.practice-card');
want('material first: says it\'s a cut, where from, word for word', /Cut from your material: .+\. Word for word, just the stretch where these two talk\. Nothing added, nothing changed\./.test(card)&&!/Written by AI/.test(card), card);
want('says which scene and how long', /, scene 1 · 6 speeches|, scene 1 · 5 speeches/.test(card), card);
const seen=new Set(); for(let i=0;i<12;i++){ seen.add(await p.$eval('.practice-card b',x=>x.textContent)); await p.click('[data-pnext]'); await p.waitForTimeout(60); }
want('ANOTHER ONE moves across your scripts', seen.size>=3, [...seen]);
await p.click('[data-pmode="ai"]'); await p.waitForTimeout(100);
want('RANDOM PROMPT INSTEAD: the AI prompt and its note', /Written by AI, not by me/.test(await p.innerText('.practice-card'))&&!!(await p.$('[data-pmode="yours"]')));
await p.click('[data-pmode="yours"]'); await p.waitForTimeout(100);
want('ONE FROM YOUR MATERIAL: back to a cut', /Cut from your material/.test(await p.innerText('.practice-card')));
// tape a cut from the audition sides as the other part
let t=''; for(let i=0;i<20&&!/Glass Harbor/.test(t);i++){ await p.click('[data-pnext]'); await p.waitForTimeout(60); t=await p.$eval('.practice-card b',x=>x.textContent); }
want('a cut from the audition sides', /Glass Harbor sides, scene 1/.test(t), t);
await p.click('[data-pme="TOBIAS"]'); await p.waitForTimeout(80);
await p.click('[data-pgo="tape"]'); await p.waitForURL(/actor-os/); await p.waitForTimeout(1500);
const st=await p.evaluate(()=>({file:SIDES.file,me:SIDES.me,shelf:Shelf.all().map(x=>x.file),last:localStorage.getItem('actor_os_sides_last')}));
want('TAPE IT: Actor OS has the cut, you as TOBIAS', st.file==='Practice scene - Glass Harbor sides, scene 1'&&st.me==='TOBIAS', st);
want('the shelf still has just your real sides, nothing saved as last sides', st.shelf.join()==='Glass Harbor sides.pdf'&&!st.last, st);
// learn one from THEACTORPAGES in Memorizer
await p.goto('http://localhost:8811/how.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(600);
t=''; for(let i=0;i<20&&!/Low Tide/.test(t);i++){ await p.click('[data-pnext]'); await p.waitForTimeout(60); t=await p.$eval('.practice-card b',x=>x.textContent); }
await p.click('[data-pgo="learn"]'); await p.waitForURL(/memorizer/); await p.waitForTimeout(1500);
const mz=await p.evaluate(()=>{ const D=JSON.parse(localStorage.getItem('memorizer_v1')); return D.scripts[D.cur]; });
want('LEARN: Memorizer has the THEACTORPAGES cut, word for word', mz&&mz.file==='Practice scene - Low Tide, scene 1'&&/EXT\. PIER - DAWN/.test(mz.text)&&/Tide line 5\./.test(mz.text)&&['RAFE','NELL'].includes(mz.me), mz);
// rewrite
await p.goto('http://localhost:8811/how.html'); await p.waitForTimeout(600); await p.click('[data-practice] .spark-btn'); await p.waitForTimeout(600);
await p.click('[data-pgo="write"]'); await p.waitForURL(/writers-blockage/); await p.waitForTimeout(2000);
want('REWRITE: note says it\'s a word-for-word cut from your material', /Word for word from your material/.test(await p.evaluate(()=>document.body.innerText)));
// Actor OS fold sees it too
await p.goto('http://localhost:8811/actor-os/index.html'); await p.waitForTimeout(1200);
await p.evaluate(()=>{ document.getElementById('dailySec').open=true; renderDaily(); }); await p.waitForTimeout(500);
want('Actor OS fold: a cut from your material', /Cut from your material/.test(await p.innerText('#dailyBox')), await p.innerText('#dailyBox'));
want('no em dashes in either note', !/—/.test(card+await p.innerText('#dailyBox')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
