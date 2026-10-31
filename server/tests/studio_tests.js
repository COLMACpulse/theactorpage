/* YOUR STUDIO, KEPT ONLINE, on the host (Oct 31: SIGN IN brings everything back), in Miniflare with a throwaway bucket.
   The list goes up and comes back; a small file goes up in one go, a bigger one in parts; a file already there isn't sent
   again; another actor's key reads nothing; it counts toward the free amount with the clips; prune drops what the list
   no longer names. Signing in on a second computer gives it a key and the first computer's key keeps working.
   cd server && npm i && node tests/studio_tests.js */
const { Miniflare } = require('miniflare'); const path = require('path'); const crypto = require('crypto');
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 300))); if (!x) ok = false; };
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'],
    bindings: { ZONE: 'theactorpage.test', ORIGINS: 'https://colmacpulse.github.io', LIB_MB: '20', PART_MB: '5', MAX_SITE_MB: '250' } });
  const A = 'https://api.theactorpage.test', F = (u, o) => mf.dispatchFetch(u, o);
  const J = async (u, o) => { const r = await F(u, o); let b = null; try { b = await r.clone().json(); } catch (e) { } return { s: r.status, b, r }; };
  const H = k => ({ authorization: 'Bearer ' + k });
  const MB = 1048576, sha = b => crypto.createHash('sha256').update(b).digest('hex');
  const c = await J(A + '/api/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'riley-hart' }) });
  const key = c.b.key, backup = c.b.backup, other = (await J(A + '/api/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'sam-actor' }) })).b.key;
  const S = A + '/api/studio/riley-hart';

  let r = await J(S, { headers: H(key) }); want('nothing kept yet: empty, says the part size', r.s === 200 && r.b.have.length === 0 && r.b.part === 5 * MB, r.b);
  r = await J(S + '/manifest', { headers: H(key) }); want('no list yet: says so', r.s === 404 && /Nothing kept online yet/.test(r.b.why));
  r = await J(S, { headers: H(other) }); want('another actor\'s key: no', r.s === 403);
  r = await J(S); want('no key: no', r.s === 403);

  const small = new Uint8Array(300 * 1024).map((_, i) => i % 251), hs = sha(small);
  r = await J(S + '/m/' + hs, { method: 'PUT', headers: H(key), body: small }); want('a photo goes up in one go', r.s === 200 && r.b.have);
  r = await J(S + '/m/' + hs, { method: 'PUT', headers: H(key), body: small }); want('already there: not sent again', r.s === 200 && r.b.have);
  const big = new Uint8Array(12 * MB).map((_, i) => (i * 7) % 253), hb = sha(big);
  r = await J(S + '/m/' + hb, { method: 'PUT', headers: H(key), body: big }); want('a big take in one go: send it in parts', r.s === 413 && /in parts/.test(r.b.why));
  r = await J(S + '/m/' + hb + '/start', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, H(key)), body: JSON.stringify({ size: big.length }) });
  want('a big take: start', r.s === 200 && r.b.have === 0 && r.b.part === 5 * MB, r.b);
  r = await J(S + '/m/' + hb + '/part?p=2', { method: 'PUT', headers: H(key), body: big.slice(0, 100) }); want('parts in order', r.s === 409);
  for (let p = 1; p <= 3; p++) r = await J(S + '/m/' + hb + '/part?p=' + p, { method: 'PUT', headers: H(key), body: big.slice((p - 1) * 5 * MB, p * 5 * MB) });
  r = await J(S + '/m/' + hb + '/finish', { method: 'POST', headers: H(key) }); want('all three parts in: kept', r.s === 200 && r.b.have);
  r = await J(S, { headers: H(key) }); want('both kept, the space they take counted', r.b.have.length === 2 && r.b.bytes === small.length + big.length, r.b);
  let g = await F(S + '/m/' + hb, { headers: H(key) }); let got = new Uint8Array(await g.arrayBuffer());
  want('the take comes back byte for byte', g.status === 200 && got.length === big.length && got[777] === big[777] && got[big.length - 1] === big[big.length - 1]);
  g = await F(S + '/m/' + hb, { headers: H(other) }); want('another key can\'t read it', g.status === 403);

  const man = JSON.stringify({ app: 'THEACTORPAGE', kind: 'studio', ls: { theactorpage_you_v1: '{"name":"Riley Hart"}' }, media: [{ sha: hs }, { sha: hb }] });
  r = await J(S + '/manifest', { method: 'PUT', headers: Object.assign({ 'content-type': 'application/json' }, H(key)), body: man }); want('the list goes up', r.s === 200 && r.b.at);
  r = await J(S + '/manifest', { headers: H(key) }); want('and comes back', r.s === 200 && r.b.ls.theactorpage_you_v1 === '{"name":"Riley Hart"}');

  /* the free amount is shared with the clips: 20 MB here, 12.3 MB used */
  r = await J(A + '/api/lib/riley-hart/start', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, H(key)), body: JSON.stringify({ name: 'big.mp4', size: 9 * MB }) });
  want('a clip that would go over, counting the studio: no', r.s === 413, r.b);
  const nine = new Uint8Array(9 * MB), h9 = sha(nine.map((_, i) => i % 7));
  r = await J(S + '/m/' + h9 + '/start', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, H(key)), body: JSON.stringify({ size: 9 * MB }) });
  want('studio over the free amount: no, in plain words', r.s === 413 && /Remove some clips/.test(r.b.why), r.b);

  r = await J(S + '/prune', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, H(key)), body: JSON.stringify({ keep: [hs] }) });
  want('prune: the take the list no longer names goes, space back', r.s === 200 && r.b.gone === 1 && r.b.bytes === small.length, r.b);
  g = await F(S + '/m/' + hb, { headers: H(key) }); want('and it\'s gone', g.status === 404);

  /* SIGN IN on a second computer */
  r = await J(A + '/api/recover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'riley-hart', backup }) });
  const key2 = r.b.key; want('sign in with the backup code: a key for this computer', r.s === 200 && key2 && key2 !== key);
  r = await J(S, { headers: H(key2) }); want('the new computer reads the studio', r.s === 200 && r.b.have.length === 1);
  r = await J(S, { headers: H(key) }); want('and the first computer still works', r.s === 200);
  r = await J(A + '/api/recover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'riley-hart', backup: 'wrong' }) });
  want('a wrong backup code: no', r.s === 403);
  await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
