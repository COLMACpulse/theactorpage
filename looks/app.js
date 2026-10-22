/* LOOKS: your looks, one look, the look book. Data and the book page in shared/looks.js.
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

  /* ---------- your looks ---------- */
  async function list() {
    const all = L.all(), bk = L.book();
    let h = '<h1>LOOKS</h1><p class="sub">For commercial work. Each look in your words, with its photos and the skills that go with it.</p>' +
      '<div class="row"><button class="btn" type="button" id="addOpen">ADD A LOOK</button>' + (all.length ? '<a class="btn ghost" href="?book" id="bookGo">SEE THE LOOK BOOK</a>' : '') + '</div>' +
      '<div class="card hide" id="addBox"><label class="lab" for="a_n">THE LOOK, IN YOUR WORDS</label><input class="field" id="a_n" autocomplete="off">' +
      '<div class="row" style="margin-top:10px"><button class="btn" type="button" id="a_go">ADD IT</button><button class="btn quiet" type="button" id="a_x">CANCEL</button></div></div>' +
      '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    if (!all.length) h += '<p class="empty">No looks yet. Add one when you want to.</p>';
    for (let i = 0; i < all.length; i++) {
      const l = all[i], clips = l.skills.filter(s => s.clip).length, u = await url(l.photos[0]);
      h += '<div class="lk"><a href="?l=' + l.id + '" data-l="' + l.id + '" style="display:contents;color:inherit;text-decoration:none">' + (u ? '<img class="ph" src="' + u + '" alt="">' : '<span class="ph">NO PHOTO</span>') +
        '<span style="min-width:0"><b>' + esc(l.name) + '</b>' + (l.spots ? '<i>' + esc(l.spots) + '</i>' : '') +
        '<em class="' + (l.photos.length || clips ? '' : 'no') + '">' + esc(plural(l.photos.length, 'PHOTO', 'PHOTOS')) + ' · ' + (clips ? esc(plural(clips, 'SKILL CLIP', 'SKILL CLIPS')) : 'NO CLIPS YET') + (l.inBook ? '' : ' · NOT IN THE BOOK') + '</em></span></a>' +
        (all.length > 1 ? '<span class="ord"><button type="button" data-up="' + l.id + '" aria-label="Move up"' + (i ? '' : ' disabled') + '>&uarr;</button><button type="button" data-dn="' + l.id + '" aria-label="Move down"' + (i < all.length - 1 ? '' : ' disabled') + '>&darr;</button></span>' : '<span></span>') + '</div>';
    }
    if (all.length) h += '<div class="goal"><label class="lab" for="goal" style="margin-top:0">WHERE YOU WANT TO TAKE IT</label><textarea class="field" id="goal" rows="2">' + esc(bk.goal || '') + '</textarea><p class="mut small" style="margin:6px 0 0">Just for you. It does not go in the look book.</p></div>' +
      '<p class="mut small">No suggested types, no score. Make as many as you like; the look book takes the first ' + L.BOOK_MAX + ' you have in it, in this order.</p>';
    V.innerHTML = h;
    $('addOpen').onclick = () => { $('addBox').classList.remove('hide'); $('a_n').focus(); };
    $('a_x').onclick = () => $('addBox').classList.add('hide');
    const add = () => { const it = L.add($('a_n').value); if (!it) return say('Give it a name first, in your words.'); MSG = ''; go('l=' + it.id); };
    $('a_go').onclick = add; $('a_n').onkeydown = e => { if (e.key === 'Enter') add(); };
    V.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { L.move(b.dataset.up, -1); list(); });
    V.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { L.move(b.dataset.dn, 1); list(); });
    V.querySelectorAll('a[data-l]').forEach(a => a.onclick = e => { e.preventDefault(); go('l=' + a.dataset.l); });
    if ($('bookGo')) $('bookGo').onclick = e => { e.preventDefault(); go('book'); };
    if ($('goal')) $('goal').oninput = () => L.setBook({ goal: $('goal').value });
  }

  /* ---------- one look ---------- */
  async function one(id) {
    const l = L.get(id); if (!l) return go('');
    const yp = Y ? Y.get().photos : [];
    let h = '<p class="crumb"><a href="./" id="back">&larr; YOUR LOOKS</a></p>' +
      '<label class="lab" for="l_name">THE LOOK, IN YOUR WORDS</label><input class="field" id="l_name" style="font-size:20px" value="' + esc(l.name) + '">' +
      '<h2>PHOTOS</h2>';
    if (l.photos.length) { h += '<div class="pics">'; for (let i = 0; i < l.photos.length; i++) { const u = await url(l.photos[i]); h += '<button type="button" class="pic" data-p="' + esc(l.photos[i]) + '" aria-label="Photo ' + (i + 1) + '">' + (u ? '<img src="' + u + '" alt="">' : '') + (i === 0 ? '<span>MAIN</span>' : '') + '</button>'; } h += '</div>'; }
    else h += '<p class="empty">No photos on this look yet.</p>';
    h += '<div class="card hide" id="picAct"><p class="kick">THIS PHOTO</p><div class="row"><button class="btn ghost" type="button" id="pMain">MAKE IT THE MAIN ONE</button><button class="btn quiet" type="button" id="pOff">TAKE IT OFF THIS LOOK</button><button class="btn quiet" type="button" id="pX">CLOSE</button></div></div>';
    h += '<div class="row" style="margin-top:10px">' + (yp.length ? '<button class="btn quiet" type="button" id="fromYou">FROM YOUR PHOTOS</button>' : '') + '<label class="btn quiet">ADD A PHOTO<input type="file" id="l_pic" accept="image/*" multiple></label></div>';
    if (PICKING && yp.length) {
      h += '<div class="card"><p class="kick">YOUR HEADSHOTS AND STILLS</p><div class="pick">';
      for (const p of yp) { const u = await url('you:' + p.id), on = l.photos.includes('you:' + p.id); h += '<button type="button" class="pic" data-you="' + p.id + '"' + (on ? ' disabled style="opacity:.4"' : '') + ' aria-label="' + esc(p.name || 'photo') + '">' + (u ? '<img src="' + u + '" alt="">' : '') + (p.kind === 'still' ? '<span>STILL</span>' : '') + '</button>'; }
      h += '</div><button class="btn quiet" type="button" id="pickX">DONE</button></div>';
    }
    h += '<label class="lab" for="l_notes" style="margin-top:18px">YOUR NOTES (OPTIONAL)</label><textarea class="field" id="l_notes" rows="2">' + esc(l.notes) + '</textarea>';
    h += '<h2>SKILLS THAT GO WITH IT</h2>';
    for (const s of l.skills) {
      const u = s.clip ? await url(s.clip) : '';
      h += '<div class="sk">' + (u ? '<video src="' + u + '" controls preload="metadata" playsinline></video>' : '<span class="noclip">NO CLIP</span>') +
        '<b>' + esc(s.name) + '</b><span class="row">' + (s.clip ? '<button class="btn quiet" type="button" data-unclip="' + s.id + '">TAKE THE CLIP OFF</button>' : '<label class="btn quiet">ADD A CLIP<input type="file" accept="video/*" data-clip="' + s.id + '"></label>') +
        '<button class="btn quiet" type="button" data-dropsk="' + s.id + '" aria-label="Remove ' + esc(s.name) + '">&times;</button></span></div>';
    }
    h += '<div class="row"><input class="field" id="sk_n" style="flex:1;min-width:180px" aria-label="A skill, in your words"><button class="btn ghost" type="button" id="sk_go">ADD A SKILL</button></div>';
    h += '<label class="lab" for="l_spots" style="margin-top:18px">THE SPOTS IT FITS</label><input class="field" id="l_spots" value="' + esc(l.spots) + '">' +
      '<label class="lab" for="l_next">WHERE YOU WANT TO TAKE IT</label><input class="field" id="l_next" value="' + esc(l.next) + '">' +
      '<label class="check"><input type="checkbox" id="l_book"' + (l.inBook ? ' checked' : '') + '> In the look book</label>' +
      '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p>' +
      '<div class="row"><button class="btn" type="button" id="save">SAVE</button><button class="btn ghost" type="button" id="seeBook">SEE IT IN THE LOOK BOOK</button></div>' +
      '<p class="mut small">Everything here is yours to fill or leave blank. Nothing is suggested.</p>' +
      '<div class="row" style="margin-top:22px"><button class="btn quiet" type="button" id="del">DELETE THIS LOOK</button></div><div class="card hide" id="delBox"><p class="dim">Delete this look, its photos and its clips? Photos from YOU stay in YOU.</p><div class="row"><button class="btn" type="button" id="delY">DELETE IT</button><button class="btn quiet" type="button" id="delN">KEEP IT</button></div></div>';
    V.innerHTML = h; MSG = '';
    const keepText = () => L.set(id, { name: $('l_name').value, notes: $('l_notes').value, spots: $('l_spots').value, next: $('l_next').value, inBook: $('l_book').checked });
    ['l_name', 'l_notes', 'l_spots', 'l_next'].forEach(k => $(k).addEventListener('change', keepText));
    $('l_book').onchange = keepText;
    $('back').onclick = e => { e.preventDefault(); keepText(); go(''); };
    $('save').onclick = () => { keepText(); MSG = 'Saved.'; go(''); };
    $('seeBook').onclick = () => { keepText(); go('book'); };
    let cur = '';
    V.querySelectorAll('.pics .pic').forEach(b => b.onclick = () => { cur = b.dataset.p; $('picAct').classList.remove('hide'); });
    $('pMain').onclick = () => { keepText(); L.mainPhoto(id, cur); one(id); };
    $('pOff').onclick = async () => { keepText(); await L.dropPhoto(id, cur); one(id); };
    $('pX').onclick = () => $('picAct').classList.add('hide');
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
      looks.push({ name: l.name, spots: l.spots, photos, skills });
    }
    const reel = /^https?:\/\//i.test(bk.reel || '') ? { url: bk.reel } : null;
    return { m: { name: bk.title || y.name || '', rep: y.rep || '', page: '', stats: L.stats(y, bk), reel, looks }, media };
  }
  async function book() {
    const bk = L.book(), y = you(), inb = L.inBook();
    let h = '<p class="crumb"><a href="./" id="back">&larr; YOUR LOOKS</a></p><h1>THE LOOK BOOK</h1>' +
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
