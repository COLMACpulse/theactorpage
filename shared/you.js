/* THEACTORPAGE YOU: one profile on this phone, filled once (from your résumé, your headshots, a request)
   and read by every tool that asks: the Hub, Virtual Résumé, Slate Maker, Actor OS.
   Rule: a tool only fills its own blanks from here. It never overwrites what you typed in that tool.
   Rule: what you fix here stays fixed: a later résumé fills blanks, it doesn't undo your edit.

   localStorage 'theactorpage_you_v1' (the words). IndexedDB 'theactorpage_you' / 'photos' (headshots,
   kept at up to 1600 px on the long side). Nothing uploaded. */
(function(g){
/* ask the browser to keep this site's things (not clear them when space runs low): the first time you put something in, then at most once a day until it says yes */
function keepAsk(){ try{ const s=navigator.storage; if(!s||!s.persist) return; const k='theactorpage_keep_asked', t=+localStorage.getItem(k)||0; if(Date.now()-t<86400000) return; localStorage.setItem(k,String(Date.now())); (s.persisted?s.persisted():Promise.resolve(false)).then(p=>{ if(!p) s.persist(); }).catch(()=>{}); }catch(e){} }

const KEY='theactorpage_you_v1';
const Y={};
Y.FIELDS=[['name','Name'],['union','Union'],['rep','Rep'],['repPhone','Rep phone'],['phone','Your phone'],['email','Email'],['height','Height'],['weight','Weight'],['hair','Hair'],['eyes','Eyes'],['locations','Local hire']];
const blank=()=>({name:'',union:'',rep:'',repPhone:'',phone:'',email:'',height:'',weight:'',hair:'',eyes:'',locations:'',credits:[],training:[],skills:[],accents:[],languages:[],types:[],photos:[],primary:'',live:null,lead:'still',resume:null,edited:{},from:{},updated:0});
Y.get=function(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d) return Object.assign(blank(),d); }catch(e){} return blank(); };
function put(d){ d.updated=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
Y.has=()=>{ const d=Y.get(); return !!(d.name||d.credits.length||d.photos.length||d.resume); };
const ck=c=>(c.section+'|'+c.title).toLowerCase().replace(/[^a-z0-9|]+/g,'');
/* Read from a source (a résumé, a request). Fills blanks; a field you edited by hand is left alone.
   Returns what changed: [[label, value]] */
Y.fill=function(p,source){ keepAsk();
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
/* your socials: just the handle or the address, no passwords, no sign-in. onCard / onPage: which ones go on
   your POSTCARD and on your page (only the ones you tick). */
Y.SOCIALS=[['instagram','Instagram','@yourname'],['tiktok','TikTok','@yourname'],['x','X','@yourname'],['facebook','Facebook','facebook.com/yourname'],['youtube','YouTube','@yourchannel'],['page','Your page','yoursite.com']];
Y.setFlag=function(group,k,v){ const d=Y.get(); d[group]=Object.assign({},d[group]||{},{[k]:!!v}); put(d); return d; };
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
  const b=await new Promise(r=>c.toBlob(r,'image/jpeg',0.9)); return b?{blob:b,w,h,ow:bm.width,oh:bm.height}:null; }catch(e){ return null; }
};
/* a headshot in: kept once (same size and name = same photo); the first one is your main one.
   opts.kind 'still': a still from your own footage (FOOTAGE), kept with your photos for a press kit or your page, never your main headshot. opts.from: {title, role, t} */
