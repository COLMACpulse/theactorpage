/* STORY STUDIO · ON SET · TOOLS: the math, kept apart so it can be checked.
   Level: the phone's tilt sensor, read for a phone held like a camera (upright, either way round) or lying on the rig.
   Sun: where the sun is from a spot at a time, and where the shadows fall. Exposure: stops over or under, the ND to fix
   it. Focus: depth of field and hyperfocal. Delays: what held the day up. All plain math; nothing here guesses. */
(function(g){
const K={}, RAD=Math.PI/180, DEG=180/Math.PI;
const r1=x=>Math.round(x*10)/10;

/* ---------- LEVEL ----------
   deviceorientation gives beta (front-back) and gamma (left-right). Turned into which way is up, in the phone's own
   terms (x right, y toward the top, z out of the screen), it reads the same whichever way the phone is held. */
K.up=function(beta,gamma){ const b=(+beta||0)*RAD, c=(+gamma||0)*RAD; return [-Math.cos(b)*Math.sin(c), Math.sin(b), Math.cos(b)*Math.cos(c)]; };
K.level=function(u){
 const [x,y,z]=u, n=Math.hypot(x,y,z)||1, ux=x/n, uy=y/n, uz=z/n;
 if(Math.abs(uz)>0.82){ // lying flat, on top of the camera: top of the phone toward the lens
  return {flat:true, roll:r1(Math.atan2(-ux,Math.abs(uz))*DEG), pitch:r1(Math.asin(uy)*DEG), hold:uz>0?'flat, screen up':'flat, screen down'};
 }
 const th=Math.atan2(ux,uy)*DEG, k=Math.round(th/90)*90; let roll=th-k; if(roll>180) roll-=360; if(roll<-180) roll+=360;
 const hold={'0':'upright','90':'sideways','-90':'sideways','180':'upside down','-180':'upside down'}[String(k)];
 // the back camera looks out of the back: up is positive
 return {flat:false, roll:r1(-roll), pitch:r1(Math.asin(-uz)*DEG), hold, turn:k};
};
/* in words. roll > 0: the top of the frame leans right (turned clockwise) */
K.rollWord=function(roll,tol){ tol=tol==null?0.5:tol; const a=Math.abs(roll); return a<tol?'level':'top leans '+(roll>0?'right':'left')+' '+a.toFixed(1)+'°'; };
K.pitchWord=function(p,tol,flat){ tol=tol==null?0.5:tol; const a=Math.abs(p); if(a<tol) return flat?'level front to back':'looking straight ahead'; return flat?('front '+(p>0?'up ':'down ')+a.toFixed(1)+'°'):('looking '+(p>0?'up ':'down ')+a.toFixed(1)+'°'); };
/* matching a saved reading: how far off, in words */
K.match=function(now,want){ if(!want) return ''; const dr=r1(now.roll-want.roll), dp=r1(now.pitch-want.pitch);
 if(Math.abs(dr)<0.5&&Math.abs(dp)<0.5) return 'Matched.';
 const W=[]; if(Math.abs(dr)>=0.5) W.push('turn '+(dr>0?'left':'right')+' '+Math.abs(dr).toFixed(1)+'°');
 if(Math.abs(dp)>=0.5) W.push((dp>0?'tilt down ':'tilt up ')+Math.abs(dp).toFixed(1)+'°'); return 'To match: '+W.join(', ')+'.'; };
/* smoothing: the last few readings, averaged as directions (so it doesn't jump across 180) */
K.smooth=function(prev,u,a){ a=a==null?0.25:a; if(!prev) return u.slice(); return prev.map((p,i)=>p+(u[i]-p)*a); };

/* ---------- SUN ---------- */
function sunAt(jd){ // same formulas as film.js F.sun (NOAA)
 const T=(jd-2451545)/36525;
 const L0=((280.46646+T*(36000.76983+T*0.0003032))%360+360)%360, M=357.52911+T*(35999.05029-0.0001537*T), e=0.016708634-T*(0.000042037+0.0000001267*T);
 const C=Math.sin(M*RAD)*(1.914602-T*(0.004817+0.000014*T))+Math.sin(2*M*RAD)*(0.019993-0.000101*T)+Math.sin(3*M*RAD)*0.000289;
 const om=125.04-1934.136*T, app=L0+C-0.00569-0.00478*Math.sin(om*RAD);
 const obl=23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60+0.00256*Math.cos(om*RAD);
 const dec=Math.asin(Math.sin(obl*RAD)*Math.sin(app*RAD)), y=Math.pow(Math.tan(obl*RAD/2),2);
 const eq=4*DEG*(y*Math.sin(2*L0*RAD)-2*e*Math.sin(M*RAD)+4*e*y*Math.sin(M*RAD)*Math.cos(2*L0*RAD)-0.5*y*y*Math.sin(4*L0*RAD)-1.25*e*e*Math.sin(2*M*RAD));
 return {dec,eq}; }
/* az: degrees from north, clockwise. up: degrees above the horizon (with the usual bend of the air near it) */
K.sunPos=function(date,lat,lng){ if(!isFinite(lat)||!isFinite(lng)) return null;
 const t=new Date(date).getTime(), jd=t/864e5+2440587.5, s=sunAt(jd), phi=lat*RAD;
 const utcMin=((t%864e5)+864e5)%864e5/60000, tst=((utcMin+s.eq+4*lng)%1440+1440)%1440, ha=(tst/4-180)*RAD;
 const cz=Math.min(1,Math.max(-1,Math.sin(phi)*Math.sin(s.dec)+Math.cos(phi)*Math.cos(s.dec)*Math.cos(ha))), el=90-Math.acos(cz)*DEG;
 let az=(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(phi)-Math.tan(s.dec)*Math.cos(phi))*DEG+180+360)%360;
 const ref=el>-0.575?(el>85?0:el>5?(58.1/Math.tan(el*RAD)-0.07/Math.pow(Math.tan(el*RAD),3)+0.000086/Math.pow(Math.tan(el*RAD),5))/3600:(1735+el*(-518.2+el*(103.4+el*(-12.79+el*0.711))))/3600):(-20.774/Math.tan(el*RAD))/3600;
 return {az:r1(az), up:r1(el+ref)}; };
const POINTS=['north','northeast','east','southeast','south','southwest','west','northwest'];
K.compass=function(az){ return POINTS[Math.round((((az%360)+360)%360)/45)%8]; };
K.shadow=function(up){ return up>0.5?Math.round(1/Math.tan(up*RAD)*10)/10:null; };
K.sunWords=function(p){ if(!p) return '';
 if(p.up<=-0.833) return 'The sun is down ('+Math.abs(p.up).toFixed(0)+'° below the horizon).';
 const sh=K.shadow(p.up), sd=(p.az+180)%360;
 return 'Sun '+p.up.toFixed(0)+'° up, in the '+K.compass(p.az)+' ('+Math.round(p.az)+'°). '
  +(sh==null?'Shadows run long, almost flat.':'Shadows fall '+K.compass(sd)+', '+(sh>=10?'very long, ':'')+sh+' times as long as things are tall.'); };
/* which way to turn from where the phone points to face the sun */
K.toward=function(heading,az){ let d=((az-heading)%360+540)%360-180; return {d:Math.round(d),words:Math.abs(d)<5?'The sun is straight ahead.':'Turn '+(d>0?'right ':'left ')+Math.abs(Math.round(d))+'° to face the sun.'}; };

/* ---------- EXPOSURE ----------
   Right exposure: log2(N²/t) = EV100 + log2(ISO/100). Over by the difference. ND in stops; 0.3 density a stop. */
K.LIGHT=[['Full sun, clear sky',15],['Hazy sun, soft shadows',14],['Cloudy bright, no shadows',13],['Heavy overcast',12],['Open shade on a sunny day',12],['Sunset, golden hour',12],['Just after sunset',10],['Bright office or store',8],['Living room, lamps on',6],['Street at night, lit',5]];
K.STOPS=[1.2,1.4,1.8,2,2.8,3.5,4,5.6,8,11,16,22];
K.ISOS=[100,160,200,320,400,640,800,1250,1600,2500,3200,6400];
K.FPS=[23.976,24,25,29.97,30,48,50,59.94,60,120];
K.ANGLES=[360,270,180,172.8,144,90,45];
K.shutter=(fps,angle)=>(angle/360)/fps;
K.shutterWord=t=>t>=1?t.toFixed(1)+'s':'1/'+Math.round(1/t);
K.over=function(o){ return r1(o.ev+Math.log2(o.iso/100)-Math.log2(o.N*o.N/o.t)); };
K.nd=function(stops){ const n=Math.max(0,Math.round(stops)); return {stops:n, density:(n*0.3).toFixed(1), factor:Math.pow(2,n)}; };
K.exposure=function(o){ const s=K.over(o), W=[], out={stops:s};
 if(Math.abs(s)<1/3){ out.head='Right on.'; W.push('No ND needed.'); }
 else if(s>0){ const n=K.nd(s), left=r1(s-n.stops); out.nd=n;
  out.head=s.toFixed(1)+' stop'+(s===1?'':'s')+' too bright.';
  if(n.stops) W.push('ND '+n.density+' ('+n.stops+' stop'+(n.stops===1?'':'s')+', ND'+n.factor+').');
  if(Math.abs(left)>=1/3) W.push((n.stops?'Then '+(left>0?'close down':'open up'):(left>0?'Close down':'Open up'))+' '+Math.abs(left).toFixed(1)+' stop'+(Math.abs(left)===1?'':'s')+' on the iris.');
  const back=Math.min(Math.floor(s),Math.floor(Math.log2(o.iso/100)+0.01));
  if(back>=1) W.push('Or drop the ISO first: '+Math.round(o.iso/Math.pow(2,back))+' takes back '+back+' stop'+(back===1?'':'s')+'.'); }
 else { const need=Math.round(o.iso*Math.pow(2,-s)); out.head=Math.abs(s).toFixed(1)+' stop'+(Math.abs(s)===1?'':'s')+' too dark.';
  W.push('Open up '+Math.abs(s).toFixed(1)+' stops, add light, or go to ISO '+need+'.'); }
 out.words=W; return out; };

/* ---------- FOCUS ---------- circle of confusion by sensor, in mm */
K.SENSORS=[['Full frame',0.030],['Super 35',0.025],['APS-C',0.020],['Micro Four Thirds',0.015],['1-inch',0.011]];
K.dof=function(o){ const f=+o.f, N=+o.N, c=+o.c, s=+o.s*1000; if(!(f>0&&N>0&&c>0&&s>0)) return null;
 const H=f*f/(N*c)+f, near=s*(H-f)/(H+s-2*f), far=s<H?s*(H-f)/(H-s):Infinity;
 return {H:H/1000, near:near/1000, far:far/1000, deep:far===Infinity?Infinity:(far-near)/1000}; };
K.len=function(m,unit){ if(m===Infinity) return 'infinity';
 if(unit==='m') return m<1?Math.round(m*100)+' cm':(Math.round(m*100)/100)+' m';
 const inch=Math.round(m/0.0254), ft=Math.floor(inch/12), i=inch%12; return ft?ft+' ft'+(i?' '+i+' in':''):i+' in'; };
K.dofWords=function(d,unit){ if(!d) return '';
 const W=['Sharp from '+K.len(d.near,unit)+' to '+K.len(d.far,unit)+(d.deep===Infinity?'.':' ('+K.len(d.deep,unit)+' deep).')];
 W.push('Hyperfocal '+K.len(d.H,unit)+': focus there, and everything from '+K.len(d.H/2,unit)+' to infinity is sharp.'); return W; };

/* ---------- DELAYS ---------- */
K.WHY=[['sound','Sound (plane, traffic, noise)'],['light','Light or sun'],['cast','Waiting on cast'],['gear','Gear'],['place','The place (permit, owner, people)'],['weather','Weather'],['reset','Reset (props, wardrobe, makeup)'],['other','Other']];
K.whyWord=k=>((K.WHY.find(w=>w[0]===k)||[k,k])[1]).replace(/ \(.*$/,'');
K.mins=d=>Math.max(0,Math.round(((d.end||Date.now())-d.at)/60000));
K.delayLines=function(D,clock){ D=(D||[]).filter(d=>d.end); if(!D.length) return [];
 const tot=D.reduce((a,d)=>a+K.mins(d),0), L=['DELAYS · '+D.length+', '+tot+' minute'+(tot===1?'':'s')+' lost'];
 D.forEach(d=>L.push('  '+(clock?clock(d.at)+' ':'')+K.whyWord(d.why)+', '+K.mins(d)+' min'+(d.note?': '+d.note:'')));
 return L; };


/* ---------- LEVEL ZERO (from CINEKNIFE): the phone is never perfectly square on a rig. Zero it on a known-level
   camera, and readings are from there. Kept apart for upright and flat. */
K.zeroed=function(r,z){ if(!z||!!z.flat!==!!r.flat) return r; return Object.assign({},r,{roll:r1(r.roll-z.roll),pitch:r1(r.pitch-z.pitch),zeroed:true}); };

/* ---------- FRAME ---------- */
K.ASPECTS=[['2.39','2.39'],['2','2:1'],['1.85','1.85'],['1.778','16:9'],['1.333','4:3'],['1','1:1'],['0.5625','9:16']];
/* the frame inside a picture w x h: letterbox or pillarbox */
K.frameIn=function(w,h,a){ if(!(w>0&&h>0&&a>0)) return null; if(w/h>a){ const fw=h*a; return {x:(w-fw)/2,y:0,w:fw,h}; } const fh=w/a; return {x:0,y:(h-fh)/2,w,h:fh}; };

/* ---------- LIGHT: two spots in the same picture ----------
   The phone keeps changing its own exposure, so it can't give an f-stop. Inside one frame, both spots got the same
   exposure, so the difference between them is real: that's the lighting ratio. Pixel values are undone from sRGB first. */
K.lin=v=>{ v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); };
K.luma=(r,g,b)=>0.2126*K.lin(r)+0.7152*K.lin(g)+0.0722*K.lin(b);
K.spot=function(px,w,h,cx,cy,rad){ rad=rad||4; let n=0,Y=0,mx=0,mn=255; const x0=Math.max(0,Math.round(cx)-rad), x1=Math.min(w-1,Math.round(cx)+rad), y0=Math.max(0,Math.round(cy)-rad), y1=Math.min(h-1,Math.round(cy)+rad);
 for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const i=(y*w+x)*4, r=px[i],gg=px[i+1],b=px[i+2]; Y+=K.luma(r,gg,b); n++; mx=Math.max(mx,r,gg,b); mn=Math.min(mn,Math.max(r,gg,b)); }
 return n?{Y:Y/n,max:mx,min:mn,clip:mx>=250,dark:Y/n<0.0015}:null; };
