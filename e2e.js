// node cps_e2e.js <shotsdir> <base> <audiodir> <profiledir>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2], BASE = process.argv[3], AU = process.argv[4], PROF = process.argv[5];
const E = require(path.join(__dirname, 'origin/cps/engine.js'));
const shots = p => path.join(OUT, p);
let pass = 0, fail = 0;
const ok = (n, c, info) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, info === undefined ? '' : JSON.stringify(info)); } };
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
async function tapAudit(page) {
  return page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('button, input, textarea, select').forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      if (el.closest('.sr') || el.type === 'file') return;
      if (r.height < 36 || r.width < 36) bad.push((el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + (el.textContent || el.placeholder || '').trim().slice(0, 18));
    });
    return { bad, overflow: document.documentElement.scrollWidth - window.innerWidth };
  });
}
const errors = [];
const watch = p => { p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); }); p.on('dialog', d => d.accept()); };
async function launch(wav) {
  const ctx = await chromium.launchPersistentContext(PROF, {
    executablePath: EXE, headless: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(AU, wav) + '%noloop', '--autoplay-policy=no-user-gesture-required']
  });
  await ctx.grantPermissions(['microphone'], { origin: BASE });
  const page = ctx.pages()[0] || await ctx.newPage(); watch(page);
  return { ctx, page };
}
const said = page => page.$$eval('#said li', ls => ls.map(l => l.textContent));
async function record(page, sel, secs) {
  await page.click(sel);
  await page.waitForSelector('#recmeter', { timeout: 8000 });
  await page.waitForTimeout(secs * 1000);
  const n = await page.evaluate(() => window.CPS.S.lib.chars.reduce((a, c) => a + c.takes.length, 0));
  await page.click('[data-a="recstop"]');
  await page.waitForFunction(n => window.CPS.S.lib.chars.reduce((a, c) => a + c.takes.length, 0) > n && !window.CPS.S.busy, n, { timeout: 20000 });
}

