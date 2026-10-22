/* STORY STUDIO · WATCH ON ANOTHER PHONE: one phone's camera, live on a second screen, over your own Wi-Fi. No server.
   Mined from CINEKNIFE REMOTE VIEWFINDER (WebRTC, frame lines, mirror, freeze) without its relay:
     1. the camera phone shows a code (a link with its half of the handshake in it)
     2. the other phone opens it with its own camera app, or gets the link by AirDrop or a message
     3. that phone shows a code back; the camera phone reads it through the lens it already has open
   Nothing goes through anyone's server. Same Wi-Fi only (no outside relay is asked for). No sound, no recording.
   The picture is encrypted end to end by the browsers (WebRTC). */
(function (g) {
  'use strict';
  const L = {};
  L.ANSWER = 'TPA1.';
  const b64u = u8 => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function squeeze(bytes, how) { const cs = how === 'in' ? new DecompressionStream('deflate-raw') : new CompressionStream('deflate-raw'); const w = cs.writable.getWriter(); w.write(bytes); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }
  /* a handshake half, packed small: {v, sdp, ...extra} -> deflate -> base64url */
  L.pack = async o => b64u(await squeeze(new TextEncoder().encode(JSON.stringify(Object.assign({ v: 1 }, o)))));
  L.unpack = async s => { const o = JSON.parse(new TextDecoder().decode(await squeeze(unb64u(String(s).trim()), 'in'))); if (!o || o.v !== 1 || typeof o.sdp !== 'string' || !/^v=0/.test(o.sdp)) throw Error('That code isn\'t from Story Studio.'); return o; };
  /* wait for every address on this network, so one code carries the whole handshake */
  L.gathered = pc => new Promise(res => { if (pc.iceGatheringState === 'complete') return res(); const t = setTimeout(res, 4000); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }); });
  L.peer = () => new RTCPeerConnection({ iceServers: [] });
  /* a smaller handshake, so the code is easy to read: one or two video formats (the phone's first, and H.264 for
     iPhones), the picture-turn note, UDP addresses only. Everything the other side needs to play the picture. */
  L.slim = function (sdp) {
    const out = [], lines = String(sdp).split(/\r?\n/).filter(Boolean); let keep = null;
    const secs = []; let cur = { head: true, lines: [] }; secs.push(cur);
    lines.forEach(l => { if (/^m=/.test(l)) { cur = { lines: [] }; secs.push(cur); } cur.lines.push(l); });
    secs.forEach(sec => {
      if (sec.head) { sec.lines.forEach(l => out.push(l)); return; }
      const m = sec.lines[0], kind = (m.match(/^m=(\w+)/) || [])[1];
      if (kind !== 'video') { sec.lines.forEach(l => out.push(l)); return; }
      const pts = m.split(' ').slice(3), name = {}, fmtp = {};
      sec.lines.forEach(l => { let r = l.match(/^a=rtpmap:(\d+) ([^/]+)/); if (r) name[r[1]] = r[2].toLowerCase(); r = l.match(/^a=fmtp:(\d+) (.*)/); if (r) fmtp[r[1]] = r[2]; });
      const main = pts.filter(p => !/^(rtx|red|ulpfec|flexfec-03)$/.test(name[p] || ''));
      keep = new Set(); if (main[0]) keep.add(main[0]);
      const h264 = main.find(p => name[p] === 'h264' && /packetization-mode=1/.test(fmtp[p] || '') && /profile-level-id=42e0/.test(fmtp[p] || '')) || main.find(p => name[p] === 'h264' && /packetization-mode=1/.test(fmtp[p] || ''));
      if (h264) keep.add(h264);
      pts.forEach(p => { const a = (fmtp[p] || '').match(/apt=(\d+)/); if (name[p] === 'rtx' && a && keep.has(a[1])) keep.add(p); });
      out.push(m.split(' ').slice(0, 3).concat(pts.filter(p => keep.has(p))).join(' '));
      sec.lines.slice(1).forEach(l => {
        const r = l.match(/^a=(rtpmap|fmtp|rtcp-fb):(\d+|\*)/); if (r) { if (keep.has(r[2])) out.push(l); return; }
        if (/^a=extmap:/.test(l)) { if (/video-orientation/.test(l)) out.push(l); return; }
        if (/^a=candidate:/.test(l)) { if (/ udp /i.test(l)) out.push(l); return; }
        if (/^a=ssrc:\d+ (msid|mslabel|label):/.test(l)) return;
        out.push(l);
      });
    });
    return out.join('\r\n') + '\r\n';
  };

  /* camera side: an offer for the stream's video, as a link to the monitor page */
  /* opts.data: also a channel for messages and files (Actor OS: the other screen runs the take and plays it back) */
  L.offer = async function (stream, meta, base, opts) {
    const pc = L.peer(); stream.getVideoTracks().forEach(t => pc.addTrack(t, stream));
    const dc = opts && opts.data ? pc.createDataChannel('ctl', { ordered: true }) : null;
    await pc.setLocalDescription(await pc.createOffer()); await L.gathered(pc);
    const code = await L.pack(Object.assign({ sdp: L.slim(pc.localDescription.sdp) }, meta || {}));
    return { pc, dc, url: (base || '') + '#o=' + code, code };
  };
  L.accept = async function (pc, text) {
    const t = String(text || '').trim(), i = t.indexOf(L.ANSWER); if (i < 0) throw Error('That isn\'t the code from the other phone.');
    const o = await L.unpack(t.slice(i + L.ANSWER.length)); await pc.setRemoteDescription({ type: 'answer', sdp: o.sdp }); return o;
  };
  /* monitor side: take the offer, make the answer */
  L.answer = async function (code, onTrack, onData) {
    const o = await L.unpack(code), pc = L.peer();
    pc.ontrack = e => onTrack && onTrack(e.streams[0] || new MediaStream([e.track]));
    pc.ondatachannel = e => onData && onData(e.channel);
    await pc.setRemoteDescription({ type: 'offer', sdp: o.sdp }); await pc.setLocalDescription(await pc.createAnswer()); await L.gathered(pc);
    return { pc, meta: o, code: L.ANSWER + await L.pack({ sdp: L.slim(pc.localDescription.sdp) }) };
  };

  /* a QR code as SVG (qrcode-generator), error correction L so the most fits */
  L.qrSvg = function (text, px) {
    const Q = g.qrcode; if (!Q) return '';
    const q = Q(0, 'L'); q.addData(text, 'Byte'); q.make(); const n = q.getModuleCount(), m = 4, size = n + m * 2;
    let d = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    return '<svg class="qr" viewBox="0 0 ' + size + ' ' + size + '" ' + (px ? 'width="' + px + '" height="' + px + '" ' : '') + 'shape-rendering="crispEdges" role="img" aria-label="A code for the other phone"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  };
  /* reading a code through the camera: the browser's own reader when there is one, else jsQR (loaded the first time) */
  let reader = null;
  L.reader = async function (root) {
    if (reader) return reader;
    if (g.BarcodeDetector) { try { const fm = await g.BarcodeDetector.getSupportedFormats(); if (fm.includes('qr_code')) { const bd = new g.BarcodeDetector({ formats: ['qr_code'] }); reader = async src => { const r = await bd.detect(src); return r[0] ? r[0].rawValue : ''; }; return reader; } } catch (e) { } }
    if (!g.jsQR) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = (root || '') + 'vendor/jsQR.min.js'; s.onload = res; s.onerror = () => rej(Error('The code reader didn\'t load.')); document.head.appendChild(s); });
    const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    reader = async src => { const w = src.videoWidth || src.width, h = src.videoHeight || src.height; if (!w) return ''; const s = Math.min(1, 900 / Math.max(w, h)); cv.width = Math.round(w * s); cv.height = Math.round(h * s); cx.drawImage(src, 0, 0, cv.width, cv.height); const im = cx.getImageData(0, 0, cv.width, cv.height), r = g.jsQR(im.data, im.width, im.height, { inversionAttempts: 'dontInvert' }); return r ? r.data : ''; };
    return reader;
  };
  L.readImage = async function (imgData) { if (!g.jsQR) throw Error('no reader'); const r = g.jsQR(imgData.data, imgData.width, imgData.height); return r ? r.data : ''; };
  /* a file over the channel, in pieces, without flooding it: {t:'file', ...meta, bytes} then the pieces, then {t:'end'} */
  L.sendFile = async function (dc, blob, meta, onProgress) {
    const CH = 64 * 1024; dc.bufferedAmountLowThreshold = 1 << 20;
    dc.send(JSON.stringify(Object.assign({ t: 'file', bytes: blob.size, type: blob.type }, meta || {})));
    for (let o = 0; o < blob.size; o += CH) {
      if (dc.readyState !== 'open') throw Error('closed');
      if (dc.bufferedAmount > 4 << 20) await new Promise(r => { const f = () => { dc.removeEventListener('bufferedamountlow', f); r(); }; dc.addEventListener('bufferedamountlow', f); });
      dc.send(await blob.slice(o, o + CH).arrayBuffer()); onProgress && onProgress(Math.min(1, (o + CH) / blob.size));
    }
    dc.send(JSON.stringify({ t: 'end' }));
  };
  /* the other end: messages to onMsg, a whole file to onFile(blob, meta), progress to onProgress */
  L.receive = function (dc, onMsg, onFile, onProgress) {
    let cur = null; dc.binaryType = 'arraybuffer';
    dc.onmessage = e => {
      if (typeof e.data !== 'string') { if (cur) { cur.parts.push(e.data); cur.got += e.data.byteLength; onProgress && onProgress(cur.got / (cur.meta.bytes || 1), cur.meta); } return; }
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.t === 'file') { cur = { meta: m, parts: [], got: 0 }; onProgress && onProgress(0, m); return; }
      if (m.t === 'end' && cur) { const b = new Blob(cur.parts, { type: cur.meta.type || '' }), meta = cur.meta; cur = null; onFile && onFile(b, meta); return; }
      onMsg && onMsg(m);
    };
  };
  g.MonitorLink = L;
  if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
