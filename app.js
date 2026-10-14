/*
  CPS v0.2 · Character Preservation
  You find the character. This keeps it: your voice, your look, the line that drops you back in.
  Come back weeks later, hear yourself, record again, see what moved.
  No computer voice. The actor is the machine. Vanilla JS, offline, no account.
*/
(function () {
  'use strict';
  const VERSION = '0.2.0';
  const SCHEMA = 'ACT.CPS/0.2';
  const E = window.CPSEngine;
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

  const emptyLib = () => ({ schema: SCHEMA, app: 'CPS ' + VERSION, created: now(), chars: [], cur: null, lastSaved: null });
  const newChar = (name, project) => ({ id: rid(), name: name || '', project: project || '', created: now(), updated: now(), state: null, anchorLine: '', notes: '', refId: null, takes: [], looks: [], bd: null });
  const S = { lib: null, tab: 'chars', urls: {}, rec: null, lastReturn: null, bd: [], busy: '' };
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
    return `${p} · range ${a.rangeSt != null ? a.rangeSt + ' st' : '-'} · ${a.spanSec} s to say it · ${Math.round(a.silencePct)}% pauses`;
  }

  // ---------------------------------------------------------------- recording (mic, raw: no auto gain, no noise removal)
  function pickMime() { if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return ''; return ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m)) || ''; }
  async function startRec(kind) {
    if (S.rec) return;
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
    if (kind === 'return') { const ref = E.reference(c); t.refId = ref ? ref.id : null; S.lastReturn = t.id; }
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
    pack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>'
  };
  const TABS = [['chars', 'CHARACTERS'], ['capture', 'CAPTURE'], ['back', 'COME BACK'], ['pack', 'PACK']];
  function render() {
    closeSheet(true);
    const c = cur();
    $('#app').innerHTML = `<div class="shell">
      <header class="top"><div class="title"><b>CPS</b><span>${esc(c && S.tab !== 'chars' && S.tab !== 'pack' ? (c.name || 'Unnamed character') + (c.project ? ' · ' + c.project : '') : 'You find it. This keeps it.')}</span></div><button class="iconbtn" data-a="theme" aria-label="Light or dark">${ICON.theme}</button></header>
      <main id="main">${S.busy ? `<div class="msg" role="status">${esc(S.busy)}</div>` : ''}${({ chars: vChars, capture: vCapture, back: vBack, pack: vPack }[S.tab])()}</main>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${ICON[k]}<span>${l}</span></button>`).join('')}</nav></div>`;
    if (S.tab === 'back') { const r = $('#refaudio'); if (r) r.addEventListener('play', () => { const c2 = cur(); if (c2) { c2.lastVisit = now(); touch(c2); } }, { once: true }); }
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

  // ---------------------------------------------------------------- CHARACTERS
  function vChars() {
    const L = S.lib;
    const bdNew = S.bd.filter(r => !L.chars.some(c => c.bd && c.bd.pid === r.pid && c.bd.role === r.role));
    return `${L.chars.length ? '' : `<div style="padding:12px 0 4px"><div class="kicker">THEACTORPAGE · ACT</div><h1 style="font-size:30px;letter-spacing:.1em">CPS</h1>
        <div style="color:var(--tung-text);letter-spacing:.04em;margin-top:2px">Character Preservation. You find it. This keeps it.</div>
        <p class="dim" style="margin:8px 0 0;max-width:36em">You found the voice in rehearsal. Weeks later, the callback. Record it now, as you, in your own voice. Add the look and the line that drops you back in. When you come back, hear yourself and see what moved.</p></div>`}
      <button class="btn pri big block" data-a="quickrec" style="margin:12px 0 8px">Record a character now</button>
      <div class="row" style="margin-bottom:14px"><button class="btn" data-a="quickmemo">Start from a voice memo</button><button class="btn ghost" data-a="newchar">Start with just a name</button></div>
      ${bdNew.length ? `<div class="kicker">From BREAKDOWN</div><div class="row" style="margin-bottom:14px">${bdNew.map(r => `<button class="chip" data-a="frombd" data-pid="${esc(r.pid)}" data-role="${esc(r.role)}">${esc(r.role)} · ${esc(r.title)}</button>`).join('')}</div>` : ''}
      ${L.chars.length ? `<div class="kicker">${L.chars.length} ${L.chars.length === 1 ? 'character' : 'characters'}</div>` + L.chars.slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).map(c => {
        const m = E.missing(c);
        return `<button class="char" data-a="open" data-id="${c.id}">${avatar(c)}<span class="b"><b>${esc(c.name || 'Unnamed character')}</b><span class="faint" style="font-size:13px">${esc(c.project || 'No project')} · last visit ${ago(c.lastVisit || c.updated)}</span><br>${stateChip(c)}${m.length ? `<span class="faint" style="font-size:12px;margin-left:6px">Still to keep: ${esc(m.join(', '))}</span>` : ''}</span></button>`;
      }).join('') : ''}`;
  }
  function needChar(what) { return `<div class="msg" style="margin-top:12px">Pick a character first.</div><button class="btn pri block" data-a="tab" data-t="chars" style="margin-top:10px">Characters</button>${what ? '' : ''}`; }

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
      </section>

      <section class="step"><h3><span class="n">2</span>The look${h.look ? '<span class="ok">kept</span>' : ''}</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">A photo in costume, a mirror selfie, a sketch. Whatever puts you back in the body.</p>
        <div class="row"><button class="btn" data-a="camera">Take a photo</button><button class="btn" data-a="photo">Add photo or video</button><button class="btn" data-a="sketch">Sketch</button></div>
        ${c.looks.length ? `<div class="looks">${c.looks.map(l => `<div class="lk">${l.kind === 'video' ? `<video src="${url(l.id)}" playsinline controls></video>` : `<img src="${url(l.id)}" alt="Look">`}<button class="iconbtn" data-a="dellook" data-id="${l.id}" aria-label="Remove">${ICON.close}</button></div>`).join('')}</div>` : ''}
      </section>

      <section class="step"><h3><span class="n">3</span>The line that drops you in${h.line ? '<span class="ok">kept</span>' : ''}</h3>
        <p class="dim" style="font-size:14px;margin:0 0 8px">One line. When you say it, you're them.</p>
        <textarea class="field" id="c_line" data-c="anchorLine" rows="2" style="font-family:var(--mono)" placeholder="Insurance. You think I need you?">${esc(c.anchorLine)}</textarea>
      </section>

      <section class="step"><h3><span class="n">4</span>What you found${h.note ? '<span class="ok">kept</span>' : ''}</h3>
        <p class="dim" style="font-size:14px;margin:0 0 8px">Out of character. Where the voice sits, how they walk, what they want. Talk it or type it.</p>
        ${recBlock('note', 'Talk it')}
        ${notes.map(t => `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio><div class="row" style="justify-content:space-between"><span class="rd">Note · ${esc(ago(t.at))}</span><button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></div></div>`).join('')}
        <textarea class="field" id="c_notes" data-c="notes" rows="3" style="margin-top:10px" placeholder="Low in the chest. Never looks at the person he's threatening.">${esc(c.notes)}</textarea>
      </section>
      ${E.autoState(c) !== 'found' ? `<button class="btn pri block" data-a="tab" data-t="back">Come back to ${esc(c.name || 'them')} later</button>` : ''}`;
  }
  function takeRow(c, t, ref) {
    const isRef = ref && ref.id === t.id;
    return `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio>
      <div class="rd">${esc(readout(t.an))}</div>
      <div class="row" style="justify-content:space-between;margin-top:4px"><span class="faint" style="font-size:13px">${t.kind === 'return' ? 'Come-back take' : 'Take'} · ${esc(ago(t.at))}${t.name ? ' · ' + esc(t.name) : ''}</span>
      <span class="row" style="gap:4px">${isRef ? '<span class="state inuse">Reference</span>' : `<button class="btn ghost" data-a="setref" data-id="${t.id}" style="min-height:36px">Make reference</button>`}<button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></span></div></div>`;
  }

  // ---------------------------------------------------------------- COME BACK
  function vBack() {
    const c = cur(); if (!c) return needChar();
    const ref = E.reference(c), look = c.looks.find(l => l.kind !== 'video') || c.looks[0];
    if (!ref) return `<div class="msg" style="margin-top:12px">Nothing to come back to yet. Record the voice first.</div><button class="btn pri block" data-a="tab" data-t="capture" style="margin-top:10px">Capture</button>`;
    const rets = c.takes.filter(t => t.kind === 'return').sort((a, b) => b.at.localeCompare(a.at));
    const last = rets.find(t => t.id === S.lastReturn) || null;
    return `<p class="dim" style="margin:8px 0 12px">Last time with ${esc(c.name || 'this character')}: ${esc(ago(c.lastVisit || c.updated))}. Take it in order.</p>
      ${look ? `<section class="step"><h3><span class="n">1</span>Look</h3>${look.kind === 'video' ? `<video class="hero-look" src="${url(look.id)}" playsinline controls></video>` : `<img class="hero-look" src="${url(look.id)}" alt="Your look">`}</section>` : ''}
      <section class="step"><h3><span class="n">${look ? 2 : 1}</span>Listen to then</h3>
        <audio id="refaudio" src="${url(ref.id)}" controls preload="auto" style="width:100%"></audio>
        <div class="rd mono faint" style="font-size:13px;margin-top:4px">${esc(readout(ref.an))} · recorded ${esc(ago(ref.at))}</div>
        ${c.notes ? `<p style="margin:10px 0 0;font-size:15px">${esc(c.notes)}</p>` : ''}
        ${c.takes.filter(t => t.kind === 'note').slice(-1).map(t => `<div style="margin-top:8px"><span class="faint" style="font-size:13px">Your note</span><audio src="${url(t.id)}" controls preload="metadata" style="width:100%;height:40px"></audio></div>`).join('')}
      </section>
      ${c.anchorLine ? `<section class="step"><h3><span class="n">${look ? 3 : 2}</span>Say the line</h3><div class="big">${esc(c.anchorLine)}</div></section>` : ''}
      <section class="step"><h3><span class="n">${(look ? 3 : 2) + (c.anchorLine ? 1 : 0)}</span>Record now</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">Same lines as the reference, so the time and pauses mean something.</p>
        ${recBlock('return', 'Record it now')}
        <div class="row" style="margin-top:10px"><button class="btn" data-a="memo" data-k="return">Use a voice memo</button></div>
      </section>
      ${last ? resultBlock(c, last) : ''}
      ${rets.filter(t => t !== last).length ? `<div class="kicker" style="margin-top:16px">Earlier come-backs</div>${rets.filter(t => t !== last).map(t => { const r0 = take(c, t.refId) || ref; return `<div class="take"><audio src="${url(t.id)}" controls preload="metadata"></audio><div class="rd">${esc(ago(t.at))} · ${esc(E.compare(r0.an, t.an).say.join(' '))}</div><div class="row" style="justify-content:flex-end;gap:4px">${ref.id === t.id ? '<span class="state inuse">Reference</span>' : `<button class="btn ghost" data-a="setref" data-id="${t.id}" style="min-height:36px">Make reference</button>`}<button class="btn ghost bad" data-a="deltake" data-id="${t.id}" style="min-height:36px">Delete</button></div></div>`; }).join('')}` : ''}`;
  }
  function resultBlock(c, t) {
    const r0 = take(c, t.refId) || E.reference(c);
    if (!r0 || !t.an || !r0.an) return '';
    const cmp = E.compare(r0.an, t.an), ref = E.reference(c);
    return `<section class="step" id="result" style="border-color:var(--tung)"><h3>Then and now</h3>
      <div class="vs"><div><b>THEN · ${esc(ago(r0.at))}</b><audio src="${url(r0.id)}" controls preload="metadata"></audio></div><div><b>NOW</b><audio id="nowaudio" src="${url(t.id)}" controls preload="metadata"></audio></div></div>
      <ul class="said" id="said">${cmp.say.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="faint" style="font-size:13px;margin:10px 0 0">This only measures sound. Whether now is better is yours to hear.</p>
      <div class="row" style="margin-top:12px">${E.autoState(c) === 'inuse' ? '' : `<button class="btn pri" data-a="setstate" data-v="inuse">It's back. Mark Back in use</button>`}${ref && ref.id === t.id ? '' : `<button class="btn" data-a="setref" data-id="${t.id}">Keep this as the new reference</button>`}</div>
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
      <p class="faint" style="font-size:12px;margin-top:24px">CPS ${VERSION}. No account, no upload, no computer voice. Measurements are pitch, range, time and pauses from your own recordings.</p>`;
  }
  async function packFor(chars) {
    const entries = [], used = {};
    for (const c of chars) {
      let base = slug(c.name); while (used[base]) base += '_'; used[base] = 1;
      const files = {};
      for (const m of [...c.takes, ...c.looks]) { const b = await DB.getMedia(m.id).catch(() => null); if (!b) continue; const fn = 'media/' + m.id + '.' + extOf(m.type || b.type); files[m.id] = fn; entries.push({ name: base + '/' + fn, bytes: new Uint8Array(await b.arrayBuffer()) }); }
      entries.unshift({ name: base + '/capsule.json', bytes: E.enc(JSON.stringify({ schema: SCHEMA, app: 'CPS ' + VERSION, saved: now(), character: c, files }, null, 1)) });
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
    const db = await peek('breakdown_v03'); if (!db) return;
    const ps = await peekAll(db, 'projects'); db.close();
    S.bd = [];
    ps.forEach(p => { const title = p.title || (p.source && (p.source.title || p.source.name)) || 'Script'; (p.me || []).forEach(role => S.bd.push({ pid: p.id, title: String(title).replace(/\.[a-z0-9]+$/i, ''), role })); });
  }

  // ---------------------------------------------------------------- actions
  let pendingMemoKind = 'voice', pendingNew = false;
  function makeChar(name, project) { const c = newChar(name, project); S.lib.chars.push(c); S.lib.cur = c.id; touch(c); return c; }
  async function act(a, ds, el) {
    ds = ds || {}; const L = S.lib, c = cur();
    switch (a) {
      case 'tab': if (S.rec) await stopRec(); S.tab = ds.t; render(); window.scrollTo(0, 0); break;
      case 'theme': { const cu = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); const nx = cu === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('cps_theme', nx); } catch (e) { } break; }
      case 'quickrec': makeChar('', ''); S.tab = 'capture'; await startRec('voice'); break;
      case 'quickmemo': pendingNew = true; pendingMemoKind = 'voice'; $('#voicein').click(); break;
      case 'newchar': makeChar('', ''); S.tab = 'capture'; render(); { const n = $('#c_name'); if (n) n.focus(); } break;
      case 'frombd': { const r = S.bd.find(x => x.pid === ds.pid && x.role === ds.role); if (!r) break; const n = makeChar(r.role, r.title); n.bd = r; touch(n); S.tab = 'capture'; render(); break; }
      case 'open': L.cur = ds.id; touch(); { const o = cur(); S.tab = E.autoState(o) === 'found' ? 'capture' : 'back'; } S.lastReturn = null; render(); window.scrollTo(0, 0); break;
      case 'recstart': await startRec(ds.k); break;
      case 'recstop': await stopRec(); break;
      case 'memo': pendingNew = false; pendingMemoKind = ds.k; $('#voicein').click(); break;
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
    if (t.dataset.c && c) {
      c[t.dataset.c] = t.value; touch(c);
      const sb = $('#statebox .state'); if (sb) sb.outerHTML = stateChip(c);
      if (t.dataset.c === 'name' || t.dataset.c === 'project') { const s = $('.top .title span'); if (s) s.textContent = (c.name || 'Unnamed character') + (c.project ? ' · ' + c.project : ''); }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.sheet')) act('closesheet'); });
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
  (async function boot() {
    try { const th = localStorage.getItem('cps_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
    let lib = null; try { lib = await DB.getLib(); } catch (e) { }
    S.lib = lib && /^ACT\.CPS\//.test(lib.schema || '') ? Object.assign(emptyLib(), lib) : emptyLib();
    for (const c of S.lib.chars) for (const m of [...c.takes, ...c.looks]) { const b = await DB.getMedia(m.id).catch(() => null); if (b) S.urls[m.id] = URL.createObjectURL(b); }
    if (cur()) S.tab = 'chars';
    await scanBreakdown().catch(() => { });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
    render();
    window.CPS = { S, act, E, version: VERSION, stopRec };
  })();
})();
