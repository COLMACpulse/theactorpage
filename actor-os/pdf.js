/* ===== PDF TEXT EXTRACTION =====
   No library. Browsers ship DecompressionStream, which is the only hard part of
   reading a PDF content stream.

   Screenplays are POSITIONAL: a character cue sits at ~3.7in from the left,
   dialogue at ~2.5in, action at ~1.5in. Keeping the x coordinate means the parse
   is more reliable from a PDF than from pasted text, not less.

   Scanned sides are images and contain no text. This says so rather than
   returning an empty result that looks like a parse failure. */
(function(g){
const A={};

async function inflate(bytes){
 for(const fmt of ['deflate','deflate-raw']){
  try{
   const ds=new DecompressionStream(fmt);
   const st=new Blob([bytes]).stream().pipeThrough(ds);
   return new Uint8Array(await new Response(st).arrayBuffer());
  }catch(e){}
 }
 return null;
}
const dec=new TextDecoder('latin1');

/* Build code -> character maps from every /ToUnicode CMap in the file. Modern
   PDFs subset their fonts, so a byte in a string is a glyph index, not a letter.
   Without this the text comes out as gibberish and no name is recognisable. */
function hexToStr(h){
 h=h.replace(/[^0-9a-fA-F]/g,'');
 let s='';
 for(let i=0;i+3<h.length||i+3===h.length;i+=4){
  const v=parseInt(h.substr(i,4),16);
  if(!isNaN(v))s+=String.fromCharCode(v);
 }
 return s;
}
function parseCMap(txt){
 const map={};
 let m;
 const single=/beginbfchar([\s\S]*?)endbfchar/g;
 while((m=single.exec(txt))){
  const pr=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g; let q;
  while((q=pr.exec(m[1]))) map[parseInt(q[1],16)]=hexToStr(q[2]);
 }
 const range=/beginbfrange([\s\S]*?)endbfrange/g;
 while((m=range.exec(txt))){
  const pr=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([\s\S]*?)\])/g; let q;
  while((q=pr.exec(m[1]))){
   const lo=parseInt(q[1],16), hi=parseInt(q[2],16);
   if(q[4]!==undefined){
    const base=parseInt(q[4],16);
    for(let c=lo;c<=hi&&c-lo<65536;c++) map[c]=String.fromCharCode(base+(c-lo));
   } else if(q[5]!==undefined){
    const arr=q[5].match(/<([0-9a-fA-F]+)>/g)||[];
    arr.forEach((a,i)=>{ map[lo+i]=hexToStr(a); });
   }
  }
 }
 return map;
}


function findStreams(buf){
 const s=dec.decode(buf), out=[];
 const re=/(?<![A-Za-z])stream(\r\n|\n|\r)/g; let m;
 while((m=re.exec(s))){
  const start=m.index+m[0].length;
  let end=s.indexOf('endstream',start);
  if(end<0)continue;
  // trim the EOL that precedes endstream
  let e=end; while(e>start && (s[e-1]==='\n'||s[e-1]==='\r')) e--;
  // Filter can be a chain: /Filter [ /ASCII85Decode /FlateDecode ]
  const dict=s.slice(Math.max(0,m.index-500), m.index);
  const fm=dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/);
  const filters=fm ? (fm[1].match(/\/(\w+)/g)||[]).map(x=>x.slice(1)) : [];
  out.push({start,end:e,filters});
  re.lastIndex=end;
 }
 return out;
}

/* ASCII85 - reportlab and many real-world PDFs chain this before Flate */
function a85(bytes){
 let s=dec.decode(bytes).replace(/\s+/g,'');
 if(s.startsWith('<~'))s=s.slice(2);
 const t=s.indexOf('~>'); if(t>=0)s=s.slice(0,t);
 const out=[]; let tup=0,n=0;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(c==='z'&&n===0){ out.push(0,0,0,0); continue; }
  const v=c.charCodeAt(0)-33;
  if(v<0||v>84)continue;
  tup=tup*85+v; n++;
  if(n===5){ out.push((tup>>>24)&255,(tup>>>16)&255,(tup>>>8)&255,tup&255); tup=0;n=0; }
 }
 if(n>0){
  for(let i=n;i<5;i++)tup=tup*85+84;
  const b=[(tup>>>24)&255,(tup>>>16)&255,(tup>>>8)&255,tup&255];
  for(let i=0;i<n-1;i++)out.push(b[i]);
 }
 return new Uint8Array(out);
}

/* pull text-showing operators with their positions.
   Tokenising properly rather than one big alternation - the group indices in a
   combined regex do not line up and Tm silently never fired. */
