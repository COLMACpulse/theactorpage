/* THEACTORPAGE DEMO SANDBOX. Load this FIRST in <head>, before anything that reads or writes storage.
   While the demo is on in this tab, every tool sees a fresh, empty copy of the site's storage with only the
   demo script in it. Your own work is never read, shown or changed: localStorage goes to a demo copy in
   this tab's sessionStorage, and every IndexedDB database gets a demo twin ("<name>__tapdemo").
   END DEMO wipes the copy. Close the tab and the copy goes with it; the next normal visit clears the twins. */
(function (g) {
  'use strict';
  const FLAG = 'tapdemo_on', PFX = 'tapdemo:', SUF = '__tapdemo', NAMES = 'tapdemo_dbs';
  let ss = null; try { ss = g.sessionStorage; } catch (e) { }
  const on = !!(ss && ss.getItem(FLAG) === '1');
  const D = { on, SUF };
  const realLS = (() => { try { return g.localStorage; } catch (e) { return null; } })();
  const idb = g.indexedDB, open0 = idb && idb.open.bind(idb), del0 = idb && idb.deleteDatabase.bind(idb), list0 = idb && idb.databases && idb.databases.bind(idb);
  D.realGet = k => { try { return realLS && realLS.getItem(k); } catch (e) { return null; } };

  function keys() { const out = []; for (let i = 0; i < ss.length; i++) { const k = ss.key(i); if (k && k.indexOf(PFX) === 0) out.push(k.slice(PFX.length)); } return out; }
  function remember(n) { try { const a = JSON.parse(ss.getItem(NAMES) || '[]'); if (!a.includes(n)) { a.push(n); ss.setItem(NAMES, JSON.stringify(a)); } } catch (e) { } }

  if (on) {
    const store = {
      getItem(k) { return ss.getItem(PFX + k); },
      setItem(k, v) { ss.setItem(PFX + k, String(v)); },
      removeItem(k) { ss.removeItem(PFX + k); },
      clear() { keys().forEach(k => ss.removeItem(PFX + k)); },
      key(i) { const k = keys(); return i >= 0 && i < k.length ? k[i] : null; },
      get length() { return keys().length; }
    };
    const own = new Set(['getItem', 'setItem', 'removeItem', 'clear', 'key', 'length']);
    const fake = new Proxy(store, {
      get(t, p) { if (own.has(p)) { const v = t[p]; return typeof v === 'function' ? v.bind(t) : v; } if (typeof p !== 'string') return undefined; const v = t.getItem(p); return v == null ? undefined : v; },
      set(t, p, v) { if (own.has(p)) return true; t.setItem(p, v); return true; },
      deleteProperty(t, p) { t.removeItem(p); return true; },
      has(t, p) { return own.has(p) || t.getItem(p) != null; },
      ownKeys() { return keys(); },
      getOwnPropertyDescriptor(t, p) { const v = typeof p === 'string' ? t.getItem(p) : null; return v == null ? undefined : { value: v, enumerable: true, configurable: true, writable: true }; }
    });
    try { Object.defineProperty(g, 'localStorage', { configurable: true, get: () => fake }); D.lsOk = g.localStorage === fake; } catch (e) { D.lsOk = false; }
    if (idb) {
      try {
        idb.open = function (n, v) { const nn = String(n) + SUF; remember(nn); return v === undefined ? open0(nn) : open0(nn, v); };
        idb.deleteDatabase = function (n) { return del0(String(n) + SUF); };
        if (list0) idb.databases = () => list0().then(a => a.filter(d => d.name.endsWith(SUF)).map(d => Object.assign({}, d, { name: d.name.slice(0, -SUF.length) })));
        D.idbOk = true;
      } catch (e) { D.idbOk = false; }
    }
    /* outside the tour player (a new tab opened from a demo page): say so, and give the way out */
    if (g.top === g) g.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('tapdemobar') || document.documentElement.hasAttribute('data-tour-player')) return;
      const b = document.createElement('div'); b.id = 'tapdemobar';
      b.setAttribute('style', 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#111;color:#fff;font:600 13px system-ui,sans-serif;padding:8px 12px calc(8px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:center;justify-content:space-between;border-top:2px solid #e0a23c');
      b.innerHTML = '<span>DEMO · Your own work is put away while you look.</span><button type="button" style="font:700 12px system-ui;padding:6px 10px;border-radius:8px;border:1px solid #fff;background:transparent;color:#fff">END DEMO</button>';
      b.querySelector('button').onclick = () => D.end().then(() => { location.href = D.root + 'index.html'; });
      document.body.appendChild(b);
    });
  }

  /* where the site starts, from this file's own address */
  const me = document.currentScript && document.currentScript.src || '';
  D.root = me ? me.replace(/shared\/tour\.js(\?.*)?$/, '') : '/';

  /* start: a fresh copy. carry: real keys copied in (your SHOW ME choice) */
  D.start = function (carry) {
    if (!ss) return false;
    D.wipeCopy(); ss.setItem(FLAG, '1');
    (carry || []).forEach(k => { const v = D.realGet(k); if (v != null) ss.setItem(PFX + k, v); });
    return true;
  };
  D.wipeCopy = function () { if (!ss) return; keys().forEach(k => ss.removeItem(PFX + k)); };
  D.end = async function () {
    if (!ss) return;
    D.wipeCopy(); let names = []; try { names = JSON.parse(ss.getItem(NAMES) || '[]'); } catch (e) { }
    ss.removeItem(FLAG); ss.removeItem(NAMES);
    await D.sweep(names);
  };
  /* delete the demo twins: the ones this tab made, and any a closed tab left behind */
  D.sweep = async function (names) {
    if (!del0) return; let all = (names || []).slice();
    try { if (list0) (await list0()).forEach(d => { if (d.name && d.name.endsWith(SUF) && !all.includes(d.name)) all.push(d.name); }); } catch (e) { }
    await Promise.all(all.map(n => new Promise(r => { try { const q = del0(n); q.onsuccess = q.onerror = q.onblocked = () => r(); } catch (e) { r(); } })));
    return all.length;
  };
  /* a demo tab says it's alive (a time only, no data), so a normal tab never sweeps a demo that's running */
  const ALIVE = 'tapdemo_alive';
  if (on) { const beat = () => { try { realLS && realLS.setItem(ALIVE, String(Date.now())); } catch (e) { } }; beat(); setInterval(beat, 20000); }
  else if (list0) setTimeout(() => { let t = 0; try { t = +(realLS && realLS.getItem(ALIVE)) || 0; } catch (e) { } if (Date.now() - t > 120000) D.sweep([]).catch(() => { }); }, 3000);
  g.TapDemo = D;
})(window);
