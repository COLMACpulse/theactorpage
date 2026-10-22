/* THIS WEEK, the pure part. Made-up names only.  node shared/test_week.js */
const W=require('./week.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const D='2026-10-21'; // a Wednesday
want('when: today, tomorrow, a weekday, a date', W.when('2026-10-21',D)==='today'&&W.when('2026-10-22',D)==='tomorrow'&&W.when('2026-10-23',D)==='Friday'&&W.when('2026-11-14',D)==='Nov 14'&&W.when('2027-06-01',D)==='Jun 1, 2027');
const w=W.list({
 requests:[{title:'Harbor Lights',role:'Deckhand',due:'2026-10-23T12:00'},{title:'Old One',due:'2026-10-01'},{title:'Far Off',due:'2026-12-01'}],
 contacts:[{name:'Morgan Lee',rep:{next:'2026-10-19',step:'submitted'}},{name:'Not Yet',rep:{next:'2026-10-30',step:'submitted'}}],
 footage:[{id:'f1',line:'Dust Road is out. Ask for your footage.'}],
 press:[{id:'p1',title:'Low Tide',date:'2026-11-05',outlets:[{name:'Sam Writer',reached:'2026-10-10',reply:'none'},{name:'Jo Host',reached:'',reply:'none'}]}],
 reps:{have:true,last:Date.parse('2026-10-01T12:00:00'),rhythm:'2weeks'},
 goal:{text:'Book a co-star',by:'2027-06-01'}
},D);
const t=w.lines.map(l=>l.line);
want('soonest first: the overdue follow-up, then the tape due Friday; an old or far-off request is left out', t[0]==='Follow up with Morgan Lee (it was Oct 19).'&&t[1]==='Tape due Friday: Harbor Lights, Deckhand.'&&!t.some(x=>/Old One|Far Off/.test(x)), t);
want('a follow-up that was due, said when; one not due yet left out', t.includes('Follow up with Morgan Lee (it was Oct 19).')&&!t.some(x=>/Not Yet/.test(x)), t);
want('footage from FOOTAGE, as it says it', t.includes('Dust Road is out. Ask for your footage.'));
want('press: your news coming up, who is not reached yet, and no reply in a week', t.includes('Low Tide: your news is Nov 5.')&&t.includes('Low Tide: 1 on your press list not reached yet.')&&t.some(x=>/^No reply from Sam Writer since Oct 10\. A short follow-up, or let it go\.$/.test(x)), t);
want('the reps sheet when its rhythm says so', t.includes('Your reps sheet: it’s been 20 days.'), t);
want('every line links to its tool', w.lines.every(l=>/^(actor-os|contacts|footage|press|hub)\//.test(l.href)));
want('your goal, in your words, with its date', w.goal.text==='Book a co-star'&&w.goal.by==='2027-06-01');
const q=W.list({reps:{have:true,last:null,rhythm:'change'}},D);
want('reps but never sent: says so, once', q.lines.length===1&&q.lines[0].line==='Your reps haven’t had a sheet from you yet.');
want('nothing at all: nothing, and no goal', W.list({},D).lines.length===0&&W.list({},D).goal===null);
want('no score, no counts of how you are doing, no "thing", no em dashes', !/score|streak|%|\bthings?\b|—/.test(t.join(' '))&&!/—/.test(require('fs').readFileSync(__dirname+'/week.js','utf8')));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
