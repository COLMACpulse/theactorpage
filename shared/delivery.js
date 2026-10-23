/* THEACTORPAGE DELIVERY: how the office wants the tape, read from their own words.
   One file or separate files, the slate first, last, on its own or not at all, a size cap, a length cap.
   Each thing it reads comes with the sentence it read it from, so you can see why. Words it doesn't
   find are left alone: nothing is guessed.
   Delivery.read(text) -> {files:'one'|'separate'|null, slate:'first'|'last'|'separate'|'none'|null,
     mode:'SEPARATE'|'SLATE_FIRST'|'SLATE_LAST'|null, maxMB, maxSecs, why:[{what, quote}]}
   Delivery.words(d) -> one plain line, or '' */
(function(g){
const D={};
const sentences=t=>String(t||'').replace(/\r/g,'').split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9"(])/).map(s=>s.trim()).filter(Boolean);
const find=(S,re)=>{ for(const s of S){ const m=s.match(re); if(m) return {s,m}; } return null; };
const ONE=/\b(?:(?:one|single|1)\s+(?:continuous\s+)?(?:video\s+)?(?:file|clip|video|upload)\b(?!\s+(?:per|for each|each))|(?:combine|join|put|edit)\s+(?:all\s+)?(?:(?:of\s+)?(?:your|the)\s+)?(?:scenes?|takes?|clips?)\s+(?:together|into\s+(?:one|a single))|all\s+(?:scenes|takes|clips)\s+(?:in|into|as)\s+(?:one|a single))/i;
const SEP=/\b(?:separate(?:ly)?|individual(?:ly)?)\s+(?:files?|clips?|videos?|uploads?|takes?)|(?:one|a)\s+(?:file|clip|video)\s+(?:per|for each)\s+(?:scene|take)|each\s+(?:scene|take|clip)\s+(?:as|in|on)\s+(?:its own|a separate|separate)|(?:do\s+not|don.t|please\s+don.t)\s+(?:combine|join|edit\s+(?:the\s+)?(?:scenes|takes)\s+together)|upload\s+each\s+(?:scene|take)/i;
const S_SEP=/\bslate\s+(?:as\s+)?(?:a\s+)?(?:separate|its own)\s+(?:file|clip|video|upload)|\bseparate\s+slate\b|\bslate\s+separately\b/i;
const S_NONE=/\b(?:no\s+slate|(?:do\s+not|don.t|please\s+don.t)\s+(?:include\s+a\s+)?slate|slate\s+(?:is\s+)?not\s+(?:needed|required))\b/i;
const S_LAST=/\bslate\s+(?:at|on)\s+the\s+(?:end|tail)\b|\b(?:end|finish|close)\s+(?:with|on)\s+(?:a|your|the)\s+slate\b|\bslate\s+(?:last|after)\b|\bslate\s+at\s+the\s+end\b/i;
const S_FIRST=/\bslate\s+(?:at|on)\s+the\s+(?:beginning|start|front|top|head)\b|\b(?:begin|start|open)\s+(?:with|on)\s+(?:a|your|the)\s+slate\b|\bslate\s+first\b|\bslate\s+before\b/i;
const SIZE=/(?:under|below|less\s+than|no\s+(?:larger|bigger|more)\s+than|not\s+(?:to\s+)?exceed(?:ing)?|max(?:imum)?(?:\s+(?:file\s+)?size)?(?:\s+(?:of|is))?|limit(?:ed)?\s+(?:of|to)|up\s+to|smaller\s+than)\s*:?\s*(\d+(?:\.\d+)?)\s*(MB|GB|megabytes?|gigabytes?|M\b|G\b)|(\d+(?:\.\d+)?)\s*(MB|GB)\s+(?:max(?:imum)?|limit|or\s+(?:less|smaller|under))/i;
const LEN=/(?:no\s+(?:longer|more)\s+than|under|less\s+than|not\s+(?:to\s+)?exceed(?:ing)?|max(?:imum)?(?:\s+(?:length|of|runtime|running time))?|limit(?:ed)?\s+(?:of|to)|up\s+to|keep\s+(?:it|them|each|your\s+\w+)\s+(?:to|under))\s*:?\s*(\d+(?::\d\d)?|one|two|three|four|five|ten)\s*(seconds?|secs?|minutes?|mins?|min\b)?|(\d+|one|two|three|four|five|ten)[\s-]+(minute|second)s?\s+(?:max(?:imum)?|limit)/i;
const NUM={one:1,two:2,three:3,four:4,five:5,ten:10};
const n=v=>NUM[String(v).toLowerCase()]!=null?NUM[String(v).toLowerCase()]:parseFloat(v);
D.read=function(text){
 const S=sentences(text), out={files:null,slate:null,mode:null,maxMB:null,maxSecs:null,why:[]}, add=(what,hit)=>out.why.push({what,quote:hit.s.length>220?hit.s.slice(0,219)+'…':hit.s});
 let h;
 if((h=find(S,SEP))){ out.files='separate'; add('Separate files',h); }
 else if((h=find(S,ONE))){ out.files='one'; add('One file',h); }
 if((h=find(S,S_NONE))){ out.slate='none'; add('No slate',h); }
 else if((h=find(S,S_SEP))){ out.slate='separate'; add('The slate as its own file',h); }
 else if((h=find(S,S_LAST))){ out.slate='last'; add('Slate at the end',h); }
 else if((h=find(S,S_FIRST))){ out.slate='first'; add('Slate at the start',h); }
 if((h=find(S,SIZE))){ const v=h.m[1]||h.m[3], u=(h.m[2]||h.m[4]||'').toUpperCase(); const mb=n(v)*(/^G/.test(u)?1024:1); if(mb>0){ out.maxMB=Math.round(mb*10)/10; add('Under '+(/^G/.test(u)?n(v)+' GB':out.maxMB+' MB'),h); } }
 for(const st of S){ const m=st.match(LEN); if(!m) continue; const raw=m[1]||m[3], unit=(m[2]||m[4]||'').toLowerCase();
  let secs=0; if(/:/.test(raw)){ const [x,y]=raw.split(':'); secs=(+x)*60+(+y); } else if(unit){ secs=n(raw)*(/^m/.test(unit)?60:1); }
  if(secs>=5&&secs<=3600){ out.maxSecs=secs; add('No longer than '+Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'),{s:st}); break; } }
 if(out.files==='separate'||out.slate==='separate') out.mode='SEPARATE';
 else if(out.files==='one') out.mode=out.slate==='last'?'SLATE_LAST':'SLATE_FIRST';
 else if(out.slate==='last') out.mode='SLATE_LAST';
 return out;
};
/* where it's going: each site's own limit, from its own help page, with the day it was checked. Recheck these.
   The office's own words (Delivery.read) always win over a site's limit. */
D.SITES={
 ACTORS_ACCESS:{name:'Actors Access (Eco Cast)',maxMB:100,files:5,words:'Up to 100 MB a clip, 5 clips',checked:'2026-10-22',src:'https://casting.breakdownexpress.com/help/ecocast/Responding_to_a_self-taped_invitation.htm'},
 CASTING_NETWORKS:{name:'Casting Networks',maxMB:300,words:'Up to 300 MB a video: MP4, MOV or M4V',checked:'2026-10-22',src:'https://support.castingnetworks.com/en/articles/11240769'},
 BACKSTAGE:{name:'Backstage',maxMB:2048,files:1,words:'Up to 2 GB, one tape per request',checked:'2026-10-22',src:'https://help.backstage.com/en/articles/12633191'},
 REPRESENTATION:{name:'Email to your rep',maxMB:0,emailMB:25,words:'Gmail attaches up to 25 MB; bigger goes as a link',checked:'',src:''}
};
D.capFor=k=>(D.SITES[k]&&D.SITES[k].maxMB)||0;
/* voice over: where the file goes, what each site takes. maxMB 0: no limit stated on their page (none guessed). mp3: MP3 only. */
D.VO_SITES={
 REPRESENTATION:{name:'Your agent, by email',maxMB:25,words:'Gmail attaches up to 25 MB; bigger goes as a link',checked:'',src:''},
 ACTORS_ACCESS:{name:'Actors Access',maxMB:0,kinds:['mp3','wav'],words:'Takes MP3, M4A, WAV or WMA. No size limit stated on their page',checked:'2026-10-23',src:'https://actorsaccess.freshdesk.com/support/solutions/articles/17000056255'},
 CASTING_NETWORKS:{name:'Casting Networks',maxMB:50,kinds:['mp3'],words:'Up to 50 MB: AAC, MP3 or OGG (no WAV)',checked:'2026-10-23',src:'https://support.castingnetworks.com/hc/en-us/articles/7802199566733'},
 VOICE123:{name:'Voice123',maxMB:100,kinds:['mp3'],words:'MP3 only: 44.1 kHz, 96 to 128 kbps, mono, under 100 MB',checked:'2026-10-23',src:'https://support.voice123.com/hc/en-us/articles/207612656'},
 VOICES:{name:'Voices.com',maxMB:10,kinds:['mp3'],words:'Up to 10 MB an audition; MP3 128 kbps, 44.1 kHz to play in their player',checked:'2026-10-23',src:'https://www.voices.com/help/knowledge/faq/how-large-can-my-files-be'}
};
/* a made file against where it's going: [] when it fits, else plain lines */
D.voCheck=function(k,fmt,bytes){ const s=D.VO_SITES[k], out=[]; if(!s) return out;
 if(s.kinds&&s.kinds.indexOf(fmt)<0) out.push(s.name+' doesn\'t take '+String(fmt).toUpperCase()+'. Make it as MP3.');
 if(s.maxMB&&bytes>s.maxMB*1048576) out.push('It\'s '+(bytes/1048576).toFixed(1)+' MB; '+s.name+' takes up to '+s.maxMB+' MB.');
 return out; };
D.MODEWORDS={SEPARATE:'Separate files',SLATE_FIRST:'One file, slate first',SLATE_LAST:'One file, slate last'};
D.words=function(d){
 if(!d) return ''; const L=[];
 if(d.mode) L.push(D.MODEWORDS[d.mode]); else if(d.files) L.push(d.files==='one'?'One file':'Separate files');
 if(d.slate==='none') L.push('no slate'); else if(d.slate==='first'&&d.mode!=='SLATE_FIRST') L.push('slate at the start');
 if(d.maxMB) L.push('under '+(d.maxMB>=1024&&d.maxMB%1024===0?d.maxMB/1024+' GB':d.maxMB+' MB'));
 if(d.maxSecs) L.push('no longer than '+Math.floor(d.maxSecs/60)+':'+String(d.maxSecs%60).padStart(2,'0'));
 if(!L.length) return '';
 const s=L.join(', '); return s.charAt(0).toUpperCase()+s.slice(1)+'.';
};
if(typeof module!=='undefined') module.exports=D;
g.Delivery=D;
})(typeof window!=='undefined'?window:globalThis);
