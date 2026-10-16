/* THEACTORPAGE XLSX: read an Excel workbook in the browser, no library, nothing uploaded.
   Gives each sheet as rows of cells {v, t, fmt}: v the value, t 'n' number / 's' text / 'b' yes-no,
   fmt the cell's number format ('h:mm', 'mm:ss', ...) so a time stays a time.
   Excel's own files write sheet paths one way, other apps (Google Sheets exports, Python) another; both read. */
(function(g){
const X={};
const BUILTIN={14:'m/d/yyyy',15:'d-mmm-yy',16:'d-mmm',17:'mmm-yy',18:'h:mm AM/PM',19:'h:mm:ss AM/PM',20:'h:mm',21:'h:mm:ss',22:'m/d/yyyy h:mm',45:'mm:ss',46:'[h]:mm:ss',47:'mmss.0'};
const dec=b=>new TextDecoder().decode(b);
async function inflate(data){
 if(typeof DecompressionStream!=='undefined'){ const ds=new DecompressionStream('deflate-raw'); return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer()); }
 if(typeof require!=='undefined'){ return new Uint8Array(require('zlib').inflateRawSync(Buffer.from(data))); }
 throw new Error('this browser cannot open zip files');
}
/* every file in the zip, by name, read on demand */
X.zip=function(buf){
 const u=buf instanceof Uint8Array?buf:new Uint8Array(buf), v=new DataView(u.buffer,u.byteOffset,u.byteLength);
 let e=-1; for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--){ if(v.getUint32(i,true)===0x06054b50){ e=i; break; } }
 if(e<0) throw new Error('not a spreadsheet (no zip inside)');
 const n=v.getUint16(e+10,true); let off=v.getUint32(e+16,true); const out={};
 for(let k=0;k<n;k++){
  if(v.getUint32(off,true)!==0x02014b50) break;
  const method=v.getUint16(off+10,true), csize=v.getUint32(off+20,true), nl=v.getUint16(off+28,true), el=v.getUint16(off+30,true), cl=v.getUint16(off+32,true), lho=v.getUint32(off+42,true);
  const name=dec(u.slice(off+46,off+46+nl));
  out[name]=async()=>{ const lnl=v.getUint16(lho+26,true), lel=v.getUint16(lho+28,true), s=lho+30+lnl+lel, d=u.slice(s,s+csize); return dec(method===0?d:await inflate(d)); };
  off+=46+nl+el+cl;
 }
 return out;
};
const unx=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,(m,d)=>String.fromCharCode(+d)).replace(/&amp;/g,'&');
const attr=(tag,a)=>{ const m=tag.match(new RegExp('\\s'+a+'="([^"]*)"')); return m?unx(m[1]):null; };
const texts=xml=>{ const L=[]; xml.replace(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g,(m,t)=>{ L.push(unx(t)); return m; }); return L.join(''); };
const colOf=ref=>{ const m=String(ref||'').match(/^([A-Z]+)/); if(!m) return -1; let n=0; for(const ch of m[1]) n=n*26+ch.charCodeAt(0)-64; return n-1; };
/* -> [{name, rows:[[cell]]}] */
X.read=async function(buf){
 const Z=X.zip(buf), get=async p=>Z[p]?await Z[p]():null;
 const shared=[]; const ss=await get('xl/sharedStrings.xml');
 if(ss) ss.replace(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g,(m,b)=>{ shared.push(texts(b)); return m; });
 // number formats per style
 const fmts={...BUILTIN}, xf=[]; const st=await get('xl/styles.xml');
 if(st){ st.replace(/<(?:\w+:)?numFmt\s[^>]*>/g,t=>{ fmts[+attr(t,'numFmtId')]=attr(t,'formatCode')||''; return t; });
  const cx=(st.match(/<(?:\w+:)?cellXfs[^>]*>([\s\S]*?)<\/(?:\w+:)?cellXfs>/)||[])[1]||'';
  cx.replace(/<(?:\w+:)?xf\s[^>]*?\/?>/g,t=>{ xf.push(fmts[+(attr(t,'numFmtId')||0)]||''); return t; }); }
 const wb=await get('xl/workbook.xml'), rels=await get('xl/_rels/workbook.xml.rels')||'';
 if(!wb) throw new Error('not an Excel workbook');
 const target={}; rels.replace(/<(?:\w+:)?Relationship\s[^>]*>/g,t=>{ target[attr(t,'Id')]=attr(t,'Target'); return t; });
 const sheets=[]; const list=[]; wb.replace(/<(?:\w+:)?sheet\s[^>]*>/g,t=>{ list.push({name:attr(t,'name'),rid:attr(t,'r:id')}); return t; });
 for(const s of list){
  let p=String(target[s.rid]||'').replace(/^\/+/,''); if(!/^xl\//.test(p)) p='xl/'+p;
  const xml=await get(p); if(!xml) continue;
  const rows=[];
  xml.replace(/<(?:\w+:)?row(\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?row>/g,(m,ra,body)=>{
   const r=[], rn=+(attr('<row'+(ra||'')+'>','r')||0);
   body.replace(/<(?:\w+:)?c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g,(mm,a,inner)=>{
    const tag='<c'+a+'>', i=colOf(attr(tag,'r')), t=attr(tag,'t'), sIdx=attr(tag,'s'); inner=inner||'';
    const vm=inner.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/); let cell=null;
    if(t==='s'&&vm) cell={v:shared[+vm[1]]??'',t:'s'};
    else if(t==='inlineStr') cell={v:texts(inner),t:'s'};
    else if(t==='str'&&vm) cell={v:unx(vm[1]),t:'s'};
    else if(t==='b'&&vm) cell={v:vm[1]==='1',t:'b'};
    else if(vm&&vm[1]!==''&&isFinite(+vm[1])) cell={v:+vm[1],t:'n',fmt:sIdx!=null?(xf[+sIdx]||''):''};
    else if(vm) cell={v:unx(vm[1]),t:'s'};
    if(cell&&i>=0) r[i]=cell; return mm; });
   if(rn>0){ while(rows.length<rn-1) rows.push([]); rows[rn-1]=r; } else rows.push(r); return m; });
  sheets.push({name:s.name,rows});
 }
 return sheets;
};
/* CSV / tab text -> rows of plain strings (quotes, commas and new lines inside quotes) */
X.csv=function(text){
 text=String(text||'').replace(/^﻿/,''); const first=text.split('\n')[0]||'', sep=(first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':',';
 const rows=[]; let row=[], f='', q=false;
 for(let i=0;i<text.length;i++){ const ch=text[i];
  if(q){ if(ch==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=ch; continue; }
  if(ch==='"'&&f==='') q=true; else if(ch===sep){ row.push(f); f=''; } else if(ch==='\n'){ row.push(f.replace(/\r$/,'')); rows.push(row); row=[]; f=''; } else f+=ch; }
 if(f!==''||row.length){ row.push(f.replace(/\r$/,'')); rows.push(row); }
 return rows;
};
g.XLSX=X;
if(typeof module!=='undefined') module.exports=X;
})(typeof window!=='undefined'?window:globalThis);
