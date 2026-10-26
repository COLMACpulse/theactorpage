/* THE TOUR PLAYER. The site runs in the frame, in the demo sandbox (shared/tour.js), with LOW TIDE in it.
   This page holds the voice and the captions, so the sound keeps going from tool to tool (a phone only lets a page
   talk after you tap it, and every page you go to would need its own tap).
   A stop: go to its page, do its steps, light up its part, say its line (your clip, or the phone's voice
   until there is one), then on to the next. */
(function () {
  'use strict';
  const T = window.TourStops, D = window.TapDemo, $ = id => document.getElementById(id);
  const ROOT = D.root, fr = $('fr'), vo = $('vo');
  const CHS = ['act', 'own'];
  /* both chapters to start; you pick */
  function shown() { return CHS.slice(); }
  /* your own clips from record.html, on this device, before the site's */
  const MINE = {}; if (window.MyVoice) MyVoice.clips().then(c => { Object.keys(c).forEach(k => { MINE[k] = URL.createObjectURL(c[k]); }); window.__tour && (window.__tour.mine = Object.keys(MINE).length); }).catch(() => { });
  /* and the words you changed while recording: the caption follows what you said */
  if (window.MyVoice) MyVoice.edits().then(e => { Object.keys(e).forEach(id => { const s = T.S.find(x => x.id === id); if (s && e[id]) s.line = e[id]; }); }).catch(() => { });
  let pickD = shown(), LIST = [], I = 0, PAUSED = false, RUN = 0, timer = 0, utter = null;
  const chips = [...document.querySelectorAll('#chips [data-d]')];
  function paintChips() { chips.forEach(b => b.setAttribute('aria-pressed', String(pickD.includes(b.dataset.d))));
    const s = T.pick(pickD).reduce((a, x) => a + T.secs(x), 0); $('mins').textContent = Math.max(1, Math.round(s / 60)); }
  chips.forEach(b => b.onclick = () => { const d = b.dataset.d, on = pickD.includes(d); if (on && pickD.length === 1) return; pickD = on ? pickD.filter(x => x !== d) : CHS.filter(x => x === d || pickD.includes(x)); paintChips(); });
  paintChips();

  /* ---------- the frame ---------- */
  const W = () => fr.contentWindow, Doc = () => fr.contentDocument;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const here = () => { try { return W().location.pathname; } catch (e) { return ''; } };
  const want = path => new URL(ROOT + (path || 'how.html')).pathname;
  const samePage = path => { const h = here(), w = want(path); return h === w || (h.endsWith('/') && w === h + 'index.html') || (w.endsWith('/') && h === w + 'index.html'); };
  function load(path) { return new Promise(res => { const done = () => { fr.removeEventListener('load', done); res(); }; fr.addEventListener('load', done); fr.src = ROOT + (path || 'how.html'); setTimeout(done, 12000); }); }
  async function waitFor(sel, ms) { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { const e = find(sel); if (e) return e; await sleep(120); } return null; }
  function find(sel) { const d = Doc(); if (!d || !sel) return null;
    if (typeof sel === 'object' && sel.text) { let best = null, bl = 1e9; d.querySelectorAll('body *').forEach(e => { if (!e.getClientRects().length) return; const t = (e.innerText || '').trim(); if (t.indexOf(sel.text) === 0 && t.length < bl) { best = e; bl = t.length; } }); return best && (best.parentElement && best.parentElement.tagName !== 'BODY' ? best.parentElement : best); }
    for (const s of String(sel).split(/\s*,\s*(?![^\[]*\])/)) { try { const e = [...d.querySelectorAll(s)].find(x => x.offsetParent || x.getClientRects().length); if (e) return e; } catch (e) { } } return null; }
  /* a tap as a finger makes it: pointer down, up, then the click (some pages listen for the pointer) */
  function tap(e) { const w = W(); try { const o = { bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: true }; e.dispatchEvent(new w.PointerEvent('pointerdown', o)); e.dispatchEvent(new w.PointerEvent('pointerup', o)); } catch (x) { } e.click(); }
  async function step(a, run) {
    const w = W(), d = Doc(); if (!w || !d) return;
    if (a.later) { setTimeout(() => { if (run === RUN && !PAUSED) step(Object.assign({}, a, { later: 0 }), run); }, a.later); return; }
    if (a.when && !find(a.when)) return; if (a.unless && find(a.unless)) return;
    if (a.drop) { const t = await (await w.fetch(ROOT + a.drop)).text(), dt = new w.DataTransfer(); dt.items.add(new w.File([t], a.drop.split('/').pop(), { type: 'text/plain' })); const i = d.getElementById('dropfile'); if (i) { i.files = dt.files; i.dispatchEvent(new w.Event('change', { bubbles: true })); } await sleep(900); return; }
    if (a.openScript) { if (w.WB && !(w.WB.api && w.WB.api.blocks().some(b => /ANNA VOSS/.test(b.text || '')))) { const t = await (await w.fetch(ROOT + a.openScript)).text(); w.WB.openText(t, a.openScript.split('/').pop()); await sleep(700); } return; }
    if (a.rail) { const b = d.getElementById('btnRail'), r = d.getElementById('rail'); if (b && b.offsetParent && r && !(r.offsetWidth > 0 && r.getClientRects().length)) { tap(b); await sleep(350); } return; }
    if (a.open) { const e = find(a.open); if (e) e.open = true; await sleep(250); return; }
    if (a.eval) { try { w.eval(a.eval); } catch (e) { } return; }
    if (a.wait) { await waitFor(a.wait, 8000); return; }
    if (a.click) { const e = a.optional ? find(a.click) : await waitFor(a.click, 5000); if (e) { tap(e); await sleep(350); } }
  }

  /* ---------- the light on the part being talked about ---------- */
  let ringEl = null, ringFor = null, raf = 0;
  function ring(sel, color) {
    cancelAnimationFrame(raf); const d = Doc(); if (!d) return;
    if (!ringEl || ringEl.ownerDocument !== d) { ringEl = d.createElement('div'); ringEl.id = 'tapring'; ringEl.setAttribute('aria-hidden', 'true'); d.body.appendChild(ringEl); }
    ringEl.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:3px solid ' + color + ';border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.42);transition:all .35s ease;opacity:0';
    ringFor = find(sel); if (!ringFor) return;
    try { ringFor.scrollIntoView({ block: ringFor.getBoundingClientRect().height > W().innerHeight * 0.8 ? 'start' : 'center', behavior: 'smooth' }); } catch (e) { }
    const tick = () => { if (!ringFor || !ringFor.isConnected) { ringFor = find(sel); if (!ringFor) { ringEl.style.opacity = '0'; raf = requestAnimationFrame(tick); return; } }
      const r = ringFor.getBoundingClientRect(), vh = W().innerHeight, top = Math.max(4, r.top - 6), bot = Math.min(vh - 4, r.bottom + 6);
      Object.assign(ringEl.style, { left: Math.max(4, r.left - 6) + 'px', top: top + 'px', width: Math.min(W().innerWidth - 8, r.width + 12) + 'px', height: Math.max(20, bot - top) + 'px', opacity: '1' });
      raf = requestAnimationFrame(tick); };
    tick();
  }
  function unring() { cancelAnimationFrame(raf); ringFor = null; if (ringEl) ringEl.style.opacity = '0'; }

  /* ---------- the voice: your clip, else the phone's voice, else the clock ---------- */
  function hush() { clearTimeout(timer); try { vo.pause(); vo.removeAttribute('src'); vo.load(); } catch (e) { } try { speechSynthesis.cancel(); } catch (e) { } utter = null; }
  function voice() { try { const v = speechSynthesis.getVoices().filter(x => /^en(-|_|$)/i.test(x.lang)); return v.find(x => /en-US/i.test(x.lang) && /natural|enhanced|premium|samantha|aaron|google us/i.test(x.name)) || v.find(x => /en-US/i.test(x.lang)) || v[0] || null; } catch (e) { return null; } }
  function say(s, run) {
    return new Promise(res => {
      let ended = false; const fin = () => { if (ended) return; ended = true; clearTimeout(timer); res(); };
      const clock = () => { timer = setTimeout(fin, T.secs(s) * 1000); };
      const tts = () => { if (!('speechSynthesis' in window)) return clock();
        try { utter = new SpeechSynthesisUtterance(s.line.replace(/THEACTORPAGE/g, 'the actor page').replace(/\bINT\. or EXT\./, 'int or ext')); const v = voice(); if (v) utter.voice = v; utter.rate = 1; utter.onend = fin; utter.onerror = () => { if (!ended) clock(); };
          speechSynthesis.speak(utter); timer = setTimeout(fin, T.secs(s) * 1000 + 6000); } catch (e) { clock(); } };
      vo.onended = fin; vo.onerror = () => { if (run === RUN && !ended) tts(); };
      vo.muted = false; vo.src = MINE[s.id] || ('vo/' + s.id + '.mp3');
      const p = vo.play(); if (p && p.catch) p.catch(() => { if (run === RUN && !ended && !vo.error) tts(); });
    });
  }
  function unlock() { try { vo.muted = true; vo.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA='; const p = vo.play(); if (p && p.then) p.then(() => { vo.pause(); vo.muted = false; }).catch(() => { vo.muted = false; }); else vo.muted = false; } catch (e) { } try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { } }

  /* ---------- running it ---------- */
  function paint(s) {
    const c = T.CH[s.ch], inCh = LIST.filter(x => x.ch === s.ch), k = inCh.indexOf(s) + 1;
    document.documentElement.style.setProperty('--c', T.tint(s));
    $('where').textContent = c.name; $('count').textContent = k + ' OF ' + inCh.length; $('cap').textContent = s.line;
    $('pp').textContent = PAUSED ? 'PLAY' : 'PAUSE'; $('bk').disabled = I === 0;
  }
  async function wash(s) { const w = $('wash'), c = T.CH[s.ch]; w.style.setProperty('--c', c.color); w.style.background = c.wash || c.color; w.textContent = c.name; w.style.fontSize = c.name.length > 6 ? 'clamp(34px,11vw,84px)' : ''; w.style.textAlign = 'center'; w.classList.add('on'); await sleep(1300); w.classList.remove('on'); await sleep(250); }
  async function play(i) {
    const run = ++RUN; hush(); unring(); I = Math.max(0, Math.min(i, LIST.length - 1)); const s = LIST[I]; paint(s);
    if (!samePage(s.path)) { await load(s.path); if (run !== RUN) return; await sleep(500); }
    if (s.wash) await wash(s); if (run !== RUN) return;
    if (s.ready) await waitFor(s.ready, 8000);
    for (const a of (s.act || [])) { await step(a, run); if (run !== RUN) return; }
    await sleep(250); ring(s.hi, T.tint(s)); window.__tour.at = s.id; window.__tour.log.push({ id: s.id, lit: !!ringFor, path: here(), t: Date.now() });
    if (PAUSED) return;
    await say(s, run); if (run !== RUN || PAUSED) return;
    await sleep(700); if (run !== RUN || PAUSED) return;
    if (I + 1 < LIST.length) play(I + 1); else finish();
  }
  function finish() { hush(); unring(); $('done').classList.add('on'); window.__tour.done = true; }
  $('go').onclick = () => {
    unlock(); LIST = T.pick(pickD); if (!LIST.length) return;
    D.start([]); window.__tour.depts = pickD.slice();
    $('start').style.display = 'none'; $('run').classList.add('on'); $('done').classList.remove('on'); PAUSED = false; play(0);
  };
  $('pp').onclick = () => { PAUSED = !PAUSED; if (PAUSED) { RUN++; hush(); paint(LIST[I]); } else play(I); };
  $('nx').onclick = () => { if (I + 1 < LIST.length) play(I + 1); else finish(); };
  $('bk').onclick = () => play(I - 1);
  $('sk').onclick = () => { const ch = LIST[I].ch, j = LIST.findIndex((x, k) => k > I && x.ch !== ch); if (j < 0) finish(); else play(j); };
  async function out() { RUN++; hush(); unring(); await D.end(); location.href = ROOT + 'index.html'; }
  $('end').onclick = out; $('out').onclick = out;
  $('again').onclick = () => { $('done').classList.remove('on'); PAUSED = false; play(0); };
  $('keep').onclick = () => { $('done').classList.remove('on'); RUN++; hush(); unring(); $('run').classList.add('slim'); $('cap').textContent = ''; $('where').textContent = 'DEMO'; $('count').textContent = ''; document.documentElement.style.setProperty('--c', '#e0a23c'); };
  /* the site's own "leave the demo" button, if a page shows one in the frame, does the same as END DEMO here */
  window.addEventListener('message', e => { if (e.origin === location.origin && e.data === 'tapdemo:end') out(); });
  window.__tour = { at: '', done: false, log: [], list: () => LIST.map(s => s.id), play };
  /* TRY IT: no voice, no tour. Low Tide goes in, you're on ANNA, and the site is yours to poke at. END DEMO puts your own work back. */
  if (/[?&]try\b/.test(location.search)) (async () => {
    D.start([]); window.__tour.depts = [];
    $('start').style.display = 'none'; $('run').classList.add('on', 'slim'); $('where').textContent = 'DEMO'; $('count').textContent = '';
    $('cap').textContent = 'Low Tide is in every tool, and you are ANNA. Tap around. END DEMO puts your own work back.';
    document.documentElement.style.setProperty('--c', '#e0a23c');
    await load(''); await sleep(400); const run = ++RUN, o = T.S.find(x => x.id === 'O03');
    for (const a of (o && o.act) || []) { await step(a, run); }
    window.__tour.tried = true;
  })();
})();
