/* THEACTORPAGE FOOTAGE: every job you did, and where its footage stands, until it's a clip on your reel.
   A job: the project, your role, the episode, when it comes out, where it airs or streams, who to ask for the
   footage, when you asked, when to follow up. Your credits in the Hub show up here on their own.
   Where it stands: NOT OUT YET, OUT NOW, ASKED FOR IT, HAVE THE FILE, CLIPPED.
   It never downloads anything from a streaming site. You get the file the honest way (production, your rep,
   a copy you bought) and trim it here.
   localStorage theactorpage_footage_v1. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const F = {}, KEY = 'theactorpage_footage_v1';
  F.KEY = KEY;
  F.STATUS = [['notyet', 'Not out yet'], ['out', 'Out now'], ['asked', 'Asked for it'], ['have', 'Have the file'], ['clipped', 'Clipped']];
  F.KINDS = [['tv', 'TV'], ['film', 'Film'], ['short', 'Short'], ['commercial', 'Commercial'], ['web', 'Web series'], ['music', 'Music video'], ['other', 'Other']];
  const now = () => Date.now(), uid = () => 'f' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  F.key = (title, role) => (clean(title) + '|' + clean(role)).toLowerCase().replace(/[^a-z0-9|]+/g, '');
  const LS = () => { try { return g.localStorage; } catch (e) { return null; } };
  function read() { try { const d = JSON.parse((LS() && LS().getItem(KEY)) || 'null'); if (d && Array.isArray(d.jobs)) return d; } catch (e) { } return { jobs: [] }; }
  function write(d) { try { LS().setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  F.jobs = () => read().jobs.slice();
  F.get = id => read().jobs.find(j => j.id === id) || null;
  F.add = function (j) {
    const d = read(), title = clean(j && j.title); if (!title) return null;
    const k = F.key(title, j.role), had = d.jobs.find(x => F.key(x.title, x.role) === k); if (had) return had;
    const it = Object.assign({ id: uid(), title, role: '', kind: 'tv', episode: '', out: '', where: '', status: '', ask: '', asked: '', next: '', note: '', clips: [], added: now() }, j, { title });
    d.jobs.push(it); write(d); return it;
  };
  F.set = function (id, patch) { const d = read(), j = d.jobs.find(x => x.id === id); if (!j) return null; Object.keys(patch || {}).forEach(k => { if (k !== 'id') j[k] = typeof patch[k] === 'string' ? clean(patch[k]) : patch[k]; }); write(d); return j; };
  F.remove = function (id) { const d = read(); d.jobs = d.jobs.filter(j => j.id !== id); write(d); };
  F.addClip = function (id, clip) { const j = F.get(id); if (!j) return null; return F.set(id, { clips: (j.clips || []).concat([Object.assign({ at: now() }, clip)]), status: 'clipped' }); };
  /* where it stands, if you haven't said: from the release date */
  F.status = function (j, day) {
    day = day || new Date().toISOString().slice(0, 10);
    if (j.status) return j.status;
    if (j.out && j.out > day) return 'notyet';
    return j.out ? 'out' : 'notyet';
  };
  F.statusName = s => (F.STATUS.find(x => x[0] === s) || ['', 'Not out yet'])[1];
  F.kindName = s => (F.KINDS.find(x => x[0] === s) || ['', 'Other'])[1];
  /* your Hub credits you aren't tracking yet: [{title, role, kind}] */
  F.fromCredits = function (credits) {
    const have = {}; read().jobs.forEach(j => { have[F.key(j.title, j.role)] = 1; });
    const kindOf = m => /tv|series|episod/i.test(m || '') ? 'tv' : /film|feature/i.test(m || '') ? 'film' : /short/i.test(m || '') ? 'short' : /commercial|spot/i.test(m || '') ? 'commercial' : 'other';
    const out = [], seen = {};
    (credits || []).forEach(c => { const t = clean(c.title); if (!t) return; const k = F.key(t, c.role || c.character); if (have[k] || seen[k]) return; seen[k] = 1; out.push({ title: t, role: clean(c.role || c.character), kind: kindOf(c.medium || c.section || c.kind), where: clean(c.net || c.by) }); });
    return out;
  };
  /* what needs you, in plain words. -> [{id, line}] */
  F.alerts = function (day) {
    day = day || new Date().toISOString().slice(0, 10);
    const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
    const out = [];
    read().jobs.forEach(j => {
      const s = F.status(j, day), name = j.title + (j.episode ? ', ' + j.episode : '');
      if (j.next && j.next <= day && s !== 'have' && s !== 'clipped') out.push({ id: j.id, line: name + ': time to follow up' + (j.ask ? ' with ' + j.ask : '') + '.' });
      else if (s === 'out' && !j.asked) out.push({ id: j.id, line: name + ' is out. Ask for your footage' + (j.ask ? ' (' + j.ask + ')' : '') + '.' });
      else if (s === 'notyet' && j.out) { const n = days(day, j.out); if (n >= 0 && n <= 14) out.push({ id: j.id, line: name + ' comes out ' + (n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days') + (j.where ? ' on ' + j.where : '') + '.' }); }
      else if (s === 'have') out.push({ id: j.id, line: name + ': you have the file. Trim your moment into a clip.' });
    });
    return out;
  };
  F.counts = function (day) { const c = {}; F.STATUS.forEach(([k]) => c[k] = 0); read().jobs.forEach(j => c[F.status(j, day)]++); return c; };
  /* a clip's file name: Project_Role_clip */
  F.clipName = (j, ext) => ([j.title, j.role].filter(Boolean).join('_').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'clip') + '_clip.' + (ext || 'mp4');
  /* the trim: in and out in seconds -> what the compressor takes */
  F.trim = (inS, outS, dur) => { const a = Math.max(0, Math.min(+inS || 0, dur)), b = Math.max(a + 0.2, Math.min(+outS || dur, dur)); return { trimStart: a, trimEnd: Math.max(0, dur - b), secs: Math.round((b - a) * 10) / 10 }; };
  F.time = s => { s = Math.max(0, +s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  g.Footage = F;
  if (typeof module !== 'undefined') module.exports = F;
})(typeof window !== 'undefined' ? window : globalThis);
