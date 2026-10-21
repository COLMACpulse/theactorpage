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
 ['network',/^(?:network|studio|platform|distributor|agency|ad agency)\s*[:\-–]\s*(.+)$/i],
 ['status',/^(?:status|stage|production status)\s*[:\-–]\s*(.+)$/i],
 ['genre',/^genres?\s*[:\-–]\s*(.+)$/i]
];
/* lines that are someone's contact or your own business: never quoted into a note */
const SKIP=/^(?:my representation|representation|agent|manager|agency contact|phone|tel|cell|email|e-mail|contact|reply to|from|to|cc|sent|subject|date)\s*:/i;
const DATEKEY=/^((?:callback|audition|session|shoot(?:ing)?|film(?:ing)?|production|fitting|wardrobe fitting|work|booking|recall|chemistry read|deadline|tapes? due|self[- ]tapes? due|submissions? due|due|start|wrap|air|travel)(?:\s+(?:dates?|times?|day|days|window|starts?|begins?))?)\s*[:\-–]\s*(.+)$/i;
const DATEWORD=/\b(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\.?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)|today|tomorrow|this week|next week|(?:in|for|by|this|next|early|late|mid-?)\s+(?:january|february|march|april|may|june|july|august|september|october|november|december))\b/i;
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
 const c={project:'',role:'',roles:[],casting:[],union:'',type:'',network:'',director:'',where:'',wardrobe:'',conflicts:'',status:'',genre:'',about:'',dates:[],pay:[],musts:[],links:[],private:[],contact:'',source:'',found:[]};
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
 const CB=[new RegExp('\\b('+NAME+'(?:[ \\t]*(?:,|&|and)[ \\t]*'+NAME+')*)[ \\t]+(?:is|are)[ \\t]+(?:casting|handling casting|handling the casting|on casting)','g'),new RegExp('\\b[Cc]asting(?:[ \\t]+(?:is|will be))?[ \\t]+(?:by|from)[ \\t]+('+NAME+'(?:\\s*(?:,|&|and)\\s*'+NAME+')*)','g'),new RegExp('\\b[Cc]asting [Dd]irectors?[ \\t]+('+NAME+'(?:\\s*(?:,|&|and)\\s*'+NAME+')*)','g'),new RegExp('\\b('+NAME+')[ \\t]+Casting\\b','g'),new RegExp('\\b('+NAME+')[ \\t]*\\((?:casting|CD|CSA)\\)','g')];
 const SL=L.join('\n').replace(/\bhttps?:\/\/\S+/gi,' ');
 if(!cast.length) CB.forEach(re=>{ let m; while((m=re.exec(SL))) names(m[1]).forEach(n=>cast.push(n)); });
 if(!cast.length){ const m=body.match(new RegExp('\\b(?:callback|session|audition|meeting|read|chemistry read)\\s+with\\s+('+NAME+')')); if(m) cast=names(m[1]); }
 c.casting=uniq(cast.map(n=>n.replace(/\s+Casting$/,'')));
 // union, type, network
 c.union=lab.union||((body.match(/\b(SAG-?AFTRA|SAG|AEA|Equity|Non-?Union|Union)\b/i)||[])[1]||'');
 if(/^sag-?aftra$|^sag$/i.test(c.union)) c.union='SAG-AFTRA'; else if(/^non-?union$/i.test(c.union)) c.union='Non-union';
 c.type=lab.type||uniq((body.match(TYPES)||[]).map(x=>x.toLowerCase())).slice(0,3).join(', ');
 c.network=lab.network||'';
 if(!c.network){ const m=body.match(/\b(ABC|CBS|NBC|FOX|Fox|HBO|Max|Netflix|Hulu|Amazon|Prime Video|Apple TV\+?|Peacock|Paramount\+?|Showtime|Starz|AMC|FX|TNT|TBS|USA|Freeform|Disney\+?|The CW|CW|A24|Neon|Lionsgate|Universal|Warner Bros\.?|Sony|Searchlight)\b/); if(m) c.network=m[1]; }
 c.director=lab.director||'';
 if(!c.director){ const m=body.match(new RegExp('\\b('+NAME+')[ \\t]+(?:will direct|is directing|is set to direct|to direct|directs)\\b'))||body.match(new RegExp('\\b(?:directed by|director)[ \\t]+('+NAME+')')); if(m) c.director=m[1].trim(); }
 c.status=lab.status||''; c.genre=lab.genre||'';
 c.about=squash(lines.filter(l=>!SKIP.test(l)).join(' ').replace(/\bhttps?:\/\/\S+/gi,' ')).slice(0,600);
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
 c.stage=S.stage(raw);
 ['project','role','casting','union','type','network','where','conflicts','status','genre','dates','pay','musts','links'].forEach(k=>{ const v=c[k]; if(v&&(!Array.isArray(v)||v.length)) c.found.push(k); });
 return c;
};

