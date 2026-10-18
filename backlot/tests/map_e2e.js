/* BACKLOT MAP: your pins, to scale, north up, on this phone. Made-up pins near a made-up crossroads. Server on :8811.
   NODE_PATH=... node backlot/tests/map_e2e.js */
const {chromium}=require('playwright');
(async()=>{ const SHOTS=process.env.SHOTS||'/tmp';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:390,height:844},geolocation:{latitude:38.8404,longitude:-97.6105,accuracy:6},permissions:['geolocation']});
const p=await ctx.newPage(); const errs=[], reqs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('request',r=>{ if(!/localhost:8811/.test(r.url())) reqs.push(r.url()); });
let ok=true; const want=(n,c,x)=>{ console.log((c?'PASS ':'FAIL ')+n+(c||x===undefined?'':' '+JSON.stringify(x).slice(0,500))); if(!c) ok=false; };
await p.goto('http://localhost:8811/backlot/'); await p.evaluate(()=>{ localStorage.clear();
 localStorage.setItem('film_os_v1',JSON.stringify({cur:'',scripts:{},owned:[
  {id:'a',kind:'location',name:'Red barn',where:'38.8400, -97.6100',plays:'jail'},{id:'b',kind:'location',name:'Creek rocks',where:'38.8409, -97.6100'},
  {id:'c',kind:'location',name:'Kitchen',where:'38.8400, -97.6110'},{id:'d',kind:'location',name:'Hardware store',where:'38.8800, -97.6100'},
  {id:'e',kind:'location',name:'Back porch',where:''},{id:'p',kind:'prop',name:'rope'}]})); });
await p.goto('http://localhost:8811/backlot/?tab=list'); await p.waitForTimeout(400);
await p.click('[data-view="map"]'); await p.waitForTimeout(250);
let m=await p.innerText('#main');
want('the map: your ground first (3 pins), the town as its own group, All', (await p.$$('.mp')).length===3&&(await p.$$eval('[data-grp]',x=>x.map(b=>b.textContent))).join('|')==='Red barn + 2|Hardware store|All', await p.$$eval('[data-grp]',x=>x.map(b=>b.textContent)));
want('a spot with no pin is listed under it', /No pin yet/i.test(m)&&/Back porch/.test(m));
want('north arrow and a scale bar in feet', !!(await p.$('.mn'))&&/\d+ ft/.test(await p.$eval('.ms text',t=>t.textContent)), await p.$eval('.ms text',t=>t.textContent));
const pos=await p.$$eval('.mp',x=>x.map(g=>[g.dataset.pin,g.transform.baseVal[0].matrix.e,g.transform.baseVal[0].matrix.f]));
const A=pos.find(x=>x[0]==='a'), B_=pos.find(x=>x[0]==='b'), C=pos.find(x=>x[0]==='c');
want('to scale, north up: the creek straight above the barn, the kitchen to its left', Math.abs(A[1]-B_[1])<1&&B_[2]<A[2]&&C[1]<A[1]&&Math.abs(C[2]-A[2])<1, pos);
await p.click('.mp[data-pin="a"]'); await p.waitForTimeout(200); m=await p.innerText('#main');
want('tap the barn: the others, how far, on foot', /Kitchen: 280 ft, under a minute on foot|Kitchen: 2\d0 ft, (about 1 min|under a minute) on foot/.test(m)&&/Creek rocks: 330 ft, about 1 min on foot/.test(m), m.slice(-700));
want('the walk to all of them from here', /All of them from here, nearest next: Red barn → Kitchen → Creek rocks\./.test(m), m.slice(-500));
want('dashed lines from the barn to the others', (await p.$$('.ml')).length===2);
want('open in a maps app: said that it sends the pin', /that sends the pin to the map company/.test(m));
await p.screenshot({path:SHOTS+'/bl_map.png',fullPage:true});
const sb0=await p.$eval('.ms text',t=>t.textContent); await p.click('#zin'); await p.waitForTimeout(150); await p.click('#zin'); await p.waitForTimeout(150);
want('zoom in: the scale bar gets shorter in feet', parseInt(await p.$eval('.ms text',t=>t.textContent))<parseInt(sb0), [sb0,await p.$eval('.ms text',t=>t.textContent)]);
const before=await p.$eval('.mp[data-pin="a"]',g=>g.transform.baseVal[0].matrix.e);
const box=await p.$eval('#map',s=>{ const r=s.getBoundingClientRect(); return [r.x+20,r.y+r.height-60]; });
await p.mouse.move(box[0],box[1]); await p.mouse.down(); await p.mouse.move(box[0]+60,box[1],{steps:5}); await p.mouse.up(); await p.waitForTimeout(200);
const after=await p.$eval('.mp[data-pin="a"]',g=>g.transform.baseVal[0].matrix.e);
want('drag to move the map', after>before+40, [before,after]);
await p.click('#zfit'); await p.waitForTimeout(150);
want('FIT puts it back', Math.abs(await p.$eval('.mp[data-pin="a"]',g=>g.transform.baseVal[0].matrix.e)-A[1])<1);
await p.click('[data-grp="1"]'); await p.waitForTimeout(200);
want('the town group: one pin', (await p.$$('.mp')).length===1);
await p.click('[data-grp="-1"]'); await p.waitForTimeout(200);
want('All: four pins, scale in miles', (await p.$$('.mp')).length===4&&/mi$/.test(await p.$eval('.ms text',t=>t.textContent)), await p.$eval('.ms text',t=>t.textContent));
// I'M HERE
await p.click('[data-open-spot="e"]'); await p.waitForTimeout(250);
want('on a spot: where it is, I\'M HERE, and that the phone asks first', !!(await p.$('#here'))&&/Your phone asks first\. The pin stays on this phone/.test(await p.innerText('#main')));
await p.click('#here'); await p.waitForTimeout(600);
const w=await p.evaluate(()=>JSON.parse(localStorage.getItem('film_os_v1')).owned.find(o=>o.id==='e').where);
want('I\'M HERE: pinned where you stand, kept in the shared list', w==='38.840400, -97.610500'&&/Pinned\. It shows on the MAP\./.test(await p.innerText('#main')), w);
await p.goto('http://localhost:8811/backlot/?tab=list'); await p.waitForTimeout(300);
want('the map remembers you were on it; the porch has a pin now', (await p.$$('.mp')).length>=4&&!/No pin yet/i.test(await p.innerText('#main')));
// a deal across two spots: the walk between them
await p.goto('http://localhost:8811/backlot/?tab=ground'); await p.waitForTimeout(300);
await p.click('[data-gs="a"]'); await p.click('[data-gs="b"]'); await p.click('#deal'); await p.waitForTimeout(200);
want('a deal over two spots says the walk between them', /Between them: 330 ft, about 1 min on foot\./.test(await p.innerText('.deal')), await p.innerText('.deal'));
want('nothing looked up or sent: no request off this site', !reqs.length, reqs);
want('nothing runs off the side, no em dashes', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)&&!/—/.test(await p.innerText('body')));
want('no page errors', !errs.length, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
