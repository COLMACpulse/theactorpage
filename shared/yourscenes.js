/* THEACTORPAGE PRACTICE FROM YOUR MATERIAL. Practice scenes cut from what's already on this phone: sides on the
   shelf, anything uploaded to Actor OS or Memorizer, Story Studio scripts, Paper Trail drafts, Writer's Blockage
   scripts. A cut is a stretch where exactly two people talk, word for word. Nothing is written, nothing changed:
   if a third person speaks, the stretch ends there. Page numbers, CONTINUED and watermarks are left out (they're
   not the scene). Nothing leaves the phone. Needs ../actor-os/sides.js (ActorSides) for names. */
(function(g){
const Y={};
const A=()=>g.ActorSides;
const hash=s=>{ let h=5381; s=String(s); for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return h.toString(36); };
const AIMARK=/Written by AI as a practice prompt|^(?:Practice scene|Today's scene) - /m;
const SLUG=/^\s*(\d+[A-Z]?\.?\s+)?(INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|INT|EXT|EST|I\/E)(?:[\.\s]|\s*:\s*\S)|^\.[A-Z0-9]/i;
const PAGENUM=/^\s*(\d{1,3})\.?\s*$/;
const JUNK=/^\s*\(?\s*(CONTINUED|CONT'?D|MORE)\s*\)?\s*:?\s*(\(\d+\))?\s*$|^\s*\d+\s*\/\s*\d+\s*$|^\s*Sides by Breakdown Services|(E\d{3}-){2,}|\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{3,}|^\s*={3,}\s*$|^\s*#|^\s*=(?!=)/i;
const NAMEC=/^\s*([A-Z][A-Z0-9 .'’#&\-]{1,32})\s*:\s*(.+)$/;
const MIN=4, MAX=16;
const base=f=>String(f||'').replace(/\.(pdf|txt|fountain|fdx|docx?|rtf|md)$/i,'').trim();

/* ---------- a script's text into units: scene heads, speeches, action ---------- */
function prep(t){
 t=String(t||'').replace(/\r\n?/g,'\n').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\[\[[\s\S]*?\]\]/g,'');
 const L=t.split('\n');
 // a Fountain title page: Key: value lines up top, then a blank line
 if(/^\s*(Title|Credit|Author|Authors|Source|Draft date|Contact|Notes|Copyright)\s*:/i.test(L[0]||'')){ let i=0; while(i<L.length&&L[i].trim()) i++; L.splice(0,i); }
 return L;
}
Y.units=function(text){
 const a=A(); if(!a) return [];
 const L=prep(text), U=[]; let page=0, cur=null, scene=0;
 const close=()=>{ if(cur){ U.push(cur); cur=null; } };
 for(const raw of L){
  const line=raw.replace(/\s+$/,'').replace(/^\s+/,'');
  const pm=line.match(PAGENUM); if(pm&&!(cur&&cur.k==='say'&&cur.lines.length===1&&!cur.nc)){ page=+pm[1]; close(); continue; }
  if(JUNK.test(line)) continue;
  if(!line){ close(); continue; }
  if(SLUG.test(line)&&line===line.toUpperCase()){ close(); scene++; U.push({k:'head',text:line.replace(/^\./,''),page,scene}); continue; }
  if(a.isName(line)){ close(); cur={k:'say',who:line.replace(/^@/,'').replace(/\s*\([^)]*\)\s*/g,'').replace(/[\s^:]+$/,'').trim().toUpperCase(),lines:[line],page,scene}; continue; }
  const nc=line.match(NAMEC);
  if(nc&&(!cur||cur.nc)&&!/^(INT|EXT|FADE|CUT|NOTE|NOTES)\b/.test(nc[1])){ close(); cur={k:'say',nc:true,who:nc[1].trim(),lines:[line],page,scene}; continue; }
  if(!cur) cur={k:'do',lines:[],page,scene};
  cur.lines.push(line);
 }
 close();
 return U.filter(u=>u.k!=='say'||u.nc||u.lines.length>1);
};
const textOf=us=>us.map(u=>u.k==='head'?u.text:u.lines.join('\n')).join('\n\n')+'\n';

/* ---------- the cuts: two people, word for word ---------- */
Y.cuts=function(text,src){
 src=src||{}; const a=A(); if(!a||!text||AIMARK.test(text)) return [];
 const U=Y.units(text), out=[], seen=new Set();
 const heads={}; U.forEach(u=>{ if(u.k==='head') heads[u.scene]=u; });
 let run=[], who=[];
 const flush=()=>{
  while(run.length&&run[run.length-1].k!=='say') run.pop();
  const says=run.filter(u=>u.k==='say');
  if(says.length>=MIN){
   // long runs: split at a speech, about MAX speeches a cut
   const n=Math.ceil(says.length/MAX), per=Math.ceil(says.length/n); let i=0;
   for(let c=0;c<n;c++){ const part=[]; let k=0;
    while(i<run.length&&(k<per||run[i].k!=='say')){ if(run[i].k==='say'){ if(k>=per) break; k++; } part.push(run[i]); i++; }
    while(part.length&&part[part.length-1].k!=='say') part.pop();
    add(part); }
  }
  run=[]; who=[];
 };
 const add=part=>{
  const says=part.filter(u=>u.k==='say'); if(says.length<MIN) return;
  const ppl=[...new Set(says.map(u=>u.who))]; if(ppl.length!==2||ppl.some(p=>says.filter(u=>u.who===p).length<2)) return;
  const sc=part[0].scene, h=heads[sc], body=(h?[h]:[]).concat(part), t=textOf(body);
  const check=a.speakers(a.parse(t)).map(x=>x.name); if(check.length!==2) return;
  const id='y'+hash(t); if(seen.has(id)) return; seen.add(id);
  const pu=part.find(u=>u.page), page=part[0].page||(pu?Math.max(0,pu.page-1):0), title=base(src.title)||'Your script';
  out.push({id,yours:true,text:t,parts:check,you:(src.me&&check.indexOf(src.me)>=0)?src.me:check[0],speeches:says.length,
   src:title,from:src.from||'',scene:h?sc:0,head:h?h.text:'',page,
   title:title+(h?', scene '+sc:'')});
 };
 for(let i=0;i<U.length;i++){
  const u=U[i];
  if(u.k==='head'){ flush(); continue; }
  if(u.k==='do'){ if(run.length) run.push(u); else { /* action just before the first speech: keep it */ const nx=U[i+1]; if(nx&&nx.k==='say') run.push(u); } continue; }
  if(who.indexOf(u.who)<0){
   if(who.length===2) flush(); // a third person speaks: the stretch ends there
   who.push(u.who);
  }
  run.push(u);
 }
 flush();
 return out;
};

/* ---------- what's on this phone ---------- */
const LS=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } };
function wbText(raw){ try{ const d=JSON.parse(raw); if(!d||!Array.isArray(d.blocks)) return '';
 const o=[]; d.blocks.forEach(b=>{ const t=String(b.text||'').trim(); if(!t) return;
  if(b.type==='Scene Heading') o.push('', t.toUpperCase());
  else if(b.type==='Character') o.push('', t.toUpperCase());
  else if(b.type==='Parenthetical') o.push(t.startsWith('(')?t:'('+t+')');
  else if(b.type==='Dialogue') o.push(t);
  else if(b.type==='Action') o.push('', t); });
 return {title:d.title||'',text:o.join('\n').trim()+'\n'}; }catch(e){ return ''; } }
function ptTexts(ids){ return new Promise(res=>{ try{ const r=indexedDB.open('paper_trail');
 r.onupgradeneeded=()=>{ try{ r.transaction.abort(); }catch(e){} res({}); };
 r.onsuccess=()=>{ const d=r.result; if(!d.objectStoreNames.contains('texts')){ d.close(); return res({}); } const o={}, s=d.transaction('texts','readonly').objectStore('texts'); let n=ids.length; if(!n){ d.close(); return res(o); }
  ids.forEach(id=>{ const q=s.get(id); q.onsuccess=()=>{ if(q.result) o[id]=q.result; if(!--n){ d.close(); res(o); } }; q.onerror=()=>{ if(!--n){ d.close(); res(o); } }; }); };
 r.onerror=()=>res({}); }catch(e){ res({}); } }); }
Y.gather=async function(){
 const S=[], add=(title,text,from,me)=>{ if(text&&String(text).trim()&&!AIMARK.test(text)) S.push({title:base(title)||'Your script',text:String(text),from,me:me||''}); };
 try{ if(g.Shelf) g.Shelf.all().forEach(it=>{ if(!/^(?:Practice scene|Today's scene) - /.test(it.file||'')) add(it.file,it.text,it.from||'the shelf',it.me); }); }catch(e){}
 const ao=LS('actor_os_sides_last'); if(ao) add(ao.file,ao.text,'Actor OS');
 const mz=LS('memorizer_v1'); if(mz&&mz.scripts) Object.values(mz.scripts).forEach(c=>{ if(!/^(?:Practice scene|Today's scene) - /.test(c.file||'')) add(c.file,c.text,'Memorizer',c.me); });
 const fo=LS('film_os_v1'); if(fo&&fo.scripts) Object.values(fo.scripts).forEach(c=>add(c.file,c.text,'Story Studio',c.me));
 try{ const idx=LS('writers-blockage-index')||[]; idx.forEach(p=>{ const w=wbText(localStorage.getItem('wb-proj:'+p.id)||''); if(w) add(w.title||p.title,w.text,"Writer's Blockage"); }); }catch(e){}
 const pt=LS('paper_trail_v1');
 if(pt&&pt.drafts&&g.indexedDB){ const latest={}; Object.values(pt.drafts).forEach(d=>{ if(d.kind==='script'&&!d.retired&&(!latest[d.project]||d.added>latest[d.project].added)) latest[d.project]=d; });
  const ds=Object.values(latest); if(ds.length){ const T=await ptTexts(ds.map(d=>d.id)); ds.forEach(d=>{ const p=pt.projects&&pt.projects[d.project]; add((p&&p.title)||d.file,T[d.id],'Paper Trail'); }); } }
 // the same text from two places counts once
 const seen=new Set(); return S.filter(s=>{ const k=hash(s.text.replace(/\s+/g,' ').trim().toUpperCase()); if(seen.has(k)) return false; seen.add(k); return true; });
};
let CUTS=null, BY={};
Y.load=async function(){ const src=await Y.gather(); const all=[]; BY={};
 src.forEach(s=>{ Y.cuts(s.text,s).forEach(c=>{ if(!BY[c.id]){ BY[c.id]=c; all.push(c); } }); }); CUTS=all; return all; };
Y.all=()=>CUTS||[];
Y.get=id=>BY[id]||null;
const LK='theactorpage_practice_yours_last';
/* a different one each time; spread across scripts so one draft doesn't hog it */
Y.pick=function(){ const C=Y.all(); if(!C.length) return null; let last=''; try{ last=localStorage.getItem(LK)||''; }catch(e){}
 const srcs=[...new Set(C.map(c=>c.src))], lastSrc=(BY[last]||{}).src;
 let pool=srcs.length>1?srcs.filter(s=>s!==lastSrc):srcs; const sp=pool[Math.floor(Math.random()*pool.length)];
 let cs=C.filter(c=>c.src===sp&&c.id!==last); if(!cs.length) cs=C.filter(c=>c.id!==last); if(!cs.length) cs=C;
 const c=cs[Math.floor(Math.random()*cs.length)]; try{ localStorage.setItem(LK,c.id); }catch(e){} return c; };
Y.current=function(){ let id=''; try{ id=localStorage.getItem(LK)||''; }catch(e){} return BY[id]||Y.pick(); };
Y.where=function(c){ return [c.head, c.page?'page '+c.page:''].filter(Boolean).join(', '); };

if(typeof module!=='undefined') module.exports=Y;
g.YourScenes=Y;
})(typeof window!=='undefined'?window:globalThis);
