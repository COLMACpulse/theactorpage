/* THEACTORPAGES GO in a browser, phone size. Type, paste, say (a stand-in speech service), see it every way,
   open the script, send a draft to Paper Trail, freeze, and nothing lost when you close. Made-up words. Server on :8811.
   NODE_PATH=... node write/tests/go_e2e.js */
const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
await c.addInitScript(()=>{ class FakeSR extends EventTarget{ start(){ window.__sr=this; } stop(){ this.dispatchEvent(new Event('end')); if(this.onend) this.onend(); } abort(){ this.stop(); } }; window.webkitSpeechRecognition=FakeSR; window.SpeechRecognition=FakeSR; });
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/write/writers-blockage.html'); await p.evaluate(()=>{ localStorage.removeItem('wb_go_v1'); localStorage.removeItem('theactorpage_inbox_v1'); sessionStorage.clear(); You.set('name','Sam Actor'); }); await p.reload(); await p.waitForTimeout(800);
want('GO-MODE is on the toolbar', !!(await p.$('#btnGo'))&&(await p.innerText('#btnGo')).trim()==='GO-MODE');
await p.click('#btnGo'); await p.waitForTimeout(300);
let m=await p.innerText('#go');
want('GO opens on RAW: no choices, a box, ADD', /Get it down\. No form, no rules\./.test(m)&&!!(await p.$('#gobox'))&&!!(await p.$('#goadd')), m.slice(0,300));
want('SAY IT says where speech goes', /Chrome sends what you say to Google, Safari to Apple\./.test(m));
await p.fill('#gobox','INT. PAWN SHOP - DAY\nCharlie wipes the counter.\nSage says, I need the watch back.\nCHARLIE: It sold.'); await p.click('#goadd'); await p.waitForTimeout(150);
want('ADD: it goes in, word for word, and the box clears', /INT\. PAWN SHOP - DAY\nCharlie wipes the counter\./.test(await p.innerText('#gopage'))&&await p.inputValue('#gobox')==='');
// say it
await p.click('#gosay'); await p.waitForTimeout(100);
want('SAY IT: listening, the bar says so', (await p.innerText('#gosay'))==='STOP'&&/LISTENING/.test(await p.innerText('#hotbar')));
await p.evaluate(()=>{ const r=window.__sr; const ev=new Event('result'); ev.results=[Object.assign([{transcript:'um so she never comes back'}],{isFinal:true})]; r.onresult(ev); });
want('what you say lands in the box', /um so she never comes back/.test(await p.inputValue('#gobox')));
await p.click('#gosay'); await p.click('#goadd'); await p.waitForTimeout(150);
want('it goes in marked "said"', /said/.test(await p.innerText('#gopage'))&&await p.evaluate(()=>window.__go.D().caps[0].entries[1].src)==='dictation');
// paste
await p.evaluate(()=>navigator.clipboard.writeText('hi dana. i saw you are casting low tide'));
await p.click('#gopaste'); await p.click('#goadd'); await p.waitForTimeout(150);
want('PASTE: in, marked pasted', await p.evaluate(()=>window.__go.D().caps[0].entries[2].src)==='paste');
const raw0=await p.evaluate(()=>JSON.stringify(window.__go.D().caps[0].entries));
// views
await p.click('[data-view="clean"]'); m=await p.innerText('#gopage');
want('CLEAN: um gone, capitals, full stops', /So she never comes back\./.test(m)&&/Hi dana\. I saw you are casting low tide\./.test(m)&&!/\bum\b/.test(m), m);
await p.click('[data-view="script"]'); await p.waitForTimeout(100);
const sh=await p.$$eval('#gopage .sh',x=>x.map(y=>y.textContent)), ch=await p.$$eval('#gopage .ch',x=>x.map(y=>y.textContent));
want('SCRIPT: the heading, and who speaks', sh[0]==='INT. PAWN SHOP - DAY'&&ch.join()==='SAGE,CHARLIE', [sh,ch]);
await p.click('[data-view="letter"]'); m=await p.innerText('#gopage');
want('LETTER: Hi, your words, Thanks, your name', /^Hi,/.test(m)&&/Thanks,\nSam Actor/.test(m), m);
want('LETTER: EMAIL IT opens your mail with it', /^mailto:\?subject=/.test(await p.getAttribute('#gomail','href'))&&decodeURIComponent(await p.getAttribute('#gomail','href')).indexOf('Sam Actor')>0);
await p.click('[data-view="deck"]');
want('DECK: slides', await p.$$eval('#gopage .slide',x=>x.length)===3);
want('seeing it every way changed nothing in the raw', await p.evaluate(()=>JSON.stringify(window.__go.D().caps[0].entries))===raw0);
// to Paper Trail
await p.click('[data-view="clean"]'); await p.click('#gotrail'); await p.waitForTimeout(150);
want('KEEP IN PAPER TRAIL: a draft waits for Paper Trail', await p.evaluate(()=>Inbox.pending('papertrail','draft').some(x=>x.data.label==='GO-MODE: Clean'&&/So she never comes back/.test(x.data.text))));
const q=await c.newPage(); await q.goto('http://localhost:8811/papertrail/'); await q.waitForTimeout(1200);
want('Paper Trail takes it in', /INT\. PAWN SHOP/i.test(await q.innerText('body')), (await q.innerText('body')).slice(0,300)); await q.close();
// open as a script
await p.click('[data-view="script"]'); await p.click('#goscript'); await p.waitForTimeout(600);
want('OPEN AS A SCRIPT: GO closes, the editor has it as a new script', !(await p.evaluate(()=>document.getElementById('go').classList.contains('on')))&&await p.evaluate(()=>WB.api.blocks().some(b=>b.type==='Scene Heading'&&/PAWN SHOP/.test(b.text))&&WB.api.blocks().some(b=>b.type==='Character'&&b.text==='SAGE')));
// nothing lost on close
await p.click('#btnGo'); await p.click('[data-view="raw"]'); await p.fill('#gobox','one more thing'); await p.click('#gox'); await p.waitForTimeout(150);
want('CLOSE with words in the box: they go in, not lost', await p.evaluate(()=>window.__go.D().caps[0].entries.slice(-1)[0].text)==='one more thing');
// freeze
await p.click('#btnGo'); await p.click('#gofreeze'); await p.waitForTimeout(150);
want('FREEZE: no box, it says frozen, still every view', !(await p.$('#gobox'))&&/Frozen/.test(await p.innerText('#go'))&&await p.$$eval('[data-view]',x=>x.length)===5);
await p.reload(); await p.waitForTimeout(800); await p.click('#btnGo'); await p.waitForTimeout(200);
want('after a reload: still there, still frozen', /FROZEN/.test(await p.innerText('#go'))&&await p.evaluate(()=>window.__go.D().caps[0].entries.length)===4);
await p.click('#golist'); await p.click('#gonew'); await p.waitForTimeout(150);
want('CAPTURES: a new one, the old one kept', await p.evaluate(()=>window.__go.D().caps.length)===2&&!!(await p.$('#gobox')));
want('no em dashes in GO', !/—/.test(await p.innerText('#go')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
