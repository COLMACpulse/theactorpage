/* THEACTORPAGE PRACTICE SCENE: a short two-person scene, only when you tap it. From your own material first (a cut,
   word for word, via ./yourscenes.js), or a random AI-written prompt, and it says plainly which. Keeps to its own lane: TAPE IT and LEARN hand that one scene to that one tool, once. Never on the shelf. */
(function(g){
const P={};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
P.WORKS={secret:'playing a secret',comedy:'comedy',listening:'listening',objective:'going after what you want',relationship:'a relationship',
 reversal:'a turn in the middle',silence:'what nobody says',status:'who has the upper hand',tactic:'changing tactics',circumstance:'where you are and what just happened'};
P.works=s=>P.WORKS[s&&s.trains]||String((s&&s.trains)||'');
/* the hand-off to Writer's Blockage: the scene as a script, with a note at the top that it's yours to change */
P.premise=s=>({from:'daily',title:s.title,fountain:'[[Practice scene: '+s.title+'. Works on '+P.works(s)+'. '+s.setup+' Written by AI as a practice prompt, not from anything real. Change anything you like.]]\n\n'+s.text,at:Date.now()});
let ME='', MODE='';
P.NOTE='Practice prompts, not plays. Written by AI, not by me, and not from anything real. Short and random, there to get you moving when you\'ve got nothing to tape. Change anything.';
/* a cut from your material: say where it's from, and that it's word for word */
P.yoursNote=c=>'Cut from your material: '+c.src+(g.YourScenes&&g.YourScenes.where(c)?', '+g.YourScenes.where(c):'')+'. Word for word, just the stretch where these two talk. Nothing added, nothing changed.';
P.premiseYours=c=>({from:'daily',title:c.title,fountain:'[[Practice cut from '+c.src+(c.head?', '+c.head:'')+'. Word for word from your material. Change anything you like.]]\n\n'+c.text,at:Date.now()});
function card(D,box,root,hooks){ hooks=hooks||{};
 const Y=g.YourScenes;
 if(Y&&!Y.loaded){ Y.loaded=true; box.innerHTML='<div class="spark-card practice-card"><p class="pr-what">Looking through your material…</p></div>';
  Y.load().catch(()=>[]).then(()=>card(D,box,root,hooks)); return; }
 const have=!!(Y&&Y.all().length); if(!MODE||(MODE==='yours'&&!have)) MODE=have?'yours':'ai';
 const yours=MODE==='yours', s=yours?Y.current():D.current(), parts=D.parts(s), me=parts.indexOf(ME)>=0?ME:s.you;
 box.innerHTML='<div class="spark-card practice-card'+(yours?' pr-yours':'')+'"><p class="pr-what">'+esc(yours?P.yoursNote(s):P.NOTE)+'</p>'
  +'<p><b>'+esc(s.title)+'</b>'+(yours?' · '+s.speeches+' speeches'+(s.from?' · from '+esc(s.from):''):' · works on '+esc(P.works(s)))+'</p>'
  +(yours?'':'<p class="pr-set">'+esc(s.setup)+(me!==s.you?' (You\'re playing '+esc(me)+'.)':'')+'</p>')
  +'<div class="spark-row pr-parts"><span>YOU PLAY</span>'+parts.map(n=>'<button type="button" data-pme="'+esc(n)+'" class="'+(n===me?'spark-go':'')+'" aria-pressed="'+(n===me)+'">'+esc(n)+'</button>').join('')+'</div>'
  +'<div class="spark-row"><a class="spark-go" href="'+root+'actor-os/" data-pgo="tape">TAPE IT</a><a class="spark-go" href="'+root+'memorizer/" data-pgo="learn">LEARN THE LINES</a><a class="spark-go" href="'+root+'write/writers-blockage.html" data-pgo="write">REWRITE IT</a></div>'
  +'<p class="pr-how">It stays out of your real work: it never goes on your sides shelf or replaces the sides you\'re working on. Tape it or learn it here, once, as '+esc(me)+'.</p>'
  +'<div class="spark-row"><button type="button" data-pnext>ANOTHER ONE</button>'
  +(yours?'<button type="button" data-pmode="ai">RANDOM PROMPT INSTEAD</button>':have?'<button type="button" data-pmode="yours">ONE FROM YOUR MATERIAL</button>':'')
  +'<button type="button" data-pclose>CLOSE</button></div></div>';
 const again=()=>card(D,box,root,hooks);
 box.querySelectorAll('[data-pme]').forEach(b=>b.onclick=()=>{ ME=b.dataset.pme; again(); });
 box.querySelector('[data-pnext]').onclick=()=>{ ME=''; if(MODE==='yours') Y.pick(); else D.pick(); again(); };
 box.querySelectorAll('[data-pmode]').forEach(b=>b.onclick=()=>{ ME=''; MODE=b.dataset.pmode; again(); });
 box.querySelectorAll('[data-pgo]').forEach(a=>a.onclick=e=>{ const s2=MODE==='yours'?Y.current():D.current(), m2=D.parts(s2).indexOf(ME)>=0?ME:s2.you;
  if(a.dataset.pgo==='tape'&&hooks.onTape){ e.preventDefault(); hooks.onTape(s2,m2); return; }
  try{ if(a.dataset.pgo==='write') g.localStorage.setItem('theactorpage_handoff_premise',JSON.stringify(s2.yours?P.premiseYours(s2):P.premise(s2))); else D.handoff(s2,m2,a.dataset.pgo==='tape'?'actor-os':'memorizer'); }catch(e){} });
}
P.card=function(box,root,hooks){ const D=g.DailyScenes; if(D&&box) card(D,box,root||'',hooks); };
P.mount=function(){
 const D=g.DailyScenes; if(!D||typeof document==='undefined') return;
 document.querySelectorAll('[data-practice]').forEach(el=>{ if(el.dataset.on) return; el.dataset.on='1'; const root=el.dataset.practice||'';
  D.cleanShelf(); el.innerHTML='<button type="button" class="spark-btn pr-link" aria-expanded="false">Practice scene</button><div class="spark-box"></div>';
  const b=el.querySelector('.spark-btn'), box=el.querySelector('.spark-box');
  const close=()=>{ box.innerHTML=''; b.setAttribute('aria-expanded','false'); };
  box.addEventListener('click',e=>{ if(e.target.closest('[data-pclose]')) close(); });
  b.onclick=()=>{ if(box.innerHTML) return close(); card(D,box,root); b.setAttribute('aria-expanded','true'); }; });
};
g.Practice=P;
if(typeof module!=='undefined') module.exports=P;
if(typeof document!=='undefined'){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',P.mount); else P.mount(); }
})(typeof window!=='undefined'?window:globalThis);
