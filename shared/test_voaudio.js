/* node shared/test_voaudio.js : the VO sound engine, on made-up signals (tones and noise). */
const A=require('./voaudio.js'); const fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n);} else {fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x).slice(0,400));} };
let seed=7; const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff*2-1; };
const tone=(f,amp,secs,rate)=>{ const d=new Float32Array(Math.round(secs*rate)); for(let i=0;i<d.length;i++) d[i]=amp*Math.sin(2*Math.PI*f*i/rate); return d; };
const noise=(rmsDb,secs,rate)=>{ const d=new Float32Array(Math.round(secs*rate)), a=Math.pow(10,rmsDb/20)*Math.sqrt(3); for(let i=0;i<d.length;i++) d[i]=a*rnd(); return d; };
const cat=(...xs)=>{ const n=xs.reduce((a,b)=>a+b.length,0), o=new Float32Array(n); let p=0; xs.forEach(x=>{ o.set(x,p); p+=x.length; }); return o; };
const R=44100;
ok('loudness: a 1 kHz tone at -20 dB peak reads -23 LUFS (the standard says -23.0)', Math.abs(A.loudness(tone(1000,0.1,5,48000),48000)+23)<0.3, A.loudness(tone(1000,0.1,5,48000),48000));
ok('loudness: a full-scale 997 Hz tone reads -3 LUFS', Math.abs(A.loudness(tone(997,1,5,R),R)+3.0)<0.3, A.loudness(tone(997,1,5,R),R));
ok('loudness: silence gated out (-70)', A.loudness(new Float32Array(R*2),R)===-70);
const r1=A.room(noise(-66,3,R),R), r2=A.room(noise(-55,3,R),R), r3=A.room(noise(-40,3,R),R);
ok('closet check: -66 quiet, -55 a little noisy, -40 too noisy, in plain words with the number', r1.verdict==='quiet'&&r2.verdict==='some'&&r3.verdict==='loud'&&/-60/.test(A.roomWords(r2))&&Math.abs(r1.level+66)<0.5, [r1,r2,r3]);
const take=cat(noise(-70,0.5,R),tone(220,0.3,1,R),noise(-70,0.7,R));
const t=A.trim(take,R);
ok('trim: dead air cut, a breath of room kept (0.15 s before, 0.25 s after)', Math.abs(t.start/R-0.35)<0.03&&Math.abs(t.end/R-1.75)<0.03, {s:t.start/R,e:t.end/R});
ok('trim: a take with nothing in it says so', A.trim(new Float32Array(R),R).silent===true);
const lim=A.limit(tone(300,0.99,1,R),-3,R);
ok('limit: no sample over the ceiling', A.peak(lim.data)<=-2.99&&lim.touched>0, {peak:A.peak(lim.data)});
const quiet=A.limit(tone(300,0.2,1,R),-3,R);
ok('limit: under the ceiling, untouched', quiet.touched===0&&Math.abs(A.peak(quiet.data)-A.db(0.2))<0.05);
const room=noise(-68,3,R);
const clips=[{data:cat(noise(-68,0.4,R),tone(180,0.05,1.2,R),noise(-68,0.5,R)),rate:R,after:'line'},
 {data:cat(noise(-68,0.3,R),tone(240,0.4,0.9,R),noise(-68,0.6,R)),rate:R,after:'spot'},
 {data:cat(noise(-68,0.6,R),tone(200,0.15,1.5,R),noise(-68,0.4,R)),rate:R,after:'line'}];
const b=A.build(clips,{room,target:-20,ceiling:-3});
ok('build: one level for the whole read, near -20 LUFS, peaks under -3', Math.abs(b.lufs+20)<1&&b.peak<=-2.99, {lufs:b.lufs,peak:b.peak,gain:b.gain});
const secs=b.data.length/R, want=0.5+(1.2+0.4)+0.6+(0.9+0.4)+1.5+(1.5+0.4)+0.5;
ok('build: lines trimmed, 0.6 s between lines, 1.5 s between spots', Math.abs(secs-want)<0.1, {secs,want,marks:b.marks});
const gap=b.data.subarray(Math.round((b.marks[0].start+b.marks[0].secs+0.1)*R),Math.round((b.marks[1].start-0.1)*R));
ok('build: the gaps hold your room at the same lift, not dead silence', A.rms(gap)>-120&&Math.abs(A.rms(gap)-(-68+b.gain))<3, {gap:A.rms(gap),room:-68+b.gain});
ok('spot time: kept main lines plus the gaps', A.spotTime([8,9.5,10],0.6)===28.7&&/On time/.test(A.timeWords(29.6,30))&&/long/.test(A.timeWords(33,30))&&/short/.test(A.timeWords(25,30)));
const w=A.wav(b.data,R);
ok('wav: 16-bit mono header', String.fromCharCode(...w.slice(0,4))==='RIFF'&&new DataView(w.buffer).getUint16(22,true)===1&&new DataView(w.buffer).getUint32(24,true)===R&&w.length===44+b.data.length*2);
// MP3 by LAME, checked by an independent reader (ffprobe), when it's on this machine
const vm=require('vm'); const ctx={}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname,'vendor','lame.min.js'),'utf8'),ctx);
const mp=A.mp3(b.data,R,128,ctx.lamejs); const f=path.join(os.tmpdir(),'vo_test.mp3'); fs.writeFileSync(f,mp);
let probe=null; try{ probe=cp.execSync('ffprobe -v error -show_entries stream=codec_name,sample_rate,channels,bit_rate:format=duration -of json '+f).toString(); }catch(e){}
if(probe){ const j=JSON.parse(probe), s=j.streams[0]; ok('mp3: mono, 44.1 kHz, 128 kbps, the right length', s.codec_name==='mp3'&&+s.channels===1&&+s.sample_rate===R&&Math.abs(+s.bit_rate-128000)<2000&&Math.abs(+j.format.duration-secs)<0.1, j);
 let lufs=null; try{ const out=cp.execSync('ffmpeg -hide_banner -nostats -i '+f+' -af ebur128 -f null - 2>&1').toString(); lufs=+((out.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)||[])[1]); }catch(e){}
 ok('mp3: an independent loudness meter agrees (within 1 LU)', lufs!=null&&Math.abs(lufs-b.lufs)<1, {ffmpeg:lufs,ours:b.lufs}); }
else ok('mp3: bytes made (no ffprobe here to check them)', mp.length>1000);
fs.unlinkSync(f);
console.log('\n'+pass+' passed, '+fail+' failed'); process.exit(fail?1:0);
