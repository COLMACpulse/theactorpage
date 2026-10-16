/* node cps/tests/voices_tests.js : the same-lines voice roster (CPS 0.3). Synthetic voices at known pitch and pace. */
const E = require('../engine.js');
let pass = 0, fail = 0; const ok = (n, c, x) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };

// a voice-like take: harmonics on f0, syllables on/off
function voice(f0, syl, son, soff, sr = 44100) {
  const parts = [], z = s => new Float32Array(Math.round(s * sr));
  parts.push(z(0.4));
  for (let k = 0; k < syl; k++) {
    const n = Math.round(son * sr), a = new Float32Array(n); let ph = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, f = f0 * (1 + 0.02 * Math.sin(2 * Math.PI * 3 * t)) * (1 + 0.04 * Math.sin(2 * Math.PI * (k % 3) / 3)); ph += 2 * Math.PI * f / sr;
      let x = 0; for (let h = 1; h < 8; h++) x += (0.6 / h) * Math.sin(h * ph); a[i] = 0.3 * x * Math.min(1, t / 0.03, (son - t) / 0.03); }
    parts.push(a, z(soff));
  }
  let L = 0; parts.forEach(p => L += p.length); const out = new Float32Array(L); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; });
  return E.analyse([out], sr);
}
const me = voice(82, 14, 0.25, 0.12), randy = voice(140, 14, 0.25, 0.12), weasel = voice(146, 14, 0.24, 0.125), old = voice(95, 14, 0.38, 0.22);
console.log(JSON.stringify({ me: [me.pitchHz, me.spanSec, me.silencePct], randy: [randy.pitchHz, randy.spanSec], weasel: [weasel.pitchHz, weasel.spanSec], old: [old.pitchHz, old.spanSec, old.silencePct] }));
ok('your own voice at 82 Hz reads 82 Hz (60 Hz floor, so a low voice is seen)', Math.abs(me.pitchHz - 82) < 2, me.pitchHz);
ok('character pitches read right', Math.abs(randy.pitchHz - 140) < 3 && Math.abs(weasel.pitchHz - 146) < 3 && Math.abs(old.pitchHz - 95) < 2, [randy.pitchHz, weasel.pitchHz, old.pitchHz]);

// against you
const vr = E.vsMe(me, randy), vo = E.vsMe(me, old);
ok('Randy against you: about 9.3 semitones higher, your pace', /^9\.\d semitones higher than you$/.test(vr[0]) && vr.includes('your pace'), vr);
ok('Old Timer against you: higher, slower, more pauses', /semitones higher than you/.test(vo[0]) && vo.some(x => /% slower$/.test(x)) && vo.some(x => /^more pauses/.test(x)), vo);
ok('you against yourself: pitch about yours, your pace, nothing else', JSON.stringify(E.vsMe(me, me)) === '["pitch about yours","your pace"]', E.vsMe(me, me));
ok('no score words anywhere', !/score|%\s*match|best|worse|better/i.test([vr, vo].flat().join(' ')));

// measure close
const rows = [{ id: 'r', name: 'Randy', an: randy }, { id: 'w', name: 'Weasel', an: weasel }, { id: 'o', name: 'Old Timer', an: old }];
const P = E.closePairs(rows);
ok('Randy and Weasel measure close (under 1.5 st, under 10% time); Old Timer close to nobody', P.length === 1 && P[0].a.name === 'Randy' && P[0].b.name === 'Weasel' && P[0].st < 1.5 && P[0].time <= 10, P.map(p => [p.a.name, p.b.name, p.st, p.time]));
ok('a silent take is never "close"', E.closePairs([{ id: 'a', name: 'A', an: randy }, { id: 'b', name: 'B', an: E.analyse([new Float32Array(44100)], 44100) }]).length === 0);

// same lines
const k1 = E.linesKey('Wait. Don\'t go yet.'), k2 = E.linesKey('  wait   dont go YET '), k3 = E.linesKey('Wait. Do go yet.');
ok('lines key ignores case, spacing and punctuation, not words', k1 === E.linesKey('WAIT, don\'t go yet!') && k1 !== k3 && typeof k2 === 'string', [k1, k2, k3]);
const c = { takes: [
  { id: 'a', kind: 'lines', linesKey: k1, at: '2026-10-01T10:00:00Z', an: randy },
  { id: 'b', kind: 'lines', linesKey: k1, at: '2026-10-09T10:00:00Z', an: weasel },
  { id: 'c', kind: 'lines', linesKey: k3, at: '2026-10-12T10:00:00Z', an: old },
  { id: 'd', kind: 'voice', at: '2026-10-13T10:00:00Z', an: me }] };
ok('newest take on these lines is used; other lines and other takes are not', E.linesTake(c, k1).id === 'b' && E.linesTake(c, k3).id === 'c' && E.linesTake(c, 'zz') === null);
ok('same-lines takes are not the come-back reference', E.reference(c) && E.reference(c).id === 'd');
ok('starter lines are plain words, three lines', E.DEFAULT_LINES.split('\n').length === 3 && !/PULSE|fleet|baseline/i.test(E.DEFAULT_LINES));


// CPS 0.4: the body and the choices; how long it took to get back
ok('body: only what you filled, in order, plain labels', JSON.stringify(E.body({ posture: 'Squared', eyes: ' ', neverDo: 'Plead' }).map(b => b.label + ':' + b.text)) === JSON.stringify(['Posture:Squared', 'What they never do:Plead']));
ok('body: nothing filled, nothing shown', E.body({}).length === 0 && E.body(null).length === 0);
ok('clock in plain words', E.clock(42) === '42 s' && E.clock(100) === '1 min 40 s' && E.clock(120) === '2 min' && E.clock(-3) === '0 s');
const bw = E.backWords([{ at: '2026-10-10T09:00:00Z', secs: 100, cold: true }, { at: '2026-10-15T10:00:00Z', secs: 42 }], '2026-10-15T12:00:00Z');
ok('come-backs newest first, cold said, days in words', bw[0] === 'Back in 42 s, today' && bw[1] === 'Back in 1 min 40 s, cold, 5 days ago', bw);
ok('come-backs: no score words', !/score|%|grade|recover/i.test(bw.join(' ')));

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
