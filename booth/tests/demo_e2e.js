/* VO BOOTH · DEMO (VOICE DEMO) and the page: a voice from Character Bank and a file into one demo, timed against
   its target, made as one MP3 at one level; a voice put on the page with its picture and take; the Hub page gets a
   VOICE OVER section and a COMMERCIAL section (the look book), each only when made. Made-up voices, tones for sound.
   Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), os=require('os');
(async()=>{ const A=require('../../shared/voaudio.js'), SR=44100;
const tone=(f,secs)=>{ const n=Math.round(secs*SR), x=new Float32Array(n); for(let i=0;i<n;i++){ const t=i/SR, on=t>0.25&&t<secs-0.25; x[i]=on?0.2*Math.sin(2*Math.PI*f*t)*Math.min(1,(t-0.25)*20,(secs-0.25-t)*20):0.0005*Math.sin(i); } return Buffer.from(A.wav(x,SR)); };
const T=fs.mkdtempSync(path.join(os.tmpdir(),'vodemo-')); fs.writeFileSync(T+'/game.wav',tone(220,4)); const RUSK=tone(140,5).toString('base64');
const PIC=fs.readFileSync(path.join(__dirname,'..','..','looks','tests','look_a.jpg')).toString('base64');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
/* a made-up voice in Character Bank */
await p.goto('http://localhost:8811/cps/'); await p.waitForTimeout(800);
await p.evaluate(async([wav,jpg])=>{ const bl=(b64,t)=>new Blob([Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0))],{type:t});
 const db=await new Promise(r=>{ const q=indexedDB.open('cps_v02',1); q.onupgradeneeded=()=>{ q.result.createObjectStore('lib'); q.result.createObjectStore('media'); }; q.onsuccess=()=>r(q.result); });
 const lib=Object.assign({},CPS.S.lib,{chars:[{id:'me1',name:'Me',me:true,takes:[],looks:[]},{id:'c1',name:'Captain Rusk',project:'',takes:[{id:'t1',kind:'voice',at:Date.now(),type:'audio/wav',name:'Hold the line'}],looks:[{id:'l1',kind:'photo',at:Date.now(),type:'image/jpeg'}],refId:'t1'}]});
 await new Promise(r=>{ const t=db.transaction(['lib','media'],'readwrite'); t.objectStore('lib').put(JSON.parse(JSON.stringify(lib)),'main'); t.objectStore('media').put(bl(wav,'audio/wav'),'t1'); t.objectStore('media').put(bl(jpg,'image/jpeg'),'l1'); t.oncomplete=r; }); db.close();
 localStorage.setItem('theactorpage_you_v1',JSON.stringify({name:'Riley Hart',union:'SAG-AFTRA',rep:'Northgate Talent'})); },[RUSK,PIC]);
