/* THEACTORPAGE OFFICES: your real history with a casting office, in one line.
   For when a request comes in: "You and Ulrich/Dawson/Kritzer: 14 reads before this, 12 confirmed, 1 callback."
   Reads the Project Hub's own records (same office matching as the Hub). Plain counts. No score, no advice.
   Nothing leaves this device. */
(function(g){
const O={};
/* same as the Hub's officeKey: "Claire Simon Casting" and "Claire Simon" are one office */
O.key=x=>String(x||'').toLowerCase().replace(/\b(casting|cd|office|inc|llc|ltd|and|&|,|\.)\b/g,'').replace(/[^a-z0-9]+/g,'');
const offOf=p=>p.casting_office||p.casting_director||p.casting||'';
const when=s=>{ const t=Date.parse(String(s||'').replace(/(\d)(st|nd|rd|th)\b/g,'$1')); return isFinite(t)?t:null; };
/* names: the office as written on the request (one string, or several names) */
/* excludeId: this audition's id (or a test), so the request in hand doesn't count itself */
O.history=function(projects,credits,names,excludeId){
 names=(Array.isArray(names)?names:[names]).map(String).filter(s=>s.trim());
 if(names.length>1) names=[names.join(', ')].concat(names);
 let best=null;
 for(const nm of names){ const k=O.key(nm); if(!k) continue;
  const reads=(projects||[]).filter(p=>p&&!(typeof excludeId==='function'?excludeId(p):p.id===excludeId)&&(p.aaid||p.kind==='audition')&&O.key(offOf(p))===k);
  const cr=(credits||[]).filter(c=>c&&O.key(c.casting)===k);
  const h={name:nm.trim(),reads:reads.length,credits:cr.length,
   confirmed:reads.filter(p=>/^(confirmed|audition)/i.test(String(p.status||'')+' '+String(p.type||''))).length,
   callbacks:reads.filter(p=>p.outcome&&p.outcome.callback).length,
   pinned:reads.filter(p=>p.outcome&&p.outcome.pinned).length,
   booked:cr.length+reads.filter(p=>p.outcome&&p.outcome.booked).length,last:null};
  const dated=reads.map(p=>({p,t:when(p.date)||when(p.when)||when(p.deadline)})).filter(x=>x.t).sort((a,b)=>b.t-a.t);
  if(dated.length){ const p=dated[0].p; h.last={title:p.project||p.title||'',role:p.role||'',when:new Date(dated[0].t).toLocaleDateString(undefined,{month:'short',year:'numeric'})}; }
  if(!best||h.reads+h.credits>best.reads+best.credits) best=h; }
 return best;
};
const pl=(n,w)=>n+' '+w+(n===1?'':'s');
O.words=function(h){
 if(!h) return '';
 if(!h.reads&&!h.credits) return 'First time with '+h.name+'. Nothing from them in your Hub.';
 const bits=[];
 if(h.reads) bits.push(pl(h.reads,'read')+' before this');
 if(h.confirmed) bits.push(h.confirmed+' confirmed');
 if(h.callbacks) bits.push(pl(h.callbacks,'callback'));
 if(h.pinned) bits.push(h.pinned+' pinned');
 if(h.booked) bits.push(h.booked+' booked');
 let t='You and '+h.name+': '+bits.join(', ')+'.';
 if(h.last&&(h.last.title||h.last.role)) t+=' Last: '+[h.last.title,h.last.role].filter(Boolean).join(' / ')+', '+h.last.when+'.';
 return t;
};
/* the Hub's records, read-only, from this device. The demo actor doesn't count. */
O.load=function(){
 return new Promise(res=>{
  if(typeof indexedDB==='undefined') return res(null);
  let made=false; const r=indexedDB.open('colmac_hub');
  r.onupgradeneeded=e=>{ made=true; try{ e.target.transaction.abort(); }catch(x){} };   // no Hub on this device: don't create one
  r.onerror=()=>res(null);
  r.onsuccess=e=>{ const db=e.target.result;
   if(made||!db.objectStoreNames.contains('meta')){ db.close(); return res(null); }
   const st=db.transaction('meta','readonly').objectStore('meta'), out={};
   const get=k=>new Promise(ok=>{ const q=st.get(k); q.onsuccess=()=>ok(q.result?q.result.v:null); q.onerror=()=>ok(null); });
   Promise.all([get('projects'),get('credits')]).then(([p,c])=>{ db.close();
    const demo=x=>x&&(x.demo||String(x.aaid||'').indexOf('D1')===0);
    res({projects:(p||[]).filter(x=>!demo(x)),credits:(c||[]).filter(x=>!demo(x))}); });
  };
 });
};
g.Offices=O;
if(typeof module!=='undefined') module.exports=O;
})(typeof window!=='undefined'?window:globalThis);
