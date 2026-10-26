/* CHECK THE COPY page: pick the card, then your copies; it reads every file and says whether it's safe to erase.
   Rules in shared/copycheck.js. The reading happens in hashworker.js, one per drive. Nothing uploaded, nothing erased. */
(function () {
  'use strict';
  const C = window.CopyCheck, $ = id => document.getElementById(id), V = $('view');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { card: null, copies: [], label: '', fp: {}, phase: 'pick', msg: '', stop: null, at: 0, results: null, verdict: null };
  const OPEN = { hist: false, how: false };
  const say = t => { S.msg = t || ''; const m = $('msg'); if (m) m.textContent = S.msg; };
  const sum = idx => Object.keys(idx).reduce((a, k) => a + idx[k].size, 0);
  const slot = (files, fallback) => { const idx = C.index(files), keys = Object.keys(idx); return keys.length ? { name: C.folderName(files) || fallback, idx, files: keys.length, size: sum(idx) } : null; };
  /* a copy: named by you (the drive), since the folder you pick on each drive is usually the card's own name */
  const asCopy = (r, i) => Object.assign(r, { folder: r.name, name: (S.copies[i] && S.copies[i].name && !/^Copy \d$/.test(S.copies[i].name)) ? S.copies[i].name : 'Copy ' + (i + 1), fp: {}, unread: [] });
  const pickIn = (id, label, cls) => '<label class="btn ' + (cls || 'ghost') + ' pick">' + label + '<input type="file" id="' + id + '" webkitdirectory multiple></label>' +
    '<label class="btn quiet pick" style="font-size:11px">OR PICK THE FILES<input type="file" id="' + id + '_f" multiple></label>';

  function pick() {
    S.phase = 'pick'; const c = S.card, h = C.history();
    const card = '<div class="slot"><span class="kick">1 · THE CARD</span>' + (c ? '<b>' + esc(c.name) + '</b><span class="mut small">' + c.files + ' file' + (c.files === 1 ? '' : 's') + ' · ' + C.bytes(c.size) + '</span><div class="row">' + pickIn('p_card', 'A DIFFERENT FOLDER', 'quiet') + '</div>'
      : '<span class="mut small">The card from the camera, or the folder on it.</span><div class="row">' + pickIn('p_card', 'PICK THE CARD') + '</div>') + '</div>';
    const cp = i => { const x = S.copies[i], t = i === 0 ? '2 · YOUR COPY' : '3 · A SECOND COPY';
      if (x) return '<div class="slot"><span class="kick">' + t + '</span><label class="lab" style="margin:0" for="p_n' + i + '">WHICH DRIVE</label><input class="field" id="p_n' + i + '" data-name="' + i + '" value="' + esc(x.name) + '" placeholder="Which drive: SHUTTLE_A"><span class="mut small">' + esc(x.folder) + ' · ' + x.files + ' file' + (x.files === 1 ? '' : 's') + ' · ' + C.bytes(x.size) + '</span><div class="row">' + pickIn('p_c' + i, 'A DIFFERENT FOLDER', 'quiet') + '<button type="button" class="btn quiet" data-drop="' + i + '">TAKE IT OFF</button></div></div>';
      return '<div class="slot open"><span class="kick">' + t + '</span><span class="mut small">' + (i === 0 ? 'The folder you copied the card to.' : 'Two copies on two drives is the rule on most sets. One is allowed; it says so at the end.') + '</span><div class="row">' + pickIn('p_c' + i, 'PICK THE FOLDER') + '</div></div>'; };
    let h2 = '<p class="msg" id="msg" role="status">' + esc(S.msg) + '</p><div class="slots">' + card + cp(0) + (S.copies[0] ? cp(1) : '') + '</div>' +
      '<label class="lab" for="p_label">WHAT THIS CARD IS (OPTIONAL)</label><input class="field" id="p_label" value="' + esc(S.label) + '" placeholder="In your words: a day, a scene, a project">' +
      '<div class="row" style="margin-top:14px"><button type="button" class="btn" id="p_go"' + (c && S.copies[0] ? '' : ' disabled') + '>CHECK IT</button><span class="mut small">Reads every file on the card and on each copy. A full card takes about as long as copying it did.</span></div>' +
      '<p class="mut small" id="p_promise" style="margin:8px 0 0">Nothing is uploaded. It never erases anything.</p>';
    if (h.length) h2 += '<details class="cfold" id="histfold"' + (OPEN.hist ? ' open' : '') + '><summary><span>Your checks</span><i>' + Math.min(h.length, 12) + ' kept</i></summary><ul class="hist">' + h.slice(0, 12).map((x, i) => '<li><span><b>' + esc(x.card) + '</b>' + (x.label ? ' · ' + esc(x.label) : '') + ' <span class="mut">· ' + esc(new Date(x.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })) + ' · ' + x.files + ' files</span></span><span class="' + (x.safe ? 'ok' : 'no') + '">' + (x.safe ? (x.copies.length > 1 ? 'all copies match' : 'one copy matches') : 'didn\'t match') + '</span><button type="button" class="btn quiet" data-forget="' + i + '" aria-label="Take this check off the list">×</button></li>').join('') + '</ul></details>';
    h2 += '<details class="cfold" id="howfold"' + (OPEN.how ? ' open' : '') + '><summary data-icr="notes" data-icc="you"><span data-icl>How it works</span><i>nothing uploaded, never erases</i></summary><div class="promise"><div><b>NOTHING IS UPLOADED</b><span class="small dim">Your footage is read right here. It never leaves this device.</span></div><div><b>IT NEVER ERASES ANYTHING</b><span class="small dim">It only reads. Erasing the card is yours to do, in the camera.</span></div><div><b>ON A COMPUTER</b><span class="small dim">Picking whole folders needs a computer. On a phone, pick the files.</span></div></div></details>';
    V.innerHTML = h2;
    [['histfold', 'hist'], ['howfold', 'how']].forEach(([id, k]) => { const d = $(id); if (d) d.ontoggle = () => { OPEN[k] = d.open; }; });
    const take = (id, fn) => { [id, id + '_f'].forEach(k => { const el = $(k); if (el) el.onchange = () => { const r = slot(el.files, k === id + '_f' ? 'Your files' : 'Your folder'); if (!r) { say('Nothing in there to check.'); return; } fn(r); say(''); pick(); }; }); };
    take('p_card', r => { S.card = r; S.fp = {}; });
    take('p_c0', r => { S.copies[0] = asCopy(r, 0); });
    take('p_c1', r => { S.copies[1] = asCopy(r, 1); });
    V.querySelectorAll('[data-name]').forEach(el => el.oninput = () => { S.copies[+el.dataset.name].name = el.value.trim() || 'Copy ' + (+el.dataset.name + 1); });
    V.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { S.copies.splice(+b.dataset.drop, 1); S.copies.forEach((x, i) => { if (/^Copy \d$/.test(x.name)) x.name = 'Copy ' + (i + 1); }); pick(); });
    V.querySelectorAll('[data-forget]').forEach(b => b.onclick = () => { C.forget(+b.dataset.forget); pick(); });
    $('p_label').oninput = () => { S.label = $('p_label').value; };
    $('p_go').onclick = () => { if (!S.card || !S.copies[0]) return; S.copies.forEach(x => { x.plan = C.plan(S.card.idx, x.idx); }); run(); };
  }

  /* ---------- the reading ---------- */
  function hasher() { const w = new Worker('hashworker.js'); let n = 0; const wait = {};
    w.onmessage = e => { const m = e.data, p = wait[m.id]; if (!p) return; if (m.done) { delete wait[m.id]; p.res(m); } else p.prog(m.read); };
    return { hash: (file, prog) => new Promise(res => { const id = ++n; wait[id] = { res, prog: prog || (() => { }) }; w.postMessage({ id, file }); }),
      stop: () => { w.terminate(); Object.keys(wait).forEach(k => wait[k].res({ stopped: true })); } }; }
  async function run(only) {
    S.phase = 'checking'; const card = S.card, copies = S.copies;
    const keys = Array.from(new Set([].concat.apply([], copies.map(x => x.plan.read)))).sort().filter(k => !only || only.indexOf(k) >= 0);
    const jobs = keys.map(k => ({ k, card: !S.fp[k], cp: copies.map(x => x.plan.read.indexOf(k) >= 0 && !x.fp[k] && x.unread.indexOf(k) < 0) }));
    const total = jobs.reduce((a, j) => a + card.idx[j.k].size * ((j.card ? 1 : 0) + j.cp.filter(Boolean).length), 0);
    let doneBytes = 0, live = 0, i = 0; const seen = [];
    V.innerHTML = '<p class="msg" id="msg" role="status"></p><div class="card"><p class="kick">CHECKING ' + esc(card.name.toUpperCase()) + '</p><p class="dim small" style="margin:0 0 8px">' + esc([S.label, 'against ' + copies.map(x => x.name).join(' and ')].filter(Boolean).join(' · ')) + '</p>' +
      '<div class="row" style="justify-content:space-between"><span id="c_n">Starting</span><span class="mut small" id="c_b">' + C.bytes(0) + ' of ' + C.bytes(total) + ' read</span></div><div class="prog" role="progressbar" aria-label="Read so far" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="c_pb"><i id="c_p"></i></div>' +
      '<p class="mut small">Keep this tab open and the drives plugged in.</p></div><div class="files" id="c_rows" style="--n:' + copies.length + '"></div><div class="row"><button type="button" class="btn quiet" id="c_stop">STOP</button><span class="mut small">Stopping keeps what it\'s checked, while this page is open.</span></div>';
    const prog = () => { const p = total ? Math.min(100, (doneBytes + live) / total * 100) : 100; $('c_p').style.width = p.toFixed(1) + '%'; $('c_pb').setAttribute('aria-valuenow', Math.round(p)); $('c_b').textContent = C.bytes(doneBytes + live) + ' of ' + C.bytes(total) + ' read'; };
    const rows = cur => { $('c_rows').innerHTML = '<div class="frow hd"><span>FILE</span><span class="sz">SIZE</span>' + copies.map(x => '<span>' + esc(x.name.toUpperCase()) + '</span>').join('') + '</div>' +
      seen.slice(-5).map(k => '<div class="frow"><span>' + esc(k) + '</span><span class="sz mut">' + C.bytes(card.idx[k].size) + '</span>' + copies.map(x => { const st = x.plan.read.indexOf(k) < 0 ? '<span class="no">✕ ' + esc(C.WHY[x.plan.missing.indexOf(k) >= 0 ? 'missing' : x.plan.short.indexOf(k) >= 0 ? 'short' : 'size']) + '</span>' : x.unread.indexOf(k) >= 0 ? '<span class="no">✕ couldn\'t read</span>' : !x.fp[k] ? (k === cur ? '<span class="on">reading…</span>' : '<span class="mut">to check</span>') : x.fp[k] === S.fp[k] ? '<span class="ok">✓ matches</span>' : '<span class="no">✕ different</span>'; return st; }).join('') + '</div>').join(''); };
    const W = [hasher()].concat(copies.map(() => hasher())); let stopped = false;
    S.stop = () => { stopped = true; W.forEach(w => w.stop()); };
    $('c_stop').onclick = () => { S.stop(); say('Stopped.'); finish(true); };
    for (const j of jobs) { if (stopped) break; i++; seen.push(j.k); $('c_n').textContent = 'File ' + i + ' of ' + jobs.length; rows(j.k);
      const parts = [], lv = {}; const upd = (n, b) => { lv[n] = b; live = Object.keys(lv).reduce((a, x) => a + lv[x], 0); prog(); };
      if (j.card) parts.push(W[0].hash(card.idx[j.k].file, b => upd('c', b)).then(r => { if (r.hex) S.fp[j.k] = r.hex; else if (r.error) card.unread = (card.unread || []).concat(j.k); return r; }));
      copies.forEach((x, ci) => { if (j.cp[ci]) parts.push(W[ci + 1].hash(x.idx[j.k].file, b => upd(ci, b)).then(r => { if (r.hex) x.fp[j.k] = r.hex; else if (r.error) x.unread.push(j.k); return r; })); });
      const rs = await Promise.all(parts); if (rs.some(r => r.stopped)) break;
      doneBytes += card.idx[j.k].size * parts.length; live = 0; prog(); }
    if (!stopped) { W.forEach(w => w.stop()); rows(); finish(false); }
  }
  function finish(stopped) {
    const card = S.card;
    /* a card file that couldn't be read: every copy's version of it can't be checked */
    (card.unread || []).forEach(k => S.copies.forEach(x => { if (x.unread.indexOf(k) < 0) x.unread.push(k); }));
    S.results = S.copies.map(x => C.result(x.name, x.plan, { card: S.fp, copy: x.fp }, x.unread)); S.verdict = C.verdict(S.results); S.at = Date.now();
    if (!stopped && S.results.every(r => r.left === 0)) C.remember({ at: S.at, card: card.name, label: S.label, files: card.files, size: card.size, safe: S.verdict.safe, results: S.results });
    result(stopped);
  }
  function result(stopped) {
    S.phase = 'result'; const v = S.verdict, card = S.card;
    let h = '<p class="msg" id="msg" role="status">' + esc(S.msg) + '</p><p class="kick">' + esc(card.name.toUpperCase()) + (S.label ? ' · ' + esc(S.label) : '') + '</p>' +
      '<div class="verdict ' + (v.safe ? 'safe' : 'stop') + '"><b>' + esc(v.head) + '</b>' + v.lines.map(l => '<span class="dim" style="display:block">' + esc(l) + '</span>').join('') + '</div>' +
      '<div class="slots"><div class="slot"><span class="kick" style="color:var(--mut)">THE CARD</span><b>' + card.files + ' files</b><span class="mut small">' + C.bytes(card.size) + '</span></div>' +
      S.results.map(r => '<div class="slot"><span class="kick" style="color:var(--mut)">' + esc(r.name.toUpperCase()) + '</span><b class="' + (r.bad.length ? 'no' : r.left ? '' : 'ok') + '">' + r.ok + ' of ' + r.total + ' match</b><span class="mut small">' + (r.bad.length ? r.bad.length + (r.bad.length === 1 ? ' doesn\'t' : ' don\'t') : r.left ? r.left + ' not read yet' : 'byte for byte') + (r.extra ? ' · ' + r.extra + ' more on the copy than the card' : '') + '</span></div>').join('') + '</div>';
    S.results.forEach((r, i) => { if (!r.bad.length) return;
      h += '<h2 class="kick" style="margin-top:18px">ON ' + esc(r.name.toUpperCase()) + '</h2><div class="files" style="--n:1">' + r.bad.map(b => '<div class="frow"><span>' + esc(b.key) + '</span><span class="sz mut">' + C.bytes(card.idx[b.key].size) + '</span><span class="no">' + esc(C.WHY[b.why]) + '</span></div>').join('') + '</div>' +
        '<div class="card"><p class="kick">WHAT TO DO</p><p class="small" style="margin:0 0 8px">Copy ' + (r.bad.length === 1 ? 'that file' : 'those ' + r.bad.length + ' files') + ' from the card to ' + esc(r.name) + ' again. Then pick ' + esc(r.name) + ' again here: only ' + (r.bad.length === 1 ? 'that one gets' : 'those ' + r.bad.length + ' get') + ' read the second time.</p>' +
        (r.bad.some(b => b.why === 'diff') ? '<p class="mut small">"Same size, different inside" usually means the copy was interrupted or the drive has a problem. If it happens twice on the same drive, use another drive.</p>' : '') +
        '<div class="row">' + pickIn('r_c' + i, 'PICK ' + esc(r.name.toUpperCase()) + ' AGAIN', '') + '</div></div>'; });
    if (v.safe) h += '<p class="mut small">Erase it in the camera, not on the computer: the camera formats it the way it wants. THEACTORPAGE never erases anything.</p>';
    h += '<div class="row" style="margin-top:12px">' + (stopped || S.results.some(r => r.left) ? '<button type="button" class="btn" id="r_more">CHECK THE REST</button>' : '') + '<button type="button" class="btn ' + (v.safe ? '' : 'ghost') + '" id="r_rec">SAVE THE RECEIPT</button><button type="button" class="btn quiet" id="r_new">CHECK ANOTHER CARD</button></div>' +
      '<p class="mut small">The receipt is a text file: the card, the date, and each file\'s fingerprint. Keep it with the footage; your editor or post house can check the same fingerprints.</p>';
    V.innerHTML = h;
    S.results.forEach((r, i) => { [$('r_c' + i), $('r_c' + i + '_f')].forEach(el => { if (!el) return; el.onchange = () => { const nx = slot(el.files, r.name); if (!nx) return; const x = S.copies[i], again = r.bad.map(b => b.key);
      x.idx = nx.idx; x.files = nx.files; x.size = nx.size; x.plan = C.plan(card.idx, x.idx); again.forEach(k => { delete x.fp[k]; }); x.unread = x.unread.filter(k => again.indexOf(k) < 0); say(''); run(again.filter(k => x.plan.read.indexOf(k) >= 0)); }; }); });
    if ($('r_more')) $('r_more').onclick = () => { say(''); run(); };
    $('r_rec').onclick = () => { const t = C.receipt({ at: S.at, card: card.name, label: S.label, files: card.files, size: card.size, results: S.results, fp: S.fp });
      const u = URL.createObjectURL(new Blob([t], { type: 'text/plain' })), a = document.createElement('a'); a.href = u; a.download = 'copy-check-' + card.name.replace(/[^\w.-]+/g, '_') + '-' + new Date(S.at).toISOString().slice(0, 10) + '.txt'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); say('Saved. Keep it with the footage.'); };
    $('r_new').onclick = () => { S.card = null; S.copies = []; S.fp = {}; S.label = ''; say(''); pick(); };
  }
  window.__copy = { S, pick, take: (which, files, name) => { const r = slot(files, 'Your folder'); if (which === 'card') { S.card = r; S.fp = {}; } else { S.copies[which] = asCopy(r, which); if (name) S.copies[which].name = name; } pick(); } };
  pick();
})();
