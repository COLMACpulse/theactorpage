/* HEADSHOTS end to end on made-up photos (an oval "face" on a backdrop, drawn here). Needs a local server on :8811
   at the repo root and Python with Pillow to draw the photos. NODE_PATH=... node headshots/tests/headshots_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
(async()=>{ const T=fs.mkdtempSync(path.join(os.tmpdir(),'hs-'));
cp.execSync(`python3 -c "
from PIL import Image,ImageDraw,ImageFilter
import random
random.seed(4)
def shot(name,bg,face,size=(1600,2000),soft=False):
    im=Image.new('RGB',size,bg); d=ImageDraw.Draw(im); W,H=size
    d.ellipse([W*.27,H*.16,W*.73,H*.62],fill=face); d.rectangle([W*.12,H*.66,W*.88,H],fill=tuple(int(c*.5) for c in face))
    px=im.load()
    for i in range(60000):
        x=random.randint(int(W*.3),int(W*.7)); y=random.randint(int(H*.2),int(H*.58)); v=random.randint(-25,25); c=px[x,y]; px[x,y]=tuple(max(0,min(255,a+v)) for a in c)
    if soft: im=im.filter(ImageFilter.GaussianBlur(14))
    im.save('${T}/'+name,quality=90)
shot('moody_cop.jpg',(22,22,26),(200,170,150))
shot('white_wall_dad.jpg',(246,246,246),(90,75,65))
shot('small_old.jpg',(120,120,120),(205,180,160),size=(480,600))
shot('ref_window_light.jpg',(60,60,70),(210,190,170))
"`);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,400))); if(!c) ok=false; };
await p.goto('http://localhost:8811/headshots/index.html'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_you'); indexedDB.deleteDatabase('theactorpage_headshot_refs'); }); await p.reload();
await p.setInputFiles('#hf',['moody_cop.jpg','white_wall_dad.jpg','small_old.jpg'].map(f=>T+'/'+f));
await p.waitForFunction(()=>You.get().photos.length===3&&You.get().photos.every(x=>x.check),null,{timeout:15000});
const words=await p.evaluate(()=>You.get().photos.map(x=>[x.name,Headshots.words(x.check).map(l=>(l.ok?'+':'-')+l.t).join(' | ')]));
console.log(JSON.stringify(words));
want('moody shot: dark background, you lit, not "too dark"', /Dark background, you lit/.test(words[0][1])&&!/read dark/.test(words[0][1]), words[0]);
want('white wall, face in shadow: you read dark, the wall is brighter', /read dark/.test(words[1][1])&&/brighter than you/.test(words[1][1]), words[1]);
want('small original: its size', /Small/.test(words[2][1]), words[2]);
want('the first headshot is your main one (same as YOUR PROFILE)', await p.evaluate(()=>You.get().primary===You.get().photos[0].id));
// tag in your words
const ids=await p.evaluate(()=>You.get().photos.map(x=>x.id));
await p.click(`[data-st="${ids[0]}|keeper"]`); await p.click(`[data-role="${ids[0]}|Law enforcement"]`);
await p.fill(`[data-newrole="${ids[1]}"]`,'Bartender'); await p.click(`[data-addrole="${ids[1]}"]`); await p.click(`[data-st="${ids[1]}|retest"]`);
await p.click(`[data-st="${ids[2]}|retire"]`);
want('tags and status kept on the photo itself', await p.evaluate(i=>{ const P=You.get().photos; return P[0].status==='keeper'&&P[0].roles.includes('Law enforcement')&&P[1].roles.includes('Bartender')&&P[2].status==='retire'; },ids));
// plan
await p.click('[data-t=plan]'); await p.click('[data-want="Law enforcement"]'); await p.click('[data-want="Bartender"]'); await p.click('[data-called="Everyday"]');
const cov=await p.evaluate(()=>[...document.querySelectorAll('.chk li')].map(x=>x.textContent));
want('coverage in plain words', cov.join(' ')==='Law enforcement: covered (moody_cop). Bartender: no keeper yet (1 to retest).', cov);
await p.click('#tadd'); await p.waitForTimeout(100); const tid=await p.evaluate(()=>__hs.P.tests[0].id);
await p.fill(`[data-tf="${tid}|change"]`,'Darker jacket'); await p.selectOption(`[data-tf="${tid}|before"]`,ids[1]); await p.selectOption(`[data-tf="${tid}|after"]`,ids[0]); await p.click(`[data-tv="${tid}|worked"]`);
want('before / after: two photos side by side and your verdict', await p.evaluate(()=>document.querySelectorAll('.baimg').length)===2&&await p.evaluate(()=>Headshots.plan().tests[0].verdict==='worked'&&Headshots.plan().tests[0].change==='Darker jacket'));
// brief
await p.click('[data-t=brief]'); await p.fill('[data-bf="objective"]','Two looks: a cop and a bartender.'); await p.fill('[data-bf="boundaries"]','No retouching that changes my face.'); await p.fill('[data-bf="shots"]','Tight, grey crew, no smile\nWaist up, apron, behind a bar');
await p.setInputFiles('#rf',T+'/ref_window_light.jpg'); await p.waitForTimeout(600); const rid=await p.evaluate(()=>__hs.P.refs[0].id); await p.fill(`[data-rn="${rid}"]`,'Window light from the left');
const dl=p.waitForEvent('download'); await p.click('#bdl'); const d=await dl; const f=T+'/brief.html'; await d.saveAs(f); const html=fs.readFileSync(f,'utf8');
want('the brief downloads as a standalone page', /^Headshot_brief_|_headshot_brief_\d/.test(d.suggestedFilename())||/headshot_brief/.test(d.suggestedFilename()), d.suggestedFilename());
want('the brief has the plan, your boundaries, the shot list and the chosen reference', /Two looks/.test(html)&&/No retouching/.test(html)&&/Tight, grey crew/.test(html)&&/Window light from the left/.test(html)&&/data:image\/jpeg;base64/.test(html)&&/Roles I want to be seen for/.test(html));
want('the brief leaves out the photo checks and your headshot notes', !/read dark|Dark background|Small:|\bcheck\b/i.test(html.replace(/PRINT \/ SAVE AS PDF/,'')));
await p.click(`[data-rs="${rid}"]`); const dl2=p.waitForEvent('download'); await p.click('#bdl'); const d2=await dl2; await d2.saveAs(T+'/b2.html');
want('untick a reference and it stays out', !/data:image/.test(fs.readFileSync(T+'/b2.html','utf8')));
const dl3=p.waitForEvent('download'); await p.click('#sdl'); const d3=await dl3; await d3.saveAs(T+'/sheet.html');
want('the shot sheet: one line per shot to tick off', (fs.readFileSync(T+'/sheet.html','utf8').match(/<li>/g)||[]).length===2);
await p.click('#bprev'); await p.waitForTimeout(500); want('preview opens', await p.evaluate(()=>!!document.getElementById('pvf')&&/Two looks/.test(document.getElementById('pvf').srcdoc))); await p.click('#pvx');
want('no sideways scroll at phone width', (await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=0);
// the same photos on home, with the way in
const h=await ctx.newPage(); h.on('pageerror',e=>errs.push('home '+e.message)); await h.goto('http://localhost:8811/index.html'); await h.waitForTimeout(500);
want('home YOUR PROFILE shows the same 3 headshots and the way into HEADSHOTS', /3 headshots/.test(await h.innerText('#youpanel'))&&await h.evaluate(()=>!!document.querySelector('#youpanel a[href="headshots/"]')));
want('no page errors', !errs.length, errs);
await b.close(); fs.rmSync(T,{recursive:true,force:true}); process.exit(ok?0:1); })();
