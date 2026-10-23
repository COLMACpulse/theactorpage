/* CHECK THE COPY in the browser, with real reading: a made-up card (4 clips, one 40 MB so it reads in slices, and a
   .DS_Store), a good copy and a bad one (one missing, one cut off, one same size but different inside). Then the fix:
   pick the bad copy again and only those get read. The fingerprints are checked against Node's own SHA-256.
   Nothing leaves the page. Server on :8811. */
const {chromium}=require('playwright'); const crypto=require('crypto'), fs=require('fs'), path=require('path'), os=require('os');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1100,height:900},acceptDownloads:true}); const p=await c.newPage(); const errs=[], out=[];
p.on('pageerror',e=>errs.push(e.message)); p.on('request',r=>{ const u=r.url(); if(!/^http:\/\/localhost:8811\//.test(u)&&!/^(data|blob):/.test(u)) out.push(u); });
await p.goto('http://localhost:8811/footage/'); await p.evaluate(()=>localStorage.clear());
await p.click('#tocheck'); await p.waitForTimeout(500);
want('Footage links to it; its own page', /check\.html$/.test(p.url())&&/CHECK THE COPY/.test(await p.innerText('h1')));
want('it says what it promises: nothing uploaded, nothing erased', /NOTHING IS UPLOADED/.test(await p.innerText('main'))&&/IT NEVER ERASES ANYTHING/.test(await p.innerText('main')));
want('CHECK IT waits for the card and a copy', await p.isDisabled('#p_go'));
/* made-up clips: bytes made here, the same recipe in Node for the expected fingerprints */
const mk=(seed,n)=>{ const a=Buffer.alloc(n); let x=seed>>>0; for(let i=0;i<n;i++){ x=(x*1664525+1013904223)>>>0; a[i]=x>>>24; } return a; };
const sizes={'CLIP/A001C001.mov':[1,1200],'CLIP/A001C002.mov':[2,40*1024*1024+7],'CLIP/A001C003.mov':[3,5000],'CLIP/A001C004.mov':[4,800]};
const sha=k=>crypto.createHash('sha256').update(mk(...sizes[k])).digest('hex');
await p.evaluate((sizes)=>{ const mk=(seed,n)=>{ const a=new Uint8Array(n); let x=seed>>>0; for(let i=0;i<n;i++){ x=(Math.imul(x,1664525)+1013904223)>>>0; a[i]=x>>>24; } return a; };
 const F=(root,k,bytes)=>{ const f=new File([bytes],k.split('/').pop(),{type:'video/quicktime'}); Object.defineProperty(f,'webkitRelativePath',{value:root+'/'+k}); return f; };
 const card=[], good=[], bad=[]; Object.keys(sizes).forEach(k=>{ const by=mk(...sizes[k]); card.push(F('A001',k,by)); good.push(F('A001',k,by));
  if(k==='CLIP/A001C003.mov') return; /* missing on the bad copy */
  if(k==='CLIP/A001C004.mov'){ bad.push(F('A001',k,by.slice(0,500))); return; } /* cut off */
  if(k==='CLIP/A001C002.mov'){ const d=by.slice(); d[30*1024*1024]^=1; bad.push(F('A001',k,d)); return; } /* one bit off, deep inside */
  bad.push(F('A001',k,by)); });
 card.push(F('A001','.DS_Store',new Uint8Array(6))); good.push(F('A001','.DS_Store',new Uint8Array(9)));
 window.__files={card,good,bad};
 __copy.take('card',card); __copy.take(0,good,'SHUTTLE_A'); __copy.take(1,bad,'BACKUP_B'); },sizes);
await p.waitForTimeout(300);
want('the card: 4 files, the .DS_Store left out', /4 files/.test(await p.innerText('.slots')));
await p.fill('#p_label','Day 2 · Harbor Lights short');
await p.click('#p_go');
await p.waitForSelector('.verdict',{timeout:60000}); await p.waitForTimeout(300);
const t=await p.innerText('main');
want('not safe: says which copy and how many', /Don't erase the card yet\./.test(t)&&/SHUTTLE_A: every file matches\./.test(t)&&/BACKUP_B: 3 files don't match\./.test(t), t.slice(0,600));
want('each one, in plain words: not there, cut off, same size different inside', /A001C003\.mov\s+[\d.]+ \w+\s+not there/.test(t)&&/A001C004\.mov[\s\S]*?cut off/.test(t)&&/A001C002\.mov[\s\S]*?same size, different inside/.test(t), t);
want('what to do: copy those again, pick the drive again; a hint about a bad drive', /Copy those 3 files from the card to BACKUP_B again/.test(t)&&/use another drive/.test(t)&&!!(await p.$('#r_c1')));
const fp=await p.evaluate(()=>__copy.S.fp);
want('the fingerprints are real: the same as Node\'s SHA-256, the 40 MB one read in slices', Object.keys(sizes).every(k=>fp[k]===sha(k)), [fp['CLIP/A001C002.mov'],sha('CLIP/A001C002.mov')]);
const h=await p.evaluate(()=>CopyCheck.history());
want('your checks: the summary kept, not safe', h.length===1&&h[0].card==='A001'&&h[0].safe===false&&h[0].label==='Day 2 · Harbor Lights short');
/* the fix: copy again (the good bytes), pick BACKUP_B again: only those 3 get read */
await p.evaluate(()=>{ window.__reads=0; const W=window.Worker; window.Worker=function(u){ const w=new W(u), pm=w.postMessage.bind(w); w.postMessage=m=>{ window.__reads++; pm(m); }; return w; }; });
await p.evaluate(()=>{ const inp=document.getElementById('r_c1'); const dt=new DataTransfer(); __files.good.forEach(f=>dt.items.add(f)); inp.files=dt.files; inp.dispatchEvent(new Event('change')); });
await p.waitForFunction(()=>/Every file matches/.test(document.querySelector('.verdict')&&document.querySelector('.verdict').innerText||''),null,{timeout:60000});
const t2=await p.innerText('main');
want('picked again, checked again: every file matches, on both copies. Safe to erase', /Every file matches, on both copies\./.test(t2)&&/Safe to erase the card\./.test(t2), t2.slice(0,300));
want('the second time, only the 3 were read (the card\'s fingerprints kept)', await p.evaluate(()=>window.__reads)<=3, await p.evaluate(()=>window.__reads));
want('it says erase it in the camera, and that it never erases anything', /Erase it in the camera/.test(t2)&&/never erases anything/.test(t2));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#r_rec')]); const rf=path.join(os.tmpdir(),'cc_receipt.txt'); await dl.saveAs(rf); const rec=fs.readFileSync(rf,'utf8');
want('the receipt: a text file, the card, both copies, every fingerprint', /^copy-check-A001-\d{4}-\d\d-\d\d\.txt$/.test(dl.suggestedFilename())&&/^COPY CHECK · A001\nDay 2 · Harbor Lights short/.test(rec)&&/SHUTTLE_A: 4 of 4 match/.test(rec)&&/BACKUP_B: 4 of 4 match/.test(rec)&&rec.includes(sha('CLIP/A001C002.mov')+'  CLIP/A001C002.mov'), rec.slice(0,400));
want('your checks: both runs kept', (await p.evaluate(()=>CopyCheck.history())).length===2);
/* one copy only, and STOP */
await p.click('#r_new'); await p.waitForTimeout(200);
await p.evaluate(()=>{ __copy.take('card',__files.card); __copy.take(0,__files.good,'SHUTTLE_A'); }); await p.click('#p_go');
await p.waitForSelector('.verdict',{timeout:60000});
want('one copy: matches, and it says that\'s one copy', /Every file matches on SHUTTLE_A\./.test(await p.innerText('.verdict'))&&/That's one copy/.test(await p.innerText('.verdict')));
await p.click('#r_new'); await p.evaluate(()=>{ __copy.take('card',__files.card); __copy.take(0,__files.good,'SHUTTLE_A'); }); await p.click('#p_go'); await p.waitForTimeout(30); await p.click('#c_stop').catch(()=>{});
await p.waitForSelector('.verdict',{timeout:20000}); const t3=await p.innerText('main');
want('STOP: not finished, never safe, CHECK THE REST', /Not finished\.|Every file matches/.test(t3)&&(/Every file matches/.test(t3)||!!(await p.$('#r_more'))), t3.slice(0,200));
await p.screenshot({path:path.join(os.tmpdir(),'cc_page.png'),fullPage:true});
want('nothing goes anywhere: no request leaves this site', out.length===0, out);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
