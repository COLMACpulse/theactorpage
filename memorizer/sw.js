/* MEMORIZER offline shell. Bump CACHE on every release. Only clears its own old copies. */
const CACHE='memorizer-0.4.16';
const FILES=['./','index.html','../shared/hot.js','../shared/kit.js','app.js','engine.js','manifest.webmanifest',
 '../shared/shelf.js','../shared/scenes.js','../actor-os/sides.js','../actor-os/pdf.js',
 'fonts/jost-latin-400-normal.woff2','fonts/jost-latin-500-normal.woff2','fonts/jost-latin-600-normal.woff2',
 'fonts/courier-prime-latin-400-normal.woff2','fonts/courier-prime-latin-700-normal.woff2',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('memorizer-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
/* network first for the shared sides reader, so a fix in Actor OS reaches here; cache first for the rest */
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin) return;
 if(/\/(actor-os\/(sides|pdf)|shared\/shelf)\.js$/.test(u.pathname)){
  e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true})));
  return;
 }
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(h=>h||fetch(e.request)));
});
