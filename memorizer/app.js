/* MEMORIZER app. Say the line, check it, mark yourself. The ones you drop come back first.
   Sides are read by Actor OS's reader (../actor-os/sides.js, ../actor-os/pdf.js),
   so a page reads the same here as it does when you tape it. */
(function(){
const E=window.MemEngine, S=window.ActorSides;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const KEY='memorizer_v1';
const Rec=window.SpeechRecognition||window.webkitSpeechRecognition||null;

/* ---------- storage ---------- */
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&d.scripts) return d; }catch(e){} return {cur:'',scripts:{},level:'letters',tab:'drill'}; }
let DB=load();
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(DB)); }catch(e){ toast('This phone would not save. Your progress may not be kept.'); } }

/* ---------- the current script ---------- */
let SC=null, SCRIPT=[], ITEMS=[], BYAT={};
function build(){
 SC=DB.scripts[DB.cur]||null; SCRIPT=[]; ITEMS=[]; BYAT={};
 if(!SC) return;
 let sc=S.script(S.parse(SC.text),SC.me);
 if(SC.range){ const a=Math.max(0,SC.range[0]), b=SC.range[1]>=0?SC.range[1]:sc.length-1; sc=sc.filter((x,i)=>i>=a&&i<=b); }
 SCRIPT=sc; ITEMS=E.items(sc); ITEMS.forEach(it=>{ BYAT[it.at]=it; });
 SC.states=SC.states||{}; SC.verbs=SC.verbs||{};
}
/* one Memorizer script per sides + character; the marked scene can change without losing your marks */
function scriptId(text,me){ return E.hash(text)+'|'+me; }
function addScript(o){
 const id=scriptId(o.text,o.me);
 if(!DB.scripts[id]) DB.scripts[id]={id:id,file:o.file||'Pasted sides',text:o.text,me:o.me,range:o.range||null,from:o.from||'',shelf:o.shelf||'',states:{},verbs:{},added:Date.now()};
 else { DB.scripts[id].range=o.range||null; if(o.shelf) DB.scripts[id].shelf=o.shelf; }
 DB.cur=id; onShelf(id); save(); build(); resetDrill(); stopListening();
}
/* ON THE SHELF: what you're working on now. It goes on when you open it; DONE takes it off. */
function onShelf(id){ DB.working=(DB.working||[]).filter(x=>x!==id&&DB.scripts[x]); if(id&&DB.scripts[id]) DB.working.unshift(id); }
function offShelf(id){ DB.working=(DB.working||[]).filter(x=>x!==id); save(); render(); }
/* ---------- the sides shelf (../shared/shelf.js) ---------- */
const SH=window.Shelf||null;
function shelfPut(text,file,f){
 if(!SH) return '';
 const it=SH.put({text:text,file:file,fileSig:f?SH.sig(f):'',from:'MEMORIZER',tool:'memorizer'});
 if(it&&f) SH.putFile(it.id,f);
 return it?it.id:'';
}
/* Sides that arrived on the shelf since Memorizer last looked: open them. */
function adoptShelf(){
 try{ if(window.DailyScenes){ DailyScenes.cleanShelf(); const h=DailyScenes.takeHandoff('memorizer'); if(h){ addScript({text:h.text,file:h.file,me:h.me,from:'Practice scene'}); DB.tab='drill'; save(); setTimeout(()=>toast(h.scene.title+': a practice scene, you\'re '+h.me+'.'),300); return true; } } }catch(e){}
 if(!SH) return false;
 const p=SH.pending('memorizer'); if(!p) return false;
 SH.markSeen('memorizer',p.id);
 const speakers=S.speakers(S.parse(p.text)).map(x=>x.name);
 if(p.me&&speakers.indexOf(p.me)>=0){
  addScript({text:p.text,file:p.file,me:p.me,range:p.range,from:p.from,shelf:p.id});
  DB.tab='drill'; save();
  setTimeout(()=>toast('New sides: '+SH.label(p)+'.'),300);
  return true;
 }
 PENDING={text:p.text,file:p.file,shelf:p.id}; DB.tab='sides'; save();
 setTimeout(()=>toast('New sides: '+SH.label(p)+'. Pick your character.'),300);
 return true;
}
function shortFile(f){ return SH&&SH.title?SH.title(f):String(f||'').replace(/\.(pdf|txt|fountain)$/i,'').replace(/_/g,' '); }

/* ---------- Actor OS hand-over (same site, nothing typed) ---------- */
function fromActorOS(){
 if(SH&&SH.all().length) return null;   // the shelf has it; this is only for sides from before the shelf
 try{
  const last=JSON.parse(localStorage.getItem('actor_os_sides_last')||'null');
  if(!last||!last.text) return null;
  const r=JSON.parse(localStorage.getItem('actor_os_range_'+(last.file||'x'))||'null');
  const me=(r&&r.me)||'';
  let range=null, scene='';
  if(r&&r.sc&&r.sc.length){ const c=r.sc[r.cur||0]; if(c&&(c.start>=0||c.end>=0)){ range=[Math.max(0,c.start),c.end]; scene=c.name||''; } }
  const beats=S.parse(last.text);
  if(!S.speakers(beats).length) return null;
  return {file:last.file||'Sides from Actor OS',text:last.text,me:me,range:range,scene:scene,from:'Actor OS'};
 }catch(e){ return null; }
}

/* ---------- toast ---------- */
let tT=null;
function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tT); tT=setTimeout(()=>t.classList.remove('on'),2200); }

/* ---------- header ---------- */
function paintTop(){
 if(!SC){ $('title').textContent='Off book'; $('count').textContent='Bring in your sides to start.'; return; }
 $('title').textContent=SC.me+' · '+shortFile(SC.file);
 $('count').textContent=E.countLine(E.count(ITEMS,SC.states));
}

/* ---------- tabs ---------- */
function tab(t){
 if(RREC) recStop(); hush();
 DB.tab=t; save(); stopListening();
 document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 render(); window.scrollTo(0,0);
}
document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
/* ---------- the front: what the mic can do here, before you go looking (../shared/kit.js) ---------- */
/* ---------- the top: YOUR SCRIPTS, ON THE SHELF, BRING IN SIDES. A list only when you ask for it. ---------- */
let OPENP='';
const MIC_SVG='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" style="vertical-align:-3px;margin-right:6px"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M19 11a7 7 0 0 1-14 0M12 18v3"/></svg>';
const isPr=x=>x&&(x.from==='Practice scene'||(window.DailyScenes&&DailyScenes.isPractice(x.file)));
function myScripts(){ return Object.values(DB.scripts).filter(x=>!isPr(x)||x.id===DB.cur).sort((a,b)=>b.added-a.added); }
function working(){ return (DB.working||[]).map(id=>DB.scripts[id]).filter(x=>x&&!isPr(x)); }
/* sides your other ACT tools have that aren't in your scripts yet: not the same words or file, not a whole script, not a practice scene */
function fromTools(){ if(!SH) return []; const sc=Object.values(DB.scripts), mine=new Set(sc.map(x=>x.shelf).filter(Boolean)), words=new Set(sc.map(x=>SH.idFor(x.text))), files=new Set(sc.map(x=>shortFile(x.file).toLowerCase()));
 return SH.all().filter(x=>!mine.has(x.id)&&!words.has(SH.idFor(x.text))&&!files.has(shortFile(x.file).toLowerCase())&&SH.kindOf(x)!=='script'&&!(window.DailyScenes&&DailyScenes.isPractice(x.file))); }
