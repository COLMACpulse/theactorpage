/*
  VIRTUAL RESUME v0.3 · Actor Edition
  You shoot your own work. This turns it into résumé-worthy experience, honestly,
  and gives you a one-page résumé and a page casting can click.
  Vanilla JS, offline, no account.
*/
(function () {
  'use strict';
  const VERSION = '0.3.0';
  const SCHEMA = 'ACT.RESUME/0.3';
  const E = window.ResumeEngine;

  // ---------------------------------------------------------------- utils
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = () => new Date().toISOString();
  const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const fmtShort = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const slug = s => String(s || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'resume';
  const once = (el, ev, ms) => new Promise((res, rej) => { let t; const on = () => { clearTimeout(t); off(); res(); }, er = () => { clearTimeout(t); off(); rej(new Error('media')); }; const off = () => { el.removeEventListener(ev, on); el.removeEventListener('error', er); }; el.addEventListener(ev, on); el.addEventListener('error', er); if (ms) t = setTimeout(() => { off(); rej(new Error('timeout')); }, ms); });
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3400); }

  // ---------------------------------------------------------------- storage
  function idb(name, ver, upgrade) {
    return new Promise((res) => { try { const r = indexedDB.open(name, ver); r.onupgradeneeded = () => upgrade && upgrade(r.result); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  }
  const ops = (dbp) => {
    const op = async (store, mode, fn) => { const db = await dbp; if (!db) return null; return new Promise((res, rej) => { const t = db.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => res(r && 'result' in r ? r.result : undefined); t.onerror = () => rej(t.error); }); };
    return op;
  };
  const DBP = idb('vresume_v03', 1, db => { db.createObjectStore('lib'); db.createObjectStore('media'); });
  const op = ops(DBP);
  const DB = { getLib: () => op('lib', 'readonly', s => s.get('main')), putLib: l => op('lib', 'readwrite', s => s.put(JSON.parse(JSON.stringify(l)), 'main')), getMedia: k => op('media', 'readonly', s => s.get(k)), putMedia: (k, b) => op('media', 'readwrite', s => s.put(b, k)), delMedia: k => op('media', 'readwrite', s => s.delete(k)) };

  // read another ACT tool's storage without creating it if it isn't there
  async function peek(name) {
    try { if (indexedDB.databases) { const l = await indexedDB.databases(); if (!l.some(d => d.name === name)) return null; } } catch (e) { }
    return new Promise(res => { try { const r = indexedDB.open(name); r.onupgradeneeded = () => { r.transaction.abort(); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  }
  async function peekGet(db, store, key) { if (!db || !db.objectStoreNames.contains(store)) return null; return new Promise(res => { try { const t = db.transaction(store, 'readonly'); const r = t.objectStore(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }); }

  const emptyLib = () => ({ schema: SCHEMA, app: 'VIRTUAL RESUME ' + VERSION, created: now(), updated: now(), me: { name: '', union: '', email: '', phone: '', rep: '', height: '', hair: '', eyes: '', location: '', links: '' }, skills: [], training: [], pieces: [], headshot: null, paper: '8x10', headTop: false, lastSaved: null, dirty: 0 });
  const S = { lib: null, tab: 'work', urls: {}, blobs: {}, headUrl: null, editing: null, sources: { archbook: null, slate: null } };
  let saveT = null;
  function touch() { S.lib.updated = now(); S.lib.dirty = (S.lib.dirty || 0) + 1; clearTimeout(saveT); saveT = setTimeout(() => DB.putLib(S.lib), 250); }
  const piece = id => S.lib.pieces.find(p => p.id === id);

  // ---------------------------------------------------------------- render
  const ICON = {
    work: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
    training: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/></svg>',
    you: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12h12M13 6l6 6-6 6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/></svg>',
    close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    theme: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>'
  };
  const TABS = [['work', 'WORK'], ['training', 'TRAINING'], ['you', 'YOU'], ['next', 'NEXT'], ['send', 'SEND']];
  function render() {
    closeSheet(true);
    $('#app').innerHTML = `<div class="shell">
      <header class="top"><div class="title"><b>VIRTUAL RESUME</b><span>${esc(S.lib.me.name || 'Make the work. It becomes the résumé.')}</span></div><button class="iconbtn" data-a="theme" aria-label="Light or dark">${ICON.theme}</button></header>
      <main id="main">${({ work: vWork, training: vTraining, you: vYou, next: vNext, send: vSend }[S.tab])()}</main>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="${S.tab === k ? 'on' : ''}" data-a="tab" data-t="${k}">${ICON[k]}<span>${l}</span>${k === 'next' && nextList().length ? '<i class="badge"></i>' : ''}</button>`).join('')}</nav></div>`;
    const drop = $('#drop');
    if (drop) { ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); })); ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); })); drop.addEventListener('drop', e => addClips(e.dataTransfer.files)); }
    if (S.tab === 'send') fitPaper();
  }
  function status(p) {
    const c = E.countsCheck(p);
    if (c.section === 'clip') return `<span class="st clip">Clip · on your page</span>`;
    if (c.counts) return `<span class="st credit">Credit</span>`;
    return `<span class="st ${c.of - c.done === 1 ? 'close' : 'far'}">${c.done} of ${c.of} to a credit</span>`;
  }

  // ---------------------------------------------------------------- WORK
  function vWork() {
    const L = S.lib, credits = L.pieces.filter(p => E.countsCheck(p).counts).length;
    return `${L.pieces.length ? '' : `<div style="padding:12px 0 4px"><div class="kicker">THEACTORPAGE · ACT</div><h1 style="font-size:30px;letter-spacing:.1em">VIRTUAL RESUME</h1>
        <div style="color:var(--tung-text);letter-spacing:.04em;margin-top:2px">Make the work. It becomes the résumé.</div>
        <p class="dim" style="margin:8px 0 0;max-width:36em">No credits yet? Shoot your own: a scene with a friend, a short, a monologue. Drop it here. Finish it and show it, and it stands on your résumé as a real credit. The rest goes on your page as clips.</p></div>`}
      <div class="drop" id="drop" data-a="addclip" role="button" tabindex="0"><b>Drop your work</b><span class="dim" style="font-size:14px">Scenes, shorts, monologues, self-tapes.</span><span class="btn pri">Choose videos</span></div>
      <div class="row" style="margin-bottom:14px"><button class="btn" data-a="addblank">Add without a video</button>${S.sources.archbook ? `<button class="btn ghost" data-a="fromarch">Bring in from ARCHBOOK</button>` : ''}</div>
      ${L.pieces.length ? `<div class="kicker">${L.pieces.length} ${L.pieces.length === 1 ? 'piece' : 'pieces'} · ${credits} ${credits === 1 ? 'credit' : 'credits'}</div>` + L.pieces.map(p => `<button class="piece" data-a="edit" data-id="${p.id}">${p.clip && p.clip.thumb ? `<img src="${p.clip.thumb}" alt="">` : `<span class="ph">${p.link ? 'LINK' : 'NO VIDEO'}</span>`}
          <span class="b"><b>${esc(p.title || 'Untitled')}</b><span class="faint" style="font-size:13px">${esc((E.TYPES[p.type] || {}).label || 'Pick a type')}${p.character ? ' · ' + esc(p.character) : ''}${p.clip ? ' · ' + fmtShort(p.clip.dur) : ''}</span><br>${status(p)}</span></button>`).join('') : ''}`;
  }
  async function addClips(files) {
    files = Array.from(files || []).filter(f => /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm)$/i.test(f.name));
    if (!files.length) return;
    let last = null;
    for (const f of files) {
      const p = await pieceFromBlob(f, f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
      last = p;
    }
    touch(); render(); if (files.length === 1 && last) editSheet(last.id); else toast(files.length + ' pieces added. Tap one to tell it what it is.');
  }
  async function pieceFromBlob(blob, title) {
    const id = rid(), url = URL.createObjectURL(blob);
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    let dur = 0, thumb = '';
    try { await once(v, 'loadedmetadata', 10000); dur = isFinite(v.duration) ? v.duration : 0; v.currentTime = Math.min(1, dur * 0.2); await once(v, 'seeked', 6000); const c = document.createElement('canvas'); c.width = 320; c.height = 180; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 320, 180); const r = Math.min(320 / v.videoWidth, 180 / v.videoHeight); g.drawImage(v, (320 - v.videoWidth * r) / 2, (180 - v.videoHeight * r) / 2, v.videoWidth * r, v.videoHeight * r); thumb = c.toDataURL('image/jpeg', 0.7); } catch (e) { }
    const p = { id, type: 'scene', title: title.trim(), character: '', roleType: 'Lead', company: '', year: String(new Date().getFullYear()), did: ['Acted'], finished: false, link: '', shownAt: '', note: '', onPage: true, clip: { name: blob.name || title + '.mp4', size: blob.size, type: blob.type, dur: +dur.toFixed(2), thumb }, at: now() };
    S.lib.pieces.unshift(p); S.urls[id] = url; S.blobs[id] = blob;
    try { await DB.putMedia(id, blob); } catch (e) { }
    return p;
  }

  // piece editor
  function editSheet(id) {
    const p = piece(id); if (!p) return; S.editing = id;
    const c = E.countsCheck(p), t = E.TYPES[p.type] || {};
    const film = c.section === 'film', theatre = c.section === 'theatre';
    openSheet(`<div class="kicker">Your work</div>
      ${S.urls[p.id] ? `<video src="${S.urls[p.id]}" controls playsinline style="width:100%;max-height:34vh;background:#000;border-radius:10px"></video>` : ''}
      <label class="lab" for="p_title">Title</label><input class="field" id="p_title" data-p="title" value="${esc(p.title)}" placeholder="What's it called?">
      <label class="lab">What is it?</label><div class="row" style="gap:6px">${Object.entries(E.TYPES).map(([k, v]) => `<button class="chip ${p.type === k ? 'on' : ''}" data-a="ptype" data-v="${k}" style="min-height:40px">${esc(v.label.replace(' (not finished as a film)', ''))}</button>`).join('')}</div>
      ${c.section === 'clip' ? `<p class="msg" style="font-size:14px">${esc(c.note)}${p.type === 'scene' ? ' Finish it as a short (title, edit, credits, put it online) and set it to Short film: then it\'s a credit.' : ''}</p>` : ''}
      <div class="grid2"><div><label class="lab" for="p_char">Your character</label><input class="field" id="p_char" data-p="character" value="${esc(p.character)}" placeholder="Name"></div><div><label class="lab" for="p_year">Year</label><input class="field" id="p_year" data-p="year" value="${esc(p.year)}" inputmode="numeric"></div></div>
      ${c.section !== 'clip' ? `<label class="lab">Size of the role</label><div class="row" style="gap:6px">${E.ROLES.map(r => `<button class="chip ${p.roleType === r ? 'on' : ''}" data-a="prole" data-v="${r}" style="min-height:40px">${r}</button>`).join('')}</div>` : ''}
      <label class="lab">You also</label><div class="row" style="gap:6px">${['Wrote', 'Directed', 'Produced', 'Edited'].map(d => `<button class="chip ${(p.did || []).includes(d) ? 'on' : ''}" data-a="pdid" data-v="${d}" style="min-height:40px">${d}</button>`).join('')}</div>
      ${c.section !== 'clip' ? `<label class="lab" for="p_co">${theatre ? 'Company or venue' : 'Director or production'}</label><input class="field" id="p_co" data-p="company" value="${esc(p.company)}" placeholder="${theatre ? 'e.g. North Park Players' : 'e.g. Dir. Ana Ruiz. Leave blank if it was you'}">
        <button class="flag ${p.finished ? 'on' : ''}" data-a="pfin" style="margin-top:10px;width:100%">${theatre ? 'It was performed for an audience' : "It's finished: edited, beginning to end"}</button>` : ''}
      ${film ? `<label class="lab" for="p_link">Where people can watch it</label><input class="field" id="p_link" data-p="link" value="${esc(p.link)}" placeholder="YouTube or Vimeo link" inputmode="url">
        <input class="field" style="margin-top:6px" id="p_shown" data-p="shownAt" value="${esc(p.shownAt)}" placeholder="or: festival or screening name">` : `<label class="lab" for="p_link">Link (optional)</label><input class="field" id="p_link" data-p="link" value="${esc(p.link)}" placeholder="YouTube or Vimeo link" inputmode="url">`}
      ${c.section !== 'clip' ? `<div class="card" style="margin-top:12px" id="steps">${stepsHtml(p)}</div>` : ''}
      <label class="lab" for="p_note">A line about it for your page (optional)</label><input class="field" id="p_note" data-p="note" value="${esc(p.note)}" placeholder="e.g. Shot in one afternoon with two friends">
      <div class="row" style="margin-top:12px">
        <button class="flag ${p.onPage !== false ? 'on' : ''}" data-a="ponpage">On your page</button>
        ${c.section !== 'clip' && !c.counts ? `<button class="flag ${p.include ? 'on' : ''}" data-a="pinclude">Put it on the résumé anyway (marked in progress)</button>` : ''}
      </div>
      <div class="row" style="margin-top:14px"><button class="btn pri" style="flex:1" data-a="closesheet">Done</button><button class="btn bad" data-a="pdel">Delete</button></div>`);
  }
  function stepsHtml(p) {
    const c = E.countsCheck(p);
    return `<div class="kicker">${c.counts ? 'This is a credit' : 'To count as a credit'}</div><div class="steps">${c.steps.map(s => `<div class="s"><i class="${s.ok ? 'y' : 'n'}">${s.ok ? '✓' : ''}</i>${esc(s.label)}</div>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- TRAINING
  function vTraining() {
    const T = S.lib.training;
    return `<div class="kicker">Training</div><h1 style="font-size:24px;margin-bottom:6px">Classes, coaches, workshops</h1>
      <p class="dim" style="font-size:14px;margin:0 0 12px">One line each: what, who taught it, where. A single class belongs on the résumé.</p>
      ${T.map((t, i) => `<div class="trow"><input class="field" data-t="${i}" data-k="course" value="${esc(t.course)}" placeholder="Scene Study" aria-label="Class"><input class="field" data-t="${i}" data-k="teacher" value="${esc(t.teacher)}" placeholder="Teacher" aria-label="Teacher"><input class="field" data-t="${i}" data-k="school" value="${esc(t.school)}" placeholder="School or studio" aria-label="School"><button class="iconbtn" data-a="trdel" data-i="${i}" aria-label="Remove">${ICON.close}</button></div>`).join('')}
      <button class="btn" data-a="tradd">Add a class</button>`;
  }

  // ---------------------------------------------------------------- YOU
  function vYou() {
    const m = S.lib.me, f = (k, label, ph, im) => `<label class="lab" for="m_${k}">${label}</label><input class="field" id="m_${k}" data-m="${k}" value="${esc(m[k])}" placeholder="${esc(ph)}" ${im ? `inputmode="${im}"` : ''}>`;
    const sugg = ['Fluent Spanish', 'British accent (RP)', 'Southern accent', 'Stage combat', 'Boxing', 'Horseback riding', 'Guitar', 'Singing (baritone)', 'Dance', 'Driver licence', 'Improv', 'Swimming'].filter(s => !S.lib.skills.includes(s));
    return `<div class="kicker">You</div><h1 style="font-size:24px;margin-bottom:8px">The top of your résumé</h1>
      ${S.sources.slate ? `<div class="msg" style="font-size:14px">Found your SLATE MAKER kit. <button class="btn sm" data-a="fromslate">Bring in name, height, rep and headshot</button></div>` : ''}
      <div class="card">
        <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${S.headUrl ? `<img src="${S.headUrl}" alt="" style="width:96px;aspect-ratio:4/5;object-fit:cover;border-radius:8px;flex:none">` : ''}<div style="flex:1"><button class="btn" data-a="addhead">${S.headUrl ? 'Change headshot' : 'Add headshot'}</button></div></div>
        ${f('name', 'Name', 'As it appears on your résumé')}
        <label class="lab">Union</label><div class="row" style="gap:6px">${['Non-union', 'SAG-AFTRA eligible', 'SAG-AFTRA', 'AEA'].map(u => `<button class="chip ${m.union === u ? 'on' : ''}" data-a="union" data-v="${u}" style="min-height:40px">${u}</button>`).join('')}</div>
        <div class="grid2">${f('email', 'Email', 'you@email.com', 'email')}${f('phone', 'Phone', '', 'tel')}</div>
        ${f('rep', 'Rep', 'Agency or manager, if you have one')}
        <div class="grid2">${f('height', 'Height', "5'10\"")}${f('location', 'Based in', 'City')}${f('hair', 'Hair', 'Brown')}${f('eyes', 'Eyes', 'Hazel')}</div>
      </div>
      <div class="card"><b>Special skills</b><p class="faint" style="font-size:13px;margin:2px 0 8px">Only what you can do on set tomorrow.</p>
        <div class="row" style="gap:6px">${S.lib.skills.map((s, i) => `<button class="chip tag" data-a="skdel" data-i="${i}">${esc(s)}<span class="x">×</span></button>`).join('')}</div>
        <input class="field" style="margin-top:8px" id="skin" data-sk="1" placeholder="Type a skill and press Enter" enterkeyhint="done">
        <div class="row" style="gap:6px;margin-top:8px">${sugg.slice(0, 8).map(s => `<button class="chip" data-a="skadd" data-v="${esc(s)}">+ ${esc(s)}</button>`).join('')}</div></div>`;
  }

  // ---------------------------------------------------------------- NEXT
  function nextList() { return E.nextToMake(S.lib.pieces, S.lib.training, S.lib.skills, S.shootList || []); }
  function vNext() {
    const N = nextList();
    const kind = { onestep: 'Close', finish: 'Make', shoot: 'Shoot', training: 'Add', skills: 'Add' };
    return `<div class="kicker">Next to make</div><h1 style="font-size:24px;margin-bottom:6px">What moves your résumé</h1>
      <p class="dim" style="font-size:14px;margin:0 0 12px">Nearest win first. SLATE MAKER and ACTOR OS shoot it; ARCHBOOK files it.</p>
      ${N.map(n => `<button class="next" data-a="${n.kind === 'onestep' ? 'edit' : n.kind === 'training' ? 'tab' : n.kind === 'skills' ? 'tab' : 'noop'}" ${n.id ? `data-id="${n.id}"` : ''} ${n.kind === 'training' ? 'data-t="training"' : n.kind === 'skills' ? 'data-t="you"' : ''}><span class="k">${kind[n.kind]}</span><span>${esc(n.text)}</span></button>`).join('') || '<p class="dim">Nothing pressing. Your résumé is in shape.</p>'}`;
  }

  // ---------------------------------------------------------------- SEND
  function model() { return E.resumeModel(S.lib.me, S.lib.pieces, S.lib.training, S.lib.skills); }
  function paperHtml(m) {
    const rows = rs => rs.map(r => `<tr><td>${esc(r.title)}${r.unfinished ? ' <small>(in progress)</small>' : ''}</td><td>${esc(r.role)}</td><td>${esc(r.company)}</td></tr>`).join('');
    const head = `<div class="nm">${esc(m.name || 'YOUR NAME')}</div>${m.union ? `<div class="un">${esc(m.union)}</div>` : ''}
      ${m.contact.length || m.rep ? `<div class="ln">${esc([m.contact.join(' · '), m.rep && 'Rep: ' + m.rep].filter(Boolean).join(' · '))}</div>` : ''}
      ${m.stats.length ? `<div class="ln">${esc(m.stats.join(' · '))}</div>` : ''}`;
    return `<div class="rz">${S.lib.headTop && S.headUrl ? `<div class="top"><img src="${S.headUrl}" alt=""><div>${head}</div></div>` : head}
      ${m.film.length ? `<h4>Film &amp; New Media</h4><table>${rows(m.film)}</table>` : ''}
      ${m.theatre.length ? `<h4>Theatre</h4><table>${rows(m.theatre)}</table>` : ''}
      ${m.training.length ? `<h4>Training</h4><table>${m.training.map(t => `<tr><td>${esc(t.course)}</td><td>${esc(t.teacher)}</td><td>${esc(t.school)}</td></tr>`).join('')}</table>` : ''}
      ${m.skills.length ? `<h4>Special Skills</h4><p>${esc(m.skills.join(', '))}</p>` : ''}</div>`;
  }
  function vSend() {
    const m = model(), L = S.lib;
    return `<div class="kicker">Send</div><h1 style="font-size:24px;margin-bottom:8px">Your résumé and your page</h1>
      <div class="row"><span class="dim" style="font-size:14px">Paper</span>${[['8x10', '8×10 (back of headshot)'], ['letter', 'Letter']].map(([k, l]) => `<button class="chip ${L.paper === k ? 'on' : ''}" data-a="paper" data-v="${k}">${l}</button>`).join('')}
        <button class="flag ${L.headTop ? 'on' : ''}" data-a="headtop" ${S.headUrl ? '' : 'disabled'}>Headshot at the top</button></div>
      <div class="paperwrap" id="pw"><div class="paper" id="paper" style="height:${L.paper === 'letter' ? 1056 : 960}px;overflow:hidden">${paperHtml(m)}</div></div>
      <div id="fitnote"></div>
      ${m.held.length ? `<div class="card"><div class="kicker">Not on the résumé yet</div>${m.held.map(h => `<button class="next" data-a="edit" data-id="${h.id}"><span class="k">Needs</span><span><b>${esc(h.title || 'Untitled')}</b>: ${esc(h.missing.join(', ').toLowerCase())}</span></button>`).join('')}</div>` : ''}
      <div class="card"><div class="row">
        <button class="btn pri" data-a="print">Print / Save PDF</button>
        <button class="btn" data-a="copytext">Copy as text</button>
        <button class="btn" data-a="pagezip">Your page (.zip)</button></div>
        <p class="faint" style="font-size:13px;margin:8px 0 0">Text is for casting-site forms. Your page is a folder you can host anywhere: open index.html to see it.</p></div>
      <div class="card"><b>Library file</b><p class="dim" style="font-size:14px;margin:4px 0 10px">${L.lastSaved ? 'Last saved ' + new Date(L.lastSaved).toLocaleString() + '.' : '<b style="color:var(--tung-text)">Never saved to a file.</b>'} Holds everything but the videos.</p>
        <div class="row"><button class="btn" data-a="savelib">Save library file</button><button class="btn ghost" data-a="openlib">Open a library file</button></div></div>
      <p class="faint" style="font-size:12px">VIRTUAL RESUME ${VERSION}</p>`;
  }
  function fitPaper() {
    const pw = $('#pw'), pp = $('#paper'); if (!pw || !pp) return;
    const rz = pp.querySelector('.rz'); let size = 11;
    rz.style.fontSize = size + 'pt';
    const H = S.lib.paper === 'letter' ? 1056 : 960;
    while (rz.scrollHeight > H && size > 8.5) { size -= 0.5; rz.style.fontSize = size + 'pt'; rz.querySelectorAll('.nm').forEach(n => n.style.fontSize = (size * 2.2) + 'pt'); }
    S.fontPt = size;
    const over = rz.scrollHeight > H;
    $('#fitnote').innerHTML = over ? `<p class="msg bad" style="font-size:14px">Runs past one page even at ${size}pt. Cut your weakest lines: casting reads the top third.</p>` : size < 11 ? `<p class="faint" style="font-size:13px">Tightened to ${size}pt to fit one page.</p>` : '';
    const k = Math.min(1, (pw.clientWidth - 24) / 768); pp.style.transform = `scale(${k})`; pw.style.height = (H * k + 24) + 'px';
  }
  function printNow() {
    const m = model();
    $('#pagesize').textContent = S.lib.paper === 'letter' ? '@page{size:letter;margin:.6in}' : '@page{size:8in 10in;margin:.5in}';
    $('#print').innerHTML = `<div class="paper">${paperHtml(m)}</div>`;
    const rz = $('#print .rz'); if (rz && S.fontPt) { rz.style.fontSize = S.fontPt + 'pt'; rz.querySelectorAll('.nm').forEach(n => n.style.fontSize = (S.fontPt * 2.2) + 'pt'); }
    setTimeout(() => window.print(), 60);
  }
  async function pageZip() {
    const m = model(), entries = [], base = slug(m.name || 'my') + '_page/';
    let head = null;
    if (S.lib.headshot && S.blobs.__head) { const ext = (S.lib.headshot.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0]; head = 'media/headshot' + ext; entries.push({ name: base + head, bytes: new Uint8Array(await S.blobs.__head.arrayBuffer()) }); }
    const pieces = [];
    for (const p of S.lib.pieces) {
      if (p.onPage === false) continue;
      const q = Object.assign({}, p);
      if (S.blobs[p.id]) { const ext = ((p.clip && p.clip.name) || '').match(/\.[a-z0-9]+$/i); q.media = 'media/' + slug(p.title || p.id) + '_' + p.id.slice(-4) + (ext ? ext[0].toLowerCase() : '.mp4'); entries.push({ name: base + q.media, bytes: new Uint8Array(await S.blobs[p.id].arrayBuffer()) }); }
      if (p.clip && p.clip.thumb && q.media) q.poster = p.clip.thumb;
      pieces.push(q);
    }
    entries.unshift({ name: base + 'index.html', bytes: E.enc(E.pageHTML(m, pieces, { headshot: head })) });
    entries.push({ name: base + 'resume.txt', bytes: E.enc(E.resumeText(m)) });
    deliver(new Blob([E.makeZip(entries)], { type: 'application/zip' }), slug(m.name || 'my') + '_page.zip');
  }
  async function deliver(blob, name) {
    try { const f = new File([blob], name, { type: blob.type }); if (isPhone() && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ---------------------------------------------------------------- imports from the other ACT tools
  async function scanSources() {
    const ab = await peek('archbook_v03');
    if (ab) { const lib = await peekGet(ab, 'lib', 'main'); if (lib && lib.clips && lib.clips.length) S.sources.archbook = { db: ab, lib }; S.shootList = lib ? (lib.wants || []) : []; }
    const sl = await peek('slate_v04');
    if (sl) { const kit = await peekGet(sl, 'kv', 'kit'); if (kit && kit.name) S.sources.slate = { db: sl, kit }; }
  }
  async function fromArch() {
    const A = S.sources.archbook; if (!A) return;
    const have = new Set(S.lib.pieces.map(p => p.clip && p.clip.name + '|' + p.clip.size));
    const list = A.lib.clips.filter(c => !have.has(c.name + '|' + c.size));
    openSheet(`<div class="kicker">Your ARCHBOOK clips</div>${list.length ? list.map(c => `<button class="piece" data-a="archadd" data-id="${c.id}">${c.thumb ? `<img src="${c.thumb}" alt="">` : '<span class="ph">CLIP</span>'}<span class="b"><b>${esc(c.name)}</b><span class="faint" style="font-size:13px">${fmtShort(c.dur)}</span></span></button>`).join('') : '<p class="dim">Every ARCHBOOK clip is already here.</p>'}`);
  }
  async function archAdd(id, el) {
    const A = S.sources.archbook, c = A.lib.clips.find(x => x.id === id); if (!c) return;
    const blob = await peekGet(A.db, 'media', id);
    if (!blob) { toast("ARCHBOOK doesn't keep a copy of that clip on this device. Drop the file here instead."); return; }
    const f = new File([blob], c.name, { type: blob.type || c.type || 'video/mp4' });
    await pieceFromBlob(f, c.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    touch(); el.remove(); toast('Added. Tap it to say what it is.');
  }
  async function fromSlate() {
    const K = S.sources.slate; if (!K) return; const k = K.kit, m = S.lib.me;
    ['name', 'height', 'location', 'rep'].forEach(x => { if (k[x] && !m[x]) m[x] = k[x]; });
    if (k.links && !m.links) m.links = k.links;
    const h = await peekGet(K.db, 'kv', 'headshot');
    if (h && h.blob && !S.lib.headshot) await setHead(h.blob, h.name);
    touch(); render(); toast('Brought in from SLATE MAKER.');
  }
  async function setHead(blob, name) {
    if (S.headUrl) URL.revokeObjectURL(S.headUrl);
    S.blobs.__head = blob; S.headUrl = URL.createObjectURL(blob); S.lib.headshot = { name: name || 'headshot.jpg' };
    try { await DB.putMedia('__head', blob); } catch (e) { }
  }

  // ---------------------------------------------------------------- sheet
  function openSheet(html) {
    let scrim = $('.scrim'), sh = $('.sheet');
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.dataset.a = 'closesheet'; document.body.appendChild(scrim); }
    if (!sh) { sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); document.body.appendChild(sh); }
    const y = sh.scrollTop;
    sh.innerHTML = `<div class="grab"></div><button class="iconbtn x" data-a="closesheet" aria-label="Close">${ICON.close}</button>` + html;
    sh.scrollTop = y;
    requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  }
  function closeSheet(instant) { const scrim = $('.scrim'), sh = $('.sheet'); if (!sh) return; scrim.classList.remove('on'); sh.classList.remove('on'); const k = () => { scrim.remove(); sh.remove(); }; if (instant) k(); else setTimeout(k, 180); }

  // ---------------------------------------------------------------- actions
  async function act(a, ds, el) {
    ds = ds || {}; const L = S.lib, p = S.editing ? piece(S.editing) : null;
    switch (a) {
      case 'tab': S.tab = ds.t; S.editing = null; render(); window.scrollTo(0, 0); break;
      case 'theme': { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); const nx = cur === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('resume_theme', nx); } catch (e) { } break; }
      case 'addclip': $('#clipin').click(); break;
      case 'addblank': { const q = { id: rid(), type: 'short', title: '', character: '', roleType: 'Lead', company: '', year: String(new Date().getFullYear()), did: ['Acted'], finished: false, link: '', shownAt: '', note: '', onPage: true, clip: null, at: now() }; L.pieces.unshift(q); touch(); render(); editSheet(q.id); break; }
      case 'edit': editSheet(ds.id); break;
      case 'closesheet': S.editing = null; render(); break;
      case 'ptype': p.type = ds.v; touch(); editSheet(p.id); break;
      case 'prole': p.roleType = ds.v; touch(); editSheet(p.id); break;
      case 'pdid': { p.did = p.did || []; const i = p.did.indexOf(ds.v); if (i >= 0) p.did.splice(i, 1); else p.did.push(ds.v); touch(); editSheet(p.id); break; }
      case 'pfin': p.finished = !p.finished; touch(); editSheet(p.id); break;
      case 'ponpage': p.onPage = p.onPage === false; touch(); editSheet(p.id); break;
      case 'pinclude': p.include = !p.include; touch(); editSheet(p.id); break;
      case 'pdel': if (confirm('Delete this piece? The video on your device is not touched.')) { L.pieces = L.pieces.filter(x => x.id !== p.id); DB.delMedia(p.id); if (S.urls[p.id]) URL.revokeObjectURL(S.urls[p.id]); delete S.urls[p.id]; delete S.blobs[p.id]; S.editing = null; touch(); render(); } break;
      case 'fromarch': fromArch(); break;
      case 'archadd': archAdd(ds.id, el); break;
      case 'fromslate': fromSlate(); break;
      case 'tradd': L.training.push({ course: '', teacher: '', school: '' }); touch(); render(); { const ins = document.querySelectorAll('.trow input[data-k="course"]'); if (ins.length) ins[ins.length - 1].focus(); } break;
      case 'trdel': L.training.splice(+ds.i, 1); touch(); render(); break;
      case 'union': L.me.union = L.me.union === ds.v ? '' : ds.v; touch(); render(); break;
      case 'addhead': $('#headin').click(); break;
      case 'skadd': if (!L.skills.includes(ds.v)) L.skills.push(ds.v); touch(); render(); break;
      case 'skdel': L.skills.splice(+ds.i, 1); touch(); render(); break;
      case 'paper': L.paper = ds.v; touch(); render(); break;
      case 'headtop': L.headTop = !L.headTop; touch(); render(); break;
      case 'print': printNow(); break;
      case 'copytext': { const t = E.resumeText(model()); try { await navigator.clipboard.writeText(t); toast('Résumé copied as text.'); } catch (e) { openSheet(`<div class="kicker">Copy this</div><textarea class="field" style="min-height:50vh;font-family:var(--mono);font-size:13px">${esc(t)}</textarea>`); } break; }
      case 'pagezip': pageZip(); break;
      case 'savelib': L.lastSaved = now(); L.dirty = 0; await DB.putLib(L); deliver(new Blob([JSON.stringify(Object.assign({}, L, { note: 'Videos and headshot are not inside this file.' }))], { type: 'application/json' }), slug(L.me.name || 'my') + '_virtual_resume.json'); render(); break;
      case 'openlib': $('#libin').click(); break;
      case 'noop': break;
    }
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t || t.disabled || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; e.preventDefault(); act(t.dataset.a, Object.assign({}, t.dataset), t); });
  document.addEventListener('input', e => {
    const t = e.target, L = S.lib;
    if (t.dataset.p && S.editing) { const p = piece(S.editing); p[t.dataset.p] = t.value; touch(); const st = $('#steps'); if (st) st.innerHTML = stepsHtml(p); return; }
    if (t.dataset.m) { L.me[t.dataset.m] = t.value; touch(); if (t.dataset.m === 'name') { const s = document.querySelector('.top .title span'); if (s) s.textContent = t.value || 'Make the work. It becomes the résumé.'; } return; }
    if (t.dataset.t !== undefined && t.dataset.k) { L.training[+t.dataset.t][t.dataset.k] = t.value; touch(); return; }
  });
  document.addEventListener('keydown', e => {
    if (e.target.dataset && e.target.dataset.sk && e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (v && !S.lib.skills.includes(v)) { S.lib.skills.push(v); touch(); render(); const n = $('#skin'); if (n) n.focus(); } }
    if (e.key === 'Escape' && $('.sheet')) act('closesheet');
  });
  $('#clipin').addEventListener('change', e => { const fs = Array.from(e.target.files); e.target.value = ''; addClips(fs); });
  $('#headin').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; await setHead(f, f.name); touch(); render(); });
  $('#libin').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const d = JSON.parse(await f.text()); if (d.schema !== SCHEMA) throw new Error('Not a VIRTUAL RESUME library file.'); delete d.note; S.lib = Object.assign(emptyLib(), d); await DB.putLib(S.lib); await loadMedia(); render(); toast('Opened. Videos re-link if they are kept on this device.'); } catch (er) { toast(er.message); } });
  window.addEventListener('resize', () => { if (S.tab === 'send') fitPaper(); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { if (!e.target.closest('#drop')) e.preventDefault(); });
  async function loadMedia() {
    for (const p of S.lib.pieces) { if (S.urls[p.id]) continue; const b = await DB.getMedia(p.id).catch(() => null); if (b) { S.blobs[p.id] = b; S.urls[p.id] = URL.createObjectURL(b); } }
    const h = await DB.getMedia('__head').catch(() => null); if (h) { S.blobs.__head = h; if (S.headUrl) URL.revokeObjectURL(S.headUrl); S.headUrl = URL.createObjectURL(h); }
  }

  // ---------------------------------------------------------------- boot
  (async function boot() {
    try { const th = localStorage.getItem('resume_theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
    let lib = null; try { lib = await DB.getLib(); } catch (e) { }
    S.lib = lib && lib.schema === SCHEMA ? Object.assign(emptyLib(), lib) : emptyLib();
    await loadMedia();
    await scanSources().catch(() => { });
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
    render();
    window.RESUME = { S, act, E, version: VERSION };
  })();
})();
