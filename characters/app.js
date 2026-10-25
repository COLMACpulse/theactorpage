/* CHARACTERS page. Reads every tool on this device (shared/characters.js), shows the seven places as counts, and
   nothing else until you tap one. A card opens the character: where they sit for you (what the tools say, plus
   what you add), the trail, where each one came from, your note. Nothing here changes another tool. */
(function () {
  'use strict';
  const C = window.Characters, $ = id => document.getElementById(id), V = $('view');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const day = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
  const GN = Object.fromEntries(C.GROUPS);
  let LIST = [], S = { g: '', c: '', q: '', showHidden: false };
  try { const u = new URLSearchParams(location.search); if (u.get('g') && GN[u.get('g')]) S.g = u.get('g'); } catch (e) { }
  let tt; const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2600); };

  async function load() { LIST = await C.gather(); render(); }
  const find = k => LIST.find(c => c.key === k);
  const trailText = c => c.trail.map(t => (t.step === 'Booked' ? '<b>' : '') + esc(t.step) + (t.at ? ' ' + esc(day(t.at)) : '') + (t.step === 'Booked' ? '</b>' : '')).join(' · ');

  function tiles() {
    const n = C.counts(LIST);
    return '<div class="tiles" role="group" aria-label="Where your characters sit">' + C.GROUPS.map(([k, l]) => '<button type="button" class="tile' + (n[k] ? '' : ' zero') + '" data-g="' + k + '" aria-pressed="' + (S.g === k) + '"><b>' + n[k] + '</b><span>' + esc(l) + '</span></button>').join('') + '</div>';
  }
  function card(c) {
    const srcs = [...new Set(c.sources.map(s => s.label + (s.detail && /take/.test(s.detail) ? ' · ' + s.detail : '')))];
    return '<button type="button" class="cc" data-c="' + esc(c.key) + '"><span class="cn">' + esc(c.name) + '</span>' + (c.project ? '<span class="cp">' + esc(c.project) + '</span>' : '')
      + (c.trail.length ? '<span class="trail">' + trailText(c) + '</span>' : '')
      + (c.note ? '<span class="cnote">' + esc(c.note.length > 100 ? c.note.slice(0, 98).replace(/\s+\S*$/, '') + ' …' : c.note) + '</span>' : '')
      + '<span class="srcs">' + srcs.map(s => '<span class="src">' + esc(s) + '</span>').join('') + (c.yours && !srcs.length ? '<span class="src">Added by you</span>' : '') + '</span></button>';
  }
  function vFront() {
    let h = '<div class="row" style="justify-content:space-between;margin-bottom:14px"><p class="dim small" style="margin:0;max-width:640px">Gathered from your tools on this device. A character can sit in more than one place. Tap a place to see who\'s in it.</p><button type="button" class="btn pri" id="add">+ ADD ONE</button></div>';
    h += tiles();
    if (!LIST.length) h += '<div class="card" style="margin-top:18px"><p style="margin:0">Nothing yet. As you use the tools, your characters land here: sides you bring in, auditions in Project Hub, scripts you write, voices in Character Bank. Or add one yourself: a character you want to create, or one you know you can pull off.</p></div>';
    if (S.g) {
      const q = C.norm(S.q), inG = LIST.filter(c => c.groups[S.g]), hid = inG.filter(c => c.hidden).length;
      const L = inG.filter(c => (S.showHidden || !c.hidden) && (!q || C.norm(c.name + ' ' + c.project).includes(q)));
      h += '<div class="bar"><span class="kicker" style="margin:0">' + esc(GN[S.g]).toUpperCase() + ' · ' + inG.filter(c => !c.hidden).length + ' · NEWEST FIRST</span>'
        + (inG.length > 6 ? '<input class="field" id="q" placeholder="Find a name or a project" value="' + esc(S.q) + '" style="max-width:300px">' : '') + '</div>';
      h += L.length ? '<div class="grid">' + L.map(card).join('') + '</div>' : '<p class="dim">' + (inG.length ? 'Nobody by that name here.' : emptyFor(S.g)) + '</p>';
      if (hid) h += '<p><button type="button" class="lnk" id="showhid">' + (S.showHidden ? 'Hide the ' + hid + ' you hid' : hid + ' hidden · show them') + '</button></p>';
    }
    return h;
  }
  function emptyFor(g) {
    return ({ aud: 'Nobody yet. Sides you bring in, auditions in Project Hub, and self-tapes in Actor OS land here.', booked: 'Nobody yet. Mark a booking in Project Hub, or add your credits in Virtual Résumé.', pull: 'Nobody yet. The types in Virtual Résumé (what you can play) and your Looks land here, or + ADD ONE.', made: 'Nobody yet. Characters you keep in Character Bank, Capsules, and the characters in your Set List bits land here.', want: 'Nobody yet. This one is yours: + ADD ONE.', wrote: 'Nobody yet. The characters in the scripts you write in THEACTORPAGES and keep in Paper Trail land here.', vo: 'Nobody yet. Voices in Character Bank, your voice demo, and the voice on a VO job land here.' })[g] || 'Nobody yet.';
  }
  function vChar(c) {
    let h = '<div class="backbar"><button type="button" class="btn ghost sm" id="back">‹ ' + esc(S.g ? GN[S.g] : 'Characters') + '</button></div>';
    h += '<div class="card"><div class="kicker" style="margin:0">' + esc(c.project || 'No project') + '</div><h2 style="font-size:24px;margin:4px 0">' + esc(c.name) + '</h2>' + (c.trail.length ? '<p class="trail" style="margin:6px 0 0">' + trailText(c) + '</p>' : '') + '</div>';
    h += '<p class="kicker" style="margin-top:18px">Where they sit for you · tap to add</p><div class="gchips">' + C.GROUPS.map(([k, l]) => { const v = c.groups[k];
      return v === 'tool' ? '<button type="button" class="gchip tool" aria-pressed="true" aria-disabled="true" title="From your tools">' + esc(l) + '<small>from your tools</small></button>' : '<button type="button" class="gchip" data-tg="' + k + '" aria-pressed="' + (v === 'you') + '">' + esc(l) + '</button>'; }).join('') + '</div>';
    if (c.sources.length) h += '<p class="kicker" style="margin-top:18px">From your tools · tap to open</p><div class="srclist">' + c.sources.map(s => '<a href="' + esc(s.href || '#') + '"><span>' + esc(s.label) + '</span><i>' + esc(s.detail || 'open') + ' ›</i></a>').join('') + '</div>';
    h += '<label class="kicker" for="note" style="display:block;margin-top:18px">Your note · your words</label><textarea class="field" id="note" placeholder="Only you fill this in.">' + esc(c.note) + '</textarea>';
    h += '<div class="row" style="margin-top:14px"><button type="button" class="btn ghost sm" id="hide">' + (c.hidden ? 'Show this card again' : 'Hide this card') + '</button>' + (c.yours ? '<button type="button" class="btn ghost sm" id="drop">Take off the one you added</button>' : '') + '</div>';
    return h;
  }
  function render() {
    const c = S.c && find(S.c);
    V.innerHTML = c ? vChar(c) : vFront();
    wire(c);
  }
  function edit(fn) { const m = C.mine(); fn(m); C.save(m); }
  function wire(c) {
    V.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.g = S.g === b.dataset.g ? '' : b.dataset.g; S.q = ''; render(); });
    V.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.c = b.dataset.c; render(); window.scrollTo(0, 0); });
    const q = $('q'); if (q) q.oninput = () => { S.q = q.value; const pos = q.selectionStart; render(); const n = $('q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { } } };
    const sh = $('showhid'); if (sh) sh.onclick = () => { S.showHidden = !S.showHidden; render(); };
    const ad = $('add'); if (ad) ad.onclick = openAdd;
    if (!c) return;
    $('back').onclick = () => { S.c = ''; render(); };
    V.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const k = b.dataset.tg; edit(m => { if (c.yours) { const a = m.added.find(x => C.key(x.name, x.project) === c.key); if (a) { a.groups = a.groups || []; a.groups = a.groups.includes(k) ? a.groups.filter(x => x !== k) : a.groups.concat([k]); return; } }
      const e = m.extra[c.key] = m.extra[c.key] || []; m.extra[c.key] = e.includes(k) ? e.filter(x => x !== k) : e.concat([k]); if (!m.extra[c.key].length) delete m.extra[c.key]; }); reload(); });
    let nt; $('note').oninput = e => { clearTimeout(nt); const v = e.target.value; nt = setTimeout(() => { edit(m => { if (v.trim()) m.notes[c.key] = v; else delete m.notes[c.key]; }); c.note = v; }, 350); };
    $('hide').onclick = () => { edit(m => { if (m.hidden[c.key]) delete m.hidden[c.key]; else m.hidden[c.key] = Date.now(); }); toast(c.hidden ? 'Back on the cards.' : 'Hidden. The tools still have it.'); S.c = c.hidden ? c.key : ''; reload(); };
    const dr = $('drop'); if (dr) dr.onclick = () => { edit(m => { m.added = m.added.filter(x => C.key(x.name, x.project) !== c.key); }); S.c = ''; reload(); };
  }
  async function reload() { LIST = await C.gather(); if (S.c && !find(S.c)) S.c = ''; render(); }
  /* + ADD ONE */
  const PICK = new Set();
  function openAdd() {
    PICK.clear(); PICK.add(S.g && S.g !== 'aud' && S.g !== 'booked' && S.g !== 'wrote' ? S.g : 'want');
    $('anm').value = ''; $('apr').value = '';
    paintPick(); $('dlgAdd').showModal(); setTimeout(() => $('anm').focus(), 30);
  }
  function paintPick() { $('agrp').innerHTML = C.GROUPS.map(([k, l]) => '<button type="button" class="gchip" data-pk="' + k + '" aria-pressed="' + PICK.has(k) + '">' + esc(l) + '</button>').join('');
    $('agrp').querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const k = b.dataset.pk; if (PICK.has(k)) PICK.delete(k); else PICK.add(k); paintPick(); }); }
  $('acancel').onclick = () => $('dlgAdd').close();
  $('ago').onclick = () => { const n = $('anm').value.trim(), p = $('apr').value.trim();
    if (!C.isName(n)) { toast('Give them a name.'); return; } if (!PICK.size) { toast('Pick at least one place.'); return; }
    edit(m => { const k = C.key(n, p), a = m.added.find(x => C.key(x.name, x.project) === k); if (a) a.groups = [...new Set((a.groups || []).concat([...PICK]))]; else m.added.push({ id: 'c' + Date.now().toString(36), name: n, project: p, groups: [...PICK], at: Date.now() }); });
    $('dlgAdd').close(); S.g = [...PICK][0]; toast('Added.'); reload(); };
  window.__chars = { list: () => LIST, reload };
  load();
})();
