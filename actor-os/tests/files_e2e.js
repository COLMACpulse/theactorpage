/* Actor OS: reader lines from files (a friend's voice memos, or your own), and the four quick voice picks.
   Made-up sides (LOW TIDE) and made-up tone files written to a temp folder. Needs a server on :8811.
   NODE_PATH=... node actor-os/tests/files_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), os=require('os');
function wav(file,secs,hz){ const sr=44100, n=Math.round(sr*secs), b=Buffer.alloc(44+n*2);
 b.write('RIFF',0); b.writeUInt32LE(36+n*2,4); b.write('WAVE',8); b.write('fmt ',12); b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(sr,24); b.writeUInt32LE(sr*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++) b.writeInt16LE(Math.round(0.3*32767*Math.sin(2*Math.PI*hz*i/sr)),44+i*2); fs.writeFileSync(file,b); }
(async()=>{
const T=fs.mkdtempSync(path.join(os.tmpdir(),'aosfiles-'));
wav(path.join(T,'Dell 1.wav'),1.0,150); wav(path.join(T,'Dell 2.wav'),1.5,150); wav(path.join(T,'Dell 10.wav'),2.0,150); wav(path.join(T,'one line.wav'),0.8,200);
fs.writeFileSync(path.join(T,'not audio.wav'),'this is not sound');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--autoplay-policy=no-user-gesture-required']});
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
await p.goto('http://localhost:8811/actor-os/index.html'); await p.evaluate(()=>indexedDB.deleteDatabase('actor_os_reader')); await p.reload(); await p.waitForTimeout(1200);
const sides=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
await p.evaluate(t=>{ loadSides(t,'low_tide.fountain'); if(!SIDES.me) pickMe('ANNA'); boothReady(); },sides); await p.waitForTimeout(600);
const dell=await p.evaluate(()=>activeScript().filter(b=>!b.mine&&b.who==='MR. DELL').map(b=>boothKey(b)));
want('MR. DELL has lines to fill', dell.length>=2, dell.length);
// a character's files at once: in file-name order, 1, 2, 10 (not 1, 10, 2)
const inp=await p.$('label[title^="Bring in MR. DELL"] input');
await inp.setInputFiles([path.join(T,'Dell 10.wav'),path.join(T,'Dell 2.wav'),path.join(T,'Dell 1.wav')]); await p.waitForTimeout(1500);
const got=await p.evaluate(async ks=>{ const out=[]; for(const k of ks){ const a=await ActorReader.takesFor(k); const c=a[a.length-1]; out.push(c?[c.name,Math.round(c.dur*10)/10,c.from]:null); } return out; },dell);
want('FILES: Dell 1, Dell 2, Dell 10 land on his lines in that order', got[0]&&got[0][0]==='Dell 1.wav'&&got[1]&&got[1][0]==='Dell 2.wav'&&(dell.length<3||(got[2]&&got[2][0]==='Dell 10.wav')), got);
want('each kept with its real length, marked as from a file', got[0][1]===1&&got[1][1]===1.5&&got[0][2]==='file', got);
const msg=await p.textContent('#boothMsg');
want('it says how many went in, and what was left over or still to come', /^MR\. DELL: \d+ of \d+ lines? in, in file-name order\./.test(msg), msg);
want('the take shows the file name', /Dell 1/.test(await p.innerText('#boothList')));
// one line from a file
const k2=await p.evaluate(()=>{ const o=activeScript().filter(b=>!b.mine&&b.who!=='MR. DELL'); return o.length?boothKey(o[0]):''; });
if(k2){ const li=await p.$(`input[onchange="boothFileLine('${k2}',this)"]`); await li.setInputFiles(path.join(T,'one line.wav')); await p.waitForTimeout(800);
 want('FILE on one line: just that line', await p.evaluate(async k=>{ const a=await ActorReader.takesFor(k); return a.length===1&&a[0].name==='one line.wav'; },k2)&&/In: one line\.wav\./.test(await p.textContent('#boothMsg'))); }
// a file that is not sound
const li0=await p.$(`input[onchange="boothFileLine('${dell[0]}',this)"]`); await li0.setInputFiles(path.join(T,'not audio.wav')); await p.waitForTimeout(800);
want('a file that won\'t play is turned away, and it says so', /Can.t play not audio\.wav in this browser\./.test(await p.textContent('#boothMsg'))&&await p.evaluate(async k=>(await ActorReader.takesFor(k)).length,dell[0])===1);
// Scene partner plays the file
const plays=await p.evaluate(async k=>{ const a=await ActorReader.takesFor(k); return await new Promise(r=>{ ActorReader.play(a[0].blob,null,{}).then(()=>setTimeout(()=>{ const q=ActorReader.playPos(); ActorReader.stopPlay(); r(q&&Math.round(q.dur*10)/10); },250)); }); },dell[0]);
want('the line plays from the file at its length', plays===1, plays);
// four quick picks
const chips=await p.evaluate(()=>[...document.querySelector('.voicebox .vrow').querySelectorAll('.vq button')].map(y=>y.textContent));
want('four quick picks: AS READ, LOWER, HIGHER, SLOWER', chips.join('|')==='AS READ|LOWER|HIGHER|SLOWER', chips);
await p.evaluate(()=>document.querySelector('.voicebox .vrow').querySelectorAll('.vq button')[3].click()); await p.waitForTimeout(300);
const who=await p.evaluate(()=>document.querySelector('.voicebox .vrow b').textContent);
want('tap SLOWER: that voice is Slower (pitch kept), and the list says so', await p.evaluate(w=>JSON.stringify(vfxFor(w)),who)==='{"pitch":0,"pace":0.85,"tone":""}'&&await p.evaluate(()=>{ const s=document.querySelector('.voicebox .vrow select[aria-label^="Voice"]'); return s.options[s.selectedIndex].text; })==='Slower');
want('the rest are still in the list (Deep, Darker, your own mix)', /Deep/.test(await p.evaluate(()=>document.querySelector('.voicebox .vrow select[aria-label^="Voice"]').innerText)));
want('no page errors', !errs.length, errs);
fs.rmSync(T,{recursive:true,force:true});
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
