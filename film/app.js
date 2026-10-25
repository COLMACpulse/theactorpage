/* STORY STUDIO app. Everything stays on this phone (localStorage 'film_os_v1').
   Scripts come off the sides shelf, so anything you dropped in an ACT tool is here. */
(function(){
const F=window.FilmOS, S=window.ActorSides, SH=window.Shelf;
const KEY='film_os_v1', TOOL='film';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

let DB=load(); let TAB='script', OPEN=null, SCENES=[], MSG='', OEDIT=null;
const H=window.FilmHub;
let START={kind:'reel',who:'solo'}, OPENP=false, EXT=null, ASKED=false;
/* scout photos: IndexedDB 'film_os' / 'photos', this phone only */
function idb(){ return new Promise(res=>{ try{ const r=indexedDB.open('film_os',1); r.onupgradeneeded=()=>r.result.createObjectStore('photos'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); }
async function putPhoto(id,blob){ const d=await idb(); if(!d) return false; return new Promise(res=>{ const x=d.transaction('photos','readwrite'); x.objectStore('photos').put(blob,id); x.oncomplete=()=>res(true); x.onerror=()=>res(false); }); }
async function getPhoto(id){ const d=await idb(); if(!d) return null; return new Promise(res=>{ const r=d.transaction('photos','readonly').objectStore('photos').get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }
async function delPhoto(id){ const d=await idb(); if(d) try{ d.transaction('photos','readwrite').objectStore('photos').delete(id); }catch(e){} }
const URLS={};
async function fillPhotos(){ for(const im of document.querySelectorAll('img[data-photo]')){ const id=im.dataset.photo; if(!URLS[id]){ const b=await getPhoto(id); if(b) URLS[id]=URL.createObjectURL(b); } if(URLS[id]) im.src=URLS[id]; else im.alt='photo not on this phone'; } }
/* a phone photo is 3 to 12 MB; keep a 1600 px JPEG */
async function shrink(file){
 try{ const bm=await createImageBitmap(file); const k=Math.min(1,1600/Math.max(bm.width,bm.height)); const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k);
  c.getContext('2d').drawImage(bm,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(b=>r(b||file),'image/jpeg',0.85)); }catch(e){ return file; }
}
const day=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+', '+new Date(t).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.scripts) return d; }catch(e){} return {cur:'',scripts:{},owned:null}; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); }catch(e){ toast('This phone would not save. Your work may not be kept.'); } }
let tt; function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),2600); }

function cur(){ return DB.cur?DB.scripts[DB.cur]:null; }
function owned(){ return DB.owned||[]; }
function st(n){ const c=cur(); c.scenes=c.scenes||{}; c.scenes[n]=c.scenes[n]||{way:'',where:'',done:{},cont:{}}; return c.scenes[n]; }

/* ---------- getting a script in ---------- */
function open(id,text,file,me){
 DB.scripts[id]=DB.scripts[id]||{file:file||'Script',scenes:{}};
 const c=DB.scripts[id]; c.text=text; c.file=file||c.file; if(me&&!c.me) c.me=me;
 DB.cur=id; SCENES=F.scenes(text); c.at=Date.now();
 if(TAB==='start'){ c.kind=START.kind; c.who=START.who;
  if(START.who==='crew') SCENES.forEach(sc=>{ c.scenes[sc.n]=c.scenes[sc.n]||{way:'',where:'',done:{},cont:{}}; if(!c.scenes[sc.n].way) c.scenes[sc.n].way='crew'; }); }
 OPENP=false; save();
}
function take(text,file,f){
 MSG='';
 const sc=F.scenes(text);
 if(!sc.length){ MSG='<b>No scenes found.</b> Scene headings start with INT. or EXT., and names sit on their own line above the dialogue.'; render(); return; }
 let id='p'+Date.now().toString(36), me='';
 if(SH){ const it=SH.put({text:text,file:file||'Pasted script',fileSig:f?SH.sig(f):'',from:'STORY STUDIO',tool:TOOL,kind:'script'}); if(it){ id=it.id; me=it.me||''; if(it.text) text=it.text; if(f) SH.putFile(it.id,f); } }
 open(id,text,file,me);
 toast(SCENES.length+' scene'+(SCENES.length===1?'':'s')+' from '+(file||'your script')+'.');
 TAB='scenes'; OPEN=null; render();
}
async function readFile(f){
 MSG='';
 const name=f.name||'script';
 try{
  if(/\.pdf$/i.test(name)||f.type==='application/pdf'){
   MSG='Reading '+esc(name)+'…'; render();
   const ex=await window.ActorPDF.extract(await f.arrayBuffer());
   if(ex.encrypted&&!ex.chars){ MSG='<b>That PDF is protected.</b> Open it, select all, copy, and paste it below.'; render(); return; }
   if(!ex.chars){ MSG='<b>No text in that PDF.</b> It\'s pictures of pages. Paste the script below instead.'; render(); return; }
   take(window.ActorPDF.toSides(ex.lines),name,f); return;
  }
  let t=await f.text();
  if(/^\s*<\?xml|<FinalDraft/i.test(t)) t=fdx(t);
  take(t,name,f);
 }catch(e){ MSG='<b>Could not read that file.</b> '+esc(e.message); render(); }
}
function fdx(xml){ return window.ActorSides.fromFdx(xml); }   // one Final Draft reader, in ../actor-os/sides.js
function fromShelf(id){
 const it=SH&&SH.get(id); if(!it) return;
 SH.use(id,TOOL); open(it.id,it.text,it.file,it.me); TAB='scenes'; OPEN=null; render();
}
function adopt(){
 /* from BACKLOT: a start dealt from your ground, headings only. A new script, not on the actor's shelf. */
 let hf=null; try{ hf=JSON.parse(localStorage.getItem('theactorpage_handoff_film')||'null'); localStorage.removeItem('theactorpage_handoff_film'); }catch(e){}
 if(hf&&hf.text&&F.scenes(hf.text).length){ ASKED=true; open('b'+Date.now().toString(36),hf.text,hf.title||'From the ground',''); TAB='scenes'; setTimeout(()=>toast('From BACKLOT: '+(hf.title||'a start')+'.'),300); return; }
 if(!SH) return;
 const p=SH.pending(TOOL);
 if(p){ ASKED=true; SH.markSeen(TOOL,p.id); open(p.id,p.text,p.file,p.me); TAB='scenes';
   setTimeout(()=>toast('New script: '+SH.label(p)+'.'),300); return; }
 // opened from FILM HUB: ../film/#open=<script id>
 const hm=String(location.hash||'').match(/^#open=([^&]+)(?:&tab=(\w+))?$/); if(hm){ const id=decodeURIComponent(hm[1]); if(DB.scripts[id]){ ASKED=true; DB.cur=id; DB.scripts[id].at=Date.now(); save(); TAB=['out','cut','set','day'].includes(hm[2])?hm[2]:'scenes'; } try{ history.replaceState(null,'',location.pathname); }catch(e){} }
 const c=cur(); if(c&&c.text) SCENES=F.scenes(c.text);
}

/* ---------- the rooms: PREP (script, scenes, what you own, the days), ON SET (today), POST (the cut, the pack) ---------- */
const ROOMS={prep:[['script','SCRIPT'],['shots','SHOT LIST'],['scenes','SCENES'],['own','OWNED'],['day','DAYS']],set:[['set','TODAY'],['tools','TOOLS']],post:[['cut','CUT']],out:[['out','OUT']]};
const ROOMNAME={prep:'PLAN',set:'SHOOT',post:'FINISH',out:'OUT'};
const roomOf=t=>Object.keys(ROOMS).find(r=>ROOMS[r].some(x=>x[0]===t))||'prep';
const LASTIN={prep:'scenes',set:'set',post:'cut',out:'out'};
/* ---------- views ---------- */
function render(){
 clearInterval(EXT);
 const room=roomOf(TAB); if(TAB!=='start') LASTIN[room]=TAB; if(TAB!=='tools') kitStop();
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',TAB!=='start'&&b.dataset.r===room));
 $('roomname').textContent=TAB==='start'?'START':ROOMNAME[room];
 $('sub').innerHTML=TAB!=='start'&&ROOMS[room].length>1?ROOMS[room].map(([t,l])=>'<button data-t="'+t+'"'+(t===TAB?' class="on"':'')+'>'+l+'</button>').join(''):'';
 $('sub').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ TAB=b.dataset.t; if(TAB!=='scenes') OPEN=null; OEDIT=null; render(); });
 const c=cur();
 $('title').textContent=c?String(c.file||'Script').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/_/g,' '):TAB==='start'?'Start a film':'Make your own';
 paintRooms(c);
 $('count').textContent=c?SCENES.length+' scene'+(SCENES.length===1?'':'s')+(c.me?' · you are '+c.me:''):'';
 const m=$('main'), TOP=(!c||TAB==='start'||OPENP)?topBar():'';
 if(c&&TAB!=='start'){ const n=films().length; $('count').innerHTML=esc($('count').textContent)+' · <button type="button" class="hlnk" id="hfilms" aria-expanded="'+OPENP+'">Your films · '+n+'</button>'; }
 if(TAB==='start') m.innerHTML=TOP+vStart();
 else if(!c&&['script','scenes','day','set','out'].includes(TAB)) m.innerHTML=TOP+vExample();
 else if(TAB==='out') m.innerHTML=TOP+vOut();
 else if(TAB==='script') m.innerHTML=TOP+vScript();
 else if(!c&&TAB==='cut') m.innerHTML=logBox()+'<div class="msg">'+(DB.log?'Or bring in the script first, and the log goes on its scenes.':'No script yet. Open your footage log above and make the scenes from it, or bring in the script.')+'</div><button class="btn block" data-go="script">SCRIPT</button>';
 else if(TAB==='shots') m.innerHTML=vShots();
 else if(TAB==='tools') m.innerHTML=vTools();
 else if(!c&&TAB!=='own') m.innerHTML='<div class="msg">Bring in a script first.</div><button class="btn pri block" data-go="script">SCRIPT</button>';
 else if(TAB==='scenes') m.innerHTML=OPEN?vScene(OPEN):vScenes();
 else if(TAB==='own') m.innerHTML=vOwn();
 else if(TAB==='day') m.innerHTML=vDay();
 else if(TAB==='cut') m.innerHTML=vCut();
 else if(TAB==='set') m.innerHTML=vSet();
 if(TOP&&!m.querySelector('.tops')) m.insertAdjacentHTML('afterbegin',TOP);
 wire(); if(m.querySelector('#exsteps')) playExample();
 window.scrollTo(0,0);
}
/* ---------- the front door ---------- */
const kindName=k=>({reel:'A scene for your reel',short:'A short',sketch:'A sketch'})[k]||'';
function titleOf(c){ return H?H.title(c):String((c&&c.file)||'Script').replace(/\.(pdf|txt|fountain|fdx|docx)$/i,'').replace(/_/g,' '); }
function films(){ return Object.keys(DB.scripts).map(id=>Object.assign({id},DB.scripts[id])).filter(c=>c.text).sort((a,b)=>(b.at||0)-(a.at||0)); }
function pathOf(c){ return H?H.path(H.status(c,F),c):[]; }
function paintRooms(c){
 const P=c?pathOf(c):[], x=c&&H?H.status(c,F):null;
 const short=[x&&x.scenes?x.planned+'/'+x.scenes:'', x&&x.shots?x.shotsDone+'/'+x.shots:x&&x.takes?x.takes+' takes':'',
  c&&c.cut&&c.cut.final?F.mmss(c.cut.final.secs):'', c&&H?H.OUTS.filter(k=>c.out&&c.out[k]).length+' of '+H.OUTS.length:''];
 ['prep','set','post','out'].forEach((r,i)=>{ const el=document.querySelector('[data-rs="'+r+'"]'); if(el) el.textContent=c?(P[i]&&P[i].done?(i===3||i===2?'✓ '+short[i]:'✓').trim():short[i]):''; });
 const sn=c?(LASTSCENE||(SCENES[0]&&SCENES[0].n)||1):3, tk=c?takesIn(sn)+1:4;
 if($('hsc')) $('hsc').textContent=sn; if($('htk')) $('htk').textContent=tk;
}
function pathHtml(c){ return '<div class="path">'+pathOf(c).map(x=>'<span class="'+(x.now?'now':x.done?'y':'')+'">'+x.label+(x.done?' ✓':x.now?' · '+esc(x.words):'')+'</span>').join('')+'</div>'; }
function topBar(){
 const L=films();
 let h='<div class="tops"><button type="button" class="tpill'+(OPENP?' on':'')+'" id="yourfilms" aria-expanded="'+OPENP+'">YOUR FILMS <i>'+L.length+'</i></button>'
  +'<button type="button" class="tpill add'+(TAB==='start'?' on':'')+'" id="startfilm">+ START A FILM</button></div>';
 if(OPENP){ h+='<div class="fpanel"><p class="kicker" style="margin:0 2px">'+(L.length?'Every film you\'ve started here':'Nothing yet')+'</p>';
  if(!L.length) h+='<p class="dim" style="margin:0 2px;font-size:14px">Tap + START A FILM.</p>';
  h+=L.map(c=>{ const now=c.id===DB.cur, last=!DB.cur&&c.id===DB.last;
   return '<div class="frow"><div style="min-width:0"><b>'+esc(titleOf(c))+'</b><small>'+esc([kindName(c.kind),c.who==='crew'?'with a crew':c.who==='solo'?'solo':'',last?'where you left off':''].filter(Boolean).join(' · ')||'A film')+'</small>'+pathHtml(c)+'</div>'
    +'<button class="btn sm'+(last?' pri':'')+'" data-film="'+esc(c.id)+'"'+(last?' id="pickup"':'')+'>'+(now?'OPEN NOW':last?'PICK UP':'OPEN')+'</button></div>'; }).join('');
  h+='<a class="lnk" href="../filmhub/" style="align-self:flex-start;margin:0 2px">ALL IN FILM HUB ›</a></div>'; }
 return h;
}
function vExample(){
 return '<div class="work"><div class="exhead"><span class="kicker">EXAMPLE · HOW IT WORKS</span><span class="dim" id="excap" style="font-size:13.5px"></span></div>'
  +'<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><b style="font:700 17px var(--mono)">SALT ROAD · scene 3</b><span class="dim" style="font-size:13.5px">a scene for your reel · solo · a made-up example</span></div>'
  +'<div class="steps" id="exsteps">'
  +'<div class="step" data-ex="0"><b>1 PLAN</b><span>Shot list, shoot day, call sheet</span><div class="ln"><i class="y"></i>1 WIDE · kitchen</div><div class="ln"><i class="y"></i>2 CLOSE · JUNE</div><div class="ln"><i class="y"></i>3 INSERT · keys</div></div>'
  +'<div class="step" data-ex="1"><b>2 SHOOT</b><span>Takes, the slate, match camera</span><div class="ln"><i class="y"></i>1 WIDE · take 2</div><div class="ln"><i id="exd2"></i>2 CLOSE · take <span id="extk">3</span></div><div class="ln"><i></i>3 INSERT</div></div>'
  +'<div class="step" data-ex="2"><b>3 FINISH</b><span>Rough cut, a line again, your editor\'s pack</span><div class="ln">ROUGH CUT · 1:42</div></div>'
  +'<div class="step" data-ex="3"><b>4 OUT</b><span>Back to YOU, where it gets seen</span><div class="ln"><i class="y"></i>Your reel</div><div class="ln"><i class="y"></i>Your page</div><div class="ln"><i></i>A postcard</div></div></div>'
  +'<div class="row"><button class="btn pri" id="exstart">START A FILM</button><button class="btn" id="exfilms">YOUR FILMS</button></div>'
  +'<p class="faint" style="font-size:12.5px;margin:10px 0 0">The example plays when nothing is open. Start a film and yours takes its place.</p></div>'
  +'<p class="faint" style="font-size:13px;margin:12px 0 0">Shot your own? Before you erase a camera card, <a href="../footage/check.html" id="excheck">CHECK THE COPY</a>: every file on your copies, matched to the card.</p>';
}
function playExample(){
 const cap=['Plan: the shot list from your script, matched to what you own','Shoot: slate it, mark the take that goes','Finish: cut it on the phone, or hand your editor a pack','Out: the cut lands on your reel, your page, a postcard'];
 let i=0; const paint=()=>{ const box=$('exsteps'); if(!box){ clearInterval(EXT); return; } const k=i%4;
  box.querySelectorAll('[data-ex]').forEach(e=>e.classList.toggle('on',+e.dataset.ex===k)); $('excap').textContent=cap[k];
  const d=$('exd2'); if(d) d.className=k>=1?'y':''; const t=$('extk'); if(t) t.textContent=k>=1?'4':'3'; i++; };
 paint(); if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)) EXT=setInterval(paint,2200);
}
function vStart(){
 const o=(on,attr,b,sm)=>'<button type="button" class="opt'+(on?' on':'')+'" '+attr+' aria-pressed="'+on+'"><b>'+b+'</b><small>'+sm+'</small></button>';
 let h='<div class="work"><p class="kicker">1 · What are you making?</p><div class="opts">'
  +o(START.kind==='reel','data-kind="reel"','A SCENE FOR YOUR REEL','One scene, shot to show what you do')
  +o(START.kind==='short','data-kind="short"','A SHORT','A whole story, a few scenes')
  +o(START.kind==='sketch','data-kind="sketch"','A SKETCH','Funny, quick, for your socials')+'</div>'
  +'<p class="kicker">2 · Who\'s making it?</p><div class="opts">'
  +o(START.who==='solo','data-who="solo"','SOLO','You and a phone. Play every part, or turn the others into a shoulder and a voice.')
  +o(START.who==='crew','data-who="crew"','WITH A CREW','A call sheet for them, a pack for your editor.')+'</div>'
  +'<p class="kicker">3 · The script</p>';
 if(MSG) h+='<div class="msg'+(/<b>/.test(MSG)?' bad':'')+'">'+MSG+'</div>';
 const list=(SH?SH.all():[]).filter(it=>!(window.DailyScenes&&DailyScenes.isPractice&&DailyScenes.isPractice(it.file)));
 h+=list.map(it=>'<div class="frow" style="margin-bottom:6px"><div style="min-width:0"><b>'+esc(SH.label(it))+'</b><small>'+esc(/blockage|THEACTORPAGES/i.test(it.from||'')?'From THEACTORPAGES':'From your shelf'+(it.from?' · '+it.from:''))+' · '+F.scenes(it.text).length+' scenes</small></div><button class="btn sm" data-shelf="'+esc(it.id)+'">USE IT</button></div>').join('');
 h+='<div class="drop" id="drop" style="margin-top:8px"><b>DROP A SCRIPT</b><span class="dim">PDF, Final Draft, Fountain or text. Or tap to pick one.</span></div>'
  +'<textarea class="field" id="paste" placeholder="Or paste it here"></textarea><button class="btn block" id="readit" style="margin-top:8px">READ IT</button>'
  +'<p class="faint" style="font-size:13px;margin:12px 0 0" id="startsum">'+esc(kindName(START.kind))+', '+(START.who==='solo'?'solo':'with a crew')+'. Pick the script and you\'re planning. You can change either later.</p></div>';
 return h;
}
/* ---------- OUT: the cut, back to YOU. One tap each; nothing goes anywhere until you tap it. ---------- */
let FINALURL='';
function outOf(){ const c=cur(); c.out=c.out||{}; return c.out; }
function finalOf(){ const c=cur(); return c&&c.cut&&c.cut.final||null; }
async function finalBlob(){ return DB.cur?await getPhoto('final:'+DB.cur):null; }
async function keepFinal(blob,name,secs,from){ const c=cur(); if(!c) return false; if(!(await putPhoto('final:'+DB.cur,blob))){ toast('This phone would not keep the cut. Save the file instead.'); return false; }
 cutOf().final={name,secs:Math.round((secs||0)*10)/10,size:blob.size,mime:blob.type,at:Date.now(),from}; if(FINALURL){ URL.revokeObjectURL(FINALURL); FINALURL=''; } save(); return true; }
const DESTS=[
 ['footage','FOOTAGE','In your Footage list, with the clip','PUT IT IN'],
 ['reel','YOUR REEL','A reel clip in your Project Hub','ADD IT'],
 ['page','YOUR PAGE','Under your work, with the title','PUT IT ON'],
 ['package','A PACKAGE','For an agent, or for casting','BUILD ONE'],
 ['postcard','A POSTCARD','To casting, or to your socials','MAKE ONE'],
 ['file','THE FILE','Save the video to this phone or computer','SAVE IT']];
