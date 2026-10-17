/* MEMORIZER: the front. A MIC tile (say your lines, speech to text) on the first screen with a live
   OFF / LISTENING chip. Off when there are no sides, off when the browser can't hear. Tap: DRILL, listening.
   Speech is a fake (no real speech service). Made-up script (LOW TIDE). Server on :8811.
   NODE_PATH=... node memorizer/tests/tiles_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs');
const SHOT='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/tiles_memorizer.png';
const FAKE=()=>{ class FakeRec extends EventTarget{ constructor(){ super(); this.onend=null; this.onresult=null; this.onerror=null; }
  start(){ this.on=true; }
  stop(){ if(!this.on) return; this.on=false; setTimeout(()=>{ const e=new Event('end'); this.dispatchEvent(e); if(this.onend) this.onend(e); },0); } }
 window.SpeechRecognition=FakeRec; window.webkitSpeechRecognition=FakeRec; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const text=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','low_tide.fountain'),'utf8');
async function open(fake){
 const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
 if(fake) await c.addInitScript(FAKE); else await c.addInitScript(()=>{ delete window.SpeechRecognition; delete window.webkitSpeechRecognition; window.SpeechRecognition=undefined; window.webkitSpeechRecognition=undefined; });
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(500);
 return {c,p,errs};
}
const tiles=p=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.dataset.kit+':'+(t.querySelector('[data-kst]')?t.querySelector('[data-kst]').textContent:'-')+(t.classList.contains('off')?':off':'')));
const tileText=p=>p.evaluate(()=>[...document.querySelectorAll('.kit .kt')].map(t=>t.innerText).join(' | '));
const onTab=(p,t)=>p.evaluate(t=>document.querySelector('#tabs [data-t="'+t+'"]').classList.contains('on'),t);
const atTop=p=>p.evaluate(()=>{ const m=document.getElementById('main'); return !!(m.firstElementChild&&m.firstElementChild.classList.contains('kit')); });

// 1. a new phone: no sides. The tile is there, OFF, and says to bring sides in.
let {c,p,errs}=await open(true);
want('no sides: the first screen is SIDES, the MIC tile on top, OFF, greyed', (await tiles(p)).join()==='say:OFF:off'&&await atTop(p)&&await onTab(p,'sides'), await tiles(p));
let tt=await tileText(p);
want('it says what it does and why it is off', /MIC/.test(tt)&&/Say your lines/.test(tt)&&/Bring in your sides first/.test(tt), tt);
await p.click('[data-kit="say"]'); await p.waitForTimeout(300);
want('tap with no sides: stays on SIDES, says to bring them in, nothing listens', await onTab(p,'sides')&&/Bring in your sides first/.test(await p.innerText('#toast'))&&!(await p.$('#hotbar')));
// bring them in
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:Buffer.from(text)}); await p.waitForTimeout(600);
want('sides in: pick the character, the tile still on top', await atTop(p)&&/Which character/.test(await p.innerText('#main')));
await p.click('text=ANNA'); await p.waitForTimeout(500);
want('DRILL: the MIC tile on top, OFF, ready', (await tiles(p)).join()==='say:OFF'&&await atTop(p)&&await onTab(p,'drill'), await tiles(p));
tt=await tileText(p);
want('ready words: checks your words, says where speech goes', /Say your lines/.test(tt)&&/Checks your words/.test(tt)&&/Chrome sends it to Google, Safari to Apple/.test(tt), tt);
want('nothing on at load', !(await p.$('#hotbar'))&&await p.evaluate(()=>!Hot.status().listening));
await p.screenshot({path:SHOT});
// tap from another tab: straight to DRILL, listening
await p.click('#tabs [data-t="lines"]'); await p.waitForTimeout(200);
want('LINES has the tile too', await atTop(p)&&(await tiles(p)).join()==='say:OFF');
await p.click('[data-kit="say"]'); await p.waitForTimeout(400);
want('tap: to DRILL, SAY IT is on, the chip says LISTENING', await onTab(p,'drill')&&(await tiles(p)).join()==='say:LISTENING'&&/STOP/.test(await p.innerText('#sayBtn')), await tiles(p));
want('the bar says LISTENING', /LISTENING/.test(await p.innerText('#hotbar').catch(()=>'')));
await p.click('[data-kit="say"]'); await p.waitForTimeout(400);
want('tap again: stops, chip back to OFF, bar gone', (await tiles(p)).join()==='say:OFF'&&!(await p.$('#hotbar')), await tiles(p));
// leaving the tab stops listening
await p.click('[data-kit="say"]'); await p.waitForTimeout(300); await p.click('#tabs [data-t="scene"]'); await p.waitForTimeout(400);
want('leave DRILL: listening stops, SCENE shows the tile OFF', await atTop(p)&&(await tiles(p)).join()==='say:OFF'&&!(await p.$('#hotbar')), await tiles(p));
want('no em dashes in the tile', !/—/.test(await tileText(p)));
want('no page errors', !errs.length, errs);
await c.close();

// 2. a browser that can't hear
({c,p,errs}=await open(false));
await p.setInputFiles('#file',{name:'low_tide.fountain',mimeType:'text/plain',buffer:Buffer.from(text)}); await p.waitForTimeout(600);
await p.click('text=ANNA'); await p.waitForTimeout(500);
tt=await tileText(p);
want('no speech here: tile OFF, greyed, says try Chrome or Safari', (await tiles(p)).join()==='say:OFF:off'&&/can't hear you here\. Try Chrome or Safari\./.test(tt), [await tiles(p),tt]);
await p.click('[data-kit="say"]'); await p.waitForTimeout(300);
want('tap: says so, nothing listens', /Try Chrome or Safari/.test(await p.innerText('#toast'))&&!(await p.$('#hotbar')));
want('no em dashes in the tile', !/—/.test(tt));
want('no page errors', !errs.length, errs);
await c.close();
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
