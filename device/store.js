/* ON THIS DEVICE engine. What THEACTORPAGE tools keep in this browser, one backup file of all of it,
   and a restore that adds what's missing and never removes.
   The site address (colmacpulse.github.io) is shared with other sites, so only THEACTORPAGE's own
   names are touched. Nothing is sent anywhere. */
(function(g){
const D={};

/* ---------- whose is it ---------- */
D.TOOLS=[
 {id:'actoros', name:'Actor OS', href:'../actor-os/', ls:[/^actor_os_/,/^aos_/], db:[/^actor_os_/]},
 {id:'hub', name:'Hub', href:'../hub/', ls:[], db:[/^colmac_hub$/]},
 {id:'memorizer', name:'Memorizer', href:'../memorizer/', ls:[/^memorizer/], db:[]},
 {id:'breakdown', name:'Breakdown', href:'../breakdown/', ls:[/^bd_/], db:[/^breakdown_/]},
 {id:'cps', name:'Character Bank', href:'../cps/', ls:[/^cps_/,/^colmac_voxbootprint/,/^colmac_os_outbox$/,/^colmac_aos_integrator$/], db:[/^cps_/]},
 {id:'slate', name:'Slate Maker', href:'../slate/', ls:[/^slate_/], db:[/^slate_/]},
 {id:'resume', name:'Virtual Resume', href:'../resume/', ls:[/^resume_/], db:[/^vresume_/]},
 {id:'gsd', name:'GSD', href:'../gsd/', ls:[/^gsd_/], db:[]},
 {id:'wb', name:'Writer\'s Blockage', href:'../write/writers-blockage.html', ls:[/^writers-blockage/,/^wb_go_v1$/], db:[/^writers-blockage$/]},
 {id:'papertrail', name:'Paper Trail', href:'../papertrail/', ls:[/^paper_trail/], db:[/^paper_trail$/]},
 {id:'archbook', name:'ArchBook', href:'../archbook/', ls:[/^archbook_/], db:[/^archbook_/]},
 {id:'film', name:'Story Studio', href:'../film/', ls:[/^film_os/], db:[/^film_os/]},
 {id:'shelf', name:'Sides shelf', href:'', ls:[/^theactorpage_shelf/], db:[/^theactorpage_shelf/]},
 {id:'daily', name:'Today\'s scene', href:'../', ls:[/^theactorpage_daily/], db:[]},
 /* added with the tools built after this list: your profile (headshots, résumé), the takes shelf, the inbox, and every tool since */
 {id:'you', name:'Your profile (headshots, résumé)', href:'../', ls:[/^theactorpage_you/], db:[/^theactorpage_you$/]},
 {id:'takes', name:'Takes shelf', href:'../', ls:[/^theactorpage_takes/], db:[/^theactorpage_takes$/]},
 {id:'inbox', name:'Requests and drafts on home', href:'../', ls:[/^theactorpage_inbox/], db:[]},
 {id:'notes', name:'Notes', href:'../notes/', ls:[/^theactorpage_notes/,/^notes_ui/], db:[]},
 {id:'spotted', name:'Spotted', href:'../spotted/', ls:[/^theactorpage_spotted/,/^spotted_ui/], db:[]},
 {id:'headshots', name:'Headshots', href:'../headshots/', ls:[/^theactorpage_headshots/,/^headshots_ui/], db:[/^theactorpage_headshot_refs$/]},
 {id:'booth', name:'VO Booth', href:'../booth/', ls:[/^booth_/], db:[/^booth_media$/]},
 {id:'setlist', name:'Set List', href:'../setlist/', ls:[/^setlist_/], db:[/^setlist_media$/]},
 {id:'filmhub', name:'Film Hub', href:'../filmhub/', ls:[/^filmhub_/], db:[/^filmhub$/]},
 {id:'backlot', name:'Backlot', href:'../backlot/', ls:[/^backlot_/], db:[]}
];
D.OWN_KEY='theactorpage_device_v1';
/* passing notes between tools (gone in minutes) and things that can't go in a file */
const SKIP_LS=[/^theactorpage_handoff_/, /^rooms_seen_/, new RegExp('^'+D.OWN_KEY+'$')];   // rooms_seen_: home's 'is this new' marks, nothing of yours
const SKIP_STORES={'writers-blockage':['handles']};   // links to files on this computer; they only work here
D.KNOWN_DBS=['actor_os_reader','colmac_hub','breakdown_v03','cps_v02','slate_v04','vresume_v03','writers-blockage','paper_trail','archbook_v03','film_os','theactorpage_shelf','theactorpage_you','theactorpage_takes','theactorpage_headshot_refs','booth_media','setlist_media','filmhub'];
D.toolOfKey=k=>{ if(SKIP_LS.some(r=>r.test(k))) return null; return D.TOOLS.find(t=>t.ls.some(r=>r.test(k)))||null; };
D.toolOfDb=n=>D.TOOLS.find(t=>t.db.some(r=>r.test(n)))||null;
D.skipStore=(db,st)=>(SKIP_STORES[db]||[]).includes(st);

/* ---------- values to a file and back ---------- */
/* blobs, files and raw bytes go to media/N in the zip; everything else to JSON */
D.encode=function(v,media,skipped){
 const walk=x=>{
  if(x==null||typeof x!=='object') return x;
  if(typeof Blob!=='undefined'&&x instanceof Blob){ const i=media.push(x)-1; return {__pt:'blob',i:i,type:x.type||'',name:(typeof File!=='undefined'&&x instanceof File)?x.name:undefined,lm:x.lastModified}; }
  if(x instanceof ArrayBuffer){ const i=media.push(new Blob([x]))-1; return {__pt:'ab',i:i}; }
  if(ArrayBuffer.isView(x)){ const i=media.push(new Blob([new Uint8Array(x.buffer,x.byteOffset,x.byteLength)]))-1; return {__pt:'ta',k:x.constructor.name,i:i}; }
  if(x instanceof Date) return {__pt:'date',v:x.getTime()};
  if(Array.isArray(x)) return x.map(walk);
  const p=Object.getPrototypeOf(x);
  if(p!==Object.prototype&&p!==null){ skipped&&skipped.push(x.constructor&&x.constructor.name||'object'); return {__pt:'skip',what:x.constructor&&x.constructor.name||'object'}; }
  const o={}; for(const k of Object.keys(x)) o[k]=walk(x[k]); return o;
 };
 return walk(v);
};
D.decode=async function(v,getMedia){
 const walk=async x=>{
  if(x==null||typeof x!=='object') return x;
  if(Array.isArray(x)){ const o=[]; for(const y of x) o.push(await walk(y)); return o; }
  if(x.__pt==='blob'){ const b=getMedia(x.i); const t=b.slice(0,b.size,x.type||'');
   if(x.name!=null&&typeof File!=='undefined') return new File([t],x.name,{type:x.type||'',lastModified:x.lm||Date.now()}); return t; }
  if(x.__pt==='ab') return await getMedia(x.i).arrayBuffer();
  if(x.__pt==='ta'){ const ab=await getMedia(x.i).arrayBuffer(); const C=g[x.k]||Uint8Array; return new C(ab); }
  if(x.__pt==='date') return new Date(x.v);
  if(x.__pt==='skip') return null;
  const o={}; for(const k of Object.keys(x)) o[k]=await walk(x[k]); return o;
 };
 return walk(v);
};
/* a fingerprint to tell "the same" from "different" without reading media */
D.sig=function(v,mediaSize){
 const ms=i=>mediaSize?mediaSize(i):'?';
 const walk=x=>{
  if(x==null||typeof x!=='object') return x;
  if(typeof Blob!=='undefined'&&x instanceof Blob) return 'blob:'+x.size+':'+(x.type||'');
  if(x instanceof ArrayBuffer||ArrayBuffer.isView(x)) return 'bytes:'+x.byteLength;
  if(x instanceof Date) return 'date:'+x.getTime();
  if(Array.isArray(x)) return x.map(walk);
  if(x.__pt==='blob') return 'blob:'+ms(x.i)+':'+(x.type||'');
  if(x.__pt==='ab'||x.__pt==='ta') return 'bytes:'+ms(x.i);
  if(x.__pt==='date') return 'date:'+x.v;
  if(x.__pt==='skip') return 'skip';
  const p=Object.getPrototypeOf(x); if(p!==Object.prototype&&p!==null) return 'skip';
  const o={}; for(const k of Object.keys(x).sort()) o[k]=walk(x[k]); return o;
 };
 return JSON.stringify(walk(v));
};
D.sizeOf=function(v){ let n=0; const walk=x=>{ if(x==null) return; if(typeof x==='string'){ n+=x.length; return; } if(typeof x!=='object'){ n+=8; return; }
 if(typeof Blob!=='undefined'&&x instanceof Blob){ n+=x.size; return; } if(x instanceof ArrayBuffer){ n+=x.byteLength; return; } if(ArrayBuffer.isView(x)){ n+=x.byteLength; return; }
 if(Array.isArray(x)) x.forEach(walk); else Object.keys(x).forEach(k=>{ n+=k.length; walk(x[k]); }); }; walk(v); return n; };
/* takes, photos and files (raw numbers like a waveform don't count) */
D.mediaIn=function(v){ let n=0; const walk=x=>{ if(x==null||typeof x!=='object') return; if(typeof Blob!=='undefined'&&x instanceof Blob){ n++; return; } if(x instanceof ArrayBuffer||ArrayBuffer.isView(x)) return; if(Array.isArray(x)) x.forEach(walk); else Object.keys(x).forEach(k=>walk(x[k])); }; walk(v); return n; };

/* ---------- a zip with nothing squeezed (videos are already small as they get) ---------- */
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
D.crc32=async function(blob){ let c=0xFFFFFFFF; const step=8*1024*1024;
 for(let o=0;o<blob.size;o+=step){ const b=new Uint8Array(await blob.slice(o,o+step).arrayBuffer()); for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&0xFF]^(c>>>8); }
 return (c^0xFFFFFFFF)>>>0; };
D.ZIP_LIMIT=0xFFFFFFFF-1024*1024;
D.zip=async function(entries){   // [{name, blob}]
 const enc=new TextEncoder(), parts=[], cd=[]; let off=0;
 const d=new Date(), dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(), tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
 for(const e of entries){
  const nm=enc.encode(e.name), crc=await D.crc32(e.blob), sz=e.blob.size;
  const h=new DataView(new ArrayBuffer(30));
  h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(6,0x0800,true); h.setUint16(8,0,true); h.setUint16(10,tm,true); h.setUint16(12,dt,true);
  h.setUint32(14,crc,true); h.setUint32(18,sz,true); h.setUint32(22,sz,true); h.setUint16(26,nm.length,true); h.setUint16(28,0,true);
  parts.push(h.buffer,nm,e.blob);
  const c=new DataView(new ArrayBuffer(46));
  c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,tm,true); c.setUint16(14,dt,true);
  c.setUint32(16,crc,true); c.setUint32(20,sz,true); c.setUint32(24,sz,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
  cd.push(c.buffer,nm);
  off+=30+nm.length+sz;
  if(off>D.ZIP_LIMIT) throw new Error('too big for one backup file (over 4 GB)');
 }
 const cdSize=cd.reduce((n,p)=>n+(p.byteLength||p.length),0);
 const end=new DataView(new ArrayBuffer(22));
 end.setUint32(0,0x06054b50,true); end.setUint16(8,entries.length,true); end.setUint16(10,entries.length,true); end.setUint32(12,cdSize,true); end.setUint32(16,off,true);
 return new Blob([...parts,...cd,end.buffer],{type:'application/zip'});
};
D.unzip=async function(file){   // -> {name: Blob}
 const tail=new DataView(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());
 let e=-1; for(let i=tail.byteLength-22;i>=0;i--) if(tail.getUint32(i,true)===0x06054b50){ e=i; break; }
 if(e<0) throw new Error('not a zip file');
 const n=tail.getUint16(e+10,true), cdSize=tail.getUint32(e+12,true), cdOff=tail.getUint32(e+16,true);
 const cd=new DataView(await file.slice(cdOff,cdOff+cdSize).arrayBuffer()), dec=new TextDecoder(), out={};
 let p=0;
 for(let k=0;k<n;k++){
  if(cd.getUint32(p,true)!==0x02014b50) throw new Error('that zip is damaged');
  const method=cd.getUint16(p+10,true), size=cd.getUint32(p+20,true), nl=cd.getUint16(p+28,true), xl=cd.getUint16(p+30,true), cl=cd.getUint16(p+32,true), lo=cd.getUint32(p+42,true);
  const name=dec.decode(new Uint8Array(cd.buffer,cd.byteOffset+p+46,nl));
  if(method!==0) throw new Error('that zip was squeezed by another program; use the file this page made');
  const lh=new DataView(await file.slice(lo,lo+30).arrayBuffer()); const start=lo+30+lh.getUint16(26,true)+lh.getUint16(28,true);
  out[name]=file.slice(start,start+size);
  p+=46+nl+xl+cl;
 }
 return out;
};

if(typeof module!=='undefined') module.exports=D;
g.OnDevice=D;
})(typeof window!=='undefined'?window:globalThis);
