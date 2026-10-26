/* PICTURE IT in the browser: add to the wall with a picture, the trail, a request for a show on it, who casts it,
   the news (a made-up wire), the reps sheet, the shameless plug, press and credits, the lock screen.
   Made-up shows and pictures only. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path');
const A=path.join(__dirname,'poster_a.jpg');
const WIRE={v:1,at:'2026-10-22T10:00:00Z',sources:[{id:'tr',label:'The Trade',ok:true}],items:[
 {id:'n1',src:'tr',kind:'news',title:'Harbor Lights Adds Two to the Cast',link:'https://example.com/hl',date:'2026-10-20T00:00:00Z',summary:'The drama shoots in the spring.'},
 {id:'n2',src:'tr',kind:'news',title:'Lights out at the harbor',link:'https://example.com/x',date:'2026-10-20T00:00:00Z'}]};
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,300))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
await c.route('https://raw.githubusercontent.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(WIRE)}));
const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8811/picture/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_viz'); }); await p.reload(); await p.waitForTimeout(400);
const t0=await p.innerText('main');
want('empty wall: says what it is for, one way in', /YOUR WALL IS EMPTY/.test(t0)&&/ADD WHAT YOU WANT/.test(t0)&&!/LOCK SCREEN/.test(t0));
await p.click('#addOpen'); await p.fill('#a_t','Harbor Lights'); await p.setInputFiles('#a_p',A); await p.click('#a_go'); await p.waitForTimeout(500);
await p.click('#addOpen'); await p.fill('#a_t','Union card'); await p.click('#a_k [data-k="milestone"]'); await p.click('#a_go'); await p.waitForTimeout(300);
await p.click('#addOpen'); await p.fill('#a_t','Dana Wolfe'); await p.click('#a_k [data-k="person"]'); await p.press('#a_t','Enter'); await p.waitForTimeout(300);
const tiles=await p.$$eval('.wish',x=>x.map(e=>e.innerText.replace(/\s+/g,' ')));
want('three on the wall, under WANT IT, the date they went up', tiles.length===3&&/WANT IT/.test(await p.innerText('main'))&&tiles.every(t=>/WANT IT [A-Z][a-z]{2} \d+, 20\d\d/.test(t)), tiles);
want('your picture on its tile; no picture, its name in type', await p.$$eval('.wish img',x=>x.length)===1&&/UNION CARD/.test(await p.innerText('.wish:nth-child(2) .type')));
/* a request for it */
await p.evaluate(()=>Inbox.put('request',{title:'HARBOR LIGHTS',role:'Deckhand',due:new Date(Date.now()+864e5).toISOString().slice(0,10)}));
await p.reload(); await p.waitForTimeout(400);
want('a request for a show on the wall: the tile says so', /IN YOUR REQUESTS/.test(await p.innerText('.wish:first-child')));
/* the news */
await p.click('#news'); await p.waitForTimeout(600);
want('CHECK THE NEWS: the whole-phrase story only', /In the news: 1 on your wall/.test(await p.innerText('#msg')), await p.innerText('#msg'));
/* one wish */
await p.click('.wish:first-child'); await p.waitForTimeout(400);
let o=await p.innerText('main');
want('one wish: the trail, the request, the news, who casts it, reps', /THE TRAIL/.test(o)&&/HARBOR LIGHTS, Deckhand/.test(o)&&/Harbor Lights Adds Two to the Cast/.test(o)&&!/Lights out at the harbor/.test(o)&&/WHO CASTS IT/.test(o)&&/Put it on my reps sheet/.test(o));
want('plug it any time, booked or not', /SHAMELESS PLUG/.test(o)&&/PLUG IT/.test(o));
await p.fill('#c_new','Tidewater Casting'); await p.click('#c_go'); await p.waitForTimeout(300);
want('who casts it: into CONTACTS as casting, linked', /Tidewater Casting/.test(await p.innerText('main'))&&await p.evaluate(()=>{ const x=Contacts.find('Tidewater Casting'); return !!x&&x.role==='casting'; }));
await p.check('#o_reps'); await p.waitForTimeout(100);
want('on the reps sheet: Viz.forReps has it', await p.evaluate(()=>Viz.forReps().map(x=>x.title).join())==='Harbor Lights');
await p.click('[data-today="room"]'); await p.waitForTimeout(300);
want('in the room: dated today', await p.evaluate(()=>Viz.at(Viz.all()[0]).label)==='In the room');
await p.click('[data-today="booked"]'); await p.waitForTimeout(400);
o=await p.innerText('main');
want('booked: says it stays up, reps line goes', /Got it. It stays on your wall/.test(o)&&!/Put it on my reps sheet/.test(o));
await p.click('#o_plug'); await p.waitForTimeout(400);
want('PLUG IT from the wall: it\'s going to air, title in, starts empty: your words, not ours', /FROM YOUR WALL: HARBOR LIGHTS/.test(await p.innerText('main'))&&(await p.inputValue('#q_title'))==='Harbor Lights'&&(await p.inputValue('#q_text'))===''&&await p.$eval('#q_kind .chip.on',e=>e.dataset.k)==='airing');
want('the wall picture comes with it', await p.$$eval('.card img',x=>x.length)>=1);
const d=new Date(); d.setDate(d.getDate()+(((8-d.getDay())%7)||7)+4); /* Friday of next week */ const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
await p.fill('#q_date',iso); await p.fill('#q_time','22:00'); await p.fill('#q_where','the Harbor Network'); await p.fill('#q_role','Deckhand');
await p.fill('#q_text','Check out'); await p.click('[data-tok="[TITLE]"]'); await p.click('[data-tok="[WHEN]"]'); await p.type('#q_text',' on'); await p.click('[data-tok="[WHERE]"]'); await p.type('#q_text','.');
const pv=await p.innerText('#q_prev');
want('the plug: your words, the facts dropped in, said the way you would', /^Check out Harbor Lights next Friday night at 10:00 PM on the Harbor Network\.$/.test(pv), pv);
await p.click('#q_copy'); await p.waitForTimeout(200);
want('COPY IT', (await p.evaluate(()=>navigator.clipboard.readText()))===pv&&/Copied/.test(await p.innerText('#msg')));
await p.click('#q_keep'); await p.waitForTimeout(100);
want('your way of saying it, kept for that kind of plug', await p.evaluate(()=>Viz.shapeFor('airing'))==='Check out [TITLE] [WHEN] on [WHERE].'&&await p.evaluate(()=>Viz.shapeFor('headshot'))==='');
await p.click('#q_cred'); await p.waitForTimeout(200);
want('ADD IT TO MY CREDITS', await p.evaluate(()=>You.get().credits.some(c=>c.title==='Harbor Lights'&&c.role==='Deckhand')));
await p.click('#q_press'); await p.waitForURL(/press\/\?c=/); await p.waitForTimeout(400);
want('TELL THE PRESS TOO: a Press campaign, with the air date', await p.evaluate(d=>Press.all().some(c=>c.title==='Harbor Lights'&&c.date===d),iso));
/* a plug with nothing on the wall: a new headshot */
await p.goto('http://localhost:8811/picture/'); await p.waitForTimeout(300);
await p.evaluate(async()=>{ const r=await fetch('tests/poster_b.jpg'); const b=await r.blob(); await You.addPhoto(new File([b],'new_headshot.jpg',{type:'image/jpeg'})); });
await p.click('a[data-go="plugs"]'); await p.waitForTimeout(300);
let pl=await p.innerText('main');
want('SHAMELESS PLUG tab: the four kinds, and the plug you made', /IT'S GOING TO AIR/.test(pl)&&/A NEW HEADSHOT/.test(pl)&&/SOMETHING I WORKED ON/.test(pl)&&/OTHER NEWS/.test(pl)&&/Check out Harbor Lights next Friday/.test(pl));
await p.click('[data-new="headshot"]'); await p.waitForTimeout(400);
want('a new headshot: asks only who shot it, offers your headshots', await p.$('#q_by')&&!(await p.$('#q_title'))&&!(await p.$('#q_date'))&&(await p.$$eval('[data-you]',x=>x.length))===1);
await p.click('[data-you]'); await p.waitForTimeout(400);
await p.fill('#q_by','Sam Ortiz'); await p.fill('#q_text','New headshots, shot by'); await p.click('[data-tok="[BY]"]'); await p.type('#q_text','.');
want('the headshot plug, with your headshot as the picture', (await p.innerText('#q_prev'))==='New headshots, shot by Sam Ortiz.'&&await p.$eval('[data-you]',e=>e.classList.contains('on'))&&!(await p.$('#q_press')));
await p.click('[data-k="worked"]'); await p.waitForTimeout(300);
want('change the kind: the fields follow, your words stay', await p.$('#q_title')&&await p.$('#q_role')&&!(await p.$('#q_date'))&&(await p.inputValue('#q_text'))==='New headshots, shot by [BY].');
await p.click('#q_del'); await p.waitForTimeout(300);
want('delete a plug', await p.evaluate(()=>Viz.plugs().length)===1);
await p.click('a[data-go=""]'); await p.waitForTimeout(300);
await p.goto('http://localhost:8811/picture/'); await p.waitForTimeout(400);
want('the wall: GOT IT, with BOOKED on it', /GOT IT/.test(await p.innerText('main'))&&/BOOKED/.test(await p.innerText('.wallbox:last-of-type')));
/* week */
await p.goto('http://localhost:8811/how.html'); await p.waitForTimeout(1200);
want('home, in YOU: your wall, small, booked marked', (await p.$$eval('#viz .gs-wall a',x=>x.length))===3&&/BOOKED/.test(await p.innerText('#viz')));
want('home, in YOU: SHAMELESS PLUG, one tap', await p.getAttribute('#st_plug','href')==='picture/?plugs');
want('YOUR AGENDA: the tape for a show on your wall says so', /Tape due tomorrow: HARBOR LIGHTS, Deckhand\. It’s on your wall\./.test(await p.innerText('#week')), await p.innerText('#week'));
/* lock screen */
await p.goto('http://localhost:8811/picture/?lock'); await p.waitForTimeout(300);
await p.click('#l_go'); await p.waitForSelector('#l_img:not(.hide)',{timeout:10000}).catch(()=>{});
const dim=await p.evaluate(()=>{ const i=document.getElementById('l_img'); return [i.naturalWidth,i.naturalHeight]; });
want('MAKE IT MY LOCK SCREEN: a phone-sized picture, saved as a file, how to set it', dim[0]===1179&&dim[1]===2556&&(await p.getAttribute('#l_save','download'))==='picture-it-lock-screen.png'&&/Use as Wallpaper/.test(await p.innerText('main')), dim);
await p.screenshot({path:path.join(require('os').tmpdir(),'picture_lock_page.png')});
/* remove */
await p.goto('http://localhost:8811/picture/'); await p.waitForTimeout(300);
await p.click('.wish:has-text("Dana Wolfe")'); await p.waitForTimeout(300); await p.click('#o_del'); await p.waitForTimeout(300);
want('take it off the wall', !(await p.innerText('main')).includes('Dana Wolfe'));
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
