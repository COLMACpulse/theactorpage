/* PAPER TRAIL app. Everything stays on this device.
   localStorage 'paper_trail_v1': projects, draft details, your scene cards.
   IndexedDB 'paper_trail' / 'texts': the text of every draft (a feature is big).
   Nothing is overwritten: a draft is never replaced, only added, made current, moved or retired. */
(function(){
const T=window.PaperTrail, F=window.FilmOS, SH=window.Shelf;
const KEY='paper_trail_v1', TOOL='papertrail', HAND='theactorpage_handoff_trail';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const day=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const perf=()=>'<div class="perf">'+'<i></i>'.repeat(11)+'</div>';

let DB=load(); DB.marks=DB.marks||{};
let READER=(()=>{ try{ return localStorage.getItem('paper_trail_reader')||''; }catch(e){ return ''; } })();
let SR=window.SpeechRecognition||window.webkitSpeechRecognition||null, REC=null, LISTEN=false, SAID=false;
let TEXT={}, VIEW={tab:'projects',p:null,scene:null}, MSG='', ADDED=[], SHOWRET=false;
const CACHE={};   // draft id -> scenes
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.projects) return d; }catch(e){} return {projects:{},drafts:{}}; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); }catch(e){ toast('This device would not save. Export a copy.'); } }
let tt; function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),2800); }

/* ---------- texts in IndexedDB ---------- */
let _db=null;
function idb(){ if(_db) return Promise.resolve(_db); return new Promise(res=>{ try{ const r=indexedDB.open('paper_trail',2);
 r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains('texts')) d.createObjectStore('texts'); if(!d.objectStoreNames.contains('research')) d.createObjectStore('research'); };
 r.onsuccess=()=>{ _db=r.result; _db.onversionchange=()=>{ try{ _db.close(); }catch(e){} _db=null; }; res(_db); }; r.onerror=()=>res(null); r.onblocked=()=>res(null); }catch(e){ res(null); } }); }
/* research files: photos, memos, PDFs. Kept here, in the On This Device backup, never uploaded */
async function putBlob(id,b){ const d=await idb(); if(!d) return false; return new Promise(res=>{ const x=d.transaction('research','readwrite'); x.objectStore('research').put(b,id); x.oncomplete=()=>res(true); x.onerror=()=>res(false); x.onabort=()=>res(false); }); }
async function getBlob(id){ const d=await idb(); if(!d) return null; return new Promise(res=>{ const r=d.transaction('research','readonly').objectStore('research').get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }
async function delBlob(id){ const d=await idb(); if(!d) return; return new Promise(res=>{ const x=d.transaction('research','readwrite'); x.objectStore('research').delete(id); x.oncomplete=()=>res(); x.onerror=()=>res(); }); }
const URLS={};
async function urlOf(id){ if(URLS[id]) return URLS[id]; const b=await getBlob(id); if(!b) return ''; URLS[id]=URL.createObjectURL(b); return URLS[id]; }
async function putText(id,t){ TEXT[id]=t; const d=await idb(); if(!d) return false; return new Promise(res=>{ const x=d.transaction('texts','readwrite'); x.objectStore('texts').put(t,id); x.oncomplete=()=>res(true); x.onerror=()=>res(false); }); }
async function loadTexts(){ const d=await idb(); if(!d) return; await new Promise(res=>{ const x=d.transaction('texts','readonly').objectStore('texts').openCursor(); x.onsuccess=e=>{ const c=e.target.result; if(c){ TEXT[c.key]=c.value; c.continue(); } else res(); }; x.onerror=()=>res(); }); }

/* ---------- helpers ---------- */
const projects=()=>Object.values(DB.projects).filter(p=>SHOWRET||!p.retired).sort((a,b)=>(b.updated||0)-(a.updated||0));
const draftsOf=pid=>Object.values(DB.drafts).filter(d=>d.project===pid&&(SHOWRET||!d.retired)).sort((a,b)=>a.added-b.added);
const filesOf=d=>[d.file].concat(d.also||[]).join(' + ');
function scenesOf(d){ if(!d) return []; if(!CACHE[d.id]) CACHE[d.id]=T.scenes(TEXT[d.id]||'',d.kind); return CACHE[d.id]; }
function current(p){ const ds=draftsOf(p.id).filter(d=>d.kind==='script'&&!d.retired); return DB.drafts[p.current]&&!DB.drafts[p.current].retired&&DB.drafts[p.current].kind==='script'?DB.drafts[p.current]:ds[ds.length-1]||null; }
function board(p){ const b=draftsOf(p.id).filter(d=>d.kind==='storyboard'&&!d.retired); return b[b.length-1]||null; }
function card(p,key){ p.cards=p.cards||{}; p.cards[key]=p.cards[key]||{purpose:'',notes:'',fx:'',cast:[],props:[],decisions:[]}; return p.cards[key]; }
async function sha(t){ try{ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(t).replace(/\s+/g,' ').trim())); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }catch(e){ return 'h'+T.hashText(t); } }
/* storyboard scene that goes with a script scene: same heading, same turn */
function sbFor(p,sc,i,keys){ const b=board(p); if(!b) return null; const sb=scenesOf(b), kb=T.keys(sb), k=keys[i]; const j=kb.indexOf(k); return j>=0?sb[j]:null; }
/* what Story Studio has for this scene, if you sent this draft there */
function studioFor(d,sc){
 try{ if(!d||!d.shelfId) return null; const S=JSON.parse(localStorage.getItem('film_os_v1')||'null'); const c=S&&S.scripts&&S.scripts[d.shelfId]; if(!c) return null;
  const st=c.scenes&&c.scenes[sc.n]; if(!st||!st.way) return {way:''};
  const fsc=F.scenes(c.text||TEXT[d.id]||'')[sc.n-1]; const L=fsc?F.shots(fsc,st.way,c.me,st.ins):[];
  return {way:(F.WAYS.find(w=>w.id===st.way)||{}).name||st.way,done:L.filter(x=>st.done&&st.done[x.id]).length,total:L.length};
 }catch(e){ return null; }
}

/* ---------- bringing drafts in ---------- */
async function addDraft(text,fileName,source,opts){
 opts=opts||{};
 text=String(text||'');
 if(!text.trim()) return {skip:fileName+': no text in it.'};
 const kind=T.kind(fileName,text);
 const sc=T.scenes(text,kind);
 if(!sc.length) return {skip:fileName+': not a script or a storyboard (no scene headings found).'};
 const h=await sha(text);
 const dup=Object.values(DB.drafts).find(d=>d.hash===h);
 if(dup) return {skip:fileName+': the same draft is already here ('+DB.projects[dup.project].title+(dup.label?', '+dup.label:'')+'). Copies are kept once.'};
 const title=opts.title||T.titleFrom(text,fileName);
 let p=Object.values(DB.projects).find(x=>T.sameTitle(x.title,title));
 let isNew=false;
 if(p){ const twin=draftsOf(p.id).find(x=>x.kind===kind&&T.sameDraft(scenesOf(x),sc));
  if(twin){ const f=String(fileName); if(f!==twin.file&&!(twin.also||[]).includes(f)){ twin.also=(twin.also||[]).concat(f); p.updated=Date.now(); save(); }
   return {skip:fileName+': the same draft as '+p.title+', '+twin.label+', in another format. Kept once, with both files listed on it.'}; } }
 if(!p){ p={id:rid('p'),title:title,created:Date.now(),updated:Date.now(),current:'',pinned:false,cards:{}}; DB.projects[p.id]=p; isNew=true; }
 const d={id:rid('d'),project:p.id,label:opts.label||T.draftLabel(fileName,text)||('Draft '+(draftsOf(p.id).filter(x=>x.kind===kind).length+1)),file:fileName,kind:kind,source:source,added:Date.now(),hash:h,
   words:(text.match(/\S+/g)||[]).length,scenes:sc.length,shelfId:opts.shelfId||''};
 DB.drafts[d.id]=d; await putText(d.id,text); CACHE[d.id]=sc;
 if(kind==='script'&&!p.pinned) p.current=d.id;
 p.updated=Date.now(); save();
 return {ok:true,p:p,d:d,isNew:isNew};
}
async function readFile(f){
 const name=f.name||'file';
 if(/\.pdf$/i.test(name)||f.type==='application/pdf'){
  const ex=await window.ActorPDF.extract(await f.arrayBuffer());
  if(ex.encrypted&&!ex.chars) throw new Error('that PDF is protected; open it, copy the text and paste it');
  if(!ex.chars) throw new Error('no text in that PDF (pictures of pages); paste the text instead');
  if(/storyboard|board/i.test(name)) return ex.lines.map(l=>l.text).join('\n');
  return window.ActorPDF.toSides(ex.lines);
 }
 if(/\.docx$/i.test(name)) return await docxText(await f.arrayBuffer());
 const t=await f.text();
 if(/^\s*<\?xml|<FinalDraft/i.test(t)) return fdx(t);
 return t;
}
async function addFiles(files){
 MSG=''; ADDED=[];
 for(const f of files){
  try{ const t=await readFile(f); const r=await addDraft(t,f.name,'file'); ADDED.push(r); }
  catch(e){ ADDED.push({skip:f.name+': '+e.message}); }
 }
 render();
}
/* Final Draft: paragraphs by type */
function fdx(xml){ return window.ActorSides.fromFdx(xml); }   // one Final Draft reader, in ../actor-os/sides.js
/* Word .docx: a zip; the text is word/document.xml. No library: the browser inflates it. */
async function docxText(buf){
 const u=new Uint8Array(buf), v=new DataView(buf);
 let e=-1; for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--){ if(v.getUint32(i,true)===0x06054b50){ e=i; break; } }
 if(e<0) throw new Error('not a Word file');
 let n=v.getUint16(e+10,true), off=v.getUint32(e+16,true), xml=null;
 for(let k=0;k<n;k++){
  if(v.getUint32(off,true)!==0x02014b50) break;
  const method=v.getUint16(off+10,true), csize=v.getUint32(off+20,true), nl=v.getUint16(off+28,true), el=v.getUint16(off+30,true), cl=v.getUint16(off+32,true), lho=v.getUint32(off+42,true);
  const name=new TextDecoder().decode(u.slice(off+46,off+46+nl));
  if(name==='word/document.xml'){
   const lnl=v.getUint16(lho+26,true), lel=v.getUint16(lho+28,true), start=lho+30+lnl+lel, data=u.slice(start,start+csize);
   if(method===0) xml=new TextDecoder().decode(data);
   else { const ds=new DecompressionStream('deflate-raw'); const out=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer(); xml=new TextDecoder().decode(out); }
   break;
  }
  off+=46+nl+el+cl;
 }
 if(!xml) throw new Error('no document inside that Word file');
 return xml.replace(/<w:tab\/>/g,'\t').replace(/<\/w:p>/g,'\n').replace(/<w:br[^>]*\/>/g,'\n').replace(/<[^>]+>/g,'')
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\n{3,}/g,'\n\n');
}

/* ---------- views ---------- */
/* the tabs, in three rooms: never more than a handful in sight */
const GROUPS=[['all','Across projects',[['allchars','All characters'],['voice','Sounds like you'],['allsent','All sent out']]],
 ['script','The script',[['scenes','Scenes'],['read','Table read'],['characters','Characters'],['threads','Setups']]],
 ['work','The work',[['bones','Boneyard'],['research','Research'],['drafts','Drafts']]],
 ['send','Send it',[['package','Package'],['sent','Sent out']]]];
