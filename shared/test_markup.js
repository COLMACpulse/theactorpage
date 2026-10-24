/* MARK UP, the pure parts: a mark hangs off its line in page points, comes back to the screen wherever the line is now,
   a cross-out is a straight line, a highlight in black ink becomes the highlighter, ERASE finds a mark by touch.
   node shared/test_markup.js */
const M = require('./markup.js');
let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 300))); if (!x) ok = false; };
const lines = [{ id: 'a', left: 100, top: 100, right: 500, bottom: 116 }, { id: 'b', left: 100, top: 132, right: 500, bottom: 148 }];
want('the line under a point', M.anchorAt(lines, 200, 140).id === 'b' && M.anchorAt(lines, 200, 104).id === 'a');
want('between lines: the nearest', M.anchorAt(lines, 200, 119).id === 'a' && M.anchorAt(lines, 200, 130).id === 'b');
const m = M.toMark('pen', '#c0392b', lines[1], [[120, 136], [140, 140], [160, 138]], 2);
want('a mark is kept in page points from its line', m.a === 'b' && m.pts[0][0] === 10 && m.pts[0][1] === 2 && m.pts[2][0] === 30 && m.color === '#c0392b', m);
const moved = { id: 'b', left: 100, top: 300, right: 500, bottom: 316 };
const back = M.place(m, moved, 2);
want('the line moves (a reflow), the mark goes with it', back[0][0] === 120 && back[0][1] === 304 && back[2][1] === 306, back);
const back3 = M.place(m, moved, 3);
want('zoom in: the mark scales with the page', back3[0][0] === 130 && back3[0][1] === 306, back3);
const c = M.toMark('cross', '#1d1a15', lines[0], [[110, 108], [200, 110], [300, 107], [400, 109]], 1);
want('cross out: a straight line, start to end', c.pts.length === 2 && c.pts[1][0] === 300, c.pts);
const h = M.toMark('highlight', '#1d1a15', lines[0], [[110, 108], [300, 108]], 1);
want('highlight in black ink: the highlighter yellow', h.color === M.HIGHLIGHT);
want('erase: near the stroke, yes; far, no', M.near([[0, 0], [100, 0]], 50, 4, 6) && !M.near([[0, 0], [100, 0]], 50, 30, 6));
const w = M.wasNote('a', "We're closed. Go home.");
want('a revision keeps what the line said', w.tool === 'was' && w.text === "We're closed. Go home." && w.a === 'a');
want('the tools', M.TOOLS.map(t => t[0]).join() === 'pen,highlight,cross,revise,erase,move');
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
