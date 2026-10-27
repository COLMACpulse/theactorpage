/* THEACTORPAGE · SEE IT (Picture It): a wish on your wall as 30 seconds of you, on it. One journey, six beats, from
   the call to the mirror (Col, Oct 27): THE CALL, THE SCRIPT, CALL TIME, THE LOT, YOUR DOOR, THE MIRROR.
   Made from what you already have: your name and headshot (Your page), the title and your role (the wall), and, if
   you add them, a picture for any beat and your own words. Facts only until you write the words: the page never
   writes a sentence for you. The mirror shows your headshot, or the camera live if you turn it on; the camera is
   never in a saved video. Drawn on a canvas, so it plays and saves the same everywhere.
   Pure parts (the timeline, the facts, what each beat says) run in Node for the tests. */
(function (g) {
  'use strict';
  const S = {};
  S.BEATS = [['call', 'The call'], ['script', 'The script'], ['calltime', 'Call time'], ['lot', 'The lot'], ['door', 'Your door'], ['mirror', 'The mirror']];
  S.LENGTHS = [30, 45, 60];
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const up = s => clean(s).toUpperCase();

  /* where you are at t seconds: the beat, how far into it (0..1), and the fade (0 black .. 1 clear) */
  S.at = function (t, total) {
    total = +total || 30; const n = S.BEATS.length, seg = total / n, e = Math.max(0, Math.min(total, +t || 0));
    const i = Math.min(n - 1, Math.floor(e / seg)), p = Math.max(0, Math.min(1, (e - i * seg) / seg));
    const f = Math.max(0, Math.min(1, p * 7, (1 - p) * 7)); return { i, p, fade: i === n - 1 && e >= total ? 1 : f };
  };

  /* the facts every beat is made from */
  S.facts = function (w, you) {
    w = w || {}; you = you || {};
    return { name: clean(you.name) || 'Your name', title: clean(w.title) || 'What you want', role: clean(w.role), kind: w.kind || 'show' };
  };

  /* what a beat says, facts first; your words only if you wrote them */
  S.text = function (i, F, words) {
    const role = F.role, w = clean(words);
    switch (S.BEATS[i] && S.BEATS[i][0]) {
      case 'call': return { kick: 'MESSAGE · NOW', from: 'Your agent', main: w || [F.title, role].filter(Boolean).join(' · ') };
      case 'script': return { main: up(F.title), sub: up(F.name), sub2: role ? 'as ' + up(role) : '', say: w };
      case 'calltime': return { main: 'CALL SHEET', rows: [['CAST', 'ROLE', 'CALL'], [F.name, role || '', '6:00 AM']], sub: F.title, say: w };
      case 'lot': return { main: 'STAGE', sub: up(F.title), say: w };
      case 'door': return { main: up(F.name), sub: up(role || F.title), say: w };
      case 'mirror': return { main: up(F.name), sub: role ? 'as ' + role : F.title, say: w };
    }
    return { main: '' };
  };

  /* ---------- drawing (browser) ---------- */
  const FONT = 'Jost,system-ui,-apple-system,"Segoe UI",sans-serif', MONO = '"Courier Prime","Courier New",monospace';
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function cover(c, img, x, y, w, h, z) { if (!img) return; const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height; if (!iw || !ih) return; const k = Math.max(w / iw, h / ih) * (z || 1), dw = iw * k, dh = ih * k; c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
  function txt(c, s, x, y, size, opt) { opt = opt || {}; c.fillStyle = opt.color || '#ece7dc'; c.textAlign = opt.align || 'center'; c.textBaseline = 'alphabetic'; c.font = (opt.weight || 600) + ' ' + size + 'px ' + (opt.mono ? MONO : FONT); if (opt.spacing && 'letterSpacing' in c) c.letterSpacing = opt.spacing + 'px'; fit(c, s, x, y, size, opt); if ('letterSpacing' in c) c.letterSpacing = '0px'; }
  function fit(c, s, x, y, size, opt) { const max = opt.max || 1e9; let z = size; s = String(s || ''); while (z > 10 && c.measureText(s).width > max) { z -= 2; c.font = (opt.weight || 600) + ' ' + z + 'px ' + (opt.mono ? MONO : FONT); } c.fillText(s, x, y); }
  function wrap(c, s, x, y, size, maxW, lh, opt) { opt = opt || {}; c.font = (opt.weight || 500) + ' ' + size + 'px ' + FONT; const words = String(s || '').split(' '), lines = []; let cur = ''; words.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur); lines.slice(0, 3).forEach((l, k) => txt(c, l, x, y + k * lh, size, Object.assign({ weight: 500 }, opt))); return lines.length; }
  function grad(c, W, H, a, b) { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); gr.addColorStop(1, b); c.fillStyle = gr; c.fillRect(0, 0, W, H); }
  function bg(c, W, H, img, z) { if (!img) return; c.save(); c.globalAlpha = .55; cover(c, img, 0, 0, W, H, z); c.restore(); c.fillStyle = 'rgba(8,8,10,.45)'; c.fillRect(0, 0, W, H); }
  function say(c, W, H, s) { if (!clean(s)) return; c.fillStyle = 'rgba(8,8,10,.62)'; c.fillRect(0, H - 120, W, 120); wrap(c, s, W / 2, H - 70, 34, W - 200, 42, { color: '#f2efe8' }); }

  /* one frame: beat i at progress p. img: {pic (this beat's), wall, shot, live} */
  S.draw = function (c, W, H, i, p, F, words, img, fade) {
    img = img || {}; const T = S.text(i, F, words), k = S.BEATS[i][0], z = 1 + .06 * p;
    c.save(); c.clearRect(0, 0, W, H);
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    if (k === 'call') {
      grad(c, W, H, '#1a2230', '#0b0e13'); bg(c, W, H, img.pic, 1);
      const w = 560, h = 230, x = (W - w) / 2, y = (H - h) / 2 - 20;
      c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, x + 6, y + 14, w, h, 30); c.fill();
      c.fillStyle = '#f2efe8'; rr(c, x, y, w, h, 30); c.fill();
      txt(c, T.kick, x + 36, y + 52, 20, { align: 'left', color: '#6e675c', weight: 500, spacing: 2 });
      txt(c, T.from, x + 36, y + 98, 28, { align: 'left', color: '#1d1a15', weight: 600 });
      wrap(c, T.main, x + 36, y + 148, 32, w - 72, 40, { align: 'left', color: '#1d1a15' });
    } else if (k === 'script') {
      grad(c, W, H, '#2a2620', '#100e0c'); bg(c, W, H, img.pic, 1);
      c.save(); c.translate(W / 2, H / 2 - 10); c.rotate(-.035);
      c.fillStyle = '#d9d1c0'; c.fillRect(-190 + 12, -250 + 14, 380, 500);
      c.fillStyle = '#f4efe4'; c.fillRect(-190, -250, 380, 500);
      txt(c, T.main, 0, -90, 34, { mono: 1, color: '#1d1a15', weight: 700, max: 330 });
      txt(c, T.sub, 0, 40, 24, { mono: 1, color: '#1d1a15', weight: 700, max: 330 });
      if (T.sub2) txt(c, T.sub2, 0, 76, 20, { mono: 1, color: '#1d1a15', weight: 700, max: 330 });
      c.restore(); say(c, W, H, T.say);
    } else if (k === 'calltime') {
      grad(c, W, H, '#203040', '#0c1218'); bg(c, W, H, img.pic, 1);
      const w = 760, h = 290, x = (W - w) / 2, y = (H - h) / 2 - 30;
      c.fillStyle = '#f2efe8'; rr(c, x, y, w, h, 8); c.fill();
      txt(c, T.main, x + 36, y + 56, 26, { align: 'left', color: '#1d1a15', weight: 700, spacing: 4 });
      c.fillStyle = '#1d1a15'; c.fillRect(x + 36, y + 76, w - 72, 2);
      const cols = [x + 36, x + 330, x + 580];
      T.rows.forEach((r, ri) => r.forEach((v, ci) => txt(c, v, cols[ci], y + 122 + ri * 50, ri ? 28 : 18, { align: 'left', color: ri ? '#1d1a15' : '#5f584b', weight: ri && ci === 2 ? 700 : ri ? 500 : 700, spacing: ri ? 0 : 2, max: ci === 2 ? 150 : 270 })));
      txt(c, T.sub, x + 36, y + h - 34, 22, { align: 'left', color: '#5f584b', weight: 500, max: w - 72 });
      say(c, W, H, T.say);
    } else if (k === 'lot') {
      grad(c, W, H, '#d8a86c', '#2a2420'); bg(c, W, H, img.pic || img.wall, 1.02);
      const w = 520, h = 330, x = (W - w) / 2, y = H - h - 40;
      c.fillStyle = '#d8d0bf'; rr(c, x, y, w, h + 40, 6); c.fill();
      txt(c, T.main, W / 2, y + 120, 64, { color: '#2a2420', weight: 700, spacing: 8 });
      txt(c, T.sub, W / 2, y + 190, 32, { color: '#2a2420', weight: 600, spacing: 3, max: w - 60 });
      say(c, W, H, T.say);
    } else if (k === 'door') {
      grad(c, W, H, '#2a3136', '#161b1e'); bg(c, W, H, img.pic, 1);
      const w = 420, h = 520, x = (W - w) / 2, y = (H - h) / 2;
      c.fillStyle = '#5d6a70'; rr(c, x, y, w, h, 8); c.fill();
      c.fillStyle = '#e3bc79'; c.beginPath(); c.arc(x + w - 50, y + h / 2 + 40, 12, 0, 7); c.fill();
      const pw = 320, ph = 150, px = (W - pw) / 2, py = y + 90;
      c.fillStyle = '#ece7dc'; rr(c, px, py, pw, ph, 6); c.fill();
      txt(c, T.main, W / 2, py + 72, 36, { color: '#1d1a15', weight: 700, spacing: 2, max: pw - 30 });
      txt(c, T.sub, W / 2, py + 116, 20, { color: '#5f584b', weight: 600, spacing: 3, max: pw - 30 });
      say(c, W, H, T.say);
    } else {
      grad(c, W, H, '#3a3029', '#221c18');
      const w = 760, h = 520, x = (W - w) / 2, y = (H - h) / 2 - 10;
      c.fillStyle = '#b8a27f'; rr(c, x, y, w, h, 18); c.fill();
      c.save(); rr(c, x + 40, y + 40, w - 80, h - 80, 10); c.clip();
      c.fillStyle = '#1f2a30'; c.fillRect(x + 40, y + 40, w - 80, h - 80);
      const m = img.live || img.pic || img.shot;
      if (m) { if (img.live) { c.translate(W, 0); c.scale(-1, 1); cover(c, m, W - (x + w - 40), y + 40, w - 80, h - 80, 1); } else cover(c, m, x + 40, y + 40, w - 80, h - 80, 1); }
      else { txt(c, T.main, W / 2, H / 2, 54, { weight: 700, spacing: 3, max: w - 140 }); txt(c, T.sub, W / 2, H / 2 + 56, 28, { color: '#e9c99c', weight: 500, max: w - 140 }); }
      c.restore();
      c.fillStyle = '#ffe1a0'; for (let b = 0; b < 7; b++) { const bx = x + 60 + b * ((w - 120) / 6); c.beginPath(); c.arc(bx, y + 18, 12, 0, 7); c.fill(); c.beginPath(); c.arc(bx, y + h - 18, 12, 0, 7); c.fill(); }
      say(c, W, H, T.say);
    }
    c.restore();
    c.fillStyle = 'rgba(8,8,10,.55)'; rr(c, 24, 26, 250, 44, 8); c.fill();
    txt(c, String(i + 1).padStart(2, '0') + ' · ' + S.BEATS[i][1].toUpperCase(), 40, 56, 20, { align: 'left', color: '#e9b25a', weight: 600, spacing: 4 });
    if (fade < 1) { c.fillStyle = 'rgba(0,0,0,' + (1 - fade).toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
  };

  g.SeeIt = S;
  if (typeof module !== 'undefined') module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
