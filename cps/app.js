/*
  CHARACTER BANK v0.5 (was CPS) · Character Preservation
  You find the character. This keeps it: your voice, your look, the line that drops you back in.
  Come back weeks later, hear yourself, record again, see what moved.
  No computer voice. The actor is the machine. Vanilla JS, offline, no account.
*/
(function () {
  'use strict';
  const VERSION = '0.5.0';
  const SCHEMA = 'ACT.CPS/0.2';
  const E = window.CPSEngine, G = window.CPSCharts;
  const MAX_REC = 180; // seconds

  // ---------------------------------------------------------------- utils
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const fmtT = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  const slug = s => String(s || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'character';
  const ago = iso => { if (!iso) return ''; const d = E.daysSince(iso); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; };
  const extOf = t => /webm/.test(t) ? 'webm' : /ogg|opus/.test(t) ? 'ogg' : /wav/.test(t) ? 'wav' : /mpeg|mp3/.test(t) ? 'mp3' : /png/.test(t) ? 'png' : /jpe?g/.test(t) ? 'jpg' : /heic/.test(t) ? 'heic' : /quicktime/.test(t) ? 'mov' : /video\/mp4/.test(t) ? 'mp4' : /mp4|m4a|aac/.test(t) ? 'm4a' : 'bin';
  const typeOf = n => ({ webm: 'audio/webm', ogg: 'audio/ogg', wav: 'audio/wav', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'video/mp4', mov: 'video/quicktime', png: 'image/png', jpg: 'image/jpeg', heic: 'image/heic' }[String(n).split('.').pop().toLowerCase()] || 'application/octet-stream');
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3600); }

  // ---------------------------------------------------------------- storage
  function idb(name, ver, upgrade) { return new Promise(res => { try { const r = indexedDB.open(name, ver); r.onupgradeneeded = () => upgrade && upgrade(r.result); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); }
  const DBP = idb('cps_v02', 1, db => { db.createObjectStore('lib'); db.createObjectStore('media'); });
  const op = async (store, mode, fn) => { const db = await DBP; if (!db) return null; return new Promise((res, rej) => { const t = db.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r && 'result' in r ? r.result : undefined); t.onerror = () => rej(t.error); }); };
  const DB = { getLib: () => op('lib', 'readonly', s => s.get('main')), putLib: l => op('lib', 'readwrite', s => s.put(JSON.parse(JSON.stringify(l)), 'main')), getMedia: k => op('media', 'readonly', s => s.get(k)), putMedia: (k, b) => op('media', 'readwrite', s => s.put(b, k)), delMedia: k => op('media', 'readwrite', s => s.delete(k)) };

  // read another ACT tool's storage without creating it if it isn't there
  async function peek(name) {
    try { if (indexedDB.databases) { const l = await indexedDB.databases(); if (!l.some(d => d.name === name)) return null; } } catch (e) { }
    return new Promise(res => { try { const r = indexedDB.open(name); r.onupgradeneeded = () => { r.transaction.abort(); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  }
  async function peekAll(db, store) { if (!db || !db.objectStoreNames.contains(store)) return []; return new Promise(res => { try { const r = db.transaction(store, 'readonly').objectStore(store).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); } catch (e) { res([]); } }); }

  const emptyLib = () => ({ schema: SCHEMA, app: 'Character Bank ' + VERSION, created: now(), chars: [], cur: null, lastSaved: null, lines: E.DEFAULT_LINES });
  const newChar = (name, project) => ({ id: rid(), name: name || '', project: project || '', created: now(), updated: now(), state: null, anchorLine: '', notes: '', refId: null, takes: [], looks: [], bd: null, never: '', vary: '', strain: '', strained: false, me: false, posture: '', weight: '', eyes: '', hands: '', trigger: '', plays: '', neverDo: '', backs: [] });
  const S = { fold: {}, proj: '', newOpen: false, bstep: 0, visit: null, cold: (function () { try { return localStorage.getItem('cps_cold') === '1'; } catch (e) { return false; } })(), lib: null, tab: 'chars', urls: {}, rec: null, lastReturn: null, bd: [], busy: '' };
  let saveT = null;
  function touch(c) { if (c) c.updated = now(); clearTimeout(saveT); saveT = setTimeout(() => DB.putLib(S.lib), 200); }
  const cur = () => S.lib.chars.find(c => c.id === S.lib.cur) || null;
  const take = (c, id) => (c.takes || []).find(t => t.id === id);
  const url = id => S.urls[id] || '';

  // ---------------------------------------------------------------- audio: decode + analyse
  let AC = null;
  const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
  async function decode(blob) {
    const ab = await blob.arrayBuffer(), c = ac();
    const buf = await new Promise((res, rej) => { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
    const chans = []; for (let i = 0; i < buf.numberOfChannels; i++) chans.push(buf.getChannelData(i));
    return { chans, sr: buf.sampleRate, dur: buf.duration };
  }
  async function analyseBlob(blob) { const d = await decode(blob); return E.analyse(d.chans, d.sr); }
  function readout(a) {
    if (!a) return 'Not measured.';
    const p = a.pitchHz ? `Pitch ${E.noteName(a.pitchHz)} (${Math.round(a.pitchHz)} Hz)` : 'Pitch: not enough voice';
    return `${p} · range ${a.rangeSt != null ? a.rangeSt + ' st' : '-'} · ${a.spanSec} s to say it · ${Math.round(a.silencePct)}% pauses${a.brightHz ? ' · brightness ' + a.brightHz + ' Hz' : ''}`;
  }

  // ---------------------------------------------------------------- recording (mic, raw: no auto gain, no noise removal)
  function pickMime() { if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ''; return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m)) || ''; }
  async function startRec(kind) {
    if (S.rec) return;
    if (S.tune) stopTune();
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('This browser can\'t record. Use "Use a voice memo" instead.'); render(); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { toast('No microphone. Allow it in your browser settings, or use a voice memo.'); render(); return; }
    const m = pickMime(), mr = new MediaRecorder(stream, m ? { mimeType: m } : undefined), chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    let an = null; try { const c = ac(); if (c.state === 'suspended') await c.resume(); const src = c.createMediaStreamSource(stream); an = c.createAnalyser(); an.fftSize = 1024; src.connect(an); } catch (e) { }
    S.rec = { kind, mr, stream, an, chunks, t0: performance.now(), raf: 0 };
    mr.start(250);
    const buf = new Float32Array(1024);
    const tick = () => {
      if (!S.rec) return;
      const el = $('#recmeter i'), tt = $('#rectime'), t = (performance.now() - S.rec.t0) / 1000;
      if (an && el) { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; const db = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-9); el.style.width = Math.max(0, Math.min(100, (db + 60) * 1.8)) + '%'; el.style.background = db > -3 ? 'var(--bad)' : 'var(--good)'; }
      if (tt) tt.textContent = fmtT(t);
      if (t >= MAX_REC) { stopRec(); return; }
      S.rec.raf = requestAnimationFrame(tick);
    };
    render(); tick();
  }
  function stopRec() {
    const r = S.rec; if (!r) return; S.rec = null; cancelAnimationFrame(r.raf);
    return new Promise(res => {
      r.mr.onstop = async () => { r.stream.getTracks().forEach(t => t.stop()); const blob = new Blob(r.chunks, { type: r.mr.mimeType || 'audio/webm' }); await addTake(blob, r.kind); res(); };
      try { r.mr.stop(); } catch (e) { res(); }
    });
  }

  async function addTake(blob, kind, name) {
    const c = cur(); if (!c) return;
    let a = null;
    if (kind !== 'note') {
      S.busy = 'Listening to the take…'; render();
      try { a = await analyseBlob(blob); } catch (e) { S.busy = ''; render(); toast('Couldn\'t read the sound in that file. Try another format (m4a, mp3, wav).'); return; }
      S.busy = '';
      if (!a.pitchHz && a.speechSec < 0.5) toast('That take is nearly silent. It\'s kept, but there\'s nothing to measure.');
    }
    const t = { id: rid(), kind, at: now(), type: blob.type || typeOf(name || ''), size: blob.size, name: name || '', an: a };
    if (kind === 'return') { const ref = E.reference(c); t.refId = ref ? ref.id : null; S.lastReturn = t.id; S.bstepName = 'moved'; if (S.cold && S.visit && S.visit.id === c.id && !S.visit.coldDone) { t.cold = true; S.visit.coldDone = true; } }
    if (kind === 'lines') { t.linesKey = E.linesKey(S.lib.lines); t.lines = S.lib.lines; }
    try { await DB.putMedia(t.id, blob); } catch (e) { toast('Couldn\'t save the recording on this device. Save a pack now.'); }
    c.takes.push(t);
    S.urls[t.id] = URL.createObjectURL(blob);
    c.lastVisit = now(); touch(c); render();
    if (kind === 'return') { const r = $('#result'); if (r) r.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }
  async function addLook(blob, kind) {
    const c = cur(); if (!c) return;
    const l = { id: rid(), kind: kind || (/^video\//.test(blob.type) ? 'video' : 'photo'), at: now(), type: blob.type || 'image/png' };
    c.looks.push(l); S.urls[l.id] = URL.createObjectURL(blob);
    try { await DB.putMedia(l.id, blob); } catch (e) { }
    touch(c); render();
  }
  function delMedia(c, id) {
    c.takes = c.takes.filter(t => t.id !== id); c.looks = c.looks.filter(l => l.id !== id);
    if (c.refId === id) c.refId = null;
    DB.delMedia(id); if (S.urls[id]) URL.revokeObjectURL(S.urls[id]); delete S.urls[id];
  }

  // ---------------------------------------------------------------- render
  const ICON = {
    chars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.6 3.4-5.5 6.5-5.5s5.5 1.9 6.5 5.5"/><circle cx="17" cy="7" r="2.6"/><path d="M17.5 12.5c2.3.3 3.6 2 4.2 4.5"/></svg>',
    capture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/><path d="M12 8v4l3 2"/></svg>',
    voices: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>',
    pack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>'
  };
  const TABS = [['chars', 'BANK'], ['voices', 'VOICES'], ['pack', 'PACK']];
  const IN_CHAR = t => t === 'capture' || t === 'back';
  const CB_ICON = `<svg class="bico" viewBox="0 0 64 80" role="img" aria-label="A character card and its voice"><rect class="pg" x="2" y="2" width="60" height="76" rx="5"/><rect class="ph" x="8" y="8" width="48" height="40" rx="3"/><circle class="sil" cx="32" cy="24" r="8"/><path class="sil" d="M18 48c2-9 8-13 14-13s12 4 14 13z"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<rect class="wb" style="animation-delay:${(i * 0.11).toFixed(2)}s" x="${10 + i * 5}" y="58" width="3" height="16" rx="1"/>`).join('')}</svg>`;
  function render() {
    closeSheet(true);
    if (S.tune && S.tab !== 'back') stopTune();
    if (S.tab !== 'chars') hush();
    const c = cur(), inChar = IN_CHAR(S.tab) && c;
    const sub = S.tab === 'voices' ? 'Your voices, same lines' : S.tab === 'pack' ? 'Keep it safe' : 'The voice, the look, the line that drops you back in.';
    $('#app').innerHTML = `<div class="shell">
      <header class="top bhead"><div class="bwrap">${CB_ICON}<div class="btx"><div class="kicker" style="margin:0">ACT · CHARACTER BANK</div><h1>${S.tab === 'voices' ? 'Every voice, the same lines' : S.tab === 'pack' ? 'Your characters, in one file' : "Every character you've found, kept"}</h1><p>${esc(sub)}</p></div><img class="bsig" src="../img/sigil-film-180.png" alt="THEACTORPAGE" width="64" height="64"><button class="iconbtn" data-a="theme" aria-label="Light or dark">${ICON.theme}</button></div></header>
      <i class="hstk" aria-hidden="true"></i>
      ${inChar ? `<div class="cbar"><div class="cbwrap"><button class="btn ghost sm" data-a="tab" data-t="chars">‹ THE BANK</button><b id="cname">${esc(c.me ? 'You, as yourself' : (c.name || 'Unnamed character'))}${c.project ? ' <span class="faint">· ' + esc(c.project) + '</span>' : ''}</b>
        <span class="seg">${c.me ? '' : `<button class="${S.tab === 'capture' ? 'on' : ''}" data-a="tab" data-t="capture">KEEP</button><button class="${S.tab === 'back' ? 'on' : ''}" data-a="tab" data-t="back">COME BACK</button>`}</span></div></div>` : ''}
      <main id="main">${S.busy ? `<div class="msg" role="status">${esc(S.busy)}</div>` : ''}${({ chars: vChars, capture: vCapture, back: vBack, voices: vVoices, pack: vPack }[S.tab])()}</main>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="${S.tab === k || (k === 'chars' && IN_CHAR(S.tab)) ? 'on' : ''}" data-a="tab" data-t="${k}">${ICON[k]}<span>${l}</span></button>`).join('')}</nav></div>`;
    if (G) G.wire($('#main'));
    if (S.tab === 'back') { const r = $('#refaudio'); if (r) r.addEventListener('play', () => { const c2 = cur(); if (c2) { c2.lastVisit = now(); touch(c2); } }, { once: true }); }
    if (S.tab === 'chars') { fillWaves(); paintHear(); if ($('#example')) playExample(); }
  }
  const stateChip = c => { const s = E.autoState(c); return `<span class="state ${s}">${E.STATES[s]}</span>`; };
  function avatar(c) {
    const l = (c.looks || []).find(x => x.kind !== 'video' && url(x.id));
    return l ? `<img class="av" src="${url(l.id)}" alt="">` : `<span class="av">${esc((c.name || '?').trim().charAt(0).toUpperCase() || '?')}</span>`;
  }
  function recBlock(kind, label) {
    const on = S.rec && S.rec.kind === kind;
    return `<div class="rec"><button class="recbtn ${on ? 'on' : ''}" data-a="${on ? 'recstop' : 'recstart'}" data-k="${kind}" aria-label="${on ? 'Stop recording' : label}">${on ? '' : 'REC'}</button>
      <div style="flex:1;min-width:0">${on ? `<div class="meter" id="recmeter"><i></i></div><div class="row" style="justify-content:space-between;margin-top:4px"><span class="mono" id="rectime">0:00.0</span><span class="faint" style="font-size:13px">Tap again to stop</span></div>` : `<b>${esc(label)}</b>`}</div></div>`;
  }

  /* ---------- a take's shape, for the card: read once from the recording, kept with VO BOOTH's (localStorage theactorpage_wave_v1) ---------- */
  const WKEY = 'theactorpage_wave_v1', WV = window.Wave, WN = 40;
  const wcache = () => { try { return JSON.parse(localStorage.getItem(WKEY) || '{}') || {}; } catch (e) { return {}; } };
  const WAVING = new Set();
  async function waveOf(t) {
    if (!t || !WV) return null; const c = wcache(); if (c[t.id] && c[t.id].w) return c[t.id].w;
    if (WAVING.has(t.id)) return null; WAVING.add(t.id);
    try { const b = await DB.getMedia(t.id); if (!b) return null; const d = await decode(b); const ch = d.chans[0];
      const w = WV.peaks(ch, 56); const all = wcache(); all[t.id] = { w, t: [0, 1] }; const ks = Object.keys(all); if (ks.length > 300) delete all[ks[0]]; try { localStorage.setItem(WKEY, JSON.stringify(all)); } catch (e) { } return w; } catch (e) { return null; } finally { WAVING.delete(t.id); }
  }
  function waveSvg(w) { const n = WN, src = w && w.length ? w : null; let h = '';
    for (let i = 0; i < n; i++) { const v = src ? src[Math.floor(i * src.length / n)] / 100 : 0.15; const bh = Math.max(2, Math.round(v * 26)); h += `<rect data-i="${i}" x="${i * 5}" y="${(28 - bh) / 2}" width="3.2" height="${bh}" rx="1"/>`; }
    return `<svg class="cw${src ? '' : ' none'}" viewBox="0 0 ${n * 5} 28" preserveAspectRatio="none" aria-hidden="true">${h}</svg>`; }
  async function fillWaves() { for (const el of document.querySelectorAll('[data-cw]')) { const c = S.lib.chars.find(x => x.id === el.dataset.cw), r = c && E.reference(c); if (!r) continue; const w = await waveOf(r); if (w && el.isConnected) { el.innerHTML = waveSvg(w); paintHear(); } } }

  /* ---------- HEAR THEN: one tap on the card plays the take you go back to ---------- */
  const HEAR = { id: '', a: null };
  function hush() { if (HEAR.a) { try { HEAR.a.pause(); } catch (e) { } } HEAR.id = ''; HEAR.a = null; }
  function hear(id) {
    const c = S.lib.chars.find(x => x.id === id), r = c && E.reference(c); if (!r || !url(r.id)) { toast('No recording to play yet.'); return; }
    if (HEAR.id === id) { hush(); paintHear(); return; }
    hush(); const a = new Audio(url(r.id)); HEAR.id = id; HEAR.a = a;
    a.ontimeupdate = paintHear; a.onended = () => { hush(); paintHear(); };
    a.play().catch(() => { hush(); paintHear(); toast('This browser would not play it.'); });
    c.lastVisit = c.lastVisit || now(); paintHear();
  }
  function paintHear() {
    document.querySelectorAll('[data-hear]').forEach(b => { const on = HEAR.id === b.dataset.hear; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); const w = b.querySelector('span'); if (w) w.textContent = on ? 'PLAYING' : 'HEAR THEN'; });
    document.querySelectorAll('[data-cw]').forEach(el => { const on = HEAR.id === el.dataset.cw && HEAR.a && HEAR.a.duration; const k = on ? HEAR.a.currentTime / HEAR.a.duration * WN : -1; el.querySelectorAll('rect').forEach(r => r.classList.toggle('on', +r.dataset.i <= k)); });
  }

  // ---------------------------------------------------------------- THE BANK
  function lookOf(c) { return (c.looks || []).find(x => x.kind !== 'video' && url(x.id)) || null; }
  function lookBox(c, big) {
    const l = lookOf(c), v = !l && (c.looks || []).find(x => x.kind === 'video' && url(x.id));
    if (l) return `<span class="lk2"><img class="lbg" src="${url(l.id)}" alt=""><img class="lfg" src="${url(l.id)}" alt="${esc((c.name || 'Character') + ': the look')}"></span>`;
    if (v) return `<span class="lk2"><video class="lfg" src="${url(v.id)}" muted playsinline preload="metadata"></video></span>`;
    return `<span class="lk2 nolook"><svg viewBox="0 0 120 150" aria-hidden="true"><circle cx="60" cy="52" r="28"/><path d="M10 150c6-38 26-56 50-56s44 18 50 56z"/></svg>${big ? '' : '<small>NO LOOK YET</small>'}</span>`;
  }
  function charCard(c) {
    const r = E.reference(c), st = E.autoState(c), name = c.me ? 'You, as yourself' : (c.name || 'Unnamed character');
    return `<div class="ccard${c.strained ? ' strained' : ''}"><div class="clook">${lookBox(c)}
        ${r ? `<button type="button" class="hear" data-a="hear" data-hear="${c.id}" aria-pressed="false" aria-label="Hear ${esc(name)}: the take you go back to"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>HEAR THEN</span></button>` : ''}</div>
      <div class="cbody"><div class="row" style="justify-content:space-between;gap:6px;align-items:baseline;flex-wrap:nowrap"><button class="cname" data-a="open" data-id="${c.id}">${esc(name)}</button>${c.strained ? '<span class="state strained">Strained</span>' : `<span class="state ${st}">${E.STATES[st]}</span>`}</div>
        <span class="faint" style="font-size:12.5px">${esc(c.project || (c.me ? 'Every voice is measured against you' : 'No project'))} · ${esc(ago(c.lastVisit || c.updated))}</span>
        ${c.anchorLine ? `<span class="cline">"${esc(c.anchorLine)}"</span>` : ''}
        ${r ? `<span class="cwave" data-cw="${c.id}">${waveSvg(null)}</span><span class="faint" style="font-size:12px">${esc(r.an && r.an.pitchHz ? E.noteName(r.an.pitchHz) + ' · ' + Math.round(r.an.pitchHz) + ' Hz' : 'Recorded')} · ${esc(ago(r.at))}</span>` : `<span class="faint" style="font-size:12.5px">No voice recorded yet.</span>`}
        <div class="row" style="gap:6px;margin-top:4px">${r && !c.me ? `<button class="btn sm pri" data-a="comeback" data-id="${c.id}" style="flex:1">COME BACK</button>` : ''}<button class="btn sm${r && !c.me ? ' ghost' : ''}" data-a="open" data-id="${c.id}" style="flex:1">${c.me ? 'OPEN' : 'KEEP'}</button></div></div></div>`;
  }
  function startRow() {
    const bdNew = S.bd.filter(r => !S.lib.chars.some(c => c.bd && c.bd.pid === r.pid && c.bd.role === r.role));
    return `<div class="row starts"><button class="btn pri" data-a="quickrec"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>RECORD A VOICE</button><button class="btn" data-a="quickmemo">FROM A VOICE MEMO</button><button class="btn" data-a="newchar">START WITH A NAME</button></div>
      ${bdNew.length ? `<div class="kicker" style="margin-top:12px">From your sides</div><div class="row">${bdNew.map(r => `<button class="chip" data-a="frombd" data-pid="${esc(r.pid)}" data-role="${esc(r.role)}">${esc(r.role)} · ${esc(r.title)}</button>`).join('')}</div>` : ''}`;
  }
  function exampleHtml() {
    return `<div class="work" id="example"><div class="exhead"><span class="kicker" style="color:var(--tung-text);margin:0">EXAMPLE · HOW IT WORKS</span><span class="dim" id="excap" style="font-size:13.5px">Old Sam, a made-up character</span></div>
      <div class="exsteps">
        <div class="exs" data-ex="0"><b>1 THE VOICE</b><span>Record it the day you find it. Raw mic, as the character.</span><svg viewBox="0 0 160 40" preserveAspectRatio="none" aria-hidden="true"><path class="exw" d="M4 30v-20M12 30v-12M20 30v-24M28 30v-16M36 30v-26M44 30v-10M52 30v-18M60 30v-22M68 30v-8M76 30v-20M84 30v-14M92 30v-24M100 30v-10M108 30v-18M116 30v-6M124 30v-16M132 30v-12M140 30v-20M148 30v-8"/></svg><span class="mono" style="font-size:12px;color:var(--ink)">G2 · low, slow, long pauses</span></div>
        <div class="exs" data-ex="1"><b>2 THE LOOK</b><span>A selfie in costume, a picture you found, a render, a sketch.</span><span class="exlook">THE LOOK</span></div>
        <div class="exs" data-ex="2"><b>3 THE LINE</b><span>The one that drops you back in.</span><span class="mono" style="font-weight:700;font-size:15px;color:var(--ink)">"Get off my land."</span></div>
        <div class="exs" data-ex="3"><b>4 WEEKS LATER</b><span>The callback. Hear then, say the line, record now. See what moved.</span><svg viewBox="0 0 160 40" preserveAspectRatio="none" aria-hidden="true"><path d="M10 32C30 10 50 30 70 14S110 26 150 12" fill="none" stroke="var(--c-then)" stroke-width="3"/><path d="M10 30C30 14 50 28 70 18S110 22 150 16" fill="none" stroke="var(--c-now)" stroke-width="3" stroke-dasharray="5 4"/></svg><span class="mono" style="font-size:12px;color:var(--ink)">then · now · back in 2:14</span></div>
      </div>
      ${startRow()}
      <p class="faint" style="font-size:12.5px;margin:10px 0 0">The example plays when the bank is empty. Your first character takes its place.</p></div>`;
  }
  let EXT = null;
  function playExample() { clearInterval(EXT); let i = 0; const paint = () => { const b = $('#example'); if (!b) { clearInterval(EXT); return; } b.querySelectorAll('[data-ex]').forEach(e => e.classList.toggle('on', +e.dataset.ex === i % 4)); i++; };
    paint(); if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) EXT = setInterval(paint, 2200); }
  function vChars() {
    const L = S.lib;
    if (!L.chars.length) return exampleHtml();
    const projs = [...new Set(L.chars.filter(c => !c.me).map(c => (c.project || '').trim()).filter(Boolean))].sort();
    if (S.proj && !projs.includes(S.proj)) S.proj = '';
    const list = L.chars.filter(c => !S.proj || c.project === S.proj || c.me).slice().sort((a, b) => (a.me - b.me) || (b.updated || '').localeCompare(a.updated || ''));
    const n = L.chars.filter(c => !c.me).length;
    return `<div class="row bankbar"><span class="kicker" style="margin:0 4px 0 0">${n} ${n === 1 ? 'character' : 'characters'}</span>
        ${projs.length > 1 ? `<button class="chip${S.proj ? '' : ' on'}" data-a="proj" data-p="">All</button>` + projs.map(p => `<button class="chip${S.proj === p ? ' on' : ''}" data-a="proj" data-p="${esc(p)}">${esc(p)}</button>`).join('') : ''}
        <button class="btn addc${S.newOpen ? ' on' : ''}" data-a="newopen" aria-expanded="${!!S.newOpen}">+ NEW CHARACTER</button></div>
      ${S.newOpen ? `<div class="hpanel">${startRow()}</div>` : ''}
      <div class="bank">${list.map(charCard).join('')}</div>
      <p class="faint" style="font-size:12.5px;margin:14px 0 0">KEEP holds everything for a character: takes, looks, notes, the body and the choices. COME BACK walks you back in. VO BOOTH reads every voice here, to pin one to a job or put it on your page.</p>`;
  }
  function needChar(what) { return `<div class="msg" style="margin-top:12px">Pick a character first.</div><button class="btn pri block" data-a="tab" data-t="chars" style="margin-top:10px">THE BANK</button>${what ? '' : ''}`; }

  // ---------------------------------------------------------------- CAPTURE
  function vCapture() {
    const c = cur(); if (!c) return needChar();
    const voices = c.takes.filter(t => t.kind === 'voice'), notes = c.takes.filter(t => t.kind === 'note'), h = E.have(c), ref = E.reference(c);
    const st = E.autoState(c);
    return `<div class="grid2" style="margin:8px 0 4px"><div><label class="lab" for="c_name">Character</label><input class="field" id="c_name" data-c="name" value="${esc(c.name)}" placeholder="Name"></div><div><label class="lab" for="c_proj">Project</label><input class="field" id="c_proj" data-c="project" value="${esc(c.project)}" placeholder="Show, film, class"></div></div>
      ${c.bd ? `<p class="faint" style="font-size:13px;margin:4px 0 0">Linked to BREAKDOWN: ${esc(c.bd.role)} in ${esc(c.bd.title)}. Open BREAKDOWN to pick the line.</p>` : ''}
      <div class="row" id="statebox" style="margin:10px 0 14px">${stateChip(c)}<button class="chip ${st === 'resting' ? 'on' : ''}" data-a="setstate" data-v="resting">Resting</button><button class="chip ${st === 'inuse' ? 'on' : ''}" data-a="setstate" data-v="inuse">Back in use</button></div>

      <section class="step"><h3><span class="n">1</span>The voice${h.voice ? '<span class="ok">kept</span>' : ''}</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">Say the lines as the character. Raw mic, no clean-up, so it sounds like the room.</p>
        ${recBlock('voice', voices.length ? 'Record another take' : 'Record the voice')}
        <div class="row" style="margin-top:10px"><button class="btn" data-a="memo" data-k="voice">Use a voice memo</button></div>
        ${voices.map(t => takeRow(c, t, ref)).join('')}
        <div class="sameln"><div class="kicker" style="margin-top:14px">Same lines as your other voices</div>
          <p class="dim" style="font-size:14px;margin:0 0 8px">Every voice reads these, so VOICES can line them up. Change the lines in VOICES.</p>
          <div class="lines mono">${esc(S.lib.lines)}</div>
          ${recBlock('lines', 'Read the same lines')}
          <div class="row" style="margin-top:10px"><button class="btn" data-a="memo" data-k="lines">Use a voice memo</button></div>
          ${c.takes.filter(t => t.kind === 'lines').slice().reverse().map(t => linesRow(t)).join('')}
        </div>
      </section>

      <details class="step fold" data-fold="2"${S.fold[2] ? ' open' : ''}><summary><h3><span class="n">2</span>The look${h.look ? '<span class="ok">kept</span>' : ''}</h3></summary>
        <p class="dim" style="font-size:14px;margin:0 0 10px">A photo in costume, a mirror selfie, a sketch. Whatever puts you back in the body.</p>
        <div class="row"><button class="btn" data-a="camera">Take a photo</button><button class="btn" data-a="photo">Add photo or video</button><button class="btn" data-a="sketch">Sketch</button></div>
        ${c.looks.length ? `<div class="looks">${c.looks.map(l => `<div class="lk">${l.kind === 'video' ? `<video src="${url(l.id)}" playsinline controls></video>` : `<img src="${url(l.id)}" alt="Look">`}<button class="iconbtn" data-a="dellook" data-id="${l.id}" aria-label="Remove">${ICON.close}</button></div>`).join('')}</div>` : ''}
      </details>

      <details class="step fold" data-fold="3"${S.fold[3] ? ' open' : ''}><summary><h3><span class="n">3</span>The line that drops you in${h.line ? '<span class="ok">kept</span>' : ''}</h3></summary>
        <p class="dim" style="font-size:14px;margin:0 0 8px">One line. When you say it, you're them.</p>
        <textarea class="field" id="c_line" data-c="anchorLine" rows="2" style="font-family:var(--mono)" placeholder="Insurance. You think I need you?">${esc(c.anchorLine)}</textarea>
      </details>

      <details class="step fold" data-fold="4"${S.fold[4] ? ' open' : ''}><summary><h3><span class="n">4</span>What you found${h.note ? '<span class="ok">kept</span>' : ''}</h3></summary>
        <p class="dim" style="font-size:14px;margin:0 0 8px">Out of character. Where the voice sits, how they walk, what they want. Talk it or type it.</p>
        ${recBlock('note', 'Talk it')}
        ${notes.map(t => `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio><div class="row" style="justify-content:space-between"><span class="rd">Note · ${esc(ago(t.at))}</span><button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></div></div>`).join('')}
        <textarea class="field" id="c_notes" data-c="notes" rows="3" style="margin-top:10px" placeholder="Low in the chest. Never looks at the person he's threatening.">${esc(c.notes)}</textarea>
      </details>
      <details class="step fold" data-fold="5"${S.fold[5] ? ' open' : ''}><summary><h3><span class="n">5</span>Your voice, kept safe${c.strained ? '<span class="state strained">Strained</span>' : ''}</h3></summary>
        <p class="dim" style="font-size:14px;margin:0 0 8px">So the voice stays the same and your throat stays whole.</p>
        <label class="lab" for="c_never">What never changes</label><textarea class="field" id="c_never" data-c="never" rows="2" placeholder="The gravel on the first word. Always a beat before he answers.">${esc(c.never || '')}</textarea>
        <label class="lab" for="c_vary" style="margin-top:8px">What can vary</label><textarea class="field" id="c_vary" data-c="vary" rows="2" placeholder="Speed. How loud he gets.">${esc(c.vary || '')}</textarea>
        <label class="lab" for="c_strain" style="margin-top:8px">What strained your voice</label><textarea class="field" id="c_strain" data-c="strain" rows="2" placeholder="Holding the growl past ten seconds.">${esc(c.strain || '')}</textarea>
        <label class="row" style="margin-top:10px;gap:10px"><input type="checkbox" data-cb="strained"${c.strained ? ' checked' : ''} style="width:22px;height:22px"><span>This voice hurt. Flag it.</span></label>
        ${c.strained ? '<div class="msg bad" style="margin-top:8px">Stop if it hurts. No character is worth your voice. Rest it, then find a way in that doesn\'t hurt.</div>' : ''}
      </details>
      <details class="step fold" data-fold="6"${S.fold[6] ? ' open' : ''}><summary><h3><span class="n">6</span>The body and the choices${E.body(c).length ? '<span class="ok">kept</span>' : ''}</h3></summary>
        <p class="dim" style="font-size:14px;margin:0 0 8px">If it helps. Any of these, none of them.</p>
        <div class="grid2">${[['posture', 'Posture', 'Squared up, heavy'], ['weight', 'Weight', 'Planted, in the heels'], ['eyes', 'Eyes', 'Flat. Doesn\'t blink first'], ['hands', 'Hands', 'Still. In his pockets']].map(([k, l, ph]) => `<div><label class="lab" for="c_${k}">${l}</label><input class="field" id="c_${k}" data-c="${k}" value="${esc(c[k] || '')}" placeholder="${ph}"></div>`).join('')}</div>
        <label class="lab" for="c_trigger" style="margin-top:8px">What sets them off</label><textarea class="field" id="c_trigger" data-c="trigger" rows="2" placeholder="When someone looks away while he's talking.">${esc(c.trigger || '')}</textarea>
        <label class="lab" for="c_plays" style="margin-top:8px">What they play</label><textarea class="field" id="c_plays" data-c="plays" rows="2" placeholder="Make them flinch first.">${esc(c.plays || '')}</textarea>
        <label class="lab" for="c_neverDo" style="margin-top:8px">What they never do</label><textarea class="field" id="c_neverDo" data-c="neverDo" rows="2" placeholder="Raise his voice. Plead.">${esc(c.neverDo || '')}</textarea>
      </details>
      ${E.autoState(c) !== 'found' ? `<button class="btn pri block" data-a="tab" data-t="back">Come back to ${esc(c.name || 'them')} later</button>` : ''}`;
  }
  function takeRow(c, t, ref) {
    const isRef = ref && ref.id === t.id;
    return `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio>
      <div class="rd">${esc(readout(t.an))}</div>
      <div class="row" style="justify-content:space-between;margin-top:4px"><span class="faint" style="font-size:13px">${t.kind === 'return' ? 'Come-back take' : 'Take'} · ${esc(ago(t.at))}${t.name ? ' · ' + esc(t.name) : ''}</span>
      <span class="row" style="gap:4px">${isRef ? '<span class="state inuse">Reference</span>' : `<button class="btn ghost" data-a="setref" data-id="${t.id}" style="min-height:36px">Make reference</button>`}<button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></span></div></div>`;
  }

  function linesRow(t) {
    const old = t.linesKey !== E.linesKey(S.lib.lines);
    return `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio><div class="rd">${esc(readout(t.an))}</div>
      <div class="row" style="justify-content:space-between;margin-top:4px"><span class="faint" style="font-size:13px">Same lines · ${esc(ago(t.at))}${old ? ' · on older lines, not compared' : ''}</span><button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></div></div>`;
  }

  // ---------------------------------------------------------------- VOICES: every voice, same lines, side by side
  function vVoices() {
    const L = S.lib, key = E.linesKey(L.lines), me = L.chars.find(x => x.me), meT = me ? E.linesTake(me, key) : null;
    const others = L.chars.filter(x => !x.me);
    const rows = others.map(c => ({ c, t: E.linesTake(c, key) }));
    const old = L.chars.some(c => c.takes.some(t => t.kind === 'lines' && t.linesKey !== key));
    const pairs = E.closePairs(rows.filter(r => r.t).map(r => ({ id: r.c.id, name: r.c.name || 'Unnamed character', an: r.t.an, tid: r.t.id })));
    const strained = L.chars.filter(c => c.strained);
    const recHere = c => S.rec && S.rec.kind === 'lines' && S.lib.cur === c.id;
    const recBtns = (c, t) => recHere(c) ? recBlock('lines', '') : `<div class="row" style="margin-top:8px"><button class="btn ${t ? '' : 'pri'}" data-a="linesrec" data-id="${c.id}">${t ? 'Read them again' : 'Read the lines'}</button><button class="btn ghost" data-a="linesmemo" data-id="${c.id}">Voice memo</button></div>`;
    const card = (c, t, label) => `<div class="vcard" data-vid="${c.id}"><div class="row" style="gap:10px;align-items:center">${avatar(c)}<div style="flex:1;min-width:0"><b>${esc(label)}</b>${c.strained ? ' <span class="state strained">Strained</span>' : ''}<div class="rd">${t ? esc(readout(t.an)) : 'No take on these lines yet.'}</div>${t && meT && !c.me ? `<div class="vsme">Against you: ${esc(E.vsMe(meT.an, t.an).join(', ') || 'not enough sound to compare')}</div>` : ''}</div></div>
      ${t ? `<audio src="${url(t.id)}" controls preload="metadata" style="width:100%;margin-top:8px"></audio>` : ''}${recBtns(c, t)}</div>`;
    return `<p class="dim" style="margin:8px 0 12px">Every voice reads the same lines. Then the numbers line up: pitch, range, how long it takes, pauses. You hear which voice is which. This only measures.</p>
      ${strained.length ? `<div class="msg bad" style="margin-bottom:12px">Strained your voice: ${esc(strained.map(c => c.me ? 'you' : (c.name || 'Unnamed character')).join(', '))}. Stop if it hurts.</div>` : ''}
      <section class="step"><h3>The lines</h3>
        <textarea class="field mono" id="v_lines" data-lib="lines" rows="5">${esc(L.lines)}</textarea>
        ${old ? '<p class="faint" style="font-size:13px;margin:6px 0 0">Some takes were read on other lines. They stay kept; only takes on these lines are lined up here.</p>' : ''}
        ${L.lines !== E.DEFAULT_LINES ? '<button class="btn ghost" data-a="linesreset" style="margin-top:6px">Use the starter lines</button>' : ''}
      </section>
      ${mapBlock(meT, rows, pairs)}
      <div class="kicker" style="margin-top:14px">You, as yourself</div>
      ${me ? card(me, meT, 'You, as yourself') : `<div class="vcard"><p class="dim" style="margin:0 0 8px;font-size:14px">Read the lines as yourself first. Every voice is measured against you.</p><button class="btn pri" data-a="makeme">Read them as yourself</button></div>`}
      <div class="kicker" style="margin-top:14px">${others.length ? others.length + (others.length === 1 ? ' voice' : ' voices') : 'Your voices'}</div>
      ${others.length ? rows.map(r => card(r.c, r.t, r.c.name || 'Unnamed character')).join('') : '<div class="msg">No characters yet. Make one in CHARACTERS, then read the lines here.</div>'}
      ${pairs.length ? `<section class="step" style="margin-top:14px"><h3>Measure close</h3><p class="faint" style="font-size:13px;margin:0 0 8px">Within 1.5 semitones, 10% in time and 15% in brightness on the same lines. Close numbers don't mean they sound alike. Listen to both.</p>
        ${pairs.map(p => `<div class="pair"><b>${esc(p.a.name)} and ${esc(p.b.name)}</b>: ${p.st} semitones apart, ${p.time}% apart in time.<div class="vs"><audio src="${url(p.a.tid)}" controls preload="metadata"></audio><audio src="${url(p.b.tid)}" controls preload="metadata"></audio></div></div>`).join('')}</section>` : ''}`;
  }

 function mapBlock(meT, rows, pairs) {
    if (!G) return '';
    rows.forEach(r => lineFor(r.c, r.t)); if (meT) lineFor(S.lib.chars.find(x => x.me), meT);
    const R = rows.filter(r => r.t && r.t.an).map(r => ({ id: r.c.id, name: r.c.name || 'Unnamed character', an: r.t.an }));
    if (!R.length) return '';
    if (!meT || !meT.an || !meT.an.pitchHz) return '<section class="step"><h3>On one map</h3><p class="faint" style="font-size:13px;margin:0">Read the lines as yourself and your voices go on one map, measured from you.</p></section>';
    const svg = G.map(meT.an, R, pairs);
    return svg ? `<section class="step"><h3>On one map</h3><div class="cgwrap">${svg}</div><p class="faint" style="font-size:13px;margin:6px 0 0">You in the middle. Across: pitch against yours. Up: faster on the same lines; down: slower. The line through a voice is its range. A thin line joins two voices that measure close. Tap a dot for its numbers.</p></section>` : '';
  }
  // ---------------------------------------------------------------- COME BACK
  function vBack() {
    const c = cur(); if (!c) return needChar();
    const ref = E.reference(c), look = c.looks.find(l => l.kind !== 'video') || c.looks[0];
    if (!ref) return `<div class="msg" style="margin-top:12px">Nothing to come back to yet. Record the voice first.</div><button class="btn pri block" data-a="tab" data-t="capture" style="margin-top:10px">Capture</button>`;
    const rets = c.takes.filter(t => t.kind === 'return').sort((a, b) => b.at.localeCompare(a.at));
    const last = rets.find(t => t.id === S.lastReturn) || null;
    if (!S.visit || S.visit.id !== c.id) S.visit = { id: c.id, t0: Date.now(), coldDone: false, done: null };
    const V = S.visit, cold = S.cold && !V.coldDone, backs = E.backWords(c.backs);
    const head = `<p class="dim" style="margin:8px 0 10px">Last time with ${esc(c.name || 'this character')}: ${esc(ago(c.lastVisit || c.updated))}.${cold ? '' : ' Take it in order.'}</p>
      <div class="row" style="margin:0 0 10px"><button class="btn${S.cold ? '' : ' pri'}" data-a="cold" data-v="0" aria-pressed="${!S.cold}">With your notes</button><button class="btn${S.cold ? ' pri' : ''}" data-a="cold" data-v="1" aria-pressed="${S.cold}">Cold first</button></div>
      <div class="msg" id="clockbox" style="margin:0 0 12px">${V.done != null ? `Back in ${esc(E.clock(V.done))}.` : `On the clock: <b class="mono" id="backclock">${esc(E.clock((Date.now() - V.t0) / 1000))}</b> <button class="btn" data-a="itsback" style="margin-left:8px;min-height:36px">It's back</button>`}</div>`;
    if (cold) return head + `<section class="step"><h3><span class="n">1</span>Cold</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">Your notes, the look and the old take stay hidden until you've recorded. Nothing to copy, so you hear what stuck.</p>
        ${c.anchorLine ? `<div class="big" style="margin-bottom:10px">${esc(c.anchorLine)}</div>` : ''}
        ${recBlock('return', 'Record it cold')}
        <div class="row" style="margin-top:10px"><button class="btn" data-a="memo" data-k="return">Use a voice memo</button></div>
      </section>`;
    const bd = E.body(c), steps = [];
    if (look || bd.length) steps.push(['look', 'LOOK']);
    steps.push(['listen', 'LISTEN']);
    if (ref.an && ref.an.pitchHz) steps.push(['pitch', 'PITCH']);
    if (c.anchorLine) steps.push(['line', 'THE LINE']);
    steps.push(['record', 'RECORD']);
    if (rets.length) steps.push(['moved', 'WHAT MOVED']);
    if (S.bstepName) { const i = steps.findIndex(x => x[0] === S.bstepName); if (i >= 0) S.bstep = i; S.bstepName = ''; }
    S.bstep = Math.max(0, Math.min(steps.length - 1, S.bstep || 0));
    const k = steps[S.bstep][0], shown = last || rets[0] || null;
    const body = {
      look: `<div class="kicker">${S.bstep + 1} · The look</div><h2 class="bh">Put the body back on.</h2>${look ? `<div class="blook phonly">${look.kind === 'video' ? `<video class="hero-look" src="${url(look.id)}" playsinline controls></video>` : `<img class="hero-look" src="${url(look.id)}" alt="Your look">`}</div>` : ''}${bd.length ? `<div class="bbody">${bd.map(b => `<div><span class="faint" style="font-size:13px">${esc(b.label)}</span><div>${esc(b.text)}</div></div>`).join('')}</div>` : ''}`,
      listen: `<div class="kicker">${S.bstep + 1} · Listen to then</div><h2 class="bh">Hear yourself as ${esc(c.name || 'them')}.</h2>
        <audio id="refaudio" src="${url(ref.id)}" controls preload="auto" style="width:100%"></audio>
        <div class="rd mono faint" style="font-size:13px;margin-top:4px">${esc(readout(ref.an))} · recorded ${esc(ago(ref.at))}</div>
        ${c.notes ? `<p style="margin:10px 0 0;font-size:15px">${esc(c.notes)}</p>` : ''}
        ${c.takes.filter(t => t.kind === 'note').slice(-1).map(t => `<div style="margin-top:8px"><span class="faint" style="font-size:13px">Your note</span><audio src="${url(t.id)}" controls preload="metadata" style="width:100%;height:40px"></audio></div>`).join('')}`,
      pitch: `<div class="kicker">${S.bstep + 1} · Find the pitch</div>${tuneBlock(ref)}`,
      line: `<div class="kicker">${S.bstep + 1} · Say the line</div><h2 class="bh">The one that drops you in.</h2><div class="big">${esc(c.anchorLine)}</div>`,
      record: `<div class="kicker">${S.bstep + 1} · Record now</div><h2 class="bh">Same lines as then.</h2><p class="dim" style="font-size:14px;margin:0 0 10px">Same lines as the reference, so the time and pauses mean something.</p>
        ${recBlock('return', 'Record it now')}<div class="row" style="margin-top:10px"><button class="btn" data-a="memo" data-k="return">Use a voice memo</button></div>`,
      moved: `<div class="kicker">${S.bstep + 1} · What moved</div>${shown ? resultBlock(c, shown) : ''}
        ${rets.filter(t => t !== shown).length ? `<div class="kicker" style="margin-top:16px">Earlier come-backs</div>${rets.filter(t => t !== shown).map(t => { const r0 = take(c, t.refId) || ref; return `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio><div class="rd">${esc(ago(t.at))}${t.cold ? ' · cold' : ''} · ${esc(E.compare(r0.an, t.an).say.join(' '))}</div><div class="row" style="justify-content:flex-end;gap:4px">${ref.id === t.id ? '<span class="state inuse">Reference</span>' : `<button class="btn ghost" data-a="setref" data-id="${t.id}" style="min-height:36px">Make reference</button>`}<button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></div></div>`; }).join('')}` : ''}
        ${histBlock(ref, rets)}
        ${backs.length ? `<div class="kicker" style="margin-top:16px">How long it took to get back</div><ul class="said">${backs.slice(0, 8).map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}`
    }[k];
    return head + `<div class="backgrid"><aside class="baside">${lookBox(c, true)}${c.anchorLine ? `<div class="bline">"${esc(c.anchorLine)}"</div>` : ''}</aside>
      <div class="bmain"><div class="bdots" role="tablist">${steps.map((x, i) => `<button type="button" role="tab" aria-selected="${i === S.bstep}" class="bdot${i === S.bstep ? ' on' : i < S.bstep ? ' done' : ''}" data-a="bstep" data-s="${i}"><i>${i < S.bstep ? '✓' : i + 1}</i>${x[1]}</button>`).join('')}</div>
        <div class="bstepcard" id="bstep" data-step="${k}">${body}</div>
        <div class="row bnav"><button class="btn" data-a="bstep" data-s="${S.bstep - 1}"${S.bstep ? '' : ' disabled'}>BACK</button>${S.bstep < steps.length - 1 ? `<button class="btn pri" data-a="bstep" data-s="${S.bstep + 1}">NEXT: ${steps[S.bstep + 1][1]}</button>` : ''}</div></div></div>`;
  }
  /* takes from before the graphs have no pitch line: read it once from the saved sound */
  const LINING = new Set();
  function lineFor(c, t) {
    if (!t || !t.an || (t.an.contour && t.an.brightHz !== undefined) || LINING.has(t.id)) return;   // before the graphs: no pitch line; before VOCA's measures: no brightness, clarity, steadiness
    LINING.add(t.id);
    DB.getMedia(t.id).then(b => b ? analyseBlob(b) : null).then(a => { if (!a) return; t.an.contour = a.contour; t.an.brightHz = a.brightHz; t.an.clarityDb = a.clarityDb; t.an.wobbleDb = a.wobbleDb; touch(c); render(); }).catch(() => {});
  }
  function contourBlock(c, r0, t) {
    if (!G) return '';
    lineFor(c, r0); lineFor(c, t);
    const svg = G.contour(r0.an, t.an);
    return svg ? `<div class="cgwrap" style="margin-top:10px">${svg}</div><p class="faint" style="font-size:13px;margin:4px 0 0"><span class="key then"></span>then <span class="key now"></span>now. Pitch through the take, on the same clock from the first sound. Move along it to read both.</p>` : (r0.an.pitchHz && t.an.pitchHz ? '<p class="faint" style="font-size:13px">Reading the pitch line…</p>' : '');
  }
  function histBlock(ref, rets) {
    if (!G || rets.length < 2) return '';
    const day = (t, short) => { const d = new Date(t.at); return short ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); };
    const svg = G.history(ref, rets.slice().reverse(), day);
    return svg ? `<div class="kicker" style="margin-top:16px">Every time you came back</div><div class="cgwrap">${svg}</div><p class="faint" style="font-size:13px;margin:4px 0 0">The band is the reference take's range${ref.an && ref.an.pitchLoHz ? ' (' + Math.round(ref.an.pitchLoHz) + '–' + Math.round(ref.an.pitchHiHz) + ' Hz)' : ''}, the line its middle${ref.an && ref.an.pitchHz ? ' (' + Math.round(ref.an.pitchHz) + ' Hz)' : ''}. Each bar is a come-back: its range, the dot its middle. Tap one for its numbers.</p>` : '';
  }
  /* FIND THE PITCH: hold a note in the voice; see how far it is from the reference take's middle. Listens, never records. */
  function tuneBlock(ref) {
    const a = ref && ref.an; if (!a || !a.pitchHz) return '';
    const on = !!S.tune;
    return `<section class="step" id="tune"><h3>Find the pitch</h3>
      <p class="dim" style="font-size:14px;margin:0 0 10px">Hold a note in the voice. The middle of the reference take is <b>${Math.round(a.pitchHz)} Hz (${E.noteName(a.pitchHz)})</b>${a.pitchLoHz ? `, its range ${Math.round(a.pitchLoHz)} to ${Math.round(a.pitchHiHz)} Hz` : ''}. This shows how far you are. It listens; it doesn't record.</p>
      ${on ? `<div class="tunelive"><div class="sensor"><span class="dot"></span>MIC ON, NOT RECORDING<button class="btn ghost" data-a="tunestop" style="margin-left:auto">STOP</button></div>
        <div class="tmeter" aria-hidden="true"><span class="tband" id="tband"></span><span class="tzone"></span><span class="tmid"></span><span class="tneedle" id="tneedle"></span></div>
        <div class="tscale"><span>3 semitones low</span><span>on it</span><span>3 high</span></div>
        <div class="big" id="tword" role="status" aria-live="polite">Listening…</div><div class="rd mono faint" id="thz">&nbsp;</div><div class="rd faint" id="thold">&nbsp;</div>
        <svg class="cg" id="ttrace" viewBox="0 0 320 90" preserveAspectRatio="none" aria-hidden="true"><line class="grid" x1="0" y1="45" x2="320" y2="45"/><rect class="tbandr" x="0" y="37.5" width="320" height="15"/><path class="line now" id="tpath" d=""/></svg>
        <p class="faint" style="font-size:13px;margin:4px 0 0">The last six seconds. The middle line is the reference take's middle; the band is 50 cents either side.</p></div>`
      : `<button class="btn pri" data-a="tune">Start listening</button>`}
    </section>`;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.tune) { stopTune(); render(); } });
  function stopTune() { const T = S.tune; if (!T) return; S.tune = null; cancelAnimationFrame(T.raf); try { T.src && T.src.disconnect(); } catch (e) { } T.stream.getTracks().forEach(t => t.stop()); }
  async function startTune() {
    const c = cur(), ref = c && E.reference(c), a = ref && ref.an; if (!a || !a.pitchHz) return;
    if (S.rec) await stopRec();
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { toast('No microphone. Allow it in your browser settings.'); return; }
    const ctx = ac(); if (ctx.state === 'suspended') await ctx.resume();
    const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 4096; src.connect(an);
    S.tune = { stream, src, an, ref: a.pitchHz, lo: a.pitchLoHz, hi: a.pitchHiHz, trace: [], h: null, last: performance.now(), raf: 0, recent: [] };
    render();
    const buf = new Float32Array(an.fftSize), sr = ctx.sampleRate;
    const X = t => 320 - (performance.now() - t) / 6000 * 320, Yc = cc => 45 - Math.max(-300, Math.min(300, cc)) / 300 * 45;
    const band = () => { const b = $('#tband'); if (!b || !S.tune) return; const lo = S.tune.lo ? E.cents(S.tune.lo, S.tune.ref) : null, hi = S.tune.hi ? E.cents(S.tune.hi, S.tune.ref) : null; if (lo == null) { b.style.display = 'none'; return; } const L = v => (Math.max(-300, Math.min(300, v)) + 300) / 6; b.style.left = L(lo) + '%'; b.style.width = (L(hi) - L(lo)) + '%'; };
    band();
    const tick = () => {
      const T = S.tune; if (!T) return; const now = performance.now(), dt = (now - T.last) / 1000; T.last = now; band();
      if (T.stream.getTracks().every(t => t.readyState === 'ended')) { stopTune(); render(); return; }
      an.getFloatTimeDomainData(buf); let e = 0; for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
      let hz = 0; if (Math.sqrt(e / buf.length) > 0.006) hz = E.yin(buf, sr, 60, 500);
      T.recent.push(hz > 60 && hz < 500 ? hz : 0); if (T.recent.length > 5) T.recent.shift();
      const ok = T.recent.filter(Boolean).sort((p, q) => p - q), med = ok.length >= 3 ? ok[Math.floor(ok.length / 2)] : 0, cc = med ? E.cents(med, T.ref) : null;
      T.h = E.hold(T.h, cc, dt);
      if (cc != null) T.trace.push([now, cc]); else if (T.trace.length && T.trace[T.trace.length - 1]) T.trace.push(null);
      while (T.trace.length && (T.trace[0] === null || now - T.trace[0][0] > 6000)) T.trace.shift();
      const nd = $('#tneedle'); if (nd) { nd.style.display = cc == null ? 'none' : ''; if (cc != null) nd.style.left = ((Math.max(-300, Math.min(300, cc)) + 300) / 6) + '%'; nd.classList.toggle('on', cc != null && Math.abs(cc) < 25); }
      const w = $('#tword'); if (w) w.textContent = E.tuneWords(cc);
      const hzEl = $('#thz'); if (hzEl) hzEl.textContent = med ? Math.round(med) + ' Hz (' + E.noteName(med) + ')' : ' ';
      const hd = $('#thold'); if (hd) hd.textContent = T.h.best >= 1 ? 'Held within 50 cents for ' + T.h.on.toFixed(1) + ' s (longest ' + T.h.best.toFixed(1) + ' s).' : ' ';
      const pth = $('#tpath'); if (pth) { let d = '', pen = false; T.trace.forEach(pt => { if (!pt) { pen = false; return; } d += (pen ? 'L' : 'M') + X(pt[0]).toFixed(1) + ' ' + Yc(pt[1]).toFixed(1); pen = true; }); pth.setAttribute('d', d); }
      T.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function resultBlock(c, t) {
    const r0 = take(c, t.refId) || E.reference(c);
    if (!r0 || !t.an || !r0.an) return '';
    const cmp = E.compare(r0.an, t.an), ref = E.reference(c);
    return `<section class="step" id="result" style="border-color:var(--tung)"><h3>Then and now</h3>
      <div class="vs"><div><b>THEN · ${esc(ago(r0.at))}</b><audio src="${url(r0.id)}" controls preload="metadata"></audio></div><div><b>NOW${t.cold ? ' · COLD' : ''}</b><audio id="nowaudio" src="${url(t.id)}" controls preload="metadata"></audio></div></div>
      ${contourBlock(c, r0, t)}
      <ul class="said" id="said">${cmp.say.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="faint" style="font-size:13px;margin:10px 0 0">This only measures sound. Whether now is better is yours to hear.</p>
      <div class="row" style="margin-top:12px">${E.autoState(c) === 'inuse' ? '' : (S.visit && S.visit.done == null ? `<button class="btn pri" data-a="itsback">It's back. Mark Back in use</button>` : `<button class="btn pri" data-a="setstate" data-v="inuse">Mark Back in use</button>`)}${ref && ref.id === t.id ? '' : `<button class="btn" data-a="setref" data-id="${t.id}">Keep this as the new reference</button>`}</div>
    </section>`;
  }

  // ---------------------------------------------------------------- PACK
  function vPack() {
    const L = S.lib, c = cur();
    return `<h2 style="margin:10px 0 4px;font-size:20px">Keep it safe</h2>
      <p class="dim" style="margin:0 0 12px">Everything lives on this device only. A pack is one file with the recordings, looks and notes. Save it to Files, Drive, or email it to yourself. Open it on any phone.</p>
      ${L.lastSaved ? `<p class="faint" style="font-size:13px">Last pack saved ${esc(ago(L.lastSaved))}.</p>` : (L.chars.length ? '<div class="msg bad" style="margin-bottom:12px">No pack saved yet. If this browser clears its storage, the recordings go with it.</div>' : '')}
      ${c ? `<button class="btn pri block" data-a="packone" style="margin-bottom:8px">Save ${esc(c.name || 'this character')} as a pack</button>` : ''}
      ${L.chars.length > 1 ? `<button class="btn block" data-a="packall" style="margin-bottom:8px">Save all ${L.chars.length} characters</button>` : ''}
      <button class="btn ghost block" data-a="openpack">Open a pack</button>
      ${c ? `<div class="kicker" style="margin-top:24px">${esc(c.name || 'This character')}</div><button class="btn ghost bad block" data-a="delchar">Delete this character from this device</button>` : ''}
      <p class="faint" style="font-size:12px;margin-top:24px">Character Bank ${VERSION}. No account, no upload, no computer voice. Measurements are pitch, range, time and pauses from your own recordings. VOICES lines your characters up on the same lines.</p>`;
  }
  async function packFor(chars) {
    const entries = [], used = {};
    for (const c of chars) {
      let base = slug(c.name); while (used[base]) base += '_'; used[base] = 1;
      const files = {};
      for (const m of [...c.takes, ...c.looks]) { const b = await DB.getMedia(m.id).catch(() => null); if (!b) continue; const fn = 'media/' + m.id + '.' + extOf(m.type || b.type); files[m.id] = fn; entries.push({ name: base + '/' + fn, bytes: new Uint8Array(await b.arrayBuffer()) }); }
      entries.unshift({ name: base + '/capsule.json', bytes: E.enc(JSON.stringify({ schema: SCHEMA, app: 'Character Bank ' + VERSION, saved: now(), character: c, lines: S.lib.lines, files }, null, 1)) });
    }
    return new Blob([E.makeZip(entries)], { type: 'application/zip' });
  }
  async function openPack(f) {
    const u8 = new Uint8Array(await f.arrayBuffer()), z = E.readZip(u8);
    const caps = Object.keys(z).filter(n => /(^|\/)capsule\.json$/.test(n));
    if (!caps.length) throw new Error('No character inside this file.');
    let n = 0;
    for (const cp of caps) {
      const d = JSON.parse(E.dec(z[cp])); if (!d.character || !/^ACT\.CPS\//.test(d.schema || '')) continue;
      const dir = cp.replace(/capsule\.json$/, ''), c = d.character, have = S.lib.chars.find(x => x.id === c.id);
      if (have && !confirm(`${c.name || 'This character'} is already here. Replace it with the one in the pack?`)) continue;
      for (const [id, fn] of Object.entries(d.files || {})) { const b = z[dir + fn]; if (!b) continue; const m = [...c.takes, ...c.looks].find(x => x.id === id); const blob = new Blob([b], { type: (m && m.type) || typeOf(fn) }); await DB.putMedia(id, blob); if (S.urls[id]) URL.revokeObjectURL(S.urls[id]); S.urls[id] = URL.createObjectURL(blob); }
      S.lib.chars = S.lib.chars.filter(x => x.id !== c.id); S.lib.chars.push(c); S.lib.cur = c.id; n++;
    }
    await DB.putLib(S.lib); return n;
  }
  async function deliver(blob, name) {
    try { const f = new File([blob], name, { type: blob.type }); if (isPhone() && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ---------------------------------------------------------------- sketch pad
  function sketchSheet() {
    openSheet(`<div class="kicker">Sketch the look</div><canvas class="pad" id="pad" width="900" height="1200"></canvas>
      <div class="row" style="margin-top:10px"><button class="btn" data-a="padundo">Undo</button><button class="btn" data-a="padclear">Clear</button><button class="btn pri" data-a="padsave" style="margin-left:auto">Keep sketch</button></div>`);
    const cv = $('#pad'), g = cv.getContext('2d'), strokes = []; let curS = null;
    const draw = () => { g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, cv.width, cv.height); g.strokeStyle = '#1d1a15'; g.lineCap = g.lineJoin = 'round'; g.lineWidth = 6; strokes.forEach(s => { g.beginPath(); s.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (s.length === 1) g.lineTo(s[0][0] + .1, s[0][1]); g.stroke(); }); };
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); curS = [pt(e)]; strokes.push(curS); draw(); });
    cv.addEventListener('pointermove', e => { if (!curS) return; curS.push(pt(e)); draw(); });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { curS = null; }));
    S.pad = { cv, strokes, draw }; draw();
  }

  function openSheet(html) {
    let scrim = $('.scrim'), sh = $('.sheet');
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.a = 'closesheet'; document.body.appendChild(scrim); }
    if (!sh) { sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); document.body.appendChild(sh); }
    sh.innerHTML = `<div class="grab"></div><button class="iconbtn x" data-a="closesheet" aria-label="Close">${ICON.close}</button>` + html;
    requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  }
  function closeSheet(instant) { const scrim = $('.scrim'), sh = $('.sheet'); if (!sh) return; scrim.classList.remove('on'); sh.classList.remove('on'); const k = () => { scrim.remove(); sh.remove(); }; if (instant) k(); else setTimeout(k, 180); }

  // ---------------------------------------------------------------- BREAKDOWN (read only)
  async function scanBreakdown() {
    S.bd = [];
    const clean = t => String(t || 'Script').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
    const key = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const add = r => { if (!S.bd.some(x => x.role === r.role && key(x.title) === key(r.title))) S.bd.push(r); };
    // the sides shelf: your character from any ACT tool (Actor OS, BREAKDOWN, MEMORIZER)
    try { if (window.Shelf) Shelf.all().forEach(x => { if (x.me) add({ pid: 'shelf:' + x.id, title: clean(x.file), role: x.me }); }); } catch (e) { }
    const db = await peek('breakdown_v03'); if (!db) return;
    const ps = await peekAll(db, 'projects'); db.close();
    ps.forEach(p => { const title = p.title || (p.source && (p.source.title || p.source.name)) || 'Script'; (p.me || []).forEach(role => add({ pid: p.id, title: clean(title), role })); });
  }

  // ---------------------------------------------------------------- actions
  let pendingMemoKind = 'voice', pendingNew = false;
  function makeChar(name, project) { const c = newChar(name, project); S.lib.chars.push(c); S.lib.cur = c.id; touch(c); return c; }
  async function act(a, ds, el) {
    ds = ds || {}; const L = S.lib, c = cur();
    switch (a) {
      case 'tune': await startTune(); break;
      case 'bstep': if (S.rec) await stopRec(); if (S.tune) stopTune(); if (isNaN(+ds.s)) S.bstepName = ds.s; else S.bstep = +ds.s; render(); { const g = $('.bmain'); if (g && g.getBoundingClientRect().top < 0) g.scrollIntoView({ block: 'start' }); } break;
      case 'comeback': S.visit = null; L.cur = ds.id; S.tab = 'back'; S.bstep = 0; S.lastReturn = null; touch(); render(); window.scrollTo(0, 0); break;
      case 'hear': hear(ds.hear || ds.id); break;
      case 'proj': S.proj = ds.p || ''; render(); break;
      case 'newopen': S.newOpen = !S.newOpen; render(); break;
      case 'tunestop': stopTune(); render(); break;
      case 'cold': S.cold = ds.v === '1'; try { localStorage.setItem('cps_cold', S.cold ? '1' : '0'); } catch (e) { } render(); break;
      case 'itsback': if (c && S.visit && S.visit.id === c.id && S.visit.done == null) { const secs = Math.round((Date.now() - S.visit.t0) / 1000); S.visit.done = secs; c.backs = c.backs || []; c.backs.push({ at: now(), secs, cold: !!S.visit.coldDone }); c.state = 'inuse'; c.lastVisit = now(); touch(c); toast('Back in ' + E.clock(secs) + '.'); render(); } break;
      case 'tab': if (S.rec) await stopRec(); if (ds.t !== 'back') S.visit = null; if (ds.t === 'back' && S.tab !== 'back') S.bstep = 0; S.tab = ds.t; S.newOpen = false; render(); window.scrollTo(0, 0); break;
      case 'theme': { const cu = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); const nx = cu === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('cps_theme', nx); } catch (e) { } break; }
      case 'quickrec': makeChar('', ''); S.tab = 'capture'; await startRec('voice'); break;
      case 'quickmemo': pendingNew = true; pendingMemoKind = 'voice'; $('#voicein').click(); break;
      case 'newchar': makeChar('', ''); S.tab = 'capture'; render(); { const n = $('#c_name'); if (n) n.focus(); } break;
      case 'frombd': { const r = S.bd.find(x => x.pid === ds.pid && x.role === ds.role); if (!r) break; const n = makeChar(r.role, r.title); n.bd = r; touch(n); S.tab = 'capture'; render(); break; }
      case 'open': S.visit = null; L.cur = ds.id; touch(); S.tab = 'capture'; S.bstep = 0; S.lastReturn = null; render(); window.scrollTo(0, 0); break;
      case 'recstart': await startRec(ds.k); break;
      case 'recstop': await stopRec(); break;
      case 'memo': pendingNew = false; pendingMemoKind = ds.k; $('#voicein').click(); break;
      case 'linesrec': L.cur = ds.id; touch(); await startRec('lines'); break;
      case 'linesmemo': L.cur = ds.id; touch(); pendingNew = false; pendingMemoKind = 'lines'; $('#voicein').click(); break;
      case 'makeme': { let m = L.chars.find(x => x.me); if (!m) { m = makeChar('Me', ''); m.me = true; touch(m); } L.cur = m.id; await startRec('lines'); break; }
      case 'linesreset': L.lines = E.DEFAULT_LINES; touch(); render(); break;
      case 'camera': $('#camin').click(); break;
      case 'photo': $('#photoin').click(); break;
      case 'sketch': sketchSheet(); break;
      case 'padundo': if (S.pad) { S.pad.strokes.pop(); S.pad.draw(); } break;
      case 'padclear': if (S.pad) { S.pad.strokes.length = 0; S.pad.draw(); } break;
      case 'padsave': if (S.pad && S.pad.strokes.length) { const b = await new Promise(r => S.pad.cv.toBlob(r, 'image/png')); S.pad = null; await addLook(b, 'sketch'); } else toast('Draw something first.'); break;
      case 'dellook': if (c && confirm('Remove this look?')) { delMedia(c, ds.id); touch(c); render(); } break;
      case 'deltake': if (c && confirm('Delete this recording? It can\'t be brought back unless it\'s in a saved pack.')) { delMedia(c, ds.id); if (S.lastReturn === ds.id) S.lastReturn = null; touch(c); render(); } break;
      case 'setref': if (c) { c.refId = ds.id; touch(c); toast('That take is now the reference.'); render(); } break;
      case 'setstate': if (c) { c.state = c.state === ds.v ? null : ds.v; if (ds.v === 'inuse' && c.state) c.lastVisit = now(); touch(c); render(); } break;
      case 'packone': if (c) { const b = await packFor([c]); L.lastSaved = now(); await DB.putLib(L); await deliver(b, 'cps_' + slug(c.name) + '.zip'); render(); } break;
      case 'packall': { const b = await packFor(L.chars); L.lastSaved = now(); await DB.putLib(L); await deliver(b, 'cps_characters_' + now().slice(0, 10) + '.zip'); render(); break; }
      case 'openpack': $('#zipin').click(); break;
      case 'delchar': if (c && confirm(`Delete ${c.name || 'this character'} and all its recordings from this device?`)) { [...c.takes, ...c.looks].forEach(m => delMedia(c, m.id)); L.chars = L.chars.filter(x => x.id !== c.id); L.cur = null; touch(); S.tab = 'chars'; render(); } break;
      case 'closesheet': S.pad = null; closeSheet(); break;
    }
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; e.preventDefault(); act(t.dataset.a, Object.assign({}, t.dataset), t); });
  document.addEventListener('input', e => {
    const t = e.target, c = cur();
    if (t.dataset.cb && c) { c[t.dataset.cb] = !!t.checked; touch(c); render(); return; }
    if (t.dataset.lib) { S.lib[t.dataset.lib] = t.value; touch(); return; }
    if (t.dataset.c && c) {
      c[t.dataset.c] = t.value; touch(c);
      const sb = $('#statebox .state'); if (sb) sb.outerHTML = stateChip(c);
      if (t.dataset.c === 'name' || t.dataset.c === 'project') { const s = $('#cname'); if (s) s.textContent = (c.name || 'Unnamed character') + (c.project ? ' · ' + c.project : ''); }
    }
  });
  // lines edited: line the voices up again once you leave the box (not mid-typing; a tapped button renders by itself)
  document.addEventListener('focusout', e => { if (!(e.target.dataset && e.target.dataset.lib)) return; if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-a]')) return; setTimeout(() => { if (S.tab === 'voices' && !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.lib)) render(); }, 0); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.sheet')) act('closesheet'); });
  document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.fold) S.fold[d.dataset.fold] = d.open; }, true);
  $('#voicein').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (pendingNew) { makeChar(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim().slice(0, 40), ''); S.tab = 'capture'; pendingNew = false; }
    await addTake(f, pendingMemoKind, f.name);
  });
  const lookIn = async e => { const fs = Array.from(e.target.files); e.target.value = ''; for (const f of fs) await addLook(f); };
  $('#photoin').addEventListener('change', lookIn);
  $('#camin').addEventListener('change', lookIn);
  $('#zipin').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const n = await openPack(f); if (n) { S.tab = 'chars'; render(); toast(n === 1 ? 'Character opened.' : n + ' characters opened.'); } } catch (er) { toast(er.message); } });

  // ---------------------------------------------------------------- boot
  setInterval(() => { const el = document.getElementById('backclock'); if (el && S.visit && S.visit.done == null) el.textContent = E.clock((Date.now() - S.visit.t0) / 1000); }, 1000);
  (async function boot() {
    try { const th = localStorage.getItem('cps_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
    let lib = null; try { lib = await DB.getLib(); } catch (e) { }
    S.lib = lib && /^ACT\.CPS\//.test(lib.schema || '') ? Object.assign(emptyLib(), lib) : emptyLib();
    for (const c of S.lib.chars) for (const m of [...c.takes, ...c.looks]) { const b = await DB.getMedia(m.id).catch(() => null); if (b) S.urls[m.id] = URL.createObjectURL(b); }
    if (cur()) S.tab = 'chars';
    /* from VO BOOTH: ?c=<character>&tab=back (come back to this voice) or capture (record a take) */
    try { const q = new URLSearchParams(location.search), qc = q.get('c'), qt = q.get('tab'); if (qc && S.lib.chars.some(c => c.id === qc)) { S.lib.cur = qc; S.tab = ['back', 'capture', 'voices'].includes(qt) ? qt : 'capture'; } } catch (e) { }
    await scanBreakdown().catch(() => { });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
    render();
    window.CPS = { S, act, E, version: VERSION, stopRec };
  })();
})();
