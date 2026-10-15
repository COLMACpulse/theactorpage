/*
  CPS v0.2 ENGINE · Character Preservation
  Pure functions. No DOM. Browser (window.CPSEngine) and Node (module.exports).
    - analyse a recording: pitch (median, range), level, pauses, time to say it
    - compare then vs now in plain words. It reports what changed. It never scores you.
    - character state, return-sequence steps, store-only ZIP write + read
  The actor finds the character. This keeps it.
*/
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- audio analysis
  function toMono16k(chans, sr) {
    const n = chans[0].length, mono = new Float32Array(n);
    for (let c = 0; c < chans.length; c++) { const d = chans[c]; for (let i = 0; i < n; i++) mono[i] += d[i] / chans.length; }
    const step = sr / 16000;
    if (Math.abs(step - 1) < 1e-6) return mono;
    const m = Math.floor(n / step), out = new Float32Array(m);
    for (let i = 0; i < m; i++) { const a = Math.floor(i * step), b = Math.max(a + 1, Math.floor((i + 1) * step)); let s = 0; for (let j = a; j < b && j < n; j++) s += mono[j]; out[i] = s / (b - a); }
    return out;
  }
  const pct = (arr, p) => { if (!arr.length) return NaN; const a = Float64Array.from(arr).sort(); const k = (a.length - 1) * p, lo = Math.floor(k), hi = Math.ceil(k); return a[lo] + (a[hi] - a[lo]) * (k - lo); };

  // YIN-style pitch for one frame (16 kHz). Returns Hz or 0.
  function yin(frame, sr, fmin, fmax) {
    const tmin = Math.floor(sr / fmax), tmax = Math.min(Math.floor(sr / fmin), frame.length - 2);
    const W = frame.length - tmax; if (W < 64) return 0;
    const d = new Float32Array(tmax + 1);
    for (let t = 1; t <= tmax; t++) { let s = 0; for (let i = 0; i < W; i++) { const x = frame[i] - frame[i + t]; s += x * x; } d[t] = s; }
    let run = 0; const cm = new Float32Array(tmax + 1); cm[0] = 1;
    for (let t = 1; t <= tmax; t++) { run += d[t]; cm[t] = run ? d[t] * t / run : 1; }
    let tau = -1;
    for (let t = tmin; t <= tmax; t++) { if (cm[t] < 0.15) { while (t + 1 <= tmax && cm[t + 1] < cm[t]) t++; tau = t; break; } }
    if (tau < 0) return 0;
    const a = cm[tau - 1] || cm[tau], b = cm[tau], c = cm[tau + 1] || cm[tau];
    const den = a - 2 * b + c, shift = den ? 0.5 * (a - c) / den : 0;
    return sr / (tau + (Math.abs(shift) < 1 ? shift : 0));
  }

  // channels: [Float32Array...], sampleRate. Returns plain numbers.
  function analyse(chans, sampleRate) {
    const sr = 16000, x = toMono16k(chans, sampleRate);
    const hop = 160, win = 640; // 10 ms hop, 40 ms window
    const nF = Math.max(0, Math.floor((x.length - win) / hop));
    const db = new Float32Array(nF);
    for (let f = 0; f < nF; f++) { let s = 0; const o = f * hop; for (let i = 0; i < win; i++) s += x[o + i] * x[o + i]; db[f] = 10 * Math.log10(s / win + 1e-12); }
    const dur = x.length / sr;
    if (!nF) return { dur: +dur.toFixed(2), speechSec: 0, spanSec: 0, silencePct: 100, levelDb: null, pitchHz: null, pitchLoHz: null, pitchHiHz: null, rangeSt: null, voicedPct: 0 };
    const floor = pct(db, 0.1), peak = pct(db, 0.98);
    const thr = Math.max(floor + 12, peak - 35);
    const speech = Array.from(db, v => v > thr);
    // fill gaps under 120 ms so word gaps are not counted as silence
    for (let f = 0; f < nF;) { if (!speech[f]) { let g = f; while (g < nF && !speech[g]) g++; if (f > 0 && g < nF && g - f <= 12) for (let k = f; k < g; k++) speech[k] = true; f = g; } else f++; }
    const sp = speech.filter(Boolean).length, speechSec = sp * hop / sr;
    const first = speech.indexOf(true), last = speech.lastIndexOf(true);
    const spanSec = first < 0 ? 0 : (last - first + 1) * hop / sr;
    const levels = []; for (let f = 0; f < nF; f++) if (speech[f]) levels.push(db[f]);
    // pitch on speech frames (every 2nd frame is plenty)
    const hz = [];
    for (let f = 0; f < nF; f += 2) {
      if (!speech[f] || db[f] < thr + 3) continue;
      const fr = x.subarray(f * hop, f * hop + win), p = yin(fr, sr, 60, 500);
      if (p > 60 && p < 500) hz.push(p);
    }
    const med = pct(hz, 0.5), lo = pct(hz, 0.1), hi = pct(hz, 0.9);
    return {
      dur: +dur.toFixed(2), speechSec: +speechSec.toFixed(2), silencePct: +(100 * (1 - sp / Math.max(1, last - first + 1))).toFixed(1),
      levelDb: levels.length ? +(levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1) : null,
      pitchHz: hz.length >= 5 ? +med.toFixed(1) : null, pitchLoHz: hz.length >= 5 ? +lo.toFixed(1) : null, pitchHiHz: hz.length >= 5 ? +hi.toFixed(1) : null,
      rangeSt: hz.length >= 5 ? +(12 * Math.log2(hi / lo)).toFixed(1) : null,
      spanSec: +spanSec.toFixed(2),
      voicedPct: +(100 * hz.length / Math.max(1, Math.ceil(sp / 2))).toFixed(0)
    };
  }

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function noteName(hz) { if (!hz) return '-'; const m = Math.round(69 + 12 * Math.log2(hz / 440)); return NOTES[(m % 12 + 12) % 12] + (Math.floor(m / 12) - 1); }
  const st = (a, b) => 12 * Math.log2(b / a);

  // then vs now, in plain words. No score, no verdict.
  function compare(a, b) {
    const rows = [], say = [];
    const row = (key, label, then, now, delta, words) => { rows.push({ key, label, then, now, delta, words }); if (words) say.push(words); };
    if (a.pitchHz && b.pitchHz) {
      const d = st(a.pitchHz, b.pitchHz);
      row('pitch', 'Pitch', `${Math.round(a.pitchHz)} Hz (${noteName(a.pitchHz)})`, `${Math.round(b.pitchHz)} Hz (${noteName(b.pitchHz)})`, +d.toFixed(1),
        Math.abs(d) < 0.75 ? 'Pitch: about the same.' : `Pitch: ${Math.abs(d).toFixed(1)} semitones ${d > 0 ? 'higher' : 'lower'} now.`);
    } else row('pitch', 'Pitch', a.pitchHz ? Math.round(a.pitchHz) + ' Hz' : '-', b.pitchHz ? Math.round(b.pitchHz) + ' Hz' : '-', null, 'Pitch: not enough voiced sound to compare.');
    if (a.rangeSt != null && b.rangeSt != null) {
      const d = b.rangeSt - a.rangeSt;
      row('range', 'Pitch range', a.rangeSt + ' st', b.rangeSt + ' st', +d.toFixed(1), Math.abs(d) < 1.5 ? 'Range: about the same.' : `Range: ${d > 0 ? 'wider' : 'flatter'} now (${a.rangeSt} → ${b.rangeSt} semitones).`);
    }
    if (a.spanSec > 0.5 && b.spanSec > 0.5) {
      const r = b.spanSec / a.spanSec;
      row('time', 'Time to say it', a.spanSec + ' s', b.spanSec + ' s', +((r - 1) * 100).toFixed(0), Math.abs(r - 1) < 0.08 ? 'Time to say it: about the same.' : `Time to say it: ${a.spanSec} s then, ${b.spanSec} s now (${Math.round(Math.abs(r - 1) * 100)}% ${r < 1 ? 'quicker' : 'slower'}). Only meaningful if you said the same lines.`);
    }
    {
      const d = b.silencePct - a.silencePct;
      row('silence', 'Pauses (share of the take)', a.silencePct + '%', b.silencePct + '%', +d.toFixed(0), Math.abs(d) < 5 ? 'Pauses: about the same.' : `Pauses: ${d > 0 ? 'more' : 'fewer'} now (${a.silencePct}% → ${b.silencePct}% of the take).`);
    }
    if (a.levelDb != null && b.levelDb != null) {
      const d = b.levelDb - a.levelDb;
      row('level', 'Level (depends on mic distance)', a.levelDb + ' dB', b.levelDb + ' dB', +d.toFixed(1), Math.abs(d) < 3 ? null : `Level: ${d > 0 ? 'louder' : 'quieter'} now by ${Math.abs(d).toFixed(0)} dB (could just be mic distance).`);
    }
    return { rows, say };
  }

  // ---------------------------------------------------------------- character
  const STATES = { found: 'Found', kept: 'Kept', resting: 'Resting', inuse: 'Back in use' };
  function have(c) {
    const takes = c.takes || [], looks = c.looks || [];
    return { voice: takes.some(t => t.kind === 'voice'), look: looks.length > 0, note: takes.some(t => t.kind === 'note') || !!String(c.notes || '').trim(), line: !!String(c.anchorLine || '').trim() };
  }
  // Found until it has a voice take and one more anchor (look or line); then Kept. Resting / Back in use are yours to set.
  function autoState(c) { if (c.state === 'resting' || c.state === 'inuse') return c.state; const h = have(c); return h.voice && (h.look || h.line) ? 'kept' : 'found'; }
  function missing(c) { const h = have(c), m = []; if (!h.voice) m.push('a voice take'); if (!h.look) m.push('a photo or sketch'); if (!h.line) m.push('the line that drops you in'); if (!h.note) m.push('what you found'); return m; }
  function reference(c) { const t = (c.takes || []).filter(x => x.kind === 'voice' || x.kind === 'return'); return t.find(x => x.id === c.refId) || t.find(x => x.kind === 'voice') || null; }
  function daysSince(iso, now) { return Math.floor(((now ? new Date(now) : new Date()) - new Date(iso)) / 86400000); }

  // ---------------------------------------------------------------- ZIP (store only) write + read
  const CRC = (function () { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ CRC[(c ^ b[i]) & 0xFF]; return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = s => new TextEncoder().encode(s), dec = b => new TextDecoder().decode(b);
  function makeZip(entries) {
    const parts = [], central = []; let off = 0;
    const u16 = n => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xFFFF, true); return b; };
    const u32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; };
    for (const e of entries) {
      const name = enc(e.name), data = e.bytes instanceof Uint8Array ? e.bytes : new Uint8Array(e.bytes), crc = crc32(data);
      [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)].forEach(x => parts.push(x)); parts.push(name, data);
      central.push({ h: [u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)], name });
      off += 30 + name.length + data.length;
    }
    const cs = off; let csz = 0; central.forEach(c => { c.h.forEach(x => parts.push(x)); parts.push(c.name); csz += 46 + c.name.length; });
    [u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(csz), u32(cs), u16(0)].forEach(x => parts.push(x));
    let n = 0; parts.forEach(p => n += p.length); const out = new Uint8Array(n); let q = 0; parts.forEach(c => { out.set(c, q); q += c.length; }); return out;
  }
  // reads stored (uncompressed) zips, which is what CPS writes. Deflated entries are reported, not guessed.
  function readZip(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Not a zip file.');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged zip.');
      const method = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true), size = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = dec(u8.subarray(p + 46, p + 46 + nl));
      const lnl = dv.getUint16(lo + 26, true), lxl = dv.getUint16(lo + 28, true), start = lo + 30 + lnl + lxl;
      if (method !== 0) throw new Error('This zip was re-compressed (' + name + '). Use the file CPS saved.');
      const data = u8.slice(start, start + size);
      if (crc32(data) !== crc) throw new Error('Damaged file inside the zip: ' + name);
      out[name] = data; p += 46 + nl + xl + cl;
    }
    return out;
  }

  // ---------------------------------------------------------------- voices: every character reads the same lines
  // so their numbers line up. Facts only: no score, no "best voice".
  const DEFAULT_LINES = 'The package came at nine forty-two. Three folders, one torn label, and a note that said: check the second drawer before you call.\n' +
    'Wait. Don\'t go yet. I need you to hear this.\n' +
    'Fine. You win. But I\'m not sorry, and I won\'t pretend I am.';
  const linesKey = s => { const t = String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + t.length; };
  // newest same-lines take for the current lines
  function linesTake(c, key) { return (c.takes || []).filter(t => t.kind === 'lines' && t.linesKey === key && t.an).sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] || null; }
  // one character against you (as yourself), same lines. Plain words.
  function vsMe(me, a) {
    const out = [];
    if (me.pitchHz && a.pitchHz) { const d = st(me.pitchHz, a.pitchHz); out.push(Math.abs(d) < 0.75 ? 'pitch about yours' : `${Math.abs(d).toFixed(1)} semitones ${d > 0 ? 'higher' : 'lower'} than you`); }
    if (me.rangeSt != null && a.rangeSt != null) { const d = a.rangeSt - me.rangeSt; if (Math.abs(d) >= 1.5) out.push(d > 0 ? 'wider range' : 'flatter'); }
    if (me.spanSec > 0.5 && a.spanSec > 0.5) { const r = a.spanSec / me.spanSec; out.push(Math.abs(r - 1) < 0.08 ? 'your pace' : `${Math.round(Math.abs(r - 1) * 100)}% ${r > 1 ? 'slower' : 'faster'}`); }
    { const d = a.silencePct - me.silencePct; if (Math.abs(d) >= 5) out.push(`${d > 0 ? 'more' : 'fewer'} pauses (${a.silencePct}% vs ${me.silencePct}%)`); }
    return out;
  }
  // pairs of voices that measure close on the same lines: pitch within stMax semitones AND time within timeMax.
  // rows: [{id, name, an}]. Returns [{a, b, st, time}] closest first. It says they measure close; whether they sound alike is yours to hear.
  function closePairs(rows, stMax, timeMax) {
    stMax = stMax == null ? 1.5 : stMax; timeMax = timeMax == null ? 0.10 : timeMax;
    const out = [];
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
      const A = rows[i].an, B = rows[j].an; if (!A || !B || !A.pitchHz || !B.pitchHz || !(A.spanSec > 0.5) || !(B.spanSec > 0.5)) continue;
      const d = Math.abs(st(A.pitchHz, B.pitchHz)), t = Math.abs(B.spanSec / A.spanSec - 1);
      if (d <= stMax && t <= timeMax) out.push({ a: rows[i], b: rows[j], st: +d.toFixed(1), time: Math.round(t * 100) });
    }
    return out.sort((x, y) => (x.st - y.st) || (x.time - y.time));
  }

  const api = { DEFAULT_LINES, linesKey, linesTake, vsMe, closePairs, analyse, compare, noteName, STATES, have, autoState, missing, reference, daysSince, makeZip, readZip, crc32, enc, dec, yin, toMono16k };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CPSEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
