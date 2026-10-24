/* SPOTTED: you saw something your reps should see. A role on a casting site, a show in the news. Grab it and pass
   it along: a screenshot and one polite line. "Just passing this along. [ROLE] looks interesting."
   HOME  three ways in (a screenshot, the words or the link, or just say it), what you've passed along, your reps.
   ONE   the screenshot, the role, the note to your reps (yours to change), SEND IT. On a phone the share sheet opens with
         the screenshot and the note; on a computer the screenshot is copied and your mail opens with the note.
         Folded away: what it says, a pitch for your rep, a note straight to the office, a cut from Reel Room.
   No tracking: it says when you sent it, nothing more. Nothing uploaded. localStorage theactorpage_spotted_v1, the
   screenshots in IndexedDB theactorpage_spotted_pics. The Hub and NOTES are read, never written. */
(function(){
const S=window.Spotted, O=window.Offices, N=window.Notes, Y=window.You;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='theactorpage_spotted_v1', UK='spotted_ui_v1';
const blank=()=>({items:[],me:{reel:'',resume:'',site:'',reps:[]},held:[]});
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.items)) return Object.assign(blank(),d,{me:Object.assign(blank().me,d.me||{})}); }catch(e){} return blank(); }
let D=load();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('This device is out of room. Nothing was saved.'); } };
let U=(()=>{ try{ return Object.assign({open:''},JSON.parse(localStorage.getItem(UK)||'{}')); }catch(e){ return {open:''}; } })();
const saveU=()=>{ try{ localStorage.setItem(UK,JSON.stringify({open:U.open||''})); }catch(e){} };
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3600); }
const uid=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
let HUB=null, DRAFT=null, MANY=null, WORDS=false, SAY=false, REPSOPEN=false;
const you=()=>{ try{ return Y?Y.get():{}; }catch(e){ return {}; } };
const me=()=>{ const y=you(); return Object.assign({name:y.name||'',rep:y.rep||'',credits:y.credits||[]},D.me); };
const types=()=>{ const y=you(); return (y.types||[]).filter(Boolean); };
const ctx=()=>({projects:(HUB&&HUB.projects)||[],credits:(HUB&&HUB.credits)||[],you:you(),offices:O,notes:N,held:D.held,spotted:D.items,types:types()});
const item=id=>D.items.find(x=>x.id===id);
const cur=()=>DRAFT||(U.open&&item(U.open))||null;
const isDraft=it=>!!it&&it===DRAFT;
const day=t=>t?new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
const mail=(to,subject,body)=>'mailto:'+encodeURIComponent(to||'').replace(/%2C/g,',')+'?subject='+encodeURIComponent(subject||'')+'&body='+encodeURIComponent(body||'');
async function copy(t){ try{ await navigator.clipboard.writeText(t); toast('Copied.'); }catch(e){ toast('Select the text and copy it.'); } }

/* your reps: Contacts first, then any you added here */
function reps(){ const L=[]; try{ if(window.Contacts) Contacts.myReps().forEach(p=>L.push({name:p.name||'',email:p.email||'',role:p.role||p.kind||'rep',from:'contacts'})); }catch(e){}
 D.me.reps.forEach((r,i)=>{ if(!(r.name||r.email)) return; if(L.some(x=>x.email&&x.email===r.email)) return; L.push({name:r.name,email:r.email,role:'rep',from:'here',i}); }); return L; }
const repEmails=()=>reps().map(r=>r.email).filter(Boolean).filter((e,i,a)=>a.indexOf(e)===i).join(',');
const firstNames=()=>{ const n=reps().map(r=>String(r.name||'').trim().split(/\s+/)[0]).filter(Boolean).filter((e,i,a)=>a.indexOf(e)===i); return n.length>2?n.slice(0,-1).join(', ')+' and '+n.slice(-1):n.join(' and '); };