K.ratio=function(a,b){ if(!a||!b) return null; const W=[]; const out={};
 if(a.dark||b.dark){ out.words='Too dark to read '+(a.dark&&b.dark?'either spot':a.dark?'spot A':'spot B')+'. Give it more light, or it\'s just black.'; return out; }
 const st=Math.log2(a.Y/b.Y); out.stops=r1(st); out.ratio=Math.round(Math.pow(2,Math.abs(st))*10)/10;
 const hi=st>=0?'A':'B'; out.words=Math.abs(st)<0.2?'A and B are the same.':hi+' is '+Math.abs(out.stops).toFixed(1)+' stop'+(Math.abs(out.stops)===1?'':'s')+' brighter. About '+out.ratio+':1.';
 if(a.clip||b.clip) W.push((a.clip&&b.clip?'Both spots are':(a.clip?'A is':'B is'))+' blown out, so the real difference is bigger than this.');
 out.warn=W; return out; };
K.clipped=function(px){ let n=0,c=0; for(let i=0;i<px.length;i+=16){ n++; if(px[i]>=250&&px[i+1]>=250&&px[i+2]>=250) c++; } return n?Math.round(c/n*100):0; };

/* ---------- SOUND: dBFS (how loud against the phone's own top), not SPL. From CINEKNIFE: the phone's own cleanup
   (echo cancel, noise suppression, auto gain) is switched off, or room tone would be measured after it was "fixed". */
