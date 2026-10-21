/* ===== POCKET RUN =====
   The scene on a loop, in your pocket. Your reader lines (your voice, or a friend's memos) play in order; at each of
   your lines there is a silence the length of the line, for you to say it. Or, if you read the whole scene once in
   ONE READ, you can hear your own lines too, to learn them on a walk or in the car.
   It is rendered into one sound file and played by the page's audio player, so it keeps going with the screen
   locked, and earbud and lock-screen buttons work: play, pause, back a line, next line.
   No computer voice, ever: every sound in it is a recording somebody made.
   Pure parts here (plan, render, marks); the page wires the audio player. */
(function (g) {
  const P = {};
  P.PACES = [['tight', 'TIGHT', 0.8], ['written', 'AS WRITTEN', 1], ['room', 'ROOM TO BREATHE', 1.5]];
  P.REPEATS = [[0, 'UNTIL I STOP'], [3, '3 TIMES'], [5, '5 TIMES']];
  P.SR = 24000;
  const words = t => String(t || '').replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(w => /[A-Za-z0-9]/.test(w)).length;
  /* the time you get to say a line: about 2.4 words a second, plus a beat */
  P.gapFor = function (text, pace) { const f = +pace || 1; return Math.round(Math.max(1.2, (words(text) / 2.4 + 0.6) * f) * 100) / 100; };
  P.paceOf = id => (P.PACES.find(x => x[0] === id) || P.PACES[1])[2];
  /* lines: [{who, text, mine, clip?}] in scene order. clip = {pcm, sr} when there's a recording for it.
     opts: {mineHeard:bool, pace:id}. Your line with a recording plays it when mineHeard; otherwise a silence.
     A reader line with no recording becomes a silence its length, marked, so the scene still holds its shape. */
  P.plan = function (lines, opts) {
    opts = opts || {}; const f = P.paceOf(opts.pace);
    return (lines || []).map((b, i) => {
      if (b.mine) return opts.mineHeard && b.clip ? { i, kind: 'mine', who: b.who, text: b.text, clip: b.clip } : { i, kind: 'yours', who: b.who, text: b.text, secs: P.gapFor(b.text, f) };
      return b.clip ? { i, kind: 'reader', who: b.who, text: b.text, clip: b.clip } : { i, kind: 'missing', who: b.who, text: b.text, secs: P.gapFor(b.text, 1) };
    });
  };
  /* straight-line resample, plenty for a voice in an earbud */
  P.resample = function (pcm, from, to) {
    if (from === to) return pcm;
    const n = Math.max(1, Math.round(pcm.length * to / from)), out = new Float32Array(n), r = from / to;
    for (let i = 0; i < n; i++) { const x = i * r, a = Math.floor(x), b = Math.min(pcm.length - 1, a + 1), t = x - a; out[i] = (pcm[a] || 0) * (1 - t) + (pcm[b] || 0) * t; }
    return out;
  };
  /* bring every line up to the same peak, so a quiet reading isn't lost on the street */
  P.level = function (pcm, peak) {
    let m = 0; for (let i = 0; i < pcm.length; i++) { const v = Math.abs(pcm[i]); if (v > m) m = v; }
    if (m < 1e-4) return pcm; const k = Math.min(8, (peak || 0.9) / m), out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] * k; return out;
  };
  /* parts -> one track. beat: the breath between lines. tail: the pause before the scene starts again. passes: 1 or more.
     -> {pcm, sr, pass (seconds), dur, marks:[{t, end, i, kind, who, text, pass}]} */
  P.render = function (parts, o) {
    o = o || {}; const sr = o.sr || P.SR, beat = o.beat == null ? 0.35 : o.beat, tail = o.tail == null ? 2.5 : o.tail, passes = Math.max(1, o.passes || 1);
    const segs = parts.map(p => p.clip ? P.level(P.resample(p.clip.pcm, p.clip.sr, sr)) : null);
    let one = 0; parts.forEach((p, k) => { one += (segs[k] ? segs[k].length : Math.round(p.secs * sr)) + Math.round(beat * sr); }); one += Math.round(tail * sr);
    const pcm = new Float32Array(one * passes), marks = [];
    for (let q = 0; q < passes; q++) {
      let at = q * one;
      parts.forEach((p, k) => {
        const len = segs[k] ? segs[k].length : Math.round(p.secs * sr);
        if (segs[k]) pcm.set(segs[k], at);
        marks.push({ t: at / sr, end: (at + len) / sr, i: p.i, kind: p.kind, who: p.who, text: p.text, pass: q + 1 });
        at += len + Math.round(beat * sr);
      });
    }
    return { pcm, sr, pass: one / sr, dur: pcm.length / sr, marks };
  };
  /* where you are in the track */
  P.at = function (marks, t) { let m = null; for (const x of marks) { if (x.t <= t + 0.001) m = x; else break; } return m; };
  P.prev = function (marks, t) { const cur = P.at(marks, t); const k = cur ? marks.indexOf(cur) : 0; const back = cur && t - cur.t > 1.2 ? cur : marks[Math.max(0, k - 1)]; return back ? back.t : 0; };
  P.next = function (marks, t) { const x = marks.find(m => m.t > t + 0.05); return x ? x.t : null; };
  /* the plain words for what's in it */
  P.summary = function (parts) {
    const r = parts.filter(p => p.kind === 'reader').length, y = parts.filter(p => p.kind === 'yours').length, m = parts.filter(p => p.kind === 'mine').length, x = parts.filter(p => p.kind === 'missing').length;
    const L = [];
    if (r) L.push(r + ' reader line' + (r === 1 ? '' : 's'));
    if (m) L.push(m + ' of your lines, in your voice');
    if (y) L.push(y + ' silence' + (y === 1 ? '' : 's') + ' for your lines');
    if (x) L.push(x + ' reader line' + (x === 1 ? '' : 's') + ' not recorded yet, left as a silence');
    return L.join(', ') + '.';
  };
  g.PocketRun = P;
  if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
