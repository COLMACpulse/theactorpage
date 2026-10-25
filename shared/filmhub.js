/* THEACTORPAGE FILM HUB: your films from the filmmaker's side. Where each one stands, who was on it, and a page to send.
   Story Studio's projects (localStorage film_os_v1) are read, never written here: the counts come from what you marked there.
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
/* the four steps, for a Story Studio film: PLAN, SHOOT, FINISH, OUT. A later step done counts the earlier ones done
   (a crew film can come back from the editor without every scene planned here). c.cut.final: the finished file;
   c.out: where it went. Counts and words, no verdict. */
H.OUTS=['footage','reel','page','postcard','file'];   // a package is built in the Hub, so it isn't counted here
H.path=function(s,c){
 c=c||{}; const fin=c.cut&&c.cut.final, outs=H.OUTS.filter(k=>c.out&&c.out[k]).length;
 const d=[s.scenes>0&&s.planned===s.scenes, s.shots>0&&s.shotsDone===s.shots, !!fin, outs>0];
 for(let i=2;i>=0;i--) if(d[i+1]) d[i]=true;
 const w=[s.scenes?s.planned+' of '+pl(s.scenes,'scene')+' planned':'no scenes yet',
  s.shots?s.shotsDone+' of '+pl(s.shots,'shot'):s.takes?pl(s.takes,'take'):'nothing shot yet',
  fin?'cut '+mmss(fin.secs):s.pieces?mmss(s.cutSecs)+' in the cut':'not cut yet',
  outs+' of '+H.OUTS.length];
 const now=d.indexOf(false);
 return ['PLAN','SHOOT','FINISH','OUT'].map((k,i)=>({k:['plan','shoot','finish','out'][i],label:k,done:d[i],now:i===now,words:w[i]}));
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
/* a credit line's job as a job: "Directed by" reads Director, "Written and directed by" reads Writer, Director */
const JOBS=[[/^direct/i,'Director'],[/^writ/i,'Writer'],[/^produc/i,'Producer'],[/^edit/i,'Editor'],[/^(shot|photograph|cinematograph|lensed)/i,'Camera'],[/^music|^score/i,'Music'],[/^(cast|casting)\b/i,'Casting'],[/^(sound|recorded)/i,'Sound']];
H.job=function(j){ j=String(j||'').trim(); if(!/\bby$/i.test(j)) return j; return j.replace(/\s*by$/i,'').split(/\s*(?:,|&|\band\b)\s*/i).filter(Boolean).map(w=>{ const m=JOBS.find(x=>x[0].test(w)); return m?m[1]:w.charAt(0).toUpperCase()+w.slice(1); }).join(', '); };
H.people=function(scripts,F,extra,myName){
 const by={}, norm=n=>String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,''), mine=new Set(myName?[norm(myName)]:[]);
 Object.keys(scripts||{}).forEach(id=>{ const c=scripts[id]; if(c&&c.people&&c.people.me) mine.add(norm(c.people.me)); });
 const add=(name,job,film)=>{ name=String(name||'').trim(); if(!name) return; job=H.job(job); const k=norm(name); const p=by[k]=by[k]||{name,films:{},you:mine.has(k)}; (p.films[film]=p.films[film]||[]).includes(job)||p.films[film].push(job); };
 Object.keys(scripts||{}).forEach(id=>{ const c=scripts[id], film=H.title(c), A=(c.people&&c.people.actors)||{};
  Object.keys(A).forEach(role=>add(A[role],'plays '+role,film));
  if(c.people&&c.people.me&&c.me) add(c.people.me,'plays '+c.me,film);
  try{ F.crewLines((c.people&&c.people.crew)||'').forEach(x=>add(x.name,x.job||'crew',film)); }catch(e){} });
 (extra||[]).forEach(f=>String(f.people||'').split(/\n+/).forEach(l=>{ const m=l.match(/^(.+?)\s*(?::|\s[-–]\s)\s*(.+)$/); if(m) add(m[2],m[1].trim(),f.title||'Untitled'); else add(l,'',f.title||'Untitled'); }));
 return Object.values(by).map(p=>({name:p.name,you:p.you,films:Object.keys(p.films).map(f=>({film:f,jobs:p.films[f].filter(Boolean)}))})).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
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
/* YOUR UNIVERSE, the filmmaker's side: what kind of films you make, counted from the films themselves, and what you
   say you're into and want to get into, in your words, kept apart. Plus a map: films, the people on more than one,
   the places you go back to. Counts only. films: [{id,title,kind,year,runtime,stage,script (Story Studio project or null)}]
   people: H.people(...) output.  me: {into:[], want:[]} */
const KINDS=[['feature',/\bfeatures?\b/i],['short',/\bshorts?\b/i],['pilot',/\bpilots?\b/i],['series',/\b(series|web ?series|episodic)\b/i],['music video',/\bmusic videos?\b/i],['documentary',/\b(doc|docs|documentar(y|ies))\b/i],['commercial',/\b(commercials?|spots?|ads?)\b/i],['sketch',/\bsketch(es)?\b/i]];
H.kindOf=t=>{ const k=KINDS.find(x=>x[1].test(String(t||''))); return k?k[0]:''; };
/* counts, not percents: {night:3} reads "Night: all 3 scenes"; {inside:2,outside:1} reads "Inside 2 scenes, outside 1" */
const counted=o=>{ const K=Object.keys(o).sort((a,b)=>o[b]-o[a]); if(!K.length) return ''; const cap=k=>k.charAt(0).toUpperCase()+k.slice(1);
 if(K.length===1) return cap(K[0])+': '+(o[K[0]]>1?'all '+o[K[0]]+' scenes':'1 scene');
 return K.map((k,i)=>(i?k:cap(k))+' '+o[k]+(i?'':(o[k]===1?' scene':' scenes'))).join(', '); };
const mins=r=>{ const m=String(r||'').match(/(\d+(?:\.\d+)?)\s*(h|hr|hour|m|min)?/i); if(!m) return 0; return /^h/i.test(m[2]||'')?Math.round(+m[1]*60):+m[1]; };
H.universe=function(films,F,people,me){
 films=films||[]; people=people||[]; me=me||{};
 const nodes=[], edges=[], facts=[], idx={}, add=(id,type,label,size,data)=>{ if(idx[id]!=null) return nodes[idx[id]]; idx[id]=nodes.length; const n={id,type,label,size,data:data||{}}; nodes.push(n); return n; };
 const kinds={}, stages={}, years=[], runs=[], ie={}, tod={}, placeFilms={}, ways={}, parts=[]; let read=0, inIt=0;
 films.forEach(f=>{ const k=H.kindOf(f.kind)||'', S=[]; kinds[k||'no kind given']=(kinds[k||'no kind given']||0)+1; stages[f.stage||'script']=(stages[f.stage||'script']||0)+1;
  const y=+String(f.year||'').match(/\d{4}/)?.[0]; if(y) years.push(y); const r=mins(f.runtime); if(r) runs.push(r);
  let sc=[]; try{ sc=f.script&&f.script.text?F.scenes(f.script.text):[]; }catch(e){ sc=[]; }
  add('f:'+f.id,'film',f.title||'Untitled',Math.min(30,14+Math.sqrt(sc.length||1)*2),{fid:f.id,kind:k,year:f.year||'',stage:f.stage||'',scenes:sc.length,hand:!f.script,ci:films.indexOf(f)});
  if(sc.length){ read++; const st=(f.script&&f.script.scenes)||{}, here={};
   sc.forEach(x=>{ if(x.ie) ie[x.ie==='EXT'?'outside':x.ie==='INT'?'inside':'both']=(ie[x.ie==='EXT'?'outside':x.ie==='INT'?'inside':'both']||0)+1;
    const t=String(x.tod||'').split(/[\s/]+/)[0]; if(/^(DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|AFTERNOON|SUNSET|SUNRISE)$/.test(t)) tod[t.toLowerCase()]=(tod[t.toLowerCase()]||0)+1;
    const pl=String(x.place||'').split(/\s+-\s+/)[0].trim().toUpperCase(); if(pl) here[pl]=(here[pl]||0)+1;
    const w=st[x.n]&&st[x.n].way; if(w) ways[w]=(ways[w]||0)+1; });
   Object.keys(here).forEach(pl=>{ (placeFilms[pl]=placeFilms[pl]||[]).push({fid:f.id,title:f.title||'Untitled',n:here[pl]}); });
   try{ parts.push(F.parts(sc).length); }catch(e){}
   if(f.script.me) inIt++; } });
 /* people on two or more films; or everyone, when there are only a few */
 /* you are on every film: not a dot, or the map would join everything to everything */
 const others=people.filter(p=>!p.you), few=others.length<=16, pm=others.filter(p=>few||p.films.length>1).slice(0,30);
 const byTitle={}; films.forEach(f=>{ (byTitle[f.title||'Untitled']=byTitle[f.title||'Untitled']||[]).push(f.id); });
 pm.forEach(p=>{ const n=add('p:'+p.name.toLowerCase().replace(/[^a-z0-9]+/g,''),'person',p.name,Math.min(16,6+p.films.length*2.5),{films:p.films}); p.films.forEach(x=>(byTitle[x.film]||[]).forEach(fid=>edges.push({a:'f:'+fid,b:n.id,kind:'on'}))); });
 /* places: in more than one film, or the top three of each */
 const keepPl={}; Object.keys(placeFilms).forEach(pl=>{ if(placeFilms[pl].length>1) keepPl[pl]=1; });
 films.forEach(f=>{ Object.keys(placeFilms).filter(pl=>placeFilms[pl].some(x=>x.fid===f.id)).sort((a,b)=>placeFilms[b].find(x=>x.fid===f.id).n-placeFilms[a].find(x=>x.fid===f.id).n).slice(0,3).forEach(pl=>keepPl[pl]=1); });
 Object.keys(keepPl).slice(0,40).forEach(pl=>{ const L=placeFilms[pl], n=add('l:'+pl,'place',pl,Math.min(13,5+L.length*2.5),{films:L.map(x=>x.title),scenes:L.reduce((a,x)=>a+x.n,0)}); L.forEach(x=>edges.push({a:'f:'+x.fid,b:n.id,kind:'at'})); });
 /* the counts, said plainly */
 if(!films.length) facts.push('No films yet.');
 else {
  const kw=Object.keys(kinds).sort((a,b)=>kinds[b]-kinds[a]).map(k=>k==='no kind given'?kinds[k]+' with no kind given':pl(kinds[k],k,k==='series'?'series':k==='documentary'?'documentaries':k==='sketch'?'sketches':null));
  facts.push(pl(films.length,'film')+': '+kw.join(', ')+'.');
  if(years.length) facts.push(Math.min(...years)===Math.max(...years)?'All from '+years[0]+'.':'From '+Math.min(...years)+' to '+Math.max(...years)+'.');
  if(runs.length) facts.push(runs.length===1?'Runtime: '+runs[0]+' min.':'Runtimes: '+Math.min(...runs)+' to '+Math.max(...runs)+' min.');
  const sw=H.STAGES.filter(x=>stages[x[0]]).map(x=>stages[x[0]]+' '+x[1].toLowerCase()); facts.push('Where they stand: '+sw.join(', ')+'.');
 }
 const scen=[];
 if(read){ const a=counted(ie), t4={}; Object.keys(tod).sort((x,y)=>tod[y]-tod[x]).slice(0,4).forEach(k=>t4[k]=tod[k]); const t=counted(t4); if(a) scen.push(a+'.'); if(t) scen.push(t+'.');
  const back=Object.keys(placeFilms).filter(pl=>placeFilms[pl].length>1).sort((a,b)=>placeFilms[b].length-placeFilms[a].length); if(back.length) scen.push('Places in more than one film: '+back.slice(0,5).map(pl=>pl+' ('+placeFilms[pl].length+')').join(', ')+'.');
  if(parts.length) scen.push('Speaking parts: '+(Math.min(...parts)===Math.max(...parts)?parts[0]:Math.min(...parts)+' to '+Math.max(...parts))+' a film.');
  scen.push('You play a part yourself in '+inIt+' of '+read+'.');
  const wn=(F.WAYS||[]).filter(x=>ways[x.id]).map(x=>x.name+' '+pl(ways[x.id],'scene')); if(wn.length) scen.push('How you shoot: '+wn.join(', ')+'.');
  scen.unshift('From '+pl(read,'script')+' read in Story Studio:'); }
 const again=people.filter(p=>!p.you&&p.films.length>1).sort((a,b)=>b.films.length-a.films.length||a.name.localeCompare(b.name));
 const crew=again.length?['Who you keep working with: '+again.slice(0,6).map(p=>p.name+' ('+p.films.length+' films'+(()=>{ const j=[...new Set([].concat(...p.films.map(x=>x.jobs)))].slice(0,2); return j.length?', '+j.join(', '):''; })()+')').join('; ')+'.']:(people.some(p=>!p.you)?['Who you keep working with: nobody on two films yet.']:[]);
 /* what ties your films together, said plainly; who you work with most (never you) */
 const and=L=>L.length<2?L.join(''):L.slice(0,-1).join(', ')+' and '+L[L.length-1];
 const ties=[], shared=new Set();
 again.slice(0,6).forEach(p=>{ ties.push({kind:'person',name:p.name,text:p.name+' is on '+and(p.films.map(x=>x.film))+'.'}); p.films.forEach(x=>shared.add(x.film)); });
 Object.keys(placeFilms).filter(x=>placeFilms[x].length>1).sort((a,b)=>placeFilms[b].length-placeFilms[a].length).slice(0,5).forEach(x=>{ const L=placeFilms[x]; ties.push({kind:'place',name:x,text:x+' is in '+and(L.map(y=>y.title))+': '+pl(L.reduce((a,y)=>a+y.n,0),'scene')+'.'}); L.forEach(y=>shared.add(y.title)); });
 if(films.length>1){ const alone=films.filter(f=>!shared.has(f.title||'Untitled'));
  if(ties.length&&!alone.length) ties.push({kind:'all',text:'Every film shares someone or somewhere with another.'});
  alone.slice(0,4).forEach(f=>ties.push({kind:'alone',name:f.title||'Untitled',text:(f.title||'Untitled')+' stands alone: nobody and nowhere in it shows up in another film.'})); }
 const most=again.slice(0,5).map(p=>{ const j=[...new Set([].concat(...p.films.map(x=>x.jobs)))].slice(0,2); return p.name+' · '+p.films.length+' films'+(j.length?' · '+j.join(', '):''); });
 /* what you said, next to what's counted: only where a kind is named */
 const wants=(me.want||[]).map(w=>{ const k=H.kindOf(w); return {text:w,kind:k,made:k?(kinds[k]||0):null}; });
 return {nodes,edges,facts,scenes:scen,crew,ties,most,into:(me.into||[]).slice(),wants};
};

g.FilmHub=H;
if(typeof module!=='undefined') module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
