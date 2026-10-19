/* CHARACTER BANK (was CPS) in the app: the new name; VOICES draws the map; COME BACK draws then-and-now and every
   come-back; hover and focus give the numbers. Made-up characters and measurements (no audio needed).
   Server on :8811.  NODE_PATH=... node cps/tests/graphs_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [w,h,scheme] of [[390,844,'dark'],[1280,900,'light']]){
const c=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/cps/'); await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('cps_v02'); q.onsuccess=q.onerror=q.onblocked=()=>r(); })); await p.reload();
await p.waitForFunction(()=>window.CPS&&window.CPS.S&&window.CPS.S.lib,null,{timeout:8000});
if(w<500){ want('the new name: CHARACTER BANK, on the page and the tab', (await p.title())==='Character Bank'&&/CHARACTER BANK/.test(await p.innerText('body')), await p.title()); }
await p.evaluate(()=>{ const {S,E}=window.CPS, key=E.linesKey(S.lib.lines), con=(hz,n,dt)=>Array.from({length:n},(_,i)=>[+(i*dt).toFixed(2),+(hz*(1+0.06*Math.sin(i/4))).toFixed(1)]);
 const an=(hz,span,lo,hi,sil,n)=>({pitchHz:hz,spanSec:span,pitchLoHz:lo,pitchHiHz:hi,rangeSt:+(12*Math.log2(hi/lo)).toFixed(1),silencePct:sil||10,speechSec:span*0.8,levelDb:-24,dur:span+1,voicedPct:80,contour:con(hz,n||60,span/(n||60))});
 const ch=(id,name,extra)=>Object.assign({id,name,project:'',created:'2026-09-01T10:00:00Z',updated:'2026-10-15T10:00:00Z',state:null,anchorLine:'Get off my land.',notes:'',refId:null,takes:[],looks:[],bd:null,me:false},extra||{});
 const me=ch('me','',{me:true}); me.takes.push({id:'lm',kind:'lines',linesKey:key,at:'2026-10-01T10:00:00Z',an:an(120,6,100,150)});
 const sam=ch('sam','Old Sam'); sam.takes.push({id:'ls',kind:'lines',linesKey:key,at:'2026-10-01T10:05:00Z',an:an(95,7.2,80,120)},{id:'vs',kind:'voice',at:'2026-09-01T10:00:00Z',an:an(96,5,82,118)});
 sam.refId='vs';
 [['r1','2026-09-20T10:00:00Z',97],['r2','2026-10-01T10:00:00Z',104],['r3','2026-10-15T10:00:00Z',96]].forEach(([id,at,hz])=>sam.takes.push({id,kind:'return',refId:'vs',at,an:an(hz,5.2,hz*0.85,hz*1.2)}));
 const pastor=ch('pas','Pastor'); pastor.takes.push({id:'lp',kind:'lines',linesKey:key,at:'2026-10-01T10:10:00Z',an:an(98,7.0,85,115)});
 const nell=ch('nel','Kid Nell'); nell.takes.push({id:'ln',kind:'lines',linesKey:key,at:'2026-10-01T10:15:00Z',an:an(240,4.8,200,300)});
 S.lib.chars=[me,sam,pastor,nell]; S.lib.cur='sam'; window.CPS.act('tab',{t:'voices'}); });
await p.waitForTimeout(400);
const map=await p.$('svg.cg[aria-label^="Your voices on one map"]');
want(scheme+': VOICES has the map, a dot per voice, you in the middle', !!map&&(await p.$$eval('svg.cg .dot.now',x=>x.length))===3&&(await p.$$eval('svg.cg .me',x=>x.length))===1);
want(scheme+': close voices joined, and still listed in words', (await p.$$eval('svg.cg .pairline',x=>x.length))===1&&/Old Sam and Pastor/.test(await p.innerText('#main')));
const dot=await p.$('svg.cg g[data-tip*="Kid Nell"]'); await dot.scrollIntoViewIfNeeded(); await dot.hover(); await p.waitForTimeout(150);
want(scheme+': hover a dot: its numbers', /Kid Nell/.test(await p.innerText('#cgtip'))&&/12 st higher than you, 20% faster/.test(await p.innerText('#cgtip')), await p.innerText('#cgtip'));
await p.focus('svg.cg g[data-tip*="Old Sam"]'); await p.waitForTimeout(100);
want(scheme+': focus works too (keyboard)', /Old Sam/.test(await p.innerText('#cgtip')));
// come back: then and now, and every come-back
await p.evaluate(()=>{ window.CPS.S.lastReturn='r3'; window.CPS.act('tab',{t:'back'}); }); await p.waitForTimeout(400);
const ct=await p.$('svg.cg[aria-label^="Pitch through the take"]');
want(scheme+': COME BACK: then and now, two lines, keyed', !!ct&&(await p.$$eval('svg.cg .line.then',x=>x.length))===1&&(await p.$$eval('svg.cg .line.now',x=>x.length))===1&&/then\s+now\. Pitch through the take/.test(await p.innerText('#main')));
const hit=await p.$('svg.cg .hitarea'); await hit.scrollIntoViewIfNeeded(); const bb=await hit.boundingBox(); await p.mouse.move(bb.x+bb.width*0.4,bb.y+bb.height/2); await p.waitForTimeout(150);
want(scheme+': move along it: both readings at that moment', /\d\.\d s/.test(await p.innerText('#cgtip'))&&/then: \d+ Hz/.test(await p.innerText('#cgtip'))&&/now: \d+ Hz/.test(await p.innerText('#cgtip')), await p.innerText('#cgtip'));
const hs=await p.$('svg.cg[aria-label^="Every come-back"]');
want(scheme+': every come-back: a bar each, on the reference band', !!hs&&(await p.$$eval('svg.cg .bar.now',x=>x.length))===3&&(await p.$$eval('svg.cg .band.then',x=>x.length))===1);
const bar=await p.$('svg.cg g[data-tip*="2026"]').catch(()=>null); const anyBar=bar||await p.$('svg.cg[aria-label^="Every come-back"] g[data-tip]'); await anyBar.hover(); await p.waitForTimeout(150);
want(scheme+': hover a come-back: its middle and range against then', /middle \d+ Hz/.test(await p.innerText('#cgtip'))&&/range \d+–\d+ Hz/.test(await p.innerText('#cgtip')), await p.innerText('#cgtip'));
const stroke=await p.$eval('svg.cg .line.now',e=>getComputedStyle(e).stroke);
want(scheme+': gold for now ('+stroke+')', /rgb\(201, 133, 0\)/.test(stroke));
want(scheme+': no em dashes', !/—/.test(await p.innerText('#main')));
want(scheme+': no page errors', !errs.length, errs);
if(w<500) await p.screenshot({path:'/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/cb_back.png',fullPage:true});
await p.evaluate(()=>window.CPS.act('tab',{t:'voices'})); await p.waitForTimeout(300);
await p.screenshot({path:'/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/cb_map_'+scheme+'.png',fullPage:true});
await c.close(); }
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
