/* SPOTTED: you see something your reps should know about. Ten seconds later they have it, with the facts.
   SPOT  paste it or share it here: the notice, the email, the trade story, the post, the link. It reads what's written,
         puts your history with the office next to it (Hub, NOTES, the conflicts you hold), and writes three notes:
         pass it along to your reps, a pitch your rep can send, and a note straight to the office. You edit, you send.
   LIST  everything you've spotted, where each stands, searchable. Send it to your manager as text or as a page.
   OFFICES  every office in what you spotted: what they're casting, your history, how they've reached you. The report
         for your reps: what fits you, offices that know you, offices you should be going in for and aren't.
   YOU   your links, your reps, your types, the conflicts you hold.
   Nothing uploaded. localStorage theactorpage_spotted_v1. The Hub and NOTES are read, never written. */
(function(){
const S=window.Spotted, O=window.Offices, N=window.Notes, Y=window.You;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='theactorpage_spotted_v1', UK='spotted_ui_v1';
const blank=()=>({items:[],me:{reel:'',resume:'',site:'',reps:[]},held:[]});
function load(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.items)) return Object.assign(blank(),d,{me:Object.assign(blank().me,d.me||{})}); }catch(e){} return blank(); }
let D=load();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(D)); }catch(e){ toast('This phone is out of room. Nothing was saved.'); } };
let U=(()=>{ try{ return Object.assign({tab:'spot',open:'',q:'',st:''},JSON.parse(localStorage.getItem(UK)||'{}')); }catch(e){ return {tab:'spot',open:'',q:'',st:''}; } })();
const saveU=()=>{ try{ localStorage.setItem(UK,JSON.stringify(U)); }catch(e){} };
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3000); }
const uid=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
let HUB=null, DRAFT=null;   // HUB: {projects,credits} from this device, read-only. DRAFT: {raw, url, card} or {raw, url, many:[card], pick:[bool]}
const you=()=>{ try{ return Y?Y.get():{}; }catch(e){ return {}; } };
const me=()=>{ const y=you(); return Object.assign({name:y.name||'',rep:y.rep||'',credits:y.credits||[]},D.me); };
const types=()=>{ const y=you(); return (y.types||[]).filter(Boolean); };
const ctx=()=>({projects:(HUB&&HUB.projects)||[],credits:(HUB&&HUB.credits)||[],you:you(),offices:O,notes:N,held:D.held,spotted:D.items,types:types()});
const factsFor=it=>S.facts(it.card,Object.assign(ctx(),{selfId:it.id}));
const item=id=>D.items.find(x=>x.id===id);
const day=t=>t?new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';
const repEmails=()=>D.me.reps.map(r=>r.email).filter(Boolean).join(',');
const mail=(to,subject,body)=>'mailto:'+encodeURIComponent(to||'').replace(/%2C/g,',')+'?subject='+encodeURIComponent(subject||'')+'&body='+encodeURIComponent(body||'');
async function copy(t){ try{ await navigator.clipboard.writeText(t); toast('Copied.'); }catch(e){ toast('Select the text and copy it.'); } }
function setStatus(it,s){ if(it.status===s) return; it.status=s; (it.history=it.history||[]).push({s,at:Date.now()}); save(); }

