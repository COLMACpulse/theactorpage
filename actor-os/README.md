# ACTOR OS

Self-tape field unit for actors. Prep, shoot, cut, send — on the phone you already
have. No account, no server, no upload. Runs offline once installed.

**Live:** https://colmacpulse.github.io/theactorpage/actor-os/

---

## Bluetooth remote

Clickers do not speak one language. Cheap ones present as a keyboard and send
Space, Enter, Page Up/Down or an arrow. Camera remotes send volume keys. Some send
media transport keys.

All three routes are listened for, so whatever you own probably works. Turn it on
in SHOOT, then press your clicker to start and stop &mdash; you never touch the phone.

Repeat presses inside 450ms are ignored, because clickers bounce. Typing in a
field never triggers it. Off the stage it is inert.

## The five stages

    01 PREP   02 SHOOT   03 CUT   04 SAVE   05 SEND
       o         o          o        o         o

They are a real sequence, so they are numbered. Each carries its own state, which
makes the row a status line rather than a set of tabs: hollow means nothing there
yet, amber means started, green means done. The active stage gets a tally light
across the top &mdash; the same signal a camera gives when it is the one that is live.

## What it does

| stage | |
|---|---|
| **PREP** | Upload your sides — **PDF, text or paste**. That is the only required step; everything else runs off them. |
| **SHOOT** | Press record and you get **3 &middot; 2 &middot; 1 &middot; ACTION** to get set. Nothing is captured during the count. Tap to cancel. |
| **SHOOT (cont)** | One question: *how are you shooting this?* Then the screen goes full and shows only what that answer needs. |
| **SAVE** | Get the performance onto the phone before anything else. Every take is marked saved or browser-only. |
| **CUT** | Pick the take, set the handles, choose a size. Real re-encode &mdash; trim and compress in one step, no second app. |
| **CUT (old)** | Takes marked DROP / HOLD / SURVIVOR. Non-destructive trim against an untouched master. Video is held in IndexedDB, so takes survive a reload. |
| **SEND** | Three options: separate files, one file with the slate first, or slate last. Joining re-encodes in real time with hard cuts &mdash; never a cross-fade. |
| **SCENES** | Sides often carry more than one. Each scene keeps its own range, its own reader recordings and its own takes. |
| **SEND (old)** | Not a send. A manifest: your files, named the way casting expects, confirmed on your phone. You upload them yourself. |
| **SEND (old)** | One package with a slate, the survivor take, and a delivery receipt |

### Three ways to shoot, and you only ever see one

**With a reader** — someone off camera is reading with you. The screen is the frame
and a record button. Nothing else.

**Scene partner** — **you record every other character yourself**, in PREP, in your
own voice at your own pace. The take plays those back and hands you the floor.

No synthetic voice. A robot reader gives you nothing to play against — your own
reading carries the rhythm and the intention you actually want to work off. The
actor is the machine.

Your line is never shown in this mode. You are acting, not reading.

**Teleprompter** — your lines on screen at whatever level you want.

### The prompter has six levels and you pick

`FULL LINE` · `FIRST PHRASE` · `FIRST WORD` · `INITIALS` · `CUE ONLY` · `OFF`

`INITIALS` renders *"I don't know what you're talking about. I wasn't even there."*
as `IDKWYTA. IWET.` — punctuation kept, so the shape of the line survives when the
words are gone.

**The system never hides text based on a readiness judgment.** You choose the level.

### It waits for you to finish

Turn on **LISTEN FOR MY CUE** on the stage and the scene partner waits until you
have actually finished your line, then plays the next one &mdash; the way a reader does.

Speech recognition is a browser service and is not private on every device; iOS
may send audio to Apple. So it is **opt-in, off by default**, and tapping to advance
never goes away.

### Cue matching that refuses to guess

Confidence is `0.45·token + 0.35·coverage + 0.20·tail`.

- `≥ 0.82` — MATCH, advance
- `0.65 – 0.82` — **HOLD**, wait for you
- `< 0.65` — NO MATCH

