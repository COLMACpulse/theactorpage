/* node shared/test_offices.js : your history with an office. All names here are made up. */
const O=require('./offices.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x));} };
const P=[
 {id:'1',aaid:'a1',project:'SALT FLATS',role:'HAL',casting:'Dana Pell Casting',status:'Confirmed',date:'2025-03-02',outcome:{callback:'2025-03-09'}},
 {id:'2',aaid:'a2',project:'DRY CREEK',role:'SHERIFF DALE',casting:'Dana Pell',status:'Submitted',date:'2026-01-15'},
 {id:'3',aaid:'a3',project:'BAYSIDE',role:'DOCKHAND',casting:'Pell, Dana',status:'Submitted'},
 {id:'4',aaid:'a4',project:'LOW TIDE',role:'FATHER',casting:'Northgate Casting',status:'Confirmed',date:'2026-02-01',outcome:{booked:'2026-02-20'}},
 {id:'5',kind:'audition',project:'HARBOR LINE',role:'ANNA VOSS',casting:'Dana Pell Casting',status:'Received'}];
const C=[{title:'Ninth Precinct',casting:'Northgate'}];
let h=O.history(P,C,'Dana Pell','5');
ok('same office however it is written (Casting / no Casting), this request left out', h.reads===2&&h.confirmed===1&&h.callbacks===1, h);
ok('last read is the newest dated one', h.last&&h.last.title==='DRY CREEK', h.last);
ok('words: plain counts, no score', O.words(h)==='You and Dana Pell: 2 reads before this, 1 confirmed, 1 callback. Last: DRY CREEK / SHERIFF DALE, '+h.last.when+'.', O.words(h));
h=O.history(P,C,['Wren Ashby','Dana Pell'],'5');
ok('several names on a request: the one you have history with', h.name==='Dana Pell'&&h.reads===2, h);
h=O.history(P,C,'Northgate Casting');
ok('a credit with the office counts as booked, with the booked outcome', h.booked===2&&h.credits===1, h);
ok('first time', O.words(O.history(P,C,'Wren Ashby'))==='First time with Wren Ashby. Nothing from them in your Hub.');
ok('excluding by a test (the request in hand, matched by show and role)', O.history(P,C,'Dana Pell',p=>p.project==='SALT FLATS').reads===2);
ok('no names, nothing said', O.words(O.history(P,C,[]))==='');
console.log('\n'+pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
