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
 DB.cur=id; save(); build(); resetDrill();
}
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
function shortFile(f){ return String(f||'').replace(/\.(pdf|txt|fountain)$/i,'').replace(/_/g,' '); }

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
 DB.tab=t; save(); stopListening();
 document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 render(); window.scrollTo(0,0);
}
document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.t));
function render(){
 paintTop();
 const t=DB.tab||'drill';
 if(t!=='sides'&&!SC){ renderSides(); return; }
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
  m.innerHTML=`<div class="card"><h2 style="font-size:20px">Nothing due right now.</h2>
   <p class="dim">${isFinite(nx)?'The next line comes back in '+E.inWords(Math.max(0,nx-Date.now()))+'.':''} Run the whole scene, or keep going anyway.</p>
   <div class="row"><button class="btn pri" onclick="MEM.tab('scene')">RUN THE SCENE</button><button class="btn" onclick="MEM.anyway()">KEEP GOING</button></div></div>`;
  return;
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
  h+=`<div class="heard ${LIS?'listening':''}" id="heard">${LIS?(D.heard?esc(D.heard):'Listening…'):(Rec?'':'Say it out loud, then check.')}</div>`;
  h+=D.typing?`<div class="typebox"><textarea class="field" id="typed" rows="3" placeholder="Type what you said"></textarea>
     <div class="row" style="margin-top:8px"><button class="btn" onclick="MEM.checkTyped()">CHECK</button></div></div>`
    :`<div style="margin-top:10px"><button class="btn ghost sm" onclick="MEM.typing()">Type it instead</button></div>`;
 } else {
  const c=D.heard?E.compare(target,D.heard):null;
  h+=`<div class="reveal"><div class="full">${c?diffHtml(target,c):esc(target)}</div>`;
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
 m.innerHTML=h;
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

/* ---------- listening (where the phone can) ---------- */
let LIS=null, lisT=null;
function stopListening(){ if(LIS){ try{ LIS.onend=null; LIS.stop(); }catch(e){} LIS=null; } clearTimeout(lisT); }
function listen(){
 if(LIS){ const r=LIS; LIS=null; try{ r.stop(); }catch(e){} return; }
 const it=current(); if(!it||!Rec) return;
 const target=D.beat!=null?E.beats(it.text)[D.beat]:it.text;
 let r;
 try{ r=new Rec(); }catch(e){ toast('This browser can’t listen. Say it, then show the line.'); return; }
 r.lang=navigator.language||'en-US'; r.interimResults=true; r.continuous=true;
 D.heard='';
 r.onresult=e=>{
  let s=''; for(let i=0;i<e.results.length;i++) s+=e.results[i][0].transcript+' ';
  D.heard=s.trim();
  const el=$('heard'); if(el) el.textContent=D.heard;
  clearTimeout(lisT);
  // enough words heard: stop a beat later. Otherwise stop after a long silence.
  lisT=setTimeout(()=>{ try{ r.stop(); }catch(_){} }, E.words(D.heard).length>=E.words(target).length?900:2600);
 };
 r.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed') toast('The microphone is blocked. Say it, then show the line.'); };
 r.onend=()=>{ LIS=null; clearTimeout(lisT); if(D.heard) reveal(); else renderDrill(); };
 try{ r.start(); LIS=r; }catch(e){ LIS=null; toast('Could not start listening.'); }
 renderDrill();
}

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
  return;
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
 const now=Date.now();
 let h=`<p class="dim" style="margin-top:0">${ITEMS.length} speech${ITEMS.length===1?'':'es'} for ${esc(SC.me)}${SC.range?' in the marked scene':''}. The action word is optional: one verb you play on that line, shown when you drill it.</p>`;
 ITEMS.forEach(it=>{
  const st=SC.states[it.key], s=E.status(st);
  const when=!st||!st.seen?'':(st.due<=now?'due now':'back in '+E.inWords(st.due-now));
  const v=SC.verbs[it.key]||'';
  const verbs=E.VERBS.concat((DB.myVerbs||[]).filter(x=>E.VERBS.indexOf(x)<0)).sort();
  h+=`<div class="li"><div class="h"><span>LINE ${it.n}${when?' · '+when:''}</span><span class="pill ${s}">${({work:'needs work',new:'not drilled',getting:'getting there',solid:'solid'})[s]}</span></div>
   <div class="t">${esc(it.text)}</div><div class="fl">${esc(E.letters(it.text))}</div>
   <select class="field" onchange="MEM.verb('${it.key}',this.value)"><option value="">action word</option>${verbs.map(x=>`<option ${x===v?'selected':''}>${esc(x)}</option>`).join('')}<option value="__own">+ your own word</option></select></div>`;
 });
 h+=`<div class="row" style="margin-top:18px"><button class="btn ghost sm" onclick="MEM.resetProgress()">Start this script over</button></div>`;
 $('main').innerHTML=h;
}
function setVerb(key,v){
 if(v==='__own'){ v=(prompt('Your action word (one verb you play)')||'').trim().toLowerCase(); if(!v){ renderLines(); return; } DB.myVerbs=DB.myVerbs||[]; if(DB.myVerbs.indexOf(v)<0) DB.myVerbs.push(v); }
 if(v) SC.verbs[key]=v; else delete SC.verbs[key];
 save(); renderLines();
}
function resetProgress(){ if(!confirm('Forget every mark on this script and start over?'))return; SC.states={}; save(); resetDrill(); render(); }

