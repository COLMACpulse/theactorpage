/* SOUNDS LIKE YOU: the counts and the closest lines. Made-up scripts.  node papertrail/tests/voice_tests.js */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
require('../../film/film.js');
const T=require('../trail.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };

const RIDGE='Title: Ridge Line\n\nEXT. RIDGE - DAY\n\nVale climbs the ridge. Wind. Nothing moves.\n\nVALE\nHand me the rope. Now.\n\nHALE\nYou sure about this?\n\nVALE\nI\'m not sure about anything... Just the rope.\n\nINT. CABIN - NIGHT\n\nHale sits by the cold stove. Waits.\n\nHALE\nShe isn\'t coming back -- not tonight.\n';
const sc=T.scenes(RIDGE,'script'), U=T.vUnits(sc,{pid:'p1',title:'Ridge Line'});
ok('lines: action and dialogue, each with its scene', U.length===6&&U.filter(u=>u.who).length===4&&U[1].who==='VALE'&&U[1].text==='Hand me the rope. Now.'&&U[5].i===1&&U[4].who===null&&U[5].title==='Ridge Line', U);
const M=T.vMeasure(U);
ok('words counted', M.words===37, M.words);
ok('dialogue share', M.dialoguePct===Math.round(23/37*100), M);
ok('fragments: "Wind." "Nothing moves." "Now." "Waits." "Just the rope." and more', M.frag>=40&&M.frag<=70, M.frag);
ok('one sentence of 13 asks', M.ask===Math.round(1/13*100), [M.ask,M]);
ok('trail-offs and dashes per 1,000 words', M.dots===Math.round(1/37*10000)/10&&M.dash===Math.round(1/37*10000)/10, [M.dots,M.dash]);
ok('contractions: I\'m, isn\'t', M.contr===Math.round(2/37*1000)/10, M.contr);
ok('nothing to count: dashes, not zeros', T.vMeasure([]).perD===null&&T.vText('perD',null)==='–'&&T.vText('frag',40)==='40%'&&T.vText('words',12400)==='12,400');
ok('Mr. does not end a sentence', T.vMeasure([{who:'A',text:'Mr. Dell is late again.'}]).perD===5);

const prose=T.vScenes('She walked to the truck. It was raining.\n\nHe did not look back. Not once.');
ok('prose with no heading is read as one scene, no made-up heading', prose.length===1&&prose[0].heading===''&&T.vUnits(prose).length>=2, prose);

const DRY='Title: Dry Gulch\n\nINT. SALOON - NIGHT\n\nThe stove is cold. Hale stares at the empty rope hook by the door.\n\nVALE\nWhiskey.\n\nJO PARK\nWe\'re closed. Stove\'s out.\n\nEXT. STREET - DAY\n\nDust. A dog crosses.\n';
const base=T.vUnits(T.scenes(DRY,'script'),{pid:'p2',title:'Dry Gulch'});
const mine=T.vUnits([sc[1]],{pid:'p1',title:'Ridge Line'});
const names=['VALE','HALE','JO PARK'];
const C=T.vClosest(mine,base,names);
ok('closest: the cold stove line in Dry Gulch, cited', C.pairs.length>=1&&/stove is cold/.test(C.pairs[0].yours.text)&&C.pairs[0].yours.title==='Dry Gulch'&&C.pairs[0].yours.heading==='INT. SALOON - NIGHT', C);
ok('the words it shares, names left out', C.pairs[0].words.includes('stove')&&C.pairs[0].words.includes('cold')&&!C.pairs[0].words.includes('hale'), C.pairs[0].words);
ok('one shared word is not a match', T.vClosest([{who:null,text:'The dog barks.'}],base,names).pairs.length===0);
ok('word for word the same: counted, not shown as a match', (()=>{ const r=T.vClosest([{who:null,text:'The stove is cold. Hale stares at the empty rope hook by the door.'}],base,names); return r.same.length===1&&r.pairs.length===0; })());
ok('each line of yours shows once', (()=>{ const r=T.vClosest([{text:'the cold stove again'},{text:'cold stove, cold room'}],base,names); return r.pairs.length===1; })());
ok('no em dashes in the labels', !T.VROWS.some(r=>/—/.test(r[1])));
console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
