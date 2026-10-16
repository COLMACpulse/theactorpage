/* SET LIST engine. Pure: no page, no storage. Runs in the browser (window.SetList) and in Node.
   Your funny material, built up: CLIP > JOKE > BIT > ACT, then a SET in the order you'll do it,
   with its running time. Times are your own takes when you have one, otherwise an estimate from
   the words, and it says which. How it went is your word after the night. No votes, no scores. */
(function(g){
const L={};
L.LEVELS=[{id:'clip',name:'CLIP',say:'One quick unit. A thought, a premise, a hit.'},{id:'joke',name:'JOKE',say:'One setup, one punch. Tags if it has them.'},
 {id:'bit',name:'BIT',say:'Jokes on one idea, in an order.'},{id:'act',name:'ACT',say:'Bits with a point of view.'}];
L.RANK={clip:0,joke:1,bit:2,act:3};
L.HOW=[{id:'killed',name:'Killed'},{id:'ok',name:'Fine'},{id:'died',name:'Died'},{id:'cut',name:'Cut it'}];
L.WPM=150;   // a common stand-up pace; only used when there is no take
L.words=t=>String(t||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;
L.mmss=s=>{ s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
L.parseTime=v=>{ v=String(v||'').trim(); if(!v) return null; if(/^\d+$/.test(v)) return +v*60; const m=v.match(/^(\d+):(\d{1,2})$/); return m?+m[1]*60+ +m[2]:null; };
/* what a piece can be built from: anything a level below it */
L.canHold=(outer,inner)=>outer&&inner&&outer.id!==inner.id&&L.RANK[inner.level]<L.RANK[outer.level];
/* -> {secs, from:'take'|'parts'|'words'|'none', missing:n}  (missing = parts deleted since) */
L.time=function(p,byId,seen){
 if(!p) return {secs:0,from:'none',missing:0};
 if(p.repSecs>0) return {secs:Math.round(p.repSecs),from:'take',missing:0};
 seen=seen||new Set(); if(seen.has(p.id)) return {secs:0,from:'none',missing:0}; seen.add(p.id);
 const parts=(p.parts||[]);
 if(parts.length){ let s=0, miss=0, est=false; parts.forEach(id=>{ const q=byId[id]; if(!q){ miss++; return; } const t=L.time(q,byId,new Set(seen)); s+=t.secs; if(t.from!=='take') est=true; });
  const own=L.words(p.text)?Math.round(L.words(p.text)/L.WPM*60):0;   // words that sit around the parts (segues)
  return {secs:s+own,from:'parts',est:est||!!own,missing:miss}; }
 const w=L.words(p.text); return w?{secs:Math.max(1,Math.round(w/L.WPM*60)),from:'words',missing:0}:{secs:0,from:'none',missing:0};
};
L.timeWords=function(t){ if(!t||t.from==='none') return 'no time yet'; if(t.from==='take') return L.mmss(t.secs)+' (your take)'; if(t.from==='words') return 'about '+L.mmss(t.secs); return (t.est?'about ':'')+L.mmss(t.secs)+(t.missing?' ('+t.missing+' part'+(t.missing===1?'':'s')+' deleted)':''); };
/* a set: items are piece ids in the order you'll do them */
L.setTime=function(set,byId){ let s=0, est=false, gone=0; (set.items||[]).forEach(id=>{ const p=byId[id]; if(!p){ gone++; return; } const t=L.time(p,byId); s+=t.secs; if(t.from!=='take'||t.est) est=true; }); return {secs:s,est,gone}; };
L.setWords=function(set,byId){ const t=L.setTime(set,byId), target=set.target||0; let h=(t.est?'about ':'')+L.mmss(t.secs);
 if(target){ const d=t.secs-target; h+=Math.abs(d)<5?' · right on '+L.mmss(target):d<0?' · '+L.mmss(-d)+' under '+L.mmss(target):' · '+L.mmss(d)+' over '+L.mmss(target); } return h; };
L.move=function(arr,i,dir){ const a=arr.slice(), j=i+dir; if(i<0||i>=a.length||j<0||j>=a.length) return a; [a[i],a[j]]=[a[j],a[i]]; return a; };
/* how it went: counts of your own marks, newest note */
L.howCounts=function(p){ const c={}; (p.done||[]).forEach(d=>{ c[d.how]=(c[d.how]||0)+1; }); return L.HOW.filter(h=>c[h.id]).map(h=>h.name+' '+c[h.id]).join(' · '); };
L.lastHow=function(p){ const d=(p.done||[]).slice().sort((a,b)=>b.at-a.at)[0]; return d||null; };
L.firstWords=(t,n)=>{ const w=String(t||'').replace(/\s+/g,' ').trim().split(' '); return w.slice(0,n||8).join(' ')+(w.length>(n||8)?' …':''); };
/* the list you tape to the floor: numbered, short, big */
L.stageText=function(set,byId){
 const lines=(set.items||[]).map((id,i)=>{ const p=byId[id]; if(!p) return (i+1)+'. (deleted)'; return (i+1)+'. '+(p.title||L.firstWords(p.text,5)).toUpperCase(); });
 return (set.name?set.name.toUpperCase()+'\n':'')+L.setWords(set,byId)+'\n\n'+lines.join('\n')+'\n';
};
/* the whole set as words, to read or send */
L.setText=function(set,byId){
 const out=[(set.name||'Set')+' · '+L.setWords(set,byId),''];
 (set.items||[]).forEach((id,i)=>{ const p=byId[id]; if(!p){ out.push((i+1)+'. (deleted)',''); return; }
  out.push((i+1)+'. '+(p.title||L.firstWords(p.text,5))+' ['+L.LEVELS.find(x=>x.id===p.level).name+', '+L.timeWords(L.time(p,byId))+']');
  const body=pieceText(p,byId,new Set()); if(body) out.push(body); out.push(''); });
 return out.join('\n');
};
function pieceText(p,byId,seen){ if(seen.has(p.id)) return ''; seen.add(p.id); const own=String(p.text||'').trim();
 const parts=(p.parts||[]).map(id=>byId[id]).filter(Boolean).map(q=>pieceText(q,byId,new Set(seen))).filter(Boolean);
 return [own].concat(parts).filter(Boolean).join('\n\n'); }
L.pieceText=(p,byId)=>pieceText(p,byId||{},new Set());
/* prompts to get a rep going (from Carlton's Loadies) */
L.PREMISES=["A cowboy discovers therapy.","Church parking lot energy.","Gas station sushi confidence.","The least intimidating threat ever spoken.","Costco sample addiction.","A guy who thinks buying one tool made him a contractor.","Midlife crisis motorcycle logic.","A man explaining Bluetooth with full confidence and zero accuracy."];
L.CUES=[["dentist","airplane food","crypto","mother-in-law"],["parking lot","energy drink","wedding DJ","fake confidence"],["raccoon","Uber driver","church shoes","podcast"],["pickleball","midlife crisis","protein powder","group chat"],["cowboy hat","Tesla","yard sale","manifesting"],["insurance call","gas station burrito","LinkedIn","apology text"],["Costco sample","sword collection","back pain","manifest destiny"]];
L.CAPTIONS=["Two guys in lawn chairs watching a neighbor confidently do something incredibly wrong.","A dog with human-level disappointment watching its owner explain something unnecessary.","A family photo where one person clearly just heard the weirdest thing ever said.","A guy at a barbecue pretending he knows how to smoke meat.","Someone absolutely certain this was a good idea five minutes ago.","A group of men acting like the folding table is sacred technology."];
L.QUESTIONS=["Why do dogs lose their minds when you pick up keys?","What's the most suspiciously confident food?","What's the least trustworthy sentence a stranger can say at a gas station?","What object has the strongest divorced-dad energy?","Why does every group text eventually become unusable?","What hobby instantly makes a guy sound more dangerous than he actually is?"];
g.SetList=L;
if(typeof module!=='undefined') module.exports=L;
})(typeof window!=='undefined'?window:globalThis);
