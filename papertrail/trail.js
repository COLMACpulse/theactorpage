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

/* the numbers for one draft: plain counts, side by side across drafts. Counts only; what they mean is yours.
   (From WAF CORE's style counts, without its scores.) */
T.numbers=function(text){
 const F=FILM(); if(!F) return null;
 const sc=F.scenes(String(text||'')), W=t=>String(t||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;
 let speeches=0, dWords=0, aWords=0, aSent=0, q=0, longest={n:0,who:''}; const who=new Set();
 sc.forEach(s=>s.beats.forEach(b=>{ const t=String(b.text||'').replace(/\([^)]*\)/g,' '), n=W(t);
  if(b.action){ aWords+=n; aSent+=(t.match(/[.!?]+(\s|$)/g)||[]).length||(n?1:0); return; }
  speeches++; dWords+=n; who.add(b.who); if(/\?/.test(t)) q++; if(n>longest.n) longest={n,who:b.who}; }));
 const all=dWords+aWords, r1=x=>Math.round(x*10)/10;
 return {scenes:sc.length,speeches,words:all,dialoguePct:all?Math.round(dWords/all*100):null,perSpeech:speeches?r1(dWords/speeches):null,
  longest:longest.n?longest:null,perActionSentence:aSent?r1(aWords/aSent):null,questions:speeches?q:null,speakers:who.size};
};
/* how each character talks on the page: counts only. Voices (V.O. / O.S.) count as the character. */
T.talk=function(text){
 const F=FILM(); if(!F) return [];
 const W=t=>String(t||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length, by={};
 F.scenes(String(text||'')).forEach(s=>s.beats.forEach(b=>{ if(b.action) return; const who=b.who; if(!who) return;
  const t=String(b.text||'').replace(/\([^)]*\)/g,' '), n=W(t); if(!n) return;
  const c=by[who]=by[who]||{name:who,speeches:0,words:0,sentences:0,questions:0,longest:0,scenes:new Set()};
  c.speeches++; c.words+=n; c.sentences+=(t.replace(/\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|Lt|Sgt|Capt|Gen|Col|Det|Prof|Rev|Mt|vs|etc|No)\./gi,'$1').match(/[.!?]+(?=\s|$)|[-–]{2,}\s*$/g)||[]).length||1; if(/\?/.test(t)) c.questions++; if(n>c.longest) c.longest=n; c.scenes.add(s.n); }));
 const r1=x=>Math.round(x*10)/10;
 return Object.values(by).map(c=>({name:c.name,speeches:c.speeches,perSpeech:r1(c.words/c.speeches),perSentence:r1(c.words/c.sentences),questions:c.questions,longest:c.longest,scenes:c.scenes.size,words:c.words}))
  .sort((a,b)=>b.words-a.words||a.name.localeCompare(b.name));
};
T.NUMROWS=[['scenes','Scenes'],['speeches','Speeches'],['words','Words'],['dialoguePct','Words that are dialogue'],['perSpeech','Words per speech'],['longest','Longest speech'],['perActionSentence','Words per action sentence'],['questions','Speeches that ask a question'],['speakers','Characters who speak']];
T.numberText=function(k,v){ if(v==null) return '–'; if(k==='dialoguePct') return v+'%'; if(k==='longest') return v.n+' words ('+v.who+')'; return String(v); };

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

/* ---------- AI chats: a ChatGPT or Claude export, read on this device ----------
   Only the chats that name the project are kept, as research notes with their date. Nothing ranked or guessed. */
const chatText=c=>{ if(c==null) return ''; if(typeof c==='string') return c; if(Array.isArray(c)) return c.map(chatText).filter(Boolean).join('\n');
 if(typeof c==='object'){ if(Array.isArray(c.parts)) return c.parts.map(chatText).filter(Boolean).join('\n'); if(typeof c.text==='string') return c.text; if(c.content!=null) return chatText(c.content); } return ''; };
const ms=t=>{ if(t==null||t==='') return 0; if(typeof t==='number') return t<1e12?Math.round(t*1000):t; const d=Date.parse(t); return isNaN(d)?0:d; };
/* data: the parsed conversations.json -> [{id, title, at, from, msgs:[{who:'you'|'ai', text, at}]}] */
T.chatsOf=function(data){
 const L=Array.isArray(data)?data:(data&&Array.isArray(data.conversations)?data.conversations:[]), out=[];
 L.forEach((c,i)=>{ if(!c||typeof c!=='object') return;
  let msgs=[], from='';
  if(c.mapping&&typeof c.mapping==='object'){ from='ChatGPT';
   const M=c.mapping; let chain=[];
   if(c.current_node&&M[c.current_node]){ let n=c.current_node, guard=0; while(n&&M[n]&&guard++<100000){ chain.push(M[n]); n=M[n].parent; } chain.reverse(); }
   else chain=Object.values(M).sort((a,b)=>ms(a.message&&a.message.create_time)-ms(b.message&&b.message.create_time));
   chain.forEach(n=>{ const m=n&&n.message; if(!m) return; const role=(m.author&&m.author.role)||''; if(role!=='user'&&role!=='assistant') return;
    const t=chatText(m.content).trim(); if(t) msgs.push({who:role==='user'?'you':'ai',text:t,at:ms(m.create_time)}); }); }
  else if(Array.isArray(c.chat_messages)){ from='Claude';
   c.chat_messages.forEach(m=>{ const t=(typeof m.text==='string'&&m.text.trim()?m.text:chatText(m.content)).trim(); if(!t) return;
    msgs.push({who:/^(human|user)$/i.test(m.sender||m.role||'')?'you':'ai',text:t,at:ms(m.created_at)}); }); }
  else return;
  out.push({id:String(c.id||c.uuid||c.conversation_id||('c'+i)),title:String(c.title||c.name||'Untitled chat').trim()||'Untitled chat',at:ms(c.create_time||c.created_at)||(msgs[0]&&msgs[0].at)||0,from,msgs});
 });
 return out;
};
/* the project's name written as a title: LOW TIDE, Low Tide, LOW_TIDE, Low-Tide, LowTide. Plain lowercase
   ("low tide", "low-tide soap") is ordinary words, not the title, so it does not count. */
