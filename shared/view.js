/* THEACTORPAGE YOUR VIEW: which departments you see. ACT, WRITE, FILM: any one, two or all three (all three to start).
   Hidden means out of sight, nothing more: nothing is deleted, every tool still opens from its own link, and turning a
   department back on brings everything back as it was. Kept on this phone.
   On home: that department's band and footer column go. Everywhere: a link that jumps into a hidden department goes
   (a link inside the department you're in always stays). Loaded by every page. */
(function(g){
const V={}, KEY='theactorpage_view', D=['act','write','film'];
V.DEPTS=D; V.NAMES={act:'ACT',write:'WRITE',film:'FILM'};
V.MAP={act:['actor-os','breakdown','memorizer','cps','booth','notes','spotted','headshots','slate','archbook','resume','hub'],write:['write','papertrail','setlist'],film:['film','filmhub','backlot']};
const FOLDER={}; D.forEach(d=>V.MAP[d].forEach(f=>FOLDER[f]=d));
const LS=g.localStorage;
V.get=function(){ const o={act:true,write:true,film:true}; let v=null; try{ v=JSON.parse(LS.getItem(KEY)||'null'); }catch(e){}
 if(v&&typeof v==='object') D.forEach(d=>{ if(v[d]===false) o[d]=false; }); return D.some(d=>o[d])?o:{act:true,write:true,film:true}; };
V.has=d=>!d||V.get()[d]!==false;
V.all=()=>D.every(d=>V.has(d));
V.shown=()=>D.filter(d=>V.has(d));
/* at least one stays on */
V.set=function(d,on){ if(D.indexOf(d)<0) return false; const o=V.get(); o[d]=!!on; if(!D.some(x=>o[x])) return false;
 try{ LS.setItem(KEY,JSON.stringify(o)); }catch(e){} V.apply(); try{ g.dispatchEvent(new CustomEvent('theactorpage:view',{detail:o})); }catch(e){} return true; };
/* which department a page link goes to ('' for home, files, other sites) */
V.deptOf=function(href,base){ let u; try{ u=new URL(href,base||(g.location&&g.location.href)||'http://x/'); }catch(e){ return ''; }
 if(g.location&&u.origin!==g.location.origin) return '';
 const seg=u.pathname.split('/'); for(let i=0;i<seg.length;i++){ const d=FOLDER[seg[i]]; if(d){ const rest=seg.slice(i+1).join('/'); if(rest===''||/^[\w.-]+\.html?$/i.test(rest)) return d; return ''; } }
 return ''; };
V.here=()=>g.location?V.deptOf(g.location.href):'';
function css(){ if(typeof document==='undefined'||document.getElementById('viewcss')) return; const s=document.createElement('style'); s.id='viewcss';
 s.textContent='[data-vhide]{display:none!important}'; (document.head||document.documentElement).appendChild(s); }
/* what a hidden link takes with it: its list item, or a line that's only there for it */
function holder(a){ const p=a.parentElement; if(!p) return a; if(p.tagName==='LI') return p;
 if(p.tagName==='P'&&p.querySelectorAll('a,button').length===1) return p; return a; }
V.apply=function(root){ if(typeof document==='undefined') return; css(); root=root||document; const here=V.here(), v=V.get();
 if(document.body) D.forEach(d=>document.body.classList.toggle('v-no-'+d,!v[d]));
 root.querySelectorAll('[data-dept]').forEach(el=>{ const d=el.dataset.dept; el.toggleAttribute('data-vhide',!!d&&d!==here&&!v[d]); });
 root.querySelectorAll('a[href]').forEach(a=>{ if(a.closest('[data-vkeep]')) return; const d=V.deptOf(a.getAttribute('href')); const h=holder(a);
  if(d&&d!==here&&!v[d]){ h.setAttribute('data-vhide',''); h.dataset.vby='1'; } else if(h.dataset.vby){ h.removeAttribute('data-vhide'); delete h.dataset.vby; } }); };
if(typeof document!=='undefined'){
 let q=0; const later=()=>{ if(q) return; q=requestAnimationFrame(()=>{ q=0; V.apply(); }); };
 const go=()=>{ V.apply(); try{ new MutationObserver(later).observe(document.body,{childList:true,subtree:true}); }catch(e){} };
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
 g.addEventListener('storage',e=>{ if(e.key===KEY) V.apply(); });
}
g.View=V;
if(typeof module!=='undefined') module.exports=V;
})(typeof window!=='undefined'?window:globalThis);
