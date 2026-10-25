/* shared/characters.js merge: the same name in the same project is one character across tools; names that aren't
   characters are left out; your places add, never take off a tool's. node shared/test_characters.js */
const C=require('./characters.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const L=C.merge([{name:'Dana Pell',project:'Salt Road',group:'aud',tool:'hub',label:'Project Hub',at:'2026-10-01'},{name:'DANA PELL',project:'salt road',group:'aud',tool:'shelf',label:'Your sides',at:'2026-09-30'},{name:'Dana Pell',project:'Salt Road',group:'booked',tool:'hub',label:'Project Hub',at:'2026-10-09',step:'Booked'},
 {name:'YOU',project:'x',group:'aud'},{name:'Voice over',project:'Ad',group:'aud'},{name:'MAE (V.O.)',project:'Ridge',group:'wrote',tool:'wb'},{name:'Mae',project:'Ridge',group:'wrote',tool:'papertrail'}],{added:[{name:'Willa',project:'',groups:['want']}],extra:{'DANA PELL|SALT ROAD':['pull']},hidden:{},notes:{'DANA PELL|SALT ROAD':'apron'}});
const d=L.find(c=>c.name==='DANA PELL');
want('one character from two tools, the same name and project', L.filter(c=>/DANA/.test(c.name)).length===1&&d.sources.length===2, L);
want('the tools say auditioned and booked; you added pull off', d.groups.aud==='tool'&&d.groups.booked==='tool'&&d.groups.pull==='you', d.groups);
want('the trail and the note', d.trail.length===1&&d.trail[0].step==='Booked'&&d.note==='apron');
want('YOU and Voice over are not characters', !L.some(c=>c.name==='YOU'||/VOICE/.test(c.name)));
want('(V.O.) is the same character', L.filter(c=>/MAE/.test(c.name)).length===1);
want('your own: want to create', L.some(c=>c.name==='WILLA'&&c.groups.want==='you'&&c.yours));
const n=C.counts(L); want('counts', n.aud===1&&n.booked===1&&n.pull===1&&n.want===1&&n.wrote===1, n);
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