(async () => {
  fs.rmSync(PROF, { recursive: true, force: true });
  // ---------- seed BREAKDOWN (as it stores a project) to check the read-only link
  let { ctx, page } = await launch('then.wav');
  await page.goto(BASE + '/cps/index.html'); await page.waitForFunction(() => window.CPS);
  ok('fresh: peeking did not create a BREAKDOWN database', await page.evaluate(async () => !(await indexedDB.databases()).some(d => d.name === 'breakdown_v03')));
  ok('fresh: no BREAKDOWN chips', !(await page.$('[data-a="frombd"]')));
  await page.screenshot({ path: shots('c01_empty.png'), fullPage: true });
  let a = await tapAudit(page); ok('empty: taps + no overflow', !a.bad.length && a.overflow <= 0, a);

  await page.goto(BASE + '/breakdown/index.html'); await page.waitForTimeout(800);
  await page.evaluate(() => new Promise(res => { const r = indexedDB.open('breakdown_v03', 1); r.onupgradeneeded = () => r.result.createObjectStore('projects', { keyPath: 'id' }); r.onsuccess = () => { const t = r.result.transaction('projects', 'readwrite'); t.objectStore('projects').put({ id: 'p1', title: 'LAST BUS', source: { name: 'LAST_BUS_sides.pdf' }, me: ['CYRUS'], overrides: {} }); t.oncomplete = () => { r.result.close(); res(); }; }; }));
  await page.goto(BASE + '/cps/index.html'); await page.waitForFunction(() => window.CPS);
  ok('BREAKDOWN role offered', /CYRUS · LAST BUS/.test(await page.textContent('[data-a="frombd"]')));

  // ---------- 1. capture: start from the BREAKDOWN role, record the voice with the mic
  await page.click('[data-a="frombd"]');
  ok('from BREAKDOWN: name + project filled, linked', await page.inputValue('#c_name') === 'CYRUS' && await page.inputValue('#c_proj') === 'LAST BUS' && /Linked to BREAKDOWN/.test(await page.textContent('main')));
  ok('new character starts as Found', /Found/.test(await page.textContent('#statebox')));
  await record(page, '[data-a="recstart"][data-k="voice"]', 13.5);
  const t1 = await page.evaluate(() => window.CPS.S.lib.chars[0].takes[0]);
  console.log('INFO mic take', JSON.stringify(t1.an), t1.type);
  ok('mic take: pitch read (then.wav ~80 Hz, ±8%)', t1.an.pitchHz && Math.abs(t1.an.pitchHz - 80.4) / 80.4 < 0.08, t1.an);
  ok('mic take: time to say it close to the file (12.3 s ±8%)', Math.abs(t1.an.spanSec - 12.29) / 12.29 < 0.08, t1.an.spanSec);
  ok('mic take: shown with a plain readout', /Pitch [A-G]#?\d \(\d+ Hz\)/.test(await page.textContent('.take .rd')));
  ok('voice only: still Found', /Found/.test(await page.textContent('#statebox')));
  await page.fill('#c_line', 'Insurance. You think I need you?');
  ok('voice + line: Kept, updated live', /Kept/.test(await page.textContent('#statebox')));
  await page.fill('#c_notes', 'Low in the chest. Never looks at who he threatens.');
  await page.setInputFiles('#photoin', path.join(AU, 'look.jpg'));
  await page.waitForSelector('.looks img');
  // sketch
  await page.click('[data-a="sketch"]'); await page.waitForSelector('.sheet.on #pad'); await page.waitForTimeout(400);
  const bb = await page.locator('#pad').boundingBox();
  await page.mouse.move(bb.x + 40, bb.y + 40); await page.mouse.down(); await page.mouse.move(bb.x + 200, bb.y + 160, { steps: 8 }); await page.mouse.up();
  await page.screenshot({ path: shots('c03_sketch.png') });
  console.log("INFO strokes", await page.evaluate(() => window.CPS.S.pad && window.CPS.S.pad.strokes.length), errors); await page.click('[data-a="padsave"]'); await page.waitForFunction(() => window.CPS.S.lib.chars[0].looks.length === 2);
  ok('photo + sketch kept as looks', (await page.$$('.looks .lk')).length === 2);
  ok('nothing missing now', (await page.evaluate(() => window.CPS.E.missing(window.CPS.S.lib.chars[0]))).length === 0);
  await page.screenshot({ path: shots('c02_capture.png'), fullPage: true });
  a = await tapAudit(page); ok('capture: taps + no overflow', !a.bad.length && a.overflow <= 0, a);
  // a voice memo upload (webm) as a second take
  { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-a="memo"][data-k="voice"]')]); await fc.setFiles(path.join(AU, 'now_fast_high.webm')); }
  await page.waitForFunction(() => window.CPS.S.lib.chars[0].takes.length === 2 && !window.CPS.S.busy, null, { timeout: 20000 });
  const t2 = await page.evaluate(() => window.CPS.S.lib.chars[0].takes[1].an);
  ok('webm memo upload measured (~114 Hz ±6%)', t2.pitchHz && Math.abs(t2.pitchHz - 114.4) / 114.4 < 0.06, t2);
  ok('reference is still the first voice take', await page.evaluate(() => window.CPS.E.reference(window.CPS.S.lib.chars[0]).id === window.CPS.S.lib.chars[0].takes[0].id));
  // remove it again
  await page.click('.take:nth-of-type(2) [data-a="deltake"]').catch(async () => { const ids = await page.$$('[data-a="deltake"]'); await ids[1].click(); });
  await page.waitForFunction(() => window.CPS.S.lib.chars[0].takes.length === 1);
  ok('delete a take', true);
  await page.waitForTimeout(500);
  await ctx.close();

  // ---------- 2. come back with a different voice (higher, faster): new browser session, same storage
  ({ ctx, page } = await launch('now_fast_high.wav'));
  await page.goto(BASE + '/cps/index.html'); await page.waitForFunction(() => window.CPS);
  ok('library survived the restart', await page.evaluate(() => window.CPS.S.lib.chars.length === 1 && window.CPS.S.lib.chars[0].looks.length === 2));
  await page.screenshot({ path: shots('c04_list.png'), fullPage: true });
  await page.click('[data-a="open"]');
  ok('kept character opens on COME BACK', await page.evaluate(() => window.CPS.S.tab === 'back'));
  ok('come back shows look, reference audio, the line', !!(await page.$('.hero-look')) && !!(await page.$('#refaudio')) && /Insurance/.test(await page.textContent('.big')));
  const refDur = await page.evaluate(() => new Promise(r => { const a = document.getElementById('refaudio'); const go = () => { if (isFinite(a.duration) && a.duration > 0) return r(a.duration); a.addEventListener('durationchange', () => { if (isFinite(a.duration)) r(a.duration); }); a.currentTime = 1e9; }; if (a.readyState >= 1) go(); else a.addEventListener('loadedmetadata', go, { once: true }); setTimeout(() => r(-1), 6000); }));
  ok('reference recording plays back (has a duration)', refDur > 10, refDur);
  await record(page, '[data-a="recstart"][data-k="return"]', 8); await page.waitForSelector('#said');
  console.log('INFO takes', JSON.stringify(await page.evaluate(() => ({ tab: window.CPS.S.tab, last: window.CPS.S.lastReturn, takes: window.CPS.S.lib.chars[0].takes.map(t => [t.id, t.kind, t.refId, t.an && t.an.pitchHz]) }))), errors);
  let s = await said(page); console.log('INFO said', JSON.stringify(s));
  ok('compare: higher', s.some(x => /Pitch: [\d.]+ semitones higher/.test(x)), s);
  ok('compare: quicker', s.some(x => /quicker/.test(x)), s);
  ok('compare: fewer pauses', s.some(x => /Pauses: fewer/.test(x)), s);
  ok('no score anywhere', !/score|\d+\s*\/\s*100|%\s*match/i.test(await page.textContent('#result')));
  await page.screenshot({ path: shots('c05_compare.png'), fullPage: true });
  a = await tapAudit(page); ok('come back: taps + no overflow', !a.bad.length && a.overflow <= 0, a);
  // m4a: phones decode AAC; this test Chromium has no AAC, so this checks the plain-words failure path
  const aac = await page.evaluate(() => document.createElement('audio').canPlayType('audio/mp4; codecs="mp4a.40.2"'));
  const up = async (sel, f) => { const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click(sel)]); await fc.setFiles(f); };
  await up('[data-a="memo"][data-k="return"]', path.join(AU, 'now_slow.m4a'));
  if (!aac) { await page.waitForSelector('.toast'); ok('m4a without AAC: says it couldn\'t read it, keeps nothing broken', /Couldn't read the sound/.test(await page.textContent('.toast')) && await page.evaluate(() => window.CPS.S.lib.chars[0].takes.length === 2)); }
  else { await page.waitForFunction(() => window.CPS.S.lib.chars[0].takes.length === 3 && !window.CPS.S.busy, null, { timeout: 20000 }); ok('m4a measured', true); }
  // slower (opus upload of the slow read)
  const nT = await page.evaluate(() => window.CPS.S.lib.chars[0].takes.length);
  await up('[data-a="memo"][data-k="return"]', path.join(AU, 'now_slow.webm'));
  await page.waitForFunction(n => window.CPS.S.lib.chars[0].takes.length === n + 1 && !window.CPS.S.busy, nT, { timeout: 20000 });
  await page.waitForSelector('#said');
  s = await said(page); console.log('INFO said slow', JSON.stringify(s));
  ok('slow read: slower, more pauses, pitch about the same', s.some(x => /slower/.test(x)) && s.some(x => /Pauses: more/.test(x)) && s.some(x => /Pitch: about the same/.test(x)), s);
  ok('earlier come-back listed', (await page.$$('.kicker')).length > 0 && /Earlier come-backs/.test(await page.textContent('main')));
  await page.click('#result [data-a="setstate"][data-v="inuse"]');
  ok('marked Back in use', await page.evaluate(() => window.CPS.E.autoState(window.CPS.S.lib.chars[0]) === 'inuse'));
  await page.click('#result [data-a="setref"]');
  ok('new reference set from a come-back take', await page.evaluate(() => { const c = window.CPS.S.lib.chars[0]; return window.CPS.E.reference(c).kind === 'return'; }));

  // ---------- 3. pack: save, delete, open
  await page.click('[data-a="tab"][data-t="pack"]');
  await page.screenshot({ path: shots('c06_pack.png'), fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="packone"]')]);
  const zp = path.join(OUT, 'pack.zip'); await dl.saveAs(zp);
  const z = E.readZip(new Uint8Array(fs.readFileSync(zp)));
  const names = Object.keys(z); console.log('INFO pack', names.join(', '));
  const cap = JSON.parse(E.dec(z['cyrus/capsule.json']));
  ok('pack: capsule + takes + 2 looks, CRC checked', cap.character.name === 'CYRUS' && names.filter(n => /media\//.test(n)).length === cap.character.takes.length + 2, names);
  ok('pack: file named for the character', dl.suggestedFilename() === 'cps_cyrus.zip', dl.suggestedFilename());
  await page.click('[data-a="delchar"]');
  ok('deleted', await page.evaluate(() => window.CPS.S.lib.chars.length === 0));
  await page.click('[data-a="tab"][data-t="pack"]');
  await page.setInputFiles('#zipin', zp);
  await page.waitForFunction(() => window.CPS.S.lib.chars.length === 1);
  await page.click('[data-a="open"]');
  const back = await page.evaluate(() => { const c = window.CPS.S.lib.chars[0]; return { takes: c.takes.length, looks: c.looks.length, urls: [...c.takes, ...c.looks].every(m => !!window.CPS.S.urls[m.id]), state: window.CPS.E.autoState(c), line: c.anchorLine }; });
  ok('pack opened: everything back, recordings playable', back.takes >= 3 && back.looks === 2 && back.urls && back.state === 'inuse' && /Insurance/.test(back.line), back);
  const bad = new Uint8Array(fs.readFileSync(zp)); bad[200] ^= 0xff; const bp = path.join(OUT, 'bad.zip'); fs.writeFileSync(bp, bad);
  await page.click('[data-a="tab"][data-t="pack"]');
  await page.setInputFiles('#zipin', bp);
  ok('damaged pack refused with a reason', !!(await page.waitForSelector('.toast:has-text("Damaged")', { timeout: 5000 }).catch(() => null)));

  // ---------- 4. offline + small screen + desktop + light
  await page.goto(BASE + '/cps/index.html'); await page.waitForTimeout(1500);
  await ctx.setOffline(true); await page.reload(); await page.waitForFunction(() => window.CPS, null, { timeout: 8000 }).catch(() => { });
  ok('opens offline', await page.evaluate(() => !!window.CPS));
  await ctx.setOffline(false);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.click('[data-a="open"]'); await page.click('[data-a="tab"][data-t="capture"]');
  a = await tapAudit(page); ok('320px capture: no overflow', a.overflow <= 0, a);
  await page.screenshot({ path: shots('c07_320.png'), fullPage: true });
  await page.click('[data-a="tab"][data-t="back"]');
  a = await tapAudit(page); ok('320px come back: no overflow', a.overflow <= 0, a);
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.click('[data-a="theme"]'); await page.screenshot({ path: shots('c08_desktop_theme.png') });
  ok('no page errors', !errors.length, errors);
  await ctx.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
