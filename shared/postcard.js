/* THEACTORPAGE THE POSTCARD: your plug as a card, for your socials, an email or the mail.
   Four looks (design only: the words on it are always yours), four sizes, and the links:
     your page, always (it opens right at the credit), where to watch when you paste it in,
     your rep as plain text if you tick it, a QR code on the printed back if you want one.
   Drawn on this device. It never posts for you, never signs in to anything, and nothing reports back who opened what.
   localStorage theactorpage_postcard_v1: the look you keep. Your socials live in YOU (shared/you.js).
   Pure parts run in Node for the tests. */
(function (g) {
  'use strict';
  const P = {}, KEY = 'theactorpage_postcard_v1';
  P.KEY = KEY;
  P.LOOKS = [['slate', 'SLATE'], ['bill', 'BILLBOARD'], ['paper', 'PAPER'], ['plain', 'WORDS ONLY']];
  /* [key, name, width, height, where it goes]. print: 4 x 6 at 300 dpi, plus 1/8 in bleed on every side */
  P.SIZES = [['square', 'SQUARE POST', 1080, 1080, 'Instagram, Facebook, X'], ['story', 'TALL STORY', 1080, 1920, 'Stories, Reels, TikTok'], ['wide', 'WIDE', 1200, 630, 'email, a link, LinkedIn'], ['print', '4 × 6 POSTCARD', 1875, 1275, 'printed, 300 dpi, ⅛ in bleed']];
  P.BLEED = 38;
  P.size = k => P.SIZES.find(s => s[0] === k) || P.SIZES[0];
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const LS = () => { try { return g.localStorage; } catch (e) { return null; } };

  /* ---------- the look you keep ---------- */
  P.settings = function () { try { const d = JSON.parse((LS() && LS().getItem(KEY)) || 'null'); if (d) return Object.assign({ look: 'slate', keep: true }, d); } catch (e) { } return { look: 'slate', keep: true }; };
  P.setSettings = function (patch) { const d = Object.assign(P.settings(), patch || {}); try { LS().setItem(KEY, JSON.stringify(d)); } catch (e) { } return d; };

  /* ---------- addresses ---------- */
  P.slug = t => clean(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  /* an address as typed ("rileyhart.com", "https://...") -> a link, or '' if it isn't one */
  P.url = function (v) { v = clean(v); if (!v || /\s/.test(v)) return ''; if (/^https?:\/\//i.test(v)) return v; if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(v)) return 'https://' + v; return ''; };
  /* what's printed: no https://, no trailing slash */
  P.bare = u => String(u || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
  const at = v => clean(v).replace(/^@+/, '').replace(/^https?:\/\/[^/]+\/@?/i, '').replace(/\/.*$/, '');
  /* a social, as it shows on the card */
  P.handle = function (k, v) { v = clean(v); if (!v) return ''; if (k === 'page') return P.bare(P.url(v) || v); if (k === 'facebook') return /facebook\.com/i.test(v) ? P.bare(P.url(v) || v) : 'facebook.com/' + at(v); return '@' + at(v); };
  /* the link to your profile there, so you can post it yourself */
  P.profileUrl = function (k, v) { v = clean(v); if (!v) return ''; const h = encodeURIComponent(at(v));
    if (k === 'instagram') return 'https://www.instagram.com/' + h + '/';
    if (k === 'tiktok') return 'https://www.tiktok.com/@' + h;
    if (k === 'x') return 'https://x.com/' + h;
    if (k === 'facebook') return /facebook\.com/i.test(v) ? (P.url(v) || '') : 'https://www.facebook.com/' + h;
    if (k === 'youtube') return 'https://www.youtube.com/@' + h;
    if (k === 'page') return P.url(v);
    return ''; };
  P.NAMES = { instagram: 'Instagram', tiktok: 'TikTok', x: 'X', facebook: 'Facebook', youtube: 'YouTube', page: 'Your page' };
  /* your socials that are filled in: [{k, name, text, url}] */
  P.socials = function (you) { you = you || {}; return ['instagram', 'tiktok', 'x', 'facebook', 'youtube'].filter(k => clean(you[k])).map(k => ({ k, name: P.NAMES[k], text: P.handle(k, you[k]), url: P.profileUrl(k, you[k]) })); };
  /* the ones you ticked for your page */
  P.onPage = you => P.socials(you).filter(s => (you.onPage || {})[s.k]);
  /* on the card unless you untick it, in YOU or on this one card */
  P.onCardDefault = (you, k) => { const f = (you && you.onCard) || {}; return f[k] !== undefined ? !!f[k] : k !== 'page'; };

  /* your page: the address in YOU, else the one the Hub put online. Kinds about a credit open right at it. */
  P.pageBase = function (you, online) { return P.url((you || {}).page) || ((online && online.live && P.url(online.url)) || ''); };
  P.pageLink = function (base, q) { if (!base) return ''; const t = q && (q.kind === 'airing' || q.kind === 'worked') ? P.slug(q.title) : ''; return base.replace(/#.*$/, '') + (t ? '#c-' + t : ''); };

  /* ---------- one card: what goes on it ---------- */
  /* q: the plug. you: YOU. words: your plug, filled in. -> everything the drawing and the sending need */
  P.card = function (q, you, words, online) {
    you = you || {}; const c = Object.assign({ look: '', photo: true, show: {}, page: undefined, watch: '', rep: false, qr: true, back: '' }, (q && q.card) || {});
    const st = P.settings(); if (!c.look) c.look = st.keep ? st.look : 'slate';
    const base = P.pageBase(you, online), page = P.pageLink(base, q);
    const show = k => c.show[k] !== undefined ? !!c.show[k] : P.onCardDefault(you, k);
    const lines = P.socials(you).filter(s => show(s.k)).map(s => s.text);
    const pageOn = c.page !== undefined ? !!c.page : P.onCardDefault(you, 'page');
    if (pageOn && base) lines.push(P.bare(base));
    const rep = c.rep && clean(you.rep) ? 'Rep: ' + [clean(you.rep), clean(you.repPhone)].filter(Boolean).join(' · ') : '';
    return { look: c.look, photo: c.photo !== false, words: clean(words), name: clean(you.name), lines, page, pageText: P.bare(base), watch: P.url(c.watch), rep, qr: c.qr !== false && !!page, back: String(c.back || '').trim() };
  };
  /* the words you copy for a post: yours, then your page (a link inside a picture never clicks) */
  P.postWords = (k, card) => [card.words, card.page].filter(Boolean).join('\n\n');
  /* an email: your words, the links, your name, your rep if you ticked it */
  P.emailBody = function (card) {
    const L = [card.words, '']; if (card.page) L.push('My page: ' + card.page); if (card.watch) L.push('Where to watch: ' + card.watch);
    L.push('', card.name); if (card.rep) L.push(card.rep);
    return L.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  P.mailto = (to, subject, body) => 'mailto:' + encodeURIComponent(clean(to)).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(subject || '') + '&body=' + encodeURIComponent(body || '');

  /* ---------- who: one at a time, the office's own say ---------- */
  /* contact.plug: '' | 'noemail' | 'nomail' | 'none'. A rep not taking submissions, or someone marked do-not-contact, says no too. */
  P.says = function (p) { if (!p) return ''; if (p.dnc) return 'none'; if (p.rep && p.rep.how === 'closed') return 'none'; return p.plug || ''; };
  P.noEmail = p => /^(noemail|none)$/.test(P.says(p));
  P.noMail = p => /^(nomail|none)$/.test(P.says(p));
  P.SAYS = { noemail: 'This office says: no email from actors.', nomail: 'This office says: no mail from actors.', none: 'This one says: nothing from actors.' };
  /* the people you keep who have an email, and the ones you could mail */
  P.emailable = people => (people || []).filter(p => p && /@/.test(p.email || ''));
  P.mailable = people => (people || []).filter(p => p && clean(p.name));

  /* ---------- the QR: a square of dark and light, from a link ---------- */
  P.qr = function (text) { const Q = g.qrcode; if (!Q || !text) return null; try { const q = Q(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), m = []; for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(q.isDark(r, c)); m.push(row); } return m; } catch (e) { return null; } };

  /* ---------- drawing (in a browser) ---------- */
  const STICKS = ['#2b3038', '#1f8a5c', '#d9b23a', '#2a5fa8', '#c0392b', '#e8e6e0', '#9aa0a8', '#5c636d', '#2b3038'];
  function sticks(x, X, Y, W, H) { x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); const w = H * 1.6, sk = H * 0.9; let i = 0; for (let px = X - sk - w; px < X + W + w; px += w, i++) { x.fillStyle = STICKS[i % STICKS.length]; x.beginPath(); x.moveTo(px + sk, Y); x.lineTo(px + sk + w, Y); x.lineTo(px + w, Y + H); x.lineTo(px, Y + H); x.closePath(); x.fill(); } x.restore(); }
  function cover(x, bm, X, Y, W, H) { const k = Math.max(W / bm.width, H / bm.height), dw = bm.width * k, dh = bm.height * k; x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.drawImage(bm, X + (W - dw) / 2, Y + (H - dh) * 0.3, dw, dh); x.restore(); }
  function lines(x, t, mw) { const out = []; String(t || '').split('\n').forEach(par => { const ws = par.split(/\s+/).filter(Boolean); let l = ''; ws.forEach(w => { const s = l ? l + ' ' + w : w; if (x.measureText(s).width > mw && l) { out.push(l); l = w; } else l = s; }); out.push(l); }); return out; }
  /* the words, as big as fit in the box */
  function fit(x, t, font, mw, mh, big, small) { let fs = big, L = []; for (; fs >= small; fs -= 2) { x.font = font.replace('#', fs); L = lines(x, t, mw); if (L.length * fs * 1.22 <= mh) break; } return { fs, L, h: L.length * fs * 1.22 }; }
  function txt(x, L, X, Y, fs, color) { x.fillStyle = color; x.textBaseline = 'top'; L.forEach((l, i) => x.fillText(l, X, Y + i * fs * 1.22)); }

  /* one face of the card. data: P.card(...) plus .bitmap (the photo, or null). size: a P.SIZES key */
  P.draw = function (cv, data, sizeKey) {
    const sz = P.size(sizeKey), W = sz[2], H = sz[3]; cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const print = sz[0] === 'print', B = print ? P.BLEED : 0, iw = W - 2 * B, ih = H - 2 * B;   /* the card inside the bleed */
    const s = Math.min(iw, ih) / 500, pad = 30 * s, look = data.look, bm = data.photo ? data.bitmap : null;
    const tall = ih > iw * 1.2, wide = iw > ih * 1.4;
    const dark = look !== 'paper', ink = dark ? '#ece7dc' : '#16161a', sub = dark ? '#c9c3b6' : '#3d3d44', gold = dark ? '#e0a23c' : '#16161a';
    const WF = look === 'paper' ? '700 #px "Courier Prime", monospace' : '600 #px Jost, sans-serif';
    x.fillStyle = look === 'paper' ? '#f2f0ea' : look === 'bill' ? '#0d0f12' : '#14171b'; x.fillRect(0, 0, W, H);
    let tb;   /* the box the words go in */
    const bar = 22 * s;
    if (look === 'slate' || look === 'plain') {
      if (look === 'slate') sticks(x, 0, 0, W, B + bar); else sticks(x, 0, H - B - bar, W, B + bar);
      const top = look === 'slate' ? B + bar : B, bot = look === 'plain' ? H - B - bar : H - B;
      if (look === 'slate' && bm) {
        if (tall) { const ph = (bot - top) * 0.5; cover(x, bm, 0, top, W, ph); tb = { x: B + pad, y: top + ph + pad, w: iw - 2 * pad, h: bot - top - ph - 2 * pad }; }
        else { const pw = wide ? iw * 0.4 + B : iw * 0.48 + B; cover(x, bm, 0, top, pw, bot - top + (bot === H - B ? B : 0)); tb = { x: pw + pad, y: top + pad, w: W - B - pw - 2 * pad, h: bot - top - 2 * pad }; }
      } else tb = { x: B + pad * 1.4, y: top + pad * 1.4, w: iw - pad * 2.8, h: bot - top - pad * 2.8 };
    } else if (look === 'bill') {
      if (bm) cover(x, bm, 0, 0, W, H);
      tb = { band: !!bm, x: B + pad, y: B + pad, w: iw - 2 * pad, h: ih - 2 * pad };
    } else {   /* paper */
      if (bm) { x.strokeStyle = '#16161a'; x.lineWidth = Math.max(2, 2 * s);
        if (wide || (!tall && iw > ih * 1.05)) { const pw = iw * 0.42; cover(x, bm, B + pad, B + pad, pw, ih - 2 * pad); x.strokeRect(B + pad, B + pad, pw, ih - 2 * pad); tb = { x: B + 2 * pad + pw, y: B + pad, w: iw - 3 * pad - pw, h: ih - 2 * pad }; }
        else { const ph = ih * (tall ? 0.45 : 0.5); cover(x, bm, B + pad, B + pad, iw - 2 * pad, ph); x.strokeRect(B + pad, B + pad, iw - 2 * pad, ph); tb = { x: B + pad, y: B + 2 * pad + ph, w: iw - 2 * pad, h: ih - 3 * pad - ph }; } }
      else tb = { x: B + pad * 1.4, y: B + pad * 1.4, w: iw - pad * 2.8, h: ih - pad * 2.8 };
    }
    /* the name block, at the bottom of the box: your name, then your handles */
    const nfs = 18 * s * (tall ? 1.3 : 1), lfs = 15 * s * (tall ? 1.3 : 1), gap = 6 * s;
    const foot = [data.name ? 1 : 0, data.lines.length].reduce((a, b) => a + b, 0);
    const footH = (data.name ? nfs * 1.3 : 0) + data.lines.length * lfs * 1.35 + (foot ? 14 * s : 0);
    const big = (look === 'plain' ? 44 : 32) * s * (tall ? 1.35 : 1), small = 12 * s;
    let wf;
    if (look === 'bill' && tb.band) {
      x.font = WF.replace('#', 24 * s); wf = fit(x, data.words, WF, tb.w, ih * 0.38, 30 * s * (tall ? 1.3 : 1), small);
      const bandH = wf.h + footH + 2 * pad, by = H - B - bandH; x.fillStyle = '#0d0f12'; x.fillRect(0, by, W, H - by);
      txt(x, wf.L, tb.x, by + pad, wf.fs, ink); tb = { x: tb.x, y: by + pad, w: tb.w, h: bandH - 2 * pad };
    } else {
      wf = fit(x, data.words, WF, tb.w, tb.h - footH, big, small); txt(x, wf.L, tb.x, tb.y, wf.fs, ink);
    }
    let fy = tb.y + tb.h - footH + (foot ? 14 * s : 0);
    if (look === 'paper' && foot) { x.fillStyle = '#16161a'; x.fillRect(tb.x, fy - 8 * s, tb.w, Math.max(1, s)); }
    x.textBaseline = 'top';
    if (data.name) { x.font = '700 ' + nfs + 'px Jost, sans-serif'; x.fillStyle = gold; x.fillText(data.name.toUpperCase().split('').join(String.fromCharCode(8202)), tb.x, fy); fy += nfs * 1.3 + gap * 0.3; }
    x.font = '700 ' + lfs + 'px "Courier Prime", monospace'; x.fillStyle = sub; data.lines.forEach(l => { x.fillText(l, tb.x, fy); fy += lfs * 1.35; });
    return cv;
  };

  /* the back of the 4 x 6: your note (or room to write), your name, your page and its QR, your rep; a stamp box and who it's to */
  P.drawBack = function (cv, data, to) {
    const W = 1875, H = 1275, B = P.BLEED; cv.width = W; cv.height = H; const x = cv.getContext('2d');
    x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, W, H);
    const m = B + 75, mid = W / 2; x.fillStyle = '#b9b5aa'; x.fillRect(mid - 1, m, 3, H - 2 * m); x.textBaseline = 'top';
    if (data.back) { x.font = '700 40px "Courier Prime", monospace'; x.fillStyle = '#16161a'; lines(x, data.back, mid - m - 60).slice(0, 9).forEach((l, i) => x.fillText(l, m, m + i * 52)); }
    let by = H - m; const Q = data.qr ? P.qr(data.page) : null;
    let tx = m;
    if (Q) { const n = Q.length, cell = Math.floor(240 / n), qs = cell * n, qy = H - m - qs; x.fillStyle = '#fff'; x.fillRect(m - 12, qy - 12, qs + 24, qs + 24); x.fillStyle = '#16161a'; Q.forEach((row, r) => row.forEach((d, c) => { if (d) x.fillRect(m + c * cell, qy + r * cell, cell, cell); })); tx = m + qs + 40; }
    x.font = '700 30px "Courier Prime", monospace'; const info = [].concat.apply([], [data.pageText, data.rep].filter(Boolean).map(l => lines(x, l, mid - tx - 50).slice(0, 2)));
    by = H - m - (44 + info.length * 40);
    x.fillStyle = '#16161a'; x.font = '700 36px Jost, sans-serif'; if (data.name) x.fillText(data.name.toUpperCase().split('').join(String.fromCharCode(8202)), tx, by);
    x.font = '700 30px "Courier Prime", monospace'; x.fillStyle = '#3d3d44'; info.forEach((l, i) => x.fillText(l, tx, by + 50 + i * 40));
    /* the stamp, and who it's to */
    x.setLineDash([10, 8]); x.strokeStyle = '#6b6a66'; x.lineWidth = 3; x.strokeRect(W - m - 170, m, 170, 200); x.setLineDash([]);
    x.font = '600 22px Jost, sans-serif'; x.fillStyle = '#6b6a66'; x.textAlign = 'center'; x.fillText('STAMP', W - m - 85, m + 88); x.textAlign = 'left';
    const rows = to ? [to.name].concat(String(to.address || '').split('\n').map(clean).filter(Boolean)) : []; while (rows.length < 4) rows.push('');
    const ay = H - m - rows.length * 82; x.font = '700 38px "Courier Prime", monospace';
    rows.slice(0, 5).forEach((r, i) => { const y = ay + i * 82; x.fillStyle = '#16161a'; if (r) x.fillText(lines(x, r, W - m - mid - 60)[0], mid + 60, y + 10); x.fillStyle = '#b9b5aa'; x.fillRect(mid + 60, y + 62, W - m - mid - 60, 3); });
    return cv;
  };

  g.Postcard = P;
  if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
