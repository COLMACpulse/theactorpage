/* PAPER TRAIL: PROOF OF DRAFT. The receipt (every draft, the day it came in, its SHA-256), CHECK A FILE (same words,
   or the nearest draft and how far off), proof of everything from Projects. Made-up drafts. Server on :8811.
   NODE_PATH=... node papertrail/tests/proof_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path'), crypto=require('crypto');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const T=fs.mkdtempSync(path.join(os.tmpdir(),'pf-'));
const D1='Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs the ridge.\n\nVALE\nHand me the rope.\n\nINT. CABIN - NIGHT\n\nHale sits by the stove.\n';
const D2=D1.replace('Hand me the rope.','Hand me the rope. Now.')+'\nHALE\nShe isn\'t coming back.\n';
fs.writeFileSync(path.join(T,'Ridge Line - draft 1.fountain'),D1); fs.writeFileSync(path.join(T,'Ridge Line - draft 2.fountain'),D2);
fs.writeFileSync(path.join(T,'ridge spaced.txt'),D1.replace(/\n/g,'\n\n').replace('Vale climbs','Vale   climbs'));
fs.writeFileSync(path.join(T,'ridge edited.txt'),D2.replace('Hale sits by the stove.','Hale sits by the cold stove.'));
const fp=t=>crypto.createHash('sha256').update(t.replace(/\s+/g,' ').trim()).digest('hex');
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/papertrail/'); await p.evaluate(()=>{ localStorage.removeItem('paper_trail_v1'); indexedDB.deleteDatabase('paper_trail'); }); await p.reload(); await p.waitForTimeout(700);
await p.setInputFiles('#file',[path.join(T,'Ridge Line - draft 1.fountain')]); await p.waitForTimeout(500);
await p.setInputFiles('#file',[path.join(T,'Ridge Line - draft 2.fountain')]); await p.waitForTimeout(500);
await p.click('[data-open]'); await p.waitForTimeout(200); await p.click('#tabs [data-tab="drafts"]'); await p.waitForTimeout(200);
let m=await p.innerText('#main');
want('each draft shows its fingerprint, short', m.includes('fingerprint '+fp(D1).slice(0,8)+'…'+fp(D1).slice(-4))&&m.includes('fingerprint '+fp(D2).slice(0,8)), m.slice(0,600));
want('PROOF OF DRAFT says what it proves and what it does not', /It proves the words, not the date\. For the date, email the receipt to yourself or register the script\./.test(m));
await p.click('#proofmk'); await p.waitForTimeout(400);
const r=await p.innerText('#proofout .read');
want('the receipt: both drafts, in order, each with its full SHA-256, matching the words', /^PROOF OF DRAFT\nRidge Line\nMade \d{4}-\d\d-\d\d \d\d:\d\d UTC/.test(r)&&r.indexOf('1. Draft 1 (script) · Ridge Line - draft 1.fountain')>0&&r.indexOf('2. Draft 2')>r.indexOf('1. Draft 1')&&r.includes('SHA-256 '+fp(D1))&&r.includes('SHA-256 '+fp(D2))&&!/no longer give/.test(r), r);
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#psave')]);
want('SAVE AS TEXT: named for the project and the day', /^Ridge Line proof of draft \d{4}-\d\d-\d\d\.txt$/.test(dl.suggestedFilename()), dl.suggestedFilename());
await p.setInputFiles('#proofchk',path.join(T,'Ridge Line - draft 1.fountain')); await p.waitForTimeout(500);
m=await p.innerText('#proofout');
want('CHECK A FILE: the same file, same words as Draft 1, with the day it came in', /Same words as Ridge Line, Draft 1\./.test(m)&&/Word for word\. It came in \d{4}-\d\d-\d\d \d\d:\d\d UTC\./.test(m)&&m.includes(fp(D1)), m);
await p.setInputFiles('#proofchk',path.join(T,'ridge spaced.txt')); await p.waitForTimeout(500);
want('spacing changed only: still the same words', /Same words as Ridge Line, Draft 1\./.test(await p.innerText('#proofout')), await p.innerText('#proofout'));
await p.setInputFiles('#proofchk',path.join(T,'ridge edited.txt')); await p.waitForTimeout(500);
m=await p.innerText('#proofout');
want('one word changed: no exact match; nearest is Draft 2, 1 line changed, 1 cut', /No draft here has these exact words\./.test(m)&&/Nearest in Ridge Line: Draft 2\. This file has 1 line new or changed and 1 cut against it\./.test(m), m);
// a draft whose kept words were changed under it
await p.evaluate(()=>{ const d=Object.values(window.__trail.DB().drafts)[0]; d.hash='0'.repeat(64); });
await p.click('#proofmk'); await p.waitForTimeout(400);
want('a draft that no longer matches its fingerprint is called out', /no longer give the fingerprint this draft came in with/.test(await p.innerText('#proofout .read')));
await p.reload(); await p.waitForTimeout(800);
const [all]=await Promise.all([p.waitForEvent('download'),p.click('#proofall')]);
const txt=fs.readFileSync(await all.path(),'utf8');
want('Projects: proof of every draft, saved as text', /^Paper Trail proof of every draft \d{4}-\d\d-\d\d\.txt$/.test(all.suggestedFilename())&&/^PROOF OF DRAFT\nRidge Line/.test(txt)&&txt.includes(fp(D2)), [all.suggestedFilename(),txt.slice(0,200)]);
want('no em dashes', !/—/.test(txt+await p.innerText('body')));
want('no page errors', !errs.length, errs);
fs.rmSync(T,{recursive:true,force:true}); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
