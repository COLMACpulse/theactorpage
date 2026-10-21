/* THEACTORPAGE ROOMS: the object on each band of home, filled with what you put in. Like the lens in YOU.
   ACT    the slate: your latest audition (the request you dropped, or the Hub's latest), the role, your take count, today, you.
          The sticks clap once when a new one lands.
   WRITE  the typewriter: the title page of your latest draft in Paper Trail (or the last script you dropped), written by you.
          A new draft types its title onto the page.
   FILM   the camera: your Story Studio film, its FILM HUB poster in the viewfinder. The reels turn once when it changes.
   VO     the ON THE AIR mic: the sign lights while a mic on this page is live (the camera/mic bar says so); the plate is the
          client of your last VO BOOTH read.
   Read only. Nothing leaves this device. Motion only for people who haven't asked their device for less. */
(function(g){
const $=id=>document.getElementById(id);
const LS=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
const cut=(s,n)=>{ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>n?s.slice(0,n-1)+'…':s; };
const dots=t=>{ const d=t?new Date(t):new Date(); return isFinite(d)?(d.getMonth()+1)+'.'+d.getDate()+'.'+String(d.getFullYear()).slice(2):''; };
const still=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
/* true when this changed since the last time home drew it (never on the first time) */
function changed(k,v){ let old=null; try{ old=localStorage.getItem('rooms_seen_'+k); localStorage.setItem('rooms_seen_'+k,v); }catch(e){} return old!==null&&old!==v&&!!v; }
function put(id,t){ const el=$(id); if(el) el.textContent=t||''; }
function why(id,show){ const el=$(id); if(el) el.hidden=!show; }
function play(el,cls){ if(!el||still()) return; el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); }
const R={};
let HUB=null;

/* ---------- ACT: the slate ---------- */
R.slateData=function(){
 const I=g.Inbox, T=g.Takes, Y=g.You;
 let title='', role='', at=0;
 const rq=I?I.all('request').slice().sort((a,b)=>b.at-a.at)[0]:null;
 if(rq&&(rq.data.title||rq.data.role)){ title=rq.data.title||''; role=rq.data.role||''; at=rq.at; }
 else if(HUB&&HUB.projects){ const p=HUB.projects.filter(x=>x&&(x.aaid||x.kind==='audition')).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]; if(p){ title=p.project||p.title||''; role=p.role||''; } }
 let take=0; try{ if(T&&title){ const k=title.toLowerCase(); take=T.all('selftape').filter(x=>x.for&&String(x.for.title||'').toLowerCase()===k).length; } }catch(e){}
 let name=''; try{ name=Y?Y.get().name:''; }catch(e){}
 return {title,role,take,name,at};
};
function slate(){
 const d=R.slateData();
 /* nothing of yours yet: the slate shows the sample, said so under it */
 if(!d.title){ put('sl_prod','LOW TIDE (SAMPLE)'); put('sl_role','ANNA'); put('sl_take','1'); put('sl_date',dots()); put('sl_name',cut(d.name||'YOUR NAME',22)); why('sl_why',true); changed('slate','|'); return; }
 put('sl_prod',cut(d.title,22)); put('sl_role',cut(d.role,14)); put('sl_take',d.title?String(Math.max(1,d.take+1)):''); put('sl_date',dots()); put('sl_name',cut(d.name,22));
 why('sl_why',!d.title);
 if(changed('slate',d.title+'|'+d.role)) play($('slate'),'clap');
}

/* ---------- WRITE: the typewriter ---------- */
R.pageData=function(){
 const PT=LS('paper_trail_v1'), Y=g.You; let title='', label='', at=0;
 if(PT&&PT.projects){ const p=Object.values(PT.projects).filter(x=>x&&!x.retired).sort((a,b)=>(b.updated||0)-(a.updated||0))[0];
  if(p){ title=p.title||''; const ds=Object.values(PT.drafts||{}).filter(x=>x.project===p.id).sort((a,b)=>(b.added||0)-(a.added||0)); const d=(p.current&&PT.drafts[p.current])||ds[0]; if(d){ label=d.label||''; at=d.added||0; } } }
 if(!title&&g.Inbox){ const dr=g.Inbox.all('draft').slice().sort((a,b)=>b.at-a.at)[0]; if(dr){ title=String(dr.data.file||'').replace(/\.(pdf|fdx|fountain|txt|docx)$/i,'').replace(/[_]+/g,' '); at=dr.at; } }
 let name=''; try{ name=Y?Y.get().name:''; }catch(e){}
 return {title,label,at,name};
};
let TYPING=null;
function typewriter(){
 const d=R.pageData(), el=$('tw_title'), full=cut(d.title,20).toUpperCase();
 put('tw_by',d.title?'written by':''); put('tw_name',cut(d.name,22)); put('tw_date',d.title?[cut(d.label,16),dots(d.at||Date.now())].filter(Boolean).join(' · '):'');
 why('tw_why',!d.title);
 clearInterval(TYPING);
 if(el&&changed('page',d.title+'|'+d.label)&&!still()){ let i=0; el.textContent=''; TYPING=setInterval(()=>{ i++; el.textContent=full.slice(0,i); if(i>=full.length) clearInterval(TYPING); },70); }
 else put('tw_title',full);
}

