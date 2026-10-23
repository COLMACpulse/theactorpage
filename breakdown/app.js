/*
  BREAKDOWN v0.3 · Actor Edition
  Script + Scene + Character breakdown, merged. Material first, structure when invited.
  Vanilla JS, no build step, offline. Storage: IndexedDB on this device + a project file you keep.
*/
(function () {
  'use strict';
  const VERSION = '0.3.2';
  const SCHEMA = 'ACT.BREAKDOWN/0.3';
  const P = window.BDParser;

  // ---------------------------------------------------------------- constants
  const LAYERS = [
    { k: 'objective', label: 'Objective', short: 'OBJ' },
    { k: 'obstacle', label: 'Obstacle', short: 'OBS' },
    { k: 'event', label: 'Event', short: 'EVT' },
    { k: 'turn', label: 'Turn', short: 'TURN' },
    { k: 'pressure', label: 'Pressure', short: 'PRES' },
    { k: 'power', label: 'Power shift', short: 'PWR' }
  ];
  const LMAP = Object.fromEntries(LAYERS.map(l => [l.k, l]));
  const TIERS = [
    { k: 'recovered', label: 'Recovered', hint: 'On the page. Needs a linked line.' },
    { k: 'inferred', label: 'Inferred', hint: 'Follows from the page. Say why.' },
    { k: 'speculative', label: 'Speculative', hint: 'Your choice or backstory. Not on the page.' }
  ];
  const KINDS = ['fact', 'claim', 'action', 'want', 'obstacle', 'pressure', 'relationship', 'history', 'contradiction'];
  const SELF_RE = /\b(I|I'm|I'll|I've|I'd|me|my|myself|mine)\b/;

  // ---------------------------------------------------------------- tiny utils
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const clone = o => JSON.parse(JSON.stringify(o));
  const normq = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const slug = s => String(s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'untitled';
  const fmtDate = iso => { try { const d = new Date(iso); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; } };
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  function sentences(t) { return String(t).match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [t]; }

  // SHA-256 (sync, UTF-8). Works in insecure contexts too (LAN testing on a phone).
  const sha256 = (function () {
    const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
    return function (str) {
      const msg = new TextEncoder().encode(String(str));
      const l = msg.length, bitLen = l * 8;
      const nBlocks = ((l + 9 + 63) >> 6);
      const buf = new Uint8Array(nBlocks * 64);
      buf.set(msg); buf[l] = 0x80;
      const dv = new DataView(buf.buffer);
      dv.setUint32(buf.length - 4, bitLen >>> 0); dv.setUint32(buf.length - 8, Math.floor(bitLen / 4294967296));
      const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
      const W = new Uint32Array(64);
      const r = (x, n) => (x >>> n) | (x << (32 - n));
      for (let b = 0; b < nBlocks; b++) {
        for (let i = 0; i < 16; i++) W[i] = dv.getUint32(b * 64 + i * 4);
        for (let i = 16; i < 64; i++) {
          const s0 = r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10);
          W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
        }
        let [a, bb, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
          const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
          const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) >>> 0;
          h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
        }
        H[0] += a; H[1] += bb; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
      }
      return Array.from(H, x => x.toString(16).padStart(8, '0')).join('');
    };
  })();

  // ---------------------------------------------------------------- storage
  const DB = (function () {
    let dbp = null, mem = {}, ok = true;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise((res, rej) => {
        try {
          const rq = indexedDB.open('breakdown_v03', 1);
          rq.onupgradeneeded = () => rq.result.createObjectStore('projects', { keyPath: 'id' });
          rq.onsuccess = () => res(rq.result);
          rq.onerror = () => rej(rq.error);
        } catch (e) { rej(e); }
      }).catch(e => { ok = false; return null; });
      return dbp;
    }
    async function tx(mode, fn) {
      const db = await open();
      if (!db) return fn(null);
      return new Promise((res, rej) => {
        const t = db.transaction('projects', mode), st = t.objectStore('projects');
        const out = fn(st);
        t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
        t.onerror = () => rej(t.error);
      });
    }
    return {
      get ok() { return ok; },
      async put(p) { const v = clone(p); return tx('readwrite', st => st ? st.put(v) : (mem[v.id] = v)); },
      async get(id) { const r = await tx('readonly', st => st ? st.get(id) : { result: mem[id] }); return r; },
      async all() { const r = await tx('readonly', st => st ? st.getAll() : { result: Object.values(mem) }); return r || []; },
      async del(id) { return tx('readwrite', st => st ? st.delete(id) : delete mem[id]); }
    };
  })();

  // ---------------------------------------------------------------- state
  const S = {
    project: null, doc: null, me: null, tab: 'me', sc: 0,
    layersOn: Object.fromEntries(LAYERS.map(l => [l.k, true])),
    myScenesOnly: true, pair: null, viewPass: null, run: { scope: 'all', mode: 'hide', i: 0, shown: false, sc: null },
    flashEl: null, recent: [], secs: {}, homeMsg: null, homePaste: false, compare: null, ledgerQ: '', ledgerTier: 'all', parseView: false
  };
  let saveTimer = null;

  function W() { // working data (a pass snapshot when viewing one)
    if (S.viewPass) { const p = S.project.passes.find(x => x.id === S.viewPass); if (p) return p.work; }
    return S.project.work;
  }
  const RO = () => !!S.viewPass;

  function newProject(src, name) {
    const title = (src.title || String(name || 'Untitled').replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ')).trim();
    const p = {
      schema: SCHEMA, app: 'BREAKDOWN ' + VERSION, id: rid(), title, created: now(), updated: now(),
      source: packSource(src, name), overrides: {}, me: [], aka: [],
      work: emptyWork(), passes: [], receipts: [], lastSaved: null, dirty: 0
    };
    addReceipt(p, 'IMPORT', name || 'pasted text', p.source.hash);
    return p;
  }
  function emptyWork() { return { ledger: [], tags: [], scenes: {}, rel: {}, arc: { open: '', change: '', close: '' } }; }
  function packSource(src, name) {
    const lines = src.lines.map(l => { const o = { t: l.t, ind: Math.round(l.ind * 10) / 10, pg: l.pg }; if (l.hdr) o.hdr = 1; if (l.pb) o.pb = 1; if (l.num) o.num = l.num; return o; });
    const hash = sha256(JSON.stringify(lines.map(l => l.t)));
    return { name: name || 'pasted', kind: src.kind, pages: src.pages, title: src.title || null, lines, forced: src.forced || null, hash };
  }
  function unpackSource(s) { return { lines: s.lines, pages: s.pages, title: s.title, kind: s.kind, forced: s.forced || undefined }; }

  function addReceipt(p, kind, note, payloadHash) {
    const prev = p.receipts.length ? p.receipts[p.receipts.length - 1].hash : '0'.repeat(64);
    const at = now();
    const hash = sha256([prev, kind, at, payloadHash, note].join('|'));
    p.receipts.push({ at, kind, note, payload: payloadHash, prev, hash });
  }
  function verifyChain(p) {
    let prev = '0'.repeat(64);
    for (const r of p.receipts) {
      if (r.prev !== prev) return { ok: false, at: r };
      if (sha256([r.prev, r.kind, r.at, r.payload, r.note].join('|')) !== r.hash) return { ok: false, at: r };
      prev = r.hash;
    }
    for (const ps of p.passes) if (sha256(JSON.stringify(ps.work)) !== ps.hash) return { ok: false, pass: ps };
    return { ok: true };
  }

  function touch() {
    if (!S.project || RO()) return;
    S.project.updated = now(); S.project.dirty = (S.project.dirty || 0) + 1;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => DB.put(S.project).catch(() => toast('Could not save on this device. Save a project file.')), 300);
  }

  function reparse() {
    S.doc = P.parse(unpackSource(S.project.source), S.project.overrides);
    S.me = computeMe();
  }

  // ---------------------------------------------------------------- refs (evidence links)
  function mkRef(el, quote) { return { el: el.id, q: String(quote || el.text).slice(0, 200), pg: el.pg }; }
  function findRef(ref) {
    const els = S.doc.elements;
    const n = +String(ref.el).slice(1);
    const qn = normq(ref.q);
    if (els[n] && normq(els[n].text).includes(qn)) return els[n];
    let best = null, dist = Infinity;
    els.forEach(e => { if (normq(e.text).includes(qn)) { const d = Math.abs(e.n - n); if (d < dist) { dist = d; best = e; } } });
    return best;
  }
  function allRefs(work) {
    const out = [];
    work.ledger.forEach(l => l.links.forEach(r => out.push(r)));
    work.tags.forEach(t => out.push(t.ref));
    return out;
  }
  function reanchor(work) {
    let moved = 0, orphan = 0;
    allRefs(work).forEach(r => {
      const el = findRef(r);
      if (!el) { if (!r.orphan) orphan++; r.orphan = true; return; }
      if (el.id !== r.el) moved++;
      r.el = el.id; r.pg = el.pg; delete r.orphan;
    });
    return { moved, orphan };
  }
  function refLabel(ref) {
    const el = findRef(ref);
    if (!el) return { txt: 'not found: "' + ref.q.slice(0, 40) + '"', orphan: true };
    const sc = S.doc.scenes[el.sc];
    return { txt: 'p.' + el.pg + ' · ' + scLabel(sc) + ' · ' + (el.who ? el.who + ': ' : '') + ref.q.slice(0, 48), el, orphan: false };
  }
  function scLabel(sc) { return sc ? (sc.num ? 'Sc ' + sc.num : 'Sc ' + (sc.idx + 1)) : ''; }

  // ---------------------------------------------------------------- the character view (all derived from the page)
  function computeMe() {
    const d = S.doc, p = S.project;
    const names = new Set(p.me);
    if (!names.size) return null;
    const isMe = w => names.has(w);
    const mentionRe = P.mentionRegex(Array.from(names).concat(p.aka || []));
    const mine = d.speeches.filter(s => isMe(s.who));
    const myScenes = Array.from(new Set(mine.map(s => s.sc))).sort((a, b) => a - b);
    const mentionScenes = new Set();
    const does = [], aboutMe = [], selfTalk = [], questions = [], cues = {};
    let intro = null;
    const capsRe = new RegExp('(^|[^A-Z])(' + Array.from(names).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z])');
    d.elements.forEach(e => {
      if (e.type === 'action' && mentionRe && mentionRe.test(e.text)) {
        does.push(e); mentionScenes.add(e.sc);
        if (!intro && capsRe.test(e.text)) intro = e;
      }
      if (e.type === 'dialogue' && !isMe(e.who) && mentionRe && mentionRe.test(e.text)) { aboutMe.push(e); mentionScenes.add(e.sc); }
      if (e.type === 'dialogue' && isMe(e.who)) sentences(e.text).forEach(s => { if (SELF_RE.test(s)) selfTalk.push({ el: e, q: s.trim() }); });
    });
    if (!intro && does.length) intro = does[0];
    // pronoun action straight after your own line ("She tears the ticket.") - flagged, not assumed
    const doesSet = new Set(does.map(e => e.n));
    d.elements.forEach(e => {
      if (e.type !== 'action' || doesSet.has(e.n) || !/^(She|He|They)\b/.test(e.text)) return;
      let k = e.n - 1;
      while (k >= 0 && (d.elements[k].type === 'paren' || d.elements[k].hidden)) k--;
      const pv = k >= 0 ? d.elements[k] : null;
      if (pv && pv.sc === e.sc && pv.type === 'dialogue' && isMe(pv.who)) { does.push(Object.assign(Object.create(e), { _after: true })); }
    });
    does.sort((a, b) => a.n - b.n);
    // cue lines + questions put to me
    mine.forEach(s => {
      const cueEl = d.elements[s.cue];
      let k = cueEl ? cueEl.n - 1 : -1;
      while (k >= 0 && (d.elements[k].hidden || d.elements[k].type === 'cue' || d.elements[k].type === 'paren')) k--;
      const prev = k >= 0 ? d.elements[k] : null;
      if (prev && prev.sc === s.sc && prev.type !== 'heading') {
        cues[s.n] = prev.n;
        if (prev.type === 'dialogue' && !isMe(prev.who) && /\?["')]*\s*$/.test(prev.text)) questions.push({ q: prev, a: s });
      }
    });
    // partners
    const partners = {};
    const touchP = n => partners[n] || (partners[n] = { name: n, scenes: new Set(), exchanges: 0, aboutMe: 0, iMention: 0, lines: 0 });
    d.speeches.forEach((s, i) => {
      if (isMe(s.who) || s.who === '(UNKNOWN)') return;
      if (myScenes.includes(s.sc)) { touchP(s.who).scenes.add(s.sc); touchP(s.who).lines++; }
    });
    for (let i = 1; i < d.speeches.length; i++) {
      const a = d.speeches[i - 1], b = d.speeches[i];
      if (a.sc !== b.sc) continue;
      if (isMe(a.who) && !isMe(b.who) && b.who !== '(UNKNOWN)') touchP(b.who).exchanges++;
      if (isMe(b.who) && !isMe(a.who) && a.who !== '(UNKNOWN)') touchP(a.who).exchanges++;
    }
    aboutMe.forEach(e => { if (partners[e.who]) partners[e.who].aboutMe++; });
    Object.values(partners).forEach(pt => {
      const re = P.mentionRegex([pt.name]);
      if (re) mine.forEach(s => { if (re.test(s.text)) pt.iMention++; });
      pt.scenes = Array.from(pt.scenes).sort((a, b) => a - b);
    });
    const words = mine.reduce((n, s) => n + s.words, 0);
    const longest = mine.slice().sort((a, b) => b.words - a.words)[0] || null;
    return {
      names: Array.from(names), mine, myScenes, mentionScenes: Array.from(mentionScenes).filter(x => !myScenes.includes(x)),
      does, aboutMe, selfTalk, questions, cues, intro, words, longest,
      partners: Object.values(partners).sort((a, b) => (b.exchanges + b.lines) - (a.exchanges + a.lines)),
      firstPg: mine.length ? mine[0].pg : null, lastPg: mine.length ? mine[mine.length - 1].pg : null,
      cueSet: new Set(Object.values(cues)), mineEl: new Set(mine.flatMap(s => s.els.concat(s.cue !== undefined ? [s.cue] : []))),
      isMe
    };
  }

  // ---------------------------------------------------------------- intake
  async function readFile(file) {
    const name = file.name || 'file';
    const ext = (name.match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase();
    if (ext === 'pdf' || file.type === 'application/pdf') return readPdf(file, name);
    const text = await file.text();
    if (ext === 'fdx' || /^\s*<\?xml[\s\S]{0,200}<FinalDraft/i.test(text)) return { src: P.fromFdx(text), name };
    if (ext === 'json') throw new Error('That looks like a project file. Use "Open a project file" instead.');
    return { src: P.fromText(text, { fountain: ext === 'fountain' || ext === 'spmd' }), name };
  }
  let pdfjsReady = null;
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  function loadPdfJs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = (async () => {
      await loadScript('vendor/pdf.min.js');
      const lib = window.pdfjsLib;
      if (location.protocol === 'file:') await loadScript('vendor/pdf.worker.min.js'); // workers are blocked on file://, run in-page
      else lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
      return lib;
    })();
    pdfjsReady.catch(() => { pdfjsReady = null; });
    return pdfjsReady;
  }
  async function readPdf(file, name) {
    const lib = await loadPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await lib.getDocument({ data, disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise;
    const pages = [];
    let chars = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i);
      const vp = pg.getViewport({ scale: 1 });
      const tc = await pg.getTextContent();
      const items = tc.items.filter(it => typeof it.str === 'string').map(it => {
        chars += it.str.trim().length;
        return { s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]), rot: Math.abs(it.transform[1]) > 0.01 || Math.abs(it.transform[2]) > 0.01 };
      });
      pages.push({ w: vp.width, h: vp.height, items });
    }
    if (chars < 20) throw new Error('This PDF has no text in it. It is a scan or a photo of pages. BREAKDOWN reads text, it does not do OCR. Ask for a text PDF, or paste the text.');
    const meta = await doc.getMetadata().catch(() => null);
    const src = P.fromPdfPages(pages);
    const t = meta && meta.info && meta.info.Title;
    if (t && t.trim() && !/untitled|microsoft word|\.pdf$/i.test(t)) src.title = t.trim();
    return { src, name };
  }

  // ---------------------------------------------------------------- sides shelf (../shared/shelf.js)
  // Sides dropped here go on the shelf for every ACT tool; sides dropped elsewhere open here.
  const SH = window.Shelf || null;
  function shelfText(d) {
    const items = []; let sp = null;
    d.elements.forEach(e => {
      if (e.type === 'cue') {
        if (e.hidden && sp) return;                 // CONT'D over a page break: same speech
        const ext = (e.ext || []).filter(x => x !== "CONT'D");
        sp = { type: 'speech', who: e.who + ext.map(x => ' (' + x + ')').join(''), lines: [] }; items.push(sp); return;
      }
      if (e.type === 'dialogue' || e.type === 'paren') { if (sp) sp.lines.push(e.text); return; }
      sp = null;
      items.push({ type: e.type === 'heading' ? 'heading' : 'action', text: e.text });
    });
    return SH.toText(items.map(x => x.type === 'speech' ? { type: 'speech', who: x.who, text: x.lines.join('\n') } : x));
  }

  async function intake(fileOrText, name, opts) {
    S.homeMsg = null; opts = opts || {};
    try {
      const r = typeof fileOrText === 'string' ? { src: P.fromText(fileOrText), name: name || 'pasted text' } : await readFile(fileOrText);
      const doc = P.parse(r.src, {});
      if (!doc.speeches.length) throw new Error('No dialogue found. If this is a script, open "Check how it was read" after import and fix a cue or two.');
      const p = newProject(r.src, opts.shelfName || r.name);
      S.project = p; S.viewPass = null; S.tab = 'me'; S.sc = 0;
      reparse();
      if (SH) {
        try {
          let it = null;
          if (opts.shelfId) { it = SH.get(opts.shelfId); SH.markSeen('breakdown', opts.shelfId); }
          else {
            const file = typeof fileOrText === 'string' ? null : fileOrText;
            it = SH.put({ text: shelfText(S.doc), file: r.name, fileSig: file ? SH.sig(file) : '', from: 'BREAKDOWN', tool: 'breakdown' });
            if (it && file) SH.putFile(it.id, file);
          }
          if (it) {
            p.shelf = it.id;
            if (it.me && S.doc.characters[it.me]) { p.me = [it.me]; S.me = computeMe(); }
          }
        } catch (e) { }
      }
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
      await DB.put(p);
      render();
    } catch (e) {
      S.homeMsg = e.message || String(e);
      render();
    }
  }

  async function openProject(p) {
    if (!p || !p.source) { toast('That project file is missing its script.'); return; }
    if (p.schema !== SCHEMA) { toast('Unknown project format: ' + (p.schema || 'none')); return; }
    p.work = Object.assign(emptyWork(), p.work || {});
    p.passes = p.passes || []; p.receipts = p.receipts || []; p.aka = p.aka || []; p.overrides = p.overrides || {};
    S.project = p; S.viewPass = null; S.compare = null; S.pair = null; S.parseView = false;
    reparse();
    if (S.me) S.tab = S.tab || 'me';
    render();
  }

  // ---------------------------------------------------------------- render root
  const app = () => $('#app');
  function render() {
    closeSheet(true);
    if (!S.project) return renderHome();
    if (!S.project.me.length || !S.me) return S.parseView ? renderParseStandalone() : renderPick();
    renderShell();
  }

  // ---------------------------------------------------------------- HOME
  async function renderHome() {
    S.recent = (await DB.all()).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    app().innerHTML = `
      <div class="shell" style="padding-left:0"><main style="max-width:720px;padding-bottom:40px">
        <div class="hero">
          <div class="kicker">THEACTORPAGE · ACT</div>
          <h1>BREAKDOWN</h1>
          <p>Drop your sides. Pick your role. Every line, cue and note stays tied to the page.</p>
        </div>
        <div class="drop" id="drop" data-a="pickfile" role="button" tabindex="0">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3"/></svg>
          <b>Drop sides or a script</b>
          <span class="dim">PDF · Final Draft (.fdx) · Fountain · TXT</span>
          <span class="btn pri" style="margin-top:6px">Choose file</span>
        </div>
        ${S.homeMsg ? `<div class="msg bad">${esc(S.homeMsg)}</div>` : ''}
        <div class="row" style="margin-bottom:8px">
          <button class="btn" data-a="togglepaste">${S.homePaste ? 'Hide paste box' : 'Paste text instead'}</button>
          <button class="btn ghost" data-a="sample">Try the sample sides</button>
          <button class="btn ghost" data-a="openproj">Open a project file</button>
        </div>
        ${S.homePaste ? `<textarea class="paste" id="pastebox" placeholder="Paste the scene. Keep the character names in caps on their own lines."></textarea>
          <div class="row" style="margin-top:8px"><button class="btn pri" data-a="pastego">Break it down</button></div>` : ''}
        ${S.recent.length ? `<h3 class="kicker" style="margin-top:28px">On this device</h3>` + S.recent.map(p => `
          <div class="proj"><button class="open" data-a="openrecent" data-id="${esc(p.id)}"><b>${esc(p.title)}</b>
            <small>${p.me && p.me.length ? esc(p.me.join(' + ')) + ' · ' : ''}${fmtDate(p.updated)}${p.lastSaved ? '' : ' · <span style="color:var(--tung-text)">never saved to a file</span>'}</small></button>
            <button class="iconbtn" aria-label="Delete" data-a="delrecent" data-id="${esc(p.id)}">${ICON.trash}</button></div>`).join('') : ''}
        <p class="faint" style="font-size:13px;margin-top:28px">Offline. Nothing leaves this device unless you save or share a file. ${DB.ok ? '' : '<b>Storage is blocked in this browser mode, so work lasts only until you close the tab. Save a project file.</b>'}</p>
        <p class="faint" style="font-size:12px">BREAKDOWN ${VERSION}</p>
      </main></div>`;
    const drop = $('#drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) intake(f); });
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') $('#filein').click(); });
  }

  // ---------------------------------------------------------------- PICK
  function renderPick() {
    const d = S.doc;
    const chars = Object.values(d.characters).sort((a, b) => b.speeches - a.speeches || b.words - a.words);
    const sel = S.project.me;
    app().innerHTML = `
      <div class="shell" style="padding-left:0"><main style="max-width:640px;padding-bottom:40px">
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><button class="btn ghost sm" data-a="home">${ICON.back} Home</button></div>
        <div class="kicker">${esc(S.project.title)}</div>
        <h1 style="font-size:26px;margin-bottom:4px">Who are you playing?</h1>
        <p class="dim" style="margin:0 0 16px">Read ${plural(d.scenes.length, 'scene')}, ${plural(d.pages, 'page')}, ${plural(d.speeches.length, 'speech', 'speeches')}. Tap your role.</p>
        ${chars.map(c => `<button class="pick ${sel.includes(c.name) ? 'on' : ''}" data-a="pickme" data-n="${esc(c.name)}"><b>${esc(c.name)}</b><span>${plural(c.speeches, 'speech', 'speeches')}<br>${plural(c.scenes.length, 'scene')} · ${c.words} words</span></button>`).join('')}
        <p class="faint" style="font-size:13px;margin-top:16px">Name missing or a line read as a name? <button class="btn sm ghost" data-a="parseview">Check how it was read</button></p>
      </main></div>`;
  }

  // ---------------------------------------------------------------- SHELL
  const ICON = {
    me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    scenes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M14 4v5"/></svg>',
    run: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h10M4 12h16M4 18h7"/><path d="M17 15l4 3-4 3z" fill="currentColor"/></svg>',
    ledger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    pack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>',
    trash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  const TABS = [['me', 'ROLE'], ['scenes', 'SCENES'], ['run', 'RUN'], ['ledger', 'LEDGER'], ['pack', 'PACK']];

  function renderShell(keepScroll) {
    const y = keepScroll ? window.scrollY : 0;
    const p = S.project;
    const unsaved = !p.lastSaved || (p.dirty || 0) > 0;
    const tabKey = S.tab === 'scene' ? 'scenes' : S.tab;
    app().innerHTML = `
      <div class="shell">
        <header class="top">
          <button class="title" data-a="home" aria-label="Home"><b>${esc(p.title)}</b><span>${esc(p.me.join(' + '))}${S.viewPass ? ' · ' + esc(passName(S.viewPass)) : ''}</span></button>
          <button class="iconbtn" data-a="theme" aria-label="Light or dark">${ICON.theme}</button>
        </header>
        <main id="main">
          ${S.viewPass ? `<div class="banner"><span style="flex:1">Viewing ${esc(passName(S.viewPass))}. Read-only.</span><button class="btn sm" data-a="exitpass">Back to current</button></div>` : ''}
          ${S.pair ? `<div class="banner"><span style="flex:1">Contradiction: tap the second line.</span><button class="btn sm" data-a="pairstop">Cancel</button></div>` : ''}
          ${S.parseView ? viewParse() : ({ me: viewMe, scenes: viewScenes, scene: viewScene, run: viewRun, ledger: viewLedger, pack: viewPack }[S.tab] || viewMe)()}
        </main>
        <nav class="tabs">${TABS.map(([k, l]) => `<button class="${tabKey === k && !S.parseView ? 'on' : ''}" data-a="tab" data-t="${k}">${ICON[k]}<span>${l}</span>${k === 'pack' && unsaved && !S.viewPass ? '<i class="badge" aria-label="not saved to a file"></i>' : ''}</button>`).join('')}</nav>
      </div>`;
    window.scrollTo(0, y);
    if (S.flashEl !== null) {
      const el = document.querySelector(`[data-el="${S.flashEl}"]`);
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); }
      S.flashEl = null;
    }
    if (S.tab === 'run') runKeys(true); else runKeys(false);
  }
  function passName(id) { const p = S.project.passes.find(x => x.id === id); return p ? p.name : 'pass'; }

  // ---------------------------------------------------------------- ROLE (character file)
  function quoteBtn(el, q, cls) {
    const sc = S.doc.scenes[el.sc];
    return `<button class="q ${cls || ''}" data-a="line" data-el="${el.n}" data-q="${esc(q || '')}">${esc(q || el.text)}<span class="src">${el.who ? esc(el.who) + ' · ' : ''}p.${el.pg} · ${esc(scLabel(sc))}${el._after ? ' · right after your line, not named' : ''}</span></button>`;
  }
  function inviteField(key, label, val, placeholder) {
    if (RO()) return val ? `<p style="white-space:pre-wrap;margin:4px 0 0">${esc(val)}</p>` : `<p class="faint" style="margin:4px 0 0">Not set in this pass.</p>`;
    if (!val && !S.openField?.[key]) return `<button class="invite" data-a="openfield" data-k="${esc(key)}">${esc(placeholder || 'Tap to write')}</button>`;
    return `<textarea class="field" data-f="${esc(key)}" placeholder="${esc(placeholder || '')}" aria-label="${esc(label)}">${esc(val || '')}</textarea>`;
  }
  function viewMe() {
    const M = S.me, d = S.doc, w = W();
    const total = d.scenes.length;
    const arcEvents = w.tags.filter(t => ['turn', 'pressure', 'power', 'event'].includes(t.layer)).map(t => ({ t, el: findRef(t.ref) })).filter(x => x.el && M.myScenes.includes(x.el.sc)).sort((a, b) => a.el.n - b.el.n);
    const history = w.ledger.filter(l => l.kind === 'history');
    const contradictions = w.ledger.filter(l => l.kind === 'contradiction');
    const otherChars = Object.keys(d.characters).filter(n => !M.isMe(n));
    return `
      ${!RO() && window.Kit ? Kit.html([
        { id: 'saynote', dev: 'typewriter', label: 'SAY IT', what: 'Say a note', note: SR ? 'Speech into a new note. Chrome sends it to Google, Safari to Apple' : "This browser can't turn speech into words", off: !SR },
        { id: 'runout', dev: 'mic', label: 'MIC', what: 'Run lines out loud', note: 'In Memorizer, with these sides and your role' },
        { id: 'tapeit', dev: 'camera', label: 'CAMERA', what: 'Tape it', note: 'In Actor OS, with these sides and your role' }]) : ''}
      <div class="kicker">Your role</div>
      <div class="row" style="align-items:flex-end;justify-content:space-between">
        <h1 style="font-size:28px;letter-spacing:.06em">${esc(M.names.join(' + '))}</h1>
        ${RO() ? '' : `<button class="btn sm ghost" data-a="changerole">Change role</button>`}
      </div>
      <div class="stats">
        <div class="stat"><b>${M.myScenes.length}<small class="faint" style="font-size:14px">/${total}</small></b><span>scenes</span></div>
        <div class="stat"><b>${M.mine.length}</b><span>speeches</span></div>
        <div class="stat"><b>${M.words}</b><span>words</span></div>
        <div class="stat"><b>${M.firstPg === M.lastPg ? 'p.' + M.firstPg : M.firstPg + '-' + M.lastPg}</b><span>pages</span></div>
      </div>
      ${RO() ? '' : `<div class="row" style="margin:-4px 0 14px"><label class="dim" style="font-size:14px" for="aka">Also called</label><input id="aka" class="field" style="flex:1;min-width:140px" data-f="aka" placeholder="Nicknames others use, e.g. Ren" value="${esc((S.project.aka || []).join(', '))}"></div>`}

      ${M.intro ? `<div class="kicker">First on the page</div>${quoteBtn(M.intro)}` : ''}

      <details class="sec" data-sec="arcreceipt" ${secOpen('arcreceipt', true)}><summary>Arc receipt <span class="n">${arcEvents.length} pressure points</span></summary><div class="body">
        <div class="receipt">
          <div class="step" style="--sw:var(--faint)"><h3>Opening state</h3>${inviteField('arc.open', 'Opening state', w.arc.open, 'Who are you on page one? Tap to write')}</div>
          <div class="step" style="--sw:var(--L-pressure)"><h3>Pressure events</h3>
            ${arcEvents.length ? arcEvents.map(x => receiptItem(x.t, x.el)).join('') : `<p class="faint" style="font-size:14px;margin:4px 0">Tag lines as Turn, Pressure, Event or Power shift in your scenes and they collect here.</p>`}
          </div>
          <div class="step" style="--sw:var(--L-turn)"><h3>What changes</h3>${inviteField('arc.change', 'What changes', w.arc.change, 'What do the pressure events do to you? Tap to write')}</div>
          <div class="step" style="--sw:var(--tung)"><h3>Ending state</h3>${inviteField('arc.close', 'Ending state', w.arc.close, 'Who are you when you exit? Tap to write')}</div>
        </div>
      </div></details>

      <details class="sec" data-sec="timeline" ${secOpen('timeline', false)}><summary>Timeline <span class="n">${M.myScenes.length} scenes</span></summary><div class="body">
        <div class="receipt">
          <div class="step"><h3>Before page one</h3>
            ${history.map(h => noteMini(h)).join('') || '<p class="faint" style="font-size:14px;margin:4px 0">Backstory you know or choose. Nothing yet.</p>'}
            ${RO() ? '' : `<button class="btn sm" data-a="newnote" data-kind="history">Add backstory</button>`}
          </div>
          ${M.myScenes.map(si => {
            const sc = d.scenes[si];
            const first = M.mine.find(s => s.sc === si);
            const evs = w.tags.map(t => ({ t, el: findRef(t.ref) })).filter(x => x.el && x.el.sc === si && ['event', 'turn', 'power', 'pressure'].includes(x.t.layer)).sort((a, b) => a.el.n - b.el.n);
            const st = w.scenes[sc.key] || {};
            return `<div class="step" style="--sw:var(--tung)"><h3>${esc(scLabel(sc))} · p.${sc.pg}</h3>
              <button class="item" data-a="goscene" data-sc="${si}"><b class="mono" style="font-size:13px">${esc(sc.heading)}</b>${first ? `<span class="src">"${esc(first.text.slice(0, 70))}"</span>` : ''}</button>
              ${st.entry ? `<div class="faint" style="font-size:13px">In: ${esc(st.entry)}</div>` : ''}
              ${evs.map(x => receiptItem(x.t, x.el)).join('')}
              ${st.exit ? `<div class="faint" style="font-size:13px">Out: ${esc(st.exit)}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div></details>

      <details class="sec" data-sec="relationship" ${secOpen('relationship', false)}><summary>Relationships <span class="n">${M.partners.length}</span></summary><div class="body">
        ${M.partners.length ? M.partners.map(pt => relCard(pt)).join('') : '<p class="faint">Nobody else speaks in your scenes.</p>'}
      </div></details>

      <details class="sec" data-sec="saysvsdoes" ${secOpen('saysvsdoes', false)}><summary>Says vs does <span class="n">${contradictions.length} contradictions</span></summary><div class="body">
        <p class="dim" style="font-size:14px;margin-top:0">Raw material, straight off the page. Tap a line, then "Start a contradiction" and tap its partner.</p>
        ${contradictions.length ? `<div class="kicker">Your contradictions</div>` + contradictions.map(c => noteMini(c)).join('') : ''}
        ${RO() ? '' : `<button class="btn sm" data-a="ownpair" style="margin:4px 0 8px">Write a pair in your own words</button>`}
        <div class="kicker" style="margin-top:12px">You say about yourself <span class="faint">(${M.selfTalk.length})</span></div>
        ${M.selfTalk.map(x => quoteBtn(x.el, x.q, 'me')).join('') || '<p class="faint">None.</p>'}
        <div class="kicker" style="margin-top:12px">The page shows you doing <span class="faint">(${M.does.length})</span></div>
        ${M.does.map(e => quoteBtn(e)).join('') || '<p class="faint">No stage directions name you.</p>'}
        <div class="kicker" style="margin-top:12px">Others say about you <span class="faint">(${M.aboutMe.length})</span></div>
        ${M.aboutMe.map(e => quoteBtn(e)).join('') || `<p class="faint">Nobody says your name.${(S.project.aka || []).length ? '' : ' Add a nickname above if they use one.'}</p>`}
      </div></details>

      <details class="sec" data-sec="questionsput" ${secOpen('questionsput', false)}><summary>Questions put to you <span class="n">${M.questions.length}</span></summary><div class="body">
        ${M.questions.map(x => `<div class="pair">${quoteBtn(x.q)}${quoteBtn(S.doc.elements[x.a.els.find(k => S.doc.elements[k].type === 'dialogue')] || S.doc.elements[x.a.cue], null, 'me')}</div>`).join('<hr style="border:0;border-top:1px solid var(--line);margin:8px 0">') || '<p class="faint">No questions directly before your lines.</p>'}
      </div></details>

      ${RO() || !otherChars.length ? '' : `<p class="faint" style="font-size:13px">Doubling? <button class="btn sm ghost" data-a="addrole">Add another role as you</button></p>`}
    `;
  }
  function secOpen(k, def) { const v = S.secs[k]; return (v === undefined ? def : v) ? 'open' : ''; }
  function relCard(pt) {
    const w = W(), r = w.rel[pt.name] || {};
    const open = S.relOpen === pt.name;
    const filled = ['want', 'obstacle', 'leverage', 'history'].filter(k => r[k]).length;
    return `<div class="card" style="padding:12px 14px">
      <button class="row" data-a="relopen" data-n="${esc(pt.name)}" style="width:100%;border:0;background:none;padding:0;min-height:var(--tap);justify-content:space-between;text-align:left">
        <b style="letter-spacing:.04em">${esc(pt.name)}</b>
        <span class="faint" style="font-size:13px">${plural(pt.scenes.length, 'scene')} · ${plural(pt.exchanges, 'exchange')} · says your name ${pt.aboutMe}x${filled ? ' · ' + filled + '/4 noted' : ''}</span>
      </button>
      ${open ? `
        <label class="lab">What you want from them</label>${RO() ? `<p>${esc(r.want || '')}</p>` : `<textarea class="field" data-f="rel.${esc(pt.name)}.want">${esc(r.want || '')}</textarea>`}
        <label class="lab">What's in the way</label>${RO() ? `<p>${esc(r.obstacle || '')}</p>` : `<textarea class="field" data-f="rel.${esc(pt.name)}.obstacle">${esc(r.obstacle || '')}</textarea>`}
        <label class="lab">Leverage (yours, theirs)</label>${RO() ? `<p>${esc(r.leverage || '')}</p>` : `<textarea class="field" data-f="rel.${esc(pt.name)}.leverage">${esc(r.leverage || '')}</textarea>`}
        <label class="lab">History</label>${RO() ? `<p>${esc(r.history || '')}</p>` : `<textarea class="field" data-f="rel.${esc(pt.name)}.history">${esc(r.history || '')}</textarea>`}
        <div class="row" style="margin-top:8px">${pt.scenes.map(si => `<button class="btn sm" data-a="goscene" data-sc="${si}">${esc(scLabel(S.doc.scenes[si]))}</button>`).join('')}</div>
      ` : ''}
    </div>`;
  }
  function noteMini(n) {
    return `<button class="note" data-a="editnote" data-id="${esc(n.id)}"><div class="meta"><span class="tier ${n.tier}">${esc(n.tier)}</span>${n.kind ? `<span class="faint">${esc(n.kind)}</span>` : ''}${n.when ? `<span class="faint">${esc(n.when)}</span>` : ''}</div>${n.text ? `<p>${esc(n.text)}</p>` : (n.says || n.does ? '' : '<p class="faint">(no text)</p>')}${n.says || n.does ? `<div class="sd"><div><b>Says</b> ${esc(n.says || '-')}</div><div><b>Does</b> ${esc(n.does || '-')}</div></div>` : ''}${!isLinked(n) ? '<span class="faint" style="font-size:12px;display:block">no line linked</span>' : ''}${n.links.map(r => { const L = refLabel(r); return `<span class="ref ${L.orphan ? 'orphan' : ''}">${esc(L.txt)}</span>`; }).join('')}</button>`;
  }
  function receiptItem(t, el) {
    const L = LMAP[t.layer];
    return `<button class="item" data-a="jumptag" data-el="${el.n}" style="border-left:3px solid var(--L-${t.layer})"><span class="tag" style="background:var(--L-${t.layer})">${L.short}</span> ${esc(t.note || '')}<span class="src">p.${el.pg} · ${esc(scLabel(S.doc.scenes[el.sc]))} · ${el.who ? esc(el.who) + ': ' : ''}${esc(t.ref.q.slice(0, 60))}</span></button>`;
  }

  // ---------------------------------------------------------------- SCENES list
  function viewScenes() {
    const d = S.doc, M = S.me, w = W();
    const onlyMine = S.myScenesOnly && M.myScenes.length < d.scenes.length;
    const len = sc => sc.els.reduce((n, k) => n + d.elements[k].text.length, 0) + 40;
    const list = d.scenes.filter(sc => !onlyMine || M.myScenes.includes(sc.idx) || M.mentionScenes.includes(sc.idx));
    return `
      <div class="kicker">Whole script · ${plural(d.scenes.length, 'scene')} · ${plural(d.pages, 'page')}</div>
      <div class="strip" aria-label="Scene strip">${d.scenes.map(sc => `<button style="flex:${len(sc)}" class="${M.myScenes.includes(sc.idx) ? 'mine' : M.mentionScenes.includes(sc.idx) ? 'ment' : ''}" data-a="goscene" data-sc="${sc.idx}" aria-label="${esc(scLabel(sc) + ' ' + sc.heading)}"></button>`).join('')}</div>
      ${M.myScenes.length < d.scenes.length ? `<div class="row" style="margin-bottom:12px"><button class="chip ${onlyMine ? 'on' : ''}" data-a="onlymine">Your scenes${M.mentionScenes.length ? ' + mentions' : ''}</button><button class="chip ${!onlyMine ? 'on' : ''}" data-a="allscenes">All scenes</button></div>` : ''}
      ${list.map(sc => {
        const mine = M.mine.filter(s => s.sc === sc.idx).length;
        const tags = w.tags.map(t => ({ t, el: findRef(t.ref) })).filter(x => x.el && x.el.sc === sc.idx);
        const st = w.scenes[sc.key] || {};
        return `<button class="scrow ${mine ? '' : 'off'}" data-a="goscene" data-sc="${sc.idx}">
          <span class="num">${esc(sc.num || sc.idx + 1)}</span>
          <span class="h"><b>${esc(sc.heading)}</b><small>p.${sc.pg} · ${esc(sc.who.join(', ') || 'no dialogue')}</small>
            ${tags.length ? `<span class="dots">${LAYERS.filter(l => tags.some(x => x.t.layer === l.k)).map(l => `<i style="background:var(--L-${l.k})" title="${l.label}"></i>`).join('')}</span>` : ''}</span>
          <span class="you">${mine ? plural(mine, 'line') : M.mentionScenes.includes(sc.idx) ? 'mentioned' : ''}${st.entry || st.exit ? '<br><span class="faint">states set</span>' : ''}</span>
        </button>`;
      }).join('')}
    `;
  }

  // ---------------------------------------------------------------- SCENE view
  function viewScene() {
    const d = S.doc, M = S.me, w = W();
    const sc = d.scenes[S.sc]; if (!sc) { S.tab = 'scenes'; return viewScenes(); }
    const tags = w.tags.map(t => ({ t, el: findRef(t.ref) })).filter(x => x.el && x.el.sc === sc.idx);
    const tagsBy = {};
    tags.forEach(x => (tagsBy[x.el.n] = tagsBy[x.el.n] || []).push(x.t));
    const els = sc.els.map(k => d.elements[k]).filter(e => !e.hidden);
    const total = els.reduce((n, e) => n + Math.max(20, e.text.length), 0);
    let acc = 0;
    const marks = [];
    els.forEach(e => { const wdt = Math.max(20, e.text.length); (tagsBy[e.n] || []).forEach(t => { if (S.layersOn[t.layer]) marks.push({ left: (acc + wdt / 2) / total * 100, layer: t.layer }); }); acc += wdt; });
    const st = w.scenes[sc.key] || {};
    const isMineEl = e => M.mineEl.has(e.n);
    const html = els.map((e, i) => {
      const mine = isMineEl(e);
      const prevMine = i > 0 && isMineEl(els[i - 1]), nextMine = i < els.length - 1 && isMineEl(els[i + 1]);
      const cls = ['el', e.type, mine ? 'mine' : '', mine && !prevMine ? 'first' : '', mine && !nextMine ? 'last' : '', M.cueSet.has(e.n) && !mine ? 'cueline' : ''].join(' ');
      const tg = (tagsBy[e.n] || []).filter(t => S.layersOn[t.layer]);
      const ext = e.type === 'cue' && e.ext && e.ext.length ? ' (' + e.ext.filter(x => x !== "CONT'D").join(') (') + ')' : '';
      return `<button class="${cls}" data-a="line" data-el="${e.n}">${M.cueSet.has(e.n) && !mine ? '<span class="cuetag">CUE</span>' : ''}${esc(e.text)}${esc(ext.replace(' ()', ''))}${tg.length ? `<span class="tags">${tg.map(t => `<span class="tag" style="background:var(--L-${t.layer})">${LMAP[t.layer].short}${t.note ? `<em>${esc(t.note)}</em>` : ''}</span>`).join('')}</span>` : ''}</button>`;
    }).join('');
    const prevSc = sc.idx > 0 ? sc.idx - 1 : null, nextSc = sc.idx < d.scenes.length - 1 ? sc.idx + 1 : null;
    return `
      <div class="scenehead">
        <button class="iconbtn" data-a="tab" data-t="scenes" aria-label="All scenes">${ICON.back}</button>
        <h2>${esc(scLabel(sc))} · ${esc(sc.heading)}<br><span class="faint" style="font:400 12px var(--sans)">p.${sc.pg} · ${esc(sc.who.join(', '))}</span></h2>
        <button class="iconbtn" data-a="goscene" data-sc="${prevSc}" ${prevSc === null ? 'disabled' : ''} aria-label="Previous scene">${ICON.back}</button>
        <button class="iconbtn" data-a="goscene" data-sc="${nextSc}" ${nextSc === null ? 'disabled' : ''} aria-label="Next scene">${ICON.next}</button>
      </div>
      <div class="layers" role="group" aria-label="Layers">${LAYERS.map(l => `<button class="chip ${S.layersOn[l.k] ? 'on' : ''}" data-a="layer" data-l="${l.k}"><span class="dot" style="background:var(--L-${l.k})"></span>${l.label} <span class="faint">${tags.filter(x => x.t.layer === l.k).length}</span></button>`).join('')}</div>
      <div class="map" data-a="mapjump" aria-label="Scene map. Tap to jump.">${els.map(e => `<i style="flex:${Math.max(20, e.text.length)}" class="${isMineEl(e) ? 'me' : e.type === 'action' ? 'act' : ''}"></i>`).join('')}${marks.map(m => `<span class="mk" style="left:calc(${m.left}% - 2px);background:var(--L-${m.layer})"></span>`).join('')}</div>
      <div class="scenegrid">
        <div class="page">${html}</div>
        <div class="receipt card">
          <div class="kicker">Scene receipt</div>
          <div class="step"><h3>Entry state</h3>${inviteField('scene.' + sc.key + '.entry', 'Entry state', st.entry, 'Where are you coming in from? Tap to write')}</div>
          ${LAYERS.map(l => { const xs = tags.filter(x => x.t.layer === l.k).sort((a, b) => a.el.n - b.el.n); return `<div class="step" style="--sw:var(--L-${l.k})"><h3>${l.label}s <span class="faint">${xs.length || ''}</span></h3>${xs.map(x => receiptItem(x.t, x.el)).join('') || '<p class="faint" style="font-size:13px;margin:2px 0 0">Tap a line to tag one.</p>'}</div>`; }).join('')}
          <div class="step" style="--sw:var(--tung)"><h3>Exit state</h3>${inviteField('scene.' + sc.key + '.exit', 'Exit state', st.exit, 'How do you leave? Tap to write')}</div>
          <div class="row" style="margin-top:8px"><button class="btn sm" data-a="runscene" data-sc="${sc.idx}">Run this scene</button></div>
        </div>
      </div>`;
  }

  // ---------------------------------------------------------------- RUN lines
  function runQueue() {
    const M = S.me;
    return S.run.scope === 'scene' && S.run.sc !== null ? M.mine.filter(s => s.sc === S.run.sc) : M.mine;
  }
  function hint(text, mode) {
    if (mode === 'letters') return text.replace(/([A-Za-z0-9])([A-Za-z0-9'’]*)/g, (m, a, b) => a + b.replace(/./g, '_'));
    return text.replace(/[^\s]/g, '•');
  }
  function viewRun() {
    const d = S.doc, M = S.me, q = runQueue(), R = S.run;
    if (!q.length) return `<p class="dim">No lines for this role.</p>`;
    if (R.i >= q.length) R.i = q.length - 1;
    const sp = q[R.i];
    const cueN = M.cues[sp.n];
    const cue = cueN !== undefined ? d.elements[cueN] : null;
    const sc = d.scenes[sp.sc];
    const body = sp.els.map(k => d.elements[k]).map(e => e.type === 'paren' ? `<div class="dim" style="font-size:16px">${esc(e.text)}</div>` : `<div class="${R.shown ? '' : 'hidden'}">${esc(R.shown ? e.text : hint(e.text, R.mode))}</div>`).join('');
    return `
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <div class="row">
          <button class="chip ${R.scope === 'all' ? 'on' : ''}" data-a="runscope" data-v="all">All my scenes</button>
          ${R.sc !== null ? `<button class="chip ${R.scope === 'scene' ? 'on' : ''}" data-a="runscope" data-v="scene">${esc(scLabel(d.scenes[R.sc]))} only</button>` : ''}
        </div>
        <div class="row">
          <button class="chip ${R.mode === 'hide' ? 'on' : ''}" data-a="runmode" data-v="hide">Hidden</button>
          <button class="chip ${R.mode === 'letters' ? 'on' : ''}" data-a="runmode" data-v="letters">First letters</button>
        </div>
      </div>
      <div class="prog"><i style="width:${(R.i + 1) / q.length * 100}%"></i></div>
      <div class="run">
        <div class="faint" style="font-size:13px">${R.i + 1} of ${q.length} · ${esc(scLabel(sc))} · ${esc(sc.heading)} · p.${sp.pg}</div>
        <div class="ctx">${cue ? `<span class="who">${esc(cue.type === 'dialogue' ? cue.who : cue.type.toUpperCase())}</span>${esc(cue.text)}` : '<span class="who">SCENE OPENS ON YOU</span>'}</div>
        <div class="mine"><span class="who">${esc(sp.who)}</span>${body}</div>
        <div class="ctl">
          <button class="btn" data-a="runprev" ${R.i === 0 ? 'disabled' : ''}>Back</button>
          ${R.shown ? `<button class="btn pri" data-a="runnext" ${R.i >= q.length - 1 ? 'disabled' : ''}>Next cue</button>` : `<button class="btn pri" data-a="runshow">Show line</button>`}
        </div>
        <p class="faint" style="font-size:12px;text-align:center;margin:0">Keyboard: space shows the line, then the next cue. Screen stays awake while you run.</p>
      </div>`;
  }
  let wakeLock = null;
  function runKeys(on) {
    if (on && !runKeys.bound) {
      runKeys.bound = e => {
        if (S.tab !== 'run' || $('.sheet.on') || /INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) return;
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); act(S.run.shown ? 'runnext' : 'runshow'); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); act('runprev'); }
      };
      document.addEventListener('keydown', runKeys.bound);
      try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => { }); } catch (e) { }
    } else if (!on && runKeys.bound) {
      document.removeEventListener('keydown', runKeys.bound); runKeys.bound = null;
      if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; }
    }
  }

  // ---------------------------------------------------------------- integrity (from the Case File)
  const isLinked = n => n.links.some(r => findRef(r));
  function integrity(w) {
    const t = w.ledger.length;
    const c = k => w.ledger.filter(n => n.tier === k).length;
    const linked = w.ledger.filter(isLinked).length;
    return { t, r: c('recovered'), i: c('inferred'), s: c('speculative'), linked, unlinked: t - linked, contra: w.ledger.filter(n => n.kind === 'contradiction').length, pct: t ? Math.round(linked / t * 100) : 0, ground: t ? Math.round(c('recovered') / t * 100) : 0 };
  }
  function integrityBar(w) {
    const g = integrity(w);
    if (!g.t) return '';
    return `<div class="card integ" style="padding:12px 14px">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="kicker" style="margin:0">Evidence integrity</span><span class="faint" style="font-size:13px">${g.pct}% linked to a line</span></div>
      <div class="ibar" role="img" aria-label="${g.r} recovered, ${g.i} inferred, ${g.s} speculative"><i class="recovered" style="flex:${g.r}"></i><i class="inferred" style="flex:${g.i}"></i><i class="speculative" style="flex:${g.s}"></i></div>
      <div class="row" style="gap:14px;margin-top:8px;font-size:13px">
        <span><span class="sw recovered"></span>${g.r} recovered</span><span><span class="sw inferred"></span>${g.i} inferred</span><span><span class="sw speculative"></span>${g.s} speculative</span><span class="faint">${plural(g.contra, 'contradiction')}</span>
      </div></div>`;
  }

  // ---------------------------------------------------------------- LEDGER
  function viewLedger() {
    const w = W();
    const q = normq(S.ledgerQ);
    const items = w.ledger.filter(n => (S.ledgerTier === 'all' || (S.ledgerTier === 'unlinked' ? !isLinked(n) : n.tier === S.ledgerTier)) && (!q || normq(n.text + ' ' + n.why + ' ' + n.kind + ' ' + (n.says || '') + ' ' + (n.does || '') + ' ' + n.links.map(l => l.q).join(' ')).includes(q)));
    const g = integrity(w);
    const count = k => w.ledger.filter(n => n.tier === k).length;
    const orphans = w.ledger.filter(n => n.links.some(r => !findRef(r))).length;
    return `
      <div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:8px">
        <div><div class="kicker">Character ledger</div><h1 style="font-size:24px">${plural(w.ledger.length, 'note')}</h1></div>
        ${RO() ? '' : `<button class="btn pri" data-a="newnote">New note</button>`}
      </div>
      <p class="dim" style="font-size:14px;margin:0 0 12px">Recovered is on the page. Inferred follows from it. Speculative is yours. Moving a note between them asks why, and keeps the record.</p>
      ${integrityBar(w)}
      <input class="search" type="search" placeholder="Search notes and quotes" value="${esc(S.ledgerQ)}" data-f="ledgerq" aria-label="Search">
      <div class="row" style="margin:10px 0 14px">
        <button class="chip ${S.ledgerTier === 'all' ? 'on' : ''}" data-a="ltier" data-v="all">All ${w.ledger.length}</button>
        ${TIERS.map(t => `<button class="chip ${S.ledgerTier === t.k ? 'on' : ''}" data-a="ltier" data-v="${t.k}">${t.label} ${count(t.k)}</button>`).join('')}
        <button class="chip ${S.ledgerTier === 'unlinked' ? 'on' : ''}" data-a="ltier" data-v="unlinked">Unlinked ${g.unlinked}</button>
      </div>
      ${S.ledgerTier === 'unlinked' ? `<p class="dim" style="font-size:14px;margin:-4px 0 12px">${g.unlinked ? 'Not tied to any line. Find support on the page, or cut it.' : 'Every note is tied to a line.'}</p>` : ''}
      ${orphans ? `<div class="msg bad">${plural(orphans, 'note has', 'notes have')} a link the current script no longer contains. The quote is kept. Re-link or leave it.</div>` : ''}
      ${items.map(noteMini).join('') || `<p class="faint">${w.ledger.length ? (S.ledgerTier === 'unlinked' ? '' : 'Nothing matches.') : 'Empty. Tap any line in a scene and choose "Add to ledger", or start a note here.'}</p>`}
    `;
  }

  // ---------------------------------------------------------------- PACK
  function viewPack() {
    const p = S.project, w = W(), chain = verifyChain(p);
    const passes = p.passes.slice().reverse();
    return `
      <div class="kicker">Pack</div>
      <h1 style="font-size:24px;margin-bottom:12px">Keep it, print it, send it</h1>

      <div class="card">
        <h3 style="font-size:15px;margin-bottom:4px">Project file</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">${p.lastSaved ? 'Last saved to a file ' + fmtDate(p.lastSaved) + '.' + (p.dirty ? ' ' + plural(p.dirty, 'change') + ' since.' : ' Up to date.') : '<b style="color:var(--tung-text)">Never saved to a file.</b>'} Phones can clear browser storage on their own, so the file is the real copy.</p>
        <div class="row">
          <button class="btn pri" data-a="savefile">${navigator.canShare ? 'Save or share file' : 'Save project file'}</button>
          <button class="btn" data-a="openproj">Open a project file</button>
          <button class="btn" data-a="revise">Revised pages</button>
        </div>
        <p class="faint" style="font-size:13px;margin:8px 0 0">Revised pages: load the new script and keep all your work. Links follow their quotes. Anything that can't be found is flagged, never dropped.</p>
      </div>

      <div class="card">
        <h3 style="font-size:15px;margin-bottom:4px">Passes</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">Freeze where you are (audition, callback, set). Earlier passes are kept, never overwritten.</p>
        ${RO() ? '' : `<div class="row"><input class="field" id="passname" style="flex:1;min-width:160px" placeholder="Pass ${p.passes.length + 1}" aria-label="Pass name"><button class="btn pri" data-a="savepass">Save pass</button></div>`}
        ${passes.map(ps => `<div class="proj" style="margin-top:8px"><div style="flex:1;padding:6px 0"><b>${esc(ps.name)}</b><small>${fmtDate(ps.at)} · ${plural(ps.work.ledger.length, 'note')} · ${plural(ps.work.tags.length, 'tag')}</small></div>
          <button class="btn sm" data-a="viewpass" data-id="${ps.id}">View</button><button class="btn sm" data-a="comparepass" data-id="${ps.id}">Compare</button></div>`).join('')}
        ${S.compare ? viewCompare() : ''}
      </div>

      <div class="card">
        <h3 style="font-size:15px;margin-bottom:4px">Print packet</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">Prints, or saves as PDF from the print dialog.</p>
        <label class="row" style="min-height:var(--tap)"><input type="checkbox" id="pr_char" checked style="width:22px;height:22px"> Character packet (arc, relationships, ledger, contradictions)</label>
        <label class="row" style="min-height:var(--tap)"><input type="checkbox" id="pr_scene" checked style="width:22px;height:22px"> Scene receipts for your scenes</label>
        <label class="row" style="min-height:var(--tap)"><input type="checkbox" id="pr_sides" checked style="width:22px;height:22px"> Sides with your lines highlighted and cues underlined</label>
        <div class="row" style="margin-top:8px"><button class="btn pri" data-a="print">Print / Save PDF</button></div>
      </div>

      <div class="card">
        <h3 style="font-size:15px;margin-bottom:4px">Receipts</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">${chain.ok ? 'Chain intact.' : '<b style="color:var(--bad)">Chain broken.</b> The file was edited outside BREAKDOWN.'} Script ${esc(p.source.hash.slice(0, 12))} · ${esc(p.source.name)}</p>
        <table class="mini">${p.receipts.slice(-6).reverse().map(r => `<tr><td class="mono" style="font-size:12px">${esc(r.kind)}</td><td>${esc(r.note || '')}<br><span class="faint mono" style="font-size:11px">${esc(r.hash.slice(0, 16))} · ${fmtDate(r.at)}</span></td></tr>`).join('')}</table>
      </div>

      <div class="card">
        <h3 style="font-size:15px;margin-bottom:4px">How the script was read</h3>
        <p class="dim" style="font-size:14px;margin:0 0 10px">${esc(S.doc.kind.toUpperCase())} · ${S.doc.layout ? 'read by page layout' : 'read by text pattern'} · ${plural(Object.keys(S.doc.characters).length, 'character')} · ${plural(Object.keys(p.overrides).length, 'fix', 'fixes')}</p>
        <button class="btn" data-a="parseview">Check and fix</button>
      </div>

      <div class="row" style="margin:16px 0"><button class="btn ghost bad" data-a="delproject">Delete this project from this device</button></div>
    `;
  }

  function diffWork(a, b) {
    const out = { added: [], removed: [], changed: [], tagsAdded: [], tagsRemoved: [], fields: [] };
    const A = Object.fromEntries(a.ledger.map(n => [n.id, n])), B = Object.fromEntries(b.ledger.map(n => [n.id, n]));
    b.ledger.forEach(n => { if (!A[n.id]) out.added.push(n); else if (A[n.id].text !== n.text || A[n.id].tier !== n.tier || A[n.id].links.length !== n.links.length) out.changed.push({ was: A[n.id], now: n }); });
    a.ledger.forEach(n => { if (!B[n.id]) out.removed.push(n); });
    const TA = new Set(a.tags.map(t => t.id)), TB = new Set(b.tags.map(t => t.id));
    b.tags.forEach(t => { if (!TA.has(t.id)) out.tagsAdded.push(t); });
    a.tags.forEach(t => { if (!TB.has(t.id)) out.tagsRemoved.push(t); });
    ['open', 'change', 'close'].forEach(k => { if ((a.arc[k] || '') !== (b.arc[k] || '')) out.fields.push({ label: 'Arc: ' + k, was: a.arc[k], now: b.arc[k] }); });
    const keys = new Set(Object.keys(a.scenes).concat(Object.keys(b.scenes)));
    keys.forEach(k => ['entry', 'exit'].forEach(f => { const x = (a.scenes[k] || {})[f] || '', y = (b.scenes[k] || {})[f] || ''; if (x !== y) out.fields.push({ label: k.replace(/#\d+$/, '') + ' ' + f, was: x, now: y }); }));
    const rk = new Set(Object.keys(a.rel).concat(Object.keys(b.rel)));
    rk.forEach(k => ['want', 'obstacle', 'leverage', 'history'].forEach(f => { const x = (a.rel[k] || {})[f] || '', y = (b.rel[k] || {})[f] || ''; if (x !== y) out.fields.push({ label: k + ' ' + f, was: x, now: y }); }));
    return out;
  }
  function viewCompare() {
    const ps = S.project.passes.find(x => x.id === S.compare); if (!ps) return '';
    const D = diffWork(ps.work, S.project.work);
    const none = !D.added.length && !D.removed.length && !D.changed.length && !D.tagsAdded.length && !D.tagsRemoved.length && !D.fields.length;
    const tagLine = t => `<li><span class="tag" style="background:var(--L-${t.layer})">${LMAP[t.layer].short}</span> ${esc(t.note || '')} <span class="faint mono" style="font-size:12px">${esc(t.ref.q.slice(0, 50))}</span></li>`;
    return `<div style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">
      <div class="row" style="justify-content:space-between"><b>${esc(ps.name)} → now</b><button class="btn sm ghost" data-a="comparepass" data-id="">Close</button></div>
      ${none ? '<p class="dim">No changes since this pass.</p>' : ''}
      ${D.added.length ? `<div class="kicker" style="margin-top:10px">New notes</div><ul>${D.added.map(n => `<li>${esc(n.text)} <span class="tier ${n.tier}">${n.tier}</span></li>`).join('')}</ul>` : ''}
      ${D.changed.length ? `<div class="kicker">Changed notes</div><ul>${D.changed.map(c => `<li><s class="faint">${esc(c.was.text)} (${c.was.tier})</s><br>${esc(c.now.text)} (${c.now.tier})</li>`).join('')}</ul>` : ''}
      ${D.removed.length ? `<div class="kicker">Removed notes</div><ul>${D.removed.map(n => `<li><s>${esc(n.text)}</s></li>`).join('')}</ul>` : ''}
      ${D.tagsAdded.length ? `<div class="kicker">New tags</div><ul>${D.tagsAdded.map(tagLine).join('')}</ul>` : ''}
      ${D.tagsRemoved.length ? `<div class="kicker">Removed tags</div><ul>${D.tagsRemoved.map(tagLine).join('')}</ul>` : ''}
      ${D.fields.length ? `<div class="kicker">Rewritten</div><ul>${D.fields.map(f => `<li><b>${esc(f.label)}</b><br><s class="faint">${esc(f.was || '(empty)')}</s><br>${esc(f.now || '(empty)')}</li>`).join('')}</ul>` : ''}
    </div>`;
  }

  // ---------------------------------------------------------------- parse check
  function viewParse() {
    const d = S.doc;
    return `
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><button class="btn ghost sm" data-a="parseclose">${ICON.back} Done</button><span class="faint" style="font-size:13px">${plural(Object.keys(S.project.overrides).length, 'fix', 'fixes')}</span></div>
      <div class="kicker">How the script was read</div>
      <p class="dim" style="font-size:14px">Every block with what BREAKDOWN thinks it is. Tap one that's wrong and set it right. Your notes follow their quotes.</p>
      <div class="page parse">${d.elements.filter(e => !e.hidden).map(e => `<button class="el ${e.type}" data-a="fixline" data-el="${e.n}"><span class="ty ${e.type}">${e.type.toUpperCase()}</span>${esc(e.text.slice(0, 220))}</button>`).join('')}</div>
      ${Object.keys(S.project.overrides).length ? `<div class="row" style="margin-top:12px"><button class="btn bad" data-a="clearfixes">Undo all fixes</button></div>` : ''}`;
  }

  // ---------------------------------------------------------------- sheet
  function openSheet(html) {
    let scrim = $('.scrim'), sh = $('.sheet');
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.a = 'closesheet'; document.body.appendChild(scrim); }
    if (!sh) { sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true'); document.body.appendChild(sh); }
    sh.innerHTML = '<div class="grab"></div><button class="iconbtn x" data-a="closesheet" aria-label="Close">' + ICON.close + '</button>' + html;
    requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  }
  /* SAY IT: speech into the note being written. Only while you hold it on; STOP or closing the note stops it. */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let DICT = null;
  function dictStop() { if (!DICT) return; const r = DICT; DICT = null; try { r.stop(); } catch (e) {} const b = $('#nt_say'), w = $('#nt_sayw'); if (b) b.textContent = 'SAY IT'; if (w) w.textContent = 'Stopped. Edit it, then save.'; }
  function dictStart() {
    const ta = $('#nt_text'); if (!SR || !ta) return;
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = (window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US'));
    const base = ta.value.trim(); let fin = '';
    r.onresult = ev => { let inter = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const x = ev.results[i]; if (x.isFinal) fin += (fin ? ' ' : '') + x[0].transcript.trim(); else inter += x[0].transcript; }
      const t = $('#nt_text'); if (t) t.value = [base, fin, inter.trim()].filter(Boolean).join(base || fin ? ' ' : ''); };
    r.onerror = ev => { const w = $('#nt_sayw'); if (w) w.textContent = ev && ev.error === 'not-allowed' ? 'The mic is blocked for this site.' : 'Speech stopped.'; };
    r.onend = () => { if (DICT === r) dictStop(); };
    DICT = r; try { r.start(); } catch (e) { DICT = null; return; }
    const b = $('#nt_say'), w = $('#nt_sayw'); if (b) b.textContent = 'STOP'; if (w) w.textContent = 'Listening. What you say goes in the note.';
  }
  function closeSheet(instant) {
    dictStop();
    const scrim = $('.scrim'), sh = $('.sheet');
    if (!sh) return;
    scrim.classList.remove('on'); sh.classList.remove('on');
    const kill = () => { scrim.remove(); sh.remove(); };
    if (instant) kill(); else setTimeout(kill, 180);
  }
  function lineSheet(n, quote) {
    const d = S.doc, el = d.elements[n], w = W();
    const q = quote || el.text;
    const tags = w.tags.filter(t => { const e = findRef(t.ref); return e && e.n === el.n; });
    const sc = d.scenes[el.sc];
    const head = `<div class="kicker">${esc(el.type)}${el.who ? ' · ' + esc(el.who) : ''} · p.${el.pg} · ${esc(scLabel(sc))}</div><p class="mono" style="font-size:16px;margin:0 0 12px">${esc(q)}</p>`;
    if (RO()) { openSheet(head + tags.map(t => `<div><span class="tag" style="background:var(--L-${t.layer})">${LMAP[t.layer].short}</span> ${esc(t.note || '')}</div>`).join('') + `<button class="btn block" style="margin-top:12px" data-a="closesheet">Close</button>`); return; }
    if (S.pair) {
      openSheet(head + `<button class="btn pri block" data-a="paircomplete" data-el="${n}" data-q="${esc(q)}">Pair with "${esc(S.pair.q.slice(0, 50))}"</button><button class="btn ghost block" style="margin-top:8px" data-a="pairstop">Cancel pairing</button>`);
      return;
    }
    openSheet(head + `
      <div class="kicker">Tag a layer</div>
      <div class="lgrid">${LAYERS.map(l => { const on = tags.find(t => t.layer === l.k); return `<button class="lbtn ${on ? 'on' : ''}" style="color:var(--L-${l.k})" data-a="tagline" data-el="${n}" data-l="${l.k}" data-q="${esc(q)}"><i style="background:var(--L-${l.k})"></i><span style="color:var(--ink)">${l.label}</span></button>`; }).join('')}</div>
      ${tags.map(t => `<div class="row" style="margin:6px 0;flex-wrap:nowrap"><span class="tag" style="background:var(--L-${t.layer});flex:none">${LMAP[t.layer].short}</span><input class="field" style="flex:1;min-width:0" data-f="tagnote.${t.id}" value="${esc(t.note || '')}" placeholder="Note (optional)"><button class="iconbtn" data-a="untag" data-id="${t.id}" data-el="${n}" aria-label="Remove tag">${ICON.close}</button></div>`).join('')}
      <div class="kicker" style="margin-top:14px">Ledger</div>
      <div class="row">
        <button class="btn pri" data-a="noteline" data-el="${n}" data-q="${esc(q)}">Add to ledger</button>
        ${w.ledger.length ? `<button class="btn" data-a="linkline" data-el="${n}" data-q="${esc(q)}">Link to a note</button>` : ''}
        <button class="btn" data-a="pairstart" data-el="${n}" data-q="${esc(q)}">Start a contradiction</button>
      </div>
      <div class="row" style="margin-top:14px">
        ${S.tab !== 'scene' ? `<button class="btn ghost" data-a="goline" data-el="${n}">Open in scene</button>` : ''}
        <button class="btn ghost" data-a="fixline" data-el="${n}">Misread? Fix it</button>
      </div>`);
  }
  function noteSheet(note, isNew) {
    const tiers = TIERS.map(t => `<button class="chip ${note.tier === t.k ? 'on' : ''}" data-a="settier" data-v="${t.k}">${t.label}</button>`).join('');
    const kinds = KINDS.map(k => `<button class="chip ${note.kind === k ? 'on' : ''}" data-a="setkind" data-v="${k}" style="min-height:40px">${k}</button>`).join('');
    const tierHint = (TIERS.find(t => t.k === note.tier) || {}).hint || '';
    S.editing = note;
    openSheet(`
      <div class="kicker">${isNew ? 'New note' : 'Edit note'}</div>
      <textarea class="field" id="nt_text" placeholder="What does this tell you?" style="min-height:96px">${esc(note.text)}</textarea>
      ${SR ? `<div class="row" style="margin-top:6px"><button class="btn sm" data-a="dictate" id="nt_say">${DICT ? 'STOP' : 'SAY IT'}</button><span class="faint" style="font-size:13px" id="nt_sayw">${DICT ? 'Listening. What you say goes in the note.' : 'Speech to words: Chrome sends it to Google, Safari to Apple.'}</span></div>` : ''}
      ${note.kind === 'contradiction' ? `<div class="sdgrid"><div><label class="lab">Says</label><textarea class="field" id="nt_says" placeholder="${note.links[0] ? 'Optional, the line covers it' : 'What they claim'}">${esc(note.says || '')}</textarea></div><div><label class="lab">Does</label><textarea class="field" id="nt_does" placeholder="${note.links[1] ? 'Optional, the line covers it' : 'What undercuts it, on the page or in your read'}">${esc(note.does || '')}</textarea></div></div>` : ''}
      <label class="lab">Tier</label><div class="row" id="nt_tiers">${tiers}</div>
      <p class="faint" style="font-size:13px;margin:6px 0 0" id="nt_hint">${esc(tierHint)}</p>
      <div id="nt_whybox" class="${note._tierChange || note.tier === 'inferred' ? '' : 'hide'}">
        <label class="lab" id="nt_whylab">${note._tierChange ? 'Why the move from ' + esc(note._from) + '? (required)' : 'Why (what on the page leads you here)'}</label>
        <textarea class="field" id="nt_why">${esc(note._tierChange ? '' : note.why || '')}</textarea>
      </div>
      ${note.kind === 'history' ? `<label class="lab">When</label><input class="field" id="nt_when" value="${esc(note.when || '')}" placeholder="e.g. 11 months before, age 12">` : ''}
      <label class="lab">Kind (optional)</label><div class="row" style="gap:6px">${kinds}</div>
      <label class="lab">Evidence</label>
      ${note.links.map((r, i) => { const L = refLabel(r); return `<div class="row" style="flex-wrap:nowrap"><button class="ref ${L.orphan ? 'orphan' : ''}" style="flex:1;min-height:var(--tap)" ${L.el ? `data-a="goline" data-el="${L.el.n}"` : ''}>${esc(L.txt)}</button><button class="iconbtn" data-a="unlink" data-i="${i}" aria-label="Remove link">${ICON.close}</button></div>`; }).join('') || '<p class="faint" style="font-size:13px;margin:0">No lines linked. Tap a line in a scene, then "Link to a note".</p>'}
      ${note.history && note.history.length ? `<label class="lab">Record</label>${note.history.map(h => `<div class="faint" style="font-size:13px">${fmtDate(h.at)}: ${esc(h.from)} → ${esc(h.to)}. ${esc(h.why)}</div>`).join('')}` : ''}
      <div id="nt_err" class="msg bad hide"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn pri" data-a="savenote" style="flex:1">Save</button>
        ${isNew ? '' : `<button class="btn bad" data-a="delnote">Delete</button>`}
        <button class="btn ghost" data-a="closesheet">Cancel</button>
      </div>`);
    S.editingNew = isNew;
  }
  function syncNoteForm() {
    const n = S.editing; if (!n) return;
    const t = $('#nt_text'), w = $('#nt_why'), wh = $('#nt_when'), sa = $('#nt_says'), dz = $('#nt_does');
    if (sa) n.says = sa.value;
    if (dz) n.does = dz.value;
    if (t) n.text = t.value;
    if (w) n._why = w.value;
    if (wh) n.when = wh.value;
  }

  // ---------------------------------------------------------------- print
  function buildPrint() {
    const d = S.doc, M = S.me, w = W(), p = S.project;
    const incC = $('#pr_char') ? $('#pr_char').checked : true, incS = $('#pr_scene') ? $('#pr_scene').checked : true, incD = $('#pr_sides') ? $('#pr_sides').checked : true;
    const qt = (el, q) => `<div class="quote">${esc(q || el.text)} <small>(${el.who ? esc(el.who) + ', ' : ''}p.${el.pg}, ${esc(scLabel(d.scenes[el.sc]))})</small></div>`;
    const refQ = r => { const el = findRef(r); return el ? qt(el, r.q) : `<div class="quote"><s>${esc(r.q)}</s> <small>(not in current script)</small></div>`; };
    let h = `<h1>${esc(p.title)}</h1><div>${esc(M.names.join(' + '))} · ${S.viewPass ? esc(passName(S.viewPass)) : 'Current pass'} · ${new Date().toLocaleDateString()}</div><div style="font-size:9pt;color:#666">BREAKDOWN ${VERSION} · script ${esc(p.source.hash.slice(0, 12))} · ${esc(p.source.name)}</div>`;
    if (incC) {
      h += `<h2>Character packet</h2><table><tr><th>Scenes</th><th>Speeches</th><th>Words</th><th>Pages</th></tr><tr><td>${M.myScenes.length} of ${d.scenes.length}</td><td>${M.mine.length}</td><td>${M.words}</td><td>${M.firstPg}-${M.lastPg}</td></tr></table>`;
      if (M.intro) h += `<h3>First on the page</h3>` + qt(M.intro);
      h += `<h3>Arc receipt</h3><table><tr><th style="width:24%">Opening state</th><td>${esc(w.arc.open) || '-'}</td></tr>`;
      const ev = w.tags.map(t => ({ t, el: findRef(t.ref) })).filter(x => x.el && M.myScenes.includes(x.el.sc) && ['turn', 'pressure', 'power', 'event'].includes(x.t.layer)).sort((a, b) => a.el.n - b.el.n);
      h += `<tr><th>Pressure events</th><td>${ev.map(x => `<b>${LMAP[x.t.layer].label}</b> ${esc(x.t.note || '')}${qt(x.el, x.t.ref.q)}`).join('') || '-'}</td></tr>`;
      h += `<tr><th>What changes</th><td>${esc(w.arc.change) || '-'}</td></tr><tr><th>Ending state</th><td>${esc(w.arc.close) || '-'}</td></tr></table>`;
      if (M.partners.length) h += `<h3>Relationships</h3><table><tr><th>Who</th><th>Want</th><th>Obstacle</th><th>Leverage</th><th>History</th></tr>${M.partners.map(pt => { const r = w.rel[pt.name] || {}; return `<tr><td><b>${esc(pt.name)}</b><br><small>${pt.scenes.length} sc · ${pt.exchanges} exch.</small></td><td>${esc(r.want || '')}</td><td>${esc(r.obstacle || '')}</td><td>${esc(r.leverage || '')}</td><td>${esc(r.history || '')}</td></tr>`; }).join('')}</table>`;
      const g = integrity(w);
      if (g.t) h += `<h3>Evidence integrity</h3><table><tr><th>Recovered</th><th>Inferred</th><th>Speculative</th><th>Linked to a line</th><th>Contradictions</th></tr><tr><td>${g.r} (${g.ground}%)</td><td>${g.i}</td><td>${g.s}</td><td>${g.linked} of ${g.t} (${g.pct}%)</td><td>${g.contra}</td></tr></table>`;
      TIERS.forEach(t => {
        const ns = w.ledger.filter(n => n.tier === t.k && n.kind !== 'contradiction');
        if (ns.length) h += `<h3>Ledger · ${t.label}</h3>` + ns.map(n => `<div style="margin:4pt 0 8pt;break-inside:avoid"><span class="tierlab">${t.label.toUpperCase()}</span>${n.kind ? '<i>' + esc(n.kind) + '</i> ' : ''}${n.when ? '(' + esc(n.when) + ') ' : ''}${esc(n.text)}${n.why ? `<div style="font-size:9pt;color:#555">Why: ${esc(n.why)}</div>` : ''}${n.links.map(refQ).join('')}</div>`).join('');
      });
      const cs = w.ledger.filter(n => n.kind === 'contradiction');
      if (cs.length) h += `<h3>Contradictions</h3>` + cs.map(n => `<div style="margin:4pt 0 10pt;break-inside:avoid"><span class="tierlab">${n.tier.toUpperCase()}</span>${esc(n.text)}${n.says ? `<div><b>Says:</b> ${esc(n.says)}</div>` : ''}${n.does ? `<div><b>Does:</b> ${esc(n.does)}</div>` : ''}${n.links.map(refQ).join('<div style="font-size:8pt;letter-spacing:.1em">VS</div>')}</div>`).join('');
      if (M.questions.length) h += `<h3>Questions put to you</h3>` + M.questions.map(x => qt(x.q)).join('');
    }
    if (incS) {
      h += `<h2 class="pb">Scene receipts</h2>`;
      M.myScenes.forEach(si => {
        const sc = d.scenes[si], st = w.scenes[sc.key] || {};
        const tags = w.tags.map(t => ({ t, el: findRef(t.ref) })).filter(x => x.el && x.el.sc === si);
        h += `<div style="break-inside:avoid;margin-bottom:12pt"><h3>${esc(scLabel(sc))} · ${esc(sc.heading)} · p.${sc.pg}</h3><table><tr><th style="width:22%">Entry</th><td>${esc(st.entry || '-')}</td></tr>`;
        LAYERS.forEach(l => { const xs = tags.filter(x => x.t.layer === l.k).sort((a, b) => a.el.n - b.el.n); if (xs.length) h += `<tr><th>${l.label}s</th><td>${xs.map(x => `${esc(x.t.note || '')}${qt(x.el, x.t.ref.q)}`).join('')}</td></tr>`; });
        h += `<tr><th>Exit</th><td>${esc(st.exit || '-')}</td></tr></table></div>`;
      });
    }
    if (incD) {
      h += `<h2 class="pb">Sides · ${esc(M.names.join(' + '))}</h2><div class="side">`;
      M.myScenes.forEach(si => {
        d.scenes[si].els.map(k => d.elements[k]).filter(e => !e.hidden).forEach(e => {
          const cls = [e.type, M.mineEl.has(e.n) ? 'mine' : '', M.cueSet.has(e.n) && !M.mineEl.has(e.n) ? 'cueline' : ''].join(' ');
          h += `<p class="${cls}"><span>${esc(e.text)}</span></p>`;
        });
      });
      h += `</div>`;
    }
    $('#print').innerHTML = h;
  }

  // ---------------------------------------------------------------- file out / in
  async function saveFile() {
    const p = S.project;
    addReceipt(p, 'EXPORT', 'project file', sha256(JSON.stringify(p.work)));
    p.lastSaved = now(); p.dirty = 0;
    const out = Object.assign({}, p, {
      cco: { surface: 'act.breakdown', shared: { active_target: p.id }, note: 'Shared vocabulary only. Not wired to a bus in this build.' }
    });
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    const fname = slug(p.title) + '__' + slug(p.me.join('_')) + '.breakdown.json';
    await DB.put(p);
    let shared = false;
    try {
      const file = new File([blob], fname, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: p.title }); shared = true;
      }
    } catch (e) { if (e && e.name === 'AbortError') { renderShell(true); return; } }
    if (!shared) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
    toast('Saved ' + fname);
    renderShell(true);
  }
  async function openProjectFile(file) {
    try {
      const p = JSON.parse(await file.text());
      if (p.schema !== SCHEMA) throw new Error('Not a BREAKDOWN 0.3 project file.');
      delete p.cco;
      const existing = await DB.get(p.id);
      if (existing && existing.updated > p.updated && !confirm('This device has a newer version of "' + p.title + '". Replace it with the file?')) return;
      const chain = verifyChain(p);
      addReceipt(p, 'OPEN', file.name + (chain.ok ? '' : ' (chain broken before open)'), sha256(JSON.stringify(p.work)));
      await DB.put(p);
      S.tab = 'me';
      await openProject(p);
      if (!chain.ok) toast('Opened. Receipt chain was broken in this file.');
    } catch (e) { S.homeMsg = e.message; if (!S.project) render(); else toast(e.message); }
  }
  async function revise(file) {
    try {
      const r = await readFile(file);
      const p = S.project;
      const oldSrc = p.source;
      p.source = packSource(r.src, r.name); p.overrides = {};
      reparseSafe();
      const missing = p.me.filter(n => !S.doc.characters[n]);
      const res = reanchor(p.work);
      addReceipt(p, 'REVISE', r.name + ' replaces ' + oldSrc.name, p.source.hash);
      touch();
      S.me = computeMe();
      renderShell();
      toast(`Revised pages loaded. ${res.moved} links moved, ${res.orphan} not found.` + (missing.length ? ' ' + missing.join(', ') + ' no longer speaks.' : ''));
    } catch (e) { toast(e.message || String(e)); }
  }
  function reparseSafe() { S.doc = P.parse(unpackSource(S.project.source), S.project.overrides); S.me = S.project.me.length ? computeMe() : null; }

  // ---------------------------------------------------------------- toast
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
    document.body.appendChild(t); setTimeout(() => t.remove(), 3600);
  }

  // ---------------------------------------------------------------- actions
  function setField(key, val) {
    const w = S.project.work, p = S.project;
    if (key === 'aka') { p.aka = val.split(',').map(s => s.trim()).filter(Boolean); S.me = computeMe(); touch(); return 'aka'; }
    if (key === 'ledgerq') { S.ledgerQ = val; return 'ledgerq'; }
    if (key.startsWith('arc.')) { w.arc[key.slice(4)] = val; touch(); return; }
    if (key.startsWith('scene.')) { const i = key.lastIndexOf('.'); const sk = key.slice(6, i), f = key.slice(i + 1); (w.scenes[sk] = w.scenes[sk] || {})[f] = val; touch(); return; }
    if (key.startsWith('rel.')) { const i = key.lastIndexOf('.'); const nm = key.slice(4, i), f = key.slice(i + 1); (w.rel[nm] = w.rel[nm] || {})[f] = val; touch(); return; }
    if (key.startsWith('tagnote.')) { const t = w.tags.find(x => x.id === key.slice(8)); if (t) { t.note = val; touch(); } return; }
  }

  async function act(a, ds, target) {
    ds = ds || {};
    const p = S.project, w = p ? p.work : null;
    switch (a) {
      // home
      case 'pickfile': $('#filein').click(); break;
      case 'togglepaste': S.homePaste = !S.homePaste; render(); if (S.homePaste) setTimeout(() => $('#pastebox') && $('#pastebox').focus(), 50); break;
      case 'pastego': { const t = $('#pastebox').value; if (t.trim()) intake(t, 'pasted text'); break; }
      case 'sample': {
        try {
          const r = await fetch('samples/LAST_BUS_sides.txt'); if (!r.ok) throw new Error();
          intake(await r.text(), 'LAST_BUS_sides.txt');
        } catch (e) { intake(SAMPLE_FALLBACK, 'LAST BUS (sample)'); }
        break;
      }
      case 'openproj': $('#projin').click(); break;
      case 'openrecent': { const pr = await DB.get(ds.id); S.tab = 'me'; openProject(pr); if (SH && pr && pr.shelf) try { SH.use(pr.shelf, 'breakdown'); } catch (e) { } break; }
      case 'delrecent': { if (confirm('Delete this project from this device? A saved project file is not affected.')) { await DB.del(ds.id); render(); } break; }
      case 'home': S.project = null; S.doc = null; S.me = null; S.viewPass = null; S.parseView = false; S.pair = null; render(); break;
      // pick
      case 'pickme': {
        const n = ds.n;
        if (S.addingRole) { if (!p.me.includes(n)) p.me.push(n); S.addingRole = false; }
        else p.me = [n];
        if (SH && p.shelf) try { SH.setMe(p.shelf, p.me[0], 'breakdown'); } catch (e) { }
        touch(); S.me = computeMe(); S.tab = 'me'; S.run.i = 0; render(); break;
      }
      case 'changerole': p.me = []; S.addingRole = false; S.me = null; render(); break;
      case 'addrole': {
        const others = Object.keys(S.doc.characters).filter(n => !p.me.includes(n));
        openSheet(`<div class="kicker">Add a role you also play</div>${others.map(n => `<button class="pick" data-a="addrole2" data-n="${esc(n)}"><b>${esc(n)}</b><span>${plural(S.doc.characters[n].speeches, 'speech', 'speeches')}</span></button>`).join('')}`);
        break;
      }
      case 'addrole2': if (!p.me.includes(ds.n)) p.me.push(ds.n); touch(); S.me = computeMe(); closeSheet(); renderShell(true); break;
      // nav
      case 'tab': S.tab = ds.t; S.parseView = false; renderShell(); break;
      case 'theme': {
        const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
        const nx = cur === 'light' ? 'dark' : 'light';
        document.documentElement.dataset.theme = nx; try { localStorage.setItem('bd_theme', nx); } catch (e) { }
        break;
      }
      case 'goscene': if (ds.sc === undefined || ds.sc === 'null' || ds.sc === '') break; S.sc = +ds.sc; S.tab = 'scene'; S.parseView = false; renderShell(); break;
      case 'goline': case 'jumptag': { const el = S.doc.elements[+ds.el]; if (!el) break; closeSheet(true); S.sc = el.sc; S.tab = 'scene'; S.parseView = false; S.flashEl = el.n; renderShell(); break; }
      case 'onlymine': S.myScenesOnly = true; renderShell(true); break;
      case 'allscenes': S.myScenesOnly = false; renderShell(true); break;
      case 'layer': S.layersOn[ds.l] = !S.layersOn[ds.l]; renderShell(true); break;
      case 'mapjump': {
        const box = target.getBoundingClientRect(); const x = (ds._x - box.left) / box.width;
        const sc = S.doc.scenes[S.sc]; const els = sc.els.map(k => S.doc.elements[k]).filter(e => !e.hidden);
        const total = els.reduce((n, e) => n + Math.max(20, e.text.length), 0); let acc = 0, hit = els[0];
        for (const e of els) { acc += Math.max(20, e.text.length); if (acc / total >= x) { hit = e; break; } }
        const node = document.querySelector(`[data-el="${hit.n}"]`); if (node) { node.scrollIntoView({ block: 'center', behavior: 'smooth' }); node.classList.remove('flash'); void node.offsetWidth; node.classList.add('flash'); }
        break;
      }
      case 'openfield': S.openField = Object.assign({}, S.openField, { [ds.k]: true }); renderShell(true); { const f = document.querySelector(`[data-f="${CSS.escape(ds.k)}"]`); if (f) f.focus(); } break;
      case 'relopen': S.relOpen = S.relOpen === ds.n ? null : ds.n; renderShell(true); break;
      // lines
      case 'line': lineSheet(+ds.el, ds.q || null); break;
      case 'closesheet': S.editing = null; closeSheet(); break;
      case 'tagline': {
        if (RO()) break;
        const el = S.doc.elements[+ds.el];
        const ex = w.tags.find(t => t.layer === ds.l && (findRef(t.ref) || {}).n === el.n);
        if (!ex) { w.tags.push({ id: rid(), layer: ds.l, note: '', ref: mkRef(el), at: now() }); touch(); }
        renderShell(true); lineSheet(el.n, ds.q);
        setTimeout(() => { const t = w.tags.find(t => t.layer === ds.l && (findRef(t.ref) || {}).n === el.n); const f = t && document.querySelector(`[data-f="tagnote.${t.id}"]`); if (f && !ex) f.focus(); }, 220);
        break;
      }
      case 'untag': { const i = w.tags.findIndex(t => t.id === ds.id); if (i >= 0) w.tags.splice(i, 1); touch(); renderShell(true); lineSheet(+ds.el); break; }
      case 'noteline': { const el = S.doc.elements[+ds.el]; closeSheet(true); noteSheet({ id: rid(), text: '', tier: 'recovered', kind: '', why: '', links: [mkRef(el, ds.q)], history: [], at: now() }, true); break; }
      case 'newnote': noteSheet({ id: rid(), text: '', tier: ds.kind === 'history' ? 'speculative' : 'speculative', kind: ds.kind || '', why: '', links: [], history: [], at: now() }, true); break;
      case 'linkline': {
        const el = S.doc.elements[+ds.el];
        S.linking = mkRef(el, ds.q);
        openSheet(`<div class="kicker">Link this line to a note</div><p class="mono" style="font-size:14px">${esc(S.linking.q)}</p>${w.ledger.map(n => `<button class="note" data-a="linkto" data-id="${n.id}"><div class="meta"><span class="tier ${n.tier}">${n.tier}</span></div><p>${esc(n.text || [n.says, n.does].filter(Boolean).join(' / '))}</p></button>`).join('')}`);
        break;
      }
      case 'linkto': { const n = w.ledger.find(x => x.id === ds.id); if (n && S.linking) { n.links.push(S.linking); n.upd = now(); touch(); toast('Linked.'); } S.linking = null; closeSheet(); renderShell(true); break; }
      case 'ownpair': noteSheet({ id: rid(), text: '', tier: 'inferred', kind: 'contradiction', why: '', links: [], history: [], at: now() }, true); setTimeout(() => { const f = $('#nt_says'); if (f) f.focus(); }, 220); break;
      case 'pairstart': { const el = S.doc.elements[+ds.el]; S.pair = mkRef(el, ds.q); closeSheet(); renderShell(true); break; }
      case 'pairstop': S.pair = null; closeSheet(true); renderShell(true); break;
      case 'paircomplete': {
        const el = S.doc.elements[+ds.el]; const b = mkRef(el, ds.q), a2 = S.pair; S.pair = null; closeSheet(true); renderShell(true);
        noteSheet({ id: rid(), text: '', tier: 'recovered', kind: 'contradiction', why: '', links: [a2, b], history: [], at: now() }, true);
        setTimeout(() => { const t = $('#nt_text'); if (t) { t.placeholder = 'What is the gap between these two?'; t.focus(); } }, 220);
        break;
      }
      // notes
      case 'editnote': { const n = W().ledger.find(x => x.id === ds.id); if (!n) break; if (RO()) { openSheet(`<div class="kicker">${esc(n.tier)} ${esc(n.kind || '')}</div><p>${esc(n.text)}</p>${n.why ? `<p class="dim">Why: ${esc(n.why)}</p>` : ''}${n.links.map(r => `<span class="ref">${esc(refLabel(r).txt)}</span>`).join('')}<button class="btn block" style="margin-top:12px" data-a="closesheet">Close</button>`); break; } noteSheet(Object.assign(clone(n), { _orig: n.tier }), false); break; }
      case 'settier': {
        syncNoteForm(); const n = S.editing; if (!n) break;
        const orig = S.editingNew ? null : n._orig;
        n.tier = ds.v;
        if (orig && orig !== ds.v) { n._tierChange = true; n._from = orig; } else { n._tierChange = false; }
        const keep = { text: n.text, why: n._why };
        noteSheet(n, S.editingNew);
        if ($('#nt_why') && !n._tierChange && n.tier === 'inferred') $('#nt_why').value = keep.why || n.why || '';
        break;
      }
      case 'setkind': syncNoteForm(); S.editing.kind = S.editing.kind === ds.v ? '' : ds.v; noteSheet(S.editing, S.editingNew); break;
      case 'unlink': syncNoteForm(); S.editing.links.splice(+ds.i, 1); noteSheet(S.editing, S.editingNew); break;
      case 'dictate': if (DICT) dictStop(); else dictStart(); break;
      case 'savenote': { dictStop();
        syncNoteForm(); const n = S.editing; const err = $('#nt_err');
        const fail = m => { err.textContent = m; err.classList.remove('hide'); };
        if (n.kind === 'contradiction' && !((n.links[0] || (n.says || '').trim()) && (n.links[1] || (n.does || '').trim()))) return fail('A contradiction needs both sides: a Says and a Does, as lines or in your words.');
        if (!n.text.trim() && n.kind !== 'contradiction') return fail('Write the note first.');
        if (n.tier === 'recovered' && !n.links.filter(r => findRef(r)).length) return fail('Recovered needs a line from the page. Link one, or call it Inferred or Speculative.');
        if (n._tierChange && !(n._why || '').trim()) return fail('Say why it moves from ' + n._from + ' to ' + n.tier + '.');
        if (n._tierChange) { n.history = (n.history || []).concat([{ at: now(), from: n._from, to: n.tier, why: n._why.trim() }]); }
        else if (n.tier === 'inferred') n.why = (n._why || '').trim();
        const clean = { id: n.id, text: n.text.trim(), tier: n.tier, kind: n.kind || '', why: n.why || '', links: n.links, history: n.history || [], at: n.at || now(), upd: now() };
        if (n.when) clean.when = n.when;
        if ((n.says || '').trim()) clean.says = n.says.trim();
        if ((n.does || '').trim()) clean.does = n.does.trim();
        const i = w.ledger.findIndex(x => x.id === n.id);
        if (i >= 0) w.ledger[i] = clean; else w.ledger.push(clean);
        S.editing = null; touch(); closeSheet(); renderShell(true); toast('Saved to ledger.');
        break;
      }
      case 'delnote': { if (!confirm('Delete this note? Saved passes keep their copy.')) break; const i = w.ledger.findIndex(x => x.id === S.editing.id); if (i >= 0) w.ledger.splice(i, 1); S.editing = null; touch(); closeSheet(); renderShell(true); break; }
      case 'ltier': S.ledgerTier = ds.v; renderShell(true); break;
      // fix parse
      case 'fixline': {
        if (RO()) break;
        const el = S.doc.elements[+ds.el];
        const opts = [['cue', 'Character name'], ['dialogue', 'Dialogue'], ['paren', 'Parenthetical'], ['action', 'Action'], ['heading', 'Scene heading'], ['transition', 'Transition'], ['noise', 'Ignore (page junk)']];
        openSheet(`<div class="kicker">This block was read as ${esc(el.type.toUpperCase())}</div><p class="mono" style="font-size:14px">${esc(el.text.slice(0, 240))}</p><div class="lgrid" style="grid-template-columns:1fr 1fr">${opts.map(([k, l]) => `<button class="lbtn ${el.type === k ? 'on' : ''}" data-a="fixset" data-el="${el.n}" data-v="${k}">${l}</button>`).join('')}</div><p class="faint" style="font-size:13px">If a character's line got swallowed, set the name line to Character name and the lines under it fix themselves.</p>`);
        break;
      }
      case 'fixset': {
        const el = S.doc.elements[+ds.el];
        el.raw.forEach(i => { p.overrides[i] = ds.v; });
        if (ds.v === 'cue') { // the line after a new cue is dialogue until a blank
          const lines = p.source.lines; let j = el.raw[el.raw.length - 1] + 1;
          while (j < lines.length && lines[j].t && !p.overrides[j]) { p.overrides[j] = lines[j].t[0] === '(' ? 'paren' : 'dialogue'; j++; }
        }
        const meBefore = p.me.slice();
        reparseSafe();
        const res = reanchor(p.work);
        p.me = meBefore.filter(n => S.doc.characters[n]);
        S.me = p.me.length ? computeMe() : null;
        touch(); closeSheet(true);
        if (!S.me) { if (S.parseView) renderParseStandalone(); else render(); break; }
        renderShell(true); toast('Fixed.' + (res.orphan ? ' ' + res.orphan + ' links need attention.' : ''));
        break;
      }
      case 'clearfixes': if (confirm('Undo every fix and re-read the script as imported?')) { p.overrides = {}; reparseSafe(); reanchor(p.work); p.me = p.me.filter(n => S.doc.characters[n]); S.me = p.me.length ? computeMe() : null; touch(); render(); } break;
      case 'parseview': S.parseView = true; if (S.project.me.length && S.me) renderShell(); else renderParseStandalone(); break;
      case 'parseclose': S.parseView = false; render(); break;
      // run
      case 'runscope': S.run.scope = ds.v; S.run.i = 0; S.run.shown = false; renderShell(); break;
      case 'runmode': S.run.mode = ds.v; renderShell(true); break;
      case 'runshow': S.run.shown = true; renderShell(true); break;
      case 'runnext': { const q = runQueue(); if (S.run.i < q.length - 1) { S.run.i++; S.run.shown = false; } renderShell(true); break; }
      case 'runprev': if (S.run.i > 0) { S.run.i--; S.run.shown = false; } renderShell(true); break;
      case 'runscene': S.run.sc = +ds.sc; S.run.scope = 'scene'; S.run.i = 0; S.run.shown = false; S.tab = 'run'; renderShell(); break;
      // pack
      case 'savefile': saveFile(); break;
      case 'revise': $('#revin').click(); break;
      case 'savepass': {
        const name = ($('#passname').value || '').trim() || 'Pass ' + (p.passes.length + 1);
        const snap = clone(p.work);
        const ps = { id: rid(), name, at: now(), work: snap, hash: sha256(JSON.stringify(snap)) };
        p.passes.push(ps); addReceipt(p, 'PASS', name, ps.hash); touch(); renderShell(true); toast(name + ' saved.');
        break;
      }
      case 'viewpass': S.viewPass = ds.id; S.tab = 'me'; renderShell(); break;
      case 'exitpass': S.viewPass = null; renderShell(); break;
      case 'comparepass': S.compare = ds.id || null; renderShell(true); break;
      case 'print': buildPrint(); setTimeout(() => window.print(), 50); break;
      case 'delproject': if (confirm('Delete "' + p.title + '" from this device? Save a project file first if you want to keep it.')) { await DB.del(p.id); act('home'); } break;
    }
  }

  function renderParseStandalone() {
    app().innerHTML = `<div class="shell" style="padding-left:0"><main style="max-width:760px">${viewParse()}</main></div>`;
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', e => {
    const k = e.target.closest('.kt[data-kit]');
    if (k) { e.preventDefault(); if (k.classList.contains('off')) return;
      if (k.dataset.kit === 'saynote') { act('newnote', {}, k); setTimeout(dictStart, 60); }
      else location.href = k.dataset.kit === 'runout' ? '../memorizer/' : '../actor-os/?open=1';
      return; }
    const t = e.target.closest('[data-a]');
    if (!t || t.disabled) return;
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
    e.preventDefault();
    const ds = Object.assign({}, t.dataset, { _x: e.clientX });
    act(t.dataset.a, ds, t);
  });
  let fieldTimer = null;
  document.addEventListener('input', e => {
    const f = e.target.closest('[data-f]'); if (!f) return;
    const key = f.dataset.f, val = f.value;
    if (key === 'ledgerq') { S.ledgerQ = val; clearTimeout(fieldTimer); fieldTimer = setTimeout(() => { const pos = f.selectionStart; renderShell(true); const n = document.querySelector('[data-f="ledgerq"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250); return; }
    if (RO()) return;
    setField(key, val);
  });
  document.addEventListener('change', e => {
    const f = e.target.closest('[data-f="aka"]'); if (f) renderShell(true);
  });
  document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.sec) S.secs[d.dataset.sec] = d.open; }, true);
  $('#filein').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) intake(f); });
  $('#projin').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) openProjectFile(f); });
  $('#revin').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) revise(f); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('.sheet')) { S.editing = null; closeSheet(); } });
  // whole-page drop when a project is open = revised pages? No: never replace silently. Ignore drops outside home.
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { if (!e.target.closest('#drop')) e.preventDefault(); });

  // ---------------------------------------------------------------- boot
  try { const th = localStorage.getItem('bd_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });

  const SAMPLE_FALLBACK = "INT. ROOM - DAY\n\nANNA\nAre you staying?\n\nBEN\nI never said that.\n";

  // debug/test hook (harmless)
  window.BREAKDOWN = { S, act, intake, sha256, verifyChain, diffWork, computeMe: () => computeMe(), shelfText: d => shelfText(d), version: VERSION };
  /* boot: new sides on the shelf from another tool open straight to your role */
  (async function boot() {
    const pend = SH && SH.pending('breakdown');
    if (!pend) { render(); return; }
    try {
      const have = (await DB.all()).find(x => x.shelf === pend.id);
      if (have) {
        await openProject(have);
        if (pend.me && S.doc.characters[pend.me] && have.me[0] !== pend.me) { S.project.me = [pend.me]; S.me = computeMe(); touch(); render(); }
        SH.markSeen('breakdown', pend.id);
      } else {
        const f = await SH.getFile(pend.id);
        await intake(f || pend.text, pend.file, { shelfId: pend.id, shelfName: pend.file });
      }
      setTimeout(() => toast('New sides: ' + SH.label(pend) + '.' + (S.project && S.project.me.length ? '' : ' Pick your role.')), 200);
    } catch (e) { render(); }
  })();
})();
