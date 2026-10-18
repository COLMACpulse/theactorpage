/* Story Studio: WITH A CREW, the fourth way. Made-up scenes.  node film/tests/crew_tests.js */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
const F=require('../film.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,500))} };
const S=F.scenes('INT. DINER - NIGHT\n\nLena slides a key across the counter.\n\nLENA\nYou dropped this.\n\nROSS\nNo I didn\'t.\n\nEXT. PIER - DAY\n\nLENA\nThere.\n\nROSS\nWhere?\n\nDANA\nBehind you.\n\nPHONE (V.O.)\nCall me.\n');
ok('four ways, With a crew last', F.WAYS.map(w=>w.id).join()==='keep,compress,proof,crew'&&F.WAYS[3].name==='With a crew');
const L=F.shots(S[0],'crew','LENA',['key']);
ok('two people: master, two-shot, each over the shoulder and close, the insert, room tone', L.map(x=>x.id).join()==='wide,two,ots-LENA,cu-LENA,ots-ROSS,cu-ROSS,ins-key,tone', L.map(x=>x.id));
ok('in crew words: the other actor plays it off camera, no wardrobe swaps, no voices', /ROSS plays it off camera, so LENA has the eyeline/.test(L[2].how)&&!L.some(x=>/wardrobe|as a voice|stand-in/i.test(x.what+' '+x.how)), L);
const G=F.shots(S[1],'crew','',[]);
ok('three people: a group medium, every one covered; the voice still recorded', G.some(x=>x.id==='group')&&['LENA','ROSS','DANA'].every(n=>G.some(x=>x.id==='cu-'+n))&&G.some(x=>x.id==='vo-PHONE'), G.map(x=>x.id));
ok('everyone on camera', F.onCamera(S[1],'crew','LENA').join()==='LENA,ROSS,DANA');
ok('the solo ways unchanged', F.shots(S[0],'keep','LENA',['key']).some(x=>/wardrobe/.test(x.how))&&F.onCamera(S[0],'proof','LENA').join()==='LENA');
ok('no em dashes', !/—/.test(JSON.stringify(F.WAYS)+JSON.stringify(L)+JSON.stringify(G)));
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
