/* FOOTAGE: get your footage. Every job until it's a clip on your reel.
   FRONT  still waiting on it (comes out, out now: ask for it, asked: ask again or I have it) and you have it (trim).
   ONE    the ask: a short note to whoever has it, yours to change; your mail opens, it keeps the date you asked.
   TRIM   the file you have: start here, end here, make the clip (it goes to Reel Room), keep a still if you want one.
   No reminders. Folded away: how to get your footage, CHECK THE COPY. It never downloads from a streaming site. */
(function () {
  'use strict';
  const F = window.Footage, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { open: '', adding: false, trim: '', msg: '', credits: [] };
  const today = () => new Date().toISOString().slice(0, 10);
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  const names = () => { try { return window.Contacts ? Contacts.names({}) : []; } catch (e) { return []; } };
  const day = d => { if (!d) return ''; const t = new Date(String(d).length === 10 ? d + 'T12:00' : d); return isNaN(t) ? '' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const me = () => { try { return (window.You && You.get().name) || ''; } catch (e) { return ''; } };
  const person = n => { try { return n && window.Contacts ? Contacts.find(n) : null; } catch (e) { return null; } };
  const askEmail = j => j.askEmail || ((person(j.ask) || {}).email) || '';
  const first = n => String(n || '').trim().split(/\s+/)[0] || '';
  const nameOf = j => j.title + (j.episode ? ', ' + j.episode : '');
  let TR = { file: null, url: '', dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: [] };

  /* where it stands, from what you did */
  const st = j => (j.clips || []).length ? 'clipped' : F.status(j, today());
  const waiting = j => ['notyet', 'out', 'asked'].includes(st(j));

  function form(j) {
    const v = k => esc(j ? j[k] || '' : '');
    return '<div class="grid2"><div><label class="lab" for="j_title">Project</label><input class="field" id="j_title" value="' + v('title') + '"></div>'
      + '<div><label class="lab" for="j_role">Your role</label><input class="field" id="j_role" value="' + v('role') + '"></div>'
      + '<div><label class="lab" for="j_kind">What it is</label><select class="field" id="j_kind">' + opts(F.KINDS, j ? j.kind : 'tv') + '</select></div>'
      + '<div><label class="lab" for="j_ep">Episode</label><input class="field" id="j_ep" value="' + v('episode') + '" placeholder="Ep. 104, or leave it"></div>'
      + '<div><label class="lab" for="j_out">Comes out, or came out</label><input class="field" type="date" id="j_out" value="' + v('out') + '"></div>'
      + '<div><label class="lab" for="j_where">Where it airs or streams</label><input class="field" id="j_where" value="' + v('where') + '"></div>'
      + '<div><label class="lab" for="j_ask">Who to ask for it</label><input class="field" id="j_ask" list="asklist" value="' + v('ask') + '" placeholder="The producer, the editor, your rep"></div>'
      + '<div><label class="lab" for="j_mail">Their email</label><input class="field" id="j_mail" inputmode="email" value="' + v('askEmail') + '" placeholder="If Contacts doesn’t have it"></div></div>'
      + '<datalist id="asklist">' + names().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>'
      + '<label class="lab" for="j_note">Your note</label><textarea class="field" id="j_note" rows="2" placeholder="Where your scene is, what they said">' + v('note') + '</textarea>';
  }
  const vals = () => ({ title: $('j_title').value, role: $('j_role').value, kind: $('j_kind').value, episode: $('j_ep').value, out: $('j_out').value, where: $('j_where').value, ask: $('j_ask').value, askEmail: $('j_mail').value, note: $('j_note').value });

  /* ---------- front ---------- */
  function line(j) {
    const s = st(j), w = j.where ? ' on ' + j.where : '';
    if (s === 'notyet') return [j.episode, j.out ? 'comes out ' + day(j.out) + w : 'not out yet'].filter(Boolean).join(' · ');
    if (s === 'out') return [j.episode, (j.out ? 'out since ' + day(j.out) : 'out now') + w, j.ask ? 'ask ' + j.ask : ''].filter(Boolean).join(' · ');
    if (s === 'asked') return [j.episode, 'you asked' + (j.ask ? ' ' + j.ask : '') + (j.asked ? ' ' + day(j.asked) : '')].filter(Boolean).join(' · ');
    if (s === 'have') return [j.episode, 'the file is here · no clip yet'].filter(Boolean).join(' · ');
    return [j.episode, j.clips.length + ' clip' + (j.clips.length === 1 ? '' : 's') + ' · in Reel Room'].filter(Boolean).join(' · ');
  }
  function jobRow(j) {
    const s = st(j), a = [];
    if (s === 'out') a.push('<button class="mini pri" data-ask="' + j.id + '">ASK FOR IT</button>', '<button class="mini" data-have="' + j.id + '">I HAVE IT</button>');
    if (s === 'asked') a.push('<button class="mini" data-ask="' + j.id + '">ASK AGAIN</button>', '<button class="mini pri" data-have="' + j.id + '">I HAVE IT</button>');
    if (s === 'have') a.push('<button class="mini pri" data-trim="' + j.id + '">TRIM YOUR MOMENT</button>');
    if (s === 'clipped') a.push('<button class="mini" data-trim="' + j.id + '">TRIM ANOTHER</button>');
    return '<div class="job"><button type="button" class="jb" data-open="' + j.id + '"><b>' + esc(j.title + (j.role ? ' · ' + j.role : '')) + '</b><small>' + esc(line(j)) + '</small></button>' + (a.length ? '<span class="acts">' + a.join('') + '</span>' : '') + '</div>';
  }
  function homeView() {
    const all = F.jobs().sort((a, b) => String(b.out || '').localeCompare(String(a.out || ''))), W = all.filter(waiting), H = all.filter(j => !waiting(j));
    let h = S.msg ? '<p class="msg" id="msg">' + esc(S.msg) + '</p>' : '';
    h += '<div class="grid"><div class="colA">';
    if (S.adding) h += '<div class="card" id="detail"><p class="kicker">Add a job</p>' + form(null) + '<div class="row" style="margin-top:12px"><button class="btn pri" id="keepnew">ADD</button><button class="btn ghost" data-close>CANCEL</button></div></div>';
    if (!all.length) h += '<div class="card" data-stick data-icbig="footage"><p class="dim" style="margin:0">No jobs yet. Add one, or add a credit from your Hub. When it comes out, ask for your scene; when you have the file, trim your moment.</p></div>';
    if (W.length) h += '<p class="kicker">Still waiting on it <i>' + W.length + '</i></p><div class="card list" id="waiting">' + W.map(jobRow).join('') + '</div>';
    if (H.length) h += '<p class="kicker" style="margin-top:16px">You have it <i>' + H.length + '</i></p><div class="card list" id="have">' + H.map(jobRow).join('') + '</div>';
    h += '</div><div class="colB"><button class="btn pri block" id="add" data-ic="plus" style="margin-bottom:12px">ADD A JOB</button>';
    if (S.credits.length) h += '<div class="card" id="credits"><p class="kicker">From your credits</p><p class="dim small" style="margin:-4px 0 8px">In your Hub, with no footage here yet.</p>' + S.credits.map((x, i) => '<div class="row" style="justify-content:space-between;margin:6px 0"><span>' + esc(x.title) + (x.role ? ' <span class="faint small">' + esc(x.role) + '</span>' : '') + '</span><button class="mini" data-track="' + i + '">ADD IT</button></div>').join('') + '</div>';
    h += '<details class="fold" id="howfold"><summary data-icr="notes" data-icc="you" data-say="who to ask, and when"><span data-icl>HOW TO GET YOUR FOOTAGE</span></summary><ol class="how small"><li>Ask production: the producer, the production coordinator or the editor. Many send a link once it’s out. Say it’s for your reel.</li><li>Ask your rep. They often have a way in.</li><li>Buy the episode or the film where it’s sold, and keep the file.</li><li>Ask again if it doesn’t come. People mean to send it, and forget.</li></ol><p class="faint small" style="margin:8px 0 0">This page never downloads anything from a streaming site. You get the file the honest way and trim it here.</p></details>';
    h += '<details class="fold" id="checkfold"><summary data-icr="slate" data-icc="film" data-say="before you erase a card"><span data-icl>CHECK THE COPY</span></summary><p class="dim small" style="margin:0 0 10px">Before you erase a camera card on your own shoot: every file on your copies has to match the card exactly. A file count isn’t a check.</p><a class="btn" href="check.html" id="tocheck">CHECK THE COPY</a></details>';
    return h + '</div></div>';
  }

  /* ---------- one job: the ask ---------- */
  function noteFor(j) { const hi = first(j.ask && (person(j.ask) || {}).name || j.ask), again = st(j) === 'asked', nm = me();
    return 'Hi' + (hi && !/^(the|my|your)$/i.test(hi) ? ' ' + hi : '') + ',\n\n' + (again ? 'Just following up on my scene from ' + nameOf(j) + '. Could you send a file or a link when you get a chance?' : 'Hope you’re well. ' + nameOf(j) + ' is out, and I’d love my scene for my reel. Could you send a file or a link when you get a chance?') + '\n\nThanks,' + (nm ? '\n' + nm : ''); }
  const subjFor = j => 'My scene from ' + nameOf(j);
  function jobView(j) {
    const s = st(j), em = askEmail(j);
    let h = '<div class="backbar"><button class="btn sm ghost" data-close>‹ FOOTAGE</button></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="grid" id="detail"><div class="colA"><p class="kicker" style="margin:0">' + esc(F.kindName(j.kind)) + '</p><p class="pname">' + esc(j.title) + '</p><p class="dim" style="margin:0 0 12px">' + esc([j.role, line(j)].filter(Boolean).join(' · ')) + '</p>';
    if (s === 'out' || s === 'asked') h += '<div class="card ask" id="askbox"><p class="kicker" style="color:var(--tung-text)">To ' + esc(j.ask || 'whoever has it') + (em ? ' · ' + esc(em) : '') + '</p>'
      + (j.ask ? '' : '<p class="dim small" style="margin:-4px 0 6px">Add who to ask under the details, or pick them in your mail.</p>')
      + '<label class="lab" for="a_subj">Subject</label><input class="field" id="a_subj" value="' + esc(j.askSubj != null ? j.askSubj : subjFor(j)) + '">'
      + '<label class="lab" for="a_note">The note</label><textarea class="field note" id="a_note">' + esc(j.askBody != null ? j.askBody : noteFor(j)) + '</textarea>'
      + '<p class="faint small" style="margin:4px 0 0">' + (j.askBody != null ? 'Your words now. <button class="lnk" id="a_reset">Start the note over</button>' : 'Short on purpose. Your words: change any of it.') + '</p>'
      + '<div class="row" style="margin-top:10px"><a class="btn pri" id="a_send" href="#" style="flex:2">' + (s === 'asked' ? 'ASK AGAIN' : 'ASK FOR IT') + '</a><button class="btn" data-have="' + j.id + '" style="flex:1">I HAVE THE FILE</button></div>'
      + '<p class="faint small" style="margin:6px 0 0">Your mail opens with the note. You hit send. It keeps the date you asked.</p></div>';
    if (s === 'notyet') h += '<div class="card"><p class="dim small" style="margin:0">' + (j.out ? 'It comes out ' + esc(day(j.out)) + (j.where ? ' on ' + esc(j.where) : '') + '. Once it’s out, ask for your scene here.' : 'Add when it comes out under the details, and ask for your scene once it’s out.') + '</p><div class="row" style="margin-top:10px"><button class="btn" data-have="' + j.id + '">I HAVE THE FILE</button></div></div>';
    if (s === 'have' || s === 'clipped') h += '<div class="row" style="margin-bottom:12px"><button class="btn pri" data-trim="' + j.id + '" style="flex:1">' + (s === 'have' ? 'TRIM YOUR MOMENT' : 'TRIM ANOTHER') + '</button>' + (s === 'clipped' ? '<a class="btn" href="../archbook/" style="flex:1">OPEN REEL ROOM</a>' : '') + '</div>';
    h += '</div><div class="colB">';
    if ((j.clips || []).length) h += '<div class="card" id="clips"><p class="kicker">Your clips</p>' + j.clips.map(x => '<p class="small" style="margin:4px 0">' + esc(x.name) + ' · ' + x.secs + ' seconds</p>').join('') + '</div>';
    h += '<details class="fold" id="detfold"><summary>THE DETAILS</summary>' + form(j) + '<div class="row" style="margin-top:12px"><button class="btn pri" id="save">SAVE</button>' + (j.ask && window.Contacts ? '<a class="btn ghost" href="../contacts/?who=' + encodeURIComponent(j.ask) + '">' + esc(j.ask.toUpperCase()) + ' IN CONTACTS</a>' : '') + '<button class="lnk faint" id="del" style="margin-left:auto">remove</button></div></details>';
    return h + '</div></div>';
  }

  /* ---------- trim ---------- */
  function trimView(j) {
    let h = '<div class="backbar"><button class="btn sm ghost" id="tr_close">‹ ' + esc(j.title.toUpperCase()) + '</button><span class="kicker" style="margin:0">Trim your moment</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div id="trimbox">';
    if (!TR.url) return h + '<div class="card"><p class="dim small" style="margin:0 0 10px">Pick the file you have. It stays on this device.</p><label class="btn pri">PICK THE VIDEO<input type="file" id="tr_file" accept="video/*" hidden></label></div></div>';
    const t = F.trim(TR.inS, TR.outS, TR.dur);
    h += '<div class="grid"><div class="colA"><video class="vid" id="tr_vid" src="' + TR.url + '" controls playsinline preload="metadata"></video>'
      + '<div class="row" style="margin-top:10px"><button class="btn" id="tr_in" style="flex:1">START HERE · <span id="tr_inv">' + F.time(TR.inS) + '</span></button><button class="btn" id="tr_out" style="flex:1">END HERE · <span id="tr_outv">' + F.time(TR.outS) + '</span></button><button class="btn" id="tr_play" style="flex:1">PLAY YOUR MOMENT</button></div>'
      + '<label class="lnk" style="display:inline-block;margin-top:8px;cursor:pointer">a different file<input type="file" id="tr_file" accept="video/*" hidden></label></div>';
    h += '<div class="colB"><div class="card ask"><p class="kicker" style="color:var(--tung-text)">Your clip</p><p class="small" id="tr_len" style="margin:0 0 8px">Clip: ' + t.secs + ' seconds.</p>'
      + '<button class="btn pri block" id="tr_make"' + (TR.busy ? ' disabled' : '') + '>' + (TR.busy ? 'MAKING IT…' : 'MAKE THE CLIP') + '</button>'
      + '<div class="prog" id="tr_prog"' + (TR.busy ? '' : ' hidden') + '><i id="tr_bar"></i></div><p class="faint small" id="tr_wait" style="margin:6px 0 0">It plays your moment through once to make it, so it takes as long as the clip. It goes to Reel Room, and you can save it.</p></div>';
    if (TR.made) h += '<div class="card" id="tr_done"><p class="kicker">Made</p><p class="small">' + esc(TR.made.name) + ' · ' + TR.made.secs + ' seconds.' + (TR.made.hub ? ' It’s in your Hub’s library too, ready for Reel Room and your page.' : '') + '</p><div class="row"><a class="btn" id="tr_save" href="' + TR.made.url + '" download="' + esc(TR.made.name) + '">SAVE IT</a><a class="btn ghost" href="../archbook/">OPEN REEL ROOM</a></div></div>';
    h += '<div class="card" id="stillbox"><p class="kicker">A still, if you want one</p><p class="dim small" style="margin:-4px 0 8px">Pause on a frame and keep it with your photos, for a press kit or your page. Never your main headshot.</p><button class="btn" id="tr_still">KEEP THIS FRAME</button>'
      + (TR.stills.length ? '<div class="stills">' + TR.stills.map(x => '<a href="' + x.url + '" download="' + esc(x.name) + '" title="Save it"><img src="' + x.url + '" alt="Still at ' + esc(x.at) + '"><span class="faint small">' + esc(x.at) + '</span></a>').join('') + '</div>' : '') + '</div>';
    return h + '</div></div></div>';
  }

  /* ---------- draw and wire ---------- */
  function render() {
    const j = S.trim ? F.get(S.trim) : S.open ? F.get(S.open) : null;
    if ((S.trim || S.open) && !j) { S.trim = ''; S.open = ''; }
    $('view').innerHTML = S.trim && j ? trimView(j) : S.open && j ? jobView(j) : homeView(); S.msg = ''; wire();
  }
  function markHave(id) { F.set(id, { status: 'have' }); S.trim = ''; S.open = id; S.msg = 'Good. Trim your moment when you’re ready.'; render(); }
  function wire() {
    const V = $('view');
    V.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.preventDefault(); S.open = b.dataset.open; S.adding = false; S.trim = ''; render(); window.scrollTo(0, 0); });
    V.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => { S.open = b.dataset.ask; S.trim = ''; render(); window.scrollTo(0, 0); const n = $('a_note'); if (n) n.focus(); });
    V.querySelectorAll('[data-have]').forEach(b => b.onclick = () => markHave(b.dataset.have));
    V.querySelectorAll('[data-trim]').forEach(b => b.onclick = () => { S.trim = b.dataset.trim; S.open = ''; if (TR.jid !== S.trim) { if (TR.url) URL.revokeObjectURL(TR.url); TR = { file: null, url: '', dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: [], jid: S.trim }; } render(); window.scrollTo(0, 0); });
    V.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { S.open = ''; S.adding = false; render(); window.scrollTo(0, 0); });
    V.querySelectorAll('[data-track]').forEach(b => b.onclick = () => { const x = S.credits[+b.dataset.track]; const j = F.add(x); S.credits = S.credits.filter((_, i) => i !== +b.dataset.track); S.open = j.id; S.msg = j.title + ' added. Open THE DETAILS to say when it comes out and who to ask.'; render(); });
    if ($('add')) $('add').onclick = () => { S.adding = true; S.open = ''; S.trim = ''; render(); $('j_title').focus(); };
    if ($('keepnew')) $('keepnew').onclick = () => { const v = vals(); if (!v.title.trim()) { $('j_title').focus(); return; } const j = F.add(v); S.adding = false; S.msg = j.title + ' added.'; render(); };
    if ($('save')) $('save').onclick = () => { F.set(S.open, vals()); S.msg = 'Saved.'; render(); };
    if ($('del')) $('del').onclick = () => { const j = F.get(S.open); if (!j) return; F.remove(j.id); S.open = ''; S.msg = j.title + ' removed.'; render(); };
    const j = S.open && F.get(S.open);
    if (j && $('a_note')) {
      $('a_note').oninput = e => { F.set(j.id, { askBody: e.target.value }); };
      $('a_subj').oninput = e => { F.set(j.id, { askSubj: e.target.value }); };
      if ($('a_reset')) $('a_reset').onclick = () => { const d = JSON.parse(localStorage.getItem(F.KEY)); const x = d.jobs.find(y => y.id === j.id); delete x.askBody; delete x.askSubj; localStorage.setItem(F.KEY, JSON.stringify(d)); render(); };
      $('a_send').onclick = () => { const a = $('a_send'); a.href = 'mailto:' + encodeURIComponent(askEmail(F.get(j.id))) + '?subject=' + encodeURIComponent($('a_subj').value) + '&body=' + encodeURIComponent($('a_note').value);
        F.set(j.id, { asked: today(), status: 'asked' }); setTimeout(() => { S.msg = 'Asked. It keeps today’s date.'; render(); }, 300); };
    }
    if ($('tr_close')) $('tr_close').onclick = () => { S.open = S.trim; S.trim = ''; render(); };
    const fi = $('tr_file'); if (fi) fi.onchange = () => { const f = fi.files && fi.files[0]; if (!f) return; if (TR.url) URL.revokeObjectURL(TR.url); TR = { file: f, url: URL.createObjectURL(f), dur: 0, inS: 0, outS: 0, busy: false, made: null, stills: TR.stills || [], jid: S.trim }; render(); };
    const v = $('tr_vid');
    if (v) {
      const upd = () => { $('tr_inv').textContent = F.time(TR.inS); $('tr_outv').textContent = F.time(TR.outS); $('tr_len').textContent = 'Clip: ' + F.trim(TR.inS, TR.outS, TR.dur || v.duration).secs + ' seconds.'; };
      v.onloadedmetadata = () => { TR.dur = v.duration || 0; if (!TR.outS) TR.outS = TR.dur; upd(); };
      $('tr_in').onclick = () => { TR.inS = v.currentTime; if (TR.outS && TR.outS <= TR.inS) TR.outS = Math.min(TR.dur || v.duration, TR.inS + 1); upd(); };
      $('tr_out').onclick = () => { TR.outS = Math.max(v.currentTime, TR.inS + 0.2); upd(); };
      $('tr_play').onclick = () => { v.currentTime = TR.inS; v.play().catch(() => { }); const stop = () => { if (v.currentTime >= TR.outS) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); };
      $('tr_still').onclick = async () => {
        const j = F.get(S.trim); if (!j || !v.videoWidth) { S.msg = 'Play the video to a frame first.'; render(); return; }
        try { v.pause(); } catch (e) { }
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); if (!blob) { S.msg = 'This browser couldn’t grab that frame.'; render(); return; }
        const at = F.time(v.currentTime), name = F.clipName(j, 'jpg').replace(/_clip\.jpg$/, '_still_' + at.replace(/[:.]/g, '-') + '.jpg');
        let kept = false; try { if (window.You) { const r = await You.addPhoto(new File([blob], name, { type: 'image/jpeg' }), { kind: 'still', from: { title: j.title, role: j.role, t: Math.round(v.currentTime * 10) / 10 } }); kept = !!(r && r.photo); } } catch (e) { }
        TR.stills = TR.stills.concat([{ name, at, url: URL.createObjectURL(blob) }]);
        S.msg = kept ? 'Still kept with your photos (' + at + '). Pick it for a press kit or your page.' : 'Kept here. Tap it to save it.';
        const t = v.currentTime; render(); const nv = $('tr_vid'); if (nv) nv.addEventListener('loadedmetadata', () => { try { nv.currentTime = t; } catch (e) { } }, { once: true }); };
      $('tr_make').onclick = async () => {
        const j = F.get(S.trim); if (!j || TR.busy || !window.ActorCompress) return;
        const dur = TR.dur || v.duration, t = F.trim(TR.inS, TR.outS, dur); TR.busy = true; render();
        try {
          const out = await ActorCompress.process(TR.file, { h: 1080, mbps: 8, trimStart: t.trimStart, trimEnd: t.trimEnd, onProgress: p => { const b = $('tr_bar'); if (b) b.style.width = Math.round((p || 0) * 100) + '%'; } });
          const blob = out && out.blob ? out.blob : out, ext = /webm/.test(blob.type) ? 'webm' : 'mp4', name = F.clipName(j, ext);
          let hub = false; try { if (window.Takes) { await Takes.put(blob, { kind: 'video', mime: blob.type, ext, name, secs: t.secs, for: { type: 'clip', title: j.title, role: j.role } }); hub = true; } } catch (e) { }
          F.addClip(j.id, { name, secs: t.secs, in: Math.round(t.trimStart * 10) / 10 });
          TR.busy = false; TR.made = { name, secs: t.secs, url: URL.createObjectURL(blob), hub }; render();
        } catch (e) { TR.busy = false; S.msg = 'Couldn’t make the clip: ' + (e.message || 'this browser can’t read that file') + '.'; render(); }
      };
    }
  }
  render();
  (async () => { try { if (window.Offices) { const hb = await Offices.load(); if (hb && hb.credits) { S.credits = F.fromCredits(hb.credits); render(); } } } catch (e) { } })();
  window.FOOTAGE = { render, tr: () => TR, state: S };
})();
