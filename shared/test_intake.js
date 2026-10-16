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
 // the inbox
 const store={}; global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
 const I=require('./inbox.js'); const a=I.put('request',{raw:docx}); const b=I.put('request',{raw:docx});
 ok('inbox: the same request twice is one item', a.id===b.id&&I.all().length===1);
 ok('inbox: each tool takes it once', I.pending('hub','request').length===1&&(I.take('hub',a.id),I.pending('hub','request').length===0)&&I.pending('other','request').length===1);
 console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