/* ---------- SPOT ---------- */
const onList=c=>{ const k=S.key(c.project); return !!k&&D.items.some(x=>S.key(x.card.project)===k); };
function readDraft(raw,url){ const L=S.readMany(raw,{url}); DRAFT=L.length>1?{raw:String(raw||''),url:url||'',many:L,pick:L.map(c=>!onList(c))}:{raw:String(raw||''),url:url||'',card:L[0]||S.read(raw,{url})}; }
function spotView(){
 let h='';
 if(!DRAFT){
  h+='<div class="card"><p class="kicker">Spot it</p><p class="dim small">The notice, the email, the story, the post, or just the link. Paste it here, or share it to SPOTTED from another app.</p>'
   +'<textarea class="field" id="raw" placeholder="Paste it here"></textarea><div class="row" style="margin-top:8px"><button class="btn" id="paste">PASTE</button><button class="btn pri" id="read" style="flex:1">READ IT</button></div></div>';
  h+=lookHtml();
  const recent=D.items.slice().sort((a,b)=>b.at-a.at).slice(0,3);
  if(recent.length) h+='<p class="kicker" style="margin-top:18px">Last spotted</p>'+recent.map(rowHtml).join('');
  return h;
 }
 if(DRAFT.many) return manyView();
 const c=DRAFT.card, F=S.facts(c,ctx());
 h+='<div class="card"><p class="kicker">What it says</p>'+cardFields(c)+saidHtml(c)+'</div>';
 h+=factsHtml(F);
 h+='<div class="row"><button class="btn ghost" id="redo">START OVER</button><button class="btn pri" id="keep" style="flex:1">KEEP IT</button></div>';
 return h;
}
/* a story or a list with several projects in it: pick which to keep */
function manyView(){
 const L=DRAFT.many, n=DRAFT.pick.filter(Boolean).length, T=types();
 let h='<div class="card"><p class="kicker">'+L.length+' projects in this</p><p class="dim small">Untick the ones you don\'t want. Each one you keep goes on your list, with your history next to it.</p>';
 h+=L.map((c,i)=>{ const m=S.typesIn(c,T), cs=(c.casting||[]).length?c.casting.join(' & ')+' casting':'No casting named';
  return '<label class="pick"><input type="checkbox" data-pick="'+i+'"'+(DRAFT.pick[i]?' checked':'')+'><span><b>'+esc(c.project)+'</b>'+(c.role?' · '+esc(c.role):'')+'<small>'+esc([cs,c.network,c.type,c.status].filter(Boolean).join(' · '))+'</small>'+(m.length?'<small class="hit">Your words in it: '+esc(m.join(', '))+'</small>':'')+(onList(c)?'<small>Already on your list</small>':'')+'</span></label>'; }).join('');
 h+='</div><div class="row"><button class="btn ghost" id="redo">START OVER</button><button class="btn pri" id="keepmany" style="flex:1"'+(n?'':' disabled')+'>KEEP '+(n===L.length?'ALL '+n:n)+'</button></div>';
 return h;
}
function keepMany(){
 const now=Date.now(); let n=0;
 DRAFT.many.forEach((c,i)=>{ if(!DRAFT.pick[i]) return; D.items.push({id:uid(),at:now+i,raw:'',card:c,status:'spotted',history:[{s:'spotted',at:now}],note:'',mine:''}); n++; });
 save(); DRAFT=null; U.open=''; U.tab='offices'; saveU(); render(); toast(n+' kept. Here\'s who is casting them.');
}
function cardFields(c){
 const f=(k,l,v,ph)=>'<label class="lab" for="cf_'+k+'">'+l+'</label><input class="field" id="cf_'+k+'" data-cf="'+k+'" value="'+esc(v)+'" placeholder="'+esc(ph||'Not written')+'">';
 let h=f('project','Project',c.project)+f('role','Role',c.role);
 if(c.roles&&c.roles.length>1) h+='<div class="row" style="margin-top:6px">'+c.roles.map(r=>'<button class="chip sm'+(r.name===c.role?' on':'')+'" data-role="'+esc(r.name)+'">'+esc(r.name)+'</button>').join('')+'</div>';
 h+=f('casting','Casting',(c.casting||[]).join(', '),'Who is casting')+'<div class="row2"><div>'+f('type','Kind of job',c.type,'Commercial, pilot, feature')+'</div><div>'+f('network','Network / client',c.network)+'</div></div>'+f('source','Link',c.source,'A link your reps can open');
 return h;
}
function saidHtml(c){
 const L=[];
 if(c.union) L.push(['Union',c.union]); if(c.where) L.push(['Where',c.where]);
 c.dates.forEach(d=>L.push([d.what,d.text])); c.pay.forEach(p=>L.push(['Pay',p])); if(c.conflicts) L.push(['Conflicts',c.conflicts]);
 let h=L.length?'<ul class="said" style="margin-top:12px">'+L.map(([w,t])=>'<li>'+(t.toLowerCase().indexOf(w.toLowerCase())===0?'':'<span class="w">'+esc(w)+'</span> ')+esc(t)+'</li>').join('')+'</ul>':'';
 if(c.musts.length) h+='<p class="lab" style="margin-top:12px">What they ask for, as written</p>'+c.musts.map(m=>'<div class="must">'+esc(m)+'</div>').join('');
 if(c.private.length) h+='<p class="faint small" style="margin-top:10px">'+(c.private.length===1?'A private link':''+c.private.length+' private links')+' (a Zoom room, your own page) '+(c.private.length===1?'is':'are')+' on this. Kept here, left out of every note.</p>';
 if(!c.found.length) h+='<p class="faint small">Nothing to read in that. Fill in what you know.</p>';
 return h;
}
function factsHtml(F){
 if(!F.length) return '<div class="card"><p class="kicker">Yours</p><p class="faint small">Nothing of yours to put next to it'+(HUB?'':' (no Hub on this device)')+'. Add who is casting and it checks your Hub and NOTES.</p></div>';
 return '<div class="card"><p class="kicker">Yours</p><ul class="facts">'+F.map(x=>'<li'+(x.k==='conflict'?' class="bad"':'')+'>'+esc(x.t)+'</li>').join('')+'</ul></div>';
}
function keepDraft(){
 const it={id:uid(),at:Date.now(),raw:DRAFT.raw,card:DRAFT.card,status:'spotted',history:[{s:'spotted',at:Date.now()}],note:'',mine:''};
 D.items.push(it); save(); DRAFT=null; U.open=it.id; U.tab='list'; saveU(); render(); toast('Kept. Pass it along when you\'re ready.');
}

