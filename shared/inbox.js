/* THEACTORPAGE INBOX
   What you drop on the home page that isn't sides: a self-tape request for the Hub, a draft for
   Paper Trail. (Sides and scripts go on the sides shelf, shared/shelf.js, which every ACT and FILM
   tool already reads.) Each tool takes what is meant for it the next time it opens, once.

   localStorage 'theactorpage_inbox_v1' on this phone only. Newest 40 kept. Nothing uploaded.
   Item: {id, kind:'request'|'draft', at, data, taken:{tool:at}} */
(function(g){
const KEY='theactorpage_inbox_v1', MAX=40;
const I={};
function read(){ try{ const d=JSON.parse(localStorage.getItem(KEY)||'null'); if(d&&Array.isArray(d.items)) return d; }catch(e){} return {items:[]}; }
function write(d){ d.items.sort((a,b)=>b.at-a.at); if(d.items.length>MAX) d.items.length=MAX; try{ localStorage.setItem(KEY,JSON.stringify(d)); return true; }catch(e){ return false; } }
function hash(s){ let h=5381; s=String(s); for(let i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return h.toString(36); }
let clock=0; const now=()=>{ const t=Date.now(); clock=t>clock?t:clock+1; return clock; };
/* The same thing dropped twice is one item (known by kind + its words); it comes back to the top. */
I.put=function(kind,data,key){
 const d=read(), id=kind[0]+hash(key||JSON.stringify(data||{}).replace(/\s+/g,' ')); let it=d.items.find(x=>x.id===id);
 if(it){ it.at=now(); it.data=Object.assign({},it.data,data); }
 else { it={id:id,kind:kind,at:now(),data:data||{},taken:{}}; d.items.push(it); }
 write(d); return it;
};
I.all=function(kind){ return read().items.filter(x=>!kind||x.kind===kind); };
I.get=function(id){ return read().items.find(x=>x.id===id)||null; };
/* what this tool hasn't taken yet */
I.pending=function(tool,kind){ return read().items.filter(x=>x.kind===kind&&!(x.taken&&x.taken[tool])).sort((a,b)=>a.at-b.at); };
I.take=function(tool,id,note){ const d=read(), it=d.items.find(x=>x.id===id); if(!it) return; it.taken=it.taken||{}; it.taken[tool]=now(); if(note) it.data=Object.assign({},it.data,note); write(d); };
I.set=function(id,patch){ const d=read(), it=d.items.find(x=>x.id===id); if(!it) return null; it.data=Object.assign({},it.data,patch); write(d); return it; };
I.remove=function(id){ const d=read(); d.items=d.items.filter(x=>x.id!==id); write(d); };
g.Inbox=I;
if(typeof module!=='undefined') module.exports=I;
})(typeof window!=='undefined'?window:globalThis);
