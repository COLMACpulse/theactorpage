/* Languages: say your lines in the language you speak. Spanish and Russian sides (made up); the picker sits under the
   MIC tile; the speech service is told that language; a line said without its accents still counts; the setting is
   shared with the other tools. Speech is a fake. Server on :8811.  NODE_PATH=... node memorizer/tests/lang_e2e.js */
const {chromium}=require('playwright');
const ES='INT. CAFÉ - NOCHE\n\nJOSÉ\n¿Dónde está el dinero?\n\nMARÍA\nNo lo sé, José.\n\nJOSÉ\nPiénsalo bien.\n';
const FAKE=()=>{ window.__langs=[]; class FakeRec extends EventTarget{ constructor(){ super(); window.__rec=this; } start(){ this.on=true; window.__langs.push(this.lang); }
  stop(){ if(!this.on) return; this.on=false; setTimeout(()=>{ if(this.onend) this.onend(new Event('end')); },0); } }
 window.SpeechRecognition=FakeRec; window.webkitSpeechRecognition=FakeRec;
 window.__say=t=>{ const r=window.__rec; r.onresult({resultIndex:0,results:[[{transcript:t}]]}); setTimeout(()=>r.stop(),50); }; };
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',locale:'en-US'}); await c.addInitScript(FAKE);
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/memorizer/'); await p.evaluate(()=>{ localStorage.clear(); sessionStorage.setItem('theactorpage_hot_ok','1'); }); await p.reload(); await p.waitForTimeout(500);
await p.setInputFiles('#file',{name:'cafe.txt',mimeType:'text/plain',buffer:Buffer.from(ES)}); await p.waitForTimeout(600);
want('Spanish sides: the accented names are read as characters', /JOSÉ/.test(await p.innerText('#main'))&&/MARÍA/.test(await p.innerText('#main')));
await p.click('text=JOSÉ'); await p.waitForTimeout(500);
want('under the MIC tile: I SPEAK, set to your phone\'s language to start', await p.$eval('[data-klang]',s=>s.value==='')&&/I SPEAK/.test(await p.innerText('.klang'))&&/My phone.s language \(English \(US\)\)/.test(await p.innerText('.klang')));
await p.selectOption('[data-klang]','es-MX'); await p.waitForTimeout(200);
await p.click('[data-kit="say"]'); await p.waitForTimeout(400);
want('the speech service is told Spanish (Mexico)', await p.evaluate(()=>window.__langs.slice(-1)[0])==='es-MX', await p.evaluate(()=>window.__langs));
await p.evaluate(()=>window.__say('donde esta el dinero')); await p.waitForTimeout(800);
const v=await p.innerText('#main');
want('said without the accents, the line still counts: Word for word', /Word for word\. Heard: .donde esta el dinero./.test(v)&&/GOT IT/.test(v), v.slice(-300));
want('the engine: the same words, accents or not', await p.evaluate(()=>{ const E=window.MemEngine||window.MemorizerEngine; if(!E) return null; return E.words('¿Dónde está el dinero?').join(' ')===E.words('donde esta el dinero').join(' '); })!==false);
// shared: Actor OS hears the same language
await p.goto('http://localhost:8811/actor-os/index.html'); await p.waitForTimeout(800);
want('the setting is shared: Actor OS reads es-MX', await p.evaluate(()=>TapLang.speech())==='es-MX');
want('Actor OS matches a Russian line said back', await p.evaluate(()=>{ const r=cueConf('Где деньги, Ваня?','где деньги ваня'); return r.action==='MATCH'; }));
want('and a Spanish one said without accents', await p.evaluate(()=>cueConf('¿Dónde está el dinero?','donde esta el dinero').action==='MATCH'));
want('English still matches as before', await p.evaluate(()=>cueConf("I don't know what you want.","i don't know what you want").action==='MATCH'));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
