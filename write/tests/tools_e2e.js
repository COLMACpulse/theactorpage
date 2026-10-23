/* THEACTORPAGES · TOOLS in the app: a made-up script open; each tool reads it, GO takes you to the spot, nothing
   in the script changes; HEAR IT queues a voice per character (the speech service is a stand-in here).
   Server on :8811.  NODE_PATH=... node write/tests/tools_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900}});
await c.addInitScript(()=>{ window.__said=[]; const S={ speaking:false, getVoices:()=>[{name:'Ann',lang:'en-US'},{name:'Bo',lang:'en-GB'}], cancel(){ window.__cancel=(window.__cancel||0)+1; },
  speak(u){ window.__said.push({text:u.text,voice:u.voice&&u.voice.name,pitch:u.pitch}); setTimeout(()=>{ u.onstart&&u.onstart(); u.onend&&u.onend(); },5); } };
 Object.defineProperty(window,'speechSynthesis',{value:S,configurable:true}); window.SpeechSynthesisUtterance=function(t){ this.text=t; }; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>{ Object.keys(localStorage).filter(k=>/^wb|writers-blockage/.test(k)).forEach(k=>localStorage.removeItem(k)); }); await p.reload(); await p.waitForTimeout(800);
const SCRIPT="INT. DINER - NIGHT\n\nRain on the glass. Suddenly the lights flicker.\n\nDANA PELL\nWe're closed. Go home now.\n\nROSS\n(wet)\nDoor was open.\n\nEXT. MAES HOUSE - DAY\n\nSuddenly a crash. Suddenly a scream.\n\nDANA PEL\nHi.\n\n.THE ROOF\n\nSuddenly she runs. Suddenly she stops.\n\nINT. MAE'S HOUSE - NIGHT\n\nSuddenly, silence.\n\nJOHN\nYes.\n";
await p.evaluate(t=>WB.openText(t,'salt_road.fountain'),SCRIPT); await p.waitForTimeout(600);
await p.evaluate(()=>{ const B=WB.api.blocks(), hi=B.find(b=>b.type==='Dialogue'&&/^Hi\.?$/.test(b.text)); WB.api.insertAfter(hi.id,[{type:'Character',text:'JON'}]); }); await p.waitForTimeout(300);
const before=await p.evaluate(()=>JSON.stringify(WB.api.blocks()));
want('a Tools tab in the rail, next to Outline, Cast, Stats, Ideas', await p.$$eval('#railtabs button',x=>x.map(y=>y.textContent).join()).then(t=>/Outline,Cast,Stats,Ideas.*Tools/.test(t)));
await p.click('#railtabs [data-pane="panel:tools"]'); await p.waitForTimeout(400);
const pane='[id="pane-panel:tools"]';
want('six tools', (await p.$$eval(pane+' [data-wt]',x=>x.map(y=>y.textContent))).join()==='Who talks,Repeats,Name drift,Format,Today,Hear it');
// who talks: put the cursor in scene 1
await p.evaluate(()=>{ const B=WB.api.blocks(); WB.api.goTo(B.find(b=>b.type==='Dialogue').id); }); await p.click(pane+' [data-wt="talk"]'); await p.waitForTimeout(200);
let t=await p.innerText(pane);
want('who talks, this scene: DANA PELL and ROSS by share', /INT\. DINER - NIGHT/.test(t)&&/DANA PELL\s*63% · 1 speech, 5 words/.test(t)&&/ROSS\s*38% · 1 speech, 3 words/.test(t), t.slice(0,400));
await p.click(pane+' [data-scope="all"]'); await p.waitForTimeout(150);
want('whole script: everyone who speaks', /DANA PEL\b/.test(await p.innerText(pane))&&/JOHN/.test(await p.innerText(pane)));
// repeats
await p.click(pane+' [data-wt="rep"]'); await p.waitForTimeout(200); t=await p.innerText(pane);
want('repeats: "suddenly", with where it bunches', /suddenly\s*6 times, 5 in scenes 1 to 3/i.test(t), t.slice(0,500));
// drift
await p.click(pane+' [data-wt="drift"]'); await p.waitForTimeout(200); t=await p.innerText(pane);
want('name drift: DANA PELL / DANA PEL, JON / JOHN, MAES / MAE\'S HOUSE, you decide', /DANA PELL\s*1×\s*·\s*DANA PEL\s*1×/.test(t)&&/JON/.test(t)&&/JOHN/.test(t)&&/MAE.S HOUSE/.test(t)&&/you decide/.test(t), t.slice(0,700));
// format, and GO
await p.click(pane+' [data-wt="fmt"]'); await p.waitForTimeout(200); t=await p.innerText(pane);
want('format: the name with no line, the heading without INT./EXT.', /A name with no line under it/.test(t)&&/A scene heading without INT\. or EXT\./.test(t), t.slice(0,800));
const target=await p.$eval(pane+' .wt-li [data-go]',x=>x.dataset.go); await p.click(pane+' .wt-li [data-go]'); await p.waitForTimeout(250);
want('GO: the cursor goes to that line', (await p.evaluate(()=>WB.api.activeId()))===target);
// today
await p.click(pane+' [data-wt="today"]'); await p.waitForTimeout(200);
want('today: counts from when the script opened (the JON line the test added is +1)', /Today: \+1 word, 0 pages\./.test(await p.innerText(pane)), await p.innerText(pane));
await p.evaluate(()=>{ const B=WB.api.blocks(); WB.api.insertAfter(B[B.length-1].id,[{type:'Action',text:'Ross leaves. The door swings shut behind him and the rain comes in.'}]); }); await p.waitForTimeout(500);
await p.click(pane+' [data-wt="talk"]'); await p.click(pane+' [data-wt="today"]'); await p.waitForTimeout(200);
want('today: counts what you add, this sitting too', /Today: \+14 words/.test(await p.innerText(pane))&&/This sitting: \+14 words/.test(await p.innerText(pane)), await p.innerText(pane));
// hear it
await p.evaluate(()=>{ const B=WB.api.blocks(); WB.api.goTo(B.find(b=>b.type==='Dialogue').id); }); await p.click(pane+' [data-wt="hear"]'); await p.waitForTimeout(200);
await p.click(pane+' [data-hear]'); await p.waitForTimeout(300);
const said=await p.evaluate(()=>window.__said);
want('hear it: the scene\'s speeches, a voice each, no (wet)', said.length===2&&said[0].text==="We're closed. Go home now."&&!/wet/.test(said[1].text)&&said[0].voice!==said[1].voice, said);
await p.check('#wtact'); await p.evaluate(()=>{ window.__said=[]; }); await p.click(pane+' [data-hear]'); await p.waitForTimeout(300);
want('hear it with the action too', (await p.evaluate(()=>window.__said.length))===3);
want('nothing in the script changed (but the line we typed)', (await p.evaluate(()=>WB.api.blocks().length))===JSON.parse(before).length+1);
want('no em dashes', !/—/.test(await p.innerText(pane)));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
