# The sides shelf · `shared/shelf.js`

Drop your sides once, in any ACT tool. Every other tool has them, with your character, the next time it opens.

**Who uses it:** ACTOR OS, BREAKDOWN, MEMORIZER put sides on it and pick them up. CPS reads the characters off it for "From your sides".

**How it behaves**
- Sides dropped, pasted or sent in (from THEACTORPAGES too) go on the shelf and become current.
- Picking your character in any tool sets it for all of them. So does the scene you mark in Actor OS.
- A tool opens the current sides only if they changed since it last looked, and says so in one line: "New sides: RENNIE, LAST BUS sides." It never pulls you off a script you chose in that tool.
- Opening an older script in any tool makes it current, and the others follow next time they open.
- The same file dropped in two tools is one entry (known by its name and size). The first reading is kept, so every tool reads the same words.
- Each tool keeps its own work (takes, notes, marks, progress) tied to the shelf entry.
- Newest 12 kept. The original file (the PDF) is kept too, so BREAKDOWN can show the real pages.

**Where it lives:** this phone only. localStorage `theactorpage_shelf_v1` (the list, as plain sides text) and IndexedDB `theactorpage_shelf` (original files). Nothing uploaded.

**The plain text:** NAME on its own line, the speech under it, a blank line between. Both readers on the site (Actor OS's `sides.js` and BREAKDOWN's `parser.js`) read it the same way. Tested on LAST BUS: CAL 11, RENNIE 10, MOM 1 in both.

**Tests:** `node shared/test_shelf.js` (15). Cross-tool browser test: 19/19 (BREAKDOWN → MEMORIZER → ACTOR OS → paste new sides → everything follows → switch back → CPS chips → offline).

# Today's scene · `shared/scenes.js`

One original two-hander a day. 30 scenes written for this site, any actor can play either part, the want is under the lines and never said. Each is tagged with what it trains (listening, status, secret, silence, comedy, reversal, objective, relationship, circumstance, tactic).

