/* THEACTORPAGE BACKLOT: the ground you already have. Your apartment, your ranch, a park. Pure; runs in Node for the tests.
   SPOTS      each place you can shoot: what it is, what it can pass for (your words), when the light works, noise, power,
              gear, whose it is and whether you can use it, what it takes to make it pass.
   ON HAND    props, vehicles, animals, wardrobe, people you can get.
   DRAWER     every script you keep here, scene by scene, against your spots. Counts only.
   GROUND     deal a start from what you have: spots, a thing, how many people, a time, a situation. Headings only; the words are yours.
   LIST       everything, as a list.
   Nothing here writes a line of your script. */
(function(g){
const B={};
B.KINDS=[['prop','Props'],['vehicle','Vehicles'],['animal','Animals'],['wardrobe','Wardrobe'],['person','People you can get'],['gear','Gear']];
B.LIGHT=[['morning','Morning'],['midday','Midday'],['afternoon','Afternoon'],['dusk','Dusk'],['night','Night']];
B.WHOSE=[['mine','Mine'],['friend','A friend\'s'],['public','Public'],['business','A business'],['other','Someone else\'s']];
B.PERM=[['yes','Yes, I can use it'],['asked','Asked, waiting'],['ask','Need to ask'],['no','No']];
B.GEAR=[['easy','Drive right up'],['carry','Carry it in'],['hard','Hard to get gear there']];
const STOP={THE:1,A:1,AN:1,OF:1,AND:1,AT:1,ON:1,IN:1,MY:1,OLD:0};
const words=s=>String(s||'').toUpperCase().replace(/'S\b/g,'').replace(/[^A-Z0-9 ]+/g,' ').split(/\s+/).filter(w=>w&&!STOP[w]).map(w=>w.length>3&&/[^S]S$/.test(w)?w.slice(0,-1):w);
B.words=words;
/* the place in a heading, without the sub-place: "OLD HOUSE - KITCHEN" -> ["OLD HOUSE","KITCHEN"], "HOUSE/PORCH" too */
B.placeParts=p=>String(p||'').split(/\s+[-–]\s+|\s*\/\s*/).map(x=>x.trim()).filter(Boolean);
/* does a spot cover this place? Every word of one inside the other: BARN fits OLD BARN, RED BARN fits BARN */
const fits=(a,b)=>{ const A=words(a), Bw=words(b); if(!A.length||!Bw.length) return false; const sa=new Set(A), sb=new Set(Bw); return A.every(w=>sb.has(w))||Bw.every(w=>sa.has(w)); };
B.spotFor=function(place,spots){
 const parts=B.placeParts(place); let best=null;
 (spots||[]).forEach(s=>{ const terms=[s.name].concat(s.passes||[]).filter(Boolean);
  terms.forEach((t,i)=>{ parts.forEach((p,j)=>{ if(fits(t,p)){ const rank=(j===0?0:2)+(i===0?0:1); if(!best||rank<best.rank) best={spot:s,as:t,part:p,rank,own:i===0}; } }); }); });
 return best;
};
const plural=(n,w,ws)=>n+' '+(n===1?w:(ws||w+'s'));
const TODN=t=>{ t=String(t||'').toUpperCase(); return /NIGHT|EVENING/.test(t)?'night':/DUSK|SUNSET|MAGIC/.test(t)?'dusk':/MORNING|DAWN|SUNRISE/.test(t)?'morning':/DAY|AFTERNOON|NOON/.test(t)?'day':''; };
B.people=onhand=>(onhand||[]).filter(x=>x.kind==='person').reduce((n,x)=>n+Math.max(1,+x.count||1),0);
/* one script against your ground. scenes: Story Studio's F.scenes output (n, heading, ie, place, tod, speakers, props) */
B.check=function(scenes,spots,onhand,F){
 const out={scenes:scenes.length,here:0,rows:[],parts:0,people:B.people(onhand),night:0,nightOff:0,props:[],have:[],missing:[],places:{}};
 const mine=(onhand||[]).filter(x=>x.kind!=='person').map(x=>x.name);
 (scenes||[]).forEach(sc=>{ const m=B.spotFor(sc.place,spots), tod=TODN(sc.tod), r={n:sc.n,heading:sc.heading,place:sc.place,spot:m?m.spot.name:'',as:m&&!m.own?m.as:'',flags:[]};
  if(m){ out.here++; const s=m.spot;
   if(sc.ie==='INT'&&s.ie==='out') r.flags.push('the scene is inside; you marked it outside');
   if(sc.ie==='EXT'&&s.ie==='in') r.flags.push('the scene is outside; you marked it inside');
   if(tod==='night'&&(s.light||[]).length&&!(s.light||[]).includes('night')) r.flags.push('a night scene; night isn\'t marked for this spot');
   if(s.perm==='no') r.flags.push('you marked it: no');
   if(s.perm==='ask'||s.perm==='asked') r.flags.push(s.perm==='ask'?'still need to ask':'asked, waiting'); }
  if(tod==='night'){ out.night++; if(!m) out.nightOff++; }
  const k=B.placeParts(sc.place)[0]||sc.place||'(no place)'; const pl=out.places[k]=out.places[k]||{place:k,scenes:[],spot:r.spot}; pl.scenes.push(sc.n);
  (sc.props||[]).forEach(p=>{ if(!out.props.includes(p)) out.props.push(p); });
  out.rows.push(r); });
 try{ out.parts=F&&F.parts?F.parts(scenes).filter(p=>!p.voice).length:0; }catch(e){}
 out.props.forEach(p=>{ (mine.some(n=>fits(n,p))?out.have:out.missing).push(p); });
 out.places=Object.values(out.places);
 return out;
};
B.checkWords=function(c){
 const L=[];
 if(!c.scenes) return ['No scenes read.'];
 L.push(c.here+' of '+plural(c.scenes,'scene')+' have a spot.');
 const noSpot=c.places.filter(p=>!p.spot); if(noSpot.length) L.push('No spot yet: '+noSpot.slice(0,6).map(p=>p.place+' ('+plural(p.scenes.length,'scene')+')').join(', ')+(noSpot.length>6?' and '+(noSpot.length-6)+' more':'')+'.');
 if(c.parts) L.push(plural(c.parts,'speaking part')+' on camera; '+(c.people?'you can get '+plural(c.people,'person','people')+'.':'no people on hand yet.'));
 if(c.night) L.push(plural(c.night,'night scene')+(c.nightOff?', '+c.nightOff+' with no spot':'')+'.');
 if(c.props.length) L.push('Props in the action: '+c.props.join(', ')+'.'+(c.have.length?' On hand: '+c.have.join(', ')+'.':''));
 const fl=c.rows.filter(r=>r.flags.length).length; if(fl) L.push(plural(fl,'scene')+' with something to look at.');
 return L;
};
/* the drawer: every script, most of it shootable on your ground first. Ties by title. */
B.drawer=function(scripts,spots,onhand,F){
 return (scripts||[]).map(s=>{ let sc=[]; try{ sc=F.scenes(s.text||''); }catch(e){} const c=B.check(sc,spots,onhand,F); return Object.assign({id:s.id,title:s.title||'Untitled',from:s.from||''},c); })
  .filter(x=>x.scenes).sort((a,b)=>(b.here/b.scenes)-(a.here/a.scenes)||b.here-a.here||a.title.localeCompare(b.title));
};

/* FROM THE GROUND: a start, dealt from what you have. Same pick, same seed: same deal. */
B.SITUATIONS=['someone is hiding something here','a debt comes due','someone shows up who shouldn\'t','two of them want the same thing','something is lost, and it\'s here',
 'a promise gets broken','someone has to be gone by dark','a stranger asks for help','the last time they\'re here together','someone waits, and nobody comes',
 'what was buried comes back up','one of them is lying about where they were','someone comes back after a long time','a secret gets out','they have to choose who stays'];
const rnd=seed=>{ let x=(seed>>>0)||1; return ()=>{ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; };
const pick=(L,r)=>L[Math.floor(r()*L.length)];
const HEAD={morning:'MORNING',midday:'DAY',afternoon:'DAY',dusk:'DUSK',night:'NIGHT'};
const SAYT={morning:'in the morning',midday:'at midday',afternoon:'in the afternoon',dusk:'at dusk',night:'at night'};
B.deal=function(ground,opts,seed){
 opts=opts||{}; const r=rnd(seed||1), spots=(ground.spots||[]).filter(s=>s.perm!=='no'), on=(ground.onhand||[]);
 if(!spots.length) return null;
 let use=(opts.spots||[]).map(id=>spots.find(s=>s.id===id)).filter(Boolean);
 if(!use.length){ const n=Math.min(spots.length,1+Math.floor(r()*Math.min(3,spots.length))), pool=spots.slice(); while(use.length<n){ use.push(pool.splice(Math.floor(r()*pool.length),1)[0]); } }
 const things=on.filter(x=>x.kind!=='person'&&x.kind!=='gear'), thing=opts.thing==='none'?null:opts.thing?on.find(x=>x.id===opts.thing):(things.length&&r()<0.8?pick(things,r):null);
 const have=B.people(on), people=Math.max(1,opts.people||(have?Math.min(have,1+Math.floor(r()*Math.min(3,have))):1+Math.floor(r()*2)));
 const ok=s=>(s.light&&s.light.length)?s.light:B.LIGHT.map(x=>x[0]);
 let time=opts.time&&opts.time!=='any'?opts.time:pick(ok(use[0]),r);
 const sit=opts.situation!=null&&B.SITUATIONS[opts.situation]?B.SITUATIONS[opts.situation]:pick(B.SITUATIONS,r);
 const heads=use.map(s=>{ const ie=s.ie==='in'?'INT.':s.ie==='out'?'EXT.':(r()<0.5?'INT.':'EXT.'); const t=(s.light&&s.light.length&&!s.light.includes(time))?pick(s.light,r):time; return ie+' '+String(s.name).toUpperCase()+' - '+HEAD[t]; });
 const names=use.map(s=>s.name), where=names.length===1?names[0]:names.slice(0,-1).join(', ')+' and '+names[names.length-1];
 const line=where+', '+SAYT[time]+': '+sit+'.'+(thing?' '+thing.name.charAt(0).toUpperCase()+thing.name.slice(1)+' matters.':'')+' '+(people===1?'One person.':people+' people.');
 const notes=use.filter(s=>s.takes).map(s=>s.name+': '+s.takes);
 return {spots:use.map(s=>s.id),names,thing:thing?thing.id:'',thingName:thing?thing.name:'',people,time,situation:sit,headings:heads,line,notes,seed:seed||1};
};
/* the hand-offs: headings and your line as a note, never dialogue */
B.fountain=function(d,title){ return 'Title: '+(title||'From the ground')+'\n\n[[From the ground: '+d.line+(d.notes.length?' What it takes: '+d.notes.join('; ')+'.':'')+' Yours to change.]]\n\n'+d.headings.join('\n\n')+'\n'; };

/* THE MAP: your pins, on this phone. No map service, nothing sent: the spots where you stood, north up, to scale.
   where: "38.84, -97.61" or a maps link (Story Studio's F.coords reads both). */
B.coords=function(s){ s=String(s||'').trim(); if(!s) return null; let m=s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)||s.match(/[?&](?:q|ll|query)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/), lat, lng;
 if(m){ lat=+m[1]; lng=+m[2]; } else { m=s.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?/i); if(!m) return null; lat=+m[1]; lng=+m[3]; if(m[2]&&/S/i.test(m[2])) lat=-Math.abs(lat); if(m[4]&&/W/i.test(m[4])) lng=-Math.abs(lng); }
 return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null; };
const R=6371008.8, rad=d=>d*Math.PI/180;
B.meters=function(a,b){ const dl=rad(b.lat-a.lat), dn=rad(b.lng-a.lng), x=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2; return 2*R*Math.asin(Math.min(1,Math.sqrt(x))); };
/* in feet under a tenth of a mile, else miles. Walking: 3 miles an hour, with gear call it slower, so we say "about". */
B.far=function(m){ const ft=m*3.28084; if(ft<528) return (ft<50?Math.round(ft/5)*5:Math.round(ft/10)*10)+' ft'; const mi=m/1609.344; return (mi<10?mi.toFixed(1):Math.round(mi))+' mi'; };
B.walk=function(m){ const min=m/80.47; if(min<1) return 'under a minute on foot'; if(min>90) return 'a drive'; return 'about '+Math.round(min)+' min on foot'; };
/* spots with pins, flat x/y in meters around the middle of them (north up) */
B.pins=function(spots){ const P=(spots||[]).map(s=>({s,c:B.coords(s.where)})).filter(x=>x.c); if(!P.length) return [];
 const lat0=P.reduce((a,x)=>a+x.c.lat,0)/P.length, lng0=P.reduce((a,x)=>a+x.c.lng,0)/P.length, k=Math.cos(rad(lat0));
 return P.map(x=>({id:x.s.id,name:x.s.name,lat:x.c.lat,lng:x.c.lng,x:rad(x.c.lng-lng0)*R*k,y:-rad(x.c.lat-lat0)*R})); };
/* groups: pins within a mile of another pin in the group. Your ground, and the town. */
B.groups=function(pins,limit){ limit=limit||1609; const g=pins.map((_,i)=>i), find=i=>g[i]===i?i:(g[i]=find(g[i]));
 for(let i=0;i<pins.length;i++) for(let j=i+1;j<pins.length;j++) if(B.meters(pins[i],pins[j])<=limit) g[find(i)]=find(j);
 const by={}; pins.forEach((p,i)=>{ (by[find(i)]=by[find(i)]||[]).push(p); }); return Object.values(by).sort((a,b)=>b.length-a.length||a[0].name.localeCompare(b[0].name)); };
B.nearest=function(pins,id){ const a=pins.find(p=>p.id===id); if(!a) return []; return pins.filter(p=>p.id!==id).map(p=>({id:p.id,name:p.name,m:B.meters(a,p)})).sort((x,y)=>x.m-y.m); };
/* a round of spots in walking order, nearest next, starting where you say */
B.route=function(pins,ids,start){ let left=ids.map(id=>pins.find(p=>p.id===id)).filter(Boolean); if(!left.length) return {stops:[],m:0};
 let cur=left.find(p=>p.id===start)||left[0], out=[cur], m=0; left=left.filter(p=>p!==cur);
 while(left.length){ left.sort((a,b)=>B.meters(cur,a)-B.meters(cur,b)); const n=left.shift(); m+=B.meters(cur,n); out.push(n); cur=n; }
 return {stops:out,m}; };
/* a nice round length for the scale bar, in feet or miles, about a quarter of the width */
B.scale=function(metersAcross){ const want=metersAcross/4, ft=want*3.28084; if(ft<2640){ const st=[10,25,50,100,250,500,1000,2000].reduce((a,b)=>Math.abs(b-ft)<Math.abs(a-ft)?b:a); return {m:st/3.28084,label:st+' ft'}; }
 const mi=want/1609.344, st=[0.5,1,2,5,10,20,50].reduce((a,b)=>Math.abs(b-mi)<Math.abs(a-mi)?b:a); return {m:st*1609.344,label:st+' mi'}; };

/* Story Studio's OWNED list is the one list (localStorage film_os_v1 .owned). Locations are spots; the rest is on hand.
   BACKLOT's own fields live on the same records: ie, when, power, gear, whose, perm, takes. 'plays' is what it can pass for. */
B.split=t=>String(t||'').split(/\s*[,;\n]\s*|\s+or\s+/i).map(x=>x.trim()).filter(Boolean);
B.fromOwned=function(owned){ const L=owned||[];
 return {spots:L.filter(o=>o.kind==='location').map(o=>({id:o.id,name:o.name||'Untitled spot',passes:B.split(o.plays),ie:o.ie||'',light:o.when||[],noise:o.sound||'',power:o.power||'',gear:o.gear||'',whose:o.whose||'',perm:o.perm||'',takes:o.takes||'',notes:o.notes||'',where:o.where||'',photos:(o.scout||[]).filter(x=>x.photo).map(x=>x.photo)})),
  onhand:L.filter(o=>o.kind!=='location').map(o=>({id:o.id,kind:o.kind,name:o.name||'',count:o.count||'',notes:o.notes||''}))}; };
/* THE LIST: every spot and every thing, as text, a line each. And a CSV. */
const lab=(L,k)=>(L.find(x=>x[0]===k)||[,''])[1];
B.spotLine=s=>[s.name,s.ie==='in'?'inside':s.ie==='out'?'outside':s.ie==='both'?'inside and out':'',(s.passes||[]).length?'passes for '+s.passes.join(', '):'',(s.light||[]).length?'light: '+s.light.join(', '):'',s.noise?'noise: '+s.noise:'',s.power==='yes'?'power':s.power==='no'?'no power':'',lab(B.GEAR,s.gear).toLowerCase(),lab(B.WHOSE,s.whose).toLowerCase(),s.perm?lab(B.PERM,s.perm).toLowerCase():'',s.takes?'to make it pass: '+s.takes:''].filter(Boolean).join(' · ');
B.listText=function(ground){
 const L=['SPOTS'].concat((ground.spots||[]).map(s=>'- '+B.spotLine(s)));
 B.KINDS.forEach(([k,l])=>{ const x=(ground.onhand||[]).filter(i=>i.kind===k); if(x.length){ L.push('',l.toUpperCase()); x.forEach(i=>L.push('- '+i.name+(k==='person'&&+i.count>1?' ('+i.count+')':'')+(i.notes?' · '+i.notes:''))); } });
 return L.join('\n')+'\n';
};
const q=v=>{ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; };
B.listCsv=function(ground){
 const R=[['type','name','inside/outside','passes for','light','noise','power','gear','whose','permission','what it takes','notes']];
 (ground.spots||[]).forEach(s=>R.push(['spot',s.name,s.ie||'',(s.passes||[]).join('; '),(s.light||[]).join('; '),s.noise||'',s.power||'',s.gear||'',s.whose||'',s.perm||'',s.takes||'',s.notes||'']));
 (ground.onhand||[]).forEach(i=>R.push([i.kind,i.name+(i.kind==='person'&&+i.count>1?' ('+i.count+')':''),'','','','','','','','','',i.notes||'']));
 return R.map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';
};
g.Backlot=B;
if(typeof module!=='undefined') module.exports=B;
})(typeof window!=='undefined'?window:globalThis);
