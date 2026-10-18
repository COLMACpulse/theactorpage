/* PAPER TRAIL offline shell. Bump CACHE on every release. Only clears its own old copies. */
const CACHE='paper-trail-0.11.20';
const FILES=['../shared/view.js','./','index.html','../shared/hot.js','../shared/kit.js','../shared/capture.js','../shared/notecam.js','app.js','trail.js','../shared/graph.js','../shared/you.js','../shared/textpdf.js','manifest.webmanifest',
 '../shared/shelf.js','../shared/inbox.js','../shared/xlsx.js','../actor-os/sides.js','../actor-os/pdf.js','../film/film.js',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('paper-trail-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
/* network first for the shared readers, so a fix in Actor OS or Story Studio reaches here */
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin) return;
 if(/\/(actor-os\/(sides|pdf)|shared\/shelf|film\/film)\.js$/.test(u.pathname)){
  e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true})));
  return;
 }
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(h=>h||fetch(e.request)));
});
