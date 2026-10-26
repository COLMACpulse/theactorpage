/* FOOTAGE: what you have, and where it is (Col, Oct 26: "find your own footage. I'd rather have a map").
   THE MAP   by project (your credits, your films, ones you name): the places that hold it. Then the places.
   A PLACE   a drive or folder you picked: its video files folder by folder, what each one is (fix it), TRIM on any
             file. Or a place you named that isn't on this computer, and what's there.
   TRIM      the file, picked again from where it is: start here, end here, the clip goes to Reel Room; a still if you want.
   FIND      a show, a name, a date, across every place.
   It reads lists of files only: nothing is copied or uploaded. CHECK THE COPY is folded at the bottom. */
(function () {
  'use strict';
  const M = window.FootMap, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { place: '', trim: null, naming: false, renaming: false, q: '', msg: '', titles: [], roles: {}, adding: false };
  const today = () => new Date().toISOString().slice(0, 10);
  const nice = iso => { if (!iso) return ''; const d = new Date(iso + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }); };
  const n = (x, w) => x + ' ' + w + (x === 1 ? '' : 's');
  const DOTS = ['#2a5fa8', '#1f8a5c', '#d9b23a', '#c0392b', '#9aa0a8', '#5c636d', '#e8e6e0'];
  const dot = id => { const i = M.places().findIndex(p => p.id === id); return DOTS[(i < 0 ? 0 : i) % DOTS.length]; };
  let TR = { file: null, url: '', dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: [] };

  /* your projects: credits (Your page), Story Studio, Film Hub, and the old Footage list if you had one */
  function gather() {
    const t = [], role = {}; const add = (x, r) => { x = String(x || '').trim(); if (!x) return; if (!t.some(y => M.norm(y) === M.norm(x))) t.push(x); if (r && !role[M.norm(x)]) role[M.norm(x)] = r; };
    const J = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    try { const s = J('film_os_v1'); if (s && s.scripts) Object.values(s.scripts).forEach(x => x && add(x.title || x.name, x.me)); } catch (e) { }
    try { const h = J('filmhub_v1'); if (h && h.films) h.films.forEach(f => add(f.title)); } catch (e) { }
    try { const o = J('theactorpage_footage_v1'); if (o && o.jobs) o.jobs.forEach(j => add(j.title, j.role)); } catch (e) { }
    S.titles = t; S.roles = role;
  }

  function homeView() {
    const m = M.map(S.titles);
    let h = '<label class="lab" for="find" style="margin-top:0">FIND A FILE</label><input class="field find" id="find" placeholder="A show, a name, a date" value="' + esc(S.q) + '" autocomplete="off"><div id="found"></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="grid"><div class="colA">';
    if (m.empty) h += '<div class="card" data-stick data-icbig="footage"><div><b>Nothing on the map yet.</b><p class="dim" style="margin:4px 0 0">Add the drives and folders your footage is on, and name the places that aren’t on this computer. It shows you which project is where.</p></div></div>';
    else {
      h += '<p class="kicker">By project</p><div class="card list" data-stick>';
      if (!m.projects.length) h += '<p class="empty">No file names match a project yet. Open a place and say what its folders are.</p>';
      m.projects.forEach(pr => {
        h += '<div class="prow"><b>' + esc(pr.title) + '</b>' + (S.roles[M.norm(pr.title)] ? '<small>' + esc(S.roles[M.norm(pr.title)]) + '</small>' : '') + '<div class="pchips">'
          + pr.places.map(p => '<button type="button" class="pchip' + (p.named ? ' named' : '') + '" data-place="' + p.id + '"><i style="background:' + dot(p.id) + '"></i>' + esc(p.name) + ' · ' + (p.named ? esc(p.note || 'you said it’s there') : n(p.count, 'file') + ' · ' + M.size(p.bytes)) + '</button>').join('') + '</div></div>';
      });
      if (m.unmatched.length) h += '<div class="prow un"><b>Not matched</b><small>Files whose names don’t say. Open the place and say what they are.</small><div class="pchips">'
        + m.unmatched.map(p => '<button type="button" class="pchip" data-place="' + p.id + '"><i style="background:' + dot(p.id) + '"></i>' + esc(p.name) + ' · ' + n(p.count, 'file') + '</button>').join('') + '</div></div>';
      h += '</div>';
      h += S.adding ? '<div class="row" style="margin-top:-4px"><input class="field" id="mine" placeholder="A project: a reel, a class, a short" style="flex:1"><button class="btn" id="mineok">ADD IT</button></div>'
        : '<button type="button" class="lnk" id="addmine">+ a project that isn’t in your credits</button>';
    }
    h += '</div><div class="colB"><p class="kicker">Places</p>';
    M.places().forEach(p => { h += '<button type="button" class="card place" data-place="' + p.id + '"><i class="pdot" style="background:' + dot(p.id) + '"></i><span class="pt"><b>' + esc(p.name) + '</b><small>' + esc(p.kind === 'named' ? 'a place you named' + (p.note ? ' · ' + p.note : '') : 'a drive or folder · ' + n((p.files || []).length, 'video') + ' · ' + M.size(p.bytes) + (p.looked ? ' · looked ' + nice(p.looked) : '')) + '</small></span><span class="ch">›</span></button>'; });
    h += '<label class="btn pri block" data-ic="footage" style="margin-bottom:8px">ADD A DRIVE OR FOLDER<input type="file" id="adddrive" webkitdirectory directory multiple hidden></label>';
    h += S.naming ? namingForm() : '<button type="button" class="btn block" id="name" data-ic="contacts">NAME A PLACE</button>';
    h += '<p class="dim small" style="margin:10px 2px 0">It reads the list of files: names, sizes, dates. Nothing is copied or uploaded. Unplug the drive and the map keeps what was on it.</p>';
    h += '<details class="fold" id="checkfold" style="margin-top:16px"><summary data-icr="slate" data-icc="film" data-say="before you erase a card"><span data-icl>CHECK THE COPY</span></summary><p class="dim small" style="margin:0 0 10px">On your own shoot: every file on your copies has to match the card exactly before you erase it. A file count isn’t a check.</p><a class="btn" id="tocheck" href="check.html" style="text-decoration:none">OPEN CHECK THE COPY</a></details>';
    return h + '</div></div>';
  }
  function namingForm() {
    return '<div class="card" id="namebox"><p class="kicker">A place that isn’t on this computer</p><label class="lab" for="n_name">WHAT IT IS</label><input class="field" id="n_name" placeholder="Dropbox, your editor, the drive in the drawer">'
      + '<label class="lab" for="n_note">WHAT’S THERE, IN YOUR WORDS</label><input class="field" id="n_note" placeholder="The cut, from production">'
      + '<p class="lab">WHICH PROJECTS</p><div class="chips">' + S.titles.map((t, i) => '<label class="chk"><input type="checkbox" data-holds="' + i + '"> ' + esc(t) + '</label>').join('') + '</div>'
      + '<div class="row"><button class="btn pri" id="n_keep">KEEP IT</button><button class="btn ghost" id="n_cancel">CANCEL</button></div></div>';
  }

  function placeView(p) {
    let h = '<div class="backbar"><button class="btn sm ghost" id="back">‹ THE MAP</button><span class="kicker" style="margin:0">' + (p.kind === 'named' ? 'A place you named' : 'A drive or folder') + '</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="card" data-stick><div class="place" style="padding:0"><i class="pdot" style="background:' + dot(p.id) + '"></i><span class="pt">' + (S.renaming ? '<input class="field" id="rn" value="' + esc(p.name) + '">' : '<b class="pname">' + esc(p.name) + '</b>')
      + '<small>' + esc(p.kind === 'named' ? (p.note || 'Not on this computer') : n((p.files || []).length, 'video') + ' · ' + M.size(p.bytes) + (p.looked ? ' · looked ' + nice(p.looked) : '')) + '</small></span></div>';
    if (p.kind !== 'named') h += '<p class="dim small" style="margin:10px 0 0">If it isn’t plugged in, this is what was on it' + (p.looked ? ' on ' + nice(p.looked) : '') + '. Plug it in and LOOK AGAIN to bring the list up to date.</p>';
    h += '<div class="row" style="margin-top:12px">' + (p.kind !== 'named' ? '<label class="btn" data-ic="footage">LOOK AGAIN<input type="file" id="relook" webkitdirectory directory multiple hidden></label>' : '')
      + (S.renaming ? '<button class="btn pri" id="rnok">KEEP THE NAME</button>' : '<button class="btn" id="rename">RENAME</button>') + '<button class="btn ghost" id="forget">FORGET IT</button></div></div>';
    if (p.kind === 'named') {
      h += '<div class="card"><p class="kicker">What’s there</p><label class="lab" for="nn">IN YOUR WORDS</label><input class="field" id="nn" value="' + esc(p.note || '') + '">'
        + '<p class="lab">WHICH PROJECTS</p><div class="chips">' + S.titles.map((t, i) => '<label class="chk"><input type="checkbox" data-hold="' + i + '"' + ((p.holds || []).some(x => M.norm(x) === M.norm(t)) ? ' checked' : '') + '> ' + esc(t) + '</label>').join('') + '</div></div>';
      return h;
    }
    const F = M.folders(p.id, S.titles), opts = cur => '<option value="">' + (cur === '' ? 'Not matched' : 'Say what it is') + '</option>' + S.titles.map(t => '<option' + (M.norm(t) === M.norm(cur || '') ? ' selected' : '') + '>' + esc(t) + '</option>').join('');
    if (!F.length) h += '<div class="card"><p class="dim" style="margin:0">No video files in it.</p></div>';
    F.forEach((fo, fi) => {
      const what = fo.what !== undefined ? fo.what : (fo.files.every(f => f.what && M.norm(f.what) === M.norm(fo.files[0].what)) ? fo.files[0].what : '');
      h += '<div class="card list fold2"><div class="fhead"><b class="q">' + esc((p.root && fo.dir.indexOf(p.root) === 0 ? fo.dir.slice(p.root.length).replace(/^\//, '') : fo.dir) || 'The top folder') + '</b><label class="fsel"><span class="faint small">IS</span><select data-dir="' + fi + '" aria-label="What this folder is">' + opts(what) + '</select></label></div>';
      fo.files.forEach((f, k) => { h += '<div class="frow"><span class="fn"><b>' + esc(f.n) + '</b><small class="' + (f.what ? 'tag' : 'tag un') + '">' + esc(f.what || 'NOT MATCHED') + '</small></span><span class="fm">' + M.size(f.s) + '</span><span class="fm">' + esc(nice(f.d)) + '</span><button type="button" class="mini" data-trimf="' + fi + '|' + k + '">TRIM</button></div>'; });
      h += '</div>';
    });
    return h;
  }

  function trimView() {
    const t = S.trim; let h = '<div class="backbar"><button class="btn sm ghost" id="tr_close">‹ ' + esc((M.place(t.place) || {}).name || 'BACK') + '</button><span class="kicker" style="margin:0">Trim your moment</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    if (!TR.url) return h + '<div class="card" data-stick data-icbig="footage"><div><b class="q">' + esc(t.name) + '</b><p class="dim small" style="margin:6px 0 10px">' + esc(t.title ? t.title + '. ' : '') + 'Pick it from where it is' + (t.dir ? ' (' + esc(t.dir) + ')' : '') + '. It stays there; only the clip you make is kept.</p><label class="btn pri">PICK THIS FILE<input type="file" id="tr_file" accept="video/*,.mov,.mxf,.mts" hidden></label></div></div>';
    const x = M.trim(TR.inS, TR.outS, TR.dur);
    h += '<div class="grid"><div class="colA"><video class="vid" id="tr_vid" src="' + TR.url + '" controls playsinline preload="metadata"></video>'
      + '<div class="row" style="margin-top:10px"><button class="btn" id="tr_in" style="flex:1">START HERE · <span id="tr_inv">' + M.time(TR.inS) + '</span></button><button class="btn" id="tr_out" style="flex:1">END HERE · <span id="tr_outv">' + M.time(TR.outS) + '</span></button><button class="btn" id="tr_play" style="flex:1">PLAY YOUR MOMENT</button></div></div>';
    h += '<div class="colB"><div class="card ask"><p class="kicker" style="color:var(--tung-text)">Your clip</p><p class="small" id="tr_len" style="margin:0 0 8px">Clip: ' + x.secs + ' seconds.</p>'
      + '<button class="btn pri block" id="tr_make"' + (TR.busy ? ' disabled' : '') + '>' + (TR.busy ? 'MAKING IT…' : 'MAKE THE CLIP') + '</button>'
      + '<div class="prog" id="tr_prog"' + (TR.busy ? '' : ' hidden') + '><i id="tr_bar"></i></div><p class="faint small" style="margin:6px 0 0">It plays your moment through once to make it, so it takes as long as the clip. It goes to Reel Room, and you can save it.</p></div>';
    if (TR.made) h += '<div class="card" id="tr_done"><p class="kicker">Made</p><p class="small">' + esc(TR.made.name) + ' · ' + TR.made.secs + ' seconds.' + (TR.made.hub ? ' It’s in Reel Room.' : '') + '</p><div class="row"><a class="btn" id="tr_save" href="' + TR.made.url + '" download="' + esc(TR.made.name) + '">SAVE IT</a><a class="btn ghost" href="../archbook/">OPEN REEL ROOM</a></div></div>';
    h += '<div class="card" id="stillbox"><p class="kicker">A still, if you want one</p><p class="dim small" style="margin:-4px 0 8px">Pause on a frame and keep it with your photos, for a press kit or your page. Never your main headshot.</p><button class="btn" id="tr_still">KEEP THIS FRAME</button>'
      + (TR.stills.length ? '<div class="stills">' + TR.stills.map(s => '<a href="' + s.url + '" download="' + esc(s.name) + '" title="Save it"><img src="' + s.url + '" alt="Still at ' + esc(s.at) + '"><span class="faint small">' + esc(s.at) + '</span></a>').join('') + '</div>' : '') + '</div>';
    return h + '</div></div>';
  }

  function render() {
    const p = S.place ? M.place(S.place) : null; if (S.place && !p) S.place = '';
    $('view').innerHTML = S.trim ? trimView() : p ? placeView(p) : homeView(); S.msg = ''; wire(); if (!S.trim && !S.place && S.q) showFound();
  }
  function showFound() {
    const box = $('found'); if (!box) return; const R = M.find(S.q, 60);
    box.innerHTML = !S.q.trim() ? '' : !R.length ? '<p class="empty">Nothing on the map by that.</p>' : '<div class="card list">' + R.map(r => '<button type="button" class="frow fres" data-place="' + r.place.id + '"><span class="fn"><b>' + esc(r.file ? r.file.p.split('/').pop() : r.place.name) + '</b><small>' + esc(r.place.name + (r.file ? ' · ' + (r.file.p.split('/').slice(r.place.root ? 1 : 0, -1).join('/') || 'the top') : ' · ' + (r.place.note || 'a place you named'))) + '</small></span><span class="fm">' + (r.file ? M.size(r.file.s) : '') + '</span></button>').join('') + (R.length >= 60 ? '<p class="faint small" style="padding:8px 0">The first 60. Add a word to narrow it.</p>' : '') + '</div>';
    box.querySelectorAll('[data-place]').forEach(b => b.onclick = () => { S.place = b.dataset.place; render(); window.scrollTo(0, 0); });
  }
  function picked(inp) { const r = M.fromFiles([...(inp.files || [])]); inp.value = ''; return r; }

  function wire() {
    const V = $('view'), on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
    V.querySelectorAll('[data-place]').forEach(b => b.onclick = () => { S.place = b.dataset.place; S.renaming = false; render(); window.scrollTo(0, 0); });
    const fd = $('find'); if (fd) fd.oninput = () => { S.q = fd.value; showFound(); };
    const ad = $('adddrive'); if (ad) ad.onchange = () => { const r = picked(ad); if (!r.root && !r.files.length) return; const p = M.addDrive(r.root, r, today()); S.place = p.id; S.msg = r.files.length ? p.name + ': ' + n(r.files.length, 'video') + ' on the map. Say what the folders are where the names don’t.' + (r.capped ? ' (The first 50,000.)' : '') : 'No video files in ' + p.name + '. It’s on the map, empty.'; render(); };
    on('name', () => { S.naming = true; render(); const e = $('n_name'); if (e) e.focus(); });
    on('n_cancel', () => { S.naming = false; render(); });
    on('n_keep', () => { const nm = $('n_name').value; if (!nm.trim()) { $('n_name').focus(); return; } const holds = [...V.querySelectorAll('[data-holds]:checked')].map(c => S.titles[+c.dataset.holds]); const p = M.addNamed(nm, $('n_note').value, holds); S.naming = false; S.msg = p.name + ' is on the map.'; render(); });
    on('addmine', () => { S.adding = true; render(); const e = $('mine'); if (e) e.focus(); });
    on('mineok', () => { const v = $('mine').value.trim(); if (v) { M.addMine(v); if (!S.titles.some(t => M.norm(t) === M.norm(v))) S.titles.push(v); } S.adding = false; render(); });
    on('back', () => { S.place = ''; S.renaming = false; render(); });
    const p = S.place && M.place(S.place);
    if (p) {
      const rl = $('relook'); if (rl) rl.onchange = () => { const r = picked(rl); M.relook(p.id, r, today()); S.msg = 'Looked again: ' + n(r.files.length, 'video') + '. Your fixes are kept.'; render(); };
      on('rename', () => { S.renaming = true; render(); const e = $('rn'); if (e) { e.focus(); e.select(); } });
      on('rnok', () => { M.setPlace(p.id, { name: $('rn').value }); S.renaming = false; render(); });
      on('forget', () => { if (!confirm('Take ' + p.name + ' off the map? Your files stay where they are.')) return; M.forget(p.id); S.place = ''; S.msg = p.name + ' is off the map. Nothing on it was touched.'; render(); });
      const nn = $('nn'); if (nn) nn.onchange = () => { M.setPlace(p.id, { note: nn.value }); };
      V.querySelectorAll('[data-hold]').forEach(c => c.onchange = () => { M.setPlace(p.id, { holds: [...V.querySelectorAll('[data-hold]:checked')].map(x => S.titles[+x.dataset.hold]) }); });
      const F = M.folders(p.id, S.titles);
      V.querySelectorAll('[data-dir]').forEach(s => s.onchange = () => { const fo = F[+s.dataset.dir]; M.setFix(p.id, fo.dir, s.value || ''); render(); });
      V.querySelectorAll('[data-trimf]').forEach(b => b.onclick = () => { const [fi, k] = b.dataset.trimf.split('|').map(Number), fo = F[fi], f = fo.files[k];
        if (TR.url) URL.revokeObjectURL(TR.url); TR = { file: null, url: '', dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: [] };
        S.trim = { place: p.id, name: f.n, dir: fo.dir, title: f.what || '' }; render(); window.scrollTo(0, 0); });
    }
    on('tr_close', () => { S.trim = null; render(); });
    const fi = $('tr_file'); if (fi) fi.onchange = () => { const f = fi.files && fi.files[0]; if (!f) return; if (TR.url) URL.revokeObjectURL(TR.url); TR = { file: f, url: URL.createObjectURL(f), dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: TR.stills || [] }; if (S.trim && f.name !== S.trim.name) S.msg = 'That’s ' + f.name + ', not ' + S.trim.name + '. Fine, if it’s the one you want.'; render(); };
    const v = $('tr_vid');
    if (v && S.trim) {
      const T = S.trim, role = S.roles[M.norm(T.title)] || '';
      const upd = () => { $('tr_inv').textContent = M.time(TR.inS); $('tr_outv').textContent = M.time(TR.outS); $('tr_len').textContent = 'Clip: ' + M.trim(TR.inS, TR.outS, TR.dur || v.duration).secs + ' seconds.'; };
      v.onloadedmetadata = () => { TR.dur = v.duration || 0; if (!TR.outS) TR.outS = TR.dur; upd(); };
      on('tr_in', () => { TR.inS = v.currentTime; if (TR.outS && TR.outS <= TR.inS) TR.outS = Math.min(TR.dur || v.duration, TR.inS + 1); upd(); });
      on('tr_out', () => { TR.outS = Math.max(v.currentTime, TR.inS + 0.2); upd(); });
      on('tr_play', () => { v.currentTime = TR.inS; v.play().catch(() => { }); const stop = () => { if (v.currentTime >= TR.outS) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); });
      on('tr_still', async () => {
        if (!v.videoWidth) { S.msg = 'Play the video to a frame first.'; render(); return; }
        try { v.pause(); } catch (e) { }
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); if (!blob) { S.msg = 'This browser couldn’t grab that frame.'; render(); return; }
        const at = M.time(v.currentTime), name = M.clipName(T.title, role, 'jpg').replace(/_clip\.jpg$/, '_still_' + at.replace(/[:.]/g, '-') + '.jpg');
        let kept = false; try { if (window.You) { const r = await You.addPhoto(new File([blob], name, { type: 'image/jpeg' }), { kind: 'still', from: { title: T.title, role, t: Math.round(v.currentTime * 10) / 10 } }); kept = !!(r && r.photo); } } catch (e) { }
        TR.stills = TR.stills.concat([{ name, at, url: URL.createObjectURL(blob) }]);
        S.msg = kept ? 'Still kept with your photos (' + at + ').' : 'Kept here. Tap it to save it.';
        const t = v.currentTime; render(); const nv = $('tr_vid'); if (nv) nv.addEventListener('loadedmetadata', () => { try { nv.currentTime = t; } catch (e) { } }, { once: true }); });
      on('tr_make', async () => {
        if (TR.busy || !window.ActorCompress) return;
        const dur = TR.dur || v.duration, t = M.trim(TR.inS, TR.outS, dur); TR.busy = true; render();
        try {
          const out = await ActorCompress.process(TR.file, { h: 1080, mbps: 8, trimStart: t.trimStart, trimEnd: t.trimEnd, onProgress: p => { const b = $('tr_bar'); if (b) b.style.width = Math.round((p || 0) * 100) + '%'; } });
          const blob = out && out.blob ? out.blob : out, ext = /webm/.test(blob.type) ? 'webm' : 'mp4', name = M.clipName(T.title, role, ext);
          let hub = false; try { if (window.Takes) { await Takes.put(blob, { kind: 'video', mime: blob.type, ext, name, secs: t.secs, for: { type: 'clip', title: T.title, role } }); hub = true; } } catch (e) { }
          TR.busy = false; TR.made = { name, secs: t.secs, url: URL.createObjectURL(blob), hub }; render();
        } catch (e) { TR.busy = false; S.msg = 'Couldn’t make the clip: ' + (e.message || 'this browser can’t read that file') + '.'; render(); }
      });
    }
  }
  gather(); S.titles = S.titles.concat(M.mine().filter(m => !S.titles.some(t => M.norm(t) === M.norm(m))));
  render();
  (async () => { try { if (window.Offices) { const hb = await Offices.load(); if (hb && hb.credits) { hb.credits.forEach(c => { const x = String(c.title || '').trim(); if (x && !S.titles.some(t => M.norm(t) === M.norm(x))) S.titles.push(x); if (x && (c.role || c.character) && !S.roles[M.norm(x)]) S.roles[M.norm(x)] = c.role || c.character; }); render(); } } } catch (e) { } })();
  window.FOOTAGE = { render, tr: () => TR, state: S, gather };
})();
