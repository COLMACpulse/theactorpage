/* HOME FOOTER: no SHOW ON THIS SITE row any more, so an old hidden department is cleared and everything shows;
   the COLMAC TOOLWORKS sigil. Server on :8811.  NODE_PATH=... node tests/view_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1280,height:900}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const shown=sel=>p.$eval(sel,e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)).catch(()=>false);
await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{ localStorage.setItem('theactorpage_view',JSON.stringify({act:true,write:false,film:false})); sessionStorage.setItem('theactorpage_sigil','1'); }); await p.reload(); await p.waitForTimeout(800);
const f=await p.innerText('footer');
want('the footer: no SHOW ON THIS SITE row', !(await p.$('#viewrow'))&&!(await p.$('[data-view]'))&&!/SHOW ON THIS SITE/.test(f));
want('an old hidden choice is cleared: every band and footer column shows', await shown('.door.w')&&await shown('.door.f')&&await shown('.fcol[data-dept="write"]')&&await shown('.fcol[data-dept="film"]')&&!(await p.$('[data-vhide]'))&&await p.evaluate(()=>localStorage.getItem('theactorpage_view')===null));
const im=await p.$eval('.maker img',e=>({src:e.getAttribute('src'),w:e.naturalWidth,show:e.offsetWidth}));
want('COLMAC TOOLWORKS: the sigil, loaded, beside the name', im.src==='img/colmac-sigil-96.png'&&im.w===96&&im.show===48&&/COLMAC TOOLWORKS/.test(f), im);
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
