/* Home: the WRITE tools are the same everywhere they're listed: the WRITE section's tool list, its OPEN WRITE line,
   and EVERY TOOL at the bottom. Same tools, same order, same names, same few words, same links, same icons.
   node shared/test_writelists.js */
const fs=require('fs'), path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','how.html'),'utf8');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,600))); if(!x) ok=false; };
const txt=h=>h.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const a=s.indexOf('<section class="band write sub shut" id="write"'), band=s.slice(a,s.indexOf('</section>',a));
const A=[...band.matchAll(/<span class="tool-name">(<svg[\s\S]*?<\/svg>)([\s\S]*?)<\/span>[\s\S]*?<span class="tool-role">([\s\S]*?)<\/span>[\s\S]*?<a class="btn[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g)]
  .map(m=>({name:txt(m[2]).toLowerCase(),role:txt(m[3]),href:m[4],icon:(m[1].match(/href="#([^"]+)"/)||[])[1],btn:txt(m[5])}));
const fc=s.match(/<div class="fcol" data-dept="write">([\s\S]*?)<\/div><div class="fcol"/)[1];
const F=[...fc.matchAll(/<a class="ftool" href="([^"]+)">([\s\S]*?)<\/a>/g)].map(m=>({name:txt((m[2].match(/<b>([\s\S]*?)<\/b>/)||[])[1]||'').toLowerCase(),role:txt((m[2].match(/<i>([\s\S]*?)<\/i>/)||[])[1]||''),href:m[1],icon:(m[2].match(/href="#([^"]+)"/)||[])[1],raw:txt((m[2].match(/<b>([\s\S]*?)<\/b>/)||[])[1]||'')}));
const sum=txt(band.match(/<summary class="deptsum"><b>[\s\S]*?<\/b><span>([\s\S]*?)<\/span>/)[1]).split(/,\s*/).map(x=>x.toLowerCase());
const key=x=>x.map(t=>[t.name,t.role,t.href,t.icon].join(' | '));
want('five WRITE tools in each list', A.length===5&&F.length===5&&sum.length===5, [A.length,F.length,sum.length]);
want('the WRITE section and EVERY TOOL: same tools, order, words, links, icons', JSON.stringify(key(A))===JSON.stringify(key(F)), {A:key(A),F:key(F)});
want('OPEN WRITE names them in the same order', JSON.stringify(sum)===JSON.stringify(A.map(t=>t.name)), {sum,A:A.map(t=>t.name)});
want('each button opens the tool it names', A.every(t=>t.btn.toLowerCase()==='open '+t.name), A.map(t=>t.btn));
want('EVERY TOOL writes names the same way (no all-caps one but THEACTORPAGES, its name)', F.every(t=>t.raw==='THEACTORPAGES'||t.raw!==t.raw.toUpperCase()||/^[A-Z]{2,4}( |$)/.test(t.raw)), F.map(t=>t.raw));
want('THEACTORPAGES says what it does now: VOICE, GO-MODE, MARK UP, sides, it opens blank', /VOICE/.test(band)&&/GO-MODE/.test(band)&&/MARK UP/.test(band)&&/sides for the shoot day/i.test(band)&&/opens blank/.test(band));
want('no em dashes, no "thing" in the WRITE section', !/—/.test(txt(band))&&!/\bthings?\b/i.test(txt(band)));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