/* LOOK: one-tap searches from your types. They open Google News (or a trade's own pages through it) in your browser. */
function lookHtml(){
 const y=you(), R=S.look(types(),y.locations);
 return '<div class="card" style="margin-top:14px"><p class="kicker">Look</p><p class="dim small" style="margin-top:-4px">Searches made from your types'+(types().length?'':' (add your types on YOU)')+'. They open in your browser, so what you search goes to Google. Paste back what\'s worth it.</p>'
  +R.map(r=>'<div class="lk"><b>'+esc(r.label)+'</b><span>'+S.WHERE.map(([k,l])=>'<a href="'+esc(S.lookUrl(r.q,k))+'" target="_blank" rel="noopener noreferrer">'+l+'</a>').join('')+'</span></div>').join('')+'</div>';
}

/* ---------- one you've kept ---------- */
function itemView(it){
 const c=it.card, F=factsFor(it), m=me();
 const pa=S.passAlong(Object.assign({},c,{mine:it.mine}),F,m), pt=S.pitch(c,F,m), dn=S.direct(c,F,m);
 let h='<div class="row" style="margin-bottom:10px"><button class="lnk" id="back">‹ All spotted</button></div>';
 h+='<div class="card"><p class="kicker">'+esc(day(it.at))+'</p><h2 style="font-size:20px">'+esc(c.project||'(no title)')+'</h2><p class="dim" style="margin:4px 0 10px">'+esc([c.role,(c.casting||[]).length?c.casting.join(' & ')+' casting':''].filter(Boolean).join(' · '))+'</p>'
  +'<div class="row">'+S.STATUS.map(([k,l])=>'<button class="chip sm'+(it.status===k?' on':'')+'" data-st="'+k+'">'+l+'</button>').join('')+'</div>'
  +'<label class="lab" for="inote">Your note (on the list your manager sees)</label><input class="field" id="inote" value="'+esc(it.note)+'" placeholder="e.g. Rep submitted 10/20"></div>';
 h+=factsHtml(F);
 h+='<details class="card"><summary class="kicker" style="cursor:pointer;margin:0">What it says</summary><div style="margin-top:10px">'+cardFields(c)+saidHtml(c)+'</div></details>';
 if(!D.me.reps.length) h+='<div class="msg">Add your reps on YOU and EMAIL goes straight to them.</div>';
 const block=(id,k,l,sub,t,to,toWord)=>'<div class="card"><p class="kicker">'+l+'</p><p class="faint small" style="margin:-4px 0 8px">'+sub+'</p>'
  +(id==='pa'?'<label class="lab" for="mine" style="margin-top:0">Your line (optional)</label><input class="field" id="mine" value="'+esc(it.mine)+'" placeholder="e.g. I grew up on a dock. I can drive a boat." style="margin-bottom:8px">':'')
  +'<textarea class="field send" id="t_'+id+'" data-subj="'+esc(t.subject)+'">'+esc(t.body)+'</textarea><div class="row" style="margin-top:8px"><button class="btn" data-copy="'+id+'">COPY</button><a class="btn pri" style="flex:1;text-decoration:none" data-mail="'+id+'" data-to="'+esc(to)+'" href="#">'+toWord+'</a></div></div>';
 h+=block('pa','pa','Pass it along','To your reps: what it is, and why it\'s worth their look.',pa,repEmails(),'EMAIL YOUR REPS');
 h+=block('pt','pt','Pitch for your rep','For your rep to send the office, if they want it. Goes to your reps.',{subject:pt.subject,body:pt.body},repEmails(),'EMAIL YOUR REPS');
 h+=block('dn','dn','Straight to the office','In your voice. Your call when to send it.',dn,c.contact||'','EMAIL'+(c.contact?' '+esc(c.contact):''));
 h+='<div class="row" style="justify-content:flex-end"><button class="lnk faint" id="del">delete this one</button></div>';
 return h;
}

