/* node papertrail/tests/notthis_tests.js : NOT THIS word matching. Made-up story. */
const T=require('../trail.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x));} };
ok('words: the names and the thing, not "never", "uses", "a"', JSON.stringify(T.ntWords('Vale never uses a flintlock'))==='["vale","flintlock"]');
ok('words: contractions dropped', JSON.stringify(T.ntWords("Hale doesn't die"))==='["hale","die"]');
const sc=[{heading:'EXT. RIDGE - DAY',text:'Vale climbs the ridge.\nVALE: Hand me the flintlock.\nHale coughs.'},{heading:'INT. CABIN - NIGHT',text:"HALE: I'm not dying out here.\nThe flintlock hangs on the wall.\nHale dies in the snow."}];
const v=T.ntHits({text:'Vale never uses a flintlock'},sc);
ok('both words on one line: found; the flintlock alone on the wall: not', v.length===1&&v[0].i===0&&/flintlock/.test(v[0].line), v);
const h=T.ntHits({text:"Hale doesn't die"},sc);
ok('dies and dying count for die; a speech counts its speaker', h.length===2&&h.every(x=>x.i===1), h);
ok('a cue on its own line counts for the speech under it', T.ntHits({text:'Vale never uses a flintlock'},[{heading:'x',text:'VALE\nHand me the flintlock.'}]).length===1);
ok('"diet" is not "die"', T.ntHits({text:'x',words:['die']},[{heading:'x',text:'He is on a diet.'}]).length===0);
ok('your own words win', T.ntHits({text:'No guns in act one',words:['rifle']},[{heading:'x',text:'He lifts the rifle.'}]).length===1);
ok('three words: two on a line is enough', T.ntHits({text:"Saint won't ride with the crew"},[{heading:'x',text:'Saint rides out ahead.'}]).length===1);
ok('one word: that word', T.ntHits({text:'flintlock'},[{heading:'x',text:'A flintlock.'}]).length===1);
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
