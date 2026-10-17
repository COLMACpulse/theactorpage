/* node write/tests/go_tests.js : GO. What goes in is kept as it went in; every view is made from it and changes nothing.
   Made-up words only (THE WATCH, Charlie, Sage, Dana Pell, Sam Actor). */
const G=require('../go-engine.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,500));} };
const c=G.blank(1000);
ok('a new capture is empty and open', c.entries.length===0&&!c.frozen&&G.name(c)==='Nothing yet');
const e1=G.add(c,'um so the idea is a guy who runs a pawn shop and never sells anything','dictation',2000);
const e2=G.add(c,'INT. PAWN SHOP - DAY\nCharlie wipes the counter. Sage comes in.\nSage says, I need the watch back.\nCHARLIE: It sold.\nCharlie whispers it sold last week','keyboard',3000);
ok('entries go in order, numbered, stamped, with where they came from', e1.id==='e1'&&e2.id==='e2'&&e1.src==='dictation'&&e2.at===3000&&c.entries.length===2);
ok('nothing in it: nothing added', G.add(c,'   ','keyboard')===null&&c.entries.length===2);
ok('an unknown source is kept as keyboard', G.add(G.blank(),'x','fax').src==='keyboard');
const before=JSON.stringify(c);
const clean=G.clean(c), script=G.script(c), letter=G.letter(c,{name:'Sam Actor'}), deck=G.deck(c), fo=G.fountain(script,'The Watch');
ok('no view changes the raw', JSON.stringify(c)===before);
ok('RAW is word for word', G.raw(c).indexOf('um so the idea')===0&&/Charlie whispers it sold last week$/.test(G.raw(c)));
ok('the name is its first words', G.name(c)==='um so the idea is a…', G.name(c));
// clean
ok('CLEAN: um gone, a capital, a full stop', clean[0]==='So the idea is a guy who runs a pawn shop and never sells anything.', clean[0]);
ok('CLEAN: line breaks kept, each line tidied', clean[1].split('\n').length===5&&clean[1].split('\n')[4]==='Charlie whispers it sold last week.', clean[1]);
ok('CLEAN: "i" is "I"', G.clean((()=>{ const x=G.blank(); G.add(x,'i think i\'m right'); return x; })())[0]==="I think I'm right.");
// script
const T=script.map(b=>b.type+':'+b.text);
ok('SCRIPT: the heading stays whole', T.includes('Scene Heading:INT. PAWN SHOP - DAY'), T);
ok('SCRIPT: "Sage says," is Sage speaking', T.join('|').indexOf('Character:SAGE|Dialogue:I need the watch back.')>=0, T);
ok('SCRIPT: "CHARLIE:" is Charlie speaking', T.join('|').indexOf('Character:CHARLIE|Dialogue:It sold.')>=0, T);
ok('SCRIPT: "Charlie whispers" gets (whispers)', T.join('|').indexOf('Character:CHARLIE|Parenthetical:(whispers)|Dialogue:It sold last week.')>=0, T);
ok('SCRIPT: the rest is action', T.includes('Action:Charlie wipes the counter.')&&T.includes('Action:Sage comes in.'), T);
ok('SCRIPT: no word you didn\'t put in', script.every(b=>b.type==='Character'||b.type==='Parenthetical'||b.type==='Scene Heading'||G.raw(c).toLowerCase().indexOf(b.text.toLowerCase().replace(/[.]$/,'').slice(0,12))>=0), script);
ok('Fountain: title, heading, cue and line together', /^Title: The Watch\n\nSo the idea/.test(fo)&&/\n\nINT\. PAWN SHOP - DAY\n\n/.test(fo)&&/\n\nSAGE\nI need the watch back\.\n/.test(fo)&&/CHARLIE\n\(whispers\)\nIt sold last week\./.test(fo), fo);
ok('Fountain: no triple blank lines', !/\n\n\n/.test(fo), fo);
// letter
const d=G.blank(); G.add(d,'hi dana. i saw you are casting low tide and i grew up on boats\n\nthanks');
const L=G.letter(d,{name:'Sam Actor'});
ok('LETTER: your hello kept, as a greeting', /^Hi Dana,\n\nI saw you are casting low tide and I grew up on boats\.\n\nThanks,\nSam Actor$/.test(L.body), L.body);
ok('LETTER: the subject is its first words', L.subject==='I saw you are casting low tide and', L.subject);
ok('LETTER: no hello or thanks written: Hi, and Thanks, with your name', /^Hi,\n\n/.test(letter.body)&&/Thanks,\nSam Actor$/.test(letter.body), letter.body);
ok('LETTER: no name set: no name', /Thanks,$/.test(G.letter(d,{}).body), G.letter(d,{}).body);
// deck
ok('DECK: a slide a paragraph', deck.length===2, deck);
ok('DECK: the heading is the title, the lines are the points', deck[1].title==='INT. PAWN SHOP - DAY'&&deck[1].points[0]==='Charlie wipes the counter.', deck[1]);
ok('DECK: a long first sentence is cut for the title and kept as a point', /…$/.test(deck[0].title)&&deck[0].points[0].indexOf('So the idea')===0, deck[0]);
ok('DECK as text', /^Slide 1: /.test(G.deckText(deck))&&/\nSlide 2: INT\. PAWN SHOP - DAY\n- Charlie/.test(G.deckText(deck)));
// freeze
G.freeze(c,9000);
ok('FREEZE: nothing more goes in', c.frozen&&c.frozenAt===9000&&G.add(c,'more')===null&&c.entries.length===2);
ok('FREEZE: still seen every way', G.clean(c).length===2&&G.script(c).length>0);
G.unfreeze(c); ok('UNFREEZE: open again', !c.frozen&&G.add(c,'more').id==='e3');
ok('no em dashes in any view', ![G.clean(c).join(' '),fo,letter.body,G.deckText(deck)].some(t=>/—/.test(t)));
console.log(pass+' passed, '+fail+' failed'); if(fail) process.exit(1);
