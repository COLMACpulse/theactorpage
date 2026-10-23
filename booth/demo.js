/* VO BOOTH · DEMO: your best reads as one MP3 (VOICE DEMO), and the voices that go on your page.
   Data in shared/vodemo.js. The clips come from your voices in Character Bank, this job's kept reads, or a file.
   Everything in your words; nothing suggested. */
(function () {
  'use strict';
  const VD = window.VODemo, A = window.VOAudio, Y = window.You, B = () => window.__booth;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = {}; const url = async (key, get) => { if (U[key]) return U[key]; const b = await get(); if (!b) return ''; return (U[key] = URL.createObjectURL(b)); };
  let VIEW = 'home', CHARS = [], PICK = '', MSG = '', PLAYER = null;
  const say = t => { MSG = t || ''; const m = $('dmsg'); if (m) m.textContent = MSG; };
  const toast = t => { const el = $('toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3200); };
  const yourName = () => (B() && B().name && B().name()) || (Y && Y.get().name) || '';
  const ch = (on, attr, label) => '<button class="chip sm' + (on ? ' on' : '') + '" ' + attr + '>' + label + '</button>';
  function play(blob) { try { if (PLAYER) { PLAYER.pause(); URL.revokeObjectURL(PLAYER.src); } } catch (e) { } if (!blob) return; PLAYER = new Audio(URL.createObjectURL(blob)); PLAYER.play().catch(() => { }); }
  async function secsOf(blob) { try { const b = await B().decode(blob); return Math.round(b.duration * 10) / 10; } catch (e) { return 0; } }
  const look = c => (c.looks || []).find(l => l.kind !== 'video') || null;

  async function render(m) {
    m = m || $('main'); CHARS = (await VD.chars()).filter(c => !c.me);
    if (VIEW.indexOf('demo:') === 0 && VD.get(VIEW.slice(5))) return demoView(m, VIEW.slice(5));
    if (VIEW.indexOf('voice:') === 0 && CHARS.some(c => c.id === VIEW.slice(6))) return voiceView(m, VIEW.slice(6));
    VIEW = 'home'; return homeView(m);
  }

  /* ---------- the tab: your demos, your voices ---------- */
  async function homeView(m) {
    const D = VD.all();
    let h = '<p class="dim">Your best reads as one file, and a page with every voice you do.</p>'
      + '<div class="row"><button class="btn pri" id="dnew">MAKE A DEMO</button><a class="btn ghost" href="../hub/?tab=package" id="dpage">YOUR VOICE PAGE</a></div>'
      + '<div class="card hide" id="dnewbox" style="margin-top:10px"><label class="lab" for="dn">THE DEMO, IN YOUR WORDS</label><input class="field" id="dn" autocomplete="off"><div class="row" style="margin-top:8px"><button class="btn pri sm" id="dgo">ADD IT</button><button class="btn ghost sm" id="dx">CANCEL</button></div></div>'
      + '<p class="msg' + (MSG ? '' : ' hide') + '" id="dmsg" role="status">' + esc(MSG) + '</p>';
    h += '<div class="card"><p class="kicker">Your demos</p>' + (D.length ? D.map(x => { const t = VD.runTime(x);
      return '<button class="it" style="width:100%;background:none;border:0;border-bottom:1px solid var(--line);color:inherit;text-align:left;cursor:pointer" data-open="' + x.id + '"><div class="w"><b>' + esc(x.name) + '</b><small>' + x.clips.length + ' clip' + (x.clips.length === 1 ? '' : 's') + ' · ' + esc(VD.targetWords(t, x.target)) + '</small></div><small style="color:' + (x.made && !x.made.stale ? '#8fbf8a' : 'var(--faint)') + '">' + (x.made ? (x.made.stale ? 'CHANGED SINCE' : 'MP3 MADE') : 'NOT MADE YET') + '</small></button>'; }).join('') : '<p class="faint small" style="margin:0">None yet. Make one when you want to.</p>') + '</div>';
    h += '<div class="card"><p class="kicker">Your voices</p>';
    if (!CHARS.length) h += '<p class="faint small" style="margin:0">Your voices live in Character Bank: the recordings and the pictures. Add one there and it shows up here.</p><div class="row" style="margin-top:8px"><a class="btn sm" href="../cps/">CHARACTER BANK</a></div>';
    else { h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">';
      for (const c of CHARS) { const l = look(c), u = l ? await url(l.id, () => VD.cpsMedia(l.id)) : '', v = VD.voice(c.id);
        h += '<button type="button" data-voice="' + c.id + '" style="background:none;border:0;color:inherit;padding:0;text-align:left;cursor:pointer"><span style="display:block;aspect-ratio:1;border-radius:8px;overflow:hidden;background:var(--panel2);border:1px ' + (u ? 'solid' : 'dashed') + ' var(--line)">' + (u ? '<img src="' + u + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '') + '</span><span style="display:block;font-size:13px;margin-top:4px">' + esc(c.name || 'Unnamed') + '</span><small class="faint">' + (v.onPage ? 'on your page' : '') + '</small></button>'; }
      h += '</div><p class="faint small" style="margin:8px 0 0">The same recordings and pictures as in Character Bank. Add one there and it shows up here.</p>'; }
    h += '</div>';
    m.innerHTML = h;
    $('dnew').onclick = () => { $('dnewbox').classList.remove('hide'); $('dn').focus(); };
    $('dx').onclick = () => $('dnewbox').classList.add('hide');
    const add = () => { const it = VD.add($('dn').value); if (!it) return say('Give it a name first, in your words.'); MSG = ''; VIEW = 'demo:' + it.id; render(m); };
    $('dgo').onclick = add; $('dn').onkeydown = e => { if (e.key === 'Enter') add(); };
    m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { MSG = ''; VIEW = 'demo:' + b.dataset.open; render(m); window.scrollTo(0, 0); });
    m.querySelectorAll('[data-voice]').forEach(b => b.onclick = () => { MSG = ''; VIEW = 'voice:' + b.dataset.voice; render(m); window.scrollTo(0, 0); });
  }

  /* ---------- one demo ---------- */
  async function demoView(m, id) {
    const x = VD.get(id), t = VD.runTime(x), over = x.target && t > x.target;
    let h = '<button class="btn ghost sm" id="dback">&larr; YOUR DEMOS</button>'
      + '<label class="lab" for="dname" style="margin-top:12px">THE DEMO, IN YOUR WORDS</label><input class="field" id="dname" value="' + esc(x.name) + '">'
      + '<p class="lab" style="margin-top:12px">HOW LONG YOU WANT IT</p><div class="row">' + VD.TARGETS.map(s => ch(x.target === s, 'data-tg="' + s + '"', s ? VD.mm(s) : 'NO TARGET')).join('') + '</div>'
      + '<div class="card" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b style="font-size:22px;font-weight:500">' + VD.mm(t) + '</b><small style="color:' + (over ? 'var(--bad)' : '#8fbf8a') + '">' + esc(VD.targetWords(t, x.target).replace(/^[\d:]+ /, '').toUpperCase()) + '</small></div>'
      + (x.target ? '<div style="height:8px;border-radius:4px;background:var(--line);overflow:hidden;margin-top:6px"><div style="width:' + Math.min(100, Math.round(t / x.target * 100)) + '%;height:100%;background:' + (over ? 'var(--bad)' : 'var(--tung)') + '"></div></div>' : '')
      + '<small class="faint">Clips as you trimmed them, plus the gaps between them.</small></div>';
    h += '<div class="card"><p class="kicker">In this order</p>' + (x.clips.length ? x.clips.map((c, i) => '<div class="it" style="flex-wrap:wrap"><span class="n">' + (i + 1) + '</span><div class="w"><b>' + esc(c.label) + '</b><small>' + esc(VD.mm(VD.clipSecs(c))) + ' · ' + ({ cps: 'from your voices', booth: 'from a VO BOOTH read', file: 'from a file' })[c.from] + '</small></div>'
      + '<div class="row" style="width:100%;padding-left:32px;margin-top:4px"><button class="btn sm ghost" data-cplay="' + c.id + '" aria-label="Play">&#9654;</button>' + (i ? '<button class="btn sm ghost" data-cup="' + c.id + '" aria-label="Move up">&uarr;</button>' : '') + (i < x.clips.length - 1 ? '<button class="btn sm ghost" data-cdn="' + c.id + '" aria-label="Move down">&darr;</button>' : '') + '<button class="btn sm ghost" data-ctrim="' + c.id + '">TRIM</button><button class="btn sm ghost" data-cx="' + c.id + '" aria-label="Take it out">&times;</button></div>'
      + (PICK === 'trim:' + c.id ? '<div class="row" style="width:100%;margin-top:6px"><label class="small dim">Off the start <input class="field" style="width:84px;display:inline-block" type="number" min="0" step="0.1" id="tin" value="' + (+c.trimIn || 0) + '"> s</label><label class="small dim">Off the end <input class="field" style="width:84px;display:inline-block" type="number" min="0" step="0.1" id="tout" value="' + (+c.trimOut || 0) + '"> s</label><button class="btn sm" data-tset="' + c.id + '">SET</button></div>' : '') + '</div>').join('') : '<p class="faint small" style="margin:0">No clips yet.</p>') + '</div>';
    h += '<p class="lab">ADD A CLIP</p><div class="row"><button class="btn sm' + (PICK === 'cps' ? ' pri' : '') + '" id="fromcps">FROM YOUR VOICES</button><button class="btn sm' + (PICK === 'booth' ? ' pri' : '') + '" id="frombooth">FROM A VO BOOTH READ</button><label class="btn sm" style="position:relative;overflow:hidden">A FILE<input type="file" id="fromfile" accept="audio/*,.mp3,.wav,.m4a,.aif,.aiff" style="position:absolute;inset:0;opacity:0"></label></div>';
    if (PICK === 'cps') { h += '<div class="card" style="margin-top:8px">';
      if (!CHARS.length) h += '<p class="faint small" style="margin:0">No voices in Character Bank yet.</p>';
      CHARS.forEach(c => { const tk = (c.takes || []).filter(k => k.kind !== 'note'); if (!tk.length) return;
        h += '<p class="kicker" style="margin-top:6px">' + esc(c.name || 'Unnamed') + '</p>' + tk.map((k, i) => '<div class="it"><div class="w"><b>' + esc(k.name || ('Take ' + (i + 1))) + '</b><small>' + esc(new Date(k.at || 0).toLocaleDateString()) + '</small></div><button class="btn sm ghost" data-pv="' + k.id + '" aria-label="Play">&#9654;</button><button class="btn sm" data-addcps="' + c.id + '|' + k.id + '">ADD</button></div>').join(''); });
      h += '</div>'; }
    if (PICK === 'booth') { const P = B().plan(B().job()).filter(p => B().keptOf(p.key)); h += '<div class="card" style="margin-top:8px">' + (P.length ? P.map(p => '<div class="it"><div class="w"><b>' + esc(p.label) + '</b><small>' + esc(p.spot || '') + '</small></div><button class="btn sm" data-addbooth="' + esc(p.key) + '">ADD</button></div>').join('') : '<p class="faint small" style="margin:0">No kept reads in this job yet. Read on READ and keep a take.</p>') + '</div>'; }
    h += '<p class="lab" style="margin-top:12px">GAP BETWEEN CLIPS</p><div class="row">' + VD.GAPS.map(g => ch(x.gap === g, 'data-gap="' + g + '"', g + ' S')).join('') + '</div>'
      + '<p class="lab" style="margin-top:10px">LEVEL</p><div class="row">' + VD.LEVELS.map(([v, l]) => ch(x.level === v, 'data-lv="' + v + '"', l.toUpperCase() + ' (' + v + ')')).join('') + '</div>'
      + '<p class="faint small">One level for every clip, the loudest peak held under -3 dB.</p>'
      + '<div class="row" style="margin-top:12px"><button class="btn pri big" id="dmake"' + (x.clips.length ? '' : ' disabled') + '>MAKE THE MP3</button></div><div id="dmade"></div>'
      + '<label class="row small" style="margin-top:12px"><input type="checkbox" id="donpage"' + (x.onPage ? ' checked' : '') + ' style="width:20px;height:20px"> On your voice page</label>'
      + '<p class="msg' + (MSG ? '' : ' hide') + '" id="dmsg" role="status">' + esc(MSG) + '</p>'
      + '<div class="row" style="margin-top:18px"><button class="btn ghost sm" id="ddel">DELETE THIS DEMO</button></div>';
    m.innerHTML = h; MSG = '';
    if (x.made && x.made.media) showMade(x);
    $('dback').onclick = () => { PICK = ''; VIEW = 'home'; render(m); };
    $('dname').onchange = () => VD.set(id, { name: $('dname').value });
    m.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { VD.set(id, { target: +b.dataset.tg }); render(m); });
    m.querySelectorAll('[data-gap]').forEach(b => b.onclick = () => { VD.set(id, { gap: +b.dataset.gap, made: x.made ? Object.assign({}, x.made, { stale: true }) : null }); render(m); });
    m.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => { VD.set(id, { level: +b.dataset.lv, made: x.made ? Object.assign({}, x.made, { stale: true }) : null }); render(m); });
    m.querySelectorAll('[data-cplay]').forEach(b => b.onclick = async () => { const c = x.clips.find(k => k.id === b.dataset.cplay); play(c && await VD.blob(c.media)); });
    m.querySelectorAll('[data-pv]').forEach(b => b.onclick = async () => play(await VD.cpsMedia(b.dataset.pv)));
    m.querySelectorAll('[data-cup]').forEach(b => b.onclick = () => { VD.moveClip(id, b.dataset.cup, -1); render(m); });
    m.querySelectorAll('[data-cdn]').forEach(b => b.onclick = () => { VD.moveClip(id, b.dataset.cdn, 1); render(m); });
    m.querySelectorAll('[data-cx]').forEach(b => b.onclick = async () => { await VD.dropClip(id, b.dataset.cx); render(m); });
    m.querySelectorAll('[data-ctrim]').forEach(b => b.onclick = () => { PICK = PICK === 'trim:' + b.dataset.ctrim ? '' : 'trim:' + b.dataset.ctrim; render(m); });
    m.querySelectorAll('[data-tset]').forEach(b => b.onclick = () => { const c = x.clips.find(k => k.id === b.dataset.tset), a = Math.max(0, +$('tin').value || 0), z = Math.max(0, +$('tout').value || 0);
      if (a + z >= (c.secs || 0)) { say('That trims the whole clip.'); return; } VD.setClip(id, c.id, { trimIn: a, trimOut: z }); PICK = ''; render(m); });
    $('fromcps').onclick = () => { PICK = PICK === 'cps' ? '' : 'cps'; render(m); };
    $('frombooth').onclick = () => { PICK = PICK === 'booth' ? '' : 'booth'; render(m); };
    const addBlob = async (blob, label, from) => { const secs = await secsOf(blob); if (!secs) { say('This phone couldn\'t read that sound. Try an MP3, WAV or M4A.'); return; } const media = await VD.keep(blob); if (!media) { say('This phone would not keep it.'); return; } VD.addClip(id, { label, from, secs, media }); PICK = ''; render(m); };
    m.querySelectorAll('[data-addcps]').forEach(b => b.onclick = async () => { const [cid, tid] = b.dataset.addcps.split('|'), c = CHARS.find(k => k.id === cid), t = c && c.takes.find(k => k.id === tid); const blob = await VD.cpsMedia(tid); if (!blob) return say('That recording isn\'t on this device any more.'); addBlob(blob, (c.name || 'Unnamed') + (t && t.name ? ' · ' + t.name : ''), 'cps'); });
    m.querySelectorAll('[data-addbooth]').forEach(b => b.onclick = async () => { const p = B().plan(B().job()).find(q => q.key === b.dataset.addbooth), k = B().keptOf(b.dataset.addbooth), blob = k && await B().get(k.id); if (!blob) return say('That take isn\'t on this device any more.'); addBlob(blob, (p && p.label ? p.label.slice(0, 60) : 'Read'), 'booth'); });
    $('fromfile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) addBlob(f, f.name.replace(/\.[^.]+$/, ''), 'file'); };
    $('dmake').onclick = () => make(id, m);
    $('donpage').onchange = () => VD.set(id, { onPage: $('donpage').checked });
    $('ddel').onclick = async () => { if (!confirm('Delete this demo and its clips? Your voices in Character Bank stay.')) return; await VD.remove(id); VIEW = 'home'; MSG = 'Deleted.'; render(m); };
  }
  async function make(id, m) {
    const x = VD.get(id), box = $('dmade'); box.innerHTML = '<p class="dim">Making it…</p>';
    try {
      const clips = [];
      for (const c of x.clips) { const b = await VD.blob(c.media); if (!b) continue; let d = await B().to441(await B().decode(b)); const a = Math.round((+c.trimIn || 0) * 44100), z = d.length - Math.round((+c.trimOut || 0) * 44100); if (a || z < d.length) d = d.slice(a, Math.max(a + 1, z)); clips.push({ data: d, rate: 44100, after: 'line' }); }
      if (!clips.length) { box.innerHTML = '<div class="msg bad">None of the clips are on this device any more.</div>'; return; }
      const out = A.build(clips, { target: x.level, gap: x.gap, lead: 0.3, room: null }), bytes = A.mp3(out.data, 44100, 128), blob = new Blob([bytes], { type: 'audio/mpeg' });
      if (x.made && x.made.media) await VD.drop(x.made.media);
      const media = await VD.keep(blob), fn = VD.fileName(yourName(), x.name);
      VD.set(id, { made: { media, secs: out.secs, lufs: out.lufs, peak: out.peak, bytes: blob.size, fn, at: Date.now(), n: clips.length } });
      await render(m);
    } catch (e) { box.innerHTML = '<div class="msg bad">It couldn\'t make the file: ' + esc(e.message || e) + '</div>'; }
  }
  async function showMade(x) {
    const box = $('dmade'); if (!box || !x.made) return; const b = await VD.blob(x.made.media); if (!b) { box.innerHTML = ''; return; }
    const u = URL.createObjectURL(b), M = x.made;
    box.innerHTML = '<div class="card" style="margin-top:10px;border-color:' + (M.stale ? 'var(--line)' : '#2f4a2e') + '"><p class="kicker" style="color:' + (M.stale ? 'var(--faint)' : '#8fbf8a') + '">' + (M.stale ? 'MADE BEFORE YOUR LAST CHANGE · MAKE IT AGAIN' : 'MADE') + ' · ' + esc(M.fn) + '</p><audio controls src="' + u + '" style="width:100%"></audio>'
      + '<p class="dim small">' + VD.mm(M.secs) + ' · ' + (M.n || x.clips.length) + ' clips · every clip brought to one level, ' + M.lufs + ' LUFS · loudest peak ' + M.peak + ' dB · dead air trimmed · MP3 128 kbps, mono, 44.1 kHz · ' + (M.bytes / 1048576).toFixed(1) + ' MB</p>'
      + '<div class="row"><a class="btn pri sm" href="' + u + '" download="' + esc(M.fn) + '">SAVE IT</a>' + (navigator.canShare ? '<button class="btn sm" id="dshare">SHARE</button>' : '') + '</div></div>';
    wireMade(x, b);
  }
  function wireMade(x, b) { const s = $('dshare'); if (!s) return; s.onclick = async () => { const blob = b || await VD.blob(x.made.media); const f = new File([blob], x.made.fn, { type: 'audio/mpeg' }); try { if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: x.made.fn }); else toast('This phone can\'t share a file from here. Use SAVE IT.'); } catch (e) { } }; }

  /* ---------- one voice: what goes on your page ---------- */
  async function voiceView(m, cid) {
    const c = CHARS.find(k => k.id === cid), v = VD.voice(cid), tk = (c.takes || []).filter(k => k.kind !== 'note'), photos = (c.looks || []).filter(l => l.kind !== 'video');
    const cur = photos.find(l => l.id === v.look) || photos[0], pageTake = tk.find(k => k.id === v.take) || tk[tk.length - 1];
    let h = '<button class="btn ghost sm" id="vback">&larr; YOUR VOICES</button><h2 style="margin:12px 0 4px;font-weight:500">' + esc(c.name || 'Unnamed') + '</h2>';
    h += '<p class="lab" style="margin-top:8px">THE PICTURE</p>';
    if (photos.length) { h += '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">'; for (const l of photos) { const u = await url(l.id, () => VD.cpsMedia(l.id)); h += '<button type="button" data-look="' + l.id + '" aria-label="Use this picture" style="padding:0;border-radius:8px;overflow:hidden;aspect-ratio:1;border:2px solid ' + (cur && cur.id === l.id ? 'var(--tung)' : 'var(--line)') + ';background:var(--panel2)">' + (u ? '<img src="' + u + '" alt="" style="width:100%;height:100%;object-fit:cover">' : '') + '</button>'; } h += '</div>'; }
    else h += '<p class="faint small">No picture in Character Bank for this voice. The page shows the name on its own.</p>';
    h += '<label class="lab" for="vline" style="margin-top:12px">A LINE UNDER IT (OPTIONAL)</label><input class="field" id="vline" value="' + esc(v.line) + '">';
    h += '<p class="lab" style="margin-top:12px">THE TAKE THAT PLAYS ON YOUR PAGE</p>' + (tk.length ? tk.map((k, i) => '<div class="it"><button class="btn sm ghost" data-vp="' + k.id + '" aria-label="Play">&#9654;</button><div class="w"><b>' + esc(k.name || ('Take ' + (i + 1))) + '</b><small>' + esc(new Date(k.at || 0).toLocaleDateString()) + (k.id === c.refId ? ' · your reference take' : '') + '</small></div>' + (pageTake && pageTake.id === k.id ? '<small style="color:var(--tung)">PLAYS ON THE PAGE</small>' : '<button class="btn sm" data-vt="' + k.id + '">USE THIS ONE</button>') + '</div>').join('') : '<p class="faint small">No takes yet. Record one in Character Bank.</p>');
    h += '<label class="row small" style="margin-top:12px"><input type="checkbox" id="von"' + (v.onPage ? ' checked' : '') + (tk.length ? '' : ' disabled') + ' style="width:20px;height:20px"> On your voice page</label>';
    h += '<div class="card" style="margin-top:14px;border-color:#2a5fa8"><p class="kicker" style="color:#8fb6ec">CALLED BACK FOR THIS VOICE?</p><p class="small dim" style="margin:0 0 8px">Get back into it in Character Bank: record it fresh, then hear it against your reference take, with the pitch, range and pace side by side.</p><div class="row"><a class="btn sm" style="background:#2a5fa8;border-color:#2a5fa8;color:#fff" href="../cps/?c=' + encodeURIComponent(cid) + '&tab=back">COME BACK TO THIS VOICE</a><a class="btn sm ghost" href="../cps/?c=' + encodeURIComponent(cid) + '&tab=capture">RECORD A TAKE THERE</a></div></div>'
      + '<p class="faint small">This is the same voice as in Character Bank. Your notes there stay there; only the name, the line under it, the picture and the take you pick go on the page.</p>';
    m.innerHTML = h;
    $('vback').onclick = () => { VIEW = 'home'; render(m); };
    $('vline').onchange = () => VD.setVoice(cid, { line: $('vline').value.trim() });
    $('von').onchange = () => VD.setVoice(cid, { onPage: $('von').checked });
    m.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { VD.setVoice(cid, { look: b.dataset.look }); render(m); });
    m.querySelectorAll('[data-vt]').forEach(b => b.onclick = () => { VD.setVoice(cid, { take: b.dataset.vt }); render(m); });
    m.querySelectorAll('[data-vp]').forEach(b => b.onclick = async () => play(await VD.cpsMedia(b.dataset.vp)));
  }
  window.BoothDemo = { render, open: v => { VIEW = v || 'home'; } };
})();
