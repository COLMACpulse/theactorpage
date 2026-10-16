/* node setlist/tests/run_tests.js : the SET LIST engine on made-up material */
const L=require('../set.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };
const P=[
 {id:'a',level:'joke',title:'GPS',text:'I am not saying I am bad at directions, but my GPS once asked me for an estimate.'},   // 18 words
 {id:'b',level:'joke',title:'Keys',text:'Dogs freak out over keys because they know we only do two things: leave, or lie about leaving.',repSecs:9.4},
 {id:'c',level:'bit',title:'Car stuff',text:'',parts:['a','b']},
 {id:'d',level:'act',title:'Small town',text:'So I moved back home.',parts:['c','gone']},
 {id:'e',level:'clip',title:'',text:''}];
const by={}; P.forEach(p=>by[p.id]=p);
ok('words, and an estimate at 150 a minute when there is no take', L.words(P[0].text)===18&&L.time(P[0],by).secs===7&&L.time(P[0],by).from==='words');
ok('your take wins over the estimate', L.time(P[1],by).secs===9&&L.time(P[1],by).from==='take');
ok('a bit is its parts added up, said as about when any part is an estimate', L.time(P[2],by).secs===16&&L.timeWords(L.time(P[2],by))==='about 0:16', L.timeWords(L.time(P[2],by)));
ok('an act: its own words (the segue) + its parts; a deleted part is said', L.time(P[3],by).secs===18&&/1 part deleted/.test(L.timeWords(L.time(P[3],by))), [L.time(P[3],by),L.timeWords(L.time(P[3],by))]);
ok('empty piece: no time yet', L.timeWords(L.time(P[4],by))==='no time yet');
ok('a bit can hold jokes and clips, not an act; nothing holds itself', L.canHold(P[2],P[0])&&!L.canHold(P[2],P[3])&&!L.canHold(P[2],P[2])&&L.canHold(P[3],P[2]));
const loop={id:'x',level:'bit',parts:['y']}, loop2={id:'y',level:'joke',parts:['x'],text:'one two three'}; ok('a loop does not hang', L.time(loop,{x:loop,y:loop2}).secs>=0);
const S={id:'s1',name:'Open mic',target:300,items:['b','c','gone']};
const st=L.setTime(S,by); ok('set time: pieces added, estimate said, deleted piece counted', st.secs===25&&st.est&&st.gone===1, st);
ok('set against its target, in words', L.setWords(S,by)==='about 0:25 · 4:35 under 5:00', L.setWords(S,by));
ok('right on within 5 seconds', L.setWords({items:['b'],target:10},by)==='0:09 · right on 0:10', L.setWords({items:['b'],target:10},by));
ok('move up and down, never off the ends', JSON.stringify(L.move(['a','b','c'],2,-1))==='["a","c","b"]'&&JSON.stringify(L.move(['a','b'],0,-1))==='["a","b"]');
const p={done:[{how:'killed',at:1},{how:'died',at:3,note:'drunk crowd'},{how:'killed',at:2}]};
ok('how it went: your marks counted, newest note', L.howCounts(p)==='Killed 2 · Died 1'&&L.lastHow(p).note==='drunk crowd', L.howCounts(p));
const stage=L.stageText(S,by); ok('stage list: numbered, short, big, with the time', stage==='OPEN MIC\nabout 0:25 · 4:35 under 5:00\n\n1. KEYS\n2. CAR STUFF\n3. (deleted)\n', stage);
const tx=L.setText({name:'Open mic',items:['c']},by); ok('set as words: the bit with its jokes inside, in order', /1\. Car stuff \[BIT, about 0:16\]\nI am not saying.*estimate\.\n\nDogs freak out/.test(tx), tx);
ok('times read back: 5 = 5 min, 4:30, nonsense = nothing', L.parseTime('5')===300&&L.parseTime('4:30')===270&&L.parseTime('soon')===null);
ok('no score words, no em-dash anywhere in the engine text', !/score|rating|—/i.test(JSON.stringify([L.LEVELS,L.HOW,L.PREMISES,L.CUES,L.CAPTIONS,L.QUESTIONS])));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
