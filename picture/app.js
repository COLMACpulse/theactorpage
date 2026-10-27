/* PICTURE IT: the wall, one wish, SHAMELESS PLUG, the lock screen. Data and rules in shared/viz.js. */
(function () {
  'use strict';
  const G = window.Viz, $ = id => document.getElementById(id), V = $('view');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d => { const m = String(d || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? MON[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : ''; };
  const URLS = {};
  let MSG = '', KIND = 'show', KIND_Q = '';
  const say = t => { MSG = t || ''; const m = $('msg'); if (m) m.textContent = MSG; };
  async function picURL(w) { if (!w.pic) return ''; if (URLS[w.pic]) return URLS[w.pic]; const b = await G.picBlob(w.pic); if (!b) return ''; return (URLS[w.pic] = URL.createObjectURL(b)); }
  const isWork = w => w.kind === 'show' || w.kind === 'film';
  function requestsFor(w) { try { return window.Inbox ? Inbox.all('request').filter(r => G.forRequest(r.data && r.data.title, [w])) : []; } catch (e) { return []; } }
  function go(q) { history.replaceState(null, '', location.pathname + (q ? '?' + q : '')); route(); }
  function route() { const p = new URLSearchParams(location.search); if (p.get('card') && G.plugGet(p.get('card'))) return cardView(p.get('card')); if (p.get('plug') && G.plugGet(p.get('plug'))) return plugOne(p.get('plug')); if (p.get('plugs') !== null || p.get('plug') === 'new') return plugs(); if (p.get('w') && G.get(p.get('w'))) return one(p.get('w')); if (p.get('lock') !== null) return lock(); wall(); }

  /* ---------- the wall ---------- */
  function poster(w, url) {
    const at = G.at(w), got = G.got(w), news = G.newsFor(w.id).length, req = isWork(w) && requestsFor(w).length;
    return '<div class="poster" data-kind="' + esc(w.kind) + '">' + (url ? '<img src="' + url + '" alt="">' : '<span class="type">' + esc(w.title) + (w.kind === 'other' ? '' : '<small>' + esc(w.kind.toUpperCase()) + '</small>') + '</span>') +
      (got ? '<span class="stamp">' + esc(at.label.toUpperCase()) + '</span>' : '') +
      (req && !got ? '<span class="flag">IN YOUR REQUESTS</span>' : news && !got ? '<span class="flag">IN THE NEWS</span>' : '') + '</div>';
  }
  async function tile(w) {
    const at = G.at(w);
    return '<button class="wish' + (G.got(w) ? ' got' : '') + '" type="button" data-w="' + w.id + '">' + poster(w, await picURL(w)) + '<b>' + esc(w.title) + '</b><i>' + esc(G.kindName(w.kind).toUpperCase()) + ' · ' + esc(at.label.toUpperCase()) + (at.date ? ' ' + esc(day(at.date)) : '') + '</i></button>';
  }
  async function wall() {
    const want = G.wanted(), got = G.gotten();
    let h = tabs('wall') + '<div class="addbar"><button class="btn" type="button" id="addOpen" data-ic="plus">ADD WHAT YOU WANT</button>' +
      (G.all().some(w => w.kind !== 'milestone' && w.kind !== 'role' && w.kind !== 'other') ? '<button class="btn ghost" type="button" id="news">CHECK THE NEWS</button>' : '') +
      (G.all().length ? '<button class="btn ghost" type="button" id="lockGo">MAKE IT MY LOCK SCREEN</button>' : '') + '</div><p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    h += '<div class="card hide" id="addBox"><p class="kick">ADD WHAT YOU WANT</p><label class="lab" for="a_t">WHAT IS IT</label><input class="field" id="a_t" placeholder="The show, the film, the person, the role, the milestone" autocomplete="off">' +
      '<div class="chips" id="a_k">' + G.KINDS.map(k => '<button type="button" class="chip' + (k[0] === KIND ? ' on' : '') + '" data-k="' + k[0] + '">' + esc(k[1].toUpperCase()) + '</button>').join('') + '</div>' +
      '<div class="row" style="margin-top:10px"><label class="btn quiet">ADD A PICTURE<input type="file" id="a_p" accept="image/*"></label><span class="mut small" id="a_pn">A screenshot of the poster, a photo, anything that makes you see it.</span></div>' +
      '<div class="row" style="margin-top:12px"><button class="btn" type="button" id="a_go">PUT IT ON THE WALL</button><button class="btn quiet" type="button" id="a_x">CANCEL</button></div></div>';
    if (!want.length && !got.length) h += '<div class="card" data-stick data-icbig="viz"><p class="kick">YOUR WALL IS EMPTY</p><p class="dim">The show you want to be on. The director you want to work with. Your union card. Put it up here, with a picture, and keep it where you see it every day. When it happens, it stays up, with the date.</p></div>';
    if (want.length) { h += '<h2>WANT IT <i>' + want.length + '</i></h2><div class="wallbox"><div class="wall">'; for (const w of want) h += await tile(w); h += '</div></div>'; }
    if (got.length) { h += '<h2>GOT IT <i>' + got.length + '</i></h2><div class="wallbox"><div class="wall">'; for (const w of got) h += await tile(w); h += '</div></div>'; }
    V.innerHTML = h; wireTabs();
    V.querySelectorAll('[data-w]').forEach(b => b.onclick = () => go('w=' + b.dataset.w));
    let file = null;
    $('addOpen').onclick = () => { $('addBox').classList.remove('hide'); $('a_t').focus(); };
    $('a_x').onclick = () => { $('addBox').classList.add('hide'); file = null; };
    $('a_k').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; KIND = b.dataset.k; $('a_k').querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); };
    $('a_p').onchange = e => { file = e.target.files && e.target.files[0] || null; $('a_pn').textContent = file ? file.name : ''; };
    const add = async () => { const t = $('a_t').value; const w = G.add({ title: t, kind: KIND }); if (!w) { say('Give it a name first.'); $('a_t').focus(); return; }
      if (file) { const r = await G.setPic(w.id, file); if (r.error) say('On the wall, but the picture didn\'t take: ' + r.error + '.'); else say(''); } else say('');
      wall(); };
    $('a_go').onclick = add; $('a_t').onkeydown = e => { if (e.key === 'Enter') add(); };
    if ($('news')) $('news').onclick = checkNews;
    if ($('lockGo')) $('lockGo').onclick = () => go('lock');
  }

  /* ---------- the news: the one public file, only when you tap ---------- */
  async function checkNews() {
    if (!window.Wire) return; say('Checking THE WIRE...');
    let w; try { w = await Wire.fetch(); } catch (e) { say(e.message); return; }
    const m = G.newsMatches(w); let n = 0;
    G.all().forEach(x => { if (m[x.id]) { n++; const old = G.newsFor(x.id), seen = new Set(old.map(o => o.id)); G.setNews(x.id, m[x.id].concat(old.filter(o => !m[x.id].some(y => y.id === o.id))).slice(0, 8)); } });
    say(n ? 'In the news: ' + n + ' on your wall. Tap one to see the stories.' : 'Nothing on your wall in the news right now. ' + (w.items || []).length + ' stories checked.');
    route();
  }

  /* ---------- one wish ---------- */
  async function one(id) {
    const w = G.get(id); if (!w) return go('');
    const steps = G.steps(w.kind), url = await picURL(w), reqs = isWork(w) ? requestsFor(w) : [], news = G.newsFor(w.id);
    const got = G.got(w);
    let castings = []; try { castings = window.Contacts ? Contacts.mine().filter(p => p.role === 'casting' && !p.dnc) : []; } catch (e) { }
    const cast = w.cid && window.Contacts ? Contacts.get(w.cid) : null;
    let h = '<div class="backbar"><a class="btn ghost" href="./" id="back">‹ THE WALL</a></div><p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    h += '<div class="one"><div>' + poster(w, url) + '<div class="row" style="margin-top:10px"><label class="btn quiet">' + (url ? 'CHANGE THE PICTURE' : 'ADD A PICTURE') + '<input type="file" id="o_p" accept="image/*"></label>' + (url ? '<button class="btn quiet" type="button" id="o_pd">TAKE IT OFF</button>' : '') + '</div></div><div>';
    const at = G.at(w);
    h += '<p class="kicker">' + esc(G.kindName(w.kind)) + '</p><p class="wtitle">' + esc(w.title) + '</p><p class="dim small" style="margin:0">' + esc(at.label) + (at.date ? ' · ' + esc(day(at.date)) : '') + (w.note ? '</p><p style="margin:10px 0 0">' + esc(w.note) : '') + '</p>';
    h += '<h2>THE TRAIL</h2><ul class="trail">' + steps.map(s => { const d = (w.trail || {})[s[0]] || ''; return '<li' + (d ? ' class="on"' : '') + '><b>' + esc(s[1]) + '</b><input type="date" data-step="' + s[0] + '" value="' + esc(d) + '" aria-label="' + esc(s[1]) + ' date">' +
      (s[0] === 'wanted' ? '' : d ? '<button class="btn quiet" type="button" data-clear="' + s[0] + '">TAKE IT OFF</button>' : '<button class="btn ghost" type="button" data-today="' + s[0] + '">' + (s === steps[steps.length - 1] ? 'IT HAPPENED, TODAY' : 'TODAY') + '</button>') + '</li>'; }).join('') + '</ul>';
    h += '<details class="fold" id="editfold"><summary>CHANGE IT · THE NAME, THE KIND, WHY</summary>';
    h += '<label class="lab" for="o_t">WHAT IS IT</label><input class="field" id="o_t" value="' + esc(w.title) + '">' +
      '<label class="lab" for="o_k">KIND</label><select class="field" id="o_k">' + G.KINDS.map(k => '<option value="' + k[0] + '"' + (k[0] === w.kind ? ' selected' : '') + '>' + esc(k[1]) + '</option>').join('') + '</select>' +
      (isWork(w) || w.kind === 'person' ? '<label class="lab" for="o_a">OTHER NAMES FOR IT</label><input class="field" id="o_a" value="' + esc((w.aka || []).join(', ')) + '" placeholder="A short name, a new season title">' : '') +
      '<label class="lab" for="o_n">WHY, IN YOUR WORDS</label><textarea class="field" id="o_n" rows="2">' + esc(w.note) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn" type="button" id="o_save">SAVE</button></div></details></div></div>';
    /* requests, casting, news, reps */
    if (isWork(w)) {
      h += '<h2>IN YOUR REQUESTS</h2>' + (reqs.length ? '<ul class="news">' + reqs.map(r => '<li><a href="../actor-os/">' + esc([r.data.title, r.data.role].filter(Boolean).join(', ')) + '</a>' + (r.data.due ? ' <span class="mut">· due ' + esc(day(String(r.data.due).slice(0, 10))) + '</span>' : '') + '</li>').join('') + '</ul>' : '<p class="mut small">When an audition request for it comes in, it shows here and in THIS WEEK.</p>');
      h += '<h2>WHO CASTS IT</h2>' + (cast ? '<p><b>' + esc(cast.name) + '</b> <button class="btn quiet" type="button" id="c_x">NOT THEM</button></p>' :
        '<div class="row">' + (castings.length ? '<select class="field" id="c_pick" style="flex:1;min-width:180px"><option value="">Pick from your contacts</option>' + castings.map(p => '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>').join('') + '</select>' : '') +
        '<input class="field" id="c_new" placeholder="Or type the casting office" style="flex:1;min-width:180px"><button class="btn ghost" type="button" id="c_go">LINK IT</button></div><p class="mut small">It goes in CONTACTS as casting, so the office and the show sit together.</p>');
    }
    if (w.kind !== 'milestone' && w.kind !== 'other' && w.kind !== 'role') {
      h += '<h2>IN THE NEWS</h2>' + (news.length ? '<ul class="news">' + news.map(n => '<li>' + (n.url ? '<a href="' + esc(n.url) + '" target="_blank" rel="noopener noreferrer">' + esc(n.t) + '</a>' : esc(n.t)) + ' <span class="mut">' + esc([n.src, day(n.at)].filter(Boolean).join(' · ')) + '</span></li>').join('') + '</ul>' : '<p class="mut small">Nothing found yet.</p>') +
        '<div class="row"><button class="btn ghost" type="button" id="o_news">CHECK THE NEWS</button></div><p class="mut small">One-word titles only count when the story puts them in quotes, the way the trades do. Add other names for it above to catch more.</p>';
    }
    if (!got && w.kind !== 'milestone' && w.kind !== 'other') h += '<h2>YOUR REPS</h2><label class="row"><input type="checkbox" id="o_reps"' + (w.reps ? ' checked' : '') + '> <span>Put it on my reps sheet, under what I\'m after</span></label>';
    /* plug it, any time */
    const mine = G.plugsFor(w.id);
    h += '<h2>SHAMELESS PLUG</h2>' + (mine.length ? '<ul class="news">' + mine.map(q => '<li><a href="?plug=' + esc(q.id) + '" data-plug="' + esc(q.id) + '">' + esc(G.plugKindName(q.kind)) + '</a> <span class="mut">' + esc(day(G.iso(new Date(q.made)))) + '</span></li>').join('') + '</ul>' : '') +
      '<div class="row"><button class="btn ghost" type="button" id="o_plug">PLUG IT</button></div>';
    h += '<div class="row" style="margin-top:28px"><button class="btn quiet" type="button" id="o_del">TAKE IT OFF THE WALL</button></div>';
    V.innerHTML = h;
    $('back').onclick = e => { e.preventDefault(); say(''); go(''); };
    $('o_p').onchange = async e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = await G.setPic(id, f); say(r.error ? 'That picture didn\'t take: ' + r.error + '.' : ''); one(id); };
    if ($('o_pd')) $('o_pd').onclick = async () => { await G.dropPic(id); one(id); };
    $('o_save').onclick = () => { G.set(id, { title: $('o_t').value, kind: $('o_k').value, note: $('o_n').value.trim(), aka: $('o_a') ? $('o_a').value.split(',').map(s => s.trim()).filter(Boolean) : w.aka }); say('Saved.'); one(id); };
    V.querySelectorAll('[data-step]').forEach(i => i.onchange = () => { if (i.value || i.dataset.step !== 'wanted') G.mark(id, i.dataset.step, i.value || ''); say(''); one(id); });
    V.querySelectorAll('[data-today]').forEach(b => b.onclick = () => { G.mark(id, b.dataset.today); const x = G.get(id); say(G.got(x) ? 'Got it. It stays on your wall, with the date.' : ''); one(id); });
    V.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => { G.mark(id, b.dataset.clear, ''); one(id); });
    if ($('c_go')) $('c_go').onclick = () => { let cid = $('c_pick') ? $('c_pick').value : ''; const nm = $('c_new').value.trim();
      if (!cid && nm && window.Contacts) { const ex = Contacts.find(nm); cid = ex ? ex.id : (Contacts.add({ name: nm, role: 'casting', note: 'Casts ' + w.title }) || {}).id || ''; }
      if (!cid) { say('Pick one, or type the office.'); return; } G.set(id, { cid }); say(''); one(id); };
    if ($('c_x')) $('c_x').onclick = () => { G.set(id, { cid: '' }); one(id); };
    if ($('o_news')) $('o_news').onclick = checkNews;
    if ($('o_reps')) $('o_reps').onchange = e => { G.set(id, { reps: e.target.checked }); say(e.target.checked ? 'On your reps sheet next time you send it.' : 'Off your reps sheet.'); };
    $('o_del').onclick = async () => { if (!confirm('Take "' + w.title + '" off your wall?')) return; await G.removeAll(id); say(''); go(''); };
    $('o_plug').onclick = () => { const q = G.plugAdd(G.plugFrom(G.get(id))); go('plug=' + q.id); };
    V.querySelectorAll('[data-plug]').forEach(a => a.onclick = e => { e.preventDefault(); go('plug=' + a.dataset.plug); });
  }
  /* ---------- SHAMELESS PLUG: any time, any news ---------- */
  function tabs(on) { return '<div class="row tabsrow"><a class="btn' + (on === 'wall' ? '' : ' quiet') + '" href="./" data-go="">THE WALL</a><a class="btn' + (on === 'plug' ? '' : ' quiet') + '" href="?plugs" data-go="plugs">SHAMELESS PLUG</a></div>'; }
  function wireTabs() { V.querySelectorAll('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); say(''); go(a.dataset.go); }); }
  async function plugBlobURL(q) { const b = await G.plugBlob(q); if (!b) return ''; const k = 'q:' + q.id + ':' + (q.pic || q.you || q.wid); return URLS[k] || (URLS[k] = URL.createObjectURL(b)); }
  function plugs() {
    const list = G.plugs();
    let h = tabs('plug') + '<p class="msg" id="msg" role="status">' + esc(MSG) + '</p><div class="card"><p class="kick">NEW PLUG</p><p class="dim small">Something to tell people about. Pick what it is, write it your way, and the facts drop in.</p><div class="chips">' +
      G.PLUGKINDS.map(k => '<button type="button" class="chip" data-new="' + k[0] + '">' + esc(k[1].toUpperCase()) + '</button>').join('') + '</div></div>';
    h += list.length ? '<h2>YOUR PLUGS</h2>' + list.map(q => { const r = G.plug(q.text, q); return '<button class="plugrow" type="button" data-plug="' + q.id + '"><span class="kick">' + esc(G.plugKindName(q.kind).toUpperCase()) + ' · ' + esc(day(G.iso(new Date(q.made)))) + '</span><span class="dim" style="display:block">' + esc(r.text || q.title || 'Not written yet') + '</span></button>'; }).join('') : '';
    V.innerHTML = h; wireTabs();
    V.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { const q = G.plugAdd({ kind: b.dataset.new }); go('plug=' + q.id); });
    V.querySelectorAll('[data-plug]').forEach(b => b.onclick = () => go('plug=' + b.dataset.plug));
  }
  const FIELD = {
    title: q => '<div><label class="lab" for="q_title">' + (q.kind === 'news' ? 'WHAT IT IS' : 'THE TITLE') + '</label><input class="field" id="q_title" value="' + esc(q.title) + '"></div>',
    role: q => '<div><label class="lab" for="q_role">YOUR ROLE</label><input class="field" id="q_role" value="' + esc(q.role) + '"></div>',
    date: q => '<div><label class="lab" for="q_date">' + (q.kind === 'airing' ? 'AIRS' : 'WHEN') + '</label><input class="field" type="date" id="q_date" value="' + esc(q.date) + '"></div>',
    time: q => '<div><label class="lab" for="q_time">AT</label><input class="field" type="time" id="q_time" value="' + esc(q.time) + '"></div>',
    where: q => '<div><label class="lab" for="q_where">' + (q.kind === 'airing' ? 'ON' : 'WHERE') + '</label><input class="field" id="q_where" value="' + esc(q.where) + '" placeholder="' + (q.kind === 'airing' ? 'The network or the app' : 'The network, the app, the theater') + '"></div>',
    by: q => '<div><label class="lab" for="q_by">SHOT BY</label><input class="field" id="q_by" value="' + esc(q.by) + '" placeholder="Your photographer"></div>'
  };
  const NM = { '[TITLE]': 'the title', '[SHOW]': 'the title', '[ROLE]': 'your role', '[WHEN]': 'when (a date still to come)', '[DATE]': 'the date', '[TIME]': 'the time', '[WHERE]': 'where', '[BY]': 'who shot it' };
  const PH = { airing: 'Check out [TITLE] [WHEN] on [WHERE].', headshot: 'New headshots! Shot by [BY].', worked: 'Had a blast playing [ROLE] on [TITLE].', news: '' };
  async function plugOne(id) {
    const q = G.plugGet(id); if (!q) return go('plugs'); KIND_Q = q.kind;
    const f = G.PLUGFIELDS[q.kind] || G.PLUGFIELDS.news, url = await plugBlobURL(q), wish = q.wid ? G.get(q.wid) : null;
    let heads = []; try { heads = window.You ? You.headshots() : []; } catch (e) { }
    let h = tabs('plug') + '<div class="backbar"><a class="btn ghost" href="?plugs" data-go="plugs">‹ YOUR PLUGS</a></div><p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    h += '<div class="card"><p class="kick">SHAMELESS PLUG' + (wish ? ' · FROM YOUR WALL: ' + esc(wish.title.toUpperCase()) : '') + '</p><div class="chips" id="q_kind">' + G.PLUGKINDS.map(k => '<button type="button" class="chip' + (k[0] === q.kind ? ' on' : '') + '" data-k="' + k[0] + '">' + esc(k[1].toUpperCase()) + '</button>').join('') + '</div>' +
      '<div class="grid2">' + f.map(k => FIELD[k](q)).join('') + '</div>' +
      '<label class="lab">THE PICTURE</label><div class="row" style="align-items:flex-start">' + (url ? '<img src="' + url + '" alt="" style="width:96px;border-radius:8px;border:1px solid var(--line)">' : '') +
      '<div class="row"><label class="btn quiet">' + (url ? 'A DIFFERENT PICTURE' : 'ADD A PICTURE') + '<input type="file" id="q_pic" accept="image/*"></label>' + (url ? '<button class="btn quiet" type="button" id="q_nopic">NO PICTURE</button>' : '') + '</div></div>' +
      (heads.length ? '<p class="mut small" style="margin:8px 0 4px">Or one of your headshots:</p><div class="row" id="q_heads">' + heads.slice(0, 8).map(p => '<button type="button" class="chip' + (q.you === p.id && !q.pic ? ' on' : '') + '" data-you="' + esc(p.id) + '" style="padding:2px;min-height:0;border-radius:6px"><img data-h="' + esc(p.id) + '" alt="headshot" style="width:56px;height:70px;object-fit:cover;border-radius:4px;display:block"></button>').join('') + '</div>' : '') +
      '<label class="lab" for="q_text">YOUR PLUG</label><textarea class="field" id="q_text" rows="4" placeholder="' + esc(PH[q.kind] || '') + '">' + esc(q.text) + '</textarea>' +
      '<div class="chips" id="q_tok">' + G.tokensFor(q.kind).map(t => '<button type="button" class="chip" data-tok="' + t[0] + '" title="' + esc(t[1]) + '">' + t[0] + '</button>').join('') + '</div>' +
      '<p class="mut small">Tap a blank to drop it in.' + (f.includes('date') ? ' [WHEN] says it the way you would: tonight, tomorrow night, this Friday, next Friday night at 10:00 PM.' : '') + '</p>' +
      '<div class="prev" id="q_prev"></div><p class="mut small" id="q_miss"></p>' +
      '<div class="row"><button class="btn" type="button" id="q_copy">COPY IT</button>' + (navigator.share ? '<button class="btn ghost" type="button" id="q_share">SHARE IT</button>' : '') +
      '<button class="btn quiet" type="button" id="q_keep">SAY IT THIS WAY EVERY TIME</button></div>' +
      (window.Postcard ? '<div class="row" style="margin-top:8px"><button class="btn ghost" type="button" id="q_card">MAKE THE CARD</button><span class="mut small">For your socials, an email or the mail.</span></div>' : '') +
      ((q.kind === 'airing' || q.kind === 'worked') ? '<div class="row" style="margin-top:8px">' + (window.Press ? (q.press && Press.get(q.press) ? '<a class="btn quiet" href="../press/?c=' + esc(q.press) + '">OPEN IT IN PRESS</a>' : '<button class="btn quiet" type="button" id="q_press">TELL THE PRESS TOO</button>') : '') +
        (window.You ? '<button class="btn quiet" type="button" id="q_cred">ADD IT TO MY CREDITS</button>' : '') + '</div>' : '') +
      '</div><div class="row" style="margin-top:20px"><button class="btn quiet" type="button" id="q_del">DELETE THIS PLUG</button></div>';
    V.innerHTML = h; wireTabs();
    V.querySelectorAll('img[data-h]').forEach(async im => { const k = 'h:' + im.dataset.h; if (!URLS[k]) { const b = await You.photoBlob(im.dataset.h); if (b) URLS[k] = URL.createObjectURL(b); } if (URLS[k]) im.src = URLS[k]; });
    const read = () => { const p = {}; ['title', 'role', 'date', 'time', 'where', 'by'].forEach(k => { const el = $('q_' + k); if (el) p[k] = el.type === 'date' || el.type === 'time' ? el.value : el.value.trim(); }); p.text = $('q_text').value; return G.plugSet(id, p); };
    const paint = () => { const x = read(), r = G.plug($('q_text').value, x);
      $('q_prev').textContent = r.text || 'Your plug shows here as you write it.';
      $('q_miss').textContent = r.missing.length ? 'Still blank: ' + r.missing.map(k => NM[k] || k).join(', ') + '.' : ''; return r; };
    V.querySelectorAll('#q_kind [data-k]').forEach(b => b.onclick = () => { read(); const x = G.plugGet(id); const patch = { kind: b.dataset.k }; if (!x.text.trim()) patch.text = G.shapeFor(b.dataset.k); G.plugSet(id, patch); plugOne(id); });
    ['q_title', 'q_role', 'q_date', 'q_time', 'q_where', 'q_by', 'q_text'].forEach(k => { const el = $(k); if (el) el.addEventListener('input', paint); });
    $('q_tok').onclick = e => { const b = e.target.closest('[data-tok]'); if (!b) return; const t = $('q_text'), a = t.selectionStart == null ? t.value.length : t.selectionStart, z = t.selectionEnd == null ? a : t.selectionEnd;
      const pre = t.value.slice(0, a), ins = (pre && !/\s$/.test(pre) ? ' ' : '') + b.dataset.tok; t.value = pre + ins + t.value.slice(z); t.focus(); const c = (pre + ins).length; t.setSelectionRange(c, c); paint(); };
    $('q_pic').onchange = async e => { const fl = e.target.files && e.target.files[0]; if (!fl) return; read(); const r = await G.plugPic(id, fl); say(r.error ? 'That picture didn\'t take: ' + r.error + '.' : ''); plugOne(id); };
    if ($('q_nopic')) $('q_nopic').onclick = async () => { read(); await G.plugNoPic(id); plugOne(id); };
    V.querySelectorAll('[data-you]').forEach(b => b.onclick = () => { read(); G.plugSet(id, { you: b.dataset.you, pic: '', nopic: false }); plugOne(id); });
    $('q_copy').onclick = async () => { const r = paint(); if (!r.text) { say('Write the plug first.'); return; } try { await navigator.clipboard.writeText(r.text); say('Copied. Paste it wherever you post.'); } catch (e) { say('Copy didn\'t work here. Press and hold the words above to copy them.'); } };
    if ($('q_share')) $('q_share').onclick = async () => { const r = paint(), x = G.plugGet(id); if (!r.text) { say('Write the plug first.'); return; }
      const data = { text: r.text }; try { const b = x.nopic ? null : await G.plugBlob(x); if (b) { const fl = new File([b], 'plug.jpg', { type: 'image/jpeg' }); if (!navigator.canShare || navigator.canShare({ files: [fl] })) data.files = [fl]; } } catch (e) { }
      try { await navigator.share(data); } catch (e) { } };
    $('q_keep').onclick = () => { const v = $('q_text').value.trim(); if (!v) { say('Write it first.'); return; } const k = G.plugGet(id).kind; G.keepShape(k, v); say('Kept. Your next ' + G.plugKindName(k).toUpperCase() + ' plug starts from this.'); };
    if ($('q_press')) $('q_press').onclick = () => { const x = read(); const c = Press.add({ title: x.title || 'News', milestone: x.kind === 'airing' ? 'release' : 'other', date: x.date || '', where: x.where }); if (c) { G.plugSet(id, { press: c.id }); location.href = '../press/?c=' + encodeURIComponent(c.id); } };
    if ($('q_cred')) $('q_cred').onclick = () => { const x = read(); if (!x.title) { say('Put in the title first.'); return; } const ch = You.fill({ credits: [G.credit(x, wish && wish.kind === 'film')] }, 'PICTURE IT'); say(ch.length ? 'Added to your credits. Every tool that uses your résumé has it.' : 'It\'s already in your credits.'); };
    if ($('q_card')) $('q_card').onclick = () => { read(); go('card=' + id); };
    $('q_del').onclick = async () => { if (!confirm('Delete this plug?')) return; await G.plugRemove(id); say(''); go('plugs'); };
    paint();
  }
  /* ---------- THE POSTCARD: your plug as a card (shared/postcard.js). The looks are design only; the words are yours. ---------- */
  let CSIZE = 'square', CSEND = 'post', CBM = { k: '', bm: null };
  const onlinePage = () => { try { return JSON.parse(localStorage.getItem('hub_online_v1') || 'null') || {}; } catch (e) { return {}; } };
  const shortDay = t => { const d = new Date(t); return MON[d.getMonth()] + ' ' + d.getDate(); };
  async function cardData(id) {
    const q = G.plugGet(id), you = window.You ? You.get() : {}, r = G.plug(q.text, q), d = Postcard.card(q, you, r.text, onlinePage());
    const b = d.photo ? await G.plugBlob(q) : null, k = b ? (q.pic || q.you || q.wid) + ':' + b.size : '';
    if (k !== CBM.k) { CBM = { k, bm: null }; if (b) { try { CBM.bm = await createImageBitmap(b); } catch (e) { } } }
    d.bitmap = CBM.bm; return d;
  }
  async function fonts() { try { await Promise.all(['600 30px Jost', '700 15px Jost', '700 13px "Courier Prime"'].map(f => document.fonts.load(f))); } catch (e) { } }
  const toBlob = cv => new Promise(r => cv.toBlob(r, 'image/png'));
  const mmss = x => { x = Math.max(0, Math.round(x || 0)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); };
  /* THE LIVE ONE on the card: your live headshot (HEADSHOTS) moving in the photo, the rest of the card as it is. For POST only. */
  let LIVEV = null;
  async function liveVideo() { if (LIVEV && LIVEV.k === (You.get().live || {}).added) return LIVEV.v; const b = await You.liveBlob(); if (!b) return null;
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.loop = true; v.src = URL.createObjectURL(b);
    await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 4000); }); LIVEV = { k: You.get().live.added, v }; return v; }
  const frameOf = (v, fr) => { if (!v.videoWidth) return null; if (fr.width !== v.videoWidth) { fr.width = v.videoWidth; fr.height = v.videoHeight; } fr.getContext('2d').drawImage(v, 0, 0); return fr; };
  let ANIM = 0;
  async function animateCard(id) { const my = ++ANIM, v = await liveVideo(); if (!v || my !== ANIM) return; const dd = await cardData(id), fr = document.createElement('canvas');
    v.play().catch(() => { }); const tick = () => { const cv = $('c_cv'); if (my !== ANIM || !cv || !cv.isConnected) return; const f = frameOf(v, fr); if (f) { dd.bitmap = f; Postcard.draw(cv, dd, CSIZE); } setTimeout(tick, 66); }; tick(); }
  async function cardVideo(id, size) { await fonts();
    try { const b = await You.liveBlob(); if (!b || typeof MediaRecorder === 'undefined') return null;
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = URL.createObjectURL(b);
      await new Promise(r => { v.onloadeddata = r; v.onerror = r; setTimeout(r, 4000); }); if (!v.videoWidth) return null;
      const dd = await cardData(id), fr = document.createElement('canvas'), cv = document.createElement('canvas'); dd.bitmap = frameOf(v, fr); Postcard.draw(cv, dd, size);
      if (!cv.captureStream) return null;
      const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
      const st = cv.captureStream(30), rec = new MediaRecorder(st, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : {}), parts = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
      const done = new Promise(r => { rec.onstop = r; });
      const secs = (You.get().live || {}).secs || 5; let t;
      rec.start(500); await v.play().catch(() => { });
      t = setInterval(() => { const f = frameOf(v, fr); if (f) { dd.bitmap = f; Postcard.draw(cv, dd, size); } }, 33);
      await new Promise(r => { v.onended = r; setTimeout(r, secs * 1000 + 600); });
      clearInterval(t); rec.stop(); await done; URL.revokeObjectURL(v.src);
      const type = (rec.mimeType || mime || 'video/webm').split(';')[0], ext = /mp4/.test(type) ? 'mp4' : 'webm';
      const q = G.plugGet(id); return new File(parts, 'card-' + Postcard.slug(q.title || 'plug') + '-' + size + '.' + ext, { type });
    } catch (e) { return null; } }
  async function cardBlob(id, size) { await fonts(); return toBlob(Postcard.draw(document.createElement('canvas'), await cardData(id), size)); }
  async function cardView(id) {
    const PC = window.Postcard, q = G.plugGet(id); if (!q || !PC) return go('plugs');
    const you = window.You ? You.get() : {}, words = G.plug(q.text, q).text, c = Object.assign({}, q.card || {}), d = await cardData(id), st = PC.settings();
    const canMove = !!(window.You && You.get().live && q.you && !q.pic), moving = canMove && (c.moving !== undefined ? !!c.moving : You.leadsLive());
    const hasPic = !!(await G.plugBlob(Object.assign({}, q, { nopic: false }))), socials = PC.socials(you), base = PC.pageBase(you, onlinePage());
    const save = patch => { const x = G.plugGet(id); G.plugSet(id, { card: Object.assign({}, x.card || {}, patch) }); };
    if (!c.look) save({ look: d.look });
    let h = '<div class="backbar"><a class="btn ghost" href="?plug=' + esc(id) + '" id="c_back">‹ THE PLUG</a></div><p class="msg" id="msg" role="status">' + esc(MSG) + '</p>';
    if (!words) { V.innerHTML = h + '<div class="card"><p class="kick">THE CARD</p><p class="dim">Write the plug first. The card carries your words, so it starts there.</p></div>'; $('c_back').onclick = e => { e.preventDefault(); go('plug=' + id); }; return; }
    const ck = (key, on, label, extra) => '<label class="row ck"><input type="checkbox" data-' + key + (on ? ' checked' : '') + (extra || '') + '> <span>' + label + '</span></label>';
    h += '<div class="card"><p class="kick">THE CARD</p><p class="dim small">Pick a look. The words are yours: change them on the plug.</p>' +
      '<div class="chips" id="c_looks">' + PC.LOOKS.map(l => '<button type="button" class="chip' + (d.look === l[0] ? ' on' : '') + '" data-look="' + l[0] + '" aria-pressed="' + (d.look === l[0]) + '">' + l[1] + '</button>').join('') + '</div>' +
      '<div class="chips" id="c_sizes">' + PC.SIZES.map(z => '<button type="button" class="chip' + (CSIZE === z[0] ? ' on' : '') + '" data-size="' + z[0] + '" aria-pressed="' + (CSIZE === z[0]) + '">' + z[1] + '</button>').join('') + '</div>' +
      '<p class="mut small" id="c_where">' + esc(PC.size(CSIZE)[2] + ' × ' + PC.size(CSIZE)[3] + ' · ' + PC.size(CSIZE)[4]) + '</p>' +
      '<div class="cards"><canvas id="c_cv" class="cardcv" role="img" aria-label="Your card"></canvas>' + (CSIZE === 'print' ? '<canvas id="c_bk" class="cardcv" role="img" aria-label="The back of your postcard"></canvas>' : '') + '</div>' +
      '<label class="lab">ON THE CARD</label>' +
      (hasPic ? ck('photo', d.photo, 'Your photo') + (canMove ? ck('moving', moving, 'Moving: your live one, ' + mmss(you.live.secs) + ' on a loop <span class="mut">for POST. Email and print take the still.</span>', d.photo ? '' : ' disabled') : '') : '<p class="mut small">No picture on this plug. Add one on the plug, or the card goes words only.</p>') +
      socials.map(x => ck('show="' + x.k + '"', c.show && c.show[x.k] !== undefined ? c.show[x.k] : PC.onCardDefault(you, x.k), esc(x.name) + ' <span class="mut">' + esc(x.text) + '</span>')).join('') +
      (base ? ck('show="page"', c.page !== undefined ? c.page : PC.onCardDefault(you, 'page'), 'Your page <span class="mut">' + esc(PC.bare(base)) + '</span>') : '') +
      (socials.length ? '' : '<p class="mut small">Your socials go in YOUR PROFILE, on the <a href="../#you">home page</a>. Just the handle.</p>') +
      '<label class="lab">THE LINKS</label>' +
      (d.page ? '<p class="small" style="margin:4px 0">Your page, always: <b>' + esc(PC.bare(d.page)) + '</b>' + (/#c-/.test(d.page) ? ' <span class="mut">opens right at this credit</span>' : '') + '</p>'
        : '<p class="small" style="margin:4px 0;color:var(--bad)">No page address yet. Put it in YOUR PROFILE (Your page) on the <a href="../#you">home page</a>, or put your page online from the <a href="../hub/?tab=package#online">Hub</a>.</p>') +
      (q.kind !== 'headshot' ? '<label class="lab" for="c_watch" style="margin-top:6px">WHERE TO WATCH (OPTIONAL)</label><input class="field" id="c_watch" inputmode="url" autocapitalize="off" spellcheck="false" value="' + esc(c.watch || '') + '" placeholder="Paste the show\'s page or trailer">' : '') +
      (you.rep ? ck('rep', !!c.rep, 'Your rep, as plain text <span class="mut">' + esc([you.rep, you.repPhone].filter(Boolean).join(' · ')) + '</span>') : '') +
      ck('qr', c.qr !== false, 'A QR code on the printed back <span class="mut">opens your page</span>', d.page ? '' : ' disabled') +
      '<div style="border-top:1px solid var(--line);margin-top:12px;padding-top:6px">' + ck('keep', st.keep, 'Keep this design') + '<p class="mut small" style="margin:0 0 0 30px">' + (st.keep ? 'Your next card starts on this look.' : 'Your next card starts fresh. Pick a look each time.') + '</p></div></div>';
    /* SEND IT: you send it. Nothing goes out on its own. */
    const tab = (k, l) => '<button type="button" class="btn' + (CSEND === k ? '' : ' quiet') + '" data-send="' + k + '">' + l + '</button>';
    h += '<h2>SEND IT</h2><p class="dim small">You send it. Nothing goes out on its own, and nothing reports back who opened it.</p><div class="row tabsrow">' + tab('post', 'POST') + tab('email', 'EMAIL') + tab('mail', 'MAIL') + '</div><div class="card" id="c_send">';
    if (CSEND === 'post') {
      h += '<p class="dim small">Your socials. Pick the size above (square or story), then share it.</p><div class="row">' + (navigator.share ? '<button class="btn" type="button" id="c_share">SHARE THE CARD</button>' : '') +
        '<button class="btn ghost" type="button" id="c_save">SAVE THE CARD</button><button class="btn quiet" type="button" id="c_copy">COPY YOUR WORDS</button></div>' +
        '<p class="mut small">' + (navigator.share ? 'SHARE opens your share sheet with the card and your words. Pick Instagram, TikTok, X, wherever. ' : '') + 'Your words come with your page link at the end. Instagram captions don\'t click, so put your page in your bio there.</p>' +
        (socials.filter(x => x.url).length ? '<div class="row">' + socials.filter(x => x.url).map(x => '<a class="btn quiet" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name.toUpperCase()) + ' ↗</a>').join('') + '</div>' : '') +
        '<p class="small" style="margin:12px 0 0">THEACTORPAGE can\'t post for you. It never signs in to your accounts.</p>';
    } else if (CSEND === 'email') {
      const people = window.Contacts ? PC.emailable(Contacts.mine()).sort((a, b) => a.name.localeCompare(b.name)) : [], sent = q.wrote || {};
      h += '<p class="dim small">One person at a time, from your own mail app. WRITE IT copies the wide card, then opens a new email with your words and links. Paste the card in under your words. You read it, you hit send.</p>' +
        '<label class="lab" for="c_subj">SUBJECT</label><input class="field" id="c_subj" value="' + esc(c.subject || '') + '" placeholder="Your subject">' +
        (people.length ? '<ul class="who">' + people.map(p => { const no = PC.noEmail(p), say = PC.says(p);
          return '<li><span class="wn"><b>' + esc(p.name) + '</b><span class="mut small">' + esc([p.company && p.company !== p.name ? p.company : '', window.Contacts ? Contacts.roleName(p.role) : ''].filter(Boolean).join(' · ')) + '</span>' +
            (no ? '<span class="warn">' + esc(PC.SAYS[say] || PC.SAYS.noemail) + '</span>' : '') + (sent[p.id] ? '<span class="mut small">You wrote one ' + esc(shortDay(sent[p.id])) + '</span>' : '') + '</span>' +
            '<span class="row"><button type="button" class="btn' + (no ? ' quiet' : ' ghost') + '" data-write="' + esc(p.id) + '">WRITE IT</button>' +
            (say === 'none' ? '' : '<button type="button" class="chip' + (say === 'noemail' ? ' on' : '') + '" data-noemail="' + esc(p.id) + '" aria-pressed="' + (say === 'noemail') + '">THEY SAY NO EMAIL</button>') + '</span></li>'; }).join('') + '</ul>'
          : '<p class="mut small">No one with an email yet. Say who casts each one on your wall.</p>') +
        '<div class="row"><button type="button" class="btn quiet" data-write="">WRITE ONE TO SOMEONE ELSE</button><button type="button" class="btn quiet" id="c_copycard">COPY THE CARD</button></div>';
    } else {
      const people = window.Contacts ? PC.mailable(Contacts.mine()).sort((a, b) => a.name.localeCompare(b.name)) : [], to = c.to || [];
      h += '<p class="dim small">The old way: a 4 × 6 postcard, printed and mailed to an office.</p><label class="lab">THE BACK</label>' +
        '<label class="row ck"><input type="radio" name="c_bk" value="to"' + (c.blank ? '' : ' checked') + '> <span>Addressed, from Contacts</span></label><label class="row ck"><input type="radio" name="c_bk" value="blank"' + (c.blank ? ' checked' : '') + '> <span>Blank, I\'ll write it by hand</span></label>' +
        '<label class="lab" for="c_note">A NOTE ON THE BACK (OPTIONAL)</label><textarea class="field" id="c_note" rows="2" placeholder="A line in your own words, or leave it for your handwriting">' + esc(c.back || '') + '</textarea>' +
        (c.blank ? '' : (people.length ? '<ul class="who">' + people.map(p => { const no = PC.noMail(p), say = PC.says(p), on = to.indexOf(p.id) >= 0;
          return '<li><span class="wn"><label class="row ck" style="margin:0"><input type="checkbox" data-to="' + esc(p.id) + '"' + (on ? ' checked' : '') + '> <b>' + esc(p.name) + '</b></label>' + (no ? '<span class="warn">' + esc(PC.SAYS[say] || PC.SAYS.nomail) + '</span>' : '') +
            (on ? '<label class="lab" for="c_ad_' + esc(p.id) + '">THEIR MAILING ADDRESS</label><textarea class="field" id="c_ad_' + esc(p.id) + '" data-addr="' + esc(p.id) + '" rows="3" placeholder="Street&#10;City, State ZIP">' + esc((p.mail || []).join('\n')) + '</textarea>' : '') + '</span>' +
            (say === 'none' ? '' : '<button type="button" class="chip' + (say === 'nomail' ? ' on' : '') + '" data-nomail="' + esc(p.id) + '" aria-pressed="' + (say === 'nomail') + '">THEY SAY NO MAIL</button>') + '</li>'; }).join('') + '</ul>'
          : '<p class="mut small">No offices yet. Say who casts each one on your wall, or print a blank back.</p>')) +
        '<label class="lab">PRINT IT</label><div class="row"><button type="button" class="btn" id="c_shop">FILE FOR A PRINT SHOP</button><button type="button" class="btn ghost" id="c_home">PRINT AT HOME</button></div>' +
        '<p class="mut small">PRINT SHOP: 4 × 6 at 300 dpi, front and back, ⅛ in bleed. Pick Save as PDF in the print window and take the file in. HOME: letter paper, two cards a sheet, cut on the dashed lines. Print the fronts, put the sheet back in, print the backs. Heavy card stock works best.</p>';
    }
    h += '</div>';
    V.innerHTML = h;
    $('c_back').onclick = e => { e.preventDefault(); say(''); go('plug=' + id); };
    const redraw = async () => { await fonts(); const dd = await cardData(id); PC.draw($('c_cv'), dd, CSIZE); if ($('c_bk')) { const P0 = ((G.plugGet(id).card || {}).to || [])[0], who = P0 && window.Contacts ? Contacts.get(P0) : null; PC.drawBack($('c_bk'), dd, (G.plugGet(id).card || {}).blank || !who ? null : { name: who.name, address: (who.mail || []).join('\n') }); } };
    redraw(); if (moving && d.photo && CSIZE !== 'print') animateCard(id);
    V.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { save({ look: b.dataset.look }); if (PC.settings().keep) PC.setSettings({ look: b.dataset.look }); cardView(id); });
    V.querySelectorAll('[data-size]').forEach(b => b.onclick = () => { CSIZE = b.dataset.size; cardView(id); });
    V.querySelectorAll('[data-send]').forEach(b => b.onclick = () => { CSEND = b.dataset.send; say(''); cardView(id); });
    const chk = (sel, fn) => { const el = V.querySelector(sel); if (el) el.onchange = () => { fn(el.checked); redraw(); }; };
    chk('[data-photo]', v => save({ photo: v }));
    chk('[data-moving]', v => { save({ moving: v }); cardView(id); });
    V.querySelectorAll('[data-show]').forEach(el => el.onchange = () => { const k = el.dataset.show; if (k === 'page') save({ page: el.checked }); else save({ show: Object.assign({}, (G.plugGet(id).card || {}).show || {}, { [k]: el.checked }) }); redraw(); });
    chk('[data-rep]', v => save({ rep: v })); chk('[data-qr]', v => save({ qr: v }));
    const kp = V.querySelector('[data-keep]'); if (kp) kp.onchange = () => { PC.setSettings({ keep: kp.checked, look: (G.plugGet(id).card || {}).look || 'slate' }); cardView(id); };
    if ($('c_watch')) { $('c_watch').oninput = () => save({ watch: $('c_watch').value.trim() }); $('c_watch').onchange = () => { if ($('c_watch').value.trim() && !PC.url($('c_watch').value)) say('That doesn\'t look like a link. Paste the whole address.'); else say(''); }; }
    /* POST */
    const isMoving = () => { const x = G.plugGet(id), cc = x.card || {}; return canMove && cc.photo !== false && (cc.moving !== undefined ? !!cc.moving : You.leadsLive()); };
    const fileOf = async size => { if (isMoving()) { say('Making the moving card…'); const v = await cardVideo(id, size); say(v ? '' : 'This browser couldn\'t make the moving card. Untick Moving to send the still.'); if (v) return v; } const b = await cardBlob(id, size); return b ? new File([b], 'card-' + PC.slug(q.title || 'plug') + '-' + size + '.png', { type: 'image/png' }) : null; };
    const postSize = () => (CSIZE === 'print' ? 'square' : CSIZE);
    if ($('c_share')) $('c_share').onclick = async () => { const f = await fileOf(postSize()), dd = await cardData(id), data = { text: PC.postWords('', dd) }; if (f && (!navigator.canShare || navigator.canShare({ files: [f] }))) data.files = [f]; try { await navigator.share(data); } catch (e) { } };
    if ($('c_save')) $('c_save').onclick = async () => { const f = await fileOf(postSize()); if (!f) { say('This browser wouldn\'t make the picture.'); return; } const u = URL.createObjectURL(f), a = document.createElement('a'); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000); say('Saved. Post it from your photos or your downloads.'); };
    if ($('c_copy')) $('c_copy').onclick = async () => { const dd = await cardData(id); try { await navigator.clipboard.writeText(PC.postWords('', dd)); say('Copied: your words and your page link.'); } catch (e) { say('Copy didn\'t work here.'); } };
    /* EMAIL: one at a time, from your mail app */
    if ($('c_subj')) $('c_subj').oninput = () => save({ subject: $('c_subj').value });
    const copyCard = async () => { try { const b = await cardBlob(id, 'wide'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); return true; } catch (e) { return false; } };
    if ($('c_copycard')) $('c_copycard').onclick = async () => say(await copyCard() ? 'The card is copied. Paste it into your email.' : 'This browser won\'t copy a picture. Pick WIDE above and SAVE THE CARD from POST, then attach it.');
    V.querySelectorAll('[data-write]').forEach(b => b.onclick = async () => { const p = b.dataset.write ? Contacts.get(b.dataset.write) : null;
      if (p && PC.noEmail(p) && !confirm(p.name + ' says no email from actors. Write one anyway?')) return;
      const copied = await copyCard(), dd = await cardData(id);
      if (p) { const x = G.plugGet(id); G.plugSet(id, { wrote: Object.assign({}, x.wrote || {}, { [p.id]: Date.now() }) }); }
      const a = document.createElement('a'); a.href = PC.mailto(p ? p.email : '', (G.plugGet(id).card || {}).subject || '', PC.emailBody(dd)); document.body.appendChild(a); a.click(); a.remove();
      MSG = copied ? 'The card is copied. Paste it into the email under your words.' : 'Your mail app opens with your words and links. To add the card, save the WIDE size from POST and attach it.'; cardView(id); });
    V.querySelectorAll('[data-noemail]').forEach(b => b.onclick = () => { const p = Contacts.get(b.dataset.noemail); Contacts.set(p.id, { plug: PC.says(p) === 'noemail' ? '' : 'noemail' }); cardView(id); });
    V.querySelectorAll('[data-nomail]').forEach(b => b.onclick = () => { const p = Contacts.get(b.dataset.nomail); Contacts.set(p.id, { plug: PC.says(p) === 'nomail' ? '' : 'nomail' }); cardView(id); });
    /* MAIL */
    V.querySelectorAll('input[name="c_bk"]').forEach(r => r.onchange = () => { save({ blank: r.value === 'blank' }); cardView(id); });
    if ($('c_note')) $('c_note').oninput = () => { save({ back: $('c_note').value }); redraw(); };
    V.querySelectorAll('[data-to]').forEach(el => el.onchange = () => { const p = Contacts.get(el.dataset.to);
      if (el.checked && PC.noMail(p) && !confirm(p.name + ' says no mail from actors. Send one anyway?')) { el.checked = false; return; }
      const t = ((G.plugGet(id).card || {}).to || []).filter(x => x !== el.dataset.to); if (el.checked) t.push(el.dataset.to); save({ to: t }); cardView(id); });
    V.querySelectorAll('[data-addr]').forEach(el => el.oninput = () => { Contacts.set(el.dataset.addr, { mail: el.value.split('\n').map(x => x.trim()).filter(Boolean) }); redraw(); });
    const printIt = async home => { say('Making the print file...'); await fonts(); const dd = await cardData(id), cc = G.plugGet(id).card || {};
      const who = cc.blank || !window.Contacts ? [null] : (cc.to || []).map(i => Contacts.get(i)).filter(Boolean).map(p => ({ name: p.name, address: (p.mail || []).join('\n') }));
      const list = who.length ? who : [null], front = URL.createObjectURL(await toBlob(PC.draw(document.createElement('canvas'), dd, 'print')));
      const backs = []; for (const w of list) backs.push(URL.createObjectURL(await toBlob(PC.drawBack(document.createElement('canvas'), dd, w))));
      const img = u => '<img src="' + u + '" alt="">';
      let body, css;
      if (!home) { css = '@page{size:6.25in 4.25in;margin:0}body{margin:0}img{display:block;width:6.25in;height:4.25in;break-after:page}'; body = backs.map(b => img(front) + img(b)).join(''); }
      else { css = '@page{size:letter;margin:0}body{margin:0}.sh{width:8.5in;height:11in;position:relative;break-after:page}.cd{position:absolute;left:1.125in;width:6.25in;height:4.25in}.cd img{width:100%;height:100%;display:block}.cd i{position:absolute;inset:.125in;border:1px dashed #888}.a{top:.9in}.b{top:5.85in}';
        const pairs = []; for (let i = 0; i < backs.length; i += 2) pairs.push(backs.slice(i, i + 2));
        body = pairs.map(pr => '<div class="sh">' + pr.map((b, i) => '<div class="cd ' + (i ? 'b' : 'a') + '">' + img(front) + '<i></i></div>').join('') + '</div><div class="sh">' + pr.map((b, i) => '<div class="cd ' + (i ? 'b' : 'a') + '">' + img(b) + '<i></i></div>').join('') + '</div>').join(''); }
      const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0'; fr.setAttribute('aria-hidden', 'true');
      fr.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><title>Postcard</title><style>' + css + '</style></head><body>' + body + '</body></html>';
      fr.onload = () => { const ims = [...fr.contentDocument.images]; Promise.all(ims.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => { say(''); try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { say('This browser wouldn\'t open the print window.'); } setTimeout(() => fr.remove(), 60000); }); };
      document.body.appendChild(fr); window.__lastPrint = { home, cards: list.length, css }; };
    if ($('c_shop')) $('c_shop').onclick = () => printIt(false);
    if ($('c_home')) $('c_home').onclick = () => printIt(true);
  }
  /* ---------- the lock screen: your wall, phone-sized, made here ---------- */
  async function lock() {
    const wl = G.wall();
    V.innerHTML = '<div class="backbar"><a class="btn ghost" href="./" id="back">‹ THE WALL</a></div><h2>MAKE IT MY LOCK SCREEN</h2><div class="card lock"><p class="dim">Your wall, the size of your phone screen, with room at the top for the clock. Made on this phone; nothing is sent.</p>' +
      '<label class="lab" for="l_h">ACROSS THE TOP (OR NOTHING)</label><input class="field" id="l_h" value="' + esc(wl.head) + '">' +
      '<label class="row" style="margin-top:10px"><input type="checkbox" id="l_g"' + (wl.got !== false ? ' checked' : '') + '> <span>Show what I\'ve already got, too</span></label>' +
      '<div class="row" style="margin-top:12px"><button class="btn" type="button" id="l_go">MAKE IT</button></div><img id="l_img" alt="Your lock screen" class="hide">' +
      '<div class="row hide" id="l_out"><a class="btn" id="l_save" download="picture-it-lock-screen.png">SAVE IT</a>' + (navigator.share ? '<button class="btn ghost" type="button" id="l_share">SHARE IT</button>' : '') + '</div>' +
      '<p class="mut small hide" id="l_how">iPhone: save it to Photos, open it, tap Share, then Use as Wallpaper. Android: open it in Photos, then Use as, Wallpaper, Lock screen.</p></div><p class="msg" id="msg" role="status"></p>';
    $('back').onclick = e => { e.preventDefault(); go(''); };
    let blob = null;
    $('l_go').onclick = async () => { G.setWall({ head: $('l_h').value.trim(), got: $('l_g').checked }); say('Making it...');
      blob = await drawLock(G.wall()); if (!blob) { say('This phone wouldn\'t make the picture.'); return; }
      const u = URL.createObjectURL(blob); $('l_img').src = u; $('l_img').classList.remove('hide'); $('l_save').href = u; $('l_out').classList.remove('hide'); $('l_how').classList.remove('hide'); say(''); };
    if ($('l_share')) $('l_share').onclick = async () => { if (!blob) return; const f = new File([blob], 'picture-it-lock-screen.png', { type: 'image/png' }); try { await navigator.share({ files: [f] }); } catch (e) { } };
  }
  const KCOL = { show: '#1f3a5c', film: '#5a2a22', person: '#2f3a30', role: '#3d3150', milestone: '#4a3c1c', other: '#33302b' };
  async function drawLock(wl) {
    const W = 1179, H = 2556, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    try { await document.fonts.load('600 80px Jost'); } catch (e) { }
    x.fillStyle = '#121110'; x.fillRect(0, 0, W, H);
    const list = G.wanted().concat(wl.got !== false ? G.gotten() : []);
    const top = 760, pad = 70, gap = 34;
    if (wl.head) { x.fillStyle = '#e0a23c'; x.font = '600 76px Jost, sans-serif'; x.textAlign = 'center'; x.fillText(wl.head.toUpperCase().split('').join(String.fromCharCode(8202)), W / 2, top - 70); }
    const n = Math.max(1, list.length), cols = n <= 4 ? 2 : n <= 9 ? 3 : 4, cw = (W - pad * 2 - gap * (cols - 1)) / cols, ch = cw * 1.5;
    const rows = Math.ceil(n / cols), fit = Math.min(1, (H - top - 160) / (rows * ch + (rows - 1) * gap)), w = cw * fit, hgt = ch * fit;
    for (let i = 0; i < list.length; i++) {
      const it = list[i], r = Math.floor(i / cols), inRow = Math.min(cols, list.length - r * cols), rx = (W - (inRow * w + (inRow - 1) * gap)) / 2, cx = rx + (i % cols) * (w + gap), cy = top + r * (hgt + gap);
      x.save(); x.beginPath(); if (x.roundRect) x.roundRect(cx, cy, w, hgt, 18); else x.rect(cx, cy, w, hgt); x.clip();
      x.fillStyle = KCOL[it.kind] || '#2b2722'; x.fillRect(cx, cy, w, hgt);
      let drew = false; const b = it.pic ? await G.picBlob(it.pic) : null;
      if (b) { try { const bm = await createImageBitmap(b); const k = Math.max(w / bm.width, hgt / bm.height), dw = bm.width * k, dh = bm.height * k; x.drawImage(bm, cx + (w - dw) / 2, cy + (hgt - dh) / 2, dw, dh); drew = true; } catch (e) { } }
      if (!drew) { x.fillStyle = '#ece7dc'; x.textAlign = 'center'; const fs = Math.round(w / 8); x.font = '600 ' + fs + 'px Jost, sans-serif'; wrap(x, it.title.toUpperCase(), cx + w / 2, cy + hgt / 2, w - 40, fs * 1.2); }
      if (G.got(it)) { const s = G.at(it).label.toUpperCase(); x.font = '700 ' + Math.round(w / 12) + 'px "Courier Prime", monospace'; const tw = x.measureText(s).width; x.fillStyle = '#e0a23c'; x.fillRect(cx + 16, cy + hgt - w / 12 - 40, tw + 28, w / 12 + 22); x.fillStyle = '#17110a'; x.textAlign = 'left'; x.fillText(s, cx + 30, cy + hgt - 30); }
      x.restore();
    }
    return new Promise(r => c.toBlob(r, 'image/png'));
  }
  function wrap(x, t, cx, cy, mw, lh) { const ws = t.split(/\s+/), L = []; let l = ''; ws.forEach(w => { const s = l ? l + ' ' + w : w; if (x.measureText(s).width > mw && l) { L.push(l); l = w; } else l = s; }); if (l) L.push(l); const y0 = cy - (L.length - 1) * lh / 2; L.forEach((s, i) => x.fillText(s, cx, y0 + i * lh)); }

  window.__viz = { route, drawLock, cardBlob };
  route();
})();
