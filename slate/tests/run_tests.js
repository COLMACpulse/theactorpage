// node tests/run_tests.js   (writes tests/_out.zip for an unzip check)
'use strict';
const E = require('../engine.js'), fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, i) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, i === undefined ? '' : JSON.stringify(i)); } };
const near = (a, b, t) => Math.abs(a - b) <= t;
const inside = (box, r, W, H) => box.x * W >= r.x - 0.5 && box.y * H >= r.y - 0.5 && (box.x + box.w) * W <= r.x + r.w + 0.5 && (box.y + box.h) * H <= r.y + r.h + 0.5;

// a horizontal 4K take, actor standing centre, head to toe ~80% of frame
const W = 3840, H = 2160;
const plan = { face: { x: 0.47, y: 0.10, w: 0.06, h: 0.11 }, body: { x: 0.42, y: 0.08, w: 0.16, h: 0.82 }, glideAt: 4, glide: 2, dir: 'out' };
for (const a of ['16:9', '9:16', '1:1']) {
  const f = E.windowAt(0, plan, W, H, a), b = E.windowAt(10, plan, W, H, a), m = E.windowAt(5, plan, W, H, a);
  ok(`${a}: aspect exact before, mid and after`, [f, m, b].every(r => near(r.w / r.h, E.ASPECTS[a], 1e-9)));
  ok(`${a}: close-up contains the face`, inside(plan.face, f, W, H), f);
  ok(`${a}: full body contains the whole body`, inside(plan.body, b, W, H), b);
  ok(`${a}: close-up is tighter than full body`, f.h < m.h && m.h < b.h, [f.h, m.h, b.h]);
  ok(`${a}: inside the source (no bars) on 4K horizontal`, [f, b].every(r => r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= W + 0.5 && r.y + r.h <= H + 0.5), [f, b]);
}
// holds and the move
const a0 = E.windowAt(0, plan, W, H, '16:9'), a39 = E.windowAt(3.99, plan, W, H, '16:9');
ok('holds tight until the glide starts', near(a0.h, a39.h, 0.001));
const b6 = E.windowAt(6, plan, W, H, '16:9'), b9 = E.windowAt(9, plan, W, H, '16:9');
ok('holds wide after the glide ends', near(b6.h, b9.h, 0.001));
let mono = true, prev = 0; for (let t = 4; t <= 6; t += 0.05) { const h = E.windowAt(t, plan, W, H, '16:9').h; if (h + 1e-6 < prev) mono = false; prev = h; }
ok('glide only ever widens (no wobble)', mono);
const s1 = E.windowAt(4.1, plan, W, H, '16:9').h - a0.h, s2 = E.windowAt(5.0, plan, W, H, '16:9').h - E.windowAt(4.9, plan, W, H, '16:9').h;
ok('eases in (slow start, faster middle)', s1 < s2 * 1.2, [s1, s2]);
const rev = Object.assign({}, plan, { dir: 'in' });
ok('reverse: starts full body, ends tight', E.windowAt(0, rev, W, H, '16:9').h > E.windowAt(10, rev, W, H, '16:9').h);
// headroom: eyes in the upper part of the close-up
const fc = (plan.face.y + plan.face.h / 2) * H;
ok('close-up: face centre sits in the upper half', (fc - a0.y) / a0.h < 0.5, (fc - a0.y) / a0.h);

// vertical take, 16:9 full body needs more width than the take has -> bars, centred
const vW = 2160, vH = 3840, vplan = { face: { x: 0.42, y: 0.08, w: 0.16, h: 0.08 }, body: { x: 0.25, y: 0.06, w: 0.5, h: 0.86 }, glideAt: 3, glide: 2, dir: 'out' };
const vb = E.windowAt(9, vplan, vW, vH, '16:9');
ok('vertical take, 16:9 body: window wider than source, centred (side bars)', vb.w > vW && near(vb.x + vb.w / 2, vW / 2, 1), vb);
const da = E.drawArgs(vb, vW, vH, 1920, 1080);
ok('drawArgs: picture lands centred with bars both sides', da && da[4] > 10 && near(da[4] + da[6] / 2, 960, 2), da);
ok('softness flags the bars', E.softness(vplan, vW, vH, '16:9', '1080').barsBody === true);

// softness
const sh = E.softness(plan, W, H, '16:9', '1080');
ok('4K head-to-toe take: MEDIUM (default) is fine at 1080', sh.verdict !== 'soft', sh);
const tightP = Object.assign({}, plan, { shot: 'close' });
ok('4K head-to-toe take: CLOSE at 1080 is flagged soft (honest)', E.softness(tightP, W, H, '16:9', '1080').verdict === 'soft');
ok('4K head-to-toe take: CLOSE at 720 is ok', E.softness(tightP, W, H, '16:9', '720').verdict !== 'soft', E.softness(tightP, W, H, '16:9', '720'));
ok('close is tighter than medium', E.windowAt(0, tightP, W, H, '16:9').h < E.windowAt(0, plan, W, H, '16:9').h);
const lo = E.softness(plan, 1280, 720, '16:9', '1080');
ok('720p webcam: close-up flagged soft', lo.verdict === 'soft', lo);

// words + kit
ok('script: reads naturally', E.slateScript({ name: 'Brendan McCarthy', height: "6'1\"", location: 'San Diego', rep: 'SK Management' }) === "Hi, I'm Brendan McCarthy. I'm 6'1\". I'm based in San Diego. I'm with SK Management.");
ok('script: empty profile still usable', /your name/.test(E.slateScript({})));
ok('label: filename-safe', E.takeLabel({ name: 'Brendan P. McCarthy', role: 'Sheriff Collins', take: '1', date: '2026-10-14' }) === 'brendan_p_mccarthy__sheriff_collins__take_1__2026_10_14');
const ck = E.checklist({ name: 'B', videos: 2, headshot: true });
ok('checklist: lists what is missing, no score', ck.missing.join(',') === 'Résumé,Links', ck);

// zip
ok('crc32 known vector', E.crc32(E.enc('123456789')) === 0xCBF43926);
const z = E.makeZip([{ name: 'kit/links.txt', bytes: E.enc('https://imdb.com/x') }, { name: 'kit/bin.dat', bytes: new Uint8Array([0, 1, 255, 128]) }, { name: 'kit/résumé.txt', bytes: E.enc('ok') }]);
fs.writeFileSync(path.join(__dirname, '_out.zip'), Buffer.from(z));
ok('zip written', z[0] === 0x50 && z[1] === 0x4b);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