/* ---------- where it stands, as written ---------- */
/* The stage words in the story, each with the phrase as written and its sentence. A "not" in front (won't, not until,
   delayed, no longer) is said, and doesn't count as that stage. Two stages: both shown, never picked. Casting words
   are their own line. How old the story is, from the date written in it; past 120 days it's stale. Nothing guessed. */
S.STAGES=[
 ['stopped','stopped',/\b(?:shut down|halted|shelved|cancel(?:l)?ed|cancels|cancel(?:l)?ing|axed|axes|scraps|scrapped|pulled the plug|production (?:was )?suspended)\b/i],
 ['wrapped','wrapped',/\b(?:wrapped (?:filming|production|principal photography|shooting)|has wrapped|production (?:has )?wrapped|filming (?:has )?wrapped|wrapped in)\b/i],
 ['filming','filming',/\b(?:currently (?:filming|shooting|in production)|now filming|filming (?:is )?underway|production (?:is )?underway|began (?:filming|shooting|production)|started (?:filming|shooting|production)|cameras (?:are )?rolling|principal photography (?:began|started|is underway|has begun)|is (?:filming|shooting) (?:in|on|now|this)|on set in)\b/i],
 ['prep','in prep',/\b(?:(?:in|into|enters?|entered|entering|begins?|began|starts?|started|moves? into|moved into|heads? into|headed into|now in) pre-?production|pre-?production (?:is underway|has begun|has started|began|begins|starts|started|is set)|location scouting|scouting locations|crew(?:ing)? up|hiring crew|(?:set|scheduled|slated|expected|due|aims?|planning|plans) to (?:begin |start )?(?:filming|shooting|production|lens|shoot)|(?:begins|starts|start|begin|will begin|will start) (?:filming|shooting|production|principal photography)|(?:filming|shooting|production) (?:begins|starts|is set to begin|is scheduled|will begin|will start)|(?:set|slated) to shoot|goes? (?:in)?to production)\b/i],
 ['greenlit','greenlit',/\b(?:greenlit|green-?lit|greenlighted|given the green light|series order|ordered (?:to|a) series|picked up (?:to|for) series|straight-to-series)\b/i],
 ['development','in development',/\b(?:in development|in the works|being developed|(?:is|are|been) developing (?:an? |the )?(?:[\w'’-]+ ){0,3}(?:series|film|movie|feature|show|adaptation|pilot|script|drama|comedy|thriller|western|horror|remake|reboot|documentary|limited series)|set up at|optioned|has been optioned|attached to (?:direct|star|write)|in early development|financing (?:is )?(?:in place|secured)|has (?:landed|found) (?:a )?(?:home|financing))\b/i]
];
S.CASTING=/\b(?:now casting|(?:is|are) casting(?= (?!directors?\b)\w)|auditions? (?:are |is )?(?:now )?open|casting (?:is |has )?(?:underway|begun|started|opened|opens|begins)|casting (?:locals|local talent|extras|background|now|call|for)|open (?:casting )?calls?|open auditions?|auditions? (?:are|will be) held|holding auditions|seeking (?:local )?(?:actors|talent|extras|background)|looking for (?:local )?(?:actors|talent|extras)|submissions? (?:are )?(?:open|now open)|accepting submissions|casting directors? (?:is|are) looking)\b/i;
const NOT=/\b(?:not|n't|never|no longer|won'?t|isn'?t|aren'?t|wasn'?t|until|delayed|postponed|pushed (?:back|to)|on hold|off|before)\b/i;
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};
/* the date the story ran: a "Published" or dateline date first, else the first full date with a year */
S.storyDate=function(text){ const t=String(text||'');
 const pick=s=>{ let m=s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d\d)\b/i); if(m) return new Date(+m[3],MON[m[1].toLowerCase()],+m[2]);
  m=s.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?,?\s+(20\d\d)\b/i); if(m) return new Date(+m[3],MON[m[2].toLowerCase()],+m[1]);
  m=s.match(/\b(20\d\d)-(\d\d)-(\d\d)\b/); if(m) return new Date(+m[1],+m[2]-1,+m[3]);
  m=s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d\d)\b/); if(m) return new Date(+m[3],+m[1]-1,+m[2]); return null; };
 const L=t.split('\n'), pub=L.find(l=>/\b(?:published|posted|updated|date)\b\s*[:\-–]?/i.test(l)&&pick(l));
 const d=pub?pick(pub):pick(t.slice(0,600))||null; return d&&!isNaN(d)?d:null; };
