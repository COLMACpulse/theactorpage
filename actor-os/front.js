/* ACTOR OS FRONT (Col, Oct 26): the phone app's first screen, and its two new steps.
   Nothing due: "Got an audition? Bring it in." PASTE THE EMAIL leads; the sides PDF or pasted sides under it;
   "Just tape something"; your pocket (VO Booth, Read In, Spotted, a note). An audition open: the role, the
   show, who's casting, when it's due and what they asked for, then the four steps and the next one.
   READ and LEARN are Breakdown and Memorizer, opened inside Actor OS on the same sides (?sides=<shelf id>&embed=1).
   They keep their own pages on the website too. Reads this page's own state; writes only what you type. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ST = () => (typeof state !== 'undefined' && state) ? state : { job: {}, takes: [] };
  const SD = () => (typeof SIDES !== 'undefined' && SIDES) ? SIDES : { script: [] };
  const saveState = () => { try { localStorage.setItem(KEY, JSON.stringify(ST())); } catch (e) { } };
  let PASTE = false, DETAILS = false, OFFER_HOME = null, DAYS = false;

  const hasSides = () => !!((SD().beats && SD().beats.length) || (SD().script && SD().script.length));
  const takes = () => (ST().takes || []).filter(t => t.status !== 'DROP');
  const req = () => (ST().job && ST().job.request) || null;
  const isOpen = () => hasSides() || takes().length > 0 || !!req();
  const role = () => (SD().me || (($('actorRole') || {}).value || '') || (req() && req().role) || '').toUpperCase();
  const show = () => { const r = req(), j = typeof jobName === 'function' ? jobName() : ''; return (r && r.show) || (/^(Untitled Performance|Sides from the email|Pasted sides)$/i.test(j || '') ? '' : j) || ''; };
  const office = () => (req() && req().office) || '';
  const dueISO = () => (ST().job && /^\d{4}-\d{2}-\d{2}$/.test(ST().job.due || '')) ? ST().job.due : '';
  const asked = () => { const L = []; try { const d = ST().job && ST().job.delivery; const w = d && window.Delivery ? Delivery.words(d) : ''; if (w) L.push(w); } catch (e) { }
    const r = req(); (r && r.directions || []).slice(0, 3).forEach(x => L.push(typeof x === 'string' ? x : (x.text || ''))); return L.filter(Boolean).slice(0, 3); };
  const speeches = t => (String(t || '').match(/^[ \t]*[A-Z][A-Z0-9 .'\-]{1,30}(?:\s*\([^)]*\))?[ \t]*\n[ \t]*\S/gm) || []).length;
  /* the sides start at the first scene heading, or the first character's name over a line: the email above them isn't sides */
  const sidesPart = t => { const h = t.search(/^[ \t]*(?:INT\.|EXT\.|INT\/EXT|I\/E)\b/m), c = t.search(/^[ \t]*[A-Z][A-Z0-9 .'\-]{1,30}(?:\s*\([^)]*\))?[ \t]*\n[ \t]*\S/m), i = h >= 0 ? h : c; return i > 0 ? t.slice(i) : t; };
  const learned = () => { const k = 'aos_learn_' + (window.SHELF_ID || ''); try { return localStorage.getItem(k) || null; } catch (e) { return null; } };

  /* the steps: what's done, said plainly */
  function steps() {
    const s = SD(), mine = (s.script || []).filter(b => b.mine).length, cues = (s.script || []).filter(b => !b.mine).length;
    const T = takes(), kept = T.filter(t => t.status === 'SURVIVOR'), sent = !!ST().sent;
    return [
      { k: 'read', l: 'Read your role', done: hasSides() && !!s.me, say: hasSides() ? (s.me ? mine + ' lines, ' + cues + ' cues' : 'pick your character') : 'bring in your sides' },
      { k: 'learn', l: 'Learn it', done: learned() === 'done', say: learned() === 'done' ? 'you said you have it' : (hasSides() ? 'say your lines out loud' : '') },
      { k: 'shoot', l: 'Shoot and slate', done: kept.length > 0, say: T.length ? T.length + ' take' + (T.length === 1 ? '' : 's') + (kept.length ? ', ' + kept.length + ' kept' : '') : 'reader first, if you want one' },
      { k: 'send', l: 'Send it', done: sent, say: sent ? 'sent' : (asked()[0] || 'the way they asked') }
    ];
  }
  const NEXTWORD = { read: 'READ YOUR ROLE', learn: 'LEARN IT', shoot: 'SHOOT IT', send: 'SEND IT' };

  function home() {
    const H = $('aosHome'), P = $('prep'); if (!H) return;
    /* PICK UP / OPEN THEM (sides waiting from another tool, or the last ones): on the front when nothing is open */
    const OF = $('sidesOffer'); if (OF && OFFER_HOME === null) OFFER_HOME = OF.parentNode;
    if (OF && OFFER_HOME && OF.parentNode !== OFFER_HOME) OFFER_HOME.insertBefore(OF, OFFER_HOME.firstChild);
    if (!isOpen()) {
      if (P) P.classList.toggle('aosquiet', !DETAILS);
      H.innerHTML = '<div class="fcard"><span class="fk">NO AUDITION OPEN</span><b class="fh">Got an audition? Bring it in.</b>'
        + '<p class="fp">It reads the due time, what they asked for, and your role. Then it walks you to a sent tape.</p>'
        + '<div id="fOfferSlot"></div><button class="fgo" id="fPaste" type="button">PASTE THE EMAIL</button>'
        + (PASTE ? '<label class="fl" for="fPasteText">The email, the Eco Cast page, or the sides. Paste it all.</label><textarea id="fPasteText" rows="7" placeholder="Paste here"></textarea><button class="fgo2" id="fRead" type="button">READ IT</button>' : '')
        + '<div class="f2"><button type="button" id="fPdf">Sides PDF</button><button type="button" id="fSides">Paste the sides</button></div></div>'
        + '<button class="ftape" id="fTape" type="button"><i></i>Just tape something</button>'
        + '<button type="button" class="fdet" id="fPractice"><span>No audition this week?</span><i>a practice scene ›</i></button>'
        + pocket() + tapesRow()
        + '<p class="ffoot">Your profile, your page and your writing live on <a href="../">theactorpage.com</a>.</p>';
      const slot = $('fOfferSlot'); if (slot && OF && OF.innerHTML.trim()) slot.appendChild(OF);
    } else {
      const S = steps(), nx = S.find(x => !x.done) || S[3], d = dueISO(), A = asked();
      let dueTxt = ''; try { if (d && typeof dueSay === 'function') { const x = document.createElement('div'); x.innerHTML = String(dueSay(d)); dueTxt = x.textContent.trim(); } } catch (e) { }
      if (dueTxt && !/^due\b/i.test(dueTxt)) dueTxt = 'Due ' + dueTxt;
      H.innerHTML = '<div class="fcard due"><span class="fk">' + esc(d ? (dueTxt || 'Due ' + d).toUpperCase() : 'NO DUE DATE YET') + '</span>'
        + '<b class="fh" id="fRole">' + esc(role() || 'YOUR ROLE') + '</b>'
        + ((show() || office()) ? '<p class="fp">' + esc([show(), office()].filter(Boolean).join(' · ')) + '</p>' : '')
        + (A.length ? '<div class="fask"><span class="fk2">THEY ASKED FOR</span>' + A.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' : '')
        + '</div>'
        + daysHtml()
        + '<div class="fsteps">' + S.map(x => '<button type="button" class="fstep' + (x === nx && !x.done ? ' now' : '') + (x.done ? ' done' : '') + '" data-fgo="' + x.k + '"><span>' + (x.done ? '✓' : x === nx ? '→' : '○') + '&nbsp; ' + esc(x.l) + '</span><i>' + esc(x.say) + '</i></button>').join('') + '</div>'
        + '<button class="fgo" type="button" data-fgo="' + nx.k + '">' + (nx.done ? 'SEND IT' : NEXTWORD[nx.k]) + '</button>'
        + (nx.k !== 'shoot' ? '<button class="ftape" type="button" data-fgo="shoot"><i></i>Skip ahead and tape it</button>' : '')
        + '<button type="button" class="fdet" id="fDet" aria-expanded="' + DETAILS + '"><span>The details</span><i>name, due, sides, reader, slate ' + (DETAILS ? '⌄' : '›') + '</i></button>';
      if (P) P.classList.toggle('aosquiet', !DETAILS);
      try { const jb = $('jobBlock'); if (jb) jb.classList.add('aosquiet'); } catch (e) { }
    }
    wire();
  }
  /* YOUR DAYS TO THE DEADLINE: The Plan's own rules (shared/plan.js), from the email you pasted. Folded until you tap. */
  const TABOF = { read: 'read', breakdown: 'read', learn: 'learn', run: 'shoot', tape: 'shoot', send: 'send' };
  function days() { try { const r = req(); if (!window.Plan || !r || !r.raw) return []; const today = Plan.iso(new Date()), h = Plan.hear(r.raw, today, {}); if (!h || !h.due) return []; return (Plan.build(h, today).steps || []).filter(x => x.date >= today); } catch (e) { return []; } }
  function daysHtml() {
    const D = days(); if (!D.length) return '';
    const today = Plan.iso(new Date()), dn = new Set(D.map(x => x.date)).size;
    const dw = d => d === today ? 'Today' : new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    let h = '<button type="button" class="fdet" id="fDays" aria-expanded="' + DAYS + '"><span>Your days</span><i>' + n(dn, 'day') + ' to the deadline ' + (DAYS ? '⌄' : '›') + '</i></button>';
    if (DAYS) h += '<div class="fsteps fdays">' + D.map(x => '<button type="button" class="fstep" data-fgo="' + (TABOF[x.kind] || 'home') + '"><span><b>' + esc(dw(x.date)) + '</b>&nbsp; ' + esc(x.what) + '</span></button>').join('') + '</div>';
    return h;
  }
  const n = (x, w) => x + ' ' + (x === 1 ? w : w + 's');
  function pocket() {
    const it = [['../booth/', 'VO Booth', 'A VO audition from a closet'], ['../read/', 'Read In', "Read for a friend's tape"], ['../spotted/', 'Spotted', 'Send your reps a role'], ['../notes/', 'A note', 'What they told you']];
    return '<p class="fk" style="margin:18px 2px 8px">IN YOUR POCKET</p><div class="fpk">' + it.map(x => '<a href="' + x[0] + '"><b>' + x[1] + '</b><span>' + x[2] + '</span></a>').join('') + '</div>';
  }
  function tapesRow() { const n = takes().length; return n ? '<button type="button" class="fdet" data-fgo="send"><span>Your takes</span><i>' + n + ' ›</i></button>' : ''; }
  function wire() {
    const H = $('aosHome');
    const on = (id, f) => { const b = $(id); if (b) b.onclick = f; };
    on('fPaste', () => { PASTE = !PASTE; home(); const t = $('fPasteText'); if (t) t.focus(); });
    on('fRead', () => readEmail((($('fPasteText') || {}).value || '')));
    on('fPdf', () => { const f = $('sidesFile'); if (f) f.click(); });
    on('fSides', () => { DETAILS = true; const P = $('prep'); if (P) P.classList.remove('aosquiet'); try { if (typeof togglePaste === 'function') { const w = $('pasteWrap'); if (!w || w.style.display === 'none') togglePaste(); } } catch (e) { } const t = $('sidesText'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } });
    on('fTape', () => goTab('shoot'));
    on('fPractice', () => { DETAILS = true; home(); const d = $('dailySec'); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); } });
    on('fDays', () => { DAYS = !DAYS; home(); });
    on('fDet', () => { DETAILS = !DETAILS; home(); if (DETAILS) { const P = $('prep'); if (P) P.scrollIntoView({ block: 'start' }); } });
    if (H) H.querySelectorAll('[data-fgo]').forEach(b => b.onclick = () => goTab(b.dataset.fgo));
  }
  /* PASTE THE EMAIL: the request read where it can be (role, show, who's casting, the due date, their directions);
     the delivery from their own words; sides in it, if it has them. Nothing guessed: what it can't find stays blank. */
  function readEmail(t) {
    t = String(t || '').trim(); if (!t) return;
    let r = null; try { r = window.HubReq ? HubReq.read(t) : null; } catch (e) { r = null; }
    /* a plain email: the few lines most of them carry */
    const pick = re => { const m = t.match(re); return m ? m[1].trim().replace(/[.,;:]+$/, '') : ''; };
    const role0 = (r && r.role) || pick(/\brole\s*:\s*([^\n.]+)/i) || pick(/\b(?:for|as)\s+the\s+role\s+of\s+([^\n.,]+)/i);
    const show0 = (r && (r.show || r.title)) || pick(/\b(?:project|show|title)\s*:\s*([^\n.]+)/i) || pick(/self[- ]?tape(?:\s+request)?\s+for\s+([^\n.,]+?)(?:\.|,|\n|\s+role\b)/i);
    const office0 = (r && r.castingDirectors && r.castingDirectors.length ? r.castingDirectors.join(', ') : '') || pick(/\bcasting(?:\s+director)?\s*:\s*([^\n.]+)/i);
    const st = ST(); st.job = st.job || {};
    st.job.request = { raw: t, at: Date.now(), role: role0, show: show0, office: office0 ? office0.replace(/\s+casting$/i, '') + ' Casting' : '', directions: (r && r.directions) || [], due: (r && r.due) || null };
    if (r && r.due && r.due.y != null) { const iso = r.due.y + '-' + String(r.due.mo + 1).padStart(2, '0') + '-' + String(r.due.d).padStart(2, '0'); try { setDue(iso); } catch (e) { st.job.due = iso; } }
    if (role0) { try { const ar = $('actorRole'); if (ar && !ar.value) { ar.value = role0; localStorage.setItem('actor_os_role', role0); } } catch (e) { } }
    if (show0) { try { if (typeof setJobName === 'function') { const j = typeof jobName === 'function' ? jobName() : ''; if (!j || /^Untitled Performance$/i.test(j)) setJobName(show0); } } catch (e) { } }
    try { if (typeof offRead === 'function') offRead(t); } catch (e) { }
    if (speeches(t) >= 2) { try { loadSides(sidesPart(t), 'Sides from the email');
      /* the role they named is a speaker here: that's you */
      const sp = (SD().speakers || []).map(x => x && x.name != null ? x.name : x), R0 = role0.toUpperCase(), hit = sp.find(x => String(x).toUpperCase() === R0) || sp.find(x => R0 && String(x).toUpperCase().indexOf(R0.split(/\s+/)[0]) === 0);
      if (hit && !SD().me && typeof pickMe === 'function') pickMe(hit); } catch (e) { } }
    saveState(); PASTE = false; home(); try { navState(); } catch (e) { }
  }

  /* READ and LEARN: Breakdown and Memorizer on these sides, inside Actor OS */
  function step(id, tool, what) {
    const el = $(id); if (!el) return;
    if (!hasSides()) { el.innerHTML = '<div class="fcard"><span class="fk">' + esc(what) + '</span><b class="fh">Bring in your sides first.</b><p class="fp">Paste the email, or drop the sides PDF, on the front.</p><button class="fgo" type="button" data-fgo="home">BRING IN YOUR SIDES</button></div>'; el.querySelectorAll('[data-fgo]').forEach(b => b.onclick = () => goTab(b.dataset.fgo)); return; }
    const src = '../' + tool + '/?' + (window.SHELF_ID ? 'sides=' + encodeURIComponent(window.SHELF_ID) + '&' : 'open=1&') + 'embed=1';
    const fr = el.querySelector('iframe');
    if (!fr || fr.dataset.src !== src) el.innerHTML = '<iframe class="fstepframe" title="' + esc(what) + '" src="' + esc(src) + '" data-src="' + esc(src) + '"></iframe>'
      + (id === 'learnStep' ? '<button class="fgo2" type="button" id="fGotIt">I\'VE GOT IT: SHOOT</button>' : '<button class="fgo2" type="button" data-fgo="learn">NEXT: LEARN IT</button>');
    const g = $('fGotIt'); if (g) g.onclick = () => { try { localStorage.setItem('aos_learn_' + (window.SHELF_ID || ''), 'done'); } catch (e) { } goTab('shoot'); };
    el.querySelectorAll('[data-fgo]').forEach(b => b.onclick = () => goTab(b.dataset.fgo));
  }
  function shown(tab) { try { const jb = $('jobBlock'); if (jb) jb.classList.toggle('aosquiet', tab === 'home'); } catch (e) { } if (tab === 'home') home(); if (tab === 'read') step('readStep', 'breakdown', 'READ YOUR ROLE'); if (tab === 'learn') step('learnStep', 'memorizer', 'LEARN IT'); }
  window.AosFront = { home, shown, readEmail, details: on => { DETAILS = !!on; home(); }, learned: () => learned() === 'done' ? 'done' : null, _open: isOpen };
  /* the front draws once the rest of the page has loaded its sides and takes */
  const boot = () => { try { if (typeof CURTAB === 'undefined' || CURTAB === 'home') home(); } catch (e) { home(); } };
  if (document.readyState === 'complete') setTimeout(boot, 0); else addEventListener('load', () => setTimeout(boot, 60));
  /* sides loaded, a take kept: the front follows */
  setInterval(() => { try { if (CURTAB === 'home' && !document.activeElement.closest('#aosHome textarea,#prep')) { const so = $('sidesOffer'), sig = JSON.stringify([hasSides(), SD().me, takes().length, !!req(), dueISO(), !!ST().sent, so ? so.innerHTML.length : 0]); if (sig !== window.__aosSig) { window.__aosSig = sig; home(); } } } catch (e) { } }, 800);
})();
