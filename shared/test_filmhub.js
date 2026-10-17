/* node shared/test_filmhub.js : FILM HUB. Every title, name and number here is made up. */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../actor-os/sides.js'),'utf8'))(globalThis);
const F=require('../film/film.js'), H=require('./filmhub.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,600));} };
const text=fs.readFileSync(path.join(__dirname,'fixtures','low_tide.fountain'),'utf8');
const S=F.scenes(text);
ok('the made-up script reads as scenes', S.length>=2, S.length);
// nothing done yet
let c={file:'low_tide.fountain',text,me:'ANNA',scenes:{}};
let s=H.status(c,F);
ok('a script with nothing done: scenes counted, stage Script', s.scenes===S.length&&!s.planned&&H.stage(s)==='script', s);
ok('words: scenes, nothing planned, no score', H.words(s)[0]===S.length+' scenes: 0 planned, 0 at a place.'&&!H.words(s).some(w=>/%|score|ready/i.test(w)), H.words(s));
// planned and placed, some shots done
const n1=S[0].n, n2=S[1].n;
c.scenes[n1]={way:'keep',where:'loc1',done:{},cont:{}};
const L1=F.shots(S[0],'keep','ANNA');
L1.forEach(x=>c.scenes[n1].done[x.id]=1);
c.scenes[n2]={way:'compress',where:'',done:{},cont:{}};
const L2=F.shots(S[1],'compress','ANNA'); c.scenes[n2].done[L2[0].id]=1;
s=H.status(c,F);
ok('planned 2, placed 1, shots counted from Story Studio\'s own list', s.planned===2&&s.placed===1&&s.shots===L1.length+L2.length&&s.shotsDone===L1.length+1&&s.scenesShot===1, s);
ok('stage: Shooting once a shot is marked', H.stage(s)==='shooting');
ok('words: the shots line', H.words(s).includes('Shots: '+(L1.length+1)+' of '+(L1.length+L2.length)+' marked done; 1 scene fully shot.'), H.words(s));
// a cut
c.cut={target:600,fps:'24',takes:{[n1]:[{id:'t1',name:'A001.mov',use:true,in:2,out:42,adr:{keep:'a1',takes:[{id:'a1'}]}},{id:'t2',name:'A002.mov',use:false,in:0,out:10}],[n2]:[{id:'t3',name:'B001.mov',use:true,in:0,out:20.4}]}};
s=H.status(c,F);
ok('cut: pieces, length and ADR from the takes you used', s.takes===3&&s.pieces===2&&Math.abs(s.cutSecs-60.4)<0.01&&s.adr===1&&s.target===600, s);
ok('stage: Cutting; words say 1:00 of a 10:00 target', H.stage(s)==='cutting'&&H.words(s).includes('Cut: 1:00 of a 10:00 target, 1 ADR line kept.'), H.words(s));
ok('your own "done" wins', H.stage(s,'done')==='done');
// people
c.people={actors:{'MR. DELL':'Ross Okafor'},me:'Sam Actor',crew:'Directed by: Sam Actor\nSound - Jo Park',contacts:'Jo Park 555-0101'};
s=H.status(c,F);
ok('cast: parts named, crew counted', s.cast===2&&s.crew===2, s);
const scripts={a:c,b:{file:'SALT_FLATS.fdx',text:'',people:{actors:{},crew:'Sound: Jo Park'}}};
const P=H.people(scripts,F,[{title:'Dry Creek',people:'Gaffer: Jo Park\nWren Ashby'}]);
const jo=P.find(p=>p.name==='Jo Park');
ok('people: Jo Park on three films, with the job on each', jo&&jo.films.length===3&&jo.films.some(f=>f.film==='LOW TIDE'&&f.jobs.includes('Sound'))&&jo.films.some(f=>f.film==='Dry Creek'&&f.jobs.includes('Gaffer')), jo);
ok('people: a name with no job still counts', P.some(p=>p.name==='Wren Ashby'));
ok('people: contacts and phone numbers never come in', !JSON.stringify(P).includes('555-0101'));
ok('people: the one who works most comes first', P[0].name==='Jo Park', P.map(p=>p.name));
// the page
const films=[{title:'LOW TIDE',year:'2026',kind:'Short',runtime:'10 min',logline:'A harbor cop takes one last call.',credit:'Written and directed by Sam Actor',poster:'data:image/jpeg;base64,AAAA',links:[{label:'Watch',url:'https://example.com/lowtide'},{label:'bad',url:'javascript:alert(1)'}]},{title:'Hidden One',show:false},{title:'Dry Creek <b>',year:'2025'}];
const html=H.pageHtml(films,{banner:'Salt Road Pictures',name:'Sam Actor',about:'Westerns made on our own land.',email:'sam@example.com'});
ok('page: standalone, banner, your name, about', /^<!doctype html>/.test(html)&&/<h1>Salt Road Pictures<\/h1>/.test(html)&&/Sam Actor/.test(html)&&/Westerns made on our own land/.test(html));
ok('page: the film with poster, logline, credit, a real link', /LOW TIDE/.test(html)&&/A harbor cop/.test(html)&&/Written and directed by Sam Actor/.test(html)&&/href="https:\/\/example.com\/lowtide"/.test(html)&&/data:image\/jpeg/.test(html));
ok('page: a hidden film stays off, a javascript link is dropped, text is escaped', !/Hidden One/.test(html)&&!/javascript:/.test(html)&&/Dry Creek &lt;b&gt;/.test(html));
ok('page: no em dashes', !/—/.test(html));
ok('title: the script\'s own Title line first, then the file name', H.title({file:'low_tide.fountain',text})==='LOW TIDE'&&H.title({file:'LOW_TIDE_v3.fdx'})==='LOW TIDE v3');
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
