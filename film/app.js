/* STORY STUDIO app. Everything stays on this phone (localStorage 'film_os_v1').
   Scripts come off the sides shelf, so anything you dropped in an ACT tool is here. */
(function(){
const F=window.FilmOS, S=window.ActorSides, SH=window.Shelf;
const KEY='film_os_v1', TOOL='film';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

let DB=load(); let TAB='script', OPEN=null, SCENES=[], MSG='', OEDIT=null;
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
 DB.cur=id; SCENES=F.scenes(text); save();
}
function take(text,file,f){
 MSG='';
 const sc=F.scenes(text);
 if(!sc.length){ MSG='<b>No scenes found.</b> Scene headings start with INT. or EXT., and names sit on their own line above the dialogue.'; render(); return; }
 let id='p'+Date.now().toString(36), me='';
 if(SH){ const it=SH.put({text:text,file:file||'Pasted script',fileSig:f?SH.sig(f):'',from:'STORY STUDIO',tool:TOOL}); if(it){ id=it.id; me=it.me||''; if(it.text) text=it.text; if(f) SH.putFile(it.id,f); } }
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
 if(!SH) return;
 const p=SH.pending(TOOL);
 if(p){ SH.markSeen(TOOL,p.id); open(p.id,p.text,p.file,p.me); TAB='scenes';
   setTimeout(()=>toast('New script: '+SH.label(p)+'.'),300); return; }
 const c=cur(); if(c&&c.text) SCENES=F.scenes(c.text);
}

/* ---------- views ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===TAB));
 const c=cur();
 $('title').textContent=c?String(c.file||'Script').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/_/g,' '):'Make it alone';
 $('count').textContent=c?SCENES.length+' scene'+(SCENES.length===1?'':'s')+(c.me?' · you are '+c.me:''):'';
 const m=$('main');
 if(TAB==='script') m.innerHTML=vScript();
 else if(!c&&TAB!=='own') m.innerHTML='<div class="msg">Bring in a script first.</div><button class="btn pri block" data-go="script">SCRIPT</button>';
 else if(TAB==='scenes') m.innerHTML=OPEN?vScene(OPEN):vScenes();
 else if(TAB==='own') m.innerHTML=vOwn();
 else if(TAB==='day') m.innerHTML=vDay();
 else if(TAB==='cut') m.innerHTML=vCut();
 wire();
 window.scrollTo(0,0);
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
  h+='<p class="kicker" style="margin-top:20px">On your shelf</p><p class="faint" style="font-size:13px;margin:-4px 0 6px">Anything you dropped in an ACT tool or Writer\'s Blockage.</p>';
  h+=list.map(it=>'<div class="scriptrow"><div><b>'+esc(SH.label(it))+'</b><small>'+esc(it.from||'')+' · '+F.scenes(it.text).length+' scenes</small></div><button class="btn sm'+(it.id===DB.cur?' pri':'')+'" data-shelf="'+esc(it.id)+'">'+(it.id===DB.cur?'OPEN':'USE')+'</button></div>').join('');
 }
 return h;
}
function wayOf(n){ return (cur().scenes&&cur().scenes[n]&&cur().scenes[n].way)||''; }
function whereName(n){ const s=cur().scenes&&cur().scenes[n]; const o=s&&s.where&&owned().find(x=>x.id===s.where); return o?o.name:''; }
function doneOf(sc){ const s=cur().scenes&&cur().scenes[sc.n]; if(!s||!s.way) return null; const L=F.shots(sc,s.way,cur().me,s.ins); return {d:L.filter(x=>s.done&&s.done[x.id]).length,t:L.length}; }
function vScenes(){
 return '<p class="kicker">Tap a scene to pick how you\'ll make it</p>'+SCENES.map(sc=>{
  const w=wayOf(sc.n), wn=w?F.WAYS.find(x=>x.id===w).name:'', where=whereName(sc.n), dn=doneOf(sc);
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
 const seen=F.seen(sc);
 if(seen.length>1){
  h+='<p class="kicker">How do you make it alone?</p><div class="ways">'+F.WAYS.map(w=>'<button class="way'+(s.way===w.id?' on':'')+'" data-way="'+w.id+'"><b>'+w.name+'</b><span>'+esc(w.say)+'</span></button>').join('')+'</div>';
  if(s.way&&s.way!=='keep') h+='<p class="faint" style="font-size:13px">On camera: <b class="dim">'+esc(F.lead(sc,me))+'</b>'+(me&&seen.includes(me)?'':' (most lines; pick who you play on the SCRIPT tab)')+'.</p>';
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
 if(sc.props.length) bits.push('<p class="kicker" style="margin:12px 0 6px">In the action · tap for an insert</p><div class="chips">'+sc.props.map(p=>'<button class="chip'+(ins.includes(p)?' on':'')+'" data-ins="'+esc(p)+'">'+esc(p)+'</button>').join('')+'</div>');
 if(mine.length) bits.push('<p class="kicker" style="margin:12px 0 6px">Yours, named in the scene</p><div class="chips">'+mine.map(o=>'<span class="tag on">'+esc(o.name)+'</span>').join('')+'</div>');
 if(sc.people.length) bits.push('<p class="kicker" style="margin:12px 0 6px">People in the action, no lines</p><div class="chips">'+sc.people.map(p=>'<span class="tag">'+esc(p)+'</span>').join('')+'</div><p class="faint" style="font-size:13px;margin:6px 0 0">A walk-by, a shoulder, or a sound. Not a cast.</p>');
 const L1=s.where&&owned().find(o=>o.id===s.where);
 bits.push('<p class="kicker" style="margin:12px 0 6px">Sound bed</p><div class="chips"><span class="tag on">room tone</span>'+sc.sound.map(p=>'<span class="tag">'+esc(p)+'</span>').join('')+(L1&&L1.sound?'<span class="tag warn">'+esc(L1.name)+': '+esc(L1.sound)+'</span>':'')+'</div>');
 h+=bits.join('');
 // shots
 if(s.way){
  const L=F.shots(sc,s.way,me,s.ins), d=L.filter(x=>s.done[x.id]).length;
  h+='<p class="kicker" style="margin-top:18px">Shots · '+d+' of '+L.length+'</p>'+L.map(x=>'<label class="shot'+(s.done[x.id]?' done':'')+'"><input type="checkbox" data-shot="'+esc(x.id)+'"'+(s.done[x.id]?' checked':'')+'><div><b>'+esc(x.what)+'</b>'+(x.how?'<small>'+esc(x.how)+'</small>':'')+'</div></label>').join('');
  if(s.way==='keep'&&seen.length>1) h+='<p class="faint" style="font-size:13px">Shoot every angle of one part, change wardrobe, then the next.</p>';
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
const KINDS=[['location','Locations','What it can play, e.g. bus shelter, motel lot'],['prop','Props',''],['wardrobe','Wardrobe',''],['gear','Gear','']];
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
 if(DB.owned===null||!owned().length){
  h+='<div class="card"><p class="kicker">What you own</p><p>Your locations, props, wardrobe and gear. Scenes get matched to them.</p>'
   +'<button class="btn pri block" id="ranch">START FROM THE RANCH LIST</button><p class="faint" style="font-size:13px;margin:6px 0 10px">Barn, porch, creek, workshop, oak treeline, corral, fire pit, the pickup, the gear. 40 things. Edit or remove any.</p>'
   +'<button class="btn block ghost" id="empty">Start empty</button></div>';
  if(DB.owned===null) return h;
 }
 h+='<div class="card"><p class="kicker">Add</p><div class="row"><select class="field" id="okind" style="flex:1 1 120px">'+KINDS.map(k=>'<option value="'+k[0]+'">'+k[1]+'</option>').join('')+'</select>'
  +'<input class="field" id="oname" placeholder="Name" style="flex:2 1 180px"></div>'
  +'<input class="field" id="oplays" placeholder="Can play (locations): bus shelter, motel lot…" style="margin-top:8px">'
  +'<input class="field" id="onotes" placeholder="Notes" style="margin-top:8px"><button class="btn pri block" id="oadd" style="margin-top:8px">ADD</button></div>';
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
function vDay(){
 const c=cur();
 const B=dayBlocks();
 let h='<p class="kicker">Shoot day</p><p class="dim" style="font-size:14px;margin:-2px 0 10px">Same place together, then same time of day, then same wardrobe. Inside each: every angle of one part before you change clothes. Inserts and room tone last.</p>'
  +'<div class="row" style="margin-bottom:14px"><label class="faint" style="font-size:13px">Shooting on</label><input type="date" class="field" id="daydate" value="'+esc(c.dayDate||'')+'" style="flex:0 1 180px"></div>';
 B.forEach((b,i)=>{
  h+='<div class="blk'+(b.set?'':' unset')+'"><h3>'+(i+1)+'. '+esc(b.where)+(b.tod?' · '+esc(b.tod):'')+'</h3>'+(b.set?'':'<div class="faint" style="font-size:13px">Where you\'ll shoot this isn\'t picked yet.</div>')
   +(()=>{ const it0=b.items[0], s0=it0&&(c.scenes||{})[it0.scene.n], o0=s0&&s0.where&&owned().find(x=>x.id===s0.where), sn=sunOf(o0); return sn?'<div class="faint" style="font-size:13px;margin:2px 0 6px">Sun'+(c.dayDate?'':' (today; set the date above)')+': '+esc(F.sunFor(b.tod,sn))+'</div>':''; })()
   +b.items.map(x=>{ const dn=doneOf(x.scene); return '<div class="it"><b>Scene '+x.scene.n+'</b> <small>'+esc(x.scene.heading)+'</small><br><small>'+(x.way?esc(F.WAYS.find(w=>w.id===x.way).name)+' · ':'Way not picked · ')+'on camera: '+esc(x.who.join(', ')||'nobody')+(x.wardrobe?' · '+esc(x.wardrobe):'')+(dn?' · '+dn.d+' of '+dn.t+' shot':'')+'</small></div>'; }).join('')+'</div>';
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
function vCut(){
 const k=cutOf(), P=pieces(), len=F.cutLength(P), diff=k.target-len;
 let h='<p class="kicker">Cut to length</p><p class="dim" style="font-size:14px;margin:-2px 0 12px">Add the takes you shot, keep the one you want for each scene, set where it starts and ends. They line up in script order. Then hand the list to your editor.</p>';
 h+='<div class="card"><div class="row"><label class="faint" style="font-size:13px">Aim for</label><input class="field" id="ctarget" value="'+esc(F.mmss(k.target))+'" style="flex:0 1 90px"><label class="faint" style="font-size:13px">Frame rate</label><select class="field" id="cfps" style="flex:0 1 110px">'+Object.keys(F.FPS).map(x=>'<option'+(x===k.fps?' selected':'')+'>'+x+'</option>').join('')+'</select></div>'
  +'<div class="runtime"><b>'+F.mmss(len)+'</b><span>'+(P.length?(Math.abs(diff)<0.05?'right on '+F.mmss(k.target):diff>0?F.mmss(diff)+' to go to '+F.mmss(k.target):F.mmss(-diff)+' over '+F.mmss(k.target)):'nothing in the cut yet')+' · '+P.length+' piece'+(P.length===1?'':'s')+'</span></div></div>';
 h+='<div class="card"><p class="kicker">Find a take</p><input class="field" id="cfind" placeholder="bus shelter · rennie · last week · the laugh · never use" value="'+esc(FINDQ)+'" autocomplete="off"><div id="cfindres">'+findHtml()+'</div></div>';
 h+=footBox();
 SCENES.forEach(sc=>{
  const T=k.takes[sc.n]||[];
  h+='<div class="card"><div class="hd" style="font:700 14px/1.35 var(--mono)">'+sc.n+'. '+esc(sc.heading)+'</div>';
  h+=T.map(t=>{ const f=FILES[t.id];
   return '<div class="take'+(t.use?' on':'')+(t.mark==='never'?' never':'')+'" data-trow="'+sc.n+'|'+t.id+'"><div class="row" style="justify-content:space-between"><label class="row" style="gap:8px"><input type="checkbox" data-tuse="'+sc.n+'|'+t.id+'"'+(t.use?' checked':'')+(t.mark==='never'?' disabled':'')+'><b style="font-size:14px;word-break:break-all">'+esc(t.name)+'</b></label><span class="faint" style="font-size:13px">'+(t.dur?F.mmss(t.dur):'length?')+'</span><select class="field mark" data-tmark="'+sc.n+'|'+t.id+'" aria-label="Mark this take">'+[['','—'],['backup','backup'],['never','never use']].map(o=>'<option value="'+o[0]+'"'+((t.mark||'')===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select><button class="x" data-tdel="'+sc.n+'|'+t.id+'" aria-label="Remove">×</button></div>'
    +(f?'<video class="tprev" data-tvid="'+t.id+'" playsinline controls preload="metadata"></video>':'')
    +'<div class="row" style="margin-top:6px"><label class="faint" style="font-size:12px">In</label><input class="field" data-tin="'+sc.n+'|'+t.id+'" value="'+F.mmss(t.in)+'" style="flex:1 1 70px">'+(f?'<button class="btn sm" data-tsetin="'+sc.n+'|'+t.id+'">HERE</button>':'')
    +'<label class="faint" style="font-size:12px">Out</label><input class="field" data-tout="'+sc.n+'|'+t.id+'" value="'+F.mmss(t.out)+'" style="flex:1 1 70px">'+(f?'<button class="btn sm" data-tsetout="'+sc.n+'|'+t.id+'">HERE</button>':'')+'</div>'
    +'<input class="field tnote" data-tnote="'+sc.n+'|'+t.id+'" value="'+esc(t.note||'')+'" placeholder="A note you\'ll remember it by (the one where he laughs)">'
    +F.watchNotes(t).map(w=>'<div class="wnote"><span><b>'+F.mmss(w.at)+'</b> in the take'+(w.cut!=null?' · '+F.mmss(w.cut)+' in the cut':'')+': '+esc(w.text)+'</span><button class="x" data-wdel="'+sc.n+'|'+t.id+'|'+w.id+'" aria-label="Delete this note">×</button></div>').join('')
    +'<div class="row" style="justify-content:space-between;margin-top:4px"><span class="faint" style="font-size:12px">'+F.mmss(Math.max(0,t.out-t.in))+' used'+(f?'':' · pick the file again to preview it')+(adrKept(t)?' · <b class="adrtag">ADR</b> your line replaces it, original '+UNDERS.find(u=>u[1]===t.adr.under)[0].toLowerCase():'')+'</span>'+(f?'<button class="btn sm" data-adr="'+sc.n+'|'+t.id+'">ADR</button>':'')+'</div></div>'; }).join('');
  h+='<label class="btn sm block" style="margin-top:8px"><input type="file" accept="video/*,.mov,.mp4,.m4v" multiple class="hide" data-tadd="'+sc.n+'">+ ADD TAKES</label>'+briefBox(sc)+'</div>';
 });
 h+='<div class="card"><p class="kicker">Hand it to your editor</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">An EDL opens in DaVinci Resolve, Premiere and Avid. Point it at your footage and it relinks by file name. In and out count from the start of each file.</p>'
  +'<div class="row"><button class="btn pri" id="cedl"'+(P.length?'':' disabled')+'>EDIT LIST (.EDL)</button><button class="btn" id="ccsv"'+(P.length?'':' disabled')+'>LIST (.CSV)</button><button class="btn" id="cbrief">EDITOR BRIEF (.TXT)</button></div>'
  +watchBox(P)+creditsBox()
  +'<p class="faint" style="font-size:13px;margin:8px 0 0">The brief says, scene by scene, how much freedom the editor has, what must stay, which take to use, backups, never-use takes, what is missing and when to ask you first.</p></div>';
 return h;
}
let FINDQ='';
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
function wireCut(){
 const k=cutOf(); const findT=v=>{ const [n,id]=v.split('|'); return {n:+n,t:(k.takes[n]||[]).find(x=>x.id===id)}; };
 const tg=$('ctarget'); if(tg) tg.onchange=()=>{ const s=F.secs(tg.value); if(s!=null&&s>0){ k.target=s; save(); } render(); };
 const fp=$('cfps'); if(fp) fp.onchange=()=>{ k.fps=fp.value; save(); };
 document.querySelectorAll('[data-tadd]').forEach(i=>i.onchange=async()=>{ const n=+i.dataset.tadd; const fl=[...i.files]; if(!fl.length) return; k.takes[n]=k.takes[n]||[];
   for(const f of fl){ const ex=k.takes[n].find(x=>x.name===f.name&&x.size===f.size); const id=ex?ex.id:rid('t'); FILES[id]=f; if(ex) continue;
    const d=await clipLength(f); k.takes[n].push({id:id,name:f.name,size:f.size,dur:Math.round(d*100)/100,in:0,out:Math.round(d*100)/100,use:!k.takes[n].some(x=>x.use),at:Date.now()}); }
   save(); render(); toast(fl.length+' take'+(fl.length===1?'':'s')+' added to scene '+n+'.'); });
 document.querySelectorAll('[data-tuse]').forEach(b=>b.onchange=()=>{ const r=findT(b.dataset.tuse); if(!r.t) return; r.t.use=b.checked; save(); render(); });
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
 document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{ OPEN=Number(b.dataset.scene); render(); });
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
 const ra=$('ranch'); if(ra) ra.onclick=()=>{ DB.owned=(DB.owned||[]).concat(F.RANCH.map(o=>Object.assign({id:rid('o')},o))); save(); render(); toast('The ranch list is in. 40 things.'); };
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
 if(TAB==='cut') wireCut();
 fillPhotos();
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&MC.stream) mcClose(); if(document.hidden&&ADRREC) adrStopRec(); });
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ TAB=b.dataset.t; if(TAB!=='scenes') OPEN=null; OEDIT=null; render(); });
$('file').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(f) readFile(f); });
window.addEventListener('storage',e=>{ if(e.key&&/shelf/.test(e.key)){ const p=SH&&SH.pending(TOOL); if(p){ adopt(); render(); } } });

adopt(); if(cur()&&TAB==='script'&&SCENES.length) TAB='scenes';
render();
window.__film={DB:()=>DB,SCENES:()=>SCENES};
})();
