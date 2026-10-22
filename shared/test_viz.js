/* THE VIZ, the pure parts. Made-up shows only. node shared/test_viz.js */
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const G = require('./viz.js');
let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y))); if (!x) ok = false; };
const a = G.add({ title: 'Harbor Lights', kind: 'show' }), b = G.add({ title: 'Ferro', kind: 'show', aka: ['Ferro: Legacy'] }), c = G.add({ title: 'Union card', kind: 'milestone' }), d = G.add({ title: 'Dana Wolfe', kind: 'person' });
want('add: four on the wall, each with today as WANT IT', G.all().length === 4 && G.all().every(w => w.trail.wanted === G.iso(new Date())));
want('nothing without a title', G.add({ title: '  ' }) === null && G.all().length === 4);
want('want it: a fresh wish is not got', !G.got(a) && G.at(a).label === 'Want it');
G.mark(a.id, 'room', '2026-03-02');
want('in the room, with its date', G.at(G.get(a.id)).label === 'In the room' && G.at(G.get(a.id)).date === '2026-03-02' && !G.got(G.get(a.id)));
G.mark(a.id, 'booked', '2026-04-10');
want('booked: got, stays on the wall with its date', G.got(G.get(a.id)) && G.gotten()[0].id === a.id && G.wanted().length === 3);
G.mark(c.id, 'got', '2026-05-01');
want('a milestone has two steps: want it, got it', G.steps('milestone').length === 2 && G.got(G.get(c.id)));
want('someone to work with: met, worked with', G.steps('person').map(s => s[1]).join() === 'Want it,Met,Worked with');
G.mark(a.id, 'booked', '');
want('a step can come off', !G.got(G.get(a.id)));
G.mark(a.id, 'booked', '2026-04-10');
/* requests */
want('a request names a show on your wall', (G.forRequest('HARBOR LIGHTS') || {}).id === a.id && (G.forRequest('Ferro: Legacy, episode 204') || {}).id === b.id);
want('a request for something else does not', G.forRequest('Night Shift') === null && G.forRequest('') === null);
want('a person or milestone is never a request match', G.forRequest('Union card') === null && G.forRequest('Dana Wolfe') === null);
/* news */
const wire = { sources: [{ id: 'tr', label: 'The Trade' }], items: [
  { id: 1, kind: 'news', src: 'tr', title: '‘Ferro’ Renewed for a Third Season', link: 'https://example.com/1', date: '2026-10-01T00:00:00Z' },
  { id: 2, kind: 'news', src: 'tr', title: 'Ferro prices rise at the port', link: 'https://example.com/2' },
  { id: 3, kind: 'news', src: 'tr', title: 'Harbor Lights adds two to the cast', link: 'https://example.com/3' },
  { id: 4, kind: 'news', src: 'tr', title: 'Lights out on the harbor', link: 'https://example.com/4' },
  { id: 5, kind: 'news', src: 'tr', title: 'Dana Wolfe to direct a limited series', link: 'https://example.com/5' },
  { id: 6, kind: 'news', src: 'tr', title: 'A western casts its lead', tags: ['Ferro'], link: 'javascript:alert(1)' },
  { id: 7, kind: 'taxcredit', src: 'tr', title: 'Harbor Lights', tags: ['Harbor Lights'] }] };
