/* node papertrail/tests/run_tests.js [LAST_BUS_sides.txt] */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
require('../../film/film.js');
const T=require('../trail.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };

// titles: never the first character
ok('Fountain Title: line', T.titleFrom('Title: Last Bus\nCredit: Written by\n\nEXT. ROAD - NIGHT\n\nCAL\nHey.\n','x.fountain')==='Last Bus');
ok('storyboard title line drops the word storyboard', T.titleFrom('LAST BUS STORYBOARD\nSCENE 1 EXT. ROAD - NIGHT CAST: A PROPS: b','x.docx')==='LAST BUS', T.titleFrom('LAST BUS STORYBOARD\nSCENE 1 EXT. ROAD - NIGHT CAST: A PROPS: b','x.docx'));
ok('title page line', T.titleFrom('LAST BUS\n\nWritten by\nSomeone\n\nEXT. ROAD - NIGHT\n\nCAL\nHey.\n','x.txt')==='LAST BUS');
ok('no title page: the file name, not the first character', T.titleFrom('EXT. ROAD - NIGHT\n\nCAL\nHey.\n','Last Bus - draft 2.fountain')==='Last Bus', T.titleFrom('EXT. ROAD - NIGHT\n\nCAL\nHey.\n','Last Bus - draft 2.fountain'));
ok('file name: dates and words like storyboard dropped', T.fromFileName("A GUNMAN'S HAND STORYBOARD6_19_17.docx")==="A GUNMAN'S HAND", T.fromFileName("A GUNMAN'S HAND STORYBOARD6_19_17.docx"));
ok('file name: underscores and sides', T.fromFileName('LAST_BUS_sides.pdf')==='LAST BUS', T.fromFileName('LAST_BUS_sides.pdf'));
ok('same title ignores case and THE', T.sameTitle("The Devil's Paintbrush","THE DEVIL'S PAINTBRUSH")&&T.sameTitle('Devils Paintbrush','THE DEVILS PAINTBRUSH'));
ok('draft labels', T.draftLabel('Last Bus - draft 2.fountain')==='Draft 2'&&T.draftLabel('GONE ASTRAY 1-19-18.pdf')==='1-19-18'&&T.draftLabel("STORYBOARD6_19_17.docx")==='6-19-17'&&T.draftLabel('x.fountain','Title: X\nDraft date: 3/1/26\n')==='3-1-26', [T.draftLabel('Last Bus - draft 2.fountain'),T.draftLabel('GONE ASTRAY 1-19-18.pdf'),T.draftLabel("STORYBOARD6_19_17.docx")]);

// storyboard cards
const SB=`A GUNMAN'S HAND STORYBOARD
SCENE 15 INT. SALOON - HERO TABLE - DAY CAST: JWH, WILD BILL PROPS: JWH guns, WB guns, whiskey bottle, glass NOTES: Davis Tutt talks to the Stranger. Pete slams a glass of beer in front of JWH.
SCENE 18 INT. SALOON - HERO TABLE - DAY CAST: WILD BILL, JWH FX: WB's hand goes through shot glass PROPS: WB guns, JWH guns, whiskey bottle, glasses NOTES: Wild Bill and JWH chew the fat.`;
ok('storyboard detected', T.kind("A GUNMAN'S HAND STORYBOARD6_19_17.docx",SB)==='storyboard'&&T.kind('x.txt',SB)==='storyboard'&&T.kind('x.txt','EXT. ROAD - NIGHT\n\nCAL\nHey.')==='script');
const sb=T.storyboard(SB);
ok('two storyboard scenes', sb.length===2, sb.length);
ok('scene 15: heading, cast, props, notes', sb[0].num==='15'&&sb[0].heading==='INT. SALOON - HERO TABLE - DAY'&&sb[0].cast.join()==='JWH,WILD BILL'&&sb[0].props.length===4&&/Pete slams/.test(sb[0].notes), sb[0]);
ok('scene 18: FX kept apart from props', sb[1].fx==="WB's hand goes through shot glass"&&sb[1].props.includes('glasses'), sb[1]);
ok('place and time from the heading', sb[0].place==='SALOON - HERO TABLE'&&sb[0].tod==='DAY', [sb[0].place,sb[0].tod]);

// drafts compared
const d1=`EXT. ROAD - NIGHT\n\nRain.\n\nCAL\nGet in.\n\nRENNIE\nNo.\n\nINT. TRUCK - NIGHT\n\nCAL\nTucson?\n\nRENNIE\nMaybe.\n`;
const d2=`EXT. ROAD - NIGHT\n\nRain.\n\nCAL\nGet in.\n\nRENNIE\nNo.\n\nINT. TRUCK - NIGHT\n\nCAL\nFlagstaff?\n\nRENNIE\nMaybe.\n\nEXT. MOTEL - DAWN\n\nRENNIE\nThanks.\n`;
const s1=T.scenes(d1,'script'), s2=T.scenes(d2,'script');
const c=T.compare(s1,s2);
ok('compare: 1 same, 1 changed, 1 added', c.same.length===1&&c.changed.length===1&&c.added.length===1&&c.removed.length===0, {s:c.same.length,c:c.changed.length,a:c.added.length,r:c.removed.length});
ok('compare: the changed one is the truck', c.changed[0].heading==='INT. TRUCK - NIGHT');
ok('compare the other way: the motel is removed', T.compare(s2,s1).removed.map(s=>s.heading).join()==='EXT. MOTEL - DAWN');
ok('a heading used twice is two scenes', T.keys(T.scenes('INT. BAR - DAY\n\nA\nHi.\n\nINT. BAR - DAY\n\nA\nBye.\n','script')).join()==='INT BAR DAY#1,INT BAR DAY#2');

// characters across drafts
const ch=T.characters([{id:'a',scenes:s1},{id:'b',scenes:s2}]);
ok('characters across drafts, lines per draft', ch[0].name==='RENNIE'&&ch[0].by.a===2&&ch[0].by.b===3&&ch.find(x=>x.name==='CAL').by.b===2, ch);

// have / missing
const m=T.missing(s2[0],{purpose:''},null,null);
ok('missing: text, cast yes; purpose, storyboard, studio no', m.find(x=>x.what==='Scene text').have&&m.find(x=>x.what==='Cast').have&&!m.find(x=>x.what==='What the scene is for').have&&!m.find(x=>x.what==='Storyboard').have&&!m.find(x=>/Story Studio/.test(x.what)).have);
const m2=T.missing(s2[0],{purpose:'She says no out loud for the first time'},sb[0],{way:'Compress it',done:3,total:3});
ok('missing: all there when written, boarded and shot', m2.every(x=>x.have), m2.filter(x=>!x.have));
ok('no percent anywhere in the list', !JSON.stringify(m).includes('%'));

// table read marks: people mark, this counts
const mk=(key,li,m,who,h)=>({id:key+li+m+who,key,li,m,who,h:h||'x'});
const MK=[mk('A#1',3,'lost','Ann'),mk('A#1',4,'confused','Bo'),mk('A#1',6,'lost','Ann'),mk('A#1',12,'lost','Bo'),mk('A#1',1,'landed','Ann'),mk('B#1',0,'lost','Ann')];
const cnt=T.markCounts(MK);
ok('counts per scene', cnt['A#1'].lost===3&&cnt['A#1'].confused===1&&cnt['A#1'].landed===1&&cnt['A#1'].readers.length===2, cnt);
const cl=T.clusters(MK,'A#1');
ok('clusters: lines 4 to 7 bunch up, a lone mark is not a cluster', cl.length===1&&cl[0].from===3&&cl[0].to===6&&cl[0].marks===3&&cl[0].readers===2, cl);
ok('landed marks never make a cluster', T.clusters([mk('A#1',1,'landed','a'),mk('A#1',2,'landed','b')],'A#1').length===0);
const curS=[{text:'CAL: Hey.\nRENNIE: Nope.\nThe bus pulls in.'}];
const car=T.carried([{key:'A#1',li:1,m:'lost',who:'Ann',h:T.lineHash('RENNIE: Nope.')},{key:'A#1',li:9,m:'lost',who:'Ann',h:T.lineHash('A line that was cut.')}],curS);
ok('a line that lost people and is still word for word comes over; a cut line does not', car.length===1&&car[0].where.li===1&&car[0].lost===1, car);
ok('line hash ignores case and spacing', T.lineHash('Rennie:  nope.')===T.lineHash('RENNIE: Nope.'));

const pp=T.paras([{action:true,text:'Rain on a tin roof. RENNIE, wet coat, a'},{action:true,text:'duffel she packed.'},{action:true,text:'Headlights.'},{who:'CAL',text:'Hey.'}]);
ok('wrapped action joins into one beat; a finished sentence starts the next', pp.length===3&&pp[0].text==='Rain on a tin roof. RENNIE, wet coat, a duffel she packed.'&&pp[1].text==='Headlights.', pp);
// revision marks
const df=T.lineDiff(['CAL: Hey.','RENNIE: I left a note.','The bus pulls in.'],['CAL: Hey.','RENNIE: I left you a note.','The bus pulls in.','CAL: Get in.']);
ok('line diff: same, cut+new for a rewrite, new at the end', JSON.stringify(df.map(x=>x.t))==='["same","cut","new","same","new"]', df);
ok('line counts', JSON.stringify(T.lineCounts(df))==='{"added":2,"cut":1,"same":2}');
ok('no change: all the same', T.lineDiff(['a','b'],['A','b ']).every(x=>x.t==='same'));
// boneyard
const b1=[{heading:'EXT. ROAD - NIGHT',text:'CAL: Hey.\nRENNIE: I left a note.'},{heading:'INT. DINER - DAY',text:'Coffee.'}];
const b2=[{heading:'EXT. ROAD - NIGHT',text:'CAL: Hey.\nRENNIE: I left you a note.'}];
const b3=[{heading:'EXT. ROAD - NIGHT',text:'CAL: Hey.\nRENNIE: I left a note.'}];
const c12=T.cuts([{label:'D1',scenes:b1},{label:"D2",scenes:b2}]);
ok('boneyard: the diner scene cut in D2, and the rewritten line', c12.scenes.length===1&&c12.scenes[0].heading==='INT. DINER - DAY'&&c12.scenes[0].cutIn==='D2'&&c12.lines.length===1&&c12.lines[0].text==='RENNIE: I left a note.', c12);
const c123=T.cuts([{label:'D1',scenes:b1},{label:"D2",scenes:b2},{label:"D3",scenes:b3}]);
ok('a line put back in a later draft leaves the boneyard', c123.lines.every(x=>x.text!=='RENNIE: I left a note.'), c123.lines);
// setups and secrets
const SC=[{heading:'EXT. ROAD - NIGHT',cast:['RENNIE','CAL'],lines:[{name:'CAL',lines:2},{name:'RENNIE',lines:2}]},{heading:'INT. TRUCK - NIGHT',cast:['RENNIE','CAL'],lines:[{name:'CAL',lines:1}]},{heading:'EXT. MOTEL - DAWN',cast:['RENNIE'],lines:[{name:'RENNIE',lines:1},{name:'MOM',lines:1}]}];
const K=T.keys(SC), ref=i=>({key:K[i],heading:SC[i].heading});
const st1=T.threadStatus({kind:'setup',what:'ticket',plant:ref(0),payoff:ref(2)},SC);
ok('setup paid off later: no problems', st1.payoff===2&&!st1.open&&!st1.problems.length, st1);
ok('setup with no payoff: open', T.threadStatus({kind:'setup',what:'x',plant:ref(0),payoff:null},SC).open);
ok('payoff before setup is said', /before it's set up/.test(T.threadStatus({kind:'setup',what:'x',plant:ref(2),payoff:ref(0)},SC).problems[0]||''));
const cutDraft=SC.slice(0,2);
const st2=T.threadStatus({kind:'setup',what:'ticket',plant:ref(0),payoff:ref(2)},cutDraft);
ok('payoff scene cut: open again, and says so', st2.open&&/isn't in this draft/.test(st2.problems[0]||''), st2);
const st3=T.threadStatus({kind:'secret',what:'bought it',plant:ref(0),learns:[{who:'CAL',...ref(1)},{who:'CAL2',...ref(2)}]},SC);
ok('secret: who learns, who is not in that scene, who is not marked as knowing', st3.learns.length===2&&st3.notes.some(n=>/CAL2 isn't in SC 3/.test(n))&&st3.unaware.sort().join()==='MOM,RENNIE', st3);
ok('learns before it starts is said', /before it starts/.test(T.threadStatus({kind:'secret',what:'s',plant:ref(1),learns:[{who:'CAL',...ref(0)}]},SC).problems[0]||''));
ok('threads at a scene', T.threadsAt([{kind:'setup',what:'t',plant:ref(0),payoff:ref(2)}],K[2])[0].roles[0]==='pays off here');
// research
ok('kinds', T.kindOf('image/png','a.png')==='photo'&&T.kindOf('','IMG_0042.HEIC')==='photo'&&T.kindOf('audio/mp4','Memo.m4a')==='audio'&&T.kindOf('video/quicktime','x.mov')==='video'&&T.kindOf('application/pdf','s.pdf')==='pdf'&&T.kindOf('','notes.docx')==='file');
ok('a link pulled out of pasted text', T.linkOf('see https://example.com/bus-schedule). ok')==='https://example.com/bus-schedule');
const SRC={drafts:[{id:'d2',label:'Draft 2',scenes:[{heading:'EXT. ROAD - NIGHT',text:'CAL: Hey.\nRENNIE: I left a note.'}]}],
 cards:{'EXT ROAD NIGHT#1':{purpose:'Rennie says no out loud',decisions:[{text:'Keep the engine running'}]}},
 bones:[{text:'Mom kept the bus schedule taped inside the cupboard.'}],
 cuts:{scenes:[],lines:[{text:'RENNIE: A room over a bakery in Tucson.',cutIn:'Draft 2',heading:'EXT. ROAD - NIGHT'}]},
 research:[{id:'r1',kind:'photo',name:'IMG_1.jpg',note:'The real shelter on Route 54',who:'RENNIE'}]};
const S1=T.search('note',SRC); ok('search: a line in the draft, with where', S1.some(r=>/Draft 2 · SC 1/.test(r.where)&&/I left a note/.test(r.text)), S1);
ok('search: decisions, purposes, boneyard, cut lines, research', T.search('engine',SRC).some(r=>/Decision/.test(r.where))&&T.search('out loud',SRC).some(r=>/What it is for/.test(r.where))&&T.search('cupboard',SRC)[0].go.tab==='bones'&&T.search('bakery',SRC)[0].where==='Boneyard · line cut in Draft 2'&&T.search('route 54',SRC)[0].go.id==='r1');
ok('search: every word has to be there, nothing ranked', T.search('bus tucson',SRC).length===0&&T.search('',SRC).length===0);
// study tables: the receipt is only what you wrote
const RS=[{id:'r1',kind:'photo',name:'IMG_1.jpg',note:'The real shelter'},{id:'r2',kind:'note',text:'Mom kept the schedule in the cupboard'},{id:'r3',kind:'link',url:'https://example.com/x'}];
const TB={question:'What does Rennie leave behind?',items:[{id:'i1',rid:'r1'},{id:'i2',rid:'r2'},{id:'i3',rid:'r3'}],links:[{id:'l1',a:'i1',b:'i2',type:'cause',note:'she waits because Mom did'}]};
const RC=T.receipt(TB,RS,'LAST BUS');
ok('receipt: question, what is on the table, the line and its note, what is not connected', /Question: What does Rennie leave behind\?/.test(RC)&&/1\. Photo: The real shelter/.test(RC)&&/1 CAUSE 2: she waits because Mom did/.test(RC)&&/Not connected to anything yet: 3/.test(RC), RC);
ok('receipt invents nothing: no hypothesis, no confidence, no percent', !/hypothes|confidence|%/i.test(RC));
ok('a removed research item says so', /removed from Research/.test(T.receipt({question:'',items:[{id:'i9',rid:'gone'}],links:[]},RS)));
const lb=process.argv[2];
if(lb&&fs.existsSync(lb)){
 const raw=fs.readFileSync(lb,'utf8');
 ok('LAST BUS raw: title from the title line, not CAL', T.titleFrom(raw,'LAST_BUS_sides.txt')!=='CAL'&&/LAST BUS/i.test(T.titleFrom(raw,'LAST_BUS_sides.txt')), T.titleFrom(raw,'LAST_BUS_sides.txt'));
 const s=T.scenes(raw,'script');
 ok('LAST BUS raw: 3 scenes, Cal and Rennie on camera, Mom a voice', s.length===3&&s[0].cast.slice().sort().join()==='CAL,RENNIE'&&s[0].voices.includes('MOM'), s.map(x=>[x.heading,x.cast,x.voices]));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
