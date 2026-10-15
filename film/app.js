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
function fdx(xml){
 const out=[]; const P=/<Paragraph[^>]*Type="([^"]*)"[^>]*>([\s\S]*?)<\/Paragraph>/gi; let m;
 while((m=P.exec(xml))){
  const type=m[1], txt=[...m[2].matchAll(/<Text[^>]*>([\s\S]*?)<\/Text>/gi)].map(x=>x[1].replace(/<[^>]+>/g,'')).join('')
   .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
  if(!txt) continue;
  if(/Scene Heading/i.test(type)) out.push('',txt.toUpperCase(),'');
  else if(/Character/i.test(type)) out.push('',txt.toUpperCase());
  else if(/Action|Transition|General/i.test(type)) out.push('',txt,'');
  else out.push(txt);
 }
 return out.join('\n');
}
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
    +(pp?'<div><label>Match this: scene '+pp.n+'</label><img data-photo="'+esc(pp.photo)+'" class="cph"></div>':'')+'</div></div>';
  });
 }
 // the scene itself
 h+='<details style="margin-top:16px"><summary>Read the scene</summary><div class="read">'+sc.beats.map(b=>b.action?esc(b.text):'<span class="who">'+esc(b.who)+'</span>\n'+esc(b.text)).join('\n\n')+'</div></details>';
 return h;
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
function vDay(){
 const c=cur();
 const list=SCENES.map(sc=>{ const s=(c.scenes||{})[sc.n]||{}; const o=s.where&&owned().find(x=>x.id===s.where);
  const way=s.way||'', who=way?F.onCamera(sc,way,c.me):F.seen(sc);
  const wd=who.map(w=>(s.cont&&s.cont[w]&&s.cont[w].wardrobe)?w+': '+s.cont[w].wardrobe:'').filter(Boolean).join(' · ');
  return {scene:sc,where:o?o.name:(sc.place||'No place'),set:!!o,wardrobe:wd,way:way,who:who}; });
 const B=F.day(list);
 let h='<p class="kicker">Shoot day</p><p class="dim" style="font-size:14px;margin:-2px 0 10px">Same place together, then same time of day, then same wardrobe. Inside each: every angle of one part before you change clothes. Inserts and room tone last.</p>'
  +'<div class="row" style="margin-bottom:14px"><label class="faint" style="font-size:13px">Shooting on</label><input type="date" class="field" id="daydate" value="'+esc(c.dayDate||'')+'" style="flex:0 1 180px"></div>';
 B.forEach((b,i)=>{
  h+='<div class="blk'+(b.set?'':' unset')+'"><h3>'+(i+1)+'. '+esc(b.where)+(b.tod?' · '+esc(b.tod):'')+'</h3>'+(b.set?'':'<div class="faint" style="font-size:13px">Where you\'ll shoot this isn\'t picked yet.</div>')
   +(()=>{ const it0=b.items[0], s0=it0&&(c.scenes||{})[it0.scene.n], o0=s0&&s0.where&&owned().find(x=>x.id===s0.where), sn=sunOf(o0); return sn?'<div class="faint" style="font-size:13px;margin:2px 0 6px">Sun'+(c.dayDate?'':' (today; set the date above)')+': '+esc(F.sunFor(b.tod,sn))+'</div>':''; })()
   +b.items.map(x=>{ const dn=doneOf(x.scene); return '<div class="it"><b>Scene '+x.scene.n+'</b> <small>'+esc(x.scene.heading)+'</small><br><small>'+(x.way?esc(F.WAYS.find(w=>w.id===x.way).name)+' · ':'Way not picked · ')+'on camera: '+esc(x.who.join(', ')||'nobody')+(x.wardrobe?' · '+esc(x.wardrobe):'')+(dn?' · '+dn.d+' of '+dn.t+' shot':'')+'</small></div>'; }).join('')+'</div>';
 });
 return h;
}

