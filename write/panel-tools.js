/* WRITER'S BLOCKAGE · TOOLS: what's on your pages, counted. Mined from WRITERKNIFE and fixed for a writer:
   WHO TALKS    each scene's speakers by share of the words spoken (whole script, or the scene you're in)
   REPEATS      words and phrases that come back and bunch up (Paper Trail's, on the script you're writing)
   NAME DRIFT   one character or place spelled two ways (JON / JOHN, MAE'S HOUSE / MAES HOUSE)
   FORMAT       what a reader, or another program, will trip on: a name with no line, a line with no name...
   TODAY        words and pages added today and this sitting
   HEAR IT      the scene read aloud, a voice for each character
   Reports (scene lengths in eighths, cast, locations), Compare and Find are already in the toolbar; not repeated.
   Nothing here writes a word. Every row goes to the place it's about. */
(function(g){
"use strict";
const WT={};
const plain=s=>String(s||'').replace(/[*_]+/g,'').replace(/\[\[[\s\S]*?\]\]/g,'').trim();
WT.cue=s=>plain(s).replace(/\s*\([^)]*\)/g,'').replace(/\s*\^$/,'').trim().toUpperCase();
const WORDS=s=>(plain(s).replace(/\([^)]*\)/g,' ').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]);
WT.words=s=>WORDS(s).length;
/* scenes from the blocks: what comes before the first heading is scene 0 (a cold open with no heading) */
WT.scenes=function(blocks){ const out=[]; let cur=null;
 (blocks||[]).forEach(b=>{ if(b.type==='Scene Heading'){ cur={n:out.filter(x=>x.heading).length+1,id:b.id,heading:plain(b.text).toUpperCase(),blocks:[]}; out.push(cur); }
  else { if(!cur){ cur={n:0,id:b.id,heading:'',blocks:[]}; out.push(cur); } cur.blocks.push(b); } });
 return out.filter(s=>s.heading||s.blocks.some(b=>plain(b.text))); };
/* speeches: a name, then its dialogue (parentheticals skipped) */
WT.speeches=function(blocks){ const out=[]; let cur=null;
 (blocks||[]).forEach(b=>{ if(b.type==='Character'){ cur={who:WT.cue(b.text),id:b.id,text:''}; out.push(cur); }
  else if(b.type==='Dialogue'&&cur) cur.text+=(cur.text?' ':'')+plain(b.text);
  else if(b.type!=='Parenthetical') cur=null; });
 return out.filter(s=>s.who); };
WT.carry=function(blocks){ const by={}; let all=0;
 WT.speeches(blocks).forEach(s=>{ const n=WT.words(s.text); const c=by[s.who]=by[s.who]||{name:s.who,speeches:0,words:0}; c.speeches++; c.words+=n; all+=n; });
 return Object.values(by).map(c=>Object.assign(c,{pct:all?Math.round(c.words/all*100):0})).sort((a,b)=>b.words-a.words||a.name.localeCompare(b.name)); };
/* the shape Paper Trail's REPEATS reads */
WT.forRepeats=function(blocks){ return WT.scenes(blocks).map(s=>{ const sp=WT.speeches(s.blocks), names=[...new Set(sp.map(x=>x.who))];
 const lines=s.blocks.filter(b=>b.type==='Action').map(b=>plain(b.text)).concat(sp.map(x=>x.who+': '+x.text));
 return {heading:s.heading,n:s.n,id:s.id,text:lines.join('\n'),lines:names.map(n=>({name:n,lines:1}))}; }); };

/* ---------- NAME DRIFT ---------- */
function dist(a,b){ if(Math.abs(a.length-b.length)>2) return 9; const d=Array.from({length:a.length+1},(_,i)=>[i]);
 for(let j=1;j<=b.length;j++) d[0][j]=j;
 for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++){ d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1); }
 return d[a.length][b.length]; }
