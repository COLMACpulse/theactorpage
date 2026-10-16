/* node film/tests/run_tests.js [path/to/LAST_BUS_sides.txt] */
const fs=require('fs'), path=require('path');
new Function('window',fs.readFileSync(path.join(__dirname,'../../actor-os/sides.js'),'utf8'))(globalThis);
const F=require('../film.js');
let pass=0,fail=0; const ok=(n,c,x)=>{ if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,x===undefined?'':JSON.stringify(x))} };

const lbPath=process.argv[2];
const SAMPLE=`EXT. RANCH BRIDGE - DUSK

Sheriff Cole stands by the creek. He checks his badge and watches the road. That's all.

SHERIFF COLE
You picked a hell of a place to lie to me.

A bartender's shoulder in the foreground. Three men wait near the truck.

BARTENDER
I didn't lie. I survived.

SHERIFF COLE
Then survive the truth.

INT. BARN - CONTINUOUS

The door creaks. Nobody speaks.
`;
let sc=F.scenes(SAMPLE);
ok('two scenes', sc.length===2, sc.length);
ok('speakers are the two who talk', sc[0].speakers.map(s=>s.name).join()==='SHERIFF COLE,BARTENDER', sc[0].speakers);
ok('place and time read from the heading', sc[0].place==='RANCH BRIDGE'&&sc[0].tod==='DUSK'&&sc[0].ie==='EXT', [sc[0].place,sc[0].tod,sc[0].ie]);
ok('CONTINUOUS carries the time before', sc[1].tod==='DUSK', sc[1].tod);
ok('props by whole word: badge, truck; no hat from "that"', sc[0].props.includes('badge')&&sc[0].props.includes('truck')&&!sc[0].props.includes('hat'), sc[0].props);
ok('people in the action without lines', sc[0].people.includes('men')&&!sc[0].people.includes('sheriff'), sc[0].people);
ok('scene with no speech has no speakers', sc[1].speakers.length===0);
ok('sound cues found', sc[1].sound.includes('door')&&sc[1].sound.includes('creaks'), sc[1].sound);

// heading forms
const h=F.heading('INT./EXT. CAL\'S PICKUP - MOVING - NIGHT');
ok('I/E heading', h.ie==='I/E'&&h.place==="CAL'S PICKUP - MOVING"&&h.tod==='NIGHT', h);
ok('scene numbers stripped', F.prep('  12A   INT. KITCHEN - DAY     12A').trim()==='INT. KITCHEN - DAY');

// shots
const two=sc[0];
const keep=F.shots(two,'keep','SHERIFF COLE'), comp=F.shots(two,'compress','SHERIFF COLE'), proof=F.shots(two,'proof','SHERIFF COLE');
ok('keep: a close-up for each part', keep.some(s=>s.what==='SHERIFF COLE close-up')&&keep.some(s=>s.what==='BARTENDER close-up'), keep.map(s=>s.what));
ok('keep: over the shoulder both ways', keep.filter(s=>/^Over /.test(s.what)).length===2);
ok('compress: the other is a dirty over, hands and a voice', ['BARTENDER as a dirty over',"BARTENDER's hands","BARTENDER's lines as a voice"].every(w=>comp.some(s=>s.what===w)), comp.map(s=>s.what));
ok('compress: no close-up of the other', !comp.some(s=>s.what==='BARTENDER close-up'));
ok('proof: one face, one setup', proof.filter(s=>/close-up/.test(s.what)).length===1&&proof[0].what==='SHERIFF COLE close-up, one setup', proof.map(s=>s.what));
ok('every list ends with room tone', [keep,comp,proof].every(l=>/Room tone/.test(l[l.length-1].what)));
ok('inserts come from the action', keep.some(s=>s.what==='Insert: badge'));
ok('your character leads when you picked one', F.shots(two,'proof','BARTENDER')[0].what==='BARTENDER close-up, one setup');
ok('no-dialogue scene: wide, medium, the door, room tone', F.shots(sc[1],'keep','').map(s=>s.id).join()==='wide,med,ins-door,tone', F.shots(sc[1],'keep','').map(s=>s.id));
ok('shot copy has no em dashes', [keep,comp,proof].flat().every(s=>!/[—–]/.test(s.what+s.how)));

