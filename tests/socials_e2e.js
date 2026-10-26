/* YOUR SOCIALS in YOUR PROFILE (home): just the handle, two ticks (on the card, on your page). Your page in the Hub:
   the ticked ones as small links at the bottom, and each credit has its own spot a POSTCARD link opens at.
   Made-up names only. Server on :8811. */
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1200,height:900}}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/how.html'); await p.evaluate(()=>{ localStorage.clear(); You.set('name','Riley Hart'); }); await p.reload(); await p.waitForTimeout(900);
await p.click('#ypd summary'); await p.waitForTimeout(200);
want('YOUR PROFILE: your socials, six of them, each with a place to type the handle', (await p.$$('#ypd .ysr')).length===6&&/Your socials/.test(await p.innerText('#ypd')));
await p.fill('#ys_instagram','rileyhart.acts'); await p.fill('#ys_page','rileyhart.example');
await p.check('[data-ysc="onPage:instagram"]'); await p.uncheck('[data-ysc="onCard:instagram"]');
const y=await p.evaluate(()=>You.get());
want('kept in YOU: the handle, the page, the ticks', y.instagram==='rileyhart.acts'&&y.page==='rileyhart.example'&&y.onPage.instagram===true&&y.onCard.instagram===false, y);
want('your page has no ON YOUR PAGE tick (it is the page)', !(await p.$('[data-ysc="onPage:page"]')));
const box=await p.$eval('#ypd',e=>{ const r=e.getBoundingClientRect(), n=e.parentElement.nextElementSibling; return [r.bottom, n?n.getBoundingClientRect().top:1e9]; });
await p.goto('http://localhost:8811/hub/'); await p.waitForTimeout(1500);
const html=await p.evaluate(()=>packageHTML({profile:{name:'Riley Hart'},credits:[{title:'Harbor Lights & Co.',role:'Guest star'}],socials:Postcard.onPage(You.get()).filter(x=>x.url)}));
want('your page: each credit has its spot (#c-harbor-lights-and-co)', /<article class="crow" id="c-harbor-lights-and-co">/.test(html));
want('your page: the socials you ticked, as small links', /<a class="soc" href="https:\/\/www\.instagram\.com\/rileyhart\.acts\/"[^>]*>Instagram<\/a>/.test(html));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
