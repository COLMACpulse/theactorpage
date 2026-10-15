/* STORY STUDIO: play the cut, and make it into one video file, in this browser.
   The sequencer is ARCHBOOK's (proven there: order, cuts within a frame, sound in sync), without the name cards.
   seq: [{url, in, out, label, adr?:{buffer, at, under}}] in seconds; adr = your re-recorded line starting at clip time `at`, original sound at `under` (0..1). Nothing leaves the device. */
(function (g) {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const once = (el, ev, ms) => new Promise((res, rej) => {
    let t; const on = () => { clearTimeout(t); el.removeEventListener(ev, on); el.removeEventListener('error', er); res(); };
    const er = () => { clearTimeout(t); el.removeEventListener(ev, on); el.removeEventListener('error', er); rej(new Error('this browser could not open that clip')); };
    el.addEventListener(ev, on); el.addEventListener('error', er);
    if (ms) t = setTimeout(() => { el.removeEventListener(ev, on); el.removeEventListener('error', er); rej(new Error('a clip took too long to open')); }, ms);
  });
  function fit(ctx, src, sw, sh, W, H) { if (!sw || !sh) return; const r = Math.min(W / sw, H / sh), dw = sw * r, dh = sh * r; ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh); }
  function mimePick() {
    const list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find(t => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
  }
  async function runSequence(seq, opts, video, kit) {
    kit = kit || {};
    const cv = opts.canvas, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    let live = false, alive = true, held = false, cur = null;
    if (opts.ctl) {
      opts.ctl.where = () => cur ? { i: cur.i, it: cur.it, t: video.currentTime } : null;
      opts.ctl.hold = () => { if (held || !cur) return false; held = true; video.pause(); if (cur.adr) { try { cur.adr.stop(); } catch (e) { } cur.adr = null; } return true; };
      opts.ctl.go = () => { if (!held) return; held = false; if (!cur) return; video.play().catch(() => { }); startAdr(cur); };
    }
    const startAdr = c => { const it = c.it; if (!it.adr || !kit.ac) return; try { const a = kit.ac.createBufferSource(); a.buffer = it.adr.buffer; const ag = kit.ac.createGain(); a.connect(ag); kit.outs.forEach(o => ag.connect(o));
        const from = video.currentTime - it.adr.at; if (from >= 0) { if (from < a.buffer.duration) a.start(0, from); } else a.start(kit.ac.currentTime - from); c.adr = a; } catch (e) { c.adr = null; } };
    const draw = () => { if (!alive) return; if (live && video.readyState >= 2) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); fit(ctx, video, video.videoWidth, video.videoHeight, W, H); } requestAnimationFrame(draw); };
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); requestAnimationFrame(draw);
    let rec = null, chunks = [], mime = '';
    if (opts.record) {
      const stream = cv.captureStream(30);
      if (opts.dest) opts.dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      mime = mimePick();
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6, audioBitsPerSecond: 160000 } : {});
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(500); rec.pause();
      if (rec.mimeType) mime = rec.mimeType;
    }
    const pause = () => { if (rec && rec.state === 'recording') rec.pause(); };
    const resume = () => { if (rec && rec.state === 'paused') rec.resume(); };
    try {
      for (let i = 0; i < seq.length; i++) {
        if (opts.stop.v) break;
        const it = seq[i]; opts.onStep && opts.onStep(i, seq.length, it);
        pause();
        if (video.src !== it.url) { video.src = it.url; await once(video, 'loadeddata', 15000); }
        video.currentTime = it.in; await once(video, 'seeked', 10000);
        live = true; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); fit(ctx, video, video.videoWidth, video.videoHeight, W, H);
        await sleep(30); // let the in-frame land before recording resumes
        if (kit.vg) kit.vg.gain.value = it.adr ? it.adr.under : 1;
        resume();
        await video.play();
        cur = { i, it, adr: null }; startAdr(cur);
        await new Promise(res => { const chk = () => { if (opts.stop.v || (!held && (video.ended || video.currentTime >= it.out - 0.012))) return res(); requestAnimationFrame(chk); }; requestAnimationFrame(chk); });
        video.pause(); pause(); if (cur.adr) { try { cur.adr.stop(); } catch (e) { } } cur = null; held = false;
      }
    } finally { alive = false; }
    if (!rec) return null;
    const done = new Promise(res => { rec.onstop = res; });
    if (rec.state === 'paused') rec.resume();
    rec.stop(); await done;
    return { blob: new Blob(chunks, { type: (mime || 'video/webm').split(';')[0] }), mime: mime || 'video/webm' };
  }
  // one video element + one audio graph per run, made inside the tap so phones allow sound
  function mediaKit(record, audible) {
    const video = document.createElement('video'); video.playsInline = true; video.preload = 'auto';
    let ac = null, dest = null, vg = null; const outs = [];
    try { const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); ac.resume(); const src = ac.createMediaElementSource(video); vg = ac.createGain(); src.connect(vg);
      if (record) { dest = ac.createMediaStreamDestination(); outs.push(dest); } if (audible) outs.push(ac.destination); outs.forEach(o => vg.connect(o)); }
    catch (e) { ac = null; vg = null; video.muted = !audible; }
    return { video, ac, dest, vg, outs };
  }
  function shell(text, btn, note) {
    const box = document.createElement('div'); box.className = 'player';
    box.innerHTML = '<div class="pview"></div>' + (note ? '<div class="pnote hide"><div class="pnwhere" id="pnwhere"></div><input class="field" id="pntext" placeholder="Too much setup. Get to the bus sooner." autocomplete="off"><div class="row"><button class="btn pri" id="pnsave">SAVE NOTE</button><button class="btn" id="pncancel">BACK TO THE CUT</button></div></div>' : '') + '<div class="bar"><span id="pstep">' + text + '</span>' + (note ? '<button class="btn" id="pnotebtn">NOTE</button>' : '') + '<button class="btn" id="pstop">' + btn + '</button></div>';
    document.body.appendChild(box); return box;
  }
  // opts.onNote(i, item, secondsIntoFile, text): NOTE pauses the cut and pins what you type to the piece on screen
  async function play(seq, opts) {
    opts = opts || {};
    const kit = mediaKit(false, true);
    if (seq[0]) { kit.video.src = seq[0].url; kit.video.play().then(() => kit.video.pause()).catch(() => { }); } // unlock sound on phones
    const box = shell('Playing the cut', 'STOP', !!opts.onNote), cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; box.firstChild.appendChild(cv);
    const stop = { v: false }, ctl = {}, q = s => box.querySelector(s); let step = '', pend = null;
    const back = () => { q('.pnote').classList.add('hide'); pend = null; ctl.go && ctl.go(); };
    const keep = () => { const tx = q('#pntext').value.trim(); if (pend && tx) { try { opts.onNote(pend.i, pend.it, pend.t, tx); } catch (e) { } q('#pstep').textContent = 'Noted on ' + pend.it.label; setTimeout(() => { const s = q('#pstep'); if (s && /^Noted/.test(s.textContent)) s.textContent = step; }, 2500); } back(); };
    q('#pstop').onclick = () => { if (pend) keep(); stop.v = true; ctl.go && ctl.go(); };
    if (opts.onNote) {
      q('#pnotebtn').onclick = () => { if (pend) return; const w = ctl.where && ctl.where(); if (!w || !ctl.hold()) return; pend = w; const m = Math.floor(w.t / 60), s = w.t - m * 60;
        q('#pnwhere').textContent = 'Note on ' + w.it.label + ', at ' + m + ':' + (s < 10 ? '0' : '') + s.toFixed(1) + ' in the take'; q('#pntext').value = ''; q('.pnote').classList.remove('hide'); q('#pntext').focus(); };
      q('#pnsave').onclick = keep; q('#pncancel').onclick = back;
      q('#pntext').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); keep(); } else if (e.key === 'Escape') { e.preventDefault(); back(); } };
    }
    let err = null;
    try { await runSequence(seq, { canvas: cv, stop, ctl, onStep: (i, n, it) => { step = (i + 1) + ' of ' + n + ' · ' + it.label; const s = q('#pstep'); if (s) s.textContent = step; } }, kit.video, kit); }
    catch (e) { err = e; }
    kit.video.pause(); kit.video.removeAttribute('src'); try { kit.ac && kit.ac.close(); } catch (e) { }
    box.remove(); if (err) throw err; return !stop.v;
  }
  async function sniffCodec(blob) {
    const n = Math.min(blob.size, 2 * 1048576), parts = [blob.slice(0, n), blob.slice(Math.max(0, blob.size - n))]; let txt = '';
    for (const p of parts) { const b = new Uint8Array(await p.arrayBuffer()); for (let i = 0; i < b.length; i++) txt += (b[i] > 31 && b[i] < 127) ? String.fromCharCode(b[i]) : '.'; }
    if (/avc1|avc3|V_MPEG4\/ISO\/AVC/.test(txt)) return 'H.264'; if (/hvc1|hev1/.test(txt)) return 'HEVC'; if (/vp09|V_VP9/.test(txt)) return 'VP9'; if (/vp08|V_VP8/.test(txt)) return 'VP8'; if (/av01|V_AV1/.test(txt)) return 'AV1'; return '';
  }
  async function render(seq) {
    if (typeof MediaRecorder === 'undefined') throw new Error('this browser cannot make video files. Use the edit list');
    const kit = mediaKit(true, false);
    if (seq[0]) { kit.video.src = seq[0].url; kit.video.play().then(() => kit.video.pause()).catch(() => { }); }
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
    const box = shell('Making the rough cut. Keep this screen open.', 'CANCEL'); box.firstChild.appendChild(cv);
    let wl = null; try { wl = await navigator.wakeLock.request('screen'); } catch (e) { }
    const stop = { v: false }; box.querySelector('#pstop').onclick = () => { stop.v = true; };
    let out = null, err = null;
    try { out = await runSequence(seq, { canvas: cv, record: true, dest: kit.dest, stop, onStep: (i, n, it) => { const s = box.querySelector('#pstep'); if (s) s.textContent = 'Making ' + (i + 1) + ' of ' + n + ': ' + it.label + '. Keep this screen open.'; } }, kit.video, kit); }
    catch (e) { err = e; }
    try { wl && wl.release(); } catch (e) { }
    kit.video.pause(); kit.video.removeAttribute('src'); try { kit.ac && kit.ac.close(); } catch (e) { }
    box.remove();
    if (err) throw err;
    if (!out || stop.v || !out.blob.size) return null;
    return { blob: out.blob, mime: out.mime, codec: await sniffCodec(out.blob).catch(() => ''), ext: /mp4/.test(out.mime) ? 'mp4' : 'webm' };
  }
  g.FilmPlay = { play, render, mimePick, mediaKit };
})(window);
