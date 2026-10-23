/* THEACTORPAGE INTAKE: drop anything once, on the home page.
   Pure reading and sorting. The page (index.html) does the putting.
   Uses the site's readers, never its own: actor-os/sides.js (speeches, Final Draft), actor-os/pdf.js
   (PDF text, crossed-out lines), hub/request.js (self-tape requests).

   What a thing is, by what's in it, not by its name:
   - a self-tape request or rep email (a tape due date, Eco Cast, audition instructions, few speeches)
   - sides (a few scenes; Breakdown Services markings, a Role: header, START / END, crossed-out lines)
   - a script or draft (a title page, or many scenes and speeches)
   - footage (video and sound files)
   - anything else: said so, with what was seen. Nothing guessed. */
(function(g){
const X={};
const S=()=>g.ActorSides, P=()=>g.ActorPDF, R=()=>g.HubReq;

X.ext=name=>String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]||'';
X.MEDIA=['mov','mp4','m4v','mxf','mts','m2ts','avi','mkv','webm','3gp','braw','r3d','wav','aif','aiff','mp3','m4a','aac','flac'];
X.IMAGE=['jpg','jpeg','png','heic','heif','webp','gif','tif','tiff'];
/* what kind of file, before reading it */
X.fileKind=function(f){
 const e=X.ext(f&&f.name), t=String(f&&f.type||'');
 if(e==='fdx') return 'fdx';
 if(e==='fountain'||e==='spmd') return 'fountain';
 if(e==='pdf'||t==='application/pdf') return 'pdf';
 if(e==='docx') return 'docx';
 if(X.MEDIA.includes(e)||/^(video|audio)\//.test(t)) return 'media';
 if(X.IMAGE.includes(e)||/^image\//.test(t)) return 'image';
 if(['txt','text','eml','md','rtf','srt','vtt',''].includes(e)||/^text\//.test(t)) return 'text';   // subtitles read as text: the sides reader takes them
 return 'other';
};

/* A whole folder (your Downloads, say): which files are worth reading, newest first.
   Junk from browsers and systems is skipped. Video and audio stay where they are (a page can't keep them).
   Pictures are left alone unless the name says headshot: a folder pick never fills your headshots with screenshots.
   -> {take:[files to read now], later:[the rest of the likely ones], junk, media, images, other, total} */
X.JUNK=/^(\.ds_store|thumbs\.db|desktop\.ini|\.localized|icon\r?)$|^~\$|^\._|\.(crdownload|part|partial|download|tmp|temp|lock|opdownload)$/i;
X.HEADSHOT=/head\s*shot|headshot|\bhs[\s_-]|portrait|theatrical|commercial[\s_-]?(look|shot)/i;
X.folder=function(files,limit){
 limit=limit||40; const r={take:[],later:[],junk:0,media:0,images:0,other:0,total:0}; const keep=[];
 for(const f of files||[]){ r.total++;
  const path=String(f.webkitRelativePath||f.name||''), parts=path.split('/'), name=parts[parts.length-1]||'';
  if(X.JUNK.test(name)||parts.slice(0,-1).some(d=>/^\.|^__macosx$|^node_modules$/i.test(d))||(f.size===0)){ r.junk++; continue; }
  const k=X.fileKind(f), e=X.ext(name);
  if(k==='media'){ r.media++; continue; }
  if(k==='image'){ if(X.HEADSHOT.test(name)) keep.push(f); else r.images++; continue; }
  if(['fdx','fountain','pdf','docx'].includes(k)||(k==='text'&&['txt','text','eml','rtf','srt','vtt'].includes(e))) keep.push(f); else r.other++; }
 keep.sort((a,b)=>(b.lastModified||0)-(a.lastModified||0));
 r.take=keep.slice(0,limit); r.later=keep.slice(limit); return r;
};

/* Word file to text (word/document.xml out of the zip). From Paper Trail's reader. */
X.docxText=async function(buf){
 const u=new Uint8Array(buf), v=new DataView(u.buffer,u.byteOffset,u.byteLength);
 let e=-1; for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--){ if(v.getUint32(i,true)===0x06054b50){ e=i; break; } }
 if(e<0) throw new Error('not a Word file');
 let n=v.getUint16(e+10,true), off=v.getUint32(e+16,true), xml=null;
 for(let k=0;k<n;k++){
  if(v.getUint32(off,true)!==0x02014b50) break;
  const method=v.getUint16(off+10,true), csize=v.getUint32(off+20,true), nl=v.getUint16(off+28,true), el=v.getUint16(off+30,true), cl=v.getUint16(off+32,true), lho=v.getUint32(off+42,true);
  const name=new TextDecoder().decode(u.slice(off+46,off+46+nl));
  if(name==='word/document.xml'){
   const lnl=v.getUint16(lho+26,true), lel=v.getUint16(lho+28,true), start=lho+30+lnl+lel, data=u.slice(start,start+csize);
   if(method===0) xml=new TextDecoder().decode(data);
   else { const ds=new DecompressionStream('deflate-raw'); const out=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer(); xml=new TextDecoder().decode(out); }
   break;
  }
  off+=46+nl+el+cl;
 }
 if(!xml) throw new Error('no document inside that Word file');
 return xml.replace(/<w:tab\/>/g,'\t').replace(/<\/w:p>/g,'\n').replace(/<w:br[^>]*\/>/g,'\n').replace(/<[^>]+>/g,'')
  .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\n{3,}/g,'\n\n');
};

/* the script side of a text: speeches, speakers, scene headings */
X.scriptOf=function(text){
 const beats=S().parse(text), sp=beats.filter(b=>!b.action), speakers=S().speakers(beats);
 const scenes=String(text||'').split('\n').filter(l=>S().SLUG.test(l.trim())||/^\.[A-Za-z0-9]/.test(l.trim())).length;
 return {beats, speeches:sp.length, speakers, scenes};
};

/* What is this text? pdf: {pages, sides:true when the page carries sides markings, struck} */
X.what=function(text,pdf,rows){
 const t=String(text||'');
 const rr=rows||X.rowsOfText(t), rz=X.looksLikeResume(rr);
 if(rz.yes){ const P=X.resumeRead(rr); return {kind:'resume', why:rz.why.concat([P.credits.length+' credits']), profile:P}; }
 const sc=X.scriptOf(t);
 let req=null; try{ req=R()?R().read(t):null; }catch(e){ req=null; }
 const reqSigns=req?[req.due&&'a tape due date',req.confirmOnEcoCast&&'Eco Cast',/Audition (Instructions|Deadline)|self[- ]?tape/i.test(t)&&'self-tape instructions',req.role&&'the role ('+req.role+')'].filter(Boolean):[];
 // a request carries few speeches; sides pasted under a request are still sides, read on their own
 if(reqSigns.length>=2&&sc.speeches<6) return {kind:'request', why:reqSigns, req, script:sc};
 if(sc.speeches>=1&&sc.speakers.length>=1){
  const titlePage=/^\s*(Title\s*:|.*\n\s*(written by|screenplay by|story by)\b)/im.test(t.slice(0,1500));
  const sidesMarks=(pdf&&pdf.sides)||/Sides by Breakdown Services|^\s*Role:\s/im.test(t);
  const long=sc.scenes>=8||sc.speeches>=80||(pdf&&pdf.pages>15);
  // an interview, a speech or subtitles: sides to run, however long
  const tk=(g.ActorSides&&g.ActorSides.transcript)?g.ActorSides.transcript(t).kind:'';
  if(tk) return {kind:'sides', why:[tk==='subtitles'?'subtitles':'an interview transcript',sc.speeches+' speeches',sc.speakers.length+' speaking part'+(sc.speakers.length===1?'':'s')], script:sc, req:reqSigns.length?req:null};
  if(!sidesMarks&&(titlePage||long)) return {kind:'script', why:[titlePage?'a title page':'',sc.scenes+' scene'+(sc.scenes===1?'':'s'),sc.speeches+' speeches'].filter(Boolean), script:sc, req:reqSigns.length?req:null};
  return {kind:'sides', why:[sidesMarks?'sides markings':'',sc.scenes+' scene'+(sc.scenes===1?'':'s'),sc.speeches+' speeches',sc.speakers.length+' speaking part'+(sc.speakers.length===1?'':'s')].filter(Boolean), script:sc, req:reqSigns.length?req:null};
 }
 if(reqSigns.length) return {kind:'request', why:reqSigns, req, script:sc};
 return {kind:'unknown', why:[t.trim()?'no scene, no speeches, no tape due date':'no text in it'], script:sc};
};

/* ---------- a résumé ----------
   rows: [{cells:[{x,text}]}] from the PDF reader (columns kept), or from text (a tab or 2+ spaces is a column). */
X.rowsOfText=function(text){ return String(text||'').replace(/\r/g,'').split('\n').map(l=>{ const cells=[]; const re=/[^\t]+?(?=\t| {2,}|$)/g; let m; const L=l.replace(/\s+$/,'');
 while((m=re.exec(L))){ const t=m[0].trim(); if(t) cells.push({x:m.index*6,text:t}); if(re.lastIndex===m.index) re.lastIndex++; } return {cells}; }).filter(r=>r.cells.length); };
const SECTION=/^(TELEVISION|TV|FILMS?|FEATURES?|FEATURE FILMS?|SHORTS?|SHORT FILMS?|NEW MEDIA|WEB(?: SERIES)?|THEAT(?:RE|ER)|STAGE|COMMERCIALS?|VOICE ?OVER|VO|MUSIC VIDEOS?|INDUSTRIALS?|VIDEO GAMES?|TRAINING|EDUCATION|SPECIAL SKILLS|SKILLS|ACCENTS?(?: ?\/ ?DIALECTS)?|DIALECTS|LANGUAGES|AWARDS)$/i;
const LABEL=/^(Special Skills|Skills|Accents ?\/ ?Dialects|Accents|Dialects|Languages|Training|Education)\s*:?\s*/i;
const SECT_OF=h=>{ h=h.toUpperCase(); if(/^(TELEVISION|TV)$/.test(h)) return 'TV'; if(/FILM|FEATURE|SHORT/.test(h)) return 'Film'; if(/THEAT|STAGE/.test(h)) return 'Theatre'; if(/COMMERCIAL/.test(h)) return 'Commercial'; if(/NEW MEDIA|WEB/.test(h)) return 'New Media';
 if(/VOICE|^VO$/.test(h)) return 'Voiceover'; if(/MUSIC/.test(h)) return 'Music Video'; if(/INDUSTRIAL/.test(h)) return 'Industrial'; if(/GAME/.test(h)) return 'Video Game'; if(/TRAINING|EDUCATION/.test(h)) return 'training';
 if(/SKILL/.test(h)) return 'skills'; if(/ACCENT|DIALECT/.test(h)) return 'accents'; if(/LANGUAGE/.test(h)) return 'languages'; return 'other'; };
const ROLE_SIZE=/^(Series Regular|Recurring(?: Guest Star| Co-?Star)?|Guest Star|Co-?Star|Lead|Strong Supporting|Supporting|Featured|Principal|Day Player|Under-?5|Under-?Five|Starring|Ensemble|Understudy|Swing|Narrator|Host|Voice)\b/i;
X.resumeRead=function(rows){
 const P={name:'',union:'',phone:'',email:'',rep:'',repPhone:'',height:'',weight:'',hair:'',eyes:'',locations:'',credits:[],training:[],skills:[],accents:[],languages:[]};
 const txt=c=>c.map(x=>x.text).join(' ');
 const first=rows.findIndex(r=>r.cells.length===1&&SECTION.test(r.cells[0].text.replace(/[:\s]+$/,''))||LABEL.test(txt(r.cells))&&r.cells[0].x<200);
 const head=rows.slice(0,first<0?Math.min(rows.length,6):first);
 head.forEach((r,i)=>{ const line=txt(r.cells); const parts=line.split(/\s+[·•|]\s+|\s{3,}/).map(x=>x.trim()).filter(Boolean);
  if(i===0&&!P.name&&/^[A-Za-z][A-Za-z .'\-]{2,40}$/.test(line)&&line.split(/\s+/).length<=5){ P.name=line.replace(/\b([A-Z])([A-Z']+)\b/g,(m,a,b)=>a+b.toLowerCase()).replace(/\bMc([a-z])/g,(m,a)=>'Mc'+a.toUpperCase()); return; }
  parts.forEach(pt=>{
   let m=pt.match(/\b(SAG-?AFTRA|SAG-?E|SAG|AFTRA|AEA|EQUITY|EMC|NON-?UNION)\b/i); if(m&&!P.union) P.union=m[1].toUpperCase().replace(/^SAGAFTRA$/,'SAG-AFTRA');
   m=pt.match(/[\w.+-]+@[\w-]+\.[\w.]+/); if(m&&!P.email) P.email=m[0];
   const ph=(pt.match(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/)||[])[0];
   if(/(Management|Mgmt|Agency|Talent|Artists|Entertainment|Agent|Manager|Representation)\b/i.test(pt)){ P.rep=pt.replace(/\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/,'').replace(/[,:·\s]+$/,'').trim(); if(ph) P.repPhone=ph; }
   else if(ph){ if(P.rep&&!P.repPhone&&parts.some(x=>/(Management|Mgmt|Agency|Talent|Artists)/i.test(x))) P.repPhone=ph; else if(!P.phone) P.phone=ph; }
   m=pt.match(/(\d)\s*['’′]\s*(\d{1,2})\s*["”″]?/); if(m&&!P.height&&/height|^\s*\d\s*['’]/i.test(pt)) P.height=m[1]+"'"+m[2]+'"';
   m=pt.match(/(\d{2,3})\s*(lbs?|pounds)\b/i); if(m&&!P.weight) P.weight=m[1]+' lbs';
   m=pt.match(/Hair\s*:?\s*([A-Za-z\/ ]{3,20})/i); if(m&&!P.hair) P.hair=m[1].trim();
   m=pt.match(/Eyes\s*:?\s*([A-Za-z\/ ]{3,20})/i); if(m&&!P.eyes) P.eyes=m[1].trim();
   if(/\blocal\b|based|\bhire\b/i.test(pt)&&!P.locations) P.locations=pt;
  });
 });
 let sect='', listKey='', listX=null;
 const addList=(k,v)=>String(v||'').split(/\s*[,;]\s*/).map(x=>x.replace(/\.$/,'').trim()).filter(Boolean).forEach(x=>{ if(!P[k].includes(x)) P[k].push(x); });
 rows.slice(first<0?rows.length:first).forEach(r=>{
  const line=txt(r.cells), h=r.cells.length===1?r.cells[0].text.replace(/[:\s]+$/,''):'';
  if(h&&SECTION.test(h)){ sect=SECT_OF(h); listKey=['skills','accents','languages'].includes(sect)?sect:''; listX=null; return; }
  const lm=line.match(LABEL);
  if(lm&&r.cells[0].x<200){ const k=SECT_OF(lm[1]); const rest=line.slice(lm[0].length);
   if(k==='training'){ sect='training'; if(rest) P.training.push(rest); return; }
   listKey=k; listX=r.cells.length>1?r.cells[r.cells.length-1].x:null; addList(k,rest); return; }
  if(listKey&&(r.cells.length===1)&&(listX===null||Math.abs(r.cells[0].x-listX)<40||!['TV','Film','Theatre'].includes(sect))){ addList(listKey,line); return; }
  listKey='';
  if(sect==='training'){ P.training.push(r.cells.map(c=>c.text).join(' · ')); return; }
  if(['skills','accents','languages'].includes(sect)){ addList(sect,line); return; }
  if(sect&&sect!=='other'&&r.cells.length>=2){ const c=r.cells.map(x=>x.text); const two=c[1]||''; const cr={section:sect,title:c[0],role:'',character:'',by:c.slice(2).join(' · ')};
   const rs=two.match(ROLE_SIZE); if(rs){ cr.role=two; } else cr.character=two;
   P.credits.push(cr); }
 });
 return P;
};
X.looksLikeResume=function(rows){
 const lines=rows.map(r=>r.cells.map(c=>c.text).join(' '));
 const sections=lines.filter(l=>SECTION.test(l.replace(/[:\s]+$/,''))).length+lines.filter(l=>LABEL.test(l)).length;
 const head=lines.slice(0,8).join(' · ');
 const signs=[/\b(SAG-?AFTRA|AEA|EQUITY|NON-?UNION)\b/i.test(head)&&'a union',/height|\d\s*['’]\s*\d{1,2}\s*["”]/i.test(head)&&'height',/(Management|Mgmt|Agency|Talent|Artists)\b/i.test(head)&&'a rep',/@|\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/.test(head)&&'contact'].filter(Boolean);
 const three=rows.filter(r=>r.cells.length>=3).length;
 return {yes:sections>=2&&(signs.length>=1)&&(three>=3||sections>=3), why:signs.concat([sections+' sections'])};
};

/* Your part in these sides, from the role in a request: "HAL BRODY" is BRODY, "DET. ANNA VOSS" is ANNA. */
const TITLES=new Set(['MR','MRS','MS','DR','DET','DETECTIVE','OFFICER','SGT','SERGEANT','CAPTAIN','CAPT','AGENT','NURSE','DOCTOR','FATHER','SISTER','AUNT','UNCLE','YOUNG','OLD','LT','LIEUTENANT','CHIEF','JUDGE','PROFESSOR','PROF']);
const toks=s=>String(s||'').toUpperCase().replace(/\([^)]*\)/g,' ').split(/[^A-Z0-9#']+/).filter(w=>w&&!TITLES.has(w.replace(/\.$/,'')));
X.matchRole=function(role,speakers){
 const rt=toks(role); if(!rt.length) return '';
 const hits=(speakers||[]).filter(s=>{ const st=toks(s.name); return st.length&&(st.every(w=>rt.includes(w))||rt.every(w=>st.includes(w))); });
 hits.sort((a,b)=>b.lines-a.lines); return hits.length?hits[0].name:'';
};
/* a request names its sides ("ANNA VOSS.pdf"); match a dropped file to it */
X.namesFile=function(req,fileName){ const k=x=>String(x||'').toUpperCase().replace(/\.[A-Z0-9]+$/,'').replace(/[^A-Z0-9]+/g,''); return !!(req&&(req.sides||[]).some(s=>k(s)&&k(s)===k(fileName))); };

/* What each thing opens up, so nothing is typed twice */
X.unlocks=function(kind,o){
 o=o||{}; const me=o.me?' as '+o.me:'';
 if(kind==='sides') return [
  ['Actor OS','read it with a scene partner'+me+', tape it, slate it','actor-os/?open=1'],
  ['Memorizer','learn the lines'+me,'memorizer/?open=1'],
  ['Breakdown','the scene broken down, the real pages','breakdown/?open=1'],
  ['Character Bank','the voices in it','cps/']];
 if(kind==='script') return [
  ['Story Studio','scenes, shot list, shoot day, call sheet, credits','film/'],
  ['Paper Trail','this draft kept, compared with the others','papertrail/'],
  ['Actor OS','any scene, read with you'+me,'actor-os/?open=1'],
  ['Memorizer','your lines'+me,'memorizer/?open=1']];
 if(kind==='request') return [
  ['Project Hub','the audition, the tape due in your time, their directions as a checklist','hub/'],
  ['Actor OS','your name on the slate'+(o.name?' ('+o.name+')':''),'actor-os/']];
 if(kind==='resume') return [
  ['Project Hub','your profile and credits, for packages and submissions','hub/'],
  ['Virtual Résumé','the top of your résumé, skills, training'+(o.photo?', headshot':''),'resume/'],
  ['Slate Maker','name, height, rep on the slate','slate/'],
  ['Actor OS','your name on every take','actor-os/']];
 if(kind==='image') return [['Project Hub','your headshots, the main one first','hub/'],['Virtual Résumé','the headshot at the top','resume/'],['Slate Maker','the headshot on your slate','slate/']];
 if(kind==='media') return [['Story Studio','footage check against the takes you logged, the cut, ADR','film/']];
 return [];
};
g.Intake=X;
if(typeof module!=='undefined') module.exports=X;
})(typeof window!=='undefined'?window:globalThis);
