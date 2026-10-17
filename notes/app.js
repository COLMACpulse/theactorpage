/* NOTES: for the actor who takes a class, a workshop, a callback on Zoom. We don't run the room; we keep what you get from it.
   SESSION  who's in the room, the sides (onto the shelf), a 30-second Zoom check, TAPE IT (this phone records you while
            you perform on Zoom) with MARK when a note starts, then NOTE IT: their words, typed or said, tied to the moment
   NOTES    every note, newest first, or by scene
   PEOPLE   everyone you've been in a room with, what each told you, and what more than one person told you
   Nothing uploaded. Text in localStorage (shared/notes.js), tapes and voice memos on the takes shelf (shared/takes.js). */
(function(){
const N=window.Notes, C=window.Capture, T=window.Takes, Sh=window.Shelf, X=window.Intake;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UK='notes_ui_v1';
let U=(()=>{ try{ return Object.assign({tab:'session',cur:'',view:'all',stt:false},JSON.parse(localStorage.getItem(UK)||'{}')); }catch(e){ return {tab:'session',cur:'',view:'all',stt:false}; } })();
const saveU=()=>{ try{ localStorage.setItem(UK,JSON.stringify(U)); }catch(e){} };
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3000); }
const roomName=r=>((N.ROOMS.find(x=>x[0]===r)||[0,'Session'])[1]);
const roleName=r=>((N.ROLES.find(x=>x[0]===r)||[0,''])[1]);
const day=d=>{ const t=Date.parse(d); return isFinite(t)?new Date(t).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):''; };
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
let DRAFT={who:[{name:'',role:'casting'}],room:'class',date:new Date().toISOString().slice(0,10),title:'',part:'',shelfId:'',file:''};

/* ---------- the sides: onto the shelf, so Actor OS and MEMORIZER have them ---------- */
async function sidesFile(f){
 const e=X.ext(f.name); let text='';
 try{
  if(e==='pdf'){ const ex=await ActorPDF.extract(await f.arrayBuffer()); if(!ex.chars) return toast('That PDF is pictures of pages. Paste the words instead.'); text=ActorPDF.toSides(ex.lines); }
  else if(e==='docx') text=await X.docxText(await f.arrayBuffer());
  else { const t=await f.text(); text=(e==='fdx'||/<FinalDraft/i.test(t))?ActorSides.fromFdx(t):t; }
 }catch(err){ return toast('Couldn\'t read that file.'); }
 const it=Sh.put({text,file:f.name,fileSig:Sh.sig(f),from:'notes',tool:'notes'}); if(!it) return toast('No words found in that file.');
 if(e==='pdf') try{ await Sh.putFile(it.id,f); }catch(err){}
 return it;
}
function sidesText(s){ const it=s&&s.shelfId?Sh.get(s.shelfId):null; return it?it.text:''; }

/* ---------- camera and mic: one stream, only while you use it ---------- */
let CAM=null, REC=null, RT0=0, TICK=null, CHK=null;
async function cam(){ if(CAM&&CAM.getTracks().some(t=>t.readyState==='live')) return CAM; CAM=await C.open({video:true,audio:true,facing:'user',w:1280,h:720}); return CAM; }
function camOff(){ clearInterval(CHK); CHK=null; if(REC){ try{ REC.cancel(); }catch(e){} REC=null; } clearInterval(TICK); C.stop(CAM); CAM=null; }

