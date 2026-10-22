/* THEACTORPAGE GET SOME: what you want, where you can see it. A show, a film, someone to work with, a kind of role, a
   milestone: in your words, with your own picture (a screenshot, a photo). Nothing is fetched, nothing ships with the site.
   The wall keeps the trail as it happens, with dates: want it, in the room, booked. Booked stays up, with its date.
   It talks to the rest: an audition request for a show on your wall says so (THIS WEEK), the news that names it is
   found when you tap CHECK THE NEWS (THE WIRE, the same public file for everyone), its casting office can be a CONTACT,
   and you pick which ones go on your reps sheet.
   SHAMELESS PLUG: when a booking is going to air, the plug is your words with the facts dropped in:
   [SHOW] [ROLE] [WHEN] [DATE] [TIME] [WHERE]. The page never writes the plug for you.
   No scores, no odds. localStorage theactorpage_getsome_v1; pictures in IndexedDB theactorpage_getsome / pics.
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const G = {}, KEY = 'theactorpage_getsome_v1', DB = 'theactorpage_getsome';
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
  G.TOKENS = [['[SHOW]', 'the title'], ['[ROLE]', 'your role'], ['[WHEN]', 'next Friday night at 10:00 PM'], ['[DATE]', 'Friday, Nov 14'], ['[TIME]', '10:00 PM'], ['[WHERE]', 'the network or app']];
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const now = () => Date.now();
  const uid = () => 'w' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  G.iso = iso;
  const diff = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);

  /* ---------- storage ---------- */
  const blank = () => ({ wishes: [], plug: '', wall: { head: 'GET SOME', got: true }, news: {}, at: 0 });
  function read() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.wishes)) return Object.assign(blank(), d); } catch (e) { } return blank(); }
  function write(d) { d.at = now(); try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  G.read = read;
  G.all = () => read().wishes.slice();
  G.get = id => read().wishes.find(w => w.id === id) || null;
  G.add = function (w) {
    const title = clean(w && w.title); if (!title) return null;
    const d = read(), kind = STEPS[w.kind] ? w.kind : 'show';
    const it = Object.assign({ id: uid(), title, kind, aka: [], note: '', role: '', pic: '', cid: '', reps: false, trail: { wanted: iso(new Date()) }, air: { date: '', time: '', where: '' }, plug: '', added: now() }, w, { title, kind });
    if (!it.trail || !it.trail.wanted) it.trail = Object.assign({ wanted: iso(new Date()) }, it.trail || {});
    d.wishes.push(it); write(d); return it;
  };
  G.set = function (id, patch) { const d = read(), w = d.wishes.find(x => x.id === id); if (!w) return null; Object.assign(w, patch); if (patch.title !== undefined) w.title = clean(patch.title) || w.title; write(d); return w; };
  G.remove = function (id) { const d = read(); d.wishes = d.wishes.filter(w => w.id !== id); delete d.news[id]; write(d); };
  /* a step on the trail, with its date (today if none); '' takes it off */
  G.mark = function (id, step, date) { const w = G.get(id); if (!w) return null; const t = Object.assign({}, w.trail); if (date === '') delete t[step]; else t[step] = date || iso(new Date()); return G.set(id, { trail: t }); };
  G.setPlug = t => { const d = read(); d.plug = String(t || ''); write(d); };
  G.plugShape = () => read().plug;
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
  G.plug = function (shape, w, day) {
    const a = (w && w.air) || {}, v = { '[SHOW]': clean(w && w.title), '[ROLE]': clean(w && w.role), '[WHEN]': G.when(a.date, a.time, day), '[DATE]': G.dateLabel(a.date), '[TIME]': a.time ? G.timeLabel(a.time) : '', '[WHERE]': clean(a.where) };
    const missing = [];
    const text = String(shape || '').replace(/\[(SHOW|ROLE|WHEN|DATE|TIME|WHERE)\]/gi, m => { const k = m.toUpperCase(); if (!v[k]) { if (!missing.includes(k)) missing.push(k); return m.toUpperCase(); } return v[k]; });
    return { text: text.trim(), missing };
  };

  /* ---------- for THIS WEEK and the reps sheet ---------- */
  /* booked and airing in the next 7 days */
  G.airing = function (day, list) { day = day || iso(new Date()); return (list || G.all()).filter(w => w.air && w.air.date && G.got(w) && diff(day, w.air.date) >= 0 && diff(day, w.air.date) <= 7); };
  G.forReps = list => (list || G.all()).filter(w => w.reps && !G.got(w) && (w.kind === 'show' || w.kind === 'film' || w.kind === 'person' || w.kind === 'role')).map(w => ({ title: clean(w.title), kind: w.kind, note: clean(w.note) }));
  /* a booking, as a credit for your résumé */
  G.credit = w => ({ section: w.kind === 'film' ? 'Film' : 'Television', title: clean(w.title), role: clean(w.role) });

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
  G.setPic = async function (id, file) {
    const w = G.get(id); if (!w) return { error: 'not on your wall' };
    const s = await shrink(file, 1400); if (!s) return { error: /heic|heif/i.test((file && (file.name || file.type)) || '') ? 'this browser can\'t open HEIC photos; export it as JPEG from Photos' : 'not a picture this browser can open' };
    const pid = 'p' + now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (!(await op('readwrite', st => st.put(s.blob, pid)))) return { error: 'this phone would not keep the picture' };
    if (w.pic) await op('readwrite', st => st.delete(w.pic));
    G.set(id, { pic: pid, picW: s.w, picH: s.h }); return { ok: true };
  };
  G.picBlob = pid => pid ? op('readonly', st => st.get(pid)) : Promise.resolve(null);
  G.dropPic = async function (id) { const w = G.get(id); if (w && w.pic) { await op('readwrite', st => st.delete(w.pic)); G.set(id, { pic: '' }); } };
  G.removeAll = async function (id) { await G.dropPic(id); G.remove(id); };

  g.GetSome = G;
  if (typeof module !== 'undefined') module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
