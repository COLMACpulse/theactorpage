/*
  SLATE MAKER v0.4 · Actor Edition
  The solo slate. One locked-off wide take, a virtual camera that starts on your face
  and glides out to full body, cut to every shape casting asks for. Plus the kit that goes with it.
  Vanilla JS, offline, no account. Your take never leaves the device.
*/
(function () {
  'use strict';
  const VERSION = '0.4.0';
  const E = window.SlateEngine;

  // ---------------------------------------------------------------- utils
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fmt = s => { s = Math.round(Math.max(0, s || 0) * 10) / 10; const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const once = (el, ev, ms) => new Promise((res, rej) => {
    let t; const on = () => { clearTimeout(t); off(); res(); }, er = () => { clearTimeout(t); off(); rej(new Error('media error')); };
    const off = () => { el.removeEventListener(ev, on); el.removeEventListener('error', er); };
    el.addEventListener(ev, on); el.addEventListener('error', er);
    if (ms) t = setTimeout(() => { off(); rej(new Error('timeout')); }, ms);
  });
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3400); }

  // ---------------------------------------------------------------- storage (kit + plans; never the take)
  const DB = (function () {
    let p = null;
    const open = () => p || (p = new Promise((res, rej) => { try { const r = indexedDB.open('slate_v04', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }).catch(() => null));
    const op = async (mode, fn) => { const db = await open(); if (!db) return null; return new Promise((res, rej) => { const t = db.transaction('kv', mode); const r = fn(t.objectStore('kv')); t.oncomplete = () => res(r && 'result' in r ? r.result : undefined); t.onerror = () => rej(t.error); }); };
    return { get: k => op('readonly', s => s.get(k)), put: (k, v) => op('readwrite', s => s.put(v, k)), del: k => op('readwrite', s => s.delete(k)) };
  })();

  // ---------------------------------------------------------------- state
  const today = () => new Date().toISOString().slice(0, 10);
  const S = {
    tab: 'take', take: null, plan: null, mode: 'face', pvAspect: '16:9',
    outs: { '16:9': true, '9:16': true, '1:1': false }, res: '1080', card: false, lower: false,
    outputs: [], kit: { name: '', height: '', location: '', rep: '', links: '', project: '', role: '', take: '', date: today() },
    headshot: null, resume: null, cardAspect: '16:9'
  };
  const defaultPlan = dur => ({ face: { x: 0.44, y: 0.08, w: 0.12, h: 0.16 }, body: { x: 0.34, y: 0.05, w: 0.32, h: 0.9 }, glideAt: Math.min(4, dur * 0.4), glide: 2, dir: 'out', shot: 'medium', inT: 0, outT: dur, set: false });
  const planKey = () => S.take ? 'plan:' + S.take.name + '|' + S.take.size : null;
  let saveT = null;
  function saveSoon() { clearTimeout(saveT); saveT = setTimeout(() => { DB.put('kit', S.kit); if (planKey()) DB.put(planKey(), S.plan); }, 250); }

  // ---------------------------------------------------------------- render root
  const ICON = {
    take: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    frame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="9" y="6" width="6" height="5" rx="1" fill="currentColor"/></svg>',
    make: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="11" height="7" rx="1"/><rect x="16" y="4" width="5" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>',
    kit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>'
  };
  const TABS = [['take', 'TAKE'], ['frame', 'FRAME'], ['make', 'MAKE'], ['kit', 'KIT']];
  function render() {
    stopPreview();
    $('#app').innerHTML = `<div class="shell">
      <header class="top"><a class="iconbtn" href="../actor-os/?open=1" aria-label="Back to Actor OS" title="Back to Actor OS" style="text-decoration:none;font-size:22px;display:inline-flex;align-items:center;justify-content:center;color:inherit">‹</a><div class="title"><b>SOLO SLATE · ACTOR OS</b><span>${esc(S.kit.name || 'One take. Face to full body. Every shape.')}</span></div>
        <button class="iconbtn" data-a="theme" aria-label="Light or dark">${ICON.theme}</button></header>
      <main id="main">${({ take: vTake, frame: vFrame, make: vMake, kit: vKit }[S.tab])()}</main>
      <nav class="tabs" style="grid-template-columns:repeat(4,1fr)">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${ICON[k]}<span>${l}</span>${k === 'make' && S.outputs.length ? '<i class="badge"></i>' : ''}</button>`).join('')}</nav>
    </div>`;
    after();
  }
  function after() {
    const drop = $('#drop');
    if (drop) {
      ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) loadTake(f); });
    }
    if (S.tab === 'frame' && S.take) setupFrame();
    if (S.tab === 'kit') drawKitCard();
    const kt = $('#slKit');
    if (kt && window.Kit) Kit.wire(kt, { recordhere: () => { if (canRec()) recordHere(); else toast("This browser can't open the camera. Choose a take instead."); }, shoot: () => $('#shootin').click() });
  }

  // ---------------------------------------------------------------- TAKE
  /* the front: what the camera and mic do here, as tiles with a live OFF / ON / RECORDING chip */
  const canRec = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  function kitTiles() {
    if (!window.Kit) return '';
    const L = [{ id: 'recordhere', dev: 'camera', label: 'CAMERA', what: 'Record the slate here', note: canRec() ? 'Camera and mic' : "This browser can't", off: !canRec() }];
    if (isPhone()) L.push({ id: 'shoot', dev: 'camera', label: 'CAMERA', what: 'Use the phone camera', note: 'Opens your camera app' });
    return '<div id="slKit" style="padding-top:4px">' + Kit.html(L) + '</div>';
  }
  function vTake() {
    const t = S.take;
    const say = E.slateScript({ name: S.kit.name, height: S.kit.height, location: S.kit.location, rep: S.kit.rep, role: S.kit.role });
    return `${t ? '' : kitTiles()}${t ? '' : `<div style="padding:12px 0 4px"><div class="kicker">THEACTORPAGE · ACT</div><h1 style="font-size:32px;letter-spacing:.12em">SLATE MAKER</h1>
        <div style="color:var(--tung-text);letter-spacing:.06em;margin-top:2px">One take. Face to full body. Every shape.</div>
        <p class="dim" style="margin:8px 0 0;max-width:36em">No one to run the camera? Shoot one wide take on a tripod. Slate Maker starts tight on your face while you slate, then glides out to full body, and cuts it for casting, vertical and square.</p></div>`}
      ${t ? `<div class="card"><div class="row" style="flex-wrap:nowrap">${t.thumb ? `<img src="${t.thumb}" style="width:120px;border-radius:8px;flex:none" alt="">` : ''}<div style="min-width:0"><b style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.name)}</b><span class="faint" style="font-size:13px">${fmt(t.dur)} · ${t.w}x${t.h}${t.w < t.h ? ' · vertical' : ''}</span></div></div>
        ${t.w * t.h < 3840 * 2160 * 0.9 ? `<div class="msg" style="font-size:14px">This take is ${t.w}x${t.h}. Under 4K the face close-up gets soft. MAKE shows how soft before you render.</div>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn pri" data-a="tab" data-t="frame">Next: frame it</button><button class="btn ghost" data-a="picktake">Use a different take</button></div></div>` :
      `<div class="drop" id="drop" data-a="picktake" role="button" tabindex="0"><b>Drop your slate take</b><span class="dim" style="font-size:14px">One wide shot, head to toe, camera locked off.</span><span class="btn pri">Choose a take</span></div>
`}
      <div class="card" style="margin-top:14px"><b>How to shoot it</b>
        <ol class="dim" style="font-size:15px;padding-left:20px;margin:8px 0 0">
          <li>Phone on a tripod, <b>horizontal, 4K</b>, in the phone's own camera app. That gives the most picture to crop from.</li>
          <li>Stand where you're head to toe with a little room above and below. Mark the floor.</li>
          <li>Hit record, step in, look at the lens and say your slate.</li>
          <li>Hold still for a beat. Turn left and right if they ask for profiles.</li>
        </ol></div>
      <div class="kicker" style="margin-top:14px">Say this</div><div class="say">${esc(say)}</div>
      <p class="faint" style="font-size:13px">Fill in your name, height, location and rep in KIT and this updates.</p>`;
  }
  async function loadTake(f) {
    if (!f) return;
    if (S.take && S.take.url) URL.revokeObjectURL(S.take.url);
    const url = URL.createObjectURL(f);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    try {
      await once(v, 'loadedmetadata', 12000);
      let d = v.duration; if (!isFinite(d)) { v.currentTime = 1e7; await once(v, 'seeked', 5000).catch(() => { }); d = v.duration; }
      v.currentTime = Math.min(1, d * 0.2); await once(v, 'seeked', 6000);
      const c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 * v.videoHeight / v.videoWidth); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      S.take = { file: f, url, name: f.name || 'take', size: f.size, dur: +d.toFixed(3), w: v.videoWidth, h: v.videoHeight, thumb: c.toDataURL('image/jpeg', 0.7) };
      if (!S.take.w) throw new Error('no video');
    } catch (e) {
      URL.revokeObjectURL(url); S.take = null;
      toast("This browser can't play that file. iPhone HEVC plays in Safari; on Windows Chrome it needs the HEVC extension."); render(); return;
    }
    const saved = await DB.get(planKey()).catch(() => null);
    S.plan = saved && saved.face ? saved : defaultPlan(S.take.dur);
    S.plan.outT = Math.min(S.plan.outT || S.take.dur, S.take.dur);
    S.outputs.forEach(o => URL.revokeObjectURL(o.url)); S.outputs = [];
    S.tab = 'frame'; render(); window.scrollTo(0, 0);
  }

  // in-browser recorder (backup when you can't use the phone's camera app)
  async function recordHere() {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 3840 }, height: { ideal: 2160 }, facingMode: 'user' }, audio: true }); }
    catch (e) { toast('Camera and mic permission is needed to record here.'); return; }
    const tr = stream.getVideoTracks()[0], st = tr.getSettings ? tr.getSettings() : {};
    const box = document.createElement('div'); box.className = 'recbox';
    box.innerHTML = `<video playsinline muted autoplay></video><div class="prompt">${esc(E.slateScript(S.kit))}</div><div class="count"></div>
      <div class="bar"><span style="flex:1;font-size:14px" id="rstat">Camera: ${st.width || '?'}x${st.height || '?'}. Step back to head to toe, then record.</span><button class="btn" id="rcancel">Cancel</button><button class="btn pri" id="rgo">Record</button></div>`;
    document.body.appendChild(box);
    const v = box.querySelector('video'); v.srcObject = stream;
    let rec = null, chunks = [];
    const done = () => { stream.getTracks().forEach(t => t.stop()); box.remove(); };
    box.querySelector('#rcancel').onclick = () => { if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); } done(); };
    box.querySelector('#rgo').onclick = async () => {
      const b = box.querySelector('#rgo');
      if (rec && rec.state === 'recording') { rec.stop(); return; }
      b.disabled = true; const cnt = box.querySelector('.count');
      for (const n of [3, 2, 1]) { cnt.textContent = n; await sleep(800); }
      cnt.textContent = '';
      const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 16e6 } : {}); chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => { const type = (rec.mimeType || mime || 'video/webm').split(';')[0]; const f = new File(chunks, 'slate_take_' + Date.now() + (/mp4/.test(type) ? '.mp4' : '.webm'), { type }); done(); loadTake(f); };
      rec.start(500); b.disabled = false; b.textContent = 'Stop';
      const t0 = performance.now(); const tick = () => { if (rec.state !== 'recording') return; box.querySelector('#rstat').textContent = 'Recording ' + fmt((performance.now() - t0) / 1000); requestAnimationFrame(tick); }; tick();
    };
  }

  // ---------------------------------------------------------------- FRAME
  function vFrame() {
    if (!S.take) return `<p class="dim">Load a take first.</p><button class="btn pri" data-a="tab" data-t="take">Go to TAKE</button>`;
    const P = S.plan, t = S.take;
    return `<div class="kicker">Frame it</div>
      <p class="dim" style="font-size:14px;margin:0 0 8px">${P.set ? 'Adjust anything, then MAKE.' : 'Scrub to a moment where you\'re in place. Drag a box over your face, then over your whole body.'}</p>
      <div class="mode"><button class="btn face ${S.mode === 'face' ? 'on' : ''}" data-a="mode" data-v="face">Face box</button><button class="btn body ${S.mode === 'body' ? 'on' : ''}" data-a="mode" data-v="body">Body box</button></div>
      <div class="frame" id="frame" style="aspect-ratio:${t.w}/${t.h};${t.h > t.w ? 'max-width:min(100%,calc(60vh * ' + (t.w / t.h).toFixed(4) + '))' : ''}"><video id="fv" playsinline preload="auto" src="${t.url}"></video><canvas class="ov" id="ov"></canvas></div>
      <div class="tl" id="tl"><input type="range" id="scr" min="0" max="${t.dur}" step="0.01" value="0" aria-label="Scrub"><span class="g" id="gmark"></span><span class="trim" id="tin"></span><span class="trim" id="tout"></span></div>
      <div class="tcrow" style="display:flex;justify-content:space-between;font:14px var(--mono);color:var(--dim)"><span id="tnow">0:00.0</span><span>glide at ${fmt(P.glideAt)}</span><span>${fmt(t.dur)}</span></div>
      <div class="ctl" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0">
        <button class="btn" data-a="nudge" data-d="-1">-1s</button><button class="btn pri" data-a="fplay" id="fpp">Play</button><button class="btn" data-a="nudge" data-d="1">+1s</button><button class="btn" data-a="glidehere">Glide here</button>
      </div>
      <p class="faint" style="font-size:13px;margin:0 0 10px">Play it and tap <b>Glide here</b> the moment you finish your slate. Keyboard: space plays, G sets the glide.</p>
      <div class="card">
        <div class="kicker">Move</div>
        <div class="row" style="margin-bottom:8px">${[['out', 'Face → full body'], ['in', 'Full body → face']].map(([k, l]) => `<button class="chip ${P.dir === k ? 'on' : ''}" data-a="dir" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="row" style="margin-bottom:8px"><span class="dim" style="font-size:14px">Glide</span>${[1, 2, 3].map(s => `<button class="chip ${P.glide === s ? 'on' : ''}" data-a="glide" data-v="${s}">${s}s</button>`).join('')}</div>
        <div class="row" style="margin-bottom:8px">${[['medium', 'Medium (chest up)'], ['close', 'Close (face)']].map(([k, l]) => `<button class="chip ${P.shot === k ? 'on' : ''}" data-a="shot" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="row"><button class="btn sm" data-a="trimin">Start here</button><button class="btn sm" data-a="trimout">End here</button><span class="faint" style="font-size:13px">${fmt(P.inT)} to ${fmt(P.outT)}</span>${P.inT > 0 || P.outT < t.dur ? '<button class="btn sm ghost" data-a="trimreset">Use whole take</button>' : ''}</div>
      </div>
      <div class="kicker" style="margin-top:12px">Preview</div>
      <div class="row">${Object.keys(E.ASPECTS).map(a => `<button class="chip ${S.pvAspect === a ? 'on' : ''}" data-a="pva" data-v="${a}">${a}</button>`).join('')}<span id="pvsoft" style="margin-left:auto"></span></div>
      <div class="pvwrap"><canvas class="pv" id="pv"></canvas></div>
      <div class="row"><button class="btn pri big" style="flex:1" data-a="tab" data-t="make">Next: make it</button></div>`;
  }
  let fv = null, ov = null, pv = null, pvRaf = null, drag = null, roFrame = null;
  function setupFrame() {
    fv = $('#fv'); ov = $('#ov'); pv = $('#pv');
    const [ow, oh] = E.OUT['720'][S.pvAspect]; pv.width = ow; pv.height = oh;
    const r = $('#scr');
    r.addEventListener('input', () => { fv.currentTime = +r.value; });
    fv.addEventListener('loadeddata', () => { fv.currentTime = Math.max(S.plan.inT, Math.min(S.plan.glideAt + S.plan.glide + 0.5, S.take.dur - 0.1)); });
    fv.addEventListener('seeked', drawAll); fv.addEventListener('timeupdate', () => { if (fv.paused) drawAll(); });
    fv.addEventListener('play', () => { $('#fpp').textContent = 'Pause'; loopPreview(); });
    fv.addEventListener('pause', () => { $('#fpp').textContent = 'Play'; });
    const sizeOv = () => { if (!ov) return; const b = ov.getBoundingClientRect(); ov.width = Math.round(b.width * devicePixelRatio); ov.height = Math.round(b.height * devicePixelRatio); drawAll(); };
    if (roFrame) roFrame.disconnect(); roFrame = new ResizeObserver(sizeOv); roFrame.observe($('#frame')); sizeOv();
    ov.addEventListener('pointerdown', pDown); ov.addEventListener('pointermove', pMove); ov.addEventListener('pointerup', pUp); ov.addEventListener('pointercancel', pUp);
    marks();
    const v = E.softness(S.plan, S.take.w, S.take.h, S.pvAspect, S.res);
    $('#pvsoft').innerHTML = `<span class="verdict ${v.verdict}">${v.verdict}</span>`;
  }
  function marks() {
    const P = S.plan, d = S.take.dur, g = $('#gmark');
    if (g) { g.style.left = (P.glideAt / d * 100) + '%'; g.style.width = Math.max(0.8, P.glide / d * 100) + '%'; }
    if ($('#tin')) $('#tin').style.left = (P.inT / d * 100) + '%';
    if ($('#tout')) $('#tout').style.left = 'calc(' + (P.outT / d * 100) + '% - 2px)';
  }
  const norm = e => { const b = ov.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)) }; };
  function pDown(e) {
    ov.setPointerCapture(e.pointerId); const p = norm(e), box = S.plan[S.mode];
    const drawn = (S.plan.drawn || {})[S.mode];
    const cx = Math.max(0.025, box.w * 0.22), cy = Math.max(0.025, box.h * 0.22);
    const nearL = Math.abs(p.x - box.x) < cx, nearR = Math.abs(p.x - (box.x + box.w)) < cx, nearT = Math.abs(p.y - box.y) < cy, nearB = Math.abs(p.y - (box.y + box.h)) < cy;
    const inside = p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h;
    if (drawn && (nearL || nearR) && (nearT || nearB)) drag = { kind: 'draw', sx: nearL ? box.x + box.w : box.x, sy: nearT ? box.y + box.h : box.y }; // grab a corner: resize from the opposite one
    else if (drawn && inside) drag = { kind: 'move', ox: p.x - box.x, oy: p.y - box.y };
    else drag = { kind: 'draw', sx: p.x, sy: p.y };
  }
  function pMove(e) {
    if (!drag) return; const p = norm(e), box = S.plan[S.mode];
    if (drag.kind === 'move') { box.x = Math.max(0, Math.min(1 - box.w, p.x - drag.ox)); box.y = Math.max(0, Math.min(1 - box.h, p.y - drag.oy)); }
    else { box.x = Math.min(drag.sx, p.x); box.y = Math.min(drag.sy, p.y); box.w = Math.max(0.01, Math.abs(p.x - drag.sx)); box.h = Math.max(0.01, Math.abs(p.y - drag.sy)); }
    drawAll();
  }
  function pUp() {
    if (!drag) return; drag = null;
    const b = S.plan[S.mode]; if (b.w < 0.02 || b.h < 0.02) { b.w = Math.max(b.w, 0.06); b.h = Math.max(b.h, 0.08); }
    S.plan.drawn = Object.assign({}, S.plan.drawn, { [S.mode]: true });
    if (S.mode === 'face' && !S.plan.drawn.body) { S.mode = 'body'; toast('Now drag a box over your whole body.'); document.querySelectorAll('.mode .btn').forEach(x => x.classList.toggle('on', x.dataset.v === 'body')); }
    else S.plan.set = true;
    saveSoon(); drawAll();
    const v = E.softness(S.plan, S.take.w, S.take.h, S.pvAspect, S.res); if ($('#pvsoft')) $('#pvsoft').innerHTML = `<span class="verdict ${v.verdict}">${v.verdict}</span>`;
  }
  function drawAll() { drawOverlay(); drawPreview(); const r = $('#scr'), t = $('#tnow'); if (r && fv) { r.value = fv.currentTime; t.textContent = fmt(fv.currentTime); } }
  function drawOverlay() {
    if (!ov) return; const g = ov.getContext('2d'), W = ov.width, H = ov.height; g.clearRect(0, 0, W, H);
    const P = S.plan, dpr = devicePixelRatio;
    // where the virtual camera is right now (for the preview shape)
    if (fv && S.take) {
      const r = E.windowAt(fv.currentTime, P, S.take.w, S.take.h, S.pvAspect);
      g.setLineDash([8 * dpr, 6 * dpr]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2 * dpr;
      g.strokeRect(r.x / S.take.w * W, r.y / S.take.h * H, r.w / S.take.w * W, r.h / S.take.h * H); g.setLineDash([]);
    }
    [['body', '#8fbf8a', 'BODY'], ['face', '#e0a23c', 'FACE']].forEach(([k, col, lab]) => {
      const b = P[k]; g.strokeStyle = col; g.lineWidth = (S.mode === k ? 3.5 : 2) * dpr; g.strokeRect(b.x * W, b.y * H, b.w * W, b.h * H);
      g.fillStyle = col; g.font = `600 ${12 * dpr}px Jost, sans-serif`;
      if (k === 'body') g.fillText(lab, b.x * W + 4 * dpr, (b.y + b.h) * H - 6 * dpr); // body label sits at the feet, face label above the head
      else g.fillText(lab, b.x * W + 4 * dpr, b.y * H - 5 * dpr < 12 * dpr ? b.y * H + 14 * dpr : b.y * H - 5 * dpr);
    });
  }
  function drawPreview() {
    if (!pv || !fv || fv.readyState < 2) return;
    const g = pv.getContext('2d'), r = E.windowAt(fv.currentTime, S.plan, S.take.w, S.take.h, S.pvAspect);
    g.fillStyle = '#000'; g.fillRect(0, 0, pv.width, pv.height);
    const a = E.drawArgs(r, S.take.w, S.take.h, pv.width, pv.height); if (a) g.drawImage(fv, ...a);
  }
  function loopPreview() { cancelAnimationFrame(pvRaf); const f = () => { drawAll(); if (fv && !fv.paused) pvRaf = requestAnimationFrame(f); }; pvRaf = requestAnimationFrame(f); }
  function stopPreview() { if (roFrame) { roFrame.disconnect(); roFrame = null; } cancelAnimationFrame(pvRaf); if (fv) { try { fv.pause(); } catch (e) { } } fv = null; ov = null; pv = null; }

  // ---------------------------------------------------------------- MAKE
  function vMake() {
    if (!S.take) return `<p class="dim">Load a take first.</p><button class="btn pri" data-a="tab" data-t="take">Go to TAKE</button>`;
    const sel = Object.keys(S.outs).filter(k => S.outs[k]);
    const len = (S.plan.outT - S.plan.inT) + (S.card ? 2 : 0);
    return `<div class="kicker">Make it</div><h1 style="font-size:24px;margin-bottom:10px">Every shape from one take</h1>
      <div class="card">
        <div class="kicker">Shapes</div>
        ${Object.keys(E.ASPECTS).map(a => { const v = E.softness(S.plan, S.take.w, S.take.h, a, S.res);
          return `<div class="row" style="justify-content:space-between;min-height:52px;border-bottom:1px solid var(--line)">
            <button class="flag ${S.outs[a] ? 'on' : ''}" data-a="out" data-v="${a}" style="min-width:110px">${a} ${a === '16:9' ? 'casting' : a === '9:16' ? 'vertical' : 'square'}</button>
            <span style="font-size:13px;text-align:right"><span class="verdict ${v.verdict}">${v.verdict}</span> <span class="faint">${S.plan.shot} shot: ${v.faceSourcePx}px real for ${v.outPx}p${v.barsBody || v.barsFace ? ' · bars on the sides' : ''}</span></span></div>`; }).join('')}
        ${sel.some(a => E.softness(S.plan, S.take.w, S.take.h, a, S.res).verdict === 'soft') ? `<p class="msg" style="font-size:14px">Soft means the close-up is being blown up from too little picture. Fixes: ${[S.plan.shot === 'close' ? 'switch to the Medium shot in FRAME' : '', S.res === '1080' ? 'make it at 720p' : '', S.take.w * S.take.h < 3840 * 2160 * 0.9 ? 'shoot 4K' : '', 'stand a little closer to the camera (still head to toe)'].filter(Boolean).join(', ')}.</p>` : ''}
        ${sel.some(a => { const v = E.softness(S.plan, S.take.w, S.take.h, a, S.res); return v.barsBody || v.barsFace; }) ? `<p class="msg" style="font-size:14px">Bars: full body in this shape needs more picture than the take has, so it's centred with bars. Shoot ${S.take.w < S.take.h ? 'horizontal' : 'vertical'} for this shape.</p>` : ''}
        <div class="row" style="margin-top:10px"><span class="dim" style="font-size:14px">Size</span>${['1080', '720'].map(r => `<button class="chip ${S.res === r ? 'on' : ''}" data-a="res" data-v="${r}">${r}p</button>`).join('')}</div>
      </div>
      <div class="card"><div class="kicker">Extras (off by default, casting usually wants it clean)</div>
        <div class="row"><button class="flag ${S.card ? 'on' : ''}" data-a="xcard">Slate card first (2s)</button><button class="flag ${S.lower ? 'on' : ''}" data-a="xlower">Name on screen while you slate</button></div>
        ${(S.card || S.lower) && !S.kit.name ? '<p class="faint" style="font-size:13px">Add your name in KIT.</p>' : ''}</div>
      <button class="btn pri big block" data-a="make" ${sel.length ? '' : 'disabled'}>Make ${sel.length} ${sel.length === 1 ? 'file' : 'files'}</button>
      <p class="faint" style="font-size:13px;text-align:center">One pass, in real time: about ${fmt(len + 2)}. Keep this screen open.</p>
      <div id="outs">${S.outputs.map(o => outCard(o)).join('')}</div>`;
  }
  function outCard(o) {
    const h264 = /H\.264/.test(o.codec);
    return `<div class="out"><div class="row" style="justify-content:space-between;margin-bottom:6px"><b>${o.aspect} · ${o.w}x${o.h}</b><span class="faint" style="font-size:13px">${(o.blob.size / 1048576).toFixed(1)} MB · ${esc(o.codec || o.mime)}</span></div>
      <video src="${o.url}" controls playsinline></video>
      ${h264 ? '' : `<p class="faint" style="font-size:13px;margin:6px 0 0">Made as ${esc(o.codec || 'an unknown codec')}, not H.264: fine in Chrome and editors, not in QuickTime or iPhone Photos.</p>`}
      <div class="row" style="margin-top:8px"><button class="btn pri" data-a="saveout" data-v="${o.aspect}">${isPhone() && navigator.canShare ? 'Save or share' : 'Download'}</button></div></div>`;
  }
  async function sniffCodec(blob) {
    const n = Math.min(blob.size, 2 * 1048576), parts = [blob.slice(0, n), blob.slice(Math.max(0, blob.size - n))]; let t = '';
    for (const p of parts) { const b = new Uint8Array(await p.arrayBuffer()); for (let i = 0; i < b.length; i++) t += (b[i] > 31 && b[i] < 127) ? String.fromCharCode(b[i]) : '.'; }
    return /avc1|avc3|V_MPEG4\/ISO\/AVC/.test(t) ? 'H.264' : /hvc1|hev1/.test(t) ? 'HEVC' : /vp09|V_VP9/.test(t) ? 'VP9' : /vp08|V_VP8/.test(t) ? 'VP8' : /av01|V_AV1/.test(t) ? 'AV1' : '';
  }
  function drawCard(g, W, H) {
    const k = S.kit; g.fillStyle = '#121110'; g.fillRect(0, 0, W, H);
    const u = Math.min(W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ece7dc'; g.font = `600 ${Math.round(u * 0.085)}px Jost, system-ui, sans-serif`; g.fillText((k.name || 'YOUR NAME').toUpperCase(), W / 2, H * 0.4);
    g.fillStyle = '#e0a23c'; g.fillRect(W / 2 - u * 0.07, H * 0.47, u * 0.14, Math.max(2, u * 0.006));
    g.fillStyle = '#a39c8e'; g.font = `400 ${Math.round(u * 0.042)}px Jost, system-ui, sans-serif`;
    const lines = [[k.role && 'for ' + k.role, k.project].filter(Boolean).join(' · '), [k.height, k.location].filter(Boolean).join(' · '), k.rep].filter(Boolean);
    lines.forEach((l, i) => g.fillText(l, W / 2, H * (0.56 + i * 0.07)));
  }
  function drawLower(g, W, H) {
    const k = S.kit; if (!k.name) return; const u = Math.min(W, H);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, H - u * 0.17, W, u * 0.17);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = `600 ${Math.round(u * 0.05)}px Jost, system-ui, sans-serif`;
    g.fillText(k.name, u * 0.05, H - u * 0.09);
    g.fillStyle = '#e0a23c'; g.font = `400 ${Math.round(u * 0.032)}px Jost, system-ui, sans-serif`;
    g.fillText([k.height, k.location, k.rep].filter(Boolean).join(' · '), u * 0.05, H - u * 0.04);
  }
  async function make() {
    const P = S.plan, T = S.take, aspects = Object.keys(S.outs).filter(k => S.outs[k]);
    try { await document.fonts.load('600 64px Jost'); } catch (e) { }
    const v = document.createElement('video'); v.playsInline = true; v.preload = 'auto'; v.src = T.url;
    v.play().then(() => v.pause()).catch(() => { }); // unlock inside the tap
    let ac = null, dest = null;
    try { const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); ac.resume(); const src = ac.createMediaElementSource(v); dest = ac.createMediaStreamDestination(); src.connect(dest); } catch (e) { ac = null; }
    const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
    const rigs = aspects.map(a => {
      const [w, h] = E.OUT[S.res][a]; const c = document.createElement('canvas'); c.width = w; c.height = h;
      const st = c.captureStream(30); if (dest) dest.stream.getAudioTracks().forEach(t => st.addTrack(t.clone()));
      const rec = new MediaRecorder(st, mime ? { mimeType: mime, videoBitsPerSecond: S.res === '1080' ? 8e6 : 5e6 } : {});
      const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      return { a, w, h, c, g: c.getContext('2d'), rec, chunks };
    });
    const box = document.createElement('div'); box.className = 'player';
    box.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:12px" id="mkv"></div><div class="bar"><span style="flex:1" id="mks">Making ${rigs.length} ${rigs.length === 1 ? 'file' : 'files'}. Keep this screen open.</span><button class="btn" id="mkx">Cancel</button></div>`;
    const show = rigs[0].c; show.style.cssText = 'max-width:100%;max-height:100%;background:#000'; box.firstChild.appendChild(show);
    document.body.appendChild(box);
    let stop = false; box.querySelector('#mkx').onclick = () => { stop = true; };
    let wl = null; try { wl = await navigator.wakeLock.request('screen'); } catch (e) { }
    const all = fn => rigs.forEach(fn);
    const drawFrame = t => all(R => { R.g.fillStyle = '#000'; R.g.fillRect(0, 0, R.w, R.h); const a = E.drawArgs(E.windowAt(t, P, T.w, T.h, R.a), T.w, T.h, R.w, R.h); if (a) R.g.drawImage(v, ...a); if (S.lower && t < P.glideAt) drawLower(R.g, R.w, R.h); });
    try {
      all(R => { R.rec.start(500); R.rec.pause(); });
      await once(v, 'loadeddata', 15000).catch(() => { });
      if (S.card) {
        all(R => drawCard(R.g, R.w, R.h)); await sleep(60); all(R => R.rec.resume());
        const t0 = performance.now(); while (performance.now() - t0 < 2000 && !stop) { all(R => drawCard(R.g, R.w, R.h)); await sleep(33); }
        all(R => R.rec.pause());
      }
      v.currentTime = P.inT; await once(v, 'seeked', 10000);
      drawFrame(P.inT); await sleep(40); all(R => R.rec.resume());
      await v.play();
      await new Promise(res => {
        const useVFC = 'requestVideoFrameCallback' in v;
        let done = false; const fin = () => { if (!done) { done = true; res(); } };
        v.addEventListener('ended', fin, { once: true }); // the last frame never fires a frame callback
        const guard = setInterval(() => { if (stop || v.ended || v.currentTime >= P.outT - 0.01) { clearInterval(guard); fin(); } }, 100);
        const step = (now, meta) => {
          if (done) return;
          const t = meta && meta.mediaTime !== undefined ? meta.mediaTime : v.currentTime;
          if (stop || v.ended || t >= P.outT - 0.01) { clearInterval(guard); return fin(); }
          drawFrame(t);
          const s = box.querySelector('#mks'); if (s) s.textContent = `Making ${rigs.length} ${rigs.length === 1 ? 'file' : 'files'}: ${fmt(t - P.inT)} of ${fmt(P.outT - P.inT)}. Keep this screen open.`;
          if (useVFC) v.requestVideoFrameCallback(step); else requestAnimationFrame(() => step());
        };
        if (useVFC) v.requestVideoFrameCallback(step); else requestAnimationFrame(() => step());
      });
      v.pause();
    } catch (e) { toast('Could not make it: ' + e.message); stop = true; }
    const outs = await Promise.all(rigs.map(R => new Promise(res => { R.rec.onstop = () => res(R); if (R.rec.state === 'paused') R.rec.resume(); if (R.rec.state !== 'inactive') R.rec.stop(); else res(R); })));
    try { wl && wl.release(); } catch (e) { } try { ac && ac.close(); } catch (e) { }
    v.removeAttribute('src'); box.remove();
    if (stop) { toast('Cancelled.'); return; }
    S.outputs.forEach(o => URL.revokeObjectURL(o.url)); S.outputs = [];
    const label = E.takeLabel(S.kit);
    for (const R of outs) {
      const used = R.rec.mimeType || mime || 'video/webm', type = used.split(';')[0];
      const blob = new Blob(R.chunks, { type }); const codec = await sniffCodec(blob).catch(() => '');
      S.outputs.push({ aspect: R.a, w: R.w, h: R.h, blob, mime: used, codec, url: URL.createObjectURL(blob), name: label + '_slate_' + R.a.replace(':', 'x') + (/mp4/.test(type) ? '.mp4' : '.webm') });
    }
    render(); const o = $('#outs'); if (o) o.scrollIntoView({ block: 'start' });
    toast('Made ' + S.outputs.length + (S.outputs.length === 1 ? ' file.' : ' files.'));
  }

  // ---------------------------------------------------------------- KIT
  function vKit() {
    const k = S.kit;
    const f = (id, label, ph) => `<label class="lab" for="k_${id}">${label}</label><input class="field" id="k_${id}" data-f="${id}" value="${esc(k[id])}" placeholder="${esc(ph)}">`;
    return `<div class="kicker">Slate kit</div><h1 style="font-size:24px;margin-bottom:10px">Everything that goes with the slate</h1>
      <div class="card"><div id="kcheck">${checkHtml()}</div>
        <button class="btn pri block" style="margin-top:10px" data-a="zip">Build kit (.zip)</button></div>
      <div class="card"><b>You</b><p class="faint" style="font-size:13px;margin:2px 0 0">Kept on this device for next time.</p>
        ${f('name', 'Name', 'Your name')}${f('height', 'Height', "e.g. 6'1\"")}${f('location', 'Based in', 'City')}${f('rep', 'Rep', 'Agency or manager')}
        <label class="lab" for="k_links">Links (one per line)</label><textarea class="field" id="k_links" data-f="links" style="min-height:80px" placeholder="IMDb, reel, site">${esc(k.links)}</textarea>
        <div class="row" style="margin-top:12px"><button class="btn" data-a="headshot">${S.headshot ? 'Headshot: ' + esc(S.headshot.name) : 'Add headshot'}</button><button class="btn" data-a="resume">${S.resume ? 'Résumé: ' + esc(S.resume.name) : 'Add résumé'}</button></div>
        ${S.headshot ? `<img src="${S.headshot.url}" alt="" style="max-width:140px;border-radius:8px;margin-top:8px">` : ''}</div>
      <div class="card"><b>This submission</b> <span class="faint" style="font-size:13px">(optional, names the files)</span>
        ${f('project', 'Project', 'Title')}${f('role', 'Role', 'Character')}<div class="row" style="gap:10px;flex-wrap:nowrap"><div style="flex:1">${f('take', 'Take', '1')}</div><div style="flex:1">${f('date', 'Date', today())}</div></div></div>
      <div class="card"><b>Slate card</b>
        <div class="row" style="margin:8px 0">${Object.keys(E.ASPECTS).map(a => `<button class="chip ${S.cardAspect === a ? 'on' : ''}" data-a="cardasp" data-v="${a}">${a}</button>`).join('')}</div>
        <div class="pvwrap"><canvas class="pv" id="kcard"></canvas></div>
        <button class="btn" data-a="savecard">Save card (.png)</button></div>
      <div class="kicker">Say this</div><div class="say">${esc(E.slateScript(k))}</div>
      <p class="faint" style="font-size:12px;margin-top:16px">SLATE MAKER ${VERSION}</p>`;
  }
  function checkHtml() {
    const k = S.kit, ck = E.checklist({ name: k.name, videos: S.outputs.length, headshot: !!S.headshot, resume: !!S.resume, links: k.links });
    return ck.items.map(([n, y]) => `<div class="check"><i class="${y ? 'y' : 'n'}">${y ? '✓' : ''}</i>${esc(n)}</div>`).join('') +
      (ck.missing.length ? `<p class="faint" style="font-size:13px;margin:6px 0 0">Missing: ${esc(ck.missing.join(', '))}.</p>` : '<p class="faint" style="font-size:13px;margin:6px 0 0">Complete.</p>');
  }
  function drawKitCard() { const c = $('#kcard'); if (!c) return; const [w, h] = E.OUT['720'][S.cardAspect]; c.width = w; c.height = h; drawCard(c.getContext('2d'), w, h); }
  async function cardBlob(aspect) { const [w, h] = E.OUT['1080'][aspect]; const c = document.createElement('canvas'); c.width = w; c.height = h; try { await document.fonts.load('600 64px Jost'); } catch (e) { } drawCard(c.getContext('2d'), w, h); return new Promise(r => c.toBlob(r, 'image/png')); }
  async function sha(bytes) { try { const d = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(d), x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return null; } }
  async function buildZip() {
    const k = S.kit, label = E.takeLabel(k), entries = [], files = [];
    const add = async (name, blob) => { const b = new Uint8Array(await blob.arrayBuffer()); entries.push({ name: label + '/' + name, bytes: b }); files.push({ name, bytes: b.length, sha256: await sha(b) }); };
    for (const o of S.outputs) await add(o.name, o.blob);
    const aspects = S.outputs.length ? S.outputs.map(o => o.aspect) : [S.cardAspect];
    for (const a of aspects) await add('slate_card_' + a.replace(':', 'x') + '.png', await cardBlob(a));
    if (S.headshot) await add('headshot_' + S.headshot.name, S.headshot.blob);
    if (S.resume) await add('resume_' + S.resume.name, S.resume.blob);
    if (k.links.trim()) await add('links.txt', new Blob([k.links.trim() + '\n']));
    const kit = { schema: 'ACT.SLATE/0.4', app: 'SLATE MAKER ' + VERSION, made: new Date().toISOString(), you: { name: k.name, height: k.height, location: k.location, rep: k.rep }, submission: { project: k.project, role: k.role, take: k.take, date: k.date }, script: E.slateScript(k), move: S.take ? { take: S.take.name, size: [S.take.w, S.take.h], plan: S.plan } : null, missing: E.checklist({ name: k.name, videos: S.outputs.length, headshot: !!S.headshot, resume: !!S.resume, links: k.links }).missing, files };
    entries.push({ name: label + '/kit.json', bytes: E.enc(JSON.stringify(kit, null, 2)) });
    deliver(new Blob([E.makeZip(entries)], { type: 'application/zip' }), label + '_slate_kit.zip');
  }
  async function deliver(blob, name) {
    try { const f = new File([blob], name, { type: blob.type }); if (isPhone() && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ---------------------------------------------------------------- actions
  async function act(a, ds) {
    ds = ds || {};
    const P = S.plan;
    switch (a) {
      case 'tab': S.tab = ds.t; render(); window.scrollTo(0, 0); break;
      case 'theme': { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); const nx = cur === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('slate_theme', nx); } catch (e) { } break; }
      case 'picktake': $('#takein').click(); break;
      case 'shoot': $('#shootin').click(); break;
      case 'recordhere': recordHere(); break;
      case 'mode': S.mode = ds.v; document.querySelectorAll('.mode .btn').forEach(x => x.classList.toggle('on', x.dataset.v === ds.v)); drawOverlay(); break;
      case 'fplay': if (!fv) break; if (fv.paused) { if (fv.currentTime >= P.outT - 0.05) fv.currentTime = P.inT; fv.play(); } else fv.pause(); break;
      case 'nudge': if (fv) { fv.pause(); fv.currentTime = Math.max(0, Math.min(S.take.dur, fv.currentTime + (+ds.d))); } break;
      case 'glidehere': if (!fv) break; P.glideAt = +fv.currentTime.toFixed(2); P.set = true; saveSoon(); marks(); drawAll(); const tc = document.querySelector('.tcrow span:nth-child(2)'); if (tc) tc.textContent = 'glide at ' + fmt(P.glideAt); toast('Glide starts at ' + fmt(P.glideAt) + '.'); break;
      case 'dir': P.dir = ds.v; saveSoon(); keepFrame(); break;
      case 'glide': P.glide = +ds.v; saveSoon(); keepFrame(); break;
      case 'shot': P.shot = ds.v; saveSoon(); keepFrame(); break;
      case 'trimin': if (fv) { P.inT = +fv.currentTime.toFixed(2); if (P.outT <= P.inT) P.outT = S.take.dur; saveSoon(); keepFrame(); } break;
      case 'trimout': if (fv) { P.outT = +fv.currentTime.toFixed(2); if (P.outT <= P.inT) P.inT = 0; saveSoon(); keepFrame(); } break;
      case 'trimreset': P.inT = 0; P.outT = S.take.dur; saveSoon(); keepFrame(); break;
      case 'pva': S.pvAspect = ds.v; keepFrame(); break;
      case 'out': S.outs[ds.v] = !S.outs[ds.v]; render(); break;
      case 'res': S.res = ds.v; render(); break;
      case 'xcard': S.card = !S.card; render(); break;
      case 'xlower': S.lower = !S.lower; render(); break;
      case 'make': make(); break;
      case 'saveout': { const o = S.outputs.find(x => x.aspect === ds.v); if (o) deliver(o.blob, o.name); break; }
      case 'headshot': $('#headin').click(); break;
      case 'resume': $('#resin').click(); break;
      case 'cardasp': S.cardAspect = ds.v; render(); break;
      case 'savecard': deliver(await cardBlob(S.cardAspect), E.takeLabel(S.kit) + '_slate_card_' + S.cardAspect.replace(':', 'x') + '.png'); break;
      case 'zip': buildZip(); break;
    }
  }
  function keepFrame() { const t = fv ? fv.currentTime : 0; render(); const v = $('#fv'); if (v) once(v, 'loadeddata').then(() => { v.currentTime = t; }); }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; e.preventDefault(); act(t.dataset.a, Object.assign({}, t.dataset)); });
  document.addEventListener('input', e => { const f = e.target.closest('[data-f]'); if (!f) return; S.kit[f.dataset.f] = f.value; saveSoon(); if (S.tab === 'kit') kitLive(); });
  function kitLive() {
    drawKitCard(); const s = document.querySelector('.say'); if (s) s.textContent = E.slateScript(S.kit);
    const c = document.querySelector('#kcheck'); if (c) c.innerHTML = checkHtml();
    const t = document.querySelector('.top .title span'); if (t) t.textContent = S.kit.name || 'One take. Face to full body. Every shape.';
  }
  document.addEventListener('keydown', e => {
    if (S.tab !== 'frame' || !fv || /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName)) return;
    if (e.key === ' ') { e.preventDefault(); act('fplay'); } else if (e.key.toLowerCase() === 'g') act('glidehere');
    else if (e.key === 'ArrowLeft') { e.preventDefault(); act('nudge', { d: -1 / 30 }); } else if (e.key === 'ArrowRight') { e.preventDefault(); act('nudge', { d: 1 / 30 }); }
  });
  $('#takein').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadTake(f); });
  $('#shootin').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadTake(f); });
  $('#headin').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (S.headshot) URL.revokeObjectURL(S.headshot.url); S.headshot = { name: f.name, blob: f, url: URL.createObjectURL(f) }; DB.put('headshot', { name: f.name, blob: f }); render(); });
  $('#resin').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; S.resume = { name: f.name, blob: f }; DB.put('resume', { name: f.name, blob: f }); render(); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { if (!e.target.closest('#drop')) e.preventDefault(); });

  // ---------------------------------------------------------------- boot
  (async function boot() {
    try { const th = localStorage.getItem('slate_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
    try { const k = await DB.get('kit'); if (k) S.kit = Object.assign(S.kit, k, { date: today() }); } catch (e) { }
    try { const h = await DB.get('headshot'); if (h && h.blob) S.headshot = { name: h.name, blob: h.blob, url: URL.createObjectURL(h.blob) }; } catch (e) { }
    try { const r = await DB.get('resume'); if (r && r.blob) S.resume = r; } catch (e) { }
    // your profile (../shared/you.js): only the kit's blanks, and your main headshot if there's none
    try { const Y = window.You; if (Y && Y.has()) { const y = Y.get(), got = [];
      const map = { name: y.name, height: y.height, location: y.locations, rep: [y.rep, y.repPhone].filter(Boolean).join(' · ') };
      Object.keys(map).forEach(k => { if (map[k] && !S.kit[k]) { S.kit[k] = map[k]; got.push(k); } });
      if (!S.headshot && y.primary) { const b = await Y.photoBlob(y.primary); if (b) { const nm = (y.photos.find(p => p.id === y.primary) || {}).name || 'headshot.jpg'; S.headshot = { name: nm, blob: b, url: URL.createObjectURL(b) }; DB.put('headshot', { name: nm, blob: b }); got.push('headshot'); } }
      if (got.length) { DB.put('kit', S.kit); } } } catch (e) { }
    render();
    window.SLATE = { S, act, E, loadTake, version: VERSION };
  })();
})();
