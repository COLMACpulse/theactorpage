/* THEACTORPAGE HOST: actors' pages, live at <name>.theactorpage.com. A Cloudflare Worker with one R2 bucket.
   Only the finished page goes up, and only when the actor taps PUBLISH in the Project Hub. Their work stays on their phone.

   Who can change a page: whoever holds its key. Claiming a name hands back a key (kept on the phone that published)
   and a backup code (for a new phone). Only hashes of both are stored here. No email, no password.

   Pages are showcases, not apps: served pages can't run scripts, send forms or call out (a strict CSP), and only
   page, image, video, PDF and text files are taken. That keeps a page from being turned into a phishing page.

   R2 layout:
     sites/<name>/meta.json          {name, key, backup (hashes), live (version), bytes, files, created, updated}
     sites/<name>/v/<ver>/<path>     the files of one publish; the live one is meta.live
   API (api.<zone>, or /api on any host):
     GET    /api/names/<name>                      is it free? {free, why}
     POST   /api/claim        {name}               -> {name, key, backup, url}
     POST   /api/sites/<name>/begin                -> {ver}                     (key)
     PUT    /api/sites/<name>/files/<path>?v=ver   the bytes                    (key)
     POST   /api/sites/<name>/commit {ver, files}  goes live, old files go     (key)
     DELETE /api/sites/<name>                      takes it down (name kept)    (key)
     POST   /api/recover      {name, backup}       -> {key} a new key; the old one stops working
   Pages: <name>.<zone>/<path>, or /s/<name>/<path> on any host (for testing). */

const TYPES = { html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', pdf: 'application/pdf', txt: 'text/plain; charset=utf-8' };
const RESERVED = new Set(('www api app admin root mail email smtp ftp ns ns1 ns2 dns cdn static assets img images media files hub home help support status ' +
  'docs blog shop store pay billing account accounts login signin signup auth demo test dev staging beta theactorpage colmac colmacpulse brendan ' +
  'casting agent manager rep reps security abuse privacy terms legal about contact').split(' '));
const MB = 1048576;
const enc = new TextEncoder();
const j = (o, s, h) => new Response(JSON.stringify(o), { status: s || 200, headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, h || {}) });
const no = (why, s, h) => j({ ok: false, why }, s || 400, h);
const b64u = u8 => { let s = ''; for (const c of u8) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const secret = n => b64u(crypto.getRandomValues(new Uint8Array(n || 32)));
async function hash(s) { return b64u(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(s))))); }
function same(a, b) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export const nameWhy = function (n) {
  n = String(n || '');
  if (n.length < 3) return 'At least 3 letters.';
  if (n.length > 40) return '40 letters at most.';
  if (!/^[a-z0-9-]+$/.test(n)) return 'Letters, numbers and dashes only.';
  if (/^-|-$/.test(n) || n.includes('--')) return 'A dash can\'t start or end it, or come twice.';
  if (RESERVED.has(n)) return 'That one is taken.';
  return '';
};
/* a file path in a page: plain names in folders, one of the allowed types */
export const pathWhy = function (p) {
  p = String(p || '');
  if (!p || p.length > 200) return 'bad path';
  if (p.startsWith('/') || p.includes('\\') || p.split('/').some(x => !x || x === '.' || x === '..')) return 'bad path';
  if (!/^[\w./-]+$/.test(p)) return 'bad path';
  const ext = (p.match(/\.([a-z0-9]+)$/i) || [])[1];
  if (!ext || !TYPES[ext.toLowerCase()]) return 'not a page, image, video, PDF or text file';
  return '';
};
const typeOf = p => TYPES[(p.match(/\.([a-z0-9]+)$/i) || [])[1].toLowerCase()];
const lim = env => ({ file: (+env.MAX_FILE_MB || 95) * MB, site: (+env.MAX_SITE_MB || 100) * MB });

async function meta(env, name) { const o = await env.SITES.get('sites/' + name + '/meta.json'); return o ? o.json() : null; }
const putMeta = (env, m) => env.SITES.put('sites/' + m.name + '/meta.json', JSON.stringify(m), { httpMetadata: { contentType: 'application/json' } });
async function wipe(env, prefix, keep) {
  let cursor; do { const L = await env.SITES.list({ prefix, cursor }); const keys = L.objects.map(o => o.key).filter(k => !keep || !k.startsWith(keep));
    if (keys.length) await env.SITES.delete(keys); cursor = L.truncated ? L.cursor : null; } while (cursor);
}
async function authed(req, env, name) {
  const m = await meta(env, name); if (!m) return { err: no('No page by that name.', 404) };
  const k = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!k || !same(await hash(k), m.key)) return { err: no('That key doesn\'t open this page.', 403) };
  return { m };
}

