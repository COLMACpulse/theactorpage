/* THEACTORPAGE YOUR AGENDA (home): what's coming up, on a timeline, and what's active, from every tool. Nothing to fill in: it reads what
   the tools already know.
     tapes due (requests on home and in the Hub), follow-ups (CONTACTS, rep search), footage that's out or a
     follow-up due (FOOTAGE), press (PRESS: news coming up, people not reached yet, no reply in a week),
     your reps sheet when its rhythm says so (the Hub), a tape for a show on your wall in PICTURE IT, a plug for something airing this week.
   And your goal, if you set one, in your words, with its date.
   Each line links to the tool it came from. No counts of how you're doing, no streaks, no score.
   Week.list(src, day) is pure, for the tests. */
(function (g) {
  'use strict';
  const W = {};
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const diff = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
  /* "today", "tomorrow", "Friday", "Nov 14" */
  W.when = function (d, day) {
    const n = diff(day, d); if (n < 0) return n === -1 ? 'yesterday' : MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10));
    if (n === 0) return 'today'; if (n === 1) return 'tomorrow';
    if (n < 7) return DAYS[new Date(d + 'T12:00:00').getDay()];
    return MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10)) + (d.slice(0, 4) !== day.slice(0, 4) ? ', ' + d.slice(0, 4) : '');
  };
  /* src: {requests:[{id, title, role, due}], contacts:[{name, rep:{next, step}}], footage:[{id, line}],
           press:[{id, title, date, outlets:[{name, reached, reply}]}], reps:{last, rhythm, have}, goal:{text, by}}
     -> {goal, lines:[{date, line, href, kind}]} */
  W.list = function (src, day) {
    src = src || {}; day = day || iso(new Date());
    const L = [], soon = d => d && diff(day, d) <= 7;
    (src.requests || []).forEach(r => { const d = String(r.due || '').slice(0, 10); if (!d || diff(day, d) < 0 || !soon(d)) return;
      const on = g.Viz && src.wishes && g.Viz.forRequest(r.title, src.wishes);
      L.push({ date: d, kind: 'tape', href: 'actor-os/', line: 'Tape due ' + W.when(d, day) + ': ' + [r.title, r.role].filter(Boolean).join(', ') + '.' + (on ? ' It’s on your wall.' : '') }); });
    /* PICTURE IT: a plug for something airing this week */
    if (g.Viz && src.plugs) g.Viz.airing(day, src.plugs).forEach(p => {
      L.push({ date: p.date, kind: 'plug', href: 'picture/?plug=' + encodeURIComponent(p.id), line: (p.title || 'Your plug') + ' airs ' + (g.Viz.when(p.date, p.time, day) || W.when(p.date, day)) + (p.where ? ' on ' + p.where : '') + '. Your plug is ready when you are.' }); });
    (src.contacts || []).forEach(p => { const d = p.rep && p.rep.next; if (!d || d > day) return;
      L.push({ date: d, kind: 'follow', href: 'contacts/?tab=reps', line: 'Follow up with ' + p.name + (d < day ? ' (it was ' + W.when(d, day) + ')' : '') + '.' }); });
    (src.footage || []).forEach(f => L.push({ date: '', kind: 'footage', href: 'footage/', line: f.line }));
    (src.press || []).forEach(c => {
      const d = c.date, n = d ? diff(day, d) : null;
      if (d && n >= 0 && n <= 21) {
        L.push({ date: d, kind: 'press', href: 'press/?c=' + encodeURIComponent(c.id), line: c.title + ': your news is ' + W.when(d, day) + '.' });
        const not = (c.outlets || []).filter(o => !o.reached).length; if (not) L.push({ date: d, kind: 'press', href: 'press/?c=' + encodeURIComponent(c.id), line: c.title + ': ' + not + ' on your press list not reached yet.' });
      }
      (c.outlets || []).forEach(o => { if (o.reached && (o.reply || 'none') === 'none' && diff(o.reached, day) >= 7) L.push({ date: '', kind: 'press', href: 'press/?c=' + encodeURIComponent(c.id), line: 'No reply from ' + o.name + ' since ' + W.when(o.reached, day) + '. A short follow-up, or let it go.' }); });
    });
    const R = src.reps; if (R && R.have) {
      const per = { week: 7, '2weeks': 14, month: 30 }[R.rhythm];
      if (!R.last) L.push({ date: '', kind: 'reps', href: 'hub/?tab=reps', line: 'Your reps haven’t had a sheet from you yet.' });
      else if (per) { const days = Math.floor((Date.parse(day + 'T12:00:00') - R.last) / 864e5); if (days >= per) L.push({ date: '', kind: 'reps', href: 'hub/?tab=reps', line: 'Your reps sheet: it’s been ' + days + ' days.' }); }
    }
    /* THE PLAN: the steps of plans you put on your agenda, on their days */
    if (g.Plan && src.plans) g.Plan.agenda(src.plans, day).forEach(l => L.push(l));
    /* PICTURE IT: in the room, waiting to hear */
    if (g.Viz && src.wishes) src.wishes.forEach(w => { const at = g.Viz.at(w); if (at.step === 'room' && at.date) L.push({ date: '', kind: 'viz', href: 'picture/?w=' + encodeURIComponent(w.id), line: w.title + ': in the room ' + W.when(at.date, day) + '. On your wall, waiting to hear.' }); });
    L.sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date).localeCompare(String(b.date)));
    const goal = src.goal && String(src.goal.text || '').trim() ? { text: String(src.goal.text).trim(), by: src.goal.by || '', left: src.goal.by ? diff(day, src.goal.by) : null } : null;
    return { goal, lines: L };
  };
  /* the agenda: dated lines on a timeline, a group per day (anything from before today first); the rest is active */
  W.agenda = function (w, day) {
    day = day || iso(new Date()); const groups = [], at = {};
    (w.lines || []).filter(l => l.date).forEach(l => { const n = diff(day, l.date), label = n < 0 ? 'STILL OPEN' : W.when(l.date, day).toUpperCase(), k = n < 0 ? '0' : l.date;
      if (!at[k]) { at[k] = { label, date: n < 0 ? '' : l.date, lines: [] }; groups.push(at[k]); } at[k].lines.push(l); });
    groups.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { coming: groups, active: (w.lines || []).filter(l => !l.date) };
  };
  /* gather it on home, from the tools on this device */
  W.gather = async function () {
    const src = {};
    try { if (g.Inbox) src.requests = g.Inbox.all('request').map(x => ({ id: x.id, title: x.data.title, role: x.data.role, due: x.data.due })); } catch (e) { }
    try { if (g.Contacts) src.contacts = g.Contacts.mine().filter(p => p.rep && p.rep.next && p.rep.step !== 'signed' && p.rep.step !== 'passed' && !p.dnc); } catch (e) { }
    try { if (g.Footage) src.footage = g.Footage.alerts(); } catch (e) { }
    try { if (g.Press && g.Contacts) src.press = g.Press.all().map(c => ({ id: c.id, title: c.title, date: c.date, outlets: c.outlets.map(o => { const p = g.Contacts.get(o.cid); return { name: p ? p.name : 'someone', reached: o.reached, reply: o.reply }; }) })); } catch (e) { }
    try { if (g.Viz) { src.wishes = g.Viz.all(); src.plugs = g.Viz.plugs(); } } catch (e) { }
    try { if (g.Plan) src.plans = g.Plan.all(); } catch (e) { }
    try { const y = g.You && g.You.get(); if (y) src.goal = { text: y.goal || '', by: y.goalBy || '' }; } catch (e) { }
    try {
      const hp = await hubProfile(); const reps = hp && hp.reps;
      let have = false; try { have = (g.Contacts && g.Contacts.myReps().length > 0) || !!((JSON.parse(localStorage.getItem('theactorpage_spotted_v1') || '{}').me || {}).reps || []).some(r => r && r.name); } catch (e) { }
      if (reps || have) src.reps = { last: reps && reps.last ? reps.last.at : null, rhythm: reps ? reps.rhythm : 'change', have };
    } catch (e) { }
    return src;
  };
  function hubProfile() {
    return new Promise(res => {
      if (typeof indexedDB === 'undefined') return res(null);
      let made = false; const r = indexedDB.open('colmac_hub');
      r.onupgradeneeded = e => { made = true; try { e.target.transaction.abort(); } catch (x) { } };
      r.onerror = () => res(null);
      r.onsuccess = e => { const db = e.target.result; if (made || !db.objectStoreNames.contains('meta')) { db.close(); return res(null); }
        const q = db.transaction('meta', 'readonly').objectStore('meta').get('profile'); q.onsuccess = () => { db.close(); res(q.result ? q.result.v : null); }; q.onerror = () => { db.close(); res(null); }; };
    });
  }
  W.iso = iso;
  g.Week = W;
  if (typeof module !== 'undefined') module.exports = W;
})(typeof window !== 'undefined' ? window : globalThis);
