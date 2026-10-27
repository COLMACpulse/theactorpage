/* ACTOR OS · LINK A SCREEN, the monitor's guides (Oct 27, from CINEKNIFE): THIRDS, SAFE AREA, MIRROR, FREEZE as four
   toggles, all off until you tap one, drawn on the picture itself (not the black bars), this screen only.
   Two pages, two codes, the fake camera. A tablet-size and a phone-size other screen. Server on :8811. */
const {chromium}=require('playwright'); const path=require('path');
(async()=>{ const FX=path.join(__dirname,'..','..','film','tests','fixtures');
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+FX+'/two_tone.y4m','--autoplay-policy=no-user-gesture-required']});
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y).slice(0,400))); if(!x) ok=false; };
for(const [nm,vp] of [['tablet',{width:900,height:800}],['phone',{width:390,height:844}]]){
 const ctx=await b.newContext({viewport:{width:900,height:800}}); await ctx.grantPermissions(['camera','microphone'],{origin:'http://localhost:8811'});
 await ctx.addInitScript(()=>{ try{ sessionStorage.setItem('theactorpage_hot_ok','1'); }catch(e){} });
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
 await p.goto('http://localhost:8811/actor-os/'); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(900);
 await p.evaluate(()=>startMode('READER')); await p.waitForTimeout(1500);
 await p.click('#sScreen'); await p.waitForTimeout(400); await p.click('[data-l="start"]'); await p.waitForFunction(()=>ScreenLink.stage==='code',null,{timeout:10000});
 const url=await p.evaluate(()=>ScreenLink.url);
 const m=await ctx.newPage(); await m.setViewportSize(vp); m.on('pageerror',e=>errs.push('M '+e.message));
 await m.goto(url); await m.waitForSelector('#qrbox svg.qr',{timeout:10000});
 const ans=await m.evaluate(()=>window.__screen.answer);
 await p.evaluate(()=>document.querySelector('#linkBox details').open=true); await p.fill('#lkpaste',ans); await p.click('[data-l="use"]');
 await p.waitForFunction(()=>ScreenLink.stage==='live',null,{timeout:15000}).catch(()=>{});
 await m.waitForFunction(()=>{ const v=document.getElementById('v'); return v&&v.videoWidth>0&&v.currentTime>0.3; },null,{timeout:15000}).catch(()=>{});
 await m.waitForTimeout(300);
 const st=()=>m.evaluate(()=>{ const s=document.getElementById('scr'), vis=sel=>{ const e=s.querySelector(sel); return !!e&&getComputedStyle(e).display!=='none'; }; return { thirds:vis('.th'), safe:vis('.sf'), mirror:getComputedStyle(document.getElementById('v')).transform!=='none', freeze:vis('#frz'), pressed:[...document.querySelectorAll('[data-g]')].map(b=>b.dataset.g+':'+b.getAttribute('aria-pressed')).join() }; });
 const names=await m.$$eval('[data-g]',x=>x.map(b=>b.textContent).join('|'));
 want(nm+': four toggles under the monitor: THIRDS, SAFE AREA, MIRROR, FREEZE', names==='THIRDS|SAFE AREA|MIRROR|FREEZE', names);
 let s=await st();
 want(nm+': all off until you tap one (a front camera is not mirrored for you)', !s.thirds&&!s.safe&&!s.mirror&&!s.freeze&&/thirds:false,safe:false,mirror:false,freeze:false/.test(s.pressed), s);
 const box=await m.evaluate(()=>{ const o=document.getElementById('ov').getBoundingClientRect(), v=document.getElementById('v'), s=document.getElementById('scr').getBoundingClientRect(); return { r:o.width/o.height, want:v.videoWidth/v.videoHeight, inside:o.left>=s.left-1&&o.right<=s.right+1&&o.top>=s.top-1&&o.bottom<=s.bottom+1 }; });
 want(nm+': the guides sit on the picture itself, not the black bars', Math.abs(box.r-box.want)<0.02&&box.inside, box);
 await m.click('[data-g="thirds"]'); s=await st();
 want(nm+': THIRDS: the grid shows, the button says it is on', s.thirds&&/thirds:true/.test(s.pressed)&&!s.safe, s);
 await m.click('[data-g="safe"]'); s=await st();
 want(nm+': SAFE AREA: the box shows, with THIRDS still on', s.safe&&s.thirds, s);
 await m.click('[data-g="mirror"]'); s=await st();
 want(nm+': MIRROR: the picture flips', s.mirror, s);
 await m.click('[data-g="freeze"]'); await m.waitForTimeout(200); s=await st();
 const frz=await m.evaluate(()=>{ const c=document.getElementById('frz'); return [c.width,c.height,/FROZEN/.test(document.getElementById('scr').innerText)]; });
 want(nm+': FREEZE: holds this frame and says the phone is still live', s.freeze&&frz[0]>1&&frz[2], [s,frz]);
 want(nm+': the phone keeps taping: nothing changed on the phone', await p.evaluate(()=>ScreenLink.stage==='live'));
 await m.click('[data-g="freeze"]'); await m.click('[data-g="mirror"]'); await m.waitForTimeout(200);
 await m.screenshot({path:'/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad/guides_'+nm+'.png'});
 for(const k of ['thirds','safe']) await m.click('[data-g="'+k+'"]');
 s=await st();
 want(nm+': tap each again: all off', !s.thirds&&!s.safe&&!s.mirror&&!s.freeze, s);
 want(nm+': nothing sideways on this screen', await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 want(nm+': plain words, no dashes', !/—/.test(await m.innerText('#app')));
 want(nm+': no page errors', !errs.length, errs);
 await ctx.close();
}
await b.close(); console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1); })();