function readContent(txt){
 const items=[];
 let tx=0,ty=0,lead=14,stack=[],curFont='',tfs=1,tma=1;
 /* the graphics state: q / Q / cm move and scale everything drawn after them. A page laid out in tables
    (a résumé from a document tool) places each cell with cm and draws its text at 0,0, so without this
    every word lands in the corner. */
 let M=[1,0,0,1,0,0]; const MS=[];
 let TR=false;   // the text itself turned (Tm with rotation): a watermark, never the script
 const at=(x,y)=>({x:M[0]*x+M[2]*y+M[4], y:M[1]*x+M[3]*y+M[5], rot:TR||Math.abs(M[1])>0.01||Math.abs(M[2])>0.01});
 const TOK=/\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>|\[(?:[^\]\\]|\\.)*\]|-?[\d.]+|\/[^\s\/\[\]<>()]+|[A-Za-z*'"]+/g;
 let m;
 while((m=TOK.exec(txt))){
  const t=m[0];
  if(t[0]==='('||t[0]==='['||t[0]==='/'||t[0]==='<'||/^-?[\d.]+$/.test(t)){ stack.push(t); if(stack.length>12)stack.shift(); continue; }
  const n=k=>parseFloat(stack[stack.length-k]);
  switch(t){
   case 'BT': tx=0;ty=0; break;
   case 'q': MS.push(M.slice()); break;
   case 'Q': if(MS.length) M=MS.pop(); break;
   case 'cm': { const v=[6,5,4,3,2,1].map(k=>n(k)); if(v.every(isFinite)) M=[v[0]*M[0]+v[1]*M[2], v[0]*M[1]+v[1]*M[3], v[2]*M[0]+v[3]*M[2], v[2]*M[1]+v[3]*M[3], v[4]*M[0]+v[5]*M[2]+M[4], v[4]*M[1]+v[5]*M[3]+M[5]]; break; }
   case 'Tf': { const f=stack[stack.length-2]; if(f&&f[0]==='/')curFont=f.slice(1); const z=n(1); if(isFinite(z)&&z>0) tfs=z; break; }
   case 'Td': ty+=n(1); tx+=n(2); break;
   case 'TD': lead=-n(1); ty+=n(1); tx+=n(2); break;
   case 'Tm': ty=n(1); tx=n(2); TR=Math.abs(n(5))>0.01||Math.abs(n(4))>0.01; { const sc=Math.abs(n(6)); tma=isFinite(sc)&&sc>0?sc:1; } break;
   case 'ET': TR=false; break;
   case 'TL': lead=n(1); break;
   case 'T*': ty-=lead; break;
   case 'Tj': case '\'': case '"': {
     const a=stack[stack.length-1]||'';
     let v='';
     if(a[0]==='(') v=unesc(a.slice(1,-1));
     else if(a[0]==='<') v=hexStr(a);
     if(v){ const p=at(tx,ty); if(!p.rot) items.push({x:p.x,y:p.y,s:fixPunct(v),font:curFont}); }
     if(t!=='Tj')ty-=lead;
     break; }
   case 'TJ': {
     /* a big negative number in TJ moves the pen right: that's how some apps (Pages, Keynote, Word on a Mac)
        lay out tab stops. "VO:" then a jump to the words' column; a wrapped line starts with the jump alone.
        The jump moves where the words start, and a jump wider than a couple of letters starts a new cell.
        Letter widths aren't known here, so a letter counts as half the type size (near enough to keep columns). */
     const a=stack[stack.length-1]||'';
     if(a[0]==='['){
       const fs=tfs*tma; let cur='', curX=null, adv=0;
       const put=()=>{ if(cur){ const p=at(tx+curX,ty); if(!p.rot) items.push({x:p.x,y:p.y,s:fixPunct(cur),font:curFont}); } cur=''; curX=null; };
       const pr=/\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]*>|-?[\d.]+/g; let q;
       while((q=pr.exec(a.slice(1,-1)))){
         const v=q[0];
         if(v[0]==='('||v[0]==='<'){ const str=v[0]==='('?unesc(v.slice(1,-1)):hexStr(v); if(!str) continue;
           if(curX===null){ if(!str.trim()){ adv+=str.length*0.25*fs; continue; } curX=adv; }
           cur+=str; adv+=str.length*0.5*fs; }
         else { const k=parseFloat(v); if(!isFinite(k)) continue; const d=-k/1000*fs; adv+=d;
           if(k<-120&&cur){ if(d>1.5*fs) put(); else cur+=' '; } }
       }
       put();
     }
     break; }
  }
  stack.length=0;
 }
 return items;
}
/* a hex string holds 2-byte glyph codes for composite (Type0) fonts */
function hexStr(tok){
 const h=tok.replace(/[^0-9a-fA-F]/g,'');
 let out='';
 for(let i=0;i+1<h.length;i+=4){
  const v=parseInt(h.substr(i,4),16);
  if(!isNaN(v)) out+=String.fromCharCode(v);
 }
 return out;
}
/* Screenplay PDFs are routinely typeset in MacRoman-encoded Courier, where the
   curly quotes and dashes sit at byte values that latin1 reads as accented
   capitals. Left unmapped, every contraction comes out as "WeÕll".
   Only the punctuation is remapped - the letters are the same in both. */
