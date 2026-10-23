/* THEACTORPAGE WAVE: what a take looks like, and the mic while it listens.
   W.peaks: a take's shape, a short list of heights (0 to 100), kept with the take so it never has to be read again.
   W.svg:   that shape as a small picture; the dead air at either end drawn dim.
   W.live:  the mic, while you record: bars that move with your voice, and the level, drawn into any
            canvas[data-live] and [data-meter] on the page. Nothing is recorded by this; it only watches.
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const W = {};
  /* d: the sound (Float32Array), n: how many bars. -> [0..100] heights, scaled to the loudest moment of the take */
  W.peaks = function (d, n) {
    n = n || 56; const out = new Array(n).fill(0); if (!d || !d.length) return out;
    const step = d.length / n; let top = 0;
    for (let i = 0; i < n; i++) { const a = Math.floor(i * step), b = Math.max(a + 1, Math.floor((i + 1) * step)); let m = 0;
      for (let j = a; j < b && j < d.length; j++) { const v = d[j] < 0 ? -d[j] : d[j]; if (v > m) m = v; } out[i] = m; if (m > top) top = m; }
    /* a square root, so quiet words still show: that's how an ear hears it, too */
    return out.map(v => top > 0 ? Math.round(Math.sqrt(v / top) * 100) : 0);
  };
  /* trim: [from, to] as parts of the take (0 to 1), from VOAudio.trim; outside it is dead air */
  W.trimOf = (t, len) => (t && len) ? [Math.max(0, t.start / len), Math.min(1, t.end / len)] : [0, 1];
  W.svg = function (p, o) {
    o = o || {}; p = p || []; const n = p.length || 1, bw = 4, H = 40, trim = o.trim || [0, 1];
    const col = o.color || 'var(--tung,#e0a23c)', dim = o.dim || 'var(--line,#2f2b26)';
    const bars = p.map((v, i) => { const h = Math.max(2, Math.round((v / 100) * (H - 2))), x = i * bw, f = (i + 0.5) / n, dead = f < trim[0] || f > trim[1];
      return '<rect x="' + x + '" y="' + ((H - h) / 2) + '" width="' + (bw - 1.4) + '" height="' + h + '" rx="1" fill="' + (dead ? dim : col) + '"/>'; }).join('');
    return '<svg class="wv' + (o.cls ? ' ' + o.cls : '') + '" viewBox="0 0 ' + (n * bw) + ' ' + H + '" preserveAspectRatio="none" ' + (o.label ? 'role="img" aria-label="' + String(o.label).replace(/"/g, '&quot;') + '"' : 'aria-hidden="true"') + '>' + bars + '</svg>';
  };
  /* a level in dB (-60 to 0) as a part of the meter (0 to 1) */
  W.meter = db => Math.max(0, Math.min(1, (db + 60) / 60));
  W.db = v => v > 0 ? 20 * Math.log10(v) : -120;

  /* ---------- the mic, live ---------- */
  let L = null;
  W.live = {
    start(stream, o) {
      W.live.stop(); o = o || {}; if (!stream || typeof document === 'undefined') return;
      try {
        const AC = g.AudioContext || g.webkitAudioContext; if (!AC) return;
        const ac = new AC(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 2048; src.connect(an);
        try { ac.resume(); } catch (e) { }
        const buf = new Float32Array(an.fftSize), hist = [], ceil = o.ceiling == null ? -3 : o.ceiling;
        L = { ac, src, an, raf: 0, hist, peakDb: -120 };
        const tick = () => {
          if (!L) return; an.getFloatTimeDomainData(buf); let m = 0, s = 0;
          for (let i = 0; i < buf.length; i++) { const v = buf[i] < 0 ? -buf[i] : buf[i]; if (v > m) m = v; s += buf[i] * buf[i]; }
          const rms = Math.sqrt(s / buf.length), pk = W.db(m); L.peakDb = pk;
          hist.push(Math.min(1, Math.sqrt(m))); if (hist.length > 400) hist.shift();
          document.querySelectorAll('canvas[data-live]').forEach(cv => W.drawLive(cv, hist, pk > ceil));
          document.querySelectorAll('[data-meter]').forEach(el => { el.style.width = Math.round(W.meter(W.db(rms) + 9) * 100) + '%'; el.classList.toggle('top', pk > ceil); });
          L.raf = requestAnimationFrame(tick);
        };
        L.raf = requestAnimationFrame(tick);
      } catch (e) { L = null; }
    },
    stop() { if (!L) return; try { cancelAnimationFrame(L.raf); L.src.disconnect(); L.ac.close(); } catch (e) { } L = null; },
    on: () => !!L
  };
  /* newest at the right, sliding left as you speak */
  W.drawLive = function (cv, hist, top) {
    const r = cv.getBoundingClientRect(), dpr = g.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const x = cv.getContext('2d'); x.clearRect(0, 0, w, h);
    const css = getComputedStyle(cv), col = css.getPropertyValue('--wv').trim() || '#e0a23c', hot = css.getPropertyValue('--wv-top').trim() || '#f0846e';
    const bw = Math.max(3, Math.round(4 * dpr)), gap = Math.max(1, Math.round(2 * dpr)), n = Math.floor(w / (bw + gap)), from = Math.max(0, hist.length - n);
    for (let i = from; i < hist.length; i++) { const v = hist[i], bh = Math.max(2 * dpr, v * (h - 2)), px = w - (hist.length - i) * (bw + gap);
      x.fillStyle = top && i > hist.length - 6 ? hot : col; x.fillRect(px, (h - bh) / 2, bw, bh); }
  };
  g.Wave = W;
  if (typeof module !== 'undefined') module.exports = W;
})(typeof window !== 'undefined' ? window : globalThis);
