/* THEACTORPAGE HEADSHOTS: your headshots, in your own words, and a shoot that's planned.
   Mined from HEADSHOT v1 to v4.2 (Col's own): tag each photo with the roles it's for and keep / retest / retire;
   coverage in plain words; a photo check; before / after tests; a photographer brief and shot sheet.
   Rules: nothing here says what your face is "for", rates your looks, guesses your type or predicts a booking.
   Every call is a measurement of the photo (light, sharpness, size) or a label you gave it.
   Plan in localStorage theactorpage_headshots_v1; reference photos in IndexedDB theactorpage_headshot_refs;
   your headshots stay where they are (shared/you.js). Nothing uploaded. */
(function(g){
const H={}, KEY='theactorpage_headshots_v1';
/* starting words for roles; yours to change, add to or ignore */
H.SUGGEST=['Law enforcement','Authority','Working class','Professional','Everyday','Comedy','Dark / villain','Family / parent','Military','Western / period','Romantic','Action','Commercial'];
H.STATUS=[['keeper','Keep'],['retest','Retest'],['retire','Retire']];
const blank=()=>({called:[],want:[],brief:{objective:'',wardrobe:'',light:'',framing:'',boundaries:'',notes:'',shots:'',roles:true},tests:[],refs:[]});
H.plan=function(){ try{ const d=JSON.parse((g.localStorage&&g.localStorage.getItem(KEY))||'null'); if(d) return Object.assign(blank(),d,{brief:Object.assign(blank().brief,d.brief||{})}); }catch(e){} return blank(); };
H.save=function(p){ try{ g.localStorage.setItem(KEY,JSON.stringify(p)); return true; }catch(e){ return false; } };
const same=(a,b)=>String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase();

/* ---------- the photo check ----------
   A headshot is framed with you in the middle. So it measures you (the middle of the frame, upper two thirds)
   apart from the background (the side strips and the top), not the whole frame: a dark backdrop with your face
   lit is a look, not a dark face. rgba: Uint8ClampedArray, w x h (downsized is fine); ow x oh: the original size. */
const luma=(a,i)=>0.2126*a[i]+0.7152*a[i+1]+0.0722*a[i+2];
H.measure=function(rgba,w,h,ow,oh){
 const inSub=(x,y)=>x>w*0.25&&x<w*0.75&&y>h*0.12&&y<h*0.62, inBg=(x,y)=>(x<w*0.12||x>w*0.88)&&y<h*0.6||y<h*0.06;
 let b=0,bn=0; const gy=new Float32Array(w*h);
 for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const k=y*w+x, v=luma(rgba,k*4); gy[k]=v; if(!inSub(x,y)&&inBg(x,y)){ b+=v; bn++; } }
 const B=b/Math.max(1,bn);
 // you = the middle of the frame minus the bits of backdrop showing round your head
 let s=0,sn=0,clip=0,crush=0,all=0,alln=0;
 for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(!inSub(x,y)) continue; const v=gy[y*w+x]; all+=v; alln++; if(Math.abs(v-B)>18){ s+=v; sn++; if(v>=250) clip++; if(v<=12) crush++; } }
 if(sn<alln*0.3){ s=all; sn=alln; clip=0; crush=0; for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(!inSub(x,y)) continue; const v=gy[y*w+x]; if(v>=250) clip++; if(v<=12) crush++; } }
 let d=0,dn=0; for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ if(!inSub(x,y)) continue; const k=y*w+x; d+=Math.abs(4*gy[k]-gy[k-1]-gy[k+1]-gy[k-w]-gy[k+w]); dn++; }
 const r=x=>Math.round(x*10)/10;
 return {you:r(s/Math.max(1,sn)),background:r(B),clipped:r(100*clip/Math.max(1,sn)),crushed:r(100*crush/Math.max(1,sn)),detail:r(d/Math.max(1,dn)),ow:ow||w,oh:oh||h};
};
H.SOFT=3; H.SMALL=800;
H.words=function(m){
 const L=[], add=(ok,t)=>L.push({ok,t});
 if(m.you<85) add(false,'You read dark: '+Math.round(m.you)+' of 255 in the middle of the frame. More light on your face, or open up the exposure.');
 else if(m.you>215||m.clipped>6) add(false,'Bright on you: detail is washing out'+(m.clipped>6?' ('+Math.round(m.clipped)+'% of the middle is pure white)':'')+'. Bring the light down or back it off.');
 if(m.background-m.you>25) add(false,'The background is brighter than you ('+Math.round(m.background)+' against '+Math.round(m.you)+'). The eye goes to the wall first.');
 else if(m.background<60&&m.you-m.background>60&&m.you>=85) add(true,'Dark background, you lit: the moody look. Fine if that\'s the plan.');
 if(m.crushed>15&&m.you>=85) add(false,'Deep shadow on part of you ('+Math.round(m.crushed)+'% of the middle is near black). Check that both eyes read.');
 if(m.detail<H.SOFT) add(false,'Looks soft in the middle of the frame. Check focus on the eyes at full size.');
 const sh=Math.min(m.ow,m.oh); if(sh<H.SMALL) add(false,'Small: '+m.ow+' × '+m.oh+'. Fine as a thumbnail; soft when shown big or printed. Keep the original file.');
 if(!L.some(x=>!x.ok)) add(true,'Light, focus and size look fine. Only you can say if it looks like you on a good day.');
 return L;
};

