/* SEND IT, on the record, for every kind: a tape kept in the self-tape studio lands on its audition in the Project
   Hub (Audition vault, and on the audition's card); the hand-over copy goes once the Hub has it. Older tapes that
   were filed where nothing showed them move into the vault. Made-up show, fake camera. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path');
(async()=>{ const FX=path.join(__dirname,'..','film','tests','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+FX+'/two_tone.y4m','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const ctx=await b.newContext({viewport:{width:900,height:900}}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push('P '+e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/hub/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_takes'); }); await p.reload(); await p.waitForTimeout(1500);
/* the audition, in the Hub */
await p.evaluate(()=>{ const r=HubReq.read('Due: Friday 10/30, 5pm PST'); r.title='Harbor Lights'; r.role='Deckhand'; addRequestFrom(r,true); render(); });
const pid=await p.evaluate(()=>projects.find(x=>x.title==='Harbor Lights').id);
want('the audition is in the Hub', !!pid);
/* tape it and keep it in the self-tape studio */
const a=await ctx.newPage(); a.on('pageerror',e=>errs.push('A '+e.message)); a.on('dialog',d=>d.accept());
await a.goto('http://localhost:8811/actor-os/'); await a.waitForTimeout(900);
await a.evaluate(()=>{ document.getElementById('project').value='Harbor Lights'; document.getElementById('role').value='Deckhand'; state.job=Object.assign(state.job||{},{project:'Harbor Lights',role:'Deckhand'}); localStorage.setItem(KEY,JSON.stringify(state)); startMode('READER'); });
await a.waitForTimeout(1500); await a.evaluate(()=>stageRec()); await a.waitForFunction(()=>sRecOn===true,null,{timeout:8000}); await a.waitForTimeout(1800); await a.evaluate(()=>stageRec());
await a.waitForSelector('#takeReview',{timeout:8000});
const tid=await a.evaluate(()=>state.takes.slice(-1)[0].id);
await a.evaluate(id=>reviewKeep(id),tid); await a.waitForTimeout(1500);
const shelf=await a.evaluate(()=>Takes.all('selftape').map(x=>({from:x.for.from,title:x.for.title,role:x.for.role,taken:Object.keys(x.taken||{})})));
want('KEEP hands the tape to the Hub (and the studio does not take its own tape back)', shelf.length===1&&shelf[0].from==='actor-os'&&shelf[0].title==='Harbor Lights'&&shelf[0].role==='Deckhand'&&shelf[0].taken.join()==='actor-os', shelf);
await a.reload(); await a.waitForTimeout(1800);
want('the studio does not import its own kept tape twice', await a.evaluate(()=>state.takes.filter(t=>t.mode==='HOME').length)===0);
/* an older tape, filed where nothing showed it */
await p.evaluate(async pid=>{ const rec={id:'aold1',scope:pid,category:'take',label:'old take',filename:'old.webm',type:'video/webm',size:1000,added:new Date().toISOString(),blob:new Blob([new Uint8Array(1000)],{type:'video/webm'}),from:'home'}; await DB.put(rec); },pid);
await p.reload(); await p.waitForTimeout(2500);
const v=await p.evaluate(pid=>ARTS.filter(x=>x.category==='audition_vid').map(x=>({p:x.meta&&x.meta.project,from:x.meta&&x.meta.from,take:x.meta&&x.meta.take,tag:x.tag,scope:x.scope})),pid);
want('the Hub files the kept tape in the Audition vault, kept with its audition, take number on it', v.some(x=>x.p===pid&&x.from==='actor-os'&&x.tag==='Deckhand'&&x.take===1&&x.scope==='library'), v);
want('the older tape moves into the vault, still with its audition', v.some(x=>x.p===pid&&x.from==='home'), v);
want('the hand-over copy is gone once the Hub has it', await p.evaluate(()=>Takes.all('selftape').length)===0);
const card=await p.evaluate(pid=>{ const pr=projects.find(x=>x.id===pid); return tapeLine(pr); },pid);
want('the audition shows its tapes: kept with this audition, from the self-tape studio', /kept with this audition/.test(card)&&/from the self-tape studio/.test(card)&&/take 1/.test(card), card.replace(/<[^>]+>/g,' ').slice(0,200));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
