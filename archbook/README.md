# REEL ROOM v0.3.2 · Actor Edition

*Your footage, sorted by archetype.*

**Asset #9** (formerly REEL MAKER). Replaces REEL MAKER v0.2 (Archetype Engine). Renamed because "reel maker" promised a video editor; the tool is the footage library, and the reel is one output. REEL MAKER library files still open.
**Mission:** a breakdown lands. In a minute you know whether you have footage for the role, which clips, in what order, and you send a cut built for that role.
Your footage, sorted by the character each moment expresses. Footage first, tags by tapping, breakdown in, reel out. Offline, no account.

## The flow
1. **CLIPS** · Drop footage: scenes, self tapes, set footage, from the camera roll or a folder. Duration and thumbnails are automatic. Open a clip, play it, tap **IN** and **OUT**, save. Answer "What character does this express?" Your tags become one-tap chips. Mark a moment as an **Opener** or a **Button**.
2. **FOOTAGE** · Your moments sorted by the character they express. One lane per tag, plus Openers, Buttons and Untagged.
3. **FOR A ROLE** · Paste the breakdown. It shows what you've got footage for and what you don't. Tap a gap to say "my tag X covers that" (remembered next time) or "Add to shoot list". Then **Build a reel** at 1:00, 1:30 or 2:00: opener first, button last, the most descriptors covered in between, capped near the target.
4. **REELS** · Reorder, remove, add. Name card first and/or last. **Play the reel** plays the cut back to back.
5. **Hand it off**
   - **Cut list (guaranteed):** FCP7 XML for Premiere and Resolve, CMX3600 EDL, CSV. Opens with every cut placed; media relinks by file name.
   - **Video file (experiment):** recorded in real time in the browser, 720p or 1080p. It reads the codec from the finished file and tells you if it isn't H.264.
6. **PACK** · Name card, library file, video copies, re-link.

## v0.2 → v0.3
| REEL MAKER v0.2 | REEL ROOM |
|---|---|
| No video anywhere. An 11-field form per clip | Real playback. Mark in/out by tapping while it plays |
| Typed timecodes ("1:5:x" gave NaN; out before in gave 0s) | Marks come from the player. OUT with no IN sets IN 5s back. Under 0.3s can't save |
| Free-text archetypes ("lawman" fell out of the Lawman lane) | Case-proof tag vocabulary that grows from use |
| Opening/Button "Hunters" sorted your own 0-5 ratings | Tap Opener / Button on the moment. No ratings |
| Gap detector compared two lists you typed | Reads the real casting breakdown, matched by word root |
| Reel Readiness Score | Cut. Reports what you've got footage for and what you don't |
| "Proof" language | Plain words: footage, the character it expresses, shoot list |
| buildReelFromRecipe never wired, recipe slots came back empty | Draft built from the breakdown, plays, exports |
| No output | XML, EDL, CSV, and a video file |

## Proven vs hypothesized
**Proven (headless Chromium, 390px phone + 1280 desktop):**
- Engine: 35/35. Tag vocabulary, word roots (menacing → menace, authoritative → authority, no false grief/grieving), breakdown parsing (drops name, age, gender, union, shoot logistics), draft building, EDL/XML/CSV frame math.
- App: 39/39. Intake (5 files: 3 WebM, 1 corrupt, 1 H.264) → marking → tags → lanes → match → shoot list → build → reorder → EDL/XML/CSV → play → render → reload with kept copies → keep off → re-link by name+size → re-link a renamed file by length → library file round trip → offline → desktop. No console errors. Every tap target 40px or more (most 44px). No horizontal overflow.
- Rendered file, checked with ffprobe and frame analysis: 10.47s against 10.5s expected. Segments in the right order with every cut within 1 frame. Each cut starts on its exact source in-point (burned-in clock read 1.067 / 2.0 / 5.067 / 1.067 at +50ms). The right tone under each clip, synced. Silent name card.

**Hypothesized (not tested):**
- **iPhone / Android.** Run `tests/probe.html` on each phone first. It runs a 3-second recording test and names the codec.
- **H.264 from the render.** This test browser has no H.264 encoder, so it made VP9 inside an .mp4 and the app said so. Safari and real desktop Chrome should make H.264. Unverified.
- **iPhone footage (HEVC .mov)** plays in Safari and on Macs. Windows Chrome needs the HEVC extension, and the app flags clips it can't play.
- **iOS photo picker may compress and rename videos.** Re-link falls back to matching by length and shape, and flags the match. Picking from the Files app keeps the originals.
- **Cut list into a real editor.** Not opened in Premiere or Resolve here. The XML uses frame in/out relative to media start. The EDL assumes source timecode starts at 00:00:00:00, and iPhone files often carry time-of-day timecode, so use the XML for phone footage.
- **Long renders.** A 2-minute reel takes about 2 minutes, and a backgrounded tab pauses it. Wake lock is requested.

## Files
```
index.html, app.js      the app
engine.js               tags, breakdown matching, draft builder, cut lists (pure, runs in Node)
sw.js, manifest.webmanifest, icons/, fonts/   offline + home screen
tests/run_tests.js      node tests/run_tests.js
tests/probe.html        open on each phone: what it can do, plus a 3-second recording test
MANIFEST.json           bytes + sha256 per file
```
Videos never leave the device. Copies are kept in the app's own storage (toggle in PACK). The library file holds the marks, tags and reels, but not the video.

## Delivery
Drop `archbook/` into the theactorpage repo next to `breakdown/` (e.g. `/act/archbook/`), commit, open on the phone, Add to Home Screen.

## 0.3.3 (2026-10-14): a scene to shoot
Every item on the shoot list has **Give me a scene**: a premise you can write in an evening and tape in a room. Who you are, who is across from you, the situation, what you want, what is in the way. 36 premises, every role open to any actor, matched to the words on the shoot list (best matches first, then the rest of the library). **Write it** opens THEACTORPAGES on the same site with the premise as notes at the top, the place and the first image. No dialogue is written for you.

## 0.3.4 (2026-10-14): make it yours
The scene sheet has **Make it yours**: tap to add a secret, the history between the two, higher stakes, another obstacle or a reveal. One line each, all optional, nothing shown until you tap. Whatever you add goes into the notes at the top of the script in THEACTORPAGES. Mined from the Contribution Graph: the premise starts something, you add to it.

## 0.4.0 (2026-10-24): REEL ROOM
Renamed REEL ROOM on screen (the folder, storage and library files keep the archbook name). It starts from the role: the front is one box, "A role came in. What do you have for it?", with your moments sorted by your own words, your reels and your shoot list beside it. FOR A ROLE shows the role with what you have footage for lit, what you don't with MY WORD COVERS IT / ADD TO SHOOT LIST / A SCENE TO SHOOT, and BUILD 1:00 / 1:30 / 2:00. No bottom tabs, no percent. FROM YOUR FOOTAGE uses clips you made in Footage where they are (not copied again). Plain words: a good first moment / a good last moment, KEEP IT SAFE.
