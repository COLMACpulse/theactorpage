/* PRESS: what's been written about you.
   LOOK FOR YOU  your name in quotes and the words you pick; SEARCH THE NEWS / THE WEB open Google in your browser, and a
                 Google Alert can email you more. Nothing here searches on its own.
   FOUND ONE?    paste the link (or share it here from your browser): it's kept, you add the headline, the outlet, the date,
                 the line about you. NOT ME takes it off.
   YOUR PRESS    the hits you kept, newest first. Private unless you switch one ON YOUR PAGE (then it's in the Hub page's
                 In the press). Send the list to your reps, or copy it.
   Folded away: THE PRESS KIT, for when you have news (your words, your facts, the photos you pick, a checklist). */
(function () {
  'use strict';
  const P = window.Press, C = window.Contacts, Y = window.You, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UK = 'press_ui_v1';
  const S = Object.assign({ open: '', edit: '', adding: false, msg: '', words: ['actor'], on: { actor: true }, kitOpen: false }, (() => { try { const u = JSON.parse(localStorage.getItem(UK) || '{}'); return { words: Array.isArray(u.words) ? u.words : ['actor'], on: u.on || { actor: true } }; } catch (e) { return {}; } })());
  const saveU = () => { try { localStorage.setItem(UK, JSON.stringify({ words: S.words, on: S.on })); } catch (e) { } };
  const opts = (list, cur) => list.map(([v, l]) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + esc(l) + '</option>').join('');
  let CREDITS = [], URLS = {};
  const you = () => { try { return Y ? Y.get() : {}; } catch (e) { return {}; } };
  const mine = () => { const y = you(), out = [], seen = {}; const add = x => { const k = String(x.title || '').toLowerCase(); if (!k || seen[k]) return; seen[k] = 1; out.push(x); }; (y.credits || []).forEach(c => add({ title: c.title, role: c.role || c.character, by: c.by })); CREDITS.forEach(c => add({ title: c.title, role: c.role || c.character, by: c.net || c.by })); return out; };
  const spotMe = () => { try { return (JSON.parse(localStorage.getItem('theactorpage_spotted_v1') || '{}') || {}).me || {}; } catch (e) { return {}; } };
  const repEmails = () => { const e = []; try { if (C) C.myReps().forEach(p => { if (p.email && e.indexOf(p.email) < 0) e.push(p.email); }); } catch (x) { } (spotMe().reps || []).forEach(r => { if (r.email && e.indexOf(r.email) < 0) e.push(r.email); }); return e; };
  const day = d => d ? P.day(d) : '';
  const projects = () => mine().map(c => c.title).filter(Boolean).slice(0, 8);
  const picked = () => S.words.filter(w => S.on[w]).concat(projects().filter(t => S.on['p:' + t]));
  const query = () => you().name ? P.query(you().name, picked()) : '';

  /* ---------- the front ---------- */
  function lookHtml() {
    const y = you(), q = query();
    let h = '<p class="kicker">Look for you</p><div class="card" id="lookbox">';
    if (!y.name) h += '<label class="lab" for="yname" style="margin-top:0">Your name, as it’s written about you</label><input class="field" id="yname" placeholder="Your name" style="margin-bottom:10px">';
    h += '<p class="dim small" style="margin:0 0 8px">Your name, in quotes, with a word that’s you. Add a project to narrow it down.</p><div class="chips" role="group" aria-label="Words to search with">'
      + (y.name ? '<span class="chip sm on" aria-disabled="true">“' + esc(y.name) + '”</span>' : '')
      + S.words.map(w => '<button type="button" class="chip sm' + (S.on[w] ? ' on' : '') + '" data-w="' + esc(w) + '" aria-pressed="' + !!S.on[w] + '">' + esc(w) + '</button>').join('')
      + projects().map(t => '<button type="button" class="chip sm' + (S.on['p:' + t] ? ' on' : '') + '" data-p="' + esc(t) + '" aria-pressed="' + !!S.on['p:' + t] + '">' + esc(t) + '</button>').join('')
      + '<span class="row" style="gap:6px"><input class="field" id="addw" placeholder="+ a word" aria-label="Add a word" style="width:130px;min-height:40px;padding:6px 10px"></span></div>';
    h += '<p class="q faint" id="qline" style="margin:0 0 10px">' + esc(q || 'Add your name first.') + '</p>'
      + '<div class="row"><a class="btn pri" id="s_news" target="_blank" rel="noopener" href="' + (q ? esc(P.searchUrl(q, 'news')) : '#') + '" style="flex:1">SEARCH THE NEWS</a><a class="btn" id="s_web" target="_blank" rel="noopener" href="' + (q ? esc(P.searchUrl(q, 'web')) : '#') + '" style="flex:1">SEARCH THE WEB</a></div>'
      + '<p class="faint small" style="margin:8px 0 0">Opens Google in your browser. What you search goes to Google; nothing else does.</p></div>';
    return h;
  }
  function hitRow(x) {
    return '<div class="hit" data-hit="' + x.id + '"><b>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.title || x.url) + '</a>' : esc(x.title)) + '</b><small>' + esc([x.outlet, day(x.date), x.project].filter(Boolean).join(' · ')) + '</small>'
      + (x.line ? '<p class="q">“' + esc(x.line) + '”</p>' : '')
      + '<div class="row" style="margin-top:6px"><button class="chip sm' + (x.onPage ? ' on' : '') + '" data-onpage="' + x.id + '" aria-pressed="' + x.onPage + '">' + (x.onPage ? 'ON YOUR PAGE' : 'NOT ON YOUR PAGE') + '</button><button class="lnk" data-edit="' + x.id + '">change it</button></div></div>';
  }
  function hitForm(x) {
    const v = k => esc(x[k] || '');
    return '<div class="card ask" id="hitform"><p class="kicker" style="color:var(--tung-text)">' + (S.fresh ? 'Kept. Check it’s you' : 'Change it') + '</p>'
      + (x.url ? '<p class="small" style="margin:-4px 0 6px;word-break:break-all"><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.url.replace(/^https?:\/\//, '').slice(0, 80)) + '</a></p>' : '')
      + '<label class="lab" for="h_title">Headline</label><input class="field" id="h_title" value="' + v('title') + '">'
      + '<div class="grid2"><div><label class="lab" for="h_outlet">Outlet</label><input class="field" id="h_outlet" value="' + v('outlet') + '"></div><div><label class="lab" for="h_date">Date</label><input class="field" type="date" id="h_date" value="' + v('date') + '"></div></div>'
      + '<label class="lab" for="h_project">The project (optional)</label><input class="field" id="h_project" list="projlist" value="' + v('project') + '"><datalist id="projlist">' + projects().map(t => '<option value="' + esc(t) + '">').join('') + '</datalist>'
      + '<label class="lab" for="h_line">The line about you (optional)</label><textarea class="field" id="h_line" rows="3" placeholder="Paste the sentence">' + esc(x.line || '') + '</textarea>'
      + '<div class="row" style="margin-top:10px"><button class="btn pri" id="h_save" style="flex:1">' + (S.fresh ? 'KEEP IT' : 'SAVE') + '</button><button class="btn" id="h_notme" style="flex:1">' + (S.fresh ? 'NOT ME' : 'TAKE IT OFF') + '</button></div></div>';
  }
  function home() {
    const H = P.hits(), x = S.edit && P.hit(S.edit), all = P.all();
    let h = S.msg ? '<p class="msg" id="msg">' + esc(S.msg) + '</p>' : '';
    h += '<div class="grid"><div class="colA">' + lookHtml();
    h += '<p class="kicker" style="margin-top:16px">Your press <i>' + H.length + '</i></p>';
    h += H.length ? '<div class="card list" id="hits">' + H.map(hitRow).join('') + '</div><div class="row"><a class="btn" id="toreps" href="#" style="flex:1">SEND IT TO YOUR REPS</a><button class="btn" id="copylist" style="flex:1">COPY THE LIST</button></div><p class="faint small" style="margin:6px 0 0">Private until you switch one on. ON YOUR PAGE puts it in In the press on your Hub page.</p>'
      : '<div class="card"><p class="dim small" style="margin:0">Nothing kept yet. Search, and when one’s really you, paste its link under FOUND ONE.</p></div>';
    h += '</div><div class="colB">';
    h += x ? hitForm(x) : '<p class="kicker">Found one?</p><div class="card ask" id="foundbox"><label class="lab" for="h_url" style="margin-top:0">Paste the link</label><input class="field" id="h_url" inputmode="url" placeholder="https://"><button class="btn pri block" id="h_keep" style="margin-top:10px">KEEP IT</button><p class="faint small" style="margin:8px 0 0">Then add the headline, the outlet and the line about you, if you want it. On a phone you can share it here from your browser.</p></div>';
    const q = query();
    h += '<div class="card" id="alertbox"><p class="kicker">Get an email when there’s more</p><p class="dim small" style="margin:-4px 0 10px">Google Alerts watches for your name and emails you. Set it up once, on Google, with your search filled in.</p><a class="btn block" id="s_alert" target="_blank" rel="noopener" href="' + (q ? esc(P.alertUrl(q)) : '#') + '">SET UP A GOOGLE ALERT</a></div>';
    h += '<details class="fold" id="kitfold"' + (S.kitOpen ? ' open' : '') + '><summary>THE PRESS KIT, FOR WHEN YOU HAVE NEWS</summary><p class="dim small" style="margin:0 0 10px">A premiere, a festival, a booking, a release. Your words, your facts, the photos you pick, and a checklist before it goes anywhere.</p>'
      + (all.length ? all.map(c => '<button type="button" class="person" data-open="' + c.id + '" style="border-top:1px solid var(--line)"><span class="pt"><b>' + esc(c.title) + '</b><small>' + esc([(P.MILESTONES.find(m => m[0] === c.milestone) || ['', 'News'])[1], c.where, c.date ? P.day(c.date) : ''].filter(Boolean).join(' · ')) + '</small></span></button>').join('') : '')
      + (S.adding ? '<div id="newkit"><div class="grid2"><div><label class="lab" for="n_title">The project</label><input class="field" id="n_title" list="projlist2" placeholder="The film, the show, the role"><datalist id="projlist2">' + projects().map(t => '<option value="' + esc(t) + '">').join('') + '</datalist></div>'
        + '<div><label class="lab" for="n_ms">The news</label><select class="field" id="n_ms">' + opts(P.MILESTONES, 'premiere') + '</select></div><div><label class="lab" for="n_date">When</label><input class="field" type="date" id="n_date"></div><div><label class="lab" for="n_where">Where</label><input class="field" id="n_where" placeholder="The festival, the theater, the network"></div></div>'
        + '<div class="row" style="margin-top:10px"><button class="btn pri" id="startit">START THE KIT</button><button class="btn ghost" id="nokit">CANCEL</button></div></div>'
        : '<button class="btn" id="start" style="margin-top:8px">START A PRESS KIT</button>') + '</details>';
    return h + '</div></div>';
  }

  /* ---------- the press kit ---------- */
  function kit(c) {
    const y = you(), sm = spotMe(); if (!c.links.page && sm.site) c.links.page = sm.site; if (!c.links.reel && sm.reel) c.links.reel = sm.reel;
    const ms = (P.MILESTONES.find(m => m[0] === c.milestone) || ['', 'News'])[1], ny = P.notYet(c);
    let h = '<div class="backbar"><button class="btn sm ghost" data-back>‹ PRESS</button><span class="kicker" style="margin:0">The press kit</span></div>';
    if (S.msg) h += '<p class="msg" id="msg">' + esc(S.msg) + '</p>';
    h += '<div class="grid"><div class="colA"><p class="kicker" style="margin:0">' + esc(ms) + '</p><p class="pname">' + esc(c.title) + '</p><p class="dim" style="margin:0 0 12px">' + esc([c.where, c.date ? P.day(c.date) : ''].filter(Boolean).join(' · ')) + '</p>'
      + '<label class="lab" for="c_hook">The news, in your words</label><textarea class="field" id="c_hook" rows="4" placeholder="What’s happening, and why someone who covers this would care.">' + esc(c.hook) + '</textarea>'
      + '<label class="lab" for="c_bio">A short bio, in your words</label><textarea class="field" id="c_bio" rows="4" placeholder="Two or three lines: who you are, what you do, what’s next.">' + esc(c.bio) + '</textarea>'
      + '<div class="grid2"><div><label class="lab" for="l_page">Your page</label><input class="field" id="l_page" inputmode="url" value="' + esc(c.links.page) + '" placeholder="https://"></div><div><label class="lab" for="l_reel">Reel</label><input class="field" id="l_reel" inputmode="url" value="' + esc(c.links.reel) + '" placeholder="https://"></div></div>'
      + '<label class="lab" for="l_more">More (trailer, tickets, the project’s page)</label><input class="field" id="l_more" inputmode="url" value="' + esc(c.links.more) + '" placeholder="https://">'
      + '<p class="lab">Your facts, to copy from</p><div class="raw small" id="facts" style="white-space:pre-wrap;font-family:var(--mono);background:var(--panel2);border-radius:8px;padding:10px 12px">' + esc(P.facts(c, y, mine()).join('\n')) + '</div><div class="row" style="margin-top:8px"><button class="btn sm" id="copyfacts">COPY THE FACTS</button></div></div>';
    h += '<div class="colB"><p class="kicker">Photos (tap to pick)</p><div class="row" id="photos">' + ((y.photos || []).map(ph => '<button type="button" class="ph' + ((c.photos || []).some(x => x.id === ph.id) ? ' on' : '') + '" data-ph="' + ph.id + '" aria-label="Pick this photo"><img data-src="' + ph.id + '" alt=""></button>').join('') || '<span class="faint small">No headshots yet. Add them in HEADSHOTS.</span>') + '</div>'
      + ((c.photos || []).length ? (c.photos || []).map((ph, i) => '<div class="row" style="margin-top:6px"><span class="small faint" style="min-width:70px">Photo ' + (i + 1) + '</span><input class="field" data-credit="' + ph.id + '" value="' + esc(ph.credit || '') + '" placeholder="Photo by" style="flex:1"></div>').join('') : '')
      + '<p class="kicker" style="margin-top:14px">Before it goes anywhere</p>' + P.CHECKS.map(([k, l]) => '<label class="chk"><input type="checkbox" data-check="' + k + '"' + ((c.checks || {})[k] ? ' checked' : '') + '> ' + esc(l) + '</label>').join('')
      + (ny.length ? '<p class="faint small" id="notyet">Not done yet: ' + esc(ny.join('; ')) + '.</p>' : '<p class="small" id="notyet" style="color:var(--good)">Ready.</p>')
      + '<button class="btn pri block" id="kit" style="margin-top:10px">SAVE THE PRESS KIT</button><p class="faint small" style="margin:6px 0 0">One zip: the kit as text and the photos you picked. Only facts you entered. Nothing is sent from here.</p>'
      + '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="lnk faint" id="delc">remove this kit</button></div></div></div>';
    return h;
  }

  /* ---------- draw and wire ---------- */
  function render() {
    const c = S.open && P.get(S.open);
    $('view').innerHTML = c ? kit(c) : home(); S.msg = ''; wire(c);
    document.querySelectorAll('img[data-src]').forEach(async im => { const id = im.dataset.src; try { if (!URLS[id]) { const b = await Y.photoBlob(id); if (b) URLS[id] = URL.createObjectURL(b); } if (URLS[id]) im.src = URLS[id]; } catch (e) { } });
  }
  function relink() { const q = query(); const n = $('qline'); if (n) n.textContent = q || 'Add your name first.'; if ($('s_news')) $('s_news').href = q ? P.searchUrl(q, 'news') : '#'; if ($('s_web')) $('s_web').href = q ? P.searchUrl(q, 'web') : '#'; if ($('s_alert')) $('s_alert').href = q ? P.alertUrl(q) : '#'; }
  function saveText(c) { if (!c) return; const v = id => $(id) ? $(id).value : undefined; const patch = {}; if ($('c_hook')) patch.hook = v('c_hook'); if ($('c_bio')) patch.bio = v('c_bio'); if ($('l_page')) patch.links = { page: v('l_page').trim(), reel: v('l_reel').trim(), more: v('l_more').trim() }; P.set(c.id, patch); }
  const copy = async (t, what) => { try { await navigator.clipboard.writeText(t); S.msg = what + ' copied.'; } catch (e) { S.msg = 'Couldn’t copy here. Select it and copy.'; } render(); };
  function keepUrl(url, extra) { const u = P.safeUrl(url); if (!u) { S.msg = 'That isn’t a link. It starts with https://'; render(); return; } const had = P.hits().some(h => h.url === u); const x = P.addHit(Object.assign({ url: u }, extra || {})); S.edit = x.id; S.fresh = !had; if (had) S.msg = 'Already in your press.'; render(); const f = $('hitform'); if (f) f.scrollIntoView({ block: 'start' }); const t = $('h_title'); if (t && !t.value) t.focus({ preventScroll: true }); }
  function wire(c) {
    const V = $('view');
    V.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { saveText(c); S.open = ''; S.kitOpen = true; render(); scrollTo(0, 0); });
    if (!c) {
      if ($('yname')) $('yname').onchange = e => { try { Y.set('name', e.target.value.trim()); } catch (x) { } render(); };
      V.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const w = b.dataset.w; S.on[w] = !S.on[w]; saveU(); render(); });
      V.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = 'p:' + b.dataset.p; S.on[k] = !S.on[k]; saveU(); render(); });
      if ($('addw')) $('addw').onkeydown = e => { if (e.key !== 'Enter') return; const w = e.target.value.trim().replace(/"/g, ''); if (!w) return; if (S.words.indexOf(w) < 0) S.words.push(w); S.on[w] = true; saveU(); render(); $('addw').focus(); };
      if ($('addw')) $('addw').onblur = e => { const w = e.target.value.trim().replace(/"/g, ''); if (!w || S.words.indexOf(w) >= 0) return; S.words.push(w); S.on[w] = true; saveU(); render(); };
      ['s_news', 's_web', 's_alert'].forEach(id => { const a = $(id); if (a) a.addEventListener('click', e => { if (!query()) { e.preventDefault(); S.msg = 'Add your name first.'; render(); } }); });
      if ($('h_keep')) $('h_keep').onclick = () => keepUrl($('h_url').value);
      if ($('h_url')) $('h_url').onkeydown = e => { if (e.key === 'Enter') keepUrl(e.target.value); };
      if ($('h_save')) $('h_save').onclick = () => { P.setHit(S.edit, { title: $('h_title').value, outlet: $('h_outlet').value, date: $('h_date').value, project: $('h_project').value, line: $('h_line').value }); S.msg = S.fresh ? 'Kept in your press.' : 'Saved.'; S.edit = ''; S.fresh = false; render(); };
      if ($('h_notme')) $('h_notme').onclick = () => { P.dropHit(S.edit); S.msg = S.fresh ? 'Taken off. Not you.' : 'Taken off.'; S.edit = ''; S.fresh = false; render(); };
      V.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { S.edit = b.dataset.edit; S.fresh = false; render(); const f = $('hitform'); if (f) f.scrollIntoView({ block: 'nearest' }); });
      V.querySelectorAll('[data-onpage]').forEach(b => b.onclick = () => { const x = P.hit(b.dataset.onpage); P.setHit(x.id, { onPage: !x.onPage }); S.msg = !x.onPage ? 'On your page, under In the press.' : 'Off your page. Still kept here.'; render(); });
      if ($('toreps')) $('toreps').onclick = () => { const a = $('toreps'), y = you(); a.href = P.mailto(repEmails().join(','), 'Press' + (y.name ? ': ' + y.name : ''), P.hitsText(P.hits(), y.name || '')); };
      if ($('copylist')) $('copylist').onclick = () => copy(P.hitsText(P.hits(), you().name || ''), 'The list');
      if ($('kitfold')) $('kitfold').ontoggle = e => { S.kitOpen = e.target.open; };
      if ($('start')) $('start').onclick = () => { S.adding = true; S.kitOpen = true; render(); $('n_title').focus(); };
      if ($('nokit')) $('nokit').onclick = () => { S.adding = false; render(); };
      if ($('startit')) $('startit').onclick = () => { const t = $('n_title').value.trim(); if (!t) { $('n_title').focus(); return; } const n = P.add({ title: t, milestone: $('n_ms').value, date: $('n_date').value, where: $('n_where').value }); S.adding = false; S.open = n.id; S.msg = 'Started. Now the news, in your words.'; render(); scrollTo(0, 0); };
      V.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { S.open = b.dataset.open; render(); scrollTo(0, 0); });
      return;
    }
    ['c_hook', 'c_bio', 'l_page', 'l_reel', 'l_more'].forEach(id => { const el = $(id); if (el) el.addEventListener('change', () => { saveText(c); const f = $('facts'); if (f) f.textContent = P.facts(P.get(c.id), you(), mine()).join('\n'); }); });
    if ($('copyfacts')) $('copyfacts').onclick = () => { saveText(c); copy(P.facts(P.get(c.id), you(), mine()).join('\n'), 'Your facts'); };
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
    if ($('delc')) $('delc').onclick = () => { if (!confirm('Remove this press kit?')) return; P.remove(c.id); S.open = ''; S.kitOpen = true; S.msg = 'Removed.'; render(); };
  }
  const q = new URLSearchParams(location.search);
  if (q.get('c') && P.get(q.get('c'))) S.open = q.get('c');
  /* shared here from your browser: ?title=&text=&url= */
  const su = q.get('url') || ((q.get('text') || '').match(/https?:\/\/\S+/) || [''])[0];
  render();
  if (su) { history.replaceState(null, '', location.pathname); keepUrl(su, { title: q.get('title') || '' }); }
  (async () => { try { if (window.Offices) { const hb = await Offices.load(); if (hb && hb.credits) { CREDITS = hb.credits; if (!S.edit && !S.open) render(); } } } catch (e) { } })();
  window.PRESS = { render, state: S };
})();
