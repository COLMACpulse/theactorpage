/* READ IN, the reader's side. Somebody sent you their scene; you record the other parts in your own voice, on your
   own time, and send back one file. The scene came in the link after the #, which never reaches a server.
   Your recordings stay on this phone (IndexedDB) until you send them, so you can stop and come back. */
(function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let SC = null, SID = '', TAKES = {}, REC = null, MIC = null, CHUNKS = [], ON = '', AU = null, MSG = '';
  const NKEY = 'theactorpage_readin_name';
  /* ---- the recordings, kept on this phone ---- */
  let _db = null;
  const db = () => _db ? Promise.resolve(_db) : new Promise((res, rej) => { const r = indexedDB.open('theactorpage_readin', 1); r.onupgradeneeded = e => e.target.result.createObjectStore('takes', { keyPath: 'id' }); r.onsuccess = e => { _db = e.target.result; res(_db); }; r.onerror = () => rej(r.error); });
  const put = async (k, blob) => { const d = await db(); return new Promise(r => { const t = d.transaction('takes', 'readwrite'); t.objectStore('takes').put({ id: SID + '|' + k, sid: SID, k, blob, at: Date.now() }); t.oncomplete = () => r(true); t.onerror = () => r(false); }); };
  const all = async () => { const d = await db(); return new Promise(r => { const q = d.transaction('takes', 'readonly').objectStore('takes').getAll(); q.onsuccess = () => r((q.result || []).filter(x => x.sid === SID)); q.onerror = () => r([]); }); };
  const sid = s => { let h = 0; const t = JSON.stringify(s.lines.map(l => l.k)); for (let i = 0; i < t.length; i++) h = ((h << 5) - h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

  const parts = () => [...new Set(SC.lines.filter(l => !l.mine).map(l => l.who))];
  const theirs = () => SC.lines.filter(l => !l.mine);
  const doneN = () => theirs().filter(l => TAKES[l.k]).length;
  const list = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];

  function render() {
    const P = parts(), who = SC.from || 'An actor', me = SC.me ? ' They play ' + esc(SC.me) + '.' : '';
    let h = `<p class="eyebrow">READ IN</p>
      <h1>${esc(who)} asked you to read for ${SC.title ? esc(SC.title) : 'a scene'}.</h1>
      <p>You're reading ${esc(list(P))}: ${theirs().length} line${theirs().length === 1 ? '' : 's'}.${me} Do it whenever suits you. No call, no set time.</p>
      <div class="how"><b>How it goes</b><ol>
        <li>Tap RECORD on a line, say it the way you'd say it to them, tap STOP.</li>
        <li>Their lines are there too, faded, so you know what you're answering.</li>
        <li>Not happy with one? Record it again. Leave and come back any time, it's kept.</li>
        <li>Tap SEND IT BACK. It's one file, and you send it however you like.</li></ol>
        <p class="small dim" style="margin:8px 0 0">Your recordings stay on this phone until you send them. Nothing is uploaded. Your voice only: no computer voice is ever used.</p></div>
      <label class="nm" for="by">YOUR NAME (SO THEY KNOW WHO READ)</label><input class="nm" id="by" autocomplete="name" value="${esc(localStorage.getItem(NKEY) || '')}">
      <div class="prog"><b id="prog"></b>${ON ? '<span class="bad small">&#9679; RECORDING</span>' : ''}</div>`;
    SC.lines.forEach((l, i) => {
      if (l.mine) { h += `<div class="ln cue"><div class="who">${esc(l.who)} (THEM)</div><div class="tx">${esc(l.text)}</div></div>`; return; }
      const has = !!TAKES[l.k], on = ON === l.k;
      h += `<div class="ln${has ? ' done' : ''}${on ? ' on' : ''}" id="l${i}" data-k="${esc(l.k)}"><div class="who">${esc(l.who)}</div><div class="tx">${esc(l.text)}</div>
        <div class="row">${on ? `<button class="rec" data-a="stop" data-i="${i}">&#9632; STOP</button>`
          : `<button class="${has ? '' : 'rec'}" data-a="rec" data-i="${i}" ${ON ? 'disabled' : ''}>${has ? 'RECORD AGAIN' : '&#9679; RECORD'}</button>${has ? `<button data-a="play" data-i="${i}">&#9654; HEAR IT</button>` : ''}`}</div></div>`;
    });
    if (MSG) h += `<p class="msg" id="msg">${esc(MSG)}</p>`;
    $('main').innerHTML = h;
    const d = doneN(), n = theirs().length;
    $('prog').textContent = d + ' of ' + n + ' recorded';
    $('send').hidden = false; $('sendbtn').disabled = !d || !!ON;
    $('sendwhy').textContent = d === n ? 'All of them. Ready to send.' : d ? (n - d) + ' to go. You can send what you have.' : 'Record a line to send it.';
    $('by').oninput = e => { try { localStorage.setItem(NKEY, e.target.value); } catch (x) { } };
  }
  function mime() { for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { } } return ''; }
  async function rec(i) {
    const l = SC.lines[i]; if (ON) return;
    try { MIC = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } }); }
    catch (e) { MSG = 'The mic is off for this page, so nothing can be recorded. Allow the mic in your browser’s settings and try again.'; return render(); }
    const m = mime(); REC = m ? new MediaRecorder(MIC, { mimeType: m }) : new MediaRecorder(MIC); CHUNKS = [];
    REC.ondataavailable = e => { if (e.data.size) CHUNKS.push(e.data); };
    REC.start(); ON = l.k; MSG = ''; render();
    try { $('l' + i).scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
  }
  function stop(i) {
    if (!REC) return;
    const r = REC, k = ON;
    r.onstop = async () => {
      const blob = new Blob(CHUNKS, { type: (r.mimeType || 'audio/webm').split(';')[0] });
      try { MIC.getTracks().forEach(t => t.stop()); } catch (e) { } MIC = null; REC = null; ON = '';
      if (blob.size) { TAKES[k] = blob; await put(k, blob); }
      render();
      const next = SC.lines.findIndex((l, j) => j > i && !l.mine && !TAKES[l.k]);
      if (next >= 0) try { $('l' + next).scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { }
    };
    r.stop();
  }
  function play(i) { const b = TAKES[SC.lines[i].k]; if (!b) return; try { if (AU) AU.pause(); } catch (e) { } AU = new Audio(URL.createObjectURL(b)); AU.play().catch(() => { }); }
  async function send() {
    const by = ($('by').value || '').trim(), takes = {};
    for (const l of theirs()) { const b = TAKES[l.k]; if (b) takes[l.k] = { data: new Uint8Array(await b.arrayBuffer()), ext: ReadIn.extOf(b.type) }; }
    const zip = ReadIn.bundle(SC, takes, by);
    const name = ((SC.title || 'scene') + ' read' + (by ? ' by ' + by : '')).replace(/[^\p{L}\p{N} ._-]+/gu, '').trim() + '.zip';
    const file = new File([zip], name, { type: 'application/zip' });
    window.__lastSend = { name, size: zip.length };
    try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name, text: 'My read for ' + (SC.title || 'your scene') + '. Bring it into the Reader booth: BRING IN THEIR READ.' }); MSG = 'Sent. Thanks for reading.'; return render(); } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    MSG = 'Saved as ' + name + '. Send that file back to ' + (SC.from || 'them') + ' however you like: a text, an email, AirDrop.'; render();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'sendbtn') return send();
    const i = +b.dataset.i; if (b.dataset.a === 'rec') rec(i); else if (b.dataset.a === 'stop') stop(i); else if (b.dataset.a === 'play') play(i);
  });
  (async () => {
    window.addEventListener('hashchange', () => location.reload());
    try { SC = await Promise.race([ReadIn.unpack(location.hash), new Promise(r => setTimeout(() => r(null), 4000))]); } catch (e) { SC = null; }
    if (!SC || !SC.lines.some(l => !l.mine)) { $('main').innerHTML = '<p class="eyebrow">READ IN</p><h1>This link is missing its scene.</h1><p class="dim">Links like this can get cut short when they\'re copied. Ask for it again, or ask them to send it as a text.</p>'; return; }
    SID = sid(SC);
    try { (await all()).forEach(x => { TAKES[x.k] = x.blob; }); } catch (e) { }
    window.READIN = { scene: () => SC, takes: () => TAKES };
    render();
  })();
})();