const MACPUNCT={
 0xD0:'\u2013', 0xD1:'\u2014',            // en dash, em dash
 0xD2:'\u201c', 0xD3:'\u201d',            // curly double quotes
 0xD4:'\u2018', 0xD5:'\u2019',            // curly single quotes
 0xC9:'\u2026', 0xA5:'\u2022',            // ellipsis, bullet
 0xD6:'\u00f7', 0xC5:'\u2248',
 0x92:'\u2019', 0x91:'\u2018',            // windows-1252, same problem
 0x93:'\u201c', 0x94:'\u201d',
 0x96:'\u2013', 0x97:'\u2014', 0x85:'\u2026',
 0x03:' '                                 // stray control from a subset font
};
function fixPunct(t){
 let out='';
 for(const ch of t){
  const c=ch.charCodeAt(0);
  out += (MACPUNCT[c]!==undefined) ? MACPUNCT[c] : ch;
 }
 return out;
}
function unesc(s){
 return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (m,c)=>{
  if(c==='n')return '\n'; if(c==='r')return ''; if(c==='t')return ' ';
  if(c==='('||c===')'||c==='\\')return c;
  if(/^[0-7]+$/.test(c))return String.fromCharCode(parseInt(c,8));
  return '';
 });
}

/* group runs into visual lines, then use the left margin to label each one */
/* Which way does this page run? PDFs normally count y up from the bottom, so the
   top line has the biggest y. Some generators (the Breakdown Services sides this
   was first built on) flip the page and count down from the top. Content streams
   are written top to bottom either way, so the order the text was drawn in tells
   us which: if y mostly falls as the stream goes on, the page counts up. */
function topIsHighY(items){
 let up=0,down=0;
 for(let i=1;i<items.length;i++){
  const d=items[i].y-items[i-1].y;
  if(d<-1)down++; else if(d>1)up++;
 }
 return down>up;
}
function toLines(items){
 const desc=topIsHighY(items);
 const rows=new Map();
 items.forEach(it=>{
  const key=Math.round(it.y/2)*2;                 // tolerate sub-point drift
  if(!rows.has(key))rows.set(key,[]);
  rows.get(key).push(it);
 });
 return [...rows.entries()]
  .sort((a,b)=>desc?b[0]-a[0]:a[0]-b[0])          // top of the page first
  .map(([y,arr])=>{
    arr.sort((a,b)=>a.x-b.x);
    let s='',prev=null; const cells=[];
    arr.forEach(it=>{
      if(prev!==null && it.x-prev>6) s+=' ';
      // columns (a résumé's TITLE / ROLE / NETWORK): a gap wider than a couple of letters starts a new cell
      if(prev===null||it.x-prev>14) cells.push({x:it.x,s:it.s}); else cells[cells.length-1].s+=(it.x-prev>2&&!/\s$/.test(cells[cells.length-1].s)?' ':'')+it.s;
      s+=it.s; prev=it.x+it.s.length*6;
    });
    return {y, x:arr[0].x, x1:Math.max(prev||0, arr[0].x+s.trim().length*6), text:s.replace(/\s+/g,' ').trim(), cells:cells.map(c=>({x:c.x,text:c.s.replace(/\s+/g,' ').trim()})).filter(c=>c.text)};
  })
  .filter(r=>r.text);
}

/* ---------- crossed-out lines ----------
   Casting sites cross out the part of a page that isn't your scene with a box and an X laid over
   the page as a see-through picture (an image with an /SMask). The words under it are still text,
   so a reader that only reads text would hand you the crossed-out speech as a line. This finds the
   marks: a page-sized overlay mask is turned into a 1-point grid of ink, and a text line is crossed
   out when a diagonal runs through it and the lines next to it, or a thin line runs through its words.
   A highlighter (ink over the whole line) and a START / END arrow (one line) are not crossings. */
