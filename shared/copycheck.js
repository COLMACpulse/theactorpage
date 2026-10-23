/* THEACTORPAGE CHECK THE COPY: before you erase a camera card, every file on your copies has to match the card,
   byte for byte. A file count is not a check.
   A file missing, or a different size, shows straight away. A file the same size is read in full on the card and on
   each copy, and its fingerprint (SHA-256) compared. Read here, on this device. Nothing uploaded, nothing erased.
   The pure parts (matching, the verdict, the receipt) run in Node for the tests; the reading is footage/check.js. */
(function (g) {
  'use strict';
  const C = {}, KEY = 'theactorpage_copycheck_v1';
  C.KEY = KEY;
  /* what the computer leaves on a card or a drive: not footage, never a mismatch */
  C.junk = p => /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini|\._[^/]*|\.Spotlight-V100|\.fseventsd|\.Trashes|\.TemporaryItems|System Volume Information|\$RECYCLE\.BIN)(\/|$)/i.test(p);
  /* a file's place on the card, the same on every copy: its path below the folder you picked ("A001/CLIP/C001.mov" -> "CLIP/C001.mov") */
  C.key = function (f) { const r = String((f && (f.webkitRelativePath || f.path)) || '').replace(/\\/g, '/'); if (r && r.indexOf('/') >= 0) return r.split('/').slice(1).join('/'); return String((f && f.name) || r); };
  C.folderName = list => { const f = (list || [])[0]; const r = f && String(f.webkitRelativePath || '').split('/')[0]; return r || ''; };
  /* files -> {key: {key, name, size, file}} with the computer's leftovers taken out */
  C.index = function (files) { const out = {}; Array.from(files || []).forEach(f => { const k = C.key(f); if (!k || C.junk(k) || C.junk(f.name || '')) return; out[k] = { key: k, name: f.name, size: f.size, file: f }; }); return out; };
  /* before any reading: what's missing, cut off or a different size on a copy, and what needs reading */
  C.plan = function (card, copy) {
    const out = { missing: [], short: [], size: [], read: [], extra: [] };
    Object.keys(card).sort().forEach(k => { const a = card[k], b = copy[k];
      if (!b) out.missing.push(k); else if (b.size < a.size) out.short.push(k); else if (b.size !== a.size) out.size.push(k); else out.read.push(k); });
    Object.keys(copy).forEach(k => { if (!card[k]) out.extra.push(k); });
    return out;
  };
  C.WHY = { missing: 'not there', short: 'shorter than the card\'s: cut off', size: 'a different size', diff: 'same size, different inside', unread: 'couldn\'t be read: pick the folder again' };
  /* one copy, all done. plan: C.plan(...). fp: {card: {key: hex}, copy: {key: hex}}; unread: [keys] */
  C.result = function (name, plan, fp, unread) {
    unread = unread || []; const bad = [];
    plan.missing.forEach(k => bad.push({ key: k, why: 'missing' })); plan.short.forEach(k => bad.push({ key: k, why: 'short' })); plan.size.forEach(k => bad.push({ key: k, why: 'size' }));
    let ok = 0, left = 0;
    plan.read.forEach(k => { if (unread.indexOf(k) >= 0) { bad.push({ key: k, why: 'unread' }); return; } const a = fp.card[k], b = fp.copy[k]; if (!a || !b) { left++; return; } if (a === b) ok++; else bad.push({ key: k, why: 'diff' }); });
    bad.sort((x, y) => x.key.localeCompare(y.key));
    return { name, total: plan.missing.length + plan.short.length + plan.size.length + plan.read.length, ok, bad, left, extra: plan.extra.length };
  };
  /* the verdict, in plain words: safe only when every copy has every file, matching, and nothing is left unread */
  C.verdict = function (results) {
    const done = results.every(r => r.left === 0), bad = results.filter(r => r.bad.length);
    if (!results.length) return { safe: false, head: 'Pick a copy to check against.', lines: [] };
    if (!done) return { safe: false, head: 'Not finished.', lines: ['Some files haven\'t been read yet. Check again to finish.'] };
    if (bad.length) return { safe: false, head: 'Don\'t erase the card yet.', lines: results.map(r => r.name + ': ' + (r.bad.length ? r.bad.length + (r.bad.length === 1 ? ' file doesn\'t match.' : ' files don\'t match.') : 'every file matches.')) };
    const one = results.length === 1;
    return { safe: true, one, head: one ? 'Every file matches on ' + results[0].name + '.' : 'Every file matches, on ' + (results.length === 2 ? 'both' : 'all ' + results.length) + ' copies.',
      lines: [one ? 'That\'s one copy. Most sets keep two before erasing. Your call.' : 'Safe to erase the card.'] };
  };
  C.bytes = function (n) { n = +n || 0; if (n < 1024) return n + ' B'; const u = ['KB', 'MB', 'GB', 'TB']; let i = -1; do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1); return (n >= 100 ? Math.round(n) : n >= 10 ? n.toFixed(1) : n.toFixed(1)) + ' ' + u[i]; };
  /* the receipt: a text file kept with the footage. Your editor or post house can check the same fingerprints. */
  C.receipt = function (o) {
    const d = new Date(o.at || Date.now()), L = [];
    L.push('COPY CHECK · ' + (o.card || 'card')); if (o.label) L.push(o.label);
    L.push('Checked ' + d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }));
    L.push('', 'Card: ' + o.files + ' file' + (o.files === 1 ? '' : 's') + ', ' + C.bytes(o.size));
    (o.results || []).forEach(r => { L.push(r.name + ': ' + r.ok + ' of ' + r.total + ' match' + (r.bad.length ? ', ' + r.bad.length + (r.bad.length === 1 ? ' doesn\'t' : ' don\'t') : '')); r.bad.forEach(b => L.push('  ' + b.key + ': ' + C.WHY[b.why])); });
    const v = C.verdict(o.results || []); L.push('', v.head); v.lines.forEach(x => L.push(x));
    L.push('', 'EACH FILE, ITS FINGERPRINT (SHA-256)'); Object.keys(o.fp || {}).sort().forEach(k => L.push(o.fp[k] + '  ' + k));
    L.push('', 'Made with CHECK THE COPY, THEACTORPAGE. Read on this device; nothing uploaded, nothing erased.');
    return L.join('\n');
  };
  /* your checks, the summary only: what card, when, how it came out */
  const LS = () => { try { return g.localStorage; } catch (e) { return null; } };
  C.history = () => { try { const d = JSON.parse((LS() && LS().getItem(KEY)) || 'null'); return Array.isArray(d) ? d : []; } catch (e) { return []; } };
  C.remember = function (o) { const h = C.history(); h.unshift({ at: o.at || Date.now(), card: o.card, label: o.label || '', files: o.files, size: o.size, safe: !!o.safe, copies: (o.results || []).map(r => ({ name: r.name, ok: r.ok, total: r.total, bad: r.bad.length })) }); try { LS().setItem(KEY, JSON.stringify(h.slice(0, 50))); } catch (e) { } return h[0]; };
  C.forget = i => { const h = C.history(); h.splice(i, 1); try { LS().setItem(KEY, JSON.stringify(h)); } catch (e) { } };
  g.CopyCheck = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
