/* THEACTORPAGE PRESS: a publicity department of one, kept lean. Press starts from real news, not "here I am".
   A CAMPAIGN: the milestone (a premiere, a festival, a booking, a release), the project, the date, and the news in
   your own words. WHO COVERS IT: press people from CONTACTS, each one marked confirmed only once you've checked who
   they are and what they cover from their own work. For each: when you reached them, how, and what came back.
   YOUR PITCH: you write it. The page puts your facts beside it to copy from; it never writes a word of it.
   THE PRESS KIT: only facts you entered (your profile, your credits, your links, the headshots you pick), with a
   checklist before it goes anywhere: facts checked, photo rights, photo credits, reel link approved.
   No scores. Nothing is sent from here: EMAIL IT opens your own mail with your words in it.
   localStorage theactorpage_press_v1. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const P = {}, KEY = 'theactorpage_press_v1';
  P.KEY = KEY;
  P.MILESTONES = [['premiere', 'A premiere'], ['festival', 'A festival'], ['booking', 'A booking'], ['release', 'A release'], ['show', 'A show or a run'], ['other', 'Other news']];
  P.HOW = [['email', 'Email'], ['form', 'Their tips form'], ['dm', 'A message'], ['person', 'In person'], ['other', 'Other']];
  P.REPLIES = [['none', 'No reply yet'], ['replied', 'Replied'], ['covering', 'Covering it'], ['passed', 'Passed']];
  P.CHECKS = [['facts', 'Every fact, date and credit checked'], ['rights', 'I have the rights to every photo and clip'], ['credits', 'Photo credits written down'], ['reel', 'The reel link is the one I want seen']];
  const now = () => Date.now(), uid = () => 'p' + now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clean = s => String(s == null ? '' : s).replace(/[ \t]+/g, ' ').trim();
  const LS = () => { try { return g.localStorage; } catch (e) { return null; } };
  function read() { try { const d = JSON.parse((LS() && LS().getItem(KEY)) || 'null'); if (d && Array.isArray(d.campaigns)) return d; } catch (e) { } return { campaigns: [] }; }
  function write(d) { try { LS().setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  P.all = () => read().campaigns.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b.added - a.added);
  P.get = id => read().campaigns.find(c => c.id === id) || null;
  P.add = function (c) {
    const d = read(), title = clean(c && c.title); if (!title) return null;
    const it = Object.assign({ id: uid(), title, milestone: 'premiere', date: '', where: '', hook: '', bio: '', pitch: '', links: { page: '', reel: '', more: '' }, outlets: [], photos: [], checks: {}, added: now() }, c, { title });
    d.campaigns.push(it); write(d); return it;
  };
  P.set = function (id, patch) {
    const d = read(), c = d.campaigns.find(x => x.id === id); if (!c) return null;
    Object.keys(patch || {}).forEach(k => { if (k === 'id') return; const v = patch[k]; c[k] = typeof v === 'string' ? (k === 'hook' || k === 'bio' || k === 'pitch' ? String(v) : clean(v)) : v; });
    write(d); return c;
  };
  P.remove = function (id) { const d = read(); d.campaigns = d.campaigns.filter(c => c.id !== id); write(d); };
  /* who covers it: a press contact on this campaign */
  P.addOutlet = function (id, cid) { const c = P.get(id); if (!c || !cid || c.outlets.some(o => o.cid === cid)) return c; return P.set(id, { outlets: c.outlets.concat([{ cid, reached: '', how: 'email', reply: 'none', note: '' }]) }); };
  P.setOutlet = function (id, cid, patch) { const c = P.get(id); if (!c) return null; return P.set(id, { outlets: c.outlets.map(o => o.cid === cid ? Object.assign({}, o, patch) : o) }); };
  P.dropOutlet = function (id, cid) { const c = P.get(id); if (!c) return null; return P.set(id, { outlets: c.outlets.filter(o => o.cid !== cid) }); };
  /* where it stands, in counts */
  P.tally = function (c) { const t = { outlets: c.outlets.length, reached: 0, none: 0, replied: 0, covering: 0, passed: 0 }; c.outlets.forEach(o => { if (o.reached) { t.reached++; t[o.reply || 'none']++; } }); return t; };
  P.tallyLine = function (c) {
    const t = P.tally(c); if (!t.outlets) return 'Nobody on the list yet.';
    const L = [t.outlets + ' on the list', t.reached + ' reached'];
    if (t.covering) L.push(t.covering + ' covering it'); if (t.replied) L.push(t.replied + ' replied'); if (t.passed) L.push(t.passed + ' passed');
    return L.join(', ') + '.';
  };
  /* before the kit goes anywhere: what's not done yet, in words */
  P.notYet = function (c) {
    const L = [];
    if (!clean(c.hook)) L.push('The news, in your words');
    if (!clean(c.bio)) L.push('A short bio, in your words');
    if (!(c.photos || []).length) L.push('A headshot or still');
    P.CHECKS.forEach(([k, l]) => { if (!(c.checks || {})[k]) L.push(l); });
    return L;
  };
  /* your facts, to copy from while you write the pitch. you: the profile (you.js). credits: [{title, role, by}] */
  P.facts = function (c, you, credits) {
    you = you || {}; const L = [], M = (P.MILESTONES.find(x => x[0] === c.milestone) || ['', 'News'])[1];
    L.push(M + ': ' + c.title + (c.where ? ', ' + c.where : '') + (c.date ? ', ' + P.day(c.date) : ''));
    if (you.name) L.push('Name: ' + you.name + (you.union ? ' (' + you.union + ')' : ''));
    const cr = (credits || []).filter(x => x && x.title).slice(0, 6).map(x => x.title + (x.role || x.character ? ', ' + (x.role || x.character) : '') + (x.by ? ' (' + x.by + ')' : ''));
    if (cr.length) L.push('Credits: ' + cr.join('; '));
    if (c.links && c.links.page) L.push('Page: ' + c.links.page);
    if (c.links && c.links.reel) L.push('Reel: ' + c.links.reel);
    if (c.links && c.links.more) L.push('More: ' + c.links.more);
    if (you.rep) L.push('Rep: ' + you.rep);
    if (you.email) L.push('Contact: ' + you.email);
    return L;
  };
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  P.day = iso => { const m = String(iso || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? MON[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : String(iso || ''); };
  /* the kit: your words where they're yours, your facts where they're facts. Nothing made up. */
  P.kitText = function (c, you, credits) {
    you = you || {}; const name = you.name || '[YOUR NAME]';
    const L = [name.toUpperCase() + ': PRESS KIT', '', 'THE NEWS', clean(c.hook) || '[The news, in your words]', ''];
    L.push('WHAT, WHERE, WHEN', P.facts(c, you, credits)[0], '');
    L.push('BIO', clean(c.bio) || '[A short bio, in your words]', '');
    const cr = (credits || []).filter(x => x && x.title);
    if (cr.length) { L.push('CREDITS'); cr.forEach(x => L.push('- ' + x.title + (x.role || x.character ? ', ' + (x.role || x.character) : '') + (x.by ? ' (' + x.by + ')' : ''))); L.push(''); }
    const ln = c.links || {}; if (ln.page || ln.reel || ln.more) { L.push('LINKS'); if (ln.page) L.push('Page: ' + ln.page); if (ln.reel) L.push('Reel: ' + ln.reel); if (ln.more) L.push('More: ' + ln.more); L.push(''); }
    if ((c.photos || []).length) { L.push('PHOTOS'); (c.photos || []).forEach((ph, i) => L.push('- ' + P.photoName(c, ph, i) + (ph.credit ? ', photo by ' + ph.credit : ''))); L.push(''); }
    L.push('CONTACT'); L.push([you.email, you.rep ? 'Rep: ' + you.rep + (you.repPhone ? ', ' + you.repPhone : '') : ''].filter(Boolean).join('\n') || '[How to reach you]');
    return L.join('\n') + '\n';
  };
  P.photoName = (c, ph, i) => (clean(c.title) || 'press').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') + '_photo_' + (i + 1) + '.jpg';
  /* your pitch, to your own mail app */
  P.mailto = function (to, subject, body) { return 'mailto:' + encodeURIComponent(to || '') + '?subject=' + encodeURIComponent(subject || '') + '&body=' + encodeURIComponent(body || ''); };
  g.Press = P;
  if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
