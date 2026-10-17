/* THEACTORPAGE SPOTTED: something you saw that your reps should know about, read and passed along.
   You don't see the breakdowns; your reps do. You see everything else: a notice from the casting office,
   a rep's or casting's email, a trade story about a new show, a casting director's post, a public listing.
   Paste it (or share it) and this pulls what's written: the project, the role, who's casting, the dates,
   the pay as written, the conflicts, and the musts, quoted. Nothing is guessed; what isn't written stays blank.
   Then your facts next to it (from the Hub and NOTES), and three notes built from them:
   pass it along to your reps, a pitch your rep can send, and a note straight to the office.
   Pure, so it runs in Node for the tests. Nothing is sent anywhere; you send it. */
(function(g){
const S={};
const clean=s=>String(s==null?'':s).replace(/\r/g,'').replace(/[\u00a0\u2007\u202f]/g,' ').replace(/[\u2028\u2029]/g,'\n').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/[ \t]+/g,' ');
const squash=s=>String(s||'').replace(/\s+/g,' ').trim();
const uniq=a=>a.filter((x,i)=>x&&a.findIndex(y=>y.toLowerCase()===x.toLowerCase())===i);
/* links that are yours alone (a Zoom room, your Eco Cast page): kept on the card, never put in a note */
S.PRIVATE=/zoom\.us|zoom\.com|meet\.google|teams\.microsoft|teams\.live|webex|whereby|calendly|ecocast|actorsaccess\.com\/(?:ecocast|projects\/\?view|actor)|castingnetworks\.com\/(?:talent|app)|docs\.google|drive\.google|dropbox|wetransfer/i;
const NAME="[A-Z][a-z'’.-]+(?:[ \\t]+(?:[A-Z]\\.|[A-Z][a-z'’-]+|Mc[A-Z][a-z]+|de|van|von|del|la)){1,3}";
const LABELS=[
 ['project',/^(?:project(?: name| title)?|production(?: title)?|title|show|series|film|client|brand|product)\s*[:\-–]\s*(.+)$/i],
 ['role',/^(?:role(?: name)?|character|part|roles?)\s*[:\-–]\s*(.+)$/i],
 ['casting',/^(?:casting(?: director| directors| by| office)?|cd|cds)\s*[:\-–]\s*(.+)$/i],
 ['union',/^(?:union(?: status)?|contract)\s*[:\-–]\s*(.+)$/i],
 ['conflicts',/^conflicts?\s*[:\-–]\s*(.+)$/i],
 ['wardrobe',/^(?:wardrobe|wear|attire)\s*[:\-–]\s*(.+)$/i],
 ['type',/^(?:type|project type|category|format|medium)\s*[:\-–]\s*(.+)$/i],
 ['where',/^(?:location|where|address|audition location|callback location)\s*[:\-–]\s*(.+)$/i],
 ['director',/^director\s*[:\-–]\s*(.+)$/i],
 ['network',/^(?:network|studio|platform|distributor|agency|ad agency)\s*[:\-–]\s*(.+)$/i]
];
/* lines that are someone's contact or your own business: never quoted into a note */
const SKIP=/^(?:my representation|representation|agent|manager|agency contact|phone|tel|cell|email|e-mail|contact|reply to|from|to|cc|sent|subject|date)\s*:/i;
const DATEKEY=/^((?:callback|audition|session|shoot(?:ing)?|film(?:ing)?|production|fitting|wardrobe fitting|work|booking|recall|chemistry read|deadline|tapes? due|self[- ]tapes? due|submissions? due|due|start|wrap|air|travel)(?:\s+(?:dates?|times?|day|days|window|starts?|begins?))?)\s*[:\-–]\s*(.+)$/i;
const DATEWORD=/\b(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\.?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|today|tomorrow|this week|next week|in (?:january|february|march|april|may|june|july|august|september|october|november|december))\b/i;
const WHAT=[['callback',/callback|recall|chemistry/i],['fitting',/fitting/i],['shoot',/shoot|filming|production (?:begins|starts)|films? in|start date|work date|booking/i],['due',/due|deadline|by\b|submit/i],['audition',/audition|session|tape|read/i]];
const TYPES=/\b(commercial|national commercial|regional commercial|print|industrial|pilot|series regular|recurring|guest star|co-?star|one hour drama|half hour comedy|procedural|limited series|mini-?series|episodic|feature film|feature|indie feature|short film|short|web series|music video|video game|voice ?over|vo|animation|promo|digital|social|theat(?:er|re)|play|musical|reality|documentary)\b/gi;
/* the musts: what the notice asks of you, quoted as written */
const MUST=/\b(must|required|requires?|requirement|mandatory|need(?:s|ed)?\b|ability to|able to|be comfortable|please bring|bring (?:your|a|an|own|running|real)|looking for|seeking|has to|have to|real (?:people|types|person)|no (?:models|actors|logos|agents|extras)|only\b|non-?negotiable|proficient|fluent|licen[cs]e[ds]?|certified|experience (?:with|in)|background in|actual|genuine|authentic|NOT? an actor)/i;
const PAY=/\$\s?[\d,]+|\bscale\b|\bunion scale\b|\bsession fee\b|\busage\b|\bbuy-?out\b|\bper day\b|\/day\b|\bday rate\b|\bresiduals?\b|\bunpaid\b|\bdeferred\b|\bcopy,? credit\b|\bmeals?\b(?= provided)|\bguarantee\b|\bholding fee\b|\bstipend\b/i;
const NOTPAY=/\b(budget of|box office|grossed|raised|valuation|funding)\b/i;
/* the text, as sentences, but a labeled line stays one line */
function sentences(text){
 const out=[];
 text.split('\n').map(squash).filter(Boolean).forEach(l=>{
  l.split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9$])/).forEach(s=>{ s=squash(s); if(s) out.push(s); });
 });
 return out;
}
const trimEnd=s=>squash(s).replace(/[\s,;:–—-]+$/,'');
/* a name as written: "Wren Ashby, CSA" -> "Wren Ashby"; "Dana Pell & Ross Okafor" -> both */
function names(s){
 return uniq(String(s||'').replace(/\(.*?\)/g,' ').split(/\s*(?:,|&|\band\b|\/|;|\+)\s*/).map(x=>squash(x).replace(/\b(CSA|CCDA|C\.S\.A\.)\b\.?/g,'').replace(/^(?:by|with)\s+/i,'').trim())
  .filter(x=>x&&x.length<48&&/[A-Za-z]/.test(x)&&!/^(?:casting|office|associate|assistant|inc|llc|ltd|the)$/i.test(x)));
}
const caps=s=>/^[A-Z0-9 '’&.:!?#-]{3,}$/.test(s)&&/[A-Z]{2}/.test(s);
const STOPCAPS=/^(?:EXCLUSIVE|BREAKING|UPDATE|URGENT|NOTE|NOTES|PLEASE|IMPORTANT|CASTING|CALLBACK|AUDITION|SAG-AFTRA|SAG|AFTRA|AEA|NON-UNION|NYC|LA|USA|TV|VO|ALT|FYI|ASAP|EST|PST|PDT|EDT|CST|CDT|AM|PM|THE|AND|OR|NO|YES|OK|RE|FW|FWD|ATL|DM|CD|CSA|SFX)$/;

S.read=function(raw,opts){
 opts=opts||{};
 const text=clean(raw), lines=text.split('\n').map(squash).filter(Boolean), L=sentences(text);
 const c={project:'',role:'',roles:[],casting:[],union:'',type:'',network:'',director:'',where:'',wardrobe:'',conflicts:'',dates:[],pay:[],musts:[],links:[],private:[],contact:'',source:'',found:[]};
 const lab={};
 lines.forEach(l=>{ if(SKIP.test(l)) return; for(const [k,re] of LABELS){ const m=l.match(re); if(m&&!lab[k]){ lab[k]=trimEnd(m[1].split(/(?<=[.!?])\s+(?=[A-Z"“])/)[0].replace(/[.!]$/,'')); break; } } });
 // links: the ones you could share, and the ones that are yours alone
 (text.match(/\bhttps?:\/\/[^\s<>"')\]]+/gi)||[]).map(u=>u.replace(/[.,;:!?]+$/,'')).forEach(u=>{ (S.PRIVATE.test(u)?c.private:c.links).includes(u)||(S.PRIVATE.test(u)?c.private:c.links).push(u); });
 const em=text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if(em) c.contact=em[0].replace(/[.,]+$/,'');
 const body=text.replace(/\bhttps?:\/\/\S+/gi,' ');
 // project: labeled; a quoted title; "for <Title>" after a callback or audition; a line in capitals
 c.project=lab.project||'';
 if(!c.project){ const m=body.match(/[“"‘']([A-Z][^“”"‘’']{1,50}?)[”"’'](?=[\s,.)])/); if(m&&!/[.!?]$/.test(m[1])) c.project=m[1].trim(); }
 if(!c.project){ const m=body.match(/\b(?:callback|audition|session|booking|avail|hold|read|tape|self[- ]tape|submission|pilot|series|feature|commercial|spot|campaign)s?\b[^.\n]{0,60}?\bfor\s+(?:the\s+)?((?:[A-Z][\w'’&-]*|[0-9]+)(?:\s+(?:[A-Z][\w'’&-]*|of|the|and|&|[0-9]+)){0,5})/); if(m) c.project=trimEnd(m[1].replace(/\s+(?:of|the|and|&)$/,'')); }
 if(!c.project){ const m=body.match(/^[ \t]*((?:[A-Z][A-Z0-9’&-]*[A-Z0-9])(?:[ \t]+[A-Z][A-Z0-9’&-]*[A-Z0-9]){0,5})(?![A-Za-z'’])/gm); if(m){ const t=m.map(x=>x.trim()).find(x=>!STOPCAPS.test(x)&&!x.split(/\s+/).every(w=>STOPCAPS.test(w))&&x.length>2&&!/^[A-Z]{2,4}$/.test(x)&&!/^\d/.test(x)); if(t) c.project=t; } }
 // roles: labeled; [BRACKETED] roles in a listing; "the role of X"; "Role: X"
 const br=[]; let mm; const BR=/\[([A-Z][A-Z0-9 .'’#/-]{1,40})\]\s*([^\n\[]*)/g;
 while((mm=BR.exec(text))) br.push({name:mm[1].trim(),desc:trimEnd(mm[2]).slice(0,200)});
 c.roles=br;
 c.role=lab.role||(br[0]&&br[0].name)||'';
 if(!c.role){ const m=body.match(/\b(?:the\s+)?(?:role|part)\s+(?:of|is)\s+(?:the\s+)?["“]?([A-Z][\w'’ .-]{1,40}?)["”]?(?=[.,;\n]|\s+(?:in|on|for|and)\b|$)/); if(m) c.role=trimEnd(m[1]); }
 if(!c.role){ const m=body.match(/\b(?:reading|read|audition(?:ing)?|callback|tape)\s+for\s+([A-Z][A-Z0-9 .'’#-]{2,30})\b/); if(m&&m[1].trim()!==c.project) c.role=trimEnd(m[1]); }
 // who's casting: labeled; "X is casting", "casting by X", "casting director X", "X Casting"; "callback with X"
 let cast=lab.casting?names(lab.casting):[];
 const CB=[new RegExp('\\b('+NAME+')[ \\t]+(?:is|are)[ \\t]+(?:casting|handling casting|on casting)','g'),new RegExp('\\b[Cc]asting(?:[ \\t]+(?:is|will be))?[ \\t]+(?:by|from)[ \\t]+('+NAME+'(?:\\s*(?:,|&|and)\\s*'+NAME+')*)','g'),new RegExp('\\b[Cc]asting [Dd]irectors?[ \\t]+('+NAME+'(?:\\s*(?:,|&|and)\\s*'+NAME+')*)','g'),new RegExp('\\b('+NAME+')[ \\t]+Casting\\b','g'),new RegExp('\\b('+NAME+')[ \\t]*\\((?:casting|CD|CSA)\\)','g')];
 if(!cast.length) CB.forEach(re=>{ let m; while((m=re.exec(body))) names(m[1]).forEach(n=>cast.push(n)); });
 if(!cast.length){ const m=body.match(new RegExp('\\b(?:callback|session|audition|meeting|read|chemistry read)\\s+with\\s+('+NAME+')')); if(m) cast=names(m[1]); }
 c.casting=uniq(cast.map(n=>n.replace(/\s+Casting$/,'')));
 // union, type, network
 c.union=lab.union||((body.match(/\b(SAG-?AFTRA|SAG|AEA|Equity|Non-?Union|Union)\b/i)||[])[1]||'');
 if(/^sag-?aftra$|^sag$/i.test(c.union)) c.union='SAG-AFTRA'; else if(/^non-?union$/i.test(c.union)) c.union='Non-union';
 c.type=lab.type||uniq((body.match(TYPES)||[]).map(x=>x.toLowerCase())).slice(0,3).join(', ');
 c.network=lab.network||'';
 if(!c.network){ const m=body.match(/\b(ABC|CBS|NBC|FOX|Fox|HBO|Max|Netflix|Hulu|Amazon|Prime Video|Apple TV\+?|Peacock|Paramount\+?|Showtime|Starz|AMC|FX|TNT|TBS|USA|Freeform|Disney\+?|The CW|CW|A24|Neon|Lionsgate|Universal|Warner Bros\.?|Sony|Searchlight)\b/); if(m) c.network=m[1]; }
 c.director=lab.director||'';
 // where: labeled, Zoom or virtual, in person at, self-tape
 c.where=lab.where||'';
 const ip=body.match(/\bin[- ]person(?:\s+at\s+([^.\n]{3,60}))?/i);
 if(!c.where&&ip) c.where='In person'+(ip[1]?' at '+trimEnd(ip[1]):'');
 if(!c.where&&/\b(zoom|virtual callback|virtual session|video call|live virtual|teams|webex)\b/i.test(body)) c.where='Zoom / virtual';
 if(!c.where&&/\bself[- ]?tapes?\b/i.test(body)) c.where='Self-tape';
 c.wardrobe=lab.wardrobe||'';
 // conflicts, as written
 c.conflicts=lab.conflicts||'';
 if(!c.conflicts){ const s=L.find(x=>/\bconflicts?\b/i.test(x)&&!/^(?:please )?(?:note|list|tell|let us know)\b.*\bconflicts? with\b/i.test(x)); if(s) c.conflicts=trimEnd(s.replace(/^.*?\bconflicts?\b\s*(?:[:\-–]|are|is|include|includes)?\s*/i,'')||s); }
 // dates: labeled lines, and sentences with a date in them and a word that says what it is
 lines.forEach(l=>{ const m=l.match(DATEKEY); if(m&&!SKIP.test(l)){ const k=m[1].toLowerCase(); const w=(WHAT.find(([a,re])=>re.test(k))||['date'])[0]; c.dates.push({what:w,text:trimEnd(m[1].replace(/\b\w/g,x=>x.toUpperCase()))+': '+trimEnd(m[2])}); } });
 L.forEach(s=>{ if(DATEKEY.test(s)||SKIP.test(s)||!DATEWORD.test(s)||PAY.test(s)) return; const w=WHAT.find(([a,re])=>re.test(s)); if(!w) return;
  if(c.dates.some(d=>d.text===s)) return; c.dates.push({what:w[0],text:trimEnd(s.replace(/^(?:hi|hey|hello|dear)\s+[^,]{1,30},\s*/i,'')).replace(/^./,x=>x.toUpperCase()).slice(0,160)}); });
 // pay, as written: a labeled rate line, or a sentence with money or pay words in it
 L.forEach(s=>{ if(SKIP.test(s)||NOTPAY.test(s)) return; if((/^(?:rate|pay|compensation|session|usage|fee|budget|payment)\b/i.test(s)||PAY.test(s))&&/\d|\b(scale|unpaid|deferred|copy|meals|stipend|buy-?out)\b/i.test(s)){ const t=trimEnd(s).slice(0,220); if(!c.pay.includes(t)) c.pay.push(t); } });
 // the musts: about you, quoted as written. Not the pay, not a date line, not a contact line.
 L.forEach(s=>{ if(SKIP.test(s)||c.pay.includes(trimEnd(s).slice(0,220))||DATEKEY.test(s)) return; if(LABELS.some(([k,re])=>k!=='wardrobe'&&re.test(s))) return;
  if(/\bconflicts?\b/i.test(s)) return;
  if(MUST.test(s)){ const t=trimEnd(s).slice(0,220); if(!c.musts.includes(t)) c.musts.push(t); } });
 c.conflicts=c.conflicts.replace(/[.]+$/,'');
 if(c.wardrobe&&!c.musts.some(m=>m.indexOf(c.wardrobe)>=0)) c.musts.push('Wardrobe: '+c.wardrobe);
 if(opts.url&&!c.links.includes(opts.url)&&!S.PRIVATE.test(opts.url)) c.links.unshift(opts.url);
 c.source=c.links[0]||'';
 ['project','role','casting','union','type','network','where','conflicts','dates','pay','musts','links'].forEach(k=>{ const v=c[k]; if(v&&(!Array.isArray(v)||v.length)) c.found.push(k); });
 return c;
};

/* ---------- your facts, next to it ---------- */
const STOP=new Set('the a an and or of in on for with to at by from as is are mr mrs ms dr man woman guy girl boy lady male female person type role lead supporting featured background extra day player co star costar guest recurring series regular principal adult young old older younger mid late early'.split(' '));
const stem=w=>w.length>4?w.replace(/(ing|ed|es|s)$/,''):w.replace(/s$/,'');
const words=s=>uniq(String(s||'').toLowerCase().replace(/[’']/g,'').split(/[^a-z0-9]+/).filter(w=>w.length>2&&!STOP.has(w)&&!/^\d+$/.test(w)).map(stem));
S.key=x=>String(x||'').toLowerCase().replace(/\b(casting|cd|office|inc|llc|ltd|and|&|csa)\b/g,'').replace(/[^a-z0-9]+/g,'');
const pl=(n,w)=>n+' '+w+(n===1?'':'s');
/* ctx: {projects, credits (Hub), you (YOU profile credits), notes: Notes module, spotted: [cards], offices: Offices module}
   -> [{k, t}] plain lines. Nothing is a verdict; it's what's in your own records. */
S.facts=function(card,ctx){
 ctx=ctx||{}; const out=[], names=card.casting||[];
 const O=ctx.offices, N=ctx.notes;
 if(names.length&&O&&O.history){ const h=O.history(ctx.projects||[],ctx.credits||[],names,card.hubId||null); if(h) out.push({k:'office',t:O.words(h),h}); }
 if(names.length&&N&&N.lineFor){ const t=N.lineFor(names); if(t) out.push({k:'notes',t}); }
 // roles of yours that share a word with this one ("dad", "cop", "runner"), from your credits and your reads
 const rw=words(card.role).filter(w=>w.length>2);
 if(rw.length){
  const mine=[]; const seen=new Set();
  const add=(role,title,how)=>{ const k=(role+'|'+title).toLowerCase(); if(seen.has(k)) return; const ws=words(role); const hit=rw.find(w=>ws.includes(w)); if(hit){ seen.add(k); mine.push({w:hit,role,title,how}); } };
  (ctx.credits||[]).forEach(c=>c&&add(c.character||c.role||'',c.title||'','booked'));
  ((ctx.you&&ctx.you.credits)||[]).forEach(c=>c&&add(c.character||c.role||'',c.title||'','booked'));
  (ctx.projects||[]).forEach(p=>p&&(p.aaid||p.kind==='audition')&&add(p.role||'',p.project||p.title||'','read'));
  const by={}; mine.forEach(m=>(by[m.w]=by[m.w]||[]).push(m));
  Object.keys(by).forEach(w=>{ const L=by[w], b=L.filter(x=>x.how==='booked'), r=L.filter(x=>x.how==='read');
   const show=x=>x.role+(x.title?' ('+x.title+')':'');
   out.push({k:'roles',t:'Roles of yours with "'+w+'": '+[b.length?pl(b.length,'booked')+': '+b.slice(0,3).map(show).join(', '):'',r.length?pl(r.length,'read')+(b.length?'':': '+r.slice(0,3).map(show).join(', ')):''].filter(Boolean).join('; ')+'.',booked:b,read:r}); });
 }
 // the kind of job: your credits on the same kind ("commercial", "pilot", "feature")
 const tw=String(card.type||'').toLowerCase();
 if(tw){ const kinds=[['commercial',/commercial|spot|print|national|regional/],['TV',/pilot|series|episodic|procedural|drama|comedy|guest|co-?star|recurring/],['film',/feature|film|short/],['voice',/voice|vo\b|animation|video game/]];
  const k=kinds.find(([n,re])=>re.test(tw));
  if(k){ const med=c=>String(c.medium||c.section||c.type||'').toLowerCase(); const n=[].concat(ctx.credits||[],(ctx.you&&ctx.you.credits)||[]).filter(c=>c&&k[1].test(med(c)+' '+(k[0]==='TV'?'tv':'')+' '+(k[0]==='film'?'film':'')) );
   const hits=uniq(n.map(c=>c.title||'').filter(Boolean)); if(hits.length) out.push({k:'kind',t:pl(hits.length,k[0]+' credit')+' on your résumé: '+hits.slice(0,4).join(', ')+(hits.length>4?', and '+(hits.length-4)+' more':'')+'.',titles:hits}); } }
 // conflicts you hold (a spot you booked, its category, through when) against the conflicts this one lists. Word match, still running only.
 const cw=words(card.conflicts);
 if(cw.length&&ctx.held&&ctx.held.length){ const today=ctx.today||new Date().toISOString().slice(0,10);
  ctx.held.filter(h=>h&&(!h.until||h.until>=today)).forEach(h=>{ const hw=words(h.category+' '+(h.brand||'')); const hit=cw.filter(w=>hw.includes(w));
   if(hit.length) out.push({k:'conflict',t:'You hold '+(h.brand||'a spot')+' ('+h.category+')'+(h.until?' through '+h.until:'')+'. This one lists '+card.conflicts+'.',held:h}); }); }
 // you've spotted this office before
 if(names.length&&ctx.spotted){ const ks=names.map(S.key).filter(Boolean); const prev=ctx.spotted.filter(x=>x.id!==(ctx.selfId||card.id)&&x.card!==card&&(x.card.casting||[]).some(n=>ks.includes(S.key(n))));
  if(prev.length) out.push({k:'spotted',t:'You spotted '+pl(prev.length,'other')+' from '+names[0]+': '+prev.slice(0,3).map(x=>x.card.project||'(no title)').join(', ')+'.'}); }
 if(names.length&&!out.some(x=>x.k==='office'||x.k==='notes')) out.push({k:'office',t:'Nothing from '+names.join(', ')+' in your Hub or NOTES yet.'});
 return out;
};

/* ---------- the notes you send. Built from what's written and what's yours. You edit, you send. ---------- */
const first=n=>String(n||'').split(/\s+/)[0]||'';
const head=c=>[c.project||'(no title)',c.type?'('+c.type.split(',')[0]+')':''].filter(Boolean).join(' ');
const castLine=c=>c.casting.length?c.casting.join(' & ')+' casting':'';
/* "Just passing this along." To your reps: what it is, where you saw it, and the facts that make it worth a look */
S.passAlong=function(card,facts,me){
 me=me||{}; const L=['Just passing this along.',''];
 L.push([head(card),castLine(card)].filter(Boolean).join(', ')+'.');
 if(card.role) L.push('Role: '+card.role+(card.roles&&card.roles.length>1?' (also listed: '+card.roles.filter(r=>r.name!==card.role).map(r=>r.name).slice(0,4).join(', ')+')':''));
 if(card.network) L.push(card.network+'.');
 card.dates.slice(0,3).forEach(d=>L.push(d.text));
 if(card.pay.length) L.push('Pay as written: '+card.pay[0]);
 if(card.conflicts) L.push('Conflicts: '+card.conflicts);
 if(card.source) L.push(card.source);
 const f=(facts||[]).filter(x=>x.k!=='spotted').map(x=>x.t);  // includes a held conflict: your reps need that
 if(f.length){ L.push(''); f.forEach(t=>L.push(t)); }
 if(card.mine) { L.push(''); L.push(card.mine); }
 L.push(''); L.push(me.name||'');
 return {subject:'Just passing this along: '+(card.project||'something I saw')+(card.role?' / '+card.role:''),body:L.join('\n').replace(/\n{3,}/g,'\n\n').trim()};
};
/* for your rep to send the office: your client did X, Y, Z; here's the material */
const creditBits=(facts,me)=>{ const k=(facts||[]).find(x=>x.k==='kind'), bits=[];
 (facts||[]).filter(x=>x.k==='roles').forEach(r=>(r.booked||[]).forEach(x=>{ const b=x.title?x.title+' ('+x.role+')':x.role; if(bits.length<3&&!bits.includes(b)) bits.push(b); }));
 if(k&&k.titles) k.titles.forEach(t=>{ if(bits.length<4&&!bits.some(b=>b.indexOf(t)===0)) bits.push(t); });
 if(!bits.length&&me&&me.credits) me.credits.slice(0,3).forEach(c=>c&&c.title&&bits.push(c.title+(c.role||c.character?' ('+(c.character||c.role)+')':'')));
 return bits; };
const historyBit=(facts,who,cl)=>{ const o=(facts||[]).find(x=>x.k==='office'&&x.h); if(!o||!o.h||!(o.h.reads||o.h.credits)) return '';
 const h=o.h; return (cl?cl+' has':'I have')+' been in front of you '+pl(h.reads+h.credits,'time')+(h.last&&h.last.title?', last on '+h.last.title:'')+'.'; };
const material=me=>{ const L=[]; if(me.reel) L.push('Reel: '+me.reel); if(me.resume) L.push('Résumé: '+me.resume); if(me.site) L.push(me.site); return L; };
S.pitch=function(card,facts,me){
 me=me||{}; const who=card.casting.length?first(card.casting[0]):'there', nm=me.name||'my client', L=['Hi '+who+',',''];
 L.push('I see you\'re casting '+(card.project||'this')+(card.role?' and wanted to put '+nm+' up for '+card.role:'')+'.');
 const hb=historyBit(facts,who,nm); if(hb) L.push(hb);
 const cb=creditBits(facts,me); if(cb.length) L.push(nm+' has done '+(cb.length>1?cb.slice(0,-1).join(', ')+' and '+cb.slice(-1):cb[0])+'.');
 const m=material(me); if(m.length){ L.push(''); m.forEach(x=>L.push(x)); }
 L.push(''); L.push('Love to hear from you.');
 return {subject:(me.name||'Submission')+(card.role?' for '+card.role:'')+(card.project?', '+card.project:''),body:L.join('\n').trim()};
};
/* straight to the office, in your voice */
S.direct=function(card,facts,me){
 me=me||{}; const who=card.casting.length?first(card.casting[0]):'there', L=['Hi '+who+',',''];
 L.push('I saw you\'re casting '+(card.project||'this')+'.'+(me.name?' I\'m '+me.name+(me.rep?', with '+me.rep:'')+'.':''));
 const hb=historyBit(facts,who,''); if(hb) L.push(hb.replace(/^I have been in front of you/,'You\'ve had me in'));
 const n=(facts||[]).find(x=>x.k==='notes'); if(n&&/gave you/.test(n.t)) L.push('I still use the note you gave me.');
 const cb=creditBits(facts,me); if(cb.length) L.push('Recent: '+cb.join(', ')+'.');
 const m=material(me); if(m.length){ L.push(''); m.forEach(x=>L.push(x)); }
 L.push(''); L.push('Love to hear from you.'); L.push(me.name||'');
 return {subject:(me.name||'Actor')+(card.project?', '+card.project:''),body:L.join('\n').trim()};
};

/* ---------- where it stands ---------- */
/* conflicts you hold: [{brand, category, until:'YYYY-MM-DD'}] */
S.STATUS=[['spotted','Spotted'],['passed','Passed along'],['submitted','Submitted'],['room','In the room'],['booked','Booked'],['nothing','Nothing back'],['not','Not for me']];
S.statusWord=k=>(S.STATUS.find(s=>s[0]===k)||S.STATUS[0])[1];
/* the list for your manager: searchable, with links. Every word has to be in the row somewhere. */
S.rowText=x=>[x.card.project,x.card.role,(x.card.casting||[]).join(' '),x.card.type,x.card.network,S.statusWord(x.status),x.note||'',(x.facts||[]).map(f=>f.t).join(' ')].join(' ').toLowerCase();
S.find=function(list,q){ const ws=String(q||'').toLowerCase().split(/\s+/).filter(Boolean); return ws.length?list.filter(x=>{ const t=S.rowText(x); return ws.every(w=>t.indexOf(w)>=0); }):list.slice(); };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const safeUrl=u=>/^https?:\/\//i.test(u||'')&&!S.PRIVATE.test(u)?u:'';
S.listText=function(list,me){
 me=me||{}; const L=['Spotted'+(me.name?' - '+me.name:''),new Date().toLocaleDateString(),''];
 list.forEach(x=>{ const c=x.card; L.push('- '+[c.project||'(no title)',c.role,(c.casting||[]).join(' & ')].filter(Boolean).join(' / ')+' ['+S.statusWord(x.status)+']');
  const f=(x.facts||[]).filter(f=>f.k==='office'||f.k==='roles').map(f=>f.t)[0]; if(f) L.push('  '+f);
  if(x.note) L.push('  '+x.note); const u=safeUrl(c.source); if(u) L.push('  '+u); });
 return L.join('\n');
};
S.listHtml=function(list,me){
 me=me||{}; const title='Spotted'+(me.name?' · '+me.name:'');
 const rows=list.map(x=>{ const c=x.card, u=safeUrl(c.source), f=(x.facts||[]).filter(f=>f.k!=='spotted').map(f=>'<li>'+esc(f.t)+'</li>').join('');
  return '<article data-t="'+esc(S.rowText(x))+'"><header><b>'+esc(c.project||'(no title)')+'</b>'+(c.role?' · '+esc(c.role):'')+'<span class="st">'+esc(S.statusWord(x.status))+'</span></header>'
   +'<p class="m">'+[c.casting&&c.casting.length?esc(c.casting.join(' & '))+' casting':'',esc(c.type||''),esc(c.network||''),x.at?'spotted '+esc(new Date(x.at).toLocaleDateString()):''].filter(Boolean).join(' · ')+'</p>'
   +(f?'<ul>'+f+'</ul>':'')+(x.note?'<p>'+esc(x.note)+'</p>':'')+(u?'<p><a href="'+esc(u)+'">'+esc(u.replace(/^https?:\/\//,'').slice(0,70))+'</a></p>':'')+'</article>'; }).join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'
  +':root{--bg:#f6f2ea;--ink:#1d1a15;--dim:#5f584b;--line:#d3cab8;--acc:#8a5a08}@media(prefers-color-scheme:dark){:root{--bg:#121110;--ink:#ece7dc;--dim:#a39c8e;--line:#2f2b26;--acc:#e9b25a}}'
  +'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:760px;margin:0 auto;padding:20px 16px 60px}h1{font-size:22px;margin:0 0 4px}.d{color:var(--dim);margin:0 0 14px}'
  +'input{width:100%;box-sizing:border-box;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit;margin-bottom:14px}'
  +'article{border-top:1px solid var(--line);padding:12px 0}header{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.st{margin-left:auto;font-size:13px;color:var(--acc)}.m{color:var(--dim);font-size:14px;margin:4px 0}ul{margin:6px 0;padding-left:18px;font-size:14px}a{color:var(--acc);word-break:break-all}'
  +'</style></head><body><main><h1>'+esc(title)+'</h1><p class="d">'+list.length+' spotted · '+esc(new Date().toLocaleDateString())+'</p><input id="q" placeholder="Find: an office, a show, a role, a status" aria-label="Find">'
  +rows+'</main><script>document.getElementById("q").addEventListener("input",function(e){var ws=e.target.value.toLowerCase().split(/\\s+/).filter(Boolean);document.querySelectorAll("article").forEach(function(a){var t=a.getAttribute("data-t");a.hidden=!ws.every(function(w){return t.indexOf(w)>=0;});});});<\/script></body></html>';
};
g.Spotted=S;
if(typeof module!=='undefined') module.exports=S;
})(typeof window!=='undefined'?window:globalThis);