const squash=s=>s.toUpperCase().replace(/['’`.\-\s]/g,'').replace(/^THE/,'');
/* two spellings of one name: the same once punctuation and spaces are gone, or one letter apart (two in a long name).
   A first name against a full name (DANA / DANA PELL) is how scripts work: not drift. */
WT.drift=function(items){ const seen=new Map(); items.forEach(x=>{ const k=x.name; if(!k) return; const c=seen.get(k)||{name:k,n:0,first:x.where,id:x.id}; c.n++; seen.set(k,c); });
 const L=[...seen.values()], out=[];
 for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const a=squash(L[i].name), b=squash(L[j].name); if(!a||!b) continue;
  const short=Math.min(a.length,b.length), d=a===b?0:dist(a,b);
  if(a===b||(short>=3&&d===1)||(short>=8&&d===2)){ const [x,y]=L[i].n>=L[j].n?[L[i],L[j]]:[L[j],L[i]]; out.push({a:x,b:y,same:a===b}); } }
 return out.sort((p,q)=>(q.a.n+q.b.n)-(p.a.n+p.b.n)); };
WT.placeOf=h=>String(h||'').toUpperCase().replace(/^(INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|I\/E|INT|EXT|EST)\.?\s*/,'').replace(/\s*[-–—]+\s*[^-–—]*$/,'').replace(/[\s\-]+$/,'').trim();
WT.drifts=function(blocks){ const sc=WT.scenes(blocks), people=[], places=[];
 sc.forEach(s=>{ if(s.heading) places.push({name:WT.placeOf(s.heading),where:s.n,id:s.id}); WT.speeches(s.blocks).forEach(x=>people.push({name:x.who,where:s.n,id:x.id})); });
 return {people:WT.drift(people),places:WT.drift(places)}; };

/* ---------- FORMAT ---------- */
const SLUGOK=/^(INT|EXT|EST|I\/E)(?:[.\s\/]|$)/i;
WT.format=function(blocks){ const B=blocks||[], out=[], at=(b,what,why)=>out.push({id:b.id,what,why,text:plain(b.text).slice(0,60)});
 const next=i=>{ let k=i+1; while(k<B.length&&!plain(B[k].text)&&B[k].type==='Action') k++; return B[k]; };
 B.forEach((b,i)=>{ const t=plain(b.text), prev=B[i-1], nx=next(i); if(!t&&b.type!=='Action') return;
  if(b.type==='Character'){ let k=i+1; while(B[k]&&B[k].type==='Parenthetical') k++; if(!B[k]||B[k].type!=='Dialogue') at(b,'A name with no line under it','A reader expects dialogue after a character name.'); }
  if(b.type==='Dialogue'&&!(prev&&['Character','Parenthetical','Dialogue'].includes(prev.type))) at(b,'A line with no name over it','Nobody is saying this. Other programs will read it as action.');
  if(b.type==='Parenthetical'&&!(prev&&['Character','Dialogue'].includes(prev.type))) at(b,'A parenthetical on its own','It belongs under a name or inside a speech.');
  if(b.type==='Scene Heading'&&t&&!SLUGOK.test(t)) at(b,'A scene heading without INT. or EXT.','It prints here, but other programs (Final Draft, schedules, Story Studio) may not see a new scene.');
  if(b.type==='Scene Heading'&&(!nx||nx.type==='Scene Heading')) at(b,'A scene with nothing in it','A heading and then the next heading.');
  if(b.type==='Action'&&t&&t===t.toUpperCase()&&/^[A-Z][A-Z0-9 .'’\-]{1,30}$/.test(t)&&!/[.!?]$/.test(t)&&nx&&nx.type==='Action'&&plain(nx.text)&&plain(nx.text)!==plain(nx.text).toUpperCase())
   at(b,'A name typed as action?','In caps on its own line: another program will read it as someone about to speak.');
  if(b.type==='Dialogue'&&/^\(.*\)$/.test(t)) at(b,'A parenthetical typed as dialogue','It will be read out as a line.');
 });
 return out; };

/* ---------- TODAY ---------- */
const day=d=>{ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
WT.day=day;
/* the count at the start of today and of this sitting, kept per script on this device */
WT.today=function(store,key,now){ const w=now.words, p=now.pages, d=day(now.date); let s=store.get(key)||{};
 if(s.day!==d) s={day:d,words:w,pages:p};
 store.set(key,s);
 return {words:w-s.words,pages:p-s.pages}; };
WT.todayWords=function(t,sit){ const f=(x,u)=>(x>0?'+':'')+x+' '+u+(Math.abs(x)===1?'':'s');
 return ['Today: '+f(t.words,'word')+', '+f(t.pages,'page')+'.',sit?'This sitting: '+f(sit.words,'word')+'.':'']; };

/* ---------- HEAR IT: a voice per character, from what the device has ---------- */
WT.cast=function(names,voices){ const V=(voices||[]).filter(v=>/^en/i.test(v.lang||''));
 const use=V.length?V:(voices||[]); return names.map((n,i)=>({name:n,voice:use.length?use[i%use.length]:null,pitch:[1,0.85,1.15,0.95,1.08,0.9][i%6],rate:1})); };

g.WBTools=WT;
if(typeof module!=='undefined') module.exports=WT;

/* ---------- the panel ---------- */
if(typeof document==='undefined') return;
function mountTools(){ if(!g.WB||!g.WB.register) return setTimeout(mountTools,100);
 const T=g.PaperTrail;
 g.WB.register({id:'tools',name:'Tools',version:'1',mount(el,api){
  let tab='talk', scope='scene', speaking=null, sit=null;
  const LS={get:k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } },set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const scriptId=()=>{ try{ return currentId||''; }catch(e){ return ''; } };   // Writer's Blockage's own id for the open script
  const todayKey=()=>'wb_tools_today:'+(scriptId()||api.meta().title||'script');
  const count=()=>({words:api.blocks().filter(b=>!['Section','Synopsis','Page Break'].includes(b.type)).reduce((a,b)=>a+WT.words(b.text),0),pages:api.pageCount(),date:new Date()});
  let sitFor='';
  const startSitting=()=>{ const id=todayKey(); if(sitFor===id) return; sitFor=id; const now=count(); WT.today(LS,id,now); sit={words:now.words}; };
  const hereScene=()=>{ const B=api.blocks(), id=api.activeId(), sc=WT.scenes(B); return sc.find(s=>s.id===id||s.blocks.some(b=>b.id===id))||sc[0]||null; };
  const goBtn=(id,label)=>'<button class="wt-go" data-go="'+esc(id)+'">'+esc(label||'GO')+'</button>';
  function draw(){ const B=api.blocks();
   let h='<div class="wt-tabs">'+[['talk','Who talks'],['rep','Repeats'],['drift','Name drift'],['fmt','Format'],['today','Today'],['hear','Hear it']].map(([k,l])=>'<button data-wt="'+k+'"'+(k===tab?' class="on"':'')+'>'+l+'</button>').join('')+'</div>';
   if(tab==='talk'){ const s=hereScene(), blocks=scope==='scene'&&s?s.blocks:B, C=WT.carry(blocks);
    h+='<div class="wt-row"><button data-scope="scene"'+(scope==='scene'?' class="on"':'')+'>This scene</button><button data-scope="all"'+(scope==='all'?' class="on"':'')+'>Whole script</button></div>'
     +(scope==='scene'&&s?'<p class="wt-h">'+esc(s.heading||'Before the first scene')+'</p>':'')
     +(C.length?C.map(c=>'<div class="wt-bar"><span>'+esc(c.name)+'</span><i><b style="width:'+c.pct+'%"></b></i><small>'+c.pct+'% · '+c.speeches+' speech'+(c.speeches===1?'':'es')+', '+c.words+' words</small></div>').join(''):'<p class="wt-note">Nobody speaks here.</p>')
     +'<p class="wt-note">Share of the words spoken. Counts only.</p>'; }
   if(tab==='rep'){ if(!T||!T.repeats){ h+='<p class="wt-note">Repeats need Paper Trail\'s reader, which didn\'t load.</p>'; }
    else { const sc=WT.forRepeats(B), R=T.repeats(sc), num=i=>sc[i]?String(sc[i].n||'opening'):'';
     const list=(L,none)=>L.length?L.map(x=>'<div class="wt-li"><b>'+esc(x.w)+'</b><small>'+esc(T.repeatWords(x,num))+'</small>'+goBtn(sc[x.near.from]&&sc[x.near.from].id,'SCENE '+num(x.near.from))+'</div>').join(''):'<p class="wt-note">'+none+'</p>';
     h+='<p class="wt-h">In the action</p>'+list(R.action,'Nothing comes back like that.')+'<p class="wt-h">In the dialogue</p>'+list(R.dialogue,'Nothing comes back like that.')+'<p class="wt-h">Phrases</p>'+list(R.phrases,'No phrase comes back three times close together.')
      +'<p class="wt-note">Four or more within three scenes, or a dozen anywhere. Names, settings and everyday words aren\'t counted. Some repeats are on purpose.</p>'; } }
   if(tab==='drift'){ const D=WT.drifts(B), row=p=>'<div class="wt-li"><span><b>'+esc(p.a.name)+'</b> '+p.a.n+'× · <b>'+esc(p.b.name)+'</b> '+p.b.n+'×</span><small>'+(p.same?'Same letters, written differently.':'One letter apart.')+' '+esc(p.b.name)+' first in scene '+(p.b.first||'opening')+'.</small>'+goBtn(p.b.id)+'</div>';
    h+='<p class="wt-h">Characters</p>'+(D.people.length?D.people.map(row).join(''):'<p class="wt-note">Every name is spelled one way.</p>')
     +'<p class="wt-h">Places</p>'+(D.places.length?D.places.map(row).join(''):'<p class="wt-note">Every place is spelled one way.</p>')
     +'<p class="wt-note">Two spellings that might be one name. Some are two people (JON and JOHN can both be real); you decide. To fix one, use Rename in Cast.</p>'; }
   if(tab==='fmt'){ const F=WT.format(B);
    h+=F.length?'<p class="wt-h">'+F.length+' place'+(F.length===1?'':'s')+' to look at</p>'+F.slice(0,60).map(x=>'<div class="wt-li"><b>'+esc(x.what)+'</b><small>'+esc(x.text?'"'+x.text+'". ':'')+esc(x.why)+'</small>'+goBtn(x.id)+'</div>').join(''):'<p class="wt-note">Nothing here a reader or another program will trip on.</p>';
    h+='<p class="wt-note">What gets misread on the way to a reader, Final Draft or a schedule. Nothing is changed; GO takes you there.</p>'; }
   if(tab==='today'){ const now=count(), t=WT.today(LS,todayKey(),now), w=WT.todayWords(t,{words:now.words-sit.words});
    h+='<div class="wt-big">'+esc(w[0])+'</div><p class="wt-note">'+esc(w[1])+'</p><p class="wt-note">From where this script stood when you first opened it today, on this device. A count, not a goal. Cutting counts as minus.</p>'; }
   if(tab==='hear'){ const s=hereScene(), sp=s?WT.speeches(s.blocks):[], ok=!!g.speechSynthesis;
    h+='<p class="wt-h">'+esc(s?(s.heading||'Before the first scene'):'No scene yet')+'</p>'
     +(ok?'<div class="wt-row"><button data-hear="1" class="on">'+(speaking?'STOP':'HEAR THIS SCENE')+'</button><label class="wt-chk"><input type="checkbox" id="wtact"'+(LS.get('wb_tools_hear_action')?' checked':'')+'> read the action too</label></div>'
       +'<p class="wt-note">'+sp.length+' speech'+(sp.length===1?'':'es')+'. Each character gets their own voice from the ones on this device. Put the cursor in another scene to hear that one.</p>'
      :'<p class="wt-note">This browser can\'t read aloud.</p>'); }
   el.innerHTML=h; wire(); }
  function wire(){
   el.querySelectorAll('[data-wt]').forEach(b=>b.onclick=()=>{ tab=b.dataset.wt; draw(); });
   el.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{ scope=b.dataset.scope; draw(); });
   el.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ if(b.dataset.go) api.goTo(b.dataset.go); });
   const a=el.querySelector('#wtact'); if(a) a.onchange=()=>LS.set('wb_tools_hear_action',a.checked);
   const h=el.querySelector('[data-hear]'); if(h) h.onclick=()=>{ if(speaking){ stop(); draw(); } else hear(); };
  }
  function stop(){ speaking=null; try{ g.speechSynthesis.cancel(); }catch(e){} }
  function hear(){ const s=hereScene(); if(!s) return; const S=g.speechSynthesis, act=!!LS.get('wb_tools_hear_action'), seq=[]; let cur=null;
   s.blocks.forEach(b=>{ const t=plain(b.text); if(!t) return; if(b.type==='Character'){ cur=WT.cue(t); } else if(b.type==='Dialogue'&&cur) seq.push({who:cur,text:t.replace(/\([^)]*\)/g,' '),id:b.id}); else if(b.type==='Action'&&act){ seq.push({who:'',text:t,id:b.id}); cur=null; } else if(b.type!=='Parenthetical') cur=null; });
   if(!seq.length){ api.toast('Nobody speaks in this scene yet.'); return; }
   const names=[...new Set(seq.filter(x=>x.who).map(x=>x.who))], cast=WT.cast(names,S.getVoices()), by=Object.fromEntries(cast.map(c=>[c.name,c]));
   speaking=s.id; S.cancel(); seq.forEach((x,k)=>{ const u=new SpeechSynthesisUtterance(x.text), c=x.who?by[x.who]:null; if(c&&c.voice) u.voice=c.voice; u.pitch=c?c.pitch:1; u.rate=c?c.rate:1.05;
    u.onstart=()=>{ if(speaking) api.goTo(x.id); }; if(k===seq.length-1) u.onend=()=>{ speaking=null; draw(); }; S.speak(u); });
   draw(); }
  startSitting();
  new MutationObserver(()=>{ if(el.classList.contains('on')){ startSitting(); draw(); } else if(speaking){ stop(); } }).observe(el,{attributes:true,attributeFilter:['class']});
  api.onChange(()=>{ startSitting(); if(el.closest('.railpane.on')&&tab!=='hear') { clearTimeout(el._t); el._t=setTimeout(draw,300); } });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&speaking){ stop(); draw(); } });
  el.addEventListener('wt-redraw',draw);
  draw(); }});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mountTools); else mountTools();
})(typeof window!=='undefined'?window:globalThis);