K.rms=function(buf){ let s=0; for(let i=0;i<buf.length;i++) s+=buf[i]*buf[i]; return Math.sqrt(s/(buf.length||1)); };
K.dbfs=rms=>rms>0?r1(20*Math.log10(rms)):-Infinity;
K.dbWord=d=>d===-Infinity||d<-120?'silent':d.toFixed(0)+' dBFS';
/* a steady hum: the strongest low tone that stands well clear of everything around it */
K.hum=function(db,rate,size){ const bin=rate/size, lo=Math.max(1,Math.floor(40/bin)), hi=Math.min(db.length-2,Math.ceil(500/bin)), ref=[];
 for(let i=lo;i<Math.min(db.length,Math.ceil(2000/bin));i++) if(isFinite(db[i])) ref.push(db[i]);
 if(!ref.length) return null; ref.sort((a,b)=>a-b); const med=ref[Math.floor(ref.length/2)];
 let k=-1; for(let i=lo;i<=hi;i++) if(isFinite(db[i])&&(k<0||db[i]>db[k])) k=i;
 if(k<0||db[k]-med<20||db[k]<db[k-1]||db[k]<db[k+1]) return null;
 const a=db[k-1],b=db[k],c=db[k+1], d=(a-2*b+c)?0.5*(a-c)/(a-2*b+c):0, hz=Math.round((k+d)*bin);
 return {hz,over:Math.round(db[k]-med)}; };
