/* MEMORIZER with life: the icon at work and the sigil; your scripts and the shelf at the top, one tap each, above
   the drop; a practice scene you didn't open is never kept; your words go down as you say them, gold where the
   line has that word; no sides yet, say your lines and keep them. Fake speech. Made-up sides. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), os=require('os');
const FAKE=()=>{ class FakeRec extends EventTarget{ constructor(){ super(); window.__rec=this; } start(){ this.on=true; }
  stop(){ if(!this.on) return; this.on=false; setTimeout(()=>{ if(this.onend) this.onend(new Event('end')); },0); }
  say(parts){ const res=parts.map(([t,f])=>{ const r=[{transcript:t}]; r.isFinal=!!f; return r; }); if(this.onresult) this.onresult({results:res}); } }
 window.SpeechRecognition=FakeRec; window.webkitSpeechRecognition=FakeRec; };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.addInitScript(FAKE); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(600);
want('the header: the icon at work on the left, the sigil on the right, the sticks', !!(await p.$('header.top svg.hico'))&&(await p.getAttribute('header.top img.hsig','alt'))==='THEACTORPAGE'&&!!(await p.$('.hstk')));
/* no sides: say them */
await p.click('[data-kit="say"]'); await p.waitForTimeout(200);
await p.evaluate(()=>__rec.say([['You came back.',true],['I never',false]])); await p.waitForTimeout(100);
want('no sides: your words go down as you say them', /You came back\.\s*I never/.test(await p.innerText('#sayall')), await p.innerText('#sayall'));
await p.evaluate(()=>__rec.say([['You came back.',true],['I never left the dock.',true]])); await p.evaluate(()=>MEM.sayAll()); await p.waitForTimeout(200);
want('stopped: what you said, to keep as your lines', /WHAT YOU SAID/.test(await p.innerText('.sayall'))&&/KEEP THEM AS MY LINES/.test(await p.innerText('.sayall')));
await p.click('text=KEEP THEM AS MY LINES'); await p.waitForTimeout(400);
want('kept: your two lines, in your words, to drill', await p.evaluate(()=>{ const d=MEM._db(), s=d.scripts[d.cur]; return s&&s.me==='YOU'&&/YOU\nYou came back\.\n\nYOU\nI never left the dock\./.test(s.text)&&MEM._items().length===2; }));
/* the drill: live words */
await p.evaluate(()=>{ MEM.anyway(); }); await p.waitForTimeout(100);
await p.click('#sayBtn'); await p.waitForTimeout(100);
const line=await p.evaluate(()=>{ const it=MEM._items().find(x=>/came back/.test(x.text))||MEM._items()[0]; return it.text; });
await p.evaluate(t=>{ const w=t.split(' '); __rec.say([[w[0]+' went '+w.slice(2).join(' '),false]]); },line); await p.waitForTimeout(100);
const hw=await p.$$eval('#heard .hw',x=>x.map(e=>e.textContent+':'+e.className.replace('hw ','')));
want('drilling: your words as you say them, gold where the line has that word', hw.length>=3&&/:ok$/.test(hw[0])&&/went:off/.test(hw[1]), hw);
await p.click('#sayBtn'); await p.waitForTimeout(300);
/* the shelf and your scripts at the top, one tap; practice scenes gone */
await p.evaluate(()=>{ Shelf.put({text:'JUNE\nCoffee?\n\nCAL\nBlack.\n',file:'Diner_scene.txt',from:'Breakdown',tool:'breakdown'}); Shelf.put({text:'A\nHi.\n\nB\nHey.\n',file:'Practice scene - Bus Stop',from:'Practice',tool:'home'});
 const d=MEM._db(); d.scripts.px={id:'px',file:"Today's scene - Discharge",text:'AL\nHi.\n\nBO\nHey.\n',me:'AL',from:'Practice scene',states:{},verbs:{},added:Date.now()}; localStorage.setItem('memorizer_v1',JSON.stringify(d)); });
const key=await p.evaluate(()=>Object.keys(localStorage).find(k=>/^memorizer/.test(k)));
await p.evaluate(k=>{ const d=MEM._db(); localStorage.setItem(k,JSON.stringify(d)); },key);
await p.reload(); await p.waitForTimeout(800);
const t=await p.innerText('#main');
want('a practice scene you did not open: not in your scripts, not on the shelf', !/Discharge|Bus Stop|Practice scene/i.test(t)&&await p.evaluate(()=>!MEM._db().scripts.px), t.slice(0,400));
const pos=await p.evaluate(()=>{ const q=[...document.querySelectorAll('.quick')].map(e=>e.getBoundingClientRect().top), d=document.getElementById('drop').getBoundingClientRect().top; return {q,d,vh:innerHeight}; });
want('your scripts and the shelf: at the top, above the drop, on the first screen', pos.q.length>=2&&pos.q.every(y=>y<pos.d)&&pos.q[1]<pos.vh, pos);
want('each one a single tap: the row is the button', (await p.$$('.quick button.qrow')).length>=2);
await p.click('.quick button.qrow:has-text("Diner scene")'); await p.waitForTimeout(400);
want('tap the shelf row: it opens (pick your character)', /Which character are you\?/.test(await p.innerText('#main')));
await p.screenshot({path:path.join(os.tmpdir(),'mem_life.png'),fullPage:true});
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