function countOf(s){ try{ let sc=S.script(S.parse(s.text),s.me); if(s.range){ const a=s.range[0],b=s.range[1]>=0?s.range[1]:sc.length-1; sc=sc.filter((x,i)=>i>=a&&i<=b);} return E.countLine(E.count(E.items(sc),s.states||{})); }catch(e){ return ''; } }
function scriptRow(s,how){ const open=s.id===DB.cur, last=!SC&&s.id===DB.last;
 return `<div class="row" style="flex-wrap:nowrap;gap:6px"><button class="qrow${open||last?' cur':''}"${last?' id="pickup"':''} onclick="MEM.open('${s.id}')"><span><b>${esc(s.me)} · ${esc(shortFile(s.file))}</b><small>${last?'Where you left off · ':''}${esc(countOf(s))}</small></span><span class="go">${open?'OPEN NOW':last?'PICK UP':'OPEN'}</span></button>`
  +(how==='shelf'?`<button class="btn sm ghost" aria-label="Done: take ${esc(shortFile(s.file))} off the shelf" onclick="MEM.offShelf('${s.id}')">DONE</button>`:`<button class="btn sm ghost" aria-label="Remove ${esc(shortFile(s.file))}" onclick="MEM.remove('${s.id}')">&times;</button>`)+`</div>`; }
function topBar(){
 const mine=myScripts(), tools=fromTools(), wk=working(), bring=DB.tab==='sides';
 let h=`<div class="tops"><button type="button" class="tpill${OPENP==='s'?' on':''}" aria-expanded="${OPENP==='s'}" onclick="MEM.panel('s')">YOUR SCRIPTS <i>${mine.length+tools.length}</i></button>`
  +`<button type="button" class="tpill${OPENP==='h'?' on':''}" aria-expanded="${OPENP==='h'}" onclick="MEM.panel('h')">ON THE SHELF <i>${wk.length}</i></button>`
  +`<button type="button" class="tpill add${bring?' on':''}" onclick="MEM.bring()">+ BRING IN SIDES</button></div>`;
 if(OPENP==='s'){ h+=`<div class="panel"><p class="kicker">EVERY PROJECT YOU'VE BROUGHT IN</p>`;
  if(!mine.length&&!tools.length) h+=`<p class="dim" style="margin:0">Nothing yet. Tap + BRING IN SIDES.</p>`;
  h+=mine.map(x=>scriptRow(x,'all')).join('');
  if(tools.length) h+=`<p class="kicker" style="margin-top:10px">FROM YOUR OTHER ACT TOOLS</p>`+tools.map(x=>`<button class="qrow" onclick="MEM.fromShelf('${x.id}')"><span><b>${esc(SH.label(x))}</b><small>from ${esc(x.from==='home'?'the home page':x.from||'another tool')}</small></span><span class="go">OPEN</span></button>`).join('');
  h+='</div>'; }
 if(OPENP==='h'){ h+=`<div class="panel"><p class="kicker">WHAT YOU'RE WORKING ON NOW</p>`+(wk.length?wk.map(x=>scriptRow(x,'shelf')).join(''):`<p class="dim" style="margin:0">Nothing on the shelf. Open a script and it goes here; DONE takes it off.</p>`)+'</div>'; }
 return h;
}
function panel(k){ OPENP=OPENP===k?'':k; render(); }
function bring(){ OPENP=''; if(DB.tab==='sides'){ tab(SC?'drill':'drill'); return; } tab('sides'); }
/* nothing open: the example, so you see how it works */
let EXT=null;
function renderExample(){
 const m=$('main');
 m.innerHTML=topBar()+`<div class="work ex"><div class="exhead"><span class="kicker" style="color:var(--tung-text)">EXAMPLE · HOW IT WORKS</span><span class="dim" id="exw" style="font-size:13px"></span></div>
  <div class="cue"><div class="who">MARA</div><div class="t">I never left.</div></div>
  <div class="levels" aria-hidden="true">${E.LEVELS.map(l=>`<button tabindex="-1" data-exl="${l.id}">${l.label}</button>`).join('')}</div>
  <div class="line" id="exline" aria-live="off"></div><div class="heard live" id="exheard"></div>
  <div class="saybar"><button class="btn big pri" onclick="MEM.bring()">BRING IN YOUR SIDES</button><button class="btn big" onclick="MEM.panel('s')">YOUR SCRIPTS</button></div>
  <p class="faint" style="font-size:12.5px;margin:8px 0 0">The example plays when nothing is open. Bring in your sides and your lines take its place.</p></div>`;
 const steps=[['letters','Y C B.','','First letters: just enough to find it'],['letters','Y C B.','You came…','Say it out loud: your words go down as you speak'],['letters','Y C B.','You came back.','Gold where you have it word for word'],['whole','You came back.','You came back.','Show the line: check it'],['none','· · ·','','Got it? Next time: nothing at all']];
 let i=0; clearInterval(EXT);
 const paint=()=>{ const st=steps[i%steps.length], ln=$('exline'); if(!ln){ clearInterval(EXT); return; }
  ln.className='line'+(st[0]==='whole'?' whole':st[0]==='none'?' none':''); ln.textContent=st[1];
  $('exheard').innerHTML=st[2]?st[2].split(' ').map(w=>'<span class="hw ok">'+esc(w)+'</span>').join(''):'';
  $('exw').textContent=st[3]; document.querySelectorAll('[data-exl]').forEach(b=>b.classList.toggle('on',b.dataset.exl===st[0])); i++; };
 paint(); if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)) EXT=setInterval(paint,1900);
}
function tiles(){ return topBar(); }
function wireTiles(){ if(window.TapLang) TapLang.wire($('main')); }
/* the language you speak, for SAY IT: kept for every ACT tool */
const LANG=()=>window.TapLang?'<div style="margin:4px 0 0">'+TapLang.picker()+'</div>':'';
function render(){
 paintTop(); clearInterval(EXT);
 const t=DB.tab||'drill';
 document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 if(t!=='sides'&&!SC){ renderExample(); return; }
 ({drill:renderDrill,scene:renderScene,lines:renderLines,sides:renderSides})[t]();
}

