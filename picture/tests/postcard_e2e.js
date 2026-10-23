/* THE POSTCARD in the browser: a plug made into a card. Four looks, four sizes, the links (page always, opening at
   the credit; where to watch; rep if ticked; the QR), keep this design, then SEND IT: post, email one at a time (an
   office that says no email warns), mail (addressed backs, print files). Nothing leaves the device.
   Made-up names and pictures only. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), os=require('os');
const A=path.join(__dirname,'poster_a.jpg');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:1100,height:1000}}); await c.grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://localhost:8811'});
const p=await c.newPage(); const errs=[], out=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
p.on('request',r=>{ const u=r.url(); if(!/^http:\/\/localhost:8811\//.test(u)&&!/^(data|blob|about):/.test(u)) out.push(u); });
await p.goto('http://localhost:8811/picture/'); await p.evaluate(()=>{ localStorage.clear(); indexedDB.deleteDatabase('theactorpage_viz'); }); await p.reload(); await p.waitForTimeout(400);
await p.evaluate(()=>{ You.set('name','Riley Hart'); You.set('instagram','rileyhart.acts'); You.set('page','rileyhart.example'); You.set('rep','Jordan Reyes'); You.set('repPhone','555-0100');
 Contacts.add({name:'Ellis Park Casting',role:'casting',email:'ellis@example.com'}); Contacts.add({name:'Coastline Casting',role:'casting',email:'coast@example.com',plug:'noemail'}); Contacts.add({name:'Marlow Lane',role:'casting'});
 const q=Viz.plugAdd({kind:'airing',title:'Harbor Lights',role:'Guest star',where:'Northstar+',text:'Guest starring on [TITLE], Episode 1.4. On [WHERE].'}); window.__q=q.id; });
const qid=await p.evaluate(()=>window.__q);
/* anchors clicked for mailto: kept, not followed */
await p.addInitScript(()=>{ const o=HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click=function(){ if(/^mailto:/.test(this.href)){ (window.__mail=window.__mail||[]).push(this.href); return; } if(this.download){ (window.__dl=window.__dl||[]).push(this.download); return; } return o.call(this); }; window.print=()=>{}; });
await p.goto('http://localhost:8811/picture/?plug='+qid); await p.waitForTimeout(400);
await p.setInputFiles('#q_pic',A); await p.waitForTimeout(600);
want('the plug has MAKE THE CARD, opt-in', !!(await p.$('#q_card')));
await p.click('#q_card'); await p.waitForTimeout(900);
want('the card view: its own address', new URL(p.url()).searchParams.get('card')===qid);
const t=await p.innerText('main');
want('four looks, four sizes', (await p.$$('[data-look]')).length===4&&(await p.$$('[data-size]')).length===4);
want('the links: your page, always, opening at this credit', /rileyhart\.example#c-harbor-lights/.test(t)&&/opens right at this credit/.test(t), t.slice(0,800));
want('on the card: your photo, your Instagram (ticked), your page address (not ticked)', await p.isChecked('[data-photo]')&&await p.isChecked('[data-show="instagram"]')&&!(await p.isChecked('[data-show="page"]')));
want('rep only if you tick it; the QR on by default', !(await p.isChecked('[data-rep]'))&&await p.isChecked('[data-qr]'));
const px=async(sel)=>p.$eval(sel||'#c_cv',cv=>{ const x=cv.getContext('2d'), d=x.getImageData(0,0,cv.width,cv.height).data; let s=0; for(let i=0;i<d.length;i+=4000) s+=d[i]+d[i+1]*3+d[i+2]*7; return [cv.width,cv.height,s]; });
const a1=await px(); want('the card is drawn, square post 1080 x 1080', a1[0]===1080&&a1[1]===1080&&a1[2]>0, a1);
await p.screenshot({path:path.join(os.tmpdir(),'pc_slate.png'),fullPage:false});
await p.click('[data-look="paper"]'); await p.waitForTimeout(700); const a2=await px();
want('PAPER: a different card', a2[2]!==a1[2]);
want('keep this design: the next card starts on PAPER', await p.evaluate(()=>Postcard.settings().look==='paper'&&Postcard.settings().keep===true));
for(const [k,w,h] of [['story',1080,1920],['wide',1200,630]]){ await p.click('[data-size="'+k+'"]'); await p.waitForTimeout(500); const a=await px(); want(k+': '+w+' x '+h, a[0]===w&&a[1]===h, a); }
await p.click('[data-size="print"]'); await p.waitForTimeout(800); const pf=await px(), pb=await px('#c_bk');
want('4 x 6: front and back, 300 dpi with bleed', pf[0]===1875&&pf[1]===1275&&pb[0]===1875&&pb[2]>0, [pf,pb]);
for(const l of ['bill','plain','slate']){ await p.click('[data-look="'+l+'"]'); await p.waitForTimeout(500); await p.$eval('#c_cv',(cv,l)=>{},l); }
await p.click('[data-size="square"]'); await p.waitForTimeout(400);
await p.fill('#c_watch','northstar.example/harbor-lights'); await p.check('[data-rep]'); await p.waitForTimeout(300);
/* POST */
want('POST: share or save it, copy your words; your profile to post it yourself; says it can\'t post for you', /SAVE THE CARD/.test(await p.innerText('#c_send'))&&!!(await p.$('#c_send a[href="https://www.instagram.com/rileyhart.acts/"]'))&&/can't post for you/.test(await p.innerText('#c_send')));
await p.click('#c_copy'); await p.waitForTimeout(300);
want('COPY YOUR WORDS: yours, then your page link', await p.evaluate(()=>navigator.clipboard.readText())==='Guest starring on Harbor Lights, Episode 1.4. On Northstar+.\n\nhttps://rileyhart.example#c-harbor-lights');
await p.click('#c_save'); await p.waitForTimeout(500);
want('SAVE THE CARD: a picture file', /^card-harbor-lights-square\.png$/.test((await p.evaluate(()=>window.__dl||[]))[0]||''), await p.evaluate(()=>window.__dl));
/* EMAIL */
await p.click('[data-send="email"]'); await p.waitForTimeout(400);
const te=await p.innerText('#c_send');
want('EMAIL: the people you keep with an email; Marlow (no email) not listed', /Ellis Park Casting/.test(te)&&/Coastline Casting/.test(te)&&!/Marlow/.test(te));
want('the office that says no email warns', /This office says: no email from actors/.test(te));
await p.fill('#c_subj','Harbor Lights'); const ellis=await p.evaluate(()=>Contacts.find('Ellis Park Casting').id);
await p.click('[data-write="'+ellis+'"]'); await p.waitForTimeout(700);
const m=(await p.evaluate(()=>window.__mail||[]))[0]||'', mb=decodeURIComponent((m.split('body=')[1]||''));
want('WRITE IT: a new email to them, your subject, your words and the links, your rep as text', /^mailto:ellis@example\.com\?subject=Harbor%20Lights&body=/.test(m)&&/My page: https:\/\/rileyhart\.example#c-harbor-lights/.test(mb)&&/Where to watch: https:\/\/northstar\.example\/harbor-lights/.test(mb)&&/Rep: Jordan Reyes · 555-0100/.test(mb), [m.slice(0,80),mb]);
want('the card copied as a picture, to paste in', /card is copied/.test(await p.innerText('#msg')), await p.innerText('#msg'));
want('it remembers you wrote one, not whether they opened it', /You wrote one/.test(await p.innerText('#c_send')));
await p.click('[data-noemail="'+ellis+'"]'); await p.waitForTimeout(300);
want('THEY SAY NO EMAIL: kept on the contact, and it warns', await p.evaluate(()=>Contacts.find('Ellis Park Casting').plug==='noemail')&&(await p.$$eval('#c_send .warn',x=>x.length))===2);
/* MAIL */
await p.click('[data-send="mail"]'); await p.waitForTimeout(400);
const marlow=await p.evaluate(()=>Contacts.find('Marlow Lane').id);
await p.check('[data-to="'+marlow+'"]'); await p.waitForTimeout(400);
await p.fill('[data-addr="'+marlow+'"]','100 Example St\nLos Angeles, CA 90000'); await p.waitForTimeout(300);
want('their mailing address, kept on the contact', await p.evaluate(()=>Contacts.find('Marlow Lane').mail.join('|')==='100 Example St|Los Angeles, CA 90000'));
await p.click('#c_shop'); await p.waitForTimeout(1500);
want('PRINT SHOP: 4 x 6 with bleed, front and back for each one', await p.evaluate(()=>window.__lastPrint&&!window.__lastPrint.home&&window.__lastPrint.cards===1&&/6\.25in 4\.25in/.test(window.__lastPrint.css)));
await p.click('#c_home'); await p.waitForTimeout(1500);
want('PRINT AT HOME: letter, cut lines', await p.evaluate(()=>window.__lastPrint.home&&/letter/.test(window.__lastPrint.css)&&/dashed/.test(window.__lastPrint.css)));
await p.click('[data-size="print"]'); await p.waitForTimeout(800);
await p.screenshot({path:path.join(os.tmpdir(),'pc_print.png'),fullPage:true});
/* the pictures, to look at */
for(const l of ['slate','bill','paper','plain']) for(const s of ['square','story','wide','print']){ const u=await p.evaluate(async([l,s,id])=>{ Viz.plugSet(id,{card:Object.assign({},Viz.plugGet(id).card,{look:l})}); const b=await __viz.cardBlob(id,s); return await new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(f.result); f.readAsDataURL(b); }); },[l,s,qid]); require('fs').writeFileSync(path.join(os.tmpdir(),'pc_'+l+'_'+s+'.png'),Buffer.from(u.split(',')[1],'base64')); }
const back=await p.$eval('#c_bk',cv=>cv.toDataURL('image/png')); require('fs').writeFileSync(path.join(os.tmpdir(),'pc_back.png'),Buffer.from(back.split(',')[1],'base64'));
want('nothing goes anywhere: no request leaves this site', out.length===0, out);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
