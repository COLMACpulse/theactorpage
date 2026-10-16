/* THEACTORPAGE TAKES SHELF: what CAMERA and MIC record, kept once, read by every tool.
   Each take says what it is for, so the right tool picks it up:
     selftape  a tape for an audition (Actor OS takes, the Hub's project)
     practice  a run of the sides on the shelf (Actor OS)
     scene     a take of a scene you're shooting (Story Studio's cut, with the file kept)
     clip      something for your reel (the Hub's library)
     voice     a voice note or a line run (kept here)
   localStorage 'theactorpage_takes_v1' (the list), IndexedDB 'theactorpage_takes' / 'blobs' (the
   recordings). A phone limits how much a page can keep, and an iPhone can clear it when space runs
   short, so every take also offers SAVE TO PHONE. Nothing uploaded. */
(function(g){
const KEY='theactorpage_takes_v1', MAX=60;
const T={};
T.FOR={selftape:'Self-tape',practice:'Practice',scene:'Scene take',clip:'Reel clip',voice:'Voice note',headshot:'Headshot'};
function read(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.list)) return d; }catch(e){} return {list:[]}; }
function write(d){ d.list.sort((a,b)=>b.at-a.at); if(d.list.length>MAX) d.list.length=MAX; try{ localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(res=>{ try{ const r=indexedDB.open('theactorpage_takes',1); r.onupgradeneeded=()=>r.result.createObjectStore('blobs'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); return dbp; }
const op=async(mode,fn)=>{ const d=await db(); if(!d) return null; return new Promise(res=>{ try{ const t=d.transaction('blobs',mode), r=fn(t.objectStore('blobs')); t.oncomplete=()=>res(r&&r.result!==undefined?r.result:true); t.onerror=()=>res(null); t.onabort=()=>res(null); }catch(e){ res(null); } }); };
/* A take in. meta: {kind:'video'|'audio', mime, ext, secs, for:{type, title, role, scene, script, inbox}, name} */
T.put=async function(blob,meta){
 const id='k'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 const kept=await op('readwrite',st=>st.put(blob,id));
 const it=Object.assign({id,at:Date.now(),size:blob.size,taken:{},saved:false,kept:!!kept},meta||{});
 const d=read(); d.list.push(it); write(d);
 try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
 return it;
};
T.all=type=>read().list.filter(x=>!type||(x.for&&x.for.type)===type);
T.get=id=>read().list.find(x=>x.id===id)||null;
T.blob=id=>op('readonly',st=>st.get(id));
T.set=function(id,patch){ const d=read(), it=d.list.find(x=>x.id===id); if(!it) return null; Object.assign(it,patch); write(d); return it; };
T.pending=function(tool,types){ return read().list.filter(x=>x.kept&&types.includes(x.for&&x.for.type)&&!(x.taken&&x.taken[tool])).sort((a,b)=>a.at-b.at); };
T.take=function(tool,id,note){ const d=read(), it=d.list.find(x=>x.id===id); if(!it) return; it.taken=it.taken||{}; it.taken[tool]=note||Date.now(); write(d); };
T.remove=async function(id){ const d=read(); d.list=d.list.filter(x=>x.id!==id); write(d); await op('readwrite',st=>st.delete(id)); };
/* Save to the phone: the share sheet on a phone (Save Video), a download on a computer */
T.saveToPhone=async function(id){
 const it=T.get(id), b=await T.blob(id); if(!it||!b) return false;
 const f=new File([b],it.name||('take.'+(it.ext||'mp4')),{type:b.type});
 try{ if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:f.name}); T.set(id,{saved:true}); return true; } }catch(e){ if(e&&e.name==='AbortError') return false; }
 const a=document.createElement('a'); a.href=URL.createObjectURL(f); a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 T.set(id,{saved:true}); return true;
};
T.space=async function(){ try{ const e=await navigator.storage.estimate(); return {used:e.usage||0,quota:e.quota||0}; }catch(e){ return null; } };
g.Takes=T;
if(typeof module!=='undefined') module.exports=T;
})(typeof window!=='undefined'?window:globalThis);
