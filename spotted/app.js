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
const repEmails=()=>{ const e=D.me.reps.map(r=>r.email).filter(Boolean); try{ if(window.Contacts) Contacts.myReps().forEach(p=>{ if(p.email&&e.indexOf(p.email)<0) e.push(p.email); }); }catch(x){} return e.join(','); };
const mail=(to,subject,body)=>'mailto:'+encodeURIComponent(to||'').replace(/%2C/g,',')+'?subject='+encodeURIComponent(subject||'')+'&body='+encodeURIComponent(body||'');
async function copy(t){ try{ await navigator.clipboard.writeText(t); toast('Copied.'); }catch(e){ toast('Select the text and copy it.'); } }
function setStatus(it,s){ if(it.status===s) return; it.status=s; (it.history=it.history||[]).push({s,at:Date.now()}); save(); }
function setYours(it,k){ if((it.you_stage||'')===k) return; const was=it.you_stage||''; it.you_stage=k; S.log(it,'stage','You marked it '+S.yourStageWord(k).toLowerCase()+(was?' (was '+S.yourStageWord(was).toLowerCase()+')':'')+'.'); save(); }

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
 h+=stageHtml(c);
 if(DRAFT.from) h+='<div class="msg">From JUICE: '+esc(DRAFT.from)+'. Check the project name before you keep it.'+((c.tags||[]).length?' The site tagged it:</div><div class="row" style="margin:-4px 0 12px">'+c.tags.map(t=>'<button class="chip sm'+(t===c.project?' on':'')+'" data-tag="'+esc(t)+'">'+esc(t)+'</button>').join('')+'</div>':'</div>');
 h+='<div class="card"><p class="kicker">What it says</p>'+cardFields(c)+saidHtml(c)+'</div>';
 h+=factsHtml(F);
 const same=DRAFT.separate?[]:S.sameAs(c,D.items);
 if(same.length) h+='<div class="card ask" id="sameask"><p class="kicker">Same project?</p><p class="dim small" style="margin-top:-4px">Looks like one already on your list. Your call: add this story to it, or keep it on its own.</p>'
  +same.map(x=>'<div class="pair" style="align-items:center"><span style="flex:1"><b>'+esc(x.card.project||'(no title)')+'</b>'+(x.card.role?' · '+esc(x.card.role):'')+'<small class="faint" style="display:block">'+esc([(x.card.casting||[]).join(' & '),'spotted '+day(x.at)].filter(Boolean).join(' · '))+'</small></span><button class="btn pri sm" data-addto="'+x.id+'">ADD TO IT</button></div>').join('')
  +'<div class="row" style="margin-top:8px"><button class="btn ghost" id="redo">START OVER</button><button class="btn" id="keepsep" style="flex:1">KEEP IT SEPARATE</button></div></div>';
 else h+='<div class="row"><button class="btn ghost" id="redo">START OVER</button><button class="btn pri" id="keep" style="flex:1">KEEP IT</button></div>';
 return h;
}
function addTo(id){ const it=item(id); if(!it) return; if(DRAFT.wid&&JS){ JS.gone[DRAFT.wid]=1; W.save(JS); } S.addStory(it,DRAFT.card,DRAFT.raw); save(); DRAFT=null; U.open=it.id; U.tab='list'; saveU(); render(); toast('Added to '+(it.card.project||'it')+'. What changed is on it.'); }
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
/* where it stands, as written: the stage words quoted, a "not" said, casting, how old the story is */
const stageOf=c=>c.stage||(c.stage===undefined&&c.about?S.stage(c.about):null);
function stageHtml(c){ const st=stageOf(c); if(!st) return ''; const W=S.stageWords(st), stale=S.isStale(st);
 return '<div class="card stg'+(stale?' stale':'')+'" id="stagebox"><p class="kicker">Where it stands, as written</p><ul class="facts">'+W.map(w=>'<li'+(/^Said with a not|^Stale|Stale:/.test(w)?' class="warn"':'')+'>'+esc(w)+'</li>').join('')+'</ul>'
  +(st.claims.length?'<details style="margin-top:8px"><summary class="faint small" style="cursor:pointer">The sentences</summary>'+st.claims.concat(st.casting.map(x=>Object.assign({word:'casting'},x))).map(x=>'<p class="small" style="margin:6px 0"><span class="faint">'+esc(x.word)+(x.not?' (with a not)':'')+':</span> '+esc(x.sentence)+'</p>').join('')+'</details>':'')+'</div>'; }
