/* THEACTORPAGE VO COPY: read voice over copy the way it comes in.
   Ad copy isn't screenplay format. A spot has a title with its length ("Morning Ride :30",
   "LAST CALL:15"), the voice's lines start "VO:" or the character's name ("DC:"), an ALT line is
   another way to read the line just above it, and the rest is direction ("HE WINKS"). A long line
   in a PDF wraps onto an indented line under the words.
   Also reads the agent's note: what's due when, one file or several, which spots in what order.
   Nothing is sent anywhere. Pure, so it runs in Node for the tests. */
(function(g){
const V={};
const LENS=[5,6,10,15,20,30,45,60,90,120];
/* names that are on the page but are not someone talking */
V.NOT_VOICE=/^(sting|endcard|end card|super|supers|graphic|graphics|title|card|legal|disclaimer|sfx|fx|music|mus|sound|audio|cut|cut to|open|open on|fade|fade in|fade out|dissolve|match cut|we see|note|notes|client|product|spot|length|version|rev|revision|date|isci|tag|logo|vo direction|direction|talent|character|voice|style|tone|reference|references|prices|cta)$/i;
const SPEAK=/^([A-Z][A-Z0-9 .'’&#\/-]{0,24}?)\s*:\s*(\S.*)?$/;           // "VO:  words", "GIRL 1: Hello?"
const ALT=/^ALT(?:ERNATE)?\s*\d*\s*(?:[A-Z][A-Z0-9 .'’&#\/-]{0,20})?\s*:\s*(\S.*)$/i; // "ALT:", "ALT VO:", "ALT 2:"
const HEAD=/^(.{1,70}?)\s*:\s*0?(\d{1,3})(?!\d)\s*(?:sec(?:onds?)?|s)?\b\s*(.*)$/i;      // "Morning Ride :30", "LAST CALL:15", "Salt Flats :30 (Hero...)"
const clean=s=>String(s==null?'':s).replace(/\u00a0/g,' ').replace(/[\u2028\u2029]/g,' ').replace(/\s+$/,'');
const squash=s=>clean(s).replace(/\s+/g,' ').trim();
/* lines in: strings (a Word file, a paste) or {text,x} (a PDF line from the site's PDF reader) */
function norm(lines){
 return (lines||[]).map(l=>{
  if(typeof l==='string'){ const t=clean(l).replace(/\t/g,'    '); const lead=(t.match(/^ */)||[''])[0].length; return {text:t.trim(),x:lead*6,raw:t}; }
  return {text:squash(l.text||''),x:+l.x||0,raw:l.text||''};
 }).filter(l=>l.text!=='');
}
/* does this line carry on the line of copy above it? (PDFs often lose the indent)
   Yes when the copy above hasn't ended (no . ! ? … or closing quote) and: this line starts lower case,
   or a quote is still open, or the copy above stops on a little joining word or a number, or it's a
   two-line logo lockup ("Dry Creek" / "Ride early"). */
const JOIN=/\b(a|an|the|and|or|but|of|to|for|with|from|by|in|on|at|as|your|our|my|their|its|that|which|who|when|while|if|can|will|is|are|be|up|than|more|less|now|just|\d+|\$[\d.,]+)$/i;
V.runsOn=function(prev,t){
 prev=String(prev||'').trim(); t=String(t||'').trim(); if(!prev||!t) return false;
 if(/[.!?…”"’)\]]$/.test(prev)) return false;
 const open=(prev.match(/“/g)||[]).length>(prev.match(/”/g)||[]).length||((prev.match(/"/g)||[]).length%2===1);
 if(/^[a-z$“"‘'(…\d]/.test(t)) return true;
 if(open||JOIN.test(prev)) return true;
 if(prev.split(/\s+/).length<=2&&t.split(/\s+/).length<=6&&!/[.]$/.test(t)) return true;
 return false;
};
V.isHead=function(t){
 const m=String(t||'').match(HEAD); if(!m) return null;
 const title=m[1].trim(), secs=+m[2], rest=m[3]||'';
 if(!LENS.includes(secs)) return null;
 if(/^(alt|vo)$/i.test(title)) return null;
 if(/[.!?]$/.test(title)||title.split(/\s+/).length>8) return null;
 if(/^\d/.test(rest)) return null;                       // a time like 10:30
 if(/\d$/.test(title)) return null;                     // the hour of a clock time (10:30)
 return {title:title.replace(/[\s:–—-]+$/,''),secs,extra:rest.trim()};
};
function speaker(t){
 const m=String(t).match(SPEAK); if(!m) return null;
 const who=m[1].trim().replace(/\s+/g,' ');
 if(V.NOT_VOICE.test(who)) return null;
 if(/^ALT/i.test(who)) return null;
 if(!/[A-Z]/.test(who)||who.length>24) return null;
 return {who,text:(m[2]||'').trim()};
}
/* text: one file's text or lines. -> {spots:[{title,secs,extra,lines:[{who,text,alts,notes}],notes}], voices:{name:count}, you} */
V.read=function(input){
 const L=norm(Array.isArray(input)?input:String(input||'').split(/\r?\n/));
 const spots=[], pre=[]; let spot=null, last=null, notes=[], leftX=null;
 const flush=()=>{ if(spot&&notes.length) spot.notes=spot.notes.concat(notes); notes=[]; };
 const newSpot=h=>{ flush(); spot={title:h.title,secs:h.secs,extra:h.extra,lines:[],notes:[]}; spots.push(spot); last=null; };
 for(const l of L){
  const t=l.text;
  const a=t.match(ALT);
  if(a){ if(last){ last.alts.push(a[1].trim()); last.inAlt=true; } continue; }
  const h=V.isHead(t), s0=speaker(t);
  if(h&&(!s0||/^0?\d{1,3}\b/.test(s0.text))){ newSpot(h); continue; }
  const s=s0;
  if(s){
   if(!spot) newSpot({title:'',secs:0,extra:''});
   last={who:s.who,text:s.text,alts:[],notes:notes}; notes=[]; spot.lines.push(last); continue;
  }
  if(leftX==null||l.x<leftX) leftX=l.x;
  // a wrapped line, right after a line of copy: indented past the direction column, or the copy plainly runs on
  if(last&&(l.x>=leftX+40||V.runsOn(last.inAlt?last.alts[last.alts.length-1]:last.text,t))){
   if(last.inAlt) last.alts[last.alts.length-1]+=' '+t; else last.text+=(last.text?' ':'')+t;
   continue;
  }
  last=null;
  if(spot) notes.push(t); else pre.push(t);
 }
 flush();
 spots.forEach(sp=>sp.lines.forEach(x=>{ x.text=squash(x.text); x.alts=x.alts.map(squash); delete x.inAlt; }));
 const voices={}; spots.forEach(sp=>sp.lines.forEach(x=>{ voices[x.who]=(voices[x.who]||0)+1; }));
 const you=Object.keys(voices).sort((a,b)=>(b==='VO')-(a==='VO')||voices[b]-voices[a])[0]||'';
 return {spots:spots.filter(sp=>sp.lines.length),voices,you,pre};
};
/* several files (one per spot, or one with them all) into one list, in the order asked */
V.merge=function(reads,order){
 let spots=[]; const voices={};
 reads.forEach(r=>{ (r.spots||[]).forEach(s=>spots.push(s)); Object.entries(r.voices||{}).forEach(([k,n])=>voices[k]=(voices[k]||0)+n); });
 if(order&&order.length){ const key=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const rank=s=>{ const k=key(s.title); const i=order.findIndex(o=>{ const ok=key(o); return ok&&(k===ok||k.startsWith(ok)||ok.startsWith(k)); }); return i<0?999:i; };
  spots=spots.map((s,i)=>({s,i})).sort((a,b)=>rank(a.s)-rank(b.s)||a.i-b.i).map(x=>x.s); }
 const you=Object.keys(voices).sort((a,b)=>(b==='VO')-(a==='VO')||voices[b]-voices[a])[0]||'';
 return {spots,voices,you};
};
/* the agent's note: "This is due Friday 10/23, 10am. Northgate Coffee - please read all 3 scripts on one MP3 (Salt Flats, Morning Ride, Last Call - in that order)" */
V.note=function(text){
 const lines=String(text||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean), t=lines.join(' '), r={client:'',due:'',oneFile:false,order:[],perLine:false,format:''};
 for(const l of lines){
  if(!r.due){ const d=l.match(/\bdue\b\s*(?:by|on|is)?\s*:?\s*([^.!?]*)/i); if(d&&d[1].trim()) r.due=d[1].trim().replace(/[,;\s]+$/,''); }
  if(!r.client){ const c=l.match(/^([A-Z][\w&'’ .]{1,30}?)\s+[-–—:]\s+(?:please|pls|read|record|we need|they want)/i); if(c) r.client=c[1].trim(); }
 }
 if(/\b(on|in(?:to)?|as)\s+(one|1|a single)\s+(mp3|file|wav|track)\b/i.test(t)) r.oneFile=true;
 if(/\b(separate|individual)\s+(files|mp3s|tracks)\b|\bone file per\b|\beach (line|spot) (as|in) (its|a) own\b/i.test(t)) r.perLine=true;
 const f=t.match(/\b(mp3|wav|aiff?)\b/i); if(f) r.format=f[1].toLowerCase();
 const o=t.match(/\(([^()]*?)\s*[-–—]?\s*in (?:that|this) order\s*\)/i)||t.match(/\b(?:in (?:this|that) order)[:\s]+([^.!?]+)/i);
 if(o) r.order=o[1].split(/\s*(?:,|;|\bthen\b|\band\b)\s*/i).map(s=>s.replace(/^\d+[.)]\s*/,'').trim()).filter(Boolean);
 return r;
};
/* a rough read time, before you've recorded: 2.7 words a second (ad copy, read with energy) */
V.WPS=2.7;
V.words=s=>String(s||'').split(/\s+/).filter(w=>/[A-Za-z0-9]/.test(w)).length;
V.guess=function(spot,you){ const w=spot.lines.filter(x=>!you||x.who===you).reduce((n,x)=>n+V.words(x.text),0); return Math.round(w/V.WPS*10)/10; };
/* the file name casting expects: "Northgate Coffee - Sam Actor.mp3" */
V.fileName=function(client,name,ext){ const s=x=>String(x||'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim(); return [s(client),s(name)].filter(Boolean).join(' - ')+'.'+(ext||'mp3'); };
g.VOCopy=V;
if(typeof module!=='undefined') module.exports=V;
})(typeof window!=='undefined'?window:globalThis);
