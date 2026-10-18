/* THEACTORPAGE HOME: the YOU room. Drop anything once; it goes where it belongs.
   - sides and scripts go on the sides shelf (shared/shelf.js): Actor OS, Memorizer, Breakdown, CPS and
     Story Studio open them next time, with your part when a request named it
   - a script or draft also goes in the inbox for Paper Trail (shared/inbox.js)
   - a self-tape request goes in the inbox for the Hub; your name off it goes on the Actor OS slate
   - footage: a page can't keep video, so Story Studio reads it from the folder when you open it
   Reading and sorting: shared/intake.js. Nothing uploaded. */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=window.Intake, Sh=window.Shelf, I=window.Inbox, Y=window.You;
if(!X||!Sh||!I||!$('drop')) return;
const KIND={sides:'Sides',script:'Script',request:'Self-tape request',resume:'Résumé',media:'Footage',image:'Headshot',other:'Not placed',unknown:'Not placed'};
const title=s=>String(s||'').toLowerCase().replace(/(^|[\s\-'])([a-z])/g,(m,a,b)=>a+b.toUpperCase()).replace(/\bMc([a-z])/g,(m,a)=>'Mc'+a.toUpperCase());
const plain=n=>String(n||'').replace(/\.[a-z0-9]{2,8}$/i,'').replace(/_/g,' ');
let LAST=[];   // what came in this time, for the cards

/* ---------- read one thing ---------- */
async function readOne(f){
 const k=X.fileKind(f), o={name:f.name, file:f, fk:k};
 try{
  if(k==='media'){ o.kind='media'; return o; }
  if(k==='image'){ o.kind='image'; return o; }
  if(k==='other'){ o.kind='other'; o.why=['not a file this site reads yet']; return o; }
  if(k==='pdf'){
   const ex=await ActorPDF.extract(await f.arrayBuffer());
   if(ex.encrypted&&!ex.chars){ o.kind='unknown'; o.why=['a protected PDF: open it, select all, copy, and paste it below']; return o; }
   if(!ex.chars){ o.kind='unknown'; o.why=['pictures of pages, no text in them: paste the words below']; return o; }
   o.text=ActorPDF.toSides(ex.lines); o.struck=ex.struck||0;
   const raw=(ex.lines||[]).map(l=>l.text).join('\n'), mk=ActorPDF.findMarkers(ActorPDF.clean(ex.lines));
   o.pdf={pages:(ex.pages||[]).length, sides:/Sides by Breakdown Services|^\s*Role:\s/im.test(raw)||o.struck>0||mk.start>=0};
   o.rawText=raw; o.rows=(ex.lines||[]).map(l=>({cells:l.cells&&l.cells.length?l.cells:[{x:l.x,text:l.text}]}));
  }
  else if(k==='docx') o.text=await X.docxText(await f.arrayBuffer());
  else { const t=await f.text(); o.text=(k==='fdx'||/^\s*<\?xml[\s\S]{0,200}<FinalDraft/i.test(t))?ActorSides.fromFdx(t):t; }
  const w=X.what(o.text,o.pdf,o.rows);
  // a PDF that is a request (an Eco Cast page saved as PDF) reads better from its raw text
  if(o.pdf&&w.kind!=='request'&&o.rawText){ const w2=X.what(o.rawText); if(w2.kind==='request'){ Object.assign(o,{kind:'request',why:w2.why,req:w2.req,text:o.rawText}); return o; } }
  Object.assign(o,{kind:w.kind,why:w.why,req:w.req||null,script:w.script||null,profile:w.profile||null});
 }catch(e){ o.kind='unknown'; o.why=['could not read it: '+(e&&e.message||e)]; }
 return o;
}

/* ---------- send it where it goes ---------- */
function reqKey(r){ return [r.title||r.show,r.role,(r.castingDirectors||[]).join(',')].map(x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'')).join('|'); }
async function route(items){
 const reqs=items.filter(x=>x.kind==='request'&&x.req);
 // requests first: the Hub's inbox, your name for the slate
 reqs.forEach(x=>{ const r=x.req;
  const it=I.put('request',{raw:x.text,file:x.name,title:r.title||r.show||'',role:r.role||'',due:r.due?(r.due.utc||r.due.local||''):'',dueObj:r.due||null,dueWords:HubReq.dueWords(r.due),sides:r.sides||[]},reqKey(r));
  x.went='In the Hub next time you open it.'; x.inboxId=it.id;
  if(r.invitedActor){ if(Y) Y.fill({name:title(r.invitedActor)},'a self-tape request'); try{ if(!localStorage.getItem('actor_os_name')){ localStorage.setItem('actor_os_name',r.invitedActor); x.named=r.invitedActor; } }catch(e){} }
 });
 // a note from someone on the request, from NOTES (a class, a workshop, a callback)
 if(window.Notes) reqs.forEach(x=>{ const names=(x.req.castingDirectors||[]).filter(Boolean); if(names.length) x.noteWords=Notes.lineFor(names); });
 // your real history with the office on the request, from the Hub on this device (plain counts)
 if(reqs.length&&window.Offices){ const D=await Offices.load();
  if(D) reqs.forEach(x=>{ const r=x.req, k=[r.title||r.show,r.role].map(v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'')).join('|');
   const names=(r.castingDirectors||[]).filter(Boolean); if(!names.length) return;
   const h=Offices.history(D.projects,D.credits,names,p=>[p.project||p.title,p.role].map(v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'')).join('|')===k); x.offWords=Offices.words(h);
   if(x.noteWords&&h&&!h.reads&&!h.credits) x.offWords=''; }); }
 const known=reqs.map(x=>x.req).concat(I.all('request').map(it=>({role:it.data.role,sides:it.data.sides||[],title:it.data.title})));
 // scripts first, then sides: the sides for an audition end up current, which is what Actor OS opens
 items.filter(x=>x.kind==='script').concat(items.filter(x=>x.kind==='sides')).forEach(x=>{
  if(x.kind!=='sides'&&x.kind!=='script') return;
  const sp=(x.script&&x.script.speakers)||[];
  // your part: the request that names this file, else one dropped with it whose role is in these pages
  let from=null, me='';
  for(const r of known){ if(r&&X.namesFile(r,x.name)){ me=X.matchRole(r.role,sp); if(me){ from=r; break; } } }
  if(!me) for(const r of known){ if(!r) continue; me=X.matchRole(r.role,sp); if(me){ from=r; break; } }
  const it=Sh.put({text:x.text,file:x.name,fileSig:x.file?Sh.sig(x.file):'',me:me,from:'home'});
  if(it){ x.shelfId=it.id; if(me&&it.me!==me) Sh.setMe(it.id,me); x.me=me||it.me||''; x.meFrom=from?(from.title||'the request'):''; x.parts=sp.slice(0,12);
   if(x.file&&x.fk==='pdf'&&Sh.putFile) Sh.putFile(it.id,x.file).catch(()=>{}); }
  const Vw=window.View, sh=n=>!Vw||Vw.has(n); x.went=x.kind==='sides'?(sh('act')?'On the sides shelf: every ACT tool has it.':'On the sides shelf.'):'On the sides shelf'+(sh('write')?', and in Paper Trail next time you open it.':'.');
  if(x.kind==='script') I.put('draft',{text:x.text,file:x.name},'draft|'+x.name+'|'+x.text.length);
 });
 const media=items.filter(x=>x.kind==='media');
 if(media.length) media.forEach(x=>{ x.went=(!window.View||View.has('film'))?'A page can\'t keep video, so Story Studio reads it from your footage folder when you open its footage check.':'Footage is for Story Studio, in FILM, which you\'ve hidden. SHOW ME FILM to use it.'; });
 // a résumé: your profile, which every tool reads for its blanks
 for(const x of items.filter(x=>x.kind==='resume'&&Y)){ if(x.file) x.kept=await Y.setResume(x.file,'drop'); if(!x.profile) { x.went='Kept in YOUR PROFILE. Nothing on it could be read into the fields; fill them in by hand.'; continue; } x.changed=Y.fill(x.profile,x.name); x.went='In your profile. Every tool that asks for any of it fills its blanks from there; nothing you typed in a tool is changed.'+(x.kept?' The file is kept there too, to send.':'');
  const nm=Y.get().name; try{ if(nm&&!localStorage.getItem('actor_os_name')) localStorage.setItem('actor_os_name',nm.toUpperCase().replace(/\bMC([A-Z])/g,'Mc$1')); }catch(e){} }
 for(const x of items.filter(x=>x.kind==='image')){ if(!Y){ x.went='Not placed.'; continue; } const r=await Y.addPhoto(x.file);
  if(r.error){ x.kind='unknown'; x.why=[r.error]; continue; } x.photo=r.photo; x.dup=!!r.dup; x.went=r.dup?'Already in your headshots.':(Y.get().primary===r.photo.id?'Your main headshot. The Hub, Virtual Résumé and Slate Maker use it.':'In your headshots. Make it the main one if it is.'); }
 items.filter(x=>['other','unknown'].includes(x.kind)).forEach(x=>{ x.went='Not placed: '+(x.why||[]).join('; ')+'.'; });
}

