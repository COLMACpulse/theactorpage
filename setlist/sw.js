/* SET LIST offline shell. Bump CACHE on every release. Only clears its own old copies. */
const CACHE='setlist-0.1.4';
const FILES=['./','index.html','../shared/hot.js','app.js','set.js','manifest.webmanifest','../shared/capture.js',
 'fonts/jost-latin-400-normal.woff2','fonts/jost-latin-500-normal.woff2','fonts/jost-latin-600-normal.woff2',
 'fonts/courier-prime-latin-400-normal.woff2','fonts/courier-prime-latin-700-normal.woff2',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('setlist-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(h=>h||fetch(e.request))); });