/* ---------- level ---------- */
function levelRow(){
 return '<div class="levels">'+E.LEVELS.map(l=>`<button class="${DB.level===l.id?'on':''}" onclick="MEM.level('${l.id}')">${l.label}</button>`).join('')+'</div>';
}
function setLevel(id){ DB.level=id; save(); render(); }
function lineBox(text){
 const lv=DB.level||'letters';
 if(lv==='none') return '<div class="line none">· · ·</div>';
 return `<div class="line ${lv==='whole'?'whole':''}">${esc(E.show(text,lv))}</div>`;
}

/* ================= DRILL ================= */
const D={key:'',beat:null,revealed:false,heard:'',typing:false,anyway:false,round:0};
function resetDrill(){ D.key=''; D.beat=null; D.revealed=false; D.heard=''; D.typing=false; D.anyway=false; D.round=0; }
function pick(){
 const q=E.queue(ITEMS,SC.states);
 if(q.length){ D.anyway=false; return q.find(x=>x.key!==D.key)||q[0]; }
 if(D.anyway){
  const order={work:0,new:1,getting:2,solid:3};
  const all=ITEMS.slice().sort((a,b)=>order[E.status(SC.states[a.key])]-order[E.status(SC.states[b.key])]||((SC.states[a.key]||{}).streak||0)-((SC.states[b.key]||{}).streak||0)||a.n-b.n);
  return all.find(x=>x.key!==D.key)||all[0];
 }
 return null;
}
function current(){ return ITEMS.find(x=>x.key===D.key)||null; }
function renderDrill(){
 let it=current();
 if(!it){ it=pick(); if(it){ D.key=it.key; D.beat=null; D.revealed=false; D.heard=''; } }
 const m=$('main');
 if(!it){
  const nx=E.nextDue(ITEMS,SC.states);
  m.innerHTML=tiles()+`<div class="card"><h2 style="font-size:20px">Nothing due right now.</h2>
   <p class="dim">${isFinite(nx)?'The next line comes back in '+E.inWords(Math.max(0,nx-Date.now()))+'.':''} Run the whole scene, or keep going anyway.</p>
   <div class="row"><button class="btn pri" onclick="MEM.tab('scene')">RUN THE SCENE</button><button class="btn" onclick="MEM.anyway()">KEEP GOING</button></div></div>`;
  wireTiles(); return;
 }
 const beats=E.beats(it.text);
 const target=D.beat!=null?beats[D.beat]:it.text;
 const verb=SC.verbs[it.key];
 let h='';
 h+=it.cue?`<div class="cue"><div class="who">${esc(it.cue.who)}</div><div class="t">${esc(it.cue.text)}</div></div>`
          :`<div class="cue"><div class="t">You start the scene.</div></div>`;
 if(verb) h+=`<div class="play">play: ${esc(verb)}</div>`;
 h+=levelRow();
 if(!D.revealed) h+=lineBox(target);
 if(beats.length>1){
  h+=`<div class="beatrow"><span>BEATS</span>${beats.map((b,i)=>`<button class="chip ${D.beat===i?'on':''}" onclick="MEM.beat(${i})">${i+1}</button>`).join('')}<button class="chip ${D.beat==null?'on':''}" onclick="MEM.beat(-1)">whole</button></div>`;
 }
 if(!D.revealed){
  h+=`<div class="saybar">${Rec?`<button class="btn big ${LIS?'':'pri'}" id="sayBtn" onclick="MEM.listen()">${LIS?'STOP':'SAY IT'}</button>`:''}
   <button class="btn big ${Rec?'':'pri'}" onclick="MEM.reveal()" ${Rec?'':'style="grid-column:1/-1"'}>${Rec?'SHOW THE LINE':'SAID IT. SHOW THE LINE'}</button></div>`;
  h+=`<div class="heard ${LIS?'listening live':''}" id="heard" aria-live="polite">${LIS?(D.heard?liveWords(D.heard,target):'<span class="lis" aria-hidden="true"></span>Listening… say it.'):(Rec?'':'Say it out loud, then check.')}</div>`;
  h+=recBlock(it.key);
  if(Rec) h+=`<p class="faint" style="font-size:12px;margin:6px 0 0">SAY IT uses the browser's speech service: Chrome sends what you say to Google, Safari to Apple. SHOW THE LINE never listens.</p>`+LANG();
  h+=D.typing?`<div class="typebox"><textarea class="field" id="typed" rows="3" placeholder="Type what you said"></textarea>
     <div class="row" style="margin-top:8px"><button class="btn" onclick="MEM.checkTyped()">CHECK</button></div></div>`
    :`<div style="margin-top:10px"><button class="btn ghost sm" onclick="MEM.typing()">Type it instead</button></div>`;
 } else {
  const c=D.heard?E.compare(target,D.heard):null;
  h+=`<div class="reveal"><div class="full">${c?diffHtml(target,c):esc(target)}</div>`+recBlock(it.key);
  if(c) h+=`<div class="result">${esc(c.say)}${D.heard?` <span class="faint">Heard: “${esc(D.heard)}”</span>`:''}</div>`;
  if(D.beat!=null){
   const nx=D.beat+1<beats.length?D.beat+1:-1;
   h+=`<div class="row"><button class="btn pri" onclick="MEM.beat(${nx})">${nx>=0?'NEXT BEAT':'NOW THE WHOLE LINE'}</button><button class="btn" onclick="MEM.again()">AGAIN</button></div>`;
  } else {
   h+=`<div class="marks">
    <button class="btn got ${c&&c.exact?'hint':''}" onclick="MEM.mark('got')">GOT IT<small>word for word</small></button>
    <button class="btn" onclick="MEM.mark('close')">CLOSE<small>back in 8 min</small></button>
    <button class="btn miss" onclick="MEM.mark('miss')">MISSED<small>back in 2 min</small></button></div>`;
  }
  h+='</div>';
 }
 h+=`<p class="faint" style="font-size:13px;margin-top:16px">Line ${it.n} of ${ITEMS.length}${D.round?' · '+D.round+' done this sitting':''}</p>`;
 h+=`<p class="keys" aria-hidden="true">On a keyboard: <kbd>SPACE</kbd> shows the line · <kbd>1</kbd> got it · <kbd>2</kbd> close · <kbd>3</kbd> missed</p>`;
 m.innerHTML=tiles()+'<div class="work">'+h+'</div>'; wireTiles();
}
function diffHtml(target,c){
 // show the line as written, words marked from the comparison
 const words=String(target).split(/(\s+)/);
 const ops=c.ops.slice(); let out='', oi=0;
 const extras=[];
 words.forEach(tok=>{
  if(/^\s+$/.test(tok)||!tok){ out+=tok; return; }
  const ws=E.words(tok);
  if(!ws.length){ out+=esc(tok); return; }
  let cls='ok';
  ws.forEach(()=>{ while(oi<ops.length&&ops[oi].t==='extra'){ extras.push(ops[oi].w); oi++; }
   const o=ops[oi++]; if(o&&o.t==='miss') cls='miss'; });
  if(extras.length){ out+=`<span class="w extra">${esc(extras.join(' '))}</span> `; extras.length=0; }
  out+=`<span class="w ${cls}">${esc(tok)}</span>`;
 });
 while(oi<ops.length){ if(ops[oi].t==='extra') extras.push(ops[oi].w); oi++; }
 if(extras.length) out+=` <span class="w extra">${esc(extras.join(' '))}</span>`;
 return out;
}
function setBeat(i){ stopListening(); D.beat=i<0?null:i; D.revealed=false; D.heard=''; D.typing=false; renderDrill(); }
function again(){ D.revealed=false; D.heard=''; D.typing=false; renderDrill(); }
function reveal(){ stopListening(); D.revealed=true; renderDrill(); }
function typing(){ stopListening(); D.typing=true; renderDrill(); setTimeout(()=>{ const t=$('typed'); if(t)t.focus(); },50); }
function checkTyped(){ const t=$('typed'); D.heard=t?t.value.trim():''; D.revealed=true; D.typing=false; renderDrill(); }
function mark(m){
 const it=current(); if(!it) return;
 SC.states[it.key]=E.mark(SC.states[it.key],m);
 save(); D.round++;
 const st=SC.states[it.key];
 toast(m==='got'?('Got it. Back in '+E.inWords(st.due-Date.now())+'.'):m==='close'?'Close. Back in 8 minutes.':'Missed. Back in 2 minutes.');
 const nx=pick(); D.key=nx?nx.key:''; D.beat=null; D.revealed=false; D.heard=''; D.typing=false;
 paintTop(); renderDrill(); window.scrollTo(0,0);
}
function anyway(){ D.anyway=true; D.key=''; renderDrill(); }

