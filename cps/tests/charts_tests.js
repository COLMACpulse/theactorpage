/* CHARACTER BANK · GRAPHS: the map, then-and-now, every come-back. Made-up voices.  node cps/tests/charts_tests.js */
const G=require('../charts.js'), E=require('../engine.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const an=(hz,span,lo,hi,sil)=>({pitchHz:hz,spanSec:span,pitchLoHz:lo,pitchHiHz:hi,rangeSt:+(12*Math.log2(hi/lo)).toFixed(1),silencePct:sil||10});
const me=an(120,6,100,150);
const rows=[{id:'a',name:'Old Sam',an:an(95,7.2,80,120)},{id:'b',name:'Kid <b>Nell</b>',an:an(240,4.8,200,300)},{id:'c',name:'Pastor',an:an(98,7.0,85,115)},{id:'d',name:'Quiet',an:{pitchHz:null,spanSec:6}}];
const D=G.mapData(me,rows);
want('map: a dot for each voice with pitch, none for one with no pitch', D.length===3, D.map(p=>p.name));
const sam=D.find(p=>p.id==='a'); want('map: Old Sam 4 st lower, 20% slower (down)', Math.abs(sam.x-(12*Math.log2(95/120)))<0.01&&Math.round(sam.y)===-20, sam);
const nell=D.find(p=>p.id==='b'); want('map: Kid Nell 12 st higher, 20% faster (up)', Math.abs(nell.x-12)<0.01&&Math.round(nell.y)===20, nell);
const pairs=E.closePairs(rows.filter(r=>r.an.pitchHz)); const svg=G.map(me,rows,pairs);
want('map: close voices joined (Old Sam and Pastor)', pairs.length===1&&(svg.match(/class="pairline"/g)||[]).length===1, pairs.map(p=>p.a.name+'/'+p.b.name));
want('map: you in the middle, labelled axes, names on the dots', /class="me"/.test(svg)&&/your pitch/.test(svg)&&/faster/.test(svg)&&/slower/.test(svg)&&/>Old Sam</.test(svg));
want('map: a name is text, never markup', !/<b>Nell<\/b>/.test(svg)&&/Kid &lt;b&gt;Nell&lt;\/b&gt;/.test(svg));
want('map: every dot has its numbers on hover and focus', (svg.match(/tabindex="0" data-tip=/g)||[]).length===4&&/12 st higher than you, 20% faster/.test(svg));
want('map: nothing without you as yourself', G.map(null,rows,[])===''&&G.mapData({pitchHz:null},rows)===null);
// contour
const c1=E.contour([0,0.1,0.2,0.3,1.0,1.1,1.2],[120,122,124,126,118,117,116]), c2=E.contour([0,0.1,0.2,0.3,0.4],[130,131,133,134,135]);
want('pitch line: a break at a pause, none inside a phrase', c1.filter(x=>x===null).length===1&&c2.filter(x=>x===null).length===0, c1);
const cs=G.contour({pitchHz:121,contour:c1},{pitchHz:132,contour:c2});
want('then and now: two lines, labelled at their ends, on Hz ticks', (cs.match(/class="line then"/g)||[]).length===1&&/class="line now"/.test(cs)&&/>then</.test(cs)&&/>now</.test(cs)&&/ Hz</.test(cs));
want('then and now: a break lifts the pen', (cs.match(/class="line then" d="([^"]*)"/)[1].match(/M/g)||[]).length===2);
want('then and now: the readout at a time', G.at(c2,0.12)[1]===131&&G.at(c2,5)===null);
want('then and now: nothing to draw without both lines', G.contour({pitchHz:120,contour:null},{pitchHz:120,contour:c2})==='');
// history
const ref={an:an(120,6,100,150)}, rets=[{at:'2026-10-01',an:an(118,6,99,148)},{at:'2026-10-08',an:an(135,6,110,170),cold:true},{at:'2026-10-15',an:an(121,6,101,151)}];
const hs=G.history(ref,rets,(t,s)=>s?t.at.slice(5):t.at);
want('every come-back: a bar and a middle dot each, on the reference band', (hs.match(/class="bar now"/g)||[]).length===3&&(hs.match(/class="dot mid"/g)||[]).length===3&&/class="band then"/.test(hs));
want('every come-back: its words, cold marked, about-the-same said plainly', /2026-10-08 \(cold\)/.test(hs)&&/2 st higher than then/.test(hs)&&/about the same as then/.test(hs), hs.match(/data-tip="[^"]*"/g));
want('no em dashes anywhere', !/—/.test(svg+cs+hs));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
