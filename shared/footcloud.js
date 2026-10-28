/* FOOTAGE ONLINE, this device's side (Col, Oct 28). Your clips, the originals, in your own private space on
   theactorpage.com. Same key as your page (hub_online_v1, set when you claim your address in the Hub or here); on a new
   phone or computer the backup code opens both. Uploads go one 25 MB part at a time; if the Wi-Fi drops it waits and
   tries again, and a page reload picks up at the part it was on. Nothing goes up until you tap UPLOAD.
   FootCloud.acct() {name,key,url}|null   claim(name)  recover(name, backup)  free(name)
             list() {items, bytes, cap}   upload(file, {secs, onP, ctl})   link(id)   remove(id)   cached()  */
(function (g) {
  'use strict';
  const C = {}, KEY = 'hub_online_v1', CACHE = 'footcloud_v1';
  const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  C.base = () => { try { return (g.TAP_API || localStorage.getItem('tap_api') || 'https://api.theactorpage.com').replace(/\/$/, ''); } catch (e) { return 'https://api.theactorpage.com'; } };
  C.acct = () => { const o = ls.get(KEY); return o && o.key && o.name ? o : null; };
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 40);
  C.slug = slug;
  async function call(path, o, raw) {
    const r = await fetch(C.base() + path, o).catch(() => null);
    if (!r) { const e = new Error('Can’t reach theactorpage.com right now. Check your connection.'); e.net = true; throw e; }
    let b = null; try { b = await r.json(); } catch (e) { }
    if (!r.ok) { const e = new Error((b && b.why) || ('The host said no (' + r.status + ').')); e.status = r.status; throw e; }
    return b || {};
  }
  const auth = (extra) => { const a = C.acct(); if (!a) throw new Error('Pick your address first.'); return Object.assign({ authorization: 'Bearer ' + a.key }, extra || {}); };
  const L = () => '/api/lib/' + C.acct().name;
  C.free = async name => call('/api/names/' + encodeURIComponent(slug(name)));
  C.claim = async name => { const b = await call('/api/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: slug(name) }) });
    const o = Object.assign(ls.get(KEY) || {}, { name: b.name, key: b.key, backup: b.backup, url: b.url, claimed: new Date().toISOString() }); ls.set(KEY, o); return o; };
  C.recover = async (name, backup) => { const b = await call('/api/recover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: slug(name), backup: String(backup || '').trim() }) });
    const o = Object.assign(ls.get(KEY) || {}, { name: b.name, key: b.key, url: b.url }); ls.set(KEY, o); return o; };
  C.cached = () => (ls.get(CACHE) || { items: [], bytes: 0, cap: 0 });
  C.list = async () => { const b = await call(L(), { headers: auth() }); const c = { items: b.items || [], bytes: b.bytes || 0, cap: b.cap || 0, part: b.part || 0, at: Date.now() }; ls.set(CACHE, c); return c; };
  const LINKS = {};
  C.link = async id => { const k = LINKS[id]; if (k && k.until - Date.now() / 1000 > 600) return k.url; const b = await call(L() + '/' + id + '/link', { headers: auth() }); LINKS[id] = b; return b.url; };
  C.remove = async id => { const b = await call(L() + '/' + id, { method: 'DELETE', headers: auth() }); const c = C.cached(); c.items = c.items.filter(x => x.id !== id); if (typeof b.bytes === 'number') c.bytes = b.bytes; ls.set(CACHE, c); return b; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  /* ctl: {paused, stop} set from outside; onP(fraction of this file, bytes sent) */
  C.upload = async function (file, o) {
    o = o || {}; const ctl = o.ctl || {}, onP = o.onP || (() => { });
    const fp = file.name + '|' + file.size + '|' + (file.lastModified || 0);
    const st = await call(L() + '/start', { method: 'POST', headers: auth({ 'content-type': 'application/json' }), body: JSON.stringify({ name: file.name, size: file.size, secs: o.secs || 0, fp }) });
    const part = st.part, parts = Math.ceil(file.size / part); let have = st.have || 0; onP(have / parts, have * part);
    while (have < parts) {
      while (ctl.paused && !ctl.stop) await wait(300);
      if (ctl.stop) { const e = new Error('stopped'); e.stopped = true; throw e; }
      const n = have + 1, body = file.slice((n - 1) * part, Math.min(file.size, n * part)); let tries = 0;
      for (;;) {
        try { const b = await call(L() + '/part/' + st.id + '?p=' + n, { method: 'PUT', headers: auth(), body }); have = b.have; break; }
        catch (e) { if (!e.net && !(e.status >= 500)) throw e; tries++; if (tries > 8) throw new Error('The connection keeps dropping. Your upload is saved up to here; tap UPLOAD again to pick it up.');
          if (o.onWait) o.onWait(tries); await wait(Math.min(30000, 1000 * Math.pow(2, tries - 1))); }
      }
      onP(have / parts, Math.min(file.size, have * part));
    }
    const fin = await call(L() + '/finish/' + st.id, { method: 'POST', headers: auth({ 'content-type': 'application/json' }), body: '{}' });
    const c = C.cached(); c.items = c.items.filter(x => x.id !== st.id).concat([fin.item]); if (typeof fin.bytes === 'number') c.bytes = fin.bytes; ls.set(CACHE, c);
    return fin.item;
  };
  g.FootCloud = C;
})(window);
