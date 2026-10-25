/* SET LIST app. Everything stays on this phone: localStorage 'setlist_v1' (your material and sets),
   IndexedDB 'setlist_media' (your takes). Nothing uploaded. Uses ../shared/capture.js for the camera. */
(function(){
'use strict';
const L=window.SetList, C=window.Capture;
const KEY='setlist_v1';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const day=t=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

/* ---------- storage ---------- */
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.pieces)) return Object.assign({sets:[]},d); }catch(e){} return {pieces:[],sets:[]}; }
let DB=load();
let saveT=null, saveBad=false;
function save(now){ clearTimeout(saveT); const go=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(DB)); saveBad=false; }catch(e){ if(!saveBad) toast('This phone would not save. Your work may not be kept.'); saveBad=true; } }; if(now) go(); else saveT=setTimeout(go,250); }
function idb(){ return new Promise(res=>{ try{ const r=indexedDB.open('setlist_media',1); r.onupgradeneeded=()=>r.result.createObjectStore('takes'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); }
async function putTake(id,b){ const d=await idb(); if(!d) return false; return new Promise(res=>{ const x=d.transaction('takes','readwrite'); x.objectStore('takes').put(b,id); x.oncomplete=()=>res(true); x.onerror=()=>res(false); x.onabort=()=>res(false); }); }
async function getTake(id){ const d=await idb(); if(!d) return null; return new Promise(res=>{ const r=d.transaction('takes','readonly').objectStore('takes').get(id); r.onsuccess=()=>res(r.result||null); r.onerror=()=>res(null); }); }
async function delTake(id){ const d=await idb(); if(!d) return; return new Promise(res=>{ const x=d.transaction('takes','readwrite'); x.objectStore('takes').delete(id); x.oncomplete=()=>res(); x.onerror=()=>res(); }); }
const URLS={};
async function fillTakes(){ for(const v of document.querySelectorAll('[data-take]')){ const id=v.dataset.take; if(!URLS[id]){ const b=await getTake(id); if(b) URLS[id]=URL.createObjectURL(b); } if(URLS[id]) v.src=URLS[id]; else v.replaceWith(Object.assign(document.createElement('p'),{className:'faint',textContent:'That take is not on this phone any more.'})); } }

let tt; function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),2600); }
const byId=()=>{ const o={}; DB.pieces.forEach(p=>o[p.id]=p); return o; };
const piece=id=>DB.pieces.find(p=>p.id===id);
const nameOf=p=>p.title||L.firstWords(p.text,6)||'(nothing written yet)';
const levelName=id=>(L.LEVELS.find(x=>x.id===id)||{}).name||id;

