# CPS v0.2 · Character Preservation

*You find it. This keeps it.*

**Asset:** CHARACTER PRESERVATION SYSTEM (CPS). Replaces CPS v0.1 TCP BUILD. Working name; the AUTOSCOPE name check is still to do.

**Mission:** you found the voice in rehearsal. Weeks later you get the callback, the reshoot or the second season, and it's gone. CPS keeps what you found, in your own voice and your own body: a recording, a look, the line that drops you back in, and what you noticed. When you come back, you hear yourself, record again, and see what moved.

**The rule:** the actor is the machine. There is no computer voice. CPS never speaks for the character, never generates a voice, and never scores you. It measures your own recordings and tells you what changed in plain words.

## The flow
1. **CHARACTERS** · Tap **Record a character now** and it starts recording. You name it later. You can also start from a voice memo you already have, or with just a name. If BREAKDOWN on the same site has a role picked, it shows up here as one tap ("CYRUS · LAST BUS").
2. **CAPTURE** · Four things. Each one gets a "kept" mark when it's there.
   - **The voice** · record with the raw mic (auto gain, noise removal and echo cancelling are switched off, so it sounds like the room), or use a voice memo. Each take shows pitch, range, time to say it and pauses.
   - **The look** · take a photo, add a photo or video, or sketch with your finger.
   - **The line that drops you in** · one line.
   - **What you found** · talk it (a voice note, not measured) or type it.
3. **COME BACK** · In order: look at the photo, listen to the reference take and your notes, read the line, record it now. You get then and now side by side, both playable, plus what changed:
   - "Pitch: 6.1 semitones higher now."
   - "Time to say it: 12.3 s then, 6.61 s now (46% quicker). Only meaningful if you said the same lines."
   - "Pauses: fewer now (24.9% → 15.9% of the take)."
   - Then "It's back. Mark Back in use", or "Keep this as the new reference". Whether now is better is yours to hear.
4. **PACK** · Save one character, or all of them, as one .zip file: capsule.json plus every recording, photo and sketch. Open it on any phone. A damaged or re-compressed file is refused with a reason, not half-loaded.

**States:**
- **Found** · not enough kept yet.
- **Kept** · a voice take plus the look or the line.
- **Resting** and **Back in use** · yours to set.

## v0.1 → v0.2
| v0.1 | Now |
|---|---|
| Text fields for voice and face, "continuity" scored on wording | Real recordings and photos. Measured from sound, not from what you typed |
| Empty voice and face fields scored a perfect 1.0 and raised the total | No scores. Nothing is measured unless it's there |
| Form first | Record first, name later |
| Capsule formula K=(I,A,P,N,R,G,σ) | Four plain things: voice, look, line, what you found |
| Computer voice output (planned) | Left out. Your voice only |

## What's proven vs not

**Proven here (headless Chromium with a fake microphone fed known speech):**
- Engine 23/23: pitch matches an independent reference within 6%; the same read twice gives "about the same"; a higher, faster read gives higher, quicker and fewer pauses; a slower read gives slower and more pauses with the same pitch; 48 kHz stereo reads the same as 22 kHz mono; zip round trip with damage caught.
- Browser 40/40 at 390px:
  - Mic take measured through the real record path: 80.5 Hz and 12.3 s, against 80.4 Hz and 12.29 s from the file itself.
  - Compare after a browser restart (storage survives).
  - Opus voice-memo uploads.
  - Photo and sketch.
  - Back in use, and a new reference.
  - Pack saved, character deleted, pack opened with all 5 recordings and looks back.
  - Damaged pack refused.
  - Opens offline.
  - No overflow at 320px; tap targets; no page errors.
  - Peeking at BREAKDOWN doesn't create its storage.
- tests/probe.html records 5 s with the fake mic, reports raw-mic settings, and measures it (E2, 83 Hz).

**Not proven yet:**
- **iPhone and Android.** Open tests/probe.html on the phone. It says whether the mic records raw, whether voice memos (m4a) play, and whether storage is kept.
- **m4a voice memos.** The test browser has no AAC, so here an m4a upload gets the plain "Couldn't read the sound" message. iPhone and Android decode AAC, but that hasn't been run.
- **Real voices.** The tests use synthetic speech, which is cleaner than a person in a rehearsal room. Breathy, whispered or shouted takes will read pitch less reliably. Voices under 60 Hz or over 500 Hz aren't measured.
- **"Time to say it" only means something when you say the same lines.** The app says so on every compare.
- **Level** changes with mic distance, so it's only mentioned past 3 dB and says so.
- Chrome shows no length on its own WebM recordings until they've played once (a browser quirk). Playback works.

## Files
- `index.html`, `app.js` · the app
- `engine.js` · measurement, compare, states, zip. Pure: also runs in Node
- `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/` · offline and installable
- `tests/run_tests.js` · `node tests/run_tests.js <fixtures folder>`
- `tests/e2e.js` · browser test (Playwright, fake mic)
- `tests/probe.html` · open on a phone

Storage is IndexedDB `cps_v02`, on this device only. Save a pack.