const m = G.newsMatches(wire);
want('news: a one-word title counts when the story puts it in quotes', m[b.id].some(x => x.id === 1) && !m[b.id].some(x => x.id === 2), m[b.id]);
want('news: or when the story is tagged with it, and an unsafe link is dropped', m[b.id].some(x => x.id === 6 && x.url === ''));
want('news: a two-word title as a phrase, not its words apart', m[a.id].map(x => x.id).join() === '3', m[a.id]);
want('news: a person you want to work with', m[d.id].map(x => x.id).join() === '5');
want('news: the source by name, the date as a day', m[b.id][0].src === 'The Trade' && m[b.id][0].at === '2026-10-01');
want('news: never for a milestone', !m[c.id]);
/* the plug */
const day = '2026-10-22'; /* a Thursday */
want('when: tonight, at 10:00 PM', G.when('2026-10-22', '22:00', day) === 'tonight at 10:00 PM');
want('when: tomorrow night', G.when('2026-10-23', '21:30', day) === 'tomorrow night at 9:30 PM');
want('when: this Saturday (daytime, no "night")', G.when('2026-10-24', '13:00', day) === 'this Saturday at 1:00 PM');
want('when: next Friday night', G.when('2026-10-30', '22:00', day) === 'next Friday night at 10:00 PM');
want('when: further out, the date', G.when('2026-11-14', '', day) === 'Saturday, Nov 14');
want('when: Thursday to the coming Monday is next Monday, not this one', G.when('2026-10-26', '20:00', day) === 'next Monday night at 8:00 PM' && G.when('2026-10-25', '', day) === 'this Sunday');
want('when: two weeks out, the date', G.when('2026-11-06', '22:00', day) === 'Friday, Nov 6 at 10:00 PM');
want('when: gone by, nothing', G.when('2026-10-01', '22:00', day) === '');
G.set(a.id, { role: 'Deckhand', air: { date: '2026-10-30', time: '22:00', where: 'the Harbor Network' } });
const p = G.plug('Check out [SHOW] [WHEN] on [WHERE]. I play [role].', G.get(a.id), day);
want('the plug: your words with the facts in', p.text === 'Check out Harbor Lights next Friday night at 10:00 PM on the Harbor Network. I play Deckhand.' && !p.missing.length, p);
const p2 = G.plug('[SHOW] on [WHERE], [DATE].', G.get(b.id), day);
want('the plug: a fact not filled in stays as the blank, and says so', p2.text === 'Ferro on [WHERE], [DATE].' && p2.missing.join() === '[WHERE],[DATE]', p2);
want('the plug: no shape, no words of ours', G.plug('', G.get(a.id), day).text === '');
const q1 = G.plugAdd({ kind: 'airing', title: 'Harbor Lights', role: 'Deckhand', date: '2026-10-30', time: '22:00', where: 'the Harbor Network' });
want('a plug: its own record, any time, nothing written for you', q1.kind === 'airing' && q1.text === '' && G.plugs().length === 1);
want('airing: a plug for something airing in the next 7 days', G.airing('2026-10-24').map(x => x.id).join() === q1.id && G.airing('2026-11-10').length === 0);
const q2 = G.plugAdd({ kind: 'headshot', by: 'Sam Ortiz' });
want('a new headshot: the photographer, and only the blanks that fit', G.plug('New headshots! Photo by [BY].', q2).text === 'New headshots! Photo by Sam Ortiz.' && G.tokensFor('headshot').map(t => t[0]).join() === '[BY]');
want('airing gets every blank, [WHEN] before [DATE]', G.tokensFor('airing').map(t => t[0]).join() === '[TITLE],[ROLE],[WHEN],[DATE],[TIME],[WHERE]');
want('something I worked on: no dates asked', G.tokensFor('worked').map(t => t[0]).join() === '[TITLE],[ROLE],[WHERE]');
want('[SHOW] still works as [TITLE]', G.plug('[SHOW] / [TITLE]', q1, day).text === 'Harbor Lights / Harbor Lights');
G.keepShape('headshot', 'Fresh headshots, shot by [BY].');
want('your way of saying it, kept per kind: the next headshot plug starts from it', G.plugAdd({ kind: 'headshot' }).text === 'Fresh headshots, shot by [BY].' && G.plugAdd({ kind: 'worked' }).text === '');
want('a plug made from the wall', JSON.stringify(G.plugFrom(G.get(a.id))) === JSON.stringify({ kind: 'airing', title: 'Harbor Lights', role: 'Deckhand', wid: a.id }) && G.plugFrom(G.get(b.id)).kind === 'news');
want('plugs for one wish', G.plugAdd(G.plugFrom(G.get(a.id))) && G.plugsFor(a.id).length === 1);
/* reps */
G.set(b.id, { reps: true, note: 'the cop drama I watch every week' }); G.set(a.id, { reps: true }); G.set(c.id, { reps: true });
const r = G.forReps();
want('reps: only the ones you picked, still wanted, no milestones', r.length === 1 && r[0].title === 'Ferro' && r[0].note === 'the cop drama I watch every week', r);
want('a booking as a credit', JSON.stringify(G.credit(G.get(a.id))) === JSON.stringify({ section: 'Television', title: 'Harbor Lights', role: 'Deckhand' }));
G.remove(d.id); want('remove', G.all().length === 3);
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
