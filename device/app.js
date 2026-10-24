/* ON THIS DEVICE page. Reads what THEACTORPAGE tools keep here, backs all of it up to one file,
   restores by adding what's missing. Replaces only what you tick, and saves this device's copy first. */
(function(){
const D=window.OnDevice;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const day=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const bytes=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(n<10240?1:0)+' KB':n<1073741824?(n/1048576).toFixed(1)+' MB':(n/1073741824).toFixed(2)+' GB';
let tt; function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),3400); }
function own(){ try{ return JSON.parse(localStorage.getItem(D.OWN_KEY)||'{}')||{}; }catch(e){ return {}; } }
function setOwn(o){ try{ localStorage.setItem(D.OWN_KEY,JSON.stringify(Object.assign(own(),o))); }catch(e){} }

/* ---------- reading this device ---------- */
const req=r=>new Promise((res,rej)=>{ r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
async function dbNames(){
 try{ if(indexedDB.databases){ const l=await indexedDB.databases(); return l.map(d=>d.name).filter(n=>n&&D.toolOfDb(n)); } }catch(e){}
 return D.KNOWN_DBS.slice();
}
/* open a database only if it is already here; never make an empty one */
function peek(name){ return new Promise(res=>{ try{ const r=indexedDB.open(name); r.onupgradeneeded=()=>{ try{ r.transaction.abort(); }catch(e){} }; r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); r.onblocked=()=>res(null); }catch(e){ res(null); } }); }
async function scan(){
 const out={ls:[],dbs:[]};
 try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i), t=D.toolOfKey(k); if(t) out.ls.push({k:k,v:localStorage.getItem(k),tool:t.id}); } }catch(e){ out.lsBlocked=true; }
 for(const name of await dbNames()){
  const db=await peek(name); if(!db) continue;
  const tool=D.toolOfDb(name), d={name:name,version:db.version,tool:tool.id,stores:[]};
  for(const sn of [...db.objectStoreNames]){
   if(D.skipStore(name,sn)){ d.skipped=(d.skipped||[]).concat([sn]); continue; }
   const tx=db.transaction(sn,'readonly'), st=tx.objectStore(sn);
   const ix=[...st.indexNames].map(n=>{ const x=st.index(n); return {name:n,keyPath:x.keyPath,unique:x.unique,multiEntry:x.multiEntry}; });
   const [keys,vals]=await Promise.all([req(st.getAllKeys()),req(st.getAll())]);
   d.stores.push({name:sn,keyPath:st.keyPath,autoIncrement:st.autoIncrement,indexes:ix,records:keys.map((k,i)=>({k:k,v:vals[i]}))});
  }
  db.close(); out.dbs.push(d);
 }
 return out;
}
function inventory(s){
 const T={}; D.TOOLS.forEach(t=>T[t.id]={tool:t,items:0,size:0,media:0});
 s.ls.forEach(x=>{ const r=T[x.tool]; r.items++; r.size+=x.k.length+String(x.v).length; });
 s.dbs.forEach(d=>d.stores.forEach(st=>st.records.forEach(x=>{ const r=T[d.tool]; r.items++; r.size+=D.sizeOf(x.v); r.media+=D.mediaIn(x.v); })));
 return Object.values(T);
}

