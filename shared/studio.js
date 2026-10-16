/* THEACTORPAGE HOME: CAMERA, MIC, TYPEWRITER.
   Shoot first, say what it's for after, and it already knows what's in play:
   the tape due for a request, the sides on the shelf and your part, the scene you're shooting.
   Uses shared/capture.js (the one camera and mic) and shared/takes.js (the takes shelf). */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const C=window.Capture, T=window.Takes, I=window.Inbox, Sh=window.Shelf, Y=window.You;
if(!C||!T||!$('studio')) return;

/* what this could be for, from what's in play; the first is the default */
function purposes(kind){
 const out=[], now=new Date().toISOString().slice(0,16);
 (I?I.all('request'):[]).filter(x=>x.data.role||x.data.title).filter(x=>!x.data.due||x.data.due>=now).sort((a,b)=>String(a.data.due||'9').localeCompare(String(b.data.due||'9'))).forEach(x=>{
  out.push({type:'selftape',label:'Self-tape: '+[x.data.role,x.data.title].filter(Boolean).join(' · ')+(x.data.dueObj&&window.HubReq?' (due '+HubReq.dueWords(x.data.dueObj).split(' = ').pop()+')':''),role:x.data.role,title:x.data.title,inbox:x.id}); });
 const cur=Sh&&Sh.current(); if(cur) out.push({type:'practice',label:'Practice: '+(cur.me?cur.me+' in ':'')+String(cur.file||'').replace(/\.[a-z0-9]+$/i,''),role:cur.me||'',sides:cur.id});
 let film=null; try{ const d=JSON.parse(localStorage.getItem('film_os_v1')||'null'); if(d&&d.cur&&d.scripts[d.cur]) film={id:d.cur,file:d.scripts[d.cur].file}; }catch(e){}
 if(kind==='video'&&film) out.push({type:'scene',label:'Scene take: '+String(film.file||'your script').replace(/\.[a-z0-9]+$/i,'').replace(/_/g,' '),script:film.id,scene:1});
 if(kind==='video') out.push({type:'clip',label:'A clip for your reel'});
 out.push({type:'voice',label:kind==='video'?'Just keep it':'Voice note'});
 return out;
}
const nameOf=()=>{ const y=Y&&Y.get(); return (y&&y.name)||localStorage.getItem('actor_os_name')||''; };

