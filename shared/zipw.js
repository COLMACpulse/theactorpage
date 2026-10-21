/* THEACTORPAGE ZIP WRITER: a few files in one .zip, stored as they are (no squeezing), with no library.
   Zip.make([{name, data: string|Uint8Array}]) -> Uint8Array */
(function(g){
const Z={}; let T=null;
const crc=u=>{ if(!T){ T=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; T[n]=c>>>0; } } let c=0xffffffff; for(let i=0;i<u.length;i++) c=T[(c^u[i])&255]^(c>>>8); return (c^0xffffffff)>>>0; };
const utf8=s=>typeof TextEncoder!=='undefined'?new TextEncoder().encode(s):Uint8Array.from(Buffer.from(s,'utf8'));
Z.crc=crc;
Z.make=function(files){
 const parts=[], cen=[]; let off=0; const now=new Date(), dt=((now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1))&0xffff, dd=(((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate())&0xffff;
 (files||[]).forEach(f=>{ const name=utf8(f.name), data=typeof f.data==='string'?utf8(f.data):f.data, c=crc(data);
  const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,dt,true); h.setUint16(12,dd,true);
  h.setUint32(14,c,true); h.setUint32(18,data.length,true); h.setUint32(22,data.length,true); h.setUint16(26,name.length,true); h.setUint16(28,0,true);
  parts.push(new Uint8Array(h.buffer),name,data);
  const e=new DataView(new ArrayBuffer(46)); e.setUint32(0,0x02014b50,true); e.setUint16(4,20,true); e.setUint16(6,20,true); e.setUint16(8,0x0800,true); e.setUint16(10,0,true); e.setUint16(12,dt,true); e.setUint16(14,dd,true);
  e.setUint32(16,c,true); e.setUint32(20,data.length,true); e.setUint32(24,data.length,true); e.setUint16(28,name.length,true); e.setUint32(42,off,true);
  cen.push(new Uint8Array(e.buffer),name); off+=30+name.length+data.length; });
 const csize=cen.reduce((n,u)=>n+u.length,0), end=new DataView(new ArrayBuffer(22)); end.setUint32(0,0x06054b50,true); end.setUint16(8,files.length,true); end.setUint16(10,files.length,true); end.setUint32(12,csize,true); end.setUint32(16,off,true);
 const all=parts.concat(cen,[new Uint8Array(end.buffer)]), out=new Uint8Array(all.reduce((n,u)=>n+u.length,0)); let p=0; all.forEach(u=>{ out.set(u,p); p+=u.length; }); return out;
};
/* and back: the files in a zip this writer made (stored, not squeezed). -> [{name, data: Uint8Array}] */
Z.read=function(u){
 u=u instanceof Uint8Array?u:new Uint8Array(u); const v=new DataView(u.buffer,u.byteOffset,u.byteLength), out=[];
 let e=-1; for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--){ if(v.getUint32(i,true)===0x06054b50){ e=i; break; } }
 if(e<0) throw new Error('not a zip');
 const n=v.getUint16(e+10,true); let p=v.getUint32(e+16,true); const dec=typeof TextDecoder!=='undefined'?new TextDecoder():null;
 for(let k=0;k<n;k++){ if(v.getUint32(p,true)!==0x02014b50) throw new Error('broken zip');
  const meth=v.getUint16(p+10,true), size=v.getUint32(p+20,true), nl=v.getUint16(p+28,true), xl=v.getUint16(p+30,true), cl=v.getUint16(p+32,true), off=v.getUint32(p+42,true);
  const nm=u.subarray(p+46,p+46+nl), name=dec?dec.decode(nm):Buffer.from(nm).toString('utf8');
  const lnl=v.getUint16(off+26,true), lxl=v.getUint16(off+28,true), st=off+30+lnl+lxl;
  if(meth===0) out.push({name,data:u.slice(st,st+size)});
  p+=46+nl+xl+cl; }
 return out;
};
if(typeof module!=='undefined') module.exports=Z;
g.Zip=Z;
})(typeof window!=='undefined'?window:globalThis);
