/* CHARACTER BANK · GRAPHS. What the numbers already say, drawn. Measured, never judged.
   MAP      your voices on one map: you in the middle; each voice left/right by pitch (semitones from yours),
            up/down by pace on the same lines (faster up), a line through it for its pitch range; voices that
            measure close are joined.
   CONTOUR  then and now: the pitch line through the reference take and through the come-back, same clock.
   HISTORY  every come-back: its pitch range and middle, by date, against the reference take's band.
   Plain SVG strings; colours are the page's tokens (--c-then, --c-now, --ink, --dim, --line). Hover and focus show
   the numbers (C.wire); every number is also in the words beside the graph. */
(function (root) {
  'use strict';
  const C = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const st = (a, b) => 12 * Math.log2(b / a);
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = hz => { const m = Math.round(69 + 12 * Math.log2(hz / 440)); return NOTES[(m % 12 + 12) % 12] + (Math.floor(m / 12) - 1); };
  const r1 = x => Math.round(x * 10) / 10;
  const nice = (lo, hi, n) => { const span = hi - lo, raw = span / (n || 4), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p, k = (m >= 5 ? 10 : m >= 2 ? 5 : m >= 1 ? 2 : 1) * p; const a = Math.floor(lo / k) * k, out = []; for (let v = a; v <= hi + 1e-9; v += k) if (v >= lo - 1e-9) out.push(+v.toFixed(6)); return out; };
  const tip = s => ' tabindex="0" data-tip="' + esc(s) + '"';
  /* drawn at the width it will show at, so text stays readable on a phone (12-13px), not shrunk from a desk drawing */
  let W = 640;
  C.size = function (w) { W = Math.max(300, Math.min(640, Math.round(w || (typeof window !== 'undefined' ? window.innerWidth - 64 : 640)))); return W; };
  /* Hz ticks: whole, distinct, inside the range */
  const hzTicks = (loHz, hiHz, n) => { const t = nice(loHz, hiHz, n || 4).filter(v => v > 0); const u = [...new Set(t.map(v => Math.round(v)))]; return u.length >= 2 ? u : [Math.round(loHz), Math.round(hiHz)].filter((v, i, a) => a.indexOf(v) === i); };
  /* labels that would sit on each other: the later one moves down a line */
  const unclash = labs => { const placed = []; labs.sort((a, b) => a.y - b.y).forEach(l => { let y = l.y; for (let k = 0; k < 6; k++) { const hit = placed.find(q => Math.abs(q.y - y) < 15 && Math.abs(q.x - l.x) < Math.max(q.w, l.w)); if (!hit) break; y = hit.y + 15; } l.y = y; placed.push(l); }); return labs; };

  /* brightness, clarity, steadiness against a reference, for a tooltip line */
  C.colour = function (a, ref) { if (!a) return ''; const W2 = [];
    if (a.brightHz) W2.push(ref && ref.brightHz ? (Math.abs(a.brightHz / ref.brightHz - 1) < 0.08 ? 'brightness about the same' : (a.brightHz > ref.brightHz ? 'brighter' : 'darker') + ' (' + a.brightHz + ' Hz)') : 'brightness ' + a.brightHz + ' Hz');
    if (a.clarityDb != null && ref && ref.clarityDb != null && Math.abs(a.clarityDb - ref.clarityDb) >= 1) W2.push(a.clarityDb > ref.clarityDb ? 'clearer' : 'breathier');
    if (a.wobbleDb && ref && ref.wobbleDb && Math.abs(a.wobbleDb / ref.wobbleDb - 1) >= 0.2) W2.push(a.wobbleDb > ref.wobbleDb ? 'shakier' : 'steadier');
    return W2.length ? '\n' + W2.join(', ') : ''; };
  /* ---------- MAP ---------- me: analysis of you as yourself; rows: [{id,name,an}]; pairs: from closePairs */
  C.mapData = function (me, rows) {
    if (!me || !me.pitchHz || !(me.spanSec > 0.5)) return null;
    return rows.filter(r => r.an && r.an.pitchHz && r.an.spanSec > 0.5).map(r => ({
      id: r.id, name: r.name, x: st(me.pitchHz, r.an.pitchHz), lo: r.an.pitchLoHz ? st(me.pitchHz, r.an.pitchLoHz) : null, hi: r.an.pitchHiHz ? st(me.pitchHz, r.an.pitchHiHz) : null,
      y: -(r.an.spanSec / me.spanSec - 1) * 100, an: r.an }));
  };
  C.map = function (me, rows, pairs) {
    const P = C.mapData(me, rows); if (!P) return ''; C.size();
    const H = 330, L = 44, R = 20, T = 18, B = 40, iw = W - L - R, ih = H - T - B;
    const xm = Math.max(6, ...P.map(p => Math.max(Math.abs(p.x), Math.abs(p.lo || 0), Math.abs(p.hi || 0)))) * 1.1, ym = Math.max(20, ...P.map(p => Math.abs(p.y))) * 1.15;
    const X = v => L + (v + xm) / (2 * xm) * iw, Y = v => T + (ym - v) / (2 * ym) * ih;
    let g = '<svg class="cg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Your voices on one map: pitch against yours across, pace against yours up and down">';
    nice(-xm, xm, W < 420 ? 2 : 4).forEach(v => { g += '<line class="grid" x1="' + X(v) + '" y1="' + T + '" x2="' + X(v) + '" y2="' + (T + ih) + '"/><text class="tick" x="' + X(v) + '" y="' + (T + ih + 16) + '" text-anchor="middle">' + (v === 0 ? 'your pitch' : Math.abs(v) + ' st ' + (v > 0 ? 'higher' : 'lower')) + '</text>'; });
    nice(-ym, ym, 4).forEach(v => { g += '<line class="grid" x1="' + L + '" y1="' + Y(v) + '" x2="' + (L + iw) + '" y2="' + Y(v) + '"/><text class="tick" x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v === 0 ? 'you' : Math.abs(Math.round(v)) + '%') + '</text>'; });
    g += '<line class="axis0" x1="' + X(0) + '" y1="' + T + '" x2="' + X(0) + '" y2="' + (T + ih) + '"/><line class="axis0" x1="' + L + '" y1="' + Y(0) + '" x2="' + (L + iw) + '" y2="' + Y(0) + '"/>';
    g += '<text class="tick" x="' + (L + 4) + '" y="' + (T + 12) + '">faster</text><text class="tick" x="' + (L + 4) + '" y="' + (T + ih - 6) + '">slower</text>';
    const byId = Object.fromEntries(P.map(p => [p.id, p]));
    (pairs || []).forEach(q => { const a = byId[q.a.id], b = byId[q.b.id]; if (a && b) g += '<line class="pairline" x1="' + X(a.x) + '" y1="' + Y(a.y) + '" x2="' + X(b.x) + '" y2="' + Y(b.y) + '"/>'; });
    P.forEach(p => { if (p.lo != null && p.hi != null) g += '<line class="range now" x1="' + X(p.lo) + '" y1="' + Y(p.y) + '" x2="' + X(p.hi) + '" y2="' + Y(p.y) + '"/>'; });
    g += '<g' + tip('You, as yourself\n' + Math.round(me.pitchHz) + ' Hz (' + note(me.pitchHz) + '), ' + me.spanSec + ' s for the lines') + '><circle class="hit" cx="' + X(0) + '" cy="' + Y(0) + '" r="14"/><circle class="me" cx="' + X(0) + '" cy="' + Y(0) + '" r="6"/></g>';
    P.forEach(p => {
      const words = p.name + '\n' + Math.abs(r1(p.x)) + ' st ' + (p.x >= 0 ? 'higher' : 'lower') + ' than you, ' + Math.abs(Math.round(p.y)) + '% ' + (p.y >= 0 ? 'faster' : 'slower')
        + (p.lo != null ? '\nrange ' + Math.round(p.an.pitchLoHz) + '–' + Math.round(p.an.pitchHiHz) + ' Hz (' + p.an.rangeSt + ' st)' : '') + '\npauses ' + p.an.silencePct + '% of the take' + C.colour(p.an, me);
      g += '<g' + tip(words) + '><circle class="hit" cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="14"/><circle class="dot now" cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="5"/></g>';
    });
    unclash(P.map(p => { const right = X(p.x) < L + iw * 0.7, w = String(p.name).length * 7.2; return { p, right, w, x: right ? X(p.x) : X(p.x) - w, y: Y(p.y) - 9 }; }))
      .forEach(l => { const ax = X(l.p.x) + (l.right ? 10 : -10); g += (Math.abs(l.y - (Y(l.p.y) - 9)) > 1 ? '<line class="leader" x1="' + X(l.p.x) + '" y1="' + Y(l.p.y) + '" x2="' + ax + '" y2="' + (l.y - 4) + '"/>' : '') + '<text class="lab" x="' + ax + '" y="' + l.y + '" text-anchor="' + (l.right ? 'start' : 'end') + '">' + esc(l.p.name) + '</text>'; });
    return g + '</svg>';
  };

  /* ---------- CONTOUR ---------- then, now: analyses with .contour */
  C.contour = function (then, now) {
    const A = then && then.contour, Bq = now && now.contour; if (!A || !A.length || !Bq || !Bq.length) return ''; C.size();
    const H = 260, L = 64, R = 46, T = 14, B = 34, iw = W - L - R, ih = H - T - B, pts = [...A, ...Bq].filter(Boolean);
    const tmax = Math.max(...pts.map(p => p[0])) || 1, ref = then.pitchHz || pts[0][1];
    const sv = hz => st(ref, hz), lo = Math.min(...pts.map(p => sv(p[1]))) - 1, hi = Math.max(...pts.map(p => sv(p[1]))) + 1;
    const X = t => L + t / tmax * iw, Y = v => T + (hi - v) / (hi - lo) * ih;
    const path = c => { let d = '', pen = false; c.forEach(p => { if (!p) { pen = false; return; } d += (pen ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(sv(p[1])).toFixed(1); pen = true; }); return d; };
    let g = '<svg class="cg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Pitch through the take, then and now">';
    hzTicks(ref * Math.pow(2, lo / 12), ref * Math.pow(2, hi / 12), 4).forEach(hz => { const v = sv(hz); if (v < lo || v > hi) return; g += '<line class="grid" x1="' + L + '" y1="' + Y(v) + '" x2="' + (L + iw) + '" y2="' + Y(v) + '"/><text class="tick" x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + hz + ' Hz</text>'; });
    nice(0, tmax, W < 420 ? 3 : 5).forEach(v => { g += '<text class="tick" x="' + X(v) + '" y="' + (T + ih + 18) + '" text-anchor="middle">' + v + ' s</text>'; });
    g += '<path class="line then" d="' + path(A) + '"/><path class="line now" d="' + path(Bq) + '"/>';
    const end = c => { const f = c.filter(Boolean); return f[f.length - 1]; }, ea = end(A), eb = end(Bq);
    let ya = Y(sv(ea[1])), yb = Y(sv(eb[1])); if (Math.abs(ya - yb) < 14 && Math.abs(X(ea[0]) - X(eb[0])) < 50) { if (ya < yb) { ya -= 7; yb += 7; } else { ya += 7; yb -= 7; } }
    g += '<text class="lab" x="' + (X(ea[0]) + 6) + '" y="' + (ya + 4) + '">then</text><text class="lab" x="' + (X(eb[0]) + 6) + '" y="' + (yb + 4) + '">now</text>';
    g += '<line class="xhair" x1="0" y1="' + T + '" x2="0" y2="' + (T + ih) + '" style="display:none"/>';
    g += '<rect class="hitarea" x="' + L + '" y="' + T + '" width="' + iw + '" height="' + ih + '" data-contour=\'' + esc(JSON.stringify({ W, L, iw, tmax, A, B: Bq })) + '\' tabindex="0" aria-label="Move along the line to read both"/>';
    return g + '</svg>';
  };
  /* the reading at a time: the nearest point of each, within a fifth of a second */
  C.at = function (c, t) { let best = null, d = 0.2; (c || []).forEach(p => { if (p && Math.abs(p[0] - t) < d) { d = Math.abs(p[0] - t); best = p; } }); return best; };

  /* ---------- HISTORY ---------- ref: reference take; rets: come-back takes, oldest first */
  C.history = function (ref, rets, when) {
    const R0 = ref && ref.an; const P = (rets || []).filter(t => t.an && t.an.pitchHz && t.an.pitchLoHz);
    if (!R0 || !R0.pitchHz || P.length < 1) return ''; C.size();
    const H = 250, L = 64, R = 20, T = 16, B = 36, iw = W - L - R, ih = H - T - B, ref0 = R0.pitchHz;
    const v = hz => st(ref0, hz), all = [R0.pitchLoHz, R0.pitchHiHz, ...P.map(t => t.an.pitchLoHz), ...P.map(t => t.an.pitchHiHz)].filter(Boolean).map(v);
    const lo = Math.min(...all) - 1, hi = Math.max(...all) + 1, n = P.length, slot = iw / (n + 1);
    const X = i => L + slot * (i + 1), Y = s => T + (hi - s) / (hi - lo) * ih;
    let g = '<svg class="cg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Every come-back: its pitch range against the reference take">';
    hzTicks(ref0 * Math.pow(2, lo / 12), ref0 * Math.pow(2, hi / 12), 4).forEach(hz => { const s2 = v(hz); if (s2 < lo || s2 > hi) return; g += '<line class="grid" x1="' + L + '" y1="' + Y(s2) + '" x2="' + (L + iw) + '" y2="' + Y(s2) + '"/><text class="tick" x="' + (L - 6) + '" y="' + (Y(s2) + 4) + '" text-anchor="end">' + hz + ' Hz</text>'; });
    if (R0.pitchLoHz && R0.pitchHiHz) g += '<rect class="band then" x="' + L + '" y="' + Y(v(R0.pitchHiHz)) + '" width="' + iw + '" height="' + (Y(v(R0.pitchLoHz)) - Y(v(R0.pitchHiHz))) + '"/>';
    g += '<line class="refline then" x1="' + L + '" y1="' + Y(0) + '" x2="' + (L + iw) + '" y2="' + Y(0) + '"/>';
    const bw = Math.min(12, slot * 0.35);
    P.forEach((t, i) => { const a = t.an, x = X(i), y1 = Y(v(a.pitchHiHz)), y2 = Y(v(a.pitchLoHz)), d = v(a.pitchHz);
      const words = (when ? when(t) : t.at) + (t.cold ? ' (cold)' : '') + '\nmiddle ' + Math.round(a.pitchHz) + ' Hz, ' + (Math.abs(d) < 0.75 ? 'about the same as then' : Math.abs(r1(d)) + ' st ' + (d > 0 ? 'higher' : 'lower') + ' than then') + '\nrange ' + Math.round(a.pitchLoHz) + '–' + Math.round(a.pitchHiHz) + ' Hz' + C.colour(a, R0);
      g += '<g' + tip(words) + '><rect class="hit" x="' + (x - 14) + '" y="' + (y1 - 8) + '" width="28" height="' + (y2 - y1 + 16) + '"/><rect class="bar now" x="' + (x - bw / 2) + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(2, y2 - y1) + '" rx="' + Math.min(4, bw / 2) + '"/><circle class="dot mid" cx="' + x + '" cy="' + Y(d) + '" r="4.5"/></g>';
      if (n <= (W < 420 ? 5 : 8) || i === 0 || i === n - 1) g += '<text class="tick" x="' + x + '" y="' + (T + ih + 18) + '" text-anchor="middle">' + esc(when ? when(t, true) : '') + '</text>'; });
    return g + '</svg>';
  };

  /* ---------- hover and focus: one tooltip, textContent only ---------- */
  C.wire = function (rootEl) {
    if (!rootEl || typeof document === 'undefined') return;
    let tt = document.getElementById('cgtip'); if (!tt) { tt = document.createElement('div'); tt.id = 'cgtip'; tt.setAttribute('role', 'status'); document.body.appendChild(tt); }
    const show = (txt, x, y) => { tt.textContent = ''; txt.split('\n').forEach((l, i) => { const d = document.createElement('div'); d.textContent = l; if (!i) d.className = 'h'; tt.appendChild(d); }); tt.style.display = 'block'; const w = tt.offsetWidth; tt.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + 'px'; tt.style.top = (y - tt.offsetHeight - 12 + window.scrollY) + 'px'; };
    const hide = () => { tt.style.display = 'none'; };
    hide(); if (!C._sc) { C._sc = true; window.addEventListener('scroll', () => { const t = document.getElementById('cgtip'); if (t) t.style.display = 'none'; }, { passive: true }); }
    rootEl.querySelectorAll('[data-tip]').forEach(el => {
      const on = () => { const b = el.getBoundingClientRect(); show(el.dataset.tip, b.left + b.width / 2, b.top); el.classList.add('on'); };
      const off = () => { hide(); el.classList.remove('on'); };
      el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off); el.addEventListener('focus', on); el.addEventListener('blur', off);
    });
    rootEl.querySelectorAll('[data-contour]').forEach(el => {
      const D = JSON.parse(el.dataset.contour), svg = el.ownerSVGElement, xh = svg.querySelector('.xhair');
      const at = clientX => { const b = svg.getBoundingClientRect(), sx = (clientX - b.left) / b.width * D.W; return Math.max(0, Math.min(D.tmax, (sx - D.L) / D.iw * D.tmax)); };
      const read = t => { const a = C.at(D.A, t), b = C.at(D.B, t); return t.toFixed(1) + ' s\nthen: ' + (a ? Math.round(a[1]) + ' Hz' : 'no pitch') + '\nnow: ' + (b ? Math.round(b[1]) + ' Hz' : 'no pitch'); };
      const move = (t, cx, cy) => { const x = D.L + t / D.tmax * D.iw; xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.style.display = ''; show(read(t), cx, cy); };
      el.addEventListener('pointermove', e => { const b = svg.getBoundingClientRect(); move(at(e.clientX), e.clientX, b.top + 10); });
      el.addEventListener('pointerleave', () => { xh.style.display = 'none'; hide(); });
      let kt = 0; el.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); kt = Math.max(0, Math.min(D.tmax, kt + (e.key === 'ArrowRight' ? 0.2 : -0.2))); const b = svg.getBoundingClientRect(); move(kt, b.left + (D.L + kt / D.tmax * D.iw) / D.W * b.width, b.top + 10); });
      el.addEventListener('blur', () => { xh.style.display = 'none'; hide(); });
    });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = C; else root.CPSCharts = C;
})(typeof window !== 'undefined' ? window : globalThis);
