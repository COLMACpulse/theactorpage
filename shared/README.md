# The sides shelf · `shared/shelf.js`

Drop your sides once, in any ACT tool. Every other tool has them, with your character, the next time it opens.

**Who uses it:** ACTOR OS, BREAKDOWN, MEMORIZER put sides on it and pick them up. CPS reads the characters off it for "From your sides".

**How it behaves**
- Sides dropped, pasted or sent in (from Writer's Blockage too) go on the shelf and become current.
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
- **Everywhere at once:** taping or learning it puts it on the sides shelf with your part, so Actor OS, MEMORIZER and BREAKDOWN all have it. Make it yours opens it in Writer's Blockage.
- **Storage:** localStorage `theactorpage_daily_v1` (done list, today's pick), this phone only.
- **Tests:** `node shared/test_scenes.js` (337: every scene reads as exactly its two parts in both readers on the site, same speech counts, no em dashes, at least 6 speeches for your part, picking rules). Browser 10/10 (landing → MEMORIZER → Actor OS → other part → keep a take marks it done → another one → BREAKDOWN → Writer's Blockage).

Replaces DAILY SCENE ENGINE v2/v3 (a 72-line phrase bank: 89% of a day's lines repeated within a week, one fixed shape every day, the private objective spoken as dialogue, a copyright guard that deleted ordinary words).

# The script reader · `actor-os/sides.js` + `actor-os/pdf.js`

One reader for a script, whatever form it comes in. **Who uses it:** ACTOR OS, MEMORIZER, STORY STUDIO, PAPER TRAIL, and Writer's Blockage when it opens a PDF it didn't make. BREAKDOWN keeps its own page-position reader (it read every test file right).

- **Forms:** plain sides (NAME on its own line, or NAME: line), text pasted out of a PDF, Fountain, Final Draft (`ActorSides.fromFdx`, the one .fdx reader; Story Studio and Paper Trail both use it), and PDF (`ActorPDF.extract` + `toSides`, 16 KB, no library).
- **Final Draft:** its own element types decide what each line is. A heading it calls a heading is one; an action line that looks like a name stays action. Nothing is guessed.
- **What it gets right now:** names with a number (COP #2), camera words that are never people (LOW ANGLE:, POV DECKHAND:, FLASHBACK:, LATER), one speech across a page break ((MORE) / CONT'D), Fountain scene numbers (#12#) and bold/underline marks, running headers, page numbers, revision stars, and watermark bits in pasted text.
- **Crossed out on the page:** casting sites cross out what isn't your scene with a box and an X laid over the page as a see-through picture. `ActorPDF.extract` finds the marks and leaves those lines out (`ex.struck` says how many; Actor OS and Writer's Blockage say so on screen). A line struck through is left out too. A highlighter or a START / END arrow is not a crossing.
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
