/* VO BOOTH · VOICES: your characters' voices, so you can get back into one before you read and stay consistent.
   The vault is Character Bank: the recording, the picture, the line that drops you back in. Read here where they
   live (IndexedDB cps_v02), read only, never changed or created here. Pin one to the job and it sits on READ.
   No computer voice: the voice is yours. */
(function () {
  'use strict';
  const VD = window.VODemo, B = () => window.__booth, $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = {}; const url = async id => { if (!id) return ''; if (U[id]) return U[id]; const b = await VD.cpsMedia(id); if (!b) return ''; return (U[id] = URL.createObjectURL(b)); };
  let VIEW = 'home', Q = '';
  const look = c => (c.looks || []).find(l => l.kind !== 'video') || null;
  /* the take you go back to: the one you marked, else your first recording of the voice (as Character Bank does) */
  const ref = c => { const t = (c.takes || []).filter(x => x.kind === 'voice' || x.kind === 'return'); return t.find(x => x.id === c.refId) || t.find(x => x.kind === 'voice') || null; };
  const day = t => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const pinned = () => { try { return (B().S.job || {}).voice || ''; } catch (e) { return ''; } };
  const match = (c, q) => { const t = [c.name, c.project, c.anchorLine, c.notes].join(' ').toLowerCase(); return String(q || '').toLowerCase().split(/\s+/).filter(Boolean).every(w => t.indexOf(w) >= 0); };

  async function chars() { return (await VD.chars()).filter(c => !c.me); }
  async function render(m) {
    m = m || $('main'); const C = await chars();
    if (VIEW.indexOf('one:') === 0) { const c = C.find(x => x.id === VIEW.slice(4)); if (c) return one(m, c); }
    VIEW = 'home'; return home(m, C);
  }
  async function home(m, C) {
    let h = '<p class="dim">Your characters\' voices. Pick one to get back into it before you read.</p>';
    if (!C.length) { m.innerHTML = h + '<div class="card"><p class="dim" style="margin:0 0 10px">No voices yet. Character Bank keeps them: the recording of the voice, a picture of who it is, and the line that drops you back in.</p><a class="btn pri" href="../cps/">ADD ONE IN CHARACTER BANK</a></div>'; return; }
    const pin = pinned(), list = C.filter(c => match(c, Q)).sort((a, b) => (b.id === pin) - (a.id === pin) || String(a.name).localeCompare(String(b.name)));
    if (C.length > 6) h += '<input class="field" id="vq" type="search" placeholder="Find a voice: a name, a project, a word" value="' + esc(Q) + '" aria-label="Find a voice" style="margin:0 0 10px">';
    h += '<div class="vgrid">';
    for (const c of list) { const l = look(c), u = l ? await url(l.id) : '', r = ref(c);
      h += '<button type="button" class="vcard" data-v="' + esc(c.id) + '">' + (u ? '<img src="' + u + '" alt="">' : '<span class="vini" aria-hidden="true">' + esc(initials(c.name)) + '</span>') +
        '<b>' + esc(c.name || 'Unnamed') + '</b>' + (c.project ? '<small>' + esc(c.project) + '</small>' : '') +
        (c.id === pin ? '<i class="vpin">ON THIS JOB</i>' : !r ? '<small class="faint">No recording yet</small>' : '') + '</button>'; }
    h += '</div>' + (list.length ? '' : '<p class="faint small">No voice matches that.</p>') +
      '<p class="faint small" style="margin-top:10px">Kept in Character Bank. Add a voice there and it shows up here. <a href="../cps/">CHARACTER BANK</a></p>';
    m.innerHTML = h;
    m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { VIEW = 'one:' + b.dataset.v; render(m); window.scrollTo(0, 0); });
    const q = $('vq'); if (q) q.oninput = () => { Q = q.value; const at = q.selectionStart; render(m).then(() => { const n = $('vq'); if (n) { n.focus(); try { n.setSelectionRange(at, at); } catch (e) { } } }); };
  }
  async function one(m, c) {
    const l = look(c), u = l ? await url(l.id) : '', r = ref(c), ru = r ? await url(r.id) : '', pin = pinned() === c.id, cid = encodeURIComponent(c.id);
    const note = (c.takes || []).filter(t => t.kind === 'note').slice(-1)[0], nu = note ? await url(note.id) : '';
    let h = '<button class="btn ghost sm" id="vback">&larr; YOUR VOICES</button>' +
      '<h2 style="margin:12px 0 2px;font-weight:500">' + esc(c.name || 'Unnamed') + '</h2>' + (c.project ? '<p class="dim" style="margin:0 0 8px">' + esc(c.project) + '</p>' : '') +
      (u ? '<img class="vhero" src="' + u + '" alt="' + esc(c.name || 'Your character') + '">' : '') +
      '<div class="card"><p class="kicker">Listen to then</p>' + (ru ? '<audio id="vref" src="' + ru + '" controls preload="auto" style="width:100%"></audio><small class="faint">' + esc(r.name || 'Your take') + (r.at ? ' · recorded ' + esc(day(r.at)) : '') + '</small>'
        : '<p class="faint small" style="margin:0">No recording of this voice yet. Record it in Character Bank and it plays here.</p>') +
      (c.notes ? '<p style="margin:10px 0 0">' + esc(c.notes) + '</p>' : '') +
      (nu ? '<p class="faint small" style="margin:10px 0 2px">Your note</p><audio src="' + nu + '" controls preload="metadata" style="width:100%;height:40px"></audio>' : '') + '</div>' +
      (c.anchorLine ? '<div class="card"><p class="kicker">The line that drops you back in</p><p class="vline">' + esc(c.anchorLine) + '</p></div>' : '') +
      '<div class="row" style="margin-top:6px">' + (pin ? '<button class="btn pri" id="vpin" aria-pressed="true">ON THIS JOB ✓</button><button class="btn ghost sm" id="vunpin">TAKE IT OFF</button>' : '<button class="btn pri" id="vpin" aria-pressed="false">USE IT ON THIS JOB</button>') + '</div>' +
      '<p class="faint small">' + (pin ? 'It sits at the top of READ, so you can hear it again between lines.' : 'Puts it at the top of READ, so you can hear it again between lines.') + '</p>' +
      '<div class="row" style="margin-top:10px"><a class="btn" href="../cps/?c=' + cid + '&amp;tab=back" id="vback2">COME BACK THE WHOLE WAY</a><a class="btn ghost" href="../cps/?c=' + cid + '&amp;tab=capture" id="vrec">RECORD A NEW TAKE</a><button class="btn ghost" id="vpage">ON YOUR PAGE</button></div>' +
      '<p class="faint small">COME BACK THE WHOLE WAY opens it in Character Bank: the look, then then, then you, side by side. New takes are kept there too.</p>';
    m.innerHTML = h;
    $('vback').onclick = () => { VIEW = 'home'; render(m); };
    const set = id => { const Bo = B(); if (!Bo) return; Bo.S.job.voice = id; Bo.save(); render(m); };
    $('vpin').onclick = () => { if (!pin) set(c.id); };
    if ($('vunpin')) $('vunpin').onclick = () => set('');
    $('vpage').onclick = () => { if (window.BoothDemo && B()) { BoothDemo.open('voice:' + c.id); B().goTab('demo'); } };
  }
  /* on READ: the voice you pinned, small, with its take to play again */
  async function strip(el, id) {
    if (!el) return; if (!id) { el.innerHTML = ''; return; }
    const c = (await chars()).find(x => x.id === id); if (!c) { el.innerHTML = ''; return; }
    const l = look(c), u = l ? await url(l.id) : '', r = ref(c), ru = r ? await url(r.id) : '';
    el.innerHTML = '<div class="card vstrip">' + (u ? '<img src="' + u + '" alt="">' : '<span class="vini" aria-hidden="true">' + esc(initials(c.name)) + '</span>') +
      '<div class="w"><p class="kicker" style="margin:0">THE VOICE · ' + esc((c.name || 'Unnamed').toUpperCase()) + '</p>' + (c.anchorLine ? '<p class="vline sm">' + esc(c.anchorLine) + '</p>' : '') +
      (ru ? '<audio src="' + ru + '" controls preload="metadata" style="width:100%;height:40px" id="vstripaudio"></audio>' : '') + '</div></div>';
  }
  window.BoothVoices = { render, strip, open: v => { VIEW = v || 'home'; } };
})();
