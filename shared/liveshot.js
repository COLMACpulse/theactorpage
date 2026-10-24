/* THEACTORPAGE LIVE SHOT: five seconds of you, on a loop. Used by HEADSHOTS (the live one) and LOOKS (a live look).
   The camera is on only while this is open, and says so (shared/hot.js shows the bar). Front or back, 3 / 5 / 8 seconds
   (5 to start), a timer, sound off unless you turn it on. No filter, no touch-up. Ten frames kept as it records; tap one
   to keep it as a still too. Nothing is kept until KEEP: then o.onKeep({blob,mime,ext,secs,sound,w,h,frame}) does it.
   Needs shared/capture.js. Loads its own look from the page's colour tokens. */
(function(g){
const LS={}; g.LiveShot=LS;
const C=()=>g.Capture, PK='theactorpage_liveshot_v1';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>{ s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
const $=id=>document.getElementById(id);
const CSS='@keyframes lspulse{50%{opacity:.35}}.lsov{position:fixed;inset:0;z-index:60;background:var(--bg);padding:calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px);overflow:auto;color:var(--ink);font-family:var(--sans)}.lsov .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#c0392b;flex:none}.lsov .btx h2{font-size:22px;margin:2px 0;font-weight:600}.lsov .btx p{margin:0;color:var(--tung-text);font-size:14px}.lsov .kicker{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}.lsov .dim{color:var(--dim)}.lsov .faint{color:var(--faint)}.lsov .small{font-size:13.5px}.lsov .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.lsov .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}.lsov .btn{min-height:var(--tap,44px);padding:0 16px;border-radius:10px;border:1px solid var(--line);background:var(--panel2);color:var(--ink);display:inline-flex;align-items:center;justify-content:center;gap:8px;font:500 15px var(--sans);cursor:pointer}.lsov .btn.pri{background:var(--tung);color:var(--tung-ink);border-color:var(--tung)}.lsov .btn.ghost{background:transparent}.lsov .btn.sm{padding:0 12px;font-size:14px}.lsov .btn.big{min-height:60px;font-size:17px}.lsov .btn.block{width:100%}.lsov .btn[disabled]{opacity:.45;pointer-events:none}body.lsopen{overflow:hidden}.shoot{max-width:1040px;margin:0 auto;padding-top:40px}.sr{display:flex;flex-direction:column;gap:12px}.opts[hidden]{display:none}.shead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}.shead .btx{min-width:220px}.campill[hidden]{display:none}.campill{display:flex;align-items:center;gap:8px;font:600 11.5px var(--sans);letter-spacing:.14em;background:var(--panel2);border:1px solid var(--line);border-radius:999px;padding:8px 14px}.campill .dot{background:var(--tung)}.campill.rec .dot{background:#e0574a}.sgrid{display:grid;gap:16px}@media (min-width:900px){.sgrid{grid-template-columns:7fr 5fr;align-items:start}}.frame{position:relative;aspect-ratio:4/5;max-height:64vh;margin:0 auto;border-radius:18px;overflow:hidden;background:#000}.frame video{width:100%;height:100%;object-fit:cover;display:block}.frame video.mirror{transform:scaleX(-1)}.frame [hidden]{display:none!important}.thirds{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.thirds path{stroke:rgba(236,231,220,.18);stroke-width:1.5;fill:none}.frame.review .thirds{display:none}.bigcount{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 140px var(--mono);color:rgba(236,231,220,.92);text-shadow:0 2px 18px rgba(0,0,0,.5)}.clock{position:absolute;top:14px;left:14px;font:700 16px var(--mono);color:#fff;background:rgba(192,57,43,.9);padding:4px 10px;border-radius:6px}.prog{position:absolute;left:0;bottom:0;height:6px;width:0;background:#c0392b}.looptag{position:absolute;top:14px;left:14px;font:600 11px var(--sans);letter-spacing:.14em;color:#fff;background:rgba(18,17,16,.8);padding:5px 10px;border-radius:999px}.camerr{position:absolute;left:16px;right:16px;top:40%;text-align:center;color:#ece7dc;font-size:15px}.strip{display:flex;gap:4px;margin-top:10px}.strip .fr{flex:1;min-width:0;padding:0;aspect-ratio:4/5;max-height:72px;border-radius:6px;overflow:hidden;border:1px solid var(--line);background:var(--panel2)}.strip .fr img{width:100%;height:100%;object-fit:cover;display:block}.strip .fr.on{border:3px solid var(--tung)}.opts{display:flex;flex-direction:column;gap:12px}.og{display:flex;flex-direction:column;gap:6px}.og .kicker{margin:0}.opt{min-height:var(--tap);padding:0 14px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--dim);font:500 13.5px var(--sans)}.opt.on{background:var(--panel2);color:var(--ink);border-color:var(--faint)}.opt[disabled]{opacity:.5}.recrow{display:flex;align-items:center;gap:16px;margin-top:6px}.recbtn{width:84px;height:84px;border-radius:50%;border:5px solid var(--ink);background:#c0392b;flex:none;display:flex;align-items:center;justify-content:center}.recbtn[disabled]{opacity:.4}.recbtn.stop{background:var(--bg)}.recbtn.stop span{width:26px;height:26px;border-radius:4px;background:#c0392b}@media (max-width:899px){.shoot .shead{margin-bottom:8px}.shoot .shead .kicker{display:none}.sr #shact{order:-1}.frame{max-height:50vh!important}.shoot .shead h2{font-size:18px}.shoot .shead p{font-size:13px}.frame{max-height:56vh}.opts{padding:12px}.og{flex-direction:row;align-items:center;flex-wrap:wrap}.og .kicker{width:70px}.recrow{justify-content:center}}';
function css(){ if($('lscss')) return; const s=document.createElement('style'); s.id='lscss'; s.textContent=CSS; document.head.appendChild(s); }
const prefs=()=>{ const d={facing:'user',len:5,timer:3,sound:false}; try{ return Object.assign(d,JSON.parse(localStorage.getItem(PK)||localStorage.getItem('headshots_shoot_v1')||'{}')); }catch(e){ return d; } };
let SH=null, O=null;
Object.defineProperty(LS,'cur',{get:()=>SH});
LS.fileName=function(base,who,ext){ const s=x=>String(x||'').trim().replace(/[^\w ]+/g,' ').trim().replace(/\s+/g,'_'); return [s(who),s(base)||'live',new Date().toISOString().slice(0,10)].filter(Boolean).join('_')+'.'+(ext||'webm'); };
LS.save=async function(blob,ext,base,who){ if(!blob) return ''; const f=new File([blob],LS.fileName(base,who,ext),{type:blob.type||'video/webm'});
 try{ if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:f.name}); return f.name; } }catch(e){ if(e&&e.name==='AbortError') return ''; }
 const a=document.createElement('a'); a.href=URL.createObjectURL(f); a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000); return f.name; };
