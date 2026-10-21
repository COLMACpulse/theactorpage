/* THEACTORPAGE CONTACTS: the who. One list of the people in your work: casting, your reps, directors, producers,
   coaches, the actors you work with. The ones you add, plus the ones the other tools already know:
     NOTES    the people in your sessions (who gave you a note, who ran the class)
     HUB      the casting offices on your auditions, with your counts
     SPOTTED  casting on the projects you spotted, and the reps you send things to
   A person the tools know shows up here on their own; tap KEEP to add a phone, an email, a note of your own.
   REPS: your agent and manager, and the reps you're looking at if you're looking. Each one you're looking at has a
   step (researching, submitted, meeting, signed, passed), how they take submissions, and when to follow up.
   Rules: your words, nothing scored. Other people's details stay on this device and never go on a sheet you send.
   localStorage theactorpage_contacts_v1. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const C = {}, KEY = 'theactorpage_contacts_v1';
  C.KEY = KEY;
  C.ROLES = [['casting', 'Casting'], ['agent', 'Agent'], ['manager', 'Manager'], ['director', 'Director'], ['producer', 'Producer'], ['coach', 'Coach'], ['actor', 'Actor'], ['crew', 'Crew'], ['other', 'Other']];
  C.REPKINDS = [['theatrical', 'Theatrical'], ['commercial', 'Commercial'], ['voice', 'Voice over'], ['print', 'Print'], ['youth', 'Youth'], ['other', 'Other']];
  C.STEPS = [['researching', 'Researching'], ['submitted', 'Submitted'], ['meeting', 'Meeting'], ['signed', 'Signed'], ['passed', 'Passed']];
  C.HOW = [['referral', 'By referral'], ['email', 'Email'], ['online', 'Online form'], ['mail', 'By mail'], ['closed', 'Not taking submissions'], ['unknown', 'Not sure yet']];
  const now = () => Date.now(), uid = () => 'c' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  /* the same person however it's written: "Dana Pell", "dana pell", "Dana Pell Casting" */
  C.key = x => String(x || '').toLowerCase().replace(/\b(casting|cd|csa|office|inc|llc|ltd|and|&)\b/g, '').replace(/[^a-z0-9]+/g, '');
  const LS = () => { try { return g.localStorage; } catch (e) { return null; } };
  function read() { try { const d = JSON.parse((LS() && LS().getItem(KEY)) || 'null'); if (d && Array.isArray(d.people)) return d; } catch (e) { } return { people: [] }; }
  function write(d) { try { LS().setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  C.mine = () => read().people.slice();
  C.get = id => read().people.find(p => p.id === id) || null;
  C.find = name => { const k = C.key(name); return k ? read().people.find(p => C.key(p.name) === k) || null : null; };
  C.add = function (p) {
    const d = read(), name = clean(p && p.name); if (!name) return null;
    const had = d.people.find(x => C.key(x.name) === C.key(name)); if (had) { const q = Object.assign({}, p); delete q.name; return C.set(had.id, q); }
    const it = Object.assign({ id: uid(), name, role: 'other', company: '', email: '', phone: '', city: '', site: '', note: '', dnc: false, rep: null, added: now(), updated: now() }, p, { name });
    d.people.push(it); write(d); return it;
  };
  C.set = function (id, patch) {
    const d = read(), p = d.people.find(x => x.id === id); if (!p) return null;
    Object.keys(patch || {}).forEach(k => { if (k !== 'id') p[k] = typeof patch[k] === 'string' ? clean(patch[k]) : patch[k]; });
    p.updated = now(); write(d); return p;
  };
  C.remove = function (id) { const d = read(); d.people = d.people.filter(p => p.id !== id); write(d); };
  /* REPS: one you're looking at, or your own (signed) */
  C.setRep = function (id, patch) {
    const p = C.get(id); if (!p) return null;
    const r = Object.assign({ kind: 'theatrical', step: 'researching', how: 'unknown', next: '', log: [] }, p.rep || {}, patch || {});
    if (patch && patch.step && (!p.rep || p.rep.step !== patch.step)) r.log = (r.log || []).concat([{ at: now(), step: patch.step }]);
    return C.set(id, { rep: r });
  };
  C.isRep = p => !!p && (p.role === 'agent' || p.role === 'manager');
  C.myReps = () => read().people.filter(p => C.isRep(p) && p.rep && p.rep.step === 'signed');
  C.looking = () => read().people.filter(p => C.isRep(p) && !(p.rep && p.rep.step === 'signed'));
  /* follow-ups due: on or before the day */
  C.due = function (day) { day = day || new Date().toISOString().slice(0, 10); return read().people.filter(p => p.rep && p.rep.next && p.rep.next <= day && p.rep.step !== 'signed' && p.rep.step !== 'passed'); };

  /* WHO THE TOOLS KNOW. src: {notes:[{name, role, sessions, notes}], projects:[...Hub auditions], spotted:{items, me}}
     -> [{key, name, role, company, from:[plain words]}] */
  C.gather = function (src) {
    src = src || {}; const by = {};
    const put = (name, role, company, line) => {
      name = clean(name); const k = C.key(name); if (!k || /^(me|myself|self|i)$/i.test(name)) return;
      const x = by[k] || (by[k] = { key: k, name, role: '', company: '', from: [] });
      if (role && !x.role) x.role = role; if (company && !x.company) x.company = company;
      if (line && x.from.indexOf(line) < 0) x.from.push(line);
    };
    (src.notes || []).forEach(p => put(p.name, p.role === 'casting' ? 'casting' : (p.role || ''), '',
      'Notes: ' + (p.sessions || 0) + ' session' + (p.sessions === 1 ? '' : 's') + (p.notes ? ', ' + p.notes + ' note' + (p.notes === 1 ? '' : 's') : '')));
    const off = {};
    (src.projects || []).forEach(p => { const o = clean(p.casting_office || p.office || p.casting_director || p.casting || ''); if (!o) return; const k = C.key(o); (off[k] = off[k] || { name: o, n: 0, last: '' }).n++; const t = clean(p.project || p.title); if (t) off[k].last = t; });
    Object.keys(off).forEach(k => { const o = off[k]; put(o.name, 'casting', o.name, 'Hub: ' + o.n + ' audition' + (o.n === 1 ? '' : 's') + (o.last ? ', last ' + o.last : '')); });
    const sp = src.spotted || {};
    (sp.items || []).forEach(it => { const c = it && it.card; if (!c) return; (c.casting || []).forEach(n => put(n, 'casting', n, 'Spotted: casting ' + (clean(c.project) || 'a project'))); });
    ((sp.me && sp.me.reps) || []).forEach(r => put(r.name, 'agent', '', 'Spotted: one of your reps'));
    return Object.keys(by).map(k => by[k]);
  };
  /* everyone: the ones you keep, with what the tools know about them; and the ones only the tools know */
  C.everyone = function (src) {
    const kept = read().people, known = C.gather(src), out = [], used = {};
    /* a person you keep is also their office: "Dana Pell" at "Pell Casting" takes what the Hub knows about Pell Casting */
    const of = p => known.filter(x => x.key === C.key(p.name) || (p.company && x.key === C.key(p.company)));
    kept.forEach(p => { const kn = of(p); kn.forEach(x => { used[x.key] = 1; }); const f = [].concat.apply([], kn.map(x => x.from));
      out.push({ kept: true, p, name: p.name, role: p.role || (kn[0] && kn[0].role) || 'other', company: p.company || (kn[0] && kn[0].company) || '', from: f.filter((x, i) => f.indexOf(x) === i) }); });
    known.forEach(x => { if (!used[x.key]) out.push({ kept: false, p: null, name: x.name, role: x.role || 'other', company: x.company, from: x.from }); });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  };
  C.roleName = r => (C.ROLES.find(x => x[0] === r) || ['', 'Other'])[1];
  C.stepName = s => (C.STEPS.find(x => x[0] === s) || ['', 'Researching'])[1];
  C.howName = s => (C.HOW.find(x => x[0] === s) || ['', 'Not sure yet'])[1];
  C.kindName = s => (C.REPKINDS.find(x => x[0] === s) || ['', 'Other'])[1];
  /* names for a picker (Notes, Spotted): kept first, then known */
  C.names = src => C.everyone(src).map(x => x.name);
  /* find: name, company, role, city, note, where the tools know them from */
  C.match = (x, q) => { const t = [x.name, x.company, C.roleName(x.role), x.p && x.p.city, x.p && x.p.note, (x.from || []).join(' ')].join(' ').toLowerCase(); return String(q || '').toLowerCase().split(/\s+/).filter(Boolean).every(w => t.indexOf(w) >= 0); };
  /* the other tools, for the page: Notes and Spotted from storage, the Hub's auditions from its database */
  C.sources = async function () {
    const s = { notes: [], projects: [], spotted: {} };
    try { if (g.Notes) s.notes = g.Notes.people().map(p => ({ name: p.name, role: p.role, sessions: p.sessions || (p.sids ? p.sids.length : 0), notes: p.notes || p.count || 0 })); } catch (e) { }
    try { s.spotted = JSON.parse(LS().getItem('theactorpage_spotted_v1') || '{}') || {}; } catch (e) { }
    try { if (g.Offices) { const h = await g.Offices.load(); if (h) s.projects = h.projects || []; } } catch (e) { }
    return s;
  };
  g.Contacts = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