function cors(req, env) {
  const o = req.headers.get('origin') || '', ok = String(env.ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!o || !(ok.includes(o) || ok.includes('*'))) return {};
  return { 'access-control-allow-origin': o, 'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS', 'access-control-allow-headers': 'authorization, content-type', 'access-control-max-age': '86400', vary: 'origin' };
}

async function api(req, env, url, H) {
  const p = url.pathname.replace(/^\/api/, ''), M = req.method;
  let m;
  if (M === 'GET' && (m = p.match(/^\/names\/([^/]+)$/))) {
    const n = decodeURIComponent(m[1]).toLowerCase(), why = nameWhy(n); if (why) return j({ free: false, why }, 200, H);
    return j({ free: !(await meta(env, n)), why: (await meta(env, n)) ? 'That one is taken.' : '' }, 200, H);
  }
  if (M === 'POST' && p === '/claim') {
    const b = await req.json().catch(() => ({})), n = String(b.name || '').toLowerCase(), why = nameWhy(n);
    if (why) return no(why, 400, H);
    if (await meta(env, n)) return no('That one is taken.', 409, H);
    const key = secret(32), backup = secret(15), now = new Date().toISOString();
    await putMeta(env, { name: n, key: await hash(key), backup: await hash(backup), live: '', bytes: 0, files: {}, created: now, updated: now });
    return j({ ok: true, name: n, key, backup, url: siteUrl(env, n, url) }, 200, H);
  }
  if (M === 'POST' && p === '/recover') {
    const b = await req.json().catch(() => ({})), n = String(b.name || '').toLowerCase(), mm = await meta(env, n);
    if (!mm || !same(await hash(String(b.backup || '').trim()), mm.backup)) return no('That backup code doesn\'t match this page.', 403, H);
    const key = secret(32); mm.key = await hash(key); mm.updated = new Date().toISOString(); await putMeta(env, mm);
    return j({ ok: true, name: n, key, url: siteUrl(env, n, url) }, 200, H);
  }
  if ((m = p.match(/^\/sites\/([a-z0-9-]+)(\/.*)?$/))) {
    const n = m[1], rest = m[2] || '', a = await authed(req, env, n); if (a.err) { a.err.headers && Object.entries(H).forEach(([k, v]) => a.err.headers.set(k, v)); return a.err; }
    const mm = a.m, L = lim(env);
    if (M === 'POST' && rest === '/begin') { const ver = Date.now().toString(36) + secret(4); return j({ ok: true, ver }, 200, H); }
    if (M === 'PUT' && rest.startsWith('/files/')) {
      const path = decodeURIComponent(rest.slice(7)), ver = url.searchParams.get('v') || '', why = pathWhy(path);
      if (why) return no(why, 400, H); if (!/^[a-z0-9_-]{6,40}$/i.test(ver)) return no('bad version', 400, H);
      const len = +req.headers.get('content-length') || 0;
      if (len > L.file) return no('That file is over ' + (L.file / MB) + ' MB. Put long video on YouTube or Vimeo and link it.', 413, H);
      const k = 'sites/' + n + '/v/' + ver + '/' + path, meta0 = { httpMetadata: { contentType: typeOf(path) } };
      /* a known size streams straight into storage (a 90 MB video never sits in memory); otherwise read it, then check */
      if (len && req.body) { const o = await env.SITES.put(k, req.body, meta0); return j({ ok: true, path, size: o ? o.size : len }, 200, H); }
      const body = await req.arrayBuffer(); if (body.byteLength > L.file) return no('That file is over ' + (L.file / MB) + ' MB. Put long video on YouTube or Vimeo and link it.', 413, H);
      await env.SITES.put(k, body, meta0);
      return j({ ok: true, path, size: body.byteLength }, 200, H);
    }
    if (M === 'POST' && rest === '/commit') {
      const b = await req.json().catch(() => ({})), ver = String(b.ver || ''), files = Array.isArray(b.files) ? b.files : [];
      if (!/^[a-z0-9_-]{6,40}$/i.test(ver)) return no('bad version', 400, H);
      if (!files.includes('index.html')) return no('A page needs its index.html.', 400, H);
      const got = {}; let bytes = 0;
      for (const f of files) { if (pathWhy(f)) return no('bad path: ' + f, 400, H); const h = await env.SITES.head('sites/' + n + '/v/' + ver + '/' + f); if (!h) return no('Missing: ' + f + '. Publish again.', 409, H); got[f] = { size: h.size, type: typeOf(f) }; bytes += h.size; }
      if (bytes > L.site) { await wipe(env, 'sites/' + n + '/v/' + ver + '/'); return no('This page is ' + Math.ceil(bytes / MB) + ' MB; the limit is ' + (L.site / MB) + ' MB. Put long video on YouTube or Vimeo and link it.', 413, H); }
      mm.live = ver; mm.files = got; mm.bytes = bytes; mm.updated = new Date().toISOString(); await putMeta(env, mm);
      await wipe(env, 'sites/' + n + '/v/', 'sites/' + n + '/v/' + ver + '/');
      return j({ ok: true, url: siteUrl(env, n, url), bytes, files: files.length, updated: mm.updated }, 200, H);
    }
    if (M === 'DELETE' && rest === '') {
      await wipe(env, 'sites/' + n + '/v/'); mm.live = ''; mm.files = {}; mm.bytes = 0; mm.updated = new Date().toISOString(); await putMeta(env, mm);
      return j({ ok: true, down: true }, 200, H);
    }
  }
  return no('Not here.', 404, H);
}

