/* THE HOST, run locally in Miniflare (Cloudflare's own Worker runtime) with a throwaway R2 bucket.
   Claim a name, publish a page with a video, see it served (with byte ranges, and nothing that can run), update it
   (old files go), wrong key refused, limits, a recovery code, take it down. Made-up names only.
   cd server && npm i && node tests/host_tests.js   (or NODE_PATH pointing at a miniflare install) */
const { Miniflare } = require('miniflare'); const fs = require('fs'), path = require('path');
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 300))); if (!x) ok = false; };
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'],
    bindings: { ZONE: 'theactorpage.test', HOME_URL: 'https://colmacpulse.github.io/theactorpage/', ORIGINS: 'https://colmacpulse.github.io', MAX_FILE_MB: '2', MAX_SITE_MB: '3' } });
  const A = 'https://api.theactorpage.test', site = n => 'https://' + n + '.theactorpage.test';
  const F = (u, o) => mf.dispatchFetch(u, o);
  const J = async (u, o) => { const r = await F(u, o); let b = null; try { b = await r.json(); } catch (e) { } return { s: r.status, b, h: r.headers }; };
  const post = (u, b, k) => J(u, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, k ? { authorization: 'Bearer ' + k } : {}), body: JSON.stringify(b || {}) });
  const put = (u, body, k) => J(u, { method: 'PUT', headers: { authorization: 'Bearer ' + k }, body });

  // names
  let r = await J(A + '/api/names/riley-hart'); want('a free name says so', r.s === 200 && r.b.free === true);
  for (const [n, w] of [['ab', 'At least 3'], ['Riley_Hart', 'Letters, numbers'], ['-riley', 'dash'], ['www', 'taken'], ['api', 'taken']]) {
    r = await J(A + '/api/names/' + n); want('name "' + n + '": no, in plain words', r.b.free === false && r.b.why.includes(w), r.b); }
  // claim
  r = await post(A + '/api/claim', { name: 'riley-hart' }); const key = r.b && r.b.key, backup = r.b && r.b.backup;
  want('claim: a key, a backup code, the address', r.s === 200 && key.length > 30 && backup.length > 15 && r.b.url === 'https://riley-hart.theactorpage.test/', r.b);
  r = await post(A + '/api/claim', { name: 'riley-hart' }); want('the same name twice: taken', r.s === 409);
  r = await J(A + '/api/names/riley-hart'); want('and now it shows as taken', r.b.free === false);
  let pg = await F(site('riley-hart') + '/'); want('claimed, nothing published: "isn\'t up right now"', pg.status === 404 && /isn't up right now/.test(await pg.text()));
  // publish
  r = await post(A + '/api/sites/riley-hart/begin', {}, key); const v1 = r.b.ver; want('begin: a version', r.s === 200 && v1.length >= 6);
  const html = '<!doctype html><title>Riley Hart</title><h1>RILEY HART</h1><video src="media/reel.mp4"></video>';
  const vid = new Uint8Array(300000).map((_, i) => i % 251);
  r = await put(A + '/api/sites/riley-hart/files/index.html?v=' + v1, html, key); want('a file in', r.s === 200 && r.b.size === html.length);
  r = await put(A + '/api/sites/riley-hart/files/media/reel.mp4?v=' + v1, vid, key);
  r = await put(A + '/api/sites/riley-hart/files/share.jpg?v=' + v1, new Uint8Array([255, 216, 255, 0]), key);
  r = await put(A + '/api/sites/riley-hart/files/evil.js?v=' + v1, 'alert(1)', key); want('a script file: refused', r.s === 400 && /not a page, image/.test(r.b.why));
  r = await put(A + '/api/sites/riley-hart/files/..%2Fother%2Findex.html?v=' + v1, 'x', key); want('a path out of the page: refused', r.s === 400);
  r = await put(A + '/api/sites/riley-hart/files/index.html?v=' + v1, 'x', 'wrong-key'); want('the wrong key: refused', r.s === 403);
  r = await post(A + '/api/sites/riley-hart/commit', { ver: v1, files: ['index.html', 'media/reel.mp4', 'share.jpg'] }, key);
  want('commit: live, at its address', r.s === 200 && r.b.url === 'https://riley-hart.theactorpage.test/' && r.b.files === 3, r.b);
  pg = await F(site('riley-hart') + '/');
  const csp = pg.headers.get('content-security-policy') || '';
  want('the page is up', pg.status === 200 && /RILEY HART/.test(await pg.text()) && /text\/html/.test(pg.headers.get('content-type')));
  want('and it can\'t run scripts, send forms, or be framed', /default-src 'none'/.test(csp) && !/script-src/.test(csp) && /form-action 'none'/.test(csp) && /frame-ancestors 'none'/.test(csp) && pg.headers.get('x-content-type-options') === 'nosniff');
  want('YouTube and Vimeo players are allowed in', /youtube-nocookie\.com/.test(csp) && /player\.vimeo\.com/.test(csp));
  pg = await F(site('riley-hart') + '/media/reel.mp4', { headers: { range: 'bytes=1000-1999' } }); const part = new Uint8Array(await pg.arrayBuffer());
  want('video plays from the middle: byte ranges', pg.status === 206 && part.length === 1000 && part[0] === 1000 % 251 && pg.headers.get('content-range') === 'bytes 1000-1999/300000');
  pg = await F(site('riley-hart') + '/media/reel.mp4', { headers: { range: 'bytes=-500' } }); want('and from the end', pg.status === 206 && (await pg.arrayBuffer()).byteLength === 500);
  pg = await F(site('riley-hart') + '/media/reel.mp4'); want('whole video, typed as video', pg.status === 200 && pg.headers.get('content-type') === 'video/mp4' && +pg.headers.get('content-length') === 300000);
  pg = await F('https://anything.example/s/riley-hart/'); want('also at /s/<name>/ on any host (for testing)', pg.status === 200);
  // update: the old files go
  r = await post(A + '/api/sites/riley-hart/begin', {}, key); const v2 = r.b.ver;
  await put(A + '/api/sites/riley-hart/files/index.html?v=' + v2, '<!doctype html><h1>RILEY HART, updated</h1>', key);
  r = await post(A + '/api/sites/riley-hart/commit', { ver: v2, files: ['index.html'] }, key); want('update: live', r.s === 200);
  pg = await F(site('riley-hart') + '/'); want('the page shows the new version', /updated/.test(await pg.text()));
  pg = await F(site('riley-hart') + '/media/reel.mp4'); want('a file that\'s no longer in the page is gone', pg.status === 404);
  const left = (await (await mf.getR2Bucket('SITES')).list({ prefix: 'sites/riley-hart/v/' })).objects.map(o => o.key);
  want('storage keeps only the live version', left.length === 1 && left[0].includes(v2), left);
  // commit with a missing file, or no index
  r = await post(A + '/api/sites/riley-hart/begin', {}, key); const v3 = r.b.ver;
  r = await post(A + '/api/sites/riley-hart/commit', { ver: v3, files: ['index.html'] }, key); want('commit with a file never sent: refused, page unchanged', r.s === 409 && /updated/.test(await (await F(site('riley-hart') + '/')).text()));
  r = await post(A + '/api/sites/riley-hart/commit', { ver: v3, files: ['share.jpg'] }, key); want('a page needs its index.html', r.s === 400);
  // limits (test limits: 2 MB a file, 3 MB a page)
  r = await put(A + '/api/sites/riley-hart/files/media/big.mp4?v=' + v3, new Uint8Array(2.5 * 1048576), key); want('a file over the limit: refused, says YouTube or Vimeo', r.s === 413 && /YouTube or Vimeo/.test(r.b.why));
  await put(A + '/api/sites/riley-hart/files/index.html?v=' + v3, 'x', key);
  for (const n of ['a', 'b']) await put(A + '/api/sites/riley-hart/files/media/' + n + '.mp4?v=' + v3, new Uint8Array(1.8 * 1048576), key);
  r = await post(A + '/api/sites/riley-hart/commit', { ver: v3, files: ['index.html', 'media/a.mp4', 'media/b.mp4'] }, key);
  want('a page over the limit: refused, the live page stays', r.s === 413 && /limit is 3 MB/.test(r.b.why) && /updated/.test(await (await F(site('riley-hart') + '/')).text()), r.b);
  // recovery
  r = await post(A + '/api/recover', { name: 'riley-hart', backup: 'nope' }); want('a wrong backup code: refused', r.s === 403);
  r = await post(A + '/api/recover', { name: 'riley-hart', backup }); const key2 = r.b && r.b.key; want('the backup code: a new key', r.s === 200 && key2 && key2 !== key);
  r = await post(A + '/api/sites/riley-hart/begin', {}, key); want('the old key keeps working: it is another computer signed in (Oct 31)', r.s === 200);
  // CORS
  let o = await F(A + '/api/claim', { method: 'OPTIONS', headers: { origin: 'https://colmacpulse.github.io', 'access-control-request-method': 'POST' } });
  want('the site may call the API from a browser', o.status === 204 && o.headers.get('access-control-allow-origin') === 'https://colmacpulse.github.io');
  o = await F(A + '/api/names/zzz-test', { headers: { origin: 'https://evil.example' } }); want('another site may not', !o.headers.get('access-control-allow-origin'));
  // take it down
  r = await J(A + '/api/sites/riley-hart', { method: 'DELETE', headers: { authorization: 'Bearer ' + key2 } }); want('take it down', r.s === 200 && r.b.down);
  pg = await F(site('riley-hart') + '/'); want('down: "isn\'t up right now"', pg.status === 404 && /isn't up/.test(await pg.text()));
  r = await J(A + '/api/names/riley-hart'); want('the name stays yours', r.b.free === false);
  const all = (await (await mf.getR2Bucket('SITES')).list({ prefix: 'sites/riley-hart/v/' })).objects.length; want('no files left in storage', all === 0);
  pg = await F(site('no-such-page') + '/'); want('a name nobody has: "isn\'t up right now"', pg.status === 404);
  pg = await F('https://www.theactorpage.test/', { redirect: 'manual' }); want('www goes to the site', pg.status === 301);
  pg = await F('https://api.theactorpage.test/'); want('the API host is only the API', pg.status === 404);
  await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