/* ---------- one backup file ---------- */
async function makeBackup(why,how){
 const s=await scan(), media=[], skipped=[];
 const m={app:'THEACTORPAGE',kind:'device-backup',version:1,made:new Date().toISOString(),why:why||'',ls:{},idb:[],media:[]};
 s.ls.forEach(x=>m.ls[x.k]=x.v);
 s.dbs.forEach(d=>m.idb.push({name:d.name,version:d.version,stores:d.stores.map(st=>({name:st.name,keyPath:st.keyPath,autoIncrement:st.autoIncrement,indexes:st.indexes,
  records:st.records.map(x=>({k:D.encode(x.k,media,skipped),v:D.encode(x.v,media,skipped)}))}))}));
 m.media=media.map((b,i)=>({i:i,size:b.size,type:b.type}));
 m.skipped=skipped;
 const total=media.reduce((n,b)=>n+b.size,0);
 if(total>D.ZIP_LIMIT) throw new Error('Over 4 GB of takes and photos. That is more than one backup file holds.');
 const entries=[{name:'backup.json',blob:new Blob([JSON.stringify(m)],{type:'application/json'})}].concat(media.map((b,i)=>({name:'media/'+i,blob:b})));
 const zip=await D.zip(entries);
 const items=Object.keys(m.ls).length+m.idb.reduce((n,d)=>n+d.stores.reduce((a,st)=>a+st.records.length,0),0);
 const name='theactorpage_'+(why==='before-restore'?'before_restore_':'backup_')+new Date().toISOString().slice(0,10)+'.zip';
 let shared=false;
 if(how==='share'){ try{ const f=new File([zip],name,{type:'application/zip'}); if(navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:name}); shared=true; } }catch(e){ if(e&&e.name==='AbortError') throw new Error('not sent. Nothing was saved'); } }
 if(!shared){ const a=document.createElement('a'); a.href=URL.createObjectURL(zip); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000); }
 setOwn({lastBackup:Date.now(),lastSize:zip.size,lastItems:items});
 const files=s.dbs.reduce((n,d)=>n+d.stores.reduce((a,st)=>a+st.records.reduce((b,x)=>b+D.mediaIn(x.v),0),0),0);
 return {name:name,size:zip.size,items:items,media:files,shared:shared};
}

/* ---------- restore: add what's missing ---------- */
let BK=null, PLAN=null;
async function readBackup(file){
 const files=await D.unzip(file);
 if(!files['backup.json']) throw new Error('not a THEACTORPAGE backup');
 const m=JSON.parse(await files['backup.json'].text());
 if(m.kind!=='device-backup') throw new Error('not a THEACTORPAGE backup');
 return {m:m,file:file.name,media:i=>files['media/'+i],size:i=>(files['media/'+i]||{size:0}).size};
}
async function plan(bk){
 const s=await scan(), P={}; D.TOOLS.forEach(t=>P[t.id]={tool:t,add:[],differ:[],same:0,cant:[]});
 Object.keys(bk.m.ls).forEach(k=>{ const t=D.toolOfKey(k); if(!t) return; const v=bk.m.ls[k];
  let cur=null; try{ cur=localStorage.getItem(k); }catch(e){}
  const it={type:'ls',k:k,v:v};
  if(cur==null) P[t.id].add.push(it); else if(cur===v) P[t.id].same++; else P[t.id].differ.push(it); });
 bk.m.idb.forEach(d=>{ const t=D.toolOfDb(d.name); if(!t) return;
  const here=s.dbs.find(x=>x.name===d.name);
  d.stores.forEach(st=>{
   const hs=here&&here.stores.find(x=>x.name===st.name);
   if(here&&!hs){ if(st.records.length) P[t.id].cant.push(st.records.length+' saved item'+(st.records.length===1?'':'s')+' ('+st.name+'): open '+t.name+' once, then restore again'); return; }
   const H=new Map(); (hs?hs.records:[]).forEach(x=>H.set(D.sig(x.k),x.v));
   st.records.forEach(x=>{ const key=D.sig(x.k,bk.size), it={type:'idb',db:d,st:st,rec:x};
    if(!H.has(key)) P[t.id].add.push(it); else if(D.sig(H.get(key))===D.sig(x.v,bk.size)) P[t.id].same++; else P[t.id].differ.push(it); });
  });
 });
 return P;
}
function openForRestore(d){ return new Promise((res,rej)=>{
 const r=indexedDB.open(d.name);
 r.onupgradeneeded=()=>{ const db=r.result;   // it wasn't here: build it the way the tool had it
  try{ r.transaction.abort(); }catch(e){} };
 r.onsuccess=()=>res(r.result); r.onerror=()=>{
  const r2=indexedDB.open(d.name,d.version);
  r2.onupgradeneeded=()=>{ const db=r2.result; d.stores.forEach(st=>{ if(db.objectStoreNames.contains(st.name)) return;
   const o=db.createObjectStore(st.name,Object.assign(st.keyPath!=null?{keyPath:st.keyPath}:{},st.autoIncrement?{autoIncrement:true}:{}));
   (st.indexes||[]).forEach(ix=>o.createIndex(ix.name,ix.keyPath,{unique:!!ix.unique,multiEntry:!!ix.multiEntry})); }); };
  r2.onsuccess=()=>res(r2.result); r2.onerror=()=>rej(r2.error); };
}); }
async function apply(P,replace){
 const chosen=[]; let replacing=0;
 Object.values(P).forEach(p=>{ chosen.push(...p.add); if(replace.has(p.tool.id)){ chosen.push(...p.differ); replacing+=p.differ.length; } });
 let safety=null;
 if(replacing) safety=await makeBackup('before-restore');
 let n=0;
 chosen.filter(x=>x.type==='ls').forEach(x=>{ try{ localStorage.setItem(x.k,x.v); n++; }catch(e){} });
 const byDb=new Map(); chosen.filter(x=>x.type==='idb').forEach(x=>{ if(!byDb.has(x.db)) byDb.set(x.db,new Map()); const m=byDb.get(x.db); if(!m.has(x.st)) m.set(x.st,[]); m.get(x.st).push(x.rec); });
 for(const [d,stores] of byDb){
  const db=await openForRestore(d);
  for(const [st,recs] of stores){
   if(!db.objectStoreNames.contains(st.name)) continue;
   const ready=[]; for(const r of recs) ready.push({k:await D.decode(r.k,BK.media),v:await D.decode(r.v,BK.media)});   // decode before the write: a write can't wait
   await new Promise((res,rej)=>{ const tx=db.transaction(st.name,'readwrite'), o=tx.objectStore(st.name);
    ready.forEach(r=>{ if(o.keyPath!=null) o.put(r.v); else o.put(r.v,r.k); });
    tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error); });
   n+=ready.length;
  }
  db.close();
 }
 return {n:n,replaced:replacing,safety:safety};
}

