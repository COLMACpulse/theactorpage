/* THE PLAN, the pure part. Made-up shows, offices and places only.  node shared/test_plan.js */
const mem = {}; globalThis.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = String(v); } };
const P = require('./plan.js'); let ok = true; const want = (n, x, y) => { console.log((x ? 'PASS ' : 'FAIL ') + n + (x || y === undefined ? '' : ' ' + JSON.stringify(y).slice(0, 600))); if (!x) ok = false; };
const D = '2026-10-22'; /* a Thursday */
want('days: next Thursday is next week, this Saturday is this week, a bare day is the next one', P.dayOf('next thursday', D) === '2026-10-29' && P.dayOf('this saturday', D) === '2026-10-24' && P.dayOf('monday', D) === '2026-10-26' && P.dayOf('thursday', D) === '2026-10-29');
want('days: today, tomorrow, 10/30, Oct 31st, Nov 2', P.dayOf('today', D) === D && P.dayOf('tomorrow', D) === '2026-10-23' && P.dayOf('due 10/30', D) === '2026-10-30' && P.dayOf('october 31st', D) === '2026-10-31' && P.dayOf('nov 2', D) === '2026-11-02');
want('days: a weekday before the due day stays before it', P.dayOf('wed', D, '2026-10-29') === '2026-10-28' && P.dayOf('early thursday', D, '2026-10-29') === '2026-10-29');
want('times: 11:00am, 5pm, noon, by 3:30', P.timeOf('due at 11:00am') === '11:00' && P.timeOf('by 5pm') === '17:00' && P.timeOf('noon') === '12:00' && P.timeOf('by 3:30') === '15:30' && P.timeOf('no time') === '');
const NOTE = "i got an audition for next thursday. ridgeline casting. recurring quest star.  harbor lights. i've read for the office a bunch, they cast me in my last gig. same universe. coast guard captain.  character is tall. i have a reader, want to get it done wed or early morning thursday. working next week in ohio. its due at 11:00am, direct submit to actorsaccess. see casting notice for additional info";
const h = P.hear(NOTE, D);
want('heard: the title, from the short line nobody else claimed', h.title === 'Harbor Lights', h);
want('heard: "quest star" is guest star, recurring', h.role === 'Recurring guest star');
want('heard: the office, and you have worked with them', h.office === 'Ridgeline Casting' && h.officeHistory === 'worked_with');
want('heard: due next Thursday at 11:00', h.due === '2026-10-29' && h.dueTime === '11:00');
want('heard: tape Wednesday, or early Thursday', h.tape.join() === '2026-10-28,2026-10-29' && h.tapeEarly);
want('heard: direct submit on Actors Access; check the notice; you have a reader', h.via === 'Actors Access' && h.direct && h.notice && h.reader === 'have');
want('heard: working out of town, in your words', h.heads.join() === 'Working next week in ohio.');
want('heard: the character in your words, in the order you said it', h.character.join('|') === 'Coast guard captain|tall');
want('heard: the rest kept as you said it', h.notes.join('|') === 'same universe.');
want('heard: "see casting notice" is never an office', !/notice/i.test(h.office));
const b = P.build(h, D), L = b.steps.map(s => P.dayLabel(s.date, D) + ' | ' + s.what);
want('the plan: read today with the notice, break it down, learn, run with your reader, tape, send', /^Today \| Read the sides and the casting notice/.test(L[0]) && /^Tomorrow \| Break it down/.test(L[1]) && /^Saturday \| Get off book/.test(L[2]) && /^Tuesday \| Run it with your reader/.test(L[3]) && /^Wednesday \| TAPE IT\. Backup: Thu, Oct 29 early, done by 9:00 AM\.$/.test(L[4]) && /^Thu, Oct 29 \| SEND IT by 10:00 AM, an hour before it's due: direct submit on Actors Access\./.test(L[5]), L);
want('heads up: away, and where you and your reader will be on tape day', b.heads.join('|') === 'Working next week in ohio.|Your tape day is Wednesday. Where will you and your reader be?', b.heads);
/* another way of saying it */
const h2 = P.hear('Co-star on Night Shift for Mesa Casting. Never read for them. Due friday 10/30 by 5pm, send it to my agent. Need a reader. She is a nurse who has seen it all.', D, { titles: ['Night Shift'] });
want('a known title, a co-star, a first-time office, due Friday by 5', h2.title === 'Night Shift' && h2.role === 'Co-star' && h2.office === 'Mesa Casting' && h2.officeHistory === 'new' && h2.due === '2026-10-30' && h2.dueTime === '17:00', h2);
want('through your rep; you need a reader; the character in your words', h2.via === 'Through my rep' && h2.reader === 'need' && h2.character.join() === 'a nurse who has seen it all');
const b2 = P.build(h2, D);
want('no tape day said: the day before it is due; find a reader today', b2.tapeDay === '2026-10-29' && b2.steps.some(s => s.kind === 'reader' && s.date === D) && b2.steps.find(s => s.kind === 'send').what.startsWith('SEND IT by 4:00 PM'));
/* tight */
const b3 = P.build(P.hear('Self-tape due tomorrow at noon.', D), D);
want('due tomorrow: everything today, tape today, send tomorrow by 11', b3.steps.filter(s => s.date === D).length >= 3 && b3.steps.find(s => s.kind === 'tape').date === D && /^SEND IT by 11:00 AM/.test(b3.steps.find(s => s.kind === 'send').what), b3.steps);
want('self-tape is never an office', P.hear('Self-tape due tomorrow at noon.', D).office === '');
const b4 = P.build(P.hear('Got a callback, not sure when yet.', D), D);
want('no deadline heard: says so, and still starts you reading', /No deadline heard/.test(b4.heads[0]) && b4.steps.length === 1 && b4.steps[0].kind === 'read');
/* kept, and the agenda */
const p = P.make(NOTE, h, D);
want('kept: the note, what it heard, the plan; not on your agenda until you say', P.get(p.id).text === NOTE && P.get(p.id).plan.steps.length === 6 && P.agenda(null, D).length === 0);
P.set(p.id, { agenda: true }); P.toggle(p.id, 0);
const ag = P.agenda(null, D);
want('on your agenda: the steps not done, each to the plan', ag.length === 5 && ag[0].line.startsWith('Harbor Lights: Break it down') && ag.every(l => l.href === 'plan/?p=' + p.id) && !ag.some(l => /names it, sizes it/.test(l.line)), ag);
want('after the due day, it leaves the agenda', P.agenda(null, '2026-10-30').length === 0);
const h5 = Object.assign({}, h, { due: '2026-10-30' }); P.rebuild(p.id, h5, D);
want('fix what it heard: the plan follows', P.get(p.id).plan.steps.find(s => s.kind === 'send').date === '2026-10-30');
want('no em dashes, no "thing", no score', !/—|\bthings?\b|score/i.test(require('fs').readFileSync(__dirname + '/plan.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')));
/* everything else (from GSD) */
want('to-dos: one line, split where a new thing to do starts', JSON.stringify(P.items('Today, call my agent and fix the gate, tape it and send it')) === JSON.stringify(['Call my agent', 'Fix the gate', 'Tape it', 'Send it']));
want('"call Bob and Sue" stays one', P.items('call Bob and Sue').length === 1);
want('when: from the front, or whole words', P.whenOf('This week: dialect class') === 'week' && P.whenOf('this month update my reel') === 'month' && P.whenOf('fix the weekend gate') === 'today');
want('lanes: a first guess from the words', P.laneOf('Watch two episodes of the show') === 'research' && P.laneOf('Rent a lens for the shoot') === 'shoot' && P.laneOf('Dialect class') === 'study' && P.laneOf('Pick up the self tape sides') === 'auditions' && P.laneOf('Fix the gate') === 'other');
want('an audition, not a to-do', P.isAudition('I got an audition for Harbor Lights') && !P.isAudition('call my agent'));
want('"an audition for Harbor Lights": the title', P.hear('I got an audition for Harbor Lights, the role of Ray, due Friday at 5pm.', '2026-10-22', {}).title === 'Harbor Lights' && P.hear('i got an audition for next thursday.', '2026-10-22', {}).title !== 'Next Thursday');
localStorage.setItem('gsd_v1_1_tasks', JSON.stringify([{ title: 'Mow the lawn', horizon: 'week', status: 'open' }, { title: 'Old', status: 'done' }]));
want('the old GSD list comes over once, what\'s still open', P.fromGsd() === 1 && P.fromGsd() === 0 && P.todos().some(t => t.title === 'Mow the lawn' && t.when === 'week'));
const tw = P.addTodos('today, read the new pages'); P.setTodo(tw[0].id, { done: true });
const bd = P.board('2026-10-22');
want('the board: to-dos by when, done ones last', bd.today.some(x => x.title === 'Read the new pages' && x.done) && bd.week.some(x => x.title === 'Mow the lawn'));
want('clear what\'s done', P.clearDone() === 1 && !P.todos().some(t => t.done));
console.log(ok ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok ? 0 : 1);
