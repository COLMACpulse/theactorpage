/* CONTACTS: who knows you. Two jobs.
   1. Find someone: a name or an office, and your history with them from every tool on this device: their auditions in
      the Hub, what they told you in NOTES, the credits you share, what you spotted that they're casting.
   2. Your reps: your agent and manager, the ones Spotted, FOR MY REPS and the résumé send to.
   Folded away: looking for a rep (a plain list: who, a note, when you reached out). Nothing is sent from here. */
(function () {
  'use strict';
  const C = window.Contacts, N = window.Notes, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UI = 'contacts_ui_v1';
  const S = Object.assign({ q: '', role: '', open: '', adding: false, addingRep: false, msg: '', look: false }, (() => { try { const u = JSON.parse(localStorage.getItem(UI) || '{}') || {}; return { role: u.role || '' }; } catch (e) { return {}; } })());
  const keepUI = () => { try { localStorage.setItem(UI, JSON.stringify({ role: S.role })); } catch (e) { } };
  let SRC = { notes: [], projects: [], spotted: {}, worked: [] };
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  const FILTERS = [['', 'Everyone'], ['casting', 'Casting'], ['reps', 'Reps'], ['director', 'Directors'], ['producer', 'Producers'], ['coach', 'Coaches'], ['actor', 'Actors'], ['press', 'Press'], ['other', 'Other']];
  const inF = (x, f) => !f || (f === 'reps' ? (x.role === 'agent' || x.role === 'manager') : f === 'other' ? !['casting', 'agent', 'manager', 'director', 'producer', 'coach', 'actor', 'press'].includes(x.role) : x.role === f);
  const keyOf = x => x.p ? x.p.id : 'k:' + C.key(x.name);
  const ini = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const day = d => { const t = d ? new Date(String(d).length === 10 ? d + 'T12:00' : d) : null; return t && !isNaN(t) ? t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  const tel = p => String(p || '').replace(/[^\d+]/g, '');
  function toast(t) { const el = $('toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.opacity = 0, 3000); }

  function personForm(p, x) {
    const v = k => esc(p ? p[k] || '' : '');
    return '<div class="grid2"><div><label class="lab" for="f_name">Name</label><input class="field" id="f_name" value="' + esc(p ? p.name : (x ? x.name : '')) + '" autocomplete="off"></div>'
      + '<div><label class="lab" for="f_role">Role</label><select class="field" id="f_role">' + opts(C.ROLES, p ? p.role : (x ? x.role : 'casting')) + '</select></div>'
      + '<div><label class="lab" for="f_company">Office, agency or company</label><input class="field" id="f_company" value="' + (p ? v('company') : esc(x ? x.company : '')) + '"></div>'
      + '<div><label class="lab" for="f_city">City</label><input class="field" id="f_city" value="' + v('city') + '"></div>'
      + '<div><label class="lab" for="f_email">Email</label><input class="field" id="f_email" inputmode="email" value="' + v('email') + '"></div>'
      + '<div><label class="lab" for="f_phone">Phone</label><input class="field" id="f_phone" inputmode="tel" value="' + v('phone') + '"></div></div>'
      + '<div id="pressbits"' + ((p ? p.role : (x ? x.role : 'casting')) === 'press' ? '' : ' hidden') + '><label class="lab" for="f_beat">Their beat</label><input class="field" id="f_beat" value="' + v('beat') + '" placeholder="Indie film, festivals, local theater">'
      + '<label class="chk" style="margin-top:6px"><input type="checkbox" id="f_checked"' + (p && p.checked ? ' checked' : '') + '> I confirmed who they are and what they cover from their own work, not from a list.</label></div>'
      + '<label class="lab" for="f_site">Website or IMDb</label><input class="field" id="f_site" inputmode="url" value="' + v('site') + '" placeholder="https://">'
      + '<label class="lab" for="f_note">Your note</label><textarea class="field" id="f_note" rows="3" placeholder="How you met, what to remember">' + v('note') + '</textarea>';
  }
  const formVals = () => ({ beat: $('f_beat') ? $('f_beat').value : '', checked: !!($('f_checked') && $('f_checked').checked), name: $('f_name').value, role: $('f_role').value, company: $('f_company').value, city: $('f_city').value, email: $('f_email').value, phone: $('f_phone').value, site: $('f_site').value, note: $('f_note').value });

  /* ---------- the list ---------- */
  function row(x) {
    const p = x.p, tag = p && p.dnc ? 'DO NOT CONTACT' : (p && p.role === 'press' && !p.checked ? 'NOT CONFIRMED YET' : '');
    return '<button type="button" class="person' + (p && p.dnc ? ' dnc' : '') + '" data-open="' + esc(keyOf(x)) + '"><span class="av" aria-hidden="true">' + esc(ini(x.name)) + '</span><span class="pt"><b>' + esc(x.name) + '<span class="rl">' + esc(C.roleName(x.role)) + '</span></b>'
      + '<small>' + esc([x.company && C.key(x.company) !== C.key(x.name) ? x.company + (p && p.beat ? ', ' + p.beat : '') : '', x.from.join(' · ')].filter(Boolean).join(' · ') || (p && p.city) || 'Added by you') + '</small></span>' + (tag ? '<span class="tag">' + tag + '</span>' : '') + '</button>';
  }
  const listed = () => C.everyone(SRC).filter(x => inF(x, S.role) && C.match(x, S.q));
  function listHtml() { const L = listed(); return L.length ? L.map(row).join('') : '<p class="empty"' + (S.q || S.role ? '' : ' data-icbig="contacts"') + '>' + (S.q || S.role ? 'Nobody here for that.' : 'Nobody yet. They show up on their own when your tools meet them: an office on an audition in the Hub, a guest in NOTES, a name on your credits, casting on something you spotted.') + '</p>'; }
  function repsHtml() {
    const mine = C.myReps();
    let h = '<p class="kicker">Your reps</p><div class="card" id="repsbox">';
    h += mine.length ? mine.map(p => '<div class="rep"><span class="pt"><b>' + esc(p.name) + '</b><small>' + esc([C.roleName(p.role).toLowerCase(), p.rep && p.rep.kind ? C.kindName(p.rep.kind).toLowerCase() : '', p.company].filter(Boolean).join(' · ')) + '</small></span>'
      + (p.email ? '<a class="mini" href="mailto:' + esc(p.email) + '">EMAIL</a>' : '') + (p.phone ? '<a class="mini" href="tel:' + esc(tel(p.phone)) + '">CALL</a>' : '') + '<button class="mini" data-open="' + esc(p.id) + '" aria-label="Details for ' + esc(p.name) + '">›</button></div>').join('')
      + '<p class="faint small" style="margin:10px 0 0">Spotted, FOR MY REPS and the résumé send to them.</p>'
      : '<p class="dim small" style="margin:0 0 10px">No agent or manager here yet. Add yours and Spotted, FOR MY REPS and the résumé send to them.</p><button class="btn block" id="addmine" data-ic="plus">ADD YOUR REP</button>';
    return h + '</div>';
  }
  function addRepHtml() {
    return '<div class="card" id="detail"><p class="kicker">' + (S.addingRep === 'mine' ? 'Your rep' : 'A rep you’re looking at') + '</p><div class="grid2"><div><label class="lab" for="r_name">Name</label><input class="field" id="r_name"></div>'
      + '<div><label class="lab" for="r_company">Agency or company</label><input class="field" id="r_company"></div>'
      + '<div><label class="lab" for="r_role">Agent or manager</label><select class="field" id="r_role">' + opts([['agent', 'Agent'], ['manager', 'Manager']], 'agent') + '</select></div>'
      + '<div><label class="lab" for="r_kind">For</label><select class="field" id="r_kind">' + opts(C.REPKINDS, 'theatrical') + '</select></div>'
      + '<div><label class="lab" for="r_email">Email</label><input class="field" id="r_email" inputmode="email"></div><div><label class="lab" for="r_phone">Phone</label><input class="field" id="r_phone" inputmode="tel"></div></div>'
      + '<label class="chk" style="margin-top:6px"><input type="checkbox" id="r_signed"' + (S.addingRep === 'mine' ? ' checked' : '') + '> I’m signed with them</label>'
      + '<div class="row" style="margin-top:10px"><button class="btn pri" id="keeprep">ADD</button><button class="btn ghost" data-close>CANCEL</button></div></div>';
  }
  function lookHtml() {
    const look = C.looking().sort((a, b) => a.name.localeCompare(b.name));
    let h = '<details class="fold" id="lookfold"' + (S.look ? ' open' : '') + '><summary data-icr="spot" data-icc="you" data-say="who to ask, and how"><span data-icl>LOOKING FOR A REP?</span></summary>';
    h += look.length ? '<div class="card" style="padding:4px 14px;background:var(--bg)">' + look.map(p => { const r = p.rep || {};
      return '<div class="look" data-rep="' + p.id + '"><div class="row" style="justify-content:space-between"><span class="pt"><b>' + esc(p.name) + '</b><small>' + esc([C.roleName(p.role).toLowerCase(), p.company, r.kind ? C.kindName(r.kind).toLowerCase() : ''].filter(Boolean).join(' · ')) + '</small></span><button class="mini" data-open="' + p.id + '">DETAILS</button></div>'
        + '<div class="grid2"><div><label class="lab">Reached out</label><input class="field" type="date" data-sent value="' + esc(r.sent || '') + '"></div><div><label class="lab">How they take submissions</label><select class="field" data-how>' + opts(C.HOW, r.how || 'unknown') + '</select></div></div>'
        + (p.note ? '<p class="small dim" style="margin:6px 0 0">' + esc(p.note) + '</p>' : '')
        + '<div class="row" style="margin-top:8px"><button class="btn sm" data-signed>I SIGNED WITH THEM</button></div></div>'; }).join('') + '</div>'
      : '<p class="dim small" style="margin:0">The agents and managers you’re looking at, in one place: who, when you reached out, how they take submissions.</p>';
    h += '<p class="small" style="margin:12px 0 4px">Where to look</p><ul class="where small">'
      + '<li><a href="https://www.sagaftra.org/agents" target="_blank" rel="noopener">SAG-AFTRA agents</a>: union-franchised agencies, and the union’s advice on finding one</li>'
      + '<li><a href="https://www.agentassociation.com/" target="_blank" rel="noopener">Association of Talent Agents</a>: member agencies</li>'
      + '<li>A referral beats a cold submission: ask a casting director you’ve read for, or an actor you know who’s repped</li></ul>'
      + '<p class="warn">A real agent never charges you to sign or to be seen. If someone asks for money up front, walk away.</p>'
      + '<button class="btn" id="addrep">ADD ONE YOU’RE LOOKING AT</button></details>';
    return h;
  }
  function listBox() {
    const L = S.list; if (!L) return '';
    const nw = L.people.filter(x => !C.find(x.name)).length, by = {}; L.people.forEach(x => { by[x.role] = (by[x.role] || 0) + 1; });
    return '<div class="card" id="listbox"><p class="kicker">From ' + esc(L.file) + '</p>' + (L.people.length ? '<p class="small" style="margin:0">' + L.people.length + ' ' + (L.people.length === 1 ? 'person' : 'people') + ': ' + nw + ' new, ' + (L.people.length - nw) + ' already here (only their blanks get filled in).' + (L.blank ? ' ' + L.blank + ' row' + (L.blank === 1 ? '' : 's') + ' had no name and stay out.' : '') + '</p>'
      + '<p class="dim small" style="margin:4px 0 0">' + esc(Object.keys(by).map(r => by[r] + ' ' + C.roleName(r).toLowerCase()).join(', ')) + '</p>'
      + '<label class="lab" for="l_role">Anyone the list doesn’t say</label><select class="field" id="l_role"><option value="">Other</option>' + opts(C.ROLES.filter(r => r[0] !== 'other'), L.role || '') + '</select>'
      + '<p class="dim small" style="margin:8px 0 4px">' + esc(L.people.slice(0, 8).map(x => x.name + (x.company && C.key(x.company) !== C.key(x.name) ? ' (' + x.company + ')' : '')).join(', ')) + (L.people.length > 8 ? ', and ' + (L.people.length - 8) + ' more' : '') + '</p>'
      + '<p class="faint small" style="margin:0">They come in as from your list, not confirmed. Nothing is sent to anyone.</p><div class="row" style="margin-top:10px"><button class="btn pri" id="listin">BRING THEM IN</button><button class="btn ghost" id="listno">CANCEL</button></div>'
      : '<p class="small" style="margin:0">No names found. The list needs a column called Name, or First and Last name.</p><div class="row" style="margin-top:10px"><button class="btn ghost" id="listno">OK</button></div>') + '</div>';
  }
  function homeView() {
    const all = C.everyone(SRC), n = f => all.filter(x => inF(x, f)).length;
    let h = S.msg ? '<p class="msg" id="msg">' + esc(S.msg) + '</p>' : '';
    h += '<div class="grid"><div class="colA"><label class="kicker" for="q">Find someone</label><input class="field find" id="q" type="search" placeholder="A name, an office, a show, a city" value="' + esc(S.q) + '" autocomplete="off">'
      + '<div class="chips" role="group" aria-label="Show">' + FILTERS.filter(([v]) => !v || n(v)).map(([v, l]) => '<button type="button" class="chip sm' + (S.role === v ? ' on' : '') + '" data-role="' + v + '">' + l.toUpperCase() + '<i>' + n(v) + '</i></button>').join('') + '</div>';
    h += listBox();
    if (S.adding) h += '<div class="card" id="detail"><p class="kicker">Add a person</p>' + personForm(null) + '<div class="row" style="margin-top:12px"><button class="btn pri" id="keepnew">ADD</button><button class="btn ghost" data-close>CANCEL</button></div></div>';
    h += '<div class="card list" id="plist">' + listHtml() + '</div></div>';
    h += '<div class="colB">' + repsHtml() + (S.addingRep ? addRepHtml() : '')
      + '<div class="row" style="margin:0 0 12px"><button class="btn pri" id="add" data-ic="plus" style="flex:1">ADD A PERSON</button><label class="btn" id="listbtn" data-ic="pt" style="flex:1">BRING IN A LIST<input type="file" id="listfile" accept=".csv,.tsv,.txt,.xlsx,text/csv" hidden></label></div>'
      + lookHtml() + '</div></div>';
    return h;
  }

  /* ---------- one person: what your tools know ---------- */
  const offOf = p => p.casting_office || p.office || p.casting_director || p.casting || '';
  const when = p => p.date || p.when || p.deadline || '';
  function known(x) {
    const ks = [C.key(x.name), x.company ? C.key(x.company) : ''].filter(Boolean), out = [];
    const reads = (SRC.projects || []).filter(p => p && (p.aaid || p.kind === 'audition') && ks.includes(C.key(offOf(p)))).sort((a, b) => String(when(b)).localeCompare(String(when(a))));
    if (reads.length) { const o = p => p.outcome || {}, bits = p => [o(p).booked ? 'booked' : '', o(p).pinned ? 'pinned' : '', o(p).callback ? 'callback' : ''].filter(Boolean).join(', ');
      out.push('<div class="card" id="k_hub"><p class="kicker">The Hub · ' + reads.length + ' audition' + (reads.length === 1 ? '' : 's') + '</p>' + reads.slice(0, 6).map(p => '<div class="hl"><span>' + esc(day(when(p)) || 'no date') + '</span><span class="t">' + esc([p.project || p.title, p.role].filter(Boolean).join(' · ')) + (bits(p) ? ' · ' + esc(bits(p)) : '') + '</span></div>').join('')
        + (reads.length > 6 ? '<p class="faint small" style="margin:6px 0 0">And ' + (reads.length - 6) + ' more.</p>' : '') + '<p class="small" style="margin:8px 0 0"><a href="../hub/">Open the Hub</a></p></div>'); }
    let said = [], met = null; try { if (N) { said = N.byPerson(x.name); met = N.met(x.name); } } catch (e) { }
    if (said.length || met) out.push('<div class="card" id="k_notes"><p class="kicker">NOTES' + (said.length ? ' · what they said' : '') + '</p>' + (said.length ? '<p class="q" style="margin:0 0 4px">“' + esc(said[0].text) + '”</p><p class="faint small" style="margin:0">' + esc([said[0].title, day(said[0].date)].filter(Boolean).join(', ')) + '</p>' : '')
      + '<p class="dim small" style="margin:6px 0 0">' + esc([met ? met.sessions + ' session' + (met.sessions === 1 ? '' : 's') : '', said.length ? said.length + ' note' + (said.length === 1 ? '' : 's') : ''].filter(Boolean).join(' · ')) + '</p><p class="small" style="margin:8px 0 0"><a href="../notes/">Open NOTES</a></p></div>');
    const ww = x.from.filter(f => /^Worked with: /.test(f)).map(f => f.replace(/^Worked with: /, ''));
    if (ww.length) out.push('<div class="card" id="k_worked"><p class="kicker">You’ve worked together</p>' + ww.map(t => '<p class="small" style="margin:4px 0">' + esc(t.charAt(0).toUpperCase() + t.slice(1)) + '</p>').join('') + '</div>');
    const sp = ((SRC.spotted && SRC.spotted.items) || []).filter(it => it && it.card && (it.card.casting || []).some(n => ks.includes(C.key(n))));
    if (sp.length) out.push('<div class="card" id="k_spotted"><p class="kicker">Spotted</p>' + sp.map(it => '<p class="small" style="margin:4px 0">Casting ' + esc([it.card.role, it.card.project].filter(Boolean).join(', ') || 'a project') + '.' + (it.sentAt ? ' You passed it along ' + esc(day(it.sentAt)) + '.' : '') + '</p>').join('') + '<p class="small" style="margin:8px 0 0"><a href="../spotted/">Open Spotted</a></p></div>');
    return out.join('') || '<div class="card"><p class="dim small" style="margin:0">Nothing in your tools yet. When they’re on an audition, in a class or on a credit, it shows up here.</p></div>';
  }
  function personView(key) {
    const x = C.everyone(SRC).find(y => keyOf(y) === key); if (!x) { S.open = ''; return homeView(); }
    const p = x.p;
    let h = '<div class="backbar"><button class="btn sm ghost" data-close>‹ CONTACTS</button></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="grid" id="detail"><div class="colA"><p class="kicker" style="margin:0">' + esc(C.roleName(x.role)) + (p && p.dnc ? ' · do not contact' : '') + '</p><p class="pname">' + esc(x.name) + '</p>'
      + '<p class="dim" style="margin:0 0 12px">' + esc([x.company && C.key(x.company) !== C.key(x.name) ? x.company : '', p && p.city].filter(Boolean).join(' · ')) + '</p>';
    if (p && !p.dnc && (p.email || p.phone || p.site)) h += '<div class="row" style="margin-bottom:12px">' + (p.email ? '<a class="btn pri" href="mailto:' + esc(p.email) + '" style="flex:1">EMAIL</a>' : '') + (p.phone ? '<a class="btn" href="tel:' + esc(tel(p.phone)) + '" style="flex:1">CALL</a>' : '') + (/^https?:\/\//.test(p.site || '') ? '<a class="btn" href="' + esc(p.site) + '" target="_blank" rel="noopener" style="flex:1">THEIR PAGE</a>' : '') + '</div>';
    if (p && p.note) h += '<p class="kicker">Your note</p><p style="margin:0 0 12px;white-space:pre-wrap">' + esc(p.note) + '</p>';
    if (!p) h += '<p class="dim small">Your tools know them. Keep them to add an email, a phone or a note of your own.</p>';
    h += '<details class="fold" id="detfold"' + (p ? '' : ' open') + '><summary>' + (p ? 'THEIR DETAILS' : 'KEEP THEM') + '</summary>' + personForm(p, x)
      + (p ? '<label class="chk" style="margin-top:10px"><input type="checkbox" id="f_dnc"' + (p.dnc ? ' checked' : '') + '> Do not contact. They stay here, and never come up as someone to reach.</label>' : '')
      + '<div class="row" style="margin-top:12px">' + (p ? '<button class="btn pri" id="save">SAVE</button><button class="lnk faint" id="del" style="margin-left:auto">remove</button>' : '<button class="btn pri" id="keep">KEEP</button>') + '</div></details>';
    h += '</div><div class="colB"><p class="kicker">What your tools know</p>' + known(x) + '</div></div>';
    return h;
  }

  /* ---------- draw and wire ---------- */
  function render() { $('view').innerHTML = S.open ? personView(S.open) : homeView(); S.msg = ''; wire(); keepUI(); }
  function wire() {
    const V = $('view');
    const q = $('q'); if (q) q.oninput = () => { S.q = q.value; $('plist').innerHTML = listHtml(); wireOpen($('plist')); };
    V.querySelectorAll('[data-role]').forEach(b => b.onclick = () => { S.role = b.dataset.role; render(); });
    wireOpen(V);
    V.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { S.open = ''; S.adding = false; S.addingRep = false; S.pre = null; render(); window.scrollTo(0, 0); });
    const lf = $('listfile'); if (lf) lf.onchange = async () => { const f = lf.files && lf.files[0]; lf.value = ''; if (!f) return; let rows = [];
      try { if (/\.xlsx$/i.test(f.name) && window.XLSX) { const sh = await XLSX.read(await f.arrayBuffer()); rows = (sh[0] && sh[0].rows) || []; } else rows = window.XLSX ? XLSX.csv(await f.text()) : (await f.text()).split(/\r?\n/).map(l => l.split(',')); } catch (e) { S.msg = 'Couldn’t read ' + f.name + '. A CSV or an Excel file works.'; render(); return; }
      S.list = Object.assign(C.fromRows(rows), { file: f.name, rows }); S.adding = false; render(); };
    if ($('l_role')) $('l_role').onchange = () => { const L = S.list; S.list = Object.assign(C.fromRows(L.rows, $('l_role').value), { file: L.file, rows: L.rows, role: $('l_role').value }); render(); };
    if ($('listno')) $('listno').onclick = () => { S.list = null; render(); };
    if ($('listin')) $('listin').onclick = () => { const L = S.list, r = C.bringIn(L.people, L.file); S.list = null; S.msg = r.added + ' added from ' + L.file + (r.filled ? ', ' + r.filled + ' already here got their blanks filled in' : '') + '.'; render(); };
    if ($('add')) $('add').onclick = () => { S.adding = true; S.addingRep = false; render(); $('f_name').focus(); };
    const fr = $('f_role'); if (fr) fr.onchange = () => { const pb = $('pressbits'); if (pb) pb.hidden = fr.value !== 'press'; };
    if (S.pre && S.adding) { const pr = S.pre; $('f_role').value = 'press'; $('pressbits').hidden = false; $('f_company').value = pr.outlet || ''; $('f_site').value = pr.link || ''; $('f_note').value = pr.story ? 'Saw: ' + pr.story : ''; $('f_name').placeholder = 'The writer, once you know who'; }
    if ($('addrep')) $('addrep').onclick = () => { S.addingRep = 'look'; S.adding = false; S.look = true; render(); $('r_name').focus(); };
    if ($('addmine')) $('addmine').onclick = () => { S.addingRep = 'mine'; S.adding = false; render(); $('r_name').focus(); };
    if ($('lookfold')) $('lookfold').ontoggle = e => { S.look = e.target.open; };
    if ($('keepnew')) $('keepnew').onclick = () => { const v = formVals(); if (!v.name.trim() && v.role === 'press' && v.company.trim()) v.name = v.company; if (!v.name.trim()) { $('f_name').focus(); return; } const p = C.add(v); S.adding = false; S.pre = null; S.msg = p.name + ' added.'; render(); };
    if ($('keep')) $('keep').onclick = () => { const v = formVals(); if (!v.name.trim()) return; const p = C.add(v); S.open = p.id; S.msg = p.name + ' kept.'; render(); };
    if ($('save')) $('save').onclick = () => { const p = C.set(S.open, Object.assign(formVals(), { dnc: $('f_dnc').checked })); S.msg = 'Saved.'; if (p && C.isRep(p) && !p.rep) C.setRep(p.id, {}); render(); };
    if ($('f_dnc')) $('f_dnc').onchange = e => { C.set(S.open, { dnc: e.target.checked }); };
    if ($('del')) $('del').onclick = () => { const p = C.get(S.open); if (!p) return; C.remove(p.id); S.open = ''; S.msg = p.name + ' removed from your list. If a tool knows them, they still show up.'; render(); };
    if ($('keeprep')) $('keeprep').onclick = () => { const n = $('r_name').value.trim(); if (!n) { $('r_name').focus(); return; } const signed = $('r_signed').checked;
      const p = C.add({ name: n, company: $('r_company').value, role: $('r_role').value, email: $('r_email').value, phone: $('r_phone').value }); C.setRep(p.id, { kind: $('r_kind').value, step: signed ? 'signed' : 'researching' });
      S.addingRep = false; S.msg = n + (signed ? ' is one of your reps.' : ' added to the reps you’re looking at.'); if (!signed) S.look = true; render(); };
    V.querySelectorAll('[data-rep]').forEach(card => { const id = card.dataset.rep;
      const sn = card.querySelector('[data-sent]'); if (sn) sn.onchange = () => { C.setRep(id, { sent: sn.value }); };
      const hw = card.querySelector('[data-how]'); if (hw) hw.onchange = () => { C.setRep(id, { how: hw.value }); };
      const sg = card.querySelector('[data-signed]'); if (sg) sg.onclick = () => { C.setRep(id, { step: 'signed' }); S.msg = C.get(id).name + ' is one of your reps now.'; render(); };
    });
  }
  function wireOpen(root) { root.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.preventDefault(); S.open = b.dataset.open; S.adding = false; S.addingRep = false; render(); window.scrollTo(0, 0); }); }

  const pm = new URLSearchParams(location.search);
  if (pm.get('press') != null) { S.adding = true; S.pre = { outlet: pm.get('press') || '', link: /^https:\/\//.test(pm.get('link') || '') ? pm.get('link') : '', story: pm.get('story') || '' }; }
  const who = pm.get('who');
  render();
  if (pm.get('tab') === 'reps') { const r = $('repsbox'); if (r) r.scrollIntoView({ block: 'start' }); }
  C.sources().then(s => { SRC = s; if (who) { const x = C.everyone(SRC).find(y => C.key(y.name) === C.key(who)); if (x) S.open = keyOf(x); } render(); });
  window.CONTACTS = { render, src: () => SRC };
})();
