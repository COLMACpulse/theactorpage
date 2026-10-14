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
