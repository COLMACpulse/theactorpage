// Parser test suite. Run: node tests/run_tests.js  (pdf cases need pdfjs-dist in NODE_PATH or ../vendor-node)
'use strict';
const fs = require('fs'), path = require('path');
const P = require('../parser.js');
const SAMPLES = path.join(__dirname, '..', 'samples');
let pass = 0, fail = 0;
function ok(name, cond, info) { if (cond) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name, info !== undefined ? JSON.stringify(info) : ''); } }
const names = d => Object.keys(d.characters).sort();
const sp = (d, who) => d.speeches.filter(s => s.who === who);

function lastBusChecks(tag, d) {
  ok(tag + ': 3 scenes', d.scenes.length === 3, d.scenes.map(s => s.heading));
  ok(tag + ': scene numbers read', d.scenes.map(s => s.num).join(',') === '1,2,3', d.scenes.map(s => s.num));
  ok(tag + ': headings clean', d.scenes[0].heading === 'EXT. COUNTY ROAD BUS SHELTER - NIGHT', d.scenes[0].heading);
  ok(tag + ': characters exact', names(d).join(',') === 'CAL,MOM,RENNIE', names(d));
  ok(tag + ': V.O. kept as extension', sp(d, 'MOM')[0] && sp(d, 'MOM')[0].ext.includes('V.O.'), sp(d, 'MOM')[0]);
  ok(tag + ': shouted caps line is dialogue, not a character', d.elements.some(e => e.type === 'dialogue' && /I SAID GET IN THE TRUCK/.test(e.text) && e.who === 'CAL'));
  ok(tag + ': RENNIE speech count', sp(d, 'RENNIE').length === 10, sp(d, 'RENNIE').length);
  ok(tag + ': CAL speech count', sp(d, 'CAL').length === 11, sp(d, 'CAL').length);
  const house = d.speeches.find(s => /eleven months/.test(s.text));
  ok(tag + ': speech across page break is one speech', house && /It's a house\./.test(house.text), house && house.text);
  ok(tag + ': no (MORE)/header/watermark leaked', !d.elements.some(e => /MORE\)|FOR AUDITION|SAMPLE SIDES|^\d+\.$/.test(e.text)), d.elements.filter(e => /MORE|AUDITION|SAMPLE/.test(e.text)).map(e => e.text));
  ok(tag + ': paren attached to speaker', d.elements.some(e => e.type === 'paren' && e.who === 'RENNIE' && /not looking at him/.test(e.text)));
  ok(tag + ': multi-line paren is one element', d.elements.some(e => e.type === 'paren' && e.who === 'MOM' && /^\(on his phone, speaker\)$/.test(e.text)), d.elements.filter(e => e.type === 'paren').map(e => e.text));
  ok(tag + ': transition read', d.elements.some(e => e.type === 'transition' && e.text === 'CUT TO:'));
  ok(tag + ': wrapped action joined into one paragraph', d.elements.some(e => e.type === 'action' && /^Rain on a tin roof.*Checks it again\.$/.test(e.text)));
  ok(tag + ': revision star stripped', !d.elements.some(e => /\*/.test(e.text)));
  ok(tag + ': RENNIE in all 3 scenes', d.characters.RENNIE.scenes.length === 3);
}

