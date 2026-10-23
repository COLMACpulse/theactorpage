/* Offline shell. Bump CACHE on every deploy or installed users stay frozen
   on the old build - the failure mode I flagged in v0.2. */
const CACHE='actor-os-pwa-v5_33_37';
const SHELL=['../shared/tour.js','../shared/view.js','./','./index.html','../shared/hot.js','../shared/kit.js','../shared/shelf.js','../shared/takes.js','../shared/scenes.js','../shared/yourscenes.js','./takeread.js','../shared/practice.js','../shared/delivery.js','../shared/inbox.js','./performer_camera_v08.js','./sides.js','./pdf.js','./reader.js','./oneread.js','./pocket.js','./pocketui.js','./readinui.js','./screenlink.js','./screen.html','../film/monitor-link.js','../film/vendor/qrcode.min.js','../film/vendor/jsQR.min.js','../shared/readin.js','../shared/zipw.js','./slatemove.js','./compress.js','./vendor/pdf.min.js','./vendor/pdf.worker.min.js',
             './manifest.webmanifest','./icon-192.png','./icon-512.png',
             './gauntlet/WEB_CAPABILITY_PROBE.html'];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x.startsWith('actor-os-')).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  // network first so a deploy lands; cache is the fallback when offline
  e.respondWith(
    fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});
