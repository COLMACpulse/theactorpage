/*
  ARCHBOOK v0.3 · Actor Edition
  Your footage, sorted by the character it expresses. Outputs reels. Footage first, tags by tapping, breakdown in, reel out.
  Vanilla JS, offline, no account.
*/
(function () {
  'use strict';
  const VERSION = '0.3.2';
  const SCHEMA = 'ACT.ARCHBOOK/0.3';
  const OLD_SCHEMAS = ['ACT.REEL/0.3']; // REEL MAKER library files still open
  const E = window.ReelEngine;
  const FRAME = 1 / 30;

  // ---------------------------------------------------------------- utils
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  const fmt = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  const fmtShort = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const slug = s => String(s || 'reel').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'reel';
  const once = (el, ev, ms) => new Promise((res, rej) => {
    let t; const on = () => { clearTimeout(t); el.removeEventListener(ev, on); el.removeEventListener('error', er); res(); };
    const er = () => { clearTimeout(t); el.removeEventListener(ev, on); el.removeEventListener('error', er); rej(new Error('media error')); };
    el.addEventListener(ev, on); el.addEventListener('error', er);
    if (ms) t = setTimeout(() => { el.removeEventListener(ev, on); el.removeEventListener('error', er); rej(new Error('timeout')); }, ms);
  });
  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ---------------------------------------------------------------- storage
  const DB = (function () {
    let p = null, ok = true;
    function open() {
      if (p) return p;
      p = new Promise((res, rej) => {
        try {
          const rq = indexedDB.open('archbook_v03', 1);
          rq.onupgradeneeded = () => { rq.result.createObjectStore('lib'); rq.result.createObjectStore('media'); };
          rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
        } catch (e) { rej(e); }
      }).catch(() => { ok = false; return null; });
      return p;
    }
    async function op(store, mode, fn) {
      const db = await open(); if (!db) return null;
      return new Promise((res, rej) => { const t = db.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r && 'result' in r ? r.result : undefined); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
    }
    return {
      get ok() { return ok; },
      getLib: () => op('lib', 'readonly', s => s.get('main')),
      putLib: lib => op('lib', 'readwrite', s => s.put(JSON.parse(JSON.stringify(lib)), 'main')),
      getMedia: id => op('media', 'readonly', s => s.get(id)),
      putMedia: (id, blob) => op('media', 'readwrite', s => s.put(blob, id)),
      delMedia: id => op('media', 'readwrite', s => s.delete(id)),
      clearAll: async () => { await op('lib', 'readwrite', s => s.clear()); await op('media', 'readwrite', s => s.clear()); }
    };
  })();

  function emptyLib() {
    return { schema: SCHEMA, app: 'ARCHBOOK ' + VERSION, id: rid(), created: now(), updated: now(), keep: true,
      profile: { name: '', line2: '', line3: '' }, clips: [], moments: [], tags: {}, aliases: {}, wants: [], reels: [], lastBreakdown: '', lastSaved: null, dirty: 0 };
  }

  // ---------------------------------------------------------------- state
  const S = {
    lib: null, tab: 'clips', clipId: null, reelId: null, lane: 'all', focusMoment: null, newMoment: null,
    urls: {}, files: {}, linkNote: {}, mk: { in: null, out: null, thumb: null }, match: null, busy: null,
    fps: '30', res: '720', rendered: null
  };
  let saveT = null;
  function touch(soft) {
    S.lib.updated = now(); if (!soft) S.lib.dirty = (S.lib.dirty || 0) + 1;
    clearTimeout(saveT); saveT = setTimeout(() => DB.putLib(S.lib).catch(() => toast('Could not save on this device. Save a library file.')), 250);
  }
  const clipById = id => S.lib.clips.find(c => c.id === id);
  const momentById = id => S.lib.moments.find(m => m.id === id);
  const reelById = id => S.lib.reels.find(r => r.id === id);
  const tagLabel = k => (S.lib.tags[k] && S.lib.tags[k].label) || k;
  const dur = m => Math.max(0, m.out - m.in);
  const linked = c => !!S.urls[c.id];

  // ---------------------------------------------------------------- media probe
  async function probe(url) {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    try {
      await once(v, 'loadedmetadata', 10000);
      let d = v.duration;
      if (!isFinite(d)) { v.currentTime = 1e7; await once(v, 'seeked', 5000).catch(() => { }); d = v.duration; v.currentTime = 0; }
      const t = Math.min(1, d * 0.1);
      v.currentTime = t; await once(v, 'seeked', 6000);
      const thumb = grab(v, 320);
      const out = { dur: +d.toFixed(3), w: v.videoWidth, h: v.videoHeight, thumb, playable: v.videoWidth > 0 };
      v.removeAttribute('src'); v.load();
      return out;
    } catch (e) {
      v.removeAttribute('src'); v.load();
      return { dur: 0, w: 0, h: 0, thumb: '', playable: false };
    }
  }
  function grab(v, w) {
    try {
      const h = Math.round(w * 9 / 16), c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
      fit(x, v, v.videoWidth, v.videoHeight, w, h);
      return c.toDataURL('image/jpeg', 0.72);
    } catch (e) { return ''; }
  }
  function fit(ctx, src, sw, sh, W, H) {
    if (!sw || !sh) return;
    const r = Math.min(W / sw, H / sh), dw = sw * r, dh = sh * r;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  // ---------------------------------------------------------------- intake + relink
  async function addFiles(files) {
    files = Array.from(files || []).filter(f => /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm|mkv|avi)$/i.test(f.name));
    if (!files.length) { toast('No video files in that.'); return; }
    S.busy = { label: 'Reading clips', n: 0, of: files.length }; render();
    let added = 0, relinked = 0, bad = 0;
    for (const f of files) {
      const dup = S.lib.clips.find(c => c.name === f.name && c.size === f.size);
      const url = URL.createObjectURL(f);
      if (dup) { await link(dup, f, url); relinked++; }
      else {
        const p = await probe(url);
        const c = { id: rid(), name: f.name, size: f.size, type: f.type || '', lastModified: f.lastModified || 0, dur: p.dur, w: p.w, h: p.h, thumb: p.thumb, playable: p.playable, added: now() };
        S.lib.clips.push(c);
        if (!p.playable) bad++;
        await link(c, f, url);
        added++;
      }
      S.busy.n++; renderBusy();
    }
    S.busy = null; touch();
    render();
    toast((added ? plural(added, 'clip') + ' added' : '') + (relinked ? (added ? ', ' : '') + plural(relinked, 'clip') + ' re-linked' : '') + (bad ? '. ' + plural(bad, 'clip') + " won't play in this browser." : '.'));
  }
  async function link(c, file, url) {
    if (S.urls[c.id] && S.urls[c.id] !== url) URL.revokeObjectURL(S.urls[c.id]);
    S.urls[c.id] = url || URL.createObjectURL(file); S.files[c.id] = file;
    if (S.lib.keep) { try { await DB.putMedia(c.id, file); c.kept = true; } catch (e) { c.kept = false; toast('Not enough space to keep a copy of ' + c.name + '. It stays linked until you close the app.'); } }
  }
  async function relinkFiles(files) {
    files = Array.from(files || []);
    const missing = S.lib.clips.filter(c => !linked(c));
    let exact = 0, bylen = 0, none = 0;
    for (const f of files) {
      let c = missing.find(c => !linked(c) && c.name === f.name && c.size === f.size);
      if (c) { await link(c, f); exact++; continue; }
      const url = URL.createObjectURL(f);
      const p = await probe(url);
      const cands = missing.filter(c => !linked(c) && Math.abs(c.dur - p.dur) < 0.15 && c.w * p.h === c.h * p.w);
      if (cands.length === 1) { await link(cands[0], f, url); S.linkNote[cands[0].id] = 'matched by length (' + f.name + ')'; bylen++; }
      else { URL.revokeObjectURL(url); none++; }
    }
    touch(); render();
    toast(`${exact + bylen} re-linked${bylen ? ' (' + bylen + ' by length, check them)' : ''}${none ? ', ' + none + ' not matched' : ''}.`);
  }
  async function relinkFolder() {
    try {
      const dir = await window.showDirectoryPicker();
      const files = [];
      for await (const [name, h] of dir.entries()) if (h.kind === 'file' && /\.(mov|mp4|m4v|webm|mkv)$/i.test(name)) files.push(await h.getFile());
      await relinkFiles(files);
    } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
  }

  // ---------------------------------------------------------------- render root
  const app = () => $('#app');
  const ICON = {
    clips: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
    proof: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 6h16M4 12h10M4 18h13"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
    match: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12l2 2 4-4"/></svg>',
    reels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="8" r="1.6"/><circle cx="12" cy="16" r="1.6"/><circle cx="8" cy="12" r="1.6"/><circle cx="16" cy="12" r="1.6"/></svg>',
    pack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>'
  };
  const TABS = [['clips', 'CLIPS'], ['proof', 'FOOTAGE'], ['match', 'FOR A ROLE'], ['reels', 'REELS'], ['pack', 'PACK']];

  function render() {
    closeSheet(true);
    if (S.tab === 'clip' && clipById(S.clipId)) return renderMarker();
    const tabKey = S.tab === 'reel' ? 'reels' : S.tab;
    const unsaved = S.lib.clips.length && (!S.lib.lastSaved || S.lib.dirty);
    app().innerHTML = `<div class="shell">
      <header class="top"><div class="title"><b>ARCHBOOK</b><span>${esc(S.lib.profile.name || 'Your footage, sorted by archetype')}</span></div>
        <button class="iconbtn" data-a="theme" aria-label="Light or dark">${ICON.theme}</button></header>
      <main id="main">${({ clips: vClips, proof: vProof, match: vMatch, reels: vReels, reel: vReel, pack: vPack }[S.tab] || vClips)()}</main>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="${tabKey === k ? 'on' : ''}" data-a="tab" data-t="${k}">${ICON[k]}<span>${l}</span>${k === 'pack' && unsaved ? '<i class="badge"></i>' : ''}</button>`).join('')}</nav>
    </div>`;
    afterRender();
  }
  function afterRender() {
    const drop = $('#drop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
    }
  }
  function renderBusy() {
    const b = $('#busy'); if (!b || !S.busy) return;
    b.innerHTML = `<div class="dim" style="font-size:14px;margin-bottom:6px">${esc(S.busy.label)} ${S.busy.n}/${S.busy.of}</div><div class="prog"><i style="width:${S.busy.n / S.busy.of * 100}%"></i></div>`;
  }

  // ---------------------------------------------------------------- CLIPS
  function vClips() {
    const L = S.lib, unl = L.clips.filter(c => !linked(c)).length;
    const counts = {}; L.moments.forEach(m => counts[m.clip] = (counts[m.clip] || 0) + 1);
    return `
      ${L.clips.length ? '' : `<div style="padding:12px 0 4px"><div class="kicker">THEACTORPAGE · ACT</div><h1 style="font-size:32px;letter-spacing:.12em">ARCHBOOK</h1><div style="color:var(--tung-text);letter-spacing:.06em;margin-top:2px">Your footage, sorted by archetype.</div>
        <p class="dim" style="margin:6px 0 0;max-width:34em">Drop your footage. Mark your best moments and what character each one expresses. Paste a breakdown and see what footage you've got for the role, then play the reel and hand it off.</p></div>`}
      <div class="drop" id="drop" data-a="addclips" role="button" tabindex="0">
        <b>${L.clips.length ? 'Add more footage' : 'Drop footage'}</b>
        <span class="dim" style="font-size:14px">Scenes, self tapes, set footage. From your camera roll or a folder.</span>
        <span class="btn pri">Choose videos</span>
      </div>
      <div id="busy">${S.busy ? '' : ''}</div>
      ${unl ? `<div class="msg">${plural(unl, 'clip is', 'clips are')} not linked on this device. Your marks are safe. <button class="btn sm" data-a="relink">Re-link videos</button>${window.showDirectoryPicker ? ' <button class="btn sm ghost" data-a="relinkdir">Link a folder</button>' : ''}</div>` : ''}
      ${L.clips.length ? `<div class="kicker">${plural(L.clips.length, 'clip')} · ${plural(L.moments.length, 'moment')}</div>
      <div class="grid">${L.clips.map(c => `<button class="clip" data-a="openclip" data-id="${c.id}">
        <span class="thumbwrap">${c.thumb ? `<img class="thumb" src="${c.thumb}" alt="">` : '<span class="thumb"></span>'}<span class="t">${fmtShort(c.dur)}</span>${!c.playable ? '<span class="st">WON\'T PLAY HERE</span>' : !linked(c) ? '<span class="st">NOT LINKED</span>' : ''}</span>
        <span class="meta"><b>${esc(c.name)}</b><small>${counts[c.id] ? plural(counts[c.id], 'moment') : 'no moments yet'}${S.linkNote[c.id] ? ' · ' + esc(S.linkNote[c.id]) : ''}</small></span></button>`).join('')}</div>` : ''}`;
  }

  // ---------------------------------------------------------------- MARKER (one clip)
  let mv = null, raf = null;
  function renderMarker() {
    const c = clipById(S.clipId);
    S.mk = { in: null, out: null, thumb: null };
    app().innerHTML = `<div class="shell" style="padding-left:0"><main style="max-width:900px;padding-bottom:40px">
      <div class="row" style="flex-wrap:nowrap;margin-bottom:8px"><button class="iconbtn" data-a="tab" data-t="${S.backTo || 'clips'}" aria-label="Back">${ICON.back}</button>
        <div style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</b><span class="faint" style="font-size:13px">${fmtShort(c.dur)} · ${c.w}x${c.h}</span></div>
        <button class="iconbtn" data-a="delclip" aria-label="Remove clip">${ICON.close}</button></div>
      ${!c.playable ? `<div class="msg bad">This browser can't play ${esc(c.name)}. iPhone footage (HEVC) plays in Safari and on Macs; on Windows Chrome it needs the HEVC extension. Your other clips are fine.</div>` :
        !linked(c) ? `<div class="msg">This clip isn't linked on this device. <button class="btn sm" data-a="relink">Re-link videos</button></div>` : `
      <div class="stage"><video id="mv" playsinline preload="auto" src="${S.urls[c.id]}"></video></div>
      <div class="scrub" id="scrub"><input type="range" id="scrubr" min="0" max="${c.dur}" step="0.01" value="0" aria-label="Scrub"><div id="marks"></div></div>
      <div class="tcrow"><span id="tcnow">0:00.0</span><span>${fmt(c.dur)}</span></div>
      <div class="ctl">
        <button class="btn" data-a="nudge" data-d="-1" aria-label="Back 1 second">-1s</button>
        <button class="btn" data-a="nudge" data-d="-${FRAME}" aria-label="Back 1 frame">-1f</button>
        <button class="btn pri" data-a="playpause" id="pp" aria-label="Play">Play</button>
        <button class="btn" data-a="nudge" data-d="${FRAME}" aria-label="Forward 1 frame">+1f</button>
        <button class="btn" data-a="nudge" data-d="1" aria-label="Forward 1 second">+1s</button>
      </div>
      <div class="inout">
        <button class="btn" data-a="setin" id="bin">IN<small id="vin">tap to mark</small></button>
        <button class="btn" data-a="setout" id="bout">OUT<small id="vout">tap to mark</small></button>
        <button class="btn pri" data-a="savemoment" id="bsave" disabled>Save moment<small id="vlen"></small></button>
      </div>
      <p class="faint" style="font-size:12px;margin:0 0 12px">Keyboard: space play, I in, O out, arrows step a frame (shift for a second), Enter saves.</p>`}
      <div id="mlist"></div>
    </main></div>`;
    renderMoments();
    mv = $('#mv');
    if (mv) {
      const r = $('#scrubr');
      r.addEventListener('input', () => { mv.currentTime = +r.value; S.stopAt = null; });
      mv.addEventListener('play', () => { $('#pp').textContent = 'Pause'; loop(); });
      mv.addEventListener('pause', () => { $('#pp').textContent = 'Play'; tick(); });
      mv.addEventListener('seeked', tick);
      mv.addEventListener('click', () => act('playpause'));
      if (S.focusMoment) { const m = momentById(S.focusMoment); if (m) once(mv, 'loadedmetadata').then(() => { mv.currentTime = m.in; }); }
    }
  }
  function tick() {
    if (!mv) return;
    const r = $('#scrubr'), t = $('#tcnow'); if (!r) return;
    r.value = mv.currentTime; t.textContent = fmt(mv.currentTime);
    if (S.stopAt !== null && S.stopAt !== undefined && mv.currentTime >= S.stopAt) { mv.pause(); S.stopAt = null; }
  }
  function loop() { cancelAnimationFrame(raf); const f = () => { tick(); if (mv && !mv.paused) raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); }
  function updateInOut() {
    const k = S.mk;
    if ($('#vin')) $('#vin').textContent = k.in === null ? 'tap to mark' : fmt(k.in);
    if ($('#vout')) $('#vout').textContent = k.out === null ? 'tap to mark' : fmt(k.out);
    const okk = k.in !== null && k.out !== null && k.out - k.in >= 0.3;
    if ($('#bsave')) { $('#bsave').disabled = !okk; $('#vlen').textContent = okk ? fmt(k.out - k.in) : ''; }
    $('#bin') && $('#bin').classList.toggle('pri', false);
    drawMarks();
  }
  function drawMarks() {
    const c = clipById(S.clipId), box = $('#marks'); if (!box || !c.dur) return;
    const ms = S.lib.moments.filter(m => m.clip === c.id);
    let h = ms.map(m => `<span class="mk" style="left:${m.in / c.dur * 100}%;width:${Math.max(0.6, dur(m) / c.dur * 100)}%"></span>`).join('');
    if (S.mk.in !== null) { const o = S.mk.out !== null ? S.mk.out : S.mk.in + 0.2; h += `<span class="mk cur" style="left:${S.mk.in / c.dur * 100}%;width:${Math.max(0.6, (o - S.mk.in) / c.dur * 100)}%"></span>`; }
    box.innerHTML = h;
  }
  function momentCard(m, opts) {
    opts = opts || {};
    const c = clipById(m.clip) || {};
    const used = new Set(m.tags);
    const sugg = Object.keys(S.lib.tags).filter(k => !used.has(k)).sort((a, b) => S.lib.tags[b].n - S.lib.tags[a].n).slice(0, 8);
    return `<div class="moment ${S.newMoment === m.id ? 'cur' : ''}" data-mid="${m.id}">
      ${m.thumb || c.thumb ? `<img src="${m.thumb || c.thumb}" alt="">` : ''}
      <div class="b">
        <div class="h">${opts.showClip ? esc(c.name) + ' · ' : ''}${fmt(m.in)} to ${fmt(m.out)} · ${fmt(dur(m))}</div>
        <input class="field" style="min-height:40px;padding:6px 10px;font-size:15px;margin-top:4px" data-f="label" data-id="${m.id}" value="${esc(m.label || '')}" placeholder="Name it (optional)" aria-label="Moment name">
        <div class="tagbox">${m.tags.map(k => `<button class="chip tag" data-a="untag" data-id="${m.id}" data-k="${esc(k)}">${esc(tagLabel(k))}<span class="x">×</span></button>`).join('')}
          <input class="tagin" data-f="tagin" data-id="${m.id}" placeholder="${m.tags.length ? 'Add' : 'What character does this express? e.g. authority'}" enterkeyhint="done" aria-label="Add a tag"></div>
        ${sugg.length ? `<div class="sugg">${sugg.map(k => `<button class="chip" data-a="tagadd" data-id="${m.id}" data-k="${esc(k)}">+ ${esc(tagLabel(k))}</button>`).join('')}</div>` : ''}
        <div class="row" style="margin-top:8px">
          <button class="flag ${m.open ? 'on' : ''}" data-a="flag" data-id="${m.id}" data-f2="open">Opener</button>
          <button class="flag ${m.button ? 'on' : ''}" data-a="flag" data-id="${m.id}" data-f2="button">Button</button>
          <button class="btn sm" data-a="playmoment" data-id="${m.id}">Play</button>
          ${opts.showClip ? `<button class="btn sm ghost" data-a="gomoment" data-id="${m.id}">Open clip</button>` : ''}
          <button class="iconbtn" data-a="delmoment" data-id="${m.id}" aria-label="Delete moment">${ICON.close}</button>
        </div>
      </div></div>`;
  }
  function renderMoments() {
    const box = $('#mlist'); if (!box) return;
    const ms = S.lib.moments.filter(m => m.clip === S.clipId).sort((a, b) => a.in - b.in);
    box.innerHTML = ms.length ? `<div class="kicker">${plural(ms.length, 'moment')} in this clip</div>` + ms.map(m => momentCard(m)).join('') : `<p class="faint" style="font-size:14px">Play it, tap IN where the moment starts and OUT where it lands, then save. Tag it with the character it expresses.</p>`;
    drawMarks();
  }

  // ---------------------------------------------------------------- PROOF (library by tag)
  function vProof() {
    const L = S.lib, keys = Object.keys(L.tags).filter(k => L.moments.some(m => m.tags.includes(k))).sort((a, b) => count(b) - count(a));
    function count(k) { return L.moments.filter(m => m.tags.includes(k)).length; }
    const lane = S.lane;
    let list = L.moments;
    if (lane === 'open') list = list.filter(m => m.open); else if (lane === 'button') list = list.filter(m => m.button); else if (lane === 'untagged') list = list.filter(m => !m.tags.length); else if (lane !== 'all') list = list.filter(m => m.tags.includes(lane));
    const untagged = L.moments.filter(m => !m.tags.length).length;
    return `<div class="kicker">Footage</div><h1 style="font-size:24px;margin-bottom:10px">${plural(L.moments.length, 'moment')}${keys.length ? ' · ' + plural(keys.length, 'character note') : ''}</h1>
      ${L.moments.length ? `<div class="lanes">
        <button class="chip ${lane === 'all' ? 'on' : ''}" data-a="lane" data-v="all">All ${L.moments.length}</button>
        <button class="chip ${lane === 'open' ? 'on' : ''}" data-a="lane" data-v="open">Openers ${L.moments.filter(m => m.open).length}</button>
        <button class="chip ${lane === 'button' ? 'on' : ''}" data-a="lane" data-v="button">Buttons ${L.moments.filter(m => m.button).length}</button>
        ${untagged ? `<button class="chip ${lane === 'untagged' ? 'on' : ''}" data-a="lane" data-v="untagged">Untagged ${untagged}</button>` : ''}
        ${keys.map(k => `<button class="chip ${lane === k ? 'on' : ''}" data-a="lane" data-v="${esc(k)}">${esc(tagLabel(k))} ${count(k)}</button>`).join('')}
      </div>` + list.map(m => momentCard(m, { showClip: true })).join('') : `<p class="dim">Nothing marked yet. Open a clip in CLIPS and mark a moment.</p>`}
      ${L.wants.length ? `<div class="card" style="margin-top:16px"><div class="kicker">Shoot list</div>${L.wants.map(w => `<div class="row" style="justify-content:space-between"><span>${esc(w.text)}</span><button class="iconbtn" data-a="unwant" data-k="${esc(w.key)}" aria-label="Remove">${ICON.close}</button></div>`).join('')}</div>` : ''}`;
  }

  // ---------------------------------------------------------------- MATCH (breakdown)
  function runMatch() {
    const t = S.lib.lastBreakdown || '';
    S.match = t.trim() ? E.matchBreakdown(t, S.lib.moments, S.lib.tags, S.lib.aliases) : null;
  }
  function vMatch() {
    if (S.match === null && S.lib.lastBreakdown) runMatch();
    const M = S.match;
    return `<div class="kicker">For a role</div><h1 style="font-size:24px;margin-bottom:6px">Do you have footage for this?</h1>
      <p class="dim" style="font-size:14px;margin:0 0 10px">Paste the role description. Your tags are matched by word root ("menacing" finds "menace"). Nothing is assumed.</p>
      <textarea class="field" id="bdtext" data-f="breakdown" placeholder="[SHERIFF DALE] 40s-50s. Weathered small-town sheriff with quiet authority and a dry sense of humor. Menacing when pushed.">${esc(S.lib.lastBreakdown)}</textarea>
      <div class="row" style="margin:8px 0 16px"><button class="btn pri" data-a="domatch">Read it</button>${S.lib.lastBreakdown ? '<button class="btn ghost" data-a="clearmatch">Clear</button>' : ''}</div>
      ${M ? `
        <div class="card">
          <div class="row" style="justify-content:space-between;margin-bottom:8px"><b>${M.covered.length} of ${M.rows.length} covered</b><span class="faint" style="font-size:13px">${Math.round(M.coverage * 100)}%</span></div>
          <div class="kicker" style="margin-top:4px">You've got footage</div>
          <div class="row">${M.covered.map(r => `<button class="chip got" data-a="showrow" data-k="${esc(r.key)}">${esc(r.text)} <b>${r.moments.length}</b></button>`).join('') || '<span class="faint">Nothing yet.</span>'}</div>
          <div class="kicker" style="margin-top:14px">No footage yet</div>
          <div class="row">${M.missing.map(r => `<button class="chip miss" data-a="missrow" data-k="${esc(r.key)}">${esc(r.text)}${S.lib.wants.some(w => w.key === r.key) ? ' · on shoot list' : ''}</button>`).join('') || '<span class="faint">Nothing missing.</span>'}</div>
          <p class="faint" style="font-size:13px;margin:10px 0 0">Tap a missing one to say which of your tags covers it, or put it on your shoot list.</p>
        </div>
        ${M.covered.length ? `<div class="card"><b>Build a reel from this</b><p class="dim" style="font-size:14px;margin:4px 0 10px">Opener first, button last, the most descriptors covered in between. You can change everything after.</p>
          <div class="row">${[60, 90, 120].map(s => `<button class="btn ${s === 90 ? 'pri' : ''}" data-a="buildreel" data-s="${s}">${s / 60 === 1 ? '1:00' : fmtShort(s)}</button>`).join('')}</div></div>` : ''}` : ''}`;
  }

  // ---------------------------------------------------------------- REELS
  function reelLen(r) { return r.items.reduce((n, id) => { const m = momentById(id); return n + (m ? dur(m) : 0); }, 0) + (r.slate ? 2.5 : 0) + (r.endcard ? 2.5 : 0); }
  function vReels() {
    const L = S.lib;
    return `<div class="row" style="justify-content:space-between;align-items:flex-end;margin-bottom:12px"><div><div class="kicker">Reels</div><h1 style="font-size:24px">${plural(L.reels.length, 'reel')}</h1></div><button class="btn pri" data-a="newreel">New reel</button></div>
      ${L.reels.map(r => `<button class="reelrow" style="width:100%;text-align:left" data-a="openreel" data-id="${r.id}">
        ${(() => { const m = momentById(r.items[0]); const c = m && clipById(m.clip); return m && (m.thumb || (c && c.thumb)) ? `<img src="${m.thumb || c.thumb}" alt="">` : '<span class="cardthumb">EMPTY</span>'; })()}
        <span class="b"><b>${esc(r.name)}</b><small>${plural(r.items.length, 'moment')} · ${fmtShort(reelLen(r))} of ${fmtShort(r.target)}</small></span></button>`).join('') || '<p class="dim">No reels yet. Build one from a breakdown in MATCH, or start one here.</p>'}`;
  }
  function seqFor(r) {
    const p = S.lib.profile, seq = [];
    if (r.slate) seq.push({ card: true, label: p.name || 'YOUR NAME', lines: [p.name || 'YOUR NAME', p.line2, p.line3].filter(Boolean), seconds: 2.5 });
    r.items.forEach(id => { const m = momentById(id); if (!m) return; const c = clipById(m.clip); seq.push({ clip: m.clip, name: c ? c.name : '?', in: m.in, out: m.out, label: m.label || '', tags: m.tags.map(tagLabel), url: S.urls[m.clip] || null, playable: c && c.playable }); });
    if (r.endcard) seq.push({ card: true, label: p.name || 'YOUR NAME', lines: [p.name || 'YOUR NAME', p.line2, p.line3].filter(Boolean), seconds: 2.5 });
    return seq;
  }
  function vReel() {
    const r = reelById(S.reelId); if (!r) { S.tab = 'reels'; return vReels(); }
    const len = reelLen(r), over = len > r.target * 1.1;
    const unl = seqFor(r).filter(x => !x.card && (!x.url || !x.playable)).length;
    const M = r.breakdown ? E.matchBreakdown(r.breakdown, S.lib.moments.filter(m => r.items.includes(m.id)), S.lib.tags, S.lib.aliases) : null;
    const p = S.lib.profile;
    return `<div class="row" style="flex-wrap:nowrap;margin-bottom:8px"><button class="iconbtn" data-a="tab" data-t="reels" aria-label="All reels">${ICON.back}</button>
        <input class="field" style="flex:1" data-f="reelname" value="${esc(r.name)}" aria-label="Reel name"><button class="iconbtn" data-a="delreel" aria-label="Delete reel">${ICON.close}</button></div>
      <div class="len ${over ? 'over' : ''}"><i style="width:${Math.min(100, len / (r.target * 1.3) * 100)}%"></i><span class="tgt" style="left:${100 / 1.3}%"></span></div>
      <div class="row" style="justify-content:space-between;font-size:14px"><span>${fmtShort(len)} <span class="faint">of ${fmtShort(r.target)} target</span></span>
        <span class="row">${[60, 90, 120].map(s => `<button class="chip ${r.target === s ? 'on' : ''}" data-a="target" data-s="${s}">${fmtShort(s)}</button>`).join('')}</span></div>
      ${M ? `<div class="msg" style="font-size:14px">This cut has footage for ${M.covered.length} of ${M.rows.length} from the breakdown.${M.missing.length ? ' Missing: ' + esc(M.missing.map(x => x.text).join(', ')) + '.' : ''}</div>` : ''}
      <div class="row" style="margin:12px 0">
        <button class="flag ${r.slate ? 'on' : ''}" data-a="slate" data-v="slate">Name card first</button>
        <button class="flag ${r.endcard ? 'on' : ''}" data-a="slate" data-v="endcard">Name card last</button>
        ${(r.slate || r.endcard) && !p.name ? `<button class="btn sm ghost" data-a="tab" data-t="pack">Set your name in PACK</button>` : ''}
      </div>
      ${r.slate ? `<div class="reelrow"><span class="cardthumb">NAME CARD</span><span class="b"><b>${esc(p.name || 'Your name')}</b><small>2.5s</small></span></div>` : ''}
      ${r.items.map((id, i) => { const m = momentById(id); if (!m) return ''; const c = clipById(m.clip) || {};
        return `<div class="reelrow">${m.thumb || c.thumb ? `<img src="${m.thumb || c.thumb}" alt="">` : ''}<span class="b"><b>${esc(m.label || c.name)}</b><small>${fmt(dur(m))} · ${esc(m.tags.map(tagLabel).join(', ') || 'untagged')}${m.open ? ' · opener' : ''}${m.button ? ' · button' : ''}${!linked(c) ? ' · not linked' : ''}</small></span>
          <button class="iconbtn" data-a="mv" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">${ICON.up}</button>
          <button class="iconbtn" data-a="mv" data-i="${i}" data-d="1" ${i === r.items.length - 1 ? 'disabled' : ''} aria-label="Move down">${ICON.down}</button>
          <button class="iconbtn" data-a="rmitem" data-i="${i}" aria-label="Remove from reel">${ICON.close}</button></div>`; }).join('')}
      ${r.endcard ? `<div class="reelrow"><span class="cardthumb">NAME CARD</span><span class="b"><b>${esc(p.name || 'Your name')}</b><small>2.5s</small></span></div>` : ''}
      <div class="row" style="margin:10px 0 16px"><button class="btn" data-a="additems">Add moments</button></div>
      ${unl ? `<div class="msg">${plural(unl, 'moment')} can't play on this device right now (not linked, or a format this browser can't play). They're skipped in playback and the video file, and kept in the cut list.</div>` : ''}
      <div class="row"><button class="btn pri big" style="flex:1" data-a="playreel" ${r.items.length ? '' : 'disabled'}>Play the reel</button></div>
      <div class="card" style="margin-top:16px">
        <b>Hand it off</b>
        <p class="dim" style="font-size:14px;margin:4px 0 10px">Cut list: your editor opens it with every cut placed. Source media relinks by file name.</p>
        <label class="lab" for="fps">Frame rate of your footage</label>
        <select class="field" id="fps" data-f="fps">${Object.keys(E.RATES).map(k => `<option ${S.fps === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
        <div class="row" style="margin-top:10px">
          <button class="btn" data-a="exp" data-v="xml" ${r.items.length ? '' : 'disabled'}>Premiere / Resolve (.xml)</button>
          <button class="btn" data-a="exp" data-v="edl" ${r.items.length ? '' : 'disabled'}>EDL</button>
          <button class="btn" data-a="exp" data-v="csv" ${r.items.length ? '' : 'disabled'}>Cut list (.csv)</button>
        </div>
      </div>
      <div class="card">
        <b>Make the video file</b> <span class="faint" style="font-size:12px;letter-spacing:.1em">EXPERIMENT</span>
        <p class="dim" style="font-size:14px;margin:4px 0 10px">Records the reel in real time inside the browser. ${fmtShort(len)} reel = about ${fmtShort(len + 3)} to make. Keep this screen open.</p>
        <div class="row"><button class="chip ${S.res === '720' ? 'on' : ''}" data-a="res" data-v="720">720p</button><button class="chip ${S.res === '1080' ? 'on' : ''}" data-a="res" data-v="1080">1080p</button>
          <button class="btn pri" data-a="renderreel" ${r.items.length && typeof MediaRecorder !== 'undefined' ? '' : 'disabled'}>Make it</button></div>
        ${typeof MediaRecorder === 'undefined' ? '<p class="msg bad">This browser has no MediaRecorder. Use the cut list.</p>' : ''}
        <div id="renderout">${S.rendered && S.rendered.reel === r.id ? renderedBox() : ''}</div>
      </div>`;
  }
  function renderedBox() {
    const x = S.rendered;
    const codec = x.codec || (x.mime.match(/codecs=([^;]+)/) || [, ''])[1] || '', h264 = /H\.264|avc1|h264/i.test(codec);
    return `<div class="msg" style="margin-top:12px">Made ${esc(x.name)} · ${(x.blob.size / 1048576).toFixed(1)} MB · ${esc(x.mime.split(';')[0])}${codec ? ' (' + esc(codec) + ')' : ''}</div>
      ${h264 ? '' : `<div class="msg bad">This browser made it as ${esc(codec || 'an unknown codec')}, not H.264. It plays in Chrome, Premiere and Resolve, but not in QuickTime or iPhone Photos. Make it from Safari or desktop Chrome for an H.264 file, or use the cut list.</div>`}
      <video src="${x.url}" controls playsinline style="width:100%;border-radius:10px;background:#000;max-height:50vh"></video>
      <div class="row" style="margin-top:8px"><button class="btn pri" data-a="saverender">${isPhone() && navigator.canShare ? 'Save or share' : 'Download'}</button></div>`;
  }

  // ---------------------------------------------------------------- PACK
  function vPack() {
    const L = S.lib, p = L.profile, unl = L.clips.filter(c => !linked(c)).length;
    return `<div class="kicker">Pack</div><h1 style="font-size:24px;margin-bottom:12px">Keep it, carry it</h1>
      <div class="card"><b>Name card</b><p class="dim" style="font-size:14px;margin:4px 0 0">Shown first and last on reels when you turn it on.</p>
        <label class="lab" for="pn">Name</label><input class="field" id="pn" data-f="p.name" value="${esc(p.name)}" placeholder="Your name">
        <label class="lab" for="p2">Line 2</label><input class="field" id="p2" data-f="p.line2" value="${esc(p.line2)}" placeholder="Phone or email">
        <label class="lab" for="p3">Line 3</label><input class="field" id="p3" data-f="p.line3" value="${esc(p.line3)}" placeholder="Rep, or your site"></div>
      <div class="card"><b>Library file</b>
        <p class="dim" style="font-size:14px;margin:4px 0 10px">${L.lastSaved ? 'Last saved ' + new Date(L.lastSaved).toLocaleString() + '.' + (L.dirty ? ' ' + plural(L.dirty, 'change') + ' since.' : '') : '<b style="color:var(--tung-text)">Never saved to a file.</b>'} Holds every mark, tag and reel. The videos themselves are not inside it, they stay in your camera roll or folders.</p>
        <div class="row"><button class="btn pri" data-a="savelib">${isPhone() && navigator.canShare ? 'Save or share file' : 'Save library file'}</button><button class="btn" data-a="openlib">Open a library file</button></div></div>
      <div class="card"><b>Videos on this device</b>
        <p class="dim" style="font-size:14px;margin:4px 0 10px" id="storeinfo">${L.keep ? 'Copies are kept in this app so clips open without re-picking.' : 'Copies are not kept. Clips need re-linking each time.'} ${unl ? plural(unl, 'clip') + ' not linked right now.' : 'All clips linked.'}</p>
        <div class="row"><button class="flag ${L.keep ? 'on' : ''}" data-a="keep">Keep copies in this app</button><button class="btn" data-a="relink">Re-link videos</button>${window.showDirectoryPicker ? '<button class="btn ghost" data-a="relinkdir">Link a folder</button>' : ''}</div></div>
      <div class="row" style="margin:16px 0"><button class="btn ghost bad" data-a="wipe">Erase everything on this device</button></div>
      <p class="faint" style="font-size:12px">ARCHBOOK ${VERSION}</p>`;
  }
  async function storeInfo() {
    try { const e = await navigator.storage.estimate(); const el = $('#storeinfo'); if (el) el.innerHTML += ` Using ${(e.usage / 1048576).toFixed(0)} MB of ${(e.quota / 1073741824).toFixed(1)} GB.`; } catch (e) { }
  }

  // ---------------------------------------------------------------- sequence engine (preview + render share this)
  function mimePick() {
    const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
  }
  function drawCard(ctx, W, H, item) {
    ctx.fillStyle = '#121110'; ctx.fillRect(0, 0, W, H);
    const lines = item.lines || [item.label];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ece7dc'; ctx.font = `600 ${Math.round(H * 0.085)}px Jost, system-ui, sans-serif`;
    ctx.fillText(String(lines[0] || '').toUpperCase(), W / 2, H * 0.44);
    ctx.fillStyle = '#e0a23c'; ctx.fillRect(W / 2 - W * 0.06, H * 0.52, W * 0.12, Math.max(2, H * 0.005));
    ctx.fillStyle = '#a39c8e'; ctx.font = `400 ${Math.round(H * 0.04)}px Jost, system-ui, sans-serif`;
    lines.slice(1).forEach((l, i) => ctx.fillText(l, W / 2, H * (0.6 + i * 0.065)));
  }
  // seq: from seqFor(). opts: {canvas, record, audible, onStep(i,n), stop:{v}}
  async function runSequence(seq, opts, video, ac) {
    const cv = opts.canvas, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    let mode = 'black', card = null, alive = true;
    const draw = () => {
      if (!alive) return;
      if (mode === 'video' && video.readyState >= 2) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); fit(ctx, video, video.videoWidth, video.videoHeight, W, H); }
      else if (mode === 'card') drawCard(ctx, W, H, card);
      requestAnimationFrame(draw);
    };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    requestAnimationFrame(draw);
    let rec = null, chunks = [], mime = '';
    if (opts.record) {
      const stream = cv.captureStream(30);
      if (ac && opts.dest) opts.dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      mime = mimePick();
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: S.res === '1080' ? 10e6 : 6e6, audioBitsPerSecond: 160000 } : {});
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(500); rec.pause();
      if (rec.mimeType) mime = rec.mimeType; // what the browser actually used
    }
    const pause = () => { if (rec && rec.state === 'recording') rec.pause(); };
    const resume = () => { if (rec && rec.state === 'paused') rec.resume(); };
    const items = seq.filter(x => x.card || (x.url && x.playable));
    try {
      for (let i = 0; i < items.length; i++) {
        if (opts.stop.v) break;
        const it = items[i];
        opts.onStep && opts.onStep(i, items.length, it);
        if (it.card) {
          card = it; mode = 'card'; drawCard(ctx, W, H, it); await sleep(40); resume();
          const t0 = performance.now(); while (performance.now() - t0 < it.seconds * 1000 && !opts.stop.v) await sleep(40);
          pause(); continue;
        }
        pause();
        if (video.src !== it.url) { video.src = it.url; await once(video, 'loadeddata', 15000); }
        video.currentTime = it.in; await once(video, 'seeked', 10000);
        mode = 'video'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); fit(ctx, video, video.videoWidth, video.videoHeight, W, H);
        await sleep(30); // let the in-frame land in the stream before recording resumes
        resume();
        await video.play();
        await new Promise(res => {
          const chk = () => { if (opts.stop.v || video.ended || video.currentTime >= it.out - 0.012) return res(); requestAnimationFrame(chk); };
          requestAnimationFrame(chk);
        });
        video.pause(); pause();
      }
    } finally {
      alive = false;
    }
    if (!rec) return null;
    const done = new Promise(res => { rec.onstop = res; });
    if (rec.state === 'paused') rec.resume();
    rec.stop(); await done;
    return { blob: new Blob(chunks, { type: (mime || 'video/webm').split(';')[0] }), mime: mime || 'video/webm' };
  }
  // one video element + one audio graph per run; created inside the tap so phones allow sound
  function mediaKit(record, audible) {
    const video = document.createElement('video'); video.playsInline = true; video.preload = 'auto';
    let ac = null, dest = null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ac = new AC(); ac.resume();
      const src = ac.createMediaElementSource(video);
      if (record) { dest = ac.createMediaStreamDestination(); src.connect(dest); }
      if (audible) src.connect(ac.destination);
    } catch (e) { ac = null; video.muted = !audible; }
    return { video, ac, dest };
  }
  async function playSequence(seq, title) {
    const first = seq.find(x => !x.card && x.url && x.playable);
    const kit = mediaKit(false, true);
    if (first) { kit.video.src = first.url; kit.video.play().then(() => kit.video.pause()).catch(() => { }); } // unlock
    const box = document.createElement('div'); box.className = 'player';
    box.innerHTML = `<canvas width="1280" height="720"></canvas><div class="bar"><span style="flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" id="pstep">${esc(title)}</span><button class="btn" id="pstop">Stop</button></div>`;
    document.body.appendChild(box);
    const stop = { v: false };
    box.querySelector('#pstop').onclick = () => { stop.v = true; };
    try {
      await runSequence(seq, { canvas: box.querySelector('canvas'), stop, onStep: (i, n, it) => { const s = box.querySelector('#pstep'); if (s) s.textContent = `${i + 1}/${n} · ${it.card ? 'Name card' : (it.label || it.name)}`; } }, kit.video, kit.ac);
    } catch (e) { toast('Playback stopped: ' + e.message); }
    kit.video.pause(); kit.video.removeAttribute('src'); try { kit.ac && kit.ac.close(); } catch (e) { }
    box.remove();
  }
  // read the codec from the file itself (browsers often report only "video/mp4")
  async function sniffCodec(blob) {
    const n = Math.min(blob.size, 2 * 1048576);
    const parts = [blob.slice(0, n), blob.slice(Math.max(0, blob.size - n))];
    let txt = '';
    for (const p of parts) { const b = new Uint8Array(await p.arrayBuffer()); for (let i = 0; i < b.length; i++) txt += (b[i] > 31 && b[i] < 127) ? String.fromCharCode(b[i]) : '.'; }
    if (/avc1|avc3|V_MPEG4\/ISO\/AVC/.test(txt)) return 'H.264';
    if (/hvc1|hev1/.test(txt)) return 'HEVC';
    if (/vp09|V_VP9/.test(txt)) return 'VP9';
    if (/vp08|V_VP8/.test(txt)) return 'VP8';
    if (/av01|V_AV1/.test(txt)) return 'AV1';
    return '';
  }
  async function renderReel(r) {
    const seq = seqFor(r);
    const W = S.res === '1080' ? 1920 : 1280, H = S.res === '1080' ? 1080 : 720;
    const kit = mediaKit(true, false);
    const first = seq.find(x => !x.card && x.url && x.playable);
    if (first) { kit.video.src = first.url; kit.video.muted = false; kit.video.play().then(() => kit.video.pause()).catch(() => { }); }
    try { await document.fonts.load('600 64px Jost'); } catch (e) { }
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const box = document.createElement('div'); box.className = 'player';
    box.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:12px"></div><div class="bar"><span style="flex:1" id="pstep">Making the reel. Keep this screen open.</span><button class="btn" id="pstop">Cancel</button></div>`;
    cv.style.cssText = 'max-width:100%;max-height:100%;background:#000';
    box.firstChild.appendChild(cv); document.body.appendChild(box);
    let wl = null; try { wl = await navigator.wakeLock.request('screen'); } catch (e) { }
    const stop = { v: false };
    box.querySelector('#pstop').onclick = () => { stop.v = true; };
    let out = null;
    try {
      out = await runSequence(seq, { canvas: cv, record: true, dest: kit.dest, stop, onStep: (i, n, it) => { const s = box.querySelector('#pstep'); if (s) s.textContent = `Making ${i + 1} of ${n}: ${it.card ? 'name card' : (it.label || it.name)}. Keep this screen open.`; } }, kit.video, kit.ac);
    } catch (e) { toast('Could not make the file: ' + e.message); }
    try { wl && wl.release(); } catch (e) { }
    kit.video.pause(); kit.video.removeAttribute('src'); try { kit.ac && kit.ac.close(); } catch (e) { }
    box.remove();
    if (!out || stop.v || !out.blob.size) { if (stop.v) toast('Cancelled.'); return; }
    const ext = /mp4/.test(out.mime) ? 'mp4' : 'webm';
    if (S.rendered) URL.revokeObjectURL(S.rendered.url);
    const codec = await sniffCodec(out.blob).catch(() => '');
    S.rendered = { reel: r.id, blob: out.blob, mime: out.mime, codec, url: URL.createObjectURL(out.blob), name: slug(S.lib.profile.name || 'reel') + '_' + slug(r.name) + '.' + ext };
    render();
    const o = $('#renderout'); if (o) o.scrollIntoView({ block: 'center' });
  }

  // ---------------------------------------------------------------- files out
  async function deliver(blob, name) {
    try {
      const f = new File([blob], name, { type: blob.type });
      if (isPhone() && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return true;
  }
  function exportCut(r, kind) {
    const seq = seqFor(r).map(x => x.card ? x : { clip: x.clip, name: x.name, in: x.in, out: x.out, label: x.label, tags: x.tags });
    const base = slug(S.lib.profile.name || 'reel') + '_' + slug(r.name);
    const byId = Object.fromEntries(S.lib.clips.map(c => [c.id, c]));
    if (kind === 'edl') deliver(new Blob([E.toEDL(r.name, seq, S.fps)], { type: 'text/plain' }), base + '.edl');
    if (kind === 'xml') deliver(new Blob([E.toXML(r.name, seq, S.fps, byId)], { type: 'application/xml' }), base + '.xml');
    if (kind === 'csv') deliver(new Blob([E.toCSV(seq)], { type: 'text/csv' }), base + '.csv');
  }

  // ---------------------------------------------------------------- sheet / toast
  function openSheet(html) {
    let scrim = $('.scrim'), sh = $('.sheet');
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.a = 'closesheet'; document.body.appendChild(scrim); }
    if (!sh) { sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); document.body.appendChild(sh); }
    sh.innerHTML = `<div class="grab"></div><button class="iconbtn x" data-a="closesheet" aria-label="Close">${ICON.close}</button>` + html;
    requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  }
  function closeSheet(instant) {
    const scrim = $('.scrim'), sh = $('.sheet'); if (!sh) return;
    scrim.classList.remove('on'); sh.classList.remove('on');
    const k = () => { scrim.remove(); sh.remove(); }; if (instant) k(); else setTimeout(k, 180);
  }
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3600); }

  // ---------------------------------------------------------------- tags
  function addTagTo(m, label) {
    const k = E.addTag(S.lib.tags, label); if (!k) return;
    if (!m.tags.includes(k)) m.tags.push(k); else S.lib.tags[k].n--;
    S.match = null; touch();
  }
  function refreshMomentCard(id, focus) {
    const old = document.querySelector(`.moment[data-mid="${id}"]`); const m = momentById(id);
    if (!old || !m) return;
    const tmp = document.createElement('div'); tmp.innerHTML = momentCard(m, { showClip: S.tab !== 'clip' });
    old.replaceWith(tmp.firstElementChild);
    if (focus) { const f = document.querySelector(`.moment[data-mid="${id}"] .tagin`); if (f) f.focus(); }
  }

  // ---------------------------------------------------------------- actions
  async function act(a, ds, el) {
    ds = ds || {};
    const L = S.lib;
    switch (a) {
      case 'tab': if (mv) { mv.pause(); mv = null; } S.tab = ds.t; S.focusMoment = null; S.newMoment = null; render(); window.scrollTo(0, 0); if (ds.t === 'pack') storeInfo(); break;
      case 'theme': { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); const nx = cur === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('archbook_theme', nx); } catch (e) { } break; }
      case 'addclips': $('#clipin').click(); break;
      case 'relink': $('#relinkin').click(); break;
      case 'relinkdir': relinkFolder(); break;
      case 'openclip': S.clipId = ds.id; S.backTo = 'clips'; S.tab = 'clip'; S.focusMoment = null; render(); window.scrollTo(0, 0); break;
      case 'gomoment': { const m = momentById(ds.id); if (!m) break; S.clipId = m.clip; S.backTo = S.tab; S.focusMoment = m.id; S.newMoment = m.id; S.tab = 'clip'; render(); window.scrollTo(0, 0); break; }
      case 'delclip': {
        const c = clipById(S.clipId); const n = L.moments.filter(m => m.clip === c.id).length;
        if (!confirm(`Remove ${c.name}${n ? ' and its ' + plural(n, 'moment') : ''}? The video on your device is not touched.`)) break;
        const ids = new Set(L.moments.filter(m => m.clip === c.id).map(m => m.id));
        L.moments = L.moments.filter(m => !ids.has(m.id)); L.reels.forEach(r => { r.items = r.items.filter(i => !ids.has(i)); });
        L.clips = L.clips.filter(x => x.id !== c.id); DB.delMedia(c.id).catch(() => { }); if (S.urls[c.id]) URL.revokeObjectURL(S.urls[c.id]); delete S.urls[c.id];
        touch(); act('tab', { t: 'clips' }); break;
      }
      // marker
      case 'playpause': if (!mv) break; if (mv.paused) { S.stopAt = null; mv.play(); } else mv.pause(); break;
      case 'nudge': if (!mv) break; mv.pause(); mv.currentTime = Math.max(0, Math.min(mv.duration || 0, mv.currentTime + (+ds.d))); break;
      case 'setin': if (!mv) break; S.mk.in = +mv.currentTime.toFixed(3); S.mk.thumb = grab(mv, 320); if (S.mk.out !== null && S.mk.out <= S.mk.in) S.mk.out = null; updateInOut(); break;
      case 'setout': if (!mv) break; S.mk.out = +mv.currentTime.toFixed(3); if (S.mk.in === null || S.mk.in >= S.mk.out) { S.mk.in = Math.max(0, +(S.mk.out - 5).toFixed(3)); toast('IN set 5s before. Adjust if needed.'); } updateInOut(); break;
      case 'savemoment': {
        const k = S.mk; if (k.in === null || k.out === null || k.out - k.in < 0.3) break;
        const m = { id: rid(), clip: S.clipId, in: k.in, out: k.out, tags: [], open: false, button: false, label: '', thumb: k.thumb || '', at: now() };
        L.moments.push(m); S.newMoment = m.id; S.mk = { in: null, out: null, thumb: null }; touch(); updateInOut(); renderMoments();
        const f = document.querySelector(`.moment[data-mid="${m.id}"] .tagin`); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); }
        break;
      }
      case 'tagadd': { const m = momentById(ds.id); if (!m) break; addTagTo(m, tagLabel(ds.k)); refreshMomentCard(m.id); if (S.tab === 'clip') drawMarks(); break; }
      case 'untag': { const m = momentById(ds.id); if (!m) break; m.tags = m.tags.filter(k => k !== ds.k); if (L.tags[ds.k]) { L.tags[ds.k].n--; if (L.tags[ds.k].n <= 0 && !L.moments.some(x => x.tags.includes(ds.k))) delete L.tags[ds.k]; } S.match = null; touch(); refreshMomentCard(m.id); break; }
      case 'flag': { const m = momentById(ds.id); if (!m) break; m[ds.f2] = !m[ds.f2]; touch(); refreshMomentCard(m.id); break; }
      case 'delmoment': { if (!confirm('Delete this moment? It comes out of any reel it is in.')) break; L.moments = L.moments.filter(m => m.id !== ds.id); L.reels.forEach(r => { r.items = r.items.filter(i => i !== ds.id); }); S.match = null; touch(); if (S.tab === 'clip') renderMoments(); else render(); break; }
      case 'playmoment': {
        const m = momentById(ds.id); if (!m) break; const c = clipById(m.clip);
        if (S.tab === 'clip' && mv) { mv.currentTime = m.in; S.stopAt = m.out; mv.play(); break; }
        if (!linked(c) || !c.playable) { toast('That clip is not linked or will not play here.'); break; }
        playSequence([{ clip: m.clip, name: c.name, in: m.in, out: m.out, label: m.label, url: S.urls[m.clip], playable: true }], m.label || c.name);
        break;
      }
      case 'lane': S.lane = ds.v; render(); break;
      case 'unwant': L.wants = L.wants.filter(w => w.key !== ds.k); touch(); render(); break;
      // match
      case 'domatch': { const t = $('#bdtext'); L.lastBreakdown = t ? t.value : L.lastBreakdown; touch(true); runMatch(); render(); break; }
      case 'clearmatch': L.lastBreakdown = ''; S.match = null; touch(true); render(); break;
      case 'showrow': {
        const r = S.match && S.match.rows.find(x => x.key === ds.k); if (!r) break;
        openSheet(`<div class="kicker">"${esc(r.text)}" · matched by ${esc(r.tags.map(tagLabel).join(', '))}</div>${r.moments.map(id => momentById(id)).filter(Boolean).map(m => momentCard(m, { showClip: true })).join('')}`);
        break;
      }
      case 'missrow': {
        const r = S.match && S.match.rows.find(x => x.key === ds.k); if (!r) break;
        const keys = Object.keys(L.tags).sort((a, b) => L.tags[b].n - L.tags[a].n);
        const wanted = L.wants.some(w => w.key === r.key);
        openSheet(`<div class="kicker">No footage yet</div><h3 style="margin-bottom:10px">"${esc(r.text)}"</h3>
          ${keys.length ? `<p class="dim" style="font-size:14px;margin:0 0 8px">Already have it under another name? Tap the tag that covers it. ARCHBOOK remembers it next time.</p><div class="row">${keys.map(k => `<button class="chip" data-a="alias" data-k="${esc(r.key)}" data-t="${esc(k)}">${esc(tagLabel(k))}</button>`).join('')}</div>` : '<p class="dim">No tags yet. Tag some moments first.</p>'}
          <div class="row" style="margin-top:14px"><button class="btn ${wanted ? '' : 'pri'}" data-a="want" data-k="${esc(r.key)}" data-t="${esc(r.text)}">${wanted ? 'Take off shoot list' : 'Add to shoot list'}</button></div>`);
        break;
      }
      case 'alias': L.aliases[ds.k] = ds.t; touch(); runMatch(); closeSheet(true); render(); toast('Remembered.'); break;
      case 'want': { const i = L.wants.findIndex(w => w.key === ds.k); if (i >= 0) L.wants.splice(i, 1); else L.wants.push({ key: ds.k, text: ds.t, at: now() }); touch(); closeSheet(true); render(); break; }
      case 'buildreel': {
        if (!S.match) runMatch(); const target = +ds.s;
        const D = E.buildDraft(S.match, L.moments, target);
        if (!D.items.length) { toast('Nothing to build from yet.'); break; }
        const nm = (L.lastBreakdown.match(/\[([^\]]+)\]/) || [, ''])[1] || (S.match.covered[0] ? S.match.covered[0].text : 'Breakdown');
        const r = { id: rid(), name: nm.trim().replace(/\s+/g, ' ').slice(0, 60) + ' reel', items: D.items, target, slate: !!L.profile.name, endcard: false, breakdown: L.lastBreakdown, at: now() };
        L.reels.unshift(r); touch(); S.reelId = r.id; S.tab = 'reel'; render(); window.scrollTo(0, 0); break;
      }
      // reels
      case 'newreel': { const r = { id: rid(), name: 'Reel ' + (L.reels.length + 1), items: [], target: 90, slate: !!L.profile.name, endcard: false, at: now() }; L.reels.unshift(r); touch(); S.reelId = r.id; S.tab = 'reel'; render(); break; }
      case 'openreel': S.reelId = ds.id; S.tab = 'reel'; render(); window.scrollTo(0, 0); break;
      case 'delreel': if (confirm('Delete this reel? Your moments stay in the library.')) { L.reels = L.reels.filter(r => r.id !== S.reelId); touch(); act('tab', { t: 'reels' }); } break;
      case 'target': reelById(S.reelId).target = +ds.s; touch(); render(); break;
      case 'slate': { const r = reelById(S.reelId); r[ds.v] = !r[ds.v]; touch(); render(); break; }
      case 'mv': { const r = reelById(S.reelId), i = +ds.i, j = i + (+ds.d); if (j < 0 || j >= r.items.length) break; [r.items[i], r.items[j]] = [r.items[j], r.items[i]]; touch(); render(); break; }
      case 'rmitem': { const r = reelById(S.reelId); r.items.splice(+ds.i, 1); touch(); render(); break; }
      case 'additems': {
        const r = reelById(S.reelId);
        const list = L.moments.filter(m => !r.items.includes(m.id));
        openSheet(`<div class="kicker">Add to ${esc(r.name)}</div>${list.length ? list.map(m => { const c = clipById(m.clip) || {}; return `<button class="reelrow" style="width:100%;text-align:left" data-a="additem" data-id="${m.id}">${m.thumb || c.thumb ? `<img src="${m.thumb || c.thumb}" alt="">` : ''}<span class="b"><b>${esc(m.label || c.name)}</b><small>${fmt(dur(m))} · ${esc(m.tags.map(tagLabel).join(', ') || 'untagged')}</small></span></button>`; }).join('') : '<p class="dim">Every moment is already in this reel.</p>'}`);
        break;
      }
      case 'additem': { const r = reelById(S.reelId); if (!r.items.includes(ds.id)) { const btnI = r.items.length && momentById(r.items[r.items.length - 1]) && momentById(r.items[r.items.length - 1]).button ? r.items.length - 1 : r.items.length; r.items.splice(btnI, 0, ds.id); } touch(); el.remove(); toast('Added.'); break; }
      case 'playreel': { const r = reelById(S.reelId); playSequence(seqFor(r), r.name); break; }
      case 'exp': exportCut(reelById(S.reelId), ds.v); break;
      case 'res': S.res = ds.v; render(); break;
      case 'renderreel': renderReel(reelById(S.reelId)); break;
      case 'saverender': if (S.rendered) deliver(S.rendered.blob, S.rendered.name); break;
      // pack
      case 'savelib': {
        L.lastSaved = now(); L.dirty = 0; await DB.putLib(L);
        const out = Object.assign({}, L, { note: 'Videos are not inside this file. They re-link by file name and size.', cco: { surface: 'act.archbook', shared: { active_target: L.id }, note: 'Shared vocabulary only. Not wired to a bus in this build.' } });
        await deliver(new Blob([JSON.stringify(out)], { type: 'application/json' }), slug(L.profile.name || 'my') + '_archbook.json');
        render(); toast('Library saved.'); break;
      }
      case 'openlib': $('#libin').click(); break;
      case 'keep': L.keep = !L.keep; touch(); if (L.keep) { for (const c of L.clips) if (S.files[c.id] && !c.kept) { try { await DB.putMedia(c.id, S.files[c.id]); c.kept = true; } catch (e) { } } } else { for (const c of L.clips) { DB.delMedia(c.id).catch(() => { }); c.kept = false; } } touch(); render(); storeInfo(); break;
      case 'wipe': if (confirm('Erase every clip copy, mark, tag and reel on this device? Save a library file first if you want to keep your work.')) { await DB.clearAll(); Object.values(S.urls).forEach(u => URL.revokeObjectURL(u)); S.urls = {}; S.files = {}; S.lib = emptyLib(); await DB.putLib(S.lib); S.tab = 'clips'; render(); } break;
      case 'closesheet': closeSheet(); break;
    }
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-a]');
    if (!t || t.disabled || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
    e.preventDefault();
    act(t.dataset.a, Object.assign({}, t.dataset), t);
  });
  document.addEventListener('keydown', e => {
    const f = e.target.closest && e.target.closest('[data-f="tagin"]');
    if (f && (e.key === 'Enter' || e.key === ',')) {
      e.preventDefault(); const v = f.value.trim(); if (!v) { f.blur(); return; }
      const m = momentById(f.dataset.id); if (!m) return;
      v.split(',').map(x => x.trim()).filter(Boolean).forEach(x => addTagTo(m, x));
      refreshMomentCard(m.id, true); return;
    }
    if (e.key === 'Escape' && $('.sheet')) { closeSheet(); return; }
    if (S.tab !== 'clip' || !mv || /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); act('playpause'); }
    else if (k === 'i') act('setin'); else if (k === 'o') act('setout');
    else if (k === 'enter') act('savemoment');
    else if (k === 'arrowleft') { e.preventDefault(); act('nudge', { d: e.shiftKey ? -1 : -FRAME }); }
    else if (k === 'arrowright') { e.preventDefault(); act('nudge', { d: e.shiftKey ? 1 : FRAME }); }
  });
  document.addEventListener('focusout', e => {
    const f = e.target.closest && e.target.closest('[data-f="tagin"]');
    if (f && f.value.trim()) { const m = momentById(f.dataset.id); if (m) { f.value.split(',').map(x => x.trim()).filter(Boolean).forEach(x => addTagTo(m, x)); setTimeout(() => refreshMomentCard(m.id), 0); } }
  });
  document.addEventListener('input', e => {
    const f = e.target.closest('[data-f]'); if (!f) return;
    const k = f.dataset.f, v = f.value, L = S.lib;
    if (k === 'label') { const m = momentById(f.dataset.id); if (m) { m.label = v; touch(); } }
    else if (k === 'reelname') { const r = reelById(S.reelId); if (r) { r.name = v; touch(); } }
    else if (k.startsWith('p.')) { L.profile[k.slice(2)] = v; touch(); }
  });
  document.addEventListener('change', e => { const f = e.target.closest('[data-f="fps"]'); if (f) S.fps = f.value; });
  $('#clipin').addEventListener('change', e => { const fs = Array.from(e.target.files); e.target.value = ''; addFiles(fs); });
  $('#relinkin').addEventListener('change', e => { const fs = Array.from(e.target.files); e.target.value = ''; relinkFiles(fs); });
  $('#libin').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (d.schema !== SCHEMA && !OLD_SCHEMAS.includes(d.schema)) throw new Error('Not an ARCHBOOK library file.'); d.schema = SCHEMA;
      if (S.lib.clips.length && !confirm('Replace the library on this device with this file? Kept video copies stay and re-link by name and size.')) return;
      delete d.cco; delete d.note;
      const keepMedia = {}; S.lib.clips.forEach(c => { if (S.urls[c.id]) keepMedia[c.name + '|' + c.size] = { url: S.urls[c.id], file: S.files[c.id], id: c.id }; });
      S.lib = Object.assign(emptyLib(), d); S.urls = {}; S.files = {};
      for (const c of S.lib.clips) { const k = keepMedia[c.name + '|' + c.size]; if (k) { S.urls[c.id] = k.url; S.files[c.id] = k.file; if (S.lib.keep && k.id !== c.id) { try { await DB.putMedia(c.id, k.file); } catch (er) { } } } }
      await DB.putLib(S.lib); S.match = null; S.tab = 'clips'; render(); toast('Library opened.');
    } catch (er) { toast(er.message); }
  });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { if (!e.target.closest('#drop')) e.preventDefault(); });

  // ---------------------------------------------------------------- boot
  (async function boot() {
    try { const th = localStorage.getItem('archbook_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
    let lib = null; try { lib = await DB.getLib(); } catch (e) { }
    S.lib = lib && lib.schema === SCHEMA ? Object.assign(emptyLib(), lib) : emptyLib();
    for (const c of S.lib.clips) { try { const b = await DB.getMedia(c.id); if (b) { S.urls[c.id] = URL.createObjectURL(b); S.files[c.id] = b; } } catch (e) { } }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
    render();
    window.ARCHBOOK = { S, act, E, runSequence, seqFor, version: VERSION };
  })();
})();