/* ---------- show it ---------- */
function card(x,i){
 const u=X.unlocks(x.kind,{me:x.me,name:x.named});
 let h='<div class="tk k-'+x.kind+'"><h4>'+esc(KIND[x.kind]||x.kind)+': '+esc(x.kind==='request'&&x.req?(x.req.title||x.req.show||plain(x.name))+(x.req.role?' · '+x.req.role:''):plain(x.name))+'</h4>';
 if(x.kind==='resume'&&x.profile){ const P=x.profile, by={}; P.credits.forEach(c=>by[c.section]=(by[c.section]||0)+1);
  h+='<div class="why">'+esc([P.name,P.union,[P.rep,P.repPhone].filter(Boolean).join(' '),P.height,P.weight,P.hair&&'hair '+P.hair,P.eyes&&'eyes '+P.eyes,P.locations].filter(Boolean).join(' · '))+'</div>'
   +'<div class="why">'+esc(Object.entries(by).map(([k,n])=>n+' '+k).join(', ')+(P.training.length?' · '+P.training.length+' training':'')+(P.skills.length?' · '+P.skills.length+' skills':'')+(P.accents.length?' · '+P.accents.length+' accents':''))+'</div>'
   +(x.changed&&x.changed.length?'<div class="why">Filled: '+esc(x.changed.map(c=>c[0]).join(', '))+'.</div>':'<div class="why">Your profile already had all of this.</div>'); }
 if(x.photo) h+='<div class="parts"><img data-photo="'+esc(x.photo.id)+'" alt="" style="width:72px;height:90px;object-fit:cover;border:1px solid var(--rule)">'+(Y&&Y.get().primary!==x.photo.id?'<button data-main="'+esc(x.photo.id)+'">MAKE IT THE MAIN ONE</button>':'')+'</div>';
 if(x.why&&x.why.length&&!['image','other','unknown','resume'].includes(x.kind)) h+='<div class="why">Read as '+esc(x.why.join(', '))+(x.struck?'. '+x.struck+' crossed-out line'+(x.struck===1?'':'s')+' left out':'')+'.</div>';
 if(x.kind==='request'&&x.req) h+='<div class="why">Tape due: '+esc(HubReq.dueWords(x.req.due))+'</div>'+(x.offWords?'<div class="why">'+esc(x.offWords)+'</div>':'')+(x.noteWords?'<div class="why">'+esc(x.noteWords)+'</div>':'')+(x.named?'<div class="why">Your name for the slate: '+esc(x.named)+'.</div>':'');
 h+='<div class="went">'+esc(x.went||'')+'</div>';
 if(x.shelfId&&x.parts&&x.parts.length){
  h+='<div class="why" style="margin-top:6px">'+(x.me?'Your part: <b>'+esc(x.me)+'</b>'+(x.meFrom?' (from '+esc(x.meFrom)+')':'')+'. Tap another to change it.':'Which part is yours? One tap, and every tool knows.')+'</div><div class="parts">'
   +x.parts.map(p=>'<button data-part="'+i+'|'+esc(p.name)+'" class="'+(p.name===x.me?'on':'')+'">'+esc(p.name)+' <small>'+p.lines+'</small></button>').join('')+'</div>';
 }
 if(u.length) h+='<ul>'+u.map(([t,w,href])=>'<li><a href="'+href+'">'+esc(t.toUpperCase())+'</a> '+esc(w)+'</li>').join('')+'</ul>';
 return h+'</div>';
}
const URLS={};
async function fillPhotos(root){ for(const im of (root||document).querySelectorAll('img[data-photo]')){ const id=im.dataset.photo; if(!URLS[id]){ const b=await Y.photoBlob(id); if(b) URLS[id]=URL.createObjectURL(b); } if(URLS[id]) im.src=URLS[id]; } }
function wireMain(root){ (root||document).querySelectorAll('[data-main]').forEach(b=>b.onclick=()=>{ Y.setPrimary(b.dataset.main); LAST.forEach(x=>{ if(x.photo) x.went=Y.get().primary===x.photo.id?'Your main headshot. The Hub, Virtual Résumé and Slate Maker use it.':'In your headshots.'; }); showTook(); showYou(); }); }
/* your profile: what every tool reads. Fix a line here once. */
function showYou(){
 drawLens(); try{ if(window.Rooms) Rooms.draw(); }catch(e){} keepLine(); const box=$('youpanel'); if(!box||!Y) return; const y=Y.get(); if(!Y.has()&&!YFORCE){ box.innerHTML=''; return; }
 const by={}; y.credits.forEach(c=>by[c.section]=(by[c.section]||0)+1);
 let h='<details class="yp"'+(YOPEN?' open':'')+' id="ypd"><summary>YOUR PROFILE · '+esc(y.name||'no name yet')+(y.credits.length?' · '+y.credits.length+' credits':'')+(y.photos.length?' · '+y.photos.length+' headshot'+(y.photos.length===1?'':'s'):'')+'</summary>'
  +'<p class="why">Every tool fills its blanks from this. Fix a line here once and it stays fixed.</p>'
  +'<div class="yres">'+(y.resume?'<span><b>Your résumé</b> '+esc(y.resume.name)+' <small>· added '+esc(new Date(y.resume.added).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}))+'</small></span><span class="yact"><button class="pastego sm" id="yresopen">OPEN</button><label class="pastego sm">REPLACE<input type="file" id="yresfile" accept=".pdf,.docx,.doc,.txt,.rtf,.pages" hidden></label><button class="yx" id="yresx" aria-label="Remove your résumé">✕</button></span>'
     :'<span><b>Have a résumé?</b> Add it and it fills this in. The file is kept here too, for when someone asks for it.</span><span class="yact"><label class="pastego sm">ADD YOUR RÉSUMÉ<input type="file" id="yresfile" accept=".pdf,.docx,.doc,.txt,.rtf,.pages" hidden></label></span>')
  +'</div>'+(y.resume?'':'<p class="why" style="margin-top:-4px">No résumé yet? <a href="resume/" style="color:var(--tungsten)">VIRTUAL RÉSUMÉ</a> makes one from this profile.</p>')
  +'<div class="yres"><span><b>Headshots</b> '+(y.photos.length?y.photos.length+' here':'none yet')+'</span><span class="yact"><label class="pastego sm">ADD A HEADSHOT<input type="file" id="yphfile" accept="image/*" multiple hidden></label></span></div>'
  +Y.FIELDS.map(([k,l])=>'<label class="yf"><span>'+esc(l)+'</span><input data-yf="'+k+'" value="'+esc(y[k]||'')+'"></label>').join('')
  +[['skills','Skills'],['accents','Accents'],['training','Training'],['types','Your types']].map(([k,l])=>'<label class="yf"><span>'+l+'</span><textarea data-yl="'+k+'" rows="2"'+(k==='types'?' placeholder="Your words for what you\'re right for: cop, dad, rancher"':'')+'>'+esc((y[k]||[]).join(', '))+'</textarea></label>').join('')
  +(y.credits.length?'<div class="why" style="margin-top:8px">Credits: '+esc(Object.entries(by).map(([k,n])=>n+' '+k).join(', '))+'</div><ul class="ycr">'+y.credits.map((c,i)=>'<li><b>'+esc(c.title)+'</b> · '+esc(c.role||c.character)+(c.by?' · '+esc(c.by):'')+' <small>'+esc(c.section)+'</small> <button data-ycx="'+i+'" aria-label="Remove">×</button></li>').join('')+'</ul>':'')
  +(y.photos.length?'<div class="parts">'+y.photos.map(p=>'<span style="display:inline-flex;flex-direction:column;gap:4px"><img data-photo="'+esc(p.id)+'" alt="" style="width:72px;height:90px;object-fit:cover;border:'+(p.id===y.primary?'2px solid var(--tungsten)':'1px solid var(--rule)')+'">'+(p.id===y.primary?'<small style="color:var(--tungsten)">MAIN</small>':'<button data-main="'+esc(p.id)+'">MAKE MAIN</button>')+'<button data-yphx="'+esc(p.id)+'">×</button></span>').join('')+'</div>':'')
  +(y.photos.length?'<p class="why" style="margin-top:8px"><a href="headshots/" style="color:var(--tungsten)">HEADSHOTS</a>: tag each one in your own words, check the light and focus, plan the next shoot.</p>':'')+'</details>';
 box.innerHTML=h; const d=$('ypd'); if(d) d.ontoggle=()=>{ YOPEN=d.open; };
 // saved as you type; the panel redraws only when its title line changes, never while you're in a field (a redraw on blur throws)
 box.querySelectorAll('[data-yf]').forEach(i=>i.oninput=()=>{ Y.set(i.dataset.yf,i.value); if(i.dataset.yf==='name') drawLens(); });
 box.querySelectorAll('[data-yl]').forEach(i=>i.oninput=()=>{ Y.setList(i.dataset.yl,i.value.split(/\s*,\s*/)); });
 box.querySelectorAll('[data-yf="name"]').forEach(i=>i.onchange=()=>setTimeout(()=>{ if(!box.contains(document.activeElement)||document.activeElement===document.body) showYou(); },0));
 box.querySelectorAll('[data-ycx]').forEach(b=>b.onclick=()=>{ Y.removeCredit(+b.dataset.ycx); showYou(); });
 box.querySelectorAll('[data-yphx]').forEach(b=>b.onclick=async()=>{ await Y.removePhoto(b.dataset.yphx); showYou(); });
 const rf=$('yresfile'); if(rf) rf.onchange=e=>{ const fl=[...e.target.files]; if(fl.length) take(fl.slice(0,1),'',false,{asResume:true}); };
 const pf=$('yphfile'); if(pf) pf.onchange=e=>{ const fl=[...e.target.files]; if(fl.length) take(fl,''); };
 const ro=$('yresopen'); if(ro) ro.onclick=async()=>{ const b=await Y.resumeBlob(); if(!b) return; const u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener'; if(!/pdf|text/.test(b.type||'')) a.download=(Y.get().resume||{}).name||'resume'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),60000); };
 const rx=$('yresx'); if(rx) rx.onclick=async()=>{ if(!confirm('Remove the résumé file? What it filled in stays.')) return; await Y.removeResume(); showYou(); };
 wireMain(box); fillPhotos(box);
}
let YOPEN=false, YFORCE=false;
/* where your things are kept, said once you have some: this device, the last backup, and on an iPhone the Home Screen note.
   Safari can clear a site's saved data after a stretch of not visiting it; a site added to the Home Screen is kept. */
