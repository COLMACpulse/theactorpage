/* THEACTORPAGE VOICE DEMO: your best reads as one file, and your voices on your page.
   DEMOS  each in your words: a name, a target length (or none), clips in your order (each a copy of the sound, so
          the demo stands on its own), the gap between them, the level. VO BOOTH makes the MP3; it is kept here.
   VOICES your Character Bank characters, read where they live (IndexedDB cps_v02, read only, never created here).
          What goes on your page is yours to pick: on or off, the take that plays, the picture, a line under it.
   Nothing suggested, no score. localStorage theactorpage_vodemo_v1; sounds in IndexedDB theactorpage_vodemo / media.
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const VD = {}, KEY = 'theactorpage_vodemo_v1', DB = 'theactorpage_vodemo';
  VD.KEY = KEY; VD.DB = DB;
  VD.TARGETS = [30, 60, 90, 0]; VD.GAPS = [0.3, 0.6, 1]; VD.LEVELS = [[-23, 'Quieter'], [-20, 'Standard'], [-16, 'Louder']];
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const uid = p => (p || 'd') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const blank = () => ({ demos: [], voices: {}, at: 0 });
  function read() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.demos)) return Object.assign(blank(), d); } catch (e) { } return blank(); }
  function write(d) { d.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  VD.all = () => read().demos.slice();
  VD.get = id => read().demos.find(x => x.id === id) || null;
  VD.add = function (name) { const n = clean(name); if (!n) return null; const d = read();
    const it = { id: uid('d'), name: n, target: 60, gap: 0.3, level: -16, clips: [], made: null, onPage: true, added: Date.now() };
    d.demos.push(it); write(d); return it; };
  VD.set = function (id, patch) { const d = read(), x = d.demos.find(m => m.id === id); if (!x) return null; Object.assign(x, patch); if (patch.name !== undefined) x.name = clean(patch.name) || x.name; write(d); return x; };
  VD.remove = async function (id) { const x = VD.get(id); if (x) { for (const c of x.clips) await VD.drop(c.media); if (x.made) await VD.drop(x.made.media); } const d = read(); d.demos = d.demos.filter(m => m.id !== id); write(d); };
  /* a clip: {label, from:'cps'|'booth'|'file', secs, trimIn, trimOut}; its sound is copied in first (media) */
  VD.addClip = function (id, c) { const x = VD.get(id); if (!x) return null; const it = Object.assign({ id: uid('c'), label: '', from: 'file', secs: 0, trimIn: 0, trimOut: 0, media: '' }, c); it.label = clean(it.label) || 'Clip'; VD.set(id, { clips: x.clips.concat([it]), made: x.made ? Object.assign({}, x.made, { stale: true }) : null }); return it; };
  VD.setClip = (id, cid, patch) => { const x = VD.get(id); if (!x) return; VD.set(id, { clips: x.clips.map(c => c.id === cid ? Object.assign({}, c, patch) : c), made: x.made ? Object.assign({}, x.made, { stale: true }) : null }); };
  VD.dropClip = async (id, cid) => { const x = VD.get(id); if (!x) return; const c = x.clips.find(k => k.id === cid); if (c) await VD.drop(c.media); VD.set(id, { clips: x.clips.filter(k => k.id !== cid), made: x.made ? Object.assign({}, x.made, { stale: true }) : null }); };
  VD.moveClip = (id, cid, by) => { const x = VD.get(id); if (!x) return; const L = x.clips.slice(), i = L.findIndex(c => c.id === cid), j = i + by; if (i < 0 || j < 0 || j >= L.length) return; const [c] = L.splice(i, 1); L.splice(j, 0, c); VD.set(id, { clips: L, made: x.made ? Object.assign({}, x.made, { stale: true }) : null }); };
  /* how long it runs: each clip as trimmed, plus the gaps between them (the made file also trims the dead air, so it can come in a little under) */
  VD.clipSecs = c => Math.max(0, (+c.secs || 0) - (+c.trimIn || 0) - (+c.trimOut || 0));
  VD.runTime = x => { if (!x || !x.clips.length) return 0; const s = x.clips.reduce((a, c) => a + VD.clipSecs(c), 0) + (+x.gap || 0) * (x.clips.length - 1); return Math.round(s * 10) / 10; };
  const mm = s => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  VD.mm = mm;
  VD.targetWords = function (secs, target) { if (!target) return mm(secs);
    const d = Math.round((secs - target) * 10) / 10;
    if (d > 0) return mm(secs) + ' of ' + mm(target) + ' · ' + d + ' s over';
    if (d > -5) return mm(secs) + ' of ' + mm(target) + ' · on time';
    return mm(secs) + ' of ' + mm(target) + ' · ' + Math.round(-d) + ' s to spare'; };
  VD.fileName = (you, demo) => [clean(you), clean(demo) + (/\bdemo$/i.test(clean(demo)) ? '' : ' Demo')].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, ' ') + '.mp3';

  /* your voices on the page: {[charId]: {onPage, take, look, line}} */
  VD.voice = cid => Object.assign({ onPage: false, take: '', look: '', line: '' }, read().voices[cid] || {});
  VD.setVoice = (cid, patch) => { const d = read(); d.voices[cid] = Object.assign(VD.voice(cid), patch); write(d); return d.voices[cid]; };

  /* ---------- the page: what goes on, as plain data (the Hub turns it into the section) ---------- */
  /* chars: Character Bank's characters; demos: VD.all(). -> {demos:[{id, name, secs, media}], voices:[{id, name, line, take, look}]} */
  VD.pagePlan = function (chars, demos) {
    const ds = (demos || VD.all()).filter(x => x.onPage && x.made && x.made.media && !x.made.stale).map(x => ({ id: x.id, name: x.name, secs: x.made.secs, media: x.made.media, fn: x.made.fn }));
    const vs = []; (chars || []).forEach(c => { if (c.me) return; const v = VD.voice(c.id); if (!v.onPage) return;
      const takes = (c.takes || []).filter(t => t.kind !== 'note'), take = takes.find(t => t.id === v.take) || takes[takes.length - 1];
      if (!take) return; const looks = (c.looks || []).filter(l => l.kind !== 'video'), look = (c.looks || []).find(l => l.id === v.look) || looks[0] || null;
      vs.push({ id: c.id, name: clean(c.name) || 'Unnamed', line: clean(v.line), take: take.id, look: look ? look.id : '' }); });
    return { demos: ds, voices: vs };
  };

  /* ---------- sounds kept here ---------- */
  let dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise(res => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); return dbp; }
  const op = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise(res => { try { const t = d.transaction('media', mode), r = fn(t.objectStore('media')); t.oncomplete = () => res(r ? r.result : null); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  VD.keep = async blob => { if (!blob) return ''; const id = uid('m'); const ok = await op('readwrite', st => st.put(blob, id)); return ok === null ? '' : id; };
  VD.blob = id => id ? op('readonly', st => st.get(id)) : Promise.resolve(null);
  VD.drop = id => id ? op('readwrite', st => st.delete(id)) : Promise.resolve();

  /* ---------- Character Bank, read only: never opens a database that isn't there ---------- */
  async function cpsDb() {
    try { if (indexedDB.databases) { const l = await indexedDB.databases(); if (!l.some(d => d.name === 'cps_v02')) return null; } } catch (e) { }
    return new Promise(res => { try { const r = indexedDB.open('cps_v02'); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { } }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  }
  const cop = async (store, key) => { const d = await cpsDb(); if (!d) return null; return new Promise(res => { try { if (!d.objectStoreNames.contains(store)) { d.close(); return res(null); } const q = d.transaction(store, 'readonly').objectStore(store).get(key); q.onsuccess = () => { res(q.result || null); d.close(); }; q.onerror = () => { res(null); d.close(); }; } catch (e) { res(null); } }); };
  VD.chars = async () => { const lib = await cop('lib', 'main'); return lib && Array.isArray(lib.chars) ? lib.chars : []; };
  VD.cpsMedia = id => cop('media', id);

  g.VODemo = VD;
  if (typeof module !== 'undefined') module.exports = VD;
})(typeof window !== 'undefined' ? window : globalThis);
