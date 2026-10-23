# BREAKDOWN v0.3.2 · Actor Edition

**Asset #5.** Merges SCRIPT BREAKDOWN v0.2, SCENE BREAKDOWN v0.2 and CHARACTER BREAKDOWN v0.2 into one tool.
Your role, read off the page. Drop your sides. It does the highlighter work. You make the choices. Offline, no account.

**New (2026-10-23): the front.** Opened with nothing: an example (MARA, made up) reads a page as you watch, with YOUR SIDES and + BRING IN SIDES, lists only when tapped. New sides from another tool wait in YOUR SIDES marked NEW. `?sides=<shelf id>` opens those sides to your role; `?open=1` opens the newest. Your role comes first; SAY IT, MIC and CAMERA sit under it.

## New in 0.3.2 (2026-10-14)
- **The sides shelf.** Sides you drop here are on the shelf for Actor OS and MEMORIZER, with your role. Sides dropped in another tool open here straight to your role, with "New sides: …". The original PDF travels with them, so the page view still works. See `../shared/README.md`.
- **Fix: speeches lost at page breaks.** A character name at the top or bottom of a page was taken for a running header when it showed up at page edges on most pages, and its speech went missing. On the flipped test PDF, 4 speeches were lost (CAL 9 of 11, RENNIE 8 of 10). A name followed by dialogue is never a header now. LAST BUS checks pass on both PDF directions (32/32 in the browser).

## The flow
1. **Drop** a PDF, Final Draft `.fdx`, Fountain or TXT. Or paste. No form, no project name.
2. **Pick your role** from the names it found. That's the only decision, and you make it once there's something on screen.
3. Everything after that is optional:
   - **ROLE**: your character file, built from the page. Stats, first appearance, what you say about yourself, what the page shows you doing, what others say about you, questions put to you, relationships, timeline, arc receipt.
   - **SCENES**: the whole script as a strip with your scenes lit. Open one and your lines are highlighted, your cue lines marked, and six layers (Objective, Obstacle, Event, Turn, Pressure, Power shift) can be toggled on and off. The scene receipt runs entry state → layers → exit state.
   - **RUN**: run lines. The cue shows, your line stays hidden (or first letters only) until you tap. The screen stays awake.
   - **LEDGER**: every note is Recovered, Inferred or Speculative. Recovered won't save without a linked line. Moving a note between tiers asks why and keeps the record. Searchable.
   - **PACK**: project file, passes, print packet, receipts, parse check.

Tap any line, anywhere, to tag it, note it, link it, or start a contradiction pair.

## Rubric
| Question | Answer |
|---|---|
| Pain in the ass | Breaking down sides by hand: highlighter, margin notes, a separate doc for character work. Gone. |
| What you don't have | Line-level evidence, auto-found cues, questions put to you, what others say about you, a run-lines drill from the same file. |
| How many sources | One file in. Three v0.2 tools collapse into one. |
| Keep track / use it | Autosave, project file, frozen passes you can compare, printable packet with highlighted sides. |

## v0.2 → v0.3
| v0.2 | Now |
|---|---|
| Opened with a "thread terms" form pre-filled from the sample | Gone. Material first. |
| Events/pressure = a hard-coded word list (gun, father, money...) | Cut. Pressure is what you tag, never a keyword count. |
| Story Operating Score | Cut. It measured keyword hits, answered none of the four questions. |
| Thread / Question / Collision / Dependency engines | Cut from ACT. These are writer tools. Belong to WRITE. |
| All-caps dialogue read as a character | Fixed. Reads by layout when there is layout, by blank lines when there isn't, and vetoes shouting. |
| Paste only | PDF (text layer), FDX, Fountain, TXT, paste. |
| Validation harness shipped with a failing test | 71-case parser suite + 46-step browser run, all passing. |
| Desktop-only two-column grid | Phone first, 44px taps, bottom nav. Side rail on desktop. |
| Character: Ledger, Contradiction, Timeline, Relationship Map, Evidence View, Arc Receipt | All built. |
| Scene: Layers, Receipt v2, Visual Map, Comparison Mode | All built. Comparison = passes. |

## Added to complete the asset
- **Parse check.** Every block shown with what it was read as. Tap one that's wrong and fix it. Your notes follow their quotes.
- **Revised pages.** Load the new draft and keep everything. Links re-anchor by quote, and any that can't be found are flagged, never dropped.
- **Nicknames.** "Also called: Ren" catches lines where others don't use your full name.
- **Doubling.** Play more than one role as one "you".
- **Pronoun actions.** "She tears the ticket" right after your line shows up under what you do, labeled as not named.
- **Evidence integrity** (from the Case File). Recovered / inferred / speculative split plus % of notes tied to a line, on the ledger and in the print packet.
- **Unlinked filter** (from the Case File). Every note not tied to a line, in one place: find support or cut it.
- **Own-words contradictions** (from the Case File). Says / Does in your own words when the "does" is a choice or a read, not a line. Each side can be a line or text; both sides are required. Recovered still needs a real line.
- **Receipts.** SHA-256 chain over import, passes, saves, revisions. Tampering with a pass in the file is detected.

## Files
```
index.html             app shell + styles
app.js                 the app
parser.js              screenplay reader (pure, also runs in Node)
sw.js, manifest.webmanifest, icons/   offline + home-screen install
vendor/                pdf.js 3.11.174 (Apache-2.0)
fonts/                 Jost, Courier Prime (OFL)
samples/               LAST BUS sides as PDF, FDX, TXT + the v0.2 sample
tests/run_tests.js     node tests/run_tests.js  (PDF cases need pdfjs-dist on NODE_PATH)
tests/harness.html     same checks in any browser, from the hosted site
MANIFEST.json          bytes + sha256 for every file
```

## Delivery
Phone use needs it hosted: drop the `breakdown/` folder in the theactorpage repo (e.g. `/act/breakdown/`), commit, open on the phone, then Add to Home Screen. Desktop also runs it by double-clicking `index.html` (file://), PDFs included.

## Proven vs hypothesized
**Proven (run and observed, headless Chromium):**
- Parser: 71/71 across layout TXT, flattened paste, FDX, PDF via pdf.js, Fountain, both v0.2 samples, the v0.2 shouting bug.
- PDF: a (MORE)/(CONT'D) speech split across a page break merges into one speech. Header line, page numbers, diagonal watermark and revision stars are stripped. Scene numbers on both margins are read.
- App, 53/53 steps at 390px phone: upload → pick → tag → ledger tier rules → contradiction → own-words pair → integrity bar → unlinked filter → run → pass → compare → save file → chain verify/tamper → revise as FDX (0 orphans) → parse fix and undo → print → reload persistence → offline reload with the service worker, including a PDF → desktop 1280 → file://. Zero console errors, no horizontal overflow, every tap target 44px or more.

**Hypothesized (not tested):**
- iOS Safari and real Android. Home-screen install, share sheet for the project file, wake lock (iOS 16.4+), IndexedDB eviction. The "never saved to a file" dot is the guard against eviction.
- Real-world sides. Breakdown Services PDFs, crossed-out scenes, dual dialogue, scans. Scans are refused with a clear message (no OCR). Crossed-out scenes can't be detected from text, so they read as live.
- FDX has no page breaks, so everything reads as p.1 after an FDX import.
- CAPTURE BAY hand-off. Not wired. The export carries `cco.shared.active_target = project id` as vocabulary only, because it wasn't built against CAPTURE BAY's real schema.
