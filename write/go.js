/* THEACTORPAGES GO: one screen, no choices. Type it, say it, paste it. It's kept as you put it in,
   in order, and never changed. Then SEE IT AS: raw, clean, a script, a letter, a deck. Each one is
   made from the raw, fresh; none of them changes it. A script opens in THEACTORPAGES; anything can
   go to Paper Trail as a draft. FREEZE: nothing more goes in.
   localStorage 'wb_go_v1'. Nothing uploaded. SAY IT uses the browser's speech service (Chrome: Google,
   Safari: Apple), the same as Voice. */
(function(){
"use strict";
const G=window.WBGo; if(!G) return;
const KEY='wb_go_v1', BOX='wb_go_box';
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.caps)) return d; }catch(e){} return {caps:[],cur:''}; }
let D=load(), VIEW='raw', LIST=false, EAR=null, SRC='keyboard';
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(D)); return true; }catch(e){ say('This phone would not save. Copy what you have now.',true); return false; } }
const cur=()=>D.caps.find(c=>c.id===D.cur)||null;
function fresh(){ const c=G.blank(); D.caps.unshift(c); D.cur=c.id; save(); return c; }
const me=()=>{ try{ return window.You?You.get():{}; }catch(e){ return {}; } };
const when=t=>new Date(t).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

const css=`
#go{position:fixed;inset:0;z-index:950;background:#16191e;color:#e8edf2;display:none;flex-direction:column;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
#go.on{display:flex}
#go header{display:flex;align-items:center;gap:8px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid #333b45;flex-wrap:wrap}
#go header b{font-size:15px;letter-spacing:.22em;color:#e0a23c}
#go header .nm{flex:1;min-width:120px;font-size:14px;color:#c9d2dc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#go button,#go a.b{font:inherit;color:inherit;background:#252b33;border:1px solid #434d59;border-radius:6px;padding:9px 12px;min-height:42px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
#go button:disabled{opacity:.45;cursor:default}
#go .views{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;border-bottom:1px solid #2a3139}
#go .views button{flex:1 1 0;min-width:0;padding:9px 4px;font-size:12px;letter-spacing:.1em}
#go header .sp{flex:1}
@media(max-width:520px){#go header .nm{order:9;flex:1 1 100%;font-size:13px}#go header button{padding:8px 10px;min-height:38px}}
#go .views button.on{background:#e0a23c;border-color:#e0a23c;color:#1b1206;font-weight:700}
#go .page{flex:1;overflow:auto;padding:16px}
#go .e{margin:0 0 12px;white-space:pre-wrap;line-height:1.5}
#go .e small{display:block;color:#7d8794;font-size:11px;letter-spacing:.06em;margin-bottom:2px}
#go .paper{background:#f4f1ea;color:#16130f;border-radius:6px;padding:18px 16px;font:15px/1.5 "Courier Prime","Courier New",monospace;max-width:720px;margin:0 auto}
#go .paper p{margin:0 0 12px;white-space:pre-wrap}
#go .paper .sh{font-weight:700;text-transform:uppercase}#go .paper .ch{margin:0 0 0 34%;text-transform:uppercase}#go .paper .pa{margin:0 0 0 26%}#go .paper .di{margin:0 10% 12px 16%}#go .paper .tr{text-align:right;text-transform:uppercase}#go .paper .no{color:#7a6f5c;font-style:italic}
#go .letter{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.55}
#go .slide{background:#f4f1ea;color:#16130f;border-radius:6px;padding:16px 18px;margin:0 auto 12px;max-width:720px;aspect-ratio:16/9;display:flex;flex-direction:column;justify-content:center;overflow:hidden}
#go .slide b{font-size:20px;line-height:1.25;margin-bottom:8px}#go .slide ul{margin:0;padding-left:20px;font-size:15px;line-height:1.4}#go .slide i{font-size:11px;color:#7a6f5c;font-style:normal;margin-bottom:6px;letter-spacing:.1em}
#go .acts{display:flex;gap:8px;flex-wrap:wrap;padding:8px 12px;border-top:1px solid #2a3139}
#go .acts button,#go .acts a.b{flex:1 1 auto}
#go .in{padding:8px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #333b45}
#go textarea{width:100%;box-sizing:border-box;min-height:96px;max-height:40vh;resize:vertical;font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;background:#0f1216;color:#e8edf2;border:1px solid #434d59;border-radius:8px;padding:10px 12px}
#go .in .row{display:flex;gap:8px;margin-top:8px}#go .in .row button{flex:1}
#go .in .add{background:#e0a23c;border-color:#e0a23c;color:#1b1206;font-weight:700;flex:2}
#go .in .say.live{background:#b23a2f;border-color:#b23a2f;color:#fff}
#go .msg{font-size:13px;color:#9aa4b0;margin-top:6px;min-height:16px}#go .msg.bad{color:#f0a49a}
#go .cap{display:block;width:100%;text-align:left;margin:0 0 8px}#go .cap small{display:block;color:#8b95a1;font-size:12px;margin-top:2px}
#go .empty{color:#8b95a1;text-align:center;margin-top:18vh;line-height:1.6}
#go .frozen{font-size:11px;letter-spacing:.12em;color:#8fd0ff;border:1px solid #3e6a88;border-radius:99px;padding:3px 8px}
`;
function ensure(){
 if($('go')) return $('go');
 const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
 const o=document.createElement('div'); o.id='go'; o.setAttribute('role','dialog'); o.setAttribute('aria-label','GO');
 document.body.appendChild(o); return o;
}
function say(t,bad){ const m=$('gomsg'); if(m){ m.textContent=t||''; m.className='msg'+(bad?' bad':''); } }

