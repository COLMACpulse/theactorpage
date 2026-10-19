/* THEACTORPAGE MADE BY ME: the work you made yourself, for your page in the Hub.
   Films from Film Hub (localStorage filmhub_v1; posters in IndexedDB filmhub/posters): the ones you added by hand, and
   the Story Studio ones you marked done. Anything you set to keep off your page in Film Hub stays off.
   Writing from Paper Trail (localStorage paper_trail_v1): a script goes up once you've written its logline.
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
  const read = k => { try { return JSON.parse(g.localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  function poster(id) {
    return new Promise(res => { try { const r = g.indexedDB.open('filmhub', 2);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('posters')) d.createObjectStore('posters'); if (!d.objectStoreNames.contains('notes')) d.createObjectStore('notes'); };
      r.onsuccess = () => { try { const q = r.result.transaction('posters', 'readonly').objectStore('posters').get(id); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } };
      r.onerror = () => res(null); } catch (e) { res(null); } });
  }
  /* everything, with each film's poster as a Blob (or null) */
  M.gather = async function () {
    const fh = read('filmhub_v1'), ss = read('film_os_v1'), pt = read('paper_trail_v1');
    const films = M.films(fh, ss && ss.scripts), writing = M.writing(pt);
    for (const f of films) f.poster = await poster(f.id);
    return { films, writing };
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
