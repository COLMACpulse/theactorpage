/* node shared/test_spark.js : SPARK. One small thing, from what you have when you have it. Made-up names. */
const S=require('./spark.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x));} };
const seq=a=>{ let i=0; return ()=>a[i++%a.length]; };
const all=(room,ctx)=>{ const seen=new Set(); for(let i=0;i<400;i++){ const x=S.pick(room,ctx,'',Math.random); if(x) seen.add(x.t); } return [...seen]; };
const A=all('act',{});
ok('nothing in play: only general sparks, no blanks', A.length>2&&A.every(t=>!/\{|\}/.test(t)&&!/\b(undefined|null)\b/.test(t))&&!A.some(t=>/’s first speech/.test(t)), A);
const B=all('act',{me:'SAGE',sides:'The Watch'});
ok('your sides: sparks use your part and your sides', B.some(t=>t==='Say SAGE’s first speech out loud, once. No tape.'||t==='Say SAGE’s first speech out loud, once. No tape.')&&B.some(t=>/The Watch/.test(t)), B);
ok('your sides: mostly yours (7 in 10)', (()=>{ let y=0; for(let i=0;i<1000;i++){ const x=S.pick('act',{me:'SAGE',sides:'The Watch'},'',Math.random); if(/SAGE|The Watch/.test(x.t)) y++; } return y>600&&y<800; })());
ok('a tape due: the spark says when', all('act',{tape:'LOW TIDE',due:'Fri 5:00 PM'}).includes('LOW TIDE is due Fri 5:00 PM. Run it once, out loud, before you tape.'));
ok('never the same one twice in a row', (()=>{ let last=''; for(let i=0;i<200;i++){ const x=S.pick('write',{},last,Math.random); if(x.t===last) return false; last=x.t; } return true; })());
ok('WRITE with a draft: names it, goes to Paper Trail or GO', all('write',{draft:'Dry Creek'}).some(t=>t==='Open Dry Creek and change one line.'));
ok('FILM with a film: goes to Story Studio', (()=>{ const x=S.pick('film',{film:'The Watch'},'',seq([0.1,0])); return /The Watch/.test(x.t)&&x.go==='film/'; })());
ok('FILM with nothing: the home camera', (()=>{ const x=S.pick('film',{},'',seq([0.9,0])); return x.go==='#cam'&&x.label==='CAMERA'; })());
ok('WRITE general sparks open GO', S.LIST.write.filter(x=>!x.need).every(x=>x.go==='write/writers-blockage.html?go'));
ok('no counts, streaks or nagging words', !JSON.stringify(S.LIST).match(/streak|days in a row|you haven.t|don.t forget|reminder|score|\d+ days/i));
ok('no em dashes', !/—/.test(JSON.stringify(S.LIST)));
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