function keepLine(){
 const el=$('keepline'); if(!el) return;
 let has=false; try{ has=(Y&&Y.has())||Sh.all().length>0||(window.Takes&&Takes.all().length>0)||I.all().length>0; }catch(e){}
 if(!has){ el.hidden=true; return; }
 let own={}; try{ own=JSON.parse(localStorage.getItem('theactorpage_device_v1')||'{}')||{}; }catch(e){}
 const ago=t=>{ const d=Math.floor((Date.now()-t)/86400000); return d<1?'today':d===1?'yesterday':d<14?d+' days ago':d<60?Math.floor(d/7)+' weeks ago':Math.floor(d/30)+' months ago'; };
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)&&!(navigator.standalone||matchMedia('(display-mode: standalone)').matches);
 let off=false; try{ off=localStorage.getItem('theactorpage_ios_note')==='off'; }catch(e){}
 el.innerHTML='Everything you put in is kept on this device, not online. '+(own.lastBackup?'Last backup: '+ago(own.lastBackup)+'.':'No backup yet.')+' <a href="device/">BACK UP</a> &middot; <a href="privacy/">Privacy</a>'
  +(ios&&!off?'<span class="ios">On an iPhone, add this site to your Home Screen (Share, then Add to Home Screen). Safari can clear a site\'s saved things after a stretch of not visiting; a Home Screen app is kept.<button id="iosx" aria-label="Hide this">\u2715</button></span>':'');
 el.hidden=false; const x=$('iosx'); if(x) x.onclick=()=>{ try{ localStorage.setItem('theactorpage_ios_note','off'); }catch(e){} keepLine(); };
}
/* the headshot: your main headshot as an 8x10, your name under it. A new one develops in. Tap it for YOUR PROFILE; drop a photo on it like the drop box. */
let LENSID=null;
async function drawLens(){
 const L=$('lens'), im=$('lensimg'), why=$('lenswhy'); if(!L||!im||!Y) return;
 const y=Y.get(), id=y.primary&&y.photos.some(p=>p.id===y.primary)?y.primary:(y.photos[0]&&y.photos[0].id)||'';
 if(why) why.hidden=!!id;
 const nm=$('lensname'); if(nm){ nm.textContent=y.name||'Your name'; nm.classList.toggle('none',!y.name); }
 L.setAttribute('aria-label',id?'Your profile'+(y.name?', '+y.name:''):'Your profile. No headshot yet.');
 if(id===LENSID) return; LENSID=id;
 if(!id){ im.classList.remove('on'); im.removeAttribute('src'); return; }
 if(!URLS[id]){ const b=await Y.photoBlob(id); if(b) URLS[id]=URL.createObjectURL(b); }
 if(!URLS[id]||LENSID!==id) return;
 im.onload=()=>{ im.classList.add('on'); L.classList.remove('pull'); void L.offsetWidth; L.classList.add('pull'); };
 im.src=URLS[id];
}
(function(){ const L=$('lens'); if(!L) return;
 L.onclick=()=>{ YOPEN=true; YFORCE=true; showYou(); const b=$('youpanel'); if(b) b.scrollIntoView({block:'nearest',behavior:'smooth'}); };
 ['dragenter','dragover'].forEach(ev=>L.addEventListener(ev,e=>{ e.preventDefault(); }));
 L.addEventListener('drop',e=>{ e.preventDefault(); const fl=[...(e.dataTransfer&&e.dataTransfer.files||[])]; if(fl.length) take(fl,''); });
})();
function showTook(){ $('took').innerHTML=LAST.map(card).join('');
 document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{ const [i,name]=b.dataset.part.split('|'); const x=LAST[+i]; if(!x||!x.shelfId) return; Sh.setMe(x.shelfId,name,'home'); x.me=name; x.meFrom=''; showTook(); showPlay(); }); wireMain($('took')); fillPhotos($('took')); }
