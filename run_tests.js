// node tests/run_tests.js [fixtures dir with then.wav, same.wav, now_fast_high.wav, now_slow.wav, then48.wav]
'use strict';
const E = require('../engine.js'), fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, i) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, i === undefined ? '' : JSON.stringify(i)); } };
const near = (a, b, rel) => Math.abs(a - b) <= Math.abs(b) * rel;

function readWav(p) {
  const b = fs.readFileSync(p), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 12, fmt = null, data = null;
  while (o < b.length - 8) { const id = b.toString('ascii', o, o + 4), sz = dv.getUint32(o + 4, true); if (id === 'fmt ') fmt = { ch: dv.getUint16(o + 10, true), sr: dv.getUint32(o + 12, true), bits: dv.getUint16(o + 22, true) }; if (id === 'data') data = { o: o + 8, sz }; o += 8 + sz + (sz & 1); }
  const n = data.sz / (fmt.bits / 8) / fmt.ch, chans = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.ch; c++) chans[c][i] = dv.getInt16(data.o + (i * fmt.ch + c) * 2, true) / 32768;
  return { chans, sr: fmt.sr };
}

// 1. synthetic voice-like signal: 150 Hz harmonic tone, 4 bursts a second, then a second of silence
{
  const sr = 48000, n = sr * 4, x = new Float32Array(n);
  for (let i = 0; i < sr * 3; i++) { const t = i / sr, env = Math.max(0, Math.sin(Math.PI * 4 * t)) ** 2; x[i] = env * (0.5 * Math.sin(2 * Math.PI * 150 * t) + 0.25 * Math.sin(2 * Math.PI * 300 * t) + 0.12 * Math.sin(2 * Math.PI * 450 * t)); }
  for (let i = sr * 3; i < n; i++) x[i] = (Math.random() - 0.5) * 0.0005;
  const a = E.analyse([x], sr);
  ok('tone: pitch 150 Hz within 2%', near(a.pitchHz, 150, 0.02), a);
  ok('tone: note name D3', E.noteName(a.pitchHz) === 'D3', E.noteName(a.pitchHz));
  ok('tone: span is the 3 s of sound, not the trailing silence', near(a.spanSec, 3, 0.1), a.spanSec);
  ok('tone: gaps between bursts read as pauses (35-60%)', a.silencePct >= 35 && a.silencePct <= 60, a.silencePct);
  ok('tone: flat pitch -> narrow range (< 1 st)', a.rangeSt < 1, a.rangeSt);
}
// 2. silence only -> nothing invented
{
  const x = new Float32Array(48000 * 2); for (let i = 0; i < x.length; i++) x[i] = (Math.random() - 0.5) * 0.0004;
  const a = E.analyse([x], 48000);
  ok('silence: no pitch claimed', a.pitchHz === null, a);
}

// 3. real speech fixtures (espeak-ng at known pitch and speed)
const FX = process.argv[2];
if (FX && fs.existsSync(path.join(FX, 'then.wav'))) {
  const A = n => { const w = readWav(path.join(FX, n)); return E.analyse(w.chans, w.sr); };
  const then = A('then.wav'), same = A('same.wav'), fast = A('now_fast_high.wav'), slow = A('now_slow.wav'), t48 = A('then48.wav');
  console.log('INFO then', JSON.stringify(then)); console.log('INFO fast', JSON.stringify(fast)); console.log('INFO slow', JSON.stringify(slow));
  ok('speech: pitch matches the independent reference (83 Hz ±6%)', near(then.pitchHz, 83, 0.06), then.pitchHz);
  ok('speech: higher voice matches reference (113 Hz ±6%)', near(fast.pitchHz, 113, 0.06), fast.pitchHz);
  ok('speech: 48 kHz stereo copy reads the same (pitch ±2%, time ±3%)', near(t48.pitchHz, then.pitchHz, 0.02) && near(t48.spanSec, then.spanSec, 0.03), [t48, then]);
  const cs = E.compare(then, same);
  ok('same take twice -> "about the same" on pitch, range, pace, silence', ['pitch', 'range', 'time', 'silence'].every(k => /about the same/.test(cs.rows.find(r => r.key === k).words)), cs.say);
  const cf = E.compare(then, fast);
  const dp = cf.rows.find(r => r.key === 'pitch').delta, tm = cf.rows.find(r => r.key === 'time');
  ok('higher + faster: says higher by ~5 semitones (4-6.5)', /higher/.test(cf.say[0]) && dp >= 4 && dp <= 6.5, cf.say);
  ok('higher + faster: quicker, time ratio near espeak 120/180 wpm with shorter gaps (0.45-0.70)', /quicker/.test(tm.words) && fast.spanSec / then.spanSec > 0.45 && fast.spanSec / then.spanSec < 0.7, [tm.words, fast.spanSec / then.spanSec]);
  ok('higher + faster: fewer pauses', /fewer/.test(cf.rows.find(r => r.key === 'silence').words), cf.rows.find(r => r.key === 'silence'));
  const cl = E.compare(then, slow);
  ok('slower + more pauses: says slower and more pauses', /slower/.test(cl.rows.find(r => r.key === 'time').words) && /more/.test(cl.rows.find(r => r.key === 'silence').words), cl.say);
  ok('slower: pitch about the same (same voice settings)', /about the same/.test(cl.rows.find(r => r.key === 'pitch').words), cl.say);
} else console.log('SKIP speech fixtures (pass the fixtures folder)');

// 4. character rules
const c = { takes: [], looks: [], anchorLine: '', notes: '' };
ok('state: empty = found, lists what is missing', E.autoState(c) === 'found' && E.missing(c).length === 4);
c.takes.push({ id: 't1', kind: 'voice' });
ok('state: voice only = still found', E.autoState(c) === 'found');
c.anchorLine = 'Insurance.';
ok('state: voice + line = kept', E.autoState(c) === 'kept');
c.state = 'resting';
ok('state: resting is yours, not overridden', E.autoState(c) === 'resting');
c.takes.push({ id: 't2', kind: 'return' }); c.refId = 't2';
ok('reference: a return take can become the reference', E.reference(c).id === 't2');
ok('days since', E.daysSince('2026-09-23T10:00:00Z', '2026-10-14T10:00:00Z') === 21);

// 5. zip round trip
const z = E.makeZip([{ name: 'cyrus/capsule.json', bytes: E.enc('{"name":"CYRUS"}') }, { name: 'cyrus/media/t1.webm', bytes: new Uint8Array([1, 2, 3, 250]) }]);
const r = E.readZip(z);
ok('zip: round trip, CRC checked', E.dec(r['cyrus/capsule.json']) === '{"name":"CYRUS"}' && r['cyrus/media/t1.webm'][3] === 250);
const bad = z.slice(); bad[60] ^= 0xff;
let threw = false; try { E.readZip(bad); } catch (e) { threw = /Damaged/.test(e.message); }
ok('zip: a damaged file is caught, not trusted', threw);
fs.writeFileSync(path.join(__dirname, '_out.zip'), Buffer.from(z));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