function vOut(){
 const f=finalOf(), o=outOf(), when=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
 let h='<div class="work">';
 if(!f){ return h+'<p class="kicker">Your cut goes here</p><p class="dim" style="margin:0 0 12px">Make the rough cut in FINISH, or bring in the finished film from your editor. Then it goes out from here.</p>'
  +'<div class="row"><button class="btn pri" data-go="cut">MAKE THE ROUGH CUT</button><label class="btn"><input type="file" accept="video/*,.mov,.mp4,.m4v,.webm" class="hide" id="outfile">BRING IN THE FINISHED FILM</label></div></div>'; }
 h+='<div class="cutbox"><video id="outvid" controls playsinline preload="metadata"></video><div><p class="kicker" style="margin:0 0 4px">4 · OUT</p><b style="font-size:19px">Your cut is ready. Where does it go?</b>'
  +'<p class="dim" style="font-size:14px;margin:4px 0 6px">'+esc(f.name)+' · '+F.mmss(f.secs)+' · '+(f.size/1048576).toFixed(1)+' MB'+(f.from==='file'?' · brought in':' · the rough cut')+'</p>'
  +'<p class="faint" style="font-size:13px;margin:0">Each place is one tap. Nothing goes anywhere until you tap it.</p>'
  +'<label class="lnk" style="display:inline-block;cursor:pointer">REPLACE IT<input type="file" accept="video/*,.mov,.mp4,.m4v,.webm" class="hide" id="outfile"></label></div></div>';
 h+='<div class="dests">'+DESTS.map(([k,b,sm,go])=>{ const done=o[k]&&k!=='package';
  return '<div class="dest" data-dest-row="'+k+'"><span><b>'+b+'</b><small>'+sm+'</small></span>'+(done?'<span class="ok">'+(k==='file'?'SAVED':k==='postcard'?'MADE':'DONE')+' ✓ '+when(o[k].at||o[k])+'</span>'+(k==='postcard'?'<a class="btn sm" href="../picture/?plug='+esc(o[k].id||'')+'">OPEN</a>':k==='file'?'<button class="btn sm ghost" data-dest="file">AGAIN</button>':''):'<button class="btn sm'+(k==='reel'||k==='page'?' pri':'')+'" data-dest="'+k+'">'+go+'</button>')+'</div>'; }).join('')+'</div>';
 if(o.page) h+='<p class="faint" style="font-size:13px;margin:10px 0 0">On your page through Film Hub, where you can add a poster, a logline and links. <a class="lnk" href="../filmhub/">FILM HUB ›</a></p>';
 return h+'</div>';
}
async function fillOut(){ const v=$('outvid'); if(!v) return; if(!FINALURL){ const b=await finalBlob(); if(!b){ v.replaceWith(Object.assign(document.createElement('p'),{className:'faint',textContent:'The file isn\'t on this device any more. Bring it in again.'})); return; } FINALURL=URL.createObjectURL(b); } v.src=FINALURL; }
async function sendOut(k){
 const c=cur(), f=finalOf(); if(!c||!f) return; const o=outOf(), title=titleOf(c);
 if(k==='package'){ location.href='../hub/?tab=package'; return; }
 if(k==='file'){ const b=await finalBlob(); if(!b) return toast('The file isn\'t on this device any more.'); const file=new File([b],f.name,{type:b.type});
  if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],title:f.name}); }catch(e){ return; } }
  else { const u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); }
  o.file={at:Date.now()}; save(); render(); return; }
 if(k==='footage'){ const FT=window.Footage; if(!FT) return toast('Footage isn\'t here.'); const j=FT.add({title,role:c.me||'',kind:c.kind==='sketch'?'web':'short',note:'Made in Story Studio'}); if(!j) return toast('Footage would not take it.');
  FT.addClip(j.id,{name:f.name,secs:f.secs}); o.footage={at:Date.now(),job:j.id}; save(); render(); toast('In Footage: '+title+'.'); return; }
 if(k==='reel'){ const T=window.Takes, b=await finalBlob(); if(!T||!b) return toast(b?'The takes shelf isn\'t here.':'The file isn\'t on this device any more.');
  const ext=(f.name.match(/\.(\w+)$/)||[])[1]||(/webm/.test(b.type)?'webm':'mp4');
  try{ const it=await T.put(b,{kind:'video',mime:b.type,ext,name:f.name,secs:f.secs,for:{type:'clip',title,role:c.me||''}}); o.reel={at:Date.now(),take:it.id}; save(); render(); toast('A reel clip in your Project Hub.'); }catch(e){ toast('This phone would not keep it. Save the file instead.'); } return; }
 if(k==='page'){ let d=null; try{ d=JSON.parse(localStorage.getItem('filmhub_v1')||'null'); }catch(e){}
  d=d&&Array.isArray(d.films)?d:{films:[],studio:{},notes:[],me:{banner:'',about:'',email:'',into:[],want:[]}}; d.studio=d.studio||{};
  const x=d.studio[DB.cur]=d.studio[DB.cur]||{}; x.mark='done'; x.show=true; if(!x.runtime&&f.secs) x.runtime=Math.max(1,Math.round(f.secs/60))+' min'; if(!x.kind&&c.kind) x.kind=c.kind==='reel'?'Scene':c.kind==='sketch'?'Sketch':'Short';
  try{ localStorage.setItem('filmhub_v1',JSON.stringify(d)); }catch(e){ return toast('This phone would not save.'); }
  o.page={at:Date.now()}; save(); render(); toast('On your page: '+title+'.'); return; }
 if(k==='postcard'){ const V=window.Viz; if(!V) return toast('Picture It isn\'t here.'); const q=V.plugAdd({kind:'worked',title,role:c.me||''}); o.postcard={at:Date.now(),id:q.id}; save(); location.href='../picture/?plug='+encodeURIComponent(q.id); return; }
}
function vScript(){
 const c=cur(); let h='';
 if(MSG) h+='<div class="msg'+(/<b>/.test(MSG)?' bad':'')+'">'+MSG+'</div>';
 if(c){
  const seen=[...new Set(SCENES.flatMap(s=>F.seen(s)))];
  const voices=[...new Set(SCENES.flatMap(s=>s.speakers.filter(x=>x.voice&&!F.seen(s).includes(x.name)).map(x=>x.name)))];
  h+='<div class="card"><p class="kicker">Open now</p><b>'+esc(String(c.file).replace(/_/g,' '))+'</b><div class="dim" style="font-size:14px;margin:4px 0 12px">'+SCENES.length+' scenes · '+esc(seen.join(', '))+(voices.length?' · '+esc(voices.join(', '))+' (voice only)':'')+'</div>'
   +'<p class="kicker">Who do you play on camera?</p><div class="chips">'+seen.map(n=>'<button class="chip'+(c.me===n?' on':'')+'" data-me="'+esc(n)+'">'+esc(n)+'</button>').join('')+'</div>'
   +'<p class="faint" style="font-size:13px;margin:10px 0 0">When the others are a shoulder or a voice, this is the face. Picked in any ACT tool, it\'s picked here.</p></div>';
 }
 h+='<div class="drop" id="drop"><b>DROP A SCRIPT</b><span class="dim">PDF, Final Draft, Fountain or text. Or tap to pick one.</span></div>';
 h+='<textarea class="field" id="paste" placeholder="Or paste it here"></textarea><button class="btn block" id="readit" style="margin-top:8px">READ IT</button>';
 const list=SH?SH.all():[];
 if(list.length){
  h+='<p class="kicker" style="margin-top:20px">On your shelf</p><p class="faint" style="font-size:13px;margin:-4px 0 6px">Anything you dropped in an ACT tool or THEACTORPAGES.</p>';
  h+=list.map(it=>'<div class="scriptrow"><div><b>'+esc(SH.label(it))+'</b><small>'+esc(it.from||'')+' · '+F.scenes(it.text).length+' scenes</small></div><button class="btn sm'+(it.id===DB.cur?' pri':'')+'" data-shelf="'+esc(it.id)+'">'+(it.id===DB.cur?'OPEN':'USE')+'</button></div>').join('');
 }
 return h;
}
function wayOf(n){ return (cur().scenes&&cur().scenes[n]&&cur().scenes[n].way)||''; }
function whereName(n){ const s=cur().scenes&&cur().scenes[n]; const o=s&&s.where&&owned().find(x=>x.id===s.where); return o?o.name:''; }
function doneOf(sc){ const s=cur().scenes&&cur().scenes[sc.n]; if(!s||!s.way) return null; const L=F.shots(sc,s.way,cur().me,s.ins,s.list); return {d:L.filter(x=>s.done&&s.done[x.id]).length,t:L.length}; }
/* ---------- the front: what you can do with the camera and mic, before you go looking ---------- */
let LASTSCENE=null;
function takesIn(n){ return (cutOf().takes[n]||[]).length; }
function front(){
 const k=cutOf(), all=SCENES.reduce((a,sc)=>a+takesIn(sc.n),0), sn=LASTSCENE||(SCENES[0]&&SCENES[0].n)||1, anyFile=SCENES.some(sc=>(k.takes[sc.n]||[]).some(t=>FILES[t.id]));
 return window.Kit?Kit.html([
  {id:'shoot',dev:'camera',label:'CAMERA',what:'Shoot a take',note:'Scene '+sn+', take '+(takesIn(sn)+1)},
  {id:'match',dev:'camera',label:'CAMERA',what:'Match a shot',note:'Line it up with the last one'},
  {id:'adr',dev:'mic',label:'MIC',what:'Re-record a line',note:anyFile?'Over a take, in CUT':'Shoot or add a take first',off:!anyFile},
  {id:'scout',dev:'photo',label:'PHOTO',what:'Scout a place',note:'Light, sound, photos'}
 ])+'<p class="faint" style="font-size:13px;margin:-6px 0 18px">'+(all?all+' take'+(all===1?'':'s')+' so far. They\'re in CUT.':'Takes you shoot here go straight into CUT, on their scene.')+' Before you erase a card: <a href="../footage/check.html" id="frontcheck">CHECK THE COPY</a>.</p>':'';
}
function vScenes(){
 const TH=F.through(SCENES);
 return (TH.length?'<div class="card" id="through"><p class="kicker">Through the script</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">In more than one scene, so it\'s there and it matches.</p>'+TH.slice(0,14).map(x=>'<div style="font-size:14px;margin:3px 0"><b>'+esc(x.label)+'</b> <span class="faint">'+(x.kind==='place'?'place · ':'')+'scenes '+x.scenes.join(', ')+'</span></div>').join('')+(TH.length>14?'<p class="faint" style="font-size:13px">And '+(TH.length-14)+' more.</p>':'')+'</div>':'')+'<p class="kicker">Tap a scene to pick how you\'ll make it</p>'+SCENES.map(sc=>{
  const w=wayOf(sc.n), wn=w?F.wayName(w):'', where=whereName(sc.n), dn=doneOf(sc);
  return '<button class="sc" data-scene="'+sc.n+'"><div class="hd">'+sc.n+'. '+esc(sc.heading)+'</div>'
   +'<div class="sub">'+(sc.speakers.length?sc.speakers.map(s=>esc(s.name)+' '+s.lines+(s.voice?' (voice)':'')).join(' · '):'No dialogue')+'</div>'
   +'<div class="tags">'+(wn?'<span class="tag on">'+esc(wn)+'</span>':'<span class="tag">way not picked</span>')
   +(where?'<span class="tag on">'+esc(where)+'</span>':'<span class="tag">where not picked</span>')
   +(dn?'<span class="tag'+(dn.d===dn.t?' done':'')+'">'+dn.d+' of '+dn.t+' shot</span>':'')+'</div></button>';
 }).join('');
}
const CF=[['wardrobe','Wardrobe'],['hand','In hand'],['lens','Lens'],['height','Camera height'],['eyeline','Eyeline'],['light','Light from'],['note','Note']];
function vScene(n){
 const sc=SCENES.find(x=>x.n===n); if(!sc){ OPEN=null; return vScenes(); }
 const c=cur(), s=st(n), me=c.me;
 let h='<button class="back" data-back="1">‹ All scenes</button>';
 h+='<div class="card"><div class="hd" style="font:700 15px/1.35 var(--mono)">'+sc.n+'. '+esc(sc.heading)+'</div>'
  +'<div class="dim" style="font-size:14px;margin-top:6px">'+(sc.speakers.length?sc.speakers.map(x=>esc(x.name)+': '+x.lines+' line'+(x.lines===1?'':'s')+(x.voice?' ('+esc(x.voice)+', voice only)':'')).join(' · '):'No dialogue')+'</div></div>';
 const seen=F.seen(sc), WS=F.WAYS.concat(s.list?[{id:'list',name:'Your shot list',say:'The shots from your spreadsheet for this scene, as you wrote them.'}]:[]);
 if(seen.length>1||s.list){
  h+='<p class="kicker">How do you shoot it?</p><div class="ways">'+WS.map(w=>'<button class="way'+(s.way===w.id?' on':'')+'" data-way="'+w.id+'"><b>'+w.name+'</b><span>'+esc(w.say)+'</span></button>').join('')+'</div>';
  if(s.way==='compress'||s.way==='proof') h+='<p class="faint" style="font-size:13px">On camera: <b class="dim">'+esc(F.lead(sc,me))+'</b>'+(me&&seen.includes(me)?'':' (most lines; pick who you play on the SCRIPT tab)')+'.</p>';
 } else if(!s.way){ s.way='keep'; save(); }
 // where
 const locs=owned().filter(o=>o.kind==='location'), sug=F.places(sc,owned());
 h+='<p class="kicker" style="margin-top:16px">Shoot it at</p>';
 if(locs.length){
  h+='<select class="field" id="where"><option value="">Not picked ('+esc(sc.place||'no place in the script')+')</option>'+locs.map(o=>'<option value="'+o.id+'"'+(s.where===o.id?' selected':'')+'>'+esc(o.name)+'</option>').join('')+'</select>';
  if(sug.length&&!s.where) h+='<div class="chips" style="margin-top:8px">'+sug.map(x=>'<button class="chip" data-where="'+x.loc.id+'">'+esc(x.loc.name)+' <i>'+esc(x.words.join(', '))+'</i></button>').join('')+'</div>';
  const L0=s.where&&owned().find(o=>o.id===s.where);
  if(L0) h+=vAt(L0,sc,n);
 } else h+='<div class="msg">Add your locations on the OWNED tab and pick one here.</div>';
 // found in the action
 const mine=F.owns(sc,owned());
 const bits=[];
 const ins=Array.isArray(s.ins)?s.ins:sc.props.slice(0,6);
 if((sc.propsNot||[]).length) bits.push('<p class="faint" id="propsnot" style="font-size:13px;margin:8px 0 0">Said with a no, so not on the list: '+esc(sc.propsNot.join(', '))+'.</p>');
 if(sc.props.length&&s.way!=='list') bits.push('<p class="kicker" style="margin:12px 0 6px">In the action · tap for an insert</p><div class="chips">'+sc.props.map(p=>'<button class="chip'+(ins.includes(p)?' on':'')+'" data-ins="'+esc(p)+'">'+esc(p)+'</button>').join('')+'</div>');
 if(mine.length) bits.push('<p class="kicker" style="margin:12px 0 6px">Yours, named in the scene</p><div class="chips">'+mine.map(o=>'<span class="tag on">'+esc(o.name)+'</span>').join('')+'</div>');
 if(sc.people.length) bits.push('<p class="kicker" style="margin:12px 0 6px">People in the action, no lines</p><div class="chips">'+sc.people.map(p=>'<span class="tag">'+esc(p)+'</span>').join('')+'</div><p class="faint" style="font-size:13px;margin:6px 0 0">A walk-by, a shoulder, or a sound. Not a cast.</p>');
 const L1=s.where&&owned().find(o=>o.id===s.where);
 bits.push('<p class="kicker" style="margin:12px 0 6px">Sound bed</p><div class="chips"><span class="tag on">room tone</span>'+sc.sound.map(p=>'<span class="tag">'+esc(p)+'</span>').join('')+(L1&&L1.sound?'<span class="tag warn">'+esc(L1.name)+': '+esc(L1.sound)+'</span>':'')+'</div>');
 h+=bits.join('');
 // shots
 if(s.way){
  const L=F.shots(sc,s.way,me,s.ins,s.list), d=L.filter(x=>s.done[x.id]).length;
  h+='<p class="kicker" style="margin-top:18px">Shots · '+d+' of '+L.length+'</p>'+L.map(x=>'<label class="shot'+(s.done[x.id]?' done':'')+'"><input type="checkbox" data-shot="'+esc(x.id)+'"'+(s.done[x.id]?' checked':'')+'><div><b>'+esc(x.what)+'</b>'+(x.how?'<small>'+esc(x.how)+'</small>':'')+'</div></label>').join('');
  if(s.way==='keep'&&seen.length>1) h+='<p class="faint" style="font-size:13px">Shoot every angle of one part, change wardrobe, then the next.</p>';
  if(s.way==='crew'&&seen.length>1) h+='<p class="faint" style="font-size:13px">Master first. Then everything facing one way, turn around, everything facing the other.</p>';
  // continuity
  const who=F.onCamera(sc,s.way,me);
  h+='<p class="kicker" style="margin-top:18px">Continuity</p><p class="faint" style="font-size:13px;margin:-4px 0 4px">So the next scene with them matches this one.</p>';
  who.forEach(w=>{
   const v=s.cont[w]||{}, prev=lastCard(w,n);
   h+='<div class="cont"><div class="row" style="justify-content:space-between"><h3>'+esc(w)+'</h3>'+(prev?'<button class="btn sm ghost" data-same="'+esc(w)+'">Same as scene '+prev.n+'</button>':'')+'</div><div class="g">'
    +CF.map(([k,l])=>'<div'+(k==='note'?' style="grid-column:1/-1"':'')+'><label>'+l+'</label><input class="field" data-cont="'+esc(w)+'" data-k="'+k+'" value="'+esc(v[k]||'')+'"></div>').join('')+'</div>';
   // the witness: a photo of how they look at the end of this scene
   const pp=lastPhoto(w,n);
   h+='<div class="g" style="margin-top:8px">'
    +'<div><label>This scene</label>'+(v.photo?'<img data-photo="'+esc(v.photo)+'" class="cph">':'<div class="cph none">No photo yet</div>')
    +'<label class="btn sm block" style="margin-top:6px"><input type="file" accept="image/*" capture="environment" class="hide" data-cphoto="'+esc(w)+'">'+(v.photo?'RETAKE':'PHOTO')+'</label></div>'
    +(pp?'<div><label>Match this: scene '+pp.n+'</label><img data-photo="'+esc(pp.photo)+'" class="cph"></div>':'')+'</div>'
    +'<button class="btn sm block pri" style="margin-top:8px" data-match="'+esc(w)+'">MATCH CAMERA'+((pp||v.photo)?' · line up with '+(pp?'scene '+pp.n:'this scene'):'')+'</button></div>';
  });
 }
 // the scene itself
 h+='<details style="margin-top:16px"><summary>Read the scene</summary><div class="read">'+sc.beats.map(b=>b.action?esc(b.text):'<span class="who">'+esc(b.who)+'</span>\n'+esc(b.text)).join('\n\n')+'</div></details>';
 return h;
}
async function keepPhoto(w,blob){ const s=st(OPEN); s.cont[w]=s.cont[w]||{};
 const pid=rid('ph'); if(!(await putPhoto(pid,blob))){ toast('This phone would not keep the photo.'); return false; }
 const old=s.cont[w].photo; s.cont[w].photo=pid; s.contAt=Date.now(); save();
 if(old&&!Object.values(DB.scripts).some(c=>Object.values(c.scenes||{}).some(x=>Object.values(x.cont||{}).some(v=>v.photo===old)))) delPhoto(old);
 render(); toast(w+': photo kept for scene '+OPEN+'.'); return true; }

/* ---------- match camera: the live camera with the last photo laid over it. You line it up by eye. No score. ---------- */
const MC={stream:null,facing:'environment',ghost:50,timer:0,show:true,who:'',busy:false};
function mcStop(){ if(MC.stream){ MC.stream.getTracks().forEach(t=>t.stop()); MC.stream=null; } clearInterval(MC.tick); }
function mcClose(){ mcStop(); const o=$('mc'); if(o) o.remove(); document.body.classList.remove('mcopen'); }
function mcSay(t){ const m=$('mcmsg'); if(m){ m.textContent=t; m.style.display=t?'block':'none'; } }
async function mcStart(){
 mcStop(); const v=$('mcvid'); if(!v) return;
 const mirror=MC.facing==='user'; $('mc').classList.toggle('mirror',mirror);
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ mcSay('This browser will not open the camera here. Close this and use PHOTO instead.'); $('mcshot').disabled=true; return; }
 mcSay('Opening the camera…'); $('mcshot').disabled=true;
 try{ MC.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:MC.facing},width:{ideal:1920},height:{ideal:1080}},audio:false}); }
 catch(e){ const n=e&&e.name; mcSay(n==='NotAllowedError'||n==='SecurityError'?'Camera is off for this page. Turn it on in your browser settings, or close this and use PHOTO.':n==='NotFoundError'||n==='OverconstrainedError'?'No camera found on this device. Close this and use PHOTO.':n==='NotReadableError'?'Another app is using the camera. Close it and try again.':'The camera would not open. Close this and use PHOTO.'); return; }
 if(!$('mc')){ mcStop(); return; }
 v.srcObject=MC.stream; try{ await v.play(); }catch(e){}
 const ready=()=>v.videoWidth>0; let n=0; while(!ready()&&n++<50) await new Promise(r=>setTimeout(r,100));
 if(!ready()){ mcSay('The camera opened but sent no picture. Close this and use PHOTO.'); return; }
 mcSay(''); $('mcshot').disabled=false;
}
function openMatch(w){
 const s=st(OPEN), v=s.cont[w]||{}, pp=lastPhoto(w,OPEN), gid=pp?pp.photo:v.photo||'';
 MC.who=w; MC.show=true;
 const o=document.createElement('div'); o.id='mc'; o.className='mc';
 o.innerHTML='<div class="mchead"><b>'+esc(w)+' · scene '+OPEN+'</b><button class="btn sm" id="mcx">CLOSE</button></div>'
  +'<div class="mcview"><video id="mcvid" playsinline muted autoplay></video>'+(gid?'<img id="mcghost" data-photo="'+esc(gid)+'" alt="">':'')+'<div id="mccount"></div><div id="mcmsg"></div></div>'
  +'<div class="mcbar">'+(gid?'<label class="mcsl"><span>'+(pp?'Scene '+pp.n:'Last photo')+'</span><input type="range" id="mcop" min="0" max="90" value="'+MC.ghost+'" aria-label="How see-through"></label><button class="btn sm" id="mcflip">HIDE</button>':'<span class="faint" style="font-size:13px">No earlier photo of '+esc(w)+'. This one becomes the one to match.</span>')+'</div>'
  +'<div class="mcbar"><button class="btn sm" id="mcface">'+(MC.facing==='user'?'BACK CAMERA':'FRONT CAMERA')+'</button><button class="btn sm" id="mctime">TIMER '+(MC.timer?MC.timer+' S':'OFF')+'</button><button class="btn pri" id="mcshot" disabled>TAKE PHOTO</button></div>';
 document.body.appendChild(o); document.body.classList.add('mcopen');
 const g=$('mcghost'); if(g){ g.style.opacity=MC.ghost/100; fillPhotos(); }
 $('mcx').onclick=mcClose;
 const op=$('mcop'); if(op) op.oninput=()=>{ MC.ghost=+op.value; if(MC.show) g.style.opacity=MC.ghost/100; };
 const fl=$('mcflip'); if(fl) fl.onclick=()=>{ MC.show=!MC.show; g.style.opacity=MC.show?MC.ghost/100:0; fl.textContent=MC.show?'HIDE':'SHOW'; };
 $('mcface').onclick=()=>{ MC.facing=MC.facing==='user'?'environment':'user'; $('mcface').textContent=MC.facing==='user'?'BACK CAMERA':'FRONT CAMERA'; mcStart(); };
 $('mctime').onclick=()=>{ MC.timer=MC.timer===0?3:MC.timer===3?10:0; $('mctime').textContent='TIMER '+(MC.timer?MC.timer+' S':'OFF'); };
 $('mcshot').onclick=()=>{ if(MC.busy) return; if(!MC.timer){ mcSnap(); return; } MC.busy=true; let left=MC.timer; const c=$('mccount'); c.textContent=left;
  MC.tick=setInterval(()=>{ left--; if(left<=0){ clearInterval(MC.tick); c.textContent=''; MC.busy=false; mcSnap(); } else c.textContent=left; },1000); };
 mcStart();
}
async function mcSnap(){
 const v=$('mcvid'); if(!v||!v.videoWidth){ toast('No picture from the camera yet.'); return; }
 const k=Math.min(1,1600/Math.max(v.videoWidth,v.videoHeight)), c=document.createElement('canvas'); c.width=Math.round(v.videoWidth*k); c.height=Math.round(v.videoHeight*k);
 c.getContext('2d').drawImage(v,0,0,c.width,c.height);   // saved as the camera sees it; only the screen is mirrored
 const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.85)); if(!b){ toast('This phone would not make the photo.'); return; }
 const w=MC.who; mcClose(); await keepPhoto(w,b);
}
/* ---------- shoot a take: picture and sound, named for the scene and take, straight into CUT ---------- */
const SH0={stream:null,rec:null,facing:'environment',n:0,tick:0,t0:0,last:''};
function shStop(){ clearInterval(SH0.tick); if(SH0.stream){ Capture.stop(SH0.stream); SH0.stream=null; } }
function filmName(){ const c=cur(); return String((c&&c.file)||'Film').replace(/\.(pdf|txt|fountain|fdx|docx)$/i,'').replace(/_/g,' '); }
function openShoot(n){
 if(!window.Capture||!window.Takes){ toast('This page can\'t record here.'); return; }
 n=+n||LASTSCENE||(SCENES[0]&&SCENES[0].n)||1; SH0.n=n; SH0.last='';
 const o=document.createElement('div'); o.id='shoot'; o.className='mc';
 o.innerHTML='<div class="mchead"><select class="field" id="shscene" aria-label="Scene" style="max-width:62vw;background:#111;color:#fff;border-color:#333">'+SCENES.map(sc=>'<option value="'+sc.n+'"'+(sc.n===n?' selected':'')+'>Scene '+sc.n+'. '+esc(sc.heading)+'</option>').join('')+'</select><button class="btn sm" id="shx">CLOSE</button></div>'
  +'<div class="mcview"><video id="shvid" playsinline muted autoplay></video><div id="shslate"></div><div id="mcmsg"></div></div>'
  +'<div class="mcbar"><span id="shsaid" style="font-size:14px;text-align:center"></span></div>'
  +'<div class="mcbar"><button class="btn sm" id="shface">'+(SH0.facing==='user'?'BACK CAMERA':'FRONT CAMERA')+'</button><button class="btn pri" id="shrec" disabled>RECORD</button></div>';
 document.body.appendChild(o); document.body.classList.add('mcopen');
 const slate=()=>{ const tk=takesIn(SH0.n)+(SH0.rec?0:1); $('shslate').innerHTML='<b>SCENE '+SH0.n+'</b> · TAKE '+(SH0.rec?takesIn(SH0.n)+1:tk)+(SH0.rec?' · <span class="recd">● '+F.mmss(Math.floor((Date.now()-SH0.t0)/1000))+'</span>':''); };
 SH0.slate=slate;
 $('shscene').onchange=e=>{ if(SH0.rec) return; SH0.n=+e.target.value; LASTSCENE=SH0.n; SH0.last=''; $('shsaid').textContent=''; slate(); };
 $('shx').onclick=async()=>{ if(SH0.rec) await shEnd(); shStop(); o.remove(); document.body.classList.remove('mcopen'); render(); };
 $('shface').onclick=()=>{ if(SH0.rec) return; SH0.facing=SH0.facing==='user'?'environment':'user'; $('shface').textContent=SH0.facing==='user'?'BACK CAMERA':'FRONT CAMERA'; shStart(); };
 $('shrec').onclick=()=>{ if(SH0.rec) shEnd(); else shBegin(); };
 slate(); shStart();
}
async function shStart(){
 shStop(); const v=$('shvid'); if(!v) return; $('shoot').classList.toggle('mirror',SH0.facing==='user'); mcSay('Opening the camera and mic…'); $('shrec').disabled=true;
 try{ SH0.stream=await Capture.open({video:true,audio:true,facing:SH0.facing}); }catch(e){ mcSay(Capture.errorWords(e,'video')); return; }
 if(!$('shoot')){ shStop(); return; }
 v.srcObject=SH0.stream; try{ await v.play(); }catch(e){}
 mcSay(''); $('shrec').disabled=false;
}
function shBegin(){
 if(!SH0.stream) return; try{ SH0.rec=Capture.record(SH0.stream,'video'); }catch(e){ toast(e.message); return; }
 SH0.t0=Date.now(); $('shrec').textContent='STOP'; $('shrec').classList.add('rec'); $('shscene').disabled=true; $('shface').disabled=true; $('shsaid').textContent='';
 SH0.tick=setInterval(()=>SH0.slate&&SH0.slate(),250); SH0.slate();
}
async function shEnd(){
 const r=SH0.rec; if(!r) return; SH0.rec=null; clearInterval(SH0.tick);
 const got=await r.stop(), n=SH0.n, k=takesIn(n)+1, nm=Capture.fileName({name:filmName(),role:'Sc'+n,n:k,ext:got.ext});
 const it=await Takes.put(got.blob,{kind:'video',mime:got.mime,ext:got.ext,secs:got.secs,name:nm,for:{type:'scene',script:DB.cur,scene:n,title:filmName()}});
 const c=cutOf(); c.takes[n]=c.takes[n]||[]; const id=rid('t'), d=Math.round((got.secs||0)*100)/100;
 c.takes[n].push({id:id,name:nm,size:got.blob.size,dur:d,in:0,out:d,use:!c.takes[n].some(x=>x.use),at:Date.now(),takeId:it.id,shot:true});
 FILES[id]=new File([got.blob],nm,{type:got.blob.type}); Takes.take(TOOL,it.id); save(); LASTSCENE=n;
 const b=$('shrec'); if(b){ b.textContent='RECORD'; b.classList.remove('rec'); $('shscene').disabled=false; $('shface').disabled=false; }
 const said=$('shsaid'); if(said) said.textContent='Scene '+n+', take '+k+' kept ('+F.mmss(Math.round(got.secs))+'). It\'s in CUT.'+(it.kept?'':' This phone is full: save it from CUT now.');
 if(SH0.slate) SH0.slate();
}
/* ---------- the sun at a place ---------- */
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
function shootDate(){ const c=cur(); const v=(c&&c.dayDate)||''; if(/^\d{4}-\d\d-\d\d$/.test(v)){ const [y,m,d]=v.split('-').map(Number); return new Date(y,m-1,d,12); } return new Date(); }
function sunOf(o,date){ const g=o&&F.coords(o.where); return g?F.sun(date||shootDate(),g.lat,g.lng):null; }
const hm=d=>d?d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'none';
function sunCard(o,date){
 const s=sunOf(o,date); if(!s) return '';
 if(s.polar) return '<div class="sun"><b>'+esc(s.polar)+'</b></div>';
 return '<div class="sun"><div><span>First light</span><b>'+hm(s.dawn)+'</b></div><div><span>Sunrise</span><b>'+hm(s.sunrise)+'</b></div><div><span>Golden until</span><b>'+hm(s.goldenMorningEnds)+'</b></div>'
  +'<div><span>Golden from</span><b>'+hm(s.goldenEveningStarts)+'</b></div><div><span>Sunset</span><b>'+hm(s.sunset)+'</b></div><div><span>Last light</span><b>'+hm(s.dusk)+'</b></div></div>';
}
function vAt(o,sc,n){
 const rows=[];
 const sn=sunOf(o); if(sn) rows.push(['Sun',(sc.tod?sc.tod+': ':'')+F.sunFor(sc.tod,sn)+' ('+shootDate().toLocaleDateString(undefined,{month:'short',day:'numeric'})+')']);
 if(o.light) rows.push(['Light',o.light+(sc.tod?' · the scene is '+sc.tod:'')]);
 else if(sc.tod) rows.push(['Light','The scene is '+sc.tod+'. No light note for this place yet.']);
 if(o.sound) rows.push(['Sound',o.sound]);
 if(o.access) rows.push(['Access',o.access]);
 const la=lastAt(o.id,DB.cur,n);
 if(la) rows.push(['Last time here',la.where+': '+la.bits]);
 const sc0=(o.scout||[])[0];
 let h='<div class="card" style="margin-top:10px"><p class="kicker">At '+esc(o.name)+'</p>'+rows.map(r=>'<div style="font-size:14px;margin:3px 0"><span class="faint">'+r[0]+':</span> '+esc(r[1])+'</div>').join('');
 if(sc0) h+='<div style="font-size:14px;margin-top:8px"><span class="faint">Scouted '+esc(day(sc0.at))+':</span> '+esc(sc0.note||'')+'</div>'+(sc0.photo?'<img data-photo="'+esc(sc0.photo)+'" style="width:100%;border-radius:10px;margin-top:8px;display:block">':'');
 if(!rows.length&&!sc0) h+='<div class="faint" style="font-size:13px">Add light, sound and scout notes for this place on the OWNED tab.</div>';
 return h+'<button class="btn sm ghost" data-oedit="'+o.id+'" style="margin-top:8px">Notes and scouting for '+esc(o.name)+'</button></div>';
}
/* the last lens, camera height and eyeline you wrote for a scene shot at this place, any script */
function lastAt(locId,skipScript,skipN){
 let best=null;
 Object.keys(DB.scripts).forEach(sid=>{ const c=DB.scripts[sid]; Object.keys(c.scenes||{}).forEach(k=>{
  const s=c.scenes[k]; if(s.where!==locId||(sid===skipScript&&Number(k)===skipN)) return;
  Object.keys(s.cont||{}).forEach(w=>{ const v=s.cont[w]; const b=[v.lens&&'lens '+v.lens,v.height&&'height '+v.height,v.eyeline&&'eyeline '+v.eyeline,v.light&&'light from '+v.light].filter(Boolean);
   if(b.length&&(!best||(s.contAt||0)>=best.at)) best={at:s.contAt||0,where:String(c.file||'').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/_/g,' ')+' scene '+k+', '+w,bits:b.join(' · ')}; });
 }); });
 return best;
}
function lastPhoto(who,n){
 const c=cur(); let best=null;
 Object.keys(c.scenes||{}).map(Number).filter(k=>k<n).sort((a,b)=>b-a).some(k=>{ const v=c.scenes[k].cont&&c.scenes[k].cont[who]; if(v&&v.photo){ best={n:k,photo:v.photo}; return true; } return false; });
 return best;
}
function lastCard(who,n){
 const c=cur(); let best=null;
 Object.keys(c.scenes||{}).map(Number).filter(k=>k<n).sort((a,b)=>b-a).some(k=>{ const v=c.scenes[k].cont&&c.scenes[k].cont[who]; if(v&&Object.values(v).some(Boolean)){ best={n:k,v:v}; return true; } return false; });
 return best;
}
const KINDS=[['location','Locations','What it can play, e.g. bus shelter, motel lot'],['prop','Props',''],['vehicle','Vehicles',''],['animal','Animals',''],['wardrobe','Wardrobe',''],['person','People you can get',''],['gear','Gear','']];
function vLoc(o){
 let h='<button class="back" data-oback="1">‹ Everything you own</button><div class="card"><p class="kicker">'+(o.kind==='location'?'Location':esc(o.kind))+'</p>';
 const F2=[['name','Name',''],['plays','Can play','bus shelter, motel lot'],['light','Light','best light, when'],['sound','Sound','what you hear there'],['access','Access','power, parking, who to ask'],['notes','Notes','']];
 h+=F2.filter(f=>o.kind==='location'||['name','notes'].includes(f[0])).map(([k,l,ph])=>'<label class="faint" style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;display:block;margin-top:8px">'+l+'</label><input class="field" data-of="'+k+'" placeholder="'+esc(ph)+'" value="'+esc(o[k]||'')+'">').join('')+'</div>';
 if(o.kind==='location'){
  const g=F.coords(o.where);
  h+='<div class="card"><p class="kicker">Where it is, and the sun there</p><div class="row"><input class="field" id="owhere" placeholder="38.84, -97.61 or a maps link" value="'+esc(o.where||'')+'" style="flex:1 1 200px"><button class="btn" id="ohere">I\'M HERE</button></div>'
   +'<p class="faint" style="font-size:13px;margin:6px 0 10px">'+(g?'Set: '+g.lat+', '+g.lng+'. Worked out on this phone, no connection needed.':'Stand there and tap I\'M HERE, or paste a pin from your maps app.')+'</p>'
   +(g?'<div class="row"><label class="faint" style="font-size:13px">On</label><input type="date" class="field" id="osundate" value="'+esc(cur()&&cur().dayDate||ymd(new Date()))+'" style="flex:0 1 180px"></div>'+sunCard(o)+'<p class="faint" style="font-size:12px;margin-top:6px">Times in this phone\'s time. Golden light: the sun under 6° up. First and last light: 6° down.</p>':'')+'</div>';
 }
 if(o.kind==='location'){
  h+='<div class="card"><p class="kicker">Scout log</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">What the place gave you, and when. Fog, a light, a sound. Photos stay on this phone.</p>'
   +'<textarea class="field" id="snote" placeholder="Fog over the creek, sun just over the ridge" style="min-height:80px"></textarea>'
   +'<div class="row" style="margin-top:8px"><label class="btn" style="flex:1"><input type="file" id="sphoto" accept="image/*" capture="environment" class="hide">ADD A PHOTO</label><button class="btn pri" id="ssave" style="flex:1">SAVE</button></div><div id="sphotoname" class="faint" style="font-size:13px;margin-top:6px"></div></div>';
  h+=(o.scout||[]).map(x=>'<div class="card"><div class="row" style="justify-content:space-between"><b style="font-size:14px">'+esc(day(x.at))+'</b><button class="x" data-sdel="'+x.id+'" aria-label="Remove">×</button></div>'+(x.note?'<div style="margin-top:4px">'+esc(x.note)+'</div>':'')+(x.photo?'<img data-photo="'+esc(x.photo)+'" style="width:100%;border-radius:10px;margin-top:8px;display:block">':'')+'</div>').join('');
 }
 return h;
}
function vOwn(){
 if(OEDIT){ const o=owned().find(x=>x.id===OEDIT); if(o) return vLoc(o); OEDIT=null; }
 let h='';
 const toBacklot='<a class="card" id="tobacklot" href="../backlot/" style="display:block;text-decoration:none;color:inherit"><p class="kicker">Backlot ›</p><p class="faint" style="font-size:13px;margin:0">The same list, walked with your phone: a photo per spot, what each can pass for, your scripts held against it, and a start dealt from what you have.</p></a>';
 if(DB.owned===null||!owned().length){
  h+='<div class="card"><p class="kicker">What you own</p><p>Your locations, props, wardrobe and gear. Scenes get matched to them. Backlot shows the same list, with photos.</p>'
   +'<button class="btn pri block" id="ranch">START FROM THE RANCH LIST</button><p class="faint" style="font-size:13px;margin:6px 0 10px">Barn, porch, creek, workshop, oak treeline, corral, fire pit, the pickup, the gear. 40 in all. Edit or remove any.</p>'
   +'<button class="btn block ghost" id="empty">Start empty</button></div>';
  if(DB.owned===null) return h+toBacklot;
 }
 h+='<div class="card"><p class="kicker">Add</p><div class="row"><select class="field" id="okind" style="flex:1 1 120px">'+KINDS.map(k=>'<option value="'+k[0]+'">'+k[1]+'</option>').join('')+'</select>'
  +'<input class="field" id="oname" placeholder="Name" style="flex:2 1 180px"></div>'
  +'<input class="field" id="oplays" placeholder="Can play (locations): bus shelter, motel lot…" style="margin-top:8px">'
  +'<input class="field" id="onotes" placeholder="Notes" style="margin-top:8px"><button class="btn pri block" id="oadd" style="margin-top:8px">ADD</button></div>';
 h+=toBacklot;
 KINDS.forEach(([k,l])=>{
  const L=owned().filter(o=>o.kind===k); if(!L.length) return;
  h+='<p class="kicker" style="margin-top:16px">'+l+' · '+L.length+'</p>'+L.map(o=>'<div class="own"><div><b>'+esc(o.name)+'</b>'+(o.plays?'<small>Plays: '+esc(o.plays)+'</small>':'')
   +(k==='location'?['light','sound','access'].filter(x=>o[x]).map(x=>'<small>'+x[0].toUpperCase()+x.slice(1)+': '+esc(o[x])+'</small>').join('')+((o.scout||[]).length?'<small>Scouted '+(o.scout.length===1?'once':o.scout.length+' times')+', last '+esc(day(o.scout[0].at))+'</small>':''):(o.notes?'<small>'+esc(o.notes)+'</small>':''))+'</div>'
   +'<button class="btn sm ghost" data-oedit="'+o.id+'">'+(k==='location'?'Notes':'Edit')+'</button><button class="x" data-del="'+o.id+'" aria-label="Remove">×</button></div>').join('');
 });
 return h;
}
function dayBlocks(){
 const c=cur();
 const list=SCENES.map(sc=>{ const s=(c.scenes||{})[sc.n]||{}; const o=s.where&&owned().find(x=>x.id===s.where);
  const way=s.way||'', who=way?F.onCamera(sc,way,c.me):F.seen(sc);
  const wd=who.map(w=>(s.cont&&s.cont[w]&&s.cont[w].wardrobe)?w+': '+s.cont[w].wardrobe:'').filter(Boolean).join(' · ');
  return {scene:sc,where:o?o.name:(sc.place||'No place'),set:!!o,loc:o||null,wardrobe:wd,way:way,who:who}; });
 return F.day(list);
}
function peopleOf(){ const c=cur(); c.people=c.people||{actors:{},crew:'',contacts:''}; c.people.actors=c.people.actors||{}; return c.people; }
function callOf(){ const c=cur(); c.call=c.call||{call:'',wrap:'',starts:{},hospital:'',notes:''}; c.call.starts=c.call.starts||{}; return c.call; }
function creditsOf(){ const c=cur(); c.credits=c.credits||{thanks:'',owner:'',year:''}; return c.credits; }
function castOf(){ const pe=peopleOf(), c=cur(); return F.parts(SCENES).map(p=>Object.assign({},p,{actor:pe.actors[p.role]||(p.role===c.me&&pe.me?pe.me:'')})); }
function callData(){
 const c=cur(), k=callOf(), pe=peopleOf(), B=dayBlocks();
 const firstLoc=B.map(b=>b.items[0]&&b.items[0].loc).find(o=>o&&F.coords(o.where));
 return {title:String(c.file||'Untitled').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/_/g,' '), date:c.dayDate||'', call:k.call, wrap:k.wrap,
  sun:firstLoc?sunOf(firstLoc):null, hospital:k.hospital, notes:k.notes,
  blocks:B.map(b=>{ const o=b.items[0]&&b.items[0].loc, sn=o?sunOf(o):null;
   return {key:b.key, where:b.where, address:o&&o.where?o.where:'', tod:b.tod, start:k.starts[b.key]||'', sun:sn?F.sunFor(b.tod,sn):'',
    items:b.items.map(x=>({n:x.scene.n, heading:x.scene.heading, who:x.who, wardrobe:x.wardrobe, props:F.owns(x.scene,owned()).filter(o=>o.kind==='prop').map(o=>o.name)}))}; }),
  cast:castOf(), crew:F.crewLines(pe.crew), contacts:String(pe.contacts||'').split(/\n+/).map(x=>x.trim()).filter(Boolean)};
}
function creditData(){
 const c=cur(), pe=peopleOf(), k=creditsOf(), used={};
 SCENES.forEach(sc=>{ const s=(c.scenes||{})[sc.n]; const o=s&&s.where&&owned().find(x=>x.id===s.where); if(o) used[o.name]=1; });
 return {title:callData().title, cast:castOf(), crew:F.crewLines(pe.crew), places:Object.keys(used), thanks:String(k.thanks||'').split(/\n+/).map(x=>x.trim()).filter(Boolean), owner:k.owner, year:k.year};
}
function peopleBox(){
 const pe=peopleOf(), P=castOf();
 return '<div class="card"><p class="kicker">Who\'s who</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">For the call sheet and the end credits. Parts are in order of appearance.</p>'
  +(P.length?P.map(p=>'<div class="row" style="margin-top:6px"><label style="flex:0 1 150px;font:700 13px/1.3 var(--mono)">'+esc(p.role)+(p.voice?' <small class="faint">(voice)</small>':'')+'</label><input class="field" data-actor="'+esc(p.role)+'" value="'+esc(pe.actors[p.role]||'')+'" placeholder="Who plays it"></div>').join(''):'<p class="faint" style="font-size:13px">No speaking parts in this script yet.</p>')
  +'<label class="faint" style="font-size:12px;display:block;margin-top:10px">Crew, one per line</label><textarea class="field" rows="4" id="pcrew" placeholder="Written and directed by: Sam Lee\nCamera: Jo Park\nSound: Ray Cruz">'+esc(pe.crew||'')+'</textarea>'
  +'<label class="faint" style="font-size:12px;display:block;margin-top:8px">Contacts for the day, one per line</label><textarea class="field" rows="3" id="pcontacts" placeholder="Sam Lee, director, 555-0100">'+esc(pe.contacts||'')+'</textarea></div>';
}
function callBox(){
 const k=callOf(), D=callData(), r=F.callSheet(D);
 return '<div class="card"><p class="kicker">Call sheet</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">Made from the shoot day above, the sun and who\'s who. Add the times.</p>'
  +'<div class="row"><label class="faint" style="font-size:13px">Crew call</label><input type="time" class="field" id="kcall" value="'+esc(k.call||'')+'" style="flex:0 1 130px"><label class="faint" style="font-size:13px">Wrap</label><input type="time" class="field" id="kwrap" value="'+esc(k.wrap||'')+'" style="flex:0 1 130px"></div>'
  +D.blocks.map((b,i)=>'<div class="row" style="margin-top:6px"><label class="faint" style="font-size:13px;flex:1 1 160px">'+(i+1)+'. '+esc(b.where)+(b.tod?' · '+esc(b.tod):'')+'</label><input type="time" class="field" data-kstart="'+esc(b.key)+'" value="'+esc(b.start||'')+'" style="flex:0 1 130px" aria-label="Start time"></div>').join('')
  +'<label class="faint" style="font-size:12px;display:block;margin-top:8px">Nearest hospital</label><input class="field" id="khosp" value="'+esc(k.hospital||'')+'" placeholder="Name, address, phone">'
  +'<label class="faint" style="font-size:12px;display:block;margin-top:8px">Notes (parking, weather, safety)</label><textarea class="field" rows="2" id="knotes">'+esc(k.notes||'')+'</textarea>'
  +(r.missing.length?'<div class="msg" style="margin-top:8px">Not filled in yet: '+esc(r.missing.join(' '))+'</div>':'')
  +'<div class="row" style="margin-top:8px"><button class="btn pri" id="kprint">PRINT CALL SHEET</button><button class="btn" id="ktxt">CALL SHEET (.TXT)</button></div></div>';
}
function callSheetHtml(D){
 const t=x=>x?x.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
 let h='<h1>Call sheet: '+esc(D.title)+'</h1><p><b>'+esc(F.dateWords(D.date)||'Date not set')+'</b> · Crew call <b>'+esc(F.clock(D.call)||'not set')+'</b>'+(D.wrap?' · Wrap '+esc(F.clock(D.wrap)):'')
  +(D.sun&&(D.sun.sunrise||D.sun.sunset)?' · Sunrise '+esc(t(D.sun.sunrise))+' · Sunset '+esc(t(D.sun.sunset)):'')+'</p><p>Nearest hospital: '+esc(D.hospital||'not set')+'</p>';
 h+='<h2>Schedule</h2><table><tr><th>Time</th><th>Where</th><th>Scenes</th></tr>'+D.blocks.map((b,i)=>'<tr><td>'+esc(F.clock(b.start)||'')+'</td><td><b>'+(i+1)+'. '+esc(b.where)+'</b>'+(b.tod?'<br>'+esc(b.tod):'')+(b.address?'<br><small>'+esc(b.address)+'</small>':'')+(b.sun?'<br><small>Sun: '+esc(b.sun)+'</small>':'')+'</td><td>'
  +b.items.map(x=>'<div><b>Sc '+x.n+'</b> '+esc(x.heading)+'<br><small>'+esc([x.who.length?'on camera: '+x.who.join(', '):'',x.wardrobe,x.props.length?'props: '+x.props.join(', '):''].filter(Boolean).join(' · '))+'</small></div>').join('')+'</td></tr>').join('')+'</table>';
 h+='<h2>Cast</h2><table>'+D.cast.map(c=>'<tr><td><b>'+esc(c.role)+'</b>'+(c.voice?' (voice)':'')+'</td><td>'+esc(c.actor||'not cast')+'</td></tr>').join('')+'</table>';
 if(D.crew.length) h+='<h2>Crew</h2><table>'+D.crew.map(c=>'<tr><td>'+esc(c.job)+'</td><td>'+esc(c.name)+'</td></tr>').join('')+'</table>';
 if(D.contacts.length) h+='<h2>Contacts</h2>'+D.contacts.map(c=>'<div>'+esc(c)+'</div>').join('');
 if(D.notes) h+='<h2>Notes</h2><div style="white-space:pre-wrap">'+esc(D.notes)+'</div>';
 return h;
}
/* ---------- ON SET: one screen for the day. The shot you're on, big. Log each take with a mark and a note, mark the shot
   done, see what's next. The clock against your wrap and the light, worked out on this phone. Wrap: the report. ---------- */
