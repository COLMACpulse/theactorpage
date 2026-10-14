/*
  SLATE MAKER v0.4 ENGINE
  Pure functions. No DOM. Browser (window.SlateEngine) and Node (module.exports).
    - the solo pan: one locked-off wide take -> a virtual camera that starts tight on your face
      and glides out to full body (or the reverse)
    - softness check: how much real picture the close-up has
    - slate script, take labels, kit checklist
    - store-only ZIP writer (kept from v0.3, it works)
  Boxes are normalized 0..1 of the source frame: {x, y, w, h}.
*/
(function (root) {
  'use strict';

  const TIGHT = { close: 2.6, medium: 4.0 }; // frame height as a multiple of face height
  const ASPECTS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1 };
  const OUT = { '1080': { '16:9': [1920, 1080], '9:16': [1080, 1920], '1:1': [1080, 1080] }, '720': { '16:9': [1280, 720], '9:16': [720, 1280], '1:1': [720, 720] } };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }; // easeInOutCubic

  // a window (source px) of the given aspect, centred on (cx, cy) with height h
  function win(cx, cy, h, aspect) { const w = h * aspect; return { x: cx - w / 2, y: cy - h / 2, w, h }; }

  // keep a window inside the source when it fits; when it can't fit, centre it (bars show on the overflow side)
  function fitInside(r, W, H) {
    const o = Object.assign({}, r);
    if (o.w <= W) o.x = clamp(o.x, 0, W - o.w); else o.x = (W - o.w) / 2;
    if (o.h <= H) o.y = clamp(o.y, 0, H - o.h); else o.y = (H - o.h) / 2;
    return o;
  }

  // close-up: face fills ~1/2.6 of frame height, eyes about a third down
  function faceWindow(face, W, H, aspect, opts) {
    opts = opts || {};
    const tight = TIGHT[opts.shot] || opts.tight || TIGHT.medium;
    const fx = face.x * W, fy = face.y * H, fw = face.w * W, fh = face.h * H;
    let h = Math.max(fh * tight, (fw * tight * 0.8) / aspect);
    const cx = fx + fw / 2;
    const cy = fy + fh / 2 + h * 0.12; // more room below the chin than above the head
    return fitInside(win(cx, cy, h, aspect), W, H);
  }
  // full body: head to toe with a margin, never cut off
  function bodyWindow(body, W, H, aspect, opts) {
    opts = opts || {};
    const m = opts.margin || 0.08;
    const bx = body.x * W, by = body.y * H, bw = body.w * W, bh = body.h * H;
    const h = Math.max(bh * (1 + 2 * m), (bw * (1 + 2 * m)) / aspect);
    return fitInside(win(bx + bw / 2, by + bh / 2, h, aspect), W, H);
  }

  // plan: {face, body, glideAt (s), glide (s), dir: 'out'|'in', inT, outT}
  // returns the source window at time t (seconds, source timeline)
  function windowAt(t, plan, W, H, aspect) {
    const a = ASPECTS[aspect] || aspect;
    const A = faceWindow(plan.face, W, H, a, { shot: plan.shot }), B = bodyWindow(plan.body, W, H, a);
    const [from, to] = plan.dir === 'in' ? [B, A] : [A, B];
    const p = ease((t - plan.glideAt) / Math.max(0.01, plan.glide));
    // zoom in log space so the move feels even, centre follows linearly
    const h = Math.exp(Math.log(from.h) + (Math.log(to.h) - Math.log(from.h)) * p);
    const fcx = from.x + from.w / 2, fcy = from.y + from.h / 2, tcx = to.x + to.w / 2, tcy = to.y + to.h / 2;
    const r = win(fcx + (tcx - fcx) * p, fcy + (tcy - fcy) * p, h, a);
    return fitInside(r, W, H);
  }

  // drawImage arguments for window r of a WxH source into an outW x outH canvas (bars where r leaves the source)
  function drawArgs(r, W, H, outW, outH) {
    const sx = Math.max(0, r.x), sy = Math.max(0, r.y), ex = Math.min(W, r.x + r.w), ey = Math.min(H, r.y + r.h);
    if (ex <= sx || ey <= sy) return null;
    const kx = outW / r.w, ky = outH / r.h;
    return [sx, sy, ex - sx, ey - sy, (sx - r.x) * kx, (sy - r.y) * ky, (ex - sx) * kx, (ey - sy) * ky];
  }

  // how sharp will it be? real source pixels behind each output pixel
  function softness(plan, W, H, aspect, res) {
    const [ow, oh] = OUT[res || '1080'][aspect];
    const a = ASPECTS[aspect];
    const f = faceWindow(plan.face, W, H, a, { shot: plan.shot }), b = bodyWindow(plan.body, W, H, a);
    const ratio = r => Math.min(r.h, H) / oh;
    const barsF = f.w > W + 1 || f.h > H + 1, barsB = b.w > W + 1 || b.h > H + 1;
    const fr = ratio(f);
    return {
      faceRatio: +fr.toFixed(2), bodyRatio: +ratio(b).toFixed(2), faceSourcePx: Math.round(Math.min(f.h, H)), outPx: oh,
      verdict: fr >= 0.95 ? 'sharp' : fr >= 0.7 ? 'ok' : 'soft',
      barsFace: barsF, barsBody: barsB
    };
  }

  // ---------------------------------------------------------------- words + kit
  function clean(v) { return String(v == null ? '' : v).trim(); }
  function slug(v) { return clean(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function slateScript(p) {
    p = p || {};
    const bits = [];
    bits.push(p.name ? `Hi, I'm ${clean(p.name)}.` : "Hi, I'm (your name).");
    if (p.role) bits.push(`I'm reading for ${clean(p.role)}.`);
    if (p.height) bits.push(`I'm ${clean(p.height)}.`);
    if (p.location) bits.push(`I'm based in ${clean(p.location)}.`);
    if (p.rep) bits.push(`I'm with ${clean(p.rep)}.`);
    return bits.join(' ');
  }
  function takeLabel(p) { return [slug(p.name), slug(p.project), slug(p.role), p.take ? 'take_' + slug(p.take) : '', slug(p.date)].filter(Boolean).join('__') || 'slate'; }
  function checklist(k) {
    const items = [['Name', !!clean(k.name)], ['Slate video', !!k.videos], ['Headshot', !!k.headshot], ['Résumé', !!k.resume], ['Links', !!clean(k.links)]];
    return { items, missing: items.filter(i => !i[1]).map(i => i[0]) };
  }

  // ---------------------------------------------------------------- ZIP (store only, from v0.3)
  const CRC = (function () { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ CRC[(c ^ b[i]) & 0xFF]; return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = s => new TextEncoder().encode(s);
  function makeZip(entries) {
    const parts = [], central = []; let off = 0;
    const u16 = n => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xFFFF, true); return b; };
    const u32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; };
    const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)), dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate());
    for (const e of entries) {
      const name = enc(e.name), data = e.bytes instanceof Uint8Array ? e.bytes : new Uint8Array(e.bytes), crc = crc32(data);
      [u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dt), u16(dd), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0)].forEach(x => parts.push(x));
      parts.push(name, data);
      central.push({ h: [u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dt), u16(dd), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)], name });
      off += 30 + name.length + data.length;
    }
    const cs = off; let csz = 0;
    central.forEach(c => { c.h.forEach(x => parts.push(x)); parts.push(c.name); csz += 46 + c.name.length; });
    [u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(csz), u32(cs), u16(0)].forEach(x => parts.push(x));
    let n = 0; parts.forEach(p => n += p.length); const out = new Uint8Array(n); let p = 0; parts.forEach(c => { out.set(c, p); p += c.length; });
    return out;
  }

  const api = { TIGHT, ASPECTS, OUT, ease, faceWindow, bodyWindow, windowAt, drawArgs, softness, fitInside, slateScript, takeLabel, checklist, crc32, makeZip, enc, slug };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SlateEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
