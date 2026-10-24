/* THEACTORPAGES VOICE: write by talking. Phone first.
   Everything goes through WB.api, the same seam panels use: every line lands through the
   editor's own undo and is saved with the script. What you said, word for word, goes to the
   change trail. The browser's speech service turns sound into words; this file only ever
   sees the words. When the browser can't listen, the keyboard mic and the box below work
   with the same commands. */
(function(){
"use strict";
const V=window.WBVoice, WB=window.WB;
if(!V||!WB||!WB.api) return;
const api=WB.api;
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- the screen ---------- */
const css=`
#vw{position:fixed;inset:0;z-index:900;background:var(--desk);color:var(--chrome-text);display:none;flex-direction:column;font-family:var(--sans,system-ui,sans-serif)}
#vw.on{display:flex}
#vw header{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--rule)}
#vw header b{font-size:13px;letter-spacing:.18em}
#vw .next{flex:1;font-size:13px;color:var(--mark-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#vw button{font:inherit;color:inherit;background:var(--desk-3);border:1px solid var(--rule);border-radius:10px;padding:10px 12px;min-height:44px;cursor:pointer}
#vw .page{flex:1;overflow:auto;padding:16px 16px 8px;background:#f4f1ea;color:#16130f;font:15px/1.45 "Courier Prime","Courier New",Courier,monospace}
#vw .bl{margin:0 0 10px;white-space:pre-wrap}
#vw .bl.sh{font-weight:700;text-transform:uppercase}
#vw .bl.ch{margin-left:34%;text-transform:uppercase;margin-bottom:0}
#vw .bl.pa{margin-left:26%;margin-bottom:0}
#vw .bl.di{margin-left:16%;margin-right:10%}
#vw .bl.tr{text-align:right;text-transform:uppercase}
#vw .bl.new{background:rgba(200,137,47,.18);border-radius:3px}
#vw .bl.hear{color:#8a8172;font-style:italic}
#vw .msg{padding:8px 14px;font-size:14px;min-height:20px;color:var(--chrome-text);border-top:1px solid var(--rule)}
#vw .msg.bad{color:#f0a49a}
#vw .bar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:8px 12px}
#vw .modes{display:flex;gap:8px;padding:0 12px 8px}
#vw .modes button{flex:1}
#vw .modes button.on{background:var(--mark);border-color:var(--mark);color:var(--mark-ink);font-weight:600}
#vw .mic{display:block;margin:4px 12px 10px;width:calc(100% - 24px);min-height:64px;font-size:17px;font-weight:600;letter-spacing:.12em;background:var(--mark);border-color:var(--mark);color:var(--mark-ink)}
#vw .mic.live{background:#b23a2f;border-color:#b23a2f;color:#fff}
#vw .type{display:flex;gap:8px;padding:0 12px 12px}
#vw .type input{flex:1;font:inherit;font-size:16px;background:var(--desk-3);color:var(--hi);border:1px solid var(--rule);border-radius:6px;padding:10px}
#vw .card{position:absolute;inset:56px 10px 10px;background:var(--desk-2);border:1px solid var(--rule);border-radius:8px;overflow:auto;padding:14px;display:none;font-size:14px}
#vw .card.on{display:block}
#vw .card div{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--rule)}
#vw .card i{color:var(--mark-text);font-style:normal}
#vw .alts{padding:0 14px 6px;font-size:13px;color:var(--chrome-text)}
#vw .alts button{min-height:34px;padding:4px 8px;margin:4px 6px 0 0}
#vwFab{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:800;min-height:64px;padding:0 24px 0 18px;border-radius:32px;font:600 16px var(--sans,system-ui);letter-spacing:.12em;background:var(--mark);color:var(--mark-ink,#1a1206);border:0;box-shadow:0 6px 18px rgba(0,0,0,.35);display:none;align-items:center;gap:10px}
#vwFab svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
/* VOICE is in the top bar on every screen now; this one stays out of the way */
/* VOICE ON THE PAGE: the mic bar at the bottom, the real page above it */
#vdock{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:850;width:min(820px,calc(100vw - 24px));background:var(--desk-2);color:var(--chrome-text);border:1px solid var(--rule);border-radius:20px;padding:12px 14px;display:none;align-items:center;gap:12px;box-shadow:0 14px 36px rgba(0,0,0,.4);font-family:var(--sans,system-ui)}
body.vdock #vdock{display:flex}
#vdock button{font:inherit;color:inherit;background:var(--desk-3);border:1px solid var(--rule);border-radius:10px;min-height:44px;padding:0 12px;cursor:pointer;font-size:13.5px;font-weight:500}
#vdock .vmic{width:64px;height:64px;min-height:64px;border-radius:50%;padding:0;flex:none;background:var(--mark);border:0;color:var(--mark-ink,#1a1206);display:inline-flex;align-items:center;justify-content:center}
#vdock .vmic svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
#vdock .vmic.live{background:#b23a2f;color:#fff}
#vdock .vmic span{display:none}
#vdock .vmid{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
#vdock .vnext{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mark-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vdock .vheard{font-size:14.5px;color:var(--chrome-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:20px}
#vdock .vmodes{display:flex;gap:6px}
#vdock .vmodes button.on{border-color:var(--mark);color:var(--mark-text);font-weight:600}
#vdock .vrow{display:flex;gap:6px;align-items:center}
#vghost{position:absolute;z-index:6;pointer-events:none;white-space:pre-wrap;color:#8a8273;font-style:italic;display:none}
#vghost::after{content:"";display:inline-block;width:2px;height:1em;background:#e0a23c;vertical-align:-.15em;margin-left:2px}
#vtag{position:absolute;z-index:6;pointer-events:none;font:600 10.5px/1.2 var(--sans,system-ui);letter-spacing:.12em;color:#8a5a08;background:rgba(224,162,60,.22);border-radius:4px;padding:3px 6px;display:none;white-space:normal;text-align:left}
.stack .b.vjust{background:rgba(224,162,60,.24);border-radius:3px;transition:background 1.2s ease}
.stack .b.vfade{background:transparent}
@media (max-width:700px){
 #vdock{left:0;right:0;transform:none;width:auto;bottom:0;border-radius:18px 18px 0 0;flex-wrap:wrap;padding:10px 12px calc(12px + env(safe-area-inset-bottom,0px))}
 #vdock .vmid{order:-1;flex:1 1 100%}
 #vdock .vmodes{flex:1 1 100%}#vdock .vmodes button{flex:1}
 #vdock .vmic{width:auto;flex:1 1 auto;border-radius:16px;height:64px;gap:10px;font-weight:600;letter-spacing:.12em}
 #vdock .vmic span{display:inline}
}
@media (prefers-reduced-motion:reduce){.stack .b.vjust{transition:none}}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
const el=document.createElement('div'); el.id='vw';
el.innerHTML=`<header><b>VOICE</b><span class="next" id="vwNext"></span><button id="vwPasteOpen" title="Paste what you said: dictation, a transcript">Paste</button><button id="vwHelp">What to say</button><button id="vwClose" aria-label="Close">Done</button></header>
<div class="page" id="vwPage"></div>
<div class="alts" id="vwAlts"></div>
<div class="msg" id="vwMsg"></div>
<div class="modes"><button data-vm="Scene Heading">Heading</button><button data-vm="Action">Action</button><button data-vm="Dialogue">Dialogue</button></div>
<div class="bar"><button id="vwUndo">Undo</button><button id="vwNewLine">New line</button><button id="vwAlt">Try again</button></div>
<button class="mic" id="vwMic">TAP TO TALK</button>
<div class="type"><input id="vwType" placeholder="Or type it, or use your keyboard's mic" enterkeyhint="send" autocomplete="off"><button id="vwGo">Go</button></div>
<div class="card" id="vwCard"></div>
<div class="card" id="vwPaste"><p style="margin-top:0"><b>Paste what you said</b></p>
<p class="note" style="margin:0 0 8px">Dictation, a voice memo's transcript, an interview. It takes out the ums and the repeats and steadies the punctuation. It never rewords, reorders or adds. Your exact words are kept in the change trail.</p>
<textarea id="vwPasteIn" rows="6" placeholder="Paste it here" style="width:100%;font:inherit;font-size:15px;background:var(--desk-3);color:var(--hi);border:1px solid var(--rule);border-radius:8px;padding:10px;resize:vertical"></textarea>
<div style="display:flex;gap:8px;align-items:center;margin:8px 0;flex-wrap:wrap"><label for="vwPasteLvl" style="font-size:13px;color:var(--chrome-dim)">How much</label><select id="vwPasteLvl" style="font:inherit;min-height:44px;background:var(--desk-3);color:var(--hi);border:1px solid var(--rule);border-radius:8px;padding:0 8px"><option value="light">Light</option><option value="standard" selected>Standard</option><option value="heavy">Heavy</option></select>
<button id="vwPasteFile">A file</button><button id="vwPasteGo" style="background:var(--mark);border-color:var(--mark);color:var(--mark-ink);font-weight:600">CLEAN IT UP</button></div>
<div id="vwPasteOut"></div><button id="vwPasteClose">Done</button></div>`;
document.body.appendChild(el);
const MICSVG='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const fab=document.createElement('button'); fab.id='vwFab'; fab.innerHTML=MICSVG+'VOICE'; fab.setAttribute('aria-label','Voice: talk it onto the page'); document.body.appendChild(fab);
const dock=document.createElement('div'); dock.id='vdock'; dock.setAttribute('role','region'); dock.setAttribute('aria-label','Voice on the page');
dock.innerHTML='<button class="vmic" id="vdMic" aria-label="Tap to talk">'+MICSVG+'<span id="vdMicT">TAP TO TALK</span></button>'
 +'<div class="vmid"><span class="vnext" id="vdNext"></span><span class="vheard" id="vdHeard" aria-live="polite"></span></div>'
 +'<div class="vmodes"><button data-vd="Scene Heading">Heading</button><button data-vd="Action">Action</button><button data-vd="Dialogue">Dialogue</button></div>'
 +'<div class="vrow"><button id="vdUndo">Undo</button><button id="vdFull" title="The full-screen Voice">Full screen</button><button id="vdDone">Done</button></div>';
document.body.appendChild(dock);
const ghost=document.createElement('div'); ghost.id='vghost'; const tag=document.createElement('div'); tag.id='vtag';
let DOCK=false, SAID='';
$('vwCard').innerHTML='<p style="margin-top:0">Say it like this. Capitals and punctuation don\'t matter, and your phone adding a full stop doesn\'t break a command.</p>'
 +V.SAY.map(([a,b])=>'<div><span>"'+esc(a)+'"</span><i>'+esc(b)+'</i></div>').join('')
 +'<p>A name only starts a speech when you say <b>says</b> (or asks, whispers, yells). "Rennie walks to the bench" is action.</p>'
 +'<p>The mic only stops on <b>stop listening</b>. "Stop." is a line.</p>'
 +'<p class="note">Your phone or browser turns the sound into words (that can go through Apple or Google, the same as the keyboard mic). THEACTORPAGES only gets the words, keeps them with your script on this device, and keeps exactly what you said in the change trail.</p>'
 +'<button id="vwCardClose">Got it</button>';

/* ---------- where we are in the script ---------- */
let MODE='Action', WANT=false, REC=null, LIVE=false, restarts=[], FILL=null, NAMES=[], lock=null;
const recent=new Set(); let JUST=new Set();
function blocks(){ return api.blocks(); }
function at(){ const B=blocks(), id=api.activeId(); let i=B.findIndex(b=>b.id===id); if(i<0) i=B.length-1; return {B:B,i:i,b:B[i]}; }
function speakerAt(B,i){ for(let k=i;k>=0;k--){ const t=B[k].type; if(t==='Character') return String(B[k].text||'').replace(/\s*\(.*$/,'').trim().toUpperCase(); if(t!=='Dialogue'&&t!=='Parenthetical') return ''; } return ''; }
function refreshNames(){ try{ NAMES=[...new Set(api.reports().cast.map(c=>c.name))]; }catch(e){ NAMES=[]; } }
function modeFromScript(){ const {B,i,b}=at(); if(!b) return 'Action'; return /^(Character|Dialogue|Parenthetical)$/.test(b.type)?'Dialogue':b.type==='Transition'?'Scene Heading':(b.type==='Scene Heading'&&!b.text)?'Scene Heading':'Action'; }
function ctx(){ const {B,i}=at(); return {mode:MODE,speaker:MODE==='Dialogue'?speakerAt(B,i):'',names:NAMES,last:B[i]||null}; }
function say(m,bad){ const e=$('vwMsg'); e.textContent=m||''; e.className='msg'+(bad?' bad':''); }

/* ---------- doing what was said ---------- */
function insert(parts){ const {b}=at(); let ok;
 // an empty line where you are gets filled, not left behind
 if(b&&!String(b.text||'').trim()){ ok=api.replace([b.id],parts); const B0=blocks(), j=B0.findIndex(x=>x.id===api.activeId()); if(j>=0&&B0[j+parts.length-1]) api.goTo(B0[j+parts.length-1].id); } else ok=api.insertAfter(b?b.id:blocks()[blocks().length-1].id,parts); const B=blocks(), id=api.activeId(); const i=B.findIndex(x=>x.id===id); for(let k=0;k<parts.length;k++) if(B[i-k]) recent.add(B[i-k].id); return ok; }
function trail(raw,did,ids){ try{ api.record({tool:'Voice',raw:raw,ids:ids||[api.activeId()],edits:[{kind:'voice',original:raw,replacement:did,reason:'spoken'}]}); }catch(e){} }
function handle(raw){
 const typing=document.activeElement===$('vwType');
 const before=new Map(blocks().map(b=>[b.id,b.type+'|'+b.text]));
 try{ act(raw); } finally {
  JUST=new Set(blocks().filter(b=>before.get(b.id)!==b.type+'|'+b.text).map(b=>b.id)); SAID=String(raw||'').trim(); draw(); if(DOCK) glow();
  // the editor puts its caret on the new line; on a phone that pops the keyboard over the voice screen
  const a=document.activeElement; if(a&&!el.contains(a)&&a!==document.body) a.blur();
  if(typing) $('vwType').focus();
 }
}
function act(raw){
 raw=String(raw||'').trim(); if(!raw) return;
 refreshNames();
 const c=ctx(); let r=V.parse(raw,c);
 const {B,i,b}=at();
 if(r.kind==='change'){
  const last=lastLine(); const re=new RegExp('\\b'+r.from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  if(last&&re.test(last.text)){ api.setText(last.id,last.text.replace(re,r.to)); trail(raw,'changed "'+r.from+'" to "'+r.to+'"',[last.id]); say('Changed "'+r.from+'" to "'+r.to+'".'); draw(); return; }
  say('"'+r.from+'" isn\'t in the last line, so I typed it as a line. Undo takes it back.'); r=r.fallback;
 }
 switch(r.kind){
  case 'none': return;
  case 'stop': stop(); say('Mic off.'); return;
  case 'undo': api.undo(); say('Undone.'); MODE=modeFromScript(); break;
  case 'scratch': { const l=lastLine(); if(l){ api.undo(); say('Scratched.'); trail(raw,'scratched',[l.id]); } MODE=modeFromScript(); break; }
  case 'newline': FILL=null; say(MODE==='Dialogue'?'Next words start a new paragraph of the speech.':'Next words start a new paragraph.'); NEWPARA=true; break;
  case 'mode': MODE=r.mode; say(r.mode==='Scene Heading'?'Say the heading: interior or exterior, the place, the time.':''); break;
  case 'retype': { const l=lastLine(); if(!l){ say('Nothing to change yet.'); break; } let t=l.text;
   if(r.type==='Parenthetical'&&!/^\(.*\)$/.test(t)) t='('+t.replace(/[.]$/,'').toLowerCase()+')';
   if(l.type==='Parenthetical'&&r.type!=='Parenthetical') t=t.replace(/^\(|\)$/g,'');
   api.replace([l.id],[{type:r.type,text:t}]); trail(raw,'made it '+r.type,[l.id]); say('Now '+r.type.toLowerCase()+'.'); MODE=r.type==='Dialogue'||r.type==='Parenthetical'?'Dialogue':'Action'; break; }
  case 'recue': { let k=i; while(k>=0&&B[k].type!=='Character') k--; if(k<0){ say('No speech to give to '+r.name+'.'); break; } api.setText(B[k].id,r.name); trail(raw,'cue now '+r.name,[B[k].id]); say('That speech is '+r.name+'\'s now.'); break; }
  case 'alt': { const l=lastLine(); if(!l||!l.text){ say('Nothing to try again yet.'); break; } trail(raw,'alternate kept',[l.id]); try{ api.record({tool:'Voice',kind:'alternate',raw:l.text,ids:[l.id]}); }catch(e){} FILL=l.id; say('Kept that take. Say it again.'); break; }
  case 'idea': api.addIdea(r.text); trail(raw,'to Ideas',[]); say('In Ideas: '+r.text); break;
  case 'cue': insert([{type:'Character',text:r.name}]); trail(raw,'cue '+r.name); MODE='Dialogue'; say(''); break;
  case 'speech': { const parts=[{type:'Character',text:r.name}]; if(r.paren) parts.push({type:'Parenthetical',text:r.paren}); if(r.text) parts.push({type:'Dialogue',text:r.text});
   insert(parts); trail(raw,r.name+(r.text?': '+r.text:'')); MODE='Dialogue'; say(r.text?'':'Go ahead, '+r.name+'.'); break; }
  case 'add': insert([{type:r.type,text:r.text}]); trail(raw,r.type+': '+r.text); if(r.mode) MODE=r.mode; say(r.why?'Action: it '+r.why+'. "Put that in dialogue" if not.':''); break;
  case 'text': {
   if(FILL){ const f=blocks().find(x=>x.id===FILL); FILL=null; if(f){ api.setText(f.id,r.text); trail(raw,'new take',[f.id]); say('New take in. "Undo" brings the old one back.'); break; } }
   const cur=at().b;
   if(cur&&cur.type===r.type&&!NEWPARA&&cur.text&&recent.has(cur.id)){ api.setText(cur.id,(cur.text.replace(/\s+$/,'')+' '+r.text).trim()); trail(raw,'added to '+r.type,[cur.id]); }
   else if(cur&&cur.type===r.type&&!cur.text){ api.setText(cur.id,r.text); recent.add(cur.id); trail(raw,r.type,[cur.id]); }
   else { insert([{type:r.type,text:r.text}]); trail(raw,r.type); }
   NEWPARA=false;
   say(r.why==='nobody is speaking'?'Nobody is speaking, so that went in as action. Say "Cal says..." to start a speech.':'');
   if(r.type==='Action') MODE='Action';
   break; }
 }
 draw();
}
let NEWPARA=false;
function lastLine(){ const {B,i}=at(); for(let k=i;k>=0;k--) if(String(B[k].text||'').trim()) return B[k]; return null; }

/* ---------- drawing ---------- */
const CL={'Scene Heading':'sh','Action':'ac','Character':'ch','Parenthetical':'pa','Dialogue':'di','Transition':'tr'};
let HEAR='';
function draw(){
 if(DOCK) drawDock();
 if(!el.classList.contains('on')) return;
 const {B,i}=at(); let s=i; while(s>0&&B[s].type!=='Scene Heading'&&i-s<14) s--; s=Math.max(0,Math.min(s,i-14));
 const show=B.slice(s,i+1);
 $('vwPage').innerHTML=show.map(b=>'<p class="bl '+(CL[b.type]||'ac')+(JUST.has(b.id)?' new':'')+'">'+esc(b.text||' ')+'</p>').join('')
  +(HEAR?'<p class="bl hear '+(MODE==='Dialogue'?'di':'ac')+'">'+esc(HEAR)+'</p>':'');
 $('vwPage').scrollTop=1e9;
 const sp=speakerAt(B,i);
 $('vwNext').textContent=MODE==='Scene Heading'?'Next: a scene heading':MODE==='Dialogue'?(sp?'Next: '+sp+' speaking':'Next: say who speaks'):'Next: action';
 el.querySelectorAll('[data-vm]').forEach(x=>x.classList.toggle('on',x.dataset.vm===MODE));
 const mic=$('vwMic'); mic.classList.toggle('live',LIVE); mic.textContent=!SR?'THIS BROWSER CAN\'T LISTEN':LIVE?'LISTENING. TAP TO STOP':'TAP TO TALK'; mic.disabled=!SR;
 // earlier takes of the last line
 const l=lastLine(); let alts=[];
 try{ alts=api.ledger().filter(e=>e.tool==='Voice'&&e.kind==='alternate'&&l&&(e.ids||[]).includes(l.id)).map(e=>e.raw).filter(t=>t&&t!==l.text); }catch(e){}
 $('vwAlts').innerHTML=alts.length?'Earlier takes of this line: '+[...new Set(alts)].slice(-4).map((t,k)=>'<button data-alt="'+k+'">'+esc(t.length>40?t.slice(0,38)+' …':t)+'</button>').join(''):'';
 [...$('vwAlts').querySelectorAll('[data-alt]')].forEach((x,k)=>x.onclick=()=>{ const u=[...new Set(alts)].slice(-4)[k]; api.record({tool:'Voice',kind:'alternate',raw:l.text,ids:[l.id]}); api.setText(l.id,u); say('Swapped. The other take is kept.'); draw(); });
}

/* ---------- VOICE ON THE PAGE: your words on the real page, where they land ---------- */
const TYPECL={'Scene Heading':'sceneheading','Action':'action','Dialogue':'dialogue','Character':'character'};
function elOf(id){ return id?document.querySelector('.stack [data-bid="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]'):null; }
function scrollBox(){ return document.getElementById('scroll'); }
function place(){
 const sc=scrollBox(); if(!sc){ return; }
 if(ghost.parentNode!==sc){ sc.appendChild(ghost); sc.appendChild(tag); }
 const {B,i,b}=at(); const cur=elOf(b&&b.id);
 if(!DOCK||!cur){ ghost.style.display='none'; tag.style.display='none'; return; }
 const base=sc.getBoundingClientRect(), r=cur.getBoundingClientRect();
 const kind=MODE==='Dialogue'?'dialogue':MODE==='Scene Heading'?'sceneheading':'action';
 const like=document.querySelector('.stack .b.'+kind)||cur, lr=like.getBoundingClientRect(), cs=getComputedStyle(cur);
 const empty=!String(b.text||'').trim();
 const top=(empty?r.top:r.bottom+parseFloat(cs.fontSize)*0.9)-base.top+sc.scrollTop, left=lr.left-base.left+sc.scrollLeft;
 const sp=speakerAt(B,i), label=MODE==='Scene Heading'?'SCENE HEADING':MODE==='Dialogue'?((sp||'SAY WHO SPEAKS')+' · DIALOGUE'):'ACTION';
 const paper=cur.closest('.stack'), pr=paper?paper.getBoundingClientRect():r, gap=lr.left-pr.left;
 tag.textContent=label;
 if(gap>=120&&pr.left>=base.left-2){ tag.style.left=(pr.left-base.left+sc.scrollLeft+10)+'px'; tag.style.maxWidth=(gap-20)+'px'; tag.style.top=(top+1)+'px'; tag.style.display='block'; }
 else tag.style.display='none';
 if(HEAR){ ghost.textContent=HEAR; ghost.style.cssText+=';display:block;left:'+left+'px;top:'+top+'px;width:'+Math.max(120,lr.width)+'px;font:'+cs.font+';font-style:italic'; }
 else ghost.style.display='none';
 // keep where you're talking in view, above the bar
 const bar=dock.getBoundingClientRect(), need=r.bottom+parseFloat(cs.fontSize)*3;
 if(need>bar.top-12) sc.scrollTop+=need-(bar.top-12);
 else if(r.top<base.top+8) sc.scrollTop-=base.top+8-r.top;
}
function glow(){ setTimeout(()=>{ JUST.forEach(id=>{ const e=elOf(id); if(e){ e.classList.add('vjust'); setTimeout(()=>e.classList.add('vfade'),1600); setTimeout(()=>e.classList.remove('vjust','vfade'),3000); } }); },30); }
function drawDock(){
 const {B,i}=at(), sp=speakerAt(B,i);
 $('vdNext').textContent=MODE==='Scene Heading'?'Next: a scene heading':MODE==='Dialogue'?(sp?'Next: '+sp+' speaking':'Next: say who speaks, "Ross says"'):'Next: action';
 $('vdHeard').textContent=HEAR?'"'+HEAR+'"':(SAID?'Last: "'+SAID+'"':(SR?'Say it. Your words go on the page where you see the tag.':'This browser can\'t listen. Use the full screen Voice and your keyboard\'s mic.'));
 dock.querySelectorAll('[data-vd]').forEach(x=>x.classList.toggle('on',x.dataset.vd===MODE));
 const m=$('vdMic'); m.classList.toggle('live',LIVE); $('vdMicT').textContent=LIVE?'LISTENING · TAP TO STOP':'TAP TO TALK'; m.setAttribute('aria-label',LIVE?'Stop listening':'Tap to talk'); m.disabled=!SR;
 document.body.classList.toggle('vlive',LIVE);
 place();
}
function openDock(){ refreshNames(); MODE=modeFromScript(); DOCK=true; document.body.classList.add('vdock'); drawDock(); }
function closeDock(){ stop(); DOCK=false; document.body.classList.remove('vdock','vlive'); ghost.style.display='none'; tag.style.display='none'; }

/* ---------- listening ---------- */
function start(){
 if(!SR){ say('This browser can\'t listen. Tap the box below and use your keyboard\'s mic: the same words work.',true); return; }
 WANT=true;
 try{ REC=REC||make(); REC.start(); }catch(e){}
 try{ if(navigator.wakeLock) navigator.wakeLock.request('screen').then(w=>lock=w).catch(()=>{}); }catch(e){}
}
function stop(){ WANT=false; try{ REC&&REC.stop(); }catch(e){} try{ lock&&lock.release(); }catch(e){} lock=null; LIVE=false; HEAR=''; draw(); }
function make(){
 const r=new SR(); r.continuous=true; r.interimResults=true; r.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US'));
 r.onstart=()=>{ if(!WANT){ try{ r.stop(); }catch(e){} return; } LIVE=true; draw(); };
 r.onresult=e=>{ let interim='';
  for(let k=e.resultIndex;k<e.results.length;k++){ const t=e.results[k][0].transcript; if(e.results[k].isFinal){ HEAR=''; handle(t); } else interim+=t; }
  HEAR=interim; draw(); };
 r.onerror=e=>{ const c=e&&e.error;
  if(c==='not-allowed'||c==='service-not-allowed'){ WANT=false; say('The mic is blocked for this page. Allow it in your browser settings, or use your keyboard\'s mic in the box below.',true); }
  else if(c==='network'){ WANT=false; say('This browser\'s speech needs a connection right now. Your keyboard\'s mic in the box below may still work.',true); }
  else if(c==='audio-capture'){ WANT=false; say('No microphone found.',true); } };
 // phones stop listening after a silence; start again, unless it keeps failing
 r.onend=()=>{ LIVE=false; HEAR=''; draw();
  if(!WANT) return;
  const now=Date.now(); restarts=restarts.filter(t=>now-t<10000); restarts.push(now);
  if(restarts.length>6){ WANT=false; say('The mic keeps dropping. Tap to talk again, or use the box below.',true); return; }
  setTimeout(()=>{ if(WANT) try{ r.start(); }catch(e){} },250); };
 return r;
}

/* ---------- wiring ---------- */
function open(){ refreshNames(); MODE=modeFromScript(); el.classList.add('on'); say(SR?'':'This browser can\'t listen. Use your keyboard\'s mic in the box below: the same words work.'); draw(); }
function close(){ stop(); el.classList.remove('on'); }
const vb=$('btnVoice'); if(vb) vb.onclick=()=>DOCK?closeDock():openDock(); fab.onclick=openDock;
$('vdMic').onclick=()=>WANT?stop():start();
$('vdUndo').onclick=()=>{ api.undo(); MODE=modeFromScript(); SAID=''; drawDock(); };
$('vdDone').onclick=closeDock;
$('vdFull').onclick=()=>{ const was=WANT; closeDock(); open(); if(was) start(); };
dock.querySelectorAll('[data-vd]').forEach(x=>x.onclick=()=>{ MODE=x.dataset.vd; drawDock(); });
const scr=document.getElementById('scroll'); if(scr) scr.addEventListener('scroll',()=>{ if(DOCK&&!LIVE) place(); },{passive:true});
window.addEventListener('resize',()=>{ if(DOCK) place(); });
$('vwClose').onclick=close;
$('vwMic').onclick=()=>WANT?stop():start();
$('vwUndo').onclick=()=>{ api.undo(); MODE=modeFromScript(); say('Undone.'); draw(); };
$('vwNewLine').onclick=()=>handle('new line');
$('vwAlt').onclick=()=>handle('try again');
el.querySelectorAll('[data-vm]').forEach(x=>x.onclick=()=>{ MODE=x.dataset.vm; say(''); draw(); });
const go=()=>{ const v=$('vwType').value; $('vwType').value=''; handle(v); };
$('vwGo').onclick=go; $('vwType').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } });
$('vwHelp').onclick=()=>$('vwCard').classList.add('on');
/* PASTE WHAT YOU SAID (was SignalScript): the cleaning only, never other words for yours */
let PASTED=null;
$('vwPasteOpen').onclick=()=>{ $('vwPaste').classList.add('on'); setTimeout(()=>$('vwPasteIn').focus(),50); };
$('vwPasteClose').onclick=()=>$('vwPaste').classList.remove('on');
$('vwPasteFile').onclick=()=>{ const i=document.createElement('input'); i.type='file'; i.accept='.txt,.srt,.vtt,.md'; i.onchange=()=>{ const f=i.files[0]; if(f) f.text().then(t=>{ $('vwPasteIn').value=t; }); }; i.click(); };
$('vwPasteGo').onclick=()=>{ const raw=$('vwPasteIn').value, SC=window.SignalClean;
 if(!raw.trim()){ $('vwPasteOut').innerHTML='<p class="note">Paste something first.</p>'; return; }
 if(!SC){ $('vwPasteOut').innerHTML='<p class="note">The cleaner didn\'t load. Reload the page.</p>'; return; }
 PASTED=SC.process(raw,SC.LEVELS[$('vwPasteLvl').value]); const m=PASTED.metrics;
 $('vwPasteOut').innerHTML='<p class="note" style="margin:6px 0">'+m.raw_words+' words in, '+m.clean_words+' out. '+m.fillers_removed+' filler'+(m.fillers_removed===1?'':'s')+' taken out.</p>'
  +'<div style="background:#f4f1ea;color:#16130f;border-radius:8px;padding:10px;max-height:30vh;overflow:auto;white-space:pre-wrap;font-size:15px;line-height:1.5" id="vwPasteClean">'+esc(PASTED.clean)+'</div>'
  +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button id="vwPasteIns" style="background:var(--mark);border-color:var(--mark);color:var(--mark-ink);font-weight:600">PUT IT IN THE SCRIPT</button><button id="vwPasteCopy">Copy it</button></div>';
 $('vwPasteIns').onclick=()=>{ api.applyResult(PASTED,{tool:'SignalScript',scope:'block',insert:true}); say('In the script: '+PASTED.metrics.clean_words+' words. Your exact words are in the change trail.'); $('vwPaste').classList.remove('on'); draw(); };
 $('vwPasteCopy').onclick=()=>{ try{ navigator.clipboard.writeText(PASTED.clean).then(()=>say('Copied.'),()=>say('Copy didn\'t work here.')); }catch(e){ say('Copy didn\'t work here.'); } };
};
el.addEventListener('click',e=>{ if(e.target&&e.target.id==='vwCardClose') $('vwCard').classList.remove('on'); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&WANT) stop(); });
if(/[?&]voice\b/.test(location.search)) setTimeout(open,300);
window.__voice={handle:handle,open:open,close:close,openDock:openDock,closeDock:closeDock,hear:t=>{ HEAR=t||''; draw(); },state:()=>({MODE,WANT,LIVE,NAMES,DOCK})};
})();
