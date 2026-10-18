/* node shared/test_backlot.js : BACKLOT. Every place, thing, name and script here is made up. */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../actor-os/sides.js'),'utf8'))(globalThis);
const F=require('../film/film.js'), B=require('./backlot.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,600));} };
const spots=[{id:'s1',name:'Red barn',ie:'both',passes:['stable','jail','saloon back room'],light:['morning','dusk'],perm:'yes',whose:'mine',takes:'hang a lantern, sweep the hay'},
 {id:'s2',name:'Creek rocks',ie:'out',passes:['riverbank','canyon'],light:['morning','midday','afternoon','dusk'],perm:'yes'},
 {id:'s3',name:'Kitchen',ie:'in',passes:['diner'],light:['morning','midday','afternoon','dusk','night'],perm:'yes',power:'yes'},
 {id:'s4',name:'Hardware store',ie:'in',perm:'ask',whose:'business'},
 {id:'s5',name:'Town park',ie:'out',perm:'no',whose:'public'}];
const onhand=[{id:'o1',kind:'prop',name:'rope'},{id:'o2',kind:'vehicle',name:'old pickup'},{id:'o3',kind:'person',name:'Me'},{id:'o4',kind:'person',name:'Jo Park and Dana Pell',count:2},{id:'o5',kind:'animal',name:'two horses'}];
ok('a heading place fits a spot by its name, or what it passes for', B.spotFor('RED BARN',spots).spot.id==='s1'&&B.spotFor('BARN',spots).spot.id==='s1'&&B.spotFor('OLD JAIL - CELL',spots).spot.id==='s1'&&B.spotFor('DINER',spots).spot.id==='s3'&&B.spotFor('RIVERBANKS',spots).spot.id==='s2');
ok('what it passes for is said', B.spotFor('JAIL',spots).as==='jail'&&B.spotFor('RED BARN',spots).own);
ok('no fit, no guess', B.spotFor('SPACESHIP',spots)===null&&B.spotFor('THE',spots)===null);
ok('the sub-place counts too: HOUSE - KITCHEN', B.spotFor('FARMHOUSE - KITCHEN',spots).spot.id==='s3');
const T='Title: Dry Gulch\n\nEXT. CANYON - DAY\n\nVale ties the rope to a rock.\n\nVALE\nHold this.\n\nJO\nNo.\n\nINT. JAIL - NIGHT\n\nDark. A gun on the table.\n\nSHERIFF\nSit.\n\nINT. DINER - NIGHT\n\nVALE\nCoffee.\n\nEXT. MOUNTAIN TOP - DAY\n\nWind.\n\nVALE\nThere.\n\nINT. HARDWARE STORE - DAY\n\nCLERK (V.O.)\nWe close at five.\n';
const sc=F.scenes(T), c=B.check(sc,spots,onhand,F);
ok('4 of 5 scenes have a spot', c.scenes===5&&c.here===4, [c.scenes,c.here]);
ok('the mountain top has none', c.places.find(p=>p.place==='MOUNTAIN TOP').spot==='', c.places);
ok('jail at night in the barn: night isn\'t marked, said', c.rows.find(r=>r.place==='JAIL').flags.includes('night isn\'t marked'.length?'a night scene; night isn\'t marked for this spot':''), c.rows.find(r=>r.place==='JAIL'));
ok('a spot still to ask about, said', c.rows.find(r=>r.place==='HARDWARE STORE').flags.includes('still need to ask'));
ok('canyon in the creek rocks, outside, no flag', c.rows.find(r=>r.place==='CANYON').flags.length===0&&c.rows.find(r=>r.place==='CANYON').as==='canyon');
ok('people: me plus two', c.people===3);
ok('speaking parts on camera, the voice left out', c.parts===3, c.parts);
ok('props in the action, which you have', c.props.includes('rope')&&c.have.includes('rope')&&c.props.includes('gun')&&!c.have.includes('gun'), c);
const W=B.checkWords(c);
ok('in words, counts only', W[0]==='4 of 5 scenes have a spot.'&&W.includes('No spot yet: MOUNTAIN TOP (1 scene).')&&W.includes('3 speaking parts on camera; you can get 3 people.')&&W.includes('2 night scenes.'), W);
ok('no score in the words', !/%|score|ready|should/i.test(W.join(' ')));
const D=B.drawer([{id:'a',title:'Dry Gulch',text:T,from:'Paper Trail'},{id:'b',title:'Low Tide',text:'EXT. OCEAN - DAY\n\nANNA\nHi.\n',from:'Story Studio'},{id:'c',title:'Empty',text:''}],spots,onhand,F);
ok('the drawer: most shootable first, empty ones left off', D.map(x=>x.title).join()==='Dry Gulch,Low Tide', D.map(x=>[x.title,x.here,x.scenes]));
const g1=B.deal({spots,onhand},{},7), g2=B.deal({spots,onhand},{},7), g3=B.deal({spots,onhand},{},8);
ok('a deal: same seed, same deal; another seed, another', JSON.stringify(g1)===JSON.stringify(g2)&&JSON.stringify(g1)!==JSON.stringify(g3));
ok('never a spot you marked no', [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].every(s=>!B.deal({spots,onhand},{},s).spots.includes('s5')));
const g4=B.deal({spots,onhand},{spots:['s1'],thing:'o1',people:2,time:'dusk',situation:1},3);
ok('picked: the barn at dusk, the rope, two people, a debt', g4.line==='Red barn, at dusk: a debt comes due. Rope matters. 2 people.'&&/^(INT|EXT)\. RED BARN - DUSK$/.test(g4.headings[0]), g4);
ok('the time a spot doesn\'t have: the heading uses a time it does', /- (MORNING|DUSK)$/.test(B.deal({spots,onhand},{spots:['s1'],time:'night'},4).headings[0]));
ok('what it takes, carried along', g4.notes[0]==='Red barn: hang a lantern, sweep the hay');
const fo=B.fountain(g4,'Red barn');
ok('the hand-off: headings and your line as a note, no dialogue', /^Title: Red barn\n\n\[\[From the ground: Red barn, at dusk: a debt comes due\..* Yours to change\.\]\]\n\n(INT|EXT)\. RED BARN - DUSK\n$/.test(fo)&&F.scenes(fo).length===1&&!F.scenes(fo)[0].speakers.length, fo);
ok('nothing to deal from: says so', B.deal({spots:[],onhand},{},1)===null&&B.deal({spots:[spots[4]],onhand},{},1)===null);
const lt=B.listText({spots,onhand});
ok('the list as text', /^SPOTS\n- Red barn · inside and out · passes for stable, jail, saloon back room · light: morning, dusk · mine · yes, i can use it · to make it pass: hang a lantern, sweep the hay\n/.test(lt)&&/PEOPLE YOU CAN GET\n- Me\n- Jo Park and Dana Pell \(2\)/.test(lt), lt);
const csv=B.listCsv({spots,onhand});
ok('the list as a CSV: commas quoted', csv.split('\r\n')[1].startsWith('spot,Red barn,both,stable; jail; saloon back room,morning; dusk,,,,mine,yes,"hang a lantern, sweep the hay",'), csv.split('\r\n')[1]);
ok('no em dashes', !/—/.test(lt+csv+W.join()+g4.line+fo));
const G=B.fromOwned([{id:'l1',kind:'location',name:'Barn',plays:'stable, jail or saloon',when:['dusk'],ie:'both',sound:'road at noon',scout:[{id:'x',photo:'ph1'},{id:'y',note:'no photo'}]},{id:'p1',kind:'prop',name:'Lantern'},{id:'v1',kind:'person',name:'Jo Park',count:''}]);
ok('Story Studio\'s list is the list: locations are spots, plays is what they pass for, sound is the noise', G.spots.length===1&&G.spots[0].passes.join('|')==='stable|jail|saloon'&&G.spots[0].noise==='road at noon'&&G.spots[0].photos.join()==='ph1'&&G.onhand.length===2&&B.spotFor('SALOON',G.spots).as==='saloon');
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
