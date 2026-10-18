/* node shared/test_reader.js : the one script reader (actor-os/sides.js + pdf.js, used by ACTOR OS,
   MEMORIZER, STORY STUDIO, PAPER TRAIL, and Writer's Blockage for PDFs) on one made-up script, LOW TIDE,
   in eight forms. Truth: shared/fixtures/low_tide_truth.json (3 scenes, 12 speeches, COP #2, V.O., O.S.,
   a speech split by a page break, an all-caps action line, a shouted "NO."). Made up; no real scripts here. */
const fs=require('fs'), path=require('path');
const D=f=>path.join(__dirname,'fixtures',f);
global.window=globalThis;
require('../actor-os/sides.js'); require('../actor-os/pdf.js'); require('../film/film.js');
const S=globalThis.ActorSides, P=globalThis.ActorPDF, F=globalThis.FilmOS;
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,900))} };
const truth=JSON.parse(fs.readFileSync(D('low_tide_truth.json'),'utf8'));
const Q=x=>String(x||'').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const N=s=>Q(s).toUpperCase();
function score(text){
 const sc=F.scenes(text).map(s=>N(s.heading)), sp=S.parse(text).filter(b=>!b.action);
 const key=s=>s.who+'|'+Q(s.text), bag={}; sp.forEach(s=>bag[key(s)]=(bag[key(s)]||0)+1);
 let right=0; const miss=[]; truth.speeches.forEach(t=>{ if(bag[key(t)]){ bag[key(t)]--; right++; } else miss.push(t.who+': '+t.text.slice(0,40)); });
 const names=new Set(truth.speeches.map(s=>s.who));
 return {scenes:truth.scenes.filter(h=>sc.includes(N(h))).length, extraScenes:sc.length-truth.scenes.filter(h=>sc.includes(N(h))).length, right, got:sp.length, fake:[...new Set(sp.map(s=>s.who).filter(w=>!names.has(w)))], miss};
}
(async()=>{
 const pdfText=async f=>{ const b=fs.readFileSync(D(f)); const ex=await P.extract(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)); return P.toSides(ex.lines); };
 const forms={
  'Fountain':fs.readFileSync(D('low_tide.fountain'),'utf8'),
  'Final Draft (.fdx)':S.fromFdx(fs.readFileSync(D('low_tide.fdx'),'utf8')),
  'sides PDF':await pdfText('low_tide_sides.pdf'),
  'sides PDF (ASCII85 + Flate)':await pdfText('low_tide_sides_a85.pdf'),
  'text pasted out of the PDF':fs.readFileSync(D('low_tide_pasted.txt'),'utf8'),
 };
 const want={'text pasted out of the PDF':12};
 for(const [k,t] of Object.entries(forms)){ const r=score(t); const need=want[k]||12;
  ok(k+': 3 of 3 scenes, '+need+'+ of 12 speeches right, no made-up characters ('+r.right+'/12)', r.scenes===3&&r.extraScenes===0&&r.right>=need&&!r.fake.length, r); }
 const lay=score(fs.readFileSync(D('low_tide_pasted_layout.txt'),'utf8'));
 ok('text pasted with the page layout kept: read by column, 11 of 12 (the paste itself puts one name below its action), no made-up characters', lay.scenes===3&&lay.right>=11&&!lay.fake.length, lay);
 // crossed out on the page: the end of the scene before sits in a box with an X; one action line has a line through it;
 // a START arrow and a highlighter are on two of ANNA's lines and must not count as crossings
 for(const f of ['low_tide_crossed.pdf','low_tide_crossed_a85.pdf']){
  const b=fs.readFileSync(D(f)); const ex=await P.extract(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)); const t=P.toSides(ex.lines); const r=score(t);
  const gone=ex.lines.filter(l=>l.struck).map(l=>l.text);
  ok(f+': the box with an X (name, 2 speech lines, action) and the struck-through line are left out: 5 lines', ex.struck===5&&gone.includes('DOCKHAND')&&gone.includes('THE PHONE RINGS.')&&!/DOCKHAND|Tide's turning|PHONE RINGS/.test(t), {struck:ex.struck,gone});
  ok(f+': the highlighted line and the START arrow line stay; 12 of 12 speeches, no DOCKHAND', r.right===12&&!r.fake.length&&/Voss\./.test(t)&&/Who found it\?/.test(t), r);
 }
 { const b=fs.readFileSync(D('low_tide_sides.pdf')); const ex=await P.extract(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)); ok('a page with no marks: nothing crossed out', ex.struck===0, ex.struck); }
 // the traps, one by one
 const fdx=forms['Final Draft (.fdx)'];
 ok('fdx: title page kept as Fountain "Title:"', /^Title: LOW TIDE/.test(fdx));
 const cop=S.parse('COP #2\nDetective.\n\nGUARD #1 (O.S.)\nHalt.'); ok('a name with a number sign is a name', cop.map(b=>b.who).join()==='COP #2,GUARD #1', cop);
 const shot=S.parse('LOW ANGLE: the deckhand lies on the dock.\n\nPOV DECKHAND: a gull lands on the rail.\n\nFLASHBACK: EXT. DOCK - DAY\n\nLATER\nThe fire is out.\n\nHAL\nGet up.');
 ok('camera words are never people (LOW ANGLE:, POV DECKHAND:, FLASHBACK:, LATER)', shot.filter(b=>!b.action).map(b=>b.who).join()==='HAL', shot);
 const pb=S.parse('ANNA\nWhat is it? Tell me now,\n(MORE)\n\nCONTINUED: (2)\n\nANNA (CONT\'D)\nbecause I am tired.\n\nANNA (CONT\'D)\nAnd cold.');
 ok('a speech carried over a page break is one speech; a later CONT\'D is a new one', pb.length===2&&pb[0].text==='What is it? Tell me now, because I am tired.'&&pb[1].text==='And cold.', pb);
 const fsn=F.scenes('INT. BAR - NIGHT #12#\n\nBO\nHi.\n\n.TITLE CARD - 1892\n\nAL\nYo.');
 ok('Fountain scene numbers come off the heading; a forced ".HEADING" is a scene', fsn.map(s=>s.heading).join('|')==='INT. BAR - NIGHT|TITLE CARD - 1892', fsn.map(s=>s.heading));
 const wm=S.parse('ANNA\nWhat is it?\n\nPM\n\n4:15 PM - 55120 - Mar 3, 2026 4:15 PM - 55120\n\nE417-E417-E417-\n\nCOP #2\nYou need to see this.\n\nANNA\nNO.');
 ok('watermark bits in pasted text are not people; a shouted "NO." under a name is still a line', wm.map(b=>b.who+':'+b.text).join('|')==="ANNA:What is it?|COP #2:You need to see this.|ANNA:NO.", wm);
 const emph=S.parse('Title: X\n\nWORTH\n*My* head? _Really_.'); ok('Fountain bold / underline marks come off the words', emph[0].text==='My head? Really.', emph);
 const wide=S.parse(Array(6).fill('ANNA\nShort line here.\n').join('\n')+'\nMRS. O\'NEIL (O.S.)\nWhere is he?\nAnna turns. MRS. O\'NEIL, 60s, in a nightgown and boots, at\nthe end of the pier.\n\nANNA\nMa\'am, stay there.');
 ok('PDF-wrapped text: a line wider than a speech line ends the speech (no blank line needed)', wide.find(b=>b.who==="MRS. O'NEIL").text==='Where is he?'&&wide.some(b=>b.action&&/^Anna turns/.test(b.text)), wide.slice(-3));
 const typed=S.parse('BO\nI drove all night to get here and I am not leaving until you tell me what happened to the truck.\n\nAL\nFine.');
 ok('typed sides with one long line per speech still read whole', typed[0].text.length>80&&typed[1].who==='AL', typed);
 const colon=S.parse('BO: Get in.\nAL: No.'); ok('colon sides still read (BO: line)', colon.map(b=>b.who+':'+b.text).join('|')==='BO:Get in.|AL:No.', colon);
 // colon-form scene headings ("INT: DAY. City jailhouse"), the way some writers set them: a heading, never a character
 const CF='INT: DAY. City jailhouse\n\nHal sits on the cot.\n\nHAL\nLet me out.\n\nEXT: NIGHT. Hal waits by the gate\n\nRain.\n\nDEPUTY\nGo home.\n\n5A INT. SALOON - NIGHT\n\nA piano.\n\nHAL\nWhiskey.\n';
 const cfp=S.parse(CF); ok('colon headings: not read as a character INT or EXT saying the place', cfp.filter(b=>!b.action).map(b=>b.who+':'+b.text).join('|')==='HAL:Let me out.|DEPUTY:Go home.|HAL:Whiskey.', cfp.filter(b=>!b.action));
 const cfs=F.scenes(CF); ok('colon headings: 3 scenes, each with its own place and time', cfs.length===3&&cfs[0].heading==='INT: DAY. City jailhouse'&&cfs[0].place==='City jailhouse'&&cfs[0].tod==='DAY'&&cfs[1].place==='Hal waits by the gate'&&cfs[1].tod==='NIGHT'&&cfs[2].place==='SALOON'&&cfs[2].tod==='NIGHT', cfs.map(x=>[x.heading,x.place,x.tod]));
 ok('colon headings: prose with a colon is not a heading', !S.SLUG.test('Interesting: he said no.')&&!S.SLUG.test('Ext:')&&S.SLUG.test('EXT: NIGHT. Gate'));
 // interviews, speeches and subtitles (made up): only the names are touched
 { const W=b=>b.map(x=>(x.action?'-':x.who)+'|'+x.text).join(' / ');
  const iv=S.parse('Dana Pell: Thanks for having me.\nHost: So, the new show?\nDana Pell: We start in March.\nHost: Great.\nLocation: Atlanta');
  ok('interview: "Dana Pell:" is a speaker; the words untouched; a one-off label stays as written', W(iv)==='DANA PELL|Thanks for having me. / HOST|So, the new show? / DANA PELL|We start in March. / HOST|Great. / -|Location: Atlanta', W(iv));
  const ot=S.parse('Ross Okafor  0:02\nI grew up on boats.\n\nJo Park  0:05\nTell me more.\n\nRoss Okafor  0:09\nMy dad fished. Every day.');
  ok('transcript name-and-time lines', W(ot)==='ROSS OKAFOR|I grew up on boats. / JO PARK|Tell me more. / ROSS OKAFOR|My dad fished. Every day.', W(ot));
  const qa=S.parse('[00:01:02] Q: Where did you grow up?\n[00:01:09] A: On a dock.\nQ: And then?\nA: Then the city.');
  ok('Q and A, timestamps dropped', W(qa)==='Q|Where did you grow up? / A|On a dock. / Q|And then? / A|Then the city.', W(qa));
  const srt=S.parse('1\n00:00:01,000 --> 00:00:03,000\nWhere were you?\n\n2\n00:00:03,500 --> 00:00:05,000\nOut.\nAll night.\n');
  ok('SRT: numbers and timings gone; no names, one SPEAKER; a cue\'s two lines are one line', W(srt)==='SPEAKER|Where were you? / SPEAKER|Out. All night.', W(srt));
  const vtt=S.parse('WEBVTT\n\nNOTE made up\n\n00:01.000 --> 00:03.000\n<v Anna Voss>Where were you?</v>\n\n00:03.500 --> 00:05.000\n<v Mr. Dell>Out.\n');
  ok('WebVTT: header and notes gone; the voice tag is the speaker', W(vtt)==='ANNA VOSS|Where were you? / MR. DELL|Out.', W(vtt));
  ok('a news story with one "Location:" stays prose', S.parse('Mr. Dell said the plan works.\nLocation: Atlanta.').every(b=>b.action));
  ok('sides are read as before', W(S.parse('ANNA\nHand me the rope.\n\nMR. DELL\nNo.'))==='ANNA|Hand me the rope. / MR. DELL|No.');
  ok('McCARTHY and MacLEOD are names, as Final Draft writes them', W(S.parse('INT. BAR - NIGHT\n\nMcCARTHY\nYou came.\n\nMacLEOD (CONT\'D)\nI did.\n\nMcCARTHY: Sit.'))==='MCCARTHY|You came. / MACLEOD|I did. / MCCARTHY|Sit.', W(S.parse('McCARTHY\nYou came.\n\nMacLEOD (CONT\'D)\nI did.')));
  ok('a line that starts with Mac is still a line', S.parse('ANNA\nMac said no.').length===1&&S.parse('ANNA\nMac said no.')[0].text==='Mac said no.');
  ok('an email from a rep is not an interview', S.transcript('From: Pat Rep\nTo: Sam Actor\nSubject: LOW TIDE\nHi Sam: tape due Friday.').kind===''); }
 console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