/* ---------- LIST ---------- */
function rowHtml(it){ const c=it.card; return '<button class="it" data-open="'+it.id+'"><span class="st">'+esc(S.statusWord(it.status))+'</span><b>'+esc(c.project||'(no title)')+(c.role?' · '+esc(c.role):'')+'</b><small>'+esc([(c.casting||[]).join(' & '),c.type,day(it.at)].filter(Boolean).join(' · '))+'</small></button>'; }
function listed(){ const L=D.items.map(it=>Object.assign({},it,{facts:factsFor(it)})); return S.find(L,U.q).filter(x=>!U.st||x.status===U.st).sort((a,b)=>b.at-a.at); }
function listView(){
 if(U.open&&item(U.open)) return itemView(item(U.open));
 if(!D.items.length) return '<div class="card"><p class="dim">Nothing spotted yet. When you see something, SPOT it.</p></div>';
 const L=listed(), n={}; D.items.forEach(x=>n[x.status]=(n[x.status]||0)+1);
 let h='<input class="field" id="q" value="'+esc(U.q)+'" placeholder="Find: an office, a show, a role, a word" style="margin-bottom:8px">';
 h+='<div class="row" style="margin-bottom:12px"><button class="chip sm'+(!U.st?' on':'')+'" data-fst="">All <i>'+D.items.length+'</i></button>'+S.STATUS.filter(([k])=>n[k]).map(([k,l])=>'<button class="chip sm'+(U.st===k?' on':'')+'" data-fst="'+k+'">'+l+' <i>'+n[k]+'</i></button>').join('')+'</div>';
 h+=L.map(rowHtml).join('')||'<p class="faint">Nothing matches.</p>';
 h+='<div class="card" style="margin-top:16px"><p class="kicker">For your manager</p><p class="dim small">'+(L.length===D.items.length?'All '+L.length:L.length+' (what you\'re looking at now)')+', with your history next to each and the links.</p>'
  +'<div class="row"><button class="btn" id="lcopy">COPY AS TEXT</button><button class="btn" id="lpage">SAVE AS A PAGE</button><a class="btn pri" id="lmail" href="#" style="text-decoration:none">EMAIL YOUR REPS</a></div></div>';
 return h;
}