let S=null;   // {kind, stream, rec, facing, timer, cap, blob, result, purposes, pick}
let CAP=0;    // 30 SECONDS: a hard stop at :30, remembered while the page is open
function shell(){
 let o=$('studioOv'); if(o) return o;
 o=document.createElement('div'); o.id='studioOv'; o.className='stov'; document.body.appendChild(o); return o;
}
async function open(kind){
 S={kind, facing:'user', timer:0, cap:CAP, purposes:purposes(kind)}; S.pick=0;
 const o=shell(); o.hidden=false; document.body.classList.add('stopen');
 o.innerHTML='<div class="stv">'+(kind==='video'?'<video id="stvid" playsinline muted autoplay></video>':'<canvas id="stmeter" width="600" height="160"></canvas>')+'<div class="stcount" id="stcount"></div><div class="stmsg" id="stmsg"></div></div>'
  +'<div class="stbar"><select id="stfor" aria-label="What it is for">'+S.purposes.map((p,i)=>'<option value="'+i+'">'+esc(p.label)+'</option>').join('')+'</select><label class="stscene" id="stscenel" hidden>Scene <input id="stscene" type="number" min="1" value="1" inputmode="numeric"></label>'
  +'<div class="strow">'+(kind==='video'?'<button id="stflip">FLIP</button><button id="sttimer">TIMER: OFF</button><button id="stsnap">PHOTO</button>':'')+'<button id="stcap" aria-pressed="'+(S.cap?'true':'false')+'">'+(S.cap?'30 SEC: ON':'30 SEC: OFF')+'</button>'+'<button class="strec" id="strec" aria-label="Record"><span></span></button><button id="stclose">CLOSE</button></div></div>';
 const sync=()=>{ S.pick=+$('stfor').value; $('stscenel').hidden=(S.purposes[S.pick]||{}).type!=='scene'; };
 $('stfor').onchange=sync; sync();
 $('stclose').onclick=close;
 $('stcap').onclick=()=>{ if(S.rec) return; S.cap=CAP=S.cap?0:30; $('stcap').textContent=S.cap?'30 SEC: ON':'30 SEC: OFF'; $('stcap').setAttribute('aria-pressed',S.cap?'true':'false'); $('stmsg').textContent=S.cap?'Hard stop at :30. One take, then keep it or go again.':''; };
 $('strec').onclick=()=>S.rec?stopRec():startRec();
 if(kind==='video'){ $('stflip').onclick=()=>{ S.facing=S.facing==='user'?'environment':'user'; live(); }; $('sttimer').onclick=()=>{ S.timer=S.timer===0?3:S.timer===3?10:0; $('sttimer').textContent='TIMER: '+(S.timer?S.timer+'s':'OFF'); }; $('stsnap').onclick=snap; }
 await live();
}
async function live(){
 C.stop(S.stream); S.stream=null;
 try{ S.stream=await C.open({video:S.kind==='video',audio:true,facing:S.facing}); }
 catch(e){ $('stmsg').textContent=C.errorWords(e,S.kind==='video'?'video':'audio'); return; }
 $('stmsg').textContent='';
 if(S.kind==='video'){ const v=$('stvid'); v.srcObject=S.stream; v.classList.toggle('mirror',S.facing==='user'); v.play().catch(()=>{}); }
 else meter();
}
function meter(){ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(), src=ac.createMediaStreamSource(S.stream), an=ac.createAnalyser(); an.fftSize=1024; src.connect(an); S.ac=ac; const buf=new Uint8Array(an.fftSize), c=$('stmeter'), x=c.getContext('2d');
 const draw=()=>{ if(!S||!S.ac) return; an.getByteTimeDomainData(buf); x.fillStyle='#0d0f12'; x.fillRect(0,0,c.width,c.height); x.strokeStyle='#e0a23c'; x.lineWidth=2; x.beginPath(); for(let i=0;i<buf.length;i++){ const px=i/buf.length*c.width, py=buf[i]/255*c.height; i?x.lineTo(px,py):x.moveTo(px,py); } x.stroke(); requestAnimationFrame(draw); }; draw(); }catch(e){} }
