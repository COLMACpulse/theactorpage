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
const SLUG=/^\s*(INT|EXT|I\/E|INT\.?\/EXT)[\.\s]/i;
const TODS=['DAY','NIGHT','DAWN','DUSK','MORNING','EVENING','AFTERNOON','SUNSET','SUNRISE','CONTINUOUS','LATER','MOMENTS LATER','SAME'];

/* Scene numbers hang off both margins of a heading in a real script:
   "1     EXT. COUNTY ROAD BUS SHELTER - NIGHT      1". */
F.prep=function(text){
 return String(text||'').replace(/\r/g,'')
  .replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
  .split('\n').map(l=>{
   const m=l.match(/^\s*\d+[A-Z]?\.?\s+((?:INT|EXT|I\/E)[.\s].*?)(?:\s+\d+[A-Z]?\.?)?\s*$/i);
   return m?m[1]:l;
  }).join('\n');
};

F.heading=function(h){
 const t=String(h||'').trim().replace(/\s+/g,' ');
 const m=t.match(/^(INT\.?\/EXT\.?|I\/E\.?|INT\.?|EXT\.?)\s*(.*)$/i);
 const ie=m?m[1].toUpperCase().replace(/\.$/,'').replace('INT/EXT','I/E').replace('INT./EXT','I/E'):'';
 const parts=(m?m[2]:t).split(/\s+[-–—]\s+/).map(s=>s.trim()).filter(Boolean);
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
  if(SLUG.test(l)){ if(cur.heading||cur.lines.some(x=>x.trim())) chunks.push(cur); cur={heading:l.trim(),lines:[]}; }
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
 return (owned||[]).filter(o=>o.kind!=='location').filter(o=>{
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
  L.push('  Use:'+(use.length?'':' no take picked yet.')); use.forEach(t=>L.push('   - '+t.name+'  '+tcr(t)));
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

if(typeof module!=='undefined') module.exports=F;
g.FilmOS=F;
})(typeof window!=='undefined'?window:globalThis);
