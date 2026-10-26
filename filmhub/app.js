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
const blank=()=>({films:[],studio:{},notes:[],me:{banner:'',about:'',email:'',into:[],want:[]}});
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.films)) return Object.assign(blank(),d,{me:Object.assign(blank().me,d.me||{})}); }catch(e){} return blank(); }
let D=load();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('This phone would not save.'); } };
addEventListener('resize',()=>{ clearTimeout(window.__ur); window.__ur=setTimeout(()=>{ if(U.tab==='you') render(); },250); });
let U=(()=>{ try{ return Object.assign({tab:'films',open:''},JSON.parse(localStorage.getItem(UK)||'{}')); }catch(e){ return {tab:'films',open:''}; } })();
try{ const t=new URLSearchParams(location.search).get('tab'); if(['films','page','people','you'].includes(t)){ U.tab=t; U.open=''; } }catch(e){}
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
function db(){ if(dbp) return dbp; dbp=new Promise(res=>{ try{ const r=indexedDB.open('filmhub',2); r.onupgradeneeded=()=>{ const d=r.result; if(!d.objectStoreNames.contains('posters')) d.createObjectStore('posters'); if(!d.objectStoreNames.contains('notes')) d.createObjectStore('notes'); }; r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); return dbp; }
/* notes: the recordings, this device only (store 'notes'); a frame from each in 'posters' as 'n:'+id */
async function putNote(id,blob){ const d=await db(); if(!d) return false; return new Promise(r=>{ const t=d.transaction('notes','readwrite'); t.objectStore('notes').put(blob,id); t.oncomplete=()=>r(true); t.onerror=()=>r(false); t.onabort=()=>r(false); }); }
async function getNote(id){ const d=await db(); if(!d) return null; return new Promise(r=>{ const q=d.transaction('notes','readonly').objectStore('notes').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }
async function delNote(id){ const d=await db(); if(d) try{ d.transaction('notes','readwrite').objectStore('notes').delete(id); d.transaction('posters','readwrite').objectStore('posters').delete('n:'+id); }catch(e){} }
const notesOf=fid=>(D.notes||[]).filter(n=>n.film===fid).sort((a,b)=>b.at-a.at);
async function putPoster(id,blob){ const d=await db(); if(!d) return; await new Promise(r=>{ const t=d.transaction('posters','readwrite'); t.objectStore('posters').put(blob,id); t.oncomplete=r; t.onerror=r; }); }
async function getPoster(id){ const d=await db(); if(!d) return null; return new Promise(r=>{ const q=d.transaction('posters','readonly').objectStore('posters').get(id); q.onsuccess=()=>r(q.result||null); q.onerror=()=>r(null); }); }
async function delPoster(id){ const d=await db(); if(d) try{ d.transaction('posters','readwrite').objectStore('posters').delete(id); }catch(e){} }
async function shrink(file,max){ try{ const bm=await createImageBitmap(file); const k=Math.min(1,(max||600)/Math.max(bm.width,bm.height)); const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k); c.getContext('2d').drawImage(bm,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(b=>r(b||file),'image/jpeg',0.85)); }catch(e){ return file; } }
const URLS={};
async function fillPosters(){ for(const im of document.querySelectorAll('img[data-poster]')){ for(const id of [im.dataset.poster,im.dataset.alt].filter(Boolean)){ if(URLS[id]===undefined){ const b=await getPoster(id); URLS[id]=b?URL.createObjectURL(b):''; } if(URLS[id]){ im.src=URLS[id]; im.hidden=false; break; } } }
 for(const v of document.querySelectorAll('[data-note]')){ if(v.src) continue; const b=await getNote(v.dataset.note); if(b){ NURL[v.dataset.note]=NURL[v.dataset.note]||URL.createObjectURL(b); v.src=NURL[v.dataset.note]; } } }
const NURL={};
const dataUrl=b=>new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(f.result); f.onerror=()=>r(''); f.readAsDataURL(b); });

/* ---------- FILMS ---------- */
/* a Story Studio film: its four steps, and what to do next, in one tap */
function pathHtml(f){ if(f.from!=='studio'||!H.path) return ''; const c=studio()[f.sid]; return '<div class="path">'+H.path(f.st,c).map(x=>'<span class="'+(x.now?'now':x.done?'y':'')+'">'+x.label+(x.done?' ✓':x.now?' · '+esc(x.words):'')+'</span>').join('')+'</div>'; }
function goOf(f){ if(f.from!=='studio') return ''; const c=studio()[f.sid]||{}, fin=c.cut&&c.cut.final, id=encodeURIComponent(f.sid);
 return fin?'<a class="btn pri fgo" href="../film/#open='+id+'&tab=out">PUT IT OUT</a>':'<a class="btn fgo" href="../film/#open='+id+'">PICK UP</a>'; }
function card(f){
 const sub=f.from==='studio'?(H.words(f.st)[0]||''):[f.year,f.kind,f.runtime].filter(Boolean).join(' · ');
 const ns=notesOf(f.id), alt=ns.find(n=>n.thumb);
 return '<button class="fc" data-open="'+esc(f.id)+'"><img class="po" data-poster="'+esc(f.id)+'"'+(alt?' data-alt="n:'+esc(alt.id)+'"':'')+' alt="" hidden><div><b>'+esc(f.title||'Untitled')+'</b><small>'+esc(sub)+'</small>'+(ns.length?'<small>'+ns.length+' note'+(ns.length===1?'':'s')+', last '+esc(new Date(ns[0].at).toLocaleDateString(undefined,{month:'short',day:'numeric'}))+'</small>':'')
  +(f.stage?'<span class="stg">'+esc(H.stageWord(f.stage))+'</span>':'')+(f.show===false?'<span class="stg" style="color:var(--faint);margin-left:8px">off the page</span>':'')+pathHtml(f)+'</div></button>';
}
function row(f){ const g=goOf(f); return g?'<div class="fcw">'+card(f)+g+'</div>':card(f); }
function filmsView(){
 if(U.open&&film(U.open)) return filmView(film(U.open));
 const L=films(), mk=L.filter(f=>f.from==='studio'), mine=L.filter(f=>f.from==='hand');
 let h='';
 if(window.Kit) h+=Kit.html([{id:'vnote',dev:'camera',label:'CAMERA',what:'Shoot a note',note:L.length?'On a film, sorted for you':'Add a film first',off:!L.length},{id:'anote',dev:'mic',label:'MIC',what:'Say a note',note:L.length?'Voice only':'Add a film first',off:!L.length}]);
 h+='<p class="kicker">Making now</p>'+(mk.length?mk.map(row).join(''):'<div class="card" data-stick data-icbig="ss"><p class="dim small" style="margin:0">Nothing in Story Studio yet. Start a film there and it shows up here, counted from what you mark.</p><a class="btn" href="../film/?start=1" data-ic="plus" style="margin-top:10px;text-decoration:none">START A FILM</a></div>');
 h+='<p class="kicker" style="margin-top:18px">Films you\'ve made</p>'+(mine.length?mine.map(card).join(''):'<p class="faint small">The ones from before, or made anywhere else. Add them here for the page.</p>');
 h+='<div class="row" style="margin-top:6px"><a class="btn add" href="../film/?start=1" data-ic="plus">START A FILM</a><button class="btn add" id="addfilm" data-ic="plus">ADD ONE YOU\'VE MADE</button></div>';
 return h;
}
function filmView(f){
 const r=rec(f)||{}, hand=f.from==='hand';
 const fld=(k,l,ph,v)=>'<label class="lab" for="ff_'+k+'">'+l+'</label><input class="field" id="ff_'+k+'" data-ff="'+k+'" value="'+esc(v!=null?v:(r[k]||''))+'" placeholder="'+esc(ph||'')+'">';
 let h='<div class="row" style="margin-bottom:10px"><button class="lnk" id="back">‹ All films</button></div>';
 h+='<div class="card"><div class="row" style="align-items:flex-start;gap:14px"><label style="cursor:pointer"><img class="po big" data-poster="'+esc(f.id)+'" alt="Poster" hidden><span class="btn sm" style="margin-top:6px">'+(URLS[f.id]?'NEW POSTER':'ADD A POSTER')+'</span><input type="file" id="pf" accept="image/*" hidden></label>'
  +'<div style="flex:1;min-width:0"><h2 style="font-size:20px">'+esc(f.title||'Untitled')+'</h2>'+(f.stage?'<span class="stg">'+esc(H.stageWord(f.stage))+'</span>':'')
  +'<div class="row" style="margin-top:10px"><button class="chip sm'+(r.mark==='done'?' on':'')+'" id="done">'+(r.mark==='done'?'Done':'Mark it done')+'</button><button class="chip sm'+(r.show===false?'':' on')+'" id="show">'+(r.show===false?'Off the page':'On the page')+'</button></div></div></div></div>';
 if(!hand){ const fin=(studio()[f.sid]||{}).cut&&(studio()[f.sid]||{}).cut.final; h+='<div class="card"><p class="kicker">Where it stands</p>'+pathHtml(f)+'<ul class="facts">'+H.words(f.st).map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul><div class="row" style="margin-top:10px">'+(fin?'<a class="btn pri" href="../film/#open='+encodeURIComponent(f.sid)+'&tab=out">PUT IT OUT</a>':'')+'<a class="btn" href="../film/#open='+encodeURIComponent(f.sid)+'">OPEN IN STORY STUDIO</a></div></div>'; }
 h+='<div class="card"><p class="kicker">On the page</p>'+(hand?fld('title','Title','',f.title):fld('title','Title on the page','',r.title||f.title))
  +fld('logline','Logline','One line: who, what they want, what\'s in the way')+'<div class="row" style="gap:8px"><div style="flex:1 1 90px">'+fld('year','Year','2026')+'</div><div style="flex:1 1 120px">'+fld('kind','Kind','Short, feature, pilot')+'</div><div style="flex:1 1 90px">'+fld('runtime','Runtime','12 min')+'</div></div>'
  +fld('credit','Credit line','Written and directed by …')
  +'<p class="lab">Links</p>'+(r.links||[]).map((l,i)=>'<div class="pair"><input class="field" data-lk="'+i+'|label" value="'+esc(l.label)+'" placeholder="Watch, Trailer"><input class="field" data-lk="'+i+'|url" value="'+esc(l.url)+'" placeholder="https://" inputmode="url"><button class="lnk faint" data-rmlk="'+i+'" aria-label="Remove">✕</button></div>').join('')
  +'<button class="btn sm" id="addlk" style="margin-top:4px">ADD A LINK</button>'
  +(hand?'<label class="lab" for="ff_people">Who was on it (one a line: "Sound: Jo Park")</label><textarea class="field" id="ff_people" data-ff="people" placeholder="Directed by: …">'+esc(r.people||'')+'</textarea>':'<p class="faint small" style="margin-top:10px">Cast and crew come from Story Studio\'s call sheet and credits.</p>')
  +'</div>';
 h+=notesCard(f);
 if(hand) h+='<div class="row" style="justify-content:flex-end"><button class="lnk faint" id="del">delete this film</button></div>';
 return h;
}

/* ---------- notes ---------- */
function scenesFor(f){ if(f.from!=='studio') return []; const c=studio()[f.sid]; try{ return c&&c.text?F.scenes(c.text).map(s=>s.n+'. '+s.heading):[]; }catch(e){ return []; } }
function noteFor(){ return films().map(f=>({id:f.id,label:f.title||'Untitled',scenes:scenesFor(f)})); }
function recNote(kind,pick){
 if(!window.NoteCam){ toast('This page cannot record here.'); return; }
 const L=films(); if(!L.length){ toast('Add a film first: start one in Story Studio, or ADD A FILM YOU\'VE MADE.'); return; }
 NoteCam.open({kind,title:'A note',for:noteFor(),pick:pick||{for:U.open||D.lastNoteFor||''}},async n=>{
  const id='n'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  if(!(await putNote(id,n.blob))) throw new Error('not kept');
  if(n.thumb) await putPoster('n:'+id,n.thumb);
  const fl=film(n.for), sl=n.scene!=null?(scenesFor(fl||{})[n.scene]||''):'';
  D.notes=(D.notes||[]).concat([{id,film:n.for,scene:n.scene,sceneLabel:sl,at:Date.now(),secs:n.secs,mime:n.mime,ext:n.ext,kind,words:n.words,name:n.name,thumb:!!n.thumb}]); D.lastNoteFor=n.for;
  if(URLS['n:'+id]!==undefined) delete URLS['n:'+id];
  save(); render(); });
}
function notesCard(f){
 const ns=notesOf(f.id);
 let h='<div class="card"><p class="kicker">Notes</p><div class="row" style="margin-bottom:8px"><button class="btn sm" data-vnote="'+esc(f.id)+'">SHOOT A NOTE</button><button class="btn sm" data-anote="'+esc(f.id)+'">SAY A NOTE</button></div>';
 if(!ns.length) return h+'<p class="faint small" style="margin:0">Nothing yet. A note to yourself on camera: the shot you want, what went wrong today, the idea in the car.</p></div>';
 const by={}; ns.forEach(n=>{ const k=n.sceneLabel||''; (by[k]=by[k]||[]).push(n); });
 Object.keys(by).sort((a,b)=>(a?1:0)-(b?1:0)||a.localeCompare(b,undefined,{numeric:true})).forEach(k=>{ h+='<p class="lab" style="margin-top:12px">'+esc(k||'The whole film')+'</p>';
  by[k].forEach(n=>{ h+='<div class="note">'+(n.kind==='audio'?'<audio controls preload="none" data-note="'+esc(n.id)+'"></audio>':'<video controls playsinline preload="metadata" data-note="'+esc(n.id)+'"></video>')
   +'<small>'+esc(new Date(n.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+' · '+esc(NoteCam?NoteCam.mmss(n.secs):'')+'</small>'
   +(n.words?'<p class="nw">'+esc(n.words)+'</p>':'')
   +'<div class="row"><button class="lnk" data-nphone="'+esc(n.id)+'">SAVE TO PHONE</button><button class="lnk faint" data-ndel="'+esc(n.id)+'">delete</button></div></div>'; }); });
 return h+'</div>';
}

/* ---------- PAGE ---------- */
function pageFilms(){ return films().map(f=>({f,r:rec(f)||{}})).map(({f,r})=>({id:f.id,title:r.title||f.title,year:r.year,kind:r.kind,runtime:r.runtime,logline:r.logline,credit:r.credit,links:(r.links||[]).filter(l=>l.url),show:r.show!==false})); }
async function pageHtml(){ const L=pageFilms(); for(const x of L){ const b=await getPoster(x.id); x.poster=b?await dataUrl(b):''; }
 const y=you(); return H.pageHtml(L,{banner:D.me.banner,name:y.name||'',about:D.me.about,email:D.me.email}); }
function pageView(){
 const y=you(), L=pageFilms();
 let h=''
 +'<div class="card"><p class="kicker">Your page</p><label class="lab" for="pbanner">Banner</label><input class="field" id="pbanner" data-pm="banner" value="'+esc(D.me.banner)+'" placeholder="Your company, or your name">'
  +'<label class="lab" for="pname">Your name</label><input class="field" id="pname" value="'+esc(y.name||'')+'" placeholder="As it goes on the page">'
  +'<label class="lab" for="pabout">About (a line or two)</label><textarea class="field" id="pabout" data-pm="about" style="min-height:80px">'+esc(D.me.about)+'</textarea>'
  +'<label class="lab" for="pemail">Email on the page (optional)</label><input class="field" id="pemail" data-pm="email" value="'+esc(D.me.email)+'" inputmode="email"></div>';
 h+='<div class="card"><p class="kicker">On it</p>'+(L.length?L.map(x=>'<label class="row" style="justify-content:space-between;padding:6px 0"><span>'+esc(x.title||'Untitled')+(x.year?' <span class="faint">'+esc(x.year)+'</span>':'')+'</span><input type="checkbox" data-pshow="'+esc(x.id)+'"'+(x.show?' checked':'')+'></label>').join(''):'<p class="faint small">No films yet.</p>')+'</div>';
 h+='<div class="card"><p class="dim small" style="margin-top:0">Only what\'s on this tab and each film\'s ON THE PAGE box goes in. Never the script, your notes, call times or anyone\'s phone number.</p>'
  +'<div class="row"><button class="btn" id="pprev">PREVIEW</button><button class="btn pri" id="psave" style="flex:1">SAVE AS A PAGE</button></div></div><div id="pvbox"></div>'
  +'<p class="small" id="actorpage" style="margin:4px 2px 18px"><a class="lnk" style="padding:0" href="../hub/?tab=package#online">Your films go on your actor page too, unless you set one to stay off it. Open it ›</a></p>';
 return h;
}

/* ---------- PEOPLE ---------- */
function peopleView(){
 const P=H.people(studio(),F,D.films.map(f=>({title:f.title,people:f.people})),you().name);
 if(!P.length) return '<div class="card"><p class="dim" style="margin:0">Just you so far. Name the cast in Story Studio\'s call sheet, or add who was on a film you\'ve made, and they show up here.</p></div>';
 return '<div class="card">'+P.map(p=>'<div class="pp"><b>'+esc(p.name)+'</b>'+(p.you?'<span class="youtag">YOU</span>':'')+'<small>'+p.films.map(f=>esc(f.film)+(f.jobs.length?' ('+esc(f.jobs.join(', '))+')':'')).join(' · ')+'</small></div>').join('')+'</div>';
}

/* ---------- YOU: your universe ----------
   (Col, Oct 25) Like Paper Trail's: a computer opens to the map with what you tap beside it, a phone to the list,
   film by film; each a tap from the other. Each film its own color and patch, its initials in the dot. You are not a
   dot: you're on every film. What ties your films together and who you work with most, said plainly; the counts and
   your words folded until you ask. */
let USEL='', UVIEW='', UF={p:1,l:1}; const UOPEN=new Set();
const UCOL=['#2a5fa8','#1f8a5c','#c0392b','#7a5fa8','#2a8a8a','#9a6b1f','#5c636d'];
function uni(){ const S=studio(), L=films().map(f=>({id:f.id,title:f.title,kind:f.kind,year:f.year,runtime:f.runtime,stage:f.from==='hand'?'done':f.stage,script:f.from==='studio'?S[f.sid]:null}));
 return H.universe(L,F,H.people(S,F,D.films.map(f=>({title:f.title,people:f.people})),you().name),D.me); }
const PLK={feature:'Features',short:'Shorts',pilot:'Pilots',series:'Series','music video':'Music videos',documentary:'Documentaries',commercial:'Commercials',sketch:'Sketches'};
const uIni=t=>{ const w=String(t).replace(/[^A-Za-z0-9 ]+/g,' ').trim().split(/\s+/).filter(x=>!/^(the|a|an|of)$/i.test(x)); return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase(); };
const uFold=(id,title,sub,body)=>'<details class="ufold" data-uf2="'+id+'" id="'+id+'"'+(UOPEN.has(id)?' open':'')+'><summary>'+esc(title)+(sub?'<i>'+esc(sub)+'</i>':'')+'</summary>'+body+'</details>';
function uColors(U){ const col={}; U.nodes.filter(n=>n.type==='film').forEach((n,i)=>col[n.id]=UCOL[(n.data.ci!=null?n.data.ci:i)%UCOL.length]); return col; }
function youView(){
 const A=uni(), narrow=innerWidth<640, view=UVIEW||(narrow?'list':'map');
 let h='<p class="dim small" style="margin:0 0 12px">Your films, who was on them, where you shot. A line joins who worked on a film; someone on two films sits between them. What you\'re into and what you want, in your words, kept apart.</p>';
 if(!films().length) return h+'<div class="card" id="ufacts"><p class="kicker">From your films</p><ul class="facts">'+A.facts.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul><a class="btn" href="../film/" style="margin-top:10px;text-decoration:none">OPEN STORY STUDIO</a></div>'+wordsFold(A);
 const keep=n=>n.type==='film'||(n.type==='person'&&UF.p)||(n.type==='place'&&UF.l), nodes=A.nodes.filter(keep), ids=new Set(nodes.map(n=>n.id));
 const U={nodes,edges:A.edges.filter(e=>ids.has(e.a)&&ids.has(e.b))}, col=uColors(A);
 h+='<div class="row" style="justify-content:space-between;gap:8px;margin-bottom:10px"><div class="seg" role="group" aria-label="Map or list"><button class="'+(view==='map'?'on':'')+'" data-uview="map">Map</button><button class="'+(view==='list'?'on':'')+'" data-uview="list">List</button></div>'
  +'<div class="row" style="gap:6px">'+[['p','People'],['l','Places']].map(([q,l])=>'<button class="btn sm'+(UF[q]?' pri':'')+'" data-ufl="'+q+'" aria-pressed="'+!!UF[q]+'">'+l+'</button>').join('')+'</div></div>';
 const side=tiesHtml(A)+uFold('ufacts','The counts','kinds, scenes, time of day',countsHtml(A))+wordsFold(A);
 if(view==='list') return h+uList(U,col)+side;
 const W=narrow?600:800, Hh=narrow?(U.nodes.length>14?860:640):(U.nodes.length>14?760:640), mw=(($('main')&&$('main').clientWidth)||innerWidth)-(innerWidth>1000?348:0);
 let map='';
 if(U.nodes.length>1){ const L=Graph.fit(Graph.layout(U,W,Hh,220),W,Hh), ix={}, k=W/Math.max(300,Math.min(W,mw-2)); U.nodes.forEach((n,i)=>ix[n.id]=i);
  const near=new Set(); if(USEL) U.edges.forEach(e=>{ if(e.a===USEL) near.add(e.b); if(e.b===USEL) near.add(e.a); });
  const nb=id=>U.edges.filter(e=>e.a===id||e.b===id).map(e=>e.a===id?e.b:e.a);
  const cOf=n=>{ if(n.type==='film') return col[n.id]; const f=nb(n.id).filter(x=>col[x]); return f.length===1?col[f[0]]:''; };
  let defs='', patches='', g='';
  let gn='';
  U.nodes.forEach((n,i)=>{ const q=L[i], film=n.type==='film', many=!film&&nb(n.id).length>1, r=Math.round(n.size*Math.max(1,k*.75))+(film?4:0), fs=Math.round((film?13.5:12)*k), c=cOf(n);
   let lab=film?n.label.toUpperCase():n.label; if(n.type==='person'&&n.data.films.length>1) lab+=' · '+n.data.films.length+' films'; if(n.type==='place') lab+=' · '+(n.data.films.length>1?n.data.films.length+' films':n.data.scenes); lab=lab.length>26?lab.slice(0,25)+'…':lab;
   const st=film?' style="fill:'+c+';stroke:'+c+'"':c?' style="stroke:'+c+'"':'';
   const shape=n.type==='place'?'<rect class="ush" x="'+(-r)+'" y="'+(-r)+'" width="'+(2*r)+'" height="'+(2*r)+'" rx="2"'+st+'/>':'<circle class="ush" r="'+r+'"'+st+'/>';
   const hw=Math.max(r+6,lab.length*fs*.3,14*k);
   q.x=Math.max(hw+4,Math.min(W-hw-4,q.x));
   gn+='<g class="un un-'+n.type+(many?' umany':'')+(USEL===n.id?' usel':near.has(n.id)?' uon':'')+'" data-un="'+esc(n.id)+'" transform="translate('+q.x+' '+q.y+')" tabindex="0"><rect class="uhit" x="'+(-hw)+'" y="'+(-r-6)+'" width="'+(2*hw)+'" height="'+(2*r+fs+12)+'"/>'+shape
    +(film?'<text class="uini" y="'+Math.round(fs*.36)+'" font-size="'+fs+'">'+esc(uIni(n.label))+'</text>':'')+'<text y="'+(r+fs+3)+'" font-size="'+fs+'"'+(film?' style="fill:'+c+'"':'')+'>'+esc(lab)+'</text></g>'; });
  U.nodes.filter(n=>n.type==='film').forEach((n,i)=>{ const mem=[n.id].concat(nb(n.id)).map(id=>L[ix[id]]).filter(Boolean); const cx=mem.reduce((s,p)=>s+p.x,0)/mem.length, cy=mem.reduce((s,p)=>s+p.y,0)/mem.length, r=Math.max(90,...mem.map(p=>Math.hypot(p.x-cx,p.y-cy)+70)), c=col[n.id], gid='fg'+i;
   defs+='<radialGradient id="'+gid+'"><stop offset="0" stop-color="'+c+'" stop-opacity=".2"/><stop offset=".7" stop-color="'+c+'" stop-opacity=".08"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></radialGradient>';
   patches+='<circle class="upatch" cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+r.toFixed(1)+'" fill="url(#'+gid+')"/>'; });
  U.edges.forEach(e=>{ const a=L[ix[e.a]], b=L[ix[e.b]]; if(!a||!b) return; const c=col[e.a]||col[e.b]||''; g+='<line class="ue ue-'+e.kind+(USEL&&(e.a===USEL||e.b===USEL)?' uon':'')+'" x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'"'+(c?' style="stroke:'+c+'"':'')+'/>'; });
  g+=gn;
  map='<div class="umap"><svg'+(USEL?' class="ufocus"':'')+' viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Your films, the people on them, the places"><defs>'+defs+'</defs>'+patches+g+'</svg></div>'
   +'<div class="ulegend"><span><i class="lf"></i>your film, its own color</span><span><i class="lp"></i>person</span><span><i class="ll"></i>place</span><span><i class="lm"></i>on more than one film</span></div>';
 } else map='<div class="card"><p class="dim" style="margin:0">One film and nobody on it yet. Name your cast and crew in Story Studio, or add who was on a film you\'ve made, and they show up here.</p></div>';
 return h+'<div class="ugrid"><div>'+map+'</div><div><div class="card" id="uinfo">'+uInfo(A)+'</div>'+side+'</div></div>';
}
function countsHtml(A){ return '<ul class="facts">'+A.facts.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>'
  +(A.scenes.length?'<p class="lab" style="margin-top:10px">'+esc(A.scenes[0])+'</p><ul class="facts">'+A.scenes.slice(1).map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>':'')
  +(A.crew.length?'<ul class="facts" style="margin-top:10px">'+A.crew.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>':''); }
function tiesHtml(A){ const t=A.ties||[], m=A.most||[];
 return '<p class="kicker" style="margin-top:14px">What ties your films together</p><div class="card uties">'+(t.length?t.map(x=>'<p class="ut-'+x.kind+'">'+(x.name&&x.kind!=='alone'?'<b>'+esc(x.name)+'</b>'+esc(x.text.slice(x.name.length)):esc(x.text))+'</p>').join(''):'<p class="dim" style="margin:0">'+(films().length>1?'Nothing shared yet: nobody and nowhere in more than one film.':'One film so far. Ties show up from the second.')+'</p>')+'</div>'
  +(m.length?'<p class="kicker" style="margin-top:14px">Who you work with most</p><div class="card umost">'+m.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>':''); }
function wordsFold(A){
 const wl=(k,ph,ex)=>'<div class="row" style="gap:8px;margin-top:8px"><input class="field" id="uadd_'+k+'" placeholder="'+esc(ph)+'" style="flex:1;margin:0"><button class="btn sm" data-uadd="'+k+'">ADD</button></div>'+(ex?'<p class="faint small" style="margin:6px 0 0">'+esc(ex)+'</p>':'');
 const n=A.into.length+A.wants.length;
 return uFold('uwords','In your words',n?n+' kept':'what you\'re into, what you want','<p class="lab">What you\'re into</p>'+(A.into.length?'<div class="row" style="flex-wrap:wrap;gap:6px">'+A.into.map((t,i)=>'<span class="chip on">'+esc(t)+' <button class="lnk" data-urm="into|'+i+'" aria-label="Remove">✕</button></span>').join('')+'</div>':'<p class="faint small" style="margin:0">Nothing yet.</p>')
  +wl('into','A genre, a filmmaker, a film, a way of shooting','Westerns. Long takes. Anything shot at night.')
  +'<p class="lab" style="margin-top:16px">What you want to get into</p>'+(A.wants.length?'<ul class="facts">'+A.wants.map((w,i)=>'<li>'+esc(w.text)+(w.kind?' <span class="faint">· '+esc(PLK[w.kind])+' made so far: '+w.made+'</span>':'')+' <button class="lnk faint" data-urm="want|'+i+'" aria-label="Remove">✕</button></li>').join('')+'</ul>':'<p class="faint small" style="margin:0">Nothing yet.</p>')
  +wl('want','A kind of film, a job, a person, a place','A feature. A music video. Shoot in the desert.')); }
/* the list, film by film: who and where, and who or where it shares */
function uList(U,col){ const nb=id=>U.edges.filter(e=>e.a===id||e.b===id).map(e=>U.nodes.find(x=>x.id===(e.a===id?e.b:e.a))).filter(Boolean);
 return U.nodes.filter(n=>n.type==='film').map(n=>{ const ppl=nb(n.id).filter(x=>x.type==='person'), pls=nb(n.id).filter(x=>x.type==='place');
  const also=x=>{ const o=nb(x.id).filter(f=>f.type==='film'&&f.id!==n.id).map(f=>f.label); return o.length?' <span class="ualso">also on '+esc(o.join(', '))+'</span>':''; };
  const job=x=>{ const f=(x.data.films||[]).find(y=>y.film===n.label); return f&&f.jobs.length?' ('+esc(f.jobs.join(', '))+')':''; };
  const meta=[n.data.stage?H.stageWord(n.data.stage).toLowerCase():'',n.data.year,n.data.kind,n.data.scenes?n.data.scenes+' scenes':''].filter(Boolean).join(' · ');
  return '<div class="card ulist"><div class="row" style="gap:10px;align-items:center"><span class="ubadge" style="background:'+col[n.id]+'">'+esc(uIni(n.label))+'</span><b class="ut">'+esc(n.label)+'</b><span class="faint small">'+esc(meta)+'</span></div>'
   +(UF.p?'<p class="lab">People</p><div>'+(ppl.length?ppl.map(x=>esc(x.label)+job(x)+also(x)).join(' · '):'<span class="faint small">Nobody named yet</span>')+'</div>':'')
   +(UF.l?'<p class="lab">Places</p><div>'+(pls.length?pls.map(x=>esc(x.label)+' '+x.data.scenes+also(x).replace('also on','also in')).join(' · '):'<span class="faint small">None in a script here</span>')+'</div>':'')
   +'<div class="row" style="margin-top:10px"><button class="btn sm" data-uopen="'+esc(n.data.fid)+'">OPEN IT</button></div></div>'; }).join(''); }
function uInfo(U){ const n=USEL&&U.nodes.find(x=>x.id===USEL); if(!n) return '<span class="faint small">Tap a film, a person or a place.</span>';
 if(n.type==='film') return '<p class="kicker" style="margin:0">Your film</p><h3 class="ut">'+esc(n.label)+'</h3><p class="dim small" style="margin:4px 0 0">'+esc([n.data.year,n.data.kind,n.data.stage?H.stageWord(n.data.stage):'',n.data.scenes?n.data.scenes+' scenes':''].filter(Boolean).join(' · '))+'</p><div class="row" style="margin-top:10px"><button class="btn sm" data-uopen="'+esc(n.data.fid)+'">OPEN IT</button></div>';
 if(n.type==='person') return '<p class="kicker" style="margin:0">'+(n.data.films.length>1?'On '+n.data.films.length+' of your films':'On one of your films')+'</p><h3 class="ut">'+esc(n.label)+'</h3><p class="dim small" style="margin:4px 0 0">'+n.data.films.map(f=>esc(f.film)+(f.jobs.length?' ('+esc(f.jobs.join(', '))+')':'')).join(' · ')+'</p>';
 return '<p class="kicker" style="margin:0">A place</p><h3 class="ut">'+esc(n.label)+'</h3><p class="dim small" style="margin:4px 0 0">'+n.data.scenes+' scene'+(n.data.scenes===1?'':'s')+' · in '+n.data.films.map(esc).join(', ')+'</p>'; }

/* ---------- draw and wire ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===U.tab));
 const L=films(); $('count').textContent=L.length?L.length+' film'+(L.length===1?'':'s')+' · '+L.filter(f=>f.stage==='done').length+' done':'';
 $('main').innerHTML=U.tab==='films'?filmsView():U.tab==='page'?pageView():U.tab==='you'?youView():peopleView();
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
 if(window.Kit) Kit.wire(M,{vnote:()=>recNote('video'),anote:()=>recNote('audio')});
 M.querySelectorAll('[data-vnote]').forEach(b=>b.onclick=()=>recNote('video',{for:b.dataset.vnote}));
 M.querySelectorAll('[data-anote]').forEach(b=>b.onclick=()=>recNote('audio',{for:b.dataset.anote}));
 M.querySelectorAll('[data-nphone]').forEach(b=>b.onclick=async()=>{ const n=(D.notes||[]).find(x=>x.id===b.dataset.nphone), bl=n&&await getNote(n.id); if(!bl) return toast('That one isn\'t on this device.'); const r=await NoteCam.saveToPhone(bl,n.name); toast(r==='shared'?'Pick Save Video to put it in Photos.':r==='downloaded'?'Saved to your downloads.':''); });
 M.querySelectorAll('[data-ndel]').forEach(b=>b.onclick=async()=>{ if(!confirm('Delete this note? Gone for good unless you saved it to your phone.')) return; const id=b.dataset.ndel; await delNote(id); D.notes=(D.notes||[]).filter(x=>x.id!==id); delete URLS['n:'+id]; save(); render(); });
 M.querySelectorAll('[data-pm]').forEach(el=>el.onchange=()=>{ D.me[el.dataset.pm]=el.value.trim(); save(); });
 if($('pname')) $('pname').onchange=e=>{ try{ Y.set('name',e.target.value); }catch(x){} };
 M.querySelectorAll('[data-pshow]').forEach(el=>el.onchange=()=>{ const x=rec(film(el.dataset.pshow)); if(x){ x.show=el.checked; save(); } });
 M.querySelectorAll('[data-un]').forEach(g=>{ const f=()=>{ USEL=USEL===g.dataset.un?'':g.dataset.un; render(); }; g.onclick=f; g.onkeydown=e=>{ if(e.key==='Enter') f(); }; });
 M.querySelectorAll('[data-uview]').forEach(b=>b.onclick=()=>{ UVIEW=b.dataset.uview; render(); });
 M.querySelectorAll('[data-ufl]').forEach(b=>b.onclick=()=>{ UF[b.dataset.ufl]=UF[b.dataset.ufl]?0:1; USEL=''; render(); });
 M.querySelectorAll('details[data-uf2]').forEach(d=>d.ontoggle=()=>{ if(d.open) UOPEN.add(d.dataset.uf2); else UOPEN.delete(d.dataset.uf2); });
 M.querySelectorAll('[data-uopen]').forEach(b=>b.onclick=()=>{ U.tab='films'; U.open=b.dataset.uopen; USEL=''; saveU(); render(); scrollTo(0,0); });
 M.querySelectorAll('[data-uadd]').forEach(b=>{ const k=b.dataset.uadd, el=$('uadd_'+k), go=()=>{ const v=el.value.trim(); if(!v) return; D.me[k]=(D.me[k]||[]).concat([v]); UOPEN.add('uwords'); save(); render(); const n=$('uadd_'+k); if(n) n.focus(); }; b.onclick=go; el.onkeydown=e=>{ if(e.key==='Enter') go(); }; });
 M.querySelectorAll('[data-urm]').forEach(b=>b.onclick=()=>{ const [k,i]=b.dataset.urm.split('|'); (D.me[k]||[]).splice(+i,1); save(); render(); });
 if($('pprev')) $('pprev').onclick=async()=>{ const html=await pageHtml(); $('pvbox').innerHTML='<iframe class="pv" sandbox title="Your page"></iframe>'; $('pvbox').firstChild.srcdoc=html; };
 if($('psave')) $('psave').onclick=async()=>{ const html=await pageHtml(), y=you(), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download=((D.me.banner||y.name||'Films').replace(/[\\/:*?"<>|]+/g,' ').trim())+' - films.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved. Attach it, or open it and print.'); };
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ if(U.tab===b.dataset.t) U.open=''; U.tab=b.dataset.t; saveU(); render(); scrollTo(0,0); });
addEventListener('storage',e=>{ if(e.key==='film_os_v1') render(); });
render();
window.__filmhub={films,D};
})();
