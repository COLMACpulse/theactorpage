/* VO BOOTH with life: the mic and the sigil in the header, ON THE AIR while you record, the mic drawn live as you
   read, the level, and every take keeping its shape (the kept one beside the line, each take in the list). Takes
   from before get their shape once. On a computer, the booth panel beside the copy. Fake mic. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path'), os=require('os');
(async()=>{ const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
const c=await b.newContext({viewport:{width:390,height:844}}); await c.grantPermissions(['microphone'],{origin:'http://localhost:8811'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8811/booth/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(500);
want('the header: the mic on the left, the sigil on the right, the sticks under it', !!(await p.$('header.top svg.hmic'))&&(await p.getAttribute('header.top img.hsig','alt'))==='THEACTORPAGE'&&!!(await p.$('.hstk')));
await p.setInputFiles('#files',[path.join(__dirname,'..','..','shared','fixtures','dry_creek_vo_copy.txt')]); await p.waitForTimeout(800);
await p.click('[data-t=read]'); await p.waitForTimeout(400);
want('lines not read yet: a flat line', (await p.$$('.line .wv-flat')).length>0);
const k0=await p.getAttribute('[data-rec]','data-rec');
await p.click('[data-rec="'+k0+'"]'); await p.waitForTimeout(300); if(await p.isVisible('#hotsheet button.p').catch(()=>false)) await p.click('#hotsheet button.p'); await p.waitForTimeout(1800);
want('recording: ON THE AIR, RECORDING · MIC ON', await p.evaluate(()=>document.body.classList.contains('onair'))&&(await p.innerText('#onair'))==='RECORDING · MIC ON');
const drawn=await p.$eval('.line.rec canvas[data-live]',cv=>{ const x=cv.getContext('2d'), d=x.getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n; });
want('the mic, drawn live as you read', drawn>50, drawn);
want('the level, moving', await p.waitForFunction(()=>{ const e=document.querySelector('.line.rec [data-meter]'); return e&&parseFloat(e.style.width)>0; },null,{timeout:4000}).then(()=>true,()=>false));
await p.click('[data-rec="'+k0+'"]'); await p.waitForTimeout(1500);
want('stopped: off the air', !(await p.evaluate(()=>document.body.classList.contains('onair')))&&(await p.innerText('#onair'))==='VO BOOTH');
const t1=await p.evaluate(k=>__booth.S.takes[k][0],k0);
want('the take keeps its shape: 56 heights and where the dead air is', Array.isArray(t1.wave)&&t1.wave.length===56&&Math.max(...t1.wave)===100&&t1.trim.length===2&&t1.trim[0]<t1.trim[1], t1);
want('kept: its waveform beside the line, and in the list as THE ONE THAT GOES', (await p.$$('.line .lw svg.wv')).length===1&&(await p.$$('.takes .take svg.wv')).length===1&&/THE ONE THAT GOES/.test(await p.innerText('.takes')));
await p.click('[data-rec="'+k0+'"]'); await p.waitForTimeout(1500); await p.click('[data-rec="'+k0+'"]'); await p.waitForTimeout(1500);
want('two takes, each with its shape, one kept', (await p.$$('.takes .take svg.wv')).length===2&&(await p.$$('.take.kept')).length===1);
/* a take from before the waveforms: its shape is read once */
await p.evaluate(k=>{ delete __booth.S.takes[k][0].wave; delete __booth.S.takes[k][0].trim; __booth.render(); },k0); await p.waitForTimeout(1800);
want('a take from before: its shape read once, and kept', await p.evaluate(k=>Array.isArray(__booth.S.takes[k][0].wave),k0)&&(await p.$$('.takes .take svg.wv')).length===2);
await p.screenshot({path:path.join(os.tmpdir(),'wave_phone.png')});
/* ROOM: live while it measures */
await p.click('[data-t=room]'); await p.waitForTimeout(300); await p.click('#roomgo'); await p.waitForTimeout(1500);
want('ROOM: the mic drawn while it measures', !!(await p.$('#roomnow canvas[data-live]')));
await p.waitForTimeout(5000);
/* a computer: the booth panel */
await p.setViewportSize({width:1280,height:860}); await p.click('[data-t=read]'); await p.waitForTimeout(400);
want('on a computer: the booth panel beside the copy', await p.$eval('.bpanel .bbig',e=>getComputedStyle(e).display!=='none')&&await p.$eval('.bpanel',e=>e.getBoundingClientRect().left>600));
await p.click('[data-rec="'+k0+'"]'); await p.waitForTimeout(1200);
want('recording on a computer: the line big in the panel, drawn there', /Some mornings start slow|Dry Creek|\w/.test(await p.innerText('.bpanel .bline'))&&await p.$eval('.bpanel canvas[data-live]',cv=>{ const x=cv.getContext('2d'), d=x.getImageData(0,0,cv.width,cv.height).data; let n=0; for(let i=3;i<d.length;i+=4) if(d[i]>0) n++; return n>50; }));
await p.screenshot({path:path.join(os.tmpdir(),'wave_desk.png')});
await p.click('[data-rec="'+k0+'"]'); await p.waitForTimeout(1200);
want('no page errors', errs.length===0, errs);
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
