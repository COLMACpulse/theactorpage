/* THE PLAN: say it, check what it heard, put it on your agenda. Rules in shared/plan.js. */
(function () {
  'use strict';
  const P = window.Plan, $ = id => document.getElementById(id), V = $('view');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => P.iso(new Date());
  const ROLES = ['', 'Co-star', 'Guest star', 'Recurring guest star', 'Recurring', 'Series regular', 'Day player', 'Under-5', 'Supporting', 'Lead', 'Featured'];
  const VIAS = ['', 'Actors Access', 'Casting Networks', 'Backstage', 'WeAudition', 'Email', 'Through my rep'];
  const HIST = [['', 'Not said'], ['worked_with', 'They\'ve cast me before'], ['warm', 'I\'ve read for them'], ['new', 'First time with them']];
  let MSG = '', DRAFT = null, VOICE = null, rec = null, chunks = [];
  const say = t => { MSG = t || ''; const m = $('msg'); if (m) m.textContent = MSG; };
  function go(q) { history.replaceState(null, '', location.pathname + (q ? '?' + q : '')); route(); }
  function route() { const q = new URLSearchParams(location.search); if (q.get('p') && P.get(q.get('p'))) return one(q.get('p')); if (q.get('draft') !== null && DRAFT) return draft(); start(); }
  function known() {
    const titles = [], offices = [];
    try { (window.Inbox ? Inbox.all('request') : []).forEach(r => { if (r.data && r.data.title) titles.push(String(r.data.title).replace(/\s*#.*$/, '').trim()); }); } catch (e) { }
    try { (window.Viz ? Viz.all() : []).forEach(w => { if (w.kind === 'show' || w.kind === 'film') titles.push(w.title); }); } catch (e) { }
    try { (window.Contacts ? Contacts.mine() : []).forEach(p => { if (p.role === 'casting') offices.push(p.name); }); } catch (e) { }
    return { titles, offices };
  }
  /* facts from a request you dropped in, or from a Hub card: fill the blanks your note left */
  function fromRequest() {
    const q = new URLSearchParams(location.search), f = {};
    if (q.get('req') && window.Inbox && window.HubReq) { const it = Inbox.get(q.get('req')); if (it && it.data) { let r = null; try { r = HubReq.read(it.data.raw || ''); } catch (e) { }
      f.title = (r && (r.show || r.title)) || it.data.title || ''; f.part = (r && r.role) || it.data.role || '';
      const sz = r && r.roleSize ? String(r.roleSize).toLowerCase() : ''; f.role = ROLES.find(x => x && x.toLowerCase() === sz) || '';
      if (r && r.castingDirectors && r.castingDirectors.length) f.office = r.castingDirectors.join(' & ');
      const due = r && r.due ? (r.due.utc || r.due.local || '') : (it.data.due || '');
      if (due) { const d = new Date(due); if (!isNaN(d)) { f.due = P.iso(d); if (!(r && r.due && r.due.dateOnly)) f.dueTime = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } }
      if (/eco\s*cast|actors\s*access/i.test(it.data.raw || '')) f.via = 'Actors Access';
      f.notice = true; f.from = 'your request'; } }
    if (q.get('t')) { f.title = q.get('t'); f.part = q.get('r') || ''; if (q.get('cd')) f.office = q.get('cd'); if (q.get('due')) { const d = new Date(q.get('due')); if (!isNaN(d)) { f.due = P.iso(d); if (/T\d/.test(q.get('due'))) f.dueTime = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } } f.from = 'the Hub'; }
    return f.from ? f : null;
  }
  const fill = (h, f) => { if (!f) return h; ['title', 'role', 'office', 'due', 'dueTime', 'via'].forEach(k => { if (!h[k] && f[k]) h[k] = f[k]; }); if (f.part && !h.character.some(c => c.toLowerCase().includes(f.part.toLowerCase()))) h.character.unshift(f.part); if (f.notice) h.notice = true; return h; };

  /* ---------- start: say it ---------- */
  function start() {
    const f = fromRequest(), Rec = window.SpeechRecognition || window.webkitSpeechRecognition, list = P.all();
    let h = '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p><div class="card"><p class="kick">SAY WHAT YOU KNOW</p>' +
      (f ? '<p class="dim small">From ' + esc(f.from) + ': ' + esc([f.title, f.part, f.office, f.due ? P.longDate(f.due) : ''].filter(Boolean).join(' · ')) + '. Add what you know.</p>' : '') +
      '<textarea class="field" id="t" rows="6" placeholder="The project, the casting office, the role, when it\'s due, where it goes, your reader, when you can tape, anything you\'re up against."></textarea>' +
      '<p class="mut small">On a phone, tap the mic on your keyboard and talk.</p>' +
      '<div class="row">' + (Rec ? '<button class="btn quiet" type="button" id="listen">LISTEN</button>' : '') + '<button class="btn quiet" type="button" id="vrec">KEEP A VOICE NOTE</button><span class="mut small" id="vst"></span></div>' +
      (Rec ? '<p class="mut small">LISTEN turns your voice into words with your browser\'s own speech service. In Chrome that goes through Google.</p>' : '') +
      '<div class="row" style="margin-top:12px"><button class="btn" type="button" id="go">MAKE THE PLAN</button></div></div>';
    if (list.length) h += '<h2>YOUR PLANS</h2>' + list.map(p => { const next = (p.plan.steps || []).find((s, i) => !(p.done || {})[i]);
      return '<button class="plugrow" type="button" data-p="' + p.id + '"><span class="kick">' + esc(P.name(p).toUpperCase()) + (p.agenda ? ' · ON YOUR AGENDA' : '') + '</span><span class="dim" style="display:block">' + (p.heard.due ? 'Due ' + esc(P.longDate(p.heard.due)) + (p.heard.dueTime ? ' at ' + esc(P.timeLabel(p.heard.dueTime)) : '') + '. ' : '') + (next ? 'Next: ' + esc(next.what.split('.')[0]) + '.' : 'Every step done.') + '</span></button>'; }).join('');
    V.innerHTML = h;
    V.querySelectorAll('[data-p]').forEach(b => b.onclick = () => go('p=' + b.dataset.p));
    $('go').onclick = () => { const t = $('t').value.trim(); if (!t && !f) { say('Say or type what you know first.'); $('t').focus(); return; }
      const heard = fill(P.hear(t, today(), known()), f); DRAFT = { text: t, heard }; say(''); go('draft'); };
    if ($('listen')) $('listen').onclick = () => listen(Rec);
    $('vrec').onclick = voiceNote;
  }
  function listen(Rec) {
    const b = $('listen'); if (b.dataset.on) { try { b._r.stop(); } catch (e) { } return; }
    const r = new Rec(); r.lang = 'en-US'; r.continuous = true; r.interimResults = false; b._r = r; b.dataset.on = '1'; b.textContent = 'STOP LISTENING';
    r.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) { const t = $('t'); t.value = (t.value ? t.value.replace(/\s*$/, '') + ' ' : '') + e.results[i][0].transcript.trim() + '.'; } };
    r.onerror = e => { say(e.error === 'not-allowed' ? 'The mic is off for this page. You can still type, or use the mic on your keyboard.' : 'Listening stopped. Type the rest, or tap LISTEN again.'); };
    r.onend = () => { delete b.dataset.on; b.textContent = 'LISTEN'; };
    try { r.start(); } catch (e) { say('Listening didn\'t start here. Type it, or use the mic on your keyboard.'); }
  }
  async function voiceNote() {
    const b = $('vrec');
    if (rec) { rec.stop(); return; }
    let st; try { st = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { say('The mic is off for this page. You can still type.'); return; }
    chunks = []; rec = new MediaRecorder(st); rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => { st.getTracks().forEach(t => t.stop()); VOICE = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); rec = null; b.textContent = 'RECORD IT AGAIN'; $('vst').textContent = 'Voice note kept with this plan, in your voice.'; };
    rec.start(); b.textContent = 'STOP THE VOICE NOTE'; $('vst').textContent = 'Recording. Say it all, then stop.';
  }

  /* ---------- what it heard, and the plan ---------- */
  function heardForm(h) {
    const opt = (list, v) => list.map(o => { const k = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : (o || 'Not said'); return '<option value="' + esc(k) + '"' + (k === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('');
    const lines = a => esc((a || []).join('\n'));
    const viaOther = h.via && !VIAS.includes(h.via);
    return '<div class="grid2">' +
      '<div><label class="lab" for="h_title">THE PROJECT</label><input class="field" id="h_title" value="' + esc(h.title) + '"></div>' +
      '<div><label class="lab" for="h_role">THE KIND OF ROLE</label><select class="field" id="h_role">' + opt(ROLES.includes(h.role) ? ROLES : ROLES.concat([h.role]), h.role) + '</select></div>' +
      '<div><label class="lab" for="h_office">CASTING</label><input class="field" id="h_office" value="' + esc(h.office) + '"></div>' +
      '<div><label class="lab" for="h_hist">YOU AND THIS OFFICE</label><select class="field" id="h_hist">' + opt(HIST, h.officeHistory || '') + '</select></div>' +
      '<div><label class="lab" for="h_due">DUE</label><input class="field" type="date" id="h_due" value="' + esc(h.due) + '"></div>' +
      '<div><label class="lab" for="h_time">BY</label><input class="field" type="time" id="h_time" value="' + esc(h.dueTime) + '"></div>' +
      '<div><label class="lab" for="h_t1">TAPE DAY</label><input class="field" type="date" id="h_t1" value="' + esc(h.tape[0] || '') + '"></div>' +
      '<div><label class="lab" for="h_t2">BACKUP DAY</label><input class="field" type="date" id="h_t2" value="' + esc(h.tape[1] || '') + '"></div>' +
      '<div><label class="lab" for="h_via">WHERE IT GOES</label><select class="field" id="h_via">' + opt(viaOther ? VIAS.concat([h.via]) : VIAS, h.via) + '</select></div>' +
      '<div><label class="lab" for="h_reader">YOUR READER</label><select class="field" id="h_reader">' + opt([['', 'Not said'], ['have', 'I have one'], ['need', 'I need one']], h.reader || '') + '</select></div></div>' +
      '<div class="row" style="margin-top:10px"><label class="row"><input type="checkbox" id="h_direct"' + (h.direct ? ' checked' : '') + '> <span>Direct submit</span></label><label class="row"><input type="checkbox" id="h_early"' + (h.tapeEarly ? ' checked' : '') + '> <span>Backup is early that morning</span></label><label class="row"><input type="checkbox" id="h_notice"' + (h.notice ? ' checked' : '') + '> <span>Check the casting notice</span></label></div>' +
      '<label class="lab" for="h_char">THE CHARACTER, IN YOUR WORDS</label><textarea class="field" id="h_char" rows="2">' + lines(h.character) + '</textarea>' +
      '<label class="lab" for="h_heads">WHAT YOU\'RE UP AGAINST</label><textarea class="field" id="h_heads" rows="2" placeholder="Working out of town, a shoot day, a trip">' + lines(h.heads) + '</textarea>' +
      '<label class="lab" for="h_notes">EVERYTHING ELSE YOU SAID</label><textarea class="field" id="h_notes" rows="2">' + lines(h.notes) + '</textarea>';
  }
  function readForm(h0) {
    const L = id => $(id).value.split('\n').map(s => s.trim()).filter(Boolean);
    return Object.assign({}, h0, { title: $('h_title').value.trim(), role: $('h_role').value, office: $('h_office').value.trim(), officeHistory: $('h_hist').value, due: $('h_due').value, dueTime: $('h_time').value,
      tape: [$('h_t1').value, $('h_t2').value].filter(Boolean), via: $('h_via').value, reader: $('h_reader').value, direct: $('h_direct').checked, tapeEarly: $('h_early').checked, notice: $('h_notice').checked,
      character: L('h_char'), heads: L('h_heads'), notes: L('h_notes') });
  }
  function planHTML(plan, done, id) {
    const d = today();
    return (plan.heads.length ? '<div class="heads"><p class="kick" style="margin:0">HEADS UP</p>' + plan.heads.map(x => '<p>' + esc(x) + '</p>').join('') + '</div>' : '') +
      '<ul class="steps">' + plan.steps.map((s, i) => '<li class="' + (done && done[i] ? 'done' : '') + '">' + (id ? '<input type="checkbox" data-done="' + i + '"' + (done && done[i] ? ' checked' : '') + ' aria-label="Done">' : '<span></span>') +
        '<span class="d">' + esc(P.dayLabel(s.date, d).toUpperCase()) + '</span><span class="w">' + esc(s.what) + ' <a class="go" href="../' + esc(s.href) + '">OPEN</a></span></li>').join('') + '</ul>';
  }
  const dueBar = h => '<p class="duebar">' + (h.due ? '<b>DUE</b> ' + esc(P.longDate(h.due)) + (h.dueTime ? ', ' + esc(P.timeLabel(h.dueTime)) : '') : '<b>DUE</b> not said yet') + (h.via ? ' · ' + esc((h.direct ? 'direct submit on ' : '') + h.via) : '') + '</p>' +
    '<p class="mut">' + esc([h.role, h.office].filter(Boolean).join(' · ')) + '</p>';
  function draft() {
    const h = DRAFT.heard, plan = P.build(h, today());
    V.innerHTML = '<p><a href="./" id="back">← START OVER</a></p><p class="msg" id="msg" role="status">' + esc(MSG) + '</p>' +
      '<h2 style="margin-top:6px">THE PLAN · ' + esc((h.title || 'YOUR AUDITION').toUpperCase()) + '</h2>' + dueBar(h) + planHTML(plan) +
      '<div class="row" style="margin:16px 0"><button class="btn" type="button" id="agenda">PUT IT ON MY AGENDA</button><button class="btn quiet" type="button" id="keep">JUST KEEP IT</button></div>' +
      '<details class="heard card" open><summary>WHAT I HEARD · FIX ANYTHING</summary>' + heardForm(h) + '<div class="row" style="margin-top:12px"><button class="btn ghost" type="button" id="redo">REDO THE PLAN</button></div></details>' +
      (DRAFT.text ? '<h2>WHAT YOU SAID</h2><p class="said">' + esc(DRAFT.text) + '</p>' : '');
    $('back').onclick = e => { e.preventDefault(); DRAFT = null; VOICE = null; go(''); };
    $('redo').onclick = () => { DRAFT.heard = readForm(DRAFT.heard); draft(); };
    const keep = async onAg => { const hh = readForm(DRAFT.heard), p = P.make(DRAFT.text, hh, today()); if (VOICE) await P.keepVoice(p.id, VOICE); VOICE = null;
      if (onAg) { P.set(p.id, { agenda: true }); toContacts(hh); }
      DRAFT = null; say(onAg ? 'On your agenda. Each step shows up on its day.' : 'Kept. Put it on your agenda whenever you like.'); go('p=' + p.id); };
    $('agenda').onclick = () => keep(true); $('keep').onclick = () => keep(false);
  }
  function toContacts(h) {
    if (!h.office || !window.Contacts) return;
    const had = Contacts.find(h.office); if (had) return;
    const why = { worked_with: 'Cast me before.', warm: 'I\'ve read for them.', new: 'First time with them.' }[h.officeHistory] || '';
    Contacts.add({ name: h.office, role: 'casting', note: [why, h.title ? 'Casting ' + h.title + '.' : ''].filter(Boolean).join(' ') });
  }

  /* ---------- a kept plan ---------- */
  async function one(id) {
    const p = P.get(id), h = p.heard;
    let vurl = ''; if (p.voice) { const b = await P.voiceBlob(p.voice); if (b) vurl = URL.createObjectURL(b); }
    V.innerHTML = '<p><a href="./" id="back">← YOUR PLANS</a></p><p class="msg" id="msg" role="status">' + esc(MSG) + '</p>' +
      '<h2 style="margin-top:6px">THE PLAN · ' + esc((h.title || 'YOUR AUDITION').toUpperCase()) + '</h2>' + dueBar(h) + planHTML(p.plan, p.done, id) +
      '<div class="row" style="margin:16px 0">' + (p.agenda ? '<button class="btn quiet" type="button" id="agenda">TAKE IT OFF MY AGENDA</button>' : '<button class="btn" type="button" id="agenda">PUT IT ON MY AGENDA</button>') + '</div>' +
      ((h.character.length || h.notes.length || h.officeHistory) ? '<h2>YOUR WORDS</h2>' + (h.character.length ? '<p><span class="kick">THE CHARACTER</span><br>' + h.character.map(esc).join('<br>') + '</p>' : '') +
        (h.officeHistory ? '<p><span class="kick">YOU AND ' + esc((h.office || 'THE OFFICE').toUpperCase()) + '</span><br>' + esc((HIST.find(x => x[0] === h.officeHistory) || ['', ''])[1]) + '</p>' : '') +
        (h.notes.length ? '<p><span class="kick">EVERYTHING ELSE</span><br>' + h.notes.map(esc).join('<br>') + '</p>' : '') : '') +
      (vurl ? '<h2>YOUR VOICE NOTE</h2><audio controls src="' + vurl + '" style="width:100%"></audio>' : '') +
      '<details class="heard card"><summary>WHAT I HEARD · FIX ANYTHING</summary>' + heardForm(h) + '<div class="row" style="margin-top:12px"><button class="btn ghost" type="button" id="redo">REDO THE PLAN</button></div></details>' +
      (p.text ? '<h2>WHAT YOU SAID</h2><p class="said">' + esc(p.text) + '</p>' : '') +
      '<div class="row" style="margin-top:22px"><button class="btn quiet" type="button" id="del">DELETE THIS PLAN</button></div>';
    $('back').onclick = e => { e.preventDefault(); say(''); go(''); };
    V.querySelectorAll('[data-done]').forEach(c => c.onchange = () => { P.toggle(id, +c.dataset.done); one(id); });
    $('agenda').onclick = () => { const on = !p.agenda; P.set(id, { agenda: on }); if (on) toContacts(h); say(on ? 'On your agenda. Each step shows up on its day.' : 'Off your agenda. The plan is still here.'); one(id); };
    $('redo').onclick = () => { const hh = readForm(h); const done = p.done; P.rebuild(id, hh, today()); P.set(id, { done: {} }); say(Object.keys(done || {}).length ? 'Plan redone. Tick off what you\'ve already done.' : 'Plan redone.'); one(id); };
    $('del').onclick = async () => { if (!confirm('Delete this plan?')) return; await P.remove(id); say(''); go(''); };
  }

  window.__plan = { route };
  route();
})();
