/* THEACTORPAGE TEXT PDF: plain pages of text as a real PDF, with no library. Letter, one-inch margins, the PDF's
   own built-in fonts (Courier for scripts and one-sheets the industry way, or Times), so nothing is embedded.
   TextPDF.make(sections, opts) -> Uint8Array
     sections: [{title, paras:[string], page:true (start on a new page)}]   opts: {font:'Courier'|'Times', size:12} */
(function(g){
const P={};
/* the PDF's built-in fonts speak WinAnsi: curly quotes and dashes have their own codes; anything else becomes ? */
const WIN={'‘':145,'’':146,'“':147,'”':148,'–':150,'—':151,'…':133,' ':32,'•':149};
const enc=s=>{ let o=''; for(const ch of String(s)){ const c=ch.codePointAt(0); let b=WIN[ch]!=null?WIN[ch]:(c<256?c:63);
 o+=b===40||b===41||b===92?'\\'+String.fromCharCode(b):b<32||b>126?'\\'+b.toString(8).padStart(3,'0'):String.fromCharCode(b); } return o; };
P.wrap=function(text,cols){ const out=[]; String(text||'').split('\n').forEach(line=>{ if(!line.trim()){ out.push(''); return; }
 let cur=''; line.split(/\s+/).filter(Boolean).forEach(w=>{ while(w.length>cols){ if(cur){ out.push(cur); cur=''; } out.push(w.slice(0,cols)); w=w.slice(cols); }
  if(!cur) cur=w; else if((cur+' '+w).length<=cols) cur+=' '+w; else { out.push(cur); cur=w; } }); if(cur) out.push(cur); }); return out; };
P.make=function(sections,opts){
 opts=opts||{}; const font=opts.font==='Times'?'Times-Roman':'Courier', bold=opts.font==='Times'?'Times-Bold':'Courier-Bold', size=opts.size||12, lead=size*1.2;
 const W=612,H=792,M=72, cols=font==='Courier'?Math.floor((W-2*M)/(size*0.6)):Math.floor((W-2*M)/(size*0.48)), rows=Math.floor((H-2*M)/lead);
 const pages=[]; let cur=null;
 const newPage=()=>{ cur=[]; pages.push(cur); };
 const line=(t,b)=>{ if(!cur||cur.length>=rows) newPage(); cur.push({t,b}); };
 (sections||[]).forEach((s,i)=>{ if(!cur||s.page||i===0) newPage();
  if(s.title){ P.wrap(s.title,cols).forEach(t=>line(t,true)); line(''); }
  (s.paras||[]).forEach((para,j)=>{ P.wrap(para,cols).forEach(t=>line(t)); if(j<s.paras.length-1) line(''); });
  if(cur&&!s.page&&i<sections.length-1) { line(''); line(''); } });
 if(!pages.length) newPage();
 const objs=[], add=s=>{ objs.push(s); return objs.length; };
 const cat=add(''), pgs=add(''), f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /'+font+' /Encoding /WinAnsiEncoding >>'), f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /'+bold+' /Encoding /WinAnsiEncoding >>');
 const kids=[];
 pages.forEach((L,n)=>{ let c='BT\n'+lead.toFixed(1)+' TL\n'+M+' '+(H-M-size)+' Td\n';
  L.forEach((x,k)=>{ c+=(k?'T*\n':'')+'/'+(x.b?'F2':'F1')+' '+size+' Tf\n('+enc(x.t)+') Tj\n'; });
  if(pages.length>1) c+='ET\nBT\n/F1 '+(size-2)+' Tf\n'+(W-M-40)+' '+(M/2)+' Td\n('+(n+1)+'.) Tj\n';
  c+='ET';
  const st=add('<< /Length '+c.length+' >>\nstream\n'+c+'\nendstream');
  kids.push(add('<< /Type /Page /Parent '+pgs+' 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 '+f1+' 0 R /F2 '+f2+' 0 R >> >> /Contents '+st+' 0 R >>')); });
 objs[cat-1]='<< /Type /Catalog /Pages '+pgs+' 0 R >>';
 objs[pgs-1]='<< /Type /Pages /Kids ['+kids.map(k=>k+' 0 R').join(' ')+'] /Count '+kids.length+' >>';
 let out='%PDF-1.4\n'; const off=[];
 objs.forEach((o,i)=>{ off.push(out.length); out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'; });
 const x=out.length; out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root '+cat+' 0 R >>\nstartxref\n'+x+'\n%%EOF\n';
 const u=new Uint8Array(out.length); for(let i=0;i<out.length;i++) u[i]=out.charCodeAt(i)&255; return u;
};
if(typeof module!=='undefined') module.exports=P;
g.TextPDF=P;
})(typeof window!=='undefined'?window:globalThis);