/* ================= SIDES ================= */
let PENDING=null, PDFMSG='';
function renderSides(){
 const ao=fromActorOS();
 const aoId=ao&&ao.me?scriptId(ao.text,ao.me,ao.range):'';
 let h='';
 if(ao&&ao.me&&aoId!==DB.cur){
  const n=E.items((function(){ let sc=S.script(S.parse(ao.text),ao.me); if(ao.range){ const a=ao.range[0],b=ao.range[1]>=0?ao.range[1]:sc.length-1; sc=sc.filter((x,i)=>i>=a&&i<=b);} return sc; })()).length;
  h+=`<div class="card from"><div class="kicker">FROM ACTOR OS</div><h2 style="font-size:20px">${esc(ao.me)} · ${esc(shortFile(ao.file))}</h2>
   <p class="dim" style="margin:4px 0 12px">${n} speech${n===1?'':'es'}${ao.range?' in '+esc(ao.scene||'the marked scene'):''}. The sides you're taping, ready to learn.</p>
   <button class="btn pri block big" onclick="MEM.takeAO()">START</button></div>`;
 } else if(ao&&!ao.me&&!SC){
  h+=`<div class="msg">Actor OS has sides (${esc(shortFile(ao.file))}) but no character picked. <button class="btn sm" onclick="MEM.takeAO()">USE THEM</button></div>`;
 }
 if(SH){
  const mine=new Set(Object.values(DB.scripts).map(x=>x.shelf).filter(Boolean));
  const others=SH.all().filter(x=>!mine.has(x.id));
  if(others.length){
   h+=`<h3 class="kicker">ON THE SHELF</h3><p class="faint" style="font-size:13px;margin:-4px 0 6px">Sides you brought into any ACT tool on this phone.</p>`;
   others.forEach(x=>{ h+=`<div class="scriptrow"><div><b>${esc(SH.label(x))}</b><small>from ${esc(x.from||'another tool')}</small></div><button class="btn sm" onclick="MEM.fromShelf('${x.id}')">OPEN</button></div>`; });
   h+='<div style="height:14px"></div>';
  }
 }
 if(PENDING){
  const sp=S.speakers(S.parse(PENDING.text));
  h+=`<div class="card"><div class="kicker">${esc(shortFile(PENDING.file))}</div><h2 style="font-size:20px">Which character are you?</h2>
   <div class="row" style="margin-top:12px">${sp.map((x,i)=>`<button class="chip" onclick="MEM.pickMe(${i})">${esc(x.name)} <i>${x.lines}</i></button>`).join('')}</div></div>`;
 }
 if(PDFMSG) h+=`<div class="msg bad">${PDFMSG}</div>`;
 h+=`<div class="drop" id="drop"><b>DROP YOUR SIDES</b><span class="dim">PDF or text. Or tap to choose.</span></div>
  <details ${SC||ao?'':'open'}><summary class="dim" style="cursor:pointer;min-height:var(--tap);display:flex;align-items:center">Paste them instead</summary>
   <textarea class="field" id="paste" placeholder="CYRUS&#10;You picked the wrong road.&#10;&#10;BRIN&#10;I don't have any."></textarea>
   <div class="row" style="margin-top:8px"><button class="btn" onclick="MEM.paste()">READ IT</button></div></details>`;
 const list=Object.values(DB.scripts).sort((a,b)=>b.added-a.added);
 if(list.length){
  h+=`<h3 class="kicker" style="margin-top:22px">YOUR SCRIPTS</h3>`;
  list.forEach(s=>{
   const items=(function(){ try{ let sc=S.script(S.parse(s.text),s.me); if(s.range){ const a=s.range[0],b=s.range[1]>=0?s.range[1]:sc.length-1; sc=sc.filter((x,i)=>i>=a&&i<=b);} return E.items(sc);}catch(e){return [];} })();
   const c=E.count(items,s.states||{});
   h+=`<div class="scriptrow"><div><b>${esc(s.me)} · ${esc(shortFile(s.file))}</b><small>${esc(E.countLine(c))}</small></div>
    <div class="row" style="flex-wrap:nowrap">${s.id===DB.cur?'<span class="pill solid">OPEN</span>':`<button class="btn sm" onclick="MEM.open('${s.id}')">OPEN</button>`}
    <button class="btn sm ghost" aria-label="remove" onclick="MEM.remove('${s.id}')">&times;</button></div></div>`;
  });
 }
 $('main').innerHTML=h;
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
function openScript(id){ DB.cur=id; save(); build(); resetDrill(); R.on=false; if(SH&&SC&&SC.shelf) SH.use(SC.shelf,'memorizer'); tab('drill'); }
function fromShelf(id){
 const x=SH&&SH.get(id); if(!x) return;
 SH.use(id,'memorizer');
 const speakers=S.speakers(S.parse(x.text)).map(n=>n.name);
 if(x.me&&speakers.indexOf(x.me)>=0){ addScript({text:x.text,file:x.file,me:x.me,range:x.range,from:x.from,shelf:x.id}); R.on=false; tab('drill'); return; }
 PENDING={text:x.text,file:x.file,shelf:x.id}; renderSides(); window.scrollTo(0,0);
}
function removeScript(id){
 if(!confirm('Remove this script and its marks from this phone?')) return;
 delete DB.scripts[id]; if(DB.cur===id){ DB.cur=Object.keys(DB.scripts)[0]||''; build(); resetDrill(); R.on=false; }
 save(); render();
}

/* ---------- boot ---------- */
window.MEM={tab:tab,level:setLevel,beat:setBeat,again:again,reveal:reveal,typing:typing,checkTyped:checkTyped,mark:mark,anyway:anyway,
 listen:listen,scene:sceneStart,sceneShow:sceneShow,sceneMark:sceneMark,sceneRetry:sceneRetry,verb:setVerb,resetProgress:resetProgress,
 pickMe:pickMe,takeAO:takeAO,paste:pasteIt,open:openScript,remove:removeScript,fromShelf:fromShelf,
 _db:()=>DB,_items:()=>ITEMS,_script:()=>SCRIPT,_state:()=>({D:D,R:R})};
build();
adoptShelf();
if(!SC&&!PENDING) DB.tab='sides';
tab(DB.tab||'drill');
})();
