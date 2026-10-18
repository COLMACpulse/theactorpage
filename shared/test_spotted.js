/* node shared/test_spotted.js : SPOTTED. Every notice, name, office and number here is made up. */
const store={}; global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}};
const S=require('./spotted.js'), O=require('./offices.js'), N=require('./notes.js'), fs=require('fs');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,600));} };
const fx=f=>fs.readFileSync(__dirname+'/fixtures/spotted_'+f+'.txt','utf8');

/* 1. a callback notice, labeled fields */
let c=S.read(fx('northgate_notice'));
ok('notice: project, role, casting, union', c.project==='NORTHGATE COFFEE'&&c.role==='BARISTA DAD'&&c.casting.join()==='Dana Pell'&&c.union==='Non-union', c);
ok('notice: callback and shoot dates, as written', c.dates.map(d=>d.what).join()==='callback,callback,shoot'&&c.dates[2].text==='Shoot Dates: 11/4 - 11/5', c.dates);
ok('notice: pay as written, one line', c.pay.length===1&&c.pay[0]==='Rate: $600/day + $1,500 usage, 1 year, all media', c.pay);
ok('notice: conflicts as written', c.conflicts==='Coffee, Quick Service Restaurants', c.conflicts);
ok('notice: all three musts, quoted', ['Must be able to steam milk and pour latte art.','Must ride a bicycle.','Real people types only, no models.'].every(m=>c.musts.includes(m)), c.musts);
ok('notice: the log-in line is not a must', !c.musts.some(m=>/log in/i.test(m)), c.musts);
ok('notice: the Zoom room is kept private, not a link to share', c.private.length===1&&!c.links.length&&!c.source, [c.private,c.links]);
ok('notice: your representation line is never read in', !JSON.stringify(c).includes('555-0100'), c);
ok('notice: where is Zoom', c.where==='Zoom / virtual', c.where);

