/* A LIVE PAGE'S CLIPS, WITH THE HOST'S LOCKDOWN (Col, Oct 31: "the individual clips dont function, just the first one").
   Pages served from the host run no scripts but one: the clip player. Its fingerprint in server/worker.js matches
   hub/index.html's PAGE_JS; a made-up site (Riley Hart) with Harbor Lights given 5 clips is published to the host
   (Miniflare on :8787) by the real Hub; on the live page CLIP 2 to CLIP 5 each play, and a clip stops when you switch or
   close. Any other script on a page still can't run. Computer light. Site on :8811. NODE_PATH=<playwright + miniflare> */
const { chromium } = require('playwright'); const { Miniflare } = require('miniflare'); const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execSync } = require('child_process');
const R = path.join(__dirname, '..', '..'), SRC = path.join(R, 'shared', 'fixtures', 'site_sample');
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 400))); if (!x) ok = false; };
  /* the fingerprint matches */
  const hub = fs.readFileSync(path.join(R, 'hub', 'index.html'), 'utf8'), js = (hub.match(/const PAGE_JS="([^"]*)";/) || [])[1], wk = fs.readFileSync(path.join(R, 'server', 'worker.js'), 'utf8');
  const sha = 'sha256-' + crypto.createHash('sha256').update(js || '').digest('base64');
  want('the host allows exactly the page\'s one script (fingerprints match)', !!js && wk.includes("const PAGE_JS_SHA = '" + sha + "'"), sha);
  /* a made-up site with 5 clips on one credit */
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'pjs-')), SITE = path.join(T, 'riley-site-main'), Z = path.join(T, 'riley-site-main.zip');
  execSync(`cp -r "${SRC}" "${SITE}"`);
  for (let i = 1; i <= 5; i++) fs.copyFileSync(path.join(SRC, i % 2 ? 'media/clip-night.webm' : 'media/reel.webm'), path.join(SITE, 'media', 'harbor' + i + '.webm'));
  const ix = path.join(SITE, 'index.html'); fs.writeFileSync(ix, fs.readFileSync(ix, 'utf8').replace('"clips":[{"src":"media/clip-harbor.webm","t":""}]', '"clips":[' + [1, 2, 3, 4, 5].map(i => '{"src":"media/harbor' + i + '.webm","t":""}').join(',') + ']'));
  execSync(`cd "${T}" && python3 -I -c "import zipfile,os
z=zipfile.ZipFile('${Z}','w',zipfile.ZIP_DEFLATED)
for r,d,f in os.walk('riley-site-main'):
  for x in f: z.write(os.path.join(r,x))
z.close()"`);
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'], port: 8787, bindings: { ORIGINS: 'http://localhost:8811', MAX_FILE_MB: '95', MAX_SITE_MB: '400' } }); await mf.ready;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8811/hub/?tab=intake'); await p.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('colmac_hub'); localStorage.setItem('tap_api', 'http://localhost:8787'); }); await p.reload(); await p.waitForTimeout(1500);
  await p.setInputFiles('#sizip', Z); await p.waitForFunction(() => window.__siteIn.plan, null, { timeout: 10000 }).catch(() => { });
  await p.click('#sigo'); await p.waitForFunction(() => !window.__siteIn.busy && window.__siteIn.report, null, { timeout: 30000 }).catch(() => { });
  await p.goto('http://localhost:8811/hub/?tab=package'); await p.waitForTimeout(2000);
  await p.$eval('#online', e => e.scrollIntoView()); await p.fill('#onname', 'riley-hart'); await p.waitForTimeout(700);
  await p.click('#onpub'); await p.waitForFunction(() => /LIVE/.test((document.getElementById('online') || {}).innerText || ''), null, { timeout: 60000 }).catch(() => { });
  const url = await p.evaluate(() => JSON.parse(localStorage.getItem('hub_online_v1')).url);
  want('published to the host', /\/s\/riley-hart\//.test(url || ''), url);
  /* the live page */
  const q = await c.newPage(); const qe = [], blocked = []; q.on('pageerror', e => qe.push(e.message)); q.on('console', m => { if (/Content Security Policy/.test(m.text())) blocked.push(m.text()); });
  await q.goto(url); await q.waitForTimeout(800);
  await q.click('a.wpo[aria-label^="Play Harbor Lights"]'); await q.waitForTimeout(400);
  const shown = () => q.evaluate(() => { const x = document.querySelector('.lbx:target'); const v = [...x.querySelectorAll('video')].filter(v => getComputedStyle(v).display !== 'none'); return v.map(v => v.dataset.i).join(); });
  want('the live page: Harbor Lights opens on CLIP 1', (await shown()) === '0');
  const seen = []; for (let i = 1; i < 5; i++) { await q.click('.lbx:target .lbt[data-i="' + i + '"]'); await q.waitForTimeout(150); seen.push(await shown()); }
  want('CLIP 2 to CLIP 5 each play on the live page, with the host\'s lockdown', seen.join('|') === '1|2|3|4', seen);
  await q.evaluate(() => { const v = document.querySelector('.lbx:target .lbv.on'); v.muted = true; return v.play().catch(() => { }); }); await q.waitForTimeout(300);
  await q.click('.lbx:target .lbt[data-i="0"]'); await q.waitForTimeout(200);
  want('switching clips stops the one that was playing', await q.evaluate(() => document.querySelector('.lbx:target .lbv[data-i="4"]').paused));
  await q.click('.lbx:target .lbt[data-i="2"]'); await q.evaluate(() => { const v = document.querySelector('.lbx:target .lbv.on'); v.muted = true; return v.play().catch(() => { }); }); await q.waitForTimeout(300);
  await q.click('.lbx:target .lbclose'); await q.waitForTimeout(300);
  want('closing the window stops the clip', await q.evaluate(() => [...document.querySelectorAll('.lbx video')].every(v => v.paused)));
  want('no script was blocked, no errors', !blocked.length && !qe.length, { blocked, qe });
  /* anything else still can't run */
  const csp = (await fetch(url)).headers.get('content-security-policy');
  want('the lockdown is still on: only that one script, by its fingerprint', /script-src 'sha256-[A-Za-z0-9+/=]+'/.test(csp) && !/unsafe-inline'[^;]*script|script-src[^;]*unsafe/.test(csp) && /default-src 'none'/.test(csp), csp);
  await b.close(); await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
