/* JUICE on the phone: matching a made-up wire to a made-up actor. node shared/test_wire.js */
const store = {}; global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const J = require('./wire.js'), S = require('./spotted.js');
let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 500))); if (!x) ok = false; };
const W = { v: 1, at: '2026-10-21T12:17:00Z', sources: [{ id: 'cfc', label: 'California Film Commission', ok: true, count: 3 }, { id: 'trade', label: 'Made Up Trade', ok: true, count: 4 }, { id: 'down', label: 'Down Trade', ok: false, count: 0, err: 'connection refused' }],
  items: [
    { id: 'a1', src: 'trade', kind: 'news', title: 'Netflix Orders Western Series ‘Dust Road’', link: 'https://trade.example.com/dust-road', date: '2026-10-20T18:30:00Z', tags: ['News', 'Dust Road', 'Canyon Casting'], summary: 'Set in 1880s Kansas. Canyon Casting is casting.' },
    { id: 'a2', src: 'trade', kind: 'news', title: 'Southwestern Airlines Ad Wins Award', link: 'https://trade.example.com/ad', date: '2026-10-20T10:00:00Z', tags: ['Awards'], summary: 'Shot in Arkansas by a copper company.' },
    { id: 'a3', src: 'trade', kind: 'news', title: 'Riley Hart Joins Harbor Lights', link: 'https://trade.example.com/harbor', date: '2026-10-19T10:00:00Z', tags: ['Harbor Lights', 'Riley Hart', 'TV'], summary: 'Jo Banner directs.' },
    { id: 'a4', src: 'trade', kind: 'news', title: 'Box Office Weekend', link: 'https://trade.example.com/bo', date: '2026-10-18T10:00:00Z', tags: ['Box Office'], summary: '' },
    { id: 'c1', src: 'cfc', kind: 'taxcredit', title: 'Salt Flat', company: 'Mesa Films LLC', type: 'Independent Film $10m & Under Live Action', fy: '2026-2027', allocated: '2026-09-21', date: '2026-09-21T00:00:00Z', days: 33, cast: 50, bg: 1310, mark: 'latest', link: 'https://state.example.gov/list/' },
    { id: 'c2', src: 'cfc', kind: 'taxcredit', title: 'Glass Pond', company: 'Pond Animation', type: 'Independent Film Over $10m Animation', allocated: '2026-09-21', days: null, cast: 20, bg: null, mark: 'latest', link: 'https://state.example.gov/list/' },
    { id: 'c3', src: 'cfc', kind: 'taxcredit', title: 'Unt. Comedy Project', company: 'Big Studio', type: 'Non-Independent Feature Film Live Action', allocated: '2026-07-27', days: 40, cast: 43, bg: 3618, mark: '', link: 'https://state.example.gov/list/' }] };
const me = { types: ['western', 'cop', 'rancher'], wantMore: ['dark drama'], places: ['Kansas', 'Los Angeles'], offices: [{ name: 'Canyon Casting', seen: true }, { name: 'Ridge Casting', seen: false }], people: ['Jo Banner'] };
const m1 = J.match(W.items[0], me);
want('whole words: western, Kansas, and an office you know, said as such', m1.words.join() === 'western' && m1.places.join() === 'Kansas' && m1.offices.length === 1 && m1.offices[0].seen, m1);
const m2 = J.match(W.items[1], me);
want('never inside another word: not Southwestern, not Arkansas, not copper', !m2.any, m2);
want('people you know, by full name', J.match(W.items[2], me).people.join() === 'Jo Banner');
want('a state-list row with your words in it does fit', J.sort({ items: [Object.assign({}, W.items[4], { id: 'cx', title: 'Western Days' })] }, me, J.load()).fits.length === 1);
want('the state list matches California for an actor in Los Angeles', J.match(W.items[4], me).places.join() === 'California');
want('the why line: what matched, no score', J.why(m1) === 'Your words: western · Canyon Casting (has had you in) · Your places: Kansas' && !/\d+ ?(%|\/100|points?)/.test(J.why(m1)), J.why(m1));
const st = J.load();
want('JUICE starts on "only when I tap", never on its own', st.mode === 'manual' && !J.dueToday(st));
let o = J.sort(W, me, st);
want('everything is new the first time; fits: the western and the Harbor Lights story (Jo Banner); California alone does not make the state list fit', o.newCount === 7 && o.fits.map(x => x.i.id).join() === 'a1,a3', o.fits.map(x => x.i.id));
want('the state list: live action before animation in the same round, then the next round', o.list.map(x => x.i.id).join() === 'c1,c2,c3', o.list.map(x => x.i.id));
W.items.forEach(i => st.seen[i.id] = 1); st.gone.a1 = 1;
o = J.sort(W, me, st);
want('second look: nothing new; "not for me" stays gone', o.newCount === 0 && !o.fits.some(x => x.i.id === 'a1'));
st.mode = 'daily'; want('daily: due the first time today, then not', J.dueToday(st, Date.parse('2026-10-21T15:00:00')) && (st.day = J.today(Date.parse('2026-10-21T15:00:00')), !J.dueToday(st, Date.parse('2026-10-21T18:00:00'))) && J.dueToday(st, Date.parse('2026-10-22T08:00:00')));
const r = J.receipt(W, 3, Date.parse('2026-10-21T15:00:00Z'));
want('the receipt: when, each source, a failure in plain words, how many new', r.length === 5 && /California Film Commission: 3 productions on the list\./.test(r[1]) && /Down Trade: not read this time\. connection refused/.test(r[3]) && r[4] === '3 new since you last looked.', r);
const c = J.card(W.items[0], S);
want('keep a story: a Spotted card, project from its quotes, casting read, link kept', c.project === 'Dust Road' && /Canyon/.test((c.casting || []).join()) && c.source === 'https://trade.example.com/dust-road' && c.tags.join() === 'Dust Road,Canyon Casting', c);
const c3 = J.card(W.items[2], S);
want('no quotes: the site\'s tag that\'s in the headline becomes the project, for you to check', c3.project === 'Harbor Lights', c3.project);
const k = J.card(W.items[4], S);
want('keep from the state list: title, company, kind, California, approval date and plans', k.project === 'Salt Flat' && k.network === 'Mesa Films LLC' && k.where === 'California' && k.dates[0].text === 'California tax credit, Sep 21, 2026' && k.dates[1].text === '33 filming days in California, 50 cast hired, 1,310 background days', k.dates);
want('flags: animation means voice cast; working titles said', J.flags(W.items[5]).includes('animation, so voice cast') && J.flags(W.items[6]).includes('a working title'));
const pa = S.passAlong(Object.assign({}, k, { mine: '' }), [], { name: 'Riley Hart' }).body;
want('pass it along: the state list facts go to your reps', /California tax credit, Sep 21, 2026/.test(pa) && /50 cast hired/.test(pa), pa);
want('no em dashes', !/—/.test(JSON.stringify([J.why(m1), r, k, c, pa])));
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
