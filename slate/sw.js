/* SLATE MAKER service worker: opens with no signal. Your take never touches the network. */
const CACHE = 'slate-0.5.2';
const FILES = ['./', 'index.html', '../shared/hot.js', '../shared/you.js', 'app.js', 'engine.js', 'manifest.webmanifest',
  'fonts/jost-latin-400-normal.woff2', 'fonts/jost-latin-500-normal.woff2', 'fonts/jost-latin-600-normal.woff2',
  'fonts/courier-prime-latin-400-normal.woff2', 'fonts/courier-prime-latin-700-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('slate-')).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const u = new URL(e.request.url); if (e.request.method !== 'GET' || u.origin !== location.origin) return; e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(h => h || fetch(e.request))); });
