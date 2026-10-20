/* THEACTORPAGE MADE BY ME: the work you made yourself, for your page in the Hub.
   Films from Film Hub (localStorage filmhub_v1; posters in IndexedDB filmhub/posters): the ones you added by hand, and
   the Story Studio ones you marked done. Anything you set to keep off your page in Film Hub stays off.
   Writing from Paper Trail (localStorage paper_trail_v1): a script goes up once you've written its logline.
   Your own film and stage work, and clips, from Virtual Résumé (IndexedDB vresume_v03), by its own rules for what counts.
   Headshots you marked Keep in HEADSHOTS (shared/you.js).
   Read, never written. Nothing is sent anywhere. The Hub lets you leave any of it off. */
(function (g) {
  'use strict';
  const M = {};
  const KINDS = { feature: 'Feature', short: 'Short', tv30: 'TV half hour', tv60: 'TV hour', pilot: 'Pilot' };
  const clean = s => String(s == null ? '' : s).trim();
  const titleOf = c => { const m = String((c && c.text) || '').slice(0, 2000).match(/^\s*Title:\s*(.+)$/im); return m ? m[1].replace(/[_*]+/g, '').trim() : String((c && c.file) || 'Untitled').replace(/\.(pdf|txt|fountain|fdx|docx)$/i, '').replace(/_+/g, ' ').trim() || 'Untitled'; };
  const links = L => (L || []).filter(l => l && /^https?:\/\//i.test(clean(l.url))).map(l => ({ url: clean(l.url), label: clean(l.label) || 'Watch' }));

  /* fh: Film Hub's saved data; studio: Story Studio's scripts (film_os_v1 .scripts) */
  M.films = function (fh, studio) {
    fh = fh || {}; studio = studio || {}; const out = [], st = fh.studio || {};
    Object.keys(studio).forEach(sid => { const c = studio[sid], x = st[sid] || {}; if (!c || !c.text) return; if (x.mark !== 'done' || x.show === false) return;
      out.push({ id: 's:' + sid, from: 'Story Studio', title: clean(x.title) || titleOf(c), year: clean(x.year), kind: clean(x.kind), runtime: clean(x.runtime), logline: clean(x.logline), credit: clean(x.credit), links: links(x.links) }); });
    (fh.films || []).forEach(f => { if (!f || f.show === false || !clean(f.title)) return;
      out.push({ id: f.id, from: 'Film Hub', title: clean(f.title), year: clean(f.year), kind: clean(f.kind), runtime: clean(f.runtime), logline: clean(f.logline), credit: clean(f.credit), links: links(f.links) }); });
    return out;
  };
  /* pt: Paper Trail's saved data */
  M.writing = function (pt) {
    const P = (pt && pt.projects) || {}, out = [];
    Object.keys(P).forEach(id => { const p = P[id], k = (p && p.package) || {}; if (!p || !clean(k.logline)) return;
      out.push({ id: 'w:' + id, from: 'Paper Trail', title: clean(p.title) || 'Untitled', kind: KINDS[k.kind] || clean(k.kind), genre: clean(k.genre), logline: clean(k.logline), by: clean(k.by) }); });
    return out.sort((a, b) => a.title.localeCompare(b.title));
  };
  /* your headshots marked Keep in HEADSHOTS (shared/you.js); Retire and Retest never go up */
  M.headshots = function (you) { return ((you && you.photos) || []).filter(p => p && p.status === 'keeper').map(p => ({ id: 'h:' + p.id, pid: p.id, name: clean(p.name), roles: (p.roles || []).map(clean).filter(Boolean) })); };
  /* Virtual Résumé (vresume_v03): what counts as a credit is your own film or stage work; clips are the rest.
     E = ResumeEngine (its rules decide what counts). Pieces you set off your page there stay off. */
  M.vresume = function (lib, E) {
    const out = { films: [], clips: [] }; if (!lib || !E) return out;
    (lib.pieces || []).forEach(p => { if (!p || p.onPage === false) return; const c = E.countsCheck(p), t = (E.TYPES[p.type] || {}).label || '';
      if (c.section === 'clip') { out.clips.push({ id: 'v:' + p.id, pid: p.id, from: 'Virtual Résumé', title: clean(p.title) || t || 'Clip', kind: t, link: clean(p.link) }); return; }
      const include = p.include === undefined ? c.counts : !!p.include; if (!include) return;
      const L = E.creditLine(p);
      out.films.push({ id: 'v:' + p.id, pid: p.id, from: 'Virtual Résumé', title: L.title || 'Untitled', year: L.year, kind: t, runtime: '', credit: [L.role, L.company].filter(Boolean).join(', '), logline: clean(p.logline || p.note || ''), links: p.link ? [{ url: clean(p.link), label: 'Watch' }] : [] }); });
    return out;
  };
  /* the same film in two tools (a short in Film Hub and in Virtual Résumé): once, the Film Hub one, with any video kept */
  M.merge = function (a, b) { const key = x => clean(x.title).toLowerCase().replace(/[^a-z0-9]+/g, ''); const seen = new Map(); const out = [];
    a.concat(b).forEach(x => { const k = key(x); if (k && seen.has(k)) { const y = seen.get(k); if (!y.video && x.video) y.video = x.video; if (!y.pid && x.pid) y.alsoId = x.id; return; } seen.set(k, x); out.push(x); }); return out; };
  const read = k => { try { return JSON.parse(g.localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  function poster(id) {
    return new Promise(res => { try { const r = g.indexedDB.open('filmhub', 2);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('posters')) d.createObjectStore('posters'); if (!d.objectStoreNames.contains('notes')) d.createObjectStore('notes'); };
      r.onsuccess = () => { try { const q = r.result.transaction('posters', 'readonly').objectStore('posters').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } };
      r.onerror = () => res(null); } catch (e) { res(null); } });
  }
  /* open another tool's database only if it's already there (never create it) */
  function peek(name) { return new Promise(res => { try { const r = g.indexedDB.open(name); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { } }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); } }); }
  function get(db, store, key) { return new Promise(res => { try { if (!db || !db.objectStoreNames.contains(store)) return res(null); const q = db.transaction(store, 'readonly').objectStore(store).get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  /* everything, with posters, photos and videos as Blobs (or null) */
  M.gather = async function () {
    const fh = read('filmhub_v1'), ss = read('film_os_v1'), pt = read('paper_trail_v1');
    const fhFilms = M.films(fh, ss && ss.scripts), writing = M.writing(pt);
    for (const f of fhFilms) f.poster = await poster(f.id);
    let vr = { films: [], clips: [] };
    const vdb = await peek('vresume_v03');
    if (vdb && g.ResumeEngine) { const lib = await get(vdb, 'lib', 'main'); vr = M.vresume(lib, g.ResumeEngine);
      for (const x of vr.films.concat(vr.clips)) { const b = await get(vdb, 'media', x.pid); x.video = b && /^video\//.test(b.type || '') ? b : null; } }
    if (vdb) vdb.close();
    let heads = []; try { const Y = g.You; if (Y) { heads = M.headshots(Y.get()); for (const h of heads) h.blob = await Y.photoBlob(h.pid); heads = heads.filter(h => h.blob); } } catch (e) { heads = []; }
    return { films: M.merge(fhFilms, vr.films), writing, clips: vr.clips.filter(c => c.video || c.link), headshots: heads };
  };
  /* a video link you can put on the page: YouTube and Vimeo play in place, anything else is a plain link */
  M.video = function (url) {
    const u = clean(url); if (!/^https?:\/\//i.test(u)) return null;
    let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { kind: 'youtube', id: m[1], embed: 'https://www.youtube-nocookie.com/embed/' + m[1], url: u };
    m = u.match(/vimeo\.com\/(?:video\/)?(\d{6,})(?:\/([0-9a-f]{6,}))?/i);
    if (m) return { kind: 'vimeo', id: m[1], embed: 'https://player.vimeo.com/video/' + m[1] + (m[2] ? '?h=' + m[2] : ''), url: u };
    return { kind: 'link', url: u };
  };
  g.MadeBy = M;
  if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