/* the 30-second check before you join: framing, light on you, the mic moving, headphones */
async function zoomCheck(){
 try{ await cam(); }catch(e){ return toast(C.errorWords(e,'video')); }
 const box=$('ov'); box.hidden=false; document.body.classList.add('ovopen');
 box.innerHTML='<div class="recbox"><p class="kicker">Zoom check</p><div class="frame"><video id="zv" class="vid mirror" playsinline muted autoplay></video><div class="thirds"></div></div><p class="meter"><span id="mlv"></span></p><p id="lw" class="dim small"></p>'
  +'<button class="btn pri block" id="zcoff">DONE</button></div>';
 const v=$('zv'); v.srcObject=CAM; v.play().catch(()=>{});
 const AC=window.AudioContext||window.webkitAudioContext, ac=new AC(), an=ac.createAnalyser(); an.fftSize=1024; ac.createMediaStreamSource(CAM).connect(an);
 const buf=new Float32Array(an.fftSize), cv=document.createElement('canvas'); cv.width=64; cv.height=48; const x=cv.getContext('2d',{willReadFrequently:true});
 CHK=setInterval(()=>{
  an.getFloatTimeDomainData(buf); let s=0; for(const y of buf) s+=y*y; const dbv=10*Math.log10(Math.max(s/buf.length,1e-9)); const m=$('mlv'); if(m) m.style.width=Math.max(2,Math.min(100,(dbv+60)/60*100))+'%';
  if(v.videoWidth){ x.drawImage(v,0,0,64,48); const d=x.getImageData(0,0,64,48).data; let c=0,cn=0,e=0,en=0;
   for(let yy=0;yy<48;yy++) for(let xx=0;xx<64;xx++){ const i=(yy*64+xx)*4, l=0.299*d[i]+0.587*d[i+1]+0.114*d[i+2]; if(xx>20&&xx<44&&yy>8&&yy<36){ c+=l; cn++; } else if(xx<10||xx>54||yy<6){ e+=l; en++; } }
   c/=cn; e/=en; const w=$('lw'); if(w) w.textContent=c<60?'Dark on you.':e-c>45?'Brighter behind you than on you.':c>215?'Very bright on you.':'Light on you: nothing flagged.'; }
 },400);
 $('zcoff').onclick=()=>{ clearInterval(CHK); CHK=null; try{ ac.close(); }catch(e){} box.hidden=true; box.innerHTML=''; document.body.classList.remove('ovopen'); if(!REC) camOff(); render(); };
}

/* ---------- TAPE IT and MARK ---------- */
async function tapeTap(){
 const s=N.session(U.cur); if(!s) return;
 if(REC) return stopTape();
 try{ await cam(); }catch(e){ return toast(C.errorWords(e,'video')); }
 REC=C.record(CAM,'video'); RT0=Date.now(); render();
 TICK=setInterval(()=>{ const el=$('rt'); if(el) el.textContent=mmss((Date.now()-RT0)/1000); },500);
}
async function stopTape(){
 const r=REC, t0=RT0, t1=Date.now(); REC=null; clearInterval(TICK); if(!r) return;
 const out=await r.stop(); const s=N.session(U.cur);
 const it=await T.put(out.blob,{kind:'video',mime:out.mime,ext:out.ext,secs:out.secs,for:{type:'session',title:s&&s.title||'',role:s&&s.part||'',room:s&&s.room||'',session:U.cur},name:'Session '+(s?s.date:'')});
 N.addTape(U.cur,{id:it.id,t0,t1,secs:out.secs});
 // marks made while this was rolling belong to it
 const ss=N.session(U.cur); (ss.marks||[]).forEach(m=>{ if(!m.takeId&&m.t>=t0&&m.t<=t1+500){ m.takeId=it.id; m.at=Math.max(0,(m.t-t0)/1000); } }); N.setSession(U.cur,{marks:ss.marks});
 toast('Tape kept: '+mmss(out.secs)+(it.kept?'':' (this phone is out of room: save it now)'));
 if(!CHK) camOff();
 render();
}
function markTap(){ if(!U.cur) return; N.mark(U.cur,{}); if(navigator.vibrate) navigator.vibrate(30); toast('Marked. Note it after.'); render(); }