function objectTable(s){
 const T={}; const re=/(?<![\d])(\d+)\s+(\d+)\s+obj\b/g; let m;
 while((m=re.exec(s))){ const st=m.index+m[0].length; const e=s.indexOf('endobj',st); const body=s.slice(st,e<0?st+4000:e);
  const k=body.search(/(?<![A-Za-z])stream(\r\n|\n|\r)/); T[m[1]]={dict:k>=0?body.slice(0,k):body, at:st, stream:k>=0?st+k:-1}; }
 return T;
}
async function addObjStms(T,buf,s,streams){
 for(const st of streams){
  const d=s.slice(Math.max(0,st.start-600),st.start); if(!/\/Type\s*\/ObjStm/.test(d)) continue;
  const N=+(d.match(/\/N\s+(\d+)/)||[])[1], F=+(d.match(/\/First\s+(\d+)/)||[])[1]; if(!N||isNaN(F)) continue;
  let data=buf.slice(st.start,st.end); if(st.filters.includes('FlateDecode')){ data=await inflate(data); if(!data) continue; }
  const t=dec.decode(data), head=t.slice(0,F).trim().split(/\s+/).map(Number);
  for(let i=0;i<N;i++){ const num=head[2*i], off=head[2*i+1], nxt=i+1<N?head[2*i+3]:t.length-F; if(!(num in T)) T[num]={dict:t.slice(F+off,F+nxt),at:-1,stream:-1}; }
 }
}
const ref=(d,key)=>{ const m=d.match(new RegExp('/'+key+'\\s+(\\d+)\\s+\\d+\\s+R')); return m?m[1]:null; };
function subDict(d,key,T){ // /Resources << ... >> inline, or /Resources 12 0 R
 const r=ref(d,key); if(r&&T[r]) return T[r].dict;
 const i=d.indexOf('/'+key); if(i<0) return ''; let j=d.indexOf('<<',i); if(j<0) return ''; let depth=0,k=j;
 for(;k<d.length;k++){ if(d.startsWith('<<',k)){depth++;k++;} else if(d.startsWith('>>',k)){depth--;k++; if(!depth) break;} }
 return d.slice(j,k+1);
}
function pageList(T){
 let root=null; for(const n in T){ if(/\/Type\s*\/Catalog/.test(T[n].dict)){ root=ref(T[n].dict,'Pages'); break; } }
 const out=[]; const walk=(n,depth)=>{ const o=T[n]; if(!o||depth>20) return;
  if(/\/Type\s*\/Pages/.test(o.dict)){ const k=(o.dict.match(/\/Kids\s*\[([^\]]*)\]/)||[])[1]||''; [...k.matchAll(/(\d+)\s+\d+\s+R/g)].forEach(x=>walk(x[1],depth+1)); }
  else if(/\/Type\s*\/Page\b/.test(o.dict)) out.push(n); };
 if(root) walk(root,0);
 return out;
}
function pageStuff(T,pn){
 const d=T[pn].dict, mb=(d.match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/)||[]).slice(1).map(Number);
 const cont=[]; const cm=d.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/); if(cm) [...cm[1].matchAll(/(\d+)\s+\d+\s+R/g)].forEach(x=>cont.push(x[1]));
 const masks=[]; const seen={};
 const look=(res,depth)=>{ const xo=subDict(res,'XObject',T); [...xo.matchAll(/\/[^\s\/<>\[\]]+\s+(\d+)\s+\d+\s+R/g)].forEach(x=>{ const o=T[x[1]]; if(!o||seen[x[1]]) return; seen[x[1]]=1;
   if(/\/Subtype\s*\/Image/.test(o.dict)){ const sm=ref(o.dict,'SMask'); if(sm&&T[sm]) masks.push(sm); }
   else if(/\/Subtype\s*\/Form/.test(o.dict)&&depth<3){ cont.push(x[1]); look(subDict(o.dict,'Resources',T),depth+1); } }); };
 look(subDict(d,'Resources',T),0);
 return {w:mb.length?mb[2]-mb[0]:612, h:mb.length?mb[3]-mb[1]:792, cont, masks};
}
async function inkGrid(T,buf,s,masks,pw,ph){
 let g=null; const W=Math.ceil(pw), H=Math.ceil(ph);
 for(const mk of masks){ const o=T[mk]; if(!o||o.stream<0) continue;
  const w=+(o.dict.match(/\/Width\s+(\d+)/)||[])[1], h=+(o.dict.match(/\/Height\s+(\d+)/)||[])[1], bpc=+(o.dict.match(/\/BitsPerComponent\s+(\d+)/)||[])[1]||8;
  if(!w||!h||bpc!==8||/\/DecodeParms/.test(o.dict)) continue;
  if(Math.abs(w/h-pw/ph)>0.02||w<pw) continue;                      // only a page-sized overlay
  const st=o.stream+(s.slice(o.stream,o.stream+8).match(/stream(\r\n|\n|\r)/)||['stream\n'])[0].length;
  const len=+(o.dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/)||[])[1]; let end=len?st+len:s.indexOf('endstream',st); if(!len){ while(end>st&&(s[end-1]==='\n'||s[end-1]==='\r')) end--; }
  let px=buf.slice(st,end); const fl=((o.dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/)||[])[1]||'').match(/\/(\w+)/g)||[];
  let ok=true; for(const f of fl){ if(f==='/ASCII85Decode') px=a85(px); else if(f==='/FlateDecode'){ px=await inflate(px); if(!px){ ok=false; break; } } else { ok=false; break; } }
  if(!ok) continue;
  if(px.length<w*h) continue;
  g=g||new Uint8Array(W*H); const sx=w/pw, sy=h/ph;
  for(let y=0;y<h;y++){ const gy=Math.min(H-1,Math.floor(y/sy)); const row=y*w; for(let x=0;x<w;x++){ if(px[row+x]>110) g[gy*W+Math.min(W-1,Math.floor(x/sx))]=1; } }
 }
 return g?{g,W,H}:null;
}
/* A box with an X through it: a long rule, the same rule lower down, and a diagonal corner to corner. */
function crossedBoxes(grid){
 const {g,W,H}=grid, ink=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&g[y*W+x];
 const rules=[];
 for(let y=0;y<H;y++){ let run=0; for(let x=0;x<=W;x++){ if(x<W&&ink(x,y)) run++; else { if(run>=100){ const xa=x-run, xb=x-1, p=rules[rules.length-1];
    if(p&&y-p.y1<=2&&Math.abs(p.xa-xa)<=6&&Math.abs(p.xb-xb)<=6) p.y1=y; else rules.push({y0:y,y1:y,xa,xb}); } run=0; } } }
 const near=(x,y)=>{ for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) if(ink(Math.round(x)+dx,Math.round(y)+dy)) return true; return false; };
 const boxes=[];
 rules.forEach((a,i)=>{ for(let j=i+1;j<rules.length;j++){ const b=rules[j]; if(b.y0-a.y1<14) continue; if(Math.abs(a.xa-b.xa)>6||Math.abs(a.xb-b.xb)>6) continue;
   const ya=(a.y0+a.y1)/2, yb=(b.y0+b.y1)/2; let d1=0,d2=0,n=40;
   for(let k=1;k<n;k++){ const t=k/n, x=a.xa+t*(a.xb-a.xa); if(near(x,ya+t*(yb-ya))) d1++; if(near(x,yb-t*(yb-ya))) d2++; }
   if(Math.max(d1,d2)>=(n-1)*0.7) boxes.push({x0:Math.min(a.xa,b.xa),x1:Math.max(a.xb,b.xb),y0:ya,y1:yb});
   break; } });
 return boxes;
}
/* lines: [{x, x1, top}] on one page, top = distance of the baseline from the top of the page */
function crossedOut(lines,grid){
 if(!grid) return lines.map(()=>false);
 const {g,W,H}=grid, ink=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&g[y*W+x];
 const info=lines.map(l=>{ const x0=Math.round(l.x)+2, x1=Math.round(l.x1)-2, b=Math.round(l.top); let cols=[], rows=0, thin=false;
  if(x1<=x0) return {has:false};
  for(let y=b-9;y<=b+1;y++){ let n=0,run=0,best=0; for(let x=x0;x<=x1;x++){ if(ink(x,y)){ n++; run++; if(run>best)best=run; } else run=0; } if(n) rows++; if(best>=(x1-x0)*0.6&&y>=b-7&&y<=b-1) thin=true; }
  for(let x=x0;x<=x1;x++){ for(let y=b-9;y<=b+1;y++) if(ink(x,y)){ cols.push(x); break; } }
  const span=x1-x0+1;
  return {has:cols.length>0&&cols.length<span*0.6, left:cols.length?cols[0]:null, strike:thin&&rows<=4, top:b}; });
 const out=info.map(i=>!!i.strike);
 const boxes=crossedBoxes(grid);
 lines.forEach((l,i)=>{ if(boxes.some(b=>info[i].top>b.y0+2&&info[i].top<b.y1+2&&l.x>=b.x0-4&&l.x<b.x1)) out[i]=true; });
 const order=lines.map((l,i)=>i).sort((a,b)=>info[a].top-info[b].top);
 for(let k=0;k<order.length;){ let j=k; while(j+1<order.length&&info[order[j]].has&&info[order[j+1]].has&&info[order[j+1]].top-info[order[j]].top<=30) j++;
  const grp=order.slice(k,j+1).filter(i=>info[i].has);
  if(grp.length>=3){ let moves=0; for(let q=1;q<grp.length;q++) if(Math.abs(info[grp[q]].left-info[grp[q-1]].left)>=10) moves++;
   if(moves>=(grp.length-1)*0.8){ grp.forEach(i=>out[i]=true);
    // the box the X sits in: a long rule above and below. Everything inside it is crossed out (a name over crossed lines too).
    const rule=y=>{ let run=0; for(let x=0;x<W;x++){ if(ink(x,y)){ if(++run>=100) return true; } else run=0; } return false; };
    let t0=info[grp[0]].top, t1=info[grp[grp.length-1]].top, up=null, dn=null;
    for(let y=t0-10;y>=t0-40&&up===null;y--) if(rule(y)) up=y;
    for(let y=t1+2;y<=t1+30&&dn===null;y++) if(rule(y)) dn=y;
    if(up!==null) info.forEach((x,i)=>{ if(x.top>up+3&&x.top<(dn!==null?dn:t1+1)) out[i]=true; }); } }
  k=j+1; }
 return out;
}

