/*
  BREAKDOWN v0.3 PARSER
  Screenplay / sides reader. Pure functions, no DOM, no network.
  Runs in the browser (window.BDParser) and in Node (module.exports).

  Pipeline:
    source  -> raw lines  [{t, ind, pg}]      (fromText / fromPdfPages / fromFdx)
    lines   -> types      ['cue','dialogue',...]  (classify, with actor overrides)
    types   -> doc        {scenes, elements, speeches, characters}  (build)

  Rule: the parser reports what is on the page. It never guesses meaning.
*/
(function (root) {
  'use strict';

  const PT_PER_CHAR = 7.2; // Courier 12pt, 10 chars per inch

  const HEAD_RE = /^(?:[0-9]{1,4}[A-Z]{0,2}\.?\s+)?(?:INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|INT|EXT|I\/E|E\/I|EST)(?:[.\s:\-]|$)/;
  const TRANS_RE = /^(?:FADE IN:?|FADE OUT\.?|FADE TO BLACK\.?|CUT TO BLACK\.?|[A-Z][A-Z .\-']{0,30} TO:|SMASH CUT:?|MATCH CUT:?|JUMP CUT:?|BACK TO SCENE\.?|END OF (?:ACT|EPISODE|TEASER|COLD OPEN)[A-Z .]*\.?|THE END\.?|END\.?)$/;
  const NOISE_RE = [
    /^\(?\s*MORE\s*\)?$/i,
    /^\(?\s*CONTINUED\s*\)?\s*:?\s*$/i,
    /^[0-9]{1,4}[A-Z]?\s*\(?CONTINUED\)?\s*:?\s*[0-9]{0,4}[A-Z]?$/i,
    /^\(?\s*CONT(?:'|\u2019)?D\s*\)?\s*:?$/i,
    /^[0-9]{1,4}\s*\.?$/,
    /^page\s+[0-9]+(?:\s+of\s+[0-9]+)?$/i,
    /^[0-9]{1,4}[A-Z]?\s+OMITTED\s*[0-9]{0,4}[A-Z]?$/i,
    /^OMITTED$/i
  ];
  const PRONOUNS = new Set(['I', "I'M", "I'LL", "I'D", "I'VE", 'YOU', "YOU'RE", "YOU'LL", 'ME', 'WE', "WE'RE", 'MY', 'YOUR', "IT'S", "DON'T", "CAN'T", "WON'T", 'NOT', 'NO', 'YES', 'IS', 'ARE', 'WAS', 'GET', 'GO', 'STOP', 'SAID', 'TO', 'OF', 'AND', 'NOW', 'WHAT', 'WHY', 'HOW']);
  const ABBR_END = /\b(?:MR|MRS|MS|DR|ST|JR|SR|LT|SGT|CPT|CAPT|DET|PROF|REV|GEN|COL|MAJ|NO)\.$/;

  function norm(s) { return String(s || '').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u00A0/g, ' '); }
  function stripRev(s) { return s.replace(/\s+\*+\s*$/, '').replace(/^\*+\s+/, ''); }

  // ---------- name handling ----------
  function splitCue(text) {
    let t = norm(text).trim().replace(/\s*\^\s*$/, '');
    if (t[0] === '@') t = t.slice(1).trim();
    const ext = [];
    let m;
    while ((m = t.match(/\s*\(([^()]*)\)\s*$/))) { ext.unshift(m[1].trim().toUpperCase()); t = t.slice(0, m.index); }
    // bare CONT'D without parens
    m = t.match(/\s+CONT(?:'|\u2019)?D\.?$/i);
    if (m) { ext.push("CONT'D"); t = t.slice(0, m.index); }
    t = t.replace(/\s+/g, ' ').trim().toUpperCase();
    return { name: t, ext: ext.map(e => e.replace(/CONT['\u2019]?D/i, "CONT'D")) };
  }
  function isCapsCue(text) {
    const raw = norm(text).trim();
    if (!raw || raw.length > 60) return false;
    if (raw[0] === '(') return false;
    if (HEAD_RE.test(raw) || TRANS_RE.test(raw)) return false;
    const { name } = splitCue(raw);
    if (!name || name.length > 40) return false;
    if (!/[A-Z]/.test(name)) return false;
    if (name !== name.toUpperCase()) return false;
    if (raw[0] !== '@' && raw.replace(/\([^()]*\)/g, '') !== raw.replace(/\([^()]*\)/g, '').toUpperCase()) return false;
    if (!/^[A-Z0-9][A-Z0-9 .'\-&#\/]*$/.test(name)) return false;
    if (/[!?,;:]$/.test(name)) return false;
    if (/\.$/.test(name) && !ABBR_END.test(name)) return false;
    return true;
  }
  function vetoName(name, count) {
    const toks = name.split(/\s+/);
    if (toks.length >= 2 && toks.some(t => PRONOUNS.has(t))) return true;
    if (count <= 1 && toks.length > 4) return true;
    return false;
  }

  // ---------- sources -> raw lines ----------
  function fromText(text, opts) {
    opts = opts || {};
    let src = norm(text).replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
    let title = null;
    if (opts.fountain) {
      src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\[\[[\s\S]*?\]\]/g, '');
      const tp = src.match(/^(?:[A-Za-z ]+:.*\n(?:[ \t]+.*\n)*)+\n/);
      if (tp && /^(?:title|credit|author|authors|source|draft date|contact|notes|copyright)\s*:/im.test(tp[0])) {
        const tm = tp[0].match(/^title\s*:\s*(.*)$/im);
        if (tm) title = tm[1].replace(/[_*]/g, '').trim() || null;
        src = src.slice(tp[0].length);
      }
    }
    const lines = [];
    let pg = 1;
    src.split('\n').forEach(l => {
      const parts = l.split('\f');
      parts.forEach((p, k) => {
        if (k > 0) pg++;
        const lead = p.match(/^ */)[0].length;
        const t = stripRev(p.trim());
        lines.push({ t, ind: lead * PT_PER_CHAR, pg });
      });
    });
    return { lines, pages: pg, title, kind: opts.fountain ? 'fountain' : 'text' };
  }

  // pages: [{w, h, items:[{s, x, y, w, h, rot}]}]  (PDF user space, y up)
  function fromPdfPages(pages) {
    const perPage = pages.map((pg, pi) => {
      const items = pg.items.filter(it => it.s && it.s.trim() !== '' && !it.rot);
      // group into rows by y
      items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
      const rows = [];
      items.forEach(it => {
        const row = rows.length ? rows[rows.length - 1] : null;
        if (row && Math.abs(row.y - it.y) <= Math.max(2, (it.h || 10) * 0.35)) row.items.push(it);
        else rows.push({ y: it.y, h: it.h || 12, items: [it] });
      });
      const out = rows.map(r => {
        r.items.sort((a, b) => a.x - b.x);
        let text = '', end = null, firstX = null, numX = null;
        r.items.forEach((it, k) => {
          const s = norm(it.s);
          if (end !== null) {
            const gap = it.x - end;
            const charW = (it.h || 12) * 0.6;
            if (gap > charW * 0.4 && !/\s$/.test(text) && !/^\s/.test(s)) text += gap > charW * 6 ? '   ' : ' ';
          }
          if (firstX === null) {
            // a leading scene number does not set the indent
            if (k === 0 && /^[0-9]{1,4}[A-Z]{0,2}\.?$/.test(s.trim()) && r.items.length > 1) numX = it.x;
            else firstX = it.x;
          }
          text += s;
          end = it.x + (it.w || s.length * (it.h || 12) * 0.6);
        });
        if (firstX === null) firstX = numX !== null ? numX : r.items[0].x;
        return { t: stripRev(text.replace(/\s+$/, '').replace(/^\s+/, '')), ind: firstX, y: r.y, h: r.h, pg: pi + 1 };
      });
      return out;
    });

    // repeated header/footer lines (sides watermarks, revision headers)
    const sig = s => s.replace(/[0-9]+/g, '#').replace(/\s+/g, ' ').trim().toUpperCase().replace(/^#\.?\s+/, '').replace(/\s+#\.?$/, '');
    const counts = {};
    perPage.forEach(rows => {
      const edge = rows.slice(0, 2).concat(rows.slice(-2));
      const seen = new Set();
      edge.forEach(r => { const k = sig(r.t); if (k && !seen.has(k)) { seen.add(k); counts[k] = (counts[k] || 0) + 1; } });
    });
    const nPages = perPage.length;
    const repeated = new Set(Object.keys(counts).filter(k => nPages >= 2 && counts[k] >= Math.max(2, Math.ceil(nPages * 0.5)) && !/^#\.?$/.test(k)));

    const lines = [];
    perPage.forEach(rows => {
      // typical line spacing on this page
      const gaps = [];
      for (let i = 1; i < rows.length; i++) gaps.push(rows[i - 1].y - rows[i].y);
      const sorted = gaps.filter(g => g > 0).sort((a, b) => a - b);
      const step = sorted.length ? sorted[Math.floor(sorted.length * 0.25)] : 12;
      rows.forEach((r, i) => {
        if (i > 0) {
          const g = rows[i - 1].y - r.y;
          if (g > step * 1.6) lines.push({ t: '', ind: 0, pg: r.pg });
        }
        const isEdge = i < 2 || i >= rows.length - 2;
        if (isEdge && repeated.has(sig(r.t))) { lines.push({ t: r.t, ind: r.ind, pg: r.pg, hdr: true }); return; }
        lines.push({ t: r.t, ind: r.ind, pg: r.pg });
      });
      lines.push({ t: '', ind: 0, pg: rows.length ? rows[0].pg : 1, pb: true });
    });
    return { lines, pages: nPages, title: null, kind: 'pdf' };
  }

  function decodeXml(s) {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16))).replace(/&amp;/g, '&');
  }
  const FDX_TYPES = { 'Scene Heading': 'heading', 'Action': 'action', 'Character': 'cue', 'Dialogue': 'dialogue', 'Parenthetical': 'paren', 'Transition': 'transition', 'Shot': 'action', 'General': 'action', 'Cast List': 'action', 'New Act': 'noise', 'End of Act': 'noise' };
  function fromFdx(xml) {
    const body = (xml.match(/<Content[^>]*>([\s\S]*?)<\/Content>/) || [null, xml])[1];
    const lines = [], forced = [];
    const re = /<Paragraph\b([^>]*)>([\s\S]*?)<\/Paragraph>/g;
    let m;
    while ((m = re.exec(body))) {
      const tm = m[1].match(/\bType="([^"]*)"/);
      const type = tm ? tm[1] : 'Action';
      const texts = [];
      const tr = /<Text\b[^>]*>([\s\S]*?)<\/Text>|<Text\b[^>]*\/>/g;
      let t;
      while ((t = tr.exec(m[2]))) texts.push(decodeXml(t[1] || ''));
      const text = stripRev(norm(texts.join('')).replace(/\s+/g, ' ').trim());
      if (!text) continue;
      const nm = m[1].match(/\bNumber="([^"]*)"/);
      lines.push(nm && nm[1] ? { t: text, ind: 0, pg: 1, num: nm[1] } : { t: text, ind: 0, pg: 1 });
      forced.push(FDX_TYPES[type] || 'action');
      lines.push({ t: '', ind: 0, pg: 1 });
      forced.push('blank');
    }
    return { lines, pages: 1, title: null, kind: 'fdx', forced };
  }

  // ---------- classify ----------
  function classify(src, overrides) {
    const lines = src.lines;
    const n = lines.length;
    const types = new Array(n).fill(null);
    overrides = overrides || {};
    const fountain = src.kind === 'fountain';

    if (src.forced) {
      for (let i = 0; i < n; i++) types[i] = overrides[i] || src.forced[i];
      return { types, layout: false, base: 0, noBlank: false };
    }

    // pass 1: structural certainties
    for (let i = 0; i < n; i++) {
      const L = lines[i], t = L.t;
      if (!t) { types[i] = 'blank'; continue; }
      if (L.hdr) { types[i] = 'noise'; continue; }
      if (fountain) {
        if (/^\.[^.]/.test(t)) { types[i] = 'heading'; continue; }
        if (/^>/.test(t) && !/<$/.test(t)) { types[i] = 'transition'; continue; }
        if (/^>.*<$/.test(t)) { types[i] = 'action'; continue; }
        if (/^[=#]/.test(t)) { types[i] = 'noise'; continue; }
        if (/^!/.test(t)) { types[i] = 'action'; continue; }
      }
      if (NOISE_RE.some(r => r.test(t))) { types[i] = 'noise'; continue; }
      if (HEAD_RE.test(t)) { types[i] = 'heading'; continue; }
      if (TRANS_RE.test(t)) { types[i] = 'transition'; continue; }
    }

    // layout detection
    const nonblank = [];
    for (let i = 0; i < n; i++) if (types[i] === null) nonblank.push(i);
    const bins = {};
    nonblank.forEach(i => { const b = Math.round(lines[i].ind / 6) * 6; bins[b] = (bins[b] || 0) + 1; });
    const minCount = Math.max(2, Math.ceil(nonblank.length * 0.04));
    const binKeys = Object.keys(bins).map(Number).filter(b => bins[b] >= minCount).sort((a, b) => a - b);
    const base = binKeys.length ? binKeys[0] : 0;
    const indented = nonblank.filter(i => lines[i].ind >= base + 60).length;
    const deepCaps = nonblank.filter(i => lines[i].ind >= base + 110 && isCapsCue(lines[i].t)).length;
    const layout = nonblank.length > 0 && indented / nonblank.length >= 0.15 && deepCaps >= 1;
    const blanks = types.filter(x => x === 'blank').length;
    const noBlank = !layout && blanks / Math.max(1, n) < 0.08;

    const nextReal = i => { for (let j = i + 1; j < n; j++) if (types[j] !== 'noise') return j; return -1; };
    const prevReal = i => { for (let j = i - 1; j >= 0; j--) if (types[j] !== 'noise') return j; return -1; };

    // pass 2: cue candidates
    const cand = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      if (types[i] !== null) continue;
      const t = lines[i].t;
      const forcedCue = fountain && t[0] === '@';
      if (!forcedCue && !isCapsCue(t)) continue;
      const nx = nextReal(i);
      if (nx < 0 || types[nx] === 'blank' || types[nx] === 'heading' || types[nx] === 'transition') {
        // page break between cue and dialogue is allowed in PDFs only when the next page continues
        if (!(nx >= 0 && lines[nx].pb)) continue;
      }
      if (forcedCue) { cand[i] = true; continue; }
      if (layout) {
        const ind = lines[i].ind;
        if (ind >= base + 110 && ind < base + 330) cand[i] = true;
      } else if (noBlank) {
        cand[i] = true;
      } else {
        const pv = prevReal(i);
        if (pv < 0 || types[pv] === 'blank' || types[pv] === 'heading' || types[pv] === 'transition') cand[i] = true;
      }
    }
    // pass 3: veto shouting lines that look like names
    const nameCount = {};
    for (let i = 0; i < n; i++) if (cand[i]) { const k = splitCue(lines[i].t).name; nameCount[k] = (nameCount[k] || 0) + 1; }
    for (let i = 0; i < n; i++) if (cand[i] && !(fountain && lines[i].t[0] === '@')) {
      const k = splitCue(lines[i].t).name;
      if (vetoName(k, nameCount[k])) cand[i] = false;
    }

    // pass 4: walk blocks
    let inBlock = false, inParen = false;
    for (let i = 0; i < n; i++) {
      if (overrides[i]) {
        types[i] = overrides[i];
        if (types[i] === 'cue') { inBlock = true; inParen = false; }
        else if (types[i] !== 'dialogue' && types[i] !== 'paren' && types[i] !== 'noise') inBlock = false;
        continue;
      }
      const ty = types[i];
      if (ty === 'noise') continue;
      if (ty === 'blank' || ty === 'heading' || ty === 'transition') {
        if (ty === 'blank' && lines[i].pb && inBlock) continue; // page break does not end a speech
        inBlock = false; inParen = false; continue;
      }
      const t = lines[i].t;
      if (cand[i]) { types[i] = 'cue'; inBlock = true; inParen = false; continue; }
      if (inBlock) {
        if (layout && lines[i].ind < base + 36) { inBlock = false; inParen = false; }
        else {
          if (inParen) { types[i] = 'paren'; if (/\)\s*$/.test(t)) inParen = false; continue; }
          if (t[0] === '(') { types[i] = 'paren'; inParen = !/\)\s*$/.test(t); continue; }
          types[i] = 'dialogue';
          continue;
        }
      }
      types[i] = 'action';
    }
    return { types, layout, base, noBlank };
  }

  // ---------- build ----------
  function parseHeading(t) {
    let h = t.replace(/^\./, '').trim();
    let num = null, m;
    if ((m = h.match(/^([0-9]{1,4}[A-Z]{0,2})\.?\s+/))) { num = m[1]; h = h.slice(m[0].length); }
    if ((m = h.match(/\s+#?([0-9]{1,4}[A-Z]{0,2})#?\s*$/))) { if (!num) num = m[1]; h = h.slice(0, m.index); }
    if ((m = h.match(/\s+#([^#]+)#\s*$/))) { if (!num) num = m[1]; h = h.slice(0, m.index); }
    return { heading: h.replace(/\s+/g, ' ').trim(), num };
  }
  function words(s) { const m = s.match(/[A-Za-z0-9'\u2019]+/g); return m ? m.length : 0; }

  function build(src, cls) {
    const lines = src.lines, types = cls.types;
    const elements = [], scenes = [], speeches = [];
    let scene = null, speech = null, para = null, lastSpeech = null, sinceSpeech = 0;

    function newScene(pg, heading, num, raw) {
      scene = { idx: scenes.length, num, heading, pg, els: [], who: [], raw };
      scenes.push(scene);
      return scene;
    }
    function ensureScene(pg) { if (!scene) newScene(pg, '(NO SCENE HEADING)', null, null); }
    function addEl(type, text, i, extra) {
      ensureScene(lines[i].pg);
      const el = Object.assign({ id: 'e' + elements.length, n: elements.length, type, text, pg: lines[i].pg, sc: scene.idx, raw: [i] }, extra || {});
      elements.push(el); scene.els.push(el.n);
      return el;
    }

    for (let i = 0; i < lines.length; i++) {
      const ty = types[i], t = lines[i].t;
      if (ty === 'blank') { para = null; continue; }
      if (ty === 'noise' || ty === 'title') continue;
      if (ty === 'heading') {
        const h = parseHeading(t);
        if (!h.num && lines[i].num) h.num = lines[i].num;
        newScene(lines[i].pg, h.heading, h.num, i);
        const el = addEl('heading', h.heading, i, { num: h.num });
        speech = null; para = null; sinceSpeech++;
        continue;
      }
      if (ty === 'transition') { addEl('transition', t.replace(/^>\s*/, ''), i); speech = null; para = null; sinceSpeech++; continue; }
      if (ty === 'cue') {
        const c = splitCue(t);
        ensureScene(lines[i].pg);
        const cont = c.ext.includes("CONT'D");
        if (cont && lastSpeech && lastSpeech.who === c.name && lastSpeech.sc === scene.idx && sinceSpeech === 0) {
          speech = lastSpeech; para = null; // speech carries across a page break / (MORE)
          const ce = addEl('cue', c.name, i, { who: c.name, ext: c.ext, sp: speech.n, hidden: true });
          continue;
        }
        speech = { id: 's' + speeches.length, n: speeches.length, who: c.name, ext: c.ext, sc: scene.idx, pg: lines[i].pg, els: [], words: 0, text: '' };
        speeches.push(speech);
        const ce = addEl('cue', c.name, i, { who: c.name, ext: c.ext, sp: speech.n });
        speech.cue = ce.n;
        lastSpeech = speech; sinceSpeech = 0; para = null;
        if (!scene.who.includes(c.name)) scene.who.push(c.name);
        continue;
      }
      if (ty === 'paren' || ty === 'dialogue') {
        if (!speech) { // orphan dialogue: keep it, mark speaker unknown
          ensureScene(lines[i].pg);
          speech = { id: 's' + speeches.length, n: speeches.length, who: '(UNKNOWN)', ext: [], sc: scene.idx, pg: lines[i].pg, els: [], words: 0, text: '' };
          speeches.push(speech); lastSpeech = speech; sinceSpeech = 0;
        }
        if (para && para.type === ty && para.sp === speech.n && ty === 'dialogue') {
          para.text += ' ' + t; para.raw.push(i);
        } else if (para && para.type === 'paren' && ty === 'paren' && !/\)\s*$/.test(para.text)) {
          para.text += ' ' + t; para.raw.push(i);
        } else {
          para = addEl(ty, t, i, { who: speech.who, sp: speech.n });
          speech.els.push(para.n);
        }
        if (ty === 'dialogue') { speech.words += words(t); }
        continue;
      }
      // action
      speech = null; sinceSpeech++;
      if (para && para.type === 'action') { para.text += ' ' + t; para.raw.push(i); }
      else para = addEl('action', t, i);
    }

    speeches.forEach(sp => { sp.text = sp.els.map(k => elements[k]).filter(e => e.type === 'dialogue').map(e => e.text).join(' '); });
    // drop an empty leading pseudo-scene
    const characters = {};
    speeches.forEach(sp => {
      if (sp.who === '(UNKNOWN)') return;
      const c = characters[sp.who] || (characters[sp.who] = { name: sp.who, speeches: 0, words: 0, scenes: [], firstPg: sp.pg, lastPg: sp.pg });
      c.speeches++; c.words += sp.words;
      if (!c.scenes.includes(sp.sc)) c.scenes.push(sp.sc);
      c.lastPg = Math.max(c.lastPg, sp.pg);
    });
    // scene keys: heading + occurrence (survive re-import)
    const occ = {};
    scenes.forEach(s => { const k = s.heading.toUpperCase(); occ[k] = (occ[k] || 0) + 1; s.key = k + '#' + occ[k]; s.speechCount = 0; });
    speeches.forEach(sp => { scenes[sp.sc].speechCount++; });
    return { scenes, elements, speeches, characters, layout: cls.layout, base: cls.base, pages: src.pages, kind: src.kind };
  }

  function parse(src, overrides) {
    const cls = classify(src, overrides);
    const doc = build(src, cls);
    doc.types = cls.types;
    return doc;
  }

  // ---------- helpers for the app ----------
  const TITLE_WORDS = new Set(['MR', 'MRS', 'MS', 'DR', 'DETECTIVE', 'OFFICER', 'YOUNG', 'OLD', 'OLDER', 'LITTLE', 'BIG', 'AUNT', 'UNCLE', 'SGT', 'SERGEANT', 'CAPTAIN', 'AGENT', 'NURSE', 'DOCTOR', 'FATHER', 'MOTHER', 'SISTER', 'BROTHER', 'THE', 'MAN', 'WOMAN', 'GUY', 'GIRL', 'BOY', 'LADY', 'SIR', 'MISS', 'COP', 'MAIN']);
  function nameTokens(name) {
    const clean = name.replace(/[.#0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    const out = new Set();
    if (clean.length >= 2) out.add(clean);
    clean.split(' ').forEach(t => { if (t.length >= 3 && !TITLE_WORDS.has(t)) out.add(t); });
    return Array.from(out);
  }
  // case-aware: matches "Rennie" or "RENNIE", not "rennie" inside a word
  function mentionRegex(names) {
    const toks = new Set();
    names.forEach(n => nameTokens(n).forEach(t => toks.add(t)));
    if (!toks.size) return null;
    const alts = [];
    toks.forEach(t => {
      const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const title = t.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (m, a, b) => a + b.toUpperCase());
      alts.push(esc(t)); if (title !== t) alts.push(esc(title));
    });
    alts.sort((a, b) => b.length - a.length);
    return new RegExp('(^|[^A-Za-z])(' + alts.join('|') + ')(?![A-Za-z])');
  }

  const api = { fromText, fromPdfPages, fromFdx, classify, build, parse, splitCue, isCapsCue, mentionRegex, nameTokens, parseHeading, PT_PER_CHAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BDParser = api;
})(typeof window !== 'undefined' ? window : globalThis);
