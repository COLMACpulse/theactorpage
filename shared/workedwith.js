/* THEACTORPAGE WORKED WITH: the people on your credits, by the job they did: director, writer, director of
   photography, producer, casting. From your own credits (the director your résumé or your site names) and, when
   you have a TMDb key in the Hub, from TMDb's crew lists (films: that film; TV: the series, not your episode,
   unless TMDb is asked for the episode). Only a name, the job, the credit, where it came from. Nothing else is
   looked up about anyone.
   Then the matching: a breakdown, a request, a Spotted card or a news story that names someone you worked with.
   localStorage theactorpage_workedwith_v1. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const W = {}, KEY = 'theactorpage_workedwith_v1';
  W.KEY = KEY;
  W.JOBS = [['director', 'Director'], ['writer', 'Writer'], ['dp', 'Director of photography'], ['producer', 'Producer'], ['casting', 'Casting']];
  W.jobName = j => (W.JOBS.find(x => x[0] === j) || ['', j])[1];
  W.jobShort = j => ({ director: 'director', writer: 'writer', dp: 'DP', producer: 'producer', casting: 'casting' })[j] || j;
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  /* a name as a key: case, accents, dots and middle initials don't matter; "Dana J. Wolfe" is "Dana Wolfe" */
  W.key = n => clean(n).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b[a-z]\.\s*/g, ' ').replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isName = n => { const k = W.key(n); return k.split(' ').length >= 2 && k.length >= 5 && k.length <= 48 && !/\b(casting|productions?|pictures|studios?|films?|inc|llc|tbd|tba|various|n\/a)\b/.test(k); };
  W.isName = isName;
  /* TMDb's job words to ours */
  W.jobOf = function (job, dept) { const j = String(job || '').toLowerCase(), d = String(dept || '').toLowerCase();
    if (j === 'director') return 'director';
    if (/^(screenplay|writer|teleplay|story|novel|author|characters|creator|head writer|staff writer)$/.test(j) || (d === 'writing' && /writer|screenplay|teleplay/.test(j))) return 'writer';
    if (j === 'director of photography' || j === 'cinematography') return 'dp';
    if (/^(producer|executive producer|co-producer|co-executive producer)$/.test(j)) return 'producer';
    if (/^(casting|casting director|original casting)$/.test(j)) return 'casting';
    return ''; };
  const blank = () => ({ people: {}, fetched: {}, pitch: [], at: 0 });
  function read() { try { const d = JSON.parse((g.localStorage && g.localStorage.getItem(KEY)) || 'null'); if (d && d.people) return Object.assign(blank(), d); } catch (e) { } return blank(); }
  function write(d) { d.at = Date.now(); try { g.localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  W.read = read;
  /* one person on one credit: {name, job, title, scope:'film'|'series'|'episode', from:'resume'|'site'|'tmdb'} */
  function put(d, x) { const name = clean(x.name); if (!isName(name) || !x.job || !clean(x.title)) return false; const k = W.key(name);
    const p = d.people[k] || (d.people[k] = { name, on: [] });
    const same = p.on.find(o => o.job === x.job && W.key(o.title) === W.key(x.title));
    if (same) { if (x.from === 'resume' || x.from === 'site') same.from = x.from; return false; }
    p.on.push({ job: x.job, title: clean(x.title), scope: x.scope || 'film', from: x.from || 'tmdb' }); return true; }
  /* your credits: the director each one names */
  W.fromCredits = function (credits) { const d = read(); let n = 0;
    /* your credits are the source for these: a credit gone, or its director changed, and they follow */
    Object.keys(d.people).forEach(k => { const p = d.people[k]; p.on = p.on.filter(o => o.from === 'tmdb'); if (!p.on.length) delete d.people[k]; });
    (credits || []).forEach(c => { if (!c || !c.title) return; String(c.director || '').split(/\s*(?:,|;|&|\band\b|\/)\s*/).forEach(nm => { if (put(d, { name: nm, job: 'director', title: c.title, scope: /tv|series|episod/i.test(c.medium || c.net || '') ? 'episode' : 'film', from: c.from === 'site' ? 'site' : 'resume' })) n++; }); });
    write(d); return n; };
  /* TMDb: a film's credits ({crew}), a series' ({crew} from aggregate_credits, plus created_by), or an episode's ({crew}) */
  W.parseTmdb = function (json, opts) { opts = opts || {}; const out = [], seen = {};
    const add = (name, job) => { const k = W.key(name) + '|' + job; if (!job || seen[k]) return; seen[k] = 1; out.push({ name: clean(name), job }); };
    (json && json.crew || []).forEach(c => { const jobs = c.jobs ? c.jobs.map(x => x.job) : [c.job]; jobs.forEach(j => add(c.name, W.jobOf(j, c.department))); });
    (json && json.created_by || []).forEach(c => add(c.name, 'writer'));
    /* a whole series lists every episode's director: keep the ones who did the most, and producers and writers above the line */
    if (opts.scope === 'series') { const L = []; (json.crew || []).forEach(c => { if (!c.jobs) return; c.jobs.forEach(j => { const jb = W.jobOf(j.job, c.department); if (jb) L.push({ name: c.name, job: jb, n: j.episode_count || 0 }); }); });
      if (L.length) { const keep = L.filter(x => x.job !== 'director' || x.n >= 2 || L.filter(y => y.job === 'director').length <= 6).map(x => W.key(x.name) + '|' + x.job); return out.filter(x => keep.indexOf(W.key(x.name) + '|' + x.job) >= 0 || (json.created_by || []).some(c => W.key(c.name) === W.key(x.name))); } }
    return out; };
  W.addTmdb = function (title, list, scope) { const d = read(); let n = 0; (list || []).forEach(x => { if (put(d, { name: x.name, job: x.job, title, scope: scope || 'film', from: 'tmdb' })) n++; }); d.fetched[W.key(title)] = Date.now(); write(d); return n; };
  W.fetched = title => !!read().fetched[W.key(title)];
  W.all = () => { const d = read(); return Object.keys(d.people).map(k => Object.assign({ key: k }, d.people[k])).sort((a, b) => a.name.localeCompare(b.name)); };
  W.clear = () => write(blank());
  /* FOR MY REPS: the ones you pick, "worked with X, who is on Y". Only when you tap it. */
  W.pitches = () => (read().pitch || []).slice();
  W.pitch = function (p, project) { if (!p || !clean(project)) return null; const d = read(); d.pitch = d.pitch || [];
    const k = W.key(p.name) + '|' + W.key(project); if (d.pitch.some(x => x.k === k)) return null;
    const it = { k, name: p.name, on: p.on[0], project: clean(project), at: Date.now() }; d.pitch.push(it); write(d); return it; };
  W.pitched = (name, project) => W.pitches().some(x => x.k === W.key(name) + '|' + W.key(project));
  W.unpitch = k => { const d = read(); d.pitch = (d.pitch || []).filter(x => x.k !== k); write(d); };
  W.pitchWords = x => x.name + ' (' + W.onWords(x.on) + ') is on ' + x.project + '.';
  /* plain words: "director on Harbor Lights", "DP on Ferro (the series)" */
  W.onWords = o => W.jobShort(o.job) + ' on ' + o.title + (o.scope === 'series' ? ' (the series)' : '');
  W.fromWords = f => ({ resume: 'your résumé', site: 'your site', tmdb: 'TMDb' })[f] || f;

  /* ---------- the matching ---------- */
  /* names: a list of names (a breakdown's director, producers, casting). -> [{name, on:[...]}] */
  W.match = function (names, people) { people = people || W.all(); const by = {}; people.forEach(p => by[W.key(p.name)] = p); const out = [], seen = {};
    (names || []).forEach(n => String(n || '').split(/\s*(?:,|;|&|\band\b|\/)\s*/).forEach(x => { const k = W.key(x); if (by[k] && !seen[k]) { seen[k] = 1; out.push(by[k]); } })); return out; };
  /* free text (a news story, a Spotted card's words): whole names only, on word edges */
  W.inText = function (text, people) { people = people || W.all(); const t = ' ' + W.key(String(text || '').replace(/[’]/g, "'")) + ' '; return people.filter(p => { const k = W.key(p.name); return k && t.indexOf(' ' + k + ' ') >= 0; }); };
  /* one line for a match, for a card or your reps: "You worked with Dana Wolfe (DP on Harbor Lights)." */
  W.line = p => 'You worked with ' + p.name + ' (' + p.on.slice(0, 2).map(W.onWords).join('; ') + (p.on.length > 2 ? '; and ' + (p.on.length - 2) + ' more' : '') + ').';
  /* for your reps: in your own sentence, the facts only */
  W.repLine = (p, project) => 'I worked with ' + p.name + ' (' + W.onWords(p.on[0]) + ')' + (project ? ', who is on ' + project : '') + '.';

  g.WorkedWith = W;
  if (typeof module !== 'undefined') module.exports = W;
})(typeof window !== 'undefined' ? window : globalThis);
