/* node hub/tests/request_tests.js : reading a self-tape request. All names and shows here are made up. */
const R = require('../request.js');
let pass = 0, fail = 0; const ok = (n, c, x) => { if (c) { pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };

// 1) the Eco Cast page as it pastes from a browser: labels, tabs, line breaks
const ECO = `Eco Cast Invitation Details
Eco Cast Title	HARBOR LINE #304 Self Tapes
Breakdown Title	HARBOR LINE #304 "LOW TIDE"
Breakdown Left Heading	One Hour Drama
Northlight Television for ABN
SAG-AFTRA
Breakdown Right Heading	Executive Producers: Ada Rowe, Tom Bell
Director: Lena Marsh
Casting Director: Dana Pell, Ross Okafor
Casting Assistant: Jo Finch
Shoot Dates: November 9-17, 2026
Rate of Pay: SAG-AFTRA
Location: Atlanta, GA
Breakdown Additional Notes	Storyline:
Role Name	DET. ANNA VOSS
Role Description	Can play the role of woman, 40s, any ethnicity. A harbor detective who has stopped believing the official version. (CO-STAR, Salary range $1,100 (one day) - $3,400 (TOS))
Casting Director
Dana Pell
Audition Instructions
Hello!

Can we please have the following self-tape? The role is ANNA VOSS. If NOT AVAIL or PASSING, please email jo@pellcasting.example

***PLEASE CONFIRM ON ECOCAST IF THEY WILL BE TAPING.**

*Please note any conflicts during these dates

DIRECTIONS:
- Include all takes in SEPARATE VIDEOS
- Include Full-Body Slate with Name, Height, and Current Location
- Frame from chest to the top of the head

Thank you!
Audition Deadline	Friday October 23, 2026 @ 5:00 PM (EDT)
Instructional Media
Click to view
ANNA VOSS.pdf
Watermarked
Submit to	Upload
Transmission Cost	FREE
Submission Notes
No notes have been submitted.`;
const a = R.read(ECO);
ok('title, show, episode, episode title', a.title === 'HARBOR LINE #304 "LOW TIDE"' && a.show === 'HARBOR LINE' && a.episode === '#304' && a.episodeTitle === 'LOW TIDE', [a.title, a.show, a.episode, a.episodeTitle]);
ok('role from Role Name, not the invited-actors table', a.role === 'DET. ANNA VOSS', a.role);
ok('type, studio, union', a.type === 'One Hour Drama' && a.studio === 'Northlight Television for ABN' && a.union === 'SAG-AFTRA', [a.type, a.studio, a.union]);
ok('casting directors, assistant, director, producers', a.castingDirectors.join('|') === 'Dana Pell|Ross Okafor' && a.castingAssistant === 'Jo Finch' && a.director === 'Lena Marsh' && a.producers === 'Ada Rowe, Tom Bell', [a.castingDirectors, a.castingAssistant, a.director]);
ok('shoot dates and location', a.shootDates === 'November 9-17, 2026' && a.location === 'Atlanta, GA');
ok('role size and pay come off the description', a.roleSize === 'CO-STAR' && a.pay === '$1,100 (one day) - $3,400 (TOS)' && /^Can play the role of woman, 40s/.test(a.roleDesc) && !/\$/.test(a.roleDesc), [a.roleSize, a.pay, a.roleDesc]);
ok('contact email, confirm on Eco Cast, conflicts', a.contact === 'jo@pellcasting.example' && a.confirmOnEcoCast && a.conflicts);
ok('directions as a checklist', a.directions.length === 4 && a.directions[1] === 'Include all takes in SEPARATE VIDEOS' && a.directions[3] === 'Frame from chest to the top of the head', a.directions);
ok('sides file names', a.sides.join('|') === 'ANNA VOSS.pdf', a.sides);
ok('tape due in their zone, to the minute: Oct 23 5:00 PM EDT = 21:00 UTC', a.due.utc === '2026-10-23T21:00:00.000Z' && a.dueFrom === 'Eco Cast', a.due);
ok('due said in theirs and yours (Los Angeles)', R.dueWords(a.due, 'America/Los_Angeles') === 'Fri, Oct 23, 5:00 PM EDT = Fri, Oct 23, 2:00 PM your time', R.dueWords(a.due, 'America/Los_Angeles'));
ok('due when you are in the same zone: said once', R.dueWords(a.due, 'America/New_York') === 'Fri, Oct 23, 5:00 PM EDT');
ok('not sent, not passed', !a.sent && !a.passed);

// 2) the same page when copied as one glued block (what a docx or some browsers give), plus the rep's email on top
const GLUED = `Please find appointment info for HARBOR LINE and the role of ANNA VOSS. Sides attached. The deadline is Friday, October 23rd at 2pm PT...please upload directly
Invited Actors
Actor
Role Name
AA Member
Deadline
SAM ACTOR
ANNA VOSS
yes
Eco Cast Invitation Details
Eco Cast Title
HARBOR LINE #304 Self Tapes
Breakdown TitleHARBOR LINE #304 "LOW TIDE" (1 ADDED ROLE)
Casting DirectorDana Pell
Audition InstructionsHello!
Can we please have the following self-tape? The role is ANNA VOSS.
DIRECTIONS:
- Include all takes in SEPARATE VIDEOS
Thank you!
Audition DeadlineFriday October 23, 2026 @ 5:00 PM (EDT)Instructional Media
ANNA VOSS.pdfWatermarked
HARBOR LINE #304 "LOW TIDE" (1 ADDED ROLE)EpisodicOne Hour DramaNorthlight Television for ABNSAG-AFTRA
Executive Producers: Ada Rowe, Tom BellDirector: Lena MarshCasting Directors: Dana Pell, Ross OkaforCasting Assistant: Jo FinchShoot Dates: November 9-17, 2026Rate of Pay: SAG-AFTRALocation: Atlanta, GA
DEADLINE: OCT 16, 2026
PLEASE SUBMIT ELECTRONICALLY ASAP.
[ANNA VOSS] Can play the role of woman, 40s, any ethnicity. A harbor detective. (1 Scene Co-Star $1,100.00 (one day) - $3,400.00 (TOS))`;
const b = R.read(GLUED);
ok('glued: title stops at the line, no instructions stuck to it', b.title === 'HARBOR LINE #304 "LOW TIDE" (1 ADDED ROLE)', b.title);
ok('glued: role is not the table header ("AA Member...")', b.role === 'ANNA VOSS', b.role);
ok('the invited actor comes off the Invited Actors table; none on a page without one', b.invitedActor === 'SAM ACTOR' && a.invitedActor === '', [b.invitedActor, a.invitedActor]);
ok('glued: keys split even with no line breaks', b.director === 'Lena Marsh' && b.castingDirectors.join('|') === 'Dana Pell|Ross Okafor' && b.shootDates === 'November 9-17, 2026' && b.location === 'Atlanta, GA' && b.castingAssistant === 'Jo Finch', [b.director, b.castingDirectors, b.shootDates, b.location]);
ok('glued: type, studio and union pulled apart', b.type === 'Episodic, One Hour Drama' && b.studio === 'Northlight Television for ABN' && b.union === 'SAG-AFTRA', [b.type, b.studio, b.union]);
ok('glued: role description from [ROLE] line, pay with cents', /^Can play the role of woman/.test(b.roleDesc) && b.pay === '$1,100.00 (one day) - $3,400.00 (TOS)' && b.roleSize === 'CO-STAR', [b.roleDesc, b.pay, b.roleSize]);
ok('glued: Eco Cast deadline wins, read in EDT', b.due.utc === '2026-10-23T21:00:00.000Z', b.due);
ok('the breakdown DEADLINE is named as the reps\' submission deadline, not your tape', b.otherDates.some(x => /OCT 16/.test(x.text) && /reps' submission deadline\. Not your tape/.test(x.what)), b.otherDates);
ok('the rep email says a different time (2pm PT = 5pm ET is the same, so no warning)', !b.otherDates.some(x => /rep's email says something different/.test(x.what)), b.otherDates);
const c = R.read(GLUED.replace('2pm PT', '1pm PT'));
ok('rep email with a different time: flagged, Eco Cast still the due', c.due.utc === '2026-10-23T21:00:00.000Z' && c.otherDates.some(x => /rep's email says something different/.test(x.what)));

// 3) only the rep's email
const E = R.read('Hi! New self-tape for BAYSIDE, role of MARCO. The deadline is Tuesday, March 3rd at 8am PST. Sides attached.');
ok('email only: "role of MARCO" is the role', E.role === 'MARCO', E.role);
ok('email only: due from the rep, 8am PST = 16:00 UTC, year taken from now', E.due && E.due.hh === 8 && E.due.zone === 'PST' && /T16:00:00/.test(E.due.utc) && E.dueFrom === "your rep's email", E.due);
// 4) dates
ok('PT means PDT in summer and PST in winter', R.parseWhen('July 13, 2026 1:00 PM PT').utc === '2026-07-13T20:00:00.000Z' && R.parseWhen('Jan 13, 2026 1:00 PM PT').utc === '2026-01-13T21:00:00.000Z');
ok('no zone written: read as your own clock and said so', !!R.parseWhen('Oct 23, 2026 at 5pm').local && /no time zone written/.test(R.dueWords(R.parseWhen('Oct 23, 2026 at 5pm'), 'UTC')));
ok('date only: says to ask for the time', /no time given; ask your rep/.test(R.dueWords(R.parseWhen('FEB 27, 2026'), 'UTC')));
ok('noon, 12am, 12pm', R.parseWhen('Oct 2, 2026 noon EDT').utc === '2026-10-02T16:00:00.000Z' && R.parseWhen('Oct 2, 2026 12:00 AM EDT').utc === '2026-10-02T04:00:00.000Z' && R.parseWhen('Oct 2, 2026 12pm EDT').utc === '2026-10-02T16:00:00.000Z');
ok('nothing found: says ask your rep', R.dueWords(null) === 'No tape due date found. Ask your rep.');
// 5) status lines
const S = R.read(ECO.replace('Submit to	Upload', 'The audition deadline has passed.\nSubmit to	Your audition has been sent.'));
ok('sent and passed are noticed', S.sent && S.passed);
ok('no scores anywhere', !/score|%|ready/i.test(JSON.stringify(a)));

// 6) the due date in a rep's or casting's own words (made-up request)
{ const base = 'Hi Riley,\nCanyon Casting would like a self-tape for DUST ROAD, role of SHERIFF COLE. ';
  const due = t => R.read(base + t).due;
  ok('"Due Friday 10/24 by 5pm PT" is the tape due', (d => d && d.mo === 9 && d.d === 24 && d.hh === 17 && /P[DS]T/.test(d.zone))(due('Due Friday 10/24 by 5pm PT.')));
  ok('"please submit by" and "need it by" too', !!due('Please submit by 10/24 at 5pm PT') && !!due('We need it by Oct 24 at noon ET'));
  ok('shoot dates are never read as the tape due', !due('Shoot dates 11/4 - 11/5. Thanks!')); }

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
