/* seeds made-up characters with a real (test) recording and drawn looks, for screenshots and tests */
module.exports=async function seed(p,wavPath){
 const wav=require('fs').readFileSync(wavPath).toString('base64');
 await p.goto('http://localhost:8811/cps/manifest.webmanifest'); await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('cps_v02'); q.onsuccess=q.onerror=q.onblocked=()=>r(); }));
 await p.evaluate(async b64=>{ localStorage.removeItem('theactorpage_wave_v1');
  const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0)), wav=new Blob([bin],{type:'audio/wav'});
  const pic=(w,h,col)=>new Promise(r=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); g.fillStyle=col; g.fillRect(0,0,w,h); g.fillStyle='rgba(0,0,0,.25)'; g.beginPath(); g.arc(w/2,h*.38,Math.min(w,h)*.18,0,7); g.fill(); g.fillRect(w*.3,h*.6,w*.4,h*.4); c.toBlob(r,'image/jpeg',.8); });
  const db=await new Promise(r=>{ const q=indexedDB.open('cps_v02',1); q.onupgradeneeded=()=>{ q.result.createObjectStore('lib'); q.result.createObjectStore('media'); }; q.onsuccess=()=>r(q.result); });
  const put=(st,k,v)=>new Promise(r=>{ const t=db.transaction(st,'readwrite'); t.objectStore(st).put(v,k); t.oncomplete=r; });
  const an=hz=>({pitchHz:hz,pitchLoHz:hz*.86,pitchHiHz:hz*1.2,rangeSt:6,spanSec:5.8,silencePct:22,speechSec:4.5,brightHz:900});
  const L={schema:'ACT.CPS/0.2',app:'Character Bank',created:'2026-09-01T00:00:00Z',chars:[],cur:null,lastSaved:null,lines:'One, two, three.'};
  const mk=(id,name,proj,hz,line,look,extra)=>Object.assign({id,name,project:proj,created:'2026-09-01T10:00:00Z',updated:'2026-10-15T10:00:00Z',lastVisit:'2026-10-01T10:00:00Z',state:null,anchorLine:line,notes:'Low in the chest. Never looks at who he talks to.',refId:id+'v',takes:[{id:id+'v',kind:'voice',at:'2026-09-01T10:00:00Z',type:'audio/wav',an:an(hz)}],looks:look?[{id:id+'l',kind:'photo',at:'2026-09-02T10:00:00Z',type:'image/jpeg'}]:[],bd:null,never:'',vary:'',strain:'',strained:false,me:false,posture:'Squared up, heavy',weight:'',eyes:'Flat',hands:'',trigger:'',plays:'',neverDo:'',backs:[]},extra||{});
  L.chars=[mk('a','Old Sam','Harbor Lights',96,'Get off my land.',[1200,1600,'#b9a37f']),mk('b','Captain Rook','Pier Nine',140,'Nobody leaves the boat.',[1600,900,'#7d95a6']),mk('c','Gremlin','Salt Road',260,'Mine, mine, mine.',[800,800,'#a487a0'],{strained:true}),mk('d','Nana Pearl','Harbor Lights',220,'Sit. Eat. Then talk.',null,{state:'resting'})];
  for(const c of L.chars){ await put('media',c.id+'v',wav); }
  for(const [id,w,h,col] of [['a',1200,1600,'#b9a37f'],['b',1600,900,'#7d95a6'],['c',800,800,'#a487a0']]) await put('media',id+'l',await pic(w,h,col));
  await put('lib','main',L); db.close(); },wav);
 await p.goto('http://localhost:8811/cps/'); await p.waitForFunction(()=>window.CPS&&window.CPS.S&&window.CPS.S.lib,null,{timeout:8000});
};
