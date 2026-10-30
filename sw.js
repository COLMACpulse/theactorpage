/* THEACTORPAGE home, offline. Only the home page and what it loads; each tool has its own.
   Bump CACHE on every release. Only clears its own old copies. */
const CACHE='home-0.8.19';
const FILES=['manifest.webmanifest','how.html','shared/frontpage.js','shared/icons.js','film/vendor/qrcode.min.js','img/app-180.png','img/colmac-sigil-96.png','img/app-192.png','img/app-512.png','img/app-512-maskable.png','shared/offices.js','shared/contacts.js','shared/footage.js','shared/footmap.js','shared/press.js','shared/week.js','shared/viz.js','shared/plan.js','shared/yours.js','shared/workedwith.js','shared/ics.js','img/you-mask.webp','img/steps/get.webp','img/steps/learn.webp','img/steps/run.webp','img/steps/tape.webp','img/steps/send.webp','img/steps/radar.webp','shared/tour.js','shared/madeby.js','shared/repsheet.js','shared/siteimport.js','demo/','demo/index.html','demo/stops.js','demo/player.js','demo/myvoice.js','demo/low_tide.fountain','demo/low_tide_email.txt','shared/view.js','./','index.html','fonts/jost-latin-300-normal.woff2','fonts/jost-latin-400-normal.woff2','fonts/jost-latin-500-normal.woff2','fonts/jost-latin-600-normal.woff2','fonts/courier-prime-latin-400-normal.woff2','fonts/courier-prime-latin-700-normal.woff2','privacy/','shared/hot.js','shared/shelf.js','shared/scenes.js','shared/inbox.js','shared/you.js','shared/offices.js','shared/intake.js','shared/home.js','shared/rooms.js','shared/spark.js','shared/yourscenes.js','shared/practice.js','shared/capture.js','shared/takes.js','shared/studio.js',
 'actor-os/sides.js','actor-os/pdf.js','hub/request.js','img/sigil-apex.webp','img/sigil-left.webp','img/sigil-right.webp','img/sigil-head.webp','img/sigil-strip.webp','img/sigil-glow.webp','img/sigil-film-64.png','shared/sigil.js'];
const OWN=new Set(FILES.map(f=>new URL(f,self.registration.scope).href));
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k.startsWith('home-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET') return;
 const u=new URL(e.request.url); u.search=''; if(!OWN.has(u.href)) return;      // not ours: the network, as if we weren't here
 e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(CACHE).then(c=>c.put(u.href,cp)); return r; }).catch(()=>caches.match(u.href)));
});
