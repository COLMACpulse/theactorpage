/* LOOKS: your looks, one look (photos, and an optional live one: shared/liveshot.js), the look book. Data and the book page in shared/looks.js.
   Everything is in the user's words. Nothing is filled in or suggested. */
(function () {
  'use strict';
  const L = window.Looks, Y = window.You, $ = id => document.getElementById(id), V = $('view');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const URLS = {};
  let MSG = '', PICKING = false;
  const say = t => { MSG = t || ''; const m = $('msg'); if (m) m.textContent = MSG; };
  async function url(ref) { if (!ref) return ''; if (URLS[ref]) return URLS[ref]; const b = await L.blob(ref); if (!b) return ''; return (URLS[ref] = URL.createObjectURL(b)); }
  function go(q) { history.replaceState(null, '', location.pathname + (q ? '?' + q : '')); PICKING = false; route(); }
  function route() { const p = new URLSearchParams(location.search); if (p.get('l') && L.get(p.get('l'))) return one(p.get('l')); if (p.get('book') !== null) return book(); list(); }
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const you = () => (Y ? Y.get() : {});

  const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const mmss = x => { x = Math.max(0, Math.round(x || 0)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
  const SIL = '<svg class="sil" viewBox="0 0 120 130" aria-hidden="true"><circle cx="60" cy="48" r="26"/><path d="M8 130c6-34 26-50 52-50s46 16 52 50z"/></svg>';
  const vid = (u, poster, cls) => '<video class="' + (cls || '') + '" src="' + u + '"' + (poster ? ' poster="' + poster + '"' : '') + ' muted loop playsinline' + (RM() ? ' controls' : ' autoplay') + '></video>';
  const badge = (l, small) => '<span class="badge' + (small ? ' sm' : '') + '"><i class="dot"></i>LIVE' + (small ? '' : ' · ' + mmss(l.live.secs) + ' LOOP') + '</span>';
  let EXT = null;
  function playExample() { clearInterval(EXT); if (RM()) return; let n = 0; EXT = setInterval(() => { const e = $('example'); if (!e) { clearInterval(EXT); return; } n = (n + 1) % 4; e.dataset.step = n; }, 2200); }
  const exampleHtml = () => '<section class="example" id="example" data-step="0" aria-label="Example, how it works"><p class="kick">EXAMPLE · HOW IT WORKS</p><div class="exgrid"><div class="exhero"><div class="exwho">' + SIL + '</div><span class="badge exlive"><i class="dot"></i>LIVE</span></div>' +
    '<ol class="exsteps"><li data-n="0"><b>Name a look,</b> in your own words.</li><li data-n="1"><b>Add its photos</b> and the skills that go with it.</li><li data-n="2"><b>Shoot a live one if you want:</b> five seconds of you in it, on a loop.</li><li data-n="3"><b>Put it in your book,</b> one page an agent opens.</li></ol></div><p class="mut small" style="margin:10px 0 0">An example. Nothing here is yours until you add it.</p></section>';

  /* ---------- your looks ---------- */
  async function list() {
    clearInterval(EXT);
    const all = L.all(), bk = L.book();
    let h = '<div class="lgrid' + (all.length ? '' : ' none') + '"><div class="lmain"><div class="lhead"><span class="kick" style="margin:0">YOUR LOOKS' + (all.length ? ' · ' + all.length : '') + '</span><button class="btn" type="button" id="addOpen">+ ADD A LOOK</button></div>' +
      '<div class="card hide" id="addBox"><label class="lab" for="a_n" style="margin-top:0">THE LOOK, IN YOUR WORDS</label><input class="field" id="a_n" autocomplete="off">' +
      '<div class="row" style="margin-top:10px"><button class="btn" type="button" id="a_go">ADD IT</button><button class="btn quiet" type="button" id="a_x">CANCEL</button></div></div>' +
      '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    if (!all.length) h += '<p class="empty">No looks yet. Add one when you want to.</p>' + exampleHtml();
    else {
      h += '<div class="cards">';
      for (let i = 0; i < all.length; i++) {
        const l = all[i], clips = l.skills.filter(s => s.clip).length, u = await url(l.photos[0]), lv = L.leadsLive(l) ? await url(l.live.ref) : '';
        h += '<div class="lk"><a href="?l=' + l.id + '" data-l="' + l.id + '" class="lka"><span class="lpic">' + (lv ? vid(lv, u) + badge(l, true) : u ? '<img src="' + u + '" alt="">' : '<span class="nop">NO PHOTO YET</span>') + '</span>' +
          '<span class="lt"><b>' + esc(l.name) + '</b>' + (l.spots ? '<i>' + esc(l.spots) + '</i>' : '') +
          '<em class="' + (l.photos.length || clips ? '' : 'no') + '">' + esc(plural(l.photos.length, 'PHOTO', 'PHOTOS')) + (l.live ? ' · A LIVE ONE' : '') + ' · ' + (clips ? esc(plural(clips, 'SKILL CLIP', 'SKILL CLIPS')) : 'NO CLIPS YET') + '</em>' +
          '<span class="tag' + (l.inBook ? ' on' : '') + '">' + (l.inBook ? 'IN THE BOOK' : 'NOT IN THE BOOK') + '</span></span></a>' +
          (all.length > 1 ? '<span class="ord"><button type="button" data-up="' + l.id + '" aria-label="Move ' + esc(l.name) + ' up"' + (i ? '' : ' disabled') + '>&uarr;</button><button type="button" data-dn="' + l.id + '" aria-label="Move ' + esc(l.name) + ' down"' + (i < all.length - 1 ? '' : ' disabled') + '>&darr;</button></span>' : '') + '</div>';
      }
      h += '</div><p class="mut small">Tap a look to open it. Every word on it is yours. No suggested types, no score.</p>';
    }
    h += '</div>';
    if (all.length) {
      const inb = L.inBook(); let tiles = '';
      for (let i = 0; i < L.BOOK_MAX; i++) { const l = inb[i]; if (!l) { tiles += '<span class="bt empty"></span>'; continue; } const u = await url(l.photos[0]), lv = L.leadsLive(l) ? await url(l.live.ref) : ''; tiles += '<span class="bt">' + (lv ? vid(lv, u) : u ? '<img src="' + u + '" alt="">' : '') + '</span>'; }
      h += '<aside class="lside"><span class="kick" style="margin:0 0 10px;display:block">THE LOOK BOOK</span><div class="card"><div class="btiles">' + tiles + '</div><p class="dim small">The first ' + L.BOOK_MAX + ' you have in it, in this order. One page an agent opens. A live look plays there; printed, it\'s the still.</p><a class="btn ghost block" href="?book" id="bookGo">SEE THE LOOK BOOK</a></div>' +
        '<div class="goal"><label class="lab" for="goal" style="margin-top:0">WHERE YOU WANT TO TAKE IT</label><textarea class="field" id="goal" rows="2">' + esc(bk.goal || '') + '</textarea><p class="mut small" style="margin:6px 0 0">Just for you. It does not go in the look book.</p></div></aside>';
    }
    V.innerHTML = h + '</div>';
    $('addOpen').onclick = () => { $('addBox').classList.remove('hide'); $('a_n').focus(); };
    $('a_x').onclick = () => $('addBox').classList.add('hide');
    const add = () => { const it = L.add($('a_n').value); if (!it) return say('Give it a name first, in your words.'); MSG = ''; go('l=' + it.id); };
    $('a_go').onclick = add; $('a_n').onkeydown = e => { if (e.key === 'Enter') add(); };
    V.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { L.move(b.dataset.up, -1); list(); });
    V.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { L.move(b.dataset.dn, 1); list(); });
    V.querySelectorAll('a[data-l]').forEach(a => a.onclick = e => { e.preventDefault(); go('l=' + a.dataset.l); });
    if ($('bookGo')) $('bookGo').onclick = e => { e.preventDefault(); go('book'); };
    if ($('goal')) $('goal').oninput = () => L.setBook({ goal: $('goal').value });
    playExample();
  }

  /* ---------- one look ---------- */
  async function shoot(id) {
    const LS = window.LiveShot, l = L.get(id); if (!LS || !l) return say('This browser can\'t open the camera here.');
    await LS.open({ kicker: 'LOOKS · ' + l.name.toUpperCase(), title: 'Five seconds of you in this look. It loops.', base: 'live_look_' + l.name, who: you().name || '', replacing: !!l.live,
      frameWords: 'Tap a frame to keep it as a still too. It goes on this look and with your headshots, marked as from the live one.', toast: say,
      onKeep: async r => {
        if (r.frame) { const f = new File([r.frame], 'Live look still ' + l.name + ' ' + new Date().toISOString().slice(0, 10) + '.jpg', { type: 'image/jpeg' });
          if (Y && Y.addPhoto) { const x = await Y.addPhoto(f, { live: true }); if (x && x.photo) L.addPhoto(id, 'you:' + x.photo.id); }
          else { const k = await L.keep(f); if (typeof k === 'string') L.addPhoto(id, k); } }
        const lv = await L.setLive(id, r.blob, r); MSG = lv ? 'Kept. It leads on this look and plays in your book. Pick STILL any time.' : 'This phone would not keep the clip. It may be out of room.'; one(id);
      } });
  }
  async function one(id) {
    clearInterval(EXT);
    const l = L.get(id); if (!l) return go('');
    const yp = Y ? Y.get().photos : [], lv = l.live ? await url(l.live.ref) : '', leads = L.leadsLive(l), u0 = await url(l.photos[0]);
    let h = '<p class="crumb"><a href="./" id="back">&lsaquo; YOUR LOOKS</a></p>' +
      '<label class="lab" for="l_name">THE LOOK, IN YOUR WORDS</label><input class="field" id="l_name" style="font-size:20px;max-width:560px" value="' + esc(l.name) + '">' +
      '<div class="ogrid"><div class="oleft"><div class="lhead"><span class="kick" style="margin:0">' + (l.live ? 'THE ONE IT LEADS WITH' : 'PHOTOS') + '</span>' + (l.live ? '<span class="seg" role="group" aria-label="Lead with the still or the live one"><button type="button" data-lead="still" class="' + (leads ? '' : 'on') + '" aria-pressed="' + !leads + '">STILL</button><button type="button" data-lead="live" class="' + (leads ? 'on' : '') + '" aria-pressed="' + leads + '">LIVE</button></span>' : '') + '</div>';
    h += '<div class="hero">' + (leads && lv ? vid(lv, u0, 'hv') + badge(l) + (l.live.sound ? '<button type="button" class="hear" id="hear" aria-pressed="false">SOUND OFF</button>' : '') : u0 ? '<img class="hv" src="' + u0 + '" alt="The main photo">' : '<div class="hempty">' + SIL + '<span>No photos on this look yet.</span></div>') + '</div>';
    if (l.photos.length || l.live) { h += '<div class="pics">'; for (let i = 0; i < l.photos.length; i++) { const u = await url(l.photos[i]); h += '<button type="button" class="pic" data-p="' + esc(l.photos[i]) + '" aria-label="Photo ' + (i + 1) + '">' + (u ? '<img src="' + u + '" alt="">' : '') + (i === 0 ? '<span>MAIN</span>' : '') + '</button>'; }
      if (l.live && lv) h += '<button type="button" class="pic livepic" id="livepic" aria-label="The live one">' + vid(lv, '') + '<span><i class="dot"></i> LIVE</span></button>';
      h += '</div>'; }
    h += '<div class="card hide" id="picAct"><p class="kick">THIS PHOTO</p><div class="row"><button class="btn ghost" type="button" id="pMain">MAKE IT THE MAIN ONE</button><button class="btn quiet" type="button" id="pOff">TAKE IT OFF THIS LOOK</button><button class="btn quiet" type="button" id="pX">CLOSE</button></div></div>';
    if (l.live) h += '<div class="card hide" id="liveAct"><p class="kick">THE LIVE ONE</p><p class="dim small" style="margin:0 0 8px">' + esc([mmss(l.live.secs), 'loops', l.live.sound ? 'with sound' : 'no sound'].join(' · ')) + '</p><div class="row"><button class="btn ghost" type="button" id="lsave">SAVE THE FILE</button><button class="btn quiet" type="button" id="lagain">SHOOT A NEW ONE</button><button class="btn quiet" type="button" id="lrm">TAKE IT OFF THIS LOOK</button><button class="btn quiet" type="button" id="lX">CLOSE</button></div></div>';
    h += '<div class="row" style="margin-top:10px"><label class="btn quiet">+ ADD A PHOTO<input type="file" id="l_pic" accept="image/*" multiple></label>' + (yp.length ? '<button class="btn quiet" type="button" id="fromYou">FROM YOUR PHOTOS</button>' : '') + (window.LiveShot ? '<button class="btn quiet" type="button" id="shoot"><i class="dot"></i> ' + (l.live ? 'SHOOT A NEW LIVE ONE' : 'SHOOT A LIVE ONE') + '</button>' : '') + '</div>';
    if (!l.live) h += '<p class="mut small">Live is optional: five seconds of you in this look, on a loop. 3, 5 or 8 seconds, sound off unless you turn it on, nothing kept until you keep it.</p>';
    if (PICKING && yp.length) {
      h += '<div class="card"><p class="kick">YOUR HEADSHOTS AND STILLS</p><div class="pick">';
      for (const p of yp) { const u = await url('you:' + p.id), on = l.photos.includes('you:' + p.id); h += '<button type="button" class="pic" data-you="' + p.id + '"' + (on ? ' disabled style="opacity:.4"' : '') + ' aria-label="' + esc(p.name || 'photo') + '">' + (u ? '<img src="' + u + '" alt="">' : '') + (p.kind === 'still' ? '<span>STILL</span>' : '') + '</button>'; }
      h += '</div><button class="btn quiet" type="button" id="pickX">DONE</button></div>';
    }
    h += '</div><div class="oright"><h2 style="margin-top:0">SKILLS THAT GO WITH IT</h2>';
    for (const s of l.skills) {
      const u = s.clip ? await url(s.clip) : '';
      h += '<div class="sk">' + (u ? '<video src="' + u + '" controls preload="metadata" playsinline></video>' : '<span class="noclip">NO CLIP</span>') +
        '<b>' + esc(s.name) + '</b><span class="row">' + (s.clip ? '<button class="btn quiet" type="button" data-unclip="' + s.id + '">TAKE THE CLIP OFF</button>' : '<label class="btn quiet">ADD A CLIP<input type="file" accept="video/*" data-clip="' + s.id + '"></label>') +
        '<button class="btn quiet" type="button" data-dropsk="' + s.id + '" aria-label="Remove ' + esc(s.name) + '">&times;</button></span></div>';
    }
    h += '<div class="row"><input class="field" id="sk_n" style="flex:1;min-width:180px" aria-label="A skill, in your words" placeholder="A skill, in your words"><button class="btn ghost" type="button" id="sk_go">ADD A SKILL</button></div>';
    h += '<div class="grid2"><div><label class="lab" for="l_spots">THE SPOTS IT FITS</label><input class="field" id="l_spots" value="' + esc(l.spots) + '"></div>' +
      '<div><label class="lab" for="l_next">WHERE YOU WANT TO TAKE IT</label><input class="field" id="l_next" value="' + esc(l.next) + '" placeholder="Just for you"></div></div>' +
      '<label class="lab" for="l_notes">YOUR NOTES (OPTIONAL)</label><textarea class="field" id="l_notes" rows="2" placeholder="Just for you">' + esc(l.notes) + '</textarea>' +
      '<label class="check"><input type="checkbox" id="l_book"' + (l.inBook ? ' checked' : '') + '> In the look book</label>' +
      '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p>' +
      '<div class="row"><button class="btn" type="button" id="save">SAVE</button><button class="btn ghost" type="button" id="seeBook">SEE IT IN THE LOOK BOOK</button></div>' +
      '<p class="mut small">Everything here is yours to fill or leave blank. Nothing is suggested.</p>' +
      '<div class="row" style="margin-top:22px"><button class="btn quiet" type="button" id="del">DELETE THIS LOOK</button></div><div class="card hide" id="delBox"><p class="dim">Delete this look, its photos, its clips and its live one? Photos from YOU stay in YOU.</p><div class="row"><button class="btn" type="button" id="delY">DELETE IT</button><button class="btn quiet" type="button" id="delN">KEEP IT</button></div></div></div></div>';
    V.innerHTML = h; MSG = '';
    const keepText = () => L.set(id, { name: $('l_name').value, notes: $('l_notes').value, spots: $('l_spots').value, next: $('l_next').value, inBook: $('l_book').checked });
    ['l_name', 'l_notes', 'l_spots', 'l_next'].forEach(k => $(k).addEventListener('change', keepText));
    $('l_book').onchange = keepText;
    $('back').onclick = e => { e.preventDefault(); keepText(); go(''); };
    $('save').onclick = () => { keepText(); MSG = 'Saved.'; go(''); };
    $('seeBook').onclick = () => { keepText(); go('book'); };
    let cur = '';
    V.querySelectorAll('.pics .pic[data-p]').forEach(b => b.onclick = () => { cur = b.dataset.p; $('picAct').classList.remove('hide'); if ($('liveAct')) $('liveAct').classList.add('hide'); });
    $('pMain').onclick = () => { keepText(); L.mainPhoto(id, cur); one(id); };
    $('pOff').onclick = async () => { keepText(); await L.dropPhoto(id, cur); one(id); };
    $('pX').onclick = () => $('picAct').classList.add('hide');
    V.querySelectorAll('[data-lead]').forEach(b => b.onclick = () => { keepText(); L.setLead(id, b.dataset.lead); one(id); });
    if ($('livepic')) $('livepic').onclick = () => { $('liveAct').classList.remove('hide'); $('picAct').classList.add('hide'); };
    if ($('lX')) $('lX').onclick = () => $('liveAct').classList.add('hide');
    if ($('lsave')) $('lsave').onclick = async () => { const x = L.get(id); const n = await window.LiveShot.save(await L.blob(x.live.ref), x.live.ext, 'live_look_' + x.name, you().name || ''); if (n) say('Saved ' + n); };
    if ($('lagain')) $('lagain').onclick = () => { keepText(); shoot(id); };
    if ($('lrm')) $('lrm').onclick = async () => { if (!confirm('Take the live one off this look? The book goes back to the still.')) return; keepText(); await L.removeLive(id); one(id); };
    if ($('shoot')) $('shoot').onclick = () => { keepText(); shoot(id); };
    if ($('hear')) $('hear').onclick = () => { const v = V.querySelector('.hero video'); if (!v) return; v.muted = !v.muted; if (!v.muted) v.play().catch(() => { }); $('hear').textContent = v.muted ? 'SOUND OFF' : 'SOUND ON'; $('hear').setAttribute('aria-pressed', String(!v.muted)); };
    if ($('fromYou')) $('fromYou').onclick = () => { keepText(); PICKING = !PICKING; one(id); };
    if ($('pickX')) $('pickX').onclick = () => { PICKING = false; one(id); };
    V.querySelectorAll('[data-you]').forEach(b => b.onclick = () => { keepText(); L.addPhoto(id, 'you:' + b.dataset.you); one(id); });
    $('l_pic').onchange = async e => { keepText(); let bad = ''; for (const f of e.target.files) { const r = await L.keep(f); if (r && r.error) bad = r.error; else L.addPhoto(id, r); } MSG = bad ? 'One did not come in: ' + bad + '.' : ''; one(id); };
    const addSk = () => { keepText(); if (!L.addSkill(id, $('sk_n').value)) return say('Name the skill first, in your words.'); one(id).then(() => $('sk_n') && $('sk_n').focus()); };
    $('sk_go').onclick = addSk; $('sk_n').onkeydown = e => { if (e.key === 'Enter') addSk(); };
    V.querySelectorAll('[data-clip]').forEach(inp => inp.onchange = async () => { keepText(); const f = inp.files[0]; if (!f) return; const r = await L.keep(f); if (r && r.error) { MSG = 'That clip did not come in: ' + r.error + '.'; } else L.setSkill(id, inp.dataset.clip, { clip: r }); one(id); });
    V.querySelectorAll('[data-unclip]').forEach(b => b.onclick = async () => { keepText(); const s = L.get(id).skills.find(k => k.id === b.dataset.unclip); if (s && s.clip) await L.drop(s.clip); L.setSkill(id, b.dataset.unclip, { clip: '' }); one(id); });
    V.querySelectorAll('[data-dropsk]').forEach(b => b.onclick = async () => { keepText(); await L.dropSkill(id, b.dataset.dropsk); one(id); });
    $('del').onclick = () => $('delBox').classList.remove('hide');
    $('delN').onclick = () => $('delBox').classList.add('hide');
    $('delY').onclick = async () => { await L.remove(id); MSG = 'Deleted.'; go(''); };
  }

  /* ---------- the look book ---------- */
  const ext = b => /png/.test(b.type) ? 'png' : /webp/.test(b.type) ? 'webp' : /quicktime/.test(b.type) ? 'mov' : /webm/.test(b.type) ? 'webm' : /video/.test(b.type) ? 'mp4' : 'jpg';
  /* files: true -> the media go in as files next to the page (for the zip); false -> this device's own links (for the preview) */
  async function model(files) {
    const y = you(), bk = L.book(), media = []; let n = 0;
    const put = async ref => { const b = await L.blob(ref); if (!b) return ''; if (!files) return url(ref); const name = 'media/' + (++n) + '.' + ext(b); media.push({ name, blob: b }); return name; };
    const looks = [];
    for (const l of L.inBook()) {
      const photos = []; for (const p of l.photos.slice(0, 3)) { const u = await put(p); if (u) photos.push(u); }
      const skills = []; for (const s of l.skills) skills.push({ name: s.name, clip: s.clip ? await put(s.clip) : '' });
      const live = L.leadsLive(l) ? { u: await put(l.live.ref), sound: !!l.live.sound } : null;
      looks.push({ name: l.name, spots: l.spots, photos, skills, live: live && live.u ? live : null });
    }
    const reel = /^https?:\/\//i.test(bk.reel || '') ? { url: bk.reel } : null;
    return { m: { name: bk.title || y.name || '', rep: y.rep || '', page: '', stats: L.stats(y, bk), reel, looks }, media };
  }
  async function book() {
    const bk = L.book(), y = you(), inb = L.inBook();
    let h = '<p class="crumb"><a href="./" id="back">&lsaquo; YOUR LOOKS</a></p><h1>THE LOOK BOOK</h1>' +
      '<p class="sub">The looks you have in the book, in your order, the first ' + L.BOOK_MAX + '. One page an agent can open.</p>' +
      '<label class="lab" for="b_name">NAME ON IT</label><input class="field" id="b_name" value="' + esc(bk.title || y.name || '') + '">' +
      '<label class="check"><input type="checkbox" id="b_stats"' + (bk.stats ? ' checked' : '') + '> Put my union, height, sizes and local hire on it</label>' +
      '<div class="' + (bk.stats ? '' : 'hide') + '" id="statsBox"><p class="mut small" style="margin:0">Union, height and local hire come from YOU' + (y.union || y.height || y.locations ? '' : ' (none in yet)') + '.</p><label class="lab" for="b_sizes">SIZES</label><input class="field" id="b_sizes" value="' + esc(bk.sizes || '') + '"></div>' +
      '<label class="lab" for="b_reel">COMMERCIAL REEL LINK (OPTIONAL)</label><input class="field" id="b_reel" inputmode="url" value="' + esc(bk.reel || '') + '">' +
      '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    if (!inb.length) h += '<p class="empty">No looks in the book yet. Tick "In the look book" on a look.</p>';
    else h += '<div class="row"><button class="btn" type="button" id="zip">SAVE THE LOOK BOOK</button><button class="btn ghost" type="button" id="print">PRINT OR SAVE AS PDF</button></div><p class="mut small">The saved one is a folder: open lookbook.html. Clips play from it.</p><iframe class="bookf" id="bookf" title="Your look book"></iframe>';
    V.innerHTML = h; MSG = '';
    $('back').onclick = e => { e.preventDefault(); go(''); };
    const draw = async () => { if (!$('bookf')) return; const { m } = await model(false); $('bookf').srcdoc = L.html(m); };
    const keep = () => { L.setBook({ title: $('b_name').value.trim(), stats: $('b_stats').checked, sizes: $('b_sizes').value, reel: $('b_reel').value.trim() }); $('statsBox').classList.toggle('hide', !$('b_stats').checked); draw(); };
    ['b_name', 'b_sizes', 'b_reel'].forEach(k => $(k).addEventListener('change', keep)); $('b_stats').onchange = keep;
    if ($('print')) $('print').onclick = () => { try { $('bookf').contentWindow.print(); } catch (e) { say('Open the saved one and print from there.'); } };
    if ($('zip')) $('zip').onclick = async () => {
      say('Putting it together...');
      const { m, media } = await model(true), files = [{ name: 'lookbook/lookbook.html', data: L.html(m) }];
      for (const x of media) files.push({ name: 'lookbook/' + x.name, data: new Uint8Array(await x.blob.arrayBuffer()) });
      const blob = new Blob([Zip.make(files)], { type: 'application/zip' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'lookbook' + (m.name ? '-' + m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '') + '.zip';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      say('Saved: ' + plural(m.looks.length, 'look', 'looks') + ', ' + plural(media.length, 'file', 'files') + '.');
    };
    draw();
  }
  route();
})();
