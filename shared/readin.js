/* READ IN: a friend reads the other parts for you, on their own time. No call, no meeting, no account.
   You send a link. The scene rides in the link itself, after the #, so it never reaches any server; whoever has
   the link can read the sides, so send it to someone you trust. They record each line on their phone, in their
   own voice, and send you back one file. You bring that file into the Reader booth and every line lands where
   it goes. A human voice, never a computer one.
   R.pack(scene) -> '#r=...' text. R.unpack(hash) -> scene. R.bundle(scene, takes) -> zip bytes. R.unbundle(bytes) -> {scene, lines}.
   scene: {v:1, title, file, me, from, lines:[{k, who, text, mine}]}   takes: {k: {data: Uint8Array, ext}} */
(function (g) {
  const R = {};
  const enc = s => new TextEncoder().encode(s), dec = u => new TextDecoder().decode(u);
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64 = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function pipe(u, T) { const s = new Blob([u]).stream().pipeThrough(T); return new Uint8Array(await new Response(s).arrayBuffer()); }
  const canZ = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
  /* just what the reader needs: the lines, who says them, which are yours. Never your notes, your takes or anything else. */
  R.clean = function (s) {
    return { v: 1, title: String(s.title || '').slice(0, 120), file: String(s.file || '').slice(0, 160), me: String(s.me || '').slice(0, 60), from: String(s.from || '').slice(0, 60),
      lines: (s.lines || []).map(l => ({ k: String(l.k || ''), who: String(l.who || ''), text: String(l.text || ''), mine: !!l.mine })).filter(l => l.text) };
  };
  R.pack = async function (scene) {
    const u = enc(JSON.stringify(R.clean(scene)));
    if (canZ()) { try { return '#r=z' + b64(await pipe(u, new CompressionStream('deflate-raw'))); } catch (e) { } }
    return '#r=p' + b64(u);
  };
  R.unpack = async function (hash) {
    const m = String(hash || '').match(/[#&]r=([zp])([A-Za-z0-9_-]+)/); if (!m) return null;
    let u = unb64(m[2]); if (m[1] === 'z') u = await pipe(u, new DecompressionStream('deflate-raw'));
    const s = JSON.parse(dec(u)); return s && Array.isArray(s.lines) ? R.clean(s) : null;
  };
  const slug = s => String(s || '').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 40) || 'line';
  /* the reads, numbered in scene order so they make sense to anyone who opens the zip too */
  R.bundle = function (scene, takes, by) {
    const Z = g.Zip; const files = [], man = { v: 1, kind: 'theactorpage-read', title: scene.title, file: scene.file, by: String(by || '').slice(0, 60), at: Date.now(), lines: [] };
    let n = 0;
    scene.lines.forEach(l => { if (l.mine) return; n++; const t = takes[l.k]; if (!t) return;
      const name = String(n).padStart(2, '0') + ' ' + slug(l.who) + '.' + (t.ext || 'webm');
      files.push({ name, data: t.data }); man.lines.push({ k: l.k, who: l.who, text: l.text, file: name, n }); });
    files.unshift({ name: 'read.json', data: JSON.stringify(man, null, 1) });
    return Z.make(files);
  };
  R.unbundle = function (bytes) {
    const fs = g.Zip.read(bytes), mf = fs.find(f => f.name === 'read.json'); if (!mf) throw new Error('no read.json');
    const man = JSON.parse(dec(mf.data)); if (!man || man.kind !== 'theactorpage-read') throw new Error('not a read');
    return { man, lines: man.lines.map(l => Object.assign({}, l, { data: (fs.find(f => f.name === l.file) || {}).data || null })).filter(l => l.data) };
  };
  R.mimeOf = name => /\.m4a$|\.mp4$/i.test(name) ? 'audio/mp4' : /\.ogg$/i.test(name) ? 'audio/ogg' : /\.wav$/i.test(name) ? 'audio/wav' : 'audio/webm';
  R.extOf = type => /mp4|m4a|aac/i.test(type) ? 'm4a' : /ogg/i.test(type) ? 'ogg' : /wav/i.test(type) ? 'wav' : 'webm';
  g.ReadIn = R;
  if (typeof module !== 'undefined') module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
