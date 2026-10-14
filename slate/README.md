# SLATE MAKER v0.4 · Actor Edition

*One take. Face to full body. Every shape.*

**Asset #7.** Replaces SLATE MAKER v0.2 (spec only) and v0.3 (static recorder + ZIP).

**Mission:** you're slating alone. No one to run the camera. Shoot one wide, locked-off take on a tripod. SLATE MAKER starts tight on your face while you slate, glides out to full body, and cuts it for casting (16:9), vertical (9:16) and square (1:1). Then it bundles the kit that goes with it.

## The flow
1. **TAKE** · Drop the take. Shoot it in the phone's own camera app, horizontal, 4K. Backups: "Shoot it now" on a phone opens the camera; "Record with this computer's camera" records in the browser with a countdown and your slate script on screen. The **Say this** card builds your slate line from your kit.
2. **FRAME** · Drag a box over your face, then over your whole body. Drag inside a box to move it, grab a corner to resize. Play the take and tap **Glide here** the moment you finish your slate. Set the move: face → body or body → face; glide 1, 2 or 3s; Medium (chest up) or Close (face); trim the start and end. A live preview shows the virtual camera in any shape.
3. **MAKE** · Pick shapes and size (1080p / 720p). Each shape shows how sharp the close-up will be (real source pixels behind each output pixel) and warns when full body needs bars. One pass in real time makes every shape at once. Extras (slate card first, name on screen) are **off** by default, because casting usually wants it clean.
4. **KIT** · Name, height, location, rep, links, headshot, résumé (kept on this device), plus this submission's project, role, take and date (these name the files). The slate card saves as PNG in any shape. A checklist says what's missing; there's no score. **Build kit (.zip)** bundles the slates, cards, headshot, résumé, links and a kit.json with a SHA-256 for every file.

## v0.3 → v0.4
| v0.3 | Now |
|---|---|
| No pan. A fixed crop of the webcam | The solo pan: face → full body glide from one wide take |
| 9:16 button made a file named `_9x16` that was really 1280x720 | Every shape renders at its true size (1920x1080, 1080x1920, 1080x1080) |
| Webcam at 1280x720 only | Takes from the phone's own camera at full resolution, plus a sharpness check |
| Name lower third burned into every slate, "COLMAC" stamped on the card | Clean by default. Card and lower third are opt-in, with no stamp |
| 12-second cap | No cap. Trim instead |
| WebM only (fails on iPhone) | Records MP4 where the browser can, and names the codec it actually got |
| Two completeness scores | A plain checklist: "Missing: résumé" |
| 13 of 13 buttons under 44px, desktop grid, form first | Phone first, 44px taps, material first |
| Tests needed a file that wasn't in the zip | `node tests/run_tests.js` runs as shipped |

## The honest physics
A solo pan crops a close-up out of a wide shot. Standing head to toe in a horizontal 4K frame, your face is about 240px tall:
- **Medium (chest up), the default:** about 950 real pixels behind a 1080p frame. Good.
- **Close (face):** about 620 real pixels for 1080p, which is soft. It's fine at 720p.

MAKE shows this per shape before you render, and suggests the fix that applies (720p, shoot 4K, stand closer, Medium). A vertical take can't fill a 16:9 full body, so you get side bars and it tells you to shoot horizontal.

## Proven vs hypothesized
**Proven (headless Chromium, 390px phone + 1280 desktop):**
- Engine: 35/35. Aspect exact at every point of the move. The close-up contains the face, the full body contains the whole body, the glide only widens and eases. Reverse move. Bars centred on a vertical take. Sharpness verdicts (4K Medium ok, 4K Close soft at 1080 / ok at 720, 720p webcam soft). Slate script, labels, checklist, CRC32. The ZIP passes `unzip -t`.
- App: 28/28. Kit → script. Take load. Boxes drawn by dragging land within 1% of truth. Move, resize, Glide here from the player. Live preview framing (face 25% of height, as calculated). Three shapes made in one pass at true sizes. Files named from the kit. Checklist. Kit ZIP. Kit + headshot + per-take framing survive a reload. Vertical-take bars warning. Offline. No console errors. Every tap target 40px or more. No overflow.
- **Rendered files, measured frame by frame** (synthetic take, face and body at known positions):
  - Face holds at exactly 25.0% of frame height in 16:9 and 1:1, and 23.4% in 9:16, as calculated, centred.
  - Glides out.
  - Lands on full body with a 6.9% margin top and bottom in every shape.
  - 9.96s against a 10s take; the move runs about 2 frames ahead of the source mid-glide, invisible in a slate.

**Hypothesized (not tested):**
- **Real phones.** Run `tests/probe.html` on yours first.
- **H.264.** This test browser made VP9 inside .mp4 and the app said so. Safari and desktop Chrome should make H.264.
- **4K decode + three canvases in real time on a phone.** Fine on desktop; an older phone may drop frames. Make one shape at a time if it stutters.
- **iPhone HEVC takes** play in Safari; Windows Chrome needs the HEVC extension. The app says so when a take won't play.
- **"Shoot it now"** on iPhone may hand back a compressed file. Shooting in the Camera app and then picking it keeps full quality.
- **No automatic face detection.** Boxes are dragged by hand. An offline face-detection model is the next step if dragging proves to be the slow part.

## Files
```
index.html, app.js      the app
engine.js               the move, sharpness, script, checklist, ZIP (pure, runs in Node)
sw.js, manifest.webmanifest, icons/, fonts/   offline + home screen
tests/run_tests.js      node tests/run_tests.js
tests/probe.html        open on each phone: what it can do, plus a 3-second recording test
MANIFEST.json           bytes + sha256 per file
```
Your take never leaves the device. Your kit (name, links, headshot, résumé) and per-take framing are kept in the app's own storage on this device.

## Delivery
Drop `slate/` into the theactorpage repo next to `breakdown/` and `archbook/` (e.g. `/act/slate/`), commit, open on the phone, Add to Home Screen.
