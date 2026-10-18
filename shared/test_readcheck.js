/* READ CHECK: the site's reader scored against a Final Draft file's own tags. Made-up script only.
   node shared/test_readcheck.js */
global.window=global; require('../actor-os/sides.js'); const F=require('../film/film.js'), R=require('./readcheck.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const P=(t,x)=>'<Paragraph Type="'+t+'"><Text>'+x+'</Text></Paragraph>';
const FDX='<?xml version="1.0"?><FinalDraft><Content>'+[P('Scene Heading','SALT ROAD'),P('Scene Heading','INT. DINER - NIGHT'),P('Action','Rain on the glass.'),P('Character','DANA PELL'),P('Dialogue','We&apos;re closed.'),P('Character','McCARTHY'),P('Parenthetical','(dripping)'),P('Dialogue','Door was open.'),P('Character','DANA PELL (CONT&apos;D)'),P('Dialogue','Door&#8217;s always open.'),P('Scene Heading','EXT. MAE’S PLACE - NIGHT'),P('Character','DANA PELL/McCARTHY'),P('Dialogue','Now.'),P('Scene Heading','END TEASER')].join('')+'</Content></FinalDraft>';
const K=R.key(FDX);
want('the key: real scenes only; the title and END TEASER kept apart', K.headings.join('|')==="INT. DINER - NIGHT|EXT. MAE'S PLACE - NIGHT"&&K.notScenes.join('|')==='SALT ROAD|END TEASER', K);
want('the key: speeches by who, parentheticals out, CONT\'D the same person', K.speeches.map(s=>s.who+':'+s.text).join('|')==="DANA PELL:We're closed.|MCCARTHY:Door was open.|DANA PELL:Door’s always open.|DANA PELL/MCCARTHY:Now.", K.speeches);
// the same script as typed text, read the site's way: all right
const TXT="SALT ROAD\n\nby Nobody Real\n\nINT. DINER - NIGHT\n\nRain on the glass.\n\nDANA PELL\nWe're closed.\n\nMcCARTHY\n(dripping)\nDoor was open.\n\nDANA PELL (CONT'D)\nDoor's always open.\n\nEXT. MAE'S PLACE - NIGHT\n\nDANA PELL/McCARTHY\nNow.\n";
let sc=R.score(K,R.read(TXT,ActorSides,F));
want('read right: 100% everywhere, the title page not a speech', R.KINDS.every(k=>sc[k].precision===1&&sc[k].recall===1), R.line('made-up',sc));
// a reader that loses a scene and a speech, and makes one up
const BAD="INT. DINER - NIGHT\n\nDANA PELL\nWe're closed.\n\nMcCARTHY\nDoor was open.\n\nDANA PELL\nDoor's always open.\n\nROSS\nMade up.\n";
sc=R.score(K,R.read(BAD,ActorSides,F));
want('a lost scene: headings 100% right, half found', sc.headings.precision===1&&sc.headings.recall===0.5&&sc.headings.miss[0]==="EXT. MAE'S PLACE - NIGHT", sc.headings);
want('a lost and a made-up speech: 3 of 4 right, 3 of 4 found', sc.dialogue.tp===3&&sc.dialogue.fp===1&&sc.dialogue.fn===1, sc.dialogue);
want('nothing to count: none, never 100%', R.score({headings:[],speeches:[]},{headings:[],speeches:[]}).headings.recall===null&&R.pc(null)==='none');
want('a different draft is flagged', /DIFFERENT DRAFTS\?/.test(R.line('x',R.score(K,R.read('INT. A - DAY\n\nBOB\nOther words entirely.\n',ActorSides,F)))));
const one={score:R.score(K,R.read(TXT,ActorSides,F)),holdout:true};
want('the gate: one script is NOT ENOUGH, however good', R.gate([one]).verdict==='NOT ENOUGH');
want('the gate: 25 scripts, 5 held back, all 100%: PASS', R.gate(Array.from({length:25},(_,i)=>({score:one.score,holdout:i<5}))).verdict==='PASS');
want('the gate: 25 scripts but none held back: NOT ENOUGH', R.gate(Array.from({length:25},()=>({score:one.score,holdout:false}))).verdict==='NOT ENOUGH');
const bad=Array.from({length:25},(_,i)=>({score:sc,holdout:i<5})); want('the gate: all weak: FAIL', R.gate(bad).verdict==='FAIL');
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
