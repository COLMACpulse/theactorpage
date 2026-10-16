/* PAPER TRAIL engine. Every draft you have, never overwritten.
   Pure: no page, no storage. Runs in the browser (window.PaperTrail) and in Node.
   Scenes come from STORY STUDIO's reader (../film/film.js), which reads speeches
   with Actor OS's reader (../actor-os/sides.js). So a script reads the same in WRITE,
   ACT and FILM. This file adds what a registry needs: titles, draft labels, storyboard
   scene cards, draft-to-draft compare, characters across drafts, and the have / missing list.
   No scores. */
(function(g){
const T={};
const FILM=()=>g.FilmOS;

T.norm=s=>String(s||'').toUpperCase().replace(/[‘’]/g,"'").replace(/[^A-Z0-9' ]+/g,' ').replace(/\s+/g,' ').trim();
const DATE=/(?<!\d)\d{1,2}[-_.\/]\d{1,2}[-_.\/]\d{2,4}(?!\d)|(?<!\d)\d{4}[-_.]\d{1,2}[-_.]\d{1,2}(?!\d)/;

/* ---------- what a file is called ---------- */
T.titleFrom=function(text,fileName){
 const t=String(text||'').replace(/\r/g,'');
 const m=t.match(/^\s*Title:\s*(.+)$/im);                         // Fountain title page
 if(m) return T.clean(T.bare(m[1]));
 // a title page: the first all-caps line before the first scene heading that isn't a credit line
 const head=[];
 for(const raw of t.split('\n')){ const x=raw.trim(); if(/^(\d+[A-Z]?\s+)?(INT|EXT|I\/E)(?:[.\s]|\s*:\s*\S)/i.test(x)) break; if(x) head.push(x); if(head.length>=12) break; }
 for(const l of head){
  if(l.length<3||l.length>60) continue;
  if(l!==l.toUpperCase()||!/[A-Z]{2}/.test(l)) continue;
  if(/^(WRITTEN|BY|STORY BY|SCREENPLAY|DRAFT|REVISED|REVISION|FADE IN|CONTACT|COPYRIGHT|\(|SCENE \d)/i.test(l)) continue;
  if(DATE.test(l)) continue;
  return T.clean(T.bare(l));
 }
 return T.fromFileName(fileName);
};
T.fromFileName=function(fileName){
 let n=String(fileName||'Untitled').replace(/\.[a-z0-9]{2,8}$/i,'').replace(new RegExp(DATE.source,'g'),' ').replace(/[_]+/g,' ');
 n=n.replace(/\b(draft|rev(ision)?s?|revised|v)\s*\d*\b/ig,' ').replace(/\b(storyboard|sides|final|copy|export|script)\b/ig,' ')
   .replace(/\(\d+\)/g,' ').replace(/\d+$/,' ').replace(/[\s\-]+$/,'').replace(/^[\s\-]+/,'').replace(/\s+/g,' ').trim();
 return T.clean(n||'Untitled');
};
/* "LAST BUS STORYBOARD", "LAST BUS - SIDES": the title is LAST BUS */
T.bare=s=>String(s||'').replace(/\s*[-:]?\s*\b(storyboard|story board|shot ?list|sides|draft\s*\d*|revised|revisions?)\b.*$/i,'').trim()||String(s||'').trim();
T.clean=s=>String(s||'').replace(/\s+/g,' ').trim().replace(/^["']|["']$/g,'');
T.sameTitle=(a,b)=>T.norm(a).replace(/^THE /,'')===T.norm(b).replace(/^THE /,'');

/* what this draft is called among the others: "Draft 2", "6-19-17", "Revised" */
T.draftLabel=function(fileName,text){
 const src=String(fileName||'')+' '+String((String(text||'').match(/^\s*Draft date:\s*(.+)$/im)||[])[1]||'');
 const d=src.match(/\bdraft\s*#?\s*(\d+)\b/i); if(d) return 'Draft '+d[1];
 const v=src.match(/\bv\s*(\d+(?:\.\d+)?)\b/i); if(v) return 'v'+v[1];
 const dt=src.match(DATE); if(dt) return dt[0].replace(/[_.\/]/g,'-');
 if(/revis/i.test(src)) return 'Revised';
 return '';
};
T.kind=function(fileName,text){
 if(/storyboard|shot ?list|board/i.test(fileName||'')) return 'storyboard';
 const t=String(text||'');
 if((t.match(/\b(CAST|PROPS)\s*:/g)||[]).length>=2&&(t.match(/\bSCENE\s+\d+/gi)||[]).length>=1) return 'storyboard';
 return 'script';
};

/* ---------- a storyboard: SCENE 15 INT. CANTINA - DAY  CAST: ...  PROPS: ...  FX: ...  NOTES: ... ---------- */
const LABELS=['CAST','PROPS','FX','SFX','VFX','WARDROBE','NOTES','LOCATION','SHOTS'];
T.storyboard=function(text){
 const t=String(text||'').replace(/\r/g,'').replace(/[‘’]/g,"'");
 const parts=t.split(/(?=\bSCENE\s+\d+[A-Z]?\b)/i).filter(p=>/^\s*SCENE\s+\d+/i.test(p));
 const lab=new RegExp('\\b('+LABELS.join('|')+')\\s*:','g');
 return parts.map(p=>{
  const num=(p.match(/^\s*SCENE\s+(\d+[A-Z]?)/i)||[])[1]||'';
  let rest=p.replace(/^\s*SCENE\s+\d+[A-Z]?\s*/i,'');
  const first=rest.search(lab);
  let heading=(first>=0?rest.slice(0,first):rest.split('\n')[0]).replace(/\s+/g,' ').trim();
  const body=first>=0?rest.slice(first):'';
  const f={}; let m; const re=new RegExp('\\b('+LABELS.join('|')+')\\s*:','g'); const marks=[];
  while((m=re.exec(body))) marks.push({k:m[1].toUpperCase(),i:m.index,e:re.lastIndex});
  marks.forEach((x,j)=>{ const end=j+1<marks.length?marks[j+1].i:body.length; f[x.k]=(f[x.k]?f[x.k]+' ':'')+body.slice(x.e,end).replace(/\s+/g,' ').trim(); });
  const list=s=>String(s||'').split(/\s*[,;]\s*/).map(x=>x.trim()).filter(Boolean);
  const h=FILM()?FILM().heading(heading):{place:heading,tod:''};
  return {n:Number(num)||num,num:String(num),heading:heading,place:h.place,tod:h.tod,
   cast:list(f.CAST),props:list(f.PROPS),fx:[f.FX,f.SFX,f.VFX].filter(Boolean).join(' '),wardrobe:f.WARDROBE||'',notes:f.NOTES||''};
 });
};

/* ---------- the scenes of a draft, in one shape ---------- */
T.scenes=function(text,kind){
 if(kind==='storyboard') return T.storyboard(text).map((s,i)=>Object.assign({i:i,source:'storyboard'},s));
 const F=FILM(); if(!F) return [];
 return F.scenes(text).map((s,i)=>({i:i,n:s.n,num:'',source:'script',heading:s.heading,place:s.place,tod:s.tod,
  cast:F.seen(s),voices:s.speakers.filter(x=>x.voice).map(x=>x.name),lines:s.speakers.map(x=>({name:x.name,lines:x.lines})),
  props:s.props,sound:s.sound,fx:'',notes:'',
  words:s.beats.reduce((n,b)=>n+String(b.text).split(/\s+/).filter(Boolean).length,0),
  text:T.paras(s.beats).map(b=>{ const x=String(b.text).replace(/\s*\n\s*/g,' ').trim(); return b.action?x:b.who+': '+x; }).join('\n')}));
};
/* a printed script wraps action at the margin; a beat that ends mid-sentence goes on in the next one */
T.paras=function(beats){
 const out=[];
 (beats||[]).forEach(b=>{ const last=out[out.length-1];
  if(b.action&&last&&last.action&&!/[.!?…"')\]:-]$/.test(String(last.text).trim())) last.text=String(last.text).trim()+' '+String(b.text).trim();
  else out.push({who:b.who,text:String(b.text),action:b.action}); });
 return out;
};
/* the same scene across drafts: its heading, and which time that heading comes up */
T.keys=function(scenes){
 const seen={};
 return scenes.map(s=>{ const h=T.norm(s.heading); seen[h]=(seen[h]||0)+1; return h+'#'+seen[h]; });
};
T.hashText=function(s){ let h=5381; s=String(s||'').replace(/\s+/g,' ').trim(); for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h.toString(36); };

/* what changed from one draft to the next, scene by scene */
T.compare=function(prev,cur){
 const pk=T.keys(prev), ck=T.keys(cur), P={}, C={};
 prev.forEach((s,i)=>P[pk[i]]=s); cur.forEach((s,i)=>C[ck[i]]=s);
 const out={added:[],removed:[],changed:[],same:[]};
 ck.forEach(k=>{ if(!P[k]) out.added.push(C[k]); else if(T.hashText(P[k].text)!==T.hashText(C[k].text)) out.changed.push(C[k]); else out.same.push(C[k]); });
 pk.forEach(k=>{ if(!C[k]) out.removed.push(P[k]); });
 return out;
};

/* the same draft in another format: a .fdx and its .pdf, a .fountain and its .fdx. Every scene there, every
   scene the same, nothing added or cut. Then it is one draft with two files, not two drafts. */
T.sameDraft=function(a,b){ if(!a||!b||!a.length||a.length!==b.length) return false; const c=T.compare(a,b); return !c.added.length&&!c.removed.length&&!c.changed.length&&c.same.length===a.length; };

/* characters across drafts: lines per draft. drafts: [{id,label,scenes}] */
T.characters=function(drafts){
 const C={};
 drafts.forEach(d=>d.scenes.forEach(s=>{
  (s.lines||[]).forEach(x=>{ const c=C[x.name]=C[x.name]||{name:x.name,by:{},scenes:0,voice:false}; c.by[d.id]=(c.by[d.id]||0)+x.lines; });
  (s.cast||[]).forEach(n=>{ const c=C[n]=C[n]||{name:n,by:{},scenes:0,voice:false}; if(!(s.lines||[]).length) c.by[d.id]=c.by[d.id]||0; });
  (s.voices||[]).forEach(n=>{ if(C[n]) C[n].voice=true; });
 }));
 return Object.values(C).sort((a,b)=>Object.values(b.by).reduce((x,y)=>x+y,0)-Object.values(a.by).reduce((x,y)=>x+y,0)||a.name.localeCompare(b.name));
};

/* have / missing for one scene card. card: what you wrote; sb: storyboard scene or null; studio: {way,done,total} or null */
T.missing=function(scene,card,sb,studio){
 card=card||{};
 const cast=[...new Set([...(scene.cast||[]),...((sb&&sb.cast)||[]),...(card.cast||[])])];
 const props=[...new Set([...(scene.props||[]),...((sb&&sb.props)||[]),...(card.props||[])])];
 return [
  {what:'Scene text',have:scene.source==='script',from:scene.source==='script'?'the current draft':''},
  {what:'Cast',have:cast.length>0,from:cast.join(', ')},
  {what:'Props',have:props.length>0,from:props.join(', ')},
  {what:'What the scene is for',have:!!String(card.purpose||'').trim(),from:card.purpose||''},
  {what:'Storyboard',have:!!sb,from:sb?'scene '+sb.num:''},
  {what:'How you\'ll make it (Story Studio)',have:!!(studio&&studio.way),from:studio&&studio.way?studio.way:''},
  {what:'Shot',have:!!(studio&&studio.total&&studio.done===studio.total),from:studio&&studio.total?studio.done+' of '+studio.total:''}
 ];
};

/* ---------- table read marks. People mark lines; this only counts. ----------
   mark: {id, key (scene key), li (line index), h (line hash), m: landed|lost|confused, who, at} */
T.MARKS=[['landed','Landed'],['lost','Lost me'],['confused','Confused']];
T.lineHash=s=>T.hashText(T.norm(s));
T.linesOf=s=>String((s&&s.text)||'').split('\n').filter(x=>x.trim());
/* counts per scene key: {key:{landed,lost,confused,readers:[...]}} */
T.markCounts=function(marks){
 const o={};
 (marks||[]).forEach(x=>{ const c=o[x.key]=o[x.key]||{landed:0,lost:0,confused:0,readers:[]}; c[x.m]=(c[x.m]||0)+1; if(x.who&&!c.readers.includes(x.who)) c.readers.push(x.who); });
 return o;
};
/* where "lost me" and "confused" bunch up in one scene: runs of nearby lines (a gap of one line is still the same run) */
T.clusters=function(marks,key){
 const by={}; (marks||[]).filter(x=>x.key===key&&x.m!=='landed').forEach(x=>{ const b=by[x.li]=by[x.li]||{n:0,who:new Set()}; b.n++; if(x.who) b.who.add(x.who); });
 const L=Object.keys(by).map(Number).sort((a,b)=>a-b), out=[]; let cur=null;
 L.forEach(i=>{ if(cur&&i-cur.to<=2){ cur.to=i; cur.n+=by[i].n; by[i].who.forEach(w=>cur.who.add(w)); } else { if(cur) out.push(cur); cur={from:i,to:i,n:by[i].n,who:new Set(by[i].who)}; } });
 if(cur) out.push(cur);
 return out.filter(c=>c.n>=2).map(c=>({from:c.from,to:c.to,marks:c.n,readers:c.who.size}));
};
/* lines that lost people in an earlier draft and are still word for word in this one */
T.carried=function(prevMarks,curScenes){
 const have={}; curScenes.forEach((s,i)=>T.linesOf(s).forEach((l,j)=>{ const h=T.lineHash(l); (have[h]=have[h]||[]).push({scene:i,li:j,text:l}); }));
 const seen={}, out=[];
 (prevMarks||[]).filter(x=>x.m!=='landed').forEach(x=>{ if(!have[x.h]) return; const k=x.h; if(!seen[k]){ seen[k]={h:k,where:have[k][0],lost:0,confused:0}; out.push(seen[k]); } seen[k][x.m]++; });
 return out;
};

/* ---------- revision marks: line by line, what changed since the last draft ----------
   out: [{t:'same'|'new'|'cut', text}] in reading order. A rewritten line shows as cut + new. */
T.lineDiff=function(prev,cur){
 const a=prev.map(T.lineHash), b=cur.map(T.lineHash), n=a.length, m=b.length;
 const L=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 const out=[]; let i=0,j=0;
 while(i<n&&j<m){ if(a[i]===b[j]){ out.push({t:'same',text:cur[j]}); i++; j++; } else if(L[i+1][j]>=L[i][j+1]) out.push({t:'cut',text:prev[i++]}); else out.push({t:'new',text:cur[j++]}); }
 while(i<n) out.push({t:'cut',text:prev[i++]}); while(j<m) out.push({t:'new',text:cur[j++]});
 return out;
};
T.lineCounts=d=>({added:d.filter(x=>x.t==='new').length,cut:d.filter(x=>x.t==='cut').length,same:d.filter(x=>x.t==='same').length});

/* ---------- the boneyard: everything cut between drafts ----------
   drafts in order: [{id,label,scenes}]. Scenes cut whole, and lines cut from scenes that stayed. */
T.cuts=function(drafts){
 const scenes=[], lines=[];
 for(let d=1;d<drafts.length;d++){
  const P=drafts[d-1], C=drafts[d], r=T.compare(P.scenes,C.scenes);
  r.removed.forEach(s=>scenes.push({from:P.label,cutIn:C.label,heading:s.heading,text:s.text||'',scene:s}));
  const pk=T.keys(P.scenes), ck=T.keys(C.scenes);
  r.changed.forEach(s=>{ const k=ck[C.scenes.indexOf(s)], ps=P.scenes[pk.indexOf(k)];
   T.lineDiff(T.linesOf(ps),T.linesOf(s)).filter(x=>x.t==='cut').forEach(x=>lines.push({from:P.label,cutIn:C.label,heading:s.heading,text:x.text})); });
 }
 // a line cut in draft 2 and put back in draft 4 isn't in the boneyard any more
 const last=drafts.length?drafts[drafts.length-1]:null, now=new Set();
 if(last) last.scenes.forEach(s=>T.linesOf(s).forEach(l=>now.add(T.lineHash(l))));
 const seen=new Set(), heads=new Set(last?last.scenes.map(s=>T.norm(s.heading)):[]);
 return {scenes:scenes.filter(x=>{ if(heads.has(T.norm(x.heading))) return false; const h=T.hashText(x.text); if(seen.has(h)) return false; seen.add(h); return true; }),
  lines:lines.filter(x=>{ const h=T.lineHash(x.text); if(now.has(h)||seen.has(h)) return false; seen.add(h); return true; })};
};

/* ---------- setups and payoffs, secrets and who learns them ----------
   A thread points at scenes by their key (heading + which time it comes up), so it carries across drafts.
   thread: {id, kind:'setup'|'secret', what, plant:{key,heading}, payoff:{key,heading}|null, learns:[{who,key,heading}]}
   It only says what it finds. You decide what matters. */
T.threadStatus=function(th,scenes,keys){
 keys=keys||T.keys(scenes);
 const at=r=>r?keys.indexOf(r.key):-1, sc=i=>'SC '+(i+1);
 const P=at(th.plant), out={plant:P,problems:[],notes:[]};
 if(th.plant&&P<0) out.problems.push('The scene it starts in ('+th.plant.heading+') isn\'t in this draft.');
 if(th.kind==='setup'){
  const Q=at(th.payoff); out.payoff=Q;
  if(!th.payoff) out.open=true;
  else if(Q<0){ out.open=true; out.problems.push('Its payoff scene ('+th.payoff.heading+') isn\'t in this draft.'); }
  else if(P>=0&&Q<P) out.problems.push('Pays off in '+sc(Q)+', before it\'s set up in '+sc(P)+'.');
  else if(P>=0&&Q===P) out.notes.push('Set up and paid off in the same scene.');
 } else {
  out.learns=(th.learns||[]).map(l=>{ const i=at(l); const r={who:l.who,i:i,heading:l.heading};
   if(i<0) out.problems.push(l.who+' learns it in '+l.heading+', which isn\'t in this draft.');
   else { if(P>=0&&i<P) out.problems.push(l.who+' learns it in '+sc(i)+', before it starts in '+sc(P)+'.');
    const s=scenes[i], here=new Set([...(s.cast||[]),...(s.voices||[]),...((s.lines||[]).map(x=>x.name))].map(T.norm));
    if(!here.has(T.norm(l.who))) out.notes.push(l.who+' isn\'t in '+sc(i)+' in this draft (learns it off the page?).'); }
   return r; });
  const knows=new Set((th.learns||[]).map(l=>T.norm(l.who)));
  const all=new Set(); scenes.forEach(s=>(s.lines||[]).forEach(x=>all.add(x.name)));
  out.unaware=[...all].filter(n=>!knows.has(T.norm(n)));
 }
 return out;
};
/* the threads that touch one scene */
T.threadsAt=function(threads,key){
 return (threads||[]).map(th=>{ const r=[];
  if(th.plant&&th.plant.key===key) r.push(th.kind==='setup'?'set up here':'starts here');
  if(th.payoff&&th.payoff.key===key) r.push('pays off here');
  (th.learns||[]).filter(l=>l.key===key).forEach(l=>r.push(l.who+' learns it here'));
  return r.length?{th:th,roles:r}:null; }).filter(Boolean);
};

/* ---------- research: what a file is ---------- */
T.kindOf=function(type,name){
 const t=String(type||''), n=String(name||'').toLowerCase();
 if(/^image\//.test(t)||/\.(jpe?g|png|gif|webp|heic)$/.test(n)) return 'photo';
 if(/^audio\//.test(t)||/\.(m4a|mp3|wav|aac|ogg|webm)$/.test(n)&&!/^video\//.test(t)) return 'audio';
 if(/^video\//.test(t)||/\.(mp4|mov|m4v)$/.test(n)) return 'video';
 if(/pdf/.test(t)||/\.pdf$/.test(n)) return 'pdf';
 return 'file';
};
T.linkOf=function(s){ const m=String(s||'').match(/https?:\/\/[^\s<>"']+/i); return m?m[0].replace(/[).,;]+$/,''):''; };

/* ---------- search everything in a project ----------
   src: {drafts:[{label,scenes}], cards:{key:{purpose,notes,decisions}}, bones:[{text}], cuts:{scenes,lines}, research:[{name,note,url,text,who}]}
   Every hit says where it is. Nothing ranked. */
T.search=function(q,src){
 const words=T.norm(q).split(' ').filter(w=>w.length>1); if(!words.length) return [];
 const has=s=>{ const n=T.norm(s); return words.every(w=>n.includes(w)); };
 const out=[], cut=s=>{ s=String(s||'').replace(/\s+/g,' ').trim(); return s.length>160?s.slice(0,158)+' …':s; };
 (src.drafts||[]).forEach(d=>(d.scenes||[]).forEach((s,i)=>{
  if(has(s.heading)) out.push({where:d.label+' · SC '+(i+1),text:s.heading,go:{scene:i,draft:d.id}});
  T.linesOf(s).forEach(l=>{ if(has(l)) out.push({where:d.label+' · SC '+(i+1)+' · '+s.heading,text:cut(l),go:{scene:i,draft:d.id}}); });
 }));
 Object.keys(src.cards||{}).forEach(k=>{ const c=src.cards[k]||{}, h=k.replace(/#\d+$/,'');
  [['purpose','What it is for'],['notes','Notes'],['fx','FX']].forEach(([f,l])=>{ if(c[f]&&has(c[f])) out.push({where:l+' · '+h,text:cut(c[f]),go:{key:k}}); });
  (c.decisions||[]).forEach(x=>{ if(has(x.text)) out.push({where:'Decision · '+h,text:cut(x.text),go:{key:k}}); }); });
 (src.bones||[]).forEach(b=>{ if(has(b.text)) out.push({where:'Boneyard · caught',text:cut(b.text),go:{tab:'bones'}}); });
 const C=src.cuts||{};
 (C.scenes||[]).forEach(x=>{ if(has(x.heading+' '+x.text)) out.push({where:'Boneyard · scene cut in '+x.cutIn,text:x.heading,go:{tab:'bones'}}); });
 (C.lines||[]).forEach(x=>{ if(has(x.text)) out.push({where:'Boneyard · line cut in '+x.cutIn,text:cut(x.text),go:{tab:'bones'}}); });
 (src.research||[]).forEach(r=>{ if(has([r.name,r.note,r.url,r.text,r.who].join(' '))) out.push({where:'Research · '+r.kind,text:cut(r.note||r.text||r.name||r.url),go:{tab:'research',id:r.id}}); });
 return out;
};

/* ---------- study tables: research placed on a table, connected by what you say connects it ----------
   table: {id, question, items:[{id, rid, x, y, w}], links:[{id, a, b, type, note}]}  (x, y, w on a 1000 x 700 table)
   The receipt is only what you wrote. Nothing is read into it. */
T.LINKS=['unknown','same','opposite','bridge','cause','sequence','contains','echo'];
T.itemLabel=function(r){ if(!r) return '(removed from Research)'; const K={photo:'Photo',audio:'Recording',video:'Video',pdf:'PDF',file:'File',link:'Link',note:'Note'};
 const what=r.note||r.text||r.name||r.url||''; return (K[r.kind]||'File')+(what?': '+String(what).replace(/\s+/g,' ').trim().slice(0,80):''); };
T.receipt=function(table,research,title){
 const R={}; (research||[]).forEach(r=>R[r.id]=r);
 const name={}; (table.items||[]).forEach((it,i)=>name[it.id]=String(i+1)+'. '+T.itemLabel(R[it.rid]));
 const L=[(title?title+'\n':'')+'STUDY TABLE','Question: '+(String(table.question||'').trim()||'(none written)'),'',
  'On the table ('+(table.items||[]).length+'):'].concat((table.items||[]).map(it=>'  '+name[it.id]));
 L.push('','Connections ('+(table.links||[]).length+'):');
 (table.links||[]).forEach(l=>{ if(!name[l.a]||!name[l.b]) return; L.push('  '+name[l.a].split('.')[0]+' '+l.type.toUpperCase()+' '+name[l.b].split('.')[0]+(l.note?': '+l.note:'')); });
 const linked=new Set(); (table.links||[]).forEach(l=>{ linked.add(l.a); linked.add(l.b); });
 const alone=(table.items||[]).filter(it=>!linked.has(it.id)).map(it=>name[it.id].split('.')[0]);
 if(alone.length&&(table.items||[]).length>1) L.push('','Not connected to anything yet: '+alone.join(', '));
 return L.join('\n');
};

if(typeof module!=='undefined') module.exports=T;
g.PaperTrail=T;
})(typeof window!=='undefined'?window:globalThis);
