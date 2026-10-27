/* ON THIS DEVICE offline shell. Bump CACHE on every release. Only clears its own old copies.
   Network first: the list of tools changes as the site grows; offline it still opens. */
const CACHE='device-0.1.31';
const FILES=['../shared/icons.js','../shared/tour.js','../shared/view.js','./','../shared/hot.js', 'index.html','app.js','store.js','icons/icon-192.png','icons/apple-touch-icon.png','../img/sigil-film-180.png','../img/sigil-film-64.png','../fonts/jost-latin-400-normal.woff2','../fonts/jost-latin-500-normal.woff2','../fonts/jost-latin-600-normal.woff2'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('device-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.includes('/device/')) return;
 e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