A.extract=async function(arrayBuffer){
 const buf=new Uint8Array(arrayBuffer);
 const head=dec.decode(buf.slice(0,Math.min(buf.length,4096)));
 const all=dec.decode(buf);
 // Studio sides are frequently permission-protected. The streams are encrypted,
 // so anything we pull out is noise. Detect it rather than returning garbage.
 const encrypted=/\/Encrypt\s+\d+\s+\d+\s+R|\/Encrypt\s*<</.test(all);
 const version=(head.match(/%PDF-(\d\.\d)/)||[])[1]||'?';
 const streams=findStreams(buf);
 let pages=[], cmap={}, sawCMap=false;
 // which page each content stream belongs to, and that page's crossed-out marks
 let T={}, plist=[], streamPage={}, pinfo=[];
 try{ T=objectTable(all); await addObjStms(T,buf,all,streams); plist=pageList(T);
  pinfo=plist.map(pn=>pageStuff(T,pn));
  pinfo.forEach((pi,ix)=>pi.cont.forEach(c=>{ const o=T[c]; if(o&&o.stream>=0){ const st=o.stream+(all.slice(o.stream,o.stream+8).match(/stream(\r\n|\n|\r)/)||['stream\n'])[0].length; streamPage[st]=ix; } }));
 }catch(e){ plist=[]; }
 for(const st of streams){
  let data=buf.slice(st.start,st.end);
  let bad=false;
  for(const f of st.filters){
   if(f==='ASCII85Decode'){ data=a85(data); }
   else if(f==='FlateDecode'){ const inf=await inflate(data); if(!inf){bad=true;break;} data=inf; }
   else if(f==='ASCIIHexDecode'){
    const hx=dec.decode(data).replace(/[^0-9a-fA-F]/g,'');
    const o=new Uint8Array(hx.length>>1);
    for(let i=0;i<o.length;i++)o[i]=parseInt(hx.substr(i*2,2),16);
    data=o;
   }
   else { bad=true; break; }          // DCT, JPX etc - an image, not text
  }
  if(bad)continue;
  const txt=dec.decode(data);
  if(/beginbfchar|beginbfrange/.test(txt)){ Object.assign(cmap,parseCMap(txt)); sawCMap=true; continue; }
  // objects compressed inside an /ObjStm - unpack and look again
  if(/\/ObjStm/.test(dec.decode(buf.slice(Math.max(0,st.start-500),st.start)))){
   if(/beginbfchar|beginbfrange/.test(txt)){ Object.assign(cmap,parseCMap(txt)); sawCMap=true; }
   continue;
  }
  if(!/\bTj\b|\bTJ\b/.test(txt))continue;
  const got=readContent(txt);
  if(got.length){ got.pg=streamPage[st.start]; pages.push(got); }
 }
 // if the raw text is mostly unprintable, the strings are glyph codes - remap
 const rawAll=pages.flat().map(i=>i.s).join('');
 const printable=(rawAll.match(/[\x20-\x7e]/g)||[]).length/Math.max(1,rawAll.length);
 if(sawCMap && printable<0.72){
  pages=pages.map(pg=>pg.map(i=>({x:i.x,y:i.y,s:[...i.s].map(ch=>{
    const c=ch.charCodeAt(0);
    return (cmap[c]!==undefined)?cmap[c]:ch; }).join('')})));
 }
 const perPage=pages.map(pg=>toLines(pg));
 let struck=0;
 for(let i=0;i<pages.length;i++){ const ix=pages[i].pg; const pi=pinfo[ix]; if(ix===undefined||!pi||!pi.masks.length) continue;
  if(!pi.grid) pi.grid=await inkGrid(T,buf,all,pi.masks,pi.w,pi.h); if(!pi.grid) continue;
  const up=topIsHighY(pages[i]), L=perPage[i];
  const marks=crossedOut(L.map(l=>({x:l.x,x1:l.x1,top:up?pi.h-l.y:l.y})),pi.grid);
  L.forEach((l,k)=>{ if(marks[k]){ l.struck=true; struck++; } }); }
 const lines=perPage.reduce((acc,pg)=>acc.concat(pg),[]);
 const allTxt=lines.map(l=>l.text).join('');
 const pr=(allTxt.match(/[\x20-\x7e]/g)||[]).length/Math.max(1,allTxt.length);
 return {lines, pages:perPage, struck, chars:allTxt.length, printable:Math.round(pr*100)/100,
         cmapEntries:Object.keys(cmap).length, streams:streams.length,
         encrypted:encrypted, version:version,
         images:(all.match(/\/Subtype\s*\/Image/g)||[]).length};
};

