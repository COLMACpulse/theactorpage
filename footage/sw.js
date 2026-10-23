/* FOOTAGE offline shell. Bump CACHE on every release. Only clears its own old copies. Network first. */
const CACHE='footage-0.1.2';
const FILES=['./','index.html','app.js','../shared/tour.js','../shared/view.js','../shared/notes.js','../shared/offices.js','../shared/contacts.js','../shared/you.js','../shared/takes.js','../actor-os/compress.js','../shared/footage.js'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).catch(()=>{}).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith("footage-")).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
 e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true}))); });
