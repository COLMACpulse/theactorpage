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
 if(['txt','text','eml','md','rtf',''].includes(e)||/^text\//.test(t)) return 'text';
 return 'other';
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
X.what=function(text,pdf){
 const t=String(text||''), sc=X.scriptOf(t);
 let req=null; try{ req=R()?R().read(t):null; }catch(e){ req=null; }
 const reqSigns=req?[req.due&&'a tape due date',req.confirmOnEcoCast&&'Eco Cast',/Audition (Instructions|Deadline)|self[- ]?tape/i.test(t)&&'self-tape instructions',req.role&&'the role ('+req.role+')'].filter(Boolean):[];
 // a request carries few speeches; sides pasted under a request are still sides, read on their own
 if(reqSigns.length>=2&&sc.speeches<6) return {kind:'request', why:reqSigns, req, script:sc};
 if(sc.speeches>=1&&sc.speakers.length>=1){
  const titlePage=/^\s*(Title\s*:|.*\n\s*(written by|screenplay by|story by)\b)/im.test(t.slice(0,1500));
  const sidesMarks=(pdf&&pdf.sides)||/Sides by Breakdown Services|^\s*Role:\s/im.test(t);
  const long=sc.scenes>=8||sc.speeches>=80||(pdf&&pdf.pages>15);
  if(!sidesMarks&&(titlePage||long)) return {kind:'script', why:[titlePage?'a title page':'',sc.scenes+' scene'+(sc.scenes===1?'':'s'),sc.speeches+' speeches'].filter(Boolean), script:sc, req:reqSigns.length?req:null};
  return {kind:'sides', why:[sidesMarks?'sides markings':'',sc.scenes+' scene'+(sc.scenes===1?'':'s'),sc.speeches+' speeches',sc.speakers.length+' speaking part'+(sc.speakers.length===1?'':'s')].filter(Boolean), script:sc, req:reqSigns.length?req:null};
 }
 if(reqSigns.length) return {kind:'request', why:reqSigns, req, script:sc};
 return {kind:'unknown', why:[t.trim()?'no scene, no speeches, no tape due date':'no text in it'], script:sc};
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
  ['Actor OS','read it with a scene partner'+me+', tape it, slate it','actor-os/'],
  ['Memorizer','learn the lines'+me,'memorizer/'],
  ['Breakdown','the scene broken down, the real pages','breakdown/'],
  ['CPS','the voices in it','cps/']];
 if(kind==='script') return [
  ['Story Studio','scenes, shot list, shoot day, call sheet, credits','film/'],
  ['Paper Trail','this draft kept, compared with the others','papertrail/'],
  ['Actor OS','any scene, read with you'+me,'actor-os/'],
  ['Memorizer','your lines'+me,'memorizer/']];
 if(kind==='request') return [
  ['Project Hub','the audition, the tape due in your time, their directions as a checklist','hub/'],
  ['Actor OS','your name on the slate'+(o.name?' ('+o.name+')':''),'actor-os/']];
 if(kind==='media') return [['Story Studio','footage check against the takes you logged, the cut, ADR','film/']];
 return [];
};
g.Intake=X;
if(typeof module!=='undefined') module.exports=X;
})(typeof window!=='undefined'?window:globalThis);
