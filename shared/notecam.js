/* THEACTORPAGE NOTE CAMERA: a video (or voice) note for a project, recorded right here.
   You pick what it's for (a film, a script) and, if you like, the scene. WORDS, off unless you turn it on,
   writes down what you say while you record, so the note can be found by its words later; that goes through
   your browser's speech service (Chrome: Google, Safari: Apple), and it says so. The camera and mic use
   shared/capture.js and show in the bar at the top (shared/hot.js). Nothing is uploaded.
   NoteCam.open({kind:'video'|'audio', title, for:[{id,label,scenes:[label]}], pick:{for,scene}}, keep)
     keep({blob, mime, ext, secs, words, thumb, for, scene, name}) -> Promise (the tool stores it)
   NoteCam.saveToPhone(blob, name): the phone's share sheet (Save Video, Files), or a download. */
(function(g){
const N={};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SR=g.SpeechRecognition||g.webkitSpeechRecognition||null;
const WK='theactorpage_notes_words';
N.wordsOn=()=>{ try{ return localStorage.getItem(WK)==='1'; }catch(e){ return false; } };
N.setWords=v=>{ try{ localStorage.setItem(WK,v?'1':'0'); }catch(e){} };
const mmss=s=>{ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
N.mmss=mmss;
N.saveToPhone=async function(blob,name){
 const f=new File([blob],name||'note.'+(/mp4/.test(blob.type)?'mp4':'webm'),{type:blob.type});
 try{ if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:f.name}); return 'shared'; } }catch(e){ if(e&&e.name==='AbortError') return 'cancelled'; }
 const a=document.createElement('a'); a.href=URL.createObjectURL(f); a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 return 'downloaded';
};
function css(){ if($('notecss')) return; const s=document.createElement('style'); s.id='notecss';
 s.textContent='#notecam{position:fixed;inset:0;z-index:960;background:#000;color:#fff;display:flex;flex-direction:column;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}'
 +'#notecam .nh{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 12px;padding-top:calc(max(10px,env(safe-area-inset-top)) + 42px)}'
 +'#notecam select{flex:1 1 140px;min-width:0;background:#111;color:#fff;border:1px solid #333;border-radius:8px;padding:9px 10px;font:inherit}'
 +'#notecam button{font:inherit;color:#fff;background:#1d2128;border:1px solid #3a414c;border-radius:8px;padding:10px 14px;min-height:44px;cursor:pointer}'
 +'#notecam button:disabled{opacity:.45}#notecam .go{background:#e0a23c;border-color:#e0a23c;color:#1a1206;font-weight:700;min-width:140px}#notecam .go.rec{background:#d6332a;border-color:#d6332a;color:#fff}'
 +'#notecam .nv{position:relative;flex:1;min-height:0}#notecam video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000}#notecam.mirror video.live{transform:scaleX(-1)}'
 +'#notecam .aud{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:15px;color:#9aa4b0}'
 +'#notecam .clock{position:absolute;left:12px;top:12px;font:700 15px/1 ui-monospace,monospace;background:rgba(0,0,0,.6);padding:8px 10px;border-radius:8px}#notecam .clock b{color:#ff5a4a}'
 +'#notecam .heard{position:absolute;left:12px;right:12px;bottom:12px;font-size:15px;line-height:1.4;background:rgba(0,0,0,.65);padding:10px 12px;border-radius:8px;max-height:30%;overflow:auto}'
 +'#notecam .nb{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;padding:10px 12px calc(12px + env(safe-area-inset-bottom))}'
 +'#notecam .say{font-size:13px;color:#c9d2dc;text-align:center;padding:0 12px;min-height:18px}#notecam .say.bad{color:#f0a49a}'
 +'#notecam .wd{font-size:12px;letter-spacing:.08em}#notecam .wd.on{background:#2d5b3a;border-color:#3f7d50}';
 (document.head||document.documentElement).appendChild(s); }
