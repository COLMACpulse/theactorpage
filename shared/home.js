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
const X=window.Intake, Sh=window.Shelf, I=window.Inbox;
if(!X||!Sh||!I||!$('drop')) return;
const KIND={sides:'Sides',script:'Script',request:'Self-tape request',media:'Footage',image:'Photo',other:'Not placed',unknown:'Not placed'};
const plain=n=>String(n||'').replace(/\.[a-z0-9]{2,8}$/i,'').replace(/_/g,' ');
let LAST=[];   // what came in this time, for the cards

/* ---------- read one thing ---------- */
async function readOne(f){
 const k=X.fileKind(f), o={name:f.name, file:f, fk:k};
 try{
  if(k==='media'){ o.kind='media'; return o; }
  if(k==='image'){ o.kind='image'; o.why=['photos aren\'t used here yet']; return o; }
  if(k==='other'){ o.kind='other'; o.why=['not a file this site reads yet']; return o; }
  if(k==='pdf'){
   const ex=await ActorPDF.extract(await f.arrayBuffer());
   if(ex.encrypted&&!ex.chars){ o.kind='unknown'; o.why=['a protected PDF: open it, select all, copy, and paste it below']; return o; }
   if(!ex.chars){ o.kind='unknown'; o.why=['pictures of pages, no text in them: paste the words below']; return o; }
   o.text=ActorPDF.toSides(ex.lines); o.struck=ex.struck||0;
   const raw=(ex.lines||[]).map(l=>l.text).join('\n'), mk=ActorPDF.findMarkers(ActorPDF.clean(ex.lines));
   o.pdf={pages:(ex.pages||[]).length, sides:/Sides by Breakdown Services|^\s*Role:\s/im.test(raw)||o.struck>0||mk.start>=0};
   o.rawText=raw;
  }
  else if(k==='docx') o.text=await X.docxText(await f.arrayBuffer());
  else { const t=await f.text(); o.text=(k==='fdx'||/^\s*<\?xml[\s\S]{0,200}<FinalDraft/i.test(t))?ActorSides.fromFdx(t):t; }
  const w=X.what(o.text,o.pdf);
  // a PDF that is a request (an Eco Cast page saved as PDF) reads better from its raw text
  if(o.pdf&&w.kind!=='request'&&o.rawText){ const w2=X.what(o.rawText); if(w2.kind==='request'){ Object.assign(o,{kind:'request',why:w2.why,req:w2.req,text:o.rawText}); return o; } }
  Object.assign(o,{kind:w.kind,why:w.why,req:w.req||null,script:w.script||null});
 }catch(e){ o.kind='unknown'; o.why=['could not read it: '+(e&&e.message||e)]; }
 return o;
}

/* ---------- send it where it goes ---------- */
function reqKey(r){ return [r.title||r.show,r.role,(r.castingDirectors||[]).join(',')].map(x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'')).join('|'); }
function route(items){
 const reqs=items.filter(x=>x.kind==='request'&&x.req);
 // requests first: the Hub's inbox, your name for the slate
 reqs.forEach(x=>{ const r=x.req;
  const it=I.put('request',{raw:x.text,file:x.name,title:r.title||r.show||'',role:r.role||'',due:r.due?(r.due.utc||r.due.local||''):'',dueObj:r.due||null,dueWords:HubReq.dueWords(r.due),sides:r.sides||[]},reqKey(r));
  x.went='In the Hub next time you open it.'; x.inboxId=it.id;
  if(r.invitedActor){ try{ if(!localStorage.getItem('actor_os_name')){ localStorage.setItem('actor_os_name',r.invitedActor); x.named=r.invitedActor; } }catch(e){} }
 });
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
  x.went=x.kind==='sides'?'On the sides shelf: every ACT tool has it.':'On the sides shelf, and in Paper Trail next time you open it.';
  if(x.kind==='script') I.put('draft',{text:x.text,file:x.name},'draft|'+x.name+'|'+x.text.length);
 });
 const media=items.filter(x=>x.kind==='media');
 if(media.length) media.forEach(x=>{ x.went='A page can\'t keep video, so Story Studio reads it from your footage folder when you open its footage check.'; });
 items.filter(x=>['image','other','unknown'].includes(x.kind)).forEach(x=>{ x.went='Not placed: '+(x.why||[]).join('; ')+'.'; });
}

