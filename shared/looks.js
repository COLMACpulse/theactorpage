/* THEACTORPAGE LOOKS: for commercial work, only when you open it. Each look in your words: its name, its photos, the
   skills that go with it (each with a clip if you have one), the spots it fits, where you want to take it, your notes.
   Nothing is suggested or filled in for you: no types, no looks, no skills, no advice on how to look. No score.
   THE LOOK BOOK: the looks you tick, in your order (it starts with four), as one page an agent opens. Your union,
   height, sizes and local hire go on it only if you switch that on. Your rep from YOU.
   localStorage theactorpage_looks_v1; photos and clips you add here in IndexedDB theactorpage_looks / media.
   Photos can also come from YOU (your headshots and stills), by reference. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const L = {}, KEY = 'theactorpage_looks_v1', DB = 'theactorpage_looks';
  L.KEY = KEY; L.DB = DB; L.BOOK_MAX = 4;
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const uid = p => (p || 'k') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const blank = () => ({ looks: [], book: { stats: false, sizes: '', reel: '', title: '' }, at: 0 });
  function read() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.looks)) { const b = blank(); d.book = Object.assign(b.book, d.book || {}); return Object.assign(b, d); } } catch (e) { } return blank(); }
  function write(d) { d.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  L.all = () => read().looks.slice();
  L.get = id => read().looks.find(x => x.id === id) || null;
  L.add = function (name) {
    const n = clean(name); if (!n) return null; const d = read();
    const it = { id: uid('l'), name: n, photos: [], skills: [], spots: '', next: '', notes: '', inBook: true, added: Date.now() };
    d.looks.push(it); write(d); return it;
  };
  L.set = function (id, patch) { const d = read(), x = d.looks.find(l => l.id === id); if (!x) return null; Object.assign(x, patch); if (patch.name !== undefined) x.name = clean(patch.name) || x.name; write(d); return x; };
  L.remove = async function (id) { const x = L.get(id); if (x) { for (const p of x.photos) if (/^lk:/.test(p)) await L.drop(p); for (const s of x.skills) if (s.clip) await L.drop(s.clip); } const d = read(); d.looks = d.looks.filter(l => l.id !== id); write(d); };
  L.move = function (id, by) { const d = read(), i = d.looks.findIndex(l => l.id === id), j = i + by; if (i < 0 || j < 0 || j >= d.looks.length) return; const [x] = d.looks.splice(i, 1); d.looks.splice(j, 0, x); write(d); };
  L.addPhoto = (id, ref) => { const x = L.get(id); if (!x || !ref || x.photos.includes(ref)) return x; return L.set(id, { photos: x.photos.concat([ref]) }); };
  L.dropPhoto = async (id, ref) => { const x = L.get(id); if (!x) return; if (/^lk:/.test(ref)) await L.drop(ref); L.set(id, { photos: x.photos.filter(p => p !== ref) }); };
  L.mainPhoto = (id, ref) => { const x = L.get(id); if (!x || !x.photos.includes(ref)) return; L.set(id, { photos: [ref].concat(x.photos.filter(p => p !== ref)) }); };
  L.addSkill = (id, name) => { const x = L.get(id), n = clean(name); if (!x || !n) return null; const s = { id: uid('s'), name: n, clip: '' }; L.set(id, { skills: x.skills.concat([s]) }); return s; };
  L.setSkill = (id, sid, patch) => { const x = L.get(id); if (!x) return; L.set(id, { skills: x.skills.map(s => s.id === sid ? Object.assign({}, s, patch) : s) }); };
  L.dropSkill = async (id, sid) => { const x = L.get(id); if (!x) return; const s = x.skills.find(k => k.id === sid); if (s && s.clip) await L.drop(s.clip); L.set(id, { skills: x.skills.filter(k => k.id !== sid) }); };
  L.book = () => read().book;
  L.setBook = patch => { const d = read(); d.book = Object.assign({}, d.book, patch); write(d); return d.book; };
  /* the looks that go in the book: ticked, in your order, the first four */
  L.inBook = list => (list || L.all()).filter(l => l.inBook).slice(0, L.BOOK_MAX);
  /* the facts line: only what you have and only if you switched it on */
  L.stats = function (you, book) {
    you = you || {}; book = book || {}; if (!book.stats) return [];
    return [['Union', you.union], ['Height', you.height], ['Sizes', book.sizes], ['Local', you.locations]].filter(x => clean(x[1])).map(x => [x[0], clean(x[1])]);
  };
  /* every skill across the looks, once each, in the order they first appear */
  L.allSkills = function (list) { const seen = new Set(), out = []; (list || []).forEach(l => l.skills.forEach(s => { const k = s.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(s.name); } })); return out; };

  /* ---------- the look book page: plain, printable, no scripts ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* m: {name, rep, page, stats:[[k,v]], reel:{u}|{url}, looks:[{name, spots, photos:[url], skills:[{name, clip:url|''}]}]} */
  L.html = function (m) {
    m = m || {}; const looks = m.looks || [], all = [];
    looks.forEach(l => (l.skills || []).forEach(s => { if (!all.some(x => x.toLowerCase() === s.name.toLowerCase())) all.push(s.name); }));
    const cols = Math.max(3, Math.min(looks.length, 4));
    let lb = 0; const LB = [];
    const clipLink = (s, look) => { if (!s.clip) return `<li class="sk none"><span class="dot"></span>${esc(s.name)}</li>`; const id = 'c' + (++lb); LB.push(`<div class="lbx" id="${id}"><a class="lbclose" href="#close" aria-label="Close">&times;</a><video src="${esc(s.clip)}" controls preload="none" playsinline></video><p>${esc(look)} · ${esc(s.name)}</p></div>`); return `<li class="sk"><a href="#${id}"><span class="dot">&#9654;</span>${esc(s.name)}</a></li>`; };
    const reel = m.reel && (m.reel.u || m.reel.url) ? (m.reel.u ? (() => { const id = 'reel'; LB.push(`<div class="lbx" id="${id}"><a class="lbclose" href="#close" aria-label="Close">&times;</a><video src="${esc(m.reel.u)}" controls preload="none" playsinline></video></div>`); return `<a href="#reel">Watch the reel &rarr;</a>`; })() : `<a href="${esc(m.reel.url)}" target="_blank" rel="noopener">Watch the reel &rarr;</a>`) : '';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Look book' + (m.name ? ' · ' + esc(m.name) : '') + '</title><style>'
      + 'body{margin:0;background:#F2F0EA;color:#16161A;font:16px/1.5 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}main{max-width:1100px;margin:0 auto}.stripe{height:6px;background:#D2694E}'
      + 'header{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px 30px;padding:34px 40px 24px;border-bottom:1px solid #D8D4CA}.k{font:700 12px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.24em;color:#6E6A63;text-transform:uppercase}'
      + 'h1{font-weight:800;font-size:clamp(36px,6vw,60px);line-height:.94;letter-spacing:-.035em;margin:6px 0 0;text-transform:uppercase}dl{display:grid;grid-template-columns:auto auto;gap:4px 14px;margin:0;font:13px ui-monospace,Menlo,Consolas,monospace}dt{color:#6E6A63;letter-spacing:.12em;text-transform:uppercase}dd{margin:0}'
      + '.looks{display:grid;grid-template-columns:repeat(' + cols + ',minmax(0,1fr));gap:26px;padding:30px 40px}@media(max-width:800px){.looks{grid-template-columns:1fr 1fr}}@media(max-width:520px){.looks{grid-template-columns:1fr}}'
      + 'article{display:flex;flex-direction:column;gap:10px}.main{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;background:#E4E0D6}.more{display:grid;grid-template-columns:1fr 1fr;gap:6px}.more img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#222}'
      + 'h2{margin:4px 0 0;font-size:22px}.spots{margin:0;font:12.5px ui-monospace,Menlo,Consolas,monospace;color:#6E6A63}ul{list-style:none;margin:2px 0 0;padding:0;display:grid;gap:6px}.sk a{display:flex;gap:8px;align-items:center;color:#16161A;text-decoration:none}.sk a:hover{text-decoration:underline}.sk.none{display:flex;gap:8px;align-items:center;color:#6E6A63}'
      + '.dot{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#16161A;color:#F2F0EA;align-items:center;justify-content:center;font-size:10px;flex:none}.sk.none .dot{background:none;border:1px solid #B9B4A8}'
      + '.foot{margin:0 40px;padding:22px 0;border-top:1px solid #D8D4CA;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}.end{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding:18px 40px 26px;border-top:1px solid #D8D4CA;font:12.5px ui-monospace,Menlo,Consolas,monospace}a{color:#1F3D63}'
      + '.lbx{display:none;position:fixed;inset:0;background:#0a0a0a;z-index:9;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:56px 4vw 4vh}.lbx:target{display:flex}.lbx video{width:min(1000px,100%);max-height:80vh;background:#000}.lbx p{color:#ddd;margin:0;font-size:14px}.lbclose{position:absolute;top:10px;right:18px;color:#fff;font-size:38px;text-decoration:none}'
      + '@media print{body{background:#fff}.lbx,.dot{display:none!important}.sk a{color:#16161A}}</style></head><body><main><div class="stripe"></div>'
      + '<header><div><div class="k">Look book · commercial</div><h1>' + esc(m.name || '') + '</h1></div>' + ((m.stats || []).length ? '<dl>' + m.stats.map(s => '<dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd>').join('') + '</dl>' : '') + '</header>'
      + '<section class="looks">' + looks.map(l => '<article>' + (l.photos[0] ? '<img class="main" src="' + esc(l.photos[0]) + '" alt="' + esc(l.name) + '">' : '<div class="main"></div>') + (l.photos.length > 1 ? '<div class="more">' + l.photos.slice(1, 3).map(p => '<img src="' + esc(p) + '" alt="">').join('') + '</div>' : '')
        + '<h2>' + esc(l.name) + '</h2>' + (clean(l.spots) ? '<p class="spots">' + esc(l.spots) + '</p>' : '') + ((l.skills || []).length ? '<ul>' + l.skills.map(s => clipLink(s, l.name)).join('') + '</ul>' : '') + '</article>').join('') + '</section>'
      + ((all.length || reel) ? '<div class="foot">' + (all.length ? '<div><div class="k">Skills</div><div>' + all.map(esc).join(' · ') + '</div></div>' : '') + (reel ? '<div><div class="k">Commercial reel</div><div>' + reel + '</div></div>' : '') + '</div>' : '')
      + '<div class="end"><span>' + (m.rep ? 'Represented by ' + esc(m.rep) : esc(m.name || '')) + '</span>' + (m.page ? '<a href="' + esc(m.page) + '">' + esc(String(m.page).replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a>' : '') + '</div>'
      + '</main>' + LB.join('') + '<script>addEventListener("hashchange",function(){document.querySelectorAll(".lbx video").forEach(function(v){if(!v.closest(":target"))v.pause();});});<\/script></body></html>';
  };

  /* ---------- photos and clips you add here ---------- */
  let dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise(res => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); return dbp; }
  const op = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise(res => { try { const t = d.transaction('media', mode), r = fn(t.objectStore('media')); t.oncomplete = () => res(r && r.result !== undefined ? r.result : true); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  /* -> 'lk:<id>' or {error} */
  L.keep = async function (file) {
    if (!file) return { error: 'no file' }; let blob = file;
    if (/^image\//.test(file.type) && g.You && g.You.shrink) { const s = await g.You.shrink(file, 1800); if (!s) return { error: 'not a picture this browser can open' }; blob = s.blob; }
    else if (!/^(image|video)\//.test(file.type || '')) return { error: 'not a picture or a video' };
    const id = uid('m'); if (!(await op('readwrite', st => st.put(blob, id)))) return { error: 'this phone would not keep it' };
    return 'lk:' + id;
  };
  L.drop = ref => /^lk:/.test(ref || '') ? op('readwrite', st => st.delete(ref.slice(3))) : Promise.resolve();
  /* a ref -> its file: 'lk:<id>' here, 'you:<id>' a photo in YOU */
  L.blob = async function (ref) {
    if (/^lk:/.test(ref || '')) return op('readonly', st => st.get(ref.slice(3)));
    if (/^you:/.test(ref || '') && g.You && g.You.photoBlob) return g.You.photoBlob(ref.slice(4));
    return null;
  };

  g.Looks = L;
  if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
