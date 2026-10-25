/* CHARACTERS (Col, Oct 25): every character from every tool, in seven places: auditioned for, booked, I can pull off,
   I created, I want to create, I explored in writing, voice over choices. Counts on top, nothing open until you tap.
   The tools fill it (the same name in the same project is one character, across tools); you add places, a note, your
   own characters; you can hide a card, never take off what a tool says. Read only: no tool is changed.
   Computer light, phone dark. Made-up data in every tool (seed.js). Server on :8811.
   NODE_PATH=... node characters/tests/front_e2e.js */
const {chromium}=require('playwright'); const SEED=require('./seed.js');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 await p.goto('http://localhost:8811/characters/'); await p.waitForTimeout(600);
 want(nm+': empty: seven places at zero, and how they fill', (await p.$$('.tile')).length===7&&/Nothing yet/.test(await p.innerText('#view')));
 await p.evaluate(SEED); await p.reload(); await p.waitForTimeout(1300);
 const before=await p.evaluate(()=>{ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k!=='theactorpage_characters_v1') o[k]=localStorage.getItem(k); } return JSON.stringify(o); });
 const cnt=await p.evaluate(()=>Characters.counts(__chars.list()));
 want(nm+': counts from every tool', cnt.aud===3&&cnt.booked===1&&cnt.pull===3&&cnt.made===2&&cnt.want===0&&cnt.wrote===2&&cnt.vo===1, cnt);
 want(nm+': nothing open until you tap', !(await p.$('.cc')));
 await p.screenshot({path:SHOTS+'/chars2_front_'+nm+'.png'});
 await p.click('[data-g="aud"]'); await p.waitForTimeout(200);
 const names=await p.$$eval('.cc .cn',x=>x.map(e=>e.textContent));
 want(nm+': auditioned for: from Project Hub, your sides, Memorizer; YOU from a spoken script left out', names.join()==='DANA PELL,MARLOWE,OFFICER TATE', names);
 const dana=await p.innerText('.cc:has(.cn:text-is("DANA PELL"))');
 want(nm+': one card for one character across tools, with the trail', /Salt Road/.test(dana)&&/Callback/.test(dana)&&/Booked/.test(dana)&&/Project Hub/.test(dana)&&/Your sides/.test(dana)&&/Actor OS · 3 takes/.test(dana), dana);
 want(nm+': a file name reads as a title', /Night Desk/.test(await p.innerText('.cc:has(.cn:text-is("OFFICER TATE"))')));
 await p.click('[data-g="pull"]'); await p.waitForTimeout(150);
 want(nm+': I can pull off: what you can play, your looks, the role you want', (await p.$$eval('.cc .cn',x=>x.map(e=>e.textContent))).sort().join()==='SMALL-TOWN COP,THE MARSHAL,TIRED YOUNG DAD');
 await p.click('[data-g="made"]'); await p.waitForTimeout(150);
 want(nm+': I created: Character Bank and Set List; you are left out', (await p.$$eval('.cc .cn',x=>x.map(e=>e.textContent))).sort().join()==='GRAVEL GUS,UNCLE RAY');
 await p.click('[data-g="wrote"]'); await p.waitForTimeout(150);
 want(nm+': explored in writing: the characters in your script', (await p.$$eval('.cc .cn',x=>x.map(e=>e.textContent))).sort().join()==='JUNE,PETE');
 await p.click('[data-g="vo"]'); await p.waitForTimeout(150);
 want(nm+': voice over choices: the voice in Character Bank', (await p.$$eval('.cc .cn',x=>x.map(e=>e.textContent))).join()==='GRAVEL GUS');
 // a character
 await p.click('[data-g="aud"]'); await p.click('.cc:has(.cn:text-is("DANA PELL"))'); await p.waitForTimeout(200);
 want(nm+': what the tools say is on, and can\'t be taken off', await p.$$eval('.gchip.tool',x=>x.map(e=>e.textContent.replace('from your tools','').trim()).join())==='Auditioned for,Booked');
 want(nm+': where it came from, each a link to the tool', (await p.$$eval('.srclist a',x=>x.map(a=>a.getAttribute('href')))).join()==='../hub/,../actor-os/,../actor-os/');
 await p.click('[data-tg="pull"]'); await p.waitForTimeout(200);
 await p.fill('#note','Bring the apron.'); await p.waitForTimeout(600);
 want(nm+': you add a place: I can pull off', (await p.getAttribute('[data-tg="pull"]','aria-pressed'))==='true');
 await p.screenshot({path:SHOTS+'/chars2_one_'+nm+'.png',fullPage:true});
 await p.click('#back'); await p.click('[data-g="pull"]'); await p.waitForTimeout(150);
 want(nm+': and she is there, with your note', /DANA PELL/.test(await p.innerText('.grid'))&&/Bring the apron/.test(await p.innerText('.grid')));
 // add your own
 await p.click('[data-g="want"]'); await p.click('#add'); await p.fill('#anm','Willa Kane'); await p.click('#ago'); await p.waitForTimeout(300);
 want(nm+': + ADD ONE: a character you want to create', (await p.$$eval('.cc .cn',x=>x.map(e=>e.textContent))).join()==='WILLA KANE'&&(await p.getAttribute('[data-g="want"]','aria-pressed'))==='true');
 // hide
 await p.click('.cc'); await p.click('#hide'); await p.waitForTimeout(300);
 want(nm+': hide a card: off the count, one tap to show', (await p.evaluate(()=>Characters.counts(__chars.list()).want))===0);
 await p.reload(); await p.waitForTimeout(1200);
 const after=await p.evaluate(()=>{ const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k!=='theactorpage_characters_v1') o[k]=localStorage.getItem(k); } return JSON.stringify(o); });
 want(nm+': read only: no other tool was changed', before===after);
 want(nm+': kept after reopening', (await p.evaluate(()=>{ const m=Characters.mine(); return m.added.length===1&&!!m.notes['DANA PELL|SALT ROAD']&&m.extra['DANA PELL|SALT ROAD'].includes('pull'); })));
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing", no scores', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)&&!/%/.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
