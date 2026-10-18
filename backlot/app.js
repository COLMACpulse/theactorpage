/* BACKLOT: the ground you already have. Your apartment, your ranch, a park.
   SPOTS   every place you can shoot, and what's on hand. The same list as Story Studio's OWNED tab (localStorage
           film_os_v1 .owned), photos in its IndexedDB (film_os / photos). Add it in either one, it's in both.
   DRAWER  every script kept here (Story Studio, Paper Trail), against your spots. Counts only, read only.
   GROUND  a start dealt from what you have. Headings only; the words are yours.
   LIST    everything, as a list. Save it as text or a spreadsheet.
   Nothing leaves this device. */
(function(){
const B=window.Backlot, F=window.FilmOS;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3000); }

/* ---------- the one list: Story Studio's ---------- */
const FKEY='film_os_v1', KEY='backlot_v1';
function film(){ try{ const d=JSON.parse(localStorage.getItem(FKEY)||'null'); if(d&&d.scripts) return d; }catch(e){} return {cur:'',scripts:{},owned:null}; }
function owned(){ return film().owned||[]; }
function putOwned(L){ const d=film(); d.owned=L; try{ localStorage.setItem(FKEY,JSON.stringify(d)); return true; }catch(e){ toast('This phone would not save.'); return false; } }
function edit(id,fn){ const L=owned(), o=L.find(x=>x.id===id); if(!o) return; fn(o); putOwned(L); }
function mine(){ try{ return Object.assign({tab:'spots',open:'',kept:[],seed:1,pick:{}},JSON.parse(localStorage.getItem(KEY)||'{}')); }catch(e){ return {tab:'spots',open:'',kept:[],seed:1,pick:{}}; } }
let M=mine(); const saveM=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(M)); }catch(e){} };
try{ const t=new URLSearchParams(location.search).get('tab'); if(['spots','drawer','ground','list'].includes(t)){ M.tab=t; M.open=''; } }catch(e){}

