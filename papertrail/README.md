# PAPER TRAIL 0.1 · Every draft, never overwritten

**Section:** WRITE. Desktop first; works on a phone.
**Replaces:** FILM FIELD (renamed). Built from FILM FIELD (the registry), SCRIPT RECON (finding and grouping drafts), CREATIVE PROVENANCE AUTHORITY (where each thing came from), and the SCENE ENGINE console pages (the scene card). Their ideas, not their code, and none of anyone's data: it starts empty.

**The rule:** it reads, you decide. No scores. A scene card says what is on file and what is missing, in words.

## The flow
1. **ADD DRAFTS.** Drop several at once: scripts (PDF, Final Draft .fdx, Fountain, text) and storyboards (Word .docx or PDF). Paste one. Keep anything on the sides shelf. Or from Writers Blockage: Export > "Paper Trail: keep this draft".
   - The project comes from the title: a Fountain `Title:` line, a title-page line, or the file name ("Last Bus - draft 2.fountain" is LAST BUS, Draft 2; "SALT FLATS STORYBOARD6_19_17.docx" is SALT FLATS, 6-19-17). Never from the first character name.
   - An exact copy is kept once ("the same draft is already here"). A grocery list is not a draft.
2. **PROJECTS.** One card per project: drafts, the current draft, scenes, words.
3. **SCENES.** The current draft's scenes as a contact sheet. Each card: heading, cast, what the scene is for (if you wrote it), and what's missing.
   - **A scene:** what the scene is for (your words), cast and props (black: read from the files; gold: you added), FX and notes (from the storyboard, plus yours), decisions (logged with the date, never edited), on file / missing (scene text, cast, props, what it's for, storyboard, how you'll make it in Story Studio, shot), which drafts it's in (same / different / not in it), the scene text.
   - **Shoot it in Story Studio:** sends the current draft to the sides shelf and opens Story Studio on it. The way you pick and the shots you tick there show back here.
4. **DRAFTS.** Oldest first, with what changed from the one before ("vs Draft 1: 2 changed, 0 added, 0 cut, 1 the same. Changed: EXT. COUNTY ROAD BUS SHELTER..."). Make current, move to another project, retire (hidden, never deleted). Rename or retire the project.
5. **CHARACTERS.** Lines per draft for every character; voice-only parts marked.
6. **Your copy.** Export everything to one .json. Bringing in an export adds what you don't have: new projects, new drafts, card notes and decisions you didn't have. It never removes or replaces anything.

## Same reader everywhere
Scenes come from Story Studio's reader (`../film/film.js`), which reads speeches with Actor OS's reader (`../actor-os/sides.js`, `../actor-os/pdf.js`). A script reads the same in WRITE, ACT and FILM. A storyboard is read as `SCENE 15 INT. ... CAST: ... PROPS: ... FX: ... NOTES: ...` and matched to the script's scenes by heading.

## Proven vs not
**Proven (Node 23/23, headless Chromium 29/29):** empty start; six files dropped at once (LAST BUS draft 1 .txt, draft 2 .fountain, the sides PDF, an exact copy, a grocery list, a storyboard .docx) give one project LAST BUS with 3 script drafts and 1 storyboard; the copy kept once; the grocery list refused; labels from file names; storyboard matched to all 3 scenes (FX "Rain on the tin roof (hose)" and its notes on scene 1); Mom voice only; purpose, your own prop and a logged decision kept; draft compare names the changed scenes; make current; characters per draft; retire keeps the text; everything kept after reopening (texts in IndexedDB); export into a fresh browser gives 1 project and 4 drafts, importing again adds nothing, and never wipes a draft added there; Writers Blockage hand-off kept as Draft 3; Story Studio round trip shows "Compress it · 1 of N shots done"; no sideways scroll on a phone; no page errors.

**Not proven yet:** a real feature-length draft set (three drafts of a real feature), real storyboards laid out in Word tables, .fdx files from the wild, Safari.

## Not in 0.1
Character merge (two spellings of one name), side-by-side text compare inside a scene, provenance labels beyond "from the files / you added", and offices and credits (those live in the Hub).

## Files
- `index.html`, `app.js` · the app
- `trail.js` · titles, labels, storyboard cards, compare, characters, have / missing. Pure: also runs in Node
- `sw.js`, `manifest.webmanifest`, `icons/` · offline and installable
- `tests/run_tests.js` · `node papertrail/tests/run_tests.js [LAST_BUS_sides.txt]`

Storage, this device only: localStorage `paper_trail_v1` (projects, drafts, your cards), IndexedDB `paper_trail` / `texts` (draft text). Reads the sides shelf and Story Studio's `film_os_v1`; writes the shelf only when you press Shoot it.