Y.addPhoto=async function(file,opts){ keepAsk(); opts=opts||{};
 const sig=String(file.name||'')+'|'+(file.size||0), d=Y.get(); const dup=d.photos.find(p=>p.sig===sig); if(dup) return {photo:dup,dup:true};
 const s=await Y.shrink(file); if(!s) return {error:/heic|heif/i.test(file.name||file.type||'')?'this browser can\'t open HEIC photos; export it as JPEG from Photos':'not a photo this browser can open'};
 const id='h'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 if(!(await op('readwrite',st=>st.put(s.blob,id)))) return {error:'this phone would not keep the photo'};
 const p={id,sig,name:file.name||'headshot.jpg',w:s.w,h:s.h,ow:s.ow||s.w,oh:s.oh||s.h,added:Date.now(),roles:[],status:'',note:''};
 if(opts.kind==='still'){ p.kind='still'; if(opts.from) p.from=opts.from; } if(opts.live) p.fromLive=true;
 const e=Y.get(); e.photos.push(p); if(!e.primary&&p.kind!=='still') e.primary=id; put(e); return {photo:p,primary:e.primary===id};
};
Y.photoBlob=id=>op('readonly',st=>st.get(id));
Y.headshots=()=>Y.get().photos.filter(p=>p.kind!=='still');
Y.stills=()=>Y.get().photos.filter(p=>p.kind==='still');
/* your words on a headshot: the roles it's for, keep / retest / retire, a note; and its photo check (HEADSHOTS) */
Y.setPhoto=function(id,patch){ const d=Y.get(), p=d.photos.find(x=>x.id===id); if(!p) return null; Object.assign(p,patch); put(d); return p; };
Y.setPrimary=function(id){ const d=Y.get(); if(d.photos.some(p=>p.id===id)){ d.primary=id; put(d); } return d; };
Y.removePhoto=async function(id){ const d=Y.get(); d.photos=d.photos.filter(p=>p.id!==id); if(d.live&&d.live.still===id) d.live.still=''; if(d.primary===id){ const h=d.photos.find(p=>p.kind!=='still'); d.primary=h?h.id:''; } put(d); await op('readwrite',st=>st.delete(id)); return d; };
/* ---------- the live one: five seconds of you, on a loop (HEADSHOTS). One at a time; a new one replaces it.
   d.live {name,mime,ext,secs,sound,w,h,added,still}  d.lead 'live' | 'still': which one leads where moving pictures play
   (your page, the postcard). Anywhere that takes only stills gets your main headshot. ---------- */
Y.setLive=async function(blob,meta){ keepAsk(); meta=meta||{};
 if(!blob||!(await op('readwrite',st=>st.put(blob,'live')))) return null;
 const d=Y.get(); d.live={name:meta.name||'live_headshot.'+(meta.ext||'webm'),mime:meta.mime||blob.type||'video/webm',ext:meta.ext||'webm',secs:+meta.secs||0,sound:!!meta.sound,w:meta.w||0,h:meta.h||0,added:Date.now(),still:meta.still||''};
 d.lead='live'; put(d); return d.live;
};
Y.liveBlob=()=>op('readonly',st=>st.get('live'));
Y.setLiveStill=function(id){ const d=Y.get(); if(d.live){ d.live.still=id||''; put(d); } return d; };
Y.setLead=function(k){ const d=Y.get(); d.lead=k==='live'&&d.live?'live':'still'; put(d); return d; };
/* the live one leads (there is one, and you picked LIVE) */
Y.leadsLive=()=>{ const d=Y.get(); return !!(d.live&&d.lead==='live'); };
Y.removeLive=async function(){ const d=Y.get(); d.live=null; d.lead='still'; put(d); await op('readwrite',st=>st.delete('live')); return d; };
/* ---------- your résumé, the file itself: kept so it's here when someone asks for it ---------- */
Y.setResume=async function(file,source){ keepAsk();
 if(!file) return null;
 if(!(await op('readwrite',st=>st.put(file,'resume')))) return null;
 const d=Y.get(); d.resume={name:file.name||'resume.pdf',type:file.type||'',size:file.size||0,added:Date.now(),from:source||''}; put(d); return d.resume;
};
Y.resumeBlob=()=>op('readonly',st=>st.get('resume'));
Y.removeResume=async function(){ const d=Y.get(); d.resume=null; put(d); await op('readwrite',st=>st.delete('resume')); return d; };
g.You=Y;
if(typeof module!=='undefined') module.exports=Y;
})(typeof window!=='undefined'?window:globalThis);
