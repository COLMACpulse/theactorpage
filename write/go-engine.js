/* THEACTORPAGES GO: get it down first, decide what it is later.
   What you put in (typed, said, pasted) is kept as written, in order, and never changed.
   Every other way of seeing it (clean, a script, a letter, a deck) is made from that, fresh, each time.
   Seeing it as a script doesn't touch the raw. Nothing is guessed: it lays out the words you put in.
   Pure: no page. Runs in the browser (window.WBGo) and in Node. Uses the Voice rules (voice-engine.js)
   for spoken punctuation, um and uh, and turning sentences into screenplay elements. */
(function(g){
const G={};
const V=()=>g.WBVoice||(typeof require!=='undefined'?require('./voice-engine.js'):null);
const squash=s=>String(s||'').replace(/[ \t]+/g,' ').trim();

/* ---------- a capture: append only ---------- */
G.blank=function(now){ const t=now||Date.now(); return {id:'g'+t.toString(36)+Math.random().toString(36).slice(2,5),at:t,title:'',frozen:false,frozenAt:null,entries:[],n:0}; };
/* add one entry. Returns the entry, or null (frozen, or nothing in it). */
G.add=function(cap,text,src,now){
 if(!cap||cap.frozen) return null; const t=String(text||'').replace(/\r/g,'');
 if(!t.trim()) return null;
 cap.n=(cap.n||cap.entries.length)+1;
 const e={id:'e'+cap.n,at:now||Date.now(),src:['keyboard','dictation','paste','import'].includes(src)?src:'keyboard',text:t};
 cap.entries.push(e); return e;
};
G.freeze=function(cap,now){ if(cap&&!cap.frozen){ cap.frozen=true; cap.frozenAt=now||Date.now(); } return cap; };
G.unfreeze=function(cap){ if(cap){ cap.frozen=false; cap.frozenAt=null; } return cap; };
/* what it's called in the list: your title, or its first words */
G.name=function(cap){ if(cap.title) return cap.title; const f=cap.entries[0]; if(!f) return 'Nothing yet'; const w=squash(f.text.replace(/\n/g,' ')).split(' '); return w.slice(0,6).join(' ')+(w.length>6?'…':''); };
G.raw=cap=>cap.entries.map(e=>e.text).join('\n\n');

/* ---------- CLEAN: the same words, tidied. Spoken punctuation, um and uh, capitals, spacing. ---------- */
G.cleanLine=function(s){
 const v=V(); let t=String(s||'');
 t=v&&v.content?v.content(t):t;
 t=t.replace(/[ \t]+/g,' ').replace(/ +([,.;:!?])/g,'$1').replace(/([,;:])(?=[A-Za-z])/g,'$1 ').replace(/\bi\b/g,'I').replace(/\bi'(m|ll|ve|d)\b/g,"I'$1");
 t=t.replace(/(^|[.!?]\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase()).trim();
 if(/[A-Za-z0-9'")]$/.test(t)) t+='.';
 return t;
};
/* paragraphs: a blank line inside an entry starts a new one */
G.paras=cap=>[].concat(...cap.entries.map(e=>e.text.split(/\n\s*\n/))).map(p=>p.split('\n').map(squash).filter(Boolean).join('\n')).filter(Boolean);
/* each line tidied, line breaks kept */
G.clean=cap=>G.paras(cap).map(p=>p.split('\n').map(G.cleanLine).filter(Boolean).join('\n')).filter(Boolean);

/* ---------- SCRIPT: the Voice rules, sentence by sentence. "Anna says, ..." is dialogue; INT./EXT. is a heading. ---------- */
/* sentences, line by line. A heading line stays whole; "Mr." and "INT." don't end a sentence. */
const ABBR=/(?:\b(?:INT|EXT|EST|Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|No)\.|\bI\/E\.)$/i;
const sentences=s=>{ const out=[]; String(s||'').split('\n').map(squash).filter(Boolean).forEach(line=>{
 if(/^(INT|EXT|EST|I\/E)[.\s/]/i.test(line)){ out.push(line); return; }
 let cur=''; line.split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9])/).forEach(part=>{ cur=cur?cur+' '+part:part; if(!ABBR.test(cur)){ out.push(cur); cur=''; } }); if(cur) out.push(cur); }); return out; };
const HEAD=/^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.|EXT\.|INT |EXT |EST\.)\s*(.+)$/i;
const COLON=/^([A-Z][A-Za-z.'’ ]{0,30}?)\s*(\([^)]{1,20}\))?:\s+(.+)$/;
G.script=function(cap){
 const v=V(), out=[], names=[];
 const push=(type,text)=>{ text=squash(text); if(text) out.push({type,text}); };
 cap.entries.forEach(e=>{
  let ctx={mode:'Action',speaker:'',names};
  sentences(e.text).forEach(s=>{
   let m=s.match(HEAD);
   if(m&&/^(int|ext|i\/e|est)/i.test(s)){ push('Scene Heading',s.toUpperCase().replace(/[.!?]+$/,'')); ctx.mode='Action'; ctx.speaker=''; return; }
   m=s.match(COLON);
   if(m&&m[1].split(' ').length<=4&&!/^(note|idea|todo|to|re|subject)$/i.test(m[1])){ const nm=m[1].toUpperCase().trim(); if(!names.includes(nm)) names.push(nm); push('Character',nm); if(m[2]) push('Parenthetical',m[2].toLowerCase()); push('Dialogue',G.cleanLine(m[3])); ctx.speaker=nm; ctx.mode='Dialogue'; return; }
   const p=v?v.parse(s,ctx):{kind:'text',type:'Action',text:s};
   const k=p.kind==='change'?p.fallback:p;
   if(!k||k.kind==='none') return;
   if(k.kind==='add'){ push(k.type,k.text); if(k.mode) ctx.mode=k.mode; if(k.type==='Scene Heading'){ ctx.speaker=''; } return; }
   if(k.kind==='speech'){ push('Character',k.name); if(!names.includes(k.name)) names.push(k.name); if(k.paren) push('Parenthetical',k.paren); if(k.text) push('Dialogue',G.cleanLine(k.text)); ctx.speaker=k.name; ctx.mode='Dialogue'; return; }
   if(k.kind==='cue'){ push('Character',k.name); if(!names.includes(k.name)) names.push(k.name); ctx.speaker=k.name; ctx.mode='Dialogue'; return; }
   if(k.kind==='mode'){ ctx.mode=k.mode; if(k.mode!=='Dialogue') ctx.speaker=''; return; }
   if(k.kind==='text'){ push(k.type,k.type==='Action'||k.type==='Dialogue'?G.cleanLine(k.text):k.text); return; }
   if(k.kind==='idea'){ push('Note',k.text); return; }
   // undo, scratch that, stop listening: commands when you talk to Voice. In GO they're words you put in; kept as action.
   push('Action',G.cleanLine(s));
  });
 });
 // a speaker's lines that follow each other with nothing between: one speech
 const merged=[]; out.forEach(b=>{ const L=merged[merged.length-1]; if(L&&b.type==='Dialogue'&&L.type==='Dialogue') L.text+=' '+b.text; else merged.push(Object.assign({},b)); });
 return merged;
};
/* the script as Fountain, which THEACTORPAGES opens */
G.fountain=function(blocks,title){
 const L=[]; if(title) L.push('Title: '+title,'');
 blocks.forEach((b,i)=>{ const prev=blocks[i-1];
  const tight=prev&&(prev.type==='Character'||prev.type==='Parenthetical')&&(b.type==='Dialogue'||b.type==='Parenthetical');
  if(L.length&&!tight&&L[L.length-1]!=='') L.push('');
  if(b.type==='Scene Heading') L.push(/^(INT|EXT|EST|I\/E)/i.test(b.text)?b.text:'.'+b.text);
  else if(b.type==='Character') L.push(b.text.toUpperCase());
  else if(b.type==='Transition') L.push('> '+b.text);
  else if(b.type==='Note') L.push('[['+b.text+']]');
  else L.push(b.text);
 });
 return L.join('\n').replace(/^\n+/,'')+'\n';
};

/* ---------- LETTER: your words, as a note to someone. Hi at the top and your name at the bottom unless you wrote them. ---------- */
G.letter=function(cap,me){
 me=me||{}; const P=G.clean(cap); if(!P.length) return {subject:'',body:''};
 const L=P.slice(), sig=me.name?'\n'+me.name:'';
 // your own hello: "Hi Dana. I saw..." -> "Hi Dana," then the rest
 const hi=L[0].match(/^((?:hi|hey|hello|dear)(?:\s+[^\s,.!?]+){0,2})[,.!]\s*([\s\S]*)$/i)||L[0].match(/^((?:hi|hey|hello|dear))\s*$/i);
 if(hi){ L[0]=hi[1].replace(/\s(\w)/g,(m,c)=>' '+c.toUpperCase())+','; if(hi[2]) L.splice(1,0,hi[2]); } else L.unshift('Hi,');
 const end=L[L.length-1], bye=/^(thanks|thank you|best|cheers|love|all best|talk soon|xo)\b/i.test(end);
 if(bye) L[L.length-1]=end.replace(/[.!]$/,',')+(me.name&&end.indexOf(me.name)<0?sig:'');
 else L.push('Thanks,'+sig);
 const first=L[1]||'';
 return {subject:first.split(/[.!?]/)[0].split(' ').slice(0,8).join(' '),body:L.join('\n\n')};
};

/* ---------- DECK: one slide a paragraph. The first sentence is the title, the rest are the points. ---------- */
G.deck=function(cap){
 return G.clean(cap).map(p=>{ const S=sentences(p); let t=S.shift()||''; let pts=S;
  if(t.split(' ').length>10){ const w=t.split(' '); pts=[t].concat(pts); t=w.slice(0,6).join(' ').replace(/[,;:]$/,'')+'…'; }
  return {title:t.replace(/[.]$/,''),points:pts}; });
};
G.deckText=d=>d.map((s,i)=>'Slide '+(i+1)+': '+s.title+(s.points.length?'\n'+s.points.map(p=>'- '+p).join('\n'):'')).join('\n\n');

G.VIEWS=[['raw','RAW'],['clean','CLEAN'],['script','SCRIPT'],['letter','LETTER'],['deck','DECK']];
g.WBGo=G;
if(typeof module!=='undefined') module.exports=G;
})(typeof window!=='undefined'?window:globalThis);
