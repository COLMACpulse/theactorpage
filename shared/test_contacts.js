/* CONTACTS, the pure parts. Made-up people only.  node shared/test_contacts.js */
const mem={}; global.localStorage={getItem:k=>mem[k]==null?null:mem[k],setItem:(k,v)=>{mem[k]=String(v);},removeItem:k=>{delete mem[k];}};
const C=require('./contacts.js'); let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
want('the same person however it is written', C.key('Dana Pell Casting')===C.key('dana pell')&&C.key('Mesa, CSA')===C.key('MESA'));
const a=C.add({name:'Dana Pell',role:'casting',company:'Pell Casting'});
want('add, and adding again by another spelling updates the one person', C.add({name:'dana pell',email:'dana@example.com'}).id===a.id&&C.mine().length===1&&C.get(a.id).email==='dana@example.com');
const src={notes:[{name:'Jo Banner',role:'director',sessions:2,notes:3},{name:'Dana Pell',role:'casting',sessions:1,notes:0},{name:'me',sessions:1}],
 projects:[{casting_office:'Mesa Casting',project:'Harbor Lights'},{casting_office:'Mesa Casting',project:'Dust Road'},{casting:'Pell Casting',project:'Low Tide'}],
 spotted:{items:[{card:{project:'Salt Flat',casting:['Canyon Casting']}}],me:{reps:[{name:'Agent A',email:'a@example.com'}]}}};
const k=C.gather(src);
want('the tools know: Notes people with their counts, Hub offices with audition counts, Spotted casting and reps; never "me"', k.find(x=>x.name==='Jo Banner').from[0]==='Notes: 2 sessions, 3 notes'&&k.find(x=>x.name==='Mesa Casting').from[0]==='Hub: 2 auditions, last Dust Road'&&k.find(x=>x.name==='Canyon Casting').from[0]==='Spotted: casting Salt Flat'&&k.find(x=>x.name==='Agent A').role==='agent'&&!k.some(x=>/^me$/i.test(x.name)), k);
const ev=C.everyone(src);
want('everyone: kept people carry what the tools know; the rest show up as from your tools, once', ev.filter(x=>C.key(x.name)===C.key('Dana Pell')).length===1&&ev.find(x=>x.name==='Dana Pell').kept&&ev.find(x=>x.name==='Dana Pell').from.length===2&&ev.find(x=>x.name==='Mesa Casting').kept===false, ev.map(x=>x.name));
want('Pell Casting from the Hub is Dana Pell\'s office: on her, not a second person', !ev.some(x=>x.name==='Pell Casting')&&ev.find(x=>x.name==='Dana Pell').from.some(f=>/Hub: 1 audition, last Low Tide/.test(f)));
want('adding again never renames the person', C.get(a.id).name==='Dana Pell');
want('find: by name, office, role, city, where the tools know them', C.match(ev.find(x=>x.name==='Jo Banner'),'director')&&C.match(ev.find(x=>x.name==='Mesa Casting'),'dust road')&&!C.match(ev.find(x=>x.name==='Jo Banner'),'casting'));
const r=C.add({name:'Morgan Lee',role:'agent',company:'Lee Talent'}); C.setRep(r.id,{kind:'theatrical',how:'email',next:'2026-10-01'});
want('a rep you look at: researching to start, with how and when to follow up', C.get(r.id).rep.step==='researching'&&C.looking().length===1&&C.due('2026-10-21').length===1&&C.myReps().length===0);
C.setRep(r.id,{step:'submitted'}); C.setRep(r.id,{step:'meeting'});
want('every step is logged with its day', C.get(r.id).rep.log.map(l=>l.step).join()==='submitted,meeting');
C.setRep(r.id,{step:'signed'});
want('signed: one of your reps, out of looking, no follow-up nag', C.myReps().length===1&&C.looking().length===0&&C.due('2026-10-21').length===0);
C.set(a.id,{dnc:true}); want('do not contact is kept on the person', C.get(a.id).dnc===true);
C.remove(a.id); want('remove: gone from your list', !C.get(a.id)&&C.mine().length===1);
want('no em dashes', !/—/.test(require('fs').readFileSync(__dirname+'/contacts.js','utf8')));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