- **Where it shows:** the landing page (Tape it / Learn it / Make it yours) and Actor OS PREP (Today's scene card: pick your part, TAPE IT, MAKE IT YOURS, ANOTHER ONE).
- **The pick:** the same scene all day (your local date). A scene you haven't done. It leans toward the choice Actor OS shows you've tried least (objective, tactic, relationship, secret, circumstance). Another one moves on.
- **Done:** keeping a take in Actor OS while today's scene is loaded marks it done. When all 30 are done, it starts over.
- **Everywhere at once:** taping or learning it puts it on the sides shelf with your part, so Actor OS, MEMORIZER and BREAKDOWN all have it. Make it yours opens it in THEACTORPAGES.
- **Storage:** localStorage `theactorpage_daily_v1` (done list, today's pick), this phone only.
- **Tests:** `node shared/test_scenes.js` (337: every scene reads as exactly its two parts in both readers on the site, same speech counts, no em dashes, at least 6 speeches for your part, picking rules). Browser 10/10 (landing → MEMORIZER → Actor OS → other part → keep a take marks it done → another one → BREAKDOWN → THEACTORPAGES).

Replaces DAILY SCENE ENGINE v2/v3 (a 72-line phrase bank: 89% of a day's lines repeated within a week, one fixed shape every day, the private objective spoken as dialogue, a copyright guard that deleted ordinary words).

# The script reader · `actor-os/sides.js` + `actor-os/pdf.js`

One reader for a script, whatever form it comes in. **Who uses it:** ACTOR OS, MEMORIZER, STORY STUDIO, PAPER TRAIL, and THEACTORPAGES when it opens a PDF it didn't make. BREAKDOWN keeps its own page-position reader (it read every test file right).

- **Forms:** plain sides (NAME on its own line, or NAME: line), text pasted out of a PDF, Fountain, Final Draft (`ActorSides.fromFdx`, the one .fdx reader; Story Studio and Paper Trail both use it), and PDF (`ActorPDF.extract` + `toSides`, 16 KB, no library).
- **Final Draft:** its own element types decide what each line is. A heading it calls a heading is one; an action line that looks like a name stays action. Nothing is guessed.
- **What it gets right now:** names with a number (COP #2), camera words that are never people (LOW ANGLE:, POV DECKHAND:, FLASHBACK:, LATER), one speech across a page break ((MORE) / CONT'D), Fountain scene numbers (#12#) and bold/underline marks, running headers, page numbers, revision stars, and watermark bits in pasted text.
- **Crossed out on the page:** casting sites cross out what isn't your scene with a box and an X laid over the page as a see-through picture. `ActorPDF.extract` finds the marks and leaves those lines out (`ex.struck` says how many; Actor OS and THEACTORPAGES say so on screen). A line struck through is left out too. A highlighter or a START / END arrow is not a crossing.
- **Pasted text:** with the page layout kept, it reads each line by its column, like the PDF reader. Without it, a line wider than a speech line ends the speech when no blank line does.
- **What it can't fix:** a cross in pasted text (the marks don't paste), and pasted text where the PDF viewer put words in the wrong order (a name below its action, two speeches on one line). Open the PDF instead.
- **Tests:** `node shared/test_reader.js` (21): LOW TIDE, made up, in eight forms (`shared/fixtures/`), including two crossed-out PDFs. Also checked on a real feature .fdx (108 of 108 scenes, 427 of 427 speeches) and real Breakdown Services sides (17 of 17 lines from the PDF with the crossed-out speech left out; 17 of 17 pasted with layout, 15 of 17 pasted plain). Those files are private and not in the repo.

# Home: drop it once · `shared/home.js`, `shared/intake.js`, `shared/inbox.js`

The YOU room on the home page. Drop or paste anything; it reads what each thing is and sends it where it belongs, so nothing is typed twice.

- **Sides** go on the sides shelf with your part picked from the request that names them (DET. ANNA VOSS is ANNA). No request: one tap on the part. Actor OS, Memorizer, Breakdown, CPS have them.
- **A script or draft** (a title page, or many scenes) goes on the shelf and into the inbox for Paper Trail. Story Studio and Actor OS have it.
- **A self-tape request or rep email** (pasted, .txt, .eml, Word, or an Eco Cast page saved as PDF) goes into the inbox for the Hub, which adds the audition once with the tape due in your time. Your name off the Invited Actors table goes on the Actor OS slate.
- **Footage**: a page can't keep video, so Story Studio reads it from the folder. **Photos** and other files: not placed, and it says so.
- **In play**: the next tape due, the sides on the shelf and your part, the drafts.
- Dropped together, scripts go first so the audition sides end up current.
- **Inbox:** localStorage `theactorpage_inbox_v1`, newest 40; each tool takes an item once. **Offline:** `sw.js` at the root, home files only.
- **Tests:** `node shared/test_intake.js` (16); browser home01 18 (drop five things, Actor OS, Hub, Paper Trail pick them up, offline).

# Your profile · `shared/you.js`

One profile on this phone: name, union, rep and rep phone, your phone, email, height, weight, hair, eyes, local hire, credits, training, skills, accents, headshots.

- **Filled from:** your résumé dropped on home (PDF with columns, Word, or pasted text: `Intake.resumeRead`), your headshots (kept at up to 1600 px; the first is the main one), and the name on a self-tape request.
- **Read by:** the Hub (clears the demo actor, then fills its blanks; credits and headshots come in once each), Virtual Résumé (the top, skills with accents, training, headshot), Slate Maker (name, height, rep, headshot), Actor OS (your name on the slate).
- **Rules:** a tool only fills its own blanks, never overwrites what you typed there. A line you fix in the profile stays fixed; a later résumé only adds what's new.
- **Storage:** localStorage `theactorpage_you_v1`, IndexedDB `theactorpage_you` (photos). Nothing uploaded, nothing sent anywhere.
- **Tests:** `node shared/test_intake.js` (23, with a made-up résumé in `shared/fixtures/`); browser home02 13. Checked privately on a real 31-credit résumé and two headshots (31 of 31 credits, 10 skills, 11 accents), files deleted.

# CAMERA, MIC, TYPEWRITER · `shared/capture.js`, `shared/takes.js`, `shared/studio.js`

Three big buttons on home. Shoot first; it already knows what's in play and offers it.

- **CAMERA:** the self-tape for a request that's due (named NAME_ROLE_take1_date.mp4), a practice run of the sides on the shelf, a scene take for the script open in Story Studio (pick the scene), a reel clip, or just keep it. **PHOTO** keeps a headshot in your profile. Front camera mirrored on screen, not in the file. Timer 3 or 10 s.
- **MIC:** a voice note, a practice run, a self-tape's sound.
- **TYPEWRITER:** THEACTORPAGES.
- **Where takes go:** the takes shelf (localStorage `theactorpage_takes_v1`, IndexedDB `theactorpage_takes`). Actor OS takes self-tapes and practice runs into TAKES; the Hub puts a self-tape on its audition and a clip in the library; Story Studio puts a scene take on its scene in CUT, on the script it was shot for, and the file stays, so it plays after the page is closed. Each tool takes a take once.
- **SAVE TO PHONE** on every take: the share sheet on a phone, a download on a computer. A phone limits what a page keeps and an iPhone can clear it.
- **The one camera and mic (`capture.js`):** MP4 first, WebM when the browser can't; raw mic (no echo cancelling, noise gate or auto gain); a chosen device falls back to any; screen kept awake while recording; released when you leave; plain words for every refusal. Built from Actor OS's performer camera, Slate Maker, Story Studio's rough cut and Match Camera.
- **Not yet:** each tool's own camera and mic inside the tool (Actor OS, Slate Maker, the Hub's tape, CPS, Paper Trail, Story Studio's ADR and Match Camera) still runs its own code. Next: switch them to `capture.js` one at a time.
- **Tests:** `node shared/test_capture.js` (7); browser home03 16 (fake camera and mic: self-tape, scene take, photo, voice note; Actor OS, Hub and Story Studio pick them up; the scene take plays after a reload).

# Voice over copy · `shared/vocopy.js`

Reads ad and VO copy the way it comes in, which isn't screenplay format. Used by VO BOOTH.

- **A spot:** a title with its length: "Morning Ride :30", "LAST CALL:15", "Salt Flats :30 (Hero)". A clock time (10:30) is not a length.
- **A line:** starts with who says it: "VO:", or the character ("DC:"). STING, ENDCARD, SUPER, SFX and the like are not voices.
- **ALT:** "ALT:", "ALT VO:", "ALT 2:" is another way to read the line just above it, and stays with that line.
- **Directions** ("HE WINKS") are kept as notes before the next line.
- **Wrapped lines:** a PDF line that carries on the copy above it joins it: indented past the directions, or the copy plainly runs on (an open quote, a little joining word, lower case).
- **The agent's note:** due, client ("Northgate Coffee - please read..."), one MP3, the order ("(A, B, C - in that order)").
- **Your voice:** each script's main voice (VO first, then the most lines) unless you pick one.
- **Tests:** `node shared/test_vocopy.js` (15). Checked privately on two real jobs (3 PDFs + a brief, and a Word file with 7 spots); not in the repo.

# Voice over sound · `shared/voaudio.js`

The Audacity step, as plain maths on the samples (runs in Node for the tests).

- **room():** the closet with you quiet. -60 dB or under is the usual bar.
- **trim():** cuts the dead air, keeps 0.15 s of room before and 0.25 s after.
- **loudness():** LUFS by ITU BS.1770 (the libebur128 filters). Matches ffmpeg's meter to 0.1 LU on test tones and on a real audition file.
- **build():** kept takes in reading order; rumble cut; gaps (0.6 s between lines, 1.5 s between spots) filled with your own room, not dead silence; one level for the whole read (-20 LUFS by default); every sample held under -3 dB.
- **mp3():** LAME (`shared/vendor/lame.min.js`, lamejs 1.2.1, LGPL, used unchanged as a separate file). **wav():** 16-bit mono.
- **Tests:** `node shared/test_voaudio.js` (15, including ffprobe and ffmpeg's loudness meter on the MP3 when they're installed).

# Office history · `shared/offices.js`

Your real history with a casting office, in one line, from the Project Hub's records on this device: reads before this one, confirmed, callbacks, booked, the last read when it has a date. On every new request (home and the Hub). Tests: `node shared/test_offices.js` (8).

# Notes from the room · `shared/notes.js`

For the actor who takes a class, a workshop, a callback, mostly on Zoom. THEACTORPAGE doesn't run the room; it keeps what you get from it. Used by NOTES (/notes/), the Hub and home.

- **A session:** date, kind of room (class or workshop, callback, set, other), who was in it (name and role: casting, director, coach), the scene and your part, the sides (on the shelf).
- **Marks and tapes:** MARK pins the moment a note starts; if TAPE IT was rolling, the mark lands on that tape at that second. Tapes go on the takes shelf as `session` (Actor OS doesn't copy them in).
- **A note:** their words, who gave it, the moment, an optional voice memo.
- **Back out:** by person, by scene, and what more than one person told you (`repeats()`: words and two-word phrases in notes from 2+ different people; your own notes to yourself don't count; "rush", "rushing" and "rushed" are one word). No scores.
- **Elsewhere:** the Hub counts a casting director you were in a room with as "has seen me", shows the rooms and notes in their drawer, and puts "Dana Pell gave you 2 notes, the last in Mar 2026: ..." on a new request (home too).
- **Storage:** localStorage `theactorpage_notes_v1`, text only. Nothing uploaded. Speech to text is optional and says first that it goes through Apple or Google.
- **Tests:** `node shared/test_notes.js` (16), `notes/tests/notes_e2e.js` (17, fake camera and mic).

# Headshots · `shared/headshots.js`

Mined from HEADSHOT v1 to v4.2 (Col's own). Used by HEADSHOTS (/headshots/), on the same headshots as YOUR PROFILE (`shared/you.js`: each photo now carries `roles`, `status` keeper / retest / retire, `note`, its original size and its `check`).

- **The photo check:** you (the middle of the frame, minus the backdrop showing round your head) measured apart from the background (side strips, top). A dark backdrop with you lit says "Dark background, you lit.", not a dark face; a white wall with you in shadow says "You read dark" and "The background is brighter than you". Plus near-white and near-black areas on you, softness in the middle of the frame, and the original size. What it measured, with the numbers. No advice.
- **Never:** a word about looks, type, age, skin or roles. Tested.
- **Coverage:** "Law enforcement: covered (cop_03). Bartender: no keeper yet (1 to retest)." Your own tags only; no percent.
- **Before / after**, the photographer **brief** and **shot sheet** (standalone pages; only what you put in, references only if ticked; the checks and your notes never go in).
- **Tests:** `node shared/test_headshots.js` (16), `headshots/tests/headshots_e2e.js` (16, made-up photos).

# Spotted · `shared/spotted.js`

You don't see the breakdowns; your reps do. You see everything else. Mined from COMMERCIAL READY v2.1 and v3 (its notice reader was written to one notice; its conflict register only matched identical text). Used by SPOTTED (/spotted/) and the Hub's request card.

- **The reader:** a callback notice (labeled fields), a rep's or casting's email ("callback with Ross Okafor for Salt Flats Water"), a trade story ("'Dry Creek' ... Wren Ashby is casting"), a public listing ([ROLE] in brackets, "Casting by"), a post. Pulls project, role(s), who's casting, union, kind of job, network, where, dates, pay as written, conflicts as written, and the musts quoted ("Must ride a bicycle."). Nothing guessed: "Casting HAL BRODY's new short" gives no project and no casting. Private links (Zoom, your Eco Cast page) are kept off every note; "My Representation" and contact lines are never read in.
- **Your facts next to it:** `Offices.history` ("You and Dana Pell: 2 reads before this"), `Notes.lineFor`, your roles that share a word with this one ("Roles of yours with \"dad\": 1 booked: Cycling Dad (Morning Ride)"), your credits on the same kind of job when the kind is written, a conflict you hold that's still running and shares a word with what this one lists, and what you've spotted from that office before. No score, no verdict. Tested.
- **Three notes:** `passAlong` ("Just passing this along." To your reps, with the facts), `pitch` (for your rep to send the office: your history with them, your matching credits, reel and résumé, "Love to hear from you."), `direct` (your voice). You edit, you send.
- **The list:** `find` (every word somewhere in the row), `listText`, `listHtml` (a standalone searchable page for your manager, links included, private links never).
- **Hub:** `withSpotted()` fills a request's blanks (Project Name, Role Name, casting), adds callback and fitting dates, puts the musts on the checklist and pay and conflicts as written on the card.
- **Storage:** localStorage `theactorpage_spotted_v1`. The Hub and NOTES are read, never written. Nothing uploaded.
- **Tests:** `node shared/test_spotted.js` (49), `spotted/tests/spotted_e2e.js` (25, made-up notices).

# Film Hub · `shared/filmhub.js`

FILM's hub, like the Project Hub for ACT, from the filmmaker's side. Used by FILM HUB (/filmhub/). Pass Story Studio's engine (`film/film.js`) in.

- **Where it stands:** `status(script, F)` counts from what you marked in Story Studio: scenes, planned, at a place, shots done of the shot list (Story Studio's own list), scenes fully shot, takes logged, pieces in the cut and its length against the target, ADR kept, parts named, crew. `stage()` is a word from those counts (Script, Planning, Shooting, Cutting) unless you mark it Done. `words()` says it plainly. No score.
- **People:** `people(scripts, F, handFilms)`: the actor for each part and the crew lines from Story Studio, plus "Job: Name" lines on films added by hand; most films first. Contacts and phone numbers never come in.
- **The page:** `pageHtml(films, me)`: banner, your name, about, and each film shown (poster, year, kind, runtime, logline, credit line, links: http(s) only). Never the script, notes, call times or contacts.
- **Title:** the script's own `Title:` line, else the file name.
- **Storage (the app):** localStorage `filmhub_v1`, posters in IndexedDB `filmhub` (600 px JPEG). Story Studio's `film_os_v1` is read, never written. Story Studio opens on a film from `../film/#open=<id>`.
- **Tests:** `node shared/test_filmhub.js` (19), `filmhub/tests/filmhub_e2e.js` (17, made-up film).
