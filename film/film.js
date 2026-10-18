/* STORY STUDIO engine. One person makes the whole scene.
   Pure: no page, no storage. Runs in the browser (window.FilmOS) and in Node for the tests.
   Speeches come from Actor OS's own reader (../actor-os/sides.js), so a script reads the
   same here as it does in ACT. This file only adds what a shoot needs on top: scenes,
   places, times of day, what's in the action, and shot lists.
   No scores. It lists; you pick. */
(function(g){
const F={};
const SIDES=()=>g.ActorSides;   // ../actor-os/sides.js, loaded first

/* ---------- scenes ---------- */
const SLUG=/^\s*(INT|EXT|EST|I\/E|INT\.?\/EXT|EXT\.?\/INT)(?:[\.\s]|\s*:\s*\S)|^\s*\.[A-Za-z0-9]/i;   // .TITLE CARD is a heading Final Draft or Fountain forced
const TODS=['DAY','NIGHT','DAWN','DUSK','MORNING','EVENING','AFTERNOON','SUNSET','SUNRISE','CONTINUOUS','LATER','MOMENTS LATER','SAME'];

/* Scene numbers hang off both margins of a heading in a real script:
   "1     EXT. COUNTY ROAD BUS SHELTER - NIGHT      1". */
F.prep=function(text){
 return String(text||'').replace(/\r/g,'')
  .replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
  .split('\n').map(l=>{
   l=l.replace(/\s+#[\w.\-]+#\s*$/,'');   // Fountain scene number: INT. BAR - NIGHT #12#
   const m=l.match(/^\s*\d+[A-Z]?\.?\s+((?:INT|EXT|I\/E)(?:[.\s]|\s*:).*?)(?:\s+\d+[A-Z]?\.?)?\s*$/i);
   return m?m[1]:l;
  }).join('\n');
};

F.heading=function(h){
 const t=String(h||'').trim().replace(/^\.(?=[A-Za-z0-9])/,'').replace(/\s+/g,' ');
 const m=t.match(/^(INT\.?\/EXT\.?|I\/E\.?|INT\.?|EXT\.?)\s*(:?)\s*(.*)$/i);
 const ie=m?m[1].toUpperCase().replace(/\.$/,'').replace('INT/EXT','I/E').replace('INT./EXT','I/E'):'';
 // colon form puts the time first: "INT: DAY. City jailhouse"
 const cm=m&&m[2]&&m[3].match(/^([A-Za-z][A-Za-z \-]*?)\s*[.,]\s+(.+)$/);
 if(cm&&TODS.includes(cm[1].trim().toUpperCase())) return {ie:ie.replace(/\.$/,''),place:cm[2].trim(),tod:cm[1].trim().toUpperCase(),heading:t};
 const parts=(m?m[3]:t).split(/\s+[-–—]\s+/).map(s=>s.trim()).filter(Boolean);
 let tod='';
 const ups=parts.map(p=>p.toUpperCase());
 for(let i=ups.length-1;i>0;i--){ if(TODS.includes(ups[i])){ tod=tod||ups[i]; } }
 const place=parts.filter((p,i)=>!(i>0&&TODS.includes(ups[i]))).join(' - ');
 return {ie:ie.replace(/\.$/,''),place:place,tod:tod,heading:t};
};

F.scenes=function(text){
 const S=SIDES();
 const lines=F.prep(text).split('\n');
 const chunks=[]; let cur={heading:'',lines:[]};
 lines.forEach(l=>{
  if(SLUG.test(l)){ if(cur.heading||cur.lines.some(x=>x.trim())) chunks.push(cur); cur={heading:l.trim().replace(/^\.(?=[A-Za-z0-9])/,''),lines:[]}; }
  else cur.lines.push(l);
 });
 if(cur.heading||cur.lines.some(x=>x.trim())) chunks.push(cur);
 const out=[];
 chunks.forEach(c=>{
  const body=c.lines.join('\n');
  const beats=S.parse(body);
  const speakers=S.speakers(beats);
  if(!c.heading&&!speakers.length) return;          // a title page or notes before the first scene
  const h=F.heading(c.heading);
  // a voice in the script (V.O. / O.S. / on the phone) is never on camera
  const vo={}; let m; const VO=/^\s*([A-Z][A-Z0-9 .'\-]{1,32}?)\s*\((V\.\s?O\.?|O\.\s?S\.?|O\.\s?C\.?|ON PHONE|ON THE PHONE|FILTERED|PRE-LAP)\)/gm;
  while((m=VO.exec(body))) vo[m[1].trim().toUpperCase()]=m[2].toUpperCase().replace(/\s/g,'');
  speakers.forEach(s=>{ if(vo[s.name]) s.voice=vo[s.name]; });
  const action=beats.filter(b=>b.action).map(b=>b.text);
  const all=action.join(' ');
  out.push({n:out.length+1,heading:c.heading||'(no scene heading)',ie:h.ie,place:h.place||'',tod:h.tod,
   speakers:speakers,beats:beats,action:action,
   props:F.find(all,PROPS),sound:F.find(all,SOUNDS),people:F.find(all,PEOPLE).filter(p=>!speakers.some(s=>s.name.toLowerCase().split(/\s+/).includes(p)))});
 });
 // CONTINUOUS / SAME / LATER carry the time of the scene before
 for(let i=1;i<out.length;i++) if(/^(CONTINUOUS|SAME|LATER|MOMENTS LATER)$/.test(out[i].tod)&&out[i-1].tod) out[i].tod=out[i-1].tod;
 return out;
};

/* ---------- what's in the action ----------
   Whole words only: "hat" is never found inside "that". Shown as suggestions. */
const PROPS=['ticket','tickets','duffel','bag','suitcase','backpack','purse','wallet','keys','key','phone','cell','letter','envelope','note','photo','photograph','map','book','bible','notebook','file','folder','badge','gun','pistol','rifle','shotgun','revolver','holster','knife','rope','lantern','flashlight','lamp','bulb','candle','lighter','match','matches','cigarette','cigarettes','cigar','bottle','glass','glasses','cup','mug','coffee','thermos','flask','beer','whiskey','plate','bowl','fork','spoon','table','chair','chairs','bench','bed','door','window','fridge','magnet','radio','tv','television','laptop','camera','money','cash','coin','ring','watch','hat','cap','coat','jacket','gloves','boots','umbrella','blanket','towel','newspaper','box','crate','bucket','shovel','axe','hammer','saddle','bridle','truck','pickup','car','van','bus','horse','bike','motorcycle','trailer','tractor','engine','wipers','heater','dashboard','steering','wheel','headlights','seatbelt','gas','pump','sign','fence','gate','tire','tires'];
const SOUNDS=['rain','thunder','wind','storm','engine','idles','idling','horn','honk','siren','wipers','heater','radio','phone','rings','ringing','buzz','buzzes','door','slams','knock','knocks','footsteps','steps','boots','dog','dogs','barks','horse','cattle','birds','crickets','creek','river','water','fire','crackle','crackles','clock','ticks','tv','music','crowd','traffic','train','bus','truck','gravel','tires','glass','breaks','shatters','gunshot','shot','shots','bell','creak','creaks','hum','buzzing','bulb','tin','roof'];
const PEOPLE=['man','woman','men','women','kid','kids','child','children','boy','girl','driver','bartender','waitress','waiter','clerk','cop','cops','officer','deputy','sheriff','doctor','nurse','crowd','stranger','strangers','passenger','passengers','customer','customers','guard','guards','hand','hands','rider','riders','neighbor','pastor','preacher','priest','judge','soldier','soldiers'];
F.find=function(text,list){
 const words=String(text||'').toLowerCase().match(/[a-z']+/g)||[];
 const want=new Set(list), out=[];
 words.forEach(w=>{ if(want.has(w)&&!out.includes(w)) out.push(w); });   // in the order the script names them
 return out;
};
/* your own things named in the scene: "Pickup truck" is in a scene that says "pickup" */
F.owns=function(scene,owned){
 const text=(scene.place+' '+scene.action.join(' ')).toLowerCase();
 const words=new Set(text.match(/[a-z']+/g)||[]);
 return (owned||[]).filter(o=>o.kind!=='location'&&o.kind!=='person').filter(o=>{
  const ws=String(o.name||'').toLowerCase().match(/[a-z']+/g)||[];
  return ws.some(w=>w.length>=4&&words.has(w));
 });
};
/* owned locations that share a word with the script's place, or with what you said it can play */
F.places=function(scene,owned){
 const words=new Set(String(scene.place||'').toLowerCase().match(/[a-z']+/g)||[]);
 return (owned||[]).filter(o=>o.kind==='location').map(o=>{
  const ws=(String(o.name||'')+' '+String(o.plays||'')+' '+String(o.notes||'')).toLowerCase().match(/[a-z']+/g)||[];
  const hit=[...new Set(ws.filter(w=>w.length>=4&&words.has(w)))];
  return {loc:o,words:hit};
 }).filter(x=>x.words.length);
};

/* ---------- three ways to make it alone ---------- */
F.WAYS=[
 {id:'keep',name:'Keep it',say:'You play every part. Same frame, one side at a time, then cut it together.'},
 {id:'compress',name:'Compress it',say:'You play one part on camera. The others are a shoulder, hands, a voice.'},
 {id:'proof',name:'Fastest proof',say:'One face, one setup. The others are a voice. Inserts and sound carry the rest.'}
];
/* Who you are on camera when the others are compressed: your character if you picked one, else whoever speaks most. */
F.seen=function(scene){ const v=scene.speakers.filter(s=>!s.voice); return (v.length?v:scene.speakers).map(s=>s.name); };
F.lead=function(scene,me){
 const sp=F.seen(scene);
 if(me&&sp.includes(me)) return me;
 return sp[0]||'';
};
F.shots=function(scene,way,me,ins){
 const L0=F.shots0(scene,way,me,ins), vo=scene.speakers.filter(s=>s.voice&&F.seen(scene).indexOf(s.name)<0);
 if(!vo.length) return L0;
 const tone=L0.pop();
 vo.forEach(s=>L0.push({id:'vo-'+s.name,what:s.name+'\'s lines as a voice',how:'Off screen in the script ('+s.voice+'). Record them, play them on set.',who:s.name}));
 L0.push(tone); return L0;
};
F.shots0=function(scene,way,me,pick){
 const sp=F.seen(scene), lead=F.lead(scene,me), others=sp.filter(n=>n!==lead);
 const L=[]; const add=(id,what,how,who)=>L.push({id:id,what:what,how:how||'',who:who||''});
 const ins=Array.isArray(pick)?pick:scene.props.slice(0,6);   // you pick them; until then, what the action names
 if(!sp.length){
  add('wide','Wide','Where everything is.');
  add('med','Medium','The action, closer.');
  ins.forEach(p=>add('ins-'+p,'Insert: '+p,''));
  add('tone','Room tone, 60 seconds','Everyone still, same place, same mics.');
  return L;
 }
 if(sp.length===1){
  add('wide','Wide on '+lead,'Locked. Where '+lead+' is.',lead);
  add('cu-'+lead,lead+' close-up','The whole scene in one take.',lead);
  ins.forEach(p=>add('ins-'+p,'Insert: '+p,''));
  add('tone','Room tone, 60 seconds','Same place, same mics.');
  return L;
 }
 if(way==='keep'){
  add('wide','Wide master, camera locked','Mark where each of them sits. Play '+sp.join(', then ')+' all the way through, same frame. Don\'t move the camera between them.');
  sp.forEach(x=>{
   const o=sp.filter(n=>n!==x)[0];
   add('cu-'+x,x+' close-up','You in '+x+'\'s wardrobe. Their lines played back for timing.',x);
   add('ots-'+x,'Over '+o+'\'s shoulder onto '+x,'The shoulder is you in '+o+'\'s wardrobe, or a stand-in. Keep it out of focus.',x);
  });
  ins.forEach(p=>add('ins-'+p,'Insert: '+p,''));
  add('tone','Room tone, 60 seconds','Same place, same mics.');
  return L;
 }
 if(way==='compress'){
  add('wide','Wide on '+lead,'Leave room where '+others.join(' and ')+' would be, or a shoulder in frame.',lead);
  add('med-'+lead,lead+' medium','',lead);
  add('cu-'+lead,lead+' close-up','',lead);
  others.forEach(o=>{
   add('dirty-'+o,o+' as a dirty over','Your shoulder and head in '+o+'\'s wardrobe, foreground, out of focus, onto '+lead+'.',o);
   add('hands-'+o,o+'\'s hands','Hands in frame with something of theirs'+(ins[0]?' ('+ins[0]+')':'')+'.',o);
   add('voice-'+o,o+'\'s lines as a voice','Record them (you or a friend), play them on set. Tape a mark where '+o+'\'s eyes are.',o);
  });
  ins.forEach(p=>add('ins-'+p,'Insert: '+p,''));
  add('tone','Room tone, 60 seconds','Same place, same mics.');
  return L;
 }
 // proof
 add('cu-'+lead,lead+' close-up, one setup','Camera locked. The whole scene in one take, then again.',lead);
 others.forEach(o=>add('voice-'+o,o+'\'s lines as a voice','Played on set. Eyes on the mark.',o));
 (ins.length?ins.slice(0,2):['your hands']).forEach(p=>add('ins-'+p,'Insert: '+p,''));
 add('tone','Room tone, 60 seconds','Same place, same mics.');
 return L;
};
/* who has to be dressed and lit as themselves on camera in this way */
F.onCamera=function(scene,way,me){
 const sp=F.seen(scene), lead=F.lead(scene,me);
 if(sp.length<2) return sp;
 if(way==='keep') return sp;
 if(way==='compress') return sp;              // the others are on camera as a shoulder or hands
 return [lead];
};

/* ---------- shoot day ----------
   Same location together, then same time of day, then same wardrobe, so you
   change clothes and move the gear as few times as possible. */
F.day=function(list){
 // list: [{scene, where, wardrobe}] where = location name you picked (or the script's place)
 const blocks=[];
 list.forEach(x=>{
  const key=x.where+'|'+(x.scene.tod||'');
  let b=blocks.find(y=>y.key===key);
  if(!b){ b={key:key,where:x.where,tod:x.scene.tod||'',set:!!x.set,items:[]}; blocks.push(b); }
  b.items.push(x);
 });
 const todOrder=t=>{ const i=['DAWN','SUNRISE','MORNING','DAY','AFTERNOON','SUNSET','DUSK','EVENING','NIGHT'].indexOf(t); return i<0?4:i; };
 blocks.sort((a,b)=>(b.set-a.set)||a.where.localeCompare(b.where)||todOrder(a.tod)-todOrder(b.tod));
 blocks.forEach(b=>b.items.sort((p,q)=>String(p.wardrobe).localeCompare(String(q.wardrobe))||p.scene.n-q.scene.n));
 return blocks;
};

/* Light / sound / access, from the notes on the ranch list itself. */
const RANCH_MORE={
 'Barn':{access:'interior + big door'},
 'Creek':{light:'dusk light',sound:'running water'},
 'Workshop':{light:'work light'},
 'Open field':{light:'wide, uncontrolled light'},
 'Oak treeline':{light:'shade; silhouettes'},
 'Kitchen':{light:'interior, white wall'},
 'Corral / paddock':{sound:'animals'},
 'Fire pit':{light:'night, warm key light'}
};
/* The ranch starter list (Col's place). Locations, props, wardrobe, gear. */
F.RANCH=[
 ['location','Barn','main structure; interior + big door'],['location','Front porch','covered; dialogue + authority chairs'],
 ['location','Creek','running water; dusk light'],['location','Workshop','desk, tools, work light'],
 ['location','Open field','wide, uncontrolled light'],['location','Oak treeline','depth, shade, silhouettes'],
 ['location','Ranch road / dirt driveway','arrivals, trucks, distance'],['location','Kitchen','interior, white wall, table'],
 ['location','Bedroom corner','tight interior'],['location','Tool shed','doorway, stall feel'],
 ['location','Corral / paddock','fenced, dust, animals'],['location','Hillside','elevation, mountain backdrop'],
 ['location','Fire pit','night, warm key light'],['location','Pickup truck cab','the truck as a location'],
 ['prop','Pickup truck','hero vehicle'],['prop','Lantern','practical light'],['prop','Coil of rope',''],['prop','Coffee mug',''],
 ['prop','Wooden chairs',''],['prop','Work table',''],['prop','Cowboy hat',''],['prop','Hand tools',''],['prop','Axe',''],
 ['prop','Cast-iron pan',''],['prop','Wooden crates',''],['prop','Horse tack',''],
 ['wardrobe','Brown jacket',''],['wardrobe','Flannel shirts',''],['wardrobe','Denim',''],['wardrobe','Work boots',''],['wardrobe','Work gloves',''],
 ['gear','Camera (mirrorless/DSLR)','primary'],['gear','Tripod',''],['gear','LED light panel x2',''],['gear','Reflector / bounce',''],
 ['gear','Shotgun mic',''],['gear','Boom pole',''],['gear','Field recorder',''],['gear','C-stand',''],['gear','Sandbags','']
].map(r=>Object.assign({kind:r[0],name:r[1],notes:r[2],plays:''},RANCH_MORE[r[1]]||{}));

/* ---------- the sun, worked out on the phone ----------
   NOAA solar calculator maths, refined at each event's own time, no network.
   date: the calendar day you shoot (its year/month/day). Times come back as Dates. */
const RAD=Math.PI/180, DEG=180/Math.PI;
function sunAt(jd){
 const T=(jd-2451545)/36525;
 const L0=((280.46646+T*(36000.76983+T*0.0003032))%360+360)%360, M=357.52911+T*(35999.05029-0.0001537*T), e=0.016708634-T*(0.000042037+0.0000001267*T);
 const C=Math.sin(M*RAD)*(1.914602-T*(0.004817+0.000014*T))+Math.sin(2*M*RAD)*(0.019993-0.000101*T)+Math.sin(3*M*RAD)*0.000289;
 const om=125.04-1934.136*T, app=L0+C-0.00569-0.00478*Math.sin(om*RAD);
 const obl=23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60+0.00256*Math.cos(om*RAD);
 const dec=Math.asin(Math.sin(obl*RAD)*Math.sin(app*RAD)), y=Math.pow(Math.tan(obl*RAD/2),2);
 const eq=4*DEG*(y*Math.sin(2*L0*RAD)-2*e*Math.sin(M*RAD)+4*e*y*Math.sin(M*RAD)*Math.cos(2*L0*RAD)-0.5*y*y*Math.sin(4*L0*RAD)-1.25*e*e*Math.sin(2*M*RAD));
 return {dec:dec, eq:eq};
}
F.sun=function(date,lat,lng){
 if(!isFinite(lat)||!isFinite(lng)) return null;
 const d=new Date(date), y=d.getFullYear(), mo=d.getMonth(), da=d.getDate(), base=Date.UTC(y,mo,da), jd0=base/864e5+2440587.5, phi=lat*RAD;
 const at=(mins)=>new Date(base+mins*60000);
 const noonMin=()=>{ let m=720-4*lng; for(let i=0;i<3;i++){ const s=sunAt(jd0+m/1440); m=720-4*lng-s.eq; } return m; };
 const ev=(h,sign)=>{ let m=noonMin();
  for(let i=0;i<4;i++){ const s=sunAt(jd0+m/1440), c=(Math.sin(h*RAD)-Math.sin(phi)*Math.sin(s.dec))/(Math.cos(phi)*Math.cos(s.dec)); if(c<-1||c>1) return null;
   m=720-4*lng-s.eq+sign*4*Math.acos(c)*DEG; } return at(m); };
 const sr=ev(-0.833,-1), ss=ev(-0.833,1), s0=sunAt(jd0+noonMin()/1440);
 return {noon:at(noonMin()), sunrise:sr, sunset:ss, dawn:ev(-6,-1), dusk:ev(-6,1), goldenMorningEnds:ev(6,-1), goldenEveningStarts:ev(6,1),
  polar:sr||ss?'':(Math.sin(phi)*Math.sin(s0.dec)>0?'sun up all day':'sun down all day')};
};
/* "38.6721, -97.1234", "38.6721 N 97.1234 W", or a maps link with @lat,lng or ?q=lat,lng */
F.coords=function(s){
 s=String(s||'').trim(); if(!s) return null;
 let lat, lng, m=s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)||s.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
 if(m){ lat=+m[1]; lng=+m[2]; }
 else { m=s.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i); if(!m) return null;
  lat=+m[1]; lng=+m[3]; if(m[2]&&/S/i.test(m[2])) lat=-Math.abs(lat); if(m[4]&&/W/i.test(m[4])) lng=-Math.abs(lng); }
 if(!(Math.abs(lat)<=90&&Math.abs(lng)<=180)) return null;
 return {lat:Math.round(lat*1e5)/1e5,lng:Math.round(lng*1e5)/1e5};
};
/* which part of the sun matters for a scene's time of day */
F.sunFor=function(tod,s){
 if(!s) return '';
 const t=String(tod||'').toUpperCase(), f=d=>d?d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'none';
 if(s.polar) return s.polar;
 if(/DAWN|SUNRISE|FIRST LIGHT/.test(t)) return 'first light '+f(s.dawn)+', sunrise '+f(s.sunrise);
 if(/MORNING/.test(t)) return 'sunrise '+f(s.sunrise)+', golden light until '+f(s.goldenMorningEnds);
 if(/DUSK|SUNSET|MAGIC/.test(t)) return 'sunset '+f(s.sunset)+', last light '+f(s.dusk);
 if(/EVENING|AFTERNOON/.test(t)) return 'golden light from '+f(s.goldenEveningStarts)+', sunset '+f(s.sunset);
 if(/NIGHT/.test(t)) return 'dark after '+f(s.dusk)+', light again '+f(s.dawn);
 return 'sunrise '+f(s.sunrise)+', sunset '+f(s.sunset);
};

/* ---------- cut to length: your takes, in script order, out to an editor ----------
   pieces: [{scene, heading, name, in, out}] in seconds. Nothing is scored; you chose them. */
F.FPS={'23.976':24,'24':24,'25':25,'29.97':30,'30':30};
F.tc=function(sec,fps){ const n=F.FPS[fps]||Math.round(+fps)||24; let fr=Math.round(sec*n); const f=fr%n; fr=(fr-f)/n; const s=fr%60; fr=(fr-s)/60; const m=fr%60; const h=(fr-m)/60;
 return [h,m,s,f].map(x=>String(x).padStart(2,'0')).join(':'); };
F.mmss=function(sec){ sec=Math.max(0,Math.round(sec*10)/10); const m=Math.floor(sec/60), s=sec-m*60; return m+':'+(s<10?'0':'')+(Number.isInteger(s)?s:s.toFixed(1)); };
F.secs=function(v){ v=String(v||'').trim(); if(!v) return null; const p=v.split(':').map(Number); if(p.some(x=>!isFinite(x))) return null; return p.reduce((a,x)=>a*60+x,0); };
F.cutLength=pieces=>(pieces||[]).reduce((t,p)=>t+Math.max(0,(p.out||0)-(p.in||0)),0);
F.edl=function(title,pieces,fps){
 const n=F.FPS[fps]||24, L=['TITLE: '+String(title||'STORY STUDIO CUT').toUpperCase().replace(/[^\w .'-]/g,'').slice(0,60),'FCM: NON-DROP FRAME',''];
 let rec=3600; // record starts at 01:00:00:00
 (pieces||[]).filter(p=>p.out>p.in).forEach((p,i)=>{
  const fi=Math.round(p.in*n)/n, fo=Math.round(p.out*n)/n, d=fo-fi;
  const reel=String(p.name||'AX').replace(/\.[^.]+$/,'').replace(/[^A-Za-z0-9_]/g,'').slice(0,8)||'AX';
  L.push(String(i+1).padStart(3,'0')+'  '+reel.padEnd(8)+' AA/V  C        '+F.tc(fi,fps)+' '+F.tc(fo,fps)+' '+F.tc(rec,fps)+' '+F.tc(rec+d,fps));
  L.push('* FROM CLIP NAME: '+String(p.name||''));
  L.push('* COMMENT: SC '+p.scene+' '+String(p.heading||'').replace(/\s+/g,' '));
  L.push('');
  rec+=d;
 });
 return L.join('\n');
};
F.cutCsv=function(pieces){
 const q=s=>'"'+String(s==null?'':s).replace(/"/g,'""')+'"'; let t=0;
 return ['order,scene,heading,file,in,out,length,starts_at'].concat((pieces||[]).filter(p=>p.out>p.in).map((p,i)=>{ const r=[i+1,p.scene,q(p.heading),q(p.name),p.in.toFixed(2),p.out.toFixed(2),(p.out-p.in).toFixed(2),F.mmss(t)].join(','); t+=p.out-p.in; return r; })).join('\n');
};

/* how long a phone clip is, read from the file's own header (MP4 / MOV 'mvhd'); no decoding,
   so it works for HEVC .mov on any browser. read(offset, length) -> Promise<ArrayBuffer>. */
F.movieLength=async function(read,size){
 const u32=(dv,o)=>dv.getUint32(o), typ=(dv,o)=>String.fromCharCode(dv.getUint8(o),dv.getUint8(o+1),dv.getUint8(o+2),dv.getUint8(o+3));
 let off=0, guard=0;
 while(off+8<=size&&guard++<200){
  const h=new DataView(await read(off,16)); let len=u32(h,0); const ty=typ(h,4); let hdr=8;
  if(len===1){ len=Number(h.getBigUint64(8)); hdr=16; } else if(len===0) len=size-off;
  if(len<hdr) return 0;
  if(ty==='moov'){
   const m=new DataView(await read(off+hdr,Math.min(len-hdr,64*1024*1024)));
   let i=0; while(i+8<=m.byteLength){ const l=u32(m,i), k=typ(m,i+4); if(k==='mvhd'){ const v=m.getUint8(i+8);
     if(v===1){ const ts=u32(m,i+28), du=Number(m.getBigUint64(i+32)); return ts?du/ts:0; }
     const ts=u32(m,i+20), du=u32(m,i+24); return ts?du/ts:0; } if(l<8) break; i+=l; }
   return 0;
  }
  off+=len;
 }
 return 0;
};

/* ---------- footage check: the takes you logged against the files in front of you ----------
   Matches by file name only (case, spaces, dashes and underscores ignored; extension ignored).
   Not here never means never shot. Nothing is guessed from pixels. */
F.MEDIA=['mov','mp4','m4v','mxf','mts','m2ts','avi','mkv','webm','3gp','braw','r3d','insv','mpg','mpeg','wmv','wav','aif','aiff','mp3','m4a'];
F.isMedia=name=>F.MEDIA.includes(String(name||'').split('.').pop().toLowerCase())&&/\./.test(String(name||''));
F.nameKey=name=>String(name||'').split(/[\\/]/).pop().replace(/\.[^.]*$/,'').toUpperCase().replace(/[^A-Z0-9]+/g,'');
/* takes: [{scene, id, name, size}]  files: [{name, size, path}]
   -> {have:[{take,file,sizeDiffers}], empty:[{take?,file}], missing:[take], extra:[file], twice:[{take,files}], skipped:n} */
F.footageCheck=function(takes,files){
 const media=[], out={have:[],empty:[],missing:[],extra:[],twice:[],skipped:0};
 (files||[]).forEach(f=>{ if(F.isMedia(f.name)) media.push(f); else out.skipped++; });
 const by={}; media.forEach(f=>{ (by[F.nameKey(f.name)]=by[F.nameKey(f.name)]||[]).push(f); });
 const used=new Set();
 (takes||[]).forEach(t=>{ const hits=by[F.nameKey(t.name)]||[];
  hits.forEach(f=>used.add(f));
  if(!hits.length){ out.missing.push(t); return; }
  if(hits.length>1){ out.twice.push({take:t,files:hits}); return; }
  const f=hits[0];
  if(!f.size){ out.empty.push({take:t,file:f}); return; }
  out.have.push({take:t,file:f,sizeDiffers:!!(t.size&&f.size!==t.size)}); });
 media.forEach(f=>{ if(used.has(f)) return; if(!f.size) out.empty.push({file:f}); else out.extra.push(f); });
 return out;
};

/* ---------- editor brief: what the editor needs from you, in your words. No scores. ---------- */
F.FREEDOM=[
 {id:'locked',name:'Locked',say:'Cut it the way it is marked. Change it only if it will not work technically.'},
 {id:'tight',name:'Tight',say:'Trims, timing, reaction choice and continuity fixes. Nothing bigger.'},
 {id:'guided',name:'Guided',say:'Rearrange inside the scene if you need to. Keep what the scene is for.'},
 {id:'yours',name:'Your call',say:'Build the best version from what is here. Keep the story facts.'},
 {id:'find',name:'Find it',say:'What we planned did not come together. Find the scene in the footage. Keep the story facts.'}
];
/* scenes: [{n, heading, brief:{free,keep,missing,ask,note}, takes:[{name,in,out,use,mark}], shots:{d,t}|null}] */
F.brief=function(title,scenes,fps){
 const L=['EDITOR BRIEF: '+String(title||'Untitled'),''], ln=s=>String(s||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
 const tcr=t=>F.tc(t.in,fps)+' to '+F.tc(t.out,fps)+' ('+F.mmss(Math.max(0,t.out-t.in))+')';
 const asks=[];
 (scenes||[]).forEach(sc=>{
  const b=sc.brief||{}, T=sc.takes||[], fr=F.FREEDOM.find(x=>x.id===b.free);
  const use=T.filter(t=>t.use&&t.out>t.in), back=T.filter(t=>t.mark==='backup'&&!t.use), never=T.filter(t=>t.mark==='never');
  if(!T.length&&!b.free&&!ln(b.keep).length&&!ln(b.missing).length&&!ln(b.ask).length&&!ln(b.note).length) return;
  L.push('SCENE '+sc.n+'. '+String(sc.heading||''));
  L.push('  Freedom: '+(fr?fr.name+'. '+fr.say:'not set. Ask the director.'));
  if(ln(b.keep).length){ L.push('  Must keep:'); ln(b.keep).forEach(x=>L.push('   - '+x)); }
  L.push('  Use:'+(use.length?'':' no take picked yet.')); use.forEach(t=>{ L.push('   - '+t.name+'  '+tcr(t)); F.watchNotes(t).forEach(w=>L.push('       at '+F.tc(w.at,fps)+(w.cut!=null?' ('+F.mmss(w.cut)+' into the cut)':'')+': '+w.text)); });
  if(back.length){ L.push('  Backup:'); back.forEach(t=>L.push('   - '+t.name)); }
  if(never.length){ L.push('  Never use:'); never.forEach(t=>L.push('   - '+t.name)); }
  const miss=ln(b.missing); if(sc.shots&&sc.shots.t&&sc.shots.d<sc.shots.t) miss.push('Shot list: '+sc.shots.d+' of '+sc.shots.t+' shots marked done.');
  if(miss.length){ L.push('  Missing:'); miss.forEach(x=>L.push('   - '+x)); }
  if(ln(b.ask).length){ L.push('  Ask me first if:'); ln(b.ask).forEach(x=>{ L.push('   - '+x); asks.push('Scene '+sc.n+': '+x); }); }
  if(ln(b.note).length){ L.push('  Notes:'); ln(b.note).forEach(x=>L.push('   - '+x)); }
  L.push('');
 });
 if(asks.length){ L.push('ASK ME FIRST, ALL SCENES'); asks.forEach(x=>L.push(' - '+x)); L.push(''); }
 L.push('Times count from the start of each file. The director has the final say.');
 return L.join('\n');
};

/* ---------- call sheet and end credits ----------
   Made from what the project already knows: the shoot day (place, time of day, wardrobe, who is on
   camera), the sun, the parts. You add times, names and phone numbers. Nothing guessed, nothing scored. */
F.clock=function(v){ const m=String(v||'').match(/^(\d{1,2}):(\d{2})/); if(!m) return ''; let h=+m[1]; const ap=h>=12?'PM':'AM'; h=h%12||12; return h+':'+m[2]+' '+ap; };
F.dateWords=function(v){ const m=String(v||'').match(/^(\d{4})-(\d\d)-(\d\d)$/); if(!m) return ''; const d=new Date(+m[1],+m[2]-1,+m[3],12); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}); };
/* "Directed by: Sam Lee" / "Sound - Jo Park" / "Gaffer Jo" -> {job, name}; a line with no job is a name */
F.crewLines=function(text){ return String(text||'').split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>{ const m=l.match(/^(.+?)\s*(?::|\s[-–]\s)\s*(.+)$/); return m?{job:m[1].trim(),name:m[2].trim()}:{job:'',name:l}; }); };
/* the parts in order of appearance, by scene; a part only ever heard is marked as a voice */
F.parts=function(scenes){ const seen={}, out=[]; (scenes||[]).forEach(sc=>(sc.speakers||[]).forEach(sp=>{ if(!seen[sp.name]){ seen[sp.name]={role:sp.name,first:sc.n,voice:!!sp.voice}; out.push(seen[sp.name]); } else if(!sp.voice) seen[sp.name].voice=false; })); return out; };
/* d: {title, date, call, wrap, sun:{sunrise,sunset}|null, blocks:[{where, address, tod, start, sun, items:[{n, heading, who, wardrobe, props}]}],
       cast:[{role, actor, voice, first}], crew:[{job,name}], contacts:[lines], hospital, notes} */
F.callSheet=function(d){
 const L=[], miss=[], t=x=>x?x.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
 L.push('CALL SHEET: '+String(d.title||'Untitled'));
 L.push('Date: '+(F.dateWords(d.date)||'not set')+'   Crew call: '+(F.clock(d.call)||'not set')+(d.wrap?'   Wrap: '+F.clock(d.wrap):''));
 if(!d.date) miss.push('The shoot date (Shoot day, at the top).'); if(!d.call) miss.push('The crew call time.');
 if(d.sun&&(d.sun.sunrise||d.sun.sunset)) L.push('Sunrise '+(t(d.sun.sunrise)||'none')+' · Sunset '+(t(d.sun.sunset)||'none'));
 L.push('Nearest hospital: '+(d.hospital||'not set')); if(!d.hospital) miss.push('The nearest hospital.');
 L.push('','SCHEDULE');
 (d.blocks||[]).forEach((b,i)=>{
  L.push((i+1)+'. '+(b.start?F.clock(b.start)+'  ':'')+b.where+(b.tod?' · '+b.tod:'')+(b.address?'   ('+b.address+')':''));
  if(b.sun) L.push('   Sun: '+b.sun);
  (b.items||[]).forEach(x=>{ L.push('   Sc '+x.n+'  '+x.heading); const bits=[];
   if(x.who&&x.who.length) bits.push('on camera: '+x.who.join(', ')); if(x.wardrobe) bits.push(x.wardrobe); if(x.props&&x.props.length) bits.push('props: '+x.props.join(', '));
   if(bits.length) L.push('      '+bits.join(' · ')); });
 });
 if(!(d.blocks||[]).length) L.push('   No scenes yet.');
 const blockOf=n=>{ const i=(d.blocks||[]).findIndex(b=>(b.items||[]).some(x=>x.n===n)); return i<0?'':(i+1)+'. '+d.blocks[i].where; };
 L.push('','CAST');
 (d.cast||[]).forEach(c=>{ L.push(' '+c.role+(c.voice?' (voice)':'')+': '+(c.actor||'not cast')+(!c.voice&&blockOf(c.first)?' · first up: '+blockOf(c.first):'')); if(!c.actor) miss.push('Who plays '+c.role+'.'); });
 if((d.crew||[]).length){ L.push('','CREW'); d.crew.forEach(c=>L.push(' '+(c.job?c.job+': ':'')+c.name)); }
 if((d.contacts||[]).length){ L.push('','CONTACTS'); d.contacts.forEach(c=>L.push(' '+c)); }
 if(d.notes){ L.push('','NOTES'); String(d.notes).split(/\n+/).filter(x=>x.trim()).forEach(x=>L.push(' '+x.trim())); }
 if(miss.length){ L.push('','NOT FILLED IN YET'); miss.forEach(x=>L.push(' - '+x)); }
 return {text:L.join('\n'), missing:miss};
};
/* d: {title, cast:[{role, actor, voice}], crew:[{job,name}], places:[names], thanks:[lines], owner, year} */
F.credits=function(d){
 const L=[String(d.title||'Untitled').toUpperCase(),''], miss=[];
 const crew=d.crew||[], lead=crew.filter(c=>/^(written|directed|produced|a film by)/i.test(c.job)), rest=crew.filter(c=>!lead.includes(c));
 lead.forEach(c=>{ L.push(c.job,c.name,''); });
 const cast=d.cast||[];
 if(cast.length){ L.push('CAST'); const w=Math.max(...cast.map(c=>(c.role+(c.voice?' (voice)':'')).length))+4;
  cast.forEach(c=>{ const r=c.role+(c.voice?' (voice)':''); L.push(r.padEnd(w,' ')+(c.actor||'[name?]')); if(!c.actor) miss.push('Who plays '+c.role+'.'); }); L.push(''); }
 if(rest.length){ L.push('CREW'); const w=Math.max(...rest.map(c=>c.job.length))+4; rest.forEach(c=>L.push(c.job?c.job.padEnd(w,' ')+c.name:c.name)); L.push(''); }
 if((d.places||[]).length){ L.push('FILMED AT'); d.places.forEach(p=>L.push(p)); L.push(''); }
 const th=(d.thanks||[]).filter(Boolean); if(th.length){ L.push('SPECIAL THANKS'); th.forEach(x=>L.push(x)); L.push(''); }
 if(d.owner) L.push('© '+(d.year||new Date().getFullYear())+' '+d.owner); else miss.push('Who the film belongs to (the © line).');
 if(!lead.length) miss.push('Written by / Directed by.');
 return {text:L.join('\n').trim()+'\n', missing:miss};
};

/* ---------- notes made while watching the cut, pinned to the take that was playing ----------
   t.watch: [{id, at (seconds into the file), cut (seconds into the cut when you noted it), text, when}] */
F.atInCut=function(pieces,i,t){ let c=0; for(let j=0;j<i&&j<(pieces||[]).length;j++) c+=Math.max(0,pieces[j].out-pieces[j].in); const p=(pieces||[])[i]; return p?c+Math.max(0,Math.min(t,p.out)-p.in):c; };
F.watchNotes=t=>((t&&t.watch)||[]).slice().sort((a,b)=>a.at-b.at);
F.watchNote=function(t,at,cut,text,now){ text=String(text||'').trim(); if(!t||!text) return null; const w={id:'w'+(now||Date.now()).toString(36)+Math.random().toString(36).slice(2,6),at:Math.round(at*100)/100,cut:cut==null?null:Math.round(cut*10)/10,text:text,when:now||Date.now()}; (t.watch=t.watch||[]).push(w); return w; };

/* ---------- ADR: put your re-recorded line where the original was ----------
   From ADR ALIGNMENT TOOL v1 (matching the loudness shape of the two). Not lip sync: check it by eye.
   samples: Float32Array (mono), sr. Envelope = loudness every 10 ms. */
F.HOP=0.01;
F.envelope=function(x,sr){ const hop=Math.max(1,Math.round(sr*F.HOP)), n=Math.floor(x.length/hop), e=new Float32Array(n);
 for(let i=0;i<n;i++){ let s=0; const o=i*hop; for(let j=0;j<hop;j++){ const v=x[o+j]; s+=v*v; } e[i]=Math.sqrt(s/hop); } return e; };
F.mono=function(chans){ const n=chans[0].length, m=new Float32Array(n); chans.forEach(c=>{ for(let i=0;i<n;i++) m[i]+=c[i]/chans.length; }); return m; };
/* ref: envelope of the clip's sound from clip time refStart; take: envelope of your take.
   Search take start times (clip seconds) from lo to hi. Returns {at, r} : where the take starts in the clip, and how well the shapes match (-1..1). */
F.alignTake=function(ref,refStart,take,lo,hi){
 let best={at:lo,r:-2}; const step=F.HOP;
 // only the voiced part of the take carries the shape; trim quiet ends so silence doesn't decide
 let mx=0; for(const v of take) mx=Math.max(mx,v); const th=mx*0.08; let a=0,b=take.length-1; while(a<b&&take[a]<th) a++; while(b>a&&take[b]<th) b--;
 const T=take.subarray(a,b+1), m=T.length; if(m<5||mx<1e-5) return {at:lo,r:0,quiet:true};
 let mt=0; for(const v of T) mt+=v; mt/=m; let nt=0; for(const v of T) nt+=(v-mt)*(v-mt); nt=Math.sqrt(nt);
 for(let at=lo; at<=hi+1e-9; at+=step){
  const o=Math.round((at-refStart)/step)+a; if(o<0||o+m>ref.length) continue;
  let mr=0; for(let i=0;i<m;i++) mr+=ref[o+i]; mr/=m; let num=0,nr=0; for(let i=0;i<m;i++){ const d=ref[o+i]-mr; num+=d*(T[i]-mt); nr+=d*d; }
  const r=num/(Math.sqrt(nr)*nt+1e-12); if(r>best.r) best={at:+at.toFixed(3),r};
 }
 if(best.r<-1) return {at:lo,r:0,none:true};
 best.r=+best.r.toFixed(3); return best;
};
F.matchWords=function(m){ if(!m) return 'Not lined up yet.'; if(m.quiet) return 'The take is nearly silent. Nothing to line up.'; if(m.none) return 'The take runs past the scene sound. Placed at the start of the line; nudge by ear.';
 return m.r>=0.8?'Lines up closely with the original. Check the lips.':m.r>=0.5?'Lines up roughly. Watch the lips and nudge.':'The shapes don\'t match well (different words or timing?). Nudge by ear.'; };

/* 16-bit mono WAV from samples. For the editor: your line, placed from the clip's start (silence before it). */
F.wav=function(x,sr){ const n=x.length, b=new ArrayBuffer(44+n*2), v=new DataView(b), w=(o,str)=>{ for(let i=0;i<str.length;i++) v.setUint8(o+i,str.charCodeAt(i)); };
 w(0,'RIFF'); v.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){ const c=Math.max(-1,Math.min(1,x[i])); v.setInt16(44+i*2,c<0?c*32768:c*32767,true); } return b; };
/* place a take at clip time `at` (seconds, may be negative = starts before the clip): returns samples from clip time 0 */
F.placeAt=function(take,sr,at){ const off=Math.round(at*sr); const n=Math.max(0,off+take.length), out=new Float32Array(n);
 for(let i=0;i<take.length;i++){ const j=off+i; if(j>=0) out[j]=take[i]; } return out; };

/* ---------- find a take: what you remember, against what you logged. Says why; no score. ----------
   takes: [{scene, heading, people:[names], name, note, mark, use, adr, at(ms|null), dur}] */
F.STOP=new Set('a an the in on of at to and or with one where take takes that this it its is was he she his her they them i me my we our for from by about clip shot'.split(' '));
F.WEEKDAYS=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
F.dayStart=t=>{ const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
F.parseFind=function(q,now){
 now=now||Date.now(); let s=' '+String(q||'').toLowerCase().replace(/[^a-z0-9' ]+/g,' ')+' '; const out={words:[],when:null,scene:null,flags:[]};
 const D=864e5, t0=F.dayStart(now), take=(re,fn)=>{ const m=s.match(re); if(m){ fn(m); s=s.replace(m[0],' '); } };
 take(/ (today|tonight) /,()=>{ out.when={from:t0,to:t0+D,say:'today'}; });
 take(/ yesterday /,()=>{ out.when={from:t0-D,to:t0,say:'yesterday'}; });
 take(/ this week /,()=>{ out.when={from:t0-6*D,to:t0+D,say:'in the last 7 days'}; });
 take(/ last week /,()=>{ out.when={from:t0-13*D,to:t0-6*D,say:'last week (7 to 13 days ago)'}; });
 take(/ (\d+) days? ago /,m=>{ const n=+m[1]; out.when={from:t0-n*D,to:t0-n*D+D,say:n+' day'+(n===1?'':'s')+' ago'}; });
 take(/ (last |on )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday) /,m=>{ const wd=F.WEEKDAYS.indexOf(m[2]); let back=(new Date(now).getDay()-wd+7)%7; if(back===0||m[1]==='last ') back+=back===0?7:0; const f=t0-back*D; out.when={from:f,to:f+D,say:'on '+m[2][0].toUpperCase()+m[2].slice(1)}; });
 take(/ scene (\d+) /,m=>{ out.scene=+m[1]; });
 take(/ never use /,()=>out.flags.push('never'));
 take(/ (gold|selects?) /,()=>out.flags.push('gold'));
 take(/ (backups?) /,()=>out.flags.push('backup'));
 take(/ (in the cut|picked|used) /,()=>out.flags.push('use'));
 take(/ (adr|re ?recorded|dubbed) /,()=>out.flags.push('adr'));
 out.words=s.split(/\s+/).filter(w=>w&&!F.STOP.has(w)&&(w.length>1||/\d/.test(w)));
 return out;
};
F.findTakes=function(q,takes,now){
 const P=F.parseFind(q,now), wordsOf=x=>String(x||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
 if(!P.words.length&&!P.when&&P.scene==null&&!P.flags.length) return {parsed:P,hits:[],partial:false};
 const ago=at=>{ const d=Math.round((F.dayStart(now||Date.now())-F.dayStart(at))/864e5); return d<=0?'today':d===1?'yesterday':d+' days ago'; };
 const score=t=>{ const why=[];
  if(P.scene!=null){ if(t.scene!==P.scene) return null; why.push('scene '+t.scene); }
  if(P.when){ if(!t.at||t.at<P.when.from||t.at>=P.when.to) return null; why.push('logged '+ago(t.at)); }
  for(const f of P.flags){ if(f==='gold'&&t.mark!=='gold') return null; if(f==='never'&&t.mark!=='never') return null; if(f==='backup'&&t.mark!=='backup') return null; if(f==='use'&&!t.use) return null; if(f==='adr'&&!t.adr) return null;
   why.push(f==='gold'?'marked gold':f==='never'?'marked never use':f==='backup'?'marked backup':f==='use'?'in the cut':'has your ADR line'); }
  let got=0; const fields=[['heading','in the heading',t.heading],['people','',(t.people||[]).join(' ')],['note','in your note',t.note],['name','in the file name',t.name]];
  for(const w of P.words){ let hit=null;
   for(const [k,say,val] of fields){ const ws=wordsOf(val); const ok=/^\d+$/.test(w)?ws.includes(w):ws.some(x=>x.startsWith(w)); if(ok){ hit=k==='people'?(t.people||[]).find(n=>wordsOf(n).some(x=>x.startsWith(w)))+' is in the scene':'"'+w+'" '+say; break; } }
   if(hit){ got++; why.push(hit); } }
  return {got,why};
 };
 const all=takes.map(t=>({take:t,r:score(t)})).filter(x=>x.r);
 const need=P.words.length;
 let hits=all.filter(x=>x.r.got===need), partial=false;
 if(!hits.length&&need>1){ const best=Math.max(0,...all.map(x=>x.r.got)); if(best>0){ hits=all.filter(x=>x.r.got===best); partial=true; } }
 if(!need&&!hits.length) hits=all;
 hits.sort((a,b)=>(a.take.scene-b.take.scene)||((b.take.at||0)-(a.take.at||0)));
 return {parsed:P,partial,hits:hits.map(x=>({take:x.take,why:x.r.why}))};
};


/* ---------- footage log: the spreadsheet you kept while shooting ----------
   FILE, SCENE, SHOT, LOCATION, DURATION, GOLD FOOTAGE, ACTION, NOTES (any order, any case, common other names).
   Rows come from shared/xlsx.js (cells {v,t,fmt}) or a CSV (plain strings). Nothing guessed: what you wrote
   stays as you wrote it; a duration or a gold mark that could be read two ways is said, not decided. */
F.LOGCOLS={file:['FILE','FILE NAME','FILENAME','CLIP','CLIP NAME','NAME'],scene:['SCENE','SC','SCN','SCENE #'],shot:['SHOT','SHOT TYPE','ANGLE'],loc:['LOCATION','LOC','WHERE','SET'],
 dur:['DURATION','DUR','LENGTH','TIME','RUNTIME'],gold:['GOLD FOOTAGE','GOLD','SELECT','SELECTS','CIRCLE','CIRCLED','GOOD','KEEP','PICK'],action:['ACTION','DESCRIPTION','WHAT','CONTENT'],notes:['NOTES','NOTE','COMMENTS','COMMENT']};
const cellV=c=>c==null?'':(typeof c==='object'&&'v' in c)?c.v:c;
const cellS=c=>{ const v=cellV(c); return v==null?'':String(v).trim(); };
/* what kind of time a number format is: 'hm' (h:mm, no seconds), 'hms', 'ms', or '' */
F.timeKind=function(fmt){ let f=String(fmt||'').toLowerCase().replace(/"[^"]*"/g,'').replace(/\[(?!h\]|m\]|s\])[^\]]*\]/g,'').replace(/\\./g,'');
 if(!f||/[dy]/.test(f.replace(/am\/pm|a\/p/g,''))) return ''; const h=/h/.test(f), s=/s/.test(f), m=/m/.test(f);
 return h&&m&&!s?'hm':h&&s?'hms':m&&s?'ms':''; };
/* -> {sec, note} ; note when the number could mean two things */
F.logDur=function(c){
 const v=cellV(c); if(v===''||v==null) return {sec:null};
 if(typeof v==='number'){
  const kind=typeof c==='object'?F.timeKind(c.fmt):'';
  if(kind==='hm'&&v<1){ const sec=Math.round(v*86400/60*100)/100; return {sec,note:'Typed as '+F.mmss(sec)+'. Excel saved it as hours and minutes; read as minutes and seconds.'}; }
  if((kind==='hms'||kind==='ms')&&v<1) return {sec:Math.round(v*86400*100)/100};
  if(v>0&&v<1){ const raw=v*86400; if(raw>=3600&&Math.round(raw)%60===0) return {sec:Math.round(raw/60*100)/100,note:'Excel saved this as hours and minutes; read as minutes and seconds.'}; return {sec:Math.round(raw*100)/100}; }
  return {sec:v};
 }
 const s=String(v).trim().replace(/^(\d+)'(\d+)"?$/,'$1:$2'); const p=s.split(':');
 if(p.length>1&&p.every(x=>x!==''&&isFinite(+x))){ const n=p.map(Number); const sec=n.length===2?n[0]*60+n[1]:n.length===3?n[0]*3600+n[1]*60+n[2]:null; return sec==null?{sec:null,note:'Could not read "'+s+'".'}:{sec,note:sec>=3600?'Over an hour. Check it.':undefined}; }
 const m=s.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|seconds?)?$/i); if(m) return {sec:+m[1]};
 const mm=s.match(/^(\d+)\s*m(?:in)?\s*(\d+)\s*s/i); if(mm) return {sec:+mm[1]*60+ +mm[2]};
 return {sec:null,note:'Could not read "'+s+'".'};
};
const GOLD_YES=new Set(['yes','y','x','gold','good','best','select','selected','keep','pick','circle','circled','1','true','✓','✔','*','**','***']);
const GOLD_NO=new Set(['no','n','0','false','bad','reject','nope','ng','no good','nogood','skip','cut']);
/* true / false / null (blank) / 'unsure' (anything else, kept as you wrote it) */
F.logGold=function(c){ const v=cellV(c); if(v===true) return true; if(v===false) return false; const s=String(v==null?'':v).trim().toLowerCase(); if(!s) return null; if(GOLD_YES.has(s)) return true; if(GOLD_NO.has(s)) return false; return 'unsure'; };
/* rows: [[cell]] -> {rows:[...], cols:{key:index}, header:n, missing:[keys], notes:[]} */
F.logRead=function(rows){
 rows=rows||[]; const norm=x=>cellS(x).toUpperCase().replace(/\s+/g,' ').replace(/[:.]$/,'');
 let hi=-1, cols={};
 for(let i=0;i<Math.min(rows.length,12);i++){ const r=rows[i]||[], c={};
  for(let j=0;j<r.length;j++){ const h=norm(r[j]); for(const k in F.LOGCOLS) if(c[k]==null&&F.LOGCOLS[k].includes(h)) c[k]=j; }
  if(c.file!=null&&Object.keys(c).length>=2){ hi=i; cols=c; break; } }
 if(hi<0) return {rows:[],cols:{},header:-1,missing:Object.keys(F.LOGCOLS),notes:['No FILE column found in the first rows. The log needs a header row with FILE (or CLIP) and SCENE.']};
 const out=[], g=(r,k)=>cols[k]==null?null:r[cols[k]];
 for(let i=hi+1;i<rows.length;i++){ const r=rows[i]||[]; if(!r.some(x=>cellS(x))) continue;
  const d=F.logDur(g(r,'dur')), gold=F.logGold(g(r,'gold'));
  out.push({row:i+1,file:cellS(g(r,'file')),scene:cellS(g(r,'scene')),shot:cellS(g(r,'shot')),loc:cellS(g(r,'loc')),dur:d.sec,durRaw:cellS(g(r,'dur')),durNote:d.note||'',gold,goldRaw:cellS(g(r,'gold')),action:cellS(g(r,'action')),notes:cellS(g(r,'notes'))}); }
 const notes=[], hm=out.filter(x=>/hours and minutes/.test(x.durNote)).length, un=out.filter(x=>x.gold==='unsure'), nofile=out.filter(x=>!x.file).length, bad=out.filter(x=>/Could not read|Over an hour/.test(x.durNote)).length;
 if(hm) notes.push(hm+' duration'+(hm===1?'':'s')+' typed like 1:08 Excel saved as 1 hour 8 minutes. Read as 1 min 8 s.');
 if(un.length) notes.push(un.length+' gold mark'+(un.length===1?'':'s')+' not clearly yes or no ('+[...new Set(un.map(x=>'"'+x.goldRaw+'"'))].slice(0,5).join(', ')+'). Left unmarked; you decide.');
 if(nofile) notes.push(nofile+' row'+(nofile===1?' has':'s have')+' no file name. Kept, but no file can be found for '+(nofile===1?'it':'them')+'.');
 if(bad) notes.push(bad+' duration'+(bad===1?'':'s')+' to check.');
 return {rows:out,cols,header:hi+1,missing:Object.keys(F.LOGCOLS).filter(k=>cols[k]==null),notes};
};
/* the scenes in the log, in the order they first appear */
F.logScenes=function(rows){ const L=[]; (rows||[]).forEach(r=>{ const k=r.scene||'(no scene)'; let s=L.find(x=>x.label===k); if(!s){ s={label:k,rows:0,gold:0,locs:[]}; L.push(s); } s.rows++; if(r.gold===true) s.gold++; if(r.loc&&!s.locs.includes(r.loc)) s.locs.push(r.loc); }); return L; };
/* no script? the log's scenes become the scene list (forced headings, so nothing is invented) */
F.logScript=function(rows,title){ return (title?'Title: '+title+'\n\n':'')+F.logScenes(rows).map(s=>'.SCENE '+s.label+(s.locs.length?' - '+s.locs.slice(0,2).join(' / '):'')+'\n').join('\n'); };
/* log scene label -> script scene number: SCENE <label> headings first, then the label's number */
F.logSceneMap=function(rows,scenes){ const map={}; F.logScenes(rows).forEach(s=>{
 const lab=s.label.toUpperCase(), byHead=(scenes||[]).find(sc=>new RegExp('^SCENE '+lab.replace(/[^A-Z0-9]/g,'.')+'(\\s|$)').test(String(sc.heading).toUpperCase()));
 const num=(lab.match(/^\d+/)||[])[0], byNum=num&&(scenes||[]).find(sc=>String(sc.n)===String(+num)||String(sc.num||'')===lab);
 map[s.label]=byHead?byHead.n:byNum?byNum.n:null; }); return map; };
/* rows -> takes per script scene. Gold yes = marked gold. Unsure and no stay unmarked. */
F.logTakes=function(rows,map,at){ const by={}, unplaced=[];
 (rows||[]).forEach(r=>{ const n=map[r.scene||'(no scene)']; if(n==null){ unplaced.push(r); return; }
  const note=[r.shot,r.loc,r.action,r.notes].filter(Boolean).join(' · ');
  (by[n]=by[n]||[]).push({name:r.file||'(row '+r.row+')',dur:r.dur||0,in:0,out:r.dur||0,use:false,note,mark:r.gold===true?'gold':undefined,log:{row:r.row,shot:r.shot,loc:r.loc,action:r.action,notes:r.notes,goldRaw:r.goldRaw,durRaw:r.durRaw,durNote:r.durNote},at:at||Date.now()}); });
 return {by,unplaced}; };
const csvq=v=>{ const s=String(v==null?'':v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
/* the log back out for an editor: what you wrote, durations in m:ss, and where each file was found */
F.logCsv=function(rows,found){ found=found||{}; const H=['FILE','FOUND AT','SCENE','SHOT','LOCATION','DURATION','GOLD FOOTAGE','ACTION','NOTES'];
 return H.join(',')+'\n'+(rows||[]).map(r=>[r.file,found[F.nameKey(r.file)]||'',r.scene,r.shot,r.loc,r.dur!=null?F.mmss(r.dur):r.durRaw,r.gold===true?'GOLD':r.gold===false?'no':r.goldRaw,r.action,r.notes].map(csvq).join(',')).join('\n')+'\n'; };


/* ---------- EDITOR PACK: the plan, what you got against it, and the sheets an editor opens ---------- */
/* every planned shot, scene by scene (scenes with no way picked have no shot list yet) */
F.planRows=function(scenes,stOf,me){ const R=[];
 (scenes||[]).forEach(sc=>{ const s=stOf(sc.n)||{}; if(!s.way){ R.push({n:sc.n,heading:sc.heading,none:true}); return; }
  F.shots(sc,s.way,me,s.ins).forEach((x,i)=>R.push({n:sc.n,heading:sc.heading,i:i+1,id:x.id,what:x.what,how:x.how,who:x.who,done:!!(s.done&&s.done[x.id])})); });
 return R; };
/* each planned shot with the takes logged to it; takes on no planned shot; shots with nothing */
F.coverage=function(rows,takes){ takes=takes||{}; const plan=rows.filter(r=>!r.none), known={};
 const C=plan.map(r=>{ known[r.n+'|'+r.id]=1; return Object.assign({},r,{takes:(takes[r.n]||[]).filter(t=>t.shot===r.id)}); });
 const extra=[]; Object.keys(takes).forEach(n=>(takes[n]||[]).forEach(t=>{ if(!t.shot||!known[n+'|'+t.shot]) extra.push(Object.assign({n:+n},{t})); }));
 return {rows:C,missing:C.filter(r=>!r.takes.length),extra,noPlan:rows.filter(r=>r.none)}; };
F.coverWords=function(cv){ const n=cv.rows.length, got=n-cv.missing.length, L=[];
 if(n) L.push(got+' of '+n+' planned shot'+(n===1?' has':'s have')+' a take.'); else L.push('No shot list yet.');
 if(cv.missing.length) L.push('Not shot: '+cv.missing.slice(0,6).map(r=>'Sc '+r.n+' '+r.what).join('; ')+(cv.missing.length>6?'; and '+(cv.missing.length-6)+' more':'')+'.');
 if(cv.extra.length) L.push(cv.extra.length+' take'+(cv.extra.length===1?' is':'s are')+' not on a planned shot.');
 if(cv.noPlan.length) L.push(cv.noPlan.length+' scene'+(cv.noPlan.length===1?' has':'s have')+' no shot list (pick a way in SCENES).');
 return L.join(' '); };
const cq=v=>{ const s=String(v==null?'':v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
const row=a=>a.map(cq).join(',');
F.slug=s=>String(s||'Film').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')||'Film';
F.planCsv=function(rows){ return row(['SCENE','HEADING','SHOT #','SHOT','WHO','HOW','DONE'])+'\n'+rows.map(r=>r.none?row([r.n,r.heading,'','(no shot list yet)','','','']):row([r.n,r.heading,r.i,r.what,r.who,r.how,r.done?'yes':''])).join('\n')+'\n'; };
const mk={gold:'GOLD',backup:'backup',never:'never use'};
F.gotCsv=function(cv,fps,title){ const H=['SCENE','SHOT #','SHOT','FILE','NAME FOR THE EDIT','DURATION','IN','OUT','MARK','NOTE','MOMENTS'], out=[row(H)], slug=F.slug(title);
 const one=(n,i,what,t,k)=>row([n,i||'',what,t?t.name:'NOT SHOT',t?slug+'_Sc'+n+(i?'_Sh'+i:'')+'_T'+k:'',t&&t.dur?F.mmss(t.dur):'',t?F.tc(t.in||0,fps):'',t?F.tc(t.out||0,fps):'',t?mk[t.mark]||'':'',t?t.note||'':'',t?F.watchNotes(t).map(w=>F.mmss(w.at)+' '+w.text).join('; '):'']);
 cv.rows.forEach(r=>{ if(!r.takes.length) out.push(one(r.n,r.i,r.what,null)); else r.takes.forEach((t,k)=>out.push(one(r.n,r.i,r.what,t,k+1))); });
 cv.extra.forEach((x,k)=>out.push(one(x.n,'','(not on the shot list)',x.t,k+1)));
 return out.join('\n')+'\n'; };
/* the day's clips in the order you shot them: the time on the file, then the name */
F.dayOrder=function(files){ return (files||[]).slice().sort((a,b)=>(a.lastModified||0)-(b.lastModified||0)||String(a.name).localeCompare(String(b.name),undefined,{numeric:true})); };
F.packReadme=function(o){ return [o.title+': editor pack','',
 'From '+(o.by||'the director')+', '+o.date+'.','',o.link?'The footage: '+o.link:'The footage: ask me for the link.','',
 'In here:','- '+o.slug+' editor brief.txt: scene by scene, how much freedom you have, what must stay, which take, backups, never-use takes, what is missing, when to ask me first.',
 '- '+o.slug+' plan.csv: the shot list before we shot.','- '+o.slug+' plan vs got.csv: every planned shot and the takes that cover it, NOT SHOT where there is none, my marks (GOLD, backup, never use), notes, and moments (time in the take, what happens).',
 '- '+o.slug+' cut.edl: my picks, in and out, in script order. Opens in Resolve, Premiere and Avid; it relinks by file name.','- '+o.slug+' cut.csv: the same picks as a list.','',
 o.cover,'',o.note?'From me: '+o.note:''].join('\n').replace(/\n+$/,'\n'); };
if(typeof module!=='undefined') module.exports=F;
g.FilmOS=F;
})(typeof window!=='undefined'?window:globalThis);
