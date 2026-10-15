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
 for(const raw of t.split('\n')){ const x=raw.trim(); if(/^(\d+[A-Z]?\s+)?(INT|EXT|I\/E)[.\s]/i.test(x)) break; if(x) head.push(x); if(head.length>=12) break; }
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

/* ---------- a storyboard: SCENE 15 INT. SALOON - DAY  CAST: ...  PROPS: ...  FX: ...  NOTES: ... ---------- */
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
  text:s.beats.map(b=>b.action?b.text:b.who+': '+b.text).join('\n')}));
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

if(typeof module!=='undefined') module.exports=T;
g.PaperTrail=T;
})(typeof window!=='undefined'?window:globalThis);