// owned
const owned=F.RANCH.map((o,i)=>Object.assign({id:'o'+i},o));
ok('ranch list: 14 locations', owned.filter(o=>o.kind==='location').length===14);
const pl=F.places({place:'RANCH ROAD'},owned);
ok('owned location matched by a word in the place', pl.some(x=>x.loc.name==='Ranch road / dirt driveway'), pl.map(x=>x.loc.name));
ok('short words do not match ("bar" is not "barn")', F.places({place:'BAR'},owned).length===0);
const own=F.owns(F.scenes("INT. CAB - NIGHT\n\nShe grabs the lantern and the rope.\n\nCAL\nGo.\n")[0],owned);
ok('your props named in the scene', own.some(o=>o.name==='Lantern')&&own.some(o=>o.name==='Coil of rope'), own.map(o=>o.name));

// day
const d=F.day([{scene:{n:1,tod:'NIGHT'},where:'Barn',set:true,wardrobe:'a'},{scene:{n:2,tod:'DAY'},where:'Creek',set:true,wardrobe:'b'},{scene:{n:3,tod:'NIGHT'},where:'Barn',set:true,wardrobe:'a'},{scene:{n:4,tod:'DAY'},where:'BUS SHELTER',set:false,wardrobe:''}]);
ok('same place and time together', d[0].where==='Barn'&&d[0].items.map(x=>x.scene.n).join()==='1,3', d.map(b=>b.where+':'+b.items.map(x=>x.scene.n)));
ok('places not set yet go last', d[d.length-1].where==='BUS SHELTER');

// the real sides
if(lbPath&&fs.existsSync(lbPath)){
 const raw=fs.readFileSync(lbPath,'utf8');
 const lb=F.scenes(raw);
 ok('LAST BUS raw text: 3 scenes', lb.length===3, lb.map(s=>s.heading));
 ok('LAST BUS: Cal and Rennie on camera, every scene', lb.every(s=>F.seen(s).slice().sort().join()==='CAL,RENNIE'), lb.map(s=>F.seen(s)));
 ok('LAST BUS: Mom is a voice on the phone (V.O.), scene 1 only', lb[0].speakers.find(x=>x.name==='MOM').voice==='V.O.'&&!lb[1].speakers.some(x=>x.name==='MOM'));
 ok('LAST BUS: Mom gets a voice shot, never a close-up', ['keep','compress','proof'].every(w=>{const l=F.shots(lb[0],w,'RENNIE');return l.some(s=>s.what==="MOM's lines as a voice")&&!l.some(s=>/^MOM close|onto MOM|Over MOM/.test(s.what));}));
 ok('LAST BUS: places', lb.map(s=>s.place).join('|')==="COUNTY ROAD BUS SHELTER|CAL'S PICKUP - MOVING|TRUCK STOP MOTEL - PARKING LOT", lb.map(s=>s.place));
 ok('LAST BUS: times (pickup is CONTINUOUS from night)', lb.map(s=>s.tod).join()==='NIGHT,NIGHT,DAWN', lb.map(s=>s.tod));
 ok('LAST BUS: ticket and duffel in scene 1', lb[0].props.includes('ticket')&&lb[0].props.includes('duffel'), lb[0].props);
 ok('LAST BUS: rain on a tin roof is a sound', lb[0].sound.includes('rain')&&lb[0].sound.includes('roof'), lb[0].sound);
 const rp=F.shots(lb[0],'compress','RENNIE');
 ok('LAST BUS compress as RENNIE: Cal is the shoulder and the voice', rp.some(s=>s.what==='CAL as a dirty over')&&rp.some(s=>s.what==="CAL's lines as a voice")&&rp[0].who==='RENNIE');
 const pk=F.places(lb[1],owned);
 ok("LAST BUS: Cal's pickup suggests the pickup truck cab", pk.some(x=>x.loc.name==='Pickup truck cab'), pk.map(x=>x.loc.name));
}

