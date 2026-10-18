/* EDITOR PACK: the plan, plan against what you got, the sheets, the day in order, the zip. Made-up film.
   node film/tests/pack_tests.js */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
const F=require('../film.js'), Z=require('../../shared/zipw.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };
const SC=F.scenes('EXT. DRY CREEK - DUSK\n\nCOLE waits by the creek. He checks his rifle.\n\nCOLE\nYou came back.\n\nHALE\nNot for you.\n\nINT. BARN - NIGHT\n\nThe door creaks. Nobody speaks.\n');
const ST={1:{way:'keep',done:{wide:1},ins:['rifle']},2:{way:''}};
const R=F.planRows(SC,n=>ST[n],'COLE');
ok('the plan: scene 1 shot by shot, scene 2 with no shot list yet', R.filter(r=>r.n===1).length>=5&&R[0].i===1&&R[0].id==='wide'&&R[0].done&&R.find(r=>r.n===2).none, R.map(r=>[r.n,r.i,r.id]));
const plan=F.planCsv(R);
ok('plan.csv: a header and a row a shot', /^SCENE,HEADING,SHOT #,SHOT,WHO,HOW,DONE\n1,EXT\. DRY CREEK - DUSK,1,"?Wide master, camera locked"?/.test(plan)&&/2,INT\. BARN - NIGHT,,\(no shot list yet\)/.test(plan), plan.slice(0,300));
const T={1:[{id:'a',name:'IMG_0101.MOV',dur:42.5,in:3,out:20,shot:'wide',mark:'gold',note:'the one where he laughs',watch:[{id:'w',at:12.4,text:'the laugh'}]},{id:'b',name:'IMG_0102.MOV',dur:30,in:0,out:30,shot:'wide',mark:'backup'},{id:'c',name:'IMG_0103.MOV',dur:8,in:0,out:8}],2:[{id:'d',name:'IMG_0110.MOV',dur:15,in:0,out:15,shot:'x'}]};
const cv=F.coverage(R,T);
ok('coverage: the wide has two takes; the rest not shot; two takes on no planned shot', cv.rows.find(r=>r.id==='wide').takes.length===2&&cv.missing.length===cv.rows.length-1&&cv.extra.length===2, [cv.missing.length,cv.extra.length]);
const w=F.coverWords(cv);
ok('in words', /^1 of \d+ planned shots have a take\. Not shot: Sc 1 COLE close-up;/.test(w)&&/2 takes are not on a planned shot\./.test(w)&&/1 scene has no shot list/.test(w), w);
const got=F.gotCsv(cv,'24','Dry Creek');
const L=got.trim().split('\n');
ok('plan vs got.csv: header', L[0]==='SCENE,SHOT #,SHOT,FILE,NAME FOR THE EDIT,DURATION,IN,OUT,MARK,NOTE,MOMENTS');
ok('the gold take: file, a name for the edit, length, timecode in and out, GOLD, the note, the moment', L[1]==='1,1,"Wide master, camera locked",IMG_0101.MOV,Dry_Creek_Sc1_Sh1_T1,0:42.5,00:00:03:00,00:00:20:00,GOLD,the one where he laughs,0:12.4 the laugh', L[1]);
ok('a planned shot with nothing: NOT SHOT', L.some(l=>/^1,\d+,COLE close-up,NOT SHOT,/.test(l)), L);
ok('takes on no planned shot, at the end', /\(not on the shot list\),IMG_0103\.MOV/.test(got)&&/^2,,\(not on the shot list\),IMG_0110\.MOV/m.test(got));
const D=F.dayOrder([{name:'IMG_0104.MOV',lastModified:300},{name:'IMG_0102.MOV',lastModified:100},{name:'IMG_0110.MOV',lastModified:100},{name:'IMG_0103.MOV',lastModified:200}]);
ok('the day in the order you shot it, by the time on the file, then the name', D.map(x=>x.name).join()==='IMG_0102.MOV,IMG_0110.MOV,IMG_0103.MOV,IMG_0104.MOV');
const rm=F.packReadme({title:'Dry Creek',slug:'Dry_Creek',by:'Sam Actor',date:'Oct 18, 2026',link:'https://example.com/footage',cover:w,note:'Keep the laugh.'});
ok('the readme: the link, what each file is, the coverage, your note', /The footage: https:\/\/example\.com\/footage/.test(rm)&&/Dry_Creek plan vs got\.csv/.test(rm)&&/Not shot:/.test(rm)&&/From me: Keep the laugh\./.test(rm));
const zip=Z.make([{name:'a.txt',data:'hello'},{name:'b.csv',data:plan}]), dv=new DataView(zip.buffer);
ok('the zip: a real zip, two files, the end record where it should be', dv.getUint32(0,true)===0x04034b50&&dv.getUint32(zip.length-22,true)===0x06054b50&&dv.getUint16(zip.length-12,true)===2);
ok('crc32 of "hello"', Z.crc(new TextEncoder().encode('hello'))===0x3610a686);
// reads back with the site's own zip reader
const X=require('../../shared/xlsx.js'); 
(async()=>{ let back=null; try{ back=await X.zip(zip.buffer); }catch(e){ back=String(e); }
 ok('the site\'s own zip reader opens it', back&&typeof back==='object'&&Object.keys(back.files||back).some(k=>/b\.csv/.test(k)), back&&Object.keys(back.files||back));
 ok('no em dashes', !/—/.test(plan+got+w+rm));
 console.log(pass+' passed, '+fail+' failed'); process.exit(fail?1:0); })();