await p.evaluate(()=>{ try{ You.set('name','Riley Hart'); }catch(e){} });
/* the DEMO tab */
await p.goto('http://localhost:8811/booth/'); await p.waitForTimeout(600); await p.click('[data-t=demo]'); await p.waitForTimeout(700);
const t0=await p.innerText('#main');
want('DEMO tab: no demos yet, your voices from Character Bank (not you as yourself)', /None yet/.test(t0)&&/Captain Rusk/.test(t0)&&!/\bMe\b/.test(t0), t0.slice(0,300));
await p.click('#dnew'); await p.click('#dgo'); await p.waitForTimeout(200);
want('no name, no demo', /Give it a name first/.test(await p.innerText('#dmsg')));
await p.fill('#dn','Animation'); await p.press('#dn','Enter'); await p.waitForTimeout(500);
want('a new demo: your name for it, no clips, a 1:00 target', (await p.inputValue('#dname'))==='Animation'&&/No clips yet/.test(await p.innerText('#main'))&&/0:00/.test(await p.innerText('#main')));
await p.click('#fromcps'); await p.waitForTimeout(300); await p.click('[data-addcps="c1|t1"]'); await p.waitForTimeout(900);
await p.setInputFiles('#fromfile',T+'/game.wav'); await p.waitForTimeout(900);
const rows=await p.$$eval('.it .w b',x=>x.map(e=>e.textContent));
want('clips in: from your voices and from a file, in order', rows[0]==='Captain Rusk · Hold the line'&&rows[1]==='game', rows);
want('running time: the clips plus the gap, against the target', /0:09/.test(await p.innerText('#main'))&&/S TO SPARE/.test(await p.innerText('#main')), (await p.innerText('#main')).slice(0,400));
await p.click('[data-cdn]'); await p.waitForTimeout(400);
want('move a clip: order changes', (await p.$$eval('.it .w b',x=>x.map(e=>e.textContent)))[0]==='game');
await p.click('[data-ctrim]'); await p.fill('#tin','0.5'); await p.click('[data-tset]'); await p.waitForTimeout(400);
want('trim: the clip runs shorter', await p.evaluate(()=>VODemo.all()[0].clips[0].trimIn)===0.5);
await p.click('#dmake'); await p.waitForFunction(()=>/MADE ·/.test((document.getElementById('dmade')||{}).textContent||''),null,{timeout:30000}).catch(()=>{});
const made=await p.innerText('#dmade');
want("MAKE THE MP3: one file, named, at one level, peaks held, in numbers", /Riley Hart - Animation Demo\.mp3/i.test(made)&&/-16(\.\d)? LUFS/.test(made)&&/MP3 128 kbps, mono, 44\.1 kHz/.test(made)&&/2 clips/.test(made), made);
const bytes=await p.evaluate(async()=>{ const x=VODemo.all()[0]; const bl=await VODemo.blob(x.made.media); const u=new Uint8Array(await bl.arrayBuffer()); return [bl.type,u[0],u[1],u[2],bl.size]; });
want('it is an MP3', bytes[0]==='audio/mpeg'&&((bytes[1]===0x49&&bytes[2]===0x44)||bytes[1]===0xff), bytes);
await p.click('[data-gap="1"]'); await p.waitForTimeout(400);
await p.screenshot({path:path.join(os.tmpdir(),'vodemo_demo.png'),fullPage:true});
want('change the gap after: it says to make it again', /MADE BEFORE YOUR LAST CHANGE/.test(await p.innerText('#dmade')));
await p.click('#dmake'); await p.waitForFunction(()=>/^MADE ·/.test((document.querySelector('#dmade .kicker')||{}).textContent||''),null,{timeout:30000}).catch(()=>{});
/* one voice onto the page */
await p.click('#dback'); await p.waitForTimeout(500); await p.click('[data-voice="c1"]'); await p.waitForTimeout(600);
const vt=await p.innerText('#main');
want('one voice: its picture, its takes, your reference take marked, COME BACK to it in Character Bank', !!(await p.$('[data-look="l1"] img'))&&/Hold the line/.test(vt)&&/your reference take/.test(vt)&&(await p.getAttribute('a[href*="tab=back"]','href'))==='../cps/?c=c1&tab=back');
await p.screenshot({path:path.join(os.tmpdir(),'vodemo_voice.png'),fullPage:true});
await p.fill('#vline','Animation · gruff, kind underneath'); await p.press('#vline','Tab'); await p.check('#von'); await p.waitForTimeout(200);
want('on your page, with the line in your words', await p.evaluate(()=>{ const v=VODemo.voice('c1'); return v.onPage&&v.line==='Animation · gruff, kind underneath'; }));
/* a look for the commercial section */
await p.evaluate(async jpg=>{ const bl=new Blob([Uint8Array.from(atob(jpg),ch=>ch.charCodeAt(0))],{type:'image/jpeg'}); const l=Looks.add('Weekend dad'); const r=await Looks.keep(new File([bl],'a.jpg',{type:'image/jpeg'})); Looks.addPhoto(l.id,r); Looks.set(l.id,{spots:'Trucks, insurance'}); Looks.addSkill(l.id,'Grill flip'); },PIC).catch(()=>{});
const hasLooks=await p.evaluate(()=>!!window.Looks); if(!hasLooks){ const q=await c.newPage(); await q.goto('http://localhost:8811/looks/'); await q.waitForTimeout(400); await q.evaluate(async jpg=>{ const bl=new Blob([Uint8Array.from(atob(jpg),ch=>ch.charCodeAt(0))],{type:'image/jpeg'}); const l=Looks.add('Weekend dad'); const r=await Looks.keep(new File([bl],'a.jpg',{type:'image/jpeg'})); Looks.addPhoto(l.id,r); Looks.set(l.id,{spots:'Trucks, insurance'}); Looks.addSkill(l.id,'Grill flip'); },PIC); await q.close(); }
/* the Hub page */
const h=await c.newPage(); h.on('pageerror',e=>errs.push('H '+e.message)); await h.goto('http://localhost:8811/hub/?tab=package'); await h.waitForTimeout(2500);
const panel=await h.evaluate(()=>document.getElementById('view').innerHTML);
want('the page builder lists them: Voice over (1 demo, 1 voice), Commercial (1 look)', /Voice over and commercial/.test(panel)&&/1 demo · 1 voice/.test(panel)&&/1 look\b/.test(panel));
const site=await h.evaluate(async()=>{ const E=await siteEntries('https://example.com'); const html=new TextDecoder().decode(E.find(e=>e.name==='index.html').data); return {names:E.map(e=>e.name),html}; });
const H=site.html;
{ const SD=path.join(os.tmpdir(),'vodemo_site'); fs.rmSync(SD,{recursive:true,force:true}); const E2=await h.evaluate(async()=>(await siteEntries('https://example.com')).map(e=>({name:e.name,data:Array.from(e.data)})));
  for(const e of E2){ fs.mkdirSync(path.dirname(path.join(SD,e.name)),{recursive:true}); fs.writeFileSync(path.join(SD,e.name),Buffer.from(e.data)); }
  const v=await b.newPage({viewport:{width:960,height:900}}); await v.goto('file://'+SD+'/index.html'); const sec=await v.$('section.vo'); if(sec) await sec.screenshot({path:path.join(os.tmpdir(),'vodemo_page_vo.png')}); const lk=await v.$('section.looks'); if(lk) await lk.screenshot({path:path.join(os.tmpdir(),'vodemo_page_looks.png')}); await v.close(); }
