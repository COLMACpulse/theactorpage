/* JUICE: the one time THEACTORPAGE goes online for you, and only when you say.
   THE WIRE is one public file made on GitHub every hour (wire/fetch.py): the California Film Commission's tax-credit
   list and the newest stories from three trades. Every phone downloads the same file, so nobody learns who's
   asking or what you're right for. What fits you is worked out here, on the phone: your words (your types, what
   you want more of), your places, and the offices you know, matched as whole words. What matched is shown, never
   a score. Keep one and it becomes a Spotted card you check before it's saved.
   State: localStorage theactorpage_juice_v1 {mode:'manual'|'daily', last, seen{}, gone{}, day}. */
(function (g) {
  const J = {};
  J.URL = 'https://raw.githubusercontent.com/COLMACpulse/theactorpage/wire/wire.json';
  J.KEY = 'theactorpage_juice_v1';
  J.MODES = [['manual', 'Only when I tap CHECK'], ['daily', 'Once a day, when I open Spotted']];
  const blank = () => ({ mode: 'manual', last: null, seen: {}, gone: {}, day: '' });
  J.load = function () { try { const d = JSON.parse(localStorage.getItem(J.KEY) || 'null'); if (d && typeof d === 'object') return Object.assign(blank(), d); } catch (e) { } return blank(); };
  J.save = function (s) { try { const ks = Object.keys(s.seen); if (ks.length > 4000) ks.slice(0, ks.length - 4000).forEach(k => delete s.seen[k]); localStorage.setItem(J.KEY, JSON.stringify(s)); } catch (e) { } };
  J.url = function () { try { return localStorage.getItem('tap_wire') || J.URL; } catch (e) { return J.URL; } };
  J.today = (t) => { const d = new Date(t || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  /* daily: the first time Spotted opens on a new day */
  J.dueToday = (s, now) => s.mode === 'daily' && s.day !== J.today(now);

  /* the one network call. -> wire, or throws with plain words */
  J.fetch = async function (url) {
    let r;
    try { r = await fetch(url || J.url(), { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }); }
    catch (e) { throw new Error('Couldn\'t get online. Check your connection and try again.'); }
    if (!r.ok) throw new Error('THE WIRE didn\'t answer (' + r.status + '). Try again later.');
    let w; try { w = await r.json(); } catch (e) { throw new Error('THE WIRE came back garbled. Try again later.'); }
    if (!w || !Array.isArray(w.items) || !Array.isArray(w.sources)) throw new Error('THE WIRE came back in a shape this page doesn\'t know. Reload the page.');
    return w;
  };

  /* ---------- matching, whole words ---------- */
  const STOP = new Set('the a an and or of in on for with to at by from as is are its it new'.split(' '));
  const stem = w => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/s$/, '');
  const words = s => String(s || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOP.has(w)).map(stem);
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const uniq = a => a.filter((x, i) => x && a.findIndex(y => String(y).toLowerCase() === String(x).toLowerCase()) === i);
  /* every word of the phrase, side by side, in the text: "western" never in "Southwestern", "Kansas" never in "Arkansas" */
  J.has = function (text, phrase) {
    const t = words(text), p = words(phrase); if (!p.length || !t.length) return false;
    for (let i = 0; i + p.length <= t.length; i++) { let k = 0; while (k < p.length && t[i + k] === p[k]) k++; if (k === p.length) return true; }
    return false;
  };
  J.text = i => [i.title, i.summary, (i.tags || []).join(' . '), i.company, i.type].filter(Boolean).join(' . ');
  const ANIM = /\banimat/i, UNT = /^(?:unt\.?|untitled)\b|\b(?:untitled|tba)\b/i;
  /* me: {types:[], wantMore:[], places:[], offices:[{name, seen}], people:[]} */
  J.match = function (item, me) {
    me = me || {}; const t = J.text(item);
    const m = {
      words: uniq((me.types || []).concat(me.wantMore || []).map(clean).filter(x => x && J.has(t, x))),
      places: uniq((me.places || []).map(clean).filter(x => x && J.has(t, x))),
      offices: (me.offices || []).filter(o => o && clean(o.name).length > 3 && J.has(t, o.name.replace(/\bcasting\b/i, '').trim() || o.name)).map(o => ({ name: o.name, seen: !!o.seen })),
      people: uniq((me.people || []).map(clean).filter(x => x && x.split(' ').length > 1 && J.has(t, x)))
    };
    if (item.kind === 'taxcredit' && (me.places || []).some(p => /^(?:california|ca|los angeles|la|hollywood|san francisco|bay area|san diego|sacramento|socal|southern california)$/i.test(clean(p))))
      m.places = uniq(m.places.concat(['California']));
    m.any = !!(m.words.length || m.places.length || m.offices.length || m.people.length);
    return m;
  };
  J.why = function (m) {
    const L = [];
    if (m.words.length) L.push('Your words: ' + m.words.join(', '));
    if (m.offices.length) L.push(m.offices.map(o => o.name + (o.seen ? ' (has had you in)' : ' (never had you in)')).join(', '));
    if (m.people.length) L.push('People you know: ' + m.people.join(', '));
    if (m.places.length) L.push('Your places: ' + m.places.join(', '));
    return L.join(' · ');
  };
  /* the state list in plain words */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  J.day = iso => { const m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? MON[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : ''; };
  const n = (v, one, many) => v == null ? '' : v.toLocaleString('en-US') + ' ' + (v === 1 ? one : many);
  J.plans = i => [i.days != null ? n(i.days, 'filming day', 'filming days') + ' in California' : '', i.cast != null ? n(i.cast, 'cast member', 'cast') + ' hired' : '', i.bg ? n(i.bg, 'background day', 'background days') : ''].filter(Boolean).join(', ');
  J.flags = i => [ANIM.test(i.type || '') ? 'animation, so voice cast' : '', UNT.test(i.title || '') ? 'a working title' : '', i.mark === 'ongoing' ? 'an ongoing show' : '', i.mark === 'latest' ? 'the latest round' : ''].filter(Boolean);
  J.isAnim = i => ANIM.test(i.type || '');

  /* a wire item -> a Spotted card to check before it's kept. S = Spotted. */
  const GENERIC = /^(?:news|film|tv|television|movies?|breaking news|exclusive|exclusives|business|awards|festivals?|box office|reviews?|music|theater|international|global|streaming|digital|video|lifestyle|style|politics|tech|podcasts?|events?|obituaries|trailers?|first look|casting|cast|features?|series|film news|tv news|world|uk|us)$/i;
  J.card = function (item, S) {
    if (item.kind === 'taxcredit') {
      const c = S.read(item.title || '', { url: '' });
      c.project = clean(item.title); c.network = clean(item.company); c.type = clean(item.type); c.where = 'California';
      c.source = item.link || ''; c.links = c.source ? [c.source] : [];
      c.dates = [{ what: 'Approved', text: 'California tax credit, ' + J.day(item.allocated) }];
      const pl = J.plans(item); if (pl) c.dates.push({ what: 'Plans', text: pl });
      c.stage = null; c.about = [item.title, item.company, item.type, 'California'].join(' . ');
      c.found = uniq((c.found || []).concat(['project', 'network', 'type']));
      return c;
    }
    const raw = clean(item.title) + '\n' + clean(item.summary) + (item.date ? '\nPublished: ' + J.day(item.date) : '');
    const c = S.read(raw, { url: item.link });
    c.source = item.link; if (!c.links.includes(item.link)) c.links.unshift(item.link);
    const tags = (item.tags || []).filter(t => !GENERIC.test(clean(t)));
    c.tags = tags;
    if (!c.project) { const inTitle = tags.find(t => J.has(item.title, t)); if (inTitle) c.project = inTitle; }
    c.about = [c.about || '', tags.join(' . ')].filter(Boolean).join(' . ');
    return c;
  };

  /* the wire against you: what's new since your last look, what fits, newest first. Kept and "not for me" drop off. */
  J.sort = function (w, me, st) {
    const out = { fits: [], list: [], news: [], newCount: 0 };
    (w.items || []).forEach(i => {
      if (!i || !i.id || st.gone[i.id]) return;
      const m = J.match(i, me), x = { i, m, fresh: !st.seen[i.id] };
      if (x.fresh) out.newCount++;
      /* California alone doesn't make a state-list row fit you: the whole list is California */
      if (m.words.length || m.offices.length || m.people.length || (m.places.length && i.kind !== 'taxcredit')) out.fits.push(x);
      if (i.kind === 'taxcredit') out.list.push(x); else out.news.push(x);
    });
    const by = (a, b) => (b.fresh - a.fresh) || String(b.i.date || '').localeCompare(String(a.i.date || ''));
    out.fits.sort(by); out.news.sort(by);
    out.list.sort((a, b) => (b.fresh - a.fresh) || String(b.i.allocated || '').localeCompare(String(a.i.allocated || '')) || (J.isAnim(a.i) - J.isAnim(b.i)) || ((b.i.cast || 0) - (a.i.cast || 0)));
    return out;
  };
  /* the receipt, in plain words */
  J.receipt = function (w, newCount, at) {
    const t = d => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const L = ['Checked ' + t(at || Date.now()) + '. THE WIRE was made ' + t(w.at) + '.'];
    (w.sources || []).forEach(s => L.push(s.ok ? s.label + ': ' + s.count + (s.id === 'cfc' ? ' productions on the list.' : ' stories.') : s.label + ': not read this time. ' + s.err));
    L.push(newCount ? newCount + ' new since you last looked.' : 'Nothing new since you last looked.');
    return L;
  };
  g.Wire = J;
  if (typeof module !== 'undefined') module.exports = J;
})(typeof window !== 'undefined' ? window : globalThis);
