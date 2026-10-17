/* THEACTORPAGE PRACTICE SCENE: a short scene to work on when you have nothing to tape. Only when you tap it.
   Closed by default. Says what it is, which part you play, and what each button does before you press it.
   Uses DailyScenes (shared/scenes.js) for the scenes and Shelf for the hand-off, so the tool you open
   already has the scene with your part picked. Nothing leaves this device. */
(function(g){
const P={};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
P.WORKS={secret:'playing a secret',comedy:'comedy',listening:'listening',objective:'going after what you want',relationship:'a relationship',
 reversal:'a turn in the middle',silence:'what nobody says',status:'who has the upper hand',tactic:'changing tactics',circumstance:'where you are and what just happened'};
P.works=s=>P.WORKS[s&&s.trains]||String((s&&s.trains)||'');
/* the hand-off to Writer's Blockage: the scene as a script, with a note at the top that it's yours to change */
P.premise=s=>({from:'daily',title:s.title,fountain:'[[Practice scene: '+s.title+'. Works on '+P.works(s)+'. '+s.setup+' Change anything you like.]]\n\n'+s.text,at:Date.now()});
let ME='';
function card(D,box,root){
 const s=D.today(), parts=D.parts(s), me=parts.indexOf(ME)>=0?ME:s.you;
 box.innerHTML='<div class="spark-card practice-card"><p class="pr-what">A short scene written for this site, for two people. Any actor can play either part. Pick your part, then what to do with it.</p>'
  +'<p><b>'+esc(s.title)+'</b> · works on '+esc(P.works(s))+(D.isDone(s.id)?' · <span class="pr-done">done</span>':'')+'</p>'
  +'<p class="pr-set">'+esc(s.setup)+(me!==s.you?' (Written for '+esc(s.you)+'. You\'re playing '+esc(me)+'.)':'')+'</p>'
  +'<div class="spark-row pr-parts"><span>YOU PLAY</span>'+parts.map(n=>'<button type="button" data-pme="'+esc(n)+'" class="'+(n===me?'spark-go':'')+'" aria-pressed="'+(n===me)+'">'+esc(n)+'</button>').join('')+'</div>'
  +'<div class="spark-row"><a class="spark-go" href="'+root+'actor-os/" data-pgo="tape">TAPE IT</a><a class="spark-go" href="'+root+'memorizer/" data-pgo="learn">LEARN THE LINES</a><a class="spark-go" href="'+root+'write/writers-blockage.html" data-pgo="write">REWRITE IT</a></div>'
  +'<p class="pr-how">Tape it: Actor OS opens with the scene loaded and you as '+esc(me)+'. Learn the lines: Memorizer, same. Rewrite it: Writer\'s Blockage opens it as a script you can change.</p>'
  +'<div class="spark-row"><button type="button" data-pnext>ANOTHER SCENE</button><button type="button" data-pclose>CLOSE</button><span class="pr-count">'+D.doneCount()+' of '+D.all().length+' done</span></div></div>';
 box.querySelectorAll('[data-pme]').forEach(b=>b.onclick=()=>{ ME=b.dataset.pme; card(D,box,root); });
 box.querySelector('[data-pnext]').onclick=()=>{ ME=''; D.today({another:true}); card(D,box,root); };
 box.querySelectorAll('[data-pgo]').forEach(a=>a.onclick=()=>{ const s2=D.today(), m2=D.parts(s2).indexOf(ME)>=0?ME:s2.you;
  try{ if(a.dataset.pgo==='write') g.localStorage.setItem('theactorpage_handoff_premise',JSON.stringify(P.premise(s2))); else D.toShelf(s2,m2); }catch(e){} });
}
P.mount=function(){
 const D=g.DailyScenes; if(!D||typeof document==='undefined') return;
 document.querySelectorAll('[data-practice]').forEach(el=>{ if(el.dataset.on) return; el.dataset.on='1'; const root=el.dataset.practice||'';
  el.innerHTML='<button type="button" class="spark-btn" aria-expanded="false">PRACTICE SCENE</button><div class="spark-box"></div>';
  const b=el.querySelector('.spark-btn'), box=el.querySelector('.spark-box');
  const close=()=>{ box.innerHTML=''; b.setAttribute('aria-expanded','false'); };
  box.addEventListener('click',e=>{ if(e.target.closest('[data-pclose]')) close(); });
  b.onclick=()=>{ if(box.innerHTML) return close(); card(D,box,root); b.setAttribute('aria-expanded','true'); }; });
};
g.Practice=P;
if(typeof module!=='undefined') module.exports=P;
if(typeof document!=='undefined'){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',P.mount); else P.mount(); }
})(typeof window!=='undefined'?window:globalThis);