/* ---------- FILM: the camera ---------- */
const titleOf=c=>{ const m=String((c&&c.text)||'').slice(0,2000).match(/^\s*Title:\s*(.+)$/im); return m?m[1].replace(/[_*]+/g,'').trim():String((c&&c.file)||'').replace(/\.(pdf|txt|fountain|fdx|docx)$/i,'').replace(/[_]+/g,' ').trim(); };
R.filmData=function(){
 const FS=LS('film_os_v1'); if(!FS||!FS.scripts) return {id:'',title:''};
 let id=FS.cur&&FS.scripts[FS.cur]&&FS.scripts[FS.cur].text?FS.cur:Object.keys(FS.scripts).find(k=>FS.scripts[k]&&FS.scripts[k].text)||'';
 return {id, title:id?titleOf(FS.scripts[id]):''};
};
function poster(key){ return new Promise(res=>{
 if(typeof indexedDB==='undefined') return res(null);
 let made=false; const r=indexedDB.open('filmhub');
 r.onupgradeneeded=e=>{ made=true; try{ e.target.transaction.abort(); }catch(x){} };       // no FILM HUB on this device: don't make one
 r.onerror=()=>res(null);
 r.onsuccess=e=>{ const db=e.target.result; if(made||!db.objectStoreNames.contains('posters')){ db.close(); return res(null); }
  const q=db.transaction('posters','readonly').objectStore('posters').get(key); q.onsuccess=()=>{ db.close(); res(q.result||null); }; q.onerror=()=>{ db.close(); res(null); }; };
}); }
let PURL='';
async function camera(){
 const d=R.filmData(), img=$('cam_img');
 put('cam_title',cut(d.title,26)); why('cam_why',!d.title);
 // no poster yet: the title in the viewfinder, two short lines
 const ws=String(d.title||'').toUpperCase().split(/\s+/).filter(Boolean); let a='', z='';
 ws.forEach(w=>{ if(!z&&(a+' '+w).trim().length<=9) a=(a+' '+w).trim(); else z=(z+' '+w).trim(); });
 if(!d.title){ a='YOUR FILM'; z='--'; }   // nothing yet: the screen still reads, like the slate and the page
 put('cam_vf1',cut(a,9)); put('cam_vf2',cut(z,9));
 const b=d.id?await poster('s:'+d.id):null;
 if(img){ if(PURL){ try{ URL.revokeObjectURL(PURL); }catch(e){} PURL=''; } if(b){ PURL=URL.createObjectURL(b); img.setAttribute('href',PURL); img.style.display=''; } else { img.removeAttribute('href'); img.style.display='none'; } const vf=$('cam_vf'); if(vf) vf.style.display=b?'none':''; }
 if(changed('film',d.id+'|'+d.title+'|'+(b?b.size:0))) play($('cam'),'roll');
}

/* ---------- VO: the mic ---------- */
function mic(){
 const B=LS('booth_v1'); put('mic_plate',cut((B&&B.job&&B.job.client)||'VO BOOTH',14).toUpperCase());
 const lit=()=>{ const bar=document.getElementById('hotbar'), on=!!(bar&&/\bMIC\b/.test(bar.textContent||'')); const m=$('mic'); if(!m||m.classList.contains('air')===on) return; m.classList.toggle('air',on); const s=$('mic_sr'); if(s) s.textContent=on?'Mic is on':''; };   // only on a change: writing the text is itself a change the watcher sees
 lit(); if(!R._mo){ R._mo=new MutationObserver(lit); R._mo.observe(document.body,{childList:true,subtree:true,characterData:true}); }
}

R.draw=function(){ try{ slate(); }catch(e){} try{ typewriter(); }catch(e){} try{ camera(); }catch(e){} try{ mic(); }catch(e){} };
R.load=function(){ R.draw(); if(g.Offices&&g.Offices.load) g.Offices.load().then(h=>{ HUB=h; slate(); }).catch(()=>{}); };
addEventListener('storage',e=>{ if(/^(theactorpage_inbox|paper_trail_v1|film_os_v1|booth_v1|theactorpage_you_v1|theactorpage_takes)/.test(e.key||'')) R.draw(); });
g.Rooms=R;
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',R.load); else R.load();
})(window);