/* o: {kicker, title, base (file name), who, replacing (there's one already), frameWords, onKeep, toast} */
LS.open=async function(o){
 O=Object.assign({kicker:'THE LIVE ONE',title:'Five seconds of you. It loops.',base:'live',who:'',replacing:false,frameWords:'Tap a frame to keep it as a still too.',toast:t=>{}},o||{});
 if(!C()) { O.toast('This browser can\'t open the camera here.'); return; }
 css(); if(SH) LS.close();
 let ov=$('lsov'); if(!ov){ ov=document.createElement('div'); ov.id='lsov'; ov.className='lsov'; document.body.appendChild(ov); }
 ov.hidden=false; document.body.classList.add('lsopen');
 SH=Object.assign(prefs(),{stage:'ready',frames:[],pick:-1});
 ov.innerHTML='<div class="shoot"><header class="shead"><div class="btx"><div class="kicker" style="margin:0">'+esc(O.kicker)+'</div><h2>'+esc(O.title)+'</h2><p id="shsub"></p></div><span class="campill" id="campill" hidden><i class="dot"></i><span id="camword"></span></span><button type="button" class="btn ghost sm" id="shx">CLOSE</button></header>'
  +'<div class="sgrid"><div class="sl"><div class="frame" id="sframe"><video id="shv" playsinline muted autoplay class="mirror"></video><video id="shr" playsinline loop hidden></video>'
  +'<svg class="thirds" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true"><path d="M133 0V500M267 0V500M0 167H400M0 333H400"/></svg>'
  +'<span class="bigcount" id="shcount" hidden></span><span class="clock" id="shclock" hidden></span><span class="prog" id="shprog"></span><span class="looptag" id="shloop" hidden>PLAYING ON A LOOP</span><p class="camerr" id="sherr" hidden></p></div>'
  +'<div class="strip" id="shstrip" hidden></div><p class="dim small" id="shpickwhy" hidden>'+esc(O.frameWords)+'</p></div>'
  +'<div class="sr"><div class="card opts" id="shopts"></div><div id="shact"></div></div></div></div>';
 $('shx').onclick=LS.close; opts(); act(); await cam();
};
function saveP(){ try{ localStorage.setItem(PK,JSON.stringify({facing:SH.facing,len:SH.len,timer:SH.timer,sound:SH.sound})); }catch(e){} }
function opts(){ const o=$('shopts'); if(!o||!SH) return; const busy=SH.stage!=='ready';
 const b=(k,v,l)=>'<button type="button" class="opt'+(SH[k]===v?' on':'')+'" data-o="'+k+'" data-v="'+v+'" aria-pressed="'+(SH[k]===v)+'"'+(busy?' disabled':'')+'>'+l+'</button>';
 o.innerHTML='<div class="og"><span class="kicker">CAMERA</span><div class="row">'+b('facing','user','Front')+b('facing','environment','Back')+'</div></div>'
  +'<div class="og"><span class="kicker">LENGTH</span><div class="row">'+b('len',3,'3 s')+b('len',5,'5 s')+b('len',8,'8 s')+'</div></div>'
  +'<div class="og"><span class="kicker">TIMER</span><div class="row">'+b('timer',0,'Off')+b('timer',3,'3 s')+b('timer',10,'10 s')+'</div></div>'
  +'<div class="og"><span class="kicker">SOUND</span><div class="row">'+b('sound',false,'Off')+b('sound',true,'On')+'</div></div>'
  +'<p class="dim small" style="margin:4px 0 0">'+(SH.sound?'The mic is on too, so it keeps your sound. ':'No sound in it. ')+'No filter, no touch-up: it\'s you, as the camera saw you.</p>';
 o.querySelectorAll('[data-o]').forEach(x=>x.onclick=async()=>{ if(SH.stage!=='ready') return; const k=x.dataset.o; let v=x.dataset.v; v=k==='facing'?v:k==='sound'?v==='true':+v; if(SH[k]===v) return; SH[k]=v; saveP(); opts(); act(); if(k==='facing'||k==='sound') await cam(); });
}
function pill(){ const p=$('campill'); if(!p||!SH) return; const on=!!SH.stream, rec=SH.stage==='rec'; p.hidden=!on||!!g.Hot; p.classList.toggle('rec',rec);
 $('camword').textContent=(SH.sound?'CAMERA AND MIC ON':'CAMERA ON')+(rec?' · RECORDING':' · NOT RECORDING'); }