A near-miss like *"I ain't your brothers okay"* against *"I ain't your brother"*
scores 0.76 and **holds**. It would rather stall than advance on a mis-hear.

---

## Bluetooth remote

Clickers do not speak one language. Cheap ones present as a keyboard and send
Space, Enter, Page Up/Down or an arrow. Camera remotes send volume keys. Some send
media transport keys.

All three routes are listened for, so whatever you own probably works. Turn it on
in SHOOT, then press your clicker to start and stop &mdash; you never touch the phone.

Repeat presses inside 450ms are ignored, because clickers bounce. Typing in a
field never triggers it. Off the stage it is inert.

## The five stages

    01 PREP   02 SHOOT   03 CUT   04 SAVE   05 SEND
       o         o          o        o         o

They are a real sequence, so they are numbered. Each carries its own state, which
makes the row a status line rather than a set of tabs: hollow means nothing there
yet, amber means started, green means done. The active stage gets a tally light
across the top &mdash; the same signal a camera gives when it is the one that is live.

## What it does not claim

This is the part that matters.

- **It does not measure your framing.** No headroom, no eyeline, no body position.
  Without a verified face detector those values are UNKNOWN, and the app says so
  rather than guessing.
- **It does not judge your acting.** Selection and sequencing only. The survivor
  packet carries that sentence inside the data.
- **It does not simulate native capture.** Cinematic mode activates only where the
  device actually reports the capability. Android reports it unsupported rather
  than passing off a blur effect as the same thing.
- **It does not fabricate device support.** UNKNOWN beats a plausible-looking pass.

---

## New in 5.30 (2026-10-14): distortion and one ear, in Before you send
Mined from SOUND CHECK. Read off the decoded file itself, before any filter.
- **Distorted.** Where the sound hit full volume and went flat (4 or more samples in a row at 99% of full scale): "Distorted at 0:05 and 0:12 (550 ms in all). Re-record that part lower or further from the mic." A loud take that only touches the top is not flagged. Still found after the phone's sound compression (Opus). It can't be fixed in CUT, and CUT says so.
- **One ear only.** Voice on one side, nothing on the other (a mic in one input): "Sound is only in your right ear. Casting will hear you on one side." CUT with "Clean up the sound" on now puts it in both ears (measured: -91 / -20 dB before, -18 / -18 after).
- Skipped from Sound Check: room tone. A phone's noise gate makes the gaps dead silent, so hum under your voice reads as a clean room.

## New in 5.29 (2026-10-14): the light check, switched on
Actor OS already measured light and background, but only on the old hidden screen. Now it runs under the live SHOOT preview. Mined from CAMERA COACH.
- **One line, only when something is off:** you read dark, part of you is blowing out, you blend into the wall, the wall is blown out, busy background, unevenly lit wall, strong wall colour. Otherwise "Nothing needs your attention."
- **Measured on you, not the room.** Exposure is read on the middle of the frame where you are. A lit face on a dark wall is a look, not "underexposed" (Camera Coach called it underexposed). A coloured wall is called a coloured wall, never a white-balance problem.
- **Save this light.** Name your setup ("Kitchen wall, evening"). Next time the preview says "Same light as Kitchen wall" or "Different from Kitchen wall: you are darker (-23%)". Keeps a callback matching the first tape. It never says where to put a lamp.
- Phones adjust their own exposure, so the comparison also watches the balance between you and the wall, which auto-exposure doesn't hide.

## New in 5.28 (2026-10-14): before you send
Mined from ACTOR CUTROOM, which read the format from the file name and called a silent track "audio measured". Here everything is read from the file itself. A plain list, no "ready": you decide.
- **Sound:** measured from the decoded audio. Catches a silent track, a missing track, and very quiet sound. If this phone can't decode the sound, it says so instead of guessing.
- **Format:** read from the file's own bytes: MP4 / MOV / WebM and H.264 / HEVC / VP9, AAC / Opus. A WebM renamed .mp4 is still WebM. HEVC (iPhone's default) is flagged because some computers won't play it.
- **Length** against your office limit, **picture size**, and **size** against 500 MB. Length and picture size come from the MP4's own boxes when the browser can't open the video.
- Shown under every CUT result and every joined file, and in SEND with CHECK THE FILES BEFORE YOU SEND for separate files.
Tested on 8 real files (sound, silent track, no track, very quiet, WebM renamed .mp4, H.264 MP4 with the index at the start and at the end, HEVC MOV): 13/13.