S.stage=function(raw){
 const text=clean(raw).replace(/\bhttps?:\/\/\S+/gi,' '), L=sentences(text), claims=[], casting=[];
 L.forEach(snt=>{ S.STAGES.forEach(([k,word,re])=>{ const m=snt.match(re); if(!m) return; if(k==='wrapped'&&claims.some(c=>c.sentence===snt&&c.stage==='filming')) return;
   const before=snt.slice(Math.max(0,m.index-40),m.index), neg=NOT.test(before)||/^\s*until\b/i.test(snt.slice(m.index+m[0].length,m.index+m[0].length+8));
   claims.push({stage:k,word,phrase:m[0],sentence:snt.slice(0,240),not:neg}); });
  const c=snt.match(S.CASTING); if(c&&!NOT.test(snt.slice(Math.max(0,c.index-30),c.index))) casting.push({phrase:c[0],sentence:snt.slice(0,240)}); });
 const d=S.storyDate(text);
 const stages=[...new Set(claims.filter(c=>!c.not).map(c=>c.stage))];
 return {claims,stages,casting,dated:d?d.toISOString().slice(0,10):''};
};
const MONW=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
S.dayWords=iso=>{ const [y,m,d]=String(iso).split('-').map(Number); return MONW[m-1]+' '+d+', '+y; };
/* in words, with the age counted from today (so a kept story gets older) */
S.stageWords=function(st,now){
 if(!st) return [];
 const L=[], by=k=>st.claims.filter(c=>c.stage===k&&!c.not), q=c=>'"'+c.phrase+'"';
 if(st.stages.length===1){ const c=by(st.stages[0]); L.push('Stage, as written: '+c[0].word+' ('+uniq(c.map(q)).join(', ')+').'); }
 else if(st.stages.length>1) L.push((st.stages.length===2?'Two':st.stages.length)+' stages in it: '+st.stages.map(k=>{ const c=by(k); return c[0].word+' ('+uniq(c.map(q)).join(', ')+')'; }).join(st.stages.length===2?' and ':', ')+'. '+(st.stages.length===2?'Both':'All')+' shown; read it and see which is now.');
 st.claims.filter(c=>c.not).forEach(c=>L.push('Said with a not: "'+c.sentence+'" Not counted as '+c.word+'.'));
 if(!st.stages.length&&!st.claims.length) L.push('No stage words in it.');
 if(st.casting.length) L.push('Casting, as written: '+uniq(st.casting.map(c=>'"'+c.phrase+'"')).join(', ')+'.');
 if(st.dated){ const t=now||Date.now(), [y,m,d]=st.dated.split('-').map(Number), days=Math.floor((new Date(new Date(t).getFullYear(),new Date(t).getMonth(),new Date(t).getDate())-new Date(y,m-1,d))/86400000);
  L.push('The story is dated '+S.dayWords(st.dated)+(days<0?'.':days===0?', today.':', '+days+' day'+(days===1?'':'s')+' ago.')+(days>120?' Stale: past 120 days, it may have moved on.':'')); }
 else L.push('No date in what you pasted. Check when it ran.');
 return L;
};
S.isStale=(st,now)=>!!(st&&st.dated)&&((now||Date.now())-new Date(st.dated+'T00:00:00').getTime())/86400000>120;

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
 if(ctx.types&&ctx.types.length){ const m=S.typesIn(card,ctx.types); if(m.length) out.push({k:'types',t:'Your words in it: '+m.join(', ')+'.',m}); }
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
 if(card.stage){ S.stageWords(card.stage).filter(w=>/^(Stage|Two stages|Casting)/.test(w)).forEach(w=>L.push(w)); }
 if(card.source) L.push(card.source);
 (card.more||[]).slice(-2).forEach(m=>{ const sl=stageLine(m.stage), u=safeUrl(m.source); L.push('Newer story'+(m.stage&&m.stage.dated?', dated '+S.dayWords(m.stage.dated):'')+(sl?': '+sl:'')+'.'+(u?' '+u:'')); });
 if(card.you_stage) L.push('Where it is, my read: '+S.yourStageWord(card.you_stage).toLowerCase()+'.');
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