/* Turn positioned lines into the same shape the text parser produces.
   Character cue vs dialogue is decided by indent, not by guessing at case. */
/* Real sides from Breakdown Services / Actors Access carry a lot that is not the
   scene: a diagonal watermark, production headers, scene numbers in both margins,
   page footers, and an instructions page. All of it has to go before the parse. */
const JUNK=[
 /^Sides by Breakdown Services/i,
 /^\(?CONTINUED\)?:?(\s*\(\d+\))?$/i,
 /^\d+\s*\/\s*\d+$/,                       // 1/4 page counter
 /^\d+\s+CONTINUED:?(\s*\(\d+\))?\s+\d+$/i,// 5 CONTINUED: (2) 5
 /^\d{1,3}\s+\d{1,3}$/,                    // scene number in both margins
 /^\d{1,3}\.?$/,                           // bare page or scene number
 /Studio\/Network Draft/i,
 /^Role:\s*/i,
 /^FYI\s*$/i,
];
function isWatermark(l){
 const t=l.text;
 if(l.x<0||l.x>620) return true;                 // rotated / off-page
 if(/^(E\d{3}-){3,}/.test(t)) return true;       // E382-E382-E382...
 if(/(\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d+\s*-\s*){2,}/i.test(t)) return true;
 if(/(\w+\s+\d{1,2},\s*\d{4}\s+\d{1,2}:\d{2}\s*(AM|PM)[^a-z]*){2,}/i.test(t)) return true;
 return false;
}
A.clean=function(lines){
 return lines.filter(l=>{
  const t=(l.text||'').trim();
  if(!t||l.struck) return false;   // crossed out on the page
  if(isWatermark(l)) return false;
  if(JUNK.some(rx=>rx.test(t))) return false;
  return true;
 });
};
/* The header names the part on every page - that is who the actor is. */
A.roleFrom=function(lines){
 for(const l of lines){
  const m=(l.text||'').match(/^Role:\s*(.+?)\s*$/i);
  if(m) return m[1].trim().toUpperCase();
 }
 return '';
};
/* Instructions pages have no character cues. Drop any leading run without one. */
A.trimToScene=function(lines){
 const first=lines.findIndex(l=>l.x>=240&&l.x<=340&&/^[A-Z][A-Z0-9 .'\u2019\-()]{1,32}$/.test(l.text.trim()));
 if(first<=0) return lines;
 /* keep the scene heading and its action above the first cue (STORY STUDIO needs the place,
    the time of day and what's in the action); the instructions page has no heading */
 for(let i=first-1;i>=0;i--){ if(/^\s*(\d+[A-Z]?\s+)?(INT|EXT|I\/E)(?:[.\s]|\s*:\s*\S)/.test(lines[i].text||'')) return lines.slice(i); }
 return lines.slice(first);
};

/* Look for typed START / END markers. Returns indices into the cleaned lines,
   or -1. Handwritten markers are ink on the page and cannot be found this way. */
A.findMarkers=function(lines){
 let start=-1,end=-1;
 lines.forEach((l,i)=>{
  const t=(l.text||'').trim();
  if(start<0 && /(^|\s)(START|BEGIN)\s*[\u2192\u2794>\-]*\s*$|^[\u2192\u2794>]+\s*START/i.test(t)) start=i;
  if(/^[\u2190<\-]*\s*(END|STOP)(\s|$)|(^|\s)(END|STOP)\s*$/i.test(t)) end=i;
 });
 return {start,end};
};
A.toSides=function(lines){
 lines=A.trimToScene(A.clean(lines));
 if(!lines.length)return '';
 /* Revision stars in the right margin and (MORE) at a page foot are not the scene. */
 lines=lines.map(l=>Object.assign({},l,{text:l.text.replace(/\s+\*+$/,'').trim()}))
            .filter(l=>l.text && l.text!=='*' && !/^\(MORE\)$/i.test(l.text));
 /* A running header repeats on every page ("LAST BUS - SIDES ... 2."). Drop any
    all-caps line that turns up on more than one page once its page number is off. */
 const norm=t=>t.replace(/\s*\d+\.?\s*$/,'').trim();
 const seen={}; lines.forEach(l=>{ const k=norm(l.text); seen[k]=(seen[k]||0)+1; });
 /* a header in mixed case with a date or draft in it ("LOW TIDE - Blue Rev. 10/12/26 2.") repeats too */
 lines=lines.filter(l=>!(l.text!==l.text.toUpperCase() && l.text.length>=12 && /\d/.test(l.text) && seen[norm(l.text)]>1));
 lines=lines.filter(l=>!(l.text===l.text.toUpperCase() && seen[norm(l.text)]>1 && !/^[A-Z][A-Z0-9 .'#&\-]{0,30}(\(.*\))?$/.test(l.text)));
 /* Scene headings carry their number in both margins: "2 INT. PICKUP - DAY 2". */
 lines=lines.map(l=>{ const m=l.text.match(/^\d+[A-Z]?\s+((?:INT|EXT|I\/E)(?:[.\s]|\s*:).*?)(?:\s+\d+[A-Z]?)?$/); return m?Object.assign({},l,{text:m[1]}):l; });
 /* The action margin is where the prose sits, not the leftmost thing on the page
    (scene numbers and headers hang further out). */
 const prose={}; lines.forEach(l=>{ if(/[a-z]/.test(l.text)&&l.text.length>20){ const k=Math.round(l.x/4)*4; prose[k]=(prose[k]||0)+1; } });
 const pk=Object.keys(prose).map(Number).sort((a,b)=>a-b);
 const xs=lines.map(l=>l.x).sort((a,b)=>a-b);
 const actionX=pk.find(k=>prose[k]>=3) ?? xs[0];
 /* left of the prose margin is page furniture: running headers, draft dates ("LOW TIDE - Blue Rev. 10/12/26 2.") */
 if(pk.some(k=>prose[k]>=3)) lines=lines.filter(l=>l.x>=actionX-12 || /^(INT|EXT|EST|I\/E)(?:[.\s]|\s*:\s*\S)/i.test(l.text));
 const TRANS=/(^(FADE|SMASH|MATCH|DISSOLVE|CUT)\b.*|\bTO:|:)$/;
 const capIndents=lines.filter(l=>l.text===l.text.toUpperCase()&&l.text.length<34&&/[A-Z]{2}/.test(l.text)&&!TRANS.test(l.text)&&l.x>actionX+20).map(l=>l.x);
 const cueX = capIndents.length ? capIndents.sort((a,b)=>b-a)[Math.floor(capIndents.length*0.25)] : actionX+150;
 /* a name in the character column is a name even when the PDF kept it in lowercase ("Ross" for ROSS), as long as
    the same name is a cue in capitals somewhere else in the script */
 const cueName=t=>t.replace(/\s*\(CONT'?D\)\s*/i,'').replace(/\s*\((V\.?\s?O|O\.?\s?S|O\.?\s?C)\.?\)\s*$/i,'').trim().toUpperCase();
 const known=new Set(lines.filter(l=>l.x>=cueX-16&&l.text===l.text.toUpperCase()&&l.text.length<34&&/[A-Z]{2}/.test(l.text)&&!TRANS.test(l.text)&&!/^(INT|EXT|I\/E)(?:[\.\s]|\s*:\s*\S)/.test(l.text)).map(l=>cueName(l.text)));
 const out=[]; let lastCue='', actionSince=true;
 lines.forEach(l=>{
  const txt=l.text.replace(/’/g,"'").replace(/‘/g,"'").replace(/[“”]/g,'"').replace(/Õ/g,"'");
  const isCue = l.x>=cueX-16 && txt===txt.toUpperCase() && txt.length<34 && /[A-Z]{2}/.test(txt)
                && !/^(INT|EXT|I\/E)(?:[\.\s]|\s*:\s*\S)/.test(txt) && !TRANS.test(txt);
  const lowCue = !isCue && txt!==txt.toUpperCase() && l.x>=cueX-16 && txt.length<34 && !/[.!?,;:"]$/.test(txt) && known.has(cueName(txt));
  if(lowCue){ const name=txt.toUpperCase().replace(/\s*\(CONT'?D\)\s*/i,'').trim(); out.push('',name,null); lastCue=name; actionSince=false; return; }
  const isAction = !isCue && (l.x<=actionX+12 || (txt===txt.toUpperCase() && TRANS.test(txt)));   // CUT TO: is a transition
  if(isCue){
   const name=txt.replace(/\s*\(CONT'?D\)\s*/i,'').trim();
   /* RENNIE (CONT'D) straight after RENNIE across a page break is the same speech */
   if(/\(CONT'?D\)/i.test(txt) && name===lastCue && !actionSince) return;
   out.push('', name, null); lastCue=name; actionSince=false;
  }
  else if(isAction){ out.push('', txt, ''); actionSince=true; }
  else out.push(txt);
 });
 return out.filter(x=>x!==null).join('\n').replace(/\n{3,}/g,'\n\n').trim();
};
g.ActorPDF=A;
})(window);