let WRAPVIEW=false, DICT=null;
function setOf(){ const c=cur(); c.set=c.set||{cur:null,log:[],plan:{call:'',wrap:'',per:15}}; c.set.plan=c.set.plan||{call:'',wrap:'',per:15}; c.set.log=c.set.log||[]; return c.set; }
/* the day's order: your shot list's order when you have one (that's how you planned it), else grouped by place and light */
function listBlocks(){ const c=cur(), L=c.shotlist, B=[]; if(!L||!L.map) return null;
 L.scenes.forEach(x=>{ const n=L.map[x.label], sc=n&&SCENES.find(y=>y.n===n); if(!sc) return; const where=x.setups[0]||sc.place||'No place';
  const last=B[B.length-1]; if(last&&last.where===where) last.items.push({scene:sc}); else B.push({where,tod:'',set:true,items:[{scene:sc}]}); });
 SCENES.forEach(sc=>{ if(!B.some(b=>b.items.some(i=>i.scene.n===sc.n))) B.push({where:sc.place||'No place',tod:sc.tod||'',set:false,items:[{scene:sc}]}); });
 return B; }
function dayList(){ const c=cur(); return F.dayShots(listBlocks()||dayBlocks(),n=>(c.scenes||{})[n],c.me); }
function nowIdx(D){ const S=setOf(); let i=S.cur?D.findIndex(x=>x.n===S.cur.n&&x.shot.id===S.cur.shot):-1; if(i<0) i=D.findIndex(x=>!x.done); if(i<0) i=D.length-1; return i; }
function takesOf(x){ return setOf().log.filter(t=>t.n===x.n&&t.shot===x.shot.id); }
function locOf(n){ const s=(cur().scenes||{})[n]; return s&&s.where?owned().find(o=>o.id===s.where):null; }
function setLines(){ const el=$('setclock'); if(!el) return; const D=dayList(), i=nowIdx(D), x=D[i], now=Date.now(), S=setOf();
 el.innerHTML=esc(F.clockWord(now))+'<small>'+esc(new Date(now).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</small>';
 $('setplan').textContent=F.setClock({left:D.filter(y=>!y.done).length,per:S.plan.per,now,wrap:S.plan.wrap}).words;
 const sun=x?sunOf(locOf(x.n),new Date(now)):null; $('setsun').textContent=sun?F.sunNow(sun,now):(x?'Pin '+(locOf(x.n)?locOf(x.n).name:'the place')+' in OWNED for the light here.':''); }
setInterval(()=>{ if(TAB==='set'&&!WRAPVIEW) setLines(); },30000);
function vSet(){
 const c=cur(), S=setOf();
 if(WRAPVIEW) return vWrap();
 const D=dayList();
 if(!D.length){ const unset=SCENES.filter(sc=>!wayOf(sc.n));
  return '<div class="card"><p class="kicker">Nothing on the list yet</p><p class="dim" style="margin:0 0 12px">Pick how you\'ll shoot each scene and its shots line up here, in shooting order.</p>'
   +(unset.length?'<p class="lab" style="margin-top:0">Every scene with no way yet:</p><div class="row">'+F.WAYS.map(w=>'<button class="btn sm" data-allway="'+w.id+'">'+esc(w.name)+'</button>').join('')+'</div>':'')
   +'<div class="row" style="margin-top:12px"><button class="btn" data-go="scenes">PICK SCENE BY SCENE</button></div></div>'+'<p class="kicker" style="margin-top:18px">This phone</p>'+front(); }
 const i=nowIdx(D), x=D[i], tk=takesOf(x), nx=D.slice(i+1).find(y=>!y.done), loc=locOf(x.n);
 let h='<div class="clockrow"><b id="setclock"></b><button class="btn sm ghost" id="wrapit">WRAP</button></div><p class="sline" id="setplan"></p><p class="sline" id="setsun"></p>';
 h+='<div class="nowcard'+(x.done?' isdone':'')+'"><span class="nk">NOW · SCENE '+x.n+' · SHOT '+x.idx+' OF '+x.of+(x.done?' · DONE':'')+'</span><h2>'+esc(x.shot.what)+'</h2>'
  +(x.shot.how?'<p class="nh">'+esc(x.shot.how)+'</p>':'')+'<p class="nw">'+esc([x.where,x.shot.who].filter(Boolean).join(' · '))+'</p>'+((S.read||{})[x.n+'|'+x.shot.id]?'<p class="nw">Saved angle: '+esc(K.rollWord(S.read[x.n+'|'+x.shot.id].roll))+', '+esc(K.pitchWord(S.read[x.n+'|'+x.shot.id].pitch,0.5,S.read[x.n+'|'+x.shot.id].flat))+'</p>':'')
  +'<div class="takeno">TAKE '+(tk.length+1)+'</div></div>';
 h+='<div class="noterow"><input class="field" id="setnote" placeholder="Note for this take: boom in frame, use the end" value="'+esc(S.draft||'')+'"><button class="btn" id="setsay" aria-label="Say the note">SAY IT</button></div>';
 h+='<div class="marks">'+F.MARKS.map(([k,l])=>'<button class="btn mk mk-'+k+'" data-mk="'+k+'">'+l+'</button>').join('')+'</div><button class="btn block" data-mk="" style="margin-top:8px">LOG TAKE, NO MARK</button>';
 h+='<div class="row" style="margin-top:12px"><button class="btn pri" id="shotdone" style="flex:1">'+(x.done?'SHOT DONE ✓ · NEXT':'SHOT DONE · NEXT')+'</button>'+(tk.length?'<button class="btn ghost sm" id="undotake">UNDO TAKE '+tk.length+'</button>':'')+'</div>';
 h+=clickBox();
 if(tk.length) h+='<div class="tklist">'+tk.slice().reverse().map(t=>'<div><b>TAKE '+t.take+'</b>'+(t.mark?'<span class="tm tm-'+t.mark+'">'+F.markWord(t.mark)+'</span>':'')+(t.note?'<small>'+esc(t.note)+'</small>':'')+'<small class="faint">'+F.clockWord(t.at)+'</small></div>').join('')+'</div>';
 h+='<p class="sline" style="margin-top:12px">'+(nx?'Next: scene '+nx.n+', shot '+nx.idx+', '+esc(nx.shot.what)+(nx.block!==x.block?'. Then you move to '+esc(nx.where)+'.':'.'):'That\'s the last shot on the list.')+'</p>';
 h+='<details class="card"><summary class="kicker" style="cursor:pointer;margin:0">The day · '+D.filter(y=>y.done).length+' of '+D.length+' done</summary>'+D.map((y,k)=>(k===0||D[k-1].block!==y.block?'<p class="lab">'+esc(y.where)+'</p>':'')+'<button class="dl'+(k===i?' on':'')+(y.done?' done':'')+'" data-jump="'+k+'"><span>'+(y.done?'✓':'')+'</span><b>'+y.n+'.'+y.idx+'</b> '+esc(y.shot.what)+(takesOf(y).length?' <i>'+takesOf(y).length+' tk</i>':'')+'</button>').join('')+'</details>';
 h+='<details class="card"><summary class="kicker" style="cursor:pointer;margin:0">The plan</summary><div class="row" style="margin-top:10px"><label class="lab" style="margin:0">Call<input type="time" class="field" data-plan="call" value="'+esc(S.plan.call||'')+'"></label><label class="lab" style="margin:0">Wrap<input type="time" class="field" data-plan="wrap" value="'+esc(S.plan.wrap||'')+'"></label><label class="lab" style="margin:0">Min a shot<input type="number" min="1" max="240" class="field" data-plan="per" value="'+esc(S.plan.per||15)+'" style="width:96px"></label></div></details>';
 h+='<p class="kicker" style="margin-top:18px">This phone</p>'+front();
 return h;
}
/* a Bluetooth clicker on set: 1 press logs the take, 2 circles it, 3 marks the shot done */
const CLICK=window.Clicker?Clicker.make({title:'Story Studio: on set',
 onPress:n=>{ const e=$('clickn'); if(e) e.textContent='•'.repeat(n); },
 onPresses:n=>{ const e=$('clickn'); if(e) e.textContent=''; if(TAB!=='set'||WRAPVIEW||!cur()){ toast('The clicker works on TODAY.'); return; }
  const b=document.querySelector(n===1?'[data-mk=""]':n===2?'[data-mk="gold"]':'#shotdone'); if(!b) return; b.click();
  if(n===3) toast('Shot done. Next one up.'); const fl=$('clickflash'); if(fl){ fl.textContent=['','LOGGED','CIRCLED','SHOT DONE'][n]; fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); } }}):null;
function clickBox(){ if(!CLICK) return '';
 return '<div class="clickrow"><button class="btn sm'+(CLICK.isOn?'':' ghost')+'" id="clickon" aria-pressed="'+CLICK.isOn+'">'+(CLICK.isOn?'REMOTE ON':'USE A REMOTE')+'</button><span id="clickn" class="clickn" aria-hidden="true"></span></div>'
  +(CLICK.isOn?'<p class="sline clicklegend">Listening for your clicker. <b>1 press</b> logs the take. <b>2</b> circles it. <b>3</b> marks the shot done. Volume, play and page-turn buttons all count.</p>'
   :'<p class="faint ksmall" style="margin-top:4px">A Bluetooth clicker or selfie remote, so you can log takes without looking down.</p>'); }
function vWrap(){ const c=cur(), S=setOf(), t=F.wrapText({title:String(c.file||'Script').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/_/g,' '),date:c.dayDate||ymd(new Date()),shots:dayList(),log:S.log,delays:kitOf().delays,tones:kitOf().tones,reads:kitOf().read});
 return '<div class="row" style="margin-bottom:10px"><button class="lnk" id="wrapback">‹ Back to the day</button></div><div class="card"><p class="kicker">Wrap report</p><pre class="wrap">'+esc(t)+'</pre>'
  +'<div class="row"><button class="btn" id="wrapcopy">COPY</button><a class="btn" id="wrapmail" href="mailto:?subject='+encodeURIComponent('Wrap: '+t.split('\n')[0])+'&body='+encodeURIComponent(t)+'">EMAIL IT</a><button class="btn" id="wrapsave">SAVE AS TEXT</button></div>'
  +'<p class="faint" style="font-size:13px;margin:10px 0 0">For the editor and the crew. The circled takes and every note, scene by scene, and what\'s still to shoot.</p>'
  +'<p class="faint" style="font-size:13px;margin:10px 0 0">Before you erase a card: <a href="../footage/check.html" id="wrapcheck">CHECK THE COPY</a>. Every file on your copies, matched to the card.</p></div>'; }
function wireSet(){
 setLines(); const S=setOf();
 document.querySelectorAll('[data-allway]').forEach(b=>b.onclick=()=>{ SCENES.forEach(sc=>{ if(!wayOf(sc.n)) st(sc.n).way=b.dataset.allway; }); save(); render(); });
 const D=dayList(); if(!D.length) return; const i=nowIdx(D), x=D[i];
 const note=$('setnote'); if(note) note.oninput=()=>{ S.draft=note.value; save(); };
 if($('clickon')) $('clickon').onclick=async()=>{ if(CLICK.isOn) CLICK.off(); else await CLICK.on(); render(); };
 document.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>{ const tk=takesOf(x); S.log.push({id:rid('k'),n:x.n,shot:x.shot.id,take:tk.length+1,mark:b.dataset.mk,note:(note&&note.value.trim())||'',at:Date.now()}); S.draft=''; S.cur={n:x.n,shot:x.shot.id}; save(); render();
  toast('Take '+(tk.length+1)+(b.dataset.mk?' '+F.markWord(b.dataset.mk):'')+' logged.'); });
 if($('undotake')) $('undotake').onclick=()=>{ const tk=takesOf(x), last=tk[tk.length-1]; if(!last) return; S.log=S.log.filter(t=>t!==last); save(); render(); };
 if($('shotdone')) $('shotdone').onclick=()=>{ const s=st(x.n); s.done[x.shot.id]=1; const nx=D.slice(i+1).find(y=>!y.done)||D.find((y,k)=>k!==i&&!y.done); S.cur=nx?{n:nx.n,shot:nx.shot.id}:{n:x.n,shot:x.shot.id}; LASTSCENE=S.cur.n; save(); render(); };
 document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{ const y=D[+b.dataset.jump]; S.cur={n:y.n,shot:y.shot.id}; LASTSCENE=y.n; save(); render(); });
 document.querySelectorAll('[data-plan]').forEach(el=>el.onchange=()=>{ S.plan[el.dataset.plan]=el.dataset.plan==='per'?Math.max(1,+el.value||15):el.value; save(); setLines(); });
 if($('wrapit')) $('wrapit').onclick=()=>{ WRAPVIEW=true; render(); };
 const say=$('setsay'), SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(say){ if(!SR){ say.disabled=true; say.title='This browser can\'t turn speech into words.'; }
  else say.onclick=()=>{ if(DICT){ try{ DICT.stop(); }catch(e){} return; } const r=new SR(); DICT=r; r.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US')); r.interimResults=false; say.textContent='LISTENING'; say.classList.add('pri');
   r.onresult=e=>{ const w=[...e.results].map(z=>z[0].transcript).join(' ').trim(); if(w){ note.value=(note.value?note.value+' ':'')+w; S.draft=note.value; save(); } };
   r.onend=()=>{ DICT=null; say.textContent='SAY IT'; say.classList.remove('pri'); }; r.onerror=()=>{}; try{ r.start(); }catch(e){ DICT=null; } }; }
}
function wireWrap(){ const c=cur(), t=$('main').querySelector('pre.wrap').textContent;
 $('wrapback').onclick=()=>{ WRAPVIEW=false; render(); };
 $('wrapcopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(t); toast('Copied.'); }catch(e){ toast('This browser would not copy. Use SAVE AS TEXT.'); } };
 $('wrapsave').onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'})); a.download=String(c.file||'Script').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/[\\/:*?"<>|]+/g,' ')+' - wrap '+(c.dayDate||ymd(new Date()))+'.txt'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved.'); }; }
/* ---------- ON SET · TOOLS: a level for the camera, the sun and shadows, exposure and ND, depth of field, and what held
   the day up. The math is in fieldkit.js. Sensors only when you tap START, and it says while they're on. ---------- */