let LASTIN={};
const groupOf=t=>(GROUPS.find(g=>g[2].some(x=>x[0]===t))||[])[0]||'';
function tabs(){
 const p=VIEW.p&&DB.projects[VIEW.p], gNow=groupOf(VIEW.tab); if(gNow) LASTIN[gNow]=VIEW.tab;
 const btn=(k,l)=>'<button data-tab="'+k+'" class="'+(VIEW.tab===k?'on':'')+'">'+l+'</button>';
 const grp=g=>'<button class="grp'+(gNow===g[0]?' on':'')+'" data-grp="'+g[0]+'" data-tabs="'+g[2].map(x=>x[0]).join(' ')+'">'+g[1]+'</button>';
 let h='<div class="trow">'+btn('projects','Projects')+btn('add','Add drafts')+grp(GROUPS[0])+'</div>';
 if(p) h+='<div class="trow tproj"><span class="tname">'+esc(p.title)+'</span>'+GROUPS.slice(1).map(grp).join('')+'</div>';
 const G=GROUPS.find(g=>g[0]===gNow);
 if(G&&(G[0]==='all'||p)) h+='<div class="trow tsub">'+G[2].map(([k,l])=>btn(k,l)).join('')+'</div>';
 $('tabs').innerHTML=h;
 $('tabs').querySelectorAll('[data-grp]').forEach(b=>b.onclick=()=>{ const G=GROUPS.find(g=>g[0]===b.dataset.grp); VIEW.char=null; go(LASTIN[G[0]]||G[2][0][0]); });
 $('crumb').innerHTML='<a data-go="projects">Paper Trail</a>'+(p?' &nbsp;/&nbsp; <a data-go="scenes">'+esc(p.title)+'</a>':'')+(VIEW.scene!=null&&p?' &nbsp;/&nbsp; scene':'');
}
function render(){
 tabs();
 const m=$('main'), p=VIEW.p&&DB.projects[VIEW.p];
 if(VIEW.tab==='add') m.innerHTML=vAdd();
 else if(VIEW.tab==='allchars') m.innerHTML=vAllChars();
 else if(VIEW.tab==='voice') m.innerHTML=vVoice();
 else if(VIEW.tab==='allsent') m.innerHTML=vAllSent();
 else if(!p||VIEW.tab==='projects') m.innerHTML=vProjects();
 else if(VIEW.tab==='scenes') m.innerHTML=VIEW.scene!=null?vScene(p,VIEW.scene):vScenes(p);
 else if(VIEW.tab==='drafts') m.innerHTML=vDrafts(p);
 else if(VIEW.tab==='characters') m.innerHTML=VIEW.char?vChar(p,VIEW.char):vChars(p);
 else if(VIEW.tab==='read') m.innerHTML=vRead(p);
 else if(VIEW.tab==='bones') m.innerHTML=vBones(p);
 else if(VIEW.tab==='threads') m.innerHTML=vThreads(p);
 else if(VIEW.tab==='research') m.innerHTML=vResearch(p);
 else if(VIEW.tab==='package') m.innerHTML=vPackage(p);
 else if(VIEW.tab==='sent') m.innerHTML=vSent(p);
 wire();
}
/* ---------- the front: speech, mic and camera, as tiles, before you go looking ---------- */
/* the project they land in: the one you have open, or the one you touched last */
function kitProject(){ const o=VIEW.p&&DB.projects[VIEW.p]; if(o&&!o.retired) return o; return Object.values(DB.projects).filter(p=>!p.retired).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]||null; }
function front(){
 if(!window.Kit) return '';
 const p=kitProject(), inP=p?'In: '+p.title:'Start a project first';
 return '<div class="ptkit">'+Kit.html([
  {id:'say',dev:'typewriter',label:'SAY IT',what:'Say it into the bones',note:!p?inP:!SR?'This browser can\'t do speech':inP+'. Speech goes via Google or Apple.',off:!p||!SR},
  {id:'rec',dev:'mic',label:'MIC',what:RECORDING?'Stop recording':'Record research',note:inP,off:!p},
  {id:'photo',dev:'photo',label:'PHOTO',what:'Photo for research',note:inP,off:!p}
 ])+'</div>';
}
function kitGo(tab,btn){
 const p=kitProject(); if(!p){ toast('Start a project first. Add a draft.'); return go('add'); }
 VIEW.p=p.id; go(tab); if(tab==='bones'&&!SR) return toast('This browser can\'t turn speech into words. Use the mic on your keyboard.');
 const b=$(btn); if(b){ b.scrollIntoView({block:'center'}); if(!(btn==='mic'&&LISTEN)&&!(btn==='rrec'&&RECORDING)) b.click(); }
}
function vProjects(){
 const P=projects(), nd=Object.values(DB.drafts).filter(d=>!d.retired).length;
 let h=front()+'<div class="stats"><div><b>'+P.length+'</b><span>projects</span></div><div><b>'+nd+'</b><span>drafts kept</span></div>'
  +'<div><b>'+P.reduce((n,p)=>n+scenesOf(current(p)).length,0)+'</b><span>scenes, current drafts</span></div></div>';
 if(!P.length) h+='<div class="panel"><p style="margin-top:0">Nothing here yet. Bring in a draft: a script (PDF, Final Draft, Fountain, text) or a storyboard (Word or PDF). Drafts with the same title land in the same project.</p><button class="btn pri" data-tab="add">ADD DRAFTS</button></div>';
 if(P.length){
  h+='<div class="row" style="margin-bottom:12px"><input class="field" id="gq" placeholder="Find anything: a line, a name, a note, a photo you pinned" value="'+esc(VIEW.gq||'')+'" style="flex:1"></div>';
  if((VIEW.gq||'').trim().length>1){ const R=searchAll(VIEW.gq);
   h+='<div class="panel"><div class="eyebrow" style="margin-top:0">'+R.length+' found</div><div class="list">'+(R.length?R.slice(0,80).map((r,i)=>'<div class="li"><div class="w">'+esc(r.text)+'<small>'+esc(r.pt+' · '+r.where)+'</small></div><button class="btn sm" data-hit="'+i+'">OPEN</button></div>').join(''):'<div class="li"><div class="w note">Nothing matches.</div></div>')+'</div>'+(R.length>80?'<p class="note">Showing the first 80. Add a word to narrow it.</p>':'')+'</div>';
   HITS=R; }
 }
 h+='<div class="grid">'+P.map(p=>{ const c=current(p), ds=draftsOf(p.id), b=board(p);
  return '<button class="frame" data-open="'+p.id+'">'+perf()+'<div class="fb"><div class="fk"><span>'+ds.length+' draft'+(ds.length===1?'':'s')+(b?' · storyboard':'')+'</span><span>'+(p.retired?'retired':esc(day(p.updated)))+'</span></div>'
   +'<div class="ft">'+esc(p.title)+'</div><div class="fl">'+(c?'Current: '+esc(c.label)+' · '+scenesOf(c).length+' scenes · '+c.words+' words':'No script draft yet')+'</div></div></button>'; }).join('')+'</div>';
 h+='<div class="eyebrow">Your copy</div><div class="row"><button class="btn ghost" id="exp">Export everything (.json)</button><button class="btn ghost" id="impb">Bring in an export</button><button class="btn ghost" id="proofall">Proof of every draft (.txt)</button>'
  +'<label class="note"><input type="checkbox" id="showret"'+(SHOWRET?' checked':'')+'> show retired</label></div>'
  +'<p class="note">Bringing in an export adds what you don\'t have. It never removes or replaces anything here.</p>';
 return h;
}
function ntAdded(r){ const p=r.p&&DB.projects[r.p.id]; if(!p||!(p.notThis||[]).length||r.d.kind!=='script') return ''; const n=ntHitsIn(p,DB.drafts[r.d.id]||r.d).filter(x=>x.hits.length); return n.length?'<small style="color:var(--grease)">Words from NOT THIS show up in this draft: '+n.map(x=>esc(x.f.text)).join('; ')+'. <a data-ntgo="'+esc(p.id)+'">SEE WHERE</a></small>':''; }
function vAdd(){
 let h='';
 if(ADDED.length) h+='<div class="panel"><div class="eyebrow" style="margin-top:0">Just now</div><div class="list">'+ADDED.map(r=>r.ok
  ?'<div class="li"><div class="w"><b>'+esc(r.p.title)+'</b> · '+esc(r.d.label)+' <span class="tag">'+r.d.kind+'</span><small>'+esc(r.d.file)+' · '+r.d.scenes+' scenes · '+(r.isNew?'new project':'added to the project')+'</small>'+ntAdded(r)+'</div><button class="btn sm" data-open="'+r.p.id+'">OPEN</button></div>'
  :'<div class="li"><div class="w" style="color:var(--grease)">'+esc(r.skip)+'</div></div>').join('')+'</div></div>';
 h+='<div class="drop" id="drop"><b>DROP DRAFTS</b><span class="note">Several at once is fine. PDF, Final Draft (.fdx), Fountain, text, Word (.docx storyboards). Nothing is uploaded.</span></div>';
 h+='<div class="eyebrow">Or paste</div><input class="field" id="ptitle" placeholder="Title (optional; read from the script if blank)"><textarea class="field" id="paste" style="margin-top:8px" placeholder="Paste a script or a storyboard"></textarea><div class="row" style="margin-top:8px"><button class="btn pri" id="readit">KEEP THIS DRAFT</button></div>';
 const L=SH?SH.all():[];
 if(L.length){
  h+='<div class="eyebrow">On your sides shelf</div><p class="note" style="margin-top:-4px">Anything you dropped in an ACT tool, Story Studio or Today\'s scene.</p><div class="list">'
   +L.map(it=>{ const have=Object.values(DB.drafts).some(d=>d.shelfId===it.id); return '<div class="li"><div class="w"><b>'+esc(SH.label(it))+'</b><small>'+esc(it.from||'')+'</small></div>'+(have?'<span class="tag ok">kept</span>':'<button class="btn sm" data-shelf="'+esc(it.id)+'">KEEP</button>')+'</div>'; }).join('')+'</div>';
 }
 return h;
}
function vScenes(p){
 const c=current(p), b=board(p);
 if(!c&&!b) return '<div class="panel">No drafts in this project. <button class="btn sm" data-tab="add">ADD DRAFTS</button></div>';
 const sc=c?scenesOf(c):scenesOf(b), keys=T.keys(sc);
 let h='<div class="stats"><div><b>'+sc.length+'</b><span>scenes</span></div><div><b>'+draftsOf(p.id).length+'</b><span>drafts</span></div>'
  +'<div><b>'+T.characters([{id:'x',scenes:sc}]).length+'</b><span>characters</span></div><div><b>'+Object.values(p.cards||{}).filter(x=>x.purpose).length+'</b><span>scenes with a purpose written</span></div></div>';
 h+='<p class="note">'+(c?'Reading the current draft: <b>'+esc(c.label)+'</b> ('+esc(c.file)+'). Change it on DRAFTS.':'No script yet: these are the storyboard\'s scenes.')+(b&&c?' Storyboard: '+esc(b.label)+'.':'')+'</p>';
 h+='<div class="grid">'+sc.map((s,i)=>{ const cd=(p.cards||{})[keys[i]]||{}, sb=c?sbFor(p,s,i,keys):null, M=T.missing(s,cd,c?sb:s,studioFor(c,s)).filter(x=>!(c?false:x.what==='Scene text'));
  const miss=M.filter(x=>!x.have).map(x=>x.what), cast=[...new Set([...(s.cast||[]),...((sb&&sb.cast)||[]),...(cd.cast||[])])];
  return '<button class="frame" data-scene="'+i+'">'+perf()+'<div class="fb"><div class="fk"><span>SC '+(s.num||s.n||i+1)+'</span><span>'+(s.tod||'')+'</span></div><div class="ft">'+esc(s.heading)+'</div>'
   +'<div class="fl">'+(cast.length?esc(cast.join(', ')):'No cast')+'</div>'+(cd.purpose?'<div class="fl" style="margin-top:4px">'+esc(cd.purpose)+'</div>':'')
   +(miss.length?'<div class="miss">Missing: '+esc(miss.join(', ').toLowerCase())+'</div>':'<div class="have">Everything on the list is here.</div>')+'</div></button>'; }).join('')+'</div>';
 return h;
}
function vScene(p,i){
 const c=current(p), b=board(p), base=c||b, sc=scenesOf(base), keys=T.keys(sc), s=sc[i]; if(!s){ VIEW.scene=null; return vScenes(p); }
 const cd=card(p,keys[i]), sb=c?sbFor(p,s,i,keys):s, st=studioFor(c,s);
 const cast=[...new Set([...(s.cast||[]),...((sb&&sb.cast)||[])])], props=[...new Set([...(s.props||[]),...((sb&&sb.props)||[])])];
 let h='<button class="btn ghost sm" data-back="1">‹ All scenes</button>';
 h+='<div class="panel" style="margin-top:12px">'+perf()+'<div class="fb" style="padding-left:0"><div class="fk"><span>SC '+(s.num||s.n||i+1)+' · '+esc(p.title)+'</span><span>'+(c?esc(c.label):'storyboard')+'</span></div><div class="ft" style="font-size:30px">'+esc(s.heading)+'</div></div></div>';
 h+='<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">';
 // left: the record
 h+='<div><div class="eyebrow" style="margin-top:0">What the scene is for</div><textarea class="field" data-card="purpose" placeholder="In your words: what this scene has to do. Nobody fills this in but you.">'+esc(cd.purpose)+'</textarea>';
 h+='<div class="eyebrow">Cast</div><div class="chips">'+cast.map(x=>'<span class="chip">'+esc(x)+'</span>').join('')+(cd.cast||[]).map((x,j)=>'<span class="chip" style="border-color:var(--gold)">'+esc(x)+' <a data-rm="cast" data-j="'+j+'">×</a></span>').join('')+'<button class="btn sm ghost" data-addto="cast">+ add</button></div>'
  +((s.voices||[]).length?'<p class="note">Voice only in the script: '+esc(s.voices.join(', '))+'</p>':'');
 h+='<div class="eyebrow">Props</div><div class="chips">'+props.map(x=>'<span class="chip">'+esc(x)+'</span>').join('')+(cd.props||[]).map((x,j)=>'<span class="chip" style="border-color:var(--gold)">'+esc(x)+' <a data-rm="props" data-j="'+j+'">×</a></span>').join('')+'<button class="btn sm ghost" data-addto="props">+ add</button></div>'
  +'<p class="note">Black: read from the files. Gold: you added it.</p>';
 h+='<div class="eyebrow">FX</div>'+(sb&&sb.fx?'<p style="margin:0 0 6px">'+esc(sb.fx)+' <span class="note">(storyboard)</span></p>':'')+'<input class="field" data-card="fx" value="'+esc(cd.fx)+'" placeholder="Effects, stunts, practical gags">';
 h+='<div class="eyebrow">Notes</div>'+(sb&&sb.notes?'<p style="margin:0 0 6px">'+esc(sb.notes)+' <span class="note">(storyboard)</span></p>':'')+'<textarea class="field" data-card="notes" placeholder="Your notes">'+esc(cd.notes)+'</textarea>';
 h+='<div class="eyebrow">Decisions</div><div class="list">'+(cd.decisions||[]).map(x=>'<div class="li"><div class="w">'+esc(x.text)+'<small>'+esc(day(x.at))+'</small></div></div>').join('')+'</div>'
  +'<div class="row" style="margin-top:8px"><input class="field" id="dec" placeholder="What you decided, e.g. cut the last two lines" style="flex:1"><button class="btn" id="decb">LOG IT</button></div><p class="note">Logged decisions stay. They are never edited after the fact.</p>'+threadBox(p,s,i,keys)+researchBox(p,keys[i])+'</div>';
 // right: on file / missing / drafts / story studio
 const M=T.missing(s,cd,sb,st);
 h+='<div><div class="eyebrow" style="margin-top:0">On file, and missing</div><div class="panel"><div class="hm">'+M.map(x=>'<i class="'+(x.have?'y':'n')+'">'+(x.have?'✓':'○')+'</i><div>'+esc(x.what)+(x.from?'<br><small>'+esc(x.from)+'</small>':'')+'</div>').join('')+'</div></div>';
 const ds=draftsOf(p.id).filter(d=>d.kind==='script');
 if(ds.length>1){
  const k=keys[i];
  h+='<div class="eyebrow">In each draft</div><div class="list">'+ds.map(d=>{ const S=scenesOf(d), K=T.keys(S), j=K.indexOf(k);
   const mine=j>=0?S[j]:null, same=mine&&T.hashText(mine.text)===T.hashText(s.text);
   return '<div class="li"><div class="w"><b>'+esc(d.label)+'</b>'+(d.id===(c&&c.id)?' <span class="tag cur">current</span>':'')+'<small>'+esc(filesOf(d))+'</small></div>'+(!mine?'<span class="tag red">not in it</span>':same?'<span class="tag">same</span>':'<span class="tag ok">different</span>')+'</div>'; }).join('')+'</div>';
 }
 if(c){
  const mc=T.markCounts(DB.marks[c.id])[keys[i]];
  h+='<div class="eyebrow">Table read</div><div class="panel">'+(mc?countLine(mc):'No marks on this draft yet.')+'<div class="row" style="margin-top:10px"><button class="btn sm" data-tab="read">MARK LINES</button><button class="btn sm ghost" data-vfrom="'+esc(p.id+'|'+i)+'">SOUNDS LIKE YOU?</button></div></div>';
 }
 if(c){
  h+='<div class="eyebrow">Story Studio</div><div class="panel">'+(st&&st.way?'<b>'+esc(st.way)+'</b> · '+st.done+' of '+st.total+' shots done':'Not in Story Studio yet.')
   +'<div class="row" style="margin-top:10px"><button class="btn" id="studio">'+(st?'OPEN IN STORY STUDIO':'SHOOT IT IN STORY STUDIO')+'</button></div><p class="note">Sends the current draft to the sides shelf and opens Story Studio on it.</p></div>';
 }
 if(s.text){
  const pv=c?prevScript(p,c):null, pS=pv?scenesOf(pv):null, pj=pS?T.keys(pS).indexOf(keys[i]):-1;
  if(pv&&pj>=0){
   const df=T.lineDiff(T.linesOf(pS[pj]),T.linesOf(s)), n=T.lineCounts(df);
   h+='<div class="eyebrow">Since '+esc(pv.label)+'</div><p class="note" style="margin-top:0">'+(n.added||n.cut?n.added+' line'+(n.added===1?'':'s')+' new or rewritten, '+n.cut+' cut. Marked * in the margin; cut lines struck through.':'Not a word changed.')+'</p>';
   h+='<div class="read rev">'+df.map(x=>'<div class="rl '+x.t+'"><span class="rmk">'+(x.t==='new'?'*':x.t==='cut'?'–':'')+'</span>'+esc(x.text)+'</div>').join('')+'</div>';
  } else h+='<details><summary class="eyebrow" style="cursor:pointer">Read the scene</summary><div class="read">'+esc(s.text)+'</div></details>'+(pv?'<p class="note">New in this draft: not in '+esc(pv.label)+'.</p>':'');
 }
 h+='</div></div>';
 const nt=(p.notThis||[]).map(f=>({f,hits:T.ntHits(f,[s])})).filter(x=>x.hits.length);
 if(c&&nt.length) h+='<div class="panel"><div class="eyebrow" style="margin-top:0">Words from NOT THIS on this page</div>'+nt.map(({f,hits})=>'<p class="note" style="margin:4px 0"><b>'+esc(f.text)+'</b>: '+hits.slice(0,3).map(x=>'\u201c'+esc(x.line)+'\u201d').join(' ')+'</p>').join('')+'<button class="btn sm ghost" data-tab="threads">SEE NOT THIS</button></div>';
 return h;
}
function countLine(c){ return c.landed+' landed, '+c.lost+' lost me, '+c.confused+' confused · '+c.readers.length+' reader'+(c.readers.length===1?'':'s'); }
function prevScript(p,d){ const ds=draftsOf(p.id).filter(x=>x.kind==='script'&&!x.retired); const j=ds.findIndex(x=>x.id===d.id); return j>0?ds[j-1]:null; }
function vRead(p){
 const c=current(p);
 if(!c) return '<div class="panel">A table read needs a script draft. <button class="btn sm" data-tab="add">ADD DRAFTS</button></div>';
 const sc=scenesOf(c), keys=T.keys(sc), M=DB.marks[c.id]||[], C=T.markCounts(M), pv=prevScript(p,c), PC=pv?T.markCounts(DB.marks[pv.id]):{};
 const who=READER||'';
 let h='<p class="note">Marking <b>'+esc(c.label)+'</b> ('+esc(c.file)+'). Tap a line as it goes by: landed, lost me, confused. Tap again to take it back. Readers decide; this only counts.</p>';
 h+='<div class="row"><input class="field" id="reader" placeholder="Who is marking (your name, or the reader\'s)" value="'+esc(who)+'" style="max-width:360px"></div>';
 h+='<div class="stats" style="margin-top:14px"><div><b>'+M.filter(x=>x.m==='landed').length+'</b><span>landed</span></div><div><b>'+M.filter(x=>x.m==='lost').length+'</b><span>lost me</span></div><div><b>'+M.filter(x=>x.m==='confused').length+'</b><span>confused</span></div><div><b>'+[...new Set(M.map(x=>x.who))].length+'</b><span>readers</span></div></div>';
 // where it bunches up, and what came over from the last draft
 const notes=[];
 sc.forEach((s,i)=>T.clusters(M,keys[i]).forEach(cl=>notes.push('SC '+(i+1)+' · '+esc(s.heading)+': lines '+(cl.from+1)+(cl.to>cl.from?' to '+(cl.to+1):'')+', '+cl.marks+' marks from '+cl.readers+' reader'+(cl.readers===1?'':'s'))));
 if(notes.length) h+='<div class="eyebrow">Where people got lost or confused</div><div class="panel">'+notes.join('<br>')+'</div>';
 if(pv){
  const car=T.carried(DB.marks[pv.id],sc);
  if(car.length) h+='<div class="eyebrow">Still here from '+esc(pv.label)+', word for word</div><div class="panel">'+car.map(x=>'SC '+(x.where.scene+1)+', line '+(x.where.li+1)+': '+esc(x.where.text.length>90?x.where.text.slice(0,88).replace(/\s+\S*$/,'')+' …':x.where.text)+' <span class="note">('+[x.lost?x.lost+' lost me':'',x.confused?x.confused+' confused':''].filter(Boolean).join(', ')+' in '+esc(pv.label)+')</span>').join('<br>')+'</div>';
 }
 sc.forEach((s,i)=>{
  const k=keys[i], L=T.linesOf(s), mine=M.filter(x=>x.key===k);
  h+='<div class="eyebrow">SC '+(i+1)+' · '+esc(s.heading)+'</div><div class="panel">';
  h+='<p class="note" style="margin-top:0">'+(C[k]?countLine(C[k]):'No marks yet.')+(pv&&PC[k]?' · In '+esc(pv.label)+': '+countLine(PC[k]):'')+'</p>';
  h+=L.map((l,j)=>{ const here=mine.filter(x=>x.li===j);
   return '<div class="ln"><div class="lt"><span class="note">'+(j+1)+'</span> '+esc(l)+'</div><div class="mks">'+T.MARKS.map(([m,lab])=>{ const n=here.filter(x=>x.m===m).length, me=here.some(x=>x.m===m&&x.who===(who||'Reader'));
    return '<button class="mk '+m+(me?' on':'')+'" data-mk="'+i+':'+j+':'+m+'">'+lab+(n?' '+n:'')+'</button>'; }).join('')+'</div></div>'; }).join('');
  h+='</div>';
 });
 return h;
}
function vBones(p){
 p.bones=p.bones||[];
 const ds=draftsOf(p.id).filter(d=>d.kind==='script'&&!d.retired), C=T.cuts(ds.map(d=>({id:d.id,label:d.label,scenes:scenesOf(d)})));
 const q=(VIEW.bq||'').trim().toLowerCase(), hit=s=>!q||String(s).toLowerCase().includes(q);
 const F=p.bones.filter(b=>hit(b.text)).slice().reverse(), S=C.scenes.filter(x=>hit(x.heading+' '+x.text)), L=C.lines.filter(x=>hit(x.text+' '+x.heading));
 let h='<p class="note">Nothing you cut is gone. Scenes and lines cut between drafts land here by themselves. Catch new bits here too, before they get away.</p>';
 h+='<div class="panel"><div class="eyebrow" style="margin-top:0">Catch it</div><textarea class="field" id="bone" placeholder="A line, a name, a beat, a scene you can see but can\'t place yet"></textarea>'
  +'<div class="row" style="margin-top:8px"><button class="btn pri" id="boneb">KEEP IT</button>'+(SR?'<button class="btn" id="mic">'+(LISTEN?'STOP':'SAY IT')+'</button>':'')+'</div>'
  +(SR?'<p class="note">SAY IT types what you say. Your words, as heard: check it before you keep it. Your phone or browser turns the sound into words, and that can go through Apple or Google, the same as the keyboard mic. Paper Trail only gets the words.</p>':'<p class="note">On a phone, the mic on your keyboard types what you say.</p>')+'</div>';
 h+='<div class="row"><input class="field" id="bq" placeholder="Find anything in the boneyard" value="'+esc(VIEW.bq||'')+'" style="max-width:420px"></div>';
 h+='<div class="stats" style="margin-top:14px"><div><b>'+p.bones.length+'</b><span>caught</span></div><div><b>'+C.scenes.length+'</b><span>scenes cut</span></div><div><b>'+C.lines.length+'</b><span>lines cut</span></div></div>';
 h+='<div class="eyebrow">Caught</div><div class="list">'+(F.length?F.map(b=>'<div class="li"><div class="w" style="white-space:pre-wrap">'+esc(b.text)+'<small>'+esc(day(b.at))+(b.said?' · said':'')+'</small></div><div class="row"><button class="btn sm" data-copy="'+esc(b.text)+'">COPY</button><button class="btn sm ghost" data-unbone="'+b.id+'">REMOVE</button></div></div>').join(''):'<div class="li"><div class="w note">'+(q?'Nothing caught matches.':'Nothing caught yet.')+'</div></div>')+'</div>';
 h+='<div class="eyebrow">Scenes cut</div><div class="list">'+(S.length?S.map(x=>'<div class="li"><div class="w"><b>'+esc(x.heading)+'</b><small>In '+esc(x.from)+', cut in '+esc(x.cutIn)+'</small><details><summary class="note" style="cursor:pointer">Read it</summary><div class="read">'+esc(x.text)+'</div></details></div><button class="btn sm" data-copy="'+esc(x.heading+'\n\n'+x.text)+'">COPY</button></div>').join(''):'<div class="li"><div class="w note">'+(ds.length<2?'Cut scenes show up once there are two drafts.':q?'No cut scene matches.':'No scene has been cut.')+'</div></div>')+'</div>';
 h+='<div class="eyebrow">Lines cut</div><div class="list">'+(L.length?L.map(x=>'<div class="li"><div class="w">'+esc(x.text)+'<small>'+esc(x.heading)+' · in '+esc(x.from)+', cut in '+esc(x.cutIn)+'</small></div><button class="btn sm" data-copy="'+esc(x.text)+'">COPY</button></div>').join(''):'<div class="li"><div class="w note">'+(ds.length<2?'Cut lines show up once there are two drafts.':q?'No cut line matches.':'No line has been cut.')+'</div></div>')+'</div>';
 h+='<p class="note">A line that comes back in a later draft leaves the boneyard by itself.</p>';
 return h;
}
/* setups and secrets on one scene */
function threadBox(p,s,i,keys){
 p.threads=p.threads||[]; const k=keys[i], here=T.threadsAt(p.threads,k), cur=current(p), base=cur||board(p), sc=scenesOf(base);
 let h='<div class="eyebrow">Setups and secrets</div>';
 h+=here.length?'<div class="list">'+here.map(x=>{ const st=T.threadStatus(x.th,sc,keys);
  const acts=[]; if(x.th.payoff&&x.th.payoff.key===k) acts.push('<a data-unpay="'+x.th.id+'">unlink payoff</a>');
  (x.th.learns||[]).filter(l=>l.key===k).forEach(l=>acts.push('<a data-unlearn="'+x.th.id+'|'+esc(l.who)+'">unmark '+esc(l.who)+'</a>'));
  if(x.th.plant&&x.th.plant.key===k) acts.push('<a data-thdel="'+x.th.id+'">remove</a>');
  return '<div class="li"><div class="w"><b>'+esc(x.th.what)+'</b> <span class="tag">'+(x.th.kind==='setup'?'setup':'secret')+'</span><small>'+esc(x.roles.join(' · '))+'</small>'
   +(x.th.kind==='setup'&&x.th.plant&&x.th.plant.key===k?'<small>'+(st.payoff>=0?'Pays off in SC '+(st.payoff+1):'Not paid off yet')+'</small>':'')
   +st.problems.map(m=>'<small style="color:var(--grease)">'+esc(m)+'</small>').join('')+'<small>'+acts.join(' · ')+'</small></div></div>'; }).join('')+'</div>':'<p class="note" style="margin-top:0">Nothing set up or kept secret in this scene yet.</p>';
 h+='<div class="row" style="margin-top:8px"><button class="btn sm" id="thsetup">+ SET SOMETHING UP HERE</button><button class="btn sm" id="thsecret">+ A SECRET STARTS HERE</button></div>';
 const open=p.threads.filter(x=>x.kind==='setup'&&!(x.plant&&x.plant.key===k)&&!(x.payoff&&x.payoff.key===k));
 if(open.length) h+='<div class="row" style="margin-top:8px"><select class="field" id="paysel" style="flex:1">'+open.map(x=>'<option value="'+x.id+'">'+esc(x.what)+(x.payoff?' (now pays off in '+esc(x.payoff.heading)+')':'')+'</option>').join('')+'</select><button class="btn sm" id="payb">PAYS OFF HERE</button></div>';
 const secrets=p.threads.filter(x=>x.kind==='secret');
 if(secrets.length){ const names=[...new Set([...(s.cast||[]),...T.characters([{id:'x',scenes:sc}]).map(c=>c.name)])];
  h+='<div class="row" style="margin-top:8px"><select class="field" id="secsel" style="flex:1">'+secrets.map(x=>'<option value="'+x.id+'">'+esc(x.what)+'</option>').join('')+'</select><select class="field" id="whosel" style="flex:0 1 160px">'+names.map(n=>'<option>'+esc(n)+'</option>').join('')+'</select><button class="btn sm" id="learnb">LEARNS IT HERE</button></div>'; }
 return h+'<p class="note">Marks stay with the scene from draft to draft. Cut the scene and the list says so.</p>';
}
function lastHad(p,key){ const ds=draftsOf(p.id).filter(d=>d.kind==='script'&&!d.retired).reverse(); for(const d of ds){ if(T.keys(scenesOf(d)).includes(key)) return d.label; } return ''; }
/* NOT THIS: things you've said no to, and where their words show up in the current draft. A word match, not a verdict. */
function ntHitsIn(p,d){ const sc=d?scenesOf(d):[]; return (p.notThis||[]).map(f=>({f,hits:T.ntHits(f,sc)})); }
function vNotThis(p){
 const c=current(p), R=ntHitsIn(p,c);
 let h='<div class="eyebrow" id="notthis">Not this</div><p class="note" style="margin-top:-4px">Things you\u2019ve said no to. When their words show up on the same line of the current draft, it shows you where. It looks for words, so it can miss the same idea said another way, and it can point at a line that\u2019s fine.</p>';
 h+='<div class="row"><input class="field" id="ntx" placeholder="e.g. Vale never uses a flintlock" style="flex:2 1 220px"><input class="field" id="ntw" placeholder="Words to look for (optional)" style="flex:1 1 160px"><button class="btn sm pri" id="ntadd">ADD</button></div>';
 h+='<div class="list" style="margin-top:10px">'+(R.length?R.map(({f,hits})=>{ const W=f.words&&f.words.length?f.words:T.ntWords(f.text);
  return '<div class="li"><div class="w"><b>'+esc(f.text)+'</b><small>Looks for: '+esc(W.join(', ')||'(no words to look for)')+'</small>'
   +(c?(hits.length?hits.slice(0,8).map(x=>'<small>Words from it in <a data-goscene="'+x.i+'">SC '+(x.i+1)+'</a> '+esc(x.heading)+': \u201c'+esc(x.line)+'\u201d</small>').join('')+(hits.length>8?'<small>and '+(hits.length-8)+' more lines</small>':''):'<small>Its words aren\u2019t together on any line of '+esc(c.label)+'.</small>'):'<small>No script draft yet to look in.</small>')
   +'</div><button class="x" data-ntdel="'+esc(f.id)+'" aria-label="Remove">\u00d7</button></div>'; }).join(''):'<div class="li"><div class="w note">Nothing yet.</div></div>')+'</div>';
 return h;
}
function vThreads(p){
 p.threads=p.threads||[]; const c=current(p);
 if(!c) return '<div class="panel">Setups and secrets need a script draft. <button class="btn sm" data-tab="add">ADD DRAFTS</button></div>'+vNotThis(p);
 const sc=scenesOf(c), keys=T.keys(sc), at=i=>i>=0?'<a data-goscene="'+i+'">SC '+(i+1)+'</a> '+esc(sc[i].heading):'';
 const S=p.threads.filter(x=>x.kind==='setup').map(x=>({x:x,st:T.threadStatus(x,sc,keys)})), Z=p.threads.filter(x=>x.kind==='secret').map(x=>({x:x,st:T.threadStatus(x,sc,keys)}));
 S.sort((a,b)=>(b.st.open?1:0)-(a.st.open?1:0)||a.st.plant-b.st.plant);
 let h='<p class="note">Reading <b>'+esc(c.label)+'</b>. Mark these on a scene page. This list only says what it finds.</p>';
 h+='<div class="stats"><div><b>'+S.length+'</b><span>set up</span></div><div><b>'+S.filter(r=>r.st.open).length+'</b><span>not paid off</span></div><div><b>'+Z.length+'</b><span>secrets</span></div><div><b>'+[...S,...Z].filter(r=>r.st.problems.length).length+'</b><span>to look at</span></div></div>';
 h+='<div class="eyebrow">Setups</div><div class="list">'+(S.length?S.map(({x,st})=>'<div class="li"><div class="w"><b>'+esc(x.what)+'</b>'+(st.open?' <span class="tag red">not paid off</span>':'')
  +'<small>Set up: '+(st.plant>=0?at(st.plant):esc(x.plant.heading)+' (not in this draft)')+'</small>'
  +'<small>Pays off: '+(st.payoff>=0?at(st.payoff):x.payoff?esc(x.payoff.heading)+' (not in this draft'+(lastHad(p,x.payoff.key)?'; last in '+esc(lastHad(p,x.payoff.key)):'')+')':'not marked')+'</small>'
  +st.problems.map(m=>'<small style="color:var(--grease)">'+esc(m)+'</small>').join('')+st.notes.map(m=>'<small>'+esc(m)+'</small>').join('')+'</div></div>').join(''):'<div class="li"><div class="w note">Nothing set up yet. On a scene page: + SET SOMETHING UP HERE.</div></div>')+'</div>';
 h+='<div class="eyebrow">Secrets</div><div class="list">'+(Z.length?Z.map(({x,st})=>'<div class="li"><div class="w"><b>'+esc(x.what)+'</b><small>Starts: '+(st.plant>=0?at(st.plant):esc(x.plant.heading)+' (not in this draft)')+'</small>'
  +(st.learns.length?st.learns.map(l=>'<small>'+esc(l.who)+' learns it: '+(l.i>=0?at(l.i):esc(l.heading)+' (not in this draft)')+'</small>').join(''):'<small>Nobody learns it yet.</small>')
  +(st.unaware.length?'<small>Not marked as knowing: '+esc(st.unaware.join(', '))+'</small>':'')
  +st.problems.map(m=>'<small style="color:var(--grease)">'+esc(m)+'</small>').join('')+st.notes.map(m=>'<small>'+esc(m)+'</small>').join('')+'</div></div>').join(''):'<div class="li"><div class="w note">No secrets yet. On a scene page: + A SECRET STARTS HERE.</div></div>')+'</div>';
 h+=vNotThis(p);
 return h;
}
/* ---------- research ---------- */
let HITS=[];
function searchAll(q){
 const out=[];
 projects().forEach(p=>{ const ds=draftsOf(p.id).filter(d=>d.kind==='script'&&!d.retired), cur=current(p);
  const D=(cur?[cur]:[]).concat(ds.filter(d=>!cur||d.id!==cur.id)).map(d=>({id:d.id,label:d.label,scenes:scenesOf(d)}));
  const cuts=T.cuts(ds.map(d=>({id:d.id,label:d.label,scenes:scenesOf(d)})));
  T.search(q,{drafts:D,cards:p.cards||{},bones:p.bones||[],cuts:cuts,research:p.research||[]}).forEach(r=>out.push(Object.assign({pt:p.title,pid:p.id},r)));
 });
 return out;
}
const RKIND={photo:'Photo',audio:'Recording',video:'Video',pdf:'PDF',file:'File',link:'Link',note:'Note',chat:'AI chat'};
function rCard(p,r,sc,keys,names){
 const pin=(r.scene?'<span class="tag">'+esc((sc[keys.indexOf(r.scene)]||{}).heading||r.sceneHeading||'a cut scene')+'</span> ':'')+(r.who?'<span class="tag">'+esc(r.who)+'</span>':'');
 let prev='';
 if(r.kind==='photo') prev='<img class="rimg" data-rblob="'+r.id+'" alt="'+esc(r.name||'photo')+'">';
 else if(r.kind==='audio') prev='<audio controls preload="none" data-rblob="'+r.id+'"></audio>';
 else if(r.kind==='video') prev='<video controls preload="metadata" playsinline data-rblob="'+r.id+'" style="width:100%;max-height:260px;background:#000"></video>';
 else if(r.kind==='link') prev='<a href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer">'+esc(r.url)+'</a>';
 else if(r.kind==='note') prev='<p style="margin:0;white-space:pre-wrap">'+esc(r.text)+'</p>';
 else if(r.kind==='chat') prev='<b style="display:block;margin-bottom:6px">'+esc(r.name)+'</b><span class="note">'+esc(r.from||'AI')+' chat</span><div class="chatx" style="white-space:pre-wrap;max-height:240px;overflow:auto;margin-top:6px;font-size:14px">'+esc(r.text)+'</div>';
 else prev='<a data-ropen="'+r.id+'" href="#">'+esc(r.name)+'</a> <span class="note">'+(r.size?Math.round(r.size/1024)+' KB':'')+'</span>';
 return '<div class="panel rcard" id="r_'+r.id+'" style="margin:0"><div class="fk"><span>'+(RKIND[r.kind]||'File')+'</span><span>'+esc(day(r.at))+'</span></div>'
  +'<div style="margin:8px 0">'+prev+'</div>'+(pin?'<div class="chips">'+pin+'</div>':'')
  +'<textarea class="field" data-rnote="'+r.id+'" placeholder="What this is, why you kept it" style="min-height:60px;margin-top:8px">'+esc(r.note||'')+'</textarea>'
  +'<div class="row" style="margin-top:8px"><select class="field" data-rscene="'+r.id+'" style="flex:1 1 160px;min-height:36px"><option value="">No scene</option>'+sc.map((s,i)=>'<option value="'+esc(keys[i])+'"'+(r.scene===keys[i]?' selected':'')+'>SC '+(i+1)+' '+esc(s.heading)+'</option>').join('')+'</select>'
  +'<select class="field" data-rwho="'+r.id+'" style="flex:1 1 120px;min-height:36px"><option value="">No character</option>'+names.map(n=>'<option'+(r.who===n?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select>'
  +'<button class="btn sm ghost" data-rdel="'+r.id+'">REMOVE</button></div></div>';
}
function rSwitch(on){ return '<div class="row" style="margin-bottom:12px"><button class="btn sm'+(on==='shelf'?' pri':'')+'" data-rt="">SHELF</button><button class="btn sm'+(on==='tables'?' pri':'')+'" data-rt="list">STUDY TABLES</button></div>'; }
function vResearch(p){
 p.research=p.research||[]; p.tables=p.tables||[];
 if(VIEW.rt==='list') return vTables(p);
 if(VIEW.rt){ const tb=p.tables.find(x=>x.id===VIEW.rt); if(tb) return vTable(p,tb); VIEW.rt='list'; return vTables(p); }
 const c=current(p)||board(p), sc=c?scenesOf(c):[], keys=T.keys(sc), names=c?T.characters([{id:'x',scenes:sc}]).map(x=>x.name):[];
 const f=VIEW.rf||'', q=(VIEW.rq||'').trim();
 let L=p.research.slice().reverse();
 if(f==='none') L=L.filter(r=>!r.scene&&!r.who); else if(f.startsWith('s:')) L=L.filter(r=>r.scene===f.slice(2)); else if(f.startsWith('w:')) L=L.filter(r=>r.who===f.slice(2));
 if(q) L=L.filter(r=>T.search(q,{research:[r]}).length);
 let h=rSwitch('shelf')+'<p class="note">Photos, screenshots, voice memos, video, PDFs, links and notes for this project. Pin any of it to a scene or a character. It stays on this device and goes in the On This Device backup.</p>';
 h+='<div class="drop" id="rdrop"><b>DROP RESEARCH</b><span class="note">Several at once is fine. Photos, screenshots, recordings, video, PDFs, anything.</span></div>';
 h+='<div class="row" style="margin-top:10px"><button class="btn" id="rnote">SHOOT A NOTE</button><button class="btn" id="rcam">TAKE A PHOTO</button><button class="btn" id="rrec">'+(RECORDING?'STOP RECORDING':'RECORD A MEMO')+'</button></div>';
 h+='<div class="row" style="margin-top:10px"><input class="field" id="rlink" placeholder="Paste a link, or write a note" style="flex:1"><button class="btn pri" id="rkeep">KEEP</button></div>';
 h+='<div class="panel" style="margin-top:12px"><b>Your AI chats</b><p class="note" style="margin:4px 0 8px">Brainstormed with ChatGPT or Claude? Bring in the export (the .zip it emails you, or conversations.json). Every chat that names '+esc(p.title)+(p.aka&&p.aka.length?' or '+esc(p.aka.join(', '))+'':'')+' comes in as a note with its date. The rest is not kept. It is read on this device; nothing is uploaded.</p>'
  +'<div class="row"><label class="btn"><input type="file" accept=".zip,.json,application/zip,application/json" class="hide" id="rchats">BRING IN YOUR AI CHATS</label><input class="field" id="raka" placeholder="Other names for it (working title, a character)" value="'+esc((p.aka||[]).join(', '))+'" style="flex:1 1 220px"></div>'+(CHATMSG?'<p class="note" style="margin:8px 0 0">'+esc(CHATMSG)+'</p>':'')+'</div>';
 h+='<div class="stats" style="margin-top:14px"><div><b>'+p.research.length+'</b><span>kept</span></div><div><b>'+p.research.filter(r=>r.scene).length+'</b><span>pinned to a scene</span></div><div><b>'+p.research.filter(r=>r.who).length+'</b><span>pinned to a character</span></div></div>';
 h+='<div class="row"><select class="field" id="rf" style="flex:1 1 200px"><option value="">Everything</option><option value="none"'+(f==='none'?' selected':'')+'>Not pinned yet</option>'
  +sc.map((s,i)=>'<option value="s:'+esc(keys[i])+'"'+(f==='s:'+keys[i]?' selected':'')+'>SC '+(i+1)+' '+esc(s.heading)+'</option>').join('')
  +names.map(n=>'<option value="w:'+esc(n)+'"'+(f==='w:'+n?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select>'
  +'<input class="field" id="rq" placeholder="Find in research" value="'+esc(VIEW.rq||'')+'" style="flex:1 1 200px"></div>';
 h+='<div class="grid" style="margin-top:14px">'+(L.length?L.map(r=>rCard(p,r,sc,keys,names)).join(''):'<div class="panel note">'+(p.research.length?'Nothing here matches.':'Nothing kept yet.')+'</div>')+'</div>';
 return h;
}
/* ---------- study tables ---------- */
function vTables(p){
 let h=rSwitch('tables')+'<p class="note">Put research on a table around one question. Move it, size it, draw lines between things and say what the line means. The table keeps what you think; it doesn\'t think for you.</p>';
 h+='<div class="row"><button class="btn pri" id="tnew">+ NEW TABLE</button></div>';
 h+='<div class="grid" style="margin-top:14px">'+(p.tables.length?p.tables.slice().reverse().map(tb=>'<button class="frame" data-topen="'+tb.id+'">'+perf()+'<div class="fb"><div class="fk"><span>'+tb.items.length+' on it · '+tb.links.length+' lines</span><span>'+esc(day(tb.at))+'</span></div><div class="ft" style="font-size:19px">'+esc(tb.question||'No question yet')+'</div></div></button>').join(''):'<div class="panel note">No tables yet. Start one with a question.</div>')+'</div>';
 return h;
}
function tItem(p,tb,it){
 const r=(p.research||[]).find(x=>x.id===it.rid), sel=VIEW.tsel===it.id, a=VIEW.tlinkA===it.id;
 let inner='';
 if(!r) inner='<div class="tnote">(removed from Research)</div>';
 else if(r.kind==='photo') inner='<img data-rblob="'+r.id+'" alt="" draggable="false">';
 else if(r.kind==='audio') inner='<div class="tnote"><b>Recording</b><br>'+esc(r.note||r.name)+'</div><audio controls preload="none" data-rblob="'+r.id+'"></audio>';
 else if(r.kind==='video') inner='<video muted playsinline preload="metadata" data-rblob="'+r.id+'"></video>';
 else inner='<div class="tnote">'+esc(r.kind==='note'?r.text:r.kind==='link'?(r.note||r.url):(r.note||r.name))+'</div>';
 const cap=r&&r.kind==='photo'&&r.note?'<div class="tcap">'+esc(r.note.slice(0,60))+'</div>':'';
 return '<div class="titem'+(sel?' sel':'')+(a?' linka':'')+'" data-titem="'+it.id+'" style="left:'+(it.x/10)+'%;top:'+(it.y/7)+'%;width:'+(it.w/10)+'%;z-index:'+(2+(it.z||0))+'">'+inner+cap+'<span class="tnum">'+(tb.items.indexOf(it)+1)+'</span><i class="tsize" data-tsize="'+it.id+'"></i></div>';
}
function tLines(tb){
 const P={}; tb.items.forEach(it=>P[it.id]=it);
 return '<svg class="tlines" viewBox="0 0 1000 700" preserveAspectRatio="none">'+tb.links.map(l=>{ const a=P[l.a], b=P[l.b]; if(!a||!b) return '';
  const ax=a.x+a.w/2, ay=a.y+a.w*0.35, bx=b.x+b.w/2, by=b.y+b.w*0.35;
  return '<line x1="'+ax+'" y1="'+ay+'" x2="'+bx+'" y2="'+by+'" class="tl '+l.type+'"/>'; }).join('')+'</svg>'
  +tb.links.map(l=>{ const a=P[l.a], b=P[l.b]; if(!a||!b) return ''; const mx=(a.x+a.w/2+b.x+b.w/2)/2, my=(a.y+a.w*0.35+b.y+b.w*0.35)/2;
   return '<span class="tlab" style="left:'+(mx/10)+'%;top:'+(my/7)+'%">'+esc(l.type)+'</span>'; }).join('');
}
function vTable(p,tb){
 const on=new Set(tb.items.map(i=>i.rid)), off=(p.research||[]).filter(r=>!on.has(r.id));
 let h=rSwitch('tables')+'<button class="btn ghost sm" data-rt="list">‹ All tables</button>';
 h+='<div class="eyebrow">The question</div><input class="field" id="tq" value="'+esc(tb.question)+'" placeholder="What are you trying to find out?">';
 h+='<div class="row" style="margin:10px 0"><button class="btn'+(VIEW.tlinking?' pri':'')+'" id="tlink">'+(VIEW.tlinking?(VIEW.tlinkA?'NOW TAP THE OTHER ONE':'TAP THE FIRST ONE'):'DRAW A LINE')+'</button>'
  +'<select class="field" id="tltype" style="flex:0 1 150px;min-height:40px">'+T.LINKS.map(x=>'<option'+(x===(VIEW.tltype||'unknown')?' selected':'')+'>'+x+'</option>').join('')+'</select>'
  +(VIEW.tsel?'<button class="btn ghost" id="toff">TAKE OFF THE TABLE</button>':'')+'</div>';
 h+='<div class="tboard" id="tboard">'+tLines(tb)+tb.items.map(it=>tItem(p,tb,it)).join('')+(tb.items.length?'':'<div class="tempty">Place research from below. Drag to move; drag the corner to size.</div>')+'</div>';
 h+='<div class="eyebrow">Lines</div><div class="list">'+(tb.links.length?tb.links.map(l=>{ const A=tb.items.findIndex(i=>i.id===l.a)+1, B=tb.items.findIndex(i=>i.id===l.b)+1;
  return '<div class="li"><div class="w"><b>'+A+' '+esc(l.type.toUpperCase())+' '+B+'</b><input class="field" data-lnote="'+l.id+'" value="'+esc(l.note||'')+'" placeholder="What the line means" style="margin-top:6px"></div><select class="field" data-ltype="'+l.id+'" style="flex:0 1 130px;min-height:36px">'+T.LINKS.map(x=>'<option'+(x===l.type?' selected':'')+'>'+x+'</option>').join('')+'</select><button class="btn sm ghost" data-ldel="'+l.id+'">REMOVE</button></div>'; }).join(''):'<div class="li"><div class="w note">No lines yet. DRAW A LINE, then tap two things.</div></div>')+'</div>';
 h+='<div class="eyebrow">Place on the table</div><div class="tshelf">'+(off.length?off.map(r=>'<button class="tput" data-tput="'+r.id+'">'+(r.kind==='photo'?'<img data-rblob="'+r.id+'" alt="">':'')+'<span>'+esc(T.itemLabel(r).slice(0,46))+'</span></button>').join(''):'<p class="note">Everything in Research is on this table'+((p.research||[]).length?'':'. Nothing in Research yet: add some on the SHELF')+'.</p>')+'</div>';
 h+='<div class="eyebrow">Receipt</div><div class="read">'+esc(T.receipt(tb,p.research,p.title))+'</div><div class="row" style="margin-top:8px"><button class="btn sm" id="tcopy">COPY</button><button class="btn sm ghost" id="tdl">SAVE AS TEXT</button><button class="btn sm ghost" id="tdel">DELETE TABLE</button></div>';
 return h;
}
function wireTable(p){
 const tn=$('tnew'); if(tn) tn.onclick=()=>{ const q=prompt('What\'s the question? e.g. What does Rennie leave behind?'); if(q===null) return; const tb={id:rid('t'),question:q.trim(),at:Date.now(),items:[],links:[]}; p.tables.push(tb); VIEW.rt=tb.id; save(); render(); };
 document.querySelectorAll('[data-topen]').forEach(b=>b.onclick=()=>{ VIEW.rt=b.dataset.topen; VIEW.tsel=null; VIEW.tlinking=false; VIEW.tlinkA=null; render(); window.scrollTo(0,0); });
 const tb=VIEW.rt&&VIEW.rt!=='list'?(p.tables||[]).find(x=>x.id===VIEW.rt):null; if(!tb) return;
 const touch=()=>{ tb.at=Date.now(); p.updated=Date.now(); save(); };
 const tq=$('tq'); if(tq) tq.oninput=()=>{ tb.question=tq.value; touch(); const r=document.querySelector('#main .read'); if(r) r.textContent=T.receipt(tb,p.research,p.title); };
 const tt=$('tltype'); if(tt) tt.onchange=()=>{ VIEW.tltype=tt.value; };
 const tl=$('tlink'); if(tl) tl.onclick=()=>{ VIEW.tlinking=!VIEW.tlinking; VIEW.tlinkA=null; render(); };
 const to=$('toff'); if(to) to.onclick=()=>{ const id=VIEW.tsel; tb.items=tb.items.filter(i=>i.id!==id); tb.links=tb.links.filter(l=>l.a!==id&&l.b!==id); VIEW.tsel=null; touch(); render(); };
 document.querySelectorAll('[data-tput]').forEach(b=>b.onclick=()=>{ const n=tb.items.length; tb.items.push({id:rid('i'),rid:b.dataset.tput,x:40+(n%4)*230,y:40+(Math.floor(n/4)%3)*210,w:180}); touch(); render(); });
 const rcLive=()=>{ const r=document.querySelector('#main .read'); if(r) r.textContent=T.receipt(tb,p.research,p.title); };
 document.querySelectorAll('[data-lnote]').forEach(i=>i.oninput=()=>{ const l=tb.links.find(x=>x.id===i.dataset.lnote); if(l){ l.note=i.value; touch(); rcLive(); } });
 document.querySelectorAll('[data-ltype]').forEach(s=>s.onchange=()=>{ const l=tb.links.find(x=>x.id===s.dataset.ltype); if(l){ l.type=s.value; touch(); render(); } });
 document.querySelectorAll('[data-ldel]').forEach(b=>b.onclick=()=>{ tb.links=tb.links.filter(x=>x.id!==b.dataset.ldel); touch(); render(); });
 const rc=()=>T.receipt(tb,p.research,p.title);
 const tc=$('tcopy'); if(tc) tc.onclick=async()=>{ try{ await navigator.clipboard.writeText(rc()); toast('Copied.'); }catch(e){ toast('This browser would not copy. Use SAVE AS TEXT.'); } };
 const td=$('tdl'); if(td) td.onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([rc()],{type:'text/plain'})); a.download=(p.title+' study table').replace(/[^\w ]+/g,'').trim()+'.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
 const tx=$('tdel'); if(tx) tx.onclick=()=>{ if(!confirm('Delete this table? The research stays on the shelf.')) return; p.tables=p.tables.filter(x=>x.id!==tb.id); VIEW.rt='list'; save(); render(); };
 // move and size with a finger or a mouse
 const board=$('tboard'); if(!board) return;
 const scale=()=>({sx:1000/board.clientWidth, sy:700/board.clientHeight});
 board.querySelectorAll('[data-titem]').forEach(el=>{
  el.onpointerdown=e=>{
   const it=tb.items.find(i=>i.id===el.dataset.titem); if(!it) return;
   if(VIEW.tlinking){ e.preventDefault();
    if(!VIEW.tlinkA){ VIEW.tlinkA=it.id; render(); return; }
    if(VIEW.tlinkA!==it.id){ tb.links.push({id:rid('l'),a:VIEW.tlinkA,b:it.id,type:VIEW.tltype||'unknown',note:''}); touch(); toast('Line drawn: '+(VIEW.tltype||'unknown')+'. Say what it means below.'); }
    VIEW.tlinkA=null; VIEW.tlinking=false; render(); return; }
   const sizing=e.target.dataset&&e.target.dataset.tsize;
   // what you touch comes to the front
   const top=Math.max(0,...tb.items.map(i=>i.z||0)); if((it.z||0)<top||!it.z){ it.z=top+1; el.style.zIndex=2+it.z; }
   e.preventDefault(); try{ el.setPointerCapture(e.pointerId); }catch(x){}
   const s=scale(), x0=e.clientX, y0=e.clientY, ix=it.x, iy=it.y, iw=it.w; let moved=false;
   el.onpointermove=m=>{ const dx=(m.clientX-x0)*s.sx, dy=(m.clientY-y0)*s.sy; if(Math.abs(dx)+Math.abs(dy)>4) moved=true;
    if(sizing){ it.w=Math.max(80,Math.min(600,iw+dx)); el.style.width=(it.w/10)+'%'; }
    else { it.x=Math.max(0,Math.min(1000-it.w,ix+dx)); it.y=Math.max(0,Math.min(660,iy+dy)); el.style.left=(it.x/10)+'%'; el.style.top=(it.y/7)+'%'; } };
   el.onpointerup=()=>{ el.onpointermove=null; el.onpointerup=null; if(moved){ touch(); } else VIEW.tsel=VIEW.tsel===it.id?null:it.id; render(); };
  };
 });
}
function researchBox(p,key){
 const L=(p.research||[]).filter(r=>r.scene===key);
 return '<div class="eyebrow">Research for this scene</div>'+(L.length?'<div class="rthumbs">'+L.map(r=>r.kind==='photo'?'<img class="rthumb" data-rblob="'+r.id+'" data-rgo="'+r.id+'" alt="">':'<button class="btn sm ghost" data-rgo="'+r.id+'">'+esc((RKIND[r.kind]||'File')+': '+(r.note||r.name||r.url||r.text||'').slice(0,40))+'</button>').join('')+'</div>':'<p class="note" style="margin-top:0">Nothing pinned here yet.</p>')
  +'<div class="row" style="margin-top:8px"><button class="btn sm" id="raddhere">+ ADD RESEARCH TO THIS SCENE</button></div>';
}
let RECORDING=null;

/* ---------- AI chats into Research ---------- */
let CHATMSG='';
async function chatsFromFile(f){
 const buf=await f.arrayBuffer(), u=new Uint8Array(buf);
 let txt=null;
 if(u[0]===0x50&&u[1]===0x4b){ const Z=window.XLSX.zip(buf); const k=Object.keys(Z).find(n=>/(^|\/)conversations\.json$/i.test(n)); if(!k) throw new Error('no conversations.json inside that zip'); txt=await Z[k](); }
 else txt=new TextDecoder().decode(u);
 let data; try{ data=JSON.parse(txt); }catch(e){ throw new Error('that is not a chat export (not JSON)'); }
 const chats=T.chatsOf(data); if(!chats.length) throw new Error('no ChatGPT or Claude chats found in it'); return chats;
}
async function addChats(p,f){
 CHATMSG='Reading '+f.name+'…'; render();
 try{
  const chats=await chatsFromFile(f), names=[p.title].concat(p.aka||[]), M=T.chatsFor(chats,names);
  p.research=p.research||[]; let n=0, again=0;
  M.forEach(m=>{ const key=m.chat.from+'|'+m.chat.id+'|'+m.chat.at;
   const text=T.chatNote(m), ex=p.research.find(r=>r.kind==='chat'&&r.chatKey===key);
   if(ex){ if(ex.text!==text){ ex.text=text; } again++; return; }
   p.research.push({id:rid('r'),kind:'chat',name:m.chat.title,from:m.chat.from,chatKey:key,text,at:m.chat.at||Date.now(),note:'',scene:'',who:''}); n++; });
  p.updated=Date.now(); save();
  CHATMSG=chats.length+' chat'+(chats.length===1?'':'s')+' read. '+(M.length?M.length+' name '+names.join(' or ')+': '+n+' kept'+(again?', '+again+' already here':'')+'.':'None name '+names.join(' or ')+'. Nothing kept. Add other names for it and bring the export in again.');
 }catch(e){ CHATMSG='Could not read it: '+e.message+'.'; }
 render();
}
async function addResearch(p,files,pin){
 p.research=p.research||[]; let n=0, bad=0;
 for(const f of files){
  const id=rid('r'); const ok=await putBlob(id,f);
  if(!ok){ bad++; continue; }
  p.research.push(Object.assign({id:id,kind:T.kindOf(f.type,f.name),name:f.name||'',type:f.type||'',size:f.size||0,at:Date.now(),note:'',scene:'',who:''},pin||{})); n++;
 }
 p.updated=Date.now(); save(); render();
 toast(bad?'Kept '+n+'. '+bad+' would not save: this device may be out of room.':'Kept '+n+'.');
}
function fillBlobs(){
 document.querySelectorAll('[data-rblob]').forEach(async el=>{ const u=await urlOf(el.dataset.rblob); if(u) el.src=u; else if(el.tagName==='IMG') el.alt='(file missing on this device)'; });
}
/* PROOF OF DRAFT: fingerprints from the words kept here, checked against the ones they came in with */
async function proofItems(ps){ const out=[];
 for(const p of ps){ const ds=Object.values(DB.drafts).filter(d=>d.project===p.id).sort((a,b)=>a.added-b.added), list=[];
  for(const d of ds){ const s=await sha(TEXT[d.id]||''), real=/^[0-9a-f]{64}$/.test(s); list.push({label:d.label+(d.retired?', retired':''),kind:d.kind,file:filesOf(d),added:d.added,words:d.words,sha:real?s:'',ok:real&&/^[0-9a-f]{64}$/.test(d.hash||'')?d.hash===s:undefined}); }
  out.push({title:p.title,drafts:list}); }
 return out; }
const stamp=()=>new Date().toISOString().slice(0,10);
function saveText(name,text){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/plain'})); a.download=name.replace(/[^\w .-]+/g,'').trim()+'.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }
function vDrafts(p){
 const ds=draftsOf(p.id), c=current(p);
 let h='<p class="note">Every draft you brought in, oldest first. None is ever replaced. The current draft is the one Scenes reads.</p><div class="list">';
 let prev=null;
 ds.forEach(d=>{
  let cmp='';
  if(d.kind==='script'&&prev){ const r=T.compare(scenesOf(prev),scenesOf(d)); const pS=scenesOf(prev), pK=T.keys(pS), cK=T.keys(scenesOf(d)); let la=0,lc=0; r.changed.forEach(s=>{ const k=cK[scenesOf(d).indexOf(s)], q=pS[pK.indexOf(k)]; if(!q) return; const n=T.lineCounts(T.lineDiff(T.linesOf(q),T.linesOf(s))); la+=n.added; lc+=n.cut; });
   cmp='vs '+esc(prev.label)+': '+[r.changed.length+' changed',r.added.length+' added',r.removed.length+' cut',r.same.length+' the same'].join(', ')+(r.changed.length?' · lines: '+la+' new or rewritten, '+lc+' cut':'')
    +(r.changed.length?'<br><span class="note">Changed: '+esc(r.changed.slice(0,4).map(x=>x.heading).join(' · '))+(r.changed.length>4?' …':'')+'</span>':'')
    +(r.added.length?'<br><span class="note">Added: '+esc(r.added.slice(0,4).map(x=>x.heading).join(' · '))+'</span>':'')
    +(r.removed.length?'<br><span class="note">Cut: '+esc(r.removed.slice(0,4).map(x=>x.heading).join(' · '))+'</span>':''); }
  h+='<div class="li"><div class="w"><b>'+esc(d.label)+'</b> <span class="tag">'+d.kind+'</span>'+(c&&d.id===c.id?' <span class="tag cur">current</span>':'')+(d.retired?' <span class="tag red">retired</span>':'')
   +'<small>'+esc(filesOf(d))+' · '+esc(d.source)+' · added '+esc(day(d.added))+' · '+d.scenes+' scenes · '+d.words+' words'+(/^[0-9a-f]{64}$/.test(d.hash||'')?' · fingerprint '+d.hash.slice(0,8)+'…'+d.hash.slice(-4):'')+'</small>'+(cmp?'<small style="color:var(--ink-2)">'+cmp+'</small>':'')+'</div>'
   +'<div class="row">'+(d.kind==='script'&&!(c&&d.id===c.id)&&!d.retired?'<button class="btn sm" data-cur="'+d.id+'">MAKE CURRENT</button>':'')
   +'<button class="btn sm ghost" data-move="'+d.id+'">MOVE</button><button class="btn sm ghost" data-ret="'+d.id+'">'+(d.retired?'BRING BACK':'RETIRE')+'</button></div></div>';
  if(d.kind==='script'&&!d.retired) prev=d;
 });
 h+='</div><div class="row" style="margin-top:12px"><button class="btn" data-tab="add">ADD A DRAFT</button><button class="btn ghost" id="rename">RENAME PROJECT</button><button class="btn ghost" id="retp">'+(p.retired?'BRING PROJECT BACK':'RETIRE PROJECT')+'</button></div>';
 h+='<div class="eyebrow">Proof of draft</div><div class="panel" id="proof"><p class="note" style="margin-top:0">A receipt of every draft in '+esc(p.title)+': the day it came in and its fingerprint. A file with the same words gives the same fingerprint. It proves the words, not the date. For the date, email the receipt to yourself or register the script.</p>'
  +'<div class="row"><button class="btn pri" id="proofmk">PROOF OF DRAFT</button><label class="btn ghost"><input type="file" class="hide" id="proofchk" accept=".pdf,.fdx,.fountain,.txt,.md,.docx,text/plain,application/pdf">CHECK A FILE</label></div><div id="proofout"></div></div>';
 return h;
}
/* one character: every line they say, what the action lines say about them, their scenes, who they share scenes with.
   All quoted from the current draft. Nothing guessed about who they are. */
function vChar(p,name){
 const c=current(p); if(!c) return '<div class="panel">No script draft yet.</div>';
 const sc=scenesOf(c), S=T.sheet(name,sc), at=i=>'<a data-goscene="'+i+'">SC '+(i+1)+'</a> '+esc(sc[i].heading);
 let h='<button class="btn ghost sm" data-charback="1">\u2039 All characters in '+esc(p.title)+'</button>';
 h+='<div class="panel" style="margin-top:12px"><div class="eyebrow" style="margin-top:0">'+esc(c.label)+'</div><h2 style="margin:4px 0 6px">'+esc(name)+'</h2>'
  +'<p class="note" style="margin:0">'+S.lines.length+' line'+(S.lines.length===1?'':'s')+' · in '+S.scenes.length+' of '+sc.length+' scenes · named '+S.mentions.length+' time'+(S.mentions.length===1?'':'s')+' by the page or by someone else. Everything here is quoted from the draft.</p></div>';
 h+='<div class="eyebrow">Shares scenes with</div><p class="note" style="margin-top:0">'+(S.with.length?S.with.map(x=>esc(x.name)+' ('+x.scenes+')').join(', '):'Nobody.')+'</p>';
 h+='<div class="eyebrow">What the page and the others say</div><div class="list">'+(S.mentions.length?S.mentions.slice(0,60).map(x=>'<div class="li"><div class="w">'+esc(x.text)+'<small>'+at(x.i)+(x.by?' · '+esc(x.by)+' says it':'')+'</small></div></div>').join('')+(S.mentions.length>60?'<div class="li note">and '+(S.mentions.length-60)+' more</div>':''):'<div class="li note">Not named outside their own lines.</div>')+'</div>';
 h+='<div class="eyebrow">Every line</div><div class="list">'+(S.lines.length?S.lines.map(x=>'<div class="li"><div class="w">'+esc(x.text)+'<small>'+at(x.i)+'</small></div></div>').join(''):'<div class="li note">No lines. Seen, not heard.</div>')+'</div>';
 return h;
}
/* every character across your projects, from each one's current draft. A name in two projects is two names until you say otherwise. */
function vAllChars(){
 const P=projects().map(p=>({p,c:current(p)})).filter(x=>x.c);
 if(!P.length) return '<div class="panel">No script drafts yet. <button class="btn sm" data-tab="add">ADD DRAFTS</button></div>';
 const A=T.allChars(P.map(x=>({id:x.p.id,title:x.p.title,scenes:scenesOf(x.c)}))), twice=A.filter(x=>x.in.length>1);
 let h='<p class="note">Every character in the current draft of each project'+(P.length>1?', all '+P.length+' projects':'')+'. Tap a project to see that one.</p>';
 h+='<div class="stats"><div><b>'+A.length+'</b><span>names</span></div><div><b>'+P.length+'</b><span>projects</span></div><div><b>'+twice.length+'</b><span>names in more than one</span></div></div>';
 if(twice.length) h+='<div class="eyebrow">The same name in different projects</div><p class="note" style="margin-top:-4px">Same name, not the same person unless you say so. Listed so you know.</p><div class="list">'+twice.map(x=>'<div class="li"><div class="w"><b>'+esc(x.name)+'</b><small>'+x.in.map(y=>'<a data-charin="'+esc(y.pid)+'|'+esc(x.name)+'">'+esc(y.title)+'</a> ('+y.lines+' line'+(y.lines===1?'':'s')+')').join(' · ')+'</small></div></div>').join('')+'</div>';
 h+='<div class="eyebrow">Everyone</div><div class="list">'+A.map(x=>'<div class="li"><div class="w"><b>'+esc(x.name)+'</b><small>'+x.in.map(y=>'<a data-charin="'+esc(y.pid)+'|'+esc(x.name)+'">'+esc(y.title)+'</a> ('+y.lines+')').join(' · ')+'</small></div></div>').join('')+'</div>';
 return h;
}
/* ---------- SOUNDS LIKE YOU: one scene next to everything else you kept here. Counts and your closest lines. No score. ---------- */
let VOICE={from:'',text:'',who:'',on:false}; const VCACHE={};
function vUnitsOf(p,c){ const k=c.id+'|'+(c.hash||''); if(!VCACHE[k]){ let sc=scenesOf(c); if(!sc.length) sc=T.vScenes(TEXT[c.id]||''); VCACHE[k]={sc,u:T.vUnits(sc,{pid:p.id,title:p.title})}; } return VCACHE[k]; }
function voiceData(){
 const P=projects().filter(p=>!p.retired).map(p=>({p,c:current(p)})).filter(x=>x.c), all=[];
 P.forEach(x=>vUnitsOf(x.p,x.c).u.forEach(u=>all.push(u)));
 let mine=[], base=all, from=null;
 if(VOICE.from){ const [pid,i]=VOICE.from.split('|'), x=P.find(y=>y.p.id===pid);
  if(x){ const n=Number(i), sc=vUnitsOf(x.p,x.c).sc[n]; from={p:x.p,i:n,heading:sc?sc.heading:''}; mine=all.filter(u=>u.pid===pid&&u.i===n); base=all.filter(u=>!(u.pid===pid&&u.i===n)); } }
 else if(VOICE.on&&VOICE.text.trim()) mine=T.vUnits(T.vScenes(VOICE.text),{title:'Pasted'});
 const speakers=[...new Set(mine.filter(u=>u.who).map(u=>T.norm(u.who)))];
 if(VOICE.who&&VOICE.who!=='action'&&!speakers.includes(VOICE.who)) VOICE.who='';
 return {P,all,mine,base,from,speakers};
}
function vVoice(){
 const D=voiceData(), P=D.P;
 let h='<p class="note">Put one scene next to everything else you\'ve kept in here. You get the lines of yours it\'s closest to, and the counts side by side. It doesn\'t say whether it sounds like you. You decide.</p>';
 if(!P.length) return h+'<div class="panel">Nothing to compare with yet. It compares with the drafts you keep in Paper Trail: the current draft of each project. <button class="btn sm" data-tab="add">ADD DRAFTS</button></div>';
 h+='<div class="panel"><label class="note" for="vfrom">The scene</label><select class="field" id="vfrom"><option value="">Paste a scene</option>'
  +P.map(x=>'<optgroup label="'+esc(x.p.title)+'">'+vUnitsOf(x.p,x.c).sc.map((s,i)=>{ const v=x.p.id+'|'+i; return '<option value="'+esc(v)+'"'+(VOICE.from===v?' selected':'')+'>SC '+(i+1)+(s.heading?' '+esc(s.heading):'')+'</option>'; }).join('')+'</optgroup>').join('')+'</select>';
 if(!VOICE.from) h+='<textarea class="field" id="vtext" style="margin-top:8px" placeholder="Paste a scene, a speech, a page. Script or prose.">'+esc(VOICE.text)+'</textarea><div class="row" style="margin-top:8px"><button class="btn pri" id="vgo">COMPARE</button></div>';
 if(D.mine.length) h+='<label class="note" for="vwho" style="display:block;margin-top:10px">Whose lines</label><select class="field" id="vwho"><option value="">Everything</option><option value="action"'+(VOICE.who==='action'?' selected':'')+'>Just the action</option>'
  +D.speakers.map(n=>'<option value="'+esc(n)+'"'+(VOICE.who===n?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select>';
 h+='</div>';
 if(!D.mine.length) return h+(VOICE.on&&!VOICE.from?'<p class="note">Nothing to read in that.</p>':'');
 const W=VOICE.who, isA=W==='action', pick=u=>isA?!u.who:W?u.who&&T.norm(u.who)===W:true, inBase=u=>isA?!u.who:W?!!u.who:true;
 const mine=D.mine.filter(pick), base=D.base.filter(inBase);
 const here=D.from?D.from.p.title+', SC '+(D.from.i+1):'What you pasted';
 const cols=[[isA?'The action here':W?W+' here':'This scene',mine]];
 if(W&&!isA&&D.from){ const el=D.base.filter(u=>u.pid===D.from.p.id&&u.who&&T.norm(u.who)===W); if(el.length) cols.push([W+' in the rest of '+D.from.p.title,el]); }
 cols.push([isA?'All your action':W?'All the dialogue you wrote':'Everything else you wrote here',base]);
 const byP=P.map(x=>base.filter(u=>u.pid===x.p.id)).filter(a=>a.length), ranges=byP.length>1?byP.map(T.vMeasure):null;
 const M=cols.map(c=>T.vMeasure(c[1])), bw=M[M.length-1].words;
 h+='<div class="eyebrow">'+esc(here)+'</div><p class="note" style="margin-top:-4px">Compared with '+T.vText('words',bw)+' words from '+byP.length+' project'+(byP.length===1?'':'s')+', the current draft of each'+(D.from?', this scene left out':'')+'.'+(bw<2000?' That\'s not a lot to compare with.':'')+'</p>';
 h+='<div class="tbl" id="vnums"><table><tr><th></th>'+cols.map(c=>'<th>'+esc(c[0])+'</th>').join('')+(ranges?'<th>Lowest to highest, project by project</th>':'')+'</tr>'
  +T.VROWS.map(([k,l])=>'<tr><td>'+esc(l)+'</td>'+M.map(m=>'<td>'+T.vText(k,m[k])+'</td>').join('')
   +(ranges?'<td>'+(()=>{ const v=ranges.map(r=>r[k]).filter(x=>x!=null); return v.length?T.vText(k,Math.min(...v))+' to '+T.vText(k,Math.max(...v)):'–'; })()+'</td>':'')+'</tr>').join('')+'</table></div>';
 h+='<p class="note">Counts only, from the page. What they mean is yours.</p>';
 const names=[...new Set(D.all.concat(D.mine).filter(u=>u.who).map(u=>u.who))];
 const C=T.vClosest(mine,base,names,6), say=u=>(u.who?u.who+': ':'')+u.text, at=u=>esc(u.title)+(u.heading?' · SC '+(u.i+1)+' '+esc(u.heading):'');
 h+='<div class="eyebrow">Your closest lines</div><p class="note" style="margin-top:-4px">Matched on the uncommon words they share. Names don\'t count. A word match, not a judgment: it can miss the same idea said another way.</p>';
 h+='<div class="list" id="vclose">'+(C.pairs.length?C.pairs.map(x=>'<div class="li"><div class="w"><small>HERE</small>'+esc(say(x.mine))+'<small style="margin-top:6px">YOURS · '+(x.yours.pid?'<a data-vgo="'+esc(x.yours.pid+'|'+x.yours.i)+'">'+at(x.yours)+'</a>':at(x.yours))+'</small>'+esc(say(x.yours))+'<small>Shared: '+esc(x.words.join(', '))+'</small></div></div>').join('')
  :'<div class="li note">No line of yours shares two uncommon words with this.</div>')+'</div>';
 if(C.same.length) h+='<p class="note">'+C.same.length+' line'+(C.same.length===1?' here is':'s here are')+' word for word in your other drafts, so '+(C.same.length===1?'it isn\'t':'they aren\'t')+' shown as matches: '+C.same.slice(0,3).map(u=>'“'+esc(u.text.length>80?u.text.slice(0,79)+'…':u.text)+'”').join(' ')+(C.same.length>3?' and '+(C.same.length-3)+' more.':'')+'</p>';
 return h;
}
/* ---------- PACKAGE: what this script needs to go out. Facts from the pages; each piece drafted from your own lines
   (DRAFT FROM MY PAGES) or written by you. Nothing is sent from here. ---------- */
function pkOf(p){ p.package=p.package||{kind:'feature',genre:'',by:''}; return p.package; }
function pkCtx(p){ const c=current(p), sc=c?scenesOf(c):[], pk=pkOf(p); let you={}; try{ you=window.You?You.get():{}; }catch(e){}
 return {title:p.title,scenes:sc,text:c?TEXT[c.id]||'':'',kind:pk.kind,facts:T.pkFacts(sc,c?TEXT[c.id]||'':'',pk.kind),you:Object.assign({},you,{name:pk.by||you.name||''}),genre:pk.genre,logline:pk.logline,short:pk.short}; }
function vPackage(p){
 const c=current(p); if(!c) return '<div class="panel">A package needs a script draft. <button class="btn sm" data-tab="add">ADD DRAFTS</button></div>';
 const pk=pkOf(p), X=pkCtx(p), F=X.facts;
 let h='<p class="note">What this script needs to go out, in one place. Each piece: write it yourself, or DRAFT FROM MY PAGES and rewrite what it pulls from your script. Nothing is sent from here.</p>';
 h+='<div class="panel"><div class="eyebrow" style="margin-top:0">The script</div><div class="row" style="gap:8px;margin-bottom:8px"><select class="field" id="pkkind" style="flex:1 1 140px">'+T.PK_KINDS.map(k=>'<option value="'+k[0]+'"'+(pk.kind===k[0]?' selected':'')+'>'+k[1]+'</option>').join('')+'</select><input class="field" id="pkgenre" placeholder="Genre (your words)" value="'+esc(pk.genre||'')+'" style="flex:1 1 140px"><input class="field" id="pkby" placeholder="Written by" value="'+esc(pk.by||X.you.name||'')+'" style="flex:1 1 140px"></div>'
  +'<p class="note" style="margin:0" id="pkfacts">'+esc(c.label)+' · '+F.scenes+' scenes · '+F.speakers+' speaking parts'+(F.lead?' · the most lines: '+esc(F.lead):'')+'<br>'+esc(F.pageWords)+' Writer\u2019s Blockage gives the exact count.<br>'+esc(F.titleWords)+'</p></div>';
 T.PK_PIECES.forEach(([k,label,say])=>{ const v=pk[k]||'';
  h+='<div class="panel" data-pkcard="'+k+'"><div class="row" style="justify-content:space-between"><div class="eyebrow" style="margin:0">'+label+'</div><button class="btn sm ghost" data-pkdraft="'+k+'">DRAFT FROM MY PAGES</button></div>'
   +'<p class="note" style="margin:4px 0 8px">'+esc(say)+'</p><textarea class="field" data-pk="'+k+'" style="min-height:'+(k==='treatment'||k==='synopsis'?'180':k==='query'?'200':'80')+'px">'+esc(v)+'</textarea><p class="note" id="pkc_'+k+'" style="margin:6px 0 0">'+esc(T.pkCheck(k,v))+'</p></div>'; });
 h+='<div class="eyebrow">Send it out</div><div class="panel"><div class="row"><button class="btn pri" id="pkpdf">SAVE THE PACKAGE (.pdf)</button><button class="btn" id="pkscript">SCRIPT PDF</button><button class="btn ghost" id="pkq">COPY THE QUERY</button><button class="btn ghost" data-tab="drafts">PROOF OF DRAFT</button><button class="btn ghost" data-tab="sent">SENT OUT</button></div>'
  +'<p class="note" style="margin:8px 0 0">The package: a title page, the one-sheet (logline, short synopsis, characters, the facts), the synopsis and the treatment, in Courier. Pieces you leave empty stay out. SCRIPT PDF opens this draft in Writer\u2019s Blockage for the formatted screenplay with its title page.</p></div>';
 return h;
}
function pkSections(p){ const pk=pkOf(p), X=pkCtx(p), F=X.facts, by=pk.by||X.you.name||'', y=X.you||{}, K=(T.PK_KINDS.find(k=>k[0]===pk.kind)||T.PK_KINDS[0])[1];
 const S=[{title:'',paras:['','','','','','',String(p.title||'Untitled').toUpperCase(),'',by?'Written by':'',by,'','','','','','',[y.email,y.phone].filter(Boolean).join('   '),y.rep?'Represented by '+y.rep+(y.repPhone?', '+y.repPhone:''):'']}];
 const one=[]; if(pk.logline) one.push('LOGLINE','',pk.logline,''); if(pk.short) one.push('SYNOPSIS','',pk.short,''); if(pk.characters) one.push('CHARACTERS','',pk.characters,'');
 one.push('THE SCRIPT','',K+(pk.genre?', '+pk.genre:'')+'. About '+F.pages+' pages.'+(by?' Written by '+by+'.':''));
 S.push({title:String(p.title||'Untitled').toUpperCase()+': ONE-SHEET',paras:one,page:true});
 if(pk.synopsis) S.push({title:'SYNOPSIS',paras:pk.synopsis.split(/\n\s*\n/),page:true});
 if(pk.treatment) S.push({title:'TREATMENT',paras:pk.treatment.split(/\n\s*\n/),page:true});
 return S; }
/* ---------- SENT OUT: where each script went. Per project, and all of them together. ---------- */
const WHERE='<details class="panel" id="where"><summary class="eyebrow" style="margin:0;cursor:pointer">Where a script can go, without an agent</summary>'
 +'<p class="note">Checked October 2026. The rules change every year: check their site before you pay.</p>'
 +'<p><b>Contests and fellowships</b> take scripts from anyone, usually for a fee, once a year. The Nicholl (the Academy\u2019s) took its 2026 entries only through the Black List or the Writers Guild Foundation, each with a cap. Others writers name: Austin Film Festival, the PAGE Awards, Script Pipeline.</p>'
 +'<p><b>Hosting sites.</b> The Black List hosts your script where industry readers can find it, for a monthly fee, with paid evaluations.</p>'
 +'<p><b>Managers and agents.</b> A query letter first (it\u2019s in Package). Many don\u2019t read queries they didn\u2019t ask for. A placing in a known contest gets read.</p>'
 +'<p><b>Production companies.</b> Most won\u2019t read a script that doesn\u2019t come through a rep, or without a signed release form. If one sends you a release, read it before you sign.</p>'
 +'<p><b>Festivals</b> take films, not scripts, except their screenplay contests (Austin has one). A short you made goes in FILM.</p>'
 +'<p class="note">Sources: <a href="https://press.oscars.org/news/academy-announces-partners-2026-2027-nicholl-fellowships-screenwriting-program" target="_blank" rel="noopener">the Academy on the 2026 Nicholl</a> · <a href="https://wgfoundation.org/nicholl" target="_blank" rel="noopener">Writers Guild Foundation</a> · <a href="https://www.scriptreaderpro.com/screenwriting-contests/" target="_blank" rel="noopener">Script Reader Pro on contests</a></p></details>';
let SENTF='all';
const today=()=>new Date().toISOString().slice(0,10);
function sendRow(e,title,pid){ return '<div class="li" data-send="'+e.id+'"><div class="w">'+(title?'<a data-sopen="'+esc(pid)+'">'+esc(title)+'</a> \u00b7 ':'')+'<b>'+esc(e.where||'(where?)')+'</b>'
  +'<small>'+esc(T.sendWords(e))+'</small>'+(e.notes?'<small>'+esc(e.notes)+'</small>':'')+(e.link?'<small><a href="'+esc(e.link)+'" target="_blank" rel="noopener">'+esc(e.link.replace(/^https?:\/\//,'').slice(0,40))+'</a></small>':'')
  +'<div class="row" style="gap:4px;margin-top:6px">'+T.SEND_STATUS.map(([k,l])=>'<button class="btn sm'+(e.status===k?' pri':' ghost')+'" data-sst="'+esc(pid)+'|'+e.id+'|'+k+'">'+esc(l)+'</button>').join('')+'</div></div>'
  +'<button class="btn sm ghost" data-sdel="'+esc(pid)+'|'+e.id+'">DELETE</button></div>'; }
function dueHtml(rows){ return rows.length?'<div class="panel" style="border-color:var(--gold)">'+rows.map(x=>'<p style="margin:2px 0"><b>'+(x.days===0?'Deadline today':'Deadline in '+x.days+' day'+(x.days===1?'':'s'))+':</b> '+esc(x.e.where)+(x.title?' ('+esc(x.title)+')':'')+'</p>').join('')+'</div>':''; }
function vSent(p){
 const L=(p.sends=p.sends||[]).slice().sort((a,b)=>String(b.sent||b.deadline||'').localeCompare(String(a.sent||a.deadline||''))), ds=draftsOf(p.id).filter(d=>d.kind==='script'), c=current(p);
 let h='<p class="note">Where '+esc(p.title)+' has gone: contests, managers, companies, festivals. When, which draft, the fee, and what came back, in your marks.</p>';
 h+='<div class="stats"><div style="flex:1"><span>'+esc(T.sendSummary(L))+'</span></div></div>'+dueHtml(T.sendDue(L).map(x=>Object.assign(x,{title:''})));
 h+='<details class="panel" id="saddbox"'+(L.length?'':' open')+'><summary class="eyebrow" style="margin:0;cursor:pointer">Add where you sent it</summary>'
  +'<input class="field" id="sw" placeholder="Where (the contest, the manager, the company)" style="margin-top:8px">'
  +'<div class="row" style="gap:6px;margin-top:6px"><select class="field" id="sk" style="flex:1 1 140px">'+T.SEND_KINDS.map(([k,l])=>'<option value="'+k+'">'+l+'</option>').join('')+'</select><select class="field" id="ss" style="flex:1 1 140px">'+T.SEND_STATUS.map(([k,l])=>'<option value="'+k+'"'+(k==='sent'?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'
  +'<div class="row" style="gap:6px;margin-top:6px"><label class="note" style="flex:1 1 120px">Sent<input class="field" type="date" id="sd" value="'+today()+'"></label><label class="note" style="flex:1 1 120px">Deadline<input class="field" type="date" id="sdl"></label><label class="note" style="flex:1 1 90px">Fee<input class="field" id="sf" placeholder="$0" inputmode="decimal"></label></div>'
  +'<select class="field" id="sdr" style="margin-top:6px">'+ds.map(d=>'<option value="'+esc(d.id)+'"'+(c&&d.id===c.id?' selected':'')+'>Which draft: '+esc(d.label)+'</option>').join('')+'</select>'
  +'<input class="field" id="sl" placeholder="Link (optional)" style="margin-top:6px"><textarea class="field" id="sn" placeholder="Notes (who, what they said)" style="margin-top:6px;min-height:60px"></textarea>'
  +'<div class="row" style="margin-top:8px"><button class="btn pri" id="sadd">ADD IT</button></div></details>';
 h+='<div class="list">'+(L.length?L.map(e=>sendRow(e,'',p.id)).join(''):'<div class="li note">Nothing sent yet.</div>')+'</div>';
 return h+WHERE;
}
function allSends(){ const R=[]; projects().forEach(p=>(p.sends||[]).forEach(e=>R.push({e,title:p.title,pid:p.id}))); return R.sort((a,b)=>String(b.e.sent||b.e.deadline||'').localeCompare(String(a.e.sent||a.e.deadline||''))); }
function vAllSent(){
 const R=allSends(), counts={}; R.forEach(r=>counts[r.e.status]=(counts[r.e.status]||0)+1);
 let h='<p class="note">Everywhere your scripts have gone, every project. Tap a title to open that project.</p>';
 h+='<div class="stats"><div style="flex:1"><span>'+esc(T.sendSummary(R.map(r=>r.e)))+'</span></div></div>'+dueHtml(T.sendDue(R.map(r=>r.e)).map(x=>Object.assign(x,{title:(R.find(r=>r.e===x.e)||{}).title})));
 if(R.length) h+='<div class="row" style="gap:4px;margin-bottom:10px">'+[['all','All']].concat(T.SEND_STATUS.filter(([k])=>counts[k])).map(([k,l])=>'<button class="btn sm'+(SENTF===k?' pri':' ghost')+'" data-sf="'+k+'">'+esc(l)+(k==='all'?'':' '+counts[k])+'</button>').join('')+'</div>';
 const F=R.filter(r=>SENTF==='all'||r.e.status===SENTF);
 h+='<div class="list">'+(F.length?F.map(r=>sendRow(r.e,r.title,r.pid)).join(''):'<div class="li note">'+(R.length?'Nothing marked that.':'Nothing sent yet. Open a project, then SENT OUT.')+'</div>')+'</div>';
 if(R.length) h+='<div class="row" style="margin-top:10px"><button class="btn ghost" id="stxt">SAVE AS TEXT</button></div>';
 return h+WHERE;
}
function vChars(p){
 const ds=draftsOf(p.id).filter(d=>d.kind==='script'&&!d.retired);
 if(!ds.length) return '<div class="panel">No script drafts yet.</div>';
 const C=T.characters(ds.map(d=>({id:d.id,scenes:scenesOf(d)})));
 return '<p class="note">Lines per draft. A name that disappears from a draft shows a dash. Tap a name for everything the script says about them.</p><div class="tbl"><table><tr><th>Character</th>'+ds.map(d=>'<th>'+esc(d.label)+'</th>').join('')+'</tr>'
  +C.map(x=>'<tr><td><a data-char="'+esc(x.name)+'"><b>'+esc(x.name)+'</b></a>'+(x.voice?' <span class="tag">voice</span>':'')+'</td>'+ds.map(d=>'<td>'+(x.by[d.id]==null?'–':x.by[d.id])+'</td>').join('')+'</tr>').join('')+'</table></div>'
  +talkBox(ds)+numbersBox(ds);
}
function talkBox(ds){
 const p=DB.projects[VIEW.p], cur=p&&current(p), c=ds.find(d=>cur&&d.id===cur.id)||ds[ds.length-1];
 const L=T.talk(TEXT[c.id]||''); if(!L.length) return '';
 return '<h3 style="margin-top:22px">How they talk</h3><p class="note">'+esc(c.label)+'. Counts only, from the page. Questions = speeches that ask one. Longest = words in the longest speech. What they mean is yours.</p><div class="tbl" id="talk"><table><tr><th>Character</th><th>Speeches</th><th>Words a speech</th><th>Words a sentence</th><th>Questions</th><th>Longest</th></tr>'
  +L.map(x=>'<tr><td><b>'+esc(x.name)+'</b></td><td>'+x.speeches+'</td><td>'+x.perSpeech+'</td><td>'+x.perSentence+'</td><td>'+x.questions+'</td><td>'+x.longest+'</td></tr>').join('')+'</table></div>';
}
const NUMS={};
function numbersBox(ds){
 const N=ds.map(d=>NUMS[d.id+'|'+d.hash]||(NUMS[d.id+'|'+d.hash]=T.numbers(TEXT[d.id]||'')));
 return '<h3 style="margin-top:22px">The numbers, draft by draft</h3><p class="note">Counts only. What they mean is yours.</p><div class="tbl" id="numbers"><table><tr><th></th>'+ds.map(d=>'<th>'+esc(d.label)+'</th>').join('')+'</tr>'
  +T.NUMROWS.map(([k,l])=>'<tr><td>'+esc(l)+'</td>'+N.map(n=>'<td>'+esc(n?T.numberText(k,n[k]):'–')+'</td>').join('')+'</tr>').join('')+'</table></div>';
}

/* ---------- wiring ---------- */
function go(tab){ VIEW.tab=tab; VIEW.scene=null; render(); window.scrollTo(0,0); }
function wire(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ VIEW.char=null; go(b.dataset.tab); });
 if(window.Kit) Kit.wire($('main'),{ say:()=>kitGo('bones','mic'), rec:()=>{ if(RECORDING){ try{ RECORDING.stop(); }catch(e){} return; } kitGo('research','rrec'); }, photo:()=>kitGo('research','rcam') });
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ if(b.dataset.go==='projects'){ VIEW.p=null; } VIEW.scene=null; go(b.dataset.go); });
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ VIEW.p=b.dataset.open; VIEW.scene=null; go('scenes'); });
 document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{ VIEW.scene=Number(b.dataset.scene); render(); window.scrollTo(0,0); });
 document.querySelectorAll('[data-goscene]').forEach(b=>b.onclick=()=>{ VIEW.tab='scenes'; VIEW.scene=Number(b.dataset.goscene); render(); window.scrollTo(0,0); });
 document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{ VIEW.scene=null; render(); });
 /* SENT OUT */
 { const p=VIEW.p&&DB.projects[VIEW.p];
  const sa=$('sadd'); if(sa&&p) sa.onclick=()=>{ const w=$('sw').value.trim(); if(!w){ toast('Where did it go?'); return; } const d=DB.drafts[$('sdr').value];
   p.sends=p.sends||[]; p.sends.push({id:rid('s'),where:w,kind:$('sk').value,status:$('ss').value,sent:$('ss').value==='planned'?'':$('sd').value,deadline:$('sdl').value,fee:$('sf').value.trim(),draftId:d?d.id:'',draft:d?d.label+(/^[0-9a-f]{64}$/.test(d.hash||'')?', fingerprint '+d.hash.slice(0,8):''):'',link:$('sl').value.trim(),notes:$('sn').value.trim(),at:Date.now()});
   p.updated=Date.now(); save(); render(); toast('Added.'); };
  document.querySelectorAll('[data-sst]').forEach(b=>b.onclick=()=>{ const [pid,id,k]=b.dataset.sst.split('|'), q=DB.projects[pid], e=q&&(q.sends||[]).find(x=>x.id===id); if(!e) return;
   e.status=k; if(k==='planned') {} else if(!e.sent) e.sent=today(); if(['asked','advanced','won','passed'].includes(k)) e.heard=today(); q.updated=Date.now(); save(); render(); });
  document.querySelectorAll('[data-sdel]').forEach(b=>b.onclick=()=>{ const [pid,id]=b.dataset.sdel.split('|'), q=DB.projects[pid]; if(!q||!confirm('Delete this one from the list?')) return; q.sends=(q.sends||[]).filter(x=>x.id!==id); save(); render(); });
  document.querySelectorAll('[data-sf]').forEach(b=>b.onclick=()=>{ SENTF=b.dataset.sf; render(); });
  document.querySelectorAll('[data-sopen]').forEach(a=>a.onclick=()=>{ VIEW.p=a.dataset.sopen; go('sent'); });
  const st=$('stxt'); if(st) st.onclick=()=>saveText('Paper Trail sent out '+stamp(),T.sendText(allSends()));
 }
 /* PACKAGE */
 { const p=VIEW.p&&DB.projects[VIEW.p]; if(VIEW.tab==='package'&&p){ const pk=pkOf(p);
  document.querySelectorAll('[data-pk]').forEach(t=>t.oninput=()=>{ pk[t.dataset.pk]=t.value; p.updated=Date.now(); save(); const ck=$('pkc_'+t.dataset.pk); if(ck) ck.textContent=T.pkCheck(t.dataset.pk,t.value); });
  [['pkkind','kind'],['pkgenre','genre'],['pkby','by']].forEach(([id,k])=>{ const el=$(id); if(el) el[el.tagName==='SELECT'?'onchange':'oninput']=()=>{ pk[k]=el.value; save(); if(k==='kind') render(); }; });
  document.querySelectorAll('[data-pkdraft]').forEach(b=>b.onclick=()=>{ const k=b.dataset.pkdraft; if((pk[k]||'').trim()&&!confirm('Replace what you have here with a draft from your pages?')) return; pk[k]=T.pkDraft(k,pkCtx(p)); save(); render(); const t=document.querySelector('[data-pk="'+k+'"]'); if(t){ t.scrollIntoView({block:'center'}); } toast('Drafted from your own lines. Rewrite it in your words.'); });
  const pf=$('pkpdf'); if(pf) pf.onclick=()=>{ if(!window.TextPDF) return; const b=new Blob([TextPDF.make(pkSections(p),{font:'Courier'})],{type:'application/pdf'}), a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=(p.title+' package').replace(/[^\w .-]+/g,'').trim()+'.pdf'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); };
  const ps=$('pkscript'); if(ps) ps.onclick=()=>{ const c=current(p); if(!c) return; try{ localStorage.setItem('theactorpage_handoff_premise',JSON.stringify({from:'papertrail',title:p.title,fountain:TEXT[c.id]||'',at:Date.now()})); }catch(e){} location.href='../write/writers-blockage.html'; };
  const pq=$('pkq'); if(pq) pq.onclick=()=>{ const t=pk.query||T.pkDraft('query',pkCtx(p)); try{ navigator.clipboard.writeText(t).then(()=>toast('The query is copied.'),()=>toast('Could not copy here.')); }catch(e){ toast('Could not copy here.'); } };
 } }
 /* PROOF OF DRAFT */
 const pm=$('proofmk'); if(pm) pm.onclick=async()=>{ const p=DB.projects[VIEW.p]; if(!p) return; const t=T.proof(await proofItems([p]),Date.now()), o=$('proofout');
  o.innerHTML='<div class="read" style="margin-top:10px">'+esc(t)+'</div><div class="row" style="margin-top:8px"><button class="btn sm" id="pcopy">COPY</button><button class="btn sm ghost" id="psave">SAVE AS TEXT</button></div>';
  $('pcopy').onclick=()=>{ try{ navigator.clipboard.writeText(t).then(()=>toast('Copied.'),()=>toast('Could not copy. Save it as text.')); }catch(e){ toast('Could not copy. Save it as text.'); } };
  $('psave').onclick=()=>saveText(p.title+' proof of draft '+stamp(),t); };
 const pc=$('proofchk'); if(pc) pc.onchange=async()=>{ const f=pc.files[0]; if(!f) return; const p=DB.projects[VIEW.p], o=$('proofout'); let t;
  try{ t=await readFile(f); }catch(e){ o.innerHTML='<p class="note">'+esc(f.name+': '+e.message)+'</p>'; return; }
  const s=await sha(t), m=Object.values(DB.drafts).find(d=>d.hash===s);
  let h='<div class="read" style="margin-top:10px">'+esc(f.name)+'\nSHA-256 '+esc(s)+'</div>';
  if(m){ const mp=DB.projects[m.project]; h+='<p><b>Same words as '+esc(mp?mp.title:'')+', '+esc(m.label)+'.</b> Word for word. It came in '+esc(T.utc(m.added))+'.</p>'; }
  else { h+='<p><b>No draft here has these exact words.</b></p>';
   const L=x=>String(x||'').split('\n').map(y=>y.trim()).filter(Boolean), mine=L(t);
   const near=Object.values(DB.drafts).filter(d=>p&&d.project===p.id).map(d=>{ const A=new Set(L(TEXT[d.id]).map(T.lineHash)), B=new Set(mine.map(T.lineHash)); return {d,n:{added:mine.filter(x=>!A.has(T.lineHash(x))).length,cut:L(TEXT[d.id]).filter(x=>!B.has(T.lineHash(x))).length}}; }).sort((a,b)=>(a.n.added+a.n.cut)-(b.n.added+b.n.cut))[0];
   if(near) h+='<p class="note">Nearest in '+esc(p.title)+': '+esc(near.d.label)+'. This file has '+near.n.added+' line'+(near.n.added===1?'':'s')+' new or changed and '+near.n.cut+' cut against it.</p>'; }
  o.innerHTML=h; pc.value=''; };
 const pa=$('proofall'); if(pa) pa.onclick=async()=>{ const ps=Object.values(DB.projects).sort((a,b)=>String(a.title).localeCompare(String(b.title))); if(!ps.length) return toast('No drafts yet.'); saveText('Paper Trail proof of every draft '+stamp(),T.proof(await proofItems(ps),Date.now())); };
 /* SOUNDS LIKE YOU */
 const vf=$('vfrom'); if(vf) vf.onchange=()=>{ VOICE.from=vf.value; VOICE.who=''; render(); };
 const vg=$('vgo'); if(vg) vg.onclick=()=>{ VOICE.text=$('vtext').value; VOICE.on=true; VOICE.who=''; render(); };
 const vt=$('vtext'); if(vt) vt.oninput=()=>{ VOICE.text=vt.value; };
 const vw=$('vwho'); if(vw) vw.onchange=()=>{ VOICE.who=vw.value; render(); };
 document.querySelectorAll('[data-vfrom]').forEach(b=>b.onclick=()=>{ VOICE.from=b.dataset.vfrom; VOICE.who=''; go('voice'); });
 document.querySelectorAll('[data-vgo]').forEach(a=>a.onclick=()=>{ const [pid,i]=a.dataset.vgo.split('|'); VIEW.p=pid; VIEW.tab='scenes'; VIEW.scene=Number(i); render(); window.scrollTo(0,0); });
 const d=$('drop');
 if(d){ d.onclick=()=>$('file').click(); d.ondragover=e=>{e.preventDefault();d.classList.add('over');}; d.ondragleave=()=>d.classList.remove('over');
  d.ondrop=e=>{ e.preventDefault(); d.classList.remove('over'); if(e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]); }; }
 const r=$('readit'); if(r) r.onclick=async()=>{ const t=$('paste').value; if(!t.trim()) return; ADDED=[await addDraft(t,($('ptitle').value.trim()||'Pasted')+'.txt','paste',{title:$('ptitle').value.trim()||undefined})]; render(); };
 document.querySelectorAll('[data-shelf]').forEach(b=>b.onclick=async()=>{ const it=SH.get(b.dataset.shelf); if(!it) return; ADDED=[await addDraft(it.text,it.file||'Shelf sides','shelf',{shelfId:it.id})]; render(); });
 const p=VIEW.p&&DB.projects[VIEW.p];
 if(p&&VIEW.scene!=null){
  const c=current(p)||board(p), keys=T.keys(scenesOf(c)), k=keys[VIEW.scene], cd=card(p,k);
  document.querySelectorAll('[data-card]').forEach(i=>i.oninput=()=>{ cd[i.dataset.card]=i.value; p.updated=Date.now(); save(); });
  document.querySelectorAll('[data-addto]').forEach(b=>b.onclick=()=>{ const v=prompt(b.dataset.addto==='cast'?'Add to the cast':'Add a prop'); if(!v||!v.trim()) return; cd[b.dataset.addto]=(cd[b.dataset.addto]||[]).concat([v.trim()]); save(); render(); });
  document.querySelectorAll('[data-rm]').forEach(a=>a.onclick=()=>{ cd[a.dataset.rm].splice(Number(a.dataset.j),1); save(); render(); });
  const db=$('decb'); if(db) db.onclick=()=>{ const v=$('dec').value.trim(); if(!v) return; cd.decisions=(cd.decisions||[]).concat([{at:Date.now(),text:v}]); p.updated=Date.now(); save(); render(); toast('Logged.'); };
  const ref={key:k,heading:scenesOf(c)[VIEW.scene].heading}; p.threads=p.threads||[];
  const th=(kind,q)=>{ const v=prompt(q); if(!v||!v.trim()) return; p.threads.push({id:rid('t'),kind:kind,what:v.trim(),at:Date.now(),plant:ref,payoff:null,learns:[]}); p.updated=Date.now(); save(); render(); };
  const a1=$('thsetup'); if(a1) a1.onclick=()=>th('setup','What gets set up here? e.g. the paper ticket, Mom\'s pills');
  const a2=$('thsecret'); if(a2) a2.onclick=()=>th('secret','What is the secret? e.g. Rennie already bought the ticket');
  const pb=$('payb'); if(pb) pb.onclick=()=>{ const x=p.threads.find(y=>y.id===$('paysel').value); if(!x) return; x.payoff=ref; p.updated=Date.now(); save(); render(); toast('Pays off here.'); };
  const lb=$('learnb'); if(lb) lb.onclick=()=>{ const x=p.threads.find(y=>y.id===$('secsel').value), who=$('whosel').value; if(!x||!who) return; x.learns=(x.learns||[]).filter(l=>T.norm(l.who)!==T.norm(who)).concat([{who:who,key:ref.key,heading:ref.heading}]); p.updated=Date.now(); save(); render(); toast(who+' learns it here.'); };
  document.querySelectorAll('[data-unpay]').forEach(a=>a.onclick=()=>{ const x=p.threads.find(y=>y.id===a.dataset.unpay); if(x){ x.payoff=null; save(); render(); } });
  document.querySelectorAll('[data-unlearn]').forEach(a=>a.onclick=()=>{ const [id,who]=a.dataset.unlearn.split('|'); const x=p.threads.find(y=>y.id===id); if(x){ x.learns=x.learns.filter(l=>l.who!==who); save(); render(); } });
  document.querySelectorAll('[data-thdel]').forEach(a=>a.onclick=()=>{ if(!confirm('Remove this? Its payoff and who learns it go too.')) return; p.threads=p.threads.filter(y=>y.id!==a.dataset.thdel); save(); render(); });
  const so=$('studio'); if(so) so.onclick=()=>{ const cur=current(p); if(!cur||!SH) return; const it=SH.put({text:TEXT[cur.id],file:p.title+(cur.label?' '+cur.label:'')+'.fountain',from:'Paper Trail',tool:TOOL}); if(it){ cur.shelfId=it.id; save(); } location.href='../film/'; };
 }
 document.querySelectorAll('[data-ntgo]').forEach(a=>a.onclick=()=>{ VIEW.p=a.dataset.ntgo; VIEW.scene=null; go('threads'); setTimeout(()=>{ const e=$('notthis'); if(e) e.scrollIntoView(); },50); });
 if(p){ const na=$('ntadd'); if(na) na.onclick=()=>{ const t=$('ntx').value.trim(); if(!t) return; const w=$('ntw').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean); p.notThis=(p.notThis||[]).concat([{id:rid('n'),text:t,words:w,at:Date.now()}]); p.updated=Date.now(); save(); render(); const e=$('notthis'); if(e) e.scrollIntoView(); };
  document.querySelectorAll('[data-ntdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Remove this from NOT THIS?')) return; p.notThis=(p.notThis||[]).filter(f=>f.id!==b.dataset.ntdel); save(); render(); }); }
 document.querySelectorAll('[data-char]').forEach(a=>a.onclick=()=>{ VIEW.char=a.dataset.char; render(); window.scrollTo(0,0); });
 document.querySelectorAll('[data-charback]').forEach(a=>a.onclick=()=>{ VIEW.char=null; render(); });
 document.querySelectorAll('[data-charin]').forEach(a=>a.onclick=()=>{ const [pid,n]=a.dataset.charin.split('|'); VIEW.p=pid; VIEW.scene=null; VIEW.char=n; go('characters'); window.scrollTo(0,0); });
 document.querySelectorAll('[data-cur]').forEach(b=>b.onclick=()=>{ p.current=b.dataset.cur; p.pinned=true; p.updated=Date.now(); save(); render(); toast('Current draft: '+DB.drafts[p.current].label+'.'); });
 document.querySelectorAll('[data-ret]').forEach(b=>b.onclick=()=>{ const d=DB.drafts[b.dataset.ret]; d.retired=!d.retired; if(d.retired&&p.current===d.id){ p.current=''; p.pinned=false; } save(); render(); });
 document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{ const d=DB.drafts[b.dataset.move]; const names=Object.values(DB.projects).filter(x=>x.id!==d.project).map(x=>x.title);
   const v=prompt('Move "'+d.label+'" to which project? Type a title'+(names.length?' (yours: '+names.join(', ')+')':'')+'. A new title makes a new project.'); if(!v||!v.trim()) return;
   let q=Object.values(DB.projects).find(x=>T.sameTitle(x.title,v)); if(!q){ q={id:rid('p'),title:v.trim(),created:Date.now(),updated:Date.now(),current:'',pinned:false,cards:{}}; DB.projects[q.id]=q; }
   const from=DB.projects[d.project]; d.project=q.id; if(from.current===d.id){ from.current=''; from.pinned=false; } if(d.kind==='script'&&!q.pinned) q.current=d.id; q.updated=Date.now(); save(); VIEW.p=q.id; render(); toast('Moved to '+q.title+'.'); });
 const rn=$('rename'); if(rn) rn.onclick=()=>{ const v=prompt('Project title',p.title); if(!v||!v.trim()) return; p.title=v.trim(); save(); render(); };
 const rp=$('retp'); if(rp) rp.onclick=()=>{ p.retired=!p.retired; save(); if(p.retired){ VIEW.p=null; go('projects'); } else render(); };
 const sr=$('showret'); if(sr) sr.onchange=()=>{ SHOWRET=sr.checked; render(); };
 const ex=$('exp'); if(ex) ex.onclick=()=>{ const out={app:'PAPER TRAIL',version:1,exported:new Date().toISOString(),projects:DB.projects,drafts:DB.drafts,marks:DB.marks,texts:TEXT,note:'Photos, recordings and files from Research travel in the On This Device backup, not in this file.'};
   const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'})); a.download='paper_trail_export.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
 const ib=$('impb'); if(ib) ib.onclick=()=>$('imp').click();
 const bb=$('boneb'); if(bb) bb.onclick=()=>{ const v=$('bone').value.trim(); if(!v) return; p.bones=(p.bones||[]).concat([{id:rid('b'),text:v,at:Date.now(),said:!!SAID}]); SAID=false; p.updated=Date.now(); save(); render(); toast('Kept.'); };
 const bq=$('bq'); if(bq) bq.oninput=()=>{ VIEW.bq=bq.value; const pos=bq.selectionStart; render(); const n=$('bq'); n.focus(); n.setSelectionRange(pos,pos); };
 document.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{ try{ await navigator.clipboard.writeText(b.dataset.copy); toast('Copied. Paste it into your draft.'); }catch(e){ toast('This browser would not copy. Select the text and copy it.'); } });
 document.querySelectorAll('[data-unbone]').forEach(b=>b.onclick=()=>{ if(!confirm('Remove this from the boneyard? It is only here.')) return; p.bones=p.bones.filter(x=>x.id!==b.dataset.unbone); save(); render(); });
 const mic=$('mic'); if(mic) mic.onclick=()=>{
  if(LISTEN){ try{ REC.stop(); }catch(e){} LISTEN=false; render(); return; }
  try{ REC=new SR(); REC.continuous=true; REC.interimResults=false; const base=$('bone').value;
   REC.onresult=e=>{ let s=''; for(let k=0;k<e.results.length;k++) s+=e.results[k][0].transcript; const el=$('bone'); if(el){ el.value=(base?base+' ':'')+s.trim(); SAID=true; } };
   REC.onend=()=>{ const keep=$('bone')&&$('bone').value; LISTEN=false; render(); if(keep&&$('bone')) $('bone').value=keep; };
   REC.onerror=()=>{ LISTEN=false; toast('The mic stopped. Type it, or try again.'); };
   REC.start(); LISTEN=true; const keep=$('bone').value; render(); $('bone').value=keep; }catch(e){ toast('This browser would not open the mic.'); } };
 const gq=$('gq'); if(gq) gq.oninput=()=>{ VIEW.gq=gq.value; const pos=gq.selectionStart; render(); const n=$('gq'); n.focus(); n.setSelectionRange(pos,pos); };
 document.querySelectorAll('[data-hit]').forEach(b=>b.onclick=()=>{ const r=HITS[+b.dataset.hit]; if(!r) return; VIEW.p=r.pid; const P0=DB.projects[r.pid];
  if(r.go.tab){ VIEW.tab=r.go.tab; VIEW.scene=null; if(r.go.tab==='bones') VIEW.bq=VIEW.gq; if(r.go.id) VIEW.rfocus=r.go.id; render(); window.scrollTo(0,0); return; }
  if(r.go.draft&&P0&&current(P0)&&current(P0).id!==r.go.draft){ toast('That line is in '+(DB.drafts[r.go.draft]||{}).label+', not the current draft. Showing the drafts.'); VIEW.tab='drafts'; VIEW.scene=null; render(); return; }
  let i=r.go.scene; if(r.go.key){ const c0=current(P0)||board(P0); i=T.keys(scenesOf(c0)).indexOf(r.go.key); }
  VIEW.tab='scenes'; VIEW.scene=i>=0?i:null; render(); window.scrollTo(0,0); });
 if(p&&VIEW.tab==='research'){
  const pickR=(pin)=>{ const i=document.createElement('input'); i.type='file'; i.multiple=true; i.onchange=()=>{ if(i.files.length) addResearch(p,[...i.files],pin); }; i.click(); };
  const rd0=$('rdrop'); if(rd0){ rd0.onclick=()=>pickR(); rd0.ondragover=e=>{e.preventDefault();rd0.classList.add('over');}; rd0.ondragleave=()=>rd0.classList.remove('over'); rd0.ondrop=e=>{ e.preventDefault(); rd0.classList.remove('over'); if(e.dataTransfer.files.length) addResearch(p,[...e.dataTransfer.files]); }; }
  const rn=$('rnote'); if(rn) rn.onclick=()=>{ if(!window.NoteCam){ toast('This page cannot record here.'); return; }
   const c=current(p)||board(p), sc=c?scenesOf(c):[], keys=T.keys(sc), f=VIEW.rf||'', pre=f.startsWith('s:')?keys.indexOf(f.slice(2)):null;
   NoteCam.open({kind:'video',title:p.title,for:[{id:p.id,label:p.title,scenes:sc.map((x,i)=>'SC '+(i+1)+' '+x.heading)}],pick:{for:p.id,scene:pre!=null&&pre>=0?pre:null}},async n=>{
    const id=rid('r'); if(!(await putBlob(id,n.blob))) throw new Error('not kept');
    p.research=p.research||[]; p.research.push({id:id,kind:'video',name:n.name,type:n.mime.split(';')[0],size:n.blob.size,at:Date.now(),note:n.words||'',scene:n.scene!=null?(keys[n.scene]||''):'',who:'',from:'note'});
    p.updated=Date.now(); save(); render(); }); };
  const cam=$('rcam'); if(cam) cam.onclick=()=>{ const i=document.createElement('input'); i.type='file'; i.accept='image/*'; i.setAttribute('capture','environment'); i.onchange=()=>{ if(i.files.length) addResearch(p,[...i.files]); }; i.click(); };
  const rec=$('rrec'); if(rec) rec.onclick=async()=>{
   if(RECORDING){ try{ RECORDING.stop(); }catch(e){} return; }
   if(!navigator.mediaDevices||!window.MediaRecorder){ toast('This browser can\'t record here. Use your phone\'s voice memo app and drop the file in.'); return; }
   try{ const s=await navigator.mediaDevices.getUserMedia({audio:true}); const mr=new MediaRecorder(s), parts=[];
    mr.ondataavailable=e=>{ if(e.data&&e.data.size) parts.push(e.data); };
    mr.onstop=()=>{ s.getTracks().forEach(t=>t.stop()); RECORDING=null; const type=mr.mimeType||'audio/webm'; const ext=/mp4|m4a/.test(type)?'m4a':'webm';
     const f=new File(parts,'Memo '+new Date().toLocaleString().replace(/[\/:]/g,'-')+'.'+ext,{type:type}); addResearch(p,[f]); };
    mr.start(); RECORDING=mr; render(); toast('Recording. Tap STOP RECORDING when you\'re done.'); }
   catch(e){ toast('The mic is blocked for this page. Allow it, or drop in a voice memo.'); } };
  const rc=$('rchats'); if(rc) rc.onchange=()=>{ const f=rc.files[0]; if(f) addChats(p,f); };
  const ra=$('raka'); if(ra) ra.onchange=()=>{ p.aka=ra.value.split(',').map(x=>x.trim()).filter(Boolean); save(); render(); };
  const rk=$('rkeep'); if(rk) rk.onclick=()=>{ const v=$('rlink').value.trim(); if(!v) return; const u=T.linkOf(v); p.research=p.research||[];
   p.research.push(u&&v.replace(u,'').trim().length<3?{id:rid('r'),kind:'link',url:u,name:u,at:Date.now(),note:'',scene:'',who:''}
     :{id:rid('r'),kind:'note',text:v,url:u,name:'',at:Date.now(),note:'',scene:'',who:''});
   p.updated=Date.now(); save(); render(); toast('Kept.'); };
  const rf=$('rf'); if(rf) rf.onchange=()=>{ VIEW.rf=rf.value; render(); };
  const rq=$('rq'); if(rq) rq.oninput=()=>{ VIEW.rq=rq.value; const pos=rq.selectionStart; render(); const n=$('rq'); n.focus(); n.setSelectionRange(pos,pos); };
  document.querySelectorAll('[data-rnote]').forEach(t=>t.oninput=()=>{ const r=p.research.find(x=>x.id===t.dataset.rnote); if(r){ r.note=t.value; p.updated=Date.now(); save(); } });
  document.querySelectorAll('[data-rscene]').forEach(s=>s.onchange=()=>{ const r=p.research.find(x=>x.id===s.dataset.rscene); if(r){ r.scene=s.value; r.sceneHeading=s.value?s.options[s.selectedIndex].text.replace(/^SC \d+ /,''):''; save(); render(); } });
  document.querySelectorAll('[data-rwho]').forEach(s=>s.onchange=()=>{ const r=p.research.find(x=>x.id===s.dataset.rwho); if(r){ r.who=s.value; save(); render(); } });
  document.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=async()=>{ if(!confirm('Remove this from Research? It is only kept here.')) return; const id=b.dataset.rdel; p.research=p.research.filter(x=>x.id!==id); (p.tables||[]).forEach(tb=>{ const gone=tb.items.filter(i=>i.rid===id).map(i=>i.id); tb.items=tb.items.filter(i=>i.rid!==id); tb.links=tb.links.filter(l=>!gone.includes(l.a)&&!gone.includes(l.b)); }); await delBlob(id); save(); render(); });
  document.querySelectorAll('[data-ropen]').forEach(a=>a.onclick=async e=>{ e.preventDefault(); const u=await urlOf(a.dataset.ropen); if(u) window.open(u,'_blank'); else toast('That file isn\'t on this device.'); });
  document.querySelectorAll('[data-rt]').forEach(b=>b.onclick=()=>{ VIEW.rt=b.dataset.rt||null; VIEW.tsel=null; VIEW.tlinking=false; VIEW.tlinkA=null; render(); window.scrollTo(0,0); });
  wireTable(p);
  if(VIEW.rfocus){ const el=$('r_'+VIEW.rfocus); VIEW.rfocus=null; if(el){ el.scrollIntoView({block:'center'}); el.style.outline='2px solid var(--gold)'; } }
 }
 if(p&&VIEW.scene!=null){
  const ah=$('raddhere'); if(ah) ah.onclick=()=>{ const c0=current(p)||board(p), k0=T.keys(scenesOf(c0))[VIEW.scene], h0=scenesOf(c0)[VIEW.scene].heading;
   const i=document.createElement('input'); i.type='file'; i.multiple=true; i.onchange=()=>{ if(i.files.length) addResearch(p,[...i.files],{scene:k0,sceneHeading:h0}); }; i.click(); };
  document.querySelectorAll('[data-rgo]').forEach(b=>b.onclick=()=>{ VIEW.tab='research'; VIEW.rfocus=b.dataset.rgo; VIEW.scene=null; render(); });
 }
 fillBlobs();
 const rd=$('reader'); if(rd) rd.oninput=()=>{ READER=rd.value.trim(); try{ localStorage.setItem('paper_trail_reader',READER); }catch(e){} };
 const rdc=$('reader'); if(rdc) rdc.onchange=()=>render();
 document.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>{
  const c=current(p); if(!c) return; const [si,li,m]=b.dataset.mk.split(':'); const sc=scenesOf(c), k=T.keys(sc)[+si], line=T.linesOf(sc[+si])[+li], who=READER||'Reader';
  const L=DB.marks[c.id]=DB.marks[c.id]||[]; const j=L.findIndex(x=>x.key===k&&x.li===+li&&x.m===m&&x.who===who);
  if(j>=0) L.splice(j,1); else L.push({id:rid('m'),key:k,li:+li,h:T.lineHash(line),m:m,who:who,at:Date.now()});
  p.updated=Date.now(); save(); const y=window.scrollY; render(); window.scrollTo(0,y); });
}
$('file').addEventListener('change',e=>{ const f=[...e.target.files]; e.target.value=''; if(f.length) addFiles(f); });
/* bring in an export: add what isn't here; never remove, never replace */
$('imp').addEventListener('change',async e=>{
 const f=e.target.files[0]; e.target.value=''; if(!f) return;
 try{
  const d=JSON.parse(await f.text()); if(!d||!d.projects||!d.drafts) throw new Error('not a Paper Trail export');
  let np=0,nd=0,skip=0,nc=0;
  for(const p of Object.values(d.projects)){
   if(!DB.projects[p.id]){ DB.projects[p.id]=p; np++; continue; }
   const mine=DB.projects[p.id]; mine.cards=mine.cards||{};
   (p.threads||[]).forEach(x=>{ mine.threads=mine.threads||[]; const m=mine.threads.find(y=>y.id===x.id); if(!m){ mine.threads.push(x); nc++; return; } if(!m.payoff&&x.payoff){ m.payoff=x.payoff; nc++; } (x.learns||[]).forEach(l=>{ if(!(m.learns||[]).some(y=>T.norm(y.who)===T.norm(l.who))){ m.learns=(m.learns||[]).concat([l]); nc++; } }); });
   (p.tables||[]).forEach(x=>{ mine.tables=mine.tables||[]; if(!mine.tables.some(y=>y.id===x.id)){ mine.tables.push(x); nc++; } });
   (p.research||[]).forEach(x=>{ mine.research=mine.research||[]; if(!mine.research.some(y=>y.id===x.id)){ mine.research.push(x); nc++; } });
   (p.bones||[]).forEach(b=>{ mine.bones=mine.bones||[]; if(!mine.bones.some(x=>x.id===b.id)){ mine.bones.push(b); nc++; } });
   Object.keys(p.cards||{}).forEach(k=>{ const a=mine.cards[k], b=p.cards[k];
    if(!a){ mine.cards[k]=b; nc++; return; }
    ['purpose','notes','fx'].forEach(x=>{ if(!a[x]&&b[x]) { a[x]=b[x]; nc++; } });
    ['cast','props'].forEach(x=>{ (b[x]||[]).forEach(v=>{ if(!(a[x]||[]).includes(v)){ a[x]=(a[x]||[]).concat([v]); nc++; } }); });
    (b.decisions||[]).forEach(v=>{ if(!(a.decisions||[]).some(y=>y.at===v.at&&y.text===v.text)){ a.decisions=(a.decisions||[]).concat([v]); nc++; } });
   });
  }
  for(const dr of Object.values(d.drafts)){
   if(DB.drafts[dr.id]||Object.values(DB.drafts).some(x=>x.hash===dr.hash)){ skip++; continue; }
   if(!DB.projects[dr.project]) continue;
   DB.drafts[dr.id]=dr; if(d.texts&&d.texts[dr.id]) await putText(dr.id,d.texts[dr.id]); nd++;
  }
  let nm=0; Object.keys(d.marks||{}).forEach(id=>{ if(!DB.drafts[id]) return; const L=DB.marks[id]=DB.marks[id]||[]; (d.marks[id]||[]).forEach(x=>{ if(!L.some(y=>y.id===x.id)){ L.push(x); nm++; } }); });
  save(); render(); toast('Brought in '+np+' project'+(np===1?'':'s')+', '+nd+' draft'+(nd===1?'':'s')+(nc?', '+nc+' card note'+(nc===1?'':'s'):'')+(nm?', '+nm+' table read mark'+(nm===1?'':'s'):'')+'. '+skip+' already here. Nothing removed.');
 }catch(err){ toast('Could not read that: '+err.message); }
});

