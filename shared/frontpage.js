/* THEACTORPAGE · THE FRONT PAGE, your studio (index.html). Col, Oct 26.
   A computer, set up: your studio, the three rooms (ACT, WRITE, FILM), each door with its house icon and each room under the slate sticks, Actor OS for your phone with a QR
   code, and your backup. A first visit: Start here, two things (your résumé, one headshot), then you're set.
   A phone: Actor OS, and Picture It; the studio is one tap away. The pitch lives on how.html.
   Reads on this device only: your profile (shared/you.js) and a count or two from the tools. Writes only your profile. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const Y = window.You, X = window.Intake;
  const J = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const n = (x, w, ws) => x + ' ' + (x === 1 ? w : (ws || w + 's'));
  let tt; const toast = m => { const t = $('toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3200); };

  /* where you are: a phone shows Actor OS first; "open the studio here anyway" holds for this visit */
  const isPhone = () => { try { return matchMedia('(max-width:700px)').matches && matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } };
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  const you = () => { try { return Y ? Y.get() : {}; } catch (e) { return {}; } };
  const shots = () => (you().photos || []).filter(p => p.kind !== 'still');
  /* set up: anything of yours on this device, from any tool */
  function setUp() {
    try { if (Y && Y.has()) return true; } catch (e) { }
    const any = ['paper_trail_v1', 'film_os_v1', 'filmhub_v1', 'theactorpage_contacts_v1', 'writers-blockage-index', 'setlist_v1', 'actor_os_wired_v06', 'theactorpage_shelf_v1'];
    return any.some(k => { const v = J(k); return v && (Array.isArray(v) ? v.length : Object.keys(v).length); });
  }
  function which() {
    if (isPhone() && ss('tap_studio') !== '1') return 'phone';
    if (ss('tap_skip') === '1') return 'studio';
    /* a first visit stays Start here until both are in, or you skip it */
    if (ss('in_first') === '1' && !(you().resume && shots().length)) return 'first';
    if (setUp()) return 'studio';
    ss('in_first', '1'); return 'first';
  }

  /* counts where they're cheap and true */
  function counts() {
    const c = {};
    c.shots = shots().length;
    try { const d = J('theactorpage_contacts_v1'); const L = d && (d.people || d.contacts || (Array.isArray(d) ? d : null)); if (L && L.length) c.contacts = L.length; } catch (e) { }
    try { const d = J('paper_trail_v1'); if (d && d.projects) c.pt = Object.keys(d.projects).length; } catch (e) { }
    try { const h = J('filmhub_v1'), s = J('film_os_v1'); const a = (h && h.films ? h.films.length : 0) + (s && s.scripts ? Object.values(s.scripts).filter(x => x && x.text).length : 0); if (a) c.films = a; } catch (e) { }
    return c;
  }
  const qr = url => { try { if (!window.qrcode) return ''; const q = qrcode(0, 'L'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { return ''; } };
  const aosUrl = () => { try { return new URL('actor-os/', location.href).href; } catch (e) { return 'actor-os/'; } };

  function topLinks(v) {
    const y = you();
    let h = '<a href="how.html" class="hide-s">How it works</a><a href="how.html#cost" class="hide-s">What it costs</a><a href="privacy/">Privacy</a>';
    if (v === 'studio') h = '<a href="device/">On This Device</a>' + h + '<a class="who" href="hub/" aria-label="Your page">' + '<span>Your page</span></a>';
    $('tlinks').innerHTML = h;
  }

  /* SET UP, 5 steps (Col, Oct 31: "how are we going to teach users how to navigate the site?"). A checklist at the top of
     the studio that ticks itself off from what's really there and is gone for good once all five are done (or hidden). */
  const SETUP = 'theactorpage_setup_v1';
  const setupGet = () => { try { return JSON.parse(localStorage.getItem(SETUP) || '{}') || {}; } catch (e) { return {}; } };
  const setupSet = o => { try { localStorage.setItem(SETUP, JSON.stringify(Object.assign(setupGet(), o))); } catch (e) { } };
  function setupSteps() {
    const y = you(), st = setupGet(), J2 = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    const on = J2('hub_online_v1') || {}, fc = J2('footcloud_v1') || {}, nClips = (fc.items || []).filter(x => x && x.done !== false).length, nShots = shots().length;
    const r = [
      { k: 'resume', t: 'Your résumé', say: 'It fills in your credits, training and rep for every tool.', done: !!y.resume, did: y.resume && y.resume.name ? y.resume.name : 'on file', href: 'hub/?tab=intake' },
      { k: 'head', t: 'A headshot', say: 'The first one leads your page.', done: nShots > 0, did: nShots + ' headshot' + (nShots === 1 ? '' : 's'), href: 'headshots/' },
      { k: 'clips', t: 'Your clips, up', say: 'Point Footage at a folder; it sorts what plays and asks what to upload.', done: nClips > 0, did: nClips + ' clip' + (nClips === 1 ? '' : 's') + ' online · only you can see them', href: 'footage/' },
      { k: 'page', t: 'Your page: pick how it looks', say: 'Poster wall or résumé. Leave off anything you don\'t want on it.', done: !!(st.page || on.live), did: 'picked', href: 'hub/?tab=package' },
      { k: 'online', t: 'Put it online', say: 'Your own address, yourname.theactorpage.com. Free.', done: !!on.live, did: on.url ? on.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'live', href: 'hub/?tab=package' }
    ];
    return r;
  }
  function setupBox() {
    const st = setupGet(); if (st.hidden || st.done) return '';
    const r = setupSteps(), n = r.filter(x => x.done).length;
    if (n === r.length) { setupSet({ done: new Date().toISOString() }); return ''; }
    const next = r.findIndex(x => !x.done);
    return '<section class="setup" id="setup" aria-label="Set up your studio"><div class="suhd"><span class="suk">SET UP · ' + n + ' OF ' + r.length + '</span><span class="susay">Do them in any order. This goes away when all five are done.</span>'
      + '<button type="button" class="suhide" id="setupHide">Hide this</button></div>'
      + '<div class="subar" aria-hidden="true"><i style="width:' + Math.round(100 * n / r.length) + '%"></i></div><ol class="sulist">'
      + r.map((x, i) => '<li class="' + (x.done ? 'done' : i === next ? 'next' : '') + '" data-step="' + x.k + '"><span class="sun" aria-hidden="true">' + (x.done ? '✓' : (i + 1)) + '</span>'
        + '<span class="sut"><b>' + esc(x.t) + '</b><small>' + esc(x.done ? x.did : x.say) + '</small></span>'
        + (x.done ? '<span class="sudone">DONE</span>' : '<a class="sugo" href="' + x.href + '" aria-label="' + esc(x.t) + ': do it">DO IT</a>') + '</li>').join('')
      + '</ol></section>';
  }

  const I = (id, cls) => window.Icons ? Icons.ring(id, cls) : '';
  const B = id => window.Icons ? Icons.bare(id) : '';
  function studio() {
    const c = counts(), d = (ic, l, href, say) => '<a href="' + href + '">' + I(ic) + '<span><b>' + esc(l) + '</b><i>' + esc(say) + '</i></span></a>';
    const room = (k, name, sub, doors) => '<section class="room ' + k + '" aria-label="' + name + '"><span class="sticks" aria-hidden="true"></span><div class="rin"><span class="k">' + name + '</span><span class="rsub">' + sub + '</span>' + doors + '</div></section>';
    /* you, first (Col, Oct 26): your headshot, big, under the bar and above Your studio */
    const y = you(), sh = shots(), ph = sh.find(x => x.id === y.primary) || sh[0];
    /* your live page, one tap (Col, Oct 30) */
    const live = (() => { try { const o = JSON.parse(localStorage.getItem('hub_online_v1') || 'null'); return o && o.live && /^https:\/\//.test(o.url || '') ? o : null; } catch (e) { return null; } })();
    const facts = [y.union, y.locations, y.rep ? 'rep: ' + y.rep : ''].filter(Boolean).join(' · ');
    const me = '<section class="me" aria-label="You">' + (ph ? '<a class="mephoto" href="headshots/" aria-label="Your headshots"><img data-photo="' + esc(ph.id) + '" alt="Your headshot"></a>'
        : '<label class="mephoto none"><input type="file" id="meShot" accept="image/*" hidden><span>ADD A HEADSHOT</span></label>')
      + '<div class="metx"><b class="mename">' + esc(y.name || 'Your name') + '</b>' + (facts ? '<span class="mefacts">' + esc(facts) + '</span>' : '')
      + (live ? '<a class="melive" id="meLive" href="' + esc(live.url) + '" target="_blank" rel="noopener"><b>YOUR PAGE IS LIVE ↗</b><small>' + esc(live.url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</small></a>' : '')
      + '<span class="melinks"><a href="hub/?tab=package">Your page ›</a><a href="headshots/">Headshots' + (sh.length ? ' · ' + sh.length : '') + ' ›</a>' + (y.resume ? '' : '<a href="hub/?tab=intake">Add your résumé ›</a>') + '</span></div></section>';
    return me + setupBox() + '<div class="shead"><h1>Your studio</h1></div>'
      + '<div class="sgrid"><div class="rooms">'
      + room('act', 'SHOWCASE', 'What casting sees of you',
        d('hub', 'Your page', 'hub/', 'résumé, credits, press') + d('head', 'Headshots', 'headshots/', c.shots ? 'and your looks · ' + c.shots : 'and your looks')
        + d('arch', 'Reel Room', 'archbook/', 'a reel for the role') + d('footage', 'Footage', 'footage/', 'everything you\'ve shot, playable'))
      + room('act', 'THE WORK', 'Before the room',
        d('mem', 'Memorizer', 'memorizer/', 'learn your lines at your desk') + d('vo', 'VO Booth', 'booth/', 'a VO audition from your desk')
        + d('chars', 'Characters', 'characters/', 'every role, played or read') + d('viz', 'Picture It', 'picture/', 'what you want'))
      /* WRITE and FILM (Col, Oct 30: FILM dropped again, WRITE stays): a smaller row under the acting rooms */
      + room('write own own2', 'WRITE', 'Make your own',
        d('wb', 'THEACTORPAGES', 'write/writers-blockage.html', 'a monologue, a scene, a short; every draft kept'))
      + '</div><aside class="side">'
      + '<div class="aos" id="aosCard"><span class="sticks" aria-hidden="true"></span><div class="ain"><span class="k">' + I('actor', 'sm') + 'ACTOR OS · HERE OR ON YOUR PHONE</span><b>Audition day: read it, learn it, shoot it, send it.</b>'
      + '<div class="fsteps4" aria-hidden="true"><span>READ</span><span>LEARN</span><span>SHOOT</span><span>SEND</span></div>'
      + '<a class="aosgo" href="actor-os/" id="aosHere"><span>OPEN ACTOR OS ON THIS COMPUTER</span><i>Works the same on a laptop or a tablet</i></a>'
      + '<p class="aossay">Paste the casting email or drop the sides. It reads your role, runs your lines with you, tapes you with this camera and sends it the way they asked. VO Booth, Read In and Spotted are in there too.</p>'
      + '<span class="aosor">OR ON YOUR PHONE</span>'
      + '<div class="qr"><div class="code" aria-label="A code for your phone\'s camera: it opens Actor OS">' + qr(aosUrl()) + '</div><small>Point your phone\'s camera here, then Share › Add to Home Screen.</small></div></div></div>'
      + '<div class="yours">' + I('dev') + '<div><span class="k">YOURS</span>Everything stays on this computer. Back it up, or move it to your phone, from <a href="device/">On This Device</a>.</div></div>'
      + '</aside></div>'
      + '<p class="foot"><a href="how.html">How it works</a><a href="how.html#act">Every tool</a><a href="how.html#cost">What it costs</a><a href="privacy/">Privacy</a></p>';
  }

  function first() {
    const y = you(), hasRes = !!y.resume, hasShot = shots().length > 0;
    const row = (t, say, done, btn) => '<div class="srow"><div><b>' + t + '</b><span>' + say + '</span></div>' + (done ? '<span class="done">✓ ' + done + '</span>' : btn) + '</div>';
    return '<div class="first"><div><span class="k lead">FOR ACTORS</span>'
      + '<h1>Your studio on a computer.<br>Actor OS on your phone.</h1>'
      + '<p class="say">Set up your page, your headshots and your reel here. On audition day, your phone takes the sides to a sent tape. Free, and it all stays on your devices.</p>'
      + '<div class="start" id="start"><span class="sticks" aria-hidden="true"></span><div class="stin"><b>Start here. Two things, then you\'re set.</b>'
      + row('1 · Your résumé', 'PDF, Word or text. It fills in your credits, training and rep for every tool.', hasRes ? esc(y.resume.name) : '', '<label class="btn pri">ADD YOUR RÉSUMÉ<input type="file" id="stRes" accept=".pdf,.docx,.txt,.text,.rtf,.md"></label>')
      + row('2 · One headshot', 'It goes on your page, your slate and your postcard.', hasShot ? 'added' : '', '<label class="btn">ADD A HEADSHOT<input type="file" id="stShot" accept="image/*"></label>')
      + '<span class="note">The rest fills in as you go. Sides come one audition at a time, on your phone.</span></div></div>'
      + '<div class="alt"><a href="demo/?try">Or try it with a sample scene first ›</a><button type="button" class="lnk" id="stSkip" style="background:none;border:0;padding:0;color:var(--dim);font-size:14px">Skip, show me the studio ›</button></div></div>'
      + '<aside class="inside"><span class="k">WHAT\'S IN THE STUDIO</span>'
      + '<div class="ib act"><span class="k">SHOWCASE</span>Your page, headshots, reels, everything you\'ve shot</div>'
      + '<div class="ib act"><span class="k">THE WORK</span>Learn your lines, a VO booth, every role you\'ve played, Picture It</div>'
      + '<div class="ib write"><span class="k">WRITE</span>A monologue, a scene or a short, every draft kept</div>'
      + '<div class="ib aosb"><span class="k">ACTOR OS · HERE OR ON YOUR PHONE</span>Read it, learn it, shoot it, send it, on this computer or your phone. Plus a VO booth for the closet.</div>'
      + '</aside></div>';
  }

  function phone() {
    const st = (ic, w) => '<span>' + B(ic) + w + '</span>';
    return '<div class="phone"><div class="pcard"><span class="sticks" aria-hidden="true"></span><div class="pin"><span class="k">' + I('actor', 'sm') + 'ON YOUR PHONE</span><b>Actor OS. Sides in, tape sent.</b>'
      + '<p>Read your role, learn it, shoot it and send it the way they asked.</p>'
      + '<div class="psteps" aria-hidden="true">' + st('break', 'READ') + st('mem', 'LEARN') + st('slate', 'SHOOT') + st('send', 'SEND') + '</div>'
      + '<a class="btn pri" href="actor-os/" id="pAos">OPEN ACTOR OS</a><small>Then Share › Add to Home Screen, and it opens like an app.</small></div></div>'
      + '<a class="plink" href="picture/">' + I('viz', 'dim') + '<span><b>Picture It</b><span>What you want, where you can see it.</span></span></a>'
      + '<div class="pst">' + I('hub', 'dim') + '<div><span class="k">THE STUDIO</span>Your page, headshots, reels and writing are built for a computer. Open theactorpage.com there.'
      + '<button type="button" id="pStudio">Open the studio here anyway ›</button></div></div>'
      + '<p class="foot"><a href="how.html">How it works</a><a href="how.html#cost">What it costs</a><a href="privacy/">Privacy</a></p></div>';
  }

  /* your résumé: read the way the old front page read it (shared/intake.js), kept, and your profile filled from it */
  async function addResume(f) {
    if (!f || !Y) return;
    let text = '', rows = null;
    try {
      const k = X ? X.fileKind(f) : '';
      if (k === 'pdf' && window.ActorPDF) { const ex = await ActorPDF.extract(await f.arrayBuffer()); text = (ex.lines || []).map(l => l.text).join('\n'); rows = (ex.lines || []).map(l => ({ cells: l.cells && l.cells.length ? l.cells : [{ x: l.x, text: l.text }] })); }
      else if (k === 'docx' && X) text = await X.docxText(await f.arrayBuffer());
      else text = await f.text();
    } catch (e) { text = ''; }
    try { await Y.setResume(f, 'start here'); } catch (e) { }
    let filled = 0;
    try { const p = X && text ? X.resumeRead(rows || X.rowsOfText(text)) : null; if (p) { const ch = Y.fill(p, 'your résumé'); filled = Array.isArray(ch) ? ch.length : (ch ? 1 : 0); } } catch (e) { }
    const y = you();
    toast(filled || (y.credits || []).length ? 'Kept. Your profile is filled in from it: ' + n((y.credits || []).length, 'credit') + '.' : 'Kept. Nothing on it could be read into the fields; fill them in on Your page.');
    render();
  }
  async function addShot(f) {
    if (!f || !Y) return;
    try { const r = await Y.addPhoto(f); toast(r && r.error ? r.error : 'Your headshot is in.'); } catch (e) { toast('That picture would not go in.'); }
    render();
  }

  const URLS = {};
  async function photos() { for (const im of document.querySelectorAll('img[data-photo]')) { const id = im.dataset.photo; try { if (!URLS[id]) { const b = await Y.photoBlob(id); if (b) URLS[id] = URL.createObjectURL(b); } if (URLS[id]) im.src = URLS[id]; } catch (e) { } } }

  function render() {
    const v = which();
    document.body.dataset.view = v;
    topLinks(v);
    $('main').innerHTML = v === 'phone' ? phone() : v === 'first' ? first() : studio();
    const r = $('stRes'); if (r) r.onchange = () => addResume(r.files[0]);
    const s = $('stShot'); if (s) s.onchange = () => addShot(s.files[0]);
    const ms = $('meShot'); if (ms) ms.onchange = () => addShot(ms.files[0]);
    const k = $('stSkip'); if (k) k.onclick = () => { ss('tap_skip', '1'); render(); };
    const sh = $('setupHide'); if (sh) sh.onclick = () => { setupSet({ hidden: new Date().toISOString() }); render(); };
    const ps = $('pStudio'); if (ps) ps.onclick = () => { ss('tap_studio', '1'); render(); scrollTo(0, 0); };
    /* both done on a first visit: on to the studio */
    if (v === 'first' && you().resume && shots().length) setTimeout(() => { ss('in_first', ''); ss('tap_skip', '1'); render(); }, 1600);
    photos();
  }
  window.FrontPage = { render, which, addResume, addShot, setupSteps };
  render();
  addEventListener('storage', e => { if (e.key && /you|paper_trail|film|hub_online|footcloud|setup/.test(e.key)) render(); });
})();
