/* MARK UP: pen, highlight, cross out, revise and erase, drawn over a page. Shared by THEACTORPAGES (your scripts),
   the sides in Actor OS and Breakdown, and a PDF someone sent you.
   A mark hangs off a line (an "anchor": an element with an id), in page points from that line's top left, so it
   moves with its line when the text reflows and lands in the same place on a printed page.
   The page decides what a line is (anchors), how many screen pixels make a point (scale), where marks are kept
   (save), and what a revision does (onRevise). Nothing here changes your words; REVISE hands the line to the page.
   Kept with the script or the sides, on this device. */
(function (g) {
  'use strict';
  const M = {};
  const NS = 'http://www.w3.org/2000/svg';
  M.TOOLS = [['pen', 'Pen'], ['highlight', 'Highlight'], ['cross', 'Cross out'], ['revise', 'Revise'], ['erase', 'Erase'], ['move', 'Scroll']];
  M.COLORS = [['#1d1a15', 'Black'], ['#c0392b', 'Red'], ['#2a5fa8', 'Blue'], ['#e0a23c', 'Gold']];
  M.HIGHLIGHT = '#f2c94c';
  const uid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r1 = n => Math.round(n * 10) / 10;

  /* ---------- pure parts (tested in node) ---------- */
  /* the line under a point: the one whose box holds it, else the nearest by height */
  M.anchorAt = function (boxes, x, y) {
    let best = null, bd = Infinity;
    for (const b of boxes) {
      if (y >= b.top && y <= b.bottom && x >= b.left - 400 && x <= b.right + 400) return b;
      const d = y < b.top ? b.top - y : y - b.bottom;
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  };
  /* screen points to a mark: relative to the line, in page points */
  M.toMark = function (tool, color, anchor, pts, scale) {
    const rel = pts.map(p => [r1((p[0] - anchor.left) / scale), r1((p[1] - anchor.top) / scale)]);
    if (tool === 'cross' && rel.length > 1) rel.splice(1, rel.length - 2);   // a straight line, start to end
    return { id: uid(), a: anchor.id, tool, color: tool === 'highlight' ? (color === M.COLORS[0][0] ? M.HIGHLIGHT : color) : color, pts: rel, at: Date.now() };
  };
  /* a mark back to screen points, given where its line is now */
  M.place = function (mark, anchor, scale) { return mark.pts.map(p => [anchor.left + p[0] * scale, anchor.top + p[1] * scale]); };
  M.width = (tool, scale) => (tool === 'highlight' ? 13 : tool === 'cross' ? 2.2 : 1.8) * scale;
  M.pathD = pts => pts.length ? 'M' + pts.map(p => r1(p[0]) + ' ' + r1(p[1])).join(' L') : '';
  /* a mark is near a point (for ERASE) */
  M.near = function (pts, x, y, tol) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[i + 1] || a, dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0;
      const px = a[0] + t * dx, py = a[1] + t * dy;
      if ((px - x) * (px - x) + (py - y) * (py - y) <= tol * tol) return true;
    }
    return false;
  };
  /* a revision kept beside its line: what it said before */
  M.wasNote = (anchorId, before) => ({ id: uid(), a: anchorId, tool: 'was', text: String(before || ''), pts: [[0, 0]], at: Date.now() });

  /* ---------- on a page ---------- */
  /* opts: surface (the element the page scrolls in, position:relative), anchors() -> [{id, el}],
     scale() -> screen px per page point, marks (array), save(marks), onRevise(id, el), wasPos(anchor) -> {x, y} for a revision's old words */
  M.attach = function (opts) {
    const S = opts.surface, doc = S.ownerDocument;
    let marks = (opts.marks || []).slice(), tool = 'pen', color = M.COLORS[0][0], on = false, cur = null, shown = true;
    const svg = doc.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mk-layer'); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;pointer-events:none;z-index:4';
    S.appendChild(svg);
    const boxes = () => {
      const base = S.getBoundingClientRect(), sx = S.scrollLeft, sy = S.scrollTop;
      return opts.anchors().map(a => { const r = a.el.getBoundingClientRect();
        return { id: a.id, el: a.el, left: r.left - base.left + sx, top: r.top - base.top + sy, right: r.right - base.left + sx, bottom: r.bottom - base.top + sy }; });
    };
    function draw() {
      svg.setAttribute('width', S.scrollWidth); svg.setAttribute('height', S.scrollHeight);
      svg.innerHTML = '';
      if (!shown) return;
      const B = boxes(), byId = new Map(B.map(b => [b.id, b])), sc = opts.scale();
      for (const m of marks) {
        const a = byId.get(m.a); if (!a) continue;
        if (m.tool === 'was') {
          const t = doc.createElementNS(NS, 'text'), wp = opts.wasPos ? opts.wasPos(a) : { x: a.right + 10 * sc, y: a.top + 10 * sc };
          t.setAttribute('x', wp.x); t.setAttribute('y', wp.y); t.setAttribute('fill', '#c0392b');
          t.setAttribute('font-size', Math.max(11, 9 * sc)); t.setAttribute('font-family', 'Jost, system-ui, sans-serif');
          t.setAttribute('text-decoration', 'line-through'); t.setAttribute('data-mk', m.id);
          t.textContent = m.text.length > 60 ? m.text.slice(0, 58) + '…' : m.text; svg.appendChild(t); continue;
        }
        const p = doc.createElementNS(NS, 'path');
        p.setAttribute('d', M.pathD(M.place(m, a, sc))); p.setAttribute('fill', 'none'); p.setAttribute('stroke', m.color);
        p.setAttribute('stroke-width', M.width(m.tool, sc)); p.setAttribute('stroke-linecap', m.tool === 'highlight' ? 'butt' : 'round'); p.setAttribute('stroke-linejoin', 'round');
        if (m.tool === 'highlight') { p.setAttribute('stroke-opacity', '.4'); p.style.mixBlendMode = 'multiply'; }
        p.setAttribute('data-mk', m.id); svg.appendChild(p);
      }
      if (cur) { const p = doc.createElementNS(NS, 'path'); p.setAttribute('d', M.pathD(cur.pts)); p.setAttribute('fill', 'none'); p.setAttribute('stroke', cur.tool === 'highlight' ? (color === M.COLORS[0][0] ? M.HIGHLIGHT : color) : color);
        p.setAttribute('stroke-width', M.width(cur.tool, sc)); p.setAttribute('stroke-linecap', 'round'); if (cur.tool === 'highlight') p.setAttribute('stroke-opacity', '.4'); svg.appendChild(p); }
    }
    const pt = e => { const base = S.getBoundingClientRect(); return [e.clientX - base.left + S.scrollLeft, e.clientY - base.top + S.scrollTop]; };
    const save = () => { try { opts.save && opts.save(marks.slice()); } catch (e) { } };
    function down(e) {
      if (!on || tool === 'move') return;
      e.preventDefault(); const p = pt(e);
      if (tool === 'erase') { eraseAt(p); return; }
      if (tool === 'revise') { const a = M.anchorAt(boxes(), p[0], p[1]); if (a && opts.onRevise) opts.onRevise(a.id, a.el); return; }
      cur = { tool, pts: [p] }; try { svg.setPointerCapture(e.pointerId); } catch (er) { } draw();
    }
    function move(e) { if (!cur) return; e.preventDefault(); const p = pt(e);
      if (cur.tool === 'cross') cur.pts = [cur.pts[0], p]; else cur.pts.push(p); draw(); }
    function up() { if (!cur) return; const c = cur; cur = null;
      if (c.pts.length < 2) { draw(); return; }
      const a = M.anchorAt(boxes(), c.pts[0][0], c.pts[0][1]); if (!a) { draw(); return; }
      marks.push(M.toMark(c.tool, color, a, c.pts, opts.scale())); save(); draw(); }
    function eraseAt(p) { const B = boxes(), byId = new Map(B.map(b => [b.id, b])), sc = opts.scale();
      const hit = marks.slice().reverse().find(m => { const a = byId.get(m.a); if (!a) return false;
        if (m.tool === 'was') { const wp = opts.wasPos ? opts.wasPos(a) : { x: a.right + 10 * sc, y: a.top + 10 * sc }; return p[0] >= wp.x - 6 && p[1] >= wp.y - 14 * sc && p[1] <= wp.y + 4 * sc; }
        return M.near(M.place(m, a, sc), p[0], p[1], Math.max(10, M.width(m.tool, sc))); });
      if (hit) { marks = marks.filter(m => m !== hit); save(); draw(); } }
    svg.addEventListener('pointerdown', down); svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    const api = {
      draw,
      on(v) { on = !!v; svg.style.pointerEvents = on && tool !== 'move' ? 'auto' : 'none'; svg.style.touchAction = on && tool !== 'move' ? 'none' : ''; S.classList.toggle('mk-on', on); draw(); },
      isOn: () => on,
      tool(t) { if (t) { tool = t; api.on(on); } return tool; },
      color(c) { if (c) color = c; return color; },
      show(v) { shown = v !== false; draw(); }, shown: () => shown,
      marks: () => marks.slice(),
      set(list) { marks = (list || []).slice(); draw(); },
      add(m) { marks.push(m); save(); draw(); },
      undo() { if (!marks.length) return false; marks.pop(); save(); draw(); return true; },
      clear() { marks = []; save(); draw(); },
      destroy() { svg.remove(); }
    };
    return api;
  };
  /* the tool strip: buttons with icons, four inks, show/hide, undo, done */
  const ICON = {
    pen: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/>', highlight: '<path d="M4 19h16" stroke-width="5" stroke-opacity=".35"/><path d="M8 14l6-8 3 2-6 8z"/>',
    cross: '<path d="M6 8h12M6 16h12" stroke-opacity=".35"/><path d="M4 12h16"/>', revise: '<path d="M5 5h14v10H9l-4 4z"/><path d="M9 9h6"/>',
    erase: '<path d="M4 20h16M7 16l9-9 3 3-9 9H7z"/>', move: '<path d="M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4"/>'
  };
  M.icon = (t, size) => '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[t] || '') + '</svg>';
  M.strip = function (host, mk, opts) {
    opts = opts || {};
    host.innerHTML = '<div class="mk-tools" role="toolbar" aria-label="Mark up">' + M.TOOLS.map(([k, l]) => '<button type="button" class="mk-t" data-mk-tool="' + k + '" aria-pressed="' + (mk.tool() === k) + '">' + M.icon(k) + '<span>' + l + '</span></button>').join('') +
      '<span class="mk-sep"></span>' + M.COLORS.map(([c, l]) => '<button type="button" class="mk-c" data-mk-color="' + c + '" aria-label="' + l + ' ink" aria-pressed="' + (mk.color() === c) + '" style="--ink:' + c + '"></button>').join('') +
      '<span class="mk-sep"></span><button type="button" class="mk-t" data-mk-undo>' + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg><span>Undo</span></button>' +
      '<button type="button" class="mk-t" data-mk-show aria-pressed="' + mk.shown() + '">' + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><span>' + (mk.shown() ? 'Hide marks' : 'Show marks') + '</span></button>' +
      '<button type="button" class="mk-done" data-mk-done>DONE MARKING</button></div>';
    const redo = () => M.strip(host, mk, opts);
    host.querySelectorAll('[data-mk-tool]').forEach(b => b.onclick = () => { mk.tool(b.dataset.mkTool); redo(); opts.onTool && opts.onTool(b.dataset.mkTool); });
    host.querySelectorAll('[data-mk-color]').forEach(b => b.onclick = () => { mk.color(b.dataset.mkColor); if (mk.tool() === 'erase' || mk.tool() === 'move' || mk.tool() === 'revise') mk.tool('pen'); redo(); });
    host.querySelector('[data-mk-undo]').onclick = () => { mk.undo(); };
    host.querySelector('[data-mk-show]').onclick = () => { mk.show(!mk.shown()); redo(); };
    host.querySelector('[data-mk-done]').onclick = () => { opts.onDone && opts.onDone(); };
  };
  M.CSS = '.mk-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center}' +
    '.mk-t{min-height:48px;min-width:52px;padding:4px 8px;border-radius:12px;border:1px solid var(--rule,#d3cab8);background:var(--desk-2,#f6f2ea);color:var(--chrome-text,#1d1a15);display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:500 10.5px var(--sans,Jost,system-ui,sans-serif);letter-spacing:.04em;cursor:pointer}' +
    '.mk-t[aria-pressed="true"]{background:var(--hi,#1d1a15);color:var(--desk,#ece7dc);border-color:var(--hi,#1d1a15)}' +
    '.mk-c{width:34px;height:34px;border-radius:50%;background:var(--ink);border:3px solid var(--desk-2,#f6f2ea);box-shadow:0 0 0 1px var(--rule,#d3cab8);cursor:pointer;padding:0}' +
    '.mk-c[aria-pressed="true"]{box-shadow:0 0 0 2px var(--mark,#e0a23c)}' +
    '.mk-sep{width:1px;align-self:stretch;background:var(--rule,#d3cab8);margin:0 4px}' +
    '.mk-done{min-height:48px;padding:0 16px;border-radius:12px;border:1px solid var(--mark,#e0a23c);background:var(--mark,#e0a23c);color:var(--mark-ink,#1a1206);font:600 13px var(--sans,Jost,system-ui,sans-serif);letter-spacing:.08em;cursor:pointer;margin-left:auto}' +
    '.mk-on{cursor:crosshair}' +
    '@media (max-width:700px){.mk-tools{gap:4px}.mk-t{min-width:44px;min-height:44px;padding:0}.mk-t span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.mk-c{width:30px;height:30px}.mk-sep{display:none}.mk-done{min-height:44px;padding:0 12px;font-size:12px}}';
  g.Markup = M;
  if (typeof module !== 'undefined') module.exports = M;
})(typeof window !== 'undefined' ? window : globalThis);
