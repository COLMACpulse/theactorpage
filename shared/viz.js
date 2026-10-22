/* THEACTORPAGE THE VIZ: what you want, where you can see it. A show, a film, someone to work with, a kind of role, a
   milestone: in your words, with your own picture (a screenshot, a photo). Nothing is fetched, nothing ships with the site.
   The wall keeps the trail as it happens, with dates: want it, in the room, booked. Booked stays up, with its date.
   It talks to the rest: an audition request for a show on your wall says so (THIS WEEK), the news that names it is
   found when you tap CHECK THE NEWS (THE WIRE, the same public file for everyone), its casting office can be a CONTACT,
   and you pick which ones go on your reps sheet.
   SHAMELESS PLUG, any time: it's going to air, a new headshot, something you worked on, other news. The plug is
   your words with the facts dropped in: [TITLE] [ROLE] [WHEN] [DATE] [TIME] [WHERE] [BY]. The page never writes it.
   Your way of saying it can be kept for each kind of plug.
   No scores, no odds. localStorage theactorpage_viz_v1; pictures in IndexedDB theactorpage_viz / pics.
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const G = {}, KEY = 'theactorpage_viz_v1', DB = 'theactorpage_viz';
  G.KEY = KEY; G.DB = DB;
  G.KINDS = [['show', 'A show'], ['film', 'A film'], ['person', 'Someone to work with'], ['role', 'A kind of role'], ['milestone', 'A milestone'], ['other', 'Something else']];
  const STEPS = {
    show: [['wanted', 'Want it'], ['room', 'In the room'], ['booked', 'Booked']],
    film: [['wanted', 'Want it'], ['room', 'In the room'], ['booked', 'Booked']],
    role: [['wanted', 'Want it'], ['room', 'In the room'], ['booked', 'Booked']],
    person: [['wanted', 'Want it'], ['met', 'Met'], ['worked', 'Worked with']],
    milestone: [['wanted', 'Want it'], ['got', 'Got it']],
    other: [['wanted', 'Want it'], ['got', 'Got it']]
  };
  G.steps = kind => STEPS[kind] || STEPS.other;
  G.kindName = k => (G.KINDS.find(x => x[0] === k) || ['', 'Something else'])[1];
  G.TOKENS = [['[TITLE]', 'the title'], ['[ROLE]', 'your role'], ['[WHEN]', 'next Friday night at 10:00 PM'], ['[DATE]', 'Friday, Nov 14'], ['[TIME]', '10:00 PM'], ['[WHERE]', 'where: the network, the app, the theater'], ['[BY]', 'who shot it']];
  G.PLUGKINDS = [['airing', 'It\'s going to air'], ['headshot', 'A new headshot'], ['worked', 'Something I worked on'], ['news', 'Other news']];
  /* which facts each kind of plug asks for */
  G.PLUGFIELDS = { airing: ['title', 'role', 'date', 'time', 'where'], headshot: ['by'], worked: ['title', 'role', 'where'], news: ['title', 'date', 'where'] };
  const TOK = { title: '[TITLE]', role: '[ROLE]', date: '[DATE]', time: '[TIME]', where: '[WHERE]', by: '[BY]' };
  G.tokensFor = k => { const f = G.PLUGFIELDS[k] || G.PLUGFIELDS.news, t = f.map(x => TOK[x]); if (f.includes('date')) t.splice(t.indexOf('[DATE]'), 0, '[WHEN]'); return G.TOKENS.filter(x => t.includes(x[0])); };
  G.plugKindName = k => (G.PLUGKINDS.find(x => x[0] === k) || ['', 'Other news'])[1];
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const now = () => Date.now();
  const uid = () => 'w' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  G.iso = iso;
  const diff = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);

  /* ---------- storage ---------- */
  const blank = () => ({ wishes: [], plugs: [], shapes: {}, wall: { head: 'THE VIZ', got: true }, news: {}, at: 0 });
  function read() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.wishes)) return Object.assign(blank(), d); } catch (e) { } return blank(); }
  function write(d) { d.at = now(); try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  G.read = read;
  G.all = () => read().wishes.slice();
  G.get = id => read().wishes.find(w => w.id === id) || null;
  G.add = function (w) {
    const title = clean(w && w.title); if (!title) return null;
    const d = read(), kind = STEPS[w.kind] ? w.kind : 'show';
    const it = Object.assign({ id: uid(), title, kind, aka: [], note: '', role: '', pic: '', cid: '', reps: false, trail: { wanted: iso(new Date()) }, added: now() }, w, { title, kind });
    if (!it.trail || !it.trail.wanted) it.trail = Object.assign({ wanted: iso(new Date()) }, it.trail || {});
    d.wishes.push(it); write(d); return it;
  };
  G.set = function (id, patch) { const d = read(), w = d.wishes.find(x => x.id === id); if (!w) return null; Object.assign(w, patch); if (patch.title !== undefined) w.title = clean(patch.title) || w.title; write(d); return w; };
  G.remove = function (id) { const d = read(); d.wishes = d.wishes.filter(w => w.id !== id); delete d.news[id]; write(d); };
  /* a step on the trail, with its date (today if none); '' takes it off */
  G.mark = function (id, step, date) { const w = G.get(id); if (!w) return null; const t = Object.assign({}, w.trail); if (date === '') delete t[step]; else t[step] = date || iso(new Date()); return G.set(id, { trail: t }); };
  /* your way of saying it, kept per kind of plug */
  G.keepShape = (kind, t) => { const d = read(); d.shapes = Object.assign({}, d.shapes, { [kind]: String(t || '').trim() }); write(d); };
  G.shapeFor = kind => (read().shapes || {})[kind] || '';
  /* plugs */
  G.plugs = () => read().plugs.slice().sort((a, b) => b.made - a.made);
  G.plugGet = id => read().plugs.find(p => p.id === id) || null;
  G.plugAdd = function (p) {
    p = p || {}; const kind = G.PLUGFIELDS[p.kind] ? p.kind : 'news', d = read();
    const it = Object.assign({ id: 'q' + uid().slice(1), kind, title: '', role: '', by: '', date: '', time: '', where: '', pic: '', you: '', wid: '', text: G.shapeFor(kind), made: now() }, p, { kind });
    ['title', 'role', 'by', 'where'].forEach(k => { it[k] = clean(it[k]); });
    d.plugs.push(it); write(d); return it;
  };
  G.plugSet = function (id, patch) { const d = read(), p = d.plugs.find(x => x.id === id); if (!p) return null; Object.assign(p, patch); write(d); return p; };
  G.plugRemove = async function (id) { const p = G.plugGet(id); if (p && p.pic) await op('readwrite', st => st.delete(p.pic)); const d = read(); d.plugs = d.plugs.filter(x => x.id !== id); write(d); };
  G.plugsFor = wid => G.plugs().filter(p => p.wid === wid);
  G.setWall = patch => { const d = read(); d.wall = Object.assign({}, d.wall, patch); write(d); return d.wall; };
  G.wall = () => read().wall;
  G.setNews = function (id, items) { const d = read(); d.news[id] = items; write(d); };
  G.newsFor = id => read().news[id] || [];

  /* where it is on the trail: the furthest step with a date */
  G.at = function (w) { const s = G.steps(w.kind); let k = 0; s.forEach((x, i) => { if (w.trail && w.trail[x[0]]) k = i; }); return { i: k, step: s[k][0], label: s[k][1], date: (w.trail || {})[s[k][0]] || '', last: k === s.length - 1 }; };
  G.got = w => G.at(w).last && G.at(w).i > 0;
  G.wanted = () => G.all().filter(w => !G.got(w));
  G.gotten = () => G.all().filter(w => G.got(w)).sort((a, b) => String(G.at(b).date).localeCompare(String(G.at(a).date)));

  /* ---------- matching a title, whole words ---------- */
  const words = s => String(s || '').toLowerCase().replace(/[’']/g, '').replace(/&/g, ' and ').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const phrase = (text, p) => { const t = words(text), q = words(p); if (!q.length || !t.length) return false; for (let i = 0; i + q.length <= t.length; i++) { let k = 0; while (k < q.length && t[i + k] === q[k]) k++; if (k === q.length) return true; } return false; };
  const names = w => [w.title].concat(w.aka || []).map(clean).filter(Boolean);
  /* a request's title: it names the show */
  G.forRequest = function (title, list) { const t = clean(title); if (!t) return null; return (list || G.all()).find(w => (w.kind === 'show' || w.kind === 'film') && names(w).some(n => phrase(t, n) || phrase(n, t))) || null; };
  /* a news story: a title of two words or more, as a phrase; a one-word title only when the story puts it in quotes, the way the trades do */
  G.inNews = function (text, w) {
    const t = String(text || '');
    return names(w).some(n => {
      if (words(n).length > 1) return phrase(t, n);
      const e = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('[\'"‘“]' + e + '[\'"’”:,!?. ]', 'i').test(t + ' ');
    });
  };
  G.newsMatches = function (wire, list) {
    const out = {}; (list || G.all()).forEach(w => { if (w.kind === 'role' || w.kind === 'milestone' || w.kind === 'other') return;
      const src = id => { const x = (wire.sources || []).find(s => s && s.id === id); return clean(x ? (x.label || x.name) : ''); };
      const tagged = i => (i.tags || []).some(t => names(w).some(n => clean(t).toLowerCase() === n.toLowerCase()));
      const hits = (wire && wire.items || []).filter(i => i.kind !== 'taxcredit' && (tagged(i) || G.inNews([i.title, i.summary].filter(Boolean).join(' . '), w))).slice(0, 6).map(i => ({ id: i.id, t: clean(i.title), url: /^https?:\/\//.test(i.link || i.url || '') ? (i.link || i.url) : '', src: src(i.src), at: String(i.date || '').slice(0, 10) }));
      if (hits.length) out[w.id] = hits; });
    return out;
  };

  /* ---------- the plug ---------- */
  G.timeLabel = function (t) { const m = String(t || '').match(/^(\d{1,2}):(\d\d)/); if (!m) return clean(t); let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap; };
  G.dateLabel = d => { const m = String(d || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? DAYS[new Date(d + 'T12:00:00').getDay()] + ', ' + MON[+m[2] - 1] + ' ' + (+m[3]) : ''; };
  /* "tonight", "tomorrow night", "this Friday night", "next Friday night", "Friday, Nov 14", plus " at 10:00 PM" */
  G.when = function (date, time, day) {
    day = day || iso(new Date()); if (!/^\d{4}-\d\d-\d\d/.test(date || '')) return '';
    const n = diff(day, date); if (n < 0) return '';
    const hr = (String(time || '').match(/^(\d{1,2}):/) || [])[1], night = hr !== undefined && +hr >= 17, dn = DAYS[new Date(date + 'T12:00:00').getDay()];
    /* weeks run Monday to Sunday: "this Friday" is this week, "next Friday" is the week after */
    const wk = d => Math.floor((Date.parse(d + 'T12:00:00') / 864e5 + 3) / 7), dw = wk(date) - wk(day), nt = night ? ' night' : '';
    let w = n === 0 ? (night ? 'tonight' : 'today') : n === 1 ? 'tomorrow' + nt : dw === 0 ? 'this ' + dn + nt : dw === 1 ? 'next ' + dn + nt : G.dateLabel(date);
    return w + (time ? ' at ' + G.timeLabel(time) : '');
  };
  /* your words with the facts in. -> {text, missing:[token]} */
  G.plug = function (shape, p, day) {
    p = p || {}; const a = p.air || p, t = clean(p.title);
    const v = { '[TITLE]': t, '[SHOW]': t, '[ROLE]': clean(p.role), '[WHEN]': G.when(a.date, a.time, day), '[DATE]': G.dateLabel(a.date), '[TIME]': a.time ? G.timeLabel(a.time) : '', '[WHERE]': clean(a.where), '[BY]': clean(p.by) };
    const missing = [];
    const text = String(shape || '').replace(/\[(TITLE|SHOW|ROLE|WHEN|DATE|TIME|WHERE|BY)\]/gi, m => { const k = m.toUpperCase(); if (!v[k]) { if (!missing.includes(k)) missing.push(k); return k; } return v[k]; });
    return { text: text.trim(), missing };
  };

  /* ---------- for THIS WEEK and the reps sheet ---------- */
  /* a plug for something airing in the next 7 days */
  G.airing = function (day, list) { day = day || iso(new Date()); return (list || G.plugs()).filter(p => p.kind === 'airing' && p.date && diff(day, p.date) >= 0 && diff(day, p.date) <= 7); };
  G.forReps = list => (list || G.all()).filter(w => w.reps && !G.got(w) && (w.kind === 'show' || w.kind === 'film' || w.kind === 'person' || w.kind === 'role')).map(w => ({ title: clean(w.title), kind: w.kind, note: clean(w.note) }));
  /* a booking, as a credit for your résumé */
  G.credit = (p, film) => ({ section: film ? 'Film' : 'Television', title: clean(p.title), role: clean(p.role) });
  /* a plug made from something on your wall */
  G.plugFrom = function (w) { return { kind: G.got(w) ? (w.kind === 'show' || w.kind === 'film' ? 'airing' : 'news') : 'news', title: w.title, role: w.role || '', wid: w.id }; };

  /* ---------- pictures, on this device ---------- */
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise(res => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('pics'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
    return dbp;
  }
  const op = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise(res => { try { const t = d.transaction('pics', mode), r = fn(t.objectStore('pics')); t.oncomplete = () => res(r && r.result !== undefined ? r.result : true); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  async function shrink(file, max) {
    if (g.You && g.You.shrink) return g.You.shrink(file, max);
    try { const bm = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bm.width, bm.height)), w = Math.round(bm.width * k), h = Math.round(bm.height * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bm, 0, 0, w, h);
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)); return b ? { blob: b, w, h } : null; } catch (e) { return null; }
  }
  /* -> {ok} or {error} */
  async function keepPic(file) {
    const s = await shrink(file, 1400); if (!s) return { error: /heic|heif/i.test((file && (file.name || file.type)) || '') ? 'this browser can\'t open HEIC photos; export it as JPEG from Photos' : 'not a picture this browser can open' };
    const pid = 'p' + now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (!(await op('readwrite', st => st.put(s.blob, pid)))) return { error: 'this phone would not keep the picture' };
    return { pid, w: s.w, h: s.h };
  }
  G.setPic = async function (id, file) {
    const w = G.get(id); if (!w) return { error: 'not on your wall' };
    const k = await keepPic(file); if (k.error) return k;
    if (w.pic) await op('readwrite', st => st.delete(w.pic));
    G.set(id, { pic: k.pid, picW: k.w, picH: k.h }); return { ok: true };
  };
  G.plugPic = async function (id, file) {
    const p = G.plugGet(id); if (!p) return { error: 'no such plug' };
    const k = await keepPic(file); if (k.error) return k;
    if (p.pic) await op('readwrite', st => st.delete(p.pic));
    G.plugSet(id, { pic: k.pid, you: '', nopic: false }); return { ok: true };
  };
  G.plugNoPic = async function (id) { const p = G.plugGet(id); if (!p) return; if (p.pic) await op('readwrite', st => st.delete(p.pic)); G.plugSet(id, { pic: '', you: '', nopic: true }); };
  /* the plug's picture: its own, else the headshot you picked, else its wall picture */
  G.plugBlob = async function (p) {
    if (!p || p.nopic) return null;
    if (p.pic) return G.picBlob(p.pic);
    if (p.you && g.You && g.You.photoBlob) return g.You.photoBlob(p.you);
    if (p.wid) { const w = G.get(p.wid); if (w && w.pic) return G.picBlob(w.pic); }
    return null;
  };
  G.picBlob = pid => pid ? op('readonly', st => st.get(pid)) : Promise.resolve(null);
  G.dropPic = async function (id) { const w = G.get(id); if (w && w.pic) { await op('readwrite', st => st.delete(w.pic)); G.set(id, { pic: '' }); } };
  G.removeAll = async function (id) { await G.dropPic(id); G.remove(id); };

  g.Viz = G;
  if (typeof module !== 'undefined') module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