/* ---------- photos: Story Studio's store ---------- */
function idb(){ return new Promise(res=>{ try{ const r=indexedDB.open('film_os',1); r.onupgradeneeded=()=>r.result.createObjectStore('photos'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); }
async function putPhoto(id,blob){ const d=await idb(); if(!d) return false; return new Promise(res=>{ const x=d.transaction('photos','readwrite'); x.objectStore('photos').put(blob,id); x.oncomplete=()=>res(true); x.onerror=()=>res(false); }); }
async function getPhoto(id){ const d=await idb(); if(!d) return null; return new Promise(res=>{ const r=d.transaction('photos','readonly').objectStore('photos').get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }
async function delPhoto(id){ const d=await idb(); if(d) try{ d.transaction('photos','readwrite').objectStore('photos').delete(id); }catch(e){} }
const URLS={};
async function fillPhotos(){ for(const im of document.querySelectorAll('img[data-photo]')){ const id=im.dataset.photo; if(URLS[id]===undefined){ const b=await getPhoto(id); URLS[id]=b?URL.createObjectURL(b):''; } if(URLS[id]){ im.src=URLS[id]; im.hidden=false; } } }
async function shrink(file){ try{ const bm=await createImageBitmap(file); const k=Math.min(1,1600/Math.max(bm.width,bm.height)); const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k);
 c.getContext('2d').drawImage(bm,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(b=>r(b||file),'image/jpeg',0.85)); }catch(e){ return file; } }
async function addPhoto(id,file){ const pid=rid('ph'); if(!(await putPhoto(pid,await shrink(file)))){ toast('This phone would not keep the photo.'); return false; }
 edit(id,o=>{ o.scout=[{id:rid('s'),at:Date.now(),note:'',photo:pid}].concat(o.scout||[]); }); return true; }

/* ---------- SPOTS ---------- */
const chips=(name,L,cur,multi)=>'<div class="row" style="gap:6px">'+L.map(([k,l])=>{ const on=multi?(cur||[]).includes(k):cur===k; return '<button class="chip sm'+(on?' on':'')+'" data-ch="'+name+'|'+k+'|'+(multi?1:0)+'" aria-pressed="'+on+'">'+esc(l)+'</button>'; }).join('')+'</div>';
const IE=[['in','Inside'],['out','Outside'],['both','Both']], POW=[['yes','Power'],['no','No power']];
function spotCard(s){ const ph=s.photos[0];
 const sub=[s.ie==='in'?'Inside':s.ie==='out'?'Outside':s.ie==='both'?'Inside and out':'',s.passes.length?'passes for '+s.passes.slice(0,3).join(', ')+(s.passes.length>3?'…':''):''].filter(Boolean).join(' · ');
 const pm=s.perm==='no'?'<span class="stg bad">no</span>':s.perm==='ask'?'<span class="stg">need to ask</span>':s.perm==='asked'?'<span class="stg">asked</span>':'';
 return '<button class="sc" data-open="'+esc(s.id)+'"><span class="th">'+(ph?'<img data-photo="'+esc(ph)+'" alt="" hidden>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l6-9 4 5 3-3 5 7z"/><circle cx="16" cy="7" r="2"/></svg>')+'</span><span><b>'+esc(s.name)+'</b><small>'+esc(sub||'Tap to say what it is')+'</small>'+pm+'</span></button>'; }
function spotsView(){
 if(M.open){ const o=owned().find(x=>x.id===M.open&&x.kind==='location'); if(o) return spotView(o); M.open=''; }
 const G=B.fromOwned(owned());
 let h=window.Kit?Kit.html([{id:'shoot',dev:'photo',label:'PHOTO',what:'Shoot a spot',note:'A new spot from one photo'}]):'';
 h+='<input type="file" id="shootin" accept="image/*" capture="environment" hidden>';
 h+='<p class="kicker">Spots · '+G.spots.length+'</p>'+(G.spots.length?G.spots.map(spotCard).join(''):'<p class="dim small">Any place you can shoot. Your kitchen, the barn, the park down the street. Walk it with your phone: one photo, one spot.</p>');
 h+='<div class="row" style="margin:6px 0 18px"><input class="field" id="newspot" placeholder="Or type one: Back porch" style="flex:1;margin:0"><button class="btn" id="addspot">ADD</button></div>';
 h+='<p class="kicker">On hand</p><div class="card">';
 if(!G.onhand.length) h+='<p class="dim small" style="margin:0">Props, vehicles, animals, wardrobe, the people you can get, your gear.</p>';
 B.KINDS.forEach(([k,l])=>{ const L=G.onhand.filter(x=>x.kind===k); if(!L.length) return; h+='<p class="lab">'+esc(l)+(L.length?' · '+(k==='person'?B.people(G.onhand):L.length):'')+'</p>'+(L.length?'<div class="row" style="gap:6px">'+L.map(x=>'<span class="chip on">'+esc(x.name)+(k==='person'&&+x.count>1?' ('+x.count+')':'')+'<button class="lnk" data-del="'+esc(x.id)+'" aria-label="Remove '+esc(x.name)+'">✕</button></span>').join('')+'</div>':''); });
 h+='<div class="row" style="margin-top:12px;gap:6px"><select class="field" id="okind" style="flex:1 1 130px;margin:0">'+B.KINDS.map(([k,l])=>'<option value="'+k+'">'+esc(l)+'</option>').join('')+'</select><input class="field" id="oname" placeholder="Name: rope, old pickup, Jo" style="flex:2 1 160px;margin:0"><input class="field" id="ocount" inputmode="numeric" placeholder="How many" style="flex:0 1 96px;margin:0" hidden><button class="btn" id="oadd">ADD</button></div>';
 h+='<p class="faint small" style="margin:10px 0 0">The same list as Story Studio\'s OWNED tab. Change it here or there.</p></div>';
 if(!owned().length) h+='<p class="faint small">Have a ranch? Story Studio\'s OWNED tab can start you from a 40-thing ranch list. <a class="lnk" href="../film/">Open Story Studio</a></p>';
 return h;
}
function spotView(o){
 const s=B.fromOwned([o]).spots[0];
 const fld=(k,l,ph,v)=>'<label class="lab" for="f_'+k+'">'+l+'</label><input class="field" id="f_'+k+'" data-f="'+k+'" value="'+esc(v!=null?v:(o[k]||''))+'" placeholder="'+esc(ph)+'">';
 let h='<div class="row" style="margin-bottom:10px"><button class="lnk" id="back">‹ All spots</button></div><div class="card">';
 h+='<div class="photos">'+s.photos.map(p=>'<span class="ph"><img data-photo="'+esc(p)+'" alt="'+esc(s.name)+'" hidden><button class="lnk faint" data-pdel="'+esc(p)+'" aria-label="Remove photo">✕</button></span>').join('')+'<label class="ph add"><input type="file" id="morephoto" accept="image/*" capture="environment" hidden><span>+ PHOTO</span></label></div>';
 const pin=B.coords(o.where);
 h+='<label class="lab" for="f_where">Where it is</label><div class="row" style="gap:6px"><input class="field" id="f_where" data-f="where" value="'+esc(o.where||'')+'" placeholder="Stand there and tap I\'M HERE" style="flex:1;margin:0"><button class="btn" id="here">I\'M HERE</button></div><p class="faint small" style="margin:4px 0 0">'+(pin?'Pinned. It shows on the MAP.':'Your phone asks first. The pin stays on this phone. Or paste a pin from your maps app.')+'</p>';
 h+=fld('name','Name','Back porch',o.name)+fld('plays','What it can pass for','stable, jail, saloon back room')+'<p class="faint small" style="margin:4px 0 0">Your words. Scenes in your scripts get matched to these.</p>';
 h+='<p class="lab">Inside or out</p>'+chips('ie',IE,o.ie)+'<p class="lab">When the light works</p>'+chips('when',B.LIGHT,o.when||[],true);
 h+=fld('sound','Noise','road at noon, dogs, planes')+'<p class="lab">Power</p>'+chips('power',POW,o.power)+'<p class="lab">Gear</p>'+chips('gear',B.GEAR,o.gear);
 h+='<p class="lab">Whose it is</p>'+chips('whose',B.WHOSE,o.whose)+'<p class="lab">Can you use it</p>'+chips('perm',B.PERM,o.perm);
 h+='<label class="lab" for="f_takes">What it takes to make it pass</label><textarea class="field" id="f_takes" data-f="takes" placeholder="Hang a lantern, sweep the hay, hide the satellite dish">'+esc(o.takes||'')+'</textarea>';
 h+=fld('notes','Notes','')+'</div>';
 h+='<p class="faint small">Sun times and scout notes for this spot are in Story Studio\'s OWNED tab.</p><div class="row" style="justify-content:flex-end"><button class="lnk faint" id="delspot">delete this spot</button></div>';
 return h;
}

/* ---------- DRAWER: your scripts, against your spots ---------- */
let DRAWER=null;   // {list, at}
function ptDb(){ return new Promise(res=>{ try{ const r=indexedDB.open('paper_trail'); let fresh=false;
  r.onupgradeneeded=()=>{ fresh=true; try{ r.transaction.abort(); }catch(e){} };   // never make Paper Trail's store for it
  r.onsuccess=()=>{ const d=r.result; if(fresh||!d.objectStoreNames.contains('texts')){ try{ d.close(); }catch(e){} return res(null); } res(d); }; r.onerror=()=>res(null); r.onblocked=()=>res(null); }catch(e){ res(null); } }); }
async function ptScripts(){
 let P=null; try{ P=JSON.parse(localStorage.getItem('paper_trail_v1')||'null'); }catch(e){} if(!P||!P.projects) return [];
 const out=[], d=await ptDb(); if(!d) return [];
 for(const p of Object.values(P.projects)){ if(p.retired) continue; const ds=Object.values(P.drafts||{}).filter(x=>x.project===p.id&&x.kind==='script'&&!x.retired).sort((a,b)=>a.added-b.added);
  const c=P.drafts&&P.drafts[p.current]&&!P.drafts[p.current].retired&&P.drafts[p.current].kind==='script'?P.drafts[p.current]:ds[ds.length-1]; if(!c) continue;
  const t=await new Promise(r=>{ try{ const q=d.transaction('texts','readonly').objectStore('texts').get(c.id); q.onsuccess=()=>r(q.result||''); q.onerror=()=>r(''); }catch(e){ r(''); } });
  if(t) out.push({id:'pt:'+p.id,title:p.title||'Untitled',text:t,from:'Paper Trail',pid:p.id}); }
 try{ d.close(); }catch(e){} return out; }
function ssTitle(c){ const m=String(c.text||'').slice(0,2000).match(/^\s*Title:\s*(.+)$/im); return m?m[1].replace(/[_*]+/g,'').trim():String(c.file||'Untitled').replace(/\.(pdf|txt|fountain|fdx|docx)$/i,'').replace(/_+/g,' '); }
async function loadDrawer(){ const S=film().scripts||{}, L=Object.keys(S).filter(id=>S[id]&&S[id].text).map(id=>({id:'ss:'+id,sid:id,title:ssTitle(S[id]),text:S[id].text,from:'Story Studio'}));
 const pt=await ptScripts(); const seen=new Set(L.map(x=>x.text.replace(/\s+/g,' ').trim()));
 pt.forEach(x=>{ if(!seen.has(x.text.replace(/\s+/g,' ').trim())) L.push(x); });   // the same script in both: once
 const G=B.fromOwned(owned()); DRAWER={list:B.drawer(L,G.spots,G.onhand,F),src:L}; render(); }
function drawerView(){
 if(!DRAWER){ loadDrawer(); return '<p class="dim">Reading your scripts…</p>'; }
 const G=B.fromOwned(owned()), D=DRAWER.list;
 if(M.open){ const x=D.find(d=>d.id===M.open); if(x) return scriptView(x); M.open=''; }
 let h='<p class="dim small" style="margin:0 0 12px">Every script you keep here, scene by scene, against your spots. The most of it you could shoot on your own ground comes first. Counts only.</p>';
 if(!G.spots.length) h+='<div class="msg">No spots yet, so nothing has a spot. <button class="lnk" data-tab="spots">Add your spots</button></div>';
 if(!D.length) return h+'<div class="card"><p class="dim" style="margin:0 0 10px">No scripts here yet. Bring them into Paper Trail or Story Studio and they show up here.</p><div class="row"><a class="btn" href="../papertrail/">PAPER TRAIL</a><a class="btn" href="../film/">STORY STUDIO</a></div></div>';
 h+=D.map(x=>'<button class="dc" data-open="'+esc(x.id)+'"><span class="bar" aria-hidden="true"><i style="width:'+Math.round(x.here/x.scenes*100)+'%"></i></span><b>'+esc(x.title)+'</b><small>'+esc(B.checkWords(x)[0])+' '+esc(x.from)+'</small></button>').join('');
 return h;
}
function scriptView(x){
 let h='<div class="row" style="margin-bottom:10px"><button class="lnk" id="back">‹ All scripts</button></div><div class="card"><p class="kicker">'+esc(x.from)+'</p><h2 style="font-size:20px;margin-bottom:8px">'+esc(x.title)+'</h2><ul class="facts">'+B.checkWords(x).map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>';
 const src=DRAWER.src.find(s=>s.id===x.id);
 h+='<div class="row" style="margin-top:12px">'+(x.from==='Story Studio'?'<a class="btn" href="../film/#open='+encodeURIComponent(src.sid)+'">OPEN IN STORY STUDIO</a>':'<button class="btn" id="tofilm">PLAN IT IN STORY STUDIO</button>')+'</div></div>';
 h+='<p class="kicker">Scene by scene</p><div class="card">'+x.rows.map(r=>'<div class="sr"><b>'+r.n+'</b><span><span class="hd">'+esc(r.heading)+'</span>'+(r.spot?'<small class="ok">'+esc(r.spot)+(r.as?' as '+esc(r.as):'')+'</small>':'<small class="faint">no spot</small>')+r.flags.map(f=>'<small class="fl">'+esc(f)+'</small>').join('')+'</span></div>').join('')+'</div>';
 return h;
}

/* ---------- GROUND: a start, dealt from what you have ---------- */
let DEAL=null;
function groundView(){
 const G=B.fromOwned(owned()), P=M.pick||{}, ok=G.spots.filter(s=>s.perm!=='no');
 let h='<p class="dim small" style="margin:0 0 12px">A start, dealt from what you have: a spot or three, a thing, how many people, a time, and a situation. You write it. This never writes a line.</p>';
 if(!ok.length) return h+'<div class="card"><p class="dim" style="margin:0 0 10px">Add a spot first. One photo is enough.</p><button class="btn pri" data-tab="spots">ADD A SPOT</button></div>'+keptView();
 const things=G.onhand.filter(x=>x.kind!=='person'&&x.kind!=='gear');
 h+='<div class="card"><p class="lab" style="margin-top:0">Where (up to 3, or let it pick)</p><div class="row" style="gap:6px">'+ok.map(s=>{ const on=(P.spots||[]).includes(s.id); return '<button class="chip sm'+(on?' on':'')+'" data-gs="'+esc(s.id)+'" aria-pressed="'+on+'">'+esc(s.name)+'</button>'; }).join('')+'</div>';
 if(things.length) h+='<label class="lab" for="gthing">A thing</label><select class="field" id="gthing"><option value="">Let it pick</option><option value="none"'+(P.thing==='none'?' selected':'')+'>Nothing</option>'+things.map(t=>'<option value="'+esc(t.id)+'"'+(P.thing===t.id?' selected':'')+'>'+esc(t.name)+'</option>').join('')+'</select>';
 h+='<p class="lab">People</p>'+chips('gp',[['','Let it pick'],['1','1'],['2','2'],['3','3'],['4','4']],String(P.people||''))+'<p class="lab">When</p>'+chips('gt',[['','Let it pick']].concat(B.LIGHT),P.time||'');
 h+='<label class="lab" for="gsit">The situation</label><select class="field" id="gsit"><option value="">Let it pick</option>'+B.SITUATIONS.map((x,i)=>'<option value="'+i+'"'+(P.situation===i?' selected':'')+'>'+esc(x.charAt(0).toUpperCase()+x.slice(1))+'</option>').join('')+'</select>';
 h+='<button class="btn pri block big" id="deal" style="margin-top:14px">DEAL ONE</button></div>';
 if(DEAL) h+=dealCard(DEAL,true);
 return h+keptView();
}
function dealCard(d,live,i){ return '<div class="card deal"><p class="kicker">'+(live?'Dealt':'Kept')+'</p><p class="dl">'+esc(d.line)+'</p><pre class="hds">'+d.headings.map(esc).join('\n')+'</pre>'+(d.notes.length?'<p class="faint small">What it takes: '+d.notes.map(esc).join('; ')+'</p>':'')+(()=>{ const P=B.pins(B.fromOwned(owned()).spots), r=B.route(P,d.spots,d.spots[0]); return r.stops.length>1?'<p class="faint small">Between them: '+B.far(r.m)+', '+B.walk(r.m)+'.</p>':''; })()
 +'<div class="row" style="margin-top:10px">'+(live?'<button class="btn" id="again">ANOTHER</button><button class="btn" id="keep">KEEP IT</button>':'')+'<a class="btn" href="../write/writers-blockage.html" data-hw="'+(live?'live':i)+'">WRITE IT</a><a class="btn" href="../film/" data-hf="'+(live?'live':i)+'">PLAN THE SHOOT</a>'+(live?'':'<button class="lnk faint" data-kdel="'+i+'">remove</button>')+'</div>'
 +(live?'<p class="faint small" style="margin:8px 0 0">Write it: Writer\'s Blockage opens with the headings and your line as a note. Plan the shoot: Story Studio opens it as a new script.</p>':'')+'</div>'; }
function keptView(){ return (M.kept||[]).length?'<p class="kicker" style="margin-top:18px">Kept · '+M.kept.length+'</p>'+M.kept.map((d,i)=>dealCard(d,false,i)).join(''):''; }
function doDeal(){ const G=B.fromOwned(owned()), P=M.pick||{}; DEAL=B.deal(G,{spots:P.spots,thing:P.thing,people:+P.people||0,time:P.time,situation:P.situation},M.seed=(M.seed||1)+1); saveM(); render(); }
function handoff(d,to){ const title=d.names.join(', ');
 try{ if(to==='write') localStorage.setItem('theactorpage_handoff_premise',JSON.stringify({from:'backlot',title,fountain:B.fountain(d,title),at:Date.now()}));
  else localStorage.setItem('theactorpage_handoff_film',JSON.stringify({from:'backlot',title:'From the ground: '+title,text:B.fountain(d,'From the ground: '+title),at:Date.now()})); }catch(e){} }

/* ---------- LIST ---------- */
function listView(){
 const G=B.fromOwned(owned());
 const seg='<div class="seg" role="tablist"><button class="chip sm'+(M.view!=='map'?' on':'')+'" data-view="list">List</button><button class="chip sm'+(M.view==='map'?' on':'')+'" data-view="map">Map</button></div>';
 if(M.view==='map') return seg+mapView(G);
 return seg+listOnly(G);
}
function listOnly(G){
 if(!G.spots.length&&!G.onhand.length) return '<div class="card"><p class="dim" style="margin:0 0 10px">Nothing on the list yet.</p><button class="btn pri" data-tab="spots">ADD A SPOT</button></div>';
 let h='<div class="row" style="margin-bottom:12px"><button class="btn" id="savetxt">SAVE AS TEXT</button><button class="btn" id="savecsv">SAVE AS A SPREADSHEET</button><button class="btn ghost" id="copy">COPY</button></div>';
 h+='<p class="kicker">Spots · '+G.spots.length+'</p><div class="card">'+G.spots.map(s=>'<div class="li">'+(s.photos[0]?'<img data-photo="'+esc(s.photos[0])+'" alt="" hidden>':'<span class="nop"></span>')+'<span>'+esc(B.spotLine(s))+'</span></div>').join('')+'</div>';
 B.KINDS.forEach(([k,l])=>{ const L=G.onhand.filter(x=>x.kind===k); if(L.length) h+='<p class="kicker">'+esc(l)+' · '+(k==='person'?B.people(G.onhand):L.length)+'</p><div class="card">'+L.map(x=>'<div class="li"><span>'+esc(x.name)+(k==='person'&&+x.count>1?' ('+x.count+')':'')+(x.notes?' <span class="faint">· '+esc(x.notes)+'</span>':'')+'</span></div>').join('')+'</div>'; });
 return h;
}
/* ---------- MAP: your pins, to scale, north up. Drawn here; no map service, nothing sent. ---------- */
let VB=null, SEL='';
function mapView(G){
 const P=B.pins(G.spots), none=G.spots.filter(s=>!B.coords(s.where));
 const unp=none.length?'<p class="lab">No pin yet</p><div class="row" style="gap:6px">'+none.map(s=>'<button class="chip sm" data-open-spot="'+esc(s.id)+'">'+esc(s.name)+'</button>').join('')+'</div>':'';
 if(!P.length) return '<div class="card"><p class="dim" style="margin:0 0 8px">No pins yet. Open a spot, stand there and tap I\'M HERE. Or paste a pin from your maps app.</p>'+unp+'</div>';
 const Gs=B.groups(P); if(M.grp==null||M.grp>=Gs.length) M.grp=0; const grp=M.grp===-1?P:Gs[M.grp];
 let h='';
 if(Gs.length>1) h+='<div class="row" style="gap:6px;margin-bottom:8px">'+Gs.map((g,i)=>'<button class="chip sm'+(M.grp===i?' on':'')+'" data-grp="'+i+'">'+esc(g[0].name)+(g.length>1?' + '+(g.length-1):'')+'</button>').join('')+'<button class="chip sm'+(M.grp===-1?' on':'')+'" data-grp="-1">All</button></div>';
 const W=600, H=Math.round(W*(innerWidth<640?1.15:0.7)), xs=grp.map(p=>p.x), ys=grp.map(p=>p.y);
 let x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys); const cx=(x0+x1)/2, cy=(y0+y1)/2;
 const k=Math.min(W/Math.max(60,(x1-x0)*1.6),H/Math.max(60,(y1-y0)*1.7)), across=W/k;   // px per meter at zoom 1; room for labels
 const u=W/Math.max(300,Math.min(W,innerWidth-34));   // so text reads the same size on any screen
 if(!VB||VB.key!==M.grp+'|'+grp.length) VB={key:M.grp+'|'+grp.length,cx:0,cy:0,z:1};
 const z=VB.z, sc=B.scale(across/z), stepPx=sc.m*k*z;
 const X=p=>W/2+(p.x-cx)*k*z+VB.cx, Y=p=>H/2+(p.y-cy)*k*z+VB.cy;
 let g='';
 for(let i=-40;i<=40;i++){ const gx=W/2+VB.cx%stepPx+i*stepPx, gy=H/2+VB.cy%stepPx+i*stepPx; if(gx>-1&&gx<W+1) g+='<line class="mg" x1="'+gx.toFixed(1)+'" y1="0" x2="'+gx.toFixed(1)+'" y2="'+H+'"/>'; if(gy>-1&&gy<H+1) g+='<line class="mg" x1="0" y1="'+gy.toFixed(1)+'" x2="'+W+'" y2="'+gy.toFixed(1)+'"/>'; }
 const sel=grp.find(p=>p.id===SEL);
 if(sel) grp.forEach(p=>{ if(p!==sel) g+='<line class="ml" x1="'+X(sel).toFixed(1)+'" y1="'+Y(sel).toFixed(1)+'" x2="'+X(p).toFixed(1)+'" y2="'+Y(p).toFixed(1)+'"/>'; });
 grp.forEach(p=>{ const on=p.id===SEL; g+='<g class="mp'+(on?' on':'')+'" data-pin="'+esc(p.id)+'" transform="translate('+X(p).toFixed(1)+' '+Y(p).toFixed(1)+')" tabindex="0"><circle class="hit" r="'+Math.round(22*u)+'"/><circle r="'+Math.round((on?9:6.5)*u)+'"/><text y="'+Math.round(-12*u)+'" font-size="'+Math.round(13*u)+'">'+esc(p.name.length>20?p.name.slice(0,19)+'…':p.name)+'</text></g>'; });
 g+='<g class="mn" transform="translate('+(W-22*u)+' '+(30*u)+') scale('+u.toFixed(2)+')"><path d="M0 -16L7 6L0 1L-7 6Z"/><text y="20">N</text></g>';
 g+='<g class="ms" transform="translate('+(14*u)+' '+(H-16*u)+')"><path d="M0 0v'+(6*u).toFixed(1)+'h'+stepPx.toFixed(1)+'v-'+(6*u).toFixed(1)+'" stroke-width="'+(1.5*u).toFixed(1)+'"/><text x="'+(stepPx/2).toFixed(1)+'" y="'+(-5*u).toFixed(1)+'" font-size="'+Math.round(12*u)+'">'+sc.label+'</text></g>';
 h+='<div class="mapw"><svg id="map" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Your spots, north up, to scale">'+g+'</svg><div class="mz"><button class="btn sm" id="zin" aria-label="Closer">+</button><button class="btn sm" id="zout" aria-label="Farther">−</button><button class="btn sm ghost" id="zfit">FIT</button></div></div>';
 h+='<p class="faint small" style="margin:6px 0 12px">Drawn on this phone from your pins. Drag to move, + and − to zoom. Nothing is looked up or sent.</p>';
 if(sel){ const s=G.spots.find(x=>x.id===sel.id), nn=B.nearest(grp,sel.id), rt=B.route(grp,grp.map(p=>p.id),sel.id);
  h+='<div class="card"><div class="row" style="justify-content:space-between"><b style="font-size:17px">'+esc(sel.name)+'</b><button class="btn sm" data-open-spot="'+esc(sel.id)+'">OPEN SPOT</button></div>'
   +(s&&s.photos[0]?'<img class="mph" data-photo="'+esc(s.photos[0])+'" alt="" hidden>':'')
   +(nn.length?'<ul class="facts">'+nn.slice(0,8).map(x=>'<li>'+esc(x.name)+': '+B.far(x.m)+', '+B.walk(x.m)+'</li>').join('')+'</ul>':'')
   +(rt.stops.length>2?'<p class="small" style="margin:10px 0 0"><span class="faint">All of them from here, nearest next:</span> '+rt.stops.map(p=>esc(p.name)).join(' → ')+'. '+B.far(rt.m)+', '+B.walk(rt.m)+'.</p>':'')
   +'<p style="margin:10px 0 0"><a class="lnk" href="https://www.google.com/maps/search/?api=1&query='+sel.lat.toFixed(6)+','+sel.lng.toFixed(6)+'" target="_blank" rel="noopener">Open this pin in a maps app ↗</a> <span class="faint small">(that sends the pin to the map company)</span></p></div>'; }
 else h+='<p class="dim small">Tap a pin: how far the others are, on foot, and the walk to all of them.</p>';
 return h+unp;
}
function saveFile(text,name,type){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }

/* ---------- draw and wire ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===M.tab));
 const G=B.fromOwned(owned()); $('count').textContent=G.spots.length||G.onhand.length?G.spots.length+' spot'+(G.spots.length===1?'':'s')+' · '+G.onhand.length+' on hand':'';
 $('main').innerHTML=M.tab==='drawer'?drawerView():M.tab==='ground'?groundView():M.tab==='list'?listView():spotsView();
 wire(); fillPhotos();
}
function newSpot(name){ const o={id:rid('o'),kind:'location',name:name||'',plays:'',notes:''}; putOwned(owned().concat([o])); M.open=o.id; saveM(); return o; }
function wire(){
 const R=$('main');
 R.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ M.tab=b.dataset.tab; M.open=''; saveM(); render(); scrollTo(0,0); });
 R.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ M.open=b.dataset.open; saveM(); render(); scrollTo(0,0); });
 if($('back')) $('back').onclick=()=>{ M.open=''; saveM(); render(); };
 /* spots */
 if(window.Kit&&$('shootin')) Kit.wire(R,{shoot:()=>$('shootin').click()});
 if($('shootin')) $('shootin').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; const o=newSpot(''); await addPhoto(o.id,f); render(); const n=$('f_name'); if(n) n.focus(); toast('New spot. Give it a name.'); };
 if($('addspot')){ const go=()=>{ const v=$('newspot').value.trim(); if(!v) return; newSpot(v); render(); }; $('addspot').onclick=go; $('newspot').onkeydown=e=>{ if(e.key==='Enter') go(); }; }
 if($('okind')){ const sync=()=>{ $('ocount').hidden=$('okind').value!=='person'; }; $('okind').onchange=sync; sync();
  const go=()=>{ const n=$('oname').value.trim(); if(!n) return; const k=$('okind').value, o={id:rid('o'),kind:k,name:n,plays:'',notes:''}; if(k==='person'&&+$('ocount').value>1) o.count=String(Math.round(+$('ocount').value)); putOwned(owned().concat([o])); render(); const x=$('okind'); if(x){ x.value=k; $('ocount').hidden=k!=='person'; } const nn=$('oname'); if(nn) nn.focus(); };
  $('oadd').onclick=go; $('oname').onkeydown=e=>{ if(e.key==='Enter') go(); }; }
 R.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{ putOwned(owned().filter(o=>o.id!==b.dataset.del)); render(); });
 R.querySelectorAll('[data-f]').forEach(el=>el.onchange=()=>{ edit(M.open,o=>{ o[el.dataset.f]=el.value.trim(); }); });
 R.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{ const [k,v,multi]=b.dataset.ch.split('|');
  if(k==='gp'||k==='gt'){ M.pick=M.pick||{}; M.pick[k==='gp'?'people':'time']=v; saveM(); render(); return; }
  edit(M.open,o=>{ if(multi==='1'){ const L=o[k]||[]; o[k]=L.includes(v)?L.filter(x=>x!==v):B.LIGHT.map(x=>x[0]).filter(x=>x===v||L.includes(x)); } else o[k]=o[k]===v?'':v; }); render(); });
 if($('morephoto')) $('morephoto').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; if(await addPhoto(M.open,f)) { render(); toast('Photo kept on this phone.'); } };
 R.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=()=>{ if(!confirm('Remove this photo?')) return; const pid=b.dataset.pdel; edit(M.open,o=>{ o.scout=(o.scout||[]).filter(x=>x.photo!==pid||(x.note&&(x.photo='',true))); }); delPhoto(pid); render(); });
 if($('delspot')) $('delspot').onclick=()=>{ if(!confirm('Delete this spot, here and in Story Studio?')) return; const o=owned().find(x=>x.id===M.open); (o&&o.scout||[]).forEach(x=>x.photo&&delPhoto(x.photo)); putOwned(owned().filter(x=>x.id!==M.open)); M.open=''; saveM(); render(); };
 if($('here')) $('here').onclick=()=>{ const b=$('here'); if(!navigator.geolocation){ toast('This phone won\'t share where it is. Paste a pin instead.'); return; } b.textContent='FINDING…';
  navigator.geolocation.getCurrentPosition(pos=>{ const v=pos.coords.latitude.toFixed(6)+', '+pos.coords.longitude.toFixed(6); edit(M.open,o=>{ o.where=v; }); render(); toast('Pinned'+(pos.coords.accuracy?', within about '+Math.round(pos.coords.accuracy*3.28084)+' ft':'')+'.'); },
   ()=>{ b.textContent='I\'M HERE'; toast('No location. You can paste a pin instead.'); },{enableHighAccuracy:true,timeout:15000,maximumAge:0}); };
 R.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{ M.view=b.dataset.view; saveM(); render(); });
 R.querySelectorAll('[data-grp]').forEach(b=>b.onclick=()=>{ M.grp=+b.dataset.grp; SEL=''; VB=null; saveM(); render(); });
 R.querySelectorAll('[data-open-spot]').forEach(b=>b.onclick=()=>{ M.tab='spots'; M.open=b.dataset.openSpot; saveM(); render(); scrollTo(0,0); });
 const mp=$('map');
 if(mp){ const zoom=f=>{ VB.z=Math.max(0.25,Math.min(64,VB.z*f)); VB.cx*=f; VB.cy*=f; render(); };
  $('zin').onclick=()=>zoom(2); $('zout').onclick=()=>zoom(0.5); $('zfit').onclick=()=>{ VB=null; render(); };
  let d=null; const pt=e=>{ const r=mp.getBoundingClientRect(), s=mp.viewBox.baseVal.width/r.width; return {x:e.clientX*s,y:e.clientY*s}; };
  mp.onpointerdown=e=>{ d={p:pt(e),cx:VB.cx,cy:VB.cy,moved:false,pin:e.target.closest('[data-pin]')}; try{ mp.setPointerCapture(e.pointerId); }catch(x){} };
  mp.onpointermove=e=>{ if(!d) return; const q=pt(e), dx=q.x-d.p.x, dy=q.y-d.p.y; if(Math.abs(dx)+Math.abs(dy)>8) d.moved=true; if(d.moved){ VB.cx=d.cx+dx; VB.cy=d.cy+dy; const v=mp.viewBox.baseVal; mp.setAttribute('viewBox',(-dx)+' '+(-dy)+' '+v.width+' '+v.height); mp.classList.add('drag'); } };
  mp.onpointerup=()=>{ if(!d) return; const was=d; d=null; mp.classList.remove('drag'); if(was.moved){ render(); return; } if(was.pin){ SEL=SEL===was.pin.dataset.pin?'':was.pin.dataset.pin; render(); } };
  mp.querySelectorAll('[data-pin]').forEach(g=>g.onkeydown=e=>{ if(e.key==='Enter'){ SEL=SEL===g.dataset.pin?'':g.dataset.pin; render(); } }); }
 /* drawer */
 if($('tofilm')){ $('tofilm').onclick=()=>{ const x=DRAWER.src.find(s=>s.id===M.open); if(!x) return; try{ localStorage.setItem('theactorpage_handoff_film',JSON.stringify({from:'backlot',title:x.title,text:x.text,at:Date.now()})); }catch(e){} location.href='../film/'; }; }
 /* ground */
 R.querySelectorAll('[data-gs]').forEach(b=>b.onclick=()=>{ M.pick=M.pick||{}; const L=M.pick.spots||[], id=b.dataset.gs; M.pick.spots=L.includes(id)?L.filter(x=>x!==id):L.concat([id]).slice(-3); saveM(); render(); });
 if($('gthing')) $('gthing').onchange=e=>{ M.pick=M.pick||{}; M.pick.thing=e.target.value; saveM(); };
 if($('gsit')) $('gsit').onchange=e=>{ M.pick=M.pick||{}; M.pick.situation=e.target.value===''?null:+e.target.value; saveM(); };
 if($('deal')) $('deal').onclick=doDeal;
 if($('again')) $('again').onclick=doDeal;
 if($('keep')) $('keep').onclick=()=>{ M.kept=[DEAL].concat(M.kept||[]); DEAL=null; saveM(); render(); toast('Kept.'); };
 R.querySelectorAll('[data-kdel]').forEach(b=>b.onclick=()=>{ M.kept.splice(+b.dataset.kdel,1); saveM(); render(); });
 R.querySelectorAll('[data-hw]').forEach(a=>a.onclick=()=>handoff(a.dataset.hw==='live'?DEAL:M.kept[+a.dataset.hw],'write'));
 R.querySelectorAll('[data-hf]').forEach(a=>a.onclick=()=>handoff(a.dataset.hf==='live'?DEAL:M.kept[+a.dataset.hf],'film'));
 /* list */
 const G=B.fromOwned(owned());
 if($('savetxt')) $('savetxt').onclick=()=>{ saveFile(B.listText(G),'Backlot - spots and on hand.txt','text/plain'); toast('Saved.'); };
 if($('savecsv')) $('savecsv').onclick=()=>{ saveFile('﻿'+B.listCsv(G),'Backlot - spots and on hand.csv','text/csv'); toast('Saved. Opens in any spreadsheet.'); };
 if($('copy')) $('copy').onclick=async()=>{ try{ await navigator.clipboard.writeText(B.listText(G)); toast('Copied.'); }catch(e){ toast('This browser would not copy. Use SAVE AS TEXT.'); } };
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ if(M.tab===b.dataset.t) M.open=''; else M.open=''; M.tab=b.dataset.t; if(M.tab==='drawer') DRAWER=null; saveM(); render(); scrollTo(0,0); });
addEventListener('storage',e=>{ if(e.key===FKEY){ DRAWER=null; render(); } });
render();
window.__backlot={owned,M:()=>M};
})();
