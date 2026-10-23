/* ACTOR OS · LINK A SCREEN: an old phone, a tablet or a laptop as your monitor, your controller and your playback.
   The phone taping sends its picture (no sound) to the other screen over your own Wi-Fi, by two codes, like Story
   Studio's WATCH ON ANOTHER PHONE (../film/monitor-link.js). Nothing goes through a server.
     MONITOR     tape on the better back camera and see your framing on the other screen
     CONTROLLER  ROLL and CUT from the other screen (a clicker paired to it works too), KEEP, GO AGAIN, ERASE
     PLAYBACK    each take goes over to the other screen when you cut, to watch on the bigger screen
     SIDES       the sides on the other screen, beside the lens, the line you're on lit up
     READER      your recorded reader lines play from the other screen (off camera, at your eyeline)
     2ND CAMERA  the other screen films its own angle while this phone rolls; it comes back here when you cut
   The take is still made and kept on this phone. The other screen only shows it (a second angle is kept on both).
   Loaded by Actor OS; the link code loads the first time you tap SCREEN. */
(function (g) {
  'use strict';
  const S = { stage: '', pc: null, dc: null, url: '', scan: 0, busy: false, send: true, tick: 0, lastId: '', peer: {}, sent: new Set(), sidesId: '', pending: null, rpos: null, q: Promise.resolve(), last: '', lastAt: 0, angles: {} };
  g.ScreenLink = S;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let ML = null;
  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(Error('load')); document.head.appendChild(s); }); }
  async function ready() { if (g.MonitorLink && g.qrcode) return (ML = g.MonitorLink); if (!g.qrcode) await load('../film/vendor/qrcode.min.js'); if (!g.MonitorLink) await load('../film/monitor-link.js'); return (ML = g.MonitorLink); }
  S.can = () => !!(g.RTCPeerConnection && g.CompressionStream);

  /* the box on the stage */
  function box() {
    let b = $('linkBox'); if (b) return b;
    b = document.createElement('div'); b.id = 'linkBox'; b.className = 'linkbox'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Link a screen');
    $('stage').appendChild(b); return b;
  }
  function paint() {
    const btn = $('sScreen'); if (btn) { btn.textContent = S.stage === 'live' ? '● SCREEN' : 'SCREEN'; btn.classList.toggle('on', S.stage === 'live'); }
    const b = $('linkBox'); if (!b || b.hidden) return;
    let h = '<div class="lkbar"><b>LINK A SCREEN</b><button class="sBtn" data-l="close">&times; CLOSE</button></div>';
    if (!S.stage) h += '<p>An old phone, a tablet or a laptop becomes your <b>monitor</b> (see your framing while you tape on the back camera), your <b>controller</b> (ROLL and CUT from there) and your <b>playback</b> (each take goes over when you cut).</p>' +
      '<p>On the other screen you can also show your <b>sides</b> beside the lens, play your <b>reader</b> from there, off camera at your eyeline, or make it a <b>second camera</b> that films its own angle while this phone rolls.</p>' +
      '<p class="lkdim">Both on the same Wi-Fi. Picture only, no sound. Nothing goes through a server, and the take stays on this phone.</p><button class="sBtn keep" data-l="start">LINK A SCREEN</button>';
    else if (S.stage === 'making') h += '<p class="lkdim">Making the code…</p>';
    else if (S.stage === 'code') h += '<p><b>1.</b> On the other screen, point its camera at this code, or send it the link.</p><div class="lkqr">' + ML.qrSvg(S.url) + '</div>' +
      '<div class="lkrow">' + (navigator.share ? '<button class="sBtn" data-l="share">SEND THE LINK</button>' : '') + '<button class="sBtn" data-l="copy">COPY THE LINK</button></div>' +
      '<p><b>2.</b> It shows a code back. Hold it up to this camera.</p><p class="lkdim" id="lkscan">Looking for the other screen\'s code…</p>' +
      '<details><summary class="lkdim">Or paste its code</summary><textarea id="lkpaste" placeholder="Paste the code from the other screen"></textarea><button class="sBtn" data-l="use">USE IT</button></details>' +
      '<div class="lkrow"><button class="sBtn" data-l="stop">CANCEL</button></div>';
    else if (S.stage === 'joining') h += '<p class="lkdim">Got it. Joining up…</p>';
    else if (S.stage === 'lost') h += '<p><b>The screens couldn\'t reach each other.</b> Same Wi-Fi? Some hotel and public Wi-Fi keeps devices apart; a phone\'s hotspot works.</p><button class="sBtn keep" data-l="start">TRY AGAIN</button>';
    else if (S.stage === 'live') h += '<p><b>Linked.</b> The other screen shows this camera, runs ROLL and CUT, and gets each take when you cut.</p>' +
      '<p class="lkdim" id="lkpeer">' + esc(peerLine()) + '</p>' +
      '<label class="lkrow"><input type="checkbox" id="lksend"' + (S.send ? ' checked' : '') + '> <span>Send each take over for playback</span></label>' +
      '<div class="lkrow"><button class="sBtn" data-l="stop" style="border-color:#d9694e;color:#d9694e">UNLINK</button></div>';
    b.innerHTML = h;
    b.querySelectorAll('[data-l]').forEach(x => x.onclick = () => act(x.dataset.l));
    const sd = $('lksend'); if (sd) sd.onchange = () => { S.send = sd.checked; };
  }
  async function act(a) {
    if (a === 'close') { $('linkBox').hidden = true; return; }
    if (a === 'start') return start();
    if (a === 'stop') { S.stop(); paint(); return; }
    if (a === 'copy') { try { await navigator.clipboard.writeText(S.url); toast('Link copied. Send it to the other screen.'); } catch (e) { prompt('Copy this link:', S.url); } return; }
    if (a === 'share') { navigator.share({ title: 'Actor OS screen', url: S.url }).catch(() => { }); return; }
    if (a === 'use') { if (!(await take($('lkpaste').value))) toast('That isn\'t the code from the other screen.'); }
  }
  const toast = t => { try { g.stageToast(t); } catch (e) { } };
  S.open = async function () {
    if (!S.can()) { toast('This browser can\'t link a screen. Try Safari or Chrome, up to date.'); return; }
    try { await ready(); } catch (e) { toast('The link didn\'t load. Check you\'re online once, then try again.'); return; }
    const b = box(); b.hidden = false; paint();
  };
  async function start() {
    const v = $('stageVid'), st = v && v.srcObject; if (!st) { toast('The camera isn\'t on yet.'); return; }
    S.stop(); S.stage = 'making'; paint();
    try {
      const base = new URL('screen.html', location.href).href.replace(/#.*$/, '');
      const r = await ML.offer(st, { facing: (typeof camFacing !== 'undefined' ? camFacing : 'user') }, base, { data: true });
      if (S.stage !== 'making') { try { r.pc.close(); } catch (e) { } return; }
      S.pc = r.pc; S.dc = r.dc; S.url = r.url; S.stage = 'code';
      ML.receive(S.dc, onMsg, onFile, onProg);
      S.dc.onopen = () => { S.stage = 'live'; clearInterval(S.scan); S.scan = 0; paint(); toast('Screen linked.'); push(true); S.tick = setInterval(push, 200); };
      S.dc.onclose = () => { if (S.stage === 'live') { S.stage = ''; clearInterval(S.tick); toast('The other screen let go.'); letGo(); paint(); } };
      const st2 = () => { const s = r.pc.connectionState || r.pc.iceConnectionState; if (s === 'failed' && S.pc === r.pc && S.stage !== 'live') { S.stage = 'lost'; clearInterval(S.scan); paint(); } };
      r.pc.addEventListener('connectionstatechange', st2); r.pc.addEventListener('iceconnectionstatechange', st2);
      paint(); scan();
    } catch (e) { S.stage = ''; toast('This phone can\'t send its picture. Try Safari or Chrome, up to date.'); paint(); }
  }
  async function take(text) { if (!S.pc || S.busy || S.stage !== 'code') return false; S.busy = true;
    try { await ML.accept(S.pc, text); S.stage = 'joining'; clearInterval(S.scan); S.scan = 0; paint(); return true; } catch (e) { S.busy = false; return false; } }
  S.take = take;
  async function scan() {
    clearInterval(S.scan); let read = null; try { read = await ML.reader('../film/'); } catch (e) { const el = $('lkscan'); if (el) el.textContent = 'This phone can\'t read codes. Copy the code on the other screen and paste it below.'; return; }
    let going = false; S.scan = setInterval(async () => { if (going || S.stage !== 'code') return; const v = $('stageVid'); if (!v || !v.videoWidth) return; going = true;
      try { const t = await read(v); if (t && t.indexOf(ML.ANSWER) >= 0 && !(await take(t))) { const el = $('lkscan'); if (el) el.textContent = 'That code didn\'t fit. Make a new one on both.'; } } catch (e) { } going = false; }, 350);
  }
  S.stop = function () { letGo(); clearInterval(S.scan); clearInterval(S.tick); S.scan = S.tick = 0; try { S.dc && S.dc.close(); } catch (e) { } try { S.pc && S.pc.close(); } catch (e) { } S.pc = S.dc = null; S.url = ''; S.stage = ''; S.busy = false; S.peer = {}; S.sent = new Set(); S.sidesId = ''; S.last = ''; paint(); };
  S.live = () => S.stage === 'live' && S.dc && S.dc.readyState === 'open';
  const send = m => { if (S.live()) try { S.dc.send(JSON.stringify(m)); } catch (e) { } };
  /* files go one at a time, so a reader line and a take never mix on the way */
  const queue = fn => (S.q = S.q.then(fn).catch(() => { }));
  const peerLine = () => { const p = S.peer, w = [];
    w.push(p.view === 'sides' ? 'The other screen is showing your sides.' : p.view === 'cam' ? (p.cam ? 'The other screen is filming a second angle.' : 'The other screen is set to be a second camera; its camera isn\'t on yet.') : 'The other screen is your monitor.');
    if (p.speaker) w.push('Your reader plays from there.'); return w.join(' '); };
  /* the sides you're running, as plain lines: who, the words, yours or not */
  function sidesNow() {
    try { const run = (typeof SIDES !== 'undefined' && (SIDES.run || SIDES.script)) || []; if (typeof MODE === 'undefined' || !(MODE === 'PARTNER' || MODE === 'PROMPTER' || MODE === 'CUE')) { if (!run.length) return { id: 'none', lines: [] }; }
      const lines = run.map(b => ({ who: String(b.who || ''), text: String(b.text || ''), mine: !!b.mine }));
      let h = 0; const k = lines.map(l => l.who + '|' + l.text).join('\n'); for (let i = 0; i < k.length; i++) h = ((h << 5) - h + k.charCodeAt(i)) | 0;
      return { id: lines.length + ':' + (h >>> 0).toString(36), lines };
    } catch (e) { return { id: 'none', lines: [] }; }
  }
  /* what the other screen needs to show: rolling or not, the clock, the take you're on, a take waiting for you, the line you're on */
  function push(force) {
    if (!S.live()) return;
    const sd = sidesNow(); if (sd.id !== S.sidesId) { S.sidesId = sd.id; send({ t: 'sides', id: sd.id, lines: sd.lines, scene: (typeof curScene === 'function' ? (curScene() || {}).name || '' : '') }); if (S.peer.speaker) preload(); }
    const rv = !!$('takeReview'), last = ((typeof state !== 'undefined' && state.takes) || []).slice(-1)[0];
    const m = { t: 'state', rec: !!(typeof sRecOn !== 'undefined' && sRecOn), count: !!((typeof sCount !== 'undefined' && sCount) || $('sCountdown')), review: rv, take: rv && last ? { id: last.id, n: last.n, secs: last.secs } : null,
      scene: (typeof curScene === 'function' ? (curScene() || {}).name || '' : ''), idx: (typeof sIdx !== 'undefined' ? sIdx : 0), sides: sd.id };
    const key = JSON.stringify(m), now = Date.now(); m.tc = ($('sTC') || {}).textContent || '';
    if (force || key !== S.last || now - S.lastAt > 900) { S.last = key; S.lastAt = now; send(m); }
  }
  S.push = push;
  function onMsg(m) {
    if (!m || !m.t) return;
    try {
      if (m.t === 'roll') { if (!(typeof sRecOn !== 'undefined' && sRecOn) && !$('takeReview')) g.stageRec(); }
      else if (m.t === 'cut') { if ((typeof sRecOn !== 'undefined' && sRecOn) || (typeof sCount !== 'undefined' && sCount)) g.stageRec(); }
      else if (m.t === 'keep' && $('takeReview')) g.reviewKeep(m.id || S.lastId);
      else if (m.t === 'again' && $('takeReview')) g.reviewAgain();
      else if (m.t === 'erase' && $('takeReview')) g.reviewDrop(m.id || S.lastId);
      else if (m.t === 'role') { const was = !!S.peer.speaker; S.peer = { view: m.view || 'monitor', speaker: !!m.speaker, cam: !!m.cam }; const el = $('lkpeer'); if (el) el.textContent = peerLine();
        if (S.peer.speaker && !was) { toast('Your reader plays from the other screen.'); preload(); } else if (!S.peer.speaker && was) { hush(); toast('Your reader plays from this phone again.'); } }
      else if (m.t === 'saying' && S.pending && S.pending.id === m.id) { S.rpos = { t0: performance.now(), dur: +m.dur || 0 }; }
      else if (m.t === 'said' && S.pending && S.pending.id === m.id) { const p = S.pending; S.pending = null; S.rpos = null; if (m.miss) orig.playClip.call(AR(), p.c, p.onended, p.opts); else if (p.onended) p.onended(); }
    } catch (e) { }
    setTimeout(() => push(true), 120);
  }

  /* ---------- READER: your reader lines, from the other screen ---------- */
  const AR = () => g.ActorReader;
  const orig = {};
  const plain = o => { if (!o) return null; const r = {}; ['sound', 'pitch', 'pace', 'tone'].forEach(k => { if (o[k] !== undefined && typeof o[k] !== 'object') r[k] = o[k]; }); return r; };
  function sendClip(c) { if (!c || !c.blob || S.sent.has(c.id)) return Promise.resolve(); S.sent.add(c.id);
    return queue(() => ML.sendFile(S.dc, c.blob, { kind: 'clip', id: c.id })).then(() => { }, () => S.sent.delete(c.id)); }
  /* the reader's lines for what you're running go over before you need them */
  function preload() { try { const run = (typeof SIDES !== 'undefined' && (SIDES.run || SIDES.script)) || []; run.forEach(b => { if (!b.mine && g.partnerClip) sendClip(g.partnerClip(b)); }); } catch (e) { } }
  const remote = () => S.live() && S.peer.speaker;
  function hush() { if (S.pending) { send({ t: 'hush' }); S.pending = null; S.rpos = null; } }
  function letGo() { if (S.pending) { const p = S.pending; S.pending = null; S.rpos = null; try { orig.playClip.call(AR(), p.c, p.onended, p.opts); } catch (e) { } } }
  function wrapReader() {
    const A = AR(); if (!A || A.__linked) return; A.__linked = true;
    orig.playClip = A.playClip; orig.stopPlay = A.stopPlay; orig.playPos = A.playPos;
    A.playClip = async function (c, onended, opts) {
      if (!remote() || !c || !c.blob) return orig.playClip.apply(this, arguments);
      orig.stopPlay.call(A); hush();
      S.pending = { id: c.id, c, onended, opts }; S.rpos = { t0: performance.now(), dur: 0 };
      await sendClip(c); if (!S.pending || S.pending.id !== c.id) return null;
      if (!S.live()) { letGo(); return null; }
      send({ t: 'say', id: c.id, opts: plain(opts), gain: A.getGain ? A.getGain() : 1 }); return null;
    };
    A.stopPlay = function () { hush(); return orig.stopPlay.apply(this, arguments); };
    A.playPos = function () { if (S.pending && S.rpos) return S.rpos.dur ? { t: Math.min(S.rpos.dur, (performance.now() - S.rpos.t0) / 1000), dur: S.rpos.dur } : null; return orig.playPos.apply(this, arguments); };
  }

  /* ---------- 2ND CAMERA: its angle comes back here when you cut ---------- */
  let adb = null;
  function angleDb() { if (adb) return adb; adb = new Promise(res => { try { const r = indexedDB.open('actor_os_angles', 1); r.onupgradeneeded = () => r.result.createObjectStore('angles', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); return adb; }
  const aop = async (mode, fn) => { const d = await angleDb(); if (!d) return null; return new Promise(res => { try { const t = d.transaction('angles', mode), r = fn(t.objectStore('angles')); t.oncomplete = () => res(r ? r.result : null); t.onerror = () => res(null); } catch (e) { res(null); } }); };
  S.angle = id => aop('readonly', st => st.get(id));
  S.dropAngle = id => aop('readwrite', st => st.delete(id));
  const extOf = t => /mp4/.test(t || '') ? 'mp4' : /quicktime/.test(t || '') ? 'mov' : 'webm';
  S.saveAngle = async function (id) { const a = await S.angle(id); if (!a || !a.blob) return false; const u = URL.createObjectURL(a.blob), x = document.createElement('a'); x.href = u; x.download = 'take-' + a.n + '-second-angle.' + extOf(a.blob.type); document.body.appendChild(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); return true; };
  function angleRow(a) {
    const rv = $('takeReview'); if (!rv) return; const bar = rv.querySelector('.rvbar'); if (!bar) return;
    let r = $('rvAngle'); if (!r) { r = document.createElement('div'); r.id = 'rvAngle'; r.className = 'rvangle'; bar.parentNode.insertBefore(r, bar); }
    if (a.loading) { r.innerHTML = '<span>SECOND ANGLE · coming over… ' + Math.round((a.f || 0) * 100) + '%</span>'; return; }
    r.innerHTML = '<span>SECOND ANGLE · take ' + esc(a.n) + ' · ' + (a.bytes / 1048576).toFixed(1) + ' MB · also kept on the other screen</span><button class="sBtn" type="button" id="rvAngleSave">&#8681; SAVE IT</button>';
    $('rvAngleSave').onclick = () => S.saveAngle(a.id);
  }
  function onProg(f, meta) { if (meta && meta.kind === 'angle') angleRow({ loading: true, f }); }
  async function onFile(blob, meta) {
    if (!meta || meta.kind !== 'angle') return;
    const id = meta.take || ('a' + Date.now().toString(36)), t = ((typeof state !== 'undefined' && state.takes) || []).find(x => x.id === id);
    const a = { id, n: t ? t.n : meta.n || '', blob, bytes: blob.size, at: Date.now() };
    await aop('readwrite', st => st.put(a)); if (t) { t.angle = true; try { localStorage.setItem(KEYOF(), JSON.stringify(state)); } catch (e) { } }
    if ($('takeReview') && S.lastId === id) angleRow(a); toast('Second angle for take ' + a.n + ' came in.');
    if (S.keepOnArrive && S.keepOnArrive === id) { S.keepOnArrive = ''; S.saveAngle(id); }
  }
  const KEYOF = () => (typeof KEY !== 'undefined' ? KEY : 'actor_os_state');
  /* each take, when you cut: over to the other screen */
  S.took = async function (t, blob) {
    S.lastId = t.id; push(true);
    if (!S.live() || !S.send || !blob) return;
    await queue(() => ML.sendFile(S.dc, blob, { kind: 'take', id: t.id, n: t.n, secs: t.secs, scene: t.scene }));
  };
  /* hook into the stage: the SCREEN button, the take when you cut, letting go when you leave */
  function hook() {
    const top = document.querySelector('#stage .sTop'); if (!top || $('sScreen')) return;
    const b = document.createElement('button'); b.className = 'sBtn'; b.id = 'sScreen'; b.type = 'button'; b.textContent = 'SCREEN'; b.onclick = () => S.open();
    const flip = [...top.querySelectorAll('button')].find(x => /FLIP/.test(x.textContent)); top.insertBefore(b, flip || null);
    if (typeof g.showTakeReview === 'function' && !g.showTakeReview.__linked) { const o = g.showTakeReview; g.showTakeReview = function (t, blob) { const r = o.apply(this, arguments); S.took(t, blob); return r; }; g.showTakeReview.__linked = true; }
    wrapReader();
    /* KEEP saves the second angle too; ERASE erases it too */
    if (typeof g.reviewKeep === 'function' && !g.reviewKeep.__linked) { const o = g.reviewKeep; g.reviewKeep = function (id) { const r = o.apply(this, arguments); S.angle(id).then(a => { if (a && a.blob) setTimeout(() => S.saveAngle(id), 900); else if (S.peer.cam) S.keepOnArrive = id; }); return r; }; g.reviewKeep.__linked = true; }
    if (typeof g.reviewDrop === 'function' && !g.reviewDrop.__linked) { const o = g.reviewDrop; g.reviewDrop = function (id) { S.dropAngle(id); return o.apply(this, arguments); }; g.reviewDrop.__linked = true; }
    if (typeof g.exitStage === 'function' && !g.exitStage.__linked) { const o = g.exitStage; g.exitStage = function () { S.stop(); const lb = $('linkBox'); if (lb) lb.hidden = true; return o.apply(this, arguments); }; g.exitStage.__linked = true; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})(window);
