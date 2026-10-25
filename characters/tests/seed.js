/* made-up data in every tool Characters reads. page.evaluate(SEED) */
module.exports = async () => {
  const put = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const now = Date.now(), d = n => new Date(now - n * 86400000).toISOString();
  put('theactorpage_shelf_v1', { cur: 's1', list: [{ id: 's1', text: 'INT. DINER - NIGHT\n\nDANA PELL\nWe are closed.\n', file: 'salt_road_sides.pdf', me: 'DANA PELL', from: 'Actor OS', added: now - 9 * 864e5, updated: now - 9 * 864e5 }, { id: 's2', text: 'x', file: 'night_desk_sides.pdf', me: 'OFFICER TATE', added: now - 20 * 864e5 }] });
  put('theactorpage_takes_v1', { list: [1, 2, 3].map(i => ({ id: 't' + i, at: now - 8 * 864e5, kind: 'video', for: { type: 'selftape', title: 'Salt Road', role: 'DANA PELL', from: 'actor-os', take: i } })) });
  put('memorizer_v1', { cur: 'm1', scripts: { m1: { id: 'm1', file: 'the_ask.txt', text: 'x', me: 'MARLOWE', added: now - 3 * 864e5 }, m2: { id: 'm2', file: 'spoken.txt', text: 'x', me: 'YOU', added: now } } });
  put('theactorpage_looks_v1', { looks: [{ id: 'l1', name: 'Tired young dad', added: now - 30 * 864e5 }] });
  put('setlist_v1', { pieces: [{ id: 'p1', level: 'bit', title: 'The ranch', text: 'x', chars: 'Uncle Ray', at: now - 40 * 864e5 }], sets: [] });
  put('writers-blockage-index', [{ id: 'w1', title: 'Gravel Road', updated: d(5) }]);
  put('wb-proj:w1', { format: 'writers-blockage-screenplay', title: 'Gravel Road', blocks: [{ id: 'b1', type: 'Scene Heading', text: 'EXT. GRAVEL ROAD - DAY' }, { id: 'b2', type: 'Character', text: 'JUNE' }, { id: 'b3', type: 'Dialogue', text: 'You missed the turn.' }, { id: 'b4', type: 'Character', text: 'PETE' }, { id: 'b5', type: 'Dialogue', text: 'There was no turn.' }] });
  put('theactorpage_viz_v1', { wishes: [{ id: 'v1', kind: 'role', title: 'A western', role: 'The marshal', added: now - 50 * 864e5, trail: { wanted: '2026-09-01' } }] });
  const open = (name, stores, fill) => new Promise(res => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => stores.forEach(([s, o]) => r.result.createObjectStore(s, o)); r.onsuccess = () => { const db = r.result, t = db.transaction(stores.map(x => x[0]), 'readwrite'); fill(t); t.oncomplete = () => { db.close(); res(); }; }; });
  await open('colmac_hub', [['meta', { keyPath: 'k' }]], t => { t.objectStore('meta').put({ k: 'projects', v: [
    { id: 'h1', kind: 'audition', project: 'Salt Road', role: 'Dana Pell', state: 'submitted', date: d(10).slice(0, 10), casting_office: 'Made Up Casting', outcome: { callback: d(6), booked: d(2) } },
    { id: 'h2', kind: 'audition', project: 'The Ask', role: 'Marlowe', state: 'submitted', date: d(4).slice(0, 10) }] }); t.objectStore('meta').put({ k: 'credits', v: [] }); });
  await open('cps_v02', [['lib'], ['media']], t => t.objectStore('lib').put({ chars: [{ id: 'c1', name: 'Gravel Gus', project: 'Cartoon pilot', created: d(60), updated: d(12), takes: [{ id: 'k1', kind: 'voice', at: d(12) }] }, { id: 'c0', name: 'Me', me: true, takes: [] }] }, 'main'));
  await open('vresume_v03', [['lib'], ['media']], t => t.objectStore('lib').put({ pieces: [], roles: [{ id: 'r1', name: 'Small-town cop', at: now - 70 * 864e5 }] }, 'main'));
};