/* your words as you say them: right where the line has that word, plain where it doesn't */
function liveWords(heard,target){
 const t=E.words(target||''), said=String(heard||'').split(/\s+/).filter(Boolean);
 let i=0; return '<span class="lis" aria-hidden="true"></span>'+said.map(w=>{ const k=E.words(w)[0]||''; const ok=k&&t[i]===k; if(k) i++; return '<span class="hw '+(ok?'ok':'off')+'">'+esc(w)+'</span>'; }).join('');
}
/* ---------- record yourself, hear it back: one recording a line, kept on this device ---------- */
const CAP=window.Capture, WV=window.Wave;
let MDBP=null;
function mdb(){ return MDBP||(MDBP=new Promise(res=>{ try{ const r=indexedDB.open('memorizer_media',1); r.onupgradeneeded=()=>r.result.createObjectStore('b'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } })); }
async function mput(id,blob){ const d=await mdb(); if(!d) return false; return new Promise(res=>{ const t=d.transaction('b','readwrite'); t.objectStore('b').put(blob,id); t.oncomplete=()=>res(true); t.onerror=()=>res(false); }); }
async function mget(id){ const d=await mdb(); if(!d) return null; return new Promise(res=>{ const q=d.transaction('b','readonly').objectStore('b').get(id); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }
async function mdel(id){ const d=await mdb(); if(!d||!id) return; return new Promise(res=>{ const t=d.transaction('b','readwrite'); t.objectStore('b').delete(id); t.oncomplete=()=>res(); t.onerror=()=>res(); }); }
let RMIC=null, RREC=null, RKEY='', RT0=0, RTICK=null, RPLAY=null, RALL=null;
const recOf=key=>SC&&SC.recs&&SC.recs[key]||null;
async function recYou(key){
 if(RREC&&RKEY===key) return recStop();
 if(RREC) await recStop();
 stopListening(); hush();
 if(!CAP){ toast('This browser can\'t record here.'); return; }
 try{ RMIC=await CAP.open({video:false,audio:true}); }catch(e){ toast(CAP.errorWords(e,'audio')); return; }
 RREC=CAP.record(RMIC,'audio'); RKEY=key; RT0=Date.now(); render();
 if(WV) WV.live.start(RMIC);
 RTICK=setInterval(()=>{ const v=((Date.now()-RT0)/1000).toFixed(1)+' s'; document.querySelectorAll('[data-rt2]').forEach(el=>{ el.textContent=v; }); },100);
}
async function recStop(){
 const r=RREC, key=RKEY; RREC=null; RKEY=''; clearInterval(RTICK); if(WV) WV.live.stop(); if(!r) return;
 const out=await r.stop(); try{ CAP.stop(RMIC); }catch(e){} RMIC=null;
 let wave=null, secs=out.secs;
 try{ const AC=window.AudioContext||window.webkitAudioContext, ac=new AC(), ab=await out.blob.arrayBuffer();
  const b=await new Promise((res,rej)=>{ const pr=ac.decodeAudioData(ab,res,rej); if(pr&&pr.then) pr.then(res,rej); });
  wave=WV?WV.peaks(b.getChannelData(0),56):null; secs=Math.round(b.duration*10)/10; try{ ac.close(); }catch(e){} }catch(e){}
 const id='r-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 if(!(await mput(id,out.blob))){ toast('This phone would not keep the recording.'); render(); return; }
 SC.recs=SC.recs||{}; const old=SC.recs[key]; if(old) mdel(old.id);
 SC.recs[key]={id,at:Date.now(),secs,wave}; save(); render(); toast('Kept. Tap HEAR YOURSELF.');
}
function hush(){ if(RPLAY){ try{ RPLAY.pause(); URL.revokeObjectURL(RPLAY.src); }catch(e){} RPLAY=null; } if(RALL){ RALL.stop=true; RALL=null; } document.querySelectorAll('.li.playing').forEach(e=>e.classList.remove('playing')); }
function playBlob(b){ return new Promise(res=>{ hush(); RPLAY=new Audio(URL.createObjectURL(b)); RPLAY.onended=()=>res(true); RPLAY.onerror=()=>res(false); RPLAY.play().catch(()=>res(false)); }); }
async function hear(key){ const r=recOf(key); if(!r) return; const b=await mget(r.id); if(!b){ toast('That recording is gone.'); return; } playBlob(b); }
/* every line you recorded, in order, a beat between: listen like a tape */
async function hearAll(){
 if(RALL){ hush(); renderLines(); return; }
 const L=ITEMS.filter(it=>recOf(it.key)); if(!L.length){ toast('Record a line first: RECORD YOURSELF on DRILL.'); return; }
 const run={stop:false}; RALL=run; renderLines();
 for(const it of L){ if(run.stop) break; const b=await mget(recOf(it.key).id); if(!b) continue;
  document.querySelectorAll('.li').forEach(e=>e.classList.toggle('playing',e.dataset.k===it.key)); const el=document.querySelector('.li[data-k="'+it.key+'"]'); if(el&&el.scrollIntoView) el.scrollIntoView({block:'center',behavior:'smooth'});
  RPLAY=new Audio(URL.createObjectURL(b)); await new Promise(res=>{ RPLAY.onended=res; RPLAY.onerror=res; RPLAY.play().catch(res); }); if(run.stop) break; await new Promise(r=>setTimeout(r,700)); }
 if(RALL===run) RALL=null; document.querySelectorAll('.li.playing').forEach(e=>e.classList.remove('playing')); renderLines();
}
function recBlock(key){
 const r=recOf(key), on=RKEY===key;
 return `<div class="recyou${on?' on':''}"><button class="btn ${on?'pri':''}" onclick="MEM.recYou('${key}')">${on?'■ STOP':'● RECORD YOURSELF'}</button>`
  +(on?`<canvas class="live" data-live role="img" aria-label="What the mic hears"></canvas><span class="rt2" data-rt2>0.0 s</span>`
   :r?`<button class="btn" onclick="MEM.hear('${key}')">▶ HEAR YOURSELF</button><span class="rw">${WV&&r.wave?WV.svg(r.wave,{cls:'sm',label:'Your recording of this line'}):''}</span><span class="faint" style="font-size:12px">${r.secs} s</span>`:'')
  +`</div>`;
}
/* ---------- listening (where the phone can) ---------- */
let LIS=null, lisT=null;
function stopListening(){ if(LIS){ try{ LIS.onend=null; LIS.stop(); }catch(e){} LIS=null; } clearTimeout(lisT); if(typeof SAY!=='undefined'&&SAY&&SAY.r){ const r=SAY.r; SAY.done=sayLines(); SAY.cur=[]; SAY.now=''; SAY.r=null; try{ r.onend=null; r.stop(); }catch(e){} } }
function listen(){
 if(LIS){ const r=LIS; LIS=null; try{ r.stop(); }catch(e){} return; }
 const it=current(); if(!it||!Rec) return;
 const target=D.beat!=null?E.beats(it.text)[D.beat]:it.text;
 let r;
 try{ r=new Rec(); }catch(e){ toast('This browser can’t listen. Say it, then show the line.'); return; }
 r.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US')); r.interimResults=true; r.continuous=true;
 D.heard='';
 r.onresult=e=>{
  let s=''; for(let i=0;i<e.results.length;i++) s+=e.results[i][0].transcript+' ';
  D.heard=s.trim();
  const el=$('heard'); if(el) el.innerHTML=liveWords(D.heard,target);
  clearTimeout(lisT);
  // enough words heard: stop a beat later. Otherwise stop after a long silence.
  lisT=setTimeout(()=>{ try{ r.stop(); }catch(_){} }, E.words(D.heard).length>=E.words(target).length?900:2600);
 };
 r.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed') toast('The microphone is blocked. Say it, then show the line.'); };
 r.onend=()=>{ LIS=null; clearTimeout(lisT); if(D.heard) reveal(); else renderDrill(); };
 try{ r.start(); LIS=r; }catch(e){ LIS=null; toast('Could not start listening.'); }
 renderDrill();
}

/* ---------- no sides yet: say your lines and they go down on the page as you speak ---------- */
let SAY=null;
function sayAll(){
 if(SAY&&SAY.r){ const r=SAY.r; SAY.r=null; try{ r.stop(); }catch(e){} return; }
 let r; try{ r=new Rec(); }catch(e){ toast('This browser can’t listen here.'); return; }
 r.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US')); r.interimResults=true; r.continuous=true;
 SAY={r,done:(SAY&&SAY.done)||[],now:''};
 r.onresult=e=>{ const fin=[]; let now=''; for(let i=0;i<e.results.length;i++){ const x=e.results[i]; if(x.isFinal) fin.push(x[0].transcript.trim()); else now+=x[0].transcript; }
  SAY.cur=fin; SAY.now=now.trim(); paintSay(); };
 r.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed') toast('The microphone is blocked.'); };
 r.onend=()=>{ if(SAY){ SAY.done=SAY.done.concat(SAY.cur||[]).concat(SAY.now?[SAY.now]:[]).filter(Boolean); SAY.cur=[]; SAY.now=''; SAY.r=null; } renderSides(); };
 try{ r.start(); }catch(e){ SAY.r=null; toast('Could not start listening.'); return; }
 renderSides();
}
function sayLines(){ return SAY?SAY.done.concat(SAY.cur||[]).concat(SAY.now?[SAY.now]:[]).filter(Boolean):[]; }
function paintSay(){ const el=$('sayall'); if(!el) return; const L=sayLines(); el.innerHTML=(SAY&&SAY.r?'<span class="lis" aria-hidden="true"></span>':'')+(L.length?L.map((x,i)=>'<span class="hw ok" style="display:block">'+esc(x)+'</span>').join(''):'Listening… say your lines.'); }
function sayBox(){
 if(!SAY) return '';
 const L=sayLines(), on=!!(SAY&&SAY.r);
 return `<div class="sayall"><div class="kicker">${on?'LISTENING':'WHAT YOU SAID'}</div><div class="heard live" id="sayall" aria-live="polite"></div>
  <div class="row" style="margin-top:10px"><button class="btn ${on?'':'pri'}" onclick="MEM.sayAll()">${on?'STOP':'SAY MORE'}</button>${L.length&&!on?'<button class="btn pri" onclick="MEM.sayKeep()">KEEP THEM AS MY LINES</button><button class="btn ghost" onclick="MEM.sayClear()">START OVER</button>':''}</div>
  <p class="faint" style="font-size:12px;margin:8px 0 0">Each pause starts a new line. Your words, as you said them. This uses the browser's speech service: Chrome sends what you say to Google, Safari to Apple.</p></div>`;
}
function sayKeep(){ const L=sayLines(); if(!L.length) return; const text=L.map(x=>'YOU\n'+x).join('\n\n')+'\n';
 const sid=shelfPut(text,'Said out loud',null); addScript({text,file:'Said out loud',me:'YOU',range:null,shelf:sid}); if(SH&&sid) SH.setMe(sid,'YOU','memorizer');
 SAY=null; toast('Your lines: '+ITEMS.length+'. Go.'); tab('drill'); }
function sayClear(){ if(SAY&&SAY.r) try{ SAY.r.onend=null; SAY.r.stop(); }catch(e){} SAY=null; renderSides(); }
/* ================= SCENE ================= */
const R={pos:-1,shown:false,done:{},dropped:[],on:false};
function sceneStart(from){
 R.on=true; R.shown=false;
 if(from==='top'){ R.done={}; R.dropped=[]; R.pos=nextMine(-1); }
 renderScene();
}
function nextMine(i){ for(let j=i+1;j<SCRIPT.length;j++) if(SCRIPT[j].mine) return j; return -1; }
function renderScene(){
 const m=$('main');
 if(!R.on){
  m.innerHTML=`<div class="card"><h2 style="font-size:20px">Run the scene</h2>
   <p class="dim">The other lines in full, in order. Yours hidden at the level you pick. Say each one, show it, and mark it. It stops where you drop.</p>
   ${levelRow()}<button class="btn pri block big" onclick="MEM.scene('top')">FROM THE TOP</button></div>`;
  m.innerHTML=tiles()+m.innerHTML; wireTiles(); return;
 }
 let h=levelRow();
 const end=R.pos<0?SCRIPT.length-1:R.pos;
 for(let i=0;i<=end;i++){
  const b=SCRIPT[i];
  if(!b.mine){ h+=`<div class="sl other"><span class="who">${esc(b.who)}</span>${esc(b.text)}</div>`; continue; }
  if(i<R.pos||R.pos<0){
   const dr=R.done[i]==='miss';
   h+=`<div class="sl mine ${dr?'dropped':''}"><span class="who">${esc(b.who)}${dr?' · DROPPED':''}</span>${esc(b.text)}</div>`;
  } else {
   const dropped=R.done[i]==='miss';
   h+=`<div class="sl mine now ${dropped?'dropped':''}" id="now"><span class="who">${esc(b.who)}${dropped?' · DROPPED':''}</span>`;
   if(!R.shown) h+=`<div class="hid">${DB.level==='none'?'· · ·':esc(E.show(b.text,DB.level))}</div>`;
   else h+=esc(b.text);
   h+='</div>';
  }
 }
 if(R.pos<0){
  const mine=SCRIPT.filter(b=>b.mine).length, dr=R.dropped.length;
  h+=`<div class="card" style="margin-top:12px"><h2 style="font-size:19px">${dr?'Through the scene. '+(mine-dr)+' of '+mine+' clean.':'Clean run. All '+mine+' lines.'}</h2>
   ${dr?`<p class="dim">Dropped: ${R.dropped.map(i=>'line '+BYAT[i].n).join(', ')}. They come back first in DRILL.</p>`:''}
   <div class="row"><button class="btn pri" onclick="MEM.scene('top')">AGAIN FROM THE TOP</button>${dr?`<button class="btn" onclick="MEM.tab('drill')">DRILL THOSE</button>`:''}</div></div>`;
 } else if(!R.shown){
  h+=`<button class="btn pri block big" style="margin-top:8px" onclick="MEM.sceneShow()">SAID IT. SHOW IT</button>`;
 } else if(R.done[R.pos]==='miss'){
  h+=`<div class="row" style="margin-top:8px"><button class="btn pri" onclick="MEM.sceneRetry()">GO AGAIN FROM HERE</button><button class="btn" onclick="MEM.scene('top')">FROM THE TOP</button></div>`;
 } else {
  h+=`<div class="marks" style="grid-template-columns:1fr 1fr;margin-top:8px">
   <button class="btn got" onclick="MEM.sceneMark('got')">GOT IT</button>
   <button class="btn miss" onclick="MEM.sceneMark('miss')">DROPPED IT</button></div>`;
 }
 if(R.pos>=0) h+=`<p class="keys" aria-hidden="true">On a keyboard: <kbd>SPACE</kbd> shows it · <kbd>1</kbd> got it · <kbd>2</kbd> dropped it</p>`;
 m.innerHTML=h;
 const n=$('now'); if(n&&n.scrollIntoView) n.scrollIntoView({block:'center'});
 else if(R.pos<0) window.scrollTo(0,document.body.scrollHeight);
}
function sceneShow(){ R.shown=true; renderScene(); }
function sceneMark(m){
 const it=BYAT[R.pos];
 // a line you dropped this run stays "needs work" even if the retry lands
 const retry=R.dropped.indexOf(R.pos)>=0;
 if(it&&!(retry&&m==='got')){ SC.states[it.key]=E.mark(SC.states[it.key],m); save(); paintTop(); }
 R.done[R.pos]=m;
 if(m==='miss'){ if(R.dropped.indexOf(R.pos)<0) R.dropped.push(R.pos); renderScene(); return; }
 R.pos=nextMine(R.pos); R.shown=false; renderScene();
}
function sceneRetry(){ delete R.done[R.pos]; R.shown=false; renderScene(); }

/* ================= LINES ================= */
function renderLines(){
 const now=Date.now(), nrec=ITEMS.filter(it=>recOf(it.key)).length;
 let h=(nrec?`<div class="row" style="margin:0 0 12px"><button class="btn ${RALL?'':'pri'}" onclick="MEM.hearAll()">${RALL?'■ STOP':'▶ HEAR ALL YOUR LINES'}</button><span class="faint" style="font-size:13px">${nrec} of ${ITEMS.length} recorded, in order</span></div>`:'')+`<p class="dim" style="margin-top:0">${ITEMS.length} speech${ITEMS.length===1?'':'es'} for ${esc(SC.me)}${SC.range?' in the marked scene':''}. The action word is optional: one verb you play on that line, shown when you drill it.</p>`;
 ITEMS.forEach(it=>{
  const st=SC.states[it.key], s=E.status(st);
  const when=!st||!st.seen?'':(st.due<=now?'due now':'back in '+E.inWords(st.due-now));
  const v=SC.verbs[it.key]||'';
  const verbs=E.VERBS.concat((DB.myVerbs||[]).filter(x=>E.VERBS.indexOf(x)<0)).sort();
  const rc=recOf(it.key);
  h+=`<div class="li" data-k="${it.key}"><div class="h"><span>LINE ${it.n}${when?' · '+when:''}</span><span class="pill ${s}">${({work:'needs work',new:'not drilled',getting:'getting there',solid:'solid'})[s]}</span></div>
   <div class="t">${esc(it.text)}</div><div class="fl">${esc(E.letters(it.text))}</div>${rc?`<div class="recyou"><button class="btn sm" onclick="MEM.hear('${it.key}')" aria-label="Hear yourself say line ${it.n}">▶</button><span class="rw">${WV&&rc.wave?WV.svg(rc.wave,{cls:'sm'}):''}</span><span class="faint" style="font-size:12px">${rc.secs} s</span></div>`:''}
   <select class="field" onchange="MEM.verb('${it.key}',this.value)"><option value="">action word</option>${verbs.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('')}<option value="__own">+ your own word</option></select></div>`;
 });
 h+=`<div class="row" style="margin-top:18px"><button class="btn ghost sm" onclick="MEM.resetProgress()">Start this script over</button></div>`;
 $('main').innerHTML=tiles()+h; wireTiles();
}
function setVerb(key,v){
 if(v==='__own'){ v=(prompt('Your action word (one verb you play)')||'').trim().toLowerCase(); if(!v){ renderLines(); return; } DB.myVerbs=DB.myVerbs||[]; if(DB.myVerbs.indexOf(v)<0) DB.myVerbs.push(v); }
 if(v) SC.verbs[key]=v; else delete SC.verbs[key];
 save(); renderLines();
}
function resetProgress(){ if(!confirm('Forget every mark on this script and start over? Your recordings stay.'))return; SC.states={}; save(); resetDrill(); render(); }

/* ================= SIDES ================= */
let PENDING=null, PDFMSG='', SHELFALL=false;
function renderSides(){
 const ao=fromActorOS();
 const aoId=ao&&ao.me?scriptId(ao.text,ao.me,ao.range):'';
 let h=`<div class="work"><p class="kicker">BRING IN YOUR SIDES</p>`+sayBox();
 const list=myScripts();
 if(ao&&ao.me&&aoId!==DB.cur&&!list.some(x=>x.id===aoId)){
  const n=E.items((function(){ let sc=S.script(S.parse(ao.text),ao.me); if(ao.range){ const a=ao.range[0],b=ao.range[1]>=0?ao.range[1]:sc.length-1; sc=sc.filter((x,i)=>i>=a&&i<=b);} return sc; })()).length;
  h+=`<div class="quick"><button class="qrow" onclick="MEM.takeAO()"><span><b>${esc(ao.me)} · ${esc(shortFile(ao.file))}</b><small>From Actor OS · ${n} speech${n===1?'':'es'}${ao.range?' in '+esc(ao.scene||'the marked scene'):''}</small></span><span class="go">START</span></button></div>`;
 } else if(ao&&!ao.me&&!SC){
  h+=`<div class="msg">Actor OS has sides (${esc(shortFile(ao.file))}) but no character picked. <button class="btn sm" onclick="MEM.takeAO()">USE THEM</button></div>`;
 }
 if(PENDING){
  const sp=S.speakers(S.parse(PENDING.text));
  h+=`<div class="card"><div class="kicker">${esc(shortFile(PENDING.file))}</div><h2 style="font-size:20px">Which character are you?</h2>
   <div class="row" style="margin-top:12px">${sp.map((x,i)=>`<button class="chip" onclick="MEM.pickMe(${i})">${esc(x.name)} <i>${x.lines}</i></button>`).join('')}</div></div>`;
 }
 if(PDFMSG) h+=`<div class="msg bad">${PDFMSG}</div>`;
 h+=`<div class="drop" id="drop"><b>DROP YOUR SIDES</b><span class="dim">PDF or text. Or tap to choose.</span></div>
  ${SAY||!Rec?'':`<div class="row" style="margin:10px 0 0"><button class="btn" id="sayfirst" onclick="MEM.sayAll()">${MIC_SVG}SAY THEM OUT LOUD</button><span class="faint" style="font-size:12.5px">No sides? Say your lines and watch them go down.</span></div>`+LANG()}
  <details ${SC||ao||Object.keys(DB.scripts).length?'':'open'}><summary class="dim" style="cursor:pointer;min-height:var(--tap);display:flex;align-items:center">Paste them instead</summary>
   <textarea class="field" id="paste" placeholder="CYRUS&#10;You picked the wrong road.&#10;&#10;BRIN&#10;I don't have any."></textarea>
   <div class="row" style="margin-top:8px"><button class="btn" onclick="MEM.paste()">READ IT</button></div></details>`;
 $('main').innerHTML=tiles()+h+'</div>'; wireTiles(); paintSay();
 const d=$('drop');
 d.onclick=()=>$('file').click();
 d.ondragover=e=>{ e.preventDefault(); d.classList.add('over'); };
 d.ondragleave=()=>d.classList.remove('over');
 d.ondrop=e=>{ e.preventDefault(); d.classList.remove('over'); const f=e.dataTransfer.files[0]; if(f) readFile(f); };
}
$('file').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(f) readFile(f); });
async function readFile(f){
 PDFMSG=''; PENDING=null;
 const isPDF=/\.pdf$/i.test(f.name)||f.type==='application/pdf';
 if(!isPDF){ const t=await f.text(); takeText(t,f.name,f); return; }
 $('main').insertAdjacentHTML('afterbegin','<div class="msg">Reading '+esc(f.name)+'…</div>');
 try{
  const ex=await window.ActorPDF.extract(await f.arrayBuffer());
  if(ex.encrypted&&!ex.chars){ PDFMSG='<b>That PDF is protected.</b> The text can’t be read out of it. Open it, select all, copy, and paste it below.'; renderSides(); return; }
  if(!ex.chars){ PDFMSG='<b>No text in that PDF.</b> It’s pictures of pages. Paste the lines below instead.'; renderSides(); return; }
  if(ex.printable!==undefined&&ex.printable<0.6){ PDFMSG='<b>The text came out unreadable.</b> Paste the lines below instead.'; renderSides(); return; }
  takeText(window.ActorPDF.toSides(ex.lines),f.name,f);
 }catch(err){ PDFMSG='<b>Could not read that PDF.</b> '+esc(err.message); renderSides(); }
}
function takeText(t,file,f){
 const beats=S.parse(t);
 if(!S.speakers(beats).length){ PDFMSG='<b>No character names found.</b> Names usually sit on their own line above the dialogue.'; PENDING=null; renderSides(); return; }
 const sid=shelfPut(t,file||'Pasted sides',f);
 // the same file was already on the shelf with another reading: use that one, so every tool reads the same
 const shelved=SH&&sid?SH.get(sid):null;
 PENDING={text:shelved?shelved.text:t,file:file||'Pasted sides',shelf:sid};
 if(shelved&&shelved.me&&S.speakers(S.parse(shelved.text)).some(x=>x.name===shelved.me)){ pickMe(shelved.me); return; }
 renderSides(); window.scrollTo(0,0);
}
function pickMe(i){
 if(!PENDING) return;
 const sp=S.speakers(S.parse(PENDING.text)); const name=typeof i==='number'?(sp[i]&&sp[i].name):i; if(!name) return;
 addScript({text:PENDING.text,file:PENDING.file,me:name,range:null,shelf:PENDING.shelf||''});
 if(SH&&PENDING.shelf) SH.setMe(PENDING.shelf,name,'memorizer');
 PENDING=null; toast(name+': '+ITEMS.length+' speech'+(ITEMS.length===1?'':'es')+'. Go.'); tab('drill');
}
function takeAO(){
 const ao=fromActorOS(); if(!ao) return;
 ao.shelf=shelfPut(ao.text,ao.file,null); if(SH&&ao.shelf&&ao.me) SH.setMe(ao.shelf,ao.me,'memorizer');
 if(!ao.me){ PENDING={text:ao.text,file:ao.file}; renderSides(); return; }
 addScript(ao); toast(ao.me+': '+ITEMS.length+' speech'+(ITEMS.length===1?'':'es')+'. Go.'); tab('drill');
}
function pasteIt(){ const t=($('paste')||{}).value||''; if(!t.trim()){ toast('Paste the sides first.'); return; } takeText(t,'Pasted sides'); }
function openScript(id){ DB.cur=id; onShelf(id); OPENP=''; save(); build(); resetDrill(); R.on=false; if(SH&&SC&&SC.shelf) SH.use(SC.shelf,'memorizer'); tab('drill'); }
function fromShelf(id){
 const x=SH&&SH.get(id); if(!x) return;
 SH.use(id,'memorizer');
 const speakers=S.speakers(S.parse(x.text)).map(n=>n.name);
 if(x.me&&speakers.indexOf(x.me)>=0){ addScript({text:x.text,file:x.file,me:x.me,range:x.range,from:x.from,shelf:x.id}); R.on=false; tab('drill'); return; }
 PENDING={text:x.text,file:x.file,shelf:x.id}; renderSides(); window.scrollTo(0,0);
}
function removeScript(id){
 if(!confirm('Remove this script, its marks and your recordings of it from this phone?')) return;
 try{ const x=DB.scripts[id]; if(x&&x.recs) Object.values(x.recs).forEach(r=>mdel(r.id)); }catch(e){}
 delete DB.scripts[id]; DB.working=(DB.working||[]).filter(x=>x!==id); if(DB.cur===id){ DB.cur=Object.keys(DB.scripts)[0]||''; build(); resetDrill(); R.on=false; }
 save(); render();
}

/* ---------- boot ---------- */
/* At a desk: keys for the buttons on screen (Col, Oct 26: "a user might want to study on a pc").
   SPACE or ENTER presses the next step; 1 2 3 mark it. Never while you're typing. */
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey) return; const t=e.target, tg=(t&&t.tagName)||'';
 if(/^(INPUT|TEXTAREA|SELECT)$/.test(tg)||(t&&t.isContentEditable)) return;
 const vis=sel=>[...document.querySelectorAll(sel)].find(b=>b.offsetParent!==null&&!b.disabled);
 let b=null;
 if(e.key===' '||e.key==='Enter'){ if(tg==='BUTTON'||tg==='A') return; b=vis('button[onclick="MEM.reveal()"]')||vis('button[onclick="MEM.sceneShow()"]')||vis('.reveal .row button.pri')||vis('button[onclick="MEM.sceneRetry()"]'); }
 else if(e.key==='1') b=vis(`button[onclick="MEM.mark('got')"]`)||vis(`button[onclick="MEM.sceneMark('got')"]`);
 else if(e.key==='2') b=vis(`button[onclick="MEM.mark('close')"]`)||vis(`button[onclick="MEM.sceneMark('miss')"]`);
 else if(e.key==='3') b=vis(`button[onclick="MEM.mark('miss')"]`);
 if(b){ e.preventDefault(); b.click(); }
});
window.MEM={tab:tab,level:setLevel,beat:setBeat,again:again,reveal:reveal,typing:typing,checkTyped:checkTyped,mark:mark,anyway:anyway,
 listen:listen,scene:sceneStart,sceneShow:sceneShow,sceneMark:sceneMark,sceneRetry:sceneRetry,verb:setVerb,resetProgress:resetProgress,
 pickMe:pickMe,takeAO:takeAO,panel:panel,bring:bring,offShelf:offShelf,recYou:recYou,hear:hear,hearAll:hearAll,shelfAll:()=>{ SHELFALL=true; renderSides(); },sayAll:sayAll,sayKeep:sayKeep,sayClear:sayClear,paste:pasteIt,open:openScript,remove:removeScript,fromShelf:fromShelf,
 _db:()=>DB,_items:()=>ITEMS,_script:()=>SCRIPT,_state:()=>({D:D,R:R})};
