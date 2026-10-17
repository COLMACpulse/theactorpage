/* HEADSHOTS: your headshots in your own words, a check on each photo, and a shoot that's planned.
   PHOTOS  the headshots in YOUR PROFILE (the same ones the Hub, Virtual Résumé and Slate Maker use): the roles each is for,
           keep / retest / retire, a note, the photo check, and how it reads at thumbnail size
   PLAN    the roles you're called in for and the ones you want; which have a keeper, in plain words; before / after tests
   BRIEF   for the photographer (or you, shooting yourself): a standalone page and a shot sheet; you choose what goes in
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

/* ---------- show it ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===U.tab));
 const y=Y.get(); $('title').textContent=U.tab==='plan'?'The plan':U.tab==='brief'?'For the photographer':'Your headshots';
 $('count').textContent=y.photos.length?y.photos.length+' headshot'+(y.photos.length===1?'':'s')+' · '+y.photos.filter(p=>p.status==='keeper').length+' keep':'';
 $('main').innerHTML=U.tab==='plan'?planView(y):U.tab==='brief'?briefView(y):photosView(y);
 wire(); fillImgs();
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
function photosView(y){
 let h=(window.Kit?Kit.html([{id:'tshot',dev:'camera',label:'CAMERA',what:'Take a test shot',note:'Front or back camera. Reads the light and focus where you\'re standing. Kept only if you add it'}]):'')+'<div class="card"><p class="dim small">The same headshots as YOUR PROFILE on home. The Hub, Virtual Résumé and Slate Maker use your main one. Tag each in your own words: the roles it\'s for, and keep, retest or retire.</p>'
  +'<label class="btn pri block"><input type="file" id="hf" accept="image/*" multiple hidden>ADD HEADSHOTS</label></div>';
 if(!y.photos.length) return h+'<p class="faint small">No headshots yet. Add them here, or drop them on home.</p>';
 const V=H.vocab(y.photos,P);
 y.photos.forEach(p=>{ const main=y.primary===p.id, roles=p.roles||[];
  h+='<div class="card hs"><div class="hsrow"><img data-src="'+p.id+'" class="big" alt=""><div class="hsside"><b class="fn">'+esc(plain(p.name))+'</b>'
   +(main?'<span class="pill on">MAIN</span>':'<button class="btn sm ghost" data-main="'+p.id+'">MAKE MAIN</button>')
   +'<p class="lab" style="margin-top:10px">At thumbnail size</p><img data-src="'+p.id+'" class="thumb" alt=""></div></div>'
   +'<p class="lab">Status</p><div class="row">'+H.STATUS.map(([k,l])=>chip(p.status===k,'data-st="'+p.id+'|'+k+'"',l)).join('')+'</div>'
   +'<p class="lab" style="margin-top:10px">The roles it\'s for (your words)</p><div class="row">'+V.map(r=>chip(roles.some(x=>x.toLowerCase()===r.toLowerCase()),'data-role="'+p.id+'|'+esc(r)+'"',r)).join('')+'</div>'
   +'<div class="row" style="margin-top:6px"><input class="field" data-newrole="'+p.id+'" placeholder="Another role word"><button class="btn sm" data-addrole="'+p.id+'">ADD</button></div>'
   +'<p class="lab" style="margin-top:10px">Note</p><input class="field" data-note="'+p.id+'" value="'+esc(p.note||'')+'" placeholder="What it says, where it came from, who shot it">'
   +'<p class="lab" style="margin-top:10px">Photo check</p>'+(p.check?'<ul class="chk">'+H.words(p.check).map(l=>'<li class="'+(l.ok?'ok':'no')+'">'+esc(l.t)+'</li>').join('')+'</ul>':'<p class="faint small">Checking…</p>')
   +'<div class="row" style="justify-content:flex-end"><button class="lnk faint" data-rm="'+p.id+'">remove</button></div></div>'; });
 h+='<p class="faint small">Measures light on you against the background, focus in the middle of the frame, and size. Never looks at who you are.</p>';
 return h;
}
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
 q('[data-main]',b=>b.onclick=()=>{ Y.setPrimary(b.dataset.main); render(); toast('Your main headshot. The Hub, Virtual Résumé and Slate Maker use it.'); });
 q('[data-st]',b=>b.onclick=()=>{ const [id,k]=b.dataset.st.split('|'); const p=y().photos.find(x=>x.id===id); Y.setPhoto(id,{status:p&&p.status===k?'':k}); render(); });
 q('[data-role]',b=>b.onclick=()=>{ const i=b.dataset.role.indexOf('|'), id=b.dataset.role.slice(0,i), r=b.dataset.role.slice(i+1), p=y().photos.find(x=>x.id===id); if(!p) return; const L=(p.roles||[]).slice(), j=L.findIndex(x=>x.toLowerCase()===r.toLowerCase()); if(j>=0) L.splice(j,1); else L.push(r); Y.setPhoto(id,{roles:L}); render(); });
 q('[data-addrole]',b=>b.onclick=()=>{ const id=b.dataset.addrole, inp=document.querySelector('[data-newrole="'+id+'"]'), r=(inp&&inp.value||'').trim(); if(!r) return; const p=y().photos.find(x=>x.id===id); const L=(p.roles||[]).slice(); if(!L.some(x=>x.toLowerCase()===r.toLowerCase())) L.push(r); Y.setPhoto(id,{roles:L}); render(); });
 q('[data-note]',i=>i.oninput=()=>Y.setPhoto(i.dataset.note,{note:i.value}));
 q('[data-rm]',b=>b.onclick=async()=>{ if(!confirm('Remove this headshot from your profile? The Hub, Virtual Résumé and Slate Maker won\'t have it either.')) return; await Y.removePhoto(b.dataset.rm); render(); });
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
$('tabs').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(!b) return; U.tab=b.dataset.t; saveU(); P=H.plan(); render(); window.scrollTo(0,0); });
window.addEventListener('storage',e=>{ if(e.key&&/you_v1|headshots_v1/.test(e.key)){ P=H.plan(); render(); } });
window.__hs={render,check,testShot,get P(){return P;}};
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&TS&&!TS.blob) tsClose(); });
render(); checkAll();
})();
