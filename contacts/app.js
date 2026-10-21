/* CONTACTS page. EVERYONE: one list, find, by role, add a person, open one to change it.
   REPS: your agent and manager; and if you're looking, the reps you're looking at, a step for each, follow-ups. */
(function () {
  'use strict';
  const C = window.Contacts, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UI = 'contacts_ui_v1';
  const S = Object.assign({ tab: 'all', q: '', role: '', open: '', adding: false, msg: '' }, (() => { try { return JSON.parse(localStorage.getItem(UI) || '{}') || {}; } catch (e) { return {}; } })());
  const keep = () => { try { localStorage.setItem(UI, JSON.stringify({ tab: S.tab, role: S.role })); } catch (e) { } };
  let SRC = { notes: [], projects: [], spotted: {} };
  const today = () => new Date().toISOString().slice(0, 10);
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  const FILTERS = [['', 'All'], ['casting', 'Casting'], ['reps', 'Reps'], ['director', 'Directors'], ['producer', 'Producers'], ['coach', 'Coaches'], ['actor', 'Actors'], ['other', 'Other']];

  function personForm(p, x) {
    const v = k => esc(p ? p[k] || '' : '');
    return '<div class="grid2"><div><label class="lab" for="f_name">NAME</label><input class="field" id="f_name" value="' + esc(p ? p.name : (x ? x.name : '')) + '" autocomplete="off"></div>'
      + '<div><label class="lab" for="f_role">ROLE</label><select class="field" id="f_role">' + opts(C.ROLES, p ? p.role : (x ? x.role : 'casting')) + '</select></div>'
      + '<div><label class="lab" for="f_company">OFFICE, AGENCY OR COMPANY</label><input class="field" id="f_company" value="' + (p ? v('company') : esc(x ? x.company : '')) + '"></div>'
      + '<div><label class="lab" for="f_city">CITY</label><input class="field" id="f_city" value="' + v('city') + '"></div>'
      + '<div><label class="lab" for="f_email">EMAIL</label><input class="field" id="f_email" inputmode="email" value="' + v('email') + '"></div>'
      + '<div><label class="lab" for="f_phone">PHONE</label><input class="field" id="f_phone" inputmode="tel" value="' + v('phone') + '"></div></div>'
      + '<label class="lab" for="f_site">WEBSITE OR IMDB</label><input class="field" id="f_site" inputmode="url" value="' + v('site') + '" placeholder="https://">'
      + '<label class="lab" for="f_note">YOUR NOTE</label><textarea class="field" id="f_note" rows="2" placeholder="How you met, what they liked, what to remember">' + v('note') + '</textarea>';
  }
  const formVals = () => ({ name: $('f_name').value, role: $('f_role').value, company: $('f_company').value, city: $('f_city').value, email: $('f_email').value, phone: $('f_phone').value, site: $('f_site').value, note: $('f_note').value });

  function row(x) {
    const p = x.p, due = p && p.rep && p.rep.next && p.rep.next <= today() && p.rep.step !== 'signed' && p.rep.step !== 'passed';
    const key = p ? p.id : 'k:' + C.key(x.name);
    return '<button type="button" class="person' + (p && p.dnc ? ' dnc' : '') + (due ? ' due' : '') + '" data-open="' + esc(key) + '"><span class="tag">' + (p ? (p.dnc ? 'DO NOT CONTACT' : 'KEPT') : 'FROM YOUR TOOLS') + '</span>'
      + '<b>' + esc(x.name) + '</b><span class="rl">' + esc(C.roleName(x.role).toUpperCase()) + '</span>'
      + (x.company && C.key(x.company) !== C.key(x.name) ? '<span class="from">' + esc(x.company) + '</span>' : '')
      + (x.from.length ? '<span class="from">' + esc(x.from.join(' · ')) + '</span>' : '')
      + (due ? '<span class="from" style="color:var(--gold)">Follow up: ' + esc(p.rep.next) + '</span>' : '') + '</button>';
  }
  function detail(key) {
    const all = C.everyone(SRC), x = all.find(y => (y.p ? y.p.id : 'k:' + C.key(y.name)) === key); if (!x) return '';
    if (!x.p) return '<div class="card" id="detail"><p class="kick">FROM YOUR TOOLS</p><p><b>' + esc(x.name) + '</b> · ' + esc(C.roleName(x.role)) + '</p><p class="mut small">' + esc(x.from.join(' · ')) + '</p>'
      + '<p class="dim small">Keep them to add an email, a phone or a note of your own.</p>' + personForm(null, x)
      + '<div class="row" style="margin-top:12px"><button class="btn" id="keep">KEEP</button><button class="btn quiet" data-close>CLOSE</button></div></div>';
    const p = x.p;
    return '<div class="card" id="detail"><p class="kick">' + esc(C.roleName(p.role).toUpperCase()) + '</p>' + personForm(p)
      + (x.from.length ? '<p class="mut small" style="margin:10px 0 0">Your tools know them from: ' + esc(x.from.join(' · ')) + '</p>' : '')
      + '<label class="row small" style="margin-top:12px;gap:8px"><input type="checkbox" id="f_dnc"' + (p.dnc ? ' checked' : '') + '> Do not contact. They stay here, and never come up as someone to reach.</label>'
      + (C.isRep(p) ? '<p class="small" style="margin:10px 0 0"><a href="#" data-gotab="reps">Their rep step is on REPS</a></p>' : '')
      + '<div class="row" style="margin-top:12px"><button class="btn" id="save">SAVE</button><button class="btn quiet" data-close>CLOSE</button><button class="btn quiet" id="del" style="margin-left:auto">REMOVE</button></div></div>';
  }
  function allView() {
    const list = C.everyone(SRC).filter(x => (!S.role || (S.role === 'reps' ? (x.role === 'agent' || x.role === 'manager') : x.role === S.role)) && C.match(x, S.q));
    let h = '<div class="row"><input class="field" id="q" type="search" placeholder="Find: a name, an office, a city" value="' + esc(S.q) + '" aria-label="Find a contact" style="flex:1 1 240px"><button class="btn" id="add">ADD A PERSON</button></div>'
      + '<div class="chips" role="group" aria-label="Show">' + FILTERS.map(([v, l]) => '<button type="button" class="chip' + (S.role === v ? ' on' : '') + '" data-role="' + v + '">' + l.toUpperCase() + '</button>').join('') + '</div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    if (S.adding) h += '<div class="card" id="detail"><p class="kick">ADD A PERSON</p>' + personForm(null) + '<div class="row" style="margin-top:12px"><button class="btn" id="keepnew">ADD</button><button class="btn quiet" data-close>CANCEL</button></div></div>';
    if (S.open) h += detail(S.open);
    h += list.length ? list.map(row).join('') : '<p class="empty">' + (S.q || S.role ? 'Nobody here for that.' : 'Nobody yet. Add a person, or they show up here when your tools meet them: a guest in NOTES, a casting office on an audition in the Hub, casting on something you spotted.') + '</p>';
    return h;
  }
  function repRow(p, signed) {
    const r = p.rep || {}, due = r.next && r.next <= today() && !signed && r.step !== 'passed';
    return '<div class="card' + (due ? ' due' : '') + '" data-rep="' + p.id + '"><div class="row" style="justify-content:space-between"><div><b style="font-weight:500">' + esc(p.name) + '</b> <span class="mut small">' + esc([C.roleName(p.role), p.company, C.kindName(r.kind)].filter(Boolean).join(' · ')) + '</span></div><button class="btn quiet" data-open="' + p.id + '" data-gotab="all">DETAILS</button></div>'
      + (signed ? '<p class="small dim" style="margin:6px 0 0">Your ' + esc(C.roleName(p.role).toLowerCase()) + (p.email ? '. ' + esc(p.email) : '') + '. Spotted sends to them when you pass something along.</p>'
        : '<div class="steps" style="margin-top:10px" role="group" aria-label="Step for ' + esc(p.name) + '">' + C.STEPS.map(([v, l]) => '<button type="button" class="chip' + ((r.step || 'researching') === v ? ' on' : '') + '" data-step="' + v + '">' + l.toUpperCase() + '</button>').join('') + '</div>'
        + '<div class="grid2"><div><label class="lab">HOW THEY TAKE SUBMISSIONS</label><select class="field" data-how>' + opts(C.HOW, r.how || 'unknown') + '</select></div>'
        + '<div><label class="lab">FOLLOW UP ON</label><input class="field" type="date" data-next value="' + esc(r.next || '') + '"></div></div>'
        + (due ? '<p class="msg">Follow-up is due.</p>' : '')
        + ((r.log || []).length ? '<p class="mut small" style="margin:8px 0 0">' + esc(r.log.map(l => C.stepName(l.step) + ' ' + new Date(l.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })).join(' · ')) + '</p>' : ''))
      + '</div>';
  }
  function repsView() {
    const mine = C.myReps(), look = C.looking(), dueN = C.due().length;
    let h = '';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<p class="kick">YOUR REPS</p>' + (mine.length ? mine.map(p => repRow(p, true)).join('') : '<p class="empty">No agent or manager yet. When you sign with one, mark them SIGNED and they move up here.</p>');
    h += '<div class="card"><p class="kick">LOOKING FOR A REP?</p><p class="dim small" style="margin:0">Keep every agent and manager you’re looking at in one place: where you are with each one, how they take submissions, and when to follow up.' + (dueN ? ' <b style="color:var(--gold)">' + dueN + ' follow-up' + (dueN === 1 ? '' : 's') + ' due.</b>' : '') + '</p>'
      + '<p class="small" style="margin:10px 0 4px">Where to look</p><ul class="where small">'
      + '<li><a href="https://www.sagaftra.org/agents" target="_blank" rel="noopener">SAG-AFTRA agents</a>: union-franchised agencies, and the union’s advice on finding one</li>'
      + '<li><a href="https://www.agentassociation.com/" target="_blank" rel="noopener">Association of Talent Agents</a>: member agencies</li>'
      + '<li>A referral beats a cold submission: ask a casting director you’ve read for, or an actor you know who’s repped</li></ul>'
      + '<p class="warn">A real agent never charges you to sign or to be seen. If someone asks for money up front, walk away.</p>'
      + '<div class="row" style="margin-top:6px"><button class="btn" id="addrep">ADD A REP TO LOOK AT</button></div></div>';
    if (S.adding) h += '<div class="card" id="detail"><p class="kick">ADD A REP</p><div class="grid2"><div><label class="lab" for="r_name">NAME</label><input class="field" id="r_name"></div>'
      + '<div><label class="lab" for="r_company">AGENCY OR COMPANY</label><input class="field" id="r_company"></div>'
      + '<div><label class="lab" for="r_role">AGENT OR MANAGER</label><select class="field" id="r_role">' + opts([['agent', 'Agent'], ['manager', 'Manager']], 'agent') + '</select></div>'
      + '<div><label class="lab" for="r_kind">FOR</label><select class="field" id="r_kind">' + opts(C.REPKINDS, 'theatrical') + '</select></div></div>'
      + '<label class="row small" style="margin-top:12px;gap:8px"><input type="checkbox" id="r_signed"> I’m signed with them</label>'
      + '<div class="row" style="margin-top:12px"><button class="btn" id="keeprep">ADD</button><button class="btn quiet" data-close>CANCEL</button></div></div>';
    h += '<p class="kick" style="margin-top:18px">LOOKING AT</p>' + (look.length ? look.sort((a, b) => String((a.rep || {}).next || '9').localeCompare(String((b.rep || {}).next || '9'))).map(p => repRow(p, false)).join('') : '<p class="empty">Nobody yet.</p>');
    return h;
  }
  function render() {
    ['all', 'reps'].forEach(t => { const b = $('t_' + t); b.classList.toggle('on', S.tab === t); b.setAttribute('aria-selected', String(S.tab === t)); });
    $('view').innerHTML = S.tab === 'reps' ? repsView() : allView(); S.msg = ''; wire(); keep();
  }
  function wire() {
    const V = $('view');
    const q = $('q'); if (q) q.oninput = () => { S.q = q.value; const at = q.selectionStart; render(); const n = $('q'); n.focus(); try { n.setSelectionRange(at, at); } catch (e) { } };
    V.querySelectorAll('[data-role]').forEach(b => b.onclick = () => { S.role = b.dataset.role; render(); });
    V.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.preventDefault(); S.open = b.dataset.open; S.adding = false; if (b.dataset.gotab) S.tab = b.dataset.gotab; render(); const d = $('detail'); if (d) d.scrollIntoView({ block: 'nearest' }); });
    V.querySelectorAll('[data-gotab]:not([data-open])').forEach(b => b.onclick = e => { e.preventDefault(); S.tab = b.dataset.gotab; S.open = ''; render(); });
    V.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { S.open = ''; S.adding = false; render(); });
    if ($('add')) $('add').onclick = () => { S.adding = true; S.open = ''; render(); $('f_name').focus(); };
    if ($('addrep')) $('addrep').onclick = () => { S.adding = true; render(); $('r_name').focus(); };
    if ($('keepnew')) $('keepnew').onclick = () => { const v = formVals(); if (!v.name.trim()) { $('f_name').focus(); return; } const p = C.add(v); S.adding = false; S.msg = p.name + ' added.'; render(); };
    if ($('keep')) $('keep').onclick = () => { const v = formVals(); if (!v.name.trim()) return; const p = C.add(v); S.open = p.id; S.msg = p.name + ' kept.'; render(); };
    if ($('save')) $('save').onclick = () => { const p = C.set(S.open, Object.assign(formVals(), { dnc: $('f_dnc').checked })); S.msg = 'Saved.'; if (p && C.isRep(p) && !p.rep) C.setRep(p.id, {}); render(); };
    if ($('del')) $('del').onclick = () => { const p = C.get(S.open); if (!p) return; C.remove(p.id); S.open = ''; S.msg = p.name + ' removed from your list. If a tool knows them, they still show up as from your tools.'; render(); };
    if ($('keeprep')) $('keeprep').onclick = () => { const n = $('r_name').value.trim(); if (!n) { $('r_name').focus(); return; } const p = C.add({ name: n, company: $('r_company').value, role: $('r_role').value }); C.setRep(p.id, { kind: $('r_kind').value, step: $('r_signed').checked ? 'signed' : 'researching' }); S.adding = false; S.msg = n + (($('r_signed') && $('r_signed').checked) ? ' is one of your reps.' : ' added to LOOKING AT.'); render(); };
    V.querySelectorAll('[data-rep]').forEach(card => { const id = card.dataset.rep;
      card.querySelectorAll('[data-step]').forEach(b => b.onclick = () => { C.setRep(id, { step: b.dataset.step }); if (b.dataset.step === 'signed') S.msg = C.get(id).name + ' is one of your reps now.'; render(); });
      const hw = card.querySelector('[data-how]'); if (hw) hw.onchange = () => { C.setRep(id, { how: hw.value }); };
      const nx = card.querySelector('[data-next]'); if (nx) nx.onchange = () => { C.setRep(id, { next: nx.value }); render(); };
    });
  }
  document.querySelectorAll('.tabs [data-tab]').forEach(b => b.onclick = () => { S.tab = b.dataset.tab; S.open = ''; S.adding = false; render(); });
  const m = location.search.match(/[?&]tab=(all|reps)/); if (m) S.tab = m[1];
  const nm = location.search.match(/[?&]who=([^&]+)/);
  render();
  C.sources().then(s => { SRC = s; if (nm) { const w = decodeURIComponent(nm[1].replace(/\+/g, ' ')), x = C.everyone(SRC).find(y => C.key(y.name) === C.key(w)); if (x) { S.tab = 'all'; S.open = x.p ? x.p.id : 'k:' + C.key(x.name); } } render(); });
  window.CONTACTS = { render, src: () => SRC };
})();