// ---------- sun ----------
{ const s=F.sun(new Date(2026,9,15,12),38.8403,-97.6114);
  ok('sun: an order that makes sense', s.dawn<s.sunrise&&s.sunrise<s.goldenMorningEnds&&s.goldenMorningEnds<s.noon&&s.noon<s.goldenEveningStarts&&s.goldenEveningStarts<s.sunset&&s.sunset<s.dusk);
  ok('sun: day length in Kansas mid-October about 11 h', Math.abs((s.sunset-s.sunrise)/36e5-11.1)<0.3, (s.sunset-s.sunrise)/36e5);
  ok('sun: midnight sun and polar night are said, not faked', F.sun(new Date(2026,5,21,12),69.65,18.96).polar==='sun up all day'&&F.sun(new Date(2026,11,21,12),69.65,18.96).polar==='sun down all day');
  ok('sun: no place, no times', F.sun(new Date(),NaN,1)===null);
  ok('sun for a DAWN scene names first light and sunrise', /^first light .*, sunrise /.test(F.sunFor('DAWN',s))&&/^sunset .*, last light /.test(F.sunFor('DUSK',s))&&/^dark after /.test(F.sunFor('NIGHT',s)));
}
ok('coords: plain, N/W, a Google pin, an Apple pin, words', JSON.stringify([F.coords('38.8403, -97.6114'),F.coords('38.8403 N, 97.6114 W'),F.coords('https://www.google.com/maps/@38.8403,-97.6114,15z'),F.coords('https://maps.apple.com/?ll=38.84,-97.61'),F.coords('the barn')])==='[{"lat":38.8403,"lng":-97.6114},{"lat":38.8403,"lng":-97.6114},{"lat":38.8403,"lng":-97.6114},{"lat":38.84,"lng":-97.61},null]');
// ---------- cut ----------
ok('timecode', F.tc(3600,'30')==='01:00:00:00'&&F.tc(4.5,'24')==='00:00:04:12'&&F.tc(61.1,'25')==='00:01:01:03');
ok('m:ss in and out', F.secs('1:05.5')===65.5&&F.secs('12')===12&&F.secs('x')===null&&F.mmss(65.5)==='1:05.5'&&F.mmss(300)==='5:00');
const PC=[{scene:1,heading:'EXT. ROAD - NIGHT',name:'IMG_4512.MOV',in:2,out:14.5},{scene:2,heading:'INT. TRUCK - NIGHT',name:'IMG_4520.MOV',in:0,out:31},{scene:3,heading:'EXT. MOTEL - DAWN',name:'C0013.MP4',in:5,out:5}];
ok('cut length skips a piece with no length', F.cutLength(PC.slice(0,2))===43.5);
const E=F.edl('Last Bus',PC,'30');
ok('EDL: two events, record runs on from 01:00:00:00, clip names kept', /^001  IMG_4512 AA\/V  C        00:00:02:00 00:00:14:15 01:00:00:00 01:00:12:15$/m.test(E)&&/^002  IMG_4520 AA\/V  C        00:00:00:00 00:00:31:00 01:00:12:15 01:00:43:15$/m.test(E)&&/FROM CLIP NAME: IMG_4512.MOV/.test(E)&&!/^003/m.test(E), E);
require('fs').writeFileSync(process.env.EDL_OUT||'/dev/null',E);
ok('CSV: order, start times', F.cutCsv(PC).split('\n')[2].endsWith(',0:12.5'));
// ---------- footage check ----------
const TK=[{scene:1,id:'a',name:'IMG_4512.MOV',size:100},{scene:1,id:'b',name:'A001_C002.mov',size:50},{scene:2,id:'c',name:'IMG_4520.MOV',size:80},{scene:3,id:'d',name:'C0013.MP4',size:70},{scene:3,id:'e',name:'C0014.MP4',size:70}];
const FL=[{name:'img_4512.mov',size:100},{name:'A001-C002.MOV',size:51},{name:'IMG_4520.MOV',size:0},{name:'C0013.MP4',size:70},{name:'C0013.MOV',size:900},{name:'IMG_9000.webm',size:5},{name:'IMG_9001.mkv',size:5},{name:'notes.txt',size:9},{name:'IMG_9002.MOV',size:0}];
const FC=F.footageCheck(TK,FL);
ok('footage: matches ignore case, dashes, underscores', FC.have.map(x=>x.take.id).join()==='a,b', FC.have);
ok('footage: a different size is flagged, same size is not', FC.have[0].sizeDiffers===false&&FC.have[1].sizeDiffers===true);
ok('footage: an empty file is never counted as having it', FC.empty.some(x=>x.take&&x.take.id==='c')&&!FC.have.some(x=>x.take.id==='c'));
ok('footage: an empty file nobody logged is still shown', FC.empty.some(x=>!x.take&&x.file.name==='IMG_9002.MOV'));
ok('footage: two files for one take are shown, not picked', FC.twice.length===1&&FC.twice[0].take.id==='d'&&FC.twice[0].files.length===2);
ok('footage: logged but not here', FC.missing.map(x=>x.id).join()==='e');
ok('footage: webm and mkv are seen as unlogged, text files skipped', FC.extra.map(x=>x.name).sort().join()==='IMG_9000.webm,IMG_9001.mkv'&&FC.skipped===1, FC.extra);
// ---------- editor brief ----------
const BR=F.brief('Last Bus',[
 {n:1,heading:'EXT. ROAD - NIGHT',brief:{free:'tight',keep:'Cal sees the bus leave\nHe does not run',ask:'You want to drop the wave',note:''},takes:[{name:'IMG_4512.MOV',in:2,out:14.5,use:true},{name:'IMG_4513.MOV',in:0,out:9,mark:'backup'},{name:'IMG_4514.MOV',in:0,out:9,mark:'never'}],shots:{d:3,t:5}},
 {n:2,heading:'INT. TRUCK - NIGHT',brief:{},takes:[],shots:null},
 {n:3,heading:'EXT. MOTEL - DAWN',brief:{missing:'No wide of the lot'},takes:[{name:'C0013.MP4',in:0,out:0,use:true}],shots:{d:4,t:4}}],'30');
