/* CHARACTERS offline shell. Bump CACHE on every release. Only clears its own old copies. */
const CACHE='characters-0.1.2';
const FILES=['./','index.html','app.js','../shared/icons.js','../shared/characters.js','../actor-os/sides.js','../film/film.js','../shared/tour.js','../shared/view.js','../img/sigil-film-180.png','../img/sigil-film-64.png',
 '../fonts/jost-latin-400-normal.woff2','../fonts/jost-latin-500-normal.woff2','../fonts/jost-latin-600-normal.woff2','../fonts/courier-prime-latin-400-normal.woff2','../fonts/courier-prime-latin-700-normal.woff2'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES).catch(()=>{})).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('characters-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ if(e.request.method!=='GET') return; e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return r; }).catch(()=>caches.match(e.request))); });
