/* A CREDIT WITH MANY CLIPS (Col, Oct 30: "i can only see 3 of 5 clips for 'justified'. the view for ROOKIE FEDS is cut
   off"). Tap the poster: one clip big, CLIP 1 to CLIP 5 under it, each one a tap; nothing cut off at the top or bottom,
   on a computer or a phone. A one-clip credit: the clip and its caption, fully on screen.
   A made-up site (shared/fixtures/site_sample, Riley Hart) with Harbor Lights given 5 clips. Server on :8811. */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), {execSync}=require('child_process');
const SRC=path.join(__dirname,'..','..','shared','fixtures','site_sample'), T=fs.mkdtempSync(path.join(os.tmpdir(),'clips-')), SITE=path.join(T,'riley-site-main'), Z=path.join(T,'riley-site-main.zip');
const SP='/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
execSync(`cp -r "${SRC}" "${SITE}"`);
for(let i=1;i<=5;i++) fs.copyFileSync(path.join(SRC,i%2?'media/clip-night.webm':'media/reel.webm'),path.join(SITE,'media','harbor'+i+'.webm'));
const ix=path.join(SITE,'index.html'); let H0=fs.readFileSync(ix,'utf8');
H0=H0.replace('"clips":[{"src":"media/clip-harbor.webm","t":""}]','"clips":['+[1,2,3,4,5].map(i=>'{"src":"media/harbor'+i+'.webm","t":"Scene '+i+'"}').join(',')+']'); fs.writeFileSync(ix,H0);
execSync(`cd "${T}" && python3 -c "import zipfile,os
z=zipfile.ZipFile('${Z}','w',zipfile.ZIP_DEFLATED)
for r,d,f in os.walk('riley-site-main'):
  for x in f: z.write(os.path.join(r,x))
z.close()"`);
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const c0=await b.newContext(); const p=await c0.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/hub/?tab=intake'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('colmac_hub'); }); await p.reload(); await p.waitForTimeout(1500);
await p.setInputFiles('#sizip',Z); await p.waitForFunction(()=>window.__siteIn.plan,null,{timeout:10000}).catch(()=>{});
await p.click('#sigo'); await p.waitForFunction(()=>!window.__siteIn.busy&&window.__siteIn.report,null,{timeout:30000}).catch(()=>{});
await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(2000);
const out=path.join(T,'out'); fs.mkdirSync(path.join(out,'media'),{recursive:true});
const files=await p.evaluate(async()=>{ await loadMade(); const e=await siteEntries('https://riley.example.com'); return e.map(x=>({n:x.name,d:Array.from(x.data)})); });
files.forEach(f=>fs.writeFileSync(path.join(out,f.n),Buffer.from(f.d)));
const H=fs.readFileSync(path.join(out,'index.html'),'utf8');
want('Harbor Lights carries all 5 clips, the poster says 5 CLIPS', /5 CLIPS/.test(H)&&(H.match(/class="lbv/g)||[]).length===5, (H.match(/class="lbv/g)||[]).length);
want('no errors building it', !errs.length, errs);
for(const [nm,vp,cs] of [['computer',{width:1280,height:800},'light'],['phone',{width:390,height:700},'dark'],['phone-sideways',{width:740,height:360},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs}); const q=await c.newPage(); const qe=[]; q.on('pageerror',e=>qe.push(e.message));
 await q.goto('file://'+path.join(out,'index.html')); await q.waitForTimeout(600);
 await q.click('a.wpo[aria-label^="Play Harbor Lights"]'); await q.waitForTimeout(500);
 const fit=()=>q.evaluate(()=>{ const x=document.querySelector('.lbx:target'); if(!x) return null; const v=[...x.querySelectorAll('video')].filter(v=>getComputedStyle(v).display!=='none'); const r=v[0]&&v[0].getBoundingClientRect(), cap=x.querySelector('.lbcap').getBoundingClientRect(), tabs=x.querySelector('.lbtabs');
   return {shown:v.length, i:v[0]&&v[0].dataset.i, top:r&&r.top, bot:r&&r.bottom, capBot:cap.bottom, tabs:tabs?tabs.querySelectorAll('.lbt').length:0, tabsBot:tabs?tabs.getBoundingClientRect().bottom:0, h:innerHeight, scroll:x.scrollTop}; });
 let f=await fit();
 want(nm+': tap the poster: one clip at a time, CLIP 1 to CLIP 5 under it', f&&f.shown===1&&f.i==='0'&&f.tabs===5, f);
 want(nm+': the clip, its buttons and caption all on screen (nothing cut off)', f&&f.top>=0&&f.tabsBot<=f.h&&(nm==='phone-sideways'||f.capBot<=f.h), f);
 if(nm==='phone-sideways') want(nm+': on a short screen it scrolls instead of cutting off the top', f.top>=0&&await q.evaluate(()=>{ const x=document.querySelector('.lbx:target'); return x.scrollHeight<=x.clientHeight+1||getComputedStyle(x).overflowY==='auto'; }));
 const seen=[]; for(let i=0;i<5;i++){ await q.click('.lbx:target .lbt[data-i="'+i+'"]'); await q.waitForTimeout(150); f=await fit(); seen.push(f.shown===1&&f.i===String(i)&&f.top>=-1); }
 want(nm+': each of the 5 clips opens with a tap', seen.every(Boolean), seen);
 want(nm+': the button for the clip showing is lit', await q.evaluate(()=>{ const t=document.querySelector('.lbx:target .lbt.on'); return !!t&&t.dataset.i==='4'&&t.getAttribute('aria-pressed')==='true'; }));
 await q.screenshot({path:SP+'/clips_'+nm+'.png'});
 await q.goto('file://'+path.join(out,'index.html')); await q.waitForTimeout(400);
 const one=await q.$('a.wpo:not([aria-label^="Play Harbor Lights"])'); if(one){ await one.click(); await q.waitForTimeout(400); f=await fit();
  want(nm+': a one-clip credit: just the clip, no buttons, on screen', f&&f.shown===1&&f.tabs===0&&f.top>=0&&(nm==='phone-sideways'||f.capBot<=f.h), f); }
 want(nm+': no errors', !qe.length, qe);
 await c.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