ok('brief: freedom in plain words', /Freedom: Tight\. Trims, timing/.test(BR), BR);
ok('brief: must keep, use with times, backup, never use', /Must keep:\n   - Cal sees the bus leave\n   - He does not run/.test(BR)&&/IMG_4512\.MOV  00:00:02:00 to 00:00:14:15 \(0:12\.5\)/.test(BR)&&/Backup:\n   - IMG_4513/.test(BR)&&/Never use:\n   - IMG_4514/.test(BR));
ok('brief: shot list gap shows as missing; full list does not', /Shot list: 3 of 5 shots marked done/.test(BR)&&!/4 of 4/.test(BR));
ok('brief: empty scene left out; zero-length take is not a pick', !/SCENE 2\./.test(BR)&&/SCENE 3\.[^\n]*\n  Freedom: not set\. Ask the director\.\n  Use: no take picked yet\./.test(BR));
ok('brief: ask-me-first gathered at the end; no scores or percents', /ASK ME FIRST, ALL SCENES\n - Scene 1: You want to drop the wave/.test(BR)&&!/%|score/i.test(BR));
// ---------- ADR ----------
{
 const sr=16000;
 const line=(f0,syl,gap,jit,seed)=>{ let s=seed; const rnd=()=>{ s=(s*16807)%2147483647; return s/2147483647-0.5; }; const parts=[];
  syl.forEach((d0,k)=>{ const d=d0*(1+jit*rnd()), n=Math.round(d*sr), a=new Float32Array(n); for(let i=0;i<n;i++){ const t=i/sr; let v=0; for(let h=1;h<6;h++) v+=Math.sin(2*Math.PI*h*f0*t)/h; a[i]=0.25*v*Math.min(1,t/0.02,(d-t)/0.02); } parts.push(a,new Float32Array(Math.round(gap[k%gap.length]*(1+jit*rnd())*sr))); });
  let L=0; parts.forEach(p=>L+=p.length); const o=new Float32Array(L); let q=0; parts.forEach(p=>{o.set(p,q);q+=p.length;}); return o; };
 const syl=[0.18,0.25,0.12,0.3,0.2,0.15,0.35], gap=[0.08,0.15,0.06,0.25];
 const orig=line(120,syl,gap,0,1), scene=new Float32Array(8*sr); scene.set(orig,2*sr); for(let i=0;i<scene.length;i++) scene[i]+=0.003*Math.sin(i*1.7);
 const mk=j=>{ const l=line(135,syl,gap,j,4), t=new Float32Array(Math.round(0.5*sr)+l.length); t.set(l,Math.round(0.5*sr)); return t; };
 const ref=F.envelope(scene,sr);
 const r0=F.alignTake(ref,0,F.envelope(mk(0),sr),0.5,3.5), r15=F.alignTake(ref,0,F.envelope(mk(0.15),sr),0.5,3.5), r35=F.alignTake(ref,0,F.envelope(mk(0.35),sr),0.5,3.5);
 console.log('ADR at:',r0,r15,r35);
 ok('ADR: same timing, other pitch, 0.5 s lead-in: take starts at 1.50 s', Math.abs(r0.at-1.5)<=0.011&&r0.r>0.9, r0);
 ok('ADR: timing loose by 15% / 35%: still within 60 ms', Math.abs(r15.at-1.5)<=0.06&&Math.abs(r35.at-1.5)<=0.07, [r15,r35]);
 ok('ADR: words follow the match', /closely/.test(F.matchWords(r0))&&/nearly silent/.test(F.matchWords(F.alignTake(ref,0,new Float32Array(200),0,2)))&&/runs past/.test(F.matchWords(F.alignTake(ref,0,F.envelope(new Float32Array(20*sr).map((_,i)=>Math.sin(i)),sr),0,1))));
 const wrong=new Float32Array(3*sr); for(let i=0;i<wrong.length;i++) wrong[i]=0.2*Math.sin(2*Math.PI*200*i/sr)*(i<sr*2.5?1:0);
 const rw=F.alignTake(ref,0,F.envelope(wrong,sr),0.5,3.5); ok('ADR: one long held note against the line does not "line up closely"', rw.r<0.8&&!/closely/.test(F.matchWords(rw)), rw);
 { const pl=F.placeAt(new Float32Array([0.5,-0.5,1]),10,0.2); ok('ADR: place a take at 0.2 s = 2 samples of silence first', pl.length===5&&pl[0]===0&&pl[1]===0&&pl[2]===0.5&&pl[4]===1, Array.from(pl));
   const neg=F.placeAt(new Float32Array([1,2,3]),10,-0.1); ok('ADR: a take starting before the clip is trimmed, not shifted', neg.length===2&&neg[0]===2, Array.from(neg));
   const wv=new DataView(F.wav(new Float32Array([0,1,-1]),48000)); ok('WAV: header, 48 kHz, 16-bit mono, samples', wv.getUint32(24,true)===48000&&wv.getUint16(34,true)===16&&wv.getUint16(22,true)===1&&wv.getInt16(46,true)===32767&&wv.getInt16(48,true)===-32768); }
 ok('ADR: no score words', !/score|%/.test([r0,r15,rw].map(F.matchWords).join(' ')));
}
// ---------- find a take ----------
{
 const now=new Date('2026-10-15T15:00:00').getTime(), D=864e5;
 const T=[
  {id:'a',scene:1,heading:'EXT. COUNTY ROAD BUS SHELTER - NIGHT',people:['CAL'],name:'IMG_4512.MOV',note:'the one where he laughs',use:true,at:now-1*D},
  {id:'b',scene:1,heading:'EXT. COUNTY ROAD BUS SHELTER - NIGHT',people:['CAL'],name:'IMG_4513.MOV',note:'',mark:'never',at:now-9*D},
  {id:'c',scene:2,heading:"INT. CAL'S PICKUP - MOVING - CONTINUOUS",people:['CAL','RENNIE'],name:'IMG_4520.MOV',note:'rennie cries',mark:'backup',at:now-10*D,adr:true},
  {id:'d',scene:3,heading:'EXT. TRUCK STOP MOTEL - PARKING LOT - DAWN',people:['CAL','MOM'],name:'Insurance take.mov',note:'',use:true,at:null}];
 const ids=q=>F.findTakes(q,T,now).hits.map(h=>h.take.id).join();
 ok('find: "bus shelter" finds the IMG takes by their scene heading', ids('bus shelter')==='a,b', ids('bus shelter'));
 ok('find: "the laugh" finds the take by your note (laugh / laughs)', ids('the laugh')==='a' && /"laugh" in your note/.test(F.findTakes('the laugh',T,now).hits[0].why.join()));
 ok('find: "rennie" finds the scene she is in', ids('rennie')==='c' && /RENNIE is in the scene/.test(F.findTakes('rennie',T,now).hits[0].why.join()));
 ok('find: "last week" is a date (7 to 13 days ago), not two words', ids('last week')==='b,c', ids('last week'));
 ok('find: "yesterday" and "today"', ids('yesterday')==='a' && ids('today')==='' );
 ok('find: "never use", "backup", "in the cut", "adr"', ids('never use')==='b'&&ids('backup')==='c'&&ids('in the cut')==='a,d'&&ids('adr')==='c', [ids('never use'),ids('backup'),ids('in the cut'),ids('adr')]);
 ok('find: "scene 2" and a number from a file name', ids('scene 2')==='c'&&ids('4513')==='b');
 ok('find: "a", "in", "the" alone find nothing (not everything)', ids('a')===''&&ids('in')===''&&ids('the one')==='');
 ok('find: "insurance" matches the word, "in" never matches inside words', ids('insurance')==='d'&&ids('bus in')==='a,b');
 const pr=F.findTakes('bus shelter dancing',T,now); ok('find: when nothing matches every word, closest shown and marked partial', pr.partial&&pr.hits.map(h=>h.take.id).join()==='a,b');
 const w=F.findTakes('cal last week',T,now).hits[0].why.join(' · '); ok('find: says why in plain words', /logged 9 days ago/.test(w)&&/CAL is in the scene/.test(w), w);
 ok('find: a take logged before dates were kept is never matched by a date', !F.findTakes('this week',T,now).hits.some(h=>h.take.id==='d'));
}
{ // notes while watching, pinned to the take on screen
 const P=[{in:2,out:12},{in:5,out:20},{in:0,out:4}];
 ok('watch note: time in the cut adds the pieces before it', F.atInCut(P,1,8)===13 && F.atInCut(P,0,2)===0 && F.atInCut(P,2,3)===28, [F.atInCut(P,1,8),F.atInCut(P,2,3)]);
 const t={name:'BUS_T3.mov',in:5,out:20,use:true};
 ok('watch note: empty text is not kept', F.watchNote(t,9,14,'   ')===null && !t.watch);
 F.watchNote(t,14.257,23.04,'Too much setup. Get to the bus sooner.',1000); F.watchNote(t,6.5,11.5,'Love the look.',2000);
 ok('watch note: kept on the take, rounded, sorted by time in the take', t.watch.length===2 && F.watchNotes(t)[0].text==='Love the look.' && F.watchNotes(t)[1].at===14.26 && F.watchNotes(t)[1].cut===23, F.watchNotes(t));
 const b=F.brief('Last Bus',[{n:2,heading:'EXT. BUS SHELTER - NIGHT',brief:{},takes:[t]}],'24');
 ok('watch note: in the editor brief under the take, with file timecode and cut time', /BUS_T3\.mov  00:00:05:00 to 00:00:20:00 \(0:15\)\n {7}at 00:00:06:12 \(0:11\.5 into the cut\): Love the look\.\n {7}at 00:00:14:06 \(0:23 into the cut\): Too much setup/.test(b), b);
 ok('watch note: no em-dash, no score', !/\u2014|score|%/.test(b));
}
{ // call sheet and end credits, from what the project knows
 const sc=[{n:1,speakers:[{name:'CAL',lines:3},{name:'RENNIE',lines:2}]},{n:2,speakers:[{name:'MOM',lines:1,voice:'V.O.'},{name:'CAL',lines:1}]},{n:3,speakers:[{name:'RENNIE',lines:1}]}];
 const P=F.parts(sc);
 ok('parts in order of appearance; a part only heard is a voice', P.map(p=>p.role+(p.voice?'(v)':'')).join()==='CAL,RENNIE,MOM(v)'&&P[2].first===2, P);
 ok('clock and date words', F.clock('07:05')==='7:05 AM'&&F.clock('19:30')==='7:30 PM'&&F.clock('00:15')==='12:15 AM'&&F.dateWords('2026-10-23')==='Fri, Oct 23, 2026');
 ok('crew lines: "Job: Name", "Job - Name", a bare name', JSON.stringify(F.crewLines('Directed by: Sam Lee\nSound - Jo Park\nMom'))==='[{"job":"Directed by","name":"Sam Lee"},{"job":"Sound","name":"Jo Park"},{"job":"","name":"Mom"}]');
 const D={title:'Last Bus',date:'2026-10-23',call:'06:30',wrap:'18:00',sun:{sunrise:new Date(2026,9,23,7,24),sunset:new Date(2026,9,23,18,31)},hospital:'County General, 555-0199',
  blocks:[{where:'Bus shelter',address:'38.67, -97.12',tod:'NIGHT',start:'19:00',sun:'dark after 6:58 PM',items:[{n:1,heading:'EXT. BUS SHELTER - NIGHT',who:['CAL','RENNIE'],wardrobe:'CAL: work jacket',props:['duffel bag']}]},
          {where:'Kitchen',address:'',tod:'DAY',start:'',sun:'',items:[{n:3,heading:'INT. KITCHEN - DAY',who:['RENNIE'],wardrobe:'',props:[]}]}],
  cast:[{role:'CAL',actor:'Sam Actor',first:1},{role:'RENNIE',actor:'',first:1},{role:'MOM',actor:'Jo Voice',voice:true,first:2}],crew:F.crewLines('Directed by: Sam Lee'),contacts:['Sam Lee, director, 555-0100'],notes:'Park on the gravel.'};
 const cs=F.callSheet(D).text;
 ok('call sheet: date, crew call, wrap, sun, hospital', /Date: Fri, Oct 23, 2026   Crew call: 6:30 AM   Wrap: 6:00 PM/.test(cs)&&/Sunrise 7:24 AM · Sunset 6:31 PM/.test(cs)&&/Nearest hospital: County General/.test(cs), cs);
 ok('call sheet: schedule by place with start, address, sun, scenes, who, wardrobe, props', /1\. 7:00 PM  Bus shelter · NIGHT   \(38\.67, -97\.12\)\n   Sun: dark after 6:58 PM\n   Sc 1  EXT\. BUS SHELTER - NIGHT\n      on camera: CAL, RENNIE · CAL: work jacket · props: duffel bag/.test(cs)&&/2\. Kitchen · DAY/.test(cs), cs);
 ok('call sheet: cast with who plays it and their first place; voice marked', /CAL: Sam Actor · first up: 1\. Bus shelter/.test(cs)&&/MOM \(voice\): Jo Voice\n/.test(cs)&&/RENNIE: not cast/.test(cs), cs);
 ok('call sheet: says what is not filled in yet', /NOT FILLED IN YET\n - Who plays RENNIE\./.test(cs)&&F.callSheet(D).missing.length===1, F.callSheet(D).missing);
 const blank=F.callSheet({title:'X',blocks:[],cast:[]}); ok('call sheet with nothing set: asks for date, call, hospital', blank.missing.length===3&&/No scenes yet/.test(blank.text), blank.missing);
 const cr=F.credits({title:'Last Bus',cast:D.cast,crew:F.crewLines('Written and directed by: Sam Lee\nCamera: Jo Park\nSound: Ray Cruz'),places:['Bus shelter','Kitchen'],thanks:['Mom and Dad'],owner:'Range Films',year:'2026'}).text;
 ok('credits: title, lead credit, cast in a column, crew, filmed at, thanks, ©', /^LAST BUS\n\nWritten and directed by\nSam Lee\n\nCAST\nCAL {12}Sam Actor\nRENNIE {9}\[name\?\]\nMOM \(voice\) {4}Jo Voice\n\nCREW\nCamera {4}Jo Park\nSound {5}Ray Cruz\n\nFILMED AT\nBus shelter\nKitchen\n\nSPECIAL THANKS\nMom and Dad\n\n© 2026 Range Films\n$/.test(cr), cr);
 ok('no em-dash in the call sheet or credits, no score anywhere', !/—/.test(cr+cs)&&!/score|%/.test(cs+cr));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
