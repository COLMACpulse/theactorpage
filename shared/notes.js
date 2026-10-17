/* THEACTORPAGE NOTES: the notes you get in a room (a class on Zoom, a callback, a set), kept.
   A session: who was in the room (the guest: casting, a director, a coach), when, what kind of room,
   the scene. A note: their words as close as you remember them, who gave it, the moment on your tape.
   Gives back: your notes by person, by scene, and what more than one person told you (plain word
   matching on your own notes, no score). And the line for a new request from someone you've met:
   "Dana Pell gave you a note in Mar 2026: 'let the silence sit.'"
   localStorage theactorpage_notes_v1 (text only). Tapes and voice memos are on the takes shelf. Nothing uploaded. */
(function(g){
/* ask the browser to keep this site's things (not clear them when space runs low): the first time you put something in, then at most once a day until it says yes */
function keepAsk(){ try{ const s=navigator.storage; if(!s||!s.persist) return; const k='theactorpage_keep_asked', t=+localStorage.getItem(k)||0; if(Date.now()-t<86400000) return; localStorage.setItem(k,String(Date.now())); (s.persisted?s.persisted():Promise.resolve(false)).then(p=>{ if(!p) s.persist(); }).catch(()=>{}); }catch(e){} }

const N={}, KEY='theactorpage_notes_v1';
const now=()=>Date.now(), uid=p=>p+now().toString(36)+Math.random().toString(36).slice(2,5);
const blank=()=>({sessions:[],notes:[]});
function read(){ try{ const d=JSON.parse((g.localStorage&&g.localStorage.getItem(KEY))||'null'); if(d&&Array.isArray(d.sessions)&&Array.isArray(d.notes)) return d; }catch(e){} return blank(); }
function write(d){ try{ g.localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
N.ROOMS=[['class','Class or workshop'],['callback','Callback'],['set','On set'],['other','Other']];
N.ROLES=[['casting','Casting'],['director','Director'],['coach','Coach'],['producer','Producer'],['actor','Actor'],['other','Other']];
/* a person's name, the same however it's written: "Dana Pell", "dana pell", "Dana Pell Casting" */
N.SELF=/^(me|myself|self|i|mine)$/i;
N.key=x=>String(x||'').toLowerCase().replace(/\b(casting|cd|office|inc|llc|ltd|and|&)\b/g,'').replace(/[^a-z0-9]+/g,'');
N.all=()=>read();
N.sessions=()=>read().sessions.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.at-a.at);
N.session=id=>read().sessions.find(s=>s.id===id)||null;
/* s: {date:'YYYY-MM-DD', room, who:[{name,role}], title, part, shelfId, where} */
N.addSession=function(s){ keepAsk(); const d=read(), it=Object.assign({id:uid('s'),at:now(),date:new Date().toISOString().slice(0,10),room:'class',who:[],title:'',part:'',shelfId:'',where:'',tapes:[],marks:[]},s||{}); it.who=(it.who||[]).filter(w=>w&&String(w.name||'').trim()).map(w=>({name:String(w.name).trim(),role:w.role||'casting'})); d.sessions.push(it); write(d); return it; };
N.setSession=function(id,patch){ const d=read(), s=d.sessions.find(x=>x.id===id); if(!s) return null; Object.assign(s,patch); write(d); return s; };
N.removeSession=function(id){ const d=read(); d.sessions=d.sessions.filter(s=>s.id!==id); d.notes=d.notes.filter(n=>n.sid!==id); write(d); };
/* a tape of you from the session (its id on the takes shelf) */
N.addTape=function(sid,tape){ const d=read(), s=d.sessions.find(x=>x.id===sid); if(!s) return null; s.tapes=s.tapes||[]; s.tapes.push(Object.assign({at:now()},tape)); write(d); return s; };
/* MARK: a moment a note started. Kept as a clock time; tied to the tape that was rolling, if one was. */
N.mark=function(sid,m){ const d=read(), s=d.sessions.find(x=>x.id===sid); if(!s) return null; const it=Object.assign({id:uid('m'),t:now()},m||{}); s.marks=s.marks||[]; s.marks.push(it); write(d); return it; };
/* n: {sid, text, giver, mark, takeId, at:sec, memoId} */
N.addNote=function(n){ const d=read(), s=d.sessions.find(x=>x.id===n.sid)||{};
 const it=Object.assign({id:uid('n'),t:now(),date:s.date||new Date().toISOString().slice(0,10),giver:(s.who&&s.who[0]&&s.who[0].name)||'',text:'',title:s.title||'',part:s.part||'',room:s.room||''},n);
 d.notes.push(it); write(d); return it; };
N.setNote=function(id,patch){ const d=read(), n=d.notes.find(x=>x.id===id); if(!n) return null; Object.assign(n,patch); write(d); return n; };
N.removeNote=function(id){ const d=read(); d.notes=d.notes.filter(n=>n.id!==id); write(d); };
N.notesOf=sid=>read().notes.filter(n=>n.sid===sid).sort((a,b)=>(a.at==null?1e9:a.at)-(b.at==null?1e9:b.at)||a.t-b.t);
/* everyone you've been in a room with: [{name, role, key, sessions, notes, first, last}] */
N.people=function(){ const d=read(), by={};
 d.sessions.forEach(s=>(s.who||[]).forEach(w=>{ const k=N.key(w.name); if(!k) return; const p=by[k]=by[k]||{name:w.name,role:w.role,key:k,sessions:0,notes:0,first:s.date,last:s.date}; p.sessions++; if(s.date<p.first) p.first=s.date; if(s.date>p.last) p.last=s.date; if(w.name.length>p.name.length) p.name=w.name; }));
 d.notes.forEach(n=>{ const k=N.key(n.giver); if(!k) return; const p=by[k]=by[k]||{name:n.giver,role:'',key:k,sessions:0,notes:0,first:n.date,last:n.date}; p.notes++; });
 return Object.values(by).sort((a,b)=>String(b.last).localeCompare(String(a.last))||a.name.localeCompare(b.name)); };
N.byPerson=name=>{ const k=N.key(name); return read().notes.filter(n=>N.key(n.giver)===k).sort((a,b)=>String(b.date).localeCompare(String(a.date))||b.t-a.t); };
N.byScene=function(){ const by={}; read().notes.forEach(n=>{ const k=(n.title||'(no scene)')+(n.part?' · '+n.part:''); (by[k]=by[k]||[]).push(n); }); return by; };
/* what more than one person told you: words and two-word phrases, in notes from 2 or more different people.
   Plain matching on your own words: "rush" and "rushing" count as one word; nothing is guessed. */
const STOP=new Set(('a an the and or but if so of to in on at for with by from as is are was were be been being it its this that these those '+
 'you your yours i me my we our they them their he him his she her what when where who how why which there here then than too very '+
 'just really more less much some any all can could would should will shall may might must do does did done have has had get got go '+
 'going let lets like make made want need one two also not no yes okay ok great good nice think know see look said say says tell told '+
 'scene line lines bit lot way thing things little maybe try again next first last other into out up down over about off back now take'+
 ' gave give feel felt actually kind sort stuff right').split(/\s+/));
/* little words dropped before pairing, so "take your time" is the pair "take time" */
const FUNC=new Set('a an the and or of to in on at for with by is are was be it this that i you your me my'.split(' '));
const stem=w=>w.length>4?w.replace(/(ing|ed|es|s)$/,'').replace(/(.)\1$/,'$1'):w;
function terms(text){ const ws=String(text||'').toLowerCase().replace(/[’']/g,'').split(/[^a-z]+/).filter(Boolean), out=new Set();
 ws.forEach(w=>{ if(!STOP.has(w)&&w.length>2) out.add(stem(w)); });
 const c=ws.filter(w=>!FUNC.has(w));
 for(let i=0;i<c.length-1;i++){ const a=c[i],b=c[i+1]; if(STOP.has(a)&&STOP.has(b)) continue; out.add(stem(a)+' '+stem(b)); }
 return out; }
N.repeats=function(min){ min=min||2; const d=read(), by={}, word={};
/* your own notes to yourself don't count as another person telling you */
 d.notes.forEach(n=>{ const g2=N.key(n.giver); if(!g2||N.SELF.test(String(n.giver).trim())) return; terms(n.text).forEach(t=>{ const e=by[t]=by[t]||{term:t,givers:new Set(),notes:[]}; e.givers.add(g2); e.notes.push(n.id); }); });
 let L=Object.values(by).filter(e=>e.givers.size>=min).map(e=>({term:e.term,people:e.givers.size,notes:e.notes}));
 // a word inside a phrase that already counts the same people says nothing new
 L=L.filter(e=>!(e.term.indexOf(' ')<0&&L.some(p=>p.term.indexOf(' ')>0&&p.term.split(' ').includes(e.term)&&p.people===e.people)));
 return L.sort((a,b)=>b.people-a.people||b.notes.length-a.notes.length||a.term.localeCompare(b.term)); };
/* the word as you'd say it back: the commonest way it was written in your notes */
N.spell=function(term){ const d=read(), parts=term.split(' '), seen={};
 d.notes.forEach(n=>{ const ws=String(n.text||'').replace(/[’']/g,'').split(/[^A-Za-z]+/).filter(Boolean), lw=ws.map(w=>w.toLowerCase());
  if(parts.length===1){ lw.forEach(w=>{ if(stem(w)===parts[0]) seen[w]=(seen[w]||0)+1; }); return; }
  const ix=lw.map((w,k)=>FUNC.has(w)?-1:k).filter(k=>k>=0);
  for(let q=0;q<ix.length-1;q++){ if(stem(lw[ix[q]])===parts[0]&&stem(lw[ix[q+1]])===parts[1]){ const sp=lw.slice(ix[q],ix[q+1]+1).join(' '); seen[sp]=(seen[sp]||0)+1; } } });
 return Object.entries(seen).sort((a,b)=>b[1]-a[1])[0]?.[0]||term; };
/* for a new request: the last note from anyone on it you've been in a room with */
const mon=d=>{ const t=Date.parse(d); return isFinite(t)?new Date(t).toLocaleDateString(undefined,{month:'short',year:'numeric',timeZone:'UTC'}):''; };
N.lineFor=function(names){ names=(Array.isArray(names)?names:[names]).map(String).filter(s=>s.trim());
 for(const nm of names){ const L=N.byPerson(nm); if(L.length){ const n=L[0], q=String(n.text).replace(/\s+/g,' ').trim(); return nm.trim()+' gave you '+(L.length===1?'a note':L.length+' notes')+(n.date?', the last in '+mon(n.date):'')+': "'+(q.length>90?q.slice(0,88)+'…':q)+'"'; }
  const k=N.key(nm), met=read().sessions.filter(s=>(s.who||[]).some(w=>N.key(w.name)===k)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
  if(met) return 'You were in a room with '+nm.trim()+(met.date?' in '+mon(met.date):'')+' ('+((N.ROOMS.find(r=>r[0]===met.room)||[0,'a session'])[1]).toLowerCase()+').'; }
 return ''; };
/* has this person seen you work? (for the Hub: a guest who saw you counts as "has seen me") */
N.met=function(name){ const k=N.key(name); if(!k) return null; const ss=read().sessions.filter(s=>(s.who||[]).some(w=>N.key(w.name)===k)).sort((a,b)=>String(b.date).localeCompare(String(a.date))); return ss.length?{sessions:ss.length,last:ss[0].date,room:ss[0].room,notes:N.byPerson(name).length}:null; };
g.Notes=N;
if(typeof module!=='undefined') module.exports=N;
})(typeof window!=='undefined'?window:globalThis);
