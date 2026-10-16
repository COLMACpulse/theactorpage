/* VO BOOTH: a voice over audition from an iPhone in a closet.
   COPY  drop the copy (Word, PDF, pasted) and the agent's note; it reads the spots, your lines, the ALTs, the order
   ROOM  five seconds of you quiet: how loud the closet is, in plain words
   READ  line by line, ALTs too; take as many as you want, keep one; each spot timed against its length
   SEND  one file in the order asked, named the way casting reads it, levelled and the dead air cut. Or check a file you made.
   Nothing leaves this device. */
(function(){
const V=window.VOCopy, A=window.VOAudio, C=window.Capture, Y=window.You, X=window.Intake;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='booth_v1';
const blank=()=>({parts:[],job:{client:'',due:'',oneFile:false,order:[],format:'',perLine:false},you:'',brief:'',takes:{},kept:{},room:null,
 opts:{target:-20,gap:0.6,spotGap:1.5,alts:true,per:'one',fmt:'mp3'},name:'',tab:'copy',order:null});
let S=(()=>{ try{ return Object.assign(blank(),JSON.parse(localStorage.getItem(KEY)||'null')||{}); }catch(e){ return blank(); } })();
const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){ toast('This phone is out of room to save. Your takes are safe; the list may not be.'); } };
function toast(t){ const el=$('toast'); el.textContent=t; el.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('on'),3200); }

