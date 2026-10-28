/* FOOTAGE, your library (Col, Oct 26: "all the user's footage, playable. Here's what I have, here's where it is, here's
   this and this put together"). A folder goes on as a place (video files only, nothing copied); each piece shows where
   its original is; MAKE IT PLAYABLE makes a small copy only when asked and then it plays; a format a browser can't read
   says so; takes from the other tools are in it, playable; PUT TOGETHER groups pieces in order and plays them through;
   FIND and ONLY WHAT PLAYS HERE; TRIM A MOMENT from what plays; it all stays after a reload.
   Made-up folder (footage/tests/fixtures/map/Black SSD) and project (Salt Road). The folder picker Chrome keeps is
   switched off here, so the plain folder pick is what runs. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'); const fs=require('fs');
const DIR=path.join(__dirname,'fixtures','map','Black SSD'), GOOD=path.join(DIR,'SALT ROAD','DAY 2','SALT_ROAD_EP3_SC12_T04.webm'), BAD=path.join(DIR,'misc','C0041.MP4');
const CLIP=fs.readFileSync(GOOD).toString('base64');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp,cs,full] of [['computer',{width:1280,height:900},'light',true],['phone',{width:390,height:844},'dark',false]]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); await c.addInitScript(()=>{ try{ delete window.showDirectoryPicker; window.showDirectoryPicker=undefined; }catch(e){} });
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/footage/'); await p.evaluate(async()=>{ localStorage.clear(); await new Promise(r=>{ const q=indexedDB.deleteDatabase('theactorpage_footage_lib'); q.onsuccess=q.onerror=q.onblocked=r; }); localStorage.setItem('film_os_v1',JSON.stringify({scripts:{a:{title:'Salt Road',text:'x'}},cur:'a'})); }); await p.reload(); await p.waitForTimeout(400);
 let v=await p.innerText('#view');
 want(nm+': empty: says it is your library; add a drive, videos, a place; no chasing', /Nothing in your library yet/i.test(v)&&/ADD A DRIVE OR FOLDER/.test(v)&&/ADD YOUR CLIPS/.test(v)&&/Nothing goes up until you tap UPLOAD/.test(v)&&/NAME A PLACE/.test(v)&&!/ADD A JOB|who to ask/i.test(v), v.slice(0,200));
 want(nm+': the header: Your footage', /Your footage/.test(await p.innerText('header h1')));
 await p.setInputFiles('#adddrive',DIR); await p.waitForTimeout(500); await p.click('#back'); await p.waitForTimeout(300); v=await p.innerText('#view');
 want(nm+': the library: Salt Road with its piece, the other not matched, each saying where the original is', /Salt Road[\s\S]*SALT_ROAD_EP3_SC12_T04\.webm/.test(v)&&/Not matched yet[\s\S]*C0041\.MP4/.test(v)&&(v.match(/ORIGINAL ON BLACK SSD/g)||[]).length===2, v.slice(0,400));
 await p.click('[data-piece$="SALT_ROAD_EP3_SC12_T04.webm"]'); await p.waitForTimeout(300); v=await p.innerText('#view');
 want(nm+': a piece not here yet: where the original is, MAKE IT PLAYABLE', /The original is on Black SSD/.test(v)&&/MAKE IT PLAYABLE/.test(v)&&/SALT ROAD\/DAY 2\/SALT_ROAD_EP3_SC12_T04\.webm/.test(v), v.slice(0,300));
 await p.setInputFiles('#mk_file',GOOD); await p.waitForFunction(()=>/It plays here now/.test(document.getElementById('view').innerText),null,{timeout:30000}).catch(()=>{}); await p.waitForTimeout(600);
 want(nm+': MAKE IT PLAYABLE: a 540p copy, and it plays', /It plays here now/.test(await p.innerText('#view'))&&!!(await p.$('#pv'))&&/small copy on this device/.test(await p.innerText('#view')));
 await p.fill('#lab','Sc. 12, the diner'); await p.dispatchEvent('#lab','change');
 await p.click('#withit'); await p.fill('#newset','Salt Road, start to air'); await p.click('#newsetok'); await p.waitForTimeout(200);
 want(nm+': PUT IT WITH: something new, started', /Started: Salt Road, start to air/.test(await p.innerText('#view'))&&/Salt Road, start to air/.test(await p.innerText('.colB')));
 await p.click('#back'); await p.waitForTimeout(300);
 await p.evaluate(async b64=>{ const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)); await Takes.put(new Blob([u],{type:'video/webm'}),{kind:'video',mime:'video/webm',ext:'webm',name:'Salt Road audition',secs:1.5,for:{type:'selftape',title:'Salt Road'}}); FOOTAGE.render(); },CLIP); await p.waitForTimeout(400);
 v=await p.innerText('#view');
 want(nm+': takes from the other tools are in it, playable, under their project', /Salt Road[\s\S]*Salt Road audition[\s\S]*PLAYS HERE/.test(v)&&/Sc\. 12, the diner/.test(v), v.slice(0,400));
 want(nm+': the library says what it holds', /3 pieces/.test(await p.innerText('.lsum'))&&/2 play here/.test(await p.innerText('.lsum')), await p.innerText('.lsum'));
 if(full){
  await p.click('[data-piece$="C0041.MP4"]'); await p.waitForTimeout(200); await p.setInputFiles('#mk_file',BAD); await p.waitForTimeout(1500);
  want(nm+': a file a browser can\'t read says so, plainly', /A browser can.t play/.test(await p.innerText('#view')));
  await p.click('#back'); await p.waitForTimeout(200);
  want(nm+': and the library shows it', /A BROWSER CAN.T PLAY THIS ONE/.test(await p.innerText('#view')));
  await p.click('[data-piece^="t:"]'); await p.waitForTimeout(400); await p.click('#withit'); await p.check('[data-with]'); await p.waitForTimeout(100); await p.click('#back'); await p.waitForTimeout(200);
  await p.click('.colB [data-set]'); await p.waitForTimeout(300); v=await p.innerText('#view');
  want(nm+': PUT TOGETHER: 2 pieces, in the order you put them', /2 pieces/.test(v)&&v.indexOf('Sc. 12, the diner')<v.indexOf('Salt Road audition'), v.slice(0,300));
  await p.click('[data-mv$="|1"]'); await p.waitForTimeout(200); v=await p.innerText('#view');
  want(nm+': move one: the order changes', v.indexOf('Salt Road audition')<v.indexOf('Sc. 12, the diner'));
  await p.click('#playall'); await p.waitForTimeout(800);
  want(nm+': PLAY IT THROUGH: it plays, one after the other', !!(await p.$('#stage #pv'))&&/1 of 2/.test(await p.innerText('#stage')));
  await p.waitForFunction(()=>/2 of 2|That.s all of it/.test(document.getElementById('stage').innerText),null,{timeout:12000}).catch(()=>{});
  want(nm+': and on to the next', /2 of 2|That.s all of it/.test(await p.innerText('#stage')));
  await p.click('#back'); await p.waitForTimeout(200);
  await p.fill('#find','c0041'); await p.waitForTimeout(300);
  want(nm+': FIND: by a file name', (await p.$$('.tile')).length===1&&/C0041/.test(await p.innerText('.tiles')));
  await p.fill('#find',''); await p.waitForTimeout(200); await p.click('#here'); await p.waitForTimeout(200);
  want(nm+': ONLY WHAT PLAYS HERE', (await p.$$('.tile')).length===2&&!/C0041/.test(await p.innerText('#view')));
  await p.click('#here'); await p.click('[data-piece$="SALT_ROAD_EP3_SC12_T04.webm"]'); await p.waitForTimeout(600); await p.click('#trimit'); await p.waitForTimeout(300);
  want(nm+': TRIM A MOMENT from what plays', /Trim your moment/i.test(await p.innerText('#view'))&&!!(await p.$('#tr_vid')));
  await p.click('#tr_close');
 }
 await p.reload(); await p.waitForTimeout(600); v=await p.innerText('#view');
 want(nm+': after a reload: still there, still plays', /Sc\. 12, the diner/.test(v)&&/Salt Road, start to air/.test(v)&&(v.match(/PLAYS HERE/g)||[]).length>=2);
 want(nm+': a picture on the piece that plays', await p.evaluate(()=>[...document.querySelectorAll('.th.img')].length>=1));
 want(nm+': no sideways scroll, no em dashes', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&!/—/.test(v));
 want(nm+': no page errors', !errs.length, errs); await c.close(); }
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
