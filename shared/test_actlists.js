/* Home: the ACT tools are the same everywhere they're listed: the ACT section's tool list, its SEE EVERY ACT TOOL
   line, the ACT tools grid, and EVERY TOOL at the bottom. Same tools, same order, same names, same few words,
   same links, same icons.  node shared/test_actlists.js */
const fs=require('fs'), path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','how.html'),'utf8');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,600))); if(!x) ok=false; };
const txt=h=>h.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const a=s.indexOf('<section class="band act" id="act"'), band=s.slice(a,s.indexOf('</section>',a));
const A=[...band.matchAll(/<span class="tool-name">(<svg[\s\S]*?<\/svg>)([\s\S]*?)<\/span>[\s\S]*?<span class="tool-role">([\s\S]*?)<\/span>[\s\S]*?<a class="btn[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g)]
  .map(m=>({name:txt(m[2]).toLowerCase(),role:txt(m[3]),href:m[4],icon:(m[1].match(/href="#([^"]+)"/)||[])[1],btn:txt(m[5])}));
const gi=s.indexOf('<nav class="deptgrid" aria-label="ACT tools">'), grid=s.slice(gi,s.indexOf('</nav>',gi));
const G=[...grid.matchAll(/<a class="dg" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(m=>{ const parts=m[2].replace(/<svg[\s\S]*?<\/svg>/,'').split(/<\/?[^>]+>/).map(x=>x.trim()).filter(Boolean);
  return {name:(parts[0]||'').toLowerCase(),role:parts[1]||'',href:m[1],icon:(m[2].match(/href="#([^"]+)"/)||[])[1]}; });
const fc=s.match(/<div class="fcol" data-dept="act">([\s\S]*?)<\/div><div class="fcol"/)[1];
const F=[...fc.matchAll(/<a class="ftool" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(m=>({name:txt((m[2].match(/<b>([\s\S]*?)<\/b>/)||[])[1]||'').toLowerCase(),role:txt((m[2].match(/<i>([\s\S]*?)<\/i>/)||[])[1]||''),href:m[1],icon:(m[2].match(/href="#([^"]+)"/)||[])[1],raw:txt((m[2].match(/<b>([\s\S]*?)<\/b>/)||[])[1]||'')}));
const sum=txt(band.match(/<summary class="deptsum"><b>[\s\S]*?<\/b><span>([\s\S]*?)<\/span>/)[1]).split(/,\s*/).map(x=>x.toLowerCase());
const key=x=>x.map(t=>[t.name,t.role,t.href,t.icon].join(' | '));
want('nine ACT tools in each list', A.length===9&&G.length===9&&F.length===9&&sum.length===9, [A.length,G.length,F.length,sum.length]);
want('the ACT section and EVERY TOOL: same tools, order, words, links, icons', JSON.stringify(key(A))===JSON.stringify(key(F)), {A:key(A),F:key(F)});
want('the ACT tools grid: the same', JSON.stringify(key(G))===JSON.stringify(key(A)), {G:key(G),A:key(A)});
want('SEE EVERY ACT TOOL names them in the same order', JSON.stringify(sum)===JSON.stringify(A.map(t=>t.name)), {sum,A:A.map(t=>t.name)});
want('each button opens the tool it names', A.every(t=>t.btn.toLowerCase()==='open '+t.name), A.map(t=>t.btn));
want('EVERY TOOL writes names the same way (no all-caps one)', F.every(t=>t.raw!==t.raw.toUpperCase()||/^[A-Z]{2,4}( |$)/.test(t.raw)), F.map(t=>t.raw));
want('Résumé spelled with its accents everywhere on home', !/Virtual Resume|VIRTUAL RESUME/.test(s));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
