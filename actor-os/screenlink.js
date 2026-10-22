/* ACTOR OS · LINK A SCREEN: an old phone, a tablet or a laptop as your monitor, your controller and your playback.
   The phone taping sends its picture (no sound) to the other screen over your own Wi-Fi, by two codes, like Story
   Studio's WATCH ON ANOTHER PHONE (../film/monitor-link.js). Nothing goes through a server.
     MONITOR     tape on the better back camera and see your framing on the other screen
     CONTROLLER  ROLL and CUT from the other screen (a clicker paired to it works too), KEEP, GO AGAIN, ERASE
     PLAYBACK    each take goes over to the other screen when you cut, to watch on the bigger screen
   The take is still made and kept on this phone. The other screen only shows it.
   Loaded by Actor OS; the link code loads the first time you tap SCREEN. */
(function (g) {
  'use strict';
  const S = { stage: '', pc: null, dc: null, url: '', scan: 0, busy: false, send: true, tick: 0, lastId: '' };
  g.ScreenLink = S;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let ML = null;
  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(Error('load')); document.head.appendChild(s); }); }
  async function ready() { if (g.MonitorLink && g.qrcode) return (ML = g.MonitorLink); if (!g.qrcode) await load('../film/vendor/qrcode.min.js'); if (!g.MonitorLink) await load('../film/monitor-link.js'); return (ML = g.MonitorLink); }
  S.can = () => !!(g.RTCPeerConnection && g.CompressionStream);

  /* the box on the stage */
  function box() {
    let b = $('linkBox'); if (b) return b;
    b = document.createElement('div'); b.id = 'linkBox'; b.className = 'linkbox'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Link a screen');
    $('stage').appendChild(b); return b;
  }
  function paint() {
    const btn = $('sScreen'); if (btn) { btn.textContent = S.stage === 'live' ? '● SCREEN' : 'SCREEN'; btn.classList.toggle('on', S.stage === 'live'); }
    const b = $('linkBox'); if (!b || b.hidden) return;
    let h = '<div class="lkbar"><b>LINK A SCREEN</b><button class="sBtn" data-l="close">&times; CLOSE</button></div>';
    if (!S.stage) h += '<p>An old phone, a tablet or a laptop becomes your <b>monitor</b> (see your framing while you tape on the back camera), your <b>controller</b> (ROLL and CUT from there) and your <b>playback</b> (each take goes over when you cut).</p>' +
      '<p class="lkdim">Both on the same Wi-Fi. Picture only, no sound. Nothing goes through a server, and the take stays on this phone.</p><button class="sBtn keep" data-l="start">LINK A SCREEN</button>';
    else if (S.stage === 'making') h += '<p class="lkdim">Making the code…</p>';
    else if (S.stage === 'code') h += '<p><b>1.</b> On the other screen, point its camera at this code, or send it the link.</p><div class="lkqr">' + ML.qrSvg(S.url) + '</div>' +
      '<div class="lkrow">' + (navigator.share ? '<button class="sBtn" data-l="share">SEND THE LINK</button>' : '') + '<button class="sBtn" data-l="copy">COPY THE LINK</button></div>' +
      '<p><b>2.</b> It shows a code back. Hold it up to this camera.</p><p class="lkdim" id="lkscan">Looking for the other screen\'s code…</p>' +
      '<details><summary class="lkdim">Or paste its code</summary><textarea id="lkpaste" placeholder="Paste the code from the other screen"></textarea><button class="sBtn" data-l="use">USE IT</button></details>' +
      '<div class="lkrow"><button class="sBtn" data-l="stop">CANCEL</button></div>';
    else if (S.stage === 'joining') h += '<p class="lkdim">Got it. Joining up…</p>';
    else if (S.stage === 'lost') h += '<p><b>The screens couldn\'t reach each other.</b> Same Wi-Fi? Some hotel and public Wi-Fi keeps devices apart; a phone\'s hotspot works.</p><button class="sBtn keep" data-l="start">TRY AGAIN</button>';
    else if (S.stage === 'live') h += '<p><b>Linked.</b> The other screen shows this camera, runs ROLL and CUT, and gets each take when you cut.</p>' +
      '<label class="lkrow"><input type="checkbox" id="lksend"' + (S.send ? ' checked' : '') + '> <span>Send each take over for playback</span></label>' +
      '<div class="lkrow"><button class="sBtn" data-l="stop" style="border-color:#d9694e;color:#d9694e">UNLINK</button></div>';
    b.innerHTML = h;
    b.querySelectorAll('[data-l]').forEach(x => x.onclick = () => act(x.dataset.l));
    const sd = $('lksend'); if (sd) sd.onchange = () => { S.send = sd.checked; };
  }
  async function act(a) {
    if (a === 'close') { $('linkBox').hidden = true; return; }
    if (a === 'start') return start();
    if (a === 'stop') { S.stop(); paint(); return; }
    if (a === 'copy') { try { await navigator.clipboard.writeText(S.url); toast('Link copied. Send it to the other screen.'); } catch (e) { prompt('Copy this link:', S.url); } return; }
    if (a === 'share') { navigator.share({ title: 'Actor OS screen', url: S.url }).catch(() => { }); return; }
    if (a === 'use') { if (!(await take($('lkpaste').value))) toast('That isn\'t the code from the other screen.'); }
  }
  const toast = t => { try { g.stageToast(t); } catch (e) { } };
  S.open = async function () {
    if (!S.can()) { toast('This browser can\'t link a screen. Try Safari or Chrome, up to date.'); return; }
    try { await ready(); } catch (e) { toast('The link didn\'t load. Check you\'re online once, then try again.'); return; }
    const b = box(); b.hidden = false; paint();
  };
  async function start() {
    const v = $('stageVid'), st = v && v.srcObject; if (!st) { toast('The camera isn\'t on yet.'); return; }
    S.stop(); S.stage = 'making'; paint();
    try {
      const base = new URL('screen.html', location.href).href.replace(/#.*$/, '');
      const r = await ML.offer(st, { facing: (typeof camFacing !== 'undefined' ? camFacing : 'user') }, base, { data: true });
      if (S.stage !== 'making') { try { r.pc.close(); } catch (e) { } return; }
      S.pc = r.pc; S.dc = r.dc; S.url = r.url; S.stage = 'code';
      ML.receive(S.dc, onMsg);
      S.dc.onopen = () => { S.stage = 'live'; clearInterval(S.scan); S.scan = 0; paint(); toast('Screen linked.'); push(); S.tick = setInterval(push, 500); };
      S.dc.onclose = () => { if (S.stage === 'live') { S.stage = ''; clearInterval(S.tick); toast('The other screen let go.'); paint(); } };
      const st2 = () => { const s = r.pc.connectionState || r.pc.iceConnectionState; if (s === 'failed' && S.pc === r.pc && S.stage !== 'live') { S.stage = 'lost'; clearInterval(S.scan); paint(); } };
      r.pc.addEventListener('connectionstatechange', st2); r.pc.addEventListener('iceconnectionstatechange', st2);
      paint(); scan();
    } catch (e) { S.stage = ''; toast('This phone can\'t send its picture. Try Safari or Chrome, up to date.'); paint(); }
  }
  async function take(text) { if (!S.pc || S.busy || S.stage !== 'code') return false; S.busy = true;
    try { await ML.accept(S.pc, text); S.stage = 'joining'; clearInterval(S.scan); S.scan = 0; paint(); return true; } catch (e) { S.busy = false; return false; } }
  S.take = take;
  async function scan() {
    clearInterval(S.scan); let read = null; try { read = await ML.reader('../film/'); } catch (e) { const el = $('lkscan'); if (el) el.textContent = 'This phone can\'t read codes. Copy the code on the other screen and paste it below.'; return; }
    let going = false; S.scan = setInterval(async () => { if (going || S.stage !== 'code') return; const v = $('stageVid'); if (!v || !v.videoWidth) return; going = true;
      try { const t = await read(v); if (t && t.indexOf(ML.ANSWER) >= 0 && !(await take(t))) { const el = $('lkscan'); if (el) el.textContent = 'That code didn\'t fit. Make a new one on both.'; } } catch (e) { } going = false; }, 350);
  }
  S.stop = function () { clearInterval(S.scan); clearInterval(S.tick); S.scan = S.tick = 0; try { S.dc && S.dc.close(); } catch (e) { } try { S.pc && S.pc.close(); } catch (e) { } S.pc = S.dc = null; S.url = ''; S.stage = ''; S.busy = false; paint(); };
  S.live = () => S.stage === 'live' && S.dc && S.dc.readyState === 'open';
  const send = m => { if (S.live()) try { S.dc.send(JSON.stringify(m)); } catch (e) { } };
  /* what the other screen needs to show: rolling or not, the clock, the take you're on, a take waiting for you */
  function push() {
    const rv = !!$('takeReview'), last = ((typeof state !== 'undefined' && state.takes) || []).slice(-1)[0];
    send({ t: 'state', rec: !!(typeof sRecOn !== 'undefined' && sRecOn), count: !!(typeof sCount !== 'undefined' && sCount), tc: ($('sTC') || {}).textContent || '', review: rv, take: rv && last ? { id: last.id, n: last.n, secs: last.secs } : null, scene: (typeof curScene === 'function' ? curScene().name : '') });
  }
  function onMsg(m) {
    if (!m || !m.t) return;
    try {
      if (m.t === 'roll') { if (!(typeof sRecOn !== 'undefined' && sRecOn) && !$('takeReview')) g.stageRec(); }
      else if (m.t === 'cut') { if ((typeof sRecOn !== 'undefined' && sRecOn) || (typeof sCount !== 'undefined' && sCount)) g.stageRec(); }
      else if (m.t === 'keep' && $('takeReview')) g.reviewKeep(m.id || S.lastId);
      else if (m.t === 'again' && $('takeReview')) g.reviewAgain();
      else if (m.t === 'erase' && $('takeReview')) g.reviewDrop(m.id || S.lastId);
    } catch (e) { }
    setTimeout(push, 120);
  }
  /* each take, when you cut: over to the other screen */
  S.took = async function (t, blob) {
    S.lastId = t.id; push();
    if (!S.live() || !S.send || !blob) return;
    try { await ML.sendFile(S.dc, blob, { id: t.id, n: t.n, secs: t.secs, scene: t.scene }); } catch (e) { }
  };
  /* hook into the stage: the SCREEN button, the take when you cut, letting go when you leave */
  function hook() {
    const top = document.querySelector('#stage .sTop'); if (!top || $('sScreen')) return;
    const b = document.createElement('button'); b.className = 'sBtn'; b.id = 'sScreen'; b.type = 'button'; b.textContent = 'SCREEN'; b.onclick = () => S.open();
    const flip = [...top.querySelectorAll('button')].find(x => /FLIP/.test(x.textContent)); top.insertBefore(b, flip || null);
    if (typeof g.showTakeReview === 'function' && !g.showTakeReview.__linked) { const o = g.showTakeReview; g.showTakeReview = function (t, blob) { const r = o.apply(this, arguments); S.took(t, blob); return r; }; g.showTakeReview.__linked = true; }
    if (typeof g.exitStage === 'function' && !g.exitStage.__linked) { const o = g.exitStage; g.exitStage = function () { S.stop(); const lb = $('linkBox'); if (lb) lb.hidden = true; return o.apply(this, arguments); }; g.exitStage.__linked = true; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})(window);
