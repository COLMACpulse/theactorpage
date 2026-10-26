/* THEACTORPAGE FOOTAGE MAP (Col, Oct 26: "not my job. find your own footage. I'd rather have a map of what I have
   and where it is"). Every drive, folder and place your footage lives, and which project is where.
   A PLACE: a drive or folder you picked (its list of video files: path, size, date; nothing copied, nothing uploaded),
            or a place you name that isn't on this computer (Dropbox, the editor, a drive in a drawer) and what's there.
   THE MAP: each project (your credits, your films, ones you name) and the places that hold it. Folder and file names
            say which project a file is; you fix what it gets wrong, and what it can't tell stays "Not matched".
   Unplug a drive and the map keeps what was on it, with the day it last looked.
   localStorage theactorpage_footage_map_v1. Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const M = {}, KEY = 'theactorpage_footage_map_v1', CAP = 50000;
  M.KEY = KEY;
  M.VIDEO = /\.(mov|mp4|m4v|mxf|avi|mkv|webm|mts|m2ts|braw|r3d|crm|ari|3gp|wmv|mpe?g|dv|hevc|insv|lrv)$/i;
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const blank = () => ({ places: [], fix: {}, mine: [] });
  function read() { try { const d = JSON.parse((g.localStorage && localStorage.getItem(KEY)) || 'null'); if (d && Array.isArray(d.places)) return Object.assign(blank(), d); } catch (e) { } return blank(); }
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  M.read = read;

  /* a list of files (from a folder pick, <input webkitdirectory>) -> the videos in it, and the folder's own name */
  M.fromFiles = function (files) {
    const out = []; let root = '';
    for (const f of files || []) {
      const p = clean(f.webkitRelativePath || f.path || f.name); if (!p) continue;
      if (!root) root = p.split('/')[0];
      const n = p.split('/').pop(); if (!M.VIDEO.test(n) || /^\._/.test(n)) continue;
      out.push({ p, s: +f.size || 0, d: f.lastModified ? new Date(f.lastModified).toISOString().slice(0, 10) : '' });
      if (out.length >= CAP) break;
    }
    out.sort((a, b) => a.p.localeCompare(b.p));
    return { root, files: out, capped: out.length >= CAP };
  };
  const sum = files => files.reduce((n, f) => n + (f.s || 0), 0);
  M.size = b => { b = +b || 0; if (b >= 1e12) return (b / 1e12).toFixed(1) + ' TB'; if (b >= 1e9) return (b / 1e9).toFixed(b >= 1e10 ? 0 : 1) + ' GB'; if (b >= 1e6) return Math.round(b / 1e6) + ' MB'; return Math.max(1, Math.round(b / 1e3)) + ' KB'; };

  M.places = () => read().places.slice();
  M.place = id => read().places.find(p => p.id === id) || null;
  M.addDrive = function (name, picked, today) {
    const d = read(), p = { id: uid(), kind: 'drive', name: clean(name) || picked.root || 'A drive', root: picked.root || '', files: picked.files || [], looked: today || '', bytes: sum(picked.files || []) };
    d.places.push(p); write(d); return p;
  };
  /* LOOK AGAIN: the same drive, plugged in again: the new list replaces the old; your fixes stay */
  M.relook = function (id, picked, today) { const d = read(), p = d.places.find(x => x.id === id); if (!p) return null; p.files = picked.files || []; p.bytes = sum(p.files); p.looked = today || p.looked; if (!p.root) p.root = picked.root || ''; write(d); return p; };
  /* a place that isn't on this computer: you say what's there */
  M.addNamed = function (name, note, holds) { const n = clean(name); if (!n) return null; const d = read(), p = { id: uid(), kind: 'named', name: n, note: clean(note), holds: (holds || []).map(clean).filter(Boolean) }; d.places.push(p); write(d); return p; };
  M.setPlace = function (id, patch) { const d = read(), p = d.places.find(x => x.id === id); if (!p) return null; ['name', 'note'].forEach(k => { if (patch[k] !== undefined) p[k] = clean(patch[k]) || (k === 'name' ? p.name : ''); }); if (patch.holds) p.holds = patch.holds.map(clean).filter(Boolean); write(d); return p; };
  M.forget = function (id) { const d = read(); d.places = d.places.filter(p => p.id !== id); Object.keys(d.fix).forEach(k => { if (k.indexOf(id + '|') === 0) delete d.fix[k]; }); write(d); };
  /* projects you name yourself (a reel, a class) on top of your credits and films */
  M.addMine = function (t) { const x = clean(t); if (!x) return; const d = read(); if (!d.mine.some(m => M.norm(m) === M.norm(x))) d.mine.push(x); write(d); };
  M.mine = () => read().mine.slice();

  /* what a file is: a fix you made (on it, or on a folder above it), else a project whose name is in its path */
  M.norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  M.setFix = function (placeId, path, title) { const d = read(), k = placeId + '|' + path; if (title === null || title === undefined) delete d.fix[k]; else d.fix[k] = clean(title); write(d); };
  function fixOf(fix, placeId, path) {
    const parts = path.split('/');
    for (let i = parts.length; i > 0; i--) { const k = placeId + '|' + parts.slice(0, i).join('/'); if (fix[k] !== undefined) return fix[k]; }
    return undefined;
  }
  M.matchPath = function (path, titles) {
    const segs = String(path || '').split('/').map(M.norm), whole = segs.join('');
    let best = '', bl = 0;
    for (const t of titles || []) { const n = M.norm(t); if (n.length < 4) continue; if (whole.indexOf(n) >= 0 && n.length > bl) { best = t; bl = n.length; } }
    return best;
  };
  M.what = (d, placeId, path, titles) => { const f = fixOf(d.fix, placeId, path); return f !== undefined ? f : M.matchPath(path, titles); };

  /* THE MAP: projects, and the places that hold each; the files nothing could place */
  M.map = function (titles) {
    const d = read(), all = []; const add = t => { const x = clean(t); if (x && !all.some(a => M.norm(a) === M.norm(x))) all.push(x); };
    (titles || []).forEach(add); d.mine.forEach(add); Object.values(d.fix).forEach(add);
    d.places.forEach(p => (p.holds || []).forEach(add));
    const proj = {}, un = {};
    const P = t => proj[M.norm(t)] || (proj[M.norm(t)] = { title: all.find(a => M.norm(a) === M.norm(t)) || t, places: {} });
    d.places.forEach(p => {
      if (p.kind === 'named') { (p.holds || []).forEach(t => { const x = P(t); x.places[p.id] = { id: p.id, name: p.name, named: true, note: p.note || '' }; }); return; }
      (p.files || []).forEach(f => { const t = M.what(d, p.id, f.p, all);
        if (!t) { const u = un[p.id] || (un[p.id] = { id: p.id, name: p.name, count: 0, bytes: 0 }); u.count++; u.bytes += f.s || 0; return; }
        const x = P(t), e = x.places[p.id] || (x.places[p.id] = { id: p.id, name: p.name, count: 0, bytes: 0 }); e.count++; e.bytes += f.s || 0; });
    });
    const projects = Object.values(proj).map(x => ({ title: x.title, places: Object.values(x.places) })).sort((a, b) => a.title.localeCompare(b.title));
    return { projects, unmatched: Object.values(un), titles: all, empty: !d.places.length };
  };
  /* FIND: a show, a name, a date; every word has to be in the file's path or date */
  M.find = function (q, limit) {
    const w = String(q || '').toLowerCase().split(/\s+/).filter(Boolean); if (!w.length) return [];
    const out = []; for (const p of read().places) { if (p.kind === 'named') { const hay = (p.name + ' ' + (p.note || '') + ' ' + (p.holds || []).join(' ')).toLowerCase(); if (w.every(x => hay.indexOf(x) >= 0)) out.push({ place: p, file: null }); continue; }
      for (const f of p.files || []) { const hay = (p.name + ' ' + f.p + ' ' + f.d).toLowerCase(); if (w.every(x => hay.indexOf(x) >= 0)) { out.push({ place: p, file: f }); if (out.length >= (limit || 200)) return out; } } }
    return out;
  };
  /* one place's files, folder by folder */
  M.folders = function (placeId, titles) {
    const d = read(), p = d.places.find(x => x.id === placeId); if (!p || p.kind === 'named') return [];
    const by = {}; (p.files || []).forEach(f => { const i = f.p.lastIndexOf('/'), dir = i > 0 ? f.p.slice(0, i) : ''; (by[dir] = by[dir] || []).push(Object.assign({}, f, { n: f.p.slice(i + 1), what: M.what(d, p.id, f.p, titles) })); });
    return Object.keys(by).sort().map(dir => ({ dir, what: fixOf(d.fix, p.id, dir), files: by[dir] }));
  };
  M.trim = (inS, outS, dur) => { const a = Math.max(0, Math.min(+inS || 0, dur)), b = Math.max(a + 0.2, Math.min(+outS || dur, dur)); return { trimStart: a, trimEnd: Math.max(0, dur - b), secs: Math.round((b - a) * 10) / 10 }; };
  M.time = s => { s = Math.max(0, +s || 0); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };
  M.clipName = (title, role, ext) => ([title, role].filter(Boolean).join('_').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') || 'clip') + '_clip.' + (ext || 'mp4');
  g.FootMap = M;
  if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