/* Writer's Blockage hands a draft over: "keep this draft" */
async function handoff(){
 let h=null; try{ h=JSON.parse(localStorage.getItem(HAND)||'null'); }catch(e){}
 if(!h||!h.text) return;
 localStorage.removeItem(HAND);
 if(Date.now()-(h.at||0)>10*60*1000) return;
 const r=await addDraft(h.text,h.file||((h.title||'Untitled')+'.fountain'),'Writer\'s Blockage',{title:h.title||undefined,label:h.draft||undefined});
 ADDED=[r]; VIEW.tab='add';
 if(r.ok) toast('Kept: '+r.p.title+', '+r.d.label+'.');
}

/* drafts dropped on the home page (shared/inbox.js), taken once */
async function fromInbox(){ if(!window.Inbox) return; const L=Inbox.pending(TOOL,'draft'); const got=[];
 for(const it of L){ try{ const r=await addDraft(it.data.text||'',it.data.file||'Untitled.fountain',it.data.source||'Home',{title:it.data.title||undefined,label:it.data.label||undefined}); if(r&&r.ok) got.push(r); }catch(e){} Inbox.take(TOOL,it.id); }
 if(got.length){ ADDED=got; VIEW.tab='add'; toast(got.length===1?'From home: '+got[0].p.title+', '+got[0].d.label+'.':'From home: '+got.length+' drafts.'); } }
(async()=>{ await loadTexts(); await handoff(); await fromInbox(); render(); })();
window.__trail={DB:()=>DB,TEXT:()=>TEXT,addDraft:addDraft,docxText:docxText};
})();