/* a practice scene is only for when you ask for it: opening Memorizer again goes back to your own sides */
try{ const c=DB.scripts&&DB.scripts[DB.cur]; if(c&&window.DailyScenes&&(c.from==='Practice scene'||DailyScenes.isPractice(c.file))){ const own=Object.keys(DB.scripts).filter(k=>{ const x=DB.scripts[k]; return x&&x.from!=='Practice scene'&&!DailyScenes.isPractice(x.file); }); DB.cur=own[own.length-1]||''; save(); } }catch(e){}
/* Memorizer opens blank. Sides open only when you ask: from another tool (?open=1, or ?sides=<id> for one set), a
   practice scene you sent, or a button here. Otherwise where you left off and what's on the shelf are offered. */
(function(){
 const q=new URLSearchParams(location.search), want=q.get('sides'), asked=q.has('open')||!!want;
 let handed=false; try{ if(window.DailyScenes){ DailyScenes.cleanShelf(); const h=DailyScenes.takeHandoff('memorizer'); if(h){ addScript({text:h.text,file:h.file,me:h.me,from:'Practice scene'}); DB.tab='drill'; save(); setTimeout(()=>toast(h.scene.title+': a practice scene, you\'re '+h.me+'.'),300); handed=true; } } }catch(e){}
 if(handed){ build(); tab('drill'); return; }
 if(asked){ if(!DB.cur&&DB.last&&DB.scripts[DB.last]){ DB.cur=DB.last; save(); } build(); if(want&&SH&&SH.get(want)){ SH.markSeen('memorizer',want); fromShelf(want); } else adoptShelf(); if(!SC&&!PENDING) DB.tab='sides'; tab(DB.tab||'drill'); return; }
 /* a practice scene you didn't open just now is never kept in your scripts */
 try{ if(window.DailyScenes){ let n=0; Object.keys(DB.scripts).forEach(k=>{ const x=DB.scripts[k]; if(x&&(x.from==='Practice scene'||DailyScenes.isPractice(x.file))){ delete DB.scripts[k]; if(DB.cur===k) DB.cur=''; if(DB.last===k) DB.last=''; n++; } }); if(n) save(); } }catch(e){}
 if(!DB.working){ DB.working=[DB.cur||DB.last].filter(x=>x&&DB.scripts[x]); }
 if(DB.cur){ DB.last=DB.cur; DB.cur=''; save(); }
 build(); tab('drill');
})();
})();