const K=window.FieldKit;
function kitSet(){ const d={tool:'level',N:2.8,iso:800,fps:24,angle:180,ev:15,f:50,c:0.025,dist:3,unit:/^en-US/i.test(navigator.language||'')?'ft':'m',aspect:'2.39'}; DB.kitset=DB.kitset||{}; Object.keys(d).forEach(x=>{ if(DB.kitset[x]==null) DB.kitset[x]=d[x]; }); return DB.kitset; }
function kitOf(){ if(cur()){ const S=setOf(); S.delays=S.delays||[]; S.read=S.read||{}; S.tones=S.tones||[]; if(DB.kit&&DB.kit.tones&&DB.kit.tones.length){ S.tones=DB.kit.tones.concat(S.tones).sort((a,b)=>a.at-b.at); DB.kit.tones=[]; save(); } if(DB.kit&&DB.kit.delays&&DB.kit.delays.length){ S.delays=DB.kit.delays.concat(S.delays).sort((a,b)=>a.at-b.at); DB.kit.delays=[]; save(); } return S; } DB.kit=DB.kit||{delays:[],read:{}}; DB.kit.tones=DB.kit.tones||[]; return DB.kit; }
function kitShot(){ if(!cur()) return null; const D=dayList(); if(!D.length) return null; const x=D[nowIdx(D)]; return x?{x,key:x.n+'|'+x.shot.id}:null; }
const LV={on:false,u:null,raw:0,raf:0,fn:null}, CP={on:false,h:null,fn:null}; let KLOC=null, KTIME='';
function lvStop(){ if(LV.fn){ window.removeEventListener('deviceorientation',LV.fn); } LV.on=false; LV.fn=null; LV.u=null; cancelAnimationFrame(LV.raf); }
function cpStop(){ if(CP.fn){ window.removeEventListener('deviceorientationabsolute',CP.fn); window.removeEventListener('deviceorientation',CP.fn); } CP.on=false; CP.fn=null; CP.h=null; }
function kitStop(){ lvStop(); cpStop(); if(typeof camStop==='function'){ camStop(); micStop(); } }
async function askMotion(){ const E=window.DeviceOrientationEvent; if(E&&typeof E.requestPermission==='function'){ try{ return (await E.requestPermission())==='granted'; }catch(e){ return false; } } return !!E; }
const KTOOLS=[['level','LEVEL'],['sun','SUN'],['expo','EXPOSURE'],['focus','FOCUS'],['frame','FRAME'],['light','LIGHT'],['sound','SOUND'],['delay','DELAYS']];
const opt=(list,v,f)=>list.map(x=>{ const [val,lab]=Array.isArray(x)?x:[x,f?f(x):x]; return '<option value="'+val+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(lab)+'</option>'; }).join('');
function vTools(){ const k=kitSet(), t=k.tool;
 let h='<div class="ktabs">'+KTOOLS.map(([id,l])=>'<button class="chip'+(id===t?' on':'')+'" data-ktool="'+id+'">'+l+'</button>').join('')+'</div>';
 if(t==='check') return h+vCheck();
 if(t==='level') h+=vLevel(); else if(t==='sun') h+=vSun(); else if(t==='expo') h+=vExpo(); else if(t==='focus') h+=vFocus(); else if(t==='frame') h+=vFrame(); else if(t==='light') h+=vLight(); else if(t==='sound') h+=vSound(); else h+=vDelay();
 return h+'<p class="chklink"><button class="lnk" id="tochk">Check these tools against real ones ›</button></p>'; }
function vLevel(){ const ks=kitShot(), saved=ks&&kitOf().read[ks.key];
 return '<div class="card"><p class="kicker">Camera level</p>'
  +(LV.on?'<div class="sensor"><span class="dot"></span>TILT SENSOR ON<button class="lnk" id="lvstop">STOP</button></div>':'')
  +'<svg class="lv" viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="112" class="lvring"/><path d="M8 120h30M202 120h30" class="lvref"/>'
  +'<g id="lvg"><line x1="30" y1="120" x2="210" y2="120" id="lvline"/></g><circle cx="120" cy="120" r="5" id="lvdot"/></svg>'
  +'<p class="lvbig" id="lvroll">'+(LV.on?'…':'Off')+'</p><p class="sline" id="lvpitch">'+(LV.on?'':'Hold the phone like the camera, upright or sideways, or lay it flat on the rig with the top toward the lens.')+'</p>'
  +'<p class="sline" id="lvmatch">'+(saved?'Saved for this shot: '+esc(K.rollWord(saved.roll))+', '+esc(K.pitchWord(saved.pitch,0.5,saved.flat))+'.':'')+'</p>'
  +'<div class="row" style="margin-top:10px">'+(LV.on?'':'<button class="btn pri" id="lvstart" style="flex:1">START</button>')
  +(ks?'<button class="btn" id="lvsave"'+(LV.on?'':' disabled')+'>SAVE FOR THIS SHOT</button>'+(saved?'<button class="btn ghost sm" id="lvclear">CLEAR SAVED</button>':''):'')+'</div>'
  +(ks?'<p class="faint ksmall">This shot: scene '+ks.x.n+', shot '+ks.x.idx+'. Save the angle and you can match it later for a pickup.</p>':'<p class="faint ksmall">With a shot list running in TODAY, you can save the angle to the shot and match it later.</p>')
  +(LV.on?'<div class="row" style="margin-top:8px"><button class="btn sm" id="lvzero">ZERO ON THE RIG</button>'+(kitSet().zero?'<button class="btn sm ghost" id="lvunzero">CLEAR ZERO</button>':'')+'</div>':'')
  +'<p class="faint ksmall">The phone\'s tilt sensor, not checked against a real level yet. The phone is never quite square on a rig: level the camera with its own bubble, then ZERO ON THE RIG, and readings start from there'+(kitSet().zero?' (zeroed '+(kitSet().zero.flat?'flat':'upright')+')':'')+'.</p></div>'; }
function sunPlace(){ const ks=kitShot(), o=ks&&locOf(ks.x.n), g=o&&F.coords(o.where); if(g) return {lat:g.lat,lng:g.lng,name:o.name}; return KLOC; }
function kitWhen(){ if(!KTIME) return new Date(); const [h,m]=KTIME.split(':').map(Number), d=new Date(shootDate()); d.setHours(h,m,0,0); return d; }
function vSun(){ const P=sunPlace(), when=kitWhen();
 let h='<div class="card"><p class="kicker">Sun and shadows</p>';
 if(!P) return h+'<p class="dim" style="margin:0 0 10px">Where are you shooting? Pin the place in OWNED, or use where you are.</p><div class="row"><button class="btn pri" id="sunhere">USE WHERE I AM</button></div>'
  +'<label class="lab">Or type it: latitude, longitude<input class="field" id="sunll" placeholder="38.84, -97.61"></label><button class="btn block" id="sunset" style="margin-top:8px">USE THIS</button>'
  +'<p class="faint ksmall">Where you are is asked for once, used here, and not kept.</p></div>';
 const p=K.sunPos(when,P.lat,P.lng), S=F.sun(when,P.lat,P.lng);
 h+='<p class="dim" style="margin:0 0 6px">'+esc(P.name||'Here')+' · '+esc(when.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}))+'</p>'
  +'<div class="row" style="align-items:flex-end"><label class="lab" style="margin:0;flex:1">At<input type="time" class="field" id="suntime" value="'+esc(KTIME||String(when.getHours()).padStart(2,'0')+':'+String(when.getMinutes()).padStart(2,'0'))+'"></label><button class="btn sm" id="sunnow">NOW</button></div>'
  +'<p class="lvbig" style="font-size:20px;margin-top:12px">'+esc(K.sunWords(p))+'</p>';
 if(S&&!S.polar) h+='<p class="sline">'+[['Sunrise',S.sunrise],['Golden hour',S.goldenEveningStarts],['Sunset',S.sunset],['Dark',S.dusk]].map(([l,d])=>l+' '+hm(d)).join(' · ')+'</p>';
 else if(S&&S.polar) h+='<p class="sline">'+esc(S.polar)+'</p>';
 const rows=[]; for(let i=0;i<10;i++){ const d=new Date(when.getTime()+i*3600000); d.setMinutes(0,0,0); if(i===0) continue; const q=K.sunPos(d,P.lat,P.lng); if(q.up<-6) break; rows.push('<tr><td>'+hm(d)+'</td><td>'+(q.up>-0.833?q.up.toFixed(0)+'° up':'down')+'</td><td>'+K.compass(q.az)+'</td><td>'+(K.shadow(q.up)!=null?'shadows '+K.shadow(q.up)+'×':'')+'</td></tr>'); }
 if(rows.length) h+='<table class="ktab"><tr><th>Hour</th><th>Sun</th><th>From the</th><th></th></tr>'+rows.join('')+'</table>';
 h+=(CP.on?'<div class="sensor"><span class="dot"></span>COMPASS ON<button class="lnk" id="cpstop">STOP</button></div><p class="lvbig" id="cpword">Point the top of the phone where the camera looks.</p>'
   :'<button class="btn block" id="cpstart" style="margin-top:10px">POINT THE PHONE AT THE SUN</button>')
  +'<p class="faint ksmall">The sun\'s place is worked out, not guessed. The phone\'s compass can drift near cars and metal: check it against a shadow.</p>'
  +(KLOC&&P===KLOC?'<button class="lnk" id="sunforget">Use a different place</button>':'')+'</div>';
 return h; }
function vExpo(){ const k=kitSet(), t=K.shutter(k.fps,k.angle), E=K.exposure({ev:k.ev,N:k.N,iso:k.iso,t});
 return '<div class="card"><p class="kicker">Exposure and ND</p><div class="kgrid">'
  +'<label class="lab">Light<select class="field" data-kset="ev">'+opt(K.LIGHT.map(([l,v])=>[v,l]),k.ev)+'</select></label>'
  +'<label class="lab">f-stop<select class="field" data-kset="N">'+opt(K.STOPS,k.N,x=>'f/'+x)+'</select></label>'
  +'<label class="lab">ISO<select class="field" data-kset="iso">'+opt(K.ISOS,k.iso)+'</select></label>'
  +'<label class="lab">Frame rate<select class="field" data-kset="fps">'+opt(K.FPS,k.fps)+'</select></label>'
  +'<label class="lab">Shutter angle<select class="field" data-kset="angle">'+opt(K.ANGLES,k.angle,x=>x+'°')+'</select></label>'
  +'<div class="lab">Shutter<div class="kval">'+K.shutterWord(t)+'</div></div></div>'
  +'<p class="lvbig" id="expohead">'+esc(E.head)+'</p>'+E.words.map(w=>'<p class="sline">'+esc(w)+'</p>').join('')
  +'<p class="faint ksmall">The light list is the old rule of thumb (sunny 16). A meter reading beats it. The math after it is exact.</p></div>'; }
function vFocus(){ const k=kitSet(), d=K.dof({f:k.f,N:k.N,c:k.c,s:k.unit==='ft'?k.dist*0.3048:k.dist}), W=K.dofWords(d,k.unit);
 return '<div class="card"><p class="kicker">Depth of field</p><div class="kgrid">'
  +'<label class="lab">Lens (mm)<input class="field" type="number" min="4" max="1200" inputmode="decimal" data-kset="f" value="'+esc(k.f)+'"></label>'
  +'<label class="lab">f-stop<select class="field" data-kset="N">'+opt(K.STOPS,k.N,x=>'f/'+x)+'</select></label>'
  +'<label class="lab">Sensor<select class="field" data-kset="c">'+opt(K.SENSORS.map(([l,v])=>[v,l]),k.c)+'</select></label>'
  +'<label class="lab">Focused at ('+(k.unit==='ft'?'feet':'meters')+')<input class="field" type="number" min="0.1" step="0.1" inputmode="decimal" data-kset="dist" value="'+esc(k.dist)+'"></label></div>'
  +'<div class="row"><button class="chip'+(k.unit==='ft'?' on':'')+'" data-kunit="ft">FEET</button><button class="chip'+(k.unit==='m'?' on':'')+'" data-kunit="m">METERS</button></div>'
  +(W.length?'<p class="lvbig" style="font-size:20px;margin-top:12px">'+esc(W[0])+'</p><p class="sline">'+esc(W[1])+'</p>':'<p class="sline">Fill in the lens and the distance.</p>')
  +'<p class="faint ksmall">Sharp enough for a normal screen. On a big screen, or a soft lens wide open, it\'s shallower than this.</p></div>'; }
function vDelay(){ const S=kitOf(), run=S.delays.find(d=>!d.end), done=S.delays.filter(d=>d.end), lost=done.reduce((a,d)=>a+K.mins(d),0);
 let h='<div class="card"><p class="kicker">What held the day up</p>';
 if(run) h+='<div class="nowcard"><span class="nk">WAITING ON · SINCE '+esc(F.clockWord(run.at))+'</span><h2>'+esc(K.whyWord(run.why))+'</h2><div class="takeno" id="dlmins">'+K.mins(run)+' MIN</div></div>'
  +'<input class="field" id="dlnote" placeholder="What happened: plane overhead, lens fogged" value="'+esc(run.note||'')+'"><button class="btn pri block" id="dlend" style="margin-top:8px">BACK TO WORK</button>';
 else h+='<p class="dim" style="margin:0 0 10px">Tap what you\'re waiting on. Tap again when you\'re rolling. It goes in the wrap report.</p><div class="kwhy">'+K.WHY.map(([id,l])=>'<button class="btn" data-dl="'+id+'">'+esc(l)+'</button>').join('')+'</div>';
 if(done.length) h+='<p class="lab" style="margin-top:14px">Today · '+done.length+' delay'+(done.length===1?'':'s')+', '+lost+' minute'+(lost===1?'':'s')+' lost</p><div class="tklist">'+done.slice().reverse().map(d=>'<div><b>'+esc(F.clockWord(d.at))+'</b> '+esc(K.whyWord(d.why))+', '+K.mins(d)+' min'+(d.note?'<small>'+esc(d.note)+'</small>':'')+'</div>').join('')+'</div><button class="btn ghost sm" id="dlundo" style="margin-top:8px">UNDO LAST</button>';
 return h+(cur()?'':'<p class="faint ksmall">No script in yet: these are kept on the phone and go in the wrap report once there is one.</p>')+'</div>'; }
function lvDraw(){ if(!LV.on) return; const u=LV.u, el=$('lvroll');
 if(!el){ return; }
 if(!u){ el.textContent=LV.raw?'…':'Waiting for the sensor'; LV.raf=requestAnimationFrame(lvDraw); return; }
 const r=K.zeroed(K.level(u),kitSet().zero), lvl=Math.abs(r.roll)<0.5, g=$('lvg'), dot=$('lvdot');
 if(g) g.setAttribute('transform','rotate('+(-r.roll).toFixed(2)+' 120 120)');
 if(dot) dot.setAttribute('cy',String(120-Math.max(-90,Math.min(90,r.pitch*3))));
 document.querySelector('svg.lv').classList.toggle('ok',lvl);
 el.textContent=K.rollWord(r.roll).replace(/^level$/,'LEVEL').replace(/^t/,'T'); $('lvpitch').textContent=r.hold.replace(/^./,c=>c.toUpperCase())+(r.zeroed?' · zeroed':'')+' · '+K.pitchWord(r.pitch,0.5,r.flat); LV.raw0=K.level(u);
 const ks=kitShot(), sv=ks&&kitOf().read[ks.key]; if(sv) $('lvmatch').textContent=K.match(r,sv);
 LV.last=r; LV.raf=requestAnimationFrame(lvDraw); }
/* camera and mic: only on START, one at a time, a light on the screen while they're on, off when you leave */
const CAM={stream:null,loop:0,spots:[]}, MIC={stream:null,ctx:null,an:null,src:null,raf:0,peak:-Infinity,peakAt:0,hum:null,humAt:0,run:null};
function camStop(){ monStop(); if(CAM.stream) CAM.stream.getTracks().forEach(t=>t.stop()); CAM.stream=null; clearInterval(CAM.loop); }
/* watch on another phone: this phone's camera on a second screen, phone to phone over the Wi-Fi, by two codes */
const ML=window.MonitorLink, MON={pc:null,url:'',stage:'',scan:0,busy:false};
function monStop(){ clearInterval(MON.scan); MON.scan=0; try{ MON.pc&&MON.pc.close(); }catch(e){} MON.pc=null; MON.url=''; MON.stage=''; MON.busy=false; }
async function monStart(){ if(!ML||!CAM.stream) return; monStop(); MON.stage='making'; render();
 try{ const k=kitSet(), base=new URL('monitor.html',location.href).href.replace(/#.*$/,'');
  const r=await ML.offer(CAM.stream,{aspect:k.aspect,grid:k.grid!==false},base); if(MON.stage!=='making'||!CAM.stream){ try{ r.pc.close(); }catch(e){} return; }
  MON.pc=r.pc; MON.url=r.url; MON.stage='code';
  const st=()=>{ if(MON.pc!==r.pc) return; const s=r.pc.connectionState||r.pc.iceConnectionState;
   if((s==='connected'||s==='completed')&&MON.stage!=='live'){ MON.stage='live'; clearInterval(MON.scan); MON.scan=0; toast('Sending to the other phone.'); if(TAB==='tools') render(); }
   else if(s==='failed'&&MON.stage!=='lost'){ MON.stage='lost'; clearInterval(MON.scan); if(TAB==='tools') render(); } };
  r.pc.addEventListener('connectionstatechange',st); r.pc.addEventListener('iceconnectionstatechange',st);
  render(); monScan();
 }catch(e){ MON.stage=''; toast('This phone can\'t send its picture. Try Safari or Chrome, up to date.'); render(); } }
async function monTake(text){ if(!MON.pc||MON.busy||MON.stage!=='code') return false; MON.busy=true;
 try{ await ML.accept(MON.pc,text); MON.stage='joining'; clearInterval(MON.scan); MON.scan=0; render(); return true; }
 catch(e){ MON.busy=false; return false; } }
async function monScan(){ clearInterval(MON.scan); let read=null; try{ read=await ML.reader(''); }catch(e){ const el=$('monscan'); if(el) el.textContent='This phone can\'t read codes. Copy the code on the other phone and paste it below.'; return; }
 let going=false; MON.scan=setInterval(async()=>{ if(going||MON.stage!=='code') return; const v=$('camv'); if(!v||!v.videoWidth) return; going=true;
  try{ const t=await read(v); if(t&&t.indexOf(ML.ANSWER)>=0){ if(!(await monTake(t))){ const el=$('monscan'); if(el) el.textContent='That code didn\'t fit. Make a new one on both phones.'; } } }catch(e){} going=false; },350); }
function monBox(){ if(!ML||!window.RTCPeerConnection||!window.CompressionStream) return '';
 let h='<div class="mon"><p class="lab" style="margin-top:0">Watch on another phone</p>';
 if(!MON.stage) return h+'<p class="dim" style="margin:0 0 10px">Put this picture on a second phone for the director or the client, over your own Wi-Fi. Two codes, no app, no account. Nothing goes through a server.</p><button class="btn block" id="monstart">WATCH ON ANOTHER PHONE</button></div>';
 if(MON.stage==='making') return h+'<p class="dim">Making the code…</p></div>';
 if(MON.stage==='code') return h+'<p><b>1.</b> On the other phone, point its camera at this code and open the link.</p>'+ML.qrSvg(MON.url)
  +'<div class="row" style="justify-content:center">'+(navigator.share?'<button class="btn sm" id="monshare">SEND THE LINK</button>':'')+'<button class="btn sm" id="moncopy">COPY THE LINK</button></div>'
  +'<p style="margin-top:10px"><b>2.</b> It shows a code back. Hold it up to this phone\'s lens.</p><p class="sline" id="monscan">Looking for the other phone\'s code…</p>'
  +'<details><summary class="faint" style="cursor:pointer">Or paste its code</summary><textarea class="field" id="monpaste" placeholder="Paste the code from the other phone"></textarea><button class="btn sm" id="monuse" style="margin-top:6px">USE IT</button></details>'
  +'<div class="row"><button class="btn sm ghost" id="moncancel">CANCEL</button></div><p class="faint ksmall">Both phones on the same Wi-Fi. Picture only, no sound.</p></div>';
 if(MON.stage==='joining') return h+'<p class="dim">Got it. Joining up…</p><div class="row"><button class="btn sm ghost" id="moncancel">CANCEL</button></div></div>';
 if(MON.stage==='lost') return h+'<p><b>The phones couldn\'t reach each other.</b> Are both on the same Wi-Fi? Some public and hotel Wi-Fi keeps phones apart; a phone\'s hotspot works.</p><button class="btn block" id="monstart">TRY AGAIN</button></div>';
 return h+'<p class="dim" style="margin:0">The other phone has the picture. Leaving this screen or stopping the camera stops it.</p></div>'; }
function wireMon(){
 if($('monstart')) $('monstart').onclick=()=>monStart();
 if($('moncancel')) $('moncancel').onclick=()=>{ monStop(); render(); };
 if($('monstop')) $('monstop').onclick=()=>{ monStop(); toast('Stopped sending.'); render(); };
 if($('moncopy')) $('moncopy').onclick=async()=>{ try{ await navigator.clipboard.writeText(MON.url); toast('Link copied. Send it to the other phone.'); }catch(e){ prompt('Copy this link:',MON.url); } };
 if($('monshare')) $('monshare').onclick=()=>navigator.share({title:'Story Studio monitor',url:MON.url}).catch(()=>{});
 if($('monuse')) $('monuse').onclick=async()=>{ if(!(await monTake($('monpaste').value))) toast('That isn\'t the code from the other phone.'); };
}
function micStop(){ if(MIC.stream) MIC.stream.getTracks().forEach(t=>t.stop()); try{ MIC.src&&MIC.src.disconnect(); }catch(e){} MIC.stream=MIC.src=MIC.an=null; cancelAnimationFrame(MIC.raf); MIC.run=null; }
async function camStart(){ micStop(); try{ CAM.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false}); return true; }
 catch(e){ if(e&&e.hot==='notnow') return false; if(!(e&&e.hot)) toast(e&&e.name==='NotAllowedError'?'The camera wasn\'t allowed. Allow it for this site, then START.':'No camera here.'); return false; } }
async function micStart(){ camStop(); try{ MIC.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
 const C=window.AudioContext||window.webkitAudioContext; MIC.ctx=MIC.ctx||new C(); if(MIC.ctx.state==='suspended') await MIC.ctx.resume();
 MIC.src=MIC.ctx.createMediaStreamSource(MIC.stream); MIC.an=MIC.ctx.createAnalyser(); MIC.an.fftSize=8192; MIC.an.smoothingTimeConstant=0.6; MIC.src.connect(MIC.an); MIC.peak=-Infinity; return true; }
 catch(e){ if(e&&e.hot==='notnow') return false; if(!(e&&e.hot)) toast(e&&e.name==='NotAllowedError'?'The mic wasn\'t allowed. Allow it for this site, then START.':'No mic here.'); return false; } }
const camBox=()=>'<div class="cam"><video id="camv" playsinline muted autoplay></video><svg id="camo" preserveAspectRatio="xMidYMid meet"></svg></div>';
function vFrame(){ const k=kitSet(); k.aspect=k.aspect||'2.39';
 return '<div class="card"><p class="kicker">Frame lines</p>'
  +(CAM.stream?'<div class="sensor"><span class="dot"></span>CAMERA ON<button class="lnk" id="camstop">STOP</button></div>'+(MON.stage==='live'?'<div class="sensor" id="monlive"><span class="dot"></span>SENDING TO 1 SCREEN<button class="lnk" id="monstop">STOP SENDING</button></div>':'')+camBox():'<p class="dim" style="margin:0 0 10px">The phone\'s camera with your frame on it. Walk the space and find the shot.</p><button class="btn pri block" id="camstart">START CAMERA</button>')
  +'<div class="row" style="margin-top:10px">'+K.ASPECTS.map(([v,l])=>'<button class="chip'+(v===k.aspect?' on':'')+'" data-aspect="'+v+'">'+l+'</button>').join('')+'</div>'
  +'<div class="row"><button class="chip'+(k.grid!==false?' on':'')+'" id="fgrid">THIRDS</button><button class="chip'+(k.cross?' on':'')+'" id="fcross">CENTER</button></div>'
  +'<p class="faint ksmall">The phone\'s lens is wider than most cinema lenses, so this is the shape of the frame, not what a 50mm sees. Nothing is recorded.</p>'+(CAM.stream?monBox():'')+'</div>'; }
function vLight(){
 return '<div class="card"><p class="kicker">Light: two spots</p>'
  +(CAM.stream?'<div class="sensor"><span class="dot"></span>CAMERA ON<button class="lnk" id="camstop">STOP</button></div>'+camBox()+'<p class="lvbig" style="font-size:20px" id="ltword">Tap the bright side, then the dark side.</p><p class="sline" id="ltwarn"></p><p class="sline" id="ltclip"></p>'
   +'<div class="row"><button class="btn sm ghost" id="ltclear">CLEAR SPOTS</button></div>'
   :'<p class="dim" style="margin:0 0 10px">Point the camera at your subject and tap two places: the key side and the fill side. It tells you how many stops apart they are.</p><button class="btn pri block" id="camstart">START CAMERA</button>')
  +'<p class="faint ksmall">Inside one picture only. The phone keeps changing its own exposure, so it can\'t give you an f-stop, but two spots in the same frame got the same exposure. Phones also flatten contrast, so the real ratio may be a bit bigger. Not checked against a meter yet. Nothing is recorded.</p></div>'; }
function vSound(){ const S=kitOf(), T=S.tones||[], last=T[T.length-1];
 let h='<div class="card"><p class="kicker">Sound: room tone and hum</p>';
 if(!MIC.stream) return h+'<p class="dim" style="margin:0 0 10px">How loud the room is, any steady hum, and a timer for room tone. The phone\'s own noise cleanup is switched off so you hear the room as it is.</p><button class="btn pri block" id="micstart">START MIC</button>'
  +(last?'<p class="sline" style="margin-top:10px">Last room tone: '+esc(K.toneWords(last).join(' '))+'</p>':'')+'<p class="faint ksmall">Nothing is recorded; it only measures. Levels are dBFS (against the phone\'s own top), not a sound meter\'s dB SPL.</p></div>';
 h+='<div class="sensor"><span class="dot"></span>MIC ON<button class="lnk" id="micstop">STOP</button></div>'
  +'<div class="meter"><div id="sndbar"></div></div><p class="lvbig" id="snddb">…</p><p class="sline" id="sndpeak"></p><p class="sline" id="sndhum">Listening for hum…</p>';
 if(MIC.run) h+='<div class="nowcard"><span class="nk">ROOM TONE · QUIET, EVERYONE</span><h2 id="rtleft">'+Math.max(0,Math.ceil((MIC.run.end-Date.now())/1000))+' s</h2></div><button class="btn block" id="rtcancel">STOP EARLY</button>';
 else h+='<div class="row" style="margin-top:10px"><button class="btn pri" data-rt="30" style="flex:1">ROOM TONE 30 S</button><button class="btn" data-rt="60">60 S</button></div>';
 if(T.length) h+='<p class="lab" style="margin-top:14px">Today · '+T.length+'</p><div class="tklist">'+T.slice().reverse().map((t,i)=>'<div><b>'+esc(F.clockWord(t.at))+'</b> '+esc((t.where?t.where+' · ':'')+t.secs+' s, average '+K.dbWord(t.avg))+(t.hum?'<small>hum at '+t.hum+' Hz</small>':'')+'</div>').join('')+'</div>';
 return h+'<p class="faint ksmall">Roll your recorder for the same 30 seconds; this logs it and checks it. Nothing is recorded here. Levels are dBFS, not dB SPL.</p></div>'; }
