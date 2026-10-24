/*
  REEL ROOM v0.3 ENGINE
  Pure functions. No DOM, no network. Browser (window.ReelEngine) and Node (module.exports).
    - tags:      normalize and keep a vocabulary that grows from use
    - match:     read a casting breakdown, find what you have footage for and what you don't
    - build:     draft a reel from matched moments (opener, middle, button) toward a target length
    - cut lists: CMX3600 EDL, FCP7 XML (Premiere, Resolve), CSV
  Rule: matching surfaces candidates. It never decides what you are.
*/
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- tags
  function tagKey(s) { return String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' \-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function addTag(vocab, label) {
    const k = tagKey(label);
    if (!k) return null;
    if (!vocab[k]) vocab[k] = { label: String(label).trim().replace(/\s+/g, ' '), n: 0 };
    vocab[k].n++;
    return k;
  }

  // ---------------------------------------------------------------- word roots
  const SUFFIXES = ['ically', 'ingly', 'edly', 'ation', 'ative', 'ities', 'ness', 'ment', 'fully', 'ical', 'ful', 'ous', 'ive', 'ity', 'ing', 'ism', 'ist', 'ied', 'ed', 'ly', 'es', 'al', 's', 'e', 'y'];
  function stem(w) {
    w = String(w || '').toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) return w;
    for (const suf of SUFFIXES) {
      if (w.length - suf.length >= 4 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
    }
    // second light pass for stacked suffixes (menacingly -> menac)
    for (const suf of ['e', 'y', 'i']) if (w.length - suf.length >= 4 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
    return w;
  }
  const STOP = new Set(('a an the and or but with without who whom whose that this these those is are was were be been being has have had his her hers him he she they them their its it of in on at to for from by as into than then very quite really also just more most some any all one someone somebody type kind sort lot bit little big who\'s he\'s she\'s can could would should will must may might not no nor so too our your my we you i me us').split(' '));
  const NOISE = new Set(('male female man woman men women boy girl non nonunion union sag aftra sag-aftra equity eligible lead leads supporting series regular regulars recurring guest star co-star costar day player featured principal role roles character characters ethnicity ethnicities race any all open seeking submit submission submissions please pay rate rates shoot shoots shooting dates date location locations audition auditions self tape tapes callback callbacks breakdown project feature film pilot episode episodic commercial years year old yrs age ages early late mid playable range ish appears appearing look looks looking actor actors actress talent ages something description').split(' '));
  function words(s) { return String(s).toLowerCase().replace(/[‘’]/g, "'").match(/[a-z][a-z']*/g) || []; }
  // same root: equal, or one is a prefix of the other once both are 5+ letters (author / authorit)
  function rootMatch(a, b) { if (a === b) return true; const n = Math.min(a.length, b.length); return n >= 5 && (a.startsWith(b) || b.startsWith(a)); }
  const LOGI = new Set('shoot shoots shooting shot dates date location locations rate rates pay paid union sag aftra submit submissions tape tapes callback callbacks audition auditions availability available travel local hire'.split(' '));

  // phrases: breakdowns are mostly comma lists of descriptors
  function descriptors(text) {
    const src = String(text || '')
      .split(/(?<=[.!?])\s+|\n+/).filter(sen => !words(sen).some(w => LOGI.has(w))).join('\n')
      .replace(/\[[^\]]*\]/g, ' . ')                 // [CHARACTER NAME]
      .replace(/\([^)]*\)/g, ' . ')                  // (40s) (any ethnicity)
      .replace(/^[A-Z][A-Z .'\-]{2,40}:/gm, ' . ')   // "SHERIFF DALE:" style name labels
      .replace(/\b\d{1,2}\s*(?:s|'s)?\s*(?:-|to)\s*\d{1,2}\s*(?:s|'s)?\b/g, ' . ')
      .replace(/\b\d+\b/g, ' . ');
    const parts = src.split(/[,;:.!?\n\/]|\s+-\s+|\s+(?:and|but|with|who|yet|or)\s+/i);
    const seen = new Set(), out = [];
    parts.forEach(p => {
      if (words(p).some(w => LOGI.has(w))) return; // shoot logistics, not character
      const ws = words(p).filter(w => !STOP.has(w) && !NOISE.has(w) && w.length > 2);
      if (!ws.length || ws.length > 4) {
        // long clause: keep its content words one by one
        if (ws.length > 4) ws.forEach(w => push(w));
        return;
      }
      // show your words as written (minus edge filler), match on the content words
      const all = words(p); let i = 0, j = all.length;
      while (i < j && (STOP.has(all[i]) || NOISE.has(all[i]))) i++;
      while (j > i && (STOP.has(all[j - 1]) || NOISE.has(all[j - 1]))) j--;
      push(ws.join(' '), all.slice(i, j).join(' '));
    });
    function push(ph, shown) { const k = ph.split(' ').map(stem).join(' '); if (!seen.has(k)) { seen.add(k); out.push({ text: shown || ph, key: k }); } }
    return out;
  }

  // does a tag match a phrase? every root of the tag must appear in the phrase
  function tagHits(phraseKey, tagK) {
    const P = phraseKey.split(' ');
    const T = tagK.split(/[\s\-]+/).map(stem).filter(Boolean);
    return T.length > 0 && T.every(t => P.some(p => rootMatch(p, t)));
  }

  // moments: [{id, tags:[key], ...}]  vocab: {key:{label}}  aliases: {phraseKey: tagKey}
  function matchBreakdown(text, moments, vocab, aliases) {
    aliases = aliases || {};
    const ds = descriptors(text);
    const tagKeys = Object.keys(vocab || {});
    const momentsByTag = {};
    (moments || []).forEach(m => (m.tags || []).forEach(t => (momentsByTag[t] = momentsByTag[t] || []).push(m.id)));
    const rows = ds.map(d => {
      const tags = new Set();
      tagKeys.forEach(k => { if (tagHits(d.key, k)) tags.add(k); });
      if (aliases[d.key]) tags.add(aliases[d.key]);
      const tg = Array.from(tags);
      const ms = Array.from(new Set(tg.flatMap(k => momentsByTag[k] || [])));
      return { text: d.text, key: d.key, tags: tg, moments: ms, covered: ms.length > 0, known: tg.length > 0 };
    });
    // drop single-word rows already inside a covered multi-word row
    const coveredWords = new Set(rows.filter(r => r.covered && r.key.includes(' ')).flatMap(r => r.key.split(' ')));
    const final = rows.filter(r => r.key.includes(' ') || !coveredWords.has(r.key) || r.covered);
    return {
      rows: final,
      covered: final.filter(r => r.covered),
      missing: final.filter(r => !r.covered),
      coverage: final.length ? +(final.filter(r => r.covered).length / final.length).toFixed(3) : 0
    };
  }

  // ---------------------------------------------------------------- draft reel
  // moments need: id, in, out, open, button, tags, clip
  function dur(m) { return Math.max(0, (m.out || 0) - (m.in || 0)); }
  function buildDraft(match, moments, target) {
    target = target || 90;
    const byId = Object.fromEntries(moments.map(m => [m.id, m]));
    const descOf = {}; // moment -> set of covered descriptor keys
    match.covered.forEach(r => r.moments.forEach(id => { (descOf[id] = descOf[id] || new Set()).add(r.key); }));
    const pool = Object.keys(descOf).map(id => byId[id]).filter(Boolean);
    if (!pool.length) return { items: [], covers: [], misses: match.rows.map(r => r.key), total: 0 };
    const score = m => descOf[m.id].size;
    const pick = (list, pref) => list.slice().sort((a, b) => (pref(b) - pref(a)) || (score(b) - score(a)) || (dur(a) - dur(b)))[0];
    const used = new Set(), covered = new Set();
    const take = m => { used.add(m.id); descOf[m.id].forEach(k => covered.add(k)); };
    const opener = pick(pool, m => m.open ? 1 : 0); take(opener);
    const rest = pool.filter(m => !used.has(m.id));
    const button = rest.length ? pick(rest, m => m.button ? 1 : 0) : null;
    if (button) take(button);
    let total = dur(opener) + (button ? dur(button) : 0);
    const middle = [];
    while (total < target) {
      const cand = pool.filter(m => !used.has(m.id));
      if (!cand.length) break;
      // most new descriptors first, then shortest
      cand.sort((a, b) => {
        const ga = Array.from(descOf[a.id]).filter(k => !covered.has(k)).length, gb = Array.from(descOf[b.id]).filter(k => !covered.has(k)).length;
        return (gb - ga) || (score(b) - score(a)) || (dur(a) - dur(b));
      });
      const m = cand[0];
      if (total + dur(m) > target * 1.15) break; // keep it short: misses get reported, not padded in
      middle.push(m); take(m); total += dur(m);
    }
    const items = [opener].concat(middle, button ? [button] : []).map(m => m.id);
    const all = match.rows.map(r => r.key);
    return { items, covers: all.filter(k => covered.has(k)), misses: all.filter(k => !covered.has(k)), total: +total.toFixed(2) };
  }

  // ---------------------------------------------------------------- timecode + cut lists
  const RATES = { '23.976': { base: 24, ntsc: true }, '24': { base: 24, ntsc: false }, '25': { base: 25, ntsc: false }, '29.97': { base: 30, ntsc: true }, '30': { base: 30, ntsc: false }, '50': { base: 50, ntsc: false }, '59.94': { base: 60, ntsc: true }, '60': { base: 60, ntsc: false } };
  function realFps(rate) { const r = RATES[rate] || RATES['30']; return r.ntsc ? r.base * 1000 / 1001 : r.base; }
  function toFrames(sec, rate) { return Math.round(sec * realFps(rate)); }
  function tc(frames, rate) {
    const b = (RATES[rate] || RATES['30']).base;
    const f = frames % b, s = Math.floor(frames / b) % 60, m = Math.floor(frames / b / 60) % 60, h = Math.floor(frames / b / 3600);
    return [h, m, s, f].map(n => String(n).padStart(2, '0')).join(':');
  }
  function edlName(s) { return String(s || '').replace(/[^\x20-\x7e]/g, '_'); }

  // items: [{name (file name), in, out, label}]   (cards are not media: they become comments)
  function toEDL(title, items, rate) {
    rate = rate || '30';
    const start = toFrames(3600, rate) - (RATES[rate].ntsc ? 0 : 0);
    let rec = (RATES[rate] || RATES['30']).base * 3600; // record starts 01:00:00:00 in TC frames
    const lines = ['TITLE: ' + edlName(title).slice(0, 70), 'FCM: NON-DROP FRAME', ''];
    let n = 0;
    items.forEach(it => {
      if (it.card) { lines.push('* CARD: ' + edlName(it.label) + ' (' + it.seconds + 's, add as a title in your edit)', ''); return; }
      n++;
      const sIn = toFrames(it.in, rate), sOut = toFrames(it.out, rate);
      const len = Math.max(1, sOut - sIn);
      const ev = String(n).padStart(3, '0');
      lines.push(`${ev}  AX       AA/V  C        ${tc(sIn, rate)} ${tc(sIn + len, rate)} ${tc(rec, rate)} ${tc(rec + len, rate)}`);
      lines.push('* FROM CLIP NAME: ' + edlName(it.name));
      if (it.label) lines.push('* COMMENT: ' + edlName(it.label));
      lines.push('');
      rec += len;
    });
    return lines.join('\n');
  }

  function xesc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // FCP7 XML (xmeml v5). Imports into Premiere Pro and DaVinci Resolve. Media relinks by file name.
  function toXML(title, items, rate, clipsById) {
    rate = rate || '30';
    const R = RATES[rate] || RATES['30'];
    const rateX = `<rate><timebase>${R.base}</timebase><ntsc>${R.ntsc ? 'TRUE' : 'FALSE'}</ntsc></rate>`;
    let rec = 0, n = 0;
    const files = {}, v = [], a1 = [], a2 = [];
    const media = items.filter(it => !it.card);
    media.forEach(it => {
      n++;
      const c = clipsById[it.clip] || {};
      const fid = 'file-' + it.clip;
      const sIn = toFrames(it.in, rate), sOut = toFrames(it.out, rate), len = Math.max(1, sOut - sIn);
      const total = Math.max(sOut, toFrames(c.dur || it.out, rate));
      const fileX = files[fid] ? `<file id="${fid}"/>` : `<file id="${fid}"><name>${xesc(it.name)}</name><pathurl>${xesc('file://localhost/' + encodeURIComponent(it.name))}</pathurl>${rateX}<duration>${total}</duration><media><video><samplecharacteristics>${rateX}<width>${c.w || 1920}</width><height>${c.h || 1080}</height></samplecharacteristics></video><audio><samplecharacteristics><depth>16</depth><samplerate>48000</samplerate></samplecharacteristics><channelcount>2</channelcount></audio></media></file>`;
      files[fid] = true;
      const id = 'clipitem-' + n;
      const link = `<link><linkclipref>${id}-v</linkclipref><mediatype>video</mediatype><trackindex>1</trackindex><clipindex>${n}</clipindex></link><link><linkclipref>${id}-a1</linkclipref><mediatype>audio</mediatype><trackindex>1</trackindex><clipindex>${n}</clipindex></link><link><linkclipref>${id}-a2</linkclipref><mediatype>audio</mediatype><trackindex>2</trackindex><clipindex>${n}</clipindex></link>`;
      const common = `<name>${xesc(it.label || it.name)}</name><enabled>TRUE</enabled><duration>${total}</duration>${rateX}<start>${rec}</start><end>${rec + len}</end><in>${sIn}</in><out>${sIn + len}</out>`;
      v.push(`<clipitem id="${id}-v">${common}${fileX}${link}</clipitem>`);
      a1.push(`<clipitem id="${id}-a1">${common}<file id="${fid}"/><sourcetrack><mediatype>audio</mediatype><trackindex>1</trackindex></sourcetrack>${link}</clipitem>`);
      a2.push(`<clipitem id="${id}-a2">${common}<file id="${fid}"/><sourcetrack><mediatype>audio</mediatype><trackindex>2</trackindex></sourcetrack>${link}</clipitem>`);
      rec += len;
    });
    const W = (media[0] && clipsById[media[0].clip] && clipsById[media[0].clip].w) || 1920, H = (media[0] && clipsById[media[0].clip] && clipsById[media[0].clip].h) || 1080;
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
<sequence id="sequence-1"><name>${xesc(title)}</name><duration>${rec}</duration>${rateX}
<media>
<video><format><samplecharacteristics>${rateX}<width>${W}</width><height>${H}</height></samplecharacteristics></format><track>${v.join('')}</track></video>
<audio><track>${a1.join('')}</track><track>${a2.join('')}</track></audio>
</media>
</sequence>
</xmeml>
`;
  }

  function csvCell(s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function fmt(sec) { sec = Math.max(0, sec); const m = Math.floor(sec / 60), s = sec - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
  function toCSV(items) {
    const rows = [['#', 'clip', 'in', 'out', 'seconds', 'expresses', 'note']];
    let n = 0;
    items.forEach(it => { n++; rows.push(it.card ? [n, 'CARD: ' + it.label, '', '', it.seconds, '', ''] : [n, it.name, fmt(it.in), fmt(it.out), (it.out - it.in).toFixed(2), (it.tags || []).join('; '), it.note || '']); });
    return rows.map(r => r.map(csvCell).join(',')).join('\n') + '\n';
  }

  const api = { tagKey, addTag, stem, rootMatch, descriptors, tagHits, matchBreakdown, buildDraft, toFrames, tc, toEDL, toXML, toCSV, fmt, RATES, realFps };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ReelEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
