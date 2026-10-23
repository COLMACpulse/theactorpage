/* THEACTORPAGE SPARK: one small thing to do, in ACT, WRITE or FILM. Only when you tap SPARK.
   No counts, no streaks, no badges, no reminders, nothing that pops up by itself. It uses what you have
   in play (your sides and your part, a tape due, your draft, your film) when there is something, and a
   general one when there isn't. The only thing it remembers is the last one it showed you, so it doesn't
   show it twice in a row. Nothing leaves this device.
   Spark.pick(room, ctx, last) is pure, for the tests. */
(function(g){
const S={};
const fill=(t,c)=>t.replace(/\{(\w+)\}/g,(m,k)=>c[k]||'');
/* {t: the spark, go: where GO takes you, label: what GO says, need: what of yours it uses} */
S.LIST={
 act:[
  {t:'Say {me}’s first speech out loud, once. No tape.',go:'memorizer/?open=1',label:'MEMORIZER',need:['me']},
  {t:'Read {sides} start to finish, out loud, every part.',go:'actor-os/?open=1',label:'ACTOR OS',need:['sides']},
  {t:'Pick one line of {me}’s. Say it three different ways.',go:'memorizer/?open=1',label:'MEMORIZER',need:['me']},
  {t:'Tape one take of {sides}. Just one. Don’t watch it yet.',go:'actor-os/?open=1',label:'ACTOR OS',need:['sides']},
  {t:'{tape} is due {due}. Run it once, out loud, before you tape.',go:'actor-os/?open=1',label:'ACTOR OS',need:['tape']},
  {t:'Read one page of anything out loud, as someone who isn’t you.',go:'actor-os/',label:'ACTOR OS'},
  {t:'Say one line from a movie you love the way you’d do it. Then the opposite way.',go:'#cam',label:'CAMERA'},
  {t:'Watch one scene of something good with the sound off. What are they doing to each other?'},
  {t:'Tape ten seconds of you listening. No lines.',go:'#cam',label:'CAMERA'}
 ],
 write:[
  {t:'Open {draft} and change one line.',go:'papertrail/',label:'PAPER TRAIL',need:['draft']},
  {t:'Write what happens right after the last scene of {draft}. One paragraph.',go:'write/writers-blockage.html?go',label:'GO',need:['draft']},
  {t:'Write the first line of a scene you’d want to be in.',go:'write/writers-blockage.html?go',label:'GO'},
  {t:'Write down something you overheard today, word for word.',go:'write/writers-blockage.html?go',label:'GO'},
  {t:'Two people want the same thing. Give each of them one line.',go:'write/writers-blockage.html?go',label:'GO'},
  {t:'Say a story idea out loud. Ten seconds. Don’t fix it.',go:'write/writers-blockage.html?go',label:'GO'},
  {t:'Name a character. Write what they’d never say out loud.',go:'write/writers-blockage.html?go',label:'GO'}
 ],
 film:[
  {t:'Shoot ten seconds of where {film} could happen.',go:'film/',label:'STORY STUDIO',need:['film']},
  {t:'Scout one place for {film}. One photo.',go:'film/',label:'STORY STUDIO',need:['film']},
  {t:'Shoot the first shot of {film}. Just that one.',go:'film/',label:'STORY STUDIO',need:['film']},
  {t:'Shoot ten seconds of light coming through a window.',go:'#cam',label:'CAMERA'},
  {t:'Shoot one thing from three heights: low, eye level, high.',go:'#cam',label:'CAMERA'},
  {t:'Film your hands doing something you do every day.',go:'#cam',label:'CAMERA'},
  {t:'Find a place you’d shoot a scene. Take one photo of it.',go:'#cam',label:'CAMERA'}
 ]
};
/* ctx: {me, sides, tape, due, draft, film}. Sparks that use what you have come first; the rest fill in.
   last: the text shown last time, never shown twice in a row. rnd: () => 0..1 */
S.pick=function(room,ctx,last,rnd){
 ctx=ctx||{}; rnd=rnd||Math.random;
 const L=(S.LIST[room]||[]).filter(x=>(x.need||[]).every(k=>ctx[k]));
 const yours=L.filter(x=>x.need&&x.need.length), gen=L.filter(x=>!x.need||!x.need.length);
 const pool=(yours.length&&rnd()<0.7?yours:gen.length?gen:yours).map(x=>Object.assign({},x,{t:fill(x.t,ctx)}));
 const fresh=pool.filter(x=>x.t!==last);
 const from=fresh.length?fresh:pool;
 return from.length?from[Math.floor(rnd()*from.length)%from.length]:null;
};

/* ---------- on the page ---------- */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
const plain=f=>String(f||'').replace(/\.(pdf|fdx|fountain|txt|docx)$/i,'').replace(/[_]+/g,' ').trim();
S.ctx=function(){
 const c={};
 try{ const away=LS('home_inplay_away')||[]; const sh=(g.Shelf?g.Shelf.all():[]).filter(x=>!away.includes('s:'+x.id)); const s=sh.find(x=>x.me)||sh[0]; if(s){ c.sides=plain(s.file); if(s.me) c.me=s.me; } }catch(e){}   // your part and its sides, from the same script; not what you put away
 try{ const now=new Date().toISOString().slice(0,16); const r=(g.Inbox?g.Inbox.all('request'):[]).filter(x=>x.data.due&&x.data.due>=now).sort((a,b)=>String(a.data.due).localeCompare(String(b.data.due)))[0];
  if(r){ c.tape=r.data.title||r.data.role||'Your tape'; c.due=r.data.dueObj&&g.HubReq?g.HubReq.dueWords(r.data.dueObj).split(' = ').pop():(r.data.dueWords||'soon'); } }catch(e){}
 try{ const pt=LS('paper_trail_v1'); const p=pt&&pt.projects&&Object.values(pt.projects).filter(x=>x&&!x.retired).sort((a,b)=>(b.updated||0)-(a.updated||0))[0]; if(p&&p.title) c.draft=p.title; }catch(e){}
 try{ const f=g.Rooms&&g.Rooms.filmData?g.Rooms.filmData():null; if(f&&f.title) c.film=f.title; }catch(e){}
 return c;
};
const KEY=r=>'spark_last_'+r;
function show(box,room){
 let last=''; try{ last=localStorage.getItem(KEY(room))||''; }catch(e){}
 const x=S.pick(room,S.ctx(),last); if(!x){ box.innerHTML=''; return; }
 try{ localStorage.setItem(KEY(room),x.t); }catch(e){}
 box.innerHTML='<div class="spark-card" role="status"><p>'+esc(x.t)+'</p><div class="spark-row">'
  +(x.go?(x.go==='#cam'?'<button type="button" class="spark-go" data-cam>'+esc(x.label)+'</button>':'<a class="spark-go" href="'+esc(x.go)+'">'+esc(x.label)+'</a>'):'')
  +'<button type="button" data-another>ANOTHER</button><button type="button" data-notnow>NOT NOW</button></div></div>';
 box.querySelector('[data-another]').onclick=()=>show(box,room);
 box.querySelector('[data-notnow]').onclick=()=>{ box.innerHTML=''; const b=box.parentNode&&box.parentNode.querySelector('.spark-btn'); if(b){ b.setAttribute('aria-expanded','false'); b.focus(); } };
 const cam=box.querySelector('[data-cam]'); if(cam) cam.onclick=()=>{ const t=document.getElementById('stcam'); if(t){ t.scrollIntoView({block:'center'}); t.click(); } };
}
S.mount=function(){
 document.querySelectorAll('[data-spark]').forEach(el=>{ if(el.dataset.on) return; el.dataset.on='1'; const room=el.dataset.spark;
  el.innerHTML='<button type="button" class="spark-btn" aria-expanded="false">SPARK</button><div class="spark-box"></div>';
  const b=el.querySelector('.spark-btn'), box=el.querySelector('.spark-box');
  b.onclick=()=>{ if(box.innerHTML){ box.innerHTML=''; b.setAttribute('aria-expanded','false'); } else { show(box,room); b.setAttribute('aria-expanded','true'); } }; });
};
g.Spark=S;
if(typeof module!=='undefined') module.exports=S;
if(typeof document!=='undefined'){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',S.mount); else S.mount(); }
})(typeof window!=='undefined'?window:globalThis);
