/* Every storage key a tool writes is in the On This Device backup. Scans the tools for localStorage keys
   (literal keys in getItem/setItem, and KEY constants) and checks each one belongs to a tool in device/store.js.
   node shared/test_storekeys.js */
const fs=require('fs'), path=require('path'), D=require('../device/store.js');
const ROOT=path.join(__dirname,'..'), files=[];
(function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f), s=fs.statSync(p);
 if(s.isDirectory()){ if(!/^(node_modules|vendor|tests|\.git|server|gauntlet|fonts|icons|img|samples)$/.test(f)) walk(p); }
 else if(/\.(js|html)$/.test(f)&&!/^test_/.test(f)) files.push(p); } })(ROOT);
const keys=new Map();
const add=(k,f)=>{ if(!k||k.length<4||/\s/.test(k)) return; if(!keys.has(k)) keys.set(k,f); };
for(const f of files){ const t=fs.readFileSync(f,'utf8'), rel=path.relative(ROOT,f);
 for(const m of t.matchAll(/localStorage\.(?:getItem|setItem)\(\s*['"`]([^'"`$]+)['"`]/g)) add(m[1],rel);
 for(const m of t.matchAll(/\b(?:const|let|var)\s+[A-Z_]*KEY[A-Z_]*\s*=\s*['"]([^'"]+)['"]/g)) add(m[1],rel);
}
// keys that are not anyone's data: hand-offs, page settings handled elsewhere, the backup's own mark
const NOT_DATA=[/^hub_demo$/,/^tap_api$/,/^tap_wire$/,/^theactorpage_getkind$/,/^plan_lane$/,/^theactorpage_handoff_/,/^rooms_seen_/,/^theactorpage_device_v1$/,/^theactorpage_hot_ok$/,/^colmac\.theme$/];
const miss=[];
for(const [k,f] of keys){ const probe=/[:_-]$/.test(k)?k+'x':k; if(NOT_DATA.some(r=>r.test(probe))) continue; if(!D.toolOfKey(probe)) miss.push(k+'  ('+f+')'); }
const dbs=new Map(); for(const f of files){ const t=fs.readFileSync(f,'utf8'); for(const m of t.matchAll(/indexedDB\.open\(\s*['"]([^'"]+)['"]/g)) dbs.set(m[1],path.relative(ROOT,f)); }
const dmiss=[...dbs].filter(([n])=>!D.toolOfDb(n)||!D.KNOWN_DBS.includes(n)).map(([n,f])=>n+'  ('+f+')');
console.log((dmiss.length?'FAIL ':'PASS ')+'every database a tool opens is in the backup ('+dbs.size+')'+(dmiss.length?'\n  '+dmiss.join('\n  '):''));
console.log((miss.length?'FAIL ':'PASS ')+'every storage key a tool writes is in the backup ('+keys.size+' keys)'+(miss.length?'\n  '+miss.join('\n  '):''));
process.exit(miss.length||dmiss.length?1:0);