function camWire(){ const v=$('camv'); if(!v||!CAM.stream) return; v.srcObject=CAM.stream; const draw=()=>{ if(TAB==='tools') camOverlay(); }; v.onloadedmetadata=draw; v.onresize=draw; draw(); }
function camOverlay(){ const v=$('camv'), o=$('camo'), k=kitSet(); if(!v||!o||!v.videoWidth) return; const w=v.videoWidth, h=v.videoHeight; o.setAttribute('viewBox','0 0 '+w+' '+h);
 let s='';
 if(k.tool==='frame'){ const f=K.frameIn(w,h,+k.aspect); s+='<path class="mask" fill-rule="evenodd" d="M0 0H'+w+'V'+h+'H0Z M'+f.x+' '+f.y+'h'+f.w+'v'+f.h+'h'+(-f.w)+'Z"/><rect class="fline" x="'+f.x+'" y="'+f.y+'" width="'+f.w+'" height="'+f.h+'"/>';
  if(k.grid!==false) [1,2].forEach(i=>{ s+='<line class="grid" x1="'+(f.x+f.w*i/3)+'" y1="'+f.y+'" x2="'+(f.x+f.w*i/3)+'" y2="'+(f.y+f.h)+'"/><line class="grid" x1="'+f.x+'" y1="'+(f.y+f.h*i/3)+'" x2="'+(f.x+f.w)+'" y2="'+(f.y+f.h*i/3)+'"/>'; });
  if(k.cross){ const cx=f.x+f.w/2, cy=f.y+f.h/2, d=Math.min(f.w,f.h)*0.04; s+='<path class="grid" d="M'+(cx-d)+' '+cy+'h'+2*d+'M'+cx+' '+(cy-d)+'v'+2*d+'"/>'; }
  s+='<text class="flab" x="'+(f.x+12)+'" y="'+(f.y+Math.max(28,h*0.05))+'" font-size="'+Math.max(18,h*0.035)+'">'+esc((K.ASPECTS.find(a=>a[0]===k.aspect)||[0,''])[1])+'</text>'; }
 else CAM.spots.forEach((p,i)=>{ const r=Math.max(14,w*0.025); s+='<circle class="spt" cx="'+p.x*w+'" cy="'+p.y*h+'" r="'+r+'"/><text class="flab" x="'+(p.x*w+r+6)+'" y="'+(p.y*h+r*0.4)+'" font-size="'+r*1.4+'">'+(i?'B':'A')+'</text>'; });
 o.innerHTML=s; }
function lightRead(){ const v=$('camv'); if(!v||!v.videoWidth||CAM.spots.length<1) return; const W=160, H=Math.round(160*v.videoHeight/v.videoWidth);
 const c=lightRead.c||(lightRead.c=document.createElement('canvas')); c.width=W; c.height=H; const g=c.getContext('2d',{willReadFrequently:true}); g.drawImage(v,0,0,W,H); const px=g.getImageData(0,0,W,H).data;
 const sp=CAM.spots.map(p=>K.spot(px,W,H,p.x*W,p.y*H,3)); $('ltclip').textContent=K.clipped(px)>2?K.clipped(px)+'% of the picture is blown out.':'';
 if(sp.length<2){ $('ltword').textContent='Now tap the dark side.'; return; }
 const R=K.ratio(sp[0],sp[1]); $('ltword').textContent=R.words; $('ltwarn').textContent=(R.warn||[]).join(' '); CAM.last=R; }
function micLoop(){ if(!MIC.an) return; if(MIC.stream&&MIC.stream.getTracks().every(t=>t.readyState==='ended')){ micStop(); render(); return; } const an=MIC.an, buf=new Float32Array(an.fftSize); an.getFloatTimeDomainData(buf); const d=K.dbfs(K.rms(buf)), now=Date.now();
 if(d>MIC.peak||now-MIC.peakAt>3000){ MIC.peak=d; MIC.peakAt=now; }
 const db=$('snddb'); if(db){ db.textContent=K.dbWord(d); $('sndpeak').textContent='Loudest in the last 3 s: '+K.dbWord(MIC.peak); const pct=isFinite(d)?Math.max(0,Math.min(100,(d+90)/90*100)):0; $('sndbar').style.width=pct+'%'; }
 if(now-MIC.humAt>700){ MIC.humAt=now; const f=new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(f); MIC.hum=K.hum(f,MIC.ctx.sampleRate,an.fftSize); const hh=$('sndhum'); if(hh) hh.textContent=K.humWords(MIC.hum); }
 if(MIC.run){ if(isFinite(d)) MIC.run.vals.push(d); if(MIC.hum) MIC.run.hums.push(MIC.hum.hz); const left=Math.ceil((MIC.run.end-now)/1000), el=$('rtleft'); if(el) el.textContent=Math.max(0,left)+' s'; if(now>=MIC.run.end) rtDone(); }
 MIC.raf=requestAnimationFrame(micLoop); }
function rtDone(cut){ const r=MIC.run; if(!r) return; MIC.run=null; const secs=Math.round((Math.min(Date.now(),r.end)-r.at)/1000);
 if(!r.vals.length||secs<3){ toast('Too short to count.'); render(); return; }
 const lin=r.vals.map(x=>Math.pow(10,x/10)), avg=Math.round(10*Math.log10(lin.reduce((a,b)=>a+b,0)/lin.length)*10)/10, peak=Math.max(...r.vals);
 const hz=r.hums.length>r.vals.length/30?r.hums.sort((a,b)=>a-b)[Math.floor(r.hums.length/2)]:null;
 const ks=kitShot(), S=kitOf(), prev=S.tones[S.tones.length-1], t={id:rid('r'),at:r.at,secs,avg,peak:Math.round(peak*10)/10,hum:hz,where:ks?ks.x.where||'':''};
 S.tones.push(t); save(); toast(K.toneWords(t,prev).join(' ')); render(); }
/* CHECK THE TOOLS: this phone against real instruments. Kept on the phone (DB.check); CSV or CINEKNIFE JSON out and in. */
function chkOf(){ const g=navigator.userAgent||'', m=g.match(/Android [\d.]+; ([^;)]+)/), guess=m?m[1].trim():/iPhone/.test(g)?'iPhone':/iPad/.test(g)?'iPad':'This phone';
 DB.check=DB.check||{}; const C=DB.check; C.rows=C.rows||[]; C.targets=C.targets||{}; if(!C.device) C.device=guess; if(!C.inst) C.inst='level'; if(!C.axis) C.axis='roll'; return C; }
const CHKHOW={level:'Put the phone and a real level on the same tilted surface. Type what the real one says, then take the phone\'s. Do it at different angles: 30 times.',
 compass:'Hold the phone and a real compass pointing the same way, away from cars and metal. Type the real heading, then take the phone\'s. Face different ways: 30 times.',
 light:'Meter two spots with your light meter (key side, fill side) and type the difference in stops. Then tap the same two spots in LIGHT, and take the phone\'s.',
 sound:'Read two rooms on a sound meter and type the difference in dB. Run a ROOM TONE in each room in SOUND, then take the phone\'s: the difference between the last two.'};
function chkPhone(C){ if(C.inst==='light') return CAM.last&&isFinite(CAM.last.stops)?Math.abs(CAM.last.stops):null;
 if(C.inst==='sound'){ const T=kitOf().tones; return T.length>1?Math.round(Math.abs(T[T.length-1].avg-T[T.length-2].avg)*10)/10:null; }
 if(C.inst==='compass') return CP.h!=null?Math.round(CP.h*10)/10:null;
 if(!LV.u) return null; const r=K.zeroed(K.level(LV.u),kitSet().zero); return Math.abs(C.axis==='pitch'?r.pitch:r.roll); }
function vCheck(){ const C=chkOf(), c=K.check(C.inst), mine=C.rows.filter(r=>r.instrument===C.inst&&r.device===C.device), res=K.evaluate(mine,C.targets)[0], t=C.targets[C.inst]||c[4];
 let h='<div class="card"><p class="kicker">Check the tools against real ones</p><p class="dim" style="margin:0 0 10px">Readings from this phone next to a real instrument. '+K.MIN+' pairs, or it won\'t say either way. Kept on this phone.</p>'
  +'<label class="lab">This phone<input class="field" id="chkdev" value="'+esc(C.device)+'" placeholder="iPhone 15, Pixel 8"></label>'
  +'<div class="row">'+K.CHECKS.map(([id,n])=>'<button class="chip'+(id===C.inst?' on':'')+'" data-chk="'+id+'">'+esc(n.toUpperCase())+'</button>').join('')+'</div>'
  +'<p class="sline">'+esc(CHKHOW[C.inst])+'</p>';
 if(C.inst==='level') h+='<div class="row"><button class="chip'+(C.axis==='roll'?' on':'')+'" data-axis="roll">LEAN (IN THE FRAME)</button><button class="chip'+(C.axis==='pitch'?' on':'')+'" data-axis="pitch">UP AND DOWN</button></div>';
 if((C.inst==='level'&&LV.on)||(C.inst==='compass'&&CP.on)) h+='<div class="sensor"><span class="dot"></span>'+(C.inst==='level'?'TILT SENSOR ON':'COMPASS ON')+'<button class="lnk" id="chkstop">STOP</button></div>';
 h+='<div class="kgrid"><label class="lab">The real one ('+esc(c[2])+')<input class="field" id="chkref" type="number" step="0.1" inputmode="decimal"></label><label class="lab">This phone ('+esc(c[2])+')<input class="field" id="chkobs" type="number" step="0.1" inputmode="decimal"></label></div>'
  +'<div class="row"><button class="btn" id="chkuse">TAKE THE PHONE\'S</button><button class="btn pri" id="chkadd" style="flex:1">ADD</button></div>'
  +'<input class="field" id="chknote" placeholder="Note (optional): which level, where" style="margin-top:8px">';
 if(res) h+='<div class="chkres chk-'+res.status.replace(' ','').toLowerCase()+'"><b>'+esc(res.status)+'</b><span>'+esc(res.name)+' · '+esc(C.device)+'</span></div>'+K.checkWords(res).map(w=>'<p class="sline">'+esc(w)+'</p>').join('');
 else h+='<p class="sline" style="margin-top:10px">No readings for '+esc(c[1].toLowerCase())+' on this phone yet.</p>';
 h+='<details style="margin-top:8px"><summary class="lab" style="cursor:pointer">Target</summary><div class="kgrid"><label class="lab">On average, within<input class="field" type="number" step="0.1" data-tgt="mae" value="'+t.mae+'"></label><label class="lab">95 in 100, within<input class="field" type="number" step="0.1" data-tgt="p95" value="'+t.p95+'"></label></div></details>';
 if(mine.length) h+='<div class="tklist">'+mine.slice(-8).reverse().map(r=>'<div><b>'+r.reference+' / '+r.observed+'</b> off by '+Math.round(K.err(r.instrument,r.reference,r.observed)*100)/100+' '+esc(c[2])+(r.note?'<small>'+esc(r.note)+'</small>':'')+'<button class="lnk" data-chkdel="'+r.id+'">remove</button></div>').join('')+'</div>';
 h+='<div class="row" style="margin-top:12px"><button class="btn sm" id="chkcsv"'+(C.rows.length?'':' disabled')+'>SAVE AS CSV</button><button class="btn sm" id="chkjson"'+(C.rows.length?'':' disabled')+'>SAVE AS JSON</button><button class="btn sm ghost" id="chkin">BRING READINGS IN</button></div><input type="file" id="chkfile" accept=".csv,.json,text/csv,application/json" class="hide">'
  +'<p class="faint ksmall">PASS means inside your target on this phone, nothing more. Brings in this sheet\'s CSV or CINEKNIFE\'s JSON. Phone dBFS and a sound meter\'s dB SPL aren\'t the same measure, so sound is checked as the change between two rooms.</p>'
  +'<button class="lnk" id="chkback">‹ Back to the tools</button></div>';
 return h; }
function wireCheck(){ const C=chkOf();
 $('chkdev').onchange=()=>{ C.device=$('chkdev').value.trim()||C.device; save(); render(); };
 document.querySelectorAll('[data-chk]').forEach(b=>b.onclick=()=>{ C.inst=b.dataset.chk; lvStop(); cpStop(); save(); render(); });
 document.querySelectorAll('[data-axis]').forEach(b=>b.onclick=()=>{ C.axis=b.dataset.axis; save(); render(); });
 if($('chkstop')) $('chkstop').onclick=()=>{ lvStop(); cpStop(); render(); };
 $('chkuse').onclick=async()=>{ const fill=()=>{ const v=chkPhone(C); if(v==null){ toast(C.inst==='light'?'No LIGHT reading yet: tap two spots in LIGHT first.':C.inst==='sound'?'Run two room tones in SOUND first.':'No reading yet. Hold still a moment and tap again.'); return; } $('chkobs').value=v; };
  if(C.inst==='level'&&!LV.on){ if(!(await askMotion())){ toast('The tilt sensor was not allowed.'); return; } LV.on=true; LV.raw=0; LV.fn=e=>{ if(e.beta==null&&e.gamma==null) return; LV.raw++; LV.u=K.smooth(LV.u,K.up(e.beta,e.gamma),0.3); }; window.addEventListener('deviceorientation',LV.fn); const ref=$('chkref').value; render(); $('chkref').value=ref; setTimeout(fill,700); return; }
  if(C.inst==='compass'&&!CP.on){ if(!(await askMotion())){ toast('The compass was not allowed.'); return; } CP.on=true; CP.fn=e=>{ let h=null; if(typeof e.webkitCompassHeading==='number') h=e.webkitCompassHeading; else if(e.absolute&&e.alpha!=null) h=(360-e.alpha)%360; if(h!=null) CP.h=h; };
   window.addEventListener('ondeviceorientationabsolute' in window?'deviceorientationabsolute':'deviceorientation',CP.fn); const ref=$('chkref').value; render(); $('chkref').value=ref; setTimeout(fill,900); return; }
  fill(); };
 $('chkadd').onclick=()=>{ try{ const r=K.checkRow({instrument:C.inst,device:C.device,reference:$('chkref').value,observed:$('chkobs').value,note:$('chknote').value.trim(),at:Date.now()}); r.id=rid('c'); C.rows.push(r); save();
  const n=C.rows.filter(x=>x.instrument===C.inst&&x.device===C.device).length; toast('Reading '+n+(n<K.MIN?' of '+K.MIN:'')+' added.'); render(); }catch(e){ toast(e.message); } };
 document.querySelectorAll('[data-tgt]').forEach(i=>i.onchange=()=>{ const c=K.check(C.inst), t=Object.assign({},C.targets[C.inst]||c[4]); const v=parseFloat(i.value); if(!(v>0)) return; t[i.dataset.tgt]=v; C.targets[C.inst]=t; save(); render(); });
 document.querySelectorAll('[data-chkdel]').forEach(b=>b.onclick=()=>{ C.rows=C.rows.filter(r=>r.id!==b.dataset.chkdel); save(); render(); });
 const stamp=ymd(new Date());
 if($('chkcsv')) $('chkcsv').onclick=()=>dl('tool check '+stamp+'.csv',K.checkCsv(C.rows),'text/csv');
 if($('chkjson')) $('chkjson').onclick=()=>dl('tool check '+stamp+'.json',K.checkJson(C.rows),'application/json');
 $('chkin').onclick=()=>$('chkfile').click();
 $('chkfile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; try{ const rows=K.checkImport(await f.text()); const key=r=>[r.instrument,r.device,r.reference,r.observed,r.at].join('|'), have=new Set(C.rows.filter(r=>r.at).map(key)); let n=0;
  rows.forEach(r=>{ if(!(r.at&&have.has(key(r)))){ r.id=rid('c'); C.rows.push(r); if(r.at) have.add(key(r)); n++; } }); save(); toast(n+' reading'+(n===1?'':'s')+' brought in'+(rows.length>n?', '+(rows.length-n)+' already here':'')+'.'); render(); }catch(x){ toast(x.message); } };
 $('chkback').onclick=()=>{ lvStop(); cpStop(); kitSet().tool=DB.lasttool||'level'; save(); render(); };
}
function wireTools(){ const k=kitSet();
 document.querySelectorAll('[data-ktool]').forEach(b=>b.onclick=()=>{ if(b.dataset.ktool!==k.tool){ const cams=['frame','light']; if(cams.includes(k.tool)&&cams.includes(b.dataset.ktool)){ lvStop(); cpStop(); CAM.spots=[]; monStop(); } else kitStop(); } k.tool=b.dataset.ktool; save(); render(); });
 document.querySelectorAll('[data-kset]').forEach(el=>el.onchange=el.oninput=()=>{ const v=parseFloat(el.value); if(!isFinite(v)||v<=0) return; k[el.dataset.kset]=v; save(); if(el.tagName==='SELECT'){ render(); } else { const keep=el.dataset.kset; render(); const n=document.querySelector('[data-kset="'+keep+'"]'); if(n){ n.focus(); try{ n.setSelectionRange(n.value.length,n.value.length); }catch(e){} } } });
 document.querySelectorAll('[data-kunit]').forEach(b=>b.onclick=()=>{ const to=b.dataset.kunit; if(to!==k.unit){ k.dist=Math.round((to==='m'?k.dist*0.3048:k.dist/0.3048)*10)/10; k.unit=to; save(); render(); } });
 if($('tochk')) $('tochk').onclick=()=>{ DB.lasttool=k.tool; kitStop(); k.tool='check'; save(); render(); };
 if(k.tool==='check'){ wireCheck(); return; }
 if($('lvstart')) $('lvstart').onclick=async()=>{ if(!(await askMotion())){ toast('The tilt sensor was not allowed. Allow motion for this site, then START.'); return; }
  LV.on=true; LV.raw=0; LV.fn=e=>{ if(e.beta==null&&e.gamma==null) return; LV.raw++; LV.u=K.smooth(LV.u,K.up(e.beta,e.gamma),0.3); };
  window.addEventListener('deviceorientation',LV.fn); render(); setTimeout(()=>{ if(LV.on&&!LV.raw&&$('lvroll')) $('lvroll').textContent='No tilt sensor here. On a phone, it reads here.'; },2000); };
 if($('lvstop')) $('lvstop').onclick=()=>{ lvStop(); render(); };
 if(LV.on){ cancelAnimationFrame(LV.raf); LV.raf=requestAnimationFrame(lvDraw); }
 if($('lvsave')) $('lvsave').onclick=()=>{ const ks=kitShot(), r=LV.last; if(!ks||!r){ toast('Nothing read yet.'); return; } kitOf().read[ks.key]={roll:r.roll,pitch:r.pitch,flat:r.flat,at:Date.now()}; save(); toast('Saved for scene '+ks.x.n+', shot '+ks.x.idx+'.'); render(); };
 if($('lvzero')) $('lvzero').onclick=()=>{ const r=LV.raw0; if(!r){ toast('Nothing read yet.'); return; } kitSet().zero={roll:r.roll,pitch:r.pitch,flat:r.flat}; save(); toast('Zeroed. Readings start from here.'); render(); };
 if($('lvunzero')) $('lvunzero').onclick=()=>{ delete kitSet().zero; save(); render(); };
 if($('lvclear')) $('lvclear').onclick=()=>{ const ks=kitShot(); if(ks){ delete kitOf().read[ks.key]; save(); render(); } };
 if($('sunhere')) $('sunhere').onclick=()=>{ if(!navigator.geolocation){ toast('This browser can\'t find where you are. Type it in.'); return; }
  toast('Asking where you are…'); navigator.geolocation.getCurrentPosition(p=>{ KLOC={lat:p.coords.latitude,lng:p.coords.longitude,name:'Where you are'}; render(); },()=>toast('Location wasn\'t allowed. Type it in, or pin the place in OWNED.'),{timeout:15000,maximumAge:600000}); };
 if($('sunset')) $('sunset').onclick=()=>{ const g=F.coords($('sunll').value); if(!g){ toast('Couldn\'t read that. Try 38.84, -97.61'); return; } KLOC={lat:g.lat,lng:g.lng,name:'Your spot'}; render(); };
 if($('sunforget')) $('sunforget').onclick=()=>{ KLOC=null; cpStop(); render(); };
 if($('suntime')) $('suntime').onchange=()=>{ KTIME=$('suntime').value; render(); };
 if($('sunnow')) $('sunnow').onclick=()=>{ KTIME=''; render(); };
 if($('cpstart')) $('cpstart').onclick=async()=>{ if(!(await askMotion())){ toast('The compass was not allowed.'); return; }
  CP.on=true; CP.fn=e=>{ let h=null; if(typeof e.webkitCompassHeading==='number') h=e.webkitCompassHeading; else if(e.absolute&&e.alpha!=null) h=(360-e.alpha)%360; if(h==null) return; CP.h=h;
   const P=sunPlace(), w=$('cpword'); if(P&&w){ const q=K.sunPos(kitWhen(),P.lat,P.lng); w.textContent=q.up<=-0.833?'The sun is down at that time.':K.toward(h,q.az).words+' Shadows run the other way.'; } };
  window.addEventListener('ondeviceorientationabsolute' in window?'deviceorientationabsolute':'deviceorientation',CP.fn); render();
  setTimeout(()=>{ if(CP.on&&CP.h==null&&$('cpword')) $('cpword').textContent='No compass reading here. Use the table above.'; },2500); };
 if($('cpstop')) $('cpstop').onclick=()=>{ cpStop(); render(); };
 if($('camstart')) $('camstart').onclick=async()=>{ if(await camStart()) render(); };
 if($('camstop')) $('camstop').onclick=()=>{ camStop(); render(); };
 wireMon();
 camWire(); clearInterval(CAM.loop); if(CAM.stream) CAM.loop=setInterval(()=>{ if(CAM.stream.getTracks().every(t=>t.readyState==='ended')){ camStop(); render(); return; } if(k.tool==='light') lightRead(); },250);
 document.querySelectorAll('[data-aspect]').forEach(b=>b.onclick=()=>{ k.aspect=b.dataset.aspect; save(); document.querySelectorAll('[data-aspect]').forEach(x=>x.classList.toggle('on',x===b)); camOverlay(); });
 if($('fgrid')) $('fgrid').onclick=()=>{ k.grid=k.grid===false; save(); $('fgrid').classList.toggle('on',k.grid!==false); camOverlay(); };
 if($('fcross')) $('fcross').onclick=()=>{ k.cross=!k.cross; save(); $('fcross').classList.toggle('on',!!k.cross); camOverlay(); };
 const cv=$('camv'); if(cv&&k.tool==='light') cv.parentNode.onclick=e=>{ const v=$('camv'), b=v.getBoundingClientRect(), vw=v.videoWidth, vh=v.videoHeight; if(!vw) return;
  const sc=Math.min(b.width/vw,b.height/vh), ox=(b.width-vw*sc)/2, oy=(b.height-vh*sc)/2, x=(e.clientX-b.left-ox)/(vw*sc), y=(e.clientY-b.top-oy)/(vh*sc); if(x<0||x>1||y<0||y>1) return;
  if(CAM.spots.length>=2) CAM.spots=[]; CAM.spots.push({x,y}); camOverlay(); lightRead(); };
 if($('ltclear')) $('ltclear').onclick=()=>{ CAM.spots=[]; camOverlay(); $('ltword').textContent='Tap the bright side, then the dark side.'; $('ltwarn').textContent=''; };
 if($('micstart')) $('micstart').onclick=async()=>{ if(await micStart()) render(); };
 if($('micstop')) $('micstop').onclick=()=>{ micStop(); render(); };
 if(MIC.an){ cancelAnimationFrame(MIC.raf); MIC.raf=requestAnimationFrame(micLoop); }
 document.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{ MIC.run={at:Date.now(),end:Date.now()+(+b.dataset.rt)*1000,vals:[],hums:[]}; render(); });
 if($('rtcancel')) $('rtcancel').onclick=()=>rtDone(true);
 document.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>{ kitOf().delays.push({id:rid('w'),why:b.dataset.dl,note:'',at:Date.now()}); save(); render(); });
 if($('dlnote')) $('dlnote').oninput=()=>{ const r=kitOf().delays.find(d=>!d.end); if(r){ r.note=$('dlnote').value; save(); } };
 if($('dlend')) $('dlend').onclick=()=>{ const r=kitOf().delays.find(d=>!d.end); if(r){ r.end=Date.now(); save(); toast(K.whyWord(r.why)+': '+K.mins(r)+' min. Logged.'); render(); } };
 if($('dlundo')) $('dlundo').onclick=()=>{ const S=kitOf(), done=S.delays.filter(d=>d.end); if(done.length){ S.delays=S.delays.filter(d=>d!==done[done.length-1]); save(); render(); } };
}
setInterval(()=>{ const m=$('dlmins'); if(m&&TAB==='tools'){ const r=kitOf().delays.find(d=>!d.end); if(r) m.textContent=K.mins(r)+' MIN'; } },15000);
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ kitStop(); if(TAB==='tools') render(); } });
/* ---------- PREP · SHOT LIST: the spreadsheet you plan from. Drop it in (CSV or Excel) or paste it. Each scene's shots
   become how you shoot it, and ON SET runs them. No script? The scenes are made from the list. ---------- */
let SLMSG='';
function vShots(){
 const c=cur(), L=c&&c.shotlist;
 let h=SLMSG?'<div class="msg'+(/<b>/.test(SLMSG)?' bad':'')+'">'+SLMSG+'</div>':'';
 const drop='<div class="drop" id="sldrop"><b>DROP YOUR SHOT LIST</b><span class="dim">CSV or Excel. Or tap to pick one.</span></div><input type="file" id="slfile" accept=".csv,.xlsx,.txt,.tsv,text/csv" class="hide">'
  +'<textarea class="field" id="slpaste" placeholder="Or paste it here, header row first: SCENE, SHOT, SETUP, SHOT TYPE, CAMERA, CAMERA MOVE, CAST, ACTION, PROPS"></textarea><button class="btn block" id="slread" style="margin-top:8px">READ IT</button>';
 if(!L) return h+'<div class="card"><p class="kicker">Your shot list</p><p class="dim" style="margin:0 0 10px">The spreadsheet you already plan from. Columns are found by their names: scene, shot, setup or location, shot type, camera or size, camera move, cast, action, props, lens, notes. OMIT rows stay, struck, and never come up on the day.</p><p class="faint" style="font-size:13px;margin:0">'+(c?'Its scenes go on the script\'s scenes by number.':'No script? The scenes are made from the list.')+'</p></div>'+drop;
 const by={}; L.rows.forEach(r=>(by[r.scene]=by[r.scene]||[]).push(r));
 const ids=F.castIds(L.rows.filter(r=>!r.omit));
 h+='<div class="card"><p class="kicker">Your shot list</p><b>'+esc(L.file||'Shot list')+'</b><div class="dim" style="font-size:14px;margin-top:4px">'+(L.rows.length-L.omitted)+' shots in '+L.scenes.length+' scenes'+(L.omitted?' · '+L.omitted+' omitted':'')+'</div>'
  +'<div class="row" style="margin-top:12px"><button class="btn sm" data-go="set">RUN IT ON SET</button><button class="btn sm" id="slcsv">SAVE AS CSV</button><button class="btn sm ghost" id="slagain">REPLACE IT</button><button class="btn sm ghost" id="sldel">REMOVE IT</button></div></div>';
 if(ids.length) h+='<div class="card"><p class="kicker">Who the cast numbers are</p><div class="row">'+ids.map(id=>'<label class="lab" style="margin:0;flex:1 1 130px">'+esc(id)+'<input class="field" data-castkey="'+esc(id)+'" value="'+esc((L.cast||{})[id]||'')+'" placeholder="Name"></label>').join('')+'</div><p class="faint" style="font-size:13px;margin:8px 0 0">Optional. ON SET says the name instead of the number.</p></div>';
 const un=L.scenes.filter(x=>!(L.map&&L.map[x.label]));
 if(un.length&&!L.made) h+='<div class="card"><p class="kicker">Not on a script scene yet · '+un.length+'</p>'+un.map(x=>'<label class="lab">Scene '+esc(x.label)+(x.setups.length?' · '+esc(x.setups.join(', ')):'')+'<select class="field" data-slmap="'+esc(x.label)+'"><option value="">Pick the script scene</option>'+SCENES.map(sc=>'<option value="'+sc.n+'">'+sc.n+'. '+esc(sc.heading)+'</option>').join('')+'</select></label>').join('')+'</div>';
 h+=L.scenes.map(x=>'<div class="card slsc"><p class="kicker" style="margin:0 0 6px">'+(x.section?esc(x.section)+' · ':'')+'Scene '+esc(x.label)+(x.setups.length?' · '+esc(x.setups.join(', ')):'')+(L.map&&L.map[x.label]?' <span class="faint">→ '+esc((SCENES.find(sc=>sc.n===L.map[x.label])||{}).heading||'')+'</span>':'')+'</p>'
  +(by[x.label]||[]).map(r=>'<div class="slr'+(r.omit?' omit':'')+'"><b>'+esc(r.shot)+'</b><span>'+esc(r.action||'')+(r.omit?' <i>OMIT</i>':'')+'<small>'+esc([r.type,r.size,r.move,r.lens].filter(Boolean).join(' · '))+(r.cast?' · '+esc(F.castWords(r.cast,L.cast)):'')+(r.props?' · '+esc(r.props):'')+'</small></span></div>').join('')+'</div>').join('');
 if(SLAGAIN) h+=drop;
 return h;
}
let SLAGAIN=false;
function applyList(){ const c=cur(), L=c.shotlist; if(!L) return; L.map=L.map||{};
 Object.keys(c.scenes||{}).forEach(n=>{ const s=c.scenes[n]; if(s.list){ delete s.list; if(s.way==='list') s.way=''; } });
 L.scenes.forEach(x=>{ const n=L.map[x.label]; if(!n) return; const s=st(n); s.list={rows:L.rows.filter(r=>r.scene===x.label),cast:L.cast||{}}; s.way='list'; });
 save(); }