/* IN PLAY: what you've brought in that's still live (tapes due, sides, drafts). Folded to one line until you open it.
   A tape due within two days is said on that line. PUT AWAY takes a row off this list only (the tools keep it).
   Past three of a kind, the rest wait under "and N older". */
const AWAY='home_inplay_away';
const away=()=>{ try{ return JSON.parse(localStorage.getItem(AWAY)||'[]'); }catch(e){ return []; } };
function putAway(k){ const a=away(); if(!a.includes(k)) a.push(k); try{ localStorage.setItem(AWAY,JSON.stringify(a.slice(-200))); }catch(e){} showPlay(); }
let PLAYOPEN=(()=>{ try{ return sessionStorage.getItem('home_inplay_open')==='1'; }catch(e){ return false; } })(), PLAYALL=false;
function showPlay(){
 const A=away(), now=new Date().toISOString();
 const S=Sh.all().filter(x=>!A.includes('s:'+x.id)&&!(window.DailyScenes&&DailyScenes.isPractice(x.file)));
 const R=I.all('request').filter(x=>x.data.due&&x.data.due>=now.slice(0,16)&&!A.includes('r:'+x.id)).sort((a,b)=>String(a.data.due).localeCompare(String(b.data.due)));
 const D=I.all('draft').filter(x=>!A.includes('d:'+x.id));
 document.body.classList.toggle('has',!!(Sh.all().length||I.all('request').length||I.all('draft').length||(Y&&Y.has())));
 const box=$('inplay'); if(!box) return;
 if(!S.length&&!R.length&&!D.length){ box.innerHTML=''; return; }
 const dw=x=>x.data.dueObj?HubReq.dueWords(x.data.dueObj):(x.data.dueWords||'');
 const pl=(n,w)=>n+' '+w+(n===1?'':'s');
 const soon=R.find(x=>Date.parse(x.data.due)-Date.now()<48*3600e3);
 const bits=[R.length?pl(R.length,'tape')+' due':'',S.length?S.length+' side'+(S.length===1?'':'s'):'',D.length?pl(D.length,'draft'):''].filter(Boolean);
 const cap=n=>PLAYALL?n:3;
 let rows='';
 R.slice(0,cap(R.length)).forEach(x=>{ rows+='<div class="ip"><span><b>Tape due</b> '+esc(dw(x))+'<br><small>'+esc([x.data.title,x.data.role].filter(Boolean).join(' · '))+'</small></span><span class="go"><a href="hub/">HUB</a><a href="actor-os/">TAPE IT</a><button type="button" data-away="r:'+esc(x.id)+'">PUT AWAY</button></span></div>'; });
 S.slice(0,cap(S.length)).forEach((it,k)=>{ rows+='<div class="ip"><span><b>'+(k===0?'Sides now':'Sides')+'</b> '+esc(plain(it.file))+'<br><small>'+(it.me?'You: '+esc(it.me):'No part picked yet')+'</small></span><span class="go"><a href="actor-os/">READ</a><a href="memorizer/">LEARN</a><a href="breakdown/">BREAK DOWN</a><button type="button" data-away="s:'+esc(it.id)+'">PUT AWAY</button></span></div>'; });
 D.slice(0,cap(D.length)).forEach(x=>{ rows+='<div class="ip"><span><b>Draft</b> '+esc(plain(x.data.file))+'</span><span class="go"><a href="papertrail/">PAPER TRAIL</a><a href="film/">STORY STUDIO</a><button type="button" data-away="d:'+esc(x.id)+'">PUT AWAY</button></span></div>'; });
 const more=Math.max(0,R.length-3)+Math.max(0,S.length-3)+Math.max(0,D.length-3);
 box.innerHTML='<details id="ipd"'+(PLAYOPEN?' open':'')+'><summary><b>IN PLAY</b> · '+esc(bits.join(' · '))+(soon?'<span class="ipsoon">Tape due '+esc(dw(soon))+(soon.data.title?': '+esc(soon.data.title):'')+'</span>':'')+'</summary>'
  +'<p class="ipwhat">What you’ve brought in that’s still live: tapes due, sides, drafts. Newest first. PUT AWAY takes one off this list; the tools keep it.</p>'
  +rows+(more&&!PLAYALL?'<button type="button" class="ipmore" id="ipmore">and '+more+' older</button>':'')+'</details>';
 const d=$('ipd'); d.ontoggle=()=>{ PLAYOPEN=d.open; try{ sessionStorage.setItem('home_inplay_open',d.open?'1':'0'); }catch(e){} };
 box.querySelectorAll('[data-away]').forEach(b=>b.onclick=()=>putAway(b.dataset.away));
 const m=$('ipmore'); if(m) m.onclick=()=>{ PLAYALL=true; showPlay(); };
}

