/* THEACTORPAGE home, offline. Only the home page and what it loads; each tool has its own.
   Bump CACHE on every release. Only clears its own old copies. */
const CACHE='home-0.4.7';
const FILES=['./','index.html','shared/hot.js','shared/shelf.js','shared/scenes.js','shared/inbox.js','shared/you.js','shared/offices.js','shared/intake.js','shared/home.js','shared/capture.js','shared/takes.js','shared/studio.js',
 'actor-os/sides.js','actor-os/pdf.js','hub/request.js','img/sigil-film.png','img/sigil-film-64.png'];
const OWN=new Set(FILES.map(f=>new URL(f,self.registration.scope).href));
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('home-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 const u=new URL(e.request.url); u.search=''; if(!OWN.has(u.href)) return;      // not ours: the network, as if we weren't here
 e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(u.href,cp)); return r; }).catch(()=>caches.match(u.href)));
});
