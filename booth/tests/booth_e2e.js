const {chromium}=require('playwright'); const fs=require('fs');
/* VO BOOTH end to end, on made-up copy and a made-up voice (tone bursts in a quiet room).
   Needs a local server on :8811 at the repo root and Playwright's Chromium.
   NODE_PATH=... node booth/tests/booth_e2e.js */
const path=require('path'), os=require('os');
(async()=>{const T=fs.mkdtempSync(path.join(os.tmpdir(),'booth-')), R=path.join(__dirname,'..','..','shared','fixtures')+'/';
 const A=require('../../shared/voaudio.js'), SR=48000; let seed=3; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff*2-1; };
 const n=Math.round(1.6*SR), one=new Float32Array(n); for(let i=0;i<n;i++){ const t=i/SR, on=t>0.3&&t<1.3; one[i]=0.0007*rnd()+(on?0.12*(Math.sin(2*Math.PI*190*t)+0.5*Math.sin(2*Math.PI*380*t)+0.3*Math.sin(2*Math.PI*760*t))*Math.min(1,(t-0.3)*20,(1.3-t)*20):0); }
 const all=new Float32Array(n*20); for(let k=0;k<20;k++) all.set(one,k*n); fs.writeFileSync(T+'/fakevoice.wav',A.wav(all,SR));
 const N=T;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-file-for-fake-audio-capture='+T+'/fakevoice.wav','--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); await ctx.grantPermissions(['microphone'],{origin:'http://localhost:8811'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/booth/index.html');
const allow=async()=>{ if(await p.isVisible('#hotsheet button.p').catch(()=>false)) await p.click('#hotsheet button.p'); };
// COPY
await p.setInputFiles('#files',[R+'dry_creek_vo_copy.txt',R+'salt_flats_vo_copy.pdf']); await p.waitForTimeout(800);
await p.fill('#paste','This is due Friday 10/23, 10am\nNorthgate Coffee - please read all 3 scripts on one MP3 (Salt Flats, Morning Ride, Last Call - in that order)'); await p.click('#pastego'); await p.waitForTimeout(300);
console.log('COPY:', (await p.innerText('#main')).replace(/\n+/g,' | ').slice(0,700));
// ROOM
await p.click('[data-t=room]'); await p.click('#roomgo'); await p.waitForTimeout(400); await allow();
await p.waitForSelector('.msg',{timeout:15000}); console.log('ROOM:', await p.innerText('.msg'), '| hot:', await p.evaluate(()=>window.Hot&&Hot.status().state));
// READ: every line of yours, one take each (two on the first)
await p.click('[data-t=read]'); await p.waitForTimeout(200);
const keys=await p.evaluate(()=>[...document.querySelectorAll('[data-rec]')].map(b=>b.dataset.rec));
console.log('lines to read:',keys.length);
for(let i=0;i<keys.length;i++){ const sel='[data-rec="'+keys[i].replace(/"/g,'\\"')+'"]';
 await p.click(sel); await allow(); await p.waitForTimeout(i===0?400:1700);
 if(i===0){ console.log('while recording, hot:', await p.evaluate(()=>Hot.status().state), await p.isVisible('#hotbar')); }
 await p.click(sel); await p.waitForFunction(k=>{ const s=window.__booth.S; return (s.takes[k]||[]).length>0; },keys[i],{timeout:8000}).catch(()=>console.log('no take for',keys[i]));
}
const st=await p.evaluate(()=>{ const s=window.__booth.S; return Object.values(s.takes).map(L=>L.map(t=>t.secs)); });
console.log('takes secs:', JSON.stringify(st));
console.log('READ times:', await p.evaluate(()=>[...document.querySelectorAll('.time')].map(x=>x.textContent)));
// SEND
await p.click('[data-t=send]'); await p.fill('#nm','Sam Actor'); await p.click('#makego');
await p.waitForFunction(()=>!/Making it/.test(document.getElementById('made').textContent),null,{timeout:60000}); console.log('MADE RAW:', await p.innerText('#made'));
console.log('MADE:', (await p.innerText('#made')).replace(/\n+/g,' | '));
const href=await p.getAttribute('#made a[download]','href'), fn=await p.getAttribute('#made a[download]','download');
const bytes=await p.evaluate(async h=>{ const r=await fetch(h); const a=new Uint8Array(await r.arrayBuffer()); return Array.from(a); },href);
fs.writeFileSync(T+'/out.mp3',Buffer.from(bytes)); console.log('file name:',fn,'bytes',bytes.length);
console.log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth));
// order check: the plan
console.log('order:', await p.evaluate(()=>{ const J=__booth.job(); return J.spots.map(s=>s.title).join(' > '); }));
// an independent reader on the file
 let ok=true; const want=(n,c)=>{ console.log((c?'PASS ':'FAIL ')+n); if(!c) ok=false; };
 try{ const j=JSON.parse(require('child_process').execSync('ffprobe -v error -show_entries stream=codec_name,sample_rate,channels:format=duration -of json "'+T+'/out.mp3"').toString());
  want('the file: MP3, mono, 44.1 kHz', j.streams[0].codec_name==='mp3'&&+j.streams[0].channels===1&&+j.streams[0].sample_rate===44100); }catch(e){ console.log('(no ffprobe here)'); }
 want('named the way casting reads it', fn==='Northgate Coffee - Sam Actor.mp3');
 want('in the order the note asked', (await p.evaluate(()=>__booth.job().spots.map(s=>s.title).join('|')))==='Salt Flats|Morning Ride|LAST CALL');
 want('every line of yours has a take', st.length===11&&st.every(L=>L.length===1));
 want('no page errors', !errs.length);
 want('no sideways scroll at phone width', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
 /* where it's going, and on the record in the Project Hub */
 want('where it\'s going: every site, with its own words', /Casting Networks/.test(await p.innerText('#main'))&&/Voice123/.test(await p.innerText('#main')));
 await p.click('[data-opt="fmt|wav"]'); await p.click('[data-opt="dest|CASTING_NETWORKS"]'); await p.waitForTimeout(200);
 want('a site that takes MP3 only switches WAV to MP3, and says its limit', (await p.evaluate(()=>__booth.S.opts.fmt))==='mp3'&&/Up to 50 MB/.test(await p.innerText('#main')));
 await p.click('#makego'); await p.waitForFunction(()=>/fits Casting Networks/.test(document.getElementById('made').textContent),null,{timeout:60000}).catch(()=>{});
 want('the made file is checked against the site: it fits', /MB: fits Casting Networks/.test(await p.innerText('#made')));
 const sh=await p.evaluate(()=>Takes.all('selftape').map(x=>({k:x.kind,from:x.for.from,title:x.for.title,role:x.for.role,taken:Object.keys(x.taken||{}).join()})));
 want('the file goes to the Hub, as this job\'s tape (never into the self-tape studio)', sh.length>=1&&sh.every(x=>x.k==='audio'&&x.from==='booth'&&x.title==='Northgate Coffee'&&x.role==='Voice over'&&x.taken==='actor-os'), sh);
 want('the job goes to the Hub on its own list, not as a self-tape request', (await p.evaluate(()=>Inbox.all('vojob').length))===1&&(await p.evaluate(()=>Inbox.all('request').length))===0);
 const h=await ctx.newPage(); h.on('pageerror',e=>errs.push('H '+e.message)); await h.goto('http://localhost:8811/hub/'); await h.waitForTimeout(2500);
 const pj=await h.evaluate(()=>{ const x=projects.find(p=>p.title==='Northgate Coffee'); return x?{role:x.role,type:x.type,due:x.deadline,dirs:x.request.directions,line:tapeLine(x)}:null; });
 want('the Hub has the job: Voice over, the due date, the note\'s asks as the checklist', pj&&pj.role==='Voice over'&&pj.type==='Voice over'&&/2026-10-23/.test(pj.due)&&pj.dirs.some(d=>/one file/i.test(d))&&pj.dirs.some(d=>/In this order: Salt Flats/.test(d)), pj);
 want('the file is kept with it, from VO BOOTH, in the Audition vault; made twice, kept once', pj&&/from VO BOOTH/.test(pj.line)&&(await h.evaluate(()=>ARTS.filter(a=>a.category==='audition_vid'&&/^audio\//.test(a.type)).length))===1);
 want('the hand-over copy is gone once the Hub has it', (await h.evaluate(()=>Takes.all('selftape').length))===0);
 await h.close();
 await p.click('[data-t=copy]'); want('the mic goes off when you leave READ and SEND', !(await p.evaluate(()=>window.Hot&&Hot.status().camera||Hot.status().mic)));
 console.log('errors',errs); await b.close(); fs.rmSync(T,{recursive:true,force:true}); process.exit(ok?0:1);})();