async function readList(f,text){
 SLMSG=''; let L;
 try{ if(f&&/\.xlsx$/i.test(f.name)){ const sh=await window.XLSX.read(await f.arrayBuffer()); let best=null; for(const s of sh){ const r=F.shotList(s.rows,f.name); if(r.rows.length&&(!best||r.rows.length>best.rows.length)) best=r; } L=best||F.shotList([],f.name); }
  else L=F.shotList(window.XLSX.csv(f?await f.text():text),f?f.name:'Pasted shot list'); }catch(e){ SLMSG='<b>That file would not open.</b> Save it as CSV and try again.'; render(); return; }
 if(!L.rows.length){ SLMSG='<b>Nothing read.</b> '+esc(L.notes[0]||'No shots under the header.'); render(); return; }
 let c=cur();
 const title=String(L.file).replace(/\.(csv|xlsx|txt|tsv)$/i,'').replace(/\s*-\s*Sheet\d+$/i,'').replace(/[_]+/g,' ').trim();
 if(!c){ open('sl'+Date.now().toString(36),F.listScript(L,title),title,''); c=cur(); L.made=true; L.map={}; SCENES.forEach((sc,i)=>{ if(L.scenes[i]) L.map[L.scenes[i].label]=sc.n; }); }
 else { const keep=c.shotlist&&c.shotlist.cast; L.cast=keep||{}; L.map={}; L.scenes.forEach(x=>{ const k=SCENES.find(sc=>String(sc.n)===x.label); if(k) L.map[x.label]=k.n; }); if(c.shotlist&&c.shotlist.made){ L.made=true; L.map={}; SCENES.forEach((sc,i)=>{ if(L.scenes[i]) L.map[L.scenes[i].label]=sc.n; }); } }
 L.cast=L.cast||{}; L.at=Date.now(); c.shotlist=L; SLAGAIN=false; applyList();
 const on=Object.keys(L.map).length;
 SLMSG=(L.rows.length-L.omitted)+' shots read'+(L.omitted?', '+L.omitted+' omitted':'')+'. '+(L.made?'Made '+SCENES.length+' scenes from it.':on+' of '+L.scenes.length+' scenes are on the script by number'+(on<L.scenes.length?'; pick the rest below.':'.'));
 TAB='shots'; render(); }
function wireShots(){
 const fi=$('slfile'), dr=$('sldrop'); if(dr&&fi){ dr.onclick=()=>fi.click(); fi.onchange=()=>{ const f=fi.files[0]; fi.value=''; if(f) readList(f); };
  dr.ondragover=e=>{ e.preventDefault(); dr.classList.add('over'); }; dr.ondragleave=()=>dr.classList.remove('over'); dr.ondrop=e=>{ e.preventDefault(); dr.classList.remove('over'); const f=e.dataTransfer.files[0]; if(f) readList(f); }; }
 if($('slread')) $('slread').onclick=()=>{ const t=$('slpaste').value; if(t.trim()) readList(null,t); };
 const c=cur(), L=c&&c.shotlist; if(!L) return;
 document.querySelectorAll('[data-castkey]').forEach(el=>el.onchange=()=>{ L.cast=L.cast||{}; const v=el.value.trim(); if(v) L.cast[el.dataset.castkey]=v; else delete L.cast[el.dataset.castkey]; applyList(); });
 document.querySelectorAll('[data-slmap]').forEach(el=>el.onchange=()=>{ if(el.value) L.map[el.dataset.slmap]=+el.value; applyList(); SLMSG=''; render(); });
 if($('slcsv')) $('slcsv').onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+F.listCsv(L)],{type:'text/csv'})); a.download=String(L.file||'Shot list').replace(/\.(csv|xlsx|txt|tsv)$/i,'')+' - Story Studio.csv'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved.'); };
 if($('slagain')) $('slagain').onclick=()=>{ SLAGAIN=true; render(); };
 if($('sldel')) $('sldel').onclick=()=>{ if(!confirm('Remove the shot list? Scenes using it go back to no way picked. Your takes stay.')) return; delete c.shotlist; Object.keys(c.scenes||{}).forEach(n=>{ const s=c.scenes[n]; if(s.list){ delete s.list; if(s.way==='list') s.way=''; } }); save(); SLMSG=''; render(); };
}
function vDay(){
 const c=cur();
 const B=dayBlocks();
 let h='<p class="kicker">Shoot day</p><p class="dim" style="font-size:14px;margin:-2px 0 10px">Same place together, then same time of day, then same wardrobe. Inside each: every angle of one part before you change clothes. Inserts and room tone last.</p>'
  +'<div class="row" style="margin-bottom:14px"><label class="faint" style="font-size:13px">Shooting on</label><input type="date" class="field" id="daydate" value="'+esc(c.dayDate||'')+'" style="flex:0 1 180px"></div>';
 B.forEach((b,i)=>{
  h+='<div class="blk'+(b.set?'':' unset')+'"><h3>'+(i+1)+'. '+esc(b.where)+(b.tod?' · '+esc(b.tod):'')+'</h3>'+(b.set?'':'<div class="faint" style="font-size:13px">Where you\'ll shoot this isn\'t picked yet.</div>')
   +(()=>{ const it0=b.items[0], s0=it0&&(c.scenes||{})[it0.scene.n], o0=s0&&s0.where&&owned().find(x=>x.id===s0.where), sn=sunOf(o0); return sn?'<div class="faint" style="font-size:13px;margin:2px 0 6px">Sun'+(c.dayDate?'':' (today; set the date above)')+': '+esc(F.sunFor(b.tod,sn))+'</div>':''; })()
   +b.items.map(x=>{ const dn=doneOf(x.scene); return '<div class="it"><b>Scene '+x.scene.n+'</b> <small>'+esc(x.scene.heading)+'</small><br><small>'+(x.way?esc(F.wayName(x.way))+' · ':'Way not picked · ')+'on camera: '+esc(x.who.join(', ')||'nobody')+(x.wardrobe?' · '+esc(x.wardrobe):'')+(dn?' · '+dn.d+' of '+dn.t+' shot':'')+'</small></div>'; }).join('')+'</div>';
 });
 if(SCENES.length) h+=peopleBox()+callBox();
 return h;
}
function creditsBox(){
 const k=creditsOf(), r=F.credits(creditData());
 return '<details class="brief" style="margin-top:12px"'+(CREDOPEN?' open':'')+' id="credbox"><summary>End credits</summary><p class="faint" style="font-size:13px;margin:6px 0">Cast in order of appearance and crew from Who\'s who (Shoot day tab), the places you shot from what you own.</p>'
  +'<label class="faint" style="font-size:12px;display:block;margin-top:6px">Special thanks, one per line</label><textarea class="field" rows="3" id="cthanks">'+esc(k.thanks||'')+'</textarea>'
  +'<div class="row" style="margin-top:6px"><label class="faint" style="font-size:13px">©</label><input class="field" id="cyear" value="'+esc(k.year||'')+'" placeholder="'+new Date().getFullYear()+'" style="flex:0 1 80px"><input class="field" id="cowner" value="'+esc(k.owner||'')+'" placeholder="Who the film belongs to"></div>'
  +'<pre class="credpre">'+esc(r.text)+'</pre>'+(r.missing.length?'<div class="msg">Not filled in yet: '+esc(r.missing.join(' '))+'</div>':'')
  +'<div class="row" style="margin-top:6px"><button class="btn" id="ccred">END CREDITS (.TXT)</button></div></details>';
}
let CREDOPEN=false;

/* ---------- cut to length ---------- */
const FILES={};   // the clip files picked this session, for the preview; only names and lengths are kept
function cutOf(){ const c=cur(); c.cut=c.cut||{target:300,fps:'30',takes:{}}; return c.cut; }
function pieces(){ const k=cutOf(); const out=[]; SCENES.forEach(sc=>(k.takes[sc.n]||[]).forEach(t=>{ if(t.use&&t.out>t.in){ const a=adrKept(t); out.push({scene:sc.n,heading:sc.heading,name:t.name,in:t.in,out:t.out,id:t.id,adr:a?{id:a.id,at:a.at+(a.nudge||0)/1000,under:t.adr.under}:null}); } })); return out; }
function shotsFor(sc){ const s=cur().scenes&&cur().scenes[sc.n]; return s&&s.way?F.shots(sc,s.way,cur().me,s.ins,s.list):[]; }
function coverNow(){ return F.coverage(F.planRows(SCENES,n=>cur().scenes&&cur().scenes[n],cur().me),cutOf().takes); }
function packFiles(){ const k=cutOf(), t=filmName(), slug=F.slug(t), cv=coverNow(), R=F.planRows(SCENES,n=>cur().scenes&&cur().scenes[n],cur().me);
 let by=''; try{ by=(window.You&&You.get().name)||''; }catch(e){}
 const brief=F.brief(t,SCENES.map(sc=>({n:sc.n,heading:sc.heading,brief:(k.brief||{})[sc.n]||{},takes:k.takes[sc.n]||[],shots:doneOf(sc)})),k.fps);
 return [{name:slug+' READ ME.txt',data:F.packReadme({wrap:setOf().log.length>0,title:t,slug,by,date:new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),link:k.link||'',cover:F.coverWords(cv),note:k.packNote||''})},
  {name:slug+' editor brief.txt',data:brief},{name:slug+' plan.csv',data:F.planCsv(R)},{name:slug+' plan vs got.csv',data:F.gotCsv(cv,k.fps,t)},
  {name:slug+' cut.edl',data:F.edl(t,pieces(),k.fps)},{name:slug+' cut.csv',data:F.cutCsv(pieces())}].concat(setOf().log.length||kitOf().delays.some(d=>d.end)||kitOf().tones.length?[{name:slug+' wrap report.txt',data:F.wrapText({title:t,date:cur().dayDate||ymd(new Date()),shots:dayList(),log:setOf().log,delays:kitOf().delays,tones:kitOf().tones,reads:kitOf().read})}]:[]); }