want('the page: a Voice over section with the demo (play and download) and the voice (picture, line, play)', /Voice over/.test(H)&&/class="vdemo"/.test(H)&&/DOWNLOAD THE MP3/.test(H)&&/Captain Rusk/.test(H)&&/gruff, kind underneath/.test(H)&&/Every voice here is Riley Hart/.test(H));
want('gallery and list, with no script needed', /id="vlist"/.test(H)&&/href="#vlist"/.test(H)&&/class="vlist"/.test(H));
want('the files go next to the page: the demo as MP3, the voice take, its picture', site.names.some(n=>/^media\/demo_Animation\.mp3$/.test(n))&&site.names.some(n=>/^media\/voice_Captain_Rusk\./.test(n))&&site.names.some(n=>/^media\/voice_pic_Captain_Rusk\.jpg$/.test(n)), site.names);
want('a Commercial section: the look, its photo, the spots, the skill', /Commercial · looks/.test(H)&&/Weekend dad/.test(H)&&/Trucks, insurance/.test(H)&&/Grill flip/.test(H)&&site.names.some(n=>/^media\/look_Weekend_dad_0\.jpg$/.test(n)));
want('no union or height on it: the facts are off until you switch them on', !/<dl class="dl lkdl">/.test(H));
await h.evaluate(()=>{ madeToggle('voice'); }); const H2=await h.evaluate(async()=>new TextDecoder().decode((await siteEntries('https://example.com')).find(e=>e.name==='index.html').data));
want('tap Voice over off: it leaves the page; Commercial stays', !/class="vdemo"/.test(H2)&&/Commercial · looks/.test(H2));
want('no page errors', errs.length===0, errs);
await b.close(); fs.rmSync(T,{recursive:true,force:true}); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
