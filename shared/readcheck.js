/* THEACTORPAGE READ CHECK: how well this site reads a script, scored against the script's own Final Draft file.
   From WRITERKNIFE's ground-truth gauntlet, with one change: no hand-marking. A .fdx already says what every line
   is (Scene Heading, Character, Dialogue), so it is the answer key. We read the PDF (or text) of the same script the
   way the site does, and count what we got right, what we made up, and what we missed:
     headings   scene headings
     cues       who speaks each speech (and how it starts)
     dialogue   the words of each speech
     locations  the places, from the headings
   precision = right / everything we read; recall = right / everything in the key. A missing denominator is
   "none", never 100%. The verdict follows WRITERKNIFE's gate: 25 scripts, 5 held back, 95% on all four, or it
   says NOT ENOUGH. This file holds no script; it runs on what you give it. */
(function(g){
const R={};
const ent=s=>String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n));
const sp=s=>String(s||'').replace(/\s+/g,' ').trim();
/* the same person however the page writes them: (CONT'D), (V.O.), McCARTHY / MCCARTHY, a forced @ */
R.who=s=>sp(String(s||'').replace(/^@/,'').replace(/\s*\([^)]*\)/g,'').replace(/\^$/,'')).toUpperCase();
/* words only: case, punctuation, dashes and line breaks don't count */
R.norm=s=>(String(s||'').toLowerCase().replace(/\([^)]*\)/g,' ').match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)||[]).join(' ').replace(/[’]/g,"'");
R.head=s=>sp(String(s||'').toUpperCase().replace(/[’‘]/g,"'").replace(/^\./,'').replace(/^\d+[A-Z]?\.?\s+/,'').replace(/\s+\d+[A-Z]?\.?$/,'').replace(/\s*-\s*/g,' - ').replace(/[.]+$/,''));
R.isSlug=h=>/^(INT|EXT|EST|I\/E)(?:[.\s\/]|$)/.test(h);
R.place=h=>sp(R.head(h).replace(/^(INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|INT|EXT|EST|I\/E)\.?\s*/,'').replace(/\s+-\s+.*$/,''));
/* the answer key, from the .fdx */
R.key=function(xml){ const body=(String(xml).match(/<Content>([\s\S]*?)<\/Content>/i)||[])[1]||'';
 const P=/<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/gi; let m; const paras=[];
 while((m=P.exec(body))){ const type=(m[1].match(/Type="([^"]*)"/i)||[])[1]||'Action'; const t=sp(ent([...m[2].matchAll(/<Text[^>]*>([\s\S]*?)<\/Text>/gi)].map(x=>x[1].replace(/<[^>]+>/g,'')).join(''))); if(t) paras.push({type,t}); }
 const out={headings:[],speeches:[]}; let cur=null;
 out.notScenes=[];
 /* writers tag a title or an act break as a Scene Heading (END TEASER, the show's name). Those aren't scenes: kept apart */
 paras.forEach(p=>{ if(/Scene Heading/i.test(p.type)){ const h=R.head(p.t); (R.isSlug(h)?out.headings:out.notScenes).push(h); cur=null; }
  else if(/^Character$/i.test(p.type)){ cur={who:R.who(p.t),text:[]}; out.speeches.push(cur); }
  else if(/Dialogue|Lyric/i.test(p.type)){ if(cur) cur.text.push(p.t); }
  else if(/Parenthetical/i.test(p.type)){ }
  else cur=null; });
 out.speeches=out.speeches.map(s=>({who:s.who,text:s.text.join(' ')})).filter(s=>s.text);
 return out; };
/* what the site reads, from its text: ActorSides for speeches, Story Studio's scenes for headings */
R.read=function(text,A,F){ A=A||g.ActorSides; F=F||g.FilmOS; const beats=A.parse(text);
 const speeches=beats.filter(b=>b.who&&b.text).map(b=>({who:R.who(b.who),text:b.text}));
 const headings=F&&F.scenes?F.scenes(text).map(s=>s.heading).filter(h=>h&&!/^\(/.test(h)).map(R.head).filter(R.isSlug):String(text).split('\n').filter(l=>A.SLUG.test(l)).map(R.head);
 return {headings,speeches}; };
function bag(a){ const m=new Map(); a.forEach(k=>m.set(k,(m.get(k)||0)+1)); return m; }
function score(key,got){ const K=bag(key), G=bag(got); let tp=0; K.forEach((n,k)=>{ tp+=Math.min(n,G.get(k)||0); });
 const fp=got.length-tp, fn=key.length-tp, miss=[], extra=[];
 K.forEach((n,k)=>{ const d=n-(G.get(k)||0); if(d>0) miss.push(k); }); G.forEach((n,k)=>{ const d=n-(K.get(k)||0); if(d>0) extra.push(k); });
 return {tp,fp,fn,precision:got.length?tp/got.length:null,recall:key.length?tp/key.length:null,miss,extra}; }
const first=(t,n)=>R.norm(t).split(' ').slice(0,n||5).join(' ');
R.KINDS=['headings','cues','dialogue','locations'];
R.score=function(key,got){ return {
 headings:score(key.headings,got.headings),
 cues:score(key.speeches.map(s=>s.who+' | '+first(s.text)),got.speeches.map(s=>s.who+' | '+first(s.text))),
 dialogue:score(key.speeches.map(s=>R.norm(s.text)),got.speeches.map(s=>R.norm(s.text))),
 locations:score([...new Set(key.headings.map(R.place))].filter(Boolean),[...new Set(got.headings.map(R.place))].filter(Boolean)) }; };
/* two files of one script can be two drafts. If under half the speeches are shared, say so */
R.sameDraft=function(sc){ return sc.dialogue.recall==null||sc.dialogue.recall>=0.5; };
const pc=x=>x==null?'none':(Math.round(x*1000)/10)+'%';
R.pc=pc;
R.line=function(name,sc){ return name+': '+R.KINDS.map(k=>k+' '+pc(sc[k].precision)+' / '+pc(sc[k].recall)).join(' · ')+(R.sameDraft(sc)?'':' · DIFFERENT DRAFTS?'); };
/* WRITERKNIFE's gate */
R.MIN=25; R.HOLD=5; R.BAR=0.95;
R.gate=function(cases){ const sum={}; R.KINDS.forEach(k=>{ let tp=0,fp=0,fn=0; cases.forEach(c=>{ tp+=c.score[k].tp; fp+=c.score[k].fp; fn+=c.score[k].fn; }); sum[k]={tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null}; });
 const n=cases.length, hold=cases.filter(c=>c.holdout).length, all=R.KINDS.every(k=>sum[k].precision!=null&&sum[k].recall!=null&&sum[k].precision>=R.BAR&&sum[k].recall>=R.BAR);
 return {n,hold,sum,verdict:n<R.MIN||hold<R.HOLD?'NOT ENOUGH':all?'PASS':'FAIL'}; };
g.ReadCheck=R;
if(typeof module!=='undefined') module.exports=R;
})(typeof window!=='undefined'?window:globalThis);
