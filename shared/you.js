/* THEACTORPAGE YOU: one profile on this phone, filled once (from your résumé, your headshots, a request)
   and read by every tool that asks: the Hub, Virtual Résumé, Slate Maker, Actor OS.
   Rule: a tool only fills its own blanks from here. It never overwrites what you typed in that tool.
   Rule: what you fix here stays fixed: a later résumé fills blanks, it doesn't undo your edit.

   localStorage 'theactorpage_you_v1' (the words). IndexedDB 'theactorpage_you' / 'photos' (headshots,
   kept at up to 1600 px on the long side). Nothing uploaded. */
(function(g){
const KEY='theactorpage_you_v1';
const Y={};
Y.FIELDS=[['name','Name'],['union','Union'],['rep','Rep'],['repPhone','Rep phone'],['phone','Your phone'],['email','Email'],['height','Height'],['weight','Weight'],['hair','Hair'],['eyes','Eyes'],['locations','Local hire']];
const blank=()=>({name:'',union:'',rep:'',repPhone:'',phone:'',email:'',height:'',weight:'',hair:'',eyes:'',locations:'',credits:[],training:[],skills:[],accents:[],languages:[],photos:[],primary:'',edited:{},from:{},updated:0});
Y.get=function(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d) return Object.assign(blank(),d); }catch(e){} return blank(); };
function put(d){ d.updated=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
Y.has=()=>{ const d=Y.get(); return !!(d.name||d.credits.length||d.photos.length); };
const ck=c=>(c.section+'|'+c.title).toLowerCase().replace(/[^a-z0-9|]+/g,'');
/* Read from a source (a résumé, a request). Fills blanks; a field you edited by hand is left alone.
   Returns what changed: [[label, value]] */
Y.fill=function(p,source){
 const d=Y.get(), changed=[];
 Y.FIELDS.forEach(([k,label])=>{ const v=String(p[k]||'').trim(); if(v&&!d[k]&&!d.edited[k]){ d[k]=v; d.from[k]=source||''; changed.push([label,v]); } });
 const have=new Set(d.credits.map(ck)); let nc=0;
 (p.credits||[]).forEach(c=>{ if(c&&c.title&&!have.has(ck(c))){ d.credits.push({section:c.section||'Other',title:c.title,role:c.role||'',character:c.character||'',by:c.by||'',from:source||''}); have.add(ck(c)); nc++; } });
 if(nc) changed.push(['Credits',nc+' added']);
 ['training','skills','accents','languages'].forEach(k=>{ let n=0; (p[k]||[]).forEach(x=>{ x=String(x||'').trim(); if(x&&!d[k].some(y=>y.toLowerCase()===x.toLowerCase())){ d[k].push(x); n++; } }); if(n) changed.push([k[0].toUpperCase()+k.slice(1),n+' added']); });
 put(d); return changed;
};
/* You fixed a line by hand: it stays. */
Y.set=function(k,v){ const d=Y.get(); d[k]=String(v||'').trim(); d.edited[k]=true; d.from[k]='you'; put(d); return d; };
Y.setList=function(k,arr){ const d=Y.get(); d[k]=(arr||[]).map(x=>String(x).trim()).filter(Boolean); put(d); return d; };
Y.removeCredit=function(i){ const d=Y.get(); d.credits.splice(i,1); put(d); return d; };

/* ---------- headshots ---------- */
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise((res)=>{ try{ const r=indexedDB.open('theactorpage_you',1); r.onupgradeneeded=()=>r.result.createObjectStore('photos'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); return dbp; }
const op=async(mode,fn)=>{ const d=await db(); if(!d) return null; return new Promise(res=>{ try{ const t=d.transaction('photos',mode), r=fn(t.objectStore('photos')); t.oncomplete=()=>res(r&&r.result!==undefined?r.result:true); t.onerror=()=>res(null); }catch(e){ res(null); } }); };
/* shrink to 1600 px on the long side, as JPEG; a phone camera file is 4000 px and 5 MB */
Y.shrink=async function(file,max){
 max=max||1600;
 try{ const bm=await createImageBitmap(file); const k=Math.min(1,max/Math.max(bm.width,bm.height)), w=Math.round(bm.width*k), h=Math.round(bm.height*k);
  const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(bm,0,0,w,h);
  const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9)); return b?{blob:b,w,h}:null; }catch(e){ return null; }
};
/* a headshot in: kept once (same size and name = same photo); the first one is your main one */
Y.addPhoto=async function(file){
 const sig=String(file.name||'')+'|'+(file.size||0), d=Y.get(); const dup=d.photos.find(p=>p.sig===sig); if(dup) return {photo:dup,dup:true};
 const s=await Y.shrink(file); if(!s) return {error:/heic|heif/i.test(file.name||file.type||'')?'this browser can\'t open HEIC photos; export it as JPEG from Photos':'not a photo this browser can open'};
 const id='h'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 if(!(await op('readwrite',st=>st.put(s.blob,id)))) return {error:'this phone would not keep the photo'};
 const p={id,sig,name:file.name||'headshot.jpg',w:s.w,h:s.h,added:Date.now()};
 const e=Y.get(); e.photos.push(p); if(!e.primary) e.primary=id; put(e); return {photo:p,primary:e.primary===id};
};
Y.photoBlob=id=>op('readonly',st=>st.get(id));
Y.setPrimary=function(id){ const d=Y.get(); if(d.photos.some(p=>p.id===id)){ d.primary=id; put(d); } return d; };
Y.removePhoto=async function(id){ const d=Y.get(); d.photos=d.photos.filter(p=>p.id!==id); if(d.primary===id) d.primary=d.photos[0]?d.photos[0].id:''; put(d); await op('readwrite',st=>st.delete(id)); return d; };
g.You=Y;
if(typeof module!=='undefined') module.exports=Y;
})(typeof window!=='undefined'?window:globalThis);