/* where it is, your call: Not sure until you pick */
function yoursHtml(it){ const k=it.you_stage||'';
 return '<div class="card" id="yours"><p class="kicker">Where it is, your call</p><p class="faint small" style="margin:-4px 0 8px">'+(k?'You marked it '+esc(S.yourStageWord(k).toLowerCase())+'.':'Not sure until you say. The story\'s own words are below.')+'</p><div class="row">'+S.YOURSTAGE.map(([v,l])=>'<button class="chip sm'+(k===v?' on':'')+'" data-ys="'+v+'">'+esc(l)+'</button>').join('')+'</div></div>'; }
/* the other stories you added to this one, each with its words, its date and its link */
function moreHtml(it){ const M=it.more||[]; if(!M.length) return '';
 const host=u=>{ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } }, sites=new Set([it.card.source].concat(M.map(m=>m.source)).map(host).filter(Boolean));
 return '<div class="card" id="more"><p class="kicker">'+(M.length===1?'Another story':M.length+' more stories')+' on this</p><p class="faint small" id="sites" style="margin:-4px 0 4px">'+(M.length+1)+' stories, '+(sites.size?(sites.size===1?'all from one site':'from '+sites.size+' different sites'):'no links on them')+'. Two sites saying it is worth more than one site saying it twice.</p>'+M.slice().reverse().map(m=>{ const W=S.stageWords(m.stage).filter(w=>!/^No date in what/.test(w)), u=/^https?:\/\//i.test(m.source||'')&&!S.PRIVATE.test(m.source)?m.source:'';
  return '<div class="more"><p class="faint small" style="margin:8px 0 2px">Added '+esc(day(m.at))+'</p><ul class="facts">'+W.map(w=>'<li'+(/^Said with a not|Stale:/.test(w)?' class="warn"':'')+'>'+esc(w)+'</li>').join('')+'</ul>'+(u?'<p class="small" style="margin:4px 0"><a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(u.replace(/^https?:\/\//,'').slice(0,60))+'</a></p>':'')+'</div>'; }).join('')+'</div>'; }
/* what changed on this one, newest first: your calls, new stories, casting named, where you moved it */
function changedHtml(it){ const L=(it.log||[]).map(e=>({at:e.at,t:e.t})).concat((it.history||[]).slice(1).map(h=>({at:h.at,t:'Moved to '+S.statusWord(h.s).toLowerCase()+'.'}))).sort((a,b)=>b.at-a.at);
 if(!L.length) return '';
 return '<details class="card" id="changed"'+(L.length<=4?' open':'')+'><summary class="kicker" style="cursor:pointer;margin:0">What changed <i>'+L.length+'</i></summary><ul class="facts" style="margin-top:8px">'+L.map(e=>'<li><span class="faint">'+esc(day(e.at))+':</span> '+esc(e.t)+'</li>').join('')+'</ul></details>'; }
/* a cut for this one: Archbook builds it from your footage; the card keeps it, the notes mention it */
const mmss=n=>{ n=Math.round(n||0); return Math.floor(n/60)+':'+String(n%60).padStart(2,'0'); };
function cutLogged(it,cut){ if(!cut) return; if((it.log||[]).some(e=>e.k==='cut'&&e.reel===cut.reel)) return; S.log(it,'cut','Built a '+mmss(cut.secs)+' cut in Archbook.',cut.at); it.log[it.log.length-1].reel=cut.reel; save(); }
function cutHtml(it,cut){ const T=S.cutText(it.card,types());
 if(cut) return '<div class="card" id="cutbox"><p class="kicker">A cut for this</p><p style="margin:0 0 4px"><b>'+esc(cut.name)+'</b> · '+mmss(cut.secs)+'</p><p class="faint small" style="margin:0 0 8px">Built '+esc(day(cut.at))+' from '+(cut.from==='role'?'the role\'s own words':'the project\'s kind and your types')+'. The notes below mention it. To send the video: open it in Archbook, make the video, then Save or share.</p>'
  +'<div class="row"><a class="btn pri" style="flex:1;text-decoration:none" href="../archbook/?reel='+encodeURIComponent(cut.reel)+'">OPEN IN ARCHBOOK</a><button class="btn" id="buildcut">BUILD ANOTHER</button></div></div>';
 return '<div class="card" id="cutbox"><p class="kicker">A cut for this</p><p class="faint small" style="margin:-4px 0 8px">Archbook finds the footage you have for this role and builds a 1:00 to 2:00 cut, '+(T.from==='role'?'from the role\'s own words':'from the project\'s kind and your types (there\'s no role description on this one)')+'. Your reps get a line saying it\'s ready.</p><button class="btn pri block" id="buildcut">BUILD A CUT</button></div>'; }
function buildCut(it){ const T=S.cutText(it.card,types());
 try{ localStorage.setItem('theactorpage_handoff_cut',JSON.stringify({from:'spotted',spotted:it.id,project:it.card.project||'',role:it.card.role||'',text:T.text,src:T.from,at:Date.now()})); }catch(e){ return toast('This phone is out of room.'); }
 location.href='../archbook/?for=spotted'; }
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
 if(DRAFT.wid&&JS){ JS.gone[DRAFT.wid]=1; W.save(JS); S.log(it,'story','From JUICE: '+DRAFT.from+'.'); }
 D.items.push(it); save(); DRAFT=null; U.open=it.id; U.tab='list'; saveU(); render(); toast('Kept. Pass it along when you\'re ready.');
}

/* LOOK: one-tap searches from your types. They open Google News (or a trade's own pages through it) in your browser. */
function lookHtml(){
 const y=you(), R=S.look(types(),y.locations);
 return '<div class="card" style="margin-top:14px"><p class="kicker">Look</p><p class="dim small" style="margin-top:-4px">Searches made from your types'+(types().length?'':' (add your types on YOU)')+'. They open in your browser, so what you search goes to Google. Paste back what\'s worth it.</p>'
  +R.map(r=>'<div class="lk"><b>'+esc(r.label)+'</b><span>'+S.WHERE.map(([k,l])=>'<a href="'+esc(S.lookUrl(r.q,k))+'" target="_blank" rel="noopener noreferrer">'+l+'</a>').join('')+'</span></div>').join('')+'</div>';
}

/* ---------- one you've kept ---------- */
/* WORKED WITH: someone on this you've worked with: its director, its casting, or a name in its words */
function wwHits(it){ const WW=window.WorkedWith; if(!WW) return []; const c=it.card||{}; const a=WW.match([c.director].concat(c.casting||[])), t=WW.inText([c.about,c.raw,it.raw].concat((it.more||[]).map(m=>m.raw)).filter(Boolean).join(' ')); t.forEach(p=>{ if(!a.some(x=>WW.key(x.name)===WW.key(p.name))) a.push(p); }); return a; }
function wwHtml(it){ const H=wwHits(it); if(!H.length) return ''; const WW=window.WorkedWith, proj=(it.card&&it.card.project)||'';
 return '<div class="card"><p class="kicker">You\'ve worked with</p>'+H.map(p=>'<div class="row" style="justify-content:space-between;margin:4px 0"><span>'+esc(WW.line(p).replace(/^You worked with /,''))+'</span>'+(proj?(WW.pitched(p.name,proj)?'<small class="faint">on your reps sheet</small>':'<button class="chip sm" data-ww="'+esc(WW.key(p.name))+'">FOR MY REPS</button>'):'')+'</div>').join('')+'</div>'; }
function itemView(it){
 const c=it.card, F=factsFor(it), m=me();
 const cut=S.cutFor(it.id); cutLogged(it,cut);
 const pa=S.passAlong(Object.assign({},c,{mine:it.mine,more:it.more||[],you_stage:it.you_stage||'',cut}),F,m), pt=S.pitch(Object.assign({},c,{cut}),F,m), dn=S.direct(c,F,m);
 let h='<div class="row" style="margin-bottom:10px"><button class="lnk" id="back">‹ All spotted</button></div>';
 h+='<div class="card"><p class="kicker">'+esc(day(it.at))+'</p><h2 style="font-size:20px">'+esc(c.project||'(no title)')+'</h2><p class="dim" style="margin:4px 0 10px">'+esc([c.role,(c.casting||[]).length?c.casting.join(' & ')+' casting':''].filter(Boolean).join(' · '))+'</p>'
  +'<div class="row">'+S.STATUS.map(([k,l])=>'<button class="chip sm'+(it.status===k?' on':'')+'" data-st="'+k+'">'+l+'</button>').join('')+'</div>'
  +'<label class="lab" for="inote">Your note (on the list your manager sees)</label><input class="field" id="inote" value="'+esc(it.note)+'" placeholder="e.g. Rep submitted 10/20"></div>';
 h+=wwHtml(it);
 h+=yoursHtml(it);
 h+=stageHtml(c);
 h+=moreHtml(it);
 h+=factsHtml(F);
 h+=cutHtml(it,cut);
 h+=changedHtml(it);
 h+='<details class="card"><summary class="kicker" style="cursor:pointer;margin:0">What it says</summary><div style="margin-top:10px">'+cardFields(c)+saidHtml(c)+'</div></details>';
 if(!D.me.reps.length&&!(window.Contacts&&Contacts.myReps().some(p=>p.email))) h+='<div class="msg">Add your reps on YOU and EMAIL goes straight to them.</div>';
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
function rowHtml(it){ const c=it.card; return '<button class="it" data-open="'+it.id+'"><span class="st">'+esc(S.statusWord(it.status))+'</span><b>'+esc(c.project||'(no title)')+(c.role?' · '+esc(c.role):'')+'</b><small>'+esc([(c.casting||[]).join(' & '),c.type,(()=>{ if(it.you_stage) return S.yourStageWord(it.you_stage).toLowerCase(); const st=stageOf(c); return st&&st.stages.length===1?st.claims.find(x=>!x.not).word:st&&st.stages.length>1?'stages differ':''; })(),day(it.at)].filter(Boolean).join(' · '))+(S.isStale(stageOf(c))?' · <i class="stl">story over 120 days old</i>':'')+'</small></button>'; }
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
 const c=ctx(), OF=S.offices(live,c), T=types();
 let h='';
 if(!T.length) h+='<div class="msg">Add your types on YOU (cop, dad, rancher, western) and this shows what has your words in it.</div>';
 const row=o=>'<div class="off"><p class="oh"><b>'+esc(o.name)+'</b><span class="'+(o.seen?'dim':'hit')+'">'+(o.seen?'Has had you in':'Never had you in')+'</span></p>'
  +o.now.map(x=>'<button class="it" data-open="'+x.id+'"><span class="st">'+esc(S.statusWord(x.status))+'</span><b>'+esc(x.card.project||'(no title)')+(x.card.role?' · '+esc(x.card.role):'')+'</b><small>'+esc([x.card.network,x.card.type,x.card.status].filter(Boolean).join(' · '))+'</small>'+(x.match.length?'<small class="hit">Your words in it: '+esc(x.match.join(', '))+'</small>':'')+'</button>').join('')
  +'<p class="faint small">'+esc(o.seen?(O&&O.words?O.words(o.h):''):'Nothing from them in your Hub.')+' '+esc(S.howWords(o)||(o.seen?'How they reached you isn\'t on those.':'Breakdowns or direct: ask your reps.'))+'</p></div>';
 const fresh=OF.filter(o=>!o.seen), known=OF.filter(o=>o.seen);
 if(fresh.length) h+='<p class="kicker">Casting now, never had you in <i>'+fresh.length+'</i></p>'+fresh.map(row).join('');
 if(known.length) h+='<p class="kicker" style="margin-top:18px">Casting now, has had you in <i>'+known.length+'</i></p>'+known.map(row).join('');
 if(!OF.length) h+='<div class="card"><p class="dim">No casting named on what you spotted yet. Open one and add who is casting.</p></div>';
 h+='<a class="card" id="toreps" href="../hub/?tab=reps" style="display:block;margin-top:16px;text-decoration:none;color:inherit"><p class="kicker">For your reps ›</p><p class="faint small" style="margin:0">What fits you, offices that know you and offices you should be going in for all go on one sheet: FOR MY REPS, in the Hub. It reads what you spotted here, and after the first one it only sends what\'s new.</p></a>';
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
  +'<button class="btn sm" id="addrep" style="margin-top:6px">ADD A REP</button>'+(()=>{ try{ const m=window.Contacts?Contacts.myReps():[]; return m.length?'<p class="dim small" style="margin-top:8px">From CONTACTS too: '+esc(m.map(p=>p.name).join(', '))+'.</p>':''; }catch(e){ return ''; } })()+'<p class="small" style="margin-top:8px"><a href="../contacts/?tab=reps">Everyone in your work is in CONTACTS</a></p></div>';
 h+='<div class="card"><p class="kicker">Conflicts you hold</p><p class="dim small" style="margin-top:-4px">A spot you booked: the brand, its category, and when it runs out. When something you spot lists the same thing, the card says so.</p>'
  +D.held.map((x,i)=>'<div class="pair"><input class="field" data-held="'+i+'|brand" value="'+esc(x.brand)+'" placeholder="Brand"><input class="field" data-held="'+i+'|category" value="'+esc(x.category)+'" placeholder="Category"><input class="field" type="date" data-held="'+i+'|until" value="'+esc(x.until)+'" aria-label="Runs out"><button class="lnk faint" data-rmheld="'+i+'" aria-label="Remove">✕</button></div>').join('')
  +'<button class="btn sm" id="addheld" style="margin-top:6px">ADD ONE</button></div>';
 h+='<p class="faint small">'+(HUB?'Reading your Hub on this device: '+HUB.projects.filter(p=>p.aaid||p.kind==='audition').length+' auditions, '+HUB.credits.length+' credits. ':'No Hub on this device. ')+'NOTES: '+(N?N.people().length:0)+' people. Read here, never changed.</p>';
 return h;
}

/* ---------- JUICE: THE WIRE, only when you say ---------- */
const W=window.Wire; let JS=W?W.load():null, WIRE=null, JBUSY=false, JERR='', JOPEN={list:false,news:false};
const wireMe=()=>{ const y=you(), offs={}, add=(n,seen)=>{ const k=S.key(n); if(!k) return; offs[k]=offs[k]||{name:n,seen:false}; if(seen) offs[k].seen=true; };
 ((HUB&&HUB.projects)||[]).forEach(p=>add(p.casting_office||p.casting_director||p.casting||'',true)); D.items.forEach(it=>(it.card.casting||[]).forEach(n=>add(n,false)));
 const ppl=[]; try{ if(N) N.people().forEach(p=>ppl.push(p.name)); }catch(e){} ((HUB&&HUB.credits)||[]).forEach(c=>{ if(c.director) ppl.push(c.director); }); try{ if(window.WorkedWith) WorkedWith.all().forEach(p=>ppl.push(p.name)); }catch(e){}
 return {types:types(),wantMore:(y.wantMore||[]).filter(Boolean),places:String(y.locations||'').split(/\s*(?:,|;|\/|\band\b)\s*/).filter(Boolean),offices:Object.values(offs),people:ppl,watch:JS.watch||[],not:JS.not||[]}; };
async function juiceCheck(){
 if(!W||JBUSY) return; JBUSY=true; JERR=''; $('online').hidden=false; if(U.tab==='juice') render();
 try{ WIRE=await W.fetch(); const o=W.sort(WIRE,wireMe(),JS); JS.last={at:Date.now(),wireAt:WIRE.at,newCount:o.newCount,lines:W.receipt(WIRE,o.newCount)}; JS.day=W.today(); JS.pend=WIRE.items.map(i=>i.id); W.save(JS); }
 catch(e){ JERR=e.message||'Couldn\'t get THE WIRE.'; JS.last=Object.assign({},JS.last||{},{err:JERR,errAt:Date.now()}); W.save(JS); }
 JBUSY=false; $('online').hidden=true; if(U.tab==='juice') render(); else if(WIRE&&!JERR&&JS.last.newCount) toast('JUICE: '+JS.last.newCount+' new on THE WIRE.');
}
/* what you've looked at counts as seen when you leave the tab, so "new" means new since your last look */
function juiceSeen(){ if(!JS||!JS.pend) return; const cur=W.load(); JS.pend.forEach(id=>cur.seen[id]=1); delete JS.pend; JS.seen=cur.seen; W.save(Object.assign(cur,{seen:cur.seen})); }  // fresh from storage: another tab may have changed it
function wiRow(x){ const i=x.i, src=(WIRE.sources.find(s=>s.id===i.src)||{}).label||i.src, tc=i.kind==='taxcredit';
 const meta=tc?['California tax credit',W.day(i.allocated)].concat(W.flags(i)).join(' · '):[src,W.day(i.date)].join(' · ');
 const sub=tc?[i.company,i.type,W.plans(i)].filter(Boolean).join(' · '):(i.summary||'');
 return '<div class="wi" data-wi="'+esc(i.id)+'"><span class="src">'+esc(meta)+'</span>'+(x.fresh?'<span class="nw">NEW</span>':'')+'<b>'+esc(i.title)+'</b>'+(sub?'<div class="sm2">'+esc(sub)+'</div>':'')+(x.m.any?'<div class="why">'+esc(W.why(x.m))+'</div>':'')
  +'<div class="row"><button class="btn sm pri" data-wkeep="'+esc(i.id)+'">KEEP</button>'+(/^https:\/\//.test(i.link||'')?'<a class="btn sm" style="text-decoration:none" href="'+esc(i.link)+'" target="_blank" rel="noopener noreferrer">OPEN</a>':'')+(!tc?'<a class="btn sm" style="text-decoration:none" data-wpress href="../contacts/?press='+encodeURIComponent(src)+'&link='+encodeURIComponent(i.link||'')+'&story='+encodeURIComponent(i.title||'')+'" title="Note this outlet as press, for when you have news">PRESS</a>':'')+'<button class="btn sm ghost" data-wgone="'+esc(i.id)+'">NOT FOR ME</button></div></div>'; }
function juiceView(){
 if(!W) return '<div class="card"><p class="dim">This needs a newer copy of the page. Reload.</p></div>';
 let h='<div class="card"><p class="kicker">JUICE</p><p class="dim small" style="margin-top:-4px">The one time this goes online for you, and only when you say. It gets THE WIRE: the California Film Commission\'s tax-credit list (what plans to shoot in California, with how many cast) and the newest stories from Deadline, Variety and The Hollywood Reporter. Every phone downloads the same file, so nobody learns who\'s asking. What fits you is worked out here, on your phone.</p>'
  +'<div class="row" style="margin:6px 0 10px">'+W.MODES.map(([k,l])=>'<button class="chip sm'+(JS.mode===k?' on':'')+'" data-jmode="'+k+'">'+esc(l)+'</button>').join('')+'</div>'
  +'<button class="btn pri" id="jcheck" style="width:100%"'+(JBUSY?' disabled':'')+'>'+(JBUSY?'CHECKING…':'CHECK THE WIRE')+'</button>';
 const L=JS.last;
 if(JERR) h+='<div class="msg bad">'+esc(JERR)+'</div>';
 if(L&&L.lines) h+='<ul class="receipt" id="receipt" style="margin-top:10px">'+L.lines.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
 h+='</div>';
 h+='<details class="card" id="jwords"'+(JOPEN.words?' open':'')+'><summary class="kicker" style="cursor:pointer;margin:0">Watch for, and not for me</summary>'
  +'<label class="lab" for="jwatch">Watch for: companies, directors, showrunners you want to work with</label><input class="field" id="jwatch" value="'+esc((JS.watch||[]).join(', '))+'" placeholder="e.g. Canyon Pictures, Sam Ortiz">'
  +'<label class="lab" for="jnot">Not for me: words that keep a story out of "fits you"</label><input class="field" id="jnot" value="'+esc((JS.not||[]).join(', '))+'" placeholder="e.g. horror, reality">'
  +'<p class="faint small" style="margin:8px 0 0">Kept on this phone, like everything else here. Your types and places come from YOU.</p></details>';
 if(!WIRE){ h+='<p class="faint small">'+(L&&L.at?'Tap CHECK to look again.':'Nothing checked yet.')+' Your words, places and the offices you know come from YOU and your Hub.'+(types().length?'':' Add your types on YOU so it can show what fits.')+'</p>'; return h; }
 const o=W.sort(WIRE,wireMe(),JS), q=(U.jq||'').toLowerCase().split(/\s+/).filter(Boolean), f=x=>!q.length||q.every(w=>W.text(x.i).toLowerCase().indexOf(w)>=0);
 h+='<input class="field" id="jq" value="'+esc(U.jq||'')+'" placeholder="Find on THE WIRE: a show, a company, a word" style="margin-bottom:10px">';
 const fits=o.fits.filter(f), list=o.list.filter(f), news=o.news.filter(f);
 h+='<p class="kicker">Fits you <i>'+fits.length+'</i></p>'+(fits.map(wiRow).join('')||'<p class="faint small">Nothing with your words, places, offices or people in it'+(q.length?' for that search':'')+'.</p>');
 h+='<details class="card" id="jlist"'+(JOPEN.list||q.length?' open':'')+'><summary class="kicker" style="cursor:pointer;margin:0">The California tax-credit list <i>'+list.length+'</i></summary><p class="faint small" style="margin:8px 0">Productions approved to shoot in California, newest round first. Approved isn\'t casting: it means it plans to shoot here, with about this many cast.</p>'+list.map(wiRow).join('')+'</details>';
 h+='<details class="card" id="jnews"'+(JOPEN.news||q.length?' open':'')+'><summary class="kicker" style="cursor:pointer;margin:0">From the trades <i>'+news.length+'</i></summary><div style="margin-top:8px">'+news.map(wiRow).join('')+'</div></details>';
 return h;
}
function juiceKeep(id){ const i=WIRE&&WIRE.items.find(x=>x.id===id); if(!i) return; const src=(WIRE.sources.find(s=>s.id===i.src)||{}).label||'';
 DRAFT={raw:i.kind==='taxcredit'?'':[i.title,i.summary,i.link].filter(Boolean).join('\n'),url:i.link||'',card:W.card(i,S),from:i.kind==='taxcredit'?'the California tax-credit list':src,wid:i.id};
 U.tab='spot'; saveU(); render(); window.scrollTo(0,0); }

/* ---------- draw and wire ---------- */
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===U.tab));
 $('count').textContent=D.items.length?D.items.length+' spotted · '+D.items.filter(x=>x.status==='spotted').length+' not passed along':'';
 $('main').innerHTML=U.tab==='spot'?spotView():U.tab==='list'?listView():U.tab==='offices'?officesView():U.tab==='juice'?juiceView():youView();
 wire();
}
function cardOf(){ if(U.tab==='spot') return DRAFT&&DRAFT.card; const it=U.open&&item(U.open); return it&&it.card; }
function wire(){
 const M=$('main');
 M.querySelectorAll('[data-cf]').forEach(el=>el.onchange=()=>{ const c=cardOf(); if(!c) return; const k=el.dataset.cf, v=el.value.trim();
  if(k==='casting'){ const was=c.casting||[]; c.casting=v.split(/\s*(?:,|&)\s*/).filter(Boolean); const nw=c.casting.filter(x=>!was.some(y=>S.key(y)===S.key(x))); const it=U.tab!=='spot'&&U.open&&item(U.open); if(it&&nw.length) S.log(it,'casting','Casting named: '+nw.join(' & ')+'.'); } else c[k]=v; if(U.tab!=='spot') save(); render(); });
 M.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{ const c=cardOf(); if(!c) return; c.role=b.dataset.role; if(U.tab!=='spot') save(); render(); });
 if($('paste')) $('paste').onclick=async()=>{ try{ $('raw').value=await navigator.clipboard.readText(); }catch(e){ toast('Paste it into the box.'); } };
 if($('read')) $('read').onclick=()=>{ const t=$('raw').value; if(!t.trim()) return toast('Paste it first.'); const u=/^\s*https?:\/\/\S+\s*$/.test(t)?t.trim():''; readDraft(t,u); render(); };
 if($('redo')) $('redo').onclick=()=>{ DRAFT=null; render(); };
 if($('keep')) $('keep').onclick=keepDraft;
 M.querySelectorAll('[data-tag]').forEach(b=>b.onclick=()=>{ const c=cardOf(); if(!c) return; c.project=b.dataset.tag; render(); });
 if(U.tab==='juice'){
  M.querySelectorAll('[data-jmode]').forEach(b=>b.onclick=()=>{ JS.mode=b.dataset.jmode; W.save(JS); render(); toast(JS.mode==='daily'?'JUICE checks once a day, when you open Spotted.':'JUICE only checks when you tap.'); });
  if($('jcheck')) $('jcheck').onclick=juiceCheck;
  M.querySelectorAll('[data-wkeep]').forEach(b=>b.onclick=()=>juiceKeep(b.dataset.wkeep));
  M.querySelectorAll('[data-wgone]').forEach(b=>b.onclick=()=>{ JS.gone[b.dataset.wgone]=1; W.save(JS); render(); });
  ['jlist','jnews','jwords'].forEach(id=>{ const d=$(id); if(d) d.ontoggle=()=>{ JOPEN[{jlist:'list',jnews:'news',jwords:'words'}[id]]=d.open; }; });
  [['jwatch','watch'],['jnot','not']].forEach(([id,k])=>{ const el=$(id); if(el) el.onchange=()=>{ JS[k]=el.value.split(/\s*,\s*/).map(x=>x.trim()).filter(Boolean); W.save(JS); render(); }; });
  if($('jq')) $('jq').oninput=e=>{ U.jq=e.target.value; const p=e.target.selectionStart; render(); const q=$('jq'); q.focus(); try{ q.setSelectionRange(p,p); }catch(x){} };
 }
 if($('keepsep')) $('keepsep').onclick=()=>{ DRAFT.separate=true; keepDraft(); };
 M.querySelectorAll('[data-addto]').forEach(b=>b.onclick=()=>addTo(b.dataset.addto));
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
  M.querySelectorAll('[data-ww]').forEach(b=>b.onclick=()=>{ const p=wwHits(it).find(x=>WorkedWith.key(x.name)===b.dataset.ww); if(p){ WorkedWith.pitch(p,it.card.project||''); toast('On your reps sheet: '+p.name); render(); } });
  M.querySelectorAll('[data-ys]').forEach(b=>b.onclick=()=>{ setYours(it,b.dataset.ys); render(); });
  if($('inote')) $('inote').onchange=e=>{ it.note=e.target.value.trim(); save(); };
  if($('mine')) $('mine').onchange=e=>{ it.mine=e.target.value.trim(); save(); render(); };
  M.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copy($('t_'+b.dataset.copy).value));
  M.querySelectorAll('[data-mail]').forEach(a=>a.onclick=e=>{ const id=a.dataset.mail, ta=$('t_'+id); let body=ta.value;
   if(id==='pt') body='If it helps, a note you could send them:\n\n'+body;
   a.href=mail(a.dataset.to,ta.dataset.subj,body); if(id==='pa'&&it.status==='spotted'){ setStatus(it,'passed'); setTimeout(render,300); } });
  if($('buildcut')) $('buildcut').onclick=()=>buildCut(it);
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
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{ if(U.tab==='juice'&&b.dataset.t!=='juice') juiceSeen(); U.tab=b.dataset.t; if(b.dataset.t==='list'&&U.tab==='list') {} saveU(); render(); window.scrollTo(0,0); });
document.querySelector('#tabs [data-t="list"]').addEventListener('click',()=>{ if(U.open){ U.open=''; saveU(); render(); } });

/* shared here from another app (Android share sheet): ?title=&text=&url= */
(function(){ const q=new URLSearchParams(location.search), t=[q.get('title'),q.get('text')].filter(Boolean).join('\n'), u=q.get('url')||((q.get('text')||'').match(/https?:\/\/\S+/)||[''])[0];
 if(t||u){ readDraft([t,u&&t.indexOf(u)<0?u:''].filter(Boolean).join('\n'),u); U.tab='spot'; history.replaceState(null,'',location.pathname); } })();
render();
if(O&&O.load) O.load().then(h=>{ HUB=h; render(); }).catch(()=>{});
if(W&&JS&&W.dueToday(JS)) setTimeout(juiceCheck,600);
window.addEventListener('pagehide',()=>{ try{ if(U.tab==='juice') juiceSeen(); }catch(e){} });
})();
