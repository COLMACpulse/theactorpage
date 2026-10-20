/* THEACTORPAGE FOR MY REPS: one sheet that does your reps' homework for them, and only says what's new.
   The same sheet for your agent and your manager:
     MY WORK            your page
     WHERE I STAND      casting offices by where you stand with them (the Hub's own groups), with counts and the last read
     NETWORKS / PEOPLE  the networks on your credits; directors on your credits; casting, directors and producers from NOTES
     ON MY RADAR        offices you want to reach and why; offices casting now (from SPOTTED) that have never had you in
     RIGHT FOR / WANT   your types and the roles you're called in for; what you want more of and want to be seen for
     CASTING THAT FITS  what you spotted that has your words in it, with links
   WHAT'S NEW: compared with what you last sent (a small snapshot kept when you tap I SENT IT), only the changes.
   When to send: you pick (when something changes, or every week, two weeks or month). Nothing sends itself.
   Rules: counts and your own words, no scores; other people's phone numbers and emails never go on it; offices you
   marked Do not contact never appear. Pure: runs in Node for the tests. */
(function (g) {
  'use strict';
  const R = {};
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const pl = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  const key = x => String(x || '').toLowerCase().replace(/\b(casting|cd|office|inc|llc|ltd|and|&|csa)\b/g, '').replace(/[^a-z0-9]+/g, '');
  const uniq = a => a.filter((x, i) => x && a.findIndex(y => String(y).toLowerCase() === String(x).toLowerCase()) === i);
  const day = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const safeUrl = u => /^https?:\/\//i.test(u || '') && !/zoom\.|meet\.google|teams\.|ecocast|docs\.google|drive\.google|dropbox|calendly/i.test(u) ? u : '';
  R.GROUPS = [['worked_with', 'Worked with'], ['warm', 'Warm: they\'ve had me in'], ['seen_you', 'Has seen me: tapes, or a class, not in the room yet'], ['rep_only', 'Through you only']];
  R.RHYTHMS = [['change', 'When something changes'], ['week', 'Every week'], ['2weeks', 'Every 2 weeks'], ['month', 'Every month']];
  const DAYS = { week: 7, '2weeks': 14, month: 30 };

  /* src: {name, page, offices:[{name, gate, reads, inroom, callbacks, booked, last:{title,role}, people:[], why}],
           credits:[{title, net, director, role}], people:[{name, role, sessions}], rightFor:[], wantMore:[], wantSeen:[],
           spotted:{fits:[{id, project, network, role, casting:[], url, mine:[]}], fresh:[{name, projects:[]}]}} */
  R.build = function (src) {
    src = src || {};
    const offices = (src.offices || []).filter(o => o && clean(o.name) && o.gate !== 'do_not_contact');
    const groups = R.GROUPS.map(([g, label]) => ({ gate: g, label, offices: offices.filter(o => o.gate === g) })).filter(x => x.offices.length);
    const cold = offices.filter(o => o.gate === 'cold' && o.reads);
    const nets = {}; (src.credits || []).forEach(c => { const n = clean(c.net); if (!n || /^independent$/i.test(n)) return; (nets[n.toLowerCase()] = nets[n.toLowerCase()] || { name: n, titles: [] }).titles.push(clean(c.title)); });
    const people = [];
    (src.credits || []).forEach(c => { const d = clean(c.director); if (d) people.push({ name: d, how: 'directed me in ' + clean(c.title) }); });
    (src.people || []).filter(p => p && /^(casting|director|producer)$/.test(p.role || '')).forEach(p => people.push({ name: clean(p.name), how: (p.role === 'casting' ? 'casting' : p.role) + ', seen me work' + (p.sessions > 1 ? ' (' + p.sessions + ' sessions)' : '') }));
    const seenPeople = new Set(); const ppl = people.filter(p => { const k = p.name.toLowerCase(); if (!p.name || seenPeople.has(k)) return false; seenPeople.add(k); return true; });
    const want = offices.filter(o => o.gate === 'want');
    const sp = src.spotted || {}, wantKeys = new Set(want.map(o => key(o.name)));
    const fresh = (sp.fresh || []).filter(o => !wantKeys.has(key(o.name)));
    return {
      name: clean(src.name), page: safeUrl(src.page), at: src.at || Date.now(),
      groups, coldCount: cold.length,
      networks: Object.values(nets).map(n => ({ name: n.name, titles: uniq(n.titles) })).sort((a, b) => b.titles.length - a.titles.length || a.name.localeCompare(b.name)),
      people: ppl,
      want: want.map(o => ({ name: clean(o.name), why: clean(o.why) })),
      fresh: fresh.map(o => ({ name: clean(o.name), projects: uniq((o.projects || []).map(clean)) })),
      rightFor: uniq((src.rightFor || []).map(clean)), wantMore: uniq((src.wantMore || []).map(clean)), wantSeen: uniq((src.wantSeen || []).map(clean)),
      typed: src.typed !== false,
      fits: (sp.fits || []).map(f => ({ id: f.id, project: clean(f.project) || '(no title)', network: clean(f.network), role: clean(f.role), casting: (f.casting || []).map(clean).filter(Boolean), url: safeUrl(f.url), mine: uniq((f.mine || []).map(clean)) })),
      offices
    };
  };

  /* what you last sent, small: per office the counts and the group; the lists; the casting ids */
  R.snapshot = function (m) {
    const o = {}; (m.offices || []).forEach(x => { o[key(x.name)] = { n: clean(x.name), g: x.gate, r: x.reads || 0, i: x.inroom || 0, c: x.callbacks || 0, b: x.booked || 0 }; });
    return { at: m.at, offices: o, want: m.want.map(w => w.name), rightFor: m.rightFor, wantMore: m.wantMore, wantSeen: m.wantSeen, fits: m.fits.map(f => f.id || f.project), nets: m.networks.map(n => n.name) };
  };
  const GW = { worked_with: 'Worked with', warm: 'Warm', seen_you: 'Has seen me', want: 'Want to reach', rep_only: 'Through you only', cold: 'Cold' };
  /* only what changed since the snapshot, in plain lines */
  R.changes = function (prev, m) {
    if (!prev) return { first: true, lines: [], count: 0 };
    const L = [], now = R.snapshot(m), po = prev.offices || {};
    const newReads = []; let nr = 0;
    Object.keys(now.offices).forEach(k => { const a = po[k], b = now.offices[k]; const dr = b.r - (a ? a.r : 0); if (dr > 0) { nr += dr; newReads.push(b.n + (dr > 1 ? ' (' + dr + ')' : '')); } });
    if (nr) L.push(pl(nr, 'new read') + ': ' + newReads.join(', ') + '.');
    Object.keys(now.offices).forEach(k => { const a = po[k], b = now.offices[k]; if (!a) return;
      if (b.c > a.c) L.push('Callback: ' + b.n + '.'); if (b.b > a.b) L.push('Booked: ' + b.n + '.');
      if (a.g !== b.g && b.g !== 'cold' && b.g !== 'want') L.push(b.n + ': now ' + (GW[b.g] || b.g) + (a.g ? ' (was ' + (GW[a.g] || a.g) + ')' : '') + '.'); });
    const add = (label, a, b) => { const s = new Set((a || []).map(x => String(x).toLowerCase())); const n = (b || []).filter(x => !s.has(String(x).toLowerCase())); if (n.length) L.push(label + n.join(', ') + '.'); };
    add('On my radar now: ', prev.want, now.want);
    add('New credit with: ', prev.nets, now.nets);
    add('I want more of: ', prev.wantMore, now.wantMore);
    add('Also right for: ', prev.rightFor, now.rightFor);
    add('Want to be seen for: ', prev.wantSeen, now.wantSeen);
    const pf = new Set((prev.fits || []).map(String)), nf = m.fits.filter(f => !pf.has(String(f.id || f.project)));
    if (nf.length) L.push(pl(nf.length, 'project') + ' casting' + (m.typed ? ' that fit' + (nf.length === 1 ? 's' : '') + ' me' : ' now') + ': ' + nf.map(f => f.project).join(', ') + '.');
    return { first: false, since: prev.at, lines: L, count: L.length };
  };
  /* is it time? you pick the rhythm; "when something changes" is due when there's something new */
  R.due = function (last, rhythm, changes, now) {
    now = now || Date.now();
    if (!last) return { due: true, why: 'Your reps haven\'t had this yet.' };
    const days = Math.floor((now - last) / 86400000), n = changes ? changes.count : 0;
    if (rhythm === 'change' || !DAYS[rhythm]) return { due: n > 0, days, why: n ? pl(n, 'thing') + ' new since ' + day(last) + '.' : 'Nothing new since ' + day(last) + '.' };
    const left = DAYS[rhythm] - days;
    return { due: left <= 0, days, why: left <= 0 ? 'It\'s been ' + pl(days, 'day') + '.' + (n ? ' ' + pl(n, 'thing') + ' new.' : ' Nothing new, so the note can be short.') : 'Next one in ' + pl(left, 'day') + '.' + (n ? ' ' + pl(n, 'thing') + ' new so far.' : '') };
  };

  const offLine = o => { const b = []; if (o.reads) b.push(o.inroom ? o.inroom + ' in the room, ' + pl(o.reads, 'read') + ' in all' : pl(o.reads, 'read')); if (o.callbacks) b.push(pl(o.callbacks, 'callback')); if (o.booked) b.push(o.booked + ' booked');
    if (!b.length && o.gate === 'seen_you') b.push('seen me work in a class or workshop');
    return o.name + (b.length ? ': ' + b.join(', ') : '') + (o.last && o.last.title ? '. Last: ' + [o.last.title, o.last.role].filter(Boolean).join(' / ') : '') + ((o.people || []).length ? '. ' + o.people.slice(0, 3).join(', ') : '') + (o.why ? '. Why: ' + o.why : '') + '.'; };
  /* the sheet as plain text, for an email body or a paste */
  R.text = function (m, ch) {
    const L = ['FOR MY REPS' + (m.name ? ' · ' + m.name : ''), day(m.at), ''];
    if (ch && !ch.first) { L.push('WHAT\'S NEW SINCE ' + day(ch.since).toUpperCase()); if (ch.lines.length) ch.lines.forEach(x => L.push('- ' + x)); else L.push('- Nothing new. Still here, still taping.'); L.push(''); }
    if (m.page) L.push('MY WORK', m.page, '');
    if (m.groups.length || m.coldCount) { L.push('WHERE I STAND'); m.groups.forEach(gp => { L.push(gp.label + ' (' + gp.offices.length + ')'); gp.offices.forEach(o => L.push('- ' + offLine(o))); }); if (m.coldCount) L.push('Plus ' + pl(m.coldCount, 'office') + ' I\'ve taped for once or twice.'); L.push(''); }
    if (m.networks.length) { L.push('NETWORKS I\'VE WORKED FOR'); m.networks.forEach(n => L.push('- ' + n.name + ': ' + n.titles.join(', '))); L.push(''); }
    if (m.people.length) { L.push('PEOPLE I\'VE WORKED WITH'); m.people.forEach(p => L.push('- ' + p.name + ', ' + p.how)); L.push(''); }
    if (m.want.length || m.fresh.length) { L.push('ON MY RADAR'); m.want.forEach(w => L.push('- ' + w.name + (w.why ? ': ' + w.why : ''))); m.fresh.forEach(o => L.push('- ' + o.name + ': casting ' + o.projects.join(', ') + '. Never had me in.')); L.push(''); }
    if (m.rightFor.length) L.push('WHAT I\'M RIGHT FOR', m.rightFor.join(', '), '');
    if (m.wantMore.length || m.wantSeen.length) { L.push('WHAT I WANT MORE OF'); if (m.wantMore.length) L.push(m.wantMore.join(', ')); if (m.wantSeen.length) L.push('Roles I want to be seen for: ' + m.wantSeen.join(', ')); L.push(''); }
    if (m.fits.length) { L.push(m.typed ? 'CASTING NOW THAT FITS ME' : 'CASTING NOW'); m.fits.forEach(f => { L.push('- ' + f.project + (f.network ? ' (' + f.network + ')' : '') + (f.casting.length ? '. ' + f.casting.join(' & ') + ' casting' : '') + (f.role ? '. Role: ' + f.role : '') + (f.mine.length ? '. My words: ' + f.mine.join(', ') : '') + '.'); if (f.url) L.push('  ' + f.url); }); L.push(''); }
    L.push(m.name || '');
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  /* the email: short when there's news, the whole sheet underneath (or attached) */
  R.email = function (m, ch) {
    const subj = 'For my reps' + (m.name ? ': ' + m.name : '') + ', ' + day(m.at);
    const top = ch && !ch.first && ch.lines.length ? ['What\'s new since ' + day(ch.since) + ':'].concat(ch.lines.map(x => '- ' + x)) : ch && !ch.first ? ['Nothing new since ' + day(ch.since) + '. The sheet is current.'] : ['Here\'s where I stand, all in one place. I\'ll only send what\'s changed from here on.'];
    return { subject: subj, short: top.join('\n') + (m.page ? '\n\nMy work: ' + m.page : '') + '\n\n' + (m.name || ''), full: top.join('\n') + '\n\n' + R.text(m, null) };
  };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* the sheet as a page to attach or open: plain, printable, no scripts */
  R.html = function (m, ch) {
    const sec = (t, body) => body ? '<section><h2>' + esc(t) + '</h2>' + body + '</section>' : '';
    const ul = a => a.length ? '<ul>' + a.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '';
    const news = ch && !ch.first ? sec('What\'s new since ' + day(ch.since), ch.lines.length ? ul(ch.lines.map(esc)) : '<p>Nothing new. Still here, still taping.</p>') : '';
    const stand = m.groups.map(gp => '<h3>' + esc(gp.label) + ' <i>' + gp.offices.length + '</i></h3>' + ul(gp.offices.map(o => esc(offLine(o))))).join('') + (m.coldCount ? '<p class="dim">Plus ' + esc(pl(m.coldCount, 'office')) + ' I\'ve taped for once or twice.</p>' : '');
    const radar = ul(m.want.map(w => '<b>' + esc(w.name) + '</b>' + (w.why ? ': ' + esc(w.why) : '')).concat(m.fresh.map(o => '<b>' + esc(o.name) + '</b>: casting ' + esc(o.projects.join(', ')) + '. Never had me in.')));
    const fits = ul(m.fits.map(f => '<b>' + esc(f.project) + '</b>' + (f.network ? ' (' + esc(f.network) + ')' : '') + (f.casting.length ? '. ' + esc(f.casting.join(' & ')) + ' casting' : '') + (f.role ? '. Role: ' + esc(f.role) : '') + (f.mine.length ? '. <span class="dim">My words: ' + esc(f.mine.join(', ')) + '</span>' : '') + (f.url ? ' <a href="' + esc(f.url) + '">link</a>' : '')));
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>For my reps' + (m.name ? ' · ' + esc(m.name) : '') + '</title>'
      + '<style>body{margin:0;background:#F2F0EA;color:#16161A;font:16px/1.55 Georgia,"Times New Roman",serif}main{max-width:820px;margin:0 auto;padding:34px 24px 60px;background:#F2F0EA}h1{font:800 clamp(28px,6vw,44px)/1 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;letter-spacing:-.03em;margin:0 0 6px;text-transform:uppercase}'
      + '.k{font:600 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.2em;text-transform:uppercase;color:#6E6A63}section{border-top:1px solid #D8D4CA;padding:18px 0}h2{font:600 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.2em;text-transform:uppercase;margin:0 0 10px;color:#16161A}'
      + 'h3{font:600 14px -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:12px 0 4px}h3 i{font-style:normal;color:#D2694E}ul{margin:0;padding-left:20px}li{margin:3px 0}.dim{color:#6E6A63}a{color:#1F3D63}.news{background:#fff;border-left:3px solid #D2694E;padding:14px 18px;margin:18px 0}'
      + '@media print{body,main{background:#fff}}</style></head><body><main><p class="k">For my reps</p><h1>' + esc(m.name || '') + '</h1><p class="k">' + esc(day(m.at)) + '</p>'
      + (news ? '<div class="news">' + news.replace(/^<section>|<\/section>$/g, '') + '</div>' : '')
      + sec('My work', m.page ? '<p><a href="' + esc(m.page) + '">' + esc(m.page.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></p>' : '')
      + sec('Where I stand', stand)
      + sec('Networks I\'ve worked for', ul(m.networks.map(n => '<b>' + esc(n.name) + '</b>: ' + esc(n.titles.join(', ')))))
      + sec('People I\'ve worked with', ul(m.people.map(p => '<b>' + esc(p.name) + '</b>, ' + esc(p.how))))
      + sec('On my radar', radar)
      + sec('What I\'m right for', m.rightFor.length ? '<p>' + esc(m.rightFor.join(', ')) + '</p>' : '')
      + sec('What I want more of', (m.wantMore.length ? '<p>' + esc(m.wantMore.join(', ')) + '</p>' : '') + (m.wantSeen.length ? '<p class="dim">Roles I want to be seen for: ' + esc(m.wantSeen.join(', ')) + '</p>' : ''))
      + sec(m.typed ? 'Casting now that fits me' : 'Casting now', fits)
      + '</main></body></html>';
  };
  g.RepSheet = R;
  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