/* ---------- cut to length ---------- */
const FILES={};   // the clip files picked this session, for the preview; only names and lengths are kept
function cutOf(){ const c=cur(); c.cut=c.cut||{target:300,fps:'30',takes:{}}; return c.cut; }
function pieces(){ const k=cutOf(); const out=[]; SCENES.forEach(sc=>(k.takes[sc.n]||[]).forEach(t=>{ if(t.use&&t.out>t.in) out.push({scene:sc.n,heading:sc.heading,name:t.name,in:t.in,out:t.out,id:t.id}); })); return out; }
function vCut(){
 const k=cutOf(), P=pieces(), len=F.cutLength(P), diff=k.target-len;
 let h='<p class="kicker">Cut to length</p><p class="dim" style="font-size:14px;margin:-2px 0 12px">Add the takes you shot, keep the one you want for each scene, set where it starts and ends. They line up in script order. Then hand the list to your editor.</p>';
 h+='<div class="card"><div class="row"><label class="faint" style="font-size:13px">Aim for</label><input class="field" id="ctarget" value="'+esc(F.mmss(k.target))+'" style="flex:0 1 90px"><label class="faint" style="font-size:13px">Frame rate</label><select class="field" id="cfps" style="flex:0 1 110px">'+Object.keys(F.FPS).map(x=>'<option'+(x===k.fps?' selected':'')+'>'+x+'</option>').join('')+'</select></div>'
  +'<div class="runtime"><b>'+F.mmss(len)+'</b><span>'+(P.length?(Math.abs(diff)<0.05?'right on '+F.mmss(k.target):diff>0?F.mmss(diff)+' to go to '+F.mmss(k.target):F.mmss(-diff)+' over '+F.mmss(k.target)):'nothing in the cut yet')+' · '+P.length+' piece'+(P.length===1?'':'s')+'</span></div></div>';
 SCENES.forEach(sc=>{
  const T=k.takes[sc.n]||[];
  h+='<div class="card"><div class="hd" style="font:700 14px/1.35 var(--mono)">'+sc.n+'. '+esc(sc.heading)+'</div>';
  h+=T.map(t=>{ const f=FILES[t.id];
   return '<div class="take'+(t.use?' on':'')+'"><div class="row" style="justify-content:space-between"><label class="row" style="gap:8px"><input type="checkbox" data-tuse="'+sc.n+'|'+t.id+'"'+(t.use?' checked':'')+'><b style="font-size:14px;word-break:break-all">'+esc(t.name)+'</b></label><span class="faint" style="font-size:13px">'+(t.dur?F.mmss(t.dur):'length?')+'</span><button class="x" data-tdel="'+sc.n+'|'+t.id+'" aria-label="Remove">×</button></div>'
    +(f?'<video class="tprev" data-tvid="'+t.id+'" playsinline controls preload="metadata"></video>':'')
    +'<div class="row" style="margin-top:6px"><label class="faint" style="font-size:12px">In</label><input class="field" data-tin="'+sc.n+'|'+t.id+'" value="'+F.mmss(t.in)+'" style="flex:1 1 70px">'+(f?'<button class="btn sm" data-tsetin="'+sc.n+'|'+t.id+'">HERE</button>':'')
    +'<label class="faint" style="font-size:12px">Out</label><input class="field" data-tout="'+sc.n+'|'+t.id+'" value="'+F.mmss(t.out)+'" style="flex:1 1 70px">'+(f?'<button class="btn sm" data-tsetout="'+sc.n+'|'+t.id+'">HERE</button>':'')+'</div>'
    +'<div class="faint" style="font-size:12px;margin-top:4px">'+F.mmss(Math.max(0,t.out-t.in))+' used'+(f?'':' · pick the file again to preview it')+'</div></div>'; }).join('');
  h+='<label class="btn sm block" style="margin-top:8px"><input type="file" accept="video/*,.mov,.mp4,.m4v" multiple class="hide" data-tadd="'+sc.n+'">+ ADD TAKES</label></div>';
 });
 h+='<div class="card"><p class="kicker">Hand it to your editor</p><p class="faint" style="font-size:13px;margin:-4px 0 8px">An EDL opens in DaVinci Resolve, Premiere and Avid. Point it at your footage and it relinks by file name. In and out count from the start of each file.</p>'
  +'<div class="row"><button class="btn pri" id="cedl"'+(P.length?'':' disabled')+'>EDIT LIST (.EDL)</button><button class="btn" id="ccsv"'+(P.length?'':' disabled')+'>LIST (.CSV)</button></div></div>';
 return h;
}
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
    const d=await clipLength(f); k.takes[n].push({id:id,name:f.name,size:f.size,dur:Math.round(d*100)/100,in:0,out:Math.round(d*100)/100,use:!k.takes[n].some(x=>x.use)}); }
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
 document.querySelectorAll('[data-cphoto]').forEach(i=>i.onchange=async()=>{ const f=i.files[0]; if(!f) return; const w=i.dataset.cphoto, s=st(OPEN); s.cont[w]=s.cont[w]||{};
   const pid=rid('ph'); if(!(await putPhoto(pid,await shrink(f)))){ toast('This phone would not keep the photo.'); return; }
   const old=s.cont[w].photo; s.cont[w].photo=pid; s.contAt=Date.now(); save();
   if(old&&!Object.values(DB.scripts).some(c=>Object.values(c.scenes||{}).some(x=>Object.values(x.cont||{}).some(v=>v.photo===old)))) delPhoto(old);
   render(); toast(w+': photo kept for scene '+OPEN+'.'); });
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
 if(TAB==='cut') wireCut();
 fillPhotos();
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ TAB=b.dataset.t; if(TAB!=='scenes') OPEN=null; OEDIT=null; render(); });
$('file').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(f) readFile(f); });
window.addEventListener('storage',e=>{ if(e.key&&/shelf/.test(e.key)){ const p=SH&&SH.pending(TOOL); if(p){ adopt(); render(); } } });

adopt(); if(cur()&&TAB==='script'&&SCENES.length) TAB='scenes';
render();
window.__film={DB:()=>DB,SCENES:()=>SCENES};
})();
