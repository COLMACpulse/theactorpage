/* THE TOUR, IN YOUR VOICE, ON THIS DEVICE. The clips made on record.html are kept here (IndexedDB
   "theactorpage_tourvo") and the tour player plays them before the site's own clips.
   Kept outside the demo sandbox on purpose: the sandbox gives every database a twin, and the player runs inside it.
   MyVoice.get(k) / put(k, v) / del(k) / clear() / clips() -> {O01: Blob, ...} / edits() -> {O01: 'your words'} */
(function (g) {
  'use strict';
  const NAME = 'theactorpage_tourvo', ST = 'k';
  const V = {};
  function open() {
    return new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') return rej(new Error('no storage'));
      const op = (g.TapDemo && g.TapDemo.openReal) || indexedDB.open.bind(indexedDB);
      const r = op(NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(ST)) r.result.createObjectStore(ST); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  function tx(mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction(ST, mode), s = t.objectStore(ST); let out;
      const q = fn(s); if (q) q.onsuccess = () => { out = q.result; };
      t.oncomplete = () => { db.close(); res(out); }; t.onerror = t.onabort = () => { db.close(); rej(t.error); };
    }));
  }
  V.get = k => tx('readonly', s => s.get(k));
  V.put = (k, v) => tx('readwrite', s => { s.put(v, k); });
  V.del = k => tx('readwrite', s => { s.delete(k); });
  V.clear = () => tx('readwrite', s => { s.clear(); });
  /* the words you changed: {O01: 'new line'} */
  V.edits = () => V.get('edits').then(x => x || {}).catch(() => ({}));
  V.clips = () => open().then(db => new Promise(res => {
    const out = {}, t = db.transaction(ST, 'readonly'), c = t.objectStore(ST).openCursor();
    c.onsuccess = () => { const k = c.result; if (!k) return; if (String(k.key).indexOf('clip:') === 0 && k.value) out[String(k.key).slice(5)] = k.value; k.continue(); };
    t.oncomplete = () => { db.close(); res(out); }; t.onerror = () => { db.close(); res(out); };
  })).catch(() => ({}));
  g.MyVoice = V;
})(window);