/* ---------- OFFICES ---------- */
function officesView(){
 const live=D.items.filter(x=>['spotted','passed','submitted','room'].includes(x.status));
 if(!live.length) return '<div class="card"><p class="dim">Nothing spotted yet. Paste a trade story, an IMDbPro list or a casting notice on SPOT, and every office in it shows up here.</p></div>';
 const c=ctx(), OF=S.offices(live,c), R=S.report(D.items,c,me()), T=types();
 let h='';
 if(!T.length) h+='<div class="msg">Add your types on YOU (cop, dad, rancher, western) and this shows what has your words in it.</div>';
 const row=o=>'<div class="off"><p class="oh"><b>'+esc(o.name)+'</b><span class="'+(o.seen?'dim':'hit')+'">'+(o.seen?'Has had you in':'Never had you in')+'</span></p>'
  +o.now.map(x=>'<button class="it" data-open="'+x.id+'"><span class="st">'+esc(S.statusWord(x.status))+'</span><b>'+esc(x.card.project||'(no title)')+(x.card.role?' · '+esc(x.card.role):'')+'</b><small>'+esc([x.card.network,x.card.type,x.card.status].filter(Boolean).join(' · '))+'</small>'+(x.match.length?'<small class="hit">Your words in it: '+esc(x.match.join(', '))+'</small>':'')+'</button>').join('')
  +'<p class="faint small">'+esc(o.seen?(O&&O.words?O.words(o.h):''):'Nothing from them in your Hub.')+' '+esc(S.howWords(o)||(o.seen?'How they reached you isn\'t on those.':'Breakdowns or direct: ask your reps.'))+'</p></div>';
 const fresh=OF.filter(o=>!o.seen), known=OF.filter(o=>o.seen);
 if(fresh.length) h+='<p class="kicker">Casting now, never had you in <i>'+fresh.length+'</i></p>'+fresh.map(row).join('');
 if(known.length) h+='<p class="kicker" style="margin-top:18px">Casting now, has had you in <i>'+known.length+'</i></p>'+known.map(row).join('');
 if(!OF.length) h+='<div class="card"><p class="dim">No casting named on what you spotted yet. Open one and add who is casting.</p></div>';
 h+='<div class="card" style="margin-top:16px"><p class="kicker">For your reps</p><p class="faint small" style="margin:-4px 0 8px">What fits you, offices that know you, offices you should be going in for and aren\'t. Edit it, send it.'+(HUB?'':' No Hub on this device, so every office reads as new.')+'</p>'
  +'<textarea class="field send" id="t_rep" data-subj="'+esc(R.subject)+'" style="min-height:260px">'+esc(R.body)+'</textarea>'
  +'<div class="row" style="margin-top:8px"><button class="btn" data-copy="rep">COPY</button><button class="btn" id="rpage">SAVE AS A PAGE</button><a class="btn pri" style="flex:1;text-decoration:none" id="rmail" href="#">EMAIL YOUR REPS</a></div></div>';
 return h;
}

/* ---------- YOU ---------- */
function youView(){
 const y=you(), m=D.me;
 let h='<div class="card"><p class="kicker">You</p><label class="lab" for="yname">Your name</label><input class="field" id="yname" value="'+esc(y.name||'')+'" placeholder="As it goes on the note">'
  +'<label class="lab" for="yreel">Reel link</label><input class="field" id="yreel" data-me="reel" value="'+esc(m.reel)+'" placeholder="https://">'
  +'<label class="lab" for="yres">Résumé link</label><input class="field" id="yres" data-me="resume" value="'+esc(m.resume)+'" placeholder="https://">'
  +'<label class="lab" for="ysite">Your page</label><input class="field" id="ysite" data-me="site" value="'+esc(m.site)+'" placeholder="https://">'
  +'<p class="faint small" style="margin-top:8px">No page yet? The Hub\'s SEND tab builds one from your headshot, reel and credits.</p></div>';
 h+='<div class="card"><p class="kicker">Your types</p><p class="dim small" style="margin-top:-4px">Your own words for what you\'re right for, with commas: cop, dad, rancher, western, small town. Anything you spot with all of a type\'s words in it says so.</p>'
  +'<textarea class="field" id="ytypes" rows="2" placeholder="cop, dad, rancher">'+esc((y.types||[]).join(', '))+'</textarea></div>';
 h+='<div class="card"><p class="kicker">Your reps</p>'+m.reps.map((r,i)=>'<div class="pair"><input class="field" data-rep="'+i+'|name" value="'+esc(r.name)+'" placeholder="Name"><input class="field" data-rep="'+i+'|email" value="'+esc(r.email)+'" placeholder="Email" inputmode="email"><button class="lnk faint" data-rmrep="'+i+'" aria-label="Remove">✕</button></div>').join('')
  +'<button class="btn sm" id="addrep" style="margin-top:6px">ADD A REP</button></div>';
 h+='<div class="card"><p class="kicker">Conflicts you hold</p><p class="dim small" style="margin-top:-4px">A spot you booked: the brand, its category, and when it runs out. When something you spot lists the same thing, the card says so.</p>'
  +D.held.map((x,i)=>'<div class="pair"><input class="field" data-held="'+i+'|brand" value="'+esc(x.brand)+'" placeholder="Brand"><input class="field" data-held="'+i+'|category" value="'+esc(x.category)+'" placeholder="Category"><input class="field" type="date" data-held="'+i+'|until" value="'+esc(x.until)+'" aria-label="Runs out"><button class="lnk faint" data-rmheld="'+i+'" aria-label="Remove">✕</button></div>').join('')
  +'<button class="btn sm" id="addheld" style="margin-top:6px">ADD ONE</button></div>';
 h+='<p class="faint small">'+(HUB?'Reading your Hub on this device: '+HUB.projects.filter(p=>p.aaid||p.kind==='audition').length+' auditions, '+HUB.credits.length+' credits. ':'No Hub on this device. ')+'NOTES: '+(N?N.people().length:0)+' people. Read here, never changed.</p>';
 return h;
}