/* ---------- coverage, in plain words ---------- */
/* want: roles you want to be seen for; photos: your headshots with roles + status. -> [{role, keepers:[photo], retest:[photo]}] */
H.coverage=function(want,photos){
 return (want||[]).map(role=>({role,keepers:(photos||[]).filter(p=>p.status==='keeper'&&(p.roles||[]).some(r=>same(r,role))),retest:(photos||[]).filter(p=>p.status==='retest'&&(p.roles||[]).some(r=>same(r,role)))}));
};
H.coverWords=function(c){ return c.keepers.length?c.role+': covered ('+c.keepers.map(p=>p.name.replace(/\.[a-z0-9]+$/i,'')).join(', ')+').':c.role+': no keeper yet'+(c.retest.length?' ('+c.retest.length+' to retest)':'')+'.'; };
/* every role word you've used, so the chips offer them again */
H.vocab=function(photos,plan){ const out=[]; const add=r=>{ r=String(r||'').trim(); if(r&&!out.some(x=>same(x,r))) out.push(r); };
 (plan&&plan.want||[]).forEach(add); (plan&&plan.called||[]).forEach(add); (photos||[]).forEach(p=>(p.roles||[]).forEach(add)); H.SUGGEST.forEach(add); return out; };

/* ---------- before / after ---------- */
H.addTest=function(p,t){ p.tests.push(Object.assign({id:'t'+Date.now().toString(36),date:new Date().toISOString().slice(0,10),change:'',hypothesis:'',before:'',after:'',verdict:'',why:''},t)); return p; };
H.VERDICTS=[['','Not tested'],['worked','It worked'],['unclear','Can\'t tell'],['didnt','It didn\'t']];

/* ---------- reference photos (other people's: lighting, wardrobe, mood) ---------- */
let dbp=null;
function db(){ if(dbp) return dbp; dbp=new Promise(res=>{ try{ const r=indexedDB.open('theactorpage_headshot_refs',1); r.onupgradeneeded=()=>r.result.createObjectStore('refs'); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null); }catch(e){ res(null); } }); return dbp; }
const op=async(mode,fn)=>{ const d=await db(); if(!d) return null; return new Promise(res=>{ try{ const t=d.transaction('refs',mode), r=fn(t.objectStore('refs')); t.oncomplete=()=>res(r&&r.result!==undefined?r.result:true); t.onerror=()=>res(null); }catch(e){ res(null); } }); };
H.putRef=(id,blob)=>op('readwrite',st=>st.put(blob,id));
H.getRef=id=>op('readonly',st=>st.get(id));
H.delRef=id=>op('readwrite',st=>st.delete(id));

