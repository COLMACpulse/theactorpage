/* FOOTAGE page: what needs you, every job and where its footage stands, how to get it, and a trimmer for your own file. */
(function () {
  'use strict';
  const F = window.Footage, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { filter: '', open: '', adding: false, trim: '', msg: '', credits: [] };
  const today = () => new Date().toISOString().slice(0, 10);
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  const names = () => { try { return window.Contacts ? Contacts.names({}) : []; } catch (e) { return []; } };
  let TR = { file: null, url: '', dur: 0, inS: 0, outS: 0, busy: false, made: null };

  function form(j) {
    const v = k => esc(j ? j[k] || '' : '');
    return '<div class="grid2"><div><label class="lab" for="j_title">PROJECT</label><input class="field" id="j_title" value="' + v('title') + '"></div>'
      + '<div><label class="lab" for="j_role">YOUR ROLE</label><input class="field" id="j_role" value="' + v('role') + '"></div>'
      + '<div><label class="lab" for="j_kind">WHAT IT IS</label><select class="field" id="j_kind">' + opts(F.KINDS, j ? j.kind : 'tv') + '</select></div>'
      + '<div><label class="lab" for="j_ep">EPISODE</label><input class="field" id="j_ep" value="' + v('episode') + '" placeholder="Ep. 104, or leave it"></div>'
      + '<div><label class="lab" for="j_out">COMES OUT, OR CAME OUT</label><input class="field" type="date" id="j_out" value="' + v('out') + '"></div>'
      + '<div><label class="lab" for="j_where">WHERE IT AIRS OR STREAMS</label><input class="field" id="j_where" value="' + v('where') + '"></div>'
      + '<div><label class="lab" for="j_status">WHERE IT STANDS</label><select class="field" id="j_status"><option value="">Go by the date</option>' + opts(F.STATUS, j ? j.status : '') + '</select></div>'
      + '<div><label class="lab" for="j_ask">WHO TO ASK FOR IT</label><input class="field" id="j_ask" list="asklist" value="' + v('ask') + '" placeholder="The producer, the editor, your rep"></div>'
      + '<div><label class="lab" for="j_asked">ASKED ON</label><input class="field" type="date" id="j_asked" value="' + v('asked') + '"></div>'
      + '<div><label class="lab" for="j_next">FOLLOW UP ON</label><input class="field" type="date" id="j_next" value="' + v('next') + '"></div></div>'
      + '<datalist id="asklist">' + names().map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>'
      + '<label class="lab" for="j_note">NOTE</label><textarea class="field" id="j_note" rows="2" placeholder="Your scene is at about 32 minutes. The editor said end of the month.">' + v('note') + '</textarea>';
  }
  const vals = () => ({ title: $('j_title').value, role: $('j_role').value, kind: $('j_kind').value, episode: $('j_ep').value, out: $('j_out').value, where: $('j_where').value, status: $('j_status').value, ask: $('j_ask').value, asked: $('j_asked').value, next: $('j_next').value, note: $('j_note').value });

  function trimmer(j) {
    let h = '<div class="card" id="trimbox"><p class="kick">TRIM A CLIP · ' + esc(j.title.toUpperCase()) + '</p>';
    h += '<p class="dim small" style="margin:0 0 8px">Pick the file you have. Play to where your moment starts, tap SET IN; to where it ends, SET OUT. It stays on this device.</p>';
    h += '<label class="btn ghost">PICK THE VIDEO<input type="file" id="tr_file" accept="video/*" hidden></label>';
    if (TR.url) {
      h += '<video class="vid" id="tr_vid" src="' + TR.url + '" controls playsinline preload="metadata" style="margin-top:10px"></video>'
        + '<div class="row" style="margin-top:10px"><button class="btn quiet" id="tr_in">SET IN · <span id="tr_inv">' + F.time(TR.inS) + '</span></button><button class="btn quiet" id="tr_out">SET OUT · <span id="tr_outv">' + F.time(TR.outS) + '</span></button><button class="btn quiet" id="tr_play">&#9654; PLAY THE CLIP</button></div>'
        + '<p class="small dim" id="tr_len">Clip: ' + F.trim(TR.inS, TR.outS, TR.dur).secs + ' seconds.</p>'
        + '<div class="card" style="margin:10px 0" id="stillbox"><p class="kick">A STILL FROM YOUR FOOTAGE</p><p class="dim small" style="margin:0 0 8px">Stills from a job are hard to get. Pause on a frame you like and keep it: it goes with your photos, ready for a press kit, your page or key art. Never your main headshot.</p><div class="row"><button class="btn ghost" id="tr_still">GRAB THIS FRAME</button></div>'
          + (TR.stills && TR.stills.length ? '<div class="row" style="margin-top:8px">' + TR.stills.map(x => '<a href="' + x.url + '" download="' + esc(x.name) + '" title="Save to phone" style="display:inline-block;width:96px"><img src="' + x.url + '" alt="Still at ' + esc(x.at) + '" style="width:96px;border-radius:6px;display:block"><span class="mut small">' + esc(x.at) + '</span></a>').join('') + '</div><p class="mut small" style="margin:6px 0 0">Tap one to save it to your phone too.</p>' : '') + '</div>'
        + '<div class="row"><button class="btn" id="tr_make"' + (TR.busy ? ' disabled' : '') + '>' + (TR.busy ? 'MAKING IT…' : 'MAKE THE CLIP') + '</button></div>'
        + '<div class="prog" id="tr_prog"' + (TR.busy ? '' : ' hidden') + '><i id="tr_bar"></i></div><p class="mut small" id="tr_wait"' + (TR.busy ? '' : ' hidden') + '>It plays the clip through once to make it, so it takes as long as the clip runs.</p>';
    }
    if (TR.made) h += '<div class="card" style="margin-top:10px" id="tr_done"><p class="kick">YOUR CLIP</p><p class="small">' + esc(TR.made.name) + ' · ' + TR.made.secs + ' seconds.' + (TR.made.hub ? ' It’s in your Hub’s library too, ready for your page.' : '') + '</p><div class="row"><a class="btn" id="tr_save" href="' + TR.made.url + '" download="' + esc(TR.made.name) + '">SAVE TO PHONE</a><a class="btn ghost" href="../archbook/">TAG IT IN REEL ROOM</a></div></div>';
    return h + '<div class="row" style="margin-top:10px"><button class="btn quiet" id="tr_close">CLOSE</button></div></div>';
  }
  function jobRow(j) {
    const s = F.status(j, today());
    return '<button type="button" class="person" data-open="' + j.id + '"><span class="tag">' + esc(F.statusName(s).toUpperCase()) + '</span><b>' + esc(j.title) + '</b>' + (j.role ? '<span class="rl">' + esc(j.role.toUpperCase()) + '</span>' : '')
      + '<span class="from">' + esc([F.kindName(j.kind), j.episode, j.where, j.out ? (j.out > today() ? 'out ' : 'came out ') + j.out : ''].filter(Boolean).join(' · ')) + '</span>'
      + ((j.clips || []).length ? '<span class="from">' + j.clips.length + ' clip' + (j.clips.length === 1 ? '' : 's') + ' made</span>' : '') + '</button>';
  }
  function render() {
    const day = today(), al = F.alerts(day), c = F.counts(day), jobs = F.jobs().filter(j => !S.filter || F.status(j, day) === S.filter).sort((a, b) => String(b.out || '').localeCompare(String(a.out || '')));
    let h = '';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    if (al.length) h += '<div class="card" id="needs"><p class="kick">WHAT NEEDS YOU</p>' + al.map(a => '<p class="small" style="margin:4px 0"><a href="#" data-open="' + a.id + '">' + esc(a.line) + '</a></p>').join('') + '</div>';
    h += '<div class="row"><button class="btn" id="add">ADD A JOB</button><a class="btn quiet" href="check.html" id="tocheck">CHECK THE COPY</a><span class="mut small">before you erase a camera card</span></div>';
    h += '<div class="chips" role="group" aria-label="Show">' + [['', 'All', F.jobs().length]].concat(F.STATUS.map(([k, l]) => [k, l, c[k]])).map(([k, l, n]) => '<button type="button" class="chip' + (S.filter === k ? ' on' : '') + '" data-f="' + k + '">' + esc(l.toUpperCase()) + ' ' + n + '</button>').join('') + '</div>';
    if (S.adding) h += '<div class="card" id="detail"><p class="kick">ADD A JOB</p>' + form(null) + '<div class="row" style="margin-top:12px"><button class="btn" id="keepnew">ADD</button><button class="btn quiet" data-close>CANCEL</button></div></div>';
    if (S.open && !S.trim) { const j = F.get(S.open); if (j) h += '<div class="card" id="detail"><p class="kick">' + esc(F.statusName(F.status(j, day)).toUpperCase()) + '</p>' + form(j)
      + ((j.clips || []).length ? '<p class="small mut" style="margin:10px 0 0">Clips: ' + esc(j.clips.map(x => x.name + ' (' + x.secs + 's)').join(', ')) + '</p>' : '')
      + '<div class="row" style="margin-top:12px"><button class="btn" id="save">SAVE</button><button class="btn ghost" id="totrim">TRIM A CLIP</button>' + (j.ask && window.Contacts ? '<a class="btn quiet" href="../contacts/?who=' + encodeURIComponent(j.ask) + '">' + esc(j.ask.toUpperCase()) + ' IN CONTACTS</a>' : '') + '<button class="btn quiet" data-close>CLOSE</button><button class="btn quiet" id="del" style="margin-left:auto">REMOVE</button></div></div>'; }
    if (S.trim) { const j = F.get(S.trim); if (j) h += trimmer(j); }
    h += jobs.length ? jobs.map(jobRow).join('') : '<p class="empty">' + (S.filter ? 'Nothing here for that.' : 'No jobs yet. Add one, or track a credit from your Hub below.') + '</p>';
    if (S.credits.length) h += '<div class="card"><p class="kick">FROM YOUR HUB CREDITS</p><p class="dim small" style="margin:0 0 8px">Credits you aren’t tracking footage for yet.</p>' + S.credits.map((x, i) => '<div class="row" style="justify-content:space-between;margin:6px 0"><span>' + esc(x.title) + (x.role ? ' <span class="mut small">' + esc(x.role) + '</span>' : '') + '</span><button class="btn quiet" data-track="' + i + '">TRACK IT</button></div>').join('') + '</div>';
    h += '<div class="card"><p class="kick">HOW TO GET YOUR FOOTAGE</p><ol class="how small"><li>Ask production: the producer, the production coordinator or the editor. Many send a link once it’s out. Ask nicely, and say it’s for your reel.</li><li>Ask your rep. They often have a way in.</li><li>Buy the episode or the film where it’s sold, and keep the file.</li><li>Set a follow-up date. People mean to send it, and forget.</li></ol><p class="mut small" style="margin:8px 0 0">This page never downloads anything from a streaming site. Trim the file you have, here, on your device.</p></div>';
    $('view').innerHTML = h; S.msg = ''; wire();
  }
  function wire() {
    const V = $('view');
    V.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { S.filter = b.dataset.f; render(); });
    V.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.preventDefault(); S.open = b.dataset.open; S.adding = false; S.trim = ''; render(); const d = $('detail'); if (d) d.scrollIntoView({ block: 'nearest' }); });
    V.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { S.open = ''; S.adding = false; render(); });
    V.querySelectorAll('[data-track]').forEach(b => b.onclick = () => { const x = S.credits[+b.dataset.track]; const j = F.add(x); S.credits = S.credits.filter((_, i) => i !== +b.dataset.track); S.open = j.id; S.msg = 'Tracking ' + j.title + '.'; render(); });
    if ($('add')) $('add').onclick = () => { S.adding = true; S.open = ''; S.trim = ''; render(); $('j_title').focus(); };
    if ($('keepnew')) $('keepnew').onclick = () => { const v = vals(); if (!v.title.trim()) { $('j_title').focus(); return; } const j = F.add(v); S.adding = false; S.msg = j.title + ' added.'; render(); };
    if ($('save')) $('save').onclick = () => { F.set(S.open, vals()); S.msg = 'Saved.'; render(); };
    if ($('del')) $('del').onclick = () => { const j = F.get(S.open); if (!j) return; F.remove(j.id); S.open = ''; S.msg = j.title + ' removed.'; render(); };
    if ($('totrim')) $('totrim').onclick = () => { F.set(S.open, vals()); S.trim = S.open; render(); $('trimbox').scrollIntoView({ block: 'start' }); };
    if ($('tr_close')) $('tr_close').onclick = () => { S.trim = ''; render(); };
    const fi = $('tr_file'); if (fi) fi.onchange = () => { const f = fi.files && fi.files[0]; if (!f) return; if (TR.url) URL.revokeObjectURL(TR.url); TR = { file: f, url: URL.createObjectURL(f), dur: 0, inS: 0, outS: 0, busy: false, made: null }; render();
      const v = $('tr_vid'); v.onloadedmetadata = () => { TR.dur = v.duration || 0; TR.outS = TR.dur; $('tr_outv').textContent = F.time(TR.outS); $('tr_len').textContent = 'Clip: ' + F.trim(TR.inS, TR.outS, TR.dur).secs + ' seconds.'; }; };
    const v = $('tr_vid');
    if (v) {
      if (TR.dur) { /* keep the place */ }
      v.onloadedmetadata = v.onloadedmetadata || (() => { TR.dur = v.duration || 0; if (!TR.outS) TR.outS = TR.dur; });
      const upd = () => { $('tr_inv').textContent = F.time(TR.inS); $('tr_outv').textContent = F.time(TR.outS); $('tr_len').textContent = 'Clip: ' + F.trim(TR.inS, TR.outS, TR.dur || v.duration).secs + ' seconds.'; };
      $('tr_in').onclick = () => { TR.inS = v.currentTime; if (TR.outS && TR.outS <= TR.inS) TR.outS = Math.min(TR.dur || v.duration, TR.inS + 1); upd(); };
      $('tr_out').onclick = () => { TR.outS = Math.max(v.currentTime, TR.inS + 0.2); upd(); };
      $('tr_play').onclick = () => { v.currentTime = TR.inS; v.play().catch(() => { }); const stop = () => { if (v.currentTime >= TR.outS) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); };
      $('tr_still').onclick = async () => {
        const j = F.get(S.trim); if (!j || !v.videoWidth) { S.msg = 'Play the video to a frame first.'; render(); return; }
        try { v.pause(); } catch (e) { }
        const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92)); if (!blob) { S.msg = 'This browser couldn\u2019t grab that frame.'; render(); return; }
        const at = F.time(v.currentTime), name = F.clipName(j, 'jpg').replace(/_clip\.jpg$/, '_still_' + at.replace(/[:.]/g, '-') + '.jpg');
        let kept = false; try { if (window.You) { const r = await You.addPhoto(new File([blob], name, { type: 'image/jpeg' }), { kind: 'still', from: { title: j.title, role: j.role, t: Math.round(v.currentTime * 10) / 10 } }); kept = !!(r && r.photo); } } catch (e) { }
        TR.stills = (TR.stills || []).concat([{ name, at, url: URL.createObjectURL(blob) }]);
        S.msg = kept ? 'Still kept with your photos (' + at + '). Pick it for a press kit, your page or key art.' : 'Grabbed. Tap it to save it to your phone.';
        const t = v.currentTime; render(); const nv = $('tr_vid'); if (nv) { nv.addEventListener('loadedmetadata', () => { try { nv.currentTime = t; } catch (e) { } }, { once: true }); } };
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
