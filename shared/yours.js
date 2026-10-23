/* THEACTORPAGE YOURS, on home: a picture for each of your tools. The sample shows what the tool holds; once you've
   added your own, the tile shows your newest: your next audition, your last note, the last thing you spotted, your
   people (each one a link), your plan, your wall, your last plug. Notes, Expenses and Footage are plain links. No samples: a tile shows only once it has yours, and the section
   only once one does. Read here from this device only: nothing is sent anywhere, and
   these pictures only ever show on your own phone or computer. Expenses and Footage stay as plain links. */
(function (g) {
  'use strict';
  const Y = {}, $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dueWords = iso => { const d = new Date(iso); if (isNaN(d)) return ''; return 'Due ' + DN[d.getDay()] + ' ' + (d.getMonth() + 1) + '/' + d.getDate() + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  const initials = n => clean(n).split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const COLORS = ['#2a5fa8', '#1f8a5c', '#c0392b', '#d9b23a', '#5c636d'];
  function set(k, html) { const t = $('.ytile[data-y="' + k + '"]'); if (!t || !html) return; t.querySelector('.yart').innerHTML = html; t.classList.add('mine'); t.querySelector('.ytag').remove(); }

  /* each one: what it shows once it's yours, or '' to keep the sample. Pure: the tests feed it made-up data. */
  Y.hub = function (projects, now, ww) { now = now || Date.now();
    const live = (projects || []).filter(p => p && (p.title || p.project) && !/archiv|reject|declin/i.test(p.state || ''));
    const due = live.filter(p => p.deadline && Date.parse(p.deadline) >= now).sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    const p = due[0] || live.slice().sort((a, b) => String(b.deadline || b.date || '').localeCompare(String(a.deadline || a.date || '')))[0]; if (!p) return '';
    /* someone on it you've worked with (WORKED WITH): the line that's ammo */
    let hit = ''; try { const r = p.request || {}; const H = ww ? ww.match([r.director, r.producers, p.director].concat(r.castingDirectors || [], [p.casting])) : []; if (H[0]) hit = 'You worked with ' + H[0].name + ': ' + ww.onWords(H[0].on[0]); } catch (e) { }
    return '<span class="ycard"><span class="yk">' + (due[0] ? 'NEXT AUDITION' : 'LAST AUDITION') + '</span><span class="yt">' + esc(p.project || p.title) + '</span><span class="yr">' + esc(String(p.role || '').toUpperCase()) + '</span>'
      + (hit ? '<span class="yw">' + esc(hit) + '</span>' : '') + '<span class="yd">' + esc(p.deadline ? (due[0] ? '' : 'Was due ') + dueWords(p.deadline).replace(/^Due /, due[0] ? 'Due ' : '') : (p.casting || '')) + (p.casting && p.deadline ? ' · ' + esc(p.casting) : '') + '</span></span>'; };
  Y.notes = function (notes) { const n = (notes || []).filter(x => clean(x.text)).sort((a, b) => (b.t || 0) - (a.t || 0))[0]; if (!n) return '';
    return '<span class="ynote">' + esc(clean(n.text).slice(0, 120)) + (n.giver ? '<br><small style="font-size:.8rem">· ' + esc(n.giver) + '</small>' : '') + '</span>'; };
  Y.spotted = function (items) { const it = (items || []).filter(x => x && x.card).sort((a, b) => (b.at || 0) - (a.at || 0))[0]; if (!it) return ''; const c = it.card;
    let src = ''; try { src = c.source ? new URL(c.source).hostname.replace(/^www\./, '') : ''; } catch (e) { }
    return '<span class="yclip"><span class="ys">' + esc((src || 'SPOTTED').toUpperCase()) + ' · ' + esc(new Date(it.at || Date.now()).toLocaleDateString()) + '</span><span class="yh">' + esc(c.project || '(no title)') + '</span><span class="yb">' + esc([c.role, c.where, (c.casting || []).length ? c.casting.join(' & ') + ' casting' : ''].filter(Boolean).join('. ')) + '</span></span>'; };
  Y.contacts = function (everyone, roleName) { const L = (everyone || []).slice().sort((a, b) => (b.kept ? 1 : 0) - (a.kept ? 1 : 0)).slice(0, 3); if (!L.length) return '';
    /* each one its own link: straight to that person in Contacts */
    return '<span class="ypeople">' + L.map((x, i) => '<a href="contacts/?who=' + encodeURIComponent(x.name) + '"><i style="background:' + COLORS[i % COLORS.length] + '">' + esc(initials(x.name)) + '</i>' + esc(x.name) + '<em>' + esc(clean((x.from && x.from[0]) || (roleName ? roleName(x.role) : x.role) || '').replace(/^Worked with: /, '').replace(/, from (TMDb|your résumé|your site)$/, '').slice(0, 48)) + '</em></a>').join('') + '</span>'; };
  Y.plan = function (plans, day) { day = day || new Date().toISOString().slice(0, 10);
    const p = (plans || []).filter(x => x && x.plan && (x.plan.steps || []).length).find(x => !x.heard.due || x.heard.due >= day) || (plans || [])[0]; if (!p || !p.plan) return '';
    /* one box a day: the day's first step, ticked when the day is done */
    const D = []; (p.plan.steps || []).forEach((s, i) => { let d = D.find(x => x.date === s.date); if (!d) D.push(d = { date: s.date, what: s.what, done: true }); if (!(p.done || {})[i]) d.done = false; });
    const from = Math.max(0, D.findIndex(d => d.date >= day)), show = (D.findIndex(d => d.date >= day) < 0 ? D.slice(-5) : D.slice(from, from + 5)); if (!show.length) return '';
    const nowD = show.find(d => !d.done);
    return '<span class="yplan"><span class="ydays">' + show.map(d => '<span class="' + (d.done ? 'ok' : (nowD && d.date === nowD.date ? 'on' : '')) + '"><b>' + DN[new Date(d.date + 'T12:00').getDay()].toUpperCase() + '</b>' + esc(clean(d.what).split(/[.:,]/)[0].split(' ')[0]) + '</span>').join('') + '</span><span class="yd">' + esc([P2(p), p.heard.due ? 'due ' + p.heard.due.slice(5).replace('-', '/') : ''].filter(Boolean).join(' · ')) + (show.every(d => d.done) ? ' · all done' : '') + '</span></span>'; };
  const P2 = p => [p.heard.title || 'Your audition', p.heard.role].filter(Boolean).join(' · ');
  Y.picture = function (walls, urls) { const L = (walls || []).slice(0, 2); if (!L.length) return '';
    return '<span class="yposters">' + L.map(w => '<span class="ypost"' + (urls && urls[w.id] ? ' style="background-image:url(' + urls[w.id] + ')"' : ' style="background:linear-gradient(170deg,#2a4a63,#0f1d29)"') + '>' + (urls && urls[w.id] ? '' : esc(w.title)) + '<i' + (w.got ? ' class="got"' : '') + '>' + esc(String(w.stamp || (w.got ? 'GOT IT' : 'WANT IT')).toUpperCase()) + '</i></span>').join('') + '</span>'; };
  Y.press = function (plugs, render) { const p = (plugs || [])[0]; if (!p) return ''; let t = ''; try { t = render ? render(p) : p.text; } catch (e) { t = p.text; }
    return '<span class="yplug"><span class="yk">' + esc(p.kind === 'airing' ? 'SHAMELESS PLUG · AIRING' : 'SHAMELESS PLUG') + '</span><span class="ypt">' + esc(clean(t || p.title).slice(0, 140)) + '</span></span>'; };

  /* ---------- on the page: from this device ---------- */
  Y.paint = async function () {
    if (!$('#yours')) return; let mine = 0; const k = (key, html) => { if (html) { set(key, html); mine++; } };
    try { if (g.Offices) { const h = await g.Offices.load(); if (h) k('hub', Y.hub(h.projects, Date.now(), g.WorkedWith)); } } catch (e) { }
    try { const sp = JSON.parse(localStorage.getItem('theactorpage_spotted_v1') || 'null'); if (sp) k('spotted', Y.spotted(sp.items)); } catch (e) { }
    try { if (g.Contacts) k('contacts', Y.contacts(g.Contacts.everyone(await g.Contacts.sources()), g.Contacts.roleName)); } catch (e) { }
    try { if (g.Plan) k('plan', Y.plan(g.Plan.all())); } catch (e) { }
    try { if (g.Viz) { const V = g.Viz, W = V.wanted().concat(V.gotten()).slice(0, 2).map(w => Object.assign({}, w, { got: V.got(w), stamp: (V.at(w) || {}).label })), U = {};
      for (const w of W) { if (w.pic) { const b = await V.picBlob(w.pic); if (b) U[w.id] = URL.createObjectURL(b); } }
      k('picture', Y.picture(W, U)); k('press', Y.press(V.plugs(), p => V.plug(p.text, p).text)); } } catch (e) { }
    /* only what's yours: a tile with nothing of yours in it goes, and with nothing at all the section stays hidden */
    document.querySelectorAll('#yours .ytile:not(.mine)').forEach(t => t.remove());
    const sec = $('#yours'); if (sec) { sec.hidden = !mine; const hr = sec.nextElementSibling; if (hr && hr.tagName === 'HR') hr.hidden = !mine; }
    return mine;
  };
  g.Yours = Y;
  if (typeof module !== 'undefined') module.exports = Y;
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Y.paint()); else Y.paint(); }
})(typeof window !== 'undefined' ? window : globalThis);
