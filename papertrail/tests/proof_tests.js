/* PROOF OF DRAFT: the receipt. Made-up drafts.  node papertrail/tests/proof_tests.js */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
require('../../film/film.js');
const T=require('../trail.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };
const H='a'.repeat(64), t0=Date.UTC(2026,9,1,14,5), made=Date.UTC(2026,9,17,20,30);
const R=T.proof([{title:'Ridge Line',drafts:[{label:'Draft 1',kind:'script',file:'ridge.fountain',added:t0,words:1240,sha:H,ok:true},{label:'Draft 2',kind:'script',file:'ridge 2.pdf',added:t0+86400000,words:1302,sha:'b'.repeat(64),ok:false}]}],made);
ok('title and when it was made, in UTC', /^PROOF OF DRAFT\nRidge Line\nMade 2026-10-17 20:30 UTC in Paper Trail/.test(R), R.slice(0,120));
ok('each draft: label, kind, file, came in, words, full fingerprint', /1\. Draft 1 \(script\) · ridge\.fountain\n   Came in 2026-10-01 14:05 UTC · 1,240 words\n   SHA-256 a{64}\n/.test(R), R);
ok('numbered in order', /\n2\. Draft 2 \(script\) · ridge 2\.pdf/.test(R));
ok('a draft whose words no longer match: said so', /no longer give the fingerprint this draft came in with/.test(R)&&R.match(/no longer give/g).length===1);
ok('says what it proves and what it does not', /What this proves: a file whose words give the same fingerprint is that draft, word for word\./.test(R)&&/What it does not prove: when you wrote it\./.test(R)&&/email this receipt to yourself or register the script/.test(R));
ok('how to check later', /CHECK A FILE/.test(R));
const A=T.proof([{title:'Ridge Line',drafts:[{label:'Draft 1',kind:'script',file:'a',added:t0,words:1,sha:H}]},{title:'Dry Gulch',drafts:[]}],made);
ok('several projects: a count, each project named, an empty one says so', /^PROOF OF DRAFT\n2 projects/.test(A)&&/\nRIDGE LINE\n/.test(A)&&/\nDRY GULCH\nNo drafts\./.test(A), A);
ok('no em dashes', !/—/.test(R+A));
ok('a bad date is blank, not "Invalid"', T.utc('x')==='');
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
