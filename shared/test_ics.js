/* CALENDAR FILES, the pure part. Made-up plan only.  node shared/test_ics.js */
const I=require('./ics.js'), mem={}; globalThis.localStorage={getItem:k=>mem[k]||null,setItem:(k,v)=>{mem[k]=String(v);}};
const P=require('./plan.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,600))); if(!x) ok=false; };
const t=I.make([{uid:'a',date:'2026-10-28',title:'Harbor Lights: TAPE IT'},{uid:'b',date:'2026-10-29',time:'10:00',mins:30,title:'Harbor Lights: SEND IT, by 10',notes:'Direct submit; Actors Access',url:'https://example.com/plan/?p=1'},{uid:'c',date:'2026-10-29',time:'23:45',mins:30,title:'late'},{date:'nope',title:'bad'}],{now:'2026-10-22T12:00:00Z',name:'THE PLAN'});
const L=t.split('\r\n');
want('a calendar file: begins, ends, lines end the way calendars expect', L[0]==='BEGIN:VCALENDAR'&&L[L.length-2]==='END:VCALENDAR'&&/\r\n$/.test(t)&&!/[^\r]\n/.test(t));
want('three events, the bad date left out', (t.match(/BEGIN:VEVENT/g)||[]).length===3);
want('no time: all day, a reminder at 9 that morning', /UID:a@theactorpage\r\nDTSTAMP:20261022T120000Z\r\nDTSTART;VALUE=DATE:20261028\r\nDTEND;VALUE=DATE:20261029\r\nTRANSP:TRANSPARENT/.test(t)&&/SUMMARY:Harbor Lights: TAPE IT\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Harbor Lights: TAPE IT\r\nTRIGGER:PT9H/.test(t), t);
want('a time: that time, half an hour, a reminder 2 hours before', /DTSTART:20261029T100000\r\nDTEND:20261029T103000/.test(t)&&/TRIGGER:-PT2H/.test(t));
want('past midnight rolls to the next day', /DTSTART:20261029T234500\r\nDTEND:20261030T001500/.test(t));
want('commas and semicolons escaped, the link kept', /SUMMARY:Harbor Lights: SEND IT\\, by 10/.test(t)&&/DESCRIPTION:Direct submit\\; Actors Access\\nhttps:\/\/example.com/.test(t.replace(/\r\n /g,''))&&/URL:https:\/\/example.com\/plan\/\?p=1/.test(t));
want('long lines folded at 75', L.every(l=>Buffer.byteLength(l)<=75));
const h=P.hear("audition for next thursday. ridgeline casting. guest star. harbor lights. i have a reader, tape it wednesday. due at 11am, direct submit on actors access.",'2026-10-22'), p=P.make('x',h,'2026-10-22');
const ev=P.events(p,'https://example.com/plan/?p='+p.id);
want('the plan as events: each step, SEND at an hour before, the deadline at its time', ev.length===p.plan.steps.length+1&&ev.find(e=>/SEND IT/.test(e.title)).time==='10:00'&&ev.find(e=>/^DUE: Harbor Lights \(Guest star\)/.test(e.title)).time==='11:00', ev.map(e=>e.title+' '+e.date+' '+e.time));
want('the same step keeps the same id, so opening it again updates it', P.events(p)[0].uid===ev[0].uid&&/^plan-p/.test(ev[0].uid));
P.toggle(p.id,0); want('steps you\'ve done are left out', P.events(P.get(p.id)).length===ev.length-1);
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