async function startRec(){
 if(!S.stream) return;
 if(S.timer){ for(let i=S.timer;i>0;i--){ $('stcount').textContent=i; await new Promise(r=>setTimeout(r,1000)); if(!S) return; } $('stcount').textContent=''; }
 try{ S.rec=C.record(S.stream,S.kind); }catch(e){ $('stmsg').textContent=e.message; return; }
 $('strec').classList.add('on'); S.t0=Date.now(); const cb=$('stcap'); if(cb) cb.disabled=true;
 const show=()=>{ if(!S||!S.rec) return; const el=(Date.now()-S.t0)/1000; $('stcount').textContent=S.cap?'● '+fmt(Math.ceil(Math.max(0,S.cap-el)))+' left':'● '+fmt(Math.floor(el)); };
 S.tick=setInterval(show,250); show();
 if(S.cap){ const me=S.rec; S.capT=setTimeout(()=>{ if(S&&S.rec===me){ S.capped=true; stopRec(); } },S.cap*1000); }
}
const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
async function stopRec(){
 clearTimeout(S.capT); const r=await S.rec.stop(); clearInterval(S.tick); S.rec=null; $('strec').classList.remove('on'); $('stcount').textContent='';
 C.stop(S.stream); S.stream=null; try{ S.ac&&S.ac.close(); }catch(e){} S.ac=null;
 S.result=r; review();
}
function review(){
 const r=S.result, url=URL.createObjectURL(r.blob); S.url=url;
 $('studioOv').querySelector('.stv').innerHTML=(S.kind==='video'?'<video src="'+url+'" controls playsinline></video>':'<audio src="'+url+'" controls></audio>')+'<div class="stmsg">'+(S.capped?'Stopped at :30. ':'')+fmt(Math.round(r.secs))+' · '+(r.blob.size/1048576).toFixed(1)+' MB · '+esc(r.mime.split(';')[0])+'</div>';
 $('studioOv').querySelector('.strow').innerHTML='<button class="strec keep" id="stkeep">KEEP</button><button id="stagain">AGAIN</button><button id="stclose2">CLOSE</button>';
 $('stkeep').onclick=keep; $('stagain').onclick=()=>{ URL.revokeObjectURL(url); open(S.kind); };   // AGAIN keeps 30 SEC as it was $('stclose2').onclick=close;
}
async function keep(){
 const p=Object.assign({},S.purposes[S.pick]||{type:'voice'}), r=S.result; if(p.type==='scene') p.scene=Math.max(1,+(($('stscene')||{}).value)||1);
 const n=T.all(p.type).filter(x=>(x.for.role||'')===(p.role||'')&&(x.for.title||'')===(p.title||'')).length+1;
 const name=C.fileName({name:nameOf(),role:p.role||(p.type==='voice'?'voice note':p.type),n,ext:r.ext});
 const it=await T.put(r.blob,{kind:S.kind,mime:r.mime,ext:r.ext,secs:r.secs,name,for:Object.assign({},p,{label:undefined}),label:p.label});
 const res=S.kind; close();
 shown(it,res);
}
async function snap(){
 const v=$('stvid'); if(!v||!v.videoWidth||!Y) return; const b=await C.snap(v,S.facing==='user');
 const f=new File([b],'headshot '+new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')+'.jpg',{type:'image/jpeg'});
 const r=await Y.addPhoto(f); $('stmsg').textContent=r.error?r.error:(Y.get().primary===r.photo.id?'Kept as your main headshot.':'Kept in your headshots.');
}
function close(){ if(!S) return; clearTimeout(S.capT); try{ S.rec&&S.rec.cancel(); }catch(e){} clearInterval(S.tick); C.stop(S.stream); try{ S.ac&&S.ac.close(); }catch(e){} S=null; const o=$('studioOv'); if(o){ o.hidden=true; o.innerHTML=''; } document.body.classList.remove('stopen'); }
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&S&&!S.rec) close(); });

const WHERE={selftape:[['Actor OS','in your takes, to trim, slate and send','actor-os/'],['Project Hub','on the audition','hub/']],practice:[['Actor OS','in your takes','actor-os/']],scene:[['Story Studio','on the scene in CUT, the file kept','film/']],clip:[['Project Hub','in your library as a clip','hub/']],voice:[]};
function shown(it){
 const box=$('took'); const u=WHERE[it.for.type]||[];
 const h='<div class="tk k-take"><h4>'+esc(T.FOR[it.for.type]||'Take')+': '+esc(it.name)+'</h4><div class="why">'+esc(it.label||'')+' · '+fmt(Math.round(it.secs||0))+'</div>'
  +'<div class="went">'+(it.kept?'On the takes shelf.':'This phone wouldn\'t keep it. Save it to the phone now.')+(u.length?' The next time you open '+u.map(x=>x[0]).join(' or ')+', it\'s there.':'')+'</div>'
  +'<div class="parts"><button data-save="'+it.id+'">SAVE TO PHONE</button></div>'
  +(u.length?'<ul>'+u.map(([t,w,href])=>'<li><a href="'+href+'">'+esc(t.toUpperCase())+'</a> '+esc(w)+'</li>').join('')+'</ul>':'')+'</div>';
 box.insertAdjacentHTML('afterbegin',h);
 box.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{ const ok=await T.saveToPhone(b.dataset.save); if(ok) b.textContent='SAVED'; });
 box.scrollIntoView({block:'nearest',behavior:'smooth'});
}
$('stcam').onclick=()=>open('video');
$('stmic').onclick=()=>open('audio');
window.__studio={purposes,open,close,cap:()=>CAP};
})();