// 1. layout text
{
  const src = P.fromText(fs.readFileSync(path.join(SAMPLES, 'LAST_BUS_sides.txt'), 'utf8'));
  const d = P.parse(src);
  ok('txt: layout mode detected', d.layout === true);
  lastBusChecks('txt', d);
}
// 2. FDX
{
  const d = P.parse(P.fromFdx(fs.readFileSync(path.join(SAMPLES, 'LAST_BUS_sides.fdx'), 'utf8')));
  lastBusChecks('fdx', Object.assign(d, {}));
}
// 3. flattened paste (no indentation, blank lines kept) - what you get copying from a PDF viewer
{
  const raw = fs.readFileSync(path.join(SAMPLES, 'LAST_BUS_sides.txt'), 'utf8').split('\n').map(l => l.trim()).join('\n');
  const d = P.parse(P.fromText(raw));
  ok('paste: not layout mode', d.layout === false);
  ok('paste: characters exact', names(d).join(',') === 'CAL,MOM,RENNIE', names(d));
  ok('paste: shouted line is dialogue', d.elements.some(e => e.type === 'dialogue' && /I SAID GET IN THE TRUCK/.test(e.text)));
  ok('paste: 3 scenes', d.scenes.length === 3);
}
// 4. v0.2 sample (blank-separated)
{
  const d = P.parse(P.fromText(fs.readFileSync(path.join(SAMPLES, 'v02_diner_sample.txt'), 'utf8')));
  ok('v0.2 sample: 3 scenes, MIKE + JAKE', d.scenes.length === 3 && names(d).join(',') === 'JAKE,MIKE', names(d));
  ok('v0.2 sample: 11 speeches', d.speeches.length === 11, d.speeches.length);
}
// 5. v0.2 harness (no blank lines at all)
{
  const t = 'INT. ROOM - DAY\nMIKE\nWhere is the gun?\nJAKE\nThe gun is gone.\nEXT. FIELD - NIGHT\nMIKE\nTell me the truth.\nJAKE\nThe truth gets us killed.';
  const d = P.parse(P.fromText(t));
  ok('no-blank: 2 scenes', d.scenes.length === 2);
  ok('no-blank: 4 speeches', d.speeches.length === 4, d.speeches.map(s => s.who + ':' + s.text));
}
// 6. the shouting bug from v0.2 review
{
  const t = "INT. KITCHEN - DAY\n\nSARAH\nI got the part.\n\nTOM\nWhich one?\n\nSARAH\nThe lead. They called an hour ago.\n\nEXT. STREET - NIGHT\n\nTOM\nYou didn't tell me.\n\nSARAH\nI'M TELLING YOU NOW\n\nTOM\nOK.";
  const d = P.parse(P.fromText(t));
  ok('shout: only SARAH + TOM', names(d).join(',') === 'SARAH,TOM', names(d));
  // and with no blank lines between cue and shout, inside a no-blank doc
  const t2 = t.replace(/\n\n/g, '\n');
  const d2 = P.parse(P.fromText(t2));
  ok('shout (no-blank doc): only SARAH + TOM', names(d2).join(',') === 'SARAH,TOM', names(d2));
}
// 7. Fountain
{
  const t = 'Title: Tiny\nAuthor: Test\n\n.THE ROOF\n\n@McCLANE\nYippee.\n\nHANS (O.S.)\n(calm)\nCome out.\n\n> FADE OUT.\n';
  const src = P.fromText(t, { fountain: true });
  const d = P.parse(src);
  ok('fountain: title page read', src.title === 'Tiny', src.title);
  ok('fountain: forced heading', d.scenes[0].heading === 'THE ROOF', d.scenes[0].heading);
  ok('fountain: forced mixed-case cue', !!d.characters['MCCLANE'], names(d));
  ok('fountain: O.S. extension', d.speeches[1] && d.speeches[1].who === 'HANS' && d.speeches[1].ext[0] === 'O.S.');
}
// 8. overrides: actor corrects a misread line
{
  const t = 'INT. ROOM - DAY\n\nBOB\nHi.\n\nNARRATOR\nOnce upon a time.\n';
  const src = P.fromText(t);
  const d1 = P.parse(src);
  const cueLine = src.lines.findIndex(l => l.t === 'NARRATOR');
  const dlgLine = cueLine + 1;
  const d2 = P.parse(src, { [cueLine]: 'action', [dlgLine]: 'action' });
  ok('override: before = 2 characters', names(d1).length === 2);
  ok('override: after = 1 character', names(d2).join(',') === 'BOB', names(d2));
}
// 9. mentions
{
  const re = P.mentionRegex(['RENNIE']);
  ok('mention: Title case', re.test('Rennie almost laughs.'));
  ok('mention: caps intro', re.test('RENNIE (40s), wet coat'));
  ok('mention: not inside a word', !re.test('Arrennie went'));
  const re2 = P.mentionRegex(['DETECTIVE RAMIREZ']);
  ok('mention: surname token', re2.test('Ramirez lights a cigarette.') && !re2.test('The detective waits.'));
}

// 10. PDF via pdf.js (node)
async function pdfCase() {
  let pdfjs;
  try { pdfjs = require('pdfjs-dist/legacy/build/pdf.js'); } catch (e) { console.log('SKIP pdf (pdfjs-dist not on NODE_PATH)'); return; }
  const data = new Uint8Array(fs.readFileSync(path.join(SAMPLES, 'LAST_BUS_sides.pdf')));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i);
    const vp = pg.getViewport({ scale: 1 });
    const tc = await pg.getTextContent();
    pages.push({ w: vp.width, h: vp.height, items: tc.items.map(it => ({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]), rot: Math.abs(it.transform[1]) > 0.01 || Math.abs(it.transform[2]) > 0.01 })) });
  }
  const d = P.parse(P.fromPdfPages(pages));
  ok('pdf: layout mode detected', d.layout === true);
  ok('pdf: 3 pages', d.pages === 3);
  lastBusChecks('pdf', d);
}
pdfCase().then(() => { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); });
