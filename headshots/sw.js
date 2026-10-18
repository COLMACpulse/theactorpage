/* HEADSHOTS offline shell. Bump CACHE on every release. Only clears its own old copies. */
const CACHE='headshots-0.1.10';
const FILES=['../shared/view.js','./','../shared/hot.js', 'index.html','app.js','manifest.webmanifest','../shared/you.js','../shared/capture.js','../shared/kit.js','../shared/headshots.js',
 'fonts/jost-latin-400-normal.woff2','fonts/jost-latin-500-normal.woff2','fonts/jost-latin-600-normal.woff2',
 'fonts/courier-prime-latin-400-normal.woff2','fonts/courier-prime-latin-700-normal.woff2',
 'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('headshots-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
 e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true}))); });
