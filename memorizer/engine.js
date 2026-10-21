/* MEMORIZER engine. Pure: runs in the browser (window.MemEngine) and in Node.
   No scores. It compares what you said with the line and schedules the next look.
   The sides themselves are read by Actor OS's reader (../actor-os/sides.js). */
(function(g){
const E={};

/* ---------- words ---------- */
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve',
 'thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numWords(n){
 if(n<20) return ONES[n];
 if(n<100) return TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:'');
 if(n<1000) return ONES[Math.floor(n/100)]+' hundred'+(n%100?' '+numWords(n%100):'');
 if(n<10000 && n%1000===0) return ONES[n/1000]+' thousand';
 return String(n);
}
E.numWords=numWords;
/* Lower case, straight quotes, digits said as words, hyphens split. Spelling
   that changes the wording ("gonna" vs "going to") is NOT folded: that is a
   different line and casting hears it. "10" vs "ten" is the same line. */
function prep(s){
 let t=String(s||'').replace(/[\u2018\u2019\u02bc]/g,"'").replace(/[\u201c\u201d]/g,'"')
  .replace(/[\u2014\u2013]/g,' ').replace(/(\d),(\d{3})/g,'$1$2');
 return t.replace(/\d+/g,m=>' '+numWords(parseInt(m,10))+' ');
}
/* the same words with their case kept, for showing back to the actor */
/* any language: letters and numbers of every script; Chinese, Japanese and Thai, written without spaces, count a character as a word */
const WORD=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]|[\p{L}\p{N}\p{M}]+(?:'[\p{L}\p{M}]+)?/gu;
/* accents don't decide a match: "esta" and "está" are the same word heard */
const fold=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').normalize('NFC');
E.wordsAsWritten=function(s){ return (prep(s).match(WORD)||[]); };
E.words=function(s){
 let t=String(s||'').replace(/[‘’ʼ]/g,"'").replace(/[“”]/g,'"')
  .replace(/[—–]/g,' ').replace(/(\d),(\d{3})/g,'$1$2');
 t=t.replace(/\d+/g,m=>' '+numWords(parseInt(m,10))+' ');
 return (fold(t.toLowerCase()).match(WORD)||[]);
};

/* ---------- compare ---------- */
function lcs(a,b){
 const n=a.length,m=b.length, dp=[];
 for(let i=0;i<=n;i++){ dp.push(new Int32Array(m+1)); }
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
  dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const ops=[]; let i=0,j=0;
 while(i<n&&j<m){
  if(a[i]===b[j]){ ops.push({t:'ok',w:a[i]}); i++; j++; }
  else if(dp[i+1][j]>=dp[i][j+1]){ ops.push({t:'miss',w:a[i]}); i++; }
  else { ops.push({t:'extra',w:b[j]}); j++; }
 }
 while(i<n) ops.push({t:'miss',w:a[i++]});
 while(j<m) ops.push({t:'extra',w:b[j++]});
 return ops;
}
/* What you said against the line, word by word. Plain result, no number. */
E.compare=function(line,said){
 const a=E.words(line), b=E.words(said);
 const ops=lcs(a,b);
 const A=E.wordsAsWritten(line), B=E.wordsAsWritten(said);
 let ai=0,bi=0; ops.forEach(o=>{ if(o.t==='ok'){ o.as=A[ai++]; bi++; } else if(o.t==='miss') o.as=A[ai++]; else o.as=B[bi++]; });
 const missing=ops.filter(o=>o.t==='miss').map(o=>o.as||o.w);
 const added=ops.filter(o=>o.t==='extra').map(o=>o.as||o.w);
 const got=ops.filter(o=>o.t==='ok').length;
 let say;
 if(!b.length) say='Nothing heard.';
 else if(!missing.length&&!added.length) say='Word for word.';
 else {
  const parts=[];
  if(missing.length) parts.push('Missed: '+missing.join(', '));
  if(added.length) parts.push('Added: '+added.join(', '));
  say=got+' of '+a.length+' words. '+parts.join('. ')+'.';
 }
 return {ops:ops,missing:missing,added:added,got:got,of:a.length,exact:b.length>0&&!missing.length&&!added.length,say:say};
};

/* ---------- how much of the line shows ---------- */
E.LEVELS=[
 {id:'whole', label:'Whole line'},
 {id:'first', label:'First words'},
 {id:'letters',label:'First letters'},
 {id:'none',  label:'Nothing'}
];
E.letters=function(line){
 return String(line||'').replace(/[‘’]/g,"'")
  .replace(/[\p{L}\p{N}][\p{L}\p{N}\p{M}']*/gu,w=>Array.from(w)[0].toUpperCase())
  .replace(/[^\p{L}\p{N}.?!,;:\-—¿¡。、？！ ]/gu,'').replace(/\s+/g,' ').trim();
};
E.firstWords=function(line){
 const t=String(line||'').trim();
 const m=t.match(/^(.+?[,;:.!?—])(\s|$)/);
 const head=(m?m[1]:t).split(/\s+/);
 return head.slice(0,4).join(' ')+((m&&head.length<=4)||t.split(/\s+/).length<=4?'':'…');
};
E.show=function(line,level){
 if(level==='whole') return String(line||'');
 if(level==='first') return E.firstWords(line);
 if(level==='letters') return E.letters(line);
 return '';
};

/* ---------- beats: a long speech in thought-sized pieces ---------- */
E.beats=function(line){
 const t=String(line||'').replace(/\s+/g,' ').trim();
 let parts=t.replace(/([.!?])\s+/g,'$1\u0001').replace(/\s*[—]\s*|\s+--\s+/g,'—\u0001').split('\u0001').map(s=>s.trim()).filter(Boolean);
 // only break on and/but/because when a piece is still long
 const out=[];
 parts.forEach(p=>{
  if(E.words(p).length<=10){ out.push(p); return; }
  p.replace(/\s+(and|but|because|so|then|or)\s+/gi,'\u0001$1 ').split('\u0001').forEach(x=>{ x=x.trim(); if(x) out.push(x); });
 });
 return out.length>1?out:[t];
};

/* ---------- the drill list from a parsed script ----------
   script = Actor OS ActorSides.script(beats, me): [{who,text,mine,cue}]
   Each of your speeches becomes one item, with the line before it as the cue. */
function hash(s){ let h=5381; s=String(s); for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h.toString(36); }
E.hash=hash;
E.items=function(script){
 const out=[], seen={}; let last=null;
 (script||[]).forEach((b,i)=>{
  if(!b||!b.text) return;
  if(b.mine){
   const base=hash(E.words(b.text).join(' '));
   seen[base]=(seen[base]||0)+1;
   out.push({key:base+'.'+seen[base], n:out.length+1, at:i, text:b.text,
     cue:last?{who:last.who,text:last.text}:null});
  } else last=b;
 });
 return out;
};

/* ---------- when you see a line again ----------
   You mark yourself: got (word for word), close, or missed.
   Missed comes back in 2 minutes, close in 8. Got pushes out step by step.
   Short steps first, because most auditions give you a day, not a month. */
const MIN=60000, HOUR=60*MIN, DAY=24*HOUR;
E.STEPS=[10*MIN, HOUR, DAY, 3*DAY, 7*DAY];
E.mark=function(st,mark,now){
 st=Object.assign({streak:0,seen:0,misses:0,last:'',due:0},st||{});
 now=now||Date.now();
 st.seen++; st.last=mark; st.at=now;
 if(mark==='got'){ st.due=now+E.STEPS[Math.min(st.streak,E.STEPS.length-1)]; st.streak++; }
 else if(mark==='close'){ st.streak=0; st.due=now+8*MIN; }
 else { st.streak=0; st.misses++; st.due=now+2*MIN; }
 return st;
};
/* new: never marked. work: last mark was close or missed. getting: got it once.
   solid: got it twice or more in a row. */
E.status=function(st){
 if(!st||!st.seen) return 'new';
 if(st.last!=='got') return 'work';
 return st.streak<2?'getting':'solid';
};
E.count=function(items,states){
 const c={new:0,work:0,getting:0,solid:0};
 items.forEach(it=>{ c[E.status(states[it.key])]++; });
 return c;
};
E.countLine=function(c){
 const p=[];
 if(c.work) p.push(c.work+' need'+(c.work===1?'s':'')+' work');
 if(c.getting) p.push(c.getting+' getting there');
 if(c.new) p.push(c.new+' not drilled yet');
 if(c.solid) p.push(c.solid+' solid');
 return p.join(' · ')||'No lines.';
};
/* What to drill now: missed first, then close, then new lines in script order,
   then anything else whose time has come. */
E.queue=function(items,states,now){
 now=now||Date.now();
 const rank=it=>{ const st=states[it.key]; if(!st||!st.seen) return 2; if(st.last==='miss') return 0; if(st.last==='close') return 1; return 3; };
 return items.filter(it=>{ const st=states[it.key]; return !st||!st.seen||st.due<=now; })
  .sort((a,b)=>rank(a)-rank(b)||a.n-b.n);
};
/* When the next line comes back, if nothing is due now. */
E.nextDue=function(items,states){
 let t=Infinity; items.forEach(it=>{ const st=states[it.key]; if(st&&st.seen&&st.due<t) t=st.due; }); return t;
};
E.inWords=function(ms){
 if(ms<MIN) return 'under a minute';
 if(ms<HOUR){ const m=Math.round(ms/MIN); return m+' minute'+(m===1?'':'s'); }
 if(ms<DAY){ const h=Math.round(ms/HOUR); return h+' hour'+(h===1?'':'s'); }
 const d=Math.round(ms/DAY); return d+' day'+(d===1?'':'s');
};

/* ---------- action verbs (optional tag per line) ---------- */
E.VERBS=['accuse','appease','attack','beg','belittle','blame','calm','charm','coax','comfort','confess','confront',
 'convince','dare','deflect','demand','disarm','dismiss','encourage','forgive','goad','grill','implore','interrogate',
 'intimidate','invite','mock','needle','plead','pressure','probe','promise','protect','provoke','punish','reassure',
 'rebuke','reject','reveal','scold','seduce','shame','silence','soothe','stall','summon','surrender','taunt','tease',
 'test','threaten','warn','wound'];

if(typeof module!=='undefined') module.exports=E;
g.MemEngine=E;
})(typeof window!=='undefined'?window:globalThis);