## New in 5.27 (2026-10-14): how each voice sounds
Mined from READER VOICE LIBRARY. You read every other part yourself; now each character can have its own sound so they don't all sound like you in one room.
- In the reader booth: **How each voice sounds**, one pick per character: As recorded, Phone, Radio, Next room, Far, Close. A play button to hear it on your own take.
- **Suggested from the script:** a speaker on a phone (LAST BUS: MOM (V.O.) "on his phone, speaker") gets Phone; (O.S.) gets Next room; radio or walkie gets Radio; whispering gets Close. Marked "from the script". Yours to change, remembered per sides.
- Used everywhere the reader plays: Scene partner, Teleprompter, the take buttons and HEAR THE WHOLE READ.
- Real filters on your own recording. Speed and pitch never change. Measured with test tones (100 Hz / 1.2 kHz / 8 kHz, as recorded -15/-15/-15 dB): Phone -52/-8/-46, Radio -65/-8/-46, Next room -21/-37/-109, Far -36/-17/-33, Close -10/-14/-14.

## New in 5.26 (2026-10-14): today's scene
- **Today's scene** in PREP: an original two-hander a day (30 to start, written for this site). Pick your part, TAPE IT, and it's loaded with your character picked. MAKE IT YOURS opens it in Writer's Blockage. ANOTHER ONE moves on. Keeping a take marks it done. It leans toward the choice you've tried least.
- It goes on the sides shelf, so MEMORIZER and BREAKDOWN have it too. Also on the landing page.
See `../shared/README.md`.

## New in 5.25 (2026-10-14): the sides shelf
- Sides you drop, paste or get from Writer's Blockage go on the site's sides shelf, with your character and the scene you mark. BREAKDOWN, MEMORIZER and CPS have them without another upload.
- Sides dropped in BREAKDOWN or MEMORIZER open here next time, with the character picked: "New sides: RENNIE, LAST BUS sides."
- Pasted sides are named "Pasted sides" instead of keeping the last file's name.
See `../shared/README.md`.

## New in 5.24 (2026-10-14): learn the lines
Mined from AUDITION LAUNCHPAD's memorizer sheet, built on this app's own sides reader.
- **How much you see, on SHOOT.** Under Teleprompter: Whole line, First few words, First letters, Nothing. It used to sit in a hidden panel with labels like FIRST_PHRASE. Remembered.
- **Learn it.** Each Teleprompter take shows one step less, down to nothing. The other lines always show in full.
- **First-letter sheet.** In PREP once you pick your character: the cue in grey, your line as first letters, and the full lines at the end to check yourself. Print it or keep it open on the phone.
- **Due date** is back in PREP, said plainly: "Due Fri, Oct 16 · 2 days".

Fixes found while building it:
- A shouted line in caps right under a name ("NOW." or "I SAID GET IN THE TRUCK.") was read as another name, and the line was lost. In the LAST BUS sides, Cal's "I SAID GET IN THE TRUCK." was missing from his speech. Now kept.
- Picking your character wasn't remembered after reopening unless you had also marked a scene. Now it is.

Tested in Chrome: 13/13 (sheet, levels, learn steps down over three takes, due date, all survive a reload). Not yet checked on an iPhone, where the sheet opens in a new tab.

