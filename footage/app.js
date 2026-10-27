/* FOOTAGE: your library (Col, Oct 26: "a place that has all the user's footage, playable. Here's what I have, here's
   where it is, here's this and this put together. The building blocks for an actor's whole portfolio.")
   THE LIBRARY  every piece, by project: the files on your drives and the takes kept on this device. A piece with a copy
                here plays; one on a drive shows where its original is.
   A PIECE      plays (its copy here, or the original from a plugged-in drive); what it is, where the original is, what
                it's put together with. MAKE IT PLAYABLE makes a small copy (540p) from the original, only when you ask.
                TRIM A MOMENT (the clip lands in the library and Reel Room), PUT IT WITH, KEEP A STILL.
   PUT TOGETHER your own groupings, in order, played straight through.
   PLACES       the drives, folders and places you named; say what a folder is where its names don't.
   It reads lists of files. The originals never move; only the small copies you ask for are kept here. */
(function () {
  'use strict';
  const M = window.FootMap, Lb = window.FootLib, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { view: 'lib', key: '', place: '', set: '', trim: null, naming: false, renaming: false, q: '', msg: '', titles: [], roles: {}, adding: false, open: {}, busy: '', prog: 0, here: false, withOpen: false };
  const today = () => new Date().toISOString().slice(0, 10);
  const nice = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
  const n = (x, w) => x + ' ' + w + (x === 1 ? '' : 's');
  const len = s => { s = Math.round(+s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60; return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0') : m + ':' + String(r).padStart(2, '0'); };
  const DOTS = ['#2a5fa8', '#1f8a5c', '#d9b23a', '#c0392b', '#9aa0a8', '#5c636d', '#e8e6e0'];
  const dot = id => { const i = M.places().findIndex(p => p.id === id); return DOTS[(i < 0 ? 0 : i) % DOTS.length]; };
  const FSA = () => typeof window.showDirectoryPicker === 'function';
  const URLS = {}; const url = (k, b) => { if (URLS[k]) URL.revokeObjectURL(URLS[k]); URLS[k] = URL.createObjectURL(b); return URLS[k]; };
  let TR = { file: null, url: '', dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: [] };

  /* your projects: credits (Your page), Story Studio, Film Hub, the old Footage list, and ones you name */
  function gather() {
    const t = [], role = {}; const add = (x, r) => { x = String(x || '').trim(); if (!x) return; if (!t.some(y => M.norm(y) === M.norm(x))) t.push(x); if (r && !role[M.norm(x)]) role[M.norm(x)] = r; };
    const J = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    try { const s = J('film_os_v1'); if (s && s.scripts) Object.values(s.scripts).forEach(x => x && add(x.title || x.name, x.me)); } catch (e) { }
    try { const h = J('filmhub_v1'); if (h && h.films) h.films.forEach(f => add(f.title)); } catch (e) { }
    try { const o = J('theactorpage_footage_v1'); if (o && o.jobs) o.jobs.forEach(j => add(j.title, j.role)); } catch (e) { }
    M.mine().forEach(m => add(m));
    S.titles = t; S.roles = role;
  }

  /* ---------- every piece ---------- */
  function pieces() {
    const d = M.read(), out = [];
    d.places.forEach(p => { if (p.kind === 'named') return; (p.files || []).forEach(f => { const key = M.fkey(p.id, f.p), mt = d.meta[key] || {};
      out.push({ key, kind: 'file', name: f.p.split('/').pop(), path: f.p, place: p, s: f.s, d: f.d, title: M.what(d, p.id, f.p, S.titles), secs: mt.secs || 0, proxy: !!mt.proxy, cant: !!mt.cant, label: mt.label || '' }); }); });
    if (window.Takes) Takes.all().filter(x => x.kind === 'video' || x.kind === 'audio').forEach(x => { const key = 't:' + x.id, mt = d.meta[key] || {};
      out.push({ key, kind: 'take', audio: x.kind === 'audio', name: x.name || 'A take', take: x, s: x.size || 0, d: x.at ? new Date(x.at).toISOString().slice(0, 10) : '', title: (x.for && x.for.title) || '', secs: x.secs || mt.secs || 0, proxy: true, label: mt.label || whatTake(x) }); });
    return out;
  }
  const whatTake = x => { const t = x.for && x.for.type; return ({ clip: 'A clip', selftape: 'Self-tape', audition: 'Self-tape', vo: 'VO', reel: 'Reel', final: 'The finished film' })[t] || (x.kind === 'audio' ? 'Audio' : 'Video'); };
  const plays = p => p.kind === 'take' || p.proxy;
  const byKey = key => pieces().find(p => p.key === key) || null;
  function badge(p) {
    if (plays(p)) return '<span class="badge here">PLAYS HERE</span>';
    if (p.cant) return '<span class="badge cant">A BROWSER CAN\u2019T PLAY THIS ONE</span>';
    return '<span class="badge away">ORIGINAL ON ' + esc(p.place.name.toUpperCase()) + '</span>';
  }
  function tile(p) {
    return '<button type="button" class="tile" data-piece="' + esc(p.key) + '"><span class="th' + (p.audio ? ' au' : '') + '" data-thumb="' + esc(p.key) + '">' + (p.audio ? '<span class="wv" aria-hidden="true">' + '<b></b>'.repeat(18) + '</span>' : '<i class="pl" aria-hidden="true"></i>') + (p.secs ? '<span class="dur">' + len(p.secs) + '</span>' : '') + '</span>'
      + '<span class="ti"><b>' + esc(p.label && p.kind === 'file' ? p.label : p.name) + '</b><small>' + esc(p.kind === 'take' ? (p.label + (p.d ? ' · ' + nice(p.d) : '')) : (p.place.name + (p.d ? ' · ' + nice(p.d) : ''))) + '</small>' + badge(p) + '</span></button>';
  }

  /* ---------- the library ---------- */
  function libView() {
    const P = pieces(), m = M.map(S.titles), q = S.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const shown = P.filter(p => (!S.here || plays(p)) && (!q.length || q.every(w => (p.name + ' ' + (p.path || '') + ' ' + p.title + ' ' + p.label + ' ' + (p.place ? p.place.name : '') + ' ' + p.d).toLowerCase().indexOf(w) >= 0)));
    const total = P.reduce((a, p) => a + (p.secs || 0), 0), here = P.filter(plays).length, drives = M.places().filter(p => p.kind !== 'named').length;
    let h = '<p class="lsum">' + (P.length ? n(P.length, 'piece') + (total && P.every(x => x.secs) ? ' · ' + len(total) : '') + ' · ' + here + ' play here' + (drives ? ' · originals on ' + n(drives, 'drive') : '') : '') + '</p>';
    h += '<div class="lbar"><input class="field find" id="find" placeholder="Find: a show, a scene, a name, a date" value="' + esc(S.q) + '" autocomplete="off" aria-label="Find a piece"><button type="button" class="chip' + (S.here ? ' on' : '') + '" id="here">ONLY WHAT PLAYS HERE</button></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="grid lib"><div class="colA">';
    if (!P.length) h += '<div class="card first" data-stick><p class="kicker">Nothing in your library yet</p><b class="fbig">Bring in your clips. Pick as many as you want.</b><p class="dim" style="margin:6px 0 14px">Your self-tapes, scenes from set, the short you made. Each one gets a small copy that plays here any time; the original stays where it is.</p>'
      + '<label class="btn pri big" data-ic="plus">ADD YOUR CLIPS<input type="file" id="addvids0" accept="video/*,audio/*" multiple hidden></label><p class="faint small" style="margin:8px 0 0">Kept on this device. Nothing is uploaded anywhere. Takes you keep in Actor OS show up here on their own.</p>'
      + '<p class="dim small" style="margin:14px 0 0"><b>Then:</b> watch it, trim a moment, put moments together, make it one file and send it.</p></div>';
    else if (!shown.length) h += '<p class="empty">Nothing by that.</p>';
    const groups = {}; shown.forEach(p => { const k = p.title ? M.norm(p.title) : '~'; (groups[k] = groups[k] || { title: p.title, list: [] }).list.push(p); });
    Object.keys(groups).sort((a, b) => a === '~' ? 1 : b === '~' ? -1 : groups[a].title.localeCompare(groups[b].title)).forEach(k => { const g = groups[k], open = S.open[k] || q.length, L = open ? g.list : g.list.slice(0, 8);
      L.sort((a, b) => (plays(b) - plays(a)) || String(b.d).localeCompare(String(a.d)));
      h += '<section class="grp"><div class="gh"><b>' + esc(g.title || 'Not matched yet') + '</b><span>' + esc((g.title && S.roles[M.norm(g.title)] ? S.roles[M.norm(g.title)] + ' · ' : '') + n(g.list.length, 'piece')) + (g.title ? '' : ' · open a place and say what its folders are') + '</span></div><div class="tiles">' + L.map(tile).join('') + '</div>'
        + (g.list.length > L.length ? '<button type="button" class="lnk" data-more="' + esc(k) + '">ALL ' + g.list.length + ' \u203a</button>' : '') + '</section>'; });
    h += '</div><aside class="colB">';
    const sets = M.sets();
    h += '<p class="kicker">Put together</p>' + (sets.length ? sets.map(x => '<button type="button" class="card place" data-set="' + x.id + '"><span class="pt"><b>' + esc(x.name) + '</b><small>' + n(x.items.length, 'piece') + '</small></span><span class="ch">\u203a</span></button>').join('') : '<p class="dim small" style="margin:0 2px 10px">Your own groupings, in order: a project from audition to air, a character across jobs. Open a piece and PUT IT WITH.</p>');
    h += '<p class="kicker" style="margin-top:16px">Places</p>';
    M.places().forEach(p => { h += '<button type="button" class="card place" data-place="' + p.id + '"><i class="pdot" style="background:' + dot(p.id) + '"></i><span class="pt"><b>' + esc(p.name) + '</b><small>' + esc(p.kind === 'named' ? 'a place you named' + (p.note ? ' · ' + p.note : '') : n((p.files || []).length, 'video') + ' · ' + M.size(p.bytes) + (p.looked ? ' · looked ' + nice(p.looked) : '')) + '</small></span><span class="ch">\u203a</span></button>'; });
    h += '<label class="btn pri block" data-ic="plus" style="margin-bottom:8px">ADD YOUR CLIPS<input type="file" id="addvids" accept="video/*,audio/*" multiple hidden></label>'
      + (FSA() ? '<button type="button" class="btn block" id="adddrive_fsa" data-ic="footage" style="margin-bottom:8px">ADD A DRIVE OR FOLDER</button>' : '<label class="btn block" data-ic="footage" style="margin-bottom:8px">ADD A DRIVE OR FOLDER<input type="file" id="adddrive" webkitdirectory directory multiple hidden></label>')
      + (S.naming ? namingForm() : '<button type="button" class="btn block" id="name" data-ic="contacts">NAME A PLACE</button>')
      + '<p class="dim small" style="margin:10px 2px 0">A drive is read as a list of files: nothing is copied or uploaded, and the map keeps it when you unplug. Clips you add are kept here as small copies that play anywhere.</p>';
    if (m.titles.length || true) h += S.adding ? '<div class="row" style="margin-top:12px"><input class="field" id="mine" placeholder="A project: a reel, a class, a short" style="flex:1"><button class="btn" id="mineok">ADD IT</button></div>' : '<button type="button" class="lnk" id="addmine" style="margin-top:8px">+ a project that isn\u2019t in your credits</button>';
    h += '<details class="fold" id="checkfold" style="margin-top:16px"><summary data-icr="slate" data-icc="film" data-say="before you erase a card"><span data-icl>CHECK THE COPY</span></summary><p class="dim small" style="margin:0 0 10px">On your own shoot: every file on your copies has to match the card exactly before you erase it.</p><a class="btn" id="tocheck" href="check.html" style="text-decoration:none">OPEN CHECK THE COPY</a></details>';
    return h + '</aside></div>';
  }
  function namingForm() {
    return '<div class="card" id="namebox"><p class="kicker">A place that isn\u2019t on this computer</p><label class="lab" for="n_name">WHAT IT IS</label><input class="field" id="n_name" placeholder="Dropbox, your editor, the drive in the drawer">'
      + '<label class="lab" for="n_note">WHAT\u2019S THERE, IN YOUR WORDS</label><input class="field" id="n_note" placeholder="The cut, from production">'
      + '<p class="lab">WHICH PROJECTS</p><div class="chips">' + S.titles.map((t, i) => '<label class="chk"><input type="checkbox" data-holds="' + i + '"> ' + esc(t) + '</label>').join('') + '</div>'
      + '<div class="row"><button class="btn pri" id="n_keep">KEEP IT</button><button class="btn ghost" id="n_cancel">CANCEL</button></div></div>';
  }

  /* ---------- one piece ---------- */
  function pieceView(p) {
    const sets = M.setsWith(p.key), all = M.sets();
    let h = '<div class="backbar"><button class="btn sm ghost" id="back">\u2039 YOUR FOOTAGE</button><span class="kicker" style="margin:0">' + esc(p.title || 'Not matched yet') + '</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="grid"><div class="colA"><div class="stage" id="stage">';
    if (S.busy === p.key) h += '<div class="nostage"><p><b>Making a copy that plays anywhere.</b></p><p class="dim small">It plays the original through once, so it takes about as long as the piece. Keep this page open.</p><div class="prog"><i id="mk_bar" style="width:' + Math.round(S.prog * 100) + '%"></i></div></div>';
    else h += '<div class="nostage" id="nostage">' + (p.cant ? '<p><b>A browser can\u2019t play this one.</b></p><p class="dim small">Its format (often ProRes, RAW or MXF straight off a camera) needs an editor. Export an H.264 copy and add that, or keep it on the map as is.</p>' : '<p><b>The original is on ' + esc(p.place ? p.place.name : 'a drive') + '.</b></p><p class="dim small">Make a small copy (540p) to watch it here, on any device, any time. The original stays where it is.</p>') + '</div>';
    h += '</div>';
    if (p.kind === 'file' && !plays(p) && S.busy !== p.key) h += '<div class="row" style="margin-top:10px">' + (FSA() && p.place && p.place.handle ? '<button class="btn pri" id="mk_go" data-ic="footage">MAKE IT PLAYABLE</button><button class="btn" id="og_play">PLAY THE ORIGINAL</button>' : '<label class="btn pri" data-ic="footage">MAKE IT PLAYABLE<input type="file" id="mk_file" accept="video/*,audio/*,.mov,.mxf,.mts" hidden></label>') + '</div>'
      + (FSA() && p.place && p.place.handle ? '' : '<p class="faint small" style="margin:6px 2px 0">Pick ' + esc(p.name) + ' from ' + esc(p.place.name) + ' (it has to be plugged in).</p>');
    h += '<div class="row" style="margin-top:10px"><button class="btn" id="trimit"' + (plays(p) ? '' : ' disabled') + '>TRIM A MOMENT</button><button class="btn" id="withit">PUT IT WITH</button><button class="btn" id="stillit"' + (plays(p) && !p.audio ? '' : ' disabled') + '>KEEP A STILL</button><button class="btn" id="sendit"' + (plays(p) ? '' : ' disabled') + '>SEND IT</button><a class="btn ghost" href="../archbook/" style="text-decoration:none">REEL ROOM</a></div>';
    if (S.withOpen) h += '<div class="card" id="withbox" style="margin-top:12px"><p class="kicker">Put it with</p>' + all.map(x => '<label class="chk"><input type="checkbox" data-with="' + x.id + '"' + (x.items.indexOf(p.key) >= 0 ? ' checked' : '') + '> ' + esc(x.name) + ' <span class="faint small">' + n(x.items.length, 'piece') + '</span></label>').join('')
      + '<div class="row" style="margin-top:8px"><input class="field" id="newset" placeholder="Something new: Salt Road, start to air" style="flex:1"><button class="btn" id="newsetok">START IT</button></div></div>';
    h += '</div><div class="colB"><div class="card" data-stick>'
      + '<div class="irow"><b>WHAT IT IS</b><span><input class="field" id="lab" value="' + esc(p.label || '') + '" placeholder="In your words: Sc. 12, the diner"></span></div>'
      + '<div class="irow"><b>PROJECT</b><span>' + (p.kind === 'file' ? '<select id="proj" class="field"><option value="">Not matched</option>' + S.titles.map(t => '<option' + (M.norm(t) === M.norm(p.title) ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>' : esc(p.title || 'From ' + p.label)) + '</span></div>'
      + '<div class="irow"><b>PLAYING</b><span>' + (p.kind === 'take' ? 'Kept on this device' + (p.s ? ', ' + M.size(p.s) : '') + '.' : p.proxy ? 'The small copy on this device (540p' + (M.meta(p.key).psize ? ', ' + M.size(M.meta(p.key).psize) : '') + ').' : 'Nothing here yet.') + '</span></div>'
      + (p.kind === 'file' ? '<div class="irow"><b>THE ORIGINAL</b><span>' + esc(p.place.name) + ' \u00b7 ' + esc(p.path.split('/').slice(1).join('/') || p.path) + '<br>' + M.size(p.s) + (p.secs ? ' \u00b7 ' + len(p.secs) : '') + (p.d ? ' \u00b7 ' + nice(p.d) : '') + '</span></div>' : '')
      + '<div class="irow"><b>PUT TOGETHER</b><span>' + (sets.length ? sets.map(x => '<button type="button" class="lnk" data-set="' + x.id + '">' + esc(x.name) + '</button>').join(' \u00b7 ') : 'Not yet.') + '</span></div></div>'
      + (p.proxy && p.kind === 'file' ? '<button class="lnk faint" id="dropcopy">Take the small copy off this device</button>' : '')
      + '</div></div>';
    return h;
  }
  /* put the piece on the stage: its copy here, or the original from a kept folder */
  async function stage(p, ask) {
    const st = $('stage'); if (!st) return false; let b = null, from = '';
    if (p.kind === 'take') { b = await Takes.blob(p.take.id); from = 'take'; }
    else if (p.proxy) { b = await Lb.proxy.get(p.key); from = 'copy'; }
    else if (ask && p.place && p.place.handle) { b = await Lb.original(p.place.id, p.path, true); from = 'original'; }
    if (!b) return false;
    const u = url('stage', b), tag = p.audio ? 'audio' : 'video';
    st.innerHTML = '<' + tag + ' class="vid" id="pv" src="' + u + '" controls playsinline preload="metadata"></' + tag + '>' + (from === 'original' ? '<p class="faint small" style="margin:6px 2px 0">Playing the original from ' + esc(p.place.name) + '.</p>' : '');
    const v = $('pv'); v.onloadedmetadata = () => { if (v.duration && isFinite(v.duration) && !p.secs) M.setMeta(p.key, { secs: Math.round(v.duration * 10) / 10 }); };
    v.onerror = () => { if (from === 'original') { M.setMeta(p.key, { cant: true }); S.msg = 'A browser can\u2019t play that format.'; render(); } };
    STAGED = { key: p.key, blob: b, from }; return true;
  }
  let STAGED = null;
  /* several at once (Oct 27): a row each, a small copy each, one after another; what they're from, if you say */
  function devicePlace() { let pl = M.places().find(p => p.kind === 'drive' && p.device); if (!pl) { pl = M.addDrive('On this device', { root: '', files: [] }, today()); const d = M.read(); d.places.find(y => y.id === pl.id).device = true; localStorage.setItem(M.KEY, JSON.stringify(d)); } return pl; }
  let BATCH = null;
  async function addMany(files) {
    const pl = devicePlace();
    BATCH = { rows: files.map(f => ({ f, name: f.name, state: 'next', key: M.fkey(pl.id, 'On this device/' + f.name), prog: 0, note: '' })), stop: false, title: '' };
    for (const r of BATCH.rows) { const d = M.read(), x = d.places.find(y => y.id === pl.id), path = 'On this device/' + r.f.name; if (!x.files.some(y => y.p === path)) { x.files.push({ p: path, s: r.f.size, d: new Date(r.f.lastModified || Date.now()).toISOString().slice(0, 10) }); x.bytes = x.files.reduce((a, y) => a + (y.s || 0), 0); } localStorage.setItem(M.KEY, JSON.stringify(d)); }
    S.view = 'batch'; render();
    for (const r of BATCH.rows) {
      if (BATCH.stop) { r.state = 'skipped'; continue; }
      if (M.meta(r.key).proxy) { r.state = 'done'; r.note = 'Already plays here'; paintBatch(); continue; }
      r.state = 'making'; paintBatch();
      const res = await makeCopy(r.key, r.f, x => { r.prog = x; paintBatch(); });
      r.state = res.ok ? 'done' : 'cant'; r.note = res.ok ? 'Plays here' + (res.secs ? ' · ' + len(res.secs) : '') : res.error; paintBatch();
    }
    const t = (BATCH.title || '').trim(); if (t) { BATCH.rows.forEach(r => M.setFix(pl.id, 'On this device/' + r.f.name, t)); if (!S.titles.some(x => M.norm(x) === M.norm(t))) { M.addMine(t); S.titles.push(t); } }
    const ok = BATCH.rows.filter(r => r.state === 'done').length, bad = BATCH.rows.filter(r => r.state === 'cant').length; BATCH = null;
    go('lib', { msg: n(ok, 'clip') + ' in your library' + (bad ? '; ' + bad + ' a browser can\u2019t play (export an H.264 copy and add that)' : '') + '.' });
  }
  function batchView() {
    const B = BATCH; let h = '<div class="card" data-stick><p class="kicker">Bringing in ' + n(B.rows.length, 'clip') + '</p><p class="dim small" style="margin:2px 0 10px">Making a small copy of each so it plays here. Keep this page open; it takes about as long as the clips run.</p><div id="batchrows">' + batchRows() + '</div>'
      + '<label class="lab" for="b_title">WHAT ARE THEY FROM (OPTIONAL)</label><input class="field" id="b_title" list="b_titles" placeholder="A show, a class, a short" value="' + esc(B.title) + '" autocomplete="off"><datalist id="b_titles">' + S.titles.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist>'
      + '<p class="faint small" style="margin:8px 0 0">Kept on this device. Nothing is uploaded.</p><div class="row" style="margin-top:10px"><button class="btn ghost" id="b_stop">STOP AFTER THIS ONE</button></div></div>';
    return h;
  }
  function batchRows() { return BATCH.rows.map(r => '<div class="brow ' + r.state + '"><b>' + esc(r.name) + '</b>' + (r.state === 'making' ? '<div class="prog"><i style="width:' + Math.round(r.prog * 100) + '%"></i></div><small>Making it playable · ' + Math.round(r.prog * 100) + '%</small>' : '<small>' + esc(r.state === 'next' ? 'Next' : r.state === 'skipped' ? 'Not brought in' : r.note) + '</small>') + '</div>').join(''); }
  function paintBatch() { const el = $('batchrows'); if (el && BATCH) el.innerHTML = batchRows(); }
  /* the small copy, no screen of its own: {ok, secs} or {error} */
  async function makeCopy(key, file, onP) {
    if (!window.ActorCompress) return { error: 'this browser can\u2019t make copies' };
    const pr = await Lb.probe(file); if (!pr.ok) { M.setMeta(key, { cant: true }); return { error: 'a browser can\u2019t play this format' }; }
    try {
      let out; if (/^audio\//.test(file.type)) out = file; else out = await ActorCompress.process(file, { h: 540, mbps: 1.1, onProgress: x => onP && onP(x || 0) });
      const blob = out && out.blob ? out.blob : out; await Lb.proxy.put(key, blob);
      const th = /^audio\//.test(file.type) ? null : await Lb.grab(blob, 1); if (th) await Lb.thumb.put(key, th);
      M.setMeta(key, { proxy: true, psize: blob.size, secs: pr.secs, cant: false }); return { ok: true, secs: pr.secs };
    } catch (e) { return { error: e.message || 'that file' }; }
  }

  /* ---------- SEND IT: your share sheet with the file, or saved to this computer (Oct 27) ---------- */
  const canShare = f => { try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [f] })); } catch (e) { return false; } };
  async function sendFile(blob, name) {
    const f = new File([blob], name, { type: blob.type || 'video/mp4' });
    if (canShare(f)) { try { await navigator.share({ files: [f], title: name }); return 'sent'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; } }
    saveFile(blob, name); return 'saved';
  }
  function saveFile(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); }
  const sendWord = r => r === 'sent' ? 'Sent from your share sheet.' : r === 'cancel' ? 'Not sent.' : 'Saved to this device. Attach it to an email or drop it in Messages.';
  async function pieceBlob(p) { if (p.kind === 'take') return Takes.blob(p.take.id); if (p.proxy) return Lb.proxy.get(p.key); return null; }
  const fileName = (base, blob) => String(base || 'Footage').replace(/[\\/:*?"<>|]+/g, '').replace(/\.(mp4|mov|webm|m4v|wav|mp3|m4a)$/i, '').slice(0, 60).trim() + (/webm/.test(blob.type) ? '.webm' : /audio\//.test(blob.type) ? (/mpeg/.test(blob.type) ? '.mp3' : '.m4a') : '.mp4');

  /* ---------- MAKE IT ONE FILE: a put-together, straight cuts, 540p or full from the originals ---------- */
  let ONE = null;
  function fullOk(items) { return items.length && items.every(p => p.kind === 'take' || (p.kind === 'file' && FSA() && p.place && p.place.handle)); }
  function oneCard(x, items) {
    const playable = items.filter(p => !p.gone && plays(p) && !p.audio), tot = playable.reduce((a, p) => a + (p.secs || 0), 0), full = fullOk(playable), q = ONE && ONE.set === x.id ? ONE : { q: '540', card: false };
    let h = '<div class="card" id="onecard"><p class="kicker">Make it one file</p>';
    if (ONE && ONE.set === x.id && ONE.busy) return h + '<p class="small" style="margin:0 0 8px">It plays through once while it records, so it takes ' + len(ONE.total || tot) + '. Keep this page open.</p><div class="prog"><i id="one_bar" style="width:' + Math.round((ONE.prog || 0) * 100) + '%"></i></div><p class="faint small" id="one_say" style="margin:6px 0 0">' + esc(ONE.say || 'Starting') + '</p></div>';
    if (ONE && ONE.set === x.id && ONE.made) { const m = ONE.made; return h + '<p class="small" style="margin:0"><b>' + esc(m.name) + '</b></p><p class="faint small" style="margin:2px 0 10px">' + len(m.secs) + ' · ' + m.h + 'p · ' + M.size(m.blob.size) + '</p>'
      + '<div class="row"><button class="btn pri" id="one_send">SEND IT</button><button class="btn" id="one_save">SAVE IT</button><button class="btn ghost" id="one_again">MAKE IT AGAIN</button></div><p class="faint small" style="margin:8px 0 0">SEND IT opens your share sheet (Mail, Messages, AirDrop) with the file. Where a browser has no share sheet, it saves the file for you to attach.</p></div>'; }
    if (!playable.length) return h + '<p class="dim small" style="margin:0">Nothing in it plays here yet.</p></div>';
    h += '<p class="small" style="margin:0 0 8px">' + n(playable.length, 'piece') + ' in this order' + (tot ? ', ' + len(tot) : '') + ', straight cuts.' + (playable.length < items.filter(p => !p.gone).length ? ' Pieces that don\u2019t play here are left out.' : '') + '</p>'
      + '<div class="chips"><button type="button" class="chip' + (q.q === '540' ? ' on' : '') + '" data-oq="540" aria-pressed="' + (q.q === '540') + '">540P · SMALL, QUICK TO SEND</button><button type="button" class="chip' + (q.q === 'full' ? ' on' : '') + '" data-oq="full" aria-pressed="' + (q.q === 'full') + '"' + (full ? '' : ' disabled') + '>FULL QUALITY</button></div>'
      + (full ? '' : '<p class="faint small" style="margin:2px 0 6px">Full quality works when every original is linked from a drive in Chrome, or kept here as a take.</p>')
      + '<label class="chk" style="margin:6px 0"><input type="checkbox" id="one_cardon"' + (q.card ? ' checked' : '') + '> Your name at the start' + (you().name ? ' (' + esc(you().name) + (you().rep ? ', ' + esc(you().rep) : '') + ')' : ' (add it on Your page)') + '</label>'
      + '<div class="row"><button class="btn pri" id="one_go">MAKE IT ONE FILE</button></div></div>';
    return h;
  }
  function you() { try { return window.You ? You.get() : {}; } catch (e) { return {}; } }
  async function makeOne(x) {
    const all = pieces(), items = x.items.map(k => all.find(p => p.key === k)).filter(p => p && plays(p) && !p.audio);
    if (!items.length || !window.ActorCompress || !ActorCompress.stitch) return;
    const q = (ONE && ONE.set === x.id ? ONE.q : '540'), full = q === 'full' && fullOk(items), card = !!(ONE && ONE.set === x.id && ONE.card);
    ONE = { set: x.id, q, card, busy: true, prog: 0, say: 'Getting the pieces', total: items.reduce((a, p) => a + (p.secs || 0), 0) }; render();
    try {
      const list = [];
      for (const p of items) { let b = null; if (full && p.kind === 'file') b = await Lb.original(p.place.id, p.path, true); if (!b) b = await pieceBlob(p); if (b) list.push({ blob: b, name: p.label || p.name }); }
      const y = you(), lines = card && y.name ? [y.name].concat([y.rep ? 'Rep: ' + y.rep : '', y.email || y.phone || ''].filter(Boolean)) : null;
      const out = await ActorCompress.stitch(list, { h: full ? 1080 : 540, mbps: full ? 8 : 1.6, gapMs: 0, card: lines ? { lines, secs: 2.5 } : null, onProgress: (f, what) => { ONE.prog = f || 0; ONE.say = what ? 'Now: ' + what : ONE.say; const b = $('one_bar'); if (b) b.style.width = Math.round(ONE.prog * 100) + '%'; const s2 = $('one_say'); if (s2) s2.textContent = ONE.say; } });
      ONE = { set: x.id, q, card, made: { blob: out.blob, name: fileName(x.name, out.blob), secs: out.seconds + (lines ? 2.5 : 0), h: out.height } };
      S.msg = 'One file: ' + ONE.made.name + ', ' + M.size(out.blob.size) + '.';
    } catch (e) { ONE = { set: x.id, q, card }; S.msg = 'Couldn\u2019t make one file: ' + (e.message || 'a piece wouldn\u2019t read') + '.'; }
    render();
  }

  async function makePlayable(p, file) {
    if (!window.ActorCompress) { S.msg = 'This browser can\u2019t make copies.'; render(); return; }
    const pr = await Lb.probe(file); if (!pr.ok) { M.setMeta(p.key, { cant: true }); S.msg = 'A browser can\u2019t play ' + file.name + '. Export an H.264 copy and add that.'; render(); return; }
    S.busy = p.key; S.prog = 0; render();
    try {
      let out; if (/^audio\//.test(file.type)) out = file; else out = await ActorCompress.process(file, { h: 540, mbps: 1.1, onProgress: x => { S.prog = x || 0; const bar = $('mk_bar'); if (bar) bar.style.width = Math.round(S.prog * 100) + '%'; } });
      const blob = out && out.blob ? out.blob : out; await Lb.proxy.put(p.key, blob);
      const th = /^audio\//.test(file.type) ? null : await Lb.grab(blob, 1); if (th) await Lb.thumb.put(p.key, th);
      M.setMeta(p.key, { proxy: true, psize: blob.size, secs: pr.secs, cant: false });
      S.busy = ''; S.msg = 'It plays here now: a 540p copy, ' + M.size(blob.size) + '.'; render(); const q = byKey(p.key); if (q) stage(q);
    } catch (e) { S.busy = ''; S.msg = 'Couldn\u2019t make a copy: ' + (e.message || 'that file') + '.'; render(); }
  }

  /* ---------- put together ---------- */
  function setView(x) {
    const all = pieces(), items = x.items.map(k => all.find(p => p.key === k) || { key: k, gone: true });
    const tot = items.reduce((a, p) => a + (p.secs || 0), 0);
    let h = '<div class="backbar"><button class="btn sm ghost" id="back">\u2039 YOUR FOOTAGE</button><span class="kicker" style="margin:0">Put together</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="card" data-stick>' + (S.renaming ? '<input class="field" id="rn" value="' + esc(x.name) + '">' : '<b class="pname">' + esc(x.name) + '</b>') + '<p class="dim small" style="margin:2px 0 0">' + n(items.length, 'piece') + (tot ? ' \u00b7 ' + len(tot) : '') + ' \u00b7 plays straight through what plays here</p>'
      + '<div class="row" style="margin-top:10px"><button class="btn pri" id="playall"' + (items.some(p => !p.gone && plays(p)) ? '' : ' disabled') + '>PLAY IT THROUGH</button>' + (S.renaming ? '<button class="btn" id="rnok">KEEP THE NAME</button>' : '<button class="btn" id="rename">RENAME</button>') + '<button class="btn ghost" id="dropset">TAKE IT APART</button></div></div>';
    h += oneCard(x, items);
    h += '<div class="stage" id="stage" style="margin-bottom:12px" hidden></div>';
    h += '<div class="seq">' + items.map((p, i) => p.gone ? '<div class="seqi"><span class="faint small">A piece that isn\u2019t here any more</span><button class="mini" data-out="' + esc(p.key) + '">\u00d7</button></div>'
      : '<div class="seqi">' + tile(p) + '<span class="sbtn"><button class="mini" data-mv="' + esc(p.key) + '|-1"' + (i ? '' : ' disabled') + ' aria-label="Earlier">\u2191</button><button class="mini" data-mv="' + esc(p.key) + '|1"' + (i < items.length - 1 ? '' : ' disabled') + ' aria-label="Later">\u2193</button><button class="mini" data-out="' + esc(p.key) + '" aria-label="Take it out">\u00d7</button></span></div>').join('') + '</div>';
    if (!items.length) h += '<p class="empty">Nothing in it yet. Open a piece and PUT IT WITH this.</p>';
    return h;
  }
  async function playThrough(x) {
    const all = pieces(), L = x.items.map(k => all.find(p => p.key === k)).filter(p => p && plays(p)); const st = $('stage'); if (!st || !L.length) return;
    st.hidden = false; let i = 0;
    const next = async () => { if (i >= L.length) { st.insertAdjacentHTML('beforeend', '<p class="faint small" id="ptdone">That\u2019s all of it.</p>'); return; } const p = L[i++]; await stage(p); const v = $('pv'); if (!v) return; v.insertAdjacentHTML('afterend', '<p class="faint small">' + i + ' of ' + L.length + ' \u00b7 ' + esc(p.label || p.name) + '</p>'); v.onended = next; v.play().catch(() => { }); };
    next();
  }

  /* ---------- a place ---------- */
  function placeView(p) {
    let h = '<div class="backbar"><button class="btn sm ghost" id="back">\u2039 YOUR FOOTAGE</button><span class="kicker" style="margin:0">' + (p.kind === 'named' ? 'A place you named' : 'A drive or folder') + '</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="card" data-stick><div class="place" style="padding:0"><i class="pdot" style="background:' + dot(p.id) + '"></i><span class="pt">' + (S.renaming ? '<input class="field" id="rn" value="' + esc(p.name) + '">' : '<b class="pname">' + esc(p.name) + '</b>')
      + '<small>' + esc(p.kind === 'named' ? (p.note || 'Not on this computer') : n((p.files || []).length, 'video') + ' · ' + M.size(p.bytes) + (p.looked ? ' · looked ' + nice(p.looked) : '')) + '</small></span></div>';
    if (p.kind !== 'named') h += '<p class="dim small" style="margin:10px 0 0">If it isn\u2019t plugged in, this is what was on it' + (p.looked ? ' on ' + nice(p.looked) : '') + '. Plug it in and LOOK AGAIN to bring the list up to date.</p>';
    h += '<div class="row" style="margin-top:12px">' + (p.kind !== 'named' ? (FSA() && p.handle ? '<button class="btn" id="relook_fsa" data-ic="footage">LOOK AGAIN</button>' : '<label class="btn" data-ic="footage">LOOK AGAIN<input type="file" id="relook" webkitdirectory directory multiple hidden></label>') : '')
      + (S.renaming ? '<button class="btn pri" id="rnok">KEEP THE NAME</button>' : '<button class="btn" id="rename">RENAME</button>') + '<button class="btn ghost" id="forget">FORGET IT</button></div></div>';
    if (p.kind === 'named') return h + '<div class="card"><p class="kicker">What\u2019s there</p><label class="lab" for="nn">IN YOUR WORDS</label><input class="field" id="nn" value="' + esc(p.note || '') + '">'
      + '<p class="lab">WHICH PROJECTS</p><div class="chips">' + S.titles.map((t, i) => '<label class="chk"><input type="checkbox" data-hold="' + i + '"' + ((p.holds || []).some(x => M.norm(x) === M.norm(t)) ? ' checked' : '') + '> ' + esc(t) + '</label>').join('') + '</div></div>';
    const F = M.folders(p.id, S.titles), opts = cur => '<option value="">' + (cur === '' ? 'Not matched' : 'Say what it is') + '</option>' + S.titles.map(t => '<option' + (M.norm(t) === M.norm(cur || '') ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
    if (!F.length) h += '<div class="card"><p class="dim" style="margin:0">No video files in it.</p></div>';
    F.forEach((fo, fi) => { const what = fo.what !== undefined ? fo.what : (fo.files.every(f => f.what && M.norm(f.what) === M.norm(fo.files[0].what)) ? fo.files[0].what : '');
      h += '<div class="card list"><div class="fhead"><b class="q">' + esc((p.root && fo.dir.indexOf(p.root) === 0 ? fo.dir.slice(p.root.length).replace(/^\//, '') : fo.dir) || 'The top folder') + '</b><label class="fsel"><span class="faint small">IS</span><select data-dir="' + fi + '" aria-label="What this folder is">' + opts(what) + '</select></label></div>';
      fo.files.forEach(f => { const k = M.fkey(p.id, f.p), mt = M.meta(k); h += '<button type="button" class="frow" data-piece="' + esc(k) + '"><span class="fn"><b>' + esc(f.n) + '</b><small class="' + (f.what ? 'tag' : 'tag un') + '">' + esc(f.what || 'NOT MATCHED') + (mt.proxy ? ' \u00b7 PLAYS HERE' : '') + '</small></span><span class="fm">' + M.size(f.s) + '</span><span class="fm">' + esc(nice(f.d)) + '</span></button>'; });
      h += '</div>'; });
    return h;
  }

  /* ---------- trim a moment (from whatever plays) ---------- */
  function trimView() {
    const t = S.trim; let h = '<div class="backbar"><button class="btn sm ghost" id="tr_close">\u2039 BACK</button><span class="kicker" style="margin:0">Trim your moment</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    const x = M.trim(TR.inS, TR.outS, TR.dur);
    h += '<div class="grid"><div class="colA"><video class="vid" id="tr_vid" src="' + TR.url + '" controls playsinline preload="metadata"></video>'
      + '<div class="row" style="margin-top:10px"><button class="btn" id="tr_in" style="flex:1">START HERE · <span id="tr_inv">' + M.time(TR.inS) + '</span></button><button class="btn" id="tr_out" style="flex:1">END HERE · <span id="tr_outv">' + M.time(TR.outS) + '</span></button><button class="btn" id="tr_play" style="flex:1">PLAY YOUR MOMENT</button></div></div>';
    h += '<div class="colB"><div class="card ask"><p class="kicker" style="color:var(--tung-text)">Your clip</p><p class="small" id="tr_len" style="margin:0 0 8px">Clip: ' + x.secs + ' seconds.</p>'
      + '<button class="btn pri block" id="tr_make"' + (TR.busy ? ' disabled' : '') + '>' + (TR.busy ? 'MAKING IT\u2026' : 'MAKE THE CLIP') + '</button><div class="prog" id="tr_prog"' + (TR.busy ? '' : ' hidden') + '><i id="tr_bar"></i></div>'
      + '<p class="faint small" style="margin:6px 0 0">It goes in your library, under ' + esc(t.title || 'its project') + ', and to Reel Room.' + (t.from === 'copy' ? ' It\u2019s cut from the small copy; cut from the original on the drive for full quality.' : '') + '</p></div>';
    if (TR.made) h += '<div class="card" id="tr_done"><p class="kicker">Made</p><p class="small">' + esc(TR.made.name) + ' · ' + TR.made.secs + ' seconds.</p><div class="row"><button class="btn pri" id="tr_send">SEND IT</button><a class="btn" id="tr_save" href="' + TR.made.url + '" download="' + esc(TR.made.name) + '">SAVE IT</a><a class="btn ghost" href="../archbook/">OPEN REEL ROOM</a></div></div>';
    return h + '</div></div>';
  }

  /* ---------- draw ---------- */
  function render() {
    let p = null; if (S.view === 'piece') { p = byKey(S.key); if (!p) S.view = 'lib'; }
    const pl = S.view === 'place' ? M.place(S.place) : null; if (S.view === 'place' && !pl) S.view = 'lib';
    const st = S.view === 'set' ? M.set(S.set) : null; if (S.view === 'set' && !st) S.view = 'lib';
    $('view').innerHTML = S.view === 'batch' && BATCH ? batchView() : S.trim ? trimView() : S.view === 'piece' ? pieceView(p) : S.view === 'place' ? placeView(pl) : S.view === 'set' ? setView(st) : libView();
    S.msg = ''; wire(); thumbs(); if (S.view === 'piece' && p && !S.trim && plays(p) && S.busy !== p.key) stage(p);
  }
  async function thumbs() {
    for (const el of document.querySelectorAll('[data-thumb]')) { const k = el.dataset.thumb; try { let b = await Lb.thumb.get(k);
      if (!b && /^t:/.test(k) && window.Takes) { const it = Takes.get(k.slice(2)); if (it && it.kind === 'video') { const src = await Takes.blob(it.id); if (src) { b = await Lb.grab(src, 1); if (b) await Lb.thumb.put(k, b); } } }
      if (b && el.isConnected) { el.style.backgroundImage = 'url(' + url('th' + k, b) + ')'; el.classList.add('img'); } } catch (e) { } }
  }
  function go(v, extra) { Object.assign(S, { view: v, renaming: false, withOpen: false }, extra || {}); render(); window.scrollTo(0, 0); }
  async function pickFolder(placeId) {
    let dir; try { dir = await window.showDirectoryPicker({ mode: 'read' }); } catch (e) { return; }
    S.msg = 'Reading ' + dir.name + '\u2026'; render();
    const files = await Lb.walk(dir, M.VIDEO); const r = { root: dir.name, files };
    let p; if (placeId) { p = M.relook(placeId, r, today()); } else { p = M.addDrive(dir.name, r, today()); }
    await Lb.handle.put(p.id, dir); const d = M.read(), x = d.places.find(y => y.id === p.id); x.handle = true; localStorage.setItem(M.KEY, JSON.stringify(d));
    go('place', { place: p.id, msg: placeId ? 'Looked again: ' + n(files.length, 'video') + '. Your fixes are kept.' : p.name + ': ' + n(files.length, 'video') + ' on the map. Plug it in and its originals play here too.' });
  }
  async function addVideos(files) {
    if (files.length > 1) return addMany(files);
    let pl = M.places().find(p => p.kind === 'drive' && p.device); if (!pl) { pl = M.addDrive('On this device', { root: '', files: [] }, today()); const d = M.read(); d.places.find(y => y.id === pl.id).device = true; localStorage.setItem(M.KEY, JSON.stringify(d)); }
    for (const f of files) { const d = M.read(), x = d.places.find(y => y.id === pl.id); const path = 'On this device/' + f.name; if (!x.files.some(y => y.p === path)) { x.files.push({ p: path, s: f.size, d: new Date(f.lastModified || Date.now()).toISOString().slice(0, 10) }); x.bytes = x.files.reduce((a, y) => a + (y.s || 0), 0); x.looked = today(); localStorage.setItem(M.KEY, JSON.stringify(d)); }
      S.view = 'piece'; S.key = M.fkey(pl.id, path); await makePlayable(byKey(S.key), f); }
  }

  function wire() {
    const V = $('view'), on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
    V.querySelectorAll('[data-piece]').forEach(b => b.onclick = () => go('piece', { key: b.dataset.piece }));
    V.querySelectorAll('[data-place]').forEach(b => b.onclick = () => go('place', { place: b.dataset.place }));
    V.querySelectorAll('[data-set]').forEach(b => b.onclick = () => go('set', { set: b.dataset.set }));
    V.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { S.open[b.dataset.more] = true; render(); });
    on('back', () => { if (STAGED) STAGED = null; go('lib'); });
    const fd = $('find'); if (fd) fd.oninput = () => { S.q = fd.value; const pos = fd.selectionStart; render(); const f2 = $('find'); if (f2) { f2.focus(); try { f2.setSelectionRange(pos, pos); } catch (e) { } } };
    on('here', () => { S.here = !S.here; render(); });
    const ad = $('adddrive'); if (ad) ad.onchange = () => { const r = M.fromFiles([...(ad.files || [])]); ad.value = ''; if (!r.root && !r.files.length) return; const p = M.addDrive(r.root, r, today()); go('place', { place: p.id, msg: r.files.length ? p.name + ': ' + n(r.files.length, 'video') + ' on the map. Say what the folders are where the names don\u2019t.' + (r.capped ? ' (The first 50,000.)' : '') : 'No video files in ' + p.name + '.' }); };
    on('adddrive_fsa', () => pickFolder(''));
    ['addvids', 'addvids0'].forEach(id => { const av = $(id); if (av) av.onchange = () => { const f = [...(av.files || [])]; av.value = ''; if (f.length) addVideos(f); }; });
    const bt = $('b_title'); if (bt) bt.oninput = () => { if (BATCH) BATCH.title = bt.value; };
    on('b_stop', () => { if (BATCH) { BATCH.stop = true; const b = $('b_stop'); if (b) { b.disabled = true; b.textContent = 'STOPPING AFTER THIS ONE'; } } });
    if (S.view === 'set') { const x = M.set(S.set);
      V.querySelectorAll('[data-oq]').forEach(b => b.onclick = () => { if (b.disabled) return; ONE = Object.assign({ set: x.id, card: false }, ONE && ONE.set === x.id ? ONE : {}, { q: b.dataset.oq, made: null }); render(); });
      const cb = $('one_cardon'); if (cb) cb.onchange = () => { ONE = Object.assign({ set: x.id, q: '540' }, ONE && ONE.set === x.id ? ONE : {}, { card: cb.checked, made: null }); };
      on('one_go', () => makeOne(x)); on('one_again', () => { ONE = { set: x.id, q: ONE.q, card: ONE.card }; render(); });
      on('one_send', async () => { const r = await sendFile(ONE.made.blob, ONE.made.name); S.msg = sendWord(r); render(); });
      on('one_save', () => { saveFile(ONE.made.blob, ONE.made.name); S.msg = 'Saved: ' + ONE.made.name + '.'; render(); }); }
    on('sendit', async () => { const p = byKey(S.key); if (!p) return; const b = await pieceBlob(p); if (!b) return; const r = await sendFile(b, fileName(p.label || p.name, b)); S.msg = sendWord(r); render(); });
    on('tr_send', async () => { if (!TR.made || !TR.made.blob) return; const r = await sendFile(TR.made.blob, TR.made.name); S.msg = sendWord(r); render(); });
    on('name', () => { S.naming = true; render(); const e = $('n_name'); if (e) e.focus(); });
    on('n_cancel', () => { S.naming = false; render(); });
    on('n_keep', () => { const nm = $('n_name').value; if (!nm.trim()) { $('n_name').focus(); return; } const holds = [...V.querySelectorAll('[data-holds]:checked')].map(c => S.titles[+c.dataset.holds]); const p = M.addNamed(nm, $('n_note').value, holds); S.naming = false; S.msg = p.name + ' is on the map.'; render(); });
    on('addmine', () => { S.adding = true; render(); const e = $('mine'); if (e) e.focus(); });
    on('mineok', () => { const v = $('mine').value.trim(); if (v) { M.addMine(v); if (!S.titles.some(t => M.norm(t) === M.norm(v))) S.titles.push(v); } S.adding = false; render(); });
    /* a piece */
    const p = S.view === 'piece' ? byKey(S.key) : null;
    if (p) {
      const mf = $('mk_file'); if (mf) mf.onchange = () => { const f = mf.files && mf.files[0]; mf.value = ''; if (f) makePlayable(p, f); };
      on('mk_go', async () => { const f = await Lb.original(p.place.id, p.path, true); if (!f) { S.msg = p.place.name + ' isn\u2019t plugged in, or it said no. Plug it in and try again.'; render(); return; } makePlayable(p, f); });
      on('og_play', async () => { const ok = await stage(p, true); if (!ok) { S.msg = p.place.name + ' isn\u2019t plugged in, or it said no.'; render(); } });
      const lb = $('lab'); if (lb) lb.onchange = () => M.setMeta(p.key, { label: lb.value.trim() });
      const pj = $('proj'); if (pj) pj.onchange = () => { M.setFix(p.place.id, p.path, pj.value || ''); render(); };
      on('withit', () => { S.withOpen = !S.withOpen; render(); });
      V.querySelectorAll('[data-with]').forEach(c => c.onchange = () => { M.toggleIn(c.dataset.with, p.key); });
      on('newsetok', () => { const v = $('newset').value.trim(); if (!v) { $('newset').focus(); return; } M.addSet(v, [p.key]); S.withOpen = false; S.msg = 'Started: ' + v + '.'; render(); });
      on('trimit', async () => { const b = STAGED && STAGED.key === p.key ? STAGED.blob : null; if (!b) return; if (TR.url) URL.revokeObjectURL(TR.url); TR = { file: b, url: URL.createObjectURL(b), dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: [] }; S.trim = { key: p.key, title: p.title, from: STAGED.from }; render(); window.scrollTo(0, 0); });
      on('stillit', async () => { const v = $('pv'); if (!v || !v.videoWidth) { S.msg = 'Play it to a frame first.'; render(); return; } try { v.pause(); } catch (e) { }
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); if (!blob) return; const at = M.time(v.currentTime), name = M.clipName(p.title, S.roles[M.norm(p.title)] || '', 'jpg').replace(/_clip\.jpg$/, '_still_' + at.replace(/[:.]/g, '-') + '.jpg');
        let kept = false; try { if (window.You) { const r = await You.addPhoto(new File([blob], name, { type: 'image/jpeg' }), { kind: 'still', from: { title: p.title, t: Math.round(v.currentTime * 10) / 10 } }); kept = !!(r && r.photo); } } catch (e) { }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; if (!kept) { document.body.appendChild(a); a.click(); a.remove(); }
        S.msg = kept ? 'Still kept with your photos (' + at + ').' : 'Still saved (' + at + ').'; render(); });
      on('dropcopy', async () => { await Lb.proxy.del(p.key); await Lb.thumb.del(p.key); M.setMeta(p.key, { proxy: false, psize: 0 }); S.msg = 'The small copy is off this device. The original is where it was.'; render(); });
    }
    /* put together */
    const st = S.view === 'set' ? M.set(S.set) : null;
    if (st) {
      on('playall', () => playThrough(st));
      on('rename', () => { S.renaming = true; render(); });
      on('rnok', () => { M.setSet(st.id, { name: $('rn').value }); S.renaming = false; render(); });
      on('dropset', () => { if (!confirm('Take "' + st.name + '" apart? The pieces stay in your library.')) return; M.dropSet(st.id); go('lib', { msg: st.name + ' is taken apart. Every piece is still in your library.' }); });
      V.querySelectorAll('[data-mv]').forEach(b => b.onclick = e => { e.stopPropagation(); const sv = b.dataset.mv, i = sv.lastIndexOf('|'); M.move(st.id, sv.slice(0, i), +sv.slice(i + 1)); render(); });
      V.querySelectorAll('[data-out]').forEach(b => b.onclick = e => { e.stopPropagation(); M.toggleIn(st.id, b.dataset.out); render(); });
    }
    /* a place */
    const pl = S.view === 'place' ? M.place(S.place) : null;
    if (pl) {
      const rl = $('relook'); if (rl) rl.onchange = () => { const r = M.fromFiles([...(rl.files || [])]); rl.value = ''; M.relook(pl.id, r, today()); S.msg = 'Looked again: ' + n(r.files.length, 'video') + '. Your fixes are kept.'; render(); };
      on('relook_fsa', () => pickFolder(pl.id));
      on('rename', () => { S.renaming = true; render(); const e = $('rn'); if (e) { e.focus(); e.select(); } });
      on('rnok', () => { M.setPlace(pl.id, { name: $('rn').value }); S.renaming = false; render(); });
      on('forget', async () => { if (!confirm('Take ' + pl.name + ' off the map? Your files stay where they are.')) return; for (const f of pl.files || []) { const k = M.fkey(pl.id, f.p); await Lb.proxy.del(k); await Lb.thumb.del(k); } await Lb.handle.del(pl.id); M.forget(pl.id); go('lib', { msg: pl.name + ' is off the map. Nothing on it was touched.' }); });
      const nn = $('nn'); if (nn) nn.onchange = () => { M.setPlace(pl.id, { note: nn.value }); };
      V.querySelectorAll('[data-hold]').forEach(c => c.onchange = () => { M.setPlace(pl.id, { holds: [...V.querySelectorAll('[data-hold]:checked')].map(x => S.titles[+x.dataset.hold]) }); });
      const F = M.folders(pl.id, S.titles);
      V.querySelectorAll('[data-dir]').forEach(s => s.onchange = () => { const fo = F[+s.dataset.dir]; M.setFix(pl.id, fo.dir, s.value || ''); render(); });
    }
    /* trim */
    on('tr_close', () => { S.trim = null; render(); });
    const v = $('tr_vid');
    if (v && S.trim) {
      const T = S.trim, role = S.roles[M.norm(T.title)] || '';
      const upd = () => { $('tr_inv').textContent = M.time(TR.inS); $('tr_outv').textContent = M.time(TR.outS); $('tr_len').textContent = 'Clip: ' + M.trim(TR.inS, TR.outS, TR.dur || v.duration).secs + ' seconds.'; };
      v.onloadedmetadata = () => { TR.dur = v.duration || 0; if (!TR.outS) TR.outS = TR.dur; upd(); };
      on('tr_in', () => { TR.inS = v.currentTime; if (TR.outS && TR.outS <= TR.inS) TR.outS = Math.min(TR.dur || v.duration, TR.inS + 1); upd(); });
      on('tr_out', () => { TR.outS = Math.max(v.currentTime, TR.inS + 0.2); upd(); });
      on('tr_play', () => { v.currentTime = TR.inS; v.play().catch(() => { }); const stop = () => { if (v.currentTime >= TR.outS) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); });
      on('tr_make', async () => {
        if (TR.busy || !window.ActorCompress) return;
        const dur = TR.dur || v.duration, t = M.trim(TR.inS, TR.outS, dur); TR.busy = true; render();
        try {
          const out = await ActorCompress.process(TR.file, { h: 1080, mbps: 8, trimStart: t.trimStart, trimEnd: t.trimEnd, onProgress: x => { const b = $('tr_bar'); if (b) b.style.width = Math.round((x || 0) * 100) + '%'; } });
          const blob = out && out.blob ? out.blob : out, ext = /webm/.test(blob.type) ? 'webm' : 'mp4', name = M.clipName(T.title, role, ext);
          if (window.Takes) await Takes.put(blob, { kind: 'video', mime: blob.type, ext, name, secs: t.secs, for: { type: 'clip', title: T.title, role } });
          TR.busy = false; TR.made = { name, secs: t.secs, url: URL.createObjectURL(blob), blob }; render();
        } catch (e) { TR.busy = false; S.msg = 'Couldn\u2019t make the clip: ' + (e.message || 'this browser can\u2019t read that file') + '.'; render(); }
      });
    }
  }
  gather(); render();
  (async () => { try { if (window.Offices) { const hb = await Offices.load(); if (hb && hb.credits) { hb.credits.forEach(c => { const x = String(c.title || '').trim(); if (x && !S.titles.some(t => M.norm(t) === M.norm(x))) S.titles.push(x); if (x && (c.role || c.character) && !S.roles[M.norm(x)]) S.roles[M.norm(x)] = c.role || c.character; }); render(); } } } catch (e) { } })();
  window.FOOTAGE = { render, state: S, pieces, makePlayable, byKey, go, one: () => ONE, batch: () => BATCH };
})();
