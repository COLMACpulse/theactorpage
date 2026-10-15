/* node write/tests/voice_tests.js : the voice grammar, said plainly and said the way phones punctuate */
const V=require('../voice-engine.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x));} };
const names=['RENNIE','CAL','MOM'];
const D={mode:'Dialogue',speaker:'CAL',names}, A={mode:'Action',speaker:'',names};
const P=(s,c)=>V.parse(s,c||A);
const eq=(n,r,want)=>ok(n,Object.keys(want).every(k=>JSON.stringify(r[k])===JSON.stringify(want[k])),r);
// headings, both ways
for(const s of ['exterior county road bus shelter night','Exterior county road bus shelter, night.','scene exterior county road bus shelter night','Scene, exterior county road bus shelter, night.','new scene exterior county road bus shelter dash night'])
 eq('heading: '+s,P(s),{kind:'add',type:'Scene Heading',text:'EXT. COUNTY ROAD BUS SHELTER - NIGHT'});
eq('heading with dashes',P("Interior Cal's pickup dash moving dash continuous."),{text:"INT. CAL'S PICKUP - MOVING - CONTINUOUS"});
eq('heading moments later',P('interior diner moments later'),{text:'INT. DINER - MOMENTS LATER'});
eq('heading int ext',P('scene int ext truck day'),{text:'INT./EXT. TRUCK - DAY'});
eq('new scene alone waits for the heading',P('New scene.'),{kind:'mode',mode:'Scene Heading'});
eq('after a transition, "Cal says" is still a speech',P('Cal says get in the truck',{mode:'Scene Heading',names}),{kind:'speech',name:'CAL'});
eq('then the next words are the heading',P('truck stop motel parking lot, dawn',{mode:'Scene Heading',names}),{type:'Scene Heading',text:'INT. TRUCK STOP MOTEL PARKING LOT - DAWN'});
ok('"inside" is not a heading', P('Inside, the heater roars.').type==='Action');
// speeches
eq('says',P('Rennie says I left a note'),{kind:'speech',name:'RENNIE',paren:'',text:'I left a note'});
eq('says, punctuated',P('Rennie says, "I left a note."'),{kind:'speech',name:'RENNIE',text:'"I left a note."'});
eq('whispers keeps the word as a parenthetical',P('Cal whispers get in the truck'),{name:'CAL',paren:'(whispers)',text:'Get in the truck'});
eq('voice over',P('Mom voice over says call me when you land.'),{name:'MOM (V.O.)',text:'Call me when you land.'});
eq('off screen',P('cal off screen says Ren'),{name:'CAL (O.S.)'});
eq('a new name with says',P('Mrs Smith says the bus is late'),{name:'MRS. SMITH'});
eq('says with nothing after: cue, then wait',P('Cal says'),{kind:'speech',name:'CAL',text:''});
ok('"she says" is not a character', P('She says nothing.',D).kind==='text');
eq('character command',P('Character Rennie.'),{kind:'cue',name:'RENNIE'});
eq('known spelling kept',P('character cal'),{name:'CAL'});
// the v0.4 failures
ok('"Rennie walks to the bench and sits" is action, not Rennie speaking', P('Rennie walks to the bench and sits.',D).type==='Action', P('Rennie walks to the bench and sits.',D));
ok('direct address stays dialogue: "Rennie, get in the truck"', P('Rennie, get in the truck.',D).type==='Dialogue');
eq('"Undo." with a full stop is undo',P('Undo.'),{kind:'undo'});
eq('"Scratch that." is scratch',P('Scratch that.'),{kind:'scratch'});
ok('"Stop." is a line, not the mic', P('Stop.',D).kind==='text'&&P('Stop.',D).text==='Stop.');
eq('"Stop listening" turns the mic off',P('Stop listening.'),{kind:'stop'});
eq('"had had" stays',P('I know you had had enough',D),{text:'I know you had had enough'});
eq('"no no no" stays',P('no no no not tonight',D),{text:'No no no not tonight'});
eq('um and uh go',P('um I uh left a note',D),{text:'I left a note'});
// fixing
eq('change',P('Change ticket to note.'),{kind:'change',from:'ticket',to:'note'});
ok('change keeps a fallback line in case the word is not there', P('change the plan to Tucson',D).fallback.text==='Change the plan to Tucson');
eq('put that in action',P('Put that in action.'),{kind:'retype',type:'Action'});
eq('make that a parenthetical',P('make that a parenthetical'),{kind:'retype',type:'Parenthetical'});
eq('make that Cal',P('Make that Cal.'),{kind:'recue',name:'CAL'});
ok('"That was Cal." is a line, not a fix', P('That was Cal.',D).kind==='text');
eq('make that unknown name is not a fix',P('make that Tucson',D),{kind:'text'});
eq('try again',P('Try again.'),{kind:'alt'});
eq('new line',P('New line.'),{kind:'newline'});
eq('idea',P('Idea, the ticket was Mom\'s.'),{kind:'idea',text:"The ticket was Mom's."});
// transitions and the rest
eq('cut to',P('Cut to.'),{kind:'add',type:'Transition',text:'CUT TO:'});
eq('smash cut',P('smash cut to'),{text:'SMASH CUT TO:'});
ok('"cut to the chase" is a line', P('Cut to the chase.',D).type==='Dialogue');
eq('parenthetical',P('Parenthetical, not looking at him.'),{type:'Parenthetical',text:'(not looking at him)'});
eq('beat in a speech',P('beat',D),{type:'Parenthetical',text:'(beat)'});
eq('action command',P('Action, rain on a tin roof.'),{type:'Action',text:'Rain on a tin roof.'});
eq('spoken punctuation',P('I left a note comma on the fridge period',D),{text:'I left a note, on the fridge.'});
eq('question mark',P('you were not going to call question mark',D),{text:'You were not going to call?'});
ok('"period" mid-sentence is a word', P('that was a hard period in my life',D).text==='That was a hard period in my life');
eq('dialogue with nobody speaking goes to action, says why',P('I left a note',{mode:'Dialogue',speaker:'',names}),{type:'Action',why:'nobody is speaking'});
eq('dialogue command',P('dialogue I left a note',D),{type:'Dialogue',text:'I left a note'});
ok('cheat card lines all parse to something', V.SAY.every(([s])=>P(s.split(' / ')[0],D).kind!=='none'));
ok('emails survive', P('write to cal.r@gmail.com',D).text==='Write to cal.r@gmail.com');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
