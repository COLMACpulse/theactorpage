/* FOOTAGE: what's in a folder (Col, Oct 28: "i point it at a folder, the system recognizes what is available, what will
   work/what needs work, and asks me which files i want to upload"). Every file is read on this device; nothing leaves it.
   Zips are opened and the videos inside are read too. Each file lands in one pile:
     ready   plays as is (this browser opened it), with its length and picture size
     twice   the same clip again (same length, and nearly the same size or the same name); the bigger one that plays is kept
     work    a video this browser can't play, with what it is (read from its own bytes) and what to do
     notvid  not a video: an editor's project file, a picture, anything else, with what it is
   FootScan.scan(entries, {probe, sniff, onP, online}) -> {ready, twice, work, notvid, online, files, zips}
     entries: [{path, file}]   probe(file) -> {ok, secs, w, h}   sniff(file) -> {container, video}   online: [{name, size}] */
(function (g) {
  'use strict';
  const VID = /\.(mp4|m4v|mov|webm|mkv|avi|wmv|mts|m2ts|mxf|mpg|mpeg|3gp|r3d|braw|ari|crm|mp3|m4a|wav|aac)$/i;
  const PLAYABLE = /\.(mp4|m4v|mov|webm|mp3|m4a|wav)$/i;       /* what the host takes, and a browser may play */
  const CAMERA = { mxf: 'MXF, straight off a pro camera', r3d: 'RED RAW', braw: 'Blackmagic RAW', ari: 'ARRI RAW', crm: 'Canon RAW', mts: 'AVCHD from a camcorder', m2ts: 'AVCHD from a camcorder', avi: 'AVI, an old Windows format', wmv: 'Windows Media', mkv: 'MKV', mpg: 'MPEG-2', mpeg: 'MPEG-2', '3gp': '3GP, an old phone format', aac: 'AAC sound' };
  const PROJECT = { vpb: 'a VideoPad project', vpj: 'a VideoPad project', prproj: 'a Premiere Pro project', drp: 'a DaVinci Resolve project', fcpxml: 'a Final Cut project', fcpbundle: 'a Final Cut library', aep: 'an After Effects project', veg: 'a Vegas project', wlmp: 'a Movie Maker project', imovieproj: 'an iMovie project', mlt: 'a Shotcut project', kdenlive: 'a Kdenlive project', cos2: 'an editing app’s settings file', camproj: 'a Camtasia project', tscproj: 'a Camtasia project' };
  const PIC = /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp)$/i;
  const ext = n => ((String(n).match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
  const S = {};

  /* ---------- zips: read the list at the end of the file, then each entry's bytes ---------- */
  async function u8(blob, a, n) { return new Uint8Array(await blob.slice(a, a + n).arrayBuffer()); }
  const r16 = (b, i) => b[i] | (b[i + 1] << 8), r32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
  S.zipList = async function (file) {
    const tail = Math.min(file.size, 65557), t = await u8(file, file.size - tail, tail); let e = -1;
    for (let i = t.length - 22; i >= 0; i--) if (r32(t, i) === 0x06054b50) { e = i; break; }
    if (e < 0) return null;
    const count = r16(t, e + 10), cdSize = r32(t, e + 12), cdOff = r32(t, e + 16);
    if (cdOff === 0xffffffff || cdSize === 0xffffffff) return { big: true, entries: [] };
    const cd = await u8(file, cdOff, cdSize), out = []; let p = 0;
    for (let k = 0; k < count && p + 46 <= cd.length; k++) {
      if (r32(cd, p) !== 0x02014b50) break;
      const method = r16(cd, p + 10), csize = r32(cd, p + 20), size = r32(cd, p + 24), nl = r16(cd, p + 28), xl = r16(cd, p + 30), cl = r16(cd, p + 32), lho = r32(cd, p + 42);
      const name = new TextDecoder().decode(cd.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
      if (name.endsWith('/') || /(^|\/)(__MACOSX|\._)/.test(name)) continue;
      out.push({ name, method, csize, size, lho });
    }
    return { entries: out };
  };
  S.zipFile = async function (file, en) {
    const h = await u8(file, en.lho, 30); if (r32(h, 0) !== 0x04034b50) return null;
    const start = en.lho + 30 + r16(h, 26) + r16(h, 28), raw = file.slice(start, start + en.csize), nm = en.name.split('/').pop();
    if (en.method === 0) return new File([raw], nm, { type: '' });
    if (en.method === 8 && g.DecompressionStream) { const b = await new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob(); return new File([b], nm); }
    return null;
  };

  /* ---------- the same clip twice ---------- */
  const stem = n => String(n).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/\(\d+\)/g, '').replace(/comp(ressed)?|copy|final|export|_dl|\d+/g, '').replace(/[^a-z]+/g, '');
  function sameClip(a, b) {
    if (!a.secs || !b.secs || Math.abs(a.secs - b.secs) > 0.6) return false;
    if (a.size === b.size) return true;
    const near = Math.abs(a.size - b.size) / Math.max(a.size, b.size) < 0.03, sa = stem(a.name), sb = stem(b.name);
    const named = sa.length >= 3 && sb.length >= 3 && (sa.startsWith(sb) || sb.startsWith(sa));
    return near || named;
  }

  S.why = function (w, n) {
    w = w || {}; const x = ext(n);
    if (CAMERA[x]) return { what: CAMERA[x] + '.', fix: 'Browsers don’t play it. Export an H.264 MP4 from your editor and add that.' };
    if (w.video === 'HEVC') return { what: 'HEVC, what an iPhone records on its default "High Efficiency" setting.', fix: 'Add it from Footage on the iPhone it came from (Safari plays it), or export H.264. For next time: iPhone Settings › Camera › Formats › Most Compatible.' };
    if (w.container === 'MOV' && !w.video) return { what: 'A camera or editor format like ProRes.', fix: 'Export an H.264 copy from your editor and add that.' };
    if (!w.container || w.container === 'unknown') return { what: 'A format this browser can’t read.', fix: 'Export an H.264 MP4 from your editor and add that.' };
    return { what: [w.container, w.video].filter(Boolean).join(', ') + ', which should play, so the file may be damaged or still copying.', fix: 'Copy it again, or export a fresh H.264 copy.' };
  };
  S.notWhat = function (n) {
    const x = ext(n);
    if (PROJECT[x]) return { what: n.split('/').pop() + ' is ' + PROJECT[x] + ', not a video.', fix: 'Open it in that app and export the video as MP4, then add that.' };
    if (PIC.test(n)) return { what: 'A picture.', fix: '' };
    if (x === 'zip') return { what: 'A zip with no videos in it.', fix: '' };
    return { what: 'Not a video.', fix: '' };
  };

  S.scan = async function (entries, o) {
    o = o || {}; const probe = o.probe, sniff = o.sniff, tick = o.onP || (() => { });
    const vids = [], notvid = [], zips = []; let done = 0;
    for (const e of entries) {
      const n = e.path || e.file.name;
      if (/(^|\/)(\.|__MACOSX)/.test(n) || /(^|\/)(Thumbs\.db|desktop\.ini)$/i.test(n)) continue;
      if (ext(n) === 'zip') {
        const L = await S.zipList(e.file).catch(() => null); const inside = L ? L.entries.filter(x => VID.test(x.name)) : [];
        zips.push({ path: n, videos: inside.length, big: !!(L && L.big) });
        if (L && L.big) { notvid.push({ path: n, name: n.split('/').pop(), size: e.file.size, what: 'A zip over 4 GB.', fix: 'Unzip it first, then add the folder.' }); continue; }
        if (!inside.length) { notvid.push(Object.assign({ path: n, name: n.split('/').pop(), size: e.file.size }, S.notWhat(n))); continue; }
        for (const en of inside) vids.push({ path: n + ' › ' + en.name, name: en.name.split('/').pop(), size: en.size, from: n.split('/').pop(), zip: { file: e.file, en } });
        continue;
      }
      if (!VID.test(n)) { notvid.push(Object.assign({ path: n, name: n.split('/').pop(), size: e.file.size }, S.notWhat(n))); continue; }
      vids.push({ path: n, name: n.split('/').pop(), size: e.file.size, file: e.file, mod: e.file.lastModified || 0 });
    }
    const total = vids.length || 1;
    const one = async v => {
      if (v.zip) { v.file = await S.zipFile(v.zip.file, v.zip.en).catch(() => null); if (!v.file) { v.cant = true; Object.assign(v, { what: 'Packed in a way a browser can’t open.', fix: 'Unzip ' + v.from + ' first, then add the folder.' }); return; } }
      if (!PLAYABLE.test(v.name)) { v.cant = true; Object.assign(v, S.why(null, v.name)); return; }
      const pr = probe ? await probe(v.file) : { ok: false };
      if (pr.ok) { v.secs = pr.secs; v.w = pr.w; v.h = pr.h; v.audio = !pr.w; return; }
      v.cant = true; Object.assign(v, S.why(sniff ? await sniff(v.file).catch(() => null) : null, v.name));
    };
    /* three at a time: fast, without asking the computer to open fifty videos at once */
    let next = 0; await Promise.all([0, 1, 2].map(async () => { while (next < vids.length) { const v = vids[next++]; await one(v); tick(++done / total, v.name); } }));
    const ok = vids.filter(v => !v.cant), work = vids.filter(v => v.cant);
    /* the same clip twice: a group per clip; keep the bigger file (the original over a compressed copy) */
    const groups = [], used = new Set();
    ok.forEach((a, i) => { if (used.has(i)) return; const grp = [a]; ok.forEach((b, k) => { if (k > i && !used.has(k) && grp.some(x => sameClip(x, b))) { grp.push(b); used.add(k); } }); if (grp.length > 1) { used.add(i); grp.sort((x, y) => y.size - x.size); groups.push(grp); } });
    const twiceSet = new Set(groups.flat());
    const on = o.online || [], isOn = v => on.some(x => x.name === v.name && x.size === v.size);
    const online = ok.filter(isOn);
    return { ready: ok.filter(v => !twiceSet.has(v) && !isOn(v)), twice: groups.map(gp => gp.filter(v => !isOn(v))).filter(gp => gp.length > 1), work, notvid, online, files: entries.length, zips };
  };
  S.VID = VID; S.PLAYABLE = PLAYABLE;
  g.FootScan = S;
})(typeof window !== 'undefined' ? window : globalThis);
