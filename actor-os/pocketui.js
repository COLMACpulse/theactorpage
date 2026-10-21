/* POCKET RUN on the page (pocket.js has the pure parts). Opens from the Reader booth once a reader line is in.
   One sound file, played by an <audio> element: that is what keeps playing with the screen locked, and what the
   lock screen and earbud buttons talk to. The lock screen shows the line you're on. */
(function () {
  const PKEY = 'actor_os_pocket';
  const PK = Object.assign({ mine: 'gap', pace: 'written', rep: 0, words: true }, (() => { try { return JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem(PKEY, JSON.stringify({ mine: PK.mine, pace: PK.pace, rep: PK.rep, words: PK.words })); } catch (e) { } };
  const DEC = new Map();
  let T = null, AU = null, URLX = '', LAST = -1, PASS = 1, PREV = 0, BUSY = false, MSG = '';
  const e2 = s => (window.esc2 ? esc2(s) : String(s == null ? '' : s));
  const $p = id => document.getElementById(id);

  if (!document.getElementById('pocketCss')) {
    const st = document.createElement('style'); st.id = 'pocketCss';
    st.textContent = `.pocketbox{border:1px solid var(--gold,#e0a23c);border-radius:9px;padding:11px 13px;margin:0 0 11px;display:grid;gap:6px}
.pocketbox b{font-size:10px;letter-spacing:.16em;color:var(--gold,#e0a23c)}.pocketbox span{font-size:12.5px}
#pocketSheet{position:fixed;inset:0;z-index:9000;background:rgba(8,8,8,.96);color:#ece7dc;overflow:auto;padding:max(18px,env(safe-area-inset-top)) 16px 40px}
#pocketSheet .pin{max-width:520px;margin:0 auto;display:grid;gap:14px}
#pocketSheet h4{margin:0;font-size:12px;letter-spacing:.2em;color:#e0a23c}
#pocketSheet .pq{font-size:10px;letter-spacing:.14em;color:#9a958c;margin-bottom:5px}
#pocketSheet .pch{display:flex;flex-wrap:wrap;gap:6px}
#pocketSheet .pch button{background:none;border:1px solid #444;color:#ece7dc;border-radius:7px;padding:8px 10px;font:inherit;font-size:11px;letter-spacing:.08em}
#pocketSheet .pch button.on{border-color:#e0a23c;color:#e0a23c}
#pocketSheet .pch button:disabled{opacity:.4}
#pocketSheet small{color:#9a958c;font-size:11.5px;line-height:1.45}
#pocketSheet .pgo{background:#e0a23c;color:#111;border:0;border-radius:9px;padding:14px;font:inherit;font-weight:700;letter-spacing:.12em}
#pocketSheet .pline{min-height:120px;border:1px solid #333;border-radius:11px;padding:16px;display:grid;align-content:center;gap:8px}
#pocketSheet .pline i{font-style:normal;font-size:10px;letter-spacing:.16em;color:#9a958c}
#pocketSheet .pline.me i{color:#e0a23c}#pocketSheet .pline p{margin:0;font-size:20px;line-height:1.35}
#pocketSheet .pctl{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
#pocketSheet .pctl button{background:none;border:1px solid #555;color:#ece7dc;border-radius:9px;padding:13px 4px;font:inherit;font-size:11px;letter-spacing:.08em}
#pocketSheet .pclose{justify-self:end;background:none;border:1px solid #555;color:#ece7dc;border-radius:7px;padding:7px 11px;font:inherit;font-size:11px}`;
    document.head.appendChild(st);
  }

  /* the scene, line by line, with the recording for each line if there is one */
  async function gather() {
    const om = SIDES.omit || [], all = await ActorReader.all();
    const pick = k => { const arr = all.filter(c => c.line === k).sort((a, b) => a.at - b.at); const sel = SIDES.pick && SIDES.pick[k]; return arr.find(c => c.id === sel) || arr[arr.length - 1] || null; };
    const lines = activeScript().filter(b => om.indexOf(b.who) < 0).map(b => { const k = boothKey(b); return { who: b.who, text: b.text, mine: !!b.mine, c: b.mine ? pick('mine:' + k) : pick(k) }; });
    return lines;
  }
  async function decode(c) {
    if (!c) return null; if (DEC.has(c.id)) return DEC.get(c.id);
    let d = null; try { const x = await ActorReader.decode(c.blob); d = { pcm: x.pcm, sr: x.sr }; } catch (e) { d = null; }
    DEC.set(c.id, d); return d;
  }
  window.pocketBox = function (done) {
    if (!done) return '';
    return `<div class="pocketbox" id="pocketBox"><b>POCKET RUN</b><span>The scene on a loop, with the screen locked. Your reader plays, and you get a silence to say each of your lines. Earbud buttons work: play, pause, back a line, next line.</span>
      <div class="row"><button id="pkOpen" onclick="pocketOpen()">&#9654; POCKET RUN</button></div></div>`;
  };
  function chips(name, list, cur, dis) { return `<div class="pch">${list.map(([v, l]) => `<button data-pk="${name}" data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}" ${dis && dis(v) ? 'disabled' : ''}>${l}</button>`).join('')}</div>`; }
  async function sheet() {
    const lines = await gather(), haveMine = lines.some(l => l.mine && l.c);
    if (!haveMine && PK.mine === 'heard') PK.mine = 'gap';
    let w = $p('pocketSheet'); if (!w) { w = document.createElement('div'); w.id = 'pocketSheet'; document.body.appendChild(w); w.addEventListener('click', onClick); }
    const playing = !!T;
    w.innerHTML = `<div class="pin"><button class="pclose" data-pa="close">CLOSE</button><h4>POCKET RUN</h4>
     ${playing ? `<div class="pline" id="pkLine"><i>&nbsp;</i><p>&nbsp;</p></div>
       <div class="pctl"><button data-pa="prev" id="pkPrev">&#9198; BACK</button><button data-pa="toggle" id="pkToggle">PAUSE</button><button data-pa="next" id="pkNext">NEXT &#9197;</button><button data-pa="stop" id="pkStop">&#9632; STOP</button></div>
       <small id="pkPass"></small><small>Lock the screen. It keeps going, and the lock screen shows the line you're on. If it ever stops when you lock, keep the screen on and turn it face down.</small>`
      : `<div><div class="pq">YOUR LINES</div>${chips('mine', [['gap', 'A SILENCE TO SAY THEM'], ['heard', 'HEAR MY READING']], PK.mine, v => v === 'heard' && !haveMine)}
        <small>${haveMine ? 'Hear your reading to learn the lines. Take the silence to run them.' : 'To hear your own lines too, read the scene once with READ IT ALL in ONE READ.'}</small></div>
       <div><div class="pq">YOUR TIME TO SAY EACH LINE</div>${chips('pace', PocketRun.PACES.map(x => [x[0], x[1]]), PK.pace)}</div>
       <div><div class="pq">HOW MANY TIMES</div>${chips('rep', PocketRun.REPEATS, PK.rep)}</div>
       <div><div class="pq">THE WORDS</div>${chips('words', [['1', 'ON SCREEN'], ['0', 'HIDDEN, TEST ME']], PK.words ? '1' : '0')}</div>
       <small id="pkWhat">${e2(PocketRun.summary(PocketRun.plan(lines.map(l => ({ who: l.who, text: l.text, mine: l.mine, clip: l.c ? 1 : null })), { mineHeard: PK.mine === 'heard', pace: PK.pace })))}</small>
       ${MSG ? `<small id="pkMsg">${e2(MSG)}</small>` : ''}
       <button class="pgo" data-pa="go" id="pkGo" ${BUSY ? 'disabled' : ''}>${BUSY ? 'PUTTING IT TOGETHER&hellip;' : '&#9654; START THE LOOP'}</button>
       <small>Your recordings only. No computer voice. Nothing leaves this phone.</small>`}</div>`;
    if (playing) tick(true);
  }
  window.pocketOpen = function () { sheet(); };
  function onClick(ev) {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.pk) { const k = b.dataset.pk, v = b.dataset.v; PK[k] = k === 'rep' ? +v : k === 'words' ? v === '1' : v; save(); return sheet(); }
    const a = b.dataset.pa;
    if (a === 'close') { if (T) { const w = $p('pocketSheet'); if (w) w.remove(); return; } MSG = ''; const w = $p('pocketSheet'); if (w) w.remove(); return; }
    if (a === 'go') return go();
    if (a === 'stop') return stop();
    if (a === 'toggle') { if (!AU) return; AU.paused ? AU.play().catch(() => { }) : AU.pause(); return tick(true); }
    if (a === 'prev') return seek(PocketRun.prev(T.marks, AU.currentTime));
    if (a === 'next') { const t = PocketRun.next(T.marks, AU.currentTime); return seek(t == null ? 0 : t); }
  }
  function seek(t) { if (!AU) return; try { AU.currentTime = Math.max(0, t); } catch (e) { } tick(true); }

  async function go() {
    if (BUSY) return; BUSY = true; MSG = ''; sheet();
    try {
      try { if (typeof REMOTE_ON !== "undefined" && REMOTE_ON && typeof remoteDisable === "function") remoteDisable(); } catch (e) { }
      try { ActorReader.stopPlay(); } catch (e) { } try { ActorReader.disarm(); } catch (e) { }
      const lines = await gather(); let bad = 0;
      for (const l of lines) { const use = l.c && (!l.mine || PK.mine === 'heard'); l.clip = use ? await decode(l.c) : null; if (use && !l.clip) bad++; }
      const parts = PocketRun.plan(lines, { mineHeard: PK.mine === 'heard', pace: PK.pace });
      if (!parts.some(p => p.kind === 'reader' || p.kind === 'mine')) { BUSY = false; MSG = 'None of the recordings would play in this browser. Record a line again and try once more.'; return sheet(); }
      T = PocketRun.render(parts, { passes: PK.rep || 1 });
      const blob = new Blob([OneRead.wav(T.pcm, T.sr, 0, null)], { type: 'audio/wav' });
      T.pcm = null;
      if (URLX) try { URL.revokeObjectURL(URLX); } catch (e) { }
      URLX = URL.createObjectURL(blob);
      if (!AU) { AU = document.createElement('audio'); AU.id = 'pocketAudio'; AU.playsInline = true; AU.preload = 'auto'; document.body.appendChild(AU);
        AU.addEventListener('timeupdate', () => tick(false)); AU.addEventListener('play', () => tick(true)); AU.addEventListener('pause', () => tick(true));
        AU.addEventListener('ended', () => { if (!T) return; const n = PK.rep || 1; stop('Done. ' + (n === 1 ? 'Once' : n + ' times') + ' through.'); }); }
      AU.loop = !PK.rep; AU.src = URLX; LAST = -1; PASS = 1; PREV = 0;
      if (bad) MSG = bad + ' recording' + (bad === 1 ? '' : 's') + ' wouldn’t play here and became a silence.';
      session(true);
      BUSY = false; await sheet();
      await AU.play().catch(() => { });
      tick(true);
    } catch (e) { BUSY = false; T = null; MSG = 'Couldn’t put the loop together: ' + e.message; sheet(); }
  }
  function stop(msg) {
    try { if (AU) { AU.pause(); AU.removeAttribute('src'); AU.load(); } } catch (e) { }
    T = null; MSG = typeof msg === 'string' ? msg : ''; session(false); sheet();
  }
  /* the lock screen and the earbuds */
  function session(on) {
    const M = navigator.mediaSession; if (!M) return;
    const acts = { play: () => AU && AU.play().catch(() => { }), pause: () => AU && AU.pause(), stop: () => stop(), previoustrack: () => T && seek(PocketRun.prev(T.marks, AU.currentTime)), nexttrack: () => { if (!T) return; const t = PocketRun.next(T.marks, AU.currentTime); seek(t == null ? 0 : t); }, seekbackward: () => AU && seek(AU.currentTime - 5), seekforward: () => AU && seek(AU.currentTime + 5) };
    Object.keys(acts).forEach(a => { try { M.setActionHandler(a, on ? acts[a] : null); } catch (e) { } });
    try { M.playbackState = on ? 'playing' : 'none'; } catch (e) { }
    if (!on) try { M.metadata = null; } catch (e) { }
  }
  function lineText(m) { if (!m) return ['', '']; const me = m.kind === 'yours' || m.kind === 'mine';
    const who = m.kind === 'yours' ? 'YOUR LINE' : m.kind === 'mine' ? 'YOU' : m.kind === 'missing' ? m.who + ' (NOT RECORDED)' : m.who;
    return [who, PK.words || !me ? m.text : '…', me]; }
  function tick(force) {
    if (!T || !AU) return; const t = AU.currentTime || 0;
    if (!PK.rep) { if (t + 0.5 < PREV) PASS++; PREV = t; }
    const m = PocketRun.at(T.marks, t), k = m ? T.marks.indexOf(m) : -1, pass = PK.rep ? (m ? m.pass : 1) : PASS;
    const tg = $p('pkToggle'); if (tg) tg.textContent = AU.paused ? 'PLAY' : 'PAUSE';
    const ps = $p('pkPass'); if (ps) ps.textContent = 'Time ' + pass + (PK.rep ? ' of ' + PK.rep : '') + (AU.paused ? ' · paused' : '');
    if (k === LAST && !force) return; LAST = k;
    const [who, text, me] = lineText(m), box = $p('pkLine');
    if (box) { box.className = 'pline' + (me ? ' me' : ''); box.innerHTML = `<i>${e2(who || ' ')}</i><p>${e2(text || ' ')}</p>`; }
    try { if (navigator.mediaSession && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: who ? (text ? who + ': ' + text : who) : 'Pocket run', artist: 'Pocket run · ' + (SIDES.me || 'your scene'), album: 'ACTOR OS' }); } catch (e) { }
    try { if (navigator.mediaSession && navigator.mediaSession.setPositionState && isFinite(AU.duration)) navigator.mediaSession.setPositionState({ duration: AU.duration, position: Math.min(t, AU.duration), playbackRate: 1 }); } catch (e) { }
  }
  window.PocketUI = { state: PK, track: () => T, audio: () => AU, stop };
})();