/* LOG THE DAY: the day's clips one at a time, in the order you shot them */
let DAY=null;
async function dayOpen(files){
 const L=F.dayOrder(files.filter(f=>/^video\//.test(f.type)||/\.(mov|mp4|m4v|webm)$/i.test(f.name))); if(!L.length){ toast('No video clips in that.'); return; }
 DAY={L,i:0,n:(SCENES[0]||{}).n||1,done:0,skip:0,match:F.matchSet(L.map(f=>({name:f.name,time:f.lastModified})),cur()?setOf().log:[])}; dayDraw();
}
function dayClose(){ const o=$('dayov'); if(o){ const v=o.querySelector('video'); if(v&&v.src) URL.revokeObjectURL(v.src); o.remove(); } document.body.classList.remove('mcopen'); const n=DAY&&DAY.done; DAY=null; render(); if(n) toast(n+' clip'+(n===1?'':'s')+' logged.'); }
async function dayDraw(){
 const D=DAY; if(!D) return; let o=$('dayov'); if(!o){ o=document.createElement('div'); o.id='dayov'; o.className='mc'; document.body.appendChild(o); document.body.classList.add('mcopen'); }
 if(D.i>=D.L.length){ o.innerHTML='<div class="mchead"><b>Log the day</b><button class="btn sm" id="dayx">DONE</button></div><div style="padding:16px;overflow:auto"><p style="font-size:17px">'+D.done+' logged'+(D.skip?', '+D.skip+' skipped':'')+'.</p><p class="faint">'+esc(F.coverWords(coverNow()))+'</p></div>'; $('dayx').onclick=dayClose; return; }
 const f=D.L[D.i], se=D.match&&D.match.pairs[D.i];
 if(se&&D.auto!==D.i&&!SCENES.some(x=>(cutOf().takes[x.n]||[]).some(t=>t.name===f.name&&t.size===f.size))){ D.n=se.n; D.shot=se.shot; D.mark=se.mark; D.keepMark=true; D.note=se.note; D.auto=D.i; }
 const k=cutOf(), ex=(k.takes[D.n]||[]).find(x=>x.name===f.name&&x.size===f.size), sc=SCENES.find(x=>x.n===D.n)||SCENES[0], shots=sc?shotsFor(sc):[];
 D.mark=D.mark!==undefined&&D.keepMark?D.mark:(ex&&ex.mark)||''; D.keepMark=false;
 const when=f.lastModified?new Date(f.lastModified).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'';
 o.innerHTML='<div class="mchead"><b>Clip '+(D.i+1)+' of '+D.L.length+'</b><button class="btn sm" id="dayx">CLOSE</button></div>'
  +'<div style="padding:0 14px 16px;overflow:auto;flex:1"><p class="faint" style="font-size:13px;margin:0 0 6px;word-break:break-all">'+esc(f.name)+(when?' · shot '+esc(when):'')+'<span id="daydur"></span></p>'
  +(se?'<p class="fromset">From the set: scene '+se.n+', take '+se.take+(se.mark?', '+F.markWord(se.mark):'')+(se.note?', "'+esc(se.note)+'"':'')+'<small>'+(D.match.mode==='time'?'Matched by when it was shot ('+F.clockWord(se.at)+'). ':'Matched by order. ')+'Change anything below.</small></p>':'')
  +'<video id="dayv" playsinline controls preload="metadata" style="width:100%;max-height:42vh;background:#111;border-radius:8px"></video>'
  +'<label class="faint" style="font-size:12px;display:block;margin-top:8px">Scene</label><select class="field" id="daysc">'+SCENES.map(x=>'<option value="'+x.n+'"'+(x.n===D.n?' selected':'')+'>'+x.n+'. '+esc(x.heading)+'</option>').join('')+'</select>'
  +'<label class="faint" style="font-size:12px;display:block;margin-top:6px">Shot</label><select class="field" id="daysh"><option value="">Not on the shot list</option>'+shots.map((x,i)=>'<option value="'+esc(x.id)+'"'+((ex&&ex.shot===x.id)||(!ex&&D.shot===x.id)?' selected':'')+'>'+(i+1)+'. '+esc(x.what)+'</option>').join('')+'</select>'
  +(shots.length?'':'<p class="faint" style="font-size:12px;margin:4px 0 0">No shot list for this scene yet. Pick a way for it in SCENES.</p>')
  +'<div class="row" style="gap:6px;margin-top:8px">'+[['gold','CIRCLE'],['backup','HOLD'],['never','NO GOOD'],['','NO MARK']].map(([v,l])=>'<button class="btn sm'+(D.mark===v?' pri':'')+'" data-daymark="'+v+'">'+l+'</button>').join('')+'</div>'
  +'<input class="field" id="daynote" placeholder="What happens in it (the one where he laughs)" value="'+esc(ex?ex.note||'':(se&&D.auto===D.i?D.note||'':''))+'" style="margin-top:8px">'
  +'<div class="row" style="margin-top:10px"><button class="btn" id="dayback"'+(D.i?'':' disabled')+'>BACK</button><button class="btn" id="dayskip">SKIP</button><button class="btn pri" id="daynext" style="flex:1">'+(D.i===D.L.length-1?'LOG IT, DONE':'LOG IT, NEXT')+'</button></div></div>';
 const v=$('dayv'); v.src=URL.createObjectURL(f);
 $('dayx').onclick=dayClose;
 $('daysc').onchange=()=>{ D.n=+$('daysc').value; D.shot=''; D.keepMark=true; D.mark=o.querySelector('[data-daymark].pri')?o.querySelector('[data-daymark].pri').dataset.daymark:''; dayDraw(); };
 o.querySelectorAll('[data-daymark]').forEach(b=>b.onclick=()=>{ D.mark=b.dataset.daymark; o.querySelectorAll('[data-daymark]').forEach(x=>x.classList.toggle('pri',x===b)); });
 $('dayback').onclick=()=>{ D.i=Math.max(0,D.i-1); dayDraw(); };
 $('dayskip').onclick=()=>{ D.skip++; D.i++; dayDraw(); };
 $('daynext').onclick=async()=>{ const k=cutOf(), n=+$('daysc').value, shot=$('daysh').value, note=$('daynote').value.trim(); k.takes[n]=k.takes[n]||[];
  let t=k.takes[n].find(x=>x.name===f.name&&x.size===f.size);
  if(!t){ const d=await clipLength(f); t={id:rid('t'),name:f.name,size:f.size,dur:Math.round(d*100)/100,in:0,out:Math.round(d*100)/100,use:false,at:Date.now()}; k.takes[n].push(t); }
  FILES[t.id]=f; if(shot) t.shot=shot; else delete t.shot; if(note) t.note=note; if(D.mark) t.mark=D.mark; else delete t.mark;
  if(t.mark==='never') t.use=false; else if(t.mark==='gold'&&!k.takes[n].some(x=>x.use)) t.use=true;
  if(se){ se.clip=f.name; t.setTake=se.take; }
  save(); D.done++; D.n=n; D.shot=shot; D.i++; D.mark=''; dayDraw(); };
}
function vCut(){
 const k=cutOf(), P=pieces(), len=F.cutLength(P), diff=k.target-len;
 let h='<p class="kicker">Your cut</p>';
 h+='<div class="card"><div class="row"><label class="faint" style="font-size:13px">Aim for</label><input class="field" id="ctarget" value="'+esc(F.mmss(k.target))+'" style="flex:0 1 90px"><label class="faint" style="font-size:13px">Frame rate</label><select class="field" id="cfps" style="flex:0 1 110px">'+Object.keys(F.FPS).map(x=>'<option'+(x===k.fps?' selected':'')+'>'+x+'</option>').join('')+'</select></div>'
  +'<div class="runtime"><b>'+F.mmss(len)+'</b><span>'+(P.length?(Math.abs(diff)<0.05?'right on '+F.mmss(k.target):diff>0?F.mmss(diff)+' to go to '+F.mmss(k.target):F.mmss(-diff)+' over '+F.mmss(k.target)):'nothing in the cut yet')+' · '+P.length+' piece'+(P.length===1?'':'s')+'</span></div></div>';
 h+='<div class="card cutsum">'+SCENES.map(sc=>{ const T=(k.takes[sc.n]||[]).filter(t=>t.use&&t.mark!=='never'); return '<div class="csrow"><span><b>'+sc.n+'</b> '+esc(sc.heading)+'</span><span class="'+(T.length?'got':'')+'">'+(T.length?esc(T.map(t=>t.name).join(', '))+' · '+F.mmss(T.reduce((n,t)=>n+Math.max(0,t.out-t.in),0)):'no take yet')+'</span></div>'; }).join('')+'</div>';
 h+='<div class="card">'+watchBox(P)+'</div>';
 const fold=(id,label,hint,body)=>'<details class="ffold" data-ff="'+id+'"'+(FFOPEN[id]?' open':'')+'><summary>'+label+'<i>'+hint+'</i></summary>'+body+'</details>';
 let bring='<div class="card"><p class="kicker">Find a take</p><input class="field" id="cfind" placeholder="bus shelter · rennie · last week · the laugh · never use" value="'+esc(FINDQ)+'" autocomplete="off"><div id="cfindres">'+findHtml()+'</div></div>';
 bring+='<div class="card" id="daycard"><p class="kicker">Log the day</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">Drop the day\'s clips off the phone. They line up in the order you shot them. Tap through, one at a time: which scene, which shot, gold or not, a note. Each becomes a take on its scene.</p><label class="btn pri sm"><input type="file" accept="video/*,.mov,.mp4,.m4v" multiple class="hide" id="dayin">PICK THE DAY\'S CLIPS</label></div>';
 bring+=setBox()+logBox()+footBox();
 h+=fold('bring','Bring in your takes','find a take · log the day · footage log · footage check',bring);
 h+='<p class="kicker" style="margin-top:16px">Scene by scene: the takes, where each starts and ends</p>';
 SCENES.forEach(sc=>{
  const T=k.takes[sc.n]||[];
  h+='<div class="card"><div class="hd" style="font:700 14px/1.35 var(--mono)">'+sc.n+'. '+esc(sc.heading)+'</div>';
  h+=T.map(t=>{ const f=FILES[t.id];
   return '<div class="take'+(t.use?' on':'')+(t.mark==='never'?' never':'')+'" data-trow="'+sc.n+'|'+t.id+'"><div class="row" style="justify-content:space-between"><label class="row" style="gap:8px"><input type="checkbox" data-tuse="'+sc.n+'|'+t.id+'"'+(t.use?' checked':'')+(t.mark==='never'?' disabled':'')+'><b style="font-size:14px;word-break:break-all">'+esc(t.name)+'</b></label><span class="faint" style="font-size:13px">'+(t.dur?F.mmss(t.dur):'length?')+'</span><select class="field mark" data-tmark="'+sc.n+'|'+t.id+'" aria-label="Mark this take">'+[['','no mark'],['gold','gold'],['backup','backup'],['never','never use']].map(o=>'<option value="'+o[0]+'"'+((t.mark||'')===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select><button class="x" data-tdel="'+sc.n+'|'+t.id+'" aria-label="Remove">×</button></div>'
    +(f?'<video class="tprev" data-tvid="'+t.id+'" playsinline controls preload="metadata"></video>':'')
    +'<div class="row" style="margin-top:6px"><label class="faint" style="font-size:12px">In</label><input class="field" data-tin="'+sc.n+'|'+t.id+'" value="'+F.mmss(t.in)+'" style="flex:1 1 70px">'+(f?'<button class="btn sm" data-tsetin="'+sc.n+'|'+t.id+'">HERE</button>':'')
    +'<label class="faint" style="font-size:12px">Out</label><input class="field" data-tout="'+sc.n+'|'+t.id+'" value="'+F.mmss(t.out)+'" style="flex:1 1 70px">'+(f?'<button class="btn sm" data-tsetout="'+sc.n+'|'+t.id+'">HERE</button>':'')+'</div>'
    +'<input class="field tnote" data-tnote="'+sc.n+'|'+t.id+'" value="'+esc(t.note||'')+'" placeholder="A note you\'ll remember it by (the one where he laughs)">'
    +(()=>{ const L=shotsFor(sc); return L.length?'<select class="field" data-tshot="'+sc.n+'|'+t.id+'" style="margin-top:4px" aria-label="Which shot">'+'<option value="">Shot: not on the shot list</option>'+L.map((x,i)=>'<option value="'+esc(x.id)+'"'+(t.shot===x.id?' selected':'')+'>Shot '+(i+1)+': '+esc(x.what)+'</option>').join('')+'</select>':''; })()
    +F.watchNotes(t).map(w=>'<div class="wnote"><span><b>'+F.mmss(w.at)+'</b> in the take'+(w.cut!=null?' · '+F.mmss(w.cut)+' in the cut':'')+': '+esc(w.text)+'</span><button class="x" data-wdel="'+sc.n+'|'+t.id+'|'+w.id+'" aria-label="Delete this note">×</button></div>').join('')
    +'<div class="row" style="justify-content:space-between;margin-top:4px"><span class="faint" style="font-size:12px">'+F.mmss(Math.max(0,t.out-t.in))+' used'+(f?'':' · pick the file again to preview it')+(adrKept(t)?' · <b class="adrtag">ADR</b> your line replaces it, original '+UNDERS.find(u=>u[1]===t.adr.under)[0].toLowerCase():'')+'</span>'+(f?'<button class="btn sm" data-adr="'+sc.n+'|'+t.id+'">ADR</button>':'')+'</div></div>'; }).join('');
  h+='<div class="row" style="margin-top:8px"><button class="btn sm pri" style="flex:1" data-shoot="'+sc.n+'">SHOOT A TAKE</button><label class="btn sm" style="flex:1"><input type="file" accept="video/*,.mov,.mp4,.m4v" multiple class="hide" data-tadd="'+sc.n+'">+ ADD TAKES</label></div>'+briefBox(sc)+'</div>';
 });
 let hand=''; { const cv=coverNow();
 hand+='<div class="card" id="packcard"><p class="kicker">Editor pack</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">One file to send your editor: the brief, the plan, the plan against what you got, your picks as an edit list, and the link to the footage. The footage itself stays a link.</p>'
  +'<p style="font-size:14px;margin:0 0 8px" id="packcover">'+esc(F.coverWords(cv))+'</p>'
  +'<input class="field" id="packlink" placeholder="Link to the footage (Drive, Dropbox, WeTransfer)" value="'+esc(k.link||'')+'">'
  +'<textarea class="field" id="packnote" placeholder="A note to your editor (optional)" style="margin-top:6px;min-height:60px">'+esc(k.packNote||'')+'</textarea>'
  +'<div class="row" style="margin-top:8px"><button class="btn pri" id="packzip">SAVE THE EDITOR PACK (.ZIP)</button><button class="btn" id="packplan">PLAN (.CSV)</button><button class="btn" id="packgot">PLAN VS GOT (.CSV)</button></div></div>'; }
 hand+='<div class="card"><p class="kicker">The edit list</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">An EDL opens in DaVinci Resolve, Premiere and Avid. Point it at your footage and it relinks by file name. In and out count from the start of each file.</p>'
  +'<div class="row"><button class="btn pri" id="cedl"'+(P.length?'':' disabled')+'>EDIT LIST (.EDL)</button><button class="btn" id="ccsv"'+(P.length?'':' disabled')+'>LIST (.CSV)</button><button class="btn" id="cbrief">EDITOR BRIEF (.TXT)</button></div>'
  +'<p class="faint" style="font-size:13px;margin:8px 0 0">The brief says, scene by scene, how much freedom the editor has, what must stay, which take to use, backups, never-use takes, what is missing and when to ask you first.</p></div>';
 h+=fold('hand','Hand it to your editor','editor pack · edit list (.EDL) · the brief',hand);
 h+=creditsBox();
 return h;
}
let FINDQ=''; const FFOPEN={};
function findList(){ const k=cutOf(), L=[]; SCENES.forEach(sc=>(k.takes[sc.n]||[]).forEach(t=>L.push({id:t.id,scene:sc.n,heading:sc.heading,people:(sc.speakers||[]).map(x=>x.name),name:t.name,note:[t.note||''].concat(F.watchNotes(t).map(w=>w.text)).join(' ').trim(),mark:t.mark,use:t.use,adr:!!adrKept(t),at:t.at||null,dur:t.dur}))); return L; }
function findHtml(){ if(!FINDQ.trim()) return ''; const L=findList(); if(!L.length) return '<p class="faint" style="font-size:13px;margin:8px 0 0">No takes logged yet. Add takes to a scene below first.</p>';
 const r=F.findTakes(FINDQ,L);
 if(!r.hits.length) return '<p class="faint" style="font-size:13px;margin:8px 0 0">Nothing matches "'+esc(FINDQ.trim())+'".'+(r.parsed.when?' Dates only reach takes logged since this version.':'')+'</p>';
 return (r.partial?'<p class="faint" style="font-size:13px;margin:8px 0 0">Nothing matches every word. Closest:</p>':'')+r.hits.slice(0,12).map(h=>'<button class="fhit" data-fgo="'+h.take.scene+'|'+h.take.id+'"><b>Scene '+h.take.scene+' · '+esc(h.take.name)+'</b><span>'+esc(h.why.join(' · ')||'')+'</span></button>').join('')+(r.hits.length>12?'<p class="faint" style="font-size:12px">'+(r.hits.length-12)+' more. Add a word.</p>':''); }
function briefOf(n){ const k=cutOf(); k.brief=k.brief||{}; k.brief[n]=k.brief[n]||{}; return k.brief[n]; }
function briefBox(sc){ const b=(cutOf().brief||{})[sc.n]||{}, set=['free','keep','missing','ask','note'].filter(x=>b[x]).length;
 const ta=(key,label,ph)=>'<label class="faint" style="font-size:12px;display:block;margin-top:8px">'+label+'</label><textarea class="field" rows="2" data-brief="'+sc.n+'|'+key+'" placeholder="'+ph+'">'+esc(b[key]||'')+'</textarea>';
 return '<details class="brief"'+(BOPEN[sc.n]?' open':'')+' data-bopen="'+sc.n+'"><summary>Notes for the editor'+(set?' · '+set+' of 5 filled':'')+'</summary>'
  +'<label class="faint" style="font-size:12px;display:block;margin-top:8px">How much freedom</label><select class="field" data-brief="'+sc.n+'|free"><option value="">Not set</option>'+F.FREEDOM.map(f=>'<option value="'+f.id+'"'+(b.free===f.id?' selected':'')+'>'+f.name+'</option>').join('')+'</select>'
  +(b.free?'<div class="faint" style="font-size:12px;margin-top:4px">'+esc(F.FREEDOM.find(f=>f.id===b.free).say)+'</div>':'')
  +ta('keep','Must keep (one per line)','He sees the bus leave')+ta('missing','What is missing','No wide of the lot')+ta('ask','Ask me first if','You want to drop a line')+ta('note','Anything else','')+'</details>'; }
const BOPEN={};
let FOOT=null;   // this session's footage check: {files:[File], res}
function takeList(){ const k=cutOf(), L=[]; SCENES.forEach(sc=>(k.takes[sc.n]||[]).forEach(t=>L.push(Object.assign({scene:sc.n},t)))); return L; }
function runFoot(files){ FOOT={files:files,res:F.footageCheck(takeList(),files.map(f=>({name:f.name,size:f.size,path:f.webkitRelativePath||f.name,f:f})))};
 FOOT.res.have.forEach(x=>{ FILES[x.take.id]=x.file.f; }); }
function footBox(){
 let h='<div class="card"><p class="kicker">Footage check</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">Pick your footage folder, or the clips. It matches file names to the takes you logged. Not here never means never shot. Nothing leaves this device.</p>'
  +'<div class="row"><label class="btn sm"><input type="file" webkitdirectory multiple class="hide" id="ffold">PICK FOLDER</label><label class="btn sm"><input type="file" multiple class="hide" id="ffiles">PICK FILES</label></div>';
 if(FOOT){ const r=FOOT.res, nm=f=>esc(f.path||f.name), sz=b=>b>=1e9?(b/1e9).toFixed(1)+' GB':b>=1e6?Math.round(b/1e6)+' MB':Math.round(b/1e3)+' KB';
  const sec=(t,n,body)=>n?'<div class="fsec"><b>'+t+' · '+n+'</b>'+body+'</div>':'';
  h+='<div class="fsum">'+FOOT.files.length+' files looked at · '+r.have.length+' takes found · '+r.missing.length+' not here · '+r.extra.length+' not logged · '+r.empty.length+' empty'+(r.twice.length?' · '+r.twice.length+' with two files':'')+(r.skipped?' · '+r.skipped+' not video or sound, skipped':'')+'</div>';
  h+=sec('Empty files',r.empty.length,r.empty.map(x=>'<div class="fl bad">'+nm(x.file)+' is 0 bytes'+(x.take?' (scene '+x.take.scene+' take)':'')+'. Copy it again from the card.</div>').join(''));
  h+=sec('Two files for one take',r.twice.length,r.twice.map(x=>'<div class="fl">Scene '+x.take.scene+' '+esc(x.take.name)+': '+x.files.map(f=>nm(f)+' ('+sz(f.size)+')').join(', ')+'. Proxy and original? Your editor picks.</div>').join(''));
  h+=sec('Logged but not here',r.missing.length,r.missing.map(t=>'<div class="fl">Scene '+t.scene+' · '+esc(t.name)+'</div>').join(''));
  h+=sec('Here but not logged',r.extra.length,r.extra.map((f,i)=>'<div class="fl row" style="justify-content:space-between"><span style="word-break:break-all">'+nm(f)+' ('+sz(f.size)+')</span><select class="field" data-fadd="'+i+'" style="flex:0 1 150px"><option value="">Add to scene…</option>'+SCENES.map(sc=>'<option value="'+sc.n+'">'+sc.n+'. '+esc(sc.heading.slice(0,28))+'</option>').join('')+'</select></div>').join(''));
  h+=sec('Found',r.have.length,r.have.map(x=>'<div class="fl ok">Scene '+x.take.scene+' · '+esc(x.take.name)+(x.sizeDiffers?' · different size than when you logged it. Re-exported?':'')+'</div>').join(''));
  const sh=SCENES.map(sc=>({sc:sc,dn:doneOf(sc),n:(cutOf().takes[sc.n]||[]).length})).filter(x=>(x.dn&&x.dn.d&&!x.n));
  h+=sec('Shots marked done, no takes logged',sh.length,sh.map(x=>'<div class="fl">Scene '+x.sc.n+': '+x.dn.d+' of '+x.dn.t+' shots done, no takes here yet.</div>').join(''));
 }
 return h+'</div>'; }
/* watch it, make it: the picked pieces in script order, from this session's files */
let ROUGH=null; // {blob,url,mime,codec,ext,name,len}
async function seqOf(P){ const out=[]; for(const p of P.filter(p=>FILES[p.id])){ const it={url:URL.createObjectURL(FILES[p.id]),in:p.in,out:p.out,label:'Scene '+p.scene+' · '+p.name+(p.adr?' · ADR':''),scene:p.scene,name:p.name,id:p.id};
  if(p.adr){ const b=await adrBuffer(p.adr.id); if(b) it.adr={buffer:b,at:p.adr.at,under:p.adr.under}; } out.push(it); } return out; }
/* ---------- ADR: re-record a line over picture. Matching from ADR ALIGNMENT TOOL v1. Not lip sync: check it by eye. ---------- */
const UNDERS=[['Full',1],['Low',0.3],['Off',0]];
const ADRBUF={}, REFENV={};
function adrOf(t){ t.adr=t.adr||{line:{in:t.in,out:t.out},under:0.3,takes:[],keep:null}; return t.adr; }
function adrKept(t){ return t.adr&&t.adr.keep?(t.adr.takes||[]).find(x=>x.id===t.adr.keep)||null:null; }
let ACX=null; const acx=()=>ACX||(ACX=new (window.AudioContext||window.webkitAudioContext)());
async function decodeBlob(b){ const ab=await b.arrayBuffer(); return await new Promise((res,rej)=>{ const pr=acx().decodeAudioData(ab,res,rej); if(pr&&pr.then) pr.then(res,rej); }); }
async function adrBuffer(id){ if(ADRBUF[id]) return ADRBUF[id]; const b=await getPhoto(id); if(!b) return null; try{ ADRBUF[id]=await decodeBlob(b); }catch(e){ return null; } return ADRBUF[id]; }
async function refEnv(tid){ if(REFENV[tid]) return REFENV[tid]; const f=FILES[tid]; if(!f) return null; if(f.size>400*1048576) return {big:true};
 try{ const ab=await decodeBlob(f); REFENV[tid]={env:F.envelope(F.mono(Array.from({length:ab.numberOfChannels},(_,i)=>ab.getChannelData(i))),ab.sampleRate)}; }catch(e){ REFENV[tid]={none:true}; } return REFENV[tid]; }
async function lineUp(t,tk,blob,lo,hi){ let buf; try{ buf=await decodeBlob(blob); }catch(e){ toast('This browser could not read that recording.'); return false; }
 ADRBUF[tk.id]=buf; tk.dur=Math.round(buf.duration*100)/100; const ref=await refEnv(t.id);
 if(!ref||ref.big||ref.none){ tk.at=tk.at0; tk.match={none:true,why:ref&&ref.big?'big':'nosound'}; return true; }
 const m=F.alignTake(ref.env,0,F.envelope(F.mono(Array.from({length:buf.numberOfChannels},(_,i)=>buf.getChannelData(i))),buf.sampleRate),lo,hi);
 tk.at=m.r>0.3?m.at:tk.at0; tk.match=m; return true; }
let ADROPEN=null; // {n,id}
function adrTake(n,id){ return (cutOf().takes[n]||[]).find(x=>x.id===id); }
function adrHtml(){ const {n,id}=ADROPEN, t=adrTake(n,id), a=adrOf(t);
 const words=tk=>tk.match&&tk.match.why==='big'?'Clip too big to line up here. Placed where you recorded it; nudge by ear.':tk.match&&tk.match.why==='nosound'?'The clip has no sound to match. Placed where you recorded it; nudge by ear.':F.matchWords(tk.match);
 return '<div class="mchead"><b>ADR · scene '+n+' · '+esc(t.name)+'</b><button class="btn sm" id="adrx">CLOSE</button></div>'
  +'<div class="adrbody"><video id="adrvid" playsinline controls preload="auto"></video><div id="adrcount"></div>'
  +'<p class="faint" style="font-size:13px;margin:6px 0">Wear headphones, so the scene and the count-in stay out of your take. It plays 2 seconds before your line, counts you in, and stops by itself.</p>'
  +'<div class="row"><label class="faint" style="font-size:12px">Line in</label><input class="field" id="adrin" value="'+F.mmss(a.line.in)+'" style="flex:1 1 70px"><button class="btn sm" id="adrinh">HERE</button><label class="faint" style="font-size:12px">out</label><input class="field" id="adrout" value="'+F.mmss(a.line.out)+'" style="flex:1 1 70px"><button class="btn sm" id="adrouth">HERE</button></div>'
  +'<div class="row" style="margin-top:8px"><button class="btn pri" id="adrrec">RECORD THE LINE</button><label class="btn"><input type="file" accept="audio/*,video/*" class="hide" id="adrfile">USE A RECORDING</label><button class="btn" id="adrorig">PLAY ORIGINAL</button></div>'
  +'<div class="row" style="margin-top:8px"><label class="faint" style="font-size:13px">Original sound under your line</label><select class="field" id="adrunder" style="flex:0 1 110px">'+UNDERS.map(u=>'<option value="'+u[1]+'"'+(a.under===u[1]?' selected':'')+'>'+u[0]+'</option>').join('')+'</select></div>'
  +(a.takes.length?'<p class="kicker" style="margin-top:14px">Takes</p>':'')
  +a.takes.map((tk,i)=>'<div class="adrtk'+(a.keep===tk.id?' on':'')+'"><div class="row" style="justify-content:space-between"><b>Take '+(i+1)+'</b><span class="faint" style="font-size:12px">'+(tk.how==='mic'?'recorded':'from a file')+' · '+F.mmss(tk.dur||0)+' · starts at '+F.mmss(Math.max(0,tk.at+(tk.nudge||0)/1000))+'</span></div>'
    +'<div class="adrw">'+esc(words(tk))+'</div>'
    +'<div class="row" style="margin-top:6px"><button class="btn sm" data-adrplay="'+tk.id+'">PLAY OVER PICTURE</button><button class="btn sm" data-adrn="'+tk.id+'|-10">−10 ms</button><span class="mono" style="font-size:13px">'+((tk.nudge||0)>0?'+':'')+(tk.nudge||0)+' ms</span><button class="btn sm" data-adrn="'+tk.id+'|10">+10 ms</button>'
    +(a.keep===tk.id?'<span class="state on">KEPT</span>':'<button class="btn sm pri" data-adrkeep="'+tk.id+'">KEEP</button>')+'<button class="x" data-adrdel="'+tk.id+'" aria-label="Delete take">×</button></div></div>').join('')
  +(adrKept(t)?'<div class="row" style="margin-top:10px"><button class="btn" id="adrwav">SAVE THE LINE FOR YOUR EDITOR (.WAV)</button><button class="btn ghost" id="adrnone">USE THE ORIGINAL SOUND</button></div><p class="faint" style="font-size:12px">The .wav starts at the start of the clip, so it drops in at the clip\'s first frame. Silence until your line.</p>':'')
  +'<p class="faint" style="font-size:12px;margin-top:10px">It lines your take up by matching the loudness shape of the two. That is not lip sync. Watch it and nudge.</p></div>'; }
function openAdr(n,id){ ADROPEN={n:+n,id}; let o=$('adr'); if(!o){ o=document.createElement('div'); o.id='adr'; o.className='mc'; document.body.appendChild(o); document.body.classList.add('mcopen'); } o.innerHTML=adrHtml(); wireAdr(); }
function closeAdr(){ adrStopRec(); const o=$('adr'); if(o) o.remove(); document.body.classList.remove('mcopen'); ADROPEN=null; render(); }
let ADRREC=null;
function adrStopRec(){ if(!ADRREC) return; const r=ADRREC; ADRREC=null; clearInterval(r.tick); try{ r.v.pause(); }catch(e){} try{ if(r.mr.state!=='inactive') r.mr.stop(); }catch(e){} }
function beep(at){ try{ const c=acx(), o=c.createOscillator(), g=c.createGain(); o.frequency.value=1000; g.gain.value=0.25; o.connect(g); g.connect(c.destination); o.start(c.currentTime+at); o.stop(c.currentTime+at+0.08); }catch(e){} }
function wireAdr(){ const {n,id}=ADROPEN, t=adrTake(n,id), a=adrOf(t), v=$('adrvid');
 v.src=URL.createObjectURL(FILES[id]); v.addEventListener('loadedmetadata',()=>{ try{ v.currentTime=a.line.in; }catch(e){} },{once:true});
 $('adrx').onclick=closeAdr;
 const setLine=(k,val)=>{ const x=F.secs(val); if(x==null) return; a.line[k]=Math.max(0,Math.min(t.dur||x,x)); if(a.line.out<=a.line.in) toast('Out is before in. Check the line.'); save(); };
 $('adrin').onchange=e=>setLine('in',e.target.value); $('adrout').onchange=e=>setLine('out',e.target.value);
 $('adrinh').onclick=()=>{ a.line.in=Math.round(v.currentTime*100)/100; save(); openAdr(n,id); }; $('adrouth').onclick=()=>{ a.line.out=Math.round(v.currentTime*100)/100; save(); openAdr(n,id); };
 $('adrunder').onchange=e=>{ a.under=+e.target.value; save(); };
 $('adrorig').onclick=()=>{ v.currentTime=Math.max(0,a.line.in-0.5); v.play(); const stop=()=>{ if(v.currentTime>=a.line.out+0.5){ v.pause(); v.removeEventListener('timeupdate',stop); } }; v.addEventListener('timeupdate',stop); };
 $('adrrec').onclick=async()=>{ if(ADRREC){ adrStopRec(); return; }
  if(!(a.line.out>a.line.in)){ toast('Set the line in and out first.'); return; }
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){ toast('This browser will not record here. Use a recording instead.'); return; }
  let st; try{ st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}}); }catch(e){ toast(e&&e.name==='NotAllowedError'?'The mic is off for this page. Turn it on in your browser settings, or use a recording.':'No mic found. Use a recording instead.'); return; }
  const pre=Math.min(2,a.line.in), chunks=[]; let mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(m=>{ try{ return MediaRecorder.isTypeSupported(m); }catch(e){ return false; } })||'';
  const mr=new MediaRecorder(st,mime?{mimeType:mime}:undefined); mr.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  const btn=$('adrrec'); btn.textContent='STOP'; const cnt=$('adrcount');
  v.currentTime=a.line.in-pre; await new Promise(r=>v.addEventListener('seeked',r,{once:true}));
  let at0=null; mr.onstart=()=>{ at0=v.currentTime; };
  mr.onstop=async()=>{ st.getTracks().forEach(x=>x.stop()); cnt.textContent=''; const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'}); if(!blob.size){ toast('Nothing was recorded.'); openAdr(n,id); return; }
   const tk={id:rid('adr'),how:'mic',at0:at0==null?a.line.in-pre:at0,nudge:0,when:Date.now()};
   if(!(await putPhoto(tk.id,blob))){ toast('This phone would not keep the recording.'); return; }
   if(await lineUp(t,tk,blob,tk.at0-1,tk.at0+1)){ a.takes.push(tk); if(!a.keep) a.keep=tk.id; save(); } if(ADROPEN) openAdr(n,id); };
  mr.start(250); await v.play();
  [1.5,1,0.5].forEach(b=>{ if(pre>=b) beep(pre-b); });
  ADRREC={mr,v,tick:setInterval(()=>{ const left=a.line.in-v.currentTime; cnt.textContent=left>0.05?Math.ceil(left*2)/2+'':'LINE'; if(v.currentTime>=a.line.out+0.5||v.ended) adrStopRec(); },100)};
 };
 $('adrfile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; const tk={id:rid('adr'),how:'file',name:f.name,at0:a.line.in,nudge:0,when:Date.now()};
  if(!(await putPhoto(tk.id,f))){ toast('This phone would not keep the recording.'); return; }
  if(await lineUp(t,tk,f,Math.max(-2,a.line.in-2),a.line.in+2)){ a.takes.push(tk); if(!a.keep) a.keep=tk.id; save(); } openAdr(n,id); };
 document.querySelectorAll('[data-adrn]').forEach(b=>b.onclick=()=>{ const [tid,d]=b.dataset.adrn.split('|'); const tk=a.takes.find(x=>x.id===tid); if(!tk) return; tk.nudge=(tk.nudge||0)+(+d); save(); openAdr(n,id); });
 document.querySelectorAll('[data-adrkeep]').forEach(b=>b.onclick=()=>{ a.keep=b.dataset.adrkeep; save(); openAdr(n,id); });
 document.querySelectorAll('[data-adrdel]').forEach(b=>b.onclick=()=>{ const tid=b.dataset.adrdel; a.takes=a.takes.filter(x=>x.id!==tid); if(a.keep===tid) a.keep=null; delPhoto(tid); delete ADRBUF[tid]; save(); openAdr(n,id); });
 document.querySelectorAll('[data-adrplay]').forEach(b=>b.onclick=async()=>{ const tk=a.takes.find(x=>x.id===b.dataset.adrplay); const buf=tk&&await adrBuffer(tk.id); if(!buf) return;
   const u=URL.createObjectURL(FILES[id]); try{ await FilmPlay.play([{url:u,in:Math.max(0,a.line.in-0.5),out:Math.min(t.dur||1e9,a.line.out+0.5),label:'Take '+(a.takes.indexOf(tk)+1)+' over picture',adr:{buffer:buf,at:tk.at+(tk.nudge||0)/1000,under:a.under}}]); }catch(e){ toast('Stopped: '+e.message+'.'); } URL.revokeObjectURL(u); });
 const nw=$('adrnone'); if(nw) nw.onclick=()=>{ a.keep=null; save(); openAdr(n,id); };
 const wv=$('adrwav'); if(wv) wv.onclick=async()=>{ const tk=adrKept(t), buf=tk&&await adrBuffer(tk.id); if(!buf) return;
   const x=F.placeAt(F.mono(Array.from({length:buf.numberOfChannels},(_,i)=>buf.getChannelData(i))),buf.sampleRate,tk.at+(tk.nudge||0)/1000);
   dl(String(t.name).replace(/\.[^.]+$/,'')+' ADR line.wav',F.wav(x,buf.sampleRate),'audio/wav'); };
}
function watchBox(P){
 const have=P.filter(p=>FILES[p.id]), miss=P.filter(p=>!FILES[p.id]), len=F.cutLength(have);
 let h='<div class="watch"><p class="kicker" style="margin-top:14px">Watch it first</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">Your picked pieces, in script order, back to back. Tap NOTE while it plays to pin a note to the take on screen. MAKE THE ROUGH CUT turns them into one video file on this device, no editing app needed.</p>';
 if(miss.length) h+='<div class="msg" style="margin-bottom:8px">'+miss.length+' piece'+(miss.length===1?' needs its':'s need their')+' file picked again (FOOTAGE CHECK above, or + ADD TAKES): '+miss.map(p=>'scene '+p.scene+' '+esc(p.name)).join(', ')+'.'+(have.length?' Play and make use the other '+have.length+'.':'')+'</div>';
 h+='<div class="row"><button class="btn" id="cplay"'+(have.length?'':' disabled')+'>PLAY THE CUT'+(have.length?' · '+F.mmss(len):'')+'</button><button class="btn" id="crough"'+(have.length&&window.MediaRecorder?'':' disabled')+'>MAKE THE ROUGH CUT</button></div>';
 if(!window.MediaRecorder) h+='<p class="faint" style="font-size:13px">This browser cannot make video files. The edit list still works.</p>';
 if(ROUGH){ const h264=/H\.264/.test(ROUGH.codec);
  h+='<div class="msg" style="margin-top:10px">Made '+esc(ROUGH.name)+' · '+(ROUGH.blob.size/1048576).toFixed(1)+' MB · '+esc(ROUGH.mime.split(';')[0])+(ROUGH.codec?' ('+esc(ROUGH.codec)+')':'')+' · '+F.mmss(ROUGH.len)+' of pieces</div>'
   +(h264?'':'<div class="msg bad">This browser made it as '+esc(ROUGH.codec||'an unknown codec')+', not H.264. It plays in Chrome, Premiere and Resolve, but not in QuickTime or iPhone Photos. Make it from Safari or desktop Chrome for an H.264 file.</div>')
   +'<video class="tprev" id="roughvid" src="'+ROUGH.url+'" controls playsinline></video><div class="row" style="margin-top:6px"><button class="btn pri" id="csaverough">SAVE THE ROUGH CUT</button></div>'; }
 return h+'</div>'; }
async function clipLength(file){
 try{ const d=await F.movieLength((o,l)=>file.slice(o,o+l).arrayBuffer(),file.size); if(d>0) return d; }catch(e){}
 return clipLengthPlayer(file); }
function clipLengthPlayer(file){ return new Promise(res=>{ try{ const v=document.createElement('video'); v.preload='metadata'; v.muted=true; const u=URL.createObjectURL(file); let done=false;
 const fin=x=>{ if(done) return; done=true; URL.revokeObjectURL(u); res(x); };
 v.onloadedmetadata=()=>fin(isFinite(v.duration)?v.duration:0); v.onerror=()=>fin(0); setTimeout(()=>fin(0),8000); v.src=u; }catch(e){ res(0); } }); }
function dl(name,text,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:type})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); }

/* ---------- footage log: the spreadsheet you kept on the shoot (shared/xlsx.js reads Excel; CSV too) ---------- */
let LOGMSG='';
function logMap(){ const L=DB.log; if(!L) return {}; const auto=F.logSceneMap(L.rows,SCENES); return Object.assign(auto,L.map||{}); }
function foundPaths(){ const o={}; if(FOOT) FOOT.files.forEach(f=>{ if(F.isMedia(f.name)) o[F.nameKey(f.name)]=f.webkitRelativePath||f.name; }); return o; }
/* FROM THE SET: what was logged on the day, waiting for its clips */
function setBox(){ const S=setOf(); if(!S.log.length) return '';
 const open=S.log.filter(t=>t.mark==='gold'&&!t.clip).slice(0,8);
 return '<div class="card"><p class="kicker">From the set</p>'+F.setSummary(S.log).map(w=>'<p style="margin:4px 0;font-size:15px">'+esc(w)+'</p>').join('')
  +(open.length?'<div class="tklist" style="margin-top:8px">'+open.map(t=>'<div><b>SC '+t.n+' · TAKE '+t.take+'</b><span class="tm tm-gold">CIRCLE</span><small>'+esc(((shotsFor(SCENES.find(x=>x.n===t.n)||{speakers:[],props:[],action:[]})||[]).find(x=>x.id===t.shot)||{}).what||'')+(t.note?' · '+esc(t.note):'')+'</small><small class="faint">'+F.clockWord(t.at)+'</small></div>').join('')+'</div>':'')
  +'<p class="faint" style="font-size:13px;margin:8px 0 10px">Drop the day\'s clips in LOG THE DAY: each one comes up with the scene, shot, mark and note called on set, matched by when it was shot.</p><button class="btn sm" id="setwrapdl">WRAP REPORT</button></div>'; }
function logBox(){
 const L=DB.log;
 let h='<div class="card" id="logcard"><p class="kicker">Footage log</p>';
 if(LOGMSG) h+='<div class="msg'+(/<b>/.test(LOGMSG)?' bad':'')+'" style="margin-bottom:8px">'+LOGMSG+'</div>';
 if(!L) return h+'<p class="faint" style="font-size:13px;margin:-4px 0 8px">The spreadsheet you kept while shooting: FILE, SCENE, SHOT, LOCATION, DURATION, GOLD FOOTAGE, ACTION, NOTES. Excel or CSV. Every row becomes a take on its scene, gold ones marked gold, so you can find them, check the files are here and cut. Nothing leaves this device.</p>'
  +'<label class="btn sm"><input type="file" accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" class="hide" id="login">OPEN A FOOTAGE LOG</label></div>';
 const sc=F.logScenes(L.rows), map=logMap(), gold=L.rows.filter(r=>r.gold===true).length;
 h+='<div class="fsum">'+esc(L.file)+' · '+L.rows.length+' rows · '+sc.length+' scene'+(sc.length===1?'':'s')+' · '+gold+' gold</div>';
 if(L.notes.length) h+=L.notes.map(n=>'<div class="fl">'+esc(n)+'</div>').join('');
 if(cur()){
  h+='<p class="faint" style="font-size:13px;margin:10px 0 4px">Log scene to script scene</p>'+sc.map(s=>'<div class="row" style="justify-content:space-between;margin:2px 0"><span style="font:600 13px var(--mono)">'+esc(s.label)+' <span class="faint">('+s.rows+(s.gold?', '+s.gold+' gold':'')+')</span></span><select class="field" data-lmap="'+esc(s.label)+'" style="flex:0 1 190px"><option value="">Not in the cut</option>'+SCENES.map(x=>'<option value="'+x.n+'"'+(map[s.label]===x.n?' selected':'')+'>'+x.n+'. '+esc(x.heading.slice(0,26))+'</option>').join('')+'</select></div>').join('');
  const T=F.logTakes(L.rows,map), n=Object.values(T.by).reduce((a,x)=>a+x.length,0);
  h+='<div class="row" style="margin-top:10px"><button class="btn pri sm" id="logadd"'+(n?'':' disabled')+'>ADD '+n+' TO THE CUT</button><button class="btn sm" id="logcsv">LOG FOR THE EDITOR (.CSV)</button><button class="btn sm" id="logdrop">CLOSE THE LOG</button></div>';
  h+='<p class="faint" style="font-size:13px;margin:8px 0 0">'+(T.unplaced.length?T.unplaced.length+' row'+(T.unplaced.length===1?'':'s')+' not on a script scene stay in the log only. ':'')+'Takes already added are not added twice. Then type gold in Find a take, or pick your footage folder to see what is here.'+(FOOT?'':' The editor CSV says where each file was found once you pick the folder.')+'</p>';
 } else {
  h+='<div class="row" style="margin-top:10px"><button class="btn pri sm" id="logscript">MAKE THE SCENES FROM THE LOG</button><button class="btn sm" id="logdrop">CLOSE THE LOG</button></div><p class="faint" style="font-size:13px;margin:8px 0 0">One scene per log scene, named the way you wrote it. Bring in the real script any time.</p>';
 }
 return h+'</div>';
}
async function readLog(f){
 LOGMSG='';
 try{
  let rows;
  if(/\.xlsx$/i.test(f.name)){ const sh=await window.XLSX.read(await f.arrayBuffer()); let best=null; for(const s of sh){ const r=F.logRead(s.rows); if(r.rows.length&&(!best||r.rows.length>best.r.rows.length)) best={s,r}; } if(!best){ LOGMSG='<b>No footage log in that workbook.</b> '+esc((F.logRead((sh[0]||{}).rows||[]).notes||[])[0]||''); render(); return; } rows=best.r; rows.sheet=best.s.name; }
  else { rows=F.logRead(window.XLSX.csv(await f.text())); if(!rows.rows.length){ LOGMSG='<b>Nothing read.</b> '+esc(rows.notes[0]||''); render(); return; } }
  DB.log={file:f.name+(rows.sheet&&rows.sheet!=='Sheet1'?' ('+rows.sheet+')':''),at:Date.now(),rows:rows.rows,notes:rows.notes,map:{}}; save();
  toast(rows.rows.length+' rows from '+f.name+'.'); render();
 }catch(e){ LOGMSG='<b>Could not read that file.</b> '+esc(e.message); render(); }
}
function addLog(){
 const L=DB.log, k=cutOf(), T=F.logTakes(L.rows,logMap()); let n=0, skip=0;
 Object.keys(T.by).forEach(sn=>{ k.takes[sn]=k.takes[sn]||[]; T.by[sn].forEach(t=>{ if(k.takes[sn].some(x=>x.log&&x.log.row===t.log.row&&x.name===t.name)){ skip++; return; } const o=Object.assign({id:rid('t')},t); if(o.mark===undefined) delete o.mark; k.takes[sn].push(o); n++; }); });
 save(); if(FOOT) runFoot(FOOT.files); render(); toast(n+' take'+(n===1?'':'s')+' added'+(skip?', '+skip+' already there':'')+'.');
}
function wireLog(){
 const i=$('login'); if(i) i.onchange=()=>{ const f=i.files[0]; if(f) readLog(f); };
 document.querySelectorAll('[data-lmap]').forEach(sel=>sel.onchange=()=>{ const L=DB.log; L.map=L.map||{}; L.map[sel.dataset.lmap]=sel.value?+sel.value:null; save(); render(); });
 const a=$('logadd'); if(a) a.onclick=addLog;
 const c=$('logcsv'); if(c) c.onclick=()=>dl(String(DB.log.file).replace(/\.[a-z]+(\s|$).*$/i,'')+' editor log.csv',F.logCsv(DB.log.rows,foundPaths()),'text/csv');
 const d=$('logdrop'); if(d) d.onclick=()=>{ if(!confirm('Close the log? Takes already in the cut stay.')) return; DB.log=null; LOGMSG=''; save(); render(); };
 const m=$('logscript'); if(m) m.onclick=()=>{ const L=DB.log, title=String(L.file).replace(/\.[a-z]+(\s|$).*$/i,'').replace(/[_]+/g,' ').trim(); open('log'+Date.now().toString(36),F.logScript(L.rows,title),title+' (from the log)'); addLog(); };
}

