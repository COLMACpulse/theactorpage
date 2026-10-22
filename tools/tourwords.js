/* words.json from tour-voice.zip -> demo/stops.js: each changed stop gets the words you said, so the caption matches.
   usage: node tools/tourwords.js words.json   (prints what changed; a stop whose line was edited here since is left alone) */
const fs = require('fs'), path = require('path');
const W = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), P = path.join(__dirname, '..', 'demo', 'stops.js');
let s = fs.readFileSync(P, 'utf8'), n = 0;
for (const id of Object.keys(W)) {
  if (!/^[A-Z]\d\d$/.test(id)) continue;
  const re = new RegExp("(\\{ id: '" + id + "',[^\\n]*?line: )(\"(?:[^\"\\\\]|\\\\.)*\")");
  const m = s.match(re); if (!m) { console.log('no stop ' + id); continue; }
  if (JSON.parse(m[2]) !== W[id].was) { console.log(id + ': the script changed since you recorded, left alone'); continue; }
  s = s.replace(re, (_, a) => a + JSON.stringify(String(W[id].now).replace(/\s+/g, ' ')));
  n++; console.log(id + ': your words');
}
fs.writeFileSync(P, s); console.log(n + ' captions changed');