/* ---------- show it ---------- */
function card(x,i){
 const u=X.unlocks(x.kind,{me:x.me,name:x.named});
 let h='<div class="tk k-'+x.kind+'"><h4>'+esc(KIND[x.kind]||x.kind)+': '+esc(x.kind==='request'&&x.req?(x.req.title||x.req.show||plain(x.name))+(x.req.role?' · '+x.req.role:''):plain(x.name))+'</h4>';
 if(x.why&&x.why.length&&!['image','other','unknown'].includes(x.kind)) h+='<div class="why">Read as '+esc(x.why.join(', '))+(x.struck?'. '+x.struck+' crossed-out line'+(x.struck===1?'':'s')+' left out':'')+'.</div>';
 if(x.kind==='request'&&x.req) h+='<div class="why">Tape due: '+esc(HubReq.dueWords(x.req.due))+'</div>'+(x.named?'<div class="why">Your name for the slate: '+esc(x.named)+'.</div>':'');
 h+='<div class="went">'+esc(x.went||'')+'</div>';
 if(x.shelfId&&x.parts&&x.parts.length){
  h+='<div class="why" style="margin-top:6px">'+(x.me?'Your part: <b>'+esc(x.me)+'</b>'+(x.meFrom?' (from '+esc(x.meFrom)+')':'')+'. Tap another to change it.':'Which part is yours? One tap, and every tool knows.')+'</div><div class="parts">'
   +x.parts.map(p=>'<button data-part="'+i+'|'+esc(p.name)+'" class="'+(p.name===x.me?'on':'')+'">'+esc(p.name)+' <small>'+p.lines+'</small></button>').join('')+'</div>';
 }
 if(u.length) h+='<ul>'+u.map(([t,w,href])=>'<li><a href="'+href+'">'+esc(t.toUpperCase())+'</a> '+esc(w)+'</li>').join('')+'</ul>';
 return h+'</div>';
}
function showTook(){ $('took').innerHTML=LAST.map(card).join('');
 document.querySelectorAll('[data-part]').forEach(b=>b.onclick=()=>{ const [i,name]=b.dataset.part.split('|'); const x=LAST[+i]; if(!x||!x.shelfId) return; Sh.setMe(x.shelfId,name,'home'); x.me=name; x.meFrom=''; showTook(); showPlay(); }); }
function showPlay(){
 const S=Sh.all().slice(0,4), R=I.all('request').filter(x=>x.data.due).sort((a,b)=>String(a.data.due).localeCompare(String(b.data.due))), D=I.all('draft').slice(0,3);
 const now=new Date().toISOString(), up=R.filter(x=>x.data.due>=now.slice(0,16)).slice(0,3);
 document.body.classList.toggle('has',!!(S.length||R.length||D.length));
 if(!S.length&&!up.length&&!D.length){ $('inplay').innerHTML=''; return; }
 let h='<h3>IN PLAY</h3>';
 up.forEach(x=>{ const dw=x.data.dueObj?HubReq.dueWords(x.data.dueObj):(x.data.dueWords||''); h+='<div class="ip"><span><b>Tape due</b> '+esc(dw)+'<br><small>'+esc([x.data.title,x.data.role].filter(Boolean).join(' · '))+'</small></span><span class="go"><a href="hub/">HUB</a><a href="actor-os/">TAPE IT</a></span></div>'; });
 S.forEach((it,k)=>{ h+='<div class="ip"><span><b>'+(k===0?'Sides now':'Sides')+'</b> '+esc(plain(it.file))+'<br><small>'+(it.me?'You: '+esc(it.me):'No part picked yet')+'</small></span><span class="go"><a href="actor-os/">READ</a><a href="memorizer/">LEARN</a><a href="breakdown/">BREAK DOWN</a></span></div>'; });
 D.forEach(x=>{ h+='<div class="ip"><span><b>Draft</b> '+esc(plain(x.data.file))+'</span><span class="go"><a href="papertrail/">PAPER TRAIL</a><a href="film/">STORY STUDIO</a></span></div>'; });
 $('inplay').innerHTML=h;
}

async function take(files,pasted){
 const items=[];
 for(const f of files) items.push(await readOne(f));
 if(pasted&&pasted.trim()){ const w=X.what(pasted); items.push({name:'Pasted '+(w.kind==='request'?'request':w.kind==='script'?'script':'sides'),text:pasted,kind:w.kind,why:w.why,req:w.req||null,script:w.script||null,fk:'text'}); }
 if(!items.length) return;
 route(items);
 // requests read first in the cards: they explain the rest
 LAST=items.sort((a,b)=>(a.kind==='request'?0:1)-(b.kind==='request'?0:1));
 showTook(); showPlay();
 $('took').scrollIntoView({block:'nearest',behavior:'smooth'});
}

const drop=$('drop'), fi=$('dropfile');
fi.onchange=()=>{ const fl=[...fi.files]; fi.value=''; take(fl,''); };
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop',e=>{ const fl=[...(e.dataTransfer&&e.dataTransfer.files||[])]; if(fl.length) take(fl,''); else { const t=e.dataTransfer&&e.dataTransfer.getData('text'); if(t) take([],t); } });
$('pastego').onclick=()=>{ const t=$('pastebox').value; if(!t.trim()) return; take([],t); $('pastebox').value=''; };
window.addEventListener('storage',e=>{ if(e.key&&/shelf|inbox/.test(e.key)) showPlay(); });
showPlay();
window.__home={take,route,readOne};
})();
