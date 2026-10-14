// node tests/run_tests.js
'use strict';
const E = require('../engine.js'), fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c, i) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, i === undefined ? '' : JSON.stringify(i)); } };

const short = { id: 'a', type: 'short', title: 'Last Bus', character: 'Cal', roleType: 'Lead', finished: true, did: ['Acted', 'Wrote', 'Directed'], link: 'https://vimeo.com/1', year: '2026' };
const almost = { id: 'b', type: 'short', title: 'Kitchen', character: 'Tom', roleType: 'Supporting', finished: true, company: 'Dir. Ana Ruiz' }; // not shown anywhere
const raw = { id: 'c', type: 'scene', title: 'Diner scene', finished: false };
const mono = { id: 'd', type: 'monologue', title: 'Henry V' };
const play = { id: 'e', type: 'theatre', title: 'Our Town', character: 'George', roleType: 'Lead', company: 'North Park Players', finished: true };
const pieces = [short, almost, raw, mono, play];

// credit rules
ok('finished, titled, credited, shown short = credit', E.countsCheck(short).counts === true);
ok('short with no link/screening = not yet, one step away', E.countsCheck(almost).counts === false && E.countsCheck(almost).of - E.countsCheck(almost).done === 1);
ok('scene = clip, never a credit', E.countsCheck(raw).section === 'clip' && !E.countsCheck(raw).counts);
ok('monologue = clip, says why', E.countsCheck(mono).section === 'clip' && /isn't a credit/.test(E.countsCheck(mono).note));
ok('theatre with venue + performed = credit', E.countsCheck(play).counts && E.countsCheck(play).section === 'theatre');
ok('self-directed credit line is honest', E.creditLine(short).company === 'Self-produced, dir. by actor' && E.creditLine(short).role === 'Lead (Cal)', E.creditLine(short));
ok('named director wins', E.creditLine(almost).company === 'Dir. Ana Ruiz');
ok('self-produced without directing', E.creditCompany({ did: ['Acted', 'Produced'] }) === 'Self-produced');

// résumé
const me = { name: 'Jordan Reyes', union: 'Non-union', email: 'jordan@example.com', phone: '555-0100', height: "5'10\"", hair: 'Brown', eyes: 'Hazel', location: 'San Diego' };
const training = [{ course: 'Scene Study', teacher: 'Jane Doe', school: 'Actors Lab' }, { course: '' }];
const m = E.resumeModel(me, pieces, training, ['Spanish (fluent)', 'Boxing', '']);
ok('film section: only what counts', m.film.length === 1 && m.film[0].title === 'Last Bus', m.film);
ok('theatre section', m.theatre.length === 1 && m.theatre[0].company === 'North Park Players');
ok('clips stay off the résumé', !m.film.concat(m.theatre).some(r => /Diner|Henry/.test(r.title)));
ok('held back list says what is missing', m.held.length === 1 && m.held[0].title === 'Kitchen' && /Shown somewhere/.test(m.held[0].missing[0]), m.held);
ok('blank training and skills dropped', m.training.length === 1 && m.skills.length === 2);
const forced = E.resumeModel(me, [Object.assign({}, almost, { include: true })], [], []);
ok('you can include an unfinished credit, it gets marked', forced.film[0].unfinished === true);
const txt = E.resumeText(m);
ok('text résumé: standard order', /^JORDAN REYES\nNon-union\njordan@example\.com · 555-0100\nHeight: 5'10" · Hair: Brown · Eyes: Hazel\n\nFILM & NEW MEDIA\nLast Bus \| Lead \(Cal\) \| Self-produced, dir\. by actor\n\nTHEATRE\nOur Town \| Lead \(George\) \| North Park Players\n\nTRAINING\nScene Study \| Jane Doe \| Actors Lab\n\nSPECIAL SKILLS\nSpanish \(fluent\), Boxing\n$/.test(txt), txt);

// next to make
const nx = E.nextToMake(pieces, training, ['x'], [{ text: 'weathered small town sheriff' }]);
ok('next: nearest win first ("Kitchen" one step away)', nx[0].kind === 'onestep' && /Kitchen/.test(nx[0].text) && /shown somewhere/i.test(nx[0].text), nx[0]);
ok('next: brings in the ARCHBOOK shoot list', nx.some(n => n.kind === 'shoot' && /sheriff/.test(n.text)));
ok('next: no credits yet -> finish one', E.nextToMake([raw, mono], [], [], []).some(n => n.kind === 'finish' && /best scene/.test(n.text)));
ok('next: empty training + skills prompted', E.nextToMake([], [], [], []).filter(n => n.kind === 'training' || n.kind === 'skills').length === 2);

// page
const html = E.pageHTML(m, [Object.assign({ media: 'media/last_bus.mp4' }, short), mono, Object.assign({ media: 'media/x.mp4', onPage: false }, raw)], { headshot: 'media/headshot.jpg' });
ok('page: credits, work, headshot, escapes', /<h1>Jordan Reyes<\/h1>/.test(html) && /media\/last_bus\.mp4/.test(html) && /Film &amp; new media/.test(html) && /headshot\.jpg/.test(html));
const ord = E.pageHTML(m, [Object.assign({ media: 'm/mono.mp4' }, mono), Object.assign({ media: 'm/short.mp4' }, short)], {});
ok('page: credits come before clips', ord.indexOf('m/short.mp4') < ord.indexOf('m/mono.mp4'));
ok('page: hidden piece stays off', !/media\/x\.mp4/.test(html));
ok('page: escapes user text', !/<script>/.test(E.pageHTML(Object.assign({}, m, { name: '<script>x</script>' }), [], {})));

// zip
const z = E.makeZip([{ name: 'page/index.html', bytes: E.enc(html) }, { name: 'page/media/a.bin', bytes: new Uint8Array([1, 2, 3]) }]);
fs.writeFileSync(path.join(__dirname, '_out.zip'), Buffer.from(z));
ok('zip written', z[0] === 0x50);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
