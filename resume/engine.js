/*
  VIRTUAL RESUME v0.3 ENGINE
  Pure functions. No DOM. Browser (window.ResumeEngine) and Node (module.exports).
  You shoot your own work. This turns it into résumé-worthy experience, honestly:
    - a finished, titled, credited, shown piece is a credit
    - a monologue or a self-tape is a clip, not a credit, and goes on your page instead
    - what's one step from counting, and what to make next
    - industry-format résumé (one page, standard sections), plain-text version, page HTML
*/
(function (root) {
  'use strict';

  const TYPES = {
    short: { label: 'Short film', section: 'film' },
    web: { label: 'Web series', section: 'film' },
    music: { label: 'Music video', section: 'film' },
    student: { label: 'Student film', section: 'film' },
    feature: { label: 'Feature', section: 'film' },
    commercial: { label: 'Commercial / spec ad', section: 'film' },
    theatre: { label: 'Theatre / showcase', section: 'theatre' },
    scene: { label: 'Scene (not finished as a film)', section: 'clip' },
    monologue: { label: 'Monologue', section: 'clip' },
    selftape: { label: 'Self-tape', section: 'clip' },
    slate: { label: 'Slate', section: 'clip' }
  };
  /* Who the page is for. Same work, a different page. Mined from SHOWCASE: casting wants
     speed, a rep wants your range, a director wants the character work. Prep notes never go. */
  const AUDIENCES = {
    casting: { label: 'Casting', note: 'Headshot, slate, your 3 best clips for the role, résumé, contact. Short on purpose.' },
    rep: { label: 'Agent or manager', note: 'Your range: clips grouped by the types you tagged, then credits and links.' },
    director: { label: 'Director', note: 'The scene work, best match for the role first, with the character named.' },
    anyone: { label: 'Anyone', note: 'Everything on your page: credits first, then clips.' }
  };
  const STOP = new Set('the and for with that this from have will your they them their about into over under than then when what who whom which while were been being also just very more most some such only into onto upon must should could would role character actor actors age ages range seeking looking type plays play playing scene scenes series film feature lead supporting male female man woman men women person people any all ethnicities ethnicity open'.split(' '));
  const words = t => (String(t || '').toLowerCase().match(/[a-z][a-z'-]{3,}/g) || []).map(w => w.replace(/'s$/, '').replace(/[-']/g, '')).filter(w => w.length >= 4 && !STOP.has(w));
  const r5 = w => w.slice(0, 5);
  /* Which pieces fit a breakdown. Word roots, the same rule ARCHBOOK uses ("authoritative"
     finds "authority"). A piece only matches on what it actually carries: its types,
     title, character and the line about it. An empty field matches nothing. */
  function roleMatch(breakdown, pieces) {
    const want = new Set(words(breakdown).map(r5));
    return (pieces || []).map(p => {
      const own = [].concat(typesOf(p), [p.title, p.character, p.note]).filter(x => clean(x));
      const hits = [];
      own.forEach(x => words(x).forEach(w => { if (want.has(r5(w)) && !hits.includes(w)) hits.push(w); }));
      return { p, score: hits.length, hits };
    });
  }
  function typesOf(p) { return (Array.isArray(p.types) ? p.types : String(p.types || '').split(',')).map(clean).filter(Boolean); }
  const ROLES = ['Lead', 'Supporting', 'Featured', 'Ensemble'];
  const clean = v => String(v == null ? '' : v).trim();

  // what it takes for a piece to stand as a credit
  function countsCheck(p) {
    const t = TYPES[p.type] || TYPES.scene;
    if (t.section === 'clip') return { section: 'clip', counts: false, steps: [], note: TYPES[p.type] ? `A ${t.label.toLowerCase()} shows your work but isn't a credit. It goes on your page.` : 'Pick what kind of piece this is.' };
    const steps = t.section === 'theatre' ? [
      ['title', 'Has a title', !!clean(p.title)],
      ['role', 'Your role is named', !!clean(p.character) || !!clean(p.roleType)],
      ['venue', 'Venue or company named', !!clean(p.company)],
      ['shown', 'It was performed for an audience', !!p.finished]
    ] : [
      ['title', 'Has a title', !!clean(p.title)],
      ['finished', 'Finished: edited, beginning to end', !!p.finished],
      ['credits', 'Director or production named', !!clean(p.company) || !!(p.did && p.did.length)],
      ['shown', 'Shown somewhere: a public link, festival or screening', !!clean(p.link) || !!clean(p.shownAt)]
    ];
    const done = steps.filter(s => s[2]).length;
    return { section: t.section, counts: done === steps.length, steps: steps.map(([k, l, ok]) => ({ key: k, label: l, ok })), done, of: steps.length };
  }

  // column 3 of a credit line: the production / director, honestly labelled
  function creditCompany(p) {
    const did = (p.did || []).filter(Boolean);
    const company = clean(p.company);
    if (company) return company;
    if (did.includes('Directed')) return 'Self-produced, dir. by actor';
    if (did.length) return 'Self-produced';
    return '';
  }
  function creditLine(p) {
    const role = clean(p.roleType) || 'Lead';
    const char = clean(p.character);
    return { title: clean(p.title), role: char ? `${role} (${char})` : role, company: creditCompany(p), year: clean(p.year), also: (p.did || []).filter(d => d !== 'Acted') };
  }

  // the résumé model: only what counts, unless you choose to include it (then it's marked)
  function resumeModel(me, pieces, training, skills) {
    const film = [], theatre = [], held = [];
    (pieces || []).forEach(p => {
      const c = countsCheck(p);
      if (c.section === 'clip') return;
      const include = p.include === undefined ? c.counts : !!p.include;
      if (!include) { held.push({ id: p.id, title: p.title, missing: c.steps.filter(s => !s.ok).map(s => s.label) }); return; }
      const line = creditLine(p); line.unfinished = !c.counts; line.id = p.id;
      (c.section === 'theatre' ? theatre : film).push(line);
    });
    const byOrder = (a, b) => 0;
    return {
      name: clean(me.name), union: clean(me.union), contact: [clean(me.email), clean(me.phone)].filter(Boolean),
      rep: clean(me.rep), stats: [me.height && 'Height: ' + clean(me.height), me.hair && 'Hair: ' + clean(me.hair), me.eyes && 'Eyes: ' + clean(me.eyes)].filter(Boolean),
      location: clean(me.location),
      links: String(me.links || '').split(/[\s,]+/).map(clean).filter(Boolean),
      film, theatre, held,
      training: (training || []).filter(t => clean(t.course)).map(t => ({ course: clean(t.course), teacher: clean(t.teacher), school: clean(t.school) })),
      skills: (skills || []).map(clean).filter(Boolean)
    };
  }

  // plain text, for casting-site forms and emails
  function resumeText(m) {
    const L = [];
    L.push(m.name.toUpperCase());
    if (m.union) L.push(m.union);
    const top = [m.contact.join(' · '), m.rep && 'Rep: ' + m.rep].filter(Boolean).join(' · ');
    if (top) L.push(top);
    if (m.stats.length) L.push(m.stats.join(' · '));
    const table = (head, rows) => { if (!rows.length) return; L.push('', head); rows.forEach(r => L.push([r.title + (r.unfinished ? ' (in progress)' : ''), r.role, r.company].filter(Boolean).join(' | '))); };
    table('FILM & NEW MEDIA', m.film);
    table('THEATRE', m.theatre);
    if (m.training.length) { L.push('', 'TRAINING'); m.training.forEach(t => L.push([t.course, t.teacher, t.school].filter(Boolean).join(' | '))); }
    if (m.skills.length) { L.push('', 'SPECIAL SKILLS'); L.push(m.skills.join(', ')); }
    return L.join('\n') + '\n';
  }

  // what to make next: plain suggestions, nearest win first
  function nextToMake(pieces, training, skills, shootList) {
    const out = [];
    (pieces || []).forEach(p => {
      const c = countsCheck(p);
      if (c.section !== 'clip' && !c.counts && c.of - c.done === 1) {
        const m = c.steps.find(s => !s.ok);
        out.push({ kind: 'onestep', id: p.id, text: `One step from a credit: ${m.label.toLowerCase()} for "${clean(p.title) || 'untitled'}".` });
      }
    });
    const credits = (pieces || []).filter(p => countsCheck(p).counts).length;
    const clips = (pieces || []).filter(p => countsCheck(p).section === 'clip').length;
    if (!credits) out.push({ kind: 'finish', text: clips ? 'Turn your best scene into a short: give it a title, finish the edit, credit who helped, put it online.' : 'Shoot a scene with a friend, finish it as a short, and put it online. That is your first credit.' });
    (shootList || []).forEach(w => out.push({ kind: 'shoot', text: `Shoot: ${clean(w.text)} (from your ARCHBOOK shoot list).` }));
    if (!(training || []).length) out.push({ kind: 'training', text: 'Add a class or coach. Even one line belongs on the résumé.' });
    if (!(skills || []).length) out.push({ kind: 'skills', text: 'List special skills: accents, languages, sports, instruments, stage combat, licences.' });
    return out;
  }

  // ---------------------------------------------------------------- page (single HTML, media alongside)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function pageHTML(m, pieces, opts) {
    opts = opts || {};
    const aud = AUDIENCES[opts.audience] ? opts.audience : 'anyone';
    const head = opts.headshot ? `<img class="hs" src="${esc(opts.headshot)}" alt="${esc(m.name)} headshot">` : '';
    const rows = rs => rs.map(r => `<tr><td>${esc(r.title)}${r.unfinished ? ' <small>(in progress)</small>' : ''}</td><td>${esc(r.role)}</td><td>${esc(r.company)}</td></tr>`).join('');
    const ordered = orderFor(aud, pieces, opts);
    const card = p => {
      const t = TYPES[p.type] || TYPES.scene;
      const media = p.media ? `<video controls playsinline preload="metadata" ${p.poster ? `poster="${esc(p.poster)}"` : ''} src="${esc(p.media)}"></video>` : '';
      return `<article>${media}<h3>${esc(p.title || 'Untitled')}</h3><p class="meta">${esc(t.label)}${p.character ? ' · as ' + esc(p.character) : ''}${p.year ? ' · ' + esc(p.year) : ''}</p>${p.link ? `<p><a href="${esc(p.link)}" rel="noopener">Watch</a></p>` : ''}${p.note ? `<p>${esc(p.note)}</p>` : ''}</article>`;
    };
    let work = '';
    if (aud === 'rep') {
      work = groupByType(ordered).map(g => `<h2>${esc(g.label)}</h2><div class="work">${g.items.map(card).join('')}</div>`).join('');
    } else if (ordered.length) work = `<h2>${aud === 'casting' ? 'Slate and clips' : aud === 'director' ? 'The work' : 'Work'}</h2><div class="work">${ordered.map(card).join('')}</div>`;
    const forRole = clean(opts.role) && aud !== 'rep' && aud !== 'anyone' ? `<div class="sub for">For ${esc(opts.role)}</div>` : '';
    const shoot = aud === 'rep' && opts.shootNext && opts.shootNext.length ? `<h2>Shooting next</h2><ul>${opts.shootNext.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
    const showStats = aud !== 'director';
    const showTraining = aud !== 'director';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.name)}${forRole ? ' · ' + esc(opts.role) : ''}</title>
<style>:root{--bg:#121110;--ink:#ece7dc;--dim:#a39c8e;--t:#e0a23c}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}main{max-width:900px;margin:0 auto;padding:24px 16px 48px}
header{display:flex;gap:20px;align-items:flex-end;flex-wrap:wrap;margin-bottom:24px}.hs{width:180px;aspect-ratio:4/5;object-fit:cover;border-radius:10px}h1{margin:0;font-size:34px;letter-spacing:.06em}.sub{color:var(--dim)}.for{color:var(--t);margin-top:4px}
h2{font-size:13px;letter-spacing:.16em;color:var(--t);margin:28px 0 8px;text-transform:uppercase}table{width:100%;border-collapse:collapse}td{padding:8px 6px;border-bottom:1px solid #2f2b26;vertical-align:top}
.work{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}article video{width:100%;border-radius:8px;background:#000}article h3{margin:8px 0 0;font-size:17px}.meta{color:var(--dim);margin:2px 0;font-size:14px}a{color:var(--t)}small{color:var(--dim)}</style></head>
<body><main><header>${head}<div><h1>${esc(m.name)}</h1>${forRole}<div class="sub">${esc([m.union, m.location].filter(Boolean).join(' · '))}</div>${showStats ? `<div class="sub">${esc(m.stats.join(' · '))}</div>` : ''}<div class="sub">${esc([m.contact.join(' · '), m.rep && 'Rep: ' + m.rep].filter(Boolean).join(' · '))}</div>${aud === 'rep' && m.links && m.links.length ? `<div class="sub">${m.links.map(l => `<a href="${esc(/^https?:/i.test(l) ? l : 'https://' + l)}" rel="noopener">${esc(l)}</a>`).join(' · ')}</div>` : ''}</div></header>
${work}
${m.film.length ? `<h2>Film &amp; new media</h2><table>${rows(m.film)}</table>` : ''}${m.theatre.length ? `<h2>Theatre</h2><table>${rows(m.theatre)}</table>` : ''}
${showTraining && m.training.length ? `<h2>Training</h2><table>${m.training.map(t => `<tr><td>${esc(t.course)}</td><td>${esc(t.teacher)}</td><td>${esc(t.school)}</td></tr>`).join('')}</table>` : ''}
${showTraining && m.skills.length ? `<h2>Special skills</h2><p>${esc(m.skills.join(', '))}</p>` : ''}
${shoot}
</main></body></html>`;
  }
  /* What goes on the page, in what order, for whom. */
  function orderFor(aud, pieces, opts) {
    opts = opts || {};
    const avail = (pieces || []).filter(p => p.onPage !== false && (p.media || p.link));
    const rank = p => { const c = countsCheck(p); return c.counts ? 0 : c.section === 'clip' ? 2 : 1; };   // credits, then in progress, then clips
    const scored = roleMatch(opts.breakdown, avail);
    const sc = new Map(scored.map(x => [x.p, x.score]));
    const byFit = (a, b) => (sc.get(b) || 0) - (sc.get(a) || 0) || rank(a) - rank(b) || avail.indexOf(a) - avail.indexOf(b);
    if (aud === 'casting') {
      const slate = avail.filter(p => p.type === 'slate').slice(0, 1);
      return slate.concat(avail.filter(p => p.type !== 'slate').sort(byFit).slice(0, 3));
    }
    if (aud === 'director') return avail.filter(p => p.type !== 'slate').sort(byFit);
    const rest = aud === 'rep' ? avail.filter(p => p.type !== 'slate') : avail;   // a rep doesn't need your slate
    return rest.slice().sort((a, b) => rank(a) - rank(b) || avail.indexOf(a) - avail.indexOf(b));
  }
  /* Range for a rep: one group per type, biggest first, untyped work last. */
  function groupByType(list) {
    const groups = {}, order = [];
    list.forEach(p => { const ts = typesOf(p); (ts.length ? ts : ['Other work']).forEach(k => { const key = k.toLowerCase(); if (!groups[key]) { groups[key] = { label: k, items: [] }; order.push(key); } if (!groups[key].items.includes(p)) groups[key].items.push(p); }); });
    order.sort((a, b) => (a === 'other work') - (b === 'other work') || groups[b].items.length - groups[a].items.length);
    return order.map(k => groups[k]);
  }
  /* The note that goes with it, in plain words. */
  function sendNote(m, aud, role, n) {
    const who = clean(m.name) || 'Me';
    if (aud === 'casting') return `Hi,\n\n${who}${clean(role) ? ' for ' + clean(role) : ''}. Slate, ${n} clip${n === 1 ? '' : 's'} and my résumé are on the page.\n\nThank you for the look.\n${who}${m.contact.length ? '\n' + m.contact.join(' · ') : ''}`;
    if (aud === 'rep') return `Hi,\n\nHere is where my work stands: clips grouped by type, credits and links on one page.\n\n${who}${m.contact.length ? '\n' + m.contact.join(' · ') : ''}`;
    if (aud === 'director') return `Hi,\n\n${who}${clean(role) ? ', for ' + clean(role) : ''}. The scene work is on the page, best match first.\n\n${who}${m.contact.length ? '\n' + m.contact.join(' · ') : ''}`;
    return `Hi,\n\nMy page, with my work and résumé.\n\n${who}${m.contact.length ? '\n' + m.contact.join(' · ') : ''}`;
  }

  // ---------------------------------------------------------------- ZIP (store only)
  const CRC = (function () { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ CRC[(c ^ b[i]) & 0xFF]; return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = s => new TextEncoder().encode(s);
  function makeZip(entries) {
    const parts = [], central = []; let off = 0;
    const u16 = n => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xFFFF, true); return b; };
    const u32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; };
    for (const e of entries) {
      const name = enc(e.name), data = e.bytes instanceof Uint8Array ? e.bytes : new Uint8Array(e.bytes), crc = crc32(data);
      [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)].forEach(x => parts.push(x)); parts.push(name, data);
      central.push({ h: [u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)], name });
      off += 30 + name.length + data.length;
    }
    const cs = off; let csz = 0; central.forEach(c => { c.h.forEach(x => parts.push(x)); parts.push(c.name); csz += 46 + c.name.length; });
    [u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(csz), u32(cs), u16(0)].forEach(x => parts.push(x));
    let n = 0; parts.forEach(p => n += p.length); const out = new Uint8Array(n); let q = 0; parts.forEach(c => { out.set(c, q); q += c.length; }); return out;
  }

  const api = { TYPES, ROLES, AUDIENCES, roleMatch, orderFor, groupByType, typesOf, sendNote, countsCheck, creditLine, creditCompany, resumeModel, resumeText, nextToMake, pageHTML, makeZip, crc32, enc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ResumeEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