## New in 5.23 (2026-10-14): clean sound, fit under a size
Mined from TAPEFLOW. CUT and SEND only.
- **Clean up the sound.** On by default, one switch, remembered. It cuts everything under 80 Hz (air conditioning, traffic, mic handling) and brings the take to a normal level. The take is measured first and one fixed amount of gain goes on the whole thing, so quiet moments stay quieter than loud ones, exactly as played. A limiter only touches a peak that would distort. When you join clips, each one is measured on its own, so the slate and every take land at the same level. The result says what it did: "Rumble cut. Brought up 19 dB."
- **Fit under a size.** Type a limit (25 MB for an email to your rep) and CUT or SEND works out the quality, dropping to 720p or 480p if it has to. The result shows the real size against your limit, and if it ever comes out over, it says by how much and what to try. If it can't fit and still look like a tape, it says how many MB it needs.

Tested in Chrome with a quiet take (voice 21 dB under the loud one) and a loud take, both with heavy 40 Hz rumble: after cleaning, both voices land within 0.1 dB of each other, and the rumble drops by about 24 dB relative to the voice. A 20 s take fit under 3 MB came out 1.8 MB at 480p. Not yet checked on an iPhone, where measuring the sound depends on Safari reading the take's audio (if it can't, the rumble cut still runs and the result says the level was left alone). Takes over 700 MB are not measured.

## New in 5.22 (2026-10-14): every take tests a choice
Mined from RIFF WORKBENCH, with the take as the test instead of a tick box.
- On the review screen, "Next time, change the" objective, tactic, relationship, secret or circumstance, plus your one line. Optional.
- The next take in that scene carries it as what it is trying. The stage shows the plan before you roll.
- CUT shows on each take what it tried, next to the why; Compare shows it under both videos.
- CUT lists what has not been tried yet in each scene. A nudge, never a score.

## New in 5.21 (2026-10-14)
- **Next time.** Under the why on the review screen: what you will change. It shows on the stage before your next take in that scene and disappears the moment you roll.
- **Sides from Writer's Blockage.** Export, then "Actor OS: tape this scene" opens the script here as your sides. Notes, sections and the title page stay behind.
- The CAMERA ON badge no longer sits on LISTEN FOR MY CUE.

## New in 5.20 (2026-10-14): picking the take

Mined from TAPE CUTTER. The actor chooses; the app keeps why. Nothing scores a take.

- **Every line is marked as you shoot.** In Scene partner and Teleprompter the app notes the moment each line comes up during the take. No typing.
- **Every opening, every button.** In CUT, play your first line from each take back to back, then your last line.
- **Compare two takes side by side,** lined up on the same line, with the sound from one side.
- **Why.** One line on each take, typed on the review screen or in CUT. Only you see it; it never goes in a file name or the email note.
- **Office length limit.** Type the limit from the breakdown (2:00, 90s) and every take shows how far under or over it is.

The marks come from the moment the scene moved on (your tap, your clicker or the cue listener), so they are as accurate as that moment. Takes shot with Solo or imported from the phone have no marks.

## Fixes in 5.19 (2026-10-14)

