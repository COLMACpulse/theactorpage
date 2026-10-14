/* THEACTORPAGE SIDES SHELF
   Drop your sides once, in any ACT tool. Every other tool on this site has them,
   with your character, the next time it opens.

   What lives here (this phone only, nothing uploaded):
   - localStorage 'theactorpage_shelf_v1': the list. Each entry is the sides as plain
     text (NAME on its own line, the speech under it), the file name, your character,
     the scene marked in Actor OS, and when it changed. Newest 12 kept.
   - IndexedDB 'theactorpage_shelf' / 'files': the original file (the PDF), so a tool
     with its own page view (BREAKDOWN) can read the real thing. Optional.

   Each tool keeps its own work (takes, notes, marks) against the shelf id.
   Rule: a tool adopts the shelf's current sides only when they are newer than what
   that tool last saw. It never yanks you off a script you chose in that tool. */
(function(g){
const KEY='theactorpage_shelf_v1', MAX=12;
const Sh={};

function hash(s){ let h=5381; s=String(s); for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h.toString(36); }
/* same sides = same words in the same order, whatever the spacing.
   A file is known by its name and size instead (Sh.sig). */
Sh.idFor=function(text){ return 's'+hash(String(text||'').replace(/\s+/g,' ').trim().toUpperCase()); };

function read(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.list)) return d; }catch(e){} return {cur:'',list:[],seen:{}}; }
function write(d){
 d.list.sort((a,b)=>b.updated-a.updated); if(d.list.length>MAX) d.list.length=MAX;
 try{ localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; }
}
let clock=0;
function now(){ const t=Date.now(); clock=t>clock?t:clock+1; return clock; }   // strictly increasing

Sh.sig=function(file){ return file?(String(file.name||'')+'|'+(file.size||0)):''; };
Sh.all=function(){ return read().list.slice(); };
Sh.get=function(id){ return read().list.find(x=>x.id===id)||null; };
Sh.current=function(){ const d=read(); return d.list.find(x=>x.id===d.cur)||null; };

/* New sides in. Same sides again just become current; your character is kept. */
Sh.put=function(o){
 const text=String(o.text||''); if(!text.trim()) return null;
 // the same file dropped in two tools is the same sides, whichever reader got there first
 const d=read(), id=o.fileSig?'f'+hash(o.fileSig):Sh.idFor(text), t=now();
 let it=d.list.find(x=>x.id===id);
 if(it){ if(o.file&&!it.file) it.file=o.file; if(o.me&&!it.me) it.me=o.me; if(d.cur!==id) it.updated=t; }
 else { it={id:id,text:text,file:o.file||'Pasted sides',me:o.me||'',range:null,from:o.from||'',added:t,updated:t}; d.list.push(it); }
 d.cur=id; if(o.tool) d.seen[o.tool]={id:id,at:it.updated};
 write(d); return it;
};
/* Your character, picked in any tool, for every tool. */
Sh.setMe=function(id,me,tool){
 const d=read(), it=d.list.find(x=>x.id===id); if(!it) return null;
 if(it.me!==me){ it.me=me||''; it.range=null; it.updated=now(); }
 d.cur=id; if(tool) d.seen[tool]={id:id,at:it.updated};
 write(d); return it;
};
/* The scene you marked in Actor OS, as indexes into Actor OS's script for your character. */
Sh.setRange=function(id,range,tool){
 const d=read(), it=d.list.find(x=>x.id===id); if(!it) return;
 const r=range&&(range[0]>=0||range[1]>=0)?[Math.max(0,range[0]),range[1]]:null;
 if(JSON.stringify(it.range)===JSON.stringify(r)) return;
 it.range=r; it.updated=now(); if(tool) d.seen[tool]={id:id,at:it.updated}; write(d);
};
/* You opened an older script in a tool: everyone follows. */
Sh.use=function(id,tool){
 const d=read(), it=d.list.find(x=>x.id===id); if(!it) return null;
 if(d.cur!==id){ d.cur=id; it.updated=now(); }
 if(tool) d.seen[tool]={id:id,at:it.updated}; write(d); return it;
};
Sh.remove=function(id){ const d=read(); d.list=d.list.filter(x=>x.id!==id); if(d.cur===id) d.cur=d.list[0]?d.list[0].id:''; write(d); delFile(id); };
/* What this tool should open, if anything changed since it last looked. */
Sh.pending=function(tool){
 const d=read(), it=d.list.find(x=>x.id===d.cur); if(!it) return null;
 const s=d.seen[tool]; if(s&&s.id===it.id&&s.at>=it.updated) return null;
 return it;
};
Sh.markSeen=function(tool,id){ const d=read(), it=d.list.find(x=>x.id===(id||d.cur)); if(!it) return; d.seen[tool]={id:it.id,at:it.updated}; write(d); };
Sh.label=function(it){ return (it.me?it.me+', ':'')+String(it.file||'').replace(/\.(pdf|txt|fountain|fdx)$/i,'').replace(/_/g,' '); };

/* ---------- the original file (optional) ---------- */
function db(){ return new Promise((res)=>{ try{ const rq=indexedDB.open('theactorpage_shelf',1);
 rq.onupgradeneeded=()=>rq.result.createObjectStore('files'); rq.onsuccess=()=>res(rq.result); rq.onerror=()=>res(null); }catch(e){ res(null); } }); }
Sh.putFile=async function(id,file){
 const d=await db(); if(!d||!file) return false;
 return new Promise(res=>{ const t=d.transaction('files','readwrite'); t.objectStore('files').put({name:file.name||'',type:file.type||'',blob:file},id); t.oncomplete=()=>res(true); t.onerror=()=>res(false); });
};
Sh.getFile=async function(id){
 const d=await db(); if(!d) return null;
 return new Promise(res=>{ const t=d.transaction('files','readonly'); const r=t.objectStore('files').get(id); r.onsuccess=()=>{ const v=r.result; if(!v) return res(null); try{ res(new File([v.blob],v.name||'sides',{type:v.type||v.blob.type})); }catch(e){ v.blob.name=v.name; res(v.blob); } }; r.onerror=()=>res(null); });
};
async function delFile(id){ const d=await db(); if(!d) return; try{ d.transaction('files','readwrite').objectStore('files').delete(id); }catch(e){} }

/* ---------- plain sides text from any reader's speeches ----------
   items: [{type:'heading'|'action'|'speech'|'transition', who, text, paren}] */
Sh.toText=function(items){
 const out=[];
 items.forEach(x=>{
  if(!x||!x.text&&x.type!=='speech') return;
  if(x.type==='speech'){ out.push(x.who+'\n'+(x.paren?x.paren+'\n':'')+x.text); }
  else out.push(String(x.text).replace(/\s+/g,' ').trim());
 });
 return out.join('\n\n')+'\n';
};

if(typeof module!=='undefined') module.exports=Sh;
g.Shelf=Sh;
})(typeof window!=='undefined'?window:globalThis);
