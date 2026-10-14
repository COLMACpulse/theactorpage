/* node memorizer/tests/run_tests.js  — engine + the shared sides reader */
const fs=require('fs'), path=require('path');
const E=require('../engine.js');
const win={}; new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(win);
const S=win.ActorSides;
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };

// words
ok('digits read as words', E.words('I told you 10 times, 21 days.').join(' ')==='i told you ten times twenty one days');
ok('curly quotes and dashes', E.words('Don’t — go.').join(' ')==="don't go");
ok('gonna stays gonna', E.words("I'm gonna").join(' ')==="i'm gonna");

// compare
let c=E.compare('I never said I wanted the money.','I never said I wanted the money');
ok('word for word', c.exact && c.say==='Word for word.', c.say);
c=E.compare('I never said I wanted the money.','never said I wanted the money');
ok('one dropped word costs one word', c.got===6 && c.missing.join()==='I' && /6 of 7/.test(c.say), c.say);
c=E.compare("I'm not telling you 10 times.","I'm not telling you ten times");
ok('10 said as ten is the same line', c.exact, c.say);
c=E.compare("I'm not gonna tell you.","I'm not going to tell you.");
ok('going to vs gonna is flagged', !c.exact && /Missed: gonna/.test(c.say) && /Added: going, to/.test(c.say), c.say);
ok('nothing heard says so', E.compare('Keys.','').say==='Nothing heard.');

// levels
ok('first letters keep punctuation', E.letters('You picked the wrong road, sweetheart. Keys.')==='Y P T W R, S. K.', E.letters('You picked the wrong road, sweetheart. Keys.'));
ok('first words stop at the first comma', E.firstWords('You picked the wrong road, sweetheart.')==='You picked the wrong…' || E.firstWords('You picked the wrong road, sweetheart.')==='You picked the wrong road,', E.firstWords('You picked the wrong road, sweetheart.'));
ok('short line shows whole at first words', E.firstWords('Keys.')==='Keys.', E.firstWords('Keys.'));
ok('nothing shows nothing', E.show('Keys.','none')==='');

// beats
const long="Because the truth was sitting in that room long before I walked in and you knew it and you said nothing. Nothing. So don't stand there.";
const bt=E.beats(long); ok('long speech breaks into beats', bt.length>=3, bt);
ok('short line is one beat', E.beats('Keys.').length===1);

// real-looking sides through the shared reader
const sides=`INT. GAS STATION - NIGHT

Cyrus leans on the counter.

CYRUS
You picked the wrong road,
sweetheart.
(beat)
Keys.

BRIN
I don't have any.

CYRUS (CONT'D)
NOW.

She drops them.

BRIN
Please.

CYRUS
Keys.`;
const beats=S.parse(sides);
ok('characters are only the people', JSON.stringify(S.speakers(beats).map(x=>x.name).sort())==='["BRIN","CYRUS"]', S.speakers(beats));
const items=E.items(S.script(beats,'CYRUS'));
ok('three Cyrus speeches, wrapped line joined, (beat) left out', items.length===3 && items[0].text==='You picked the wrong road, sweetheart. Keys.', items.map(i=>i.text));
ok('first speech has no cue', items[0].cue===null);
ok('cue is the other character, with their name', items[1].cue.who==='BRIN' && items[1].cue.text==="I don't have any.", items[1].cue);
ok('same words twice get different keys', items[2].text==='Keys.' && items[2].key!==items[0].key);
const two=E.items(S.script(S.parse('AL\nYes.\n\nBO\nWell?\n\nAL\nYes.'),'AL'));
ok('a repeated line keeps its own place', two.length===2 && two[0].key!==two[1].key, two.map(i=>i.key));

// schedule
const t0=1e12; let st={};
st=E.mark(st,'miss',t0); ok('missed comes back in 2 minutes', st.due-t0===2*60000 && E.status(st)==='work');
st=E.mark(st,'close',t0); ok('close comes back in 8 minutes', st.due-t0===8*60000 && E.status(st)==='work');
st=E.mark(st,'got',t0); ok('first got: 10 minutes, getting there', st.due-t0===10*60000 && E.status(st)==='getting');
st=E.mark(st,'got',t0); ok('second got: an hour, solid', st.due-t0===3600000 && E.status(st)==='solid');
st=E.mark(st,'got',t0); ok('third got: a day', st.due-t0===86400000);
st=E.mark(st,'miss',t0); ok('a miss after solid goes back to work', E.status(st)==='work' && st.streak===0);

const states={}; states[items[0].key]=E.mark({},'got',t0); states[items[1].key]=E.mark({},'miss',t0);
let q=E.queue(items,states,t0+1000);
ok('right after: only the new line is due', q.length===1 && q[0].key===items[2].key, q.map(x=>x.n));
q=E.queue(items,states,t0+3*60000);
ok('the miss comes first once due', q[0].key===items[1].key, q.map(x=>x.n));
ok('next due in words', E.inWords(E.nextDue(items,states)-(t0+1000))==='2 minutes', E.inWords(E.nextDue(items,states)-(t0+1000)));
const cnt=E.count(items,states); ok('count line', E.countLine(cnt)==='1 needs work · 1 getting there · 1 not drilled yet', E.countLine(cnt));

// LAST BUS fixture if present
const fx=process.argv[2];
if(fx&&fs.existsSync(fx)){
 const lb=S.parse(fs.readFileSync(fx,'utf8'));
 const sp=S.speakers(lb).map(x=>x.name);
 const it=E.items(S.script(lb,'CAL'));
 ok('LAST BUS: Cal\'s shouted line kept inside his speech', it.some(i=>/I SAID GET IN THE TRUCK/.test(i.text)), it.map(i=>i.text));
 console.log('   LAST BUS speakers:',sp.join(', '),'| Cal speeches:',it.length,'| Rennie speeches:',E.items(S.script(lb,'RENNIE')).length);
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
