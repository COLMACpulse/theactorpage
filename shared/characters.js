/* THEACTORPAGE CHARACTERS: every character, from every tool, in the places they sit for you.
   Read on this device only, never written back to the tools. Seven places:
     aud    Auditioned for        Project Hub, your sides, Actor OS takes, Breakdown, Memorizer, Spotted
     booked Booked                Project Hub (booked, credits), your credits, Virtual Résumé, Picture It, Spotted
     pull   I can pull off        Virtual Résumé (what you can play), Looks, Picture It (roles you want)
     made   I created             Character Bank, Character Capsules, Set List
     want   I want to create      yours to add
     wrote  I explored in writing THEACTORPAGES scripts, Paper Trail drafts
     vo     Voice over choices    Character Bank voices, voice demos, the voice pinned to a VO job
   The same name in the same project is one character. What you add (a character, a place, a note, hiding a card)
   is kept in localStorage 'theactorpage_characters_v1'. A tool's say-so can't be taken off, only hidden. */
(function (g) {
  'use strict';
  const C = {}, KEY = 'theactorpage_characters_v1';
  C.GROUPS = [['aud', 'Auditioned for'], ['booked', 'Booked'], ['pull', 'I can pull off'], ['made', 'I created'], ['want', 'I want to create'], ['wrote', 'I explored in writing'], ['vo', 'Voice over choices']];
  C.norm = s => String(s || '').toUpperCase().replace(/[‘’]/g, "'").replace(/\s*\((?:V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT'?D)\)\s*/g, ' ').replace(/[^A-Z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  C.key = (name, project) => C.norm(name) + '|' + C.norm(project);
  const NOT_A_NAME = /^(YOU|ME|VOICE OVER|VO|NARRATOR|LEAD|SUPPORTING|PRINCIPAL|GUEST STAR|CO STAR|RECURRING|SERIES REGULAR|DAY PLAYER|FEATURED|BACKGROUND|EXTRA|STAND IN|HOST|SPOKESPERSON|SELF|HIMSELF|HERSELF|ROLE|UNKNOWN)$/;
  C.isName = s => { const n = C.norm(s); return n.length >= 2 && n.length <= 40 && !NOT_A_NAME.test(n); };
  const tm = v => { if (v == null || v === '') return 0; if (typeof v === 'number') return v; const t = Date.parse(v); return isNaN(t) ? 0 : t; };
  const LS = k => { try { return JSON.parse(g.localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const fileTitle = f => { const t = String(f || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s*-?\s*\b(sides?|draft\s*\d*|revised)\b.*$/i, '').replace(/\s+/g, ' ').trim(); return t === t.toLowerCase() ? t.replace(/\b[a-z]/g, m => m.toUpperCase()) : t; };

  /* ---------- what you added ---------- */
  C.mine = () => { const d = LS(KEY) || {}; return { added: d.added || [], extra: d.extra || {}, hidden: d.hidden || {}, notes: d.notes || {} }; };
  C.save = m => { try { g.localStorage.setItem(KEY, JSON.stringify(m)); return true; } catch (e) { return false; } };

  /* ---------- merge: items from the tools, plus yours, into characters ----------
     item: {name, project, group, tool, label, href, at, step, detail} */
  C.merge = function (items, mine) {
    mine = mine || { added: [], extra: {}, hidden: {}, notes: {} };
    const by = {};
    const get = (name, project) => { const k = C.key(name, project); return by[k] = by[k] || { key: k, name: String(name).trim().toUpperCase(), project: String(project || '').trim(), groups: {}, sources: [], trail: [], at: 0 }; };
    (items || []).forEach(it => {
      if (!it || !C.isName(it.name)) return;
      const c = get(it.name, it.project);
      if (it.group) c.groups[it.group] = c.groups[it.group] || 'tool';
      if (it.tool && !c.sources.some(s => s.tool === it.tool && s.label === it.label)) c.sources.push({ tool: it.tool, label: it.label || it.tool, href: it.href || '', detail: it.detail || '' });
      if (it.step && it.at && !c.trail.some(t => t.step === it.step && t.at === tm(it.at))) c.trail.push({ step: it.step, at: tm(it.at) });
      c.at = Math.max(c.at, tm(it.at));
    });
    (mine.added || []).forEach(a => { if (!C.isName(a.name)) return; const c = get(a.name, a.project); c.yours = true; c.at = Math.max(c.at, tm(a.at)); (a.groups || []).forEach(gp => { c.groups[gp] = c.groups[gp] || 'you'; }); });
    Object.entries(mine.extra || {}).forEach(([k, gs]) => { const c = by[k]; if (c) (gs || []).forEach(gp => { c.groups[gp] = c.groups[gp] || 'you'; }); });
    const list = Object.values(by).filter(c => Object.keys(c.groups).length);
    list.forEach(c => { c.note = (mine.notes || {})[c.key] || ''; c.hidden = !!(mine.hidden || {})[c.key]; c.trail.sort((a, b) => a.at - b.at); });
    return list.sort((a, b) => b.at - a.at || a.name.localeCompare(b.name));
  };
  C.counts = list => { const o = {}; C.GROUPS.forEach(([k]) => o[k] = 0); (list || []).forEach(c => { if (!c.hidden) Object.keys(c.groups).forEach(k => o[k]++); }); return o; };

  /* ---------- reading the tools, read-only: never opens a database that isn't there ---------- */
  async function peek(name) {
    try { if (g.indexedDB && g.indexedDB.databases) { const l = await g.indexedDB.databases(); if (!l.some(d => d.name === name)) return null; } } catch (e) { }
    return new Promise(res => { try { const r = g.indexedDB.open(name); r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { } }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); } });
  }
  async function dget(dbName, store, key) { const d = await peek(dbName); if (!d) return null; return new Promise(res => { try { if (!d.objectStoreNames.contains(store)) { d.close(); return res(null); } const q = key === undefined ? d.transaction(store, 'readonly').objectStore(store).getAll() : d.transaction(store, 'readonly').objectStore(store).get(key); q.onsuccess = () => { d.close(); res(q.result || null); }; q.onerror = () => { d.close(); res(null); }; } catch (e) { try { d.close(); } catch (x) { } res(null); } }); }
  C._dget = dget;

  C.gather = async function () {
    const I = [], add = o => I.push(o);
    // Project Hub: auditions and how they went; credits
    try {
      const pj = await dget('colmac_hub', 'meta', 'projects'), cr = await dget('colmac_hub', 'meta', 'credits');
      const demo = x => x && (x.demo || String(x.aaid || '').indexOf('D1') === 0);
      ((pj && pj.v) || []).filter(x => !demo(x)).forEach(p => { if (p.kind && p.kind !== 'audition') return; const title = p.project || p.title || '', at = p.date || p.deadline || p.when;
        add({ name: p.role, project: title, group: 'aud', tool: 'hub', label: 'Project Hub', href: '../hub/', at, step: /^(submitted|archived)$/.test(p.state || '') ? 'Sent' : 'Read', detail: p.casting_office || p.casting_director || '' });
        const o = p.outcome || {};
        if (o.callback) add({ name: p.role, project: title, tool: 'hub', label: 'Project Hub', href: '../hub/', at: o.callback, step: 'Callback' });
        if (o.pinned) add({ name: p.role, project: title, tool: 'hub', label: 'Project Hub', href: '../hub/', at: o.pinned, step: 'Pinned' });
        if (o.booked || /confirm/i.test(p.status || '')) add({ name: p.role, project: title, group: 'booked', tool: 'hub', label: 'Project Hub', href: '../hub/', at: o.booked || at, step: 'Booked' }); });
      ((cr && cr.v) || []).filter(x => !demo(x)).forEach(c => add({ name: c.character || c.role, project: c.title, group: 'booked', tool: 'hub', label: 'Project Hub credits', href: '../hub/' }));
    } catch (e) { }
    // your sides
    const sh = LS('theactorpage_shelf_v1');
    ((sh && sh.list) || []).forEach(it => { if (!it.me || /^(?:Practice scene|Today's scene) - /.test(it.file || '')) return; add({ name: it.me, project: fileTitle(it.file), group: 'aud', tool: 'shelf', label: 'Your sides', href: '../actor-os/', at: it.added, detail: it.file || '' }); });
    // Actor OS takes (self-tapes)
    const tk = LS('theactorpage_takes_v1'), tc = {};
    ((tk && tk.list) || []).forEach(t => { const f = t.for || {}; if (f.type !== 'selftape' || f.from === 'booth' || !f.role) return; const k = C.key(f.role, f.title); tc[k] = tc[k] || { f, n: 0, at: 0 }; tc[k].n++; tc[k].at = Math.max(tc[k].at, tm(t.at)); });
    Object.values(tc).forEach(x => add({ name: x.f.role, project: x.f.title, group: 'aud', tool: 'actoros', label: 'Actor OS', href: '../actor-os/', at: x.at, step: 'Taped', detail: x.n + ' take' + (x.n === 1 ? '' : 's') }));
    // Breakdown
    try { ((await dget('breakdown_v03', 'projects')) || []).forEach(p => (p.me || []).forEach(m => add({ name: m, project: p.title || (p.source && (p.source.title || fileTitle(p.source.name))), group: 'aud', tool: 'breakdown', label: 'Breakdown', href: '../breakdown/', at: p.updated }))); } catch (e) { }
    // Memorizer
    const mz = LS('memorizer_v1');
    Object.values((mz && mz.scripts) || {}).forEach(s => { if (!s.me || /^(?:Practice scene|Today's scene) - /.test(s.file || '')) return; add({ name: s.me, project: fileTitle(s.file), group: 'aud', tool: 'memorizer', label: 'Memorizer', href: '../memorizer/', at: s.added }); });
    // Spotted
    const sp = LS('theactorpage_spotted_v1'), sl = (sp && (sp.list || sp.items)) || (Array.isArray(sp) ? sp : []);
    (Array.isArray(sl) ? sl : []).forEach(x => { const cd = x.card || {}, st = x.status || ''; const roles = cd.role ? [cd.role] : (cd.roles || []).map(r => r.name);
      roles.forEach(r => { if (st === 'submitted' || st === 'room') add({ name: r, project: cd.project, group: 'aud', tool: 'spotted', label: 'Spotted', href: '../spotted/', at: x.at, step: st === 'room' ? 'In the room' : 'Submitted' });
        if (st === 'booked') add({ name: r, project: cd.project, group: 'booked', tool: 'spotted', label: 'Spotted', href: '../spotted/', at: x.at, step: 'Booked' }); }); });
    // your credits (YOU) and Virtual Résumé
    const you = LS('theactorpage_you_v1');
    ((you && you.credits) || []).forEach(c => add({ name: c.character || c.role, project: c.title, group: 'booked', tool: 'you', label: 'Your credits', href: '../resume/' }));
    try {
      const rl = await dget('vresume_v03', 'lib', 'main');
      ((rl && rl.pieces) || []).forEach(p => add({ name: p.character, project: p.title, group: 'booked', tool: 'resume', label: 'Virtual Résumé', href: '../resume/', at: p.year ? String(p.year) + '-01-01' : 0 }));
      ((rl && rl.roles) || []).forEach(r => add({ name: r.name, project: '', group: 'pull', tool: 'resume', label: 'Virtual Résumé · what you can play', href: '../resume/', at: r.at }));
    } catch (e) { }
    // Looks: the types you play
    const lk = LS('theactorpage_looks_v1');
    ((lk && lk.looks) || []).forEach(l => add({ name: l.name, project: '', group: 'pull', tool: 'looks', label: 'Looks', href: '../looks/', at: l.added }));
    // Picture It: roles you want, and the ones you got
    const vz = LS('theactorpage_viz_v1');
    ((vz && vz.wishes) || []).forEach(w => { if (w.kind !== 'role') return; const tr = w.trail || {}, nm = w.role || w.title, pr = w.role ? w.title : '';
      if (tr.booked) add({ name: nm, project: pr, group: 'booked', tool: 'picture', label: 'Picture It', href: '../picture/', at: tr.booked, step: 'Booked' });
      else add({ name: nm, project: pr, group: 'pull', tool: 'picture', label: 'Picture It · you want it', href: '../picture/', at: w.added }); });
    // Character Bank: the characters you hold, and the voices
    try {
      const cb = await dget('cps_v02', 'lib', 'main'), vd = LS('theactorpage_vodemo_v1') || {}, bo = LS('booth_v1') || {}, pinned = bo.job && bo.job.voice;
      ((cb && cb.chars) || []).forEach(ch => { if (ch.me) return;
        add({ name: ch.name, project: ch.project, group: 'made', tool: 'cps', label: 'Character Bank', href: '../cps/', at: ch.updated || ch.created });
        const voiced = (ch.takes || []).some(t => t.kind === 'voice'), demo = vd.voices && vd.voices[ch.id];
        if (voiced || demo || pinned === ch.id) add({ name: ch.name, project: ch.project, group: 'vo', tool: 'cps', label: 'Character Bank · a voice', href: '../booth/', at: ch.updated, detail: pinned === ch.id ? 'on your VO job' : demo ? 'in your voice demo' : '' }); });
    } catch (e) { }
    // Character Capsules (THEACTORPAGES)
    const cap = LS('colmac_capsules_v1'), cl = Array.isArray(cap) ? cap : ((cap && (cap.list || cap.capsules)) || []);
    (Array.isArray(cl) ? cl : Object.values(cl || {})).forEach(x => x && add({ name: x.character_name, project: (x.story && x.story.world) || '', group: 'made', tool: 'capsule', label: 'Character Capsule', href: '../write/writers-blockage.html' }));
    // Set List: characters in your bits
    const st = LS('setlist_v1');
    ((st && st.pieces) || []).forEach(p => String(p.chars || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean).forEach(n => add({ name: n, project: p.title ? 'Set List: ' + p.title : 'Set List', group: 'made', tool: 'setlist', label: 'Set List', href: '../setlist/', at: p.at })));
    // THEACTORPAGES scripts: the cue names
    try { (LS('writers-blockage-index') || []).forEach(r => { if (r.practice) return; const d = LS('wb-proj:' + r.id); if (!d || d.practice || !Array.isArray(d.blocks)) return; if (/Practice (scene:|cut from )/.test((d.blocks || []).slice(0, 2).map(b => b && b.text || '').join(' '))) return;
      const seen = new Set(); d.blocks.forEach(b => { if (b && b.type === 'Character') { const n = C.norm(b.text); if (n && !seen.has(n)) { seen.add(n); add({ name: n, project: d.title || r.title, group: 'wrote', tool: 'wb', label: 'THEACTORPAGES', href: '../write/writers-blockage.html', at: r.updated }); } } }); }); } catch (e) { }
    // Paper Trail: the current draft of each project
    try {
      const pt = LS('paper_trail_v1');
      if (pt && pt.drafts && g.FilmOS) { const latest = {}; Object.values(pt.drafts).forEach(d => { if (d.kind === 'script' && !d.retired && (!latest[d.project] || d.added > latest[d.project].added)) latest[d.project] = d; });
        for (const d of Object.values(latest)) { const tx = await dget('paper_trail', 'texts', d.id); if (!tx) continue; const p = pt.projects && pt.projects[d.project], seen = new Set();
          (g.FilmOS.scenes(String(tx)) || []).forEach(s => (s.beats || []).forEach(b => { if (b.action || !b.who) return; const n = C.norm(b.who); if (!seen.has(n)) { seen.add(n); add({ name: n, project: (p && p.title) || fileTitle(d.file), group: 'wrote', tool: 'papertrail', label: 'Paper Trail', href: '../papertrail/?tab=allchars', at: d.added }); } })); } }
    } catch (e) { }
    return C.merge(I, C.mine());
  };
  g.Characters = C;
  if (typeof module !== 'undefined') module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
