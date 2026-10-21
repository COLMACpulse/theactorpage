/* PROJECT HUB · read a self-tape request.
   Paste the Eco Cast page (Actors Access) and/or the rep's email. It pulls the project, the role,
   who is casting, when the tape is due (in the request's time zone, converted to yours), the other
   dates that are NOT your tape, their directions as a checklist, and the sides file names.
   Pure functions: browser (window.HubReq) and Node (module.exports). Nothing leaves the device. */
(function (g) {
  'use strict';
  const R = {};
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  // US zones. Standard / daylight offsets in hours from UTC.
  const TZ = { PST: -8, PDT: -7, MST: -7, MDT: -6, CST: -6, CDT: -5, EST: -5, EDT: -4, AKST: -9, AKDT: -8, HST: -10, UTC: 0, GMT: 0 };
  const GEN = { PT: ['PST', 'PDT'], MT: ['MST', 'MDT'], CT: ['CST', 'CDT'], ET: ['EST', 'EDT'], PACIFIC: ['PST', 'PDT'], EASTERN: ['EST', 'EDT'], CENTRAL: ['CST', 'CDT'], MOUNTAIN: ['MST', 'MDT'] };
  // US daylight time: second Sunday of March to first Sunday of November
  function usDst(y, mo, d) {
    const nth = (m, n) => { const f = new Date(Date.UTC(y, m, 1)).getUTCDay(); return 1 + ((7 - f) % 7) + (n - 1) * 7; };
    const a = Date.UTC(y, 2, nth(2, 2)), b = Date.UTC(y, 10, nth(10, 1)), t = Date.UTC(y, mo, d);
    return t >= a && t < b;
  }
  const clean = s => String(s || '').replace(/\r/g, '').replace(/[  ]/g, ' ');

  /* "Monday July 13, 2026 @ 1:00 PM (PDT)", "Tuesday, March 3rd at 8am PST", "FEB 27, 2026", "7/13/2026 5pm ET" */
  R.parseWhen = function (s, yearHint) {
    s = clean(s);
    let y, mo, d;
    let m = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
    if (m) { mo = MONTHS[m[1].toLowerCase()]; d = +m[2]; y = m[3] ? +m[3] : null; }
    else { m = s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/); if (m) { mo = +m[1] - 1; d = +m[2]; y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : null; } }
    if (mo == null) return null;
    if (!y) y = yearHint || new Date().getFullYear();
    const rest = s.slice((m.index || 0) + m[0].length);
    let hh = null, mm = 0;
    const t = rest.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i) || rest.match(/\b(\d{1,2}):(\d{2})\b/);
    if (t) { hh = +t[1]; mm = t[2] ? +t[2] : 0; if (t[3]) { const pm = /p/i.test(t[3]); if (pm && hh < 12) hh += 12; if (!pm && hh === 12) hh = 0; } }
    else if (/\bnoon\b/i.test(rest)) hh = 12; else if (/\bmidnight\b/i.test(rest)) hh = 0;
    let zone = null;
    const z = rest.match(/\b(PST|PDT|MST|MDT|CST|CDT|EST|EDT|AKST|AKDT|HST|UTC|GMT|PT|MT|CT|ET|Pacific|Eastern|Central|Mountain)\b/i);
    if (z) { const k = z[1].toUpperCase(); zone = GEN[k] ? GEN[k][usDst(y, mo, d) ? 1 : 0] : k; }
    const out = { y, mo, d, hh, mm, zone, text: s.trim() };
    if (hh != null && zone && TZ[zone] != null) out.utc = new Date(Date.UTC(y, mo, d, hh - TZ[zone], mm)).toISOString();
    else if (hh != null) out.local = new Date(y, mo, d, hh, mm).toISOString(); // no zone written: your own clock, said so
    else out.dateOnly = true;
    return out;
  };

  const LABELS = ['Eco Cast Invitation Details', 'Eco Cast Title', 'Breakdown Title', 'Breakdown Left Heading', 'Breakdown Right Heading', 'Breakdown Additional Notes',
    'Role Name', 'Role Description', 'Casting Director', 'Audition Instructions', 'Audition Deadline', 'Instructional Media', 'Submit to', 'Transmission Cost', 'Submission Notes', 'Invited Actors'];
  // label at the start of a line, value after a tab, a newline or glued on; "Casting Director:" (with a colon) is not the label
  function segments(text) {
    const hits = [];
    LABELS.forEach(l => { const re = new RegExp('(^|\\n)[ \\t]*' + l.replace(/ /g, ' ') + '(?![:a-z])', 'g'); let m; while ((m = re.exec(text))) hits.push({ l, at: m.index + m[1].length, from: m.index + m[0].length }); });
    hits.sort((a, b) => a.at - b.at || b.l.length - a.l.length);
    const seg = {};
    hits.forEach((h, i) => { if (i && hits[i - 1].at === h.at) return; let to = text.length; for (let j = i + 1; j < hits.length; j++) if (hits[j].at > h.at) { to = hits[j].at; break; }
      const v = text.slice(h.from, to).replace(/^[ \t:]+/, '').trim(); if (!(h.l in seg) || (!seg[h.l] && v)) seg[h.l] = v; });
    return seg;
  }
  // "Executive Producers: X Director: Y Casting Directors: Z" even when glued together on one line
  const KEYS = ['Executive Producers', 'Executive Producer', 'Co-Executive Producers', 'Producers', 'Producer', 'Casting Directors', 'Casting Director', 'Casting Associates', 'Casting Associate', 'Casting Assistants', 'Casting Assistant',
    'Writers', 'Writer', 'Director', 'Shoot Dates', 'Shoot Date', 'Start Date', 'Rate of Pay', 'Rate', 'Location', 'Storyline', 'Network', 'Studio'];
  function keyed(text) {
    const found = [];
    KEYS.forEach(k => { const re = new RegExp(k.replace(/[-]/g, '\\-') + '\\s*:', 'gi'); let m; while ((m = re.exec(text))) found.push({ k, at: m.index, end: m.index + m[0].length }); });
    found.sort((a, b) => a.at - b.at || (b.end - b.at) - (a.end - a.at));
    const keep = []; found.forEach(f => { if (!keep.some(x => f.at >= x.at && f.at < x.end)) keep.push(f); });
    const out = {};
    keep.forEach((f, i) => { const to = i + 1 < keep.length ? keep[i + 1].at : text.length; const v = text.slice(f.end, to).replace(/\n.*$/s, '').trim().replace(/[,;]\s*$/, ''); const key = f.k.replace(/s$/, '').toLowerCase(); if (v && !out[key]) out[key] = v; });
    return out;
  }
  const ROLE_SIZE = /\b(SERIES REGULAR|RECURRING GUEST STAR|RECURRING CO-?STAR|RECURRING|GUEST STAR|CO-?STAR|DAY PLAYER|UNDER-?FIVE|SUPPORTING|LEAD|PRINCIPAL|FEATURED)\b/i;
  const plainName = s => /^[A-Z0-9][A-Z0-9 .'&\-"#]{1,48}$/.test(s);

  R.read = function (raw, opts) {
    opts = opts || {};
    const text = clean(raw);
    const seg = segments(text);
    const out = { title: '', episode: '', episodeTitle: '', show: '', type: '', studio: '', union: '', role: '', roleSize: '', pay: '', roleDesc: '', castingDirectors: [], castingAssistant: '', director: '', producers: '', shootDates: '', location: '', contact: '', due: null, dueFrom: '', otherDates: [], directions: [], confirmOnEcoCast: false, conflicts: false, sides: [], sent: /your audition has been sent/i.test(text), passed: /audition deadline has passed/i.test(text), found: [] };
    // title: the line after Breakdown Title, or a heading line "SHOW #304 "TITLE" (1 ADDED ROLE)"
    let title = (seg['Breakdown Title'] || '').split('\n')[0].trim();
    if (!title) { const m = text.match(/^\s*([A-Z][^\n]{1,60}#\s?\d+[^\n]*)$/m); if (m) title = m[1].trim(); }
    title = title.replace(/(Episodic|One Hour Drama|Half Hour|Pilot|Feature|Limited Series|Universal|Warner|Sony|Netflix|Amazon|SAG-?AFTRA).*$/i, '').trim();
    out.title = title;
    let m = title.match(/^(.*?)\s*#\s?(\d+)/); if (m) { out.show = m[1].trim(); out.episode = '#' + m[2]; }
    m = title.match(/"([^"]+)"/); if (m) out.episodeTitle = m[1];
    if (!out.show) out.show = title.replace(/\(.*?\)/g, '').replace(/"[^"]*"/g, '').trim();
    // left heading: type, studio, union (lines, or glued after the title)
    // pasted pages glue lines together ("EpisodicOne Hour DramaNorthlight Television..."): split them back
    const unglue = x => String(x || '').replace(/(SAG-?AFTRA|AEA|Non-?Union)/gi, ' $1 ').replace(/([a-z])([A-Z])/g, '$1 $2');
    let left = unglue(seg['Breakdown Left Heading'] || (text.match(/\(\d+ ADDED ROLES?\)([^\n]+)/i) || ['', ''])[1] || '');
    const TYPES = /(One Hour Drama|Half Hour Comedy|Half Hour Single Camera|Half Hour Multi-?Camera|Feature Film|Limited Series|Web Series|Short Film|Commercial|Pilot|Feature|Episodic)/gi;
    out.type = (left.match(TYPES) || []).filter((x, i, a) => a.indexOf(x) === i).join(', ');
    left = left.replace(TYPES, '\n');
    m = left.match(/([A-Z][A-Za-z.&' ]*(?:Television|Studios|Pictures|Productions|Entertainment|Films)[^\n]*?)(?=SAG|AEA|Non-?Union|\n|$)/); if (m) out.studio = m[1].trim();
    m = (left + ' ' + text).match(/(SAG-?AFTRA|AEA\b|Non-?Union)/i); if (m) out.union = m[1].toUpperCase().replace('SAGAFTRA', 'SAG-AFTRA');
    // right heading keys, wherever they are
    const right = seg['Breakdown Right Heading'] || text;
    const K = keyed(right);
    const cds = K['casting director'] || (seg['Casting Director'] || '').split('\n').map(x => x.trim()).filter(Boolean).join(', ');
    out.castingDirectors = cds ? cds.split(/,|\band\b|&/).map(x => x.replace(/,?\s*CSA\b/i, '').trim()).filter(Boolean) : [];
    if (!out.castingDirectors.length && seg['Casting Director']) out.castingDirectors = [seg['Casting Director'].split('\n')[0].trim()];
    out.castingAssistant = K['casting assistant'] || K['casting associate'] || '';
    out.director = K['director'] || ''; out.producers = K['executive producer'] || K['producer'] || '';
    out.shootDates = K['shoot date'] || K['start date'] || ''; out.location = K['location'] || '';
    if (!out.shootDates) { m = text.match(/SHOOTING:\s*([^\n]+)/i); if (m) out.shootDates = m[1].trim(); }
    // role
    let role = (seg['Role Name'] || '').split('\n')[0].trim();
    if (!plainName(role)) role = '';
    let desc = seg['Role Description'] || '';
    if (!desc) { m = text.match(/\[([A-Z][A-Z0-9 .'\-]{1,40})\]\s*([^\n]+)/); if (m) { if (!role) role = m[1].trim(); desc = m[2].trim(); } }
    if (!role) { m = text.match(/\b(?:the )?role (?:is|of)\s+([A-Z][A-Z .'\-]{1,40}?)(?=[.,\n]| I | and )/); if (m) role = m[1].trim(); }
    out.role = role;
    // the invited actor: Eco Cast lists you under Invited Actors (Actor / Role Name / AA Member / Deadline, then the rows)
    m = text.match(/Invited Actors\s*\n(?:\s*(?:Actor|Role Name|AA Member|Deadline)\s*\n){2,4}\s*([A-Z][A-Za-z .'\-]{2,40})\s*\n/);
    out.invitedActor = m && !/^(Actor|Role Name|AA Member|Deadline|Eco Cast)/i.test(m[1]) && m[1].trim().toUpperCase() !== role.toUpperCase() ? m[1].trim() : '';
    m = desc.match(/\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/);
    if (m && (ROLE_SIZE.test(m[1]) || /\$/.test(m[1]))) { const inner = m[1]; const rs = inner.match(ROLE_SIZE); if (rs) out.roleSize = rs[1].toUpperCase().replace(/^(\d+ SCENE )?/, ''); const pay = inner.match(/\$[\d,]+(?:\.\d+)?(?:\s*\([^)]*\))?(?:\s*-\s*\$[\d,]+(?:\.\d+)?(?:\s*\([^)]*\))?)?/); if (pay) out.pay = pay[0].trim(); desc = desc.slice(0, m.index).trim(); }
    if (!out.roleSize) { const rs = desc.match(ROLE_SIZE); if (rs) out.roleSize = rs[1].toUpperCase(); }
    out.roleDesc = desc;
    // contact, confirmation, conflicts
    const instr = seg['Audition Instructions'] || text;
    m = instr.match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if (m) out.contact = m[0].replace(/[.,]+$/, '');
    out.confirmOnEcoCast = /confirm\s+on\s+eco\s?cast/i.test(text);
    out.conflicts = /conflicts?/i.test(instr);
    // directions: bullet lines under DIRECTIONS (and any other bullet lines in the instructions)
    const dir = instr.split('\n').map(x => x.trim()).filter(x => /^[-•*·]\s*\S/.test(x) && !/^\*{2,}/.test(x)).map(x => x.replace(/^[-•*·]\s*/, ''));
    out.directions = dir;
    // sides
    const media = seg['Instructional Media'] || text;
    (media.match(/[^\n\t]*?\.pdf/gi) || []).forEach(f => { f = f.replace(/^(Click to view|\s)+/i, '').trim(); if (f && !out.sides.includes(f)) out.sides.push(f); });
    // dates: the tape due date (Eco Cast "Audition Deadline", else the rep's "deadline is ..."), and every other date that is not it
    const years = (text.match(/\b20\d\d\b/g) || []).map(Number); const yHint = years.length ? years[0] : null;
    const ad = seg['Audition Deadline'];
    if (ad) { out.due = R.parseWhen(ad.split('\n')[0].replace(/Instructional Media.*$/i, ''), yHint); out.dueFrom = 'Eco Cast'; }
    const rep = text.match(/(?:the\s+)?deadline\s+is\s+([^\n.]+(?:\.[^\n.]+)?)/i);
    if (rep) { const w = R.parseWhen(rep[1], yHint); if (w) { if (!out.due) { out.due = w; out.dueFrom = "your rep's email"; } else if (w.utc && out.due.utc && w.utc !== out.due.utc) out.otherDates.push({ text: rep[0].trim(), what: "Your rep's email says something different. Eco Cast is the one that closes; check with your rep." }); } }
    /* a rep's or casting's own words: "due Friday 10/24 by 5pm PT", "please submit by Oct 24 at noon", "need it by 10/24" */
    if (!out.due) { const said = text.match(/(?:\btape\s+(?:is\s+)?due|\bdue(?:\s+back)?|submit(?:ted)?\s+(?:it\s+|this\s+|your\s+tape\s+)?by|need(?:ed)?\s+(?:it\s+|this\s+|the\s+tape\s+)?by|send\s+(?:it\s+|this\s+)?(?:in\s+)?by|no\s+later\s+than)\b\s*:?\s*([^\n]{3,80})/i);
      if (said && !/shoot|film(?:s|ing)?\s+(?:on|dates?)|callback/i.test(text.slice(Math.max(0, said.index - 30), said.index))) { const w = R.parseWhen(said[1], yHint); if (w) { out.due = w; out.dueFrom = 'the request'; } } }
    const bd = text.match(/^\s*DEADLINE:\s*([^\n]+)/im);
    if (bd) { const w = R.parseWhen(bd[1], yHint); if (w && (!out.due || w.y !== out.due.y || w.mo !== out.due.mo || w.d !== out.due.d)) out.otherDates.push({ text: 'DEADLINE: ' + bd[1].trim(), what: "On the breakdown: the reps' submission deadline. Not your tape." }); }
    if (out.shootDates) out.otherDates.push({ text: 'Shoot: ' + out.shootDates, what: 'When they film. Hold it in case you book.' });
    Object.keys(out).forEach(k => { const v = out[k]; if (v && (typeof v !== 'object' || (Array.isArray(v) ? v.length : true)) && !['sent', 'passed', 'found', 'dueFrom', 'confirmOnEcoCast', 'conflicts'].includes(k)) out.found.push(k); });
    // how they want it sent (shared/delivery.js), from the instructions' own words
    try { const DL = g.Delivery || (typeof require === 'function' ? require('../shared/delivery.js') : null); out.delivery = DL ? DL.read(instr) : null; } catch (e) { out.delivery = null; }
    return out;
  };

  /* the due time, said plainly: theirs, and yours if different */
  R.dueWords = function (due, tzName) {
    if (!due) return 'No tape due date found. Ask your rep.';
    const fmt = (d, tz) => { try { return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz }); } catch (e) { return d.toUTCString(); } };
    if (due.utc) {
      const d = new Date(due.utc), theirs = { PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles', MST: 'America/Denver', MDT: 'America/Denver', CST: 'America/Chicago', CDT: 'America/Chicago', EST: 'America/New_York', EDT: 'America/New_York', HST: 'Pacific/Honolulu', AKST: 'America/Anchorage', AKDT: 'America/Anchorage', UTC: 'UTC', GMT: 'UTC' }[due.zone];
      const a = fmt(d, theirs) + ' ' + due.zone, mine = fmt(d, tzName);
      return mine === fmt(d, theirs) ? a : a + ' = ' + mine + ' your time';
    }
    if (due.local) return fmt(new Date(due.local), tzName) + ' (no time zone written; read as your own clock)';
    return new Date(due.y, due.mo, due.d).toDateString() + ' (no time given; ask your rep)';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = R; else g.HubReq = R;
})(typeof window !== 'undefined' ? window : globalThis);
