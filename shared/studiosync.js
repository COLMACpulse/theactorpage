/* YOUR STUDIO, KEPT ONLINE (Col, Oct 31: SIGN IN that brings everything back). Off until the actor turns it on. Then
   everything THEACTORPAGE keeps on this computer (the same things ON THIS DEVICE backs up) goes to their own private space
   on theactorpage.com: a small list of it all, plus each photo, take or file once, named by its fingerprint, so after the
   first time only what's new goes up. On another computer, SIGN IN (address + backup code) brings it all down.
   Needs ../device/store.js (OnDevice) and footcloud.js (the account).
   StudioSync.on() / turnOn() / turnOff()   state() {on, at, busy, pct, err}   backup({onP})   auto()   restore(name, code, {onP, ask}) */
(function (g) {
  'use strict';
  const S = {}, KEY = 'theactorpage_studiosync_v1', ACCT = 'hub_online_v1';
  /* never sent: this computer's own key and backup code, and these notes */
  const PRIVATE = [/^theactorpage_studiosync_v1$/, /^theactorpage_device_v1$/];
  const ls = { get: k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  const me = () => ls.get(KEY) || {}, setMe = o => ls.set(KEY, Object.assign(me(), o));
  const D = () => g.OnDevice, C = () => g.FootCloud;
  const acct = () => { const a = ls.get(ACCT); return a && a.key && a.name ? a : null; };
  const base = () => (C() ? C().base() : 'https://api.theactorpage.com');
  const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  const sha = async blob => hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
  const LIVE = { busy: false, pct: 0, err: '' };
  const listeners = []; S.onChange = f => listeners.push(f); const told = () => listeners.forEach(f => { try { f(S.state()); } catch (e) { } });

  S.on = () => !!me().on && !!acct();
  S.state = () => ({ on: S.on(), at: me().at || '', bytes: me().bytes || 0, busy: LIVE.busy, pct: LIVE.pct, err: LIVE.err, acct: !!acct() });
  S.turnOn = () => { setMe({ on: new Date().toISOString() }); told(); return S.backup(); };
  S.turnOff = () => { setMe({ on: '' }); told(); };

  async function call(path, o) {
    const a = acct(); if (!a) throw new Error('Claim your address first.');
    const r = await fetch(base() + '/api/studio/' + a.name + path, Object.assign({}, o, { headers: Object.assign({ authorization: 'Bearer ' + a.key }, (o && o.headers) || {}) })).catch(() => null);
    if (!r) { const e = new Error('Can’t reach theactorpage.com right now.'); e.net = true; throw e; }
    return r;
  }
  async function jcall(path, o) { const r = await call(path, o); let b = null; try { b = await r.json(); } catch (e) { } if (!r.ok) { const e = new Error((b && b.why) || ('The host said no (' + r.status + ').')); e.status = r.status; throw e; } return b || {}; }

  /* ---------- this computer, as one list plus its files ---------- */
  async function snapshot() {
    const d = D(), s = await d.scan(), media = [], ctx = [], skipped = [];
    const m = { app: 'THEACTORPAGE', kind: 'device-backup', version: 1, studio: 1, made: new Date().toISOString(), ls: {}, idb: [], media: [] };
    s.ls.forEach(x => { if (PRIVATE.some(r => r.test(x.k))) return;
      if (x.k === ACCT) { try { const o = JSON.parse(x.v) || {}; delete o.key; delete o.backup; m.ls[x.k] = JSON.stringify(o); } catch (e) { } return; }
      m.ls[x.k] = x.v; });
    s.dbs.forEach(db => m.idb.push({ name: db.name, version: db.version, stores: db.stores.map(st => ({ name: st.name, keyPath: st.keyPath, autoIncrement: st.autoIncrement, indexes: st.indexes,
      records: st.records.map(x => { const i0 = media.length, rec = { k: d.encode(x.k, media, skipped), v: d.encode(x.v, media, skipped) };
        for (let i = i0; i < media.length; i++) ctx[i] = db.name + '|' + st.name + '|' + d.sig(x.k) + '|' + (i - i0); return rec; }) })) }));
    return { m, media, ctx };
  }
  /* each file's fingerprint, remembered so an unchanged photo isn't read again */
  async function fingerprints(media, ctx, onP) {
    const memo = me().fp || {}, out = [], fresh = {};
    for (let i = 0; i < media.length; i++) {
      const b = media[i], k = ctx[i] + '|' + b.size + '|' + (b.type || '') + '|' + (b.lastModified || '');
      out[i] = memo[k] || await sha(b); fresh[k] = out[i]; if (onP) onP(i + 1, media.length);
    }
    setMe({ fp: fresh }); return out;
  }

  async function put(sh, blob, part, onBytes) {
    if (blob.size <= part) { await jcall('/m/' + sh, { method: 'PUT', body: blob }); onBytes(blob.size); return; }
    const st = await jcall('/m/' + sh + '/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ size: blob.size }) });
    if (st.have === true) { onBytes(blob.size); return; }
    const parts = Math.ceil(blob.size / part);
    for (let p = (st.have || 0) + 1; p <= parts; p++) { await jcall('/m/' + sh + '/part?p=' + p, { method: 'PUT', body: blob.slice((p - 1) * part, Math.min(blob.size, p * part)) }); onBytes(Math.min(part, blob.size - (p - 1) * part)); }
    await jcall('/m/' + sh + '/finish', { method: 'POST' });
  }

  /* ---------- up ---------- */
  S.backup = async function (o) {
    o = o || {}; if (!S.on() || LIVE.busy) return { skipped: true };
    LIVE.busy = true; LIVE.pct = 0; LIVE.err = ''; told();
    try {
      const { m, media, ctx } = await snapshot();
      const fps = await fingerprints(media, ctx, (i, n) => { LIVE.pct = Math.round(10 * i / Math.max(1, n)); told(); });
      m.media = media.map((b, i) => ({ i, size: b.size, type: b.type || '', sha: fps[i] }));
      const body = JSON.stringify(m), bodySha = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.replace(/"made":"[^"]*"/, ''))));
      const info = await jcall('', {}), have = new Set(info.have || []);
      const need = []; const seen = new Set(); m.media.forEach((x, i) => { if (!have.has(x.sha) && !seen.has(x.sha)) { seen.add(x.sha); need.push(i); } });
      if (!need.length && bodySha === me().last && info.at) { setMe({ at: new Date().toISOString() }); return { same: true }; }
      const total = need.reduce((t, i) => t + media[i].size, 0) || 1; let sent = 0;
      for (const i of need) { await put(m.media[i].sha, media[i], info.part, n => { sent += n; LIVE.pct = 10 + Math.round(85 * sent / total); told(); }); }
      await jcall('/manifest', { method: 'PUT', headers: { 'content-type': 'application/json' }, body });
      const pr = await jcall('/prune', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keep: [...new Set(m.media.map(x => x.sha))] }) });
      setMe({ last: bodySha, at: new Date().toISOString(), bytes: pr.bytes || 0, items: Object.keys(m.ls).length + m.idb.reduce((n, d) => n + d.stores.reduce((a, st) => a + st.records.length, 0), 0) });
      LIVE.pct = 100; return { sent: need.length };
    } catch (e) { LIVE.err = e.message || String(e); throw e; }
    finally { LIVE.busy = false; told(); }
  };
  /* quietly, when a page opens or is left: at most every few minutes */
  S.auto = function (every) {
    if (!S.on() || LIVE.busy) return Promise.resolve(null);
    const last = Date.parse(me().tried || 0) || 0; if (Date.now() - last < (every == null ? 3 * 60 * 1000 : every)) return Promise.resolve(null);
    setMe({ tried: new Date().toISOString() });
    return S.backup().catch(() => null);
  };

  /* ---------- down: SIGN IN on another computer ---------- */
  S.restore = async function (name, code, o) {
    o = o || {}; const onP = o.onP || (() => { }); const C1 = C();
    onP('sign', 0);
    const a = await C1.recover(name, code);   /* hub_online_v1 now holds this computer's key */
    const r = await call('/manifest', {}); if (r.status === 404) { onP('done', 100); return { nothing: true, acct: a }; }
    if (!r.ok) { let b = null; try { b = await r.json(); } catch (e) { } throw new Error((b && b.why) || 'Couldn’t get your studio.'); }
    const m = await r.json(), d = D(), blobs = {};
    const bk = { m, size: i => (m.media[i] || {}).size || 0, media: i => blobs[i] };
    const keepAcct = k => k === ACCT || PRIVATE.some(x => x.test(k));
    const P = await d.plan(bk, keepAcct);
    const differ = Object.values(P).reduce((n, p) => n + p.differ.length, 0), add = Object.values(P).reduce((n, p) => n + p.add.length, 0);
    let replace = 'all'; if (differ && o.ask) replace = (await o.ask(differ, add)) ? 'all' : null;
    /* the files the chosen items need */
    const want = new Set(), walk = x => { if (x == null || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk); if (x.__pt && x.i != null) { want.add(x.i); return; } Object.keys(x).forEach(k => walk(x[k])); };
    Object.values(P).forEach(p => { p.add.concat(replace ? p.differ : []).forEach(it => { if (it.type === 'idb') { walk(it.rec.k); walk(it.rec.v); } }); });
    const bySha = {}, list = [...want], total = list.reduce((t, i) => t + bk.size(i), 0) || 1; let got = 0;
    for (const i of list) {
      const x = m.media[i]; if (!x) continue;
      if (!bySha[x.sha]) { const fr = await call('/m/' + x.sha, {}); if (!fr.ok) throw new Error('A file from your studio didn’t come down. Try SIGN IN again.'); bySha[x.sha] = await fr.blob(); }
      blobs[i] = bySha[x.sha].slice(0, bySha[x.sha].size, x.type || ''); got += x.size; onP('files', Math.round(90 * got / total));
    }
    const res = await d.apply(P, replace, bk, (n, t) => onP('write', 90 + Math.round(10 * n / Math.max(1, t))));
    /* your page's address and whether it's live come over too; this computer's key stays its own */
    try { const was = JSON.parse(m.ls[ACCT] || '{}') || {}, now = ls.get(ACCT) || {}; ls.set(ACCT, Object.assign({}, was, now)); } catch (e) { }
    setMe({ on: new Date().toISOString(), at: new Date().toISOString(), restored: new Date().toISOString() });
    onP('done', 100); told();
    return { n: res.n, add, differ, replaced: !!replace, acct: a };
  };
  g.StudioSync = S;
})(window);
