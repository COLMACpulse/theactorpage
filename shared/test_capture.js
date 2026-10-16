/* node shared/test_capture.js : the shared camera and mic, the parts that don't need a camera */
global.window=globalThis; const C=require('./capture.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };
ok('Safari / iPhone: MP4 first', C.pickMime('video',m=>/^video\/mp4/.test(m))==='video/mp4;codecs=avc1.42E01E,mp4a.40.2');
ok('Chrome without MP4: WebM VP9', C.pickMime('video',m=>/webm/.test(m))==='video/webm;codecs=vp9,opus');
ok('audio: m4a first, then Opus', C.pickMime('audio',m=>m==='audio/mp4')==='audio/mp4'&&C.pickMime('audio',m=>/opus/.test(m))==='audio/webm;codecs=opus');
ok('nothing supported: empty, the browser picks', C.pickMime('video',()=>false)==='');
ok('file endings', C.ext('video/mp4;codecs=avc1')==='mp4'&&C.ext('audio/mp4')==='m4a'&&C.ext('video/webm')==='webm'&&C.ext('audio/ogg')==='ogg');
ok('plain words when the camera refuses', /blocked for this site/.test(C.errorWords({name:'NotAllowedError'}))&&/Another app is using the mic/.test(C.errorWords({name:'NotReadableError'},'audio'))&&/No camera found/.test(C.errorWords({name:'NotFoundError'})));
ok('file name the way casting reads it', C.fileName({name:'Sam Actor',role:'ANNA VOSS',n:2,date:'2026-10-16',ext:'mp4'})==='Sam_Actor_ANNA_VOSS_take2_2026-10-16.mp4');
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
