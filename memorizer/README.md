# MEMORIZER 0.4 · Off book

*Say it. Check it. The ones you drop come back first.*

**Asset:** MEMORIZER, an ACT support tool. Replaces MEMORIZER v0.3 "Line Recovery Machine".

**Mission:** you got the sides last night and you tape tomorrow. Learn the lines away from the camera: on the bus, in the kitchen, out loud. Actor OS is where you tape; this is where you get off book first.

**The rule:** the actor is the machine. No scores. It shows you what you said against the line, you mark yourself, and it decides only when you see that line again.

## The flow
1. **SIDES.** If Actor OS has your sides and your character, it's one tap: "RENNIE · LAST BUS sides. START." It uses the scene you marked there. Otherwise drop a PDF or text file, or paste. Pick your character.
2. **DRILL.** The cue (their line, with their name), then your line at the level you pick: Whole line, First words, First letters, Nothing. Say it out loud.
   - **SAY IT** listens where the phone can, then shows the line with what you missed underlined and what you added struck through: "3 of 4 words. Missed: I."
   - **SHOW THE LINE** if you'd rather just check yourself. **Type it instead** at a desk.
   - Then mark yourself: **GOT IT** (word for word), **CLOSE** (back in 8 minutes), **MISSED** (back in 2 minutes). Word for word lights GOT IT, but you decide.
   - Long speeches split into **beats**. Drill a beat, then the next, then the whole line. Beats don't change the schedule; the whole line does.
3. **SCENE.** The other lines in full, in order, yours hidden. Say it, show it, GOT IT or DROPPED IT. A drop stops the run: go again from there, or from the top. At the end: "9 of 10 clean. Dropped: line 2." A line you dropped stays "needs work" even if the retry lands.
4. **LINES.** Every speech with where it stands: not drilled, needs work, getting there, solid. Optional **action word** per line (needle, plead, threaten, or your own), shown when you drill it.

**When lines come back:** missed in 2 minutes, close in 8. Got it: 10 minutes, then an hour, a day, 3 days, a week. Short steps first, because most auditions give you a day, not a month. Solid means got it twice in a row.

**Same line read the same way everywhere.** Sides go through Actor OS's own reader (`../actor-os/sides.js`, `../actor-os/pdf.js`). A fix there reaches here.

**Saying it vs the page:** "10" and "ten" are the same line. "Gonna" and "going to" are not, and it says so ("Missed: gonna. Added: going, to"), because casting hears it.

## v0.3 → 0.4
| v0.3 | Now |
|---|---|
| Its own parser: drilled "(beat)", split one speech into three lines, gave Cyrus the action line, offered "INT. GAS STATION - NIGHT" as a character, cued you with your own half-line | Actor OS's reader. One speech is one line, the cue is the other character |
| Typing only | Say it out loud; listening where the phone can; typing optional |
| "Speed" was typing speed. An empty box submitted instantly scored a perfect 1.0 | Gone. No speed, no score |
| Memory Readiness Score: "x" at ladder level 5 scored 0.40 vs 0.53 for a real perfect rep | Gone. Plain counts: needs work, getting there, solid |
| Show answer, then type it = "recovered" | You mark yourself after you see it. Honest by design |
| History wiped on reload | Kept per script, on the phone |
| "10" vs "ten" marked wrong | Digits read as words |

Kept from v0.3: the word-by-word comparison (it was right), beats, run the scene, per-line action words, the idea of a per-line schedule.

## Proven vs not

**Proven here (headless Chromium):**
- Engine and shared reader 30/30: comparison (dropped word, added words, 10 vs ten, gonna vs going to), levels, beats, schedule steps, queue order, real-looking sides (wrapped lines joined, (beat) left out, shouted "NOW." kept, cue is the other character), repeated lines kept apart, LAST BUS with Cal's "I SAID GET IN THE TRUCK."
- Browser 26/26 at 390 px: one-tap hand-over from Actor OS (same 10 speeches as Actor OS), typed check, marks, a missed line returning first after reload, beats, action word, scene run with a drop and a retry, LAST BUS from PDF, two scripts kept, opens offline, no sideways scroll at 320 px, tap targets, Actor OS storage untouched.

**Not proven yet:**
- **Listening on a real phone.** Chrome on Android and Safari on iPhone both have speech recognition, but it hasn't been run with a real voice. The test browser can't. When it can't listen, SHOW THE LINE still works.
- **iPhone and Android** in general, and real Breakdown Services PDFs.

## Files
- `index.html`, `app.js` · the app
- `engine.js` · compare, levels, beats, schedule. Pure: also runs in Node
- `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/` · offline and installable
- `tests/run_tests.js` · `node memorizer/tests/run_tests.js [LAST_BUS_sides.txt]`

Storage: localStorage `memorizer_v1`, on this phone only. It reads Actor OS's `actor_os_sides_last` and `actor_os_range_*` and never writes them.