K.humWords=function(h){ if(!h) return 'No steady hum.';
 const mains=[50,60].find(m=>[1,2,3].some(n=>Math.abs(h.hz-m*n)<=2));
 return 'A steady hum at '+h.hz+' Hz, '+h.over+' dB over the rest.'+(mains?' That\'s the '+mains+' Hz power frequency'+(h.hz>mains+2?' (a multiple of it)':'')+': lights, a fridge, a cable, a dimmer.':''); };
K.toneWords=function(t,prev){ const W=[t.secs+' s of room tone, average '+K.dbWord(t.avg)+', loudest '+K.dbWord(t.peak)+'.'];
 if(prev&&isFinite(prev.avg)&&isFinite(t.avg)){ const d=Math.round(t.avg-prev.avg); W.push(Math.abs(d)<2?'About the same as the last one'+(prev.where?' ('+prev.where+')':'')+'.':Math.abs(d)+' dB '+(d>0?'louder':'quieter')+' than the last one'+(prev.where?' ('+prev.where+')':'')+'.'); }
 if(t.hum) W.push('Hum at '+t.hum+' Hz.'); return W; };
K.toneLines=function(T,clock){ T=T||[]; if(!T.length) return []; const L=['ROOM TONE · '+T.length];
 T.forEach(t=>L.push('  '+(clock?clock(t.at)+' ':'')+(t.where?t.where+', ':'')+t.secs+' s, average '+K.dbWord(t.avg)+(t.hum?', hum at '+t.hum+' Hz':''))); return L; };


