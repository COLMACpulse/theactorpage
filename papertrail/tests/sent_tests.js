/* SENT OUT: the words for each one, the summary, deadlines coming up. Made-up entries.  node papertrail/tests/sent_tests.js */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
require('../../film/film.js');
const T=require('../trail.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };
const L=[{where:'Salt Flats Screenplay Contest',kind:'contest',status:'sent',sent:'2026-09-02',fee:'65',draft:'Draft 2'},{where:'Northgate Pictures',kind:'company',status:'passed',sent:'2026-07-10',heard:'2026-08-01'},{where:'Dry Creek Fellowship',kind:'fellowship',status:'planned',deadline:'2026-10-25',fee:'$40'},{where:'Wren Ashby (manager)',kind:'manager',status:'asked',sent:'2026-10-01'}];
ok('one line each, in plain words', T.sendWords(L[0])==='Contest · sent Sep 2, 2026 · fee $65 · Draft 2', T.sendWords(L[0]));
ok('going to send: says the deadline', T.sendWords(L[2])==='Fellowship or lab · deadline Oct 25, 2026 · fee $40', T.sendWords(L[2]));
ok('heard back: said', /heard Aug 1, 2026/.test(T.sendWords(L[1])));
ok('the summary: sent, each mark, the fees', T.sendSummary(L)==='3 sent · 1 waiting · 1 asked for more · 1 passed · 1 going to send · $105 in fees', T.sendSummary(L));
ok('nothing yet', T.sendSummary([])==='Nothing sent yet.');
const due=T.sendDue(L,new Date('2026-10-18T09:00:00').getTime());
ok('a deadline in the next 30 days, in days', due.length===1&&due[0].days===7&&due[0].e.where==='Dry Creek Fellowship', due);
ok('a deadline gone by is not listed', T.sendDue(L,new Date('2026-11-01T09:00:00').getTime()).length===0);
ok('as text, a line each', T.sendText([{title:'Ridge Line',e:L[0]}])==='Ridge Line | Salt Flats Screenplay Contest | Sent, waiting | Contest · sent Sep 2, 2026 · fee $65 · Draft 2', T.sendText([{title:'Ridge Line',e:L[0]}]));
ok('no em dashes', !/—/.test(L.map(T.sendWords).join()+T.sendSummary(L)));
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
