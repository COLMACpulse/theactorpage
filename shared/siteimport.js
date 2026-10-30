/* THEACTORPAGE BRING IN MY SITE: an actor site you already have, into the Hub, once. Your credits with their clips and
   posters, your headshots and photos, your reel, your films and your writing. It reads the site's own data block
   (const SITE = {...}, the shape made by this family of site builders) and the files beside it, from the site's folder
   or the zip GitHub gives you (Code, Download ZIP). Read as data only: nothing in the site runs.
   Nothing leaves the device; the site itself is never touched.
     SiteImport.extract(html) -> SITE or null
     SiteImport.plan(SITE, has(path)) -> {profile, credits, headshots, stills, reel, films, writing, missing, counts}
     SiteImport.fromFolder(fileList) / fromZip(file) -> {html, get(path) -> Promise<Blob|null>, has(path)}
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const S = {};
  const clean = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const norm = p => clean(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').split('?')[0].split('#')[0];
  const isUrl = u => /^https?:\/\//i.test(clean(u));

  /* the data block: balanced braces after "const SITE=", read as JSON only */
  S.extract = function (html) {
    const s = String(html || ''); let i = s.search(/\b(?:const|let|var)\s+SITE\s*=\s*\{/); if (i < 0) return null;
    i = s.indexOf('{', i); let depth = 0, inStr = false, q = '', esc = false;
    for (let k = i; k < s.length; k++) {
      const c = s[k];
      if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inStr = false; continue; }
      if (c === '"' || c === "'") { inStr = true; q = c; continue; }
      if (c === '{') depth++; else if (c === '}' && --depth === 0) { try { const o = JSON.parse(s.slice(i, k + 1)); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } }
    }
    return null;
  };

  /* what would come in, and what's missing */
  S.plan = function (site, has) {
    site = site || {}; has = has || (() => true);
    /* a file that isn't where the page says (media/x.mp4) but sits at the top of the site (x.mp4) is found there too */
    const missing = [], moved = [], file = p => { p = norm(p); if (!p || isUrl(p) || /^data:/.test(p)) return ''; if (has(p)) return p; const b = p.split('/').pop(); if (b !== p && has(b)) { if (!moved.includes(p)) moved.push(p); return b; } if (!missing.includes(p)) missing.push(p); return ''; };
    const facts = {}; (site.facts || []).forEach(f => { if (Array.isArray(f) && f[0]) facts[clean(f[0]).toLowerCase()] = clean(f[1]); });
    const rep0 = (site.reps || []).find(r => r && clean(r.name));
    const profile = {
      name: clean(site.name), lane: clean(site.lane), union: facts.union || '',
      rep: facts.management || facts.agent || facts.agency || facts.rep || facts.representation || (rep0 ? clean(rep0.name) : ''),
      email: facts.email || clean(site.email), imdb: isUrl(facts.imdb) ? facts.imdb : ''
    };
    const credits = (site.work || []).filter(w => w && clean(w.t)).map(w => {
      const clips = []; [w.clip].concat((w.clips || []).map(c => c && (c.src || c))).forEach(c => { const f = file(c); if (f && !clips.includes(f)) clips.push(f); });
      const role = clean(w.r);
      return { title: clean(w.t), character: clean(w.ch), role, net: clean(w.n), director: clean(w.d), note: clean(w.note), poster: file(w.p), clips,
        medium: clean(w.n) ? 'TV' : /lead|supporting|feature|film/i.test(role) ? 'Film' : 'Other' };
    });
    const head = file(site.headshot), headshots = []; [site.headshot].concat(site.photos || []).forEach(p => { const f = file(p && (p.src || p)); if (f && !headshots.includes(f)) headshots.push(f); });
    const stills = []; (site.stills || []).forEach(p => { const f = file(p && (p.src || p)); if (f && !stills.includes(f) && !headshots.includes(f)) stills.push(f); });
    const films = (site.films || []).filter(f => f && clean(f.t)).map(f => ({ title: clean(f.t), credit: clean(f.s), links: isUrl(f.u) ? [{ url: clean(f.u), label: /youtu/i.test(f.u) ? 'Watch on YouTube' : /vimeo/i.test(f.u) ? 'Watch on Vimeo' : 'Watch' }] : [], poster: file(f.p) }));
    const writing = (site.writing || []).filter(w => w && clean(w.t)).map(w => ({ title: clean(w.t), logline: clean(w.s), genre: clean(w.genre), kind: clean(w.format), format: clean(w.format), comps: clean(w.comps), material: clean(w.material), note: clean(w.note), status: clean(w.status), poster: file(w.p), links: isUrl(w.u) ? [{ url: clean(w.u), label: 'Read more' }] : [] }));
    const reel = file(site.reel);
    const clipN = credits.reduce((n, c) => n + c.clips.length, 0);
    return { profile, credits, primary: head, headshots, stills, reel, films, writing, missing, moved,
      counts: { credits: credits.length, clips: clipN, posters: credits.filter(c => c.poster).length, headshots: headshots.length, stills: stills.length, reel: reel ? 1 : 0, films: films.length, writing: writing.length, missing: missing.length, moved: moved.length } };
  };

  /* ---------- the site's files ---------- */
  const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', pdf: 'application/pdf' };
  S.typeOf = p => TYPES[String(p).split('.').pop().toLowerCase()] || '';
  /* a folder (the site's folder, picked whole): paths relative to the folder that holds the index.html with the data */
  S.fromFolder = async function (list) {
    const files = Array.from(list || []), idx = files.filter(f => /(^|\/)index\.html?$/i.test(f.webkitRelativePath || f.name));
    let html = '', root = '';
    for (const f of idx.sort((a, b) => (a.webkitRelativePath || a.name).length - (b.webkitRelativePath || b.name).length)) { const t = await f.text(); if (S.extract(t)) { html = t; const r = f.webkitRelativePath || f.name; root = r.slice(0, r.length - f.name.length); break; } }
    const map = new Map(); files.forEach(f => { const r = f.webkitRelativePath || f.name; if (!root || r.startsWith(root)) map.set(norm(r.slice(root.length)), f); });
    return { html, has: p => map.has(norm(p)), get: async p => { const f = map.get(norm(p)); return f ? new Blob([f], { type: f.type || S.typeOf(p) }) : null; }, size: files.reduce((n, f) => n + f.size, 0) };
  };
  /* a zip (GitHub's Download ZIP, or your own): read from the end, one file at a time, so a big site never sits in memory whole */
  S.fromZip = async function (file) {
    const len = file.size, tailN = Math.min(len, 65557 + 22), tail = new Uint8Array(await file.slice(len - tailN).arrayBuffer()), tv = new DataView(tail.buffer);
    let e = -1; for (let i = tail.length - 22; i >= 0; i--) if (tv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw Error('That isn\'t a zip.');
    const n = tv.getUint16(e + 10, true), cdSize = tv.getUint32(e + 12, true), cdOff = tv.getUint32(e + 16, true);
    const cd = new Uint8Array(await file.slice(cdOff, cdOff + cdSize).arrayBuffer()), v = new DataView(cd.buffer), dec = new TextDecoder(), list = [];
    let p = 0; for (let k = 0; k < n; k++) { if (v.getUint32(p, true) !== 0x02014b50) throw Error('The zip is broken.');
      const meth = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      list.push({ name: dec.decode(cd.subarray(p + 46, p + 46 + nl)), meth, csize, size, off }); p += 46 + nl + xl + cl; }
    const read = async it => { const h = new DataView(await file.slice(it.off, it.off + 30).arrayBuffer()), st = it.off + 30 + h.getUint16(26, true) + h.getUint16(28, true), raw = file.slice(st, st + it.csize);
      if (it.meth === 0) return raw; if (it.meth !== 8 || typeof DecompressionStream === 'undefined') return null;
      return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob(); };
    let html = '', root = '';
    for (const it of list.filter(x => /(^|\/)index\.html?$/i.test(x.name)).sort((a, b) => a.name.length - b.name.length)) { const b = await read(it); if (!b) continue; const t = await b.text(); if (S.extract(t)) { html = t; root = it.name.replace(/[^/]*$/, ''); break; } }
    const map = new Map(); list.forEach(it => { if (!/\/$/.test(it.name) && (!root || it.name.startsWith(root))) map.set(norm(it.name.slice(root.length)), it); });
    return { html, has: p => map.has(norm(p)), get: async p => { const it = map.get(norm(p)); if (!it) return null; const b = await read(it); return b ? new Blob([b], { type: S.typeOf(p) }) : null; }, size: len };
  };

  g.SiteImport = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