function act(){ const a=$('shact'), s=$('shsub'); if(!a||!SH) return; const st=SH.stage; const op=$('shopts'); if(op) op.hidden=st==='review';
 if(s) s.textContent=st==='review'?'There it is. Keep it, or go again.':st==='rec'?'Recording. Just be you.':st==='count'?'Settle in.':'Frame yourself, tap the red button'+(SH.timer?', and the timer gives you time to settle.':'.');
 if(st==='ready') a.innerHTML='<div class="recrow"><button type="button" class="recbtn" id="shgo" aria-label="'+(SH.timer?'Start the timer and record':'Record')+'"'+(SH.stream?'':' disabled')+'></button><span class="dim">'+(SH.timer?'The timer counts '+SH.timer+', then it records '+SH.len+' seconds.':'It records '+SH.len+' seconds.')+'</span></div>';
 else if(st==='count'||st==='rec') a.innerHTML='<div class="recrow"><button type="button" class="recbtn stop" id="shstop" aria-label="Stop"><span></span></button><span class="dim">'+(st==='count'?'Tap to stop the timer.':'Tap to stop early.')+'</span></div>';
 else a.innerHTML='<div class="col"><button type="button" class="btn pri big block" id="shkeep">KEEP IT AS THE LIVE ONE</button><div class="row" style="margin-top:10px"><button type="button" class="btn big" id="shagain" style="flex:1">AGAIN</button><button type="button" class="btn big" id="shfile" style="flex:1">SAVE THE FILE</button></div><p class="dim small" id="shpicked">'+(SH.pick>=0?'Frame '+(SH.pick+1)+' is kept as a still when you keep it.':'No still from it unless you tap a frame.')+'</p>'+(O.replacing?'<p class="faint small">Keeping it replaces the live one you have now.</p>':'')+'</div>';
 const go=$('shgo'); if(go) go.onclick=start;
 const sp=$('shstop'); if(sp) sp.onclick=()=>{ if(SH.stage==='count'){ clearInterval(SH.cd); SH.stage='ready'; $('shcount').hidden=true; opts(); act(); pill(); } else finish(); };
 const k=$('shkeep'); if(k) k.onclick=keep;
 const ag=$('shagain'); if(ag) ag.onclick=again;
 const f=$('shfile'); if(f) f.onclick=async()=>{ const n=await LS.save(SH.blob,SH.ext,O.base,O.who); if(n) O.toast('Saved '+n); };
 pill();
}
async function cam(){
 if(!SH) return; const v=$('shv'), er=$('sherr');
 try{ if(SH.stream) C().stop(SH.stream); SH.stream=null; pill(); er.hidden=true;
  const s=await C().open({video:true,audio:!!SH.sound,facing:SH.facing,w:1440,h:1800});
  if(!SH){ C().stop(s); return; } SH.stream=s; v.srcObject=s; v.classList.toggle('mirror',SH.facing==='user'); v.play().catch(()=>{});
 }catch(e){ er.hidden=false; er.textContent=C().errorWords(e,SH.sound?'camera and mic':'video'); }
 pill(); act();
}
function start(){ if(!SH||!SH.stream||SH.stage!=='ready') return;
 const go=()=>{ $('shcount').hidden=true; record(); };
 if(!SH.timer) return go();
 SH.stage='count'; let n=SH.timer; const c=$('shcount'); c.hidden=false; c.textContent=n; opts(); act();
 SH.cd=setInterval(()=>{ n--; if(!SH) return; if(n<=0){ clearInterval(SH.cd); go(); } else c.textContent=n; },1000);
}
function record(){
 const v=$('shv'); SH.stage='rec'; SH.frames=[]; SH.pick=-1;
 try{ SH.rec=C().record(SH.stream,'video'); }catch(e){ SH.stage='ready'; O.toast(e.message); act(); return; }
 opts(); act(); const clock=$('shclock'), prog=$('shprog'); clock.hidden=false; const t0=Date.now(), L=SH.len*1000;
 const marks=[...Array(10)].map((_,i)=>L*(i+0.5)/10); let mi=0;
 SH.tick=setInterval(async()=>{ if(!SH||SH.stage!=='rec') return; const t=Date.now()-t0;
  clock.textContent=mmss(t/1000)+' / '+mmss(SH.len); prog.style.width=Math.min(100,t/L*100)+'%';
  while(mi<marks.length&&t>=marks[mi]){ mi++; if(v.videoWidth){ const b=await C().snap(v,false); if(b&&SH) SH.frames.push(b); } }
  if(t>=L) finish(); },100);
}
async function finish(){ if(!SH||SH.stage!=='rec') return; clearInterval(SH.tick); SH.stage='saving';
 const v=$('shv'), w=v.videoWidth, h=v.videoHeight; const r=await SH.rec.stop(); if(!SH) return;
 C().stop(SH.stream); SH.stream=null;
 SH.blob=r.blob; SH.mime=r.mime; SH.ext=r.ext; SH.secs=Math.min(SH.len,r.secs||SH.len); SH.w=w; SH.h=h; SH.url=URL.createObjectURL(r.blob);
 SH.stage='review'; v.hidden=true; const rv=$('shr'); rv.src=SH.url; rv.hidden=false; rv.muted=!SH.sound; rv.play().catch(()=>{ rv.muted=true; rv.play().catch(()=>{}); });
 $('shclock').hidden=true; $('shprog').style.width='0'; $('shloop').hidden=false; $('sframe').classList.add('review');
 const strip=$('shstrip'); SH.furls=SH.frames.map(b=>URL.createObjectURL(b));
 strip.innerHTML=SH.furls.map((u,i)=>'<button type="button" class="fr" data-f="'+i+'" aria-label="Frame '+(i+1)+'" aria-pressed="false"><img src="'+u+'" alt=""></button>').join(''); strip.hidden=!SH.frames.length; $('shpickwhy').hidden=!SH.frames.length;
 strip.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ const i=+b.dataset.f; SH.pick=SH.pick===i?-1:i; strip.querySelectorAll('[data-f]').forEach(x=>{ const on=+x.dataset.f===SH.pick; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); }); act(); });
 opts(); act();
}
function drop(){ if(!SH) return; if(SH.url) URL.revokeObjectURL(SH.url); (SH.furls||[]).forEach(u=>URL.revokeObjectURL(u)); SH.blob=null; SH.url=''; SH.frames=[]; SH.furls=[]; SH.pick=-1; }
async function again(){ drop(); SH.stage='ready'; const v=$('shv'), rv=$('shr'); rv.pause(); rv.removeAttribute('src'); rv.hidden=true; v.hidden=false; $('shloop').hidden=true; $('shstrip').hidden=true; $('shpickwhy').hidden=true; $('sframe').classList.remove('review'); opts(); act(); await cam(); }
LS.close=function(){ if(!SH) return; clearInterval(SH.tick); clearInterval(SH.cd); try{ if(SH.rec&&SH.stage==='rec') SH.rec.cancel(); }catch(e){} C().stop(SH.stream); drop(); SH=null; const ov=$('lsov'); if(ov){ ov.hidden=true; ov.innerHTML=''; } document.body.classList.remove('lsopen'); };
async function keep(){ if(!SH||!SH.blob) return; const b=$('shkeep'); if(b) b.disabled=true;
 const out={blob:SH.blob,mime:SH.mime,ext:SH.ext,secs:SH.secs,sound:SH.sound,w:SH.w,h:SH.h,frame:SH.pick>=0?SH.frames[SH.pick]||null:null};
 const cb=O.onKeep; LS.close(); if(cb) await cb(out); }
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&SH&&(SH.stage==='ready'||SH.stage==='count'||SH.stage==='rec')) LS.close(); });
})(typeof window!=='undefined'?window:globalThis);
