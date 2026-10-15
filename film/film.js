/* FILM OS engine. One person makes the whole scene.
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
].map(r=>({kind:r[0],name:r[1],notes:r[2],plays:''}));

if(typeof module!=='undefined') module.exports=F;
g.FilmOS=F;
})(typeof window!=='undefined'?window:globalThis);
