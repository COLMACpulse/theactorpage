/* ARCHBOOK → YOUR PAGE: a made reel goes to the Project Hub with one tap, as a reel. Made-up clip.
   Server on :8811.  NODE_PATH=... node archbook/tests/topage_e2e.js */
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/archbook/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForFunction(()=>window.ARCHBOOK&&ARCHBOOK.S.lib,null,{timeout:8000});
const clip=fs.readFileSync(path.join(__dirname,'..','..','shared','fixtures','made_up_clip.mp4')).toString('base64');
await p.evaluate(async clip=>{ const s=atob(clip),u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); const blob=new Blob([u],{type:'video/mp4'});
 const S=ARCHBOOK.S; S.lib.reels.push({id:'r1',name:'Westerns',items:[],target:60}); S.reelId='r1'; S.tab='reel';
 S.rendered={reel:'r1',blob,mime:'video/mp4',codec:'avc1',url:URL.createObjectURL(blob),name:'riley_westerns.mp4'}; await ARCHBOOK.act('openreel',{id:'r1'}); },clip);
await p.waitForTimeout(300);
want('a made reel: PUT IT ON YOUR PAGE, next to Download', /PUT IT ON YOUR PAGE/.test(await p.innerText('#renderout')));
await p.click('[data-a="topage"]'); await p.waitForTimeout(500);
const T=await p.evaluate(()=>Takes.all('reel').map(t=>({name:t.name,title:t.for.title,kept:t.kept})));
want('sent: it is waiting for the Hub, as a reel named for the reel', T.length===1&&T[0].title==='Westerns'&&T[0].kept&&T[0].name==='riley_westerns.mp4', T);
want('the button says so, and a second tap sends nothing more', /ON YOUR PAGE ✓/.test(await p.innerText('#renderout'))&&await p.$eval('[data-a="topage"]',b=>b.disabled));
await p.goto('http://localhost:8811/hub/'); await p.waitForTimeout(2000);
want('the Hub picks it up, as a reel', await p.evaluate(()=>ARTS.some(a=>a.category==='reel'&&a.label==='riley_westerns')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