/* ---------- CHECK THE TOOLS (from CINEKNIFE's gauntlet): readings from this phone next to readings from a real
   instrument. 30 pairs or it won't say either way. Targets are yours to set; these start where CINEKNIFE set them.
   Light and sound are checked as differences (two spots, two rooms), because that's what they measure. */
K.CHECKS=[['level','Level','°','A real level or inclinometer',{mae:1,p95:2}],['compass','Compass','°','A real compass',{mae:5,p95:10}],
 ['light','Light ratio','stops','A light meter, the same two spots',{mae:0.5,p95:1}],['sound','Room change','dB','A sound meter, the same two rooms',{mae:3,p95:5}]];
K.check=id=>K.CHECKS.find(c=>c[0]===id)||null;
K.MIN=30;
K.err=function(inst,ref,obs){ if(inst==='compass'){ return Math.abs(((obs-ref)%360+540)%360-180); } return Math.abs(obs-ref); };
K.signed=function(inst,ref,obs){ if(inst==='compass') return ((obs-ref)%360+540)%360-180; return obs-ref; };
/* fails closed: a bad row is refused with the reason, nothing half-read */
K.checkRow=function(r){ if(!r||typeof r!=='object') throw Error('A row isn\'t a reading.');
 const c=K.check(r.instrument); if(!c) throw Error('Unknown tool: '+r.instrument+'. Use level, compass, light or sound.');
 if(typeof r.device!=='string'||!r.device.trim()) throw Error('Every reading needs the phone it came from.');
 const ref=+r.reference, obs=+r.observed; if(r.reference===''||r.observed===''||!isFinite(ref)||!isFinite(obs)) throw Error('Every reading needs two numbers: the real one and the phone\'s.');
 const u=r.unit==null?c[2]:String(r.unit), want={'°':['°','deg'],stops:['stops','EV','ev'],dB:['dB','db']}[c[2]];
 if(want.indexOf(u)<0) throw Error(c[1]+' is in '+c[2]+', not '+u+'.'+(c[0]==='sound'?' Phone dBFS and a sound meter\'s dB SPL can\'t be compared directly: compare the change between two rooms.':''));
 return {instrument:c[0],device:r.device.trim(),unit:c[2],reference:ref,observed:obs,note:r.note||'',at:r.at||0}; };
