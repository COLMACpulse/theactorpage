/* HEADSHOTS: the face they see first. Your headshots in your own words, a live one, and a shoot that's planned.
   FRONT   the one you lead with (STILL or LIVE), your headshots (the same ones the Hub, Virtual Résumé and Slate Maker use):
           tap one for the roles it's for, keep / retest / retire, a note, the photo check, how it reads at thumbnail size.
   LIVE    five seconds of you, on a loop, shot here. Plays on your page and the postcard when you lead with it.
   PLAN    (folded) the roles you're called in for and the ones you want; which have a keeper, in plain words; before / after tests
   BRIEF   (folded) for the photographer (or you, shooting yourself): a standalone page and a shot sheet; you choose what goes in
   Nothing here rates your looks, names your type or predicts a booking. Nothing uploaded. */
(function(){
const Y=window.You, H=window.Headshots;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UK='headshots_ui_v1';
let U=(()=>{ try{ return Object.assign({tab:'photos'},JSON.parse(localStorage.getItem(UK)||'{}')); }catch(e){ return {tab:'photos'}; } })();
const saveU=()=>{ try{ localStorage.setItem(UK,JSON.stringify(U)); }catch(e){} };
let P=H.plan(); const saveP=()=>{ if(!H.save(P)) toast('This phone is out of room to save the plan.'); };
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3000); }
const URLS={}; async function src(id,ref){ if(URLS[id]) return URLS[id]; const b=ref?await H.getRef(id):await Y.photoBlob(id); if(!b) return ''; return URLS[id]=URL.createObjectURL(b); }
async function fillImgs(){ for(const im of document.querySelectorAll('img[data-src]')){ const u=await src(im.dataset.src,im.hasAttribute('data-ref')); if(u) im.src=u; } }
const plain=n=>String(n||'').replace(/\.[a-z0-9]+$/i,'');

/* the check, run on the stored photo (downsized to 320 px to measure) */
async function check(p){
 const b=await Y.photoBlob(p.id); if(!b) return null;
 const bm=await createImageBitmap(b), k=Math.min(1,320/Math.max(bm.width,bm.height)), w=Math.max(1,Math.round(bm.width*k)), h=Math.max(1,Math.round(bm.height*k));
 const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(bm,0,0,w,h);
 const m=H.measure(x.getImageData(0,0,w,h).data,w,h,p.ow||p.w||bm.width,p.oh||p.h||bm.height);
 Y.setPhoto(p.id,{check:m}); return m;
}
async function checkAll(){ const d=Y.get(); let n=0; for(const p of d.photos){ if(!p.check){ try{ await check(p); n++; }catch(e){} } } if(n) render(); }

async function addPhotos(files){ let n=0, bad=[]; for(const f of files){ const r=await Y.addPhoto(f); if(r.error) bad.push(f.name+': '+r.error); else if(!r.dup) n++; } render(); checkAll(); toast((n?n+' added to your headshots':'Nothing new')+(bad.length?' · '+bad.join('; '):'')); }
async function addRefs(files){ for(const f of files){ const s=await Y.shrink(f,900); if(!s) continue; const id='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); await H.putRef(id,s.blob); P.refs.push({id,name:f.name,note:'',share:true}); } saveP(); render(); }
const dataUrl=b=>new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.onerror=()=>r(''); fr.readAsDataURL(b); });
async function exportBrief(kind){
 const y=Y.get(), o={name:y.name||'',rep:y.rep||'',plan:P,refs:[]};
 if(kind==='brief') for(const r of P.refs.filter(r=>r.share)){ const b=await H.getRef(r.id); if(b) o.refs.push({name:r.name,note:r.note,src:await dataUrl(b)}); }
 const html=kind==='brief'?H.briefHtml(o):H.shotSheetHtml(o), fn=H.fileName(kind==='brief'?'headshot_brief':'shot_sheet',y.name);
 const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download=fn; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),3000); toast('Saved '+fn);
}
async function preview(){ const y=Y.get(), o={name:y.name||'',rep:y.rep||'',plan:P,refs:[]}; for(const r of P.refs.filter(r=>r.share)){ const b=await H.getRef(r.id); if(b) o.refs.push({name:r.name,note:r.note,src:await dataUrl(b)}); }
 const ov=$('ov'); ov.hidden=false; document.body.classList.add('ovopen'); ov.innerHTML='<div class="recbox"><button class="btn block" id="pvx">CLOSE</button><iframe id="pvf" class="pvf"></iframe></div>'; $('pvf').srcdoc=H.briefHtml(o); $('pvx').onclick=()=>{ ov.hidden=true; ov.innerHTML=''; document.body.classList.remove('ovopen'); }; }

