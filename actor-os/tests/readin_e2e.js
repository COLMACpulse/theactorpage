/* A FRIEND READS IN: from the booth, a link; the friend's page (fake mic, made-up tone) records the other parts and
   sends back one file; the booth brings it in and every line lands, under the friend's name; the pocket run plays
   them. Made-up sides and names. Server on :8811.  NODE_PATH=... node actor-os/tests/readin_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path'); const O=require('../oneread.js');
const SIDES='INT. DINER - NIGHT\n\nWREN ASHBY\nWe close at ten.\n\nHAL BRODY\nThen I have twenty minutes.\n\nWREN ASHBY\nYou have five.\n\nHAL BRODY\nFive is plenty.\n';
const T=fs.mkdtempSync(path.join(os.tmpdir(),'ri-')), WAV=path.join(T,'tone.wav'); { const sr=48000,a=new Float32Array(sr*30); for(let i=0;i<a.length;i++) a[i]=0.2*Math.sin(i/11); fs.writeFileSync(WAV,Buffer.from(O.wav(a,sr))); }
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-audio-capture='+WAV,'--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
// you
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); await c.grantPermissions(['camera','microphone','clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let outside=[]; p.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) outside.push(r.url()); });
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>{ indexedDB.deleteDatabase('actor_os_reader'); localStorage.setItem('actor_os_name','Sam Actor'); }); await p.reload(); await p.waitForTimeout(1200);
await p.evaluate(t=>{ loadSides(t,'dry_creek.txt'); pickMe('WREN ASHBY'); boothReady(); },SIDES); await p.waitForTimeout(600);
const box=await p.innerText('#readInBox');
want('the booth: A FRIEND READS IN, on their own time', /A FRIEND READS IN/.test(box)&&/whenever suits them/.test(box)&&/No call, no set time/.test(box), box);
await p.click('#riAsk'); await p.waitForTimeout(500);
const sheet=await p.innerText('#readInSheet'), link=await p.evaluate(()=>window.__readInLink);
want('the link: to the read page, the scene after the #', /\/read\/#r=[zp]/.test(link)&&link.length<3000, link.slice(0,80));
want('it says who they read and that anyone with the link can read the sides', /They'll read HAL BRODY: 2 lines/.test(sheet)&&/send it only to someone you trust/.test(sheet), sheet);
await p.click('#riCopy'); await p.waitForTimeout(300);
want('COPY THE LINK', /Copied|Selected/.test(await p.innerText('#riSaid')));
// your friend, on another phone
const f=await b.newContext({viewport:{width:390,height:844}}); await f.grantPermissions(['microphone'],{origin:'http://localhost:8811'});
await f.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
const q=await f.newPage(); const ferr=[]; q.on('pageerror',e=>ferr.push(e.message)); let fout=[]; q.on('request',r=>{ if(!/^(http:\/\/localhost:8811\/|data:|blob:)/.test(r.url())) fout.push(r.url()); });
let hashSent=false; q.on('request',r=>{ if(/#r=/.test(r.url())) hashSent=true; });
await q.goto(link); await q.waitForTimeout(900);
let v=await q.innerText('#main');
want('the friend: who asked, the scene, what they read, how it goes', /Sam Actor asked you to read for dry creek/i.test(v)&&/You're reading HAL BRODY: 2 lines/.test(v)&&/They play WREN ASHBY/.test(v)&&/Nothing is uploaded/.test(v)&&/no computer voice/.test(v), v.slice(0,500));
want('your lines are there, faded, as cues', (await q.$$('.ln.cue')).length===2&&/WREN ASHBY \(THEM\)/.test(v));
want('nothing to send yet', await q.$eval('#sendbtn',e=>e.disabled));
await q.fill('#by','Jo Reader');
await q.click('.ln[id="l1"] [data-a="rec"]'); await q.waitForTimeout(300);
want('recording: the line is lit, the bar says RECORDING', /RECORDING/.test(await q.innerText('.prog'))&&/RECORDING/.test(await q.innerText('#hotbar').catch(()=>'')), await q.innerText('#hotbar').catch(()=>'none'));
await q.waitForTimeout(1200); await q.click('[data-a="stop"]'); await q.waitForTimeout(700);
want('stop: recorded, the mic is off', /1 of 2 recorded/.test(await q.innerText('#prog'))&&!(await q.$('#hotbar')), await q.innerText('#prog'));
await q.reload(); await q.waitForTimeout(900);
want('leave and come back: still recorded', /1 of 2 recorded/.test(await q.innerText('#prog'))&&/You can send what you have/.test(await q.innerText('#sendwhy')));
await q.click('.ln[id="l3"] [data-a="rec"]'); await q.waitForTimeout(1300); await q.click('[data-a="stop"]'); await q.waitForTimeout(700);
want('all of them: ready to send', /2 of 2 recorded/.test(await q.innerText('#prog'))&&/Ready to send/.test(await q.innerText('#sendwhy')));
const [dl]=await Promise.all([q.waitForEvent('download'),q.click('#sendbtn')]);
const ZIP=path.join(T,dl.suggestedFilename()); await dl.saveAs(ZIP);
want('SEND IT BACK: one file, named for the scene and the reader, and it says how to send it', /^dry creek read by Jo Reader\.zip$/.test(dl.suggestedFilename())&&/Send that file back to Sam Actor/.test(await q.innerText('#msg')), dl.suggestedFilename());
want('the friend\'s phone sent nothing anywhere, and the scene in the link never left it', fout.length===0&&!hashSent, fout);
// back to you
await p.evaluate(()=>document.getElementById('readInSheet').remove());
await p.setInputFiles('#riFile',ZIP); await p.waitForTimeout(1200);
const list=await p.innerText('#boothList');
want('BRING IN THEIR READ: both lines in, under their name', /Jo Reader read 2 lines and they’re in\./.test(list)&&(list.match(/Jo Reader/g)||[]).length>=3&&/Reader is ready/.test(list), list.slice(0,400));
want('they play: real sound, the length of what they said', await p.evaluate(async()=>{ const all=await ActorReader.all(); const fr=all.filter(x=>x.from==='friend'); return fr.length===2&&fr.every(x=>x.dur>0.5&&x.blob.size>500); }));
await p.click('#pkOpen'); await p.waitForTimeout(500);
want('the pocket run uses them', /2 reader lines, 2 silences for your lines\./.test(await p.innerText('#pkWhat')), await p.innerText('#pkWhat'));
await p.click('[data-pa="close"]');
await p.setInputFiles('#riFile',{name:'junk.zip',mimeType:'application/zip',buffer:Buffer.from('not a zip')}); await p.waitForTimeout(500);
want('the wrong file: says so plainly', /isn’t a read from a friend/.test(await p.innerText('#boothList')));
// a broken link
await q.goto('http://localhost:8811/read/#r=z'+link.split('#r=z')[1].slice(0,12)); await q.waitForTimeout(600);
want('a link cut short: says so, asks for it again', /missing its scene/.test(await q.innerText('#main')));
want('you sent nothing anywhere', outside.length===0, outside);
want('no em dashes', !/—/.test(v+box+sheet));
want('no page errors', !errs.length&&!ferr.length, errs.concat(ferr));
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