/* ---------- draw and wire ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===U.tab));
 $('count').textContent=D.items.length?D.items.length+' spotted · '+D.items.filter(x=>x.status==='spotted').length+' not passed along':'';
 $('main').innerHTML=U.tab==='spot'?spotView():U.tab==='list'?listView():U.tab==='offices'?officesView():youView();
 wire();
}
function cardOf(){ if(U.tab==='spot') return DRAFT&&DRAFT.card; const it=U.open&&item(U.open); return it&&it.card; }
function wire(){
 const M=$('main');
 M.querySelectorAll('[data-cf]').forEach(el=>el.onchange=()=>{ const c=cardOf(); if(!c) return; const k=el.dataset.cf, v=el.value.trim();
  if(k==='casting') c.casting=v.split(/\s*(?:,|&)\s*/).filter(Boolean); else c[k]=v; if(U.tab!=='spot') save(); render(); });
 M.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{ const c=cardOf(); if(!c) return; c.role=b.dataset.role; if(U.tab!=='spot') save(); render(); });
 if($('paste')) $('paste').onclick=async()=>{ try{ $('raw').value=await navigator.clipboard.readText(); }catch(e){ toast('Paste it into the box.'); } };
 if($('read')) $('read').onclick=()=>{ const t=$('raw').value; if(!t.trim()) return toast('Paste it first.'); const u=/^\s*https?:\/\/\S+\s*$/.test(t)?t.trim():''; readDraft(t,u); render(); };
 if($('redo')) $('redo').onclick=()=>{ DRAFT=null; render(); };
 if($('keep')) $('keep').onclick=keepDraft;
 M.querySelectorAll('[data-pick]').forEach(el=>el.onchange=()=>{ DRAFT.pick[+el.dataset.pick]=el.checked; render(); });
 if($('keepmany')) $('keepmany').onclick=keepMany;
 if(U.tab==='offices'){
  M.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy($('t_'+b.dataset.copy).value));
  if($('rmail')) $('rmail').onclick=()=>{ const ta=$('t_rep'); $('rmail').href=mail(repEmails(),ta.dataset.subj,ta.value); };
  if($('rpage')) $('rpage').onclick=()=>{ const m=me(), html=S.reportHtml({body:$('t_rep').value},m), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download='What\'s casting'+(m.name?' - '+m.name:'')+' - '+new Date().toISOString().slice(0,10)+'.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved. Attach it, or open it and print.'); };
 }
 M.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{ U.open=b.dataset.open; U.tab='list'; saveU(); render(); window.scrollTo(0,0); });
 if($('back')) $('back').onclick=()=>{ U.open=''; saveU(); render(); };
 const it=U.open&&item(U.open);
 if(it&&U.tab==='list'){
  M.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ setStatus(it,b.dataset.st); render(); });
  if($('inote')) $('inote').onchange=e=>{ it.note=e.target.value.trim(); save(); };
  if($('mine')) $('mine').onchange=e=>{ it.mine=e.target.value.trim(); save(); render(); };
  M.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy($('t_'+b.dataset.copy).value));
  M.querySelectorAll('[data-mail]').forEach(a=>a.onclick=e=>{ const id=a.dataset.mail, ta=$('t_'+id); let body=ta.value;
   if(id==='pt') body='If it helps, a note you could send them:\n\n'+body;
   a.href=mail(a.dataset.to,ta.dataset.subj,body); if(id==='pa'&&it.status==='spotted'){ setStatus(it,'passed'); setTimeout(render,300); } });
  if($('del')) $('del').onclick=()=>{ if(!confirm('Delete this one?')) return; D.items=D.items.filter(x=>x.id!==it.id); U.open=''; save(); saveU(); render(); };
 }
 if($('q')) $('q').oninput=e=>{ U.q=e.target.value; saveU(); const p=e.target.selectionStart; render(); const q=$('q'); q.focus(); try{ q.setSelectionRange(p,p); }catch(x){} };
 M.querySelectorAll('[data-fst]').forEach(b=>b.onclick=()=>{ U.st=b.dataset.fst; saveU(); render(); });
 if($('lcopy')) $('lcopy').onclick=()=>copy(S.listText(listed(),me()));
 if($('lpage')) $('lpage').onclick=()=>{ const m=me(), html=S.listHtml(listed(),m), a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); a.download='Spotted'+(m.name?' - '+m.name:'')+' - '+new Date().toISOString().slice(0,10)+'.html'; document.body.appendChild(a); a.click(); a.remove(); toast('Saved. Attach it, or open it and print.'); };
 if($('lmail')) $('lmail').onclick=()=>{ const m=me(); $('lmail').href=mail(repEmails(),'Spotted'+(m.name?' - '+m.name:''),S.listText(listed(),m)); };
 // YOU
 if($('yname')) $('yname').onchange=e=>{ try{ Y.set('name',e.target.value); }catch(x){} };
 if($('ytypes')) $('ytypes').onchange=e=>{ try{ Y.setList('types',e.target.value.split(/\s*,\s*/)); }catch(x){} };
 M.querySelectorAll('[data-me]').forEach(el=>el.onchange=()=>{ D.me[el.dataset.me]=el.value.trim(); save(); });
 M.querySelectorAll('[data-rep]').forEach(el=>el.onchange=()=>{ const [i,k]=el.dataset.rep.split('|'); D.me.reps[i][k]=el.value.trim(); save(); });
 M.querySelectorAll('[data-rmrep]').forEach(b=>b.onclick=()=>{ D.me.reps.splice(+b.dataset.rmrep,1); save(); render(); });
 if($('addrep')) $('addrep').onclick=()=>{ D.me.reps.push({name:'',email:''}); save(); render(); };
 M.querySelectorAll('[data-held]').forEach(el=>el.onchange=()=>{ const [i,k]=el.dataset.held.split('|'); D.held[i][k]=el.value.trim(); save(); });
 M.querySelectorAll('[data-rmheld]').forEach(b=>b.onclick=()=>{ D.held.splice(+b.dataset.rmheld,1); save(); render(); });
 if($('addheld')) $('addheld').onclick=()=>{ D.held.push({brand:'',category:'',until:''}); save(); render(); };
}
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ U.tab=b.dataset.t; if(b.dataset.t==='list'&&U.tab==='list') {} saveU(); render(); window.scrollTo(0,0); });
document.querySelector('#tabs [data-t="list"]').addEventListener('click',()=>{ if(U.open){ U.open=''; saveU(); render(); } });

/* shared here from another app (Android share sheet): ?title=&text=&url= */
(function(){ const q=new URLSearchParams(location.search), t=[q.get('title'),q.get('text')].filter(Boolean).join('\n'), u=q.get('url')||((q.get('text')||'').match(/https?:\/\/\S+/)||[''])[0];
 if(t||u){ readDraft([t,u&&t.indexOf(u)<0?u:''].filter(Boolean).join('\n'),u); U.tab='spot'; history.replaceState(null,'',location.pathname); } })();
render();
if(O&&O.load) O.load().then(h=>{ HUB=h; render(); }).catch(()=>{});
})();
