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
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