let S=null;   // {stream, rec, t0, tick, ear, words, got, opt, facing}
function stopAll(){ if(!S) return; clearInterval(S.tick); try{ S.ear&&S.ear.stop(); }catch(e){} S.ear=null; if(S.stream&&g.Capture) g.Capture.stop(S.stream); S.stream=null; }
N.close=function(){ if(S&&S.rec){ try{ S.rec.cancel(); }catch(e){} } stopAll(); const o=$('notecam'); if(o) o.remove(); document.body.classList.remove('noteopen'); S=null; };
N.open=function(opt,keep){
 if(!g.Capture){ alert('This page cannot record here.'); return; }
 opt=opt||{}; css(); N.close();
 const video=opt.kind!=='audio', F=opt.for||[], pf=(opt.pick&&opt.pick.for)||(F[0]&&F[0].id)||'';
 S={opt,keep,video,facing:video?'user':'',words:'',got:null};
 const o=document.createElement('div'); o.id='notecam'; o.setAttribute('role','dialog'); o.setAttribute('aria-label',opt.title||'A note');
 o.innerHTML='<div class="nh">'+(F.length?'<select id="ncfor" aria-label="What it’s for">'+F.map(f=>'<option value="'+esc(f.id)+'"'+(f.id===pf?' selected':'')+'>'+esc(f.label)+'</option>').join('')+'</select><select id="ncsc" aria-label="Scene"></select>':'<b style="flex:1">'+esc(opt.title||'A note')+'</b>')
  +'<button id="ncx">CLOSE</button></div>'
  +'<div class="nv">'+(video?'<video id="ncv" class="live" playsinline muted autoplay></video>':'<div class="aud">Voice note. Your mic only.</div>')+'<div class="clock" id="ncclock"></div><div class="heard" id="ncheard" hidden></div></div>'
  +'<div class="say" id="ncsay"></div>'
  +'<div class="nb">'+(video?'<button id="ncface">BACK CAMERA</button>':'')+(SR?'<button class="wd'+(N.wordsOn()?' on':'')+'" id="ncwords" title="Writes down what you say. Chrome sends it to Google, Safari to Apple.">WORDS '+(N.wordsOn()?'ON':'OFF')+'</button>':'')+'<button class="go" id="ncgo" disabled>RECORD</button></div>';
 document.body.appendChild(o); document.body.classList.add('noteopen');
 const scenes=()=>{ const s=$('ncsc'); if(!s) return; const f=F.find(x=>x.id===$('ncfor').value)||{}; const L=f.scenes||[]; s.innerHTML='<option value="">No scene</option>'+L.map((x,i)=>'<option value="'+i+'">'+esc(x)+'</option>').join(''); s.hidden=!L.length; if(opt.pick&&opt.pick.scene!=null&&f.id===pf) s.value=String(opt.pick.scene); };
 scenes(); if($('ncfor')) $('ncfor').onchange=scenes;
 $('ncx').onclick=()=>{ if(S&&S.rec&&!confirm('Stop and throw this one away?')) return; N.close(); };
 if($('ncface')) $('ncface').onclick=()=>{ if(S.rec) return; S.facing=S.facing==='user'?'environment':'user'; $('ncface').textContent=S.facing==='user'?'BACK CAMERA':'FRONT CAMERA'; start(); };
 if($('ncwords')) $('ncwords').onclick=()=>{ if(S.rec) return; const v=!N.wordsOn(); N.setWords(v); $('ncwords').classList.toggle('on',v); $('ncwords').textContent='WORDS '+(v?'ON':'OFF'); say(v?'WORDS on: what you say is written down. Chrome sends it to Google, Safari to Apple.':''); };
 $('ncgo').onclick=()=>{ if(S.got) return; if(S.rec) end(); else begin(); };
 start();
};
function say(t,bad){ const e=$('ncsay'); if(e){ e.textContent=t||''; e.className='say'+(bad?' bad':''); } }
async function start(){
 if(!S) return; if(S.stream){ g.Capture.stop(S.stream); S.stream=null; }
 const o=$('notecam'); if(o) o.classList.toggle('mirror',S.facing==='user');
 say('Opening the '+(S.video?'camera and mic':'mic')+'…'); $('ncgo').disabled=true;
 try{ S.stream=await g.Capture.open(S.video?{video:true,audio:true,facing:S.facing,w:1280,h:720}:{video:false,audio:true}); }catch(e){ say(g.Capture.errorWords(e,S.video?'video':'audio'),true); return; }
 if(!$('notecam')){ g.Capture.stop(S.stream); return; }
 const v=$('ncv'); if(v){ v.srcObject=S.stream; try{ await v.play(); }catch(e){} }
 say(''); $('ncgo').disabled=false;
}
function begin(){
 if(!S||!S.stream) return;
 try{ S.rec=g.Capture.record(S.stream,S.video?'video':'audio'); }catch(e){ say(e.message,true); return; }
 S.t0=Date.now(); S.words=''; const b=$('ncgo'); b.textContent='STOP'; b.classList.add('rec');
 ['ncfor','ncsc','ncface','ncwords'].forEach(id=>{ const e=$(id); if(e) e.disabled=true; });
 const tick=()=>{ const c=$('ncclock'); if(c) c.innerHTML='<b>●</b> '+mmss((Date.now()-S.t0)/1000); }; tick(); S.tick=setInterval(tick,500);
 if(S.video) setTimeout(async()=>{ const v=$('ncv'); if(S&&S.rec&&v&&v.videoWidth){ try{ const b=await g.Capture.snap(v,false); S.thumb=await shrink(b,480); }catch(e){} } },700);
 if(SR&&N.wordsOn()){ try{ const r=new SR(); r.continuous=true; r.interimResults=true; r.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US')); let fin='';
   r.onresult=ev=>{ let mid=''; fin=''; for(let i=0;i<ev.results.length;i++){ const x=ev.results[i]; if(x.isFinal) fin+=x[0].transcript+' '; else mid+=x[0].transcript; } S.words=(fin+mid).trim(); const h=$('ncheard'); if(h){ h.hidden=!S.words; h.textContent=S.words; } };
   r.onend=()=>{ if(S&&S.rec&&S.ear===r){ try{ r.start(); }catch(e){} } };   // keeps listening for long notes
   r.start(); S.ear=r; }catch(e){} }
}
async function shrink(blob,max){ try{ const bm=await createImageBitmap(blob); const k=Math.min(1,max/Math.max(bm.width,bm.height)); const c=document.createElement('canvas'); c.width=Math.round(bm.width*k); c.height=Math.round(bm.height*k); c.getContext('2d').drawImage(bm,0,0,c.width,c.height); return await new Promise(r=>c.toBlob(x=>r(x||blob),'image/jpeg',0.8)); }catch(e){ return blob; } }
async function end(){
 const r=S.rec; S.rec=null; clearInterval(S.tick); const ear=S.ear; S.ear=null; try{ ear&&ear.stop(); }catch(e){}
 const got=await r.stop(); S.got=got;
 const fsel=$('ncfor'), ssel=$('ncsc'), forId=fsel?fsel.value:'', sc=ssel&&ssel.value!==''?+ssel.value:null;
 const f=(S.opt.for||[]).find(x=>x.id===forId)||{};
 const stamp=new Date(), name=g.Capture.fileName({name:(f.label||S.opt.title||'note').replace(/\s*\(.*\)$/,''),role:'note'+(sc!=null?' sc'+(sc+1):''),ext:got.ext,date:stamp.toISOString().slice(0,10)+'_'+String(stamp.getHours()).padStart(2,'0')+String(stamp.getMinutes()).padStart(2,'0')});
 const note={blob:got.blob,mime:got.mime,ext:got.ext,secs:got.secs,words:S.words||'',thumb:S.thumb||null,for:forId,scene:sc,name};
 if(S.stream){ g.Capture.stop(S.stream); S.stream=null; }
 const v=$('ncv'); const url=URL.createObjectURL(got.blob);
 if(v){ v.classList.remove('live'); v.srcObject=null; v.muted=false; v.controls=true; v.src=url; }
 else{ const a=document.querySelector('#notecam .aud'); if(a) a.innerHTML='<audio controls src="'+url+'" style="width:90%"></audio>'; }
 let ok=true; try{ await S.keep(note); }catch(e){ ok=false; }
 const b=document.querySelector('#notecam .nb');
 b.innerHTML='<button id="ncphone">SAVE TO PHONE</button><button id="ncagain">ANOTHER</button><button class="go" id="ncdone">DONE</button>';
 say(ok?'Kept, '+mmss(got.secs)+(f.label?', on '+f.label:'')+(sc!=null&&f.scenes?' / '+f.scenes[sc]:'')+'.'+(note.words?' Words written down.':''):'This phone would not keep it. SAVE TO PHONE now so it isn’t lost.',!ok);
 $('ncphone').onclick=async()=>{ const r=await N.saveToPhone(got.blob,name); say(r==='shared'?'Sent to your phone. Pick Save Video to put it in Photos.':r==='downloaded'?'Saved to your downloads.':''); };
 $('ncagain').onclick=()=>{ const o=S.opt,k=S.keep; o.pick={for:forId,scene:sc}; N.close(); N.open(o,k); };
 $('ncdone').onclick=()=>N.close();
}
g.NoteCam=N;
})(typeof window!=='undefined'?window:globalThis);
