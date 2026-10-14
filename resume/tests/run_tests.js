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


// ---------------------------------------------------------------- who it's for (mined from SHOWCASE)
{
  const P = (id, o) => Object.assign({ id, type: 'scene', title: '', character: '', note: '', media: 'm/' + id + '.mp4', onPage: true }, o);
  const ps = [
    P('home', { title: 'Coming Home', types: 'warmth' }),
    P('blank', { title: 'Untitled clip' }),                                     // no types, no character: must match nothing
    P('gate', { title: 'Bad News at the Gate', character: 'Deputy', types: 'authority, small town' }),
    P('slate', { type: 'slate', title: 'Slate' }),
    P('room', { title: 'The Quiet Room', character: 'Detective', types: 'authority, restraint' }),
    P('bit', { title: 'The Ticket', types: 'comedy' })
  ];
  const bd = 'DEPUTY COLLINS, 40s. Weathered small-town lawman with quiet authority. Restrained, never raises his voice.';
  const fit = new Map(E.roleMatch(bd, ps).map(x => [x.p.id, x.score]));
  ok('match: empty fields match nothing (Showcase matched every blank clip)', fit.get('blank') === 0 && fit.get('home') === 0 && fit.get('bit') === 0, [...fit]);
  ok('match: word roots ("authority" in the breakdown finds the authority clips; "restrained" finds "restraint")', fit.get('gate') >= 2 && fit.get('room') >= 2);
  const cast = E.orderFor('casting', ps, { breakdown: bd }).map(p => p.id);
  ok('casting: slate first, then the 3 best for the role, nothing else', cast.length === 4 && cast[0] === 'slate' && cast.slice(1, 3).sort().join() === 'gate,room', cast);
  const dir = E.orderFor('director', ps, { breakdown: bd }).map(p => p.id);
  ok('director: no slate, best match first', !dir.includes('slate') && ['gate', 'room'].includes(dir[0]) && dir.length === 5, dir);
  const me = { name: 'Jordan Reyes', email: 'j@x.com', height: "5'10\"", links: 'jordanreyes.com' };
  const m = E.resumeModel(me, [], [], ['Boxing']);
  const rep = E.pageHTML(m, ps, { audience: 'rep', shootNext: ['weathered small town sheriff'] });
  ok('rep: clips grouped by type, biggest group first, untyped under Other work last', rep.indexOf('<h2>authority</h2>') < rep.indexOf('<h2>comedy</h2>') && rep.lastIndexOf('<h2>Other work</h2>') > rep.indexOf('<h2>comedy</h2>'));
  ok('rep: links and the shoot list (only when asked)', /jordanreyes\.com/.test(rep) && /Shooting next/.test(rep) && !/Shooting next/.test(E.pageHTML(m, ps, { audience: 'rep' })));
  const castHtml = E.pageHTML(m, ps, { audience: 'casting', role: 'Deputy Collins', breakdown: bd });
  ok('casting page: names the role, carries only the chosen clips', /For Deputy Collins/.test(castHtml) && !/m\/bit\.mp4/.test(castHtml) && /m\/gate\.mp4/.test(castHtml));
  const dirHtml = E.pageHTML(m, ps, { audience: 'director', role: 'Deputy Collins' });
  ok('director page: no stats or skills block, no slate', !/Height/.test(dirHtml) && !/Special skills/.test(dirHtml) && !/m\/slate\.mp4/.test(dirHtml));
  ok('notes are plain and fit who it goes to', /for Deputy Collins\. Slate, 3 clips/.test(E.sendNote(m, 'casting', 'Deputy Collins', 3)) && /grouped by type/.test(E.sendNote(m, 'rep', '', 0)));
}

// zip
const z = E.makeZip([{ name: 'page/index.html', bytes: E.enc(html) }, { name: 'page/media/a.bin', bytes: new Uint8Array([1, 2, 3]) }]);
fs.writeFileSync(path.join(__dirname, '_out.zip'), Buffer.from(z));
ok('zip written', z[0] === 0x50);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
