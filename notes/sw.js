/* Notes is gone (Col, Oct 26). This worker clears its old copies and steps aside. */
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('notes-')).map(k=>caches.delete(k)))).then(()=>self.registration.unregister())); });
