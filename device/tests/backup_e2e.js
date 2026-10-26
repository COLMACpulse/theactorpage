/* ON THIS DEVICE: the backup holds every tool, including the ones built after it (profile with headshots and résumé,
   takes, inbox, NOTES, SPOTTED, HEADSHOTS, VO BOOTH, SET LIST, FILM HUB). Made-up data. Server on :8811.
   NODE_PATH=... node device/tests/backup_e2e.js */
const {chromium}=require('playwright'); const path=require('path'), fs=require('fs'), {execFileSync}=require('child_process'), os=require('os');
(async()=>{ const FX=path.join(__dirname,'..','..','shared','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const c=await b.newContext({acceptDownloads:true}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{ localStorage.clear(); ['theactorpage_you','filmhub','theactorpage_takes'].forEach(n=>indexedDB.deleteDatabase(n)); }); await p.reload(); await p.waitForTimeout(800);
// a profile with a headshot and a résumé, through home's own drop
await p.setInputFiles('#dropfile',[path.join(FX,'sam_actor_resume.pdf'),path.join(FX,'made_up_face.jpg')]); await p.waitForTimeout(2500);
await p.evaluate(async()=>{
 localStorage.setItem('theactorpage_spotted_v1',JSON.stringify({items:[{id:'s1',card:{project:'NORTHGATE COFFEE'}}],me:{},held:[]}));
 localStorage.setItem('theactorpage_notes_v1',JSON.stringify({sessions:[{id:'n1',date:'2026-03-12',who:[{name:'Dana Pell'}]}],notes:[]}));
 localStorage.setItem('booth_v1',JSON.stringify({job:{client:'Salt Flats Water'}}));
 localStorage.setItem('filmhub_v1',JSON.stringify({films:[{id:'f1',title:'Dry Creek'}],studio:{},me:{banner:'Salt Road Pictures'}}));
 localStorage.setItem('rooms_seen_slate','x');
 const blob=await (await fetch('shared/fixtures/made_up_face.jpg')).blob();
 await new Promise(res=>{ const r=indexedDB.open('filmhub',1); r.onupgradeneeded=()=>r.result.createObjectStore('posters'); r.onsuccess=()=>{ const t=r.result.transaction('posters','readwrite'); t.objectStore('posters').put(blob,'f1'); t.oncomplete=()=>{ r.result.close(); res(); }; }; });
});
await p.goto('http://localhost:8811/device/index.html'); await p.waitForTimeout(1500);
if(await p.$('#alltools')){ await p.click('#alltools'); await p.waitForTimeout(500); }
const page=await p.innerText('body');
want('the page lists the newer tools', ['Your profile (headshots, résumé)','Spotted','Notes','VO Booth','Film Hub'].every(t=>page.includes(t)), page.slice(0,800));
const btn=await p.$$eval('button',x=>x.map(y=>y.id+':'+y.textContent.trim()).filter(t=>/back/i.test(t)));
const id=(btn[0]||'').split(':')[0];
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#'+id)]);
const zip=await dl.path(), T=fs.mkdtempSync(path.join(os.tmpdir(),'bk-')); execFileSync('unzip',['-q','-o',zip,'-d',T]);
const m=JSON.parse(fs.readFileSync(path.join(T,'backup.json'),'utf8'));
const ls=Object.keys(m.ls), dbs=m.idb.map(d=>d.name);
want('in the file: profile, spotted, notes, booth, film hub words', ['theactorpage_you_v1','theactorpage_spotted_v1','theactorpage_notes_v1','booth_v1','filmhub_v1'].every(k=>ls.includes(k)), ls);
want('in the file: the profile\'s photos and résumé, and FILM HUB\'s posters', dbs.includes('theactorpage_you')&&dbs.includes('filmhub'), dbs);
const you=m.idb.find(d=>d.name==='theactorpage_you'), keys=you?you.stores[0].records.map(r=>r.k):[];
want('the résumé file itself is in it, with a headshot', keys.includes('resume')&&keys.some(k=>/^h/.test(String(k))), keys);
want('the media are real files in the zip', m.media.length>=3&&m.media.every(x=>fs.existsSync(path.join(T,'media',String(x.i)))), m.media.length);
want('home\'s "is this new" marks are left out', !ls.some(k=>/^rooms_seen_/.test(k)));
fs.rmSync(T,{recursive:true,force:true});
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
