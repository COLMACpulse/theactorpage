/* FILM HUB: your films, from the filmmaker's side.
   FILMS   every Story Studio project, where it stands (counted from what you marked there), plus the films you made
           before, added by hand. Each one: poster, logline, year, kind, runtime, credit line, links, on the page or not.
   PAGE    your banner and the films you choose, as one page to send. A file for now.
   PEOPLE  everyone on your films: who played what, who did what job. Never their phone numbers.
   Nothing uploaded. localStorage filmhub_v1, posters in IndexedDB filmhub. Story Studio is read, never written. */
(function(){
const H=window.FilmHub, F=window.FilmOS, Y=window.You;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='filmhub_v1', UK='filmhub_ui_v1';
const blank=()=>({films:[],studio:{},me:{banner:'',about:'',email:''}});
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.films)) return Object.assign(blank(),d,{me:Object.assign(blank().me,d.me||{})}); }catch(e){} return blank(); }
let D=load();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('This phone would not save.'); } };
let U=(()=>{ try{ return Object.assign({tab:'films',open:''},JSON.parse(localStorage.getItem(UK)||'{}')); }catch(e){ return {tab:'films',open:''}; } })();
const saveU=()=>{ try{ localStorage.setItem(UK,JSON.stringify(U)); }catch(e){} };
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3000); }
const uid=()=>'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
/* Story Studio's projects, read-only */
function studio(){ try{ const d=JSON.parse(localStorage.getItem('film_os_v1')||'null'); return (d&&d.scripts)||{}; }catch(e){ return {}; } }
const you=()=>{ try{ return Y?Y.get():{}; }catch(e){ return {}; } };
/* every film: Story Studio ones ('s:'+id) and yours by hand */
function films(){
 const S=studio(), L=[];
 Object.keys(S).forEach(id=>{ const c=S[id]; if(!c||!c.text) return; const x=D.studio[id]||{}; const st=H.status(c,F);
  L.push(Object.assign({id:'s:'+id,sid:id,from:'studio',title:x.title||H.title(c),links:[]},x,{st,stage:H.stage(st,x.mark)})); });
 D.films.forEach(f=>L.push(Object.assign({from:'hand',links:[]},f,{stage:f.mark==='done'?'done':'',st:null})));
 return L;
}
const film=id=>films().find(f=>f.id===id);
function rec(f){ if(f.from==='studio'){ D.studio[f.sid]=D.studio[f.sid]||{}; return D.studio[f.sid]; } return D.films.find(x=>x.id===f.id); }
/* posters: this device only, a 600 px JPEG */
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(res=>{ try{ const r=indexedDB.open('filmhub',1); r.onupgradeneeded=()=>r.result.createObjectStore('posters'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); return dbp; }
async function putPoster(id,blob){ const d=await db(); if(!d) return; await new Promise(r=>{ const t=d.transaction('posters','readwrite'); t.objectStore('posters').put(blob,id); t.oncomplete=r; t.onerror=r; }); }
async function getPoster(id){ const d=await db(); if(!d) return null; return new Promise(r=>{ const q=d.transaction('posters','readonly').objectStore('posters').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }
async function delPoster(id){ const d=await db(); if(d) try{ d.transaction('posters','readwrite').objectStore('posters').delete(id); }catch(e){} }
async function shrink(file,max){ try{ const bm=await createImageBitmap(file); const k=Math.min(1,(max||600)/Math.max(bm.width,bm.height)); const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k); c.getContext('2d').drawImage(bm,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(b=>r(b||file),'image/jpeg',0.85)); }catch(e){ return file; } }
const URLS={};
async function fillPosters(){ for(const im of document.querySelectorAll('img[data-poster]')){ const id=im.dataset.poster; if(URLS[id]===undefined){ const b=await getPoster(id); URLS[id]=b?URL.createObjectURL(b):''; } if(URLS[id]){ im.src=URLS[id]; im.hidden=false; } } }
const dataUrl=b=>new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(f.result); f.onerror=()=>r(''); f.readAsDataURL(b); });

/* ---------- FILMS ---------- */
function card(f){
 const sub=f.from==='studio'?(H.words(f.st)[0]||''):[f.year,f.kind].filter(Boolean).join(' · ');
 return '<button class="fc" data-open="'+esc(f.id)+'"><img class="po" data-poster="'+esc(f.id)+'" alt="" hidden><div><b>'+esc(f.title||'Untitled')+'</b><small>'+esc(sub)+'</small>'
  +(f.stage?'<span class="stg">'+esc(H.stageWord(f.stage))+'</span>':'')+(f.show===false?'<span class="stg" style="color:var(--faint);margin-left:8px">off the page</span>':'')+'</div></button>';
}
function filmsView(){
 if(U.open&&film(U.open)) return filmView(film(U.open));
 const L=films(), mk=L.filter(f=>f.from==='studio'), mine=L.filter(f=>f.from==='hand');
 let h='';
 h+='<p class="kicker">Making now</p>'+(mk.length?mk.map(card).join(''):'<div class="card"><p class="dim small" style="margin:0">Nothing in Story Studio yet. Start a film there and it shows up here, counted from what you mark.</p><a class="btn" href="../film/" style="margin-top:10px;text-decoration:none">OPEN STORY STUDIO</a></div>');
 h+='<p class="kicker" style="margin-top:18px">Films you\'ve made</p>'+(mine.length?mine.map(card).join(''):'<p class="faint small">The ones from before, or made anywhere else. Add them here for the page.</p>');
 h+='<button class="btn" id="addfilm" style="margin-top:6px">ADD A FILM YOU\'VE MADE</button>';
 return h;
}
function filmView(f){
 const r=rec(f)||{}, hand=f.from==='hand';
 const fld=(k,l,ph,v)=>'<label class="lab" for="ff_'+k+'">'+l+'</label><input class="field" id="ff_'+k+'" data-ff="'+k+'" value="'+esc(v!=null?v:(r[k]||''))+'" placeholder="'+esc(ph||'')+'">';
 let h='<div class="row" style="margin-bottom:10px"><button class="lnk" id="back">‹ All films</button></div>';
 h+='<div class="card"><div class="row" style="align-items:flex-start;gap:14px"><label style="cursor:pointer"><img class="po big" data-poster="'+esc(f.id)+'" alt="Poster" hidden><span class="btn sm" style="margin-top:6px">'+(URLS[f.id]?'NEW POSTER':'ADD A POSTER')+'</span><input type="file" id="pf" accept="image/*" hidden></label>'
  +'<div style="flex:1;min-width:0"><h2 style="font-size:20px">'+esc(f.title||'Untitled')+'</h2>'+(f.stage?'<span class="stg">'+esc(H.stageWord(f.stage))+'</span>':'')
  +'<div class="row" style="margin-top:10px"><button class="chip sm'+(r.mark==='done'?' on':'')+'" id="done">'+(r.mark==='done'?'Done':'Mark it done')+'</button><button class="chip sm'+(r.show===false?'':' on')+'" id="show">'+(r.show===false?'Off the page':'On the page')+'</button></div></div></div></div>';
 if(!hand){ h+='<div class="card"><p class="kicker">Where it stands</p><ul class="facts">'+H.words(f.st).map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul><a class="btn" href="../film/#open='+encodeURIComponent(f.sid)+'" style="margin-top:10px;text-decoration:none">OPEN IN STORY STUDIO</a></div>'; }
 h+='<div class="card"><p class="kicker">On the page</p>'+(hand?fld('title','Title','',f.title):fld('title','Title on the page','',r.title||f.title))
  +fld('logline','Logline','One line: who, what they want, what\'s in the way')+'<div class="row" style="gap:8px"><div style="flex:1 1 90px">'+fld('year','Year','2026')+'</div><div style="flex:1 1 120px">'+fld('kind','Kind','Short, feature, pilot')+'</div><div style="flex:1 1 90px">'+fld('runtime','Runtime','12 min')+'</div></div>'
  +fld('credit','Credit line','Written and directed by …')
  +'<p class="lab">Links</p>'+(r.links||[]).map((l,i)=>'<div class="pair"><input class="field" data-lk="'+i+'|label" value="'+esc(l.label)+'" placeholder="Watch, Trailer"><input class="field" data-lk="'+i+'|url" value="'+esc(l.url)+'" placeholder="https://" inputmode="url"><button class="lnk faint" data-rmlk="'+i+'" aria-label="Remove">✕</button></div>').join('')
  +'<button class="btn sm" id="addlk" style="margin-top:4px">ADD A LINK</button>'
  +(hand?'<label class="lab" for="ff_people">Who was on it (one a line: "Sound: Jo Park")</label><textarea class="field" id="ff_people" data-ff="people" placeholder="Directed by: …">'+esc(r.people||'')+'</textarea>':'<p class="faint small" style="margin-top:10px">Cast and crew come from Story Studio\'s call sheet and credits.</p>')
  +'</div>';
 if(hand) h+='<div class="row" style="justify-content:flex-end"><button class="lnk faint" id="del">delete this film</button></div>';
 return h;
}

/* ---------- PAGE ---------- */
function pageFilms(){ return films().map(f=>({f,r:rec(f)||{}})).map(({f,r})=>({id:f.id,title:r.title||f.title,year:r.year,kind:r.kind,runtime:r.runtime,logline:r.logline,credit:r.credit,links:(r.links||[]).filter(l=>l.url),show:r.show!==false})); }
async function pageHtml(){ const L=pageFilms(); for(const x of L){ const b=await getPoster(x.id); x.poster=b?await dataUrl(b):''; }
 const y=you(); return H.pageHtml(L,{banner:D.me.banner,name:y.name||'',about:D.me.about,email:D.me.email}); }
function pageView(){
 const y=you(), L=pageFilms();
 let h='<div class="card"><p class="kicker">Your page</p><label class="lab" for="pbanner">Banner</label><input class="field" id="pbanner" data-pm="banner" value="'+esc(D.me.banner)+'" placeholder="Your company, or your name">'
  +'<label class="lab" for="pname">Your name</label><input class="field" id="pname" value="'+esc(y.name||'')+'" placeholder="As it goes on the page">'
  +'<label class="lab" for="pabout">About (a line or two)</label><textarea class="field" id="pabout" data-pm="about" style="min-height:80px">'+esc(D.me.about)+'</textarea>'
  +'<label class="lab" for="pemail">Email on the page (optional)</label><input class="field" id="pemail" data-pm="email" value="'+esc(D.me.email)+'" inputmode="email"></div>';
 h+='<div class="card"><p class="kicker">On it</p>'+(L.length?L.map(x=>'<label class="row" style="justify-content:space-between;padding:6px 0"><span>'+esc(x.title||'Untitled')+(x.year?' <span class="faint">'+esc(x.year)+'</span>':'')+'</span><input type="checkbox" data-pshow="'+esc(x.id)+'"'+(x.show?' checked':'')+'></label>').join(''):'<p class="faint small">No films yet.</p>')+'</div>';
 h+='<div class="card"><p class="dim small" style="margin-top:0">Only what\'s on this tab and each film\'s ON THE PAGE box goes in. Never the script, your notes, call times or anyone\'s phone number.</p>'
  +'<div class="row"><button class="btn" id="pprev">PREVIEW</button><button class="btn pri" id="psave" style="flex:1">SAVE AS A PAGE</button></div></div><div id="pvbox"></div>';
 return h;
}

/* ---------- PEOPLE ---------- */
function peopleView(){
 const P=H.people(studio(),F,D.films.map(f=>({title:f.title,people:f.people})));
 if(!P.length) return '<div class="card"><p class="dim" style="margin:0">Just you so far. Name the cast in Story Studio\'s call sheet, or add who was on a film you\'ve made, and they show up here.</p></div>';
 return '<div class="card">'+P.map(p=>'<div class="pp"><b>'+esc(p.name)+'</b><small>'+p.films.map(f=>esc(f.film)+(f.jobs.length?' ('+esc(f.jobs.join(', '))+')':'')).join(' · ')+'</small></div>').join('')+'</div>';
}

/* ---------- draw and wire ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===U.tab));
 const L=films(); $('count').textContent=L.length?L.length+' film'+(L.length===1?'':'s')+' · '+L.filter(f=>f.stage==='done').length+' done':'';
 $('main').innerHTML=U.tab==='films'?filmsView():U.tab==='page'?pageView():peopleView();
 wire(); fillPosters();
}
function wire(){
 const M=$('main');
 M.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ U.open=b.dataset.open; saveU(); render(); scrollTo(0,0); });
 if($('back')) $('back').onclick=()=>{ U.open=''; saveU(); render(); };
 if($('addfilm')) $('addfilm').onclick=()=>{ const f={id:uid(),title:'',year:'',kind:'',runtime:'',logline:'',credit:'',links:[],people:''}; D.films.push(f); save(); U.open=f.id; saveU(); render(); const t=$('ff_title'); if(t) t.focus(); };
 const f=U.open&&film(U.open);
 if(f&&U.tab==='films'){ const r=()=>rec(film(U.open));
  M.querySelectorAll('[data-ff]').forEach(el=>el.onchange=()=>{ r()[el.dataset.ff]=el.value.trim(); save(); if(el.dataset.ff==='title') render(); });
  M.querySelectorAll('[data-lk]').forEach(el=>el.onchange=()=>{ const [i,k]=el.dataset.lk.split('|'); r().links[i][k]=el.value.trim(); save(); });
  M.querySelectorAll('[data-rmlk]').forEach(b=>b.onclick=()=>{ r().links.splice(+b.dataset.rmlk,1); save(); render(); });
  if($('addlk')) $('addlk').onclick=()=>{ const x=r(); x.links=x.links||[]; x.links.push({label:'Watch',url:''}); save(); render(); };
  if($('done')) $('done').onclick=()=>{ const x=r(); x.mark=x.mark==='done'?'':'done'; save(); render(); };
  if($('show')) $('show').onclick=()=>{ const x=r(); x.show=x.show===false; save(); render(); };
  if($('pf')) $('pf').onchange=async e=>{ const file=e.target.files[0]; if(!file) return; const b=await shrink(file,600); await putPoster(f.id,b); if(URLS[f.id]) URL.revokeObjectURL(URLS[f.id]); URLS[f.id]=URL.createObjectURL(b); render(); toast('Poster kept on this device.'); };
  if($('del')) $('del').onclick=async()=>{ if(!confirm('Delete this film from FILM HUB?')) return; D.films=D.films.filter(x=>x.id!==f.id); await delPoster(f.id); U.open=''; save(); saveU(); render(); };
 }
 M.querySelectorAll('[data-pm]').forEach(el=>el.onchange=()=>{ D.me[el.dataset.pm]=el.value.trim(); save(); });
 if($('pname')) $('pname').onchange=e=>{ try{ Y.set('name',e.target.value); }catch(x){} };
 M.querySelectorAll('[data-pshow]').forEach(el=>el.onchange=()=>{ const x=rec(film(el.dataset.pshow)); if(x){ x.show=el.checked; save(); } });
 if($('pprev')) $('pprev').onclick=async()=>{ const html=await pageHtml(); $('pvbox').innerHTML='<iframe class="pv" sandbox title="Your page"></iframe>'; $('pvbox').firstChild.srcdoc=html; };
 if($('psave')) $('psave').onclick=async()=>{ const html=await pageHtml(), y=you(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download=((D.me.banner||y.name||'Films').replace(/[\\/:*?"<>|]+/g,' ').trim())+' - films.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved. Attach it, or open it and print.'); };
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ if(U.tab===b.dataset.t) U.open=''; U.tab=b.dataset.t; saveU(); render(); scrollTo(0,0); });
addEventListener('storage',e=>{ if(e.key==='film_os_v1') render(); });
render();
window.__filmhub={films,D};
})();
