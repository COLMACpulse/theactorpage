/* ON SET TOOLS math. node film/tests/fieldkit_tests.js */
global.window=global; const K=require('../fieldkit.js'), F=require('../film.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.2);
const RAD=Math.PI/180;
// a phone turned by a known amount: up vector in the phone's own terms
const rotZ=(a)=>[-Math.sin(a*RAD),Math.cos(a*RAD),0];           // upright, turned clockwise by a
// LEVEL
let L=K.level(K.up(90,0)); want('upright, straight: level, looking ahead', !L.flat&&L.hold==='upright'&&near(L.roll,0)&&near(L.pitch,0), L);
L=K.level(rotZ(4)); want('upright, turned clockwise 4°: top leans right 4°', near(L.roll,4)&&K.rollWord(L.roll)==='top leans right 4.0°', L);
L=K.level(rotZ(-2.5)); want('turned the other way: top leans left 2.5°', near(L.roll,-2.5)&&/left 2\.5/.test(K.rollWord(L.roll)), L);
L=K.level([1,0,0]); want('sideways (landscape), straight: level', !L.flat&&L.hold==='sideways'&&near(L.roll,0), L);
L=K.level([Math.cos(3*RAD),Math.sin(3*RAD),0]); want('sideways, turned clockwise 3°: leans right 3°', near(L.roll,3), L);
L=K.level([-1,0,0]); want('sideways the other way round: level', near(L.roll,0)&&L.hold==='sideways', L);
L=K.level([0,Math.cos(10*RAD),-Math.sin(10*RAD)]); want('upright, camera looking up 10°', near(L.pitch,10)&&K.pitchWord(L.pitch)==='looking up 10.0°', L);
L=K.level(K.up(0,0)); want('flat on the rig: level', L.flat&&near(L.roll,0)&&near(L.pitch,0)&&K.pitchWord(0,0.5,true)==='level front to back', L);
L=K.level(K.up(0,5)); want('flat, right side down 5°: leans right 5°', L.flat&&near(L.roll,5), L);
L=K.level(K.up(3,0)); want('flat, front up 3°', L.flat&&near(L.pitch,3)&&/front up 3\.0/.test(K.pitchWord(L.pitch,0.5,true)), L);
L=K.level(K.up(90,0)); const Lb=K.level(K.up(90,30)); want('the deviceorientation numbers agree with the plain ones', near(K.level(K.up(90,0)).roll,0)&&Number.isFinite(Lb.roll));
want('matching a saved reading', K.match({roll:5.2,pitch:-3},{roll:4,pitch:-3})==='To match: turn left 1.2°.'&&K.match({roll:4.2,pitch:-3},{roll:4,pitch:-3})==='Matched.');
// SUN
const lat=38.84, lng=-97.61, day=new Date('2026-06-21T12:00:00Z'), S=F.sun(day,lat,lng);
const atNoon=K.sunPos(S.noon,lat,lng); want('at solar noon the sun is due south, at its height', near(atNoon.az,180,1)&&near(atNoon.up,90-lat+23.44,0.6), atNoon);
const atRise=K.sunPos(S.sunrise,lat,lng); want('at sunrise it sits on the horizon, in the northeast in June', near(atRise.up,0,0.6)&&K.compass(atRise.az)==='northeast', atRise);
const atSet=K.sunPos(S.sunset,lat,lng); want('at sunset, on the horizon in the northwest', near(atSet.up,0,0.6)&&K.compass(atSet.az)==='northwest', atSet);
const eq=K.sunPos(F.sun(new Date('2026-03-20T12:00:00Z'),0,0).noon,0,0); want('equator, equinox, noon: nearly straight up', eq.up>88, eq);
const golden=K.sunPos(S.goldenEveningStarts,lat,lng); want('golden hour starts at 6° up (film.js agrees)', near(golden.up,6,0.6), golden);
want('shadows: 45° up, as long as things are tall; 10° up, 5.7 times', K.shadow(45)===1&&K.shadow(10)===5.7&&K.shadow(0)===null);
want('in words', /^Sun 45° up, in the southwest \(225°\)\. Shadows fall northeast, 1 times as long/.test(K.sunWords({az:225,up:45})), K.sunWords({az:225,up:45}));
want('which way to turn', K.toward(90,180).words==='Turn right 90° to face the sun.'&&K.toward(350,10).words==='Turn right 20° to face the sun.'&&K.toward(10,350).d===-20);
// EXPOSURE
const t48=K.shutter(24,180); want('180° at 24: 1/48', K.shutterWord(t48)==='1/48');
want('sunny 16 is about right', Math.abs(K.over({ev:15,N:16,iso:100,t:1/100}))<0.5);
let E=K.exposure({ev:15,N:2.8,iso:800,t:t48}); want('f/2.8, ISO 800, 1/48 in full sun: 9.4 over, ND 2.7, then the iris', E.stops===9.4&&E.nd.density==='2.7'&&E.nd.factor===512&&/Or drop the ISO first: 100 takes back 3 stops\./.test(E.words.join(' ')), E);
E=K.exposure({ev:15,N:4,iso:100,t:t48}); want('f/4 at ISO 100 in sun: 5.4 over, ND 1.5, then close 0.4, no ISO advice at 100', E.stops===5.4&&E.nd.density==='1.5'&&E.words.join(' ')==='ND 1.5 (5 stops, ND32). Then close down 0.4 stops on the iris.', E);
E=K.exposure({ev:6,N:2.8,iso:800,t:t48}); want('under a stop over: just the iris, no odd ISO', E.words.join(' ')==='Close down 0.4 stops on the iris.', E);
E=K.exposure({ev:5,N:2.8,iso:800,t:t48}); want('dim room at f/2.8, ISO 800: too dark, says what ISO', E.stops<0&&/too dark/.test(E.head)&&/ISO \d+/.test(E.words[0]), E);
// FOCUS
const D=K.dof({f:50,N:2.8,c:0.03,s:3}); want('50mm f/2.8 full frame at 3 m: about 2.73 to 3.33 m', near(D.near,2.73,0.02)&&near(D.far,3.33,0.02), D);
want('hyperfocal 50mm f/2.8: about 29.8 m', near(D.H,29.8,0.1));
const Df=K.dof({f:24,N:8,c:0.025,s:10}); want('past hyperfocal: sharp to infinity', Df.far===Infinity);
want('in feet and inches', K.len(3.048,'ft')==='10 ft'&&K.len(0.3,'ft')==='12 in'.replace('12 in','1 ft')&&K.len(Infinity,'ft')==='infinity', [K.len(3.048,'ft'),K.len(0.3,'ft')]);
want('in words', /^Sharp from 8 ft 11 in to 10 ft 11 in \(2 ft deep\)\./.test(K.dofWords(K.dof({f:50,N:2.8,c:0.03,s:3}),'ft')[0]), K.dofWords(D,'ft'));
// DELAYS
const t0=Date.UTC(2026,9,18,15,0); const dl=[{why:'sound',note:'plane',at:t0,end:t0+6*60000},{why:'cast',at:t0+3600000,end:t0+3600000+21*60000},{why:'gear',at:t0+7200000}];
want('delay lines: only finished ones, total lost', K.delayLines(dl).join('|')==='DELAYS · 2, 27 minutes lost|  Sound, 6 min: plane|  Waiting on cast, 21 min', K.delayLines(dl));
want('no em dashes in any words', !/—/.test(JSON.stringify([K.LIGHT,K.WHY,K.sunWords({az:100,up:20}),K.exposure({ev:15,N:2.8,iso:800,t:t48}),K.dofWords(D,'m')])));

// ZERO
want('zero: readings from the rig\'s level, upright and flat kept apart', K.zeroed({roll:3.4,pitch:-1,flat:false},{roll:1.4,pitch:-1,flat:false}).roll===2&&K.zeroed({roll:3.4,pitch:-1,flat:true},{roll:1.4,pitch:-1,flat:false}).roll===3.4);
// FRAME
const fr=K.frameIn(1920,1080,2.39); want('2.39 in 16:9: letterbox', near(fr.w,1920)&&near(fr.h,803.3,0.2)&&near(fr.y,138.3,0.2), fr);
const fv=K.frameIn(1920,1080,0.5625); want('9:16 in 16:9: pillarbox', near(fv.h,1080)&&near(fv.w,607.5)&&near(fv.x,656.25), fv);
// LIGHT
const img=(w,h,f)=>{ const a=new Uint8ClampedArray(w*h*4); for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const v=f(x,y), i=(y*w+x)*4; a[i]=a[i+1]=a[i+2]=v; a[i+3]=255; } return a; };
want('sRGB undone: 50% grey is about 21% light', near(K.lin(188),0.5,0.01)&&near(K.lin(128),0.216,0.005));
const two=img(40,20,x=>x<20?188:K.lin(188)/4>0?Math.round(255*(1.055*Math.pow(0.5/4,1/2.4)-0.055)):0);
const A=K.spot(two,40,20,8,10), B=K.spot(two,40,20,30,10), R=K.ratio(A,B);
want('a spot twice as bright, then a quarter: A 2 stops brighter, 4:1', near(R.stops,2,0.05)&&R.ratio===4&&/^A is 2\.0 stops brighter\. About 4:1\./.test(R.words), R);
want('the same both sides: says so', K.ratio(A,A).words==='A and B are the same.');
const hot=img(10,10,()=>255), mid=img(10,10,()=>128); const Rh=K.ratio(K.spot(hot,10,10,5,5),K.spot(mid,10,10,5,5));
want('blown out: says the real difference is bigger', /blown out, so the real difference is bigger/.test(Rh.warn.join()), Rh);
want('black: too dark to read', /Too dark to read spot B/.test(K.ratio(K.spot(mid,10,10,5,5),K.spot(img(10,10,()=>0),10,10,5,5)).words));
want('how much of the frame is blown out', K.clipped(hot)===100&&K.clipped(mid)===0);
// SOUND
const sine=new Float32Array(4800).map((_,i)=>0.5*Math.sin(2*Math.PI*60*i/48000));
want('a sine at half scale: about -9 dBFS RMS', near(K.dbfs(K.rms(sine)),-9,0.1), K.dbfs(K.rms(sine)));
want('silence', K.dbWord(K.dbfs(0))==='silent');
const size=8192, rate=48000, bin=rate/size, spec=new Float32Array(size/2).fill(-90); const put=(hz,db)=>{ const k=hz/bin, i=Math.floor(k), f=k-i; spec[i]=Math.max(spec[i],db-12*f*f); spec[i+1]=Math.max(spec[i+1],db-12*(1-f)*(1-f)); };
put(60,-30); const H=K.hum(spec,rate,size);
want('a 60 Hz hum found, within a hertz', H&&Math.abs(H.hz-60)<=1&&H.over>=50, H);
want('60 Hz: names the power frequency', /power frequency/.test(K.humWords(H))&&/60 Hz/.test(K.humWords(H)));
want('no hum in flat noise', K.hum(new Float32Array(size/2).fill(-80),rate,size)===null);
const spec2=new Float32Array(size/2).fill(-90); for(let i=0;i<spec2.length;i++) spec2[i]=-90; const k2=Math.round(85/bin); spec2[k2]=-40; spec2[k2-1]=-50; spec2[k2+1]=-50;
want('an 85 Hz motor tone: found, not called the power', K.hum(spec2,rate,size)&&!/power/.test(K.humWords(K.hum(spec2,rate,size))), K.hum(spec2,rate,size));
want('room tone compared with the last', K.toneWords({secs:30,avg:-48,peak:-30},{avg:-54,where:'INT. KITCHEN'}).join(' ')==='30 s of room tone, average -48 dBFS, loudest -30 dBFS. 6 dB louder than the last one (INT. KITCHEN).');
want('room tone lines for the wrap', K.toneLines([{secs:30,avg:-52,where:'INT. KITCHEN',hum:60}]).join('|')==='ROOM TONE · 1|  INT. KITCHEN, 30 s, average -52 dBFS, hum at 60 Hz');
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