T.nameRe=function(name){ const w=T.norm(name).replace(/^THE /,'').split(' ').filter(Boolean).map(x=>x.replace(/[^A-Z0-9']/g,'')).filter(Boolean); if(!w.length) return null;
 const q=x=>x.replace(/'/g,"'?"), sep='[\\s_.-]*';
 // each word starts with its capital; the rest of the word in any case (Low Tide, Mrs. O'Neil, McCLOUD)
 const cap=x=>x[0]+x.slice(1).split('').map(c=>/[A-Z]/.test(c)?'['+c+c.toLowerCase()+']':c).join('');
 const up=w.map(q).join(sep), ti=w.map(x=>q(cap(x))).join(sep);
 return {test:s=>new RegExp('(^|[^A-Za-z0-9])((THE|The|the)[\\s_-]*)?(?:'+up+'|'+ti+')(?![A-Za-z0-9])').test(String(s||''))}; };
/* chats that name any of the names -> [{chat, hits:[msg index]}]; a hit brings the reply after it along */
T.chatsFor=function(chats,names){ const R=(names||[]).map(T.nameRe).filter(Boolean); if(!R.length) return [];
 const hit=s=>R.some(r=>r.test(s));
 return (chats||[]).map(c=>{ const idx=new Set(); c.msgs.forEach((m,i)=>{ if(hit(m.text)){ idx.add(i); if(c.msgs[i+1]) idx.add(i+1); } });
  if(!idx.size&&hit(c.title)) c.msgs.slice(0,2).forEach((m,i)=>idx.add(i));
  return idx.size?{chat:c,hits:[...idx].sort((a,b)=>a-b)}:null; }).filter(Boolean); };
/* the note kept in Research: who said what, as it was said (long messages trimmed, said so) */
T.chatNote=function(m,max){ max=max||1500; const c=m.chat, ai=c.from||'AI';
 const lines=m.hits.slice(0,14).map(i=>{ const x=c.msgs[i]; let t=x.text.replace(/\n{3,}/g,'\n\n').trim(); if(t.length>max) t=t.slice(0,max).replace(/\s+\S*$/,'')+' … (trimmed)'; return (x.who==='you'?'You':ai)+': '+t; });
 return lines.join('\n\n')+(m.hits.length>14?'\n\n('+(m.hits.length-14)+' more messages name it; see the chat in '+ai+'.)':''); };

/* ---------- study tables: research placed on a table, connected by what you say connects it ----------
   table: {id, question, items:[{id, rid, x, y, w}], links:[{id, a, b, type, note}]}  (x, y, w on a 1000 x 700 table)
   The receipt is only what you wrote. Nothing is read into it. */
T.LINKS=['unknown','same','opposite','bridge','cause','sequence','contains','echo'];
T.itemLabel=function(r){ if(!r) return '(removed from Research)'; const K={photo:'Photo',audio:'Recording',video:'Video',pdf:'PDF',file:'File',link:'Link',note:'Note',chat:'AI chat'};
 const what=r.note||(r.kind==='chat'?r.name:'')||r.text||r.name||r.url||''; return (K[r.kind]||'File')+(what?': '+String(what).replace(/\s+/g,' ').trim().slice(0,80):''); };
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

/* ---------- a character's sheet: everything the script says, quoted, nothing guessed ----------
   scenes: [{heading, text ("WHO: line" for speech), lines:[{name}], cast}]. -> {lines, mentions, scenes, with} */
T.sheet=function(name,scenes){
 const N=T.norm(name), re=T.nameRe(name), out={lines:[],mentions:[],scenes:[],with:{}};
 (scenes||[]).forEach((s,i)=>{ const who=(s.lines||[]).map(x=>x.name), here=who.some(n=>T.norm(n)===N)||(s.cast||[]).some(n=>T.norm(n)===N);
  let saw=false;
  String(s.text||'').split('\n').forEach(l=>{ const m=l.match(/^([^:]{1,40}):\s(.*)$/), sp=m&&who.some(n=>T.norm(n)===T.norm(m[1]))?m[1]:null;
   if(sp&&T.norm(sp)===N){ out.lines.push({i,heading:s.heading,text:m[2]}); saw=true; }
   else if(!sp&&re&&re.test(l)){ out.mentions.push({i,heading:s.heading,text:l.length>300?l.slice(0,299)+'…':l}); saw=true; }
   else if(sp&&re&&re.test(m[2])){ out.mentions.push({i,heading:s.heading,text:l.length>300?l.slice(0,299)+'…':l,by:sp}); } });
  if(here||saw){ out.scenes.push(i); new Set(who.concat(s.cast||[]).map(T.norm)).forEach(n=>{ if(n&&n!==N) out.with[n]=(out.with[n]||0)+1; }); }
 });
 out.with=Object.entries(out.with).map(([n,k])=>({name:n,scenes:k})).sort((a,b)=>b.scenes-a.scenes||a.name.localeCompare(b.name));
 return out;
};
/* every character across your projects (current draft of each). Same name in different projects: listed, never merged. */
T.allChars=function(projects){
 const C={};
 (projects||[]).forEach(p=>{ T.characters([{id:p.id,scenes:p.scenes}]).forEach(c=>{ const k=T.norm(c.name); const x=C[k]=C[k]||{name:c.name,in:[]}; x.in.push({pid:p.id,title:p.title,lines:c.by[p.id]||0}); }); });
 return Object.values(C).sort((a,b)=>b.in.length-a.in.length||b.in.reduce((n,x)=>n+x.lines,0)-a.in.reduce((n,x)=>n+x.lines,0)||a.name.localeCompare(b.name));
};

/* ---------- NOT THIS: things you've said no to. Where their words show up in a draft. ----------
   A word match, not a verdict: "Vale never uses a flintlock" looks for VALE and FLINTLOCK on the same line
   (a speech counts its speaker's name). It can miss the same idea in other words, and it can find a line
   that's fine. You read it. */
const NT_STOP=new Set('a an the and or but nor not no never ever any anymore again is are was were be been being do does did doesn don didn isn aren wasn won wouldn shouldn can cant cannot could would should will shall may might must has have had having with without of to in on at by for from into onto over under about as than then that this these those there here it its he she they them him her his hers their theirs we us our you your i me my who whom whose what which when where why how all some just only also too very so such one ones get gets got make makes made let lets use uses used using says said'.split(' '));
T.ntWords=function(text){ const out=[]; String(text||'').toLowerCase().replace(/[‘’]/g,"'").replace(/'s\b/g,'').split(/[^a-z0-9']+/).forEach(w=>{ w=w.replace(/^'+|'+$/g,''); if(w.length>=3&&!/n't$|'(ll|re|ve|d|m)$/.test(w)&&!NT_STOP.has(w)&&!/^\d+$/.test(w)&&!out.includes(w)) out.push(w); }); return out; };
const ntHas=(tokens,w)=>tokens.some(t=>t===w||(t.startsWith(w)&&/^(s|es|ed|d|ing|er|ers|ly)$/.test(t.slice(w.length)))||(w.endsWith('e')&&(t===w.slice(0,-1)+'ing'||t===w.slice(0,-1)+'ed'))||(w.endsWith('ie')&&t===w.slice(0,-2)+'ying'));
const ntTokens=s=>String(s||'').toLowerCase().replace(/[‘’]/g,"'").replace(/'s\b/g,'s').split(/[^a-z0-9']+/).map(t=>t.replace(/'/g,'')).filter(Boolean);
/* fact: {text, words?:[]}. scenes: [{heading, text}]. -> [{i, heading, line}] every line with all of its words (two at most needed) */
T.ntHits=function(fact,scenes){
 const W=(fact.words&&fact.words.length?fact.words.map(w=>String(w).toLowerCase().trim()).filter(Boolean):T.ntWords(fact.text));
 if(!W.length) return [];
 const need=Math.min(2,W.length), out=[];
 (scenes||[]).forEach((sc,i)=>{ let who='';
  String(sc.text||'').split('\n').forEach(raw=>{ const line=raw.trim(); if(!line) { return; }
   const cue=/^[A-Z][A-Z0-9 .'’\-]{1,30}(\s*\([^)]*\))?$/.test(line)&&!/^(INT|EXT|EST|I\/E)[.\s]/.test(line)&&!/:\s*$/.test(line);
   if(cue){ who=line.replace(/\s*\(.*\)$/,''); return; }
   const tk=ntTokens(line+' '+who), got=W.filter(w=>ntHas(tk,w));
   if(got.length>=need) out.push({i,heading:sc.heading||'',line:line.length>200?line.slice(0,199)+'…':line,words:got});
  });
 });
 return out;
};

/* ---------- PROOF OF DRAFT: every draft, the day it came in, its fingerprint. (The idea from Truthsource.) ----------
   items: [{title, drafts:[{label,kind,file,added,words,sha,ok}]}]; ok=false: the words kept here no longer give the
   fingerprint they came in with. made: a time. Dates are this device's clock, in UTC, and the receipt says so. */
T.utc=t=>{ const d=new Date(t); return isNaN(d)?'':d.toISOString().slice(0,16).replace('T',' ')+' UTC'; };
T.proof=function(items,made){
 const L=['PROOF OF DRAFT',(items||[]).length===1?items[0].title:(items||[]).length+' projects','Made '+T.utc(made)+' in Paper Trail (theactorpage).','',
  'Each fingerprint is SHA-256 of the draft\'s words, with spacing ignored. Change one word and the fingerprint changes completely.',''];
 let n=0;
 (items||[]).forEach(p=>{ if((items||[]).length>1) L.push(p.title.toUpperCase());
  (p.drafts||[]).forEach(d=>{ n++;
   L.push(n+'. '+d.label+' ('+d.kind+')'+(d.file?' · '+d.file:''),'   Came in '+T.utc(d.added)+' · '+Number(d.words||0).toLocaleString('en-US')+' words',
    '   SHA-256 '+(d.sha||'none'));
   if(d.ok===false) L.push('   The words kept here no longer give the fingerprint this draft came in with.');
   L.push(''); });
  if(!(p.drafts||[]).length) L.push('No drafts.','');
 });
 L.push('What this proves: a file whose words give the same fingerprint is that draft, word for word.',
  'What it does not prove: when you wrote it. The dates come from this device\'s clock. For a date someone else will stand behind, email this receipt to yourself or register the script.',
  'To check a file later: Paper Trail, Drafts, CHECK A FILE.');
 return L.join('\n');
};

/* ---------- SOUNDS LIKE YOU: one scene next to everything else you wrote. Counts and your closest lines. No score. ----------
   (The one part of AUTHORIAL VOICE ENGINE that held up: quote your own lines back, cited. Its labels are not here.) */
/* scenes from T.scenes -> lines: {who (null = action), text, i, heading, pid, title} */
T.vUnits=function(scenes,meta){
 const out=[]; meta=meta||{};
 (scenes||[]).forEach((s,i)=>{ const who=new Set((s.lines||[]).map(x=>T.norm(x.name)));
  String(s.text||'').split('\n').forEach(l=>{ l=l.trim(); if(!l) return; const m=l.match(/^([^:]{1,40}):\s(.*)$/);
   if(m&&who.has(T.norm(m[1]))) out.push({who:m[1],text:m[2],i,heading:s.heading||'',pid:meta.pid,title:meta.title});
   else out.push({who:null,text:l,i,heading:s.heading||'',pid:meta.pid,title:meta.title}); }); });
 return out;
};
/* text with no scene heading (prose, a pasted bit): read it as one scene */
T.vScenes=function(text){ let s=T.scenes(String(text||''),'script'); if(!s.length&&String(text||'').trim()) s=T.scenes('INT. PAGE - DAY\n\n'+text,'script').map(x=>Object.assign(x,{heading:''})); return s; };
const vSent=t=>String(t||'').replace(/\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|Lt|Sgt|Capt|Gen|Col|Det|Prof|Rev|Mt|vs|etc|No)\./gi,'$1').replace(/\([^)]*\)/g,' ')
 .split(/(?<=[.!?…]["')\]]?)\s+|(?<=--|—)\s+/).map(x=>x.trim()).filter(x=>/[A-Za-z0-9]/.test(x));
const vWords=t=>String(t||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w));
T.vMeasure=function(units){
 let W=0,dW=0,aW=0,dS=0,aS=0,S=0,frag=0,ask=0,bang=0,dots=0,dash=0,con=0;
 (units||[]).forEach(u=>{ const t=String(u.text||''), w=vWords(t.replace(/\([^)]*\)/g,' ')), ss=vSent(t);
  W+=w.length; if(u.who){ dW+=w.length; dS+=ss.length; } else { aW+=w.length; aS+=ss.length; }
  ss.forEach(s=>{ S++; if(vWords(s).length<=3) frag++; if(/\?["')\]]?$/.test(s)) ask++; if(/!["')\]]?$/.test(s)) bang++; });
  dots+=(t.match(/\.\.\.|…/g)||[]).length; dash+=(t.match(/--|—|\s–\s/g)||[]).length;
  con+=(t.replace(/’/g,"'").match(/[A-Za-z](n't|'re|'ll|'ve|'d|'m)\b/gi)||[]).length; });
 const r1=x=>Math.round(x*10)/10, pc=(a,b)=>b?Math.round(a/b*100):null;
 return {words:W,dialoguePct:pc(dW,W),perD:dS?r1(dW/dS):null,perA:aS?r1(aW/aS):null,frag:pc(frag,S),ask:pc(ask,S),bang:pc(bang,S),
  dots:W?r1(dots/W*1000):null,dash:W?r1(dash/W*1000):null,contr:W?r1(con/W*100):null};
};
T.VROWS=[['words','Words'],['dialoguePct','Words that are dialogue'],['perD','Words a sentence, dialogue'],['perA','Words a sentence, action'],
 ['frag','Sentences of 3 words or fewer'],['ask','Sentences that ask'],['bang','Sentences that end in !'],['dots','Trail-offs (...) per 1,000 words'],
 ['dash','Dashes per 1,000 words'],['contr','Contractions per 100 words']];
T.vText=function(k,v){ if(v==null) return '–'; if(k==='words') return v.toLocaleString('en-US'); if(/Pct$|^(frag|ask|bang)$/.test(k)) return v+'%'; return String(v); };
const vTok=(t,names)=>{ const out=new Set(); String(t||'').toLowerCase().replace(/[‘’]/g,"'").split(/[^a-z0-9']+/).forEach(w=>{ w=w.replace(/^'+|'+$/g,'').replace(/'s$/,'');
 if(w.length<3||NT_STOP.has(w)||/^\d+$/.test(w)||/'/.test(w)||names.has(w)) return; out.add(w.length>4&&/[^s]s$/.test(w)?w.slice(0,-1):w); }); return out; };
/* for each line here, the line of yours that shares the most uncommon words (two at least). Names don't count.
   Word for word the same: counted apart, not shown as a match. -> {pairs:[{mine,yours,words}], same:[units]} */
T.vClosest=function(mine,base,names,n){
 n=n||6; const NM=new Set(); (names||[]).forEach(x=>T.norm(x).toLowerCase().split(' ').forEach(w=>{ if(w) NM.add(w.replace(/'s$/,'')); }));
 const BT=(base||[]).map(u=>vTok(u.text,NM)), df={}, ix={}; BT.forEach((s,k)=>s.forEach(w=>{ df[w]=(df[w]||0)+1; (ix[w]=ix[w]||[]).push(k); }));
 const N=BT.length||1, idf=w=>Math.log((N+1)/((df[w]||0)+1))+0.01, key=s=>T.norm(s), sameK=new Set((base||[]).map(u=>key(u.text)));
 const pairs=[], same=[];
 (mine||[]).forEach(u=>{ if(key(u.text)&&sameK.has(key(u.text))&&vWords(u.text).length>=4){ same.push(u); return; }
  const q=vTok(u.text,NM), sc={}; q.forEach(w=>(ix[w]||[]).forEach(k=>{ (sc[k]=sc[k]||[]).push(w); }));
  let best=null; Object.keys(sc).forEach(k=>{ const ws=sc[k]; if(ws.length<2) return; const s=ws.reduce((a,w)=>a+idf(w),0); if(!best||s>best.s) best={k:+k,s,ws}; });
  if(best) pairs.push({mine:u,yours:base[best.k],words:best.ws.sort((a,b)=>idf(b)-idf(a)),s:best.s,k:best.k}); });
 const seen=new Set();
 return {pairs:pairs.sort((a,b)=>b.s-a.s).filter(p=>!seen.has(p.k)&&seen.add(p.k)).slice(0,n).map(({mine,yours,words})=>({mine,yours,words})),same};
};


/* ---------- PACKAGE: what a script needs to go out. The facts from the pages, and each piece drafted from your
   own lines if you ask (raw material to rewrite, never sent as is) or written by you. Lengths said plainly. ---------- */
T.PK_KINDS=[['feature','Feature',90,120],['short','Short',5,40],['tv30','TV half hour',25,35],['tv60','TV hour',50,65]];
T.PK_PIECES=[['logline','Logline','One sentence: who, what they want, what is in the way.'],['short','Short synopsis','One paragraph. Goes on the one-sheet and in the query.'],['synopsis','Synopsis','About a page, the whole story, ending included.'],['treatment','Treatment','The story told scene by scene, in the present tense.'],['characters','Characters','One line each for the leads.'],['query','Query letter','A short email asking them to read it.']];
const pkAction=s=>String(s.text||'').split('\n').filter(l=>!/^([^:]{1,40}):\s/.test(l)||!(s.lines||[]).some(x=>T.norm(x.name)===T.norm(l.split(':')[0]))).join(' ');
const pkSpeech=s=>String(s.text||'').split('\n').filter(l=>{ const m=l.match(/^([^:]{1,40}):\s(.*)$/); return m&&(s.lines||[]).some(x=>T.norm(x.name)===T.norm(m[1])); });
const pkSent=t=>String(t||'').replace(/\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|Lt|Sgt|Capt|Gen|Col|Det|Prof|Rev|Mt|vs|etc|No)\./gi,'$1\u0001').split(/(?<=[.!?\u2026]["')\]]?)\s+/).map(x=>x.replace(/\u0001/g,'.').trim()).filter(x=>/[A-Za-z0-9]/.test(x));
const firstSent=t=>pkSent(t)[0]||'';
const cap=(t,n)=>{ const w=String(t||'').split(/\s+/).filter(Boolean); return w.length>n?w.slice(0,n).join(' ')+'…':w.join(' '); };
/* pages the way a script lays out: action wraps near 61 characters, dialogue near 35, 55 lines a page */
T.pkPages=function(scenes){ let L=0; (scenes||[]).forEach(s=>{ L+=2; String(s.text||'').split('\n').forEach(l=>{ const m=l.match(/^([^:]{1,40}):\s(.*)$/), sp=m&&(s.lines||[]).some(x=>T.norm(x.name)===T.norm(m[1]));
 if(sp) L+=2+Math.ceil(m[2].length/35); else if(l.trim()) L+=1+Math.ceil(l.length/61); }); }); return Math.max(1,Math.round(L/55)); };
T.pkIntro=function(name,scenes){ const re=T.nameRe(name); if(!re) return '';
 for(const s of scenes||[]){ const S=pkSent(pkAction(s)); const hit=S.find(x=>re.test(x)); if(hit) return hit; } return ''; };
T.pkFacts=function(scenes,text,kind){
 const K=T.PK_KINDS.find(k=>k[0]===kind)||T.PK_KINDS[0], pages=T.pkPages(scenes), C=T.characters([{id:'d',scenes:scenes||[]}]).filter(c=>(c.by.d||0)>0);
 const head=String(text||'').split(/\n\s*\n/)[0]||'', titlePage=/^\s*title\s*:/im.test(head)||/written by/i.test(String(text||'').slice(0,600));
 const inRange=pages>=K[2]&&pages<=K[3];
 return {pages,scenes:(scenes||[]).length,speakers:C.length,lead:C[0]?C[0].name:'',chars:C.map(c=>({name:c.name,lines:c.by.d})),words:(scenes||[]).reduce((n,s)=>n+(s.words||0),0),titlePage,kind:K[0],
  pageWords:'About '+pages+' page'+(pages===1?'':'s')+'. '+K[1]+'s usually run '+K[2]+' to '+K[3]+'.'+(inRange?'':pages<K[2]?' This one is shorter.':' This one is longer.'),
  titleWords:titlePage?'Title page: there.':'No title page in this draft. THEACTORPAGES puts one on the PDF.'};
};
T.pkDraft=function(piece,c){
 const sc=c.scenes||[], F=c.facts||T.pkFacts(sc,c.text,c.kind), lead=F.lead, n=sc.length, title=c.title||'Untitled';
 const sceneLine=s=>{ const a=firstSent(pkAction(s)); if(a) return a; const sp=pkSpeech(s)[0]; if(!sp) return ''; const m=sp.match(/^([^:]{1,40}):\s(.*)$/); return m[1]+': “'+cap(m[2],18)+'”'; };
 const pick=k=>{ if(n<=k) return sc.slice(); const out=[]; for(let i=0;i<k;i++) out.push(sc[Math.round(i*(n-1)/(k-1))]); return out.filter((x,i,a)=>a.indexOf(x)===i); };
 if(piece==='logline'){ const a=lead?T.pkIntro(lead,sc):'', b=n?firstSent(pkAction(sc[n-1])):''; return cap([a,b].filter(Boolean).join(' '),50); }
 if(piece==='short'){ return cap(pick(3).map(sceneLine).filter(Boolean).join(' '),160); }
 if(piece==='synopsis'){ const L=pick(30).map(sceneLine).filter(Boolean), P=[]; for(let i=0;i<L.length;i+=5) P.push(L.slice(i,i+5).join(' ')); return cap(P.join('\n\n'),600).replace(/ ?…$/,'…'); }
 if(piece==='treatment'){ const beat=(s,i,k)=>{ const A=pkSent(pkAction(s)).slice(0,k).join(' '), sp=pkSpeech(s)[0]; return (s.heading||('Scene '+(i+1)))+'\n'+(A||(sp?sp.replace(/^([^:]{1,40}):\s/,'$1: '):'')); };
  let t=sc.map((s,i)=>beat(s,i,2)).join('\n\n'); if(vWords(t).length>4500) t=sc.map((s,i)=>beat(s,i,1)).join('\n\n'); return t; }
 if(piece==='characters'){ return (F.chars||[]).slice(0,6).map(ch=>{ const i=T.pkIntro(ch.name,sc); return ch.name+': '+(i||ch.lines+' line'+(ch.lines===1?'':'s')+'.'); }).join('\n'); }
 if(piece==='query'){ const y=c.you||{}, K=(T.PK_KINDS.find(k=>k[0]===F.kind)||T.PK_KINDS[0])[1].toLowerCase();
  return ['Dear [their name],','','I’m writing to ask if you’d read '+title+', a '+F.pages+'-page '+K+(c.genre?' '+c.genre.toLowerCase():'')+'.','',(c.logline||'[Your logline.]'),'',(c.short||'[Your short synopsis.]'),'','[A line or two about you.]','','Thank you for your time.','',(y.name||'[Your name]'),[y.email,y.phone].filter(Boolean).join(' · ')].join('\n').replace(/\n+$/,''); }
 return '';
};
T.pkCheck=function(piece,text){
 const w=vWords(text).length, S=vSent(text).length, say=(lo,hi,what)=>w+' words. '+what+' usually run'+(what.endsWith('s')?'':'s')+' '+lo+' to '+hi+'.'+(w<lo?' This is shorter.':w>hi?' This is longer.':'');
 if(!String(text||'').trim()) return '';
 if(piece==='logline') return w+' word'+(w===1?'':'s')+', '+S+' sentence'+(S===1?'':'s')+'. Loglines are one sentence, usually 25 to 50 words.'+(S>1?' This is '+S+'.':'')+(w>50?' This is longer.':'');
 if(piece==='short') return say(80,160,'Short synopses');
 if(piece==='synopsis') return say(300,650,'One-page synopses');
 if(piece==='treatment') return say(1000,6000,'Treatments');
 if(piece==='characters'){ const n=String(text).split('\n').filter(x=>x.trim()).length; return n+' character'+(n===1?'':'s')+'.'; }
 if(piece==='query') return w+' words. Queries are best kept under 300.'+(w>300?' This is longer.':'');
 return '';
};

/* ---------- SENT OUT: where each script went, when, which draft, the fee, what came back. Your words, your marks. ---------- */
T.SEND_KINDS=[['contest','Contest'],['fellowship','Fellowship or lab'],['hosting','Hosting site'],['manager','Manager'],['agent','Agent'],['company','Production company'],['festival','Festival'],['other','Other']];
T.SEND_STATUS=[['planned','Going to send'],['sent','Sent, waiting'],['asked','They asked for more'],['advanced','Moved on a round'],['won','Won or placed'],['passed','Passed'],['quiet','No answer']];
T.sendLabel=(L,k)=>(L.find(x=>x[0]===k)||[k,k])[1];
const dshort=d=>{ if(!d) return ''; const x=new Date(d+'T12:00:00'); return isNaN(x)?String(d):x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); };
T.sendWords=function(e){ const L=[T.sendLabel(T.SEND_KINDS,e.kind)];
 if(e.status==='planned') L.push(e.deadline?'deadline '+dshort(e.deadline):'not sent yet'); else if(e.sent) L.push('sent '+dshort(e.sent));
 if(e.fee) L.push('fee '+String(e.fee).replace(/^\$?/,'$')); if(e.draft) L.push(e.draft); if(e.heard) L.push('heard '+dshort(e.heard));
 return L.join(' · '); };
T.sendSummary=function(list){ const c={}; (list||[]).forEach(e=>{ c[e.status]=(c[e.status]||0)+1; });
 const out=(list||[]).filter(e=>e.status!=='planned').length, fees=(list||[]).reduce((n,e)=>n+(parseFloat(String(e.fee||'').replace(/[^0-9.]/g,''))||0),0);
 const L=[out+' sent'];
 [['sent','waiting'],['asked','asked for more'],['advanced','moved on'],['won','won or placed'],['passed','passed'],['quiet','no answer'],['planned','going to send']].forEach(([k,w])=>{ if(c[k]) L.push(c[k]+' '+w); });
 if(fees) L.push('$'+(Math.round(fees*100)/100).toLocaleString('en-US')+' in fees');
 return (list||[]).length?L.join(' · '):'Nothing sent yet.'; };
/* deadlines coming up, for what you're going to send: the next 30 days */
T.sendDue=function(list,now){ const d0=new Date(now||Date.now()); d0.setHours(0,0,0,0);
 return (list||[]).filter(e=>e.status==='planned'&&e.deadline).map(e=>({e,days:Math.round((new Date(e.deadline+'T00:00:00')-d0)/86400000)})).filter(x=>x.days>=0&&x.days<=30).sort((a,b)=>a.days-b.days); };
T.sendText=function(rows){ return rows.map(r=>[r.title,r.e.where,T.sendLabel(T.SEND_STATUS,r.e.status),T.sendWords(r.e),r.e.notes||''].filter(Boolean).join(' | ')).join('\n'); };

/* ---------- YOUR UNIVERSE: every project, its people, its places, its storylines, as one map. From your pages.
   Same name in two projects: two people, a dashed line between them, never merged. Facts, no labels. ---------- */
T.universe=function(projects,opts){ opts=opts||{}; const N=[], E=[], idx={}, add=(id,type,label,size,data)=>{ if(idx[id]!=null) return N[idx[id]]; idx[id]=N.length; const n={id,type,label,size,data:data||{}}; N.push(n); return n; };
 const placeCount={}, todCount={}, nameIn={};
 (projects||[]).forEach(p=>{ const sc=p.scenes||[], words=sc.reduce((n,s)=>n+(s.words||0),0); add('p:'+p.id,'project',p.title,Math.min(34,14+Math.sqrt(words)/6),{pid:p.id,scenes:sc.length,words});
  const C=T.characters([{id:'d',scenes:sc}]).filter(c=>(c.by.d||0)>0).slice(0,opts.maxChars||12);
  C.forEach(c=>{ const id='c:'+p.id+':'+T.norm(c.name); add(id,'character',c.name,Math.min(18,5+Math.sqrt(c.by.d)*1.6),{pid:p.id,title:p.title,lines:c.by.d}); E.push({a:'p:'+p.id,b:id,kind:'in'}); (nameIn[T.norm(c.name)]=nameIn[T.norm(c.name)]||[]).push(id); });
  // who shares scenes: two or more together
  const pair={}; sc.forEach(s=>{ const who=[...new Set((s.lines||[]).map(x=>T.norm(x.name)))].filter(n=>C.some(c=>T.norm(c.name)===n)); for(let i=0;i<who.length;i++) for(let j=i+1;j<who.length;j++){ const k=[who[i],who[j]].sort().join('|'); pair[k]=(pair[k]||0)+1; } });
  Object.keys(pair).forEach(k=>{ if(pair[k]<2) return; const [x,y]=k.split('|'); E.push({a:'c:'+p.id+':'+x,b:'c:'+p.id+':'+y,kind:'scenes',w:pair[k]}); });
  const places={}; sc.forEach(s=>{ const pl=String(s.place||'').split(/\s+-\s+/)[0].trim(); if(pl) places[pl]=(places[pl]||0)+1; const t=String(s.tod||'').trim(); if(t) todCount[t]=(todCount[t]||0)+1; });
  Object.keys(places).sort((a,b)=>places[b]-places[a]).slice(0,opts.maxPlaces||6).forEach(pl=>{ const id='l:'+T.norm(pl); const n=add(id,'place',pl,5,{scenes:0,projects:[]}); n.data.scenes+=places[pl]; if(!n.data.projects.includes(p.title)) n.data.projects.push(p.title); n.size=Math.min(14,4+Math.sqrt(n.data.scenes)*2); E.push({a:'p:'+p.id,b:id,kind:'at',w:places[pl]}); placeCount[pl]=(placeCount[pl]||0)+places[pl]; });
  (p.threads||[]).slice(0,opts.maxThreads||6).forEach((th,i)=>{ const id='t:'+p.id+':'+i; add(id,'thread',String(th.text||'').slice(0,40)||'(a storyline)',5,{pid:p.id,kind:th.kind,text:th.text}); E.push({a:'p:'+p.id,b:id,kind:'thread'});
   C.forEach(c=>{ const re=T.nameRe(c.name); if(re&&re.test(String(th.text||''))) E.push({a:id,b:'c:'+p.id+':'+T.norm(c.name),kind:'about'}); }); });
 });
 Object.values(nameIn).forEach(L=>{ for(let i=1;i<L.length;i++) E.push({a:L[0],b:L[i],kind:'samename'}); });
 const top=(o,k)=>Object.keys(o).sort((a,b)=>o[b]-o[a]).slice(0,k);
 const chars=N.filter(n=>n.type==='character'), facts=[];
 facts.push((projects||[]).length+' project'+((projects||[]).length===1?'':'s')+', '+chars.length+' speaking character'+(chars.length===1?'':'s')+' on the map.');
 const again=Object.keys(nameIn).filter(k=>nameIn[k].length>1); if(again.length) facts.push('Names in more than one project: '+again.slice(0,6).join(', ')+(again.length>6?' and '+(again.length-6)+' more':'')+'. Same name, not the same person unless you say so.');
 const pl=top(placeCount,5).filter(x=>placeCount[x]>1); if(pl.length) facts.push('The places you go back to: '+pl.map(x=>x+' ('+placeCount[x]+' scenes)').join(', ')+'.');
 const tt=Object.values(todCount).reduce((a,b)=>a+b,0); if(tt) facts.push('Time of day across your scenes: '+top(todCount,4).map(x=>x+' '+Math.round(todCount[x]/tt*100)+'%').join(', ')+'.');
 const most=chars.slice().sort((a,b)=>b.data.lines-a.data.lines)[0]; if(most) facts.push('The most lines anywhere: '+most.label+' in '+most.data.title+' ('+most.data.lines+').');
 return {nodes:N,edges:E.filter(e=>idx[e.a]!=null&&idx[e.b]!=null),facts};
};
/* where each one sits: pulled by its links, pushed off the others. Same input, same picture. */
T.uLayout=function(U,w,h,iters){ const G=(typeof Graph!=='undefined'&&Graph)||(typeof require!=='undefined'&&require('../shared/graph.js')); return G.layout(U,w,h,iters); };

/* WHO CARRIES THE SCENE: each speaker's share of the scene's spoken words, and speeches. Counts only. */
const WD=t=>(String(t||'').replace(/\([^)]*\)/g,' ').toLowerCase().match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]);
T.speechesOf=function(s){ const names=(s.lines||[]).map(x=>x.name).sort((a,b)=>b.length-a.length), out=[];
 String(s.text||'').split('\n').forEach(l=>{ const n=names.find(x=>l.startsWith(x+': ')); if(n) out.push({who:n,text:l.slice(n.length+2)}); else out.push({who:'',text:l}); }); return out; };
T.carry=function(s){ const by={}; let all=0;
 T.speechesOf(s).forEach(x=>{ if(!x.who) return; const n=WD(x.text).length; const c=by[x.who]=by[x.who]||{name:x.who,speeches:0,words:0}; c.speeches++; c.words+=n; all+=n; });
 return Object.values(by).map(c=>Object.assign(c,{pct:all?Math.round(c.words/all*100):0})).sort((a,b)=>b.words-a.words||a.name.localeCompare(b.name)); };
/* REPEATS: a word or phrase that comes back, and where it bunches up. Shown, never changed. Some are on purpose. */
T.STOP=new Set(('a about above after again against all almost also am an and any are around as at away back be because been before being below between both but by can cannot could did do does doing done down during each even ever every few for from further get gets got had has have having he her here hers herself him himself his how i if in into is it its itself just let like me more most much my myself no nor not now of off on once one only or other our ours out over own really right same she should so some still such than that the their theirs them then there these they this those through to too under until up upon us very was way we well were what when where which while who whom why will with would yeah yes you your yours yourself oh hey okay ok uh um gonna wanna gotta i\'m it\'s don\'t can\'t that\'s you\'re he\'s she\'s we\'re they\'re i\'ll i\'ve didn\'t isn\'t won\'t there\'s what\'s let\'s ain\'t doesn\'t wasn\'t couldn\'t wouldn\'t'+
 ' looks look looking turns turn goes go going comes come coming takes take into onto back see sees know think want tell says say said').split(' '));
T.repeats=function(scenes,o){ o=o||{}; const names=new Set(); (scenes||[]).forEach(s=>(s.lines||[]).forEach(x=>String(x.name).toLowerCase().split(/[\s.\/]+/).forEach(w=>w&&names.add(w))));
 /* the setting isn't a repeat (DINER in INT. SALT ROAD DINER), nor is a name: a cue, a cue's 's, or a word only ever capitalized mid-sentence (Okafor) */
 const places=new Set(); (scenes||[]).forEach(s=>String(s.heading||'').toLowerCase().replace(/^(int|ext|est|i\/e)[.\s\/]*(int|ext)?\.?\s*/,'').replace(/\s+-\s+.*$/,'').split(/[^a-z0-9']+/).forEach(w=>w&&places.add(w)));
 const low={}, cap={}; (scenes||[]).forEach(s=>{ const t=String(s.text||''); const re=/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu; let m;
  while((m=re.exec(t))){ const w=m[0].toLowerCase().replace(/[’]/g,"'"), before=t.slice(Math.max(0,m.index-3),m.index); const start=m.index===0||/(^|[.!?:"\n]\s*)$/.test(before)||/\n\s*$/.test(t.slice(0,m.index));
   if(/^\p{Lu}/u.test(m[0])&&!start) cap[w]=(cap[w]||0)+1; else if(/^\p{Ll}/u.test(m[0])) low[w]=(low[w]||0)+1; } });
 const base=w=>w.replace(/'s$/,'');
 const keep=w=>w.length>=3&&!T.STOP.has(w)&&!names.has(w)&&!names.has(base(w))&&!places.has(w)&&!places.has(base(w))&&!(cap[w]&&!low[w])&&!/^\d+$/.test(w);
 const tally={action:{},dialogue:{}}, phr={action:{},dialogue:{}};
 (scenes||[]).forEach((s,i)=>T.speechesOf(s).forEach(x=>{ const k=x.who?'dialogue':'action', ws=WD(x.text);
  ws.forEach(w=>{ if(!keep(w)) return; (tally[k][w]=tally[k][w]||[]).push(i); });
  for(let j=0;j+2<ws.length;j++){ const g=ws.slice(j,j+3); if(!g.some(keep)) continue; const p=g.join(' '); (phr[k][p]=phr[k][p]||[]).push(i); } }));
 const W=o.window||3, rank=(T2,min,near)=>Object.entries(T2).filter(([,v])=>v.length>=min).map(([w,v])=>{
   let best={n:0,from:0,to:0}; for(let a=0;a<v.length;a++){ let b=a; while(b+1<v.length&&v[b+1]-v[a]<W) b++; if(b-a+1>best.n) best={n:b-a+1,from:v[a],to:v[b]}; }
   return {w,n:v.length,scenes:v,near:best}; }).filter(x=>x.near.n>=(near||o.near||4)||x.n>=(o.total||12)).sort((a,b)=>b.near.n-a.near.n||b.n-a.n||a.w.localeCompare(b.w));
 return {action:rank(tally.action,4).slice(0,15),dialogue:rank(tally.dialogue,4).slice(0,15),phrases:[...rank(phr.action,3,3),...rank(phr.dialogue,3,3)].filter(x=>x.n>=3).sort((a,b)=>b.n-a.n).slice(0,10)}; };
T.repeatWords=function(x,num){ const sc=i=>num?num(i):i+1; return x.n+' times'+(x.near.n>=2?', '+x.near.n+(x.near.from===x.near.to?' in scene '+sc(x.near.from):' in scenes '+sc(x.near.from)+' to '+sc(x.near.to)):''); };
if(typeof module!=='undefined') module.exports=T;
g.PaperTrail=T;
})(typeof window!=='undefined'?window:globalThis);
