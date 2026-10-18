/* WHO CARRIES THE SCENE and REPEATS: counts only, nothing changed. Made-up scenes.
   node papertrail/tests/repeats_tests.js */
const T=require('../trail.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const S=(text,names)=>({text,lines:names.map(n=>({name:n,lines:1}))});
const s1=S("Rain on the glass.\nDANA PELL: We're closed. Go home.\nROSS: Door was open.\nDANA PELL: Door's always open. Sign says closed. Read it.",['DANA PELL','ROSS']);
const c=T.carry(s1);
want('who carries the scene: words and speeches, biggest first', c.map(x=>x.name+' '+x.speeches+' '+x.words+' '+x.pct+'%').join('|')==='DANA PELL 2 12 80%|ROSS 1 3 20%', c);
want('a name that starts like another isn\'t confused (DANA / DANA PELL)', T.carry(S("DANA PELL: Hi.\nDANA: Yo there.",['DANA','DANA PELL'])).map(x=>x.name+x.words).sort().join()==='DANA PELL1,DANA2');
want('action lines aren\'t anybody\'s', T.carry(S('Rain falls.\nThunder.',['DANA'])).length===0);
// repeats: "suddenly" six times in scenes 3 to 5, once early; a name never counts; "the" never counts
const sc=[S('Dana walks in. Suddenly the lights go out.\nDANA: Dana here.',['DANA']),S('Quiet.',['DANA']),S('Suddenly a crash. Suddenly a scream.',['DANA']),S('Suddenly she runs. Suddenly she stops.\nDANA: You liar. You liar. You liar. You liar.',['DANA']),S('Suddenly, silence. The lights come back.\nDANA: Liar.',['DANA'])];
const R=T.repeats(sc);
const sud=R.action.find(x=>x.w==='suddenly');
want('"suddenly": 6 times, 5 bunched in scenes 3 to 5', sud&&sud.n===6&&sud.near.n===5&&sud.near.from===2&&sud.near.to===4, sud);
want('in words', T.repeatWords(sud)==='6 times, 5 in scenes 3 to 5');
want('names and little words never count', !R.action.concat(R.dialogue).some(x=>['dana','the','she'].includes(x.w)));
want('dialogue kept apart: "liar" 5 times', (R.dialogue.find(x=>x.w==='liar')||{}).n===5&&!R.action.some(x=>x.w==='liar'), R.dialogue);
want('a phrase that comes back: "you liar you"', R.phrases.some(x=>x.w==='you liar you'), R.phrases);
want('a phrase of only little words never counts', !R.phrases.some(x=>x.w.split(' ').every(w=>T.STOP.has(w))));
want('a word said twice is not a repeat', !R.action.some(x=>x.w==='lights'));
want('the scenes are numbered the way you number them', T.repeatWords(sud,i=>['1','2','3A','4','5'][i])==='6 times, 5 in scenes 3A to 5');
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