K.evaluate=function(rows,targets){ const G={};
 (rows||[]).forEach(r=>{ const k=r.device+'|'+r.instrument; (G[k]=G[k]||{device:r.device,instrument:r.instrument,rows:[]}).rows.push(r); });
 return Object.values(G).map(g=>{ const c=K.check(g.instrument), t=(targets&&targets[g.instrument])||c[4], e=g.rows.map(r=>K.err(g.instrument,r.reference,r.observed)).sort((a,b)=>a-b);
  const n=e.length, mae=e.reduce((a,b)=>a+b,0)/n, p95=e[Math.ceil(0.95*n)-1], bias=g.rows.reduce((a,r)=>a+K.signed(g.instrument,r.reference,r.observed),0)/n;
  const status=n<K.MIN?'NOT ENOUGH':(mae<=t.mae&&p95<=t.p95?'PASS':'FAIL');
  return {device:g.device,instrument:g.instrument,name:c[1],unit:c[2],count:n,mae:Math.round(mae*100)/100,p95:Math.round(p95*100)/100,max:Math.round(e[n-1]*100)/100,bias:Math.round(bias*100)/100,target:t,status}; }); };
K.checkWords=function(v){ const u=v.unit==='°'?'°':' '+v.unit, f=x=>x+(v.unit==='°'?'°':' '+v.unit);
 const W=[v.count+' reading'+(v.count===1?'':'s')+(v.count<K.MIN?' of the '+K.MIN+' it needs':'')+'.'];
 if(v.count) W.push('Off by '+f(v.mae)+' on average; 95 in 100 within '+f(v.p95)+'; worst '+f(v.max)+'.');
 if(v.count>=5&&Math.abs(v.bias)>=Math.max(0.2,v.target.mae/2)) W.push('It reads '+f(Math.abs(v.bias))+' '+(v.bias>0?'high':'low')+' on average'+(v.instrument==='level'?': ZERO ON THE RIG takes that out.':'.'));
 W.push('Target: '+f(v.target.mae)+' on average, '+f(v.target.p95)+' for 95 in 100.'); return W; };
K.checkCsv=function(rows){ const q=x=>/[",\n]/.test(String(x))?'"'+String(x).replace(/"/g,'""')+'"':String(x);
 return 'instrument,device,unit,reference,observed,note,when\n'+(rows||[]).map(r=>[r.instrument,r.device,r.unit,r.reference,r.observed,r.note||'',r.at?new Date(r.at).toISOString():''].map(q).join(',')).join('\n')+'\n'; };
K.checkJson=rows=>JSON.stringify((rows||[]).map(r=>({instrument:r.instrument,device:r.device,unit:r.unit==='°'?'deg':r.unit==='stops'?'EV':r.unit,reference:r.reference,observed:r.observed})),null,1);
/* bring readings in: this app's CSV, or CINEKNIFE's JSON (incline -> level, light EV -> stops; audio refused: dBFS vs SPL) */
K.checkImport=function(text){ text=String(text||'').trim(); let rows;
 if(/^\[/.test(text)){ let a; try{ a=JSON.parse(text); }catch(e){ throw Error('That JSON couldn\'t be read.'); } if(!Array.isArray(a)) throw Error('Expected a list of readings.');
  rows=a.map(r=>Object.assign({},r,{instrument:r&&r.instrument==='incline'?'level':r&&r.instrument==='audio'?'sound':r&&r.instrument,unit:r&&(r.unit==='deg'?'°':r.unit)})); }
 else { const L=text.split(/\r?\n/).filter(Boolean), h=(L.shift()||'').toLowerCase().split(',').map(x=>x.trim()); const ix=n=>h.indexOf(n);
  if(ix('instrument')<0||ix('reference')<0||ix('observed')<0) throw Error('The first line needs instrument, device, reference and observed.');
  rows=L.map(l=>{ const c=[]; let cur='',q=false; for(let i=0;i<l.length;i++){ const ch=l[i]; if(q){ if(ch==='"'&&l[i+1]==='"'){ cur+='"'; i++; } else if(ch==='"') q=false; else cur+=ch; } else if(ch==='"') q=true; else if(ch===','){ c.push(cur); cur=''; } else cur+=ch; } c.push(cur);
   const g=n=>ix(n)>=0?c[ix(n)]:undefined; return {instrument:g('instrument'),device:g('device'),unit:g('unit')||undefined,reference:g('reference'),observed:g('observed'),note:g('note')||'',at:g('when')?Date.parse(g('when'))||0:0}; }); }
 return rows.map((r,i)=>{ try{ if(r&&r.instrument==='sound'&&r.unit==='dB'&&r.kind==='spl') throw Error(''); return K.checkRow(r); }catch(e){ throw Error('Reading '+(i+1)+': '+e.message); } }); };

if(typeof module!=='undefined') module.exports=K;
g.FieldKit=K;
})(typeof window!=='undefined'?window:globalThis);
