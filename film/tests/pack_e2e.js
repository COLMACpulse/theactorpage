/* Story Studio: LOG THE DAY and the EDITOR PACK. The day's clips in shooting order, one at a time: scene, shot, gold,
   a note; each a take. Each take's shot can be changed after. The pack: brief, plan, plan vs got, the edit list, the
   footage link, as one zip. Made-up script (LOW TIDE), made-up clips (color bars). Server on :8811.
   NODE_PATH=... node film/tests/pack_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), os=require('os'), cp=require('child_process');
const T=fs.mkdtempSync(path.join(os.tmpdir(),'day-'));
[['IMG_0201.MOV',2,300],['IMG_0199.MOV',1,100],['IMG_0200.MOV',1.5,200]].forEach(([n,d,t])=>{ const f=path.join(T,n.replace('.MOV','.webm'));
 cp.execSync('ffmpeg -loglevel error -f lavfi -i testsrc=size=160x120:rate=15 -t '+d+' -c:v libvpx -b:v 100k -y "'+f+'"'); const at=new Date(Date.UTC(2026,9,17,20,0,0)+t*1000); fs.utimesSync(f,at,at); });
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/film/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.goto('http://localhost:8811/film/?open=1'); await p.waitForTimeout(700);
const text=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:Buffer.from(text)}); await p.waitForTimeout(800);
// a way for scene 1, so it has a shot list
await p.evaluate(()=>{ const D=window.__film.DB(), c=D.scripts[D.cur]; c.scenes=c.scenes||{}; c.scenes[1]={way:'keep',where:'',done:{},cont:{}}; localStorage.setItem('film_os_v1',JSON.stringify(D)); }); await p.goto('http://localhost:8811/film/?open=1'); await p.waitForTimeout(800);
await p.click('#tabs [data-r="post"]'); await p.waitForTimeout(400);
let m=await p.innerText('#main');
want('CUT: LOG THE DAY, says what it does', /Log the day/i.test(m)&&/line up in the order you shot them/.test(m));
want('EDITOR PACK: says what is in it, the coverage before anything is logged', /Editor pack/i.test(m)&&/the link to the footage/.test(m)&&/^0 of \d+ planned shots have a take\./m.test(await p.innerText('#packcover')), await p.innerText('#packcover'));
await p.setInputFiles('#dayin',fs.readdirSync(T).map(f=>path.join(T,f))); await p.waitForTimeout(800);
want('clip 1 of 3 is the one shot first', /Clip 1 of 3/.test(await p.innerText('#dayov'))&&/IMG_0199/.test(await p.innerText('#dayov')), await p.innerText('#dayov').catch(()=>''));
const shots=await p.$$eval('#daysh option',x=>x.map(o=>o.value));
want('scene 1 shots to pick from, or not on the list', shots[0]===''&&shots.includes('wide')&&shots.length>3, shots);
await p.selectOption('#daysh','wide'); await p.click('[data-daymark="gold"]'); await p.fill('#daynote','the one where he laughs'); await p.click('#daynext'); await p.waitForTimeout(700);
want('clip 2 of 3, the scene kept from the last one', /Clip 2 of 3/.test(await p.innerText('#dayov'))&&/IMG_0200/.test(await p.innerText('#dayov'))&&await p.inputValue('#daysc')==='1');
await p.click('#dayskip'); await p.waitForTimeout(400);
const sh2=await p.$$eval('#daysh option',x=>x.map(o=>o.value)); await p.selectOption('#daysh',sh2[2]); await p.click('[data-daymark="backup"]'); await p.click('#daynext'); await p.waitForTimeout(700);
want('done: 2 logged, 1 skipped, the coverage said', /2 logged, 1 skipped\./.test(await p.innerText('#dayov'))&&/2 of \d+ planned shots have a take\./.test(await p.innerText('#dayov')), await p.innerText('#dayov'));
await p.click('#dayx'); await p.waitForTimeout(500);
const takes=await p.evaluate(()=>{ const D=window.__film.DB(), k=D.scripts[D.cur].cut; return (k.takes[1]||[]).map(t=>({name:t.name,shot:t.shot,mark:t.mark,note:t.note,use:t.use,dur:t.dur})); });
want('scene 1 has the two takes: the gold one on the wide, in the cut; the backup on its shot', takes.length===2&&takes[0].name==='IMG_0199.webm'&&takes[0].shot==='wide'&&takes[0].mark==='gold'&&takes[0].use&&takes[0].note==='the one where he laughs'&&takes[1].mark==='backup'&&takes[1].shot===sh2[2]&&takes[0].dur>0.5, takes);
want('each take shows its shot, and can change it', await p.$$eval('[data-tshot]',x=>x.map(s=>s.value)).then(v=>v[0]==='wide'&&v[1]===sh2[2]));
await p.selectOption('[data-tshot]',''); await p.waitForTimeout(200);
want('changed to not on the list: the coverage follows', /1 of \d+ planned shots have a take\./.test(await p.innerText('#packcover'))&&/1 take is not on a planned shot\./.test(await p.innerText('#packcover')), await p.innerText('#packcover'));
await p.selectOption('[data-tshot]','wide'); await p.waitForTimeout(200);
await p.fill('#packlink','https://example.com/low-tide-footage'); await p.fill('#packnote','Keep the laugh.');
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#packzip')]);
const zip=fs.readFileSync(await dl.path()); const names=[]; let i=0; while(zip.readUInt32LE(i)===0x04034b50){ const n=zip.readUInt16LE(i+26), s=zip.readUInt32LE(i+18); names.push({name:zip.slice(i+30,i+30+n).toString(),data:zip.slice(i+30+n,i+30+n+s).toString()}); i+=30+n+s; }
want('SAVE THE EDITOR PACK: a zip named for the film, six files', /editor pack\.zip$/.test(dl.suggestedFilename())&&names.length===6, [dl.suggestedFilename(),names.map(x=>x.name)]);
const f=k=>(names.find(x=>x.name.endsWith(k))||{}).data||'';
want('the read me: the footage link, what each file is, your note', /The footage: https:\/\/example\.com\/low-tide-footage/.test(f('READ ME.txt'))&&/From me: Keep the laugh\./.test(f('READ ME.txt'))&&/plan vs got\.csv: every planned shot/.test(f('READ ME.txt')));
want('plan vs got: the gold take on the wide with its note; NOT SHOT where nothing is', /^1,1,Wide[^,]*,IMG_0199\.webm,low_tide_Sc1_Sh1_T1,0:0\d(\.\d)?,00:00:00:00,00:00:0\d:\d\d,GOLD,the one where he laughs,/m.test(f('plan vs got.csv'))&&/NOT SHOT/.test(f('plan vs got.csv')), f('plan vs got.csv').slice(0,500));
want('the plan, the brief and the edit list are in it', /^SCENE,HEADING,SHOT #/.test(f('plan.csv'))&&f('editor brief.txt').length>50&&/^TITLE:/.test(f('cut.edl'))&&/IMG_0199/.test(f('cut.edl')), f('cut.edl').slice(0,200));
const [d2]=await Promise.all([p.waitForEvent('download'),p.click('#packgot')]);
want('PLAN VS GOT on its own', /plan vs got\.csv$/.test(d2.suggestedFilename()));
want('no em dashes', !/—/.test(m+f('READ ME.txt')+f('plan vs got.csv')));
want('no page errors', !errs.length, errs);
fs.rmSync(T,{recursive:true,force:true}); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
