/* An interview and a subtitle file, read as sides: dropped on home (it says what it is), in Actor OS (pick your part,
   run it), in Memorizer. Not a word changed. Made-up people. Server on :8811.  NODE_PATH=... node tests/transcript_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), os=require('os'), path=require('path');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const T=fs.mkdtempSync(path.join(os.tmpdir(),'tr-'));
const IV='Ross Okafor  0:02\nI grew up on boats. My dad fished every day.\n\nJo Park  0:09\nWhat did that teach you?\n\nRoss Okafor  0:14\nThat the water doesn\'t care how you feel.\n\nJo Park  0:20\nAnd acting?\n\nRoss Okafor  0:23\nSame thing, really.\n';
const SRT='1\n00:00:01,000 --> 00:00:03,000\nWhere were you last night?\n\n2\n00:00:03,500 --> 00:00:05,000\nOut.\nAll night.\n';
fs.writeFileSync(path.join(T,'okafor interview.txt'),IV); fs.writeFileSync(path.join(T,'low tide clip.srt'),SRT);
const c=await b.newContext({viewport:{width:1300,height:900}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/index.html'); await p.evaluate(()=>{ localStorage.clear(); }); await p.reload(); await p.waitForTimeout(700);
await p.setInputFiles('#dropfile',path.join(T,'okafor interview.txt')); await p.waitForTimeout(1500);
let m=await p.innerText('#took');
want('home: an interview transcript, read as sides, with its two speaking parts', /an interview transcript/i.test(m)&&/2 speaking parts/.test(m), m.slice(0,400));
await p.setInputFiles('#dropfile',path.join(T,'low tide clip.srt')); await p.waitForTimeout(1500);
m=await p.innerText('#took');
want('home: a subtitle file, read as subtitles', /subtitles/i.test(m), m.slice(0,400));
// Actor OS
const a=await c.newPage(); a.on('pageerror',e=>errs.push(e.message)); a.on('dialog',d=>d.accept());
await a.goto('http://localhost:8811/actor-os/index.html'); await a.waitForTimeout(1000);
const S=await a.evaluate(t=>{ loadSides(t,'okafor interview.txt'); return ActorSides.speakers(ActorSides.parse(t)).map(x=>x.name+':'+x.lines).join(); },IV);
want('Actor OS: the speakers, with their lines', S==='ROSS OKAFOR:3,JO PARK:2', S);
const run=await a.evaluate(()=>{ pickMe('ROSS OKAFOR'); return ActorSides.script(ActorSides.parse(document.__iv||''),'ROSS OKAFOR').length; });
const lines=await a.evaluate(t=>ActorSides.script(ActorSides.parse(t),'ROSS OKAFOR').filter(x=>x.mine).map(x=>x.text),IV);
want('pick Ross: his three lines, word for word, each with its cue', lines.join(' | ')==="I grew up on boats. My dad fished every day. | That the water doesn't care how you feel. | Same thing, really.", lines);
await a.setInputFiles('input[accept*=".srt"]',path.join(T,'low tide clip.srt')); await a.waitForTimeout(1200);
want('Actor OS takes a .srt: asks which part, one SPEAKER; the timings gone', await a.evaluate(()=>{ if(!/Which character are you\?/.test(document.getElementById('sidesOut').innerText)) return false; pickMe('SPEAKER'); const t=activeScript(); return t.length===2&&t.every(x=>x.who==='SPEAKER')&&t[1].text==='Out. All night.'; }), await a.evaluate(()=>activeScript()));
// Memorizer
const q=await c.newPage(); q.on('pageerror',e=>errs.push(e.message)); q.on('dialog',d=>d.accept());
await q.goto('http://localhost:8811/memorizer/'); await q.waitForTimeout(800);
await q.setInputFiles('input[type=file][accept*=".srt"]',path.join(T,'okafor interview.txt')); await q.waitForTimeout(1200);
want('Memorizer: the interview, with Ross and Jo to pick from', /ROSS OKAFOR/.test(await q.innerText('body'))&&/JO PARK/.test(await q.innerText('body')));
want('no page errors', !errs.length, errs);
fs.rmSync(T,{recursive:true,force:true}); await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