async function take(files,pasted,fromFolder,opts){
 const items=[];
 for(let i=0;i<files.length;i++){ if(fromFolder) $('foldnote').innerHTML='<p>Reading '+(i+1)+' of '+files.length+'…</p>'; items.push(await readOne(files[i])); }
 if(opts&&opts.asResume) items.forEach(x=>{ if(x.kind!=='resume'&&x.fk!=='image'&&x.fk!=='media'){ x.kind='resume'; x.why=['you said it is your résumé']; try{ x.profile=x.text?X.resumeRead(x.rows||X.rowsOfText(x.text)):null; }catch(e){ x.profile=null; } } });
 if(pasted&&pasted.trim()){ const w=X.what(pasted); items.push({name:'Pasted '+(w.kind==='request'?'request':w.kind==='script'?'script':'sides'),text:pasted,kind:w.kind,why:w.why,req:w.req||null,script:w.script||null,fk:'text'}); }
 if(!items.length) return;
 await route(items);
 // from a folder: only the actor things get a card; the rest is counted and left alone
 let left=0; if(fromFolder){ const n=items.length; for(let i=items.length-1;i>=0;i--) if(['other','unknown'].includes(items[i].kind)){ items.splice(i,1); } left=n-items.length; }
 if(fromFolder&&FOLD){ FOLD.left=(FOLD.left||0)+left; folderNote(); }
 if(!items.length){ return; }
 // requests read first in the cards: they explain the rest
 LAST=items.sort((a,b)=>(a.kind==='request'?0:1)-(b.kind==='request'?0:1));
 // a résumé or headshot just landed: open your profile so you see it
 if(items.some(x=>(x.kind==='image'&&x.photo&&!x.dup)||(x.kind==='resume'&&x.changed&&x.changed.length))) YOPEN=true;
 showTook(); showPlay(); showYou();
 $('took').scrollIntoView({block:'nearest',behavior:'smooth'});
}

