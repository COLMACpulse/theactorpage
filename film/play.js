/* STORY STUDIO: play the cut, and make it into one video file, in this browser.
   The sequencer is ARCHBOOK's (proven there: order, cuts within a frame, sound in sync), without the name cards.
   seq: [{url, in, out, label}] in seconds. Nothing leaves the device. */
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
  async function runSequence(seq, opts, video) {
    const cv = opts.canvas, ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    let live = false, alive = true;
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
        resume();
        await video.play();
        await new Promise(res => { const chk = () => { if (opts.stop.v || video.ended || video.currentTime >= it.out - 0.012) return res(); requestAnimationFrame(chk); }; requestAnimationFrame(chk); });
        video.pause(); pause();
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
    let ac = null, dest = null;
    try { const AC = window.AudioContext || window.webkitAudioContext; ac = new AC(); ac.resume(); const src = ac.createMediaElementSource(video);
      if (record) { dest = ac.createMediaStreamDestination(); src.connect(dest); } if (audible) src.connect(ac.destination); }
    catch (e) { ac = null; video.muted = !audible; }
    return { video, ac, dest };
  }
  function shell(text, btn) {
    const box = document.createElement('div'); box.className = 'player';
    box.innerHTML = '<div class="pview"></div><div class="bar"><span id="pstep">' + text + '</span><button class="btn" id="pstop">' + btn + '</button></div>';
    document.body.appendChild(box); return box;
  }
  async function play(seq) {
    const kit = mediaKit(false, true);
    if (seq[0]) { kit.video.src = seq[0].url; kit.video.play().then(() => kit.video.pause()).catch(() => { }); } // unlock sound on phones
    const box = shell('Playing the cut', 'STOP'), cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; box.firstChild.appendChild(cv);
    const stop = { v: false }; box.querySelector('#pstop').onclick = () => { stop.v = true; };
    let err = null;
    try { await runSequence(seq, { canvas: cv, stop, onStep: (i, n, it) => { const s = box.querySelector('#pstep'); if (s) s.textContent = (i + 1) + ' of ' + n + ' · ' + it.label; } }, kit.video); }
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
    try { out = await runSequence(seq, { canvas: cv, record: true, dest: kit.dest, stop, onStep: (i, n, it) => { const s = box.querySelector('#pstep'); if (s) s.textContent = 'Making ' + (i + 1) + ' of ' + n + ': ' + it.label + '. Keep this screen open.'; } }, kit.video); }
    catch (e) { err = e; }
    try { wl && wl.release(); } catch (e) { }
    kit.video.pause(); kit.video.removeAttribute('src'); try { kit.ac && kit.ac.close(); } catch (e) { }
    box.remove();
    if (err) throw err;
    if (!out || stop.v || !out.blob.size) return null;
    return { blob: out.blob, mime: out.mime, codec: await sniffCodec(out.blob).catch(() => ''), ext: /mp4/.test(out.mime) ? 'mp4' : 'webm' };
  }
  g.FilmPlay = { play, render, mimePick };
})(window);
