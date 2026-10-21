/* ===== SIDES =====
   The fuel. Everything else reads from this: ACTOR OS, MEMORIZER, STORY STUDIO, PAPER TRAIL,
   and Writer's Blockage when it opens a PDF.
   Handles plain sides (CHARACTER on its own line, or CHARACTER: line), Fountain, and Final Draft
   files through A.fromFdx. Checked against a made-up script in five forms and a real feature .fdx
   and real sides: shared/test_reader.js. */
(function(g){
const A={};

const STAGE=/^\s*[\(\[].*[\)\]]\s*$/;                    // (beat) / [door slams]
const SLUG=/^\s*(\d+[A-Z]?\.?\s+)?(INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|INT|EXT|EST|I\/E)(?:[\.\s]|\s*:\s*\S)/i;  // INT. KITCHEN - DAY, 12 INT./EXT. CAR, INT: DAY. City jailhouse (colon form)
const PAGE=/^\s*\d+[A-Z]?\.?\s*$|^\s*\(?\s*(CONTINUED|CONT'?D|MORE)\s*\)?\s*:?\s*(\(\d+\))?\s*$|^\s*\d+\s*\/\s*\d+\s*$|^\s*Sides by Breakdown Services/i;
const MORE=/^\s*\(\s*MORE\s*\)\s*$/i;
/* a sides watermark comes through pasted text as bits: "E417-E417-", "4:15 PM - 55120 - Mar 3, 2026" */
const MARK=/(E\d{3}-){2,}|\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{3,}|\b\d{4,6}\s*-\s*[A-Z][a-z]{2}\s+\d{1,2},\s*\d{4}/;
const PAREN=/^\s*\(.*\)\s*$/;
const NAMEC=/^\s*(\p{Lu}[\p{Lu}\p{M}0-9 .'’#&\-\/]{1,40}|Q|A)\s*:\s*(.+)$/u;     // BO: line (and Q: / A: in an interview)
const NAMEL=/^\s*(\p{Lu}[\p{Lu}\p{M}0-9 .'’#&\-\/]{1,40})((\s*\([^)]*\))*)\s*\^?\s*$/u;  // and ANNA/BO/CY, all three at once // BO  /  BO (CONT'D)  /  COP #2
/* camera and editing words are never a person: "LOW ANGLE", "POV DECKHAND:", "FLASHBACK:", "LATER" */
const SHOT=/^(((EXTREME |LOW |HIGH |REVERSE |WIDE |TIGHT )?(ANGLE|CLOSE[ -]?UP|CLOSE( ON)?|SHOT|WIDE|TWO SHOT|INSERT|ECU|ECS|MCU|OTS)|(.* )?POV( .*)?|BACK TO( SCENE| PRESENT)?|(END )?FLASH ?BACK|FLASH|(END )?(MONTAGE|SERIES OF SHOTS|INTERCUT|DREAM|SEQUENCE)|INTERCUT .*|SUPER|SUPERIMPOSE|TITLE( CARD)?|CHYRON|CARD|LATER|MOMENTS LATER|SAME|CONTINUOUS|OVER BLACK|BLACK|BLACKOUT|ON SCREEN|ON TV|ESTABLISHING|AERIAL|TRACKING|OVERHEAD|SLOW MOTION|FREEZE FRAME|SPLIT SCREEN|THE END|END|START|BEGIN|SILENCE|BEAT|PRE-?LAP|VOICES)\b.*)$/;
/* A name never ends like a sentence. Without this, shouted dialogue such as
   "NOW." or "NO." right under a name was read as a second name and the
   speech was lost. */
/* McCARTHY, MacLEOD: a name in caps with the Mc or Mac left as written is still a name */
const BYLINE=/^(?:(?:an?\s+)?(?:original\s+)?(?:screenplay|teleplay|story|script|pilot)?\s*(?:written\s+)?by\b|written\s+by\b|created\s+by\b)/i;
const MC=s=>String(s).replace(/\bMc(?=[A-Z])/g,'MC').replace(/\bMac(?=[A-Z]{2})/g,'MAC');
function isName(t){ t=MC(String(t).replace(/^@/,'')); const n=cleanName(t); return NAMEL.test(t) && !/#\s*\d{3,}/.test(t) && t===t.toUpperCase() && !/[.!?,…]$/.test(t) && !SHOT.test(n) && !SLUG.test(t); }
function cleanName(n){
  return String(n||'').replace(/^@/,'').replace(/\s*\([^)]*\)\s*/g,'').replace(/[\s^:]+$/,'').trim().toUpperCase();
}
/* Fountain (and what Final Draft files become here): title page, notes, boneyard,
   sections, scene numbers, forced elements. Plain sides pass through unchanged. */
function fountainPrep(text){
  let t=String(text||'').replace(/\r/g,'');
  const isF=/^\s*Title\s*:/i.test(t)||/^\s*[.@!>][^.\s]/m.test(t)||/\s#[\w.\-]+#\s*$/m.test(t);
  t=t.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\[\[[\s\S]*?\]\]/g,'');
  if(/^\s*(Title|Credit|Authors?|Source|Draft date|Contact|Notes|Copyright)\s*:/i.test(t)){ const i=t.search(/\n\s*\n/); t=i>=0?t.slice(i):''; }
  return {isF, lines:t.split('\n').map(l=>{
    if(/^\s*#+\s/.test(l)||/^\s*=\s/.test(l)) return '';                 // # Act One / = synopsis
    l=l.replace(/\s+#[\w.\-]+#\s*$/,'');                                 // INT. BAR - NIGHT #12#
    if(isF) l=l.replace(/(\*{1,3}|_)(?=\S)([^*_\n]*?\S)\1/g,'$2');       // *bold* _underline_
    return l; })};
}
/* Text pasted with the page layout kept (pdftotext -layout, some PDF viewers): the columns are still there
   as spaces, and the watermark sits in its own bits far to the right. Drop the bits, then read each line by
   its column, the way the PDF reader does: names at one indent, speech at another, action at the margin. */
const keepBit=x=>x.replace(/[^A-Za-z0-9]/g,'').length>2||/^[A-Z]{1,2}[.!?]$/.test(x)||/^\(.*\)$/.test(x);
function wideGap(l){ return /\S {3,}\S/.test(l)?l.trim().split(/ {3,}/).filter(keepBit).join(' '):l; }
function unlayout(raw){
  const rows=raw.map(l=>{ const ss=[]; const re=/\S+(?: {1,2}\S+)*/g; let m; while((m=re.exec(l))) if(keepBit(m[0])) ss.push({c:m.index,t:m[0]}); return ss.length?{c:ss[0].c,t:ss.map(x=>x.t).join(' ')}:null; });
  const nb=rows.filter(Boolean); if(nb.length<8) return null;
  if(nb.filter(r=>r.c>=8).length/nb.length<0.5) return null;
  const mode=a=>{ const h={}; a.forEach(c=>h[c]=(h[c]||0)+1); let b=null; for(const k in h) if(b===null||h[k]>h[b]) b=k; return b===null?null:+b; };
  const actC=mode(nb.filter(r=>r.t.length>40&&/[a-z]{3}/.test(r.t)).map(r=>r.c)); if(actC===null) return null;
  const cueC=mode(nb.filter(r=>r.c>actC+10&&isName(r.t)).map(r=>r.c)); if(cueC===null) return null;
  // the speech column: where the line under a name starts
  const after=[]; rows.forEach((r,i)=>{ if(r&&Math.abs(r.c-cueC)<=4&&isName(r.t)){ for(let j=i+1;j<rows.length&&j<i+12;j++) if(rows[j]&&/[a-z]/.test(rows[j].t)){ after.push(rows[j].c); break; } } });
  const dlgC=mode(after.filter(c=>c>actC+4&&c<cueC)); if(dlgC===null) return null;
  const words=t=>/[a-z]{3}|[A-Z]{3}/.test(t);
  const out=[]; let inSpeech=false;
  rows.forEach(r=>{ if(!r) return; const t=r.t;
    if(MARK.test(t)||(PAGE.test(t)&&!MORE.test(t))||/^Role:\s/i.test(t)) return;
    if(r.c>dlgC+4&&r.c<cueC+25&&isName(t)){ out.push('',t); inSpeech=true; return; }
    if(MORE.test(t)){ out.push(t,''); inSpeech=false; return; }
    if(inSpeech&&(Math.abs(r.c-dlgC)<=4||(/^\(/.test(t)&&r.c>dlgC&&r.c<cueC))){ out.push(t); return; }
    if(inSpeech&&!words(t)) return;                 // a watermark bit between speech lines
    if(r.c>cueC+25&&!words(t)) return;
    out.push('',t,''); inSpeech=false; });
  return out;
}
const DIRECTION=l=>/^\s*[!>]/.test(l)&&!/^\s*>.*<\s*$/.test(l)?l.replace(/^\s*[!>]\s*/,''):null;

/* Interviews, speeches and subtitles, read as sides without changing a word.
   - Subtitles (SRT, WebVTT): the cue numbers, the timings and the WEBVTT header go; a VTT voice tag
     (<v Dana Pell>) is the speaker. Subtitles with no names: everything is one speaker, SPEAKER.
   - Interview transcripts: a name the way people write it ("Dana Pell: Thanks for having me.") is a speaker
     when that name starts two or more lines. A label that only shows once ("Location: Atlanta") stays as is.
     A transcript's name-and-time line ("Dana Pell  0:02", then the words) works too.
   Only the names are touched (put in capitals, the way sides write them). The words are the words. */
const TIMING=/^\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/;
const NOTLABEL=/^(note|notes|time|date|location|place|subject|source|update|editor'?s note|photo|credit|warning|transcript|summary|q&a|re|fw|fwd|from|to|cc|sent|title|tags?|category|link|url|duration|runtime|episode|season|part|chapter|scene|act)$/i;
const STAMP=/^\s*[\[(]?\s*(\d{1,2}:)?\d{1,2}:\d{2}(\.\d+)?\s*[\])]?\s*/;
A.transcript=function(text){
  let t=String(text||'').replace(/\r/g,'');
  const L0=t.split('\n');
  // subtitles
  if(/^﻿?\s*WEBVTT/.test(t)||L0.filter(l=>TIMING.test(l)).length>=2){
    const out=[]; let named=false, skip=false;
    L0.forEach((l,i)=>{ const x=l.replace(/^﻿/,'');
      if(/^\s*WEBVTT/.test(x)){ skip=true; return; }
      if(!x.trim()){ skip=false; out.push(''); return; }
      if(skip) return;
      if(/^\s*(NOTE|STYLE|REGION)\b/.test(x)){ skip=true; return; }
      if(TIMING.test(x)){ out.push(''); return; }
      if(/^\s*\d+\s*$/.test(x)&&L0[i+1]&&TIMING.test(L0[i+1])) return;     // the cue number
      const v=x.match(/^\s*<v(?:\.[^ >]+)?\s+([^>]+)>(.*)$/);
      let words=(v?v[2]:x).replace(/<\/?(?:v|c|i|b|u|lang|ruby|rt)(?:[.\s][^>]*)?>/g,'').replace(/<\d{1,2}:\d{2}[^>]*>/g,'').trim();
      if(!words) return;
      if(v){ named=true; out.push(cleanName(v[1])+': '+words); return; }
      out.push(words); });
    // join a cue's lines; one cue, one line
    const cues=[]; let cur=[]; out.forEach(l=>{ if(!l){ if(cur.length) cues.push(cur.join(' ')); cur=[]; } else cur.push(l); }); if(cur.length) cues.push(cur.join(' '));
    const anyName=cues.some(c=>NAMEC.test(c));
    return {kind:'subtitles',text:cues.map(c=>NAMEC.test(c)?c:(anyName||named?c:'SPEAKER: '+c)).join('\n\n')+'\n'};
  }
  // interview transcripts: Title Case names (and Q / A) before a colon, two or more times
  const LAB=/^\s*([A-Z][a-z'’.\-]+(?:\s+(?:[A-Z][a-z'’.\-]+|[A-Z]\.|de|van|von|del|la|O'[A-Z][a-z]+|Mc[A-Z][a-z]+)){0,3}|Q|A|Host|Interviewer|Moderator|Speaker\s*\d+)\s*(?:\(\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s*\))?\s*:\s+(\S.*)$/;
  const HEAD=/^\s*([A-Z][a-z'’.\-]+(?:\s+[A-Z][a-z'’.\-]+){0,3}|Speaker\s*\d+)\s+[\[(]?(?:\d{1,2}:)?\d{1,2}:\d{2}[\])]?\s*$/;
  const n={}, hd={}; let heads=0; L0.forEach((l,i)=>{ const x=l.replace(STAMP,''); const m=x.match(LAB); if(m&&!NOTLABEL.test(m[1])) n[m[1]]=(n[m[1]]||0)+1; const h=x.match(HEAD); if(h&&!NOTLABEL.test(h[1])&&L0[i+1]&&L0[i+1].trim()){ hd[h[1]]=1; heads++; } });
  // a name-and-time line is a transcript's own way of naming the speaker: two of them is enough
  const names=Object.keys(n).filter(k=>n[k]>=2).concat(heads>=2?Object.keys(hd):[]);
  if(!names.length||(names.reduce((a,k)=>a+(n[k]||0),0)<3&&heads<2)) return {kind:'',text:t};
  const out=[]; let ok=false;
  for(let i=0;i<L0.length;i++){ const x=L0[i].replace(STAMP,'');
    const m=x.match(LAB); if(m&&names.includes(m[1])){ out.push('',cleanName(m[1])+': '+m[2].trim(),''); ok=true; continue; }
    const h=x.match(HEAD); if(h&&names.includes(h[1])){ let j=i+1, buf=[]; while(j<L0.length&&L0[j].trim()&&!L0[j].match(HEAD)&&!(L0[j].match(LAB)&&names.includes(L0[j].match(LAB)[1]))){ buf.push(L0[j].trim()); j++; } if(buf.length){ out.push('',cleanName(h[1])+': '+buf.join(' '),''); ok=true; i=j-1; continue; } }
    out.push(L0[i]); }
  return ok?{kind:'interview',text:out.join('\n').replace(/\n{3,}/g,'\n\n')}:{kind:'',text:t};
};
A.parse=function(text){
  const tr=A.transcript(text); if(tr.kind) text=tr.text;
  const fp=fountainPrep(text);
  const raw=(!fp.isF&&unlayout(fp.lines))||fp.lines.map(wideGap);
  // a lone 1-3 character bit with blank lines round it is watermark, not script ("PM", "E", "eb")
  const lone=i=>!(raw[i-1]||'').trim() && !(raw[i+1]||'').trim();
  const bit=t=>{ t=t.trim(); return !!t && t.replace(/[^A-Za-z0-9]/g,'').length<=4 && !/[a-z]{3}/.test(t) && !/^[\(\[]/.test(t); };
  const junk=raw.map((ln,i)=>{ const t=ln.trim(); if(!t) return false; if(MARK.test(t)) return true;
    if(PAGE.test(t)&&!MORE.test(t)) return lone(i)||!/^\s*\d+[A-Z]?\.\s*$/.test(t);   // "12." under a name is a line; alone it is a page number; a bare "3" is a scene number
    if(/^\*+$/.test(t)||/^[A-Z0-9]$/.test(t)) return true;                                // revision star; a lone watermark letter
    if(bit(t)&&!/^[A-Z][a-z]/.test(t)&&lone(i)) return true;
    // a run of three or more bits with a digit or a dash among them: a watermark broken into pieces
    let a=i,b=i; while(a>0&&bit(raw[a-1])) a--; while(b<raw.length-1&&bit(raw[b+1])) b++;
    return bit(t) && b-a>=2 && raw.slice(a,b+1).some(x=>/[\d,\-]/.test(x)); });
  /* Text that came out of a PDF keeps the page's line breaks: speech wraps at about 35 characters, action at
     about 60. When no blank line separates a speech from the action after it, the width tells them apart. */
  const nbl=raw.filter((l,i)=>l.trim()&&!junk[i]).map(l=>l.trim().length);
  const wrapped=nbl.length>=12 && nbl.filter(n=>n<=64).length>=nbl.length*0.9 && Math.max(...nbl)<=78 && !fp.isF;
  const SPEECH_W=46;
  const beats=[]; let cur=null, more=null;
  const blank=i=>!raw[i]||!raw[i].trim()||junk[i];
  let sawSlug=false;
  for(let i=0;i<raw.length;i++){
    const ln=raw[i], t=ln.replace(/\f/g,'').trim();
    if(junk[i]){ continue; }
    if(!t){ cur=null; continue; }
    if(MORE.test(t)){ more=beats.length&&!beats[beats.length-1].action?beats[beats.length-1]:null; cur=null; continue; }
    // after (MORE), a new page starts with its running header ("LOW TIDE - Blue Rev. 10/12/26"): not the script
    if(more&&!isName(t.replace(/^\f/,''))&&(/^\f/.test(ln)||/\d/.test(t))){ continue; }
    if(SLUG.test(t)||/^\.[A-Za-z0-9]/.test(t)){ sawSlug=true; cur=null; more=null; continue; }
    const dir=DIRECTION(t);
    if(dir!==null){ if(dir) beats.push({who:'',text:dir,action:true}); cur=null; more=null; continue; }
    if(STAGE.test(t)&&!cur){ beats.push({who:'',text:t.replace(/^[\(\[]|[\)\]]$/g,'').trim(),action:true}); continue; }

    let m=MC(t).match(NAMEC);
    if(m && !SHOT.test(cleanName(m[1])) && !SLUG.test(m[2])){ beats.push({who:cleanName(m[1]),text:m[2].trim()}); cur=beats[beats.length-1]; more=null; continue; }

    // a bare capitalised line followed by dialogue is a speaker cue
    const forced=/^@/.test(t), tt=t.replace(/^@/,'');
    m=MC(tt).match(NAMEL);
    let nx=i+1; while(nx<raw.length&&junk[nx]) nx++;
    /* a title page: SCRIPT TITLE / Written by ..., SALT ROAD / by Dana Pell. A byline is not a line of dialogue */
    if(m && !sawSlug && raw[nx] && BYLINE.test(raw[nx].trim()) && !/[.!?]$/.test(raw[nx].trim())){ cur=null; more=null; continue; }
    if(m && (forced||isName(tt)) && raw[nx] && raw[nx].trim() && !isName(raw[nx].trim()) && DIRECTION(raw[nx].trim())===null){
      const who=cleanName(m[1]);
      let j=nx, buf=[];
      let inParen=false;
      while(j<raw.length){
        if(junk[j]){ j++; continue; }
        const nt=raw[j].trim();
        if(!nt||isName(nt)||SLUG.test(nt)||MORE.test(nt)||/^@/.test(nt)||DIRECTION(nt)!==null)break;
        if(wrapped&&buf.length&&nt.length>SPEECH_W&&!/^\(/.test(nt))break;     // wider than a speech line: the action after it
        if(inParen){ if(/\)\s*$/.test(nt))inParen=false; j++; continue; }
        if(/^\(/.test(nt)&&!/\)\s*$/.test(nt)){ inParen=true; j++; continue; }   // (on his phone,
        if(!PAREN.test(nt))buf.push(nt);
        j++;
      }
      if(buf.length){
        // the same speech carried over a page break: (MORE) ... NAME (CONT'D)
        if(more&&more.who===who){ more.text=(more.text+' '+buf.join(' ')).trim(); }
        else beats.push({who:who,text:buf.join(' ')});
        more=null; i=j-1; cur=null; continue; }
    }
    if(PAREN.test(t)) continue;                  // (softly) - direction, not dialogue
    more=null;
    if(cur){ cur.text=(cur.text+' '+t).trim(); }
    else beats.push({who:'',text:t,action:true});
  }
  return beats.filter(b=>b.text);
};

/* A Final Draft file (.fdx) as plain script text. Its own element types decide what each line is,
   so nothing is guessed: a heading Final Draft calls a heading is one (forced with "."), an action
   line that looks like a name is forced as action ("!"), a name that doesn't look like one is forced ("@"). */
A.fromFdx=function(xml){
  const ent=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(+n));
  const txtOf=b=>ent([...b.matchAll(/<Text[^>]*>([\s\S]*?)<\/Text>/gi)].map(x=>x[1].replace(/<[^>]+>/g,'')).join('')).replace(/\s+/g,' ').trim();
  const body=(String(xml).match(/<Content>([\s\S]*?)<\/Content>/i)||[])[1]||'';
  const out=[]; const P=/<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/gi; let m;
  while((m=P.exec(body))){
    const type=(m[1].match(/Type="([^"]*)"/i)||[])[1]||'Action', txt=txtOf(m[2]);
    if(!txt) continue;
    if(/Scene Heading/i.test(type)){ const h=txt.toUpperCase(); out.push('',SLUG.test(h)?h:'.'+h,''); }
    else if(/Character/i.test(type)){ const n=txt.toUpperCase(); out.push('',isName(n)?n:'@'+n); }
    else if(/Dialogue|Parenthetical|Lyric/i.test(type)) out.push(txt);
    else if(/Transition/i.test(type)) out.push('','> '+txt,'');
    else { const looks=isName(txt)||(NAMEC.test(txt)&&!SHOT.test(cleanName(txt.split(':')[0])))||PAGE.test(txt)||SLUG.test(txt); out.push('',(looks||/^[.@!>]/.test(txt)?'!':'')+txt,''); }
  }
  const tm=String(xml).match(/<TitlePage[\s\S]*?<Text[^>]*>([^<]+)<\/Text>/i);
  return ((tm?'Title: '+ent(tm[1]).trim()+'\n\n':'')+out.join('\n')).replace(/\n{3,}/g,'\n\n').trim()+'\n';
};
A.isName=isName;
A.SLUG=SLUG;

A.speakers=function(beats){
  const c={};
  beats.forEach(b=>{ if(b.who) c[b.who]=(c[b.who]||0)+1; });
  return Object.keys(c).sort((a,b)=>c[b]-c[a]).map(n=>({name:n,lines:c[n]}));
};

/* Pair each of your lines with the cue that precedes it. That pairing is what
   the prompter and the scene partner both run on. */
A.script=function(beats,me){
  const out=[];
  for(let i=0;i<beats.length;i++){
    const b=beats[i];
    if(b.action) continue;
    const mine = b.who===me;
    let cue='';
    for(let j=i-1;j>=0;j--){ if(!beats[j].action && beats[j].who!==me){ cue=beats[j].text; break; } }
    out.push({who:b.who,text:b.text,mine:mine,cue:mine?cue:''});
  }
  return out;
};

A.stats=function(beats,me){
  const mine=beats.filter(b=>b.who===me&&!b.action);
  const words=mine.reduce((n,b)=>n+b.text.split(/\s+/).length,0);
  return {lines:mine.length,words:words,
          estSeconds:Math.round(words/2.6)};   // ~2.6 words/sec spoken
};
g.ActorSides=A;
})(window);
