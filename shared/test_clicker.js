/* CLICKER counting: presses close together are one group; 1, 2, 3; a double-sent key is one press. node shared/test_clicker.js */
const C=require('./clicker.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x?'':' '+JSON.stringify(y))); if(!x) ok=false; };
function run(times){ let t=0; const q=[], got=[]; const p=C.counter(n=>got.push(n),{now:()=>t,later:(f,ms)=>{ const o={at:t+ms,f}; q.push(o); return o; },stop:o=>{ o.f=null; }});
 const tick=to=>{ q.sort((a,b)=>a.at-b.at); for(const o of q.slice()) if(o.at<=to&&o.f){ t=o.at; const f=o.f; o.f=null; f(); } t=to; };
 times.forEach(at=>{ tick(at); p(); }); tick(1e6); return got; }
want('one press: 1', JSON.stringify(run([0]))==='[1]', run([0]));
want('two quick presses: 2', JSON.stringify(run([0,300]))==='[2]', run([0,300]));
want('three: 3 at once, no waiting', JSON.stringify(run([0,250,500]))==='[3]');
want('a remote that sends two keys for one push: still 1', JSON.stringify(run([0,40]))==='[1]', run([0,40]));
want('two pushes far apart: 1 then 1', JSON.stringify(run([0,1500]))==='[1,1]');
want('four fast: 3 then 1', JSON.stringify(run([0,200,400,600]))==='[3,1]', run([0,200,400,600]));
want('a slow double (700 ms apart) is two singles', JSON.stringify(run([0,700]))==='[1,1]');
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
