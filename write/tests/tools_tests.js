/* THEACTORPAGES · TOOLS: counts from the blocks, nothing written. Made-up script.  node write/tests/tools_tests.js */
const WT=require('../panel-tools.js'), T=require('../../papertrail/trail.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
let id=0; const B=(type,text)=>({id:'b'+(++id),type,text});
const S=[B('Action','COLD OPEN. Rain.'),B('Scene Heading','INT. DINER - NIGHT'),B('Action','Rain on the glass.'),B('Character','DANA PELL'),B('Dialogue',"We're closed. Go home now."),B('Character','ROSS'),B('Parenthetical','(wet)'),B('Dialogue','Door was open.'),
 B('Scene Heading','EXT. MAES HOUSE - DAY'),B('Character','DANA PEL'),B('Dialogue','Hi.'),B('Character','JON'),B('Action',''),B('Scene Heading','THE ROOF'),B('Dialogue','Who said this?'),B('Parenthetical','(alone)'),
 B('Scene Heading',"INT. MAE'S HOUSE - NIGHT"),B('Scene Heading','INT. GARAGE - DAY'),B('Action','MILO'),B('Action','He walks in, soaked to the skin.'),B('Character','JOHN'),B('Dialogue','(beat)'),B('Character','JON'),B('Dialogue','*Yes.*'),B('Action','Wind.'),B('Parenthetical','(quietly)')];
const sc=WT.scenes(S);
want('scenes: a cold open before the first heading, then each heading', sc.map(s=>s.n+':'+(s.heading||'-')).join('|')==="0:-|1:INT. DINER - NIGHT|2:EXT. MAES HOUSE - DAY|3:THE ROOF|4:INT. MAE'S HOUSE - NIGHT|5:INT. GARAGE - DAY", sc.map(s=>s.heading));
const c=WT.carry(sc[1].blocks); want('who talks: words spoken, parentheticals out', c.map(x=>x.name+' '+x.words+' '+x.pct+'%').join('|')==='DANA PELL 5 63%|ROSS 3 38%', c);
const D=WT.drifts(S);
want('name drift: DANA PELL / DANA PEL, JON / JOHN', D.people.some(p=>[p.a.name,p.b.name].sort().join()==='DANA PEL,DANA PELL')&&D.people.some(p=>[p.a.name,p.b.name].sort().join()==='JOHN,JON'), D.people.map(p=>p.a.name+'/'+p.b.name));
want('name drift: MAES HOUSE / MAE\'S HOUSE, same letters', D.places.some(p=>p.same&&[p.a.name,p.b.name].sort().join()==="MAE'S HOUSE,MAES HOUSE"), D.places);
want('a first name against a full name is not drift', !WT.drift([{name:'DANA'},{name:'DANA PELL'}]).length);
want('short names one letter apart are not drift (BO / BOB)', !WT.drift([{name:'BO'},{name:'BOB'}]).length);
const F=WT.format(S), has=(w,t)=>F.some(x=>x.what===w&&(!t||x.text===t));
want('format: a name with no line under it', has('A name with no line under it','JON'));
want('format: a line with no name over it', has('A line with no name over it','Who said this?'));
want('format: a parenthetical on its own, after action', has('A parenthetical on its own','(quietly)')&&!has('A parenthetical on its own','(alone)'));
want('format: a scene heading without INT. or EXT.', has('A scene heading without INT. or EXT.','THE ROOF'));
want('format: a scene with nothing in it', has('A scene with nothing in it',"INT. MAE'S HOUSE - NIGHT"));
want('format: a name typed as action', has('A name typed as action?','MILO'));
want('format: a parenthetical typed as dialogue', has('A parenthetical typed as dialogue','(beat)'));
want('format: a clean speech isn\'t flagged', !F.some(x=>x.text==='DANA PELL'||x.text==="We're closed. Go home now."));
// repeats on the blocks, through Paper Trail's reader
let R2=[]; for(let i=0;i<5;i++){ R2.push(B('Scene Heading','INT. ROOM '+i+' - DAY'),B('Action','Suddenly a crash. Suddenly a scream.')); }
const R=T.repeats(WT.forRepeats(R2)); want('repeats work on the blocks: "suddenly"', R.action.some(x=>x.w==='suddenly'&&x.n===10), R.action);
// today
const mem={}, st={get:k=>mem[k],set:(k,v)=>mem[k]=v}, d1=new Date(2026,9,19,9), d2=new Date(2026,9,19,15), d3=new Date(2026,9,20,9);
WT.today(st,'s1',{words:1000,pages:10,date:d1}); const t=WT.today(st,'s1',{words:1412,pages:12,date:d2});
want('today: from where it stood this morning', t.words===412&&t.pages===2&&WT.todayWords(t,{words:150}).join(' ')==='Today: +412 words, +2 pages. This sitting: +150 words.', [t,WT.todayWords(t,{words:150})]);
want('a new day starts at zero', WT.today(st,'s1',{words:1412,pages:12,date:d3}).words===0);
want('cutting counts as minus', WT.todayWords({words:-30,pages:-1})[0]==='Today: -30 words, -1 page.');
const cast=WT.cast(['DANA','ROSS','MILO'],[{name:'a',lang:'en-US'},{name:'b',lang:'en-GB'},{name:'c',lang:'fr-FR'}]);
want('hear it: a voice each, English first, pitches differ', cast.map(x=>x.voice.name).join()==='a,b,a'&&new Set(cast.map(x=>x.pitch)).size===3, cast);
want('no em dashes in anything it says', !/—/.test(JSON.stringify([F,D,WT.todayWords(t,{words:1})])));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
