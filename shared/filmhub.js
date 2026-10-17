/* THEACTORPAGE FILM HUB: your films from the filmmaker's side. Where each one stands, who was on it, and a page to send.
   Story Studio's projects (localStorage film_os_v1) are read, never written: the counts come from what you marked there.
   Films you made before (or anywhere else) are added by hand. No score, no verdict: counts, and the words you gave it.
   Pure: pass Story Studio's engine (film.js, window.FilmOS) in. Runs in Node for the tests. */
(function(g){
const H={};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pl=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));
const mmss=s=>{ s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
H.title=c=>{ const m=String((c&&c.text)||'').slice(0,2000).match(/^\s*Title:\s*(.+)$/im); return m?m[1].replace(/[_*]+/g,'').trim():H.fileTitle(c); };
H.fileTitle=c=>String((c&&c.file)||'Untitled').replace(/\.(pdf|txt|fountain|fdx|docx)$/i,'').replace(/[_]+/g,' ').trim()||'Untitled';

/* one Story Studio project -> what's been done on it, counted */
H.status=function(c,F){
 const out={scenes:0,planned:0,placed:0,shots:0,shotsDone:0,scenesShot:0,takes:0,pieces:0,cutSecs:0,target:0,adr:0,parts:0,cast:0,crew:0,day:'',owner:''};
 if(!c) return out;
 let S=[]; try{ S=c.text?F.scenes(c.text):[]; }catch(e){ S=[]; }
 out.scenes=S.length;
 const st=c.scenes||{};
 S.forEach(sc=>{ const s=st[sc.n]; if(!s) return; if(s.way) out.planned++; if(s.where) out.placed++;
  if(s.way){ let L=[]; try{ L=F.shots(sc,s.way,c.me,s.ins)||[]; }catch(e){}
   const d=L.filter(x=>s.done&&s.done[x.id]).length; out.shots+=L.length; out.shotsDone+=d; if(L.length&&d===L.length) out.scenesShot++; } });
 const k=c.cut||{}; out.target=+k.target||0;
 Object.keys(k.takes||{}).forEach(n=>(k.takes[n]||[]).forEach(t=>{ out.takes++; if(t.use&&t.out>t.in){ out.pieces++; out.cutSecs+=t.out-t.in; if(t.adr&&t.adr.keep) out.adr++; } }));
 try{ const P=F.parts(S), A=(c.people&&c.people.actors)||{}; out.parts=P.length; out.cast=P.filter(p=>A[p.role]||(p.role===c.me&&c.people&&c.people.me)).length; }catch(e){}
 try{ out.crew=F.crewLines((c.people&&c.people.crew)||'').length; }catch(e){}
 out.day=c.dayDate||''; out.owner=(c.credits&&c.credits.owner)||'';
 return out;
};
/* where it is, said from the counts. Your own "done" wins. */
H.STAGES=[['script','Script'],['planning','Planning'],['shooting','Shooting'],['cutting','Cutting'],['done','Done']];
H.stage=function(s,mark){
 if(mark==='done') return 'done';
 if(s.pieces) return 'cutting';
 if(s.shotsDone||s.takes) return 'shooting';
 if(s.planned||s.placed) return 'planning';
 return 'script';
};
H.stageWord=k=>(H.STAGES.find(x=>x[0]===k)||H.STAGES[0])[1];
H.words=function(s){
 const L=[];
 if(!s.scenes){ L.push('No scenes read yet. Open it in Story Studio.'); return L; }
 L.push(pl(s.scenes,'scene')+': '+s.planned+' planned, '+s.placed+' at a place.');
 if(s.shots) L.push('Shots: '+s.shotsDone+' of '+s.shots+' marked done'+(s.scenesShot?'; '+pl(s.scenesShot,'scene')+' fully shot':'')+'.');
 if(s.takes) L.push(pl(s.takes,'take')+' logged'+(s.pieces?', '+pl(s.pieces,'piece')+' in the cut':'')+'.');
 if(s.pieces) L.push('Cut: '+mmss(s.cutSecs)+(s.target?' of a '+mmss(s.target)+' target':'')+(s.adr?', '+pl(s.adr,'ADR line')+' kept':'')+'.');
 if(s.parts) L.push('Cast: '+s.cast+' of '+pl(s.parts,'part')+' named'+(s.crew?'; '+s.crew+' crew':'')+'.');
 if(s.day) L.push('Shooting on '+s.day+'.');
 return L;
};

/* everyone on your films: the actor for each part and the crew lines, from Story Studio; contacts never */
H.people=function(scripts,F,extra){
 const by={};
 const add=(name,job,film)=>{ name=String(name||'').trim(); if(!name) return; const k=name.toLowerCase().replace(/[^a-z0-9]+/g,''); const p=by[k]=by[k]||{name,films:{}}; (p.films[film]=p.films[film]||[]).includes(job)||p.films[film].push(job); };
 Object.keys(scripts||{}).forEach(id=>{ const c=scripts[id], film=H.title(c), A=(c.people&&c.people.actors)||{};
  Object.keys(A).forEach(role=>add(A[role],'plays '+role,film));
  if(c.people&&c.people.me&&c.me) add(c.people.me,'plays '+c.me,film);
  try{ F.crewLines((c.people&&c.people.crew)||'').forEach(x=>add(x.name,x.job||'crew',film)); }catch(e){} });
 (extra||[]).forEach(f=>String(f.people||'').split(/\n+/).forEach(l=>{ const m=l.match(/^(.+?)\s*(?::|\s[-–]\s)\s*(.+)$/); if(m) add(m[2],m[1].trim(),f.title||'Untitled'); else add(l,'',f.title||'Untitled'); }));
 return Object.values(by).map(p=>({name:p.name,films:Object.keys(p.films).map(f=>({film:f,jobs:p.films[f].filter(Boolean)}))})).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
};

/* the page: your banner and your films. Only what you put on the PAGE tab; never the script, notes, numbers or contacts. */
const safe=u=>/^https?:\/\//i.test(String(u||''))?String(u):'';
H.pageHtml=function(films,me){
 me=me||{}; const banner=me.banner||me.name||'Films', shown=(films||[]).filter(f=>f.show!==false);
 const card=f=>'<article>'+(f.poster?'<img src="'+esc(f.poster)+'" alt="'+esc(f.title)+' poster">':'<div class="np"></div>')
  +'<div><h2>'+esc(f.title||'Untitled')+'</h2><p class="m">'+[f.year,f.kind,f.runtime].filter(Boolean).map(esc).join(' · ')+'</p>'
  +(f.logline?'<p>'+esc(f.logline)+'</p>':'')+(f.credit?'<p class="c">'+esc(f.credit)+'</p>':'')
  +(f.links||[]).map(l=>safe(l.url)?'<a href="'+esc(l.url)+'">'+esc(l.label||'Watch')+'</a>':'').join(' ')+'</div></article>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(banner)+'</title><style>'
  +':root{--bg:#0d0f12;--ink:#ece7dc;--dim:#a39c8e;--line:#2b3038;--acc:#e0a23c}@media(prefers-color-scheme:light){:root{--bg:#f6f2ea;--ink:#1d1a15;--dim:#5f584b;--line:#d3cab8;--acc:#8a5a08}}'
  +'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:860px;margin:0 auto;padding:28px 16px 64px}'
  +'h1{font-size:30px;letter-spacing:.04em;margin:0}.who{color:var(--dim);margin:6px 0 0}.about{margin:14px 0 26px;max-width:40em}'
  +'article{display:grid;grid-template-columns:150px 1fr;gap:18px;border-top:1px solid var(--line);padding:20px 0}article img,.np{width:150px;aspect-ratio:2/3;object-fit:cover;border-radius:6px;background:#1b1f26}'
  +'h2{font-size:20px;margin:0}.m{color:var(--dim);font-size:14px;margin:4px 0 8px}.c{color:var(--dim);font-size:14px}a{color:var(--acc);margin-right:12px;font-weight:600}'
  +'@media(max-width:520px){article{grid-template-columns:96px 1fr;gap:12px}article img,.np{width:96px}}'
  +'</style></head><body><main><h1>'+esc(banner)+'</h1>'+(me.banner&&me.name?'<p class="who">'+esc(me.name)+'</p>':'')+(me.about?'<p class="about">'+esc(me.about)+'</p>':'')
  +shown.map(card).join('\n')+(me.email?'<p class="who" style="margin-top:28px">'+esc(me.email)+'</p>':'')+'</main></body></html>';
};
g.FilmHub=H;
if(typeof module!=='undefined') module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
