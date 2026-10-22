/* RECORD THE TOUR: read every stop once, straight through; ONE READ cuts it into one clip per stop.
   The take and the clips stay on this device (MyVoice). SAVE FOR THE SITE zips vo/<id>.wav + cuts.json + the full take.
   A line can be redone on its own; the redo replaces only that clip.
   window.__rec (tests): {cut(pcm, sr) -> cuts} */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const T = window.TourStops, L = T.S, SR = 32000, PAUSES = [1.2, 1.0, 0.8, 0.6];
  const ORIG = {}; L.forEach(s => { ORIG[s.id] = s.line; });
  let EDITS = {};
  const words = id => EDITS[id] || ORIG[id];
  const lines = () => L.map(s => ({ text: words(s.id) }));
  let rec = null, stream = null, chunks = [], t0 = 0, tick = 0, ac = null, an = null, lock = null, busy = false;
  const say = t => { $('msg').textContent = t || ''; };
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const chName = s => (T.CH[s.ch] && T.CH[s.ch].name) || s.ch.toUpperCase();

  /* ---------- the script ---------- */
  $('nStops').textContent = L.length;
  function paintScript() {
    $('script').innerHTML = L.map((s, i) => '<div class="ln" data-id="' + s.id + '"><span class="n">' + (i + 1) + '</span><span class="t">' + esc(words(s.id)) + '</span><span class="ch">' + esc(chName(s)) + ' · ' + s.id + (EDITS[s.id] ? ' · <span class="chg">CHANGED</span>' : '') + ' · <button class="lnk" type="button" data-a="words">CHANGE THE WORDS</button></span></div>').join('');
  }
  /* change the words: right where the line is, in the script or in the clip list */
  function openEditor(row, id) {
    if (row.querySelector('.ed')) return;
    const box = document.createElement('div'); box.className = 'ed';
    box.innerHTML = '<textarea class="field" rows="6" aria-label="The words for this stop"></textarea><div class="row"><button class="btn" type="button" data-e="save">SAVE THE WORDS</button>' +
      (EDITS[id] ? '<button class="btn quiet" type="button" data-e="orig">BACK TO THE SCRIPT</button>' : '') + '<button class="btn quiet" type="button" data-e="cancel">CANCEL</button></div>' +
      '<p class="faint">Write it the way you said it, or the way you will. It becomes the caption on screen.</p>';
    box.querySelector('textarea').value = words(id); row.appendChild(box); box.querySelector('textarea').focus();
    box.addEventListener('click', async e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      if (b.dataset.e === 'save') { const v = box.querySelector('textarea').value.replace(/\s+/g, ' ').trim(); if (!v || v === ORIG[id]) delete EDITS[id]; else EDITS[id] = v; }
      if (b.dataset.e === 'orig') delete EDITS[id];
      if (b.dataset.e !== 'cancel') { await MyVoice.put('edits', EDITS); say(b.dataset.e === 'save' && EDITS[id] ? 'Saved. Stop ' + id + ' says your words now.' : 'Stop ' + id + ' is back to the script.'); }
      paintScript(); await show();
    });
  }
  $('script').addEventListener('click', e => { const b = e.target.closest('[data-a="words"]'); if (b) { const r = b.closest('.ln'); openEditor(r, r.dataset.id); } });

  /* ---------- the mic ---------- */
  function pickType() { const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']; for (const t of c) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { } } return ''; }
  async function micOn() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); const src = ac.createMediaStreamSource(stream); an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an); } catch (e) { an = null; }
    try { if (navigator.wakeLock) lock = await navigator.wakeLock.request('screen'); } catch (e) { lock = null; }
  }
  function micOff() {
    try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) { } stream = null;
    try { ac && ac.close(); } catch (e) { } ac = null; an = null;
    try { lock && lock.release(); } catch (e) { } lock = null;
    clearInterval(tick);
  }
  function startRec(onTick) {
    chunks = []; const type = pickType();
    rec = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream);
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.start(1000); t0 = Date.now();
    const buf = an ? new Float32Array(an.fftSize) : null;
    tick = setInterval(() => { const s = (Date.now() - t0) / 1000; let lv = 0;
      if (an) { an.getFloatTimeDomainData(buf); let m = 0; for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); lv = Math.min(1, m * 1.6); }
      onTick && onTick(s, lv); }, 100);
  }
  function stopRec() {
    return new Promise(res => { if (!rec || rec.state === 'inactive') return res(null);
      rec.onstop = () => { const b = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); rec = null; micOff(); res(b); }; rec.stop(); });
  }

  /* ---------- sound to numbers: mono, 32 kHz ---------- */
  async function decode(blob) {
    const ab = await blob.arrayBuffer();
    const C = window.AudioContext || window.webkitAudioContext, ctx = new C();
    let buf; try { buf = await new Promise((res, rej) => { const p = ctx.decodeAudioData(ab.slice(0), res, rej); if (p && p.then) p.then(res, rej); }); } finally { try { ctx.close(); } catch (e) { } }
    const n = Math.ceil(buf.duration * SR), off = new OfflineAudioContext(1, Math.max(1, n), SR), src = off.createBufferSource();
    src.buffer = buf; src.connect(off.destination); src.start(); const out = await off.startRendering();
    return out.getChannelData(0);
  }
  const wavBlob = (pcm, a, b) => new Blob([OneRead.wav(pcm, SR, a, b)], { type: 'audio/wav' });

  /* ---------- the whole read ---------- */
  async function cutAll(blob, how) {
    say('Cutting your read into ' + L.length + ' clips...'); busy = true;
    try {
      await MyVoice.put('take', blob); await MyVoice.put('takeType', blob.type || '');
      const pcm = await decode(blob);
      const r = OneRead.cut(pcm, SR, lines(), { pauses: PAUSES });
      const cuts = r.cuts.map((c, i) => ({ id: L[i].id, start: c.start, end: c.end, ratio: c.ratio, flag: c.flag, redo: false }));
      for (let i = 0; i < cuts.length; i++) { const c = cuts[i]; if (c.start == null) await MyVoice.del('clip:' + c.id); else await MyVoice.put('clip:' + c.id, wavBlob(pcm, c.start, c.end)); }
      await MyVoice.put('cuts', { at: Date.now(), how, length: Math.round(pcm.length / SR), cuts });
      say(''); await show();
    } catch (e) { say('That recording would not open here. ' + (e && e.message ? '(' + e.message + ')' : '')); }
    busy = false;
  }

  /* ---------- the list of clips ---------- */
  let playing = null;
  async function show() {
    const meta = await MyVoice.get('cuts'); if (!meta) { $('cutsBox').classList.add('hide'); $('startBox').classList.remove('hide'); return; }
    const clips = await MyVoice.clips();
    $('startBox').classList.add('hide'); $('cutsBox').classList.remove('hide');
    const miss = meta.cuts.filter(c => !clips[c.id]).length, chk = meta.cuts.filter(c => clips[c.id] && c.flag === 'check' && !c.redo).length;
    $('sum').textContent = (meta.cuts.length - miss) + ' of ' + meta.cuts.length + ' clips cut from your ' + mmss(meta.length || 0) + ' read.' +
      (miss ? ' ' + miss + ' not found: redo those on their own.' : '') + (chk ? ' ' + chk + ' to give a listen: the length looks off.' : '') + (!miss && !chk ? ' Give them a listen.' : '');
    $('cuts').innerHTML = meta.cuts.map((c, i) => {
      const has = !!clips[c.id], tag = !has ? '<span class="tag missing">NOT FOUND</span>' : c.redo ? '<span class="tag redo">REDONE</span>' : c.flag === 'check' ? '<span class="tag check">GIVE IT A LISTEN</span>' : '';
      return '<div class="cut" data-id="' + c.id + '"><span class="n">' + (i + 1) + '</span><span class="t">' + esc(words(c.id).slice(0, 90)) + (words(c.id).length > 90 ? '...' : '') + tag + (EDITS[c.id] ? '<span class="tag chg">CHANGED</span>' : '') + '</span>' +
        '<div class="row"><button class="btn ghost" type="button" data-a="play"' + (has ? '' : ' disabled') + '>PLAY</button><button class="btn quiet" type="button" data-a="redo">REDO THIS LINE</button><button class="btn quiet" type="button" data-a="words">CHANGE THE WORDS</button></div></div>';
    }).join('');
  }
  $('cuts').addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b || busy && b.dataset.a !== 'redo') return;
    const id = b.closest('.cut').dataset.id, i = L.findIndex(s => s.id === id);
    if (b.dataset.a === 'words') { openEditor(b.closest('.cut'), id); return; }
    if (b.dataset.a === 'play') {
      if (playing) { playing.pause(); URL.revokeObjectURL(playing.src); const was = playing._id; playing = null; document.querySelectorAll('[data-a="play"]').forEach(x => x.textContent = 'PLAY'); if (was === id) return; }
      const blob = (await MyVoice.clips())[id]; if (!blob) return;
      playing = new Audio(URL.createObjectURL(blob)); playing._id = id; b.textContent = 'STOP';
      playing.onended = () => { b.textContent = 'PLAY'; playing = null; }; playing.play().catch(() => { b.textContent = 'PLAY'; });
      return;
    }
    if (b.dataset.a === 'redo') {
      if (rec) { b.disabled = true; const blob = await stopRec(); b.disabled = false; if (!blob) return; await redoLine(id, i, blob); return; }
      if (busy) return;
      try { await micOn(); } catch (err) { say('The mic is off. Allow it for this page and try again.'); return; }
      busy = true; b.textContent = 'STOP'; b.classList.add('rec');
      say('Recording line ' + (i + 1) + ': "' + words(id).slice(0, 60) + '..." Tap STOP when you finish.');
      startRec(s => { b.textContent = 'STOP · ' + mmss(s); });
    }
  });
  async function redoLine(id, i, blob) {
    say('Trimming line ' + (i + 1) + '...');
    try {
      const pcm = await decode(blob), r = OneRead.cut(pcm, SR, [{ text: words(id) }], { pauses: PAUSES }), c = r.cuts[0];
      const a = c.start == null ? 0 : c.start, z = c.end == null ? pcm.length / SR : c.end;
      await MyVoice.put('clip:' + id, wavBlob(pcm, a, z));
      const meta = await MyVoice.get('cuts'); const m = meta.cuts.find(x => x.id === id); if (m) { m.redo = true; m.flag = ''; m.ratio = c.ratio; } await MyVoice.put('cuts', meta);
      say('Line ' + (i + 1) + ' redone.');
    } catch (e) { say('That one did not record. Try it again.'); }
    busy = false; await show();
  }

  /* ---------- buttons ---------- */
  $('recBtn').addEventListener('click', async () => {
    if (busy) return;
    try { await micOn(); } catch (e) { say('The mic is off. Allow it for this page and try again.'); return; }
    busy = true; say(''); $('startBox').classList.add('hide'); $('live').classList.add('on');
    startRec((s, lv) => { $('clock').textContent = mmss(s); $('lvl').style.width = Math.round(lv * 100) + '%'; $('lvl').style.background = lv > 0.95 ? 'var(--bad)' : 'var(--good)'; });
  });
  $('stopBtn').addEventListener('click', async () => {
    $('stopBtn').disabled = true; const blob = await stopRec(); $('stopBtn').disabled = false; $('live').classList.remove('on'); busy = false;
    if (!blob || !blob.size) { say('Nothing was recorded. Try again.'); $('startBox').classList.remove('hide'); return; }
    await cutAll(blob, 'here');
  });
  $('fileIn').addEventListener('change', async e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f || busy) return; await cutAll(f, 'file'); });
  $('againBtn').addEventListener('click', async () => {
    if (!confirm('Start over? This clears your clips from this device.')) return;
    await MyVoice.clear(); EDITS = {}; paintScript(); say(''); await show();
  });
  $('saveBtn').addEventListener('click', async () => {
    const meta = await MyVoice.get('cuts'), clips = await MyVoice.clips(); if (!meta) return;
    say('Making the zip...');
    const files = [];
    for (const s of L) { const b = clips[s.id]; if (b) files.push({ name: 'vo/' + s.id + '.wav', data: new Uint8Array(await b.arrayBuffer()) }); }
    const ch = {}; Object.keys(EDITS).forEach(id => { ch[id] = { was: ORIG[id], now: EDITS[id] }; });
    if (Object.keys(ch).length) files.push({ name: 'words.json', data: JSON.stringify(ch, null, 1) });
    files.push({ name: 'cuts.json', data: JSON.stringify({ made: new Date().toISOString(), rate: SR, stops: meta.cuts.map(c => ({ id: c.id, start: c.start, end: c.end, flag: c.flag, redo: c.redo, have: !!clips[c.id] })) }, null, 1) });
    const take = await MyVoice.get('take'); if (take) { const ty = (await MyVoice.get('takeType')) || take.type || ''; const ext = /mp4|m4a|aac/.test(ty) ? 'm4a' : /wav/.test(ty) ? 'wav' : /mpeg|mp3/.test(ty) ? 'mp3' : /ogg/.test(ty) ? 'ogg' : 'webm'; files.push({ name: 'full-read.' + ext, data: new Uint8Array(await take.arrayBuffer()) }); }
    const url = URL.createObjectURL(new Blob([Zip.make(files)], { type: 'application/zip' })), a = document.createElement('a');
    a.href = url; a.download = 'tour-voice.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    const nc = Object.keys(EDITS).length;
    say('Saved tour-voice.zip (' + Object.keys(clips).length + ' clips' + (nc ? ', ' + nc + ' lines in your words' : '') + '). Send it over and it goes up for everyone.');
  });
  window.addEventListener('beforeunload', e => { if (rec) { e.preventDefault(); e.returnValue = ''; } });

  window.__rec = { cut: (pcm, sr) => OneRead.cut(pcm, sr, lines(), { pauses: PAUSES }).cuts };
  paintScript();
  MyVoice.edits().then(e => { EDITS = e; paintScript(); return show(); }).catch(() => { });
})();
