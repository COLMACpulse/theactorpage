/* WRITER'S BLOCKAGE VOICE: the words you say, turned into screenplay elements.
   Pure: no page, no microphone. Runs in the browser (window.WBVoice) and in Node.

   Rules, carried from Screenwriter v0.2-v0.4 and fixed where they broke:
   - Commands are matched with punctuation and capitals ignored. Phone speech engines add
     "Undo." and "Scratch that." with a full stop; those are still commands.
   - A name only starts dialogue when you say "says" (or asks, whispers...). "Rennie walks
     to the bench" is action.
   - The mic stops on "stop listening", never on "stop". "Stop." is a line someone says.
   - Nothing is cleaned but um and uh. "Had had" stays "had had". What you said is kept.
   - It formats. It never writes a word you didn't say.
*/
(function(g){
const V={};

const PRONOUNS=new Set(['he','she','they','i','you','we','it','someone','everyone','everybody','nobody','somebody','this','that','there','who']);
const SPEECH=['says','said','asks','asked','answers','replies','yells','shouts','whispers','mutters','calls','screams','sings','reads','continues'];
const SAYLIKE=new Set(['says','said','asks','asked','answers','replies','continues']);   // no parenthetical: the line itself says it
const TIMES=['moments later','continuous','later','day','night','morning','afternoon','evening','dawn','dusk','sunset','sunrise','same time','magic hour'];
const EXT=[[/^(voice over|voiceover|v o|vo)$/,'(V.O.)'],[/^(off screen|offscreen|off camera|o s|os)$/,'(O.S.)'],[/^(continued|cont d|contd|cont)$/,"(CONT'D)"]];

/* commands are compared as plain words */
V.plain=s=>String(s||'').toLowerCase().replace(/[‘’]/g,"'").replace(/[^a-z0-9' /]+/g,' ').replace(/\s+/g,' ').trim();
const trimP=s=>String(s||'').replace(/^[\s,.;:!?\-—–"']+|[\s,.;:!?\-—–"']+$/g,'');
/* "Rennie says, I left a note." -> keep the line's own punctuation, drop the comma after "says" */
const after=(s,re)=>{ const m=String(s).match(re); return m?String(s).slice(m[0].length).replace(/^[\s,:;.\-—]+/,''):''; };

/* spoken punctuation, filler sounds, a capital at the start. Nothing else. */
V.content=function(raw){
 let t=' '+String(raw||'').trim()+' ';
 t=t.replace(/\s+\b(um+|uh+|erm+)\b[,.]?(?=\s)/gi,' ');
 const P=[[/\s+(question mark)\b/gi,'?'],[/\s+(exclamation (point|mark))\b/gi,'!'],[/\s+(full stop|period)\s*$/gi,'.'],
  [/\s+(comma)\b/gi,','],[/\s+(semicolon|semi colon)\b/gi,';'],[/\s+(colon)\b/gi,':'],[/\s+(ellipsis|dot dot dot)\b/gi,'...'],[/\s+(dash)\b/gi,' --']];
 P.forEach(([re,x])=>{ t=t.replace(re,x); });
 t=t.replace(/\s+([,.;:!?])/g,'$1').replace(/([.!?])\s+([a-z])/g,(m,p,c)=>p+' '+c.toUpperCase()).replace(/\s+/g,' ').trim();
 t=t.replace(/\bi\b/g,'I').replace(/\bi'(m|ll|ve|d)\b/g,(m,x)=>"I'"+x);
 return t?t.charAt(0).toUpperCase()+t.slice(1):'';
};

/* a cue: "mom voice over" -> MOM (V.O.); a name you've used before keeps its spelling */
V.cue=function(spoken,names){
 let w=V.plain(spoken).split(' ').filter(Boolean), ext='';
 for(let n=3;n>=1&&!ext;n--){ if(w.length>n){ const tail=w.slice(-n).join(' '); const e=EXT.find(([re])=>re.test(tail)); if(e){ ext=e[1]; w=w.slice(0,-n); } } }
 let name=w.join(' ').toUpperCase().replace(/\bMRS\b/,'MRS.').replace(/\bMR\b/,'MR.').replace(/\bDR\b/,'DR.');
 const known=(names||[]).find(k=>V.plain(k)===V.plain(name));
 if(known) name=known;
 return (name+(ext?' '+ext:'')).trim();
};

/* a heading: "exterior county road bus shelter, night" -> EXT. COUNTY ROAD BUS SHELTER - NIGHT */
V.heading=function(prefix,rest){
 const P={'interior':'INT.','int':'INT.','exterior':'EXT.','ext':'EXT.','interior exterior':'INT./EXT.','int ext':'INT./EXT.','exterior interior':'EXT./INT.','ext int':'EXT./INT.','i e':'I/E.','i/e':'I/E.'};
 let r=' '+String(rest||'').replace(/[—–]/g,' dash ')+' ';
 r=r.replace(/\s+(dash|hyphen)\s+/gi,' | ').replace(/\s*[,;]\s*/g,' | ').replace(/\s+-\s+/g,' | ').replace(/[.!?]+\s*$/,'').replace(/[.!?]+\s/g,' | ');
 let parts=r.split('|').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 if(parts.length===1){   // no pause said: split the time of day off the end
  const p=V.plain(parts[0]); const t=TIMES.find(x=>p.endsWith(' '+x));
  if(t) parts=[parts[0].slice(0,parts[0].length-t.length).trim(),t];
 }
 return ((P[V.plain(prefix)]||'INT.')+' '+parts.join(' - ')).toUpperCase().replace(/\s+/g,' ').trim();
};
const TRANS=[[/^(smash cut to|smash cut)$/,'SMASH CUT TO:'],[/^(match cut to|match cut)$/,'MATCH CUT TO:'],[/^(jump cut to|jump cut)$/,'JUMP CUT TO:'],[/^cut to$/,'CUT TO:'],
 [/^dissolve to$/,'DISSOLVE TO:'],[/^fade to black$/,'FADE TO BLACK.'],[/^fade out$/,'FADE OUT.'],[/^fade in$/,'FADE IN:'],[/^intercut( with)?$/,'INTERCUT WITH:'],[/^back to scene$/,'BACK TO SCENE']];
const TYPES={'action':'Action','dialogue':'Dialogue','a parenthetical':'Parenthetical','parenthetical':'Parenthetical','a scene heading':'Scene Heading','scene heading':'Scene Heading','a heading':'Scene Heading','heading':'Scene Heading','transition':'Transition','a transition':'Transition'};

/* one utterance -> what to do.
   ctx: {mode:'Action'|'Dialogue'|'Scene Heading', speaker:'CAL'|'', names:[...known cues], last:{type,text}|null} */
V.parse=function(raw,ctx){
 ctx=ctx||{}; const names=ctx.names||[];
 const s=String(raw||'').trim(), p=V.plain(s);
 if(!p) return {kind:'none'};
 // listening
 if(/^(stop|pause) (listening|the mic|recording)$|^mic off$|^that'?s (it|all) for now$/.test(p)) return {kind:'stop'};
 // fixing
 if(/^undo( that)?$/.test(p)) return {kind:'undo'};
 if(/^(scratch|delete|strike|lose) that( line)?$/.test(p)) return {kind:'scratch'};
 if(/^(try (that|it) again|try again|another take|new take)$/.test(p)) return {kind:'alt'};
 if(/^new (line|paragraph)$/.test(p)) return {kind:'newline'};
 let m=p.match(/^(?:put|make) (?:that|it) (?:in |into |an? )?(action|dialogue|a parenthetical|parenthetical|a scene heading|scene heading|a heading|heading|transition|a transition)$/);
 if(m) return {kind:'retype',type:TYPES[m[1]]};
 m=s.match(/^\s*(?:change|replace)\s+(.+?)\s+(?:to|with)\s+(.+?)[\s.!?]*$/i);
 if(m) return {kind:'change',from:trimP(m[1]),to:trimP(m[2]),fallback:V.parse.dictate(s,ctx)};
 m=p.match(/^(?:make that|no that'?s|no that was|no it'?s) (.{1,40})$/);
 if(m&&m[1].split(' ').length<=4&&!TYPES[m[1]]){ const name=V.cue(m[1],names); if(names.some(k=>V.plain(k).split(' (')[0]===V.plain(name).split(' (')[0])||/\(/.test(name)) return {kind:'recue',name:name}; }
 // ideas go to the Ideas pane, not the script
 m=s.match(/^\s*(idea|note to self|note)\b[\s,:.\-]+(.+)$/i);
 if(m) return {kind:'idea',text:V.content(m[2])};
 // transitions: the whole utterance
 const tr=TRANS.find(([re])=>re.test(p)); if(tr) return {kind:'add',type:'Transition',text:tr[1],mode:'Scene Heading'};
 m=s.match(/^\s*transition\b[\s,:.\-]+(.+)$/i); if(m) return {kind:'add',type:'Transition',text:trimP(m[1]).toUpperCase().replace(/([^:.])$/,'$1:'),mode:'Scene Heading'};
 // headings
 if(/^(new scene|next scene|scene|scene heading|slug ?line)$/.test(p)) return {kind:'mode',mode:'Scene Heading'};
 m=p.match(/^(?:(?:new |next )?scene(?: heading)?|slug ?line)?\s*(interior exterior|exterior interior|int ext|ext int|i e|interior|exterior|int|ext)\b/);
 const said=!!p.match(/^(?:(?:new |next )?scene(?: heading)?|slug ?line)\s/);
 if(m&&(said||/^(interior|exterior)\b/.test(p)||ctx.mode==='Scene Heading')){
  const rest=s.replace(/^\s*(?:(?:new |next )?scene(?: heading)?|slug ?line)?[\s,:.]*/i,'').replace(new RegExp('^\\s*'+m[1].replace(/ /g,'[\\s/.\\-]*')+'[\\s.,:]*','i'),'');
  if(rest.trim()) return {kind:'add',type:'Scene Heading',text:V.heading(m[1],rest),mode:'Action'};
 }
 // cues
 m=s.match(/^\s*(?:character|cue)\b[\s,:.\-]+(.+)$/i);
 if(m) return {kind:'cue',name:V.cue(trimP(m[1]),names),mode:'Dialogue'};
 m=s.match(/^\s*(?:parenthetical|paren)\b[\s,:.\-]+(.+)$/i);
 if(m) return {kind:'add',type:'Parenthetical',text:'('+trimP(m[1]).toLowerCase()+')',mode:'Dialogue'};
 if(/^beat$/.test(p)&&ctx.mode==='Dialogue') return {kind:'add',type:'Parenthetical',text:'(beat)',mode:'Dialogue'};
 m=s.match(/^\s*action\b[\s,:.\-]+(.+)$/i); if(m) return {kind:'add',type:'Action',text:V.content(m[1]),mode:'Action'};
 if(p==='action') return {kind:'mode',mode:'Action'};
 m=s.match(/^\s*dialogue\b[\s,:.\-]+(.+)$/i); if(m) return V.parse.line(V.content(m[1]),ctx);
 if(p==='dialogue') return {kind:'mode',mode:'Dialogue'};
 // NAME says ...
 const sv=new RegExp('^\\s*([A-Za-z][\\w.\'\\u2019 ]{0,40}?)\\s+('+SPEECH.join('|')+')\\b','i');
 m=s.match(sv);
 if(m){ const who=V.plain(m[1]), first=who.split(' ')[0];
  if(who.split(' ').length<=5&&!PRONOUNS.has(first)&&!/^(the|a|an)$/.test(who)){
   const verb=m[2].toLowerCase(), line=after(s,sv);
   return {kind:'speech',name:V.cue(m[1],names),paren:SAYLIKE.has(verb)?'':'('+verb+')',text:line?V.content(line):'',mode:'Dialogue'};
  } }
 // after "new scene" (or a transition), plain words are the heading
 if(ctx.mode==='Scene Heading') return {kind:'add',type:'Scene Heading',text:V.heading('',s),mode:'Action'};
 return V.parse.dictate(s,ctx);
};
/* plain dictation into whatever is going on */
V.parse.dictate=function(s,ctx){
 const text=V.content(s); if(!text) return {kind:'none'};
 if(ctx.mode==='Dialogue'){
  // a line that starts with someone's name and a doing word is action: "Rennie walks to the bench"
  const w=V.plain(s).split(' '), names=(ctx.names||[]).map(n=>V.plain(n).split(' (')[0]);
  for(const n of names){ const k=n.split(' ').length; if(w.slice(0,k).join(' ')===n&&w[k]&&/^[a-z]+s$/.test(w[k])&&!SPEECH.includes(w[k])&&!/,/.test(s.split(/\s+/).slice(0,k).join(' '))) return {kind:'add',type:'Action',text:text,mode:'Action',why:'starts with '+n.toUpperCase()+' doing something'}; }
  return V.parse.line(text,ctx);
 }
 return {kind:'text',type:'Action',text:text};
};
V.parse.line=function(text,ctx){
 if(!ctx.speaker) return {kind:'text',type:'Action',text:text,why:'nobody is speaking'};
 return {kind:'text',type:'Dialogue',text:text};
};

/* the cheat card, so the app and the tests agree on what can be said */
V.SAY=[
 ['Exterior bus shelter, night','EXT. BUS SHELTER - NIGHT'],
 ['Interior Cal\'s pickup dash moving dash continuous','INT. CAL\'S PICKUP - MOVING - CONTINUOUS'],
 ['Action, rain on a tin roof','an action line'],
 ['Rennie says I left a note','RENNIE, then the line'],
 ['Cal whispers get in the truck','CAL (whispers) get in the truck'],
 ['Mom voice over says call me','MOM (V.O.)'],
 ['Character Cal','a cue; what you say next is his'],
 ['Parenthetical, not looking at him','(not looking at him)'],
 ['Cut to','CUT TO:'],
 ['Scratch that / Undo','takes the last thing back'],
 ['Change ticket to note','fixes a word in the last line'],
 ['Put that in action','the last line becomes action'],
 ['Make that Cal','the last speech was Cal\'s'],
 ['Try again','keeps this take, say it again'],
 ['New line','starts a new paragraph'],
 ['Idea, the ticket was Mom\'s','goes to Ideas, not the script'],
 ['Comma / period / question mark','punctuation, if your phone doesn\'t add it'],
 ['Stop listening','mic off']
];

if(typeof module!=='undefined') module.exports=V;
g.WBVoice=V;
})(typeof window!=='undefined'?window:globalThis);