/* ---------- the front: the one you lead with (still or live), your headshots, the live one; the plan folded ---------- */
const HS_ICON='<svg class="hico" viewBox="0 0 64 80" role="img" aria-label="A headshot, live"><rect class="pg" x="2" y="2" width="60" height="76" rx="5"/><rect class="ph" x="7" y="7" width="50" height="66" rx="3"/><g class="who"><circle class="sil" cx="32" cy="32" r="11"/><path class="sil" d="M12 73c3-15 11-22 20-22s17 7 20 22z"/></g><circle class="ldot" cx="51" cy="13" r="3.5"/></svg>';
const SIL='<svg class="silbig" viewBox="0 0 120 130" aria-hidden="true"><circle cx="60" cy="48" r="26"/><path d="M8 130c6-34 26-50 52-50s46 16 52 50z"/></svg>';
const RM=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
let OPEN='', EXT=null, LIVEURL='', LIVEK='';
const mmss=s=>{ s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
const day=t=>{ try{ return new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'}); }catch(e){ return ''; } };
async function liveUrl(){ const y=Y.get(); if(!y.live) return ''; const k=y.live.added+':'+y.live.name; if(LIVEK===k&&LIVEURL) return LIVEURL; const b=await Y.liveBlob(); if(!b) return ''; if(LIVEURL) URL.revokeObjectURL(LIVEURL); LIVEURL=URL.createObjectURL(b); LIVEK=k; return LIVEURL; }
async function fillLive(){ const els=document.querySelectorAll('video[data-live]'); if(!els.length) return; const u=await liveUrl(); if(!u) return; for(const v of els){ if(v.dataset.poster&&!v.poster){ const pu=await src(v.dataset.poster); if(pu) v.poster=pu; } if(v.src!==u) v.src=u; if(!RM()) v.play().catch(()=>{}); } }

function header(){
 const y=Y.get(), sub=U.tab==='looks'?'Each look in your own words, for commercial work.':U.tab==='plan'?'What you\'re called in for, what you want to be seen for, which have a keeper.':U.tab==='brief'?'A brief and your references, in your words.':'Your headshots, and a live one: five seconds of you, on a loop.';
 const t=U.tab==='looks'?'Your looks':U.tab==='plan'?'The plan':U.tab==='brief'?'For the photographer':'The face they see first';
 return '<header class="top bhead"><div class="bwrap">'+HS_ICON+'<div class="btx"><div class="kicker" style="margin:0">ACT · HEADSHOTS</div><h1 id="title">'+esc(t)+'</h1><p>'+esc(sub)+'</p><div class="count" id="count">'+(y.photos.length?y.photos.filter(p=>p.kind!=='still').length+' headshot'+(Y.headshots().length===1?'':'s')+' · '+y.photos.filter(p=>p.status==='keeper').length+' keep'+(y.live?' · a live one':''):'')+'</div></div><img class="bsig" src="../img/sigil-film-180.png" alt="THEACTORPAGE" width="64" height="64"></div></header><i class="hstk" aria-hidden="true"></i>';
}
const TAGW={keeper:'KEEP',retest:'RETEST',retire:'RETIRE'};
function leadHtml(y){
 const hs=Y.headshots(), prim=hs.find(p=>p.id===y.primary)||hs[0], live=!!y.live, lv=live&&y.lead==='live';
 let h='<section class="lead"><div class="lhead"><span class="kicker" style="margin:0">THE ONE YOU LEAD WITH</span>'+(live?'<span class="seg" role="group" aria-label="Lead with the still or the live one"><button type="button" class="'+(lv?'':'on')+'" data-lead="still" aria-pressed="'+!lv+'">STILL</button><button type="button" class="'+(lv?'on':'')+'" data-lead="live" aria-pressed="'+lv+'">LIVE</button></span>':'')+'</div>';
 h+='<div class="hero'+(lv?' islive':'')+'">';
 if(lv) h+='<video data-live class="hv" muted loop playsinline'+(RM()?' controls':' autoplay')+(prim?' data-poster="'+prim.id+'"':'')+'></video><span class="badge"><i class="dot"></i>LIVE · '+mmss(y.live.secs)+' LOOP</span>'+(y.live.sound?'<button type="button" class="hear" id="hear" aria-pressed="false">SOUND OFF</button>':'');
 else if(prim) h+='<img data-src="'+prim.id+'" class="hv" alt="Your main headshot">';
 else h+='<div class="hempty">'+SIL+'<span>No headshot yet</span></div>';
 h+='<span class="ytag">YOUR HEADSHOT</span></div>';
 h+='<div class="goes"><span class="kicker" style="margin:0 4px 0 0">GOES ON</span><span class="tag">YOUR PAGE</span><span class="tag">THE POSTCARD</span><span class="tag">YOUR PACKAGES</span><span class="tag">THE SLATE</span></div>';
 h+='<p class="dim small" style="margin:6px 0 0">'+(live?(lv?'The live one plays where your page and the postcard show your headshot. Anywhere that takes only stills gets the still.':'Your still leads everywhere. Pick LIVE and the live one plays on your page and the postcard.'):'The Hub, Virtual Résumé and Slate Maker use this one. Shoot a live one and it can play on your page and the postcard.')+'</p></section>';
 return h;
}
function cardHtml(p,y){ const roles=(p.roles||[]).join(' · '), main=y.primary===p.id;
 return '<button type="button" class="shot'+(OPEN===p.id?' open':'')+'" data-open="'+p.id+'" aria-expanded="'+(OPEN===p.id)+'"><span class="pic"><img data-src="'+p.id+'" alt="">'+(main?'<span class="mtag">LEAD STILL</span>':'')+(p.fromLive?'<span class="ftag">FROM THE LIVE ONE</span>':'')+'</span><span class="cap">'+(p.status?'<span class="tag st-'+p.status+'">'+TAGW[p.status]+'</span>':'')+'<span class="for">'+esc(roles||'Tap to say what it\'s for')+'</span></span></button>';
}
function detailHtml(p,y){ const main=y.primary===p.id, roles=p.roles||[], V=H.vocab(y.photos,P);
 return '<div class="card hs detail" id="detail"><div class="hsrow"><img data-src="'+p.id+'" class="big" alt=""><div class="hsside"><b class="fn">'+esc(plain(p.name))+'</b>'
  +(main?'<span class="pill on">THE ONE YOU LEAD WITH</span>':'<button class="btn sm ghost" data-main="'+p.id+'">LEAD WITH THIS ONE</button>')
  +'<p class="lab" style="margin-top:10px">At thumbnail size</p><img data-src="'+p.id+'" class="thumb" alt=""></div></div>'
  +'<p class="lab">Status</p><div class="row">'+H.STATUS.map(([k,l])=>chip(p.status===k,'data-st="'+p.id+'|'+k+'"',l)).join('')+'</div>'
  +'<p class="lab" style="margin-top:10px">The roles it\'s for (your words)</p><div class="row">'+V.map(r=>chip(roles.some(x=>x.toLowerCase()===r.toLowerCase()),'data-role="'+p.id+'|'+esc(r)+'"',r)).join('')+'</div>'
  +'<div class="row" style="margin-top:6px"><input class="field" data-newrole="'+p.id+'" placeholder="Another role word"><button class="btn sm" data-addrole="'+p.id+'">ADD</button></div>'
  +'<p class="lab" style="margin-top:10px">Note</p><input class="field" data-note="'+p.id+'" value="'+esc(p.note||'')+'" placeholder="What it says, where it came from, who shot it">'
  +'<p class="lab" style="margin-top:10px">Photo check</p>'+(p.check?'<ul class="chk">'+H.words(p.check).map(l=>'<li class="'+(l.ok?'ok':'no')+'">'+esc(l.t)+'</li>').join('')+'</ul>':'<p class="faint small">Checking…</p>')
  +'<p class="faint small">Measures light on you against the background, focus in the middle of the frame, and size. Never looks at who you are.</p>'
  +'<div class="row" style="justify-content:space-between"><button class="btn sm ghost" data-open="'+p.id+'">CLOSE</button><button class="lnk faint" data-rm="'+p.id+'">remove</button></div></div>';
}
function liveRow(y){ const L=y.live; if(!L) return '';
 const st=L.still&&y.photos.find(p=>p.id===L.still);
 return '<div class="liverow" id="liverow"><video data-live class="lthumb" muted loop playsinline'+(RM()?'':' autoplay')+'></video><div class="lt"><b>The live one</b><span class="dim small">'+esc([mmss(L.secs),'loops','shot '+day(L.added),L.sound?'with sound':'no sound',st?'a still kept from it':''].filter(Boolean).join(' · '))+'</span></div><div class="row"><button type="button" class="btn sm" id="lsave">SAVE THE FILE</button><button type="button" class="btn sm ghost" id="lagain">SHOOT A NEW ONE</button><button type="button" class="lnk faint" id="lrm">remove</button></div></div>';
}
function exampleHtml(){
 return '<section class="example" id="example" data-step="0" aria-label="Example, how it works"><p class="kicker" style="margin:0 0 10px">EXAMPLE · HOW IT WORKS</p><div class="exgrid"><div class="exhero"><div class="exwho">'+SIL+'</div><span class="badge exlive"><i class="dot"></i>LIVE · 0:05 LOOP</span><span class="extag">KEEP</span></div>'
  +'<ol class="exsteps"><li data-n="0"><b>Add your headshots.</b> The same ones your page and the Hub use.</li><li data-n="1"><b>Say what each one is for,</b> in your own words. Keep, retest or retire.</li><li data-n="2"><b>Shoot a live one:</b> five seconds of you. It loops.</li><li data-n="3"><b>Pick STILL or LIVE.</b> The live one plays on your page and the postcard.</li></ol></div><p class="faint small" style="margin:10px 0 0">An example. Nothing here is yours until you add it.</p></section>';
}
function playExample(){ clearInterval(EXT); const ex=$('example'); if(!ex||RM()) return; let n=0; EXT=setInterval(()=>{ const e=$('example'); if(!e){ clearInterval(EXT); return; } n=(n+1)%4; e.dataset.step=n; },2200); }
function photosView(y){
 const hs=Y.headshots(), none=!hs.length&&!y.live;
 let h='<div class="front">';
 if(none){ h+='<div class="startrow"><label class="btn pri big"><input type="file" id="hf" accept="image/*" multiple hidden>+ ADD HEADSHOTS</label><button type="button" class="btn big" id="shoot"><i class="dot"></i>SHOOT A LIVE ONE</button></div>'+exampleHtml(); }
 else {
  h+='<div class="fgrid"><div class="fl">'+leadHtml(y)+'</div><div class="fr">';
  h+='<div class="lhead"><span class="kicker" style="margin:0">YOUR HEADSHOTS · '+hs.length+'</span><span class="row"><label class="btn sm"><input type="file" id="hf" accept="image/*" multiple hidden>+ ADD HEADSHOTS</label><button type="button" class="btn sm pri" id="shoot"><i class="dot"></i>SHOOT A LIVE ONE</button></span></div>';
  h+='<div class="shots">'+hs.map(p=>cardHtml(p,y)).join('')+'</div>';
  const o=OPEN&&hs.find(p=>p.id===OPEN); if(o) h+=detailHtml(o,y);
  h+=liveRow(y);
  h+='</div></div>';
 }
 /* YOUR LOOKS (Col, Oct 26): Looks lives in Headshots now, as a tab: a look is a set of headshots with its skills */
 h+='<div class="planning"><p class="kicker">FOR COMMERCIAL WORK</p><button type="button" class="fold" data-t="looks"><b>YOUR LOOKS</b><span>Each look in your words: its photos, its skills, a live one if you want</span><i>OPEN</i></button></div>';
 h+='<div class="planning"><p class="kicker">WHEN YOU\'RE PLANNING A SHOOT</p><button type="button" class="fold" data-t="plan"><b>THE PLAN</b><span>What you\'re called in for, what you want to be seen for, which have a keeper</span><i>OPEN</i></button><button type="button" class="fold" data-t="brief"><b>FOR THE PHOTOGRAPHER</b><span>A brief and your references, in your words</span><i>OPEN</i></button></div>';
 h+=(window.Kit?'<div class="kitwrap">'+Kit.html([{id:'tshot',dev:'camera',label:'CAMERA',what:'Take a test shot',note:'Front or back camera. Reads the light and focus where you\'re standing. Kept only if you add it'}])+'</div>':'');
 return h+'</div>';
}

/* Looks, inside Headshots: its own page, opened here (?embed=1 hides its header); it keeps its own address too */
function looksView(){ return '<iframe class="embedtool" title="Your looks" src="../looks/?embed=1"></iframe>'; }

/* ---------- show it ---------- */
function render(){
 clearInterval(EXT);
 const y=Y.get();
 const back=U.tab!=='photos'?'<div class="backbar"><button type="button" class="btn sm ghost" data-t="photos">‹ YOUR HEADSHOTS</button><span class="seg"><button type="button" class="'+(U.tab==='looks'?'on':'')+'" data-t="looks">YOUR LOOKS</button><button type="button" class="'+(U.tab==='plan'?'on':'')+'" data-t="plan">THE PLAN</button><button type="button" class="'+(U.tab==='brief'?'on':'')+'" data-t="brief">FOR THE PHOTOGRAPHER</button></span></div>':'';
 $('app').innerHTML=header()+'<main id="main">'+back+(U.tab==='looks'?looksView():U.tab==='plan'?planView(y):U.tab==='brief'?briefView(y):photosView(y))+'</main>';
 wire(); fillImgs(); fillLive(); playExample();
}

const chip=(on,attr,label,extra)=>'<button class="chip sm'+(on?' on':'')+'" '+attr+'>'+esc(label)+(extra||'')+'</button>';
/* ---------- TEST SHOT: the camera, where you're standing. The light and focus, read live; a still if you want one.
   Nothing is kept unless you add it to your headshots or save it to the phone. ---------- */
const C=window.Capture; let TS=null;
async function testShot(){
 if(!C) return toast('This browser can\'t open the camera here.');
 const ov=$('ov'); ov.hidden=false; document.body.classList.add('ovopen');
 ov.innerHTML='<div class="recbox"><p class="dim small" style="margin:0 0 8px">A test shot, where you\'re standing. The light and focus are read as you frame it. Nothing is kept unless you add it.</p><video id="tsv" playsinline muted autoplay class="tsv mirror"></video><img id="tsi" class="tsv" alt="" hidden><div id="tsw" class="tsw"></div><div class="row" id="tsbar" style="margin-top:10px"><button class="btn pri" id="tsgo">SNAP</button><button class="btn" id="tsflip">FLIP CAMERA</button><button class="btn ghost" id="tsx">CLOSE</button></div></div>';
 TS={facing:'user'}; await tsOpen(); tsWire();
}
async function tsOpen(){
 try{ if(TS.stream) C.stop(TS.stream); TS.stream=await C.open({video:true,audio:false,facing:TS.facing}); const v=$('tsv'); v.srcObject=TS.stream; v.classList.toggle('mirror',TS.facing==='user'); v.play().catch(()=>{}); tsLive(); }
 catch(e){ $('tsw').innerHTML='<p class="faint small">'+esc(C.errorWords(e,'video'))+'</p>'; }
}
function tsRead(src,w0,h0){ const k=Math.min(1,320/Math.max(w0,h0)), w=Math.max(1,Math.round(w0*k)), h=Math.max(1,Math.round(h0*k)); const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(src,0,0,w,h); return H.measure(x.getImageData(0,0,w,h).data,w,h,w0,h0); }
const tsWords=m=>H.words(m).map(x=>'<p class="'+(x.ok?'ok':'flag')+' small" style="margin:3px 0">'+esc(x.t)+'</p>').join('');
function tsLive(){ clearInterval(TS.tick); TS.tick=setInterval(()=>{ const v=$('tsv'); if(!TS||!v||!v.videoWidth||TS.blob) return; try{ $('tsw').innerHTML='<p class="lab" style="margin:8px 0 2px">Right now</p>'+tsWords(tsRead(v,v.videoWidth,v.videoHeight)); }catch(e){} },700); }
function tsClose(){ if(!TS) return; clearInterval(TS.tick); C.stop(TS.stream); if(TS.url) URL.revokeObjectURL(TS.url); TS=null; const ov=$('ov'); ov.hidden=true; ov.innerHTML=''; document.body.classList.remove('ovopen'); }
function tsWire(){
 $('tsx').onclick=tsClose;
 const fl=$('tsflip'); if(fl) fl.onclick=async()=>{ TS.facing=TS.facing==='user'?'environment':'user'; await tsOpen(); };
 const go=$('tsgo'); if(go) go.onclick=async()=>{ const v=$('tsv'); if(!v.videoWidth) return; const b=await C.snap(v,false); if(!b) return;
  TS.blob=b; TS.url=URL.createObjectURL(b); clearInterval(TS.tick); const m=tsRead(v,v.videoWidth,v.videoHeight); C.stop(TS.stream); TS.stream=null;
  v.hidden=true; const im=$('tsi'); im.src=TS.url; im.hidden=false;
  $('tsw').innerHTML='<p class="lab" style="margin:8px 0 2px">This shot</p>'+tsWords(m);
  $('tsbar').innerHTML='<button class="btn pri" id="tsadd">ADD TO MY HEADSHOTS</button><button class="btn" id="tssave">SAVE TO PHONE</button><button class="btn" id="tsagain">AGAIN</button><button class="btn ghost" id="tsx">CLOSE</button>';
  $('tsx').onclick=tsClose;
  $('tsagain').onclick=async()=>{ const f=TS.facing; tsClose(); await testShot(); if(TS&&f!==TS.facing){ TS.facing=f; await tsOpen(); } };
  $('tssave').onclick=async()=>{ const f=new File([TS.blob],H.fileName('test_shot',Y.get().name).replace(/\.html$/,'.jpg'),{type:'image/jpeg'});
   try{ if(/Android|iPhone|iPad/i.test(navigator.userAgent)&&navigator.canShare&&navigator.canShare({files:[f]})){ await navigator.share({files:[f],title:f.name}); return; } }catch(e){ if(e&&e.name==='AbortError') return; }
   const a=document.createElement('a'); a.href=URL.createObjectURL(f); a.download=f.name; document.body.appendChild(a); a.click(); a.remove(); };
  $('tsadd').onclick=async()=>{ const f=new File([TS.blob],'Test shot '+new Date().toISOString().slice(0,16).replace('T',' ').replace(':','.')+'.jpg',{type:'image/jpeg'}); tsClose(); await addPhotos([f]); };
 };
}
/* ---------- SHOOT A LIVE ONE (shared/liveshot.js): kept as your live one; a frame you tap goes with your headshots ---------- */
const LSH=window.LiveShot;
async function shoot(){
 if(!LSH) return toast('This browser can\'t open the camera here.');
 await LSH.open({kicker:'HEADSHOTS · THE LIVE ONE',base:'live_headshot',who:Y.get().name,replacing:!!Y.get().live,frameWords:'Tap a frame to keep it as a still too. It goes with your headshots, marked as from the live one.',toast,
  onKeep:async r=>{ let still='';
   if(r.frame){ const f=new File([r.frame],'Live one still '+new Date().toISOString().slice(0,16).replace('T',' ').replace(':','.')+'.jpg',{type:'image/jpeg'}); const x=await Y.addPhoto(f,{live:true}); if(x&&x.photo) still=x.photo.id; }
   const L=await Y.setLive(r.blob,{name:LSH.fileName('live_headshot',Y.get().name,r.ext),mime:r.mime,ext:r.ext,secs:r.secs,sound:r.sound,w:r.w,h:r.h,still});
   if(!L){ toast('This phone would not keep the clip. It may be out of room.'); return; }
   render(); checkAll(); toast('Kept. It leads on your page and the postcard. Pick STILL any time.'); }});
}
const saveFile=(blob,ext)=>LSH&&LSH.save(blob,ext,'live_headshot',Y.get().name).then(n=>{ if(n) toast('Saved '+n); });
function planView(y){
 const V=H.vocab(y.photos,P), cov=H.coverage(P.want,y.photos), ph=y.photos;
 let h='<div class="card"><p class="kicker">What you\'re called in for now</p><div class="row">'+V.map(r=>chip(P.called.some(x=>x.toLowerCase()===r.toLowerCase()),'data-called="'+esc(r)+'"',r)).join('')+'</div>'
  +'<p class="kicker" style="margin-top:14px">What you want to be seen for</p><div class="row">'+V.map(r=>chip(P.want.some(x=>x.toLowerCase()===r.toLowerCase()),'data-want="'+esc(r)+'"',r)).join('')+'</div>'
  +'<div class="row" style="margin-top:8px"><input class="field" id="nw" placeholder="Another role word"><button class="btn sm" id="nwadd">ADD</button></div></div>';
 h+='<div class="card"><p class="kicker">Which have a keeper</p>'+(cov.length?'<ul class="chk">'+cov.map(c=>'<li class="'+(c.keepers.length?'ok':'no')+'">'+esc(H.coverWords(c))+'</li>').join('')+'</ul><p class="faint small">From your own tags on PHOTOS. "No keeper yet" means no photo you\'ve marked for it, nothing more.</p>':'<p class="faint small">Pick the roles you want to be seen for, above.</p>')+'</div>';
 h+='<div class="card"><p class="kicker">Before / after</p><p class="dim small">Two photos side by side: what changed, and how it went.</p>';
 P.tests.forEach(t=>{ const opt=sel=>'<option value="">Pick a photo</option>'+ph.map(p=>'<option value="'+p.id+'"'+(sel===p.id?' selected':'')+'>'+esc(plain(p.name))+'</option>').join('');
  h+='<div class="test"><input class="field" data-tf="'+t.id+'|change" value="'+esc(t.change)+'" placeholder="The one change (e.g. darker jacket)"><input class="field" data-tf="'+t.id+'|hypothesis" value="'+esc(t.hypothesis)+'" placeholder="What you think it does (e.g. reads more authority)" style="margin-top:6px">'
   +'<div class="ba"><div><p class="lab">Before</p><select class="field" data-tf="'+t.id+'|before">'+opt(t.before)+'</select>'+(t.before?'<img data-src="'+t.before+'" class="baimg" alt="">':'')+'</div><div><p class="lab">After</p><select class="field" data-tf="'+t.id+'|after">'+opt(t.after)+'</select>'+(t.after?'<img data-src="'+t.after+'" class="baimg" alt="">':'')+'</div></div>'
   +'<div class="row">'+H.VERDICTS.map(([k,l])=>chip(t.verdict===k,'data-tv="'+t.id+'|'+k+'"',l)).join('')+'</div>'
   +'<input class="field" data-tf="'+t.id+'|why" value="'+esc(t.why)+'" placeholder="Why (yours, or what your rep said)" style="margin-top:6px"><div class="row" style="justify-content:flex-end"><button class="lnk faint" data-trm="'+t.id+'">delete</button></div></div>'; });
 h+='<button class="btn block" id="tadd">+ A NEW TEST</button></div>';
 return h;
}
function briefView(y){
 const b=P.brief, f=(k,l,ph,ta)=>'<p class="lab" style="margin-top:10px">'+l+'</p>'+(ta?'<textarea class="field" data-bf="'+k+'" placeholder="'+esc(ph)+'">'+esc(b[k])+'</textarea>':'<input class="field" data-bf="'+k+'" value="'+esc(b[k])+'" placeholder="'+esc(ph)+'">');
 let h='<div class="card"><p class="kicker">The session</p><p class="dim small">A page for the photographer, or for you if you\'re shooting it yourself. Only what you put here goes in.</p>'
  +f('objective','What you\'re after','Two looks: a cop and a dad.',true)
  +f('wardrobe','Wardrobe','Grey crew neck, navy work jacket, plain button-down',true)
  +f('light','Light','Soft window light, background darker than me',true)
  +f('framing','Framing','Chest up',true)
  +f('boundaries','Please don\'t','No retouching that changes my face. No smiling on the cop look.',true)
  +f('notes','Notes','',true)
  +f('shots','Shot list (one per line)','Tight, grey crew, no smile\nWaist up, jacket, leaning on the wall',true)
  +'<label class="tog"><input type="checkbox" id="broles"'+(b.roles?' checked':'')+'> Put in the roles you want and the ones you\'re called in for'+(P.want.length||P.called.length?'':' (none picked yet, on PLAN)')+'</label></div>';
 h+='<div class="card"><p class="kicker">References</p><p class="dim small">Other people\'s photos for the light, the wardrobe or the mood. Kept on this phone; ticked ones go in the brief.</p>'
  +'<label class="btn block"><input type="file" id="rf" accept="image/*" multiple hidden>ADD REFERENCES</label>'
  +P.refs.map(r=>'<div class="refrow"><img data-src="'+r.id+'" data-ref class="ref" alt=""><div class="refside"><input class="field" data-rn="'+r.id+'" value="'+esc(r.note)+'" placeholder="What to take from it: the light, the jacket"><div class="row"><label class="tog"><input type="checkbox" data-rs="'+r.id+'"'+(r.share?' checked':'')+'> In the brief</label><button class="lnk faint" data-rrm="'+r.id+'">remove</button></div></div></div>').join('')+'</div>';
 h+='<div class="card"><button class="btn block" id="bprev">PREVIEW THE BRIEF</button><button class="btn pri block" id="bdl" style="margin-top:8px">DOWNLOAD THE BRIEF</button><button class="btn block" id="sdl" style="margin-top:8px">DOWNLOAD THE SHOT SHEET</button>'
  +'<p class="faint small">Standalone pages: they open anywhere, no account. Print or save as PDF from them. Your audition history and the photo checks are never in them.</p></div>';
 return h;
}
function wire(){
 const q=(s,f)=>document.querySelectorAll(s).forEach(f), y=()=>Y.get();
 const hf=$('hf'); if(hf) hf.onchange=()=>{ const f=[...hf.files]; hf.value=''; addPhotos(f); };
 q('[data-main]',b=>b.onclick=()=>{ Y.setPrimary(b.dataset.main); render(); toast('The one you lead with. The Hub, Virtual Résumé and Slate Maker use it.'); });
 q('[data-open]',b=>b.onclick=()=>{ OPEN=OPEN===b.dataset.open?'':b.dataset.open; render(); const d=$('detail'); if(d&&OPEN) d.scrollIntoView({block:'nearest',behavior:RM()?'auto':'smooth'}); });
 q('[data-lead]',b=>b.onclick=()=>{ Y.setLead(b.dataset.lead); render(); });
 q('[data-t]',b=>b.onclick=()=>{ U.tab=b.dataset.t; saveU(); P=H.plan(); render(); window.scrollTo(0,0); });
 const sh=$('shoot'); if(sh) sh.onclick=shoot; const la=$('lagain'); if(la) la.onclick=shoot;
 const ls=$('lsave'); if(ls) ls.onclick=async()=>{ const y0=Y.get(); saveFile(await Y.liveBlob(),y0.live&&y0.live.ext); };
 const lr=$('lrm'); if(lr) lr.onclick=async()=>{ if(!confirm('Remove the live one? Your page and the postcard go back to your still.')) return; await Y.removeLive(); render(); };
 const he=$('hear'); if(he) he.onclick=()=>{ const v=document.querySelector('.hero video'); if(!v) return; v.muted=!v.muted; if(!v.muted) v.play().catch(()=>{}); he.textContent=v.muted?'SOUND OFF':'SOUND ON'; he.setAttribute('aria-pressed',String(!v.muted)); };
 q('[data-st]',b=>b.onclick=()=>{ const [id,k]=b.dataset.st.split('|'); const p=y().photos.find(x=>x.id===id); Y.setPhoto(id,{status:p&&p.status===k?'':k}); render(); });
 q('[data-role]',b=>b.onclick=()=>{ const i=b.dataset.role.indexOf('|'), id=b.dataset.role.slice(0,i), r=b.dataset.role.slice(i+1), p=y().photos.find(x=>x.id===id); if(!p) return; const L=(p.roles||[]).slice(), j=L.findIndex(x=>x.toLowerCase()===r.toLowerCase()); if(j>=0) L.splice(j,1); else L.push(r); Y.setPhoto(id,{roles:L}); render(); });
 q('[data-addrole]',b=>b.onclick=()=>{ const id=b.dataset.addrole, inp=document.querySelector('[data-newrole="'+id+'"]'), r=(inp&&inp.value||'').trim(); if(!r) return; const p=y().photos.find(x=>x.id===id); const L=(p.roles||[]).slice(); if(!L.some(x=>x.toLowerCase()===r.toLowerCase())) L.push(r); Y.setPhoto(id,{roles:L}); render(); });
 q('[data-note]',i=>i.oninput=()=>Y.setPhoto(i.dataset.note,{note:i.value}));
 q('[data-rm]',b=>b.onclick=async()=>{ if(!confirm('Remove this headshot from your profile? The Hub, Virtual Résumé and Slate Maker won\'t have it either.')) return; await Y.removePhoto(b.dataset.rm); OPEN=''; render(); });
 q('[data-called]',b=>b.onclick=()=>{ const r=b.dataset.called, j=P.called.findIndex(x=>x.toLowerCase()===r.toLowerCase()); if(j>=0) P.called.splice(j,1); else P.called.push(r); saveP(); render(); });
 q('[data-want]',b=>b.onclick=()=>{ const r=b.dataset.want, j=P.want.findIndex(x=>x.toLowerCase()===r.toLowerCase()); if(j>=0) P.want.splice(j,1); else P.want.push(r); saveP(); render(); });
 const nw=$('nwadd'); if(nw) nw.onclick=()=>{ const r=($('nw').value||'').trim(); if(!r) return; if(!P.want.some(x=>x.toLowerCase()===r.toLowerCase())) P.want.push(r); saveP(); render(); };
 const ta=$('tadd'); if(ta) ta.onclick=()=>{ H.addTest(P,{}); saveP(); render(); };
 q('[data-tf]',el=>{ const ev=el.tagName==='SELECT'?'onchange':'oninput'; el[ev]=()=>{ const [id,k]=el.dataset.tf.split('|'), t=P.tests.find(x=>x.id===id); if(!t) return; t[k]=el.value; saveP(); if(el.tagName==='SELECT') render(); }; });
 q('[data-tv]',b=>b.onclick=()=>{ const [id,k]=b.dataset.tv.split('|'), t=P.tests.find(x=>x.id===id); if(t){ t.verdict=k; saveP(); render(); } });
 q('[data-trm]',b=>b.onclick=()=>{ if(!confirm('Delete this test?')) return; P.tests=P.tests.filter(x=>x.id!==b.dataset.trm); saveP(); render(); });
 q('[data-bf]',el=>el.oninput=()=>{ P.brief[el.dataset.bf]=el.value; saveP(); });
 const br=$('broles'); if(br) br.onchange=()=>{ P.brief.roles=br.checked; saveP(); };
 const rf=$('rf'); if(rf) rf.onchange=()=>{ const f=[...rf.files]; rf.value=''; addRefs(f); };
 q('[data-rn]',el=>el.oninput=()=>{ const r=P.refs.find(x=>x.id===el.dataset.rn); if(r){ r.note=el.value; saveP(); } });
 q('[data-rs]',el=>el.onchange=()=>{ const r=P.refs.find(x=>x.id===el.dataset.rs); if(r){ r.share=el.checked; saveP(); } });
 q('[data-rrm]',b=>b.onclick=async()=>{ await H.delRef(b.dataset.rrm); P.refs=P.refs.filter(x=>x.id!==b.dataset.rrm); saveP(); render(); });
 if(window.Kit) Kit.wire($('main'),{tshot:testShot});
 const bp=$('bprev'); if(bp) bp.onclick=preview;
 const bd=$('bdl'); if(bd) bd.onclick=()=>exportBrief('brief');
 const sd=$('sdl'); if(sd) sd.onclick=()=>exportBrief('sheet');
}
window.addEventListener('storage',e=>{ if(e.key&&/you_v1|headshots_v1/.test(e.key)){ P=H.plan(); if(!(LSH&&LSH.cur)) render(); } });
window.__hs={render,check,testShot,shoot,get P(){return P;},get SH(){return LSH&&LSH.cur;}};
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ if(TS&&!TS.blob) tsClose(); } });
{ const t=new URLSearchParams(location.search).get('tab'); U.tab=t==='plan'||t==='brief'?t:'photos'; }
render(); checkAll(); if(/[?&]shoot=1/.test(location.search)) shoot();
})();
