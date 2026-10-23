/* CHECK THE COPY, pure parts: where a file sits on the card, what's missing or cut off before any reading, the
   verdict in plain words, the receipt. Made-up card names only. node shared/test_copycheck.js */
const C = require('./copycheck.js');
let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y))); if (!x) ok = false; };
const F = (p, size) => ({ name: p.split('/').pop(), size, webkitRelativePath: p });
want('a file sits below the folder you picked, the same on the card and the copy', C.key(F('A001/CLIP/C001.mov', 1)) === 'CLIP/C001.mov' && C.key(F('SHUTTLE_A_A001/CLIP/C001.mov', 1)) === 'CLIP/C001.mov' && C.key({ name: 'C001.mov' }) === 'C001.mov');
want('the computer\'s leftovers are not footage', C.junk('.DS_Store') && C.junk('CLIP/._C001.mov') && C.junk('.Spotlight-V100/x') && C.junk('System Volume Information/a') && !C.junk('CLIP/C001.mov'));
const card = C.index([F('A001/CLIP/C1.mov', 100), F('A001/CLIP/C2.mov', 200), F('A001/CLIP/C3.mov', 300), F('A001/CLIP/C4.mov', 400), F('A001/.DS_Store', 6)]);
const copy = C.index([F('B/CLIP/C1.mov', 100), F('B/CLIP/C2.mov', 150), F('B/CLIP/C4.mov', 401), F('B/CLIP/extra.txt', 3)]);
const pl = C.plan(card, copy);
want('before reading: missing, cut off, a different size; only same-size files get read', pl.missing.join() === 'CLIP/C3.mov' && pl.short.join() === 'CLIP/C2.mov' && pl.size.join() === 'CLIP/C4.mov' && pl.read.join() === 'CLIP/C1.mov' && pl.extra.join() === 'CLIP/extra.txt', pl);
want('the card\'s .DS_Store isn\'t counted', Object.keys(card).length === 4);
let r = C.result('BACKUP_B', pl, { card: { 'CLIP/C1.mov': 'aa' }, copy: { 'CLIP/C1.mov': 'aa' } });
want('one copy, three bad: each with its plain reason', r.ok === 1 && r.total === 4 && r.bad.map(b => b.why).join() === 'short,missing,size' && r.extra === 1, r);
const same = C.plan(card, card), fp = { 'CLIP/C1.mov': 'a', 'CLIP/C2.mov': 'b', 'CLIP/C3.mov': 'c', 'CLIP/C4.mov': 'd' };
const A = C.result('SHUTTLE_A', same, { card: fp, copy: fp }), B = C.result('BACKUP_B', same, { card: fp, copy: Object.assign({}, fp, { 'CLIP/C3.mov': 'x' }) });
want('same size, different inside', B.bad.length === 1 && B.bad[0].why === 'diff');
let v = C.verdict([A, A]); want('two copies, all match: safe to erase', v.safe && v.head === 'Every file matches, on both copies.' && v.lines[0] === 'Safe to erase the card.', v);
v = C.verdict([A]); want('one copy: it says so, your call', v.safe && v.one && /That's one copy/.test(v.lines[0]), v);
v = C.verdict([A, B]); want('one bad copy: don\'t erase, says which', !v.safe && v.head === 'Don\'t erase the card yet.' && v.lines.join('|') === 'SHUTTLE_A: every file matches.|BACKUP_B: 1 file doesn\'t match.', v);
const half = C.result('SHUTTLE_A', same, { card: { 'CLIP/C1.mov': 'a' }, copy: { 'CLIP/C1.mov': 'a' } });
want('not finished is never safe', !C.verdict([half]).safe && C.verdict([half]).head === 'Not finished.' && half.left === 3);
const un = C.result('SHUTTLE_A', same, { card: fp, copy: fp }, ['CLIP/C2.mov']);
want('a file that couldn\'t be read is never a match', un.bad.length === 1 && un.bad[0].why === 'unread' && !C.verdict([un]).safe);
want('sizes in plain words', C.bytes(118.4 * 1024 ** 3) === '118 GB' && C.bytes(612 * 1024 ** 2) === '612 MB' && C.bytes(1.2 * 1024 ** 3) === '1.2 GB' && C.bytes(5) === '5 B', [C.bytes(118.4 * 1024 ** 3)]);
const t = C.receipt({ at: Date.UTC(2026, 9, 23, 20), card: 'A001', label: 'Day 2', files: 4, size: 1000, results: [A, B], fp });
want('the receipt: card, date, each copy, what didn\'t match, every fingerprint, nothing uploaded', /^COPY CHECK · A001\nDay 2\nChecked Oct 23, 2026/.test(t) && /SHUTTLE_A: 4 of 4 match/.test(t) && /BACKUP_B: 3 of 4 match, 1 doesn't/.test(t) && /CLIP\/C3\.mov: same size, different inside/.test(t) && /\na  CLIP\/C1\.mov\n/.test(t) && /nothing uploaded, nothing erased/.test(t), t);
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
