/* node shared/test_intake.js : the home page intake sorting things. Made-up material only. */
const fs=require('fs'), path=require('path'); const D=f=>path.join(__dirname,'fixtures',f);
global.window=globalThis;
require('../actor-os/sides.js'); require('../actor-os/pdf.js'); global.HubReq=require('../hub/request.js'); const X=require('./intake.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,700))} };
const ab=f=>{ const b=fs.readFileSync(D(f)); return b.buffer.slice(b.byteOffset,b.byteOffset+b.length); };
(async()=>{
 ok('file kinds by name', ['a.fdx','a.fountain','a.pdf','a.docx','a.MOV','a.wav','a.jpg','a.txt','a.eml','a.zip'].map(n=>X.fileKind({name:n})).join()==='fdx,fountain,pdf,docx,media,media,image,text,text,other');
 // sides PDF
 const ex=await ActorPDF.extract(ab('low_tide_sides.pdf')); const w1=X.what(ActorPDF.toSides(ex.lines),{pages:2,sides:false});
 ok('a two-page sides PDF is sides: 3 scenes, 12 speeches, 4 parts', w1.kind==='sides'&&w1.script.speeches===12&&w1.script.speakers.length===4, w1);
 const ex2=await ActorPDF.extract(ab('low_tide_crossed.pdf')); const w2=X.what(ActorPDF.toSides(ex2.lines),{pages:2,sides:ex2.struck>0});
 ok('crossed-out pages are sides markings', w2.kind==='sides'&&/sides markings/.test(w2.why.join()), w2.why);
 // scripts
 const wf=X.what(fs.readFileSync(D('low_tide.fountain'),'utf8')); ok('Fountain with a title page is a script (draft)', wf.kind==='script'&&/title page/.test(wf.why.join()), wf.why);
 const wd=X.what(ActorSides.fromFdx(fs.readFileSync(D('low_tide.fdx'),'utf8'))); ok('Final Draft file is a script (draft)', wd.kind==='script', wd.why);
 const long=Array.from({length:9},(_,i)=>'INT. ROOM '+i+' - DAY\n\nBO\nLine '+i+'.\n\nAL\nAnswer '+i+'.\n').join('\n'); ok('nine scenes, no title page: a script', X.what(long).kind==='script');
 const short='INT. ROOM - DAY\n\nBO\nGet in.\n\nAL\nNo.\n'; ok('one short scene pasted: sides', X.what(short).kind==='sides');
 // requests
 const docx=await X.docxText(ab('low_tide_request.docx')); const wr=X.what(docx);
 ok('a Word file with a self-tape request is a request: due date, Eco Cast, role', wr.kind==='request'&&wr.req.role==='ANNA VOSS'&&/a tape due date/.test(wr.why.join())&&/Eco Cast/.test(wr.why.join()), wr.why);
 ok('the request names you (Invited Actors)', wr.req.invitedActor==='SAM ACTOR', wr.req.invitedActor);
 ok('a rep email with a deadline is a request', X.what('Hi! New self-tape for BAYSIDE, role of MARCO. The deadline is Tuesday, March 3rd at 8am PST. Sides attached.').kind==='request');
 ok('nothing in it: unknown, and says so', X.what('just some notes about lunch').kind==='unknown'&&X.what('').why[0]==='no text in it');
 // your part
 ok('role to part: "DET. ANNA VOSS" is ANNA; "HAL BRODY" is BRODY; no match is blank', X.matchRole('DET. ANNA VOSS',[{name:'ANNA',lines:6},{name:'COP #2',lines:2}])==='ANNA'&&X.matchRole('HAL BRODY',[{name:"MAE",lines:8},{name:"BRODY",lines:9}])==='BRODY'&&X.matchRole('MARCO',[{name:'BO',lines:1}])==='');
 ok('the request names its sides file', X.namesFile({sides:['ANNA VOSS.pdf']},'Anna_Voss.PDF')&&!X.namesFile({sides:['ANNA VOSS.pdf']},'other.pdf'));
 ok('what sides open up names your part', X.unlocks('sides',{me:'ANNA'})[0][1].includes('as ANNA')&&X.unlocks('script').length===4&&X.unlocks('other').length===0);
 // a résumé, from the PDF (columns kept) and as pasted text
 const rx=await ActorPDF.extract(ab('sam_actor_resume.pdf')); const rows=rx.lines.map(l=>({cells:l.cells}));
 const wr2=X.what(rx.lines.map(l=>l.text).join('\n'),null,rows), P=wr2.profile||{};
 ok('résumé PDF: read as a résumé', wr2.kind==='resume', wr2.why);
 ok('résumé: name, union, rep and rep phone, email, height, hair, eyes, local hire', P.name==='Sam Actor'&&P.union==='SAG-AFTRA'&&P.rep==='Northgate Talent (LA)'&&P.repPhone==='(555) 010-0142'&&P.email==='sam@actor.example'&&P.height==="5'10\""&&P.hair==='Brown'&&P.eyes==='Green'&&/local hire/.test(P.locations), P);
 ok('résumé: 7 credits by section; role size or character; network or director', P.credits.length===7&&P.credits.filter(c=>c.section==='TV').length===3&&P.credits.filter(c=>c.section==='Film').length===3&&P.credits[0].role==='Guest Star'&&P.credits[0].by==='ABN'&&P.credits.find(c=>c.title==='Bayside').character==='Duke Morrow'&&P.credits.find(c=>c.section==='Theatre').character==='George Gibbs', P.credits);
 ok('résumé: training, skills, accents', P.training.length===2&&P.skills.join('|')==='Horseback (Western)|Firearms handling|Stage combat|Guitar'&&P.accents.join('|')==='Southern|Boston|Light Irish', [P.training,P.skills,P.accents]);
 const wt=X.what(fs.readFileSync(D('sam_actor_resume.txt'),'utf8')), T=wt.profile||{};
 ok('the same résumé pasted as text: same name, 7 credits, same skills', wt.kind==='resume'&&T.name==='Sam Actor'&&T.credits.length===7&&T.skills.length===4, wt.kind==='resume'?{n:T.name,c:T.credits.length,s:T.skills}:wt);
 ok('sides are never a résumé, a résumé is never sides', X.what(ActorPDF.toSides(ex.lines),{pages:2}).kind==='sides');
 // the inbox
 const store={}; global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
 const I=require('./inbox.js'); const a=I.put('request',{raw:docx}); const b=I.put('request',{raw:docx});
 ok('inbox: the same request twice is one item', a.id===b.id&&I.all().length===1);
 ok('inbox: each tool takes it once', I.pending('hub','request').length===1&&(I.take('hub',a.id),I.pending('hub','request').length===0)&&I.pending('other','request').length===1);
 // your profile: fills blanks, keeps your fixes
 const Y=require('./you.js'); const c1=Y.fill(P,'résumé.pdf'); Y.set('name','Sam Q. Actor'); const c2=Y.fill(Object.assign({},P,{name:'SAM ACTOR',credits:P.credits.concat([{section:'TV',title:'New Show',role:'Co-Star'}])}),'second.pdf');
 const y=Y.get();
 ok('profile: first fill takes everything; a name you fixed stays; a second résumé adds only the new credit', c1.length>=9&&y.name==='Sam Q. Actor'&&y.credits.length===8&&c2.map(c=>c[0]).join()==='Credits', {c1:c1.length,c2,name:y.name,n:y.credits.length});

 // a whole folder (Downloads): what it reads, what it skips
 { const F=(p,size,t,type)=>({name:p.split('/').pop(),webkitRelativePath:p,size:size==null?100:size,lastModified:t||0,type:type||''});
  const files=[F('Downloads/ANNA VOSS.pdf',100,50),F('Downloads/LOW TIDE.fdx',100,40),F('Downloads/request.eml',100,30),F('Downloads/resume.docx',100,20),
   F('Downloads/movie.crdownload',100,99),F('Downloads/.DS_Store',100,99),F('Downloads/~$draft.docx',100,99),F('Downloads/._ANNA VOSS.pdf',100,99),F('Downloads/empty.pdf',0,99),F('Downloads/.cache/x.pdf',100,99),
   F('Downloads/take3.mov',100,99),F('Downloads/IMG_2231.jpg',100,99),F('Downloads/meme.png',100,99),F('Downloads/Sam Actor headshot.jpg',100,10),F('Downloads/setup.dmg',100,99),F('Downloads/notes',100,99)];
  const r=X.folder(files,3);
  ok('folder: newest likely files first, 3 at a time, the rest held for later', r.take.map(f=>f.name).join('|')==='ANNA VOSS.pdf|LOW TIDE.fdx|request.eml'&&r.later.map(f=>f.name).join('|')==='resume.docx|Sam Actor headshot.jpg', {take:r.take.map(f=>f.name),later:r.later.map(f=>f.name)});
  ok('folder: junk, hidden folders, empty files skipped; video left; pictures only if named as a headshot', r.junk===6&&r.media===1&&r.images===2&&r.other===2&&r.total===16, r);
 }
 console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
