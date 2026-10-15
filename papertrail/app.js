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

let DB=load(), TEXT={}, VIEW={tab:'projects',p:null,scene:null}, MSG='', ADDED=[], SHOWRET=false;
const CACHE={};   // draft id -> scenes
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.projects) return d; }catch(e){} return {projects:{},drafts:{}}; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); }catch(e){ toast('This device would not save. Export a copy.'); } }
let tt; function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),2800); }

/* ---------- texts in IndexedDB ---------- */
function idb(){ return new Promise(res=>{ try{ const r=indexedDB.open('paper_trail',1); r.onupgradeneeded=()=>r.result.createObjectStore('texts'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); }
async function putText(id,t){ TEXT[id]=t; const d=await idb(); if(!d) return false; return new Promise(res=>{ const x=d.transaction('texts','readwrite'); x.objectStore('texts').put(t,id); x.oncomplete=()=>res(true); x.onerror=()=>res(false); }); }
async function loadTexts(){ const d=await idb(); if(!d) return; await new Promise(res=>{ const x=d.transaction('texts','readonly').objectStore('texts').openCursor(); x.onsuccess=e=>{ const c=e.target.result; if(c){ TEXT[c.key]=c.value; c.continue(); } else res(); }; x.onerror=()=>res(); }); }

/* ---------- helpers ---------- */
const projects=()=>Object.values(DB.projects).filter(p=>SHOWRET||!p.retired).sort((a,b)=>(b.updated||0)-(a.updated||0));
const draftsOf=pid=>Object.values(DB.drafts).filter(d=>d.project===pid&&(SHOWRET||!d.retired)).sort((a,b)=>a.added-b.added);
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
 const tm=xml.match(/<TitlePage[\s\S]*?<Text[^>]*>([^<]+)<\/Text>/i);
 return (tm?'Title: '+tm[1].trim()+'\n\n':'')+out.join('\n');
}
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
function tabs(){
 const p=VIEW.p&&DB.projects[VIEW.p];
 const t=[['projects','Projects'],['add','Add drafts']];
 if(p) t.push(['scenes','Scenes'],['drafts','Drafts'],['characters','Characters']);
 $('tabs').innerHTML=t.map(([k,l])=>'<button data-tab="'+k+'" class="'+(VIEW.tab===k?'on':'')+'">'+l+'</button>').join('');
 $('crumb').innerHTML='<a data-go="projects">Paper Trail</a>'+(p?' &nbsp;/&nbsp; <a data-go="scenes">'+esc(p.title)+'</a>':'')+(VIEW.scene!=null&&p?' &nbsp;/&nbsp; scene':'');
}
function render(){
 tabs();
 const m=$('main'), p=VIEW.p&&DB.projects[VIEW.p];
 if(VIEW.tab==='add') m.innerHTML=vAdd();
 else if(!p||VIEW.tab==='projects') m.innerHTML=vProjects();
 else if(VIEW.tab==='scenes') m.innerHTML=VIEW.scene!=null?vScene(p,VIEW.scene):vScenes(p);
 else if(VIEW.tab==='drafts') m.innerHTML=vDrafts(p);
 else if(VIEW.tab==='characters') m.innerHTML=vChars(p);
 wire();
}
function vProjects(){
 const P=projects(), nd=Object.values(DB.drafts).filter(d=>!d.retired).length;
 let h='<div class="stats"><div><b>'+P.length+'</b><span>projects</span></div><div><b>'+nd+'</b><span>drafts kept</span></div>'
  +'<div><b>'+P.reduce((n,p)=>n+scenesOf(current(p)).length,0)+'</b><span>scenes, current drafts</span></div></div>';
 if(!P.length) h+='<div class="panel"><p style="margin-top:0">Nothing here yet. Bring in a draft: a script (PDF, Final Draft, Fountain, text) or a storyboard (Word or PDF). Drafts with the same title land in the same project.</p><button class="btn pri" data-tab="add">ADD DRAFTS</button></div>';
 h+='<div class="grid">'+P.map(p=>{ const c=current(p), ds=draftsOf(p.id), b=board(p);
  return '<button class="frame" data-open="'+p.id+'">'+perf()+'<div class="fb"><div class="fk"><span>'+ds.length+' draft'+(ds.length===1?'':'s')+(b?' · storyboard':'')+'</span><span>'+(p.retired?'retired':esc(day(p.updated)))+'</span></div>'
   +'<div class="ft">'+esc(p.title)+'</div><div class="fl">'+(c?'Current: '+esc(c.label)+' · '+scenesOf(c).length+' scenes · '+c.words+' words':'No script draft yet')+'</div></div></button>'; }).join('')+'</div>';
 h+='<div class="eyebrow">Your copy</div><div class="row"><button class="btn ghost" id="exp">Export everything (.json)</button><button class="btn ghost" id="impb">Bring in an export</button>'
  +'<label class="note"><input type="checkbox" id="showret"'+(SHOWRET?' checked':'')+'> show retired</label></div>'
  +'<p class="note">Bringing in an export adds what you don\'t have. It never removes or replaces anything here.</p>';
 return h;
}
function vAdd(){
 let h='';
 if(ADDED.length) h+='<div class="panel"><div class="eyebrow" style="margin-top:0">Just now</div><div class="list">'+ADDED.map(r=>r.ok
  ?'<div class="li"><div class="w"><b>'+esc(r.p.title)+'</b> · '+esc(r.d.label)+' <span class="tag">'+r.d.kind+'</span><small>'+esc(r.d.file)+' · '+r.d.scenes+' scenes · '+(r.isNew?'new project':'added to the project')+'</small></div><button class="btn sm" data-open="'+r.p.id+'">OPEN</button></div>'
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
  +'<div class="row" style="margin-top:8px"><input class="field" id="dec" placeholder="What you decided, e.g. cut the last two lines" style="flex:1"><button class="btn" id="decb">LOG IT</button></div><p class="note">Logged decisions stay. They are never edited after the fact.</p></div>';
 // right: on file / missing / drafts / story studio
 const M=T.missing(s,cd,sb,st);
 h+='<div><div class="eyebrow" style="margin-top:0">On file, and missing</div><div class="panel"><div class="hm">'+M.map(x=>'<i class="'+(x.have?'y':'n')+'">'+(x.have?'✓':'○')+'</i><div>'+esc(x.what)+(x.from?'<br><small>'+esc(x.from)+'</small>':'')+'</div>').join('')+'</div></div>';
 const ds=draftsOf(p.id).filter(d=>d.kind==='script');
 if(ds.length>1){
  const k=keys[i];
  h+='<div class="eyebrow">In each draft</div><div class="list">'+ds.map(d=>{ const S=scenesOf(d), K=T.keys(S), j=K.indexOf(k);
   const mine=j>=0?S[j]:null, same=mine&&T.hashText(mine.text)===T.hashText(s.text);
   return '<div class="li"><div class="w"><b>'+esc(d.label)+'</b>'+(d.id===(c&&c.id)?' <span class="tag cur">current</span>':'')+'<small>'+esc(d.file)+'</small></div>'+(!mine?'<span class="tag red">not in it</span>':same?'<span class="tag">same</span>':'<span class="tag ok">different</span>')+'</div>'; }).join('')+'</div>';
 }
 if(c){
  h+='<div class="eyebrow">Story Studio</div><div class="panel">'+(st&&st.way?'<b>'+esc(st.way)+'</b> · '+st.done+' of '+st.total+' shots done':'Not in Story Studio yet.')
   +'<div class="row" style="margin-top:10px"><button class="btn" id="studio">'+(st?'OPEN IN STORY STUDIO':'SHOOT IT IN STORY STUDIO')+'</button></div><p class="note">Sends the current draft to the sides shelf and opens Story Studio on it.</p></div>';
 }
 if(s.text) h+='<details><summary class="eyebrow" style="cursor:pointer">Read the scene</summary><div class="read">'+esc(s.text)+'</div></details>';
 h+='</div></div>';
 return h;
}
function vDrafts(p){
 const ds=draftsOf(p.id), c=current(p);
 let h='<p class="note">Every draft you brought in, oldest first. None is ever replaced. The current draft is the one Scenes reads.</p><div class="list">';
 let prev=null;
 ds.forEach(d=>{
  let cmp='';
  if(d.kind==='script'&&prev){ const r=T.compare(scenesOf(prev),scenesOf(d)); cmp='vs '+esc(prev.label)+': '+[r.changed.length+' changed',r.added.length+' added',r.removed.length+' cut',r.same.length+' the same'].join(', ')
    +(r.changed.length?'<br><span class="note">Changed: '+esc(r.changed.slice(0,4).map(x=>x.heading).join(' · '))+(r.changed.length>4?' …':'')+'</span>':'')
    +(r.added.length?'<br><span class="note">Added: '+esc(r.added.slice(0,4).map(x=>x.heading).join(' · '))+'</span>':'')
    +(r.removed.length?'<br><span class="note">Cut: '+esc(r.removed.slice(0,4).map(x=>x.heading).join(' · '))+'</span>':''); }
  h+='<div class="li"><div class="w"><b>'+esc(d.label)+'</b> <span class="tag">'+d.kind+'</span>'+(c&&d.id===c.id?' <span class="tag cur">current</span>':'')+(d.retired?' <span class="tag red">retired</span>':'')
   +'<small>'+esc(d.file)+' · '+esc(d.source)+' · added '+esc(day(d.added))+' · '+d.scenes+' scenes · '+d.words+' words</small>'+(cmp?'<small style="color:var(--ink-2)">'+cmp+'</small>':'')+'</div>'
   +'<div class="row">'+(d.kind==='script'&&!(c&&d.id===c.id)&&!d.retired?'<button class="btn sm" data-cur="'+d.id+'">MAKE CURRENT</button>':'')
   +'<button class="btn sm ghost" data-move="'+d.id+'">MOVE</button><button class="btn sm ghost" data-ret="'+d.id+'">'+(d.retired?'BRING BACK':'RETIRE')+'</button></div></div>';
  if(d.kind==='script'&&!d.retired) prev=d;
 });
 h+='</div><div class="row" style="margin-top:12px"><button class="btn" data-tab="add">ADD A DRAFT</button><button class="btn ghost" id="rename">RENAME PROJECT</button><button class="btn ghost" id="retp">'+(p.retired?'BRING PROJECT BACK':'RETIRE PROJECT')+'</button></div>';
 return h;
}
function vChars(p){
 const ds=draftsOf(p.id).filter(d=>d.kind==='script'&&!d.retired);
 if(!ds.length) return '<div class="panel">No script drafts yet.</div>';
 const C=T.characters(ds.map(d=>({id:d.id,scenes:scenesOf(d)})));
 return '<p class="note">Lines per draft. A name that disappears from a draft shows a dash.</p><div class="tbl"><table><tr><th>Character</th>'+ds.map(d=>'<th>'+esc(d.label)+'</th>').join('')+'</tr>'
  +C.map(x=>'<tr><td><b>'+esc(x.name)+'</b>'+(x.voice?' <span class="tag">voice</span>':'')+'</td>'+ds.map(d=>'<td>'+(x.by[d.id]==null?'–':x.by[d.id])+'</td>').join('')+'</tr>').join('')+'</table></div>';
}

/* ---------- wiring ---------- */
function go(tab){ VIEW.tab=tab; if(tab!=='scenes') VIEW.scene=null; render(); window.scrollTo(0,0); }
function wire(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
 document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ if(b.dataset.go==='projects'){ VIEW.p=null; } VIEW.scene=null; go(b.dataset.go); });
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ VIEW.p=b.dataset.open; VIEW.scene=null; go('scenes'); });
 document.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{ VIEW.scene=Number(b.dataset.scene); render(); window.scrollTo(0,0); });
 document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{ VIEW.scene=null; render(); });
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
  const so=$('studio'); if(so) so.onclick=()=>{ const cur=current(p); if(!cur||!SH) return; const it=SH.put({text:TEXT[cur.id],file:p.title+(cur.label?' '+cur.label:'')+'.fountain',from:'Paper Trail',tool:TOOL}); if(it){ cur.shelfId=it.id; save(); } location.href='../film/'; };
 }
 document.querySelectorAll('[data-cur]').forEach(b=>b.onclick=()=>{ p.current=b.dataset.cur; p.pinned=true; p.updated=Date.now(); save(); render(); toast('Current draft: '+DB.drafts[p.current].label+'.'); });
 document.querySelectorAll('[data-ret]').forEach(b=>b.onclick=()=>{ const d=DB.drafts[b.dataset.ret]; d.retired=!d.retired; if(d.retired&&p.current===d.id){ p.current=''; p.pinned=false; } save(); render(); });
 document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>{ const d=DB.drafts[b.dataset.move]; const names=Object.values(DB.projects).filter(x=>x.id!==d.project).map(x=>x.title);
   const v=prompt('Move "'+d.label+'" to which project? Type a title'+(names.length?' (yours: '+names.join(', ')+')':'')+'. A new title makes a new project.'); if(!v||!v.trim()) return;
   let q=Object.values(DB.projects).find(x=>T.sameTitle(x.title,v)); if(!q){ q={id:rid('p'),title:v.trim(),created:Date.now(),updated:Date.now(),current:'',pinned:false,cards:{}}; DB.projects[q.id]=q; }
   const from=DB.projects[d.project]; d.project=q.id; if(from.current===d.id){ from.current=''; from.pinned=false; } if(d.kind==='script'&&!q.pinned) q.current=d.id; q.updated=Date.now(); save(); VIEW.p=q.id; render(); toast('Moved to '+q.title+'.'); });
 const rn=$('rename'); if(rn) rn.onclick=()=>{ const v=prompt('Project title',p.title); if(!v||!v.trim()) return; p.title=v.trim(); save(); render(); };
 const rp=$('retp'); if(rp) rp.onclick=()=>{ p.retired=!p.retired; save(); if(p.retired){ VIEW.p=null; go('projects'); } else render(); };
 const sr=$('showret'); if(sr) sr.onchange=()=>{ SHOWRET=sr.checked; render(); };
 const ex=$('exp'); if(ex) ex.onclick=()=>{ const out={app:'PAPER TRAIL',version:1,exported:new Date().toISOString(),projects:DB.projects,drafts:DB.drafts,texts:TEXT};
   const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(out)],{type:'application/json'})); a.download='paper_trail_export.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); };
 const ib=$('impb'); if(ib) ib.onclick=()=>$('imp').click();
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
  save(); render(); toast('Brought in '+np+' project'+(np===1?'':'s')+', '+nd+' draft'+(nd===1?'':'s')+(nc?', '+nc+' card note'+(nc===1?'':'s'):'')+'. '+skip+' already here. Nothing removed.');
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

(async()=>{ await loadTexts(); await handoff(); render(); })();
window.__trail={DB:()=>DB,TEXT:()=>TEXT,addDraft:addDraft,docxText:docxText};
})();
