/* MARK UP A PDF: your sides from casting, or any PDF someone sent you. The real pages, as they look, with the
   same pen, highlight, cross out and erase as THEACTORPAGES; REVISE types your new words right onto the page.
   Your marks keep on this device for that file. SAVE makes a new PDF with your marks drawn in; the original
   file is never changed. Pages are drawn by PDF.js (Apache 2.0), on this device. Nothing is uploaded.
   PDFMark.open({blob, name, pdfjs:'vendor/pdf.min.js', worker:'vendor/pdf.worker.min.js'}) */
(function (g) {
  'use strict';
  const P = {}, KEY = 'theactorpage_pdfmarks_v1', doc = g.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  P.keyOf = (name, size) => String(name || 'file.pdf') + '|' + (size || 0);
  P.all = () => { try { return JSON.parse(g.localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  P.marksFor = k => (P.all()[k] || {}).marks || [];
  P.keep = (k, name, marks) => { const a = P.all(); if (marks.length) a[k] = { name, marks, at: Date.now() }; else delete a[k]; try { g.localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) { } };

  /* ---------- a new PDF: each page a picture of the page with your marks on it ---------- */
  P.imagePdf = function (pages) {     /* pages: [{w, h (points), jpeg: Uint8Array, pw, ph (pixels)}] */
    const enc = s => new TextEncoder().encode(s), parts = [], offs = [];
    let len = 0; const put = b => { parts.push(b); len += b.length; };
    const objs = []; const add = (head, stream) => { objs.push({ head, stream }); return objs.length; };
    const pageIds = [];
    const pagesId = 1 + pages.length * 3 + 1;   // placeholder, fixed below
    pages.forEach((pg, i) => {
      const im = add(`<< /Type /XObject /Subtype /Image /Width ${pg.pw} /Height ${pg.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>`, pg.jpeg);
      const body = enc(`q ${pg.w} 0 0 ${pg.h} 0 0 cm /Im${i} Do Q\n`);
      const ct = add(`<< /Length ${body.length} >>`, body);
      pageIds.push({ im, ct, i, w: pg.w, h: pg.h });
    });
    const pagesObj = objs.length + pageIds.length + 1;
    pageIds.forEach(p => { p.id = add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /XObject << /Im${p.i} ${p.im} 0 R >> >> /Contents ${p.ct} 0 R >>`); });
    const realPages = add(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(p => p.id + ' 0 R').join(' ')}] >>`);
    if (realPages !== pagesObj) throw new Error('PDF numbering went wrong');
    const cat = add(`<< /Type /Catalog /Pages ${realPages} 0 R >>`);
    put(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    objs.forEach((o, i) => { offs.push(len); put(enc(`${i + 1} 0 obj\n${o.head}\n`)); if (o.stream) { put(enc('stream\n')); put(o.stream); put(enc('\nendstream\n')); } put(enc('endobj\n')); });
    const xref = len;
    put(enc(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    return new Blob(parts, { type: 'application/pdf' });
  };
  /* your marks drawn onto a page picture: k = pixels per point */
  P.paint = function (ctx, marks, k) {
    const M = g.Markup;
    for (const m of marks) {
      if (m.tool === 'text' || m.tool === 'was') {
        ctx.save(); ctx.fillStyle = m.tool === 'was' ? '#c0392b' : (m.color || '#c0392b'); ctx.font = 'italic ' + (11 * k) + 'px Jost, system-ui, sans-serif';
        String(m.text).split('\n').forEach((ln, i) => ctx.fillText(ln, m.pts[0][0] * k, m.pts[0][1] * k + i * 13 * k)); ctx.restore(); continue;
      }
      if (!m.pts || m.pts.length < 2) continue;
      ctx.save(); ctx.strokeStyle = m.color; ctx.lineJoin = 'round';
      ctx.lineWidth = (m.tool === 'highlight' ? 13 : m.tool === 'cross' ? 2.2 : 1.8) * k; ctx.lineCap = m.tool === 'highlight' ? 'butt' : 'round';
      if (m.tool === 'highlight') { ctx.globalAlpha = 0.4; ctx.globalCompositeOperation = 'multiply'; }
      ctx.beginPath(); m.pts.forEach((p, i) => i ? ctx.lineTo(p[0] * k, p[1] * k) : ctx.moveTo(p[0] * k, p[1] * k)); ctx.stroke(); ctx.restore();
    }
    return !!M;
  };

  /* ---------- the viewer ---------- */
  let LIB = null;
  function lib(src, worker) {
    if (LIB) return LIB;
    LIB = new Promise((res, rej) => {
      if (g.pdfjsLib) { try { g.pdfjsLib.GlobalWorkerOptions.workerSrc = worker; } catch (e) { } return res(g.pdfjsLib); }
      const s = doc.createElement('script'); s.src = src;
      s.onload = () => { try { g.pdfjsLib.GlobalWorkerOptions.workerSrc = worker; } catch (e) { } res(g.pdfjsLib); };
      s.onerror = () => { LIB = null; rej(new Error('the page drawer did not load')); };
      doc.head.appendChild(s);
    });
    return LIB;
  }
  const CSS = `
#pmk{position:fixed;inset:0;z-index:1200;display:flex;flex-direction:column;background:var(--pm-bg);color:var(--pm-ink);font-family:Jost,system-ui,-apple-system,"Segoe UI",sans-serif;
 --pm-bg:#121110;--pm-p:#1b1916;--pm-p2:#24211d;--pm-line:#2f2b26;--pm-ink:#ece7dc;--pm-dim:#a39c8e;--pm-gold:#e0a23c;--pm-well:#0e0d0c;
 --desk:#121110;--desk-2:#1b1916;--rule:#2f2b26;--chrome-text:#ece7dc;--hi:#f6f2ea;--mark:#e0a23c;--mark-ink:#1a1206}
@media (prefers-color-scheme: light){ :root:not([data-theme="dark"]) #pmk{--pm-bg:#ece7dc;--pm-p:#f6f2ea;--pm-p2:#e3dccd;--pm-line:#d3cab8;--pm-ink:#1d1a15;--pm-dim:#5f584b;--pm-well:#ddd5c6;
 --desk:#ece7dc;--desk-2:#f6f2ea;--rule:#d3cab8;--chrome-text:#1d1a15;--hi:#1d1a15} }
:root[data-theme="light"] #pmk{--pm-bg:#ece7dc;--pm-p:#f6f2ea;--pm-p2:#e3dccd;--pm-line:#d3cab8;--pm-ink:#1d1a15;--pm-dim:#5f584b;--pm-well:#ddd5c6;--desk:#ece7dc;--desk-2:#f6f2ea;--rule:#d3cab8;--chrome-text:#1d1a15;--hi:#1d1a15}
#pmk .pm-top{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--pm-line);flex-wrap:wrap}
#pmk .pm-top b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
#pmk .pm-top small{display:block;font-size:10.5px;letter-spacing:.16em;color:var(--pm-dim);font-weight:500}
#pmk button.pm-b{min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--pm-line);background:var(--pm-p);color:var(--pm-ink);font:500 13.5px inherit;font-family:inherit;cursor:pointer}
#pmk button.pm-b.pri{background:var(--pm-gold);border-color:var(--pm-gold);color:#1a1206;font-weight:600;letter-spacing:.06em}
#pmk .pm-bar{padding:8px 14px;border-bottom:1px solid var(--pm-line);background:var(--pm-p)}
#pmk .pm-body{flex:1;min-height:0;overflow:auto;position:relative;background:var(--pm-well);padding:16px 0 60px}
#pmk .pm-page{position:relative;margin:0 auto 18px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.3)}
#pmk .pm-page canvas{display:block;width:100%;height:auto}
#pmk .pm-n{position:absolute;right:8px;bottom:-16px;font-size:11px;color:var(--pm-dim)}
#pmk .pm-msg{padding:8px 14px;font-size:13.5px;color:var(--pm-dim);min-height:0}
#pmk .pm-msg:empty{display:none}
#pmk .pm-type{position:absolute;z-index:8;display:flex;gap:6px;align-items:flex-start;background:var(--pm-p);border:1px solid var(--pm-gold);border-radius:10px;padding:6px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
#pmk .pm-type textarea{width:min(260px,60vw);min-height:44px;font:italic 15px Jost,system-ui,sans-serif;background:var(--pm-p2);color:var(--pm-ink);border:1px solid var(--pm-line);border-radius:8px;padding:6px 8px}
@media (max-width:700px){#pmk .pm-bar{padding:6px 8px}#pmk .pm-top b{flex-basis:100%;white-space:normal}#pmk .pm-top button.pm-b{flex:1}}`;
  P.open = async function (o) {
    o = o || {};
    const blob = o.blob, name = o.name || (blob && blob.name) || 'sides.pdf', key = P.keyOf(name, blob && blob.size);
    if (!doc.getElementById('pmkcss')) { const st = doc.createElement('style'); st.id = 'pmkcss'; st.textContent = CSS + (g.Markup ? g.Markup.CSS : ''); doc.head.appendChild(st); }
    P.close();
    const w = doc.createElement('div'); w.id = 'pmk'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-label', 'Mark up ' + name);
    w.innerHTML = '<div class="pm-top"><b><small>MARK UP · YOUR MARKS, ON TOP OF THE PAGES</small>' + esc(name) + '</b>' +
      '<button type="button" class="pm-b pri" id="pmSave">SAVE WITH MY MARKS</button><button type="button" class="pm-b" id="pmClose">Close</button></div>' +
      '<div class="pm-bar" id="pmBar"></div><p class="pm-msg" id="pmMsg" role="status">Opening the pages…</p><div class="pm-body" id="pmBody"></div>';
    doc.body.appendChild(w);
    const $ = id => doc.getElementById(id), msg = t => { $('pmMsg').textContent = t || ''; };
    $('pmClose').onclick = P.close;
    let pdf, sizes = [], MK = null, scaleK = 1;
    try {
      const L = await lib(o.pdfjs || 'vendor/pdf.min.js', o.worker || 'vendor/pdf.worker.min.js');
      pdf = await L.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    } catch (e) { msg('These pages won\'t open here: ' + e.message + '.'); return; }
    const body = $('pmBody');
    const avail = () => Math.min(900, body.clientWidth - 24);
    async function draw() {
      body.querySelectorAll('.pm-page').forEach(x => x.remove());
      const dpr = Math.min(2, g.devicePixelRatio || 1);
      for (let n = 1; n <= pdf.numPages; n++) {
        const pg = await pdf.getPage(n), v1 = pg.getViewport({ scale: 1 }); sizes[n - 1] = [v1.width, v1.height];
        const k = avail() / v1.width; if (n === 1) scaleK = k;
        const vp = pg.getViewport({ scale: k * dpr }), wrap = doc.createElement('div'), cv = doc.createElement('canvas');
        wrap.className = 'pm-page'; wrap.dataset.pmPage = 'p' + n; wrap.style.width = Math.round(v1.width * k) + 'px';
        cv.width = vp.width; cv.height = vp.height; wrap.appendChild(cv);
        const t = doc.createElement('span'); t.className = 'pm-n'; t.textContent = n + ' / ' + pdf.numPages; wrap.appendChild(t);
        body.appendChild(wrap);
        await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      }
      if (MK) MK.draw();
    }
    await draw();
    msg('');
    const marks = P.marksFor(key);
    if (!g.Markup) { msg('The mark-up tools didn\'t load.'); return; }
    MK = g.Markup.attach({
      surface: body, scale: () => scaleK, marks,
      anchors: () => [...body.querySelectorAll('.pm-page')].map(e => ({ id: e.dataset.pmPage, el: e })),
      save: m => P.keep(key, name, m),
      onRevise: (id, el, p, a, sc) => typeHere(a, p, sc)
    });
    MK.tool('pen'); MK.on(true);
    const paint = () => g.Markup.strip($('pmBar'), MK, { onDone: P.close, onTool: () => { } });
    paint();
    function typeHere(a, p, sc) {
      body.querySelectorAll('.pm-type').forEach(x => x.remove());
      const box = doc.createElement('div'); box.className = 'pm-type'; box.style.left = Math.max(4, p[0]) + 'px'; box.style.top = p[1] + 'px';
      box.innerHTML = '<textarea aria-label="Your words" placeholder="Type the new words"></textarea><button type="button" class="pm-b pri">PUT IT ON</button>';
      body.appendChild(box); const ta = box.querySelector('textarea'); setTimeout(() => ta.focus(), 20);
      const go = () => { const t = ta.value.trim(); box.remove(); if (t) MK.add(g.Markup.textMark(a, [p[0], p[1] + 11 * sc], t, MK.color() === g.Markup.COLORS[0][0] ? '#c0392b' : MK.color(), sc)); };
      box.querySelector('button').onclick = go;
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } if (e.key === 'Escape') box.remove(); });
    }
    let rt; g.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (doc.getElementById('pmk')) draw(); }, 250); });
    $('pmSave').onclick = async () => {
      const all = MK.marks(); if (!all.length) { msg('Nothing marked yet. Your original is unchanged; keep that one.'); return; }
      msg('Making the PDF with your marks…'); $('pmSave').disabled = true;
      try {
        const out = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const pg = await pdf.getPage(n), k = 2, vp = pg.getViewport({ scale: k }), cv = doc.createElement('canvas');
          cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
          const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
          await pg.render({ canvasContext: ctx, viewport: vp }).promise;
          P.paint(ctx, all.filter(m => m.a === 'p' + n), k);
          const jb = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.88));
          out.push({ w: +(vp.width / k).toFixed(2), h: +(vp.height / k).toFixed(2), pw: cv.width, ph: cv.height, jpeg: new Uint8Array(await jb.arrayBuffer()) });
        }
        const file = P.imagePdf(out), nm = name.replace(/\.pdf$/i, '') + '_marked.pdf', url = URL.createObjectURL(file), a = doc.createElement('a');
        a.href = url; a.download = nm; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        P.lastSaved = { name: nm, size: file.size, pages: out.length };
        msg('Saved ' + nm + '. Your original file is unchanged.');
      } catch (e) { msg('That didn\'t save: ' + e.message + '.'); }
      $('pmSave').disabled = false;
    };
    P.current = { MK, key };
  };
  P.close = function () { const w = doc && doc.getElementById('pmk'); if (w) w.remove(); P.current = null; };
  g.PDFMark = P;
  if (typeof module !== 'undefined') module.exports = P;
})(typeof window !== 'undefined' ? window : globalThis);
