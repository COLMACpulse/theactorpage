/* CHARACTER BANK · brightness, clarity, steadiness (mined from VOCA). Made-up voices with pauses.
   node cps/tests/colour_tests.js */
const E=require('../engine.js'); const sr=16000;
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
function voice(f0,o){ o=o||{}; const secs=5, n=sr*secs, x=new Float32Array(n); let seed=3; const rnd=()=>((seed=seed*16807%2147483647)/2147483647)*2-1;
 const on=t=>(t>0.3&&t<1.6)||(t>2.1&&t<3.2)||(t>3.7&&t<4.6);
 for(let i=0;i<n;i++){ const t=i/sr; let v=0; for(let h=1;h<=45;h++) v+=Math.sin(2*Math.PI*f0*(1+0.03*Math.sin(2*Math.PI*0.7*t))*h*t)/Math.pow(h,o.roll||1.2); const wob=o.shake?(1+0.6*Math.sin(2*Math.PI*9*t)):1; x[i]=(on(t)?(0.15*v*wob+(o.breath||0)*rnd()):0)+0.0008*rnd(); }
 return o.gain?x.map(v=>v*o.gain):x; }
const A=o=>E.analyse([voice(120,o)],sr), base=A(), bright=A({roll:0.6}), dark=A({roll:2.4}), breathy=A({breath:0.05}), shaky=A({shake:1}), closer=A({gain:3});
want('every take gets brightness, clarity and steadiness', base.brightHz>0&&base.clarityDb>0&&base.wobbleDb>0, base);
want('brightness: a brighter voice reads higher, a darker one lower', bright.brightHz>base.brightHz*1.3&&dark.brightHz<base.brightHz*0.7, [dark.brightHz,base.brightHz,bright.brightHz]);
want('clarity: breath in the voice reads lower', breathy.clarityDb<base.clarityDb-1, [base.clarityDb,breathy.clarityDb]);
want('steadiness: a shaky voice wobbles 2x or more', shaky.wobbleDb>base.wobbleDb*2, [base.wobbleDb,shaky.wobbleDb]);
want('closer to the mic (3x louder) changes none of the three', closer.brightHz===base.brightHz&&closer.clarityDb===base.clarityDb&&Math.abs(closer.wobbleDb-base.wobbleDb)<0.05, closer);
const say=E.compare(base,breathy).say.join(' ');
want('then and now, in words: breathier now', /Clarity: breathier now \(\d+\.\d → \d+\.\d dB\)\./.test(say), say);
want('then and now: shakier, with how much', /Steadiness: shakier now \(the loudness wobbles \d\.\d× as much as then\)\./.test(E.compare(base,shaky).say.join(' ')));
want('then and now: brightness says the mic and room move it too', /the mic and the room move this too/.test(E.compare(base,bright).say.join(' ')));
want('the same voice, said the same: all three about the same', /Brightness: about the same.*Clarity: about the same.*Steadiness: about the same/.test(E.compare(base,closer).say.join(' ')));
want('against you: darker, breathier, shakier said plainly', E.vsMe(base,dark).includes('darker')&&E.vsMe(base,breathy).includes('breathier')&&E.vsMe(base,shaky).includes('shakier'), [E.vsMe(base,dark),E.vsMe(base,breathy),E.vsMe(base,shaky)]);
const P=E.closePairs([{id:'a',name:'A',an:base},{id:'b',name:'B',an:closer},{id:'c',name:'C',an:bright}]);
want('measure close: same pitch and time but much brighter is not close', P.length===1&&P[0].a.id==='a'&&P[0].b.id==='b', P.map(p=>p.a.id+p.b.id));
want('takes from before (no brightness) still pair on pitch and time', E.closePairs([{id:'a',an:Object.assign({},base,{brightHz:null})},{id:'c',an:bright}]).length===1);
// FIND THE PITCH (VOCA's Tone Return)
want('cents: 100 Hz against 96 is about 71 high; an octave is 1200', Math.round(E.cents(100,96))===71&&Math.round(E.cents(192,96))===1200&&E.cents(0,96)===null);
want('in words: on it inside 25 cents; semitones past 100', E.tuneWords(10)==='On it.'&&E.tuneWords(-40)==='40 cents low.'&&E.tuneWords(250)==='250 cents high (2.5 semitones).'&&E.tuneWords(null)==='Not hearing a voice.');
let H; for(let i=0;i<20;i++) H=E.hold(H,20,0.1); want('held: two seconds inside 50 cents', Math.abs(H.on-2)<1e-9&&Math.abs(H.best-2)<1e-9);
H=E.hold(H,null,0.2); want('a breath (0.2 s) does not break the hold', H.on>1.9);
H=E.hold(H,200,0.2); want('off the note past 0.3 s: the hold starts again, the longest is kept', H.on===0&&Math.abs(H.best-2)<1e-9);
want('no em dashes', !/—/.test(JSON.stringify([E.compare(base,breathy),E.compare(base,shaky),E.vsMe(base,dark)])));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