function wireCut(){
 const k=cutOf(); const findT=v=>{ const [n,id]=v.split('|'); return {n:+n,t:(k.takes[n]||[]).find(x=>x.id===id)}; };
 const tg=$('ctarget'); if(tg) tg.onchange=()=>{ const s=F.secs(tg.value); if(s!=null&&s>0){ k.target=s; save(); } render(); };
 const fp=$('cfps'); if(fp) fp.onchange=()=>{ k.fps=fp.value; save(); };
 document.querySelectorAll('[data-tadd]').forEach(i=>i.onchange=async()=>{ const n=+i.dataset.tadd; const fl=[...i.files]; if(!fl.length) return; k.takes[n]=k.takes[n]||[];
   for(const f of fl){ const ex=k.takes[n].find(x=>x.name===f.name&&x.size===f.size); const id=ex?ex.id:rid('t'); FILES[id]=f; if(ex) continue;
    const d=await clipLength(f); k.takes[n].push({id:id,name:f.name,size:f.size,dur:Math.round(d*100)/100,in:0,out:Math.round(d*100)/100,use:!k.takes[n].some(x=>x.use),at:Date.now()}); }
   save(); render(); toast(fl.length+' take'+(fl.length===1?'':'s')+' added to scene '+n+'.'); });
 document.querySelectorAll('[data-tuse]').forEach(b=>b.onchange=()=>{ const r=findT(b.dataset.tuse); if(!r.t) return; r.t.use=b.checked; save(); render(); });
 const dyi=$('dayin'); if(dyi) dyi.onchange=()=>{ const fl=[...dyi.files]; dyi.value=''; if(fl.length) dayOpen(fl); };
 document.querySelectorAll('[data-tshot]').forEach(b=>b.onchange=()=>{ const r=findT(b.dataset.tshot); if(!r.t) return; if(b.value) r.t.shot=b.value; else delete r.t.shot; save(); const pc=$('packcover'); if(pc) pc.textContent=F.coverWords(coverNow()); });
 const plk=$('packlink'); if(plk) plk.oninput=()=>{ k.link=plk.value.trim(); save(); };
 const pnt=$('packnote'); if(pnt) pnt.oninput=()=>{ k.packNote=pnt.value; save(); };
 const pzp=$('packzip'); if(pzp) pzp.onclick=async()=>{ const z=window.Zip.make(packFiles()), fn=F.slug(filmName())+' editor pack.zip', file=new File([z],fn,{type:'application/zip'});
  try{ if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:fn}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
  dl(fn,z,'application/zip'); };
 const swd=$('setwrapdl'); if(swd) swd.onclick=()=>{ const c=cur(), t=F.wrapText({title:filmName(),date:c.dayDate||ymd(new Date()),shots:dayList(),log:setOf().log,delays:kitOf().delays,tones:kitOf().tones,reads:kitOf().read}); dl(F.slug(filmName())+' wrap report.txt',t,'text/plain'); };
 const ppl=$('packplan'); if(ppl) ppl.onclick=()=>{ const f=packFiles()[2]; dl(f.name,f.data,'text/csv'); };
 const pgt=$('packgot'); if(pgt) pgt.onclick=()=>{ const f=packFiles()[3]; dl(f.name,f.data,'text/csv'); };
 document.querySelectorAll('[data-tdel]').forEach(b=>b.onclick=()=>{ const [n,id]=b.dataset.tdel.split('|'); k.takes[n]=(k.takes[n]||[]).filter(x=>x.id!==id); delete FILES[id]; save(); render(); });
 const setT=(sel,key)=>document.querySelectorAll(sel).forEach(i=>i.onchange=()=>{ const r=findT(i.dataset[key]); if(!r.t) return; let s=F.secs(i.value); if(s==null){ render(); return; }
   s=Math.max(0,Math.min(r.t.dur||s,s)); if(key==='tin') r.t.in=s; else r.t.out=s; if(r.t.out<r.t.in){ toast('Out is before in. Check the times.'); } save(); render(); });
 setT('[data-tin]','tin'); setT('[data-tout]','tout');
 document.querySelectorAll('[data-tvid]').forEach(v=>{ const f=FILES[v.dataset.tvid]; if(f){ v.src=URL.createObjectURL(f); } });
 const here=(sel,key,side)=>document.querySelectorAll(sel).forEach(b=>b.onclick=()=>{ const r=findT(b.dataset[key]); if(!r.t) return; const v=document.querySelector('[data-tvid="'+r.t.id+'"]'); if(!v) return;
   const s=Math.round(v.currentTime*100)/100; if(side==='in') r.t.in=s; else r.t.out=s; save(); render(); });
 here('[data-tsetin]','tsetin','in'); here('[data-tsetout]','tsetout','out');
 const name=()=>String(cur().file||'cut').replace(/\.[a-z]+$/i,'').replace(/[^\w ]+/g,' ').trim()||'cut';
 const e=$('cedl'); if(e) e.onclick=()=>dl(name()+' cut.edl',F.edl(name(),pieces(),k.fps),'text/plain');
 const cv=$('ccsv'); if(cv) cv.onclick=()=>dl(name()+' cut.csv',F.cutCsv(pieces()),'text/csv');
 const pl=$('cplay'); if(pl) pl.onclick=async()=>{ const q=await seqOf(pieces()); if(!q.length) return; let n=0;
   const onNote=(i,it,at,text)=>{ const r=findT(it.scene+'|'+it.id); if(!r.t) return; if(F.watchNote(r.t,at,F.atInCut(q,i,at),text)){ n++; save(); } };
   try{ await FilmPlay.play(q,{onNote}); }catch(e){ toast('Stopped: '+e.message+'.'); } q.forEach(x=>URL.revokeObjectURL(x.url)); if(n){ render(); toast(n+' note'+(n===1?'':'s')+' kept on the takes. They go in the editor brief.'); } };
 const rc=$('crough'); if(rc) rc.onclick=async()=>{ const P=pieces(), q=await seqOf(P); if(!q.length) return; let r=null;
   try{ r=await FilmPlay.render(q); }catch(e){ toast('Could not make the file: '+e.message+'.'); }
   q.forEach(x=>URL.revokeObjectURL(x.url)); if(!r){ return; }
   if(ROUGH) URL.revokeObjectURL(ROUGH.url);
   ROUGH=Object.assign(r,{url:URL.createObjectURL(r.blob),name:name()+' rough cut.'+r.ext,len:F.cutLength(P.filter(p=>FILES[p.id]))});
   keepFinal(r.blob,ROUGH.name,ROUGH.len,'rough');
   render(); const o=$('roughvid'); if(o) o.scrollIntoView({block:'center'}); };
 const sr=$('csaverough'); if(sr) sr.onclick=async()=>{ if(!ROUGH) return; try{ const f=new File([ROUGH.blob],ROUGH.name,{type:ROUGH.blob.type}); if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:ROUGH.name}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
   const a=document.createElement('a'); a.href=ROUGH.url; a.download=ROUGH.name; document.body.appendChild(a); a.click(); a.remove(); };
 const cf=$('cfind'); if(cf){ const show=()=>{ $('cfindres').innerHTML=findHtml(); document.querySelectorAll('[data-fgo]').forEach(b=>b.onclick=()=>{ const el=document.querySelector('[data-trow="'+b.dataset.fgo+'"]'); if(el){ el.scrollIntoView({block:'center'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1600); } }); };
   cf.oninput=()=>{ FINDQ=cf.value; show(); }; show(); }
 document.querySelectorAll('[data-wdel]').forEach(b=>b.onclick=()=>{ const [n,id,wid]=b.dataset.wdel.split('|'); const r=findT(n+'|'+id); if(!r.t||!r.t.watch) return; r.t.watch=r.t.watch.filter(w=>w.id!==wid); if(!r.t.watch.length) delete r.t.watch; save(); render(); });
 document.querySelectorAll('[data-tnote]').forEach(i=>i.oninput=()=>{ const r=findT(i.dataset.tnote); if(!r.t) return; if(i.value.trim()) r.t.note=i.value; else delete r.t.note; save(); });
 document.querySelectorAll('[data-adr]').forEach(b=>b.onclick=()=>{ const [n,id]=b.dataset.adr.split('|'); openAdr(n,id); });
 const cbx=$('credbox'); if(cbx) cbx.ontoggle=()=>{ CREDOPEN=cbx.open; };
 const cth=$('cthanks'); if(cth) cth.onchange=()=>{ creditsOf().thanks=cth.value; save(); render(); };
 const cyr=$('cyear'); if(cyr) cyr.onchange=()=>{ creditsOf().year=cyr.value.trim(); save(); render(); };
 const cow=$('cowner'); if(cow) cow.onchange=()=>{ creditsOf().owner=cow.value.trim(); save(); render(); };
 const ccr=$('ccred'); if(ccr) ccr.onclick=()=>dl(name()+' end credits.txt',F.credits(creditData()).text,'text/plain');
 const cb=$('cbrief'); if(cb) cb.onclick=()=>dl(name()+' editor brief.txt',F.brief(name(),SCENES.map(sc=>({n:sc.n,heading:sc.heading,brief:(k.brief||{})[sc.n]||{},takes:k.takes[sc.n]||[],shots:doneOf(sc)})),k.fps),'text/plain');
 document.querySelectorAll('[data-tmark]').forEach(b=>b.onchange=()=>{ const r=findT(b.dataset.tmark); if(!r.t) return; if(b.value) r.t.mark=b.value; else delete r.t.mark; if(b.value==='never') r.t.use=false; save(); render(); });
 document.querySelectorAll('[data-brief]').forEach(i=>{ const ev=i.tagName==='SELECT'?'onchange':'oninput'; i[ev]=()=>{ const [n,key]=i.dataset.brief.split('|'); const b=briefOf(+n); if(i.value) b[key]=i.value; else delete b[key]; save(); if(key==='free') render(); }; });
 document.querySelectorAll('[data-bopen]').forEach(d=>d.ontoggle=()=>{ BOPEN[d.dataset.bopen]=d.open; });
 ['ffold','ffiles'].forEach(id=>{ const i=$(id); if(i) i.onchange=()=>{ const fl=[...i.files]; if(!fl.length) return; runFoot(fl); render(); toast(fl.length+' files checked.'); }; });
 document.querySelectorAll('[data-fadd]').forEach(sel=>sel.onchange=async()=>{ const n=+sel.value; if(!n||!FOOT) return; const f=FOOT.res.extra[+sel.dataset.fadd].f; k.takes[n]=k.takes[n]||[];
   const id=rid('t'); FILES[id]=f; const d=await clipLength(f); k.takes[n].push({id:id,name:f.name,size:f.size,dur:Math.round(d*100)/100,in:0,out:Math.round(d*100)/100,use:!k.takes[n].some(x=>x.use),at:Date.now()});
   save(); runFoot(FOOT.files); render(); toast(f.name+' added to scene '+n+'.'); });
}

/* ---------- wiring ---------- */
function wire(){
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ TAB=b.dataset.go; render(); });
 const yf=$('yourfilms'); if(yf) yf.onclick=()=>{ OPENP=!OPENP; render(); };
 document.querySelectorAll('details.ffold[data-ff]').forEach(d=>d.addEventListener('toggle',()=>{ FFOPEN[d.dataset.ff]=d.open; }));
 const hf=$('hfilms'); if(hf) hf.onclick=()=>{ OPENP=!OPENP; render(); };
 const sf=$('startfilm'); if(sf) sf.onclick=()=>{ OPENP=false; MSG=''; TAB=TAB==='start'?(cur()?LASTIN.prep:'script'):'start'; OPEN=null; render(); };
 const es=$('exstart'); if(es) es.onclick=()=>{ MSG=''; TAB='start'; render(); };
 const ef=$('exfilms'); if(ef) ef.onclick=()=>{ OPENP=true; render(); };
 document.querySelectorAll('[data-film]').forEach(b=>b.onclick=()=>{ const id=b.dataset.film, c=DB.scripts[id]; if(!c) return; DB.cur=id; c.at=Date.now(); OPENP=false; SCENES=F.scenes(c.text); OPEN=null; save(); if(TAB==='start'||TAB==='script') TAB='scenes'; render(); fromTakes(); });
 document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{ START.kind=b.dataset.kind; render(); });
 document.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>{ START.who=b.dataset.who; render(); });
 document.querySelectorAll('[data-dest]').forEach(b=>b.onclick=()=>sendOut(b.dataset.dest));
 const of=$('outfile'); if(of) of.onchange=async()=>{ const f=of.files[0]; if(!f) return; const secs=await clipLength(f); if(await keepFinal(f,f.name,secs||0,'file')){ render(); toast('Your cut is in.'); } };
 if(TAB==='out') fillOut();
 const d=$('drop');
 if(d){
  d.onclick=()=>$('file').click();
  d.ondragover=e=>{ e.preventDefault(); d.classList.add('over'); };
  d.ondragleave=()=>d.classList.remove('over');
  d.ondrop=e=>{ e.preventDefault(); d.classList.remove('over'); const f=e.dataTransfer.files[0]; if(f) readFile(f); };
 }
 const r=$('readit'); if(r) r.onclick=()=>{ const t=$('paste').value; if(t.trim()) take(t,'Pasted script'); };
 document.querySelectorAll('[data-shelf]').forEach(b=>b.onclick=()=>fromShelf(b.dataset.shelf));
 document.querySelectorAll('[data-me]').forEach(b=>b.onclick=()=>{ const c=cur(); c.me=b.dataset.me; save(); if(SH&&SH.get(DB.cur)) SH.setMe(DB.cur,c.me,TOOL); render(); });
 document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{ OPEN=Number(b.dataset.scene); LASTSCENE=OPEN; TAB='scenes'; render(); });
 if(window.Kit) Kit.wire($('main'),{
  shoot:()=>openShoot(LASTSCENE),
  match:()=>{ TAB='scenes'; OPEN=LASTSCENE||(SCENES[0]&&SCENES[0].n)||null; render(); const b=document.querySelector('[data-match]'); if(b){ b.scrollIntoView({block:'center'}); toast('Pick who you\'re matching.'); } },
  adr:()=>{ TAB='cut'; OPEN=null; render(); const b=document.querySelector('[data-adr]'); if(b){ b.scrollIntoView({block:'center'}); toast('ADR is on each take. Tap ADR on the one you want.'); } else toast('Shoot or add a take first. ADR goes on a take.'); },
  scout:()=>{ TAB='own'; OPEN=null; render(); }
 });
 document.querySelectorAll('[data-shoot]').forEach(b=>b.onclick=()=>openShoot(+b.dataset.shoot));
 document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{ OPEN=null; render(); });
 document.querySelectorAll('[data-way]').forEach(b=>b.onclick=()=>{ const s=st(OPEN); s.way=b.dataset.way; save(); render(); });
 const w=$('where'); if(w) w.onchange=()=>{ st(OPEN).where=w.value; save(); render(); };
 document.querySelectorAll('[data-where]').forEach(b=>b.onclick=()=>{ st(OPEN).where=b.dataset.where; save(); render(); });
 document.querySelectorAll('[data-shot]').forEach(b=>b.onchange=()=>{ const s=st(OPEN); if(b.checked) s.done[b.dataset.shot]=1; else delete s.done[b.dataset.shot]; save();
   b.closest('.shot').classList.toggle('done',b.checked); const L=document.querySelectorAll('[data-shot]'); const k=[...document.querySelectorAll('.kicker')].find(x=>/^Shots/.test(x.textContent)); if(k) k.textContent='Shots · '+[...L].filter(x=>x.checked).length+' of '+L.length; });
 document.querySelectorAll('[data-cont]').forEach(i=>i.oninput=()=>{ const s=st(OPEN); const w=i.dataset.cont; s.cont[w]=s.cont[w]||{}; s.cont[w][i.dataset.k]=i.value; s.contAt=Date.now(); save(); });
 document.querySelectorAll('[data-ins]').forEach(b=>b.onclick=()=>{ const sc=SCENES.find(x=>x.n===OPEN), s=st(OPEN); const cur0=Array.isArray(s.ins)?s.ins:sc.props.slice(0,6); const p=b.dataset.ins;
   s.ins=cur0.includes(p)?cur0.filter(x=>x!==p):sc.props.filter(x=>x===p||cur0.includes(x)); save(); render(); });
 document.querySelectorAll('[data-cphoto]').forEach(i=>i.onchange=async()=>{ const f=i.files[0]; if(!f) return; keepPhoto(i.dataset.cphoto,await shrink(f)); });
 document.querySelectorAll('[data-match]').forEach(b=>b.onclick=()=>openMatch(b.dataset.match));
 document.querySelectorAll('[data-same]').forEach(b=>b.onclick=()=>{ const w=b.dataset.same, p=lastCard(w,OPEN); if(!p) return; const keep=(st(OPEN).cont[w]||{}).photo; st(OPEN).cont[w]=Object.assign({},p.v,{photo:keep||''}); save(); render(); toast(w+': copied from scene '+p.n+'.'); });
 const ra=$('ranch'); if(ra) ra.onclick=()=>{ DB.owned=(DB.owned||[]).concat(F.RANCH.map(o=>Object.assign({id:rid('o')},o))); save(); render(); toast('The ranch list is in: 40 places and pieces.'); };
 const em=$('empty'); if(em) em.onclick=()=>{ DB.owned=[]; save(); render(); };
 const oa=$('oadd'); if(oa) oa.onclick=()=>{ const n=$('oname').value.trim(); if(!n) return; DB.owned=owned().concat([{id:rid('o'),kind:$('okind').value,name:n,plays:$('oplays').value.trim(),notes:$('onotes').value.trim()}]); save(); render(); };
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ DB.owned=owned().filter(o=>o.id!==b.dataset.del); save(); render(); });
 document.querySelectorAll('[data-oedit]').forEach(b=>b.onclick=()=>{ OEDIT=b.dataset.oedit; TAB='own'; render(); });
 document.querySelectorAll('[data-oback]').forEach(b=>b.onclick=()=>{ OEDIT=null; render(); });
 document.querySelectorAll('[data-of]').forEach(i=>i.oninput=()=>{ const o=owned().find(x=>x.id===OEDIT); if(!o) return; o[i.dataset.of]=i.value; save(); });
 const sp=$('sphoto'); if(sp) sp.onchange=()=>{ $('sphotoname').textContent=sp.files[0]?'Photo: '+sp.files[0].name:''; };
 const ss=$('ssave'); if(ss) ss.onclick=async()=>{ const o=owned().find(x=>x.id===OEDIT); if(!o) return; const note=$('snote').value.trim(), f=sp&&sp.files[0]; if(!note&&!f) return;
   const e={id:rid('s'),at:Date.now(),note:note,photo:''};
   if(f){ const pid=rid('ph'); if(await putPhoto(pid,await shrink(f))) e.photo=pid; else toast('This phone would not keep the photo.'); }
   o.scout=[e].concat(o.scout||[]); save(); render(); toast('Scouted: '+o.name+'.'); };
 document.querySelectorAll('[data-sdel]').forEach(b=>b.onclick=()=>{ const o=owned().find(x=>x.id===OEDIT); if(!o) return; const e=(o.scout||[]).find(x=>x.id===b.dataset.sdel); if(e&&e.photo) delPhoto(e.photo); o.scout=(o.scout||[]).filter(x=>x.id!==b.dataset.sdel); save(); render(); });
 const ow=$('owhere'); if(ow) ow.onchange=()=>{ const o=owned().find(x=>x.id===OEDIT); if(!o) return; const g=F.coords(ow.value); o.where=ow.value.trim(); save(); render(); if(ow.value.trim()&&!g) toast('That doesn\'t read as a place. Try 38.84, -97.61 or a maps link.'); };
 const oh=$('ohere'); if(oh) oh.onclick=()=>{ if(!navigator.geolocation){ toast('This phone won\'t share where it is. Paste a pin instead.'); return; } oh.textContent='FINDING…';
   navigator.geolocation.getCurrentPosition(p=>{ const o=owned().find(x=>x.id===OEDIT); if(!o) return; o.where=p.coords.latitude.toFixed(5)+', '+p.coords.longitude.toFixed(5); save(); render(); toast('Set to where you are.'); },
   ()=>{ oh.textContent='I\'M HERE'; toast('Location is off for this page. Paste a pin from your maps app instead.'); },{enableHighAccuracy:true,timeout:15000}); };
 const sd=$('osundate'); if(sd) sd.onchange=()=>{ const c=cur(); if(c){ c.dayDate=sd.value; save(); } render(); };
 const dd=$('daydate'); if(dd) dd.onchange=()=>{ cur().dayDate=dd.value; save(); render(); };
 document.querySelectorAll('[data-actor]').forEach(i=>i.oninput=()=>{ const pe=peopleOf(); if(i.value.trim()) pe.actors[i.dataset.actor]=i.value; else delete pe.actors[i.dataset.actor]; save(); });
 const pcr=$('pcrew'); if(pcr) pcr.oninput=()=>{ peopleOf().crew=pcr.value; save(); };
 const pco=$('pcontacts'); if(pco) pco.oninput=()=>{ peopleOf().contacts=pco.value; save(); };
 const kc=$('kcall'); if(kc) kc.onchange=()=>{ callOf().call=kc.value; save(); render(); };
 const kw=$('kwrap'); if(kw) kw.onchange=()=>{ callOf().wrap=kw.value; save(); render(); };
 document.querySelectorAll('[data-kstart]').forEach(i=>i.onchange=()=>{ const k=callOf(); if(i.value) k.starts[i.dataset.kstart]=i.value; else delete k.starts[i.dataset.kstart]; save(); });
 const kh=$('khosp'); if(kh) kh.oninput=()=>{ callOf().hospital=kh.value; save(); };
 const kn=$('knotes'); if(kn) kn.oninput=()=>{ callOf().notes=kn.value; save(); };
 const sheetName=()=>String(callData().title||'Untitled').replace(/[^\w ]+/g,' ').trim()||'Untitled';
 const kt=$('ktxt'); if(kt) kt.onclick=()=>{ const D=callData(); dl(sheetName()+' call sheet'+(D.date?' '+D.date:'')+'.txt',F.callSheet(D).text,'text/plain'); };
 const kp=$('kprint'); if(kp) kp.onclick=()=>{ $('printsheet').innerHTML=callSheetHtml(callData()); window.print(); };
 if(TAB==='cut'){ if(cur()) wireCut(); wireLog(); }
 if(TAB==='shots') wireShots();
 if(TAB==='set'&&cur()){ if(WRAPVIEW) wireWrap(); else wireSet(); }
 if(TAB==='tools') wireTools();
 fillPhotos();
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&MC.stream) mcClose(); if(document.hidden&&ADRREC) adrStopRec(); });
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ const r=b.dataset.r; if(roomOf(TAB)!==r) TAB=LASTIN[r]; OPEN=null; OEDIT=null; WRAPVIEW=false; render(); });
$('file').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(f) readFile(f); });
/* the OWNED list is shared with BACKLOT: changed in another tab, take theirs */
window.addEventListener('storage',e=>{ if(e.key===KEY&&e.newValue){ try{ const d=JSON.parse(e.newValue); if(d&&Array.isArray(d.owned)){ DB.owned=d.owned; render(); } }catch(x){} } });
window.addEventListener('storage',e=>{ if(e.key&&/shelf/.test(e.key)){ const p=SH&&SH.pending(TOOL); if(p){ adopt(); render(); } } });

adopt();
/* opened with nothing, like every tool: what you were on is one tap away (YOUR FILMS · PICK UP), never in your face.
   ?open=1, #open=<id>, a script sent from another tool, or a start from BACKLOT open it. ?start=1 opens START A FILM. */
{ const q=new URLSearchParams(location.search); if(!ASKED&&!q.get('open')&&DB.cur){ DB.last=DB.cur; DB.cur=''; SCENES=[]; save(); }
  if(q.get('open')&&!DB.cur&&DB.last&&DB.scripts[DB.last]){ DB.cur=DB.last; SCENES=F.scenes(DB.scripts[DB.cur].text); }
  if(q.get('start')&&!DB.cur) TAB='start'; }
if(cur()&&TAB==='script'&&SCENES.length) TAB='scenes';
render();
/* takes recorded with CAMERA on the home page (shared/takes.js): a scene take lands on its scene in CUT,
   and its file is kept, so it plays again after the page is closed */
async function fromTakes(){
 const T=window.Takes; if(!T) return; let n=0, lastHere=true; const here0=()=>lastHere;
 for(const it of T.pending(TOOL,['scene'])){
  // it goes on the script it was shot for, even if another one is open now (or none is)
  const sc=(it.for.script&&DB.scripts[it.for.script])||cur(); if(!sc) continue; const here=sc===cur();
  const b=await T.blob(it.id); if(!b){ T.take(TOOL,it.id); continue; }
  sc.cut=sc.cut||{target:300,fps:'30',takes:{}}; const k=sc.cut, sn=(!here||SCENES.some(x=>x.n===+it.for.scene))?(+it.for.scene||1):((SCENES[0]&&SCENES[0].n)||1); k.takes[sn]=k.takes[sn]||[];
  const id=rid('t'), d=Math.round((it.secs||0)*100)/100;
  k.takes[sn].push({id:id,name:it.name,size:b.size,dur:d,in:0,out:d,use:!k.takes[sn].some(x=>x.use),at:it.at,takeId:it.id});
  FILES[id]=new File([b],it.name,{type:b.type,lastModified:it.at}); lastHere=here; T.take(TOOL,it.id); n++; }
 // and the files of earlier ones, back from the takes shelf
 const k=cur()&&cur().cut; if(k&&k.takes) for(const L of Object.values(k.takes)) for(const t of L){ if(t.takeId&&!FILES[t.id]){ const b=await T.blob(t.takeId); if(b) FILES[t.id]=new File([b],t.name,{type:b.type}); } }
 if(n){ save(); toast(n===1?'A take from home is on its scene in CUT'+(here0()?'.':' of the script it was shot for.'):n+' takes from home are in CUT.'); }
 if(n||TAB==='cut') render();
}
fromTakes();
window.__film={sendOut:k=>sendOut(k),keepFinal:(b,n,s,f)=>keepFinal(b,n,s,f),DB:()=>DB,SCENES:()=>SCENES,dayOpen:f=>dayOpen(f),packFiles:()=>packFiles(),CAM,MIC,MON,CLICK};
})();
