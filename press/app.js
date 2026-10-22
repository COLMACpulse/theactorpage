/* PRESS page. Your campaigns; one open: the news, who covers it, your pitch, the press kit. */
(function () {
  'use strict';
  const P = window.Press, C = window.Contacts, Y = window.You, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { open: '', adding: false, addPress: false, msg: '' };
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  let CREDITS = [], URLS = {};
  const you = () => { try { return Y ? Y.get() : {}; } catch (e) { return {}; } };
  const mine = () => { const y = you(), out = [], seen = {}; const add = x => { const k = String(x.title || '').toLowerCase(); if (!k || seen[k]) return; seen[k] = 1; out.push(x); }; (y.credits || []).forEach(c => add({ title: c.title, role: c.role || c.character, by: c.by })); CREDITS.forEach(c => add({ title: c.title, role: c.role, by: c.net })); return out; };
  const spotMe = () => { try { return (JSON.parse(localStorage.getItem('theactorpage_spotted_v1') || '{}') || {}).me || {}; } catch (e) { return {}; } };

  function list() {
    const all = P.all();
    let h = '<div class="row"><button class="btn" id="start">START A CAMPAIGN</button></div>';
    if (S.adding) h += '<div class="card" id="detail"><p class="kick">START A CAMPAIGN</p><p class="dim small" style="margin:0 0 6px">Press starts from real news. What’s happening?</p>'
      + '<div class="chips" role="group" aria-label="The news">' + P.MILESTONES.map(([k, l], i) => '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-ms="' + k + '">' + esc(l.toUpperCase()) + '</button>').join('') + '</div>'
      + '<div class="grid2"><div><label class="lab" for="n_title">THE PROJECT</label><input class="field" id="n_title" list="projlist" placeholder="The film, the show, the role"></div>'
      + '<div><label class="lab" for="n_date">WHEN</label><input class="field" type="date" id="n_date"></div>'
      + '<div><label class="lab" for="n_where">WHERE</label><input class="field" id="n_where" placeholder="The festival, the theater, the network"></div></div>'
      + '<datalist id="projlist">' + mine().map(c => '<option value="' + esc(c.title) + '">').join('') + '</datalist>'
      + '<div class="row" style="margin-top:12px"><button class="btn" id="startit">START IT</button><button class="btn quiet" data-close>CANCEL</button></div></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += all.length ? all.map(c => '<button type="button" class="person" data-open="' + c.id + '"><span class="tag">' + esc((P.MILESTONES.find(m => m[0] === c.milestone) || ['', 'News'])[1].toUpperCase()) + '</span><b>' + esc(c.title) + '</b>'
      + '<span class="from">' + esc([c.where, c.date ? P.day(c.date) : ''].filter(Boolean).join(' · ')) + '</span><span class="from">' + esc(P.tallyLine(c)) + '</span></button>').join('')
      : '<p class="empty">No campaigns yet. Start one when you have real news: a premiere, a festival, a booking, a release.</p>';
    h += '<div class="card"><p class="kick">HOW THIS WORKS</p><ol class="how small" style="margin:0;padding-left:20px"><li>Start from real news. Press doesn’t cover "here I am"; it covers what’s happening.</li><li>Find who covers your beat. In SPOTTED, JUICE shows the trades and indie film news; tap PRESS on a story to note that outlet. Confirm the writer from their own work before you reach out.</li><li>Write your pitch yourself. Short, one story, why it fits what they cover. Your facts sit beside it to copy from.</li><li>Send it from your own mail. Mark when you reached them and what came back.</li></ol></div>';
    return h;
  }
  function outletRow(c, o) {
    const p = C.get(o.cid); if (!p) return '';
    return '<div class="card" data-outlet="' + o.cid + '" style="margin:8px 0"><div class="row" style="justify-content:space-between"><div><b style="font-weight:500">' + esc(p.company && p.company !== p.name ? p.name + ', ' + p.company : p.name) + '</b>' + (p.checked ? '' : '<span class="unc">NOT CONFIRMED YET</span>') + (p.beat ? '<br><span class="mut small">' + esc(p.beat) + '</span>' : '') + '</div><button class="btn quiet" data-drop>TAKE OFF</button></div>'
      + '<div class="grid2"><div><label class="lab">REACHED THEM ON</label><input class="field" type="date" data-reached value="' + esc(o.reached) + '"></div><div><label class="lab">HOW</label><select class="field" data-how>' + opts(P.HOW, o.how) + '</select></div></div>'
      + '<div class="chips" role="group" aria-label="What came back">' + P.REPLIES.map(([k, l]) => '<button type="button" class="chip' + (o.reply === k ? ' on' : '') + '" data-reply="' + k + '">' + esc(l.toUpperCase()) + '</button>').join('') + '</div>'
      + (p.email ? '<a class="btn ghost" data-mail href="' + esc(P.mailto(p.email, c.title, c.pitch || '')) + '">EMAIL IT, IN YOUR WORDS</a>' : '<p class="mut small" style="margin:6px 0 0">No email for them yet. <a href="../contacts/?who=' + encodeURIComponent(p.name) + '">Add one in CONTACTS</a>, or use their tips form.</p>')
      + '</div>';
  }
  function campaign(c) {
    const y = you(), sm = spotMe(); if (!c.links.page && sm.site) c.links.page = sm.site; if (!c.links.reel && sm.reel) c.links.reel = sm.reel;
    const ms = (P.MILESTONES.find(m => m[0] === c.milestone) || ['', 'News'])[1], press = C.press().filter(p => !c.outlets.some(o => o.cid === p.id)), ny = P.notYet(c);
    let h = '<p class="small"><a href="#" data-back>&larr; All campaigns</a></p>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="card"><p class="kick">' + esc(ms.toUpperCase()) + '</p><h2 style="margin:0;font-weight:500">' + esc(c.title) + '</h2><p class="mut small" style="margin:2px 0 0">' + esc([c.where, c.date ? P.day(c.date) : ''].filter(Boolean).join(' · ')) + '</p>'
      + '<p class="small dim" style="margin:6px 0 0">' + esc(P.tallyLine(c)) + '</p>'
      + '<div class="sec"><p class="kick">1 · THE NEWS, IN YOUR WORDS</p><textarea class="field" id="c_hook" placeholder="What’s happening, and why someone who covers this would care.">' + esc(c.hook) + '</textarea></div>'
      + '<div class="sec"><p class="kick">2 · WHO COVERS IT</p>' + (c.outlets.map(o => outletRow(c, o)).join('') || '<p class="empty">Nobody on the list yet.</p>')
      + (press.length ? '<div class="row"><select class="field" id="pickpress" style="flex:1 1 220px"><option value="">Add someone from your press contacts</option>' + press.map(p => '<option value="' + p.id + '">' + esc(p.name + (p.company && p.company !== p.name ? ', ' + p.company : '') + (p.checked ? '' : ' (not confirmed yet)')) + '</option>').join('') + '</select><button class="btn" id="addpick">ADD</button></div>' : '')
      + '<div class="row" style="margin-top:8px"><button class="btn quiet" id="newpress">NEW PRESS CONTACT</button><a class="btn quiet" href="../spotted/">FIND THEM IN JUICE</a></div>'
      + (S.addPress ? '<div class="card" style="margin-top:8px"><div class="grid2"><div><label class="lab" for="np_outlet">OUTLET</label><input class="field" id="np_outlet"></div><div><label class="lab" for="np_name">WRITER OR HOST</label><input class="field" id="np_name" placeholder="Once you know who"></div><div><label class="lab" for="np_beat">THEIR BEAT</label><input class="field" id="np_beat"></div><div><label class="lab" for="np_email">EMAIL</label><input class="field" id="np_email" inputmode="email"></div></div><label class="lab" for="np_site">A PIECE OF THEIRS YOU READ</label><input class="field" id="np_site" placeholder="https://"><label class="row small" style="margin-top:10px;gap:8px"><input type="checkbox" id="np_checked"> I confirmed who they are and what they cover from their own work.</label><div class="row" style="margin-top:10px"><button class="btn" id="np_add">ADD</button><button class="btn quiet" id="np_cancel">CANCEL</button></div></div>' : '')
      + '</div>'
      + '<div class="sec"><p class="kick">3 · YOUR PITCH</p><p class="dim small" style="margin:0 0 6px">You write it. Short, one story, why it fits what they cover. Your facts are below to copy from.</p><textarea class="field" id="c_pitch" rows="7" placeholder="Your words.">' + esc(c.pitch) + '</textarea>'
      + '<p class="lab" style="margin-top:10px">YOUR FACTS</p><div class="facts" id="facts">' + esc(P.facts(c, y, mine()).join('\n')) + '</div><div class="row" style="margin-top:8px"><button class="btn quiet" id="copyfacts">COPY THE FACTS</button><button class="btn quiet" id="copypitch">COPY YOUR PITCH</button></div></div>'
      + '<div class="sec"><p class="kick">4 · THE PRESS KIT</p><label class="lab" for="c_bio">A SHORT BIO, IN YOUR WORDS</label><textarea class="field" id="c_bio" placeholder="Two or three lines: who you are, what you do, what’s next.">' + esc(c.bio) + '</textarea>'
      + '<div class="grid2"><div><label class="lab" for="l_page">YOUR PAGE</label><input class="field" id="l_page" inputmode="url" value="' + esc(c.links.page) + '" placeholder="https://"></div><div><label class="lab" for="l_reel">REEL</label><input class="field" id="l_reel" inputmode="url" value="' + esc(c.links.reel) + '" placeholder="https://"></div></div>'
      + '<label class="lab" for="l_more">MORE (TRAILER, TICKETS, THE PROJECT’S PAGE)</label><input class="field" id="l_more" inputmode="url" value="' + esc(c.links.more) + '" placeholder="https://">'
      + '<p class="lab" style="margin-top:12px">PHOTOS (TAP TO PICK)</p><div class="row" id="photos">' + ((y.photos || []).map(ph => '<button type="button" class="ph' + ((c.photos || []).some(x => x.id === ph.id) ? ' on' : '') + '" data-ph="' + ph.id + '" aria-label="Pick this photo"><img data-src="' + ph.id + '" alt=""></button>').join('') || '<span class="mut small">No headshots yet. Add them on the home page, under YOU.</span>') + '</div>'
      + ((c.photos || []).length ? (c.photos || []).map((ph, i) => '<div class="row" style="margin-top:6px"><span class="small mut" style="min-width:70px">Photo ' + (i + 1) + '</span><input class="field" data-credit="' + ph.id + '" value="' + esc(ph.credit || '') + '" placeholder="Photo by" style="flex:1"></div>').join('') : '')
      + '<p class="lab" style="margin-top:12px">BEFORE IT GOES ANYWHERE</p>' + P.CHECKS.map(([k, l]) => '<label class="row small" style="gap:8px;margin:6px 0"><input type="checkbox" data-check="' + k + '"' + ((c.checks || {})[k] ? ' checked' : '') + '> ' + esc(l) + '</label>').join('')
      + (ny.length ? '<p class="mut small" id="notyet">Not done yet: ' + esc(ny.join('; ')) + '.</p>' : '<p class="small" id="notyet" style="color:var(--good)">Ready.</p>')
      + '<div class="row" style="margin-top:10px"><button class="btn" id="kit">DOWNLOAD THE PRESS KIT</button></div><p class="mut small" style="margin:6px 0 0">One zip: the kit as text and the photos you picked. Only facts you entered. The checklist stays here.</p></div>'
      + '<div class="row" style="margin-top:14px"><button class="btn quiet" id="delc">REMOVE THIS CAMPAIGN</button></div></div>';
    return h;
  }
  function render() {
    const c = S.open && P.get(S.open);
    $('view').innerHTML = c ? campaign(c) : list(); S.msg = ''; wire(c);
    document.querySelectorAll('img[data-src]').forEach(async im => { const id = im.dataset.src; try { if (!URLS[id]) { const b = await Y.photoBlob(id); if (b) URLS[id] = URL.createObjectURL(b); } if (URLS[id]) im.src = URLS[id]; } catch (e) { } });
  }
  function saveText(c) { if (!c) return; const v = id => $(id) ? $(id).value : undefined; const patch = {}; if ($('c_hook')) patch.hook = v('c_hook'); if ($('c_pitch')) patch.pitch = v('c_pitch'); if ($('c_bio')) patch.bio = v('c_bio'); if ($('l_page')) patch.links = { page: v('l_page').trim(), reel: v('l_reel').trim(), more: v('l_more').trim() }; P.set(c.id, patch); }
  function wire(c) {
    const V = $('view');
    V.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { S.open = b.dataset.open; S.adding = false; render(); scrollTo(0, 0); });
    V.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { S.adding = false; render(); });
    V.querySelectorAll('[data-back]').forEach(b => b.onclick = e => { e.preventDefault(); saveText(c); S.open = ''; S.addPress = false; render(); });
    if ($('start')) $('start').onclick = () => { S.adding = true; render(); $('n_title').focus(); };
    let ms = 'premiere'; V.querySelectorAll('[data-ms]').forEach(b => b.onclick = () => { ms = b.dataset.ms; V.querySelectorAll('[data-ms]').forEach(x => x.classList.toggle('on', x === b)); });
    if ($('startit')) $('startit').onclick = () => { const t = $('n_title').value.trim(); if (!t) { $('n_title').focus(); return; } const n = P.add({ title: t, milestone: ms, date: $('n_date').value, where: $('n_where').value }); S.adding = false; S.open = n.id; S.msg = 'Started. Now the news, in your words.'; render(); };
    if (!c) return;
    ['c_hook', 'c_pitch', 'c_bio', 'l_page', 'l_reel', 'l_more'].forEach(id => { const el = $(id); if (el) el.addEventListener('change', () => { saveText(c); const f = $('facts'); if (f) f.textContent = P.facts(P.get(c.id), you(), mine()).join('\n'); V.querySelectorAll('[data-mail]').forEach(a => { const o = a.closest('[data-outlet]'), p = C.get(o.dataset.outlet); if (p) a.href = P.mailto(p.email, c.title, P.get(c.id).pitch); }); }); });
    V.querySelectorAll('[data-outlet]').forEach(card => { const cid = card.dataset.outlet;
      const r = card.querySelector('[data-reached]'); r.onchange = () => { saveText(c); P.setOutlet(c.id, cid, { reached: r.value }); render(); };
      const hw = card.querySelector('[data-how]'); hw.onchange = () => P.setOutlet(c.id, cid, { how: hw.value });
      card.querySelectorAll('[data-reply]').forEach(b => b.onclick = () => { saveText(c); const o = P.get(c.id).outlets.find(x => x.cid === cid); P.setOutlet(c.id, cid, { reply: b.dataset.reply, reached: o.reached || new Date().toISOString().slice(0, 10) }); render(); });
      card.querySelector('[data-drop]').onclick = () => { saveText(c); P.dropOutlet(c.id, cid); render(); };
      const m = card.querySelector('[data-mail]'); if (m) m.addEventListener('click', () => { saveText(c); const o = P.get(c.id).outlets.find(x => x.cid === cid); if (!o.reached) P.setOutlet(c.id, cid, { reached: new Date().toISOString().slice(0, 10), how: 'email' }); setTimeout(render, 300); });
    });
    if ($('addpick')) $('addpick').onclick = () => { const id = $('pickpress').value; if (!id) return; saveText(c); P.addOutlet(c.id, id); render(); };
    if ($('newpress')) $('newpress').onclick = () => { saveText(c); S.addPress = true; render(); $('np_outlet').focus(); };
    if ($('np_cancel')) $('np_cancel').onclick = () => { S.addPress = false; render(); };
    if ($('np_add')) $('np_add').onclick = () => { const out = $('np_outlet').value.trim(), nm = $('np_name').value.trim() || out; if (!nm) { $('np_outlet').focus(); return; }
      const site = $('np_site').value.trim(); const p = C.add({ name: nm, role: 'press', company: out, beat: $('np_beat').value, email: $('np_email').value, site: /^https:\/\//.test(site) ? site : '', checked: $('np_checked').checked });
      P.addOutlet(c.id, p.id); S.addPress = false; S.msg = nm + ' is on the list, and in CONTACTS.'; render(); };
    const copy = async (t, what) => { try { await navigator.clipboard.writeText(t); S.msg = what + ' copied.'; } catch (e) { S.msg = 'Couldn’t copy here. Select it and copy.'; } saveText(c); render(); };
    if ($('copyfacts')) $('copyfacts').onclick = () => copy(P.facts(P.get(c.id), you(), mine()).join('\n'), 'Your facts');
    if ($('copypitch')) $('copypitch').onclick = () => copy($('c_pitch').value, 'Your pitch');
    V.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => { saveText(c); const cur = P.get(c.id).photos || [], id = b.dataset.ph; P.set(c.id, { photos: cur.some(x => x.id === id) ? cur.filter(x => x.id !== id) : cur.concat([{ id, credit: '' }]) }); render(); });
    V.querySelectorAll('[data-credit]').forEach(i => i.onchange = () => { P.set(c.id, { photos: (P.get(c.id).photos || []).map(x => x.id === i.dataset.credit ? Object.assign({}, x, { credit: i.value.trim() }) : x) }); });
    V.querySelectorAll('[data-check]').forEach(i => i.onchange = () => { saveText(c); P.set(c.id, { checks: Object.assign({}, P.get(c.id).checks, { [i.dataset.check]: i.checked }) }); render(); });
    if ($('kit')) $('kit').onclick = async () => {
      saveText(c); const cc = P.get(c.id), files = [{ name: 'Press kit.txt', data: P.kitText(cc, you(), mine()) }];
      for (let i = 0; i < (cc.photos || []).length; i++) { try { const b = await Y.photoBlob(cc.photos[i].id); if (b) files.push({ name: P.photoName(cc, cc.photos[i], i), data: new Uint8Array(await b.arrayBuffer()) }); } catch (e) { } }
      const name = cc.title.replace(/[^\p{L}\p{N} ]+/gu, '').trim() + ' press kit.zip', a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([Zip.make(files)], { type: 'application/zip' })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
      window.__lastKit = { name, files: files.map(f => f.name) };
      S.msg = 'Saved ' + name + (P.notYet(cc).length ? '. Not done yet: ' + P.notYet(cc).join('; ') + '.' : '.'); render();
    };
    if ($('delc')) $('delc').onclick = () => { if (!confirm('Remove this campaign? Your press contacts stay in CONTACTS.')) return; P.remove(c.id); S.open = ''; S.msg = 'Removed.'; render(); };
  }
  const q = new URLSearchParams(location.search).get('c'); if (q && P.get(q)) S.open = q;
  render();
  (async () => { try { if (window.Offices) { const hb = await Offices.load(); if (hb && hb.credits) { CREDITS = hb.credits; if (S.open) { const f = $('facts'); if (f) f.textContent = P.facts(P.get(S.open), you(), mine()).join('\n'); } } } } catch (e) { } })();
  window.PRESS = { render, state: S };
})();