/* ---------- NOTE IT: typed, a voice memo, or said into text ---------- */
let MEMO=null, MEMOKEY='', SR=null;
async function memoTap(key){
 if(MEMO&&MEMOKEY===key){ const r=MEMO; MEMO=null; MEMOKEY=''; const out=await r.stop(); const it=await T.put(out.blob,{kind:'audio',mime:out.mime,ext:out.ext,secs:out.secs,for:{type:'voice',session:U.cur},name:'Note'}); C.stop(memoStream); memoStream=null; const ta=document.querySelector('[data-text="'+key+'"]'); slots[key]=Object.assign(slots[key]||{},{memoId:it.id,text:ta?ta.value:''}); render(); toast('Voice memo kept.'); return; }
 try{ memoStream=await C.open({video:false,audio:true}); }catch(e){ return toast(C.errorWords(e,'audio')); }
 MEMO=C.record(memoStream,'audio'); MEMOKEY=key; render();
}
let memoStream=null; const slots={};
function sttOk(){
 const SRC=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SRC){ toast('This browser can\'t turn speech into text. Type it, or keep a voice memo.'); return null; }
 if(!U.stt){ if(!confirm('Speech to text sends what you say to Apple (Safari) or Google (Chrome) to turn it into words. Your voice memo, if you keep one, stays on this phone. Use it?')) return null; U.stt=true; saveU(); }
 return SRC;
}
function sayTap(key){
 const SRC=sttOk(); if(!SRC) return;
 if(SR){ try{ SR.stop(); }catch(e){} return; }
 const ta=document.querySelector('[data-text="'+key+'"]'); SR=new SRC(); SR.lang=navigator.language||'en-US'; SR.interimResults=false; SR.continuous=true;
 const base=ta?ta.value:''; let got='';
 SR.onresult=e=>{ for(let i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) got+=(got?' ':'')+e.results[i][0].transcript.trim(); const el=document.querySelector('[data-text="'+key+'"]'); const v=(base?base+' ':'')+got; if(el) el.value=v; slots[key]=Object.assign(slots[key]||{},{text:v}); };
 SR.onend=()=>{ SR=null; render(); }; SR.onerror=()=>{ SR=null; render(); };
 SR.start(); render();
}
function saveSlot(key,mark){
 const ta=document.querySelector('[data-text="'+key+'"]'), gv=document.querySelector('[data-giver="'+key+'"]'), txt=(ta?ta.value:'').trim(), sl=slots[key]||{};
 if(!txt&&!sl.memoId) return toast('Nothing to keep yet. Type it, say it, or keep a voice memo.');
 const n=N.addNote({sid:U.cur,text:txt,giver:gv?gv.value:'',mark:mark?mark.id:'',takeId:mark&&mark.takeId||'',at:mark&&mark.at!=null?mark.at:null,memoId:sl.memoId||''});
 if(mark){ const s=N.session(U.cur); (s.marks||[]).forEach(m=>{ if(m.id===mark.id) m.noted=n.id; }); N.setSession(U.cur,{marks:s.marks}); }
 delete slots[key]; render(); toast('Noted.');
}
let PLAY=null;
async function playAt(takeId,at){
 const b=await T.blob(takeId); if(!b) return toast('That tape is gone from this phone.');
 const ov=$('ov'); ov.hidden=false; document.body.classList.add('ovopen');
 ov.innerHTML='<div class="recbox"><video id="pv" class="vid" playsinline controls></video><button class="btn block" id="pvx" style="margin-top:10px">CLOSE</button></div>';
 const v=$('pv'); if(PLAY) URL.revokeObjectURL(PLAY); PLAY=URL.createObjectURL(b); v.src=PLAY; v.onloadedmetadata=()=>{ v.currentTime=Math.max(0,(at||0)-3); v.play().catch(()=>{}); };
 $('pvx').onclick=()=>{ v.pause(); ov.hidden=true; ov.innerHTML=''; document.body.classList.remove('ovopen'); };
}
async function playMemo(id){ const b=await T.blob(id); if(!b) return toast('That memo is gone.'); const a=new Audio(URL.createObjectURL(b)); a.play().catch(()=>{}); }
function showSides(){ const s=N.session(U.cur), t=sidesText(s); if(!t) return toast('No sides on this session.'); const ov=$('ov'); ov.hidden=false; document.body.classList.add('ovopen');
 ov.innerHTML='<div class="recbox"><button class="btn block" id="sdx">CLOSE</button><pre class="sides">'+esc(t)+'</pre></div>'; $('sdx').onclick=()=>{ ov.hidden=true; ov.innerHTML=''; document.body.classList.remove('ovopen'); }; }

