/* THEACTORPAGE THE PLAN: say what you know about an audition, in your own words, and it lays out the days to the
   deadline. No AI: it reads your note with plain rules (days and times, "___ casting", the kind of role, where it
   goes, your reader, being out of town) and shows WHAT I HEARD for you to fix before anything is kept. Whatever it
   doesn't recognize stays as your words, in the plan, untouched.
   Plan.hear(text, day, known) -> heard     Plan.build(heard, day) -> {steps:[{date, what, href, kind}], heads:[]}
   localStorage theactorpage_plan_v1; your voice note, if you keep one, in IndexedDB theactorpage_plan / voice.
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const P = {}, KEY = 'theactorpage_plan_v1', DB = 'theactorpage_plan';
  P.KEY = KEY; P.DB = DB;
  const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
  const DAYRE = '(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)';
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const add = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return iso(x); };
  const diff = (a, b) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 864e5);
  const dow = d => new Date(d + 'T12:00:00').getDay();
  const wk = d => Math.floor((Date.parse(d + 'T12:00:00') / 864e5 + 3) / 7); /* weeks run Monday to Sunday */
  P.iso = iso; P.add = add; P.diff = diff;
  const dayIndex = w => DAYS.findIndex(d => d.slice(0, 3) === String(w).toLowerCase().slice(0, 3));
  const title = s => clean(s).replace(/\b([a-z])/g, (m, c) => c.toUpperCase()).replace(/\b(And|Of|The|For|A|An)\b/g, m => m.toLowerCase()).replace(/^./, c => c.toUpperCase());
  P.dayLabel = (d, day) => { const n = diff(day, d); if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n > 1 && n < 7) return DN[dow(d)]; return DN[dow(d)].slice(0, 3) + ', ' + MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10)); };
  P.timeLabel = t => { const m = String(t || '').match(/^(\d{1,2}):(\d\d)/); if (!m) return ''; let h = +m[1]; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + m[2] + ' ' + ap; };
  P.longDate = d => /^\d{4}-\d\d-\d\d/.test(d || '') ? DN[dow(d)] + ', ' + MON[+d.slice(5, 7) - 1] + ' ' + (+d.slice(8, 10)) : '';

  /* ---------- a day in your words -> a date ---------- */
  /* "next Thursday" is Thursday of next week; "this Thursday" this week; "Thursday" the next one coming; "before" keeps it on or before a date */
  P.dayOf = function (words, day, before) {
    const t = String(words || '').toLowerCase();
    if (/\btoday\b|\btonight\b/.test(t)) return day;
    if (/\btomorrow\b/.test(t)) return add(day, 1);
    let m = t.match(new RegExp('\\b(next|this)\\s+' + DAYRE + '\\b'));
    if (m) { const k = dayIndex(m[2]); for (let i = 0; i < 14; i++) { const d = add(day, i); if (dow(d) === k && wk(d) - wk(day) === (m[1] === 'next' ? 1 : 0)) return d; } }
    m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if (m) { let y = m[3] ? +m[3] : +day.slice(0, 4); if (y < 100) y += 2000; const d = iso(new Date(y, +m[1] - 1, +m[2])); return !m[3] && d < day ? iso(new Date(y + 1, +m[1] - 1, +m[2])) : d; }
    m = t.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (m) { const y = +day.slice(0, 4), d = iso(new Date(y, MONTHS[m[1]], +m[2])); return d < day ? iso(new Date(y + 1, MONTHS[m[1]], +m[2])) : d; }
    m = t.match(new RegExp('\\b' + DAYRE + '\\b'));
    if (m) { const k = dayIndex(m[1]);
      if (before) { for (let i = 0; i <= 13; i++) { const d = add(before, -i); if (d < day) break; if (dow(d) === k) return d; } }
      for (let i = 1; i <= 7; i++) { const d = add(day, i); if (dow(d) === k) return d; } }
    return '';
  };
  /* "11:00am", "11am", "by 5", "noon" -> "11:00" */
  P.timeOf = function (words) {
    const t = String(words || '').toLowerCase();
    if (/\bnoon\b/.test(t)) return '12:00'; if (/\bmidnight\b/.test(t)) return '23:59';
    const m = t.match(/\b(\d{1,2})(?::(\d\d))?\s*(a\.?m\.?|p\.?m\.?)/) || t.match(/\b(?:at|by)\s+(\d{1,2})(?::(\d\d))\b/);
    if (!m) return '';
    let h = +m[1]; const mm = m[2] || '00', ap = (m[3] || '').replace(/\./g, '');
    if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0;
    if (!ap && h < 8) h += 12;
    return String(h).padStart(2, '0') + ':' + mm;
  };

  /* ---------- hearing the note ---------- */
  const ROLES = [[/\brecurring\s+(?:guest|quest)\s*star\b/i, 'Recurring guest star'], [/\b(?:guest|quest)\s*star\b/i, 'Guest star'], [/\bco-?\s?star\b/i, 'Co-star'], [/\bseries\s+regular\b/i, 'Series regular'], [/\brecurring\b/i, 'Recurring'],
    [/\bday\s*player\b/i, 'Day player'], [/\bunder[\s-]?5\b|\bu\/5\b/i, 'Under-5'], [/\bsupporting\b/i, 'Supporting'], [/\blead\b/i, 'Lead'], [/\bfeatured\b/i, 'Featured']];
  const VIA = [[/\bactors?\s*access\b|\beco\s*cast\b/i, 'Actors Access'], [/\bcasting\s*networks?\b|\bcasting\s*frontier\b/i, 'Casting Networks'], [/\bbackstage\b/i, 'Backstage'], [/\bwe\s*audition\b/i, 'WeAudition']];
  const NOTCAST = /^(the|a|an|see|for|of|from|by|with|to|and|my|their|its|it's|this|that|notice|any|no|in|on|at|our|your|in-?person|self-?tape)$/i;
  /* known: {titles:[...], offices:[...]} to match against (your requests, your wall, your contacts) */
  P.hear = function (text, day, known) {
    day = day || iso(new Date()); known = known || {};
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    const sents = raw.split(/(?<=[.!?;])\s+|\n+/).map(clean).filter(Boolean);
    const h = { title: '', role: '', character: [], office: '', officeHistory: '', due: '', dueTime: '', tape: [], tapeEarly: false, via: '', direct: false, reader: '', heads: [], notice: false, notes: [], from: {} };
    const used = new Set(), CH = [];
    const take = (i, k) => { used.add(i); h.from[k] = (h.from[k] ? h.from[k] + ' / ' : '') + sents[i]; };
    /* known titles first */
    (known.titles || []).forEach(t => { if (!h.title && t && new RegExp('\\b' + String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(raw)) h.title = t; });
    (known.offices || []).forEach(o => { const base = String(o || '').replace(/\s*casting\s*$/i, '').trim(); if (!h.office && base.length > 2 && new RegExp('\\b' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(raw)) h.office = o; });
    sents.forEach((s, i) => {
      const lo = s.toLowerCase();
      /* the kind of role */
      if (!h.role) { const r = ROLES.find(x => x[0].test(s)); if (r) { h.role = r[1]; take(i, 'role'); } }
      /* casting */
      if (!h.office) { const m = s.match(/((?:[\w'’.-]+\s+){0,4}[\w'’.-]+)\s+casting\b(?!\s+(?:notice|director|call|site|page))/i);
        if (m) { const all = m[1].split(/\s+/); let k = all.length; while (k > 0 && !NOTCAST.test(all[k - 1])) k--; const w = all.slice(k).slice(-3); if (w.length && !/^(self|in|the)$/i.test(w[w.length - 1]) && !/-$/.test(w[w.length - 1])) { h.office = title(w.join(' ')) + ' Casting'; take(i, 'office'); } } }
      if (/\b(?:read|taped|auditioned|been in)\b.*\b(?:for|with)\s+(?:the|this|that|them|her|him)?\s*(?:office|them|her|him)\b|\bcast me\b|\bbooked me\b|\bhired me\b|\bnever (?:read|met|been)\b|\bfirst time\b/i.test(s)) {
        h.officeHistory = /\bcast me\b|\bbooked me\b|\bhired me\b|\bbooked (?:with|through) them\b/i.test(s) ? 'worked_with' : /\bnever\b|\bfirst time\b/i.test(s) ? 'new' : 'warm';
        take(i, 'history'); }
      /* where it goes */
      if (!h.via) { const v = VIA.find(x => x[0].test(s)); if (v) { h.via = v[1]; take(i, 'via'); } else if (/\b(?:email|e-mail)\s+(?:it|the tape|casting)\b|\bsend (?:it )?to (?:my )?(?:agent|manager|rep)\b/i.test(s)) { h.via = /agent|manager|rep/i.test(s) ? 'Through my rep' : 'Email'; take(i, 'via'); } }
      if (/\bdirect(?:ly)?\s+submit|\bsubmit\s+direct/i.test(s)) { h.direct = true; take(i, 'via'); }
      /* the notice */
      if (/\b(?:casting\s+)?notice\b|\bbreakdown\b|\binstructions\b/i.test(s) && /\bsee\b|\bcheck\b|\bread\b|\bmore\b|\badditional\b/i.test(s)) { h.notice = true; take(i, 'notice'); }
      /* your reader */
      if (/\breader\b|\bsomeone to read\b/i.test(s)) { h.reader = /\b(?:need|no|without|don'?t have|looking for|find)\b/i.test(s) ? 'need' : 'have'; take(i, 'reader'); }
      /* away, working, traveling */
      if (/\b(?:work(?:s|ing)?|shoot(?:s|ing)?|on set|travel(?:s|ing)?|out of town|away|flying|fly)\b/i.test(s) && /\b(?:in|to|out of|away|week|until|through|till|on set)\b/i.test(s) && !/\bget it done\b|\btape it\b/i.test(s) && !/\bread\b.*\boffice\b/i.test(s)) {
        h.heads.push(s.replace(/^(\w)/, c => c.toUpperCase())); take(i, 'heads'); }
      /* due */
      if (/\bdue\b|\bdeadline\b|\bby\s+\d|\bsubmit by\b|\bneed it by\b/i.test(s)) { const d = P.dayOf(s, day), t = P.timeOf(s); if (d) h.due = d; if (t) h.dueTime = t; if (d || t) take(i, 'due'); }
      else if (/\baudition\b.*\b(?:for|on|by)\b/i.test(s) && !h.due) { const d = P.dayOf(s, day); if (d) { h.due = d; take(i, 'due'); } }
      /* the character */
      const ch = s.match(/\b(?:character|she|he|they|the role)\s+(?:is|'s)\s+(.+?)[.!?]?$/i) || s.match(/\bplay(?:ing|s)?\s+(?:a|an|the)\s+(.+?)[.!?]?$/i);
      if (ch && !used.has(i)) { CH.push([i, clean(ch[1])]); take(i, 'character'); }
    });
    /* tape days, once the due day is known: "get it done wed or early morning thursday" */
    sents.forEach((s, i) => {
      if (!/\b(?:get it done|shoot it|film it|record it|knock it out|put it down|do it)\b|(?<![-\w])tape(?!\s+(?:is\s+)?due)\b/i.test(s)) return;
      const parts = s.split(/\bor\b|,|\band\b/i);
      parts.forEach(p => { const d = P.dayOf(p, day, h.due || ''); if (d && !h.tape.includes(d)) { h.tape.push(d); if (/\bearly\b|\bmorning\b/i.test(p) && d === h.due) h.tapeEarly = true; } });
      if (h.tape.length) take(i, 'tape');
    });
    /* short lines nobody claimed: the first is likely the title, the rest the character, all in your words */
    sents.forEach((s, i) => {
      if (used.has(i)) return;
      const bare = s.replace(/[.!?]+$/, ''), n = bare.split(/\s+/).length;
      if (n <= 3 && !/\b(?:i|i'm|im|it|its|it's|my|we|they|same|see|got|have|want|need|just|also)\b/i.test(bare)) {
        if (!h.title) { h.title = title(bare); take(i, 'title'); }
        else { CH.push([i, bare.replace(/^(\w)/, c => c.toUpperCase())]); take(i, 'character'); }
        return;
      }
      h.notes.push(s); used.add(i);
    });
    h.character = CH.sort((a, b) => a[0] - b[0]).map(x => x[1]);
    return h;
  };

  /* ---------- the plan: from the deadline back to today ---------- */
  P.build = function (h, day) {
    day = day || iso(new Date()); h = h || {};
    const steps = [], heads = [];
    const due = h.due && h.due >= day ? h.due : '', tape = (h.tape || []).filter(d => d >= day && (!due || d <= due));
    const tapeDay = tape[0] || (due ? (diff(day, due) >= 1 ? add(due, -1) : due) : ''), backup = tape[1] || '';
    const sendBy = h.dueTime ? (() => { const [hh, mm] = h.dueTime.split(':').map(Number); const t = Math.max(0, hh * 60 + mm - 60); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); })() : '';
    const S = (date, what, href, kind) => steps.push({ date: date < day ? day : date, what, href, kind });
    if (!due) heads.push('No deadline heard. Put in when it\'s due and the days fill in.');
    S(day, h.notice ? 'Read the sides and the casting notice. You said there\'s more in it.' : 'Read the sides and the request, all the way through.', 'actor-os/?open=1', 'read');
    if (tapeDay) {
      const room = diff(day, tapeDay), runDay = room >= 1 ? add(tapeDay, -1) : day;
      const bdDay = room >= 3 ? add(day, 1) : day, learnDay = room >= 3 ? add(bdDay, 1) : room >= 2 ? add(day, 1) : day;
      S(bdDay, 'Break it down: who you\'re talking to, what you want, scene by scene.', 'breakdown/', 'breakdown');
      S(learnDay, 'Get off book in Memorizer. The lines you miss come back first.', 'memorizer/?open=1', 'learn');
      if (h.reader === 'have') S(runDay, 'Run it with your reader, and lock in a time with them for the tape.', 'actor-os/?open=1', 'run');
      else if (h.reader === 'need') S(day, 'Find a reader: read their lines once yourself in Actor OS, or send a friend the link to read in.', 'actor-os/?open=1', 'reader');
      else S(runDay, 'Run it out loud, with a reader or the one you recorded in Actor OS.', 'actor-os/?open=1', 'run');
      const early = sendBy ? (() => { const t = Math.max(0, +sendBy.slice(0, 2) * 60 + +sendBy.slice(3) - 60); return P.timeLabel(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0')); })() : '';
      S(tapeDay, 'TAPE IT.' + (backup ? ' Backup: ' + P.dayLabel(backup, day) + (h.tapeEarly && backup === due ? ' early' + (early ? ', done by ' + early : '') : '') + '.' : ''), 'actor-os/?open=1', 'tape');
    }
    if (due) {
      const where = h.via ? (h.direct ? 'direct submit on ' + h.via : h.via) : (h.direct ? 'direct submit' : '');
      S(due, 'SEND IT' + (sendBy ? ' by ' + P.timeLabel(sendBy) + ', an hour before it\'s due' : '') + (where ? ': ' + where : '') + '. Actor OS names it, sizes it and checks it.', 'actor-os/?open=1', 'send');
    }
    (h.heads || []).forEach(x => heads.push(x));
    if ((h.heads || []).length && tapeDay) heads.push('Your tape day is ' + P.dayLabel(tapeDay, day) + '. Where will you and your reader be?');
    steps.sort((a, b) => a.date.localeCompare(b.date));
    return { steps, heads, tapeDay, backup, sendBy };
  };

  /* ---------- kept plans ---------- */
  const blank = () => ({ plans: [], at: 0 });
  function read() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.plans)) return Object.assign(blank(), d); } catch (e) { } return blank(); }
  function write(d) { d.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  P.all = () => read().plans.slice().sort((a, b) => String(a.heard.due || '9').localeCompare(String(b.heard.due || '9')) || b.made - a.made);
  P.get = id => read().plans.find(p => p.id === id) || null;
  P.save = function (p) { const d = read(), i = d.plans.findIndex(x => x.id === p.id); if (i >= 0) d.plans[i] = p; else d.plans.push(p); write(d); return p; };
  P.make = function (text, heard, day) { const p = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text: String(text || ''), heard, plan: P.build(heard, day), done: {}, agenda: false, voice: '', made: Date.now() }; return P.save(p); };
  P.rebuild = function (id, heard, day) { const p = P.get(id); if (!p) return null; p.heard = heard; p.plan = P.build(heard, day); return P.save(p); };
  P.set = function (id, patch) { const p = P.get(id); if (!p) return null; Object.assign(p, patch); return P.save(p); };
  P.toggle = function (id, i) { const p = P.get(id); if (!p) return null; p.done = Object.assign({}, p.done); p.done[i] = !p.done[i]; return P.save(p); };
  P.remove = async function (id) { const p = P.get(id); if (p && p.voice) await op('readwrite', st => st.delete(p.voice)); const d = read(); d.plans = d.plans.filter(x => x.id !== id); write(d); };
  P.name = p => [p.heard.title || 'Your audition', p.heard.role].filter(Boolean).join(' · ');
  /* YOUR AGENDA: the steps not done, from plans you put on it, until the day after it's due */
  P.agenda = function (list, day) {
    day = day || iso(new Date()); const out = [];
    (list || P.all()).filter(p => p.agenda && (!p.heard.due || p.heard.due >= day)).forEach(p => (p.plan.steps || []).forEach((s, i) => { if (p.done && p.done[i]) return;
      out.push({ date: s.date, kind: 'plan', href: 'plan/?p=' + encodeURIComponent(p.id), line: (p.heard.title || 'Your audition') + ': ' + s.what.replace(/ Actor OS names it, sizes it and checks it\.$/, '') }); }));
    return out;
  };

  /* for your calendar (shared/ics.js): each step on its day, the send at its time, the deadline at its time */
  P.events = function (p, link) {
    const h = p.heard, t = h.title || 'Your audition', ev = [];
    (p.plan.steps || []).forEach((s, i) => { if (p.done && p.done[i]) return;
      const timed = s.kind === 'send' && p.plan.sendBy;
      ev.push({ uid: 'plan-' + p.id + '-' + s.kind + '-' + i, date: s.date, time: timed ? p.plan.sendBy : '', mins: 30, title: t + ': ' + s.what.split('.')[0], notes: s.what, url: link || '' }); });
    if (h.due) ev.push({ uid: 'plan-' + p.id + '-due', date: h.due, time: h.dueTime || '', mins: 15, title: 'DUE: ' + t + (h.role ? ' (' + h.role + ')' : ''), notes: [h.office, h.via ? (h.direct ? 'Direct submit on ' : '') + h.via : ''].filter(Boolean).join(' · '), url: link || '' });
    return ev;
  };

  /* ---------- your voice note ---------- */
  let dbp = null;
  function db() { if (dbp) return dbp; dbp = new Promise(res => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('voice'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); return dbp; }
  const op = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise(res => { try { const t = d.transaction('voice', mode), r = fn(t.objectStore('voice')); t.oncomplete = () => res(r && r.result !== undefined ? r.result : true); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  P.keepVoice = async function (id, blob) { const p = P.get(id); if (!p || !blob) return false; const vid = 'v' + Date.now().toString(36); if (!(await op('readwrite', st => st.put(blob, vid)))) return false; if (p.voice) await op('readwrite', st => st.delete(p.voice)); P.set(id, { voice: vid }); return true; };
  P.voiceBlob = vid => vid ? op('readonly', st => st.get(vid)) : Promise.resolve(null);

  g.Plan = P;
  if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
