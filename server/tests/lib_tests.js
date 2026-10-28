/* FOOTAGE ONLINE on the host, in Miniflare with a throwaway R2 bucket (Col, Oct 28: point it at a folder, pick, upload,
   stored on the site; private until it's on the page; the original, full quality; a free amount each).
   A 12 MB made-up clip goes up in 5 MB parts, picks up after a drop, plays from a 6-hour link with byte ranges, a link
   that's run out or was changed is refused, another actor's key can't see it, the free amount holds, it comes off.
   cd server && npm i && node tests/lib_tests.js */
const { Miniflare } = require('miniflare'); const path = require('path');
(async () => {
  let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 300))); if (!x) ok = false; };
  const mf = new Miniflare({ modules: true, scriptPath: path.join(__dirname, '..', 'worker.js'), r2Buckets: ['SITES'],
    bindings: { ZONE: 'theactorpage.test', ORIGINS: 'https://colmacpulse.github.io', LIB_MB: '20', PART_MB: '5', MAX_SITE_MB: '250' } });
  const A = 'https://api.theactorpage.test', F = (u, o) => mf.dispatchFetch(u, o);
  const J = async (u, o) => { const r = await F(u, o); let b = null; try { b = await r.json(); } catch (e) { } return { s: r.status, b, h: r.headers }; };
  const post = (u, b, k) => J(u, { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, k ? { authorization: 'Bearer ' + k } : {}), body: JSON.stringify(b || {}) });
  const MB = 1048576, clip = new Uint8Array(12 * MB).map((_, i) => (i * 7) % 253);
  const key = (await post(A + '/api/claim', { name: 'riley-hart' })).b.key, other = (await post(A + '/api/claim', { name: 'sam-actor' })).b.key;
  const L = '/api/lib/riley-hart';

  let r = await J(A + L, { headers: { authorization: 'Bearer ' + key } });
  want('an empty library: nothing yet, 20 MB free here, 5 MB parts', r.s === 200 && r.b.items.length === 0 && r.b.bytes === 0 && r.b.cap === 20 * MB && r.b.part === 5 * MB, r.b);
  r = await J(A + L, { headers: { authorization: 'Bearer ' + other } }); want('another actor\'s key can\'t see it', r.s === 403);
  r = await J(A + L); want('no key: no', r.s === 403);
  r = await post(A + L + '/start', { name: 'notes.txt', size: 10 }, key); want('only video and audio', r.s === 400 && /Only video and audio/.test(r.b.why));

  r = await post(A + L + '/start', { name: 'Salt_Road_sc12.mp4', size: clip.length, secs: 74.2, fp: 'Salt_Road_sc12.mp4|12582912' }, key);
  const id = r.b.id; want('start: an id, from part 1', r.s === 200 && id && r.b.have === 0, r.b);
  const part = (n, body, k) => J(A + L + '/part/' + id + '?p=' + n, { method: 'PUT', headers: { authorization: 'Bearer ' + (k || key) }, body });
  r = await part(2, clip.slice(0, 1000)); want('parts go in order', r.s === 409 && /Send part 1/.test(r.b.why));
  r = await part(1, clip.slice(0, 4 * MB)); want('a part the wrong size: no', r.s === 400);
  r = await part(1, clip.slice(0, 5 * MB)); want('part 1 in', r.s === 200 && r.b.have === 1);
  r = await part(1, clip.slice(0, 5 * MB)); want('part 1 again (the answer got lost): fine, not twice', r.s === 200 && r.b.have === 1);
  /* the Wi-Fi drops: start again with the same file */
  r = await post(A + L + '/start', { name: 'Salt_Road_sc12.mp4', size: clip.length, fp: 'Salt_Road_sc12.mp4|12582912' }, key);
  want('after a drop: the same upload, picks up at part 2', r.b.id === id && r.b.have === 1, r.b);
  r = await post(A + L + '/finish/' + id, {}, key); want('not every part in: not finished', r.s === 409);
  r = await part(2, clip.slice(5 * MB, 10 * MB)); r = await part(3, clip.slice(10 * MB));
  want('the last part is the rest', r.s === 200 && r.b.have === 3);
  r = await post(A + L + '/finish/' + id, {}, key); want('finished: in the library, 12 MB used', r.s === 200 && r.b.item.done && r.b.bytes === clip.length, r.b);
  r = await J(A + L, { headers: { authorization: 'Bearer ' + key } });
  want('listed with its name, size and length', r.b.items.length === 1 && r.b.items[0].name === 'Salt_Road_sc12.mp4' && r.b.items[0].size === clip.length && r.b.items[0].secs === 74.2 && r.b.items[0].type === 'video/mp4', r.b.items);

  /* playing it */
  r = await J(A + L + '/' + id + '/link', { headers: { authorization: 'Bearer ' + key } }); const link = r.b.url;
  want('a play link for 6 hours', r.s === 200 && /\/v\/riley-hart\//.test(link) && r.b.until - Date.now() / 1000 > 5.9 * 3600, r.b);
  let pg = await F(link); let got = new Uint8Array(await pg.arrayBuffer());
  want('the link plays the original, byte for byte', pg.status === 200 && got.length === clip.length && got[777] === clip[777] && got[clip.length - 1] === clip[clip.length - 1] && pg.headers.get('content-type') === 'video/mp4');
  pg = await F(link, { headers: { range: 'bytes=6000000-6000999' } }); got = new Uint8Array(await pg.arrayBuffer());
  want('skipping ahead: byte ranges', pg.status === 206 && got.length === 1000 && got[0] === clip[6000000] && pg.headers.get('content-range') === 'bytes 6000000-6000999/' + clip.length);
  pg = await F(link.replace(/s=[^&]+/, 's=madeup')); want('a changed link: no', pg.status === 403);
  pg = await F(link.replace(/e=\d+/, 'e=' + (Math.floor(Date.now() / 1000) - 10))); want('a link that has run out: no, and it says so', pg.status === 403 && /run out/.test(await pg.text()));
  pg = await F(link.replace('/riley-hart/', '/sam-actor/')); want('the link doesn\'t open someone else\'s', pg.status === 403 || pg.status === 404);
  pg = await F('https://riley-hart.theactorpage.test/lib/riley-hart/f/' + id); want('it isn\'t on the public page', pg.status === 404);

  /* SEND A LINK: up to 7 days, and it can be turned off */
  r = await J(A + L + '/' + id + '/link?days=7', { headers: { authorization: 'Bearer ' + key } }); const share = r.b.url;
  want('SEND A LINK: a link for 7 days', r.s === 200 && r.b.until - Date.now() / 1000 > 6.9 * 86400 && (await F(share)).status === 200, r.b);
  r = await J(A + L + '/' + id + '/link?days=30', { headers: { authorization: 'Bearer ' + key } }); want('never longer than 7 days', r.b.until - Date.now() / 1000 < 7.01 * 86400);
  r = await post(A + L + '/' + id + '/unshare', {}, key); pg = await F(share);
  want('TURN OFF THE LINKS: the one you sent stops working', r.s === 200 && pg.status === 403);
  r = await J(A + L + '/' + id + '/link', { headers: { authorization: 'Bearer ' + key } }); pg = await F(r.b.url); const link2 = r.b.url;
  want('and a new link works again', pg.status === 200);
  /* PUT IT ON MY PAGE: copied from the library on the host, not sent again */
  const v1 = (await post(A + '/api/sites/riley-hart/begin', {}, key)).b.ver;
  await J(A + '/api/sites/riley-hart/files/index.html?v=' + v1, { method: 'PUT', headers: { authorization: 'Bearer ' + key }, body: '<!doctype html><title>Riley</title><video src="media/online_' + id + '.mp4"></video>' });
  r = await post(A + '/api/sites/riley-hart/copy', { ver: v1, path: 'media/online_' + id + '.mp4', from: id }, key);
  want('PUT IT ON MY PAGE: the clip is copied onto the page here, 12 MB not sent again', r.s === 200 && r.b.size === clip.length, r.b);
  r = await post(A + '/api/sites/riley-hart/copy', { ver: v1, path: 'media/x.mp4', from: id }, other); want('another key can\'t copy it', r.s === 403);
  r = await post(A + '/api/sites/riley-hart/copy', { ver: v1, path: 'media/x.mp4', from: 'nope' }, key); want('a clip that isn\'t there: says so', r.s === 404);
  r = await post(A + '/api/sites/riley-hart/commit', { ver: v1, files: ['index.html', 'media/online_' + id + '.mp4'] }, key);
  pg = await F('https://riley-hart.theactorpage.test/media/online_' + id + '.mp4', { headers: { range: 'bytes=0-99' } }); got = new Uint8Array(await pg.arrayBuffer());
  want('it plays on your public page', r.s === 200 && pg.status === 206 && got[50] === clip[50]);

  /* the free amount */
  r = await post(A + L + '/start', { name: 'big.mp4', size: 9 * MB }, key); want('over the free amount: no, in plain words', r.s === 413 && /over your 0\.0? ?GB|over your/.test(r.b.why), r.b);
  r = await post(A + L + '/start', { name: 'short.mov', size: 3 * MB }, key); const id2 = r.b.id; want('under it: fine', r.s === 200);
  r = await J(A + L + '/' + id2, { method: 'DELETE', headers: { authorization: 'Bearer ' + key } }); want('an upload stopped halfway can be thrown out', r.s === 200 && r.b.gone);

  /* off */
  r = await J(A + L + '/' + id, { method: 'DELETE', headers: { authorization: 'Bearer ' + other } }); want('another key can\'t remove it', r.s === 403);
  r = await J(A + L + '/' + id, { method: 'DELETE', headers: { authorization: 'Bearer ' + key } }); want('REMOVE IT FROM ONLINE: gone, space back', r.s === 200 && r.b.bytes === 0);
  pg = await F(link2); want('its link stops working', pg.status === 404);
  r = await J(A + L, { headers: { authorization: 'Bearer ' + key } }); want('the library is empty again', r.b.items.length === 0 && r.b.bytes === 0);
  await mf.dispose(); console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