/* 2. a plain email */
c=S.read(fx('saltflats_email'));
ok('email: project from "callback with X for Y"', c.project==='Salt Flats Water'&&c.casting.join()==='Ross Okafor', [c.project,c.casting]);
ok('email: role stops at the end of its sentence', c.role==='TRAIL RUNNER', c.role);
ok('email: pay as written', c.pay.length===1&&/\$750 session, plus \$5,000 for one year/.test(c.pay[0]), c.pay);
ok('email: conflict, no trailing period', c.conflicts==='bottled water, sports drinks', c.conflicts);
ok('email: in person at the address', c.where==='In person at 400 Main St', c.where);
ok('email: the callback date line, without "Hi Sam,"', c.dates.length===1&&c.dates[0].what==='callback'&&/^You're confirmed/.test(c.dates[0].text), c.dates);
ok('email: both musts', c.musts.length===2&&c.musts.some(m=>/running shoes/.test(m))&&c.musts.some(m=>/jog on camera/.test(m)), c.musts);

/* 3. a trade story */
c=S.read(fx('drycreek_news'));
ok('news: quoted title, who is casting, network, kind of job', c.project==='Dry Creek'&&c.casting.join()==='Wren Ashby'&&c.network==='ABC'&&/pilot/.test(c.type)&&/procedural/.test(c.type), c);
ok('news: the article link is the source', c.source==='https://example.com/news/dry-creek-pilot-order', c.source);
ok('news: no musts, no pay (nothing written)', !c.musts.length&&!c.pay.length, [c.musts,c.pay]);

/* 4. a public listing with roles in brackets */
c=S.read(fx('lowtide_listing'));
ok('listing: both roles, the first as the role', c.roles.map(r=>r.name).join()==='JOE,MAGGIE'&&c.role==='JOE', c.roles);
ok('listing: casting by, CSA dropped; the director is not casting', c.casting.join()==='Dana Pell'&&c.director==='Hal Brody', [c.casting,c.director]);
ok('listing: accent must, rate, due date', c.musts.includes('Must have a real New England accent.')&&c.pay[0]==='Rate: $225/day'&&c.dates[0].what==='due', c);

/* 5. a post: nothing is guessed */
c=S.read(fx('post'));
ok('post: no project or casting guessed from "Casting HAL BRODY\'s new short"', !c.project&&!c.casting.length, [c.project,c.casting]);
ok('post: what they want, quoted', c.musts.includes('Looking for real fishermen, 40-60.'), c.musts);

/* your facts next to it */
const projects=[
 {id:'p1',aaid:'A1',project:'LOW TIDE',role:'DOCK COP',casting_office:'Dana Pell Casting',status:'Confirmed',date:'2026-03-01',outcome:{callback:true}},
 {id:'p2',aaid:'A2',project:'DRY CREEK',role:'DEPUTY',casting_office:'Dana Pell',status:'Confirmed',date:'2026-06-10'},
 {id:'p3',aaid:'A3',project:'Salt Flats',role:'DAD AT PARK',casting_office:'Ross Okafor',status:'Received',date:'2026-07-01'}];
const credits=[{title:'Northgate Tea',role:'',character:'Barista',kind:'credit',medium:'Commercial',casting:'Lena Marsh'},{title:'Morning Ride',character:'Cycling Dad',medium:'Commercial'},{title:'SALT FLATS',character:'Hal',medium:'Film'}];
const s1=N.addSession({date:'2026-03-12',room:'class',who:[{name:'Dana Pell',role:'casting'}],title:'LOW TIDE',part:'ANNA'});
N.addNote({sid:s1.id,text:'Let the silence sit.'});
c=S.read(fx('northgate_notice'));
const held=[{brand:'Morning Brew Co',category:'coffee',until:'2027-06-30'},{brand:'Old Spot',category:'coffee',until:'2025-01-01'}];
let F=S.facts(c,{projects,credits,offices:O,notes:N,held,today:'2026-10-16'});
const fk=k=>F.find(x=>x.k===k);
ok('facts: the office line, plain counts', fk('office')&&/^You and Dana Pell: 2 reads before this/.test(fk('office').t), F);
ok('facts: the NOTES line', fk('notes')&&/Dana Pell gave you a note/.test(fk('notes').t), F);
ok('facts: your roles with the word "dad" and "barista"', F.filter(x=>x.k==='roles').length===2&&F.some(x=>x.k==='roles'&&/"dad": 1 booked: Cycling Dad \(Morning Ride\); 1 read/.test(x.t))&&F.some(x=>x.k==='roles'&&/"barista": 1 booked: Barista \(Northgate Tea\)/.test(x.t)), F.filter(x=>x.k==='roles'));
ok('facts: a conflict you hold that is still running, not the expired one', F.filter(x=>x.k==='conflict').length===1&&/You hold Morning Brew Co \(coffee\) through 2027-06-30\. This one lists Coffee, Quick Service Restaurants\./.test(fk('conflict').t), F);
ok('facts: no score, no verdict anywhere', !F.some(x=>/\d+%|score|right for|should|recommend/i.test(x.t)), F);
const c2=S.read(fx('drycreek_news'));
let F2=S.facts(c2,{projects,credits,offices:O,notes:N});
ok('facts: an office you have never met says so', F2.some(x=>x.k==='office'&&x.t==='First time with Wren Ashby. Nothing from them in your Hub.'), F2);
ok('facts: the kind of job against your credits ("pilot" is TV; none on file)', !F2.some(x=>x.k==='kind'), F2);
const c3=S.read(fx('saltflats_email'));
c3.type='commercial';
ok('facts: commercial credits counted when the kind is written', S.facts(c3,{credits}).some(x=>x.k==='kind'&&x.t==='2 commercial credits on your résumé: Northgate Tea, Morning Ride.'), S.facts(c3,{credits}));

/* the three notes */
const me={name:'Sam Actor',reel:'https://example.com/sam/reel',resume:'https://example.com/sam/resume'};
const pa=S.passAlong(c,F,me);
ok('pass along: starts "Just passing this along."', /^Just passing this along\.\n\nNORTHGATE COFFEE, Dana Pell casting\.\nRole: BARISTA DAD/.test(pa.body)&&pa.subject==='Just passing this along: NORTHGATE COFFEE / BARISTA DAD', pa);
ok('pass along: carries pay, conflicts, your history and the conflict you hold', /Pay as written: Rate: \$600/.test(pa.body)&&/Conflicts: Coffee/.test(pa.body)&&/You and Dana Pell/.test(pa.body)&&/You hold Morning Brew Co/.test(pa.body), pa.body);
ok('pass along: never the Zoom link, never your rep line', !/zoom\.us|555-0100/.test(pa.body), pa.body);
const pt=S.pitch(c,F,me);
ok('pitch: for your rep to send, from facts', /^Hi Dana,\n\nI see you're casting NORTHGATE COFFEE and wanted to put Sam Actor up for BARISTA DAD\.\nSam Actor has been in front of you 2 times, last on DRY CREEK\.\nSam Actor has done Northgate Tea \(Barista\), Morning Ride \(Cycling Dad\) and Morning Ride/.test(pt.body)===false&&/Sam Actor has done Morning Ride \(Cycling Dad\) and Northgate Tea \(Barista\)\.|Sam Actor has done Northgate Tea \(Barista\) and Morning Ride \(Cycling Dad\)\./.test(pt.body), pt.body);
ok('pitch: reel and résumé, then "Love to hear from you."', /Reel: https:\/\/example\.com\/sam\/reel\nRésumé: https:\/\/example\.com\/sam\/resume\n\nLove to hear from you\.$/.test(pt.body), pt.body);
ok('pitch: never your held conflict, never your class notes', !/Morning Brew|silence/.test(pt.body), pt.body);
const dn=S.direct(c,F,me);
ok('direct: your voice, "You\'ve had me in", signed', /^Hi Dana,\n\nI saw you're casting NORTHGATE COFFEE\. I'm Sam Actor\./.test(dn.body)&&/You've had me in 2 times, last on DRY CREEK\./.test(dn.body)&&/\nSam Actor$/.test(dn.body), dn.body);
const dn2=S.direct(c2,F2,me);
ok('direct: a new office gets no history line', !/had me in/.test(dn2.body)&&/^Hi Wren,/.test(dn2.body), dn2.body);
ok('no em dashes in any note', ![pa.body,pt.body,dn.body,dn2.body].some(b=>/—/.test(b)));

/* the list for your manager */
const list=[{id:'a',card:c,facts:F,status:'passed',at:Date.parse('2026-10-10')},{id:'b',card:c2,facts:F2,status:'spotted',at:Date.parse('2026-10-12'),note:'Pilot. Procedural.'},{id:'c',card:S.read(fx('lowtide_listing')),facts:[],status:'submitted',at:Date.parse('2026-10-14')}];
ok('find: every word has to be somewhere in the row', S.find(list,'dana').length===2&&S.find(list,'dana submitted').length===1&&S.find(list,'wren pilot').length===1&&S.find(list,'zzz').length===0, S.find(list,'dana').map(x=>x.id));
const html=S.listHtml(list,me);
ok('list page: standalone, searchable, with the source link', /^<!doctype html>/.test(html)&&/id="q"/.test(html)&&/example\.com\/news\/dry-creek-pilot-order/.test(html)&&(html.match(/<article/g)||[]).length===3, html.slice(0,200));
ok('list page: no private link, no rep line', !/zoom\.us|555-0100/.test(html));
const txt=S.listText(list,me);
ok('list text: one row each, status in brackets', /- NORTHGATE COFFEE \/ BARISTA DAD \/ Dana Pell \[Passed along\]/.test(txt)&&/\[Spotted\]/.test(txt)&&/\[Submitted\]/.test(txt), txt);
ok('a shared link is kept as the source', S.read('Saw this',{url:'https://example.com/x'}).source==='https://example.com/x');
ok('a shared Zoom link is not', S.read('Saw this',{url:'https://zoom.us/j/1'}).source==='');
ok('a kept one does not count itself as spotted before', !S.facts(c,{spotted:[{id:'a',card:c}],selfId:'a'}).some(x=>x.k==='spotted'), S.facts(c,{spotted:[{id:'a',card:c}],selfId:'a'}));
ok('direct with no name set: no "I\'m an actor"', !/an actor/.test(S.direct(c,[],{}).body), S.direct(c,[],{}).body);
/* 9. many at once: a trade roundup, an IMDbPro list */
let M=S.readMany(fx('trades_roundup'));
ok('roundup: three projects, the lead paragraph is not one', M.map(x=>x.project).join('|')==='Dry Creek|Salt Road|Northgate', M.map(x=>x.project));
ok('roundup: who is casting each, two names together too', M[0].casting.join()==='Wren Ashby'&&M[1].casting.join()==='Dana Pell,Ross Okafor'&&M[2].casting.join()==='Lena Marsh', M.map(x=>x.casting));
ok('roundup: network, kind, director as written', M[0].network==='ABC'&&/pilot/.test(M[0].type)&&M[1].network==='Netflix'&&M[2].director==='Hal Brody', M.map(x=>[x.network,x.type,x.director]));
ok('roundup: the story link on its own line goes on every card', M.every(x=>x.source==='https://example.com/news/pilot-orders'), M.map(x=>x.source));
ok('roundup: dates as written', M[0].dates[0].text==='Production begins in January in Atlanta.'&&/filming set for March/.test(M[1].dates[0].text), M.map(x=>x.dates));
let P=S.readMany(fx('imdbpro_list'));
ok('IMDbPro list: three titles, kind from the title line', P.map(x=>x.project+'/'+x.type).join('|')==='Dry Creek/TV Series|Salt Road/TV Mini Series|Low Tide/Feature', P.map(x=>x.project+'/'+x.type));
ok('IMDbPro list: status and genre as written', P[1].status==='Filming'&&P[1].genre==='Western, Drama'&&P[2].status==='Pre-production', P.map(x=>[x.status,x.genre]));
ok('IMDbPro list: casting directors', P[1].casting.join()==='Dana Pell,Ross Okafor'&&P[2].casting.join()==='Dana Pell', P.map(x=>x.casting));
ok('one notice: one card, same as read', S.readMany(fx('northgate_notice')).length===1&&S.readMany(fx('northgate_notice'))[0].project==='NORTHGATE COFFEE');
let B=S.readMany('Pilot news\n\n• \'Dry Creek\' (ABC). Wren Ashby is casting.\n• \'Salt Road\' (Netflix). Casting by Dana Pell.\n• \'Dry Creek\' adds a director: Hal Brody will direct.');
ok('a bulleted daily: each bullet its own, the same show twice is one card', B.length===2&&B[0].project==='Dry Creek'&&B[0].director==='Hal Brody'&&B[1].casting.join()==='Dana Pell', B.map(x=>[x.project,x.casting,x.director]));
/* 10. your types */
ok('your words: a type matches when all its words are there', S.typesIn(M[0],['sheriff','cop','small town']).join()==='sheriff,small town', S.typesIn(M[0],['sheriff','cop','small town']));
ok('your words: genre and kind count (western, rancher)', S.typesIn(P[1],['western','dad']).join()==='western'&&S.typesIn(M[1],['rancher']).join()==='rancher');
ok('no types: nothing matches', S.typesIn(M[0],[]).length===0);
/* 11. how they reached you, and the offices */
ok('channel: an Actors Access import, an Eco Cast request, a direct email, nothing', [S.channel({aaid:'csv:1'}),S.channel({aaid:'req:1',request:{confirmOnEcoCast:true}}),S.channel({aaid:'req:2',request:{contact:'office@example.com'}}),S.channel({kind:'audition'})].join()==='aa,aa,direct,');
const hubP=[{id:1,aaid:'csv:a',casting:'Wren Ashby Casting',project:'Low Tide',role:'ANNA VOSS',date:'2026-03-02'},{id:2,aaid:'req:b',casting:'Wren Ashby',project:'Dry Gulch',role:'HAL',date:'2026-05-02',request:{contact:'wren@example.com'}},{id:3,aaid:'csv:c',casting:'Wren Ashby',project:'Morning Brew Co.',role:'DAD',date:'2025-11-02'}];
const items=M.map((c,i)=>({id:'m'+i,at:1000+i,status:'spotted',card:c})).concat([{id:'x',at:5,status:'not',card:P[2]}]);
const cx={projects:hubP,credits:[],offices:O,types:['sheriff','rancher']};
const OF=S.offices(items,cx), wren=OF.find(o=>o.name==='Wren Ashby'), dana=OF.find(o=>o.name==='Dana Pell');
ok('offices: one row each, newest first', OF.map(o=>o.name).join()==='Lena Marsh,Dana Pell,Ross Okafor,Wren Ashby', OF.map(o=>o.name));
ok('offices: your history and how they reached you', wren.seen&&wren.h.reads===3&&wren.how.aa===2&&wren.how.direct===1&&S.howWords(wren)==='Came to me through Actors Access 2 times, straight from the office 1 time.', [wren.h,wren.how]);
ok('offices: never seen you', !dana.seen&&dana.now[0].match.join()==='rancher', dana);
const R=S.report(items,cx,{name:'Sam Actor'});
ok('report: what fits (your words), not what you passed on', /CASTING NOW THAT FITS ME\n- Salt Road \(Netflix, limited series\)\. Dana Pell & Ross Okafor casting\. My words: rancher\./.test(R.body)&&/- Dry Creek \(ABC, pilot\)\. Wren Ashby casting\. My words: sheriff\./.test(R.body)&&!/Low Tide \(Feature/.test(R.body), R.body);
ok('report: offices that know you, with how', /OFFICES THAT KNOW ME, CASTING NOW\n- Wren Ashby: Dry Creek\.\n  Had me in: 3 reads\. Last: Dry Gulch \/ HAL, May 2026\. Came to me through Actors Access 2 times, straight from the office 1 time\./.test(R.body), R.body);
ok('report: offices you should be going in for, and the question', /OFFICES I SHOULD BE GOING IN FOR AND AM NOT\n- Dana Pell: Salt Road\. My words: rancher\.\n  Never had me in\. Do they go through Breakdowns, or direct\?/.test(R.body)&&/- Lena Marsh: Northgate\./.test(R.body), R.body);
ok('report: no contacts, no em dashes, signed', !/@/.test(R.body)&&!/—/.test(R.body)&&/Sam Actor$/.test(R.body), R.body);
ok('report: a private link never goes in', !/zoom/.test(S.report([{id:'z',at:1,status:'spotted',card:S.read("'Low Tide' Dana Pell is casting. https://zoom.us/j/9")}],{},{}).body));
/* 12. LOOK: searches from your types */
const LK=S.look(['western','sheriff','western'],'Los Angeles, San Diego');
ok('LOOK: a row a type (no repeats), the general one, and near where you are local', LK.map(r=>r.label).join('|')==='western|sheriff|new series and films|filming near Los Angeles', LK.map(r=>r.label));
ok('LOOK: no types: just the general one', S.look([],'').map(r=>r.label).join()==='new series and films');
const u=new URL(S.lookUrl(LK[0].q,'deadline')), q=u.searchParams.get('q');
ok('LOOK: Google News search, your word in quotes, the stage words, the trade site, the last 30 days', u.hostname==='news.google.com'&&u.pathname==='/search'&&/^"western" \(casting OR "pre-production"/.test(q)&&/ site:deadline\.com when:30d$/.test(q), q);
ok('LOOK: NEWS has no site; BACKSTAGE looks for casting and auditions', !/site:/.test(new URL(S.lookUrl(LK[0].q,'news')).searchParams.get('q'))&&/\(casting OR auditions\) site:backstage\.com/.test(new URL(S.lookUrl(LK[0].q,'backstage')).searchParams.get('q')));
// where it stands, as written. Made-up stories.
const NOW=new Date(2026,9,18).getTime();
const st1=S.stage('Published: October 3, 2026\n\nNorthgate Pictures\' western "Dry Gulch" is set to begin filming in March in Kansas. The production is now casting locals for several speaking roles.');
ok('stage: in prep, the phrase as written, casting its own line, dated, the age', st1.stages.join()==='prep'&&st1.claims[0].phrase==='set to begin filming'&&st1.casting[0].phrase==='now casting'&&st1.dated==='2026-10-03', st1);
const w1=S.stageWords(st1,NOW);
ok('in words', w1.join('|')==='Stage, as written: in prep ("set to begin filming").|Casting, as written: "now casting".|The story is dated Oct 3, 2026, 15 days ago.', w1);
const st2=S.stage('June 1, 2026. The Netflix series "Salt Road" will not begin filming until 2028 after financing collapsed.');
ok('a "not" in front: said, not counted', !st2.stages.length&&st2.claims.length===1&&st2.claims[0].not, st2);
const w2=S.stageWords(st2,NOW);
ok('the not, quoted; and stale past 120 days', /^Said with a not: "The Netflix series "Salt Road" will not begin filming until 2028/.test(w2[0])&&/Not counted as in prep\./.test(w2[0])&&/Stale: past 120 days/.test(w2[w2.length-1]), w2);
const st3=S.stage('Sep 30, 2026 - "Low Tide" director Wren Ashby says the sequel is in the works. The first film wrapped filming in 2019, and the new one began filming last week in Maine.');
ok('more than one stage: all shown, never picked', st3.stages.includes('development')&&st3.stages.includes('filming')&&st3.stages.includes('wrapped'), st3.stages);
ok('two stages in words', /^Two stages in it: |^3 stages in it: /.test(S.stageWords(st3,NOW)[0]), S.stageWords(st3,NOW));
ok('a company developing an app is not a production; developing a series is', !S.stage('Northgate is developing new software for crews.').stages.length&&S.stage('Northgate is developing a limited series about ranchers.').stages.join()==='development');
ok('no date: said to check', S.stageWords(S.stage('Ridge Line is now casting.'),NOW).includes('No date in what you pasted. Check when it ran.'));
ok('no stage words: said', S.stageWords(S.stage('A nice day at the beach.'),NOW)[0]==='No stage words in it.');
ok('stopped is its own stage', S.stage('Production on "The Watch" was halted.').stages.join()==='stopped');
ok('"won\'t be casting" is not casting', !S.stage('They won\'t be casting locals this time.').casting.length);
ok('stale check', S.isStale(st2,NOW)&&!S.isStale(st1,NOW));
const cd=S.read('Published: October 3, 2026\n\n"Dry Gulch" is set to begin filming in March. Now casting locals.');
ok('on the card, and in the pass-along', cd.stage.stages.join()==='prep'&&/Stage, as written: in prep \("set to begin filming"\)\.\nCasting, as written: "now casting"\./i.test(S.passAlong(cd,[],{name:'Sam Actor'}).body), S.passAlong(cd,[],{name:'Sam Actor'}).body);
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
