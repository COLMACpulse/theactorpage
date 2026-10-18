/* ACTOR OS · READING A TAKE: pace, pickups, clipping, on made-up sound. node actor-os/tests/takeread_tests.js */
const T=require('../takeread.js');
let ok=true; const want=(n,x,y)=>{ console.log((x?'PASS ':'FAIL ')+n+(x||y===undefined?'':' '+JSON.stringify(y))); if(!x) ok=false; };
const near=(a,b,t)=>Math.abs(a-b)<=(t||0.05);
const rate=16000;
// a made-up take: quiet room hiss, "talking" as a buzz at -20 dBFS where we say
function take(secs,talk,loud){ let seed=7; const rnd=()=>((seed=seed*16807%2147483647)/2147483647)*2-1;
 const x=new Float32Array(Math.round(secs*rate)); for(let i=0;i<x.length;i++) x[i]=0.001*rnd();
 talk.forEach(([a,b])=>{ for(let i=Math.round(a*rate);i<Math.round(b*rate);i++) x[i]+=(loud||0.1)*Math.sin(2*Math.PI*180*i/rate)*(0.6+0.4*Math.sin(2*Math.PI*4*i/rate)); });
 return x; }
want('words you say: not (beats) or dashes', T.words("(beat) Wait — no. I said I'd call.")===6&&T.words('[door slams] Out.')===1);
// partner line 0 (0-2 s, played by the phone), your line 1 from 2.0, you start at 2.6, stop at 5.6; partner line 2 at 6.0; your line 3 at 8.0, you start 9.4, stop 11.4
const x=take(13,[[0.2,1.9],[2.6,5.6],[6.1,7.9],[9.4,11.4]]);
const marks=[{i:0,at:0,mine:false},{i:1,at:2.0,mine:true},{i:2,at:6.0,mine:false},{i:3,at:8.0,mine:true}];
const text=i=>({1:'I told you (beat) I would be here by nine, and I was here by nine.',3:'Then where were you?'})[i];
const r=T.read(x,rate,marks,text,{partner:true});
want('your two lines found, with when you start and stop', r.lines.length===2&&near(r.lines[0].on,2.6)&&near(r.lines[0].off,5.6,0.1)&&near(r.lines[1].on,9.4), r.lines);
want('pickups: 0.6 s and 1.4 s, average 1.0, slowest named', near(r.lines[0].pickup,0.6)&&near(r.lines[1].pickup,1.4)&&near(r.pickup,1.0)&&r.slow[0].i===3, [r.pickup,r.slow]);
want('pace: your 19 words over your 5 s talking, about 228 a minute', r.words===19&&near(r.secs,5,0.2)&&Math.abs(r.wpm-228)<=10, [r.words,r.secs,r.wpm]);
want('no clipping in a normal take', !r.clips.length&&r.peak<-10, [r.clips,r.peak]);
const W=T.words4(r,{wpm:180,n:1});
want('in words, against the last take', /^Your pace: \d+ words a minute \(19 words, 0:05 talking\)\. Take 1 was 180\./.test(W[0])&&/Pickups: 1\.0 s on average; slowest line 4 \(1\.4 s\)/.test(W[1])&&/No clipping/.test(W[W.length-1]), W);
// no pickup without the phone reading the partner
want('PROMPTER (you read both): no pickup numbers', T.read(x,rate,marks,text,{partner:false}).pickup===null);
// a line you never said
const r2=T.read(take(13,[[0.2,1.9],[6.1,7.9],[9.4,11.4]]),rate,marks,text,{partner:true});
want('a line with no sound of you: said so', r2.silent===1&&/1 of your lines had no sound of you/.test(T.words4(r2).join(' ')), r2.lines);
// clipping
const c=take(6,[[1,4]],1.6); const rc=T.read(c,rate,[{i:0,at:0,mine:true}],()=>'Get out of my house.',{});
want('loud enough to clip: found, at about a second in, once per half second', rc.clips.length>=2&&near(rc.clips[0],1,0.1)&&rc.clips.every((t,k)=>!k||t-rc.clips[k-1]>=0.5), rc.clips.slice(0,4));
want('clipping in words: one stretch, 0:01 to 0:04', /^Clipped in one place: 0:01 to 0:04\./.test(T.words4(rc).slice(-1)[0]), T.words4(rc).slice(-1));
want('clips apart become separate places', T.spans([1,1.5,2,5,5.4,9]).map(x=>x.join('-')).join()==='1-2,5-5.4,9-9');
want('one loud sample is not clipping', T.clips(Float32Array.from([0,0.995,0,0,0.2]),rate).length===0);
want('no em dashes in the words', !/—/.test(JSON.stringify([W,T.words4(rc),T.words4(r2)])));
console.log(ok?'ALL PASS':'SOME FAILED'); process.exit(ok?0:1);