/* ---------- takes live in IndexedDB (sound is too big for localStorage) ---------- */
let DBP=null;
function db(){ return DBP||(DBP=new Promise((res,rej)=>{ const r=indexedDB.open('booth_media',1); r.onupgradeneeded=()=>r.result.createObjectStore('b'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); })); }
async function put(id,blob){ const d=await db(); return new Promise((res,rej)=>{ const t=d.transaction('b','readwrite'); t.objectStore('b').put(blob,id); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); }); }
async function get(id){ const d=await db(); return new Promise(res=>{ const q=d.transaction('b','readonly').objectStore('b').get(id); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }
async function del(id){ const d=await db(); return new Promise(res=>{ const t=d.transaction('b','readwrite'); t.objectStore('b').delete(id); t.oncomplete=()=>res(); t.onerror=()=>res(); }); }
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ---------- the copy ---------- */
function job(){ const m=V.merge(S.parts.map(p=>p.read),S.job.order); let spots=m.spots;
 if(S.order&&S.order.length===spots.length){ const by=S.order.map(i=>spots[i]).filter(Boolean); if(by.length===spots.length) spots=by; }
 return {spots,base:m.spots,voices:m.voices,you:S.you&&m.voices[S.you]?S.you:m.you}; }
/* whose lines you read in this spot: the one you picked if it's in the spot, or that file's main voice (VO in one script, DC in another) */
const youIn=(sp,J)=>J&&S.you&&sp.lines.some(l=>l.who===S.you)?S.you:(sp.you||J.you);
/* a take belongs to one line: the file it came from, the spot in that file, the line, 0 or the ALT number */
const lineKey=(sp,li,ai)=>(sp.id||sp.title||'spot')+'|'+li+'|'+ai;
async function readFile(f){
 const e=X.ext(f.name), ab=await f.arrayBuffer();
 if(e==='pdf'){ const r=await window.ActorPDF.extract(ab); return {lines:(r.lines||[]).map(l=>({text:l.text,x:l.x})),text:(r.lines||[]).map(l=>l.text).join('\n')}; }
 if(e==='docx'){ const t=await X.docxText(ab); return {lines:t,text:t}; }
 const t=new TextDecoder().decode(ab); return {lines:t,text:t};
}
function addText(name,lines,text){
 const r=V.read(lines), n=V.note(text);
 if(n.order.length||n.due||n.client||n.oneFile){ ['client','due','format'].forEach(k=>{ if(n[k]) S.job[k]=n[k]; }); if(n.order.length) S.job.order=n.order; if(n.oneFile) S.job.oneFile=true; if(n.perLine) S.job.perLine=true; S.order=null; }
 if(r.spots.length){ r.spots.forEach((sp,k)=>{ sp.id=name+'#'+k; sp.you=r.you; }); S.parts=S.parts.filter(p=>p.name!==name); S.parts.push({name,read:r}); S.order=null; return 'copy'; }
 if(n.order.length||n.due||n.oneFile) return 'note';
 const t=String(text||'').trim(); if(t){ S.brief=(S.brief?S.brief+'\n\n':'')+t.slice(0,6000); return 'brief'; }
 return 'nothing';
}
async function takeFiles(files){
 const got=[];
 for(const f of files){ try{ const r=await readFile(f); got.push(f.name+': '+({copy:'copy',note:'the agent\'s note',brief:'the brief',nothing:'nothing to read'})[addText(f.name,r.lines,r.text)]); }catch(e){ got.push(f.name+': couldn\'t read it'); } }
 save(); render(); if(got.length) toast(got.join(' · '));
}

/* ---------- the mic ---------- */
let MIC=null, REC=null, RECKEY=null, T0=0, TICK=null;
async function mic(){ if(MIC&&MIC.getAudioTracks().some(t=>t.readyState==='live')) return MIC; MIC=await C.open({video:false,audio:true}); return MIC; }
function micOff(){ if(REC) try{ REC.cancel(); }catch(e){} REC=null; RECKEY=null; C.stop(MIC); MIC=null; clearInterval(TICK); render(); }
async function decode(blob){
 const AC=window.AudioContext||window.webkitAudioContext, ac=new AC();
 try{ const ab=await blob.arrayBuffer(); const b=await new Promise((res,rej)=>{ const p=ac.decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }); return b; }
 finally{ try{ ac.close(); }catch(e){} }
}
const mono=b=>{ if(b.numberOfChannels===1) return b.getChannelData(0); const a=b.getChannelData(0), c=b.getChannelData(1), o=new Float32Array(a.length); for(let i=0;i<a.length;i++) o[i]=(a[i]+c[i])/2; return o; };
/* any decoded sound to one channel at 44.1 kHz, the rate of the file we send */
async function to441(b){
 if(b.sampleRate===44100) return mono(b);
 const O=window.OfflineAudioContext||window.webkitOfflineAudioContext, off=new O(1,Math.ceil(b.duration*44100),44100), s=off.createBufferSource(); s.buffer=b; s.connect(off.destination); s.start(0);
 const r=await new Promise((res,rej)=>{ off.oncomplete=e=>res(e.renderedBuffer); const p=off.startRendering(); if(p&&p.then) p.then(res,rej); });
 return r.getChannelData(0);
}

/* ---------- ROOM ---------- */
async function checkRoom(){
 const box=$('roomnow'); try{ await mic(); }catch(e){ box.innerHTML='<div class="msg bad">'+esc(C.errorWords(e,'audio'))+'</div>'; return; }
 const r=C.record(MIC,'audio'); let n=5; box.innerHTML='<p class="cnt">Quiet now… '+n+'</p>';
 await new Promise(res=>{ const t=setInterval(()=>{ n--; if(n<=0){ clearInterval(t); res(); } else box.innerHTML='<p class="cnt">Quiet now… '+n+'</p>'; },1000); });
 const out=await r.stop();
 try{ const b=await decode(out.blob), d=await to441(b); const rm=A.room(d,44100); if(S.room&&S.room.id) del(S.room.id); const id='room-'+uid(); await put(id,out.blob); S.room=Object.assign(rm,{id,at:Date.now()}); save(); render(); }
 catch(e){ box.innerHTML='<div class="msg bad">This phone couldn\'t read the recording to measure it. Try again.</div>'; }
}

/* ---------- READ: one take ---------- */
async function recTap(key){
 if(REC&&RECKEY===key) return stopRec();
 if(REC) await stopRec();
 try{ await mic(); }catch(e){ toast(C.errorWords(e,'audio')); return; }
 REC=C.record(MIC,'audio'); RECKEY=key; T0=Date.now(); render();
 TICK=setInterval(()=>{ const el=document.querySelector('[data-rt]'); if(el) el.textContent=((Date.now()-T0)/1000).toFixed(1)+' s'; },100);
}
async function stopRec(){
 const r=REC, key=RECKEY; REC=null; RECKEY=null; clearInterval(TICK); if(!r) return;
 const out=await r.stop(); render();
 let secs=out.secs, silent=false;
 try{ const b=await decode(out.blob), d=await to441(b), t=A.trim(A.rumbleCut(d,44100),44100); secs=Math.round((t.end-t.start)/44100*10)/10; silent=t.silent; }catch(e){}
 if(silent){ toast('Nothing heard in that take. Is the mic covered?'); return; }
 const id='t-'+uid(); await put(id,out.blob);
 (S.takes[key]=S.takes[key]||[]).push({id,secs,at:Date.now()}); S.kept[key]=id; save(); render();
}
let PLAYER=null;
async function play(id){ if(PLAYER){ PLAYER.pause(); URL.revokeObjectURL(PLAYER.src); } const b=await get(id); if(!b) return toast('That take is gone.'); PLAYER=new Audio(URL.createObjectURL(b)); PLAYER.play().catch(()=>{}); }
async function drop(key,id){ const L=S.takes[key]||[]; S.takes[key]=L.filter(t=>t.id!==id); await del(id); if(S.kept[key]===id){ const last=S.takes[key].slice(-1)[0]; if(last) S.kept[key]=last.id; else delete S.kept[key]; } save(); render(); }
const keptOf=key=>{ const L=S.takes[key]||[]; return L.find(t=>t.id===S.kept[key])||null; };

/* ---------- SEND ---------- */
function plan(J){
 // reading order: every spot in order; your lines; each ALT read right after its line
 const out=[];
 J.spots.forEach((sp,si)=>{ const mine=[]; sp.lines.forEach((ln,li)=>{ if(ln.who!==youIn(sp,J)) return; mine.push({key:lineKey(sp,li,0),label:ln.text,spot:sp.title,alt:0});
   if(S.opts.alts) ln.alts.forEach((a,ai)=>mine.push({key:lineKey(sp,li,ai+1),label:a,spot:sp.title,alt:ai+1})); });
  mine.forEach((m,i)=>{ m.after=i===mine.length-1?'spot':'line'; m.si=si; out.push(m); }); });
 return out;
}
function spotTime(sp,J){ const secs=[]; let missing=0; sp.lines.forEach((ln,li)=>{ if(ln.who!==youIn(sp,J)) return; const k=keptOf(lineKey(sp,li,0)); if(k) secs.push(k.secs); else missing++; }); return {secs:A.spotTime(secs,S.opts.gap),missing,have:secs.length}; }
async function make(){
 const J=job(), P=plan(J), box=$('made'); const missing=P.filter(p=>!keptOf(p.key));
 if(!P.length){ box.innerHTML='<div class="msg bad">No lines of yours to send yet. Add the copy on COPY.</div>'; return; }
 if(missing.length===P.length){ box.innerHTML='<div class="msg bad">Nothing recorded yet. Read your lines on READ first.</div>'; return; }
 box.innerHTML='<p class="dim">Making it…</p>';
 try{
  // your room fills the gaps, unless the check found it too loud (then the gaps are silent rather than noisy)
  const room=S.room&&S.room.id&&S.room.verdict!=='loud'?await get(S.room.id):null; const roomD=room?await to441(await decode(room)):null;
  const groups=S.opts.per==='spot'?J.spots.map((sp,si)=>P.filter(p=>p.si===si)).filter(g=>g.length):[P];
  const files=[];
  for(const grp of groups){
   const clips=[]; for(const p of grp){ const k=keptOf(p.key); if(!k) continue; const b=await get(k.id); if(!b) continue; clips.push({data:await to441(await decode(b)),rate:44100,after:p.after}); }
   if(!clips.length) continue;
   const out=A.build(clips,{target:S.opts.target,gap:S.opts.gap,spotGap:S.opts.spotGap,room:roomD});
   const bytes=S.opts.fmt==='wav'?A.wav(out.data,44100):A.mp3(out.data,44100,128);
   const client=S.job.client||'Audition', who=name()||'Your Name';
   const fn=S.opts.per==='spot'?V.fileName(client+' - '+grp[0].spot,who,S.opts.fmt):V.fileName(client,who,S.opts.fmt);
   files.push({fn,blob:new Blob([bytes],{type:S.opts.fmt==='wav'?'audio/wav':'audio/mpeg'}),out});
  }
  showMade(files,missing.length);
 }catch(e){ box.innerHTML='<div class="msg bad">It couldn\'t make the file: '+esc(e.message||e)+'</div>'; }
}
let MADE=[];
function showMade(files,missing){
 MADE.forEach(m=>URL.revokeObjectURL(m.url)); MADE=files.map(f=>Object.assign(f,{url:URL.createObjectURL(f.blob)}));
 const fmt=S.opts.fmt==='wav'?'WAV, 16-bit':'MP3, 128 kbps', mm=s=>Math.floor(s/60)+':'+String(Math.round(s%60)).padStart(2,'0');
 let h=missing?'<div class="msg bad">'+missing+' line'+(missing===1?' has':'s have')+' no take yet and '+(missing===1?'is':'are')+' left out.</div>':'';
 MADE.forEach((m,i)=>{ const o=m.out;
  h+='<div class="card"><b class="fn">'+esc(m.fn)+'</b><audio controls src="'+m.url+'" class="aud"></audio>'
   +'<p class="dim small">'+mm(o.secs)+' · mono, 44.1 kHz, '+fmt+' · '+o.lufs+' LUFS · loudest peak '+o.peak+' dB'
   +(o.room!=null?' · your room between lines about '+o.room+' dB':'')+'</p>'
   +'<p class="dim small">'+(o.gain>0.5?'Brought up '+Math.round(o.gain)+' dB. ':o.gain<-0.5?'Brought down '+Math.round(-o.gain)+' dB. ':'')+'Rumble cut, dead air trimmed'+(o.limited?', '+o.limited+' s of peaks held under '+A.CEILING+' dB':'')+'.'
   +(o.room!=null&&o.room>-60?' <span class="bad">The room between lines is above -60 dB: they may hear it.</span>':'')+'</p>'
   +'<div class="row"><a class="btn pri" href="'+m.url+'" download="'+esc(m.fn)+'">DOWNLOAD</a>'+(navigator.canShare?'<button class="btn" data-share="'+i+'">SHARE</button>':'')+'</div></div>'; });
 $('made').innerHTML=h;
 $('made').querySelectorAll('[data-share]').forEach(b=>b.onclick=async()=>{ const m=MADE[+b.dataset.share]; const f=new File([m.blob],m.fn,{type:m.blob.type}); try{ if(navigator.canShare({files:[f]})) await navigator.share({files:[f],title:m.fn}); else toast('This phone can\'t share a file from here. Use DOWNLOAD.'); }catch(e){} });
}
const name=()=>S.name||(Y&&Y.get().name)||'';

/* a file you made yourself (a booth, another app): what casting will hear */
function sniff(u8){
 const s=(i,n)=>String.fromCharCode(...u8.slice(i,i+n));
 if(s(0,4)==='RIFF'&&s(8,4)==='WAVE'){ const v=new DataView(u8.buffer,u8.byteOffset); let p=12; while(p+8<u8.length){ const id=s(p,4), len=v.getUint32(p+4,true); if(id==='fmt ') return {fmt:'WAV',channels:v.getUint16(p+10,true),rate:v.getUint32(p+12,true),bits:v.getUint16(p+22,true)}; p+=8+len+(len&1); } return {fmt:'WAV'}; }
 let p=0; if(s(0,3)==='ID3') p=10+((u8[6]&127)<<21|(u8[7]&127)<<14|(u8[8]&127)<<7|(u8[9]&127));
 for(let i=p;i<Math.min(u8.length-4,p+65536);i++){ if(u8[i]===0xFF&&(u8[i+1]&0xE0)===0xE0){ const ver=(u8[i+1]>>3)&3, lay=(u8[i+1]>>1)&3, bi=(u8[i+2]>>4)&15, ri=(u8[i+2]>>2)&3, ch=(u8[i+3]>>6)&3;
   if(lay!==1||bi===0||bi===15||ri===3) continue;
   const v1=ver===3, br=(v1?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[bi];
   const rate=(v1?[44100,48000,32000]:ver===2?[22050,24000,16000]:[11025,12000,8000])[ri];
   return {fmt:'MP3',kbps:br,rate,channels:ch===3?1:2}; } }
 if(s(4,4)==='ftyp') return {fmt:'M4A'};
 return {fmt:''};
}
async function checkFile(f){
 const box=$('checked'); box.innerHTML='<p class="dim">Listening…</p>';
 try{
  const ab=await f.arrayBuffer(), info=sniff(new Uint8Array(ab)), b=await decode(new Blob([ab])), d=await to441(b);
  const lufs=A.loudness(d,44100), peak=Math.round(A.peak(d)*10)/10;
  const fr=[], n=Math.round(0.05*44100); for(let i=0;i+n<=d.length;i+=n) fr.push(A.rms(d,i,i+n)); fr.sort((a,c)=>a-c);
  const room=fr.length?Math.round(fr[Math.floor(fr.length*0.1)]*10)/10:null;
  const ch=info.channels||b.numberOfChannels, L=[];
  L.push([true,(info.fmt||'Sound file')+(info.kbps?' '+info.kbps+' kbps':'')+(info.bits?' '+info.bits+'-bit':'')+(info.rate?', '+(info.rate/1000)+' kHz':'')+', '+(ch===1?'mono':ch+' channels')+', '+(Math.round(b.duration*10)/10)+' s.']);
  if(ch>1) L.push([false,'Two channels. VO is usually sent mono; check the spec.']);
  L.push([lufs>=-24&&lufs<=-16,'Loudness '+lufs+' LUFS.'+(lufs<-24?' On the quiet side: it may sound weaker than the others in the pile.':lufs>-16?' Hot: it may sound squashed.':'')]);
  L.push([peak<=-1,'Loudest peak '+peak+' dB.'+(peak>-1?' Too close to the top: it can crackle after they convert it.':'')]);
  if(room!=null) L.push([room<=-60,'Room between lines about '+room+' dB.'+(room>-60?' Above -60: they may hear the room.':'')]);
  box.innerHTML='<div class="card"><b class="fn">'+esc(f.name)+'</b><ul class="chk">'+L.map(([okk,t])=>'<li class="'+(okk?'ok':'no')+'">'+esc(t)+'</li>').join('')+'</ul><p class="faint small">It only listens. Your file isn\'t changed.</p></div>';
 }catch(e){ box.innerHTML='<div class="msg bad">This phone couldn\'t read that file. Try an MP3, WAV or M4A.</div>'; }
}

/* ---------- show it ---------- */
const TABS=['copy','room','read','send'];
function render(){
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));
 const J=job(); $('title').textContent=S.job.client||(J.spots[0]&&J.spots[0].title)||'Voice over';
 $('count').textContent=J.spots.length?J.spots.length+' spot'+(J.spots.length===1?'':'s')+(S.job.due?' · due '+S.job.due:''):'';
 const m=$('main');
 if(S.tab==='copy') m.innerHTML=copyView(J);
 else if(S.tab==='room') m.innerHTML=roomView();
 else if(S.tab==='read') m.innerHTML=readView(J);
 else m.innerHTML=sendView(J);
 wire(J);
}
function copyView(J){
 let h='<div class="card"><p class="kicker">The copy</p><p class="dim">Drop the scripts, the brief and the agent\'s email. Word, PDF or pasted. It finds the spots, your lines and the ALTs, and reads the order they want.</p>'
  +'<label class="btn pri block"><input type="file" id="files" multiple accept=".pdf,.docx,.txt,.text,.rtf,.eml,.md" hidden>ADD FILES</label>'
  +'<textarea class="field" id="paste" placeholder="Or paste: the copy, or the agent\'s note (due, one MP3, the order)"></textarea><button class="btn block" id="pastego">READ IT</button></div>';
 if(S.job.client||S.job.due||S.job.order.length||S.job.oneFile){
  h+='<div class="card"><p class="kicker">The job</p>'+(S.job.client?'<p><b>'+esc(S.job.client)+'</b></p>':'')
   +(S.job.due?'<p>Due: '+esc(S.job.due)+'</p>':'')
   +(S.job.oneFile||S.job.order.length?'<p>'+(S.job.oneFile?'One '+(S.job.format||'file').toUpperCase():'')+(S.job.order.length?(S.job.oneFile?', in this order: ':'In this order: ')+esc(S.job.order.join(', ')):'')+'.</p>':'')+'</div>';
 }
 if(J.spots.length){
  const vs=Object.entries(J.voices);
  h+='<div class="card"><p class="kicker">Spots, in reading order</p>';
  if(vs.length>1) h+='<p class="dim small">Your voice (each script\'s main voice unless you pick one):</p><div class="row" style="margin-bottom:10px">'+vs.map(([k,n])=>'<button class="chip sm'+(k===S.you?' on':'')+'" data-you="'+esc(k)+'">'+esc(k)+' <i>'+n+'</i></button>').join('')+'</div>';
  J.spots.forEach((sp,i)=>{ const yu=youIn(sp,J), mine=sp.lines.filter(l=>l.who===yu), alts=mine.reduce((n,l)=>n+l.alts.length,0);
   h+='<div class="it"><span class="n">'+(i+1)+'</span><div class="w"><b>'+esc(sp.title||'Spot '+(i+1))+(sp.secs?' :'+sp.secs:'')+'</b><small>'+mine.length+' line'+(mine.length===1?'':'s')+(alts?' · '+alts+' ALT'+(alts===1?'':'s'):'')+' as '+esc(yu)+' · about '+V.guess(sp,yu)+' s read cold</small></div>'
    +'<button class="ib" data-up="'+i+'" aria-label="Move up"'+(i?'':' disabled')+'>↑</button></div>'; });
  h+='<p class="faint small" style="margin-top:8px">"Read cold" is a guess from the words (2.7 a second). Your real time comes from your takes.</p></div>';
 }
 if(S.brief) h+='<details class="card"><summary class="kicker">The brief</summary><p class="brief">'+esc(S.brief)+'</p></details>';
 if(S.parts.length||S.brief) h+='<button class="btn ghost block" id="newjob">NEW JOB (clears the copy and your takes)</button>';
 if(!J.spots.length) h+='<p class="faint small">Nothing yet. A spot looks like "Morning Ride :30" followed by lines that start "VO:" (or the character\'s name).</p>';
 return h;
}
function roomView(){
 let h='<div class="card"><p class="kicker">Check the room</p><p class="dim">Stand where you\'ll read, phone where it\'ll be. Tap, then stay quiet for 5 seconds. It measures the closet with you silent.</p>'
  +'<button class="btn pri big block" id="roomgo">CHECK THE ROOM</button><div id="roomnow"></div></div>';
 if(S.room) h+='<div class="msg'+(S.room.verdict==='quiet'?'':' bad')+'">'+esc(A.roomWords(S.room))+'</div><p class="faint small">That 5 seconds is kept and used to fill the gaps between your lines, so they sound like your room, not a hole.</p>';
 h+='<div class="card"><p class="kicker">A closet that works</p><ul class="tips"><li>Clothes all around you soak up the echo. The more, the better.</li><li>Phone about a hand-width from your mouth, a little off to the side so your breath doesn\'t hit it.</li><li>Fan, AC, fridge off. Phone on Do Not Disturb.</li><li>Same spot, same distance, every line.</li></ul></div>';
 return h;
}
function readView(J){
 if(!J.spots.length) return '<div class="msg">Add the copy on COPY first.</div>';
 let h='<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="dim small">'+(MIC?'Mic on. Tap ● to record a line, tap again to stop.':'Tap ● to record a line, tap again to stop.')+'</span>'+(MIC?'<button class="btn sm ghost" id="micoff">MIC OFF</button>':'')+'</div>';
 J.spots.forEach((sp,si)=>{ const t=spotTime(sp,J);
  h+='<div class="spot"><p class="kicker">'+(si+1)+' · '+esc(sp.title||'Spot')+(sp.secs?' · :'+sp.secs:'')+'</p>'
   +(t.have?'<p class="time'+(sp.secs&&Math.abs(t.secs-sp.secs)>1?' off':'')+'">'+esc(A.timeWords(t.secs,sp.secs))+(t.missing?' ('+t.missing+' line'+(t.missing===1?'':'s')+' still to read)':'')+'</p>':'');
  sp.lines.forEach((ln,li)=>{
   const notes=ln.notes&&ln.notes.length?'<p class="dir">'+esc(ln.notes.join(' '))+'</p>':'';
   if(ln.who!==youIn(sp,J)){ h+=notes+'<p class="other"><b>'+esc(ln.who)+':</b> '+esc(ln.text)+'</p>'; return; }
   h+=notes+lineCard(lineKey(sp,li,0),ln.text,'');
   ln.alts.forEach((a,ai)=>{ h+=lineCard(lineKey(sp,li,ai+1),a,'ALT'+(ln.alts.length>1?' '+(ai+1):'')); });
  });
  h+='</div>'; });
 return h;
}
function lineCard(key,text,tag){
 const on=RECKEY===key, L=S.takes[key]||[];
 return '<div class="line'+(tag?' alt':'')+(on?' rec':'')+'">'+(tag?'<span class="pill">'+tag+'</span>':'')+'<p class="copy">'+esc(text)+'</p>'
  +'<div class="row"><button class="recb'+(on?' on':'')+'" data-rec="'+esc(key)+'" aria-label="'+(on?'Stop':'Record')+'">'+(on?'■':'●')+'</button>'
  +(on?'<span class="rt" data-rt>0.0 s</span>':'')
  +L.map((t,i)=>'<span class="tk'+(S.kept[key]===t.id?' kept':'')+'"><button class="tkp" data-play="'+t.id+'">▶ '+(i+1)+' · '+t.secs+' s</button>'
   +(S.kept[key]===t.id?'<em>KEPT</em>':'<button class="tkk" data-keep="'+esc(key)+'|'+t.id+'">KEEP</button>')+'<button class="tkx" data-drop="'+esc(key)+'|'+t.id+'" aria-label="Delete take">×</button></span>').join('')
  +'</div></div>';
}
function fnLine(J){ const client=S.job.client||'Audition', who=name()||'Your Name';
 return S.opts.per==='spot'?'One file per spot, named like: <b>'+esc(V.fileName(client+' - '+((J.spots[0]||{}).title||'Spot'),who,S.opts.fmt))+'</b>':'Named: <b>'+esc(V.fileName(client,who,S.opts.fmt))+'</b>'; }
function sendView(J){
 const P=plan(J), have=P.filter(p=>keptOf(p.key)).length, client=S.job.client||'', fn=V.fileName(client||'Audition',name()||'Your Name',S.opts.fmt);
 const ch=(k,v,l)=>'<button class="chip sm'+(S.opts[k]===v?' on':'')+'" data-opt="'+k+'|'+v+'">'+l+'</button>';
 let h='<div class="card"><p class="kicker">The file</p>'
  +'<label class="lab">Your name</label><input class="field" id="nm" value="'+esc(name())+'" autocomplete="name">'
  +'<label class="lab" style="margin-top:8px">Client or project</label><input class="field" id="cl" value="'+esc(client)+'">'
  +'<p class="dim small" id="fnp" style="margin-top:8px">'+fnLine(J)+'</p>'
  +'<p class="lab" style="margin-top:10px">Files</p><div class="row">'+ch('per','one','One file')+ch('per','spot','One per spot')+'</div>'
  +(S.job.oneFile&&S.opts.per!=='one'?'<p class="bad small">The note asks for one file.</p>':'')
  +'<p class="lab" style="margin-top:10px">Kind</p><div class="row">'+ch('fmt','mp3','MP3')+ch('fmt','wav','WAV')+'</div>'
  +'<p class="lab" style="margin-top:10px">Level</p><div class="row">'+ch('target',-23,'Quieter (-23)')+ch('target',-20,'Standard (-20)')+ch('target',-16,'Louder (-16)')+'</div>'
  +'<p class="faint small">No rule says one number for auditions. Standard sits with most of the pile. Peaks are held under -3 dB either way.</p>'
  +'<p class="lab" style="margin-top:10px">ALTs</p><div class="row">'+ch('alts',true,'Read after their line')+ch('alts',false,'Leave out')+'</div>'
  +'<p class="lab" style="margin-top:10px">Pause between lines</p><div class="row">'+ch('gap',0.4,'Short')+ch('gap',0.6,'Medium')+ch('gap',0.9,'Long')+'</div></div>';
 h+='<div class="card"><p class="kicker">In this order</p>'+J.spots.map((sp,i)=>{ const t=spotTime(sp,J); return '<div class="it"><span class="n">'+(i+1)+'</span><div class="w"><b>'+esc(sp.title||'Spot')+'</b><small>'+(t.have?esc(A.timeWords(t.secs,sp.secs)):'not read yet')+'</small></div></div>'; }).join('')
  +'<p class="dim small" style="margin-top:8px">'+have+' of '+P.length+' lines have a take.'+(S.room?'':' No room check yet: the gaps will be silent.')+'</p>'
  +'<button class="btn pri big block" id="makego"'+(have?'':' disabled')+'>MAKE THE FILE</button><div id="made"></div></div>';
 h+='<div class="card"><p class="kicker">Made it somewhere else?</p><p class="dim small">A booth, another app. Drop the file and it tells you what casting will hear: kind, length, loudness, peaks and the room between lines.</p>'
  +'<label class="btn block"><input type="file" id="chkf" accept="audio/*,.mp3,.wav,.m4a,.aif,.aiff" hidden>CHECK A FILE</label><div id="checked"></div></div>';
 h+='<p class="faint small">MP3 made by <a href="https://lame.sourceforge.io/">LAME</a> (lamejs), used as is under the LGPL.</p>';
 return h;
}
function wire(J){
 const q=(s,f)=>document.querySelectorAll(s).forEach(f);
 const fi=$('files'); if(fi) fi.onchange=()=>{ const f=[...fi.files]; fi.value=''; takeFiles(f); };
 const pg=$('pastego'); if(pg) pg.onclick=()=>{ const t=$('paste').value; if(!t.trim()) return; const k=addText('Pasted '+new Date().toLocaleTimeString(),t,t); save(); render(); toast(({copy:'Read as copy',note:'Read as the agent\'s note',brief:'Kept as the brief',nothing:'Nothing to read'})[k]); };
 q('[data-you]',b=>b.onclick=()=>{ S.you=S.you===b.dataset.you?'':b.dataset.you; save(); render(); });
 q('[data-up]',b=>b.onclick=()=>{ const i=+b.dataset.up; if(!i) return; const ord=(S.order&&S.order.length===J.base.length)?S.order.slice():J.base.map((_,k)=>k); [ord[i-1],ord[i]]=[ord[i],ord[i-1]]; S.order=ord; save(); render(); });
 const nj=$('newjob'); if(nj) nj.onclick=async()=>{ if(!confirm('Start a new job? This clears the copy, the note, the brief and every take.')) return; for(const k of Object.keys(S.takes)) for(const t of S.takes[k]) await del(t.id); const keep={name:S.name,room:S.room,opts:S.opts}; S=Object.assign(blank(),keep,{tab:'copy'}); save(); render(); };
 const rg=$('roomgo'); if(rg) rg.onclick=checkRoom;
 const mo=$('micoff'); if(mo) mo.onclick=micOff;
 q('[data-rec]',b=>b.onclick=()=>recTap(b.dataset.rec));
 q('[data-play]',b=>b.onclick=()=>play(b.dataset.play));
 q('[data-keep]',b=>b.onclick=()=>{ const [k,id]=b.dataset.keep.split('|'); S.kept[k]=id; save(); render(); });
 q('[data-drop]',b=>b.onclick=()=>{ const [k,id]=b.dataset.drop.split('|'); drop(k,id); });
 q('[data-opt]',b=>b.onclick=()=>{ const [k,v]=b.dataset.opt.split('|'); S.opts[k]=v==='true'?true:v==='false'?false:isNaN(+v)?v:+v; save(); render(); });
 const nm=$('nm'); if(nm) nm.oninput=()=>{ S.name=nm.value; save(); };
 const cl=$('cl'); if(cl) cl.oninput=()=>{ S.job.client=cl.value; save(); };
 [nm,cl].forEach(x=>{ if(x) x.addEventListener('input',()=>{ const f=$('fnp'); if(f) f.innerHTML=fnLine(J); }); });
 const mg=$('makego'); if(mg) mg.onclick=make;
 const cf=$('chkf'); if(cf) cf.onchange=()=>{ const f=cf.files[0]; cf.value=''; if(f) checkFile(f); };
}
$('tabs').addEventListener('click',e=>{ const b=e.target.closest('button[data-t]'); if(!b) return; S.tab=b.dataset.t;
 // the mic is only on where you record: leave READ or ROOM and it goes off
 if(MIC&&!['read','room'].includes(S.tab)){ if(REC) stopRec(); C.stop(MIC); MIC=null; }
 save(); render(); window.scrollTo(0,0); });
window.addEventListener('pagehide',()=>{ C.stop(MIC); });
window.__booth={get S(){return S;},job,plan,addText,make,checkFile,render};
render();
})();
