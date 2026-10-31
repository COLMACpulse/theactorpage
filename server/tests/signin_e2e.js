/* SIGN IN THAT BRINGS EVERYTHING BACK, end to end (Col, Oct 31: "Everything"). Computer A: a made-up actor (Sam Actor)
   sets up (résumé, a headshot, a credit in the Hub with a 12 MB take), claims an address, turns on KEEP MY STUDIO ONLINE
   on the studio: it goes up, the big take in parts. A second time only what changed goes up. Computer B (a fresh
   browser): theactorpage.com shows Sign in; the address and backup code bring the studio down: name, headshot, résumé,
   the credit and its take, the page's address; computer A's key still works. A wrong code says so. Computer B with its
   own version of something asks which to keep. The host is server/worker.js in Miniflare on :8787, 5 MB parts.
   Computer light, phone-size dark for the sign-in screen. Site on :8811. NODE_PATH=<playwright + miniflare> */
const { chromium } = require('playwright'); const { Miniflare } = require('miniflare'); const path = require('path');
const R = path.join(__dirname, '..', '..'), FX = path.join(R, 'shared', 'fixtures'), SP = '/tmp/claude-0/-home-claude/b044be45-0714-5692-a76e-6c70c8ea6844/scratchpad';
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 500))); if (!x) ok = false; };
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'], port: 8787, bindings: { ORIGINS: 'http://localhost:8811', LIB_MB: '5120', PART_MB: '5' } });
  await mf.ready;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const api = () => localStorage.setItem('tap_api', 'http://localhost:8787');
  /* ---------- computer A ---------- */
  const ca = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ca.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8811/'); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.evaluate(api); await p.reload(); await p.waitForTimeout(1000);
  await p.setInputFiles('#stRes', path.join(FX, 'sam_actor_resume.txt')); await p.waitForTimeout(1200);
  await p.setInputFiles('#stShot', path.join(FX, 'made_up_face.jpg')); await p.waitForTimeout(2800);
  /* a credit with a 12 MB take, in the Hub's own store */
  await p.goto('http://localhost:8811/hub/'); await p.waitForTimeout(1500);
  await p.evaluate(async () => { credits.push({ cid: 'c1', title: 'Low Tide', character: 'Wes', role: 'Lead', kind: 'credit', state: 'archived' }); saveCredits();
    const big = new Blob([new Uint8Array(12 * 1048576).map((_, i) => (i * 13) % 251)], { type: 'video/webm' });
    const rec = { id: 'take1', scope: 'credit:c1', category: 'clip', label: 'Low Tide take', filename: 'lowtide.webm', type: 'video/webm', size: big.size, added: new Date().toISOString(), blob: big }; await DB.put(rec); ARTS.push(rec); });
  const claim = await p.evaluate(async () => { const r = await fetch('http://localhost:8787/api/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'sam-actor' }) }); const b = await r.json();
    localStorage.setItem('hub_online_v1', JSON.stringify({ name: b.name, key: b.key, backup: b.backup, url: b.url, live: true })); return b; });
  await p.goto('http://localhost:8811/'); await p.waitForTimeout(1500);
  let t = await p.innerText('#keepCard');
  want('A: with an address, the studio offers KEEP MY STUDIO ONLINE and says what it is', /SIGN IN ON ANY COMPUTER/.test(t) && /KEEP MY STUDIO ONLINE/.test(t) && /Private: only you/.test(t), t);
  want('A: nothing goes up until you turn it on', !(await p.evaluate(() => JSON.parse(localStorage.getItem('theactorpage_studiosync_v1') || '{}').at)));
  await p.click('#keepOn');
  await p.waitForFunction(() => { const s = StudioSync.state(); return s.on && !s.busy && s.at; }, null, { timeout: 60000 }).catch(() => { });
  t = await p.innerText('#keepCard');
  want('A: kept online, says when, and how to sign in elsewhere', /YOUR STUDIO IS KEPT ONLINE/.test(t) && /Kept online just now/.test(t) && /theactorpage\.com › Sign in/.test(t), t);
  const up1 = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('hub_online_v1')); const r = await fetch('http://localhost:8787/api/studio/' + a.name, { headers: { authorization: 'Bearer ' + a.key } }); return r.json(); });
  want('A: the take and the headshot are up (12 MB in parts), counted', up1.have.length >= 2 && up1.bytes > 12 * 1048576, up1);
  const man = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('hub_online_v1')); return (await fetch('http://localhost:8787/api/studio/' + a.name + '/manifest', { headers: { authorization: 'Bearer ' + a.key } })).text(); });
  want('A: this computer\'s key and backup code never go up', !man.includes(claim.key) && !man.includes(claim.backup) && /sam-actor/.test(man));
  /* a change: only what's new goes up */
  let puts = 0; p.on('request', r => { if (/\/api\/studio\/.*\/m\//.test(r.url()) && r.method() !== 'GET') puts++; });
  await p.evaluate(() => { You.set('rep', 'Harbor Talent'); localStorage.setItem('theactorpage_characters_v1', JSON.stringify([{ name: 'Wes' }])); });
  const r2 = await p.evaluate(() => StudioSync.backup());
  want('A: a second time, only what changed: no photo or take sent again', puts === 0 && !r2.skipped, { puts, r2 });
  want('A: no errors', !errs.length, errs);

  /* ---------- computer B ---------- */
  const cb = await b.newContext({ viewport: { width: 1280, height: 900 } }); const q = await cb.newPage(); const qe = []; q.on('pageerror', e => qe.push(e.message));
  await q.goto('http://localhost:8811/'); await q.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await q.evaluate(api); await q.reload(); await q.waitForTimeout(1000);
  want('B: a new computer: Sign in, up top and under Start here', !!(await q.$('#topSignIn')) && !!(await q.$('#toSignIn')));
  await q.click('#topSignIn'); await q.waitForTimeout(800);
  await q.fill('#nm', 'sam-actor'); await q.fill('#code', 'not-the-code'); await q.click('#go'); await q.waitForTimeout(1200);
  want('B: a wrong code: says so, nothing changes', /don’t match/.test(await q.innerText('#why')) && !(await q.evaluate(() => localStorage.getItem('hub_online_v1'))));
  await q.fill('#code', claim.backup); await q.click('#go');
  await q.waitForSelector('#toStudio', { timeout: 60000 }).catch(() => { });
  want('B: signed in: You\'re in, OPEN MY STUDIO', /You’re in/.test(await q.innerText('main')) && /Your studio is on this computer now/.test(await q.innerText('main')));
  await q.screenshot({ path: SP + '/signin_done.png' });
  await q.click('#toStudio'); await q.waitForTimeout(2500);
  const B = await q.evaluate(() => ({ name: (document.querySelector('.mename') || {}).textContent, img: !!document.querySelector('.me .mephoto img[src^="blob:"]'), res: !!(You.get().resume), acct: JSON.parse(localStorage.getItem('hub_online_v1') || '{}'), view: document.body.dataset.view, keep: (document.getElementById('keepCard') || {}).innerText }));
  want('B: the studio is here: name, headshot, résumé', B.view === 'studio' && /Sam/.test(B.name) && B.img && B.res, B);
  want('B: the page\'s address came over, with this computer\'s own key; kept online is on here too', B.acct.name === 'sam-actor' && B.acct.live === true && B.acct.key && B.acct.key !== claim.key && /KEPT ONLINE/.test(B.keep), B.acct);
  await q.goto('http://localhost:8811/hub/'); await q.waitForTimeout(1800);
  const hub = await q.evaluate(async () => { const c = credits.find(x => x.title === 'Low Tide'); const a = ARTS.find(x => x.id === 'take1'); return { c: !!c, a: !!a, size: a && a.size }; });
  want('B: the credit and its 12 MB take are in the Hub', hub.c && hub.a && hub.size === 12 * 1048576, hub);
  const stillA = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('hub_online_v1')); return (await fetch('http://localhost:8787/api/studio/' + a.name, { headers: { authorization: 'Bearer ' + a.key } })).status; });
  want('A\'s key still works after B signed in', stillA === 200);
  want('B: no errors', !qe.length, qe);

  /* ---------- computer C: has its own version of something ---------- */
  const cc = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); const r = await cc.newPage();
  await r.goto('http://localhost:8811/signin/'); await r.evaluate(() => { localStorage.clear(); localStorage.setItem('tap_api', 'http://localhost:8787'); localStorage.setItem('theactorpage_characters_v1', JSON.stringify([{ name: 'Someone else' }])); }); await r.reload(); await r.waitForTimeout(600);
  await r.screenshot({ path: SP + '/signin_phone.png' });
  want('C (phone, dark): nothing sideways', await r.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  want('C: nothing extra showing before you sign in (no empty boxes)', await r.evaluate(() => getComputedStyle(document.getElementById('ask')).display === 'none' && getComputedStyle(document.getElementById('busy')).display === 'none'));
  await r.fill('#nm', 'sam-actor'); await r.fill('#code', claim.backup); await r.click('#go');
  await r.waitForSelector('#keepHere', { timeout: 30000 }).catch(() => { });
  want('C: its own version: asks, USE MY ONLINE STUDIO or KEEP THIS COMPUTER\'S', /already has some of your studio/.test(await r.innerText('#ask')));
  await r.click('#keepHere'); await r.waitForSelector('#toStudio', { timeout: 30000 }).catch(() => { });
  want('C: KEEP THIS COMPUTER\'S keeps it, adds the rest', (await r.evaluate(() => localStorage.getItem('theactorpage_characters_v1'))).includes('Someone else') && /kept it/.test(await r.innerText('main')));

  await b.close(); await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