/* ---------- the photographer brief and the shot sheet: standalone pages, no account, print to PDF ---------- */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body)=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'
 +'body{font:16px/1.5 Georgia,serif;color:#1d1a15;background:#fff;max-width:760px;margin:32px auto;padding:0 18px}h1{font:600 26px system-ui,sans-serif;margin:0 0 4px}h2{font:600 13px system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6b6457;margin:26px 0 6px;border-top:1px solid #ddd;padding-top:14px}'
 +'.sub{color:#6b6457;margin:0 0 10px}.refs{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.refs figure{margin:0}.refs img{width:100%;border-radius:4px}.refs figcaption{font-size:14px;color:#444}'
 +'ul.shots{list-style:none;padding:0}ul.shots li{padding:10px 0;border-bottom:1px solid #e6e1d6;font-size:18px}ul.shots li:before{content:"\\2610";margin-right:10px}'
 +'.btn{font:600 14px system-ui;padding:10px 16px;border:1px solid #1d1a15;background:#fff;border-radius:6px;cursor:pointer}@media print{.btn{display:none}body{margin:0 auto}}</style></head><body>'
 +body+'<p style="margin-top:28px"><button class="btn" onclick="print()">PRINT / SAVE AS PDF</button></p><p class="sub" style="font-size:12px">Made with THEACTORPAGE. Real photographs only; nothing generated or altered.</p></body></html>';
/* o: {name, rep, plan, refs:[{name,note,src}] (only the ones you chose), date} */
H.briefHtml=function(o){ const b=o.plan.brief, sec=(t,v)=>v&&String(v).trim()?'<h2>'+esc(t)+'</h2><p>'+esc(v).replace(/\n/g,'<br>')+'</p>':'';
 const shots=String(b.shots||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
 let h='<h1>Headshot session'+(o.name?': '+esc(o.name):'')+'</h1><p class="sub">'+esc(o.date||new Date().toISOString().slice(0,10))+(o.rep?' · Rep: '+esc(o.rep):'')+'</p>';
 h+=sec('What we\'re after',b.objective);
 if(b.roles&&o.plan.want.length) h+='<h2>Roles I want to be seen for</h2><p>'+esc(o.plan.want.join(', '))+'</p>';
 if(b.roles&&o.plan.called.length) h+='<h2>What I\'m called in for now</h2><p>'+esc(o.plan.called.join(', '))+'</p>';
 h+=sec('Wardrobe',b.wardrobe)+sec('Light',b.light)+sec('Framing',b.framing)+sec('Please don\'t',b.boundaries)+sec('Notes',b.notes);
 if(shots.length) h+='<h2>Shot list</h2><ol>'+shots.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>';
 if((o.refs||[]).length) h+='<h2>References</h2><p class="sub">For the light, the wardrobe or the mood. Not a face to copy.</p><div class="refs">'+o.refs.map(r=>'<figure><img src="'+r.src+'" alt=""><figcaption>'+esc(r.note||r.name||'')+'</figcaption></figure>').join('')+'</div>';
 return page('Headshot brief'+(o.name?' - '+o.name:''),h); };
H.shotSheetHtml=function(o){ const shots=String(o.plan.brief.shots||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
 return page('Shot sheet'+(o.name?' - '+o.name:''),'<h1>Shot sheet'+(o.name?': '+esc(o.name):'')+'</h1><p class="sub">Tick it off on the day.</p>'+(shots.length?'<ul class="shots">'+shots.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p>No shots listed yet.</p>')); };
H.fileName=(kind,name)=>[String(name||'').trim().replace(/[^\w ]+/g,' ').trim().replace(/\s+/g,'_'),kind,new Date().toISOString().slice(0,10)].filter(Boolean).join('_')+'.html';
g.Headshots=H;
if(typeof module!=='undefined') module.exports=H;
})(typeof window!=='undefined'?window:globalThis);