- **Shares the site.** The offline cache only clears its own old copies now. Before, an update wiped every other tool's offline copy on the same site.
- **PDFs read the right way up.** Each page is read in the direction the file stores it. Ordinary PDFs used to come out bottom to top, with lines on the wrong character. Running page headers, (MORE), revision stars, scene numbers on headings and CUT TO: are stripped, and a speech continued over a page break (CONT'D) stays one line. Tested: the same sides as PDF (both page directions) and as text parse identically.
- **Sides survive reopening.** The last sides, your role, the scene marks and the locked booth come back when the app opens.
- **Honest video files.** Recording, CUT, SEND and the slate move ask for H.264 MP4 first. Where the browser can only make WebM, the file is named .webm and the app says iPhones, Macs and some casting sites may not play it. It used to put VP9 inside a file named .mp4.
- **Sound on iPhone.** CUT and the slate move take the sound through Web Audio, like the join already did. The old route used a browser feature Safari does not have, which made silent files.
- **Saved means saved.** If the phone refuses the save sheet, the take stays marked browser only and the app asks you to tap SAVE.
- **Stage message** moved to the top, off the record button.
- **Wrapped parentheticals** like "(on his phone, / speaker)" are no longer read as dialogue.

Not yet checked on a real iPhone or Android, or on real Breakdown Services sides.

---

## Install it on your phone

1. Open the live URL in **Safari** (iOS) or **Chrome** (Android)
2. **Share → Add to Home Screen**
3. Launch from the icon — full screen, no browser bar

**The camera needs `https://`.** On a plain `http://` address the browser blocks it
silently. The app shows a red bar when that happens so it does not look like a
crash.

---

## Reader booth

Mark where the scene starts and ends, drop any character who is not in it, then
hit **READY** to lock the scene. Only then does the booth appear &mdash; so you never
record a line that is not in your scene.

Each line records as many takes as you want. Listen back, keep the one you like,
delete the rest. When every line has a take you can **play the whole read** back to
back &mdash; the entire other side of the scene, in your voice.

On a real four-page side that is 10 lines instead of 23.

After you pick your character, PREP lists every line that is not yours with a
record button. Record them once; they are stored against the content of the line,
so re-uploading the same sides keeps the recordings.

If a line has no recording the take says **"not recorded"** rather than
substituting a machine voice.

## Looking at the actual sides

The original PDF is kept, not just the text pulled out of it. Tap the file chip in
PREP and the real pages open full screen.

This matters more than convenience: **the handwritten START and END marks are ink.**
They are images in the file and never appear in the extracted text, so the page is
the only place to check them.

The **original document** is shown, one frame per page pointed at `#page=N` &mdash;
a single frame asked for the whole file only ever renders page one.

This is the real page: the casting logo, the watermark, and anything written by
hand. If a phone refuses to show PDFs inline, **SAVE THE ORIGINAL FILE** sits at
the bottom of the same view and hands it to your own viewer.

The older text redraw is still there for quick reading &mdash; it was drawn from
extracted positions &mdash; a screenplay page is
monospace text at known coordinates on white, and the parser already knows every
line and where it sits. No rasterizer, no library.

What it shows: every word, where it sits, laid out as the sides are. What it
cannot: the casting logo, the diagonal watermark, and anything written by hand &mdash;
those are images. **SAVE THE ORIGINAL FILE** is one tap away in the same view, for
when you need to check a handwritten mark.

Two ways to look at them. The in-app view reflows the text so it fits any screen
in either orientation and scrolls through the whole document. **OPEN THE PDF**
hands the file to your phone's own viewer, which pages and pinch-zooms properly &mdash;
an inline frame on iOS only ever renders page one.

The handwritten marks only appear in the PDF. Read-only for now &mdash; no mark-up.

## Reading a PDF

Sides arrive as PDFs, so the app reads them directly. No library — browsers ship
`DecompressionStream`, which is the only hard part of a PDF content stream.

It reads **positions, not just text**, and screenplays are positional:

```
 108pt  INT. APARTMENT - DAY              <- action / slug
 266pt  JULIE                             <- character cue
 180pt  Nobody here saw anything.         <- dialogue
 216pt  (not looking up)                  <- parenthetical
```

Character cues sit at ~3.7in, dialogue at ~2.5in, action at ~1.5in. Using the
indent makes the parse **more** reliable from a PDF than from pasted text, because
nothing depends on guessing at capitalisation.

Handles `FlateDecode`, `ASCII85Decode`, `ASCIIHexDecode`, filter chains, hex
strings from composite fonts, `ToUnicode` CMaps for subset fonts, and PDF 1.5+
object streams.

Real sides carry a lot that is not the scene. These are stripped: the diagonal
security watermark, production headers, scene numbers in both margins, page
footers, `(CONTINUED)`, `START`/`END`/`FYI` markers, and the self-tape
instructions page.

Breakdown Services names the file after the part, so `GURAM_DADIANI.pdf`
preselects GURAM automatically.

**Scanned sides have no text in them** — they are pictures of pages. The app says
so plainly instead of returning an empty result that looks like a bug.

## Marking where the scene starts and ends

Casting marks the range on your sides &mdash; usually **by hand**. Handwriting is
ink on the page: there is no text in the file to find, so no parser can detect it.
Anyone claiming otherwise is guessing.

So you mark it. Tap a line for **START**, tap another for **END**. Everything
outside the range dims but stays readable as context, and the marks are stored
against that file &mdash; set them once and they persist.

It matters more than it sounds. On a real four-page side, marking the range took
the reader booth from **23 lines to record down to 10**.

## Slate move &mdash; optional, off by default

Casting wants a full body slate for physicality and a closer frame for the read.
Most home setups do not have the floor space to shoot wide, so coaches teach a
manual punch-in and record tutorial videos explaining it. No self-tape app
automates it.

Shoot **one static full-body slate**. The app punches in from head-and-shoulders
to full body, **holds**, then settles closer.

**Nothing is generated** &mdash; every output pixel is crop and scale over your own
frame. But nothing generated is not the same as nothing softened. A crop is fewer
pixels, and stretching them to the output size is an upscale:

    1080p slate, tightest crop -> 806x454 to 1920x1080 = 2.38x. Soft.
    4K    slate, tightest crop -> 1612x907 to 1920x1080 = 1.19x. Fine.

So the app measures the real cost, **refuses** above 1.35x rather than shipping a
mushy tape, and asks the camera for the largest frame available when the move is
enabled.

**On focus:** cropping cannot change focus. Whatever the lens did during the static
slate is baked in, and the punch-in magnifies it. Lock focus and exposure before
you shoot the slate &mdash; nothing downstream can fix a hunt.

**The hold is not decoration.** A casting director on full-body slates: *no
pan-and-scan, because it does not give us an overall view of your full body.* The
hold is that overall view. Offices disagree on whether to move at all, which is
why this is **off by default** and why the breakdown always wins.

## File naming

Files come out the way Actors Access names them, so a casting office sees the
convention it expects:

    RILEY HART_Lane_Slate.mp4
    RILEY HART_Lane_Tk1.mp4
    RILEY HART_Lane_Tk2.mp4

## Your takes belong on your phone, not in a browser

Browser storage is a cache. Safari can clear it without warning, and a web app
gets a few hundred MB at best. **A take that only exists in IndexedDB is not
saved.**

So every take gets a **SAVE TO PHONE** button the moment you stop recording.
On iOS that opens the share sheet, where *Save Video* writes to Photos - the camera
roll, same as anything the phone shoots. Everywhere else it downloads to Files.

Files are named for the work: `THE_LAST_LIGHT_GURAM_T1_20260828_1817.mp4`

Every take is marked **saved to phone** or **browser only**, and CUT shows a
standing banner listing anything not yet off the device. The app will not let you
forget a take it cannot promise to keep.

## Storage

The browser gives a web app a few hundred MB and can clear it without warning. At
roughly 1 MB per second of 1080p that is a few minutes of footage.

**Treat the phone as capture, not as an archive.** Get takes off the device the
same day.

A native build with a real master vault — create-once files, SHA-256 receipts,
read-only hardening — exists in source and needs a Mac to compile.

---

## Device check

`gauntlet/WEB_CAPABILITY_PROBE.html`: open it on the phone you'll tape with. It reports what that browser's camera and mic can do (resolution, focus, exposure, recording formats) before you trust a take to it.

---

## Running locally

Any static server. It must be `https` or `localhost` or the camera will not open.

```bash
python -m http.server 8080
# then open http://localhost:8080
```

---

## Updating

Push to `main` and Pages redeploys. **Bump `CACHE` in `sw.js`** or installed phones
keep serving the old build with no sign anything changed.

---

## Built with

Plain HTML, CSS and JavaScript in a folder. No framework, no build step.

One vendored library: `pdf.js`, for showing your sides. Six routes were tried
without it and every one failed on iOS &mdash; an inline frame renders page one only,
`#page=N` is ignored, a blob will not open in a tab from a home-screen app, and
the share sheet is a *send* menu, not a viewer. It lives in `vendor/`, is cached
offline, and calls nothing.
