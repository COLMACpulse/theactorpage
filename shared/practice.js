/* THEACTORPAGE PRACTICE SCENE: a random short scene, only when you tap it. Says plainly what it is (AI-written prompts,
   not plays). Keeps to its own lane: TAPE IT and LEARN hand that one scene to that one tool, once. Never on the shelf. */
(function(g){
const P={};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
P.WORKS={secret:'playing a secret',comedy:'comedy',listening:'listening',objective:'going after what you want',relationship:'a relationship',
 reversal:'a turn in the middle',silence:'what nobody says',status:'who has the upper hand',tactic:'changing tactics',circumstance:'where you are and what just happened'};
P.works=s=>P.WORKS[s&&s.trains]||String((s&&s.trains)||'');
/* the hand-off to Writer's Blockage: the scene as a script, with a note at the top that it's yours to change */
P.premise=s=>({from:'daily',title:s.title,fountain:'[[Practice scene: '+s.title+'. Works on '+P.works(s)+'. '+s.setup+' Written by AI as a practice prompt, not from anything real. Change anything you like.]]\n\n'+s.text,at:Date.now()});
let ME='';
P.NOTE='Practice prompts, not plays. Written by AI, not by me, and not from anything real. Short and random, there to get you moving when you\'ve got nothing to tape. Change anything.';
function card(D,box,root,hooks){ hooks=hooks||{};
 const s=D.current(), parts=D.parts(s), me=parts.indexOf(ME)>=0?ME:s.you;
 box.innerHTML='<div class="spark-card practice-card"><p class="pr-what">'+esc(P.NOTE)+'</p>'
  +'<p><b>'+esc(s.title)+'</b> · works on '+esc(P.works(s))+'</p>'
  +'<p class="pr-set">'+esc(s.setup)+(me!==s.you?' (You\'re playing '+esc(me)+'.)':'')+'</p>'
  +'<div class="spark-row pr-parts"><span>YOU PLAY</span>'+parts.map(n=>'<button type="button" data-pme="'+esc(n)+'" class="'+(n===me?'spark-go':'')+'" aria-pressed="'+(n===me)+'">'+esc(n)+'</button>').join('')+'</div>'
  +'<div class="spark-row"><a class="spark-go" href="'+root+'actor-os/" data-pgo="tape">TAPE IT</a><a class="spark-go" href="'+root+'memorizer/" data-pgo="learn">LEARN THE LINES</a><a class="spark-go" href="'+root+'write/writers-blockage.html" data-pgo="write">REWRITE IT</a></div>'
  +'<p class="pr-how">It stays out of your real work: it never goes on your sides shelf or replaces the sides you\'re working on. Tape it or learn it here, once, as '+esc(me)+'.</p>'
  +'<div class="spark-row"><button type="button" data-pnext>ANOTHER ONE</button><button type="button" data-pclose>CLOSE</button></div></div>';
 box.querySelectorAll('[data-pme]').forEach(b=>b.onclick=()=>{ ME=b.dataset.pme; card(D,box,root,hooks); });
 box.querySelector('[data-pnext]').onclick=()=>{ ME=''; D.pick(); card(D,box,root,hooks); };
 box.querySelectorAll('[data-pgo]').forEach(a=>a.onclick=e=>{ const s2=D.current(), m2=D.parts(s2).indexOf(ME)>=0?ME:s2.you;
  if(a.dataset.pgo==='tape'&&hooks.onTape){ e.preventDefault(); hooks.onTape(s2,m2); return; }
  try{ if(a.dataset.pgo==='write') g.localStorage.setItem('theactorpage_handoff_premise',JSON.stringify(P.premise(s2))); else D.handoff(s2,m2,a.dataset.pgo==='tape'?'actor-os':'memorizer'); }catch(e){} });
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