/* ---------- show it ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===U.tab));
 const s=U.cur?N.session(U.cur):null; if(U.cur&&!s){ U.cur=''; saveU(); }
 $('title').textContent=U.tab==='session'&&s?(s.who.map(w=>w.name).join(', ')||roomName(s.room)):U.tab==='people'?'People':U.tab==='notes'?'Your notes':'A room you\'re in';
 const all=N.all(); $('count').textContent=all.notes.length?all.notes.length+' note'+(all.notes.length===1?'':'s')+' · '+(n=>n+(n===1?' person':' people'))(N.people().filter(p=>!N.SELF.test(p.name)).length):'';
 const m=$('main');
 m.innerHTML=U.tab==='notes'?notesView():U.tab==='people'?peopleView():(s?sessionView(s):newView());
 wire();
}
/* ---------- the front: camera, mic and speech, as tiles, before you go looking ---------- */
const SPEECH='Speech goes through your browser (Chrome: Google, Safari: Apple)';
function front(s){
 if(!window.Kit) return '';
 const pre=s?'':'Starts a session. ';
 return Kit.html([
  {id:'tape',dev:'camera',label:'CAMERA',what:REC?'Stop the tape':'Tape the session',note:s?'Only you on the tape':'Starts a session'},
  {id:'memo',dev:'mic',label:'MIC',what:MEMO&&MEMOKEY==='new'?'Stop the memo':'Voice memo',note:s?'Stays on this phone':'Starts a session'},
  {id:'say',dev:'typewriter',label:'SAY IT',what:SR?'Stop':'Say a note',note:pre+SPEECH}
 ]);
}
function startSession(){ const s=N.addSession(DRAFT); U.cur=s.id; U.tab='session'; saveU(); DRAFT={who:[{name:'',role:'casting'}],room:'class',date:new Date().toISOString().slice(0,10),title:'',part:'',shelfId:'',file:''}; return s; }
const toSlot=()=>{ const t=document.querySelector('[data-text="new"]'); if(t) t.scrollIntoView({block:'center'}); };
const KITFN={
 tape:async()=>{ if(!U.cur){ startSession(); render(); } await tapeTap(); const b=$('tape'); if(b) b.scrollIntoView({block:'center'}); },
 memo:async()=>{ if(!U.cur){ startSession(); render(); } await memoTap('new'); toSlot(); },
 say:()=>{ if(!SR&&!sttOk()) return; if(!U.cur){ startSession(); render(); } sayTap('new'); toSlot(); }
};
function newView(){
 const d=DRAFT, ch=(k,v,l,cur)=>'<button class="chip sm'+(cur===v?' on':'')+'" data-d="'+k+'|'+v+'">'+esc(l)+'</button>';
 let h=front(null)+'<div class="card"><p class="kicker">New session</p><p class="dim small">A class or workshop on Zoom, a callback, a day on set. Who\'s in the room, and the sides if you have them. All of it optional.</p>'
  +'<p class="lab">What kind</p><div class="row">'+N.ROOMS.map(r=>ch('room',r[0],r[1],d.room)).join('')+'</div>'
  +'<p class="lab" style="margin-top:12px">Who\'s in the room</p>';
 d.who.forEach((w,i)=>{ h+='<div class="whorow"><input class="field" data-wn="'+i+'" placeholder="Name (the guest: casting, director, coach)" value="'+esc(w.name)+'" list="peoplelist"><div class="row">'+N.ROLES.slice(0,4).map(r=>'<button class="chip sm'+(w.role===r[0]?' on':'')+'" data-wr="'+i+'|'+r[0]+'">'+r[1]+'</button>').join('')+'</div></div>'; });
 h+='<datalist id="peoplelist">'+N.people().filter(p=>!N.SELF.test(p.name)).map(p=>'<option value="'+esc(p.name)+'">').join('')+'</datalist>'
  +'<button class="btn sm ghost" id="addwho">+ SOMEONE ELSE</button>'
  +'<p class="lab" style="margin-top:12px">Date</p><input class="field" type="date" id="dd" value="'+esc(d.date)+'">'
  +'<p class="lab" style="margin-top:12px">Scene or project, and your part</p><div class="row"><input class="field half" id="dt" placeholder="LOW TIDE" value="'+esc(d.title)+'"><input class="field half" id="dp" placeholder="ANNA" value="'+esc(d.part)+'"></div>'
  +'<p class="lab" style="margin-top:12px">Sides</p>'+(d.shelfId?'<p class="dim small">On the shelf: <b>'+esc(d.file)+'</b>. Actor OS and MEMORIZER have them too.</p>':'')
  +'<label class="btn block"><input type="file" id="sf" accept=".pdf,.docx,.txt,.fdx,.fountain" hidden>'+(d.shelfId?'OTHER SIDES':'ADD SIDES')+'</label>'
  +'<p class="faint small">Rehearse or don\'t. Nothing here asks you to.</p>'
  +'<button class="btn pri big block" id="start" style="margin-top:12px">START</button></div>';
 const recent=N.sessions().slice(0,8);
 if(recent.length) h+='<div class="card"><p class="kicker">Recent</p>'+recent.map(r=>'<button class="pc" data-open="'+r.id+'"><b>'+esc(r.who.map(w=>w.name).join(', ')||roomName(r.room))+'</b><small>'+esc(day(r.date))+' · '+esc(roomName(r.room))+(r.title?' · '+esc(r.title):'')+' · '+N.notesOf(r.id).length+' note'+(N.notesOf(r.id).length===1?'':'s')+'</small></button>').join('')+'</div>';
 return h;
}
function sessionView(s){
 const notes=N.notesOf(s.id), marks=(s.marks||[]), open=marks.filter(m=>!m.noted), tapes=s.tapes||[];
 let h=front(s)+'<p class="dim small">'+esc(day(s.date))+' · '+esc(roomName(s.room))+(s.title?' · '+esc(s.title):'')+(s.part?' · '+esc(s.part):'')+'</p>'
  +'<div class="row" style="margin:6px 0 12px">'+(sidesText(s)?'<button class="btn sm" id="sides">YOUR SIDES</button>':'')+'<button class="btn sm ghost" id="endses">DONE WITH THIS SESSION</button></div>';
 h+='<div class="card"><p class="kicker">Before you join</p><p class="dim small">30 seconds: how you\'re framed, the light on you, the mic moving.</p><button class="btn block" id="zcgo">ZOOM CHECK</button></div>';
 h+='<div class="card"><p class="kicker">In the room</p><p class="dim small"><b>TAPE IT</b> records you on this phone while you perform on Zoom. Headphones in, and only you are on the tape. Some rooms don\'t allow any recording: check first.</p>'
  +'<div class="row"><button class="recb big'+(REC?' on':'')+'" id="tape">'+(REC?'■ STOP':'● TAPE IT')+'</button>'+(REC?'<span class="rt" id="rt">0:00</span>':'')+'</div>'
  +'<button class="btn pri big block" id="mark" style="margin-top:12px">MARK<small> a note starts</small></button>'
  +'<p class="faint small">'+(marks.length?marks.length+' mark'+(marks.length===1?'':'s'):'No marks yet')+(tapes.length?' · '+tapes.length+' tape'+(tapes.length===1?'':'s')+' ('+mmss(tapes.reduce((a,t)=>a+(t.secs||0),0))+')':'')+'</p></div>';
 const who=s.who.map(w=>w.name);
 const giverSel=key=>'<select class="field sel" data-giver="'+key+'">'+who.concat(['Me']).map(n=>'<option>'+esc(n)+'</option>').join('')+'</select>';
 const slot=(key,mark,label)=>{ const sl=slots[key]||{}, rec=MEMOKEY===key;
  return '<div class="slot">'+(label?'<p class="lab">'+label+'</p>':'')+'<textarea class="field" data-text="'+key+'" placeholder="Their words, as close as you remember them">'+esc(sl.text||'')+'</textarea>'
   +'<div class="row">'+(who.length?giverSel(key):'')+'<button class="btn sm'+(rec?' rec':'')+'" data-memo="'+key+'">'+(rec?'■ STOP MEMO':'● VOICE MEMO')+'</button><button class="btn sm'+(SR?' rec':'')+'" data-say="'+key+'">'+(SR?'■ STOP':'SAY IT')+'</button>'+(sl.memoId?'<button class="btn sm ghost" data-pm="'+sl.memoId+'">▶ memo</button>':'')+'</div>'
   +'<button class="btn block" data-save="'+key+'"'+(mark?' data-mk="'+mark.id+'"':'')+'>KEEP THIS NOTE</button></div>'; };
 h+='<div class="card"><p class="kicker">Note it</p>';
 if(open.length) open.forEach((m,i)=>{ h+=slot('m'+m.id,m,'Mark '+(marks.indexOf(m)+1)+(m.takeId?' · '+mmss(m.at||0)+' on your tape <button class="lnk" data-play="'+m.takeId+'|'+(m.at||0)+'">▶ watch</button>':' · '+new Date(m.t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}))); });
 h+=slot('new',null,open.length?'Another note':'');
 h+='</div>';
 if(notes.length) h+='<div class="card"><p class="kicker">Kept from this session</p>'+notes.map(noteRow).join('')+'</div>';
 return h;
}
function noteRow(n){
 return '<div class="note"><p class="nt">'+(n.text?esc(n.text):'<i class="faint">voice memo</i>')+'</p><p class="nm">'+esc(n.giver||'')+(n.giver?' · ':'')+esc(day(n.date))+(n.title?' · '+esc(n.title):'')+'</p>'
  +'<div class="row">'+(n.takeId?'<button class="lnk" data-play="'+n.takeId+'|'+(n.at||0)+'">▶ the moment</button>':'')+(n.memoId?'<button class="lnk" data-pm="'+n.memoId+'">▶ memo</button>':'')+'<button class="lnk" data-ed="'+n.id+'">edit</button><button class="lnk faint" data-del="'+n.id+'">delete</button></div></div>';
}
function notesView(){
 const all=N.all().notes.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.t-a.t);
 if(!all.length) return '<div class="msg">No notes yet. Start a session on SESSION, and after the room, note what they told you.</div>';
 let h='<div class="row" style="margin-bottom:10px"><button class="chip sm'+(U.view==='all'?' on':'')+'" data-view="all">Newest first</button><button class="chip sm'+(U.view==='scene'?' on':'')+'" data-view="scene">By scene</button></div>';
 if(U.view==='scene'){ const by=N.byScene(); Object.keys(by).sort().forEach(k=>{ h+='<div class="card"><p class="kicker">'+esc(k)+'</p>'+by[k].sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(noteRow).join('')+'</div>'; }); }
 else h+='<div class="card">'+all.map(noteRow).join('')+'</div>';
 return h;
}
function peopleView(){
 const P=N.people().filter(p=>!N.SELF.test(p.name)), R=N.repeats(2);
 if(!P.length) return '<div class="msg">Nobody yet. The people in your sessions show up here with what each one told you.</div>';
 let h='';
 if(R.length) h+='<div class="card"><p class="kicker">More than one person told you</p><p class="faint small">Words and phrases in notes from different people. Plain matching on your own notes; nothing is guessed or scored.</p>'
  +R.slice(0,12).map(r=>'<details class="rep"><summary><b>"'+esc(N.spell(r.term))+'"</b> <span class="dim small">'+r.people+' people</span></summary>'+N.all().notes.filter(n=>r.notes.includes(n.id)).map(noteRow).join('')+'</details>').join('')+'</div>';
 h+='<div class="card"><p class="kicker">People</p>'+P.map(p=>{ const L=N.byPerson(p.name);
  return '<details class="rep"><summary><b>'+esc(p.name)+'</b> <span class="dim small">'+(p.role?roleName(p.role)+' · ':'')+p.sessions+' session'+(p.sessions===1?'':'s')+' · '+L.length+' note'+(L.length===1?'':'s')+' · last '+esc(day(p.last))+'</span></summary>'+(L.length?L.map(noteRow).join(''):'<p class="faint small">No notes from them yet.</p>')+'</details>'; }).join('')+'</div>';
 return h;
}
function wire(){
 const q=(s,f)=>document.querySelectorAll(s).forEach(f);
 q('[data-d]',b=>b.onclick=()=>{ const [k,v]=b.dataset.d.split('|'); DRAFT[k]=v; render(); });
 q('[data-wn]',i=>i.oninput=()=>{ DRAFT.who[+i.dataset.wn].name=i.value; });
 q('[data-wr]',b=>b.onclick=()=>{ const [i,r]=b.dataset.wr.split('|'); DRAFT.who[+i].role=r; render(); });
 const aw=$('addwho'); if(aw) aw.onclick=()=>{ DRAFT.who.push({name:'',role:'director'}); render(); };
 const dd=$('dd'); if(dd) dd.oninput=()=>{ DRAFT.date=dd.value; };
 const dt=$('dt'); if(dt) dt.oninput=()=>{ DRAFT.title=dt.value; };
 const dp=$('dp'); if(dp) dp.oninput=()=>{ DRAFT.part=dp.value; };
 const sf=$('sf'); if(sf) sf.onchange=async()=>{ const f=sf.files[0]; sf.value=''; if(!f) return; const it=await sidesFile(f); if(it){ DRAFT.shelfId=it.id; DRAFT.file=f.name; if(!DRAFT.title) DRAFT.title=String(f.name).replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' '); toast('Sides on the shelf. Actor OS and MEMORIZER have them.'); render(); } };
 const st=$('start'); if(st) st.onclick=()=>{ startSession(); render(); };
 if(window.Kit) Kit.wire($('main'),KITFN);
 q('[data-open]',b=>b.onclick=()=>{ U.cur=b.dataset.open; U.tab='session'; saveU(); render(); });
 const es=$('endses'); if(es) es.onclick=async()=>{ if(REC) await stopTape(); camOff(); U.cur=''; saveU(); render(); };
 const sd=$('sides'); if(sd) sd.onclick=showSides;
 const zg=$('zcgo'); if(zg) zg.onclick=zoomCheck;
 const tp=$('tape'); if(tp) tp.onclick=tapeTap;
 const mk=$('mark'); if(mk) mk.onclick=markTap;
 q('[data-text]',t=>t.oninput=()=>{ slots[t.dataset.text]=Object.assign(slots[t.dataset.text]||{},{text:t.value}); });
 q('[data-memo]',b=>b.onclick=()=>memoTap(b.dataset.memo));
 q('[data-say]',b=>b.onclick=()=>sayTap(b.dataset.say));
 q('[data-save]',b=>b.onclick=()=>{ const s=N.session(U.cur), m=b.dataset.mk?(s.marks||[]).find(x=>x.id===b.dataset.mk):null; saveSlot(b.dataset.save,m); });
 q('[data-play]',b=>b.onclick=()=>{ const [id,at]=b.dataset.play.split('|'); playAt(id,+at); });
 q('[data-pm]',b=>b.onclick=()=>playMemo(b.dataset.pm));
 q('[data-del]',b=>b.onclick=()=>{ if(confirm('Delete this note?')){ N.removeNote(b.dataset.del); render(); } });
 q('[data-ed]',b=>b.onclick=()=>{ const n=N.all().notes.find(x=>x.id===b.dataset.ed); if(!n) return; const t=prompt('The note',n.text); if(t===null) return; N.setNote(n.id,{text:t.trim()}); render(); });
 q('[data-view]',b=>b.onclick=()=>{ U.view=b.dataset.view; saveU(); render(); });
}
$('tabs').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(!b) return; if(U.tab==='session'&&b.dataset.t!=='session'&&!REC) camOff(); U.tab=b.dataset.t; saveU(); render(); window.scrollTo(0,0); });
window.addEventListener('pagehide',()=>{ C.stop(CAM); C.stop(memoStream); });
window.__notes={get U(){return U;},render};
render();
})();
