# FILM OS 0.2.1 · Make it alone

*One person makes the whole scene.*

**Section:** FILM main tool (working name). Phone and tablet.
**Mined from:** STORY STUDIO v1 to v6, the Unified Command Center, v12 and STUDIO MEMORY. Their ideas, not their code: every one of their script readers failed the real sides.

**The rule:** the actor is the machine. No scores. It lists what's in the script and what you own; you pick.

## The flow
1. **SCRIPT.** Anything already on the sides shelf (dropped in Actor OS, MEMORIZER, BREAKDOWN, Today's scene) is here with no upload, with your character. Or drop a PDF, Final Draft (.fdx), Fountain or text file, or paste. A script brought in here goes on the shelf for every other tool. Pick who you play on camera.
2. **SCENES.** Each scene with who speaks and how many lines. A voice in the script (V.O., O.S., on the phone) is marked voice only and never gets a close-up. Tap one:
   - **How do you make it alone?** *Keep it* (you play every part: wide master locked, a close-up and an over-the-shoulder for each, one part at a time). *Compress it* (one face on camera; the others are a dirty over in their wardrobe, their hands, and their lines as a recorded voice with an eyeline mark). *Fastest proof* (one face, one setup, the others a voice, inserts and sound).
   - **Shoot it at:** one of your locations. Suggested when a word matches the script's place or what you said that location can play ("Pickup truck cab" for CAL'S PICKUP; your gas station that "can play a truck stop lot").
   - **In the action:** props named in the action lines, whole words only (no "hat" inside "that"). Tap one to add or drop it as an insert. Your own things named in the scene. People in the action with no lines. The sound bed: room tone plus what the action names (rain, tin roof, engine).
   - **Shots** with tick boxes, named by character. Room tone always last.
   - **Continuity** for each character on camera: wardrobe, in hand, lens, camera height, eyeline, light from, note. "Same as scene N" copies the last card for that character.
3. **OWNED.** Locations (with what each can play), props, wardrobe, gear. Start from the ranch list (40 things: barn, porch, creek, workshop, oak treeline, corral, fire pit, the pickup, the gear) or empty.
4. **SHOOT DAY.** Scenes grouped by where you're shooting, then time of day, then wardrobe. Places not picked yet are flagged. Each scene shows its way, who's on camera, wardrobe and shots done.

## New in 0.2.1: a witness for the continuity card
Mined from PARSOVAR CONTINUITY WITNESS ("no witness, no hard claim"). Each character's continuity card takes a photo from the phone: how they look at the end of the scene, what's in hand, the frame. The next scene with them shows it as **Match this: scene N** beside its own photo. "Same as scene N" copies the notes, never the photo: each scene needs its own. RETAKE replaces it and the old photo is deleted from the phone. Browser 10/10.

## New in 0.2: the places themselves
Mined from RANCH BACKLOT ENGINE v1 and PRODUCTION GEOGRAPHY ENGINE v2 (their search matched "bus" inside "ambush"; their scores were typed numbers; they read file names, not photos).
- **Light, sound, access** for each location (tap Notes on the OWNED tab). The ranch list fills them from its own notes: Creek "dusk light" / "running water", Fire pit "night, warm key light", Corral "animals".
- **Scout log** per location: a dated note and a photo from the phone ("Fog on the road at 7 am, gone by 8"). Photos are kept on this phone as a 1600 px JPEG (IndexedDB `film_os`).
- **At this place** on a scene, once you pick where: its light next to the scene's time of day ("dusk light · the scene is NIGHT"), sound, access, the latest scout note and photo, and **last time here**: the lens, camera height, eyeline and light you wrote for the last scene shot there, any script. The place's sound joins the scene's sound bed in red.

## Same reader as ACT
Speeches come from Actor OS's reader (`../actor-os/sides.js`, `../actor-os/pdf.js`). FILM adds scenes, places, times of day (CONTINUOUS carries the time before), and what's in the action. The PDF reader now keeps the first scene heading and its action (it used to start at the first character name, which lost scene 1's place and props).

## Proven vs not
**Proven 0.2 (headless Chromium 14/14):** ranch list light/sound filled; scout note + photo saved, shown, kept after reopening, stored as JPEG, removable; scene at the ranch road shows light vs NIGHT, access, the scout note and photo; scene 3 at the same place shows "Last time here: LAST BUS sides scene 1, RENNIE: lens 1x · height 58 in · eyeline camera left"; creek adds "running water" to the sound bed; 320 px; no errors.

**Proven 0.1 (Node 36/36, headless Chromium 24/24 at 390 px):** LAST BUS from the real PDF dropped in Actor OS opens here with no upload, RENNIE picked: 3 scenes, places COUNTY ROAD BUS SHELTER / CAL'S PICKUP - MOVING / TRUCK STOP MOTEL - PARKING LOT, times NIGHT / NIGHT / DAWN, Cal and Rennie on camera, Mom a voice (V.O.) in scene 1 only; compress as Rennie gives Cal as a dirty over, hands and a voice and no Cal close-up; inserts duffel and ticket from the action; tap a prop to drop it; the pickup cab suggested for scene 2 and a hand-added gas station for scene 3; Same as scene 1 copies continuity; shoot day groups by place and time with wardrobe; kept after reopening; a script pasted here lands on the shelf; a grocery list is "No scenes found"; no sideways scroll at 320 px; no page errors. Regressions after the PDF reader change: shelf 19/19, MEMORIZER 26/26 + 31/31, learn 13/13, Today's scene 10/10, BREAKDOWN PDFs pass.

**Not proven yet:** a real phone or tablet on a real shoot; scripts longer than sides (a full short or feature); Final Draft files from the wild.

## Not in 0.1 (from Story Studio, parked)
Take log with keepers, cut to a length, edit list. Character fields (want, need, wound, secret, voice). Studio Memory's "drop anything" intake (parked with the user profile).

## Files
- `index.html`, `app.js` · the app
- `film.js` · scenes, shot lists, matching, shoot day. Pure: also runs in Node
- `sw.js`, `manifest.webmanifest`, `icons/`, `fonts/` · offline and installable
- `tests/run_tests.js` · `node film/tests/run_tests.js [LAST_BUS_sides.txt]`

Storage: localStorage `film_os_v1`, on this phone only. Reads and writes the sides shelf (`theactorpage_shelf_v1`), tool id `film`.