/* ---------- many at once: a trade story with several projects in it, an IMDbPro list, the dailies ---------- */
/* "Dry Creek (TV Series)", "Low Tide (2027)", "Salt Road (TV Mini Series) (2027)": a title line on a list */
const KIND=/^\s*(?:[•·*\-–]\s*)?(.{2,80}?)\s*\(((?:TV |Web )?(?:Series|Mini[- ]?Series|Movie|Pilot|Special|Short|Feature|Film|Documentary|Video Game|Podcast(?: Series)?|Limited Series))\)(?:\s*\((\d{4})\))?\s*$|^\s*(?:[•·*\-–]\s*)?(.{2,80}?)\s*\((\d{4})\)\s*$/i;
const mergeCard=(a,b)=>{ ['role','union','type','network','director','where','wardrobe','conflicts','status','genre','contact','source'].forEach(k=>{ if(!a[k]&&b[k]) a[k]=b[k]; });
 a.casting=uniq(a.casting.concat(b.casting)); ['roles','dates','pay','musts','links','private'].forEach(k=>b[k].forEach(x=>{ if(!a[k].some(y=>JSON.stringify(y)===JSON.stringify(x))) a[k].push(x); }));
 a.about=squash(a.about+' '+b.about).slice(0,600); a.found=uniq(a.found.concat(b.found)); return a; };
/* -> [card]. One project in it: one card, the same as S.read. Nothing guessed: a paragraph with no project in it joins
   the one before it; links on their own line are the story's link, for every card that has none. */
