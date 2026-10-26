/* THEACTORPAGE FOOTAGE, the files: the small copies that play anywhere (540p), their pictures, and the folders you
   let it read again (Chrome on a computer keeps the folder, so a plugged-in drive plays its originals).
   IndexedDB theactorpage_footage_lib: proxy (key -> video), thumb (key -> jpeg), handle (place id -> folder).
   Left out of the backup on purpose: every copy can be made again from its original. */
(function (g) {
  'use strict';
  const L = {}, DB = 'theactorpage_footage_lib';
  let P = null;
  const db = () => P || (P = new Promise(res => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { ['proxy', 'thumb', 'handle'].forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s); }); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }));
  const op = async (st, mode, fn) => { const d = await db(); if (!d) return null; return new Promise(res => { try { const t = d.transaction(st, mode), q = fn(t.objectStore(st)); t.oncomplete = () => res(q && 'result' in q ? q.result : true); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  ['proxy', 'thumb', 'handle'].forEach(s => { L[s] = { get: k => op(s, 'readonly', o => o.get(k)), put: (k, v) => op(s, 'readwrite', o => o.put(v, k)), del: k => op(s, 'readwrite', o => o.delete(k)) }; });
  L.DB = DB;
  /* a picture from a video: a frame a second in (or the middle of a short one) */
  L.grab = function (src, at) {
    return new Promise(res => { const v = document.createElement('video'); let done = false; const fin = b => { if (done) return; done = true; try { URL.revokeObjectURL(v.src); } catch (e) { } res(b); };
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = typeof src === 'string' ? src : URL.createObjectURL(src);
      v.onloadedmetadata = () => { try { v.currentTime = Math.min(at || 1, (v.duration || 2) / 2); } catch (e) { fin(null); } };
      v.onseeked = () => { try { const w = 320, h = Math.round(w * (v.videoHeight || 180) / (v.videoWidth || 320)); const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h); c.toBlob(b => fin(b), 'image/jpeg', 0.8); } catch (e) { fin(null); } };
      v.onerror = () => fin(null); setTimeout(() => fin(null), 8000); });
  };
  /* can this browser play it? -> {ok, secs, w, h} */
  L.probe = function (file) {
    return new Promise(res => { const v = document.createElement('video'), u = URL.createObjectURL(file); let done = false; const fin = r => { if (done) return; done = true; URL.revokeObjectURL(u); res(r); };
      v.muted = true; v.preload = 'metadata'; v.src = u; v.onloadedmetadata = () => fin({ ok: !!(v.videoWidth || /audio/.test(file.type)) && isFinite(v.duration), secs: Math.round((v.duration || 0) * 10) / 10, w: v.videoWidth, h: v.videoHeight });
      v.onerror = () => fin({ ok: false }); setTimeout(() => fin({ ok: false }), 8000); });
  };
  /* a folder you let it keep (Chrome): walk it for files -> [{p, s, d, file}] */
  L.walk = async function (dir, VIDEO, cap) {
    const out = []; const go = async (h, pre) => { for await (const [n, e] of h.entries()) { if (out.length >= (cap || 50000)) return; if (e.kind === 'directory') { if (!/^\./.test(n)) await go(e, pre + n + '/'); } else if (VIDEO.test(n) && !/^\._/.test(n)) { try { const f = await e.getFile(); out.push({ p: pre + n, s: f.size, d: new Date(f.lastModified).toISOString().slice(0, 10) }); } catch (x) { } } } };
    await go(dir, dir.name + '/'); out.sort((a, b) => a.p.localeCompare(b.p)); return out;
  };
  /* the original, from a kept folder, if it's plugged in and you say yes */
  L.original = async function (placeId, path, ask) {
    const h = await L.handle.get(placeId); if (!h) return null;
    try { let st = await h.queryPermission({ mode: 'read' }); if (st !== 'granted' && ask) st = await h.requestPermission({ mode: 'read' }); if (st !== 'granted') return null;
      const parts = path.split('/').slice(1); let cur = h; for (let i = 0; i < parts.length - 1; i++) cur = await cur.getDirectoryHandle(parts[i]); return await (await cur.getFileHandle(parts[parts.length - 1])).getFile(); } catch (e) { return null; }
  };
  g.FootLib = L;
})(typeof window !== 'undefined' ? window : globalThis);
