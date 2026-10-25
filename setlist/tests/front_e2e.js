/* SET LIST, the paper bag man (Col, Oct 25): on a computer he stands on the left of the page, the whole way down,
   and the tabs sit beside him; on a phone he's up top. Funny is funny. Nobody cares who you are. Be funny.
   GO · 30 SECONDS asks for the camera first, never on its own. No bag camera, no votes, no scores.
   Computer light, phone dark. Server on :8811.  NODE_PATH=... node setlist/tests/front_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const errs=[];
for(const [nm,vp,cs] of [['desk',{width:1280,height:860},'light'],['phone',{width:390,height:844},'dark']]){
 const c=await b.newContext({viewport:vp,colorScheme:cs,serviceWorkers:'block',isMobile:nm==='phone',hasTouch:nm==='phone'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(nm+' '+e.message));
 let asked=0; await c.addInitScript(()=>{ const o=navigator.mediaDevices&&navigator.mediaDevices.getUserMedia; if(o) navigator.mediaDevices.getUserMedia=function(){ window.__asked=(window.__asked||0)+1; return o.apply(this,arguments); }; });
 await p.goto('http://localhost:8811/setlist/'); await p.evaluate(()=>localStorage.removeItem('setlist_v1')); await p.reload(); await p.waitForTimeout(800);
 const img=await p.evaluate(nm=>{ const el=document.querySelector(nm==='desk'?'.side img':'.hero .banner img'); if(!el) return null; const r=el.getBoundingClientRect(); return {loaded:el.complete&&el.naturalWidth>0,l:r.left,t:r.top,w:r.width,h:r.height}; },nm);
 if(nm==='desk') want('computer: the paper bag man on the left, the whole height', img&&img.loaded&&img.l===0&&img.t===0&&img.h>=850&&img.w>=400, img);
 else want('phone: the paper bag man up top', img&&img.loaded&&img.t<120&&img.w>=380, img);
 if(nm==='desk') want('computer: the page and the tabs sit beside him, not over him', await p.evaluate(()=>{ const s=document.querySelector('.side').getBoundingClientRect(), m=document.querySelector('main').getBoundingClientRect(), t=document.getElementById('tabs').getBoundingClientRect(); return m.left>=s.right-1&&t.left>=s.right-1; }));
 const h=await p.innerText('.hero');
 want(nm+': Funny is funny. Nobody cares who you are. Be funny.', /Funny is funny\./.test(h)&&/Nobody cares who you are\. Be funny\./.test(h));
 want(nm+': GO · 30 SECONDS, and it says it asks for the camera first', /GO · 30 SECONDS/.test(h)&&/asks for the camera first/i.test(h));
 want(nm+': nothing turns on at load', await p.evaluate(()=>!window.__asked));
 want(nm+': no bag camera, no votes, no scores', !/bag camera|vote|score|laughs/i.test(await p.innerText('body')));
 await p.screenshot({path:SHOTS+'/setlist_'+nm+'.png'});
 await p.click('#tabs button[data-t="sets"]'); await p.waitForTimeout(200);
 want(nm+': the hero is the first screen only', !(await p.$('.hero')));
 if(nm==='desk') want('computer: he stays on the left on every tab', await p.isVisible('.side img'));
 want(nm+': nothing off the side', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': no em dashes, no "thing"', await p.evaluate(()=>!/[—]/.test(document.body.innerText)&&!/\bthings?\b/i.test(document.body.innerText)));
 await c.close(); }
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
