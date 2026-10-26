/* ACTOR OS · READ and LEARN, drawn by Actor OS itself (Col, Oct 26). Built from the sides already loaded here
   (SIDES), with Memorizer's own engine (../memorizer/engine.js): the same first letters, the same word-for-word
   check, the same got / close / missed. Progress is kept where Memorizer keeps it (memorizer_v1), so the Memorizer
   page shows the same lines learned. The mic asks first and shows when it's on (shared/hot.js watches the listening).
   Nothing here writes your lines or your choices for you. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const E = () => window.MemEngine;
  const SD = () => (typeof SIDES !== 'undefined' && SIDES) ? SIDES : { script: [], me: '' };
  const script = () => { try { return typeof activeScript === 'function' ? activeScript() : (SD().script || []); } catch (e) { return SD().script || []; } };
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let VIEW = 'page', OPEN = {}, LEVEL = 'letters', CUR = null, REVEAL = false, HEARD = '', RESULT = null, LIS = null;

  /* ---------- READ: your role off the page ---------- */
  function firstName() { const m = String(SD().me || '').trim().split(/\s+/)[0] || ''; return m.length > 1 ? m : ''; }
  function aboutYou() { const n = firstName(); if (!n) return []; const re = new RegExp('\\b' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); return script().filter(b => !b.mine && re.test(b.text)); }
  function askedYou() { const S = script(), out = []; S.forEach((b, i) => { if (b.mine && i > 0 && !S[i - 1].mine && /\?/.test(S[i - 1].text)) out.push(S[i - 1]); }); return out; }
  const choicesKey = () => 'aos_choices_' + (window.SHELF_ID || 'x');
  const choices = () => { try { return localStorage.getItem(choicesKey()) || ''; } catch (e) { return ''; } };
  function fold(id, title, sub, body) { return '<button type="button" class="fdet" data-sfold="' + id + '" aria-expanded="' + !!OPEN[id] + '"><span>' + esc(title) + '</span><i>' + esc(sub) + ' ' + (OPEN[id] ? '⌄' : '›') + '</i></button>' + (OPEN[id] ? '<div class="sbody">' + body + '</div>' : ''); }
  const quote = b => '<p class="sq"><b>' + esc(b.who) + '</b> ' + esc(b.text) + '</p>';
  function read(el) {
    const S = script(), me = SD().me;
    let h = '<div class="sseg" role="group" aria-label="The page or your lines"><button type="button" data-sview="page" class="' + (VIEW === 'page' ? 'on' : '') + '">The page</button><button type="button" data-sview="mine" class="' + (VIEW === 'mine' ? 'on' : '') + '">Just my lines</button></div>';
    h += '<div class="spage">' + (VIEW === 'mine'
      ? S.map((b, i) => b.mine ? (i > 0 && !S[i - 1].mine ? '<p class="scue">' + esc(S[i - 1].who) + ': ' + esc(S[i - 1].text) + '</p>' : '') + '<div class="sblk mine"><b>' + esc(b.who) + '</b><span>' + esc(b.text) + '</span></div>' : '').join('')
      : S.map(b => '<div class="sblk' + (b.mine ? ' mine' : '') + '"><b>' + esc(b.who) + '</b><span>' + esc(b.text) + '</span></div>').join('')) + '</div>';
    const A = aboutYou(), Q = askedYou(), C = choices();
    h += fold('about', 'What they say about you', A.length ? A.length + ' line' + (A.length === 1 ? '' : 's') : 'none', A.length ? A.map(quote).join('') : '<p class="sq dim">Nobody says ' + esc(firstName() || 'your name') + ' in these sides.</p>');
    h += fold('asked', 'Questions put to you', Q.length ? String(Q.length) : 'none', Q.length ? Q.map(quote).join('') : '<p class="sq dim">Nobody asks you a question right before your line.</p>');
    h += fold('choices', 'Your choices, in your words', C.trim() ? 'kept' : 'blank', '<label class="fl" for="sChoices">What you want, what\'s in the way, the turn. Only you write here.</label><textarea id="sChoices" rows="5">' + esc(C) + '</textarea>');
    h += '<button class="fgo2" type="button" data-fgo="learn">NEXT: LEARN IT</button>';
    h += '<p class="ffoot"><a href="../breakdown/' + (window.SHELF_ID ? '?sides=' + encodeURIComponent(window.SHELF_ID) : '?open=1') + '">The full breakdown, scene by scene, on its own page ›</a></p>';
    el.innerHTML = h;
    el.querySelectorAll('[data-sview]').forEach(b => b.onclick = () => { VIEW = b.dataset.sview; read(el); });
    el.querySelectorAll('[data-sfold]').forEach(b => b.onclick = () => { OPEN[b.dataset.sfold] = !OPEN[b.dataset.sfold]; read(el); });
    const t = $('sChoices'); if (t) { let tm; t.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { try { if (t.value.trim()) localStorage.setItem(choicesKey(), t.value); else localStorage.removeItem(choicesKey()); } catch (e) { } }, 300); }; }
    el.querySelectorAll('[data-fgo]').forEach(b => b.onclick = () => goTab(b.dataset.fgo));
  }

  /* ---------- LEARN: off book, with Memorizer's engine and Memorizer's progress ---------- */
  const MKEY = 'memorizer_v1';
  function mdb() { try { const d = JSON.parse(localStorage.getItem(MKEY) || 'null'); if (d && d.scripts) return d; } catch (e) { } return { scripts: {} }; }
  function sidesText() { try { const it = window.Shelf && window.SHELF_ID ? Shelf.get(window.SHELF_ID) : null; return (it && it.text) || ''; } catch (e) { return ''; } }
  function mrec(create) {
    const e = E(), t = sidesText(), me = SD().me; if (!e || !t || !me) return null;
    const id = e.hash(t) + '|' + me, d = mdb();
    if (!d.scripts[id] && create) { d.scripts[id] = { id, file: SD().file || 'Your sides', text: t, me, range: null, from: 'Actor OS', shelf: window.SHELF_ID || '', states: {}, verbs: {}, added: Date.now() }; try { localStorage.setItem(MKEY, JSON.stringify(d)); } catch (x) { } }
    return { d, id, r: d.scripts[id] || { states: {} } };
  }
  function putStates(states) { const m = mrec(true); if (!m) return; m.d.scripts[m.id].states = states; try { localStorage.setItem(MKEY, JSON.stringify(m.d)); } catch (e) { } }
  const items = () => { const e = E(); return e ? e.items(script()) : []; };
  function counts() { const e = E(), m = mrec(false); return e ? e.count(items(), (m && m.r.states) || {}) : { new: 0, work: 0, getting: 0, solid: 0 }; }
  function pick() {
    const e = E(), I = items(), m = mrec(false), st = (m && m.r.states) || {};
    if (!I.length) return null;
    if (CUR && I.find(x => x.key === CUR.key) && !RESULT) return I.find(x => x.key === CUR.key);
    const q = e.queue(I, st); return (q && q[0]) || I[0];
  }
  function learnedAll() { const c = counts(); return items().length > 0 && !c.new && !c.work; }
  function learn(el) {
    const e = E(); if (!e) { el.innerHTML = '<p class="fp">Learning needs one more file. Reload the page.</p>'; return; }
    const it = pick(); if (!it) { el.innerHTML = '<div class="fcard"><b class="fh">No lines of yours here.</b><p class="fp">Pick your character in THE DETAILS on the front.</p></div>'; return; }
    CUR = it;
    const I = items(), c = counts(), idx = I.findIndex(x => x.key === it.key) + 1;
    let h = '<div class="slev" role="group" aria-label="How much of the line shows">' + e.LEVELS.map(l => '<button type="button" data-lev="' + l.id + '" class="' + (LEVEL === l.id ? 'on' : '') + '">' + esc(l.label) + '</button>').join('') + '</div>';
    if (it.cue) h += '<div class="scard"><span class="fk2">' + esc(it.cue.who) + ', YOUR CUE</span><span class="scuet">' + esc(it.cue.text) + '</span></div>';
    const shown = REVEAL ? it.text : e.show(it.text, LEVEL);
    h += '<div class="scard you"><span class="fk2">YOU, ' + esc(SD().me) + '</span><span class="sline' + (REVEAL || LEVEL === 'whole' ? ' full' : '') + '" id="sLine">' + (shown ? esc(shown) : '<i>say it</i>') + '</span></div>';
    if (LIS) h += '<div class="sheard" id="sHeard" aria-live="polite"><b>● LISTENING</b> ' + esc(HEARD || 'say it') + '</div>';
    if (RESULT) h += '<div class="sresult' + (RESULT.exact ? ' ok' : '') + '" id="sResult">' + esc(RESULT.say) + '</div>';
    if (!REVEAL) h += (Rec ? '<button class="fgo" type="button" id="sSay">' + (LIS ? 'STOP' : 'SAY IT OUT LOUD') + '</button><button class="ftape" type="button" id="sShow">Show the line</button>' : '<button class="fgo" type="button" id="sShow">SAID IT. SHOW THE LINE</button>');
    else h += '<div class="smarks"><button type="button" data-mark="got">GOT IT</button><button type="button" data-mark="close">CLOSE</button><button type="button" data-mark="missed">MISSED</button></div>';
    h += '<p class="scount"><span>Line ' + idx + ' of ' + I.length + '</span><span>' + (c.work ? c.work + ' still drop' : c.new ? c.new + ' not tried yet' : 'every line, got it') + '</span></p>';
    if (Rec) h += '<p class="ffoot">SAY IT uses the browser\'s speech service: Chrome sends what you say to Google, Safari to Apple. Show the line never listens.</p>';
    h += '<button class="fgo2" type="button" id="fGotIt">I\'VE GOT IT: SHOOT</button>';
    h += '<p class="ffoot"><a href="../memorizer/' + (window.SHELF_ID ? '?sides=' + encodeURIComponent(window.SHELF_ID) : '?open=1') + '">Drill the whole scene in Memorizer ›</a></p>';
    el.innerHTML = h;
    el.querySelectorAll('[data-lev]').forEach(b => b.onclick = () => { LEVEL = b.dataset.lev; learn(el); });
    const sh = $('sShow'); if (sh) sh.onclick = () => { stop(); REVEAL = true; learn(el); };
    const sy = $('sSay'); if (sy) sy.onclick = () => LIS ? (stop(), finish(el)) : listen(el);
    el.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => mark(el, b.dataset.mark));
    const g = $('fGotIt'); if (g) g.onclick = () => { stop(); try { localStorage.setItem('aos_learn_' + (window.SHELF_ID || ''), 'done'); } catch (e) { } goTab('shoot'); };
  }
  function mark(el, m) {
    const e = E(), mr = mrec(true); if (!mr || !CUR) return;
    const st = Object.assign({}, mr.d.scripts[mr.id].states || {}); st[CUR.key] = e.mark(st[CUR.key], m); putStates(st);
    if (learnedAll()) { try { localStorage.setItem('aos_learn_' + (window.SHELF_ID || ''), 'done'); } catch (x) { } }
    REVEAL = false; RESULT = null; HEARD = ''; CUR = null; learn(el);
  }
  function listen(el) {
    if (!Rec) return; let r; try { r = new Rec(); } catch (e) { return; }
    try { r.lang = window.TapLang ? TapLang.speech() : (navigator.language || 'en-US'); } catch (e) { }
    r.interimResults = true; r.continuous = true; HEARD = '';
    r.onresult = ev => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript + ' '; HEARD = t.trim(); const x = $('sHeard'); if (x) x.innerHTML = '<b>● LISTENING</b> ' + esc(HEARD); };
    r.onend = () => { if (LIS === r) { LIS = null; finish(el); } };
    r.onerror = () => { if (LIS === r) { LIS = null; learn(el); } };
    LIS = r; try { r.start(); } catch (e) { LIS = null; } learn(el);
  }
  function stop() { const r = LIS; LIS = null; try { r && r.stop(); } catch (e) { } }
  function finish(el) {
    const e = E(); if (!CUR) return learn(el);
    RESULT = e.compare(CUR.text, HEARD || ''); REVEAL = true;
    if (RESULT.exact) { mark(el, 'got'); RESULT = { say: 'Word for word.', exact: true }; REVEAL = false; learn(el); return; }
    learn(el);
  }
  /* the test hook: what a spoken take would do, without a microphone */
  function heard(el, text) { HEARD = String(text || ''); finish(el); }
  window.AosSteps = { read, learn, heard: text => heard($('learnStep'), text), learnedAll, stop };
})();