function siteUrl(env, n, url) { return env.ZONE ? 'https://' + n + '.' + env.ZONE + '/' : url.origin + '/s/' + n + '/'; }

/* the page itself: the live version's file, with video byte ranges, and nothing that can run */
const CSP = "default-src 'none'; img-src 'self' data:; media-src 'self' data:; style-src 'unsafe-inline'; font-src 'self' data:; frame-src https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'self' data:; form-action 'none'; base-uri 'none'; frame-ancestors 'none'";
async function serve(req, env, name, path) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('', { status: 405 });
  const mm = nameWhy(name) ? null : await meta(env, name);
  if (!mm || !mm.live) return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not up</title><p style="font:16px system-ui;margin:40px">This page isn\'t up right now.</p>', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP, 'cache-control': 'no-store' } });
  path = path.replace(/^\/+/, '') || 'index.html'; if (path.endsWith('/')) path += 'index.html';
  try { path = decodeURIComponent(path); } catch (e) { return new Response('', { status: 400 }); }
  if (pathWhy(path) || !mm.files[path]) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain', 'content-security-policy': CSP } });
  const key = 'sites/' + name + '/v/' + mm.live + '/' + path, size = mm.files[path].size;
  const rh = req.headers.get('range'); let range = null, status = 200;
  if (rh) { const r = rh.match(/^bytes=(\d*)-(\d*)$/); if (r && (r[1] || r[2])) { let a = r[1] ? +r[1] : Math.max(0, size - +r[2]), b = r[1] && r[2] ? Math.min(+r[2], size - 1) : size - 1;
    if (a > b || a >= size) return new Response('', { status: 416, headers: { 'content-range': 'bytes */' + size } }); range = { offset: a, length: b - a + 1 }; status = 206; } }
  const o = await env.SITES.get(key, range ? { range } : undefined); if (!o) return new Response('Not found', { status: 404 });
  const h = new Headers(); h.set('content-type', mm.files[path].type || typeOf(path)); h.set('accept-ranges', 'bytes'); h.set('x-content-type-options', 'nosniff');
  h.set('content-security-policy', CSP); h.set('referrer-policy', 'strict-origin-when-cross-origin'); h.set('etag', o.httpEtag || ('"' + mm.live + '"'));
  h.set('cache-control', /html/.test(h.get('content-type')) ? 'no-cache' : 'public, max-age=3600');
  if (range) { h.set('content-range', 'bytes ' + range.offset + '-' + (range.offset + range.length - 1) + '/' + size); h.set('content-length', String(range.length)); } else h.set('content-length', String(size));
  return new Response(req.method === 'HEAD' ? null : o.body, { status, headers: h });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), H = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });
    const host = url.hostname.toLowerCase(), zone = String(env.ZONE || '').toLowerCase();
    if (zone && host.endsWith('.' + zone)) { const sub = host.slice(0, -zone.length - 1);
      if (sub === 'api') return url.pathname.startsWith('/api/') ? api(req, env, url, H) : no('Not here.', 404, H);
      if (sub === 'www') return Response.redirect(env.HOME_URL || ('https://' + zone + '/'), 301);
      if (!sub.includes('.')) return serve(req, env, sub, url.pathname); }
    if (url.pathname.startsWith('/api/')) return api(req, env, url, H);
    const s = url.pathname.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/); if (s) return serve(req, env, s[1], s[2] || '/');
    return new Response('THEACTORPAGE', { status: 404, headers: { 'content-type': 'text/plain' } });
  }
};