/* ---------- views ---------- */
let TAB='material', OPEN=null, SET=null, FILTER='all', Q='', NIGHT=null, PROMPT=null;
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===TAB));
 const n=DB.pieces.length; $('count').textContent=n?n+' piece'+(n===1?'':'s')+' · '+DB.sets.length+' set'+(DB.sets.length===1?'':'s'):'';
 const m=$('main');
 if(TAB==='material') m.innerHTML=OPEN&&piece(OPEN)?vPiece(piece(OPEN)):vMaterial();
 else if(TAB==='sets') m.innerHTML=SET&&DB.sets.find(s=>s.id===SET)?vSet(DB.sets.find(s=>s.id===SET)):vSets();
 else m.innerHTML=vPrompts();
 fillTakes(); window.scrollTo(0,0);
}
function setsWith(id){ return DB.sets.filter(s=>(s.items||[]).includes(id)).length; }
function vMaterial(){
 const B=byId(), c={all:DB.pieces.length}; L.LEVELS.forEach(l=>c[l.id]=DB.pieces.filter(p=>p.level===l.id).length);
 let h='<section class="hero"><div class="banner"><img src="img/paperbag_wide.jpg" alt="A comic with a paper bag over his head, a mic in one hand, his notes in the other" width="1200" height="800"></div><div class="copy">'
  +'<div class="hk">SET LIST · 30 SECONDS · FUNNY FIRST</div><h1>Funny is funny.</h1><p class="tag">Nobody cares who you are. Be funny.</p>'
  +'<p class="say">Put on the bag and go. You get 30 seconds.</p>'
  +'<button class="btn pri go" data-a="vjoke">GO · 30 SECONDS<small>It asks for the camera first. Hard stop at :30. A new joke, kept with it.</small></button>'
  +'<div class="row alt"><button class="btn ghost sm" data-a="ajoke">Voice only, 30 seconds</button></div>'
  +'<div class="notes"><span>EVERYONE GETS A BAG</span><span>30 SECONDS</span></div></div></section>'
 +'<p class="dim" style="margin:0 0 12px;font-size:15px">Your funny material. A clip becomes a joke, jokes become a bit, bits become an act. Put any of it in a set.</p>';
 h+='<div class="row" style="margin-bottom:10px">'+[['all','ALL']].concat(L.LEVELS.map(l=>[l.id,l.name])).map(([id,nm])=>'<button class="chip'+(FILTER===id?' on':'')+'" data-a="filter" data-v="'+id+'">'+nm+' <i>'+c[id]+'</i></button>').join('')+'</div>';
 h+='<div class="row" style="margin-bottom:12px"><input class="field" id="q" placeholder="Find in your material" value="'+esc(Q)+'" style="flex:1 1 200px"><button class="btn pri" data-a="new">+ NEW '+(FILTER==='all'?'JOKE':levelName(FILTER))+'</button></div>';
 const q=Q.trim().toLowerCase();
 const list=DB.pieces.filter(p=>(FILTER==='all'||p.level===FILTER)&&(!q||(p.title+' '+p.text+' '+(p.tags||'')).toLowerCase().includes(q))).sort((a,b)=>(b.at||0)-(a.at||0));
 if(!list.length) h+='<div class="msg">'+(DB.pieces.length?'Nothing matches.':'Nothing here yet. Write a joke, or go to PROMPTS for a premise to swing at.')+'</div>';
 h+=list.map(p=>{ const t=L.time(p,B), how=L.howCounts(p), ns=setsWith(p.id);
  return '<button class="pc" data-a="open" data-id="'+p.id+'"><div class="row" style="justify-content:space-between"><b>'+esc(nameOf(p))+'</b><span class="pill">'+levelName(p.level)+'</span></div>'
   +'<div class="faint" style="font-size:13px;margin-top:4px">'+esc(L.timeWords(t))+(p.parts&&p.parts.length?' · '+p.parts.length+' part'+(p.parts.length===1?'':'s'):'')+(ns?' · in '+ns+' set'+(ns===1?'':'s'):'')+(how?' · '+esc(how):'')+'</div></button>'; }).join('');
 return h;
}
function vPiece(p){
 const B=byId(), t=L.time(p,B);
 let h='<button class="back" data-a="back">‹ Your material</button>';
 h+='<div class="card"><div class="row" style="gap:6px;margin-bottom:10px">'+L.LEVELS.map(l=>'<button class="chip'+(p.level===l.id?' on':'')+'" data-a="level" data-v="'+l.id+'">'+l.name+'</button>').join('')+'</div>'
  +'<p class="faint" style="font-size:13px;margin:-2px 0 10px">'+esc((L.LEVELS.find(l=>l.id===p.level)||{}).say||'')+'</p>'
  +'<label class="lab" for="f_title">Name it</label><input class="field" id="f_title" data-f="title" value="'+esc(p.title||'')+'" placeholder="Gas station sushi">'
  +'<label class="lab" for="f_text" style="margin-top:10px">'+(p.level==='bit'||p.level==='act'?'Your words around the parts (the way in, the segues)':'The words')+'</label><textarea class="field" id="f_text" data-f="text" placeholder="'+(p.level==='joke'?'Setup. Punch. Tags under it.':p.level==='clip'?'The thought, as it came.':'So I moved back home.')+'">'+esc(p.text||'')+'</textarea>'
  +'<label class="lab" for="f_chars" style="margin-top:10px">Characters in this bit <span class="faint">(they show in Characters)</span></label><input class="field" id="f_chars" data-f="chars" value="'+esc(p.chars||'')+'" placeholder="Uncle Ray, the ranch hand">'
  +'<label class="lab" for="f_tags" style="margin-top:10px">Tags (for finding it)</label><input class="field" id="f_tags" data-f="tags" value="'+esc(p.tags||'')+'" placeholder="family, ranch, crowd work">'
  +'<p class="faint" style="font-size:13px;margin:10px 0 0" id="ptime">'+esc(L.timeWords(t))+'</p></div>';
 if(p.level==='bit'||p.level==='act'){
  const can=DB.pieces.filter(q=>L.canHold(p,q)&&!(p.parts||[]).includes(q.id));
  h+='<div class="card"><p class="kicker">What it is made of, in order</p>'+((p.parts||[]).length?(p.parts||[]).map((id,i)=>{ const q=B[id];
    return '<div class="it"><span class="n">'+(i+1)+'</span><div class="w">'+(q?'<b>'+esc(nameOf(q))+'</b><small>'+levelName(q.level)+' · '+esc(L.timeWords(L.time(q,B)))+'</small>':'<b class="faint">(deleted)</b>')+'</div>'
     +'<button class="ib" data-a="pup" data-i="'+i+'" aria-label="Move up">↑</button><button class="ib" data-a="pdown" data-i="'+i+'" aria-label="Move down">↓</button><button class="ib" data-a="prm" data-i="'+i+'" aria-label="Take out">×</button></div>'; }).join(''):'<p class="faint" style="font-size:14px;margin:0 0 8px">Nothing in it yet.</p>')
   +(can.length?'<select class="field" id="padd" style="margin-top:8px"><option value="">+ Add a '+(p.level==='bit'?'clip or joke':'clip, joke or bit')+'</option>'+can.map(q=>'<option value="'+q.id+'">'+levelName(q.level)+': '+esc(nameOf(q).slice(0,50))+'</option>').join('')+'</select>':'<p class="faint" style="font-size:13px;margin:8px 0 0">Write some '+(p.level==='bit'?'jokes':'jokes or bits')+' first; they show up here to add.</p>')+'</div>';
 }
 h+='<div class="card"><p class="kicker">Your take</p>'+(p.repId
  ?''+(/^audio/.test(p.repType||'')?'<audio data-take="'+p.repId+'" controls preload="metadata" style="width:100%"></audio>':'<video data-take="'+p.repId+'" controls playsinline preload="metadata" class="vid"></video>')+'<p class="faint" style="font-size:13px;margin:6px 0 10px">'+L.mmss(p.repSecs)+' · '+esc(day(p.repAt||p.at))+'</p><div class="row"><button class="btn" data-a="rec">RECORD AGAIN</button><button class="btn ghost" data-a="savetake">SAVE TO PHONE</button><button class="btn ghost" data-a="rmtake">REMOVE</button></div>'
  :'<p class="dim" style="font-size:14px;margin:0 0 10px">Do it out loud. 30 seconds, hard stop. The take sets its real time.</p><div class="row"><button class="btn pri" data-a="rec">RECORD A 30-SECOND TAKE</button><button class="btn" data-a="arec">VOICE ONLY</button><label class="btn ghost"><input type="file" accept="video/*,audio/*" class="hide" id="tfile">ADD A CLIP</label></div>')+'</div>';
 if(DB.sets.length) h+='<div class="card"><p class="kicker">Put it in a set</p><select class="field" id="toset"><option value="">Pick a set</option>'+DB.sets.map(s=>'<option value="'+s.id+'">'+esc(s.name||'Untitled set')+((s.items||[]).includes(p.id)?' (in it)':'')+'</option>').join('')+'</select></div>';
 const done=(p.done||[]).slice().sort((a,b)=>b.at-a.at);
 if(done.length) h+='<div class="card"><p class="kicker">How it went</p><p style="margin:0 0 8px">'+esc(L.howCounts(p))+'</p>'+done.slice(0,12).map(d=>'<div class="faint" style="font-size:14px;padding:4px 0;border-top:1px solid var(--line)">'+esc(day(d.at))+' · '+esc((L.HOW.find(x=>x.id===d.how)||{}).name||d.how)+(d.note?' · '+esc(d.note):'')+'</div>').join('')+'</div>';
 h+='<button class="btn ghost bad block" data-a="del">Delete this '+levelName(p.level).toLowerCase()+'</button>';
 return h;
}
function vSets(){
 const B=byId();
 let h='<p class="dim" style="margin:0 0 12px;font-size:15px">A set is the order you\'ll do it in, and how long it runs. Open mic, a host spot, a showcase, a reel.</p>';
 h+='<button class="btn pri block" data-a="newset" style="margin-bottom:12px">+ NEW SET</button>';
 if(!DB.sets.length) h+='<div class="msg">No sets yet.</div>';
 h+=DB.sets.slice().sort((a,b)=>(b.at||0)-(a.at||0)).map(s=>'<button class="pc" data-a="openset" data-id="'+s.id+'"><div class="row" style="justify-content:space-between"><b>'+esc(s.name||'Untitled set')+'</b><span class="pill">'+(s.items||[]).length+' in it</span></div><div class="faint" style="font-size:13px;margin-top:4px">'+esc(L.setWords(s,B))+(s.nights&&s.nights.length?' · done '+s.nights.length+' time'+(s.nights.length===1?'':'s'):'')+'</div></button>').join('');
 return h;
}
function vSet(s){
 const B=byId(), items=s.items||[];
 let h='<button class="back" data-a="backset">‹ Your sets</button>';
 if(window.Kit) h+='<div class="slkit">'+Kit.html([{id:'aset',dev:'mic',label:'MIC',what:'Record the set',note:'Phone on the stool. Voice only, no time limit. Kept with this set'}])+'</div>';
 const recs=(s.recs||[]).slice().reverse();
 if(recs.length) h+='<div class="card"><p class="kicker">Recordings of this set</p>'+recs.map(r=>'<div style="padding:6px 0;border-top:1px solid var(--line)"><audio data-take="'+r.id+'" controls preload="metadata" style="width:100%"></audio><div class="row" style="justify-content:space-between"><span class="faint" style="font-size:13px">'+esc(day(r.at))+' · '+L.mmss(r.secs)+'</span><span><button class="btn sm ghost" data-a="savesetrec" data-id="'+r.id+'">SAVE TO PHONE</button> <button class="btn sm ghost" data-a="rmsetrec" data-id="'+r.id+'">REMOVE</button></span></div></div>').join('')+'</div>';
 h+='<div class="card"><label class="lab" for="s_name">Name</label><input class="field" id="s_name" data-s="name" value="'+esc(s.name||'')+'" placeholder="Open mic, Thursday">'
  +'<div class="row" style="margin-top:10px"><label class="lab" for="s_target" style="margin:0">Aim for</label><input class="field" id="s_target" value="'+(s.target?L.mmss(s.target):'')+'" placeholder="5:00" style="flex:0 1 100px" inputmode="numeric"></div>'
  +'<div class="runtime" id="srun">'+esc(L.setWords(s,B))+'</div></div>';
 if(NIGHT&&NIGHT.set===s.id){
  h+='<div class="card from"><p class="kicker">How it went</p><label class="lab" for="n_where">Where, when (optional)</label><input class="field" id="n_where" value="'+esc(NIGHT.where||'')+'" placeholder="The Comedy Barn, 9 pm">'
   +items.map((id,i)=>{ const p=B[id]; if(!p) return ''; return '<div class="it" style="flex-wrap:wrap"><span class="n">'+(i+1)+'</span><div class="w"><b>'+esc(nameOf(p))+'</b></div><div class="row" style="gap:4px;width:100%;margin:4px 0 0 32px">'+L.HOW.map(x=>'<button class="chip sm'+(NIGHT.marks[id]===x.id?' on':'')+'" data-a="mark" data-id="'+id+'" data-v="'+x.id+'">'+x.name+'</button>').join('')+'</div></div>'; }).join('')
   +'<div class="row" style="margin-top:12px"><button class="btn pri" data-a="savenight">KEEP IT</button><button class="btn ghost" data-a="cancelnight">NOT NOW</button></div><p class="faint" style="font-size:13px;margin:8px 0 0">Your word, nobody else\'s. Leave a piece unmarked if you don\'t know.</p></div>';
 }
 h+='<div class="card"><p class="kicker">In this order</p>'+(items.length?items.map((id,i)=>{ const p=B[id], twice=items.indexOf(id)!==i;
   return '<div class="it"><span class="n">'+(i+1)+'</span><div class="w">'+(p?'<b>'+esc(nameOf(p))+'</b><small>'+levelName(p.level)+' · '+esc(L.timeWords(L.time(p,B)))+(twice?' · already in this set':'')+'</small>':'<b class="faint">(deleted)</b>')+'</div>'
    +'<button class="ib" data-a="sup" data-i="'+i+'" aria-label="Move up">↑</button><button class="ib" data-a="sdown" data-i="'+i+'" aria-label="Move down">↓</button><button class="ib" data-a="srm" data-i="'+i+'" aria-label="Take out">×</button></div>'; }).join(''):'<p class="faint" style="font-size:14px;margin:0 0 8px">Nothing in it yet.</p>')
  +(DB.pieces.length?'<select class="field" id="sadd" style="margin-top:8px"><option value="">+ Add from your material</option>'+L.LEVELS.map(l=>{ const g=DB.pieces.filter(p=>p.level===l.id); return g.length?'<optgroup label="'+l.name+'">'+g.map(p=>'<option value="'+p.id+'">'+esc(nameOf(p).slice(0,50))+' ('+esc(L.timeWords(L.time(p,B)))+')</option>').join('')+'</optgroup>':''; }).join('')+'</select>':'<p class="faint" style="font-size:13px;margin:8px 0 0">Write some material first.</p>')+'</div>';
 h+='<div class="row" style="margin-bottom:12px"><button class="btn pri" data-a="stage"'+(items.length?'':' disabled')+'>STAGE LIST</button><button class="btn" data-a="night"'+(items.length?'':' disabled')+'>HOW IT WENT</button><button class="btn ghost" data-a="copyset"'+(items.length?'':' disabled')+'>COPY THE SET</button><button class="btn ghost" data-a="txtset"'+(items.length?'':' disabled')+'>SAVE AS TEXT</button></div>';
 if(s.nights&&s.nights.length) h+='<div class="card"><p class="kicker">Done</p>'+s.nights.slice().reverse().map(n=>'<div class="faint" style="font-size:14px;padding:4px 0">'+esc(day(n.at))+(n.where?' · '+esc(n.where):'')+' · '+L.HOW.map(x=>{ const c=Object.values(n.marks||{}).filter(v=>v===x.id).length; return c?x.name+' '+c:''; }).filter(Boolean).join(', ')+'</div>').join('')+'</div>';
 h+='<button class="btn ghost bad block" data-a="delset">Delete this set</button><p class="faint" style="font-size:13px;margin:8px 0 0">Deleting a set keeps the material.</p>';
 return h;
}
const PK=[['premise','Daily premise','One fire. One room. One target.',L.PREMISES],['cues','Test your chops','Take these and make something.',L.CUES],['caption','Caption this','Say what\'s going on.',L.CAPTIONS],['question','Ask / answer','Answer it funny.',L.QUESTIONS]];
function pick(arr,not){ if(arr.length<2) return arr[0]; let x; do{ x=arr[Math.floor(Math.random()*arr.length)]; }while(JSON.stringify(x)===JSON.stringify(not)); return x; }
function vPrompts(){
 PROMPT=PROMPT||{}; PK.forEach(([k,,,arr])=>{ if(PROMPT[k]==null) PROMPT[k]=pick(arr); });
 return '<p class="dim" style="margin:0 0 12px;font-size:15px">Something to swing at. WRITE ONE starts a joke with it; record a 30-second take from there.</p>'
  +PK.map(([k,nm,say])=>{ const v=PROMPT[k];
   return '<div class="card"><div class="row" style="justify-content:space-between"><p class="kicker" style="margin:0">'+nm+'</p><button class="btn sm ghost" data-a="pnew" data-v="'+k+'">NEW</button></div><p class="faint" style="font-size:13px;margin:4px 0 8px">'+esc(say)+'</p>'
    +(Array.isArray(v)?'<ul class="cues">'+v.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="prompt">'+esc(v)+'</p>')+'<button class="btn pri" data-a="puse" data-v="'+k+'">WRITE ONE</button></div>'; }).join('');
}

/* ---------- the take: 30 seconds, hard stop. Or voice only. Or a whole set, voice only, no limit ---------- */
let R=null, LASTREC=null;   // R: {stream, rec, t0, timer, tick, kind, cap, set}
async function openRec(o){
 o=o||{kind:'video',cap:30}; LASTREC=o;
 const p=o.set?null:piece(OPEN), st=o.set?DB.sets.find(x=>x.id===o.set):null; if(!p&&!st) return;
 const audio=o.kind==='audio', ov=$('recov'); ov.hidden=false; document.body.classList.add('ovopen');
 ov.innerHTML='<div class="recbox">'+(audio?'<div class="aud" id="raud">MIC</div>':'<video id="rv" playsinline muted autoplay class="vid"></video>')+'<div class="cnt" id="rc">'+(o.cap?L.mmss(o.cap):'0:00')+'</div><p class="faint" id="rm" style="font-size:14px;margin:8px 0">'+esc(st?(st.name||'This set')+'. Voice only. No time limit.':nameOf(p)+(audio?'. Voice only.':''))+'</p><div class="row" id="rbar"><button class="btn pri" data-a="rgo">GO</button><button class="btn ghost" data-a="rclose">CLOSE</button></div></div>';
 R={kind:o.kind,cap:o.cap||0,set:o.set||null};
 try{ R.stream=await C.open(audio?{video:false,audio:true}:{video:true,audio:true,facing:'user'}); if(!audio){ const v=$('rv'); v.srcObject=R.stream; v.classList.add('mirror'); v.play().catch(()=>{}); } }
 catch(e){ $('rm').textContent=C.errorWords(e,audio?'audio':'video'); }
}
function rgo(){
 if(!R||!R.stream||R.rec) return;
 try{ R.rec=C.record(R.stream,R.kind); }catch(e){ $('rm').textContent=e.message; return; }
 R.t0=Date.now(); $('rbar').innerHTML='<button class="btn pri" data-a="rstop">STOP</button>';
 const show=()=>{ if(R&&R.rec){ const el=(Date.now()-R.t0)/1000; $('rc').textContent=R.cap?L.mmss(Math.ceil(Math.max(0,R.cap-el))):L.mmss(Math.floor(el)); } };
 R.tick=setInterval(show,250); show();
 if(R.cap){ const me=R.rec; R.timer=setTimeout(()=>{ if(R&&R.rec===me){ R.capped=true; rstop(); } },R.cap*1000); }
}
async function rstop(){
 if(!R||!R.rec) return; clearTimeout(R.timer); clearInterval(R.tick);
 const r=await R.rec.stop(); R.rec=null; C.stop(R.stream); R.stream=null; R.result=r;
 const u=URL.createObjectURL(r.blob); R.url=u;
 if(R.kind==='audio'){ $('raud').outerHTML='<audio id="rv" controls src="'+u+'" style="width:100%"></audio>'; }
 else { $('rv').srcObject=null; $('rv').src=u; $('rv').muted=false; $('rv').controls=true; $('rv').classList.remove('mirror'); }
 $('rc').textContent=(R.capped?'Stopped at :30 · ':'')+L.mmss(r.secs);
 $('rbar').innerHTML='<button class="btn pri" data-a="rkeep">KEEP</button><button class="btn" data-a="ragain">AGAIN</button><button class="btn ghost" data-a="rclose">CLOSE</button>';
}
async function keepSetRec(sid,blob,secs){
 const st=DB.sets.find(x=>x.id===sid); if(!st) return false;
 const id=rid('k'), ok=await putTake(id,blob);
 if(!ok){ toast('This phone would not keep the recording. Save it to the phone instead.'); return false; }
 st.recs=st.recs||[]; st.recs.push({id,secs:Math.round(secs*10)/10,at:Date.now(),type:blob.type||''}); save(true); return true;
}
async function saveBlob(b,name){ const f=new File([b],name,{type:b.type});
 try{ if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:f.name}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
 const x=document.createElement('a'); x.href=URL.createObjectURL(f); x.download=f.name; document.body.appendChild(x); x.click(); x.remove(); }
async function keepTake(blob,secs){
 const p=piece(OPEN); if(!p) return;
 const id=rid('k'), ok=await putTake(id,blob);
 if(!ok){ toast('This phone would not keep the take. Save it to the phone instead.'); return false; }
 if(p.repId){ delTake(p.repId); delete URLS[p.repId]; }
 p.repId=id; p.repSecs=Math.round(secs*10)/10; p.repAt=Date.now(); p.repType=blob.type||''; save(true); return true;
}
function rclose(){ if(!R) return; clearTimeout(R.timer); clearInterval(R.tick); try{ R.rec&&R.rec.cancel(); }catch(e){} C.stop(R.stream); if(R.url) URL.revokeObjectURL(R.url); R=null; const o=$('recov'); o.hidden=true; o.innerHTML=''; document.body.classList.remove('ovopen'); }
function clipLength(f){ return new Promise(res=>{ const v=document.createElement('video'); v.preload='metadata'; v.onloadedmetadata=()=>{ const go=()=>{ res(isFinite(v.duration)?v.duration:0); URL.revokeObjectURL(v.src); }; if(v.duration===Infinity){ v.currentTime=1e9; v.ontimeupdate=()=>{ v.ontimeupdate=null; go(); }; } else go(); }; v.onerror=()=>res(0); v.src=URL.createObjectURL(f); }); }

/* ---------- actions ---------- */
function newPiece(level,title,text){ const p={id:rid('p'),level:level||'joke',title:title||'',text:text||'',tags:'',parts:[],done:[],at:Date.now()}; DB.pieces.push(p); save(true); TAB='material'; OPEN=p.id; render(); const f=$(title?'f_text':'f_title'); if(f) f.focus(); return p; }
async function act(a,ds){
 const p=OPEN&&piece(OPEN), s=SET&&DB.sets.find(x=>x.id===SET);
 switch(a){
  case 'tab': TAB=ds.t; OPEN=null; SET=null; NIGHT=null; render(); break;
  case 'filter': FILTER=ds.v; render(); break;
  case 'new': newPiece(FILTER==='all'?'joke':FILTER); break;
  case 'open': OPEN=ds.id; render(); break;
  case 'back': OPEN=null; render(); break;
  case 'level': if(p){ p.level=ds.v; p.parts=(p.parts||[]).filter(id=>{ const q=piece(id); return !q||L.canHold(p,q); }); save(); render(); } break;
  case 'pup': case 'pdown': if(p){ p.parts=L.move(p.parts,+ds.i,a==='pup'?-1:1); save(); render(); } break;
  case 'prm': if(p){ p.parts.splice(+ds.i,1); save(); render(); } break;
  case 'del': if(p&&confirm('Delete "'+nameOf(p)+'"? It comes out of every bit, act and set it is in.')){ if(p.repId) delTake(p.repId); DB.pieces=DB.pieces.filter(x=>x.id!==p.id); DB.pieces.forEach(q=>{ if(q.parts) q.parts=q.parts.filter(id=>id!==p.id); }); DB.sets.forEach(x=>x.items=(x.items||[]).filter(id=>id!==p.id)); OPEN=null; save(true); render(); } break;
  case 'rec': await openRec({kind:'video',cap:30}); break;
  case 'arec': await openRec({kind:'audio',cap:30}); break;
  case 'vjoke': newPiece('joke'); await openRec({kind:'video',cap:30}); break;
  case 'ajoke': newPiece('joke'); await openRec({kind:'audio',cap:30}); break;
  case 'aset': if(s) await openRec({kind:'audio',cap:0,set:s.id}); break;
  case 'savesetrec': { const b=await getTake(ds.id); if(b) await saveBlob(b,C.fileName({name:'',role:(s&&s.name)||'set',ext:C.ext(b.type)})); break; }
  case 'rmsetrec': if(s&&confirm('Remove this recording?')){ delTake(ds.id); delete URLS[ds.id]; s.recs=(s.recs||[]).filter(r=>r.id!==ds.id); save(true); render(); } break;
  case 'rgo': rgo(); break;
  case 'rstop': await rstop(); break;
  case 'ragain': { const o=LASTREC; if(R&&R.url) URL.revokeObjectURL(R.url); rclose(); await openRec(o); break; }
  case 'rkeep': { const r=R&&R.result, sid=R&&R.set; if(r&&(sid?await keepSetRec(sid,r.blob,r.secs):await keepTake(r.blob,r.secs))){ rclose(); render(); toast((sid?'Recording kept: ':'Take kept: ')+L.mmss(r.secs)+'.'); } break; }
  case 'rclose': rclose(); break;
  case 'rmtake': if(p&&p.repId&&confirm('Remove this take?')){ delTake(p.repId); delete URLS[p.repId]; delete p.repId; delete p.repSecs; delete p.repAt; save(true); render(); } break;
  case 'savetake': if(p&&p.repId){ const b=await getTake(p.repId); if(!b) return; await saveBlob(b,C.fileName({name:'',role:nameOf(p),ext:C.ext(b.type)})); } break;
  case 'newset': { const x={id:rid('s'),name:'',target:300,items:[],nights:[],at:Date.now()}; DB.sets.push(x); save(true); SET=x.id; render(); const f=$('s_name'); if(f) f.focus(); break; }
  case 'openset': SET=ds.id; NIGHT=null; render(); break;
  case 'backset': SET=null; NIGHT=null; render(); break;
  case 'sup': case 'sdown': if(s){ s.items=L.move(s.items,+ds.i,a==='sup'?-1:1); save(); render(); } break;
  case 'srm': if(s){ s.items.splice(+ds.i,1); save(); render(); } break;
  case 'delset': if(s&&confirm('Delete this set? Your material stays.')){ DB.sets=DB.sets.filter(x=>x.id!==s.id); SET=null; save(true); render(); } break;
  case 'stage': if(s){ const o=$('stageov'); o.hidden=false; document.body.classList.add('ovopen'); o.innerHTML='<pre class="stagetext">'+esc(L.stageText(s,byId()))+'</pre><button class="btn block" data-a="stageclose">CLOSE</button>'; } break;
  case 'stageclose': { const o=$('stageov'); o.hidden=true; o.innerHTML=''; document.body.classList.remove('ovopen'); break; }
  case 'copyset': if(s){ try{ await navigator.clipboard.writeText(L.setText(s,byId())); toast('The set is copied.'); }catch(e){ toast('Copy did not work here. Use SAVE AS TEXT.'); } } break;
  case 'txtset': if(s){ const x=document.createElement('a'); x.href=URL.createObjectURL(new Blob([L.setText(s,byId())],{type:'text/plain'})); x.download=(s.name||'set').replace(/[^\w ]+/g,' ').trim().replace(/\s+/g,'_')+'.txt'; document.body.appendChild(x); x.click(); x.remove(); } break;
  case 'night': if(s){ NIGHT={set:s.id,where:'',marks:{}}; render(); } break;
  case 'cancelnight': NIGHT=null; render(); break;
  case 'mark': if(NIGHT){ NIGHT.marks[ds.id]=NIGHT.marks[ds.id]===ds.v?undefined:ds.v; const w=$('n_where'); if(w) NIGHT.where=w.value; render(); } break;
  case 'savenight': if(s&&NIGHT){ const w=$('n_where'); if(w) NIGHT.where=w.value.trim(); const at=Date.now(), marks={}; let n=0;
   Object.keys(NIGHT.marks).forEach(id=>{ const v=NIGHT.marks[id], q=piece(id); if(!v||!q) return; q.done=q.done||[]; q.done.push({at,how:v,note:NIGHT.where,set:s.id}); marks[id]=v; n++; });
   s.nights=s.nights||[]; s.nights.push({at,where:NIGHT.where,marks}); NIGHT=null; save(true); render(); toast(n?'Kept. '+n+' piece'+(n===1?'':'s')+' marked.':'Kept the night. Nothing marked.'); } break;
  case 'pnew': { const arr=PK.find(x=>x[0]===ds.v)[3]; PROMPT[ds.v]=pick(arr,PROMPT[ds.v]); render(); break; }
  case 'puse': { const v=PROMPT[ds.v]; if(ds.v==='cues') newPiece('joke',v.join(', '),''); else if(ds.v==='caption') newPiece('joke','Caption: '+L.firstWords(v,6),v+'\n\n'); else if(ds.v==='question') newPiece('joke',L.firstWords(v,7),v+'\n\n'); else newPiece('joke',v.replace(/\.$/,''),''); break; }
 }
}
document.addEventListener('click',e=>{ const t=e.target.closest('[data-a]'); if(!t||t.disabled) return; if(/SELECT|INPUT|TEXTAREA/.test(t.tagName)) return; e.preventDefault(); act(t.dataset.a,Object.assign({},t.dataset)); });
document.addEventListener('click',e=>{ const t=e.target.closest('#tabs button'); if(t) act('tab',{t:t.dataset.t}); });
/* typing never re-renders the page, so you can keep typing (the time line updates in place) */
document.addEventListener('input',e=>{ const t=e.target;
 if(t.dataset.f&&OPEN){ const p=piece(OPEN); if(!p) return; p[t.dataset.f]=t.value; p.at=p.at||Date.now(); save(); const pt=$('ptime'); if(pt) pt.textContent=L.timeWords(L.time(p,byId())); }
 else if(t.dataset.s&&SET){ const s=DB.sets.find(x=>x.id===SET); if(s){ s[t.dataset.s]=t.value; save(); } }
 else if(t.id==='q'){ Q=t.value; const pos=t.selectionStart; render(); const q=$('q'); if(q){ q.focus(); try{ q.setSelectionRange(pos,pos); }catch(x){} } }
 else if(t.id==='n_where'&&NIGHT){ NIGHT.where=t.value; } });
document.addEventListener('change',async e=>{ const t=e.target;
 if(t.id==='padd'&&t.value){ const p=piece(OPEN); if(p){ p.parts=p.parts||[]; p.parts.push(t.value); save(); render(); } }
 else if(t.id==='sadd'&&t.value){ const s=DB.sets.find(x=>x.id===SET); if(s){ s.items.push(t.value); save(); render(); } }
 else if(t.id==='toset'&&t.value){ const s=DB.sets.find(x=>x.id===t.value), p=piece(OPEN); if(s&&p){ s.items=s.items||[]; s.items.push(p.id); save(true); toast('Added to '+(s.name||'the set')+'.'); render(); } }
 else if(t.id==='s_target'){ const s=DB.sets.find(x=>x.id===SET); if(s){ const v=L.parseTime(t.value); s.target=v||0; save(); const r=$('srun'); if(r) r.textContent=L.setWords(s,byId()); t.value=s.target?L.mmss(s.target):''; } }
 else if(t.id==='tfile'&&t.files[0]){ const f=t.files[0], secs=await clipLength(f); if(await keepTake(f,secs)){ render(); toast('Clip kept: '+L.mmss(secs)+'.'); } } });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&R&&!R.rec) rclose(); });
window.__setlist={DB:()=>DB,act,render};
document.addEventListener('click',e=>{ const t=e.target.closest('.kt[data-kit]'); if(!t||t.classList.contains('off')) return; e.preventDefault(); act(t.dataset.kit,{}); });
render();
})();
