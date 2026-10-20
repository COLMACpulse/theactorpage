/* PUT IT ONLINE, end to end: the real Project Hub publishes the made-up actor's page to the host (server/worker.js
   running in Miniflare on :8787), the page opens from the host with its headshot and video, an update shows, it comes
   down, and a new phone takes over with the backup code. Made-up names and files only.
   Site on :8811.  NODE_PATH=<playwright + miniflare> node server/tests/online_e2e.js */
const { chromium } = require('playwright'); const { Miniflare } = require('miniflare'); const fs = require('fs'), path = require('path');
const FX = path.join(__dirname, '..', '..', 'shared', 'fixtures');
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 400))); if (!x) ok = false; };
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'], port: 8787,
    bindings: { ORIGINS: 'http://localhost:8811', MAX_FILE_MB: '95', MAX_SITE_MB: '100' } });
  await mf.ready;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const mk = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.addInitScript(() => { try { localStorage.setItem('tap_api', 'http://localhost:8787'); } catch (e) { } }); return c; };
  const c = await mk(), p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8811/hub/'); await p.evaluate(() => { const k = localStorage.getItem('tap_api'); localStorage.clear(); localStorage.setItem('tap_api', k); }); await p.reload(); await p.waitForTimeout(1500);
  const face = fs.readFileSync(path.join(FX, 'made_up_face.jpg')).toString('base64'), clip = fs.readFileSync(path.join(FX, 'made_up_clip.mp4')).toString('base64');
  await p.evaluate(async ([face, clip]) => { const bl = (b64, t) => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new Blob([u], { type: t }); };
    const add = async (cat, name, blob) => { const rec = { id: 'a' + Math.random().toString(36).slice(2, 9), scope: 'library', category: cat, label: name, filename: name + '.' + blob.type.split('/')[1], type: blob.type, size: blob.size, added: new Date().toISOString(), blob }; await DB.put(rec); ARTS.push(rec); return rec; };
    const h = await add('headshot', 'Riley Hart', bl(face, 'image/jpeg')); profile.primaryHeadshot = h.id; await add('clip', 'The diner scene', bl(clip, 'video/mp4')); pkgSel.headshot = null; go('package');
    pkgInit(); pkgSel.clips = ARTS.filter(a => a.category === 'clip').map(a => a.id); render(); }, [face, clip]);
  await p.$eval('#online', e => e.scrollIntoView()); await p.waitForTimeout(900);
  let t = await p.innerText('#online');
  want('PUT IT ONLINE: says it goes on the internet, and only this page, only when you tap', /PUT IT ONLINE/i.test(t) && /Anyone with the link can see it/.test(t) && /only when you tap/.test(t));
  want('your name, made into an address, and it checks it\'s free', (await p.inputValue('#onname')) === 'riley-hart' && /riley-hart\.theactorpage\.com is free/.test(await p.innerText('#onwhy')), [await p.inputValue('#onname'), await p.innerText('#onwhy')]);
  await p.fill('#onname', 'API'); await p.waitForTimeout(700); want('a name that can\'t be had: says why, PUBLISH waits', /taken/.test(await p.innerText('#onwhy')) && await p.$eval('#onpub', x => x.disabled));
  await p.fill('#onname', 'Riley Hart!'); await p.waitForTimeout(700); want('spaces and marks become dashes as you type', /riley-hart\.theactorpage\.com is free/.test(await p.innerText('#onwhy')));
  await p.click('#onpub'); await p.waitForFunction(() => /LIVE/.test((document.getElementById('online') || {}).innerText || ''), null, { timeout: 30000 }).catch(() => { });
  t = await p.innerText('#online'); const o = await p.evaluate(() => JSON.parse(localStorage.getItem('hub_online_v1')));
  want('PUBLISH: LIVE, with the address and when', /LIVE/.test(t) && /updated/.test(t) && o.url === 'http://localhost:8787/s/riley-hart/', t.slice(0, 300));
  want('the backup code shows, to save off this phone', /Save it somewhere that isn't this phone/.test(t) && o.backup && t.includes(o.backup));
  const q = await c.newPage(); await q.goto(o.url); await q.waitForTimeout(800);
  want('the page, from the host: name, headshot, the clip', /RILEY HART/.test(await q.innerText('body')) && (await q.$eval('img.hs', i => i.naturalWidth)) > 100 && (await q.$$eval('video', v => v.length)) >= 1);
  const vsrc = await q.$eval('video', v => v.currentSrc || v.src); const vr = await (async u => { const r = await fetch(u, { headers: { range: 'bytes=0-99' } }); return [r.status, (await r.arrayBuffer()).byteLength]; })(vsrc);
  want('its video streams from the host (byte ranges)', vr[0] === 206 && vr[1] === 100, vr);
  const csp = (await fetch(o.url)).headers.get('content-security-policy'); want('served locked down (no scripts)', /default-src 'none'/.test(csp || ''));
  // update
  await p.evaluate(() => { pkgSel.note = 'Closest to the role is the diner scene.'; render(); }); await p.waitForTimeout(300);
  await p.$eval('#online', e => e.scrollIntoView()); await p.click('#online button.act'); await p.waitForTimeout(2500);
  await q.reload(); await q.waitForTimeout(500); want('UPDATE: the live page matches', /Closest to the role is the diner scene/.test(await q.innerText('body')));
  // a new phone, with the backup code
  const c2 = await mk(), p2 = await c2.newPage(); p2.on('pageerror', e => errs.push(e.message)); p2.on('dialog', d => d.accept());
  await p2.goto('http://localhost:8811/hub/?tab=package#online'); await p2.waitForTimeout(1800);
  await p2.click('#online button:has-text("I already have a page")'); await p2.fill('#recname', 'riley-hart'); await p2.fill('#reccode', 'wrong-code'); await p2.click('#online button:has-text("Use it")'); await p2.waitForTimeout(700);
  want('a new phone, wrong code: says so', /doesn't match/.test(await p2.innerText('#online')));
  await p2.fill('#reccode', o.backup); await p2.click('#online button:has-text("Use it")'); await p2.waitForTimeout(900);
  want('the backup code: this phone can update the page now', /LIVE/.test(await p2.innerText('#online')) && !!(await p2.evaluate(() => JSON.parse(localStorage.getItem('hub_online_v1')).key)));
  await p.evaluate(() => { ON.err = ''; render(); }); await p.$eval('#online', e => e.scrollIntoView()); await p.click('#online button.act'); await p.waitForTimeout(1500);
  want('and the first phone\'s key stops working, in plain words', /doesn't open this page/.test(await p.innerText('#online')), await p.innerText('#online'));
  // take it down from the new phone
  await p2.click('#online button:has-text("Take it down")'); await p2.waitForTimeout(1200);
  want('TAKE IT DOWN: not up, the address still yours', /Not up right now/.test(await p2.innerText('#online')));
  await q.reload(); await q.waitForTimeout(400); want('the page is gone from the internet', /isn't up right now/.test(await q.innerText('body')));
  // no host to reach: plain words
  await p2.evaluate(() => { localStorage.setItem('tap_api', 'http://localhost:9'); }); await p2.click('#online button.act'); await p2.waitForTimeout(1500);
  want('host not reachable: says so plainly', /can't be reached right now/.test(await p2.innerText('#online')));
  want('no page errors', !errs.length, errs);
  await b.close(); await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
