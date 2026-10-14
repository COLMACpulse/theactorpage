// node tests/run_tests.js
'use strict';
const E = require('../engine.js');
let pass = 0, fail = 0;
const ok = (n, c, i) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, i === undefined ? '' : JSON.stringify(i)); } };

// tags
const vocab = {};
['Authority', 'authority', 'AUTHORITY ', 'Menace', 'dry humor', 'Blue Collar', 'grief', 'warmth'].forEach(t => E.addTag(vocab, t));
ok('tags: case-proof (one authority, counted 3)', vocab.authority && vocab.authority.n === 3 && vocab.authority.label === 'Authority');
ok('tags: multiword kept', !!vocab['blue collar'] && !!vocab['dry humor']);

// roots
ok('stem: menacing ~ menace', E.stem('menacing') === E.stem('menace'), [E.stem('menacing'), E.stem('menace')]);
ok('root: authoritative ~ authority', E.rootMatch(E.stem('authoritative'), E.stem('authority')), [E.stem('authoritative'), E.stem('authority')]);
ok('stem: humorous ~ humor', E.stem('humorous') === E.stem('humor'), [E.stem('humorous'), E.stem('humor')]);
ok('root: weathered ~ weather', E.rootMatch(E.stem('weathered'), E.stem('weather')));
ok('root: grieving ~ grief NOT claimed (honest miss)', !E.rootMatch(E.stem('grieving'), E.stem('grief')));
ok('root: authentic does not match authority', !E.rootMatch(E.stem('authentic'), E.stem('authority')));

// breakdown
const BD = `[SHERIFF DALE COLLINS] 40s-50s, Male, any ethnicity. LEAD. Weathered small-town sheriff with quiet authority and a dry sense of humor. Menacing when pushed, but a soft spot for his daughter. Blue-collar roots. SAG-AFTRA. Shoots 3/14 in Atlanta.`;
const ds = E.descriptors(BD);
const keys = ds.map(d => d.text);
ok('descriptors: drops name, age, gender, union, dates', !keys.some(k => /dale|collins|male|sag|lead|atlanta|shoots/.test(k)), keys);
ok('descriptors: keeps the acting words', ['weathered', 'quiet authority', 'menacing'].every(w => keys.some(k => k.includes(w))), keys);

const moments = [
  { id: 'm1', clip: 'c1', in: 0, out: 18, open: true, tags: ['authority'] },
  { id: 'm2', clip: 'c2', in: 10, out: 42, tags: ['menace', 'authority'] },
  { id: 'm3', clip: 'c3', in: 60, out: 85, button: true, tags: ['dry humor'] },
  { id: 'm4', clip: 'c4', in: 4, out: 25, tags: ['blue collar'] },
  { id: 'm5', clip: 'c5', in: 0, out: 30, tags: ['grief'] }
];
const M = E.matchBreakdown(BD, moments, vocab, {});
const cov = M.covered.map(r => r.text), miss = M.missing.map(r => r.text);
ok('match: authority covered', cov.some(t => /authority/.test(t)), cov);
ok('match: menacing covered by tag "menace"', cov.some(t => /menacing/.test(t)), cov);
ok('match: dry humor covered ("dry sense of humor")', cov.some(t => /humor/.test(t)), { cov, miss });
ok('match: blue-collar covered', cov.some(t => /blue/.test(t)), { cov, miss });
ok('match: weathered is missing (no proof)', miss.some(t => /weathered/.test(t)), miss);
ok('match: grief not dragged in', !cov.some(t => /grie/.test(t)));
// alias
const weatherKey = M.missing.find(r => /weathered/.test(r.text)).key;
vocab.grit = { label: 'grit', n: 1 }; moments.push({ id: 'm6', clip: 'c6', in: 0, out: 12, tags: ['grit'] });
const M2 = E.matchBreakdown(BD, moments, vocab, { [weatherKey]: 'grit' });
ok('alias: "weathered" mapped to your "grit" now covered', M2.covered.some(r => /weathered/.test(r.text)));

// draft
const D = E.buildDraft(M2, moments, 90);
ok('draft: opener is the flagged opener', D.items[0] === 'm1', D.items);
ok('draft: button is the flagged button, last', D.items[D.items.length - 1] === 'm3', D.items);
ok('draft: grief moment not used', !D.items.includes('m5'));
ok('draft: lands near target (60-104s)', D.total >= 60 && D.total <= 104, D.total);
const D2 = E.buildDraft(M2, moments, 30);
ok('draft: short target stops early', D2.total < D.total, [D2.total, D.total]);
ok('draft: empty match -> empty draft', E.buildDraft(E.matchBreakdown('Tall. Mysterious.', moments, vocab, {}), moments, 60).items.length === 0);

// timecode
ok('tc: 30fps 1h', E.tc(30 * 3600, '30') === '01:00:00:00');
ok('tc: 24fps 12.5s', E.tc(E.toFrames(12.5, '24'), '24') === '00:00:12:12');
ok('tc: 29.97 NDF labels 300 frames as 10:00', E.tc(E.toFrames(10, '29.97'), '29.97') === '00:00:10:00', E.tc(E.toFrames(10, '29.97'), '29.97'));

const items = [
  { card: true, label: 'BRENDAN McCARTHY', seconds: 2.5 },
  { clip: 'c1', name: 'IMG_0001.MOV', in: 1.5, out: 4, label: 'Cold open', tags: ['authority'] },
  { clip: 'c2', name: 'IMG_0002.MOV', in: 10, out: 12.5, label: 'Interrogation' }
];
const edl = E.toEDL('Sheriff reel', items, '24');
const ev = edl.split('\n').filter(l => /^\d{3}\s/.test(l));
ok('edl: 2 events, card as comment', ev.length === 2 && /\* CARD: BRENDAN/.test(edl), edl);
ok('edl: event 1 source in/out + record start 01:00:00:00', /^001  AX       AA\/V  C        00:00:01:12 00:00:04:00 01:00:00:00 01:00:02:12$/.test(ev[0]), ev[0]);
ok('edl: event 2 record continues', /01:00:02:12 01:00:05:00$/.test(ev[1]), ev[1]);
ok('edl: clip name comments', (edl.match(/FROM CLIP NAME/g) || []).length === 2);
const xml = E.toXML('Sheriff reel', items, '24', { c1: { dur: 30, w: 1920, h: 1080 }, c2: { dur: 60, w: 1920, h: 1080 } });
ok('xml: xmeml v5, 2 video clipitems, 4 audio', /<xmeml version="5">/.test(xml) && (xml.match(/<clipitem id="clipitem-\d-v">/g) || []).length === 2 && (xml.match(/-a[12]">/g) || []).length === 4);
ok('xml: in/out frames', /<start>0<\/start><end>60<\/end><in>36<\/in><out>96<\/out>/.test(xml), xml.match(/<start>.*?<\/out>/)[0]);
ok('xml: second clip starts where first ends', /<start>60<\/start><end>120<\/end><in>240<\/in><out>300<\/out>/.test(xml));
ok('xml: escapes', E.toXML('A & B <x>', [], '30', {}).includes('A &amp; B &lt;x&gt;'));
const csv = E.toCSV(items);
ok('csv: header + 3 rows', csv.trim().split('\n').length === 4 && /IMG_0001\.MOV,0:01\.50,0:04\.00,2\.50,authority/.test(csv), csv);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
