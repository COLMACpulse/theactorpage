/* FILM HUB offline shell. Bump CACHE on every release. Only clears its own old copies. */
const CACHE='filmhub-0.1.8';
const FILES=['./','index.html','app.js','manifest.webmanifest','../shared/hot.js','../actor-os/sides.js','../film/film.js','../shared/you.js','../shared/filmhub.js','../shared/capture.js','../shared/kit.js','../shared/notecam.js',
 'fonts/jost-latin-400-normal.woff2','fonts/jost-latin-500-normal.woff2','fonts/jost-latin-600-normal.woff2',
 'fonts/courier-prime-latin-400-normal.woff2','fonts/courier-prime-latin-700-normal.woff2',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('filmhub-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
 e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true}))); });