/* ---------- views ---------- */
function rawHtml(c){
 if(!c.entries.length) return '<div class="empty">Get it down. No form, no rules.<br>Type it, say it, or paste it below.<br>You decide what it is after.</div>';
 return c.entries.map(e=>'<div class="e"><small>'+esc(when(e.at))+(e.src!=='keyboard'?' · '+(e.src==='dictation'?'said':e.src==='paste'?'pasted':e.src):'')+'</small>'+esc(e.text)+'</div>').join('');
}
const CLS={'Scene Heading':'sh','Character':'ch','Parenthetical':'pa','Dialogue':'di','Transition':'tr','Note':'no','Action':''};
function viewHtml(c){
 if(VIEW==='raw') return rawHtml(c);
 if(!c.entries.length) return '<div class="empty">Nothing in yet. Put something in on RAW.</div>';
 if(VIEW==='clean') return '<div class="paper letter">'+G.clean(c).map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>';
 if(VIEW==='script') return '<div class="paper">'+G.script(c).map(b=>'<p class="'+CLS[b.type]+'">'+esc(b.type==='Note'?'Note: '+b.text:b.text)+'</p>').join('')+'</div>';
 if(VIEW==='letter'){ const l=G.letter(c,me()); return '<div class="paper letter">'+l.body.split('\n\n').map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>'; }
 if(VIEW==='deck') return G.deck(c).map((s,i)=>'<div class="slide"><i>'+(i+1)+'</i><b>'+esc(s.title)+'</b>'+(s.points.length?'<ul>'+s.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>':'')+'</div>').join('');
 return '';
}
function viewText(c){
 if(VIEW==='raw') return G.raw(c);
 if(VIEW==='clean') return G.clean(c).join('\n\n');
 if(VIEW==='script') return G.fountain(G.script(c),c.title||'');
 if(VIEW==='letter') return G.letter(c,me()).body;
 if(VIEW==='deck') return G.deckText(G.deck(c));
 return '';
}
function actsHtml(c){
 if(!c.entries.length) return '';
 const B=[];
 if(VIEW!=='raw') B.push('<button id="gocopy">COPY</button>');
 if(VIEW==='script') B.push('<button id="goscript">OPEN AS A SCRIPT</button>');
 if(VIEW==='letter'){ const l=G.letter(c,me()); B.push('<a class="b" id="gomail" href="mailto:?subject='+encodeURIComponent(l.subject)+'&body='+encodeURIComponent(l.body)+'">EMAIL IT</a>'); }
 if(VIEW!=='raw') B.push('<button id="gotrail">KEEP IN PAPER TRAIL</button>');
 return B.length?'<div class="acts">'+B.join('')+'</div>':'';
}
function inHtml(c){
 if(VIEW!=='raw') return '';
 if(c.frozen) return '<div class="in"><div class="msg">Frozen '+esc(when(c.frozenAt))+'. Nothing more goes in. See it any way above.</div></div>';
 let box=''; try{ box=sessionStorage.getItem(BOX)||''; }catch(e){}
 return '<div class="in"><textarea id="gobox" placeholder="Get it down." aria-label="Put it in">'+esc(box)+'</textarea>'
  +'<div class="row">'+(SR?'<button class="say" id="gosay">SAY IT</button>':'')+'<button id="gopaste">PASTE</button><button class="add" id="goadd">ADD</button></div>'
  +'<div class="msg" id="gomsg">'+(SR?'SAY IT: Chrome sends what you say to Google, Safari to Apple.':'')+'</div></div>';
}
function listHtml(){
 return '<div class="page"><button id="gonew" class="cap" style="text-align:center;background:#e0a23c;border-color:#e0a23c;color:#1b1206;font-weight:700">NEW CAPTURE</button>'
  +(D.caps.length?D.caps.map(c=>'<button class="cap" data-cap="'+c.id+'"><b>'+esc(G.name(c))+'</b>'+(c.frozen?' <span class="frozen">FROZEN</span>':'')+'<small>'+esc(when(c.at))+' · '+c.entries.length+' in</small></button>').join(''):'<div class="empty">Nothing captured yet.</div>')+'</div>';
}
function draw(){
 const o=ensure(), c=cur();
 if(LIST||!c){
  o.innerHTML='<header><b>GO</b><span class="nm">Your captures</span>'+(c?'<button id="goback">BACK</button>':'')+'<button id="gox">CLOSE</button></header>'+listHtml();
 } else {
  o.innerHTML='<header><b>GO</b><span class="nm" title="'+esc(G.name(c))+'">'+esc(G.name(c))+'</span>'+(c.frozen?'<span class="frozen">FROZEN</span>':'')+'<span class="sp"></span>'
   +'<button id="gofreeze">'+(c.frozen?'UNFREEZE':'FREEZE')+'</button><button id="golist">CAPTURES</button><button id="gox">CLOSE</button></header>'
   +'<div class="views" role="tablist" aria-label="See it as">'+G.VIEWS.map(([k,l])=>'<button role="tab" data-view="'+k+'"'+(VIEW===k?' class="on" aria-selected="true"':'')+'>'+l+'</button>').join('')+'</div>'
   +'<div class="page" id="gopage">'+viewHtml(c)+'</div>'+actsHtml(c)+inHtml(c);
  const pg=$('gopage'); if(pg&&VIEW==='raw') pg.scrollTop=pg.scrollHeight;
 }
 wire();
}

/* ---------- putting it in ---------- */
function boxText(){ const b=$('gobox'); return b?b.value:''; }
function keepBox(){ try{ sessionStorage.setItem(BOX,boxText()); }catch(e){} }
function addBox(){
 const c=cur(); const t=boxText(); if(!c||!t.trim()) return false;
 const e=G.add(c,t,SRC); if(!e) return false;
 if(!save()) return false;
 SRC='keyboard'; try{ sessionStorage.removeItem(BOX); }catch(x){} draw(); const b=$('gobox'); if(b) b.focus(); return true;
}
function earStop(){ if(EAR){ const r=EAR; EAR=null; try{ r.stop(); }catch(e){} } const b=$('gosay'); if(b){ b.classList.remove('live'); b.textContent='SAY IT'; } }
function earStart(){
 if(!SR) return; if(EAR){ earStop(); return; }
 const r=new SR(); r.continuous=true; r.interimResults=true; r.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US'));
 const b=$('gobox'), base=b?b.value.replace(/\s*$/,''):'';
 let said='';
 r.onresult=ev=>{ let fin='', mid=''; for(let i=0;i<ev.results.length;i++){ const x=ev.results[i]; if(x.isFinal) fin+=x[0].transcript+' '; else mid+=x[0].transcript; }
  said=fin; const bx=$('gobox'); if(bx){ bx.value=(base?base+' ':'')+(fin+mid).trim(); keepBox(); } SRC='dictation'; };
 r.onerror=e=>{ say(e.error==='not-allowed'?'The mic is blocked for this page. Allow it in the browser settings.':'Listening stopped.',true); };
 r.onend=()=>{ if(EAR===r){ EAR=null; } const sb=$('gosay'); if(sb){ sb.classList.remove('live'); sb.textContent='SAY IT'; } };
 try{ r.start(); EAR=r; }catch(e){ say('Could not start listening.',true); return; }
 const sb=$('gosay'); if(sb){ sb.classList.add('live'); sb.textContent='STOP'; }
}
function close(){ earStop(); if(boxText().trim()) addBox(); const o=$('go'); if(o) o.classList.remove('on'); document.body.classList.remove('goopen'); }
function open(){ if(!cur()) fresh(); LIST=false; ensure().classList.add('on'); document.body.classList.add('goopen'); draw(); const b=$('gobox'); if(b) b.focus(); }

function toastWB(t){ const el=$('toast'); if(el){ el.textContent=t; el.classList.add('on'); clearTimeout(toastWB.t); toastWB.t=setTimeout(()=>el.classList.remove('on'),3000); } else say(t); }
function wire(){
 const c=cur();
 const on=(id,f)=>{ const el=$(id); if(el) el.onclick=f; };
 on('gox',close);
 on('golist',()=>{ if(boxText().trim()) addBox(); earStop(); LIST=true; draw(); });
 on('goback',()=>{ LIST=false; draw(); });
 on('gonew',()=>{ fresh(); LIST=false; VIEW='raw'; draw(); const b=$('gobox'); if(b) b.focus(); });
 document.querySelectorAll('#go [data-cap]').forEach(b=>b.onclick=()=>{ D.cur=b.dataset.cap; save(); LIST=false; VIEW='raw'; draw(); });
 document.querySelectorAll('#go [data-view]').forEach(b=>b.onclick=()=>{ if(boxText().trim()) addBox(); earStop(); VIEW=b.dataset.view; draw(); });
 on('gofreeze',()=>{ if(!c) return; if(c.frozen){ if(!confirm('Unfreeze? You can add to it again.')) return; G.unfreeze(c); }
  else { if(boxText().trim()) addBox(); if(!confirm('Freeze it? Nothing more goes in. You can still see it every way.')) return; earStop(); G.freeze(c); } save(); draw(); });
 on('goadd',addBox);
 on('gosay',earStart);
 on('gopaste',async()=>{ try{ const t=await navigator.clipboard.readText(); if(!t) return; const b=$('gobox'); b.value=(b.value?b.value.replace(/\s*$/,'')+'\n':'')+t; SRC='paste'; keepBox(); }catch(e){ say('Paste it into the box.',true); } });
 const bx=$('gobox'); if(bx){ bx.oninput=keepBox; bx.onpaste=()=>{ SRC='paste'; }; bx.onkeydown=e=>{ if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){ e.preventDefault(); addBox(); } }; }
 on('gocopy',async()=>{ try{ await navigator.clipboard.writeText(viewText(c)); toastWB('Copied.'); }catch(e){ toastWB('Select it and copy.'); } });
 on('goscript',()=>{ const W=window.WB; if(!W||!W.openText){ toastWB('Could not open it here.'); return; } close(); W.openText(viewText(c),(c.title||G.name(c).replace(/…$/,''))+'.fountain'); toastWB('Opened as a new script. Your capture is still in GO, as it was.'); });
 on('gotrail',()=>{ const I=window.Inbox; if(!I){ toastWB('Paper Trail is not on this page.'); return; }
  const t=viewText(c), nm=(c.title||G.name(c).replace(/…$/,'')), lab={clean:'Clean',script:'Script',letter:'Letter',deck:'Deck'}[VIEW]||'GO';
  I.put('draft',{title:nm,label:'GO: '+lab,file:nm+(VIEW==='script'?'.fountain':'.txt'),text:t,source:'GO'},'go|'+c.id+'|'+VIEW+'|'+t.length);
  toastWB('In Paper Trail as a draft ('+lab.toLowerCase()+'). Open Paper Trail to see it.'); });
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&$('go')&&$('go').classList.contains('on')){ close(); } });
window.addEventListener('pagehide',()=>{ if($('go')&&$('go').classList.contains('on')&&boxText().trim()) addBox(); });
const btn=$('btnGo'); if(btn) btn.onclick=open;
window.__go={open,close,D:()=>D,G};
if(/[?&]go\b/.test(location.search)) setTimeout(open,50);
})();