/* ---------- the page ---------- */
let LAST=null, ALL=false;
const plural=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));
function ago(t){ const d0=new Date(); d0.setHours(12,0,0,0); const d1=new Date(t); d1.setHours(12,0,0,0); const n=Math.round((d0-d1)/864e5);
 return n<=0?'Today':n===1?'Yesterday':n<45?n+' days ago':day(t); }
const canShare=()=>{ try{ return !!(navigator.canShare&&navigator.canShare({files:[new File(['x'],'x.zip',{type:'application/zip'})]})); }catch(e){ return false; } };
async function render(){
 if(PLAN) return restoreView();
 const s=await scan(), inv=inventory(s), o=own(), used=inv.filter(x=>x.items).sort((a,b)=>(b.items+b.media*3)-(a.items+a.media*3));
 const media=used.reduce((n,x)=>n+x.media,0);
 let est=null, kept=null; try{ est=navigator.storage&&navigator.storage.estimate?await navigator.storage.estimate():null; kept=navigator.storage&&navigator.storage.persisted?await navigator.storage.persisted():null; }catch(e){}
 let h='<div class="grid"><div class="colA">';
 h+='<div class="card status"><p class="kicker">LAST BACKUP</p><p class="when" id="when">'+(o.lastBackup?esc(ago(o.lastBackup)):'Never')+'</p>'
  +'<p class="dim" style="margin:0 0 14px">'+(o.lastBackup?esc(day(o.lastBackup))+' · '+plural(o.lastItems||0,'saved item')+' · '+bytes(o.lastSize||0)
    :used.length?plural(used.length,'tool has','tools have')+' your work in this browser, and only here.':'Nothing saved here yet. When you make something in any tool, it shows up below.')+'</p>'
  +'<div class="row"><button class="btn pri huge" id="bk"'+(used.length?'':' disabled')+'>BACK UP EVERYTHING</button>'
  +(canShare()?'<button class="btn huge" id="send"'+(used.length?'':' disabled')+'>SEND IT TO MYSELF</button>':'')+'</div>'
  +(canShare()?'<p class="note">SEND IT TO MYSELF opens your share sheet: save it to Files or Drive, or email it to yourself.</p>':'')
  +'<p class="note">One .zip with everything: your work, takes, photos and settings. Keep it somewhere that isn\'t this '+(matchMedia('(pointer:coarse)').matches?'phone':'computer')+'. It holds private things too. Nothing is uploaded.</p></div>';
 if(LAST) h+='<div class="msg" id="last">'+esc(LAST)+'</div>';
 if(s.lsBlocked) h+='<div class="msg bad">This browser won\'t let the page read saved data (a private window, or site data blocked). What\'s below isn\'t the whole story.</div>';
 if(used.length){
  const show=ALL?used:used.slice(0,5);
  h+='<div class="card list"><p class="kicker" style="padding-top:12px">WHAT\'S HERE · '+plural(used.length,'TOOL')+'</p>'
   +show.map(x=>'<div class="li"><div class="w"><b>'+esc(x.tool.name)+'</b><small>'+plural(x.items,'saved item')+(x.media?' · '+plural(x.media,'take, photo or file','takes, photos and files'):'')+'</small></div>'
    +(x.tool.href?'<a class="mini" href="'+esc(x.tool.href)+'">OPEN</a>':'')+'</div>').join('')
   +(used.length>5?'<div class="li"><button class="more" id="alltools">'+(ALL?'Show fewer':'and '+(used.length-5)+' more')+'</button></div>':'')+'</div>';
 }
 h+='</div><div class="colB">';
 h+='<button class="drop" id="drop" type="button"><b>RESTORE FROM A BACKUP</b><span>Drop the .zip here, or tap to pick it. It adds what this browser doesn\'t have. It never removes anything.</span></button>';
 h+='<details class="fold" id="keepfold"><summary>KEEP IT ON THIS DEVICE</summary>'
  +(kept===true?'<p style="margin:0">Kept. This browser was asked to keep THEACTORPAGE\'s data and said yes.</p>'
   :'<p style="margin:0 0 10px">'+(kept===false?'Not kept yet. The browser may clear it when the device runs low on space.':'This browser doesn\'t say whether it keeps site data.')+'</p><button class="btn" id="keep">ASK THE BROWSER TO KEEP IT</button>')
  +(est&&est.quota?'<p class="note">Using '+bytes(est.usage||0)+' of the '+bytes(est.quota)+' this browser allows.</p>':'')
  +'<p class="note">On iPhone and iPad, Safari can clear a site\'s data after 7 days without a visit. Added to the Home Screen, it doesn\'t. A backup file is the only copy that doesn\'t depend on the browser.</p></details>';
 const skips=s.dbs.filter(d=>d.skipped);
 if(skips.length) h+='<details class="fold"><summary>WHAT ISN\'T IN THE FILE</summary><p class="note" style="margin:0">Links to files on this computer from THEACTORPAGES. They only work here. The scripts themselves are in the file.</p></details>';
 h+='</div></div>';
 $('main').innerHTML=h; wire();
}
function restoreView(){
 const ALLP=Object.values(PLAN), P=ALLP.filter(p=>p.add.length||p.differ.length||p.cant.length);
 const adds=P.reduce((n,p)=>n+p.add.length,0), same=ALLP.filter(p=>p.same&&!p.add.length&&!p.differ.length&&!p.cant.length);
 let h='<div class="backbar"><button class="btn" id="cancel">‹ YOUR BACKUP</button></div>'
  +'<p class="kicker">RESTORE · '+esc(BK.file)+' · MADE '+esc(day(BK.m.made).toUpperCase())+'</p>'
  +'<p class="big2">'+(adds?'This file adds '+plural(adds,'saved item')+' this browser doesn\'t have.':'This browser already has everything in this file.')+'</p>'
  +(P.length?'<div class="card list">'+P.map(p=>'<div class="li"><div class="w"><b>'+esc(p.tool.name)+'</b><small>'+[p.add.length?p.add.length+' to add':'',p.same?p.same+' already the same':'',p.differ.length?p.differ.length+' different here':''].filter(Boolean).join(' · ')+'</small>'
   +p.cant.map(c=>'<small class="warn2">'+esc(c)+'</small>').join('')+'</div>'
   +(p.differ.length?'<label class="ck"><input type="checkbox" data-rep="'+p.tool.id+'"> Use the backup\'s for the '+p.differ.length+' different</label>':'')+'</div>').join('')+'</div>':'')
  +(same.length?'<p class="note">Already the same here: '+esc(same.map(p=>p.tool.name).join(', '))+'.</p>':'')
  +(P.some(p=>p.differ.length)?'<p class="note">Different here: this browser has its own version. Left alone unless you tick it. If you tick any, this browser\'s copy is saved to a file first.</p>':'')
  +'<div class="row" style="margin-top:14px"><button class="btn pri huge" id="go">RESTORE</button><button class="btn ghost" id="cancel2">NOT NOW</button></div>';
 $('main').innerHTML=h; wire();
}
function wire(){
 const run=async(btn,how)=>{ btn.disabled=true; const t=btn.textContent; btn.textContent=how==='share'?'GETTING IT READY...':'BUILDING THE FILE...';
  try{ const r=await makeBackup('',how); LAST=(r.shared?'Sent: ':'Saved: ')+r.name+', '+bytes(r.size)+', '+plural(r.items,'saved item')+(r.media?', '+plural(r.media,'take, photo or file','takes, photos and files'):'')+'.'; }
  catch(e){ LAST='Could not back up: '+e.message+'.'; } btn.textContent=t; render(); };
 const b=$('bk'); if(b) b.onclick=()=>run(b);
 const sd=$('send'); if(sd) sd.onclick=()=>run(sd,'share');
 const al=$('alltools'); if(al) al.onclick=()=>{ ALL=!ALL; render(); };
 const k=$('keep'); if(k) k.onclick=async()=>{ let ok=false; try{ ok=await navigator.storage.persist(); }catch(e){} toast(ok?'Kept. The browser said yes.':'The browser said no for now. It often says yes once the site is added to your Home Screen or used more. Back up either way.'); if(ok){ $('keepfold').open=true; render(); } };
 const d=$('drop'); if(d){ d.onclick=()=>$('file').click(); d.ondragover=e=>{e.preventDefault();d.classList.add('over');}; d.ondragleave=()=>d.classList.remove('over'); d.ondrop=e=>{ e.preventDefault(); d.classList.remove('over'); if(e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); }; }
 const g=$('go'); if(g) g.onclick=async()=>{ const rep=new Set([...document.querySelectorAll('[data-rep]:checked')].map(x=>x.dataset.rep)); g.disabled=true; g.textContent='RESTORING...';
  try{ const r=await apply(PLAN,rep); LAST='Restored '+plural(r.n,'saved item')+'.'+(r.replaced?' Replaced '+r.replaced+'; this browser\'s copy went to '+r.safety.name+' first.':'')+' Nothing removed.'; }catch(e){ LAST='Restore stopped: '+e.message+'. Nothing was removed.'; }
  PLAN=null; BK=null; render(); };
 ['cancel','cancel2'].forEach(i=>{ const c=$(i); if(c) c.onclick=()=>{ PLAN=null; BK=null; render(); }; });
}
async function load(f){ try{ BK=await readBackup(f); PLAN=await plan(BK); LAST=null; }catch(e){ BK=null; PLAN=null; LAST='Could not read that: '+e.message+'.'; } render(); }
$('file').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(f) load(f); });
render();
window.__device={scan:scan,inventory:inventory};
})();
