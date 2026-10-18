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

if(typeof module!=='undefined') module.exports=K;
g.FieldKit=K;
})(typeof window!=='undefined'?window:globalThis);