/* ---------- screenshots, on this device ---------- */
const PDB='theactorpage_spotted_pics';
const pdb=()=>new Promise((res,rej)=>{ const r=indexedDB.open(PDB,1); r.onupgradeneeded=()=>r.result.createObjectStore('pics'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
async function picPut(id,blob){ const db=await pdb(); await new Promise((res,rej)=>{ const t=db.transaction('pics','readwrite'); t.objectStore('pics').put(blob,id); t.oncomplete=res; t.onerror=()=>rej(t.error); }); }
async function picGet(id){ try{ const db=await pdb(); return await new Promise(res=>{ const q=db.transaction('pics').objectStore('pics').get(id); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }catch(e){ return null; } }
async function picDel(id){ try{ const db=await pdb(); db.transaction('pics','readwrite').objectStore('pics').delete(id); }catch(e){} }
const URLS={};
async function picUrl(id){ if(URLS[id]) return URLS[id]; const b=(DRAFT&&DRAFT.id===id&&DRAFT._blob)||await picGet(id); if(!b) return ''; return URLS[id]=URL.createObjectURL(b); }
const blobOf=async it=>it?(isDraft(it)?it._blob:(it.pic?await picGet(it.id):null)):null;
/* a PNG copy for the clipboard (it only takes PNG) */
let PNG=null;
async function pngOf(blob){ if(!blob) return null; if(blob.type==='image/png') return blob; try{ const bm=await createImageBitmap(blob), c=document.createElement('canvas'); c.width=bm.width; c.height=bm.height; c.getContext('2d').drawImage(bm,0,0); return await new Promise(r=>c.toBlob(r,'image/png')); }catch(e){ return null; } }

/* ---------- in ---------- */
const fresh=(card,raw,how)=>({id:uid(),at:Date.now(),raw:raw||'',card:card||S.read(''),status:'spotted',history:[{s:'spotted',at:Date.now()}],note:'',mine:'',how,pic:false});
function fromShot(blob){ if(!blob||!/^image\//.test(blob.type||'')) return toast('That isn\'t a picture. Try a screenshot.'); DRAFT=fresh(S.read(''),'','shot'); DRAFT.pic=true; DRAFT._blob=blob; MANY=null; render(); setTimeout(()=>{ const r=$('cf_role'); if(r) r.focus(); },60); }
const onList=c=>{ const k=S.key(c.project); return !!k&&D.items.some(x=>S.key(x.card.project)===k); };
function fromWords(raw,url){ const L=S.readMany(raw,{url});
 if(L.length>1){ MANY={raw:String(raw||''),many:L,pick:L.map(c=>!onList(c))}; DRAFT=null; render(); return; }
 DRAFT=fresh(L[0]||S.read(raw,{url}),String(raw||''),'words'); MANY=null; render(); }
function fromSay(role,project){ const c=S.read(''); c.role=role; c.project=project; DRAFT=fresh(c,'','say'); MANY=null; render(); }

function homeView(){
 const L=D.items.slice().sort((a,b)=>b.at-a.at), R=reps();
 let h='<div class="grid"><div class="colA">';
 h+='<p class="kicker">You spotted something</p><div class="ways">'
  +'<label class="way pri" id="wshot" for="shotin"><b>A screenshot</b><span>Pick it from your photos, or paste or drop it here.</span><input type="file" id="shotin" accept="image/*" hidden></label>'
  +'<button type="button" class="way'+(WORDS?' on':'')+'" id="wwords" aria-expanded="'+WORDS+'"><b>The words or the link</b><span>Paste the notice, the story, the post.</span></button>'
  +'<button type="button" class="way'+(SAY?' on':'')+'" id="wsay" aria-expanded="'+SAY+'"><b>Just say it</b><span>The role, the show. Two words is fine.</span></button></div>';
 if(WORDS) h+='<div class="card" id="wordsbox"><label class="lab" for="raw" style="margin-top:0">The words or the link</label><textarea class="field" id="raw" placeholder="Paste it here"></textarea><div class="row" style="margin-top:8px"><button class="btn" id="paste">PASTE</button><button class="btn pri" id="read" style="flex:1">NEXT</button></div></div>';
 if(SAY) h+='<div class="card" id="saybox"><div class="row2"><div><label class="lab" for="sayrole" style="margin-top:0">The role</label><input class="field" id="sayrole" placeholder="As it\'s written"></div><div><label class="lab" for="sayproj" style="margin-top:0">The project (optional)</label><input class="field" id="sayproj" placeholder="If you know it"></div></div><button class="btn pri block" id="saygo" style="margin-top:10px">NEXT</button></div>';
 if(MANY) h+=manyView();
 if(L.length){
  h+='<p class="kicker" style="margin-top:20px">You\'ve spotted <i>'+L.length+'</i></p><div class="card list">';
  h+=L.map(it=>{ const c=it.card, nm=[c.role,c.project].filter(Boolean).join(' · ')||'(no name yet)', how=it.pic?'screenshot':it.how==='say'?'you said it':(/https?:\/\//.test(it.raw||c.source||'')&&!(it.raw||'').trim().includes(' ')?'a link':'the words');
   return '<div class="sp"><button class="spb" data-open="'+it.id+'">'+(it.pic?'<img class="shot" data-pic="'+it.id+'" alt="">':'<span class="shot nopic" aria-hidden="true"></span>')+'<span class="spt"><b>'+esc(nm)+'</b><small>'+esc(how+' · '+(it.sentAt?'sent '+day(it.sentAt):'not sent yet'))+'</small></span></button>'+(it.sentAt?'':'<button class="btn sm" data-open="'+it.id+'">PASS IT ALONG</button>')+'</div>'; }).join('');
  h+='</div>';
 }
 h+='</div><div class="colB">'+repsHtml(R)+'</div></div>';
 return h;
}
function repsHtml(R){
 const y=you();
 let h='<p class="kicker">Your reps</p><div class="card" id="repsbox">';
 h+=R.length?R.map(r=>'<p class="rep"><b>'+esc(r.name||r.email)+'</b><small>'+esc((r.role||'rep')+(r.from==='contacts'?' · from Contacts':'')+(r.email?'':' · no email yet'))+'</small></p>').join(''):'<p class="dim small" style="margin:0 0 6px">Add your agent or manager and the note goes straight to them.</p>';
 const rows=D.me.reps.length?D.me.reps:[{name:'',email:''}];
 h+='<details class="sub" id="repsfold"'+(R.length&&!REPSOPEN?'':' open')+'><summary>'+(R.length?'ADD OR CHANGE':'ADD A REP')+'</summary>'
  +rows.map((r,i)=>'<div class="pair"><input class="field" data-rep="'+i+'|name" value="'+esc(r.name)+'" placeholder="Name" aria-label="Name"><input class="field" data-rep="'+i+'|email" value="'+esc(r.email)+'" placeholder="Email" inputmode="email" aria-label="Email"><button class="lnk faint" data-rmrep="'+i+'" aria-label="Remove">✕</button></div>').join('')
  +'<button class="btn sm" id="addrep" style="margin-top:6px">ADD A REP</button>'
  +'<label class="lab" for="yname">Your name, for the sign-off</label><input class="field" id="yname" value="'+esc(y.name||'')+'" placeholder="Your name">'
  +'<p class="small" style="margin:10px 0 0"><a href="../contacts/?tab=reps">Everyone in your work is in Contacts</a></p></details></div>';
 return h;
}
/* a story or a list with several projects in it: pick which to keep */
function manyView(){
 const L=MANY.many, n=MANY.pick.filter(Boolean).length;
 let h='<div class="card" id="manybox"><p class="kicker">'+L.length+' projects in this</p><p class="dim small">Untick the ones you don\'t want.</p>';
 h+=L.map((c,i)=>'<label class="pick"><input type="checkbox" data-pick="'+i+'"'+(MANY.pick[i]?' checked':'')+'><span><b>'+esc(c.project)+'</b>'+(c.role?' · '+esc(c.role):'')+'<small>'+esc([(c.casting||[]).length?c.casting.join(' & ')+' casting':'',c.network,c.type].filter(Boolean).join(' · '))+'</small>'+(onList(c)?'<small>Already here</small>':'')+'</span></label>').join('');
 h+='<div class="row" style="margin-top:8px"><button class="btn ghost" id="redo">NEVER MIND</button><button class="btn pri" id="keepmany" style="flex:1"'+(n?'':' disabled')+'>KEEP '+(n===L.length?'ALL '+n:n)+'</button></div></div>';
 return h;
}
function keepMany(){ const now=Date.now(); let n=0;
 MANY.many.forEach((c,i)=>{ if(!MANY.pick[i]) return; const it=fresh(c,'','words'); it.at=now+i; it.id+=i; D.items.push(it); n++; });
 save(); MANY=null; WORDS=false; render(); toast(n+' kept. Open one to pass it along.'); }

/* ---------- one: the screenshot and the note ---------- */
const mmss=n=>{ n=Math.round(n||0); return Math.floor(n/60)+':'+String(n%60).padStart(2,'0'); };
const nameOf=c=>c.role&&c.project?c.role+' ('+c.project+')':c.role||c.project||'';
function noteFor(it){ const c=it.card, m=me(), hi=firstNames(), cut=S.cutFor(it.id), L=['Hi'+(hi?' '+hi:'')+',',''];
 L.push('Just passing this along. '+(nameOf(c)?nameOf(c)+' looks interesting.':'This looks interesting.'));
 if(it.addSaid){ const pa=S.passAlong(Object.assign({},c,{mine:'',more:it.more||[],you_stage:'',cut:null}),factsFor(it),Object.assign({},m,{name:''})).body.replace(/^Just passing this along\.\s*/,'').trim(); if(pa){ L.push(''); L.push(pa); } }
 if(cut){ L.push(''); L.push(S.cutLine(cut)); }
 L.push(''); L.push(m.name||'');
 return L.join('\n').replace(/\n{3,}/g,'\n\n').trim(); }
const subjFor=it=>'Just passing this along'+(it.card.role||it.card.project?': '+(it.card.role||it.card.project):'');
const bodyOf=it=>it.body!=null?it.body:noteFor(it);
const subjOf=it=>it.subj!=null?it.subj:subjFor(it);
const factsFor=it=>S.facts(it.card,Object.assign(ctx(),{selfId:it.id}));
const stageOf=c=>c.stage||(c.stage===undefined&&c.about?S.stage(c.about):null);
function stageHtml(c,raw){ const st=stageOf(c); if(!st||!(raw||st.claims.length||st.casting.length||st.dated)) return ''; const W=S.stageWords(st), stale=S.isStale(st);
 return '<div class="stg'+(stale?' stale':'')+'" id="stagebox"><p class="lab">Where it stands, as written</p><ul class="facts">'+W.map(w=>'<li'+(/^Said with a not|^Stale|Stale:/.test(w)?' class="warn"':'')+'>'+esc(w)+'</li>').join('')+'</ul>'
  +(st.claims.length?'<details style="margin-top:6px"><summary class="faint small" style="cursor:pointer">The sentences</summary>'+st.claims.concat(st.casting.map(x=>Object.assign({word:'casting'},x))).map(x=>'<p class="small" style="margin:6px 0"><span class="faint">'+esc(x.word)+(x.not?' (with a not)':'')+':</span> '+esc(x.sentence)+'</p>').join('')+'</details>':'')+'</div>'; }
function changedHtml(it){ const L=(it.log||[]).map(e=>({at:e.at,t:e.t})).sort((a,b)=>b.at-a.at);
 if(!L.length) return '';
 return '<details class="fold" id="changed"'+(L.length<=4?' open':'')+'><summary>WHAT HAPPENED <i>'+L.length+'</i></summary><ul class="facts">'+L.map(e=>'<li><span class="faint">'+esc(day(e.at))+':</span> '+esc(e.t)+'</li>').join('')+'</ul></details>'; }
function cutLogged(it,cut){ if(!cut||isDraft(it)) return; if((it.log||[]).some(e=>e.k==='cut'&&e.reel===cut.reel)) return; S.log(it,'cut','Built a '+mmss(cut.secs)+' cut in Reel Room.',cut.at); it.log[it.log.length-1].reel=cut.reel; save(); }
function cutHtml(it,cut){ const T=S.cutText(it.card,types());
 if(cut) return '<div class="card" id="cutbox"><p class="kicker">A cut for this</p><p style="margin:0 0 4px"><b>'+esc(cut.name)+'</b> · '+mmss(cut.secs)+'</p><p class="faint small" style="margin:0 0 8px">Built '+esc(day(cut.at))+' from '+(cut.from==='role'?'the role\'s own words':'the project\'s kind and your types')+'. The note says it\'s ready. To send the video: open it in Reel Room, make the video, then save or share.</p>'
  +'<div class="row"><a class="btn pri" style="flex:1;text-decoration:none" href="../archbook/?reel='+encodeURIComponent(cut.reel)+'">OPEN IN REEL ROOM</a><button class="btn" id="buildcut">BUILD ANOTHER</button></div></div>';
 return '<div class="card slim" id="cutbox"><p class="kicker">A cut for this, if you want one</p><p class="faint small" style="margin:-4px 0 8px">Reel Room finds the footage you have for this and builds a 1:00 to 2:00 cut, '+(T.from==='role'?'from the role\'s own words':'from the project\'s kind and your types (there\'s no role description on this one)')+'.</p><button class="btn block" id="buildcut">BUILD A CUT</button></div>'; }
function buildCut(it){ if(isDraft(it)) keep(true); const T=S.cutText(it.card,types());
 try{ localStorage.setItem('theactorpage_handoff_cut',JSON.stringify({from:'spotted',spotted:it.id,project:it.card.project||'',role:it.card.role||'',text:T.text,src:T.from,at:Date.now()})); }catch(e){ return toast('This device is out of room.'); }
 location.href='../archbook/?for=spotted'; }
function cardFields(c){
 const f=(k,l,v,ph)=>'<label class="lab" for="cf_'+k+'">'+l+'</label><input class="field" id="cf_'+k+'" data-cf="'+k+'" value="'+esc(v)+'" placeholder="'+esc(ph||'Not written')+'">';
 return f('casting','Casting',(c.casting||[]).join(', '),'Who is casting')+'<div class="row2"><div>'+f('type','Kind of job',c.type,'Commercial, pilot, feature')+'</div><div>'+f('network','Network or client',c.network)+'</div></div>'+f('source','Link',c.source,'A link your reps can open'); }
function saidHtml(c){
 const L=[];
 if(c.union) L.push(['Union',c.union]); if(c.where) L.push(['Where',c.where]);
 (c.dates||[]).forEach(d=>L.push([d.what,d.text])); (c.pay||[]).forEach(p=>L.push(['Pay',p])); if(c.conflicts) L.push(['Conflicts',c.conflicts]);
 let h=L.length?'<ul class="said" style="margin-top:12px">'+L.map(([w,t])=>'<li>'+(t.toLowerCase().indexOf(w.toLowerCase())===0?'':'<span class="w">'+esc(w)+'</span> ')+esc(t)+'</li>').join('')+'</ul>':'';
 if((c.musts||[]).length) h+='<p class="lab" style="margin-top:12px">What they ask for, as written</p>'+c.musts.map(m=>'<div class="must">'+esc(m)+'</div>').join('');
 if((c.private||[]).length) h+='<p class="faint small" style="margin-top:10px">'+(c.private.length===1?'A private link':c.private.length+' private links')+' (a Zoom room, your own page) '+(c.private.length===1?'is':'are')+' on this. Kept here, left out of every note.</p>';
 return h; }
function factsHtml(F){ if(!F.length) return ''; return '<p class="lab">Yours, next to it</p><ul class="facts">'+F.map(x=>'<li'+(x.k==='conflict'?' class="bad"':'')+'>'+esc(x.t)+'</li>').join('')+'</ul>'; }

/* someone on this you've worked with: its director, its casting, or a name in its words */
function wwHits(it){ const WW=window.WorkedWith; if(!WW) return []; const c=it.card||{}; const a=WW.match([c.director].concat(c.casting||[])), t=WW.inText([c.about,it.raw].concat((it.more||[]).map(m=>m.raw)).filter(Boolean).join(' ')); t.forEach(p=>{ if(!a.some(x=>WW.key(x.name)===WW.key(p.name))) a.push(p); }); return a; }
function wwHtml(it){ const H=wwHits(it); if(!H.length) return ''; const WW=window.WorkedWith, proj=(it.card&&it.card.project)||'';
 return '<div class="card slim" id="wwbox"><p class="kicker">You\'ve worked with</p>'+H.map(p=>'<div class="row" style="justify-content:space-between;margin:4px 0"><span>'+esc(WW.line(p).replace(/^You worked with /,''))+'</span>'+(proj&&!isDraft(it)?(WW.pitched(p.name,proj)?'<small class="faint">on your reps sheet</small>':'<button class="chip sm" data-ww="'+esc(WW.key(p.name))+'">FOR MY REPS</button>'):'')+'</div>').join('')+'</div>'; }
function oneView(it){
 const c=it.card, R=reps(), cut=S.cutFor(it.id); cutLogged(it,cut);
 const F=factsFor(it), m=me(), pt=S.pitch(Object.assign({},c,{cut}),F,m), dn=S.direct(c,F,m);
 const to=R.filter(r=>r.email).map(r=>r.name||r.email);
 let h='<div class="backbar"><button class="btn sm ghost" id="back">‹ SPOTTED</button>'+(it.sentAt?'<span class="faint small">Sent to your reps '+esc(day(it.sentAt))+'</span>':'')+'</div>';
 h+='<div class="grid one"><div class="colA">';
 h+='<p class="kicker">What you spotted</p>';
 if(it.pic) h+='<figure class="bigshot"><img id="bigpic" data-pic="'+it.id+'" alt="Your screenshot"><button class="lnk faint" id="rmpic">take the screenshot off</button></figure>';
 else h+='<label class="addshot" for="shotin2"><b>Add the screenshot</b><span>If you have one. It goes with the note.</span><input type="file" id="shotin2" accept="image/*" hidden></label>';
 h+='<div class="row2"><div><label class="lab" for="cf_role">The role</label><input class="field" id="cf_role" data-cf="role" value="'+esc(c.role)+'" placeholder="You type it: two words is fine"></div><div><label class="lab" for="cf_project">The project (optional)</label><input class="field" id="cf_project" data-cf="project" value="'+esc(c.project)+'" placeholder="If you know it"></div></div>';
 if(c.roles&&c.roles.length>1) h+='<div class="row" style="margin-top:6px">'+c.roles.map(r=>'<button class="chip sm'+(r.name===c.role?' on':'')+'" data-role="'+esc(r.name)+'">'+esc(r.name)+'</button>').join('')+'</div>';
 h+='</div><div class="colB">';
 h+='<div class="card note"><p class="kicker tg">To your reps'+(to.length?' · '+esc(to.join(', ')):'')+'</p>'
  +(to.length?'':'<p class="dim small" style="margin:-2px 0 6px">No rep email yet. Add one on the front page, or pick who in your mail.</p>')
  +'<label class="lab" for="subj">Subject</label><input class="field" id="subj" value="'+esc(subjOf(it))+'">'
  +'<label class="lab" for="t_pa">The note</label><textarea class="field send short" id="t_pa">'+esc(bodyOf(it))+'</textarea>'
  +'<label class="chk"><input type="checkbox" id="addsaid"'+(it.addSaid?' checked':'')+(it.body!=null?' disabled':'')+'> Add what it says (casting, dates, where it shoots)</label>'
  +'<p class="faint small" style="margin:0">'+(it.body!=null?'Your words now. <button class="lnk" id="resetnote">Start the note over</button>':'Short on purpose. Your words: change any of it.')+'</p></div>';
 h+='<div class="row"><a class="btn pri big" id="send" href="#" style="flex:2;text-decoration:none">SEND IT TO YOUR REPS</a>'+(isDraft(it)?'<button class="btn big" id="later" style="flex:1">SAVE FOR LATER</button>':'')+'</div>';
 h+='<p class="faint small">'+(it.pic?'On a phone: your share sheet opens with the screenshot and the note; pick Mail. On a computer: the screenshot is copied, your mail opens with the note; paste it in. You hit send.':'Your mail opens with the note. You hit send.')+'</p>';
 h+=wwHtml(it);
 h+=cutHtml(it,cut);
 h+=changedHtml(it);
 const said=saidHtml(c), st=stageHtml(c,!!(it.raw||'').trim()), fx=factsHtml(F);
 h+='<details class="fold" id="saysfold"><summary>WHAT IT SAYS</summary>'+(it.raw?'<p class="raw">'+esc(it.raw.slice(0,1400))+(it.raw.length>1400?'…':'')+'</p>':'')+st+said+fx+cardFields(c)+'</details>';
 h+='<details class="fold" id="morefold"><summary>MORE WAYS TO SEND</summary>';
 const block=(id,l,sub,t,to,toWord)=>'<div class="mw"><p class="lab" style="margin-top:4px"><b>'+l+'</b></p><p class="faint small" style="margin:0 0 6px">'+sub+'</p>'
  +'<textarea class="field send" id="t_'+id+'" data-subj="'+esc(t.subject)+'">'+esc(t.body)+'</textarea><div class="row" style="margin-top:8px"><button class="btn" data-copy="'+id+'">COPY</button><a class="btn" style="flex:1;text-decoration:none" data-mail="'+id+'" data-to="'+esc(to)+'" href="#">'+toWord+'</a></div></div>';
 h+=block('pt','A pitch for your rep','For your rep to send the office, if they want it. Goes to your reps.',pt,repEmails(),'EMAIL YOUR REPS');
 h+=block('dn','Straight to the office','In your voice. Your call when, or if, to send it.',dn,c.contact||'','EMAIL'+(c.contact?' '+esc(c.contact):''));
 h+='<p class="lab">Your links, for these two</p><input class="field" data-me="reel" value="'+esc(D.me.reel)+'" placeholder="Reel link" aria-label="Reel link" style="margin-bottom:6px"><input class="field" data-me="resume" value="'+esc(D.me.resume)+'" placeholder="Résumé link" aria-label="Résumé link" style="margin-bottom:6px"><input class="field" data-me="site" value="'+esc(D.me.site)+'" placeholder="Your page" aria-label="Your page">';
 h+='</details>';
 h+='<div class="row" style="justify-content:flex-end"><button class="lnk faint" id="del">'+(isDraft(it)?'never mind':'delete this one')+'</button></div>';
 h+='</div></div>';
 return h;
}
function keep(quiet){ const it=DRAFT; if(!it) return null; const blob=it._blob; delete it._blob; D.items.push(it); save(); if(blob) picPut(it.id,blob).catch(()=>toast('The screenshot didn\'t fit on this device.')); if(blob) URLS[it.id]=URLS[it.id]||URL.createObjectURL(blob); DRAFT=null; U.open=it.id; saveU(); if(!quiet) render(); return it; }
function markSent(it){ it.sentAt=Date.now(); if(it.status==='spotted'){ it.status='passed'; (it.history=it.history||[]).push({s:'passed',at:it.sentAt}); } S.log(it,'sent','Sent to your reps.'); save(); }
async function send(a,e){ let it=cur(); if(!it) return; const body=$('t_pa').value, subj=$('subj').value, to=repEmails();
 const coarse=matchMedia('(pointer:coarse)').matches;
 // a phone: the share sheet, with the screenshot
 if(it.pic&&coarse&&navigator.canShare&&SHARE&&navigator.canShare({files:[SHARE]})){ e.preventDefault();
  try{ await navigator.share({files:[SHARE],title:subj,text:body}); if(isDraft(it)) it=keep(true); markSent(it); render(); toast('Sent. Check it went.'); }catch(x){ if(x&&x.name!=='AbortError') toast('Couldn\'t open the share sheet. Try again.'); }
  return; }
 // a computer: copy the screenshot, open mail with the note
 a.href=mail(to,subj,body);
 if(it.pic&&PNG){ try{ navigator.clipboard.write([new ClipboardItem({'image/png':PNG})]).then(()=>toast('The screenshot is copied. Paste it into the email.')).catch(()=>toast('Your mail is opening. Attach the screenshot from where you saved it.')); }catch(x){} }
 if(isDraft(it)) it=keep(true); markSent(it); setTimeout(render,300); }
let SHARE=null;
async function prep(it){ SHARE=null; PNG=null; if(!it||!it.pic) return; const b=await blobOf(it); if(!b) return; const ext=(b.type.split('/')[1]||'png').replace('jpeg','jpg');
 SHARE=new File([b],'Spotted'+(it.card.role?' - '+it.card.role.replace(/[\\/:*?"<>|]+/g,''):'')+'.'+ext,{type:b.type}); PNG=await pngOf(b); }

/* ---------- draw and wire ---------- */
let BUSY=false;
function render(){ if(BUSY){ setTimeout(render,0); return; } BUSY=true; try{ draw(); } finally{ BUSY=false; } }
function draw(){
 const it=cur(); if(U.open&&!item(U.open)&&!DRAFT){ U.open=''; saveU(); }
 const n=D.items.filter(x=>x.sentAt).length; $('count').textContent=n?n+' passed along':'';
 $('main').innerHTML=it?oneView(it):homeView();
 document.querySelectorAll('#main img[data-pic]').forEach(async im=>{ const u=await picUrl(im.dataset.pic); if(u) im.src=u; else im.replaceWith(Object.assign(document.createElement('span'),{className:'shot nopic'})); });
 if(it) prep(it);
 wire();
}
function wire(){
 const M=$('main'), it=cur();
 const shotIn=el=>{ if(!el) return; el.onchange=()=>{ const f=el.files&&el.files[0]; if(!f) return; if(it){ it.pic=true; if(isDraft(it)) it._blob=f; else { picPut(it.id,f); URLS[it.id]=URL.createObjectURL(f); save(); } render(); } else fromShot(f); }; };
 shotIn($('shotin')); shotIn($('shotin2'));
 const w=$('wshot'); if(w){ w.ondragover=e=>{ e.preventDefault(); w.classList.add('over'); }; w.ondragleave=()=>w.classList.remove('over'); w.ondrop=e=>{ e.preventDefault(); w.classList.remove('over'); const f=[...(e.dataTransfer.files||[])].find(x=>/^image\//.test(x.type)); if(f) fromShot(f); }; }
 if($('wwords')) $('wwords').onclick=()=>{ WORDS=!WORDS; SAY=false; render(); if(WORDS) $('raw').focus(); };
 if($('wsay')) $('wsay').onclick=()=>{ SAY=!SAY; WORDS=false; render(); if(SAY) $('sayrole').focus(); };
 if($('paste')) $('paste').onclick=async()=>{ try{ $('raw').value=await navigator.clipboard.readText(); }catch(e){ toast('Paste it into the box.'); } };
 if($('read')) $('read').onclick=()=>{ const t=$('raw').value; if(!t.trim()) return toast('Paste it first.'); const u=/^\s*https?:\/\/\S+\s*$/.test(t)?t.trim():''; WORDS=false; fromWords(t,u); };
 if($('saygo')) $('saygo').onclick=()=>{ const r=$('sayrole').value.trim(), p=$('sayproj').value.trim(); if(!r&&!p) return toast('Type the role, or the show.'); SAY=false; fromSay(r,p); };
 if($('sayrole')) [$('sayrole'),$('sayproj')].forEach(el=>el.onkeydown=e=>{ if(e.key==='Enter') $('saygo').click(); });
 M.querySelectorAll('[data-pick]').forEach(el=>el.onchange=()=>{ MANY.pick[+el.dataset.pick]=el.checked; render(); });
 if($('keepmany')) $('keepmany').onclick=keepMany;
 if($('redo')) $('redo').onclick=()=>{ MANY=null; render(); };
 M.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ U.open=b.dataset.open; DRAFT=null; saveU(); render(); window.scrollTo(0,0); });
 // reps
 if($('repsfold')) $('repsfold').ontoggle=e=>{ REPSOPEN=e.target.open; };
 M.querySelectorAll('[data-rep]').forEach(el=>el.onchange=()=>{ const [i,k]=el.dataset.rep.split('|'); if(!D.me.reps[i]) D.me.reps[i]={name:'',email:''}; D.me.reps[i][k]=el.value.trim(); REPSOPEN=true; save(); render(); });
 M.querySelectorAll('[data-rmrep]').forEach(b=>b.onclick=()=>{ D.me.reps.splice(+b.dataset.rmrep,1); save(); render(); });
 if($('addrep')) $('addrep').onclick=()=>{ if(!D.me.reps.length) D.me.reps.push({name:'',email:''}); D.me.reps.push({name:'',email:''}); REPSOPEN=true; save(); render(); const f=M.querySelector('[data-rep="'+(D.me.reps.length-1)+'|name"]'); if(f) f.focus(); };
 if($('yname')) $('yname').onchange=e=>{ try{ Y.set('name',e.target.value.trim()); }catch(x){} };
 if(!it) return;
 // one
 if($('back')) $('back').onclick=()=>{ DRAFT=null; U.open=''; saveU(); render(); window.scrollTo(0,0); };
 M.querySelectorAll('[data-cf]').forEach(el=>el.onchange=()=>{ const c=it.card, k=el.dataset.cf, v=el.value.trim();
  if(k==='casting'){ const was=c.casting||[]; c.casting=v.split(/\s*(?:,|&)\s*/).filter(Boolean); const nw=c.casting.filter(x=>!was.some(y=>S.key(y)===S.key(x))); if(!isDraft(it)&&nw.length) S.log(it,'casting','Casting named: '+nw.join(' & ')+'.'); } else c[k]=v;
  if(!isDraft(it)) save(); render(); });
 M.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{ it.card.role=b.dataset.role; if(!isDraft(it)) save(); render(); });
 if($('t_pa')) $('t_pa').oninput=e=>{ it.body=e.target.value; if(!isDraft(it)) save(); const a=$('addsaid'); if(a) a.disabled=true; };
 if($('subj')) $('subj').oninput=e=>{ it.subj=e.target.value; if(!isDraft(it)) save(); };
 if($('addsaid')) $('addsaid').onchange=e=>{ it.addSaid=e.target.checked; if(!isDraft(it)) save(); render(); };
 if($('resetnote')) $('resetnote').onclick=()=>{ delete it.body; delete it.subj; if(!isDraft(it)) save(); render(); };
 if($('send')) $('send').onclick=e=>send($('send'),e);
 if($('later')) $('later').onclick=()=>{ keep(true); DRAFT=null; U.open=''; saveU(); render(); toast('Saved. It\'s on the front page when you\'re ready.'); };
 if($('rmpic')) $('rmpic').onclick=()=>{ it.pic=false; if(isDraft(it)) delete it._blob; else { picDel(it.id); save(); } render(); };
 if($('buildcut')) $('buildcut').onclick=()=>buildCut(it);
 M.querySelectorAll('[data-ww]').forEach(b=>b.onclick=()=>{ const p=wwHits(it).find(x=>WorkedWith.key(x.name)===b.dataset.ww); if(p){ WorkedWith.pitch(p,it.card.project||''); toast('On your reps sheet: '+p.name); render(); } });
 M.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy($('t_'+b.dataset.copy).value));
 M.querySelectorAll('[data-mail]').forEach(a=>a.onclick=()=>{ const id=a.dataset.mail, ta=$('t_'+id); let body=ta.value; if(id==='pt') body='If it helps, a note you could send them:\n\n'+body; a.href=mail(a.dataset.to,ta.dataset.subj,body); });
 M.querySelectorAll('[data-me]').forEach(el=>el.onchange=()=>{ D.me[el.dataset.me]=el.value.trim(); save(); render(); const f=$('morefold'); if(f) f.open=true; });
 if($('del')) $('del').onclick=()=>{ if(isDraft(it)){ DRAFT=null; render(); return; } if(!confirm('Delete this one?')) return; D.items=D.items.filter(x=>x.id!==it.id); picDel(it.id); U.open=''; save(); saveU(); render(); };
}
/* a screenshot pasted anywhere on the front page */
document.addEventListener('paste',e=>{ if(cur()) return; const t=e.target; if(t&&/^(TEXTAREA|INPUT)$/.test(t.tagName)) return; const f=[...((e.clipboardData&&e.clipboardData.files)||[])].find(x=>/^image\//.test(x.type)); if(f){ e.preventDefault(); fromShot(f); } });

/* shared here from another app (Android share sheet): ?title=&text=&url= */
(function(){ const q=new URLSearchParams(location.search), t=[q.get('title'),q.get('text')].filter(Boolean).join('\n'), u=q.get('url')||((q.get('text')||'').match(/https?:\/\/\S+/)||[''])[0];
 if(t||u){ fromWords([t,u&&t.indexOf(u)<0?u:''].filter(Boolean).join('\n'),u); history.replaceState(null,'',location.pathname); } })();
window.SPOTTED={get D(){ return D; },get draft(){ return DRAFT; },fromShot,render};
render();
if(O&&O.load) O.load().then(h=>{ HUB=h; render(); }).catch(()=>{});
})();
