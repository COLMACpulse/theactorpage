/* FOR MY REPS: the sheet, what's new since last time, when it's due. Made-up offices and people only. node shared/test_repsheet.js */
const R=require('./repsheet.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x?'':' '+JSON.stringify(y).slice(0,500))); if(!x) ok=false; };
const src=()=>({name:'Riley Hart',page:'https://riley-hart.theactorpage.com/',at:Date.parse('2026-10-20T12:00:00Z'),
 offices:[{name:'Ridge Casting',gate:'warm',reads:6,inroom:2,callbacks:1,booked:0,last:{title:'Cold Creek',role:'Wes'},people:['Dana Pell']},
  {name:'Harbor Light Casting',gate:'worked_with',reads:2,inroom:1,booked:1},{name:'Mesa Casting',gate:'seen_you',reads:4},
  {name:'North Star Casting',gate:'want',reads:0,why:'They cast the westerns I fit'},{name:'Quiet Office',gate:'do_not_contact',reads:3},
  {name:'Once Casting',gate:'cold',reads:1},{name:'Twice Casting',gate:'cold',reads:2}],
 credits:[{title:'Harbor Street',net:'FX',director:'Sam Ortiz'},{title:'Signal Loss',net:'AMC'},{title:'Night Shift',net:'FX'},{title:'Five Miles Out',net:'Independent'}],
 people:[{name:'Jo Banner',role:'casting',sessions:3},{name:'Kit Lowe',role:'coach',sessions:5}],
 rightFor:['cop','dad','rancher'],wantMore:['westerns','dark drama'],wantSeen:['Western / period'],
 spotted:{fits:[{id:'s1',project:'Dust Road',network:'Netflix',role:'Sheriff',casting:['Mesa Casting'],url:'https://deadline.com/x',mine:['western']},{id:'s2',project:'Zoom Call',url:'https://zoom.us/j/1'}],fresh:[{name:'Canyon Casting',projects:['Red Ridge']},{name:'North Star Casting',projects:['Dry Wells']}]}});
let m=R.build(src()), t=R.text(m,null);
want('my work: the page', /MY WORK\nhttps:\/\/riley-hart\.theactorpage\.com\//.test(t));
want('where I stand, by the Hub\'s groups, with counts and the last read', /Worked with \(1\)\n- Harbor Light Casting: 1 in the room, 2 reads in all, 1 booked\./.test(t)&&/Warm: they've had me in \(1\)\n- Ridge Casting: 2 in the room, 6 reads in all, 1 callback\. Last: Cold Creek \/ Wes\. Dana Pell\./.test(t), t);
want('cold offices are one count line; do-not-contact never shows', /Plus 2 offices I've taped for once or twice\./.test(t)&&!/Quiet Office/.test(t));
want('networks from your credits, not "Independent"', /- FX: Harbor Street, Night Shift\n- AMC: Signal Loss/.test(t)&&!/Independent/.test(t));
want('people: directors on your credits, casting from NOTES (not your coach)', /Sam Ortiz, directed me in Harbor Street/.test(t)&&/Jo Banner, casting, seen me work \(3 sessions\)/.test(t)&&!/Kit Lowe/.test(t));
want('on my radar: want to reach with why, and offices casting now that never had me in (once each)', /North Star Casting: They cast the westerns I fit/.test(t)&&/Canyon Casting: casting Red Ridge\. Never had me in\./.test(t)&&(t.match(/North Star/g)||[]).length===1);
want('right for, want more of, want to be seen for', /WHAT I'M RIGHT FOR\ncop, dad, rancher/.test(t)&&/WHAT I WANT MORE OF\nwesterns, dark drama\nRoles I want to be seen for: Western \/ period/.test(t));
want('casting that fits me, with the link; a private link (Zoom) never goes on it', /Dust Road \(Netflix\)\. Mesa Casting casting\. Role: Sheriff\. My words: western\.\n  https:\/\/deadline\.com\/x/.test(t)&&!/zoom/.test(t));
want('no phone numbers or emails of anyone', !/@|\(\d{3}\)/.test(t));
// first time
let ch=R.changes(null,m); want('first sheet: no "what\'s new"', ch.first&&!/WHAT'S NEW/.test(R.text(m,ch)));
let e=R.email(m,ch); want('first email says the rest will be only what changed', /only send what's changed/.test(e.short)&&/riley-hart\.theactorpage\.com/.test(e.short)&&/^For my reps: Riley Hart, Oct 20$/.test(e.subject), e);
const snap=R.snapshot(m);
// two weeks later
const s2=src(); s2.at=Date.parse('2026-11-03T12:00:00Z');
s2.offices[0].reads=8; s2.offices[0].callbacks=2; s2.offices[2].gate='warm'; s2.offices[2].reads=5; s2.offices[2].inroom=1; s2.offices.push({name:'Fresh Casting',gate:'want',reads:0,why:'New show in town'});
s2.credits.push({title:'Red Ridge',net:'Hulu'}); s2.wantMore.push('comedy'); s2.spotted.fits.push({id:'s3',project:'Long Haul',network:'HBO'});
const m2=R.build(s2); ch=R.changes(snap,m2);
want('what\'s new: reads, a callback, an office moved up, new radar, new network, new want, new casting', ch.lines.join(' | ')==='3 new reads: Ridge Casting (2), Mesa Casting. | Callback: Ridge Casting. | Mesa Casting: now Warm (was Has seen me). | On my radar now: Fresh Casting. | New credit with: Hulu. | I want more of: comedy. | 1 project casting that fits me: Long Haul.', ch.lines);
t=R.text(m2,ch); want('the sheet leads with what\'s new since last time', /^FOR MY REPS · Riley Hart\nNov 3\n\nWHAT'S NEW SINCE OCT 20\n- 3 new reads/.test(t), t.slice(0,200));
e=R.email(m2,ch); want('the email: just the news and the link; the whole sheet as the long version', /^What's new since Oct 20:\n- 3 new reads/.test(e.short)&&!/WHERE I STAND/.test(e.short)&&/WHERE I STAND/.test(e.full));
const m3=R.build(src()); m3.at=Date.parse('2026-10-25T12:00:00Z'); const ch3=R.changes(snap,m3);
want('nothing changed: says so, kindly', ch3.count===0&&/Nothing new since Oct 20/.test(R.email(m3,ch3).short)&&/Nothing new\. Still here, still taping\./.test(R.text(m3,ch3)));
// when it's due
const last=snap.at;
want('never sent: due', R.due(null,'2weeks',null).due);
want('"when something changes": due when there is something', R.due(last,'change',ch,m2.at).due&&!R.due(last,'change',ch3,m3.at).due&&/Nothing new since Oct 20/.test(R.due(last,'change',ch3,m3.at).why));
want('every 2 weeks: not yet at 5 days, due at 14', !R.due(last,'2weeks',ch3,Date.parse('2026-10-25T12:00:00Z')).due&&/Next one in 9 days/.test(R.due(last,'2weeks',ch3,Date.parse('2026-10-25T12:00:00Z')).why)&&R.due(last,'2weeks',ch,m2.at).due);
const h=R.html(m2,ch);
want('the page: plain, no scripts, not indexed, leads with the news', !/<script/i.test(h)&&/noindex/.test(h)&&h.indexOf('What&#39;s new since')<h.indexOf('Where I stand')&&/Ridge Casting/.test(h));
want('no em dashes anywhere', !/—/.test(R.text(m2,ch)+h+e.full));
/* things you spotted: your calls and new stories since you last sent, one line per project; older ones don't repeat */
{ const T0=Date.parse('2026-10-20T12:00:00Z'), s1=src(); s1.spotted=Object.assign({},s1.spotted||{},{news:[{project:'Dust Road',at:T0-86400000,t:'You marked it in prep.'},{project:'Dust Road',at:T0+3600000,t:'Another story (dated Oct 21, 2026): stage as written: filming.'},{project:'Dust Road',at:T0+7200000,t:'Casting named: Canyon Casting.'},{project:'Dust Road',at:T0+9000000,t:'You marked it filming (was in prep).'},{project:'Salt Flat',at:T0+9000000,t:'You marked it stopped.'}]});
  const mA=R.build(s1), prevA=R.snapshot(Object.assign({},mA,{at:T0})), chA=R.changes(prevA,mA), t=chA.lines.join('\n');
  want('spotted news: one line per project, only since the last one, in my voice', /Dust Road: Another story \(dated Oct 21, 2026\): stage as written: filming\. Casting named: Canyon Casting\. I marked it filming \(was in prep\)\./.test(t)&&/Salt Flat: I marked it stopped\./.test(t)&&!/I marked it in prep\./.test(t), chA.lines);
  want('spotted news: counts toward due when you send on change', R.due(T0,'change',chA,T0+10000000).due); }
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
