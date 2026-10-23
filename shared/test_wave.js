/* WAVE, pure parts: a take's shape and its picture. node shared/test_wave.js */
const W = require('./wave.js');
let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y))); if (!x) ok = false; };
const SR = 44100, d = new Float32Array(SR * 2); for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = (t > 0.5 && t < 1.5 ? 0.5 : 0.002) * Math.sin(2 * Math.PI * 220 * t); }
const p = W.peaks(d, 40);
want('40 bars, 0 to 100, the loudest at 100', p.length === 40 && Math.max(...p) === 100 && p.every(v => v >= 0 && v <= 100));
want('quiet at the ends, loud in the middle: the shape of the take', p[2] < 20 && p[37] < 20 && p[20] > 90, [p[2], p[20], p[37]]);
want('silence: a flat line, not a crash', W.peaks(new Float32Array(1000), 10).every(v => v === 0) && W.peaks(null, 5).length === 5);
want('the trim as parts of the take', JSON.stringify(W.trimOf({ start: 22050, end: 66150 }, 88200)) === '[0.25,0.75]');
const s = W.svg(p, { trim: [0.25, 0.75], label: 'Take 1' });
want('the picture: one bar each, dead air dim, labelled', (s.match(/<rect/g) || []).length === 40 && /aria-label="Take 1"/.test(s) && /fill="var\(--line/.test(s) && /fill="var\(--tung/.test(s));
want('the meter: -60 dB empty, 0 dB full', W.meter(-60) === 0 && W.meter(0) === 1 && W.meter(-30) === 0.5);
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
