/* READ IN parts: the link carries the scene and nothing else; the file back carries the reads. Made-up lines.  node shared/test_readin.js */
global.Zip=require('./zipw.js'); const R=require('./readin.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
(async()=>{
const sc={v:1,title:'Dry Creek',file:'dry_creek.txt',me:'WREN',from:'Sam Actor',notes:'private note',lines:[{k:'a1',who:'WREN',text:'We close at ten.',mine:true,take:'x'},{k:'b2',who:'HAL',text:'Then I have twenty minutes.'},{k:'c3',who:'JOSÉ',text:'¿Dónde está?'}]};
const h=await R.pack(sc);
want('the link: after the #, squeezed', /^#r=z[A-Za-z0-9_-]+$/.test(h), h.slice(0,40));
const back=await R.unpack('https://x.example/read/'+h);
want('it opens to the same scene, accents and all', back.title==='Dry Creek'&&back.lines.length===3&&back.lines[2].who==='JOSÉ'&&back.lines[0].mine===true);
want('only the lines go in the link: no notes, no takes', !('notes' in back)&&!('take' in back.lines[0]));
want('a cut-short link opens to nothing, not garbage', await R.unpack('#r=z'+h.slice(4,20)).catch(()=>null)===null);
want('no scene in the link: nothing', await R.unpack('#x=1')===null);
const big={...sc,lines:Array.from({length:120},(_,i)=>({k:'k'+i,who:i%2?'HAL':'WREN',text:'This is line number '+i+' of a long scene, and it goes on a while.',mine:!(i%2)}))};
const hb=await R.pack(big);
want('a long scene still fits a text message link', hb.length<4000, hb.length);
const zip=R.bundle(back,{b2:{data:new Uint8Array([1,2,3]),ext:'m4a'},c3:{data:new Uint8Array([4,5]),ext:'webm'}},'Jo Reader');
const got=R.unbundle(zip);
want('the file back: every read, named in scene order, with who read it', got.man.by==='Jo Reader'&&got.lines.map(l=>l.file).join()==='01 HAL.m4a,02 JOSÉ.webm'&&got.lines[0].data.length===3&&got.lines[0].k==='b2', got.lines.map(l=>l.file));
want('your own lines are never in it', !got.man.lines.some(l=>l.k==='a1'));
want('a zip that is not a read is refused', (()=>{ try{ R.unbundle(Zip.make([{name:'x.txt',data:'hi'}])); return false; }catch(e){ return true; } })());
want('no em dashes', !/—/.test(require('fs').readFileSync(__dirname+'/readin.js','utf8')+require('fs').readFileSync(__dirname+'/../read/app.js','utf8')+require('fs').readFileSync(__dirname+'/../actor-os/readinui.js','utf8')));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