/* ---------- a whole folder (desktop): newest likely files first, 40 at a time ---------- */
let FOLD=null;
function folderNote(){ const box=$('foldnote'); if(!box||!FOLD) return; const r=FOLD.r, done=FOLD.done, left=FOLD.left||0;
 const skip=[r.junk&&r.junk+' download junk',r.media&&r.media+' video or audio (left where it is)',r.images&&r.images+' picture'+(r.images===1?'':'s')+' not named as a headshot',r.other&&r.other+' other file'+(r.other===1?'':'s')].filter(Boolean);
 let h='<p><b>'+esc(FOLD.name)+'</b>: '+r.total+' file'+(r.total===1?'':'s')+'. '+(FOLD.queue.length?'Read the '+done+' newest likely one'+(done===1?'':'s')+' ('+FOLD.queue.length+' older still to read).':'Read '+(done===1?'the one likely file.':'all '+done+' likely ones.'))
  +(left?' '+left+' of them weren\'t sides, scripts, requests or a résumé, so they were left alone.':'')+'</p>'
  +(skip.length?'<p class="dirwhy">Skipped: '+esc(skip.join(', '))+'. Nothing in the folder is moved or changed.</p>':'');
 if(FOLD.queue.length) h+='<button class="pastego" id="foldmore">READ THE NEXT '+Math.min(40,FOLD.queue.length)+'</button>';
 box.innerHTML=h; const m=$('foldmore'); if(m) m.onclick=()=>{ const next=FOLD.queue.splice(0,40); FOLD.done+=next.length; take(next,'',true); };
}
const di=$('dirfile'), pd=$('pickdir');
if(di&&pd&&('webkitdirectory' in di)&&!(matchMedia&&matchMedia('(pointer:coarse)').matches)){ pd.hidden=false; $('dirwhy').hidden=false;
 pd.onclick=e=>{ e.preventDefault(); di.click(); };
 di.onchange=()=>{ const fl=[...di.files]; di.value=''; if(!fl.length) return; const r=X.folder(fl,40);
  FOLD={r,queue:r.later.slice(),done:r.take.length,name:String(fl[0].webkitRelativePath||'').split('/')[0]||'Your folder'};
  if(!r.take.length){ folderNote(); return; } take(r.take,'',true); };
}
const drop=$('drop'), fi=$('dropfile');
fi.onchange=()=>{ const fl=[...fi.files]; fi.value=''; take(fl,''); };
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop',e=>{ const fl=[...(e.dataTransfer&&e.dataTransfer.files||[])]; if(fl.length) take(fl,''); else { const t=e.dataTransfer&&e.dataTransfer.getData('text'); if(t) take([],t); } });
$('pastego').onclick=()=>{ const t=$('pastebox').value; if(!t.trim()) return; take([],t); $('pastebox').value=''; };
window.addEventListener('storage',e=>{ if(e.key&&/shelf|inbox/.test(e.key)) showPlay(); });
showPlay(); showYou();
window.__home={take,route,readOne};
})();