S.readMany=function(raw,opts){
 opts=opts||{}; const text=clean(raw), lines=text.split('\n');
 const blocks=[];
 if(lines.filter(l=>KIND.test(l)).length>=2){
  // a list: each title line starts one
  let cur=null; lines.forEach(l=>{ const m=l.match(KIND); if(m){ cur={title:trimEnd(m[1]||m[4]).replace(/^["“']|["”']$/g,''),kind:m[2]||'',year:m[3]||m[5]||'',text:''}; blocks.push(cur); } else if(cur) cur.text+=l+'\n'; });
 } else {
  // a story: paragraphs, and each bullet its own
  text.split(/\n\s*\n/).forEach(par=>{ const ls=par.split('\n'); if(ls.filter(l=>/^\s*[•·*]\s+|^\s*[-–]\s+\S/.test(l)).length>=2) ls.forEach(l=>blocks.push({text:l.replace(/^\s*[•·*\-–]\s+/,'')})); else blocks.push({text:par}); });
 }
 const loose=[]; let out=[];
 blocks.forEach(b=>{ const t=b.text.trim();
  if(!b.title&&/^(?:\s*https?:\/\/\S+\s*)+$/.test(t)){ (t.match(/https?:\/\/\S+/g)||[]).forEach(u=>loose.push(u.replace(/[.,;:!?]+$/,''))); return; }
  const c=S.read((b.title?'Title: '+b.title+'\n':'')+b.text);
  if(b.kind) c.type=b.kind; if(b.year) c.year=b.year;
  if(!c.project){ if(out.length) mergeCard(out[out.length-1],c); return; }
  out.push(c); });
 // the same project twice (a story and a list, two paragraphs): one card
 const byKey=[]; out.forEach(c=>{ const k=S.key(c.project), have=byKey.find(x=>S.key(x.project)===k); if(have) mergeCard(have,c); else byKey.push(c); }); out=byKey;
 if(opts.url&&!S.PRIVATE.test(opts.url)) loose.unshift(opts.url);
 out.forEach(c=>{ loose.forEach(u=>{ if(!S.PRIVATE.test(u)&&!c.links.includes(u)) c.links.push(u); }); c.source=c.source||c.links[0]||''; if(c.source&&!c.found.includes('links')) c.found.push('links'); });
 if(out.length<=1) return [S.read(raw,opts)];
 return out;
};

/* ---------- your types: your own words for what you're right for ("cop", "dad", "rancher", "western") ---------- */
/* -> the ones of yours that are in this card (all of a type's words, anywhere in it). Not a verdict: the words match. */
S.typesIn=function(card,types){
 const have=new Set(words([card.project,card.role,(card.roles||[]).map(r=>r.name+' '+r.desc).join(' '),card.type,card.genre,card.about,(card.musts||[]).join(' ')].join(' ')));
 return uniq((types||[]).map(squash)).filter(t=>{ const w=words(t); return w.length&&w.every(x=>have.has(x)); });
};

/* ---------- the offices ---------- */
/* how a request from the Hub reached you: through Actors Access (Breakdowns), straight from the office, or not on it */
S.channel=function(p){
 const id=String((p&&p.aaid)||''), r=p&&p.request;
 if(/^csv:/.test(id)) return 'aa';
 if(r){ if(r.confirmOnEcoCast||r.sent||r.passed) return 'aa'; if(r.contact) return 'direct'; }
 return '';
};
const LIVE=['spotted','passed','submitted','room'];
/* every office in what you've spotted: what they're casting, your history with them, how they've reached you, and
   what of theirs has your words in it. ctx as S.facts, plus types. -> [{name, key, now[], h, how{aa,direct,other}, seen}] */
S.offices=function(items,ctx){
 ctx=ctx||{}; const O=ctx.offices, K=O&&O.key?O.key:S.key, by={};
 (items||[]).forEach(it=>{ (it.card.casting||[]).forEach(n=>{ const k=K(n); if(!k) return;
  const o=by[k]||(by[k]={name:n,key:k,now:[],h:null,how:{aa:0,direct:0,other:0},seen:false});
  o.now.push({id:it.id,at:it.at,status:it.status,card:it.card,live:LIVE.includes(it.status),match:S.typesIn(it.card,ctx.types)}); }); });
 Object.values(by).forEach(o=>{
  o.now.sort((a,b)=>(b.at||0)-(a.at||0));
  o.h=O&&O.history?O.history(ctx.projects||[],ctx.credits||[],[o.name]):null;
  o.seen=!!(o.h&&(o.h.reads||o.h.credits));
  const off=p=>p.casting_office||p.casting_director||p.casting||'';
  (ctx.projects||[]).filter(p=>p&&(p.aaid||p.kind==='audition')&&K(off(p))===o.key).forEach(p=>{ const c=S.channel(p); o.how[c||'other']++; });
 });
 return Object.values(by).sort((a,b)=>(b.now[0].at||0)-(a.now[0].at||0));
};
S.howWords=function(o){
 const b=[]; if(o.how.aa) b.push('through Actors Access '+pl(o.how.aa,'time')); if(o.how.direct) b.push('straight from the office '+pl(o.how.direct,'time'));
 return b.length?'Came to me '+b.join(', ')+'.':'';
};
const histMine=h=>{ if(!h||!(h.reads||h.credits)) return 'Never had me in.';
 const b=[]; if(h.reads) b.push(pl(h.reads,'read')); if(h.callbacks) b.push(pl(h.callbacks,'callback')); if(h.booked) b.push(h.booked+' booked');
 return 'Had me in: '+b.join(', ')+'.'+(h.last&&h.last.title?' Last: '+[h.last.title,h.last.role].filter(Boolean).join(' / ')+', '+h.last.when+'.':''); };
const projLine=it=>{ const c=it.card, d=[c.network,c.type&&c.type.split(',')[0],c.status].filter(Boolean).join(', '); return (c.project||'(no title)')+(d?' ('+d+')':''); };
/* the report to your reps: three parts, from what you spotted and your own records. No contacts, no private links. */
S.report=function(items,ctx,me){
 ctx=ctx||{}; me=me||{}; const types=ctx.types||[];
 const live=(items||[]).filter(it=>LIVE.includes(it.status));
 const offs=S.offices(live,ctx);
 const fits=live.map(it=>({it,m:S.typesIn(it.card,types)})).filter(x=>!types.length||x.m.length).sort((a,b)=>(b.it.at||0)-(a.it.at||0));
 const known=offs.filter(o=>o.seen), fresh=offs.filter(o=>!o.seen).sort((a,b)=>(b.now.some(x=>x.match.length)?1:0)-(a.now.some(x=>x.match.length)?1:0));
 const L=['Here\'s what I\'m seeing.',''];
 const one=x=>{ const c=x.it.card, u=safeUrl(c.source); L.push('- '+projLine(x.it)+((c.casting||[]).length?'. '+c.casting.join(' & ')+' casting':'')+(c.role?'. Role: '+c.role:'')+'.'+(x.m.length?' My words: '+x.m.join(', ')+'.':''));
  if(u) L.push('  '+u); };
 L.push(types.length?'CASTING NOW THAT FITS ME':'CASTING NOW'); if(fits.length) fits.forEach(one); else L.push('- Nothing I\'ve spotted has my words in it yet.');
 L.push('','OFFICES THAT KNOW ME, CASTING NOW');
 if(known.length) known.forEach(o=>{ L.push('- '+o.name+': '+o.now.map(x=>x.card.project||'(no title)').join(', ')+'.'); L.push('  '+histMine(o.h)+(S.howWords(o)?' '+S.howWords(o):'')); });
 else L.push('- None of the offices casting these have had me in.');
 L.push('','OFFICES I SHOULD BE GOING IN FOR AND AM NOT');
 if(fresh.length) fresh.forEach(o=>{ const m=uniq([].concat.apply([],o.now.map(x=>x.match))); L.push('- '+o.name+': '+o.now.map(x=>x.card.project||'(no title)').join(', ')+'.'+(m.length?' My words: '+m.join(', ')+'.':''));
  L.push('  Never had me in. Do they go through Breakdowns, or direct?'); });
 else L.push('- Every office casting these has had me in.');
 L.push('',me.name||'');
 return {subject:'What\'s casting'+(me.name?' - '+me.name:'')+', '+new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'}),body:L.join('\n').replace(/\n{3,}/g,'\n\n').trim(),fits,known,fresh};
};

S.reportHtml=function(rep,me){
 me=me||{}; const title='What\'s casting'+(me.name?' · '+me.name:'');
 const body=esc(rep.body).replace(/https?:\/\/[^\s<]+/g,u=>'<a href="'+u+'">'+u.replace(/^https?:\/\//,'').slice(0,70)+'</a>').replace(/^([A-Z][A-Z ,\']{8,})$/gm,'<b>$1</b>');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'
  +':root{--bg:#f6f2ea;--ink:#1d1a15;--dim:#5f584b;--acc:#8a5a08}@media(prefers-color-scheme:dark){:root{--bg:#121110;--ink:#ece7dc;--dim:#a39c8e;--acc:#e9b25a}}'
  +'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:760px;margin:0 auto;padding:20px 16px 60px}h1{font-size:22px;margin:0 0 4px}.d{color:var(--dim);margin:0 0 14px}pre{white-space:pre-wrap;font:inherit;margin:0}b{display:inline-block;margin-top:8px;letter-spacing:.06em}a{color:var(--acc);word-break:break-all}'
  +'</style></head><body><main><h1>'+esc(title)+'</h1><p class="d">'+esc(new Date().toLocaleDateString())+'</p><pre>'+body+'</pre></main></body></html>';
};
/* ---------- LOOK: searches made from your types. They open in your browser; nothing is fetched here. ---------- */
S.WHERE=[['news','NEWS',''],['deadline','DEADLINE','deadline.com'],['variety','VARIETY','variety.com'],['thr','THR','hollywoodreporter.com'],['backstage','BACKSTAGE','backstage.com']];
const STAGEQ='(casting OR "pre-production" OR greenlit OR "series order" OR "in development" OR "set to star")';
/* types: your words. loc: where you're local ("Los Angeles"). -> [{label, q}] one row a type, then the general one */
S.look=function(types,loc){
 const L=uniq((types||[]).map(squash).filter(Boolean)).slice(0,8), place=squash(loc||'').split(/\s*[,/;]\s*/)[0]||'';
 const rows=L.map(t=>({label:t,q:'"'+t+'" '+STAGEQ}));
 rows.push({label:'new series and films',q:'(film OR series) '+STAGEQ});
 if(place) rows.push({label:'filming near '+place,q:'"'+place+'" (filming OR "pre-production" OR casting) (film OR series)'});
 return rows;
};
S.lookUrl=function(q,where){
 const w=(S.WHERE.find(x=>x[0]===where)||S.WHERE[0])[2];
 const query=where==='backstage'?q.replace(STAGEQ,'(casting OR auditions)'):q;
 return 'https://news.google.com/search?q='+encodeURIComponent(query+(w?' site:'+w:'')+' when:30d')+'&hl=en-US&gl=US&ceid=US:en';
};

/* ---------- where it stands ---------- */
/* conflicts you hold: [{brand, category, until:'YYYY-MM-DD'}] */
S.STATUS=[['spotted','Spotted'],['passed','Passed along'],['submitted','Submitted'],['room','In the room'],['booked','Booked'],['nothing','Nothing back'],['not','Not for me']];
S.statusWord=k=>(S.STATUS.find(s=>s[0]===k)||S.STATUS[0])[1];
/* the list for your manager: searchable, with links. Every word has to be in the row somewhere. */
S.rowText=x=>[x.card.project,x.card.role,(x.card.casting||[]).join(' '),x.card.type,x.card.network,S.statusWord(x.status),x.you_stage?S.yourStageWord(x.you_stage):'',x.note||'',(x.facts||[]).map(f=>f.t).join(' ')].join(' ').toLowerCase();
S.find=function(list,q){ const ws=String(q||'').toLowerCase().split(/\s+/).filter(Boolean); return ws.length?list.filter(x=>{ const t=S.rowText(x); return ws.every(w=>t.indexOf(w)>=0); }):list.slice(); };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const safeUrl=u=>/^https?:\/\//i.test(u||'')&&!S.PRIVATE.test(u)?u:'';
S.listText=function(list,me){
 me=me||{}; const L=['Spotted'+(me.name?' - '+me.name:''),new Date().toLocaleDateString(),''];
 list.forEach(x=>{ const c=x.card; L.push('- '+[c.project||'(no title)',c.role,(c.casting||[]).join(' & ')].filter(Boolean).join(' / ')+' ['+S.statusWord(x.status)+(x.you_stage?' · '+S.yourStageWord(x.you_stage).toLowerCase():'')+']');
  const f=(x.facts||[]).filter(f=>f.k==='office'||f.k==='roles').map(f=>f.t)[0]; if(f) L.push('  '+f);
  if(x.note) L.push('  '+x.note); const u=safeUrl(c.source); if(u) L.push('  '+u); });
 return L.join('\n');
};
S.listHtml=function(list,me){
 me=me||{}; const title='Spotted'+(me.name?' · '+me.name:'');
 const rows=list.map(x=>{ const c=x.card, u=safeUrl(c.source), f=(x.facts||[]).filter(f=>f.k!=='spotted').map(f=>'<li>'+esc(f.t)+'</li>').join('');
  return '<article data-t="'+esc(S.rowText(x))+'"><header><b>'+esc(c.project||'(no title)')+'</b>'+(c.role?' · '+esc(c.role):'')+'<span class="st">'+esc(S.statusWord(x.status))+'</span></header>'
   +'<p class="m">'+[c.casting&&c.casting.length?esc(c.casting.join(' & '))+' casting':'',esc(c.type||''),esc(c.network||''),x.you_stage?esc(S.yourStageWord(x.you_stage).toLowerCase()):'',x.at?'spotted '+esc(new Date(x.at).toLocaleDateString()):''].filter(Boolean).join(' · ')+'</p>'
   +(f?'<ul>'+f+'</ul>':'')+(x.note?'<p>'+esc(x.note)+'</p>':'')+(u?'<p><a href="'+esc(u)+'">'+esc(u.replace(/^https?:\/\//,'').slice(0,70))+'</a></p>':'')+'</article>'; }).join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'
  +':root{--bg:#f6f2ea;--ink:#1d1a15;--dim:#5f584b;--line:#d3cab8;--acc:#8a5a08}@media(prefers-color-scheme:dark){:root{--bg:#121110;--ink:#ece7dc;--dim:#a39c8e;--line:#2f2b26;--acc:#e9b25a}}'
  +'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:760px;margin:0 auto;padding:20px 16px 60px}h1{font-size:22px;margin:0 0 4px}.d{color:var(--dim);margin:0 0 14px}'
  +'input{width:100%;box-sizing:border-box;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit;margin-bottom:14px}'
  +'article{border-top:1px solid var(--line);padding:12px 0}header{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.st{margin-left:auto;font-size:13px;color:var(--acc)}.m{color:var(--dim);font-size:14px;margin:4px 0}ul{margin:6px 0;padding-left:18px;font-size:14px}a{color:var(--acc);word-break:break-all}'
  +'</style></head><body><main><h1>'+esc(title)+'</h1><p class="d">'+list.length+' spotted · '+esc(new Date().toLocaleDateString())+'</p><input id="q" placeholder="Find: an office, a show, a role, a status" aria-label="Find">'
  +rows+'</main><script>document.getElementById("q").addEventListener("input",function(e){var ws=e.target.value.toLowerCase().split(/\\s+/).filter(Boolean);document.querySelectorAll("article").forEach(function(a){var t=a.getAttribute("data-t");a.hidden=!ws.every(function(w){return t.indexOf(w)>=0;});});});<\/script></body></html>';
};
/* ---------- your call, more stories, what changed ---------- */
/* Where it is is yours to say. It reads "Not sure" until you pick; the story's words stay next to it. */
S.YOURSTAGE=[['','Not sure'],['development','In development'],['greenlit','Greenlit'],['prep','In prep'],['casting','Casting'],['filming','Filming'],['wrapped','Wrapped'],['stopped','Stopped']];
S.yourStageWord=k=>(S.YOURSTAGE.find(s=>s[0]===(k||''))||S.YOURSTAGE[0])[1];
/* the change log on one you've kept: plain lines, dated. k: status, stage, story, casting */
S.log=function(it,k,t,at){ (it.log=it.log||[]).push({at:at||Date.now(),k,t}); return it; };
/* looks like one already on your list? Same name, or one name inside the other. Only asked, never joined. */
S.sameAs=function(card,items){ const k=S.key(card&&card.project); if(!k||k.length<3) return [];
 return (items||[]).filter(x=>{ const j=S.key(x.card&&x.card.project); if(!j) return false; if(j===k) return true; const a=j.length<k.length?j:k, b=a===j?k:j; return a.length>=5&&b.indexOf(a)>=0; }); };
const stageLine=st=>{ if(!st) return ''; const by=k=>st.claims.filter(c=>c.stage===k&&!c.not);
 return st.stages.length===1?'stage as written: '+by(st.stages[0])[0].word:st.stages.length>1?'stages as written: '+st.stages.map(k=>by(k)[0].word).join(' and '):''; };
/* you said yes, it's the same one: the new story goes under it. Blanks get filled, nothing you wrote is changed. */
S.addStory=function(it,card,raw,at){ at=at||Date.now(); const c=it.card, st=card.stage||null, L=[];
 (it.more=it.more||[]).push({at,raw:String(raw||'').slice(0,4000),source:card.source||'',stage:st});
 const nc=(card.casting||[]).filter(x=>!(c.casting||[]).some(y=>S.key(y)===S.key(x)));
 if(nc.length){ c.casting=(c.casting||[]).concat(nc); L.push(['casting','Casting named: '+nc.join(' & ')+'.']); }
 ['role','type','network','source','contact','where','union'].forEach(k=>{ if(!c[k]&&card[k]) c[k]=card[k]; });
 const sl=stageLine(st), cast=st&&st.casting.length;
 L.unshift(['story','Another story'+(st&&st.dated?' (dated '+S.dayWords(st.dated)+')':'')+(sl||cast?': '+[sl,cast?'casting as written':''].filter(Boolean).join(', '):'')+'.']);
 L.forEach(([k,t])=>S.log(it,k,t,at)); return L.map(x=>x[1]); };
/* what changed, for the reps sheet: your calls and new stories, never your status taps or notes */
S.news=function(items){ const out=[]; (items||[]).forEach(it=>(it.log||[]).forEach(e=>{ if(/^(stage|story|casting)$/.test(e.k)) out.push({id:it.id,project:(it.card&&it.card.project)||'(no title)',at:e.at,k:e.k,t:e.t}); })); return out.sort((a,b)=>a.at-b.at); };

g.Spotted=S;
if(typeof module!=='undefined') module.exports=S;
})(typeof window!=='undefined'?window:globalThis);
